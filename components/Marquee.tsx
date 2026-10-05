"use client";
export default function Marquee({ text, items }: { text?: string; items?: string[] }) {
  const list = items ?? Array(8).fill(text ?? "GENERATE YOUR WALLPAPER");
  const row = [...list, ...list];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((t, i) => (
          <span key={i} className="marquee-item">{t}<i className="marquee-dot" /></span>
        ))}
      </div>
    </div>
  );
}
