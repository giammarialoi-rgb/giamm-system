import express from "express";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import pg from "pg";
import jwt from "jsonwebtoken";
import ExcelJS from "exceljs";
import crypto from "crypto";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import * as XLSX from "xlsx";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { extractExcelStructuredForApi, detectFormat, DI_MAX_BYTES } from "./document-intelligence-core.mjs";
import { ensureCoachPracticeTables, mountCoachPractice } from "./coach-practice.mjs";
import { mountProgramGenerateRoutes } from "./server/program/generator.mjs";
import { mountFoodRoutes } from "./server/food/index.mjs";
import { mountMediaRoutes } from "./server/media/media-routes.mjs";
import { mergeAccountDataBlobs, updateAccountData } from "./server/account/index.mjs";
import { accountEntitlement, mountPlanRoutes } from "./server/account/plans.mjs";
import { publicUser, resolveIdentityUser, mountAccountDeletion } from "./server/account/identity.mjs";
import { createSessionGate, revocationMoment } from "./server/account/sessions.mjs";
import { appleCallbackRoute, appleConfig, mountAppleAuth } from "./server/account/apple.mjs";
import { mountAdminDashboard } from "./server/admin/index.mjs";
import { touchLastSeen, recordEvent, fileFormat } from "./server/admin/activity.mjs";
import { runMigrations } from "./server/db/migrate.mjs";
import {
  buildCorsOriginValidator,
  createFixedWindowRateLimiter,
  createPostgresFixedWindowRateLimiter,
  isProduction,
  resolveJwtSecret
} from "./server/security.mjs";
import { createAiGateway, aiPublicStatus } from "./server/ai/gateway.mjs";
import { normalizeHealthEvent, verifyWebhookSignature } from "./server/integrations/health.mjs";
import { calendarPublicConfig } from "./server/integrations/calendar.mjs";

dotenv.config();

const RELEASE_META = JSON.parse(
  await fs.readFile(new URL("./release.json", import.meta.url), "utf8")
);
const app = express();
const port = process.env.PORT || 3000;

// How many proxies sit in front of the server (Render: one). req.ip is the
// address the outermost trusted one saw; the rate limits key on it.
app.set("trust proxy", Math.max(0, Number(process.env.TRUST_PROXY_HOPS || 1)));
// Apple posts its answer from appleid.apple.com (form_post), so the route sits
// before the CORS allowlist, like the webhook below. What makes it safe is the
// state it carries back, signed by this server (server/account/apple.mjs).
const appleCallbackTarget = { handle: null };
// It also sits before the /api/auth limiter (that one needs the database):
// an in-memory limit of its own, per IP.
appleCallbackRoute(app, [
  createFixedWindowRateLimiter({ windowMs: 15 * 60_000, max: Number(process.env.AUTH_RATE_LIMIT_MAX || 40), keyPrefix: "apple-callback" }),
  express.urlencoded({ extended: false, limit: "64kb" })
], appleCallbackTarget);
app.use(cors({ origin: buildCorsOriginValidator(process.env), credentials: true }));
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});
// Raw body must be captured before the JSON parser so webhook HMAC validation
// is performed against the exact bytes signed by the sender.
app.post("/api/webhooks/google-health", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  if (!verifyWebhookSignature(raw, req.headers["x-google-health-signature"], process.env.GOOGLE_HEALTH_WEBHOOK_SECRET)) return res.status(401).json({ error: "Invalid webhook signature." });
  try {
    const event = normalizeHealthEvent(JSON.parse(raw));
    await initDb();
    if (!dbInitialized) return res.status(503).json({ error: "Storage unavailable." });
    // Subscription-to-user resolution is provider-specific. Do not trust a
    // caller-supplied user header; events remain unassigned until that verified
    // mapping is configured by the operator.
    const inserted = await pool.query("INSERT INTO health_events(id, user_id, source, event_type, occurred_at, payload) VALUES($1, NULL, $2, $3, $4, $5) ON CONFLICT(id) DO NOTHING RETURNING id", [event.id, event.source, event.type, event.occurredAt, JSON.stringify(event.data)]);
    return res.status(inserted.rowCount ? 202 : 200).json({ ok: true, id: event.id, duplicate: !inserted.rowCount });
  } catch (_) { return res.status(400).json({ error: "Invalid health event." }); }
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
const distributedRateLimiter = (options) => createPostgresFixedWindowRateLimiter({ ...options, getPool: () => pool });
app.use("/api/auth", distributedRateLimiter({
  windowMs: 15 * 60_000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 40),
  keyPrefix: "auth"
}));
// The AI routes spend the Gemini budget (and the barcode lookup pays for
// Google Search grounding): signed-in accounts only. They used to answer
// anyone. Exact paths, registered before the handlers - an app.use on
// "/api/coach" would also catch every coach route under it.
const AI_ROUTES = [
  "/api/chat", "/coach", "/api/coach",
  "/api/analyze-file", "/api/analyze", "/analyze",
  "/api/ingest/document",
  "/api/food/analyze-photo", "/api/food/ocr-label", "/api/food/barcode/:code/ai-lookup"
];
app.post(AI_ROUTES, async (req, res, next) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Accedi al tuo account per usare Coach AI.", code: "AI_AUTH_REQUIRED" });
  req.aiAccount = auth;
  return next();
}, createFixedWindowRateLimiter({
  // Per account on top of the per-IP limits: the label OCR had none.
  windowMs: 10 * 60_000,
  max: Number(process.env.AI_ACCOUNT_RATE_LIMIT_MAX || 120),
  keyPrefix: "ai-account",
  key: (req) => "u" + String(req.aiAccount && req.aiAccount.id)
}));

// The athletes' login sits outside /api/auth: it had no limit at all, with
// coach-chosen passwords of 4 characters and every try a bcrypt compare.
app.use(["/api/client/login", "/api/client/password-help"], distributedRateLimiter({
  windowMs: 15 * 60_000,
  max: Number(process.env.CLIENT_AUTH_RATE_LIMIT_MAX || 20),
  keyPrefix: "client-auth"
}));
app.use(
  ["/api/analyze-file", "/analyze", "/api/analyze", "/api/ingest/document"],
  distributedRateLimiter({
    windowMs: 60_000,
    max: Number(process.env.IMPORT_RATE_LIMIT_MAX || 20),
    keyPrefix: "import"
  })
);
app.use(
  "/api/food/analyze-photo",
  distributedRateLimiter({
    windowMs: 60_000,
    max: Number(process.env.MEAL_PHOTO_RATE_LIMIT_MAX || 12),
    keyPrefix: "meal-photo"
  })
);
app.use(
  ["/api/chat", "/coach", "/api/coach"],
  distributedRateLimiter({
    windowMs: 60_000,
    max: Number(process.env.CHAT_RATE_LIMIT_MAX || 30),
    keyPrefix: "chat",
    code: "AI_RATE_LIMITED",
    message: "Troppe richieste al Coach AI. Attendi qualche secondo e riprova."
  })
);
const barcodeAiRateLimiter = distributedRateLimiter({
  windowMs: 60_000,
  max: Number(process.env.BARCODE_AI_RATE_LIMIT_MAX || 10),
  keyPrefix: "barcode-ai",
  code: "AI_RATE_LIMITED",
  message: "Troppe richieste al Coach AI. Attendi qualche secondo e riprova."
});

import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function renderPostgresRegions() {
  const preferred = process.env.RENDER_POSTGRES_REGION || process.env.DATABASE_REGION || "";
  return [...new Set([preferred, "oregon", "frankfurt", "ohio", "virginia", "singapore"].filter(Boolean))];
}

function rewriteRenderInternalHost(urlStr, region) {
  try {
    const u = new URL(urlStr);
    if (u.hostname.includes(".")) return urlStr;
    if (!/^dpg-[a-z0-9-]+$/i.test(u.hostname) || !region) return urlStr;
    u.hostname = `${u.hostname}.${region}-postgres.render.com`;
    return u.toString();
  } catch {
    return urlStr;
  }
}

function databaseUrlCandidates() {
  const raw = [
    process.env.DATABASE_PUBLIC_URL,
    process.env.DATABASE_EXTERNAL_URL,
    process.env.DATABASE_URL
  ].filter(Boolean);
  const out = [];
  const seen = new Set();
  function add(u) {
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  }
  raw.forEach(add);
  raw.forEach((u) => renderPostgresRegions().forEach((region) => add(rewriteRenderInternalHost(u, region))));
  return out;
}

function sslForDatabaseUrl(urlStr) {
  return urlStr && !/localhost|127\.0\.0\.1/i.test(urlStr) ? { rejectUnauthorized: false } : false;
}

function summarizeDbError(err) {
  if (!err) return { message: "unknown" };
  const out = {
    message: err.message || String(err),
    code: err.code || undefined,
    hostname: err.hostname || undefined
  };
  if (err.cause && err.cause.message) out.cause = err.cause.message;
  return out;
}

function attachPoolGuards(poolInstance, label) {
  if (!poolInstance || poolInstance.__nurvanGuarded) return poolInstance;
  poolInstance.__nurvanGuarded = true;
  poolInstance.on("error", (err) => {
    logDbIssue("PG_POOL_ERROR " + (label || ""), summarizeDbError(err));
  });
  return poolInstance;
}

function createPgPool(connectionString, label) {
  return attachPoolGuards(new pg.Pool({
    connectionString,
    ssl: sslForDatabaseUrl(connectionString),
    max: 10,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 12000
  }), label || hostnameOf(connectionString));
}

function hostnameOf(urlStr) {
  try { return new URL(urlStr).hostname; } catch { return ""; }
}

const poolHolder = {
  current: createPgPool(databaseUrlCandidates()[0] || process.env.DATABASE_URL || "postgres://127.0.0.1/nurvan", "boot")
};
const pool = new Proxy({}, {
  get(_target, prop) {
    const current = poolHolder.current;
    const val = current[prop];
    return typeof val === "function" ? val.bind(current) : val;
  }
});

let dbInitialized = false;
let dbInitError = null;
let dbHost = "";
let dbSchemaVersion = null;
let lastDbLogKey = "";
let initInFlight = null;

function logDbIssue(label, extra) {
  const key = label + JSON.stringify(extra || {});
  if (key === lastDbLogKey) return;
  lastDbLogKey = key;
  console.error(label, extra || "");
}

