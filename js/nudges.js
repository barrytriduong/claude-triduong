// Gentle reminders for parents (monthly "add a memory", backups), a calendar
// reminder file, and birthday mode for everyone.

import { state } from "./state.js";
import { $, h, fill, todayISO, download } from "./util.js";
import { t } from "./i18n.js";
import { ageParts, ageLabel } from "./i18n.js";
import { birthdayToday, ordinalEn } from "./words.js";
import { celebrate } from "./fireworks.js";

const DAY = 86400000;
const seen = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const remember = (key, v = "1") => { try { localStorage.setItem(key, v); } catch { /* ignore */ } };

export function renderNudges({ onAdd, onBackup }) {
  const box = $("#nudges");
  const items = [];
  const s = state.settings;
  const today = todayISO();

  if (state.access.admin && s.birthday && today > s.birthday) {
    // Monthly: on (or just after) her "month-day", if nothing was added this week.
    const { months } = ageParts(s.birthday, today);
    const day = Number(s.birthday.slice(8));
    const todayDay = Number(today.slice(8));
    const lastAdded = Math.max(0, ...state.events.map((ev) => Date.parse(ev.updatedAt || ev.updated_at || 0) || 0));
    const key = `nudge-month-${today.slice(0, 7)}`;
    if (months > 0 && months < 216 && todayDay >= Math.min(day, 28) && todayDay <= Math.min(day, 28) + 3
      && Date.now() - lastAdded > 7 * DAY && !seen(key)) {
      items.push({ key, emoji: "💕", text: t("nudgeMonth", { name: s.name || t("defaultName"), age: ageLabel(s.birthday, today) }), action: t("addMemory"), run: onAdd });
    }
    // Backup: every ~5 weeks once there's something worth keeping.
    const last = s.lastBackup ? Date.parse(s.lastBackup) : 0;
    const snooze = Number(seen("nudge-backup-snooze") || 0);
    if (state.events.length >= 5 && Date.now() - last > 35 * DAY && Date.now() > snooze) {
      items.push({ key: "nudge-backup-snooze", value: String(Date.now() + 7 * DAY), emoji: "💾", text: t(last ? "nudgeBackup" : "nudgeBackupNever"), action: t("downloadBackup"), run: onBackup });
    }
  }

  box.hidden = !items.length;
  fill(box, ...items.map((it) => h("div", { class: "nudge" },
    h("span", { class: "nudge-emoji" }, it.emoji),
    h("span", { class: "nudge-text" }, it.text),
    h("button", { type: "button", class: "btn btn-primary small-btn", onclick: () => { remember(it.key, it.value); it.run(); renderNudges({ onAdd, onBackup }); } }, it.action),
    h("button", { type: "button", class: "link-btn", "aria-label": t("close"), onclick: () => { remember(it.key, it.value); renderNudges({ onAdd, onBackup }); } }, "✕"))));
}

/** A calendar file with a monthly reminder on her "month-day". */
export function downloadReminder() {
  const s = state.settings;
  if (!s.birthday) return;
  const day = Math.min(Number(s.birthday.slice(8)), 28);
  const start = new Date();
  start.setDate(day);
  if (start < new Date()) start.setMonth(start.getMonth() + 1);
  const ymd = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  const url = location.origin + location.pathname;
  const esc = (x) => x.replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Family timeline//EN", "BEGIN:VEVENT",
    `UID:monthly-${Date.now()}@timeline`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${ymd}`, "RRULE:FREQ=MONTHLY",
    `SUMMARY:${esc(t("icsTitle", { name: s.name || t("defaultName") }))}`,
    `DESCRIPTION:${esc(t("icsBody", { url }))}`, `URL:${url}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT9H", `DESCRIPTION:${esc(t("icsTitle", { name: s.name || t("defaultName") }))}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  download(new Blob([ics], { type: "text/calendar" }), "monthly-reminder.ics");
}

/** 🎂 On her birthday: balloons, a greeting and fireworks (once per visit). */
let celebratedToday = false;
export function renderBirthday({ onWish }) {
  const n = Math.round(birthdayToday());
  const banner = $("#birthdayBanner");
  document.body.classList.toggle("birthday", n > 0);
  banner.hidden = !n;
  if (!n) return;
  const name = state.settings.name || t("defaultName");
  fill(banner, 
    h("div", { class: "balloons", "aria-hidden": "true" }, ["🎈", "🎈", "🎈"].map((b, i) => h("span", { style: `--i:${i}` }, b))),
    h("b", {}, t("birthdayHello", { name, n, nth: ordinalEn(n) })),
    h("button", { type: "button", class: "btn btn-primary small-btn", onclick: onWish }, t("writeWish")));
  if (!celebratedToday) {
    celebratedToday = true;
    setTimeout(() => celebrate($("#heroAvatar")), 600);
  }
}
