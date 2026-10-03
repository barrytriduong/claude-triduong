// 🎙️ Record a short voice clip in the browser, and a small player for it.

import { h, toast } from "./util.js";
import { t } from "./i18n.js";

const MAX_SECONDS = 180;

function pickType() {
  for (const type of ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"]) {
    if (window.MediaRecorder?.isTypeSupported?.(type)) return type;
  }
  return "";
}

/** A button that records from the microphone; calls onDone(file) when stopped. */
export function recorderButton(onDone) {
  let rec = null, stream = null, timer = null, started = 0;
  const btn = h("button", { type: "button", class: "btn btn-ghost rec-btn" }, `🎙️ ${t("recordVoice")}`);
  const stop = () => rec?.state === "recording" && rec.stop();
  btn.addEventListener("click", async () => {
    if (rec?.state === "recording") return stop();
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast(t("recordUnsupported"), 6000);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return toast(t("recordDenied"), 6000);
    }
    const type = pickType();
    rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      clearInterval(timer);
      stream.getTracks().forEach((tr) => tr.stop());
      btn.classList.remove("recording");
      btn.textContent = `🎙️ ${t("recordVoice")}`;
      const mime = rec.mimeType || type || "audio/webm";
      const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
      const blob = new Blob(chunks, { type: mime.split(";")[0] });
      if (blob.size) onDone(new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type }));
    };
    rec.start();
    started = Date.now();
    btn.classList.add("recording");
    const tick = () => {
      const s = Math.floor((Date.now() - started) / 1000);
      btn.textContent = `⏹️ ${t("recordStop")} ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      if (s >= MAX_SECONDS) stop();
    };
    tick();
    timer = setInterval(tick, 250);
  });
  return btn;
}

const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "");

/** A round play button with a progress bar. */
export function voicePlayer(src, label = "") {
  const audio = new Audio();
  audio.preload = "metadata";
  audio.src = src;
  const fill = h("span", { class: "vp-fill" });
  const time = h("span", { class: "vp-time" });
  const play = h("button", { type: "button", class: "vp-play", "aria-label": t("playVoice") }, "▶");
  const wrap = h("div", { class: "voice-player" }, play,
    h("div", { class: "vp-body" }, label && h("span", { class: "vp-label" }, label), h("span", { class: "vp-bar" }, fill)), time);
  const sync = () => {
    fill.style.width = audio.duration ? `${(audio.currentTime / audio.duration) * 100}%` : "0";
    time.textContent = fmt(audio.paused && !audio.currentTime ? audio.duration : audio.currentTime);
  };
  audio.addEventListener("loadedmetadata", sync);
  audio.addEventListener("timeupdate", sync);
  audio.addEventListener("ended", () => { play.textContent = "▶"; wrap.classList.remove("playing"); audio.currentTime = 0; sync(); });
  play.addEventListener("click", () => {
    if (audio.paused) {
      document.querySelectorAll(".voice-player.playing .vp-play").forEach((b) => b !== play && b.click());
      audio.play();
      play.textContent = "❚❚";
      wrap.classList.add("playing");
    } else {
      audio.pause();
      play.textContent = "▶";
      wrap.classList.remove("playing");
    }
  });
  wrap.querySelector(".vp-bar").addEventListener("click", (e) => {
    if (!audio.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
  });
  return wrap;
}
