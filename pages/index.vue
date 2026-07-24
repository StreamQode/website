<script setup lang="ts">
// The showroom skeleton — SSR fetch of the public API, rendered as real HTML.
// The kinetic canvas / mobile feed (see apps/showroom concepts in the platform repo)
// layer on top of this data later. Tenant is fixed to defaultTenant for now; the
// host→tenant resolve (ADR 0006) replaces that with a lookup of the request Host.
interface Media {
  kind: string; // "image" | "video"
  id: string;
  url: string;
}
interface Product {
  id: string;
  title: string;
  body: string;
  media: Media[];
  created_at: string;
}
interface ShowroomResponse {
  tenant_id: string;
  products: Product[];
}

const config = useRuntimeConfig();
const tenant = config.public.defaultTenant;

// useFetch runs on the server during SSR (server→server, so no CORS in play) and
// hydrates on the client.
const { data, error } = await useFetch<ShowroomResponse>(
  () => `${config.public.apiBase}/v1/public/${tenant}/products`,
);

const products = computed(() => data.value?.products ?? []);

const firstImage = (p: Product) =>
  p.media?.find((m) => m.kind === "image")?.url ?? null;

useHead({
  title: `${tenant} — Showroom`,
  meta: [
    { property: "og:title", content: `${tenant} — Showroom` },
    { property: "og:type", content: "website" },
  ],
});
</script>

<template>
  <main class="wrap">
    <header class="head">
      <h1>Showroom</h1>
      <span class="tenant">{{ tenant }}</span>
    </header>

    <p v-if="error" class="state">Couldn’t load the showroom right now.</p>
    <p v-else-if="products.length === 0" class="state">
      No products published yet.
    </p>

    <section v-else class="grid">
      <article v-for="p in products" :key="p.id" class="card">
        <div class="media">
          <img
            v-if="firstImage(p)"
            :src="firstImage(p)!"
            :alt="p.title"
            loading="lazy"
          />
          <div v-else class="ph" />
        </div>
        <h2>{{ p.title }}</h2>
        <p class="body">{{ p.body }}</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.wrap {
  min-height: 100vh;
  background: #0d0c0f;
  color: #f2efe9;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  padding: 40px clamp(20px, 5vw, 72px);
}
.head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  border-bottom: 1px solid #26242b;
  padding-bottom: 22px;
  margin-bottom: 32px;
}
.head h1 {
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.tenant {
  color: #8b8794;
  font-size: 14px;
  text-transform: capitalize;
}
.state {
  color: #8b8794;
  padding: 60px 0;
}
.grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.card .media {
  aspect-ratio: 4 / 3;
  border-radius: 12px;
  overflow: hidden;
  background: #17161b;
  margin-bottom: 14px;
}
.card .media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.card .ph {
  width: 100%;
  height: 100%;
  background: linear-gradient(120deg, #1a1820, #24222c);
}
.card h2 {
  font-size: 17px;
  font-weight: 500;
  margin-bottom: 6px;
}
.card .body {
  color: #8b8794;
  font-size: 14px;
  line-height: 1.5;
}
</style>
