// Text of a PDF with where it stands on the page, and the table cells it sits in.
//
// The importer read a PDF as one run of text: a program laid out as a grid
// (days across, weeks down) came out as one list, and a PDF whose fonts each
// carry their own code-to-letter map (Word, Pages: dozens of subset fonts,
// two-byte codes) came out as gibberish, because the maps were merged into
// one. This reads the objects, decodes every string with its own font, keeps
// the coordinates, and finds the cells from the ruling lines.
//
// No dependencies: inflating a stream is passed in (zlib in Node,
// DecompressionStream in the browser). Every name is _pl-prefixed or
// exported: the page bundles this file with the other import modules.

function _plLatin1(u8) {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(u8.length, i + CH)));
  return s;
}
function _plBytes(str) {
  const u8 = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) u8[i] = str.charCodeAt(i) & 0xff;
  return u8;
}

async function _plDefaultInflate(u8) {
  if (typeof DecompressionStream === 'undefined') throw new Error('inflate non disponibile');
  const ds = new DecompressionStream('deflate');
  const out = new Response(new Blob([u8]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}

// ---- objects ----

async function _plReadObjects(raw, inflate) {
  const objs = new Map();
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  const starts = [];
  while ((m = re.exec(raw))) starts.push({ num: Number(m[1]), at: m.index, body: m.index + m[0].length });
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const end = raw.indexOf('endobj', s.body);
    if (end < 0) continue;
    let body = raw.slice(s.body, end);
    let stream = null;
    const si = body.search(/\bstream\r?\n/);
    if (si >= 0) {
      const dict = body.slice(0, si);
      let dataStart = s.body + si + body.slice(si).match(/^stream\r?\n/)[0].length;
      let dataEnd = raw.lastIndexOf('endstream', end);
      // A direct length only: "/Length 180 0 R" is a reference (backtracking
      // to "18" cut a stream at 18 bytes). Without one, endstream bounds it.
      const lenM = dict.match(/\/Length\s+(\d+)\b(?!\s+\d+\s+R)/);
      if (lenM && dataStart + Number(lenM[1]) <= dataEnd) dataEnd = dataStart + Number(lenM[1]);
      const data = _plBytes(raw.slice(dataStart, dataEnd).replace(/\r?\n$/, ''));
      body = dict;
      stream = { dict, data };
    }
    objs.set(s.num, { dict: body, stream });
  }
  // Decode streams (FlateDecode only; others are left as they are).
  for (const o of objs.values()) {
    if (!o.stream) continue;
    if (/\/FlateDecode/.test(o.stream.dict)) {
      try { o.stream.text = _plLatin1(await inflate(o.stream.data)); } catch (_) { o.stream.text = ''; }
    } else if (!/\/Filter/.test(o.stream.dict)) {
      o.stream.text = _plLatin1(o.stream.data);
    } else {
      o.stream.text = '';
    }
  }
  // Objects packed in object streams (PDF 1.5).
  for (const o of Array.from(objs.values())) {
    if (!o.stream || !/\/Type\s*\/ObjStm/.test(o.stream.dict)) continue;
    const n = Number((o.stream.dict.match(/\/N\s+(\d+)/) || [])[1]);
    const first = Number((o.stream.dict.match(/\/First\s+(\d+)/) || [])[1]);
    const txt = o.stream.text || '';
    if (!n || !Number.isFinite(first)) continue;
    const head = txt.slice(0, first).trim().split(/\s+/).map(Number);
    for (let k = 0; k < n; k++) {
      const num = head[2 * k];
      const off = head[2 * k + 1];
      const next = k + 1 < n ? head[2 * k + 3] : txt.length - first;
      if (!objs.has(num)) objs.set(num, { dict: txt.slice(first + off, first + next), stream: null });
    }
  }
  return objs;
}

function _plRef(str, key) {
  const m = String(str || '').match(new RegExp('/' + key + '\\s+(\\d+)\\s+\\d+\\s+R'));
  return m ? Number(m[1]) : null;
}
// The << ... >> that follows /Key, balanced.
function _plInlineDict(str, key) {
  const s = String(str || '');
  const i = s.search(new RegExp('/' + key + '\\s*<<'));
  if (i < 0) return null;
  let j = s.indexOf('<<', i);
  let depth = 0;
  for (let k = j; k < s.length - 1; k++) {
    if (s[k] === '<' && s[k + 1] === '<') { depth++; k++; continue; }
    if (s[k] === '>' && s[k + 1] === '>') { depth--; k++; if (!depth) return s.slice(j, k + 1); }
  }
  return null;
}
function _plDictOf(objs, str, key) {
  const inline = _plInlineDict(str, key);
  if (inline) return inline;
  const r = _plRef(str, key);
  return r != null && objs.has(r) ? objs.get(r).dict : null;
}

// ---- fonts ----

const _PL_GLYPHS = {
  space: ' ', period: '.', comma: ',', colon: ':', semicolon: ';', hyphen: '-', endash: '–', emdash: '—',
  slash: '/', percent: '%', plus: '+', parenleft: '(', parenright: ')', quotesingle: "'", quoteright: '’', quotedbl: '"',
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  at: '@', ampersand: '&', underscore: '_', equal: '=', numbersign: '#', asterisk: '*', degree: '°',
  agrave: 'à', egrave: 'è', eacute: 'é', igrave: 'ì', ograve: 'ò', ugrave: 'ù', bullet: '•'
};
function _plGlyphName(name) {
  if (!name) return '';
  if (name.length === 1) return name;
  if (_PL_GLYPHS[name]) return _PL_GLYPHS[name];
  const u = name.match(/^uni([0-9A-Fa-f]{4})/);
  if (u) return String.fromCharCode(parseInt(u[1], 16));
  return '';
}
function _plHexToStr(hex) {
  const h = hex.replace(/\s+/g, '');
  let out = '';
  for (let i = 0; i + 3 < h.length + 1; i += 4) {
    const cp = parseInt(h.slice(i, i + 4), 16);
    if (Number.isFinite(cp)) out += String.fromCharCode(cp);
  }
  return out;
}
function _plParseCMap(txt) {
  const map = new Map();
  let bytes = 1;
  const cs = String(txt || '').match(/begincodespacerange\s*<([0-9A-Fa-f]+)>/);
  if (cs) bytes = Math.max(1, Math.ceil(cs[1].length / 2));
  const blocks = String(txt || '').split(/beginbf(?:char|range)/).slice(1);
  const kinds = (String(txt || '').match(/beginbf(char|range)/g) || []);
  blocks.forEach((b, i) => {
    const body = b.split(/endbf(?:char|range)/)[0];
    if (/range/.test(kinds[i])) {
      const re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<([0-9A-Fa-f]+)>|\[([^\]]*)\])/g;
      let m;
      while ((m = re.exec(body))) {
        const lo = parseInt(m[1], 16);
        const hi = parseInt(m[2], 16);
        if (m[4] != null) {
          const base = parseInt(m[4], 16);
          for (let c = lo; c <= hi && c - lo < 5000; c++) map.set(c, String.fromCharCode(base + (c - lo)));
        } else {
          const list = (m[5].match(/<([0-9A-Fa-f]+)>/g) || []).map((x) => _plHexToStr(x.slice(1, -1)));
          for (let c = lo; c <= hi && c - lo < list.length; c++) map.set(c, list[c - lo]);
        }
      }
    } else {
      const re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
      let m;
      while ((m = re.exec(body))) map.set(parseInt(m[1], 16), _plHexToStr(m[2]));
    }
  });
  return { map, bytes };
}
function _plArrayOf(objs, dict, key) {
  const s = String(dict || '');
  const i = s.search(new RegExp('/' + key + '\\s*\\['));
  if (i >= 0) {
    let depth = 0;
    const j = s.indexOf('[', i);
    for (let k = j; k < s.length; k++) {
      if (s[k] === '[') depth++;
      if (s[k] === ']') { depth--; if (!depth) return s.slice(j + 1, k); }
    }
  }
  const r = _plRef(s, key);
  if (r != null && objs.has(r)) {
    const body = objs.get(r).dict.trim();
    return body.replace(/^\[/, '').replace(/\]\s*$/, '');
  }
  return null;
}
// Glyph widths, to know where a run of text ends: /W of a CID font
// ([c [w w w] c1 c2 w ...]), /FirstChar + /Widths of a simple one.
function _plWidths(objs, d, font) {
  const widths = new Map();
  let dflt = 500;
  if (font.twoByte) {
    const dfRef = ((d.match(/\/DescendantFonts\s*\[\s*(\d+)\s+\d+\s+R/) || [])[1]);
    const desc = dfRef != null && objs.has(Number(dfRef)) ? objs.get(Number(dfRef)).dict : '';
    const dw = desc.match(/\/DW\s+(\d+)/);
    dflt = dw ? Number(dw[1]) : 1000;
    const w = _plArrayOf(objs, desc, 'W');
    if (w) {
      const toks = w.match(/\[|\]|-?\d+(?:\.\d+)?/g) || [];
      let k = 0;
      while (k < toks.length) {
        const c = Number(toks[k]);
        if (toks[k + 1] === '[') {
          let j = k + 2;
          let code = c;
          while (j < toks.length && toks[j] !== ']') { widths.set(code++, Number(toks[j])); j++; }
          k = j + 1;
        } else if (k + 2 < toks.length) {
          const c2 = Number(toks[k + 1]);
          const wv = Number(toks[k + 2]);
          for (let code = c; code <= c2 && code - c < 5000; code++) widths.set(code, wv);
          k += 3;
        } else break;
      }
    }
  } else {
    const first = Number((d.match(/\/FirstChar\s+(\d+)/) || [])[1]);
    const arr = _plArrayOf(objs, d, 'Widths');
    if (arr && Number.isFinite(first)) (arr.match(/-?\d+(?:\.\d+)?/g) || []).forEach((v, i) => widths.set(first + i, Number(v)));
  }
  return { widths, dflt };
}

function _plFont(objs, ref) {
  const o = objs.get(ref);
  if (!o) return null;
  const d = o.dict;
  const font = { twoByte: /\/Subtype\s*\/Type0/.test(d) || /Identity-H/.test(d), cmap: null, diff: null };
  const tu = _plRef(d, 'ToUnicode');
  if (tu != null && objs.has(tu) && objs.get(tu).stream) {
    font.cmap = _plParseCMap(objs.get(tu).stream.text);
    if (font.cmap.bytes === 2) font.twoByte = true;
  }
  const encDict = _plDictOf(objs, d, 'Encoding');
  const diffSrc = encDict && /\/Differences/.test(encDict) ? encDict : (/\/Differences/.test(d) ? d : null);
  if (diffSrc) {
    const arr = (diffSrc.match(/\/Differences\s*\[([^\]]*)\]/) || [])[1] || '';
    const diff = new Map();
    let code = 0;
    (arr.match(/\d+|\/[^\s/\[\]]+/g) || []).forEach((tok) => {
      if (/^\d+$/.test(tok)) code = Number(tok);
      else { diff.set(code, _plGlyphName(tok.slice(1))); code++; }
    });
    font.diff = diff;
  }
  const w = _plWidths(objs, d, font);
  font.widths = w.widths;
  font.dflt = w.dflt;
  return font;
}
// Width of a string of codes, in text space units (thousandths of the size).
function _plWidthOf(font, bytesStr) {
  if (!font || !font.widths) return bytesStr.length * 500;
  let sum = 0;
  if (font.twoByte) {
    for (let i = 0; i + 1 < bytesStr.length; i += 2) {
      const code = (bytesStr.charCodeAt(i) << 8) | bytesStr.charCodeAt(i + 1);
      sum += font.widths.has(code) ? font.widths.get(code) : font.dflt;
    }
  } else {
    for (let i = 0; i < bytesStr.length; i++) {
      const code = bytesStr.charCodeAt(i);
      sum += font.widths.has(code) ? font.widths.get(code) : font.dflt;
    }
  }
  return sum;
}
function _plDecode(font, bytesStr) {
  if (!font) return bytesStr.replace(/[\x00-\x1f]/g, '');
  let out = '';
  if (font.twoByte) {
    for (let i = 0; i + 1 < bytesStr.length; i += 2) {
      const code = (bytesStr.charCodeAt(i) << 8) | bytesStr.charCodeAt(i + 1);
      out += font.cmap && font.cmap.map.has(code) ? font.cmap.map.get(code) : '';
    }
    return out;
  }
  for (let i = 0; i < bytesStr.length; i++) {
    const code = bytesStr.charCodeAt(i);
    if (font.cmap && font.cmap.map.has(code)) out += font.cmap.map.get(code);
    else if (font.diff && font.diff.has(code)) out += font.diff.get(code);
    else if (code >= 32) out += String.fromCharCode(code);
  }
  return out;
}

