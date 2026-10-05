"use client";
import GalleryCard from "@/components/GalleryCard";
import Shell from "@/components/Shell";
import Nav from "@/components/Nav";
import Reveal from "@/components/Reveal";
import { GenParams } from "@/lib/engine";
import { PALETTES } from "@/lib/presets";

const curated: { p: GenParams; label: string }[] = [
  { label: "Indigo Dusk", p: { seed: "REF1", styleId: "soft-linear", paletteId: "indigo-dusk", keywords: "quiet dawn", text: "", intensity: 0.7, grainOn: true } },
  { label: "Sea Mist",    p: { seed: "REF2", styleId: "soft-linear", paletteId: "sea-mist", keywords: "coastal calm", text: "", intensity: 0.6, grainOn: true } },
  { label: "Candy Sky",   p: { seed: "REF3", styleId: "mesh", paletteId: "candy-sky", keywords: "sunset bloom", text: "", intensity: 0.75, grainOn: true } },
  { label: "Ember",       p: { seed: "E2", styleId: "mesh", paletteId: "ember", keywords: "warm haze", text: "", intensity: 0.8, grainOn: true } },
  { label: "Gold Noir",   p: { seed: "G1", styleId: "mesh", paletteId: "gold-noir", keywords: "liquid gold", text: "", intensity: 0.9, grainOn: true } },
  { label: "Jade",        p: { seed: "J1", styleId: "mesh", paletteId: "jade", keywords: "deep forest", text: "", intensity: 0.75, grainOn: true } },
  { label: "Peach Sunset",p: { seed: "P1", styleId: "soft-linear", paletteId: "peach-sunset", keywords: "evening heat", text: "", intensity: 0.7, grainOn: true } },
  { label: "Rose Quartz", p: { seed: "R1", styleId: "mesh", paletteId: "rose-quartz", keywords: "soft bloom", text: "", intensity: 0.7, grainOn: true } },
  { label: "Verdant Hills",p: { seed: "HILLS1", styleId: "ridges", paletteId: "verdant-hills", keywords: "rolling valleys", text: "", intensity: 0.8, grainOn: true } },
  { label: "Alpine Tide",  p: { seed: "TIDE7", styleId: "ridges", paletteId: "alpine-tide", keywords: "misty ridgeline", text: "", intensity: 0.8, grainOn: true } },
  { label: "Flux Field",   p: { seed: "FLUX1", styleId: "dotfield", paletteId: "flux-field", keywords: "wave field", text: "", intensity: 0.8, grainOn: false } },
  { label: "Spectral Wave", p: { seed: "SPEC3", styleId: "dotfield", paletteId: "spectral-wave", keywords: "colour field", text: "", intensity: 0.8, grainOn: false } },
  { label: "Thermal",       p: { seed: "show7", styleId: "liquid", paletteId: "thermal", keywords: "liquid flow", text: "", intensity: 0.6, grainOn: false } },
  { label: "Magma",         p: { seed: "show7", styleId: "liquid", paletteId: "magma", keywords: "molten core", text: "", intensity: 0.6, grainOn: false } },
  { label: "Ultraviolet",   p: { seed: "UV4", styleId: "liquid", paletteId: "ultraviolet", keywords: "neon flow", text: "", intensity: 0.65, grainOn: false } },
  { label: "Reeded Glacier",p: { seed: "FLT2", styleId: "fluted", paletteId: "glacier", keywords: "soft light", text: "", intensity: 0.6, grainOn: false } },
  { label: "Reeded Mist",   p: { seed: "FLT5", styleId: "fluted", paletteId: "sea-mist", keywords: "quiet glass", text: "", intensity: 0.55, grainOn: false } },
  { label: "Reeded Violet", p: { seed: "FLT9", styleId: "fluted", paletteId: "ultraviolet", keywords: "neon glass", text: "", intensity: 0.6, grainOn: false } },
  { label: "Aurora",        p: { seed: "AUR2", styleId: "aurora", paletteId: "mint-fade", keywords: "northern lights", text: "", intensity: 0.75, grainOn: false } },
  { label: "Topographic",   p: { seed: "TOP4", styleId: "topo", paletteId: "sea-mist", keywords: "contour map", text: "", intensity: 0.6, grainOn: false } },
  { label: "Sunburst",      p: { seed: "SUN3", styleId: "sunburst", paletteId: "ember", keywords: "radial rays", text: "", intensity: 0.8, grainOn: false } },
  { label: "Voronoi",       p: { seed: "VOR5", styleId: "voronoi", paletteId: "glacier", keywords: "crystalline", text: "", intensity: 0.7, grainOn: false } },
  { label: "Metaballs",     p: { seed: "MET7", styleId: "metaballs", paletteId: "ultraviolet", keywords: "liquid orbs", text: "", intensity: 0.7, grainOn: false } },
  { label: "Jade Marble",   p: { seed: "MMAR", styleId: "marble", paletteId: "jade", keywords: "veined stone", text: "", intensity: 0.7, grainOn: false } },
  { label: "Plasma",        p: { seed: "PLS8", styleId: "plasma", paletteId: "spectral-wave", keywords: "fluid field", text: "", intensity: 0.7, grainOn: false } },
  { label: "Silk",          p: { seed: "SLK2", styleId: "silk", paletteId: "indigo-dusk", keywords: "flowing silk", text: "", intensity: 0.7, grainOn: false } },
];

