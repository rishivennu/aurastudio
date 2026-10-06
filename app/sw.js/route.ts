// Served as /sw.js. Evaluated once at build time, so every deploy gets a new
// cache name and the old cache (with its stale HTML) is dropped on activate.
export const dynamic = "force-static";

const VERSION = "aura-" + (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 8) + "-" + Date.now().toString(36);

const body = `
const VERSION = ${JSON.stringify(VERSION)};
const PAGES = ["/", "/create", "/explore", "/daily", "/palettes", "/saved", "/community"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.allSettled(PAGES.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const put = (key, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(key, copy)); } return res; };

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  // content-hashed build assets never change: cache first
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
    return;
  }

  // icons and manifest: stale-while-revalidate
  if (/\\.(png|svg|ico|webmanifest)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => put(req, res)).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // pages: network first; only the known pages are cached, keyed without the query
  if (req.mode === "navigate") {
    const known = PAGES.includes(url.pathname);
    e.respondWith(fetch(req).then((res) => (known ? put(url.pathname, res) : res))
      .catch(() => caches.match(known ? url.pathname : "/create").then((hit) => hit || caches.match("/"))));
  }
});
`;

export function GET() {
  return new Response(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate",
      "service-worker-allowed": "/",
    },
  });
}
