import { NextRequest, NextResponse } from "next/server";
import { decodeParams } from "@/lib/share";
import { kvOn, getKv, h, rateOk, tooBig } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!kvOn()) return NextResponse.json({ ok: false, kv: false });
  if (tooBig(req, 500_000)) return NextResponse.json({ ok: false, error: "too large" }, { status: 413 });
  try {
    const { w, img } = (await req.json()) as { w?: string; img?: string };
    if (!w || w.length > 2000 || !decodeParams(w)) return NextResponse.json({ ok: false, error: "bad token" }, { status: 400 });
    if (!img || !img.startsWith("data:image/jpeg;base64,") || img.length > 450_000) return NextResponse.json({ ok: false, error: "bad image" }, { status: 400 });
    if (!(await rateOk(req, "thumb", 60))) return NextResponse.json({ ok: false, error: "rate" }, { status: 429 });
    const b64 = img.slice("data:image/jpeg;base64,".length);
    const buf = Buffer.from(b64, "base64");
    const jpeg = buf.length > 1000 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
    if (!jpeg) return NextResponse.json({ ok: false, error: "bad image" }, { status: 400 });
    const kv = await getKv();
    // nx: the first render of a wallpaper wins, so nobody can overwrite an existing preview
    await kv.set(`aura:thumb:${h(w)}`, buf.toString("base64"), { ex: 60 * 60 * 24 * 120, nx: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("thumb", e);
    return NextResponse.json({ ok: false, error: "server error" });
  }
}
