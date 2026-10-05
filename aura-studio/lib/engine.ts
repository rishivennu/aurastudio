import { hashSeed, mulberry32, rangeRnd, RNG } from "./prng";
import { PALETTES, STYLES, StyleId, StylePreset } from "./presets";

export type GenParams = {
  seed: string;
  styleId: StyleId;
  paletteId: string;
  customColors?: string[]; // overrides palette if present
  keywords: string;        // nudges blob energy/placement
  text?: string;           // optional overlay
  intensity: number;       // 0..1 glow strength
  grainOn: boolean;
};

type Blob = { x: number; y: number; r: number; color: string; alpha: number; tight?: boolean };

type Scene = {
  style: StylePreset;
  colors: string[];
  bg: string;
  bgTop?: string;
  blobs: Blob[];
  grain: number;
};

export function resolveColors(p: GenParams): string[] {
  if (p.customColors && p.customColors.length >= 2) return p.customColors;
  const pal = PALETTES.find((x) => x.id === p.paletteId) ?? PALETTES[0];
  return pal.colors;
}

// keyword -> small deterministic energy modifier so text input visibly matters
function keywordEnergy(kw: string): number {
  if (!kw) return 0.5;
  let s = 0;
  for (let i = 0; i < kw.length; i++) s += kw.charCodeAt(i);
  return ((s % 100) / 100) * 0.6 + 0.3; // 0.3..0.9
}

export function buildScene(p: GenParams): Scene {
  const style = STYLES.find((s) => s.id === p.styleId) ?? STYLES[0];
  const colors = resolveColors(p);
  const r: RNG = mulberry32(hashSeed(p.seed + "|" + p.keywords + "|" + p.styleId));
  const energy = keywordEnergy(p.keywords);
  const inten = Math.min(1, Math.max(0, p.intensity));

  const bg =
    style.background === "black" ? "#000000" :
    style.background === "firstColor" ? colors[0] :
    colors[0]; // lightTop uses first color at top
  const bgTop = style.background === "lightTop" ? colors[0] : undefined;

  const count = Math.round(rangeRnd(r, style.blobCount[0], style.blobCount[1]) * (0.7 + energy * 0.6));
  const blobs: Blob[] = [];

  if (PIXEL_LAYOUTS.has(style.layout)) {
    return { style, colors, bg, bgTop, blobs, grain: style.grain };
  }

  // colour pools. nonBg = everything but the background colour.
  // "mid" drops the darkest trailing colour so mesh/linear never drop muddy
  // dark splotches; the darkest is reserved for background depth instead.
  const nonBg = colors.length > 1 ? colors.slice(1) : colors;
  const mid = nonBg.length > 2 ? nonBg.slice(0, nonBg.length - 1) : nonBg;

  if (style.layout === "centered") {
    // AURA: ordered, evenly-spaced horizontal colour bands on black.
    // Fixed geometry => every seed/palette reads as the same deliberate aura,
    // only the hues change. Distinct bands, soft overlap, glowing core.
    const bands = Math.min(nonBg.length, 5);
    for (let i = 0; i < bands; i++) {
      const t = bands > 1 ? i / (bands - 1) : 0.5;
      const y = 0.2 + t * 0.6;                 // 0.20 .. 0.80
      const edge = Math.abs(t - 0.5) * 2;      // 0 centre -> 1 edges
      const rr = 0.26 - edge * 0.05;           // core bands a touch wider
      blobs.push({
        x: 0.5,
        y,
        r: rr,
        color: nonBg[i],
        alpha: (0.78 - edge * 0.12) * (0.6 + inten * 0.4),
        tight: true,
      });
    }
    return { style, colors, bg, bgTop, blobs, grain: style.grain };
  }

  if (style.layout === "verticalBands") {
    // SOFT LINEAR: the linear background does the work; add just one soft
    // lower glow in a mid colour so the clean top is never muddied.
    const c = mid[mid.length - 1] ?? nonBg[0];
    blobs.push({ x: 0.5, y: 1.08, r: 0.6, color: c, alpha: 0.5 * (0.6 + inten * 0.4) });
    blobs.push({ x: 0.5, y: 1.2, r: 0.9, color: nonBg[nonBg.length - 1], alpha: 0.55 });
    return { style, colors, bg, bgTop, blobs, grain: style.grain };
  }

  // MESH: fixed, balanced anchor points (corners + centre) with tiny seeded
  // jitter. Deterministic composition => consistent across the batch; only
  // colour changes. Darkest colour reserved for the background.
  const anchors: [number, number][] = [
    [0.15, 0.18], [0.85, 0.22], [0.22, 0.82], [0.82, 0.80], [0.5, 0.52],
  ];
  const n = Math.max(3, Math.min(anchors.length, count));
  for (let i = 0; i < n; i++) {
    const [ax, ay] = anchors[i];
    const jx = rangeRnd(r, -0.06, 0.06);
    const jy = rangeRnd(r, -0.06, 0.06);
    const size = rangeRnd(r, style.blobSize[0], style.blobSize[1]);
    blobs.push({
      x: ax + jx,
      y: ay + jy,
      r: size,
      color: mid[i % mid.length],
      alpha: (0.6 + (i === n - 1 ? 0.15 : 0)) * (0.55 + inten * 0.5),
    });
  }
  return { style, colors, bg, bgTop, blobs, grain: style.grain };
}

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a), pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

