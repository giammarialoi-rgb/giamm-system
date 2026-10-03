// Nurvan Admin: shared pieces. Data enters the page only as text (textContent),
// never as HTML.

export const $ = (id) => document.getElementById(id);
export const PLANS = ['free', 'standard', 'coach', 'coach_pro'];
export const PLAN_NAMES = { free: 'Free', standard: 'Standard', coach: 'Coach', coach_pro: 'Coach Pro' };
export const BASE = '/' + (location.pathname.split('/')[1] || '');

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Nurvan-Admin': '1', 'X-Nurvan-Admin-Link': BASE.slice(1) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch (_) {}
  if (res.status === 401 && !opts.allow401) { onUnauthorized(); throw new HttpError(401, 'Sessione scaduta'); }
  if (!res.ok) throw new HttpError(res.status, (json && json.error) || ('Errore ' + res.status));
  return json;
}

// Files go through fetch too: the address alone does not open them.
export async function download(path, filename) {
  const res = await fetch(path, { credentials: 'same-origin', headers: { 'X-Nurvan-Admin': '1', 'X-Nurvan-Admin-Link': BASE.slice(1) } });
  if (!res.ok) throw new HttpError(res.status, 'Download non riuscito');
  const url = URL.createObjectURL(await res.blob());
  const a = el('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// el('td', { class: 'x', onclick }, 'text' | Node | [...])
export function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'value') node.value = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  const list = Array.isArray(children) ? children : (children == null ? [] : [children]);
  for (const c of list.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}
const SVGNS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs, children) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  for (const c of [].concat(children || [])) if (c) node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}

export const msg = (kind, text) => el('div', { class: 'msg ' + kind }, text);
export const planName = (p) => PLAN_NAMES[p] || p || '—';

