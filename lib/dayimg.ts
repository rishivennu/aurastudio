import { DEVICES } from "./presets";

/** today's date in an IANA time zone, as a local Date at noon (so dailyParams reads the right day) */
export function dayIn(tz: string | null): Date {
  let zone = "UTC";
  if (tz) { try { new Intl.DateTimeFormat("en", { timeZone: tz }); zone = tz; } catch {} }
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export const validTz = (tz: string | null) => { if (!tz || tz.length > 64) return null; try { new Intl.DateTimeFormat("en", { timeZone: tz }); return tz; } catch { return null; } };
// server renders cap at ~10 MP (4K desktop is 8.3); bigger sizes like 8K TV stay browser-only
export const deviceById = (id: string | null) => DEVICES.find((d) => d.id === id && d.w * d.h <= 10_000_000) || DEVICES.find((d) => d.id === "phone")!;
