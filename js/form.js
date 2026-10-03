// One reusable pop-up form for the smaller collections (sayings, people, cards,
// milestones, wishes, health…), so the page doesn't need a dialog for each.

import { $, h, openDialog, toast } from "./util.js";
import { t } from "./i18n.js";
import { attachEmojiInsert, attachEmojiSelect } from "./emoji.js";
import { recorderButton, voicePlayer } from "./voice.js";

/**
 * fields: [{ name, label, type: text|textarea|date|select|emoji|photo|voice|number, value,
 *            required, placeholder, options: [[value, label]], hint, emojiButton }]
 * onSubmit(values) may throw to show an error. "photo"/"voice" give a File (new),
 * null (removed) or undefined (unchanged).
 */
export function openForm({ title, intro, fields, submitLabel, onSubmit, onDelete, wide }) {
  const dialog = $("#formDialog");
  const values = {};
  const err = h("p", { class: "form-error", hidden: true });
  const body = h("form", { class: `modal-body${wide ? "" : " narrow"}`, method: "dialog" },
    h("h2", {}, title),
    intro && h("p", { class: "muted" }, intro),
    fields.map((f) => fieldEl(f, values)),
    err,
    h("div", { class: "modal-actions" },
      onDelete && h("button", { type: "button", class: "btn btn-danger", onclick: async () => {
        if (!confirm(t("confirmDelete"))) return;
        try { await onDelete(); dialog.close(); } catch (ex) { showErr(ex); }
      } }, t("deleteBtn")),
      h("span", { class: "spacer" }),
      h("button", { type: "button", class: "btn btn-ghost", onclick: () => dialog.close() }, t("cancel")),
      h("button", { type: "submit", class: "btn btn-primary" }, submitLabel || t("save"))));
  const showErr = (ex) => { err.textContent = ex.message || String(ex); err.hidden = false; };

  body.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = body.querySelector("button[type=submit]");
    btn.disabled = true;
    err.hidden = true;
    const data = {};
    for (const f of fields) {
      if (f.type === "photo" || f.type === "voice") data[f.name] = values[f.name];
      else if (f.type === "checkbox") data[f.name] = body.elements[f.name].checked;
      else data[f.name] = body.elements[f.name].value.trim();
    }
    try {
      await onSubmit(data);
      dialog.close();
    } catch (ex) {
      console.error(ex);
      showErr(ex);
    } finally {
      btn.disabled = false;
    }
  });

  dialog.replaceChildren(body);
  dialog.classList.toggle("wide", !!wide);
  openDialog(dialog);
  // Emoji helpers need the fields to be in the page first.
  for (const f of fields) {
    const el = body.elements[f.name];
    if (!el) continue;
    if (f.type === "emoji") attachEmojiSelect(el, f.fallback || "⭐");
    else if (f.emojiButton) attachEmojiInsert(el);
  }
  body.querySelector("input:not([type=hidden]), textarea")?.focus();
}

function fieldEl(f, values) {
  const label = (control) => h("label", { class: `field${f.type === "checkbox" ? " check" : ""}${f.half ? " grow" : ""}` },
    f.type === "checkbox" ? [control, " ", h("span", {}, f.label)] : [h("span", {}, f.label), control],
    f.hint && h("small", { class: "muted" }, f.hint));
  const common = { name: f.name, required: !!f.required, placeholder: f.placeholder || "" };
  switch (f.type) {
    case "textarea":
      return label(h("textarea", { ...common, rows: f.rows || "4", maxlength: f.max || "4000" }, f.value || ""));
    case "date":
      return label(h("input", { ...common, type: "date", value: f.value || "" }));
    case "number":
      return label(h("input", { ...common, type: "number", step: f.step || "1", value: f.value ?? "" }));
    case "select":
      return label(h("select", { name: f.name }, f.options.map(([v, l]) => h("option", { value: v, selected: v === f.value }, l))));
    case "checkbox":
      return label(h("input", { type: "checkbox", name: f.name, checked: !!f.value }));
    case "emoji":
      return h("label", { class: "field emoji-field" }, h("span", {}, f.label), h("input", { name: f.name, value: f.value || "", maxlength: "8" }));
    case "photo":
      return photoField(f, values);
    case "voice":
      return voiceField(f, values);
    default:
      return label(h("input", { ...common, type: "text", value: f.value || "", maxlength: f.max || "200" }));
  }
}

function photoField(f, values) {
  const preview = h("div", { class: "form-photo" }, f.value ? h("img", { src: f.value, alt: "" }) : h("span", {}, f.empty || "📷"));
  const remove = h("button", { type: "button", class: "link-btn danger", hidden: !f.value }, t("removePhoto"));
  remove.addEventListener("click", () => {
    values[f.name] = null;
    preview.replaceChildren(h("span", {}, f.empty || "📷"));
    remove.hidden = true;
  });
  const input = h("input", { type: "file", accept: "image/*,.heic,.heif", hidden: true });
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    values[f.name] = file;
    preview.replaceChildren(h("img", { src: URL.createObjectURL(file), alt: "" }));
    remove.hidden = false;
  });
  return h("div", { class: "field" }, h("span", {}, f.label),
    h("div", { class: "photo-pick" }, preview,
      h("div", { class: "stack-sm" }, h("label", { class: "btn btn-ghost file-btn small-btn" }, t("choosePhotoShort"), input), remove)));
}

function voiceField(f, values) {
  const slot = h("div", { class: "voice-slot" }, f.value ? voicePlayer(f.value) : h("span", { class: "muted small" }, t("noVoice")));
  const remove = h("button", { type: "button", class: "link-btn danger", hidden: !f.value }, t("removeVoice"));
  const set = (file) => {
    values[f.name] = file;
    slot.replaceChildren(voicePlayer(URL.createObjectURL(file)));
    remove.hidden = false;
  };
  remove.addEventListener("click", () => {
    values[f.name] = null;
    slot.replaceChildren(h("span", { class: "muted small" }, t("noVoice")));
    remove.hidden = true;
  });
  const input = h("input", { type: "file", accept: "audio/*", hidden: true });
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) return toast(t("musicTooBig"), 5000);
    set(file);
  });
  return h("div", { class: "field" }, h("span", {}, f.label), slot,
    h("div", { class: "row" }, recorderButton(set), h("label", { class: "btn btn-ghost file-btn small-btn" }, t("uploadAudio"), input), remove));
}
