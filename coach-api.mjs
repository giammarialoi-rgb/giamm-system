import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import * as XLSX from "xlsx";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import multer from "multer";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = Number(process.env.PORT || 10000);
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "giammaria-dev-secret-change-in-prod";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || process.env.APPLE_CLIENT_ID || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

const pool = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
}) : null;

const accountSchemaReady = (async () => {
  if (!pool) return null;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT,
        provider TEXT DEFAULT 'email',
        provider_id TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS app_account_data (
        user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_app_users_provider ON app_users(provider, provider_id);
    `);
    return true;
  } finally {
    client.release();
  }
})().catch((error) => {
  console.error("ACCOUNT_SCHEMA_INIT_ERROR", {
    name: error?.name,
    message: error?.message,
    stack: error?.stack
  });
  return false;
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.length) return callback(null, true);
    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed === origin) return true;
      if (allowed.startsWith("*.")) {
        const domain = allowed.slice(2);
        return origin.endsWith(domain) || origin.endsWith("." + domain);
      }
      return false;
    });
    if (isAllowed) return callback(null, true);
    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

function nullable(type) {
  return {
    type: [type, "null"]
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function issueAccountToken(user) {
  return jwt.sign({
    sub: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider || "email"
  }, JWT_SECRET, { expiresIn: "30d" });
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

async function accountFromBearer(authHeader) {
  const token = String(authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.sub) return null;
    const result = await pool.query(
      "SELECT id, email, name, provider, avatar_url FROM app_users WHERE id = $1",
      [payload.sub]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

function accountUnavailable(res) {
  if (!pool) {
    res.status(503).json({ error: "Account storage is not configured on the server." });
    return true;
  }
  return false;
}

async function resolveOAuthUser({ email, name, provider, providerId, avatarUrl, linkingUser }) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw Object.assign(new Error("OAuth identity did not contain a valid email address."), { statusCode: 400 });
  }

  if (linkingUser?.id) {
    const updated = await pool.query(
      `UPDATE app_users
       SET provider = $1, provider_id = $2, avatar_url = COALESCE($3, avatar_url), updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, name, provider, avatar_url`,
      [provider, providerId, avatarUrl || null, linkingUser.id]
    );
    return updated.rows[0];
  }

  const existingByProvider = await pool.query(
    "SELECT id, email, name, provider, avatar_url FROM app_users WHERE provider = $1 AND provider_id = $2",
    [provider, providerId]
  );
  if (existingByProvider.rows.length) return existingByProvider.rows[0];

  const existingByEmail = await pool.query(
    "SELECT id, email, name, provider, avatar_url FROM app_users WHERE email = $1",
    [normalized]
  );
  if (existingByEmail.rows.length) {
    const updated = await pool.query(
      `UPDATE app_users
       SET provider = $1, provider_id = $2, avatar_url = COALESCE($3, avatar_url), updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, name, provider, avatar_url`,
      [provider, providerId, avatarUrl || null, existingByEmail.rows[0].id]
    );
    return updated.rows[0];
  }

  const id = crypto.randomUUID();
  const created = await pool.query(
    `INSERT INTO app_users(id, email, name, provider, provider_id, avatar_url)
     VALUES($1, $2, $3, $4, $5, $6)
     RETURNING id, email, name, provider, avatar_url`,
    [id, normalized, name || normalized.split("@")[0], provider, providerId, avatarUrl || null]
  );
  await pool.query("INSERT INTO app_account_data(user_id, data) VALUES($1, '{}'::jsonb)", [id]);
  return created.rows[0];
}

async function verifyGoogleCredential(idToken) {
  if (!idToken) throw Object.assign(new Error("Missing Google ID token."), { statusCode: 400 });
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw Object.assign(new Error("Failed to verify Google ID token with Google servers."), { statusCode: 401 });
  }
  const payload = await response.json();
  if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
    throw Object.assign(new Error("Google token client ID does not match the configured web client ID."), { statusCode: 401 });
  }
  return {
    email: payload.email,
    name: payload.name || payload.email,
    provider: "google",
    providerId: payload.sub,
    avatarUrl: payload.picture || null
  };
}

async function verifyAppleCredential(idToken, userPayload) {
  if (!idToken) throw Object.assign(new Error("Missing Apple identity token."), { statusCode: 400 });
  const decoded = jwt.decode(idToken);
  if (!decoded || !decoded.sub || !decoded.email) {
    throw Object.assign(new Error("Malformed Apple identity token."), { statusCode: 400 });
  }
  if (decoded.iss !== "https://appleid.apple.com") {
    throw Object.assign(new Error("Invalid Apple token issuer."), { statusCode: 401 });
  }
  if (APPLE_BUNDLE_ID && decoded.aud !== APPLE_BUNDLE_ID) {
    throw Object.assign(new Error("Apple token audience does not match the configured bundle ID."), { statusCode: 401 });
  }
  let name = "";
  if (userPayload?.name) {
    name = [userPayload.name.firstName, userPayload.name.lastName].filter(Boolean).join(" ");
  }
  return {
    email: decoded.email,
    name: name || decoded.email,
    provider: "apple",
    providerId: decoded.sub,
    avatarUrl: null
  };
}

async function issueOAuthResponse(req, res, identity) {
  const user = await resolveOAuthUser({ ...identity, linkingUser: await accountFromBearer(req.headers.authorization) });
  return res.json({ token: issueAccountToken(user), user: { id: user.id, email: user.email, name: user.name, provider: user.provider, avatarUrl: user.avatar_url || null } });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

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
              required: ["day", "title", "exercises"]
            }
          }
        },
        required: ["week", "label", "sessions"]
      }
    }
  },
  required: [
    "title",
    "source_summary",
    "assumptions",
    "global_rules",
    "warnings",
    "weeks"
  ]
};

const workoutInstruction = `
Sei il motore di importazione e analisi di una app professionale per programmazione dell'allenamento di bodybuilding e powerbuilding (Giammaria System).

Il tuo compito è leggere una scheda, un PDF, un documento Word o testo contenente un allenamento o indicazioni per costruirlo e trasformarlo in una struttura JSON canonica e precisa.

REGOLE FONDAMENTALI:
1. Non inventare esercizi, serie, ripetizioni, carichi, RPE, RIR, recuperi o progressioni che non siano supportati dal documento.
2. Conserva fedelmente l'intento e la periodizzazione del programma originale.
3. Se un dato manca, usa null.
4. Se un'informazione è ambigua, inseriscila in warnings o assumptions invece di indovinare.
5. Interpreta abbreviazioni comuni solo quando il significato è chiaro dal contesto.
6. Mantieni l'ordine esatto degli esercizi.
7. Se il documento contiene settimane, giorni o sessioni, mantieni la gerarchia completa: Programma -> Settimane -> Sessioni -> Esercizi -> Serie.
8. Le regole di progressione devono essere riportate come progression_rule, senza trasformarle arbitrariamente in numeri.
9. I recuperi vanno convertiti in secondi quando possibile.
10. Rispondi esclusivamente con JSON conforme allo schema.
11. ESTRAZIONE COMPLETA ED ESAUSTIVA (FONDAMENTALE):
    Se una sessione contiene 9 esercizi (o qualsiasi numero di esercizi nel documento sorgente), DEVI estrarre TUTTI i 9 esercizi nell'array \`exercises\`. Non troncare, non campionare, non riassumere e non omettere nessun esercizio (inclusi complementari, isolamento, braccia, addominali, riscaldamento). Ogni riga di esercizio nel documento deve generare un elemento distinto in \`exercises\`.
12. GESTIONE GIORNI ED ESERCIZI BONUS:
    Se nel documento sono presenti giorni o esercizi contrassegnati come "BONUS", "RICHIAMO", "OPZIONALE" o "EXTRA", mantienili come entità distinte con is_bonus: true. Non rimuoverli o fonderli con altri giorni.
13. GRUPPI MUSCOLARI:
    Valorizza \`muscle_group\` e \`muscle_groups\` per ogni esercizio (es. Petto, Schiena/Dorso, Spalle, Bicipiti, Tricipiti, Quadricipiti, Femorali, Glutei, Polpacci, Addome).
14. SERIE INDIVIDUALI:
    Se disponibili serie multiple con carichi/reps/rpe diversi, popola \`sets_data\` con ogni singola serie.
`;

function extractTextFromOutput(interaction) {
  return typeof interaction?.output_text === "string"
    ? interaction.output_text
    : "";
}

function parseDocStructureIntermediate(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    return { sessions: [], sourceSessionCount: 0, sourceExerciseCount: 0 };
  }
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  const sessions = [];
  let currentSession = null;
  let totalExercises = 0;

  const sessionHeaderRegex = /^(?:SESSIONE|GIORNO|DAY|ALLENAMENTO|FOGLIO|WORKOUT)\s*([0-9A-Za-z\s\-\.\–\—\:]+)/i;
  const bonusRegex = /(?:bonus|richiamo|extra|opzional)/i;

  for (const line of lines) {
    if (sessionHeaderRegex.test(line) || /^(?:UPPER|LOWER|FULL\s*BODY|PUSH|PULL|LEGS)/i.test(line)) {
      const isBonus = bonusRegex.test(line);
      currentSession = {
        title: line,
        is_bonus: isBonus,
        exercises: []
      };
      sessions.push(currentSession);
      continue;
    }

    if (!currentSession) {
      currentSession = {
        title: "SESSIONE 1",
        is_bonus: false,
        exercises: []
      };
      sessions.push(currentSession);
    }

    if (/(?:x|\d+\s*(?:serie|sets|reps|rip|kg|rpe|rir))/i.test(line) ||
        /^(?:[0-9]+[\.\)\-]?|\*|\-|\•)\s+[A-Za-z]/i.test(line) ||
        /riga\s+\d+:/i.test(line)) {
      currentSession.exercises.push(line);
      totalExercises++;
    }
  }

  const finalSessions = sessions.filter(s => s.exercises.length > 0);
  const sessionCount = Math.max(1, finalSessions.length);
  const exerciseCount = Math.max(sessionCount, totalExercises);

  console.info(`DOC_STRUCT_SOURCE_SESSIONS=${sessionCount}`);
  console.info(`DOC_STRUCT_SOURCE_EXERCISES=${exerciseCount}`);

  return {
    sessions: finalSessions,
    sourceSessionCount: sessionCount,
    sourceExerciseCount: exerciseCount
  };
}

async function runStructuredInteraction(input, system_instruction) {
  const interaction = await ai.interactions.create({
    model: MODEL,
    input,
    ...(system_instruction ? { system_instruction } : {}),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: workoutSchema
    }
  });

  const text = extractTextFromOutput(interaction);
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }

  let totalGeminiSessions = 0;
  let totalGeminiExercises = 0;
  if (Array.isArray(parsed?.weeks)) {
    parsed.weeks.forEach(w => {
      if (Array.isArray(w?.sessions)) {
        totalGeminiSessions += w.sessions.length;
        w.sessions.forEach(s => {
          const count = Array.isArray(s?.exercises) ? s.exercises.length : 0;
          totalGeminiExercises += count;
          console.info(`DOC_SESSION: week=${w.week} session=${s.title || s.day} is_bonus=${Boolean(s.is_bonus)} exerciseCount=${count}`);
        });
      }
    });
  }
  console.info(`DOC_GEMINI_SESSIONS=${totalGeminiSessions}`);
  console.info(`DOC_GEMINI_EXERCISES=${totalGeminiExercises}`);

  return parsed;
}