async function initDb() {
  if (dbInitialized) return;
  if (initInFlight) return initInFlight;
  initInFlight = (async () => {
    const urls = databaseUrlCandidates();
    if (!urls.length) {
      dbInitError = { message: "DATABASE_URL missing" };
      return;
    }
    for (const url of urls) {
      if (dbInitialized) return;
      const host = hostnameOf(url);
      const next = createPgPool(url, host || "candidate");
      let client = null;
      try {
        client = await next.connect();
        await client.query("BEGIN");
        await client.query(`
        CREATE TABLE IF NOT EXISTS app_users (
          id BIGSERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          password_hash TEXT,
          provider TEXT NOT NULL DEFAULT 'email',
          provider_id TEXT,
          avatar_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS app_account_data (
          user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          revision BIGINT NOT NULL DEFAULT 1,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email';
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS provider_id TEXT;
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        UPDATE app_users SET provider = 'email' WHERE provider IS NULL;
        ALTER TABLE app_account_data ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE app_account_data ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;
        ALTER TABLE app_account_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        CREATE INDEX IF NOT EXISTS idx_app_users_provider ON app_users(provider, provider_id);
        CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
        CREATE TABLE IF NOT EXISTS app_password_resets (
          email TEXT PRIMARY KEY,
          code_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          attempts INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
        await client.query("COMMIT");
        await ensureCoachPracticeTables(client);
        const migrationResult = await runMigrations(client);
        dbSchemaVersion = migrationResult.latest;
        client.release();
        client = null;
        const previous = poolHolder.current;
        poolHolder.current = next;
        dbInitialized = true;
        dbInitError = null;
        dbHost = host;
        console.log("Database tables verified successfully. host=" + host);
        if (previous && previous !== next) {
          setTimeout(() => {
            previous.end().catch((err) => logDbIssue("PG_POOL_END", summarizeDbError(err)));
          }, 1500);
        }
        return;
      } catch (err) {
        dbInitError = Object.assign(summarizeDbError(err), { hostname: host || err.hostname });
        logDbIssue("DB Connection Error during init:", dbInitError);
        try { if (client) await client.query("ROLLBACK"); } catch (_) {}
        try { if (client) client.release(true); } catch (_) {}
        await next.end().catch(() => {});
      }
    }
  })().finally(() => { initInFlight = null; });
  return initInFlight;
}

initDb().catch((err) => logDbIssue("DB_INIT_UNHANDLED", summarizeDbError(err)));
setInterval(() => {
  if (!dbInitialized) initDb().catch((err) => logDbIssue("DB_INIT_RETRY", summarizeDbError(err)));
}, 25000);

process.on("unhandledRejection", (reason) => {
  logDbIssue("UNHANDLED_REJECTION", summarizeDbError(reason));
});
process.on("uncaughtException", (err) => {
  logDbIssue("UNCAUGHT_EXCEPTION", summarizeDbError(err));
  // Keep process up for transient pg client noise after pool swap; hard-exit on non-pg crashes.
  const msg = String(err && err.message || "");
  if (!/postgres|pg-|ECONN|ENOTFOUND|connection|SSL|timeout/i.test(msg)) {
    process.exit(1);
  }
});

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  if (!hash || !password) return false;
  return bcrypt.compare(password, hash);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

const JWT_SECRET = resolveJwtSecret(process.env);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

function sanitizeGoogleClientId(raw) {
  const stripped = String(raw || "")
    .trim()
    .replace(/^GOOGLE_CLIENT_IDS?\s*=\s*/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
  const match = stripped.match(/[a-z0-9-]+\.apps\.googleusercontent\.com/i);
  return match ? match[0] : "";
}

function allowedGoogleAudiences() {
  const ids = new Set();
  const envId = sanitizeGoogleClientId(GOOGLE_CLIENT_ID);
  if (envId) ids.add(envId);
  String(process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map((s) => sanitizeGoogleClientId(s))
    .filter(Boolean)
    .forEach((id) => ids.add(id));
  return [...ids];
}

function publicGoogleClientId() {
  return sanitizeGoogleClientId(GOOGLE_CLIENT_ID);
}

// The server's one email channel (Resend): reset codes and dashboard codes.
async function sendEmail(to, subject, text) {
  const from = process.env.MAIL_FROM || process.env.RESEND_FROM || "";
  const key = process.env.RESEND_API_KEY || "";
  if (!key || !from) return { sent: false, reason: "mail_not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to, subject, text })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.warn("MAIL_FAIL", res.status, t.slice(0, 200));
      return { sent: false, reason: "mail_failed" };
    }
    return { sent: true };
  } catch (err) {
    console.warn("MAIL_ERROR", err?.message || err);
    return { sent: false, reason: "mail_failed" };
  }
}
Object.defineProperty(sendEmail, "configured", {
  get: () => Boolean(process.env.RESEND_API_KEY && (process.env.MAIL_FROM || process.env.RESEND_FROM))
});

async function sendPasswordResetEmail(email, code) {
  return sendEmail(
    email,
    "NURVAN — codice di recupero password",
    `Il tuo codice di recupero NURVAN è: ${code}\n\nScade tra 60 minuti. Se non hai richiesto il reset, ignora questa email.`
  );
}

function issueAccountToken(user) {
  const role = user.role || (user.provider === "coach_client" ? "athlete" : "user");
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      name: user.name,
      provider: user.provider,
      role,
      clientId: user.clientId || undefined
    },
    JWT_SECRET,
    { expiresIn: "90d" }
  );
}

// Tokens of a deleted account, or issued before the account's sessions were
// ended (password reset, account taken back by its verified email), are
// refused: see server/account/sessions.mjs.
const sessionGate = createSessionGate({ getPool: () => pool, enabled: () => Boolean(process.env.DATABASE_URL) && dbInitialized });

async function accountFromBearer(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.sub) return null;
    if (!(await sessionGate.allows(payload))) return null;
    const provider = payload.provider;
    const role = payload.role || (provider === "coach_client" ? "athlete" : "user");
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      provider,
      role,
      clientId: payload.clientId || null
    };
  } catch (_) {
    return null;
  }
}

async function verifyGoogleCredential(idToken) {
  if (!idToken) throw Object.assign(new Error("Missing Google ID token."), { statusCode: 400 });
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw Object.assign(new Error("Failed to verify Google ID token with Google servers."), { statusCode: 401 });
  }
  const payload = await response.json();
  const allowed = allowedGoogleAudiences();
  if (allowed.length && !allowed.includes(String(payload.aud || ""))) {
    throw Object.assign(new Error("Google token client ID does not match the configured web client ID."), { statusCode: 401 });
  }
  if (!payload.email) {
    throw Object.assign(new Error("Google non ha fornito un’email. Consenti la condivisione email e riprova."), { statusCode: 401 });
  }
  const verified = payload.email_verified === true || payload.email_verified === "true";
  if (!verified) {
    throw Object.assign(new Error("Email Google non verificata."), { statusCode: 401 });
  }
  return {
    provider: "google",
    sub: payload.sub,
    email: payload.email,
    emailVerified: verified,
    name: payload.name || "",
    avatarUrl: payload.picture || null
  };
}

// A signed-in account that adds Google links it; the account keeps its email.
async function issueOAuthResponse(req, res, identity) {
  const auth = await accountFromBearer(req.headers.authorization);
  const { user, passwordCleared } = await resolveIdentityUser(pool, { ...identity, linkingUserId: auth && auth.role === "user" ? auth.id : null });
  if (passwordCleared) sessionGate.forget(user.id);
  return res.json({ token: issueAccountToken(user), user: publicUser(user), passwordCleared: Boolean(passwordCleared) });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

function nullable(type) {
  return {
    type: [type, "null"]
  };
}

const setSchema = {
  type: "object",
  properties: {
    order: { type: "integer" },
    reps: nullable("string"),
    load: nullable("number"),
    load_unit: nullable("string"),
    percentage_1rm: nullable("number"),
    rpe: nullable("number"),
    rir: nullable("number"),
    rest_seconds: nullable("integer"),
    tempo: nullable("string"),
    done: nullable("boolean")
  }
};

const workoutSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    source_summary: { type: "string" },
    assumptions: { type: "array", items: { type: "string" } },
    global_rules: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    weeks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          week: { type: "integer" },
          label: { type: "string" },
          sessions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                title: { type: "string" },
                is_bonus: nullable("boolean"),
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      order: { type: "integer" },
                      movement: nullable("string"),
                      is_bonus: nullable("boolean"),
                      muscle_group: nullable("string"),
                      muscle_groups: { type: "array", items: { type: "string" } },
                      superset_id: nullable("string"),
                      sets: nullable("integer"),
                      sets_data: {
                        type: "array",
                        items: setSchema
                      },
                      reps: nullable("string"),
                      load: nullable("number"),
                      load_unit: nullable("string"),
                      percentage_1rm: nullable("number"),
                      rpe: nullable("number"),
                      rir: nullable("number"),
                      rest_seconds: nullable("integer"),
                      tempo: nullable("string"),
                      notes: nullable("string"),
                      progression_rule: nullable("string")
                    },
                    required: [
                      "name",
                      "order"
                    ]
                  }
                }
              },
              required: [
                "day",
                "exercises"
              ]
            }
          }
        },
        required: [
          "week",
          "sessions"
        ]
      }
    }
  },
  required: [
    "title",
    "weeks"
  ]
};

const AI_STATUS = aiPublicStatus(process.env);
const MODEL = AI_STATUS.model;
// Meal-photo analysis can use a stronger/slower vision model than chat without touching chat latency/cost.
// Defaults to MODEL (no behavior change) unless explicitly overridden on Render.
const MEAL_VISION_MODEL = process.env.MEAL_VISION_MODEL || MODEL;

function getClient() {
  return createAiGateway(process.env);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function geminiErrorStatus(err) {
  return Number(err?.status || err?.statusCode || err?.response?.status || err?.cause?.status) || null;
}

function isRetryableGeminiError(err) {
  const status = geminiErrorStatus(err);
  if (status === 429 || status === 500 || status === 503 || status === 504) return true;
  const msg = String(err?.message || "");
  return /RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|ECONNRESET|ETIMEDOUT|ENOTFOUND|network/i.test(msg);
}

// Maps a Gemini failure (after retries are exhausted) to the AI_* codes the
// web client already knows how to render as friendly Italian messages.
function classifyGeminiError(err) {
  const status = geminiErrorStatus(err);
  const msg = String(err?.message || "");
  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(msg)) {
    return /quota/i.test(msg) ? "AI_QUOTA_EXCEEDED" : "AI_RATE_LIMITED";
  }
  if (status === 503 || status === 504 || /UNAVAILABLE|overloaded/i.test(msg)) {
    return "AI_PROVIDER_UNAVAILABLE";
  }
  return null;
}

async function generateContentWithRetry(ai, { model, partsAttempts, label, config }) {
  const delaysMs = [0, 700, 1800];
  let lastErr;
  for (let attempt = 0; attempt < delaysMs.length; attempt++) {
    if (delaysMs[attempt] > 0) {
      await sleep(delaysMs[attempt] + Math.floor(Math.random() * 300));
    }
    const parts = partsAttempts[Math.min(attempt, partsAttempts.length - 1)];
    try {
      const request = { model, contents: [{ role: "user", parts }] };
      if (config) request.config = config;
      return await ai.models.generateContent(request);
    } catch (err) {
      lastErr = err;
      console.warn(`${label} attempt ${attempt + 1}/${delaysMs.length} failed`, err?.message || err);
      if (!isRetryableGeminiError(err)) break;
    }
  }
  throw lastErr;
}

function cloneWeekWithUniqueIds(templateWeek, newWeekNum) {
  const copy = JSON.parse(JSON.stringify(templateWeek));
  copy.id = `w${newWeekNum}`;
  copy.week = newWeekNum;
  copy.weekNumber = newWeekNum;
  copy.label = `Settimana ${newWeekNum}`;

  const sessions = copy.sessions || copy.days || [];
  sessions.forEach((s, sIdx) => {
    s.id = `${copy.id}_s${sIdx + 1}`;
    s.day = s.day || `Giorno ${sIdx + 1}`;
    const exercises = s.exercises || s.rows || [];
    exercises.forEach((e, eIdx) => {
      e.id = `${s.id}_e${eIdx + 1}`;
      if (e.superset_id) {
        const baseSs = String(e.superset_id).replace(/^ss_w\d+_/, "");
        e.superset_id = `ss_w${newWeekNum}_${baseSs}`;
      }
      if (Array.isArray(e.sets)) {
        e.sets.forEach((st, stIdx) => {
          st.id = `${e.id}_s${stIdx + 1}`;
          st.order = stIdx + 1;
        });
      }
    });
    s.exercises = exercises;
    s.rows = exercises;
  });
  copy.sessions = sessions;
  copy.days = sessions;
  return copy;
}

// Canonical Program Modifier Engine
function applyOperationsToProgram(program, operations) {
  if (!program || typeof program !== "object") {
    throw new Error("Programma non valido o mancante.");
  }
  if (!Array.isArray(operations) || !operations.length) {
    return { ok: true, program, appliedCount: 0 };
  }

  const cloned = JSON.parse(JSON.stringify(program));
  if (!Array.isArray(cloned.weeks) || !cloned.weeks.length) {
    throw new Error("Il programma non contiene settimane valide.");
  }

  let appliedCount = 0;

  for (let opIdx = 0; opIdx < operations.length; opIdx++) {
    const op = operations[opIdx];
    if (!op || typeof op !== "object") continue;

    const type = op.type;
    const targetWeekNum = op.week;
    const targetSessionSpec = op.session;
    const targetExName = String(op.exercise || "").toLowerCase();
    const targetExId = op.exercise_id;
    const targetSetIndex = op.set_index;
    const changes = op.changes || {};

    if (type === "add_week") {
      const targetNum = Number(targetWeekNum) || (cloned.weeks.length + 1);
      while (cloned.weeks.length < targetNum) {
        const nextNum = cloned.weeks.length + 1;
        const sourceWeek = (changes.source_week && cloned.weeks[changes.source_week - 1]) || cloned.weeks[cloned.weeks.length - 1];
        const newWeek = cloneWeekWithUniqueIds(sourceWeek, nextNum);
        if (nextNum === targetNum) {
          if (changes.label) newWeek.label = changes.label;
          if (changes.notes) newWeek.notes = changes.notes;
          if (changes.title) newWeek.title = changes.title;
        }
        cloned.weeks.push(newWeek);
        appliedCount++;
      }
      if (targetNum <= cloned.weeks.length) {
        const existingWeek = cloned.weeks[targetNum - 1];
        if (existingWeek) {
          if (changes.label) existingWeek.label = changes.label;
          if (changes.notes) existingWeek.notes = changes.notes;
          if (changes.title) existingWeek.title = changes.title;
          appliedCount++;
        }
      }
      continue;
    }

    if (type === "extend_weeks" || type === "set_program_duration") {
      const desired = Number(changes.duration || op.weeks || targetWeekNum || 12);
      if (desired > cloned.weeks.length) {
        while (cloned.weeks.length < desired) {
          const nextNum = cloned.weeks.length + 1;
          const template = cloned.weeks[cloned.weeks.length - 1];
          const newWeek = cloneWeekWithUniqueIds(template, nextNum);
          cloned.weeks.push(newWeek);
          appliedCount++;
        }
      } else if (desired < cloned.weeks.length && desired >= 1) {
        cloned.weeks = cloned.weeks.slice(0, desired);
        appliedCount++;
      }
      continue;
    }

    if (type === "remove_week") {
      const weekIndex = cloned.weeks.findIndex(w => (w.weekNumber ?? w.week) === Number(targetWeekNum) || w.id === targetWeekNum || w.id === `w${targetWeekNum}`);
      if (weekIndex >= 0) {
        cloned.weeks.splice(weekIndex, 1);
        cloned.weeks.forEach((w, idx) => {
          w.week = idx + 1;
          w.weekNumber = idx + 1;
        });
        appliedCount++;
      }
      continue;
    }

    let weeksToModify = [];
    if (targetWeekNum === "all" || targetWeekNum == null) {
      weeksToModify = cloned.weeks;
    } else {
      weeksToModify = cloned.weeks.filter(w => (w.weekNumber ?? w.week) === Number(targetWeekNum) || w.id === targetWeekNum || w.id === `w${targetWeekNum}`);
    }

    if (!weeksToModify.length) {
      continue;
    }

    weeksToModify.forEach(w => {
      const sessions = w.sessions || w.days || [];
      let sessionsToModify = [];

      if (targetSessionSpec === "all" || targetSessionSpec == null) {
        sessionsToModify = sessions;
      } else if (typeof targetSessionSpec === "number") {
        const s = sessions[targetSessionSpec - 1];
        if (s) sessionsToModify.push(s);
      } else {
        const specStr = String(targetSessionSpec).toLowerCase();
        sessionsToModify = sessions.filter((s, idx) => {
          const dayMatch = String(s.day || "").toLowerCase().includes(specStr);
          const titleMatch = String(s.title || "").toLowerCase().includes(specStr);
          const numMatch = specStr.includes(String(idx + 1));
          return dayMatch || titleMatch || numMatch;
        });
        if (!sessionsToModify.length && sessions.length) {
          sessionsToModify.push(sessions[0]);
        }
      }

      if (!sessionsToModify.length) return;

      if (type === "add_session") {
        const newOrder = sessions.length + 1;
        const newS = {
          id: `${w.id || "w1"}_s${newOrder}`,
          day: changes.day || `Giorno ${newOrder}`,
          title: changes.title || `SESSIONE ${newOrder}`,
          is_bonus: Boolean(changes.is_bonus),
          exercises: []
        };
        sessions.push(newS);
        appliedCount++;
        return;
      }

      if (type === "remove_session") {
        const sIndex = sessions.findIndex((s, idx) => {
          if (typeof targetSessionSpec === "number") return idx === targetSessionSpec - 1;
          const specStr = String(targetSessionSpec).toLowerCase();
          return String(s.day || "").toLowerCase().includes(specStr) || String(s.title || "").toLowerCase().includes(specStr);
        });
        if (sIndex >= 0) {
          sessions.splice(sIndex, 1);
          appliedCount++;
        }
        return;
      }

      if (type === "modify_session") {
        sessionsToModify.forEach(s => {
          if (changes.title) s.title = changes.title;
          if (changes.day) s.day = changes.day;
          if (changes.is_bonus !== undefined) s.is_bonus = Boolean(changes.is_bonus);
          appliedCount++;
        });
        return;
      }

      sessionsToModify.forEach(s => {
        const exercises = s.exercises || s.rows || [];

        if (type === "add_exercise") {
          const exName = op.target_exercise || op.exercise || changes.name || "Nuovo Esercizio";
          const setsCount = Number(changes.sets || 3);
          const setsList = Array.from({ length: setsCount }, (_, i) => ({
            id: `${s.id || "s"}_e${exercises.length + 1}_s${i + 1}`,
            order: i + 1,
            reps: changes.reps || "8-10",
            load: changes.load != null ? Number(changes.load) : null,
            load_unit: changes.load_unit || "kg",
            percentage_1rm: changes.percentage_1rm != null ? Number(changes.percentage_1rm) : null,
            rpe: changes.rpe != null ? Number(changes.rpe) : null,
            rir: changes.rir != null ? Number(changes.rir) : 1,
            rest_seconds: changes.rest_seconds || 90,
            tempo: changes.tempo || "",
            done: false
          }));

          exercises.push({
            id: `${s.id || "s"}_e${exercises.length + 1}`,
            name: exName,
            exercise: exName,
            order: exercises.length + 1,
            movement: changes.movement || "ALTRO",
            muscle_groups: Array.isArray(changes.muscle_groups) ? changes.muscle_groups : (changes.muscle_group ? [changes.muscle_group] : []),
            muscle_group: changes.muscle_group || null,
            superset_id: changes.superset_id || null,
            notes: changes.notes || "",
            progression_rule: changes.progression_rule || "",
            is_bonus: Boolean(changes.is_bonus || s.is_bonus),
            sets: setsList,
            repsTarget: changes.reps || "8-10",
            rirTarget: changes.rir != null ? Number(changes.rir) : 1,
            rpeTarget: changes.rpe != null ? Number(changes.rpe) : null,
            rest: changes.rest || "90s",
            plannedLoad: changes.load != null ? Number(changes.load) : null,
            tempo: changes.tempo || ""
          });
          s.exercises = exercises;
          s.rows = exercises;
          appliedCount++;
          return;
        }

        if (type === "remove_exercise") {
          const initialLen = exercises.length;
          const filtered = exercises.filter(ex => {
            const matchName = targetExName && String(ex.name || ex.exercise || "").toLowerCase().includes(targetExName);
            const matchId = targetExId && ex.id === targetExId;
            return !(matchName || matchId);
          });
          s.exercises = filtered;
          s.rows = filtered;
          appliedCount += (initialLen - filtered.length);
          return;
        }

        if (type === "replace_exercise") {
          exercises.forEach(ex => {
            const matchName = targetExName && String(ex.name || ex.exercise || "").toLowerCase().includes(targetExName);
            const matchId = targetExId && ex.id === targetExId;
            if (matchName || matchId) {
              const newName = op.target_exercise || changes.name || "Esercizio Sostitutivo";
              ex.name = newName;
              ex.exercise = newName;
              if (changes.movement) ex.movement = changes.movement;
              if (changes.muscle_groups) ex.muscle_groups = changes.muscle_groups;
              if (changes.notes) ex.notes = changes.notes;
              appliedCount++;
            }
          });
          return;
        }

        if (type === "create_superset") {
          const ssId = changes.superset_id || `ss_${Date.now().toString(36)}`;
          const names = [targetExName, String(op.target_exercise || "").toLowerCase()].filter(Boolean);
          exercises.forEach(ex => {
            const currentName = String(ex.name || ex.exercise || "").toLowerCase();
            if (names.some(n => currentName.includes(n)) || (targetExId && ex.id === targetExId)) {
              ex.superset_id = ssId;
              appliedCount++;
            }
          });
          return;
        }

        if (type === "remove_superset") {
          exercises.forEach(ex => {
            const matchName = targetExName && String(ex.name || ex.exercise || "").toLowerCase().includes(targetExName);
            const matchId = targetExId && ex.id === targetExId;
            const matchSS = changes.superset_id && ex.superset_id === changes.superset_id;
            if (matchName || matchId || matchSS) {
              ex.superset_id = null;
              appliedCount++;
            }
          });
          return;
        }

        exercises.forEach(ex => {
          const matchName = targetExName && String(ex.name || ex.exercise || "").toLowerCase().includes(targetExName);
          const matchId = targetExId && ex.id === targetExId;
          if (!matchName && !matchId && targetExName) return;

          if (!Array.isArray(ex.sets)) {
            const n = typeof ex.sets === "number" ? ex.sets : 3;
            ex.sets = Array.from({ length: n }, (_, i) => ({
              id: `${ex.id}_s${i + 1}`,
              order: i + 1,
              reps: ex.repsTarget || ex.reps || "8-10",
              load: ex.plannedLoad || ex.load || null,
              load_unit: ex.load_unit || "kg",
              percentage_1rm: ex.percentage_1rm || null,
              rpe: ex.rpeTarget || ex.rpe || null,
              rir: ex.rirTarget || ex.rir || 1,
              rest_seconds: ex.rest_seconds || 90,
              tempo: ex.tempo || "",
              done: false
            }));
          }

          if (type === "add_set") {
            const newOrder = ex.sets.length + 1;
            ex.sets.push({
              id: `${ex.id}_s${newOrder}`,
              order: newOrder,
              reps: changes.reps || ex.sets[ex.sets.length - 1]?.reps || "8-10",
              load: changes.load != null ? Number(changes.load) : (ex.sets[ex.sets.length - 1]?.load || null),
              load_unit: changes.load_unit || "kg",
              percentage_1rm: changes.percentage_1rm != null ? Number(changes.percentage_1rm) : null,
              rpe: changes.rpe != null ? Number(changes.rpe) : null,
              rir: changes.rir != null ? Number(changes.rir) : 1,
              rest_seconds: changes.rest_seconds || 90,
              tempo: changes.tempo || ex.tempo || "",
              done: false
            });
            appliedCount++;
            return;
          }

          if (type === "remove_set") {
            if (ex.sets.length > 1) {
              const setIdx = targetSetIndex != null ? targetSetIndex - 1 : ex.sets.length - 1;
              if (setIdx >= 0 && setIdx < ex.sets.length) {
                ex.sets.splice(setIdx, 1);
                ex.sets.forEach((s, idx) => { s.order = idx + 1; });
                appliedCount++;
              }
            }
            return;
          }

          if (type === "modify_set") {
            const setIdx = targetSetIndex != null ? targetSetIndex - 1 : 0;
            const targetSet = ex.sets[setIdx];
            if (targetSet) {
              if (changes.load !== undefined) targetSet.load = changes.load != null ? Number(changes.load) : null;
              if (changes.reps !== undefined) targetSet.reps = changes.reps;
              if (changes.rpe !== undefined) targetSet.rpe = changes.rpe != null ? Number(changes.rpe) : null;
              if (changes.rir !== undefined) targetSet.rir = changes.rir != null ? Number(changes.rir) : null;
              if (changes.rest_seconds !== undefined) targetSet.rest_seconds = changes.rest_seconds;
              if (changes.tempo !== undefined) targetSet.tempo = changes.tempo;
              if (changes.done !== undefined) targetSet.done = Boolean(changes.done);
              appliedCount++;
            }
            return;
          }

          if (type === "modify_load") {
            const targetLoad = Number(changes.load);
            if (targetSetIndex != null) {
              const set = ex.sets[targetSetIndex - 1];
              if (set) { set.load = targetLoad; appliedCount++; }
            } else {
              ex.sets.forEach(s => { s.load = targetLoad; });
              ex.plannedLoad = targetLoad;
              appliedCount++;
            }
            return;
          }

          if (type === "modify_reps") {
            if (targetSetIndex != null) {
              const set = ex.sets[targetSetIndex - 1];
              if (set) { set.reps = changes.reps; appliedCount++; }
            } else {
              ex.sets.forEach(s => { s.reps = changes.reps; });
              ex.repsTarget = changes.reps;
              appliedCount++;
            }
            return;
          }

          if (type === "modify_rpe" || type === "modify_rir") {
            const val = changes.rpe !== undefined ? Number(changes.rpe) : Number(changes.rir);
            const field = type === "modify_rpe" ? "rpe" : "rir";
            if (targetSetIndex != null) {
              const set = ex.sets[targetSetIndex - 1];
              if (set) { set[field] = val; appliedCount++; }
            } else {
              ex.sets.forEach(s => { s[field] = val; });
              if (type === "modify_rpe") ex.rpeTarget = val; else ex.rirTarget = val;
              appliedCount++;
            }
            return;
          }

          if (type === "modify_rest") {
            const restVal = changes.rest || `${changes.rest_seconds}s`;
            ex.rest = restVal;
            ex.rest_seconds = changes.rest_seconds || parseInt(restVal, 10);
            ex.sets.forEach(s => { s.rest_seconds = ex.rest_seconds; });
            appliedCount++;
            return;
          }

          if (type === "modify_tempo") {
            ex.tempo = changes.tempo;
            ex.sets.forEach(s => { s.tempo = changes.tempo; });
            appliedCount++;
            return;
          }

          if (type === "modify_exercise") {
            if (changes.name) { ex.name = changes.name; ex.exercise = changes.name; }
            if (changes.movement) ex.movement = changes.movement;
            if (changes.notes) ex.notes = changes.notes;
            if (changes.reps) ex.repsTarget = changes.reps;
            if (changes.load != null) ex.plannedLoad = Number(changes.load);
            if (changes.rest) ex.rest = changes.rest;
            appliedCount++;
            return;
          }
        });
      });
    });
  }

  return { ok: true, program: cloned, appliedCount };
}

// Extractors for documents
async function extractLegacyWordText(buffer) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "giammaria-doc-"));
  const filename = path.join(dir, "document.doc");
  try {
    await fs.writeFile(filename, buffer);
    const extractor = new WordExtractor();
    const document = await extractor.extract(filename);
    return [document.getBody(), document.getHeaders(), document.getFootnotes()].filter(Boolean).join("\n\n");
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function extractExcelText(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: true, cellFormula: true });
  if (!workbook.SheetNames || !workbook.SheetNames.length) throw new Error("Excel workbook contains no worksheets");
  return workbook.SheetNames.map((name, index) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return "";
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "", blankrows: false });
    if (!rows.length) return "";
    const rowLines = rows
      .map((row, rowIndex) => {
        const nonEmpty = row.map(v => v == null ? "" : String(v).trim()).filter(Boolean);
        if (!nonEmpty.length) return "";
        return `RIGA ${rowIndex + 1}: ${row.map(value => value == null ? "" : String(value).trim()).join(" | ")}`;
      })
      .filter(Boolean);
    if (!rowLines.length) return "";
    return [`FOGLIO ${index + 1}: ${name}`, ...rowLines].join("\n");
  }).filter(Boolean).join("\n\n");
}

async function processDocumentAnalysis({ filename, mimeType, buffer }) {
  const ext = (filename || "").toLowerCase().split(".").pop();
  let parser = "unknown";
  const promptText = `Analizza questo file di allenamento ed estrai fedelmente l'intera programmazione nel formato JSON richiesto.
REGOLE FONDAMENTALI:
1. Non inventare esercizi, serie, ripetizioni, carichi, RPE, RIR, recuperi o progressioni.
2. Usa SOLO i dati forniti. Se un valore manca usa null — NON indovinare.
3. ESTRAZIONE COMPLETA: Estrai TUTTE le settimane, TUTTE le sessioni e TUTTI gli esercizi presenti nel documento. Non troncare, non riassumere.
4. SESSIONI/ESERCIZI BONUS: Se nel documento sono presenti sessioni o esercizi contrassegnati come BONUS, richiamo o opzionali, impostali con is_bonus: true.
5. GRUPPI MUSCOLARI: Valorizza muscle_group e muscle_groups per ogni esercizio.
Preserva fedelmente ogni dato (serie, ripetizioni, carichi, recuperi, intensità).`;

  let parts = [];

  if (ext === "pdf" || mimeType === "application/pdf") {
    parser = "gemini_pdf_inline";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'application/pdf'}" byteLength=${buffer.length} parser="${parser}"`);
    parts = [
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: "application/pdf"
        }
      },
      { text: promptText }
    ];
  } else if (ext === "docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    parser = "mammoth_docx";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}" byteLength=${buffer.length} parser="${parser}"`);
    const extracted = await mammoth.extractRawText({ buffer });
    const textContent = extracted.value || "";
    parts = [{ text: `${promptText}\n\nDOCUMENT CONTENT (DOCX):\n${textContent}` }];
  } else if (ext === "doc" || mimeType === "application/msword") {
    parser = "word_extractor_doc";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'application/msword'}" byteLength=${buffer.length} parser="${parser}"`);
    const textContent = await extractLegacyWordText(buffer);
    if (!textContent.trim()) throw new Error("Legacy DOC contains no readable text");
    parts = [{ text: `${promptText}\n\nDOCUMENT CONTENT (DOC):\n${textContent}` }];
  } else if (ext === "xlsx" || ext === "xls" || mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || mimeType === "application/vnd.ms-excel") {
    parser = "xlsx_structured_di";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'application/vnd.ms-excel'}" byteLength=${buffer.length} parser="${parser}"`);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: true, cellFormula: true });
    let structured = null;
    try { structured = extractExcelStructuredForApi(workbook, XLSX); } catch (_) {}
    const textContent = extractExcelText(buffer);
    const payload = structured
      ? `STRUCTURED_EXCEL_JSON (source of truth — do not invent cells):\n${JSON.stringify(structured).slice(0, 180000)}\n\nFLAT_PREVIEW:\n${textContent.slice(0, 40000)}`
      : textContent;
    parts = [{ text: `${promptText}\n\nDOCUMENT CONTENT (EXCEL):\n${payload}` }];
  } else if (ext === "txt" || ext === "csv" || mimeType === "text/plain" || mimeType === "text/csv") {
    parser = "utf8_text";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'text/plain'}" byteLength=${buffer.length} parser="${parser}"`);
    const textContent = buffer.toString("utf-8");
    parts = [{ text: `${promptText}\n\nDOCUMENT CONTENT (TXT):\n${textContent}` }];
  } else {
    parser = "fallback_text";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'application/octet-stream'}" byteLength=${buffer.length} parser="${parser}"`);
    const textContent = buffer.toString("utf-8");
    parts = [{ text: `${promptText}\n\nDOCUMENT CONTENT:\n${textContent}` }];
  }

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: workoutSchema
    }
  });

  const replyText = (response.text || "").trim();
  if (!replyText) throw new Error("Gemini returned an empty document analysis response.");

  const structuredWorkout = JSON.parse(replyText);
  // The legacy workout schema is training-centric; retain the deterministic
  // workbook source for nutrition, supplements and therapy as well.
  if (structured) structuredWorkout.sourceWorkbook = structured;
  console.log(`[FILE_ANALYZE_END] filename="${filename}" parser="${parser}"`);
  return { structuredWorkout, parser };
}

