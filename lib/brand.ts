import { GenParams, render } from "./engine";
import { rgbOf } from "./color";

export type Corner = "auto" | "tl" | "tr" | "bl" | "br" | "c";
export type Plate = "auto" | "none" | "light" | "dark";
export type BrandFmt = { id: string; name: string; w: number; h: number; place: Exclude<Corner, "auto">; size: number; mx: number; my: number; cy?: number; note: string };

/** where a logo is safe on each format; size = logo height as a share of the canvas height */
export const BRAND_FMTS: BrandFmt[] = [
  { id: "zoom", name: "Zoom / Teams background", w: 1920, h: 1080, place: "tr", size: 0.1, mx: 0.05, my: 0.07, note: "Top right stays clear of your head and shoulders. Your own preview may look mirrored; everyone else sees it the right way round." },
  { id: "linkedin", name: "LinkedIn banner", w: 1584, h: 396, place: "tr", size: 0.26, mx: 0.05, my: 0.37, note: "Right side, because your profile photo covers the lower left." },
  { id: "x", name: "X header", w: 1500, h: 500, place: "tr", size: 0.2, mx: 0.05, my: 0.4, note: "Right of centre; the avatar sits lower left and phones crop the top and bottom." },
  { id: "desktop", name: "Desktop 4K", w: 3840, h: 2160, place: "br", size: 0.07, mx: 0.04, my: 0.09, note: "Bottom right, above the taskbar or dock and away from desktop icons on the left." },
  { id: "phone", name: "Phone lock screen", w: 1290, h: 2796, place: "c", size: 0.05, mx: 0, my: 0, cy: 0.66, note: "Between the clock and the torch and camera buttons." },
  { id: "slide", name: "Slide background", w: 1920, h: 1080, place: "br", size: 0.07, mx: 0.04, my: 0.06, note: "Small, bottom right, where slide numbers usually go." },
  { id: "email", name: "Email signature banner", w: 600, h: 200, place: "tl", size: 0.36, mx: 0.06, my: 0.32, note: "Left and centred vertically, the way signatures are read." },
];

export type BrandOpts = { place: Corner; scale: number; plate: Plate };

/** average luminance (0..1) and coverage of the logo's opaque pixels */
export function logoTone(img: CanvasImageSource, iw: number, ih: number) {
  const c = document.createElement("canvas"); const s = 48;
  c.width = s; c.height = Math.max(1, Math.round(s * ih / iw));
  const x = c.getContext("2d", { willReadFrequently: true })!; x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let L = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { L += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; n++; }
  return { lum: n ? L / n : 0.5, opaque: n / (d.length / 4) };
}

/** up to n distinct, fairly saturated colours from the logo, most common first */
export function logoColors(img: CanvasImageSource, iw: number, ih: number, n = 4): string[] {
  const c = document.createElement("canvas"); const s = 96;
  c.width = s; c.height = Math.max(1, Math.round(s * ih / iw));
  const x = c.getContext("2d", { willReadFrequently: true })!; x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    const e = bins.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2]; bins.set(k, e);
  }
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  const cand = [...bins.values()].map((e) => {
    const r = e.r / e.n, g = e.g / e.n, b = e.b / e.n, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return { r, g, b, w: e.n * (0.35 + (mx ? (mx - mn) / mx : 0)) };
  }).sort((a, b) => b.w - a.w);
  const out: typeof cand = [];
  for (const k of cand) {
    if (out.every((o) => Math.abs(o.r - k.r) + Math.abs(o.g - k.g) + Math.abs(o.b - k.b) > 90)) out.push(k);
    if (out.length >= n) break;
  }
  return out.map((o) => `#${hex(o.r)}${hex(o.g)}${hex(o.b)}`);
}

/** turns brand colours into a gradient set: adds a deep shade so every style has somewhere dark to fall to */
export function brandPalette(cols: string[]): string[] {
  const ok = cols.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 5);
  if (!ok.length) return ["#7b6cff", "#19d3ff", "#0a0a14"];
  const lum = (h: string) => { const [r, g, b] = rgbOf(h); return 0.299 * r + 0.587 * g + 0.114 * b; };
  const darkest = [...ok].sort((a, b) => lum(a) - lum(b))[0];
  const out = [...ok];
  if (lum(darkest) > 60) { const [r, g, b] = rgbOf(darkest); out.push(`#${[r, g, b].map((v) => Math.round(v * 0.16).toString(16).padStart(2, "0")).join("")}`); }
  return out.length >= 2 ? out : [...out, "#0a0a14"];
}

type Logo = { img: CanvasImageSource; w: number; h: number; lum: number };

/** background at full size, then the logo in its safe spot, with a contrast plate when needed */
export function drawBrand(ctx: CanvasRenderingContext2D, W: number, H: number, p: GenParams, f: BrandFmt, logo: Logo | null, o: BrandOpts) {
  render(ctx, W, H, p);
  if (!logo) return;
  const place = o.place === "auto" ? f.place : o.place;
  let lh = H * f.size * o.scale, lw = lh * (logo.w / logo.h);
  const maxW = W * (place === "c" ? 0.5 : 0.32);
  if (lw > maxW) { lw = maxW; lh = lw * (logo.h / logo.w); }
  const mx = W * (f.mx || 0.05), my = H * (f.my || 0.06);
  let x = place === "tl" || place === "bl" ? mx : place === "c" ? (W - lw) / 2 : W - mx - lw;
  let y = place === "tl" || place === "tr" ? my : place === "c" ? H * (f.cy ?? 0.5) - lh / 2 : H - my - lh;
  // a wide banner centres the logo vertically instead of hugging an edge
  if (place !== "c" && f.w / f.h >= 3) y = (H - lh) / 2;
  x = Math.max(0, Math.min(W - lw, x)); y = Math.max(0, Math.min(H - lh, y));

  let plate = o.plate;
  if (plate === "auto") {
    const s = ctx.getImageData(Math.round(x), Math.round(y), Math.max(1, Math.round(lw)), Math.max(1, Math.round(lh))).data;
    let L = 0, n = 0;
    for (let i = 0; i < s.length; i += 4 * 7) { L += (0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2]) / 255; n++; }
    const bg = n ? L / n : 0.5;
    plate = Math.abs(bg - logo.lum) >= 0.28 ? "none" : logo.lum > 0.5 ? "dark" : "light";
  }
  if (plate !== "none") {
    const pad = lh * 0.28, r = Math.min(lh, lw) * 0.3;
    ctx.save();
    ctx.fillStyle = plate === "light" ? "rgba(255,255,255,.9)" : "rgba(8,8,12,.72)";
    ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = pad;
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (...a: number[]) => void }).roundRect(x - pad, y - pad, lw + 2 * pad, lh + 2 * pad, r);
    ctx.fill(); ctx.restore();
  }
  ctx.drawImage(logo.img, x, y, lw, lh);
}
