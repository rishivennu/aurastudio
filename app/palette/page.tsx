import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { PALETTES } from "@/lib/presets";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: `${PALETTES.length} gradient colour palettes with hex codes | aura.studio`,
  description: `Hand-tuned gradient palettes with hex codes, CSS and example wallpapers. Copy any of the ${PALETTES.length}, or make a 4K wallpaper with it.`,
  alternates: { canonical: "/palette" },
};

export default function Palettes() {
  return (
    <>
      <Nav />
      <main className="create seo">
        <div className="wrap">
          <span className="kicker">Palettes</span>
          <h1 className="display">{PALETTES.length} palettes, ready to use.</h1>
          <p className="lead">Each has its hex codes, a CSS gradient and examples in several styles. For contrast checks and code exports, use the <a href="/palettes">Palette Lab</a>.</p>
          <ul className="seo-pals" role="list">
            {PALETTES.map((p) => (
              <li key={p.id}>
                <a href={`/palette/${p.id}`} className="seo-pal">
                  <i aria-hidden="true" style={{ background: `linear-gradient(135deg, ${p.colors.join(", ")})` }} />
                  <b>{p.name}</b><span>{p.colors.length} colours</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      <Footer />
      </main>
    </>
  );
}
