import { render, GenParams, resolveColors } from "./engine";
import { rgbOf } from "./color";

export type Fx = "ribbed" | "aurora" | "halftone" | "frosted" | "duotone";
export const FX: { id: Fx; name: string; desc: string }[] = [
  { id: "ribbed", name: "Ribbed glass", desc: "Fluted glass panel, every rib bends the photo" },
  { id: "aurora", name: "Aurora", desc: "Your photo lit by the wallpaper's glow" },
  { id: "halftone", name: "Halftone", desc: "Print dots in the palette colours" },
  { id: "frosted", name: "Frosted", desc: "Soft frosted glass over a blurred photo" },
  { id: "duotone", name: "Duotone", desc: "Shadows and highlights mapped to the palette" },
];

type Src = CanvasImageSource & { width: number; height: number };

export async function loadPhoto(file: File): Promise<Src> {
  if (!/^image\//.test(file.type)) throw new Error("Choose an image file");
  if (file.size > 40e6) throw new Error("That image is over 40 MB");
  try { return await createImageBitmap(file); } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      return img as Src;
    } finally { setTimeout(() => URL.revokeObjectURL(url), 2000); }
  }
}

const mk = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

/** cover-fit with a focal point (0..1) */
function cover(ctx: CanvasRenderingContext2D, img: Src, W: number, H: number, fx = 0.5, fy = 0.5) {
  const k = Math.max(W / img.width, H / img.height);
  const w = img.width * k, h = img.height * k;
  ctx.drawImage(img, (W - w) * fx, (H - h) * fy, w, h);
}

/** blur by shrinking and growing again: works everywhere, unlike ctx.filter */
function blurred(src: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  if (radius < 1) return src;
  let cur = src;
  const steps = Math.min(5, Math.ceil(Math.log2(radius)) + 1);
  const k = Math.max(0.01, 1 / radius);
  const small = mk(src.width * k, src.height * k);
  const sx = small.getContext("2d")!; sx.imageSmoothingQuality = "high";
  // step down in halves for a smoother result
  for (let i = 0; i < steps; i++) {
    const t = mk(Math.max(small.width, cur.width / 2), Math.max(small.height, cur.height / 2));
    const tx = t.getContext("2d")!; tx.imageSmoothingQuality = "high";
    tx.drawImage(cur, 0, 0, t.width, t.height); cur = t;
  }
  sx.drawImage(cur, 0, 0, small.width, small.height);
  const out = mk(src.width, src.height);
  const ox = out.getContext("2d")!; ox.imageSmoothingQuality = "high";
  ox.drawImage(small, 0, 0, out.width, out.height);
  return out;
}

const rgb = (hex: string): number[] => rgbOf(hex);
const lumOf = (c: number[]) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;

