import { NextRequest, NextResponse } from "next/server";
import { kvOn, getKv, ipHash, rateOk, tooBig } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!kvOn()) return NextResponse.json({ ok: false, kv: false });
  if (tooBig(req, 1_000)) return NextResponse.json({ ok: false }, { status: 413 });
  try {
    const { id, on } = (await req.json()) as { id?: string; on?: boolean };
    if (!id || !/^[a-f0-9]{12}$/.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
    if (!(await rateOk(req, "like", 400))) return NextResponse.json({ ok: false }, { status: 429 });
    const kv = await getKv();
    if (!(await kv.exists(`aura:post:${id}`))) return NextResponse.json({ ok: false }, { status: 404 });
    const who = ipHash(req);
    if (on) await kv.sadd(`aura:likes:${id}`, who); else await kv.srem(`aura:likes:${id}`, who);
    const likes = await kv.scard(`aura:likes:${id}`);
    await kv.hset(`aura:post:${id}`, { likes });
    await kv.zadd("aura:posts:top", { score: likes, member: id });
    return NextResponse.json({ ok: true, likes });
  } catch (e) {
    console.error("like", e);
    return NextResponse.json({ ok: false });
  }
}
