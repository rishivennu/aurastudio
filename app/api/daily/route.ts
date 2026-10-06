import { NextRequest } from "next/server";
import { memRateOk } from "@/lib/server";
import { createCanvas } from "@napi-rs/canvas";
import { render, setCanvasFactory } from "@/lib/engine";
import { dailyParams, dayKey } from "@/lib/daily";
import { dayIn, deviceById, validTz } from "@/lib/dayimg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

setCanvasFactory((w, h) => createCanvas(w, h) as never);

/** Today's wallpaper as an image, for phone automations and desktop scripts. ?device=phone&tz=Asia/Kolkata&format=jpg|png */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (!memRateOk(req, "daily", 300)) return new Response("slow down", { status: 429 });
  const dev = deviceById(q.get("device"));
  const tz = validTz(q.get("tz"));
  const png = q.get("format") === "png";
  const day = dayIn(tz);
  const c = createCanvas(dev.w, dev.h);
  render(c.getContext("2d") as unknown as CanvasRenderingContext2D, dev.w, dev.h, dailyParams(day));
  const body = png ? await c.encode("png") : await c.encode("jpeg", 92);
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": png ? "image/png" : "image/jpeg",
      "content-disposition": `inline; filename=aura-daily-${dayKey(day)}-${dev.id}.${png ? "png" : "jpg"}`,
      // the CDN keeps each device/zone/format for an hour, so a whole city waking up costs one render
      "cache-control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=600",
      "x-content-type-options": "nosniff",
    },
  });
}