function extractExcelText(buffer) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: true, cellFormula: true });
  } catch (error) {
    const invalid = new Error(`Unable to read Excel file: ${error?.message || "invalid workbook"}`);
    invalid.statusCode = 400;
    throw invalid;
  }

  if (!workbook.SheetNames.length) {
    const invalid = new Error("Excel workbook contains no worksheets.");
    invalid.statusCode = 400;
    throw invalid;
  }

  return workbook.SheetNames.map((sheetName, sheetIndex) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: true
    });
    const lines = rows.map((row, rowIndex) => {
      const values = Array.isArray(row) ? row.map((value) => value == null ? "" : String(value)) : [];
      return `RIGA ${rowIndex + 1}: ${values.join(" | ")}`;
    });
    return [`FOGLIO ${sheetIndex + 1}: ${sheetName}`, ...lines].join("\n");
  }).join(`\n\n`);
}

async function extractLegacyWordText(buffer) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "giammaria-doc-"));
  const filename = path.join(dir, "document.doc");
  try {
    await fs.writeFile(filename, buffer);
    const document = await new WordExtractor().extract(filename);
    return [document.getBody(), document.getHeaders(), document.getFootnotes()].filter(Boolean).join("\n\n");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function selectFileParser(filename, mime) {
  if (mime === "application/pdf" || filename.endsWith(".pdf")) return "gemini-document-base64";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || filename.endsWith(".docx")) return "mammoth-buffer";
  if (mime === "application/msword" || filename.endsWith(".doc")) return "word-extractor-buffer-via-tempfile";
  if (mime.startsWith("text/") || filename.endsWith(".txt")) return "utf8-buffer";
  if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || mime === "application/vnd.ms-excel" || filename.endsWith(".xlsx") || filename.endsWith(".xls")) return "xlsx-buffer";
  return "unsupported";
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "coach-api-gemini",
    model: MODEL,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    accountStorageConfigured: Boolean(pool && JWT_SECRET)
  });
});

