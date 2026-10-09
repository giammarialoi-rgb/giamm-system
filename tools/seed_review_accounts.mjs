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

// The reviewers' three accounts. With --testers N (1-50) the script makes N more free accounts, tester-01@nurvan.app ...,
// for the people who test the app (the closed test); with --only-testers N it makes just those and leaves the reviewers'
// accounts (and the passwords already given to the stores) as they are.
const REVIEW_ACCOUNTS = [
  { email: 'review-coach@nurvan.app', name: 'Revisore Coach', plan: 'coach_pro' },
  { email: 'review-free@nurvan.app', name: 'Revisore Free', plan: 'free' },
  { email: 'review-athlete@nurvan.app', name: 'Revisore Atleta', plan: 'free' }
];
const flagValue = (name) => { const i = process.argv.indexOf(name); return i < 0 ? 0 : Math.max(0, Math.min(50, parseInt(process.argv[i + 1], 10) || 0)); };
const onlyTesters = flagValue('--only-testers');
const extraTesters = onlyTesters || flagValue('--testers');
const TESTERS = Array.from({ length: extraTesters }, (_, i) => ({ email: 'tester-' + String(i + 1).padStart(2, '0') + '@nurvan.app', name: 'Tester ' + String(i + 1).padStart(2, '0'), plan: 'free' }));
// --only-client adds just the linked athlete (review-client) to review-coach and does NOT touch the passwords of the
// accounts already given to the stores. A run that resets the three reviewers' passwords needs --reset-reviewers.
const onlyClient = process.argv.includes('--only-client');
const resetReviewers = process.argv.includes('--reset-reviewers');
if (!onlyClient && !onlyTesters && !resetReviewers) {
  console.log('This run would set NEW passwords on review-coach, review-free and review-athlete (the ones already given to the stores).');
  console.log('  --only-client        add only review-client, the athlete linked to review-coach (passwords of the others stay)');
  console.log('  --only-testers N     add only the tester accounts');
  console.log('  --reset-reviewers    really reset the three reviewers\' passwords');
  process.exit(1);
}
const ACCOUNTS = ((onlyTesters || onlyClient) ? [] : REVIEW_ACCOUNTS).concat(TESTERS);
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
// review-client: the athlete linked to review-coach, so a reviewer can try the coach-athlete chat, report and block.
// An athlete is always its own account (provider 'coach_client', synthetic email) plus a coach_clients row; he logs in with
// the username below + password, or with the link /c/<token>. It never touches review-coach's own row or password.
if (onlyClient || resetReviewers) {
  const CLIENT = { email: 'c.review-client@client.nurvan.internal', name: 'Revisore Cliente', username: 'revisorecliente', token: 'review-client-demo' };
  const coach = await pool.query('SELECT id FROM app_users WHERE lower(email) = lower($1)', ['review-coach@nurvan.app']);
  if (!coach.rows[0]) { console.log('review-coach@nurvan.app does not exist: run with --reset-reviewers first.'); await pool.end(); process.exit(1); }
  const coachId = coach.rows[0].id;
  const password = newPassword();
  const hash = await bcrypt.hash(password, 10);
  const u = await pool.query("INSERT INTO app_users(email, name, password_hash, provider, email_verified_at, email_verify_required) VALUES($1,$2,$3,'coach_client',NOW(),FALSE) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, provider = 'coach_client', updated_at = NOW() RETURNING id", [CLIENT.email, CLIENT.name, hash]);
  const athleteId = u.rows[0].id;
  await pool.query("INSERT INTO app_account_data(user_id, data) VALUES($1, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING", [athleteId]);
  await pool.query("UPDATE app_users SET plan = 'free', plan_source = 'manual', plan_until = NULL, updated_at = NOW() WHERE id = $1", [athleteId]);
  const c = await pool.query("INSERT INTO coach_clients(coach_user_id, athlete_user_id, display_name, username, status, paid, next_due_at, invite_token, intake_mode, intake, intake_completed_at, credentials_issued_at, coaching_mode) VALUES($1,$2,$3,$4,'active',TRUE,NOW() + INTERVAL '30 days',$5,'transition','{}'::jsonb,NOW(),NOW(),'remote') ON CONFLICT (invite_token) DO UPDATE SET athlete_user_id = EXCLUDED.athlete_user_id, status = 'active', paid = TRUE, next_due_at = EXCLUDED.next_due_at, chat_blocked_by = NULL, chat_blocked_at = NULL RETURNING id", [coachId, athleteId, CLIENT.name, CLIENT.username, CLIENT.token]);
  const clientId = c.rows[0].id;
  // A clean chat for every run: no old messages or reports, no blocking, keys republished when the two sides open the chat.
  await pool.query('DELETE FROM coach_messages WHERE client_id = $1', [clientId]);
  await pool.query('DELETE FROM chat_reports WHERE client_id = $1', [clientId]);
  await pool.query('UPDATE coach_clients SET unread_count = 0, chat_thread = 1, e2e_pubkey_coach = NULL, e2e_pubkey_athlete = NULL WHERE id = $1', [clientId]);
  await pool.query("INSERT INTO coach_messages(client_id, from_role, body, thread_id) VALUES($1,'coach',$2,1)", [clientId, 'Benvenuto! Scrivimi pure da qui.']);
  if (demo) {
    const row = await pool.query('SELECT data FROM app_account_data WHERE user_id = $1', [athleteId]);
    const merged = Object.assign({}, (row.rows[0] && row.rows[0].data) || {}, demo, { lastSyncedAt: new Date().toISOString() });
    await pool.query("UPDATE app_account_data SET data = $2::jsonb, revision = revision + 1, updated_at = NOW() WHERE user_id = $1", [athleteId, JSON.stringify(merged)]);
  }
  out.push({ email: 'username: ' + CLIENT.username + '  (link /c/' + CLIENT.token + ')', password, plan: 'athlete linked to review-coach' });
}
await pool.end();
console.log('\nAccount per i revisori (le password si vedono solo ora, copiale subito):\n');
out.forEach((o) => console.log('  ' + o.email.padEnd(28) + o.password.padEnd(18) + 'piano ' + o.plan));
console.log(demo ? '  Dati di esempio caricati su tutti gli account (programma, allenamenti, pasto, integratore, terapia, esame, check).\n' : '');
