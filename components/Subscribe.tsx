"use client";
import { useEffect, useState } from "react";

/** Monday email signup. Hides itself quietly when the site has no mail set up. */
export default function Subscribe({ compact = false }: { compact?: boolean }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    fetch("/api/subscribe").then((r) => r.json()).then((j) => setEnabled(!!j.enabled)).catch(() => setEnabled(false));
    const u = new URLSearchParams(location.search).get("unsub");
    if (u === "1") { setState("done"); setMsg("You're unsubscribed. No more Monday emails."); }
    if (u === "0") { setState("err"); setMsg("That unsubscribe link did not work. Reply to any email and we'll remove you."); }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hp = (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>("input[name=website]")?.value;
    setState("busy"); setMsg("");
    try {
      const r = await fetch("/api/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, website: hp }) });
      const j = await r.json();
      if (j.ok) { setState("done"); setMsg("You're in. Check your inbox; new sign-ups get a welcome note."); setEmail(""); }
      else { setState("err"); setMsg(j.error || "Something went wrong."); }
    } catch { setState("err"); setMsg("Could not reach the server."); }
  };

  if (enabled === null) return null;
  return (
    <section className={`sub ${compact ? "sub-compact" : "glass"}`} aria-label="Weekly email">
      {!compact && (
        <div className="sub-copy">
          <h3>Seven wallpapers, every Monday</h3>
          <p className="hint">The week's daily drops in one email. Nothing else, unsubscribe in one click.</p>
        </div>
      )}
      {enabled ? (
        <form className="sub-form" onSubmit={submit}>
          <label htmlFor={compact ? "sub-e2" : "sub-e"} className={compact ? "sub-lbl" : "sr-only"}>{compact ? "Monday email" : "Email address"}</label>
          <input id={compact ? "sub-e2" : "sub-e"} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" maxLength={254} />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sub-hp" aria-hidden="true" />
          <button className="btn grad sm" type="submit" disabled={state === "busy"}>{state === "busy" ? "Joining…" : "Subscribe"}</button>
        </form>
      ) : (
        !compact && <p className="hint">Email drops are not switched on for this site yet.</p>
      )}
      {msg && <p className={`sub-msg ${state === "err" ? "bad" : ""}`} role={state === "err" ? "alert" : "status"}>{msg}</p>}
    </section>
  );
}
