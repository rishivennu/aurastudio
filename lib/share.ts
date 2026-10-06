import type { GenParams } from "./engine";
import { STYLES, PALETTES } from "./presets";

// ---- share links: params <-> compact base64url token ----
export function encodeParams(p: GenParams): string {
  const json = JSON.stringify(p);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeParams(token: string): GenParams | null {
  try {
    let b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const p = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if (!p || typeof p !== "object") return null;
    if (!STYLES.some((s) => s.id === p.styleId)) return null;
    if (!PALETTES.some((x) => x.id === p.paletteId)) p.paletteId = PALETTES[0].id;
    return {
      seed: String(p.seed ?? "AURA"),
      styleId: p.styleId,
      paletteId: p.paletteId,
      customColors: (() => {
        const c = Array.isArray(p.customColors) ? p.customColors.map(String).filter((x: string) => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(x)).slice(0, 8) : [];
        return c.length >= 2 ? c : undefined;
      })(),
      keywords: String(p.keywords ?? "").slice(0, 80),
      text: String(p.text ?? "").slice(0, 60),
      intensity: Math.min(1, Math.max(0, Number(p.intensity) || 0.6)),
      grainOn: !!p.grainOn,
    };
  } catch { return null; }
}

export function shareUrl(p: GenParams): string {
  return `${location.origin}/create?w=${encodeParams(p)}`;
}

// ---- saved collection (localStorage) ----
export type Saved = { id: string; params: GenParams; at: number };
const KEY = "aura_saved";
const MAX = 60;

export function loadSaved(): Saved[] {
  try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function store(list: Saved[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch {}
}
export const savedId = (p: GenParams) => encodeParams(p);
export function isSaved(p: GenParams): boolean {
  const id = savedId(p); return loadSaved().some((s) => s.id === id);
}
// returns the new saved state
export function toggleSaved(p: GenParams): boolean {
  const id = savedId(p);
  const list = loadSaved();
  if (list.some((s) => s.id === id)) { store(list.filter((s) => s.id !== id)); return false; }
  store([{ id, params: p, at: Date.now() }, ...list]);
  return true;
}
export function removeSaved(id: string) { store(loadSaved().filter((s) => s.id !== id)); }

// ---- collections: named groups of saved wallpapers (localStorage) ----
export type Collection = { id: string; name: string; items: string[]; at: number };
const CKEY = "aura_collections";
export const SET_MAX = 16;
const SET_URL_MAX = 3000;
const cleanName = (n: string) => n.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 40) || "Untitled set";

export function loadCollections(): Collection[] {
  try {
    const a = JSON.parse(localStorage.getItem(CKEY) || "[]");
    return Array.isArray(a) ? a.filter((c) => c && typeof c.id === "string" && Array.isArray(c.items)) : [];
  } catch { return []; }
}
function storeCollections(list: Collection[]) {
  try { localStorage.setItem(CKEY, JSON.stringify(list.slice(0, 30))); } catch {}
}
export function createCollection(name: string, items: string[] = []): Collection {
  const c: Collection = { id: Math.random().toString(36).slice(2, 10), name: cleanName(name), items: [...new Set(items)], at: Date.now() };
  storeCollections([...loadCollections(), c]);
  return c;
}
export function renameCollection(id: string, name: string) {
  storeCollections(loadCollections().map((c) => (c.id === id ? { ...c, name: cleanName(name) } : c)));
}
export function deleteCollection(id: string) { storeCollections(loadCollections().filter((c) => c.id !== id)); }
/** returns true if the item is now in the collection */
export function toggleInCollection(id: string, item: string): boolean {
  let now = false;
  storeCollections(loadCollections().map((c) => {
    if (c.id !== id) return c;
    now = !c.items.includes(item);
    return { ...c, items: now ? [...c.items, item] : c.items.filter((x) => x !== item) };
  }));
  return now;
}
/** saves every wallpaper that is not saved yet; returns their ids in order */
export function saveMany(list: GenParams[]): string[] {
  const cur = loadSaved();
  const have = new Set(cur.map((s) => s.id));
  const add: Saved[] = [];
  const ids = list.map((p) => {
    const id = savedId(p);
    if (!have.has(id)) { have.add(id); add.push({ id, params: p, at: Date.now() }); }
    return id;
  });
  store([...add, ...cur]);
  return ids;
}

// one link for a whole set: base64url of {n: name, p: [params...]}
// short keys keep a 16-item link around 2 KB, which survives chat apps and SMS
const pack = (p: GenParams) => {
  const o: Record<string, unknown> = { s: p.seed.slice(0, 24), y: p.styleId, i: Math.round(p.intensity * 100) };
  if (p.customColors?.length) o.c = p.customColors; else o.l = p.paletteId;
  if (p.keywords) o.k = p.keywords.slice(0, 40);
  if (p.text) o.t = p.text.slice(0, 40);
  if (p.grainOn) o.g = 1;
  return o;
};
const unpack = (o: Record<string, unknown>) => ({ seed: o.s, styleId: o.y, paletteId: o.l, customColors: o.c, keywords: o.k, text: o.t, intensity: Number(o.i) / 100, grainOn: !!o.g });
const b64u = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** returns the token and how many items fit under the URL budget */
export function encodeSet(name: string, list: GenParams[]): { token: string; count: number } {
  const n = cleanName(name);
  for (let k = Math.min(SET_MAX, list.length); k >= 1; k--) {
    const token = b64u(JSON.stringify({ n, v: 2, p: list.slice(0, k).map(pack) }));
    if (token.length <= SET_URL_MAX) return { token, count: k };
  }
  return { token: b64u(JSON.stringify({ n, v: 2, p: [pack(list[0])] })), count: 1 };
}
export function decodeSet(token: string): { name: string; items: GenParams[] } | null {
  try {
    if (token.length > 6000) return null;
    let b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const o = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if (!o || !Array.isArray(o.p)) return null;
    const items = o.p.slice(0, SET_MAX).map((x: Record<string, unknown>) => decodeParams(encodeParams((o.v === 2 ? unpack(x || {}) : x) as unknown as GenParams))).filter(Boolean) as GenParams[];
    return items.length ? { name: cleanName(String(o.n ?? "")), items } : null;
  } catch { return null; }
}
export function setUrl(name: string, list: GenParams[]) { const r = encodeSet(name, list); return { url: `${location.origin}/saved?c=${r.token}`, count: r.count }; }
export const SAVED_MAX = MAX;
