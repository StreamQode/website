<script setup lang="ts">
// Fixed full-screen experience — the video fills the viewport and stays put; scroll
// cross-dissolves one product into the next (GSAP pin + Lenis smooth scroll), with
// the editorial text sliding in per scene. No cards. HLS video is virtualized to the
// two scenes currently blending. Browser libs load in onMounted (SSR renders markup).
import { ref, onMounted, onBeforeUnmount } from "vue";

interface Item { name: string; k: string; meta: string; poster: string; tint: string; }

const SRC = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"; // stand-in; prod = each product's Cloudflare .m3u8

const items: Item[] = [
  { name: "Nocturne", k: "Maison Aurelia · Horlogerie", meta: "Limited to 25 — €142,000",
    poster: "radial-gradient(120% 90% at 70% 25%,#6b4e12,transparent 55%),linear-gradient(150deg,#0c0a06,#1b1408)",
    tint: "linear-gradient(120deg,rgba(120,90,20,.4),rgba(20,14,6,.25))" },
  { name: "Éclat", k: "Maison Aurelia · High Jewellery", meta: "One of one — Price on request",
    poster: "radial-gradient(120% 90% at 30% 25%,#7a1f33,transparent 55%),linear-gradient(150deg,#100608,#2a0c14)",
    tint: "linear-gradient(120deg,rgba(150,40,60,.4),rgba(20,6,10,.25))" },
  { name: "Meridian", k: "Maison Aurelia · Motion", meta: "Coachbuilt Grand Tourer — €345,000",
    poster: "radial-gradient(120% 90% at 72% 30%,#244a6b,transparent 55%),linear-gradient(150deg,#06090c,#0f2033)",
    tint: "linear-gradient(120deg,rgba(40,90,140,.4),rgba(6,10,16,.25))" },
  { name: "Atelier 01", k: "Maison Aurelia · Atelier", meta: "Couture — By appointment",
    poster: "radial-gradient(120% 90% at 30% 25%,#1c5a41,transparent 55%),linear-gradient(150deg,#050a08,#0c2419)",
    tint: "linear-gradient(120deg,rgba(30,120,90,.4),rgba(4,10,7,.25))" },
  { name: "Solstice", k: "Maison Aurelia · Estates", meta: "Private residence, Como — POA",
    poster: "radial-gradient(120% 90% at 70% 25%,#5a3a1c,transparent 55%),linear-gradient(150deg,#0a0705,#241708)",
    tint: "linear-gradient(120deg,rgba(120,90,20,.4),rgba(12,8,4,.25))" },
];
const N = items.length;

useHead({
  title: "Stream Qode — Experience",
  link: [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,500;1,600&family=Inter:wght@300;400;500&display=swap" },
  ],
});

const stage = ref<HTMLElement | null>(null);
const active = ref(0);
const progress = ref(0);

let gsapRef: any, ST: any, lenis: any, rafFn: any;
const hlsMap = new Map<number, any>();

