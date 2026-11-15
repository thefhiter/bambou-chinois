// Progress, spaced repetition and settings — all stored on the device (localStorage).
const KEY = 'bambou.v1';
const DAY = 86400000;
const defaults = () => ({
  lang: null, theme: 'auto', showPinyin: true, speak: true, speed: 1,   // speed: voice speed, 0.5 to 1.5
  xp: 0, streak: 0, lastDay: null, dayXp: {},
  done: {},            // path id -> { stars, at }
  srs: {},             // 'c:你' | 'w:ni' | 's:s_x' -> { box, due, ok, ko }
  ai: { provider: 'grok', key: '', model: 'claude-opus-5-5', grokModel: 'x-ai/grok-4-1-fast-non-reasoning' },
  chat: [],
});

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    const d = defaults();
    const s = raw ? { ...d, ...raw, ai: { ...d.ai, ...(raw.ai || {}) } } : d;
    // Grok is the free default since 2026-11-15: Claude stays only for someone who pasted a key
    if (s.ai.provider !== 'grok' && !s.ai.key) s.ai.provider = 'grok';
    return s;
  } catch { return defaults(); }
}
export const state = load();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ } }
export function resetAll() { const keep = { lang: state.lang, theme: state.theme, ai: state.ai, speed: state.speed }; Object.assign(state, defaults(), keep); save(); }

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const DAILY_GOAL = 40;

export function addXp(n) {
  const t = today();
  if (state.lastDay !== t) {
    state.streak = state.lastDay === today(new Date(Date.now() - DAY)) ? state.streak + 1 : 1;
    state.lastDay = t;
  }
  state.xp += n;
  state.dayXp[t] = (state.dayXp[t] || 0) + n;
  save();
}
export const xpToday = () => state.dayXp[today()] || 0;
export const liveStreak = () => (state.lastDay === today() || state.lastDay === today(new Date(Date.now() - DAY))) ? state.streak : 0;

/* ---- Spaced repetition (Leitner boxes) ---- */
const INTERVAL = [0, 1, 2, 4, 8, 16, 32]; // days before the next review, per box
export function grade(key, ok) {
  const it = state.srs[key] || (state.srs[key] = { box: 0, due: 0, ok: 0, ko: 0 });
  if (ok) { it.ok++; it.box = Math.min(it.box + 1, 6); it.due = Date.now() + INTERVAL[it.box] * DAY - 4 * 3600000; }
  else { it.ko++; it.box = Math.max(1, it.box - 2); it.due = Date.now() + 10 * 60000; }
  save();
}
export function learn(key) { if (!state.srs[key]) { state.srs[key] = { box: 1, due: Date.now() + DAY - 4 * 3600000, ok: 0, ko: 0 }; } }
export const box = key => state.srs[key]?.box || 0;
export const known = key => !!state.srs[key];
export const dueKeys = () => Object.keys(state.srs).filter(k => state.srs[k].due <= Date.now()).sort((a, b) => state.srs[a].due - state.srs[b].due);
export const weakKeys = () => Object.keys(state.srs).sort((a, b) => (state.srs[a].box - state.srs[b].box) || (state.srs[b].ko - state.srs[a].ko));
export function nextDue() { const d = Object.values(state.srs).map(i => i.due).filter(x => x > Date.now()); return d.length ? Math.min(...d) : null; }