// ---- content streams ----

function _plTokens(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '%') { while (i < n && src[i] !== '\n' && src[i] !== '\r') i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '(') {
      let depth = 1;
      let s = '';
      i++;
      while (i < n && depth) {
        const ch = src[i];
        if (ch === '\\') {
          const nx = src[i + 1];
          if (/[0-7]/.test(nx)) {
            let oct = '';
            let k = i + 1;
            while (k < n && oct.length < 3 && /[0-7]/.test(src[k])) oct += src[k++];
            s += String.fromCharCode(parseInt(oct, 8) & 0xff);
            i = k;
            continue;
          }
          const esc = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }[nx];
          if (nx === '\r' || nx === '\n') { i += 2; continue; }
          s += esc != null ? esc : nx;
          i += 2;
          continue;
        }
        if (ch === '(') depth++;
        if (ch === ')') { depth--; if (!depth) { i++; break; } }
        s += ch;
        i++;
      }
      out.push({ t: 'str', v: s });
      continue;
    }
    if (c === '<' && src[i + 1] !== '<') {
      const j = src.indexOf('>', i);
      const hex = src.slice(i + 1, j < 0 ? n : j).replace(/\s+/g, '');
      let s = '';
      for (let k = 0; k < hex.length; k += 2) s += String.fromCharCode(parseInt((hex.slice(k, k + 2) + '0').slice(0, 2), 16));
      out.push({ t: 'str', v: s });
      i = j < 0 ? n : j + 1;
      continue;
    }
    if (c === '<' || c === '>') { out.push({ t: 'op', v: src.slice(i, i + 2) }); i += 2; continue; }
    if (c === '[' || c === ']') { out.push({ t: c }); i++; continue; }
    if (c === '/') {
      let j = i + 1;
      while (j < n && !/[\s/\[\]()<>{}%]/.test(src[j])) j++;
      out.push({ t: 'name', v: src.slice(i + 1, j) });
      i = j;
      continue;
    }
    let j = i;
    while (j < n && !/[\s/\[\]()<>{}%]/.test(src[j])) j++;
    if (j === i) { i++; continue; }
    const word = src.slice(i, j);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) out.push({ t: 'num', v: Number(word) });
    else out.push({ t: 'op', v: word });
    i = j;
    // Inline images: skip to EI.
    if (word === 'ID') {
      const e = src.indexOf('EI', i);
      i = e < 0 ? n : e + 2;
    }
  }
  return out;
}
function _plMul(a, b) {
  return [
    a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]
  ];
}
function _plApply(m, x, y) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

