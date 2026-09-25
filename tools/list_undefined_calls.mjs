// Nomi chiamati e mai definiti.
//
// showToast era chiamata in 280 punti e non esisteva; normalizeFoodRecord e
// DataProvenance idem. Ogni chiamata era protetta da `typeof X === 'function'`,
// quindi niente errori: solo codice che non faceva niente. Questo script li
// cerca tutti.
//
// Cosa si legge: la pagina costruita (web/index.html: gli script in linea e
// gli attributi on*="..." dell'HTML, anche quelli scritti dentro le stringhe
// JS che generano HTML) e i moduli che la pagina carica con <script src>.
// Cosa conta come uso: un identificatore chiamato come funzione, X(...), o
// usato come oggetto, X.qualcosa / X[...] - e non preceduto da un punto, cioe'
// non una proprieta'. Cosa conta come definito, in qualunque punto di
// qualunque file: function/class, var/let/const (anche destrutturati),
// parametri, catch, un'assegnazione X = ..., window.X / self.X /
// globalThis.X / root.X = ...; poi i globali del browser
// (tools/browser-globals.json, letti da Chromium), le interfacce che l'app
// Android inietta (addJavascriptInterface in MainActivity) e i globali degli
// script esterni che la pagina carica davvero (EXTERNAL qui sotto: ogni voce
// vale solo se il suo URL compare nella pagina).
//
// Nessun parser esterno: un tokenizer che conosce stringhe, template literal
// annidati, commenti ed espressioni regolari basta per sapere cosa e' codice.
//
//   node tools/list_undefined_calls.mjs          elenco leggibile
//   node tools/list_undefined_calls.mjs --json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const EXTERNAL = {
  Tesseract: 'cdn.jsdelivr.net/npm/tesseract.js',
  google: 'accounts.google.com/gsi/client'
};

const KEYWORDS = new Set(('break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield let static await async of get set arguments undefined NaN Infinity').split(' '));
// After these a "/" starts a regular expression, not a division.
const REGEX_AFTER_KEYWORD = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);

/* ------------------------------ tokenizer ------------------------------ */

export function tokenize(src, baseOffset = 0) {
  const toks = [];
  let i = 0;
  const n = src.length;
  const braceStack = []; // for template literals: depth at which a ${ opened
  let depth = 0;
  function push(type, value, start) { toks.push({ type, value, pos: baseOffset + start }); }
  function prevSignificant() { return toks.length ? toks[toks.length - 1] : null; }
  function regexAllowed() {
    const p = prevSignificant();
    if (!p) return true;
    if (p.type === 'num' || p.type === 'str' || p.type === 'tmpl' || p.type === 'regex') return false;
    if (p.type === 'id') return KEYWORDS.has(p.value) && (REGEX_AFTER_KEYWORD.has(p.value) || !/^(this|super|true|false|null|undefined)$/.test(p.value));
    return !(p.value === ')' || p.value === ']' || p.value === '}');
  }
  function readTemplate(start) {
    // i points just after the backtick (or after the } closing a ${...}).
    let j = i;
    while (j < n) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '`') { push('tmpl', src.slice(start, j + 1), start); i = j + 1; return; }
      if (c === '$' && src[j + 1] === '{') {
        push('tmpl', src.slice(start, j + 2), start);
        braceStack.push(depth);
        depth++;
        i = j + 2;
        return;
      }
      j++;
    }
    push('tmpl', src.slice(start), start);
    i = n;
  }
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v' || c === '\u00a0' || c === '\ufeff') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    const start = i;
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; else if (src[j] === '\n') break; j++; }
      push('str', src.slice(i, j + 1), start);
      i = j + 1;
      continue;
    }
    if (c === '`') { i++; readTemplate(start); continue; }
    if (c === '}' && braceStack.length && braceStack[braceStack.length - 1] === depth - 1) {
      braceStack.pop();
      depth--;
      i++;
      readTemplate(start);
      continue;
    }
    if (/[A-Za-z_$\u00c0-\uffff]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$\u00c0-\uffff]/.test(src[j])) j++;
      push('id', src.slice(i, j), start);
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1]))) {
      let j = i + 1;
      while (j < n && /[\w.]/.test(src[j])) j++;
      push('num', src.slice(i, j), start);
      i = j;
      continue;
    }
    if (c === '/' && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      while (j < n) {
        const d = src[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '\n') break;
        if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/i.test(src[j])) j++;
      push('regex', src.slice(i, j), start);
      i = j;
      continue;
    }
    // Punctuators: the multi-character ones that matter here.
    const three = src.slice(i, i + 3);
    const two = src.slice(i, i + 2);
    if (three === '===' || three === '!==' || three === '...' || three === '**=' || three === '>>>' || three === '<<=' || three === '>>=' || three === '&&=' || three === '||=' || three === '??=') { push('punct', three, start); i += 3; continue; }
    if (['=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>'].includes(two)) {
      // "?." followed by a digit is a ternary and a number.
      if (two === '?.' && /[0-9]/.test(src[i + 2])) { push('punct', '?', start); i += 1; continue; }
      push('punct', two, start); i += 2; continue;
    }
    if (c === '{') depth++;
    if (c === '}') depth--;
    push('punct', c, start);
    i++;
  }
  return toks;
}

