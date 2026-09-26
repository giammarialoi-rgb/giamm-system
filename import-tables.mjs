// Training programs laid out as tables - the spreadsheets coaches actually
// send, whatever language the headers are in.
//
// The legacy workbook parser knows the Nurvan/owner templates (Italian
// headers in fixed columns). Real files measured with tools/import-corpus
// came out empty: English and German headers ("Exercise | % | RPE | Weight |
// Sets | Reps", "Übung | % | Last | Sätze | Wdh"), weeks side by side
// (Calgary Barbell), one row per set group (Sheiko), "Set 1 | Set 2" columns
// with "load | x reps" pairs (Candito). This module reads those layouts from
// the cells: a header row named by its vocabulary, week and day markers,
// continuation rows, and the maxes the loads are computed from.
//
// Every name here starts with _it or is one of the exported functions: the
// page bundles this file into one script with the other import modules.
// Dependencies (XLSX, the exercise-name normaliser) come in as options.

const _IT_COLUMN_WORDS = [
  ['exercise', /^(esercizi?o?|exercises?|ubung|uebung|movimento|nome esercizio|esercizio effettivo|lift|alzata|movement|workout)$/],
  ['sets', /^(serie|n\.? ?serie|sets?|satze|saetze|satz|sets? x|series)$/],
  ['reps', /^(ripetizioni|rip\.?|ripet\.?|reps?|repetitions?|wdh\.?|wiederholungen|reps target)$/],
  ['pct', /^(%|% ?1 ?rm|%1rm|% ?rm|% ?max|intensita|intensity|intensitat|intensitaet|percentuale|perc\.?)$/],
  ['load', /^(carico|carichi|carico pianificato|peso|kg|weight|load|last|gewicht|lbs|kg\/lbs|weight kg)$/],
  ['rpe', /^(rpe|rpe target)$/],
  ['rir', /^(rir|rir target)$/],
  ['rest', /^(recupero|rest|pausa|riposo|pause|rec\.?|rest sec|rest s)$/],
  ['tempo', /^(tempo|tut)$/],
  ['notes', /^(note|notes|bemerkung|bemerkungen|commento|commenti|comments?|technique|tecnica|coaching notes?|cues?|istruzioni)$/],
  // A whole scheme in one cell: "Work-up (load × reps)" (95×3, 100×2...), "Sets x Reps".
  ['scheme', /^(work ?-?up|scheme|schema|prescription|prescrizione|sets? ?[x×] ?reps?|serie ?[x×] ?rip\w*|load ?[x×] ?reps?|carico ?[x×] ?rip\w*|kg ?[x×] ?rip\w*)$/],
  // Assistance work listed beside the main lift, names only (Juggernaut's "ACCESSORY").
  ['accessory', /^(accessor(?:y|ies|i|io)|complementari|assistenza|assistance)$/],
  // What the athlete fills in: never a prescription.
  ['log', /^(log|weight used|reps done|done|fatto|eseguito|actual|achieved|carico usato|rip(?:etizioni)? fatte)$/]
];
const _IT_METRICS = ['sets', 'reps', 'pct', 'load', 'rpe', 'rir', 'scheme'];
const _IT_WEEK_RE = /^(?:week|wk|settimana|sett\.?|woche)\s*\.?\s*(\d{1,2})\b/i;
const _IT_WEEK_EXTRA_RE = /^(?:meet week|competition week|taper(?: week)?|settimana (?:di )?gara|wettkampfwoche|deload week)\b/i;
// Day 2, Giorno 3, Tag 5 - and the lettered days of Italian sheets (GIORNO A, Day B).
const _IT_DAY_RE = /\b(?:day|giorno|tag|seduta|sessione|session|workout)\s*\.?\s*(\d{1,2}|[A-F])(?![a-z])/i;
const _IT_DAY_WORD_RE = /^(?:(?:\d+\s+)?days?\s+(?:from|before|out)\b|monday|tuesday|wednesday|thursday|friday|saturday|sunday|luned|marted|mercoled|gioved|venerd|sabato|domenica|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)/i;
const _IT_PLACEHOLDER_RE = /^(?:keine auswahl|nessuna (?:selezione|scelta)|none|n\/?a|-+|x+|warm ?-?up|riscaldamento|aufwarmen|\.{2,}|\?+)$|auswahlen$|ausw\u00e4hlen$|^scegli|^select\b|^choose\b/i;
const _IT_SET_COL_RE = /^set\s*\d{1,2}$/i;

function _itFold(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// A header cell to its column kind: "Carico (kg)" is a load, "% 1RM" a percentage.
function _itColumnKind(text) {
  let t = _itFold(text).replace(/[:.]+$/, '').trim();
  if (!t) return null;
  const bare = t.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  // "Work-up (load × reps)": the words in brackets say what the cells hold.
  const inBrackets = (t.match(/\(([^)]*)\)/) || [])[1] || '';
  if (/\b(load|carico|kg|peso|weight|sets?|serie)\s*[x×]\s*(reps?|rip\w*)\b/.test(inBrackets)) return 'scheme';
  for (const [kind, re] of _IT_COLUMN_WORDS) {
    if (re.test(t) || (bare && re.test(bare))) return kind;
  }
  if (/^%/.test(t) || /1\s*rm$/.test(bare)) return 'pct';
  if (/^(carico|peso|weight|load)\b/.test(bare)) return 'load';
  return null;
}

function _itCellText(c) {
  if (!c) return '';
  const s = c.w != null ? c.w : c.v;
  return s == null ? '' : String(s).replace(/\s+/g, ' ').trim();
}

// The sheet as a grid of { v, w, f } cells, bounded to what a program uses.
function _itGrid(ws, XLSX, maxRows = 1500, maxCols = 60) {
  const grid = [];
  if (!ws || !ws['!ref']) return grid;
  const range = XLSX.utils.decode_range(ws['!ref']);
  const r1 = Math.min(range.e.r, range.s.r + maxRows - 1);
  const c1 = Math.min(range.e.c, maxCols - 1);
  for (let r = 0; r <= r1; r++) {
    const row = [];
    for (let c = 0; c <= c1; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      row.push(cell ? { v: cell.v, w: cell.w, f: cell.f, t: cell.t, z: cell.z, addr: XLSX.utils.encode_cell({ r, c }) } : null);
    }
    grid.push(row);
  }
  // Merged cells: a day or week label merged across rows reads on each row it covers only once.
  return grid;
}

function _itNum(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const m = String(v).replace(/\s/g, '').replace(',', '.').match(/^[+-]?\d+(?:\.\d+)?$/);
  return m ? Number(m[0]) : null;
}
function _itRound(n, d = 2) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

