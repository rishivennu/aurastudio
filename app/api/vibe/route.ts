import { NextRequest, NextResponse } from "next/server";
import { PALETTES, STYLES } from "@/lib/presets";
import { localVibe, cleanPick, VibePick } from "@/lib/vibe";
import { kvOn, rateOk, memRateOk, readJson } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODELS = ["gemini-flash-lite-latest", "gemini-flash-latest"];

const SYSTEM = `You are the art director of aura.studio, a gradient wallpaper generator.
Given a mood description, choose 3 DIFFERENT wallpapers. Each uses one style and one palette from the lists below (ids must match exactly).
Make the three picks clearly distinct from each other (different styles; usually different palettes).
title: 2-4 evocative words. why: one short sentence on how it fits the mood. keywords: 2-3 mood words. intensity: 0.3-1 glow strength. grain: true for film/analog/moody vibes.

STYLES:
${STYLES.map((s) => `${s.id}: ${s.desc}`).join("\n")}

PALETTES (id: name, colours):
${PALETTES.map((p) => `${p.id}: ${p.name}, ${p.colors.join(" ")}`).join("\n")}`;

const schema = {
  type: "OBJECT",
  properties: {
    picks: {
      type: "ARRAY", minItems: 3, maxItems: 3,
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" }, why: { type: "STRING" }, keywords: { type: "STRING" },
          styleId: { type: "STRING", enum: STYLES.map((s) => s.id) },
          paletteId: { type: "STRING", enum: PALETTES.map((p) => p.id) },
          intensity: { type: "NUMBER" }, grain: { type: "BOOLEAN" },
        },
        required: ["title", "why", "keywords", "styleId", "paletteId", "intensity", "grain"],
      },
    },
  },
  required: ["picks"],
};

async function askGemini(prompt: string, key: string): Promise<VibePick[] | null> {
  for (const m of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 12000);
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
          method: "POST", signal: ctl.signal,
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents: [{ role: "user", parts: [{ text: `Mood: ${prompt}` }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.9, maxOutputTokens: 800 },
          }),
        });
        if (r.status === 429 || r.status === 503) { await new Promise((z) => setTimeout(z, 600)); continue; }
        if (!r.ok) break;
        const j = await r.json();
        const txt = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
        const picks = (JSON.parse(txt).picks as unknown[]).map((x, i) => cleanPick(x, prompt, i)).filter(Boolean) as VibePick[];
        if (picks.length) return picks.slice(0, 3);
        break;
      } catch { break; } finally { clearTimeout(t); }
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const j = await readJson<{ prompt?: string }>(req, 2_000);
  if (!j.ok) return NextResponse.json({ ok: false, error: j.status === 413 ? "Too long." : "Bad request." }, { status: j.status });
  let prompt = String(j.body?.prompt || "");
  prompt = prompt.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  if (prompt.length < 2) return NextResponse.json({ ok: false, error: "Describe a mood first." }, { status: 400 });

  const key = process.env.GEMINI_API_KEY;
  let limited = false;
  if (key) {
    if (!kvOn()) limited = !memRateOk(req, "vibe", 40);
    else { try { limited = !(await rateOk(req, "vibe", 40)); } catch { limited = true; } }
  }
  if (key && !limited) {
    const picks = await askGemini(prompt, key);
    if (picks) return NextResponse.json({ ok: true, source: "ai", picks });
  }
  return NextResponse.json({ ok: true, source: limited ? "limit" : "local", picks: localVibe(prompt) });
}
