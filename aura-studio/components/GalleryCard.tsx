"use client";
import { useEffect, useRef } from "react";
import { render, GenParams } from "@/lib/engine";

export default function GalleryCard({
  params, label, onPick, onDownload, onSwap, anim, swatches,
}: {
  params: GenParams; label: string;
  onPick?: () => void; onDownload?: () => void; onSwap?: () => void;
  anim?: "in" | "swap"; swatches?: string[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    c.width = 360; c.height = 640;
    const ctx = c.getContext("2d"); if (!ctx) return;
    render(ctx, c.width, c.height, params);
  }, [params]);
  return (
    <div className={`card${anim === "swap" ? " card-swap-in" : anim === "in" ? " card-fade-in" : ""}`}>
      <canvas ref={ref} onClick={onPick} role={onPick ? "button" : undefined}
        aria-label={onPick ? `Load preset ${label}` : label} />
      <span className="tag">
        {swatches && (
          <span className="tag-sw" aria-hidden="true">
            {swatches.slice(0, 4).map((c, i) => <i key={i} style={{ background: c }} />)}
          </span>
        )}
        {label}
      </span>
      <div className="card-acts">
        {onSwap && (
          <button className="dl swap" onClick={onSwap} aria-label={`Replace ${label} with another palette`} title="Replace with another">↻</button>
        )}
        {onDownload && (
          <button className="dl" onClick={onDownload} aria-label={`Download ${label}`} title="Download">↓</button>
        )}
      </div>
    </div>
  );
}
