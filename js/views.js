// Screens: home path, characters, character studio, pinyin lab, review, dialogue.
import { CHARS, EXTRA_CHARS, WORDS, SENTENCES, DIALOGUE, SPEAKERS, GRAMMAR, INITIALS, FINALS, TONE_ROWS, TONES, SANDHI, PATH, CHAR, charAudio } from './data.js';
import { TABLES, mark, sylKey } from './pinyin-table.js';
import { $, $$, esc, icon, on, sheet, toast, sample, shuffle } from './ui.js';
import { t, L } from './i18n.js';
import { state, save, addXp, xpToday, liveStreak, DAILY_GOAL, box, known, dueKeys, weakKeys, nextDue } from './store.js';
import { say, playSyl, tonesOf, exampleChar, sfx, stopAudio, hasMic, record, playBlob, audioReady } from './audio.js';
import { canRecognize, listen, scoreSpeech, trackPitch, analyseContour, drawTone } from './speech.js';
import { charData, svgFor, hydrate, strokeStrip, makeWriter } from './hanzi.js';
import { lessonSteps, reviewSteps, runSession, toneSvg } from './session.js';

const go = h => { location.hash = h; };
const nodeHref = n => n.kind === 'lesson' ? `#/lesson/${n.id}` : n.kind === 'dialogue' ? '#/dialogue' : `#/pinyin/${n.sec}`;
const lessonKeys = n => [...n.chars.map(c => 'c:' + c), ...n.words.map(w => 'w:' + w), ...n.sents.map(s => 's:' + s)];
function complete(id, stars = 3, xp = 10) {
  const first = !state.done[id];
  state.done[id] = { stars: Math.max(stars, state.done[id]?.stars || 0), at: Date.now() };
  save();
  if (first && xp) addXp(xp);
  return first;
}
const doneBtn = id => `<div class="done-row"><button class="btn ${state.done[id] ? 'ghost' : 'primary'} big" data-done="${id}">${icon('check')} ${esc(t(state.done[id] ? 'doneAlready' : 'markDone'))}</button></div>`;
function wireDone(root) {
  on(root, 'click', '[data-done]', el => {
    if (complete(el.dataset.done)) { sfx.win(); toast(t('xpGained', { n: 10 })); }
    go('#/home');
  });
}

/* ================= HOME ================= */
export function home(root) {
  const next = PATH.find(n => !state.done[n.id]);
  const due = dueKeys().length, xp = xpToday(), pct = Math.min(1, xp / DAILY_GOAL);
  const C = 2 * Math.PI * 34;
  root.innerHTML = `
    <header class="hero">
      <div>
        <p class="hello"><span class="hz" lang="zh-Hans" dir="ltr">你好!</span></p>
        <h1>${esc(t('homeTitle'))}</h1>
        <p class="muted">${esc(t('homeSub')).replace(/[一-鿿]+[?!]?/g, m => `<span class="hz" lang="zh-Hans" dir="ltr">${m}</span>`)}</p>
      </div>
      <div class="stat-chips">
        <span class="chip stat" title="${esc(t('streak'))}">${icon('flame')}<b>${liveStreak()}</b><span class="sr">${esc(t('streak'))}</span></span>
        <span class="chip stat" title="XP">${icon('star')}<b>${state.xp}</b><span class="sr">XP</span></span>
      </div>
    </header>

    <section class="card today">
      <svg class="ring" viewBox="0 0 80 80" role="img" aria-label="${esc(t('dailyGoal'))} ${xp}/${DAILY_GOAL}">
        <circle cx="40" cy="40" r="34" class="ring-bg"/>
        <circle cx="40" cy="40" r="34" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/>
        <text x="40" y="45" text-anchor="middle">${xp}</text>
      </svg>
      <div class="today-txt">
        <h2>${esc(pct >= 1 ? t('goalDone') : t('dailyGoal'))}</h2>
        <p class="muted">${esc(t('goalSub', { xp, goal: DAILY_GOAL }))}</p>
      </div>
      ${next ? `<a class="btn primary big" href="${nodeHref(next)}">${icon('play')} ${esc(t('continueWith'))} · ${esc(L(next.title))}</a>`
        : `<a class="btn primary big" href="#/review">${icon('repeat')} ${esc(t('allDone'))}</a>`}
    </section>

    ${due ? `<a class="card review-card" href="#/review">${icon('repeat')}<div><h2>${esc(t('dueTitle', { n: due }))}</h2><p class="muted">${esc(t('dueSub'))}</p></div>${icon('next', 'flip')}</a>` : ''}

    <details class="card method">
      <summary>${icon('target')}<span>${esc(t('methodTitle'))}</span>${icon('next', 'chev')}</summary>
      <ol class="method-steps">
        ${['See', 'Hear', 'Trace', 'Recall', 'Say', 'Review'].map((k, i) => `<li><b>${i + 1}. ${esc(t('m' + k))}</b><span>${esc(t('m' + k + 'D'))}</span></li>`).join('')}
      </ol>
    </details>

    <h2 class="sec-title">${esc(t('path'))}</h2>
    <ol class="path">
      ${PATH.map((n, i) => {
        const d = state.done[n.id], isNext = next && next.id === n.id;
        return `<li><a class="node ${d ? 'done' : ''} ${isNext ? 'next' : ''} k-${n.kind}" href="${nodeHref(n)}">
          <span class="node-ic">${icon(d ? 'check' : n.icon)}</span>
          <span class="node-txt"><b>${esc(L(n.title))}</b><small ${/[一-鿿]/.test(L(n.sub)) ? 'lang="zh-Hans" dir="ltr" class="hz"' : ''}>${esc(L(n.sub))}</small></span>
          ${d && n.kind === 'lesson' ? `<span class="node-stars" aria-label="${d.stars}/3">${[1, 2, 3].map(s => `<i class="${s <= d.stars ? 'on' : ''}">${icon('star')}</i>`).join('')}</span>` : isNext ? `<span class="chip go">${esc(t('start'))}</span>` : ''}
        </a></li>`;
      }).join('')}
    </ol>`;
}

