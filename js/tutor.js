// AI tutor. Three ways to answer, best first:
//   - Grok (xAI) through Puter.js: free for everyone, no API key. Each learner signs in once to a free
//     Puter account (Google / Microsoft / Apple) and uses that account's free monthly allowance.
//   - Claude through the Anthropic Messages API, for someone who pastes their own key in Settings.
//   - A built-in coach that answers from the lesson content: no account, works offline.
import { CHARS, WORDS, SENTENCES, GRAMMAR, DIALOGUE, HELLO, SANDHI } from './data.js';
import { $, $$, esc, icon, on, sample, toast } from './ui.js';
import { t, L } from './i18n.js';
import { state, save } from './store.js';
import { say, stopAudio } from './audio.js';
import { canRecognize, listen } from './speech.js';

const LANG_NAME = { fr: 'French', ar: 'Arabic', en: 'English' };
const systemPrompt = () => `You are 竹老师 (Zhú lǎoshī), a warm, encouraging Chinese tutor inside a learning app used by Tunisian secondary-school students (3ème année, absolute beginners, about 16–17 years old). They speak Arabic and French.

Always answer in ${LANG_NAME[state.lang] || 'French'}. Keep answers short (2–6 lines) unless asked for more. Whenever you write Chinese, give: characters, then pinyin with tone marks, then the translation. Never write Chinese without pinyin.

Stay at their level: they are studying Lesson 1 « 你好! » (greetings, pronouns, 很, 都, 您, 认识, 高兴, 喜欢, 这是什么) and Lesson 2 « 你是哪国人? ». Prefer the vocabulary and grammar below; if you need a new word, introduce at most one or two and say they are extra.

VOCABULARY: ${WORDS.map(w => `${w.hz} ${w.py} (${w.m.fr})`).join('; ')}

SENTENCES: ${SENTENCES.map(s => `${s.hz} ${s.py}`).join(' | ')}

DIALOGUES: ${HELLO.map(d => `${d.who}: ${d.hz}`).join(' / ')} || ${DIALOGUE.map(d => `${d.who}: ${d.hz}`).join(' / ')}

GRAMMAR POINTS: ${GRAMMAR.map(g => `${g.title.fr}: ${g.body.fr}`).join(' || ')}

PRONUNCIATION: ${SANDHI.map(r => `${r.title.fr}: ${r.body.fr}`).join(' || ')} Sounds for French/Arabic speakers: h is the Arabic خ (好 = khao), r is close to the French j (人 = jen), ian sounds "yen", an/en keep a clear n (not French nasals), e is a back "eu" (not é), i after z c s zh ch sh r is a buzz (not "i"), k is an aspirated k (not خ).

What you do: explain a word, a character (its components and a memory trick) or a rule; correct the student's Chinese sentences gently (show the corrected sentence and one short reason); run mini-quizzes one question at a time and wait for the answer; role-play the dialogue (you play one person, they play the other, one line at a time). When they make a mistake, praise what was right first. If asked about something unrelated to learning Chinese or school, bring them kindly back to the lesson.`;

/* ---------- Grok through Puter.js (free, no key) ---------- */
export const GROK_MODELS = [['x-ai/grok-4-1-fast-non-reasoning', 'grokFast'], ['x-ai/grok-4.7', 'grokStrong']];
let puterLoad = null;
// Loads https://js.puter.com/v2/ once, only when the tutor is used.
export function loadPuter() {
  if (window.puter) return Promise.resolve(window.puter);
  if (!puterLoad) puterLoad = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://js.puter.com/v2/';
    s.onload = () => { try { window.puter.quiet = true; } catch { /* older SDK */ } res(window.puter); };
    s.onerror = () => { puterLoad = null; rej(new Error('puter')); };
    document.head.appendChild(s);
  });
  return puterLoad;
}
export const grokSignedIn = () => { try { return !!window.puter?.auth?.isSignedIn(); } catch { return false; } };
// Must run inside a click: Puter opens its sign-in window as a popup.
export async function grokSignIn() {
  const puter = window.puter || await loadPuter();
  await puter.auth.signIn();
  return grokSignedIn();
}
export async function grokSignOut() { try { await window.puter?.auth?.signOut(); } catch { /* already out */ } }

