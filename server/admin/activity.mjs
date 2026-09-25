// Ultimo accesso ed errori visti dal server, per la dashboard.
//
// touchLastSeen: segna app_users.last_seen_at quando l'app legge o sincronizza
// l'account, al massimo una volta ogni 5 minuti per account.
// recordEvent: un fallimento visto dal server (sync, invio check-in, import di
// un documento) con la rotta, lo stato, il formato del file e il messaggio;
// mai il contenuto. Nessuno dei due blocca la richiesta che li chiama.

export function touchLastSeen(pool, userId) {
  if (!pool || !userId) return Promise.resolve();
  return pool.query(
    "UPDATE app_users SET last_seen_at = NOW() WHERE id = $1 AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '5 minutes')",
    [userId]
  ).catch(() => {});
}

export function fileFormat(name, mime) {
  const ext = String(name || "").toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return (ext ? ext[1] : "") || String(mime || "").toLowerCase().split("/").pop().slice(0, 40) || "sconosciuto";
}

export function recordEvent(pool, kind, userId, detail = {}) {
  if (!pool) return Promise.resolve();
  const clean = {
    route: detail.route ? String(detail.route).slice(0, 80) : null,
    status: detail.status == null ? null : Number(detail.status),
    format: detail.format ? String(detail.format).slice(0, 40) : null,
    message: detail.message ? String(detail.message).replace(/\s+/g, " ").slice(0, 300) : null
  };
  return pool.query(
    "INSERT INTO app_events(kind, user_id, detail) VALUES($1,$2,$3)",
    [String(kind).slice(0, 40), userId || null, JSON.stringify(clean)]
  ).catch(() => {});
}
