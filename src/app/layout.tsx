import localFont from "next/font/local";

import { LivingSky } from "@/components/sky/living-sky";
import { SkyProvider } from "@/components/sky/sky-provider";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

/**
 * Manrope — the single Saelis application face. Self-hosted variable font
 * via next/font/local (committed to the repo, OFL-licensed): no blocking
 * @import, no external request, deterministic builds, automatic preload
 * and size-adjusted fallback to prevent layout shift. Weights below 400
 * are never used — thin text is excluded for readability.
 */
const manrope = localFont({
  src: [
    { path: "../fonts/manrope-latin-wght-normal.woff2", style: "normal", weight: "200 800" },
    { path: "../fonts/manrope-latin-ext-wght-normal.woff2", style: "normal", weight: "200 800" },
  ],
  display: "swap",
  variable: "--font-manrope",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  manifest: "/manifest.webmanifest",
  icons: [{ rel: "icon", url: "/icon.svg", type: "image/svg+xml" }],
  openGraph: {
    title: APP_NAME,
    description: APP_TAGLINE,
    siteName: APP_NAME,
    type: "website",
  },
  // Development default: keep everything out of search indexes. Loosen for the
  // marketing pages only when Saelis launches publicly. Private app routes
  // must never be indexed.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#DDEBFA",
  width: "device-width",
  initialScale: 1,
  // Extend the Living Sky under notches/home indicators; safe-area padding is
  // applied in globals.css.
  viewportFit: "cover",
  // Mobile keyboards resize the layout so the conversation composer stays
  // visible above the keyboard.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="min-h-dvh antialiased">
        {/* The Living Sky: one continuous atmosphere behind every route.
            Children stay server components; only the sky boundary is client. */}
        <SkyProvider>
          <LivingSky />
          {children}
        </SkyProvider>
      </body>
    </html>
  );
}
