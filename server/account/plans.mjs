// Piani ed entitlement, lato server.
//
// Il piano sta sull'account (app_users, migrazione 0015). Cosa permette lo
// dice web/features.json, letto da web/entitlements.js: lo stesso file che usa
// la pagina, cosi' server e app non possono dare risposte diverse.
//
// Qui: leggere il piano di un account, i posti di un coach (i collegamenti
// piu' recenti oltre il limite restano inattivi finche' non si libera un
// posto), il collegamento di un atleta, i cambi di piano con storico, il trial
// coach (14 giorni, una volta) e le route di amministrazione.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FEATURES = JSON.parse(fs.readFileSync(path.join(__dirname, "../../web/features.json"), "utf8"));
if (!globalThis.NURVAN_FEATURES) globalThis.NURVAN_FEATURES = FEATURES;
await import("../../web/entitlements.js");
export const Entitlements = globalThis.NurvanEntitlements;

const PLAN_IDS = FEATURES.plans.map((p) => p.id);
const SOURCES = ["manual", "stripe", "play"];
const DAY_MS = 86400000;

export function accountFromRow(row) {
  if (!row) return { plan: "free", planSource: "manual", planUntil: null, seats: null, trialUntil: null, trialUsedAt: null };
  return {
    plan: PLAN_IDS.includes(row.plan) ? row.plan : "free",
    planSource: row.plan_source || "manual",
    planUntil: row.plan_until ? new Date(row.plan_until).toISOString() : null,
    seats: row.seats === null || row.seats === undefined ? null : Number(row.seats),
    trialUntil: row.trial_until ? new Date(row.trial_until).toISOString() : null,
    trialUsedAt: row.trial_used_at ? new Date(row.trial_used_at).toISOString() : null
  };
}

// What travels to the app: the account's fields plus what they mean now.
// The app recomputes with the same module; offline it keeps the last copy.
export function entitlementPayload(account, now = Date.now()) {
  const eff = Entitlements.effective(account, now);
  return {
    ...account,
    effective: {
      plan: eff.plan,
      ownPlan: eff.ownPlan,
      status: eff.status,
      graceUntil: eff.graceUntil ? new Date(eff.graceUntil).toISOString() : null,
      trialActive: eff.trialActive,
      inherited: eff.inherited,
      seats: eff.seats === Infinity ? null : eff.seats,
      notices: eff.notices
    },
    at: new Date(now).toISOString()
  };
}

export async function loadAccount(pool, userId) {
  const r = await pool.query(
    "SELECT plan, plan_source, plan_until, seats, trial_until, trial_used_at FROM app_users WHERE id = $1",
    [userId]
  );
  return accountFromRow(r.rows[0]);
}

/**
 * coachSeatState(pool, coachUserId) -> { seats, active: [ids], inactive: [ids] }
 * Oldest links first; the ones beyond the coach's seats wait. Nothing is
 * stored: a plan change moves them at the next read.
 */
export async function coachSeatState(pool, coachUserId, now = Date.now()) {
  const account = await loadAccount(pool, coachUserId);
  const eff = Entitlements.effective(account, now);
  const rows = await pool.query(
    "SELECT id, created_at, status FROM coach_clients WHERE coach_user_id = $1 AND status = 'active'",
    [coachUserId]
  );
  const clients = (rows.rows || []).map((r) => ({ id: String(r.id), createdAt: r.created_at, status: r.status }));
  return { seats: eff.seats === Infinity ? null : eff.seats, ...Entitlements.seatAssignment(clients, eff.seats) };
}

// An athlete's link to the coach: active, and inside the coach's seats.
export async function coachLinkForClient(pool, client, now = Date.now()) {
  if (!client || client.status !== "active") return { active: false, seatInactive: false };
  const lic = await pool.query(
    "SELECT 1 FROM coach_licenses WHERE user_id = $1 AND status = 'active'",
    [client.coach_user_id]
  );
  if (!lic.rows.length) return { active: false, seatInactive: false };
  const state = await coachSeatState(pool, client.coach_user_id, now);
  return { active: true, seatInactive: state.inactive.includes(String(client.id)) };
}

