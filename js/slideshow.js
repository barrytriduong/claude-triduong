// Slideshow: pick a date range and a speed, and the timeline scrolls by itself.

import { state, hooks } from "./state.js";
import { $, h, openDialog } from "./util.js";
import { t } from "./i18n.js";
import { startMusic, stopMusic, musicOn } from "./music.js";

const SPEEDS = { slow: 28, normal: 55, fast: 100 }; // pixels per second

const show = { running: false, paused: false, speed: "normal", loop: false, last: 0, lock: null, bar: null, carry: 0 };

export function openSlideshow() {
  const f = $("#slideForm");
  const dates = state.events.filter((ev) => ev.status !== "draft" && ev.status !== "pending").map((ev) => ev.date).sort();
  f.from.value = f.from.value || dates[0] || "";
  f.to.value = f.to.value || dates.at(-1) || "";
  f.from.min = f.to.min = dates[0] || "";
  f.from.max = f.to.max = dates.at(-1) || "";
  openDialog("#slideDialog");
}

$("#slideForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  let from = f.from.value;
  let to = f.to.value;
  if (from && to && from > to) [from, to] = [to, from];
  state.range = { from, to };
  show.speed = f.speed.value;
  show.loop = f.loop.checked;
  // Start the music from this tap (browsers need a tap before playing sound).
  show.ownMusic = f.music.checked && !musicOn();
  if (show.ownMusic) startMusic();
  $("#slideDialog").close();
  start();
});

async function start() {
  state.filterTag = null;
  document.body.classList.add("slideshow");
  hooks.renderTimeline();
  document.querySelectorAll(".event").forEach((el) => el.classList.add("visible"));
  const first = $(".year-marker") || $("#timeline");
  window.scrollTo({ top: first.getBoundingClientRect().top + window.scrollY - 40, behavior: "instant" });
  show.running = true;
  show.paused = false;
  show.last = 0;
  show.carry = 0;
  renderBar();
  try { show.lock = await navigator.wakeLock?.request("screen"); } catch { /* not supported */ }
  requestAnimationFrame(step);
}

function step(ts) {
  if (!show.running) return;
  if (show.paused || !show.last) {
    show.last = ts;
    return requestAnimationFrame(step);
  }
  const dt = Math.min((ts - show.last) / 1000, 0.1);
  show.last = ts;
  // Scroll whole pixels, carrying the remainder, so slow speeds still move smoothly.
  show.carry += SPEEDS[show.speed] * dt;
  const px = Math.floor(show.carry);
  show.carry -= px;
  if (px) window.scrollBy({ top: px, behavior: "instant" });

  const end = $("#timeline").getBoundingClientRect().bottom;
  if (end < window.innerHeight * 0.55) {
    if (show.loop) {
      const first = $(".year-marker") || $("#timeline");
      window.scrollTo({ top: first.getBoundingClientRect().top + window.scrollY - 40, behavior: "instant" });
    } else {
      return stop();
    }
  }
  requestAnimationFrame(step);
}

export function stop() {
  if (!show.running) return;
  show.running = false;
  show.bar?.remove();
  show.bar = null;
  show.lock?.release?.().catch(() => {});
  show.lock = null;
  document.body.classList.remove("slideshow");
  if (show.ownMusic) stopMusic();
  show.ownMusic = false;
  state.range = null;
  hooks.renderTimeline({ keepScroll: true });
}

function renderBar() {
  show.bar?.remove();
  const speedBtn = (key) => h("button", {
    type: "button", class: `slide-speed${show.speed === key ? " on" : ""}`,
    onclick: () => { show.speed = key; renderBar(); },
  }, t(`speed_${key}`));
  show.bar = h("div", { class: "slide-bar", role: "toolbar" },
    h("button", {
      type: "button", class: "slide-play", "aria-label": show.paused ? t("slidePlay") : t("slidePause"),
      onclick: () => { show.paused = !show.paused; renderBar(); },
    }, show.paused ? "▶️" : "⏸️"),
    speedBtn("slow"), speedBtn("normal"), speedBtn("fast"),
    h("button", { type: "button", class: "slide-stop", onclick: stop }, "⏹️ ", t("slideStop")));
  document.body.append(show.bar);
}

// Touching, wheeling or pressing a key pauses, so people can linger on a memory.
const pause = (e) => {
  if (!show.running || show.paused || e.target.closest?.(".slide-bar")) return;
  show.paused = true;
  renderBar();
};
window.addEventListener("wheel", pause, { passive: true });
window.addEventListener("touchstart", pause, { passive: true });
window.addEventListener("keydown", (e) => {
  if (!show.running) return;
  if (e.key === "Escape") stop();
  else if (e.key === " ") { e.preventDefault(); show.paused = !show.paused; renderBar(); }
  else pause(e);
});
