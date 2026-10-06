import { NextRequest, NextResponse } from "next/server";
import { getKv } from "@/lib/server";
import { SUBS, mailOn, siteUrl, sendBatch, weeklyMail } from "@/lib/mail";
import { dayKey } from "@/lib/daily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron calls this every Monday with Authorization: Bearer CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!mailOn()) return NextResponse.json({ ok: false, error: "RESEND_API_KEY or KV is not configured" }, { status: 503 });
  const site = siteUrl(req.nextUrl.origin);
  const kv = await getKv();
  const subs = Object.keys((await kv.hgetall<Record<string, number>>(SUBS)) || {}).sort();
  if (req.nextUrl.searchParams.get("dry") === "1") return NextResponse.json({ ok: true, dry: true, subscribers: subs.length });
  // a cursor per week makes retries resume instead of re-mailing everyone; idempotency keys cover a chunk that was in flight
  const week = dayKey(new Date());
  const cur = `aura:weekly:${week}:next`;
  const start = Number(await kv.get(cur)) || 0;
  if (start >= subs.length) return NextResponse.json({ ok: true, done: true, subscribers: subs.length });
  const r = await sendBatch(subs.map((e) => weeklyMail(site, e)), `weekly-${week}`, async (n) => { await kv.set(cur, n, { ex: 8 * 86400 }); }, start, Date.now() + 50_000);
  return NextResponse.json({ ok: true, subscribers: subs.length, ...r, done: r.next >= subs.length });
}
