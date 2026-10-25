// Light mode (Impostazioni › Aspetto: Scuro, Chiaro, Automatico), asked for by the Google Play testers
// (Testers Community report, October 2026).
//
// The app was drawn dark only: thousands of colours are written straight into the markup the scripts
// build, not in a few variables. So the light theme is computed from the dark one, colour by colour, the
// way it is used:
//   - backgrounds: black and dark greys become white and light greys (the page #f4f4f2, cards white);
//     dark tinted ones (a dark red box) become light tints; bright colours (gold buttons) stay;
//   - text: light greys become dark greys of the same weight (white text → near black, #888 → #6f6f6f);
//     coloured text gets darker, to stay readable on white (gold #d4af37 → #876b1c);
//   - borders: dark lines become light lines; shadows get lighter.
// It is applied to the page's style sheets, to every style="" the scripts write (watched as they are
// written) and to the charts drawn on a canvas in the page. The top bar and the bottom navigation stay
// dark, with the logo and the system clock on them (see CHROME_CSS). Pictures are never touched.
// Switching back to dark puts every original value back.
(function (root) {
  'use strict';
  var KEY = 'nurvan.theme';
  var doc = root.document;

  /* ---------------- colours ---------------- */

  var NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], silver: [192, 192, 192, 1], gray: [128, 128, 128, 1], grey: [128, 128, 128, 1], gold: [255, 215, 0, 1] };

  function parseColor(tok) {
    var t = String(tok).trim().toLowerCase();
    var m;
    if (t[0] === '#') {
      var h = t.slice(1);
      if (h.length === 3 || h.length === 4) h = h.split('').map(function (c) { return c + c; }).join('');
      if (h.length !== 6 && h.length !== 8) return null;
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
    }
    if ((m = t.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/))) {
      var a = m[4] == null ? 1 : (/%$/.test(m[4]) ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
      return [+m[1], +m[2], +m[3], a];
    }
    return NAMED[t] ? NAMED[t].slice() : null;
  }

  function toHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function fromHsl(h, s, l) {
    function f(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    if (s === 0) { var v = Math.round(l * 255); return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [Math.round(f(p, q, h + 1 / 3) * 255), Math.round(f(p, q, h) * 255), Math.round(f(p, q, h - 1 / 3) * 255)];
  }
  function fmt(rgb, a) {
    if (a >= 1) return '#' + rgb.map(function (v) { return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2); }).join('');
    return 'rgba(' + rgb.join(', ') + ', ' + (Math.round(a * 1000) / 1000) + ')';
  }

  // One colour of the dark theme, used as `role`, in the light theme.
  function lightColor(c, role) {
    var r = c[0], g = c[1], b = c[2], a = c[3];
    if (a === 0) return c;
    var hsl = toHsl(r, g, b), h = hsl[0], s = hsl[1], l = hsl[2];
    var neutral = s < 0.25 || l < 0.04 || l > 0.97;
    if (role === 'shadow') {
      if (neutral && l < 0.5) return [r, g, b, a * 0.4];
      return c;
    }
    // Black or white veils over something: a dark veil stays a (lighter) dim, a white one becomes a dark one.
    if (a < 1 && neutral && (role === 'bg' || role === 'border')) {
      if (l > 0.9) return [0, 0, 0, Math.min(a, 0.12)];
      if (l < 0.1) return a >= 0.5 ? [15, 15, 15, a * 0.55] : [0, 0, 0, a * 0.5];
    }
    var nl = l, ns = s;
    if (role === 'text') {
      if (neutral) {
        if (l < 0.5) return c;                       // dark text already sits on a light or gold surface
        nl = 0.08 + (1 - l) * 0.76;
      } else {
        if (l <= 0.42) return c;
        nl = Math.max(0.24, l * 0.62);
      }
    } else if (role === 'bg') {
      if (neutral) {
        if (l > 0.5) return c;                       // a light chip on the dark page keeps its colour
        if (l <= 0.02) nl = 0.955;
        else if (l <= 0.12) nl = 1 - (l - 0.02) * 0.35;
        else nl = 0.966 - (l - 0.12) * 0.6;
      } else {
        if (l >= 0.25) return c;                     // gold, green, red buttons and badges stay as they are
        nl = 0.93 - l * 0.3;
        ns = Math.min(s, 0.6);
      }
    } else if (role === 'border') {
      if (neutral) {
        if (l >= 0.5) nl = 0.08 + (1 - l) * 0.76;    // a light outline that marked a choice stays visible
        else nl = 0.93 - l * 0.3;
      } else {
        if (l >= 0.25) return c;
        nl = 0.86 - l * 0.3;
        ns = Math.min(s, 0.6);
      }
    } else if (role === 'ink') {                     // drawings (svg, canvas): neutrals flip, colours stay
      if (!neutral) return c;
      return lightColor(c, l >= 0.5 ? 'text' : 'bg');
    }
    var out = fromHsl(h, ns, nl);
    return [out[0], out[1], out[2], a];
  }

  var COLOR_TOKEN = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black|silver|gr[ae]y|gold)\b/g;
  var cache = {};
  // Every colour inside a declaration value (gradients and shadows have several), urls left alone.
  function mapValue(value, role) {
    var key = role + '|' + value;
    if (key in cache) return cache[key];
    // url(...) and var(--name...) are cut out first: "gold" in var(--gold) is not a colour.
    var out = String(value).split(/(url\([^)]*\)|var\(--[\w-]+(?:\s*,[^)]*)?\))/).map(function (part) {
      if (/^url\(/.test(part)) return part;
      if (/^var\(/.test(part)) return role === 'text' ? part.replace(/^var\(--gold-glow\)$/, 'var(--gold-ink)').replace(/^var\(--(gold|accent-red|success|accent-green)\)$/, 'var(--$1-ink)') : part;
      return part.replace(COLOR_TOKEN, function (tok) {
        var c = parseColor(tok);
        if (!c) return tok;
        var n = lightColor(c, role);
        return fmt(n.slice(0, 3), n[3]);
      });
    }).join('');
    cache[key] = out;
    return out;
  }

  var PROPS = {
    'color': 'text', '-webkit-text-fill-color': 'text', 'caret-color': 'text', 'text-decoration-color': 'text',
    'background-color': 'bg', 'background-image': 'bg',
    'border-top-color': 'border', 'border-right-color': 'border', 'border-bottom-color': 'border', 'border-left-color': 'border',
    'outline-color': 'border', 'column-rule-color': 'border',
    'box-shadow': 'shadow', 'text-shadow': 'shadow',
    'fill': 'ink', 'stroke': 'ink', 'stop-color': 'ink'
  };
  // Shorthands are read only when they hold a var(): then the browser leaves their longhands empty.
  var SHORTHANDS = { 'background': 'bg', 'border': 'border', 'border-top': 'border', 'border-right': 'border', 'border-bottom': 'border', 'border-left': 'border', 'border-color': 'border', 'outline': 'border' };
  var HAS_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\(|\b(?:white|black|silver|gr[ae]y|gold)\b|var\(--(?:gold|gold-glow|accent-red|success|accent-green)\)/;

  // The changes one declaration block needs: [property, new value, priority, old value]. `mine` holds the
  // values this file wrote there, which are already light and are left alone.
  function changesFor(style, mine) {
    var out = [];
    for (var p in PROPS) {
      var v = style.getPropertyValue(p);
      if (!v || !HAS_COLOR.test(v) || (mine && mine[p] === v)) continue;
      var nv = mapValue(v, PROPS[p]);
      if (nv !== v) out.push([p, nv, style.getPropertyPriority(p), v]);
    }
    for (var sh in SHORTHANDS) {
      var sv = style.getPropertyValue(sh);
      if (!sv || sv.indexOf('var(') < 0 || !HAS_COLOR.test(sv) || (mine && mine[sh] === sv)) continue;
      var snv = mapValue(sv, SHORTHANDS[sh]);
      if (snv !== sv) out.push([sh, snv, style.getPropertyPriority(sh), sv]);
    }
    return out;
  }

  /* ---------------- style sheets ---------------- */

  // The variables the dark theme is written with, in the light theme. --gold stays (buttons, borders):
  // text written with it uses --gold-ink, darker, readable on white.
  var LIGHT_VARS = ':root[data-theme="light"]{--bg:#f4f4f2;--surface:#ffffff;--surface-light:#f1f0ed;--border:#dedcd6;' +
    '--text-primary:#141414;--text:#1a1a1a;--text-secondary:#5f5f5f;--silver:#4a4a4a;--silver-bright:#262626;' +
    '--gold-ink:#876b1c;--accent-red-ink:#c62828;--success-ink:#2e7d32;--accent-green-ink:#2e7d32;color-scheme:light;}' +
    'html[data-theme="light"],html[data-theme="light"] body{background:#f4f4f2;}' +
    // The NURVAN wordmark is drawn on black: on the light page it becomes a black badge, not a cut-out box.
    'html[data-theme="light"] img[src$="nurvan_wordmark.png"]{background:#000;border-radius:12px;padding:8px 12px;box-sizing:border-box;}';
  // The top bar and the bottom navigation stay dark: the logo is drawn for a dark background, and the
  // system clock above the bar keeps its light colour on iPhone and Android.
  var CHROME = 'header, .bottom-nav, #splash';
  var CHROME_CSS =
    'html[data-theme="light"] :is(' + CHROME + '){--bg:#000000;--surface:#0a0a0a;--surface-light:#151515;--border:#222222;--text-primary:#ffffff;--text:#f0f0f0;--text-secondary:#888888;--silver:#c0c0c0;--silver-bright:#e8e8e8;--gold-ink:#d4af37;color-scheme:dark;}' +
    'html[data-theme="light"] header{background:#000 !important;border-color:#1c1c1c !important;}' +
    'html[data-theme="light"] .bottom-nav{background:#050505 !important;border-color:#1c1c1c !important;}' +
    'html[data-theme="light"] #splash{background:#000 !important;}' +
    'html[data-theme="light"] header .btn-outline{background:transparent !important;color:#e8e8e8 !important;border-color:#3a3a3a !important;}' +
    'html[data-theme="light"] header .btn-primary{color:#000 !important;}' +
    'html[data-theme="light"] .bottom-nav .nav-item{color:#8a8a8a !important;}' +
    'html[data-theme="light"] .bottom-nav .nav-item.active{color:#d4af37 !important;}';

  function inChrome(el) {
    try { return !!(el && el.closest && el.closest(CHROME + ', [data-theme-keep]')); } catch (_) { return false; }
  }
  // A rule written only for the dark bars (header …, .bottom-nav …) is left as it is.
  function chromeRule(sel) {
    return /(^|[\s,>+~(])(header|\.bottom-nav|#splash|\.nav-item)(?=$|[\s.:#[,>+~)])/.test(sel || '');
  }

  var sheetChanges = [];   // [style, property, old value, old priority]
  var doneSheets = typeof WeakSet === 'function' ? new WeakSet() : null;

  function walkRules(rules) {
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule.cssRules && !rule.style) { walkRules(rule.cssRules); continue; }
      if (!rule.style) continue;
      if (rule.selectorText && chromeRule(rule.selectorText)) continue;
      if (rule.selectorText && /data-theme/.test(rule.selectorText)) continue;
      var ch = changesFor(rule.style);
      for (var k = 0; k < ch.length; k++) {
        sheetChanges.push([rule.style, ch[k][0], ch[k][3], rule.style.getPropertyPriority(ch[k][0])]);
        rule.style.setProperty(ch[k][0], ch[k][1], ch[k][2]);
      }
      if (rule.cssRules && rule.cssRules.length) walkRules(rule.cssRules);
    }
  }
  function themeSheet(sheet) {
    if (!sheet || (doneSheets && doneSheets.has(sheet))) return;
    var owner = sheet.ownerNode;
    if (owner && owner.id === 'nurvan-theme-light') return;
    var rules;
    try { rules = sheet.cssRules; } catch (_) { return; }   // another site's sheet: not readable, not ours
    if (doneSheets) doneSheets.add(sheet);
    walkRules(rules);
  }
  function themeSheets() {
    var list = doc.styleSheets;
    for (var i = 0; i < list.length; i++) themeSheet(list[i]);
  }
  function restoreSheets() {
    for (var i = sheetChanges.length - 1; i >= 0; i--) {
      var c = sheetChanges[i];
      try { c[0].setProperty(c[1], c[2], c[3]); } catch (_) {}
    }
    sheetChanges = [];
    doneSheets = typeof WeakSet === 'function' ? new WeakSet() : null;
  }

  /* ---------------- inline styles ---------------- */

  // element → { orig: {property: [dark value, priority]}, mine: {property: value written here} }
  var states = typeof WeakMap === 'function' ? new WeakMap() : null;
  var touched = [];

  function themeElement(el) {
    if (!states || inChrome(el)) return;
    if (el.hasAttribute('style')) {
      var st = states.get(el);
      var ch = changesFor(el.style, st && st.mine);
      if (ch.length) {
        if (!st) { st = { orig: {}, mine: {} }; states.set(el, st); touched.push(el); }
        for (var k = 0; k < ch.length; k++) {
          st.orig[ch[k][0]] = [ch[k][3], ch[k][2]];
          el.style.setProperty(ch[k][0], ch[k][1], ch[k][2]);
          st.mine[ch[k][0]] = el.style.getPropertyValue(ch[k][0]);
        }
      }
    }
    if (el.namespaceURI === 'http://www.w3.org/2000/svg') {
      ['fill', 'stroke', 'stop-color'].forEach(function (name) {
        var v = el.getAttribute(name);
        if (!v || !HAS_COLOR.test(v) || el.getAttribute('data-theme-' + name) === v || el.getAttribute('data-theme-mine-' + name) === v) return;
        var nv = mapValue(v, 'ink');
        if (nv === v) return;
        el.setAttribute('data-theme-' + name, v);
        el.setAttribute('data-theme-mine-' + name, nv);
        el.setAttribute(name, nv);
      });
    }
  }
  function themeTree(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === 'STYLE') { if (node.sheet) themeSheet(node.sheet); return; }
    if (node.hasAttribute('style') || node.namespaceURI === 'http://www.w3.org/2000/svg') themeElement(node);
    var list = node.querySelectorAll('[style], svg [fill], svg [stroke], svg [stop-color], style');
    for (var i = 0; i < list.length; i++) {
      if (list[i].tagName === 'STYLE') { if (list[i].sheet) themeSheet(list[i].sheet); }
      else themeElement(list[i]);
    }
  }
  function restoreElements() {
    touched.forEach(function (el) {
      var st = states.get(el);
      if (!st) return;
      for (var p in st.orig) {
        if (el.style.getPropertyValue(p) === st.mine[p]) el.style.setProperty(p, st.orig[p][0], st.orig[p][1]);
      }
    });
    touched = [];
    states = new WeakMap();
    var svgs = doc.querySelectorAll('[data-theme-fill], [data-theme-stroke], [data-theme-stop-color]');
    for (var i = 0; i < svgs.length; i++) {
      ['fill', 'stroke', 'stop-color'].forEach(function (name) {
        var o = svgs[i].getAttribute('data-theme-' + name);
        if (o == null) return;
        if (svgs[i].getAttribute(name) === svgs[i].getAttribute('data-theme-mine-' + name)) svgs[i].setAttribute(name, o);
        svgs[i].removeAttribute('data-theme-' + name);
        svgs[i].removeAttribute('data-theme-mine-' + name);
      });
    }
  }

  var observer = null;
  function watch() {
    if (observer || typeof MutationObserver !== 'function') return;
    observer = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === 'attributes') { if (r.target.nodeType === 1) themeElement(r.target); continue; }
        // A <style> whose text was replaced has a new sheet.
        if (r.target.tagName === 'STYLE') { if (r.target.sheet) themeSheet(r.target.sheet); continue; }
        for (var j = 0; j < r.addedNodes.length; j++) themeTree(r.addedNodes[j]);
      }
    });
    observer.observe(doc.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'fill', 'stroke'] });
  }
  function unwatch() { if (observer) { observer.disconnect(); observer = null; } }

  /* ---------------- charts on a canvas ---------------- */

  // Only canvases in the page: a picture made to be shared (the workout card) is drawn off the page and
  // keeps its dark design.
  var canvasPatched = false;
  function patchCanvas() {
    if (canvasPatched || typeof CanvasRenderingContext2D === 'undefined') return;
    canvasPatched = true;
    ['fillStyle', 'strokeStyle'].forEach(function (prop) {
      var d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, prop);
      if (!d || !d.set) return;
      Object.defineProperty(CanvasRenderingContext2D.prototype, prop, {
        configurable: true, enumerable: d.enumerable, get: d.get,
        set: function (v) {
          if (active && typeof v === 'string' && this.canvas && this.canvas.isConnected && !inChrome(this.canvas)) v = mapValue(v, 'ink');
          d.set.call(this, v);
        }
      });
    });
  }

  /* ---------------- switching ---------------- */

  var active = false;
  var styleEl = null;

  function pref() {
    try { var v = root.localStorage.getItem(KEY); return v === 'light' || v === 'system' ? v : 'dark'; } catch (_) { return 'dark'; }
  }
  // What the phone is set to. Android's web view always answers "light" (the app's theme is a light one),
  // so the Android app tells it through the bridge (MainActivity.isSystemDark, and nurvanSystemTheme when it changes).
  var systemOverride = null;
  function systemIsLight() {
    if (systemOverride) return systemOverride === 'light';
    try {
      if (root.Android && typeof root.Android.isSystemDark === 'function') return !root.Android.isSystemDark();
    } catch (_) {}
    try { return !!(root.matchMedia && root.matchMedia('(prefers-color-scheme: light)').matches); } catch (_) { return false; }
  }
  function wantsLight() {
    var p = pref();
    return p === 'light' || (p === 'system' && systemIsLight());
  }

  function applyLight() {
    if (active) return;
    active = true;
    doc.documentElement.setAttribute('data-theme', 'light');
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = 'nurvan-theme-light';
      styleEl.textContent = LIGHT_VARS + CHROME_CSS;
    }
    (doc.head || doc.documentElement).appendChild(styleEl);
    patchCanvas();
    var run = function () {
      if (!active) return;
      themeSheets();
      if (doc.body) themeTree(doc.body);
      watch();
    };
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', run, { once: true });
    else run();
  }
  function applyDark() {
    if (!active) return;
    active = false;
    unwatch();
    restoreSheets();
    restoreElements();
    doc.documentElement.removeAttribute('data-theme');
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
  }

  function sync() { if (wantsLight()) applyLight(); else applyDark(); }

  function set(value) {
    var v = value === 'light' || value === 'system' ? value : 'dark';
    try { root.localStorage.setItem(KEY, v); } catch (_) {}
    sync();
    return v;
  }

  try {
    if (root.matchMedia) {
      var mq = root.matchMedia('(prefers-color-scheme: light)');
      var onChange = function () { if (pref() === 'system') sync(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    }
  } catch (_) {}
  // Called by the Android app when the phone switches between light and dark.
  root.nurvanSystemTheme = function (mode) {
    systemOverride = mode === 'light' ? 'light' : 'dark';
    if (pref() === 'system') sync();
  };

  root.NurvanTheme = { get: pref, set: set, isLight: function () { return active; }, lightColor: lightColor, parseColor: parseColor, mapValue: mapValue };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.NurvanTheme;
  if (doc) sync();
})(typeof window !== 'undefined' ? window : globalThis);
