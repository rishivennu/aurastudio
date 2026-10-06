import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Canvas from "@/components/Canvas";
import { STYLES } from "@/lib/presets";
import { cleanDesc, styleExamples } from "@/lib/seo";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: `All ${STYLES.length} wallpaper styles | aura.studio`,
  description: `Mesh, aurora, liquid, fluted glass, plasma and ${STYLES.length - 5} more generative gradient styles. Free 4K wallpapers for every device.`,
  alternates: { canonical: "/style" },
};

export default function Styles() {
  return (
    <>
      <Nav />
      <main className="create seo">
        <div className="wrap">
          <span className="kicker">Styles</span>
          <h1 className="display">{STYLES.length} ways to make a gradient.</h1>
          <p className="lead">Each style is its own little generator. Pick one to see examples, then open it in the studio.</p>
          <ul className="seo-grid seo-index" role="list">
            {STYLES.map((s) => (
              <li key={s.id} className="seo-card">
                <a href={`/style/${s.id}`} aria-hidden="true" tabIndex={-1}><Canvas params={styleExamples(s, 1)[0].p} w={360} h={480} /></a>
                <div className="seo-meta col"><a className="seo-name" href={`/style/${s.id}`}>{s.name}</a><span>{cleanDesc(s.desc)}</span></div>
              </li>
            ))}
          </ul>
        </div>
      <Footer />
      </main>
    </>
  );
}
