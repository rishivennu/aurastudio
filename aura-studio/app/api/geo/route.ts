import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIST = "aura:geo";
const CAP = 300;

export async function POST(req: NextRequest) {
  // Always bump the global visit-with-location counter if KV is on.
  if (!process.env.KV_REST_API_URL) {
    return NextResponse.json({ ok: false, kv: false });
  }
  try {
    const b = (await req.json()) as { lat?: number; lon?: number; acc?: number };
    const h = req.headers;
    const entry = {
      lat: typeof b.lat === "number" ? b.lat : null,
      lon: typeof b.lon === "number" ? b.lon : null,
      acc: typeof b.acc === "number" ? b.acc : null,
      city: h.get("x-vercel-ip-city") || null,
      region: h.get("x-vercel-ip-country-region") || null,
      country: h.get("x-vercel-ip-country") || null,
      ts: Date.now(),
    };
    const { kv } = await import("@vercel/kv");
    await kv.lpush(LIST, JSON.stringify(entry));
    await kv.ltrim(LIST, 0, CAP - 1);
    await kv.hincrby("aura:stats", "located", 1);
    return NextResponse.json({ ok: true, kv: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
