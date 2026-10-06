import { NextRequest } from "next/server";
import { memRateOk } from "@/lib/server";
import { createCanvas } from "@napi-rs/canvas";
import { render, setCanvasFactory } from "@/lib/engine";
import { decodeParams } from "@/lib/share";

export const runtime = "nodejs";
export const maxDuration = 30;

setCanvasFactory((w, h) => createCanvas(w, h) as never);

const clamp = (v: string | null, d: number) => Math.max(64, Math.min(2400, parseInt(v || "", 10) || d));

/** Server render of any shared wallpaper token. Used for SEO pages' OG cards and previews; output is deterministic so it caches for a year. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (!memRateOk(req, "img", 600)) return new Response("slow down", { status: 429 });
  const tok = q.get("p") || "";
  const p = tok.length <= 2000 ? decodeParams(tok) : null;
  if (!p) return new Response("bad wallpaper token", { status: 400 });
  const w = clamp(q.get("w"), 1200), h = clamp(q.get("h"), 630);
  if (w * h > 2400 * 1400) return new Response("too large", { status: 400 });
  const c = createCanvas(w, h);
  render(c.getContext("2d") as unknown as CanvasRenderingContext2D, w, h, p);
  const body = await c.encode("jpeg", 86);
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