/* ================= LESSON ================= */
export function lesson(root, id) {
  const n = PATH.find(p => p.id === id && p.kind === 'lesson');
  if (!n) return go('#/home');
  runSession(root, {
    steps: lessonSteps(n), title: L(n.title), learnKeys: lessonKeys(n),
    onDone: r => { if (r) complete(id, r.stars, 0); go('#/home'); },
  });
}

/* ================= CHARACTERS ================= */
export function chars(root) {
  const cell = (c, py, key) => {
    const b = key ? box(key) : 0;
    return `<a class="char-cell ${key && known(key) ? 'known' : ''}" href="#/char/${encodeURIComponent(c)}" aria-label="${c} ${esc(py || '')}">
      <span class="cc-svg" data-hzsvg="${c}"></span>
      <span class="py" dir="ltr">${esc(py || '')}</span>
      ${key ? `<span class="dots" aria-hidden="true">${[1, 3, 5].map(l => `<i class="${b >= l ? 'on' : ''}"></i>`).join('')}</span>` : ''}
    </a>`;
  };
  const learned = CHARS.filter(c => known('c:' + c.c)).length;
  const pyOf = c => WORDS.find(w => w.hz === c)?.py || '';
  root.innerHTML = `
    <header class="page-head"><h1>${esc(t('navChars'))}</h1><p class="muted">${esc(t('charsSub', { n: learned, total: CHARS.length }))}</p></header>
    <div class="char-grid">${CHARS.map(c => cell(c.c, c.py, 'c:' + c.c)).join('')}</div>
    <h2 class="sec-title">${esc(t('extraChars'))}</h2>
    <p class="muted">${esc(t('extraCharsSub'))}</p>
    <div class="char-grid small">${[...EXTRA_CHARS].map(c => cell(c, pyOf(c))).join('')}</div>`;
  hydrate(root);
}

