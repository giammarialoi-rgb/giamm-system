// Creates (or resets) the accounts that the store reviewers use. Run it once against the production database:
//
//   DATABASE_URL=postgres://... node tools/seed_review_accounts.mjs
//
// It makes three accounts, each with a new random password that is printed ONCE here and stored nowhere else
// (not in the repository, not in a file): copy it straight into App Store Connect / Play Console.
//   - review-coach@nurvan.app   plan coach_pro, no end date: every screen, Coach mode included
//   - review-free@nurvan.app    free plan: the plans screen, the store purchase buttons, the free features
//   - review-athlete@nurvan.app free plan: the athlete side (a coach can link it by invite)
// Run it again to set new passwords (e.g. after a review). The accounts have the source "manual", so a store
// purchase never touches them, and they are plain accounts: they can be deleted from the app like any other.
//
// Each account also gets the demo data of tools/review-demo/demo-account-data.json (made up, no real person): an active
// program, workouts with ticked sets, a day of meals, a supplement, a therapy entry, an exam, body checks. The dates are
// moved to the day the script runs. Run with --no-data to leave the accounts' data as it is. Rebuilding the data file:
// tools/review-demo/build_demo.mjs. How to recreate everything: docs/REVIEW-DEMO-ACCOUNT.md.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) { console.log('DATABASE_URL is missing.'); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });

const ACCOUNTS = [
  { email: 'review-coach@nurvan.app', name: 'Revisore Coach', plan: 'coach_pro' },
  { email: 'review-free@nurvan.app', name: 'Revisore Free', plan: 'free' },
  { email: 'review-athlete@nurvan.app', name: 'Revisore Atleta', plan: 'free' }
];
const withData = !process.argv.includes('--no-data');
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

// The demo data with its dates moved from the day it was built to today.
function demoData() {
  const raw = JSON.parse(fs.readFileSync(path.join(here, 'review-demo', 'demo-account-data.json'), 'utf8'));
  const dayMs = 86400000;
  const delta = Math.round((Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(raw.builtOn)) / dayMs);
  const shift = (v) => {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v)) return v;
    const t = Date.parse(v) + delta * dayMs;
    return v.length === 10 ? new Date(t).toISOString().slice(0, 10) : new Date(t).toISOString();
  };
  (raw.logs || []).forEach((l) => { l.at = shift(l.at); l.finalizedAt = shift(l.finalizedAt); });
  (raw.bodyChecks || []).forEach((c) => { c.at = shift(c.at); });
  ((raw.exams && raw.exams.records) || []).forEach((r) => { r.date = shift(r.date); });
  const daily = {};
  Object.keys(raw.nutritionDaily || {}).forEach((k) => {
    const e = raw.nutritionDaily[k];
    if (e && e.diary && e.diary.at) e.diary.at = shift(e.diary.at);
    daily[shift(k)] = e;
  });
  raw.nutritionDaily = daily;
  delete raw.builtOn;
  return raw;
}
const demo = withData ? demoData() : null;

const newPassword = () => crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, 'x') + '7!';

const out = [];
for (const a of ACCOUNTS) {
  const password = newPassword();
  const hash = await bcrypt.hash(password, 10);
  const found = await pool.query('SELECT id FROM app_users WHERE lower(email) = lower($1)', [a.email]);
  let id;
  if (found.rows[0]) {
    id = found.rows[0].id;
    await pool.query("UPDATE app_users SET password_hash = $2, name = $3, provider = 'email', email_verified_at = COALESCE(email_verified_at, NOW()), email_verify_required = FALSE, updated_at = NOW() WHERE id = $1", [id, hash, a.name]);
  } else {
    const ins = await pool.query("INSERT INTO app_users(email, name, password_hash, provider, email_verified_at, email_verify_required) VALUES($1,$2,$3,'email',NOW(),FALSE) RETURNING id", [a.email, a.name, hash]);
    id = ins.rows[0].id;
    await pool.query("INSERT INTO app_account_data(user_id, data) VALUES($1, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING", [id]);
  }
  const cur = await pool.query('SELECT plan FROM app_users WHERE id = $1', [id]);
  await pool.query("UPDATE app_users SET plan = $2, plan_source = 'manual', plan_until = NULL, updated_at = NOW() WHERE id = $1", [id, a.plan]);
  await pool.query("INSERT INTO app_plan_history(user_id, from_plan, to_plan, source, note, actor) VALUES($1,$2,$3,'manual','account per i revisori degli store','seed_review_accounts')", [id, cur.rows[0].plan, a.plan]);
  if (demo) {
    const row = await pool.query('SELECT data FROM app_account_data WHERE user_id = $1', [id]);
    const merged = Object.assign({}, (row.rows[0] && row.rows[0].data) || {}, demo, { lastSyncedAt: new Date().toISOString() });
    await pool.query("INSERT INTO app_account_data(user_id, data) VALUES($1, $2::jsonb) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, revision = app_account_data.revision + 1, updated_at = NOW()", [id, JSON.stringify(merged)]);
  }
  out.push({ email: a.email, password, plan: a.plan });
}
await pool.end();
console.log('\nAccount per i revisori (le password si vedono solo ora, copiale subito):\n');
out.forEach((o) => console.log('  ' + o.email.padEnd(28) + o.password.padEnd(18) + 'piano ' + o.plan));
console.log(demo ? '  Dati di esempio caricati su tutti e tre (programma, allenamenti, pasto, integratore, terapia, esame, check).\n' : '');
