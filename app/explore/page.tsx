"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { render, GenParams } from "@/lib/engine";
import { PALETTES, STYLES, DEVICES, StyleId } from "@/lib/presets";
import { exportWallpaper, exportBatchZip } from "@/lib/exporter";
import { hashSeed, mulberry32 } from "@/lib/prng";
import Nav from "@/components/Nav";

const PHONE = DEVICES.find((d) => d.id === "phone")!;
const DESKTOP = DEVICES.find((d) => d.id === "desktop")!;
const RATIOS: [number, number][] = [[300, 420], [300, 300], [300, 520], [300, 380], [300, 460]];
const KW: Record<string, string> = {
  "fluted": "soft light", "liquid": "flow", "dotfield": "wave field",
  "ridges": "misty hills", "mesh": "soft bloom", "soft-linear": "quiet dawn",
};
const PAGE = 28;        // first batch
const STEP = 20;        // appended per scroll

const RECENT_ORDER: StyleId[] = ["nebula", "ripple", "mosaic", "kaleido", "iridescent", "vortex", "halftone", "marble", "silk", "metaballs", "voronoi", "sunburst", "bokeh", "plasma", "topo", "meshgrid", "aurora", "fluted", "liquid", "dotfield", "ridges", "mesh", "soft-linear"];
const TRENDING_ORDER: StyleId[] = ["iridescent", "aurora", "nebula", "mesh", "liquid", "kaleido", "voronoi", "ripple", "meshgrid", "vortex", "fluted", "metaballs", "mosaic", "marble", "plasma", "sunburst", "halftone", "silk", "topo", "bokeh", "dotfield", "ridges", "soft-linear"];
const rankIn = (order: StyleId[], sid: StyleId) => { const i = order.indexOf(sid); return i < 0 ? 999 : i; };
const styleName = (sid: StyleId) => STYLES.find((s) => s.id === sid)?.name ?? sid;

type Mode = "all" | "trending" | "recent";
type Card = { p: GenParams; label: string; w: number; h: number };

// Full deterministic pool: every palette x every style, shuffled. ~1000 cards,
// revealed incrementally so the wall feels endless.
function buildPool(shuffle: string): Card[] {
  const r = mulberry32(hashSeed(shuffle));
  const out: Card[] = [];
  for (const pal of PALETTES) {
    for (const st of STYLES) {
      const [w, h] = RATIOS[Math.floor(r() * RATIOS.length)];
      out.push({
        label: pal.name, w, h,
        p: { seed: (pal.id + st.id + shuffle).slice(0, 8).toUpperCase(), styleId: st.id,
             paletteId: pal.id, keywords: KW[st.id] || "", text: "", intensity: 0.6 + r() * 0.3,
             grainOn: st.id === "mesh" || st.id === "soft-linear" || st.id === "ridges" },
      });
    }
  }
  return out.sort(() => r() - 0.5);
}

function LazyCard({ c, onPick, onDownload }: { c: Card; onPick: () => void; onDownload: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [seen, setSeen] = useState(false);
  const [dl, setDl] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { setSeen(true); io.disconnect(); }
    }, { rootMargin: "500px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!seen) return;
    const el = ref.current; if (!el) return;
    el.width = c.w; el.height = c.h;
    const ctx = el.getContext("2d"); if (!ctx) return;
    render(ctx, c.w, c.h, c.p);
  }, [seen, c]);
  const download = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dl) return;
    setDl(true);
    try { await onDownload(); } finally { setTimeout(() => setDl(false), 400); }
  };
  return (
    <div className="mz-card" role="button" tabIndex={0} onClick={onPick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(); } }}
      aria-label={`${c.label}, ${styleName(c.p.styleId)} — open in studio`}>
      <canvas ref={ref} style={{ aspectRatio: `${c.w} / ${c.h}` }} />
      <span className="mz-tag">{c.label}</span>
      <span className="mz-style">{styleName(c.p.styleId)}</span>
      <button className="mz-dl" onClick={download} disabled={dl}
        aria-label={`Download ${c.label} in 4K`} title="Download 4K">
        {dl ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><polyline points="7 10 12 15 17 10" /><path d="M5 21h14" /></svg>
        )}
      </button>
    </div>
  );
}

