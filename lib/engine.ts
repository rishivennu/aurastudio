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

  if (style.layout === "ridges") {
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
