// Growth tab: height & weight over time — latest-value tiles, one line chart per
// measure (never a dual axis), and a table of every measurement.

import { state, hooks } from "./state.js";
import { $, h, s, openDialog, toast, todayISO, parseDate } from "./util.js";
import { t, fmtDate, ageLabel, ageParts, locale } from "./i18n.js";

const SERIES = {
  height_cm: { color: "#e0557f", unit: "cm", label: "height", digits: 1 },
  weight_kg: { color: "#2f86d4", unit: "kg", label: "weight", digits: 2 },
};

export async function loadGrowth() {
  state.measurements = (await state.store.listMeasurements())
    .map((m) => ({ ...m, height_cm: num(m.height_cm), weight_kg: num(m.weight_kg) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
const fmtNum = (v, digits) => Number(v).toLocaleString(locale(), { maximumFractionDigits: digits });

export function renderGrowth() {
  const body = $("#growthBody");
  $("#btnAddMeasurement").hidden = !state.access.admin;
  const ms = state.measurements;
  if (!ms.length) {
    body.replaceChildren(h("div", { class: "empty" },
      h("div", { class: "empty-emoji" }, "📏"),
      h("h2", {}, t("growthEmpty")),
      state.access.admin && h("p", {}, t("growthEmptyAdmin"))));
    return;
  }

  body.replaceChildren(
    h("div", { class: "stat-row" }, Object.keys(SERIES).map((key) => statTile(key))),
    h("div", { class: "chart-grid" }, Object.keys(SERIES).map((key) => chartCard(key))),
    measurementTable());
}

function statTile(key) {
  const cfg = SERIES[key];
  const points = state.measurements.filter((m) => m[key] != null);
  const last = points.at(-1);
  const prev = points.at(-2);
  if (!last) return null;
  const delta = prev ? last[key] - prev[key] : null;
  return h("div", { class: "stat-tile" },
    h("div", { class: "stat-label" }, h("i", { class: "key-dot", style: `background:${cfg.color}` }), t(cfg.label)),
    h("div", { class: "stat-value" }, fmtNum(last[key], cfg.digits), h("small", {}, ` ${cfg.unit}`)),
    h("div", { class: "muted stat-sub" }, t("measuredOn", { date: fmtDate(last.date) }),
      state.settings.birthday && ` · ${ageLabel(state.settings.birthday, last.date)}`),
    delta != null && delta !== 0 && h("div", { class: "stat-delta" },
      t("sinceLast", { delta: `${delta > 0 ? "+" : "−"}${fmtNum(Math.abs(delta), cfg.digits)} ${cfg.unit}` })));
}

// ---------- Chart ----------

const H = 260, PAD = { top: 16, right: 20, bottom: 34, left: 44 };
// Narrower drawing on phones so the text stays readable when scaled to fit.
const chartWidth = () => Math.round(Math.min(600, Math.max(320, window.innerWidth - 60)));

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((st) => st >= raw);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return ticks;
}

/** Compact axis label: "birth", "5 mo", "2 y" (or the month/year when no birthday is set). */
function axisLabel(date) {
  const b = state.settings.birthday;
  if (!b) return fmtDate(date, { month: "short", year: "numeric" });
  const { days, months } = ageParts(b, date);
  if (days <= 0) return t("axisBirth");
  return months < 24 ? t("axisMonths", { n: months }) : t("axisYears", { n: +(months / 12).toFixed(1) });
}

function chartCard(key) {
  const cfg = SERIES[key];
  const W = chartWidth();
  const pts = state.measurements.filter((m) => m[key] != null).map((m) => ({ m, x: parseDate(m.date).getTime(), y: m[key] }));
  const card = h("figure", { class: "chart-card" },
    h("figcaption", {}, h("i", { class: "key-dot", style: `background:${cfg.color}` }), t(cfg.label), h("span", { class: "muted" }, ` (${cfg.unit})`)));
  if (pts.length < 2) {
    card.append(h("p", { class: "muted chart-note" }, pts.length ? `${fmtNum(pts[0].y, cfg.digits)} ${cfg.unit} · ${fmtDate(pts[0].m.date)}` : "—"));
    return card;
  }

  const xs = pts.map((p) => p.x);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const ticks = niceTicks(Math.min(...pts.map((p) => p.y)), Math.max(...pts.map((p) => p.y)));
  const y0 = ticks[0], y1 = ticks.at(-1);
  const sx = (x) => PAD.left + ((x - x0) / (x1 - x0 || 1)) * (W - PAD.left - PAD.right);
  const sy = (y) => H - PAD.bottom - ((y - y0) / (y1 - y0 || 1)) * (H - PAD.top - PAD.bottom);

  const line = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");
  const area = `${line}L${sx(x1).toFixed(1)},${H - PAD.bottom}L${sx(x0).toFixed(1)},${H - PAD.bottom}Z`;

  // X labels: first and last measurement, plus the middle one only when it has room.
  const mid = pts[Math.floor((pts.length - 1) / 2)];
  const midFits = sx(mid.x) - sx(x0) > 110 && sx(x1) - sx(mid.x) > 110;
  const labelPts = [pts[0], midFits && mid, pts.at(-1)].filter(Boolean);

  const cross = s("line", { class: "crosshair", y1: PAD.top, y2: H - PAD.bottom, visibility: "hidden" });
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": `${t(cfg.label)} (${cfg.unit})` },
    ticks.map((v) => s("g", {},
      s("line", { class: "grid", x1: PAD.left, x2: W - PAD.right, y1: sy(v), y2: sy(v) }),
      s("text", { class: "axis", x: PAD.left - 8, y: sy(v) + 4, "text-anchor": "end" }, fmtNum(v, 1)))),
    labelPts.map((p, i) => s("text", {
      class: "axis", x: sx(p.x), y: H - 10,
      "text-anchor": i === 0 ? "start" : i === labelPts.length - 1 ? "end" : "middle",
    }, axisLabel(p.m.date))),
    s("path", { d: area, fill: cfg.color, "fill-opacity": "0.1" }),
    s("path", { d: line, fill: "none", stroke: cfg.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }),
    cross,
    pts.map((p) => s("circle", { cx: sx(p.x), cy: sy(p.y), r: 4.5, fill: cfg.color, stroke: "#fff", "stroke-width": 2 })),
    // End label: the latest value, beside the last point.
    s("text", { class: "end-label", x: sx(pts.at(-1).x) - 8, y: sy(pts.at(-1).y) - 10, "text-anchor": "end" },
      `${fmtNum(pts.at(-1).y, cfg.digits)} ${cfg.unit}`));

  // Hover: snap to the nearest measurement; crosshair + tooltip.
  const tip = h("div", { class: "chart-tip", hidden: true });
  const wrap = h("div", { class: "chart-wrap" }, svg, tip);
  const onMove = (e) => {
    const r = svg.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    const p = pts.reduce((best, q) => (Math.abs(sx(q.x) - vx) < Math.abs(sx(best.x) - vx) ? q : best));
    cross.setAttribute("x1", sx(p.x));
    cross.setAttribute("x2", sx(p.x));
    cross.setAttribute("visibility", "visible");
    tip.replaceChildren(
      h("b", {}, `${fmtNum(p.y, cfg.digits)} ${cfg.unit}`),
      h("div", {}, fmtDate(p.m.date)),
      state.settings.birthday && h("div", { class: "muted" }, ageLabel(state.settings.birthday, p.m.date)),
      p.m.note && h("div", { class: "muted" }, p.m.note));
    tip.hidden = false;
    const left = (sx(p.x) / W) * r.width;
    tip.style.left = `${Math.min(Math.max(left, 70), r.width - 70)}px`;
    tip.style.top = `${(sy(p.y) / H) * r.height}px`;
  };
  const onLeave = () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); };
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerdown", onMove);
  svg.addEventListener("pointerleave", onLeave);
  card.append(wrap);
  return card;
}

