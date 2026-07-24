<script setup lang="ts">
// The REAL experience — Nuxt page, GSAP ScrollTrigger + Lenis + HLS.
// A pinned stage where vertical scroll is scrubbed into horizontal motion, with
// multi-speed parallax layers and one-at-a-time HLS video (virtualized). All browser
// libs load in onMounted, so SSR just renders the markup and the motion enhances on
// the client. Sample luxury content until real products are published.
import { ref, onMounted, onBeforeUnmount } from "vue";

interface Item { name: string; k: string; meta: string; poster: string; tint: string; w: number; h: number; }

const SRC = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"; // stand-in; prod = each product's Cloudflare .m3u8

const items: Item[] = [
  { name: "Nocturne", k: "Maison Aurelia · Horlogerie", meta: "Limited to 25 · €142,000",
    poster: "radial-gradient(120% 90% at 70% 20%,#6b4e12,transparent 55%),linear-gradient(150deg,#0c0a06,#1b1408)",
    tint: "linear-gradient(160deg,rgba(120,90,20,.42),transparent)", w: 500, h: 640 },
  { name: "Éclat", k: "Maison Aurelia · High Jewellery", meta: "One of one · Price on request",
    poster: "radial-gradient(120% 90% at 25% 25%,#7a1f33,transparent 55%),linear-gradient(150deg,#100608,#2a0c14)",
    tint: "linear-gradient(160deg,rgba(150,40,60,.42),transparent)", w: 430, h: 560 },
  { name: "Meridian", k: "Maison Aurelia · Motion", meta: "Coachbuilt Grand Tourer · €345,000",
    poster: "radial-gradient(120% 90% at 75% 30%,#244a6b,transparent 55%),linear-gradient(150deg,#06090c,#0f2033)",
    tint: "linear-gradient(160deg,rgba(40,90,140,.42),transparent)", w: 640, h: 580 },
  { name: "Atelier 01", k: "Maison Aurelia · Atelier", meta: "Couture · By appointment",
    poster: "radial-gradient(120% 90% at 30% 25%,#1c5a41,transparent 55%),linear-gradient(150deg,#050a08,#0c2419)",
    tint: "linear-gradient(160deg,rgba(60,120,90,.42),transparent)", w: 450, h: 660 },
  { name: "Solstice", k: "Maison Aurelia · Estates", meta: "Private residence, Como · POA",
    poster: "radial-gradient(120% 90% at 70% 25%,#5a3a1c,transparent 55%),linear-gradient(150deg,#0a0705,#241708)",
    tint: "linear-gradient(160deg,rgba(120,90,20,.42),transparent)", w: 560, h: 600 },
];

useHead({
  title: "Stream Qode — Experience",
  link: [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&family=Inter:wght@300;400;500&display=swap" },
  ],
});

const stage = ref<HTMLElement | null>(null);
const track = ref<HTMLElement | null>(null);
const bg = ref<HTMLElement | null>(null);
const ghosts = ref<HTMLElement | null>(null);
const active = ref(0);
const progress = ref(0);

// Kept for cleanup on unmount.
let gsapRef: any, ST: any, lenis: any, rafFn: any;
const hlsMap = new Map<number, any>();

onMounted(async () => {
  const gsap = (await import("gsap")).default;
  const ScrollTrigger = (await import("gsap/ScrollTrigger")).default;
  const Lenis = (await import("lenis")).default;
  const Hls = (await import("hls.js")).default;
  gsapRef = gsap; ST = ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  const panels = Array.from(track.value!.querySelectorAll<HTMLElement>(".panel"));
  const vids = panels.map((p) => p.querySelector<HTMLVideoElement>(".vid")!);

  // Lenis smooth scroll driving GSAP (buttery inertia + sub-pixel scrub).
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on("scroll", ScrollTrigger.update);
  rafFn = (t: number) => lenis.raf(t * 1000);
  gsap.ticker.add(rafFn);
  gsap.ticker.lagSmoothing(0);

  // One live HLS stream, following the centred panel.
  function activate(idx: number) {
    if (hlsMap.has(idx)) return;
    hlsMap.forEach((h, k) => {
      if (k !== idx) { if (h?.destroy) h.destroy(); vids[k].pause(); vids[k].removeAttribute("src"); panels[k].classList.remove("play"); hlsMap.delete(k); }
    });
    const v = vids[idx];
    let h = null;
    if (Hls.isSupported()) { h = new Hls({ maxBufferLength: 6 }); h.loadSource(SRC); h.attachMedia(v); }
    else { v.src = SRC; }
    v.play().catch(() => {});
    panels[idx].classList.add("play");
    hlsMap.set(idx, h);
  }

  const buildTimeline = () => {
    const totalX = track.value!.scrollWidth - window.innerWidth;
    return gsap.timeline({
      scrollTrigger: {
        trigger: stage.value!, start: "top top", end: "+=" + totalX,
        scrub: 1, pin: true, invalidateOnRefresh: true,
        onUpdate: (self: any) => {
          progress.value = self.progress;
          let near = 0, best = 1e9;
          panels.forEach((p, i) => {
            const r = p.getBoundingClientRect();
            const c = r.left + r.width / 2;
            const d = Math.abs(c - window.innerWidth / 2);
            const t = Math.max(0, 1 - d / (window.innerWidth * 0.62));
            p.style.setProperty("--s", (0.9 + t * 0.1).toFixed(3));
            p.style.setProperty("--o", (0.32 + t * 0.68).toFixed(3));
            if (d < best) { best = d; near = i; }
          });
          if (near !== active.value) { active.value = near; activate(near); }
        },
      },
    })
      .to(track.value, { x: () => -(track.value!.scrollWidth - window.innerWidth), ease: "none" }, 0)
      .to(bg.value, { xPercent: -30, ease: "none" }, 0)
      .to(ghosts.value, { x: () => -(track.value!.scrollWidth - window.innerWidth) * 0.6, ease: "none" }, 0);
  };

  buildTimeline();
  activate(0);

  // Recompute once fonts settle (panel widths shift as the display face loads).
  try { await (document as any).fonts?.ready; } catch {}
  ScrollTrigger.refresh();
});

