import { h } from "./server";
import { dailyParams, dayKey } from "./daily";
import { encodeParams } from "./share";
import { PALETTES, STYLES } from "./presets";

export const SUBS = "aura:subs";
// a real secret is required so unsubscribe links cannot be forged
export const mailOn = () => !!process.env.RESEND_API_KEY && !!process.env.KV_REST_API_URL && (process.env.CRON_SECRET || "").length >= 16;
export const siteUrl = (fallback: string) => (process.env.NEXT_PUBLIC_SITE_URL || fallback).replace(/\/+$/, "");
export const validEmail = (e: string) => e.length <= 254 && /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i.test(e);
/** unsubscribe token: stable per address, unguessable without the server secret */
export const unsubToken = (email: string) => h("unsub|" + email + "|" + (process.env.CRON_SECRET || ""), 24);
export const unsubUrl = (site: string, email: string) => `${site}/api/subscribe?u=${encodeURIComponent(email)}&t=${unsubToken(email)}`;
const from = () => process.env.RESEND_FROM || "aura.studio <onboarding@resend.dev>";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export type Mail = { from: string; to: string[]; subject: string; html: string; text: string; headers?: Record<string, string> };

/** Resend batch endpoint: up to 100 emails per call */
export async function sendBatch(mails: Mail[], idem?: string, onChunk?: (next: number) => Promise<void>, start = 0, deadline = Infinity): Promise<{ sent: number; failed: number; next: number }> {
  let sent = 0, failed = 0, i = start;
  for (; i < mails.length; i += 100) {
    if (Date.now() > deadline) break;
    const chunk = mails.slice(i, i + 100);
    try {
      const r = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json", ...(idem ? { "Idempotency-Key": `${idem}-${i / 100}` } : {}) },
        body: JSON.stringify(chunk),
      });
      if (r.ok) sent += chunk.length; else failed += chunk.length;
    } catch { failed += chunk.length; }
    if (onChunk) await onChunk(i + 100);
    if (i + 100 < mails.length) await new Promise((r) => setTimeout(r, 700));
  }
  return { sent, failed, next: Math.min(i, mails.length) };
}

/** the seven most recent daily drops, oldest first */
export function lastWeek(now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i));
    const p = dailyParams(d);
    return {
      day: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
      key: dayKey(d), token: encodeParams(p),
      name: `${STYLES.find((s) => s.id === p.styleId)?.name} · ${PALETTES.find((x) => x.id === p.paletteId)?.name}`,
    };
  });
}

export function weeklyMail(site: string, email: string): Mail {
  const week = lastWeek();
  const un = unsubUrl(site, email);
  const cells = week.map((w) => `
    <td style="padding:6px;vertical-align:top;width:50%">
      <a href="${site}/create?w=${w.token}" style="text-decoration:none;color:#f4f4f6">
        <img src="${site}/api/og?w=${w.token}" width="260" alt="${esc(w.name)}" style="display:block;width:100%;max-width:260px;border-radius:14px;border:0" />
        <div style="font:600 13px/1.4 -apple-system,Segoe UI,sans-serif;margin-top:8px">${esc(w.day)}</div>
        <div style="font:12px/1.4 -apple-system,Segoe UI,sans-serif;color:#a5a5b0">${esc(w.name)}</div>
      </a>
    </td>`);
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(`<tr>${cells[i]}${cells[i + 1] || "<td></td>"}</tr>`);
  const html = `<!doctype html><html><body style="margin:0;background:#0b0b10;padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;color:#f4f4f6">
    <tr><td style="padding:6px 6px 18px">
      <div style="font:700 12px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#19d3ff">aura.studio weekly</div>
      <h1 style="font:700 28px/1.2 -apple-system,Segoe UI,sans-serif;margin:10px 0 6px">Last week's seven drops</h1>
      <p style="font:15px/1.5 -apple-system,Segoe UI,sans-serif;color:#c9c9d2;margin:0">One new wallpaper a day. Tap any of them to open it in the studio and download it in 4K.</p>
    </td></tr>
    <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table></td></tr>
    <tr><td style="padding:22px 6px">
      <a href="${site}/daily" style="display:inline-block;background:#7b6cff;color:#fff;font:600 15px/1 -apple-system,Segoe UI,sans-serif;padding:14px 22px;border-radius:999px;text-decoration:none">See today's drop</a>
    </td></tr>
    <tr><td style="padding:6px;font:12px/1.5 -apple-system,Segoe UI,sans-serif;color:#8a8a96">
      You get this because you signed up at aura.studio. <a href="${un}" style="color:#c9c9d2">Unsubscribe</a> with one click.
    </td></tr>
  </table></body></html>`;
  const text = `aura.studio weekly: last week's seven drops\n\n${week.map((w) => `${w.day}: ${w.name}\n${site}/create?w=${w.token}`).join("\n\n")}\n\nToday's drop: ${site}/daily\nUnsubscribe: ${un}\n`;
  return {
    from: from(), to: [email], subject: "Your seven aura wallpapers this week", html, text,
    headers: { "List-Unsubscribe": `<${un}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

export function welcomeMail(site: string, email: string): Mail {
  const un = unsubUrl(site, email);
  return {
    from: from(), to: [email], subject: "You're in: aura wallpapers every Monday",
    html: `<!doctype html><html><body style="margin:0;background:#0b0b10;padding:24px 12px;color:#f4f4f6;font:15px/1.5 -apple-system,Segoe UI,sans-serif">
      <div style="max-width:520px;margin:0 auto"><h1 style="font-size:24px;margin:0 0 10px">You're on the list.</h1>
      <p style="color:#c9c9d2">Every Monday you'll get the week's seven daily wallpapers in one email. No other mail, ever.</p>
      <p><a href="${site}/daily" style="color:#19d3ff">See today's drop</a></p>
      <p style="font-size:12px;color:#8a8a96">Didn't sign up? <a href="${un}" style="color:#c9c9d2">Unsubscribe</a>.</p></div></body></html>`,
    text: `You're on the list. Every Monday you'll get the week's seven daily wallpapers.\nToday's drop: ${site}/daily\nUnsubscribe: ${un}\n`,
    headers: { "List-Unsubscribe": `<${un}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}
