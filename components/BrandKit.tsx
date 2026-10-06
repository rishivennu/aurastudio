"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { GenParams, resolveColors } from "@/lib/engine";
import { STYLES, StyleId } from "@/lib/presets";
import { BRAND_FMTS, BrandFmt, BrandOpts, Corner, Plate, brandPalette, drawBrand, logoColors, logoTone } from "@/lib/brand";
import { downloadBlob } from "@/lib/exporter";

type Logo = { img: HTMLImageElement; w: number; h: number; lum: number; name: string };
const toHex6 = (c: string) => (/^#[0-9a-f]{3}$/i.test(c) ? "#" + c.slice(1).replace(/./g, "$&$&") : c).toLowerCase();
const PLACES: [Corner, string][] = [["auto", "Best spot"], ["tl", "Top left"], ["tr", "Top right"], ["bl", "Bottom left"], ["br", "Bottom right"], ["c", "Centre"]];
const PLATES: [Plate, string][] = [["auto", "Plate when needed"], ["none", "No plate"], ["light", "Light plate"], ["dark", "Dark plate"]];
const QUICK: StyleId[] = ["meshgrid", "mesh", "aurora", "liquid", "silk", "soft-linear", "fluted", "horizon"];

/** text field keeps a draft while typing; only a full 3- or 6-digit hex reaches the palette */
function HexField({ value, i, onCommit }: { value: string; i: number; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input type="text" value={draft} maxLength={7} spellCheck={false} aria-label={`Hex for colour ${i + 1}`}
      onChange={(e) => {
        const v = e.target.value.trim(); if (!/^#?[0-9a-f]{0,6}$/i.test(v)) return;
        const h = v.startsWith("#") ? v : "#" + v; setDraft(h);
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) onCommit(toHex6(h));
      }}
      onBlur={() => setDraft(value)} />
  );
}

function Preview({ p, f, logo, o, onPick, pw }: { p: GenParams; f: BrandFmt; logo: Logo | null; o: BrandOpts; onPick: () => void; pw: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ph = Math.round(pw * f.h / f.w);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const id = requestAnimationFrame(() => { c.width = pw * 2; c.height = ph * 2; drawBrand(c.getContext("2d", { willReadFrequently: true })!, c.width, c.height, p, f, logo, o); });
    return () => cancelAnimationFrame(id);
  }, [p, f, logo, o, pw, ph]);
  return (
    <figure className="bk-card">
      <button className="bk-thumb" onClick={onPick} aria-label={`Download ${f.name}, ${f.w} by ${f.h}`}>
        <canvas ref={ref} style={{ width: pw, height: ph }} />
      </button>
      <figcaption><b>{f.name}</b><span>{f.w}×{f.h}</span><small>{f.note}</small></figcaption>
    </figure>
  );
}

