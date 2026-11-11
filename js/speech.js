// Speaking: speech recognition (when the browser offers it) + pinyin scoring,
// and a pitch tracker that draws the melody of the learner's voice to train the tones.
import { audioCtx, micStream } from './audio.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canRecognize = () => !!SR;

let pyLib;
function loadPinyin() {
  pyLib = pyLib || new Promise((res, rej) => {
    if (window.pinyinPro) return res(window.pinyinPro);
    const s = document.createElement('script');
    s.src = 'vendor/pinyin-pro.js';
    s.onload = () => res(window.pinyinPro);
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return pyLib;
}
const onlyHan = t => (t.match(/[一-鿿]/g) || []).join('');
async function toSyl(text) {
  const lib = await loadPinyin();
  const han = onlyHan(text);
  if (!han) return [];
  return lib.pinyin(han, { toneType: 'num', type: 'array', v: true }).map(s => {
    const m = s.match(/^([a-zü]+)(\d)?$/i);
    let base = (m ? m[1] : s).toLowerCase();
    if (base === 'shui') base = 'shei';           // 谁: both readings are fine
    return { base, tone: m && m[2] ? +m[2] : 0 };
  });
}

// One listening attempt. Resolves with the alternatives the recogniser heard ([] if nothing).
let active;
export function listen({ lang = 'zh-CN', maxMs = 7000 } = {}) {
  return new Promise((res, rej) => {
    if (!SR) return rej(new Error('unsupported'));
    const r = new SR();
    active = r;
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
    let out = [], done = false;
    const end = (err) => { if (done) return; done = true; clearTimeout(timer); active = null; err ? rej(err) : res(out); };
    r.onresult = e => { out = [...e.results[0]].map(a => a.transcript); };
    r.onerror = e => { if (e.error === 'no-speech' || e.error === 'aborted') end(); else end(new Error(e.error)); };
    r.onend = () => end();
    const timer = setTimeout(() => { try { r.stop(); } catch { /* already stopped */ } }, maxMs);
    try { r.start(); } catch (e) { end(e); }
  });
}
export function stopListening() { try { active && active.stop(); } catch { /* ignore */ } }

// Compare what was heard with the expected sentence, syllable by syllable.
export async function scoreSpeech(expected, alternatives) {
  const exp = await toSyl(expected);
  let best = { score: 0, heard: alternatives[0] || '', marks: exp.map(() => 0) };
  for (const alt of alternatives) {
    const got = await toSyl(alt);
    // longest common subsequence on toneless syllables
    const n = exp.length, m = got.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      dp[i][j] = exp[i].base === got[j].base ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const marks = exp.map(() => 0); // 0 missed, 1 sound ok / tone off, 2 perfect
    let i = 0, j = 0, pts = 0;
    while (i < n && j < m) {
      if (exp[i].base === got[j].base) {
        const toneOk = !exp[i].tone || !got[j].tone || exp[i].tone === got[j].tone || exp[i].tone === 5 || got[j].tone === 5;
        marks[i] = toneOk ? 2 : 1; pts += toneOk ? 1 : 0.7; i++; j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
    }
    const score = n ? pts / Math.max(n, m) : 0;
    if (score > best.score) best = { score, heard: alt, marks };
  }
  best.syllables = exp;
  best.pass = best.score >= 0.75;
  return best;
}

/* ---------------- Pitch tracking (tones) ---------------- */
// Autocorrelation pitch detector; returns Hz or 0 when the frame is not voiced.
function detectPitch(buf, sampleRate) {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.012) return 0;
  const minLag = Math.floor(sampleRate / 500), maxLag = Math.floor(sampleRate / 70);
  let bestLag = 0, bestVal = 0, r0 = 0;
  for (let i = 0; i < n; i++) r0 += buf[i] * buf[i];
  const corr = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let i = 0; i < n - lag; i++) s += buf[i] * buf[i + lag];
    corr[lag] = s / r0;
  }
  // first strong peak (avoids octave errors better than the global maximum)
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    if (corr[lag] > corr[lag - 1] && corr[lag] >= corr[lag + 1] && corr[lag] > 0.5) {
      if (corr[lag] > bestVal * 1.15) { bestVal = corr[lag]; bestLag = lag; }
    }
  }
  if (!bestLag) return 0;
  const a = corr[bestLag - 1], b = corr[bestLag], c = corr[bestLag + 1];
  const shift = (a - c) / (2 * (a - 2 * b + c) || 1);
  return sampleRate / (bestLag + shift);
}

