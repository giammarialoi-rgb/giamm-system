// Rebuilds the loads of the training screen (the "data" map: w<week>_d<day>_e<exercise>_s<set>_load/_reps/_done) and
// the exercise substitutions ("subs") from the finished sessions (logs), which keep every set of every session.
// Used when the maps were lost but the history is intact.
//
// OFFLINE by default: it reads a snapshot file made by tools/snapshot_account_data.mjs and writes a rebuilt copy next to it.
//   node tools/rebuild_loads_from_logs.mjs <snapshot.json> [--from <snapshot-di-un-backup.json>]
// To put the result on the server (after reading the report):
//   $env:DATABASE_URL = "..."; node tools/rebuild_loads_from_logs.mjs <snapshot.json> --apply
// --apply changes only what is missing: keys that exist now are never touched, and it refuses if the record changed
// since the snapshot (someone synced meanwhile). Restored keys get a time later than the deletions, so every device
// takes them back instead of deleting them again.
//
// What a log does not keep (RIR, notes, planned loads) cannot be rebuilt here.
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
const apply = process.argv.includes('--apply');
if (!file) { console.log('usage: node tools/rebuild_loads_from_logs.mjs <snapshot.json> [--apply]'); process.exit(1); }
const snap = JSON.parse(fs.readFileSync(file, 'utf8'));
const d = snap.data || {};
const prog = d.activeProgram;
if (!prog || !Array.isArray(prog.weeks)) { console.log('Il record non ha un programma attivo con le settimane.'); process.exit(1); }

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sessionRows = (week, day) => {
  const wk = prog.weeks[week - 1];
  const sess = wk && (wk.sessions || wk.days || [])[day];
  return (sess && (sess.exercises || sess.rows)) || [];
};
const rowName = (r) => r.name || r.exercise || '';
const isCardioRow = (r) => /corsa|cyclette|tapis|vogatore|ellittica|camminata|cardio|bici/i.test(rowName(r)) || r.unit === 'cardio';

const data = {};
const subs = {};
const report = { logs: 0, lines: 0, byName: 0, bySets: 0, byOrder: 0, unmatchedLogs: [] };
const sorted = (d.logs || []).slice().sort((a, b) => String(a.at || a.finalizedAt).localeCompare(String(b.at || b.finalizedAt)));
sorted.forEach((l) => {
  const week = Number(l.week), day = Number(l.day);
  if (!week || day < 0 || !Number.isFinite(day)) return;
  if (l.programId && d.activeProgramId && l.programId !== d.activeProgramId) return;
  const rows = sessionRows(week, day);
  if (!rows.length) { report.unmatchedLogs.push(week + '/' + day); return; }
  report.logs++;
  const used = new Set();
  let ptr = 0;
  (l.exerciseLines || []).forEach((e) => {
    report.lines++;
    let idx = -1, how = '';
    for (let i = ptr; i < rows.length; i++) { if (!used.has(i) && norm(rowName(rows[i])) === norm(e.name)) { idx = i; how = 'byName'; break; } }
    if (idx < 0) {
      const n = e.cardio ? null : (e.sets || []).length;
      for (let i = ptr; i < rows.length; i++) {
        if (used.has(i)) continue;
        const rs = Array.isArray(rows[i].sets) ? rows[i].sets.length : null;
        if (e.cardio ? isCardioRow(rows[i]) : (rs === n && !isCardioRow(rows[i]))) { idx = i; how = 'bySets'; break; }
      }
    }
    if (idx < 0) { for (let i = ptr; i < rows.length; i++) { if (!used.has(i)) { idx = i; how = 'byOrder'; break; } } }
    if (idx < 0) return;
    used.add(idx); ptr = idx + 1; report[how]++;
    const eK = 'w' + week + '_d' + day + '_e' + idx;
    if (norm(rowName(rows[idx])) !== norm(e.name)) subs[eK] = e.name;
    if (e.cardio) { data[eK + '_s1_done'] = true; if (e.minutes) data[eK + '_s1_min'] = String(e.minutes); return; }
    (e.sets || []).forEach((s, i) => {
      const k = eK + '_s' + (i + 1);
      data[k + '_load'] = String(s.load);
      data[k + '_reps'] = String(s.reps);
      data[k + '_done'] = true;
    });
  });
});