/* ------------------------------ analysis ------------------------------ */

const GLOBAL_ALIASES = new Set(['window', 'self', 'globalThis', 'root', 'global']);

function matchingParen(toks, k) {
  let d = 0;
  for (let j = k; j < toks.length; j++) {
    const v = toks[j].type === 'punct' ? toks[j].value : null;
    if (v === '(' || v === '[' || v === '{') d++;
    else if (v === ')' || v === ']' || v === '}') { d--; if (d === 0) return j; }
  }
  return -1;
}

// Every name a token stream declares, wherever it is.
export function collectDeclared(toks, into) {
  const add = (name) => { if (name && !KEYWORDS.has(name)) into.add(name); };
  // The identifiers of a binding pattern (params, destructuring): the ones
  // not followed by ":" (a key) and not after "=" at depth 0 of the pattern
  // (a default value).
  function addPattern(from, to) {
    let d = 0;
    let inDefault = false;
    for (let j = from; j <= to; j++) {
      const t = toks[j];
      if (t.type === 'punct') {
        if (t.value === '(' || t.value === '[' || t.value === '{') d++;
        else if (t.value === ')' || t.value === ']' || t.value === '}') d--;
        else if (t.value === '=') inDefault = true;
        else if (t.value === ',') inDefault = false;
        continue;
      }
      if (t.type !== 'id' || inDefault) continue;
      const next = toks[j + 1];
      if (next && next.type === 'punct' && next.value === ':') continue;
      const prev = toks[j - 1];
      if (prev && prev.type === 'punct' && (prev.value === '.' || prev.value === '?.')) continue;
      add(t.value);
    }
  }
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    const next = toks[k + 1];
    const prev = toks[k - 1];
    if (t.type !== 'id') continue;
    if ((t.value === 'function' || t.value === 'class') && next && next.type === 'id') add(next.value);
    if ((t.value === 'function') ) {
      // Parameters: the paren group after "function [name]".
      let p = k + 1;
      if (toks[p] && toks[p].type === 'punct' && toks[p].value === '*') p++;
      if (toks[p] && toks[p].type === 'id') p++;
      if (toks[p] && toks[p].value === '(') { const e = matchingParen(toks, p); if (e > p) addPattern(p + 1, e - 1); }
    }
    if ((t.value === 'var' || t.value === 'let' || t.value === 'const') && next) {
      if (next.type === 'id') add(next.value);
      else if (next.value === '{' || next.value === '[') { const e = matchingParen(toks, k + 1); if (e > 0) addPattern(k + 2, e - 1); }
    }
    if (t.value === 'catch' && next && next.value === '(') { const e = matchingParen(toks, k + 1); if (e > 0) addPattern(k + 2, e - 1); }
    // name = ... (not ==, ===, =>) and not a property.
    if (next && next.type === 'punct' && next.value === '=' && !(prev && prev.type === 'punct' && (prev.value === '.' || prev.value === '?.'))) add(t.value);
    // window.X = ..., self.X = ..., root.X = ...
    if (GLOBAL_ALIASES.has(t.value) && next && next.value === '.' && toks[k + 2] && toks[k + 2].type === 'id' && toks[k + 3] && toks[k + 3].value === '=') add(toks[k + 2].value);
    // x => ...
    if (next && next.type === 'punct' && next.value === '=>') add(t.value);
  }
  // (a, b) => ... and method(a, b) { ... }: parameters too.
  for (let k = 0; k < toks.length; k++) {
    if (toks[k].type !== 'punct' || toks[k].value !== '(') continue;
    const e = matchingParen(toks, k);
    if (e < 0) continue;
    const after = toks[e + 1];
    if (after && after.type === 'punct' && (after.value === '=>' || after.value === '{')) addPattern(k + 1, e - 1);
  }
  return into;
}

