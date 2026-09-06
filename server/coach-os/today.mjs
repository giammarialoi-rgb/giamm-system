function isoDate(value) {
  const input = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(input)
    ? input
    : new Date().toISOString().slice(0, 10);
}

export function normalizeCoachTimeZone(value) {
  const zone = String(value || "UTC").slice(0, 80);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
    return zone;
  } catch (_) {
    return "UTC";
  }
}

function attentionFromRow(row, now = Date.now()) {
  const items = [];
  const clientId = String(row.id);
  const name = row.display_name || "Cliente";
  const base = { clientId, clientName: name };
  const add = (type, severity, title, detail, dueAt) => {
    items.push({
      id: `${type}:${clientId}`,
      type,
      severity,
      title,
      detail,
      dueAt: dueAt || null,
      action: { view: "coachClient", clientId }
    });
  };

  if (Number(row.unread_count || 0) > 0) {
    add("unread", "high", `${name} ha messaggi non letti`, `${Number(row.unread_count)} da leggere`);
  }
  if (row.pending_change) {
    add("program_change", "high", `Modifica richiesta da ${name}`, "Richiede approvazione");
  }
  if (row.pending_unlock) {
    add("pending_request", "high", `Permesso richiesto da ${name}`, "Richiede una decisione");
  }
  if (row.leave_requested_at) {
    add("leave_request", "high", `${name} chiede di chiudere`, "Verifica collaborazione e pagamenti");
  }
  if (!row.paid || (row.next_due_at && new Date(row.next_due_at).getTime() < now)) {
    add("payment_due", "high", `Pagamento da verificare · ${name}`, "Scadenza superata", row.next_due_at);
  }
  if (row.next_check_at && new Date(row.next_check_at).getTime() <= now) {
    add("check_in", "medium", `Check-in dovuto · ${name}`, "Richiedi o revisiona il check-in", row.next_check_at);
  }
  if (
    row.program_expires_at &&
    new Date(row.program_expires_at).getTime() <= now + 7 * 86400000
  ) {
    add("program_expiring", "medium", `Programma in scadenza · ${name}`, "Scade entro 7 giorni", row.program_expires_at);
  }
  const lastWorkout = row.last_workout_at ? new Date(row.last_workout_at).getTime() : 0;
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : 0;
  if (
    (lastWorkout && lastWorkout < now - 7 * 86400000) ||
    (!lastWorkout && createdAt && createdAt < now - 7 * 86400000)
  ) {
    add("inactive", "medium", `${name} è inattivo`, "Nessun workout negli ultimi 7 giorni", row.last_workout_at);
  }
  return items.map((item) => ({ ...base, ...item }));
}

function eventLabel(row) {
  const names = {
    message: "Nuovo messaggio",
    intake_completed: "Intake completato",
    workout_done: "Workout completato",
    workout_started: "Workout iniziato",
    request_program: "Scheda richiesta",
    change_request: "Modifica richiesta",
    change_approved: "Modifica approvata",
    change_rejected: "Modifica rifiutata",
    check_request: "Check-in richiesto",
    program_assigned: "Programma assegnato",
    nutrition_assigned: "Alimentazione assegnata",
    supplements_assigned: "Integrazione assegnata",
    payment_due: "Pagamento in scadenza"
  };
  return names[row.kind] || String(row.kind || "Attività").replace(/_/g, " ");
}