onBeforeUnmount(() => {
  hlsMap.forEach((h) => h?.destroy && h.destroy());
  hlsMap.clear();
  if (ST) ST.getAll().forEach((t: any) => t.kill());
  if (gsapRef && rafFn) gsapRef.ticker.remove(rafFn);
  if (lenis) lenis.destroy();
});
</script>

<template>
  <div class="exp">
    <section ref="stage" class="stage">
      <div ref="bg" class="bg" />
      <div ref="ghosts" class="ghosts">
        <span>aurelia</span><span>maison</span><span>2026</span>
      </div>

      <div ref="track" class="track">
        <article
          v-for="(it, i) in items"
          :key="i"
          class="panel"
          :style="{ width: it.w + 'px', height: it.h + 'px' }"
        >
          <div class="poster" :style="{ background: it.poster }" />
          <video class="vid" muted loop playsinline preload="none" />
          <div class="tint" :style="{ background: it.tint }" />
          <div class="vig" />
          <div class="live"><i />Live video</div>
          <div class="cap">
            <div class="k">{{ it.k }}</div>
            <h2>{{ it.name }}</h2>
            <p>{{ it.meta }}</p>
          </div>
        </article>
      </div>

      <div class="hud">
        <div class="wm">STREAM QODE</div>
        <div class="nv">COLLECTION / ATELIER</div>
        <div class="ix">{{ String(active + 1).padStart(2, "0") }} / {{ String(items.length).padStart(2, "0") }}</div>
        <div class="ht">SCROLL →</div>
      </div>
      <div class="bar" :style="{ width: progress * 100 + '%' }" />
    </section>
  </div>
</template>

<style>
html, body { margin: 0; padding: 0; background: #08070a; color: #f2ede4; }
* { box-sizing: border-box; }

.exp { font-family: "Inter", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.stage { position: relative; height: 100vh; overflow: hidden; }

.bg { position: absolute; top: 0; left: 0; height: 100%; width: 160%;
  background: radial-gradient(50% 70% at 20% 30%, #3a2a0e, transparent 55%),
    radial-gradient(45% 60% at 55% 75%, #2a0d16, transparent 55%),
    radial-gradient(50% 70% at 88% 35%, #12283c, transparent 55%),
    linear-gradient(100deg, #0b0906, #120a10 50%, #070a0d); opacity: .85; }

.ghosts { position: absolute; top: 50%; left: 0; transform: translateY(-50%); white-space: nowrap; display: flex; gap: 30vw; }
.ghosts span { font-family: "Playfair Display", serif; font-style: italic; font-weight: 600;
  font-size: 34vh; line-height: 1; color: #f2ede4; opacity: .045; }

.track { position: absolute; top: 0; left: 0; height: 100vh; display: flex; align-items: center; gap: 220px; padding: 0 15vw; will-change: transform; }

.panel { position: relative; flex: 0 0 auto; border-radius: 16px; overflow: hidden;
  box-shadow: 0 50px 100px rgba(0,0,0,.55); transform: scale(var(--s, 1)); opacity: var(--o, 1); will-change: transform, opacity; }
.panel .poster { position: absolute; inset: -6%; background-size: cover; background-position: center; }
.panel .vid { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0;
  transition: opacity 1s cubic-bezier(.22,1,.36,1); filter: saturate(.7) contrast(1.06) brightness(.6); }
.panel.play .vid { opacity: 1; }
.panel .tint { position: absolute; inset: 0; mix-blend-mode: overlay; }
.panel .vig { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, rgba(0,0,0,.7)); }
.panel .live { position: absolute; top: 18px; left: 18px; font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
  color: #fff; display: flex; align-items: center; gap: 7px; opacity: 0; transition: .6s; }
.panel.play .live { opacity: .9; }
.panel .live i { width: 6px; height: 6px; border-radius: 50%; background: #e8503a; animation: pulse 1.6s infinite; }
@keyframes pulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
.panel .cap { position: absolute; left: 22px; right: 22px; bottom: 20px; color: #fff; }
.panel .cap .k { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; opacity: .8; margin-bottom: 10px; }
.panel .cap h2 { font-family: "Playfair Display", serif; font-style: italic; font-weight: 600; font-size: 32px; line-height: .95; }
.panel .cap p { margin-top: 8px; font-size: 12px; letter-spacing: .04em; opacity: .82; }

.hud { position: fixed; inset: 0; pointer-events: none; z-index: 20; mix-blend-mode: difference; color: #fff; }
.hud > * { position: absolute; }
.wm { top: 32px; left: 36px; font-size: 13px; letter-spacing: .2em; }
.nv { top: 32px; right: 36px; font-size: 12px; letter-spacing: .16em; }
.ix { bottom: 30px; left: 36px; font-family: "Playfair Display", serif; font-style: italic; font-size: 15px; }
.ht { bottom: 32px; right: 36px; font-size: 11px; letter-spacing: .2em; text-transform: uppercase; opacity: .7; }
.bar { position: fixed; left: 0; bottom: 0; height: 2px; background: #c8a24a; z-index: 21; }
</style>
