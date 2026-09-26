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
  ['notes', /^(note|notes|bemerkung|bemerkungen|commento|commenti|comments?)$/]
];
const _IT_METRICS = ['sets', 'reps', 'pct', 'load', 'rpe', 'rir'];
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
  t = t.replace(/\s*(?:bis|to|a|-|\u2013|\u2014)\s*/g, '-');
  if (/^\d{1,3}(?:-\d{1,3})?$/.test(t)) return t;
  if (/^(?:mr|amrap|max)\s*\d*$/.test(t)) return t.toUpperCase().replace(/\s+/g, '');
  if (/^\d{1,3}\s*(?:s|sec|")$/.test(t)) return t.replace(/\s+/g, '');
  if (/^\d{1,3}(?:\/\d{1,3})+$/.test(t)) return t;
  return null;
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
    if (kind) cols.push({ c, kind });
  });
  if (setCols >= 2) return { setColumns: true, cols: [] };
  const metrics = cols.filter((x) => _IT_METRICS.includes(x.kind));
  const kinds = new Set(cols.map((x) => x.kind));
  if (metrics.length < 2 || kinds.size < 2) return null;
  return { setColumns: false, cols };
}

// Column groups of a header: one group, or one per repetition (weeks side by side).
function _itGroups(header) {
  const cols = header.cols.slice().sort((a, b) => a.c - b.c);
  const exerciseCols = cols.filter((x) => x.kind === 'exercise');
  const rest = cols.filter((x) => x.kind !== 'exercise');
  const counts = {};
  rest.forEach((x) => { counts[x.kind] = (counts[x.kind] || 0) + 1; });
  const repeated = Object.keys(counts).filter((k) => counts[k] >= 2 && _IT_METRICS.includes(k));
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
  return { exCol, groups };
}

function _itWeekLabel(text) {
  const t = String(text || '').trim();
  const m = t.match(_IT_WEEK_RE);
  if (m) return { n: Number(m[1]), label: t };
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
    if (/volume|calc|statist|klassen|class|dropdown|catalog|katalog/i.test(name)) return;
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
          const kind = /projected|ziel|target|obiettivo|previst|goal|e1rm/.test(text) ? 'projected' : 'current';
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

    // Week labels side by side (WEEK 1 | WEEK 2 | ...): the next header takes them.
    const weekCells = filled.map((c) => ({ c, wl: _itWeekLabel(texts[c]) })).filter((x) => x.wl && x.wl.n != null);
    if (weekCells.length >= 2) {
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
        const g = _itGroups(h);
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
        header = { setColumns: false, exCol: g.exCol, groups: g.groups };
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
    const leftLabel = filled.find((c) => c < header.exCol);
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
    // Long free text in the exercise column only: a note for the exercise above.
    const metricFilled = groups.some((g) => _IT_METRICS.some((k) => g.map[k] != null && texts[g.map[k]]));
    if (!metricFilled) {
      // Long free text: a note for the exercise above. A bare name with
      // nothing prescribed ("Meet", a sign-off) is not an exercise.
      if (exText && exText.length > 50 && lastExercise) lastExercise.forEach((e) => e && e.notes.push(exText));
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
      const setsInfo = _itSets(cell('sets'));
      let reps = _itReps(cell('reps'));
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
      const anyValue = setsInfo.n != null || reps != null || pct != null || load != null || rpe != null;
      if (!anyValue) { perGroup[gi] = null; return; }
      const group = {
        sets: setsInfo.n != null ? setsInfo.n : 1,
        setsNote: setsInfo.note,
        reps,
        pct,
        load,
        rpe,
        rir,
        rest: _itRest(cell('rest')),
        tempo: txt('tempo') || null,
        note: txt('notes') || null,
        loadFormula,
        loadRefs: loadFormula ? _itFormulaRefs(loadFormula, name) : [],
        extra: (/opener/i.test(pctText) || /opener/i.test(loadText)) ? 'Opener' : null
      };
      const weekKey = g.weekKey || singleWeekKey || weekKeyFor(sheetWeek ? sheetWeek.n : null, name);
      const day = dayOf(weekKey);
      const prev = lastExercise && lastExercise[gi];
      const sameAsPrev = prev && exText && _itFold(prev.name_original) === _itFold(exText) && day.exercises[day.exercises.length - 1] === prev;
      if ((!exText && prev && day.exercises[day.exercises.length - 1] === prev) || sameAsPrev) {
        prev.groups.push(group);
        perGroup[gi] = prev;
        return;
      }
      if (!exText) { perGroup[gi] = null; return; }
      const ex = _itNewExercise(exText, ctx.normalizeName);
      ex.groups.push(group);
      day.exercises.push(ex);
      perGroup[gi] = ex;
      found++;
    });
    lastExercise = perGroup;
  }
  // Groups of a side-by-side week that prescribe nothing (a blank week column) leave no exercise.
  weeks.forEach((w) => w.days.forEach((d) => { d.exercises = d.exercises.filter((e) => e.groups.length || e.notes.length || true); }));
  return { weeks: weeks.filter((w) => w.days.some((d) => d.exercises.length)), found };
}