export async function charStudio(root, c) {
  const info = CHAR[c], list = CHARS.map(x => x.c), idx = list.indexOf(c);
  const words = WORDS.filter(w => w.hz.includes(c)), sents = SENTENCES.filter(s => s.hz.includes(c)).slice(0, 3);
  let data;
  try { data = await charData(c); } catch { root.innerHTML = `<p class="muted">${esc(t('noData'))}</p>`; return; }
  const n = data.strokes.length;
  root.innerHTML = `
    <header class="page-head row">
      <a class="icon-btn" href="#/chars" aria-label="${esc(t('back'))}">${icon('prev', 'flip')}</a>
      <div class="grow">
        <h1><span class="py" dir="ltr">${esc(info?.py || words[0]?.py || '')}</span> ${info ? '· ' + esc(L(info.m)) : ''}</h1>
        <p class="muted">${esc(t('strokes', { n }))}</p>
      </div>
      <button class="snd" id="cs-snd" aria-label="${esc(t('listen'))}">${icon('sound')}</button>
    </header>
    <div class="studio">
      <div class="studio-main">
        <div class="writer-card"><div class="grid-bg" id="cs-target"></div></div>
        <p class="cs-msg" id="cs-msg" role="status" aria-live="polite">${esc(t('csIdle'))}</p>
        <div class="seg" role="group" aria-label="${esc(t('mode'))}">
          <button data-mode="watch" class="on">${icon('play')} ${esc(t('watch'))}</button>
          <button data-mode="steps">${icon('next')} ${esc(t('stepByStep'))}</button>
          <button data-mode="trace">${icon('brush')} ${esc(t('trace'))}</button>
          <button data-mode="memory">${icon('eyeoff')} ${esc(t('fromMemory'))}</button>
        </div>
        <div class="row center" id="cs-ctl"></div>
      </div>
      <div class="studio-side">
        ${info ? `<p class="hint">${icon('bulb')}<span>${esc(L(info.hint))}</span></p>` : ''}
        <h2 class="sec-title">${esc(t('strokeOrder'))}</h2>
        <ol class="strip" dir="ltr" id="cs-strip"></ol>
        ${words.length ? `<h2 class="sec-title">${esc(t('wordsWith'))}</h2>
        <ul class="word-list">${[...words, ...sents].map(w => `<li><button class="word" data-say="${esc(w.hz)}"><span class="hz" lang="zh-Hans" dir="ltr">${esc(w.hz)}</span><span class="py" dir="ltr">${esc(w.py)}</span><span class="grow">${esc(L(w.m))}</span>${icon('sound', 'sm')}</button></li>`).join('')}</ul>` : ''}
        ${idx >= 0 ? `<div class="row between">
          ${idx > 0 ? `<a class="btn ghost" href="#/char/${encodeURIComponent(list[idx - 1])}">${icon('prev', 'flip')} <span class="hz" lang="zh-Hans">${list[idx - 1]}</span></a>` : '<span></span>'}
          ${idx < list.length - 1 ? `<a class="btn ghost" href="#/char/${encodeURIComponent(list[idx + 1])}"><span class="hz" lang="zh-Hans">${list[idx + 1]}</span> ${icon('next', 'flip')}</a>` : ''}
        </div>` : ''}
      </div>
    </div>`;
  strokeStrip(c).then(h => { const e = $('#cs-strip', root); if (e) e.innerHTML = h; });
  const target = $('#cs-target', root), msg = $('#cs-msg', root), ctl = $('#cs-ctl', root);
  const hear = () => say(c, { id: info ? charAudio(c) : undefined });
  $('#cs-snd', root).onclick = hear;
  let writer, speed = 1, step = 0;
  const size = () => Math.min(320, target.parentElement.clientWidth - 16);

  const modes = {
    watch() {
      writer = makeWriter(target, c, { size: size(), strokeAnimationSpeed: speed, showOutline: true });
      let paused = false;
      ctl.innerHTML = `<button class="btn primary" id="c-play">${icon('play')} ${esc(t('play'))}</button>
        <button class="btn ghost" id="c-pause">${icon('pause')} ${esc(t('pause'))}</button>
        <button class="btn ghost" id="c-speed">${speed === 1 ? '1×' : '0.5×'}</button>`;
      const play = () => { paused = false; msg.textContent = t('csWatch'); writer.animateCharacter({ onComplete: () => { msg.textContent = t('csWatchDone'); } }); };
      $('#c-play', ctl).onclick = play;
      $('#c-pause', ctl).onclick = () => { paused ? writer.resumeAnimation() : writer.pauseAnimation(); paused = !paused; };
      $('#c-speed', ctl).onclick = () => { speed = speed === 1 ? 0.5 : 1; modes.watch(); };
      setTimeout(play, 200);
    },
    steps() {
      writer = null;
      const draw = () => {
        target.innerHTML = svgFor(data, { upTo: step, ghost: true, cls: 'step-svg' });
        msg.textContent = step ? t('strokeN', { i: step, n }) : t('csSteps');
        $('#c-prev', ctl).disabled = step <= 0; $('#c-next', ctl).disabled = step >= n;
      };
      ctl.innerHTML = `<button class="btn ghost" id="c-prev" aria-label="${esc(t('prevStroke'))}">${icon('prev')}</button>
        <button class="btn primary" id="c-next">${esc(t('nextStroke'))} ${icon('next')}</button>
        <button class="btn ghost" id="c-reset" aria-label="${esc(t('restart'))}">${icon('refresh')}</button>`;
      $('#c-prev', ctl).onclick = () => { step = Math.max(0, step - 1); draw(); };
      $('#c-next', ctl).onclick = () => { step = Math.min(n, step + 1); sfx.tap(); draw(); };
      $('#c-reset', ctl).onclick = () => { step = 0; draw(); };
      step = 0; draw();
    },
    trace() { quiz(false); },
    memory() { quiz(true); },
  };
  function quiz(memory) {
    writer = makeWriter(target, c, { size: size(), showOutline: !memory });
    let mistakes = 0;
    msg.textContent = t(memory ? 'csMemory' : 'csTrace');
    ctl.innerHTML = `<button class="btn ghost" id="c-again">${icon('refresh')} ${esc(t('restart'))}</button>`;
    $('#c-again', ctl).onclick = () => quiz(memory);
    writer.quiz({
      showHintAfterMisses: memory ? 3 : 1,
      onMistake: () => { mistakes++; msg.textContent = t('mistakes', { n: mistakes }); },
      onCorrectStroke: () => sfx.tap(),
      onComplete: () => { sfx.ok(); hear(); msg.textContent = mistakes ? t('csDoneMistakes', { n: mistakes }) : t('csPerfect'); if (memory && !mistakes) addXp(2); },
    });
  }
  on(root, 'click', '[data-mode]', el => {
    $$('[data-mode]', root).forEach(b => b.classList.toggle('on', b === el));
    stopAudio();
    modes[el.dataset.mode]();
  });
  modes.watch();
  hear();
}

