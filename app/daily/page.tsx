"use client";
import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import Canvas from "@/components/Canvas";
import Subscribe from "@/components/Subscribe";
import AutoDaily from "@/components/AutoDaily";
import LiveCanvas from "@/components/LiveCanvas";
import { dailyParams, dayKey, touchStreak } from "@/lib/daily";
import { PALETTES, STYLES, DEVICES } from "@/lib/presets";
import { exportWallpaper } from "@/lib/exporter";
import { encodeParams, isSaved, toggleSaved } from "@/lib/share";

const PHONE = DEVICES.find((d) => d.id === "phone")!;
const DESK = DEVICES.find((d) => d.id === "desktop")!;
const two = (n: number) => String(n).padStart(2, "0");

export default function Daily() {
  const [today, setToday] = useState<Date | null>(null);
  const [view, setView] = useState(0);
  const [left, setLeft] = useState("");
  const [streak, setStreak] = useState(1);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState("");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const d = new Date(); setToday(d); setStreak(touchStreak(d));
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      if (today && dayKey(n) !== dayKey(today)) { setToday(n); setView(0); setStreak(touchStreak(n)); }
      const m = new Date(n); m.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((m.getTime() - n.getTime()) / 1000));
      setLeft(`${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`);
    };
    tick(); const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [today]);

  const days = useMemo(() => {
    if (!today) return [];
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - i); return { d, p: dailyParams(d) }; });
  }, [today]);

  const cur = days[view];
  useEffect(() => { if (cur) setSaved(isSaved(cur.p)); }, [cur]);
  if (!cur) return (<><Nav /><main className="create daily"><div className="wrap"><span className="kicker">Daily drop</span><h1 className="display">Loading today…</h1></div></main></>);

  const style = STYLES.find((s) => s.id === cur.p.styleId)?.name;
  const pal = PALETTES.find((x) => x.id === cur.p.paletteId);
  const when = view === 0 ? "Today" : view === 1 ? "Yesterday" : cur.d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
  const dl = async (dev: typeof PHONE) => { setBusy(dev.id); try { await exportWallpaper(cur.p, dev, "png"); } finally { setBusy(""); } };

  return (
    <>
      <Nav />
      <main className="create daily">
        <div className="wrap">
          <span className="kicker">Daily drop</span>
          <h1 className="display">One new wallpaper, every day.</h1>
          <p className="lead">Everyone gets the same one today. Tomorrow it changes, and today&apos;s is gone from the front page.</p>

          <div className="dl-grid">
            <div className="dl-stage">
              <div className="spot-phone dl-phone">
                <div className="spot-screen">
                  <LiveCanvas key={dayKey(cur.d)} params={cur.p} w={360} h={780} playing={!reduced} ariaLabel={`${when}'s wallpaper`} />
                </div>
              </div>
              <div className="dl-desk" aria-hidden="true"><Canvas params={cur.p} w={480} h={270} /></div>
            </div>

            <div className="dl-copy">
              <div className="dl-when">{when} · {cur.d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</div>
              <h2 className="dl-title">{style} in {pal?.name}</h2>
              {pal && <div className="spot-sw" aria-label={`Palette colours: ${pal.colors.join(", ")}`}>{pal.colors.map((c) => <i key={c} style={{ background: c }} />)}</div>}

              <div className="dl-stats">
                <div><span className="dl-big" aria-live="off">{left}</span><span className="dl-small">until the next drop</span></div>
                <div><span className="dl-big">{streak}</span><span className="dl-small">day streak{streak > 1 ? ", keep it going" : ", come back tomorrow"}</span></div>
              </div>

              <div className="spot-actions">
                <button className="btn grad sm" onClick={() => dl(PHONE)} disabled={!!busy}>{busy === "phone" ? "Rendering…" : "Download for phone"}</button>
                <button className="btn ghost sm" onClick={() => dl(DESK)} disabled={!!busy}>{busy === "desktop" ? "Rendering…" : "Download 4K desktop"}</button>
                <button className={`btn ghost sm save-btn ${saved ? "on" : ""}`} aria-pressed={saved} onClick={() => setSaved(toggleSaved(cur.p))}>{saved ? "Saved" : "Save"}</button>
                <a className="btn ghost sm" href={`/create?w=${encodeParams(cur.p)}`}>Remix in studio</a>
              </div>
            </div>
          </div>

          <h3 className="dl-h3">This week</h3>
          <div className="dl-week" role="group" aria-label="Past drops">
            {days.map((x, i) => (
              <button key={dayKey(x.d)} aria-pressed={i === view} className={`dl-day ${i === view ? "on" : ""}`} onClick={() => setView(i)}
                aria-label={`${i === 0 ? "Today" : x.d.toLocaleDateString(undefined, { weekday: "long" })}: ${STYLES.find((s) => s.id === x.p.styleId)?.name}`}>
                <Canvas params={x.p} w={120} h={260} />
                <span>{i === 0 ? "Today" : x.d.toLocaleDateString(undefined, { weekday: "short" })}</span>
              </button>
            ))}
          </div>
          <AutoDaily />
          <Subscribe />
        </div>
      </main>
    </>
  );
}
