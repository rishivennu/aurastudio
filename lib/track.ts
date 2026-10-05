// Fire-and-forget telemetry. Writes to Vercel KV via /api/track when
// configured, and always mirrors to localStorage so the dashboard works
// locally and offline.
export function track(delta: Record<string, number>) {
  try {
    const k = "aura_stats";
    const s = JSON.parse(localStorage.getItem(k) || "{}");
    for (const [m, v] of Object.entries(delta)) s[m] = (s[m] || 0) + v;
    localStorage.setItem(k, JSON.stringify(s));
  } catch {}
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(delta),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
