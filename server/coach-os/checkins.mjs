import { savePrivateMedia } from "../media/private-store.mjs";
import { buildDeterministicIntelligence } from "./intelligence.mjs";

function checkInRow(row) {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    clientName: row.client_name || null,
    status: row.status,
    requestedAt: row.requested_at,
    receivedAt: row.received_at,
    reviewedAt: row.reviewed_at,
    weight: row.weight == null ? null : Number(row.weight),
    notes: row.notes || "",
    trainingAdherence: row.training_adherence == null ? null : Number(row.training_adherence),
    nutritionAdherence: row.nutrition_adherence == null ? null : Number(row.nutrition_adherence),
    deterministicSummary: row.deterministic_summary || {},
    aiSummary: row.ai_summary || null,
    coachResponse: row.coach_response || "",
    previousCheckInId: row.previous_check_in_id == null ? null : String(row.previous_check_in_id),
    answers: row.answers || {},
    attachment: row.attachment || null,
    kind: row.kind || "scheduled",
    scheduledFor: row.scheduled_for || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function clampPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : null;
}

const CADENCES = ["weekly", "biweekly", "monthly"];
const ROW_TYPES = ["weight", "photos", "scale", "yesno", "number", "text"];

function cleanText(value, max) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
}

/**
 * The coach's model, as stored on coach_clients.checkin_template. Same shape
 * as web/checkin-schedule.js normalizeTemplate; null when unusable.
 */
export function sanitizeCheckInTemplate(input, { customized = true, previous = null, now = new Date() } = {}) {
  if (!input || typeof input !== "object") return null;
  const time = /^([01]?\d|2[0-3]):([0-5]\d)$/.test(String(input.time || "")) ? String(input.time).padStart(5, "0") : "18:00";
  const weekday = Number(input.weekday);
  const seen = new Set();
  const rows = (Array.isArray(input.rows) ? input.rows : []).slice(0, 30).map((row, i) => ({
    id: cleanText(row && row.id, 40) || "c_" + i,
    type: ROW_TYPES.includes(row && row.type) ? row.type : "scale",
    label: cleanText(row && row.label, 120) || "Domanda",
    on: !(row && row.on === false),
    coachQuestion: !!(row && row.coachQuestion)
  })).filter((row) => (seen.has(row.id) ? false : seen.add(row.id)));
  if (!rows.length) return null;
  const template = {
    cadence: CADENCES.includes(input.cadence) ? input.cadence : "weekly",
    weekday: Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : 0,
    time,
    rows,
    customized: !!customized,
    since: null
  };
  // The calendar restarts when its rhythm changes; otherwise it keeps its
  // start, so every-other-week stays on the same weeks.
  const sameRhythm = previous && previous.since && previous.cadence === template.cadence &&
    Number(previous.weekday) === template.weekday && previous.time === template.time;
  template.since = sameRhythm ? String(previous.since).slice(0, 10) : new Date(now).toISOString().slice(0, 10);
  return template;
}

// What the athlete answered: only the rows of the model, of the right type.
export function sanitizeCheckInAnswers(input, template) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  const rows = template && Array.isArray(template.rows) ? template.rows : [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const [key, value] of Object.entries(input).slice(0, 40)) {
    const row = byId.get(key);
    const type = row ? row.type : (/^(sleep|energy|hunger|pain|adh_nutrition|adh_training)$/.test(key) ? "scale" : (key === "question" ? "text" : null));
    if (!type || value === null || value === undefined || value === "") continue;
    if (type === "scale") {
      const n = Math.round(Number(value));
      if (n >= 1 && n <= 5) out[key] = n;
    } else if (type === "number") {
      const n = Number(String(value).replace(",", "."));
      if (Number.isFinite(n) && Math.abs(n) < 1e7) out[key] = n;
    } else if (type === "yesno") {
      if (value === true || value === "yes" || value === "si") out[key] = true;
      else if (value === false || value === "no") out[key] = false;
    } else if (type === "text") {
      const t = cleanText(value, 2000);
      if (t) out[key] = t;
    }
  }
  return out;
}

