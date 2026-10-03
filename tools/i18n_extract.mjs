// Every text the app can show, read from the code: the Italian written in
// the pages and scripts is the source, and web/i18n/<lang>.json translates
// it (web/i18n-runtime.js applies the translation to the page). This tool
// lists those texts into i18n/strings.json; test_i18n_coverage.mjs checks
// that every language has all of them.
//
//   node tools/i18n_extract.mjs            write i18n/strings.json
//   node tools/i18n_extract.mjs --stats    counts only
//
// A text with a value inside ("circa 12 s rimanenti") is one entry with
// numbered holes: "circa {0} s rimanenti".
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const PH = '\u0001';   // a value
const CUT = '\u0002';  // markup: the text stops here

const SKIP_FILES = /(\.min\.js|youtube-links\.js|features\.js|sw\.js|i18n-runtime\.js|wellbeing-refs\.js)$/;

// Calls whose text arguments are never shown.
const SKIP_CALLS = new Set(['getElementById', '$', 'querySelector', 'querySelectorAll', 'addEventListener', 'removeEventListener',
  'getItem', 'setItem', 'removeItem', 'includes', 'indexOf', 'lastIndexOf', 'startsWith', 'endsWith', 'split', 'replace', 'replaceAll',
  'match', 'test', 'search', 'getAttribute', 'setAttribute', 'removeAttribute', 'hasAttribute', 'createElement', 'createElementNS',
  'navigate', 'closest', 'matches', 'log', 'warn', 'error', 'debug', 'info', 'trace', 'add', 'remove', 'toggle', 'contains', 't',
  'require', 'postMessage', 'dispatchEvent', 'Event', 'CustomEvent', 'RegExp', 'getContext', 'toLocaleDateString', 'toLocaleString',
  'toLocaleTimeString', 'padStart', 'padEnd', 'localeCompare', 'has', 'get', 'delete', 'capacitorPlugin', 'planCan', 'requirePlan',
  'fetch', 'open', 'append', 'encodeURIComponent', 'transaction', 'objectStore', 'createObjectStore', 'setProperty', 'track',
  'coachEndpoint', 'accountRequest', 'pushUiOverlay', 'popUiOverlay', 'normalize', 'charAt', 'slice', 'join']);
const SKIP_ASSIGN_PROPS = new Set(['className', 'id', 'type', 'cssText', 'display', 'src', 'href', 'name', 'method', 'mode', 'rel',
  'target', 'accept', 'inputMode', 'autocomplete', 'role', 'lang', 'dir', 'htmlFor', 'key', 'kind', 'status', 'font', 'fillStyle',
  'strokeStyle', 'textAlign', 'textBaseline', 'lineCap', 'lineJoin', 'position', 'overflow', 'transform', 'transition']);
const HTML_FN = /(html|render|icon|badge|btn|button|card|row|chip|svg|sheet|markup|slot|bar|pill|tag|block|section|list|grid|panel|view|tile|banner|thumb|media|chart|table|cell|line|item|label|dot|avatar)/i;

function isStr(n) { return n && n.type === 'Literal' && typeof n.value === 'string'; }
function isTpl(n) { return n && n.type === 'TemplateLiteral'; }
function hasString(n) {
  if (isStr(n) || isTpl(n)) return true;
  return n && n.type === 'BinaryExpression' && n.operator === '+' && (hasString(n.left) || hasString(n.right));
}
function isChain(n) { return isStr(n) || isTpl(n) || (n && n.type === 'BinaryExpression' && n.operator === '+' && hasString(n)); }

// Does this expression produce markup? Then the text around it is two
// separate texts in the page, not one with a hole.
function yieldsMarkup(n, depth) {
  if (!n || depth > 6) return false;
  switch (n.type) {
    case 'Literal': return typeof n.value === 'string' && /<[a-zA-Z/]/.test(n.value);
    case 'TemplateLiteral': return n.quasis.some((q) => /<[a-zA-Z/]/.test(q.value.cooked || '')) || n.expressions.some((e) => yieldsMarkup(e, depth + 1));
    case 'BinaryExpression': return n.operator === '+' && (yieldsMarkup(n.left, depth + 1) || yieldsMarkup(n.right, depth + 1));
    case 'ConditionalExpression': return yieldsMarkup(n.consequent, depth + 1) || yieldsMarkup(n.alternate, depth + 1);
    case 'LogicalExpression': return yieldsMarkup(n.left, depth + 1) || yieldsMarkup(n.right, depth + 1);
    case 'CallExpression': {
      const c = n.callee;
      const name = c.type === 'Identifier' ? c.name : (c.type === 'MemberExpression' && c.property && c.property.name) || '';
      if (name === 'join') return true;
      if (/^(esc|escapeHtml|String|Number|Math|t|fmt\w*|format\w*|round\w*|parse\w*|encodeURIComponent)$/.test(name)) return false;
      return HTML_FN.test(name);
    }
    case 'Identifier': return HTML_FN.test(n.name);
    case 'MemberExpression': return false;
    default: return false;
  }
}