// Continuous colour ramp across the whole palette (t: 0..1 -> colors[0]..last).
function ramp(colors: string[], t: number): string {
  const n = colors.length;
  if (n === 1) return colors[0];
  const x = Math.max(0, Math.min(0.9999, t)) * (n - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = parseHex(colors[i]), b = parseHex(colors[i + 1]);
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
}

// 256-entry colour lookup table across the palette, for per-pixel fills.
function rampLUT(colors: string[]): Uint8Array {
  const n = Math.max(2, colors.length);
  const cols = colors.length >= 2 ? colors : [colors[0], colors[0]];
  const lut = new Uint8Array(768);
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * (n - 1);
    const k = Math.min(n - 2, Math.floor(x));
    const f = x - k;
    const a = parseHex(cols[k]), b = parseHex(cols[k + 1]);
    lut[i * 3] = a[0] + (b[0] - a[0]) * f;
    lut[i * 3 + 1] = a[1] + (b[1] - a[1]) * f;
    lut[i * 3 + 2] = a[2] + (b[2] - a[2]) * f;
  }
  return lut;
}

// Liquid: per-pixel domain-warped flow field mapped through the palette ramp.
// Smoothstep keeps the ribbons silky; bright palette ends become specular cores.
function drawLiquid(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("liquid" + seed));
  const lut = rampLUT(colors);
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const aspect = W / H;
  const scale = 3.4 + r() * 1.8;
  const ph: number[] = [];
  for (let i = 0; i < 10; i++) ph.push(r() * 6.283);
  const warp = 0.85 + inten * 1.15;
  const dark = 2.6 + inten * 1.6;    // >1 keeps the field mostly dark, ribbons thin
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      let px = u * scale * aspect;
      let py = v * scale;
      // 3-octave domain warp -> silky, complex flow
      const wx = Math.sin(py * 1.4 + ph[0]) + 0.6 * Math.sin(py * 2.9 + ph[1]) + 0.3 * Math.sin(py * 5.1 + ph[2]);
      const wy = Math.cos(px * 1.2 + ph[3]) + 0.6 * Math.sin(px * 2.6 + ph[4]) + 0.3 * Math.cos(px * 4.8 + ph[5]);
      px += warp * wx;
      py += warp * wy;
      // 3-octave field -> several minima become bright ribbons
      let f = Math.sin(px * 1.3 + py * 0.9 + ph[6])
            + 0.6 * Math.sin(px * 2.7 - py * 1.9 + ph[7])
            + 0.35 * Math.sin(px * 4.1 + py * 3.0 + ph[8]);
      let t = (f + 1.95) / 3.9;              // ~0..1
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      t = 1 - Math.pow(1 - t, dark);         // dark dominates; only crests become specular
      const li = ((t * 255) | 0) * 3;
      const o = (y * W + x) * 4;
      d[o] = lut[li]; d[o + 1] = lut[li + 1]; d[o + 2] = lut[li + 2]; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Fluted glass: fine vertical lens columns over a soft diffuse glow. Each
// flute is shaded like a convex rib (bright crown, dark groove) so the light
// behind reads as reeded/ribbed glass. Engine-exclusive, no reference clone.
function drawFluted(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("fluted" + seed));
  const lut = rampLUT(colors);
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const cx = 0.3 + r() * 0.4;              // soft hotspot
  const cy = 0.3 + r() * 0.35;
  const ph: number[] = [];
  for (let i = 0; i < 6; i++) ph.push(r() * 6.283);
  const cols = Math.round(64 + r() * 46);  // 64..110 fine flutes
  const colW = W / cols;
  const depth = 0.42 + inten * 0.5;        // groove darkness
  const spread = 1.05 + r() * 0.25;        // glow falloff
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      // gently warped diffuse base glow -> organic light pool
      const fx = u + 0.05 * Math.sin(v * 3.1 + ph[0]) + 0.025 * Math.sin(v * 6.2 + ph[2]);
      const fy = v + 0.05 * Math.sin(u * 2.7 + ph[1]);
      const dx = fx - cx, dy = (fy - cy) * 1.12;
      let g = 1 - Math.sqrt(dx * dx + dy * dy) * spread; // 1 at hotspot
      g -= v * 0.22;                                     // darker toward the base
      g = g < 0 ? 0 : g > 1 ? 1 : g;
      let t = 1 - g;                                     // palette t (0 = bright)
      // vertical lens column: fractional position within the flute
      const lx = (x / colW) % 1;
      const edge = Math.abs(lx - 0.5) * 2;               // 0 crown .. 1 groove
      t += Math.pow(edge, 1.6) * depth;                  // grooves dive dark
      t -= Math.pow(1 - edge, 7) * 0.14;                 // thin specular crown
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const li = ((t * 255) | 0) * 3;
      const o = (y * W + x) * 4;
      d[o] = lut[li]; d[o + 1] = lut[li + 1]; d[o + 2] = lut[li + 2]; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ---- helpers for the extended style set ----