onMounted(async () => {
  const gsap = (await import("gsap")).default;
  const ScrollTrigger = (await import("gsap/ScrollTrigger")).default;
  const Lenis = (await import("lenis")).default;
  const Hls = (await import("hls.js")).default;
  gsapRef = gsap; ST = ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  const scenes = Array.from(stage.value!.querySelectorAll<HTMLElement>(".scene"));
  const vids = scenes.map((s) => s.querySelector<HTMLVideoElement>(".vid")!);
  const conts = scenes.map((s) => s.querySelector<HTMLElement>(".content")!);

  lenis = new Lenis({ lerp: 0.09 });
  lenis.on("scroll", ScrollTrigger.update);
  rafFn = (t: number) => lenis.raf(t * 1000);
  gsap.ticker.add(rafFn);
  gsap.ticker.lagSmoothing(0);

  // Keep only the blending scenes' streams live (≤2 at a time).
  function manage(keep: number[]) {
    hlsMap.forEach((h, k) => {
      if (!keep.includes(k)) { if (h?.destroy) h.destroy(); vids[k].pause(); vids[k].removeAttribute("src"); hlsMap.delete(k); }
    });
    keep.forEach((k) => {
      if (k < 0 || k >= N || hlsMap.has(k)) return;
      const v = vids[k]; let h = null;
      if (Hls.isSupported()) { h = new Hls({ maxBufferLength: 6 }); h.loadSource(SRC); h.attachMedia(v); }
      else { v.src = SRC; }
      v.play().catch(() => {});
      hlsMap.set(k, h);
    });
  }

  function render(p: number) {
    progress.value = p;
    const pos = p * (N - 1);
    const idx = Math.min(N - 2, Math.floor(pos));
    const f = Math.min(1, Math.max(0, pos - idx)); // 0..1 crossfade to next
    scenes.forEach((s, i) => {
      let op = 0, ct = 0;
      if (i < idx) { op = 1; ct = 0; }
      else if (i === idx) { op = 1; ct = 1 - f; }
      else if (i === idx + 1) { op = f; ct = f; }
      s.style.opacity = String(op);
      const c = conts[i];
      c.style.opacity = String(ct);
      c.style.transform = `translateY(${(1 - ct) * 30}px)`;
    });
    active.value = f > 0.5 ? idx + 1 : idx;
    manage([idx, idx + 1]);
  }

  ScrollTrigger.create({
    trigger: stage.value!, start: "top top",
    end: "+=" + (N - 1) * window.innerHeight,
    pin: true, scrub: true, invalidateOnRefresh: true,
    onUpdate: (self: any) => render(self.progress),
  });
  render(0);

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
      <div v-for="(it, i) in items" :key="i" class="scene" :style="{ zIndex: i + 1 }">
        <div class="poster" :style="{ background: it.poster }" />
        <video class="vid" muted loop playsinline preload="none" />
        <div class="tint" :style="{ background: it.tint }" />
        <div class="vig" />
        <div class="content">
          <div class="k">{{ it.k }}</div>
          <h1>{{ it.name }}</h1>
          <p>{{ it.meta }}</p>
          <button class="cta">Enquire</button>
        </div>
      </div>

      <div class="hud">
        <div class="wm">STREAM QODE</div>
        <div class="nv">COLLECTION / ATELIER</div>
        <div class="ix">{{ String(active + 1).padStart(2, "0") }} / {{ String(N).padStart(2, "0") }}</div>
        <div class="ht">SCROLL ↓</div>
      </div>
      <div class="bar" :style="{ width: progress * 100 + '%' }" />
    </section>
  </div>
</template>

<style>
html, body { margin: 0; padding: 0; background: #08070a; color: #f2ede4; }
* { box-sizing: border-box; }
.exp { font-family: "Inter", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }

.stage { position: relative; height: 100vh; height: 100dvh; overflow: hidden; }

/* Every scene is full-bleed and stacked; JS controls opacity for the cross-dissolve. */
.scene { position: absolute; inset: 0; opacity: 0; will-change: opacity; }
.scene:first-child { opacity: 1; }
.scene .poster { position: absolute; inset: -4%; background-size: cover; background-position: center;
  animation: kb 22s ease-in-out infinite alternate; }
.scene .vid { position: absolute; inset: -4%; width: 108%; height: 108%; object-fit: cover;
  filter: saturate(.82) contrast(1.04) brightness(.66); animation: kb 22s ease-in-out infinite alternate; }
@keyframes kb { from { transform: scale(1.02) translate(-1%, -0.5%); } to { transform: scale(1.12) translate(1%, 1%); } }
.scene .tint { position: absolute; inset: 0; mix-blend-mode: overlay; }
.scene .vig { position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.35), transparent 30%, transparent 52%, rgba(0,0,0,.72)); }

.content { position: absolute; left: clamp(24px, 7vw, 120px); bottom: 18vh; right: clamp(24px, 7vw, 120px); color: #fff; will-change: transform, opacity; }
.content .k { font-size: 11px; letter-spacing: .3em; text-transform: uppercase; opacity: .85; margin-bottom: 20px; }
.content h1 { font-family: "Playfair Display", serif; font-style: italic; font-weight: 600;
  font-size: clamp(56px, 9vw, 140px); line-height: .9; letter-spacing: -0.01em; }
.content p { margin-top: 22px; font-size: 15px; letter-spacing: .04em; opacity: .85; }
.content .cta { margin-top: 30px; background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.65);
  padding: 14px 30px; border-radius: 40px; font-size: 11px; letter-spacing: .22em; text-transform: uppercase; cursor: pointer;
  transition: .4s cubic-bezier(.22,1,.36,1); }
.content .cta:hover { background: #fff; color: #0c0a08; }

.hud { position: fixed; inset: 0; pointer-events: none; z-index: 40; mix-blend-mode: difference; color: #fff; }
.hud > * { position: absolute; }
.wm { top: 30px; left: 34px; font-size: 13px; letter-spacing: .2em; }
.nv { top: 30px; right: 34px; font-size: 12px; letter-spacing: .16em; }
.ix { bottom: 28px; right: 34px; font-family: "Playfair Display", serif; font-style: italic; font-size: 15px; }
.ht { bottom: 30px; left: 34px; font-size: 11px; letter-spacing: .2em; text-transform: uppercase; opacity: .7; }
.bar { position: fixed; left: 0; bottom: 0; height: 2px; background: #c8a24a; z-index: 41; }

@media (max-width: 600px) {
  .content { bottom: 15vh; }
  .content .k { letter-spacing: .22em; }
}
</style>
