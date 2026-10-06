import { GenParams } from "./engine";
import { PALETTES, STYLES, StyleId } from "./presets";
import { hashSeed, mulberry32 } from "./prng";

export type VibePick = { title: string; why: string; params: GenParams };

// mood words -> style / palette hints for the offline matcher
const STYLE_HINTS: Record<string, StyleId[]> = {
  night: ["nebula", "bloom", "ribbon", "aurora"], space: ["nebula", "plasma"], cosmic: ["nebula", "vortex"],
  rain: ["fluted", "ripple", "liquid"], water: ["ripple", "liquid", "silk"], ocean: ["ripple", "silk", "liquid"],
  glass: ["fluted", "panes"], neon: ["bloom", "flux", "ribbon"], city: ["panes", "fluted", "mosaic"],
  calm: ["soft-linear", "horizon", "silk"], soft: ["soft-linear", "mesh"], dream: ["mesh", "bokeh", "iridescent"],
  sunset: ["horizon", "sunburst"], sun: ["sunburst", "horizon"], dawn: ["horizon", "soft-linear"],
  mountain: ["ridges", "topo"], hills: ["ridges"], map: ["topo"], forest: ["ridges", "marble"],
  electric: ["flux", "plasma"], energy: ["flux", "vortex"], retro: ["halftone", "sunburst", "arches"],
  stone: ["marble", "voronoi"], crystal: ["voronoi", "kaleido"], geometric: ["mosaic", "kaleido", "arches"],
  lights: ["bokeh", "aurora"], bokeh: ["bokeh"], aurora: ["aurora"], holographic: ["iridescent", "ribbon"],
  minimal: ["soft-linear", "arches", "horizon"], fluid: ["liquid", "metaballs", "silk"], silk: ["silk", "ribbon"],
};
const PAL_HINTS: Record<string, string[]> = {
  night: ["indigo-dusk", "midnight-rust", "navy-slate", "crimson-night"], tokyo: ["neon-fuchsia", "azure-fuchsia", "violet-aqua"],
  neon: ["neon-fuchsia", "lime-noir", "azure-fuchsia"], rain: ["sea-mist", "navy-slate", "cyan-abyss"],
  ocean: ["cyan-abyss", "sea-mist", "orchid-sea"], sunset: ["peach-sunset", "canyon-dusk", "mango-plum"],
  warm: ["ember", "clay-ember", "amber-jungle"], fire: ["ember", "magma"], gold: ["gold-noir", "gold-teal-deep"],
  forest: ["jade", "verdant-hills", "lemon-forest"], calm: ["sage-stone", "cream-teal", "sea-mist"],
  pink: ["rose-quartz", "flamingo", "coral-grape"], purple: ["ultraviolet", "plum-orchid", "amethyst-jade"],
  ice: ["glacier", "sky-lemon"], cold: ["glacier", "navy-slate"], spring: ["sky-lemon", "lemon-forest"],
  dark: ["gold-noir", "lime-noir", "crimson-ink"], blood: ["crimson-ink", "crimson-night"], desert: ["canyon-dusk", "clay-ember"],
};

const validPal = (id: string) => PALETTES.some((p) => p.id === id);

/** Offline matcher: deterministic picks from mood words, used when AI is unavailable. */
export function localVibe(prompt: string): VibePick[] {
  const words = prompt.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const rnd = mulberry32(hashSeed("vibe:" + prompt.toLowerCase().trim()));
  const st: StyleId[] = [], pl: string[] = [];
  for (const w of words) {
    for (const [k, v] of Object.entries(STYLE_HINTS)) if (w.startsWith(k) || k.startsWith(w) && w.length > 3) st.push(...v);
    for (const [k, v] of Object.entries(PAL_HINTS)) if (w.startsWith(k) || k.startsWith(w) && w.length > 3) pl.push(...v.filter(validPal));
    for (const p of PALETTES) if (p.name.toLowerCase().includes(w) && w.length > 2) pl.push(p.id);
    for (const s of STYLES) if (s.name.toLowerCase() === w) st.unshift(s.id);
  }
  const out: VibePick[] = [];
  const usedS = new Set<string>(), usedP = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const sPool = st.filter((x) => !usedS.has(x));
    const pPool = pl.filter((x) => !usedP.has(x));
    const styleId = sPool.length ? sPool[Math.floor(rnd() * Math.min(sPool.length, 4))] : STYLES[Math.floor(rnd() * STYLES.length)].id;
    const paletteId = pPool.length ? pPool[Math.floor(rnd() * Math.min(pPool.length, 4))] : PALETTES[Math.floor(rnd() * PALETTES.length)].id;
    usedS.add(styleId); usedP.add(paletteId);
    const s = STYLES.find((x) => x.id === styleId)!, p = PALETTES.find((x) => x.id === paletteId)!;
    out.push({
      title: `${s.name} × ${p.name}`,
      why: st.length || pl.length ? `Matched from the words in your prompt.` : `A random take, since no mood words matched.`,
      params: { seed: "V" + Math.floor(rnd() * 1e6).toString(36).toUpperCase(), styleId, paletteId, keywords: prompt.slice(0, 40), text: "", intensity: 0.55 + rnd() * 0.35, grainOn: rnd() > 0.4 },
    });
  }
  return out;
}

/** Validates and normalises an AI pick; returns null if unusable. */
export function cleanPick(x: unknown, prompt: string, i: number): VibePick | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const styleId = String(o.styleId || "") as StyleId;
  const paletteId = String(o.paletteId || "");
  if (!STYLES.some((s) => s.id === styleId) || !validPal(paletteId)) return null;
  const intensity = Math.min(1, Math.max(0.3, Number(o.intensity) || 0.7));
  const clip = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);
  return {
    title: clip(o.title, 40) || "Untitled",
    why: clip(o.why, 140),
    params: { seed: "AI" + hashSeed(prompt + i).toString(36).slice(0, 5).toUpperCase(), styleId, paletteId, keywords: clip(o.keywords, 40) || prompt.slice(0, 40), text: "", intensity, grainOn: !!o.grain },
  };
}