function sstep(t: number) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }
function clamp01(t: number) { return t < 0 ? 0 : t > 1 ? 1 : t; }
function putLUT(d: Uint8ClampedArray, o: number, lut: Uint8Array, t: number) {
  const li = ((clamp01(t) * 255) | 0) * 3;
  d[o] = lut[li]; d[o + 1] = lut[li + 1]; d[o + 2] = lut[li + 2]; d[o + 3] = 255;
}

// Aurora: warped vertical light curtains over a soft gradient.
function drawAurora(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("aurora" + seed));
  const lut = rampLUT(colors);
  const img = ctx.createImageData(W, H); const d = img.data;
  const ph: number[] = []; for (let i = 0; i < 6; i++) ph.push(r() * 6.283);
  const scale = 2.4 + r() * 1.8, sharp = 2.5 + inten * 2.2;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      const warp = Math.sin(v * 2.2 + ph[0]) * 0.5 + Math.sin(v * 4.1 + ph[1]) * 0.25;
      let band = Math.pow(Math.max(0, Math.sin((u * scale + warp + ph[2]) * Math.PI)), sharp);
      const vert = (1 - v) * 0.72 + 0.14;
      const b2 = Math.pow(Math.max(0, Math.sin((u * scale * 0.6 - warp + ph[3]) * Math.PI)), sharp) * 0.45;
      putLUT(d, (y * W + x) * 4, lut, 1 - clamp01((band + b2) * vert));
    }}
  ctx.putImageData(img, 0, 0);
}

// Mesh Grid: a true multi-point mesh gradient, bilinear with smoothstep.
function drawMeshGrid(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("meshgrid" + seed));
  const GX = 4, GY = 5;
  const pal = colors.map(parseHex);
  const grid: number[][][] = [];
  for (let j = 0; j < GY; j++) { const row: number[][] = []; for (let i = 0; i < GX; i++) row.push(pal[Math.floor(r() * pal.length)]); grid.push(row); }
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const fy = (y / H) * (GY - 1); const j = Math.min(GY - 2, Math.floor(fy)); const ty = sstep(fy - j);
    for (let x = 0; x < W; x++) { const fx = (x / W) * (GX - 1); const i = Math.min(GX - 2, Math.floor(fx)); const tx = sstep(fx - i);
      const c00 = grid[j][i], c10 = grid[j][i + 1], c01 = grid[j + 1][i], c11 = grid[j + 1][i + 1];
      const o = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) { const top = c00[k] + (c10[k] - c00[k]) * tx, bot = c01[k] + (c11[k] - c01[k]) * tx; d[o + k] = top + (bot - top) * ty; }
      d[o + 3] = 255;
    }}
  ctx.putImageData(img, 0, 0);
}

// Topographic: contour lines over a smooth height field.
function drawTopo(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("topo" + seed));
  const lut = rampLUT(colors);
  const ph: number[] = []; for (let i = 0; i < 6; i++) ph.push(r() * 6.283);
  const scale = 3 + r() * 2, lines = 13 + Math.floor(r() * 9), aspect = W / H;
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      const px = u * scale * aspect, py = v * scale;
      const f = Math.sin(px + ph[0]) + Math.sin(py * 1.3 + ph[1]) + 0.6 * Math.sin((px + py) * 0.9 + ph[2]) + 0.5 * Math.sin(Math.hypot(px - scale * 0.5, py - scale * 0.5) * 1.4 + ph[3]);
      const h = clamp01((f + 3) / 6);
      const fr = Math.abs(((h * lines) % 1) - 0.5) * 2;   // 1 at line centre
      const line = sstep((fr - 0.86) / 0.14);             // thin band
      putLUT(d, (y * W + x) * 4, lut, clamp01(h * 0.8 + 0.08 + line * 0.3));
    }}
  ctx.putImageData(img, 0, 0);
}

// Plasma: classic summed-sine plasma mapped through the palette.
function drawPlasma(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("plasma" + seed));
  const lut = rampLUT(colors);
  const ph: number[] = []; for (let i = 0; i < 6; i++) ph.push(r() * 6.283);
  const s = 3 + r() * 3, aspect = W / H;
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      const px = u * s * aspect, py = v * s;
      const f = Math.sin(px + ph[0]) + Math.sin(py + ph[1]) + Math.sin((px + py) * 0.5 + ph[2]) + Math.sin(Math.hypot(px - s * aspect * 0.5, py - s * 0.5) + ph[3]);
      putLUT(d, (y * W + x) * 4, lut, clamp01((f + 4) / 8));
    }}
  ctx.putImageData(img, 0, 0);
}

