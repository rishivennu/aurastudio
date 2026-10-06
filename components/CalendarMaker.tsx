"use client";
import { useEffect, useRef, useState } from "react";
import { GenParams, resolveColors } from "@/lib/engine";
import { OvMode, OvFont, OvOpts, renderOverlay, overlayBlob, ensureFonts, safeZone } from "@/lib/overlay";
import { downloadBlob } from "@/lib/exporter";
import { lumHex } from "@/lib/color";

const OUT = [
  { id: "phone", name: "Phone", w: 1290, h: 2796 },
  { id: "desktop", name: "Desktop 4K", w: 3840, h: 2160 },
];
const MODES: [OvMode, string][] = [["calendar", "Month calendar"], ["goals", "Goals list"], ["quote", "Quote or name"]];
const FONTS: [OvFont, string][] = [["display", "Grotesk"], ["serif", "Serif italic"], ["mono", "Mono"]];

export default function CalendarMaker({ params, notify }: { params: GenParams; notify: (m: string) => void }) {
  const now = new Date();
  const [mode, setMode] = useState<OvMode>("calendar");
  const [font, setFont] = useState<OvFont>("display");
  const [offset, setOffset] = useState(0);
  const [mondayFirst, setMondayFirst] = useState(true);
  const [title, setTitle] = useState(String(now.getFullYear()) + " goals");
  const [body, setBody] = useState("");
  const [who, setWho] = useState("");
  const [card, setCard] = useState(true);
  const [place, setPlace] = useState<OvOpts["place"]>("middle");
  const [out, setOut] = useState(OUT[0]);
  const [guides, setGuides] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);

  const colors = resolveColors(params);
  const lum = lumHex;
  const accent = [...colors].sort((a, b) => Math.abs(lum(b) - 0.55) - Math.abs(lum(a) - 0.55)).pop() || colors[0];
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const opts: OvOpts = { mode, font, month, today: now, mondayFirst, title: mode === "quote" ? who : title, body, card, place };

  useEffect(() => { ensureFonts().then(() => setFontsReady(true)); }, []);
  const [vw, setVw] = useState(1200);
  useEffect(() => { const f = () => setVw(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  const pw = out.h > out.w ? 240 : Math.max(240, Math.min(440, vw - 90));
  const ph = Math.round(pw * out.h / out.w);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const id = requestAnimationFrame(() => {
      c.width = pw * 2; c.height = ph * 2;
      renderOverlay(c.getContext("2d")!, c.width, c.height, params, opts, accent);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, mode, font, offset, mondayFirst, title, who, body, card, place, out, fontsReady, pw, ph, accent]);

  const z = safeZone(pw, ph, place);
  const save = async () => {
    setBusy(true);
    try {
      const b = await overlayBlob(params, opts, accent, out.w, out.h);
      downloadBlob(b, `aura_${mode}_${params.seed}_${out.w}x${out.h}.png`);
      notify("Wallpaper downloaded");
    } catch { notify("Export failed. Try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="xt-body xt-pair">
      <div className="cal-stage" style={{ width: pw, height: ph }}>
        <canvas ref={ref} className="cal-c" style={{ width: pw, height: ph }} role="img" aria-label={`Preview: ${MODES.find((m) => m[0] === mode)?.[1]} on your wallpaper`} />
        {guides && (
          out.h > out.w ? (<>
            <span className="cal-g cal-g-clock" style={{ top: ph * 0.08, height: ph * 0.22 }}>clock and widgets</span>
            <span className="cal-g cal-g-dock" style={{ bottom: ph * 0.03, height: ph * 0.09 }}>torch, camera, dock</span>
          </>) : (<>
            <span className="cal-g cal-g-icons" style={{ width: pw * 0.18 }}>desktop icons</span>
            <span className="cal-g cal-g-dock" style={{ bottom: 0, height: ph * 0.07 }}>taskbar</span>
          </>)
        )}
        {guides && <span className="cal-zone" style={{ left: z.x, top: z.y, width: z.w, height: z.h }} aria-hidden="true" />}
      </div>
      <div className="xt-side">
        <p className="xt-lead">A month calendar, your goals or a line you want to see every day, set on this wallpaper and kept clear of the lock-screen clock, widgets and dock.</p>
        <div className="xt-row" role="group" aria-label="What to show">
          {MODES.map(([k, l]) => <button key={k} className="chip" aria-pressed={mode === k} onClick={() => setMode(k)}>{l}</button>)}
        </div>
        {mode === "calendar" && (
          <div className="xt-row" role="group" aria-label="Month">
            <button className="chip" onClick={() => setOffset((v) => v - 1)} aria-label="Previous month">‹</button>
            <span className="cal-month">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
            <button className="chip" onClick={() => setOffset((v) => v + 1)} aria-label="Next month">›</button>
            <button className="chip" aria-pressed={mondayFirst} onClick={() => setMondayFirst((v) => !v)}>Week starts Monday</button>
          </div>
        )}
        {mode !== "calendar" && (
          <>
            <label className="lbl" htmlFor="cal-t">{mode === "goals" ? "Heading" : "Name or attribution (optional)"}</label>
            <input id="cal-t" className="cal-in" value={mode === "quote" ? who : title} onChange={(e) => (mode === "quote" ? setWho : setTitle)(e.target.value)} maxLength={40} />
          </>
        )}
        <label className="lbl" htmlFor="cal-b">{mode === "calendar" ? "A line under the calendar (optional)" : mode === "goals" ? "Goals, one per line (up to 8)" : "Quote"}</label>
        <textarea id="cal-b" className="cal-in" rows={mode === "goals" ? 5 : 3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={mode === "goals" ? 400 : 200}
          placeholder={mode === "goals" ? "Read 12 books\nRun a half marathon\nShip the side project" : mode === "quote" ? "Make it simple, but significant." : "e.g. One day at a time"} />
        <div className="xt-row" role="group" aria-label="Font">
          {FONTS.map(([k, l]) => <button key={k} className="chip" aria-pressed={font === k} onClick={() => setFont(k)}>{l}</button>)}
        </div>
        <div className="xt-row" role="group" aria-label="Layout">
          <button className="chip" aria-pressed={place === "middle"} onClick={() => setPlace("middle")}>Centre</button>
          <button className="chip" aria-pressed={place === "lower"} onClick={() => setPlace("lower")}>Lower</button>
          <button className="chip" aria-pressed={card} onClick={() => setCard((v) => !v)}>Glass card</button>
          <button className="chip" aria-pressed={guides} onClick={() => setGuides((v) => !v)}>Show safe zones</button>
        </div>
        <div className="xt-row" role="group" aria-label="Output size">
          {OUT.map((o) => <button key={o.id} className="chip" aria-pressed={out.id === o.id} onClick={() => setOut(o)}>{o.name} · {o.w}×{o.h}</button>)}
        </div>
        <div className="xt-row"><button className="btn grad sm" onClick={save} disabled={busy}>{busy ? "Rendering…" : "Download wallpaper"}</button></div>
        <p className="hint">The dashed box is where text sits safely. Guides are only in the preview, never in the file.</p>
      </div>
    </div>
  );
}
