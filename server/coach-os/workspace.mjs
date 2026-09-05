const TASK_STATUSES = new Set(["open", "snoozed", "completed", "dismissed"]);
const TASK_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const ATTENTION_STATUSES = new Set(["open", "snoozed", "resolved", "dismissed"]);

export const DEFAULT_SAVED_VIEWS = Object.freeze([
  { id: "system:at-risk", name: "At Risk", filters: { filter: "attention" }, sort: { by: "attention", direction: "desc" }, isSystem: true },
  { id: "system:no-workout-7d", name: "No Workout 7d", filters: { filter: "inactive" }, sort: { by: "recent", direction: "asc" }, isSystem: true },
  { id: "system:check-ins", name: "Check-ins", filters: { filter: "checkin" }, sort: { by: "due", direction: "asc" }, isSystem: true },
  { id: "system:payments", name: "Payments", filters: { filter: "payment" }, sort: { by: "due", direction: "asc" }, isSystem: true },
  { id: "system:new-clients", name: "New Clients", filters: { filter: "new" }, sort: { by: "recent", direction: "desc" }, isSystem: true }
]);

function cleanText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function taskRow(row) {
  return {
    id: String(row.id),
    clientId: row.client_id == null ? null : String(row.client_id),
    clientName: row.client_name || null,
    source: row.source,
    title: row.title,
    dueAt: row.due_at,
    priority: row.priority,
    status: row.status,
    createdBy: row.created_by,
    sortOrder: Number(row.sort_order || 0),
    sourceEntityType: row.source_entity_type || null,
    sourceEntityId: row.source_entity_id || null,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at
  };
}

function attentionRow(row) {
  const payload = row.payload || {};
  return {
    id: String(row.id),
    key: row.dedupe_key,
    clientId: row.client_id == null ? null : String(row.client_id),
    clientName: payload.clientName || null,
    type: row.type,
    severity: row.severity,
    source: row.source,
    status: row.status,
    title: payload.title || "Richiede attenzione",
    detail: payload.detail || "",
    dueAt: row.due_at,
    snoozedUntil: row.snoozed_until,
    action: payload.action || null,
    updatedAt: row.updated_at
  };
}

export async function syncCoachAttention(pool, coachId, items) {
  const current = Array.isArray(items) ? items.slice(0, 50) : [];
  const keys = [];
  for (const item of current) {
    const key = cleanText(item.id || `${item.type}:${item.clientId}`, 160);
    if (!key) continue;
    keys.push(key);
    await pool.query(
      `INSERT INTO coach_attention_items(
         coach_user_id, client_id, type, severity, source, status,
         due_at, payload, dedupe_key, created_at, updated_at
       ) VALUES($1,$2,$3,$4,'today_rules','open',$5,$6,$7,NOW(),NOW())
       ON CONFLICT (coach_user_id, dedupe_key) DO UPDATE SET
         client_id = EXCLUDED.client_id,
         type = EXCLUDED.type,
         severity = EXCLUDED.severity,
         due_at = EXCLUDED.due_at,
         payload = EXCLUDED.payload,
         updated_at = NOW(),
         status = CASE
           WHEN coach_attention_items.status = 'snoozed'
             AND coach_attention_items.snoozed_until <= NOW() THEN 'open'
           ELSE coach_attention_items.status
         END`,
      [
        coachId,
        item.clientId || null,
        cleanText(item.type, 60),
        cleanText(item.severity || "medium", 20),
        item.dueAt || null,
        JSON.stringify({
          title: item.title,
          detail: item.detail,
          action: item.action,
          clientName: item.clientName
        }),
        key
      ]
    );
  }

  if (keys.length) {
    await pool.query(
      `UPDATE coach_attention_items
       SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
       WHERE coach_user_id = $1 AND source = 'today_rules'
         AND status IN ('open','snoozed')
         AND NOT (dedupe_key = ANY($2::text[]))`,
      [coachId, keys]
    );
  } else {
    await pool.query(
      `UPDATE coach_attention_items
       SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
       WHERE coach_user_id = $1 AND source = 'today_rules'
         AND status IN ('open','snoozed')`,
      [coachId]
    );
  }
}

