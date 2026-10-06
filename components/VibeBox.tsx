"use client";
import { useState } from "react";
import Canvas from "./Canvas";
import { GenParams } from "@/lib/engine";
import { PALETTES, STYLES } from "@/lib/presets";
import type { VibePick } from "@/lib/vibe";

const IDEAS = ["rainy Tokyo at 2am", "sunday morning coffee", "deep sea bioluminescence", "desert road trip", "cyberpunk arcade", "first snow in the mountains"];

export default function VibeBox({ onPick }: { onPick: (p: GenParams) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [picks, setPicks] = useState<VibePick[] | null>(null);
  const [src, setSrc] = useState("");
  const [err, setErr] = useState("");

  const ask = async (text = q) => {
    const t = text.trim(); if (t.length < 2) return;
    setQ(t); setBusy(true); setErr("");
    try {
      const r = await fetch("/api/vibe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: t }) });
      const j = await r.json();
      if (!j.ok) { setErr(j.error || "Something went wrong."); return; }
      setPicks(j.picks); setSrc(j.source);
    } catch { setErr("Could not reach the server. Check your connection."); }
    finally { setBusy(false); }
  };

  return (
    <section className="vibe glass" aria-label="Describe a vibe">
      <form className="vibe-form" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <label htmlFor="vibe-q" className="vibe-lbl">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z" /><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></svg>
          Describe a vibe
        </label>
        <div className="vibe-row">
          <input id="vibe-q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={160} placeholder="e.g. rainy Tokyo at 2am" autoComplete="off" />
          <button className="btn grad" type="submit" disabled={busy || q.trim().length < 2}>{busy ? "Thinking…" : "Make three"}</button>
        </div>
        <div className="vibe-ideas" aria-label="Try an idea">
          {IDEAS.map((i) => <button key={i} type="button" className="chip" onClick={() => ask(i)} disabled={busy}>{i}</button>)}
        </div>
      </form>

      {err && <p className="vibe-err" role="alert">{err}</p>}
      {busy && !picks && <div className="vibe-grid" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="vibe-card cm-skel" />)}</div>}
      {picks && (
        <>
          <div className={`vibe-grid ${busy ? "is-busy" : ""}`} aria-live="polite">
            {picks.map((p, i) => {
              const st = STYLES.find((s) => s.id === p.params.styleId)?.name;
              const pal = PALETTES.find((x) => x.id === p.params.paletteId)?.name;
              return (
                <button key={i + p.params.seed} className="vibe-card" onClick={() => onPick(p.params)} aria-label={`Use ${p.title}: ${st} style, ${pal} palette`}>
                  <Canvas params={p.params} w={360} h={220} />
                  <span className="vibe-t">{p.title}</span>
                  <span className="vibe-m">{st} · {pal}</span>
                  {p.why && <span className="vibe-w">{p.why}</span>}
                  <span className="vibe-use">Use this</span>
                </button>
              );
            })}
          </div>
          <p className="hint">{src === "ai" ? "Picked by AI from the aura styles and palettes." : src === "limit" ? "Daily AI limit reached, so these were matched offline." : "Matched offline from your words."} Tap one to load it into the studio.</p>
        </>
      )}
    </section>
  );
}
