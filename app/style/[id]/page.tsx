import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Canvas from "@/components/Canvas";
import { PALETTES, STYLES } from "@/lib/presets";
import { cleanDesc, imgUrl, studioUrl, styleExamples } from "@/lib/seo";

export const dynamicParams = false;
export const generateStaticParams = () => STYLES.map((s) => ({ id: s.id }));

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const s = STYLES.find((x) => x.id === params.id);
  if (!s) return {};
  const ex = styleExamples(s)[0];
  const title = `${s.name} wallpapers: free 4K ${s.name.toLowerCase()} gradient generator`;
  const description = `${cleanDesc(s.desc)} Make your own ${s.name.toLowerCase()} wallpaper in any of ${PALETTES.length} palettes and download it free in 4K for phone, desktop and tablet.`;
  return {
    title, description,
    alternates: { canonical: `/style/${s.id}` },
    openGraph: { title, description, url: `/style/${s.id}`, images: [{ url: imgUrl(ex.p, 1200, 630), width: 1200, height: 630, alt: `${s.name} wallpaper example` }] },
    twitter: { card: "summary_large_image", title, description, images: [imgUrl(ex.p, 1200, 630)] },
  };
}

export default function StylePage({ params }: { params: { id: string } }) {
  const i = STYLES.findIndex((x) => x.id === params.id);
  if (i < 0) notFound();
  const s = STYLES[i];
  const ex = styleExamples(s);
  const near = [1, 2, 3, -1, -2, -3].map((d) => STYLES[(i + d + STYLES.length) % STYLES.length]);
  return (
    <>
      <Nav />
      <main className="create seo">
        <div className="wrap">
          <nav className="seo-crumbs" aria-label="Breadcrumb"><a href="/style">Styles</a><span aria-hidden="true">/</span><span aria-current="page">{s.name}</span></nav>
          <span className="kicker">Style {i + 1} of {STYLES.length}</span>
          <h1 className="display">{s.name} wallpapers</h1>
          <p className="lead">{cleanDesc(s.desc)} Every one is generated in your browser from a seed, so you can make endless variations and download any of them in 4K.</p>
          <div className="seo-cta">
            <a className="btn grad" href={studioUrl(ex[0].p)}>Make a {s.name} wallpaper</a>
            <a className="btn ghost" href="/explore">Browse everything</a>
          </div>

          <h2 className="seo-h2">{ex.length} examples, in {ex.length} palettes</h2>
          <ul className="seo-grid" role="list">
            {ex.map(({ p, pal }) => (
              <li key={p.seed} className="seo-card">
                <a href={studioUrl(p)} aria-label={`Open ${s.name} in ${pal.name} in the studio`}><Canvas params={p} w={360} h={640} /></a>
                <div className="seo-meta"><span>{pal.name}</span><a href={`/palette/${pal.id}`}>Palette</a></div>
              </li>
            ))}
          </ul>

          <h2 className="seo-h2">Try {s.name} in another palette</h2>
          <div className="seo-chips">
            {PALETTES.map((p) => (
              <a key={p.id} className="seo-chip" href={`/palette/${p.id}`}>
                <i aria-hidden="true" style={{ background: `linear-gradient(90deg, ${p.colors.join(", ")})` }} />{p.name}
              </a>
            ))}
          </div>

          <h2 className="seo-h2">Similar styles</h2>
          <div className="seo-chips">
            {near.map((x) => <a key={x.id} className="seo-chip" href={`/style/${x.id}`}>{x.name}</a>)}
          </div>
        </div>
      </main>
    </>
  );
}
