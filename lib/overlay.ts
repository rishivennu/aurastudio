import { render, GenParams } from "./engine";
import { lumHex } from "./color";

export type OvMode = "calendar" | "quote" | "goals";
export type OvFont = "display" | "serif" | "mono";
export type OvOpts = {
  mode: OvMode; font: OvFont; month: Date; today?: Date; mondayFirst: boolean;
  title: string; body: string; card: boolean; place: "middle" | "lower";
};

const FONTS: Record<OvFont, string> = {
  display: '"Bricolage Grotesque", "Segoe UI", sans-serif',
  serif: '"Fraunces", Georgia, serif',
  mono: '"Space Grotesk", ui-monospace, monospace',
};

export async function ensureFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    document.fonts.load('700 48px "Bricolage Grotesque"'), document.fonts.load('500 48px "Bricolage Grotesque"'),
    document.fonts.load('italic 400 48px "Fraunces"'), document.fonts.load('500 48px "Space Grotesk"'),
  ].map((p) => p.catch(() => null)));
}

/** where text may go without fighting the lock-screen clock, widgets, dock, menu bar or taskbar */
export function safeZone(W: number, H: number, place: OvOpts["place"]) {
  if (H > W) {
    const x = W * 0.08, w = W * 0.84;
    return place === "middle" ? { x, y: H * 0.36, w, h: H * 0.4 } : { x, y: H * 0.5, w, h: H * 0.34 };
  }
  // desktop: right-hand side, clear of left-column desktop icons, the menu bar and the taskbar
  const w = Math.min(W * 0.36, H * 0.75);
  return place === "middle" ? { x: W * 0.94 - w, y: H * 0.18, w, h: H * 0.64 } : { x: W * 0.94 - w, y: H * 0.42, w, h: H * 0.46 };
}