// Bokeh: soft glowing orbs over a dark gradient (canvas-composited).
function drawBokeh(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("bokeh" + seed));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, colors[colors.length - 1]);
  g.addColorStop(1, colors[Math.max(0, colors.length - 2)]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = "screen";
  const maxDim = Math.max(W, H), n = 16 + Math.floor(r() * 18);
  for (let i = 0; i < n; i++) {
    const cx = r() * W, cy = r() * H, rad = (0.03 + r() * 0.13) * maxDim;
    const col = colors[Math.floor(r() * Math.max(1, colors.length - 1))];
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    rg.addColorStop(0, hexToRgba(col, 0.5 * (0.5 + inten * 0.6)));
    rg.addColorStop(0.7, hexToRgba(col, 0.12));
    rg.addColorStop(1, hexToRgba(col, 0));
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.fill();
  }
  ctx.restore();
}

// Sunburst: radial rays and a glowing core.
function drawSunburst(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("sunburst" + seed));
  const lut = rampLUT(colors);
  const cx = 0.3 + r() * 0.4, cy = 0.25 + r() * 0.4;
  const rays = 16 + Math.floor(r() * 22), ph = r() * 6.283, aspect = W / H;
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      const dx = (u - cx) * aspect, dy = v - cy, ang = Math.atan2(dy, dx), rad = Math.hypot(dx, dy);
      const ray = Math.pow(0.5 + 0.5 * Math.sin(ang * rays + ph), 1.6);
      const g = clamp01(1 - rad * 1.25) * 0.6 + ray * 0.42 * clamp01(1 - rad * 0.75);
      putLUT(d, (y * W + x) * 4, lut, 1 - clamp01(g));
    }}
  ctx.putImageData(img, 0, 0);
}

// Voronoi: crystalline cells with lit facet edges.
function drawVoronoi(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("voronoi" + seed));
  const lut = rampLUT(colors);
  const n = 14 + Math.floor(r() * 14), aspect = W / H;
  const px: number[] = [], py: number[] = [], pt: number[] = [];
  for (let i = 0; i < n; i++) { px.push(r()); py.push(r()); pt.push(r()); }
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      let d1 = 1e9, d2 = 1e9, ct = 0;
      for (let i = 0; i < n; i++) { const dx = (u - px[i]) * aspect, dy = v - py[i], dd = dx * dx + dy * dy;
        if (dd < d1) { d2 = d1; d1 = dd; ct = pt[i]; } else if (dd < d2) d2 = dd; }
      const edge = sstep(1 - (Math.sqrt(d2) - Math.sqrt(d1)) * 9);
      putLUT(d, (y * W + x) * 4, lut, clamp01(ct * 0.85 + 0.06 + edge * 0.45));
    }}
  ctx.putImageData(img, 0, 0);
}

// Metaballs: gooey merged energy blobs.
function drawMetaballs(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("metaballs" + seed));
  const lut = rampLUT(colors);
  const n = 5 + Math.floor(r() * 4), aspect = W / H;
  const bx: number[] = [], by: number[] = [], br: number[] = [];
  for (let i = 0; i < n; i++) { bx.push(r()); by.push(r()); br.push(0.06 + r() * 0.1); }
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      let f = 0;
      for (let i = 0; i < n; i++) { const dx = (u - bx[i]) * aspect, dy = v - by[i]; f += (br[i] * br[i]) / (dx * dx + dy * dy + 0.0005); }
      putLUT(d, (y * W + x) * 4, lut, 1 - sstep((f - 1.15) * 0.85));
    }}
  ctx.putImageData(img, 0, 0);
}

// Marble: turbulence-veined stone.
function drawMarble(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("marble" + seed));
  const lut = rampLUT(colors);
  const ph: number[] = []; for (let i = 0; i < 8; i++) ph.push(r() * 6.283);
  const s = 4 + r() * 3, aspect = W / H;
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      const px = u * s * aspect, py = v * s;
      const turb = Math.abs(Math.sin(px * 1.7 + ph[0])) + 0.5 * Math.abs(Math.sin(py * 2.3 + ph[1]))
                 + 0.3 * Math.abs(Math.sin((px * 1.1 + py * 1.9) * 1.3 + ph[2])) + 0.17 * Math.abs(Math.sin((px - py) * 3.1 + ph[3]));
      const f = Math.sin((px * 0.9 + py * 0.35) + turb * 2.6 + ph[4]);  // veins at zero crossings
      const vein = Math.pow(Math.abs(f), 0.42);                          // thin dark lines
      const base = 0.12 * Math.sin(px * 0.4 + py * 0.6 + ph[5]);         // soft stone tint
      putLUT(d, (y * W + x) * 4, lut, clamp01(1 - vein * 0.92 + base));
    }}
  ctx.putImageData(img, 0, 0);
}