app.post("/api/auth/register", async (req, res) => {
  if (accountUnavailable(res)) return;
  try {
    await accountSchemaReady;
    const email = normalizeEmail(req.body?.email);
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || name.length < 2 || password.length < 8) {
      return res.status(400).json({ error: "Name, valid email and password of at least 8 characters are required." });
    }
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      "INSERT INTO app_users(id,email,name,password_hash) VALUES($1,$2,$3) RETURNING id,email,name",
      [crypto.randomUUID(), email, name, passwordHash]
    );
    const user = result.rows[0];
    await pool.query("INSERT INTO app_account_data(user_id,data) VALUES($1,'{}'::jsonb)", [user.id]);
    return res.status(201).json({ token: issueAccountToken(user), user });
  } catch (error) {
    if (error?.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
    console.error("ACCOUNT_REGISTER_ERROR", { name: error?.name, message: error?.message, stack: error?.stack });
    return res.status(500).json({ error: "Account registration failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  if (accountUnavailable(res)) return;
  try {
    await accountSchemaReady;
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const result = await pool.query(
      "SELECT id, email, name, password_hash, provider, avatar_url FROM app_users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    return res.json({
      token: issueAccountToken(user),
      user: { id: user.id, email: user.email, name: user.name, provider: user.provider, avatarUrl: user.avatar_url || null }
    });
  } catch (error) {
    console.error("ACCOUNT_LOGIN_ERROR", { name: error?.name, message: error?.message, stack: error?.stack });
    return res.status(500).json({ error: "Account login failed." });
  }
});

app.post("/api/auth/google", async (req, res) => {
  if (accountUnavailable(res)) return;
  try {
    await accountSchemaReady;
    const identity = await verifyGoogleCredential(req.body?.id_token || req.body?.idToken || req.body?.token);
    return issueOAuthResponse(req, res, identity);
  } catch (error) {
    console.error("GOOGLE_AUTH_ERROR", { name: error?.name, message: error?.message, stack: error?.stack });
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Google authentication failed." });
  }
});

app.post("/api/auth/apple", async (req, res) => {
  if (accountUnavailable(res)) return;
  try {
    await accountSchemaReady;
    const identity = await verifyAppleCredential(req.body?.id_token || req.body?.idToken || req.body?.token, req.body?.user);
    return issueOAuthResponse(req, res, identity);
  } catch (error) {
    console.error("APPLE_AUTH_ERROR", { name: error?.name, message: error?.message, stack: error?.stack });
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Apple authentication failed." });
  }
});

app.get("/api/account/me", async (req, res) => {
  if (accountUnavailable(res)) return;
  try {
    const user = await accountFromBearer(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Unauthorized." });
    const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [user.id]);
    return res.json({ user, data: dataRes.rows[0]?.data || {} });
  } catch (error) {
    console.error("ACCOUNT_ME_ERROR", { name: error?.name, message: error?.message, stack: error?.stack });
    return res.status(500).json({ error: "Failed to fetch account profile." });
  }
});

app.post("/api/account/sync", async (req, res) => {
  if (accountUnavailable(res)) return;
  try {
    const user = await accountFromBearer(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Unauthorized." });
    const clientData = req.body?.data || req.body || {};
    const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [user.id]);
    const current = existing.rows[0]?.data || {};
    const merged = { ...current, ...clientData, lastSyncedAt: new Date().toISOString() };
    await pool.query(
      `INSERT INTO app_account_data(user_id, data, updated_at)\n       VALUES($1, $2, NOW())\n       ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [user.id, JSON.stringify(merged)]
    );
    return res.json({ ok: true, data: merged });
  } catch (error) {
    console.error("ACCOUNT_SYNC_ERROR", { name: error?.name, message: error?.message, stack: error?.stack });
    return res.status(500).json({ error: "Failed to sync account data." });
  }
});

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
    const type = op.type;
    const targetWeekNum = op.week;
    const targetSessionSpec = op.session;
    const targetExName = String(op.exercise || "").toLowerCase();
    const targetExId = op.exercise_id;
    const targetSetIndex = op.set_index;
    const changes = op.changes || {};

    const weeksToModify = targetWeekNum === "all" || targetWeekNum == null
      ? cloned.weeks
      : cloned.weeks.filter(w => (w.weekNumber ?? w.week) === Number(targetWeekNum) || w.id === targetWeekNum);

    if (!weeksToModify.length && targetWeekNum !== "all") {
      throw new Error(`Settimana target non trovata: ${targetWeekNum} (operazione #${opIdx + 1}: ${type})`);
    }

    if (type === "add_week") {
      const newWeekNum = cloned.weeks.length + 1;
      const template = cloned.weeks[cloned.weeks.length - 1];
      const newWeek = JSON.parse(JSON.stringify(template));
      newWeek.id = `w${newWeekNum}`;
      newWeek.weekNumber = newWeekNum;
      newWeek.week = newWeekNum;
      newWeek.label = changes.label || `Settimana ${newWeekNum}`;
      cloned.weeks.push(newWeek);
      appliedCount++;
      continue;
    }

    if (type === "remove_week") {
      const weekIndex = cloned.weeks.findIndex(w => (w.weekNumber ?? w.week) === Number(targetWeekNum) || w.id === targetWeekNum);
      if (weekIndex >= 0) {
        cloned.weeks.splice(weekIndex, 1);
        appliedCount++;
      }
      continue;
    }

    if (type === "modify_week") {
      weeksToModify.forEach(w => {
        if (changes.label) w.label = changes.label;
        if (changes.title) w.title = changes.title;
        appliedCount++;
      });
      continue;
    }

    weeksToModify.forEach(w => {
      const sessions = w.sessions || w.days || [];
      const sessionsToModify = targetSessionSpec === "all" || targetSessionSpec == null
        ? sessions
        : sessions.filter((s, idx) => {
            const sNum = parseInt(targetSessionSpec, 10);
            if (Number.isFinite(sNum)) return idx === sNum - 1 || idx === sNum;
            return s.id === targetSessionSpec || (s.title && s.title.toLowerCase().includes(String(targetSessionSpec).toLowerCase()));
          });

      if (type === "add_session") {
        const newSessionId = `${w.id || 'w'+(w.weekNumber||w.week)}_s${sessions.length + 1}`;
        const newSession = {
          id: newSessionId,
          title: changes.title || `SESSIONE ${sessions.length + 1}`,
          day: changes.day || `Giorno ${sessions.length + 1}`,
          is_bonus: Boolean(changes.is_bonus),
          exercises: []
        };
        sessions.push(newSession);
        w.sessions = sessions;
        w.days = sessions;
        appliedCount++;
        return;
      }

      if (type === "remove_session") {
        const sIndex = sessions.findIndex((s, idx) => {
          const sNum = parseInt(targetSessionSpec, 10);
          if (Number.isFinite(sNum)) return idx === sNum - 1 || idx === sNum;
          return s.id === targetSessionSpec || (s.title && s.title.toLowerCase().includes(String(targetSessionSpec).toLowerCase()));
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
            id: `${s.id || 's'}_e${exercises.length + 1}_s${i + 1}`,
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
            id: `${s.id || 's'}_e${exercises.length + 1}`,
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

// Tool Endpoints: Get Active Program & Transactional Modify
app.get("/api/program/active", async (req, res) => {
  if (accountUnavailable(res)) return;
  try {
    const user = await accountFromBearer(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Unauthorized." });
    const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [user.id]);
    const accountData = dataRes.rows[0]?.data || {};
    const program = accountData.activeProgram || accountData.program || null;
    return res.json({ ok: true, program });
  } catch (error) {
    console.error("GET_ACTIVE_PROGRAM_ERROR", error);
    return res.status(500).json({ error: "Failed to fetch active program." });
  }
});

app.post("/api/program/modify", async (req, res) => {
  if (accountUnavailable(res)) return;
  const client = await pool.connect();
  try {
    const user = await accountFromBearer(req.headers.authorization);
    if (!user) {
      client.release();
      return res.status(401).json({ error: "Unauthorized." });
    }

    const { operations } = req.body || {};
    if (!Array.isArray(operations) || !operations.length) {
      client.release();
      return res.status(400).json({ error: "operations array is required." });
    }

    await client.query("BEGIN");
    const dataRes = await client.query(
      "SELECT data FROM app_account_data WHERE user_id = $1 FOR UPDATE",
      [user.id]
    );

    const accountData = dataRes.rows[0]?.data || {};
    const currentProgram = accountData.activeProgram || accountData.program;
    if (!currentProgram) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ error: "Nessun programma attivo trovato per questo utente." });
    }

    const modResult = applyOperationsToProgram(currentProgram, operations);
    accountData.activeProgram = modResult.program;
    accountData.program = modResult.program;
    accountData.lastModifiedAt = new Date().toISOString();

    await client.query(
      "UPDATE app_account_data SET data = $1, updated_at = NOW() WHERE user_id = $2",
      [JSON.stringify(accountData), user.id]
    );

    await client.query("COMMIT");
    client.release();

    return res.json({
      ok: true,
      program: modResult.program,
      appliedCount: modResult.appliedCount
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("MODIFY_PROGRAM_TRANSACTION_ERROR", error);
    return res.status(400).json({ error: error.message || "Impossibile applicare le modifiche al programma." });
  }
});

async function analyzeUploadedBuffer(originalname, mimeType, buffer) {
  const filename = originalname.toLowerCase();
  const mime = (mimeType || "").toLowerCase();
  if (!filename || !buffer || !buffer.length) {
    const error = new Error("filename, mime_type and non-empty data_base64 are required.");
    error.statusCode = 400;
    throw error;
  }
  const prompt = `${workoutInstruction}\n\nAnalizza il materiale seguente e crea la programmazione canonica.`;
  let input;
  let systemInstruction;
  let parser = "unknown";
  let extractedRawText = "";
  if (mime === "application/pdf" || filename.endsWith(".pdf")) {
    parser = "gemini-document-base64";
    input = { type: "document", data: buffer.toString("base64"), mime_type: "application/pdf" };
    systemInstruction = prompt;
  } else if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || filename.endsWith(".docx")) {
    parser = "mammoth-buffer";
    const result = await mammoth.extractRawText({ buffer });
    extractedRawText = result.value || "";
    input = `${prompt}\n\nDOCUMENTO WORD (${originalname}):\n${extractedRawText}`;
  } else if (mime === "application/msword" || filename.endsWith(".doc")) {
    parser = "word-extractor-buffer-via-tempfile";
    extractedRawText = await extractLegacyWordText(buffer);
    if (!extractedRawText.trim()) throw Object.assign(new Error("Legacy DOC contains no readable text."), { statusCode: 400 });
    input = `${prompt}\n\nDOCUMENTO WORD LEGACY (${originalname}):\n${extractedRawText}`;
  } else if (mime.startsWith("text/") || filename.endsWith(".txt")) {
    parser = "utf8-buffer";
    extractedRawText = buffer.toString("utf8");
    input = `${prompt}\n\nDOCUMENTO TESTUALE (${originalname}):\n${extractedRawText}`;
  } else if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || mime === "application/vnd.ms-excel" || filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
    parser = "xlsx-buffer";
    extractedRawText = extractExcelText(buffer);
    input = `${prompt}\n\nFOGLI EXCEL (${originalname}):\n${extractedRawText}`;
  } else {
    const error = new Error("Unsupported file type. Use PDF, DOC, DOCX, TXT, XLSX or XLS.");
    error.statusCode = 415;
    throw error;
  }

  parseDocStructureIntermediate(extractedRawText);

  return { result: await runStructuredInteraction(input, systemInstruction), parser };
}

app.post("/api/analyze-file", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    const { filename, mime_type: mimeType, data_base64: dataBase64 } = req.body || {};
    if (typeof filename !== "string" || typeof mimeType !== "string" || typeof dataBase64 !== "string" || !dataBase64.trim()) {
      return res.status(400).json({ error: "filename, mime_type and data_base64 are required." });
    }
    const normalizedBase64 = dataBase64.replace(/^data:[^,]+,/, "").replace(/\s/g, "");
    if (!normalizedBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalizedBase64) || normalizedBase64.length % 4 === 1) {
      return res.status(400).json({ error: "Invalid base64 file data." });
    }
    const buffer = Buffer.from(normalizedBase64, "base64");
    if (!buffer.length || buffer.length > 50 * 1024 * 1024) return res.status(400).json({ error: "Invalid or oversized file data." });
    const normalizedFilename = filename.toLowerCase();
    const parser = selectFileParser(normalizedFilename, mimeType.toLowerCase());
    console.info("FILE_ANALYZE_START", { filename, mime: mimeType, byteLength: buffer.length, parser });
    try {
      const analyzed = await analyzeUploadedBuffer(filename, mimeType, buffer);
      console.info("FILE_ANALYZE_END", { filename, parser: analyzed.parser });
      return res.json(analyzed.result);
    } catch (error) {
      console.error("FILE_ANALYZE_ERROR", {
        filename,
        mime: mimeType,
        byteLength: buffer.length,
        error: { name: error?.name, message: error?.message, stack: error?.stack }
      });
      throw error;
    }
  } catch (error) {
    console.error("Analyze-file error:", { name: error?.name, message: error?.message, status: error?.status || error?.statusCode, stack: error?.stack });
    return res.status(error?.statusCode || 500).json({ error: error?.statusCode === 415 ? error.message : "Document analysis failed." });
  }
});

app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server."
      });
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!req.file && !text) {
      return res.status(400).json({
        error: "Provide a file field named 'file' or a non-empty 'text' field."
      });
    }

    const prompt = `${workoutInstruction}\n\nAnalizza il materiale seguente e crea la programmazione canonica.`;
    let input;
    let systemInstruction;

    if (req.file) {
      const filename = req.file.originalname.toLowerCase();
      const mime = req.file.mimetype || "application/octet-stream";

      if (mime === "application/pdf" || filename.endsWith(".pdf")) {
        input = {
          type: "document",
          data: req.file.buffer.toString("base64"),
          mime_type: "application/pdf"
        };
        systemInstruction = prompt;
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        filename.endsWith(".docx")
      ) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        parseDocStructureIntermediate(result.value);
        input = `${prompt}\n\nDOCUMENTO WORD (${req.file.originalname}):\n${result.value}`;
      } else if (mime === "application/msword" || filename.endsWith(".doc")) {
        const extracted = await extractLegacyWordText(req.file.buffer);
        if (!extracted.trim()) throw Object.assign(new Error("Legacy DOC contains no readable text."), { statusCode: 400 });
        parseDocStructureIntermediate(extracted);
        input = `${prompt}\n\nDOCUMENTO WORD LEGACY (${req.file.originalname}):\n${extracted}`;
      } else if (
        mime.startsWith("text/") ||
        filename.endsWith(".txt")
      ) {
        const raw = req.file.buffer.toString("utf8");
        parseDocStructureIntermediate(raw);
        input = `${prompt}\n\nDOCUMENTO TESTUALE (${req.file.originalname}):\n${raw}`;
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mime === "application/vnd.ms-excel" ||
        filename.endsWith(".xlsx") ||
        filename.endsWith(".xls")
      ) {
        const raw = extractExcelText(req.file.buffer);
        parseDocStructureIntermediate(raw);
        input = `${prompt}\n\nFOGLI EXCEL (${req.file.originalname}):\n${raw}`;
      } else {
        return res.status(415).json({
          error: "Unsupported file type. Use PDF, DOC, DOCX, TXT, XLSX or XLS."
        });
      }
    } else {
      parseDocStructureIntermediate(text);
      input = `${prompt}\n\nTESTO FORNITO DALL'UTENTE:\n${text}`;
    }

    const result = await runStructuredInteraction(input, systemInstruction);
    return res.json(result);
  } catch (error) {
    console.error("Analyze error:", {
      name: error?.name,
      message: error?.message,
      status: error?.status || error?.statusCode || error?.response?.status,
      response: error?.response,
      details: error?.details,
      stack: error?.stack
    });
    return res.status(error?.statusCode || 500).json({
      error: "Document analysis failed.",
      ...(process.env.NODE_ENV === "development" ? {
        gemini: {
          name: error?.name,
          message: error?.message,
          status: error?.status || error?.statusCode || error?.response?.status,
          details: error?.details
        }
      } : {})
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server."
      });
    }

    const message = typeof req.body?.message === "string"
      ? req.body.message.trim()
      : "";

    if (!message) {
      return res.status(400).json({ error: "message is required." });
    }

    let context = req.body?.context ?? {};
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    // Check if user is authenticated and read their active program if not provided in context
    const authUser = await accountFromBearer(req.headers.authorization);
    if (authUser && !context.program) {
      try {
        const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [authUser.id]);
        const dbData = dataRes.rows[0]?.data || {};
        if (dbData.activeProgram) context.program = dbData.activeProgram;
        if (dbData.data) context.trainingData = dbData.data;
      } catch (_) {}
    }

    const system = `
Sei Coach AI, l'assistente scientifico di allenamento di élite all'interno dell'applicazione Giammaria System.
Rispondi sempre in italiano in modo chiaro, competente, motivante e basato sull'evidence-based training.

ACCESSO AL PROGRAMMA ATTIVO:
Hai PIENO ACCESSO di lettura e modifica al programma attivo dell'atleta attraverso le API e i tool del sistema.
NON DIRE MAI: "Non ho accesso al database" o "Non posso modificare il file interno". Tu puoi analizzare la programmazione attiva e proporre modifiche strutturate istantanee!

QUANDO L'UTENTE FA DOMANDE SUL PROGRAMMA:
- Ispeziona dettagliatamente il CONTESTO PROGRAMMA fornito (settimane, sessioni, esercizi, serie, carichi, reps, RIR, recuperi, note).
- Rispondi con conteggi e dettagli precisi (es. quanti esercizi ci sono, come sono strutturate le sessioni, carichi e progressioni).

QUANDO L'UTENTE RICHIEDE MODIFICHE:
Quando l'atleta chiede di modificare, aggiungere, eliminare o sostituire esercizi, serie, carichi, ripetizioni, RPE, RIR, recuperi, sessioni o settimane, oppure creare superset, DEVI includere nella risposta un blocco JSON con action "modify_program" contenente l'elenco delle operazioni atomiche da eseguire:

\`\`\`json
{
  "action": "modify_program",
  "summary": "Descrizione sintetica delle modifiche proposte per l'atleta",
  "operations": [
    {
      "type": "add_set" | "remove_set" | "modify_set" | "modify_load" | "modify_reps" | "modify_rpe" | "modify_rir" | "modify_rest" | "modify_tempo" | "replace_exercise" | "add_exercise" | "remove_exercise" | "create_superset" | "remove_superset" | "modify_session" | "add_session" | "remove_session" | "modify_week" | "add_week" | "remove_week",
      "week": 1, // numero 1-based o "all"
      "session": 1, // numero 1-based o "all" o nome sessione
      "exercise": "Panca piana", // nome dell'esercizio da cercare
      "target_exercise": "Hack Squat", // per replace_exercise o add_exercise
      "set_index": 3, // opzionale 1-based
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

    const historyText = history.slice(-12)
      .filter((item) => item && typeof (item.content || item.text) === "string")
      .map((item) => `${item.role === "assistant" ? "ASSISTANT" : "USER"}: ${item.content || item.text}`)
      .join("\n");
    const input = `${system}\n\nCONTESTO PROGRAMMA:\n${JSON.stringify(context)}\n\nCRONOLOGIA:\n${historyText}\n\nUSER: ${message}`;
    const interaction = await ai.interactions.create({
      model: MODEL,
      input
    });

    const replyText = interaction.output_text || "";
    let proposedAction = null;
    const jsonMatch = replyText.match(/```(?:json)?\s*(\{[\s\S]*?"action"\s*:\s*"modify_program"[\s\S]*?\})\s*```/i);
    if (jsonMatch) {
      try {
        proposedAction = JSON.parse(jsonMatch[1]);
      } catch (_) {}
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
    return res.status(error?.statusCode || 500).json({
      error: "Coach interaction failed.",
      ...(process.env.NODE_ENV === "development" ? {
        gemini: {
          name: error?.name,
          message: error?.message,
          status: error?.status || error?.statusCode || error?.response?.status,
          details: error?.details
        }
      } : {})
    });
  }
});

const server = app.listen(PORT, () => {
  console.info(`Coach API listening on port ${PORT}`);
});

export { app, server, applyOperationsToProgram, parseDocStructureIntermediate };
