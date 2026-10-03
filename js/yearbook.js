// 📖 Year book: one year as a printable scrapbook (print it, or "Save as PDF").
// Pages are fixed A4 sheets, so what you see on screen is exactly what prints.
// Each memory: a handwritten title, its photos as taped polaroids, and the story
// on a little note card. Memories with only videos are left out.

import { state } from "./state.js";
import { $, h } from "./util.js";
import { t } from "./i18n.js";
import { openForm } from "./form.js";

const MAX_PHOTOS = 4;
const FONTS = "https://fonts.googleapis.com/css2?family=Pangolin&family=Patrick+Hand&display=swap";
const STICKERS = ["🌸", "⭐", "💕", "🎀", "🌈", "🦋", "🍓", "🌼", "✨", "🐣", "🧸", "🍭", "☁️", "💐"];
const TAPES = ["pink", "mint", "lemon", "sky", "lavender", "peach"];
const PAPERS = ["dots", "gingham", "grid", "stripes", "hearts"];

const published = () => state.events.filter((ev) => !ev.status || ev.status === "published");
const photosOf = (ev) => (ev.media || []).filter((m) => m.type === "image" && m.src);
// Video-only memories are skipped; memories without any media are kept as notes.
const bookable = (ev) => photosOf(ev).length > 0 || !(ev.media || []).length;

export function openYearbook() {
  const years = [...new Set(published().filter(bookable).map((ev) => ev.date.slice(0, 4)))].sort().reverse();
  if (!years.length) return;
  openForm({
    title: t("ybTitle"),
    intro: t("ybIntro"),
    fields: [{ name: "year", label: t("ybYear"), type: "select", value: years[0], options: years.map((y) => [y, y]) }],
    submitLabel: t("ybMake"),
    onSubmit: async (v) => { buildBook(v.year); },
  });
}

