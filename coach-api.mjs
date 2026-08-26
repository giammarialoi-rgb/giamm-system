import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import pg from "pg";
import jwt from "jsonwebtoken";
import ExcelJS from "exceljs";
import crypto from "crypto";

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
          provider TEXT NOT NULL,
          provider_id TEXT NOT NULL,
          avatar_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_account_data (
          user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
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
  const normalized = (email || "").trim().toLowerCase();
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
    await client.query("INSERT INTO app_account_data(user_id, data) VALUES($1, '{}'::jsonb)", [user.id]);
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
        e.sets.forEach((set, setIdx) => {
          set.id = `${e.id}_s${setIdx + 1}`;
          set.done = false;
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

    if (type === "modify_week") {
      weeksToModify.forEach(w => {
        if (changes.label) w.label = changes.label;
        if (changes.title) w.title = changes.title;
        if (changes.notes) w.notes = changes.notes;
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

      sessionsToModify.forEach(s => {
        const exercises = s.exercises || s.rows || [];

        if (type === "add_exercise") {
          const newExName = op.target_exercise || op.exercise;
          if (!newExName) return;
          const newExId = `${s.id || 's'}_e${exercises.length + 1}`;
          const initialSets = [];
          const setsCount = Number(changes.sets) || 3;
          for (let st = 1; st <= setsCount; st++) {
            initialSets.push({
              id: `${newExId}_s${st}`,
              order: st,
              reps: changes.reps || "8-10",
              load: typeof changes.load === "number" ? changes.load : null,
              load_unit: changes.load_unit || "kg",
              percentage_1rm: changes.percentage_1rm || null,
              rpe: changes.rpe || null,
              rir: changes.rir !== undefined ? changes.rir : 2,
              rest_seconds: changes.rest_seconds || (changes.rest ? parseInt(changes.rest, 10) : 90),
              tempo: changes.tempo || "",
              done: false
            });
          }

          const newExercise = {
            id: newExId,
            name: newExName,
            exercise: newExName,
            order: exercises.length + 1,
            movement: changes.movement || "",
            muscle_groups: changes.muscle_groups || [],
            muscleGroups: changes.muscle_groups || [],
            muscle_group: changes.muscle_group || null,
            superset_id: changes.superset_id || null,
            notes: changes.notes || "",
            progression_rule: changes.progression_rule || "",
            is_bonus: Boolean(changes.is_bonus),
            isBonus: Boolean(changes.is_bonus),
            sets: initialSets,
            repsTarget: changes.reps || "8-10",
            rpeTarget: changes.rpe || null,
            rirTarget: changes.rir !== undefined ? changes.rir : 2,
            rest: changes.rest || "90s",
            rest_seconds: changes.rest_seconds || 90,
            plannedLoad: changes.load || null,
            tempo: changes.tempo || "",
            setRows: Array.from({ length: Math.max(0, setsCount - 1) }, (_, i) => i + 2)
          };
          exercises.push(newExercise);
          s.exercises = exercises;
          s.rows = exercises;
          appliedCount++;
          return;
        }

        const exercisesToModify = exercises.filter(e => {
          if (targetExId && e.id === targetExId) return true;
          if (targetExName) {
            const eName = String(e.name || e.exercise || "").toLowerCase();
            return eName.includes(targetExName) || targetExName.includes(eName);
          }
          return false;
        });

        exercisesToModify.forEach(e => {
          if (type === "replace_exercise") {
            const replName = op.target_exercise;
            if (replName) {
              e.name = replName;
              e.exercise = replName;
              if (changes.movement) e.movement = changes.movement;
              if (changes.muscle_groups) {
                e.muscle_groups = changes.muscle_groups;
                e.muscleGroups = changes.muscle_groups;
              }
              if (changes.notes) e.notes = changes.notes;
              appliedCount++;
            }
            return;
          }

          if (type === "remove_exercise") {
            const exIdx = exercises.indexOf(e);
            if (exIdx >= 0) {
              exercises.splice(exIdx, 1);
              appliedCount++;
            }
            return;
          }

          if (type === "create_superset") {
            const ssId = changes.superset_id || `ss_${w.id || 'w'}_${s.id || 's'}_${Date.now()}`;
            e.superset_id = ssId;
            const targetEx = op.target_exercise ? exercises.find(t => {
              const tName = String(t.name || t.exercise || "").toLowerCase();
              const reqTarget = String(op.target_exercise).toLowerCase();
              return tName.includes(reqTarget) || reqTarget.includes(tName);
            }) : null;
            if (targetEx) {
              targetEx.superset_id = ssId;
            }
            appliedCount++;
            return;
          }

          if (type === "remove_superset") {
            e.superset_id = null;
            appliedCount++;
            return;
          }

          let sets = Array.isArray(e.sets) ? e.sets : [];
          if (!sets.length && typeof e.sets === "number") {
            for (let i = 1; i <= e.sets; i++) {
              sets.push({
                id: `${e.id}_s${i}`,
                order: i,
                reps: e.reps || "8-10",
                load: e.plannedLoad || e.load || null,
                load_unit: "kg",
                percentage_1rm: null,
                rpe: e.rpeTarget || null,
                rir: e.rirTarget || null,
                rest_seconds: e.rest_seconds || 90,
                tempo: e.tempo || "",
                done: false
              });
            }
          }

          if (type === "add_set") {
            const newOrder = sets.length + 1;
            const prevSet = sets[sets.length - 1] || {};
            sets.push({
              id: `${e.id}_s${newOrder}`,
              order: newOrder,
              reps: changes.reps || prevSet.reps || "8-10",
              load: typeof changes.load === "number" ? changes.load : prevSet.load || null,
              load_unit: changes.load_unit || prevSet.load_unit || "kg",
              percentage_1rm: changes.percentage_1rm || prevSet.percentage_1rm || null,
              rpe: changes.rpe || prevSet.rpe || null,
              rir: changes.rir !== undefined ? changes.rir : (prevSet.rir !== undefined ? prevSet.rir : 1),
              rest_seconds: changes.rest_seconds || prevSet.rest_seconds || 90,
              tempo: changes.tempo || prevSet.tempo || "",
              done: false
            });
            e.sets = sets;
            e.setRows = Array.from({ length: Math.max(0, sets.length - 1) }, (_, i) => i + 2);
            appliedCount++;
            return;
          }

          if (type === "remove_set") {
            if (targetSetIndex && targetSetIndex <= sets.length) {
              sets.splice(targetSetIndex - 1, 1);
            } else if (sets.length > 0) {
              sets.pop();
            }
            sets.forEach((st, idx) => { st.order = idx + 1; });
            e.sets = sets;
            e.setRows = Array.from({ length: Math.max(0, sets.length - 1) }, (_, i) => i + 2);
            appliedCount++;
            return;
          }

          const setsToModify = targetSetIndex
            ? sets.filter(st => st.order === Number(targetSetIndex))
            : sets;

          setsToModify.forEach(st => {
            if (type === "modify_load" || changes.load !== undefined) {
              if (typeof changes.load === "number") st.load = changes.load;
              else if (typeof op.load === "number") st.load = op.load;
            }
            if (type === "modify_reps" || changes.reps !== undefined) {
              st.reps = String(changes.reps || op.reps || st.reps);
            }
            if (type === "modify_rpe" || changes.rpe !== undefined) {
              st.rpe = changes.rpe ?? op.rpe;
            }
            if (type === "modify_rir" || changes.rir !== undefined) {
              st.rir = changes.rir ?? op.rir;
            }
            if (type === "modify_rest" || changes.rest_seconds !== undefined || changes.rest !== undefined) {
              st.rest_seconds = changes.rest_seconds || (changes.rest ? parseInt(changes.rest, 10) : st.rest_seconds);
            }
            if (type === "modify_tempo" || changes.tempo !== undefined) {
              st.tempo = changes.tempo || op.tempo || st.tempo;
            }
            appliedCount++;
          });

          if (changes.notes) e.notes = changes.notes;
          if (changes.progression_rule) e.progression_rule = changes.progression_rule;
        });
      });
    });
  }

  cloned.weeks.forEach((w, idx) => {
    w.weekNumber = idx + 1;
    w.week = idx + 1;
  });

  return { ok: true, program: cloned, appliedCount };
}

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    model: MODEL,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    accountStorageConfigured: Boolean(process.env.DATABASE_URL)
  });
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { id_token } = req.body || {};
    const identity = await verifyGoogleCredential(id_token);
    return await issueOAuthResponse(req, res, identity);
  } catch (error) {
    console.error("Auth Google Error:", error);
    return res.status(error.statusCode || 401).json({ error: error.message || "Autenticazione Google fallita." });
  }
});

