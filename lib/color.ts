/** "#abc" or "#aabbcc" -> [r, g, b]; anything malformed reads as black */
export function rgbOf(hex: string): [number, number, number] {
  let x = String(hex || "").replace("#", "").trim();
  if (x.length === 3 || x.length === 4) x = x.slice(0, 3).split("").map((c) => c + c).join("");
  const n = /^[0-9a-f]{6}/i.test(x) ? parseInt(x.slice(0, 6), 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** perceived brightness 0..1 */
export const lumHex = (hex: string) => { const [r, g, b] = rgbOf(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
