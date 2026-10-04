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
import crypto from 'node:crypto';
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
  out.push({ email: a.email, password, plan: a.plan });
}
await pool.end();
console.log('\nAccount per i revisori (le password si vedono solo ora, copiale subito):\n');
out.forEach((o) => console.log('  ' + o.email.padEnd(28) + o.password.padEnd(18) + 'piano ' + o.plan));
console.log('');
