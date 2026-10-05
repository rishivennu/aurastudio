"use client";
import { useState } from "react";
import Nav from "@/components/Nav";

type Stats = Record<string, number>;
type Geo = { lat: number | null; lon: number | null; acc: number | null; city: string | null; region: string | null; country: string | null; ts: number };

export default function Admin() {
  const [pass, setPass] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [stats, setStats] = useState<Stats>({});
  const [geo, setGeo] = useState<Geo[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pass }),
      });
      if (r.status === 401) { setErr("Wrong password."); setBusy(false); return; }
      const j = await r.json();
      let s: Stats = {};
      if (j.configured && j.stats && Object.keys(j.stats).length) {
        for (const [k, v] of Object.entries(j.stats)) s[k] = Number(v) || 0;
        setConfigured(true);
      } else {
        try { s = JSON.parse(localStorage.getItem("aura_stats") || "{}"); } catch {}
        setConfigured(false);
      }
      setStats(s);
      setGeo(Array.isArray(j.geo) ? j.geo : []);
      setUnlocked(true);
    } catch {
      setErr("Could not reach the server.");
    }
    setBusy(false);
  }

  if (!unlocked) {
    return (
      <>
        <Nav />
        <main className="wrap section">
          <span className="kicker">Restricted</span>
          <h2 className="display">Admin access</h2>
          <p className="lead">Enter the admin password to view live analytics.</p>
          <form onSubmit={submit} className="admin-gate">
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Password"
              className="admin-input"
              autoFocus
            />
            <button className="btn" disabled={busy}>{busy ? "Checking…" : "Unlock"}</button>
          </form>
          {err && <p className="admin-err">{err}</p>}
        </main>
      </>
    );
  }

  const num = (k: string) => stats[k] || 0;
  const top = (prefix: string) =>
    Object.entries(stats)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => [k.replace(prefix, ""), v] as [string, number])
      .sort((a, b) => b[1] - a[1]);

  return (
    <>
      <Nav />
      <main className="wrap section">
        <span className="kicker">Admin · Live analytics</span>
        <h2 className="display">Dashboard</h2>
        <p className="lead">
          {configured
            ? "Live from Vercel KV — aggregated across all visitors."
            : "Local telemetry (this browser). Add Vercel KV env vars for global stats + location."}
        </p>

        <div className="stat-grid">
          <div className="stat"><span className="stat-k">Visits</span><span className="stat-v">{num("visits").toLocaleString()}</span><span className="stat-s">sessions</span></div>
          <div className="stat"><span className="stat-k">Downloads</span><span className="stat-v">{num("downloads").toLocaleString()}</span><span className="stat-s">wallpaper exports</span></div>
          <div className="stat"><span className="stat-k">Generations</span><span className="stat-v">{num("generations").toLocaleString()}</span><span className="stat-s">renders</span></div>
          <div className="stat"><span className="stat-k">Located</span><span className="stat-v">{num("located").toLocaleString()}</span><span className="stat-s">shared location</span></div>
        </div>

        <div className="two-col">
          <div>
            <h3 className="sub-h">Top palettes</h3>
            {top("pal_").length ? <Bars rows={top("pal_")} /> : <p className="muted">No data yet.</p>}
          </div>
          <div>
            <h3 className="sub-h">Top styles</h3>
            {top("style_").length ? <Bars rows={top("style_")} /> : <p className="muted">No data yet.</p>}
          </div>
        </div>

        <h3 className="sub-h">Visitor locations</h3>
        {geo.length ? (
          <div className="geo-wrap">
            <table className="geo-table">
              <thead><tr><th>When</th><th>City</th><th>Region</th><th>Country</th><th>Lat</th><th>Lon</th></tr></thead>
              <tbody>
                {geo.map((g, i) => (
                  <tr key={i}>
                    <td>{new Date(g.ts).toLocaleString()}</td>
                    <td>{g.city || "—"}</td>
                    <td>{g.region || "—"}</td>
                    <td>{g.country || "—"}</td>
                    <td>{g.lat ?? "—"}</td>
                    <td>{g.lon ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            No locations yet. {configured ? "They appear once a visitor accepts cookies and grants location." : "Location logging requires Vercel KV."}
          </p>
        )}
      </main>
    </>
  );
}

function Bars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(...rows.map((r) => r[1]), 1);
  return (
    <ul className="bars">
      {rows.map(([k, v]) => (
        <li key={k}>
          <span className="bars-k">{k}</span>
          <span className="bars-track"><span className="bars-fill" style={{ width: `${(v / max) * 100}%` }} /></span>
          <span className="bars-v">{v}</span>
        </li>
      ))}
    </ul>
  );
}
