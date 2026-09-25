// Cosa legge la dashboard. Solo piani, conteggi ed errori.
//
// Mai: diario, foto, misure, terapie, esami, note dei check-in. Ogni query qui
// sotto prende dal database solo i campi che la pagina mostra: i dati degli
// account (app_account_data) si leggono solo come date (sedute chiuse, import)
// o come stato di invio dei check, mai il contenuto.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Entitlements, accountFromRow } from "../account/plans.mjs";
import { FOOD_CATALOG } from "../../food-catalog.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STAPLES_PATH = path.join(__dirname, "../../food-staples.json");
const DAY = 86400000;

function seatsText(n) {
  return n === Infinity || n == null ? null : n;
}
function iso(v) {
  return v ? new Date(v).toISOString() : null;
}

// Every place that already knew a "last access", plus the new column.
const LAST_SEEN_SQL = `GREATEST(
  u.last_seen_at,
  (SELECT MAX(lic.last_seen_at) FROM coach_licenses lic WHERE lic.user_id = u.id),
  (SELECT MAX(cc.last_seen_at) FROM coach_clients cc WHERE cc.athlete_user_id = u.id)
)`;

/* ------------------------------ account ------------------------------ */

export async function listAccounts(pool, { q = "", limit = 200, now = Date.now() } = {}) {
  const needle = String(q || "").trim().toLowerCase();
  const rows = await pool.query(
    `SELECT u.id, u.email, u.name, u.plan, u.plan_source, u.plan_until, u.seats, u.trial_until, u.trial_used_at,
            ${LAST_SEEN_SQL} AS last_seen,
            EXISTS(SELECT 1 FROM coach_licenses l2 WHERE l2.user_id = u.id AND l2.status = 'active') AS is_coach,
            (SELECT COUNT(*)::int FROM coach_clients c WHERE c.coach_user_id = u.id AND c.status = 'active') AS athletes,
            (SELECT cu.email FROM coach_clients c3 JOIN app_users cu ON cu.id = c3.coach_user_id
              WHERE c3.athlete_user_id = u.id AND c3.status = 'active' ORDER BY c3.id DESC LIMIT 1) AS coach_email
     FROM app_users u
     WHERE ($1 = '' OR LOWER(u.email) LIKE $2)
     ORDER BY u.id ASC
     LIMIT $3`,
    [needle, "%" + needle + "%", Math.min(1000, Math.max(1, Number(limit) || 200))]
  );
  return (rows.rows || []).map((r) => {
    const account = accountFromRow(r);
    const eff = Entitlements.effective(account, now);
    return {
      id: String(r.id),
      email: r.email,
      name: r.name || "",
      ...account,
      effectivePlan: eff.plan,
      status: eff.status,
      isCoach: !!r.is_coach,
      athletes: Number(r.athletes || 0),
      seatsEffective: seatsText(eff.seats),
      lastSeenAt: iso(r.last_seen),
      coachEmail: r.coach_email || null
    };
  });
}

/* ------------------------------ coach ------------------------------ */

export async function listCoaches(pool, { now = Date.now() } = {}) {
  const coaches = await pool.query(
    `SELECT u.id, u.email, u.name, u.plan, u.plan_source, u.plan_until, u.seats, u.trial_until, u.trial_used_at,
            ${LAST_SEEN_SQL} AS last_seen,
            (SELECT COUNT(*)::int FROM coach_check_ins ci
              WHERE ci.coach_user_id = u.id AND ci.received_at >= NOW() - INTERVAL '30 days') AS checkins30
     FROM app_users u
     JOIN coach_licenses l ON l.user_id = u.id AND l.status = 'active'
     ORDER BY u.id ASC`
  );
  const clients = await pool.query(
    "SELECT id, coach_user_id, created_at, status FROM coach_clients WHERE status = 'active'"
  );
  const byCoach = new Map();
  for (const c of clients.rows || []) {
    const k = String(c.coach_user_id);
    if (!byCoach.has(k)) byCoach.set(k, []);
    byCoach.get(k).push({ id: String(c.id), createdAt: c.created_at, status: c.status });
  }
  return (coaches.rows || []).map((r) => {
    const account = accountFromRow(r);
    const eff = Entitlements.effective(account, now);
    const seats = Entitlements.seatAssignment(byCoach.get(String(r.id)) || [], eff.seats);
    return {
      id: String(r.id),
      email: r.email,
      name: r.name || "",
      plan: account.plan,
      effectivePlan: eff.plan,
      status: eff.status,
      activeAthletes: seats.active.length,
      waitingAthletes: seats.inactive.length,
      seats: seatsText(eff.seats),
      trialUsed: !!account.trialUsedAt,
      trialActive: eff.trialActive,
      checkIns30: Number(r.checkins30 || 0),
      lastSeenAt: iso(r.last_seen)
    };
  });
}

/* ------------------------------ numbers ------------------------------ */

function countSince(times, now, days) {
  const since = now - days * DAY;
  return times.filter((t) => t >= since && t <= now + DAY).length;
}
function toTime(v) {
  const t = Date.parse(String(v || ""));
  return Number.isFinite(t) ? t : null;
}

