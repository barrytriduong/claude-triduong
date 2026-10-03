// Family panel (admin): invite people with a link, change roles, reset passwords,
// remove accounts. Plus the sign-up screen someone sees when they open an invite link.

import { state } from "./state.js";
import { $, h, fill, openDialog, toast } from "./util.js";
import { t, fmtDate } from "./i18n.js";

const inviteUrl = (code) => `${location.origin}${location.pathname}#invite=${code}`;

// ---------- Admin panel ----------

export async function openFamily() {
  openDialog("#familyDialog");
  await renderFamily();
}

async function renderFamily() {
  const body = $("#familyBody");
  body.replaceChildren(h("p", { class: "muted" }, "…"));
  let members, invites, pin;
  try {
    [members, invites, pin] = await Promise.all([state.store.listMembers(), state.store.listInvites(),
      Promise.resolve().then(() => state.store.pinStatus()).catch(() => null)]); // null: database not updated yet
  } catch (ex) {
    body.replaceChildren(h("p", { class: "form-error" }, ex.message));
    return;
  }

  const roleSelect = (m) => h("select", {
    class: "role-select", disabled: m.user_id === state.user?.id, "aria-label": t("famRole"),
    onchange: (e) => run(() => state.store.setMemberRole(m.user_id, e.target.value), t("saved")),
  }, ["admin", "family", "none"].map((r) => h("option", { value: r, selected: m.role === r }, t(`role_${r}`))));

  fill(body,
    pin ? pinSection(pin) : h("div", { class: "invite-form" }, h("h3", {}, t("pinTitle")), h("p", { class: "form-error" }, t("pinNeedsSql"))),
    // New invite
    h("form", { class: "invite-form", onsubmit: createInvite },
      h("h3", {}, t("famInviteTitle")),
      h("p", { class: "muted small" }, t("famInviteHelp")),
      h("div", { class: "row" },
        h("input", { name: "name", required: true, maxlength: "40", placeholder: t("famInviteNamePh"), class: "grow" }),
        h("select", { name: "role" },
          h("option", { value: "family" }, t("role_family")),
          h("option", { value: "admin" }, t("role_admin"))),
        h("button", { class: "btn btn-primary", type: "submit" }, t("famCreateInvite")))),
    h("div", { id: "newInvite" }),

    // Create a login directly
    state.store.createMember && h("form", { class: "invite-form create-form", onsubmit: createLogin },
      h("h3", {}, t("famCreateTitle")),
      h("p", { class: "muted small" }, t("famCreateHelp")),
      h("div", { class: "row" },
        h("input", { name: "name", required: true, maxlength: "40", placeholder: t("famInviteNamePh"), class: "grow" }),
        h("input", { name: "email", type: "email", required: true, placeholder: t("email"), class: "grow", autocomplete: "off" })),
      h("div", { class: "row" },
        h("input", { name: "password", required: true, minlength: "8", placeholder: t("famPwPh"), class: "grow", autocomplete: "new-password", spellcheck: "false" }),
        h("button", { type: "button", class: "btn btn-ghost small-btn", title: t("famPwSuggest"), onclick: (e) => { e.currentTarget.form.password.value = suggestPassword(); } }, "🎲"),
        h("select", { name: "role" },
          h("option", { value: "family" }, t("role_family")),
          h("option", { value: "admin" }, t("role_admin")))),
      h("button", { class: "btn btn-primary", type: "submit" }, t("famCreateBtn"))),
    h("div", { id: "newLogin" }),

    // Open invites
    invites.length > 0 && h("div", { class: "fam-section" },
      h("h3", {}, t("famPending")),
      invites.map((inv) => h("div", { class: "fam-row" },
        h("div", { class: "fam-who" }, h("b", {}, inv.name || "—"), h("span", { class: "muted small" }, ` · ${t(`role_${inv.role}`)} · ${t("famExpires", { date: fmtDate(inv.expires_at.slice(0, 10)) })}`)),
        h("div", { class: "fam-actions" },
          h("button", { type: "button", class: "btn btn-ghost small-btn", onclick: () => shareLink(inv.code, inv.name) }, t("famShare")),
          h("button", { type: "button", class: "link-btn", onclick: () => run(() => state.store.deleteInvite(inv.code), t("famRevoked")) }, t("famRevoke")))))),

    // Members
    h("div", { class: "fam-section" },
      h("h3", {}, t("famMembers"), ` (${members.length})`),
      members.map((m) => h("div", { class: "fam-row" },
        h("div", { class: "fam-who" },
          h("b", {}, m.name || m.email),
          m.user_id === state.user?.id && h("span", { class: "chip" }, t("famYou")),
          h("div", { class: "muted small" }, m.email, " · ",
            m.last_sign_in_at ? t("famLastSeen", { date: fmtDate(m.last_sign_in_at.slice(0, 10)) }) : t("famNeverSeen"))),
        h("div", { class: "fam-actions" },
          roleSelect(m),
          m.user_id !== state.user?.id && h("button", { type: "button", class: "link-btn", onclick: () => resetPassword(m) }, t("famResetPw")),
          m.user_id !== state.user?.id && h("button", { type: "button", class: "link-btn danger", onclick: () => removeMember(m) }, t("famRemove")))))),
  );
}