// The attachment computed on the phone: numbers only, a fixed shape.
export function sanitizeCheckInAttachment(input) {
  if (!input || typeof input !== "object") return null;
  const n = (v, max = 1e6) => {
    const x = Number(v);
    return v === null || v === undefined || v === "" || !Number.isFinite(x) || x < 0 || x > max ? null : Math.round(x * 10) / 10;
  };
  const macro = (m) => (m && typeof m === "object" ? { kcal: n(m.kcal), pro: n(m.pro), carb: n(m.carb), fat: n(m.fat) } : null);
  const nut = input.nutrition || {};
  const tr = input.training || {};
  const rec = input.recovery || {};
  const average = macro(nut.average);
  if (average && nut.average.partial) average.partial = true;
  const target = macro(nut.target);
  if (target && nut.target.source) target.source = cleanText(nut.target.source, 30);
  return {
    period: "7 giorni",
    nutrition: { average, target, loggedDays: n(nut.loggedDays, 7), emptyDays: n(nut.emptyDays, 7) },
    training: { done: n(tr.done, 100), planned: n(tr.planned, 100) },
    recovery: { avgRestSec: n(rec.avgRestSec, 3600) }
  };
}

/**
 * "Applica a tutti": the other athletes of this coach get the model, except
 * those whose model the coach customized. Returns { updated, kept }.
 */
export async function applyCheckInTemplateToAll(pool, coachId, sourceClientId, template) {
  const rows = await pool.query(
    `SELECT id, checkin_template FROM coach_clients
     WHERE coach_user_id = $1 AND status <> 'removed' AND id <> $2`,
    [coachId, sourceClientId]
  );
  const updated = [];
  const kept = [];
  for (const row of rows.rows || []) {
    if (row.checkin_template && row.checkin_template.customized) {
      kept.push(String(row.id));
      continue;
    }
    const copy = sanitizeCheckInTemplate(template, { customized: false, previous: row.checkin_template });
    await pool.query(
      "UPDATE coach_clients SET checkin_template = $2 WHERE id = $1 AND coach_user_id = $3",
      [row.id, JSON.stringify(copy), coachId]
    );
    updated.push(String(row.id));
  }
  return { updated, kept };
}

// How many athletes "Applica a tutti" would change, for the confirmation.
export async function countApplyCheckInTemplate(pool, coachId, sourceClientId) {
  const rows = await pool.query(
    `SELECT checkin_template FROM coach_clients
     WHERE coach_user_id = $1 AND status <> 'removed' AND id <> $2`,
    [coachId, sourceClientId]
  );
  let update = 0;
  let keep = 0;
  for (const row of rows.rows || []) {
    if (row.checkin_template && row.checkin_template.customized) keep += 1;
    else update += 1;
  }
  return { update, keep };
}

// Every check-in of one athlete, for the coach's list (not the superseded requests).
export async function listCoachClientCheckIns(pool, coachId, clientId, options = {}) {
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 40));
  const result = await pool.query(
    `SELECT ci.*, c.display_name AS client_name
     FROM coach_check_ins ci
     JOIN coach_clients c ON c.id = ci.client_id
     WHERE ci.coach_user_id = $1 AND ci.client_id = $2 AND ci.status <> 'superseded'
     ORDER BY COALESCE(ci.received_at, ci.requested_at, ci.created_at) DESC
     LIMIT $3`,
    [coachId, clientId, limit]
  );
  return (result.rows || []).map(checkInRow);
}

export async function createCheckInRequest(pool, coachId, clientId, input = {}) {
  const previous = await pool.query(
    `SELECT id FROM coach_check_ins
     WHERE coach_user_id = $1 AND client_id = $2
     ORDER BY COALESCE(received_at, requested_at, created_at) DESC LIMIT 1`,
    [coachId, clientId]
  );
  const result = await pool.query(
    `INSERT INTO coach_check_ins(
       coach_user_id, client_id, status, requested_at, notes, previous_check_in_id
     ) VALUES($1,$2,'requested',NOW(),$3,$4)
     RETURNING *`,
    [
      coachId,
      clientId,
      String(input.note || "").trim().slice(0, 1200) || null,
      previous.rows[0]?.id || null
    ]
  );
  return checkInRow(result.rows[0]);
}