// --from <old snapshot>: take the maps whole from an earlier copy of the record (a database backup) instead of the logs.
const fromIdx = process.argv.indexOf('--from');
if (fromIdx > 0) {
  const old = JSON.parse(fs.readFileSync(process.argv[fromIdx + 1], 'utf8')).data || {};
  Object.keys(data).forEach((k) => delete data[k]); Object.keys(subs).forEach((k) => delete subs[k]);
  Object.assign(data, old.data || {}); Object.assign(subs, old.subs || {});
  console.log('Fonte: copia di backup (' + Object.keys(data).length + ' chiavi di carichi e ' + Object.keys(subs).length + ' sostituzioni).');
}
const have = d.data || {};
const missingData = Object.keys(data).filter((k) => !(k in have));
const missingSubs = Object.keys(subs).filter((k) => !((d.subs || {})[k]));
const out = path.join(path.dirname(file), 'ricostruito-dai-log.json');
fs.writeFileSync(out, JSON.stringify({ data, subs }, null, 1));
console.log('Sedute lette: ' + report.logs + ' · esercizi: ' + report.lines + ' (per nome ' + report.byName + ', per numero di serie ' + report.bySets + ', per ordine ' + report.byOrder + ')');
console.log('Chiavi ricostruite: ' + Object.keys(data).length + ' (' + missingData.length + ' mancano oggi) · sostituzioni: ' + Object.keys(subs).length + ' (' + missingSubs.length + ' mancano oggi)');
if (report.unmatchedLogs.length) console.log('Sedute senza riga nel programma: ' + report.unmatchedLogs.join(', '));
console.log('Copia ricostruita: ' + out);
const weeks = {};
Object.keys(data).filter((k) => /_load$/.test(k)).forEach((k) => { const w = k.match(/^w(\d+)_/)[1]; weeks[w] = (weeks[w] || 0) + 1; });
console.log('Serie con carico per settimana: ' + Object.keys(weeks).sort((a, b) => a - b).map((w) => 'S' + w + ':' + weeks[w]).join(' '));

if (!apply) { console.log('\nNessuna modifica al server (manca --apply).'); process.exit(0); }

// ---- apply: only what is missing, stamped after the deletions
const pg = (await import('pg')).default;
const url = process.env.DATABASE_URL;
if (!url) { console.log('DATABASE_URL mancante.'); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
const cur = (await pool.query('SELECT data, revision FROM app_account_data WHERE user_id = $1', [snap.userId])).rows[0];
if (!cur) { console.log('Record non trovato.'); await pool.end(); process.exit(1); }
if (String(cur.revision) !== String(snap.revision)) {
  console.log('Il record è cambiato dopo lo snapshot (revisione ' + snap.revision + ' → ' + cur.revision + '). Rifai lo snapshot e riprova: non scrivo.');
  await pool.end(); process.exit(1);
}
const now = Date.now();
const nd = cur.data;
nd.data = nd.data || {}; nd.subs = nd.subs || {}; nd.mapStamps = nd.mapStamps || {}; nd.mapDeletes = nd.mapDeletes || {};
['data', 'subs'].forEach((f) => { nd.mapStamps[f] = nd.mapStamps[f] || {}; nd.mapDeletes[f] = nd.mapDeletes[f] || {}; });
missingData.forEach((k) => { nd.data[k] = data[k]; nd.mapStamps.data[k] = now; delete nd.mapDeletes.data[k]; });
missingSubs.forEach((k) => { nd.subs[k] = subs[k]; nd.mapStamps.subs[k] = now; delete nd.mapDeletes.subs[k]; });
const res = await pool.query('UPDATE app_account_data SET data = $2::jsonb, revision = revision + 1, updated_at = NOW() WHERE user_id = $1 AND revision = $3', [snap.userId, JSON.stringify(nd), cur.revision]);
console.log(res.rowCount ? 'Fatto: ripristinate ' + missingData.length + ' chiavi dei carichi e ' + missingSubs.length + ' sostituzioni sul server.' : 'Nessuna riga aggiornata (il record è cambiato nel frattempo).');
await pool.end();
