import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Canvas from "@/components/Canvas";
import { PALETTES, STYLES } from "@/lib/presets";
import { imgUrl, paletteBlurb, paletteExamples, relatedPalettes, studioUrl } from "@/lib/seo";
import Footer from "@/components/Footer";

export const dynamicParams = false;
export const generateStaticParams = () => PALETTES.map((p) => ({ id: p.id }));

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const p = PALETTES.find((x) => x.id === params.id);
  if (!p) return {};
  const ex = paletteExamples(p)[0];
  const title = `${p.name} gradient palette: hex codes, CSS and wallpapers`;
  const description = `${paletteBlurb(p)} Copy the hex codes and CSS gradient, or make a free 4K wallpaper with it in ${STYLES.length} styles.`;
  return {
    title, description,
    alternates: { canonical: `/palette/${p.id}` },
    openGraph: { title, description, url: `/palette/${p.id}`, images: [{ url: imgUrl(ex.p, 1200, 630), width: 1200, height: 630, alt: `${p.name} wallpaper example` }] },
    twitter: { card: "summary_large_image", title, description, images: [imgUrl(ex.p, 1200, 630)] },
  };
}

export default function PalettePage({ params }: { params: { id: string } }) {
  const p = PALETTES.find((x) => x.id === params.id);
  if (!p) notFound();
  const ex = paletteExamples(p);
  const css = `background: linear-gradient(135deg, ${p.colors.join(", ")});`;
  return (
    <>
      <Nav />
      <main className="create seo">
        <div className="wrap">
          <nav className="seo-crumbs" aria-label="Breadcrumb"><a href="/palette">Palettes</a><span aria-hidden="true">/</span><span aria-current="page">{p.name}</span></nav>
          <span className="kicker">Gradient palette</span>
          <h1 className="display">{p.name}</h1>
          <p className="lead">{paletteBlurb(p)}</p>

          <ul className="seo-sw" role="list" aria-label="Colours">
            {p.colors.map((c) => (
              <li key={c}><i style={{ background: c }} aria-hidden="true" /><code>{c.toUpperCase()}</code></li>
            ))}
          </ul>
          <div className="seo-css"><span className="lbl">CSS gradient</span><code>{css}</code></div>
          <div className="seo-cta">
            <a className="btn grad" href={studioUrl(ex[0].p)}>Make a wallpaper in {p.name}</a>
            <a className="btn ghost" href={`/palettes?p=${p.id}`}>Open in Palette Lab</a>
          </div>

          <h2 className="seo-h2">{p.name} in {ex.length} styles</h2>
          <ul className="seo-grid" role="list">
            {ex.map(({ p: g, style }) => (
              <li key={g.seed} className="seo-card">
                <a href={studioUrl(g)} aria-label={`Open ${style.name} in ${p.name} in the studio`}><Canvas params={g} w={360} h={640} /></a>
                <div className="seo-meta"><span>{style.name}</span><a href={`/style/${style.id}`}>Style</a></div>
              </li>
            ))}
          </ul>

          <h2 className="seo-h2">Palettes like {p.name}</h2>
          <div className="seo-chips">
            {relatedPalettes(p).map((x) => (
              <a key={x.id} className="seo-chip" href={`/palette/${x.id}`}>
                <i aria-hidden="true" style={{ background: `linear-gradient(90deg, ${x.colors.join(", ")})` }} />{x.name}
              </a>
            ))}
          </div>
          <h2 className="seo-h2">Every style</h2>
          <div className="seo-chips">{STYLES.map((s) => <a key={s.id} className="seo-chip" href={`/style/${s.id}`}>{s.name}</a>)}</div>
        </div>
      <Footer />
      </main>
    </>
  );
}