// Routes
// Routes
function imagePartsFromRequest(images) {
  if (!Array.isArray(images)) return [];
  const parts = [];
  for (const img of images.slice(0, 4)) {
    if (!img) continue;
    const raw = typeof img.dataUrl === "string" ? img.dataUrl
      : typeof img.data === "string" ? img.data
      : typeof img.url === "string" ? img.url
      : "";
    if (!raw) continue;
    const labeled = typeof img.label === "string" && img.label.trim() ? img.label.trim() : "";
    const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2].replace(/\s/g, "")
        }
      });
      if (labeled) parts.push({ text: `Etichetta foto: ${labeled}` });
      continue;
    }
    const mime = typeof img.mime === "string" && img.mime.startsWith("image/") ? img.mime : "image/jpeg";
    if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.replace(/\s/g, "").length > 80) {
      parts.push({
        inlineData: {
          mimeType: mime,
          data: raw.replace(/\s/g, "")
        }
      });
      if (labeled) parts.push({ text: `Etichetta foto: ${labeled}` });
    }
  }
  return parts;
}

app.get("/livez", (_req, res) => res.status(200).json({ ok: true, status: "live" }));
app.get("/readyz", (_req, res) => {
  const databaseRequired = Boolean(process.env.DATABASE_URL);
  const ready = AI_STATUS.configured && (!databaseRequired || dbInitialized);
  return res.status(ready ? 200 : 503).json({ ok: ready, status: ready ? "ready" : "not_ready", databaseRequired, dbReady: dbInitialized, aiConfigured: AI_STATUS.configured });
});
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    model: MODEL,
    aiProvider: AI_STATUS.provider,
    apiKeyConfigured: AI_STATUS.configured,
    accountStorageConfigured: Boolean(process.env.DATABASE_URL),
    googleOAuthConfigured: allowedGoogleAudiences().length > 0,
    // How many X-Forwarded-For entries reached us (a count, no addresses):
    // to check that TRUST_PROXY_HOPS matches the proxies really in front.
    forwardedHops: String(req.headers["x-forwarded-for"] || "").split(",").filter((s) => s.trim()).length,
    chatVision: true,
    mealPhoto: true,
    chatStateless: true,
    coachChatVersion: "vision-stateless-v1",
    coachPracticeVersion: "coach-client-v2",
    appVersion: RELEASE_META.versionName,
    build: RELEASE_META.webBuild,
    schemaVersion: dbSchemaVersion,
    dbReady: dbInitialized,
    dbHost: dbHost || null,
    dbError: dbInitError
  });
});

