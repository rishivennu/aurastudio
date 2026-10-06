"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Canvas from "@/components/Canvas";
import LiveCanvas from "@/components/LiveCanvas";
import { GenParams } from "@/lib/engine";
import { PALETTES, STYLES, DEVICES } from "@/lib/presets";
import { encodeParams } from "@/lib/share";
import { exportWallpaper } from "@/lib/exporter";

const PHONE = DEVICES.find((d) => d.id === "phone")!;
const STEP = 3800;

const mk = (styleId: GenParams["styleId"], paletteId: string, seed: string, title: string, intensity = 0.75) =>
  ({ title, p: { seed, styleId, paletteId, keywords: title.toLowerCase(), text: "", intensity, grainOn: true } as GenParams });

const SLIDES = [
  mk("bloom", "neon-fuchsia", "SPOT1", "Neon petals"),
  mk("ribbon", "violet-aqua", "SPOT2", "Liquid metal"),
  mk("horizon", "canyon-dusk", "SPOT3", "Last light"),
  mk("panes", "azure-fuchsia", "SPOT4", "Glass stack"),
  mk("aurora", "cyan-abyss", "SPOT5", "Northern hush"),
  mk("arches", "clay-ember", "SPOT6", "Terracotta arcs"),
  mk("flux", "lime-noir", "SPOT7", "Static charge"),
  mk("iridescent", "orchid-sea", "SPOT8", "Oil slick"),
];

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function Spotlight() {
  const [idx, setIdx] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0, 1]));
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const now = useClock();

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(m.matches);
    on(); m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const go = useCallback((n: number) => {
    const next = (n + SLIDES.length) % SLIDES.length;
    setIdx(next);
    setSeen((s) => {
      const nx = (next + 1) % SLIDES.length;
      if (s.has(next) && s.has(nx)) return s;
      const c = new Set(s); c.add(next); c.add(nx); return c;
    });
  }, []);

  const playing = !paused && !reduced && inView;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => go(idx + 1), STEP);
    return () => clearTimeout(t);
  }, [playing, idx, go]);

  const cur = SLIDES[idx];
  const style = STYLES.find((s) => s.id === cur.p.styleId);
  const pal = PALETTES.find((p) => p.id === cur.p.paletteId);
  const time = now ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "") : "9:41";
  const date = now ? now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) : "";

  const download = async () => {
    setBusy(true);
    try { await exportWallpaper(cur.p, PHONE, "png"); } finally { setBusy(false); }
  };

  return (
    <section id="spotlight" ref={ref} className="section spotlight" aria-roledescription="carousel" aria-label="Spotlight wallpapers">
      <div className="wrap spot-grid">
        <div className="spot-stage"
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
          <div className="spot-glow" style={{ background: `radial-gradient(closest-side, ${pal?.colors[1] || "#7c5cff"}, transparent)` }} aria-hidden="true" />
          <div className="spot-phone">
            <div className="spot-screen">
              {SLIDES.map((s, i) => seen.has(i) && (
                <div key={i} className={`spot-slide ${i === idx ? "on" : ""}`} aria-hidden={i !== idx}>
                  {i === idx
                    ? <LiveCanvas params={s.p} w={360} h={780} playing={!reduced && inView} seconds={10} ariaLabel={`${s.title} wallpaper`} />
                    : <Canvas params={s.p} w={360} h={780} />}
                </div>
              ))}
              <div className="spot-lock" aria-hidden="true">
                <div className="spot-island" />
                <div className="lock-date">{date}</div>
                <div className="lock-time">{time}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="spot-copy">
          <span className="kicker">Spotlight</span>
          <h2 className="display">On your lock screen.</h2>
          <p className="lead">A rotating pick of fresh looks, shown the way you will actually see them. Hover to hold one, or step through yourself.</p>

          <div className="spot-meta" aria-live="polite">
            <span className="spot-num">{String(idx + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}</span>
            <h3 className="spot-title">{cur.title}</h3>
            <p className="spot-sub">{style?.name} style · {pal?.name} palette</p>
            {pal && <div className="spot-sw" aria-label={`Palette colours: ${pal.colors.join(", ")}`}>{pal.colors.map((c) => <i key={c} style={{ background: c }} />)}</div>}
          </div>

          <div className="spot-bars" role="tablist" aria-label="Choose wallpaper">
            {SLIDES.map((s, i) => (
              <button key={i} role="tab" aria-selected={i === idx} aria-label={`Show ${s.title}`}
                className={`spot-bar ${i === idx ? "on" : ""} ${i < idx ? "done" : ""}`} onClick={() => go(i)}>
                <span style={{ animationDuration: `${STEP}ms`, animationPlayState: playing ? "running" : "paused" }} key={i === idx ? `a${idx}` : `s${i}`} />
              </button>
            ))}
          </div>

          <div className="spot-actions">
            <button className="spot-nav" onClick={() => go(idx - 1)} aria-label="Previous wallpaper">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button className="spot-nav" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play" : "Pause"} aria-pressed={paused}>
              {paused || reduced
                ? <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="7 4 20 12 7 20" /></svg>
                : <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>}
            </button>
            <button className="spot-nav" onClick={() => go(idx + 1)} aria-label="Next wallpaper">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <a className="btn grad sm" href={`/create?w=${encodeParams(cur.p)}`}>Open in studio</a>
            <button className="btn ghost sm" onClick={download} disabled={busy}>{busy ? "Rendering…" : "Download for phone"}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
