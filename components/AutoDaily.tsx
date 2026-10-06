"use client";
import { useEffect, useState } from "react";
import { DEVICES } from "@/lib/presets";

const PICK = ["phone", "pixel", "desktop", "laptop", "macbook", "ultrawide", "ipadpro", "tablet"];
const OSES = [
  { id: "ios", name: "iPhone" }, { id: "android", name: "Android" },
  { id: "windows", name: "Windows" }, { id: "mac", name: "Mac" },
] as const;
type Os = (typeof OSES)[number]["id"];

/** Set-and-forget: a stable image URL plus per-OS recipes that pull it every morning. */
export default function AutoDaily() {
  const [os, setOs] = useState<Os>("ios");
  const [dev, setDev] = useState("phone");
  const [tz, setTz] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(location.origin);
    try { setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || ""); } catch {}
    const ua = navigator.userAgent;
    const o: Os = /iPhone|iPad/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : /Mac/.test(ua) ? "mac" : "windows";
    setOs(o); setDev(o === "ios" ? "phone" : o === "android" ? "pixel" : o === "mac" ? "macbook" : "desktop");
  }, []);

  const tzq = tz ? `&tz=${encodeURIComponent(tz)}` : "";
  const url = `${origin}/api/daily?device=${dev}${tzq}`;
  const script = (o: "windows" | "mac") => `/api/daily/script?os=${o}&device=${dev}${tzq}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  const devs = DEVICES.filter((d) => PICK.includes(d.id));

  return (
    <section className="ad glass" aria-labelledby="ad-h">
      <div className="ad-head">
        <div>
          <span className="kicker">Set and forget</span>
          <h3 id="ad-h">Change my wallpaper automatically, every morning</h3>
          <p className="hint">One link always returns today&apos;s drop at full size. Point your phone or computer at it once and it updates itself at 7am{tz ? `, ${tz} time` : ""}.</p>
        </div>
      </div>

      <div className="ex-modes" role="group" aria-label="Your device">
        {OSES.map((o) => (
          <button key={o.id} className="ex-mode" aria-pressed={os === o.id} onClick={() => setOs(o.id)}>{o.name}</button>
        ))}
      </div>

      <label className="lbl" htmlFor="ad-dev">Screen size</label>
      <select id="ad-dev" className="ad-sel" value={dev} onChange={(e) => setDev(e.target.value)}>
        {devs.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.w}×{d.h}</option>)}
      </select>

      <div className="ad-url">
        <code aria-label="Daily image link">{url}</code>
        <button className="btn ghost sm" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
        <a className="btn ghost sm" href={url} target="_blank" rel="noopener">Preview</a>
      </div>
      <span className="sr-only" aria-live="polite">{copied ? "Link copied" : ""}</span>

      {os === "ios" && (
        <ol className="ad-steps">
          <li>Copy the link above, then open the <b>Shortcuts</b> app and tap <b>Automation</b>, then <b>New Automation</b>.</li>
          <li>Choose <b>Time of Day</b>, set <b>7:00 AM</b>, <b>Daily</b>, and pick <b>Run Immediately</b>.</li>
          <li>Add the action <b>Get Contents of URL</b> and paste the link.</li>
          <li>Add <b>Set Wallpaper</b> (or <b>Switch Wallpaper</b>), choose Lock Screen, Home Screen or both, and turn off <b>Show Preview</b>.</li>
          <li>Tap <b>Done</b>. Run it once by hand to check, then it runs by itself.</li>
        </ol>
      )}
      {os === "android" && (
        <ol className="ad-steps">
          <li>Install an automation app such as <b>MacroDroid</b> or <b>Tasker</b>.</li>
          <li>Create a trigger: <b>Day/Time</b>, every day at 7:00.</li>
          <li>Add an action: <b>HTTP Request</b> (GET) with the link above, saving the response to a file, for example <code>aura.jpg</code>.</li>
          <li>Add <b>Set Wallpaper</b> using that file, for home and lock screen.</li>
        </ol>
      )}
      {os === "windows" && (
        <div className="ad-os">
          <a className="btn grad sm" href={script("windows")} download>Download aura-daily.ps1</a>
          <ol className="ad-steps">
            <li>Open the folder you saved it to, right-click <code>aura-daily.ps1</code> and choose <b>Run with PowerShell</b>.</li>
            <li>It sets today&apos;s wallpaper now and adds a scheduled task that runs every morning at 7, or as soon as the PC wakes.</li>
            <li>To stop: <code>powershell -ExecutionPolicy Bypass -File &quot;%LOCALAPPDATA%\aura\aura-daily.ps1&quot; -Uninstall</code></li>
          </ol>
          <p className="hint">Plain text, no installer and no admin rights. Open it in Notepad first if you want to read what it does.</p>
        </div>
      )}
      {os === "mac" && (
        <div className="ad-os">
          <a className="btn grad sm" href={script("mac")} download>Download aura-daily.sh</a>
          <ol className="ad-steps">
            <li>Open Terminal and run <code>sh ~/Downloads/aura-daily.sh install</code></li>
            <li>macOS asks once to let Terminal control System Events. Allow it, so the script can change the desktop picture.</li>
            <li>To stop: <code>sh ~/Library/&quot;Application Support&quot;/aura/aura-daily.sh uninstall</code></li>
          </ol>
          <p className="hint">Uses a LaunchAgent at 7am, curl and AppleScript. Nothing else is installed.</p>
        </div>
      )}
    </section>
  );
}
