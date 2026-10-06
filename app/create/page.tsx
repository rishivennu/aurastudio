import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Studio from "@/components/Studio";
import Reveal from "@/components/Reveal";
import { decodeParams } from "@/lib/share";
import { PALETTES, STYLES } from "@/lib/presets";
import Footer from "@/components/Footer";

type Props = { searchParams: { w?: string | string[] } };

export function generateMetadata({ searchParams }: Props): Metadata {
  const w = typeof searchParams.w === "string" ? searchParams.w : "";
  const p = w ? decodeParams(w) : null;
  if (!p) return { title: "Studio · aura.studio" };
  const style = STYLES.find((s) => s.id === p.styleId)?.name;
  const pal = p.customColors ? "Custom" : PALETTES.find((x) => x.id === p.paletteId)?.name;
  const title = `${style} · ${pal} wallpaper · aura.studio`;
  const description = "A wallpaper made in aura.studio. Open it to remix, or download it in 4K for any device.";
  const image = { url: `/api/og?w=${w}`, width: 1200, height: 630, alt: `${style} style wallpaper in the ${pal} palette` };
  return {
    title, description,
    openGraph: { title, description, images: [image], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default function Create() {
  return (
    <>
      <Nav />
      <main className="create">
        <div className="wrap">
          <header className="create-head">
            <Reveal variant="up">
              <span className="kicker">The studio</span>
              <h1 className="create-title">Make one <span className="pop">yours</span>.</h1>
              <p className="lead">Pick a style, play with the palette, drag the glow. Everything renders locally in your browser, pixel for pixel. Nothing leaves your device unless you share or publish.</p>
            </Reveal>
          </header>
          <Studio />
        </div>
      <Footer />
      </main>
    </>
  );
}