function _plRunContent(src, fonts, pageNo, out) {
  const toks = _plTokens(src);
  const I = [1, 0, 0, 1, 0, 0];
  let ctm = I.slice();
  const stack = [];
  let tm = I.slice();
  let tlm = I.slice();
  let font = null;
  let size = 10;
  let leading = 0;
  let ops = [];
  let path = [];
  let cur = null;
  const show = (strs) => {
    const trm = _plMul(tm, ctm);
    const [x, y] = _plApply(trm, 0, 0);
    const scale = Math.hypot(trm[2], trm[3]) || 1;
    const hscale = Math.hypot(trm[0], trm[1]) || 1;
    let text = '';
    let adv = 0; // text space, thousandths of the size
    strs.forEach((s) => {
      if (typeof s === 'number') { if (s < -180) text += ' '; adv -= s; return; }
      text += _plDecode(font, s);
      adv += _plWidthOf(font, s);
    });
    text = text.replace(/\u0000/g, '');
    const advance = (adv / 1000) * size;
    if (text.trim()) out.items.push({ page: pageNo, x, y, size: size * scale, text, x1: x + advance * hscale });
    tm = _plMul([1, 0, 0, 1, advance, 0], tm);
  };
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    if (tk.t === 'num' || tk.t === 'str' || tk.t === 'name') { ops.push(tk); continue; }
    if (tk.t === '[') {
      const arr = [];
      let j = k + 1;
      for (; j < toks.length && toks[j].t !== ']'; j++) {
        if (toks[j].t === 'num') arr.push(toks[j].v);
        else if (toks[j].t === 'str') arr.push(toks[j].v);
      }
      ops.push({ t: 'arr', v: arr });
      k = j;
      continue;
    }
    if (tk.t !== 'op') continue;
    const op = tk.v;
    const nums = ops.filter((o) => o.t === 'num').map((o) => o.v);
    switch (op) {
      case 'q': stack.push(ctm.slice()); break;
      case 'Q': if (stack.length) ctm = stack.pop(); break;
      case 'cm': if (nums.length >= 6) ctm = _plMul(nums.slice(-6), ctm); break;
      case 'BT': tm = I.slice(); tlm = I.slice(); break;
      case 'Tf': {
        const nm = ops.find((o) => o.t === 'name');
        font = nm ? fonts.get(nm.v) || null : font;
        if (nums.length) size = nums[nums.length - 1];
        break;
      }
      case 'TL': if (nums.length) leading = nums[0]; break;
      case 'Td': if (nums.length >= 2) { tlm = _plMul([1, 0, 0, 1, nums[0], nums[1]], tlm); tm = tlm.slice(); } break;
      case 'TD': if (nums.length >= 2) { leading = -nums[1]; tlm = _plMul([1, 0, 0, 1, nums[0], nums[1]], tlm); tm = tlm.slice(); } break;
      case 'Tm': if (nums.length >= 6) { tlm = nums.slice(-6); tm = tlm.slice(); } break;
      case 'T*': tlm = _plMul([1, 0, 0, 1, 0, -leading], tlm); tm = tlm.slice(); break;
      case 'Tj': { const s = ops.find((o) => o.t === 'str'); if (s) show([s.v]); break; }
      case 'TJ': { const a = ops.find((o) => o.t === 'arr'); if (a) show(a.v); break; }
      case "'": case '"': { tlm = _plMul([1, 0, 0, 1, 0, -leading], tlm); tm = tlm.slice(); const s = ops.filter((o) => o.t === 'str').pop(); if (s) show([s.v]); break; }
      case 're': if (nums.length >= 4) { const [x, y, w, h] = nums.slice(-4); path.push({ rect: [x, y, w, h], m: ctm.slice() }); } break;
      case 'm': if (nums.length >= 2) cur = [nums[nums.length - 2], nums[nums.length - 1]]; break;
      case 'l': if (nums.length >= 2 && cur) { const to = [nums[nums.length - 2], nums[nums.length - 1]]; path.push({ seg: [cur, to], m: ctm.slice() }); cur = to; } break;
      case 'S': case 's': case 'f': case 'F': case 'f*': case 'B': case 'B*': case 'b': case 'b*':
        path.forEach((p) => {
          if (p.rect) {
            const [x, y, w, h] = p.rect;
            const a = _plApply(p.m, x, y);
            const b = _plApply(p.m, x + w, y + h);
            out.rects.push({ page: pageNo, x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) });
          } else if (p.seg) {
            const a = _plApply(p.m, p.seg[0][0], p.seg[0][1]);
            const b = _plApply(p.m, p.seg[1][0], p.seg[1][1]);
            out.rects.push({ page: pageNo, x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) });
          }
        });
        path = [];
        break;
      case 'n': path = []; break;
      default: break;
    }
    ops = [];
  }
}