/* ================= PINYIN LAB ================= */
const parseEx = ex => [ex.slice(0, -1), +ex.slice(-1)];
export function pinyin(root, sec = 'tones') {
  const tabs = [['tones', 'tabTones'], ['sounds', 'tabSounds'], ['sandhi', 'tabSandhi'], ['table', 'tabTable']];
  root.innerHTML = `
    <header class="page-head"><h1>${esc(t('navPinyin'))}</h1><p class="muted">${esc(t('pinyinSub'))}</p></header>
    <nav class="tabs" aria-label="${esc(t('navPinyin'))}">${tabs.map(([k, l]) => `<a href="#/pinyin/${k}" class="${k === sec ? 'on' : ''}" ${k === sec ? 'aria-current="page"' : ''}>${esc(t(l))}</a>`).join('')}</nav>
    <div id="py-body"></div>`;
  const body = $('#py-body', root);
  ({ tones: pyTones, sounds: pySounds, sandhi: pySandhi, table: pyTable }[sec] || pyTones)(body);
  on(root, 'click', '[data-syl]', el => { if (!el.disabled) playSyl(el.dataset.syl, +el.dataset.tone).then(ok => { if (!ok) toast(t('noAudio')); }); });
  wireDone(root);
}

function pyTones(body) {
  const trainSyl = ['ma', 'shi', 'guo', 'ren', 'wen', 'qing', 'you', 'bu', 'fa', 'ye'];
  body.innerHTML = `
    <section class="tone-cards">
      ${TONES.map(x => `<article class="card tone-card t${x.n}">
        <div class="tone-fig">${toneSvg(x.n)}</div>
        <div><h2>${esc(L(x.name))} <span class="py" dir="ltr">m${x.mark}</span></h2><p class="muted">${esc(L(x.d))}</p></div>
        ${x.n ? `<button class="snd" data-syl="ma" data-tone="${x.n}" aria-label="${esc(t('listen'))} ma${x.n}">${icon('sound')}</button>`
          : `<button class="snd" data-say="吗" aria-label="${esc(t('listen'))}">${icon('sound')}</button>`}
      </article>`).join('')}
    </section>

    <section class="card trainer">
      <h2>${icon('mic')} ${esc(t('trainerTitle'))}</h2>
      <p class="muted">${esc(t('trainerSub'))}</p>
      <div class="row wrap" dir="ltr" id="tr-syl">${trainSyl.map((s, i) => `<button class="pill ${i ? '' : 'on'}" data-s="${s}">${s}</button>`).join('')}</div>
      <div class="row wrap" dir="ltr" id="tr-tone"></div>
      <canvas id="tr-canvas" class="tone-canvas" aria-hidden="true"></canvas>
      <p class="cs-msg" id="tr-msg" role="status" aria-live="polite">${esc(t('trainerIdle'))}</p>
      <div class="row center">
        <button class="btn ghost" id="tr-listen">${icon('sound')} ${esc(t('model'))}</button>
        <button class="btn primary" id="tr-mic">${icon('mic')} ${esc(t('sayIt'))}</button>
      </div>
    </section>

    <section class="card">
      <h2>${icon('ear')} ${esc(t('earTitle'))}</h2>
      <p class="muted">${esc(t('earSub'))}</p>
      <div id="ear"><button class="btn primary" id="ear-start">${icon('play')} ${esc(t('start'))}</button></div>
    </section>

    <h2 class="sec-title">${esc(t('toneRows'))}</h2>
    <div class="tone-table" dir="ltr">
      ${TONE_ROWS.map(([s, tones]) => `<div class="tt-row"><b>${mark(s, 0)}</b>${[1, 2, 3, 4].map(n =>
        `<button class="pill" data-syl="${s}" data-tone="${n}" ${tones.includes(n) ? '' : 'disabled'}>${tones.includes(n) ? mark(s, n) : '—'}</button>`).join('')}</div>`).join('')}
    </div>
    ${doneBtn('p_tones')}`;

  // --- tone trainer ---
  let syl = 'ma', tone = 1, busy = false;
  const canvas = $('#tr-canvas', body), msg = $('#tr-msg', body);
  const drawToneRow = () => {
    const have = tonesOf(syl) || '1234';
    if (!have.includes(tone)) tone = +have[0];
    $('#tr-tone', body).innerHTML = [1, 2, 3, 4].map(n => `<button class="pill ${n === tone ? 'on' : ''}" data-t="${n}" ${have.includes(n) ? '' : 'disabled'}>${toneSvg(n)} ${mark(syl, n)}</button>`).join('');
    drawTone(canvas, { target: tone });
  };
  audioReady().then(drawToneRow);
  on(body, 'click', '[data-s]', el => { syl = el.dataset.s; $$('[data-s]', body).forEach(b => b.classList.toggle('on', b === el)); drawToneRow(); playSyl(syl, tone); });
  on(body, 'click', '[data-t]', el => { tone = +el.dataset.t; drawToneRow(); playSyl(syl, tone); });
  $('#tr-listen', body).onclick = () => playSyl(syl, tone);
  $('#tr-mic', body).onclick = async () => {
    if (busy) return;
    if (!hasMic()) { msg.textContent = t('micUnavailable'); return; }
    busy = true; stopAudio();
    msg.textContent = t('trainerGo', { s: mark(syl, tone) });
    try {
      const pts = await trackPitch({ onFrame: p => { const a = analyseContour(p); drawTone(canvas, { target: tone, curve: a.curve, live: true }); } });
      const a = analyseContour(pts);
      const css = getComputedStyle(document.documentElement);
      if (!a.tone) { msg.textContent = t('trainerNothing'); drawTone(canvas, { target: tone }); }
      else {
        const ok = a.tone === tone;
        drawTone(canvas, { target: tone, curve: a.curve, color: css.getPropertyValue(ok ? '--jade' : '--red').trim() });
        msg.textContent = ok ? t('trainerOk', { n: tone }) : t('trainerKo', { got: a.tone, want: tone });
        ok ? (sfx.ok(), addXp(1)) : sfx.ko();
      }
    } catch { msg.textContent = t('micDenied'); }
    busy = false;
  };

  // --- ear game ---
  const ear = $('#ear', body);
  let score = 0, round = 0, cur;
  const pool = TONE_ROWS.flatMap(([s, tn]) => [...tn].map(n => [s, +n]));
  const ask = () => {
    cur = sample(pool, 1)[0]; round++;
    ear.innerHTML = `<p class="muted">${esc(t('earRound', { i: round, score }))}</p>
      <button class="snd xl" id="ear-play" aria-label="${esc(t('listen'))}">${icon('sound')}</button>
      <div class="opts tones" dir="ltr">${[1, 2, 3, 4].map(n => `<button class="opt" data-e="${n}">${toneSvg(n)}<span>${n}</span></button>`).join('')}</div>
      <p class="cs-msg" id="ear-msg" role="status" aria-live="polite"></p>`;
    $('#ear-play', ear).onclick = () => playSyl(cur[0], cur[1]);
    playSyl(cur[0], cur[1]);
  };
  on(ear, 'click', '#ear-start', ask);
  on(ear, 'click', '[data-e]', el => {
    if (el.disabled) return;
    const ok = +el.dataset.e === cur[1];
    $$('[data-e]', ear).forEach(b => { b.disabled = true; if (+b.dataset.e === cur[1]) b.classList.add('right'); });
    if (!ok) el.classList.add('wrong');
    if (ok) { score++; sfx.ok(); addXp(1); } else sfx.ko();
    $('#ear-msg', ear).innerHTML = `<b dir="ltr">${mark(cur[0], cur[1])}</b> <span class="hz" lang="zh-Hans">${exampleChar(cur[0], cur[1])}</span>`;
    setTimeout(() => { if (ear.isConnected) ask(); }, 1500);
  });
}