// Silk: smooth horizontal flowing wave bands with cylindrical sheen.
function drawSilk(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("silk" + seed));
  const lut = rampLUT(colors);
  const ph: number[] = []; for (let i = 0; i < 6; i++) ph.push(r() * 6.283);
  const bands = 5 + Math.floor(r() * 4), amp = 0.06 + r() * 0.06;
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      const disp = Math.sin(u * 3.0 + ph[0]) * amp + Math.sin(u * 6.0 + ph[1]) * amp * 0.5;
      const f = (v + disp) * bands;
      const band = f - Math.floor(f);
      const shade = Math.sin(band * Math.PI);
      putLUT(d, (y * W + x) * 4, lut, clamp01((1 - shade * 0.9) * 0.5 + v * 0.5));
    }}
  ctx.putImageData(img, 0, 0);
}

// Iridescent: oil-slick / holographic thin-film sheen. Rapid interference bands
// over a flowing film surface, mapped through the palette for a rainbow sheen.
function drawIridescent(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("irid" + seed));
  const lut = rampLUT(colors);
  const ph: number[] = []; for (let i = 0; i < 8; i++) ph.push(r() * 6.283);
  const aspect = W / H, freq = 6 + inten * 10;
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      const px = u * aspect, py = v;
      const flow = Math.sin(px * 2.1 + ph[0] + Math.sin(py * 2.6 + ph[1]) * 0.8)
                 + 0.6 * Math.sin((px * 0.9 - py * 1.7) + ph[2]);
      const thick = 0.5 + 0.5 * Math.sin(flow * 2.4 + ph[3]);
      const inter = 0.5 + 0.5 * Math.sin(thick * freq + flow * 1.5 + ph[4]);
      putLUT(d, (y * W + x) * 4, lut, clamp01(inter * 0.8 + (v * 0.3 + 0.08) * 0.2));
    }}
  ctx.putImageData(img, 0, 0);
}

// Vortex: a swirling spiral gradient, angle + radius twisted into arms.
function drawVortex(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("vortex" + seed));
  const lut = rampLUT(colors);
  const ph: number[] = []; for (let i = 0; i < 4; i++) ph.push(r() * 6.283);
  const cx = 0.5 + (r() - 0.5) * 0.28, cy = 0.5 + (r() - 0.5) * 0.28;
  const arms = 2 + Math.floor(r() * 4), twist = 4 + inten * 8, aspect = W / H;
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      const dx = (u - cx) * aspect, dy = v - cy;
      const rad = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      const swirl = ang * arms + rad * twist + ph[0];
      const t = 0.5 + 0.5 * Math.sin(swirl);
      putLUT(d, (y * W + x) * 4, lut, clamp01(t * 0.72 + clamp01(rad * 1.4) * 0.28));
    }}
  ctx.putImageData(img, 0, 0);
}

// Halftone: risograph / print-style dots whose coverage follows a soft gradient.
function drawHalftone(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("halftone" + seed));
  const lut = rampLUT(colors);
  const ph: number[] = []; for (let i = 0; i < 4; i++) ph.push(r() * 6.283);
  const cell = Math.max(6, Math.round(Math.min(W, H) / (70 + inten * 60)));
  const ang = r() * Math.PI, ca = Math.cos(ang), sa = Math.sin(ang);
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      const g = clamp01(0.5 + 0.5 * Math.sin((u * ca + v * sa) * 3.0 + ph[0] + Math.sin(v * 2.2 + ph[1]) * 0.5));
      const cxv = (x % cell) - cell / 2 + 0.5, cyv = (y % cell) - cell / 2 + 0.5;
      const dist = Math.hypot(cxv, cyv) / (cell * 0.5);
      const radius = Math.sqrt(clamp01(g));
      const dot = sstep((radius - dist) / 0.14);
      putLUT(d, (y * W + x) * 4, lut, clamp01(dot * (0.12 + (1 - g) * 0.15) + (1 - dot) * (0.74 + g * 0.2)));
    }}
  ctx.putImageData(img, 0, 0);
}

// Nebula: cosmic fractal cloud — domain-warped turbulence, bright wisps on dark.
function drawNebula(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("nebula" + seed));
  const lut = rampLUT(colors);
  const ph: number[] = []; for (let i = 0; i < 10; i++) ph.push(r() * 6.283);
  const aspect = W / H, s = 2 + r() * 2;
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      let px = u * s * aspect, py = v * s;
      px += (Math.sin(py * 1.7 + ph[0]) + 0.5 * Math.sin(py * 3.3 + ph[1])) * 0.6;
      py += (Math.sin(px * 1.9 + ph[2]) + 0.5 * Math.sin(px * 3.1 + ph[3])) * 0.6;
      let f = 0, amp = 0.5, fr = 1;
      for (let o = 0; o < 4; o++) { f += amp * Math.abs(Math.sin(px * fr + ph[4 + o]) * Math.cos(py * fr * 1.3 + ph[o])); fr *= 1.9; amp *= 0.55; }
      const dens = clamp01(Math.pow(f, 1.4));
      putLUT(d, (y * W + x) * 4, lut, clamp01(1 - dens * 1.1 + v * 0.1));
    }}
  ctx.putImageData(img, 0, 0);
}

