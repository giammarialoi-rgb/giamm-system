// Reports of abuse in the coach-athlete chat: who reported whom, why, and what
// the reporter chose to send. The chat is end-to-end encrypted, so what is read
// here is only what the reporter attached to the report, never the rest of the
// conversation. Counts, reasons and a few messages the reporter picked.
//
// The table is created by the chat code (coach-practice.mjs) on first use, so
// every read tolerates it not being there yet.

const REASONS = { harassment: "Molestie o linguaggio offensivo", spam: "Spam o pubblicità", inappropriate: "Contenuto inappropriato", payment: "Richiesta di pagamento fuori luogo", other: "Altro" };

async function safe(fn, empty) {
  try { return await fn(); } catch (err) { if (err && err.code === "42P01") return empty; throw err; }
}

export async function openReportCount(pool) {
  return safe(async () => Number((await pool.query("SELECT COUNT(*)::int AS n FROM chat_reports WHERE status = 'open'")).rows[0].n), 0);
}

export async function listChatReports(pool, { status = "open", limit = 100 } = {}) {
  const st = status === "handled" ? "handled" : (status === "all" ? "all" : "open");
  const n = Math.max(1, Math.min(300, Math.round(Number(limit)) || 100));
  return safe(async () => {
    const rows = (await pool.query(
      `SELECT r.id, r.reporter_role, r.reason, r.details, r.excerpt, r.message_id, r.status, r.created_at, r.handled_at, r.handled_note,
              rep.email AS reporter_email, rep.name AS reporter_name, tgt.id AS reported_id, tgt.email AS reported_email, tgt.name AS reported_name, tgt.disabled_at AS reported_disabled_at,
              c.chat_blocked_by
         FROM chat_reports r
         LEFT JOIN app_users rep ON rep.id = r.reporter_user_id
         LEFT JOIN app_users tgt ON tgt.id = r.reported_user_id
         LEFT JOIN coach_clients c ON c.id = r.client_id
        WHERE ($1 = 'all' OR r.status = $1)
        ORDER BY (r.status = 'open') DESC, r.created_at DESC LIMIT $2`, [st, n]
    )).rows;
    return rows.map((r) => ({
      id: String(r.id), status: r.status, at: r.created_at, handledAt: r.handled_at, handledNote: r.handled_note,
      reporterRole: r.reporter_role, reporter: r.reporter_email || "", reporterName: r.reporter_name || "",
      reported: r.reported_email || "", reportedName: r.reported_name || "", reportedId: r.reported_id ? String(r.reported_id) : "", reportedSuspended: !!r.reported_disabled_at,
      reason: r.reason, reasonLabel: REASONS[r.reason] || r.reason, details: r.details || "", excerpt: Array.isArray(r.excerpt) ? r.excerpt : [],
      blockedBy: r.chat_blocked_by || null
    }));
  }, []);
}

export async function handleChatReport(pool, id, note) {
  const text = String(note || "").trim().slice(0, 1000) || null;
  const r = await pool.query("UPDATE chat_reports SET status = 'handled', handled_at = NOW(), handled_note = $2 WHERE id = $1 AND status = 'open' RETURNING id", [id, text]);
  return r.rowCount > 0;
}

export async function reopenChatReport(pool, id) {
  const r = await pool.query("UPDATE chat_reports SET status = 'open', handled_at = NULL WHERE id = $1 AND status = 'handled' RETURNING id", [id]);
  return r.rowCount > 0;
}

export const CHAT_REPORT_REASONS = REASONS;