function pySounds(body) {
  const card = x => { const [s, n] = parseEx(x.ex); return `<article class="card sound-card">
    <button class="snd" data-syl="${s}" data-tone="${n}" aria-label="${esc(t('listen'))} ${mark(s, n)}">${icon('sound')}</button>
    <div><h2 dir="ltr"><span class="sym">${x.s}</span> <span class="py">${mark(s, n)}</span> <span class="hz" lang="zh-Hans">${exampleChar(s, n)}</span></h2><p class="muted">${esc(L(x.h))}</p></div></article>`; };
  const draw = () => {
    body.innerHTML = `<h2 class="sec-title">${esc(t('initials'))}</h2><p class="muted">${esc(t('initialsSub'))}</p>
      <div class="sound-grid">${INITIALS.map(card).join('')}</div>
      <section class="card"><h2>${esc(t('pairsTitle'))}</h2><p class="muted">${esc(t('pairsSub'))}</p>
        <div class="row wrap" dir="ltr">${[['ba', 4, 'pa', 4], ['da', 4, 'ta', 4], ['zi', 4, 'zhi', 4], ['si', 4, 'shi', 4], ['ji', 1, 'qi', 1], ['nu', 3, 'nv', 3], ['wen', 4, 'weng', 1], ['ren', 2, 'reng', 2]]
          .map(([a, x, b, y]) => `<span class="pair"><button class="pill" data-syl="${a}" data-tone="${x}">${mark(a, x)}</button><button class="pill" data-syl="${b}" data-tone="${y}">${mark(b, y)}</button></span>`).join('')}</div></section>
      <h2 class="sec-title">${esc(t('finals'))}</h2><p class="muted">${esc(t('finalsSub'))}</p>
      <div class="sound-grid">${FINALS.map(card).join('')}</div>
      <h2 class="sec-title">${esc(t('spelling'))}</h2>
      <div class="card"><ul class="rules" dir="ltr">
        <li>t + u = <b>tu</b> · n + ü = <b>nü</b> · y + e = <b>ye</b> (= ie)</li>
        <li>y + ou = <b>you</b> (= iou) · g + uo = <b>guo</b> · w + en = <b>wen</b> (= uen)</li>
        <li>s + (-i) = <b>si</b> · z + (-i) = <b>zi</b> · sh + (-i) = <b>shi</b></li>
        <li>p + eng = <b>peng</b> · zh + ong = <b>zhong</b> · q + ing = <b>qing</b></li>
      </ul><p class="muted">${esc(t('spellingNote'))}</p></div>
      ${doneBtn('p_sounds')}`;
  };
  draw();
  audioReady().then(draw);
}

