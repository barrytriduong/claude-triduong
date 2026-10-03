// Gentle "glide" for mouse-wheel scrolling on computers. Touch screens, trackpad
// momentum, keyboard and scrollbar dragging keep the browser's own scrolling.

const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;

let target = window.scrollY;
let current = window.scrollY;
let animating = false;
let paused = false;

const maxScroll = () => document.documentElement.scrollHeight - innerHeight;

/** Is the wheel over something that scrolls by itself (a dialog, a panel, a list)? */
function insideScroller(el) {
  for (; el && el !== document.body; el = el.parentElement) {
    if (el.matches?.("dialog, .music-panel, .lightbox, .emoji-pop, [data-native-scroll]")) return true;
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) return true;
  }
  return false;
}

function step() {
  current += (target - current) * 0.12;
  if (Math.abs(target - current) < 0.5) current = target;
  window.scrollTo({ top: current, behavior: "instant" });
  if (current !== target) requestAnimationFrame(step);
  else animating = false;
}

if (fine && !calm) {
  window.addEventListener("wheel", (e) => {
    if (paused || e.ctrlKey || e.defaultPrevented || insideScroller(e.target) || document.querySelector("dialog[open]")) return;
    // A mouse wheel "click" moves ~100px at once; trackpads send many small steps with
    // their own momentum, so leave those to the browser.
    const lines = e.deltaMode === 1;
    if (!lines && Math.abs(e.deltaY) < 50) return;
    e.preventDefault();
    if (!animating) current = target = window.scrollY;
    const delta = lines ? e.deltaY * 40 : e.deltaY;
    target = Math.max(0, Math.min(maxScroll(), target + delta * 1.1));
    if (!animating) { animating = true; requestAnimationFrame(step); }
  }, { passive: false });

  // Keyboard, scrollbar, links: follow wherever the page actually is.
  window.addEventListener("scroll", () => { if (!animating) current = target = window.scrollY; }, { passive: true });
}

/** Glide smoothly to a position (used by "back to top" and jumps). */
export function glideTo(y) {
  target = Math.max(0, Math.min(maxScroll(), y));
  if (calm) return window.scrollTo({ top: target, behavior: "instant" });
  if (!animating) { current = window.scrollY; animating = true; requestAnimationFrame(step); }
}

/** The slideshow drives scrolling itself, so pause the glide while it runs. */
export function pauseGlide(on) {
  paused = on;
  if (on) { target = current = window.scrollY; }
}