// % of 1RM: 0.75 formatted as percent, "75%", "75", or "80% of E1RM".
function _itPct(cell, columnIsPct) {
  if (!cell) return null;
  const text = _itCellText(cell);
  if (typeof cell.v === 'number') {
    const formattedPct = /%/.test(text) || /%/.test(String(cell.z || ''));
    if (formattedPct || (columnIsPct && cell.v > 0 && cell.v <= 1.5)) return _itRound(cell.v * 100);
    if (columnIsPct && cell.v > 1.5 && cell.v <= 120) return _itRound(cell.v);
    return null;
  }
  const m = text.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
  if (m) return _itRound(Number(m[1].replace(',', '.')));
  if (columnIsPct) {
    const n = _itNum(text);
    if (n != null && n > 0 && n <= 1.5) return _itRound(n * 100);
    if (n != null && n > 1.5 && n <= 120) return n;
  }
  return null;
}
function _itRpe(text) {
  const t = String(text || '');
  const m = t.match(/\brpe\s*@?\s*(\d{1,2}(?:[.,]5)?)\b/i) || t.match(/\b(\d{1,2}(?:[.,]5)?)\s*rpe\b/i) || t.match(/^@\s*(\d{1,2}(?:[.,]5)?)$/);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return n >= 1 && n <= 10 ? n : null;
}
function _itRir(text) {
  const m = String(text || '').match(/\brir\s*@?\s*(\d(?:[.,]5)?)\b/i) || String(text || '').match(/\b(\d(?:[.,]5)?)\s*rir\b/i);
  return m ? Number(m[1].replace(',', '.')) : null;
}
function _itReps(cell) {
  if (!cell) return null;
  if (typeof cell.v === 'number') return Number.isInteger(cell.v) && cell.v > 0 && cell.v < 200 ? String(cell.v) : null;
  let t = _itCellText(cell).toLowerCase();
  if (!t || /^x+$/.test(t) || t === '-') return null;
  t = t.replace(/^x\s*/, '');
  // "8 a 10", "8 to 10", "8 bis 10": a range - only between numbers ("amrap" has an "a" too).
  t = t.replace(/(\d)\s*(?:bis|to|a|-|\u2013|\u2014)\s*(?=\d)/g, '$1-');
  if (/^\d{1,3}(?:-\d{1,3})?$/.test(t)) return t;
  if (/^(?:mr|amrap|max)\s*\d*$/.test(t)) return t.toUpperCase().replace(/\s+/g, '');
  if (/^\d{1,3}\s*(?:s|sec|")$/.test(t)) return t.replace(/\s+/g, '');
  if (/^\d{1,3}(?:\/\d{1,3})+$/.test(t)) return t;
  // "5+": at least five, the last set of a wave.
  if (/^\d{1,3}\s*\+$/.test(t)) return t.replace(/\s+/g, '');
  if (/^(?:to )?(?:failure|cedimento|fallimento|muskelversagen)$/.test(t)) return 'MAX';
  return null;
}

// A reps cell that says more than a number: "12, 10, 12" (one per set),
// "8 each" / "20 (10 each leg)" (the number, the rest a note), "superset"
// (no number: a note). Returns { reps, list, note } or null.
function _itRepsDetail(cell) {
  if (!cell) return null;
  const text = _itCellText(cell);
  if (!text) return null;
  const direct = _itReps(cell);
  if (direct != null) return { reps: direct, list: null, note: null };
  const t = text.toLowerCase().trim();
  if (/^\d{1,3}(?:\s*[,;]\s*\d{1,3}){1,19}$/.test(t)) return { reps: null, list: t.split(/\s*[,;]\s*/), note: null };
  const lead = t.match(/^(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)\s+(?=[a-z(])(.+)$/i);
  if (lead && !/^(?:x|sets?|serie|kg|lbs?|%)\b/i.test(lead[2])) return { reps: lead[1].replace(/\s*[-–]\s*/, '-'), list: null, note: text };
  if (/^[a-z][a-z\s\-]{2,30}$/i.test(t)) return { reps: null, list: null, note: text };
  return null;
}

// A scheme written in one cell, as a list of steps:
//   "90×3, 90×3, 95×3"          load × reps, one set each (loadFirst)
//   "70×3+3, 100×1+3"           load × a complex (3 of each movement)
//   "2x20, 2-3x3-4, 1x6-8"      sets × reps
//   "reps: 10, 10, 10"          reps, one set each
// Returns [{ sets, setsNote, reps, load }] or null when a step does not read.
function _itSchemeGroups(text, loadFirst) {
  let t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const repsOnly = t.match(/^(?:reps?|rip(?:etizioni)?|wdh)\s*:\s*(.+)$/i);
  if (repsOnly) {
    const parts = repsOnly[1].split(/\s*[,;]\s*/).filter(Boolean);
    if (!parts.every((p) => /^\d{1,3}(?:-\d{1,3})?$/.test(p) || /^max|amrap$/i.test(p))) return null;
    return parts.map((p) => ({ sets: 1, setsNote: null, reps: /^\d/.test(p) ? p : p.toUpperCase(), load: null }));
  }
  const parts = t.split(/\s*[,;]\s*/).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const m = p.match(/^(\d{1,3}(?:[.,]\d{1,2})?(?:\s*-\s*\d{1,2})?)\s*[x×*]\s*(\d{1,3}(?:\s*[-+]\s*\d{1,3})*)\s*$/i);
    if (!m) return null;
    const a = m[1].replace(/\s+/g, '');
    const reps = m[2].replace(/\s+/g, '');
    if (loadFirst) {
      const load = Number(a.replace(',', '.'));
      if (!Number.isFinite(load) || /-/.test(a)) return null;
      out.push({ sets: 1, setsNote: null, reps, load });
    } else {
      const range = a.match(/^(\d{1,2})-(\d{1,2})$/);
      const sets = range ? Number(range[1]) : Number(a);
      if (!Number.isInteger(sets) || sets < 1 || sets > 20) return null;
      out.push({ sets, setsNote: range ? a + ' serie' : null, reps, load: null });
    }
  }
  return out.length ? out : null;
}

// The steps of a scheme cell built by a formula from the maxes:
// ROUND(Setup!$C$4*0.65/...)&"×3" -> [{ ref: 'Setup!C4', factor: 0.65 }, ...].
function _itFormulaSteps(formula, sheetName) {
  const f = String(formula || '');
  const re = /(?:'([^']+)'|([A-Za-z_][\w.]*))?(!)?\$?([A-Z]{1,3})\$?(\d{1,5})\s*\*\s*(\d+(?:\.\d+)?)/g;
  const steps = [];
  let m;
  while ((m = re.exec(f))) {
    const sheet = m[3] ? (m[1] || m[2]) : sheetName;
    if (!m[3] && (m[1] || m[2])) continue;
    steps.push({ ref: sheet + '!' + m[4] + m[5], factor: Number(m[6]) });
  }
  return steps;
}
// "3", "1+2F" (a top set and two back-off sets), "5 serie".
function _itSets(cell) {
  if (!cell) return { n: null, note: null };
  if (typeof cell.v === 'number') return { n: Number.isInteger(cell.v) && cell.v > 0 && cell.v <= 30 ? cell.v : null, note: null };
  const t = _itCellText(cell);
  const plus = t.match(/^(\d{1,2})\s*\+\s*(\d{1,2})\s*([a-z]*)$/i);
  if (plus) return { n: Number(plus[1]) + Number(plus[2]), note: t };
  const m = t.match(/^(\d{1,2})(?:\s*(?:serie|sets?|x))?$/i);
  return { n: m ? Number(m[1]) : null, note: null };
}
function _itLoad(cell) {
  if (!cell) return null;
  const text = _itCellText(cell);
  if (typeof cell.v === 'number') {
    if (/%/.test(text)) return null;
    return cell.v > 0 && cell.v < 1000 ? _itRound(cell.v) : null;
  }
  const m = text.match(/^(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:kg|lbs?|lb)?$/i);
  return m ? Number(m[1].replace(',', '.')) : null;
}
function _itRest(cell) {
  if (!cell) return null;
  if (typeof cell.v === 'number') return cell.v > 0 && cell.v <= 900 ? (cell.v <= 10 ? Math.round(cell.v * 60) : Math.round(cell.v)) : null;
  const t = _itCellText(cell).toLowerCase();
  let m = t.match(/^(\d{1,2})\s*(?:'|min|m)$/);
  if (m) return Number(m[1]) * 60;
  m = t.match(/^(\d{1,3})\s*(?:"|s|sec|secondi)?$/);
  return m ? Number(m[1]) : null;
}

// A row naming at least two column kinds, one of them a metric.
function _itHeaderOf(row) {
  const cols = [];
  let setCols = 0;
  (row || []).forEach((cell, c) => {
    const text = _itCellText(cell);
    if (!text) return;
    if (_IT_SET_COL_RE.test(text)) { setCols++; return; }
    const kind = _itColumnKind(text);
    // Log columns (what the athlete writes in) are not part of the prescription.
    if (kind && kind !== 'log') cols.push({ c, kind });
  });
  if (setCols >= 2) return { setColumns: true, cols: [] };
  const metrics = cols.filter((x) => _IT_METRICS.includes(x.kind));
  const kinds = new Set(cols.map((x) => x.kind));
  // "Exercise | Work-up (load × reps)": one scheme column is a prescription on its own.
  const schemeHeader = kinds.has('exercise') && kinds.has('scheme');
  if ((metrics.length < 2 && !schemeHeader) || kinds.size < 2) return null;
  return { setColumns: false, cols, texts: (row || []).map(_itCellText) };
}

// Column groups of a header: one group, or one per repetition (weeks side by side).
// The columns repeat for weeks only when the sheet says so - week labels over
// them, or an exercise column of their own each (Juggernaut's four phases).
// "Sets | Reps | Weight | Reps" is one prescription and a log beside it: the
// second Reps is the athlete's, not another week.
function _itGroups(header, sideBySide) {
  const cols = header.cols.slice().sort((a, b) => a.c - b.c);
  const exerciseCols = cols.filter((x) => x.kind === 'exercise');
  const accCol = (cols.find((x) => x.kind === 'accessory') || {}).c;
  const rest = cols.filter((x) => x.kind !== 'exercise' && x.kind !== 'accessory');
  const counts = {};
  rest.forEach((x) => { counts[x.kind] = (counts[x.kind] || 0) + 1; });
  const repeated = (sideBySide || exerciseCols.length >= 2)
    ? Object.keys(counts).filter((k) => counts[k] >= 2 && _IT_METRICS.includes(k))
    : [];
  const groups = [];
  if (repeated.length) {
    // Each group starts at the first repeated kind that comes back.
    const starter = repeated.sort((a, b) => rest.findIndex((x) => x.kind === a) - rest.findIndex((x) => x.kind === b))[0];
    let cur = null;
    rest.forEach((x) => {
      if (x.kind === starter || !cur) { cur = { start: x.c, map: {} }; groups.push(cur); }
      if (cur.map[x.kind] == null) cur.map[x.kind] = x.c;
    });
  } else {
    const map = {};
    rest.forEach((x) => { if (map[x.kind] == null) map[x.kind] = x.c; });
    groups.push({ start: rest.length ? rest[0].c : 0, map });
  }
  // The exercise column: named, or the text column just left of the first metric.
  let exCol = exerciseCols.length ? exerciseCols[0].c : null;
  if (exCol == null) {
    const firstMetric = Math.min(...rest.map((x) => x.c));
    exCol = Math.max(0, firstMetric - 1);
  }
  // Each group reads its exercise from the exercise column that opens it, when there are several.
  if (exerciseCols.length >= 2 && groups.length >= 2) {
    groups.forEach((g) => {
      const own = exerciseCols.filter((x) => x.c < g.start).pop();
      if (own) g.exCol = own.c;
    });
  }
  // A scheme column: its header says whether the steps are load × reps or sets × reps.
  const schemeCol = rest.find((x) => x.kind === 'scheme');
  const loadFirst = schemeCol ? /\b(load|carico|kg|peso|weight|work ?-?up)\b/i.test(_itFold(header.texts ? header.texts[schemeCol.c] : '')) : false;
  return { exCol, groups, accCol, schemeLoadFirst: loadFirst };
}

function _itWeekLabel(text) {
  const t = String(text || '').trim();
  const m = t.match(_IT_WEEK_RE);
  if (m) return { n: Number(m[1]), label: t };
  // "ACCUMULATION PHASE - WEEK 1", "Fase 2 · settimana 6": a heading that ends with its week.
  const tail = t.length <= 50 ? t.match(/[-–—:·|,]\s*(?:week|wk|settimana|sett\.?|woche)\s*\.?\s*(\d{1,2})\s*$/i) : null;
  if (tail) return { n: Number(tail[1]), label: t };
  if (_IT_WEEK_EXTRA_RE.test(t)) return { n: null, label: t };
  return null;
}
function _itDayLabel(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const m = t.match(_IT_DAY_RE);
  // A letter counts only as a capital: "Day A", not "day a ..." in a sentence.
  if (m && (/\d/.test(m[1]) || m[1] === m[1].toUpperCase())) return { n: /\d/.test(m[1]) ? Number(m[1]) : m[1].charCodeAt(0) - 64, label: t };
  if (_IT_DAY_WORD_RE.test(_itFold(t))) return { n: null, label: t };
  return null;
}
function _itIsDateCell(cell) {
  if (!cell) return false;
  if (cell.t === 'd' || cell.v instanceof Date) return true;
  const text = _itCellText(cell);
  if (typeof cell.v === 'number' && cell.v > 20000 && cell.v < 80000 && /[a-z]{3,}|\d{1,2}[\/.-]\d{1,2}/i.test(text)) return true;
  return /^\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?$/.test(text);
}

// Cells a formula reads: B13, $B$13, 'Weeks 1-16'!$B$13, Massimali!B2.
function _itFormulaRefs(formula, sheetName) {
  const refs = [];
  const re = /(?:'([^']+)'|([A-Za-z_][\w.]*))?!?\$?([A-Z]{1,3})\$?(\d{1,5})/g;
  const f = String(formula || '');
  let m;
  while ((m = re.exec(f))) {
    const whole = m[0];
    const sheet = whole.includes('!') ? (m[1] || m[2]) : sheetName;
    if (!whole.includes('!') && (m[1] || m[2])) continue; // a function name like ROUND followed by a ref without !
    refs.push(sheet + '!' + m[3] + m[4]);
  }
  return refs;
}

const _IT_LIFTS = [
  // Before squat: "Front Squat 205" is not the squat max.
  ['front_squat', /\b(front squat|squat frontale|frontkniebeuge)\b/],
  ['snatch', /^(snatch|strappo|reissen|reißen)$/],
  ['clean_jerk', /^(clean ?(?:&|and) ?jerk|c ?& ?j|slancio|stossen|stoßen)$/],
  ['squat', /\b(squat|kniebeuge|accosciata|sq)\b/],
  ['bench', /\b(bench(?: press)?|panca|bankdrucken|bankdruecken|bp|b)\b/],
  ['deadlift', /\b(deadlift|stacco|kreuzheben|dead|dl)\b/]
];

// The maxes a workbook states: "Squat | 280", "Squat projected max | 290",
// "Bestleistung Kniebeuge | 277.5", "MASSIMALI: SQ 105 B 60 DEAD 100".
function _itFindMaxes(sheets) {
  const found = [];
  const seen = new Set();
  sheets.forEach(({ name, grid }) => {
    // Statistics and lookup sheets list lifts next to counts, not maxes.
    if (/volume|calc|statist|\bstats?\b|klassen|class|dropdown|catalog|katalog/i.test(name)) return;
    grid.slice(0, 80).forEach((row, r) => {
      (row || []).slice(0, 14).forEach((cell, c) => {
        const text = _itFold(_itCellText(cell));
        if (!text || text.length > 70 || /variant|volume|nl\b|total|totale/.test(text)) return;
        const lift = _IT_LIFTS.find(([, re]) => re.test(text));
        if (!lift) return;
        if (/\b(sets?|reps?|serie|ripetizioni|x\d)/.test(text)) return;
        for (let k = c + 1; k <= c + 3 && k < row.length; k++) {
          const v = row[k] && typeof row[k].v === 'number' ? row[k].v : null;
          // "Squat | Warm Up | 180" is a program row: a max sits right after its label.
          if (v == null) { if (_itCellText(row[k])) break; continue; }
          if (v < 20 || v > 500) break;
          // The column's header, a few rows up: "WAVE TRAINING MAX" is not a 1RM.
          let colHead = '';
          for (let u = r - 1; u >= Math.max(0, r - 60) && !colHead; u--) {
            const h = _itFold(_itCellText((grid[u] || [])[k]));
            if (h && !/^\d/.test(h)) colHead = h;
          }
          const kind = /training max|\btm\b|massimale allenante|trainingsmax/.test(text + ' ' + colHead) ? 'training'
            : (/projected|ziel|target|obiettivo|previst|goal|e1rm/.test(text) ? 'projected' : 'current');
          const key = lift[0] + '|' + kind + '|' + v;
          const entry = { lift: lift[0], value: v, kind, sheet: name, addr: name + '!' + row[k].addr, label: _itCellText(cell) };
          if (seen.has(key)) entry.duplicate = true;
          seen.add(key);
          found.push(entry);
          break;
        }
      });
    });
  });
  return found;
}

// 'lb' when the workbook says its loads are pounds, else 'kg'.
function _itWorkbookUnit(sheets) {
  let mentionsLb = false;
  let rounding5 = false;
  for (const { grid } of sheets) {
    for (let r = 0; r < Math.min(grid.length, 200); r++) {
      const row = grid[r] || [];
      for (let c = 0; c < Math.min(row.length, 30); c++) {
        const t = _itFold(_itCellText(row[c]));
        if (!t) continue;
        // A load column headed in pounds.
        if (t.length <= 30 && /^(weight|load|peso|carico)\s*\(?\s*(lbs?|pounds?)\s*\)?$/.test(t)) return 'lb';
        if (t.length <= 30 && /^(weight|load|peso|carico)\s*\(\s*kg\s*\)$/.test(t)) return 'kg';
        // "Do you track your weights in kilograms or pounds? | kg": the answer decides.
        if (/(kilo(gram)?s? or pounds|kg or lbs?|pounds or kilo|unita di misura|units?\b.*\b(kg|lb))/.test(t)) {
          const around = [row[c + 1], (grid[r + 1] || [])[c + 1], (grid[r + 1] || [])[c]].map((x) => _itFold(_itCellText(x)));
          const ans = around.find((x) => /^(kg|kgs|kilo\w*|lbs?|pounds?)$/.test(x));
          if (ans) return /^(lbs?|pounds?)$/.test(ans) ? 'lb' : 'kg';
          continue;
        }
        if (/\b(lbs?|pounds?)\b/.test(t)) mentionsLb = true;
        // "Rounding | 5": the plate step the loads are rounded to.
        if (/^(rounding|arrotondamento|round to|rundung)$/.test(t)) {
          for (let k = c + 1; k <= c + 2 && k < row.length; k++) {
            if (row[k] && typeof row[k].v === 'number') { if (row[k].v === 5) rounding5 = true; break; }
          }
        }
      }
    }
  }
  return mentionsLb && rounding5 ? 'lb' : 'kg';
}

function _itNewExercise(name, normalizeName) {
  const n = typeof normalizeName === 'function' ? normalizeName(name) : null;
  return {
    name_original: name,
    normalized: n,
    groups: [],
    notes: []
  };
}

function _itIsPlaceholder(name) {
  return _IT_PLACEHOLDER_RE.test(_itFold(name));
}

// Reads one sheet into weeks. Returns { weeks: [{ label, n, days: [{ label, exercises }] }], found }.
function _itParseSheet(sheet, ctx) {
  const { grid, name } = sheet;
  const sheetWeek = _itWeekLabel(name);
  const weeks = []; // in order of appearance
  const weekByKey = new Map();
  let header = null; // { exCol, groups: [{ start, map, weekKey }] , setColumns }
  let singleWeekKey = null;
  let dayIndex = 0;
  let dayLabel = null;
  let dayStartedRow = -10;
  let dayFromNumberedMarker = false;
  let lastExercise = null; // per group index
  let found = 0;

  const weekKeyFor = (n, label) => {
    // An unnumbered week (a meet week, a sheet with no week label) is one
    // week per label, not one per row that asks.
    const key = n != null ? 'n' + n : 'l' + label;
    if (!weekByKey.has(key)) {
      const w = { n, label, days: [] };
      weekByKey.set(key, w);
      weeks.push(w);
    }
    return key;
  };
  const dayOf = (weekKey) => {
    const w = weekByKey.get(weekKey);
    while (w.days.length <= dayIndex) w.days.push({ label: null, exercises: [] });
    const d = w.days[dayIndex];
    if (!d.label && dayLabel) d.label = dayLabel;
    return d;
  };
  const newDay = (rawLabel, fromNumbered, r) => {
    // "WEEK 1, Day 2" copied into every block of a side-by-side sheet: the day is what it names.
    const label = String(rawLabel || '').replace(/^(?:week|wk|settimana|woche)\s*\d+\s*[,;:\-]\s*/i, '') || rawLabel;
    const anyContent = weeks.some((w) => w.days[dayIndex] && w.days[dayIndex].exercises.length);
    if (anyContent) dayIndex++;
    dayLabel = label;
    dayStartedRow = r;
    dayFromNumberedMarker = !!fromNumbered;
    lastExercise = null;
  };
  const newWeek = (wl) => {
    singleWeekKey = weekKeyFor(wl.n, wl.label);
    dayIndex = 0;
    dayLabel = null;
    lastExercise = null;
  };
  if (sheetWeek) newWeek(sheetWeek);

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || [];
    const texts = row.map(_itCellText);
    const filled = texts.map((t, c) => (t ? c : -1)).filter((c) => c >= 0);
    if (!filled.length) continue;

    // A title alone on its row, right over a header ("Push Workout", "Day 1 -
    // Chest and Side Delts", "Monday - Run + Lower Body"): the day that table is.
    if (filled.length === 1 && texts[filled[0]].length <= 70 && !/:$/.test(texts[filled[0]])) {
      const lone = texts[filled[0]];
      const pureWeek = _itWeekLabel(lone) && !_itDayLabel(lone);
      let next = r + 1;
      while (next < grid.length && !(grid[next] || []).some((c) => _itCellText(c))) next++;
      const nh = next < grid.length ? _itHeaderOf(grid[next]) : null;
      if (!pureWeek && nh && !nh.setColumns && nh.cols.some((x) => x.kind === 'exercise')) {
        const dlLone = _itDayLabel(lone);
        newDay(lone, !!(dlLone && dlLone.n != null), r);
        continue;
      }
    }

    // Week labels side by side (WEEK 1 | WEEK 2 | ...): the next header takes them.
    // On the header row itself ("Exercise | Sets | Reps | Wk1 | Wk2 ... Wk8") they
    // are columns to log each week in: the program runs that many weeks.
    const weekCells = filled.map((c) => ({ c, wl: _itWeekLabel(texts[c]) })).filter((x) => x.wl && x.wl.n != null);
    const headerHere = weekCells.length >= 2 ? _itHeaderOf(row) : null;
    if (headerHere && !headerHere.setColumns && headerHere.cols.some((x) => x.kind === 'exercise')) {
      sheet._logWeeks = Math.max(sheet._logWeeks || 0, weekCells.length);
    } else if (weekCells.length >= 2) {
      header = null;
      sheet._pendingWeekCols = weekCells;
      dayIndex = 0;
      dayLabel = null;
      continue;
    }

    const h = _itHeaderOf(row);
    if (h) {
      const first = texts[filled[0]];
      const wl = _itWeekLabel(first);
      const dl = _itDayLabel(first);
      if (h.setColumns) {
        header = { setColumns: true, exCol: 0, groups: [{ start: 1, map: {} }] };
      } else {
        // Side by side when week labels sit over it, or when it continues a block
        // whose first header had them (Calgary's day 2, 3, 4).
        const continuesWeeks = !!(header && !header.setColumns && header.groups.length >= 2 && header.groups[0].weekKey);
        const g = _itGroups(h, !!sheet._pendingWeekCols || continuesWeeks);
        // Columns a header leaves unnamed keep the previous header's meaning (a week that dropped "%").
        if (header && !header.setColumns && header.groups.length === g.groups.length) {
          g.groups.forEach((gr, i) => {
            const prev = header.groups[i].map;
            Object.keys(prev).forEach((k) => { if (gr.map[k] == null && !Object.values(gr.map).includes(prev[k])) gr.map[k] = prev[k]; });
          });
        }
        // The next header of a side-by-side block (day 2, day 3...) keeps the
        // weeks its columns had.
        if (header && !header.setColumns && header.groups.length === g.groups.length && header.groups.length >= 2 && header.groups[0].weekKey && !sheet._pendingWeekCols) {
          g.groups.forEach((gr, i) => { gr.weekKey = header.groups[i].weekKey; });
        }
        header = { setColumns: false, exCol: g.exCol, groups: g.groups, accCol: g.accCol, schemeLoadFirst: g.schemeLoadFirst };
      }
      if (sheet._pendingWeekCols && header.groups.length >= 2) {
        const labels = sheet._pendingWeekCols;
        header.groups.forEach((gr) => {
          const lab = labels.filter((x) => x.c <= gr.start).pop() || labels[0];
          gr.weekKey = weekKeyFor(lab.wl.n, lab.wl.label);
        });
        sheet._pendingWeekCols = null;
      } else if (sheet._pendingWeekCols && header.groups.length === 1) {
        newWeek(sheet._pendingWeekCols[0].wl);
        sheet._pendingWeekCols = null;
      }
      if (wl && !(header.groups.length >= 2 && header.groups[0].weekKey)) newWeek(wl);
      if (header.groups.length >= 2 && header.groups[0].weekKey) {
        // The header of the first day of a side-by-side block.
      }
      if (dl) newDay(dl.label, dl.n != null, r);
      continue;
    }

    // A marker row: a week or a day on its own. A row with numbers in the
    // metric columns is data even when it starts with a label (Tag 1 | squat | 50% ...).
    const rowHasMetrics = !!(header && !header.setColumns && header.groups.some((g) => _IT_METRICS.some((k) => g.map[k] != null && texts[g.map[k]])));
    const lead = texts[filled[0]];
    const wlOnly = _itWeekLabel(lead);
    const dlOnly = _itDayLabel(lead);
    const markerRow = filled.length <= 3 || (filled.length >= 1 && header && filled[0] < header.exCol);
    if (!rowHasMetrics && wlOnly && (!header || filled[0] <= header.exCol) && !(header && header.groups.length >= 2 && header.groups[0].weekKey)) {
      if (!dlOnly) { newWeek(wlOnly); header = header && header.groups.length >= 2 ? null : header; continue; }
    }
    if (!rowHasMetrics && dlOnly && markerRow && (!header || filled[0] <= header.exCol) && !(header && texts[header.exCol] && filled.length > 2 && filled[0] === header.exCol)) {
      if (dlOnly.n == null && dayFromNumberedMarker && r - dayStartedRow <= 1) continue; // "Tag 1" then its date
      newDay(dlOnly.label, dlOnly.n != null, r);
      if (filled.length === 1) continue;
    }
    if (!header) continue;

    // A data row.
    const leftCells = filled.filter((c) => c < header.exCol);
    const leftLabel = leftCells.find((c) => _itDayLabel(texts[c])) ?? leftCells[0];
    if (leftLabel != null) {
      const t = texts[leftLabel];
      const isOrder = /^\d{1,2}$/.test(t);
      if (!isOrder) {
        const dl = _itDayLabel(t);
        const isDate = _itIsDateCell(row[leftLabel]);
        if (dl || isDate || /^[a-z]/i.test(t)) {
          if (!(dayFromNumberedMarker && r - dayStartedRow <= 1 && (isDate || (dl && dl.n == null)))) {
            if (!(dl && dl.n == null && r === dayStartedRow)) newDay(t, dl && dl.n != null, r);
          }
        }
      }
    }
    const exText = texts[header.exCol] || '';
    if (header.setColumns) {
      if (!exText) continue;
      if (exText.length > 60 && filled.length === 1) { if (lastExercise && lastExercise[0]) lastExercise[0].notes.push(exText); continue; }
      const sets = [];
      let pendingLoad = null;
      for (let c = header.exCol + 1; c < row.length; c++) {
        const cell = row[c];
        const t = texts[c];
        if (!t || _itIsPlaceholder(t)) continue;
        if (/^x/i.test(t)) {
          sets.push({ reps: _itReps(cell), load: pendingLoad });
          pendingLoad = null;
        } else {
          const ld = _itLoad(cell);
          if (ld != null) pendingLoad = ld;
        }
      }
      // Placeholders, and slots with nothing prescribed, are not exercises.
      if (_itIsPlaceholder(exText) || !sets.length) continue;
      const weekKey = singleWeekKey || weekKeyFor(null, name);
      const day = dayOf(weekKey);
      const ex = _itNewExercise(exText, ctx.normalizeName);
      sets.forEach((s) => ex.groups.push({ sets: 1, reps: s.reps, load: s.load }));
      day.exercises.push(ex);
      lastExercise = [ex];
      found++;
      continue;
    }

    const groups = header.groups;
    // Assistance work in its own column (names only, under a "SUPPLEMENTARY:"
    // heading): kept for the end of the day, in every week of the block.
    if (header.accCol != null) {
      const acc = texts[header.accCol];
      if (acc && !/:\s*$/.test(acc) && !_itIsPlaceholder(acc) && acc.length <= 60) {
        const keys = [...new Set(groups.map((g) => g.weekKey || singleWeekKey || weekKeyFor(sheetWeek ? sheetWeek.n : null, name)))];
        keys.forEach((k) => {
          const d = dayOf(k);
          if (!d.accessories) d.accessories = [];
          if (!d.accessories.some((a) => _itFold(a) === _itFold(acc))) d.accessories.push(acc);
        });
      }
    }
    // Long free text in the exercise column only: a note for the exercise above.
    const metricFilled = groups.some((g) => _IT_METRICS.some((k) => g.map[k] != null && texts[g.map[k]]));
    if (!metricFilled) {
      // Long free text: a note for the exercise above. A bare name with
      // nothing prescribed ("Meet", a sign-off) is not an exercise - unless
      // the row says what to do some other way ("Run | AM: 5-mile run") or
      // the name carries it ("100 Push-Ups"): then it is one, without
      // invented sets or reps.
      if (exText && exText.length > 50 && lastExercise) { lastExercise.forEach((e) => e && e.notes.push(exText)); continue; }
      const others = filled.filter((c) => c !== header.exCol && c > header.exCol).map((c) => texts[c]).filter(Boolean);
      if (exText && groups.length === 1 && !/:\s*$/.test(exText) && !_itIsPlaceholder(exText) && !_itWeekLabel(exText) && !_itDayLabel(exText) &&
          (others.length || /^\d{1,4}\s+[a-z]/i.test(exText))) {
        const weekKey = groups[0].weekKey || singleWeekKey || weekKeyFor(sheetWeek ? sheetWeek.n : null, name);
        const ex = _itNewExercise(exText, ctx.normalizeName);
        others.forEach((t) => ex.notes.push(t));
        dayOf(weekKey).exercises.push(ex);
        lastExercise = [ex];
        found++;
      }
      continue;
    }
    // Totals under a day (Sheiko: "Squat | 74 lifts | 10195 kg"): not sets.
    const summaryRow = groups.some((g) => {
      const ld = g.map.load != null && row[g.map.load] ? row[g.map.load].v : null;
      const rp = g.map.reps != null && row[g.map.reps] ? row[g.map.reps].v : null;
      return (typeof ld === 'number' && ld >= 1000) || (typeof rp === 'number' && rp > 60);
    }) || /^(total|totale|summe|gesamt|nl)$/i.test(exText);
    if (summaryRow) { lastExercise = null; continue; }
    if (exText && _itIsPlaceholder(exText)) { lastExercise = null; continue; }
    const perGroup = [];
    groups.forEach((g, gi) => {
      const m = g.map;
      const cell = (k) => (m[k] != null ? row[m[k]] : null);
      const txt = (k) => (m[k] != null ? texts[m[k]] : '');
      // Each phase of a side-by-side block names its own exercise.
      const gEx = g.exCol != null ? (texts[g.exCol] || '') : exText;
      // "TARGET: | 10", "ACHIEVED: | 42.5": what the athlete is to beat or did, not a set.
      if (_IT_METRICS.some((k) => m[k] != null && /^[a-z][a-z .]{2,20}:\s*$/i.test(texts[m[k]] || ''))) { perGroup[gi] = null; return; }
      const weekKeyG = g.weekKey || singleWeekKey || weekKeyFor(sheetWeek ? sheetWeek.n : null, name);
      const place = (list) => {
        // A new exercise with these groups, or more sets of the one above.
        const day = dayOf(weekKeyG);
        const prev = lastExercise && lastExercise[gi];
        const sameAsPrev = prev && gEx && _itFold(prev.name_original) === _itFold(gEx) && day.exercises[day.exercises.length - 1] === prev;
        if ((!gEx && prev && day.exercises[day.exercises.length - 1] === prev) || sameAsPrev) {
          list.forEach((x) => prev.groups.push(x));
          perGroup[gi] = prev;
          return;
        }
        if (!gEx) { perGroup[gi] = null; return; }
        const ex = _itNewExercise(gEx, ctx.normalizeName);
        list.forEach((x) => ex.groups.push(x));
        day.exercises.push(ex);
        perGroup[gi] = ex;
        found++;
      };
      const base = { pct: null, load: null, rpe: null, rir: null, rest: _itRest(cell('rest')), tempo: txt('tempo') || null, note: txt('notes') || null, loadFormula: null, loadRefs: [], extra: null };
      // A whole scheme in one cell: "95×3, 100×2, 110×1" or "reps: 10, 10, 10".
      if (m.scheme != null && txt('scheme')) {
        const steps = _itSchemeGroups(txt('scheme'), header.schemeLoadFirst);
        if (steps) {
          const f = cell('scheme') && cell('scheme').f ? String(cell('scheme').f) : null;
          const fsteps = f ? _itFormulaSteps(f, name) : [];
          const byFormula = fsteps.length === steps.length;
          place(steps.map((st, i) => Object.assign({}, base, st, {
            pct: byFormula ? _itRound(fsteps[i].factor * 100, 1) : null,
            loadFormula: byFormula ? f : null,
            loadRefs: byFormula ? [fsteps[i].ref] : []
          })));
          return;
        }
        if (gEx) {
          const ex = _itNewExercise(gEx, ctx.normalizeName);
          ex.notes.push(txt('scheme'));
          dayOf(weekKeyG).exercises.push(ex);
          perGroup[gi] = ex;
          found++;
        }
        return;
      }
      const setsInfo = _itSets(cell('sets'));
      const repsDetail = _itRepsDetail(cell('reps'));
      let reps = repsDetail ? repsDetail.reps : null;
      // "2x20, 2-3x3-4, 1x6-8" in the reps column: the groups themselves; the
      // sets column ("5-6") is their total, kept as a note.
      if (!repsDetail && txt('reps')) {
        const steps = _itSchemeGroups(txt('reps'), false);
        if (steps) {
          const setsNote = txt('sets') && setsInfo.n == null ? txt('sets') + ' serie in tutto' : null;
          place(steps.map((st, i) => Object.assign({}, base, st, { note: [i === 0 ? setsNote : null, base.note].filter(Boolean).join(' · ') || null })));
          return;
        }
      }
      let pct = _itPct(cell('pct'), true);
      let rpe = _itRpe(txt('rpe')) ?? (_itNum(txt('rpe')) != null && _itNum(txt('rpe')) <= 10 ? _itNum(txt('rpe')) : null);
      let rir = _itRir(txt('rir')) ?? (_itNum(txt('rir')) != null && _itNum(txt('rir')) <= 6 ? _itNum(txt('rir')) : null);
      let load = _itLoad(cell('load'));
      const loadText = txt('load');
      // A load column holding "8RPE" or "65%" (Calgary weeks 5-8) says intensity, not kilos.
      if (load == null && loadText) {
        if (pct == null) pct = _itPct(cell('load'), false);
        if (rpe == null) rpe = _itRpe(loadText);
      }
      const pctText = txt('pct');
      if (pct == null && pctText && rpe == null) rpe = _itRpe(pctText);
      const loadFormula = m.load != null && row[m.load] && row[m.load].f ? String(row[m.load].f) : null;
      // "12, 10, 12": one number a set. It sets the count when the sets column
      // agrees or says nothing; otherwise it stays as written, in a note.
      let repsList = null;
      let listNote = null;
      if (repsDetail && repsDetail.list) {
        if (setsInfo.n == null || setsInfo.n === repsDetail.list.length) repsList = repsDetail.list;
        else listNote = 'Ripetizioni: ' + txt('reps');
      }
      const anyValue = setsInfo.n != null || reps != null || repsList != null || pct != null || load != null || rpe != null;
      if (!anyValue) {
        // A name with words where the numbers go ("Run | AM: 5-mile run",
        // "Superset"), nothing else: the exercise, unprescribed, with those words.
        const words = filled.filter((c) => c > header.exCol).map((c) => texts[c]).filter(Boolean);
        // "Rest | Foam rolling, stretching": a rest day, not an exercise.
        const restDay = /^(rest|riposo|recovery|recupero|off|day off|ruhetag)$/i.test(gEx.trim());
        if (gEx && words.length && groups.length === 1 && !restDay) {
          const ex = _itNewExercise(gEx, ctx.normalizeName);
          words.forEach((t) => ex.notes.push(t));
          dayOf(weekKeyG).exercises.push(ex);
          perGroup[gi] = ex;
          found++;
        } else perGroup[gi] = null;
        return;
      }
      const group = {
        sets: setsInfo.n != null ? setsInfo.n : (repsList ? repsList.length : 1),
        setsNote: setsInfo.note,
        reps,
        repsList,
        pct,
        load,
        rpe,
        rir,
        rest: _itRest(cell('rest')),
        tempo: txt('tempo') || null,
        note: [txt('notes') || null, repsDetail && repsDetail.note, listNote].filter(Boolean).join(' · ') || null,
        loadFormula,
        loadRefs: loadFormula ? _itFormulaRefs(loadFormula, name) : [],
        extra: (/opener/i.test(pctText) || /opener/i.test(loadText)) ? 'Opener' : null
      };
      place([group]);
    });
    lastExercise = perGroup;
  }
  // The assistance work of each day goes after its main lifts, names only.
  weeks.forEach((w) => w.days.forEach((d) => {
    (d.accessories || []).forEach((a) => d.exercises.push(_itNewExercise(a, ctx.normalizeName)));
    delete d.accessories;
  }));
  // "Wk1 ... Wk8" columns to log in, one week written: the same week, that many times.
  const kept = weeks.filter((w) => w.days.some((d) => d.exercises.length));
  if (sheet._logWeeks >= 2 && kept.length === 1) {
    const only = kept[0];
    for (let i = 2; i <= sheet._logWeeks; i++) {
      const copy = JSON.parse(JSON.stringify({ days: only.days }));
      kept.push({ n: i, label: 'Settimana ' + i, days: copy.days });
    }
    if (only.n == null) { only.n = 1; only.label = only.label && only.label !== name ? only.label : 'Settimana 1'; }
  }
  return { weeks: kept, found };
}

// Canonical exercise, as the rest of the importer builds them.
function _itCanonicalExercise(ex, ids, maxes) {
  const n = ex.normalized || {};
  const sets = [];
  const groupNotes = [];
  ex.groups.forEach((g) => {
    for (let i = 0; i < g.sets; i++) {
      const ref = _itLoadReference(g, maxes);
      const setReps = g.repsList ? (g.repsList[i] != null ? String(g.repsList[i]) : null) : g.reps;
      sets.push({
        set_number: sets.length + 1,
        order: sets.length + 1,
        set_type: 'working',
        technique: null,
        target_load: g.load != null ? g.load : null,
        load: g.load != null ? g.load : null,
        target_reps: setReps,
        reps: setReps,
        target_rir: g.rir != null ? g.rir : null,
        target_rpe: g.rpe != null ? g.rpe : null,
        percentage_1rm: g.pct != null ? g.pct : null,
        percent_of: ref,
        load_formula: g.loadFormula || null,
        rest_seconds: g.rest != null ? g.rest : null,
        tempo: g.tempo || null,
        notes: [g.note, g.setsNote, g.extra].filter(Boolean).join(' · ') || null
      });
    }
  });
  const first = sets[0] || {};
  const allSameReps = sets.length && sets.every((s) => s.target_reps === first.target_reps);
  const raw = sets.length ? (allSameReps ? `${sets.length}x${first.target_reps || '?'}` : sets.map((s) => (s.target_reps || '?')).join('/')) : null;
  ex.notes.forEach((t) => groupNotes.push(t));
  const out = {
    id: ids(),
    name: n.name_normalized || ex.name_original,
    name_original: ex.name_original,
    name_normalized: n.name_normalized || ex.name_original,
    movement: ex.name_original,
    muscle_group: n.muscle || null,
    muscle_groups: n.muscles || [],
    mappingConfidence: n.confidence != null ? n.confidence : 0.5,
    mappingSource: 'table',
    sets_count: sets.length,
    reps_target: first.target_reps || null,
    reps_raw: raw,
    scheme: raw,
    rir_target: first.target_rir != null ? first.target_rir : null,
    rpe_target: first.target_rpe != null ? first.target_rpe : null,
    percentage_1rm: first.percentage_1rm != null ? first.percentage_1rm : null,
    rest_seconds: first.rest_seconds != null ? first.rest_seconds : null,
    load_target: first.target_load != null ? first.target_load : null,
    load_value: first.target_load != null ? first.target_load : null,
    notes: groupNotes.join(' · ') || null,
    sets,
    sets_data: sets
  };
  // The max this exercise's percentages are of, when its formulas all say the same one.
  const liftsRead = [...new Set(sets.filter((s) => s.percent_of && s.percent_of.lift).map((s) => s.percent_of.lift))];
  if (liftsRead.length === 1) out.percent_lift = liftsRead[0];
  if (sets.length) {
    out.prescription = {
      sets: sets.length,
      reps: first.target_reps || null,
      reps_pattern: allSameReps ? null : sets.map((s) => s.target_reps),
      raw,
      technique: null,
      locked: true,
      source: 'locked'
    };
    out.reps_pattern = out.prescription.reps_pattern;
  } else {
    out.setsInferred = true;
    out.reviewFlags = ['NO_PRESCRIPTION'];
  }
  return out;
}

// Which max a load is a percentage of: the max cell its formula reads, else
// the lift its % belongs to by name is left to the review.
function _itLoadReference(group, maxes) {
  if (!group.loadRefs || !group.loadRefs.length || !maxes.length) return null;
  for (const ref of group.loadRefs) {
    const hit = maxes.find((m) => _itFold(m.addr).replace(/\$/g, '') === _itFold(ref).replace(/\$/g, ''));
    if (hit) return { lift: hit.lift, kind: hit.kind, addr: hit.addr, value: hit.value };
  }
  return null;
}

/**
 * Reads a SheetJS workbook (read with cellFormula) as training tables.
 * Returns { weeks, maxes, warnings, alternatives } - weeks in the canonical
 * shape ({ week_number, name, sessions: [{ session_number, name, exercises }] }).
 */
export function parseWorkbookTables(workbook, options = {}) {
  const XLSX = options.XLSX || (typeof self !== 'undefined' && self.XLSX) || (typeof globalThis !== 'undefined' && globalThis.XLSX);
  const out = { weeks: [], maxes: [], warnings: [], alternatives: [] };
  if (!workbook || !XLSX) return out;
  const sheets = (workbook.SheetNames || []).map((name) => ({ name, grid: _itGrid(workbook.Sheets[name], XLSX) }));
  out.maxes = _itFindMaxes(sheets);
  let exId = 0;
  const ids = () => 'tbl_e_' + (++exId);
  const programs = []; // one per sheet that holds a program
  sheets.forEach((sheet) => {
    const parsed = _itParseSheet(sheet, { normalizeName: options.normalizeName });
    if (parsed.found && parsed.weeks.length) programs.push({ sheet: sheet.name, weeks: parsed.weeks });
  });
  // Sheets that start again from week 1 are alternatives (3-day and 4-day
  // versions, three Sheiko programs), not the continuation.
  let lastWeekNo = 0;
  const kept = [];
  programs.forEach((p, i) => {
    const firstNo = p.weeks.find((w) => w.n != null);
    const restarts = kept.length && firstNo && firstNo.n <= lastWeekNo;
    if (restarts) {
      out.alternatives.push({ sheet: p.sheet, weeks: p.weeks.length });
      return;
    }
    kept.push(p);
    p.weeks.forEach((w) => { if (w.n != null) lastWeekNo = Math.max(lastWeekNo, w.n); });
  });
  if (out.alternatives.length) {
    out.warnings.push('Il file contiene piu\' programmi alternativi: importato "' + kept[0].sheet + '", non importati: ' + out.alternatives.map((a) => '"' + a.sheet + '"').join(', ') + '.');
  }
  const maxesForLoads = out.maxes;
  const weeks = [];
  kept.forEach((p) => p.weeks.forEach((w) => weeks.push(w)));
  weeks.forEach((w, wi) => {
    const sessions = w.days.filter((d) => d.exercises.length).map((d, di) => ({
      session_number: di + 1,
      name: d.label || ('Giorno ' + (di + 1)),
      exercises: d.exercises.map((e) => _itCanonicalExercise(e, ids, maxesForLoads))
    }));
    out.weeks.push({
      week_number: wi + 1,
      weekNumber: wi + 1,
      name: w.label || ('Settimana ' + (wi + 1)),
      label: w.label || null,
      source_week: w.n,
      sessions,
      days: sessions
    });
  });
  // Loads in pounds: stated in a load header ("Weight (lbs)"), or by the
  // rounding the loads are built with (5, where the sheet says "5 for lb
  // plates"). The app counts in kg: loads and maxes are converted, the % stay.
  out.unit = _itWorkbookUnit(sheets);
  if (out.unit === 'lb') {
    const kg = (lb) => Math.round((lb * 0.45359237) / 0.5) * 0.5;
    out.weeks.forEach((w) => w.sessions.forEach((s) => s.exercises.forEach((e) => {
      (e.sets || []).forEach((st) => {
        if (typeof st.target_load === 'number') st.target_load = kg(st.target_load);
        if (typeof st.load === 'number') st.load = kg(st.load);
        if (st.percent_of && typeof st.percent_of.value === 'number') st.percent_of = Object.assign({}, st.percent_of, { value: kg(st.percent_of.value) });
      });
      if (typeof e.load_target === 'number') { e.load_target = kg(e.load_target); e.load_value = e.load_target; }
    })));
    out.maxes.forEach((m) => { m.value_lb = m.value; m.value = kg(m.value); });
    out.warnings.push('Il file e\' in libbre (lb): carichi e massimali convertiti in kg; le percentuali restano quelle del file.');
  }
  // The max each lift's loads are computed from: the one the formulas read
  // most, else the first stated.
  const uses = new Map();
  out.weeks.forEach((w) => w.sessions.forEach((s) => s.exercises.forEach((e) => (e.sets || []).forEach((st) => {
    if (st.percent_of && st.percent_of.addr) uses.set(st.percent_of.addr, (uses.get(st.percent_of.addr) || 0) + 1);
  }))));
  out.primaryMaxes = {};
  [...new Set(out.maxes.map((m) => m.lift))].forEach((lift) => {
    const cands = out.maxes.filter((m) => m.lift === lift);
    if (!cands.length) return;
    const used = cands.filter((m) => uses.get(m.addr)).sort((a, b) => uses.get(b.addr) - uses.get(a.addr));
    const pick = used[0] || cands.find((m) => !m.duplicate) || cands[0];
    out.primaryMaxes[lift] = { value: pick.value, kind: pick.kind, addr: pick.addr, label: pick.label, fromFormulas: !!used.length };
  });
  return out;
}

// ---- Free-text lines (Word, PDF): the set schemes coaches write by hand ----

// A load increase written on the line: "+10KG X WEEK", "+ 2,5 X WEEK",
// "+2,5KG NELLA % A SETT ALTERNE", "(AUMENTARE 2,5KG A SETTIMANE ALTERNATE)".
function _itProgression(text) {
  const t = String(text || '').replace(/(\d),(\d)/g, '$1.$2');
  let m = t.match(/\+\s*(\d{1,3}(?:\.\d+)?)\s*(kg|%)?\s*(?:x|per|a|ogni|every|\/)?\s*(?:la\s+)?(?:week|settimana|sett\b|sett\.)/i)
    || t.match(/\+\s*(\d{1,3}(?:\.\d+)?)\s*(kg|%)?\s*(?:nella\s*%)?\s*(?:a|ogni|per)\s*(?:sett(?:imane|\.)?|settimana)\s*altern/i)
    || t.match(/aument\w*\s*(?:di\s*)?(\d{1,3}(?:\.\d+)?)\s*(kg|%)?\s*(?:nella\s*%)?\s*(?:a|ogni|per)\s*(?:sett(?:imane|\.)?|settimana|week)/i)
    || t.match(/\+\s*(\d{1,3}(?:\.\d+)?)\s*(kg|%)?\s*nella\s*%/i);
  if (!m) return null;
  const step = Number(m[1]);
  if (!Number.isFinite(step) || step <= 0 || step > 50) return null;
  const unit = /nella\s*%/i.test(t.slice(m.index, m.index + m[0].length + 20)) || m[2] === '%' ? '%' : 'kg';
  const every = /altern/i.test(t) ? 2 : 1;
  return { step, unit, every, raw: m[0].trim() };
}

/**
 * The sets a free-text line prescribes, when it says more than "NxM":
 *   "120x8/150x5/180x4/200x3/210x3/3/3/3"  load x reps, then reps at the last load
 *   "160KG X 1 X 3"                        load x reps x sets
 *   "3X3 AL 60% + 5X1 80%"                 groups with their own % (or RPE)
 * Returns { kind, groups: [{ sets, reps, load, pct, rpe }], progression, joinedByPlus } or null.
 */
export function parseSetLine(src) {
  const raw = String(src || '');
  const body = raw.replace(/(\d),(\d)/g, '$1.$2').replace(/×/g, 'x');
  const progression = _itProgression(raw);
  const afterName = body.includes(':') ? body.slice(body.indexOf(':') + 1) : body;
  const out = { kind: null, groups: [], progression, joinedByPlus: false };

  // Load x reps ladder.
  const ladder = afterName.match(/^\s*(\d{1,3}(?:\.\d+)?)\s*x\s*(\d{1,2})((?:\s*\/\s*(?:\d{1,3}(?:\.\d+)?\s*x\s*)?\d{1,2}(?![\d.]))+)/i);
  if (ladder && !/[&]/.test(afterName.slice(0, ladder[0].length + 2))) {
    const first = Number(ladder[1]);
    const tokens = ladder[3].split('/').map((x) => x.trim()).filter(Boolean);
    // "3x10/4x10/5x10" is a weekly progression (sets x reps every token),
    // not loads: loads are big, decimal, or followed by bare reps.
    const allSmallNxM = !/\./.test(ladder[1]) && first <= 12 && tokens.every((tk) => /^\d{1,2}\s*x\s*\d{1,3}$/i.test(tk) && Number(tk.split(/x/i)[0]) <= 12);
    const loadFirst = !allSmallNxM && (/\./.test(ladder[1]) || first > 12 || tokens.some((tk) => /x/i.test(tk)));
    if (loadFirst) {
      let load = first;
      out.groups.push({ sets: 1, reps: ladder[2], load });
      tokens.forEach((tk) => {
        const lm = tk.match(/^(\d{1,3}(?:\.\d+)?)\s*x\s*(\d{1,2})$/i);
        if (lm) { load = Number(lm[1]); out.groups.push({ sets: 1, reps: lm[2], load }); }
        else out.groups.push({ sets: 1, reps: tk, load });
      });
      out.kind = 'ladder';
      return out;
    }
  }
  // Load x reps x sets.
  const lrs = body.match(/(\d{2,3}(?:\.\d+)?)\s*kg\s*x\s*(\d{1,2})\s*x\s*(\d{1,2})\b/i);
  if (lrs) {
    out.groups.push({ sets: Number(lrs[3]), reps: lrs[2], load: Number(lrs[1]) });
    out.kind = 'load_reps_sets';
    return out;
  }
  // Groups joined by "+" or "POI", each with its own intensity, and reps set
  // by set: "10-8-8-6", "8-10-8-6-4 @8", "10-8-6 POI 3X3 BOARD @8".
  const parts = afterName.split(/\s\+\s*|\+\s(?=\d)|\bpoi\b|\bthen\b/i).map((p) => p.trim()).filter(Boolean);
  const partRe = /(\d{1,2})\s*x\s*(\d{1,3}(?:-\d{1,3})?)(?![\d.%])/i;
  const repLadderRe = /(?:^|[^\dx.,:\/])(\d{1,2}(?:\s*-\s*\d{1,2}){2,})(?![\dx.,%])/i;
  const rpeOf = (s) => {
    // "RPE 8", "@8", "difficolta' 8 su 10" (how hard, out of ten: an RPE).
    const m = String(s || '').match(/rpe\s*(\d{1,2}(?:\.5)?)/i) || String(s || '').match(/@\s*(\d{1,2}(?:\.5)?)(?!\s*(?:kg|%|\d))/i)
      || String(s || '').match(/difficolt\S*\s*(\d{1,2}(?:[.,]5)?)\s*(?:su|\/)\s*10/i);
    const v = m ? Number(m[1]) : null;
    return v != null && v >= 1 && v <= 10 ? v : null;
  };
  const groups = [];
  let ladderSeen = false;
  parts.forEach((p) => {
    const lad = /tempo|tut/i.test(p) ? null : p.match(repLadderRe);
    const nxm = p.match(partRe);
    if (lad && (!nxm || lad.index < nxm.index)) {
      const reps = lad[1].split('-').map((x) => x.trim()).filter(Boolean);
      if (reps.every((r) => Number(r) >= 1 && Number(r) <= 50) && !reps.every((r) => Number(r) <= 5 && reps.includes('0'))) {
        const pm = p.slice(lad.index + lad[0].length).match(/^\s*(?:al|at|@|a)?\s*(\d{1,3}(?:\.\d+)?)\s*%/i);
        const rpe = rpeOf(p.slice(lad.index + lad[0].length));
        reps.forEach((r) => groups.push({ sets: 1, reps: r, pct: pm ? Number(pm[1]) : null, rpe, load: null }));
        ladderSeen = true;
        return;
      }
    }
    if (!nxm) return;
    const tail = p.slice(nxm.index + nxm[0].length);
    const pm = tail.match(/^\s*(?:al|at|@|a)?\s*(\d{1,3}(?:\.\d+)?)\s*%/i);
    const km = tail.match(/^\s*@?\s*(\d{2,3}(?:\.\d+)?)\s*kg/i) || tail.match(/^\s*@\s*(\d{2,3}(?:\.\d+)?)(?!\s*%)/);
    groups.push({ sets: Number(nxm[1]), reps: nxm[2], pct: pm ? Number(pm[1]) : null, rpe: rpeOf(tail), load: km ? Number(km[1]) : null });
  });
  if (groups.length >= 2) {
    out.groups = groups;
    out.kind = ladderSeen ? 'rep_ladder' : 'compound';
    out.joinedByPlus = true;
    return out;
  }
  // One NxM with an intensity the "NxM" reading leaves out ("4X4 @8",
  // "7x5 difficolta' 8 su 10"). Not a weekly ladder "3x10-4x10-5x10": that
  // is one scheme per week, read by the week expansion.
  const schemes = (afterName.match(/\d{1,2}\s*x\s*\d{1,3}/gi) || []).length;
  if (groups.length === 1 && schemes === 1 && groups[0].rpe != null) {
    out.groups = groups;
    out.kind = 'single';
    return out;
  }
  if (progression) {
    out.kind = 'progression_only';
    return out;
  }
  return null;
}

// ---- OCR of a photographed sheet ----
//
// Tesseract reads a page line by line straight across: on a sheet in two
// columns, "Giorno 1" of the left column and "pullover cavi..." of the right
// one come out as one line, and the days mix. The words come with their
// boxes; the gutter between the columns is where no word stands, so the text
// is rebuilt column by column, top to bottom, left column first.
function _itWordBox(w) {
  if (!w) return null;
  const t = String(w.text != null ? w.text : (w.t != null ? w.t : '')).trim();
  const b = w.bbox ? [w.bbox.x0, w.bbox.y0, w.bbox.x1, w.bbox.y1] : (Array.isArray(w.b) ? w.b : null);
  if (!t || !b || b.some((n) => !Number.isFinite(Number(n)))) return null;
  return { t, x0: Number(b[0]), y0: Number(b[1]), x1: Number(b[2]), y1: Number(b[3]), c: Number(w.confidence != null ? w.confidence : w.c) };
}
function _itLines(words) {
  const sorted = words.slice().sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
  const heights = sorted.map((w) => w.y1 - w.y0).filter((h) => h > 0).sort((a, b) => a - b);
  const h = heights.length ? heights[Math.floor(heights.length / 2)] : 10;
  const lines = [];
  sorted.forEach((w) => {
    const cy = (w.y0 + w.y1) / 2;
    const line = lines.find((l) => Math.abs(l.cy - cy) <= h * 0.55);
    if (line) { line.words.push(w); line.cy = (line.cy * (line.words.length - 1) + cy) / line.words.length; }
    else lines.push({ cy, words: [w] });
  });
  return lines.sort((a, b) => a.cy - b.cy).map((l) => l.words.sort((a, b) => a.x0 - b.x0).map((w) => w.t).join(' '));
}
export function reflowOcrColumns(rawWords) {
  const words = (rawWords || []).map(_itWordBox).filter(Boolean);
  if (words.length < 20) return null;
  const width = Math.max(...words.map((w) => w.x1));
  // The vertical line in the middle that the fewest words cross. A heading
  // across the whole page (the gym's name over both columns) crosses it and a
  // long line may overflow into the gutter: a few crossings still mean two
  // columns, many mean one block of text.
  const step = Math.max(1, Math.round(width / 400));
  let gutter = -1;
  let fewest = Infinity;
  let runStart = -1;
  for (let x = Math.round(width * 0.3); x <= width * 0.7; x += step) {
    const n = words.filter((w) => w.x0 < x && w.x1 > x).length;
    if (n < fewest) { fewest = n; gutter = x; runStart = x; }
    else if (n === fewest && runStart >= 0 && x - gutter <= step * 2) gutter = Math.round((runStart + x) / 2);
  }
  if (gutter < 0 || fewest > Math.max(6, words.length * 0.04)) return null;
  const left = [];
  const right = [];
  words.forEach((w) => {
    ((w.x0 + w.x1) / 2 < gutter ? left : right).push(w);
  });
  if (left.length < 10 || right.length < 10) return null;
  return _itLines(left).concat(_itLines(right)).join('\n');
}

// A heading in a coloured box (red on orange, black on yellow) is often lost
// by OCR of the photo as it is, and read on a second pass over one colour
// channel. The day headings of that pass go where they stand on the page,
// when the first pass has nothing there.
export function mergeOcrHeadings(baseWords, extraWords, extraScale = 1) {
  const base = (baseWords || []).slice();
  // The second pass may run on an enlarged image: its boxes come back to the first one's scale.
  const k = Number(extraScale) > 0 ? Number(extraScale) : 1;
  const extra = (extraWords || []).map(_itWordBox).filter(Boolean).map((w) => Object.assign(w, { x0: w.x0 / k, y0: w.y0 / k, x1: w.x1 / k, y1: w.y1 / k }));
  const boxes = base.map(_itWordBox).filter(Boolean);
  extra.forEach((w, i) => {
    if (!/^(giorno|day|settimana|week|tag|woche)$/i.test(w.t)) return;
    const num = extra.slice(i + 1, i + 3).find((n) => /^\d{1,2}:?$/.test(n.t) && Math.abs((n.y0 + n.y1) / 2 - (w.y0 + w.y1) / 2) < (w.y1 - w.y0) && n.x0 - w.x1 < (w.y1 - w.y0) * 2);
    if (!num) return;
    const covered = boxes.some((b) => b.x1 > w.x0 - 2 && b.x0 < num.x1 + 2 && b.y1 > w.y0 - 2 && b.y0 < w.y1 + 2 && /giorn|glom|day|sett|week|tag/i.test(b.t));
    if (covered) return;
    base.push({ t: w.t.toUpperCase(), b: [w.x0, w.y0, w.x1, w.y1] });
    base.push({ t: num.t.replace(':', ''), b: [num.x0, num.y0, num.x1, num.y1] });
  });
  return base;
}

// Exercise names a bullet can be glued to ("•alzate" read as "ealzate").
const _IT_EX_START = /^(alz|pek|pull|panc|pieg|trise|lat\b|lat\s|lat$|press|rema|croc|tric|bic|hack|leg|squat|stac|curl|arnold|dip|traz|affond|hip|calf|abs|plank|lent|milit|floor|mob|addom|brac|spin|spal|glut|stre|face|shr|ring|over|fly|push|row|pull)/i;
function _itLevenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i].concat(new Array(n).fill(0)));
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[m][n];
}

