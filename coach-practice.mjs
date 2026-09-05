import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import webpush from "web-push";

function slugName(name) {
  const s = String(name || "atleta")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  return s || "atleta";
}

function publicOrigin(req) {
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost").split(",")[0].trim();
  return `${proto}://${host}`;
}

function formatInviteShareText(opts = {}) {
  const name = String(opts.name || opts.displayName || "").trim() || "atleta";
  const code = opts.inviteCode || String(opts.token || opts.inviteUrl || "").split("/").pop().slice(-6).toUpperCase();
  const lines = [
    `Ciao ${name},`,
    "benvenuto nel mio servizio coaching, clicka sul link qui sotto ed inserisci i dati richiesti che trovi in basso nel messaggio, compila il form se richiesto, preparati a prenderti cura del tuo corpo sotto ogni aspetto 💪🏻🏋️‍♂️🍎💊🧬",
    "",
    `Link: ${opts.inviteUrl || ""}`,
    `Utente: ${opts.username || ""}`,
    `Password: ${opts.password || ""}`
  ];
  if (code) lines.push(`Codice invito: ${code}`);
  return lines.join("\n");
}

const INTAKE_KEYS = [
  "firstName", "lastName", "sex", "ageBand", "heightBand", "weightBand",
  "trainingAge", "level", "goal", "sessionsPerWeek", "sessionMinutes",
  "equipment", "splitPref", "injuryPrimary", "injurySecondary", "medicalLimit",
  "jobType", "sleepHours", "stress",
  "rmSquat", "rmBench", "rmDeadlift", "rmMilitary"
];

const INTAKE_REQUIRED = [
  "firstName", "lastName", "sex", "ageBand", "heightBand", "weightBand",
  "trainingAge", "level", "goal", "sessionsPerWeek", "sessionMinutes",
  "equipment", "injuryPrimary", "jobType", "sleepHours", "stress"
];

function sanitizeIntake(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  INTAKE_KEYS.forEach((k) => {
    const v = raw[k];
    if (v == null) return;
    out[k] = String(v).trim().slice(0, 80);
  });
  // Optional allergies/intolerances: catalog ids used by nutrition plan generator
  if (Array.isArray(raw.allergies)) {
    out.allergies = raw.allergies
      .map((x) => String(x || "").trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 40);
  } else if (typeof raw.allergies === "string" && raw.allergies.trim()) {
    out.allergies = raw.allergies
      .split(/[,;|]/)
      .map((x) => x.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 40);
  }
  return out;
}

function intakeMissing(intake) {
  return INTAKE_REQUIRED.filter((k) => !intake[k]);
}

function bandMid(value) {
  const s = String(value || "");
  const range = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) return Math.round((Number(range[1]) + Number(range[2])) / 2);
  const one = s.match(/(\d+)/);
  return one ? Number(one[1]) : "";
}

function profileFromIntake(intake) {
  const name = [intake.firstName, intake.lastName].filter(Boolean).join(" ").trim();
  const allergies = Array.isArray(intake.allergies)
    ? intake.allergies.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 40)
    : [];
  return {
    name,
    sex: intake.sex === "Femmina" ? "f" : (intake.sex === "Maschio" ? "m" : ""),
    age: bandMid(intake.ageBand),
    height: bandMid(intake.heightBand),
    weight: bandMid(intake.weightBand),
    goal: intake.goal || "",
    allergies,
    intake
  };
}

function clientNeedsIntake(row) {
  return (row.intake_mode || "new") === "new" && !row.intake_completed_at;
}

function isOnlineAt(ts, windowMs = 300000) {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= windowMs;
}

function isWorkoutLive(r) {
  if (!r || !r.workout_started_at) return false;
  const started = new Date(r.workout_started_at).getTime();
  if (!Number.isFinite(started)) return false;
  if (Date.now() - started > 4 * 60 * 60 * 1000) return false;
  if (r.last_workout_at) {
    const done = new Date(r.last_workout_at).getTime();
    if (Number.isFinite(done) && done >= started) return false;
  }
  return true;
}

function clientRow(r, { includeIntake = false, includeSecrets = false } = {}) {
  if (!r) return null;
  const row = {
    id: String(r.id),
    displayName: r.display_name,
    username: r.username,
    status: r.status,
    paid: !!r.paid,
    billingCycle: r.billing_cycle || "monthly",
    nextDueAt: r.next_due_at,
    allowProgramDb: !!r.allow_program_db,
    lastWorkoutAt: r.last_workout_at,
    lastSeenAt: r.last_seen_at || null,
    online: isOnlineAt(r.last_seen_at),
    workoutLive: isWorkoutLive(r),
    workoutStartedAt: r.workout_started_at || null,
    programExpiresAt: r.program_expires_at || null,
    nextCheckAt: r.next_check_at || null,
    unreadCount: Number(r.unread_count || 0),
    inviteToken: r.invite_token,
    createdAt: r.created_at,
    intakeMode: r.intake_mode || "new",
    intakeDone: !!r.intake_completed_at,
    leaveRequested: !!r.leave_requested_at,
    chatThread: Number(r.chat_thread || 1),
    allowMaxFreedom: !!r.allow_max_freedom,
    allowNurvanAi: !!r.allow_nurvan_ai,
    hasPendingChange: !!(r.pending_change && (r.pending_change.summary || r.pending_change.data))
  };
  if (includeIntake) {
    row.intake = r.intake || {};
    row.needIntake = clientNeedsIntake(r);
  }
  if (includeSecrets) {
    row.invitePassword = r.invite_password || "";
  }
  return row;
}

/** Build WebRTC iceServers from env (STUN always; TURN only when fully configured). Never logs credentials. */
function buildWebRtcIceServers(env) {
  const src = env && typeof env === "object" ? env : process.env;
  const iceServers = [
    { urls: ["stun:stun.l.google.com:19302"] },
    { urls: ["stun:stun1.l.google.com:19302"] }
  ];
  try {
    const turnUrls = String(src.TURN_URLS || "")
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const turnUser = String(src.TURN_USERNAME || "").trim();
    const turnCred = String(src.TURN_CREDENTIAL || "").trim();
    if (turnUrls.length && turnUser && turnCred) {
      iceServers.push({
        urls: turnUrls,
        username: turnUser,
        credential: turnCred
      });
    }
  } catch (_) {
    /* keep STUN-only on malformed env */
  }
  return iceServers;
}

export const CoachPracticeLib = {
  slugName,
  sanitizeIntake,
  intakeMissing,
  profileFromIntake,
  clientNeedsIntake,
  clientRow,
  bandMid,
  isOnlineAt,
  isWorkoutLive,
  buildWebRtcIceServers,
  INTAKE_KEYS,
  INTAKE_REQUIRED
};