// Uses: X(...) or X.something / X[...], X not a property, not a keyword,
// and not a method definition (a call whose ")" is followed by "{").
export function collectUses(toks) {
  const uses = [];
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.type !== 'id' || KEYWORDS.has(t.value)) continue;
    const prev = toks[k - 1];
    if (prev && prev.type === 'punct' && (prev.value === '.' || prev.value === '?.')) continue;
    if (prev && prev.type === 'id' && (prev.value === 'function' || prev.value === 'class' || prev.value === 'get' || prev.value === 'set' || prev.value === 'static')) continue;
    const next = toks[k + 1];
    if (!next || next.type !== 'punct') continue;
    let kind = null;
    if (next.value === '(') {
      const e = matchingParen(toks, k + 1);
      const after = e > 0 ? toks[e + 1] : null;
      if (after && after.type === 'punct' && after.value === '{') continue;
      kind = 'chiamata';
    } else if (next.value === '.' || next.value === '?.' || next.value === '[') {
      kind = 'oggetto';
      // "x[...]" right after "," or "(" can be an array index of a local: fine.
    }
    if (!kind) continue;
    // A key in an object literal: { foo: ..., bar() {} } is not a use.
    if (next.value === '(' && prev && prev.type === 'punct' && (prev.value === '{' || prev.value === ',') && isObjectMethod(toks, k)) continue;
    uses.push({ name: t.value, kind, pos: t.pos });
  }
  return uses;
}
function isObjectMethod(toks, k) {
  const e = matchingParen(toks, k + 1);
  return e > 0 && toks[e + 1] && toks[e + 1].value === '{';
}

