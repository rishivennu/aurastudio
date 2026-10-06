"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Nav from "@/components/Nav";
import Canvas from "@/components/Canvas";
import {
  loadSaved, removeSaved, Saved, Collection, loadCollections, createCollection, renameCollection,
  deleteCollection, toggleInCollection, saveMany, decodeSet, setUrl, encodeParams, SAVED_MAX,
} from "@/lib/share";
import type { GenParams } from "@/lib/engine";
import { exportWallpaper } from "@/lib/exporter";
import { DEVICES, STYLES, PALETTES } from "@/lib/presets";

const PHONE = DEVICES.find((d) => d.id === "phone") ?? DEVICES[0];
const DESKTOP = DEVICES.find((d) => d.id === "desktop") ?? DEVICES[0];

const nameOf = (p: GenParams) => {
  const st = STYLES.find((x) => x.id === p.styleId)?.name ?? p.styleId;
  const pal = p.customColors ? "Custom" : (PALETTES.find((x) => x.id === p.paletteId)?.name ?? "");
  return `${st} · ${pal}`;
};

const Ico = ({ d }: { d: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const I_X = "M6 6l12 12M18 6L6 18";
const I_FOLDER = "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 11v5M9.5 13.5h5";
const I_LINK = "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1";
const I_CHECK = "M5 12l5 5 9-10";

export default function SavedPage() {
  const [items, setItems] = useState<Saved[] | null>(null);
  const [cols, setCols] = useState<Collection[]>([]);
  const [view, setView] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState("");
  const [renameVal, setRenameVal] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [shared, setShared] = useState<{ name: string; items: GenParams[] } | null>(null);
  const [toast, setToast] = useState("");

  const refresh = () => { setItems(loadSaved()); setCols(loadCollections()); };
  useEffect(() => {
    refresh();
    const c = new URLSearchParams(location.search).get("c");
    if (c) {
      const s = decodeSet(c);
      if (s) setShared(s); else say("That shared link is broken or incomplete.");
    }
  }, []);
  useEffect(() => {
    if (!menu) return;
    // move focus into the popup; Escape closes it and hands focus back to its button
    menuRef.current?.querySelector<HTMLElement>("button, input")?.focus();
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(null); trigger.current?.focus(); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const say = (m: string) => { clearTimeout(timer.current); setToast(m); timer.current = setTimeout(() => setToast(""), 2200); };
  const active = cols.find((c) => c.id === view) || null;
  const ids = useMemo(() => new Set((items || []).map((s) => s.id)), [items]);
  const shown = useMemo(() => {
    if (!items) return null;
    if (!active) return items;
    const order = active.items.filter((i) => ids.has(i));
    return order.map((i) => items.find((s) => s.id === i)!).filter(Boolean);
  }, [items, active, ids]);
  const countIn = (c: Collection) => c.items.filter((i) => ids.has(i)).length;

  const remove = (id: string) => { removeSaved(id); refresh(); };
  const dl = async (p: GenParams, key: string, dev: typeof PHONE) => {
    setBusy(key + dev.id);
    try { await exportWallpaper(p, dev, "png"); } finally { setBusy(null); }
  };
  const create = (e: React.FormEvent, withItem?: string) => {
    e.preventDefault();
    const c = createCollection(newName || "New set", withItem ? [withItem] : []);
    setNewName(""); setCreating(false); refresh();
    if (!withItem) setView(c.id);
    say(withItem ? `Added to ${c.name}` : `${c.name} created`);
  };
  const copyLink = async (c: Collection) => {
    const list = c.items.filter((i) => ids.has(i)).map((i) => items!.find((s) => s.id === i)!.params);
    if (!list.length) { say("Add a wallpaper to this set first"); return; }
    const { url, count } = setUrl(c.name, list);
    try { await navigator.clipboard.writeText(url); say(count < list.length ? `Link copied with the first ${count} of ${list.length}` : "Share link copied"); }
    catch { window.prompt("Copy this link", url); }
  };
  const keepShared = () => {
    if (!shared) return;
    const have = new Set(loadSaved().map((s) => s.id));
    const adding = shared.items.filter((p) => !have.has(encodeParams(p))).length;
    const over = have.size + adding - SAVED_MAX;
    if (over > 0 && !confirm(`Saved holds ${SAVED_MAX} wallpapers. Keeping this set will remove your ${over} oldest. Continue?`)) return;
    const got = saveMany(shared.items);
    const c = createCollection(shared.name, got);
    setShared(null); history.replaceState(null, "", "/saved"); refresh(); setView(c.id);
    say(`Saved ${got.length} to ${c.name}`);
  };

  const card = (p: GenParams, id: string, mine: boolean) => (
    <figure key={id} className="saved-card">
      <a href={`/create?w=${mine ? id : encodeParams(p)}`} className="saved-thumb" aria-label={`Open ${nameOf(p)} in the studio`}>
        <Canvas params={p} w={270} h={480} className="saved-canvas" />
      </a>
      <figcaption>
        <span className="saved-nm">{nameOf(p)}</span>
        <div className="saved-acts">
          <button className="btn ghost sm" onClick={() => dl(p, id, PHONE)} disabled={busy === id + PHONE.id}>{busy === id + PHONE.id ? "…" : "Phone"}</button>
          <button className="btn ghost sm" onClick={() => dl(p, id, DESKTOP)} disabled={busy === id + DESKTOP.id}>{busy === id + DESKTOP.id ? "…" : "4K"}</button>
          {mine && (
            <span className="col-wrap">
              <button className="btn ghost sm saved-x" aria-haspopup="dialog" aria-expanded={menu === id} onClick={(e) => { trigger.current = e.currentTarget; setMenu(menu === id ? null : id); }} aria-label={`Add ${nameOf(p)} to a collection`}><Ico d={I_FOLDER} /></button>
              {menu === id && (
                <div ref={menuRef} className="col-menu glass" role="dialog" aria-label="Add to collection"
                  onBlur={(e) => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setMenu(null); }}>
                  {cols.map((c) => {
                    const on = c.items.includes(id);
                    return (
                      <button key={c.id} className="col-opt" aria-pressed={on} onClick={() => { const now = toggleInCollection(c.id, id); refresh(); say(now ? `Added to ${c.name}` : `Removed from ${c.name}`); }}>
                        <span className="col-box">{on && <Ico d={I_CHECK} />}</span>{c.name}
                      </button>
                    );
                  })}
                  <form className="col-new" onSubmit={(e) => { create(e, id); setMenu(null); trigger.current?.focus(); }}>
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New collection" maxLength={40} aria-label="New collection name" />
                    <button className="btn grad sm" type="submit">Add</button>
                  </form>
                </div>
              )}
            </span>
          )}
          {mine && <button className="btn ghost sm saved-x" onClick={() => remove(id)} aria-label={`Remove ${nameOf(p)}`}><Ico d={I_X} /></button>}
        </div>
      </figcaption>
    </figure>
  );

  return (
    <>
      <Nav />
      <main className="create saved" onClick={(e) => { if (menu && !(e.target as HTMLElement).closest(".col-wrap")) setMenu(null); }}>
        <div className="wrap">
          <header className="create-head">
            <span className="kicker">Your collection</span>
            <h1 className="create-title">Saved <span className="pop">glow</span>.</h1>
            <p className="lead">Wallpapers you hearted in the studio. Group them into collections and share a whole set with one link. They live in this browser only, so nothing is uploaded.</p>
          </header>

          {shared && (
            <section className="col-shared glass" aria-label={`Shared collection ${shared.name}`}>
              <div className="col-shared-head">
                <div>
                  <span className="kicker">Shared with you</span>
                  <h2>{shared.name}</h2>
                  <p className="hint">{shared.items.length} wallpaper{shared.items.length === 1 ? "" : "s"}. Download any of them, or keep the whole set.</p>
                </div>
                <div className="xt-row">
                  <button className="btn grad" onClick={keepShared}>Save all to my collections</button>
                  <button className="btn ghost sm" onClick={() => { setShared(null); history.replaceState(null, "", "/saved"); }}>Dismiss</button>
                </div>
              </div>
              <div className="saved-grid">{shared.items.map((p, i) => card(p, "sh" + i, false))}</div>
            </section>
          )}

          {items && items.length === 0 && !shared && (
            <div className="saved-empty glass">
              <p>Nothing saved yet. Hit the heart in the studio to keep a wallpaper here.</p>
              <a className="btn grad" href="/create">Open the studio →</a>
            </div>
          )}

          {items && items.length > 0 && shown && (
            <>
              <div className="col-bar" role="group" aria-label="Collections">
                <button className="chip" aria-pressed={view === "all"} onClick={() => setView("all")}>All saved · {items.length}</button>
                {cols.map((c) => <button key={c.id} className="chip" aria-pressed={view === c.id} onClick={() => setView(c.id)}>{c.name} · {countIn(c)}</button>)}
                {creating ? (
                  <form className="col-new inline" onSubmit={create}>
                    <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Collection name" maxLength={40} aria-label="Collection name" onKeyDown={(e) => { if (e.key === "Escape") setCreating(false); }} />
                    <button className="btn grad sm" type="submit">Create</button>
                  </form>
                ) : (
                  <button className="chip col-add" onClick={() => setCreating(true)}>+ New collection</button>
                )}
              </div>

              {active && (
                <div className="col-tools">
                  {renaming === active.id ? (
                    <form className="col-new inline" onSubmit={(e) => { e.preventDefault(); renameCollection(active.id, renameVal); setRenaming(""); refresh(); }}>
                      <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} maxLength={40} aria-label="New name" onKeyDown={(e) => { if (e.key === "Escape") setRenaming(""); }} />
                      <button className="btn grad sm" type="submit">Rename</button>
                    </form>
                  ) : (
                    <button className="btn ghost sm" onClick={() => { setRenaming(active.id); setRenameVal(active.name); }}>Rename</button>
                  )}
                  <button className="btn grad sm" onClick={() => copyLink(active)}><Ico d={I_LINK} /> Copy share link</button>
                  <button className="btn ghost sm" onClick={() => { if (confirm(`Delete the collection "${active.name}"? The wallpapers stay in Saved.`)) { deleteCollection(active.id); setView("all"); refresh(); } }}>Delete collection</button>
                </div>
              )}

              <div className="saved-count">{active ? `${shown.length} in ${active.name}` : `${items.length} saved`}</div>
              {active && shown.length === 0 && <p className="hint">This collection is empty. Use the folder button on any wallpaper in All saved to add it here.</p>}
              <div className="saved-grid">{shown.map((s) => card(s.params, s.id, true))}</div>
            </>
          )}
        </div>
        <div className="toast" role="status" aria-live="polite">{toast && <span key={toast}>{toast}</span>}</div>
      </main>
    </>
  );
}