function pySandhi(body) {
  body.innerHTML = SANDHI.map(r => `<section class="card"><h2>${esc(L(r.title))}</h2><p>${esc(L(r.body))}</p>
    <ul class="word-list">${r.ex.map(([hz, py, id]) => `<li><button class="word" data-say="${esc(hz)}" data-id="w_${id}"><span class="hz" lang="zh-Hans">${esc(hz)}</span><span class="py grow" dir="ltr">${esc(py)}</span>${icon('sound', 'sm')}</button></li>`).join('')}</ul></section>`).join('') +
    `<section class="card"><h2>${esc(t('sandhiTry'))}</h2>
      <ul class="word-list">${['s_bushi', 's_tanvpy', 's_tajiao'].map(id => { const s = SENTENCES.find(x => x.id === id); return `<li><button class="word" data-say="${esc(s.hz)}"><span class="hz" lang="zh-Hans" dir="ltr">${esc(s.hz)}</span><span class="py grow" dir="ltr">${esc(s.py)}</span>${icon('sound', 'sm')}</button></li>`; }).join('')}</ul></section>
    ${doneBtn('p_sandhi')}`;
}

function pyTable(body) {
  let which = 0;
  const draw = () => {
    const T = TABLES[which];
    body.innerHTML = `<p class="muted">${esc(t('tableSub'))}</p>
      <div class="seg" role="group">${[1, 2, 3].map(i => `<button data-tb="${i - 1}" class="${which === i - 1 ? 'on' : ''}">${esc(t('tableN', { n: i }))}</button>`).join('')}</div>
      <div class="table-scroll" dir="ltr" tabindex="0"><table class="py-table">
        <thead><tr><th></th>${T.cols.map(c => `<th>${c.replace('²', '')}</th>`).join('')}</tr></thead>
        <tbody>${T.rows.map(r => `<tr><th>${r.ini || '∅'}</th>${r.cells.map(s => s ? `<td><button data-cell="${s}" class="${tonesOf(s) ? '' : 'mute'}">${s}</button></td>` : '<td></td>').join('')}</tr>`).join('')}</tbody>
      </table></div>
      ${doneBtn('p_table')}`;
  };
  draw();
  audioReady().then(draw);
  on(body, 'click', '[data-tb]', el => { which = +el.dataset.tb; draw(); });
  on(body, 'click', '[data-cell]', el => {
    const s = el.dataset.cell, have = tonesOf(s);
    const sh = sheet(`<h2 class="sheet-title" dir="ltr">${s}</h2>
      ${have ? `<div class="tone-pick" dir="ltr">${[1, 2, 3, 4].map(n => `<button class="tone-btn" data-syl="${sylKey(s)}" data-tone="${n}" ${have.includes(n) ? '' : 'disabled'}>
        ${toneSvg(n)}<b>${have.includes(n) ? mark(s, n) : '—'}</b><span class="hz" lang="zh-Hans">${exampleChar(s, n) || '&nbsp;'}</span></button>`).join('')}</div>
        <p class="muted center">${esc(t('tableTap'))}</p>` : `<p class="muted center">${esc(t('noAudio'))}</p>`}`);
    on(sh.el, 'click', '[data-syl]', b => { if (!b.disabled) playSyl(b.dataset.syl, +b.dataset.tone); });
    const first = have && +have[0];
    if (first) playSyl(s, first);
  });
}

