"use client";
import { useEffect, useMemo, useState } from "react";
import { GenParams } from "@/lib/engine";
import { PALETTES } from "@/lib/presets";
import { exportWallpaper, exportBatchZip } from "@/lib/exporter";
import { hashSeed, mulberry32 } from "@/lib/prng";
import GalleryCard from "./GalleryCard";

type Dev = { id: string; name: string; w: number; h: number };

export default function BatchTen({
  base, device, format, onPick,
}: {
  base: GenParams; device: Dev; format: "png" | "jpeg";
  onPick: (p: GenParams) => void;
}) {
  const [batchSeed, setBatchSeed] = useState("MIX01");
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  // the ten chosen palette ids — editable per card
  const [ids, setIds] = useState<string[]>([]);
  // index of the card most recently swapped, so only that one plays the swap animation
  const [swapped, setSwapped] = useState<number | null>(null);

  // (re)build the set of ten whenever the seed changes
  useEffect(() => {
    const r = mulberry32(hashSeed(batchSeed));
    const picked = [...PALETTES].sort(() => r() - 0.5).slice(0, 10).map((p) => p.id);
    setIds(picked);
    setSwapped(null);
  }, [batchSeed]);

  const items = useMemo<GenParams[]>(
    () => ids.map((id) => ({ ...base, paletteId: id, seed: batchSeed, text: "" })),
    [ids, batchSeed, base.styleId, base.keywords, base.intensity, base.grainOn]
  );

  // replace ONE card with a palette not already in the set
  const swapOne = (index: number) => {
    setSwapped(index);
    setIds((cur) => {
      const used = new Set(cur);
      const pool = PALETTES.filter((p) => !used.has(p.id));
      if (pool.length === 0) return cur;
      const pick = pool[Math.floor(Math.random() * pool.length)].id;
      const next = [...cur];
      next[index] = pick;
      return next;
    });
  };

  const downloadAll = async () => {
    setBusy(true);
    setProg(0);
    try {
      await exportBatchZip(items, device, format, (done) => setProg(done));
    } catch (e) {
      // fall back to individual downloads if zipping fails
      for (const p of items) { await exportWallpaper(p, device, format); await new Promise((r) => setTimeout(r, 300)); }
    }
    setBusy(false);
  };

  return (
    <>
      <div className="batch-head">
        <div>
          <span className="kicker">Batch · 10 at once</span>
          <h2 className="display" style={{ marginBottom: ".2em" }}>Ten palettes, one tap</h2>
          <p className="lead">Your current style across ten colour stories. Don’t like one? Hit <b>↻</b> on any card to swap it for a fresh palette, then download just that one, or grab the whole set as a <b>.zip</b>.</p>
        </div>
        <div className="row" style={{ alignItems: "center" }}>
          <button className="btn ghost sm" onClick={() => setBatchSeed(Math.random().toString(36).slice(2, 7).toUpperCase())}>Reshuffle all</button>
          <button className="btn grad sm" onClick={downloadAll} disabled={busy}>
            {busy ? `Zipping ${prog}/${items.length}…` : `Download all 10 (.zip) · ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
      <div className="grid">
        {items.map((p, i) => {
          const pal = PALETTES.find((x) => x.id === p.paletteId)!;
          return (
            <GalleryCard key={`${i}-${p.paletteId}`} params={p} label={pal.name}
              swatches={pal.colors}
              anim={swapped === i ? "swap" : "in"}
              onPick={() => onPick(p)}
              onSwap={() => swapOne(i)}
              onDownload={() => exportWallpaper(p, device, format)} />
          );
        })}
      </div>
    </>
  );
}
