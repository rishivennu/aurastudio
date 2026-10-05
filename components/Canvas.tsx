"use client";
import { useEffect, useRef } from "react";
import { render, GenParams } from "@/lib/engine";

export default function Canvas({
  params, w, h, className, onClick, ariaLabel,
}: {
  params: GenParams; w: number; h: number;
  className?: string; onClick?: () => void; ariaLabel?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    c.width = w; c.height = h;
    const ctx = c.getContext("2d"); if (!ctx) return;
    render(ctx, w, h, params);
  }, [params, w, h]);
  return (
    <canvas ref={ref} className={className} onClick={onClick}
      role={onClick ? "button" : undefined} aria-label={ariaLabel} />
  );
}
