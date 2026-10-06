"use client";
import { useEffect, useRef } from "react";
import { GenParams } from "@/lib/engine";
import { buildLive, drawLive } from "@/lib/live";

/** A canvas that animates the wallpaper as a seamless live loop while `playing`. */
export default function LiveCanvas({ params, w, h, playing, seconds = 8, className, ariaLabel }: {
  params: GenParams; w: number; h: number; playing: boolean; seconds?: number; className?: string; ariaLabel?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phase = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    c.width = w; c.height = h;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const scene = buildLive(params, w, h);
    drawLive(ctx, w, h, scene, phase.current);
    if (!playing) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      phase.current = (phase.current + (now - last) / (seconds * 1000)) % 1;
      last = now;
      drawLive(ctx, w, h, scene, phase.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [params, w, h, playing, seconds]);
  return <canvas ref={ref} className={className} aria-label={ariaLabel} role={ariaLabel ? "img" : undefined} />;
}
