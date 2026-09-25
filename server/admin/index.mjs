// Dashboard di amministrazione: la pagina in admin/ servita su /admin e le
// route /api/admin/*. Nessun codice condiviso con l'app utenti, nessun accesso
// diretto al database dalla pagina: tutto passa da qui, dietro adminGuard.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdminGuard, startLogin, verifyLogin, sessionFromRequest, logout, sessionCookie, audit, clientIp, SESSION_HOURS } from "./auth.mjs";
import { listAccounts, listCoaches, metrics, nurvanCatalog, updateStaple, customFoods, recentErrors, planLog, STAPLES_PATH } from "./queries.mjs";
import { setAccountPlan, entitlementPayload } from "../account/plans.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_DIR = path.join(__dirname, "../../admin");

// The page runs only its own script, never inside a frame, never cached.
const PAGE_HEADERS = {
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow"
};

// Very small per-IP limit on the login routes (in memory; enough for one instance).
const attempts = new Map();
function tooMany(ip, max = 20, windowMs = 3600000) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  attempts.set(ip, list);
  return list.length > max;
}

export function mountAdminDashboard(app, { pool, initDb, sendEmail, secret, env = process.env, staplesPath = STAPLES_PATH }) {
  const guard = makeAdminGuard({ pool, initDb, env });
  const fail = (res, error) => res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Errore del server." });

  function sendStatic(res, file, type) {
    for (const [k, v] of Object.entries(PAGE_HEADERS)) res.setHeader(k, v);
    res.type(type);
    res.send(fs.readFileSync(path.join(ADMIN_DIR, file), "utf8"));
  }
  app.get(["/admin", "/admin/"], (req, res) => sendStatic(res, "index.html", "html"));
  app.get("/admin/admin.js", (req, res) => sendStatic(res, "admin.js", "application/javascript"));

  /* ---------------- login ---------------- */
  app.post("/api/admin/login/start", async (req, res) => {
    if (tooMany(clientIp(req))) return res.status(429).json({ error: "Troppi tentativi: riprova piu' tardi." });
    await initDb();
    try {
      const out = await startLogin(pool, { email: req.body && req.body.email, env, secret, sendEmail });
      if (!out.ok) return res.status(out.status).json({ error: out.error });
      return res.json({ ok: true, message: "Se l'indirizzo e' abilitato, arriva un codice a 6 cifre." });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.post("/api/admin/login/verify", async (req, res) => {
    if (tooMany(clientIp(req))) return res.status(429).json({ error: "Troppi tentativi: riprova piu' tardi." });
    await initDb();
    try {
      const out = await verifyLogin(pool, { email: req.body && req.body.email, code: req.body && req.body.code, env, secret, req });
      if (!out.ok) {
        await audit(pool, { actor: String((req.body && req.body.email) || "?").slice(0, 120), action: "LOGIN_REFUSED", ip: clientIp(req) });
        return res.status(out.status).json({ error: out.error });
      }
      res.setHeader("Set-Cookie", sessionCookie(req, out.token, SESSION_HOURS * 3600));
      await audit(pool, { actor: out.email, action: "LOGIN", ip: clientIp(req) });
      return res.json({ ok: true, email: out.email, expiresAt: out.expiresAt });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.get("/api/admin/session", async (req, res) => {
    await initDb();
    const session = await sessionFromRequest(pool, req, { env });
    if (!session) return res.status(401).json({ error: "Accedi alla dashboard." });
    return res.json({ ok: true, email: session.email, expiresAt: session.expiresAt });
  });

  app.post("/api/admin/logout", async (req, res) => {
    await initDb();
    const session = await sessionFromRequest(pool, req, { env });
    await logout(pool, req);
    if (session) await audit(pool, { actor: session.email, action: "LOGOUT", ip: clientIp(req) });
    res.setHeader("Set-Cookie", sessionCookie(req, "", 0));
    return res.json({ ok: true });
  });

  /* ---------------- account and plans ---------------- */
  app.get("/api/admin/accounts", async (req, res) => {
    if (!(await guard(req, res))) return;
    try { return res.json({ ok: true, accounts: await listAccounts(pool, { q: req.query.q, limit: req.query.limit }) }); } catch (e) { return fail(res, e); }
  });

  app.get("/api/admin/accounts/:id/history", async (req, res) => {
    if (!(await guard(req, res))) return;
    const rows = await pool.query(
      "SELECT changed_at, from_plan, to_plan, source, plan_until, seats, note, actor FROM app_plan_history WHERE user_id = $1 ORDER BY changed_at DESC, id DESC LIMIT 200",
      [req.params.id]
    );
    return res.json({ ok: true, history: rows.rows });
  });

  app.post("/api/admin/accounts/:id/plan", async (req, res) => {
    const actor = await guard(req, res);
    if (!actor) return;
    try {
      const account = await setAccountPlan(pool, req.params.id, req.body || {}, { actor });
      return res.json({ ok: true, account, entitlement: entitlementPayload(account) });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.get("/api/admin/coaches", async (req, res) => {
    if (!(await guard(req, res))) return;
    try { return res.json({ ok: true, coaches: await listCoaches(pool) }); } catch (e) { return fail(res, e); }
  });

  app.get("/api/admin/metrics", async (req, res) => {
    if (!(await guard(req, res))) return;
    try { return res.json({ ok: true, metrics: await metrics(pool) }); } catch (e) { return fail(res, e); }
  });

  app.get("/api/admin/plan-log", async (req, res) => {
    if (!(await guard(req, res))) return;
    try { return res.json({ ok: true, log: await planLog(pool) }); } catch (e) { return fail(res, e); }
  });

  app.get("/api/admin/errors", async (req, res) => {
    if (!(await guard(req, res))) return;
    try { return res.json({ ok: true, ...(await recentErrors(pool)) }); } catch (e) { return fail(res, e); }
  });

  /* ---------------- catalog ---------------- */
  app.get("/api/admin/catalog", async (req, res) => {
    if (!(await guard(req, res))) return;
    try { return res.json({ ok: true, ...nurvanCatalog(staplesPath) }); } catch (e) { return fail(res, e); }
  });

  app.put("/api/admin/catalog/:id", async (req, res) => {
    if (!(await guard(req, res))) return;
    try {
      const change = updateStaple(req.params.id, req.body || {}, staplesPath);
      return res.json({
        ok: true,
        change,
        regenerate: true,
        message: "food-staples.json aggiornato. Rigenera il catalogo (node tools/build_food_catalog.mjs), poi build e commit."
      });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.get("/api/admin/catalog/file", async (req, res) => {
    if (!(await guard(req, res))) return;
    res.setHeader("Content-Disposition", "attachment; filename=\"food-staples.json\"");
    res.setHeader("Cache-Control", "no-store");
    res.type("application/json");
    return res.send(fs.readFileSync(staplesPath, "utf8"));
  });

  app.get("/api/admin/custom-foods", async (req, res) => {
    if (!(await guard(req, res))) return;
    try { return res.json({ ok: true, foods: await customFoods(pool) }); } catch (e) { return fail(res, e); }
  });
}
