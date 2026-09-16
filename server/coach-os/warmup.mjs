/**
 * Warm-Up Engine — coach template/assignment backend.
 *
 * This is the ONLY write surface for warm-up template/assignment structure.
 * The client-facing completion route (see coach-practice.mjs) only ever
 * calls recordWarmupCompletion, which writes to a separate table and cannot
 * touch a template or assignment's content - the "client cannot structurally
 * edit a coach-assigned warm-up" guarantee (spec section 15/42) holds
 * because there is no route capable of it, not because of a runtime check.
 */

function templateRow(row) {
  return {
    id: String(row.id),
    coachUserId: String(row.coach_user_id),
    name: row.name,
    description: row.description || '',
    source: row.source,
    targetSessionType: row.target_session_type,
    items: Array.isArray(row.items) ? row.items : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assignmentRow(row) {
  return {
    id: String(row.id),
    coachUserId: String(row.coach_user_id),
    clientId: String(row.client_id),
    templateId: row.template_id == null ? null : String(row.template_id),
    name: row.name,
    targetSessionType: row.target_session_type,
    items: Array.isArray(row.items) ? row.items : [],
    assignmentType: row.assignment_type,
    locked: !!row.locked,
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function completionRow(row) {
  return {
    id: String(row.id),
    assignmentId: String(row.assignment_id),
    clientId: String(row.client_id),
    sessionDate: row.session_date,
    status: row.status,
    completedItems: Array.isArray(row.completed_items) ? row.completed_items : [],
    totalItems: row.total_items,
    completedCount: row.completed_count,
    durationSeconds: row.duration_seconds,
    startedAt: row.started_at,
    completedAt: row.completed_at
  };
}

const VALID_SOURCES = ['auto_generated', 'manual', 'customized'];
const VALID_STATUSES = ['completed', 'partial', 'skipped'];

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 20).map(function (it, idx) {
    it = it && typeof it === 'object' ? it : {};
    const out = {
      exerciseId: String(it.exerciseId || it.exercise_id || '').slice(0, 100),
      name: String(it.name || '').slice(0, 200),
      category: String(it.category || '').slice(0, 60),
      orderIndex: idx,
      sets: Number.isFinite(Number(it.sets)) ? Number(it.sets) : 1,
      reps: it.reps == null ? null : (typeof it.reps === 'number' ? it.reps : String(it.reps).slice(0, 40)),
      durationSeconds: it.durationSeconds == null ? null : (Number(it.durationSeconds) || null),
      restSeconds: Number.isFinite(Number(it.restSeconds)) ? Number(it.restSeconds) : 0,
      intensity: it.intensity ? String(it.intensity).slice(0, 40) : null,
      notes: it.notes ? String(it.notes).slice(0, 400) : ''
    };
    if (Array.isArray(it.rampUp) && it.rampUp.length) {
      out.rampUp = it.rampUp.slice(0, 10).map(function (s) {
        return { load: Number(s && s.load) || 0, reps: Number(s && s.reps) || 1 };
      });
    }
    return out;
  });
}

export async function listWarmupTemplates(pool, coachUserId) {
  const q = await pool.query(
    "SELECT * FROM coach_warmup_templates WHERE coach_user_id = $1 ORDER BY updated_at DESC",
    [coachUserId]
  );
  return q.rows.map(templateRow);
}

export async function createWarmupTemplate(pool, coachUserId, input = {}) {
  const name = String(input.name || 'Warm-up').trim().slice(0, 200) || 'Warm-up';
  const description = input.description ? String(input.description).trim().slice(0, 1000) : null;
  const source = VALID_SOURCES.includes(input.source) ? input.source : 'manual';
  const targetSessionType = input.targetSessionType ? String(input.targetSessionType).slice(0, 60) : null;
  const items = sanitizeItems(input.items);
  const q = await pool.query(
    `INSERT INTO coach_warmup_templates(coach_user_id, name, description, source, target_session_type, items)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [coachUserId, name, description, source, targetSessionType, JSON.stringify(items)]
  );
  return templateRow(q.rows[0]);
}

export async function updateWarmupTemplate(pool, coachUserId, templateId, input = {}) {
  const existing = await pool.query(
    "SELECT * FROM coach_warmup_templates WHERE id = $1 AND coach_user_id = $2",
    [templateId, coachUserId]
  );
  if (!existing.rows[0]) return null;
  const cur = existing.rows[0];
  const name = input.name != null ? (String(input.name).trim().slice(0, 200) || cur.name) : cur.name;
  const description = input.description !== undefined
    ? (input.description ? String(input.description).trim().slice(0, 1000) : null)
    : cur.description;
  const items = input.items !== undefined ? sanitizeItems(input.items) : cur.items;
  const source = VALID_SOURCES.includes(input.source) ? input.source : cur.source;
  const q = await pool.query(
    `UPDATE coach_warmup_templates SET name=$3, description=$4, items=$5, source=$6, updated_at=NOW()
     WHERE id = $1 AND coach_user_id = $2 RETURNING *`,
    [templateId, coachUserId, name, description, JSON.stringify(items), source]
  );
  return templateRow(q.rows[0]);
}

export async function deleteWarmupTemplate(pool, coachUserId, templateId) {
  const q = await pool.query(
    "DELETE FROM coach_warmup_templates WHERE id = $1 AND coach_user_id = $2 RETURNING id",
    [templateId, coachUserId]
  );
  return !!q.rows[0];
}

// Assigning replaces the client's previous active assignment (deactivated,
// never deleted, so completion history stays intact for analytics) -
// mirrors how a new training-program assignment archives the old one.
export async function assignWarmupToClient(pool, coachUserId, clientId, input = {}) {
  const assignmentType = input.assignmentType === 'mandatory' ? 'mandatory' : 'optional';
  let name = input.name;
  let items = input.items;
  let targetSessionType = input.targetSessionType || null;
  const templateId = input.templateId ? Number(input.templateId) : null;
  if (templateId) {
    const t = await pool.query(
      "SELECT * FROM coach_warmup_templates WHERE id = $1 AND coach_user_id = $2",
      [templateId, coachUserId]
    );
    if (!t.rows[0]) throw new Error("Template non trovato.");
    name = name || t.rows[0].name;
    items = items || t.rows[0].items;
    targetSessionType = targetSessionType || t.rows[0].target_session_type;
  }
  items = sanitizeItems(items);
  if (!items.length) throw new Error("Il warm-up da assegnare non ha esercizi.");
  name = String(name || 'Warm-up').trim().slice(0, 200) || 'Warm-up';

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query(
      "UPDATE coach_warmup_assignments SET active = false, updated_at = NOW() WHERE client_id = $1 AND active = true",
      [clientId]
    );
    const q = await db.query(
      `INSERT INTO coach_warmup_assignments(coach_user_id, client_id, template_id, name, target_session_type, items, assignment_type, locked, active)
       VALUES($1,$2,$3,$4,$5,$6,$7,true,true) RETURNING *`,
      [coachUserId, clientId, templateId, name, targetSessionType, JSON.stringify(items), assignmentType]
    );
    await db.query("COMMIT");
    return assignmentRow(q.rows[0]);
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  } finally {
    db.release();
  }
}

export async function deactivateWarmupAssignment(pool, coachUserId, clientId) {
  const q = await pool.query(
    "UPDATE coach_warmup_assignments SET active = false, updated_at = NOW() WHERE client_id = $1 AND coach_user_id = $2 AND active = true RETURNING id",
    [clientId, coachUserId]
  );
  return q.rows.length;
}

export async function getActiveAssignmentForClient(pool, clientId) {
  const q = await pool.query(
    "SELECT * FROM coach_warmup_assignments WHERE client_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1",
    [clientId]
  );
  return q.rows[0] ? assignmentRow(q.rows[0]) : null;
}

// Idempotent by design: the same (assignmentId, sessionDate) always upserts
// the same row, so a retried/duplicated offline sync of
// WARMUP_EXERCISE_COMPLETED never creates a duplicate (spec section 18).
export async function recordWarmupCompletion(pool, assignmentId, clientId, input = {}) {
  const sessionDate = /^\d{4}-\d{2}-\d{2}$/.test(String(input.sessionDate || ''))
    ? input.sessionDate
    : new Date().toISOString().slice(0, 10);
  const status = VALID_STATUSES.includes(input.status) ? input.status : 'partial';
  const completedItems = Array.isArray(input.completedItems) ? input.completedItems.slice(0, 20) : [];
  const totalItems = Number.isFinite(Number(input.totalItems)) ? Number(input.totalItems) : completedItems.length;
  const completedCount = Number.isFinite(Number(input.completedCount))
    ? Number(input.completedCount)
    : completedItems.filter(function (i) { return i && i.completed; }).length;
  const durationSeconds = Number.isFinite(Number(input.durationSeconds)) ? Number(input.durationSeconds) : null;
  const startedAt = input.startedAt || null;
  const completedAt = status === 'completed' ? (input.completedAt || new Date().toISOString()) : null;
  const q = await pool.query(
    `INSERT INTO coach_warmup_completions(
       assignment_id, client_id, session_date, status, completed_items,
       total_items, completed_count, duration_seconds, started_at, completed_at
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (assignment_id, session_date) DO UPDATE SET
       status = EXCLUDED.status,
       completed_items = EXCLUDED.completed_items,
       total_items = EXCLUDED.total_items,
       completed_count = EXCLUDED.completed_count,
       duration_seconds = EXCLUDED.duration_seconds,
       started_at = COALESCE(coach_warmup_completions.started_at, EXCLUDED.started_at),
       completed_at = EXCLUDED.completed_at,
       updated_at = NOW()
     RETURNING *`,
    [assignmentId, clientId, sessionDate, status, JSON.stringify(completedItems), totalItems, completedCount, durationSeconds, startedAt, completedAt]
  );
  return completionRow(q.rows[0]);
}

// Pure-function exports for unit testing without a live Postgres connection
// (same convention as CheckInTestHelpers in checkins.mjs).
export const WarmupTestHelpers = { sanitizeItems, templateRow, assignmentRow, completionRow };

export async function listWarmupCompletionsForClient(pool, clientId, limit) {
  const q = await pool.query(
    "SELECT * FROM coach_warmup_completions WHERE client_id = $1 ORDER BY session_date DESC LIMIT $2",
    [clientId, Math.min(100, Number(limit) || 30)]
  );
  return q.rows.map(completionRow);
}
