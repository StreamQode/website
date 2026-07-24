<script setup lang="ts">
// Fixed full-screen horizontal glide — each product is a full-bleed video panel;
// wheel/drag glides directly between them with GSAP quickTo (crisp, fast, snaps to a
// full screen). No pinned scroll, no Lenis float — direct control for responsiveness.
// HLS video virtualized to the active panel. SSR renders markup; GSAP/HLS on mount.
import { ref, onMounted, onBeforeUnmount } from "vue";

interface Item { name: string; k: string; meta: string; poster: string; tint: string; }
const SRC = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"; // stand-in; prod = each product's Cloudflare .m3u8

const items: Item[] = [
  { name: "Nocturne", k: "Maison Aurelia · Horlogerie", meta: "Limited to 25 — €142,000",
    poster: "radial-gradient(120% 90% at 70% 25%,#6b4e12,transparent 55%),linear-gradient(150deg,#0c0a06,#1b1408)",
    tint: "linear-gradient(120deg,rgba(120,90,20,.4),rgba(20,14,6,.2))" },
  { name: "Éclat", k: "Maison Aurelia · High Jewellery", meta: "One of one — Price on request",
    poster: "radial-gradient(120% 90% at 30% 25%,#7a1f33,transparent 55%),linear-gradient(150deg,#100608,#2a0c14)",
    tint: "linear-gradient(120deg,rgba(150,40,60,.4),rgba(20,6,10,.2))" },
  { name: "Meridian", k: "Maison Aurelia · Motion", meta: "Coachbuilt Grand Tourer — €345,000",
    poster: "radial-gradient(120% 90% at 72% 30%,#244a6b,transparent 55%),linear-gradient(150deg,#06090c,#0f2033)",
    tint: "linear-gradient(120deg,rgba(40,90,140,.4),rgba(6,10,16,.2))" },
  { name: "Atelier 01", k: "Maison Aurelia · Atelier", meta: "Couture — By appointment",
    poster: "radial-gradient(120% 90% at 30% 25%,#1c5a41,transparent 55%),linear-gradient(150deg,#050a08,#0c2419)",
    tint: "linear-gradient(120deg,rgba(30,120,90,.4),rgba(4,10,7,.2))" },
  { name: "Solstice", k: "Maison Aurelia · Estates", meta: "Private residence, Como — POA",
    poster: "radial-gradient(120% 90% at 70% 25%,#5a3a1c,transparent 55%),linear-gradient(150deg,#0a0705,#241708)",
    tint: "linear-gradient(120deg,rgba(120,90,20,.4),rgba(12,8,4,.2))" },
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
const track = ref<HTMLElement | null>(null);
const active = ref(0);
const progress = ref(0);

let gsapRef: any, tickFn: any, onWheel: any, onDown: any, onMove: any, onUp: any, onKey: any;
const hlsMap = new Map<number, any>();

onMounted(async () => {
  const gsap = (await import("gsap")).default;
  const Hls = (await import("hls.js")).default;
  gsapRef = gsap;

  const panels = Array.from(track.value!.querySelectorAll<HTMLElement>(".panel"));
  const vids = panels.map((p) => p.querySelector<HTMLVideoElement>(".vid")!);
  const conts = panels.map((p) => p.querySelector<HTMLElement>(".content")!);
  const vw = () => window.innerWidth;
  const maxX = () => (N - 1) * vw();
  const clamp = (v: number) => Math.max(0, Math.min(maxX(), v));

  // Crisp, fast interpolation of the track's x toward target.
  const xTo = gsap.quickTo(track.value, "x", { duration: 0.55, ease: "power3" });
  let target = 0;

  function manage(k: number) {
    hlsMap.forEach((h, key) => {
      if (key !== k) { if (h?.destroy) h.destroy(); vids[key].pause(); vids[key].removeAttribute("src"); panels[key].classList.remove("play"); hlsMap.delete(key); }
    });
    if (hlsMap.has(k)) return;
    const v = vids[k]; let h = null;
    if (Hls.isSupported()) { h = new Hls({ maxBufferLength: 6 }); h.loadSource(SRC); h.attachMedia(v); }
    else { v.src = SRC; }
    v.play().catch(() => {});
    panels[k].classList.add("play");
    hlsMap.set(k, h);
  }

  // Per-frame: read the animated x, update active panel + subtle content parallax.
  tickFn = () => {
    const cur = Number(gsap.getProperty(track.value, "x")) || 0; // ≤ 0
    progress.value = -cur / (maxX() || 1);
    let near = 0, best = 1e9;
    panels.forEach((p, i) => {
      const left = i * vw() + cur; // panel's left edge vs viewport
      const t = Math.max(0, 1 - Math.abs(left) / (vw() * 0.9));
      const c = conts[i];
      c.style.opacity = (0.12 + t * 0.88).toFixed(3);
      c.style.transform = `translateX(${left * -0.05}px)`;
      const d = Math.abs(left);
      if (d < best) { best = d; near = i; }
    });
    if (near !== active.value) { active.value = near; manage(near); }
  };
  gsap.ticker.add(tickFn);

  let snapTimer: any;
  const snap = () => { target = clamp(Math.round(target / vw()) * vw()); xTo(-target); };
  const schedule = () => { clearTimeout(snapTimer); snapTimer = setTimeout(snap, 130); };

  onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    target = clamp(target + d * 1.35); xTo(-target); schedule();
  };
  let down = false, sx = 0, st = 0;
  onDown = (e: PointerEvent) => { down = true; sx = e.clientX; st = target; };
  onMove = (e: PointerEvent) => { if (down) { target = clamp(st - (e.clientX - sx) * 1.5); xTo(-target); } };
  onUp = () => { if (down) { down = false; snap(); } };
  onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") { target = clamp(Math.round(target / vw()) * vw() + vw()); xTo(-target); }
    if (e.key === "ArrowLeft") { target = clamp(Math.round(target / vw()) * vw() - vw()); xTo(-target); }
  };
  addEventListener("wheel", onWheel, { passive: false });
  addEventListener("pointerdown", onDown);
  addEventListener("pointermove", onMove);
  addEventListener("pointerup", onUp);
  addEventListener("keydown", onKey);

  manage(0);
});