export async function submitClientCheckIn(pool, client, accountData, input = {}) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const pending = await db.query(
      `SELECT id FROM coach_check_ins
       WHERE coach_user_id = $1 AND client_id = $2 AND status = 'requested'
       ORDER BY requested_at DESC LIMIT 1`,
      [client.coach_user_id, client.id]
    );
    const previous = await db.query(
      `SELECT id FROM coach_check_ins
       WHERE coach_user_id = $1 AND client_id = $2 AND status IN ('received','reviewed')
       ORDER BY COALESCE(received_at, created_at) DESC LIMIT 1`,
      [client.coach_user_id, client.id]
    );
    const deterministic = buildDeterministicIntelligence(client, accountData || {});
    const attachment = sanitizeCheckInAttachment(input.attachment);
    const scheduledAt = input.kind === "scheduled" && input.scheduledFor ? new Date(input.scheduledFor) : null;
    const scheduledFor = scheduledAt && Number.isFinite(scheduledAt.getTime()) ? scheduledAt.toISOString() : null;
    const result = await db.query(
      `INSERT INTO coach_check_ins(
         coach_user_id, client_id, status, requested_at, received_at,
         weight, notes, training_adherence, nutrition_adherence,
         deterministic_summary, previous_check_in_id,
         answers, attachment, kind, scheduled_for
       ) VALUES(
         $1,$2,'received',
         COALESCE((SELECT requested_at FROM coach_check_ins WHERE id = $3), NOW()),
         NOW(),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
       )
       RETURNING *`,
      [
        client.coach_user_id,
        client.id,
        pending.rows[0]?.id || null,
        Number(input.weight) > 0 ? Number(input.weight) : null,
        String(input.notes || "").trim().slice(0, 4000) || null,
        clampPercent(input.trainingAdherence),
        clampPercent(input.nutritionAdherence),
        JSON.stringify({
          formulaVersion: deterministic.formulaVersion,
          signals: deterministic.signals,
          derivedMetrics: deterministic.derivedMetrics,
          provenance: deterministic.provenance
        }),
        previous.rows[0]?.id || null,
        JSON.stringify(sanitizeCheckInAnswers(input.answers, client.checkin_template)),
        attachment ? JSON.stringify(attachment) : null,
        input.kind === "extra" ? "extra" : (input.kind === "scheduled" ? "scheduled" : null),
        scheduledFor
      ]
    );
    const checkIn = result.rows[0];
    if (pending.rows[0]) {
      await db.query(
        "UPDATE coach_check_ins SET status = 'superseded', updated_at = NOW() WHERE id = $1",
        [pending.rows[0].id]
      );
    }

    const media = [];
    const inputs = Array.isArray(input.media)
      ? input.media.slice(0, 4).map((item) => ({ ...item, kind: ["front", "side", "back"].includes(item && item.kind) ? item.kind : "photo" }))
      : [];
    for (const item of inputs) {
      const stored = await savePrivateMedia(db, {
        ...item,
        coachUserId: client.coach_user_id,
        clientId: client.id,
        domain: "check-in"
      });
      await db.query(
        `INSERT INTO coach_check_in_media(check_in_id, media_id, kind)
         VALUES($1,$2,$3)`,
        [checkIn.id, stored.id, stored.kind]
      );
      media.push(stored);
    }

    await db.query(
      `INSERT INTO coach_tasks(
         coach_user_id, client_id, source, title, due_at, priority, status,
         created_by, source_entity_type, source_entity_id
       ) VALUES($1,$2,'check-in',$3,NOW(),'high','open','system','check_in',$4)`,
      [client.coach_user_id, client.id, `Review ${client.display_name || "client"} check-in`, String(checkIn.id)]
    );
    await db.query(
      `INSERT INTO coach_events(client_id, kind, payload)
       VALUES($1,'check_in_received',$2)`,
      [client.id, JSON.stringify({ checkInId: String(checkIn.id), weight: input.weight || null })]
    );
    await db.query("COMMIT");
    return { checkIn: checkInRow(checkIn), media };
  } catch (error) {
    try { await db.query("ROLLBACK"); } catch (_) {}
    throw error;
  } finally {
    db.release();
  }
}