export async function ensureCoachPracticeTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS coach_licenses (
      user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
      source TEXT NOT NULL DEFAULT 'demo',
      status TEXT NOT NULL DEFAULT 'active',
      unlocked_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS coach_clients (
      id BIGSERIAL PRIMARY KEY,
      coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      athlete_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
      display_name TEXT NOT NULL,
      username TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      paid BOOLEAN NOT NULL DEFAULT TRUE,
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      next_due_at TIMESTAMPTZ,
      allow_program_db BOOLEAN NOT NULL DEFAULT FALSE,
      invite_token TEXT NOT NULL UNIQUE,
      last_workout_at TIMESTAMPTZ,
      unread_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (coach_user_id, username)
    );
    CREATE INDEX IF NOT EXISTS idx_coach_clients_coach_status
      ON coach_clients (coach_user_id, status, display_name);
    CREATE INDEX IF NOT EXISTS idx_coach_clients_due
      ON coach_clients (coach_user_id, next_due_at);
    CREATE TABLE IF NOT EXISTS coach_messages (
      id BIGSERIAL PRIMARY KEY,
      client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
      from_role TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_coach_messages_client
      ON coach_messages (client_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS coach_events (
      id BIGSERIAL PRIMARY KEY,
      client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_coach_events_client
      ON coach_events (client_id, created_at DESC);
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS intake_mode TEXT NOT NULL DEFAULT 'new';
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS intake JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS intake_completed_at TIMESTAMPTZ;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS chat_thread INT NOT NULL DEFAULT 1;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS invite_password TEXT;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS leave_requested_at TIMESTAMPTZ;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS allow_max_freedom BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS allow_nurvan_ai BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS pending_change JSONB;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS workout_started_at TIMESTAMPTZ;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS program_expires_at TIMESTAMPTZ;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS next_check_at TIMESTAMPTZ;
    ALTER TABLE coach_licenses ADD COLUMN IF NOT EXISTS hide_presence BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE coach_licenses ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
    ALTER TABLE coach_licenses ADD COLUMN IF NOT EXISTS allow_videocall BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE coach_messages ADD COLUMN IF NOT EXISTS attachment JSONB;
    ALTER TABLE coach_messages ADD COLUMN IF NOT EXISTS thread_id INT NOT NULL DEFAULT 1;
    ALTER TABLE coach_messages ADD COLUMN IF NOT EXISTS hidden_for TEXT[] NOT NULL DEFAULT '{}';
    ALTER TABLE coach_events ADD COLUMN IF NOT EXISTS dismissed_for TEXT[] NOT NULL DEFAULT '{}';
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS e2e_pubkey_coach TEXT;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS e2e_pubkey_athlete TEXT;
    ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS push_subscription JSONB;
    ALTER TABLE coach_licenses ADD COLUMN IF NOT EXISTS push_subscription JSONB;
    CREATE TABLE IF NOT EXISTS coach_call_signals (
      id BIGSERIAL PRIMARY KEY,
      client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
      from_role TEXT NOT NULL,
      signal JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_coach_call_signals_client
      ON coach_call_signals (client_id, id DESC);
  `);
}

export function mountCoachPractice(app, deps) {
  const {
    pool,
    initDb,
    hashPassword,
    verifyPassword,
    issueAccountToken,
    accountFromBearer,
    webDir
  } = deps;

  let vapidReady = false;
  function ensureVapid() {
    if (vapidReady) return true;
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:noreply@nurvan.app";
    if (!pub || !priv) return false;
    try {
      webpush.setVapidDetails(subject, pub, priv);
      vapidReady = true;
      return true;
    } catch (err) {
      console.warn("[WEB_PUSH_VAPID]", err && err.message);
      return false;
    }
  }

  async function sendWebPush(subscription, payload) {
    if (!subscription || !ensureVapid()) return null;
    const sub = typeof subscription === "string" ? JSON.parse(subscription) : subscription;
    if (!sub || !sub.endpoint) return null;
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      return "ok";
    } catch (err) {
      const code = err && err.statusCode;
      if (code === 404 || code === 410) return "gone";
      console.warn("[WEB_PUSH]", code || (err && err.message));
      return "error";
    }
  }

  async function clearAthletePush(clientId) {
    try {
      await pool.query("UPDATE coach_clients SET push_subscription = NULL WHERE id = $1", [clientId]);
    } catch (_) {}
  }

  async function clearCoachPush(userId) {
    try {
      await pool.query("UPDATE coach_licenses SET push_subscription = NULL WHERE user_id = $1", [userId]);
    } catch (_) {}
  }

  async function notifyAthletePush(clientRow, title, body, route, badge) {
    if (!clientRow || !clientRow.push_subscription) return;
    const inviteToken = clientRow.invite_token || "";
    const result = await sendWebPush(clientRow.push_subscription, {
      title: title || "Nurvan",
      body: body || "",
      badge: typeof badge === "number" ? badge : undefined,
      data: {
        path: inviteToken ? `/c/${inviteToken}` : "/",
        inviteToken: inviteToken || undefined,
        route: route || { view: "home" },
        badge: typeof badge === "number" ? badge : undefined
      }
    });
    if (result === "gone") await clearAthletePush(clientRow.id);
  }

  async function notifyCoachPush(coachUserId, title, body, route, badge) {
    if (!coachUserId) return;
    try {
      const q = await pool.query(
        "SELECT push_subscription FROM coach_licenses WHERE user_id = $1 AND status = 'active'",
        [coachUserId]
      );
      const sub = q.rows[0] && q.rows[0].push_subscription;
      if (!sub) return;
      let badgeCount = badge;
      if (typeof badgeCount !== "number") {
        try {
          const uq = await pool.query(
            `SELECT COALESCE(SUM(unread_count),0)::int AS n FROM coach_clients
             WHERE coach_user_id = $1 AND status = 'active'`,
            [coachUserId]
          );
          badgeCount = Number(uq.rows[0]?.n || 0);
        } catch (_) { badgeCount = undefined; }
      }
      const result = await sendWebPush(sub, {
        title: title || "Nurvan",
        body: body || "",
        badge: typeof badgeCount === "number" ? badgeCount : undefined,
        data: {
          path: "/",
          route: route || { view: "coachHub" },
          badge: typeof badgeCount === "number" ? badgeCount : undefined
        }
      });
      if (result === "gone") await clearCoachPush(coachUserId);
    } catch (err) {
      console.warn("[WEB_PUSH_COACH]", err && err.message);
    }
  }

  async function requireUser(req) {
    const auth = await accountFromBearer(req.headers.authorization);
    if (!auth) return null;
    return auth;
  }

  async function requireCoach(req, res) {
    const auth = await requireUser(req);
    if (!auth) {
      res.status(401).json({ error: "Accedi per usare la modalità Coach." });
      return null;
    }
    if (auth.role === "athlete") {
      res.status(403).json({ error: "Account atleta: usa il client." });
      return null;
    }
    await initDb();
    const lic = await pool.query(
      "SELECT user_id, status FROM coach_licenses WHERE user_id = $1 AND status = 'active'",
      [auth.id]
    );
    if (!lic.rows.length) {
      res.status(403).json({ error: "Modalità Coach non sbloccata.", code: "COACH_LOCKED" });
      return null;
    }
    return auth;
  }

  async function requireAthlete(req, res) {
    const auth = await requireUser(req);
    if (!auth || auth.role !== "athlete") {
      res.status(401).json({ error: "Accedi con le credenziali del coach." });
      return null;
    }
    await initDb();
    const row = await pool.query(
      "SELECT * FROM coach_clients WHERE athlete_user_id = $1 AND status = 'active'",
      [auth.id]
    );
    if (!row.rows[0]) {
      res.status(403).json({ error: "Accesso revocato dal coach." });
      return null;
    }
    return { auth, client: row.rows[0] };
  }

  function sanitizeAttachment(raw) {
    if (!raw || typeof raw !== "object") return null;
    const kind = raw.kind === "image" || raw.kind === "file" ? raw.kind : null;
    if (!kind) return null;
    const name = String(raw.name || "allegato").slice(0, 80);
    const mime = String(raw.mime || "").slice(0, 80);
    const e2eData = raw.e2eData ? String(raw.e2eData).slice(0, 1200000) : null;
    if (e2eData && e2eData.indexOf("E2E1:") === 0) {
      return { kind, name, mime, e2eData };
    }
    const dataCandidate =
      (raw.data != null && raw.data !== "" ? String(raw.data) : "") ||
      (e2eData && /^data:/i.test(e2eData) ? e2eData : "");
    if (!/^data:[a-z0-9.+\/\-]+;base64,/i.test(dataCandidate)) return null;
    if (dataCandidate.length > 900000) return null;
    return { kind, name, mime, data: dataCandidate };
  }

  async function currentThread(clientId) {
    const q = await pool.query("SELECT COALESCE(chat_thread, 1) AS t FROM coach_clients WHERE id = $1", [clientId]);
    return Number(q.rows[0]?.t || 1);
  }

  async function insertMessage(clientId, fromRole, body, attachment) {
    const att = sanitizeAttachment(attachment);
    const text = String(body || "").trim().slice(0, 12000);
    if (!text && !att) return null;
    const thread = await currentThread(clientId);
    const ins = await pool.query(
      `INSERT INTO coach_messages(client_id, from_role, body, attachment, thread_id)
       VALUES($1,$2,$3,$4::jsonb,$5)
       RETURNING id, from_role, body, attachment, thread_id, created_at, read_at`,
      [clientId, fromRole, text || "[allegato]", att ? JSON.stringify(att) : null, thread]
    );
    return ins.rows[0];
  }

  async function listMessages(clientId, hiddenRole) {
    const rows = await pool.query(
      `SELECT id, from_role, body, attachment, thread_id, created_at, read_at
       FROM coach_messages
       WHERE client_id = $1
         AND thread_id = (SELECT COALESCE(chat_thread, 1) FROM coach_clients WHERE id = $1)
         AND NOT ($2 = ANY(COALESCE(hidden_for, '{}')))
       ORDER BY created_at DESC LIMIT 120`,
      [clientId, hiddenRole]
    );
    return rows.rows.reverse();
  }

  async function hideThreadFor(clientId, role) {
    const thread = await currentThread(clientId);
    await pool.query(
      `UPDATE coach_messages
       SET hidden_for = CASE
         WHEN $2 = ANY(COALESCE(hidden_for, '{}')) THEN hidden_for
         ELSE array_append(COALESCE(hidden_for, '{}'), $2)
       END
       WHERE client_id = $1 AND thread_id = $3`,
      [clientId, role, thread]
    );
    return thread;
  }

  async function bumpThread(clientId) {
    const q = await pool.query(
      "UPDATE coach_clients SET chat_thread = COALESCE(chat_thread, 1) + 1 WHERE id = $1 RETURNING chat_thread",
      [clientId]
    );
    return Number(q.rows[0]?.chat_thread || 1);
  }

  function detectAssignKinds(patch) {
    const kinds = [];
    const prog = patch && (patch.activeProgram || patch);
    if (prog && Array.isArray(prog.weeks) && prog.weeks.length) kinds.push("training");
    const nutr = patch.nutrition || (prog && prog.nutrition);
    if (nutr && Array.isArray(nutr.days) && nutr.days.length) kinds.push("nutrition");
    const supp = patch.supplementation || (prog && prog.supplementation);
    if (supp && Array.isArray(supp.items) && supp.items.length) kinds.push("supplements");
    const th = patch.therapy || (prog && prog.therapy);
    if (th && Array.isArray(th.medications) && th.medications.length) kinds.push("therapy");
    const ex = patch.exams || (prog && prog.exams);
    if (ex && Array.isArray(ex.records) && ex.records.length) kinds.push("exams");
    return kinds;
  }

  const KIND_EVENTS = {
    training: "program_assigned",
    nutrition: "nutrition_assigned",
    supplements: "supplements_assigned",
    therapy: "therapy_assigned",
    exams: "exams_assigned"
  };

  const indexHtml = path.join(webDir, "index.html");
  app.get("/c/:token", (req, res) => {
    if (!fs.existsSync(indexHtml)) return res.status(404).send("App non disponibile");
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(indexHtml);
  });

  app.get("/api/push/vapid-public-key", (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY || "";
    if (!publicKey) return res.status(503).json({ error: "Web Push non configurato.", configured: false });
    return res.json({ ok: true, publicKey, configured: true });
  });

  app.post("/api/push/subscribe", async (req, res) => {
    const auth = await requireUser(req);
    if (!auth) return res.status(401).json({ error: "Accedi per attivare le notifiche." });
    const subscription = req.body?.subscription;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Subscription mancante." });
    }
    await initDb();
    const payload = JSON.stringify(subscription);
    if (auth.role === "athlete") {
      await pool.query(
        `UPDATE coach_clients SET push_subscription = $2::jsonb
         WHERE athlete_user_id = $1 AND status = 'active'`,
        [auth.id, payload]
      );
    } else {
      await pool.query(
        `UPDATE coach_licenses SET push_subscription = $2::jsonb
         WHERE user_id = $1 AND status = 'active'`,
        [auth.id, payload]
      );
    }
    return res.json({ ok: true });
  });

  app.get("/api/client/invite/:token", async (req, res) => {
    try {
      await initDb();
      const token = String(req.params.token || "").trim();
      const q = await pool.query(
        `SELECT c.display_name, c.username, c.status, c.intake_mode, u.name AS coach_name
         FROM coach_clients c
         JOIN app_users u ON u.id = c.coach_user_id
         WHERE c.invite_token = $1`,
        [token]
      );
      const row = q.rows[0];
      if (!row || row.status !== "active") {
        return res.status(404).json({ error: "Invito non valido o scaduto." });
      }
      return res.json({
        ok: true,
        coachName: row.coach_name || "Coach",
        displayName: row.display_name,
        username: row.username,
        intakeMode: row.intake_mode || "new"
      });
    } catch (err) {
      console.error("INVITE_LOOKUP", err && err.message ? err.message : err);
      return res.status(500).json({ error: "Invito non disponibile." });
    }
  });

  app.post("/api/client/login", async (req, res) => {
    try {
      await initDb();
      const token = String(req.body?.token || "").trim();
      const username = slugName(req.body?.username || req.body?.name);
      const password = String(req.body?.password || "");
      if (!username || password.length < 4) {
        return res.status(400).json({ error: "Inserisci nome utente e password assegnati dal coach." });
      }

      async function userForClient(row) {
        const userRes = await pool.query(
          "SELECT id, email, name, password_hash, provider FROM app_users WHERE id = $1",
          [row.athlete_user_id]
        );
        return userRes.rows[0] || null;
      }

      let client = null;
      let user = null;

      if (token) {
        const q = await pool.query(
          "SELECT * FROM coach_clients WHERE invite_token = $1 AND username = $2 AND status = 'active'",
          [token, username]
        );
        if (q.rows[0]) {
          const u = await userForClient(q.rows[0]);
          if (u && (await verifyPassword(password, u.password_hash))) {
            client = q.rows[0];
            user = u;
          } else if (q.rows[0]) {
            return res.status(401).json({ error: "Nome o password non corretti." });
          }
        }
      }

      // Link vecchio/rigenerato: risolvi per username + password
      if (!client) {
        const q2 = await pool.query(
          "SELECT * FROM coach_clients WHERE username = $1 AND status = 'active' ORDER BY id DESC LIMIT 12",
          [username]
        );
        for (const row of q2.rows) {
          const u = await userForClient(row);
          if (u && (await verifyPassword(password, u.password_hash))) {
            client = row;
            user = u;
            break;
          }
        }
      }

      if (!client || !user) {
        return res.status(401).json({
          error: token
            ? "Accesso non riuscito. Controlla utente/password, oppure chiedi al coach il link invito aggiornato."
            : "Nome o password non corretti."
        });
      }

      const jwtUser = {
        id: user.id,
        email: user.email,
        name: client.display_name,
        provider: "coach_client",
        role: "athlete",
        clientId: String(client.id)
      };
      return res.json({
        token: issueAccountToken(jwtUser),
        user: {
          id: user.id,
          email: user.email,
          name: client.display_name,
          provider: "coach_client",
          role: "athlete",
          clientId: String(client.id)
        },
        client: clientRow(client, { includeIntake: true }),
        inviteToken: client.invite_token
      });
    } catch (err) {
      console.error("CLIENT_LOGIN", err && err.message ? err.message : err);
      return res.status(500).json({ error: "Accesso non riuscito." });
    }
  });

  app.get("/api/client/me", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    try {
      const coach = await pool.query("SELECT name FROM app_users WHERE id = $1", [ctx.client.coach_user_id]);
      const lic = await pool.query(
        "SELECT hide_presence, last_seen_at FROM coach_licenses WHERE user_id = $1",
        [ctx.client.coach_user_id]
      );
      const hide = !!(lic.rows[0] && lic.rows[0].hide_presence);
      const coachLastSeen = hide ? null : (lic.rows[0]?.last_seen_at || null);
      const events = await pool.query(
        "SELECT id, kind, payload, created_at, read_at FROM coach_events WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20",
        [ctx.client.id]
      );
      return res.json({
        ok: true,
        client: clientRow(ctx.client, { includeIntake: true }),
        coachName: coach.rows[0]?.name || "Coach",
        coachOnline: !hide && isOnlineAt(coachLastSeen),
        coachLastSeen,
        coachHidePresence: hide,
        events: events.rows
      });
    } catch (err) {
      return res.status(500).json({ error: "Profilo client non disponibile." });
    }
  });

  app.post("/api/presence/ping", async (req, res) => {
    const auth = await requireUser(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized." });
    await initDb();
    if (auth.role === "athlete") {
      await pool.query(
        "UPDATE coach_clients SET last_seen_at = NOW() WHERE athlete_user_id = $1 AND status = 'active'",
        [auth.id]
      );
      return res.json({ ok: true, role: "athlete" });
    }
    const lic = await pool.query("SELECT hide_presence FROM coach_licenses WHERE user_id = $1 AND status = 'active'", [auth.id]);
    if (!lic.rows.length) return res.json({ ok: true, role: "coach", unlocked: false });
    if (typeof req.body?.hide === "boolean") {
      await pool.query("UPDATE coach_licenses SET hide_presence = $2 WHERE user_id = $1", [auth.id, !!req.body.hide]);
    }
    const fresh = await pool.query("SELECT hide_presence FROM coach_licenses WHERE user_id = $1", [auth.id]);
    const hidden = !!(fresh.rows[0] && fresh.rows[0].hide_presence);
    if (!hidden) {
      await pool.query("UPDATE coach_licenses SET last_seen_at = NOW() WHERE user_id = $1", [auth.id]);
    }
    return res.json({ ok: true, role: "coach", hidePresence: hidden });
  });

  app.post("/api/coach/presence/hide", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const hide = !!req.body?.hide;
    await pool.query(
      `UPDATE coach_licenses SET hide_presence = $2, last_seen_at = CASE WHEN $2 THEN last_seen_at ELSE NOW() END WHERE user_id = $1`,
      [coach.id, hide]
    );
    return res.json({ ok: true, hidePresence: hide });
  });

  app.get("/api/client/messages", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const messages = await listMessages(ctx.client.id, "athlete");
    const thread = await currentThread(ctx.client.id);
    await pool.query(
      `UPDATE coach_messages SET read_at = NOW()
       WHERE client_id = $1 AND thread_id = $2 AND from_role = 'coach' AND read_at IS NULL`,
      [ctx.client.id, thread]
    );
    return res.json({
      ok: true,
      messages,
      threadId: thread,
      e2e: { coach: ctx.client.e2e_pubkey_coach || null, athlete: ctx.client.e2e_pubkey_athlete || null }
    });
  });

  app.post("/api/client/messages", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const message = await insertMessage(ctx.client.id, "athlete", req.body?.body, req.body?.attachment);
    if (!message) return res.status(400).json({ error: "Messaggio vuoto." });
    await pool.query("UPDATE coach_clients SET unread_count = unread_count + 1 WHERE id = $1", [ctx.client.id]);
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'message',$2)",
      [ctx.client.id, JSON.stringify({ from: "athlete", preview: String(message.body || "").slice(0, 80) })]
    );
    notifyCoachPush(
      ctx.client.coach_user_id,
      "Messaggio da " + (ctx.client.display_name || "atleta"),
      String(message.body || "Nuovo messaggio").slice(0, 120),
      { view: "message", clientId: String(ctx.client.id) }
    ).catch(() => {});
    return res.json({ ok: true, message });
  });

  app.post("/api/client/messages/clear", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    await hideThreadFor(ctx.client.id, "athlete");
    return res.json({ ok: true });
  });

  app.post("/api/client/messages/new-thread", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const threadId = await bumpThread(ctx.client.id);
    return res.json({ ok: true, threadId });
  });

  app.post("/api/client/ask-coach", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const domain = String(req.body?.domain || "general").slice(0, 40);
    const note = String(req.body?.note || "").slice(0, 800);
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'ask_coach',$2)",
      [ctx.client.id, JSON.stringify({ domain, note })]
    );
    await pool.query("UPDATE coach_clients SET unread_count = unread_count + 1 WHERE id = $1", [ctx.client.id]);
    return res.json({ ok: true });
  });

  app.post("/api/client/change-request", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const summary = String(req.body?.summary || "modifica programma").slice(0, 200);
    const data = req.body?.data && typeof req.body.data === "object" ? req.body.data : {};
    await pool.query(
      "UPDATE coach_clients SET pending_change = $2, unread_count = unread_count + 1 WHERE id = $1",
      [ctx.client.id, JSON.stringify({ summary, data, at: new Date().toISOString() })]
    );
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'change_request',$2)",
      [ctx.client.id, JSON.stringify({ summary, name: ctx.client.display_name })]
    );
    return res.json({ ok: true, pending: true });
  });

  app.post("/api/client/change-notice", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    if (!ctx.client.allow_max_freedom) {
      return res.status(403).json({ error: "Il coach non ha concesso la massima libertà." });
    }
    const summary = String(req.body?.summary || "modifica programma").slice(0, 200);
    const data = req.body?.data && typeof req.body.data === "object" ? req.body.data : null;
    if (data && ctx.client.athlete_user_id) {
      const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [ctx.client.athlete_user_id]);
      const current = existing.rows[0]?.data || {};
      const merged = {
        ...current,
        nutrition: data.nutrition || current.nutrition,
        supplementation: data.supplementation || current.supplementation,
        therapy: data.therapy || current.therapy,
        exams: data.exams || current.exams,
        lastAthleteEditAt: new Date().toISOString()
      };
      if (Array.isArray(data.weeks)) {
        const prev = current.activeProgram && typeof current.activeProgram === "object" ? current.activeProgram : {};
        merged.activeProgram = {
          ...prev,
          weeks: data.weeks,
          nutrition: data.nutrition,
          supplementation: data.supplementation,
          therapy: data.therapy,
          exams: data.exams
        };
      }
      await pool.query(
        `INSERT INTO app_account_data(user_id, data, updated_at)
         VALUES($1,$2,NOW())
         ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [ctx.client.athlete_user_id, JSON.stringify(merged)]
      );
    }
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'change_notice',$2)",
      [ctx.client.id, JSON.stringify({ summary, name: ctx.client.display_name, freedom: true })]
    );
    await pool.query("UPDATE coach_clients SET unread_count = unread_count + 1 WHERE id = $1", [ctx.client.id]);
    return res.json({ ok: true });
  });

  app.post("/api/client/leave-request", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    if (!ctx.client.paid) {
      return res.status(409).json({ error: "Ci sono pagamenti in sospeso. Regola prima la situazione con il coach." });
    }
    if (ctx.client.leave_requested_at) return res.json({ ok: true, pending: true });
    await pool.query("UPDATE coach_clients SET leave_requested_at = NOW() WHERE id = $1", [ctx.client.id]);
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'leave_request',$2)",
      [ctx.client.id, JSON.stringify({ name: ctx.client.display_name })]
    );
    await pool.query("UPDATE coach_clients SET unread_count = unread_count + 1 WHERE id = $1", [ctx.client.id]);
    return res.json({ ok: true, pending: true });
  });

  app.get("/api/client/inbox", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const events = await pool.query(
      `SELECT id, kind, payload, created_at, read_at, dismissed_for
       FROM coach_events
       WHERE client_id = $1
         AND NOT ('athlete' = ANY(COALESCE(dismissed_for, '{}')))
       ORDER BY id DESC LIMIT 30`,
      [ctx.client.id]
    );
    const unread = await pool.query(
      `SELECT COUNT(*)::int AS n, COALESCE(MAX(id),0)::int AS last_id
       FROM coach_messages
       WHERE client_id = $1
         AND thread_id = (SELECT COALESCE(chat_thread, 1) FROM coach_clients WHERE id = $1)
         AND from_role = 'coach'
         AND read_at IS NULL
         AND NOT ('athlete' = ANY(COALESCE(hidden_for, '{}')))`,
      [ctx.client.id]
    );
    return res.json({
      ok: true,
      events: events.rows,
      unreadMessages: unread.rows[0]?.n || 0,
      lastMessageId: unread.rows[0]?.last_id || 0,
      paid: !!ctx.client.paid,
      leaveRequested: !!ctx.client.leave_requested_at
    });
  });

  app.post("/api/client/inbox/ack", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((n) => Number(n)).filter((n) => n > 0) : [];
    if (!ids.length) return res.json({ ok: true, updated: 0 });
    const result = await pool.query(
      `UPDATE coach_events
       SET read_at = NOW()
       WHERE client_id = $1 AND id = ANY($2::bigint[]) AND read_at IS NULL`,
      [ctx.client.id, ids]
    );
    return res.json({ ok: true, updated: result.rowCount || 0 });
  });

  app.post("/api/client/inbox/dismiss", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((n) => Number(n)).filter((n) => n > 0) : [];
    if (!ids.length) return res.json({ ok: true, updated: 0 });
    const result = await pool.query(
      `UPDATE coach_events
       SET read_at = COALESCE(read_at, NOW()),
           dismissed_for = CASE
             WHEN 'athlete' = ANY(COALESCE(dismissed_for, '{}')) THEN dismissed_for
             ELSE array_append(COALESCE(dismissed_for, '{}'), 'athlete')
           END
       WHERE client_id = $1 AND id = ANY($2::bigint[])`,
      [ctx.client.id, ids]
    );
    return res.json({ ok: true, updated: result.rowCount || 0 });
  });

  app.post("/api/client/password-help", async (req, res) => {
    try {
      await initDb();
      const token = String(req.body?.token || "").trim();
      const username = slugName(req.body?.username || req.body?.name);
      if (!username) return res.status(400).json({ error: "Inserisci nome utente." });
      let client = null;
      if (token) {
        const q = await pool.query(
          "SELECT * FROM coach_clients WHERE invite_token = $1 AND username = $2 AND status = 'active'",
          [token, username]
        );
        client = q.rows[0] || null;
      }
      if (!client) {
        const q2 = await pool.query(
          "SELECT * FROM coach_clients WHERE username = $1 AND status = 'active' ORDER BY id DESC LIMIT 1",
          [username]
        );
        client = q2.rows[0] || null;
      }
      if (!client) return res.status(404).json({ error: "Dati non trovati. Controlla il nome utente (o chiedi al coach il link aggiornato)." });
      await pool.query(
        "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'password_help',$2)",
        [client.id, JSON.stringify({ username })]
      );
      await pool.query("UPDATE coach_clients SET unread_count = unread_count + 1 WHERE id = $1", [client.id]);
      notifyCoachPush(
        client.coach_user_id,
        "Recupero password",
        (client.display_name || username) + " chiede aiuto con la password",
        { view: "message", clientId: String(client.id) }
      ).catch(() => {});
      return res.json({ ok: true });
    } catch (err) {
      console.error("PASSWORD_HELP", err && err.message);
      return res.status(500).json({ error: "Richiesta non inviata." });
    }
  });

  app.post("/api/client/request-program", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'request_program',$2)",
      [ctx.client.id, JSON.stringify({ note: String(req.body?.note || "").slice(0, 500) })]
    );
    await pool.query("UPDATE coach_clients SET unread_count = unread_count + 1 WHERE id = $1", [ctx.client.id]);
    return res.json({ ok: true });
  });

  app.post("/api/client/intake", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const intake = sanitizeIntake(req.body?.intake || req.body);
    const missing = intakeMissing(intake);
    if (missing.length) {
      return res.status(400).json({ error: "Completa tutti i campi obbligatori.", missing });
    }
    const profile = profileFromIntake(intake);
    await pool.query(
      "UPDATE coach_clients SET display_name = $2, intake = $3, intake_completed_at = NOW() WHERE id = $1",
      [ctx.client.id, profile.name || ctx.client.display_name, JSON.stringify(intake)]
    );
    const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [ctx.auth.id]);
    const current = existing.rows[0]?.data || {};
    const merged = {
      ...current,
      profile: { ...(current.profile || {}), ...profile },
      intakeCompletedAt: new Date().toISOString()
    };
    await pool.query(
      `INSERT INTO app_account_data(user_id, data, updated_at)
       VALUES($1,$2,NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [ctx.auth.id, JSON.stringify(merged)]
    );
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'intake_completed',$2)",
      [ctx.client.id, JSON.stringify({ name: profile.name, goal: intake.goal })]
    );
    const fresh = await pool.query("SELECT * FROM coach_clients WHERE id = $1", [ctx.client.id]);
    return res.json({ ok: true, client: clientRow(fresh.rows[0], { includeIntake: true }), profile });
  });

  app.post("/api/client/workout-ping", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    await pool.query(
      "UPDATE coach_clients SET last_workout_at = NOW(), last_seen_at = NOW(), workout_started_at = NULL WHERE id = $1",
      [ctx.client.id]
    );
    // Anchor program expiry on first finalized workout
    const patch = req.body?.data && typeof req.body.data === "object" ? req.body.data : null;
    const logsCount = Array.isArray(patch?.logs) ? patch.logs.length : 0;
    const weeksPlanned = Number(patch?.programWeeksPlanned || patch?.activeProgram?.programWeeksPlanned || 0);
    const anchor = patch?.programExpiryAnchor || patch?.activeProgram?.programExpiryAnchor;
    if ((logsCount === 1 || patch?.anchorExpiryOnFirstWorkout) && anchor !== "first_workout") {
      const weeks = weeksPlanned > 0 ? weeksPlanned : 8;
      const exp = new Date();
      exp.setHours(12, 0, 0, 0);
      exp.setDate(exp.getDate() + weeks * 7);
      await pool.query(
        "UPDATE coach_clients SET program_expires_at = $2 WHERE id = $1 AND (program_expires_at IS NULL OR program_expires_at > NOW() - INTERVAL '1 day')",
        [ctx.client.id, exp.toISOString()]
      );
      // Mark anchor in athlete data so we only do this once
      if (ctx.client.athlete_user_id) {
        const existingA = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [ctx.client.athlete_user_id]);
        const curA = existingA.rows[0]?.data || {};
        const ap = curA.activeProgram && typeof curA.activeProgram === "object" ? { ...curA.activeProgram } : {};
        ap.programExpiryAnchor = "first_workout";
        ap.programWeeksPlanned = weeks;
        await pool.query(
          `INSERT INTO app_account_data(user_id, data, updated_at)
           VALUES($1,$2,NOW())
           ON CONFLICT (user_id) DO UPDATE SET data = app_account_data.data || EXCLUDED.data, updated_at = NOW()`,
          [ctx.client.athlete_user_id, JSON.stringify({ activeProgram: ap, programExpiryAnchor: "first_workout" })]
        );
      }
    }
    // Push workout snapshot so coach sees finalized session immediately
    if (patch && ctx.client.athlete_user_id) {
      const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [ctx.client.athlete_user_id]);
      const current = existing.rows[0]?.data || {};
      const merged = { ...current };
      Object.keys(patch).forEach((k) => {
        if (patch[k] === undefined) return;
        if (k === "logs" && Array.isArray(patch.logs)) {
          // Prefer longer/newer athlete logs
          const curLogs = Array.isArray(current.logs) ? current.logs : [];
          merged.logs = patch.logs.length >= curLogs.length ? patch.logs : curLogs;
          return;
        }
        merged[k] = patch[k];
      });
      merged.lastWorkoutSyncedAt = new Date().toISOString();
      await pool.query(
        `INSERT INTO app_account_data(user_id, data, updated_at)
         VALUES($1,$2,NOW())
         ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [ctx.client.athlete_user_id, JSON.stringify(merged)]
      );
    }
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'workout_done',$2)",
      [ctx.client.id, JSON.stringify({
        at: new Date().toISOString(),
        week: patch && patch.lastLog ? patch.lastLog.week : null,
        day: patch && patch.lastLog ? patch.lastLog.day : null,
        logsCount: Array.isArray(patch && patch.logs) ? patch.logs.length : null
      })]
    );
    return res.json({ ok: true });
  });

  app.post("/api/client/workout-start", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    await pool.query(
      "UPDATE coach_clients SET workout_started_at = NOW(), last_seen_at = NOW() WHERE id = $1",
      [ctx.client.id]
    );
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'workout_started',$2)",
      [ctx.client.id, JSON.stringify({ at: new Date().toISOString() })]
    );
    return res.json({ ok: true });
  });

  app.post("/api/client/workout-live-sync", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const patch = req.body?.data && typeof req.body.data === "object" ? req.body.data : {};
    await pool.query(
      "UPDATE coach_clients SET last_seen_at = NOW() WHERE id = $1",
      [ctx.client.id]
    );
    if (ctx.client.athlete_user_id) {
      const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [ctx.client.athlete_user_id]);
      const current = existing.rows[0]?.data || {};
      const merged = { ...current };
      Object.keys(patch).forEach((k) => {
        if (patch[k] === undefined) return;
        if (k === "logs") return; // live sync must not finalize/replace logs mid-workout
        merged[k] = patch[k];
      });
      merged.liveWorkoutSyncedAt = new Date().toISOString();
      await pool.query(
        `INSERT INTO app_account_data(user_id, data, updated_at)
         VALUES($1,$2,NOW())
         ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [ctx.client.athlete_user_id, JSON.stringify(merged)]
      );
    }
    return res.json({ ok: true, workoutLive: true });
  });

  app.get("/api/coach/status", async (req, res) => {
    const auth = await requireUser(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized." });
    if (auth.role === "athlete") return res.json({ ok: true, unlocked: false, role: "athlete" });
    await initDb();
    const lic = await pool.query("SELECT source, status, unlocked_at, hide_presence, last_seen_at, allow_videocall FROM coach_licenses WHERE user_id = $1", [auth.id]);
    const unlocked = !!(lic.rows[0] && lic.rows[0].status === "active");
    const hide = !!(lic.rows[0] && lic.rows[0].hide_presence);
    if (unlocked && !hide) {
      await pool.query("UPDATE coach_licenses SET last_seen_at = NOW() WHERE user_id = $1", [auth.id]);
    }
    return res.json({
      ok: true,
      unlocked,
      role: "coach",
      license: lic.rows[0] || null,
      hidePresence: hide,
      allowVideocall: lic.rows[0] ? lic.rows[0].allow_videocall !== false : true
    });
  });

  app.get("/api/webrtc/ice", async (_req, res) => {
    try {
      const iceServers = buildWebRtcIceServers(process.env);
      return res.json({ ok: true, iceServers });
    } catch (_) {
      return res.json({
        ok: true,
        iceServers: [
          { urls: ["stun:stun.l.google.com:19302"] },
          { urls: ["stun:stun1.l.google.com:19302"] }
        ]
      });
    }
  });

  app.post("/api/coach/unlock/demo", async (req, res) => {
    const auth = await requireUser(req);
    if (!auth) return res.status(401).json({ error: "Accedi al tuo account Nurvan per sbloccare." });
    if (auth.role === "athlete") return res.status(403).json({ error: "Un atleta non può sbloccare Coach." });
    await initDb();
    await pool.query(
      `INSERT INTO coach_licenses(user_id, source, status, unlocked_at)
       VALUES($1,'demo','active',NOW())
       ON CONFLICT (user_id) DO UPDATE SET source='demo', status='active', unlocked_at=NOW()`,
      [auth.id]
    );
    return res.json({ ok: true, unlocked: true, source: "demo" });
  });

  app.get("/api/coach/clients", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const q = String(req.query.q || "").trim();
    const limit = Math.min(40, Math.max(10, Number(req.query.limit) || 30));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const params = [coach.id, limit, offset];
    let where = "coach_user_id = $1 AND status <> 'removed'";
    if (q) {
      params.push("%" + q.toLowerCase() + "%");
      where += ` AND (LOWER(display_name) LIKE $4 OR username LIKE $4)`;
    }
    const rows = await pool.query(
      `SELECT id, display_name, username, status, paid, billing_cycle, next_due_at, allow_program_db,
              last_workout_at, last_seen_at, workout_started_at, program_expires_at, next_check_at,
              unread_count, invite_token, created_at, intake_mode, intake_completed_at,
              leave_requested_at, chat_thread, allow_max_freedom, allow_nurvan_ai, pending_change
       FROM coach_clients WHERE ${where}
       ORDER BY display_name ASC
       LIMIT $2 OFFSET $3`,
      params
    );
    const count = await pool.query(
      `SELECT COUNT(*)::int AS n FROM coach_clients WHERE ${where.replace("$4", "$2")}`,
      q ? [coach.id, "%" + q.toLowerCase() + "%"] : [coach.id]
    );
    return res.json({
      ok: true,
      clients: rows.rows.map(clientRow),
      total: count.rows[0]?.n || 0,
      origin: publicOrigin(req)
    });
  });

  app.post("/api/coach/clients", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const intakeMode = String(req.body?.intakeMode || req.body?.mode || "new") === "transition" ? "transition" : "new";
    const intake = sanitizeIntake(req.body?.intake || {});
    const firstName = String(req.body?.firstName || intake.firstName || "").trim();
    const lastName = String(req.body?.lastName || intake.lastName || "").trim();
    const displayName = String(req.body?.name || req.body?.displayName || [firstName, lastName].filter(Boolean).join(" ")).trim().slice(0, 80);
    const password = String(req.body?.password || "");
    if (displayName.length < 2 || password.length < 4) {
      return res.status(400).json({ error: "Nome e password (min. 4) sono obbligatori." });
    }
    if (intakeMode === "transition") {
      const filled = sanitizeIntake({ ...intake, firstName: firstName || intake.firstName, lastName: lastName || intake.lastName });
      const missing = intakeMissing(filled);
      if (missing.length) {
        return res.status(400).json({
          error: "In transizione il questionario lo compili tu: mancano dei campi.",
          missing
        });
      }
      Object.assign(intake, filled);
    } else {
      if (firstName) intake.firstName = firstName;
      if (lastName) intake.lastName = lastName;
    }
    let username = slugName(req.body?.username || displayName);
    for (let i = 0; i < 20; i++) {
      const tryName = i === 0 ? username : username + String(i + 1);
      const exists = await pool.query(
        "SELECT 1 FROM coach_clients WHERE coach_user_id = $1 AND username = $2",
        [coach.id, tryName]
      );
      if (!exists.rows.length) { username = tryName; break; }
    }
    const inviteToken = crypto.randomBytes(12).toString("base64url");
    const email = `c.${inviteToken}@client.nurvan.internal`;
    const hash = await hashPassword(password);
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const userIns = await db.query(
        `INSERT INTO app_users(email, name, password_hash, provider)
         VALUES($1,$2,$3,'coach_client') RETURNING id, email, name, provider`,
        [email, displayName, hash]
      );
      const athlete = userIns.rows[0];
      await db.query("INSERT INTO app_account_data(user_id, data) VALUES($1, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING", [athlete.id]);
      const due = new Date(Date.now() + 30 * 86400000).toISOString();
      const completedAt = intakeMode === "transition" ? new Date().toISOString() : null;
      const cli = await db.query(
        `INSERT INTO coach_clients(
           coach_user_id, athlete_user_id, display_name, username, status, paid, next_due_at, invite_token,
           intake_mode, intake, intake_completed_at, invite_password
         ) VALUES($1,$2,$3,$4,'active',TRUE,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [coach.id, athlete.id, displayName, username, due, inviteToken, intakeMode, JSON.stringify(intake), completedAt, password]
      );
      if (intakeMode === "transition") {
        const profile = profileFromIntake(intake);
        await db.query(
          `INSERT INTO app_account_data(user_id, data, updated_at)
           VALUES($1,$2,NOW())
           ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
          [athlete.id, JSON.stringify({ profile, assignedByCoach: true, intakeCompletedAt: completedAt })]
        );
      }
      await db.query("COMMIT");
      const row = cli.rows[0];
      const origin = publicOrigin(req);
      const inviteUrl = `${origin}/c/${inviteToken}`;
      return res.json({
        ok: true,
        client: clientRow(row, { includeIntake: true, includeSecrets: true }),
        inviteUrl,
        inviteCode: String(inviteToken).slice(-6).toUpperCase(),
        inviteText: formatInviteShareText({
          name: displayName,
          inviteUrl,
          inviteCode: String(inviteToken).slice(-6).toUpperCase(),
          username,
          password,
          token: inviteToken
        }),
        credentials: { username, displayName, password }
      });
    } catch (err) {
      await db.query("ROLLBACK");
      console.error("CREATE_CLIENT", err && err.message ? err.message : err);
      return res.status(500).json({ error: "Cliente non creato." });
    } finally {
      db.release();
    }
  });

  async function loadOwnedClient(coach, id, res) {
    const q = await pool.query(
      "SELECT * FROM coach_clients WHERE id = $1 AND coach_user_id = $2 AND status <> 'removed'",
      [id, coach.id]
    );
    if (!q.rows[0]) {
      res.status(404).json({ error: "Cliente non trovato." });
      return null;
    }
    return q.rows[0];
  }

  app.post("/api/coach/clients/:id/revoke", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    await pool.query("UPDATE coach_clients SET status = 'revoked' WHERE id = $1", [row.id]);
    return res.json({ ok: true });
  });

  app.post("/api/coach/clients/:id/remove", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    await pool.query("UPDATE coach_clients SET status = 'removed' WHERE id = $1", [row.id]);
    return res.json({ ok: true });
  });

  app.post("/api/coach/clients/:id/paid", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const paid = !!req.body?.paid;
    const next = paid ? new Date(Date.now() + 30 * 86400000).toISOString() : row.next_due_at;
    await pool.query("UPDATE coach_clients SET paid = $2, next_due_at = $3 WHERE id = $1", [row.id, paid, next]);
    if (!paid) {
      await pool.query(
        "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'payment_due',$2)",
        [row.id, JSON.stringify({ name: row.display_name })]
      );
    }
    return res.json({ ok: true, paid });
  });

  app.post("/api/coach/clients/:id/allow-db", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const on = !!req.body?.allow;
    await pool.query("UPDATE coach_clients SET allow_program_db = $2 WHERE id = $1", [row.id, on]);
    return res.json({ ok: true, allowProgramDb: on });
  });

  app.post("/api/coach/clients/:id/max-freedom", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const on = !!req.body?.allow;
    await pool.query("UPDATE coach_clients SET allow_max_freedom = $2 WHERE id = $1", [row.id, on]);
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'max_freedom',$2)",
      [row.id, JSON.stringify({ allow: on })]
    );
    return res.json({ ok: true, allowMaxFreedom: on });
  });

  app.post("/api/coach/clients/:id/nurvan-ai", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const on = !!req.body?.allow;
    await pool.query("UPDATE coach_clients SET allow_nurvan_ai = $2 WHERE id = $1", [row.id, on]);
    return res.json({ ok: true, allowNurvanAi: on });
  });

  app.post("/api/coach/clients/:id/change-approve", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const pending = row.pending_change || {};
    const data = pending.data && typeof pending.data === "object" ? pending.data : null;
    if (!data) return res.status(400).json({ error: "Nessuna modifica in attesa." });
    if (row.athlete_user_id) {
      const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [row.athlete_user_id]);
      const current = existing.rows[0]?.data || {};
      const prev = current.activeProgram && typeof current.activeProgram === "object" ? current.activeProgram : {};
      const merged = {
        ...current,
        nutrition: data.nutrition || current.nutrition,
        supplementation: data.supplementation || current.supplementation,
        therapy: data.therapy || current.therapy,
        exams: data.exams || current.exams,
        assignedAt: new Date().toISOString(),
        assignedByCoach: true
      };
      if (Array.isArray(data.weeks)) {
        merged.activeProgram = {
          ...prev,
          weeks: data.weeks,
          nutrition: data.nutrition,
          supplementation: data.supplementation,
          therapy: data.therapy,
          exams: data.exams
        };
      }
      await pool.query(
        `INSERT INTO app_account_data(user_id, data, updated_at)
         VALUES($1,$2,NOW())
         ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [row.athlete_user_id, JSON.stringify(merged)]
      );
    }
    await pool.query("UPDATE coach_clients SET pending_change = NULL WHERE id = $1", [row.id]);
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'change_approved',$2)",
      [row.id, JSON.stringify({ summary: pending.summary || "modifica" })]
    );
    return res.json({ ok: true });
  });

  app.post("/api/coach/clients/:id/change-reject", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    await pool.query("UPDATE coach_clients SET pending_change = NULL WHERE id = $1", [row.id]);
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'change_rejected',$2)",
      [row.id, JSON.stringify({ note: String(req.body?.note || "").slice(0, 300) })]
    );
    return res.json({ ok: true });
  });

  app.post("/api/coach/clients/:id/intake", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const intake = sanitizeIntake(req.body?.intake || req.body);
    const missing = intakeMissing(intake);
    if (missing.length) {
      return res.status(400).json({ error: "Questionario incompleto.", missing });
    }
    const profile = profileFromIntake(intake);
    await pool.query(
      "UPDATE coach_clients SET display_name = $2, intake = $3, intake_completed_at = NOW() WHERE id = $1",
      [row.id, profile.name || row.display_name, JSON.stringify(intake)]
    );
    if (row.athlete_user_id) {
      const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [row.athlete_user_id]);
      const current = existing.rows[0]?.data || {};
      const merged = { ...current, profile: { ...(current.profile || {}), ...profile } };
      await pool.query(
        `INSERT INTO app_account_data(user_id, data, updated_at)
         VALUES($1,$2,NOW())
         ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [row.athlete_user_id, JSON.stringify(merged)]
      );
    }
    return res.json({ ok: true, client: { ...clientRow(row, { includeIntake: true }), intake, intakeDone: true, displayName: profile.name } });
  });

  app.post("/api/coach/clients/:id/check-request", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const note = String(req.body?.note || "").slice(0, 400);
    let nextCheckAt = req.body?.nextCheckAt ? new Date(req.body.nextCheckAt) : null;
    if (nextCheckAt && Number.isNaN(nextCheckAt.getTime())) nextCheckAt = null;
    if (nextCheckAt) {
      await pool.query("UPDATE coach_clients SET next_check_at = $2 WHERE id = $1", [row.id, nextCheckAt.toISOString()]);
    }
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'check_request',$2)",
      [row.id, JSON.stringify({ note, nextCheckAt: nextCheckAt ? nextCheckAt.toISOString() : null })]
    );
    notifyAthletePush(
      row,
      "Check richiesto",
      note || "Il coach ha chiesto un check fisico",
      { view: "check_request" }
    ).catch(() => {});
    return res.json({ ok: true, nextCheckAt: nextCheckAt ? nextCheckAt.toISOString() : row.next_check_at });
  });

  app.post("/api/coach/clients/:id/schedule", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const patches = [];
    const vals = [row.id];
    if (req.body?.programExpiresAt !== undefined) {
      vals.push(req.body.programExpiresAt ? new Date(req.body.programExpiresAt).toISOString() : null);
      patches.push(`program_expires_at = $${vals.length}`);
    }
    if (req.body?.nextCheckAt !== undefined) {
      vals.push(req.body.nextCheckAt ? new Date(req.body.nextCheckAt).toISOString() : null);
      patches.push(`next_check_at = $${vals.length}`);
    }
    if (!patches.length) return res.status(400).json({ error: "Nessuna data da aggiornare." });
    await pool.query(`UPDATE coach_clients SET ${patches.join(", ")} WHERE id = $1`, vals);
    const fresh = await pool.query("SELECT * FROM coach_clients WHERE id = $1", [row.id]);
    return res.json({ ok: true, client: clientRow(fresh.rows[0]) });
  });

  app.post("/api/coach/clients/:id/assign", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const patch = req.body?.data && typeof req.body.data === "object" ? req.body.data : {};
    const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [row.athlete_user_id]);
    const current = existing.rows[0]?.data || {};
    const kinds = Array.isArray(req.body?.kinds) && req.body.kinds.length
      ? req.body.kinds.map((k) => String(k)).filter((k) => KIND_EVENTS[k] || k === "exams_request")
      : detectAssignKinds(patch);
    const unique = [...new Set(kinds.length ? kinds : ["training"])];
    const merged = {
      ...current,
      assignedAt: new Date().toISOString(),
      assignedByCoach: true
    };
    const curProg = current.activeProgram && typeof current.activeProgram === "object" ? current.activeProgram : {};
    const patchProg = patch.activeProgram && typeof patch.activeProgram === "object" ? patch.activeProgram : null;
    if (unique.includes("training") && patchProg) {
      merged.activeProgram = { ...curProg, ...patchProg };
    } else if (patchProg) {
      // Domain-only assign: keep existing weeks/title, merge other fields onto activeProgram shell
      merged.activeProgram = {
        ...curProg,
        nutrition: unique.includes("nutrition")
          ? (patch.nutrition || patchProg.nutrition || curProg.nutrition)
          : curProg.nutrition,
        supplementation: unique.includes("supplements")
          ? (patch.supplementation || patchProg.supplementation || curProg.supplementation)
          : curProg.supplementation,
        therapy: unique.includes("therapy")
          ? (patch.therapy || patchProg.therapy || curProg.therapy)
          : curProg.therapy,
        exams: unique.includes("exams")
          ? (patch.exams || patchProg.exams || curProg.exams)
          : curProg.exams
      };
      if (!Array.isArray(merged.activeProgram.weeks) || !merged.activeProgram.weeks.length) {
        if (Array.isArray(curProg.weeks) && curProg.weeks.length) merged.activeProgram.weeks = curProg.weeks;
      }
    } else if (curProg && Object.keys(curProg).length) {
      merged.activeProgram = curProg;
    }
    if (unique.includes("nutrition") && patch.nutrition) merged.nutrition = patch.nutrition;
    if (unique.includes("supplements") && patch.supplementation) merged.supplementation = patch.supplementation;
    if (unique.includes("therapy") && patch.therapy) merged.therapy = patch.therapy;
    if (unique.includes("exams") && patch.exams) merged.exams = patch.exams;
    await pool.query(
      `INSERT INTO app_account_data(user_id, data, updated_at)
       VALUES($1,$2,NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [row.athlete_user_id, JSON.stringify(merged)]
    );
    const scheduleBits = [];
    const scheduleVals = [row.id];
    if (req.body?.programExpiresAt) {
      scheduleVals.push(new Date(req.body.programExpiresAt).toISOString());
      scheduleBits.push(`program_expires_at = $${scheduleVals.length}`);
    }
    if (req.body?.nextCheckAt) {
      scheduleVals.push(new Date(req.body.nextCheckAt).toISOString());
      scheduleBits.push(`next_check_at = $${scheduleVals.length}`);
    }
    if (scheduleBits.length) {
      await pool.query(`UPDATE coach_clients SET ${scheduleBits.join(", ")} WHERE id = $1`, scheduleVals);
    }
    for (const kind of unique) {
      const eventKind = KIND_EVENTS[kind] || (kind === "exams_request" ? "exams_request" : "program_assigned");
      await pool.query(
        "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,$2,$3)",
        [row.id, eventKind, JSON.stringify({ at: merged.assignedAt, kind })]
      );
    }
    const assignLabel = unique.includes("training")
      ? "Scheda assegnata"
      : unique.includes("nutrition")
        ? "Alimentazione assegnata"
        : "Aggiornamento dal coach";
    notifyAthletePush(
      row,
      assignLabel,
      "Il coach ti ha inviato un aggiornamento",
      { view: unique.includes("training") ? "program_assigned" : (unique[0] || "home") }
    ).catch(() => {});
    return res.json({ ok: true, kinds: unique });
  });

  app.post("/api/coach/clients/:id/patch-data", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const patch = req.body?.data && typeof req.body.data === "object" ? req.body.data : {};
    const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [row.athlete_user_id]);
    const current = existing.rows[0]?.data || {};
    const merged = { ...current };
    const CLEARABLE = new Set(["nutrition", "supplementation", "therapy", "exams"]);
    const emptyCleared = (k) => {
      const at = new Date().toISOString();
      if (k === "nutrition") {
        return {
          plan_name: "",
          present: false,
          days: [],
          daily_calories_target: null,
          daily_protein_target: null,
          daily_carbs_target: null,
          daily_fats_target: null,
          cleared: true,
          clearedAt: at
        };
      }
      if (k === "supplementation") return { protocol_name: "", items: [], present: false, cleared: true, clearedAt: at };
      if (k === "therapy") return { present: false, medications: [], protocols: [], entries: [], cleared: true, clearedAt: at };
      if (k === "exams") return { patient_name: "", records: [], present: false, reminders: [], cleared: true, clearedAt: at };
      return { present: false, cleared: true, clearedAt: at };
    };
    const isCleared = (obj, kind) => {
      if (obj == null) return true;
      if (typeof obj !== "object") return false;
      if (obj.cleared === true) return true;
      if (obj.present === false) {
        if (kind === "nutrition") return !(Array.isArray(obj.days) && obj.days.length);
        if (kind === "supplementation") return !(Array.isArray(obj.items) && obj.items.length);
        if (kind === "therapy") {
          return !(Array.isArray(obj.medications) && obj.medications.length) &&
            !(Array.isArray(obj.entries) && obj.entries.length);
        }
        if (kind === "exams") return !(Array.isArray(obj.records) && obj.records.length);
      }
      return false;
    };
    const applyDomainToProgram = (key, value) => {
      if (!merged.activeProgram || typeof merged.activeProgram !== "object") return;
      merged.activeProgram = { ...merged.activeProgram, [key]: value };
    };
    Object.keys(patch).forEach((k) => {
      if (patch[k] === undefined) return;
      // Explicit null clears for domain payloads (CANCELLA toolbar)
      if (patch[k] === null && CLEARABLE.has(k)) {
        merged[k] = emptyCleared(k);
        applyDomainToProgram(k, merged[k]);
        return;
      }
      if (patch[k] === null) return;
      // Never wipe athlete workout history with empty coach-side logs
      if (k === "logs") {
        const next = Array.isArray(patch.logs) ? patch.logs : null;
        const cur = Array.isArray(current.logs) ? current.logs : [];
        if (!next || !next.length) return;
        merged.logs = next.length >= cur.length ? next : cur;
        return;
      }
      if (k === "activeProgram" && patch.activeProgram && typeof patch.activeProgram === "object") {
        const curProg = current.activeProgram && typeof current.activeProgram === "object" ? current.activeProgram : {};
        merged.activeProgram = { ...curProg, ...patch.activeProgram };
        const forceClearWeeks = !!(patch.activeProgram.clearedTraining || patch.activeProgram.__clearedWeeks);
        if (forceClearWeeks) {
          merged.activeProgram.weeks = [];
          if (patch.activeProgram.title != null) merged.activeProgram.title = patch.activeProgram.title;
        } else if ((!Array.isArray(merged.activeProgram.weeks) || !merged.activeProgram.weeks.length) && Array.isArray(curProg.weeks)) {
          merged.activeProgram.weeks = curProg.weeks;
        }
        return;
      }
      merged[k] = patch[k];
    });
    if (Object.prototype.hasOwnProperty.call(patch, "nutrition")) {
      merged.nutrition = isCleared(patch.nutrition, "nutrition")
        ? (patch.nutrition && typeof patch.nutrition === "object" ? patch.nutrition : emptyCleared("nutrition"))
        : patch.nutrition;
      applyDomainToProgram("nutrition", merged.nutrition);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "supplementation")) {
      merged.supplementation = isCleared(patch.supplementation, "supplementation")
        ? (patch.supplementation && typeof patch.supplementation === "object" ? patch.supplementation : emptyCleared("supplementation"))
        : patch.supplementation;
      applyDomainToProgram("supplementation", merged.supplementation);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "therapy")) {
      merged.therapy = isCleared(patch.therapy, "therapy")
        ? (patch.therapy && typeof patch.therapy === "object" ? patch.therapy : emptyCleared("therapy"))
        : patch.therapy;
      applyDomainToProgram("therapy", merged.therapy);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "exams")) {
      merged.exams = isCleared(patch.exams, "exams")
        ? (patch.exams && typeof patch.exams === "object" ? patch.exams : emptyCleared("exams"))
        : patch.exams;
      applyDomainToProgram("exams", merged.exams);
    }
    merged.coachPatchedAt = new Date().toISOString();
    merged.assignedByCoach = true;
    await pool.query(
      `INSERT INTO app_account_data(user_id, data, updated_at)
       VALUES($1,$2,NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [row.athlete_user_id, JSON.stringify(merged)]
    );
    if (req.body?.notify !== false) {
      await pool.query(
        "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'coach_modified',$2)",
        [row.id, JSON.stringify({ at: merged.coachPatchedAt, summary: String(req.body?.summary || "Il coach ha aggiornato il tuo piano").slice(0, 200) })]
      );
    }
    return res.json({ ok: true });
  });

  app.get("/api/coach/clients/:id/snapshot", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const data = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [row.athlete_user_id]);
    const origin = publicOrigin(req);
    const inviteUrl = `${origin}/c/${row.invite_token}`;
    const inviteCode = String(row.invite_token || "").slice(-6).toUpperCase();
    return res.json({
      ok: true,
      client: clientRow(row, { includeIntake: true, includeSecrets: true }),
      inviteUrl,
      inviteCode,
      inviteText: formatInviteShareText({
        name: row.display_name,
        inviteUrl,
        inviteCode,
        username: row.username,
        password: row.invite_password || "(reimposta dal coach)",
        token: row.invite_token
      }),
      credentials: { username: row.username, password: row.invite_password || "" },
      intake: row.intake || {},
      data: data.rows[0]?.data || {},
      pendingChange: row.pending_change ? { summary: row.pending_change.summary || "modifica", at: row.pending_change.at } : null
    });
  });

  app.get("/api/coach/clients/:id/messages", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const messages = await listMessages(row.id, "coach");
    const thread = await currentThread(row.id);
    await pool.query(
      `UPDATE coach_messages SET read_at = NOW()
       WHERE client_id = $1 AND thread_id = $2 AND from_role = 'athlete' AND read_at IS NULL`,
      [row.id, thread]
    );
    await pool.query("UPDATE coach_clients SET unread_count = 0 WHERE id = $1", [row.id]);
    return res.json({
      ok: true,
      messages,
      threadId: thread,
      e2e: { coach: row.e2e_pubkey_coach || null, athlete: row.e2e_pubkey_athlete || null }
    });
  });

  app.post("/api/coach/clients/:id/messages", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const message = await insertMessage(row.id, "coach", req.body?.body, req.body?.attachment);
    if (!message) return res.status(400).json({ error: "Messaggio vuoto." });
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'message',$2)",
      [row.id, JSON.stringify({ from: "coach", preview: String(message.body || "").slice(0, 80) })]
    );
    notifyAthletePush(
      row,
      "Messaggio dal coach",
      String(message.body || "Nuovo messaggio").slice(0, 120),
      { view: "clientChat" }
    ).catch(() => {});
    return res.json({ ok: true, message });
  });

  app.post("/api/coach/clients/:id/messages/clear", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    await hideThreadFor(row.id, "coach");
    return res.json({ ok: true });
  });

  app.post("/api/coach/clients/:id/messages/new-thread", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const threadId = await bumpThread(row.id);
    return res.json({ ok: true, threadId });
  });

  app.post("/api/coach/clients/:id/request-exams", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const examsRaw = Array.isArray(req.body?.exams) ? req.body.exams : [];
    const exams = examsRaw.slice(0, 80).map((e) => ({
      id: String(e?.id || "").slice(0, 60),
      name: String(e?.name || e?.id || "").slice(0, 120)
    })).filter((e) => e.id || e.name);
    const dueAt = req.body?.dueAt ? String(req.body.dueAt).slice(0, 10) : null;
    const note = String(req.body?.note || "").slice(0, 400);
    const requestPayload = {
      id: "exreq_" + Date.now(),
      at: new Date().toISOString(),
      note,
      dueAt,
      exams
    };
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'exams_request',$2)",
      [row.id, JSON.stringify(requestPayload)]
    );
    if (row.athlete_user_id) {
      const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [row.athlete_user_id]);
      const current = existing.rows[0]?.data || {};
      const examsBlock = current.exams && typeof current.exams === "object" ? { ...current.exams } : { records: [], present: false, reminders: [] };
      if (!Array.isArray(examsBlock.records)) examsBlock.records = [];
      if (!Array.isArray(examsBlock.reminders)) examsBlock.reminders = [];
      const hist = Array.isArray(examsBlock.coachRequests) ? examsBlock.coachRequests.slice(0, 9) : [];
      hist.unshift(requestPayload);
      examsBlock.coachRequest = requestPayload;
      examsBlock.coachRequests = hist;
      examsBlock.present = true;
      const merged = { ...current, exams: examsBlock };
      await pool.query(
        `INSERT INTO app_account_data(user_id, data, updated_at)
         VALUES($1,$2,NOW())
         ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [row.athlete_user_id, JSON.stringify(merged)]
      );
    }
    notifyAthletePush(
      row,
      "Richiesta esami",
      (exams.length ? exams.length + " esami" : "Nuova richiesta") + (dueAt ? " · entro " + dueAt : ""),
      { view: "exams_request" }
    ).catch(() => {});
    return res.json({ ok: true, count: exams.length, request: requestPayload });
  });

  app.post("/api/coach/videocall", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const allow = !!req.body?.allow;
    await pool.query("UPDATE coach_licenses SET allow_videocall = $2 WHERE user_id = $1", [coach.id, allow]);
    return res.json({ ok: true, allowVideocall: allow });
  });

  app.post("/api/coach/clients/:id/e2e-key", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const publicKey = String(req.body?.publicKey || "").slice(0, 4000);
    if (!publicKey) return res.status(400).json({ error: "Chiave mancante." });
    await pool.query("UPDATE coach_clients SET e2e_pubkey_coach = $2 WHERE id = $1", [row.id, publicKey]);
    return res.json({ ok: true });
  });

  app.get("/api/coach/clients/:id/e2e-keys", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    return res.json({ ok: true, e2e: { coach: row.e2e_pubkey_coach || null, athlete: row.e2e_pubkey_athlete || null } });
  });

  app.post("/api/client/e2e-key", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const publicKey = String(req.body?.publicKey || "").slice(0, 4000);
    if (!publicKey) return res.status(400).json({ error: "Chiave mancante." });
    await pool.query("UPDATE coach_clients SET e2e_pubkey_athlete = $2 WHERE id = $1", [ctx.client.id, publicKey]);
    return res.json({ ok: true });
  });

  app.get("/api/client/e2e-keys", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    return res.json({
      ok: true,
      e2e: { coach: ctx.client.e2e_pubkey_coach || null, athlete: ctx.client.e2e_pubkey_athlete || null },
      allowVideocall: true
    });
  });

  async function insertCallSignal(clientId, fromRole, signal) {
    if (!signal || typeof signal !== "object") return null;
    const ins = await pool.query(
      `INSERT INTO coach_call_signals(client_id, from_role, signal)
       VALUES($1,$2,$3::jsonb) RETURNING id, from_role, signal, created_at`,
      [clientId, fromRole, JSON.stringify(signal)]
    );
    return ins.rows[0];
  }

  async function listCallSignals(clientId, afterId) {
    const rows = await pool.query(
      `SELECT id, from_role, signal, created_at FROM coach_call_signals
       WHERE client_id = $1 AND id > $2 ORDER BY id ASC LIMIT 40`,
      [clientId, Number(afterId) || 0]
    );
    return rows.rows;
  }

  app.post("/api/coach/clients/:id/call/signal", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const lic = await pool.query("SELECT allow_videocall FROM coach_licenses WHERE user_id = $1", [coach.id]);
    if (lic.rows[0] && lic.rows[0].allow_videocall === false) {
      return res.status(403).json({ error: "Videocall disabilitate." });
    }
    const sig = await insertCallSignal(row.id, "coach", req.body?.signal);
    if (!sig) return res.status(400).json({ error: "Signal non valido." });
    return res.json({ ok: true, id: sig.id });
  });

  app.get("/api/coach/clients/:id/call/signals", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const signals = await listCallSignals(row.id, req.query.after);
    return res.json({ ok: true, signals });
  });

  app.post("/api/client/call/signal", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const lic = await pool.query(
      "SELECT allow_videocall FROM coach_licenses WHERE user_id = $1",
      [ctx.client.coach_user_id]
    );
    if (lic.rows[0] && lic.rows[0].allow_videocall === false) {
      return res.status(403).json({ error: "Il coach ha disabilitato le videocall." });
    }
    const sig = await insertCallSignal(ctx.client.id, "athlete", req.body?.signal);
    if (!sig) return res.status(400).json({ error: "Signal non valido." });
    return res.json({ ok: true, id: sig.id });
  });

  app.get("/api/client/call/signals", async (req, res) => {
    const ctx = await requireAthlete(req, res);
    if (!ctx) return;
    const signals = await listCallSignals(ctx.client.id, req.query.after);
    return res.json({ ok: true, signals });
  });

  app.post("/api/coach/clients/:id/reset-password", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const password = String(req.body?.password || "");
    if (password.length < 4) return res.status(400).json({ error: "Password minimo 4 caratteri." });
    const hash = await hashPassword(password);
    if (row.athlete_user_id) {
      await pool.query("UPDATE app_users SET password_hash = $2, updated_at = NOW() WHERE id = $1", [row.athlete_user_id, hash]);
    }
    await pool.query("UPDATE coach_clients SET invite_password = $2 WHERE id = $1", [row.id, password]);
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'password_reset',$2)",
      [row.id, JSON.stringify({ username: row.username })]
    );
    return res.json({ ok: true, credentials: { username: row.username, password } });
  });

  app.post("/api/coach/clients/:id/rotate-invite", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const inviteToken = crypto.randomBytes(12).toString("base64url");
    const email = `c.${inviteToken}@client.nurvan.internal`;
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      await db.query("UPDATE coach_clients SET invite_token = $2 WHERE id = $1", [row.id, inviteToken]);
      if (row.athlete_user_id) {
        await db.query("UPDATE app_users SET email = $2, updated_at = NOW() WHERE id = $1", [row.athlete_user_id, email]);
      }
      await db.query("COMMIT");
    } catch (err) {
      try { await db.query("ROLLBACK"); } catch (_) {}
      return res.status(500).json({ error: "Impossibile rigenerare il link." });
    } finally {
      db.release();
    }
    const origin = publicOrigin(req);
    const inviteUrl = `${origin}/c/${inviteToken}`;
    const code = String(inviteToken).slice(-6).toUpperCase();
    return res.json({
      ok: true,
      inviteToken,
      inviteUrl,
      inviteCode: code,
      inviteText: formatInviteShareText({
        name: row.display_name,
        inviteUrl,
        inviteCode: code,
        username: row.username,
        password: row.invite_password || "(reimposta dal coach)",
        token: inviteToken
      }),
      credentials: { username: row.username, password: row.invite_password || "" }
    });
  });

  app.post("/api/coach/clients/:id/leave-confirm", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    if (!row.leave_requested_at) return res.status(400).json({ error: "Nessuna richiesta di fine collaborazione." });
    await pool.query("UPDATE coach_clients SET status = 'revoked', leave_requested_at = NULL WHERE id = $1", [row.id]);
    await pool.query(
      "INSERT INTO coach_events(client_id, kind, payload) VALUES($1,'leave_confirmed',$2)",
      [row.id, JSON.stringify({ name: row.display_name })]
    );
    return res.json({ ok: true });
  });

  app.get("/api/coach/inbox", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const clients = await pool.query(
      `SELECT id, display_name, unread_count, leave_requested_at, pending_change
       FROM coach_clients
       WHERE coach_user_id = $1 AND status = 'active'
         AND (unread_count > 0 OR leave_requested_at IS NOT NULL OR pending_change IS NOT NULL)
       ORDER BY unread_count DESC, display_name ASC
       LIMIT 40`,
      [coach.id]
    );
    const events = await pool.query(
      `SELECT e.id, e.kind, e.client_id, e.created_at, e.payload, e.read_at, c.display_name
       FROM coach_events e
       JOIN coach_clients c ON c.id = e.client_id
       WHERE c.coach_user_id = $1
         AND e.read_at IS NULL
         AND NOT ('coach' = ANY(COALESCE(e.dismissed_for, '{}')))
       ORDER BY e.id DESC LIMIT 20`,
      [coach.id]
    );
    return res.json({
      ok: true,
      clients: clients.rows.map((r) => ({
        id: String(r.id),
        displayName: r.display_name,
        unreadCount: Number(r.unread_count || 0),
        leaveRequested: !!r.leave_requested_at,
        hasPendingChange: !!r.pending_change
      })),
      events: events.rows.map((r) => {
        let payload = r.payload;
        if (typeof payload === "string") {
          try { payload = JSON.parse(payload); } catch (_) { payload = {}; }
        }
        return {
          id: r.id,
          kind: r.kind,
          client_id: r.client_id,
          created_at: r.created_at,
          display_name: r.display_name,
          payload: payload && typeof payload === "object" ? payload : {}
        };
      })
    });
  });

  app.post("/api/coach/inbox/ack", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((n) => Number(n)).filter((n) => n > 0) : [];
    if (!ids.length) return res.json({ ok: true, updated: 0 });
    const result = await pool.query(
      `UPDATE coach_events e
       SET read_at = NOW()
       FROM coach_clients c
       WHERE e.client_id = c.id AND c.coach_user_id = $1 AND e.id = ANY($2::bigint[]) AND e.read_at IS NULL`,
      [coach.id, ids]
    );
    return res.json({ ok: true, updated: result.rowCount || 0 });
  });

  app.post("/api/coach/inbox/dismiss", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((n) => Number(n)).filter((n) => n > 0) : [];
    if (!ids.length) return res.json({ ok: true, updated: 0 });
    const result = await pool.query(
      `UPDATE coach_events e
       SET read_at = COALESCE(e.read_at, NOW()),
           dismissed_for = CASE
             WHEN 'coach' = ANY(COALESCE(e.dismissed_for, '{}')) THEN e.dismissed_for
             ELSE array_append(COALESCE(e.dismissed_for, '{}'), 'coach')
           END
       FROM coach_clients c
       WHERE e.client_id = c.id AND c.coach_user_id = $1 AND e.id = ANY($2::bigint[])`,
      [coach.id, ids]
    );
    return res.json({ ok: true, updated: result.rowCount || 0 });
  });

  app.get("/api/coach/clients/:id/events", async (req, res) => {
    const coach = await requireCoach(req, res);
    if (!coach) return;
    const row = await loadOwnedClient(coach, req.params.id, res);
    if (!row) return;
    const ev = await pool.query(
      `SELECT id, kind, payload, created_at, read_at
       FROM coach_events
       WHERE client_id = $1
         AND NOT ('coach' = ANY(COALESCE(dismissed_for, '{}')))
       ORDER BY created_at DESC LIMIT 40`,
      [row.id]
    );
    return res.json({ ok: true, events: ev.rows });
  });
}
