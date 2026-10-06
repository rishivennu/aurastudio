"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { render, GenParams } from "@/lib/engine";
import { PALETTES, STYLES, DEVICES } from "@/lib/presets";
import { exportWallpaper } from "@/lib/exporter";
import BatchTen from "./BatchTen";
import { extractPaletteFromFile } from "@/lib/palette";
import { decodeParams, shareUrl, isSaved, toggleSaved } from "@/lib/share";
import { publish, uploadThumb } from "@/lib/community";
import StudioExtras from "./StudioExtras";
import VibeBox from "./VibeBox";

const randSeed = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const grad = (cols: string[]) => `linear-gradient(135deg, ${cols.join(", ")})`;

export default function Studio() {
  const [params, setParams] = useState<GenParams>({
    seed: "GLASS01",
    styleId: "fluted",
    paletteId: "glacier",
    keywords: "soft light",
    text: "",
    intensity: 0.6,
    grainOn: false,
  });
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [device, setDevice] = useState(DEVICES[3]);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [busy, setBusy] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [palQuery, setPalQuery] = useState("");
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lockPreview, setLockPreview] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const [pubOpen, setPubOpen] = useState(false);
  const [pubTitle, setPubTitle] = useState("");
  const [remixOf, setRemixOf] = useState<string | null>(null);
  const [pubBusy, setPubBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const set = <K extends keyof GenParams>(k: K, v: GenParams[K]) =>
    setParams((p) => ({ ...p, [k]: v }));

  const pickPalette = (id: string) =>
    setParams((p) => ({ ...p, paletteId: id, customColors: undefined }));

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const cols = await extractPaletteFromFile(file, 5);
      setParams((p) => ({ ...p, customColors: cols }));
    } catch {}
    finally { setPhotoBusy(false); }
  };

  const clearCustom = () => setParams((p) => ({ ...p, customColors: undefined }));

  useEffect(() => {
    try {
      const qs = new URLSearchParams(location.search);
      const from = qs.get("from");
      if (from && /^[a-f0-9]{12}$/.test(from)) setRemixOf(from);
      const tok = qs.get("w");
      const shared = tok ? decodeParams(tok) : null;
      if (shared) { setParams(shared); return; }
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

  useEffect(() => { setSaved(isSaved(params)); }, [params]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!lockPreview) return;
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, [lockPreview]);

  const surprise = useCallback(() => {
    const st = STYLES[Math.floor(Math.random() * STYLES.length)];
    const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    setParams((p) => ({ ...p, styleId: st.id, paletteId: pal.id, customColors: undefined, seed: randSeed() }));
    setRemixOf(null);
  }, []);

  const onSave = () => {
    const on = toggleSaved(params);
    setSaved(on);
    setToast(on ? "Saved to your collection" : "Removed from saved");
  };

  const onShare = async () => {
    const url = shareUrl(params);
    uploadThumb(params);
    try { await navigator.clipboard.writeText(url); setToast("Share link copied"); }
    catch { window.prompt("Copy this link", url); }
  };

  const onPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPubBusy(true);
    try {
      const r = await publish(params, pubTitle, remixOf);
      if (r.ok && r.existed) { setToast("That exact wallpaper is already published. Change something to make it yours."); }
      else if (r.ok) { setToast(remixOf ? "Published as a remix" : "Published to the community"); setPubOpen(false); setPubTitle(""); setRemixOf(null); }
      else setToast(r.error || "Could not publish");
    } catch { setToast("Could not publish"); }
    finally { setPubBusy(false); }
  };

  // keyboard shortcuts: R = surprise me, S = shuffle seed (ignored while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "r") { e.preventDefault(); surprise(); }
      else if (k === "s") { e.preventDefault(); setParams((p) => ({ ...p, seed: randSeed() })); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [surprise]);

  const downloadCurrent = useCallback(async () => {
    setBusy(true);
    try { await exportWallpaper(params, device, format); } finally { setBusy(false); }
  }, [params, device, format]);

  const downloadPack = useCallback(async () => {
    setBusy(true);
    try {
      const { exportDevicesZip } = await import("@/lib/exporter");
      const r = await exportDevicesZip(params, DEVICES, format);
      setToast(r.skipped.length ? `Zipped ${r.ok} sizes. ${r.skipped.join(", ")} is too big for a zip; pick it and download on its own.` : `Zipped all ${r.ok} sizes`);
    } catch { setToast("Could not build the pack"); } finally { setBusy(false); }
  }, [params, format]);

  const palette = PALETTES.find((p) => p.id === params.paletteId) ?? PALETTES[0];
  const q = palQuery.trim().toLowerCase();
  const shownPals = q ? PALETTES.filter((p) => p.name.toLowerCase().includes(q)) : PALETTES;

  return (
    <>
      <VibeBox onPick={(p) => { setParams(p); setRemixOf(null); setToast("Loaded into the studio"); document.getElementById("generator")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
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
                <button key={p.id} className="pal-chip" role="option" aria-selected={!params.customColors && params.paletteId === p.id}
                  onClick={() => pickPalette(p.id)} title={p.name}>
                  <span className="pal-sw" style={{ background: grad(p.colors) }} />
                  <span className="pal-nm">{p.name}</span>
                </button>
              ))}
            </div>
            <div className="photo-row">
              <input ref={fileRef} type="file" accept="image/*" hidden
                onChange={(e) => onPhoto(e.target.files?.[0])} />
              <button className="btn ghost sm" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
                {photoBusy ? "Reading photo…" : "Extract from photo"}
              </button>
              {params.customColors && (
                <button className="btn ghost sm" onClick={clearCustom}>Clear custom</button>
              )}
            </div>
            <div className="swatches" aria-hidden="true">
              {(params.customColors ?? palette.colors).map((c, i) => <span key={i} className="sw" style={{ background: c }} />)}
            </div>
            {params.customColors && <div className="hint">Custom palette from your photo — pick any palette above to clear it.</div>}
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
            <label className="toggle"><input type="checkbox" checked={lockPreview}
              onChange={(e) => setLockPreview(e.target.checked)} /> Lock-screen preview</label>
          </div>
        </div>

        {/* ---- preview ---- */}
        <div className="preview-wrap">
          <div className="stage">
            <div className="lock-wrap">
              <canvas ref={canvasRef} className="preview" aria-label="Wallpaper preview" />
              {lockPreview && now && (
                <div className={`lock-ui ${device.h > device.w ? "is-tall" : "is-wide"}`} aria-hidden="true">
                  <div className="lock-date">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</div>
                  <div className="lock-time">{now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
                </div>
              )}
            </div>
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
          <button className="btn ghost" onClick={downloadPack} disabled={busy}>Device pack · {DEVICES.length}</button>
          <div className="act-row">
            <button className={`btn ghost sm save-btn ${saved ? "on" : ""}`} onClick={onSave} aria-pressed={saved}>
              <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
              {saved ? "Saved" : "Save"}
            </button>
            <button className="btn ghost sm" onClick={onShare}>
              <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Share
            </button>
            <button className="btn ghost sm" onClick={() => setPubOpen((v) => !v)} aria-expanded={pubOpen} aria-controls="pub-form">
              <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Publish
            </button>
          </div>
          {pubOpen && (
            <form id="pub-form" className="pub-form" onSubmit={onPublish}>
              <label className="lbl" htmlFor="pub-title">Title for the community gallery</label>
              <input id="pub-title" type="text" maxLength={40} value={pubTitle} onChange={(e) => setPubTitle(e.target.value)} placeholder="e.g. Midnight petals" autoFocus />
              <div className="row">
                <button type="submit" className="btn grad sm" disabled={pubBusy}>{pubBusy ? "Publishing…" : "Publish"}</button>
                <button type="button" className="btn ghost sm" onClick={() => setPubOpen(false)}>Cancel</button>
              </div>
              <div className="hint">Only the settings are shared (style, palette, seed), never a photo you used.</div>
              {remixOf && <div className="hint pub-remix">Publishes as a remix, linked to the original. <button type="button" className="linkbtn" onClick={() => setRemixOf(null)}>Publish as new instead</button></div>}
            </form>
          )}
          <button className="btn ghost" onClick={surprise}>Surprise me <kbd>R</kbd></button>
          <button className="btn ghost" onClick={() => set("seed", randSeed())}>Shuffle seed <kbd>S</kbd></button>
          <div className="hint">{device.name} · {device.w}×{device.h}, rendered full-res in your browser.</div>
        </div>
      </div>

      <StudioExtras params={params} notify={setToast} />

      <div style={{ marginTop: "clamp(60px,8vw,110px)" }}>
        <BatchTen base={params} device={device} format={format}
          onPick={(p) => setParams((prev) => ({ ...prev, paletteId: p.paletteId, seed: p.seed }))} />
      </div>
      <div className="toast" role="status" aria-live="polite">{toast && <span key={toast}>{toast}</span>}</div>
    </>
  );
}