// The whole entitlement of the user behind a token (athletes with their link).
export async function accountEntitlement(pool, auth, now = Date.now()) {
  const account = await loadAccount(pool, auth.id);
  if (auth.role === "athlete") {
    const row = await pool.query(
      "SELECT * FROM coach_clients WHERE athlete_user_id = $1 AND status = 'active' ORDER BY id DESC LIMIT 1",
      [auth.id]
    );
    account.coachLink = await coachLinkForClient(pool, row.rows[0], now);
  }
  return entitlementPayload(account, now);
}

/** Validates an administrator's change; throws with a message on bad input. */
export function sanitizePlanChange(input = {}) {
  const plan = String(input.plan || "").toLowerCase().trim();
  if (!PLAN_IDS.includes(plan)) throw Object.assign(new Error("Piano non valido: " + PLAN_IDS.join(", ")), { statusCode: 400 });
  const source = String(input.source || "manual").toLowerCase();
  if (!SOURCES.includes(source)) throw Object.assign(new Error("Origine non valida: " + SOURCES.join(", ")), { statusCode: 400 });
  let until = null;
  if (input.until !== undefined && input.until !== null && input.until !== "") {
    const t = new Date(input.until);
    if (!Number.isFinite(t.getTime())) throw Object.assign(new Error("Scadenza non valida."), { statusCode: 400 });
    until = t.toISOString();
  }
  let seats = null;
  if (input.seats !== undefined && input.seats !== null && input.seats !== "") {
    const s = String(input.seats).toLowerCase();
    const n = s === "unlimited" || s === "illimitati" ? -1 : Number(s);
    if (!Number.isInteger(n) || n < -1 || n > 100000) throw Object.assign(new Error("Posti non validi."), { statusCode: 400 });
    seats = n;
  }
  const note = String(input.note || "").trim().slice(0, 500) || null;
  return { plan, source, until, seats, note };
}

