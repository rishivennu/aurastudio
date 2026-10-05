"use client";
import Nav from "@/components/Nav";
import Studio from "@/components/Studio";
import Reveal from "@/components/Reveal";

export default function Create() {
  return (
    <>
      <Nav />
      <main className="create">
        <div className="wrap">
          <header className="create-head">
            <Reveal variant="up">
              <span className="kicker">The studio</span>
              <h1 className="create-title">Make one <span className="pop">yours</span>.</h1>
              <p className="lead">Pick a style, play with the palette, drag the glow. Everything renders locally in your browser, pixel for pixel. Nothing is uploaded.</p>
            </Reveal>
          </header>
          <Studio />
        </div>
      </main>
    </>
  );
}
