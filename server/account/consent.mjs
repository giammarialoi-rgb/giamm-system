// Consents given in the app: the privacy notice and terms in force, the age
// confirmation, the explicit consent to health data (GDPR art. 9) and the
// separate, revocable consent to send data to the AI provider.
//
// The version in force is web/features.json "legal.version", the same file
// the pages read: changing it asks every account again. One row per account
// (the app_users columns of migration 0019), latest wins.

import fs from "node:fs";

export function loadLegal(featuresPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(featuresPath, "utf8"));
    const legal = parsed && parsed.legal && typeof parsed.legal === "object" ? parsed.legal : {};
    return { version: String(legal.version || ""), minAge: Number(legal.minAge) || 16 };
  } catch (_) {
    return { version: "", minAge: 16 };
  }
}

// What a sign-up or the consent sheet sent: all three boxes, for the version
// in force. Anything else is not a consent.
export function validMainConsent(input, version) {
  if (!input || typeof input !== "object") return false;
  return Boolean(version)
    && String(input.version || "") === version
    && input.age === true
    && input.terms === true
    && input.health === true;
}

// Given, and not withdrawn since.
export function aiConsentActive(row) {
  if (!row || !row.ai_consent_at) return false;
  if (!row.ai_consent_withdrawn_at) return true;
  return new Date(row.ai_consent_withdrawn_at).getTime() < new Date(row.ai_consent_at).getTime();
}

// Withdrawn and not given again: the only state the server refuses AI for.
// An account that never answered is left to the app, which asks before the
// first use (older installs never ask, and must not lose the feature).
export function aiConsentWithdrawn(row) {
  return Boolean(row && row.ai_consent_withdrawn_at) && !aiConsentActive(row);
}

export function consentState(row, version) {
  const accepted = row && row.consent_version ? String(row.consent_version) : null;
  return {
    version,
    accepted,
    acceptedAt: row && row.consent_at ? row.consent_at : null,
    ok: Boolean(version) && accepted === version && Boolean(row && row.age_confirmed_at) && Boolean(row && row.health_consent_at),
    ai: {
      granted: aiConsentActive(row),
      at: row && row.ai_consent_at ? row.ai_consent_at : null,
      withdrawnAt: row && row.ai_consent_withdrawn_at ? row.ai_consent_withdrawn_at : null
    }
  };
}

const CONSENT_COLUMNS = "consent_version, consent_at, age_confirmed_at, health_consent_at, ai_consent_at, ai_consent_withdrawn_at";

export async function readConsentRow(pool, userId) {
  const res = await pool.query("SELECT " + CONSENT_COLUMNS + " FROM app_users WHERE id = $1", [userId]);
  return res.rows[0] || null;
}

// Stores the main consent at sign-up, inside the sign-up transaction.
export async function recordMainConsent(db, userId, version) {
  await db.query(
    "UPDATE app_users SET consent_version = $2, consent_at = NOW(), age_confirmed_at = NOW(), health_consent_at = NOW() WHERE id = $1",
    [userId, version]
  );
}

export function mountConsentRoutes(app, { pool, initDb, accountFromBearer, featuresPath }) {
  const legal = () => loadLegal(featuresPath);

  app.get("/api/account/consent", async (req, res) => {
    const auth = await accountFromBearer(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Sessione scaduta o non autorizzata." });
    try {
      if (initDb) await initDb();
      const row = await readConsentRow(pool, auth.id);
      if (!row) return res.status(401).json({ error: "Account non trovato." });
      return res.json({ ok: true, consent: consentState(row, legal().version) });
    } catch (err) {
      console.error("CONSENT_READ", err && err.message);
      return res.status(500).json({ error: "Consensi non disponibili." });
    }
  });

  // { version, age, terms, health } for the main consent, and/or
  // { ai: true | false } to give or withdraw the AI consent.
  app.post("/api/account/consent", async (req, res) => {
    const auth = await accountFromBearer(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Sessione scaduta o non autorizzata." });
    const body = req.body || {};
    const { version } = legal();
    const wantsMain = body.version !== undefined || body.age !== undefined || body.terms !== undefined || body.health !== undefined;
    const wantsAi = typeof body.ai === "boolean";
    if (!wantsMain && !wantsAi) return res.status(400).json({ error: "Nessun consenso indicato." });
    if (wantsMain && !validMainConsent(body, version)) {
      return res.status(400).json({
        error: "Per usare Nurvan servono la conferma dell'età, l'accettazione di informativa e termini e il consenso ai dati sulla salute.",
        code: "CONSENT_INCOMPLETE",
        version
      });
    }
    try {
      if (initDb) await initDb();
      if (wantsMain) await recordMainConsent(pool, auth.id, version);
      if (wantsAi) {
        await pool.query(
          body.ai
            ? "UPDATE app_users SET ai_consent_at = NOW(), ai_consent_withdrawn_at = NULL WHERE id = $1"
            : "UPDATE app_users SET ai_consent_withdrawn_at = NOW() WHERE id = $1",
          [auth.id]
        );
      }
      const row = await readConsentRow(pool, auth.id);
      if (!row) return res.status(401).json({ error: "Account non trovato." });
      return res.json({ ok: true, consent: consentState(row, version) });
    } catch (err) {
      console.error("CONSENT_WRITE", err && err.message);
      return res.status(500).json({ error: "Consenso non salvato. Riprova." });
    }
  });
}
