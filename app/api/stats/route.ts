import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.KV_REST_API_URL) {
    return NextResponse.json({ configured: false, stats: {} });
  }
  try {
    const { kv } = await import("@vercel/kv");
    const stats = (await kv.hgetall("aura:stats")) || {};
    return NextResponse.json({ configured: true, stats });
  } catch (e) {
    return NextResponse.json({ configured: false, stats: {}, error: String(e) });
  }
}