function _plPageOrder(objs, raw) {
  const root = _plRef(raw.slice(raw.lastIndexOf('trailer')), 'Root') || (() => {
    for (const [num, o] of objs) if (/\/Type\s*\/Catalog/.test(o.dict)) return num;
    return null;
  })();
  const pages = [];
  const walk = (ref, inherited, depth) => {
    const o = objs.get(ref);
    if (!o || depth > 20) return;
    const res = /\/Resources/.test(o.dict) ? o.dict : inherited;
    if (/\/Type\s*\/Pages/.test(o.dict)) {
      const kids = ((o.dict.match(/\/Kids\s*\[([^\]]*)\]/) || [])[1] || '').match(/(\d+)\s+\d+\s+R/g) || [];
      kids.forEach((k) => walk(Number(k.split(/\s+/)[0]), res, depth + 1));
    } else if (/\/Type\s*\/Page\b/.test(o.dict)) {
      pages.push({ ref, dict: o.dict, resHolder: res });
    }
  };
  const cat = root != null ? objs.get(root) : null;
  const pagesRef = cat ? _plRef(cat.dict, 'Pages') : null;
  if (pagesRef != null) walk(pagesRef, null, 0);
  if (!pages.length) {
    Array.from(objs.entries()).filter(([, o]) => /\/Type\s*\/Page\b/.test(o.dict)).forEach(([num, o]) => pages.push({ ref: num, dict: o.dict, resHolder: o.dict }));
  }
  return pages;
}

