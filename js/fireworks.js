// Soft pastel fireworks: a few bursts of sparkles, hearts and stars around an element.

const COLORS = ["#ff8fb1", "#ffb38a", "#ffd66b", "#74d6b8", "#86c5ff", "#b8a2ff", "#ff6f9f", "#ffe08a"];
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
let canvas, g, parts = [], running = false;

function setup() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.className = "fireworks";
  document.body.append(canvas);
  g = canvas.getContext("2d");
  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  addEventListener("resize", size);
}

function heart(x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.3);
  g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  g.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  g.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  g.fill();
}

function star(x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

function burst(x, y) {
  const n = 46;
  const hue = Math.floor(Math.random() * COLORS.length);
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.2;
    const sp = 2.2 + Math.random() * 3.6;
    parts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 70 + Math.random() * 40,
      color: COLORS[(hue + (i % 3)) % COLORS.length], size: 2 + Math.random() * 3,
      kind: Math.random() < 0.15 ? "heart" : Math.random() < 0.3 ? "star" : "dot",
    });
  }
}

function frame() {
  g.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life < p.max);
  for (const p of parts) {
    p.life++;
    p.vx *= 0.97;
    p.vy = p.vy * 0.97 + 0.05; // a little gravity
    p.x += p.vx;
    p.y += p.vy;
    const fade = 1 - p.life / p.max;
    g.globalAlpha = Math.max(fade, 0);
    g.fillStyle = p.color;
    if (p.kind === "heart") heart(p.x, p.y, p.size * 3);
    else if (p.kind === "star") star(p.x, p.y, p.size * 1.8);
    else { g.beginPath(); g.arc(p.x, p.y, p.size * fade + 0.5, 0, Math.PI * 2); g.fill(); }
  }
  g.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(frame);
  else running = false;
}

/** Celebrate around an element: three bursts, one after another. */
export function celebrate(el) {
  if (calm) return;
  setup();
  const r = el.getBoundingClientRect();
  const spots = [[r.left + r.width * 0.2, r.top + 30], [r.right - r.width * 0.15, r.top + r.height * 0.3], [r.left + r.width * 0.55, r.top - 10]];
  spots.forEach(([x, y], i) => setTimeout(() => {
    burst(x, y);
    if (!running) { running = true; requestAnimationFrame(frame); }
  }, i * 320));
}
