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
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function clampPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : null;
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
    const result = await db.query(
      `INSERT INTO coach_check_ins(
         coach_user_id, client_id, status, requested_at, received_at,
         weight, notes, training_adherence, nutrition_adherence,
         deterministic_summary, previous_check_in_id
       ) VALUES(
         $1,$2,'received',
         COALESCE((SELECT requested_at FROM coach_check_ins WHERE id = $3), NOW()),
         NOW(),$4,$5,$6,$7,$8,$9
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
        previous.rows[0]?.id || null
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
    const inputs = Array.isArray(input.media) ? input.media.slice(0, 4) : [];
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
      `SELECT id, weight, notes, received_at, coach_response
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
  clampPercent
});
