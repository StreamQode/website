// StreamQode public showroom — Nuxt 3, SSR, deployed on Vercel.
// It reads the public resolver API (no auth) and renders products server-side, so
// pages are real HTML (good for social-share cards + a no-JS fallback). Vercel is
// auto-detected by Nuxt/Nitro — no adapter config needed.
export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: "2025-07-01",

  // Supplied by NUXT_PLATFORM_API_ORIGIN from the Platform Front Door output.
  // Keep the backend address server-side so browser requests stay same-origin.
  runtimeConfig: {
    platformApiOrigin: "",
  },

  app: {
    head: {
      htmlAttrs: { lang: "en" },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },

  devtools: { enabled: true },
});
