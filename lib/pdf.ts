/** A one-page PDF around a single JPEG, with TrimBox/BleedBox and optional vector crop marks. No library. */
export type PdfBox = { trimW: number; trimH: number; bleed: number; slug: number }; // all in PDF points (1/72 in)

export function jpegPdf(jpeg: Uint8Array, px: { w: number; h: number }, box: PdfBox, marks: boolean, title = "aura poster"): Blob {
  const enc = new TextEncoder();
  const f = (n: number) => (Math.round(n * 1000) / 1000).toString();
  const { trimW, trimH, bleed } = box;
  const slug = marks ? box.slug : 0;
  const W = trimW + 2 * (bleed + slug), H = trimH + 2 * (bleed + slug);
  const bx = slug, by = slug, bw = trimW + 2 * bleed, bh = trimH + 2 * bleed; // bleed box
  const tx = slug + bleed, ty = slug + bleed; // trim origin

  let ops = `q ${f(bw)} 0 0 ${f(bh)} ${f(bx)} ${f(by)} cm /Im0 Do Q\n`;
  if (marks) {
    // registration-black hairlines at each trim corner, kept out of the bleed so they never print on the poster
    const gap = bleed + 1, len = Math.max(4, slug - gap - 2);
    ops += "q 0.25 w 0 0 0 1 K\n";
    const xs = [tx, tx + trimW], ys = [ty, ty + trimH];
    for (const x of xs) for (const y of ys) {
      const sx = x === tx ? -1 : 1, sy = y === ty ? -1 : 1;
      ops += `${f(x + sx * gap)} ${f(y)} m ${f(x + sx * (gap + len))} ${f(y)} l S\n`;
      ops += `${f(x)} ${f(y + sy * gap)} m ${f(x)} ${f(y + sy * (gap + len))} l S\n`;
    }
    ops += "Q\n";
  }
  const safe = title.replace(/[^\x20-\x7e]/g, "").replace(/[()\\]/g, "").slice(0, 80);
  const objs: (string | [string, Uint8Array])[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] /BleedBox [${f(bx)} ${f(by)} ${f(bx + bw)} ${f(by + bh)}] /TrimBox [${f(tx)} ${f(ty)} ${f(tx + trimW)} ${f(ty + trimH)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    [`<< /Type /XObject /Subtype /Image /Width ${px.w} /Height ${px.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg],
    [`<< /Length ${enc.encode(ops).length} >>`, enc.encode(ops)],
    `<< /Title (${safe}) /Producer (aura.studio) >>`,
  ];
  const parts: Uint8Array[] = [];
  let pos = 0;
  const push = (b: Uint8Array) => { parts.push(b); pos += b.length; };
  const s = (t: string) => push(enc.encode(t));
  s("%PDF-1.4\n%"); push(new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  const offs: number[] = [];
  objs.forEach((o, i) => {
    offs.push(pos);
    if (typeof o === "string") s(`${i + 1} 0 obj\n${o}\nendobj\n`);
    else { s(`${i + 1} 0 obj\n${o[0]}\nstream\n`); push(o[1]); s("\nendstream\nendobj\n"); }
  });
  const xref = pos;
  s(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join(""));
  s(`trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${objs.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

export const mmPt = (mm: number) => (mm * 72) / 25.4;
export const mmPx = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi);