app.get("/api/integrations/calendar/config", (req, res) => res.json(calendarPublicConfig(process.env)));

// Google Health event delivery is deliberately provider-neutral at the edge.
// The provider-specific subscription handshake remains an operator action.

app.get("/api/auth/public-config", (req, res) => {
  const googleClientId = publicGoogleClientId();
  res.json({
    googleClientId: googleClientId || "",
    googleEnabled: Boolean(googleClientId),
    // The Apple button shows only with all four APPLE_* variables set.
    appleEnabled: appleConfig(process.env).enabled,
    passwordResetEmail: Boolean(process.env.RESEND_API_KEY && (process.env.MAIL_FROM || process.env.RESEND_FROM))
  });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: "Database not configured." });
  }
  try {
    await initDb();
    const email = normalizeEmail(req.body?.email);
    const generic = { ok: true, message: "Se l’account esiste, usa il codice per impostare una nuova password. Valido 60 minuti." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "Inserisci un’email valida." });
    }
    const userRes = await pool.query("SELECT id, email, password_hash, provider FROM app_users WHERE email = $1", [email]);
    if (!userRes.rows.length) {
      return res.json(generic);
    }
    // One code a minute per address, and the wrong guesses are not wiped by
    // asking for a new code: they count until the codes stop coming for an
    // hour. It used to reset to 0 on every request - 8 fresh guesses each
    // time, enough to walk the whole 6-digit space.
    const recent = await pool.query("SELECT created_at FROM app_password_resets WHERE email = $1", [email]);
    if (recent.rows[0] && Date.now() - new Date(recent.rows[0].created_at).getTime() < 60 * 1000) {
      return res.json({ ...generic, message: "Ti abbiamo appena inviato un codice: controlla la posta, o riprova tra un minuto." });
    }
    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await hashPassword(code);
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO app_password_resets(email, code_hash, expires_at, attempts, created_at)
       VALUES($1, $2, $3, 0, NOW())
       ON CONFLICT (email) DO UPDATE SET code_hash = $2, expires_at = $3,
         attempts = CASE WHEN app_password_resets.expires_at > NOW() THEN app_password_resets.attempts ELSE 0 END,
         created_at = NOW()`,
      [email, codeHash, expires.toISOString()]
    );
    const mailed = await sendPasswordResetEmail(email, code);
    if (mailed.sent) {
      return res.json({ ...generic, delivery: "email", message: "Ti abbiamo inviato un codice a 6 cifre via email. Scade tra 60 minuti." });
    }
    if (isProduction(process.env)) {
      console.warn("PASSWORD_RESET_DELIVERY_UNAVAILABLE", mailed.reason || "mail_not_configured");
      return res.json({
        ...generic,
        delivery: "unavailable",
        message: "Il recupero password non è al momento disponibile. Contatta l’assistenza."
      });
    }
    return res.json({
      ...generic,
      delivery: "inline",
      code,
      message: "Codice di recupero generato (valido 60 min). Inseriscilo sotto con la nuova password."
    });
  } catch (error) {
    console.error("FORGOT_PASSWORD_ERROR", error);
    return res.status(500).json({ error: "Recupero password non riuscito." });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: "Database not configured." });
  }
  try {
    await initDb();
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || "").trim();
    const password = String(req.body?.password || "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !/^\d{6}$/.test(code) || password.length < 8) {
      return res.status(400).json({ error: "Email, codice a 6 cifre e nuova password (min. 8) sono obbligatori." });
    }
    // The attempt is counted before the (slow) check, in one statement: many
    // guesses sent at once used to all read "under 8" before any was counted.
    // At 8 the row stays, locked, until it expires: deleting it handed out a
    // fresh budget with the next code.
    const counted = await pool.query(
      `UPDATE app_password_resets SET attempts = attempts + 1
       WHERE email = $1 AND attempts < 8 AND expires_at > NOW()
       RETURNING code_hash`,
      [email]
    );
    const row = counted.rows[0];
    if (!row) {
      const left = await pool.query("SELECT attempts, expires_at FROM app_password_resets WHERE email = $1", [email]);
      const r = left.rows[0];
      if (r && new Date(r.expires_at).getTime() > Date.now() && Number(r.attempts) >= 8) {
        return res.status(429).json({ error: "Troppi tentativi. Riprova tra un'ora." });
      }
      return res.status(400).json({ error: "Codice non valido o scaduto. Richiedine uno nuovo." });
    }
    const ok = await verifyPassword(code, row.code_hash);
    if (!ok) {
      return res.status(400).json({ error: "Codice non valido." });
    }
    const passwordHash = await hashPassword(password);
    // A new password ends every session opened before it: a reset is what
    // someone does when the account may be in the wrong hands.
    const updated = await pool.query(
      `UPDATE app_users SET password_hash = $1, tokens_valid_after = $3, updated_at = NOW() WHERE email = $2
       RETURNING id, email, name, provider, avatar_url`,
      [passwordHash, email, revocationMoment()]
    );
    if (updated.rows[0]) sessionGate.forget(updated.rows[0].id);
    if (!updated.rows.length) return res.status(400).json({ error: "Account non trovato." });
    await pool.query("DELETE FROM app_password_resets WHERE email = $1", [email]);
    const user = updated.rows[0];
    return res.json({
      token: issueAccountToken(user),
      user: { id: user.id, email: user.email, name: user.name, provider: user.provider || "email", avatarUrl: user.avatar_url || null }
    });
  } catch (error) {
    console.error("RESET_PASSWORD_ERROR", error);
    return res.status(500).json({ error: "Reset password non riuscito." });
  }
});

app.post("/api/auth/register", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: "Database not configured." });
  }
  try {
    const email = normalizeEmail(req.body?.email);
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || name.length < 2 || password.length < 8) {
      return res.status(400).json({ error: "Name, valid email and password of at least 8 characters are required." });
    }
    const passwordHash = await hashPassword(password);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "INSERT INTO app_users(email, name, password_hash, provider) VALUES($1, $2, $3, 'email') RETURNING id, email, name, provider, avatar_url",
        [email, name, passwordHash]
      );
      const user = result.rows[0];
      await client.query("INSERT INTO app_account_data(user_id, data) VALUES($1, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING", [user.id]);
      await client.query("COMMIT");
      client.release();
      return res.status(201).json({
        token: issueAccountToken(user),
        user: { id: user.id, email: user.email, name: user.name, provider: user.provider || "email", avatarUrl: user.avatar_url || null }
      });
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      client.release();
      if (error?.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
      console.error("ACCOUNT_REGISTER_ERROR", error);
      return res.status(500).json({ error: "Account registration failed." });
    }
  } catch (error) {
    console.error("ACCOUNT_REGISTER_OUTER_ERROR", error);
    return res.status(500).json({ error: "Account registration failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: "Database not configured." });
  }
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const result = await pool.query(
      "SELECT id, email, name, password_hash, provider, avatar_url FROM app_users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];
    if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    return res.status(200).json({
      token: issueAccountToken(user),
      user: { id: user.id, email: user.email, name: user.name, provider: user.provider || "email", avatarUrl: user.avatar_url || null }
    });
  } catch (error) {
    console.error("ACCOUNT_LOGIN_ERROR", error);
    return res.status(500).json({ error: "Account login failed." });
  }
});

// The owner's own program backup, kept out of the web root.
//
// It used to ship with the app as web/personal-recovery-16w.json, so anyone
// with the app's URL could download the program, the name and the bodyweight
// in it - and a brand new phone, with nobody logged in, was offered it as
// "restore your training". It now lives in private/ and is served only to the
// account named by PERSONAL_BACKUP_EMAIL; with that unset, to nobody.
app.get("/api/account/personal-backup", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Unauthorized." });
  const owner = String(process.env.PERSONAL_BACKUP_EMAIL || "").trim().toLowerCase();
  const who = String(auth.email || "").trim().toLowerCase();
  if (!owner || !who || who !== owner) return res.status(404).json({ error: "Nessun backup personale per questo account." });
  try {
    const file = path.join(__dirname, "private", "personal-recovery-16w.json");
    const raw = await fs.readFile(file, "utf8");
    res.type("application/json").send(raw);
  } catch (err) {
    return res.status(404).json({ error: "Nessun backup personale disponibile." });
  }
});

app.get("/api/account/me", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Unauthorized." });
  try {
    const userRes = await pool.query(
      "SELECT id, email, name, provider, avatar_url FROM app_users WHERE id = $1",
      [auth.id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ error: "User not found." });
    const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    touchLastSeen(pool, auth.id);
    // The plan travels with the account, like the rest. A failure here never
    // blocks the account: the app keeps the last plan it knew.
    let entitlement = null;
    try { entitlement = await accountEntitlement(pool, auth); } catch (err) { console.warn("ACCOUNT_PLAN", err && err.message); }
    return res.json({
      user: { id: user.id, email: user.email, name: user.name, provider: user.provider || "email", avatarUrl: user.avatar_url || null },
      data: dataRes.rows[0]?.data || {},
      entitlement
    });
  } catch (error) {
    console.error("ACCOUNT_ME_ERROR", error);
    return res.status(500).json({ error: "Failed to fetch account profile." });
  }
});

// Read, merge and write one user's record as a single locked step. Two
// uploads from the same user arrive together all the time (a background sync
// and a SALVA tap, or two devices); read-merge-write without the lock let the
// second write drop whatever the first had just merged in.
async function mergeIntoAccountData(userId, incoming) {
  return updateAccountData(pool, userId, (current) => mergeAccountDataBlobs(current, incoming));
}

// A session token outlives an account deleted from another device (it is
// stateless, 90 days). Its writes then hit the foreign key: that is "this
// account is gone", not a server failure to log on the dashboard.
function isDeletedAccountWrite(err) {
  return Boolean(err && err.code === "23503");
}
const DELETED_ACCOUNT = { error: "Questo account è stato eliminato.", accountDeleted: true };

app.post("/api/account/sync", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Unauthorized." });
  try {
    const clientData = req.body?.data || req.body || {};
    if (clientData && clientData.activeProgram == null) delete clientData.activeProgram;
    const merged = await mergeIntoAccountData(auth.id, clientData);
    touchLastSeen(pool, auth.id);
    return res.json({ ok: true, data: merged });
  } catch (error) {
    if (isDeletedAccountWrite(error)) return res.status(401).json(DELETED_ACCOUNT);
    console.error("ACCOUNT_SYNC_ERROR", error);
    recordEvent(pool, "sync_failed", auth.id, { route: "/api/account/sync", status: 500, message: error && error.message });
    return res.status(500).json({ error: "Failed to sync account data." });
  }
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const identity = await verifyGoogleCredential(req.body?.credential);
    return await issueOAuthResponse(req, res, identity);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }
});

app.get("/api/account/data", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Sessione scaduta o non autorizzata." });
  try {
    const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    const currentData = dataRes.rows[0]?.data || {};
    return res.json({ ok: true, data: currentData });
  } catch (err) {
    return res.status(500).json({ error: "Impossibile recuperare i dati dal cloud." });
  }
});

app.post("/api/account/data", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Sessione scaduta o non autorizzata." });
  try {
    const incoming = req.body?.data || {};
    await mergeIntoAccountData(auth.id, incoming);
    return res.json({ ok: true, saved_at: new Date().toISOString() });
  } catch (err) {
    if (isDeletedAccountWrite(err)) return res.status(401).json(DELETED_ACCOUNT);
    recordEvent(pool, "sync_failed", auth.id, { route: "/api/account/data", status: 500, message: err && err.message });
    return res.status(500).json({ error: "Impossibile salvare i dati sul cloud." });
  }
});

app.get("/api/program/active", async (req, res) => {
  try {
    const auth = await accountFromBearer(req.headers.authorization);
    if (!auth) return res.json({ ok: true, program: null });
    const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    const currentData = dataRes.rows[0]?.data || {};
    return res.json({ ok: true, program: currentData.activeProgram || null });
  } catch (err) {
    return res.json({ ok: true, program: null });
  }
});

app.post("/api/program/modify", async (req, res) => {
  try {
    const { operations } = req.body || {};
    if (!Array.isArray(operations) || !operations.length) {
      return res.status(400).json({ error: "operations array is required" });
    }

    const auth = await accountFromBearer(req.headers.authorization);
    let activeProg = null;
    if (auth) {
      const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
      const currentData = dataRes.rows[0]?.data || {};
      activeProg = currentData.activeProgram;
    }

    if (!activeProg && req.body.program) {
      activeProg = req.body.program;
    }

    if (!activeProg) {
      return res.status(400).json({ error: "No active program found to modify" });
    }

    const modResult = applyOperationsToProgram(activeProg, operations);

    if (auth && modResult.ok) {
      await pool.query(
        `UPDATE app_account_data
         SET data = jsonb_set(data, '{activeProgram}', $1::jsonb),
             revision = revision + 1, updated_at = NOW()
         WHERE user_id = $2`,
        [JSON.stringify(modResult.program), auth.id]
      );
    }

    return res.json({
      ok: true,
      program: modResult.program,
      appliedCount: modResult.appliedCount
    });
  } catch (err) {
    console.error("Program modify error:", err);
    return res.status(400).json({ error: err.message });
  }
});

app.post("/api/document/detect", async (req, res) => {
  try {
    const rawBase64 = req.body?.data_base64 || req.body?.dataBase64;
    if (!rawBase64) return res.status(400).json({ error: "data_base64 required" });
    const buffer = Buffer.from(String(rawBase64).replace(/^data:[^;]+;base64,/, ""), "base64");
    if (buffer.length > (DI_MAX_BYTES || 12 * 1024 * 1024)) {
      return res.status(413).json({ error: "file too large" });
    }
    const detect = detectFormat(buffer, req.body?.filename || "", req.body?.mime_type || "");
    return res.json({ ok: true, detect });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.post(["/api/analyze-file", "/api/analyze", "/analyze"], async (req, res) => {
  let filename = "unknown";
  let mimeType = "";
  let parser = "none";
  try {
    const body = req.body || {};
    filename = body.filename || "document.bin";
    mimeType = body.mime_type || body.mimeType || "";
    const rawBase64 = body.data_base64 || body.dataBase64 || body.base64;

    if (!rawBase64 || typeof rawBase64 !== "string" || !rawBase64.trim()) {
      return res.status(400).json({ error: "Campo data_base64 mancante o non valido." });
    }

    const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, "").trim();
    const buffer = Buffer.from(cleanBase64, "base64");

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: "Buffer decodificato vuoto." });
    }

    if (buffer.length > 50 * 1024 * 1024) {
      return res.status(413).json({ error: "Il file supera la dimensione massima consentita (50 MB)." });
    }

    const { structuredWorkout, parser: usedParser } = await processDocumentAnalysis({
      filename,
      mimeType,
      buffer
    });
    parser = usedParser;

    return res.json(structuredWorkout);
  } catch (error) {
    console.error(`[FILE_ANALYZE_ERROR] filename="${filename}" parser="${parser}" error_name="${error?.name}" error_message="${error?.message}"`);
    const status = error?.statusCode || (/Payload too large/i.test(error?.message) ? 413 : 500);
    return res.status(status).json({
      error: "Document analysis failed.",
      details: error.message
    });
  }
});

app.post("/api/ingest/document", upload.single("file"), async (req, res) => {
  let filename = "unknown";
  let mimeType = "";
  let parser = "none";
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    filename = req.file.originalname || "document.bin";
    mimeType = req.file.mimetype || "";
    const buffer = req.file.buffer;

    const { structuredWorkout, parser: usedParser } = await processDocumentAnalysis({
      filename,
      mimeType,
      buffer
    });
    parser = usedParser;

    return res.json(structuredWorkout);
  } catch (error) {
    console.error(`[FILE_ANALYZE_ERROR] filename="${filename}" parser="${parser}" error_name="${error?.name}" error_message="${error?.message}"`);
    // For the dashboard: the format and the message, never the file name or content.
    accountFromBearer(req.headers.authorization).then((auth) =>
      recordEvent(pool, "import_failed", auth && auth.id, { route: "/api/ingest/document", status: 500, format: fileFormat(filename, mimeType), message: error?.message })
    ).catch(() => {});
    return res.status(500).json({
      error: "Document ingestion failed.",
      details: error.message
    });
  }
});

function slimCoachContext(context) {
  if (!context || typeof context !== "object") return {};
  const out = { ...context };
  if (out.programSummary && typeof out.programSummary === "object") {
    const weeks = Array.isArray(out.programSummary.weeks) ? out.programSummary.weeks.slice(0, 4) : [];
    out.programSummary = {
      title: out.programSummary.title || "",
      weeks: weeks.map((w) => ({
        week: w.week,
        sessions: (w.sessions || []).slice(0, 6).map((s) => ({
          name: s.name,
          exercises: (s.exercises || []).slice(0, 14)
        }))
      }))
    };
  }
  if (out.performanceSummary && typeof out.performanceSummary === "object") {
    const ex = out.performanceSummary.exercises || out.performanceSummary.rows || [];
    out.performanceSummary = {
      week: out.performanceSummary.week,
      sessions: out.performanceSummary.sessions,
      exercises: Array.isArray(ex) ? ex.slice(0, 8) : ex
    };
  }
  if (out.therapy && out.therapy.medications) {
    out.therapy = {
      medications: out.therapy.medications.slice(0, 8).map((m) => ({
        name: m.name || m.medication || m.drug,
        dose: m.dose || m.dosage || ""
      }))
    };
  }
  if (out.exams) {
    const items = Array.isArray(out.exams) ? out.exams : (out.exams.items || out.exams.records || []);
    out.exams = { count: items.length };
  }
  if (out.profile && typeof out.profile === "object") {
    out.profile = {
      name: out.profile.name || out.profile.first_name || "",
      goal: out.profile.goal || out.profile.primary_goal || null,
      weight: Number(out.profile.weight) > 0 ? Number(out.profile.weight) : null
    };
  }
  if (out.supplementationDetail && out.supplementationDetail.items) {
    out.supplementationDetail = {
      items: out.supplementationDetail.items.slice(0, 12).map((it) => ({
        name: it.name,
        dose: it.dose,
        timing: it.timing
      }))
    };
  }
  return out;
}

app.post(["/api/chat", "/coach", "/api/coach"], async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: "Coach AI non è configurato sul server.",
        code: "AI_UNAVAILABLE"
      });
    }

    const message = typeof req.body?.message === "string"
      ? req.body.message.trim()
      : "";

    if (!message) {
      return res.status(400).json({ error: "message is required." });
    }

    let context = slimCoachContext(req.body?.context ?? {});
    const imageParts = imagePartsFromRequest(req.body?.images);

    const authUser = await accountFromBearer(req.headers.authorization);
    if (authUser && !context.programSummary && !context.sessionReview) {
      try {
        const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [authUser.id]);
        const dbData = dataRes.rows[0]?.data || {};
        const prog = dbData.activeProgram;
        if (prog && Array.isArray(prog.weeks) && prog.weeks.length) {
          const w = Math.max(1, Math.min(prog.weeks.length, Number(context.currentWeek) || 1));
          const week = prog.weeks[w - 1] || {};
          const sessions = week.sessions || week.days || [];
          const dIdx = Math.max(0, Number(context.currentDay) || 0);
          const sess = sessions[dIdx] || sessions[0] || {};
          context.program = {
            title: prog.title || "",
            week: w,
            sessionName: sess.name || sess.title || sess.day || "",
            exercises: (sess.exercises || sess.rows || []).slice(0, 24).map((e) => e && (e.name || e.exercise || e.name_original)).filter(Boolean)
          };
        }
      } catch (_) {}
    }

    const currentW = Number(context.currentWeek) || 1;
    const currentD = Number(context.currentDay) >= 0 ? Number(context.currentDay) + 1 : 1;
    const athleteLocked = !!(authUser && (authUser.role === "athlete" || authUser.provider === "coach_client"));

    const athleteSystem = `
