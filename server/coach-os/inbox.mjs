export function inboxItem(kind, row) {
  return {
    id: String(row.id),
    kind,
    clientId: row.client_id == null ? null : String(row.client_id),
    clientName: row.client_name || row.display_name || null,
    title: row.title || row.kind || kind,
    preview: String(row.preview || row.body || row.notes || "").slice(0, 160),
    at: row.created_at || row.requested_at || row.updated_at,
    unread: !row.read_at,
    pinned: !!row.pinned,
    reaction: row.reaction || null,
    href: row.href || null
  };
}

export async function loadCoachInbox(pool, coachId, options = {}) {
  const q = String(options.q || "").trim();
  const limit = Math.min(80, Math.max(1, Number(options.limit) || 40));
  const messages = await pool.query(
    `SELECT m.id, m.client_id, c.display_name AS client_name, m.body, m.created_at, m.read_at, m.pinned, m.reaction
     FROM coach_messages m
     JOIN coach_clients c ON c.id = m.client_id
     WHERE c.coach_user_id = $1
       AND ($2 = '' OR m.body ILIKE '%' || $2 || '%' OR c.display_name ILIKE '%' || $2 || '%')
     ORDER BY m.pinned DESC, m.created_at DESC
     LIMIT $3`,
    [coachId, q, limit]
  );
  const checkIns = await pool.query(
    `SELECT ci.id, ci.client_id, c.display_name AS client_name, ci.status, ci.notes, ci.requested_at, ci.received_at
     FROM coach_check_ins ci
     JOIN coach_clients c ON c.id = ci.client_id
     WHERE ci.coach_user_id = $1 AND ci.status IN ('requested','received')
     ORDER BY COALESCE(ci.received_at, ci.requested_at) DESC
     LIMIT 20`,
    [coachId]
  );
  const attention = await pool.query(
    `SELECT a.id, a.client_id, a.payload, a.updated_at, a.type
     FROM coach_attention_items a
     WHERE a.coach_user_id = $1 AND a.status IN ('open','snoozed')
     ORDER BY a.updated_at DESC
     LIMIT 20`,
    [coachId]
  );
  const asks = await pool.query(
    `SELECT e.id, e.client_id, c.display_name AS client_name, e.payload, e.created_at, e.read_at
     FROM coach_events e
     JOIN coach_clients c ON c.id = e.client_id
     WHERE c.coach_user_id = $1 AND e.kind = 'ask_coach'
     ORDER BY e.created_at DESC
     LIMIT 20`,
    [coachId]
  );
  const items = [
    ...(messages.rows || []).map((row) => inboxItem("message", {
      ...row,
      title: row.client_name,
      preview: row.body,
      href: { view: "coachChat", clientId: row.client_id }
    })),
    ...(asks.rows || []).map((row) => {
      const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
      const domain = String(payload.domain || "richiesta");
      const note = String(payload.note || payload.message || "").trim();
      return inboxItem("ask_coach", {
        ...row,
        title: (row.client_name || "Cliente") + " · richiesta " + domain,
        preview: note || ("Chiede " + domain),
        href: { view: "coachChat", clientId: row.client_id }
      });
    }),
    ...(checkIns.rows || []).map((row) => inboxItem("check_in", {
      ...row,
      title: "Check-in · " + (row.client_name || ""),
      preview: row.status + (row.notes ? " · " + row.notes : ""),
      created_at: row.received_at || row.requested_at,
      href: { view: "coachCheckIns", checkInId: row.id }
    })),
    ...(attention.rows || []).map((row) => inboxItem("attention", {
      ...row,
      title: (row.payload && row.payload.title) || row.type,
      preview: (row.payload && row.payload.detail) || "",
      created_at: row.updated_at,
      href: { view: "coachClient", clientId: row.client_id }
    }))
  ].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  return {
    items: items.slice(0, limit),
    unread: items.filter((item) => item.unread && item.kind === "message").length,
    checkIns: (checkIns.rows || []).length,
    attention: (attention.rows || []).length
  };
}

export async function pinCoachMessage(pool, coachId, messageId, pinned = true) {
  const result = await pool.query(
    `UPDATE coach_messages m
     SET pinned = $3
     FROM coach_clients c
     WHERE m.client_id = c.id AND c.coach_user_id = $1 AND m.id = $2
     RETURNING m.id, m.pinned`,
    [coachId, messageId, !!pinned]
  );
  return result.rows[0] || null;
}

export async function reactCoachMessage(pool, coachId, messageId, reaction) {
  const result = await pool.query(
    `UPDATE coach_messages m
     SET reaction = $3
     FROM coach_clients c
     WHERE m.client_id = c.id AND c.coach_user_id = $1 AND m.id = $2
     RETURNING m.id, m.reaction`,
    [coachId, messageId, String(reaction || "").slice(0, 16) || null]
  );
  return result.rows[0] || null;
}

export async function listQuickReplies(pool, coachId) {
  const result = await pool.query(
    "SELECT id, title, body FROM coach_quick_replies WHERE coach_user_id = $1 ORDER BY id ASC",
    [coachId]
  );
  const rows = result.rows || [];
  if (rows.length) return rows.map((row) => ({ id: String(row.id), title: row.title, body: row.body }));
  return [
    { id: "system:nudge", title: "Nudge", body: "Tutto bene? Fammi sapere come sta andando l’allenamento." },
    { id: "system:checkin", title: "Check-in", body: "Quando puoi, inviami il check-in di questa settimana." }
  ];
}