function areaLum(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  try {
    const d = ctx.getImageData(Math.max(0, x | 0), Math.max(0, y | 0), Math.max(1, w | 0), Math.max(1, h | 0)).data;
    let t = 0, n = 0;
    for (let i = 0; i < d.length; i += 4 * 97) { t += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++; }
    return t / n / 255;
  } catch { return 0.3; }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const t = line ? line + " " + word : word;
      if (ctx.measureText(t).width > max && line) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** draws the block; returns its height (also used as a dry-run measure) */
function block(ctx: CanvasRenderingContext2D, o: OvOpts, x: number, y: number, w: number, ink: string, accent: string, onAccent: string, draw: boolean, k = 1) {
  const F = FONTS[o.font];
  const unit = (w / 20) * k;
  let cy = y;
  const put = (font: string, txt: string, px: number, align: CanvasTextAlign = "left", color = ink, alpha = 1) => {
    ctx.font = font; ctx.textAlign = align; ctx.fillStyle = color; ctx.globalAlpha = alpha;
    if (draw) ctx.fillText(txt, align === "center" ? x + w / 2 : align === "right" ? x + w : px, cy);
    ctx.globalAlpha = 1;
  };
  ctx.textBaseline = "alphabetic";
  const weight = o.font === "serif" ? "italic 400" : o.font === "mono" ? "500" : "700";

  if (o.mode === "calendar") {
    const m = o.month, yr = m.getFullYear(), mo = m.getMonth();
    const head = m.toLocaleDateString(undefined, { month: "long" });
    const tSize = unit * 2.3;
    cy += tSize; put(`${weight} ${tSize}px ${F}`, head, x);
    ctx.font = `500 ${unit * 0.9}px ${FONTS.mono}`;
    put(`500 ${unit * 0.9}px ${FONTS.mono}`, String(yr), x, "right", ink, 0.7);
    cy += unit * 1.4;
    const days = o.mondayFirst ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"];
    const cw = w / 7;
    cy += unit * 0.9;
    days.forEach((d, i) => { ctx.font = `600 ${unit * 0.8}px ${FONTS.mono}`; ctx.textAlign = "center"; ctx.fillStyle = ink; ctx.globalAlpha = 0.6; if (draw) ctx.fillText(d, x + cw * i + cw / 2, cy); ctx.globalAlpha = 1; });
    const first = new Date(yr, mo, 1).getDay(), off = o.mondayFirst ? (first + 6) % 7 : first;
    const n = new Date(yr, mo + 1, 0).getDate();
    const t = o.today && o.today.getFullYear() === yr && o.today.getMonth() === mo ? o.today.getDate() : -1;
    const rh = unit * 2;
    cy += unit * 0.6;
    for (let d = 1; d <= n; d++) {
      const k = d - 1 + off, c = k % 7, r = Math.floor(k / 7);
      const cx = x + cw * c + cw / 2, yy = cy + r * rh + rh * 0.62;
      if (d === t && draw) {
        ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx, yy - unit * 0.36, unit * 0.92, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = `${d === t ? 700 : 500} ${unit * 1.0}px ${FONTS.mono}`; ctx.textAlign = "center";
      ctx.fillStyle = d === t ? onAccent : ink; const wk = o.mondayFirst ? c >= 5 : c === 0 || c === 6;
      ctx.globalAlpha = d === t ? 1 : wk ? 0.62 : 0.92;
      if (draw) ctx.fillText(String(d), cx, yy);
      ctx.globalAlpha = 1;
    }
    cy += Math.ceil((n + off) / 7) * rh + unit * 0.4;
    if (o.body.trim()) {
      const bs = unit * 0.95; ctx.font = `500 ${bs}px ${F}`;
      for (const l of wrap(ctx, o.body.trim(), w).slice(0, 3)) { cy += bs * 1.35; put(`${o.font === "serif" ? "italic 400" : "500"} ${bs}px ${F}`, l, x, "left", ink, 0.9); }
    }
  } else if (o.mode === "quote") {
    const q = o.body.trim() || "Make it simple, but significant.";
    const len = q.length, qs = unit * (len < 40 ? 2.1 : len < 90 ? 1.6 : 1.25);
    ctx.font = `${weight} ${qs}px ${F}`;
    const lines = wrap(ctx, `“${q}”`, w).slice(0, 8);
    for (const l of lines) { cy += qs * 1.2; put(`${weight} ${qs}px ${F}`, l, x); }
    if (o.title.trim()) { cy += unit * 1.6; put(`500 ${unit * 0.85}px ${FONTS.mono}`, o.title.trim().toUpperCase(), x, "left", ink, 0.75); }
  } else {
    const ts = unit * 1.9;
    cy += ts; put(`${weight} ${ts}px ${F}`, o.title.trim() || "This year", x);
    cy += unit * 0.5;
    const items = o.body.split(/\n/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
    const gs = unit * 0.98;
    for (const it of items.length ? items : ["Read 12 books", "Run a half marathon", "Ship the side project"]) {
      ctx.font = `500 ${gs}px ${F}`;
      const ls = wrap(ctx, it, w - unit * 1.8).slice(0, 2);
      cy += gs * 1.9;
      if (draw) { ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, unit * 0.09); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(x + unit * 0.5, cy - gs * 0.34, unit * 0.42, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
      ls.forEach((l, i) => { if (i) cy += gs * 1.3; put(`500 ${gs}px ${F}`, l, x + unit * 1.6); });
    }
  }
  return cy - y + unit * 0.6;
}

export function renderOverlay(ctx: CanvasRenderingContext2D, W: number, H: number, p: GenParams, o: OvOpts, accent: string) {
  render(ctx, W, H, { ...p, text: "" });
  const z = safeZone(W, H, o.place);
  const pad = o.card ? z.w * 0.07 : 0;
  const iw = z.w - pad * 2;
  const L = areaLum(ctx, z.x, z.y, z.w, z.h);
  const dark = o.card ? false : L > 0.62;
  const ink = dark ? "#121216" : "#ffffff";
  const lum = lumHex;
  const onAccent = lum(accent) > 0.6 ? "#121216" : "#ffffff";
  let k = 1;
  let bh = block(ctx, o, z.x + pad, 0, iw, ink, accent, onAccent, false) + pad * 2;
  // too tall for the safe zone (long goal lists, long quotes): shrink the type to fit
  if (bh > z.h) { k = Math.max(0.6, (z.h - pad * 2) / (bh - pad * 2)); bh = block(ctx, o, z.x + pad, 0, iw, ink, accent, onAccent, false, k) + pad * 2; }
  const top = o.place === "middle" ? z.y + Math.max(0, (z.h - bh) / 2) : z.y + Math.max(0, z.h - bh);
  if (o.card) {
    // frosted card: blurred copy of what is under it, plus a light wash
    const r = z.w * 0.06;
    const k = 0.06, sm = document.createElement("canvas");
    sm.width = Math.max(1, Math.round(W * k)); sm.height = Math.max(1, Math.round(H * k));
    const sx = sm.getContext("2d")!; sx.imageSmoothingQuality = "high"; sx.drawImage(ctx.canvas, 0, 0, sm.width, sm.height);
    ctx.save(); rr(ctx, z.x, top, z.w, bh, r); ctx.clip();
    ctx.imageSmoothingQuality = "high"; ctx.drawImage(sm, 0, 0, W, H);
    ctx.fillStyle = "rgba(10,10,16,.38)"; ctx.fillRect(z.x, top, z.w, bh);
    ctx.restore();
    ctx.save(); rr(ctx, z.x, top, z.w, bh, r); ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = Math.max(1, W / 900); ctx.stroke(); ctx.restore();
  }
  ctx.save();
  ctx.shadowColor = dark ? "rgba(255,255,255,.25)" : "rgba(0,0,0,.35)"; ctx.shadowBlur = o.card ? 0 : z.w * 0.02;
  block(ctx, o, z.x + pad, top + pad, iw, ink, accent, onAccent, true, k);
  ctx.restore();
}

export async function overlayBlob(p: GenParams, o: OvOpts, accent: string, W: number, H: number): Promise<Blob> {
  await ensureFonts();
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  renderOverlay(c.getContext("2d")!, W, H, p, o, accent);
  return new Promise((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("Export failed"))), "image/png"));
}
