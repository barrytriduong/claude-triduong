// Small shared helpers used by every part of the site.

export const $ = (sel, root = document) => root.querySelector(sel);

/** Tiny DOM builder: h("div", {class: "x", onclick}, child, "text"). Text is always escaped. */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c);
  return el;
}

/** Like el.replaceChildren(), but nested lists are flattened and false/null skipped. */
export function fill(el, ...children) {
  el.replaceChildren(...children.flat(Infinity).filter((c) => c != null && c !== false));
  return el;
}

const SVG_NS = "http://www.w3.org/2000/svg";
/** Same as h() but for SVG elements. */
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) el.setAttribute(k, v);
  for (const c of children.flat()) if (c != null && c !== false) el.append(c);
  return el;
}

export function openDialog(sel) {
  const d = typeof sel === "string" ? $(sel) : sel;
  if (!d.open) d.showModal();
}

let toastTimer;
export function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

export const parseDate = (str) => new Date(`${str}T00:00:00Z`);
export const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayISO = () => isoOf(new Date());

/** Download a Blob as a file. */
export function download(blob, filename) {
  const a = h("a", { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

/** Load a classic <script> once (for CDN libraries such as JSZip). */
const loaded = new Map();
export function loadScript(src) {
  if (!loaded.has(src)) {
    loaded.set(src, new Promise((resolve, reject) => {
      document.head.append(h("script", { src, onload: resolve, onerror: () => reject(new Error(`Could not load ${src}`)) }));
    }));
  }
  return loaded.get(src);
}