// ---------- View-only PIN ----------

function pinSection(pin) {
  return h("form", { class: "invite-form", onsubmit: savePin },
    h("h3", {}, t("pinTitle")),
    h("p", { class: "muted small" }, pin.enabled
      ? t("pinOnHelp", { date: fmtDate(String(pin.updated_at).slice(0, 10)) })
      : t("pinOffHelp")),
    pin.wrong_tries >= 5 && h("p", { class: "form-error" }, t("pinWarn", { n: pin.wrong_tries })),
    h("div", { class: "pin-box" },
      h("input", { name: "pin", type: "text", inputmode: "numeric", pattern: "[0-9]{4}", maxlength: "4", required: true,
        autocomplete: "off", placeholder: "••••", "aria-label": t("pinLabel"), title: t("pinFormat") }),
      h("button", { class: "btn btn-primary", type: "submit" }, t(pin.enabled ? "pinChange" : "pinTurnOn")),
      pin.enabled && h("button", { type: "button", class: "link-btn danger", onclick: disablePin }, t("pinTurnOff"))));
}

async function savePin(e) {
  e.preventDefault();
  const pin = e.target.pin.value.trim();
  if (!/^\d{4}$/.test(pin)) return toast(t("pinFormat"));
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await state.store.setPin(pin);
    toast(t("pinSaved", { pin }), 6000);
  } catch (ex) {
    toast(/signups? (are )?not allowed|disabled|Confirm email/i.test(ex.message) ? t("pinNeedsSettings") : ex.message, 10000);
  }
  await renderFamily();
}

async function disablePin() {
  if (!confirm(t("pinOffConfirm"))) return;
  await run(() => state.store.disablePin(), t("pinOff"));
}

async function run(action, okMsg) {
  try {
    await action();
    if (okMsg) toast(okMsg);
  } catch (ex) {
    toast(ex.message, 5000);
  }
  await renderFamily();
}

async function createInvite(e) {
  e.preventDefault();
  const f = e.target;
  try {
    const code = await state.store.createInvite(f.name.value.trim(), f.role.value);
    const name = f.name.value.trim();
    await renderFamily();
    showNewInvite(code, name);
  } catch (ex) {
    toast(ex.message, 5000);
  }
}

function showNewInvite(code, name) {
  const url = inviteUrl(code);
  $("#newInvite").replaceChildren(h("div", { class: "invite-link" },
    h("p", {}, t("famLinkReady", { name })),
    h("input", { value: url, readonly: true, onfocus: (e) => e.target.select() }),
    h("div", { class: "row" },
      h("button", { type: "button", class: "btn btn-primary", onclick: () => copy(url) }, t("famCopy")),
      navigator.share && h("button", { type: "button", class: "btn btn-ghost", onclick: () => shareLink(code, name) }, t("famShare")))));
}

/** Easy-to-type password like "sunny-panda-42". */
function suggestPassword() {
  const a = ["sunny", "happy", "lucky", "pink", "sweet", "bright", "cozy", "merry", "tiny", "jolly"];
  const b = ["panda", "bunny", "kitty", "lotus", "mango", "star", "cloud", "tulip", "puppy", "otter"];
  const pick = (arr) => arr[crypto.getRandomValues(new Uint32Array(1))[0] % arr.length];
  return `${pick(a)}-${pick(b)}-${10 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90)}`;
}

