"use client";
import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import { PALETTES } from "@/lib/presets";
import Footer from "@/components/Footer";

const MODES = [
  { id: "blobs", name: "Glow blobs" }, { id: "mesh", name: "Soft mesh" }, { id: "aurora", name: "Aurora" },
] as const;

export default function Embed() {
  const [pal, setPal] = useState(PALETTES[0].id);
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("blobs");
  const [speed, setSpeed] = useState(1);
  const [grain, setGrain] = useState(true);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");
  useEffect(() => {
    setOrigin(location.origin);
    const q = new URLSearchParams(location.search).get("p");
    if (q && PALETTES.some((p) => p.id === q)) setPal(q);
  }, []);
  const p = PALETTES.find((x) => x.id === pal)!;

  const attrs = `data-colors="${p.colors.join(",")}" data-style="${mode}" data-speed="${speed}"${grain ? ' data-grain="1"' : ""}`;
  const snippet = `<script src="${origin}/embed.js" ${attrs} defer></script>`;
  const fallback = `body { background: ${[...p.colors].reverse()[0]} linear-gradient(135deg, ${p.colors.join(", ")}) fixed; }`;
  const doc = useMemo(() => origin ? `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:600 15px/1.4 system-ui,sans-serif;color:#fff}h1{font-size:32px;margin:0 0 6px;letter-spacing:-.02em}.c{padding:24px 28px;border-radius:20px;background:rgba(0,0,0,.28);backdrop-filter:blur(10px);text-align:center;max-width:80%}</style></head><body><div class="c"><h1>Your site here</h1>Content sits on top. The background moves behind it.</div><script src="${origin}/embed.js" ${attrs}></script></body></html>` : "", [origin, attrs]);

  const copy = async (txt: string, what: string) => { try { await navigator.clipboard.writeText(txt); setCopied(what); setTimeout(() => setCopied(""), 1600); } catch {} };

  return (
    <>
      <Nav />
      <main className="create embed">
        <div className="wrap">
          <span className="kicker">Website background</span>
          <h1 className="display">One line. A living background.</h1>
          <p className="lead">Paste a single script tag into any site and it paints a slow, animated aura behind your content. About 7 KB, no dependencies, pauses when the tab is hidden and stays still for people who prefer reduced motion.</p>

          <div className="em-grid">
            <div className="em-ctl glass">
              <label className="lbl" htmlFor="em-pal">Palette</label>
              <select id="em-pal" className="ad-sel" value={pal} onChange={(e) => setPal(e.target.value)}>
                {PALETTES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <div className="spot-sw" aria-hidden="true">{p.colors.map((c) => <i key={c} style={{ background: c }} />)}</div>

              <span className="lbl" id="em-mode">Motion</span>
              <div className="ex-modes" role="group" aria-labelledby="em-mode">
                {MODES.map((m) => <button key={m.id} className="ex-mode" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.name}</button>)}
              </div>

              <label className="lbl" htmlFor="em-speed">Speed · {speed === 0 ? "still" : `${speed}×`}</label>
              <input id="em-speed" type="range" min={0} max={3} step={0.25} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />

              <label className="em-check"><input type="checkbox" checked={grain} onChange={(e) => setGrain(e.target.checked)} /> Film grain</label>
            </div>
            <div className="em-prev">
              {doc && <iframe title="Live preview of the embed" srcDoc={doc} sandbox="allow-scripts" loading="lazy" />}
            </div>
          </div>

          <h2 className="seo-h2">1. Paste before &lt;/body&gt;</h2>
          <div className="em-code"><code>{snippet}</code><button className="btn grad sm" onClick={() => copy(snippet, "script")}>{copied === "script" ? "Copied" : "Copy script"}</button></div>

          <h2 className="seo-h2">2. Optional: no-JavaScript fallback</h2>
          <p className="hint">Put this in your CSS so visitors with scripts off still get the palette as a static gradient. The script replaces it once it loads.</p>
          <div className="em-code"><code>{fallback}</code><button className="btn ghost sm" onClick={() => copy(fallback, "css")}>{copied === "css" ? "Copied" : "Copy CSS"}</button></div>
          <span className="sr-only" aria-live="polite">{copied ? `${copied} copied` : ""}</span>

          <h2 className="seo-h2">Options</h2>
          <ul className="ad-steps">
            <li><code>data-target=&quot;#hero&quot;</code> paints only behind one element instead of the whole page.</li>
            <li><code>data-opacity=&quot;0.6&quot;</code> softens it under busy content.</li>
            <li><code>window.auraEmbed.pause()</code> and <code>.play()</code> control it from your own code.</li>
          </ul>
          <p className="hint">More code formats for this palette (CSS variables, Tailwind, SVG) are in the <a href={`/palettes?p=${pal}`}>Palette Lab</a>.</p>
        </div>
      <Footer />
      </main>
    </>
  );
}
