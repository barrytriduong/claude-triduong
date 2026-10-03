// 🌍 Her world tab: the people in her life, and a map of the places she's been.
// Also the "who's in it" and "where" pickers used in the memory editor.

import { state, hooks } from "./state.js";
import { $, h, fill, toast, loadScript } from "./util.js";
import { t } from "./i18n.js";
import { openForm } from "./form.js";
import { loadRows, squarePhoto } from "./collections.js";
import { keepFile } from "./words.js";

// ---------- 👨‍👩‍👧 People ----------

export const personById = (id) => state.rows.people.find((p) => p.id === id);
export const personAvatar = (p, size = "") => h("span", { class: `person-avatar ${size}`, title: p.name },
  p._url ? h("img", { src: p._url, alt: "" }) : h("span", {}, (p.name || "?").trim()[0]?.toUpperCase() || "?"));

export function renderPeople() {
  const admin = state.access.admin;
  const count = (id) => state.events.filter((ev) => ev.people?.includes(id)).length;
  fill($("#peopleBody"), 
    h("div", { class: "section-head" },
      h("p", { class: "muted" }, t("peopleIntro")),
      admin && h("button", { type: "button", class: "btn btn-primary", onclick: () => editPerson() }, t("peopleAdd"))),
    state.rows.people.length ? h("div", { class: "people" }, state.rows.people.map((p) => h("article", { class: "person" },
      admin && h("button", { type: "button", class: "card-edit always", onclick: () => editPerson(p) }, "✏️"),
      h("button", { type: "button", class: "person-open", onclick: () => showPerson(p) },
        personAvatar(p, "big"),
        h("b", {}, p.name),
        p.relation && h("span", { class: "muted small" }, p.relation),
        h("span", { class: "chip" }, t("memoryCount", { n: count(p.id) }))))))
      : h("div", { class: "empty" }, h("div", { class: "empty-emoji" }, "👨‍👩‍👧"), h("p", {}, t(admin ? "peopleEmptyAdmin" : "peopleEmpty"))));
}

function showPerson(p) {
  state.filterTag = `person:${p.id}`;
  location.hash = "#timeline";
  hooks.renderTimeline();
}

function editPerson(p = null) {
  openForm({
    title: t(p ? "peopleEdit" : "peopleAdd"),
    fields: [
      { name: "photo", label: t("peoplePhoto"), type: "photo", value: p?._url, empty: "🙂" },
      { name: "name", label: t("sName"), value: p?.name, required: true, placeholder: t("peopleNamePh") },
      { name: "relation", label: t("peopleRelation"), value: p?.relation, placeholder: t("peopleRelationPh") },
    ],
    onSubmit: async (v) => {
      const file = v.photo ? await squarePhoto(v.photo, 400) : v.photo;
      const photo = await keepFile("people", file, p?.photo);
      const row = { name: v.name, relation: v.relation, photo: photo || null };
      if (p) await state.store.updateRow("people", p.id, row);
      else await state.store.insertRow("people", { ...row, sort: state.rows.people.length });
      await loadRows();
      renderPeople();
      toast(t("saved"));
    },
    onDelete: p && (async () => {
      await state.store.deleteRow("people", p.id);
      if (p.photo) await state.store.deleteFile(p.photo).catch(() => {});
      await loadRows();
      renderPeople();
    }),
  });
}

/** Editor: tap people who are in this memory. */
export function peoplePicker(selected, onChange) {
  const wrap = h("div", { class: "people-picker" });
  const draw = () => fill(wrap, ...state.rows.people.map((p) => {
    const on = selected.includes(p.id);
    return h("button", {
      type: "button", class: `person-chip${on ? " on" : ""}`, "aria-pressed": String(on),
      onclick: () => {
        selected = on ? selected.filter((x) => x !== p.id) : [...selected, p.id];
        onChange(selected);
        draw();
      },
    }, personAvatar(p, "tiny"), p.name);
  }));
  draw();
  return wrap;
}

// ---------- 📍 Places ----------

/** Search place names with OpenStreetMap (free; at most one search per second). */
let lastSearch = 0;
async function searchPlaces(q) {
  const wait = 1100 - (Date.now() - lastSearch);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSearch = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=${document.documentElement.lang || "en"}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(t("placeSearchFailed"));
  return (await res.json()).map((r) => ({ name: r.name || r.display_name.split(",")[0], full: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }));
}

