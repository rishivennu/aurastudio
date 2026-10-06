"use client";
import { useEffect, useRef, useState } from "react";
import { GenParams } from "@/lib/engine";
import { SOCIAL } from "@/lib/presets";
import { renderToBlob, exportWallpaper, downloadBlob } from "@/lib/exporter";
import { LIVE_SIZES, LiveSize, recordLive, pickVideoType } from "@/lib/live";
import { renderTone, toneBlob, Tone } from "@/lib/variants";
import { SPAN_RES, spanBlobs, iconBlobs } from "@/lib/span";
import LiveCanvas from "./LiveCanvas";
import Canvas from "./Canvas";
import dynamic from "next/dynamic";

const Loading = () => <div className="xt-body"><div className="cm-skel" style={{ height: 320, borderRadius: 20 }} /></div>;
const PhotoGlass = dynamic(() => import("./PhotoGlass"), { ssr: false, loading: Loading });
const CalendarMaker = dynamic(() => import("./CalendarMaker"), { ssr: false, loading: Loading });
const PrintPoster = dynamic(() => import("./PrintPoster"), { ssr: false, loading: Loading });
const BrandKit = dynamic(() => import("./BrandKit"), { ssr: false, loading: Loading });

type Tab = "live" | "social" | "pair" | "span" | "icons" | "photo" | "calendar" | "print" | "brand";

function TonePreview({ params, tone }: { params: GenParams; tone: Tone }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    c.width = 180; c.height = 390;
    const ctx = c.getContext("2d"); if (ctx) renderTone(ctx, 180, 390, params, tone);
  }, [params, tone]);
  return <canvas ref={ref} className="ex-pair-c" aria-label={`${tone === "day" ? "Light mode" : "Dark mode"} version`} role="img" />;
}