app.post("/api/auth/apple", async (req, res) => {
  try {
    const { id_token, user } = req.body || {};
    const identity = await verifyAppleCredential(id_token, user);
    return await issueOAuthResponse(req, res, identity);
  } catch (error) {
    console.error("Auth Apple Error:", error);
    return res.status(error.statusCode || 401).json({ error: error.message || "Autenticazione Apple fallita." });
  }
});

app.get("/api/account/data", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Sessione scaduta o non autorizzata." });
  try {
    const result = await pool.query("SELECT data, updated_at FROM app_account_data WHERE user_id = $1", [auth.id]);
    return res.json({ ok: true, data: result.rows[0]?.data || {}, updated_at: result.rows[0]?.updated_at });
  } catch (err) {
    return res.status(500).json({ error: "Impossibile recuperare i dati dell'account." });
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

app.post("/api/ingest/document", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server."
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const ai = getClient();
    const prompt = `Analizza questo file di allenamento e convertilo in una struttura JSON valida secondo lo schema specificato.`;

    let response;
    if (req.file.mimetype === "text/plain" || req.file.mimetype === "text/csv") {
      const textContent = req.file.buffer.toString("utf-8");
      response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          { role: "user", parts: [{ text: `${prompt}\n\nDOCUMENT CONTENT:\n${textContent}` }] }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: workoutSchema
        }
      });
    } else {
      const fileData = {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype
        }
      };
      response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          { role: "user", parts: [fileData, { text: prompt }] }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: workoutSchema
        }
      });
    }

    const structuredWorkout = JSON.parse(response.text.trim());
    return res.json(structuredWorkout);
  } catch (error) {
    console.error("Ingest error:", error);
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
