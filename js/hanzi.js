// Stroke-order data and drawing (HanziWriter + our own static SVG renderer).
let bundle;
const extra = {};
export function loadChars() {
  bundle = bundle || fetch('data/chars.json').then(r => r.json()).catch(() => ({}));
  return bundle;
}
export async function charData(c) {
  const b = await loadChars();
  if (b[c]) return b[c];
  if (!extra[c]) {
    extra[c] = fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(c)}.json`)
      .then(r => { if (!r.ok) throw new Error('no data'); return r.json(); });
  }
  return extra[c];
}
export const strokeCount = async c => (await charData(c)).strokes.length;

// Static drawing of a character. upTo = number of strokes shown; the last one is highlighted.
export function svgFor(data, { upTo, ghost = false, cls = '' } = {}) {
  const n = data.strokes.length, k = upTo == null ? n : upTo;
  const paths = data.strokes.map((d, i) => {
    if (i >= k) return ghost ? `<path d="${d}" class="sk-ghost"/>` : '';
    return `<path d="${d}" class="${upTo != null && i === k - 1 ? 'sk-cur' : 'sk'}"/>`;
  }).join('');
  return `<svg class="hz-svg ${cls}" viewBox="0 0 1024 1024" aria-hidden="true"><g transform="scale(1,-1) translate(0,-900)">${paths}</g></svg>`;
}
// Fill every <span data-hzsvg="字"> placeholder under root with the drawn character.
export async function hydrate(root) {
  const els = root.querySelectorAll('[data-hzsvg]');
  await Promise.all([...els].map(async el => {
    try {
      const d = await charData(el.dataset.hzsvg);
      const upTo = el.dataset.upto ? +el.dataset.upto : undefined;
      el.innerHTML = svgFor(d, { upTo, ghost: el.hasAttribute('data-ghost') });
    } catch { el.textContent = el.dataset.hzsvg; el.classList.add('hz'); }
  }));
}
// Step-by-step strip: one small drawing per stroke, like the stroke tables of the textbook.
export async function strokeStrip(c) {
  const d = await charData(c);
  return d.strokes.map((_, i) =>
    `<li><span class="step-box">${svgFor(d, { upTo: i + 1, ghost: true })}</span><span class="step-n">${i + 1}</span></li>`).join('');
}

export function makeWriter(el, c, opts = {}) {
  const css = getComputedStyle(document.documentElement);
  const v = n => css.getPropertyValue(n).trim();
  const size = opts.size || Math.min(el.clientWidth || 280, 320);
  el.innerHTML = '';
  return window.HanziWriter.create(el, c, {
    width: size, height: size, padding: size * 0.06,
    strokeColor: v('--ink'), outlineColor: v('--ghost'), radicalColor: v('--red'),
    highlightColor: v('--jade'), drawingColor: v('--ink'), drawingWidth: Math.max(18, size / 11),
    strokeAnimationSpeed: 1, delayBetweenStrokes: 220, showCharacter: false, showOutline: true,
    showHintAfterMisses: 2, highlightOnComplete: true,
    charDataLoader: (ch, done, fail) => { charData(ch).then(done).catch(fail); },
    ...opts,
  });
}
