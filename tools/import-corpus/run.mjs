// Measures the importer on real training files.
//
//   node tools/import-corpus/run.mjs [--corpus path/to/corpus.json] [--only id] [--verbose]
//
// The corpus (files + expected values written by hand from the source cells)
// lives in .import-corpus/, which git ignores: those files carry athletes'
// names and numbers. This script only compares; it holds no data.
//
// For every file: structure (weeks, days in the first week) and, for each
// checked row, every field the check names - sets, reps, % of 1RM, kg, RPE,
// RIR, the set-by-set detail. A field expected null must come out empty: a
// value the source does not have counts as an error, like a wrong one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importFile, programWeeks } from './pipeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const argValue = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const corpusPath = argValue('--corpus') || path.join(root, '.import-corpus', 'corpus.json');
const only = argValue('--only');
const verbose = args.includes('--verbose');

if (!fs.existsSync(corpusPath)) {
  console.log('Corpus non trovato: ' + corpusPath + ' (e\' fuori da git: va creato in locale).');
  process.exit(0);
}
const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

export function fold(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
export function normReps(v) {
  if (v == null || v === '') return null;
  return String(v).trim().toLowerCase().replace(/\s*(?:bis|to|a|-|–)\s*/g, '-').replace(/^x/, '');
}
function num(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
const sessionsOf = (w) => (w && (w.sessions || w.days)) || [];
const exName = (e) => e.name_original || e.name || e.exercise || '';
function findExercise(session, want) {
  const f = fold(want);
  const list = (session && session.exercises) || [];
  return list.find((e) => fold(exName(e)) === f) || list.find((e) => fold(exName(e)).startsWith(f)) || list.find((e) => fold(exName(e)).includes(f)) || null;
}
function workingSets(e) {
  const sets = Array.isArray(e.sets) ? e.sets : [];
  const work = sets.filter((s) => !s || !s.set_type || s.set_type !== 'warmup');
  return work.length ? work : sets;
}
function field(e, set, key) {
  switch (key) {
    case 'reps': return normReps(set ? (set.target_reps ?? set.reps) : e.reps_target);
    case 'pct': return num(set && set.percentage_1rm != null ? set.percentage_1rm : e.percentage_1rm);
    case 'load': return num(set && set.target_load != null ? set.target_load : e.load_value);
    case 'rpe': return num(set && set.target_rpe != null ? set.target_rpe : e.rpe_target);
    case 'rir': return num(set && set.target_rir != null ? set.target_rir : e.rir_target);
    default: return null;
  }
}
function same(key, got, want) {
  if (want === null) return got === null;
  if (key === 'reps') return normReps(got) === normReps(want);
  if (got === null) return false;
  return Math.abs(Number(got) - Number(want)) < 0.01;
}

function scoreFile(spec, program) {
  const weeks = programWeeks(program);
  const out = { points: 0, total: 0, misses: [] };
  const add = (ok, what) => { out.total++; if (ok) out.points++; else out.misses.push(what); };
  add(weeks.length === spec.weeks, `settimane: attese ${spec.weeks}, lette ${weeks.length}`);
  if (spec.daysPerWeek) {
    const d = sessionsOf(weeks[0]).length;
    add(d === spec.daysPerWeek, `giorni nella 1a settimana: attesi ${spec.daysPerWeek}, letti ${d}`);
  }
  (spec.checks || []).forEach((c) => {
    const where = `S${c.week} G${c.day}`;
    const session = sessionsOf(weeks[c.week - 1])[c.day - 1];
    if (c.absent) {
      add(!findExercise(session, c.absent), `${where}: "${c.absent}" non e' un esercizio ma e' stato importato`);
      return;
    }
    const e = findExercise(session, c.ex);
    const keys = Object.keys(c).filter((k) => !['week', 'day', 'ex', 'setsDetail'].includes(k));
    const detailCount = c.setsDetail ? c.setsDetail.length * Object.keys(c.setsDetail[0]).length + 1 : 0;
    if (!e) {
      add(false, `${where}: "${c.ex}" non trovato`);
      for (let i = 1; i < keys.length + detailCount; i++) { out.total++; }
      return;
    }
    add(true, '');
    const sets = workingSets(e);
    keys.forEach((k) => {
      if (k === 'sets') { add(sets.length === c.sets, `${where} ${c.ex}: serie ${sets.length} invece di ${c.sets}`); return; }
      const got = field(e, sets[0], k);
      add(same(k, got, c[k]), `${where} ${c.ex}: ${k} ${got === null ? 'vuoto' : got} invece di ${c[k] === null ? 'vuoto' : c[k]}`);
    });
    if (c.setsDetail) {
      add(sets.length === c.setsDetail.length, `${where} ${c.ex}: ${sets.length} serie invece di ${c.setsDetail.length}`);
      c.setsDetail.forEach((d, i) => {
        Object.keys(d).forEach((k) => {
          const got = sets[i] ? field(e, sets[i], k) : null;
          add(sets[i] && same(k, got, d[k]), `${where} ${c.ex} serie ${i + 1}: ${k} ${got === null ? 'vuoto' : got} invece di ${d[k]}`);
        });
      });
    }
  });
  return out;
}

const rows = [];
for (const spec of corpus.files) {
  if (only && spec.id !== only) continue;
  if (!fs.existsSync(spec.path)) { rows.push({ id: spec.id, error: 'file mancante' }); continue; }
  const t0 = Date.now();
  let res;
  const quiet = console.log, quietWarn = console.warn, quietErr = console.error;
  try {
    console.log = console.warn = console.error = () => {};
    res = await importFile(spec.path);
  } catch (err) {
    res = { error: err };
  } finally {
    console.log = quiet; console.warn = quietWarn; console.error = quietErr;
  }
  if (res.error) { rows.push({ id: spec.id, family: spec.family, error: String(res.error.message || res.error) }); continue; }
  const s = scoreFile(spec, res.program);
  rows.push({ id: spec.id, family: spec.family, ms: Date.now() - t0, ...s });
}

let P = 0, T = 0;
console.log('');
console.log('file'.padEnd(24) + 'famiglia'.padEnd(18) + 'punti'.padStart(9) + '   %');
rows.forEach((r) => {
  if (r.error) { console.log(r.id.padEnd(24) + String(r.family || '').padEnd(18) + '  ERRORE ' + r.error); return; }
  P += r.points; T += r.total;
  const pct = r.total ? Math.round((r.points / r.total) * 100) : 0;
  console.log(r.id.padEnd(24) + String(r.family).padEnd(18) + `${r.points}/${r.total}`.padStart(9) + String(pct).padStart(5) + '%');
  if (verbose) r.misses.slice(0, 40).forEach((m) => console.log('      - ' + m));
});
const overall = T ? Math.round((P / T) * 1000) / 10 : 0;
console.log('');
console.log(`TOTALE ${P}/${T} = ${overall}%`);
try {
  fs.writeFileSync(path.join(path.dirname(corpusPath), 'last-report.json'), JSON.stringify({ at: new Date().toISOString(), overall, rows }, null, 2));
} catch (_) {}
const min = argValue('--min');
if (min != null && overall < Number(min)) process.exit(1);
