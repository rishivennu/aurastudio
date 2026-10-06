"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { InstallButton } from "./Pwa";

const LINKS = [
  { href: "/create", label: "Studio" },
  { href: "/explore", label: "Explore" },
  { href: "/daily", label: "Daily" },
  { href: "/community", label: "Community" },
  { href: "/palettes", label: "Palettes" },
];
const MORE = [
  { href: "/#spotlight", label: "Spotlight" },
  { href: "/saved", label: "Saved" },
  { href: "/style", label: "All styles" },
  { href: "/palette", label: "All palettes" },
  { href: "/brand", label: "Brand kit" },
  { href: "/embed", label: "Embed" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/#how", label: "How it works" },
];

export default function Nav() {
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => !href.includes("#") && (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className={`nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="nav-pill">
        <a href="/" className="nav-brand" onClick={close}>
          <span className="flix-logo" aria-hidden="true" />
          aura<span className="brand-light">.studio</span>
        </a>

        <nav className="nav-seg" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={`seg ${isActive(l.href) ? "active" : ""}`}
              aria-current={isActive(l.href) ? "page" : undefined}>{l.label}</a>
          ))}
        </nav>

        <div className="nav-right">
          <a className="nav-icon" href="/explore" aria-label="Search wallpapers">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg>
          </a>
          <InstallButton className="nav-icon nav-install" label="" />
          <ThemeToggle />
          <a className="nav-acct" href="/saved" aria-label="Your saved collection">
            <span className="flix-avatar" aria-hidden="true">
              <span className="flix-avatar-glyph">a</span>
              <i className="flix-dot" />
            </span>
            <span className="flix-pro" aria-hidden="true">PRO</span>
          </a>
          <button
            className={`m-burger nav-burger ${open ? "open" : ""}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {open && (
        <>
          <button className="m-scrim" aria-label="Close menu" onClick={close} />
          <nav className="m-drawer" aria-label="Mobile navigation">
            <a href="/" onClick={close}>Home</a>
            {LINKS.map((l) => <a key={l.href} href={l.href} onClick={close}>{l.label}</a>)}
            {MORE.map((l) => <a key={l.href} href={l.href} onClick={close}>{l.label}</a>)}
            <InstallButton className="m-install" onDone={close} />
            <a className="btn grad m-drawer-cta" href="/create" onClick={close}>Generate yours</a>
          </nav>
        </>
      )}
    </header>
  );
}