export async function listCoachCheckIns(pool, coachId, options = {}) {
  const status = String(options.status || "to_review");
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 30));
  const statusMap = {
    requested: ["requested"],
    received: ["received"],
    to_review: ["received"],
    reviewed: ["reviewed"]
  };
  const statuses = statusMap[status] || ["received"];
  const result = await pool.query(
    `SELECT ci.*, c.display_name AS client_name
     FROM coach_check_ins ci
     JOIN coach_clients c ON c.id = ci.client_id
     WHERE ci.coach_user_id = $1 AND ci.status = ANY($2::text[])
     ORDER BY COALESCE(ci.received_at, ci.requested_at, ci.created_at) DESC
     LIMIT $3`,
    [coachId, statuses, limit]
  );
  return (result.rows || []).map(checkInRow);
}

export async function getCoachCheckIn(pool, coachId, checkInId) {
  const result = await pool.query(
    `SELECT ci.*, c.display_name AS client_name
     FROM coach_check_ins ci
     JOIN coach_clients c ON c.id = ci.client_id
     WHERE ci.id = $1 AND ci.coach_user_id = $2`,
    [checkInId, coachId]
  );
  if (!result.rows[0]) return null;
  const mediaResult = await pool.query(
    `SELECT m.id, m.kind, m.content_type, m.byte_size, m.checksum,
            m.retention_until, m.revoked_at
     FROM coach_check_in_media cim
     JOIN coach_media_objects m ON m.id = cim.media_id
     WHERE cim.check_in_id = $1 AND m.revoked_at IS NULL
       AND m.retention_until > NOW()
     ORDER BY cim.id ASC`,
    [checkInId]
  );
  const previous = result.rows[0].previous_check_in_id
    ? await pool.query(
      `SELECT id, weight, notes, received_at, coach_response, answers, kind
       FROM coach_check_ins WHERE id = $1 AND coach_user_id = $2`,
      [result.rows[0].previous_check_in_id, coachId]
    )
    : { rows: [] };
  return {
    ...checkInRow(result.rows[0]),
    media: (mediaResult.rows || []).map((row) => ({
      id: row.id,
      kind: row.kind,
      contentType: row.content_type,
      byteSize: Number(row.byte_size),
      checksum: row.checksum,
      retentionUntil: row.retention_until
    })),
    previous: previous.rows[0] || null
  };
}

export async function reviewCoachCheckIn(pool, coachId, checkInId, input = {}) {
  const response = String(input.response || "").trim().slice(0, 5000);
  if (!response && input.markRead) {
    // Read, nothing to add: out of "da leggere", any earlier reply kept.
    const read = await pool.query(
      `UPDATE coach_check_ins
       SET status = 'reviewed', reviewed_at = COALESCE(reviewed_at, NOW()), updated_at = NOW()
       WHERE id = $1 AND coach_user_id = $2 AND status IN ('received','reviewed')
       RETURNING *`,
      [checkInId, coachId]
    );
    return read.rows[0] ? checkInRow(read.rows[0]) : null;
  }
  if (!response) throw new Error("Coach response is required.");
  const result = await pool.query(
    `UPDATE coach_check_ins
     SET status = 'reviewed', coach_response = $3, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND coach_user_id = $2 AND status IN ('received','reviewed')
     RETURNING *`,
    [checkInId, coachId, response]
  );
  return result.rows[0] ? checkInRow(result.rows[0]) : null;
}

export async function listClientCheckIns(pool, clientId, options = {}) {
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 20));
  const result = await pool.query(
    `SELECT * FROM coach_check_ins
     WHERE client_id = $1 AND status <> 'superseded'
     ORDER BY COALESCE(received_at, requested_at, created_at) DESC
     LIMIT $2`,
    [clientId, limit]
  );
  return (result.rows || []).map(checkInRow);
}

export const CheckInTestHelpers = Object.freeze({
  checkInRow,
  clampPercent,
  sanitizeCheckInTemplate,
  sanitizeCheckInAnswers,
  sanitizeCheckInAttachment
});