// Ripple: concentric water-drop rings from one or two points, decaying outward.
function drawRipple(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("ripple" + seed));
  const lut = rampLUT(colors);
  const ph: number[] = []; for (let i = 0; i < 4; i++) ph.push(r() * 6.283);
  const cx = 0.3 + r() * 0.4, cy = 0.3 + r() * 0.4, cx2 = 0.3 + r() * 0.4, cy2 = 0.3 + r() * 0.4;
  const freq = 14 + inten * 22, aspect = W / H;
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      const r1 = Math.hypot((u - cx) * aspect, v - cy), r2 = Math.hypot((u - cx2) * aspect, v - cy2);
      const w = Math.sin(r1 * freq + ph[0]) * 0.6 + Math.sin(r2 * freq * 0.8 + ph[1]) * 0.4;
      putLUT(d, (y * W + x) * 4, lut, clamp01(0.5 + 0.5 * w * (1 / (1 + r1 * 1.5))));
    }}
  ctx.putImageData(img, 0, 0);
}

// Mosaic: a smooth gradient quantised into square blocks — big-pixel aesthetic.
function drawMosaic(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("mosaic" + seed));
  const lut = rampLUT(colors);
  const ph: number[] = []; for (let i = 0; i < 4; i++) ph.push(r() * 6.283);
  const cells = 14 + Math.floor(r() * 14), aspect = W / H;
  const cw = W / cells, ch = cw;
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const bx = Math.floor(x / cw), by = Math.floor(y / ch);
      const u = (bx + 0.5) * cw / W, vv = (by + 0.5) * ch / H;
      const px = u * 4 * aspect, py = vv * 4;
      const f = Math.sin(px + ph[0]) + Math.sin(py * 1.2 + ph[1]) + 0.6 * Math.sin((px + py) * 0.7 + ph[2]);
      const gx = x - bx * cw, gy = y - by * ch;
      const grout = (gx < cw * 0.06 || gy < ch * 0.06) ? 0.12 : 0;  // thin block gap
      putLUT(d, (y * W + x) * 4, lut, clamp01((f + 2.6) / 5.2 + grout));
    }}
  ctx.putImageData(img, 0, 0);
}

// Kaleidoscope: a warped field folded into mirrored radial segments.
function drawKaleido(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("kaleido" + seed));
  const lut = rampLUT(colors);
  const ph: number[] = []; for (let i = 0; i < 6; i++) ph.push(r() * 6.283);
  const seg = 6 + Math.floor(r() * 6), aspect = W / H, s = 3 + r() * 2;
  const segA = (Math.PI * 2) / seg;
  const img = ctx.createImageData(W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const v = y / H;
    for (let x = 0; x < W; x++) { const u = x / W;
      const dx = (u - 0.5) * aspect, dy = v - 0.5;
      const rad = Math.hypot(dx, dy);
      let ang = Math.atan2(dy, dx);
      ang = ((ang % segA) + segA) % segA;
      if (ang > segA / 2) ang = segA - ang;
      const px = Math.cos(ang) * rad * s, py = Math.sin(ang) * rad * s;
      const f = Math.sin(px * 3 + ph[0]) + Math.sin(py * 3 + ph[1]) + Math.sin((px + py) * 2 + ph[2]);
      putLUT(d, (y * W + x) * 4, lut, clamp01((f + 3) / 6));
    }}
  ctx.putImageData(img, 0, 0);
}

