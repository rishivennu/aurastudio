"use client";
import { useEffect, useMemo, useState } from "react";
import { GenParams } from "@/lib/engine";
import Canvas from "./Canvas";
import Marquee from "./Marquee";
import ThemeToggle from "./ThemeToggle";
import { exportWallpaper } from "@/lib/exporter";
import { DEVICES, PALETTES } from "@/lib/presets";

const rnd = () => Math.random().toString(36).slice(2, 7).toUpperCase();

type Item = {
  label: string;
  cat: ("glass" | "soft" | "mesh" | "dark" | "pastel")[];
  rating: string;
  year: string;
  p: GenParams;
};

// Showcase set — drawn from the palette library, tagged for the chip filter.
const SHOW: Item[] = [
  { label: "Reeded Glacier",cat: ["glass", "dark"], rating: "9.4", year: "4K", p: { seed: "FLT2", styleId: "fluted",      paletteId: "glacier",        keywords: "soft light",    text: "", intensity: 0.6,  grainOn: false } },
  { label: "Ultraviolet",  cat: ["glass", "dark"], rating: "9.1", year: "4K", p: { seed: "UV4",  styleId: "liquid",      paletteId: "ultraviolet",    keywords: "neon flow",     text: "", intensity: 0.65, grainOn: false } },
  { label: "Candy Sky",    cat: ["mesh", "pastel"],rating: "8.8", year: "4K", p: { seed: "REF3", styleId: "mesh",        paletteId: "candy-sky",      keywords: "sunset bloom",  text: "", intensity: 0.75, grainOn: true } },
  { label: "Amethyst Jade",cat: ["mesh", "pastel"],rating: "8.6", year: "4K", p: { seed: "AJ1",  styleId: "mesh",        paletteId: "amethyst-jade",  keywords: "soft bleed",    text: "", intensity: 0.72, grainOn: true } },
  { label: "Indigo Dusk",  cat: ["soft", "dark"],  rating: "9.0", year: "4K", p: { seed: "REF1", styleId: "soft-linear", paletteId: "indigo-dusk",    keywords: "quiet dawn",    text: "", intensity: 0.7,  grainOn: true } },
  { label: "Amber Jungle", cat: ["soft", "dark"],  rating: "8.7", year: "4K", p: { seed: "AJ2",  styleId: "soft-linear", paletteId: "amber-jungle",   keywords: "deep forest",   text: "", intensity: 0.74, grainOn: true } },
  { label: "Gold Teal",    cat: ["soft", "dark"],  rating: "8.9", year: "4K", p: { seed: "GT1",  styleId: "soft-linear", paletteId: "gold-teal-deep", keywords: "liquid gold",   text: "", intensity: 0.78, grainOn: true } },
  { label: "Lemon Forest", cat: ["mesh", "pastel"],rating: "8.4", year: "4K", p: { seed: "LF1",  styleId: "mesh",        paletteId: "lemon-forest",   keywords: "spring haze",   text: "", intensity: 0.7,  grainOn: true } },
  { label: "Orchid Sea",   cat: ["soft", "pastel"],rating: "8.8", year: "4K", p: { seed: "OS1",  styleId: "soft-linear", paletteId: "orchid-sea",     keywords: "tide line",     text: "", intensity: 0.72, grainOn: true } },
  { label: "Clay Ember",   cat: ["soft", "dark"],  rating: "8.3", year: "4K", p: { seed: "CE1",  styleId: "soft-linear", paletteId: "clay-ember",     keywords: "kiln glow",     text: "", intensity: 0.78, grainOn: true } },
  { label: "Rose Quartz",  cat: ["mesh", "pastel"],rating: "8.6", year: "4K", p: { seed: "R1",   styleId: "mesh",        paletteId: "rose-quartz",    keywords: "soft bloom",    text: "", intensity: 0.7,  grainOn: true } },
];

const CATS: { id: Item["cat"][number] | "all"; label: string; icon: string }[] = [
  { id: "all",    label: "Trending", icon: "✦" },
  { id: "glass",  label: "Glass",    icon: "◉" },
  { id: "soft",   label: "Soft",     icon: "◗" },
  { id: "mesh",   label: "Mesh",     icon: "❖" },
  { id: "dark",   label: "Dark",     icon: "◐" },
  { id: "pastel", label: "Pastel",   icon: "❀" },
];

