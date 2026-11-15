// The lesson / review engine: a queue of small exercises with instant feedback.
// See → Hear → Trace → Recognise → Build → Say → Write from memory.
import { CHARS, WORDS, SENTENCES, CHAR, WORD, SENT, NOTE, charAudio, SOUNDS_LIKE } from './data.js';
import { $, $$, esc, icon, on, shuffle, sample } from './ui.js';
import { t, L } from './i18n.js';
import { state, grade, learn, addXp, save, box } from './store.js';
import { say, sfx, buzz, stopAudio, hasMic, record, playBlob, releaseMic, getSpeed, fmtSpeed } from './audio.js';
import { canRecognize, listen, stopListening, scoreSpeech } from './speech.js';
import { makeWriter, hydrate, strokeCount } from './hanzi.js';

const TONE_MARKS = /[̄́̌̀]/;
export function toneOf(py) {
  const d = py.normalize('NFD');
  const i = d.search(TONE_MARKS);
  return i < 0 ? 0 : { '̄': 1, '́': 2, '̌': 3, '̀': 4 }[d[i]];
}
export const toneless = py => py.normalize('NFD').replace(/[̄́̌̀]/g, '').normalize('NFC');
export const toneSvg = n => {
  const d = { 1: 'M4 8H28', 2: 'M4 24 28 6', 3: 'M4 12Q13 34 28 8', 4: 'M4 6 28 26', 0: 'M13 18h6' }[n];
  return `<svg class="tone-ic" viewBox="0 0 32 32" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`;
};

const keyOf = (k, it) => k === 'c' ? 'c:' + it.c : k === 'w' ? 'w:' + it.id : 's:' + it.id;
const hzOf = (k, it) => k === 'c' ? it.c : it.hz;
const audioId = (k, it) => k === 'c' ? charAudio(it.c) : k === 'w' ? 'w_' + it.id : it.id;
const speak = (k, it, rate) => say(hzOf(k, it), { id: audioId(k, it), rate });

/* ---------------- building the queue ---------------- */
export function lessonSteps(Ls) {
  const chars = Ls.chars.map(c => CHAR[c]), words = Ls.words.map(id => WORD[id]), sents = Ls.sents.map(id => SENT[id]);
  const steps = [];
  for (const c of chars) { steps.push({ t: 'intro', k: 'c', it: c }); steps.push({ t: 'write', it: c, mode: 'trace' }); }
  shuffle(chars).forEach((c, i) => steps.push({ t: 'mcq', mode: i % 2 ? 'm2hz' : 'hz2m', k: 'c', it: c }));
  const fresh = words.filter(w => !Ls.chars.includes(w.hz));
  const modes = ['hz2m', 'audio2hz', 'm2hz', 'hz2py'];
  for (let i = 0; i < fresh.length; i += 3) {
    const batch = fresh.slice(i, i + 3);
    batch.forEach(w => steps.push({ t: 'intro', k: 'w', it: w }));
    shuffle(batch).forEach((w, j) => steps.push({ t: 'mcq', mode: modes[(i + j) % modes.length], k: 'w', it: w }));
  }
  sample(chars.filter(c => toneOf(c.py)), 3).forEach(c => steps.push({ t: 'tone', it: c }));
  sample(words.filter(w => Ls.chars.includes(w.hz)), 3).forEach(w => steps.push({ t: 'mcq', mode: 'audio2hz', k: 'w', it: w }));
  for (const id of Ls.notes) steps.push({ t: 'note', it: NOTE[id] });
  sents.forEach((s, i) => {
    steps.push({ t: 'intro', k: 's', it: s });
    steps.push({ t: 'build', it: s });
    if (i < 3) steps.push({ t: 'speak', k: 's', it: s });
  });
  sample(fresh.length ? fresh : words, 2).forEach(w => steps.push({ t: 'speak', k: 'w', it: w }));
  shuffle(chars).forEach(c => steps.push({ t: 'write', it: c, mode: 'memory' }));
  return steps;
}

