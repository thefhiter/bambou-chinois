// Small DOM helpers, icons, toast and bottom sheet.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sample = (a, n) => shuffle(a).slice(0, n);

// Delegated listener: on(root, 'click', '[data-x]', (el, ev) => …)
export function on(root, type, sel, fn) {
  root.addEventListener(type, ev => {
    const el = ev.target.closest(sel);
    if (el && root.contains(el)) fn(el, ev);
  });
}

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  brush: '<path d="M18.4 2.6a2 2 0 0 1 3 3L11 16l-4 1 1-4Z"/><path d="M7 17c-1.5 0-3 1-3 3 0 1-1 1.5-2 1.5 1 1 2.5 1.5 4 1.5 2.5 0 4-1.5 4-3.5"/>',
  wave: '<path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/><path d="M22 12h0"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  spark: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4Z"/><path d="M19 15v4M17 17h4M5 3v3M3.5 4.5h3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  sound: '<path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
  slow: '<path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M15 12h6"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><path d="M12 18v4M8 22h8"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  play: '<path d="M7 4v16l13-8Z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  prev: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="m9 18 6-6-6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  flame: '<path d="M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 1.5-4 .8 1.3 1.500 1.800 2 2C11 7.500 10.500 5 12 2Z"/>',
  star: '<path d="m12 2 3 6.500 7 .800-5.200 4.800 1.500 7L12 17.600 5.700 21.100l1.500-7L2 9.300l7-.800Z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9a2.500 2.500 0 1 1 3.500 2.300c-.700.400-1 1-1 1.700"/><path d="M12 17h0"/>',
  heart: '<path d="M12 20s-8-4.500-8-10.500A4.500 4.500 0 0 1 12 7a4.500 4.500 0 0 1 8 2.500C20 15.500 12 20 12 20Z"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8Z"/><circle cx="8" cy="8" r="1.500"/>',
  shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="m4 4 5 5"/>',
  plane: '<path d="M21 3 3 10.500l7 2.500 2.500 7Z"/><path d="m10 13 4-4"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.500 7.200L4 21l1.600-5A8 8 0 1 1 21 12Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.500"/><rect x="14" y="3" width="7" height="7" rx="1.500"/><rect x="3" y="14" width="7" height="7" rx="1.500"/><rect x="14" y="14" width="7" height="7" rx="1.500"/>',
  ear: '<path d="M6 9a6 6 0 1 1 12 0c0 3-3 4-3 7a3 3 0 0 1-6 .500"/><path d="M9 9a3 3 0 0 1 6 0c0 1.500-1.500 2-2 3"/>',
  send: '<path d="M4 12 20 4l-4 16-4-6Z"/><path d="m12 14 8-10"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.500-6.200L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.500 6.200L3 16"/><path d="M3 21v-5h5"/>',
  eye: '<path d="M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18"/><path d="M10.600 5.100A10 10 0 0 1 12 5c6.500 0 10 7 10 7a17 17 0 0 1-3.200 4"/><path d="M6.600 6.600A17 17 0 0 0 2 12s3.500 7 10 7a10 10 0 0 0 4-.800"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Z"/><path d="M4 21a2 2 0 0 0 2 2h14"/><path d="M8 7h8M8 11h6"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.700c.600.500 1 1.300 1 2.300h6c0-1 .400-1.800 1-2.300A7 7 0 0 0 12 2Z"/>',
  trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.600 13.500 6.800 4M15.400 6.500l-6.800 4"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.500 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
  users: '<circle cx="9" cy="8" r="3.500"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.500a3.500 3.500 0 0 1 0 7"/><path d="M18 14a7 7 0 0 1 4 6"/>',
  gauge: '<path d="M4 18a9 9 0 1 1 16 0"/><path d="m12 13 4-5"/><circle cx="12" cy="13" r="1.500"/>',
};
export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

let toastTimer;
export function toast(msg) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// Bottom sheet / modal. Returns { el, close }.
export function sheet(html, { onClose, wide } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="scrim" data-close></div><div class="sheet${wide ? ' wide' : ''}" role="dialog" aria-modal="true" tabindex="-1">
    <button class="icon-btn sheet-x" data-close aria-label="Close">${icon('x')}</button>${html}</div>`;
  document.body.appendChild(wrap);
  const prev = document.activeElement;
  const close = () => {
    if (!wrap.isConnected) return;
    wrap.classList.remove('open');
    document.removeEventListener('keydown', key);
    setTimeout(() => wrap.remove(), 200);
    onClose && onClose();
    prev && prev.focus && prev.focus();
  };
  const key = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  on(wrap, 'click', '[data-close]', close);
  requestAnimationFrame(() => { wrap.classList.add('open'); $('.sheet', wrap).focus(); });
  return { el: $('.sheet', wrap), close };
}
