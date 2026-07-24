<script setup lang="ts">
// Full-screen cinematic, modelled on firstframe.fr / electrafilmworks.com:
// colour full-bleed video, confident type, brutal restraint, an elegant chrome bar
// (counter · title · Prev/Next). Transitions are discrete crossfades on wheel / drag /
// arrows (crisp, not slow scroll). HLS virtualized to the active scene.
import { ref, onMounted, onBeforeUnmount } from "vue";

interface Item { name: string; cat: string; meta: string; poster: string; }
const SRC = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"; // stand-in; prod = each product's colour-graded Cloudflare .m3u8

const items: Item[] = [
  { name: "Nocturne", cat: "Horlogerie", meta: "Maison Aurelia — €142,000", poster: "linear-gradient(160deg,#161009,#070502)" },
  { name: "Éclat", cat: "High Jewellery", meta: "Maison Aurelia — Price on request", poster: "linear-gradient(160deg,#180a0e,#070203)" },
  { name: "Meridian", cat: "Grand Tourer", meta: "Maison Aurelia — €345,000", poster: "linear-gradient(160deg,#0a121a,#02060a)" },
  { name: "Atelier 01", cat: "Couture", meta: "Maison Aurelia — By appointment", poster: "linear-gradient(160deg,#0a140f,#020604)" },
  { name: "Solstice", cat: "Private Estate", meta: "Maison Aurelia — Como, POA", poster: "linear-gradient(160deg,#140f08,#060402)" },
];
const N = items.length;

useHead({
  title: "Stream Qode — Experience",
  link: [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap" },
  ],
});

const stage = ref<HTMLElement | null>(null);
const active = ref(0);

let gsapRef: any, onWheel: any, onDown: any, onMove: any, onUp: any, onKey: any, goFn: any;
const hlsMap = new Map<number, any>();
let current = 0, busy = false;

onMounted(async () => {
  const gsap = (await import("gsap")).default;
  const Hls = (await import("hls.js")).default;
  gsapRef = gsap;

  const scenes = Array.from(stage.value!.querySelectorAll<HTMLElement>(".scene"));
  const vids = scenes.map((s) => s.querySelector<HTMLVideoElement>(".vid")!);

  function play(k: number) {
    if (hlsMap.has(k)) { vids[k].play().catch(() => {}); return; }
    const v = vids[k]; let h = null;
    if (Hls.isSupported()) { h = new Hls({ maxBufferLength: 6 }); h.loadSource(SRC); h.attachMedia(v); }
    else { v.src = SRC; }
    v.play().catch(() => {});
    hlsMap.set(k, h);
  }
  function drop(k: number) {
    const h = hlsMap.get(k); if (h?.destroy) h.destroy();
    vids[k].pause(); vids[k].removeAttribute("src"); hlsMap.delete(k);
  }

  function go(dir: number) {
    if (busy) return;
    const to = (current + dir + N) % N;
    if (to === current) return;
    busy = true;
    const from = current; current = to; active.value = to;
    play(to);
    gsap.set(scenes[to], { zIndex: 2 });
    gsap.set(scenes[from], { zIndex: 1 });
    gsap.fromTo(scenes[to], { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power2.inOut" });
    // Title of the incoming scene rises in.
    const title = scenes[to].querySelector(".title");
    if (title) gsap.fromTo(title, { yPercent: 12, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: "power3.out", delay: 0.1 });
    gsap.to(scenes[from], { opacity: 0, duration: 0.9, ease: "power2.inOut", onComplete: () => { drop(from); busy = false; } });
  }
  goFn = go;

  // Wheel / drag / keys → discrete step (debounced so one gesture = one move).
  let wheelLock = false;
  onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (wheelLock) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 8) return;
    wheelLock = true; setTimeout(() => (wheelLock = false), 700);
    go(d > 0 ? 1 : -1);
  };
  let downX = 0, dragging = false;
  onDown = (e: PointerEvent) => { dragging = true; downX = e.clientX; };
  onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - downX;
    if (Math.abs(dx) > 60) { dragging = false; go(dx < 0 ? 1 : -1); }
  };
  onUp = () => { dragging = false; };
  onKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
  addEventListener("wheel", onWheel, { passive: false });
  addEventListener("pointerdown", onDown);
  addEventListener("pointermove", onMove);
  addEventListener("pointerup", onUp);
  addEventListener("keydown", onKey);

  play(0);
});

