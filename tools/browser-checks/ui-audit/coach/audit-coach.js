// Body of an async function. Audits the whole page (document.body): the screen is already reached by the runner.
const view = '__VIEW__';
const LANG = '__LANG__';
const root = document.body;
const vw = window.innerWidth;
const inShell = (el) => view !== 'today' && !!el.closest('header, .bottom-nav, #coach-os-sidebar, #cp-session-bar, .coach-session-bar, #cp-coach-session-banner');
const issues = [];
const icons = { svg: 0, img: 0, emoji: new Map(), svgSample: [] };
const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2B07}\u{2190}-\u{21FF}\u{2713}\u{2715}\u{25CF}\u{25CB}\u{25B6}\u{25B8}\u{25BE}\u{2022}\u{2661}\u{2662}\u{23F1}\u{23F0}]/gu;
const scrolls = (el) => { for (let p = el.parentElement; p && p !== root.parentElement; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
const label = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '"');
const all = [...root.querySelectorAll('*')].filter((e) => !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(e.tagName) && visible(e) && !inShell(e));
const enRe = /\b(the|and|loading|settings|today|inbox|message|messages|calendar|check-ins?|business|plan|dry run|run|open|save|cancel|close|delete|assign|request|review|reviewed|pin|unpin|preview|undo|confirm|received|requested|to review|scheduled|completed|ask|portfolio|operational|rules|attention|stage|lead|trial|active|paused|churned|churn risk|ask_coach|check_in|workout|clients?|coach mode|coach os|meal ai|no |new rule|view data|why|intent|result|refresh data|replan|approve|modify|dismiss|timeline|domains|more|snooze|resolve|task|tasks)\b/i;
const english = [];
for (const el of all) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'svg') { icons.svg++; if (icons.svgSample.length < 6) icons.svgSample.push(label(el.parentElement || el) + ' :: ' + el.outerHTML.replace(/\s+/g, ' ').slice(0, 160)); continue; }
  if (el.closest('svg')) continue;
  if (tag === 'img') { icons.img++; continue; }
  const r = el.getBoundingClientRect();
  const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
  if (own.length) {
    const t = own.map((n) => n.textContent).join('');
    for (const m of t.matchAll(emojiRe)) icons.emoji.set(m[0], (icons.emoji.get(m[0]) || 0) + 1);
    if (LANG === 'it' && enRe.test(t.trim()) && tag !== 'option' && english.length < 40) english.push({ el: label(el), text: t.trim().slice(0, 70) });
  }
  if (scrolls(el)) continue;
  if (r.right > vw + 1 || r.left < -1) issues.push({ k: 'outside-viewport', el: label(el), left: Math.round(r.left), right: Math.round(r.right) });
  const s = getComputedStyle(el);
  if (own.length && /(hidden|clip)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1 && s.textOverflow !== 'ellipsis') issues.push({ k: 'clipped-text', el: label(el), sw: el.scrollWidth, cw: el.clientWidth });
  if (own.length && s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) issues.push({ k: 'ellipsis-truncated', el: label(el), sw: el.scrollWidth, cw: el.clientWidth });
  if (own.length) {
    const text = own.map((n) => n.textContent).join(' ').trim();
    const words = text.split(/\s+/).filter(Boolean);
    const rng = document.createRange();
    let lines = 0;
    for (const n of own) { rng.selectNodeContents(n); const tops = new Set([...rng.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top / 3))); lines += tops.size; }
    if (words.length === 1 && lines > 1 && words[0].length > 3) issues.push({ k: 'word-broken', el: label(el), lines });
    // a text column squeezed to a few pixels: many lines, a handful of letters each
    if (lines >= 6 && text.length / lines < 5) issues.push({ k: 'collapsed-text', el: label(el), lines, chars: text.length, boxW: Math.round(r.width) });
    rng.selectNodeContents(own[0]);
    const rects = [...rng.getClientRects()].filter((q) => q.width > 0);
    if (rects.length) { const maxR = Math.max(...rects.map((q) => q.right)); const par = el.parentElement.getBoundingClientRect(); if (maxR > r.right + 2 && maxR > par.right + 2 && s.overflowX === 'visible') issues.push({ k: 'text-escapes-box', el: label(el), over: Math.round(maxR - r.right) }); }
    if (parseFloat(s.fontSize) < 10) issues.push({ k: 'tiny-font', el: label(el), px: s.fontSize });
  }
  if ((tag === 'button' || tag === 'a' || tag === 'select' || el.getAttribute('role') === 'button' || el.hasAttribute('onclick')) && (r.height < 32 || r.width < 32) && !(tag === 'a' && s.display === 'inline')) issues.push({ k: 'small-tap-target', el: label(el), w: Math.round(r.width), h: Math.round(r.height) });
  // a bordered/filled box whose text touches its edge: a card without inner padding
  const bw = parseFloat(s.borderLeftWidth) || 0;
  const filled = s.backgroundColor && !/rgba?\(0, 0, 0, 0\)/.test(s.backgroundColor);
  if ((bw > 0 || (filled && parseFloat(s.borderTopLeftRadius) > 3)) && r.width > 90 && r.height > 24 && tag !== 'input' && tag !== 'select' && tag !== 'textarea' && tag !== 'button' && !el.closest('button')) {
    const rg = document.createRange(); let minL = 1e9, maxR2 = -1e9, any = false;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n; while ((n = walker.nextNode())) { if (!n.textContent.trim() || !n.parentElement || getComputedStyle(n.parentElement).display === 'none') continue; rg.selectNodeContents(n); for (const q of rg.getClientRects()) { if (q.width > 1) { any = true; minL = Math.min(minL, q.left); maxR2 = Math.max(maxR2, q.right); } } }
    if (any && (minL - r.left < 6 || r.right - maxR2 < 6)) issues.push({ k: 'tight-padding', el: label(el), left: Math.round(minL - r.left), right: Math.round(r.right - maxR2) });
  }
}
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
const heading = (document.querySelector('#view-container h1, #view-container h2') || {}).textContent;
// the buttons on screen, to judge their sizes and styles
const buttons = [...document.querySelectorAll('#view-container button, .cp-overlay button, #coach-appointment-form button, #coach-payment-form button, #cp-notify-center button, #cp-coach-drawer button')].filter((b) => visible(b) && !inShell(b)).slice(0, 60).map((b) => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b); return { t: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28), cls: String(b.className).slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), fs: s.fontSize, br: s.borderRadius }; });
return { view, lang: LANG, heading: (heading || '').trim().slice(0, 60), pageScrollsHorizontally: horiz, scrollWidth: document.documentElement.scrollWidth, vw, nodes: all.length, svg: icons.svg, img: icons.img, emoji: [...icons.emoji.entries()].map(([k, v]) => k + 'x' + v).join(' '), issueCount: dedup.length, issues: dedup.slice(0, 50), english, buttons, svgSample: icons.svgSample };
