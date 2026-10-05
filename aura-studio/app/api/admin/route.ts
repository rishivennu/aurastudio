import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const pass = (process.env.ADMIN_PASSWORD || "1214").trim();
  let body: { password?: string } = {};
  try { body = await req.json(); } catch {}
  if ((body.password || "").trim() !== pass) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!process.env.KV_REST_API_URL) {
    return NextResponse.json({ ok: true, configured: false, stats: {}, geo: [] });
  }
  try {
    const { kv } = await import("@vercel/kv");
    const stats = (await kv.hgetall("aura:stats")) || {};
    const raw = (await kv.lrange("aura:geo", 0, 299)) || [];
    const geo = raw
      .map((r) => { try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; } })
      .filter(Boolean);
    return NextResponse.json({ ok: true, configured: true, stats, geo });
  } catch (e) {
    return NextResponse.json({ ok: true, configured: false, stats: {}, geo: [], error: String(e) });
  }
}