export function reviewSteps(keys) {
  const steps = [];
  for (const key of keys) {
    const [k, id] = [key[0], key.slice(2)];
    if (k === 'c' && CHAR[id]) {
      const it = CHAR[id], b = box(key);
      const r = Math.random();
      if (r < 0.6) steps.push({ t: 'write', it, mode: 'memory' });
      else if (r < 0.8 && toneOf(it.py)) steps.push({ t: 'tone', it });
      else steps.push({ t: 'mcq', mode: b > 2 ? 'm2hz' : 'hz2m', k: 'c', it });
    } else if (k === 'w' && WORD[id]) {
      const it = WORD[id];
      const m = sample(['hz2m', 'audio2hz', 'm2hz', 'hz2py', 'speak'], 1)[0];
      steps.push(m === 'speak' ? { t: 'speak', k: 'w', it } : { t: 'mcq', mode: m, k: 'w', it });
    } else if (k === 's' && SENT[id]) {
      steps.push(Math.random() < 0.5 ? { t: 'build', it: SENT[id] } : { t: 'speak', k: 's', it: SENT[id] });
    }
  }
  return shuffle(steps);
}

/* ---------------- runner ---------------- */
export function runSession(root, { steps, title, learnKeys = [], onDone }) {
  const queue = steps.map(s => ({ ...s }));
  const total = () => done + queue.length;
  let done = 0, right = 0, wrong = 0, xp = 0, cur = null, answered = false, cleanup = null;
  const graded = new Set(), missed = new Set();
  let skipSpeak = !state.speak;

  document.body.classList.add('in-session');
  root.innerHTML = `
    <div class="session">
      <header class="s-top">
        <button class="icon-btn" id="s-quit" aria-label="${esc(t('quit'))}">${icon('x')}</button>
        <div class="bar" role="progressbar" aria-label="${esc(title)}" aria-valuemin="0" aria-valuemax="100"><i id="s-bar"></i></div>
        <span class="s-count" id="s-count"></span>
        <button class="speed-chip" data-speed aria-label="${esc(t('speedTitle'))} : ${fmtSpeed(getSpeed())}">${icon('gauge')}<b dir="ltr">${fmtSpeed(getSpeed())}</b></button>
      </header>
      <main class="s-body" id="s-body" tabindex="-1"></main>
      <footer class="s-foot" id="s-foot">
        <div class="fb" id="s-fb" role="status" aria-live="polite"></div>
        <button class="btn primary big" id="s-next"></button>
      </footer>
    </div>`;
  let body = $('#s-body', root); const foot = $('#s-foot', root), fb = $('#s-fb', root), nextBtn = $('#s-next', root);

  const end = () => { cleanup && cleanup(); cleanup = null; stopAudio(); stopListening(); releaseMic(); document.body.classList.remove('in-session'); };
  $('#s-quit', root).onclick = () => { if (done === 0 || confirm(t('quitConfirm'))) { end(); onDone && onDone(null); } };

  function setNext(label, enabled, handler, cls = 'primary') {
    nextBtn.textContent = label;
    nextBtn.disabled = !enabled;
    nextBtn.className = `btn big ${cls}`;
    nextBtn.onclick = handler;
  }
  function progress() {
    const p = Math.round(done / Math.max(1, total()) * 100);
    $('#s-bar', root).style.transform = `scaleX(${p / 100})`;
    $('.bar', root).setAttribute('aria-valuenow', p);
    $('#s-count', root).textContent = `${done}/${total()}`;
  }

  // Called by an exercise when the learner has answered.
  function answer(ok, { correct, detail, neutral } = {}) {
    if (answered) return;
    answered = true;
    const key = cur.k || cur.t === 'write' || cur.t === 'tone' ? keyOf(cur.k || 'c', cur.it) : (cur.t === 'build' ? 's:' + cur.it.id : null);
    if (!neutral) {
      if (ok) { right++; xp += 2; sfx.ok(); } else { wrong++; sfx.ko(); buzz(60); }
      if (key && !graded.has(key)) { graded.add(key); grade(key, ok); }
      if (!ok) { missed.add(key); if (!cur.retry) queue.push({ ...cur, retry: true }); }
    }
    foot.className = 's-foot ' + (neutral ? '' : ok ? 'ok' : 'ko');
    fb.innerHTML = neutral ? '' : `<strong>${icon(ok ? 'check' : 'x')} ${esc(ok ? t(sample(['fbGood1', 'fbGood2', 'fbGood3'], 1)[0]) : t('fbWrong'))}</strong>` +
      (correct ? `<span class="fb-sub">${correct}</span>` : '') + (detail ? `<span class="fb-sub">${detail}</span>` : '');
    setNext(t('continue'), true, advance, ok || neutral ? 'primary' : 'danger');
    nextBtn.focus({ preventScroll: true });
  }

  function advance() {
    cleanup && cleanup(); cleanup = null;
    stopAudio();
    if (cur) done++;
    cur = queue.shift();
    answered = false;
    foot.className = 's-foot';
    fb.innerHTML = '';
    progress();
    if (!cur) return finish();
    if (cur.t === 'speak' && skipSpeak) { cur = null; done--; return advance(); }
    const fresh = body.cloneNode(false);   // drops the previous exercise's listeners
    body.replaceWith(fresh);
    body = fresh;
    body.className = 's-body step-' + cur.t;
    cleanup = RENDER[cur.t](cur) || null;
    hydrate(body);
  }

  function finish() {
    end();
    document.body.classList.add('in-session');
    learnKeys.forEach(learn);
    const acc = right + wrong ? right / (right + wrong) : 1;
    const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
    xp += 10;
    addXp(xp);
    save();
    sfx.win();
    root.innerHTML = `
      <div class="session done">
        <main class="s-body finish">
          <div class="finish-seal" aria-hidden="true">${icon('trophy')}</div>
          <h1>${esc(t('finishTitle'))}</h1>
          <p class="muted">${esc(title)}</p>
          <div class="stars" aria-label="${stars}/3">${[1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}">${icon('star')}</span>`).join('')}</div>
          <div class="finish-stats">
            <div><b>+${xp}</b><span>XP</span></div>
            <div><b>${Math.round(acc * 100)}%</b><span>${esc(t('accuracy'))}</span></div>
            <div><b>${graded.size}</b><span>${esc(t('itemsSeen'))}</span></div>
          </div>
          ${missed.size ? `<p class="muted">${esc(t('missedNote', { n: missed.size }))}</p>` : `<p class="muted">${esc(t('perfectNote'))}</p>`}
        </main>
        <footer class="s-foot"><div class="fb"></div><button class="btn primary big" id="s-end">${esc(t('continue'))}</button></footer>
      </div>`;
    $('#s-end', root).onclick = () => { document.body.classList.remove('in-session'); onDone && onDone({ stars, xp, acc }); };
    $('#s-end', root).focus();
  }

  /* ---------------- exercise renderers ---------------- */
  const soundBtns = (k, it) => `
    <div class="snd-row">
      <button class="snd" data-snd="1" aria-label="${esc(t('listen'))}">${icon('sound')}</button>
      <button class="snd small" data-snd="0.7" aria-label="${esc(t('listenSlow'))}">${icon('slow')}</button>
    </div>`;
  const wireSound = (k, it) => on(body, 'click', '[data-snd]', el => speak(k, it, +el.dataset.snd));
  const pyLine = py => state.showPinyin ? `<div class="py" dir="ltr">${esc(py)}</div>` : '';

  const RENDER = {
    intro(s) {
      const { k, it } = s;
      const tag = `<span class="chip new">${esc(t(k === 'c' ? 'newChar' : k === 'w' ? 'newWord' : 'newSentence'))}</span>`;
      if (k === 'c') {
        body.innerHTML = `${tag}
          <div class="writer-card"><div class="grid-bg" id="w-target"></div></div>
          <div class="py big" dir="ltr">${esc(it.py)}</div>
          ${SOUNDS_LIKE[it.py] ? `<p class="says">${esc(L(SOUNDS_LIKE[it.py]))}</p>` : ''}
          <h2 class="meaning">${esc(L(it.m))}</h2>
          ${soundBtns()}
          <p class="hint">${icon('bulb')}<span>${esc(L(it.hint))}</span></p>
          <p class="muted small" id="w-count"></p>
          <button class="btn ghost" id="w-replay">${icon('play')} ${esc(t('replayStrokes'))}</button>`;
        const w = makeWriter($('#w-target', body), it.c, { size: 240, showOutline: true });
        const anim = () => w.animateCharacter();
        setTimeout(anim, 350);
        $('#w-replay', body).onclick = anim;
        strokeCount(it.c).then(n => { const e = $('#w-count', body); if (e) e.textContent = t('strokes', { n }); });
      } else {
        const parts = k === 'w' && it.hz.length > 1 ? [...it.hz].map(c => CHAR[c] ? `<li><span class="hz" lang="zh-Hans">${c}</span><span>${esc(L(CHAR[c].m))}</span></li>` : '').join('') : '';
        body.innerHTML = `${tag}
          <div class="hz hero ${k === 's' ? 'sent' : ''}" lang="zh-Hans" dir="ltr">${esc(it.hz)}</div>
          <div class="py big" dir="ltr">${esc(it.py)}</div>
          ${SOUNDS_LIKE[it.py] ? `<p class="says">${esc(L(SOUNDS_LIKE[it.py]))}</p>` : ''}
          <h2 class="meaning">${esc(L(it.m))}</h2>
          ${soundBtns()}
          ${parts ? `<ul class="parts">${parts}</ul>` : ''}`;
      }
      wireSound(k, it);
      setTimeout(() => speak(k, it), 250);
      setNext(t('continue'), true, advance);
    },

    note(s) {
      const g = s.it;
      body.innerHTML = `<span class="chip note">${icon('book')} ${esc(t('grammar'))}</span>
        <h2 class="note-title">${esc(L(g.title))}</h2>
        <p class="note-body">${esc(L(g.body))}</p>
        <ul class="ex-list">
          ${g.ok.map(x => `<li class="ok"><button class="ex" data-say="${esc(x)}">${icon('check')}<span class="hz" lang="zh-Hans" dir="ltr">${esc(x)}</span>${icon('sound', 'sm')}</button></li>`).join('')}
          ${g.ko.map(x => `<li class="ko"><span class="ex">${icon('x')}<s class="hz" lang="zh-Hans" dir="ltr">${esc(x)}</s></span></li>`).join('')}
        </ul>`;
      setNext(t('understood'), true, advance);
    },

    mcq(s) {
      const { k, it, mode } = s;
      const pool = (k === 'c' ? CHARS : WORDS).filter(o => hzOf(k, o) !== hzOf(k, it) && L(o.m) !== L(it.m) && o.py !== it.py);
      const near = pool.filter(o => Math.abs(hzOf(k, o).length - hzOf(k, it).length) <= 1);
      const opts = shuffle([it, ...sample(near.length >= 3 ? near : pool, 3)]);
      const face = o => mode === 'hz2m' ? `<span>${esc(L(o.m))}</span>`
        : mode === 'hz2py' ? `<span class="py" dir="ltr">${esc(o.py)}</span>`
        : `<span class="hz opt-hz" lang="zh-Hans" dir="ltr">${esc(hzOf(k, o))}</span>`;
      const prompt = mode === 'm2hz' ? `<p class="q">${esc(t('qPickHanzi'))}</p><h2 class="meaning big">${esc(L(it.m))}</h2>`
        : mode === 'audio2hz' ? `<p class="q">${esc(t('qListenPick'))}</p><button class="snd xl" data-snd="1" aria-label="${esc(t('listen'))}">${icon('sound')}</button><button class="snd small" data-snd="0.7" aria-label="${esc(t('listenSlow'))}">${icon('slow')}</button>`
        : `<p class="q">${esc(t(mode === 'hz2py' ? 'qPickPinyin' : 'qPickMeaning'))}</p><div class="hz hero" lang="zh-Hans" dir="ltr">${esc(hzOf(k, it))}</div>${mode === 'hz2m' ? pyLine(it.py) : ''}<button class="snd small" data-snd="1" aria-label="${esc(t('listen'))}">${icon('sound')}</button>`;
      body.innerHTML = `<div class="prompt">${prompt}</div>
        <div class="opts ${mode === 'hz2m' ? 'text' : ''}" role="group">${opts.map((o, i) => `<button class="opt" data-i="${i}">${face(o)}</button>`).join('')}</div>`;
      wireSound(k, it);
      if (mode === 'audio2hz') setTimeout(() => speak(k, it), 250);
      on(body, 'click', '.opt', el => {
        if (answered) return;
        const o = opts[+el.dataset.i], ok = o === it;
        $$('.opt', body).forEach((b, i) => { b.disabled = true; if (opts[i] === it) b.classList.add('right'); });
        if (!ok) el.classList.add('wrong');
        if (mode !== 'audio2hz') speak(k, it);
        answer(ok, { correct: `<span class="hz" lang="zh-Hans" dir="ltr">${esc(hzOf(k, it))}</span> <span dir="ltr">${esc(it.py)}</span> — ${esc(L(it.m))}` });
      });
      setNext(t('check'), false, null);
    },

    tone(s) {
      const it = s.it, tone = toneOf(it.py);
      body.innerHTML = `<div class="prompt"><p class="q">${esc(t('qPickTone'))}</p>
          <div class="hz hero" lang="zh-Hans">${it.c}</div>
          <div class="py big" dir="ltr">${esc(toneless(it.py))}</div>
          <button class="snd" data-snd="1" aria-label="${esc(t('listen'))}">${icon('sound')}</button></div>
        <div class="opts tones" role="group" dir="ltr">${[1, 2, 3, 4].map(n => `<button class="opt" data-n="${n}">${toneSvg(n)}<span>${n}</span></button>`).join('')}</div>`;
      wireSound('c', it);
      setTimeout(() => speak('c', it), 250);
      on(body, 'click', '.opt', el => {
        if (answered) return;
        const ok = +el.dataset.n === tone;
        $$('.opt', body).forEach(b => { b.disabled = true; if (+b.dataset.n === tone) b.classList.add('right'); });
        if (!ok) el.classList.add('wrong');
        answer(ok, { correct: `<span dir="ltr">${esc(it.py)}</span> — ${esc(t('toneN', { n: tone }))}` });
      });
      setNext(t('check'), false, null);
    },

    write(s) {
      const it = s.it, memory = s.mode === 'memory';
      body.innerHTML = `<div class="prompt compact"><p class="q">${esc(t(memory ? 'qWriteMemory' : 'qTrace'))}</p>
          <h2 class="meaning">${esc(L(it.m))} <span class="py" dir="ltr">${esc(it.py)}</span>
            <button class="snd small" data-snd="1" aria-label="${esc(t('listen'))}">${icon('sound')}</button></h2></div>
        <div class="writer-card"><div class="grid-bg" id="w-target"></div></div>
        <div class="row center">
          <button class="btn ghost" id="w-show">${icon('eye')} ${esc(t('showMe'))}</button>
          <span class="muted small" id="w-info"></span>
        </div>`;
      wireSound('c', it);
      const w = makeWriter($('#w-target', body), it.c, { size: Math.min(300, body.clientWidth - 48), showOutline: !memory });
      let mistakes = 0, peeked = false, n = 0;
      strokeCount(it.c).then(x => { n = x; });
      const start = () => w.quiz({
        showHintAfterMisses: memory ? 3 : 1,
        onMistake: () => { mistakes++; buzz(25); const e = $('#w-info', body); if (e) e.textContent = t('mistakes', { n: mistakes }); },
        onCorrectStroke: () => sfx.tap(),
        onComplete: () => {
          const ok = !memory || (!peeked && mistakes <= Math.max(2, Math.ceil(n / 3)));
          speak('c', it);
          answer(ok, { detail: memory && !ok ? esc(t(peeked ? 'peekedNote' : 'tooManyMistakes')) : '' });
        },
      });
      start();
      $('#w-show', body).onclick = () => {
        if (answered) return;
        peeked = true;
        w.cancelQuiz();
        w.animateCharacter({ onComplete: () => { if (!answered && cur === s) { w.hideCharacter(); start(); } } });
      };
      setNext(t('check'), false, null);
    },

    build(s) {
      const it = s.it;
      const others = SENTENCES.flatMap(x => x.tiles).filter(x => !it.tiles.includes(x));
      const tiles = shuffle([...it.tiles, ...sample([...new Set(others)], it.tiles.length <= 4 ? 2 : 1)]).map((x, i) => ({ x, i }));
      const picked = [];
      body.innerHTML = `<div class="prompt compact"><p class="q">${esc(t('qBuild'))}</p><h2 class="meaning">${esc(L(it.m))}</h2></div>
        <div class="answer-line" id="b-ans" dir="ltr" aria-label="${esc(t('yourSentence'))}"></div>
        <div class="tiles" id="b-bank" dir="ltr"></div>`;
      const draw = () => {
        $('#b-ans', body).innerHTML = picked.map(p => `<button class="tile hz" lang="zh-Hans" data-un="${p.i}">${esc(p.x)}</button>`).join('');
        $('#b-bank', body).innerHTML = tiles.map(p => `<button class="tile hz" lang="zh-Hans" data-pick="${p.i}" ${picked.includes(p) ? 'disabled' : ''}>${esc(p.x)}</button>`).join('');
        if (!answered) setNext(t('check'), picked.length > 0, check);
      };
      const check = () => {
        const ok = picked.map(p => p.x).join('') === it.tiles.join('');
        $$('.tile', body).forEach(b => { b.disabled = true; });
        speak('s', it);
        answer(ok, { correct: `<span class="hz" lang="zh-Hans" dir="ltr">${esc(it.hz)}</span><br><span dir="ltr">${esc(it.py)}</span>` });
      };
      on(body, 'click', '[data-pick]', el => { if (answered) return; const p = tiles.find(x => x.i === +el.dataset.pick); picked.push(p); sfx.tap(); say(p.x); draw(); });
      on(body, 'click', '[data-un]', el => { if (answered) return; const i = picked.findIndex(x => x.i === +el.dataset.un); picked.splice(i, 1); draw(); });
      draw();
    },

    speak(s) {
      const { k, it } = s;
      const rec = canRecognize();
      body.innerHTML = `<div class="prompt"><p class="q">${esc(t('qSpeak'))}</p>
          <div class="hz hero ${k === 's' ? 'sent' : ''}" lang="zh-Hans" dir="ltr">${esc(hzOf(k, it))}</div>
          <div class="py big" dir="ltr" id="sp-py">${esc(it.py)}</div>
          <p class="muted">${esc(L(it.m))}</p>
          ${soundBtns()}</div>
        <div class="mic-zone">
          <button class="mic" id="sp-mic" aria-label="${esc(t('micStart'))}">${icon('mic')}</button>
          <p class="mic-hint" id="sp-hint">${esc(t(rec ? 'micTap' : 'micTapRecord'))}</p>
          <div id="sp-out" class="sp-out"></div>
        </div>
        <button class="link" id="sp-skip">${esc(t('cantSpeak'))}</button>`;
      wireSound(k, it);
      setTimeout(() => speak(k, it), 250);
      const mic = $('#sp-mic', body), hint = $('#sp-hint', body), out = $('#sp-out', body);
      let busy = false, tries = 0, recorder = null;
      $('#sp-skip', body).onclick = () => { skipSpeak = true; answer(true, { neutral: true }); advance(); };
      if (!hasMic() && !rec) { hint.textContent = t('micUnavailable'); mic.disabled = true; }

      mic.onclick = async () => {
        if (answered) return;
        stopAudio();
        if (rec) {
          if (busy) return stopListening();
          busy = true; mic.classList.add('live'); hint.textContent = t('micListening');
          try {
            const alts = await listen();
            mic.classList.remove('live'); busy = false;
            if (!alts.length) { hint.textContent = t('micNothing'); return; }
            const r = await scoreSpeech(hzOf(k, it), alts);
            tries++;
            const syl = it.py.replace(/[?.,!。]/g, '').split(/\s+/);
            out.innerHTML = `<p class="heard">${esc(t('heard'))} <span class="hz" lang="zh-Hans" dir="ltr">${esc(r.heard)}</span></p>
              <div class="score-ring ${r.pass ? 'ok' : 'ko'}">${Math.round(r.score * 100)}%</div>`;
            if (r.pass || tries >= 3) answer(r.pass, { detail: r.pass ? '' : esc(t('speakTip')) });
            else { hint.textContent = t('micRetry', { n: 3 - tries }); sfx.ko(); }
          } catch (e) {
            mic.classList.remove('live'); busy = false;
            hint.textContent = t(/not-allowed|denied/.test(e.message) ? 'micDenied' : 'micError');
          }
        } else {
          // No speech recognition on this browser: record, play back, self-assess.
          try {
            if (!recorder) {
              recorder = await record();
              mic.classList.add('live'); hint.textContent = t('micRecording');
            } else {
              const url = await recorder.stop(); recorder = null;
              mic.classList.remove('live'); hint.textContent = t('micCompare');
              out.innerHTML = `<div class="row center"><button class="btn ghost" id="sp-me">${icon('play')} ${esc(t('myVoice'))}</button>
                <button class="btn ghost" id="sp-model">${icon('sound')} ${esc(t('model'))}</button></div>
                <p class="q">${esc(t('selfAssess'))}</p>
                <div class="row center"><button class="btn danger" id="sp-no">${esc(t('notYet'))}</button><button class="btn primary" id="sp-yes">${esc(t('iGotIt'))}</button></div>`;
              $('#sp-me', out).onclick = () => playBlob(url);
              $('#sp-model', out).onclick = () => speak(k, it);
              $('#sp-yes', out).onclick = () => answer(true);
              $('#sp-no', out).onclick = () => answer(false, { detail: esc(t('speakTip')) });
              playBlob(url);
            }
          } catch { hint.textContent = t('micDenied'); }
        }
      };
      setNext(t('check'), false, null);
      return () => { stopListening(); };
    },
  };

  advance();
}
