// Live wallpapers: render the still once, then animate it with a seamless loop
// (slow orbit + zoom, drifting palette light, gentle breathing) and record to video.
import { render, GenParams, resolveColors } from "./engine";
import { downloadBlob } from "./exporter";
import { track } from "./track";

export const LIVE_SIZES = [
  { id: "phone", name: "Phone", w: 1080, h: 2340 },
  { id: "desktop", name: "Desktop", w: 1920, h: 1080 },
  { id: "square", name: "Square", w: 1080, h: 1080 },
] as const;
export type LiveSize = (typeof LIVE_SIZES)[number];

const OVER = 1.16;

export type LiveScene = { base: HTMLCanvasElement; colors: string[]; intensity: number };

export function buildLive(p: GenParams, w: number, h: number): LiveScene {
  const base = document.createElement("canvas");
  base.width = Math.round(w * OVER); base.height = Math.round(h * OVER);
  const bctx = base.getContext("2d")!;
  render(bctx, base.width, base.height, p);
  return { base, colors: resolveColors(p), intensity: p.intensity };
}

const TAU = Math.PI * 2;

/** Draw frame at loop phase t in [0,1). Every term uses whole cycles per loop, so t=0 and t=1 match exactly. */
export function drawLive(ctx: CanvasRenderingContext2D, w: number, h: number, s: LiveScene, t: number) {
  const a = t * TAU;
  const sc = 1.0 + 0.035 * (1 - Math.cos(a)) * 0.5;
  const dx = Math.cos(a) * w * 0.03, dy = Math.sin(a) * h * 0.03;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2 + dx, h / 2 + dy);
  ctx.scale(sc, sc);
  ctx.drawImage(s.base, -s.base.width / 2, -s.base.height / 2);
  ctx.restore();

  const m = Math.max(w, h);
  const k = 0.1 + 0.16 * s.intensity;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const orbs = [
    { c: s.colors[1 % s.colors.length], fx: 1, fy: 2, ph: 0 },
    { c: s.colors[2 % s.colors.length], fx: 2, fy: 1, ph: 2.1 },
    { c: s.colors[(s.colors.length - 2 + s.colors.length) % s.colors.length], fx: 1, fy: 1, ph: 4.2 },
  ];
  for (const o of orbs) {
    const x = w * (0.5 + 0.38 * Math.sin(a * o.fx + o.ph));
    const y = h * (0.5 + 0.38 * Math.cos(a * o.fy + o.ph));
    const r = m * 0.42;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(o.c, k));
    g.addColorStop(1, hexA(o.c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();

  const breath = 0.07 * (1 + Math.sin(a * 2)) * 0.5;
  if (breath > 0.002) { ctx.fillStyle = `rgba(0,0,0,${breath.toFixed(3)})`; ctx.fillRect(0, 0, w, h); }
}

function hexA(hex: string, a: number) {
  const x = hex.replace("#", "");
  const f = x.length === 3 ? x.split("").map((c) => c + c).join("") : x.slice(0, 6);
  const n = parseInt(f, 16);
  if (!/^[0-9a-f]{6}$/i.test(f) || !Number.isFinite(n)) return `rgba(255,255,255,${a})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function pickVideoType(): { mime: string; ext: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const opts: [string, "mp4" | "webm"][] = [
    ["video/mp4;codecs=avc1", "mp4"], ["video/mp4", "mp4"],
    ["video/webm;codecs=vp9", "webm"], ["video/webm;codecs=vp8", "webm"], ["video/webm", "webm"],
  ];
  for (const [m, e] of opts) if (MediaRecorder.isTypeSupported(m)) return { mime: m, ext: e };
  return null;
}

/** Records `loops` seamless loops of `seconds` each. Keep the tab visible while it runs. */
export async function recordLive(p: GenParams, size: { id: string; w: number; h: number }, seconds = 8, onProgress?: (f: number) => void) {
  const type = pickVideoType();
  if (!type) throw new Error("This browser cannot record video. Try Chrome, Edge or Safari.");
  const w = size.w, h = size.h;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const scene = buildLive(p, w, h);
  drawLive(ctx, w, h, scene, 0);
  const stream = (c as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 14_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<void>((res, rej) => {
    rec.onstop = () => res();
    rec.onerror = () => rej(new Error("The video encoder failed. Try a smaller size."));
  });
  const dur = seconds * 1000;
  try {
    rec.start(250);
    const t0 = performance.now();
    let lastPct = -1;
    await new Promise<void>((res, rej) => {
      const tick = () => {
        if (document.hidden) return rej(new Error("Recording stopped because the tab was hidden. Keep it open and try again."));
        const el = performance.now() - t0;
        const t = Math.min(el / dur, 1);
        drawLive(ctx, w, h, scene, t % 1);
        const pct = Math.round(t * 100);
        if (pct !== lastPct) { lastPct = pct; onProgress?.(t); }
        if (el >= dur) return res();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    rec.stop();
    await done;
  } finally {
    if (rec.state !== "inactive") { try { rec.stop(); } catch {} }
    stream.getTracks().forEach((t) => t.stop());
  }
  const blob = new Blob(chunks, { type: type.mime.split(";")[0] });
  downloadBlob(blob, `aura_live_${p.styleId}_${p.paletteId}_${p.seed}_${size.id}.${type.ext}`);
  track({ downloads: 1, live_exports: 1, [`style_${p.styleId}`]: 1 });
  return type.ext;
}
