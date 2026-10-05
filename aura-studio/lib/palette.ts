// Extract a light->dark gradient palette from an uploaded photo, entirely in
// the browser. Downscales the image, buckets colours, keeps the most popular
// well-separated ones, then sorts light -> dark to match the engine convention.
function lum(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function dist(a: number[], b: number[]) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
function toHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, "0")).join("");
}

export async function extractPaletteFromFile(file: File, count = 5): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
    const S = 64;
    const cv = document.createElement("canvas");
    cv.width = S; cv.height = S;
    const ctx = cv.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.drawImage(img, 0, 0, S, S);
    const data = ctx.getImageData(0, 0, S, S).data;
    // coarse 5-bit-per-channel buckets with population counts
    const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      const cur = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      cur.n++; cur.r += r; cur.g += g; cur.b += b;
      buckets.set(key, cur);
    }
    const avg = [...buckets.values()]
      .map((c) => ({ n: c.n, c: [c.r / c.n, c.g / c.n, c.b / c.n] }))
      .sort((a, b) => b.n - a.n);
    // greedily keep popular colours that are far enough apart
    const chosen: number[][] = [];
    for (const { c } of avg) {
      if (chosen.every((p) => dist(p, c) > 42)) chosen.push(c);
      if (chosen.length >= count) break;
    }
    while (chosen.length < 2 && avg.length) chosen.push(avg[chosen.length]?.c || avg[0].c);
    chosen.sort((a, b) => lum(b[0], b[1], b[2]) - lum(a[0], a[1], a[2])); // light -> dark
    return chosen.map((c) => toHex(c[0], c[1], c[2]));
  } finally {
    URL.revokeObjectURL(url);
  }
}
