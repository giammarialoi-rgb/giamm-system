// Sharing a program with a code.
//
// Whoever has a program - written, generated or in use - asks for a code
// (POST /api/programs/share) and gives it to a friend; the friend types it in
// their own account (GET /api/programs/shared/<code>) and gets a copy in
// their library, to activate when they want. What travels is the program
// alone: no loads, no logs, no personal maxes, no food, therapy or exams.
//
// Sending is open to every account. Receiving needs a paid plan
// (program_share_receive in web/features.json), checked here on the server
// with the same module the app uses.
import crypto from "node:crypto";
import { Entitlements, accountEntitlement } from "../account/plans.mjs";

export const SHARE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SHARE_MAX_BYTES = 3 * 1024 * 1024;
export const SHARE_MAX_PER_USER = 60;
// No 0/O, 1/I/L: a code is read aloud and typed on a phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function httpError(statusCode, message, extra) {
  return Object.assign(new Error(message), { statusCode, extra });
}
export function newShareCode() {
  let out = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
// "nv-7k3m 9qxd" -> "7K3M9QXD"
export function normalizeShareCode(code) {
  // The NV in front is decoration, and a code can itself begin with NV: it is
  // taken off only when it is there on top of the eight characters.
  const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.length === 10 && clean.startsWith("NV") ? clean.slice(2) : clean;
}
export function formatShareCode(code) {
  const c = normalizeShareCode(code);
  return "NV-" + c.slice(0, 4) + "-" + c.slice(4);
}

// The program as it may leave an account: the weeks and what describes them.
export function shareableProgram(input) {
  if (!input || typeof input !== "object" || !Array.isArray(input.weeks) || !input.weeks.length) {
    throw httpError(400, "Programma non valido.");
  }
  const prog = JSON.parse(JSON.stringify(input));
  for (const k of ["nutrition", "supplementation", "therapy", "exams", "space", "exerciseDb", "exerciseAliases", "assignedByCoach", "client", "athlete", "coach_notes", "meta"]) delete prog[k];
  if (prog.progression && typeof prog.progression === "object") delete prog.progression.maxes;
  const sessions = prog.weeks.reduce((n, w) => n + ((w && (w.sessions || w.days)) || []).length, 0);
  if (!sessions) throw httpError(400, "Il programma non ha sedute.");
  prog.title = String(prog.title || prog.name || "Programma").slice(0, 120);
  return prog;
}

export async function createShare(pool, userId, input, { kind = "", now = Date.now() } = {}) {
  const prog = shareableProgram(input);
  const json = JSON.stringify(prog);
  if (Buffer.byteLength(json) > SHARE_MAX_BYTES) throw httpError(413, "Programma troppo grande per essere condiviso.");
  const hash = crypto.createHash("sha256").update(json).digest("hex");
  const until = new Date(now + SHARE_TTL_MS).toISOString();
  // The same program shared again keeps its code: the one already given out
  // goes on working, with its time renewed.
  const same = (await pool.query("SELECT code FROM program_shares WHERE owner_user_id = $1 AND content_hash = $2", [userId, hash])).rows[0];
  if (same) {
    await pool.query("UPDATE program_shares SET expires_at = $2 WHERE code = $1", [same.code, until]);
    return { code: same.code, title: prog.title, expiresAt: until };
  }
  const count = Number((await pool.query("SELECT COUNT(*)::int AS n FROM program_shares WHERE owner_user_id = $1 AND expires_at > $2", [userId, new Date(now).toISOString()])).rows[0].n) || 0;
  if (count >= SHARE_MAX_PER_USER) throw httpError(429, "Hai troppi programmi condivisi attivi. Riprova tra qualche giorno.");
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newShareCode();
    const r = await pool.query(
      `INSERT INTO program_shares(code, owner_user_id, title, kind, program, content_hash, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8) ON CONFLICT (code) DO NOTHING RETURNING code`,
      [code, userId, prog.title, String(kind || "").slice(0, 40), json, hash, new Date(now).toISOString(), until]
    );
    if (r.rows.length) return { code, title: prog.title, expiresAt: until };
  }
  throw httpError(500, "Codice non generato. Riprova.");
}

export async function readShare(pool, code, now = Date.now()) {
  const c = normalizeShareCode(code);
  if (c.length !== 8) throw httpError(400, "Il codice ha 8 caratteri, dopo NV.");
  const row = (await pool.query("SELECT code, owner_user_id, title, kind, program, expires_at FROM program_shares WHERE code = $1", [c])).rows[0];
  if (!row) throw httpError(404, "Codice non trovato. Controlla di averlo scritto giusto.");
  if (new Date(row.expires_at).getTime() < now) throw httpError(410, "Questo codice è scaduto: chiedi a chi te l’ha dato di condividerlo di nuovo.");
  await pool.query("UPDATE program_shares SET uses = uses + 1, last_used_at = $2 WHERE code = $1", [c, new Date(now).toISOString()]);
  return { code: row.code, ownerId: row.owner_user_id, title: row.title, kind: row.kind, program: typeof row.program === "string" ? JSON.parse(row.program) : row.program };
}

export function mountProgramShare(app, { pool, initDb, accountFromBearer, entitlementOf = accountEntitlement }) {
  // Per account, in memory: a code is not something to try a thousand of.
  const hits = new Map();
  const tooMany = (key, max, windowMs = 3600000) => {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 20000) hits.clear();
    return recent.length > max;
  };
  const fail = (res, err, tag) => {
    if (!err.statusCode) console.error(tag, err);
    return res.status(err.statusCode || 500).json(Object.assign({ error: err.statusCode ? err.message : "Operazione non riuscita. Riprova." }, err.extra || {}));
  };

  app.post("/api/programs/share", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const auth = await accountFromBearer(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Accedi per condividere un programma." });
    try {
      if (tooMany("c:" + auth.id, 30)) throw httpError(429, "Troppe condivisioni in poco tempo. Riprova più tardi.");
      await initDb();
      const out = await createShare(pool, auth.id, req.body && req.body.program, { kind: req.body && req.body.kind });
      return res.json({ ok: true, code: formatShareCode(out.code), title: out.title, expiresAt: out.expiresAt });
    } catch (err) { return fail(res, err, "PROGRAM_SHARE_CREATE"); }
  });

  app.get("/api/programs/shared/:code", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const auth = await accountFromBearer(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Accedi per caricare un programma condiviso." });
    try {
      if (tooMany("r:" + auth.id, 40)) throw httpError(429, "Troppi tentativi. Riprova più tardi.");
      await initDb();
      const account = await entitlementOf(pool, auth);
      const why = Entitlements.explain(account, "program_share_receive");
      if (!why.allowed) throw httpError(403, "Ricevere un programma condiviso è disponibile con il piano " + Entitlements.planName(why.minPlan) + ".", { needPlan: why.minPlan });
      const share = await readShare(pool, req.params.code);
      return res.json({ ok: true, code: formatShareCode(share.code), title: share.title, kind: share.kind, own: String(share.ownerId) === String(auth.id), program: share.program });
    } catch (err) { return fail(res, err, "PROGRAM_SHARE_READ"); }
  });
}
