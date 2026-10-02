/*
 * The app is written in Italian. In any other language this layer rewrites
 * what the page shows: every text and every placeholder/title that enters
 * the page is looked up in web/i18n/<lang>.json (Italian text -> translation)
 * and replaced. Nothing in the screens has to know about languages.
 *
 * Texts with a value inside are stored with numbered holes
 * ("circa {0} s rimanenti" -> "about {0} s left") and matched as patterns.
 * The list of texts comes from tools/i18n_extract.mjs; test_i18n_coverage.mjs
 * checks that every language has all of them.
 *
 * What the user wrote (inputs, chat messages, names) is left alone: fields
 * are never touched and any element with data-notr is skipped.
 */
(function () {
  'use strict';
  var SOURCE = 'it';
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var lang = SOURCE;
  var dict = null;        // exact texts
  var lower = null;       // the same, lowercase -> key
  var patterns = null;    // word -> [pattern]
  var cache = new Map();
  var textState = new WeakMap(); // text node -> { src, out }
  var attrState = new WeakMap(); // element -> { attr: { src, out } }
  var observer = null;
  var loading = {};

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function squash(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  var LETTER = 'A-Za-zÀ-ÿ';
  function compile(d) {
    dict = d; lower = {}; patterns = {}; cache = new Map();
    var extra = {};
    Object.keys(d).forEach(function (key) {
      if (!/\{\d+\}/.test(key)) { var lk = key.toLowerCase(); if (!(lk in lower)) lower[lk] = key; return; }
      var order = [];
      var pieces = key.split(/\{(\d+)\}/);
      var re = '';
      var word = '';
      for (var i = 0; i < pieces.length; i++) {
        if (i % 2) {
          order.push(Number(pieces[i]));
          // A value glued to a word ("aliment{1}", "serie{3}"): either a
          // grammatical ending or something that starts with a symbol — never
          // the rest of a longer word ("rip" must not match "ripetizioni").
          var glued = new RegExp('[' + LETTER + ']$').test(pieces[i - 1] || '');
          re += glued ? '([^' + LETTER + '][\\s\\S]*?|[a-zà-ÿ]{1,2})' : '([\\s\\S]+?)';
          continue;
        }
        re += escapeRe(pieces[i]).replace(/ /g, '\\s+');
        // The word the pattern is filed under: a whole one, not glued to a hole.
        var ws = pieces[i].match(/[A-Za-zÀ-ÿ]+/g) || [];
        if (i > 0 && /^[A-Za-zÀ-ÿ]/.test(pieces[i])) ws.shift();
        if (i < pieces.length - 1 && /[A-Za-zÀ-ÿ]$/.test(pieces[i])) ws.pop();
        ws.forEach(function (w) { if (w.length >= 2 && w.length > word.length) word = w; });
      }
      word = word ? word.toLowerCase() : '*';
      (patterns[word] || (patterns[word] = [])).push({ re: new RegExp('^' + re + '$'), order: order, out: d[key], weight: key.replace(/\{\d+\}/g, '').length });
      // A value at the start or at the end may be missing altogether
      // ("ANNULLA ULTIMA MODIFICA{0}" with nothing to add): the same text
      // without that hole.
      var k2 = key, o2 = String(d[key]), hole, guard = 0;
      var without = function (out, n) { return out.replace(new RegExp('\\s*\\{' + n + '\\}\\s*'), function (m) { return /^\s/.test(m) && /\s$/.test(m) ? ' ' : ''; }).trim(); };
      var note = function () { if (k2 && !/\{\d+\}/.test(k2) && /[A-Za-zÀ-ÿ]{2,}/.test(k2) && !(k2 in d) && !(k2 in extra)) extra[k2] = o2; };
      // ...at the end (one or more), then at the start as well.
      while ((hole = /\s*\{(\d+)\}$/.exec(k2)) && guard++ < 6) { k2 = k2.slice(0, hole.index); o2 = without(o2, hole[1]); note(); }
      while ((hole = /^\{(\d+)\}\s*/.exec(k2)) && guard++ < 12) { k2 = k2.slice(hole[0].length); o2 = without(o2, hole[1]); note(); }
      // ...or only at the start.
      k2 = key; o2 = String(d[key]); guard = 0;
      while ((hole = /^\{(\d+)\}\s*/.exec(k2)) && guard++ < 6) { k2 = k2.slice(hole[0].length); o2 = without(o2, hole[1]); note(); }
    });
    Object.keys(extra).forEach(function (k) { dict[k] = extra[k]; var lk = k.toLowerCase(); if (!(lk in lower)) lower[lk] = k; });
    Object.keys(patterns).forEach(function (w) { patterns[w].sort(function (a, b) { return b.weight - a.weight; }); });
  }

  function exact(core) {
    if (Object.prototype.hasOwnProperty.call(dict, core)) return dict[core];
    var key = lower[core.toLowerCase()];
    if (key == null) return null;
    var out = dict[key];
    // Same words, different case: follow the case of what is on screen.
    if (core === core.toUpperCase() && core !== core.toLowerCase()) return out.toUpperCase();
    if (/^[A-ZÀ-Ý]/.test(core)) return out.charAt(0).toUpperCase() + out.slice(1);
    return out;
  }
  // A value is a number, a name, a short phrase: when what would fill a hole
  // is a whole sentence, the pattern only happened to share a word with it.
  function plausible(p, m, core) {
    if (p.weight * 2 >= core.length) return true;
    for (var i = 1; i < m.length; i++) {
      var v = m[i] || '';
      // A long value is fine when it is itself one of our texts.
      if ((v.length > 70 || v.split(/\s+/).length > 6) && core1(squash(v), 2) == null) return false;
    }
    return true;
  }
  function byPattern(core, depth) {
    var words = core.toLowerCase().match(/[a-zà-ÿ]{2,}/g);
    if (!words) return null;
    words.push('*');
    var seen = {};
    var best = null;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (seen[w]) continue; seen[w] = 1;
      var list = patterns[w];
      if (!list) continue;
      for (var j = 0; j < list.length; j++) {
        var p = list[j];
        if (best && p.weight <= best.p.weight) break;
        var m = p.re.exec(core);
        if (m && plausible(p, m, core)) { best = { p: p, m: m }; break; }
      }
    }
    if (!best) return null;
    var vals = {};
    best.p.order.forEach(function (n, idx) { vals[n] = best.m[idx + 1]; });
    return best.p.out.replace(/\{(\d+)\}/g, function (_, n) {
      var v = vals[n] == null ? '' : vals[n];
      // An Italian ending ("giorn" + "i") means nothing in another language.
      if (/^[a-zà-ÿ]{1,2}$/.test(v)) return '';
      if (depth < 2 && /[A-Za-zÀ-ÿ]{2,}/.test(v)) { var t = core1(squash(v), depth + 1); if (t != null) return t; }
      return v;
    });
  }
  // A text put together from pieces ("Fatica bassa · Dati insufficienti",
  // "Sedentario (lavoro seduto)", "Esercizi usati: Panca, Squat"): each
  // piece on its own. A piece that is a phrase and has no translation means
  // the text is not ours to take apart: it stays whole, in one language.
  var SEP = /( · | • | — | – | \| | \/ |: | \(|\)|, |; )/;
  function byParts(core) {
    var parts = core.split(SEP);
    if (parts.length < 3) return null;
    var changed = false;
    var one = function (text, colon) {
      var lead = /^\s*/.exec(text)[0], tail = /\s*$/.exec(text)[0];
      var mid = text.slice(lead.length, text.length - tail.length);
      if (!mid) return null;
      // "Esercizi usati:" is stored with its colon.
      var t = colon ? core1(mid + ':', 2) : null;
      if (t != null) return lead + t.replace(/:$/, '') + tail;
      t = core1(mid, 2);
      return t == null ? null : lead + t + tail;
    };
    for (var i = 0; i < parts.length; i += 2) {
      if (!parts[i] || !/[A-Za-zÀ-ÿ]{2,}/.test(parts[i])) continue;
      // The longest run of pieces that is a known text ("lavoro seduto, poco movimento").
      var done = false;
      for (var e = Math.min(parts.length - 1, i + 8); e >= i && !done; e -= 2) {
        if (e === 0 && parts.length - 1 === 0) break;
        if (i === 0 && e === parts.length - 1) continue; // the whole text was already tried
        var t = one(parts.slice(i, e + 1).join(''), parts[e + 1] === ': ');
        if (t != null) { parts.splice(i, e - i + 1, t); changed = true; done = true; }
      }
      if (!done && parts[i].trim().split(/\s+/).length > 3) return null;
    }
    return changed ? parts.join('') : null;
  }
  // "Salva:" / "✓ Salvato" / "• Testo." — the text between symbols.
  function bySymbols(core) {
    var lead = /^[^A-Za-zÀ-ÿ0-9{]+/.exec(core), tail = /[^A-Za-zÀ-ÿ0-9})%]+$/.exec(core);
    var a = lead ? lead[0] : '', b = tail ? tail[0] : '';
    var tries = [];
    if (a) tries.push([a, core.slice(a.length), '']);
    if (b) tries.push(['', core.slice(0, core.length - b.length), b]);
    if (a && b && a.length + b.length < core.length) tries.push([a, core.slice(a.length, core.length - b.length), b]);
    for (var i = 0; i < tries.length; i++) {
      var mid = tries[i][1] ? exact(tries[i][1]) : null;
      if (mid != null) return tries[i][0] + mid + tries[i][2];
    }
    return null;
  }
  // Several known sentences in a row (a description put together from
  // parts): one by one, and only when every one of them is known.
  function bySentences(core) {
    var list = (core.match(/[^.!?…]+[.!?…]+(?=\s|$)|[^.!?…]+$/g) || []).map(squash).filter(Boolean);
    if (list.length < 2) return null;
    var out = [];
    for (var i = 0; i < list.length;) {
      // The longest run of sentences that is one known text.
      var found = null, e;
      for (e = list.length - 1; e >= i && found == null; e--) {
        if (i === 0 && e === list.length - 1) continue; // the whole text was already tried
        var s = list.slice(i, e + 1).join(' ');
        found = /[A-Za-zÀ-ÿ]{2,}/.test(s) ? core1(s, 2) : s;
        if (found != null) { out.push(found); i = e + 1; }
      }
      if (found == null) return null;
    }
    return out.join(' ');
  }
  // One text without line breaks around it.
  function core1(core, depth) {
    if (!core) return null;
    depth = depth || 0;
    if (cache.has(core)) { var hit = cache.get(core); if (hit != null || !depth) return hit; }
    var out = exact(core);
    if (out == null) out = bySymbols(core);
    if (out == null) out = byPattern(core, depth);
    if (out == null && depth < 2) out = byParts(core);
    if (out == null && !depth) out = bySentences(core);
    if (cache.size > 6000) cache = new Map();
    if (!depth) cache.set(core, out);
    return out;
  }
  // Any text: the spacing around it stays, lines are translated one by one
  // when the whole is not known.
  function tr(text) {
    if (!dict || text == null) return text;
    var s = String(text);
    if (!/[A-Za-zÀ-ÿ]{2,}/.test(s)) return s;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    var out = core1(squash(m[2]), 0);
    if (out != null) return m[1] + out + m[3];
    if (m[2].indexOf('\n') !== -1) {
      return m[1] + m[2].split('\n').map(function (line) {
        var lm = /^(\s*)([\s\S]*?)(\s*)$/.exec(line);
        var lo = core1(squash(lm[2]), 0);
        return lo == null ? line : lm[1] + lo + lm[3];
      }).join('\n') + m[3];
    }
    return s;
  }

  function skipped(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      var tag = n.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'NOSCRIPT' || tag === 'CODE') return true;
      if (n.hasAttribute('data-notr') || n.isContentEditable) return true;
    }
    return false;
  }
  function doText(node) {
    var cur = node.nodeValue;
    var st = textState.get(node);
    var src = (st && st.out === cur) ? st.src : cur;
    if (!src || !/[A-Za-zÀ-ÿ]{2,}/.test(src)) return;
    var out = dict ? tr(src) : src;
    if (out !== cur) node.nodeValue = out;
    textState.set(node, { src: src, out: out });
  }
  function doAttrs(el) {
    var st = attrState.get(el);
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var cur = el.getAttribute(a);
      var rec = st && st[a];
      var src = (rec && rec.out === cur) ? rec.src : cur;
      if (!src || !/[A-Za-zÀ-ÿ]{2,}/.test(src)) continue;
      var out = dict ? tr(src) : src;
      if (out !== cur) el.setAttribute(a, out);
      if (!st) { st = {}; attrState.set(el, st); }
      st[a] = { src: src, out: out };
    }
    if (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type || '') && el.value) {
      var v = tr(el.value); if (v !== el.value) el.value = v;
    }
  }
  function sweep(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (root.parentNode && !skipped(root.parentNode)) doText(root); return; }
    if (root.nodeType !== 1) return;
    if (root.tagName === 'TEXTAREA') { if (!root.hasAttribute('data-notr')) doAttrs(root); return; }
    if (skipped(root)) return;
    doAttrs(root);
    var walker = document.createTreeWalker(root, 5 /* elements + text */, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          var tag = n.tagName;
          if (tag === 'TEXTAREA') { if (!n.hasAttribute('data-notr')) doAttrs(n); return 2; }
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'CODE' || n.hasAttribute('data-notr') || n.isContentEditable) return 2; // reject with its subtree
        }
        return 1;
      }
    });
    var n;
    while ((n = walker.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function watch() {
    if (observer || typeof MutationObserver === 'undefined') return;
    observer = new MutationObserver(function (list) {
      if (!dict) return;
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) sweep(m.addedNodes[j]); }
        else if (m.type === 'characterData') { if (m.target.parentNode && !skipped(m.target.parentNode)) doText(m.target); }
        else if (m.type === 'attributes') { if (m.target.tagName === 'TEXTAREA' ? !m.target.hasAttribute('data-notr') : !skipped(m.target)) doAttrs(m.target); }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function sweepAll() {
    if (document.body) sweep(document.body);
    if (document.title) { var t = tr(document.title); if (t !== document.title) document.title = t; }
  }

  function base() {
    try { var s = document.currentScript || document.querySelector('script[src*="i18n-runtime"]'); if (s && s.src) return s.src.replace(/i18n-runtime\.js.*$/, ''); } catch (_) {}
    return '';
  }
  var BASE = base();
  function fetchPack(l) {
    if (loading[l]) return loading[l];
    loading[l] = fetch((window.__NURVAN_LANG ? '/' : BASE) + 'i18n/' + l + '.json').then(function (r) {
      if (!r.ok) throw new Error('i18n ' + l + ': ' + r.status);
      return r.json();
    }).catch(function (e) { delete loading[l]; throw e; });
    return loading[l];
  }
  function setLang(l) {
    l = String(l || SOURCE);
    lang = l;
    if (l === SOURCE) { dict = null; cache = new Map(); sweepAll(); return Promise.resolve(); }
    return fetchPack(l).then(function (d) {
      if (lang !== l) return;
      compile(d);
      watch();
      sweepAll();
    }).catch(function (e) { try { console.warn('[I18N]', e && e.message); } catch (_) {} });
  }

  // Native dialogs show text too.
  ['alert', 'confirm', 'prompt'].forEach(function (name) {
    var native = window[name];
    if (typeof native !== 'function') return;
    window[name] = function (msg) {
      var args = Array.prototype.slice.call(arguments);
      if (dict && typeof msg === 'string') args[0] = tr(msg);
      return native.apply(window, args);
    };
  });

  // Text drawn on a canvas (the share card, chart labels) never enters the page.
  try {
    var C2D = window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype;
    if (C2D) ['fillText', 'strokeText', 'measureText'].forEach(function (name) {
      var native = C2D[name];
      if (typeof native !== 'function') return;
      C2D[name] = function (text) {
        if (dict && typeof text === 'string') { var args = Array.prototype.slice.call(arguments); args[0] = tr(text); return native.apply(this, args); }
        return native.apply(this, arguments);
      };
    });
  } catch (_) {}

  window.NurvanI18n = {
    tr: tr,
    setLang: setLang,
    lang: function () { return lang; },
    ready: function () { return lang === SOURCE || !!dict; },
    // The locale for dates and numbers.
    locale: function () {
      var map = { it: 'it-IT', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR', ru: 'ru-RU', zh: 'zh-CN', ar: 'ar', hi: 'hi-IN' };
      return map[lang] || 'it-IT';
    },
    // For tests and the coverage audit: a dictionary given directly.
    _use: function (l, d) { lang = l; compile(d); watch(); sweepAll(); }
  };
  window.tr = tr;
  window.appLocale = window.NurvanI18n.locale;

  // No choice made yet: the language of the device, when the app has it.
  var OFFERED = ['it', 'en', 'es', 'fr', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];
  var saved = null;
  // A page served already in one language (the legal pages) says which.
  if (window.__NURVAN_LANG && OFFERED.indexOf(window.__NURVAN_LANG) !== -1) saved = window.__NURVAN_LANG;
  else try { saved = localStorage.getItem('GS_LANG'); } catch (_) {}
  if (!saved) {
    var nav = [];
    try { nav = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']); } catch (_) {}
    for (var li = 0; li < nav.length && !saved; li++) { var code = String(nav[li] || '').slice(0, 2).toLowerCase(); if (OFFERED.indexOf(code) !== -1) saved = code; }
    saved = saved || SOURCE;
    if (!window.__NURVAN_LANG) try { localStorage.setItem('GS_LANG', saved); } catch (_) {}
  }
  if (saved !== SOURCE) {
    setLang(saved);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { if (dict) sweepAll(); });
  }
})();
