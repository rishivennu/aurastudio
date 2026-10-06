import { GenParams } from "./engine";
import { PALETTES, STYLES, Palette, StylePreset } from "./presets";
import { encodeParams } from "./share";
import { hashSeed, mulberry32 } from "./prng";

/** preset copy was written for the team; strip the reference notes and dashes before it goes public */
export const cleanDesc = (d: string) => d.replace(/\s*\(ref[^)]*\)/gi, "").replace(/\s*[—–]\s*/g, ", ").trim();

/** seeded Fisher-Yates, so the same page always shows the same examples */
function shuffled<T>(arr: T[], r: () => number) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const base = (styleId: StylePreset["id"], paletteId: string, seed: string): GenParams =>
  ({ seed, styleId, paletteId, keywords: "", text: "", intensity: 0.75, grainOn: true });

/** six stable examples of one style, each in a different palette */
export function styleExamples(s: StylePreset, n = 6) {
  const r = mulberry32(hashSeed("seo-style:" + s.id));
  const pals = shuffled(PALETTES, r).slice(0, n);
  return pals.map((p, i) => ({ p: base(s.id, p.id, `${s.id.slice(0, 3).toUpperCase()}${i + 1}${Math.floor(r() * 900 + 100)}`), pal: p }));
}

/** six stable examples of one palette, each in a different style */
export function paletteExamples(p: Palette, n = 6) {
  const r = mulberry32(hashSeed("seo-pal:" + p.id));
  const sts = shuffled(STYLES, r).slice(0, n);
  return sts.map((s, i) => ({ p: base(s.id, p.id, `${p.id.slice(0, 3).toUpperCase()}${i + 1}${Math.floor(r() * 900 + 100)}`), style: s }));
}

export const imgUrl = (p: GenParams, w: number, h: number) => `/api/img?p=${encodeParams(p)}&w=${w}&h=${h}`;
export const studioUrl = (p: GenParams) => `/create?w=${encodeParams(p)}`;

const hue = (hex: string) => {
  const six = hex.length === 4 ? hex.slice(1).replace(/./g, "$&$&") : hex.slice(1);
  const x = parseInt(six, 16), r = (x >> 16) / 255, g = ((x >> 8) & 255) / 255, b = (x & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return -1;
  const hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (hh * 60 + 360) % 360;
};
const NAMES: [number, string][] = [[15, "red"], [45, "orange"], [65, "yellow"], [160, "green"], [200, "teal"], [255, "blue"], [290, "violet"], [335, "pink"], [360, "red"]];
const hueName = (h: number) => (h < 0 ? "neutral" : NAMES.find(([m]) => h < m)![1]);

/** a plain-language sentence about a palette, for the meta description */
export function paletteBlurb(p: Palette) {
  const names = [...new Set(p.colors.map((c) => hueName(hue(c))).filter((n) => n !== "neutral"))].slice(0, 3);
  const tone = names.length ? names.join(", ").replace(/, ([^,]*)$/, " and $1") : "black, white and grey";
  return `${p.name} is a ${p.colors.length}-colour gradient palette of ${tone} tones (${p.colors.join(" ")}).`;
}

/** a palette that has at least one shared hue family, for "related" links */
export function relatedPalettes(p: Palette, n = 6) {
  const mine = new Set(p.colors.map((c) => hueName(hue(c))));
  return PALETTES.filter((x) => x.id !== p.id)
    .map((x) => ({ x, score: x.colors.filter((c) => mine.has(hueName(hue(c)))).length }))
    .sort((a, b) => b.score - a.score || a.x.name.localeCompare(b.x.name)).slice(0, n).map((a) => a.x);
}
