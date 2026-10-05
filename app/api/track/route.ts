import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "aura:stats";
const ALLOWED = /^[a-z0-9_]+$/i;

export async function POST(req: NextRequest) {
  if (!process.env.KV_REST_API_URL) {
    return NextResponse.json({ ok: false, kv: false }, { status: 200 });
  }
  try {
    const body = (await req.json()) as Record<string, number>;
    const { kv } = await import("@vercel/kv");
    const entries = Object.entries(body)
      .filter(([k, v]) => ALLOWED.test(k) && typeof v === "number" && isFinite(v))
      .slice(0, 20);
    await Promise.all(entries.map(([k, v]) => kv.hincrby(KEY, k, Math.round(v))));
    return NextResponse.json({ ok: true, kv: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 200 });
  }
}
