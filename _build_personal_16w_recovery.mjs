/**
 * Build personal 16-week recovery JSON from the Excel backup.
 */
import fs from 'node:fs';
import XLSX from 'xlsx';
import { parseStructuredWorkbook } from './universal-import-engine.mjs';

const src = 'tmp-import/programma-16w.xlsx';
const out = 'web/personal-recovery-16w.json';

const buf = fs.readFileSync(src);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, cellNF: true });
const result = parseStructuredWorkbook(wb, 'programma-16w.xlsx');
const training = result?.canonicalProgram;
if (!training || !Array.isArray(training.weeks) || training.weeks.length < 1) {
  console.error('parse failed', {
    weeks: training && training.weeks && training.weeks.length,
    stats: result && result.integrityStats
  });
  fs.writeFileSync('tmp-import/_parse_debug.json', JSON.stringify({
    stats: result?.integrityStats,
    titles: training && { title: training.title, weeks: training.weeks?.length }
  }, null, 2));
  process.exit(1);
}

training.id = 'personal_16w_giammaria';
training.title = 'Programma personalizzato 16 settimane';
training.original_title = 'PROGRAMMA BODYBUILDING • 16 SETTIMANE';
training.author = 'Giammaria';

const payload = {
  id: training.id,
  title: training.title,
  original_title: training.original_title,
  author: training.author,
  weeks: training.weeks,
  nutrition: training.nutrition || null,
  supplementation: training.supplementation || null,
  therapy: training.therapy || null
};

fs.writeFileSync(out, JSON.stringify(payload));
const ex = payload.weeks.reduce((a, w) => a + ((w.sessions || w.days || []).reduce((b, s) => b + ((s.exercises || s.rows || []).length), 0)), 0);
console.log('wrote', out, 'weeks=', payload.weeks.length, 'exercises=', ex);