/**
 * Reads a PDF (Uint8Array) into { pages, items: [{ page, x, y, size, text }],
 * rects: [{ page, x0, y0, x1, y1 }] } in PDF units (origin bottom-left).
 */
export async function readPdfLayout(bytes, options = {}) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const raw = _plLatin1(u8);
  const inflate = options.inflate || _plDefaultInflate;
  const objs = await _plReadObjects(raw, inflate);
  const pages = _plPageOrder(objs, raw);
  const out = { pages: pages.length, items: [], rects: [] };
  pages.forEach((pg, pi) => {
    const resDict = _plDictOf(objs, pg.dict, 'Resources') || (pg.resHolder ? _plDictOf(objs, pg.resHolder, 'Resources') : null) || '';
    const fontDict = _plDictOf(objs, resDict, 'Font') || '';
    const fonts = new Map();
    (fontDict.match(/\/([^\s/<>\[\]]+)\s+(\d+)\s+\d+\s+R/g) || []).forEach((entry) => {
      const m = entry.match(/\/([^\s/<>\[\]]+)\s+(\d+)/);
      const f = _plFont(objs, Number(m[2]));
      if (f) fonts.set(m[1], f);
    });
    // Form XObjects drawn on the page (text is often inside them).
    const xobjDict = _plDictOf(objs, resDict, 'XObject') || '';
    const xobjs = new Map();
    (xobjDict.match(/\/([^\s/<>\[\]]+)\s+(\d+)\s+\d+\s+R/g) || []).forEach((entry) => {
      const m = entry.match(/\/([^\s/<>\[\]]+)\s+(\d+)/);
      xobjs.set(m[1], Number(m[2]));
    });
    const contents = [];
    const cRef = _plRef(pg.dict, 'Contents');
    const cArr = (pg.dict.match(/\/Contents\s*\[([^\]]*)\]/) || [])[1];
    if (cArr) (cArr.match(/(\d+)\s+\d+\s+R/g) || []).forEach((r) => contents.push(Number(r.split(/\s+/)[0])));
    else if (cRef != null) contents.push(cRef);
    let src = contents.map((r) => (objs.get(r) && objs.get(r).stream && objs.get(r).stream.text) || '').join('\n');
    // Inline the forms: "/X1 Do" becomes the form's own content (once, fonts of the page).
    src = src.replace(/\/([^\s/<>\[\]]+)\s+Do\b/g, (whole, nm) => {
      const r = xobjs.get(nm);
      const o = r != null ? objs.get(r) : null;
      if (!o || !o.stream || !/\/Subtype\s*\/Form/.test(o.stream.dict)) return '';
      const fm = (o.stream.dict.match(/\/Matrix\s*\[([^\]]*)\]/) || [])[1];
      const inner = o.stream.text || '';
      const formFonts = _plDictOf(objs, _plDictOf(objs, o.stream.dict, 'Resources') || '', 'Font') || '';
      (formFonts.match(/\/([^\s/<>\[\]]+)\s+(\d+)\s+\d+\s+R/g) || []).forEach((entry) => {
        const m = entry.match(/\/([^\s/<>\[\]]+)\s+(\d+)/);
        if (!fonts.has(m[1])) { const f = _plFont(objs, Number(m[2])); if (f) fonts.set(m[1], f); }
      });
      return ' q ' + (fm ? fm.trim() + ' cm ' : '') + inner + ' Q ';
    });
    _plRunContent(src, fonts, pi + 1, out);
  });
  return out;
}