function flatten(n, holes) {
  if (isStr(n)) return n.value;
  if (isTpl(n)) {
    let out = '';
    n.quasis.forEach((q, i) => {
      out += q.value.cooked || '';
      if (i < n.expressions.length) out += flattenPart(n.expressions[i], holes);
    });
    return out;
  }
  if (n.type === 'BinaryExpression' && n.operator === '+' && hasString(n)) return flattenPart(n.left, holes) + flattenPart(n.right, holes);
  return flattenPart(n, holes);
}
function flattenPart(n, holes) {
  if (isChain(n)) return flatten(n, holes);
  holes.push(n);
  return yieldsMarkup(n, 0) ? CUT : PH;
}

function calleeName(call) {
  const c = call.callee;
  if (!c) return '';
  if (c.type === 'Identifier') return c.name;
  if (c.type === 'MemberExpression' && c.property) return c.property.name || '';
  return '';
}
function excluded(node, parent, key) {
  if (!parent) return false;
  switch (parent.type) {
    case 'Property': return key === 'key' && !parent.computed;
    case 'MemberExpression': return key === 'property';
    case 'BinaryExpression': return ['==', '===', '!=', '!==', 'in', 'instanceof', '<', '>', '<=', '>='].includes(parent.operator);
    case 'SwitchCase': return key === 'test';
    case 'ImportDeclaration': case 'ExportNamedDeclaration': case 'ExportAllDeclaration': case 'ImportExpression': return true;
    case 'CallExpression': case 'NewExpression': {
      if (key === 'callee') return false;
      const name = calleeName(parent);
      // el.setAttribute('title', '...') is text; any other attribute is not.
      if (name === 'setAttribute' && parent.arguments[1] === node && isStr(parent.arguments[0]) && /^(title|placeholder|aria-label|alt)$/.test(parent.arguments[0].value)) return false;
      if (SKIP_CALLS.has(name)) return true;
      const obj = parent.callee && parent.callee.type === 'MemberExpression' && parent.callee.object;
      if (obj && obj.type === 'Identifier' && /^(console|localStorage|sessionStorage|classList|JSON|Object|Math)$/.test(obj.name)) return true;
      return false;
    }
    case 'AssignmentExpression': {
      const l = parent.left;
      if (key === 'right' && l && l.type === 'MemberExpression' && l.property && SKIP_ASSIGN_PROPS.has(l.property.name)) return true;
      return false;
    }
    case 'UnaryExpression': return parent.operator === 'typeof';
    default: return false;
  }
}

const found = new Map(); // key -> Set(files)
let container = '';
// Tables that are not interface text: brand and drug names, the food table
// (it has its own names per language), the dictionaries of I18nService,
// lists of synonyms used to recognise what the user wrote.
const SKIP_CONTAINERS = /^(SUPPLEMENT_CATALOG|FOOD_CATALOG|DRUG_CATALOG|T|SAME_AS|self[.]WEB_EXERCISE_NAME_LINKS|LANG_META)([.]|$)|^(packs|I18nService)([.](?!it$)|$)/;
const byContainer = {};
function add(text, file) {
  // Numbered holes; the runtime fills them back.
  let i = 0;
  let key = text.replace(/\s+/g, ' ').trim();
  if (!key) return;
  // Holes at the edges with nothing but spacing or punctuation between them and the text are kept: they carry order.
  key = key.replace(new RegExp(PH, 'g'), () => '{' + (i++) + '}');
  if (!worth(key)) return;
  if (SKIP_CONTAINERS.test(container)) return;
  if (container) byContainer[container] = (byContainer[container] || 0) + 1;
  if (!found.has(key)) found.set(key, new Set());
  found.get(key).add(file);
}
function decodeEntities(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&rsquo;/g, '’').replace(/&hellip;/g, '…').replace(/&middot;/g, '·').replace(/&times;/g, '×')
    .replace(/&egrave;/g, 'è').replace(/&agrave;/g, 'à').replace(/&ugrave;/g, 'ù').replace(/&ograve;/g, 'ò').replace(/&igrave;/g, 'ì').replace(/&eacute;/g, 'é')
    .replace(/&rarr;/g, '→').replace(/&larr;/g, '←').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&euro;/g, '€');
}
const STOP = new Set(['kg', 'lb', 'cm', 'kcal', 'RIR', 'RPE', 'OK', 'AI', 'PDF', 'CSV', 'JSON', 'NURVAN', 'Nurvan', 'Nurvan AI', 'NURVAN AI',
  'Google', 'Apple', 'YouTube', 'iPhone', 'Android', 'iOS', 'min', 'sec', 'RM', '1RM', 'BMI', 'TDEE', 'BMR', 'px', 'null', 'undefined',
  'true', 'false', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'Bearer', 'UTF-8', 'Content-Type', 'Authorization', 'Arial', 'Inter']);