const DESKTOP = DEVICES.find((d) => d.id === "desktop")!;
function quickDownload(p: GenParams) { exportWallpaper(p, DESKTOP, "png"); }

function loadPreset(p: GenParams) {
  try { localStorage.setItem("aura_load", JSON.stringify(p)); } catch {}
  location.href = "/create";
}

export default function Shell() {
  const [cat, setCat] = useState<Item["cat"][number] | "all">("all");
  const [featSeed, setFeatSeed] = useState("REF4");
  const [fB, setFB] = useState("REF3");

  const pool = useMemo(
    () => (cat === "all" ? SHOW : SHOW.filter((s) => s.cat.includes(cat as any))),
    [cat]
  );
  const [shown, setShown] = useState<Item[]>(SHOW.slice(0, 6));
  const [swapped, setSwapped] = useState<number | null>(null);
  useEffect(() => { setShown(pool.slice(0, 6)); setSwapped(null); }, [pool]);

  // replace one poster with another from the same category not already shown
  const swapPoster = (index: number) => {
    setSwapped(index);
    setShown((cur) => {
      const used = new Set(cur.map((c) => c.label));
      const alt = pool.filter((pp) => !used.has(pp.label));
      if (alt.length === 0) return cur;
      const next = [...cur];
      next[index] = alt[Math.floor(Math.random() * alt.length)];
      return next;
    });
  };
  const catLabel = CATS.find((c) => c.id === cat)?.label ?? "Trending";
  const palColors = (id: string) => PALETTES.find((x) => x.id === id)?.colors ?? [];

  const featA: GenParams = { ...SHOW[0].p, seed: featSeed };
  const featB: GenParams = { ...SHOW[2].p, seed: fB };

  return (
    <header className="shell">
      <div className="shell-bg" aria-hidden="true" />

      {/* ---------- MOBILE (clean, playful) ---------- */}
      <div className="m-hero">
        <div className="wrap m-hero-body">
          <span className="m-kicker">Gradient wallpaper studio</span>
          <h1 className="m-title">Make your<br />screen <span className="serif">glow</span>.</h1>
          <p className="m-sub">Bold, grainy 4K gradients, rendered right in your browser. Nothing uploaded.</p>
          <div className="m-feature">
            <Canvas params={featA} w={720} h={1280} className="m-feature-canvas" ariaLabel="Featured wallpaper" />
          </div>
          <div className="m-cta">
            <a className="btn grad" href="/create">Generate yours</a>
            <button className="btn ghost" onClick={() => setFeatSeed(rnd())}>Shuffle ↻</button>
          </div>
          <div className="m-pop-head">Popular now</div>
          <div className="m-strip">
            {SHOW.slice(0, 6).map((it) => (
              <button key={it.label} className="m-strip-card" onClick={() => loadPreset(it.p)}>
                <Canvas params={it.p} w={300} h={420} className="m-strip-canvas" />
                <span className="m-strip-name">{it.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- DESKTOP (ref: streaming dashboard) ---------- */}
      <div className="wrap d-hero">
        <Marquee items={["AURA STUDIO", "BOLD GRADIENTS", "4K · NO UPLOAD", "CRAFTED IN YOUR BROWSER"]} />
        <div className="glass window flix">
          {/* top bar */}
          <div className="flix-top">
            <a href="/" className="flix-brand">
              <span className="flix-logo" aria-hidden="true" />
              aura<span className="brand-light">.studio</span>
            </a>
            <nav className="flix-nav" aria-label="Primary">
              <div className="flix-seg" role="tablist">
                <button className="seg active" role="tab" aria-selected="true">Wallpapers</button>
                <a className="seg" role="tab" href="#gallery">Palettes</a>
                <a className="seg" role="tab" href="/create">Studio</a>
                <a className="seg" role="tab" href="/explore">Explore</a>
              </div>
            </nav>
            <div className="flix-user">
              <a className="flix-icon" href="/create" aria-label="Search wallpapers">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg>
              </a>
              <ThemeToggle />
              <button className="flix-acct" aria-label="Account: aura.studio Pro, local workspace">
                <span className="flix-avatar" aria-hidden="true">
                  <span className="flix-avatar-glyph">a</span>
                  <i className="flix-dot" />
                </span>
                <span className="flix-acct-meta">
                  <b>aura.studio</b>
                  <small>Local workspace</small>
                </span>
                <span className="flix-pro" aria-hidden="true">PRO</span>
                <svg className="flix-caret" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
            </div>
          </div>

          {/* two featured cards */}
          <div className="flix-feat">
            <article className="feat-card">
              <Canvas params={featA} w={1120} h={560} className="feat-canvas" ariaLabel="Featured wallpaper one" />
              <div className="feat-shade" />
              <div className="feat-body">
                <span className="feat-badge">◉ Featured today</span>
                <h2 className="feat-title">The glow of<br /><span className="serif">Aura Bloom</span></h2>
                <div className="feat-meta"><span>Aura</span><i /><span>4K · 3840×2160</span><i /><span>No upload</span></div>
                <div className="feat-cta">
                  <button className="feat-play" onClick={() => loadPreset(featA)}>▸ Load into studio</button>
                  <button className="feat-dl" onClick={() => quickDownload(featA)} aria-label="Download 4K">↓ 4K</button>
                </div>
              </div>
              <button className="feat-shuffle" onClick={() => setFeatSeed(rnd())} aria-label="Shuffle this wallpaper">↻</button>
            </article>

            <article className="feat-card">
              <Canvas params={featB} w={1120} h={560} className="feat-canvas" ariaLabel="Featured wallpaper two" />
              <div className="feat-shade" />
              <div className="feat-body">
                <span className="feat-badge warm">✦ Fresh pick</span>
                <h2 className="feat-title">The bloom of<br /><span className="serif">Candy Sky</span></h2>
                <div className="feat-meta"><span>Mesh</span><i /><span>4K · 3840×2160</span><i /><span>Pastel</span></div>
                <div className="feat-cta">
                  <button className="feat-play" onClick={() => loadPreset(featB)}>▸ Load into studio</button>
                  <button className="feat-dl" onClick={() => quickDownload(featB)} aria-label="Download 4K">↓ 4K</button>
                </div>
              </div>
              <button className="feat-shuffle" onClick={() => setFB(rnd())} aria-label="Shuffle this wallpaper">↻</button>
            </article>
          </div>

          {/* category chip row */}
          <div className="flix-cats">
            <div className="cat-row" role="tablist" aria-label="Categories">
              {CATS.map((c) => (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={cat === c.id}
                  className={`cat-chip ${cat === c.id ? "active" : ""}`}
                  onClick={() => setCat(c.id)}
                >
                  <span className="cat-ico">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="cat-sort">
              <a className="sort-btn" href="#gallery" aria-label="Grid view">▦</a>
              <a className="sort-btn" href="/create" aria-label="Create">＋</a>
            </div>
          </div>

          {/* trending grid */}
          <div className="flix-sec-head">
            Trending in <span className="serif">{catLabel}</span>
          </div>
          <div className="flix-grid">
            {shown.map((s, i) => (
              <div key={s.label + i} className={`poster ${swapped === i ? "poster-swap" : ""}`} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="poster-art" role="button" tabIndex={0}
                  onClick={() => loadPreset(s.p)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loadPreset(s.p); } }}
                  aria-label={`Load ${s.label} into studio`}>
                  <Canvas params={s.p} w={360} h={520} className="poster-canvas" />
                  <span className="poster-play">▸</span>
                  <div className="poster-acts">
                    <button className="p-act" onClick={(e) => { e.stopPropagation(); swapPoster(i); }} aria-label={`Replace ${s.label} with another`} title="Replace">↻</button>
                    <button className="p-act" onClick={(e) => { e.stopPropagation(); quickDownload(s.p); }} aria-label={`Download ${s.label} in 4K`} title="Download 4K">↓</button>
                  </div>
                </div>
                <div className="poster-meta">
                  <b className="poster-name">{s.label}</b>
                  <span className="poster-sub">
                    <span className="pal-dots" aria-hidden="true">
                      {palColors(s.p.paletteId).slice(0, 4).map((c, j) => <i key={j} style={{ background: c }} />)}
                    </span>
                    <span className="star">★</span> {s.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
