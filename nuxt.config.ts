// StreamQode public showroom — Nuxt 3, SSR, deployed on Vercel.
// It reads the public API (no auth) and renders published products server-side, so
// pages are real HTML (good for social-share cards + a no-JS fallback). Vercel is
// auto-detected by Nuxt/Nitro — no adapter config needed.
export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: "2025-07-01",

  // Public runtime config — overridable per environment via NUXT_PUBLIC_* env vars
  // (that's how Vercel injects them). apiBase points at the Azure control plane.
  runtimeConfig: {
    public: {
      apiBase: "https://core.streamqode.com", // NUXT_PUBLIC_API_BASE
      defaultTenant: "firstmotors", // NUXT_PUBLIC_DEFAULT_TENANT — until host→tenant resolve lands
    },
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
