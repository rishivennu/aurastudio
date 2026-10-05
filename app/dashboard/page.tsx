"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";

type Stats = Record<string, number>;

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({});
  const [source, setSource] = useState<"kv" | "local" | "loading">("loading");

  useEffect(() => {
    (async () => {
      let local: Stats = {};
      try { local = JSON.parse(localStorage.getItem("aura_stats") || "{}"); } catch {}
      try {
        const r = await fetch("/api/stats", { cache: "no-store" });
        const j = await r.json();
        if (j.configured && j.stats && Object.keys(j.stats).length) {
          const s: Stats = {};
          for (const [k, v] of Object.entries(j.stats)) s[k] = Number(v) || 0;
          setStats(s); setSource("kv"); return;
        }
      } catch {}
      setStats(local); setSource("local");
    })();
  }, []);

  const gens = stats.generations || 0;
  const avg = gens ? Math.round((stats.ms_total || 0) / gens) : 0;
  const top = (prefix: string) =>
    Object.entries(stats)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => [k.replace(prefix, ""), v] as [string, number])
      .sort((a, b) => b[1] - a[1]);
  const palettes = top("pal_");
  const styles = top("style_");

  return (
    <>
      <Nav />
      <main className="wrap section">
        <span className="kicker">Admin · Analytics</span>
        <h2 className="display">Dashboard</h2>
        <p className="lead">
          {source === "loading" ? "Loading…"
            : source === "kv" ? "Live from Vercel KV — aggregated across all visitors."
            : "Local telemetry (this browser). Add Vercel KV env vars to go global."}
        </p>

        <div className="stat-grid">
          <div className="stat"><span className="stat-k">Generations</span><span className="stat-v">{gens.toLocaleString()}</span><span className="stat-s">total exports</span></div>
          <div className="stat"><span className="stat-k">Avg render</span><span className="stat-v">{avg}<small>ms</small></span><span className="stat-s">per full-res export</span></div>
          <div className="stat"><span className="stat-k">Palettes</span><span className="stat-v">{palettes.length}</span><span className="stat-s">distinct used</span></div>
          <div className="stat"><span className="stat-k">Source</span><span className="stat-v" style={{fontSize:"1.6rem"}}>{source === "kv" ? "KV" : "Local"}</span><span className="stat-s">{source === "kv" ? "Vercel Redis" : "browser only"}</span></div>
        </div>

        <div className="two-col">
          <div>
            <h3 className="sub-h">Top palettes</h3>
            {palettes.length ? <Bars rows={palettes} /> : <p className="muted">No data yet.</p>}
          </div>
          <div>
            <h3 className="sub-h">Top styles</h3>
            {styles.length ? <Bars rows={styles} /> : <p className="muted">No data yet.</p>}
          </div>
        </div>

        <div className="note">
          <strong>Enable global analytics:</strong> in Vercel, add a KV (Upstash Redis) store,
          then set <code>KV_REST_API_URL</code> and <code>KV_REST_API_TOKEN</code> in Project
          Settings → Environment Variables. Redeploy. No code change needed.
        </div>
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