export default function StudioExtras({ params, notify }: { params: GenParams; notify: (m: string) => void }) {
  const [tab, setTab] = useState<Tab>("live");
  const [reduced, setReduced] = useState(false);
  const [play, setPlay] = useState(true);
  const [size, setSize] = useState<LiveSize>(LIVE_SIZES[0]);
  const [secs, setSecs] = useState(8);
  const [rec, setRec] = useState<number | null>(null);
  const [canRec, setCanRec] = useState(true);
  const [busy, setBusy] = useState("");
  const [spanN, setSpanN] = useState(3);
  const [spanRes, setSpanRes] = useState<(typeof SPAN_RES)[number]>(SPAN_RES[0]);
  const [bezel, setBezel] = useState(40);
  const [vert, setVert] = useState(false);
  const [icons, setIcons] = useState<{ previews: string[]; roles: Record<string, string> } | null>(null);
  useEffect(() => { setIcons(null); }, [params]);

  const doSpan = async () => {
    setBusy("span");
    try {
      const blobs = await spanBlobs(params, spanN, spanRes.w, spanRes.h, bezel, vert);
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      blobs.forEach((b, i) => zip.file(`aura_${params.seed}_screen-${i + 1}-of-${spanN}_${spanRes.w}x${spanRes.h}.png`, b));
      downloadBlob(await zip.generateAsync({ type: "blob" }), `aura_${params.seed}_span-${spanN}.zip`);
      notify(`${spanN} screens downloaded`);
    } catch { notify("That size is too big for this browser. Try 1440p."); }
    finally { setBusy(""); }
  };

  const doIcons = async (download: boolean) => {
    setBusy("icons");
    try {
      const r = await iconBlobs(params);
      setIcons({ previews: r.previews, roles: r.roles });
      if (download) {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        r.blobs.forEach((b, i) => zip.file(`icons/aura_icon_${String(i + 1).padStart(2, "0")}.png`, b));
        zip.file("widget-colours.json", JSON.stringify(r.roles, null, 2));
        zip.file("README.txt", "Icon backgrounds cut from one aura wallpaper, 1024x1024 each.\nOn iPhone: Shortcuts > new shortcut > Open App > Add to Home Screen, then tap the icon to choose one of these images.\nwidget-colours.json has matching colours for widget apps (Widgetsmith, Color Widgets, KWGT).\n");
        downloadBlob(await zip.generateAsync({ type: "blob" }), `aura_${params.seed}_icon-set.zip`);
        notify("Icon set downloaded");
      }
    } finally { setBusy(""); }
  };

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches); if (m.matches) setPlay(false);
    setCanRec(!!pickVideoType());
  }, []);

  const record = async () => {
    setRec(0);
    try {
      const ext = await recordLive(params, size, secs, (f) => setRec(f));
      notify(`Live wallpaper saved (.${ext})`);
    } catch (e) { notify(e instanceof Error ? e.message : "Recording failed"); }
    finally { setRec(null); }
  };

  const socialZip = async () => {
    setBusy("zip");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const s of SOCIAL) {
        const { blob } = await renderToBlob(params, s.w, s.h, "png");
        zip.file(`aura_${s.id}_${s.w}x${s.h}.png`, blob);
      }
      downloadBlob(await zip.generateAsync({ type: "blob" }), `aura_social_${params.seed}.zip`);
      notify("Social pack downloaded");
    } finally { setBusy(""); }
  };

  const pair = async (w: number, h: number, id: string) => {
    setBusy("pair-" + id);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      zip.file(`aura_${params.seed}_${id}_light.png`, await toneBlob(params, w, h, "day", "png"));
      zip.file(`aura_${params.seed}_${id}_dark.png`, await toneBlob(params, w, h, "night", "png"));
      downloadBlob(await zip.generateAsync({ type: "blob" }), `aura_${params.seed}_${id}_light-dark.zip`);
      notify("Light and dark pair downloaded");
    } finally { setBusy(""); }
  };

  const tall = size.h > size.w;
  const pw = tall ? 220 : size.w === size.h ? 300 : 380;
  const ph = Math.round(pw * (size.h / size.w));

  return (
    <section className="xt glass" aria-label="More ways to export">
      <div className="xt-head">
        <h3>More than a still</h3>
        <div className="ex-modes" role="group" aria-label="Extra exports">
          {([["live", "Live wallpaper"], ["social", "Social sizes"], ["pair", "Light / dark pair"], ["span", "Multi-screen"], ["icons", "Icon set"], ["photo", "Photo glass"], ["calendar", "Calendar & goals"], ["print", "Print poster"], ["brand", "Brand kit"]] as [Tab, string][]).map(([k, l]) => (
            <button key={k} aria-pressed={tab === k} className={`ex-mode ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {tab === "live" && (
        <div className="xt-body xt-live">
          <div className="xt-live-stage">
            <LiveCanvas params={params} w={pw * 2} h={ph * 2} playing={play && rec === null} seconds={secs}
              className="xt-live-c" ariaLabel="Animated live wallpaper preview" />
          </div>
          <div className="xt-side">
            <p className="xt-lead">The same wallpaper, slowly breathing. It loops seamlessly, so it works as an Android live wallpaper, a Lively or Wallpaper Engine desktop background, or a story.</p>
            <div className="xt-row" role="group" aria-label="Video size">
              {LIVE_SIZES.map((s) => (
                <button key={s.id} className="chip" aria-pressed={size.id === s.id} onClick={() => setSize(s)}>{s.name} · {s.w}×{s.h}</button>
              ))}
            </div>
            <label className="lbl" htmlFor="xt-secs">Loop length · {secs}s</label>
            <input id="xt-secs" type="range" min={4} max={15} step={1} value={secs} onChange={(e) => setSecs(+e.target.value)} />
            <div className="xt-row">
              <button className="btn ghost sm" onClick={() => setPlay((v) => !v)} aria-pressed={!play}>{play ? "Pause preview" : "Play preview"}</button>
              <button className="btn grad sm" onClick={record} disabled={rec !== null || !canRec}>
                {rec !== null ? `Recording ${Math.round(rec * 100)}%` : "Record video"}
              </button>
            </div>
            {rec !== null && <div className="xt-prog" role="progressbar" aria-valuenow={Math.round(rec * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${rec * 100}%` }} /></div>}
            <p className="hint">{canRec ? `Records in real time (${secs}s), so keep this tab open. Saves as MP4 where the browser supports it, otherwise WebM.` : "This browser cannot record video. Try Chrome, Edge or Safari."}{reduced ? " The preview is paused because your system asks for reduced motion." : ""}</p>
          </div>
        </div>
      )}

      {tab === "social" && (
        <div className="xt-body">
          <p className="xt-lead">Banners, headers and call backgrounds, framed for each platform.</p>
          <div className="xt-social">
            {SOCIAL.map((s) => (
              <button key={s.id} className="xt-soc" onClick={async () => { setBusy(s.id); try { await exportWallpaper(params, s, "png"); } finally { setBusy(""); } }}
                disabled={!!busy} aria-label={`Download ${s.name}, ${s.w} by ${s.h}`}>
                <span className="xt-soc-frame" style={{ aspectRatio: `${s.w} / ${s.h}` }}>
                  <Canvas params={params} w={Math.round(240 * Math.min(1, s.w / s.h))} h={Math.round(240 * Math.min(1, s.w / s.h) * s.h / s.w)} />
                </span>
                <span className="xt-soc-n">{s.name}</span>
                <span className="xt-soc-d">{busy === s.id ? "Rendering…" : `${s.w}×${s.h} · ${s.label}`}</span>
              </button>
            ))}
          </div>
          <button className="btn grad sm" onClick={socialZip} disabled={!!busy}>{busy === "zip" ? "Zipping…" : `Download all ${SOCIAL.length} (.zip)`}</button>
        </div>
      )}

      {tab === "pair" && (
        <div className="xt-body xt-pair">
          <div className="xt-pair-prev">
            <figure><TonePreview params={params} tone="day" /><figcaption>Light mode</figcaption></figure>
            <figure><TonePreview params={params} tone="night" /><figcaption>Dark mode</figcaption></figure>
          </div>
          <div className="xt-side">
            <p className="xt-lead">A brighter day version and a deeper night version of the same wallpaper. Set them as your light and dark wallpapers and your phone switches with the system theme.</p>
            <div className="xt-row">
              <button className="btn grad sm" onClick={() => pair(1290, 2796, "phone")} disabled={!!busy}>{busy === "pair-phone" ? "Rendering…" : "Phone pair (.zip)"}</button>
              <button className="btn ghost sm" onClick={() => pair(3840, 2160, "desktop")} disabled={!!busy}>{busy === "pair-desktop" ? "Rendering…" : "Desktop pair (.zip)"}</button>
            </div>
            <p className="hint">On iPhone: Settings, Wallpaper, add both and turn on Appearance. On Mac and Windows, use a dynamic or auto-switch wallpaper setting.</p>
          </div>
        </div>
      )}
      {tab === "span" && (
        <div className="xt-body">
          <p className="xt-lead">One continuous wallpaper across two or three monitors. The bezel gap hides the strip behind each frame, so lines and glows carry straight across.</p>
          <div className="xt-span-prev" style={{ flexDirection: vert ? "column" : "row", gap: Math.max(4, bezel / 8) }} aria-hidden="true">
            {Array.from({ length: spanN }, (_, i) => (
              <span key={i} className="xt-span-scr" style={{ aspectRatio: `${spanRes.w} / ${spanRes.h}` }}>
                <span className="xt-span-in" style={vert
                  ? { height: `${spanN * 100}%`, width: "100%", top: `-${i * 100}%`, left: 0 }
                  : { width: `${spanN * 100}%`, height: "100%", left: `-${i * 100}%`, top: 0 }}>
                  <Canvas params={params} w={vert ? 320 : 320 * spanN} h={vert ? Math.round(320 * spanRes.h / spanRes.w) * spanN : Math.round(320 * spanRes.h / spanRes.w)} />
                </span>
              </span>
            ))}
          </div>
          <div className="xt-row" role="group" aria-label="Number of screens">
            {[2, 3].map((n) => <button key={n} className="chip" aria-pressed={spanN === n} onClick={() => setSpanN(n)}>{n} screens</button>)}
            <button className="chip" aria-pressed={vert} onClick={() => setVert((v) => !v)}>Stacked vertically</button>
          </div>
          <div className="xt-row" role="group" aria-label="Resolution per screen">
            {SPAN_RES.map((r) => <button key={r.id} className="chip" aria-pressed={spanRes.id === r.id} onClick={() => setSpanRes(r)}>{r.name} · {r.w}×{r.h}</button>)}
          </div>
          <label className="lbl" htmlFor="xt-bezel">Bezel gap · {bezel}px</label>
          <input id="xt-bezel" type="range" min={0} max={200} step={5} value={bezel} onChange={(e) => setBezel(+e.target.value)} />
          <div className="xt-row"><button className="btn grad sm" onClick={doSpan} disabled={!!busy}>{busy === "span" ? "Rendering…" : `Download ${spanN} screens (.zip)`}</button></div>
          <p className="hint">Set each file on the matching monitor, left to right. On Windows choose Fit or Fill per display; on Mac set each display separately.</p>
        </div>
      )}

      {tab === "icons" && (
        <div className="xt-body xt-pair">
          <div className="xt-home" aria-label="Home screen preview">
            <Canvas params={params} w={220} h={476} className="xt-home-bg" />
            <div className="xt-home-grid">
              {(icons?.previews || Array.from({ length: 12 }, () => "")).map((src, i) => (
                <span key={i} className="xt-ico">{src ? <img src={src} alt="" /> : <i />}</span>
              ))}
            </div>
            {icons && <div className="xt-widget" style={{ background: icons.roles.widgetBackground, color: icons.roles.text }}><b>9:41</b><span style={{ background: icons.roles.accent }} /></div>}
          </div>
          <div className="xt-side">
            <p className="xt-lead">Twelve app-icon backgrounds cut from this same wallpaper, plus matching widget colours, for a home screen where everything belongs together.</p>
            {icons && (
              <div className="xt-roles">
                {Object.entries(icons.roles).map(([k, v]) => <span key={k}><i style={{ background: v }} />{k.replace(/([A-Z])/g, " $1").toLowerCase()} <code>{v}</code></span>)}
              </div>
            )}
            <div className="xt-row">
              <button className="btn ghost sm" onClick={() => doIcons(false)} disabled={!!busy}>{busy === "icons" && !icons ? "Cutting…" : "Preview icons"}</button>
              <button className="btn grad sm" onClick={() => doIcons(true)} disabled={!!busy}>{busy === "icons" ? "Rendering…" : "Download icon set (.zip)"}</button>
            </div>
            <p className="hint">1024×1024 PNGs with a README for iPhone Shortcuts, and a colours file for widget apps.</p>
          </div>
        </div>
      )}

      {tab === "photo" && <PhotoGlass params={params} notify={notify} />}
      {tab === "calendar" && <CalendarMaker params={params} notify={notify} />}
      {tab === "print" && <PrintPoster params={params} notify={notify} />}
      {tab === "brand" && <BrandKit params={params} notify={notify} />}
    </section>
  );
}