// Dot flow-field: a dense grid of dots domain-warped along streamlines, with
// colour mapped to the local wave height. Deterministic per seed.
function drawDotField(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const r = mulberry32(hashSeed("dotflow" + seed));
  const maxDim = Math.max(W, H);
  ctx.fillStyle = colors[colors.length - 1];
  ctx.fillRect(0, 0, W, H);

  const spacing = Math.max(5, Math.round(maxDim / 205));
  const dot = spacing * 0.3;
  const fx = (0.22 + r() * 0.3) * W, fy = (0.3 + r() * 0.4) * H;
  const ph = r() * Math.PI * 2;
  const freq = (7 + r() * 4) / maxDim * Math.PI;
  const wf1 = (2.2 + r() * 2) / W * Math.PI;
  const wf2 = (2.2 + r() * 2) / H * Math.PI;
  const warpA = spacing * (2.4 + inten * 1.4);

  const BUCKETS = 36;
  const paths: [number, number][][] = Array.from({ length: BUCKETS }, () => []);

  for (let gy = -spacing; gy < H + spacing; gy += spacing) {
    for (let gx = -spacing; gx < W + spacing; gx += spacing) {
      const ddx = gx - fx, ddy = gy - fy;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      const ripple = Math.sin(dist * freq - ph);
      const wave = Math.sin(gx * wf1 + gy * wf2 * 0.7 + ripple * 1.6);
      const field = ripple * 0.6 + wave * 0.4;         // -1..1
      const ox = Math.cos(dist * freq * 0.5 - ph) * warpA * 0.5;
      const oy = field * warpA;
      const t = (field + 1) / 2;
      const bi = Math.min(BUCKETS - 1, Math.max(0, Math.floor(t * BUCKETS)));
      paths[bi].push([gx + ox, gy + oy]);
    }
  }

  for (let b = 0; b < BUCKETS; b++) {
    const pts = paths[b];
    if (!pts.length) continue;
    const t = (b + 0.5) / BUCKETS;
    ctx.fillStyle = ramp(colors, t);
    const rr = dot * (0.75 + (1 - t) * 0.5);           // troughs a touch larger
    ctx.beginPath();
    for (const [x, y] of pts) {
      ctx.moveTo(x + rr, y);
      ctx.arc(x, y, rr, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

// Layered misty hills: stacked wavy color-field bands, back-to-front, each with
// an atmospheric light crest. Deterministic per seed; only hues come from palette.
function drawRidges(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) {
  const light = colors[0];
  const hues = colors.length > 1 ? colors.slice(1) : colors;
  const layers = 10;
  const r = mulberry32(hashSeed("ridge" + seed));

  // base valley wash: light at centre, faint hue at edges
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, mix(light, hues[hues.length - 1], 0.08));
  bgGrad.addColorStop(0.5, light);
  bgGrad.addColorStop(1, mix(light, hues[0], 0.1));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < layers; i++) {
    const frac = i / (layers - 1);                 // 0 back/top .. 1 front/bottom
    const baseY = (0.08 + frac * 0.9) * H;          // crest line marches downward
    const amp = (0.03 + frac * 0.05) * H;           // nearer ridges swell more
    const ph1 = r() * Math.PI * 2, ph2 = r() * Math.PI * 2, ph3 = r() * Math.PI * 2;
    const f1 = 1.1 + r() * 0.9, f2 = 2.3 + r() * 1.4, f3 = 3.7 + r() * 1.8;

    // alternate green/blue family so hills interleave like the reference
    const hue = hues[i % hues.length];
    const crest = mix(hue, light, 0.55 - frac * 0.25);  // misty light top edge
    const deep = mix(hue, colors[colors.length - 1], 0.15 + frac * 0.2);

    ctx.beginPath();
    ctx.moveTo(0, H);
    const step = Math.max(2, Math.floor(W / 220));
    for (let x = 0; x <= W; x += step) {
      const u = x / W;
      const y = baseY
        + Math.sin(u * Math.PI * f1 + ph1) * amp
        + Math.sin(u * Math.PI * f2 + ph2) * amp * 0.45
        + Math.sin(u * Math.PI * f3 + ph3) * amp * 0.2;
      if (x === 0) ctx.lineTo(0, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();

    const g = ctx.createLinearGradient(0, baseY - amp, 0, H);
    g.addColorStop(0, crest);
    g.addColorStop(0.18, hue);
    g.addColorStop(1, deep);
    ctx.save();
    ctx.globalAlpha = 0.9 - frac * 0.08;
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
}

function overlayText(ctx: CanvasRenderingContext2D, W: number, H: number, text?: string) {
  if (!text || !text.trim()) return;
  ctx.save();
  const fs = Math.round(H * 0.06);
  ctx.font = `700 ${fs}px -apple-system, Segoe UI, Roboto, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = fs * 0.5;
  ctx.fillText(text.trim(), W / 2, H * 0.9);
  ctx.restore();
}

type PixelDraw = (ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[], seed: string, inten: number) => void;
const EXTRA_DRAW: Record<string, PixelDraw> = {
  aurora: drawAurora, meshgrid: drawMeshGrid, topo: drawTopo, plasma: drawPlasma,
  bokeh: drawBokeh, sunburst: drawSunburst, voronoi: drawVoronoi, metaballs: drawMetaballs,
  marble: drawMarble, silk: drawSilk,
  iridescent: drawIridescent, vortex: drawVortex, halftone: drawHalftone,
  nebula: drawNebula, ripple: drawRipple, mosaic: drawMosaic, kaleido: drawKaleido,
};
const PIXEL_LAYOUTS = new Set<string>([
  "ridges", "dotfield", "liquid", "fluted",
  "aurora", "meshgrid", "topo", "plasma", "bokeh", "sunburst", "voronoi", "metaballs", "marble", "silk",
  "iridescent", "vortex", "halftone",
  "nebula", "ripple", "mosaic", "kaleido",
]);

export function render(ctx: CanvasRenderingContext2D, W: number, H: number, p: GenParams) {
  const scene = buildScene(p);
  const maxDim = Math.max(W, H);
  ctx.clearRect(0, 0, W, H);

  // background
  if (scene.bgTop) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const c = scene.colors;
    g.addColorStop(0, scene.bgTop);
    g.addColorStop(0.42, c[Math.min(c.length - 1, 1)]);
    g.addColorStop(0.75, c[Math.min(c.length - 1, 2)]);
    g.addColorStop(1, c[Math.min(c.length - 1, 3)]);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = scene.bg;
  }
  ctx.fillRect(0, 0, W, H);

  if (scene.style.layout === "fluted") {
    drawFluted(ctx, W, H, scene.colors, p.seed, Math.min(1, Math.max(0, p.intensity)));
    if (p.text && p.text.trim()) {
      ctx.save();
      const fs = Math.round(H * 0.06);
      ctx.font = `700 ${fs}px -apple-system, Segoe UI, Roboto, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = fs * 0.5;
      ctx.fillText(p.text.trim(), W / 2, H * 0.9);
      ctx.restore();
    }
    return;
  }

  if (scene.style.layout === "liquid") {
    drawLiquid(ctx, W, H, scene.colors, p.seed, Math.min(1, Math.max(0, p.intensity)));
    if (p.text && p.text.trim()) {
      ctx.save();
      const fs = Math.round(H * 0.06);
      ctx.font = `700 ${fs}px -apple-system, Segoe UI, Roboto, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = fs * 0.5;
      ctx.fillText(p.text.trim(), W / 2, H * 0.9);
      ctx.restore();
    }
    return;
  }

  if (scene.style.layout === "dotfield") {
    drawDotField(ctx, W, H, scene.colors, p.seed, Math.min(1, Math.max(0, p.intensity)));
    if (p.text && p.text.trim()) {
      ctx.save();
      const fs = Math.round(H * 0.06);
      ctx.font = `700 ${fs}px -apple-system, Segoe UI, Roboto, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = fs * 0.5;
      ctx.fillText(p.text.trim(), W / 2, H * 0.9);
      ctx.restore();
    }
    return;
  }

  if (scene.style.layout === "ridges") {
    drawRidges(ctx, W, H, scene.colors, p.seed, Math.min(1, Math.max(0, p.intensity)));
    if (p.grainOn && scene.grain > 0) applyGrain(ctx, W, H, scene.grain, p.seed);
    if (p.text && p.text.trim()) {
      ctx.save();
      const fs = Math.round(H * 0.06);
      ctx.font = `700 ${fs}px -apple-system, Segoe UI, Roboto, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = fs * 0.4;
      ctx.fillText(p.text.trim(), W / 2, H * 0.9);
      ctx.restore();
    }
    return;
  }

  const extraDraw = EXTRA_DRAW[scene.style.layout];
  if (extraDraw) {
    extraDraw(ctx, W, H, scene.colors, p.seed, Math.min(1, Math.max(0, p.intensity)));
    overlayText(ctx, W, H, p.text);
    return;
  }

  // radial glow blobs
  ctx.save();
  ctx.globalCompositeOperation = scene.style.blend;
  for (const b of scene.blobs) {
    const cx = b.x * W, cy = b.y * H, rr = b.r * maxDim;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
    if (b.tight) {
      // solid-ish core so each aura band keeps its own hue
      g.addColorStop(0, hexToRgba(b.color, b.alpha));
      g.addColorStop(0.42, hexToRgba(b.color, b.alpha * 0.92));
      g.addColorStop(0.72, hexToRgba(b.color, b.alpha * 0.35));
      g.addColorStop(1, hexToRgba(b.color, 0));
    } else {
      g.addColorStop(0, hexToRgba(b.color, b.alpha));
      g.addColorStop(0.5, hexToRgba(b.color, b.alpha * 0.5));
      g.addColorStop(1, hexToRgba(b.color, 0));
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // film grain
  if (p.grainOn && scene.grain > 0) {
    applyGrain(ctx, W, H, scene.grain, p.seed);
  }

  // text overlay
  if (p.text && p.text.trim()) {
    ctx.save();
    const fs = Math.round(H * 0.06);
    ctx.font = `700 ${fs}px -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = fs * 0.4;
    ctx.fillText(p.text.trim(), W / 2, H * 0.9);
    ctx.restore();
  }
}

function applyGrain(ctx: CanvasRenderingContext2D, W: number, H: number, amount: number, seed: string) {
  // tile a small noise canvas for speed at 4K
  const tile = 256;
  const nc = document.createElement("canvas");
  nc.width = tile; nc.height = tile;
  const nctx = nc.getContext("2d")!;
  const img = nctx.createImageData(tile, tile);
  const rnd = mulberry32(hashSeed("grain" + seed));
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = Math.floor(amount * 255);
  }
  nctx.putImageData(img, 0, 0);
  const pat = ctx.createPattern(nc, "repeat");
  if (pat) {
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
