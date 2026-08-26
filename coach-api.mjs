import express from "express";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
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

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost")
    ? { rejectUnauthorized: false }
    : false
});

let dbInitialized = false;

async function initDb() {
  if (dbInitialized || !process.env.DATABASE_URL) return;
  try {
    const client = await pool.connect();
    try {
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
        ALTER TABLE app_account_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        CREATE INDEX IF NOT EXISTS idx_app_users_provider ON app_users(provider, provider_id);
        CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
      `);
      await client.query("COMMIT");
      dbInitialized = true;
      console.log("Database tables verified successfully.");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("DB Init Error:", err);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("DB Connection Error during init:", err);
  }
}

initDb();

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

const JWT_SECRET = process.env.JWT_SECRET || "gs-coach-secret-key-production-change-me";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || "com.giammaria.system";

function issueAccountToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      name: user.name,
      provider: user.provider
    },
    JWT_SECRET,
    { expiresIn: "90d" }
  );
}

async function accountFromBearer(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.sub) return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      provider: payload.provider
    };
  } catch (_) {
    return null;
  }
}

async function resolveOAuthUser({ email, name, provider, providerId, avatarUrl, linkingUser }) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw Object.assign(new Error("Missing user email from identity provider."), { statusCode: 400 });

  if (linkingUser && linkingUser.id) {
    const updated = await pool.query(
      `UPDATE app_users
       SET email = $1, name = COALESCE($2, name), provider = $3, provider_id = $4, avatar_url = COALESCE($5, avatar_url), updated_at = NOW()
       WHERE id = $6
       RETURNING id, email, name, provider, avatar_url`,
      [normalized, name, provider, providerId, avatarUrl || null, linkingUser.id]
    );
    if (updated.rows.length) return updated.rows[0];
  }

  const existing = await pool.query(
    "SELECT id, email, name, provider, avatar_url FROM app_users WHERE email = $1",
    [normalized]
  );
  if (existing.rows.length) {
    const updated = await pool.query(
      `UPDATE app_users
       SET name = COALESCE($1, name), provider = $2, provider_id = $3, avatar_url = COALESCE($4, avatar_url), updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, name, provider, avatar_url`,
      [name, provider, providerId, avatarUrl || null, existing.rows[0].id]
    );
    return updated.rows[0];
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const created = await client.query(
      `INSERT INTO app_users(email, name, provider, provider_id, avatar_url)
       VALUES($1, $2, $3, $4, $5)
       RETURNING id, email, name, provider, avatar_url`,
      [normalized, name || normalized.split("@")[0], provider, providerId, avatarUrl || null]
    );
    const user = created.rows[0];
    await client.query("INSERT INTO app_account_data(user_id, data) VALUES($1, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING", [user.id]);
    await client.query("COMMIT");
    return user;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
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

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured on the server."), {
      statusCode: 500
    });
  }
  return new GoogleGenAI({ apiKey });
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
2. ESTRAZIONE COMPLETA: Estrai TUTTE le settimane, TUTTE le sessioni e TUTTI gli esercizi presenti nel documento. Non troncare, non riassumere.
3. SESSIONI/ESERCIZI BONUS: Se nel documento sono presenti sessioni o esercizi contrassegnati come BONUS, richiamo o opzionali, impostali con is_bonus: true.
4. GRUPPI MUSCOLARI: Valorizza muscle_group e muscle_groups per ogni esercizio.
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
    parser = "xlsx_sheet_parser";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'application/vnd.ms-excel'}" byteLength=${buffer.length} parser="${parser}"`);
    const textContent = extractExcelText(buffer);
    parts = [{ text: `${promptText}\n\nDOCUMENT CONTENT (EXCEL):\n${textContent}` }];
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
  console.log(`[FILE_ANALYZE_END] filename="${filename}" parser="${parser}"`);
  return { structuredWorkout, parser };
}

// Routes
// Routes
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    model: MODEL,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    accountStorageConfigured: Boolean(process.env.DATABASE_URL)
  });
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
    return res.json({
      user: { id: user.id, email: user.email, name: user.name, provider: user.provider || "email", avatarUrl: user.avatar_url || null },
      data: dataRes.rows[0]?.data || {}
    });
  } catch (error) {
    console.error("ACCOUNT_ME_ERROR", error);
    return res.status(500).json({ error: "Failed to fetch account profile." });
  }
});

app.post("/api/account/sync", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Unauthorized." });
  try {
    const clientData = req.body?.data || req.body || {};
    const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    const current = existing.rows[0]?.data || {};
    const merged = { ...current, ...clientData, lastSyncedAt: new Date().toISOString() };
    await pool.query(
      `INSERT INTO app_account_data(user_id, data, updated_at)
       VALUES($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [auth.id, JSON.stringify(merged)]
    );
    return res.json({ ok: true, data: merged });
  } catch (error) {
    console.error("ACCOUNT_SYNC_ERROR", error);
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

app.post("/api/auth/apple", async (req, res) => {
  try {
    const identity = await verifyAppleCredential(req.body?.code || req.body?.id_token || req.body?.identityToken, req.body?.user);
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
    const dataPayload = req.body?.data || {};
    await pool.query(
      `INSERT INTO app_account_data (user_id, data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET data = $2, updated_at = NOW()`,
      [auth.id, JSON.stringify(dataPayload)]
    );
    return res.json({ ok: true, saved_at: new Date().toISOString() });
  } catch (err) {
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
         SET data = jsonb_set(data, '{activeProgram}', $1::jsonb), updated_at = NOW()
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
    return res.status(500).json({
      error: "Document ingestion failed.",
      details: error.message
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

    const authUser = await accountFromBearer(req.headers.authorization);
    if (authUser && !context.program) {
      try {
        const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [authUser.id]);
        const dbData = dataRes.rows[0]?.data || {};
        if (dbData.activeProgram) context.program = dbData.activeProgram;
        if (dbData.data) context.trainingData = dbData.data;
      } catch (_) {}
    }

    const currentW = Number(context.currentWeek) || 1;
    const currentD = Number(context.currentDay) >= 0 ? Number(context.currentDay) + 1 : 1;

    const system = `
Sei Coach AI, l'assistente scientifico di allenamento di élite all'interno dell'applicazione Giammaria System.
Rispondi sempre in italiano in modo chiaro, autorevole, motivante e rigorosamente evidence-based.

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

    const historyText = history.slice(-12)
      .filter((item) => item && typeof (item.content || item.text) === "string")
      .map((item) => `${item.role === "assistant" ? "ASSISTANT" : "USER"}: ${item.content || item.text}`)
      .join("\n");
    const input = `${system}\n\nCONTESTO PROGRAMMA:\n${JSON.stringify(context)}\n\nCRONOLOGIA:\n${historyText}\n\nUSER: ${message}`;
    
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: input }] }]
    });

    const replyText = response.text || "";
    let proposedAction = null;
    const jsonMatch = replyText.match(/```(?:json)?\s*({[\s\S]*?"action"\s*:\s*"modify_program"[\s\S]*?\})\s*```/i);
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
      details: error?.message
    });
  }
});

app.listen(port, () => {
  console.log(`Coach API server listening at http://localhost:${port}`);
});
