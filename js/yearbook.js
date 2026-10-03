// 📖 Year book: one year as printable pages (print it, or "Save as PDF").

import { state } from "./state.js";
import { $, h } from "./util.js";
import { t, fmtDate, ageLabel, locale } from "./i18n.js";
import { openForm } from "./form.js";
import { personById } from "./world.js";

const age = (d) => (state.settings.birthday ? ageLabel(state.settings.birthday, d) : "");
const published = () => state.events.filter((ev) => !ev.status || ev.status === "published");

export function openYearbook() {
  const years = [...new Set(published().map((ev) => ev.date.slice(0, 4)))].sort().reverse();
  if (!years.length) return;
  openForm({
    title: t("ybTitle"),
    intro: t("ybIntro"),
    fields: [{ name: "year", label: t("ybYear"), type: "select", value: years[0], options: years.map((y) => [y, y]) }],
    submitLabel: t("ybMake"),
    onSubmit: async (v) => buildBook(v.year),
  });
}

function buildBook(year) {
  const s = state.settings;
  const name = s.name || t("defaultName");
  const inYear = (d) => d?.startsWith(year);
  const events = published().filter((ev) => inYear(ev.date)).sort((a, b) => a.date.localeCompare(b.date));
  const cover = events.flatMap((ev) => ev.media || []).find((m) => m.type === "image")?.src;
  const sayings = state.rows.sayings.filter((x) => inYear(x.date)).reverse();
  const milestones = state.rows.milestones.filter((m) => inYear(m.date)).sort((a, b) => a.date.localeCompare(b.date));
  const card = state.rows.about_cards.filter((c) => inYear(c.date)).at(-1);
  const ms = state.measurements.filter((m) => inYear(m.date));
  const first = ms[0], last = ms.at(-1);
  const months = new Map();
  for (const ev of events) {
    const key = ev.date.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(ev);
  }
  const monthName = (key) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString(locale(), { month: "long", timeZone: "UTC" });

  const book = h("div", { class: "yearbook" },
    h("div", { class: "yb-tools no-print" },
      h("button", { type: "button", class: "btn btn-primary", onclick: () => window.print() }, t("ybPrint")),
      h("button", { type: "button", class: "btn btn-ghost", onclick: () => book.remove() }, t("close")),
      h("small", { class: "muted" }, t("ybHint"))),
    // Cover
    h("section", { class: "yb-page yb-cover" },
      cover && h("img", { src: cover, alt: "" }),
      h("h1", {}, name),
      h("p", { class: "yb-year" }, year),
      events[0] && h("p", { class: "muted" }, [age(events[0].date), age(events.at(-1).date)].filter((x, i, a) => x && a.indexOf(x) === i).join(" → "))),
    // Month by month
    [...months.entries()].map(([key, list]) => h("section", { class: "yb-page" },
      h("h2", {}, monthName(key)),
      list.map((ev) => h("article", { class: "yb-memory" },
        h("h3", {}, `${ev.emoji || "⭐"} ${ev.title}`),
        h("p", { class: "yb-meta" }, [fmtDate(ev.date), age(ev.date), ev.place?.name && `📍 ${ev.place.name}`,
          (ev.people || []).map((id) => personById(id)?.name).filter(Boolean).join(", ")].filter(Boolean).join(" · ")),
        ev.description && h("p", {}, ev.description),
        h("div", { class: "yb-photos" }, (ev.media || []).filter((m) => m.type === "image").slice(0, 4).map((m) => h("img", { src: m.src, alt: "" }))))))),
    // Extras
    (sayings.length || milestones.length || card || (first && last)) && h("section", { class: "yb-page" },
      h("h2", {}, t("ybExtras")),
      milestones.length > 0 && h("div", {}, h("h3", {}, t("ybMilestones")),
        h("ul", {}, milestones.map((m) => h("li", {}, `${m.emoji || "⭐"} ${m.label || t(`ms_${m.key}`)} — ${fmtDate(m.date)}`)))),
      sayings.length > 0 && h("div", {}, h("h3", {}, t("ybSayings")),
        sayings.map((x) => h("blockquote", {}, `“${x.text}”`, h("small", {}, ` — ${age(x.date) || fmtDate(x.date)}`)))),
      first && last && first !== last && h("div", {}, h("h3", {}, t("ybGrowth")),
        h("p", {}, [first.height_cm && last.height_cm && `${t("height")}: ${first.height_cm} → ${last.height_cm} cm`,
          first.weight_kg && last.weight_kg && `${t("weight")}: ${first.weight_kg} → ${last.weight_kg} kg`].filter(Boolean).join(" · "))),
      card && h("div", {}, h("h3", {}, t("aboutAt", { age: age(card.date) })),
        h("ul", {}, Object.entries(card.answers || {}).map(([q, a]) => h("li", {}, `${t(`aq_${q}`)} ${a}`))))));
  document.body.append(book);
  window.scrollTo({ top: 0, behavior: "instant" });
}