Sei Coach AI di Nurvan. Rispondi sempre in italiano, in modo chiaro e evidence-based.
L'utente è un ATLETA seguito da un coach umano. NON puoi modificare il programma, i carichi, le serie o la nutrizione.
NON includere JSON con action "modify_program". NON proporre operazioni di modifica.
Puoi solo spiegare esercizi, tecnica, cibo, integrazione e terapia in modo informativo.
Se chiede di cambiare la scheda, digli di scrivere al suo coach dalla chat Coach.
Non tenere memoria di conversazioni precedenti.
${context && context.checkFisico ? `Analizza le foto del check fisico (struttura e definizione). Niente diagnosi mediche.` : ""}
`;

    const system = athleteLocked ? athleteSystem : `
Sei Coach AI, l'assistente scientifico di allenamento di élite all'interno dell'app Nurvan.
Rispondi sempre in italiano in modo chiaro, autorevole, motivante e rigorosamente evidence-based.
Non tenere memoria di conversazioni precedenti: ogni domanda è autonoma. Ignora qualsiasi cronologia chat.

${context && context.checkFisico ? `ISTRUZIONE CHECK FISICO (non è un check-in settimanale):
Analizza le foto corporee allegate. Commenta struttura muscolare (simmetrie, distretti, proporzioni) e definizione.
Niente diagnosi mediche. Non modificare il programma se non richiesto esplicitamente.
${context.photosOnly ? "Analizza SOLO le foto, senza contestualizzare allenamento/integrazione/terapia." : "Se nel contesto ci sono allenamento, integrazione o terapia, usali per contestualizzare il commento."}
` : ""}