// Exposed to template chrome buttons.
const step = (dir: number) => goFn && goFn(dir);

onBeforeUnmount(() => {
  hlsMap.forEach((h) => h?.destroy && h.destroy());
  hlsMap.clear();
  removeEventListener("wheel", onWheel);
  removeEventListener("pointerdown", onDown);
  removeEventListener("pointermove", onMove);
  removeEventListener("pointerup", onUp);
  removeEventListener("keydown", onKey);
});
</script>

<template>
  <div class="exp">
    <div ref="stage" class="stage">
      <div v-for="(it, i) in items" :key="i" class="scene" :style="{ opacity: i === 0 ? 1 : 0, zIndex: i === 0 ? 2 : 1 }">
        <div class="poster" :style="{ background: it.poster }" />
        <video class="vid" muted loop playsinline preload="none" />
        <div class="grad" />
        <div class="hero">
          <div class="cat">{{ it.cat }}</div>
          <h1 class="title">{{ it.name }}</h1>
          <div class="meta">{{ it.meta }}</div>
        </div>
      </div>

      <!-- Global chrome -->
      <header class="top">
        <span class="brand">STREAM QODE</span>
        <nav class="nav"><span>Collection</span><span>Atelier</span><span>Contact</span></nav>
      </header>

      <div class="chrome">
        <span class="count">{{ String(active + 1).padStart(2, "0") }} <i>/</i> {{ String(N).padStart(2, "0") }}</span>
        <div class="ticks"><i v-for="(it, i) in items" :key="i" :class="{ on: i === active }" /></div>
        <div class="arrows">
          <button @click="step(-1)" aria-label="Previous">Prev</button>
          <button @click="step(1)" aria-label="Next">Next</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #050403; color: #f4f1ea; }
* { box-sizing: border-box; }
.exp { font-family: "Archivo", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }

.stage { position: fixed; inset: 0; overflow: hidden; cursor: grab; }
.stage:active { cursor: grabbing; }

.scene { position: absolute; inset: 0; will-change: opacity; }
.scene .poster { position: absolute; inset: 0; background-size: cover; }
.scene .vid { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: contrast(1.03) saturate(1.04); }
.scene .grad { position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.4) 0%, transparent 22%, transparent 45%, rgba(0,0,0,.78) 100%); }

/* Confident, restrained type — bottom-left, like the film studios. */
.hero { position: absolute; left: clamp(24px,6vw,90px); bottom: clamp(90px,16vh,150px); right: clamp(24px,6vw,90px); }
.hero .cat { font-size: 12px; font-weight: 500; letter-spacing: .35em; text-transform: uppercase; opacity: .75; margin-bottom: 18px; }
.hero .title { margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: -.01em;
  font-size: clamp(52px,8vw,120px); line-height: .92; }
.hero .meta { margin-top: 20px; font-size: 13px; font-weight: 400; letter-spacing: .06em; opacity: .82; }

.top { position: fixed; top: 0; left: 0; right: 0; z-index: 30; display: flex; justify-content: space-between; align-items: center;
  padding: 26px clamp(24px,6vw,90px); }
.top .brand { font-size: 13px; font-weight: 600; letter-spacing: .22em; }
.top .nav { display: flex; gap: 34px; }
.top .nav span { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; opacity: .8; cursor: pointer; transition: .3s; }
.top .nav span:hover { opacity: 1; }

.chrome { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: flex; align-items: center; justify-content: space-between;
  padding: 24px clamp(24px,6vw,90px); pointer-events: none; }
.chrome > * { pointer-events: auto; }
.count { font-size: 13px; letter-spacing: .14em; }
.count i { font-style: normal; opacity: .5; margin: 0 4px; }
.ticks { display: flex; gap: 8px; }
.ticks i { width: 26px; height: 2px; background: rgba(255,255,255,.28); transition: .4s cubic-bezier(.22,1,.36,1); }
.ticks i.on { background: #f4f1ea; }
.arrows { display: flex; gap: 26px; }
.arrows button { background: none; border: 0; color: inherit; font-family: inherit; font-size: 12px; letter-spacing: .16em;
  text-transform: uppercase; opacity: .8; cursor: pointer; transition: .3s; padding: 0; }
.arrows button:hover { opacity: 1; }

@media (max-width: 640px) {
  .top .nav { display: none; }
  .hero { bottom: 110px; }
  .ticks { display: none; }
}
</style>
