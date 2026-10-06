import { GenParams } from "./engine";
import { PALETTES, STYLES } from "./presets";
import { hashSeed, mulberry32 } from "./prng";

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Same wallpaper for everyone on the same calendar day, different every day. */
export function dailyParams(d: Date): GenParams {
  const key = dayKey(d);
  const rnd = mulberry32(hashSeed("aura-daily:" + key));
  const st = STYLES[Math.floor(rnd() * STYLES.length)];
  const pal = PALETTES[Math.floor(rnd() * PALETTES.length)];
  return {
    seed: "D" + key.replace(/-/g, ""),
    styleId: st.id, paletteId: pal.id,
    keywords: "daily " + key, text: "",
    intensity: 0.6 + rnd() * 0.3, grainOn: rnd() > 0.5,
  };
}

/** Records today as visited and returns the current streak in days. */
export function touchStreak(today: Date): number {
  try {
    const k = "aura_daily_visits";
    const set = new Set<string>(JSON.parse(localStorage.getItem(k) || "[]"));
    set.add(dayKey(today));
    const arr = [...set].sort().slice(-120);
    localStorage.setItem(k, JSON.stringify(arr));
    let n = 0; const d = new Date(today);
    while (set.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  } catch { return 1; }
}
