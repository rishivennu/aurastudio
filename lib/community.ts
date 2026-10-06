import { GenParams, render } from "./engine";
import { encodeParams } from "./share";

export type Post = { id: string; w: string; title: string; at: number; likes: number; remixes?: number; parent?: string; parentTitle?: string };

/** Renders a 1200x630 preview and stores it so shared links show the real wallpaper. Fire-and-forget. */
export async function uploadThumb(p: GenParams) {
  try {
    const c = document.createElement("canvas"); c.width = 1200; c.height = 630;
    const ctx = c.getContext("2d"); if (!ctx) return;
    render(ctx, 1200, 630, p);
    const img = c.toDataURL("image/jpeg", 0.8);
    await fetch("/api/thumb", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ w: encodeParams(p), img }), keepalive: true });
  } catch {}
}

export async function publish(p: GenParams, title: string, parent?: string | null): Promise<{ ok: boolean; id?: string; error?: string; existed?: boolean }> {
  const r = await fetch("/api/community", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ w: encodeParams(p), title, ...(parent ? { parent } : {}) }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Bad response" }));
  if (j.ok) uploadThumb(p);
  return j;
}

const LK = "aura_likes";
export const likedSet = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(LK) || "[]")); } catch { return new Set(); } };
export async function like(id: string, on: boolean): Promise<number | null> {
  const s = likedSet(); on ? s.add(id) : s.delete(id);
  try { localStorage.setItem(LK, JSON.stringify([...s].slice(-500))); } catch {}
  try {
    const r = await fetch("/api/community/like", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, on }) });
    const j = await r.json();
    return typeof j.likes === "number" ? j.likes : null;
  } catch { return null; }
}