export function date(v) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function dateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function ago(v) {
  if (!v) return 'mai';
  const s = (Date.now() - new Date(v).getTime()) / 1000;
  if (s < 90) return 'adesso';
  if (s < 3600) return Math.round(s / 60) + ' min fa';
  if (s < 86400) return Math.round(s / 3600) + ' h fa';
  if (s < 86400 * 45) return Math.round(s / 86400) + ' gg fa';
  return date(v);
}
export const euro = (cents) => (Number(cents || 0) / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
export const num = (n) => (n == null ? '—' : Number(n).toLocaleString('it-IT'));
export function bytes(n) {
  n = Number(n || 0);
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}
export function pct(d) {
  if (d == null) return '';
  return (d > 0 ? '+' : '') + String(d).replace('.', ',') + '%';
}

export function table(headers, rows, opts = {}) {
  return el('div', { class: 'tbl' }, el('table', null, [
    el('thead', null, el('tr', null, headers.map((h) => (h instanceof Node ? h : Array.isArray(h) ? el('th', { class: h[1] }, h[0]) : el('th', null, h))))),
    el('tbody', null, rows.length ? rows : [el('tr', null, el('td', { colspan: headers.length, class: 'muted' }, opts.empty || 'Niente da mostrare.'))])
  ]));
}

export function card(value, label, opts = {}) {
  return el('div', { class: 'card' + (opts.onclick ? ' click' : ''), onclick: opts.onclick }, [
    el('div', { class: 'n' }, value),
    el('div', { class: 'l' }, label),
    opts.delta != null && opts.delta !== '' ? el('div', { class: 'd ' + (String(opts.delta).startsWith('-') ? 'down' : 'up') }, opts.delta) : null,
    opts.sub ? el('div', { class: 'l' }, opts.sub) : null
  ]);
}

export function badge(text, kind = '') { return el('span', { class: 'badge ' + kind }, text); }

/* ------------------------------ charts ------------------------------ */

const COLORS = { gold: '#8a6d1d', green: '#2f6b3a', red: '#a33b2b', blue: '#2b5d8a', gray: '#9a9a92' };

// A line (or two) over time. series: [{ day, value }]
export function lineChart(series, { height = 120, color = 'gold', title = '', fmt = num, second = null, secondColor = 'blue' } = {}) {
  const W = 640, H = height, P = 6;
  const wrap = el('div', { class: 'chart' });
  if (title) wrap.appendChild(el('div', { class: 'chart-title' }, title));
  if (!series || !series.length) { wrap.appendChild(el('div', { class: 'muted' }, 'Ancora nessun dato.')); return wrap; }
  const all = series.map((s) => s.value).concat(second ? second.map((s) => s.value) : []);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, series.length - 1);
  const y = (v) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P - 12);
  const path = (list) => list.map((s, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(s.value).toFixed(1)).join(' ');
  const root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'svgchart', role: 'img' });
  root.appendChild(svg('line', { x1: P, x2: W - P, y1: y(0), y2: y(0), stroke: '#e2e1dc', 'stroke-width': 1 }));
  root.appendChild(svg('path', { d: path(series) + ' L' + x(series.length - 1).toFixed(1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z', fill: COLORS[color], opacity: 0.1 }));
  root.appendChild(svg('path', { d: path(series), fill: 'none', stroke: COLORS[color], 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }));
  root.appendChild(svg('circle', { cx: x(series.length - 1).toFixed(1), cy: y(series[series.length - 1].value).toFixed(1), r: 3.5, fill: COLORS[color] }));
  if (second) root.appendChild(svg('path', { d: path(second), fill: 'none', stroke: COLORS[secondColor], 'stroke-width': 2, 'stroke-dasharray': '4 3', 'vector-effect': 'non-scaling-stroke' }));
  const tip = el('div', { class: 'tip', hidden: true });
  const hit = svg('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' });
  hit.addEventListener('pointermove', (ev) => {
    const r = root.getBoundingClientRect();
    const i = Math.max(0, Math.min(series.length - 1, Math.round(((ev.clientX - r.left) / r.width) * (series.length - 1))));
    tip.hidden = false;
    tip.textContent = date(series[i].day) + ' · ' + fmt(series[i].value) + (second && second[i] ? ' · ' + fmt(second[i].value) : '');
    tip.style.left = Math.min(r.width - 150, Math.max(0, ev.clientX - r.left - 60)) + 'px';
  });
  hit.addEventListener('pointerleave', () => { tip.hidden = true; });
  root.appendChild(hit);
  wrap.appendChild(el('div', { class: 'chart-box' }, [root, tip]));
  wrap.appendChild(el('div', { class: 'chart-axis' }, [el('span', null, date(series[0].day)), el('span', null, 'max ' + fmt(max)), el('span', null, date(series[series.length - 1].day))]));
  return wrap;
}

// Bars, two per label (in / out). rows: [{ label, a, b }]
export function barChart(rows, { height = 150, aLabel = 'Entrate', bLabel = 'Uscite', fmt = euro } = {}) {
  const W = 640, H = height, P = 14;
  const wrap = el('div', { class: 'chart' });
  const max = Math.max(1, ...rows.map((r) => Math.max(r.a, r.b)));
  const root = svg('svg', { viewBox: '0 0 ' + W + ' ' + (H + 16), class: 'svgchart', role: 'img' });
  const slot = (W - 2 * P) / rows.length;
  rows.forEach((r, i) => {
    const bw = Math.min(18, slot / 2 - 3);
    const ha = (r.a / max) * (H - 12), hb = (r.b / max) * (H - 12);
    const cx = P + slot * i + slot / 2;
    root.appendChild(svg('rect', { x: cx - bw - 1, y: H - ha, width: bw, height: ha, fill: COLORS.green, rx: 2 }, [svg('title', {}, r.label + ' · ' + aLabel + ' ' + fmt(r.a))]));
    root.appendChild(svg('rect', { x: cx + 1, y: H - hb, width: bw, height: hb, fill: COLORS.red, rx: 2 }, [svg('title', {}, r.label + ' · ' + bLabel + ' ' + fmt(r.b))]));
    const t = svg('text', { x: cx, y: H + 12, 'text-anchor': 'middle', 'font-size': 10, fill: '#6b6b66' }, r.label.slice(2));
    root.appendChild(t);
  });
  wrap.appendChild(el('div', { class: 'chart-box' }, root));
  wrap.appendChild(el('div', { class: 'legend' }, [el('span', { class: 'dot g' }), aLabel, el('span', { class: 'dot r' }), bLabel]));
  return wrap;
}

// Horizontal share bars: rows [{ label, value }]
export function shareBars(rows, { fmt = num } = {}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return el('div', { class: 'shares' }, rows.length ? rows.map((r) => el('div', { class: 'share' }, [
    el('div', { class: 'share-l' }, r.label),
    el('div', { class: 'share-bar' }, el('div', { style: 'width:' + Math.max(2, Math.round((r.value / max) * 100)) + '%' })),
    el('div', { class: 'share-v' }, fmt(r.value))
  ])) : el('div', { class: 'muted' }, 'Ancora nessun dato.'));
}

/* ------------------------------ page chrome ------------------------------ */

export function view(children) {
  $('view').replaceChildren(...[].concat(children).filter(Boolean));
}
export const loading = () => view(el('p', { class: 'muted' }, 'Caricamento…'));

// A panel that opens over the page (profile detail, forms).
export function drawer(title, body, { onclose } = {}) {
  const close = () => { shade.remove(); if (onclose) onclose(); };
  const shade = el('div', { class: 'shade', onclick: (ev) => { if (ev.target === shade) close(); } },
    el('aside', { class: 'drawer' }, [
      el('div', { class: 'drawer-head' }, [el('h2', null, title), el('button', { class: 'btn', type: 'button', onclick: close }, 'Chiudi')]),
      el('div', { class: 'drawer-body' }, body)
    ]));
  document.body.appendChild(shade);
  return { close, shade };
}

export function toast(kind, text) {
  const t = el('div', { class: 'toast ' + kind }, text);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

export function field(label, input, hint) {
  return el('label', { class: 'field' }, [el('span', null, label), input, hint ? el('small', { class: 'muted' }, hint) : null]);
}

export function tabs(items, current, onPick) {
  return el('div', { class: 'subtabs' }, items.map(([id, label]) => el('button', { type: 'button', class: id === current ? 'on' : '', onclick: () => onPick(id) }, label)));
}

export function daysPicker(current, onPick, options = [7, 30, 90]) {
  return el('div', { class: 'subtabs' }, options.map((d) => el('button', { type: 'button', class: d === current ? 'on' : '', onclick: () => onPick(d) }, d + ' giorni')));
}