/* ================= REVIEW ================= */
export function review(root) {
  const due = dueKeys(), all = Object.keys(state.srs);
  const cnt = p => all.filter(k => k.startsWith(p)).length;
  const boxes = [1, 2, 3, 4, 5, 6].map(b => all.filter(k => state.srs[k].box === b).length);
  const max = Math.max(1, ...boxes);
  const nd = nextDue();
  const when = nd ? new Date(nd).toLocaleString(state.lang, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  root.innerHTML = `
    <header class="page-head"><h1>${esc(t('navReview'))}</h1><p class="muted">${esc(t('reviewSub'))}</p></header>
    <section class="card center-card">
      ${all.length === 0 ? `<div class="empty">${icon('book')}<h2>${esc(t('reviewEmpty'))}</h2><p class="muted">${esc(t('reviewEmptySub'))}</p><a class="btn primary big" href="#/home">${esc(t('goLearn'))}</a></div>`
        : due.length ? `<div class="big-num">${due.length}</div><h2>${esc(t('dueTitle', { n: due.length }))}</h2><p class="muted">${esc(t('dueSub'))}</p>
            <button class="btn primary big" id="rv-go">${icon('repeat')} ${esc(t('reviewStart'))}</button>`
        : `<div class="finish-seal">${icon('check')}</div><h2>${esc(t('reviewClear'))}</h2><p class="muted">${esc(when ? t('reviewNext', { when }) : '')}</p>
            <button class="btn ghost big" id="rv-extra">${icon('refresh')} ${esc(t('reviewExtra'))}</button>`}
    </section>
    ${all.length ? `
    <section class="card">
      <h2>${esc(t('progress'))}</h2>
      <div class="kpis">
        <div><b>${cnt('c:')}<small>/${CHARS.length}</small></b><span>${esc(t('kChars'))}</span></div>
        <div><b>${cnt('w:')}<small>/${WORDS.length}</small></b><span>${esc(t('kWords'))}</span></div>
        <div><b>${cnt('s:')}<small>/${SENTENCES.length}</small></b><span>${esc(t('kSents'))}</span></div>
      </div>
      <h3>${esc(t('memoryBoxes'))}</h3>
      <div class="boxes" role="img" aria-label="${esc(t('memoryBoxes'))}: ${boxes.join(', ')}">
        ${boxes.map((n, i) => `<div class="bx"><span class="bx-n">${n}</span><i style="height:${Math.round(n / max * 100)}%"></i><span class="bx-l">${[1, 2, 4, 8, 16, 32][i]}${esc(t('dayAbbr'))}</span></div>`).join('')}
      </div>
      <p class="muted small">${esc(t('boxesSub'))}</p>
    </section>` : ''}`;
  const start = keys => runSession(root, { steps: reviewSteps(keys), title: t('navReview'), onDone: () => { location.hash === '#/review' ? review(root) : go('#/review'); } });
  $('#rv-go', root)?.addEventListener('click', () => start(due.slice(0, 15)));
  $('#rv-extra', root)?.addEventListener('click', () => start(weakKeys().slice(0, 12)));
}

/* ================= DIALOGUE ================= */
export function dialogue(root) {
  let showPy = true, showTr = true, role = null, running = false;
  const rec = canRecognize();
  const draw = () => {
    root.innerHTML = `
      <header class="page-head row"><a class="icon-btn" href="#/home" aria-label="${esc(t('back'))}">${icon('prev', 'flip')}</a>
        <div class="grow"><h1><span class="hz" lang="zh-Hans">你是哪国人?</span></h1><p class="muted">${esc(t('dlgSub'))}</p></div></header>
      <div class="row wrap">
        <button class="btn primary" id="d-all">${icon('play')} ${esc(t('playAll'))}</button>
        <button class="pill ${showPy ? 'on' : ''}" id="d-py" aria-pressed="${showPy}">Pīnyīn</button>
        <button class="pill ${showTr ? 'on' : ''}" id="d-tr" aria-pressed="${showTr}">${esc(t('translation'))}</button>
      </div>
      <section class="card role-card">
        <h2>${icon('mic')} ${esc(t('rolePlay'))}</h2><p class="muted">${esc(t(rec || hasMic() ? 'roleSub' : 'micUnavailable'))}</p>
        <div class="row wrap">${Object.entries(SPEAKERS).map(([k, s]) => `<button class="pill role ${role === k ? 'on' : ''}" data-role="${k}" style="--c:${s.color}"><span class="hz" lang="zh-Hans">${s.hz}</span> <span dir="ltr">${s.py}</span></button>`).join('')}</div>
      </section>
      <ol class="dlg" id="d-lines">
        ${DIALOGUE.map((d, i) => `<li class="line ${d.who} ${role === d.who ? 'mine' : ''}" data-i="${i}" style="--c:${SPEAKERS[d.who].color}">
          <span class="who hz" lang="zh-Hans">${SPEAKERS[d.who].hz}</span>
          <div class="bubble">
            <button class="line-play" data-play="${i}" aria-label="${esc(t('listen'))}">
              <span class="hz" lang="zh-Hans" dir="ltr">${esc(d.hz)}</span>
              ${showPy ? `<span class="py" dir="ltr">${esc(d.py)}</span>` : ''}
              ${showTr ? `<span class="tr">${esc(L(d.m))}</span>` : ''}
            </button>
            <button class="icon-btn line-mic" data-mic="${i}" aria-label="${esc(t('micStart'))}">${icon('mic')}</button>
            <span class="line-score" id="d-score-${i}"></span>
          </div></li>`).join('')}
      </ol>
      <p class="cs-msg" id="d-msg" role="status" aria-live="polite"></p>
      ${doneBtn('dlg')}`;
  };
  const line = i => $(`.line[data-i="${i}"]`, root);
  const focus = i => { $$('.line', root).forEach(l => l.classList.remove('now')); if (i != null) { line(i).classList.add('now'); line(i).scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
  const play = i => say(DIALOGUE[i].hz, { id: DIALOGUE[i].s });

  async function speakLine(i) {
    const d = DIALOGUE[i], out = $(`#d-score-${i}`, root), mic = $(`[data-mic="${i}"]`, root), msg = $('#d-msg', root);
    stopAudio();
    mic.classList.add('live');
    try {
      if (rec) {
        msg.textContent = t('micListening');
        const alts = await listen({ maxMs: 9000 });
        mic.classList.remove('live');
        if (!alts.length) { msg.textContent = t('micNothing'); return null; }
        const r = await scoreSpeech(d.hz, alts);
        out.textContent = Math.round(r.score * 100) + '%';
        out.className = 'line-score ' + (r.pass ? 'ok' : 'ko');
        msg.textContent = r.pass ? t('fbGood1') : t('speakTip');
        r.pass ? (sfx.ok(), addXp(2)) : sfx.ko();
        return r.pass;
      }
      msg.textContent = t('micRecording');
      const r = await record();
      await new Promise(res => setTimeout(res, Math.max(2500, d.hz.length * 450)));
      const url = await r.stop();
      mic.classList.remove('live');
      msg.textContent = t('micCompare');
      await playBlob(url); await play(i);
      return true;
    } catch { mic.classList.remove('live'); msg.textContent = t('micDenied'); return null; }
  }

  async function runAll() {
    if (running) { running = false; stopAudio(); return; }
    running = true;
    $('#d-all', root).innerHTML = `${icon('stop')} ${esc(t('stop'))}`;
    for (let i = 0; i < DIALOGUE.length && running && root.isConnected; i++) {
      focus(i);
      if (role && DIALOGUE[i].who === role) {
        $('#d-msg', root).textContent = t('yourTurn');
        let ok = await speakLine(i);
        if (ok === false && running) ok = await speakLine(i);
        if (ok === null) { running = false; break; }
      } else await play(i);
      await new Promise(r => setTimeout(r, 600));   // a breath between two speakers
    }
    const finished = running;
    running = false;
    if (!root.isConnected) return;
    focus(null);
    $('#d-all', root).innerHTML = `${icon('play')} ${esc(t(role ? 'startRole' : 'playAll'))}`;
    if (finished && role) { sfx.win(); addXp(10); $('#d-msg', root).textContent = t('roleDone'); }
  }

  draw();
  on(root, 'click', '#d-all', runAll);
  on(root, 'click', '#d-py', () => { showPy = !showPy; running = false; draw(); });
  on(root, 'click', '#d-tr', () => { showTr = !showTr; running = false; draw(); });
  on(root, 'click', '[data-role]', el => { role = role === el.dataset.role ? null : el.dataset.role; running = false; stopAudio(); draw(); $('#d-all', root).innerHTML = `${icon('play')} ${esc(t(role ? 'startRole' : 'playAll'))}`; });
  on(root, 'click', '[data-play]', el => { if (!running) { focus(+el.dataset.play); play(+el.dataset.play); } });
  on(root, 'click', '[data-mic]', el => { if (!running) speakLine(+el.dataset.mic); });
  wireDone(root);
}
