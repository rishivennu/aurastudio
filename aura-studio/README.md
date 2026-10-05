# Aura Studio — 4K Wallpaper Generator

Bold, grainy gradient wallpapers (aura glow, soft linear, mesh, vox blocks),
rendered **entirely client-side** on a Canvas and exported at full device
resolution. No backend, no GPU workers, no storage — deploys to Vercel as a
static-first Next.js app.

## Run locally
```bash
npm install
npm run dev     # http://localhost:3030
```

## Deploy to Vercel
```bash
npm i -g vercel
vercel          # or: push to GitHub and import at vercel.com
```
Framework preset: **Next.js** (auto-detected). No env vars required.

## How it fits the brief
| Spec | Implementation |
| --- | --- |
| 4K master + device crops | Per-device **re-render at native resolution** from one seed (Desktop 3840×2160, Laptop 2560×1600, Tablet 2048×1536, iPhone 1290×2796). Deterministic, aspect-correct — better than cropping a landscape master into portrait. |
| Static PNG/JPEG | `canvas.toBlob` download. Animated modes intentionally dropped per request. |
| Styles | Aura Bloom, Soft Linear, Mesh Dream (from your 4 refs) + Vox Blocks (neo-brutalist). `lib/presets.ts`. |
| Personalization | Palette picker, keyword input (changes composition), seed, glow intensity, grain toggle, text overlay. |
| Batch | 8-variant theme pack + 4-device pack download. |
| Progressive preview | Fast downscaled live canvas; full-res only on export. |
| Landing page | Animated gradient hero, how-it-works, generator, gallery, footer. |
| Accessibility | `:focus-visible`, 4.5:1 UI contrast, reduced-motion toggle + `prefers-reduced-motion`, SVG/no-emoji, keyboard nav. |
| Admin & analytics | `/dashboard` reads local telemetry (generations, avg render ms, top palettes). Swap `bump()` for Vercel KV to make it global. |

## Architecture
```
app/            layout, landing page, /dashboard
components/      Studio (controls+preview+export), GalleryCard
lib/            engine.ts (canvas render), presets.ts, prng.ts (seedable)
```

## Why no GPU workers / queue / object storage
Procedural gradients are cheap. Rendering in-browser is instant, free to run,
and privacy-friendly (nothing uploaded) — the right call for Vercel. To add an
ML style-transfer tier later, put a serverless function + Vercel Blob behind the
same `GenParams` contract.


## Vercel KV analytics (global)
Telemetry writes to Vercel KV when configured, and always mirrors to
`localStorage` so `/dashboard` works offline too.

1. Vercel dashboard → Storage → create a **KV / Upstash Redis** store, connect it to the project.
2. It auto-sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Redeploy.
3. `/dashboard` flips from "Local" to "KV" automatically — no code change.

Routes: `POST /api/track` (hincrby counters), `GET /api/stats` (hgetall). Both
degrade gracefully to `{configured:false}` when env vars are absent.

## Batch · 10 at once
The studio renders your current style across **ten different palettes**
simultaneously (`components/BatchTen.tsx`). Click any to load it, download one,
or "Download all 10". Reshuffle picks a new random set of palettes.

## Design
Typeset in **Space Grotesk** (display) + **Inter** (body) with an **Instrument
Serif** italic accent — an editorial pairing in the spirit of Apple and Xiaomi
product pages: sticky blurred nav, oversized tight headlines, an alternating
light section, serif step numerals, and hover-reveal micro-interactions. Fonts
load via Google Fonts `<link>` (no build-time fetch), falling back to system.