ACCESSO AL PROGRAMMA ATTIVO:
Hai PIENO ACCESSO di lettura e modifica al programma attivo dell'atleta attraverso le API e i tool del sistema.
NON DIRE MAI: "Non ho accesso al database" o "Non posso modificare il file interno". Tu puoi analizzare la programmazione attiva e proporre modifiche strutturate istantanee!

STATO ATTUALE SELEZIONATO DALL'ATLETA:
- Settimana attualmente visualizzata: Settimana ${currentW} (context.currentWeek)
- Sessione / Giorno attualmente visualizzato: Giorno ${currentD} (context.currentDay)

REGOLE RIGIDE DI HARDENING E PRECISIONE SEMANTICA:

1. AMBITO TEMPORALE (SCOPE):
- Se l'atleta chiede una modifica come "porta la terza serie a 105 kg" o "aggiungi una serie alla panca del giorno 1":
  * NON assumere automaticamente week: "all"!
  * Usa SEMPRE la settimana attualmente selezionata: "week": ${currentW} (oppure la settimana esplicitamente menzionata dall'utente).
  * Solo ed esclusivamente se l'atleta usa formule esplicite come "in tutte le settimane", "tutte le settimane" o "in tutto il programma", devi impostare "week": "all".

2. SOSTITUZIONE ESERCIZI:
- Se l'utente dice "sostituisci X con Y":
  * Controlla accuratamente se X è presente nella sessione/settimana target del context.program.
  * SE X ESISTE: genera l'operazione {"type": "replace_exercise", "week": ..., "session": ..., "exercise": "X", "target_exercise": "Y"}.
  * SE X NON ESISTE: NON generare silenziosamente una add_exercise o una sostituzione fittizia!
    Invece scrivi chiaramente nella risposta:
    "X non è presente nella sessione selezionata. Vuoi aggiungere Y?"
    e nella proposta JSON includi l'operazione con summary che chiarisce la richiesta di conferma ("Proposta di aggiunta di Y in quanto X non presente").

3. CALCOLI E MODIFICHE DI VOLUME:
- Se l'utente chiede variazioni percentuali di volume (es. "riduci il volume del petto del 15%"):
  * Conta e analizza il volume del gruppo muscolare prima della modifica (es. serie totali nella settimana).
  * Calcola il target volume teorico (es. serie prima * 0.85).
  * Calcola il volume dopo in base alle serie discrete rimosse.
  * Calcola la variazione percentuale effettiva.
  * Riporta SEMPRE esplicitamente nella risposta testuale il riepilogo nel seguente formato:
    Volume [gruppo muscolare]:
    - prima = [N] serie
    - target = [N_target] serie (-15%)
    - dopo = [N_dopo] serie
    - variazione = -[X]% circa
  * Se non è possibile ottenere esattamente il -15% a causa dei limiti discreti delle serie, indicalo chiaramente (es. "Non è possibile ottenere esattamente -15% perché le serie sono discrete. Propongo una riduzione di 1 serie su 4 (-25%) o su 6 (-16,7%).").

4. AGGIUNTA SERIE:
- Se l'utente dice "aggiungi una serie alla panca del giorno 1":
  * Modifica SOLO l'esercizio target.
  * Mantieni il contesto della settimana/sessione corrente ("week": ${currentW}, "session": 1).
  * Non toccare tutte le settimane salvo richiesta esplicita.

5. SUPERSET:
- Se l'atleta chiede di creare un superset (es. "Crea un superset tra Hack Squat e Leg Extension") e uno degli esercizi non è presente nella sessione:
  * Dichiara esplicitamente: "[Nome Esercizio] non esiste in questa sessione. Posso aggiungerla e creare il superset."
  * Quindi genera le operazioni atomiche di add_exercise + create_superset.

6. CONFERMA E AMBIGUITÀ:
- Se una richiesta è ambiguamente interpretabile, NON applicare modifiche arbitrarie. Chiedi conferma chiarificatrice all'atleta.

QUANDO L'UTENTE RICHIEDE MODIFICHE:
Includi sempre nella risposta un blocco JSON con action "modify_program":

\`\`\`json
{
  "action": "modify_program",
  "summary": "Descrizione sintetica delle modifiche proposte",
  "operations": [
    {
      "type": "add_set" | "remove_set" | "modify_set" | "modify_load" | "modify_reps" | "modify_rpe" | "modify_rir" | "modify_rest" | "modify_tempo" | "replace_exercise" | "add_exercise" | "remove_exercise" | "create_superset" | "remove_superset" | "modify_session" | "add_session" | "remove_session" | "modify_week" | "add_week" | "remove_week",
      "week": ${currentW}, // numero 1-based (o "all" SOLO se esplicitamente richiesto "in tutte le settimane")
      "session": 1, // numero 1-based o nome sessione
      "exercise": "Panca piana bilanciere",
      "target_exercise": "Hack Squat",
      "set_index": 3,
      "changes": {
        "sets": 4,
        "load": 105,
        "reps": "6-8",
        "rpe": 8,
        "rir": 2,
        "rest": "120s",
        "tempo": "3-0-1",
        "notes": "...",
        "movement": "Quad squat",
        "superset_id": "ss_1"
      }
    }
  ]
}
\`\`\`

Accompagna SEMPRE il blocco JSON con una spiegazione chiara e motivata dal punto di vista tecnico.
Se l'atleta lamenta dolore acuto o infortunio, consiglia di consultare un medico specialista.
`;

    const input = `${system}\n\nCONTESTO PROGRAMMA:\n${JSON.stringify(context)}\n\nCRONOLOGIA:\n(vuota — ogni domanda è autonoma)\n\nUSER: ${message}`;

    const ai = getClient();
    const textPart = { text: input };
    // First attempt keeps any images; retries drop them (in case the image
    // payload itself is what's tripping the model) and back off between
    // attempts so a transient 429/503 from Gemini gets a real gap before
    // hammering it again.
    const partsAttempts = imageParts.length ? [[textPart, ...imageParts], [textPart]] : [[textPart]];
    const response = await generateContentWithRetry(ai, { model: MODEL, partsAttempts, label: "Gemini chat" });

    let replyText = response.text || "";
    let proposedAction = null;
    const jsonMatch = replyText.match(/```(?:json)?\s*({[\s\S]*?"action"\s*:\s*"modify_program"[\s\S]*?\})\s*```/i);
    if (jsonMatch) {
      try {
        proposedAction = JSON.parse(jsonMatch[1]);
      } catch (_) {}
    }
    if (athleteLocked) {
      proposedAction = null;
      replyText = replyText.replace(/```(?:json)?\s*\{[\s\S]*?"action"\s*:\s*"modify_program"[\s\S]*?\}\s*```/gi, "").trim();
    }

    return res.json({
      reply: replyText,
      proposed_action: proposedAction,
      model: MODEL
    });
  } catch (error) {
    console.error("Chat error:", {
      name: error?.name,
      message: error?.message,
      status: error?.status || error?.statusCode || error?.response?.status,
      response: error?.response,
      details: error?.details,
      stack: error?.stack
    });
    const aiCode = classifyGeminiError(error);
    if (aiCode) {
      const friendlyMessage = aiCode === "AI_QUOTA_EXCEEDED"
        ? "Hai esaurito la quota Coach AI del tuo piano. Riprova nel prossimo periodo o passa a un piano superiore."
        : aiCode === "AI_RATE_LIMITED"
        ? "Troppe richieste al Coach AI. Attendi qualche secondo e riprova."
        : "Coach AI temporaneamente non disponibile. Allenamento e dati locali restano utilizzabili.";
      const retryAfter = aiCode === "AI_PROVIDER_UNAVAILABLE" ? 5 : 10;
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(aiCode === "AI_PROVIDER_UNAVAILABLE" ? 503 : 429).json({
        error: friendlyMessage,
        code: aiCode,
        retryAfter
      });
    }
    return res.status(error?.statusCode || 500).json({
      error: "Coach interaction failed.",
      details: error?.message
    });
  }
});

