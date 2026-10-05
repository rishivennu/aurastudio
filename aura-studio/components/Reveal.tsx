"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  delay?: number;          // ms stagger
  variant?: "up" | "fade" | "scale" | "left";
  className?: string;
};

/** Scroll-reveal wrapper. Respects prefers-reduced-motion. */
export default function Reveal({ children, as = "div", delay = 0, variant = "up", className = "" }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as any;
  return (
    <Tag
      ref={ref as any}
      className={`reveal rv-${variant} ${shown ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