function worth(key) {
  const bare = key.replace(/\{\d+\}/g, ' ').trim();
  if (!/[A-Za-zÀ-ÿ]{2,}/.test(bare)) return false;
  if (STOP.has(bare)) return false;
  if (/^(active|checked|disabled|selected|open|hidden|show|endstream|endobj|readonly|required)$/.test(bare)) return false;
  if (bare.length > 1200) return false;
  // Code, addresses, styles, selectors.
  if (/^(https?:|\/|#|\.\w|data:|blob:|\w+:\/\/)/.test(bare)) return false;
  if (/[{}]|=>|\bfunction\b|\breturn\b|;\s*\w+\s*:|:\s*\d+px|rgba?\(|var\(--|^\w+\(|\)\s*;|&&|\|\||===|^\s*@|\\[dws]/.test(bare)) return false;
  if (/^[\w-]+:[^ ]*;|^\d+px /.test(bare)) return false;
  if (/^[\w-]+\.(js|mjs|json|png|jpg|webp|svg|html|css|pdf|csv|xlsx?|docx?)$/i.test(bare)) return false;
  if (/^[a-z0-9_.-]+@[a-z0-9.-]+$/i.test(bare)) return false;
  return true;
}
// One whole string that is not markup: is it something a person reads?
function plainWorth(s) {
  const bare = s.replace(new RegExp(PH, 'g'), ' ').trim();
  if (!bare) return false;
  const words = bare.split(/\s+/);
  if (words.length === 1) {
    // One word: only when it looks like a label ("Salva", "CHIUDI"), not an identifier.
    if (/^[A-ZÀ-Ý][a-zà-ÿ]{2,}[.:!?…]*$/.test(bare) || /^[A-ZÀ-Ý]{3,}[.:!?…]*$/.test(bare)) return true;
    // "3 serie": a lowercase word next to a value.
    return s.indexOf(PH) !== -1 && /^[a-zà-ÿ]{3,}[.:!?…]*$/.test(bare);
  }
  if (/^[a-z][a-zA-Z0-9]*([_-][a-zA-Z0-9]+)+$/.test(bare)) return false;
  if (/[_<>\\]|\S=|=\S|^\s*[\[(]/.test(bare)) return false;
  if (!/[a-zà-ÿ]{2,}/.test(bare) && !/[A-ZÀ-Ý]{3,}/.test(bare)) return false;
  // Lowercase start with no value inside: a matching keyword more often than a label.
  if (/^[a-zà-ÿ]/.test(bare) && s.indexOf(PH) === -1 && !/[.!?…:]$/.test(bare) && words.length < 4) return false;
  return true;
}

const ATTR_RE = /\b(placeholder|title|aria-label|alt|data-tip|label)\s*=\s*(?:"([^"]*)"|'([^']*)'|\\"([^"\\]*)\\"|\\'([^'\\]*)\\')/g;
function harvestMarkup(text, file) {
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(text))) {
    const v = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] != null ? m[4] : m[5];
    if (v && v.indexOf(CUT) === -1) add(decodeEntities(v), file);
  }
  let body = text
    .replace(/<script\b[\s\S]*?(<\/script>|$)/gi, CUT)
    .replace(/<style\b[\s\S]*?(<\/style>|$)/gi, CUT)
    .replace(/<!--[\s\S]*?-->/g, CUT)
    .replace(/<[a-zA-Z/!][^<>]*>/g, CUT);
  // A string that starts or ends inside a tag.
  body = body.replace(/^[^<>]*>/, (s) => (/[="]|\bstyle\b|\bclass\b/.test(s) ? CUT : s)).replace(/<[a-zA-Z/][^<>]*$/, CUT);
  body.split(CUT).forEach((run) => {
    const r = decodeEntities(run);
    if (/^\s*[\w-]+\s*=\s*["']?/.test(r) || /["']\s*[\w-]+\s*=\s*["']?\s*$/.test(r)) return; // attribute leftovers
    if (/[<>]/.test(r)) return;
    add(r, file);
  });
}
function harvest(text, file) {
  if (!/[A-Za-zÀ-ÿ]{2,}/.test(text)) return;
  // The Italian dictionary of I18nService: every entry is a label, whatever it looks like.
  if (/^(packs|I18nService)[.]it$/.test(container) && text.indexOf('<') === -1) { add(text, file); return; }
  if (/<[a-zA-Z/][^<>]*>|<[a-zA-Z]+\s[^<>]*$|^[^<]*>/.test(text) && /[<>]/.test(text)) { harvestMarkup(text, file); return; }
  // A piece written to be glued to something (" sett. di scheda"): the
  // page shows it after a value, so it is a text with a hole on that side.
  const glue = (p) => {
    if (!/[A-Za-zÀ-ÿ]{2,}/.test(p)) return p;
    if (/^\s/.test(p) && p.trimStart()[0] !== PH) p = PH + p;
    if (/[A-Za-zÀ-ÿ:]\s$/.test(p)) p = p + PH;
    return p;
  };
  if (text.indexOf(CUT) !== -1) { text.split(CUT).forEach((p) => { p = glue(p); if (plainWorth(p)) add(p, file); }); return; }
  text = glue(text);
  if (plainWorth(text)) add(text, file);
}

function walk(node, parent, key, file) {
  if (!node || typeof node.type !== 'string') return;
  if (isChain(node)) {
    const holes = [];
    const text = flatten(node, holes);
    if (!excluded(node, parent, key) && !(node.type === 'TemplateLiteral' && parent && parent.type === 'TaggedTemplateExpression')) harvest(text, file);
    holes.forEach((h) => walk(h, node, 'hole', file));
    return;
  }
  const prev = container;
  const big = (v) => v && ((v.type === 'ArrayExpression' && v.elements.length > 20) || (v.type === 'ObjectExpression' && v.properties.length > 20));
  if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init && (big(node.init) || /^(Object|Array)Expression$/.test(node.init.type))) container = node.id.name;
  else if (node.type === 'Property' && !node.computed && big(node.value)) container = (prev ? prev + '.' : '') + (node.key.name || node.key.value);
  else if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && /^(Object|Array)Expression$/.test(node.right.type)) container = (node.left.object.name || '?') + '.' + (node.left.property.name || '?');
  try {
  for (const k of Object.keys(node)) {
    if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => { if (c && typeof c.type === 'string') walk(c, node, k, file); });
    else if (v && typeof v.type === 'string') walk(v, node, k, file);
  }
  } finally { container = prev; }
}

function parseJs(code, file) {
  let ast;
  try { ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }); }
  catch (e1) {
    try { ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' }); }
    catch (e2) { console.warn('[i18n] not parsed: ' + file + ' — ' + e1.message); return; }
  }
  walk(ast, null, null, file);
}

function run() {
  const web = path.join(ROOT, 'web');
  const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
  let rest = '';
  let last = 0;
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m; let n = 0;
  while ((m = re.exec(html))) {
    rest += html.slice(last, m.index) + CUT;
    last = re.lastIndex;
    if (/\bsrc=/.test(m[1])) continue;
    parseJs(m[2], 'index.html#' + (++n));
  }
  rest += html.slice(last);
  harvestMarkup(rest, 'index.html');
  // Inline handlers of the static page hold texts too (confirm('...')).
  const files = [];
  (function list(dir, rel) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      if (f.isDirectory()) { if (!/^(media|i18n|coach-os)$/.test(f.name)) list(path.join(dir, f.name), rel + f.name + '/'); continue; }
      if (/\.js$/.test(f.name) && !SKIP_FILES.test(f.name)) files.push(rel + f.name);
    }
  })(web, '');
  files.forEach((f) => parseJs(fs.readFileSync(path.join(web, f), 'utf8'), f));
  // Data files: only the fields a person reads.
  const JSON_FIELDS = {
    'features.json': /^(tagline|label|unit)$/,
    'exam-request-catalog.json': /^(label|name)$/,
    'allergen-intolerance-catalog.json': /^(label|disclaimer)$/,
    'data.json': /^(title|note)$/,
    'recipe-catalog.json': /^(name|category|tip|ingredients|steps)$/,
    'hyrox-events.json': /^(city|countryName)$/
  };
  for (const [f, fields] of Object.entries(JSON_FIELDS)) {
    const full = path.join(web, f);
    if (!fs.existsSync(full)) continue;
    (function dig(v, k, inLegal) {
      if (typeof v === 'string') { if (fields.test(k) && !inLegal && /[A-Za-zÀ-ÿ]{2,}/.test(v)) add(v, f); return; }
      if (Array.isArray(v)) { v.forEach((x) => dig(x, k, inLegal)); return; }
      if (v && typeof v === 'object') Object.keys(v).forEach((kk) => dig(v[kk], kk, inLegal || kk === 'legal'));
    })(JSON.parse(fs.readFileSync(full, 'utf8')), '', false);
  }
  // What the server answers and the app shows as it is: error and message texts.
  const serverFiles = ['coach-api.mjs', 'coach-practice.mjs'];
  (function list(dir) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      if (f.isDirectory()) list(path.join(dir, f.name));
      else if (/\.mjs$/.test(f.name)) serverFiles.push(path.relative(ROOT, path.join(dir, f.name)).split(path.sep).join('/'));
    }
  })(path.join(ROOT, 'server'));
  serverFiles.forEach((f) => {
    const full = path.join(ROOT, f);
    if (!fs.existsSync(full) || /server\/site\//.test(f)) return;
    let ast;
    try { ast = acorn.parse(fs.readFileSync(full, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' }); } catch (e) { console.warn('[i18n] not parsed: ' + f + ' — ' + e.message); return; }
    (function visit(node) {
      if (!node || typeof node.type !== 'string') return;
      let target = null;
      const mail = /email-auth/.test(f);
      if (node.type === 'Property' && !node.computed && (mail ? /^(error|message|detail|hint|reason|warning|subject|title|intro|outro|label)$/ : /^(error|message|detail|hint|reason|warning)$/).test(node.key.name || node.key.value || '')) target = node.value;
      // serverTr(lang)("...") — a text sent in the person's language.
      else if (node.type === 'CallExpression' && node.callee.type === 'CallExpression' && node.callee.callee.name === 'serverTr' && node.arguments[0]) target = node.arguments[0];
      else if (node.type === 'CallExpression' && node.callee.name === 'tr' && mail && node.arguments[0]) target = node.arguments[0];
      else if (node.type === 'NewExpression' && node.callee.name === 'Error' && node.arguments[0]) target = node.arguments[0];
      if (target && isChain(target)) {
        const text = flatten(target, []);
        if ((mail || /[a-zà-ÿ]{2,} [a-zà-ÿ]{2,}/i.test(text.replace(new RegExp(PH, 'g'), ' '))) && !/^[a-z_]+$/.test(text)) add(text.split(CUT).join(PH), f);
      }
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (Array.isArray(v)) v.forEach((c) => { if (c && typeof c.type === 'string') visit(c); });
        else if (v && typeof v.type === 'string') visit(v);
      }
    })(ast);
  });
  return found;
}

const result = run();
// Texts the code builds in ways the reading above cannot see, listed by hand.
const extraFile = path.join(ROOT, 'i18n', 'extra.json');
if (fs.existsSync(extraFile)) JSON.parse(fs.readFileSync(extraFile, 'utf8')).forEach((k) => { if (!result.has(k)) result.set(k, new Set(['extra.json'])); });
const keys = Array.from(result.keys()).sort((a, b) => a.localeCompare(b, 'it'));
const chars = keys.reduce((s, k) => s + k.length, 0);
const byFile = {};
for (const [k, set] of result) for (const f of set) byFile[f] = (byFile[f] || 0) + 1;
console.log('texts: ' + keys.length + ', characters: ' + chars + ', with holes: ' + keys.filter((k) => /\{\d+\}/.test(k)).length);
console.log(Object.entries(byFile).sort((a, b) => b[1] - a[1]).map(([f, c]) => '  ' + c + '  ' + f).join('\n'));
if (process.argv.includes('--containers')) console.log(Object.entries(byContainer).sort((a, b) => b[1] - a[1]).slice(0, 90).map(([f, c]) => '  ' + c + '  ' + f).join('\n'));
if (process.argv.includes('--check')) {
  const file = path.join(ROOT, 'i18n', 'strings.json');
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const have = new Set(old);
  const now = new Set(keys);
  const added = keys.filter((k) => !have.has(k));
  const gone = old.filter((k) => !now.has(k));
  if (added.length || gone.length) {
    console.log('i18n/strings.json is not up to date: ' + added.length + ' new, ' + gone.length + ' gone');
    added.slice(0, 10).forEach((k) => console.log('  + ' + k.slice(0, 100)));
    process.exit(1);
  }
  console.log('i18n/strings.json is up to date');
} else if (!process.argv.includes('--stats')) {
  fs.mkdirSync(path.join(ROOT, 'i18n'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'i18n', 'strings.json'), JSON.stringify(keys, null, 0).replace(/","/g, '",\n"') + '\n');
  console.log('written i18n/strings.json');
}