mountCoachPractice(app, {
  pool,
  initDb,
  hashPassword,
  verifyPassword,
  issueAccountToken,
  accountFromBearer,
  webDir: path.join(__dirname, "web"),
  mediaSigningSecret: process.env.MEDIA_SIGNING_SECRET || JWT_SECRET
});

mountPlanRoutes(app, { pool, initDb, accountFromBearer });
const appleAuth = mountAppleAuth(app, { pool, initDb, secret: JWT_SECRET, accountFromBearer, issueAccountToken });
appleCallbackTarget.handle = appleAuth.callbackHandler;
mountAccountDeletion(app, { pool, initDb, accountFromBearer, onDeleted: (gone) => appleAuth.revokeIdentities(gone.identities) });

mountAdminDashboard(app, { pool, initDb, sendEmail, secret: JWT_SECRET });

mountProgramGenerateRoutes(app, {
  requireAuth: async (req) => accountFromBearer(req.headers.authorization)
});

mountMediaRoutes(app, { pool });

async function generateMealPhotoVision({ prompt, image, images, schema }) {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error("vision_not_configured");
    err.statusCode = 503;
    throw err;
  }
  const ai = getClient();
  const parts = [];
  if (Array.isArray(images) && images.length > 0) {
    images.forEach((img, idx) => {
      const role = img.role === 'SIDE' ? "FOTOGRAFIA LATERALE (SIDE VIEW - ALTEZZA / SPESSORE / SEZIONE)" : "FOTOGRAFIA DALL'ALTO (TOP VIEW - AREA / SUPERFICIE / DISTRIBUZIONE)";
      parts.push({ text: `[IMMAGINE ${idx + 1}: ${role}]` });
      parts.push({ inlineData: { mimeType: img.mimeType || 'image/jpeg', data: img.data } });
    });
  } else if (image && image.data) {
    parts.push({ inlineData: { mimeType: image.mimeType || 'image/jpeg', data: image.data } });
  }
  parts.push({ text: prompt });
  const response = await generateContentWithRetry(ai, {
    model: MEAL_VISION_MODEL,
    partsAttempts: [parts],
    label: "Gemini meal photo vision",
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      maxOutputTokens: 3072
    }
  });
  return { text: response.text || "" };
}

