// Day / night pair: one render, two tone passes. Works for every style.
import { render, GenParams } from "./engine";

export type Tone = "day" | "night";

export function applyTone(ctx: CanvasRenderingContext2D, w: number, h: number, tone: Tone) {
  ctx.save();
  if (tone === "day") {
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(255,246,236,0.20)"; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(255,255,255,0.28)"; ctx.fillRect(0, 0, w, h);
  } else {
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgb(138,134,178)"; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.32)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

export function renderTone(ctx: CanvasRenderingContext2D, w: number, h: number, p: GenParams, tone: Tone) {
  render(ctx, w, h, p);
  applyTone(ctx, w, h, tone);
}

export async function toneBlob(p: GenParams, w: number, h: number, tone: Tone, format: "png" | "jpeg"): Promise<Blob> {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  renderTone(ctx, w, h, p, tone);
  return new Promise((res) => c.toBlob((b) => res(b as Blob), format === "png" ? "image/png" : "image/jpeg", 0.92));
}
