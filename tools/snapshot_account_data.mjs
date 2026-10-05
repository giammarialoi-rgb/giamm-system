// READ ONLY. Saves the record the server holds for one account into a local file and says what is in it.
// Nothing is written to the database. Use it before any recovery, to have a copy in hand.
//
//   $env:DATABASE_URL = "..."     (PowerShell; never paste it in a chat)
//   node tools/snapshot_account_data.mjs <email> [outdir]
//
// The file goes to <outdir> (default: Documents/nurvan-recupero, outside the repository) and is named after
// the account and the time. It contains the person's training data: keep it private.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';

const url = process.env.DATABASE_URL;
const email = String(process.argv[2] || '').trim().toLowerCase();
if (!url || !email) { console.log('usage: DATABASE_URL set, then: node tools/snapshot_account_data.mjs <email> [outdir]'); process.exit(1); }
const outdir = process.argv[3] || path.join(os.homedir(), 'Documents', 'nurvan-recupero');
fs.mkdirSync(outdir, { recursive: true });

const pool = new pg.Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
const u = (await pool.query('SELECT id, email FROM app_users WHERE lower(email) = $1', [email])).rows[0];
if (!u) { console.log('Nessun account con questa email.'); await pool.end(); process.exit(1); }
const row = (await pool.query('SELECT data, revision, updated_at FROM app_account_data WHERE user_id = $1', [u.id])).rows[0];
if (!row) { console.log('Nessun dato salvato per questo account.'); await pool.end(); process.exit(1); }
const d = row.data || {};
const file = path.join(outdir, 'account-' + u.id + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
fs.writeFileSync(file, JSON.stringify({ userId: u.id, revision: row.revision, updatedAt: row.updated_at, data: d }, null, 1));

// What is in it
const keys = (o) => (o && typeof o === 'object' ? Object.keys(o).length : 0);
const logs = Array.isArray(d.logs) ? d.logs : [];
const byProgram = {};
logs.forEach((l) => { const k = String(l.programId || '(senza programma)'); byProgram[k] = byProgram[k] || { n: 0, first: l.at || l.finalizedAt, last: l.at || l.finalizedAt, week: new Set() }; byProgram[k].n++; const t = l.at || l.finalizedAt; if (t < byProgram[k].first) byProgram[k].first = t; if (t > byProgram[k].last) byProgram[k].last = t; if (l.week) byProgram[k].week.add(l.week); });
const loadKeys = Object.keys(d.data || {}).filter((k) => /_load$/.test(k));
const weeksWithLoads = new Set(loadKeys.map((k) => (k.match(/^w(\d+)_/) || [])[1]).filter(Boolean));
console.log('Account ' + u.id + ' (' + u.email + ') · revisione ' + row.revision + ' · aggiornato ' + new Date(row.updated_at).toISOString());
console.log('File salvato: ' + file);
console.log('Programma attivo: ' + ((d.activeProgram && (d.activeProgram.title || d.activeProgram.name)) || '(nessuno)') + ' · id ' + (d.activeProgramId || '-') + ' · settimane ' + ((d.activeProgram && d.activeProgram.weeks && d.activeProgram.weeks.length) || 0));
console.log('Carichi (chiavi *_load): ' + loadKeys.length + ' · settimane con carichi: ' + [...weeksWithLoads].sort((a, b) => a - b).join(',') + ' · epoca ' + (d.trainingDataEpoch || '-'));
console.log('Sedute concluse (logs): ' + logs.length);
Object.keys(byProgram).forEach((k) => console.log('   programma ' + k + ': ' + byProgram[k].n + ' sedute, dal ' + String(byProgram[k].first).slice(0, 10) + ' al ' + String(byProgram[k].last).slice(0, 10) + ', settimane ' + [...byProgram[k].week].sort((a, b) => a - b).join(',')));
console.log('Programmi parcheggiati: ' + keys(d.parkedPrograms) + ' · programmi salvati: ' + ((d.models || []).length || keys(d.models)));
await pool.end();