export async function loadCoachToday(pool, coachId, options = {}) {
  const date = isoDate(options.date);
  const timeZone = normalizeCoachTimeZone(options.timeZone);
  const now = Date.now();

  const [kpiResult, attentionResult, recentResult] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS clients,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_clients,
         COALESCE(SUM(unread_count) FILTER (WHERE status = 'active'), 0)::int AS unread,
         COUNT(*) FILTER (WHERE status = 'active' AND workout_started_at IS NOT NULL
           AND (last_workout_at IS NULL OR last_workout_at < workout_started_at))::int AS live_now
       FROM coach_clients
       WHERE coach_user_id = $1 AND status <> 'removed'`,
      [coachId]
    ),
    pool.query(
      `SELECT id, display_name, paid, next_due_at, unread_count, pending_change,
              pending_unlock, leave_requested_at, next_check_at, program_expires_at,
              last_workout_at, created_at
       FROM coach_clients
       WHERE coach_user_id = $1 AND status = 'active'
         AND (
           unread_count > 0 OR pending_change IS NOT NULL OR pending_unlock IS NOT NULL
           OR leave_requested_at IS NOT NULL OR paid = FALSE
           OR (next_due_at IS NOT NULL AND next_due_at <= NOW())
           OR (next_check_at IS NOT NULL AND next_check_at <= NOW())
           OR (program_expires_at IS NOT NULL AND program_expires_at <= NOW() + INTERVAL '7 days')
           OR (last_workout_at IS NOT NULL AND last_workout_at <= NOW() - INTERVAL '7 days')
           OR (last_workout_at IS NULL AND created_at <= NOW() - INTERVAL '7 days')
         )
       ORDER BY
         (unread_count > 0 OR pending_change IS NOT NULL OR pending_unlock IS NOT NULL
           OR leave_requested_at IS NOT NULL OR paid = FALSE) DESC,
         COALESCE(next_due_at, next_check_at, program_expires_at, last_workout_at, created_at) ASC
       LIMIT 40`,
      [coachId]
    ),
    pool.query(
      `SELECT e.id, e.kind, e.payload, e.created_at, c.id AS client_id,
              c.display_name
       FROM coach_events e
       JOIN coach_clients c ON c.id = e.client_id
       WHERE c.coach_user_id = $1
         AND e.kind <> 'coach_modified'
       ORDER BY e.created_at DESC
       LIMIT 8`,
      [coachId]
    )
  ]);

  const attention = [];
  for (const row of attentionResult.rows || []) {
    attention.push(...attentionFromRow(row, now));
  }
  const severityRank = { high: 0, medium: 1, low: 2 };
  attention.sort((a, b) =>
    (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3) ||
    String(a.dueAt || "").localeCompare(String(b.dueAt || ""))
  );

  const kpi = kpiResult.rows && kpiResult.rows[0] ? kpiResult.rows[0] : {};
  let sessions = [];
  try {
    const sessionResult = await pool.query(
      `SELECT a.id, a.type, a.title, a.starts_at, a.timezone, c.display_name
       FROM coach_appointments a
       LEFT JOIN coach_clients c ON c.id = a.client_id
       WHERE a.coach_user_id = $1 AND a.status = 'scheduled'
         AND a.starts_at::date = $2::date
       ORDER BY a.starts_at ASC
       LIMIT 12`,
      [coachId, date]
    );
    sessions = (sessionResult.rows || []).filter((row) => row.starts_at).map((row) => ({
      id: String(row.id),
      title: row.title || row.type,
      type: row.type,
      time: row.starts_at,
      timeZone: row.timezone,
      clientName: row.display_name || null
    }));
  } catch (_) {
    sessions = [];
  }
  return {
    date,
    timeZone,
    generatedAt: new Date().toISOString(),
    kpi: {
      clients: Number(kpi.clients || 0),
      activeClients: Number(kpi.active_clients || 0),
      unread: Number(kpi.unread || 0),
      liveNow: Number(kpi.live_now || 0),
      attention: attention.length
    },
    attention: attention.slice(0, 12),
    sessions,
    tasks: [],
    recentActivity: (recentResult.rows || []).map((row) => ({
      id: String(row.id),
      kind: row.kind,
      title: eventLabel(row),
      clientId: String(row.client_id),
      clientName: row.display_name || "Cliente",
      at: row.created_at,
      payload: row.payload || {},
      action: { view: row.kind === "message" ? "coachChat" : "coachClient", clientId: String(row.client_id) }
    }))
  };
}

export const TodayTestHelpers = Object.freeze({
  attentionFromRow,
  eventLabel,
  isoDate
});
