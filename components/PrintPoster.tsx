"use client";
import { useState } from "react";
import { GenParams } from "@/lib/engine";
import Canvas from "./Canvas";
import { renderToBlob, downloadBlob } from "@/lib/exporter";
import { jpegPdf, mmPt, mmPx } from "@/lib/pdf";

const SIZES = [
  { id: "a4", name: "A4", w: 210, h: 297 },
  { id: "a3", name: "A3", w: 297, h: 420 },
  { id: "a2", name: "A2", w: 420, h: 594 },
  { id: "50x70", name: "50×70 cm", w: 500, h: 700 },
  { id: "18x24", name: "18×24 in", w: 457.2, h: 609.6 },
];
const BLEED = 3, SLUG = 8; // mm

/** Print-ready poster: 300 or 200 dpi raster with 3 mm bleed, wrapped in a PDF with trim and bleed boxes. */
export default function PrintPoster({ params, notify }: { params: GenParams; notify: (m: string) => void }) {
  const [size, setSize] = useState(SIZES[2]);
  const [land, setLand] = useState(false);
  const [dpi, setDpi] = useState(300);
  const [bleed, setBleed] = useState(true);
  const [marks, setMarks] = useState(true);
  const [busy, setBusy] = useState("");

  const tw = land ? size.h : size.w, th = land ? size.w : size.h;
  const b = bleed ? BLEED : 0;
  const pxW = mmPx(tw + 2 * b, dpi), pxH = mmPx(th + 2 * b, dpi);
  const mp = (pxW * pxH) / 1e6;

  const pw = land ? 300 : 210, ph = Math.round(pw * (th + 2 * b) / (tw + 2 * b));
  const ix = (b / (tw + 2 * b)) * 100, iy = (b / (th + 2 * b)) * 100;

  const go = async (kind: "pdf" | "jpg") => {
    setBusy(kind);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const { blob } = await renderToBlob(params, pxW, pxH, "jpeg");
      if (!blob) throw new Error("canvas too big");
      const name = `aura-poster_${size.id}${land ? "-landscape" : ""}_${dpi}dpi_${params.seed}`;
      if (kind === "jpg") downloadBlob(blob, `${name}.jpg`);
      else {
        const jpeg = new Uint8Array(await blob.arrayBuffer());
        downloadBlob(jpegPdf(jpeg, { w: pxW, h: pxH }, { trimW: mmPt(tw), trimH: mmPt(th), bleed: mmPt(b), slug: mmPt(SLUG) }, marks && bleed, `aura ${size.name} poster`), `${name}.pdf`);
      }
      notify(kind === "pdf" ? "Print PDF downloaded" : "Poster image downloaded");
    } catch {
      notify(dpi === 300 ? "This browser could not hold a canvas that big. Try 200 dpi or a smaller size." : "Export failed. Try a smaller size.");
    } finally { setBusy(""); }
  };

  return (
    <div className="xt-body xt-pair">
      <div className="pp-stage" style={{ width: pw, height: ph }}>
        <Canvas key={`${pw}x${ph}`} params={params} w={pw * 2} h={ph * 2} className="pp-c" ariaLabel={`Poster preview, ${size.name} ${land ? "landscape" : "portrait"}`} />
        {bleed && <span className="pp-trim" style={{ left: `${ix}%`, right: `${ix}%`, top: `${iy}%`, bottom: `${iy}%` }} aria-hidden="true" />}
      </div>
      <div className="xt-side">
        <p className="xt-lead">A print-ready poster at {dpi} dpi. The PDF carries the trim and bleed boxes printers look for, so you can upload it straight to a print shop.</p>
        <div className="xt-row" role="group" aria-label="Paper size">
          {SIZES.map((s) => <button key={s.id} className="chip" aria-pressed={size.id === s.id} onClick={() => setSize(s)}>{s.name}</button>)}
        </div>
        <div className="xt-row" role="group" aria-label="Orientation and resolution">
          <button className="chip" aria-pressed={!land} onClick={() => setLand(false)}>Portrait</button>
          <button className="chip" aria-pressed={land} onClick={() => setLand(true)}>Landscape</button>
          <button className="chip" aria-pressed={dpi === 300} onClick={() => setDpi(300)}>300 dpi</button>
          <button className="chip" aria-pressed={dpi === 200} onClick={() => setDpi(200)}>200 dpi</button>
        </div>
        <div className="xt-row" role="group" aria-label="Print marks">
          <button className="chip" aria-pressed={bleed} onClick={() => setBleed((v) => !v)}>3 mm bleed</button>
          <button className="chip" aria-pressed={marks && bleed} disabled={!bleed} onClick={() => setMarks((v) => !v)}>Crop marks</button>
        </div>
        <dl className="pp-spec">
          <div><dt>Trim</dt><dd>{Math.round(tw)} × {Math.round(th)} mm</dd></div>
          <div><dt>With bleed</dt><dd>{Math.round(tw + 2 * b)} × {Math.round(th + 2 * b)} mm</dd></div>
          <div><dt>Pixels</dt><dd>{pxW} × {pxH} ({mp.toFixed(1)} MP)</dd></div>
        </dl>
        <div className="xt-row">
          <button className="btn grad sm" onClick={() => go("pdf")} disabled={!!busy}>{busy === "pdf" ? "Rendering…" : "Download print PDF"}</button>
          <button className="btn ghost sm" onClick={() => go("jpg")} disabled={!!busy}>{busy === "jpg" ? "Rendering…" : "Image only (JPEG)"}</button>
        </div>
        <p className="hint">{mp > 16 ? "Big file: phones may not manage this size, so use a computer or pick 200 dpi. " : ""}Colours are RGB; most print shops convert to CMYK for you, and very bright neons can print a little duller. The dashed line shows where the paper is cut.</p>
      </div>
    </div>
  );
}
