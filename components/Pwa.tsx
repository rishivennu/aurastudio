"use client";
import { useEffect, useState } from "react";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: BIP | null = null;
const subs = new Set<(v: boolean) => void>();
const emit = () => subs.forEach((f) => f(!!deferred));

/** Registers the service worker once and captures the browser's install prompt. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const on = (e: Event) => { e.preventDefault(); deferred = e as BIP; emit(); };
    const done = () => { deferred = null; emit(); };
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  return null;
}

/** Shows only when the browser says the app can be installed. */
export function InstallButton({ className, label = "Install app", onDone }: { className?: string; label?: string; onDone?: () => void }) {
  const [can, setCan] = useState(false);
  useEffect(() => { setCan(!!deferred); subs.add(setCan); return () => { subs.delete(setCan); }; }, []);
  if (!can) return null;
  return (
    <button className={className} aria-label="Install aura.studio as an app" onClick={async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null; emit(); onDone?.();
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
      <span>{label}</span>
    </button>
  );
}