// ---- layout to text ----

// Text lines of a set of items, top to bottom, left to right.
function _plLines(items) {
  const sorted = items.slice().sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const lines = [];
  sorted.forEach((it) => {
    const tol = Math.max(2, (it.size || 10) * 0.45);
    const line = lines.find((l) => Math.abs(l.y - it.y) <= tol);
    if (line) line.items.push(it);
    else lines.push({ y: it.y, items: [it] });
  });
  lines.sort((a, b) => b.y - a.y);
  // A wide gap splits a line: a label in the margin ("Settimana" written
  // down the side) is not the start of the exercise next to it.
  const segs = [];
  lines.forEach((l) => {
    l.items.sort((a, b) => a.x - b.x);
    let s = '';
    let end = null;
    let x0 = null;
    const flush = () => { if (s.trim()) segs.push({ y: l.y, x: x0, text: s.replace(/\s+/g, ' ').trim() }); s = ''; x0 = null; };
    l.items.forEach((it) => {
      const gap = end == null ? 0 : it.x - end;
      const em = it.size || 10;
      // ...and a day heading is not the page number printed next to it ("Giorno 3" "5").
      if (s && gap > em * 0.8 && /^(settimana|week|sett\.?|woche|\d{1,2})$/i.test(s.trim())) flush();
      else if (s && gap > em * 0.4 && /^(giorno|day|tag)\s*\d$/i.test(s.trim()) && /^\d/.test(it.text.trim())) flush();
      if (s && gap > em * 0.12 && !/\s$/.test(s) && !/^\s/.test(it.text)) s += ' ';
      if (x0 == null) x0 = it.x;
      s += it.text;
      end = it.x1 != null ? it.x1 : it.x + it.text.length * em * 0.5;
    });
    flush();
  });
  return segs;
}

// "Settimana" / "01" written down the margin of a week's block: one heading,
// placed before that block's "Giorno 1".
function _plSideWeekLabels(lines) {
  const out = lines.slice();
  for (let i = 0; i < out.length; i++) {
    if (!/^(settimana|week|sett\.?|woche)$/i.test(out[i].text)) continue;
    let j = -1;
    for (let k = i + 1; k < Math.min(out.length, i + 6); k++) {
      if (Math.abs(out[k].x - out[i].x) < 20 && /^\d{1,2}$/.test(out[k].text)) { j = k; break; }
    }
    if (j < 0) continue;
    const label = 'SETTIMANA ' + Number(out[j].text);
    out.splice(j, 1);
    out.splice(i, 1);
    let at = i;
    for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
      if (/^(giorno|day|tag)\s*1\b/i.test(out[k].text)) { at = k; break; }
    }
    out.splice(at, 0, { y: (out[at] ? out[at].y : 0) + 0.01, x: 0, text: label });
    i = at;
  }
  return out;
}