async function askGrok(history, onDelta) {
  const puter = await loadPuter();
  if (!grokSignedIn()) throw Object.assign(new Error('signin'), { status: 'signin' });
  const messages = [{ role: 'system', content: systemPrompt() }, ...history.map(m => ({ role: m.role, content: m.text }))];
  let res;
  try { res = await puter.ai.chat(messages, { model: state.ai.grokModel || GROK_MODELS[0][0], stream: true }); }
  catch (e) { throw grokError(e); }
  let text = '';
  try {
    for await (const part of res) {
      if (part?.type === 'error') throw grokError(part);
      if (part?.text) { text += part.text; onDelta(text); }
    }
  } catch (e) { if (!text) throw grokError(e); }   // a stream cut near the end keeps what arrived
  return text;
}
function grokError(e) {
  const raw = (e && (e.message || e.error?.message || e.error || e.code)) || e;
  const msg = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const quota = /insufficient|funding|funds|quota|allowance|402/i.test(msg + ' ' + (e?.code || '') + ' ' + (e?.status || ''));
  return Object.assign(new Error(msg), { status: quota ? 'quota' : e?.status === 401 ? 'signin' : 'grok' });
}

/* ---------- Claude (Anthropic Messages API, streaming) ---------- */
async function askClaude(history, onDelta, signal) {
  const { key, model } = state.ai;
  const headers = {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2026-10-21',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  const body = {
    model, max_tokens: 16000, stream: true,
    system: systemPrompt(),
    output_config: { effort: 'low' },
    messages: history.map(m => ({ role: m.role, content: m.text })),
  };
  if (model === 'claude-opus-5-5') {   // let the API route around a classifier refusal
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
    body.fallbacks = 'default';
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body), signal });
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).error?.message || ''; } catch { /* not JSON */ }
    const e = new Error(msg || `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = '', text = '', stop = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i); buf = buf.slice(i + 2);
      const data = block.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
      if (!data) continue;
      let ev;
      try { ev = JSON.parse(data); } catch { continue; }
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') { text += ev.delta.text; onDelta(text); }
      else if (ev.type === 'message_delta' && ev.delta?.stop_reason) stop = ev.delta.stop_reason;
      else if (ev.type === 'error') throw new Error(ev.error?.message || 'stream error');
    }
  }
  if (stop === 'refusal' && !text) throw Object.assign(new Error('refusal'), { status: 'refusal' });
  return text;
}

/* ---------- Built-in coach (no key, works offline) ---------- */
let pendingQuiz = null;
function coach(msg) {
  const low = msg.toLowerCase();
  const line = w => `**${w.hz}** ${w.py} — ${L(w.m)}`;
  if (pendingQuiz) {
    const q = pendingQuiz; pendingQuiz = null;
    const ok = msg.includes(q.hz) || low.replace(/\s/g, '').includes(q.py.toLowerCase().replace(/\s/g, '')) ||
      L(q.m).toLowerCase().split(/[,;،(]/).some(p => p.trim().length > 1 && low.includes(p.trim().toLowerCase()));
    return (ok ? t('coachRight') : t('coachWrong')) + '\n' + line(q) + '\n\n' + t('coachAgain');
  }
  if (/quiz|test|interrog|اختبر|اختبار|سؤال/.test(low)) {
    const q = sample(WORDS, 1)[0];
    pendingQuiz = q;
    return Math.random() < 0.5 ? t('coachQMeaning', { hz: q.hz, py: q.py }) : t('coachQHanzi', { m: L(q.m) });
  }
  const topics = [
    [/哪|什么|shénme|shenme|nationalit|جنسي/, 'g_na'], [/国|guó|pays|country|بلد/, 'g_guo'], [/谁|shéi|qui |who|مَن|من هي/, 'g_shei'],
    [/不|négation|negat|نفي|\bbu\b|\bbù\b/, 'g_bu'], [/也|aussi|also|أيض|\bye\b|yě/, 'g_ye'], [/吗|呢|question|سؤال|استفهام/, 'g_ma'], [/请问|poli|مهذ|excuse/, 'g_qingwen'],
  ];
  const hit = topics.find(([re]) => re.test(low) || re.test(msg));
  const found = [...WORDS].sort((a, b) => b.hz.length - a.hz.length).filter(w => msg.includes(w.hz)).slice(0, 4);
  const ch = CHARS.filter(c => msg.includes(c.c)).slice(0, 2);
  let out = '';
  if (ch.length && found.length <= 2) out += ch.map(c => `**${c.c}** ${c.py} — ${L(c.m)}\n${L(c.hint)}`).join('\n\n') + '\n\n';
  else if (found.length) out += found.map(line).join('\n') + '\n\n';
  if (hit) { const g = GRAMMAR.find(x => x.id === hit[1]); out += `**${L(g.title)}**\n${L(g.body)}\n${g.ok.map(x => '✓ ' + x).join('\n')}`; }
  if (/ton|tone|نغم/.test(low) && !hit) out += SANDHI.map(r => `**${L(r.title)}** — ${L(r.body)}`).join('\n\n');
  if (!out) {
    const byMeaning = WORDS.filter(w => L(w.m).toLowerCase().split(/[,;،(]/).some(p => p.trim().length > 2 && low.includes(p.trim().toLowerCase()))).slice(0, 3);
    out = byMeaning.length ? byMeaning.map(line).join('\n') : t('coachHelp');
  }
  return out.trim();
}

/* ---------- chat screen ---------- */
const fmt = text => esc(text)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/(^|\n)_(.+?)_(?=\n|$)/g, '$1<i class="muted">$2</i>')
  .replace(/([一-鿿][一-鿿，。？！、,?!]*)/g, m => `<button class="say" data-say="${m}" lang="zh-Hans" dir="ltr">${m}</button>`)
  .replace(/\n/g, '<br>');

export function tutor(root) {
  const useClaude = () => state.ai.provider === 'anthropic' && !!state.ai.key;
  const useGrok = () => state.ai.provider !== 'anthropic';
  let busy = false, ctrl = null;
  root.innerHTML = `
    <div class="chat">
      <header class="page-head row">
        <div class="avatar hz" lang="zh-Hans" aria-hidden="true">竹</div>
        <div class="grow"><h1>${esc(t('tutorName'))}</h1><p class="muted" id="tu-mode"></p></div>
        <button class="icon-btn" id="tu-clear" aria-label="${esc(t('clearChat'))}">${icon('trash')}</button>
      </header>
      <div id="tu-gate"></div>
      <div class="msgs" id="tu-msgs" aria-live="polite"></div>
      <div class="chips-row" id="tu-chips">
        ${['Explain', 'Quiz', 'Role', 'Correct', 'Trick'].map(k => `<button class="pill" data-q="${esc(t('chip' + k + 'Q'))}">${esc(t('chip' + k))}</button>`).join('')}
      </div>
      <form class="composer" id="tu-form">
        ${canRecognize() ? `<button type="button" class="icon-btn" id="tu-mic" aria-label="${esc(t('micChinese'))}" title="${esc(t('micChinese'))}">${icon('mic')}</button>` : ''}
        <label class="sr" for="tu-in">${esc(t('tutorPlaceholder'))}</label>
        <textarea id="tu-in" rows="1" placeholder="${esc(t('tutorPlaceholder'))}" enterkeyhint="send"></textarea>
        <button class="btn primary" id="tu-send" aria-label="${esc(t('send'))}">${icon('send')}</button>
      </form>
    </div>`;
  const box = $('#tu-msgs', root), input = $('#tu-in', root);
  const gate = $('#tu-gate', root);
  const mode = () => {
    const grokOn = useGrok() && grokSignedIn();
    $('#tu-mode', root).innerHTML = useClaude() ? esc(t('tutorOnline'))
      : grokOn ? esc(t('tutorGrok', { m: t(GROK_MODELS.find(m => m[0] === state.ai.grokModel)?.[1] || 'grokFast') }))
      : esc(t('tutorOffline'));
    // the sign-in card: only for Grok, only while signed out
    gate.innerHTML = useGrok() && !grokOn ? `<section class="card grok-gate">
        <h2>${icon('spark')} ${esc(t('grokGateTitle'))}</h2><p>${esc(t('grokGateText'))}</p>
        <div class="row wrap"><button class="btn primary" id="tu-signin" ${window.puter ? '' : 'disabled'}>${icon('user')} ${esc(t(window.puter ? 'grokSignIn' : 'grokLoading'))}</button></div>
        <p class="muted small">${esc(t('grokGateNote'))}</p></section>` : '';
  };
  const bubble = (role, html) => { const d = document.createElement('div'); d.className = 'msg ' + role; d.innerHTML = html; box.appendChild(d); box.scrollTop = box.scrollHeight; return d; };
  const redraw = () => {
    box.innerHTML = '';
    bubble('assistant', fmt(t('tutorHello')));
    state.chat.forEach(m => bubble(m.role, fmt(m.text)));
  };
  mode(); redraw();
  if (useGrok() && navigator.onLine !== false) loadPuter().then(() => { if (root.isConnected) mode(); }).catch(() => {
    if (root.isConnected) gate.innerHTML = `<p class="cs-msg">${esc(t('grokNoLoad'))}</p>`;
  });
  on(root, 'click', '#tu-signin', async el => {
    el.disabled = true;
    try { await grokSignIn(); } catch (e) { toast(t(/popup/.test(e?.error || e?.message || '') ? 'grokPopup' : 'grokSignInFail')); }
    if (root.isConnected) { mode(); if (grokSignedIn()) toast(t('grokReady')); }
  });

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true; input.value = ''; input.style.height = '';
    state.chat.push({ role: 'user', text });
    bubble('user', fmt(text));
    const out = bubble('assistant', '<span class="typing"><i></i><i></i><i></i></span>');
    let reply;
    try {
      const show = part => { out.innerHTML = fmt(part); box.scrollTop = box.scrollHeight; };
      if (useClaude()) {
        ctrl = new AbortController();
        reply = await askClaude(state.chat.slice(-16), show, ctrl.signal);
      } else if (useGrok() && grokSignedIn()) {
        try { reply = await askGrok(state.chat.slice(-16), show); }
        catch (e) {
          // Grok cannot answer (free allowance used up, network…): the lesson coach answers instead
          if (e.status === 'signin') mode();
          reply = `_${t(e.status === 'quota' ? 'grokQuota' : 'grokDown')}_\n\n` + coach(text);
        }
      } else {
        await new Promise(r => setTimeout(r, 350));
        reply = coach(text);
      }
    } catch (e) {
      const k = e.status === 401 || e.status === 403 ? 'aiErrKey' : e.status === 429 ? 'aiErrRate' : e.status === 'refusal' ? 'aiErrRefusal' : navigator.onLine === false ? 'aiErrOffline' : 'aiErr';
      out.classList.add('err');
      out.innerHTML = esc(t(k)) + (e.message && k === 'aiErr' ? `<br><small>${esc(e.message)}</small>` : '');
      state.chat.pop();
      busy = false;
      return;
    }
    out.innerHTML = fmt(reply || '…');
    state.chat.push({ role: 'assistant', text: reply });
    state.chat = state.chat.slice(-40);
    save();
    busy = false;
    box.scrollTop = box.scrollHeight;
  }

  $('#tu-form', root).onsubmit = e => { e.preventDefault(); send(input.value); };
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(120, input.scrollHeight) + 'px'; });
  on(root, 'click', '[data-q]', el => send(el.dataset.q));
  $('#tu-clear', root).onclick = () => { if (ctrl) ctrl.abort(); state.chat = []; pendingQuiz = null; save(); redraw(); };
  const mic = $('#tu-mic', root);
  if (mic) mic.onclick = async () => {
    stopAudio(); mic.classList.add('live');
    try { const a = await listen(); if (a[0]) { input.value = (input.value + ' ' + a[0]).trim(); input.focus(); } else toast(t('micNothing')); }
    catch { toast(t('micDenied')); }
    mic.classList.remove('live');
  };
}

export async function testKey() {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': state.ai.key, 'anthropic-version': '2026-10-21', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: state.ai.model, max_tokens: 16, messages: [{ role: 'user', content: '你好' }] }),
  });
  return res.ok ? null : ((await res.json().catch(() => ({}))).error?.message || `HTTP ${res.status}`);
}
