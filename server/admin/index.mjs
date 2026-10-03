// Dashboard di amministrazione: la pagina in admin/ servita all'indirizzo
// privato /<ADMIN_PATH>/ e le route /api/admin/*. Nessun codice condiviso con
// l'app utenti, nessun accesso diretto al database dalla pagina: tutto passa da
// qui, dietro il link privato (link.mjs) e adminGuard (email + codice).
import { listLeads, leadsCsv } from "../site/samples.mjs";
import { listWaitlist, waitlistCsv, listCoachApplications, coachApplicationsCsv } from "../site/waitlist.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdminGuard, startLogin, verifyLogin, sessionFromRequest, logout, sessionCookie, audit, clientIp, SESSION_HOURS } from "./auth.mjs";
import { listAccounts, listCoaches, metrics, nurvanCatalog, updateStaple, customFoods, recentErrors, planLog, STAPLES_PATH } from "./queries.mjs";
import { setAccountPlan, entitlementPayload } from "../account/plans.mjs";
import { adminSlug, makeLinkGate } from "./link.mjs";
import { summary, subscribers, listLedger, ledgerCsv, addLedger, voidLedger, cleanLedgerEntry, setBilling, sanitizePrices, sanitizeCosts, putSetting, getSetting, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "./economy.mjs";
import { listProfiles, profilesCsv, profileDetail, signupSeries, storageReport, addNote, deleteNote, setSuspended, revokeSessions, extendTrial } from "./profiles.mjs";
import { siteStats, appStats, metricSeries, cleanMetric, putMetric, deleteMetric, METRIC_SOURCES } from "./analytics.mjs";
import { status as integrationStatus, runIntegration, INTEGRATIONS } from "./integrations.mjs";
import { overview } from "./overview.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_DIR = path.join(__dirname, "../../admin");

// The page runs only its own scripts, never inside a frame, never cached.
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

export function mountAdminDashboard(app, { pool, initDb, sendEmail, secret, env = process.env, staplesPath = STAPLES_PATH, analytics = null, siteHosts = [] }) {
  const guard = makeAdminGuard({ pool, initDb, env });
  const slug = adminSlug(env);
  const fail = (res, error) => res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Errore del server." });
  const flush = async () => { if (analytics) await analytics.flush(); };

  function sendStatic(res, file, type) {
    for (const [k, v] of Object.entries(PAGE_HEADERS)) res.setHeader(k, v);
    res.type(type);
    // The page learns its own address here, so its scripts load from it.
    res.send(fs.readFileSync(path.join(ADMIN_DIR, file), "utf8").split("__BASE__").join("/" + slug));
  }
  // The page lives at the secret address only. Without ADMIN_PATH in production
  // there is no page at all.
  if (slug) {
    app.get("/" + slug, (req, res) => sendStatic(res, "index.html", "html"));
    app.get("/" + slug + "/:file", (req, res, next) => {
      const file = String(req.params.file || "");
      if (!/^[a-z0-9-]+\.js$/.test(file) || !fs.existsSync(path.join(ADMIN_DIR, file))) return next();
      return sendStatic(res, file, "application/javascript");
    });
  } else {
    console.warn("ADMIN_PATH non impostato: la dashboard di amministrazione e' spenta.");
  }
  app.use("/api/admin", makeLinkGate(env));

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

  // One handler wrapper for everything below: the guard, then the work.
  const route = (method, p, work) => app[method](p, async (req, res) => {
    const actor = await guard(req, res);
    if (!actor) return;
    try { return await work(req, res, actor); } catch (e) { return fail(res, e); }
  });
  const csv = (res, filename, body) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');
    return res.send("﻿" + body);
  };
  const bad = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

  /* ---------------- overview ---------------- */
  route("get", "/api/admin/overview", async (req, res) => {
    await flush();
    res.json({ ok: true, overview: await overview(pool, { siteHosts, env, days: req.query.days }) });
  });

  /* ---------------- account and plans ---------------- */
  route("get", "/api/admin/accounts", async (req, res) => res.json({ ok: true, accounts: await listAccounts(pool, { q: req.query.q, limit: req.query.limit }) }));

  route("get", "/api/admin/accounts/:id/history", async (req, res) => {
    const rows = await pool.query(
      "SELECT changed_at, from_plan, to_plan, source, plan_until, seats, note, actor FROM app_plan_history WHERE user_id = $1 ORDER BY changed_at DESC, id DESC LIMIT 200",
      [req.params.id]
    );
    res.json({ ok: true, history: rows.rows });
  });

  route("post", "/api/admin/accounts/:id/plan", async (req, res, actor) => {
    const account = await setAccountPlan(pool, req.params.id, req.body || {}, { actor });
    res.json({ ok: true, account, entitlement: entitlementPayload(account) });
  });

  route("put", "/api/admin/accounts/:id/billing", async (req, res) => {
    res.json({ ok: true, billing: await setBilling(pool, req.params.id, req.body || {}) });
  });

  route("get", "/api/admin/coaches", async (req, res) => res.json({ ok: true, coaches: await listCoaches(pool) }));
  route("get", "/api/admin/metrics", async (req, res) => res.json({ ok: true, metrics: await metrics(pool) }));
  route("get", "/api/admin/plan-log", async (req, res) => res.json({ ok: true, log: await planLog(pool) }));
  route("get", "/api/admin/errors", async (req, res) => res.json({ ok: true, ...(await recentErrors(pool)) }));

  /* ---------------- profiles ---------------- */
  route("get", "/api/admin/profiles", async (req, res) => res.json({ ok: true, ...(await listProfiles(pool, req.query)) }));
  route("get", "/api/admin/profiles.csv", async (req, res) => {
    const out = await listProfiles(pool, Object.assign({}, req.query, { limit: 500, offset: 0 }));
    csv(res, "nurvan-profili.csv", profilesCsv(out.rows));
  });
  route("get", "/api/admin/profiles/:id", async (req, res) => {
    const detail = await profileDetail(pool, req.params.id);
    if (!detail) throw bad("Account non trovato.", 404);
    res.json({ ok: true, profile: detail });
  });
  route("post", "/api/admin/profiles/:id/notes", async (req, res, actor) => res.json({ ok: true, ...(await addNote(pool, req.params.id, req.body || {}, actor)) }));
  route("delete", "/api/admin/profiles/:id/notes/:noteId", async (req, res) => res.json({ ok: await deleteNote(pool, req.params.id, req.params.noteId) }));
  route("post", "/api/admin/profiles/:id/suspend", async (req, res) => res.json({ ok: true, ...(await setSuspended(pool, req.params.id, !!(req.body && req.body.suspended))) }));
  route("post", "/api/admin/profiles/:id/revoke-sessions", async (req, res) => res.json({ ok: true, ...(await revokeSessions(pool, req.params.id)) }));
  route("post", "/api/admin/profiles/:id/extend-trial", async (req, res) => res.json({ ok: true, ...(await extendTrial(pool, req.params.id, req.body && req.body.days)) }));
  route("get", "/api/admin/signups", async (req, res) => res.json({ ok: true, series: await signupSeries(pool, req.query.days) }));
  route("get", "/api/admin/storage", async (req, res) => res.json({ ok: true, storage: await storageReport(pool) }));

  /* ---------------- economy ---------------- */
  route("get", "/api/admin/economy/summary", async (req, res) => res.json({ ok: true, summary: await summary(pool), categories: { income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES } }));
  route("get", "/api/admin/economy/subscribers", async (req, res) => res.json({ ok: true, subscribers: await subscribers(pool) }));
  route("get", "/api/admin/ledger", async (req, res) => res.json({ ok: true, rows: await listLedger(pool, req.query) }));
  route("get", "/api/admin/ledger.csv", async (req, res) => csv(res, "nurvan-contabilita.csv", ledgerCsv(await listLedger(pool, Object.assign({}, req.query, { limit: 2000 })))));
  route("post", "/api/admin/ledger", async (req, res, actor) => {
    const entry = cleanLedgerEntry(req.body || {}, actor);
    if (entry.userId) {
      const exists = await pool.query("SELECT 1 FROM app_users WHERE id = $1", [entry.userId]);
      if (!exists.rows.length) throw bad("Account non trovato.", 404);
    }
    const id = await addLedger(pool, entry);
    if (id == null) throw bad("Esiste gia' una voce con lo stesso riferimento.", 409);
    res.json({ ok: true, id: String(id) });
  });
  route("post", "/api/admin/ledger/:id/void", async (req, res) => {
    if (!(await voidLedger(pool, req.params.id))) throw bad("Voce non trovata o gia' annullata.", 404);
    res.json({ ok: true });
  });
  route("put", "/api/admin/settings/prices", async (req, res) => {
    const clean = sanitizePrices(req.body && req.body.prices);
    await putSetting(pool, "prices", clean);
    res.json({ ok: true, prices: clean });
  });
  route("put", "/api/admin/settings/costs", async (req, res) => {
    const clean = sanitizeCosts(req.body && req.body.costs);
    await putSetting(pool, "costs", clean);
    res.json({ ok: true, costs: clean });
  });

  /* ---------------- statistics ---------------- */
  route("get", "/api/admin/stats/site", async (req, res) => { await flush(); res.json({ ok: true, stats: await siteStats(pool, siteHosts, { days: req.query.days }) }); });
  route("get", "/api/admin/stats/app", async (req, res) => { await flush(); res.json({ ok: true, stats: await appStats(pool, { days: req.query.days }) }); });
  route("get", "/api/admin/stats/metrics", async (req, res) => {
    const source = String(req.query.source || "");
    if (!Object.prototype.hasOwnProperty.call(METRIC_SOURCES, source)) throw bad("Fonte non valida.");
    res.json({ ok: true, series: await metricSeries(pool, source, { days: req.query.days }), known: METRIC_SOURCES[source] });
  });
  route("post", "/api/admin/stats/metrics", async (req, res) => {
    await putMetric(pool, cleanMetric(req.body || {}), "manual");
    res.json({ ok: true });
  });
  route("delete", "/api/admin/stats/metrics", async (req, res) => {
    res.json({ ok: await deleteMetric(pool, cleanMetric(Object.assign({ value: 0 }, req.body || {}))) });
  });
  route("get", "/api/admin/integrations", async (req, res) => res.json({ ok: true, integrations: await integrationStatus(pool, env) }));
  route("post", "/api/admin/integrations/:name/run", async (req, res) => {
    if (!INTEGRATIONS[req.params.name]) throw bad("Connessione sconosciuta.", 404);
    const out = await runIntegration(pool, req.params.name, { env, secret });
    res.json({ ok: true, result: out });
  });

  /* ---------------- operations and settings ---------------- */
  route("get", "/api/admin/audit", async (req, res) => {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
    const rows = await pool.query("SELECT at, actor, action, target, detail, ip FROM admin_audit ORDER BY at DESC, id DESC LIMIT $1", [limit]);
    res.json({ ok: true, rows: rows.rows.map((r) => ({ at: new Date(r.at).toISOString(), actor: r.actor, action: r.action, target: r.target, detail: r.detail || {}, ip: r.ip })) });
  });
  route("get", "/api/admin/admin-sessions", async (req, res) => {
    const me = await sessionFromRequest(pool, req, { env });
    const rows = await pool.query(
      "SELECT token_hash, email, created_at, expires_at, ip, user_agent FROM admin_sessions WHERE revoked_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 50"
    );
    res.json({ ok: true, sessions: rows.rows.map((r) => ({ email: r.email, createdAt: new Date(r.created_at).toISOString(), expiresAt: new Date(r.expires_at).toISOString(), ip: r.ip || null, userAgent: r.user_agent || "", current: !!me && r.token_hash === me.tokenHash })) });
  });
  route("post", "/api/admin/admin-sessions/revoke-others", async (req, res) => {
    const me = await sessionFromRequest(pool, req, { env });
    if (!me) throw bad("Accedi alla dashboard.", 401);
    const r = await pool.query("UPDATE admin_sessions SET revoked_at = NOW() WHERE revoked_at IS NULL AND token_hash <> $1 RETURNING token_hash", [me.tokenHash]);
    res.json({ ok: true, revoked: r.rows.length });
  });
  // What is set up on the host, without any secret in it.
  route("get", "/api/admin/config", async (req, res) => {
    const flag = (k) => !!String(env[k] || "").trim();
    res.json({
      ok: true,
      config: {
        adminEmails: String(env.ADMIN_EMAILS || "").split(/[\s,;]+/).filter(Boolean).length,
        email: flag("RESEND_API_KEY") && flag("MAIL_FROM"),
        cliToken: String(env.NURVAN_ADMIN_TOKEN || "").length >= 24,
        linkLength: slug.length,
        production: String(env.NODE_ENV || "").toLowerCase() === "production",
        siteHosts,
        prices: await getSetting(pool, "prices", {}),
        privacyNote: "La dashboard legge piani, conteggi, date e spazio occupato. Mai il contenuto: diario, foto, misure, terapie, esami, note."
      }
    });
  });

  // Who asked for an example workout on the site, as a file for a mailing
  // tool. "contattabile": said yes to marketing email, opened the link sent
  // to the address, and has not unsubscribed.
  route("get", "/api/admin/leads.csv", async (req, res) => csv(res, "nurvan-contatti-sito.csv", leadsCsv(await listLeads(pool))));

  // The waiting list and the founding coaches' applications, as files.
  for (const [p, file, load, toCsv] of [
    ["/api/admin/waitlist.csv", "nurvan-lista-attesa.csv", listWaitlist, waitlistCsv],
    ["/api/admin/coach-applications.csv", "nurvan-candidature-coach.csv", listCoachApplications, coachApplicationsCsv]
  ]) route("get", p, async (req, res) => csv(res, file, toCsv(await load(pool))));

  /* ---------------- catalog ---------------- */
  route("get", "/api/admin/catalog", async (req, res) => res.json({ ok: true, ...nurvanCatalog(staplesPath) }));

  route("put", "/api/admin/catalog/:id", async (req, res) => {
    const change = updateStaple(req.params.id, req.body || {}, staplesPath);
    res.json({
      ok: true,
      change,
      regenerate: true,
      message: "food-staples.json aggiornato. Rigenera il catalogo (node tools/build_food_catalog.mjs), poi build e commit."
    });
  });

  route("get", "/api/admin/catalog/file", async (req, res) => {
    res.setHeader("Content-Disposition", "attachment; filename=\"food-staples.json\"");
    res.setHeader("Cache-Control", "no-store");
    res.type("application/json");
    res.send(fs.readFileSync(staplesPath, "utf8"));
  });

  route("get", "/api/admin/custom-foods", async (req, res) => res.json({ ok: true, foods: await customFoods(pool) }));
}