// A document that declares its notation ("% . reps . serie") writes
// "75.3.5" for 5 sets of 3 at 75%, and "8/6.5 Serie" for 5 sets of 8/6.
export function expandDeclaredDotNotation(text) {
  const t = String(text || '');
  if (!/%\s*\.\s*reps?\s*\.\s*serie/i.test(t)) return t;
  return t.split('\n').map((line) => {
    if (/%\s*\.\s*reps?\s*\.\s*serie/i.test(line)) return line;
    return line
      .replace(/(^|\s)(\d{2,3})\.(\d{1,2})\.(\d{1,2})\.?(?=\s|$)/g, (m, sp, pct, reps, sets) => sp + sets + 'x' + reps + ' ' + pct + '%')
      .replace(/(^|\s)(\d{1,2}(?:\/\d{1,2})?)\.(\d{1,2})\s*serie\b/gi, (m, sp, reps, sets) => sp + sets + 'x' + reps);
  }).join('\n');
}

function _plCluster(values, tol) {
  const v = values.slice().sort((a, b) => a - b);
  const out = [];
  v.forEach((x) => {
    const last = out[out.length - 1];
    if (last != null && Math.abs(x - last.at) <= tol) { last.sum += x; last.n++; last.at = last.sum / last.n; }
    else out.push({ at: x, sum: x, n: 1 });
  });
  return out.map((c) => c.at);
}

// Ruled tables of one page: the vertical and horizontal lines the page
// draws (thin rectangles or strokes), grouped into grids of at least 2x2 cells.
function _plTables(rects) {
  const vert = rects.filter((r) => (r.x1 - r.x0) <= 3 && (r.y1 - r.y0) >= 15);
  const horz = rects.filter((r) => (r.y1 - r.y0) <= 3 && (r.x1 - r.x0) >= 30);
  // Cell rectangles drawn as boxes count as their four sides.
  rects.filter((r) => (r.x1 - r.x0) > 30 && (r.y1 - r.y0) > 15).forEach((r) => {
    vert.push({ x0: r.x0, x1: r.x0, y0: r.y0, y1: r.y1 }, { x0: r.x1, x1: r.x1, y0: r.y0, y1: r.y1 });
    horz.push({ x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y0 }, { x0: r.x0, x1: r.x1, y0: r.y1, y1: r.y1 });
  });
  if (vert.length < 3 || horz.length < 2) return [];
  // One grid per group of horizontal lines that share the same span.
  const tables = [];
  const used = new Set();
  horz.sort((a, b) => b.y0 - a.y0).forEach((h, i) => {
    if (used.has(i)) return;
    const group = horz.map((g, j) => ({ g, j })).filter(({ g, j }) => !used.has(j) && Math.abs(g.x0 - h.x0) < 6 && Math.abs(g.x1 - h.x1) < 6);
    if (group.length < 2) return;
    group.forEach(({ j }) => used.add(j));
    const allYs = _plCluster(group.map(({ g }) => (g.y0 + g.y1) / 2), 2).sort((a, b) => b - a);
    // Rows are rows of one table only where vertical lines join them: two
    // tables of the same width, one under the other, with a heading between
    // ("Alternativa ortodossa"), are two tables.
    const spansRow = (yTop, yBot) => vert.filter((v) => v.x0 >= h.x0 - 4 && v.x1 <= h.x1 + 4 && v.y1 >= yTop - 3 && v.y0 <= yBot + 3).length >= 2;
    let run = [allYs[0]];
    const runs = [];
    for (let k = 1; k < allYs.length; k++) {
      if (spansRow(allYs[k - 1], allYs[k])) run.push(allYs[k]);
      else { runs.push(run); run = [allYs[k]]; }
    }
    runs.push(run);
    runs.filter((ys) => ys.length >= 2).forEach((ys) => {
      const top = ys[0];
      const bottom = ys[ys.length - 1];
      const xs = _plCluster(vert.filter((v) => v.x0 >= h.x0 - 4 && v.x1 <= h.x1 + 4 && v.y1 >= bottom - 2 && v.y0 <= top + 2).map((v) => (v.x0 + v.x1) / 2), 2);
      if (xs.length < 2) return;
      tables.push({ xs, ys, top, bottom, left: xs[0], right: xs[xs.length - 1] });
    });
  });
  // Borders drawn cell by cell make one "table" per column: side by side,
  // with the same rows, they are one table.
  tables.sort((a, b) => (b.top - a.top) || (a.left - b.left));
  const merged = [];
  tables.forEach((t) => {
    const host = merged.find((m) => m.ys.length === t.ys.length && m.ys.every((y, i) => Math.abs(y - t.ys[i]) < 3)
      && (Math.abs(t.left - m.right) < 4 || Math.abs(m.left - t.right) < 4));
    if (!host) { merged.push({ ...t, xs: t.xs.slice() }); return; }
    host.xs = _plCluster(host.xs.concat(t.xs), 2);
    host.left = host.xs[0];
    host.right = host.xs[host.xs.length - 1];
  });
  // A merge can make a table touch the next one: merge until nothing changes.
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < merged.length && !changed; i++) {
      for (let j = i + 1; j < merged.length && !changed; j++) {
        const a = merged[i];
        const b = merged[j];
        if (a.ys.length === b.ys.length && a.ys.every((y, k) => Math.abs(y - b.ys[k]) < 3) && (Math.abs(b.left - a.right) < 4 || Math.abs(a.left - b.right) < 4)) {
          a.xs = _plCluster(a.xs.concat(b.xs), 2);
          a.left = a.xs[0];
          a.right = a.xs[a.xs.length - 1];
          merged.splice(j, 1);
          changed = true;
        }
      }
    }
  }
  return merged;
}

