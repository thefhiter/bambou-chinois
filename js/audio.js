// Sound: recorded clips (audio/), browser text-to-speech as fallback, small UI sounds, voice recorder.
import { audioList } from './data.js';
import { sylKey } from './pinyin-table.js';

let manifest = { words: [], tones: {}, chars: {} };
let ready = fetch('audio/index.json').then(r => r.ok ? r.json() : manifest).then(m => { manifest = m; }).catch(() => {});
export const audioReady = () => ready;
export const tonesOf = syl => manifest.tones[sylKey(syl)] || '';
export const exampleChar = (syl, tone) => manifest.chars[sylKey(syl) + tone] || '';

const byText = {};
for (const [id, text] of Object.entries(audioList())) if (!(text in byText) || id.startsWith('w_')) byText[text] = id;
const norm = t => t.replace(/[，,]/g, ',').replace(/[？?]/g, '?').trim();
for (const k of Object.keys(byText)) byText[norm(k)] = byText[k];

const el = new Audio();
let token = 0;
function playUrl(url, rate = 1) {
  const my = ++token;
  window.speechSynthesis && speechSynthesis.cancel();
  return new Promise(res => {
    el.pause();
    el.src = url;
    el.playbackRate = rate;
    el.preservesPitch = true;
    const done = ok => { el.onended = el.onerror = null; res(ok); };
    el.onended = () => done(true);
    el.onerror = () => done(false);
    el.play().catch(() => done(false));
    const guard = setInterval(() => { if (my !== token) { clearInterval(guard); done(false); } else if (el.ended || el.error) clearInterval(guard); }, 200);
  });
}

function tts(text, rate = 1) {
  return new Promise(res => {
    if (!window.speechSynthesis) return res(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.8 * rate;
    const v = speechSynthesis.getVoices().find(v => /^zh([-_]CN)?/i.test(v.lang)) || speechSynthesis.getVoices().find(v => /^zh/i.test(v.lang));
    if (v) u.voice = v;
    u.onend = () => res(true);
    u.onerror = () => res(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}

// Say Chinese text: recorded clip when we have one, otherwise the device's Chinese voice.
export async function say(text, { rate = 1, id } = {}) {
  await ready;
  const clip = id || byText[text] || byText[norm(text)];
  if (clip && manifest.words.includes(clip)) {
    if (await playUrl(`audio/w/${clip}.mp3`, rate)) return true;
  }
  return tts(text, rate);
}
export async function playSyl(syl, tone, rate = 1) {
  await ready;
  const k = sylKey(syl);
  if (tonesOf(k).includes(String(tone))) return playUrl(`audio/py/${k}${tone}.mp3`, rate);
  return false;
}
export function stopAudio() { token++; el.pause(); window.speechSynthesis && speechSynthesis.cancel(); }

/* ---- UI sounds ---- */
let ctx;
export function audioCtx() { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; }
function beep(freqs, dur = 0.12, type = 'sine', vol = 0.12) {
  try {
    const c = audioCtx();
    freqs.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f;
      const t0 = c.currentTime + i * dur;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    });
  } catch { /* no audio */ }
}
export const sfx = {
  ok: () => beep([660, 880], 0.11),
  ko: () => beep([220, 165], 0.14, 'triangle'),
  win: () => beep([523, 659, 784, 1047], 0.12),
  tap: () => beep([520], 0.04, 'sine', 0.05),
};
export const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* unsupported */ } };

/* ---- Microphone ---- */
let stream;
export async function micStream() {
  if (stream && stream.active) return stream;
  stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  return stream;
}
export function releaseMic() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }
export const hasMic = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

// Record the learner's voice; stop() resolves with an object URL to play back.
export async function record() {
  const s = await micStream();
  const rec = new MediaRecorder(s);
  const chunks = [];
  rec.ondataavailable = e => chunks.push(e.data);
  rec.start();
  return {
    stop: () => new Promise(res => {
      rec.onstop = () => res(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
      rec.state !== 'inactive' ? rec.stop() : res(null);
    }),
  };
}
export const playBlob = url => playUrl(url);