export async function listCoachAttention(pool, coachId, options = {}) {
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const includeClosed = options.includeClosed === true;
  const params = [coachId, limit];
  const statusWhere = includeClosed
    ? ""
    : "AND (a.status = 'open' OR (a.status = 'snoozed' AND a.snoozed_until <= NOW()))";
  const result = await pool.query(
    `SELECT a.*
     FROM coach_attention_items a
     WHERE a.coach_user_id = $1 ${statusWhere}
     ORDER BY
       CASE a.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
       a.due_at NULLS LAST, a.updated_at DESC
     LIMIT $2`,
    params
  );
  return (result.rows || []).map(attentionRow);
}

export async function updateCoachAttention(pool, coachId, attentionId, input = {}) {
  const status = cleanText(input.status, 20);
  if (!ATTENTION_STATUSES.has(status)) throw new Error("Invalid attention status.");
  const snoozedUntil = status === "snoozed" ? input.snoozedUntil || null : null;
  const result = await pool.query(
    `UPDATE coach_attention_items
     SET status = $3, snoozed_until = $4,
         resolved_at = CASE WHEN $3 IN ('resolved','dismissed') THEN NOW() ELSE NULL END,
         updated_at = NOW()
     WHERE id = $1 AND coach_user_id = $2
     RETURNING *`,
    [attentionId, coachId, status, snoozedUntil]
  );
  return result.rows && result.rows[0] ? attentionRow(result.rows[0]) : null;
}

export async function listCoachTasks(pool, coachId, options = {}) {
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const status = TASK_STATUSES.has(String(options.status)) ? String(options.status) : "open";
  const openQueue = status === "open";
  const statusWhere = openQueue
    ? "(t.status = 'open' OR (t.status = 'snoozed' AND t.due_at IS NOT NULL AND t.due_at <= NOW()))"
    : "t.status = $2";
  const limitParam = openQueue ? "$2" : "$3";
  const params = openQueue ? [coachId, limit] : [coachId, status, limit];
  const result = await pool.query(
    `SELECT t.*, c.display_name AS client_name
     FROM coach_tasks t
     LEFT JOIN coach_clients c ON c.id = t.client_id
     WHERE t.coach_user_id = $1 AND ${statusWhere}
     ORDER BY
       CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
       t.sort_order ASC, t.due_at NULLS LAST, t.created_at ASC
     LIMIT ${limitParam}`,
    params
  );
  return (result.rows || []).map(taskRow);
}

