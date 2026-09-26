// A small emoji picker: a 😊 button that inserts into a text field, or an
// emoji "dropdown" that replaces a field's value (the memory's bubble emoji).

import { h } from "./util.js";

export const EMOJI_GROUPS = [
  ["😀", "😂", "🥰", "😍", "😘", "😊", "🤗", "🥳", "🤩", "😋", "😴", "😭", "😮", "🤔", "😎", "🙈"],
  ["👶", "👧", "👨‍👩‍👧", "🤰", "🍼", "🧸", "🎀", "👣", "🦷", "🛁", "💤", "🩺", "💉", "📏", "🎒", "🏫"],
  ["❤️", "💕", "💖", "💗", "💝", "🌟", "⭐", "✨", "🌈", "☀️", "🌙", "☁️", "🌸", "🌷", "🌻", "🍀"],
  ["🎂", "🎈", "🎁", "🎉", "🎊", "🎄", "🧧", "🏮", "🎃", "🎆", "🎵", "🎨", "📚", "⚽", "🚲", "🛝"],
  ["🍓", "🍉", "🍌", "🥕", "🍚", "🍜", "🍰", "🍦", "🍭", "🍪", "🥛", "🧃", "🐶", "🐱", "🐰", "🐻"],
  ["🐣", "🦄", "🦋", "🐟", "🐘", "🦁", "🏖️", "✈️", "🚗", "🏠", "🌳", "⛰️", "🌊", "📸", "🎬", "💌"],
];

let openPop = null;
function closePop() {
  openPop?.remove();
  openPop = null;
}
document.addEventListener("pointerdown", (e) => {
  if (openPop && !openPop.contains(e.target) && !e.target.closest(".emoji-trigger")) closePop();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openPop) { e.stopPropagation(); closePop(); } }, true);

function showPicker(anchor, onPick) {
  if (openPop?.anchor === anchor) return closePop();
  closePop();
  const pop = h("div", { class: "emoji-pop", role: "dialog" },
    EMOJI_GROUPS.flat().map((em) => h("button", {
      type: "button", class: "emoji-opt", onclick: () => { onPick(em); closePop(); },
    }, em)));
  pop.anchor = anchor;
  anchor.parentElement.append(pop);
  openPop = pop;
}

/** Adds a 😊 button beside a text input/textarea that inserts an emoji at the cursor. */
export function attachEmojiInsert(field) {
  if (field.dataset.emoji) return;
  field.dataset.emoji = "1";
  const wrap = h("div", { class: "emoji-wrap" });
  field.replaceWith(wrap);
  const btn = h("button", {
    type: "button", class: "emoji-trigger", "aria-label": "Emoji",
    onclick: () => showPicker(btn, (em) => {
      const start = field.selectionStart ?? field.value.length;
      const end = field.selectionEnd ?? field.value.length;
      field.value = field.value.slice(0, start) + em + field.value.slice(end);
      field.focus();
      field.setSelectionRange(start + em.length, start + em.length);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }),
  }, "😊");
  wrap.append(field, btn);
}

/** Turns a small emoji input into a dropdown button showing the current emoji. */
export function attachEmojiSelect(field, fallback = "⭐") {
  if (field.dataset.emoji) return;
  field.dataset.emoji = "1";
  field.type = "hidden";
  const btn = h("button", { type: "button", class: "emoji-trigger emoji-select", "aria-label": "Emoji" });
  const sync = () => { btn.textContent = field.value || fallback; };
  btn.addEventListener("click", () => showPicker(btn, (em) => { field.value = em; sync(); }));
  field.after(btn);
  // Keep the button in sync when code sets field.value (e.g. opening the editor).
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  Object.defineProperty(field, "value", {
    get() { return desc.get.call(this); },
    set(v) { desc.set.call(this, v); sync(); },
  });
  field.form?.addEventListener("reset", () => setTimeout(sync));
  sync();
}