// Records the pitch contour of one spoken syllable. onFrame(points) is called live.
export async function trackPitch({ maxMs = 2600, onFrame } = {}) {
  const ctx = audioCtx();
  const src = ctx.createMediaStreamSource(await micStream());
  const an = ctx.createAnalyser();
  an.fftSize = 2048;
  src.connect(an);
  const buf = new Float32Array(an.fftSize);
  const pts = [];
  const t0 = performance.now();
  let lastVoiced = 0, started = false;
  return new Promise(res => {
    const tick = () => {
      const t = performance.now() - t0;
      an.getFloatTimeDomainData(buf);
      const f = detectPitch(buf, ctx.sampleRate);
      if (f) { pts.push({ t, f }); lastVoiced = t; started = true; }
      onFrame && onFrame(pts, t);
      if (t > maxMs || (started && t - lastVoiced > 450)) { src.disconnect(); res(pts); }
      else requestAnimationFrame(tick);
    };
    tick();
  });
}

// Turn a raw contour into semitones around the speaker's median and guess the tone.
export function analyseContour(pts) {
  if (pts.length < 6) return { tone: 0, curve: [] };
  let st = pts.map(p => 12 * Math.log2(p.f));
  const sorted = [...st].sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
  // drop octave jumps / outliers, then smooth
  let clean = pts.map((p, i) => ({ t: p.t, v: st[i] - med })).filter(p => Math.abs(p.v) < 9);
  if (clean.length < 6) return { tone: 0, curve: [] };
  clean = clean.map((p, i, a) => { const w = a.slice(Math.max(0, i - 2), i + 3).map(x => x.v).sort((x, y) => x - y); return { t: p.t, v: w[Math.floor(w.length / 2)] }; });
  const T0 = clean[0].t, T1 = clean[clean.length - 1].t || 1;
  const curve = clean.map(p => ({ x: (p.t - T0) / Math.max(1, T1 - T0), v: p.v }));
  const avg = (a, b) => { const s = curve.filter(p => p.x >= a && p.x <= b).map(p => p.v); return s.length ? s.reduce((x, y) => x + y, 0) / s.length : 0; };
  const start = avg(0, 0.2), end = avg(0.8, 1);
  let minV = Infinity, minX = 0, maxV = -Infinity;
  for (const p of curve) { if (p.v < minV) { minV = p.v; minX = p.x; } if (p.v > maxV) maxV = p.v; }
  const range = maxV - minV, slope = end - start;
  let tone;
  if (minX > 0.2 && minX < 0.8 && start - minV > 1.2 && end - minV > 1.5) tone = 3;
  else if (range < 2.2) tone = 1;
  else if (slope >= 1.8) tone = 2;
  else if (slope <= -2.2) tone = 4;
  else tone = Math.abs(slope) < 1.2 ? 1 : (slope > 0 ? 2 : 4);
  return { tone, curve, range, slope };
}

// Ideal shapes on the 1–5 pitch scale used by Chinese teachers.
export const TONE_SHAPE = {
  1: [[0, 5], [1, 5]],
  2: [[0, 3], [1, 5]],
  3: [[0, 2], [0.45, 1], [1, 4]],
  4: [[0, 5], [1, 1]],
  0: [[0.3, 2.5], [0.6, 2.2]],
};
export function drawTone(canvas, { target, curve, color = '#D7352B', live } = {}) {
  const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const pad = 14, X = x => pad + x * (w - 2 * pad), Y5 = v => h - pad - ((v - 1) / 4) * (h - 2 * pad);
  g.strokeStyle = css.getPropertyValue('--border'); g.lineWidth = 1; g.setLineDash([3, 5]);
  for (let i = 1; i <= 5; i++) { g.beginPath(); g.moveTo(pad, Y5(i)); g.lineTo(w - pad, Y5(i)); g.stroke(); }
  g.setLineDash([]);
  if (target != null && TONE_SHAPE[target]) {
    g.strokeStyle = css.getPropertyValue('--muted'); g.globalAlpha = 0.45; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    const s = TONE_SHAPE[target];
    if (s.length === 3) { g.moveTo(X(s[0][0]), Y5(s[0][1])); g.quadraticCurveTo(X(s[1][0]), Y5(s[1][1] - 0.6), X(s[2][0]), Y5(s[2][1])); }
    else { g.moveTo(X(s[0][0]), Y5(s[0][1])); g.lineTo(X(s[1][0]), Y5(s[1][1])); }
    g.stroke(); g.globalAlpha = 1;
  }
  if (curve && curve.length > 1) {
    // semitones (about ±6 around the median) mapped onto the 1–5 scale
    const Ys = v => Y5(3 + Math.max(-2.3, Math.min(2.3, v / 2.6)));
    g.strokeStyle = color; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    curve.forEach((p, i) => { const x = X(live ? Math.min(1, p.x) : p.x), y = Ys(p.v); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
  }
}