export async function createCoachTask(pool, coachId, input = {}) {
  const title = cleanText(input.title, 240);
  if (!title) throw new Error("Task title is required.");
  const priority = TASK_PRIORITIES.has(String(input.priority)) ? String(input.priority) : "normal";
  const result = await pool.query(
    `INSERT INTO coach_tasks(
       coach_user_id, client_id, source, title, due_at, priority, status,
       created_by, sort_order, source_entity_type, source_entity_id, metadata
     ) VALUES($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      coachId,
      input.clientId || null,
      cleanText(input.source || "coach", 40),
      title,
      input.dueAt || null,
      priority,
      cleanText(input.createdBy || "coach", 40),
      Number(input.sortOrder || 0),
      cleanText(input.sourceEntityType, 60) || null,
      cleanText(input.sourceEntityId, 120) || null,
      JSON.stringify(asObject(input.metadata))
    ]
  );
  return taskRow(result.rows[0]);
}

export async function updateCoachTask(pool, coachId, taskId, input = {}) {
  const status = input.status == null ? null : cleanText(input.status, 20);
  if (status && !TASK_STATUSES.has(status)) throw new Error("Invalid task status.");
  const priority = input.priority == null ? null : cleanText(input.priority, 20);
  if (priority && !TASK_PRIORITIES.has(priority)) throw new Error("Invalid task priority.");
  const result = await pool.query(
    `UPDATE coach_tasks
     SET title = COALESCE($3, title),
         due_at = CASE WHEN $4::boolean THEN $5::timestamptz ELSE due_at END,
         priority = COALESCE($6, priority),
         status = COALESCE($7, status),
         sort_order = COALESCE($8, sort_order),
         completed_at = CASE
           WHEN $7 = 'completed' THEN NOW()
           WHEN $7 IS NOT NULL AND $7 <> 'completed' THEN NULL
           ELSE completed_at
         END,
         updated_at = NOW()
     WHERE id = $1 AND coach_user_id = $2
     RETURNING *`,
    [
      taskId,
      coachId,
      input.title == null ? null : cleanText(input.title, 240),
      Object.prototype.hasOwnProperty.call(input, "dueAt"),
      input.dueAt || null,
      priority,
      status,
      input.sortOrder == null ? null : Number(input.sortOrder)
    ]
  );
  return result.rows && result.rows[0] ? taskRow(result.rows[0]) : null;
}

export async function reorderCoachTasks(pool, coachId, ids) {
  const unique = [...new Set((Array.isArray(ids) ? ids : []).map(String))].slice(0, 100);
  for (let index = 0; index < unique.length; index += 1) {
    await pool.query(
      "UPDATE coach_tasks SET sort_order = $3, updated_at = NOW() WHERE id = $1 AND coach_user_id = $2",
      [unique[index], coachId, index]
    );
  }
  return listCoachTasks(pool, coachId, { limit: 100 });
}

export async function listSavedViews(pool, coachId) {
  const result = await pool.query(
    `SELECT id, name, filters, sort, config, is_system, created_at, updated_at
     FROM coach_saved_views WHERE coach_user_id = $1 ORDER BY name ASC`,
    [coachId]
  );
  const custom = (result.rows || []).map((row) => ({
    id: String(row.id),
    name: row.name,
    filters: row.filters || {},
    sort: row.sort || {},
    config: row.config || {},
    isSystem: !!row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
  return DEFAULT_SAVED_VIEWS.concat(custom);
}

export async function createSavedView(pool, coachId, input = {}) {
  const name = cleanText(input.name, 80);
  if (!name) throw new Error("Saved view name is required.");
  const result = await pool.query(
    `INSERT INTO coach_saved_views(coach_user_id, name, filters, sort, config)
     VALUES($1,$2,$3,$4,$5)
     ON CONFLICT (coach_user_id, name) DO UPDATE SET
       filters = EXCLUDED.filters, sort = EXCLUDED.sort, config = EXCLUDED.config, updated_at = NOW()
     RETURNING *`,
    [
      coachId,
      name,
      JSON.stringify(asObject(input.filters)),
      JSON.stringify(asObject(input.sort)),
      JSON.stringify(asObject(input.config))
    ]
  );
  const row = result.rows[0];
  return {
    id: String(row.id),
    name: row.name,
    filters: row.filters || {},
    sort: row.sort || {},
    config: row.config || {},
    isSystem: !!row.is_system
  };
}

function timelineSpec(kind, row) {
  const map = {
    message: ["message", "messages", "client", "Messaggio ricevuto", "coachChat"],
    workout_done: ["workout", "training", "client", "Workout completato", "training"],
    workout_started: ["workout_started", "training", "client", "Workout iniziato", "training"],
    intake_completed: ["intake", "profile", "client", "Intake completato", "coachClient"],
    program_assigned: ["program_assignment", "program", "coach", "Programma assegnato", "training"],
    nutrition_assigned: ["nutrition_update", "nutrition", "coach", "Alimentazione assegnata", "nutrition"],
    supplements_assigned: ["supplement_update", "supplements", "coach", "Integrazione assegnata", "supplements"],
    therapy_assigned: ["therapy_update", "therapy", "coach", "Terapia assegnata", "therapy"],
    exams_assigned: ["exams_update", "exams", "coach", "Esami assegnati", "exams"],
    change_request: ["request", "program", "client", "Modifica programma richiesta", "coachClient"],
    change_approved: ["approval", "program", "coach", "Modifica programma approvata", "training"],
    change_rejected: ["approval", "program", "coach", "Modifica programma rifiutata", "coachClient"],
    check_request: ["check_in_request", "check-in", "coach", "Check-in richiesto", "coachClient"],
    payment_due: ["payment", "business", "system", "Pagamento in scadenza", "coachClient"]
  };
  return map[kind] || [kind || "event", "general", row.from_role || "system", String(kind || "Attività").replace(/_/g, " "), "coachClient"];
}

async function insertTimeline(pool, record) {
  await pool.query(
    `INSERT INTO coach_timeline_events(
       coach_user_id, client_id, event_type, source, domain, actor_type, actor_id,
       summary, source_entity_type, source_entity_id, source_link, metadata,
       occurred_at, dedupe_key
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (coach_user_id, dedupe_key) DO NOTHING`,
    [
      record.coachId,
      record.clientId,
      record.eventType,
      record.source,
      record.domain,
      record.actorType,
      record.actorId || null,
      cleanText(record.summary, 300),
      record.sourceEntityType || null,
      record.sourceEntityId || null,
      JSON.stringify(record.sourceLink || {}),
      JSON.stringify(record.metadata || {}),
      record.occurredAt,
      record.dedupeKey
    ]
  );
}

export async function projectClientTimeline(pool, coachId, clientRow, accountData = {}) {
  const clientId = clientRow.id;
  const events = await pool.query(
    `SELECT id, kind, payload, created_at
     FROM coach_events WHERE client_id = $1 ORDER BY id DESC LIMIT 200`,
    [clientId]
  );
  for (const row of events.rows || []) {
    const [eventType, domain, actorType, summary, view] = timelineSpec(row.kind, row);
    await insertTimeline(pool, {
      coachId,
      clientId,
      eventType,
      source: "coach_event",
      domain,
      actorType,
      summary,
      sourceEntityType: "coach_event",
      sourceEntityId: String(row.id),
      sourceLink: { view, clientId: String(clientId) },
      metadata: { kind: row.kind },
      occurredAt: row.created_at,
      dedupeKey: `coach_event:${row.id}`
    });
  }

  for (const log of (Array.isArray(accountData.logs) ? accountData.logs.slice(-120) : [])) {
    const sourceId = String(log.id || log.at || "");
    if (!sourceId || !log.at) continue;
    await insertTimeline(pool, {
      coachId,
      clientId,
      eventType: "workout",
      source: "workout_log",
      domain: "training",
      actorType: "client",
      summary: `Workout W${log.week || "?"} · sessione ${(Number(log.day) || 0) + 1}`,
      sourceEntityType: "workout_log",
      sourceEntityId: sourceId,
      sourceLink: { view: "training", clientId: String(clientId), logId: sourceId },
      metadata: { sets: log.sets || 0, tonnage: log.tonnage || 0, kcal: log.kcal || 0 },
      occurredAt: log.at,
      dedupeKey: `workout:${clientId}:${sourceId}`
    });
  }

  for (const check of (Array.isArray(accountData.bodyChecks) ? accountData.bodyChecks.slice(-40) : [])) {
    const sourceId = String(check.id || check.at || "");
    if (!sourceId || !check.at) continue;
    await insertTimeline(pool, {
      coachId,
      clientId,
      eventType: "check_in",
      source: "body_check",
      domain: "check-in",
      actorType: "client",
      summary: check.weight ? `Check-in · ${check.weight} kg` : "Check-in inviato",
      sourceEntityType: "body_check",
      sourceEntityId: sourceId,
      sourceLink: { view: "coachCheckIns", clientId: String(clientId), checkId: sourceId },
      metadata: { weight: check.weight || null, period: check.period || null },
      occurredAt: check.at,
      dedupeKey: `check:${clientId}:${sourceId}`
    });
  }
}

export async function listClientTimeline(pool, coachId, clientId, options = {}) {
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 30));
  const cursor = Math.max(0, Number(options.cursor) || 0);
  const params = [coachId, clientId, limit];
  let cursorWhere = "";
  if (cursor) {
    params.push(cursor);
    cursorWhere = "AND id < $4";
  }
  const result = await pool.query(
    `SELECT * FROM coach_timeline_events
     WHERE coach_user_id = $1 AND client_id = $2 ${cursorWhere}
     ORDER BY occurred_at DESC, id DESC LIMIT $3`,
    params
  );
  const events = (result.rows || []).map((row) => ({
    id: String(row.id),
    type: row.event_type,
    source: row.source,
    domain: row.domain,
    actor: { type: row.actor_type, id: row.actor_id || null },
    summary: row.summary,
    sourceEntity: { type: row.source_entity_type || null, id: row.source_entity_id || null },
    sourceLink: row.source_link || {},
    metadata: row.metadata || {},
    at: row.occurred_at
  }));
  return {
    events,
    nextCursor: events.length === limit ? events[events.length - 1].id : null
  };
}

function latestWeight(accountData) {
  const checks = Array.isArray(accountData.bodyChecks) ? accountData.bodyChecks : [];
  const weighted = checks.filter((row) => Number(row && row.weight) > 0);
  const latest = weighted.length ? weighted[weighted.length - 1] : null;
  const previous = weighted.length > 1 ? weighted[weighted.length - 2] : null;
  const current = latest ? Number(latest.weight) : Number(accountData.profile && accountData.profile.weight) || null;
  return {
    current,
    delta: latest && previous ? Math.round((Number(latest.weight) - Number(previous.weight)) * 10) / 10 : null
  };
}

export function clientOperationalStatus(client, accountData = {}, now = Date.now()) {
  const duePayment = !client.paid || (client.next_due_at && new Date(client.next_due_at).getTime() < now);
  const pending = !!(client.pending_change || client.pending_unlock || client.leave_requested_at);
  const unread = Number(client.unread_count || 0) > 0;
  const lastWorkout = client.last_workout_at ? new Date(client.last_workout_at).getTime() : 0;
  const inactive = !!lastWorkout && lastWorkout < now - 7 * 86400000;
  if (duePayment) return { id: "payment_due", label: "Payment due", severity: "high" };
  if (pending || unread) return { id: "awaiting_coach", label: "Awaiting coach", severity: "high" };
  if (inactive) return { id: "at_risk", label: "At risk", severity: "medium" };
  if (!accountData.activeProgram || !(accountData.activeProgram.weeks || []).length) {
    return { id: "awaiting_program", label: "Awaiting program", severity: "medium" };
  }
  return { id: "on_track", label: "On track", severity: "low" };
}

export function nextClientAction(client, accountData = {}, now = Date.now()) {
  if (!client.paid || (client.next_due_at && new Date(client.next_due_at).getTime() < now)) {
    return { type: "payment", label: "Review payment", view: "coachClient" };
  }
  if (client.pending_change) return { type: "request", label: "Review program request", view: "coachClient" };
  if (client.pending_unlock) return { type: "permission", label: "Review permission request", view: "coachClient" };
  if (Number(client.unread_count || 0) > 0) return { type: "message", label: "Answer message", view: "coachChat" };
  if (client.next_check_at && new Date(client.next_check_at).getTime() <= now) {
    return { type: "check_in", label: "Request check-in", view: "coachCheckIns" };
  }
  if (!accountData.activeProgram || !(accountData.activeProgram.weeks || []).length) {
    return { type: "program", label: "Assign program", view: "coachPrograms" };
  }
  return { type: "review", label: "Review recent progress", view: "coachAnalytics" };
}

export async function buildClientOverview(pool, coachId, client, accountData = {}) {
  await projectClientTimeline(pool, coachId, client, accountData);
  const timeline = await listClientTimeline(pool, coachId, client.id, { limit: 6 });
  const program = accountData.activeProgram || {};
  const logs = Array.isArray(accountData.logs) ? accountData.logs : [];
  const lastLog = logs.length ? logs[logs.length - 1] : null;
  return {
    client: {
      id: String(client.id),
      name: client.display_name,
      username: client.username,
      status: client.status,
      goal: (client.intake && client.intake.goal) || (accountData.profile && accountData.profile.goal) || "",
      photo: accountData.profile && (accountData.profile.photoThumb || accountData.profile.photoUrl) || null
    },
    operationalStatus: clientOperationalStatus(client, accountData),
    nextAction: nextClientAction(client, accountData),
    snapshot: {
      weight: latestWeight(accountData),
      adherence: null,
      training: {
        programTitle: program.title || null,
        weeks: Array.isArray(program.weeks) ? program.weeks.length : 0,
        lastWorkoutAt: (lastLog && lastLog.at) || client.last_workout_at || null,
        completedWorkouts: logs.length
      },
      trend: null,
      unread: Number(client.unread_count || 0)
    },
    timeline: timeline.events,
    recentActivity: timeline.events.slice(0, 5)
  };
}

export const WorkspaceTestHelpers = Object.freeze({
  attentionRow,
  taskRow,
  timelineSpec,
  latestWeight,
  cleanText
});
