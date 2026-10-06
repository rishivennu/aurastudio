import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api/admin", "/api/community", "/api/subscribe", "/api/track", "/api/vibe", "/api/thumb", "/api/weekly", "/api/stats", "/api/geo", "/api/daily"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
