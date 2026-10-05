// Deterministic, seedable PRNG (mulberry32). Same seed => same wallpaper.
export function hashSeed(input: string | number): number {
  let h = 2166136261 >>> 0;
  const s = String(input);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RNG = () => number;
export const rangeRnd = (r: RNG, min: number, max: number) => min + r() * (max - min);
export const pick = <T,>(r: RNG, arr: T[]): T => arr[Math.floor(r() * arr.length)];
