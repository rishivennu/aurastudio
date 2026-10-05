"use client";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <nav className="nav">
      <div className="nav-inner wrap">
        <a href="/" className="brand" onClick={close}>
          <span className="brand-dot" aria-hidden="true" />
          aura<span className="brand-light">.studio</span>
        </a>
        <div className="nav-links">
          <a href="/#how">How it works</a>
          <a href="/create">Create</a>
          <a href="/#gallery">Gallery</a>
          <a href="/explore">Explore</a>
          <a href="/dashboard">Dashboard</a>
        </div>
        <div className="nav-right">
          <ThemeToggle />
          <a href="/create" className="btn sm nav-gen">Generate</a>
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
            <a href="/#how" onClick={close}>How it works</a>
            <a href="/create" onClick={close}>Create</a>
            <a href="/#gallery" onClick={close}>Gallery</a>
            <a href="/explore" onClick={close}>Explore</a>
            <a href="/dashboard" onClick={close}>Dashboard</a>
            <a className="btn grad m-drawer-cta" href="/create" onClick={close}>Generate yours</a>
          </nav>
        </>
      )}
    </nav>
  );
}
