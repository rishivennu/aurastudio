import type { Metadata } from "next";
import "./globals.css";
import SiteAnalytics from "@/components/SiteAnalytics";

export const metadata: Metadata = {
  title: "aura.studio — gradient wallpapers, crafted in your browser",
  description:
    "A tiny studio for bold, grainy gradient wallpapers. Aura glow, soft linear and mesh styles. Export 4K for every device. No upload, no account.",
};

const themeInit = `(function(){try{var t=localStorage.getItem('aura-theme');if(!t){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Inter:wght@400;500;600&family=Fraunces:ital,opsz,wght@1,9..144,400;1,9..144,500&family=Space+Grotesk:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}<SiteAnalytics /></body>
    </html>
  );
}