/**
 * Text of a PDF layout for the program parser. Ruled tables whose rows are
 * weeks and columns days (the usual way a coach lays a block out) come out
 * as "SETTIMANA n" / "GIORNO d" and the cell's lines; the rest in reading
 * order. A table introduced by "alternativa" is an alternative to the one
 * before, not more weeks: it is left out and reported.
 * Returns { text, warnings }.
 */
export function pdfLayoutToText(layout) {
  const warnings = [];
  const out = [];
  let week = 0;
  let afterTable = false;
  const pages = new Set((layout.items || []).map((i) => i.page));
  Array.from(pages).sort((a, b) => a - b).forEach((pg) => {
    const items = layout.items.filter((i) => i.page === pg);
    const tables = _plTables((layout.rects || []).filter((r) => r.page === pg)).filter((t) => {
      // A grid of the program has days across (two columns at least) and
      // text in it; a single boxed line is just a box.
      if (t.xs.length < 3) return false;
      let filled = 0;
      for (let r = 0; r + 1 < t.ys.length; r++) {
        for (let c = 0; c + 1 < t.xs.length; c++) {
          if (items.some((i) => i.x >= t.xs[c] - 1 && i.x < t.xs[c + 1] - 1 && i.y <= t.ys[r] + 1 && i.y > t.ys[r + 1])) filled++;
        }
      }
      return filled >= 2;
    });
    const inTable = (it) => tables.find((t) => it.x >= t.left - 1 && it.x <= t.right + 1 && it.y <= t.top + 1 && it.y >= t.bottom - 1);
    // Blocks in reading order: free text lines and tables, by their top.
    const free = _plSideWeekLabels(_plLines(items.filter((i) => !inTable(i)))).map((l) => ({ y: l.y, kind: 'line', text: l.text }));
    const blocks = free.concat(tables.map((t) => ({ y: t.top, kind: 'table', t }))).sort((a, b) => b.y - a.y);
    let lastLine = '';
    blocks.forEach((b) => {
      if (b.kind === 'line') {
        // Under a program table, text is the coach's explanation ("NB", "Con
        // accumulo e intensificazione tipo 6x3 75%-6x4 75%..."): a note, not
        // more exercises of the table's last day. A day or week heading, or a
        // short line with a scheme, is still program.
        const programLine = /^(giorno|day|settimana|week|tag|woche)\s*\d/i.test(b.text)
          || (b.text.split(/\s+/).length <= 8 && (b.text.match(/\d\s*[x×*]\s*\d/gi) || []).length === 1);
        out.push(afterTable && !programLine ? '_' + b.text : b.text);
        lastLine = b.text;
        return;
      }
      afterTable = true;
      const t = b.t;
      if (/alternativ/i.test(lastLine)) {
        warnings.push('Tabella alternativa ("' + lastLine.slice(0, 40) + '") non importata: il programma e\' la prima.');
        lastLine = '';
        return;
      }
      for (let r = 0; r + 1 < t.ys.length; r++) {
        const yTop = t.ys[r];
        const yBot = t.ys[r + 1];
        const cells = [];
        for (let c = 0; c + 1 < t.xs.length; c++) {
          const xL = t.xs[c];
          const xR = t.xs[c + 1];
          const cellItems = items.filter((i) => i.x >= xL - 1 && i.x < xR - 1 && i.y <= yTop + 1 && i.y > yBot);
          cells.push(_plLines(cellItems).map((l) => l.text));
        }
        if (!cells.some((c) => c.length)) continue;
        week++;
        out.push('SETTIMANA ' + week);
        cells.forEach((lines, c) => {
          if (!lines.length) return;
          out.push('GIORNO ' + (c + 1));
          // A cell with no scheme in it is the list of the day's exercises
          // ("Panca isocinetica", "Squat volume"): written as list items, or
          // the parser takes a bare name for a note.
          const plainList = !lines.some((l) => /\d\s*[x×*]\s*(?:\d|max)/i.test(l));
          lines.forEach((l) => out.push(plainList ? '- ' + l : l));
        });
      }
      lastLine = '';
    });
  });
  return { text: expandDeclaredDotNotation(out.join('\n')), warnings };
}
