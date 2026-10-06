/** Public base URL, no trailing slash. Same rules as the layout's metadataBase. */
export const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` :
   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3030")
).replace(/\/+$/, "");
