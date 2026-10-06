import { createHash } from "crypto";
import type { NextRequest } from "next/server";

export const kvOn = () => !!process.env.KV_REST_API_URL;
export const getKv = async () => (await import("@vercel/kv")).kv;
export const h = (s: string, n = 16) => createHash("sha256").update(s).digest("hex").slice(0, n);
const clientIp = (req: NextRequest) =>
  (req as NextRequest & { ip?: string }).ip || req.headers.get("x-real-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
export const ipHash = (req: NextRequest) => h(clientIp(req) + "|" + (process.env.KV_REST_API_TOKEN || "aura").slice(0, 12), 20);

/** Rejects bodies over `max` bytes before they are parsed. */
export const tooBig = (req: NextRequest, max: number) => Number(req.headers.get("content-length") || 0) > max;

/** Returns false when this ip has used up `max` hits for `bucket` today. */
export async function rateOk(req: NextRequest, bucket: string, max: number) {
  const kv = await getKv();
  const key = `aura:rl:${bucket}:${ipHash(req)}:${new Date().toISOString().slice(0, 10)}`;
  const [n] = (await kv.pipeline().incr(key).expire(key, 86400).exec()) as [number, number];
  return n <= max;
}

/** Reads and parses a JSON body, enforcing `max` on the real bytes (content-length can be absent or wrong). */
export async function readJson<T = unknown>(req: NextRequest, max: number): Promise<{ ok: true; body: T } | { ok: false; status: 413 | 400 }> {
  if (tooBig(req, max)) return { ok: false, status: 413 };
  let raw = "";
  try { raw = await req.text(); } catch { return { ok: false, status: 400 }; }
  if (raw.length > max) return { ok: false, status: 413 };
  try { return { ok: true, body: JSON.parse(raw) as T }; } catch { return { ok: false, status: 400 }; }
}

// per-instance fallback limiter for when KV is not configured (best effort, resets on cold start)
const mem = new Map<string, number>();
export function memRateOk(req: NextRequest, bucket: string, max: number) {
  const key = `${bucket}:${ipHash(req)}:${new Date().toISOString().slice(0, 10)}`;
  if (mem.size > 5000) mem.clear();
  const n = (mem.get(key) || 0) + 1; mem.set(key, n);
  return n <= max;
}
