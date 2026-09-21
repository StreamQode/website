<script setup lang="ts">
// The showroom resolves the request hostname to a site and loads its projection.
interface Media {
  kind: string; // "image" | "video"
  id: string;
  url: string;
}
interface Product {
  id: string;
  name: string;
  description?: string | null;
  media: Media[];
}
interface ShowroomResponse {
  host: string;
  siteId: string;
  region: "uks" | "uae";
  items: Product[];
}

// The Nuxt server calls the public regional resolver. Browser requests remain
// same-origin, and the Vercel deployment never contains a fixed tenant ID.
const { data, error } = await useFetch<ShowroomResponse>("/api/catalogue");

const products = computed(() => data.value?.items ?? []);

const firstImage = (p: Product) =>
  (Array.isArray(p.media) ? p.media : []).find((m) => m.kind === "image")?.url ?? null;

useHead({
  title: "Showroom",
  meta: [
    { property: "og:title", content: "Showroom" },
    { property: "og:type", content: "website" },
  ],
});
</script>

<template>
  <main class="wrap">
    <header class="head">
      <h1>Showroom</h1>
      <span v-if="data?.host" class="tenant">{{ data.host }}</span>
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
            :alt="p.name"
            loading="lazy"
          />
          <div v-else class="ph" />
        </div>
        <h2>{{ p.name }}</h2>
        <p class="body">{{ p.description }}</p>
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