// ---------- Table (also the accessible view of the charts) ----------

function measurementTable() {
  const admin = state.access.admin;
  const rows = [...state.measurements].reverse();
  const notes = rows.some((m) => m.note);
  const shortDate = (d) => fmtDate(d, { day: "numeric", month: "numeric", year: "numeric" });
  return h("details", { class: "measure-table", open: rows.length <= 8 },
    h("summary", {}, t("allMeasurements"), ` (${rows.length})`),
    h("table", {},
      h("thead", {}, h("tr", {},
        h("th", {}, t("colDate")), state.settings.birthday && h("th", {}, t("colAge")),
        h("th", { class: "num" }, t("mHeight")), h("th", { class: "num" }, t("mWeight")), notes && h("th", {}, t("mNote")),
        admin && h("th", {}))),
      h("tbody", {}, rows.map((m) => h("tr", {},
        h("td", { class: "nowrap" }, shortDate(m.date)),
        state.settings.birthday && h("td", {}, ageLabel(state.settings.birthday, m.date)),
        h("td", { class: "num" }, m.height_cm != null ? fmtNum(m.height_cm, 1) : "—"),
        h("td", { class: "num" }, m.weight_kg != null ? fmtNum(m.weight_kg, 2) : "—"),
        notes && h("td", { class: "muted" }, m.note || ""),
        admin && h("td", {}, h("button", { type: "button", class: "link-btn", onclick: () => openMeasure(m) }, "✏️")))))));
}

// ---------- Editor ----------

let editingId = null;

function openMeasure(m = null) {
  const f = $("#measureForm");
  f.reset();
  editingId = m?.id || null;
  $("#measureDialogTitle").textContent = t(m ? "editMeasurement" : "newMeasurement");
  $("#measureError").hidden = true;
  $("#btnDeleteMeasure").hidden = !m;
  f.date.value = m?.date || todayISO();
  f.height_cm.value = m?.height_cm ?? "";
  f.weight_kg.value = m?.weight_kg ?? "";
  f.note.value = m?.note || "";
  openDialog("#measureDialog");
}

$("#btnAddMeasurement").addEventListener("click", () => openMeasure());

$("#measureForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const height_cm = num(f.height_cm.value);
  const weight_kg = num(f.weight_kg.value);
  const err = $("#measureError");
  if (height_cm == null && weight_kg == null) {
    err.textContent = t("needOneValue");
    err.hidden = false;
    return;
  }
  try {
    await state.store.saveMeasurement({ id: editingId, date: f.date.value, height_cm, weight_kg, note: f.note.value.trim() });
    $("#measureDialog").close();
    await loadGrowth();
    hooks.renderGrowth();
    toast(t("saved"));
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
  }
});

$("#btnDeleteMeasure").addEventListener("click", async () => {
  if (!editingId || !confirm(t("confirmDeleteMeasurement"))) return;
  try {
    await state.store.deleteMeasurement(editingId);
    $("#measureDialog").close();
    await loadGrowth();
    hooks.renderGrowth();
  } catch (ex) {
    toast(ex.message);
  }
});