export async function setAccountPlan(pool, userId, input, { actor = "admin" } = {}) {
  const change = sanitizePlanChange(input);
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const cur = await db.query("SELECT plan FROM app_users WHERE id = $1 FOR UPDATE", [userId]);
    if (!cur.rows[0]) throw Object.assign(new Error("Account non trovato."), { statusCode: 404 });
    await db.query(
      "UPDATE app_users SET plan = $2, plan_source = $3, plan_until = $4, seats = $5, updated_at = NOW() WHERE id = $1",
      [userId, change.plan, change.source, change.until, change.seats]
    );
    await db.query(
      `INSERT INTO app_plan_history(user_id, from_plan, to_plan, source, plan_until, seats, note, actor)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [userId, cur.rows[0].plan, change.plan, change.source, change.until, change.seats, change.note, String(actor).slice(0, 120)]
    );
    await db.query("COMMIT");
  } catch (error) {
    try { await db.query("ROLLBACK"); } catch (_) {}
    throw error;
  } finally {
    db.release();
  }
  return loadAccount(pool, userId);
}

/** Coach trial: 14 days of "coach", once per account. */
export async function startCoachTrial(pool, userId, now = Date.now()) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const cur = await db.query("SELECT plan, trial_used_at FROM app_users WHERE id = $1 FOR UPDATE", [userId]);
    if (!cur.rows[0]) throw Object.assign(new Error("Account non trovato."), { statusCode: 404 });
    if (cur.rows[0].trial_used_at) {
      throw Object.assign(new Error("Il periodo di prova e' gia' stato usato su questo account."), { statusCode: 409, code: "TRIAL_USED" });
    }
    const until = new Date(now + (FEATURES.trialDays || 14) * DAY_MS).toISOString();
    await db.query(
      "UPDATE app_users SET trial_until = $2, trial_used_at = $3, updated_at = NOW() WHERE id = $1",
      [userId, until, new Date(now).toISOString()]
    );
    await db.query(
      `INSERT INTO app_plan_history(user_id, from_plan, to_plan, source, plan_until, note, actor)
       VALUES($1,$2,$3,'trial',$4,$5,'self')`,
      [userId, cur.rows[0].plan, FEATURES.trialPlan || "coach", until, "Prova " + (FEATURES.trialDays || 14) + " giorni"]
    );
    await db.query("COMMIT");
  } catch (error) {
    try { await db.query("ROLLBACK"); } catch (_) {}
    throw error;
  } finally {
    db.release();
  }
  return loadAccount(pool, userId);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Who may administer plans: a request carrying X-Admin-Token equal to
 * NURVAN_ADMIN_TOKEN (at least 24 characters), or a logged-in user whose email
 * is in ADMIN_EMAILS. Neither set: nobody.
 */
export function isAdmin(req, auth, env = process.env) {
  const token = String(env.NURVAN_ADMIN_TOKEN || "");
  if (token.length >= 24 && safeEqual(req.headers["x-admin-token"], token)) return "token";
  const emails = String(env.ADMIN_EMAILS || "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (auth && auth.email && auth.role !== "athlete" && emails.includes(String(auth.email).toLowerCase())) return "email:" + String(auth.email).toLowerCase();
  return null;
}

export function mountPlanRoutes(app, { pool, initDb, accountFromBearer, env = process.env }) {
  async function user(req) {
    return accountFromBearer(req.headers.authorization);
  }
  async function admin(req, res) {
    const auth = await user(req);
    const who = isAdmin(req, auth, env);
    if (!who) {
      res.status(403).json({ error: "Riservato all'amministrazione." });
      return null;
    }
    await initDb();
    return who;
  }

  app.get("/api/account/plan", async (req, res) => {
    const auth = await user(req);
    if (!auth) return res.status(401).json({ error: "Accedi al tuo account." });
    await initDb();
    return res.json({ ok: true, entitlement: await accountEntitlement(pool, auth) });
  });

  app.post("/api/account/trial", async (req, res) => {
    const auth = await user(req);
    if (!auth) return res.status(401).json({ error: "Accedi al tuo account." });
    if (auth.role === "athlete") return res.status(403).json({ error: "Il periodo di prova e' per i coach." });
    await initDb();
    const lic = await pool.query("SELECT 1 FROM coach_licenses WHERE user_id = $1 AND status = 'active'", [auth.id]);
    if (!lic.rows.length) return res.status(403).json({ error: "Il periodo di prova e' per i coach: attiva prima la modalita' Coach." });
    try {
      await startCoachTrial(pool, auth.id);
      return res.json({ ok: true, entitlement: await accountEntitlement(pool, auth) });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message, code: error.code || null });
    }
  });

  app.get("/api/admin/accounts", async (req, res) => {
    if (!(await admin(req, res))) return;
    const q = String(req.query.q || "").trim().toLowerCase();
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const rows = await pool.query(
      `SELECT u.id, u.email, u.name, u.plan, u.plan_source, u.plan_until, u.seats, u.trial_until, u.trial_used_at,
              EXISTS(SELECT 1 FROM coach_licenses l WHERE l.user_id = u.id AND l.status = 'active') AS is_coach,
              (SELECT COUNT(*)::int FROM coach_clients c WHERE c.coach_user_id = u.id AND c.status = 'active') AS athletes
       FROM app_users u
       WHERE ($1 = '' OR LOWER(u.email) LIKE $2 OR LOWER(COALESCE(u.name,'')) LIKE $2)
       ORDER BY u.id ASC
       LIMIT $3`,
      [q, "%" + q + "%", limit]
    );
    const now = Date.now();
    return res.json({
      ok: true,
      accounts: rows.rows.map((r) => {
        const account = accountFromRow(r);
        const eff = Entitlements.effective(account, now);
        return {
          id: String(r.id), email: r.email, name: r.name || "", isCoach: !!r.is_coach, athletes: r.athletes,
          ...account, effectivePlan: eff.plan, status: eff.status, seatsEffective: eff.seats === Infinity ? null : eff.seats
        };
      })
    });
  });

  app.get("/api/admin/accounts/:id/history", async (req, res) => {
    if (!(await admin(req, res))) return;
    const rows = await pool.query(
      "SELECT changed_at, from_plan, to_plan, source, plan_until, seats, note, actor FROM app_plan_history WHERE user_id = $1 ORDER BY changed_at DESC, id DESC LIMIT 200",
      [req.params.id]
    );
    return res.json({ ok: true, history: rows.rows });
  });

  app.post("/api/admin/accounts/:id/plan", async (req, res) => {
    const who = await admin(req, res);
    if (!who) return;
    try {
      const account = await setAccountPlan(pool, req.params.id, req.body || {}, { actor: who });
      return res.json({ ok: true, account, entitlement: entitlementPayload(account) });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  });
}