// The handlers in HTML, static or written inside JS strings: on*="...".
export function handlerSnippets(text, baseOffset = 0) {
  const out = [];
  const re = /\bon[a-z]+\s*=\s*(\\?["'])/g;
  let m;
  while ((m = re.exec(text))) {
    const q = m[1];
    const start = m.index + m[0].length;
    const end = text.indexOf(q, start);
    if (end < 0) continue;
    out.push({ code: text.slice(start, end).replace(/\\(["'])/g, '$1').replace(/&#39;/g, "'").replace(/&quot;/g, '"'), pos: baseOffset + start });
  }
  return out;
}

function lineOf(text, pos) {
  let line = 1;
  for (let i = 0; i < pos && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

/* ------------------------------ files ------------------------------ */

function inlineScripts(html) {
  const out = [];
  const re = /<script(\b[^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;
    const type = (attrs.match(/\btype\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (type && !/javascript|module/i.test(type)) continue;
    out.push({ code: m[2], offset: m.index + m[0].indexOf('>') + 1 });
  }
  return out;
}

// opts.extra: [{ file, text }] - more code to read, for the tests.
export function analyse(opts = {}) {
  const pagePath = path.join(root, 'web', 'index.html');
  const page = fs.readFileSync(pagePath, 'utf8').replace(/\r\n/g, '\n');
  const srcs = [...page.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  const modules = srcs.filter((s) => !/^https?:/.test(s)).map((s) => 'web/' + s.replace(/^\.\//, ''));
  const vendor = new Set(['web/xlsx.full.min.js', 'web/peerjs.min.js']);

  const units = [];
  inlineScripts(page).forEach((s) => units.push({ file: 'web/index.html', text: page, toks: tokenize(s.code, s.offset) }));
  // Static HTML (outside scripts): handlers.
  const staticHtml = page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => ' '.repeat(m.length));
  modules.forEach((m) => {
    const p = path.join(root, m);
    if (!fs.existsSync(p)) return;
    const text = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
    units.push({ file: m, text, toks: tokenize(text), vendor: vendor.has(m) });
  });
  (opts.extra || []).forEach((x) => units.push({ file: x.file, text: x.text, toks: tokenize(x.text) }));

  const declared = new Set();
  units.forEach((u) => collectDeclared(u.toks, declared));
  const browser = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'browser-globals.json'), 'utf8')).names;
  browser.forEach((n) => declared.add(n));
  const java = path.join(root, 'app/src/main/java/com/giammaria/system/MainActivity.java');
  if (fs.existsSync(java)) {
    [...fs.readFileSync(java, 'utf8').matchAll(/addJavascriptInterface\([^,]+,\s*"([A-Za-z_$][\w$]*)"\)/g)].forEach((m) => declared.add(m[1]));
  }
  Object.keys(EXTERNAL).forEach((name) => { if (page.includes(EXTERNAL[name])) declared.add(name); });

  // typeof X anywhere: the call is guarded (no crash), still dead.
  const guarded = new Set();
  units.forEach((u) => u.toks.forEach((t, k) => { if (t.type === 'id' && t.value === 'typeof' && u.toks[k + 1] && u.toks[k + 1].type === 'id') guarded.add(u.toks[k + 1].value); }));

  const findings = [];
  function report(file, text, name, kind, pos, via) {
    if (declared.has(name)) return;
    findings.push({ name, kind, file, line: lineOf(text, pos), guarded: guarded.has(name), via: via || null });
  }
  units.forEach((u) => {
    if (u.vendor) return;
    collectUses(u.toks).forEach((use) => report(u.file, u.text, use.name, use.kind, use.pos));
    // Handlers written inside strings and templates.
    u.toks.forEach((t) => {
      if (t.type !== 'str' && t.type !== 'tmpl') return;
      handlerSnippets(t.value, t.pos).forEach((h) => {
        collectUses(tokenize(h.code)).forEach((use) => report(u.file, u.text, use.name, use.kind, h.pos, 'on*="…"'));
      });
    });
  });
  handlerSnippets(staticHtml).forEach((h) => {
    collectUses(tokenize(h.code)).forEach((use) => report('web/index.html', page, use.name, use.kind, h.pos, 'on*="…"'));
  });

  // Where the built page's line comes from: the first source file holding it.
  const sources = ['web/index.base.html'].concat(fs.readdirSync(root).filter((f) => /^prepare_task20_.*\.mjs$/.test(f)), ['web/coach-practice-ui.js']);
  const sourceText = {};
  sources.forEach((f) => { try { sourceText[f] = fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n').split('\n'); } catch (_) {} });
  const pageLines = page.split('\n');
  findings.forEach((f) => {
    if (f.file !== 'web/index.html') return;
    const line = (pageLines[f.line - 1] || '').trim();
    if (!line) return;
    for (const s of sources) {
      const lines = sourceText[s];
      if (!lines) continue;
      const idx = lines.findIndex((l) => l.trim() === line);
      if (idx >= 0) { f.source = s + ':' + (idx + 1); break; }
    }
  });
  return findings;
}

const direct = /list_undefined_calls\.mjs$/.test(String(process.argv[1] || '').replace(/\\/g, '/'));
if (direct) {
  const findings = analyse();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(findings, null, 1));
  } else {
    const byName = {};
    findings.forEach((f) => { (byName[f.name] = byName[f.name] || []).push(f); });
    const names = Object.keys(byName).sort((a, b) => byName[b].length - byName[a].length || a.localeCompare(b));
    console.log('Nomi usati e mai definiti: ' + names.length + ' (' + findings.length + ' punti)');
    names.forEach((n) => {
      const list = byName[n];
      console.log('\n' + n + ' — ' + list.length + ' punt' + (list.length === 1 ? 'o' : 'i') + (list[0].guarded ? ' · protetto da typeof' : ' · NON protetto'));
      list.forEach((f) => console.log('   ' + (f.source || (f.file + ':' + f.line)) + '  [' + f.kind + (f.via ? ', ' + f.via : '') + ']'));
    });
  }
  process.exitCode = findings.length ? 1 : 0;
}
export default analyse;
