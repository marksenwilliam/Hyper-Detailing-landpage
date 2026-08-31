// @ts-check
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Betald annonssida för Hyper Detailing Umeå (Meta-annonser) — lackering.
// Keep `site` in sync with BUSINESS.url in src/data/business.ts.
export default defineConfig({
  site: "https://hyper-detailing.vercel.app",

  // Static output: every page prerenders to HTML. /api/lead opts out with
  // `export const prerender = false` and is deployed as a Vercel function —
  // the same split the Ecodrive project uses.
  output: "static",
  adapter: vercel(),

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    // Force a single React copy so the client:* islands mount without an
    // "Invalid hook call" (same fix as the other Marksen Astro projects).
    resolve: { dedupe: ["react", "react-dom"] },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "@astrojs/react/client.js",
        // agentation must be pre-bundled in the SAME pass as React, not
        // discovered later. Left out, Vite optimised it separately and gave it
        // its own React chunk — so the dev toolbar and the page's own islands
        // each called useState on a different copy and both threw
        // "Invalid hook call" / "Cannot read properties of null". Dev-only (the
        // widget is import.meta.env.DEV gated) but it broke the navbar island.
        "agentation",
      ],
    },
  },
});