// Canonical exercise, as the rest of the importer builds them.
function _itCanonicalExercise(ex, ids, maxes) {
  const n = ex.normalized || {};
  const sets = [];
  const groupNotes = [];
  ex.groups.forEach((g) => {
    for (let i = 0; i < g.sets; i++) {
      const ref = _itLoadReference(g, maxes);
      sets.push({
        set_number: sets.length + 1,
        order: sets.length + 1,
        set_type: 'working',
        technique: null,
        target_load: g.load != null ? g.load : null,
        load: g.load != null ? g.load : null,
        target_reps: g.reps,
        reps: g.reps,
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
  // The max each lift's loads are computed from: the one the formulas read
  // most, else the first stated.
  const uses = new Map();
  out.weeks.forEach((w) => w.sessions.forEach((s) => s.exercises.forEach((e) => (e.sets || []).forEach((st) => {
    if (st.percent_of && st.percent_of.addr) uses.set(st.percent_of.addr, (uses.get(st.percent_of.addr) || 0) + 1);
  }))));
  out.primaryMaxes = {};
  ['squat', 'bench', 'deadlift'].forEach((lift) => {
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
    const loadFirst = /\./.test(ladder[1]) || first > 12 || tokens.some((tk) => /x/i.test(tk));
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
  // Groups joined by "+", each with its own intensity.
  const parts = afterName.split(/\s\+\s*|\+\s(?=\d)/).map((p) => p.trim()).filter(Boolean);
  const partRe = /(\d{1,2})\s*x\s*(\d{1,3}(?:-\d{1,3})?)(?![\d.%])/i;
  const groups = [];
  parts.forEach((p) => {
    const m = p.match(partRe);
    if (!m) return;
    const tail = p.slice(m.index + m[0].length);
    const pm = tail.match(/^\s*(?:al|at|@|a)?\s*(\d{1,3}(?:\.\d+)?)\s*%/i);
    const rm = tail.match(/rpe\s*(\d{1,2}(?:\.5)?)/i);
    const km = tail.match(/^\s*@?\s*(\d{2,3}(?:\.\d+)?)\s*kg/i) || tail.match(/^\s*@\s*(\d{2,3}(?:\.\d+)?)(?!\s*%)/);
    groups.push({ sets: Number(m[1]), reps: m[2], pct: pm ? Number(pm[1]) : null, rpe: rm ? Number(rm[1]) : null, load: km ? Number(km[1]) : null });
  });
  if (groups.length >= 2) {
    out.groups = groups;
    out.kind = 'compound';
    out.joinedByPlus = true;
    return out;
  }
  if (progression) {
    out.kind = 'progression_only';
    return out;
  }
  return null;
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
    const sets = Array.isArray(e.sets) ? e.sets : [];
    if (!sets.length) return;
    if (!sets.some((s) => s && (s.target_reps || s.reps))) return;
    n++;
  })));
  return n;
}
