// App shell: routing, navigation, onboarding, settings.
import { $, $$, esc, icon, on, sheet, toast } from './ui.js';
import { t, LANGS, applyLang } from './i18n.js';
import { state, save, resetAll, dueKeys } from './store.js';
import { say, stopAudio, releaseMic, audioCtx } from './audio.js';
import { stopListening } from './speech.js';
import { loadChars } from './hanzi.js';
import * as V from './views.js';
import { tutor, testKey } from './tutor.js';

const nav = $('#nav');
const NAV = [['home', 'navHome', 'home'], ['chars', 'navChars', 'brush'], ['pinyin', 'navPinyin', 'wave'], ['review', 'navReview', 'repeat'], ['tutor', 'navTutor', 'spark']];
const MODELS = [['claude-opus-5-5', 'Claude Opus 5.5'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5'], ['claude-haiku-5-5', 'Claude Haiku 5.5']];

function applyTheme() {
  if (state.theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = state.theme;
}

function drawNav(active) {
  const due = dueKeys().length;
  nav.innerHTML = `
    <a class="brand" href="#/home" aria-label="Bambou"><span class="seal hz" lang="zh-Hans" aria-hidden="true">竹</span><span class="brand-name">Bambou</span></a>
    <ul>${NAV.map(([id, label, ic]) => `<li><a href="#/${id}" class="${active === id ? 'on' : ''}" ${active === id ? 'aria-current="page"' : ''}>
      ${icon(ic)}<span>${esc(t(label))}</span>${id === 'review' && due ? `<i class="badge" aria-label="${due}">${due > 99 ? '99+' : due}</i>` : ''}</a></li>`).join('')}</ul>
    <a class="nav-settings ${active === 'settings' ? 'on' : ''}" href="#/settings" aria-label="${esc(t('settings'))}">${icon('gear')}<span>${esc(t('settings'))}</span></a>`;
}

function route() {
  stopAudio(); stopListening(); releaseMic();
  document.body.classList.remove('in-session');
  $$('.sheet-wrap').forEach(s => s.remove());
  if (!state.lang) return onboarding();
  const [, name = 'home', arg] = decodeURIComponent(location.hash).split('/');
  const old = $('#view'), root = old.cloneNode(false);   // a fresh node drops the previous screen's listeners
  old.replaceWith(root);
  const table = {
    home: () => V.home(root), chars: () => V.chars(root), char: () => V.charStudio(root, arg),
    pinyin: () => V.pinyin(root, arg), review: () => V.review(root), dialogue: () => V.dialogue(root),
    lesson: () => V.lesson(root, arg), tutor: () => tutor(root), settings: () => settings(root),
  };
  const active = { char: 'chars', lesson: 'home', dialogue: 'home' }[name] || name;
  drawNav(table[name] ? active : 'home');
  root.className = 'view v-' + name;
  (table[name] || table.home)();
  window.scrollTo(0, 0);
  root.focus({ preventScroll: true });
}

function onboarding() {
  drawNav('home');
  document.body.classList.add('in-session');
  const root = $('#view');
  root.className = 'view';
  root.innerHTML = `<div class="onboard">
    <div class="seal big hz" lang="zh-Hans" aria-hidden="true">竹</div>
    <h1>Bambou</h1>
    <p class="hz hello" lang="zh-Hans">你好!</p>
    <div class="lang-pick" role="group" aria-label="Langue · اللغة · Language">
      ${LANGS.map(([k, n]) => `<button class="btn ghost big" data-lang="${k}" lang="${k}">${n}</button>`).join('')}
    </div></div>`;
  on(root, 'click', '[data-lang]', el => {
    state.lang = el.dataset.lang; save(); applyLang();
    root.innerHTML = `<div class="onboard">
      <div class="seal big hz" lang="zh-Hans" aria-hidden="true">竹</div>
      <h1>${esc(t('welcome'))}</h1>
      <p class="muted">${esc(t('welcomeSub'))}</p>
      <ol class="method-steps compact">${['See', 'Hear', 'Trace', 'Recall', 'Say', 'Review'].map((k, i) => `<li><b>${i + 1}. ${esc(t('m' + k))}</b></li>`).join('')}</ol>
      <button class="btn primary big" id="ob-go">${esc(t('letsGo'))}</button></div>`;
    $('#ob-go', root).onclick = () => { try { audioCtx(); } catch { /* no audio */ } location.hash = '#/home'; route(); };
    $('#ob-go', root).focus();
  });
}

function settings(root) {
  const seg = (name, opts, cur) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-${name}="${v}" class="${v === cur ? 'on' : ''}" aria-pressed="${v === cur}">${esc(l)}</button>`).join('')}</div>`;
  const sw = (id, label, val) => `<label class="switch"><span>${esc(label)}</span><input type="checkbox" id="${id}" ${val ? 'checked' : ''}><i aria-hidden="true"></i></label>`;
  root.innerHTML = `
    <header class="page-head"><h1>${esc(t('settings'))}</h1></header>
    <section class="card"><h2>${esc(t('language'))}</h2>${seg('lang', LANGS, state.lang)}</section>
    <section class="card"><h2>${esc(t('theme'))}</h2>${seg('theme', [['auto', t('themeAuto')], ['light', t('themeLight')], ['dark', t('themeDark')]], state.theme)}
      ${sw('o-py', t('optPinyin'), state.showPinyin)}${sw('o-sp', t('optSpeak'), state.speak)}</section>
    <section class="card"><h2>${icon('spark')} ${esc(t('aiTitle'))}</h2><p class="muted">${esc(t('aiSub'))}</p>
      <label class="field"><span>${esc(t('aiKey'))}</span><input id="ai-key" type="password" autocomplete="off" spellcheck="false" dir="ltr" placeholder="sk-ant-…" value="${esc(state.ai.key)}"></label>
      <label class="field"><span>${esc(t('aiModel'))}</span><select id="ai-model">${MODELS.map(([v, l]) => `<option value="${v}" ${v === state.ai.model ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="row wrap"><button class="btn primary" id="ai-save">${esc(t('save'))}</button><button class="btn ghost" id="ai-test">${esc(t('aiTest'))}</button>
        <button class="btn ghost" id="ai-share">${icon('share')} ${esc(t('aiShare'))}</button></div>
      <p class="cs-msg" id="ai-msg" role="status" aria-live="polite"></p>
      <p class="muted small">${esc(t('aiShareWarn'))}</p></section>
    <section class="card"><h2>${esc(t('about'))}</h2><p class="muted">${esc(t('aboutText'))}</p>
      <button class="btn danger" id="o-reset">${icon('trash')} ${esc(t('reset'))}</button></section>`;
  on(root, 'click', '[data-lang]', el => { state.lang = el.dataset.lang; save(); applyLang(); route(); });
  on(root, 'click', '[data-theme]', el => { state.theme = el.dataset.theme; save(); applyTheme(); route(); });
  $('#o-py', root).onchange = e => { state.showPinyin = e.target.checked; save(); };
  $('#o-sp', root).onchange = e => { state.speak = e.target.checked; save(); };
  const msg = $('#ai-msg', root);
  const store = () => { state.ai.key = $('#ai-key', root).value.trim(); state.ai.model = $('#ai-model', root).value; save(); };
  $('#ai-save', root).onclick = () => { store(); toast(t('save') + ' ✓'); };
  $('#ai-test', root).onclick = async () => {
    store();
    if (!state.ai.key) { msg.textContent = t('aiErrKey'); return; }
    msg.textContent = '…';
    try { const err = await testKey(); msg.textContent = err ? `${t('aiErrKey')} (${err})` : t('aiOk'); }
    catch { msg.textContent = t('aiErr'); }
  };
  $('#ai-share', root).onclick = async () => {
    store();
    if (!state.ai.key) { msg.textContent = t('aiErrKey'); return; }
    const url = `${location.origin}${location.pathname}#k=${btoa(JSON.stringify({ k: state.ai.key, m: state.ai.model }))}`;
    try { await navigator.clipboard.writeText(url); msg.textContent = t('aiShared'); } catch { prompt(t('aiShare'), url); }
  };
  $('#o-reset', root).onclick = () => { if (confirm(t('resetConfirm'))) { resetAll(); toast(t('resetDone')); route(); } };
}

/* ---------- boot ---------- */
if (location.hash.startsWith('#k=')) {       // a classmate shared their AI access
  try { const o = JSON.parse(atob(location.hash.slice(3))); if (o.k) { state.ai.key = o.k; state.ai.model = o.m || state.ai.model; save(); setTimeout(() => toast(t('aiImported')), 600); } } catch { /* bad link */ }
  history.replaceState(null, '', location.pathname + '#/home');
}
applyLang(); applyTheme(); loadChars();
document.addEventListener('click', e => {       // any Chinese text marked data-say can be heard
  const el = e.target.closest('[data-say]');
  if (el) say(el.dataset.say, { id: el.dataset.id });
});
window.addEventListener('hashchange', route);
route();
if ('serviceWorker' in navigator && location.protocol === 'https:' || location.hostname === 'localhost') {
  navigator.serviceWorker?.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
  // a new version took over: load it now instead of running the old code until the next visit
  const had = !!navigator.serviceWorker?.controller;
  let reloaded = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => { if (had && !reloaded) { reloaded = true; location.reload(); } });
}