function ramp(colors: string[]) {
  const cs = colors.map(rgb).sort((a, b) => lumOf(a) - lumOf(b));
  return (t: number) => {
    const x = Math.min(0.9999, Math.max(0, t)) * (cs.length - 1), i = Math.floor(x), f = x - i;
    const a = cs[i], b = cs[i + 1] || a;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
}

function grain(ctx: CanvasRenderingContext2D, W: number, H: number, a: number) {
  const t = mk(256, 256), tx = t.getContext("2d")!, d = tx.createImageData(256, 256);
  let s = 1234567;
  for (let i = 0; i < d.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = s % 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  tx.putImageData(d, 0, 0);
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(t, "repeat")!; ctx.fillRect(0, 0, W, H); ctx.restore();
}

export type FxOpts = { fx: Fx; strength: number; focusX?: number; focusY?: number; ribs?: number };

/** Draws the photo at W x H with the effect, tinted by the wallpaper params. */
export function renderPhotoFx(ctx: CanvasRenderingContext2D, W: number, H: number, img: Src, p: GenParams, o: FxOpts) {
  const s = Math.min(1, Math.max(0, o.strength));
  const u = Math.min(W, H) / 1080; // scale unit, so previews match exports
  const base = mk(W, H), bx = base.getContext("2d")!;
  bx.imageSmoothingQuality = "high";
  cover(bx, img, W, H, o.focusX ?? 0.5, o.focusY ?? 0.5);
  const colors = resolveColors(p);
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  if (o.fx === "ribbed") {
    const src = blurred(base, 3 * u * s);
    const rw = Math.max(6, (o.ribs ? W / o.ribs : 46 * u));
    const mag = 1 + 0.9 * s; // each rib shows a wider, squeezed slice
    for (let x = 0; x < W; x += rw) {
      const w = Math.min(rw, W - x), sw = w * mag;
      const sx = Math.min(W - sw, Math.max(0, x + w / 2 - sw / 2 + rw * 0.35 * s));
      ctx.drawImage(src, sx, 0, sw, H, x, 0, w + 0.5, H);
    }
    // tint first, then lighting on each rib
    const wall = mk(W, H); render(wall.getContext("2d")!, W, H, p);
    ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = 0.55 * s; ctx.drawImage(wall, 0, 0);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, 0, rw, 0);
    g.addColorStop(0, `rgba(0,0,0,${0.28 * s})`);
    g.addColorStop(0.18, "rgba(0,0,0,0)");
    g.addColorStop(0.62, `rgba(255,255,255,${0.16 * s})`);
    g.addColorStop(0.82, `rgba(255,255,255,${0.05 * s})`);
    g.addColorStop(0.97, `rgba(0,0,0,${0.22 * s})`);
    g.addColorStop(1, `rgba(0,0,0,${0.32 * s})`);
    const tile = mk(rw, 4), tx = tile.getContext("2d")!; tx.fillStyle = g; tx.fillRect(0, 0, rw, 4);
    ctx.fillStyle = ctx.createPattern(tile, "repeat")!; ctx.fillRect(0, 0, W, H);
    const v = ctx.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, `rgba(255,255,255,${0.08 * s})`); v.addColorStop(0.5, "rgba(255,255,255,0)"); v.addColorStop(1, `rgba(0,0,0,${0.18 * s})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  } else if (o.fx === "aurora") {
    ctx.drawImage(base, 0, 0);
    const wall = mk(W, H); render(wall.getContext("2d")!, W, H, { ...p, styleId: "aurora", text: "" });
    ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = 0.25 * s; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = 0.85 * s; ctx.drawImage(wall, 0, 0);
    ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = 0.6 * s; ctx.drawImage(wall, 0, 0);
  } else if (o.fx === "halftone") {
    const r = ramp(colors);
    const cell = Math.max(4, (34 - 22 * s) * u);
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    const sm = mk(cols, rows), smx = sm.getContext("2d")!; smx.imageSmoothingQuality = "high";
    smx.drawImage(base, 0, 0, cols, rows);
    const d = smx.getImageData(0, 0, cols, rows).data;
    const [br, bg, bb] = r(0);
    ctx.fillStyle = `rgb(${br | 0},${bg | 0},${bb | 0})`; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4, L = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      const rad = cell * 0.5 * Math.sqrt(L) * 1.12;
      if (rad < 0.4) continue;
      const [cr, cg, cb] = r(0.25 + L * 0.75);
      ctx.fillStyle = `rgb(${cr | 0},${cg | 0},${cb | 0})`;
      ctx.beginPath(); ctx.arc(x * cell + cell / 2 + (y % 2 ? cell / 2 : 0), y * cell + cell / 2, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.18 * (1 - s); ctx.drawImage(base, 0, 0);
  } else if (o.fx === "frosted") {
    ctx.drawImage(blurred(base, (10 + 50 * s) * u), 0, 0);
    const wall = mk(W, H); render(wall.getContext("2d")!, W, H, { ...p, text: "" });
    ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = 0.7; ctx.drawImage(wall, 0, 0);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,255,255,${0.06 + 0.08 * s})`; ctx.fillRect(0, 0, W, H);
    grain(ctx, W, H, 0.12);
  } else {
    const r = ramp(colors);
    bx.globalCompositeOperation = "source-over";
    const id = bx.getImageData(0, 0, W, H), d = id.data;
    const lut: number[][] = Array.from({ length: 256 }, (_, i) => r(i / 255));
    for (let i = 0; i < d.length; i += 4) {
      const L = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0, c = lut[L];
      d[i] = d[i] + (c[0] - d[i]) * (0.4 + 0.6 * s); d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * (0.4 + 0.6 * s); d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * (0.4 + 0.6 * s);
    }
    ctx.putImageData(id, 0, 0);
  }
  ctx.restore();
  if (p.grainOn && o.fx !== "frosted") grain(ctx, W, H, 0.08);
}

export async function photoFxBlob(img: Src, p: GenParams, o: FxOpts, W: number, H: number): Promise<Blob> {
  const c = mk(W, H);
  renderPhotoFx(c.getContext("2d")!, W, H, img, p, o);
  return new Promise((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("Export failed"))), "image/jpeg", 0.93));
}