/**
 * OCR text of a training sheet, cleaned the way a person reads it:
 * - a scheme cut at the end of a line ("3x10-4x10-...-4x8-") goes on with the next line;
 * - "Glomo2", "GI0RNO 3": a day heading misread is a day heading;
 * - a list bullet read as a letter ("ealzate", "®pulley", "«PANCA") is not part of the name;
 * - digits read as letters inside a scheme ("5xB", "4x 10", "6xO") are digits.
 */
export function cleanOcrText(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const out = [];
  const heading = (s) => /^(giorno|day|settimana|week|tag|woche)\s*\d/i.test(String(s || ''));
  // A line that is only print around the program - a logo, a stamp, a
  // letterhead read as "POLISPORTIV = _%", "-FITNESS-Ph. 4 ' /", "LS": no set
  // scheme, and more symbols than words.
  const noise = (s) => {
    if (/\d\s*[xX×]\s*[\dBOlI]/.test(s) || heading(s)) return false;
    const letters = (s.match(/[A-Za-zÀ-ÿ]/g) || []).length;
    const words = (s.match(/[A-Za-zÀ-ÿ]{3,}/g) || []).length;
    if (letters < 3) return true;
    if (/[©®_%|\[\]“”’=]/.test(s) && words <= 3) return true;
    if (/^-|-[,.]?\s*$|[-\s],$/.test(s) && words <= 3) return true;
    return false;
  };
  lines.forEach((raw0) => {
    // "i *LEG CURL", "wa © ABS": a bullet read as a letter or two and a glyph.
    let raw = raw0.replace(/^[a-z]{1,3}\s+[*©®•«»~]\s*(?=[A-Z])/, '');
    // (A line the one above is waiting for - after "12-" - is never print around it.)
    const waiting = out.length && /(?:[-:+]|\b(?:su|di|da|a|al|x|per))$/i.test(out[out.length - 1]);
    if (!waiting && noise(raw)) return;
    let line = raw;
    // Bullets read as glyphs, and a bullet glued to the name. A line that
    // had one starts a new item.
    const hadBullet = /^[«»®•*+\\·°~]/.test(line) || /^(?:e\.|\.|e)\s+(?=[A-Za-z])/.test(line) || /^e(?=[A-Z])/.test(line) || (/^e[a-z]/.test(line) && _IT_EX_START.test(line.slice(1)) && !_IT_EX_START.test(line));
    line = line.replace(/^[«»®•*+\\·°~]+\s*/, '');
    // "e. Squat hack", ". abs", "e panca piana": a bullet read as "e" or ".".
    line = line.replace(/^(?:e\.|\.)\s+/, '');
    if (/^e\s+[a-z]/i.test(line) && _IT_EX_START.test(line.slice(2))) line = line.slice(2);
    line = line.replace(/^e(?=[A-Z])/, '');
    if (/^e[a-z]/.test(line) && _IT_EX_START.test(line.slice(1)) && !_IT_EX_START.test(line)) line = line.slice(1);
    // Digits inside a scheme.
    line = line.replace(/(\d)\s*[xX]\s*B\b/g, '$1x8').replace(/(\d)\s*[xX]\s*[Oo]\b/g, '$1x0').replace(/(\d)\s*[xX]\s+(\d)/g, '$1x$2')
      .replace(/(\d)\s*[xX]\s*[lI](\d?)\b/g, '$1x1$2');
    // In a ladder ("4X10-4X12-5X8"): "%" is an X, "4X1 5" one number, a dash
    // read as a dot is a dash, and a 4 / 5 / 8 read as A / S / B at the start
    // of a step is that digit.
    if (/\d\s*[xX%]\s*\d/.test(line)) {
      line = line.replace(/(\d)%(\d)/g, '$1X$2').replace(/-\s*[|!]\s*(?=-|$)/g, '-').replace(/\s+[|!]\s*$/, '')
        .replace(/(\d[xX]\d) (\d)(?=[-.\s]|$)/g, '$1$2')
        .replace(/(\d[xX]\d{1,2})\.(?=\s*\d{1,2}[xX])/g, '$1-')
        .replace(/(^|[-\s:])A(?=[xX]\d)/g, '$14').replace(/(^|[-\s:])S(?=[xX]\d)/g, '$15').replace(/(^|[-\s:])B(?=[xX]\d)/g, '$18');
    }
    // "SLANCI Al CAVI": in a line written in capitals, "Al" is "AI".
    if (/\bAl\b/.test(line) && (line.match(/[A-Z]/g) || []).length > (line.match(/[a-z]/g) || []).length * 3) line = line.replace(/\bAl\b/g, 'AI');
    // "SALZATE", "SLAT MACHINE": a bullet read as an S glued to the name.
    if (/^S[A-Z]{2,}/.test(line) && !_IT_EX_START.test(line) && _IT_EX_START.test(line.slice(1))) line = line.slice(1);
    // A day heading misread: a short word close to "giorno" and a number.
    const dm = line.match(/^([A-Za-z0-9]{4,7})\s*[:.]?\s*(\d)\s*[:.]?$/);
    if (dm) {
      const w = dm[1].toLowerCase().replace(/0/g, 'o').replace(/1/g, 'i');
      // "Glomo2": a g-word of five or more letters three edits from "giorno".
      if (_itLevenshtein(w, 'giorno') <= 2 || (w[0] === 'g' && w.length >= 5 && _itLevenshtein(w, 'giorno') <= 3)) line = 'GIORNO ' + dm[2];
    }
    const prev = out[out.length - 1];
    // A line cut at a dash or a colon goes on with the next one; so does a
    // sentence cut mid-way ("difficolta' 8 su" / "10"), when the new line
    // is not a list item of its own.
    const cutAtMark = prev && (/[-–]$/.test(prev) || /:$/.test(prev) || /\+$/.test(prev));
    const cutMidSentence = prev && !hadBullet && /(?:\b(?:su|di|da|a|al|in|con|e|x|per)|,)$/i.test(prev) && /^[a-z0-9(]/.test(line);
    const nameThenScheme = prev && !hadBullet && !/\d/.test(prev) && /^[A-Z][A-Z .']+$/.test(prev) && /^[A-Z]+\b.*\d/.test(line) && !/^[A-Z]+\s*[:.]/.test(line);
    // "su 10 + 2,5kg x week", "difficolta' 9 su 10", "2,5 x week se possibile".
    const continuationWord = prev && !hadBullet && /^(?:su\b|x\b|week\b|kg\b|difficolt|oppure\b|poi\b|\+|\d+(?:[.,]\d+)?\s*(?:kg)?\s*x\s*week)/i.test(line);
    // "gamba", "discesa e salita esplosiva", "basso: 4x6" under a name: the item goes on.
    const lowerTail = prev && !hadBullet && /^[a-zà-ù(]/.test(line) && (!/\d\s*x\s*\d/i.test(line) || !/\d/.test(prev));
    const supersetTail = prev && /\b(?:ss|superset)$/i.test(prev);
    // ": 1 SERIE A SETTIMANA", ":3X20-4X20 x gamba": what follows a colon
    // goes on the line above; so does the rest of "15 CRUNCH + 20 SIT UP + 30".
    const colonLead = prev && !hadBullet && /^:/.test(line);
    // A line that is only more of a ladder ("4X12-5X8-4X12-5X10-4X8-3X10")
    // is never an exercise: it ends the one above, dash or dot or not.
    const ladderOnly = prev && /^\d{1,2}\s*[xX]\s*\d/.test(line) && !/[a-wyz]{3,}/i.test(line.replace(/max/ig, '')) && /\d\s*[xX]\s*\d/.test(prev);
    if (ladderOnly && !heading(prev)) {
      out[out.length - 1] = prev.replace(/[.\s]+$/, '') + (/[-–]$/.test(prev) ? '' : '-') + line;
      return;
    }
    // "FRENCH PRESS MANUBRI SEDUTA SU" / "PANCA:4X12": a name cut after a preposition.
    const cutAtWord = prev && !hadBullet && !/\d\s*[xX]\s*\d/.test(prev) && /\b(?:su|di|da|con|al|alla|in|per|e|ss)$/i.test(prev);
    // "PANCA PIANA : 4X10-4X" / "...": a ladder cut after its X.
    const cutAtX = prev && /\d[xX]$/.test(prev);
    // (Not "5X15+15": that is a complete step, reps of two movements.)
    const cutAtPlusNumber = prev && !hadBullet && /\+\s*\d{1,3}$/.test(prev) && !/[xX]\d{1,3}\+\d{1,3}$/.test(prev);
    if ((cutAtMark || cutMidSentence || nameThenScheme || continuationWord || lowerTail || supersetTail || colonLead || cutAtPlusNumber || cutAtWord || cutAtX) && !heading(line) && !heading(prev)) {
      out[out.length - 1] = prev + (/[-–]$/.test(prev) ? '' : ' ') + line;
      return;
    }
    out.push(line);
  });
  return out.join('\n');
}

// Maxes written in a text: "MASSIMALI: SQ 105 B 60 DEAD 100", "1RM panca 100",
// "Massimale squat: 150 kg". Targets ("OBIETTIVO: 115/67,5/130") are not maxes.
// Returns { squat: { value, kind, label }, ... } or {}.
export function parseMaxesFromText(text) {
  const out = {};
  const lines = String(text || '').split(/\r?\n/);
  const liftOf = (w) => {
    const f = _itFold(w);
    if (/^(sq|squat|accosciata|kniebeuge)$/.test(f)) return 'squat';
    if (/^(b|bp|bench|panca|bankdrucken)$/.test(f)) return 'bench';
    if (/^(dl|dead|deadlift|stacco|st|kreuzheben)$/.test(f)) return 'deadlift';
    return null;
  };
  lines.forEach((line) => {
    if (!/massimal|\b1\s*rm\b|\bmax(?:es|imal)?\b|bestleistung/i.test(line)) return;
    if (/obiettiv|obbiettiv|target|goal|ziel/i.test(line) && !/massimal/i.test(line)) return;
    const body = line.replace(/(\d),(\d)/g, '$1.$2');
    const re = /\b([A-Za-z\u00c0-\u00ff]{1,12})\s*[:=]?\s*(\d{2,3}(?:\.\d)?)\s*(?:kg)?\b/g;
    let m;
    while ((m = re.exec(body))) {
      const lift = liftOf(m[1]);
      const v = Number(m[2]);
      if (lift && v >= 20 && v <= 500 && !out[lift]) out[lift] = { value: v, kind: 'current', label: line.trim().slice(0, 60) };
    }
  });
  return out;
}

// ---- A line with several schemes: weeks, or one session? ----
//
// "3x10-4x10-5x10" is usually one scheme per week, "5x5 + 2x8" two blocks of
// the same session, but "3x10, 4x10, 5x10" can be either, and only whoever
// wrote the program knows. The importer proposes a reading and the person
// chooses in the review; the choice is keyed by the line.

// The same key for a line wherever it is met (bullets, day prefix, spacing aside).
export function schemeLineKey(line) {
  return String(line || '')
    .replace(/^\s*[\*•\-–—]+\s+/, '')
    .replace(/^(?:giorno|day|seduta|sessione)\s*[:=\-]?\s*\d+\s*[-–:]\s*/i, '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * The two readings of a line with two or more "sets x reps" schemes, or null.
 * { tokens: [{ sets, reps, raw, load, pct }], weeklyDefault, weeklyText, sessionText }
 * Load ladders ("120x8/150x5") are not schemes: their first number is kilos.
 */
export function schemeReadings(src, isWeeklyLadder) {
  const raw = String(src || '').replace(/(\d),(\d)/g, '$1.$2');
  const body = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw;
  const re = /(\d{1,3}(?:\.\d+)?)\s*[xX*×]\s*(\d{1,3}|max|amrap)\b(?:\s*(?:@\s*)?(\d{1,3}(?:\.\d{1,2})?)\s*(kg|%))?/gi;
  const tokens = [];
  let m;
  while ((m = re.exec(body))) {
    const sets = Number(m[1]);
    if (!Number.isInteger(sets) || sets < 1 || sets > 12) return null; // a load, not a set count
    tokens.push({
      sets,
      reps: /^\d/.test(m[2]) ? m[2] : m[2].toUpperCase(),
      raw: m[1] + 'x' + m[2],
      load: m[4] && /kg/i.test(m[4]) ? Number(m[3]) : null,
      pct: m[4] === '%' ? Number(m[3]) : null
    });
  }
  if (tokens.length < 2) return null;
  const weeklyDefault = typeof isWeeklyLadder === 'function' ? !!isWeeklyLadder(src) : !/\+/.test(body);
  const show = (t) => t.raw + (t.load != null ? ' ' + t.load + 'kg' : '') + (t.pct != null ? ' ' + t.pct + '%' : '');
  return {
    tokens,
    weeklyDefault,
    weeklyText: tokens.map(show).join(' → '),
    sessionText: tokens.map(show).join(' + ')
  };
}

// Replaces an exercise's sets with the groups a line prescribed.
export function applySetGroupsToExercise(ex, groups) {
  if (!ex || !Array.isArray(groups) || !groups.length) return ex;
  const sets = [];
  groups.forEach((g) => {
    for (let i = 0; i < (g.sets || 1); i++) {
      sets.push({
        set_number: sets.length + 1,
        order: sets.length + 1,
        set_type: 'working',
        technique: null,
        target_load: g.load != null ? g.load : null,
        load: g.load != null ? g.load : null,
        target_reps: g.reps != null ? String(g.reps) : null,
        reps: g.reps != null ? String(g.reps) : null,
        target_rir: null,
        rir: null,
        target_rpe: g.rpe != null ? g.rpe : null,
        rpe: g.rpe != null ? g.rpe : null,
        percentage_1rm: g.pct != null ? g.pct : null,
        rest_seconds: ex.rest_seconds != null ? ex.rest_seconds : null
      });
    }
  });
  const first = sets[0];
  const same = sets.every((s) => s.target_reps === first.target_reps);
  const raw = same ? `${sets.length}x${first.target_reps}` : sets.map((s) => s.target_reps).join('/');
  ex.sets = sets;
  ex.sets_data = sets;
  ex.sets_count = sets.length;
  ex.reps_target = first.target_reps;
  ex.reps = first.target_reps;
  ex.repsTarget = first.target_reps;
  ex.reps_raw = raw;
  ex.scheme = raw;
  ex.reps_pattern = same ? null : sets.map((s) => s.target_reps);
  ex.load_target = first.target_load != null ? first.target_load + ' kg' : ex.load_target || null;
  ex.load_value = first.target_load;
  ex.percentage_1rm = first.percentage_1rm;
  ex.rpe_target = first.target_rpe;
  ex.rir_target = null;
  ex.prescription = { sets: sets.length, reps: first.target_reps, reps_pattern: ex.reps_pattern, raw, technique: null, locked: true, source: 'locked' };
  ex.setRows = Array.from({ length: Math.max(0, sets.length - 1) }, (_, i) => i + 2);
  return ex;
}

// Week wi (0-based) of a program expanded from one written week: the load
// increase the line declared, applied as many times as the weeks passed.
export function applyLoadProgression(ex, wi) {
  const p = ex && ex.load_progression;
  if (!p || !wi) return ex;
  const bumps = Math.floor(wi / (p.every || 1));
  if (!bumps) return ex;
  const add = p.step * bumps;
  // sets and sets_data are separate arrays after a week is copied; the
  // prescription lock rebuilds sets from sets_data, so both move.
  const rows = [];
  [ex.sets, ex.sets_data].forEach((arr) => (Array.isArray(arr) ? arr : []).forEach((s) => { if (s && typeof s === 'object' && !rows.includes(s)) rows.push(s); }));
  rows.forEach((s) => {
    if (p.unit === '%') {
      if (s.percentage_1rm != null) s.percentage_1rm = _itRound(Number(s.percentage_1rm) + add);
    } else if (s.target_load != null && s.target_load !== '') {
      s.target_load = _itRound(Number(s.target_load) + add);
      s.load = s.target_load;
    }
  });
  if (Array.isArray(ex.sets) && ex.sets[0]) {
    ex.load_value = ex.sets[0].target_load;
    if (ex.sets[0].target_load != null) ex.load_target = ex.sets[0].target_load + ' kg';
    ex.percentage_1rm = ex.sets[0].percentage_1rm;
  }
  return ex;
}

// How much of what a set can carry was read: sets with a load, a % of 1RM,
// an RPE or an RIR. Two readings of the same sheet are compared on it.
export function countTableSetInformation(weeks) {
  let n = 0;
  (weeks || []).forEach((w) => (w.sessions || w.days || []).forEach((s) => (s.exercises || []).forEach((e) => {
    (Array.isArray(e.sets) ? e.sets : []).forEach((st) => {
      if (!st) return;
      if (st.target_load != null && st.target_load !== '') n++;
      if (st.percentage_1rm != null && st.percentage_1rm !== '') n++;
      if (st.target_rpe != null && st.target_rpe !== '') n++;
      if (st.target_rir != null && st.target_rir !== '') n++;
    });
  })));
  return n;
}

// How many exercises of a set of weeks are usable: a real name and a prescription.
export function countUsableTableExercises(weeks) {
  let n = 0;
  (weeks || []).forEach((w) => (w.sessions || w.days || []).forEach((s) => (s.exercises || []).forEach((e) => {
    const name = e.name_original || e.name || '';
    if (!name || _itIsPlaceholder(name) || /^\d+$/.test(String(name).trim())) return;
    // A header read as a row ("Exercise | Work-up (load × reps)") is not an exercise.
    if (_itColumnKind(name) === 'exercise') return;
    const sets = Array.isArray(e.sets) ? e.sets : [];
    if (!sets.length) return;
    // Reps that read as reps: "8", "8-10", "5+", "3+3", "AMRAP", "30s" - not a
    // whole cell of "90×3, 90×3, 95×3" copied into one set.
    const repsOk = (r) => /^(?:\d{1,3}(?:\s*[-+\/]\s*\d{1,3})*\+?|max|amrap|mr\s*\d*|\d{1,3}\s*(?:s|sec|")|failure)$/i.test(String(r == null ? '' : r).trim());
    if (!sets.some((s) => s && repsOk(s.target_reps || s.reps))) return;
    n++;
  })));
  return n;
}
