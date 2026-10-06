import type { MetadataRoute } from "next";
import { PALETTES, STYLES } from "@/lib/presets";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const top = ["", "/create", "/explore", "/daily", "/community", "/palettes", "/style", "/palette", "/brand", "/embed"];
  return [
    ...top.map((p) => ({ url: `${SITE}${p}`, lastModified: now, changeFrequency: (p === "/daily" || p === "/community" ? "daily" : "weekly") as "daily" | "weekly", priority: p === "" ? 1 : 0.8 })),
    ...STYLES.map((s) => ({ url: `${SITE}/style/${s.id}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...PALETTES.map((p) => ({ url: `${SITE}/palette/${p.id}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
