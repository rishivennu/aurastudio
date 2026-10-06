"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Nav from "@/components/Nav";
import { GenParams } from "@/lib/engine";
import { decodeParams } from "@/lib/share";
import Footer from "@/components/Footer";

const BrandKit = dynamic(() => import("@/components/BrandKit"), { ssr: false, loading: () => <div className="cm-skel" style={{ height: 420, borderRadius: 24 }} /> });
const START: GenParams = { seed: "BRAND1", styleId: "meshgrid", paletteId: "indigo-dusk", customColors: ["#4b45ff", "#19d3ff", "#ff5d8f", "#0a0a14"], keywords: "", text: "", intensity: 0.75, grainOn: true };

export default function Brand() {
  const [p, setP] = useState<GenParams | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("w");
    setP((t && decodeParams(t)) || START);
  }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 2400); return () => clearTimeout(id); }, [toast]);
  return (
    <>
      <Nav />
      <main className="create brand">
        <div className="wrap">
          <span className="kicker">Brand kit</span>
          <h1 className="display">Your logo, on everything.</h1>
          <p className="lead">Add your logo and brand colours. Get a matching call background, LinkedIn and X banners, a 4K desktop, a phone screen, a slide background and an email banner, each with the logo placed where nothing covers it.</p>
          <section className="xt glass bk-wrap" aria-label="Brand kit">{p && <BrandKit params={p} notify={setToast} />}</section>
        </div>
      <Footer />
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