/**
 * metrics: computed here, never by the page.
 *   active: accounts seen in the last 7 / 30 days (see LAST_SEEN_SQL);
 *   sessions: finalized sessions in the synced logs (finalizedAt, else at);
 *   imports: imports applied (prefs.importLog, written by the app since J1);
 *   checkIns: check-ins received by coaches;
 *   plans: accounts per assigned plan and per plan in effect now.
 */
export async function metrics(pool, { now = Date.now() } = {}) {
  const active = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE s.seen >= NOW() - INTERVAL '7 days')::int AS d7,
            COUNT(*) FILTER (WHERE s.seen >= NOW() - INTERVAL '30 days')::int AS d30
     FROM (SELECT ${LAST_SEEN_SQL} AS seen FROM app_users u) s`
  );
  const logs = await pool.query(
    `SELECT COALESCE(l->>'finalizedAt', l->>'at') AS t
     FROM app_account_data d
     CROSS JOIN LATERAL jsonb_array_elements(
       CASE WHEN jsonb_typeof(d.data->'logs') = 'array' THEN d.data->'logs' ELSE '[]'::jsonb END
     ) l`
  );
  const imports = await pool.query(
    `SELECT x AS t
     FROM app_account_data d
     CROSS JOIN LATERAL jsonb_array_elements_text(
       CASE WHEN jsonb_typeof(d.data->'prefs'->'importLog') = 'array' THEN d.data->'prefs'->'importLog' ELSE '[]'::jsonb END
     ) x`
  );
  const checkIns = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '7 days')::int AS d7,
            COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '30 days')::int AS d30
     FROM coach_check_ins WHERE received_at IS NOT NULL`
  );
  const plans = await pool.query("SELECT plan, plan_until, seats, trial_until FROM app_users");
  const sessionTimes = (logs.rows || []).map((r) => toTime(r.t)).filter((t) => t != null);
  const importTimes = (imports.rows || []).map((r) => toTime(r.t)).filter((t) => t != null);
  const assigned = { free: 0, standard: 0, coach: 0, coach_pro: 0 };
  const effective = { free: 0, standard: 0, coach: 0, coach_pro: 0 };
  for (const r of plans.rows || []) {
    const account = accountFromRow(r);
    assigned[account.plan] = (assigned[account.plan] || 0) + 1;
    const e = Entitlements.effective(account, now).ownPlan;
    effective[e] = (effective[e] || 0) + 1;
  }
  return {
    at: new Date(now).toISOString(),
    active: { d7: active.rows[0]?.d7 || 0, d30: active.rows[0]?.d30 || 0 },
    sessions: { d7: countSince(sessionTimes, now, 7), d30: countSince(sessionTimes, now, 30) },
    imports: { d7: countSince(importTimes, now, 7), d30: countSince(importTimes, now, 30) },
    checkIns: { d7: checkIns.rows[0]?.d7 || 0, d30: checkIns.rows[0]?.d30 || 0 },
    plans: { assigned, effective, total: (plans.rows || []).length }
  };
}

/* ------------------------------ catalog ------------------------------ */

const NURVAN_IDS = new Set(FOOD_CATALOG.filter((f) => f.source === "nurvan").map((f) => f.id));
const BUILT = new Map(FOOD_CATALOG.map((f) => [f.id, f]));
const NUMERIC = ["kcal", "pro", "carb", "fat"];

export function readStaples(file = STAPLES_PATH) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
// The same layout the file already has: one-space indent, a final newline.
export function writeStaples(list, file = STAPLES_PATH) {
  fs.writeFileSync(file, JSON.stringify(list, null, 1) + "\n", "utf8");
}

/** The Nurvan entries (the ones CREA does not cover), with what the built catalog has. */
export function nurvanCatalog(file = STAPLES_PATH) {
  const staples = readStaples(file);
  const rows = staples.filter((s) => NURVAN_IDS.has(s.id)).map((s) => {
    const built = BUILT.get(s.id) || {};
    const stale = NUMERIC.some((k) => Number(built[k]) !== Number(s[k]));
    return { id: s.id, name: s.name, category: s.category, kcal: s.kcal, pro: s.pro, carb: s.carb, fat: s.fat, stale };
  });
  return { rows, regenerate: rows.some((r) => r.stale) };
}

