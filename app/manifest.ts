import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "aura.studio",
    short_name: "aura",
    description: "Gradient wallpapers, crafted in your browser. Works offline.",
    start_url: "/create",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    orientation: "any",
    categories: ["design", "personalization", "graphics"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Studio", url: "/create" },
      { name: "Daily drop", url: "/daily" },
      { name: "Explore", url: "/explore" },
    ],
  };
}
