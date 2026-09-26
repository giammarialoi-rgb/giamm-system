// Which Nurvan account a Google or Apple login opens, and account deletion.
//
// The key of an identity is the provider's own id (the "sub" of its token),
// kept in app_user_identities: one row per identity, several per account. The
// email is only a way to find an account the first time, and only when the
// provider says it verified it. An account signed in on this device that
// adds a provider keeps its own email: the provider is linked, nothing is
// overwritten (it used to replace the account's address with the provider's,
// which for Apple can be a relay address).

import { revocationMoment } from "./sessions.mjs";

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

const PROVIDER_LABEL = { google: "Google", apple: "Apple" };

// A name the account did not choose: empty, or made from the email.
function isPlaceholderName(name, email) {
  const n = String(name || "").trim().toLowerCase();
  const e = normalizeEmail(email);
  return !n || n === e || n === e.split("@")[0];
}

export function publicUser(row) {
  return { id: row.id, email: row.email, name: row.name, provider: row.provider || "email", avatarUrl: row.avatar_url || null };
}

// In order: the identity already known; the account signed in on this device;
// the account with the same verified email; a new account.
export async function resolveIdentityUser(pool, identity) {
  const provider = String(identity.provider || "");
  const sub = String(identity.sub || "");
  if (!provider || !sub) throw httpError(400, "Identità del provider mancante.");
  const email = normalizeEmail(identity.email);
  const label = PROVIDER_LABEL[provider] || provider;
  const linkingUserId = identity.linkingUserId ? String(identity.linkingUserId) : "";

  const known = await pool.query(
    "SELECT user_id FROM app_user_identities WHERE provider = $1 AND provider_sub = $2",
    [provider, sub]
  );
  let userId = known.rows.length ? String(known.rows[0].user_id) : "";
  if (userId && linkingUserId && userId !== linkingUserId) {
    throw httpError(409, "Questo account " + label + " è già collegato a un altro account Nurvan.");
  }
  if (!userId && linkingUserId) {
    const linking = await pool.query("SELECT id FROM app_users WHERE id = $1", [linkingUserId]);
    if (linking.rows.length) userId = String(linking.rows[0].id);
  }
  let matchedByEmail = false;
  if (!userId && email && identity.emailVerified) {
    const byEmail = await pool.query("SELECT id FROM app_users WHERE email = $1", [email]);
    if (byEmail.rows.length) { userId = String(byEmail.rows[0].id); matchedByEmail = true; }
  }

  let created = false;
  let lostRace = false;
  const givenName = String(identity.name || "").trim();
  if (!userId) {
    if (!email) throw httpError(400, label + " non ha fornito un’email. Consenti la condivisione dell’email e riprova.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO app_users(email, name, provider, provider_id, avatar_url, email_verified_at)
         VALUES($1, $2, $3, $4, $5, CASE WHEN $6::boolean THEN NOW() ELSE NULL END)
         RETURNING id`,
        [email, givenName || email.split("@")[0], provider, sub, identity.avatarUrl || null, !!identity.emailVerified]
      );
      userId = String(inserted.rows[0].id);
      await client.query("INSERT INTO app_account_data(user_id, data) VALUES($1, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING", [userId]);
      await client.query("COMMIT");
      created = true;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      if (error && error.code === "23505" && identity.emailVerified) {
        // Two first logins at once (a double tap): the other one created the
        // account a moment ago. Same verified address: that is the account.
        lostRace = true;
      } else if (error && error.code === "23505") {
        // Same address, but the provider did not verify it: no silent merge.
        throw httpError(409, "Esiste già un account con questa email. Accedi con la password e collega " + label + " dal profilo.");
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  }
  if (lostRace) {
    const winner = await pool.query("SELECT id FROM app_users WHERE email = $1", [email]);
    if (!winner.rows.length) throw httpError(409, "Accesso non riuscito, riprova.");
    userId = String(winner.rows[0].id);
  }

  await pool.query(
    `INSERT INTO app_user_identities(provider, provider_sub, user_id, email, refresh_token_enc)
     VALUES($1, $2, $3, $4, $5)
     ON CONFLICT (provider, provider_sub) DO UPDATE
     SET email = COALESCE(EXCLUDED.email, app_user_identities.email),
         refresh_token_enc = COALESCE(EXCLUDED.refresh_token_enc, app_user_identities.refresh_token_enc),
         last_login_at = NOW()`,
    [provider, sub, userId, email || null, identity.refreshTokenEnc || null]
  );

  // Registering with a password never proved the address: anyone could have
  // registered someone else's email first, and the real owner's Google/Apple
  // login would then land in an account the other person can open. The
  // provider has verified the address, so its owner is now the one logging in:
  // the password set before is dropped and every session opened with it ends.
  // The owner can set a new password from their inbox at any time.
  // A password account whose owner has confirmed the address (code or link
  // from the verification email) was registered by that owner: it keeps its
  // password, and the provider is simply one more way in.
  let passwordCleared = false;
  if (matchedByEmail) {
    const cleared = await pool.query(
      "UPDATE app_users SET password_hash = NULL, tokens_valid_after = $2 WHERE id = $1 AND password_hash IS NOT NULL AND email_verified_at IS NULL RETURNING id",
      [userId, revocationMoment()]
    );
    passwordCleared = cleared.rows.length > 0;
    await pool.query("UPDATE app_users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = $1", [userId]);
  }

  const current = await pool.query("SELECT id, email, name, provider, avatar_url FROM app_users WHERE id = $1", [userId]);
  const row = current.rows[0];
  if (!row) throw httpError(401, "Account non trovato.");
  // Apple sends the name only the first time: it is saved then, but never
  // over a name the account already has.
  const name = givenName && isPlaceholderName(row.name, row.email) ? givenName : row.name;
  // An athlete's account belongs to the coach's practice: its kind stays.
  const kind = row.provider === "coach_client" ? row.provider : provider;
  const updated = await pool.query(
    `UPDATE app_users SET name = $2, provider = $3, provider_id = $4, avatar_url = COALESCE(avatar_url, $5), updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, name, provider, avatar_url`,
    [userId, name, kind, sub, identity.avatarUrl || null]
  );
  return { user: updated.rows[0], created, passwordCleared };
}

// Deleting an account removes the user row; every table that belongs to it
// goes with it (the foreign keys cascade). Athletes created by a coach are
// part of that coach's practice and are removed by the coach.
export async function deleteAccount(pool, userId) {
  const found = await pool.query("SELECT id, email, provider FROM app_users WHERE id = $1", [userId]);
  const user = found.rows[0];
  if (!user) throw httpError(404, "Account non trovato.");
  if (user.provider === "coach_client") throw httpError(403, "Questo account è gestito dal tuo coach: chiedi a lui di rimuoverlo.");
  const identities = await pool.query(
    "SELECT provider, refresh_token_enc FROM app_user_identities WHERE user_id = $1",
    [userId]
  );
  let athletesRemoved = 0;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM app_password_resets WHERE email = $1", [user.email]);
    // A coach's athletes created by invite exist only inside that practice:
    // once the coach's client records cascade away, nothing can log them in
    // or reach them. They go with the coach. An athlete's own account (any
    // other kind) is not touched: it only loses the link.
    const athletes = await client.query(
      `DELETE FROM app_users
       WHERE provider = 'coach_client'
         AND id IN (SELECT athlete_user_id FROM coach_clients WHERE coach_user_id = $1 AND athlete_user_id IS NOT NULL)
       RETURNING id`,
      [userId]
    );
    athletesRemoved = athletes.rows.length;
    await client.query("DELETE FROM app_users WHERE id = $1", [userId]);
    await client.query("COMMIT");
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
  return { email: user.email, identities: identities.rows, athletesRemoved };
}

// DELETE /api/account, confirmed by typing ELIMINA. It works the same for
// every way in (password, Google, Apple): what proves who you are is the
// session. Afterwards the Apple link is revoked on Apple's side, if there is
// one; a failure there does not bring the account back.
export function mountAccountDeletion(app, { pool, initDb, accountFromBearer, onDeleted }) {
  app.delete("/api/account", async (req, res) => {
    const auth = await accountFromBearer(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Sessione scaduta o non autorizzata." });
    if (String((req.body && req.body.confirm) || "").trim().toUpperCase() !== "ELIMINA") {
      return res.status(400).json({ error: "Per eliminare l’account scrivi ELIMINA." });
    }
    try {
      if (initDb) await initDb();
      const gone = await deleteAccount(pool, auth.id);
      if (onDeleted) {
        try { await onDeleted(gone); } catch (err) { console.warn("ACCOUNT_DELETE_AFTER", err && err.message); }
      }
      return res.json({ ok: true });
    } catch (err) {
      if (err && err.statusCode) return res.status(err.statusCode).json({ error: err.message });
      console.error("ACCOUNT_DELETE_ERROR", err);
      return res.status(500).json({ error: "Eliminazione account non riuscita." });
    }
  });
}
