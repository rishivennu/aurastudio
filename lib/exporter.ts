import { render, GenParams } from "./engine";
import { track } from "./track";

type Dev = { id: string; name: string; w: number; h: number };

export async function renderToBlob(
  params: GenParams, w: number, h: number, format: "png" | "jpeg"
): Promise<{ blob: Blob; ms: number }> {
  const off = document.createElement("canvas");
  off.width = w; off.height = h;
  const ctx = off.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  const t0 = performance.now();
  render(ctx, w, h, params);
  const mime = format === "png" ? "image/png" : "image/jpeg";
  const blob: Blob = await new Promise((res) => off.toBlob((b) => res(b as Blob), mime, 0.92));
  return { blob, ms: Math.round(performance.now() - t0) };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportWallpaper(params: GenParams, dev: Dev, format: "png" | "jpeg") {
  const { blob, ms } = await renderToBlob(params, dev.w, dev.h, format);
  downloadBlob(blob, `aura_${params.styleId}_${params.paletteId}_${params.seed}_${dev.id}.${format}`);
  track({ generations: 1, downloads: 1, ms_total: ms, [`pal_${params.paletteId}`]: 1, [`style_${params.styleId}`]: 1 });
}

export async function exportBatchZip(
  items: GenParams[], dev: Dev, format: "png" | "jpeg",
  onProgress?: (done: number, total: number) => void
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const delta: Record<string, number> = { generations: items.length, downloads: items.length, ms_total: 0 };
  const used: Record<string, number> = {};
  for (let i = 0; i < items.length; i++) {
    const p = items[i];
    const { blob, ms } = await renderToBlob(p, dev.w, dev.h, format);
    const name = `aura_${p.styleId}_${p.paletteId}_${p.seed}_${dev.id}.${format}`;
    zip.file(name, blob);
    delta.ms_total += ms;
    delta[`pal_${p.paletteId}`] = (delta[`pal_${p.paletteId}`] || 0) + 1;
    delta[`style_${p.styleId}`] = (delta[`style_${p.styleId}`] || 0) + 1;
    used[name] = 1;
    onProgress?.(i + 1, items.length);
  }
  const content = await zip.generateAsync({ type: "blob" });
  const seed = items[0]?.seed || "set";
  downloadBlob(content, `aura_wallpapers_${seed}_${dev.id}.zip`);
  track(delta);
}