/** Editor: "📍 Where?" with a search box. */
export function placeField(place, onChange) {
  const chosen = h("div", { class: "place-chosen" });
  const results = h("div", { class: "place-results" });
  const input = h("input", { type: "search", placeholder: t("placePh"), "aria-label": t("placeLabel") });
  const btn = h("button", { type: "button", class: "btn btn-ghost small-btn" }, t("placeSearch"));
  const drawChosen = () => fill(chosen, place
    ? h("span", { class: "chip place-chip" }, `📍 ${place.name}`,
      h("button", { type: "button", class: "link-btn danger", onclick: () => { place = null; onChange(null); drawChosen(); } }, "✕"))
    : h("span", { class: "muted small" }, t("placeNone")));
  const run = async () => {
    const q = input.value.trim();
    if (!q) return;
    btn.disabled = true;
    fill(results, h("span", { class: "muted small" }, "…"));
    try {
      const found = await searchPlaces(q);
      fill(results, ...(found.length ? found.map((r) => h("button", {
        type: "button", class: "place-result", onclick: () => {
          place = { name: r.name, lat: r.lat, lng: r.lng };
          onChange(place);
          drawChosen();
          fill(results);
          input.value = "";
        },
      }, h("b", {}, r.name), h("small", { class: "muted" }, r.full))) : [h("span", { class: "muted small" }, t("placeNotFound"))]));
    } catch (ex) {
      fill(results, h("span", { class: "form-error" }, ex.message));
    } finally {
      btn.disabled = false;
    }
  };
  btn.addEventListener("click", run);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
  drawChosen();
  return h("div", { class: "place-field" }, chosen, h("div", { class: "link-add" }, input, btn), results);
}

let map = null, layer = null;

export async function renderPlaces() {
  const body = $("#placesBody");
  const groups = new Map();
  for (const ev of state.events) {
    if (!ev.place?.lat || (ev.status && ev.status !== "published" && !state.access.admin)) continue;
    const key = `${ev.place.lat.toFixed(3)},${ev.place.lng.toFixed(3)}`;
    if (!groups.has(key)) groups.set(key, { ...ev.place, events: [] });
    groups.get(key).events.push(ev);
  }
  const places = [...groups.values()].sort((a, b) => b.events.length - a.events.length);
  if (!places.length) {
    map?.remove();
    map = null;
    fill(body, h("div", { class: "empty" }, h("div", { class: "empty-emoji" }, "🗺️"), h("p", {}, t(state.access.admin ? "placesEmptyAdmin" : "placesEmpty"))));
    return;
  }
  if (!map) {
    fill(body, 
      h("p", { class: "muted" }, t("placesIntro", { n: places.length })),
      h("div", { class: "map", id: "map" }),
      h("div", { class: "place-list", id: "placeList" }));
    document.head.append(h("link", { rel: "stylesheet", href: "vendor/leaflet/leaflet.css" }));
    await loadScript("vendor/leaflet/leaflet.js");
    map = window.L.map("map", { scrollWheelZoom: false, worldCopyJump: true });
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
  }
  layer?.remove();
  layer = window.L.layerGroup().addTo(map);
  const bounds = [];
  for (const pl of places) {
    const icon = window.L.divIcon({ className: "map-pin", html: `<span>📍</span>${pl.events.length > 1 ? `<b>${pl.events.length}</b>` : ""}`, iconSize: [36, 40], iconAnchor: [18, 38] });
    const popup = h("div", { class: "map-popup" }, h("b", {}, pl.name),
      pl.events.map((ev) => h("button", { type: "button", class: "link-btn", onclick: () => openMemory(ev) }, `${ev.emoji || "⭐"} ${ev.title}`)));
    window.L.marker([pl.lat, pl.lng], { icon }).bindPopup(popup).addTo(layer);
    bounds.push([pl.lat, pl.lng]);
  }
  if (bounds.length === 1) map.setView(bounds[0], 11);
  else map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  setTimeout(() => map.invalidateSize(), 50);
  fill($("#placeList"), ...places.map((pl) => h("button", {
    type: "button", class: "place-row", onclick: () => { map.setView([pl.lat, pl.lng], 12); },
  }, `📍 ${pl.name}`, h("span", { class: "chip" }, t("memoryCount", { n: pl.events.length })))));
}

function openMemory(ev) {
  state.filterTag = null;
  location.hash = "#timeline";
  hooks.renderTimeline();
  setTimeout(() => hooks.flash?.(ev.id), 300);
}
