"use client";
import { useEffect, useRef, useState } from "react";
import { GenParams } from "@/lib/engine";
import { FX, Fx, loadPhoto, renderPhotoFx, photoFxBlob } from "@/lib/photofx";
import { downloadBlob } from "@/lib/exporter";

type Src = Awaited<ReturnType<typeof loadPhoto>>;
const OUT = [
  { id: "phone", name: "Phone", w: 1290, h: 2796 },
  { id: "desktop", name: "Desktop 4K", w: 3840, h: 2160 },
  { id: "square", name: "Square", w: 2048, h: 2048 },
];

export default function PhotoGlass({ params, notify }: { params: GenParams; notify: (m: string) => void }) {
  const [img, setImg] = useState<Src | null>(null);
  const [fx, setFx] = useState<Fx>("ribbed");
  const [strength, setStrength] = useState(0.7);
  const [ribs, setRibs] = useState(24);
  const [fy, setFy] = useState(0.5);
  const [fxX, setFxX] = useState(0.5);
  const [out, setOut] = useState(OUT[0]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);

  // free the decoded photo when the tab closes
  const imgRef = useRef<Src | null>(null);
  imgRef.current = img;
  useEffect(() => () => { const i = imgRef.current; if (i && "close" in i) (i as ImageBitmap).close(); }, []);

  const pw = out.h > out.w ? 240 : out.w === out.h ? 320 : 420;
  const ph = Math.round(pw * out.h / out.w);

  useEffect(() => {
    const c = ref.current; if (!c || !img) return;
    const id = requestAnimationFrame(() => {
      c.width = pw * 2; c.height = ph * 2;
      renderPhotoFx(c.getContext("2d")!, c.width, c.height, img, params, { fx, strength, focusX: fxX, focusY: fy, ribs: Math.round(ribs * (c.width / Math.min(c.width, c.height))) });
    });
    return () => cancelAnimationFrame(id);
  }, [img, fx, strength, ribs, fy, fxX, params, pw, ph, out]);

  const take = async (f?: File | null) => {
    if (!f) return;
    try {
      const next = await loadPhoto(f);
      setImg((prev) => { if (prev && "close" in prev) (prev as ImageBitmap).close(); return next; });
      notify("Photo loaded. It stays on this device.");
    }
    catch (e) { notify(e instanceof Error ? e.message : "Could not open that image"); }
  };
  const ribsFor = (w: number, h: number) => Math.round(ribs * (w / Math.min(w, h)));
  const save = async () => {
    if (!img) return;
    setBusy(true);
    try {
      const b = await photoFxBlob(img, params, { fx, strength, focusX: fxX, focusY: fy, ribs: ribsFor(out.w, out.h) }, out.w, out.h);
      downloadBlob(b, `aura_photo-${fx}_${out.w}x${out.h}.jpg`);
      notify("Photo wallpaper downloaded");
    } catch { notify("That was too big for this browser. Try Phone size."); }
    finally { setBusy(false); }
  };

  return (
    <div className="xt-body xt-pair">
      <div className={`pg-stage ${drag ? "drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}>
        {img ? <canvas ref={ref} className="pg-c" style={{ width: pw, height: ph }} role="img" aria-label={`Your photo with the ${FX.find((f) => f.id === fx)?.name} effect`} />
          : (
            <button className="pg-drop" onClick={() => file.current?.click()} style={{ width: pw, height: ph }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>
              <b>Add a photo</b><span>Drop it here or tap to choose</span>
            </button>
          )}
      </div>
      <div className="xt-side">
        <p className="xt-lead">Put the glass over your own photo: a pet, a skyline, a holiday shot. The tint comes from the wallpaper you have open, and your photo never leaves this device.</p>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="xt-row">
          <button className="btn ghost sm" onClick={() => file.current?.click()}>{img ? "Change photo" : "Choose photo"}</button>
        </div>
        <div className="xt-row" role="group" aria-label="Effect">
          {FX.map((f) => <button key={f.id} className="chip" aria-pressed={fx === f.id} onClick={() => setFx(f.id)} title={f.desc}>{f.name}</button>)}
        </div>
        <p className="hint">{FX.find((f) => f.id === fx)?.desc}.</p>
        <label className="lbl" htmlFor="pg-s">Strength · {Math.round(strength * 100)}%</label>
        <input id="pg-s" type="range" min={0.1} max={1} step={0.05} value={strength} onChange={(e) => setStrength(+e.target.value)} />
        {fx === "ribbed" && (<>
          <label className="lbl" htmlFor="pg-r">Ribs across · {ribs}</label>
          <input id="pg-r" type="range" min={8} max={60} step={1} value={ribs} onChange={(e) => setRibs(+e.target.value)} />
        </>)}
        <label className="lbl" htmlFor="pg-x">Focus left / right</label>
        <input id="pg-x" type="range" min={0} max={1} step={0.01} value={fxX} onChange={(e) => setFxX(+e.target.value)} />
        <label className="lbl" htmlFor="pg-y">Focus up / down</label>
        <input id="pg-y" type="range" min={0} max={1} step={0.01} value={fy} onChange={(e) => setFy(+e.target.value)} />
        <div className="xt-row" role="group" aria-label="Output size">
          {OUT.map((o) => <button key={o.id} className="chip" aria-pressed={out.id === o.id} onClick={() => setOut(o)}>{o.name} · {o.w}×{o.h}</button>)}
        </div>
        <div className="xt-row"><button className="btn grad sm" onClick={save} disabled={!img || busy}>{busy ? "Rendering…" : "Download wallpaper"}</button></div>
      </div>
    </div>
  );
}