/** Logo + brand colours in, a matching set for calls, profiles, desktop and email out. Everything stays on this device. */
export default function BrandKit({ params, notify }: { params: GenParams; notify: (m: string) => void }) {
  const [cols, setCols] = useState<string[]>(() => resolveColors(params).slice(0, 4).map(toHex6));
  const [style, setStyle] = useState<StyleId>(params.styleId);
  const [seed, setSeed] = useState(params.seed);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [place, setPlace] = useState<Corner>("auto");
  const [scale, setScale] = useState(1);
  const [plate, setPlate] = useState<Plate>("auto");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string>("");

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const p: GenParams = useMemo(() => ({ ...params, seed, styleId: style, customColors: brandPalette(cols), text: "" }), [params, seed, style, cols]);
  const o: BrandOpts = useMemo(() => ({ place, scale, plate }), [place, scale, plate]);

  const onFile = async (file: File | undefined) => {
    setErr("");
    if (!file) return;
    if (!/^image\/(png|svg\+xml|jpeg|webp)$/.test(file.type)) { setErr("Use a PNG, SVG, JPEG or WebP logo."); return; }
    if (file.size > 8 * 1024 * 1024) { setErr("That file is over 8 MB. Export a smaller logo."); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      // SVGs without width/height report 0; give them a sensible box
      const w = img.naturalWidth || 1024, h = img.naturalHeight || (img.naturalWidth ? img.naturalWidth : 512);
      const t = logoTone(img, w, h);
      // the previous logo is no longer drawn anywhere once this one is set, so its URL can go
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setLogo({ img, w, h, lum: t.lum, name: file.name });
      notify("Logo added. It never leaves this device.");
    };
    img.onerror = () => { URL.revokeObjectURL(url); setErr("Could not read that image."); };
    img.src = url;
  };

  const fromLogo = () => {
    if (!logo) return;
    const c = logoColors(logo.img, logo.w, logo.h, 4);
    if (c.length) { setCols(c); notify(`Took ${c.length} colours from your logo`); } else notify("Your logo has no clear colours to take");
  };

  const fullBlob = (f: BrandFmt) => new Promise<Blob>((res, rej) => {
    const c = document.createElement("canvas"); c.width = f.w; c.height = f.h;
    const ctx = c.getContext("2d", { willReadFrequently: true }); if (!ctx) return rej(new Error("no ctx"));
    drawBrand(ctx, f.w, f.h, p, f, logo, o);
    c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png");
  });

  const one = async (f: BrandFmt) => {
    setBusy(f.id);
    try { downloadBlob(await fullBlob(f), `brand_${f.id}_${f.w}x${f.h}.png`); notify(`${f.name} downloaded`); }
    catch { notify("Export failed. Try again."); } finally { setBusy(""); }
  };
  const all = async () => {
    setBusy("all");
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const f of BRAND_FMTS) { zip.file(`brand_${f.id}_${f.w}x${f.h}.png`, await fullBlob(f)); await new Promise((r) => setTimeout(r, 0)); }
      zip.file("README.txt", [
        "Your brand kit from aura.studio", "",
        ...BRAND_FMTS.map((f) => `${f.name} (${f.w}x${f.h}): ${f.note}`), "",
        `Colours: ${cols.join(", ")}`, `Style: ${STYLES.find((s) => s.id === style)?.name}, seed ${seed}`,
        "Zoom: Settings > Backgrounds & effects > + > Add image.  Teams: Effects and avatars > More video effects > + Add new.",
      ].join("\r\n"));
      downloadBlob(await zip.generateAsync({ type: "blob" }), `brand-kit_${seed}.zip`);
      notify("Brand kit downloaded");
    } catch { notify("Could not build the kit"); } finally { setBusy(""); }
  };

  const setCol = (i: number, v: string) => setCols((c) => c.map((x, j) => (j === i ? v : x)));
  const shuffle = () => setSeed(Math.random().toString(36).slice(2, 8).toUpperCase());

  return (
    <div className="bk">
      <div className="bk-ctl">
        <div className="bk-sec">
          <span className="lbl">Logo</span>
          <div className="xt-row">
            <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="sr-only" id="bk-file" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
            <label htmlFor="bk-file" className="btn ghost sm bk-up">
              <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {logo ? "Replace logo" : "Upload logo"}
            </label>
            {logo && <><span className="bk-file">{logo.name}</span><button className="btn ghost sm" onClick={() => { setLogo(null); if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = ""; } }}>Remove</button><button className="btn ghost sm" onClick={fromLogo}>Use logo colours</button></>}
          </div>
          {err && <p className="hint bad" role="alert">{err}</p>}
          <p className="hint">PNG or SVG with a transparent background works best. It is drawn in your browser and never uploaded.</p>
        </div>

        <div className="bk-sec">
          <span className="lbl" id="bk-cols">Brand colours</span>
          <div className="bk-cols" role="group" aria-labelledby="bk-cols">
            {cols.map((c, i) => (
              <span key={i} className="bk-col">
                <input type="color" value={c} onChange={(e) => setCol(i, e.target.value)} aria-label={`Brand colour ${i + 1}, ${c}`} />
                <HexField value={c} i={i} onCommit={(v) => setCol(i, v)} />
                {cols.length > 1 && <button className="bk-x" onClick={() => setCols((x) => x.filter((_, j) => j !== i))} aria-label={`Remove colour ${i + 1}`}><svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg></button>}
              </span>
            ))}
            {cols.length < 5 && <button className="chip" onClick={() => setCols((x) => [...x, "#ffffff"])}>Add colour</button>}
          </div>
        </div>

        <div className="bk-sec">
          <span className="lbl" id="bk-style">Style</span>
          <div className="xt-row" role="group" aria-labelledby="bk-style">
            {QUICK.map((id) => <button key={id} className="chip" aria-pressed={style === id} onClick={() => setStyle(id)}>{STYLES.find((s) => s.id === id)?.name}</button>)}
            {!QUICK.includes(style) && <button className="chip" aria-pressed>{STYLES.find((s) => s.id === style)?.name}</button>}
            <button className="chip" onClick={shuffle}>New variation</button>
          </div>
        </div>

        <div className="bk-sec">
          <span className="lbl" id="bk-place">Logo position</span>
          <div className="xt-row" role="group" aria-labelledby="bk-place">
            {PLACES.map(([k, l]) => <button key={k} className="chip" aria-pressed={place === k} onClick={() => setPlace(k)}>{l}</button>)}
          </div>
          <label className="lbl" htmlFor="bk-scale">Logo size · {Math.round(scale * 100)}%</label>
          <input id="bk-scale" className="bk-range" type="range" min={0.5} max={1.8} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
          <div className="xt-row" role="group" aria-label="Contrast plate">
            {PLATES.map(([k, l]) => <button key={k} className="chip" aria-pressed={plate === k} onClick={() => setPlate(k)}>{l}</button>)}
          </div>
        </div>

        <div className="xt-row">
          <button className="btn grad sm" onClick={all} disabled={!!busy}>{busy === "all" ? "Rendering…" : `Download all ${BRAND_FMTS.length} (.zip)`}</button>
        </div>
        <p className="hint">Best spot follows each format&apos;s rules: away from your face on calls, clear of profile photos on banners, above the taskbar on desktops. Click any preview to download just that one.</p>
      </div>

      <div className="bk-grid" aria-busy={!!busy}>
        {BRAND_FMTS.map((f) => (
          <Preview key={f.id} p={p} f={f} logo={logo} o={o} onPick={() => !busy && one(f)} pw={f.h > f.w ? 110 : f.w / f.h >= 3 ? 300 : 230} />
        ))}
      </div>
    </div>
  );
}