async function lookupBarcodeWithAI(code) {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error("vision_not_configured");
    err.statusCode = 503;
    throw err;
  }
  const ai = getClient();
  const prompt = `Cerca sul web informazioni sul prodotto alimentare con codice a barre (EAN/UPC) "${code}".
Trova: nome del prodotto, marchio, valori nutrizionali per 100g/100ml (kcal, proteine, carboidrati, grassi),
e l'unità con cui si misura la porzione di questo prodotto: "ml" se è un liquido/bevanda (es. bibite, latte, olio, succhi),
"g" se è solido o in polvere (es. snack, cereali, formaggi). Non inventare valori: se non trovi informazioni
affidabili per questo identificativo esatto, rispondi found:false.

Rispondi ESCLUSIVAMENTE con un blocco JSON tra \`\`\`json e \`\`\`, in questo formato esatto:
\`\`\`json
{"found":true,"name":"Nome prodotto","brand":"Marchio","unit":"g","per100g":{"kcal":0,"proteins":0,"carbohydrates":0,"fat":0}}
\`\`\`
oppure, se non trovato:
\`\`\`json
{"found":false}
\`\`\``;
  const response = await generateContentWithRetry(ai, {
    model: MODEL,
    partsAttempts: [[{ text: prompt }]],
    label: "Gemini barcode AI lookup",
    config: { tools: [{ googleSearch: {} }] }
  });
  const text = response.text || "";
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (!jsonMatch) return { found: false };
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return parsed && parsed.found ? parsed : { found: false };
  } catch (_) {
    return { found: false };
  }
}

const FOOD_NAME_TRANSLATION_SCHEMA = {
  type: "object",
  properties: {
    translations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "number" },
          localized_name: { type: "string" }
        },
        required: ["index", "localized_name"]
      }
    }
  },
  required: ["translations"]
};

// Many search results (Open Food Facts especially) carry whatever language
// their original contributor happened to use, unrelated to the user's own -
// a literal machine translation of a product name often reads unnaturally
// (or is just wrong for a dish that has its own name in the target market),
// so this explicitly asks for the name people in that market would actually
// use, not a word-for-word translation. Results are cached by the caller
// (food_name_translations) so this only ever runs once per distinct
// name+brand+language, not on every search.
async function translateFoodNamesWithAI(items, langLabel) {
  if (!process.env.GEMINI_API_KEY || !Array.isArray(items) || !items.length) return [];
  const ai = getClient();
  const listing = items.map((it, i) => `${i}. "${it.name}"${it.brand ? ' (marchio: ' + it.brand + ')' : ''}`).join('\n');
  const prompt = `Sei un esperto di alimentazione per il mercato: ${langLabel}.
Per ciascuno dei seguenti alimenti (nome originale, marchio se presente), fornisci il nome con cui questo
specifico alimento/prodotto è realmente conosciuto o venduto in quel mercato - NON una traduzione letterale
parola per parola, ma il nome che userebbe davvero una persona del posto (es. un piatto ha il proprio nome
nella cucina locale, non la traduzione dei suoi ingredienti). Se il nome è già naturale in quella lingua, o è
un marchio/nome proprio che non si traduce, restituiscilo invariato. Non inventare un prodotto diverso.

${listing}`;
  const response = await generateContentWithRetry(ai, {
    model: MODEL,
    partsAttempts: [[{ text: prompt }]],
    label: "Gemini food name localization",
    config: {
      responseMimeType: "application/json",
      responseSchema: FOOD_NAME_TRANSLATION_SCHEMA,
      maxOutputTokens: 2048
    }
  });
  try {
    const parsed = JSON.parse(response.text || "{}");
    return Array.isArray(parsed.translations) ? parsed.translations : [];
  } catch (_) {
    return [];
  }
}

mountFoodRoutes(app, {
  generateVision: generateMealPhotoVision,
  pool,
  lookupBarcodeWithAI,
  translateFoodNames: translateFoodNamesWithAI,
  aiLookupRateLimiter: barcodeAiRateLimiter
});

app.use(function (req, res, next) {
  const p = String(req.path || "");
  if (p === "/" || p === "/index.html" || p.endsWith(".html") || p === "/sw.js") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
  }
  next();
});
app.use(express.static(path.join(__dirname, "web")));

// No global error handler existed before this, so any error passed to
// next(err) anywhere upstream (the CORS validator included) fell through to
// Express's own default handler: a bare 500 regardless of err.statusCode,
// as an HTML page, plus the full stack trace dumped to the logs on every
// single occurrence - e.g. a CORS rejection logged the same giant trace
// every time instead of the one-line warning that's actually useful.
app.use(function (err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err && err.statusCode ? err.statusCode : 500;
  if (status === 403 && err && err.corsOrigin !== undefined) {
    // Already logged with full context by buildCorsOriginValidator - avoid
    // logging the same rejection twice.
  } else {
    console.error("[UNHANDLED_ERROR]", req.method, req.path, err && err.message);
  }
  res.status(status).json({ ok: false, error: (err && err.message) || "Internal server error" });
});

const server = app.listen(port, () => {
  console.log(`Coach API server listening at http://localhost:${port}`);
});
let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received: draining HTTP connections.`);
  server.close(async () => {
    await poolHolder.current.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS || 25_000)).unref();
}
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.once("SIGINT", () => gracefulShutdown("SIGINT"));
