"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";
import Canvas from "@/components/Canvas";
import { decodeParams } from "@/lib/share";
import { DEVICES, PALETTES, STYLES } from "@/lib/presets";
import { exportWallpaper } from "@/lib/exporter";
import { Post, like, likedSet } from "@/lib/community";

const DESK = DEVICES.find((d) => d.id === "desktop")!;
type Sort = "new" | "top";

function ago(t: number) {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const BranchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

function Card({ post, liked, onLike, origin }: { post: Post; liked: boolean; onLike: (on: boolean) => void; origin?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = decodeParams(post.w);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  if (!p) return null;
  const remix = `/create?w=${post.w}&from=${post.id}`;
  const meta = `${STYLES.find((s) => s.id === p.styleId)?.name} · ${p.customColors ? "Custom" : PALETTES.find((x) => x.id === p.paletteId)?.name}`;
  return (
    <article ref={ref} className={`cm-card ${origin ? "cm-origin" : ""}`}>
      <a className="cm-thumb" href={remix} aria-label={`Remix ${post.title} in the studio`}>
        {seen ? <Canvas params={p} w={400} h={500} /> : <span className="cm-ph" />}
      </a>
      <div className="cm-info">
        <div className="cm-txt"><h3>{post.title}</h3><span>{meta} · {ago(post.at)}</span>
          {(post.parent || !!post.remixes) && (
            <span className="cm-tree">
              {post.parent && <a href={`/community?parent=${post.parent}`}><BranchIcon />Remix of {post.parentTitle || "a post"}</a>}
              {!!post.remixes && <a href={`/community?parent=${post.id}`}>{post.remixes} {post.remixes === 1 ? "remix" : "remixes"}</a>}
            </span>
          )}
        </div>
        <button className={`cm-like ${liked ? "on" : ""}`} aria-pressed={liked} aria-label={`${liked ? "Unlike" : "Like"} ${post.title}, ${post.likes} likes`} onClick={() => onLike(!liked)}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
          {post.likes}
        </button>
      </div>
      <div className="cm-acts">
        <a className="btn ghost sm" href={remix}>Remix</a>
        <button className="btn ghost sm" disabled={busy} onClick={async () => { setBusy(true); try { await exportWallpaper(p, DESK, "png"); } finally { setBusy(false); } }}>{busy ? "Rendering…" : "4K"}</button>
      </div>
    </article>
  );
}

export default function Community() {
  const [sort, setSort] = useState<Sort>("new");
  const [items, setItems] = useState<Post[]>([]);
  const [more, setMore] = useState(false);
  const [next, setNext] = useState(0);
  const req = useRef(0);
  const [state, setState] = useState<"loading" | "ok" | "off" | "error">("loading");
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [parent, setParent] = useState<string | null | undefined>(undefined);
  const [origin, setOrigin] = useState<Post | null>(null);

  const load = useCallback(async (s: Sort, offset: number, par: string | null) => {
    const my = ++req.current;
    try {
      const r = await fetch(`/api/community?${par ? `parent=${par}` : `sort=${s}`}&offset=${offset}`, { cache: "no-store" });
      const j = await r.json();
      if (my !== req.current) return;
      if (j.kv === false) { setState("off"); return; }
      if (!j.ok) { setState("error"); return; }
      if (par) setOrigin(j.origin || null);
      setItems((prev) => {
        if (!offset) return j.items;
        const have = new Set(prev.map((x) => x.id));
        return [...prev, ...(j.items as Post[]).filter((x) => !have.has(x.id))];
      });
      setMore(!!j.more); setNext(Number(j.nextOffset) || 0); setState("ok");
    } catch { if (my === req.current) setState("error"); }
  }, []);

  useEffect(() => {
    setLiked(likedSet());
    const p = new URLSearchParams(location.search).get("parent");
    setParent(p && /^[a-f0-9]{12}$/.test(p) ? p : null);
  }, []);
  useEffect(() => { if (parent === undefined) return; setState("loading"); setItems([]); load(sort, 0, parent); }, [sort, load, parent]);

  const onLike = async (id: string, on: boolean) => {
    setLiked((s) => { const c = new Set(s); on ? c.add(id) : c.delete(id); return c; });
    const bump = (f: (x: Post) => Post) => { setItems((xs) => xs.map((x) => (x.id === id ? f(x) : x))); setOrigin((o) => (o && o.id === id ? f(o) : o)); };
    bump((x) => ({ ...x, likes: Math.max(0, x.likes + (on ? 1 : -1)) }));
    const n = await like(id, on);
    if (n !== null) bump((x) => ({ ...x, likes: n }));
  };

  return (
    <>
      <Nav />
      <main className="create community">
        <div className="wrap">
          <span className="kicker">Community</span>
          <h1 className="display">Made by everyone.</h1>
          <p className="lead">Wallpapers people have published from the studio. Like the ones you love, remix any of them, or publish your own with the Publish button in the studio.</p>

          {parent && (
            <div className="cm-family glass">
              <div>
                <span className="kicker">Remix family</span>
                <h2>{origin ? <>Remixes of &ldquo;{origin.title}&rdquo;</> : state === "loading" ? "Loading…" : "That post is no longer here"}</h2>
                <p className="hint">{origin ? `${origin.remixes || 0} ${origin.remixes === 1 ? "person has" : "people have"} remixed this one. Remix it again, or remix a remix.` : "It may have been removed."}</p>
              </div>
              <a className="btn ghost sm" href="/community">Back to all posts</a>
            </div>
          )}
          {parent && origin && <div className="cm-grid cm-origin-row"><Card post={origin} origin liked={liked.has(origin.id)} onLike={(on) => onLike(origin.id, on)} /></div>}

          <div className="cm-bar" hidden={!!parent}>
            <div className="ex-modes" role="group" aria-label="Sort">
              {(["new", "top"] as Sort[]).map((s) => (
                <button key={s} aria-pressed={sort === s} className={`ex-mode ${sort === s ? "active" : ""}`} onClick={() => setSort(s)}>{s === "new" ? "Newest" : "Most liked"}</button>
              ))}
            </div>
            <a className="btn grad sm" href="/create">Publish yours</a>
          </div>

          {state === "loading" && <div className="cm-grid" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <div key={i} className="cm-card cm-skel" />)}</div>}
          {state === "off" && (
            <div className="cm-empty">
              <h2>The gallery is not connected yet.</h2>
              <p>Publishing needs a small database. On Vercel, open the project, go to Storage, create a KV (Upstash Redis) store and connect it to this project, then redeploy. Everything else on the site works without it.</p>
            </div>
          )}
          {state === "error" && <div className="cm-empty"><h2>Could not load the gallery.</h2><p>Check your connection and try again.</p><button className="btn ghost sm" onClick={() => load(sort, 0, parent ?? null)}>Retry</button></div>}
          {state === "ok" && items.length === 0 && (
            parent ? (origin && <div className="cm-empty"><h2>No remixes yet.</h2><p>Be the first to remix it: open it in the studio, change anything and publish.</p><a className="btn grad sm" href={`/create?w=${origin.w}&from=${origin.id}`}>Remix it</a></div>)
              : <div className="cm-empty"><h2>Nothing here yet.</h2><p>Be the first: make something in the studio and press Publish.</p><a className="btn grad sm" href="/create">Open the studio</a></div>
          )}
          {state === "ok" && items.length > 0 && (
            <>
              <div className="cm-grid">
                {items.map((x) => <Card key={x.id} post={x} liked={liked.has(x.id)} onLike={(on) => onLike(x.id, on)} />)}
              </div>
              {more && <div className="cm-more"><button className="btn ghost" onClick={() => load(sort, next, parent ?? null)}>Load more</button></div>}
            </>
          )}
        </div>
      </main>
    </>
  );
}
