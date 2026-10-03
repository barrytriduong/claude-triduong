// A cute pointer (pink arrow, and a magic wand over things you can tap) with a
// little trail of sparkles. Only on computers with a mouse; off for reduced motion.

const ARROW = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
  <path d='M4 3 L4 24 L9.5 19 L13 27 L16.8 25.4 L13.4 17.6 L21 17.6 Z' fill='%23ff8fb1' stroke='white' stroke-width='2' stroke-linejoin='round'/>
  <path d='M24 4 c1.3-2.2 4.6-1.2 4 1.3 c-.4 1.9-4 4.2-4 4.2 s-3.6-2.3-4-4.2 c-.6-2.5 2.7-3.5 4-1.3z' fill='%23ffb3cf' stroke='white' stroke-width='1.2'/>
</svg>`;
const WAND = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
  <path d='M12 11 L28 27' stroke='%23b8a2ff' stroke-width='4' stroke-linecap='round'/>
  <path d='M12 11 L28 27' stroke='white' stroke-width='1.2' stroke-linecap='round' stroke-dasharray='2 3'/>
  <path d='M8 1.5 L10.2 6.2 L15.3 6.8 L11.5 10.2 L12.5 15.2 L8 12.7 L3.5 15.2 L4.5 10.2 L0.7 6.8 L5.8 6.2 Z' fill='%23ffd66b' stroke='white' stroke-width='1.3' stroke-linejoin='round'/>
</svg>`;
const url = (svg) => `url("data:image/svg+xml,${svg.replace(/\n\s*/g, " ").replace(/"/g, "'").replace(/#/g, "%23")}")`;

const style = document.createElement("style");
style.textContent = `
  body.cute-cursor, body.cute-cursor * { cursor: ${url(ARROW)} 4 3, auto; }
  body.cute-cursor :is(a, button, label, select, summary, [role=button], .item, .swatch, input[type=checkbox], input[type=radio], input[type=range], .emoji-opt, .jump-pill) { cursor: ${url(WAND)} 8 8, pointer; }
  body.cute-cursor :is(input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), textarea) { cursor: text; }
  .sparkle-trail { position: fixed; z-index: 2147483000; pointer-events: none; font-size: 14px; line-height: 1;
    animation: trail .8s ease-out forwards; }
  @keyframes trail { from { opacity: 1; transform: translate(-50%, -50%) scale(1); } to { opacity: 0; transform: translate(-50%, 18px) scale(.4) rotate(40deg); } }
`;
document.head.append(style);

const fine = matchMedia("(pointer: fine)").matches;
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const BITS = ["✦", "✧", "♡", "✦", "⋆"];
const COLORS = ["#ff8fb1", "#ffb38a", "#ffd66b", "#74d6b8", "#86c5ff", "#b8a2ff"];
let enabled = false;
let last = 0;

window.addEventListener("pointermove", (e) => {
  if (!enabled || calm || e.pointerType !== "mouse") return;
  const now = performance.now();
  if (now - last < 45) return;
  last = now;
  const s = document.createElement("span");
  s.className = "sparkle-trail";
  s.textContent = BITS[Math.floor(Math.random() * BITS.length)];
  s.style.left = `${e.clientX + 6 + Math.random() * 8}px`;
  s.style.top = `${e.clientY + 8 + Math.random() * 8}px`;
  s.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
  document.body.append(s);
  setTimeout(() => s.remove(), 800);
}, { passive: true });

/** Turn the cute pointer on or off (it only shows on computers with a mouse). */
export function setCuteCursor(on) {
  enabled = !!on && fine;
  document.body.classList.toggle("cute-cursor", enabled);
}
