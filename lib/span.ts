import { render, GenParams, resolveColors } from "./engine";
import { lumHex } from "./color";

export const SPAN_RES = [
  { id: "1080", name: "1080p", w: 1920, h: 1080 },
  { id: "1440", name: "1440p", w: 2560, h: 1440 },
  { id: "4k", name: "4K", w: 3840, h: 2160 },
] as const;

/** Renders one continuous wallpaper across `n` screens with `gap` px hidden behind each bezel, then slices it. */
export async function spanBlobs(p: GenParams, n: number, w: number, h: number, gap: number, vertical = false): Promise<Blob[]> {
  const W = vertical ? w : n * w + (n - 1) * gap;
  const H = vertical ? n * h + (n - 1) * gap : h;
  // cap the master canvas below browser limits; slices are upscaled back if needed
  const k = Math.min(1, 16000 / Math.max(W, H), Math.sqrt(120e6 / (W * H)));
  const big = document.createElement("canvas");
  big.width = Math.round(W * k); big.height = Math.round(H * k);
  render(big.getContext("2d")!, big.width, big.height, p);
  const out: Blob[] = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = vertical ? 0 : i * (w + gap), y = vertical ? i * (h + gap) : 0;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(big, x * k, y * k, w * k, h * k, 0, 0, w, h);
    out.push(await new Promise<Blob>((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("Canvas too large"))), "image/png")));
  }
  return out;
}

/** Icon set: crops of one big render, so every icon is a slice of the same wallpaper. */
export async function iconBlobs(p: GenParams, count = 12, size = 1024): Promise<{ blobs: Blob[]; previews: string[]; roles: Record<string, string> }> {
  const cols = 4, rows = Math.ceil(count / cols);
  const big = document.createElement("canvas");
  big.width = cols * 600; big.height = rows * 600;
  render(big.getContext("2d")!, big.width, big.height, p);
  const blobs: Blob[] = [], previews: string[] = [];
  for (let i = 0; i < count; i++) {
    const c = document.createElement("canvas"); c.width = size; c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(big, (i % cols) * 600, Math.floor(i / cols) * 600, 600, 600, 0, 0, size, size);
    blobs.push(await new Promise<Blob>((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("Canvas too large"))), "image/png")));
    const t = document.createElement("canvas"); t.width = 120; t.height = 120;
    t.getContext("2d")!.drawImage(c, 0, 0, 120, 120);
    previews.push(t.toDataURL("image/png"));
  }
  const cs = resolveColors(p);
  const lum = lumHex;
  const byL = [...cs].sort((a, b) => lum(a) - lum(b));
  const bg = byL[0];
  // keep widget text readable even when the whole palette is dark or light
  const text = lum(byL[byL.length - 1]) - lum(bg) > 0.45 ? byL[byL.length - 1] : lum(bg) > 0.5 ? "#121216" : "#ffffff";
  const roles = { widgetBackground: bg, widgetSurface: byL[1] || bg, text, accent: cs[Math.floor(cs.length / 2)] };
  return { blobs, previews, roles };
}
