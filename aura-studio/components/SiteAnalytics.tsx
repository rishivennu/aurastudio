"use client";
import { useEffect, useState } from "react";
import { track } from "@/lib/track";

const CONSENT = "aura-cookie-consent";

export default function SiteAnalytics() {
  const [consent, setConsent] = useState<string | null>("pending");

  useEffect(() => {
    // Count one visit per browser session.
    try {
      if (!sessionStorage.getItem("aura_visited")) {
        sessionStorage.setItem("aura_visited", "1");
        track({ visits: 1 });
      }
    } catch {}
    try {
      setConsent(localStorage.getItem(CONSENT));
    } catch {
      setConsent(null);
    }
  }, []);

  // Once accepted (now or previously), ask for location one time.
  useEffect(() => {
    if (consent !== "accepted") return;
    try {
      if (localStorage.getItem("aura_geo_done")) return;
    } catch {}
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try { localStorage.setItem("aura_geo_done", "1"); } catch {}
        const { latitude, longitude, accuracy } = pos.coords;
        fetch("/api/geo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            lat: Math.round(latitude * 1000) / 1000,
            lon: Math.round(longitude * 1000) / 1000,
            acc: Math.round(accuracy || 0),
          }),
          keepalive: true,
        }).catch(() => {});
      },
      () => { try { localStorage.setItem("aura_geo_done", "1"); } catch {} },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }, [consent]);

  const choose = (v: "accepted" | "declined") => {
    try { localStorage.setItem(CONSENT, v); } catch {}
    setConsent(v);
  };

  if (consent === "pending" || consent === "accepted" || consent === "declined") return null;

  return (
    <div className="cookie-bar" role="dialog" aria-label="Cookie consent">
      <div className="cookie-inner wrap">
        <p className="cookie-copy">
          <strong>We use cookies.</strong> aura.studio stores anonymous usage
          counts and, with your permission, your approximate location to improve
          the gallery. No personal data is sold.
        </p>
        <div className="cookie-acts">
          <button className="btn sm ghost" onClick={() => choose("declined")}>Decline</button>
          <button className="btn sm" onClick={() => choose("accepted")}>Accept</button>
        </div>
      </div>
    </div>
  );
}
