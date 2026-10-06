import { NextRequest, NextResponse } from "next/server";
import { decodeParams } from "@/lib/share";
import { PALETTES, STYLES } from "@/lib/presets";
import { timingSafeEqual } from "crypto";
import { kvOn, getKv, h, rateOk, readJson } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = 24;
const ID = /^[a-f0-9]{12}$/;
type Row = Record<string, unknown> | null;
const toPost = (id: string, r: Row) => r && r.w ? {
  id, w: String(r.w), title: String(r.title), at: Number(r.at), likes: Number(r.likes) || 0,
  remixes: Number(r.remixes) || 0, parent: r.parent && ID.test(String(r.parent)) ? String(r.parent) : undefined,
} : null;
type P = NonNullable<ReturnType<typeof toPost>>;

/** adds parentTitle to every remix in one extra round trip */
async function withParents(kv: Awaited<ReturnType<typeof getKv>>, items: P[]) {
  const ps = [...new Set(items.map((x) => x.parent).filter(Boolean))] as string[];
  if (!ps.length) return items;
  const pipe = kv.pipeline();
  ps.forEach((id) => pipe.hget(`aura:post:${id}`, "title"));
  const t = (await pipe.exec()) as (string | null)[];
  const m = new Map(ps.map((id, i) => [id, t[i]]));
  return items.map((x) => (x.parent && m.get(x.parent) ? { ...x, parentTitle: String(m.get(x.parent)) } : { ...x, parent: x.parent && m.get(x.parent) ? x.parent : undefined }));
}

const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);

export async function GET(req: NextRequest) {
  if (!kvOn()) return NextResponse.json({ ok: true, kv: false, items: [] });
  const q = req.nextUrl.searchParams;
  const sort = q.get("sort") === "top" ? "top" : "new";
  const parent = q.get("parent");
  const off = Math.max(0, Math.min(2000, parseInt(q.get("offset") || "0", 10) || 0));
  try {
    const kv = await getKv();
    let origin: P | null = null;
    if (parent) {
      if (!ID.test(parent)) return NextResponse.json({ ok: false, kv: true, items: [], error: "bad id" }, { status: 400 });
      origin = toPost(parent, (await kv.hgetall(`aura:post:${parent}`)) as Row);
      if (!origin) return NextResponse.json({ ok: true, kv: true, origin: null, items: [], more: false, nextOffset: 0 });
      origin = (await withParents(kv, [origin]))[0];
    }
    const key = parent ? `aura:remixes:${parent}` : `aura:posts:${sort}`;
    const ids = (await kv.zrange(key, off, off + PAGE - 1, { rev: true })) as string[];
    if (!ids.length) return NextResponse.json({ ok: true, kv: true, origin, items: [], more: false, nextOffset: off });
    const pipe = kv.pipeline();
    ids.forEach((id) => pipe.hgetall(`aura:post:${id}`));
    const rows = (await pipe.exec()) as Row[];
    const items = await withParents(kv, rows.map((r, i) => toPost(ids[i], r)).filter(Boolean) as P[]);
    return NextResponse.json({ ok: true, kv: true, origin, items, more: ids.length === PAGE, nextOffset: off + ids.length });
  } catch (e) {
    console.error("community GET", e);
    return NextResponse.json({ ok: false, kv: true, items: [], error: "server error" });
  }
}

export async function POST(req: NextRequest) {
  if (!kvOn()) return NextResponse.json({ ok: false, kv: false, error: "The community gallery is not connected yet." });
  const rj = await readJson<{ w?: string; title?: string; parent?: string }>(req, 8_000);
  if (!rj.ok) return NextResponse.json({ ok: false, error: rj.status === 413 ? "Too large." : "Bad request." }, { status: rj.status });
  try {
    const body = rj.body || {};
    const w = String(body.w || "");
    const p = w.length <= 2000 ? decodeParams(w) : null;
    if (!p) return NextResponse.json({ ok: false, error: "That wallpaper could not be read." }, { status: 400 });
    if (!(await rateOk(req, "publish", 15))) return NextResponse.json({ ok: false, error: "Daily publish limit reached. Try again tomorrow." }, { status: 429 });
    const kv = await getKv();
    const id = h(w, 12);
    if (await kv.exists(`aura:post:${id}`)) return NextResponse.json({ ok: true, id, existed: true });
    const fallback = `${STYLES.find((s) => s.id === p.styleId)?.name} · ${p.customColors ? "Custom" : PALETTES.find((x) => x.id === p.paletteId)?.name}`;
    const at = Date.now();
    // a remix remembers where it came from, and the original counts its children
    const par = typeof body.parent === "string" && ID.test(body.parent) && body.parent !== id && (await kv.exists(`aura:post:${body.parent}`)) ? body.parent : null;
    const tx = kv.multi();
    tx.hset(`aura:post:${id}`, { w, title: clean(String(body.title || "")) || fallback, at, likes: 0, remixes: 0, ...(par ? { parent: par } : {}) });
    tx.zadd("aura:posts:new", { score: at, member: id });
    tx.zadd("aura:posts:top", { score: 0, member: id });
    if (par) { tx.zadd(`aura:remixes:${par}`, { score: at, member: id }); tx.hincrby(`aura:post:${par}`, "remixes", 1); }
    await tx.exec();
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("community POST", e);
    return NextResponse.json({ ok: false, error: "Could not publish right now." }, { status: 500 });
  }
}

/** Admin moderation: { password, id } removes a post and its preview. Needs ADMIN_PASSWORD set. */
export async function DELETE(req: NextRequest) {
  const pass = (process.env.ADMIN_PASSWORD || "").trim();
  if (!pass || !kvOn()) return NextResponse.json({ ok: false, error: "Moderation needs ADMIN_PASSWORD and KV." }, { status: 503 });
  if (!(await rateOk(req, "admin", 20))) return NextResponse.json({ ok: false }, { status: 429 });
  let body: { password?: string; id?: string } = {};
  try { body = await req.json(); } catch {}
  const a = Buffer.from(h((body.password || "").trim())), b = Buffer.from(h(pass));
  if (req.headers.get("x-aura-admin") !== "1" || !timingSafeEqual(a, b)) return NextResponse.json({ ok: false }, { status: 401 });
  const id = String(body.id || "");
  if (!ID.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  const kv = await getKv();
  const w = await kv.hget<string>(`aura:post:${id}`, "w");
  const par = await kv.hget<string>(`aura:post:${id}`, "parent");
  if (par && ID.test(String(par))) { await kv.zrem(`aura:remixes:${par}`, id); if (await kv.exists(`aura:post:${par}`)) await kv.hincrby(`aura:post:${par}`, "remixes", -1); }
  await Promise.all([
    kv.del(`aura:post:${id}`), kv.del(`aura:likes:${id}`), kv.del(`aura:remixes:${id}`), kv.zrem("aura:posts:new", id), kv.zrem("aura:posts:top", id),
    w ? kv.del(`aura:thumb:${h(String(w))}`) : Promise.resolve(0),
  ]);
  return NextResponse.json({ ok: true });
}