/** Change the values of one Nurvan entry in food-staples.json. */
export function updateStaple(id, input, file = STAPLES_PATH) {
  if (!NURVAN_IDS.has(String(id))) throw Object.assign(new Error("Si modificano solo le voci Nurvan: le altre vengono dal CREA."), { statusCode: 400 });
  const limits = { kcal: 900, pro: 100, carb: 100, fat: 100 };
  const patch = {};
  for (const k of NUMERIC) {
    if (input[k] === undefined || input[k] === null || input[k] === "") continue;
    const n = Number(String(input[k]).replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > limits[k]) throw Object.assign(new Error("Valore non valido per " + k + " (0-" + limits[k] + ")."), { statusCode: 400 });
    patch[k] = Math.round(n * 10) / 10;
  }
  if (!Object.keys(patch).length) throw Object.assign(new Error("Nessun valore da cambiare."), { statusCode: 400 });
  const staples = readStaples(file);
  const entry = staples.find((s) => s.id === String(id));
  if (!entry) throw Object.assign(new Error("Voce non trovata."), { statusCode: 404 });
  const before = {};
  for (const k of Object.keys(patch)) { before[k] = entry[k]; entry[k] = patch[k]; }
  writeStaples(staples, file);
  return { id: entry.id, name: entry.name, before, after: patch };
}

/**
 * Foods users typed by hand, by how many accounts added them. Names and
 * counts only, never who; a name added by a single account is not listed
 * (it could point to that person).
 */
export async function customFoods(pool, { min = 2, limit = 100 } = {}) {
  const rows = await pool.query(
    `SELECT f.name, COUNT(DISTINCT f.user_id)::int AS accounts
     FROM (
       SELECT d.user_id, LOWER(TRIM(e->>'name')) AS name
       FROM app_account_data d
       CROSS JOIN LATERAL jsonb_array_elements(
         (CASE WHEN jsonb_typeof(d.data->'nutrition'->'customFoods') = 'array' THEN d.data->'nutrition'->'customFoods' ELSE '[]'::jsonb END)
         || (CASE WHEN jsonb_typeof(d.data->'activeProgram'->'nutrition'->'customFoods') = 'array' THEN d.data->'activeProgram'->'nutrition'->'customFoods' ELSE '[]'::jsonb END)
       ) e
       WHERE jsonb_typeof(e) = 'object' AND COALESCE(TRIM(e->>'name'), '') <> ''
     ) f
     GROUP BY f.name
     HAVING COUNT(DISTINCT f.user_id) >= $1
     ORDER BY accounts DESC, f.name ASC
     LIMIT $2`,
    [min, limit]
  );
  return (rows.rows || []).map((r) => ({ name: r.name, accounts: Number(r.accounts) }));
}

/* ------------------------------ errors ------------------------------ */

/**
 * Failures of the last 30 days:
 *   - what the server saw (app_events): sync, check-in send, document import,
 *     with route, status, file format and message;
 *   - what the app recorded in the synced checks: sends left FAILED or QUEUED,
 *     read as state and date only (no weight, notes or photos).
 */
export async function recentErrors(pool, { now = Date.now() } = {}) {
  const events = await pool.query(
    `SELECT e.at, e.kind, e.detail, u.email
     FROM app_events e LEFT JOIN app_users u ON u.id = e.user_id
     WHERE e.at >= NOW() - INTERVAL '30 days'
     ORDER BY e.at DESC
     LIMIT 500`
  );
  const checks = await pool.query(
    `SELECT u.email, b->>'kind' AS kind, b->>'checkInSyncState' AS state, b->>'checkInFailedAt' AS failed_at, b->>'at' AS at
     FROM app_account_data d
     JOIN app_users u ON u.id = d.user_id
     CROSS JOIN LATERAL jsonb_array_elements(
       CASE WHEN jsonb_typeof(d.data->'bodyChecks') = 'array' THEN d.data->'bodyChecks' ELSE '[]'::jsonb END
     ) b
     WHERE b->>'checkInSyncState' IN ('FAILED', 'QUEUED')`
  );
  const since = now - 30 * DAY;
  const server = (events.rows || []).map((r) => {
    const d = r.detail || {};
    return {
      at: iso(r.at),
      kind: r.kind,
      email: r.email || null,
      route: d.route || null,
      status: d.status == null ? null : Number(d.status),
      format: d.format || null,
      message: d.message ? String(d.message).slice(0, 300) : null
    };
  });
  const app = (checks.rows || []).map((r) => ({
    at: iso(toTime(r.failed_at) || toTime(r.at)),
    kind: r.kind === "extra" ? "check-in extra" : (r.kind === "scheduled" ? "check-in" : "check fisico"),
    state: r.state,
    email: r.email
  })).filter((r) => r.at && Date.parse(r.at) >= since).sort((a, b) => (a.at < b.at ? 1 : -1));
  return { server, app };
}

/* ------------------------------ plan log ------------------------------ */

export async function planLog(pool, { limit = 500 } = {}) {
  const rows = await pool.query(
    `SELECT h.changed_at, u.email, h.from_plan, h.to_plan, h.source, h.plan_until, h.seats, h.note, h.actor
     FROM app_plan_history h JOIN app_users u ON u.id = h.user_id
     ORDER BY h.changed_at DESC, h.id DESC
     LIMIT $1`,
    [limit]
  );
  return (rows.rows || []).map((r) => ({
    at: iso(r.changed_at), email: r.email, from: r.from_plan, to: r.to_plan, source: r.source,
    until: iso(r.plan_until), seats: r.seats == null ? null : Number(r.seats), note: r.note || "", actor: r.actor || ""
  }));
}
