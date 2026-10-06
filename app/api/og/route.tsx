import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { decodeParams } from "@/lib/share";
import { PALETTES, STYLES } from "@/lib/presets";
import { kvOn, getKv, h } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const w = req.nextUrl.searchParams.get("w") || "";
  const p = w ? decodeParams(w) : null;
  if (p && kvOn()) {
    try {
      const b64 = await (await getKv()).get<string>(`aura:thumb:${h(w)}`);
      if (b64) return new Response(Buffer.from(b64, "base64"), { headers: { "content-type": "image/jpeg", "x-content-type-options": "nosniff", "content-disposition": "inline; filename=aura.jpg", "cache-control": "public, max-age=86400, s-maxage=604800" } });
    } catch {}
  }
  const cols = p?.customColors?.length ? p.customColors : (PALETTES.find((x) => x.id === p?.paletteId) || PALETTES[0]).colors;
  const style = STYLES.find((s) => s.id === p?.styleId)?.name || "Gradient";
  const pal = p?.customColors?.length ? "Custom" : (PALETTES.find((x) => x.id === p?.paletteId) || PALETTES[0]).name;
  const c = (i: number) => cols[i % cols.length];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 64, color: "#fff",
        backgroundColor: c(cols.length - 1),
        backgroundImage: `radial-gradient(circle at 18% 22%, ${c(0)} 0%, transparent 55%), radial-gradient(circle at 82% 30%, ${c(1)} 0%, transparent 55%), radial-gradient(circle at 60% 85%, ${c(2)} 0%, transparent 60%), linear-gradient(135deg, ${c(3)}, ${c(cols.length - 1)})` }}>
        <div style={{ fontSize: 30, opacity: 0.85, display: "flex" }}>aura.studio</div>
        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, display: "flex", textShadow: "0 2px 24px rgba(0,0,0,.35)" }}>{p ? `${style} · ${pal}` : "Gradient wallpapers"}</div>
        <div style={{ fontSize: 28, opacity: 0.85, display: "flex" }}>Open it, remix it, download it in 4K.</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "cache-control": "public, max-age=3600, s-maxage=86400" } }
  );
}
