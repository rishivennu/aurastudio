"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { render, GenParams } from "@/lib/engine";
import { PALETTES, STYLES, DEVICES } from "@/lib/presets";
import { exportWallpaper } from "@/lib/exporter";
import BatchTen from "./BatchTen";

const randSeed = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const grad = (cols: string[]) => `linear-gradient(135deg, ${cols.join(", ")})`;

export default function Studio() {
  const [params, setParams] = useState<GenParams>({
    seed: "AURA01",
    styleId: "aura",
    paletteId: "aura-bloom",
    keywords: "calm cosmic glow",
    text: "",
    intensity: 0.85,
    grainOn: true,
  });
  const [device, setDevice] = useState(DEVICES[3]);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [busy, setBusy] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [palQuery, setPalQuery] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const set = <K extends keyof GenParams>(k: K, v: GenParams[K]) =>
    setParams((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem("aura_load");
      if (raw) { setParams(JSON.parse(raw)); localStorage.removeItem("aura_load"); }
    } catch {}
  }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ar = device.w / device.h;
    const long = 640;
    let w = long, h = Math.round(long / ar);
    if (ar < 1) { h = long; w = Math.round(long * ar); }
    c.width = w; c.height = h;
    const ctx = c.getContext("2d"); if (!ctx) return;
    render(ctx, w, h, params);
  }, [params, device]);

  useEffect(() => { document.body.classList.toggle("rm", reduced); }, [reduced]);

  const downloadCurrent = useCallback(async () => {
    setBusy(true);
    try { await exportWallpaper(params, device, format); } finally { setBusy(false); }
  }, [params, device, format]);

  const downloadPack = useCallback(async () => {
    setBusy(true);
    try {
      for (const d of DEVICES) {
        await exportWallpaper(params, d, format);
        await new Promise((r) => setTimeout(r, 400));
      }
    } finally { setBusy(false); }
  }, [params, format]);

  const palette = PALETTES.find((p) => p.id === params.paletteId) ?? PALETTES[0];
  const q = palQuery.trim().toLowerCase();
  const shownPals = q ? PALETTES.filter((p) => p.name.toLowerCase().includes(q)) : PALETTES;

  return (
    <>
      <div className="gen" id="generator">
        {/* ---- controls ---- */}
        <div className="panel glass gen-panel" role="group" aria-label="Generator controls">
          <div className="field">
            <h4>Style</h4>
            <div className="style-seg">
              {STYLES.map((s) => (
                <button key={s.id} className="style-opt" aria-pressed={params.styleId === s.id}
                  onClick={() => set("styleId", s.id)} title={s.desc}>{s.name}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <div className="field-head">
              <h4>Palette</h4>
              <span className="field-count">{shownPals.length} / {PALETTES.length}</span>
            </div>
            <input className="pal-search" type="text" value={palQuery} placeholder="Search palettes…"
              onChange={(e) => setPalQuery(e.target.value)} aria-label="Search palettes" />
            <div className="pal-grid" role="listbox" aria-label="Palettes">
              {shownPals.map((p) => (
                <button key={p.id} className="pal-chip" role="option" aria-selected={params.paletteId === p.id}
                  onClick={() => set("paletteId", p.id)} title={p.name}>
                  <span className="pal-sw" style={{ background: grad(p.colors) }} />
                  <span className="pal-nm">{p.name}</span>
                </button>
              ))}
            </div>
            <div className="swatches" aria-hidden="true">
              {palette.colors.map((c, i) => <span key={i} className="sw" style={{ background: c }} />)}
            </div>
          </div>

          <div className="field">
            <label className="lbl" htmlFor="kw">Keywords</label>
            <input id="kw" type="text" value={params.keywords} placeholder="e.g. calm cosmic glow"
              onChange={(e) => set("keywords", e.target.value)} />
            <div className="hint">Nudges composition energy and placement.</div>
          </div>

          <div className="field">
            <label className="lbl" htmlFor="int">Glow intensity · {Math.round(params.intensity * 100)}%</label>
            <input id="int" type="range" min={0} max={1} step={0.01} value={params.intensity}
              onChange={(e) => set("intensity", parseFloat(e.target.value))} />
          </div>

          <div className="field">
            <label className="lbl" htmlFor="seed">Seed</label>
            <div className="row">
              <input id="seed" type="text" value={params.seed} style={{ flex: 1 }}
                onChange={(e) => set("seed", e.target.value)} />
              <button className="btn ghost sm" onClick={() => set("seed", randSeed())}>Shuffle</button>
            </div>
          </div>

          <div className="toggle-row">
            <label className="toggle"><input type="checkbox" checked={params.grainOn}
              onChange={(e) => set("grainOn", e.target.checked)} /> Film grain</label>
            <label className="toggle"><input type="checkbox" checked={reduced}
              onChange={(e) => setReduced(e.target.checked)} /> Reduce motion</label>
          </div>
        </div>

        {/* ---- preview ---- */}
        <div className="preview-wrap">
          <div className="stage">
            <canvas ref={canvasRef} className="preview" aria-label="Wallpaper preview" />
          </div>
          <div className="devrow">
            {DEVICES.map((d) => (
              <button key={d.id} className="chip" aria-pressed={device.id === d.id}
                onClick={() => setDevice(d)}>{d.name} · {d.w}×{d.h}</button>
            ))}
          </div>
        </div>

        {/* ---- export ---- */}
        <div className="actions glass gen-actions">
          <h4>Export</h4>
          <div className="seg-mini">
            <button className="style-opt" aria-pressed={format === "png"} onClick={() => setFormat("png")}>PNG</button>
            <button className="style-opt" aria-pressed={format === "jpeg"} onClick={() => setFormat("jpeg")}>JPEG</button>
          </div>
          <button className="btn grad" onClick={downloadCurrent} disabled={busy}>
            {busy ? "Rendering…" : `Download · ${format.toUpperCase()}`}
          </button>
          <button className="btn ghost" onClick={downloadPack} disabled={busy}>Device pack · 4</button>
          <button className="btn ghost" onClick={() => set("seed", randSeed())}>Shuffle seed</button>
          <div className="hint">{device.name} · {device.w}×{device.h}, rendered full-res in your browser. Nothing is uploaded.</div>
        </div>
      </div>

      <div style={{ marginTop: "clamp(60px,8vw,110px)" }}>
        <BatchTen base={params} device={device} format={format}
          onPick={(p) => setParams((prev) => ({ ...prev, paletteId: p.paletteId, seed: p.seed }))} />
      </div>
    </>
  );
}
