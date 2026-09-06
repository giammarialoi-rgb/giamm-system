function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(min, Math.min(max, number));
}

export function estimateMealFromHints(input = {}) {
  const protein = clamp(input.protein, 0, 250);
  const carbs = clamp(input.carbs, 0, 400);
  const fats = clamp(input.fats, 0, 200);
  const calories = protein != null && carbs != null && fats != null
    ? Math.round(protein * 4 + carbs * 4 + fats * 9)
    : clamp(input.calories, 0, 3000);
  const confidence = protein != null && carbs != null && fats != null ? 0.62 : 0.35;
  return {
    calories,
    protein,
    carbs,
    fats,
    confidence,
    needsConfirmation: true,
    diagnosis: false,
    source: "heuristic_estimate"
  };
}

export async function createMealEstimate(pool, owner, input = {}) {
  const estimated = estimateMealFromHints(input);
  const result = await pool.query(
    `INSERT INTO meal_logs(coach_user_id, client_id, user_id, media_id, estimated, status)
     VALUES($1,$2,$3,$4,$5,'estimated')
     RETURNING *`,
    [owner.coachUserId || null, owner.clientId || null, owner.userId || null, input.mediaId || null, JSON.stringify(estimated)]
  );
  return mealRow(result.rows[0]);
}

export async function confirmMealLog(pool, id, owner, confirmed = {}) {
  const existing = await pool.query("SELECT * FROM meal_logs WHERE id = $1", [id]);
  const row = existing.rows[0];
  if (!row) return null;
  if (owner.userId && row.user_id && String(row.user_id) !== String(owner.userId)) return null;
  if (owner.clientId && row.client_id && String(row.client_id) !== String(owner.clientId)) return null;
  const payload = {
    calories: clamp(confirmed.calories, 0, 3000),
    protein: clamp(confirmed.protein, 0, 250),
    carbs: clamp(confirmed.carbs, 0, 400),
    fats: clamp(confirmed.fats, 0, 200)
  };
  const updated = await pool.query(
    `UPDATE meal_logs
     SET confirmed = $2, status = 'logged', confirmed_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, JSON.stringify(payload)]
  );
  return mealRow(updated.rows[0]);
}

export async function createFormReview(pool, coachId, input = {}) {
  const result = await pool.query(
    `INSERT INTO form_reviews(coach_user_id, client_id, media_id, exercise, markers, feedback)
     VALUES($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      coachId,
      input.clientId,
      input.mediaId || null,
      String(input.exercise || "").slice(0, 80) || null,
      JSON.stringify(Array.isArray(input.markers) ? input.markers : []),
      String(input.feedback || "").slice(0, 2000) || null
    ]
  );
  return reviewRow(result.rows[0]);
}

function mealRow(row) {
  return {
    id: String(row.id),
    status: row.status,
    estimated: row.estimated || {},
    confirmed: row.confirmed || null,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at
  };
}

function reviewRow(row) {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    exercise: row.exercise,
    markers: row.markers || [],
    feedback: row.feedback || "",
    status: row.status
  };
}

export const MediaAiTestHelpers = Object.freeze({ estimateMealFromHints });
