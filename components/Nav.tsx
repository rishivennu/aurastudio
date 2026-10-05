"use client";
import ThemeToggle from "./ThemeToggle";
export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner wrap">
        <a href="/" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          aura<span className="brand-light">.studio</span>
        </a>
        <div className="nav-links">
          <a href="/#how">How it works</a>
          <a href="/#generator">Generator</a>
          <a href="/#gallery">Gallery</a>
          <a href="/dashboard">Dashboard</a>
        </div>
        <div className="nav-right">
          <ThemeToggle />
          <a href="/#generator" className="btn sm">Generate</a>
        </div>
      </div>
    </nav>
  );
}
