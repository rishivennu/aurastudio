"use client";
import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import { PALETTES, Palette } from "@/lib/presets";
import { encodeParams } from "@/lib/share";
import Footer from "@/components/Footer";

type Fmt = "css" | "tailwind" | "json" | "gradient" | "animated" | "svg";

const hexRgb = (h: string) => {
  const x = h.replace("#", "");
  const f = x.length === 3 ? x.split("").map((c) => c + c).join("") : x;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};
const lum = (h: string) => {
  const [r, g, b] = hexRgb(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const sat = (h: string) => { const [r, g, b] = hexRgb(h); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
const grade = (r: number) => (r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "AA large" : "Fail");
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function roles(p: Palette) {
  const byL = [...p.colors].sort((a, b) => lum(a) - lum(b));
  const bg = byL[0], text = byL[byL.length - 1];
  const surface = byL[1] || bg;
  const accent = [...p.colors].filter((c) => c !== bg && c !== text).sort((a, b) => sat(b) - sat(a))[0] || byL[Math.floor(byL.length / 2)];
  const onAccent = contrast(accent, "#ffffff") >= contrast(accent, "#0a0a0b") ? "#ffffff" : "#0a0a0b";
  return { bg, surface, text, accent, onAccent };
}

function svgCode(p: Palette, dur: number) {
  const cs = p.colors, k = cs.length;
  const cyc = (i: number) => [...cs.slice(i), ...cs.slice(0, i), cs[i]].join(";");
  const stops = cs.map((c, i) => `      <stop offset="${Math.round((i / (k - 1)) * 100)}%" stop-color="${c}">\n        <animate attributeName="stop-color" values="${cyc(i)}" dur="${dur}s" repeatCount="indefinite" />\n      </stop>`).join("\n");
  const a = cs[Math.floor(k / 2)], b = cs[k - 1];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="aura-g" x1="0" y1="0" x2="1" y2="1">
${stops}
    </linearGradient>
    <radialGradient id="aura-a" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${a}" stop-opacity=".75" />
      <stop offset="100%" stop-color="${a}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="aura-b" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${b}" stop-opacity=".6" />
      <stop offset="100%" stop-color="${b}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#aura-g)" />
  <circle r="520" cx="400" cy="300" fill="url(#aura-a)">
    <animate attributeName="cx" values="400;1100;400" dur="${dur * 1.5}s" repeatCount="indefinite" />
    <animate attributeName="cy" values="300;600;300" dur="${dur * 2}s" repeatCount="indefinite" />
  </circle>
  <circle r="460" cx="1200" cy="650" fill="url(#aura-b)">
    <animate attributeName="cx" values="1200;500;1200" dur="${dur * 1.75}s" repeatCount="indefinite" />
    <animate attributeName="cy" values="650;250;650" dur="${dur * 1.25}s" repeatCount="indefinite" />
  </circle>
</svg>`;
}

function code(p: Palette, fmt: Fmt, angle: number, dur = 12) {
  const n = slug(p.name);
  if (fmt === "animated") return `.${n}-bg {\n  background: linear-gradient(${angle}deg, ${[...p.colors, p.colors[0]].join(", ")});\n  background-size: 400% 400%;\n  animation: ${n}-shift ${dur}s ease-in-out infinite;\n}\n\n@keyframes ${n}-shift {\n  0% { background-position: 0% 50%; }\n  50% { background-position: 100% 50%; }\n  100% { background-position: 0% 50%; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .${n}-bg { animation: none; }\n}`;
  if (fmt === "svg") return svgCode(p, dur);
  if (fmt === "css") return `:root {\n${p.colors.map((c, i) => `  --${n}-${(i + 1) * 100}: ${c};`).join("\n")}\n}`;
  if (fmt === "tailwind") return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        "${n}": {\n${p.colors.map((c, i) => `          ${(i + 1) * 100}: "${c}",`).join("\n")}\n        },\n      },\n    },\n  },\n};`;
  if (fmt === "json") return JSON.stringify({ name: p.name, id: p.id, colors: p.colors }, null, 2);
  return `background: linear-gradient(${angle}deg, ${p.colors.map((c, i) => `${c} ${Math.round((i / (p.colors.length - 1)) * 100)}%`).join(", ")});`;
}

export default function Palettes() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Palette>(PALETTES[0]);
  const [fmt, setFmt] = useState<Fmt>("css");
  const [angle, setAngle] = useState(135);
  const [dur, setDur] = useState(12);
  const [still, setStill] = useState(false);
  useEffect(() => { setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("p");
    const f = id && PALETTES.find((x) => x.id === id);
    if (f) setSel(f);
  }, []);
  const pick = (p: Palette) => {
    setSel(p);
    history.replaceState(null, "", `/palettes?p=${p.id}`);
    if (window.innerWidth < 900) document.getElementById("pl-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? PALETTES.filter((p) => p.name.toLowerCase().includes(t) || p.colors.some((c) => c.toLowerCase().includes(t))) : PALETTES;
  }, [q]);

  const r = roles(sel);
  const out = code(sel, fmt, angle, dur);
  const moving = fmt === "animated" || fmt === "svg";
  const grad = `linear-gradient(${angle}deg, ${sel.colors.join(", ")})`;
  const studio = `/create?w=${encodeParams({ seed: "PAL" + sel.id.length, styleId: "mesh", paletteId: sel.id, keywords: sel.name.toLowerCase(), text: "", intensity: 0.75, grainOn: true })}`;

  const copy = async (txt: string, label: string) => {
    try { await navigator.clipboard.writeText(txt); setToast(`${label} copied`); }
    catch { setToast("Copy failed, select and copy manually"); }
    setTimeout(() => setToast(""), 1800);
  };

  const pairs = [
    { label: "Text on background", fg: r.text, bg: r.bg },
    { label: "Text on surface", fg: r.text, bg: r.surface },
    { label: "Button label on accent", fg: r.onAccent, bg: r.accent },
  ];

  return (
    <>
      <Nav />
      <main className="create pl">
        <div className="wrap">
          <span className="kicker">Palette lab</span>
          <h1 className="display">Take the colours with you.</h1>
          <p className="lead">Every palette behind aura, ready for your own work. Check contrast against WCAG, preview it as a real interface, and copy it as CSS variables, a Tailwind theme, JSON, a gradient, or a moving background in pure CSS or SVG.</p>

          <div className="pl-grid">
            <aside className="pl-list" aria-label="Palettes">
              <label className="ex-search pl-search">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or hex, e.g. #ff" aria-label="Search palettes" />
              </label>
              <span className="pl-count">{list.length} palettes</span>
              <div className="pl-items">
                {list.map((p) => (
                  <button key={p.id} className={`pl-item ${p.id === sel.id ? "on" : ""}`} aria-pressed={p.id === sel.id} onClick={() => pick(p)}>
                    <span className="pl-strip" style={{ background: `linear-gradient(90deg, ${p.colors.join(", ")})` }} aria-hidden="true" />
                    <span className="pl-name">{p.name}</span>
                    <span className="pl-n">{p.colors.length}</span>
                  </button>
                ))}
                {list.length === 0 && <p className="pl-empty">No palette matches “{q}”.</p>}
              </div>
            </aside>

            <section id="pl-detail" className="pl-detail" aria-label={`${sel.name} palette`}>
              <div className="pl-hero" style={{ background: grad }}>
                <div className="pl-hero-txt" style={{ color: contrast(sel.colors[0], "#fff") > contrast(sel.colors[0], "#000") ? "#fff" : "#0a0a0b" }}>
                  <h2>{sel.name}</h2><span>{sel.colors.length} colours</span>
                </div>
              </div>

              <div className="pl-swatches">
                {sel.colors.map((c) => {
                  const w = contrast(c, "#ffffff"), b = contrast(c, "#000000");
                  const best = w >= b ? "#ffffff" : "#000000";
                  return (
                    <button key={c} className="pl-sw" style={{ background: c, color: best }} onClick={() => copy(c, c.toUpperCase())} aria-label={`Copy ${c}`}>
                      <span className="pl-hex">{c.toUpperCase()}</span>
                      <span className="pl-rgb">rgb {hexRgb(c).join(" ")}</span>
                      <span className="pl-copy">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                        Copy
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pl-two">
                <div className="pl-card">
                  <h3>As an interface</h3>
                  <div className="pl-mock" style={{ background: r.bg, color: r.text }}>
                    <div className="pl-mock-bar"><i style={{ background: r.accent }} /><span>Your app</span></div>
                    <div className="pl-mock-card" style={{ background: r.surface }}>
                      <b>Weekly report</b>
                      <p style={{ opacity: 0.75 }}>Revenue is up 18% on last week.</p>
                      <div className="pl-mock-meter"><span style={{ background: r.accent, width: "68%" }} /></div>
                      <button tabIndex={-1} style={{ background: r.accent, color: r.onAccent }}>View details</button>
                    </div>
                  </div>
                </div>
                <div className="pl-card">
                  <h3>Contrast check</h3>
                  <ul className="pl-checks">
                    {pairs.map((x) => {
                      const ratio = contrast(x.fg, x.bg), g = grade(ratio);
                      return (
                        <li key={x.label}>
                          <span className="pl-pair" style={{ background: x.bg, color: x.fg }} aria-hidden="true">Aa</span>
                          <span className="pl-pair-l">{x.label}<small>{x.fg.toUpperCase()} on {x.bg.toUpperCase()}</small></span>
                          <span className={`pl-badge ${g === "Fail" ? "bad" : g === "AA large" ? "mid" : "ok"}`}>{ratio.toFixed(2)}:1 · {g}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="pl-note">AA needs 4.5:1 for body text, AAA needs 7:1. Roles are picked automatically: darkest colour as background, lightest as text, most saturated as accent.</p>
                </div>
              </div>

              <div className="pl-card pl-export">
                <div className="pl-ex-head">
                  <div className="ex-modes" role="group" aria-label="Export format">
                    {(["css", "tailwind", "json", "gradient", "animated", "svg"] as Fmt[]).map((f) => (
                      <button key={f} aria-pressed={fmt === f} className={`ex-mode ${fmt === f ? "active" : ""}`} onClick={() => setFmt(f)}>
                        {f === "css" ? "CSS vars" : f === "tailwind" ? "Tailwind" : f === "json" ? "JSON" : f === "gradient" ? "Gradient" : f === "animated" ? "Animated CSS" : "Animated SVG"}
                      </button>
                    ))}
                  </div>
                  {(fmt === "gradient" || fmt === "animated") && (
                    <label className="pl-angle">Angle <input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(+e.target.value)} aria-label="Gradient angle" /> <span>{angle}°</span></label>
                  )}
                </div>
                {moving && (
                  <div className="pl-live">
                    {fmt === "animated"
                      ? <div className="pl-live-box pl-live-css" style={{ background: `linear-gradient(${angle}deg, ${[...sel.colors, sel.colors[0]].join(", ")})`, backgroundSize: "400% 400%", animationDuration: `${dur}s`, animationPlayState: still ? "paused" : "running" }} role="img" aria-label="Live preview of the animated CSS gradient" />
                      : <img className="pl-live-box" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(still ? out.replace(/\s*<animate[^>]*\/>/g, "") : out)}`} alt="Live preview of the animated SVG" />}
                    <button className="btn ghost sm" onClick={() => setStill((v) => !v)} aria-pressed={!still}>{still ? "Play preview" : "Pause preview"}</button>
                    <label className="pl-angle">Loop <input type="range" min={4} max={30} value={dur} onChange={(e) => setDur(+e.target.value)} aria-label="Animation loop length in seconds" /> <span>{dur}s</span></label>
                  </div>
                )}
                <pre className="pl-code"><code>{out}</code></pre>
                <div className="pl-actions">
                  <button className="btn grad sm" onClick={() => copy(out, "Code")}>Copy code</button>
                  {fmt === "svg" && <button className="btn ghost sm" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([out], { type: "image/svg+xml" })); a.download = `aura-${slug(sel.name)}.svg`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }}>Download .svg</button>}
                  <a className="btn ghost sm" href={studio}>Make a wallpaper with it</a>
                  <button className="btn ghost sm" onClick={() => copy(`${location.origin}/palettes?p=${sel.id}`, "Link")}>Copy link</button>
                </div>
              </div>
            </section>
          </div>
        </div>
        <div className="toast" role="status" aria-live="polite">{toast && <span key={toast}>{toast}</span>}</div>
      <Footer />
      </main>
    </>
  );
}
