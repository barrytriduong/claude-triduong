// Family panel (admin): invite people with a link, change roles, reset passwords,
// remove accounts. Plus the sign-up screen someone sees when they open an invite link.

import { state } from "./state.js";
import { $, h, openDialog, toast } from "./util.js";
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
  let members, invites;
  try {
    [members, invites] = await Promise.all([state.store.listMembers(), state.store.listInvites()]);
  } catch (ex) {
    body.replaceChildren(h("p", { class: "form-error" }, ex.message));
    return;
  }

  const roleSelect = (m) => h("select", {
    class: "role-select", disabled: m.user_id === state.user?.id, "aria-label": t("famRole"),
    onchange: (e) => run(() => state.store.setMemberRole(m.user_id, e.target.value), t("saved")),
  }, ["admin", "family", "none"].map((r) => h("option", { value: r, selected: m.role === r }, t(`role_${r}`))));

  body.replaceChildren(
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