onBeforeUnmount(() => {
  hlsMap.forEach((h) => h?.destroy && h.destroy());
  hlsMap.clear();
  if (gsapRef && tickFn) gsapRef.ticker.remove(tickFn);
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
      <div ref="track" class="track">
        <section v-for="(it, i) in items" :key="i" class="panel">
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
        </section>
      </div>

      <div class="hud">
        <div class="wm">STREAM QODE</div>
        <div class="nv">COLLECTION / ATELIER</div>
        <div class="ix">{{ String(active + 1).padStart(2, "0") }} / {{ String(N).padStart(2, "0") }}</div>
        <div class="ht">DRAG / SCROLL →</div>
      </div>
      <div class="bar" :style="{ width: progress * 100 + '%' }" />
    </div>
  </div>
</template>

<style>
html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #08070a; color: #f2ede4; }
* { box-sizing: border-box; }
.exp { font-family: "Inter", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }

.stage { position: fixed; inset: 0; overflow: hidden; cursor: grab; }
.stage:active { cursor: grabbing; }
.track { display: flex; height: 100vh; height: 100dvh; will-change: transform; }

.panel { position: relative; flex: 0 0 100vw; height: 100vh; height: 100dvh; overflow: hidden; }
.panel .poster { position: absolute; inset: -4%; background-size: cover; background-position: center;
  animation: kb 24s ease-in-out infinite alternate; }
.panel .vid { position: absolute; inset: -4%; width: 108%; height: 108%; object-fit: cover; opacity: 0;
  transition: opacity 1s cubic-bezier(.22,1,.36,1); filter: saturate(.85) contrast(1.04) brightness(.68);
  animation: kb 24s ease-in-out infinite alternate; }
.panel.play .vid { opacity: 1; }
@keyframes kb { from { transform: scale(1.03) translate(-1%,-.5%); } to { transform: scale(1.12) translate(1%,1%); } }
.panel .tint { position: absolute; inset: 0; mix-blend-mode: overlay; }
.panel .vig { position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.32), transparent 28%, transparent 52%, rgba(0,0,0,.72)); }

.content { position: absolute; left: clamp(24px,7vw,120px); right: clamp(24px,7vw,120px); bottom: 17vh; color: #fff; will-change: transform, opacity; }
.content .k { font-size: 11px; letter-spacing: .3em; text-transform: uppercase; opacity: .85; margin-bottom: 20px; }
.content h1 { font-family: "Playfair Display", serif; font-style: italic; font-weight: 600;
  font-size: clamp(56px,9vw,140px); line-height: .9; letter-spacing: -.01em; }
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

@media (max-width: 600px) { .content { bottom: 14vh; } .content .k { letter-spacing: .22em; } }
</style>