async function createLogin(e) {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector("button[type=submit]");
  const who = { name: f.name.value.trim(), email: f.email.value.trim(), password: f.password.value, role: f.role.value };
  btn.disabled = true;
  try {
    const { needsConfirmation } = await state.store.createMember(who);
    await renderFamily();
    const site = `${location.origin}${location.pathname}`;
    const message = t("famLoginMessage", { name: who.name, site, email: who.email, password: who.password });
    $("#newLogin").replaceChildren(h("div", { class: "invite-link" },
      h("p", {}, needsConfirmation ? t("famCreatedConfirm", { name: who.name }) : t("famCreated", { name: who.name })),
      h("textarea", { readonly: true, rows: "5", onfocus: (ev) => ev.target.select() }, message),
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn btn-primary", onclick: () => copy(message) }, t("famCopyMessage")))));
  } catch (ex) {
    const msg = /already registered/i.test(ex.message) ? t("famEmailTaken")
      : /signups? (are )?not allowed|disabled/i.test(ex.message) ? t("famSignupsOff")
        : /password/i.test(ex.message) && /least|short|weak/i.test(ex.message) ? t("famPwShort")
          : ex.message;
    toast(msg, 8000);
  } finally {
    btn.disabled = false;
  }
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast(t("famCopied"));
  } catch {
    prompt(t("famCopy"), text);
  }
}

async function shareLink(code, name) {
  const url = inviteUrl(code);
  const text = t("famShareText", { name, site: state.settings.name || t("defaultName") });
  if (navigator.share) {
    try { await navigator.share({ title: document.title, text, url }); return; } catch { /* cancelled */ }
  }
  copy(url);
}

async function resetPassword(m) {
  const pw = prompt(t("famNewPwPrompt", { name: m.name || m.email }));
  if (!pw) return;
  if (pw.length < 8) return toast(t("famPwShort"));
  await run(() => state.store.setMemberPassword(m.user_id, pw), t("famPwSet"));
}

async function removeMember(m) {
  if (!confirm(t("famRemoveConfirm", { name: m.name || m.email }))) return;
  await run(() => state.store.removeMember(m.user_id), t("famRemoved"));
}

// ---------- Opening an invite link ----------

let inviteCode = null;

/** If the page was opened from an invite link, show the sign-up form. Returns true if it did. */
export async function handleInviteLink(onSignedIn) {
  const m = location.hash.match(/^#invite=([a-f0-9]+)$/);
  if (!m || !state.store.checkInvite) return false;
  inviteCode = m[1];
  history.replaceState(null, "", location.pathname);
  let invite = null;
  try { invite = await state.store.checkInvite(inviteCode); } catch (ex) { console.warn(ex); }
  if (!invite) {
    toast(t("inviteInvalid"), 8000);
    return false;
  }
  if (state.user) await state.store.signOut();
  const f = $("#signupForm");
  f.reset();
  f.name.value = invite.name || "";
  $("#signupHello").textContent = t("inviteHello", { name: invite.name || "💕" });
  $("#signupError").hidden = true;
  signupDone = onSignedIn;
  openDialog("#signupDialog");
  return true;
}

let signupDone = null;

$("#signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const err = $("#signupError");
  err.hidden = true;
  if (f.password.value !== f.password2.value) {
    err.textContent = t("pwMismatch");
    err.hidden = false;
    return;
  }
  const btn = f.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const signedIn = await state.store.signUpWithInvite({
      email: f.email.value.trim(), password: f.password.value, name: f.name.value.trim(), code: inviteCode,
    });
    $("#signupDialog").close();
    if (signedIn) await signupDone?.();
    else toast(t("inviteCheckEmail"), 12000);
  } catch (ex) {
    err.textContent = /invite link/i.test(ex.message) || /Database error/i.test(ex.message) ? t("inviteInvalid")
      : /already registered/i.test(ex.message) ? t("inviteAlreadyRegistered") : ex.message;
    err.hidden = false;
  } finally {
    btn.disabled = false;
  }
});
