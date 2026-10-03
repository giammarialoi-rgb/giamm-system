// Body of an async function run by appeval. Reads window.__VIEW (set by the wrapper) and audits #view-container.
const view = '__VIEW__';
navigate(view);
await new Promise((r) => setTimeout(r, 1800));
for (let k = 0; k < 3; k++) { const b = [...document.querySelectorAll('.nurvan-sheet.is-open button, .modal button')].find((x) => /ho capito|ho letto|verstanden|entendido|compris|understood|^ok$|chiudi|continua/i.test(x.textContent.trim()) && x.offsetParent !== null && !/account/i.test((x.closest('#account-modal')||{}).id||'')); if (!b) break; b.click(); await new Promise((r) => setTimeout(r, 700)); }
const root = document.getElementById('view-container');
const vw = window.innerWidth;
const issues = [];
const icons = { svg: 0, img: 0, emoji: new Map(), iconFont: 0, svgSample: [] };
const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2B07}\u{2190}-\u{21FF}\u{2713}\u{2715}\u{25CF}\u{25CB}\u{25B6}\u{23F1}\u{23F0}]/gu;
const scrolls = (el) => { for (let p = el.parentElement; p && p !== root.parentElement; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
const label = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '"');
const all = [...root.querySelectorAll('*')].filter(visible);
for (const el of all) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'svg') { icons.svg++; if (icons.svgSample.length < 400) icons.svgSample.push(el.outerHTML.replace(/\s+/g, ' ').slice(0, 260)); continue; }
  if (el.closest('svg')) continue;
  if (tag === 'img') { icons.img++; continue; }
  const r = el.getBoundingClientRect();
  const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
  if (own.length) {
    const t = own.map((n) => n.textContent).join('');
    for (const m of t.matchAll(emojiRe)) icons.emoji.set(m[0], (icons.emoji.get(m[0]) || 0) + 1);
  }
  if (scrolls(el)) continue;
  // (a) outside the viewport horizontally
  if (r.right > vw + 1 || r.left < -1) issues.push({ k: 'outside-viewport', el: label(el), left: Math.round(r.left), right: Math.round(r.right) });
  // (b) clipped text
  const s = getComputedStyle(el);
  if (own.length && /(hidden|clip)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1 && s.textOverflow !== 'ellipsis') issues.push({ k: 'clipped-text', el: label(el), sw: el.scrollWidth, cw: el.clientWidth });
  if (own.length && s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) issues.push({ k: 'ellipsis-truncated', el: label(el), sw: el.scrollWidth, cw: el.clientWidth });
  // (d) a word broken mid-word: more rendered lines than words
  if (own.length) {
    const text = own.map((n) => n.textContent).join(' ').trim();
    const words = text.split(/\s+/).filter(Boolean);
    const rng = document.createRange();
    let lines = 0;
    for (const n of own) { rng.selectNodeContents(n); const tops = new Set([...rng.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top / 3))); lines += tops.size; }
    const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.2;
    if (words.length === 1 && lines > 1 && words[0].length > 3) issues.push({ k: 'word-broken', el: label(el), lines });
    // text overflows its own box (visible overflow) beyond the parent's right edge
    rng.selectNodeContents(own[0]);
    const rects = [...rng.getClientRects()].filter((q) => q.width > 0);
    if (rects.length) { const maxR = Math.max(...rects.map((q) => q.right)); const par = el.parentElement.getBoundingClientRect(); if (maxR > r.right + 2 && maxR > par.right + 2 && s.overflowX === 'visible') issues.push({ k: 'text-escapes-box', el: label(el), over: Math.round(maxR - r.right) }); }
    // small tap target / tiny font
    if (parseFloat(s.fontSize) < 10) issues.push({ k: 'tiny-font', el: label(el), px: s.fontSize });
  }
  // interactive controls that are too small to tap
  if ((tag === 'button' || tag === 'a' || el.getAttribute('role') === 'button' || el.onclick || el.hasAttribute('onclick')) && (r.height < 32 || r.width < 32) && !(tag === 'a' && getComputedStyle(el).display === 'inline')) issues.push({ k: 'small-tap-target', el: label(el), w: Math.round(r.width), h: Math.round(r.height) });
}
// ink overlap between text boxes of different elements
const inks = [];
for (const el of all) {
  if (el.closest('svg') || scrolls(el)) continue;
  const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
  if (!own.length) continue;
  const rng = document.createRange();
  for (const n of own) { rng.selectNodeContents(n); for (const q of rng.getClientRects()) if (q.width > 2 && q.height > 4) inks.push({ el, q }); }
}
let overlaps = 0;
for (let i = 0; i < inks.length && overlaps < 12; i++) for (let j = i + 1; j < inks.length && j < i + 60; j++) {
  const a = inks[i], b = inks[j];
  if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
  const w = Math.min(a.q.right, b.q.right) - Math.max(a.q.left, b.q.left);
  const h = Math.min(a.q.bottom, b.q.bottom) - Math.max(a.q.top, b.q.top);
  if (w > 3 && h > 3) { overlaps++; issues.push({ k: 'ink-overlap', a: label(a.el), b: label(b.el), w: Math.round(w), h: Math.round(h) }); }
}
const horiz = document.documentElement.scrollWidth > vw + 1;
const dedup = []; const seen = new Set();
for (const i of issues) { const key = i.k + '|' + (i.el || i.a) + '|' + (i.b || ''); if (!seen.has(key)) { seen.add(key); dedup.push(i); } }
const heading = (root.querySelector('h1,h2') || {}).textContent;
return { view, heading: (heading || '').trim().slice(0, 60), pageScrollsHorizontally: horiz, scrollWidth: document.documentElement.scrollWidth, vw, nodes: all.length, svg: icons.svg, img: icons.img, emoji: [...icons.emoji.entries()].map(([k, v]) => k + '×' + v).join(' '), issueCount: dedup.length, issues: dedup.slice(0, 40), svgSample: process_env_samples() };
function process_env_samples() { return icons.svgSample.length ? icons.svgSample.slice(0, 3) : []; }