export default function Explore() {
  const [shuffle, setShuffle] = useState("WALL1");
  const [filter, setFilter] = useState<StyleId | "all">("all");
  const [mode, setMode] = useState<Mode>("trending");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 640px)");
    const on = () => setNarrow(m.matches);
    on(); m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const chipLimit = narrow ? 5 : 9;
  const chipStyles = useMemo(() => {
    if (showAll) return STYLES;
    const head = STYLES.slice(0, chipLimit);
    const sel = STYLES.find((s) => s.id === filter);
    return sel && !head.includes(sel) ? [...head, sel] : head;
  }, [showAll, chipLimit, filter]);
  const hiddenCount = STYLES.length - chipStyles.length;
  const [visible, setVisible] = useState(PAGE);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  const sentinel = useRef<HTMLDivElement>(null);
  const pool = useMemo(() => buildPool(shuffle), [shuffle]);

  const shown = useMemo(() => {
    let list = filter === "all" ? pool : pool.filter((c) => c.p.styleId === filter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((c) => c.label.toLowerCase().includes(q) || styleName(c.p.styleId).toLowerCase().includes(q));
    if (mode === "recent") list = [...list].sort((a, b) => rankIn(RECENT_ORDER, a.p.styleId) - rankIn(RECENT_ORDER, b.p.styleId));
    else if (mode === "trending") list = [...list].sort((a, b) => rankIn(TRENDING_ORDER, a.p.styleId) - rankIn(TRENDING_ORDER, b.p.styleId));
    return list;
  }, [pool, filter, mode, query]);

  // reset the window whenever the result set changes
  useEffect(() => { setVisible(PAGE); }, [filter, mode, query, shuffle]);

  // infinite scroll: grow the window when the sentinel scrolls into view
  useEffect(() => {
    const el = sentinel.current; if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) setVisible((v) => (v < shown.length ? Math.min(shown.length, v + STEP) : v));
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown.length]);

  const loadPreset = (p: GenParams) => {
    try { localStorage.setItem("aura_load", JSON.stringify(p)); } catch {}
    location.href = "/create";
  };

  const random10 = async () => {
    setBusy(true); setProg(0);
    const r = mulberry32(hashSeed(shuffle + Date.now()));
    const picks = [...shown].sort(() => r() - 0.5).slice(0, 10).map((c) => c.p);
    try { await exportBatchZip(picks, PHONE, "png", (d) => setProg(d)); }
    catch { for (const p of picks) { await exportWallpaper(p, PHONE, "png"); await new Promise((rr) => setTimeout(rr, 250)); } }
    setBusy(false);
  };

  const slice = shown.slice(0, visible);
  const more = visible < shown.length;

  return (
    <>
      <Nav />
      <main className="explore">
        <div className="wrap">
          <span className="kicker">Explore</span>
          <h1 className="display">Find one you love.</h1>
          <p className="lead">An endless wall of wallpapers across every style and palette. Search by name, sort by what&apos;s trending or newest, keep scrolling for more, tap one to open it in the studio, or download any in 4K.</p>
          <div className="ex-bar">
            <div className="ex-top">
              <label className="ex-search">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search styles & palettes…" aria-label="Search wallpapers" />
                {query && <button className="ex-clear" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
              </label>
              <div className="ex-modes" role="group" aria-label="Sort">
                {(["trending", "recent", "all"] as Mode[]).map((m) => (
                  <button key={m} aria-pressed={mode === m} className={`ex-mode ${mode === m ? "active" : ""}`} onClick={() => setMode(m)}>
                    {m === "trending" ? "Trending" : m === "recent" ? "Recent" : "All"}
                  </button>
                ))}
              </div>
            </div>
            <div className="ex-chips" id="ex-chips">
              <button className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All styles</button>
              {chipStyles.map((s) => (
                <button key={s.id} className="chip" aria-pressed={filter === s.id} onClick={() => setFilter(s.id)}>{s.name}</button>
              ))}
              {(showAll || hiddenCount > 0) && (
                <button className="chip chip-more" aria-expanded={showAll} aria-controls="ex-chips" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Show less" : `Show more (+${hiddenCount})`}
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ transform: showAll ? "rotate(180deg)" : "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                </button>
              )}
            </div>
            <div className="row">
              <span className="ex-count">{shown.length} wallpaper{shown.length === 1 ? "" : "s"}</span>
              <button className="btn ghost sm" onClick={() => setShuffle(Math.random().toString(36).slice(2, 7).toUpperCase())}>Reshuffle</button>
              <button className="btn grad sm" onClick={random10} disabled={busy || shown.length === 0}>
                {busy ? `Zipping ${prog}/10…` : "Download 10 random (.zip)"}
              </button>
            </div>
          </div>
        </div>
        <div className="wrap">
          {shown.length === 0 ? (
            <p className="ex-empty">No wallpapers match “{query}”. Try another word or clear the search.</p>
          ) : (
            <>
              <div className="masonry">
                {slice.map((c, i) => (
                  <div className="masonry-item" key={`${shuffle}-${i}-${c.p.paletteId}-${c.p.styleId}`}>
                    <LazyCard c={c} onPick={() => loadPreset(c.p)} onDownload={() => exportWallpaper(c.p, DESKTOP, "png")} />
                  </div>
                ))}
              </div>
              <div ref={sentinel} className="ex-sentinel" aria-hidden="true">
                {more && <span className="ex-spinner" />}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
