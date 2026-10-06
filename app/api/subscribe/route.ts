import { NextRequest, NextResponse } from "next/server";
import { kvOn, getKv, rateOk, readJson } from "@/lib/server";
import { SUBS, mailOn, siteUrl, validEmail, unsubToken, sendBatch, welcomeMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: is signup available? GET ?u&t: unsubscribe link from the email. */
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u"), t = req.nextUrl.searchParams.get("t");
  if (u && t) {
    const done = await unsubscribe(u, t);
    // relative redirect: never trust the Host header for where we send people
    return new NextResponse(null, { status: 303, headers: { location: `/daily?unsub=${done ? 1 : 0}` } });
  }
  return NextResponse.json({ ok: true, enabled: mailOn() });
}

async function unsubscribe(u: string, t: string) {
  const email = u.trim().toLowerCase();
  if (!kvOn() || t !== unsubToken(email)) return false;
  try { await (await getKv()).hdel(SUBS, email); return true; } catch { return false; }
}

export async function POST(req: NextRequest) {
  // RFC 8058 one-click unsubscribe from mail clients
  const u = req.nextUrl.searchParams.get("u"), t = req.nextUrl.searchParams.get("t");
  if (u && t) return NextResponse.json({ ok: await unsubscribe(u, t) });

  if (!mailOn()) return NextResponse.json({ ok: false, error: "Email drops are not switched on for this site yet.", code: "off" }, { status: 503 });
  const j = await readJson<{ email?: string; website?: string }>(req, 1000);
  if (!j.ok) return NextResponse.json({ ok: false, error: "Bad request." }, { status: j.status });
  if (j.body?.website) return NextResponse.json({ ok: true });
  const email = String(j.body?.email ?? "").trim().toLowerCase();
  if (!validEmail(email)) return NextResponse.json({ ok: false, error: "That email address does not look right." }, { status: 400 });
  try {
    if (!(await rateOk(req, "sub", 5))) return NextResponse.json({ ok: false, error: "Too many tries today. Try again tomorrow." }, { status: 429 });
    const kv = await getKv();
    const fresh = (await kv.hsetnx(SUBS, email, Date.now())) === 1;
    if (fresh) await sendBatch([welcomeMail(siteUrl(req.nextUrl.origin), email)]);
    // same answer whether or not the address was already listed, so this cannot be used to probe the list
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not sign you up right now. Try again later." }, { status: 500 });
  }
}