export default function Home() {
  const loadPreset = (p: GenParams) => {
    try { localStorage.setItem("aura_load", JSON.stringify(p)); } catch {}
    location.href = "/create";
  };
  return (
    <>
      <Nav />
      <Shell />
      <main>

        <section id="how" className="section light">
          <div className="wrap">
            <Reveal variant="up"><span className="kicker">The idea</span>
            <h2 className="display">Three steps.<br />Nothing leaves your device.</h2></Reveal>
            <div className="steps">
              <Reveal as="div" className="step" delay={0}><div className="num">01</div><h3>Choose</h3><p>Pick a style and palette, type a keyword or two, set a seed. Every control is one tap.</p></Reveal>
              <Reveal as="div" className="step" delay={90}><div className="num">02</div><h3>Preview</h3><p>See it live for desktop, laptop, tablet and phone, instantly, right in the browser.</p></Reveal>
              <Reveal as="div" className="step" delay={180}><div className="num">03</div><h3>Download</h3><p>Export full-resolution PNG or JPEG per device, or grab ten palettes in one tap.</p></Reveal>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <Reveal variant="up"><span className="kicker">The studio</span>
            <h2 className="display">Make one yours.</h2>
            <p className="lead">Open the studio to pick a style, tune the palette and glow, and export full-resolution wallpapers for any device. Seeds are deterministic, so the same settings always return the same wallpaper, pixel for pixel.</p>
            <a className="btn grad create-cta" href="/create">Open the studio →</a></Reveal>
          </div>
        </section>

        <section id="gallery" className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <Reveal variant="up"><span className="kicker">Gallery</span>
            <h2 className="display">Starting points.</h2>
            <p className="lead">Ten looks drawn from the reference set and beyond. Tap any to load it into the studio.</p></Reveal>
            <div className="grid">
              {curated.map((c, i) => (
                <Reveal key={i} variant="up" delay={(i % 5) * 70}>
                  <GalleryCard params={c.p} label={c.label}
                    swatches={PALETTES.find((x) => x.id === c.p.paletteId)?.colors}
                    onPick={() => loadPreset(c.p)} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <footer>
          <div className="wrap foot">
            <div>© {new Date().getFullYear()} aura.studio — crafted for people who notice.</div>
            <div style={{ display: "flex", gap: 22 }}>
              <a href="/dashboard">Dashboard</a>
              <a href="/create">Create</a>
              <a href="https://vercel.com" target="_blank" rel="noreferrer">Vercel</a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