/** Small seeded random numbers, so a memory always gets the same tilt, tape and stickers. */
function seeded(text) {
  let a = 2166136261;
  for (const c of String(text)) a = Math.imul(a ^ c.charCodeAt(0), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];
const tilt = (rnd, max) => `${((rnd() * 2 - 1) * max).toFixed(2)}deg`;

function polaroid(src, rnd) {
  return h("figure", { class: `sb-photo tape-${pick(rnd, TAPES)}`, style: `--r:${tilt(rnd, 3.2)}` },
    h("img", { src, alt: "" }));
}

function memoryBlock(ev) {
  const rnd = seeded(ev.id || ev.title);
  const photos = photosOf(ev).slice(0, MAX_PHOTOS);
  return h("section", { class: `sb-mem n${photos.length}` },
    h("h2", { class: `sb-title tape-${pick(rnd, TAPES)}`, style: `--r:${tilt(rnd, 1.6)}` }, ev.title),
    photos.length > 0 && h("div", { class: "sb-photos" }, photos.map((m) => polaroid(m.src, rnd))),
    ev.description && h("div", { class: "sb-note", style: `--r:${tilt(rnd, 1.2)}` }, h("p", {}, ev.description)));
}

function page(children, i, rnd) {
  const corners = ["tl", "tr", "bl", "br"].sort(() => rnd() - 0.5).slice(0, 2);
  return h("div", { class: `sb-page paper-${PAPERS[i % PAPERS.length]}` },
    corners.map((c) => h("span", { class: `sb-sticker ${c}`, style: `--r:${tilt(rnd, 18)}`, "aria-hidden": "true" }, pick(rnd, STICKERS))),
    h("div", { class: "sb-content" }, children));
}

/** Big memories get a whole page; small ones share a page two by two. */
function layoutPages(events) {
  const pages = [];
  let waiting = null;
  for (const ev of events) {
    const n = Math.min(photosOf(ev).length, MAX_PHOTOS);
    const small = n <= 2 && (ev.description || "").length <= 280;
    if (!small) {
      if (waiting) pages.push([waiting]);
      waiting = null;
      pages.push([ev]);
    } else if (waiting) {
      pages.push([waiting, ev]);
      waiting = null;
    } else {
      waiting = ev;
    }
  }
  if (waiting) pages.push([waiting]);
  return pages;
}

function cover(year, events) {
  const name = state.settings.name || t("defaultName");
  const rnd = seeded(`cover-${year}`);
  const photos = events.flatMap(photosOf).slice(0, 3);
  return h("div", { class: "sb-page sb-cover paper-dots" },
    ["tl", "tr", "bl", "br"].map((c) => h("span", { class: `sb-sticker ${c}`, style: `--r:${tilt(rnd, 18)}`, "aria-hidden": "true" }, pick(rnd, STICKERS))),
    h("div", { class: "sb-content" },
      h("div", { class: `sb-photos cover-photos n${photos.length}` }, photos.map((m) => polaroid(m.src, rnd))),
      h("h1", { class: "sb-cover-name" }, name),
      h("p", { class: "sb-cover-year" }, year)));
}

async function buildBook(year) {
  if (!document.querySelector(`link[href="${FONTS}"]`)) document.head.append(h("link", { rel: "stylesheet", href: FONTS }));
  const events = published().filter((ev) => ev.date.startsWith(year) && bookable(ev)).sort((a, b) => a.date.localeCompare(b.date));
  const status = h("small", { class: "muted" }, t("ybLoading"));
  const printBtn = h("button", { type: "button", class: "btn btn-primary", disabled: true, onclick: () => window.print() }, t("ybPrint"));
  const rndPages = seeded(`pages-${year}`);
  const sheets = h("div", { class: "sb-sheets" },
    cover(year, events),
    layoutPages(events).map((list, i) => page(list.map(memoryBlock), i, rndPages)));
  const book = h("div", { class: "yearbook" },
    h("div", { class: "yb-tools no-print" },
      printBtn,
      h("button", { type: "button", class: "btn btn-ghost", onclick: () => { book.remove(); removeEventListener("resize", zoom); } }, t("close")),
      status),
    sheets);
  document.body.append(book);
  window.scrollTo({ top: 0, behavior: "instant" });

  // Phones: shrink the A4 sheets to the screen (printing always uses full size).
  const zoom = () => { sheets.style.zoom = String(Math.min(1, (book.clientWidth - 24) / sheets.firstElementChild.offsetWidth)); };
  addEventListener("resize", zoom);

  // Wait for the photos and handwriting fonts, then size everything to fit its page.
  await Promise.race([
    Promise.all([
      ...[...sheets.querySelectorAll("img")].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))),
      document.fonts.load("20px Pangolin"), document.fonts.load("20px 'Patrick Hand'"),
    ]),
    new Promise((r) => setTimeout(r, 15000)),
  ]);
  sheets.style.zoom = "1";
  sheets.querySelectorAll(".sb-page").forEach(fitPage);
  zoom();
  status.textContent = t("ybHint");
  printBtn.disabled = false;
}

/** Shrinks photos (then the story text) until every memory fits inside its page. */
function fitPage(pg) {
  const content = pg.querySelector(".sb-content");
  const blocks = pg.classList.contains("sb-cover") ? [content] : [...pg.querySelectorAll(".sb-mem")];
  for (const block of blocks) {
    const photos = block.querySelector(".sb-photos");
    const rows = photos && block.querySelectorAll(".sb-photo").length > 2 ? 2 : 1;
    const overflows = () => block.scrollHeight > block.clientHeight + 1 || content.scrollHeight > content.clientHeight + 1;
    if (photos) {
      // Start from the space left once the title and story are placed.
      const others = [...block.children].filter((c) => c !== photos).reduce((sum, c) => sum + c.offsetHeight, 0);
      let ph = Math.max(80, (block.clientHeight - others - 40) / rows - 40);
      block.style.setProperty("--ph", `${ph}px`);
      while (overflows() && ph > 70) {
        ph *= 0.93;
        block.style.setProperty("--ph", `${ph}px`);
      }
    }
    let fs = 1;
    while (overflows() && fs > 0.6) {
      fs -= 0.05;
      block.style.setProperty("--fs", fs.toFixed(2));
    }
  }
}
