export const SESSION_TYPES = Object.freeze([
  "Coaching Call",
  "Check-in",
  "Review",
  "Consultation",
  "Custom Session",
  "Training Session"
]);

const APPOINTMENT_STATUSES = new Set(["scheduled", "completed", "cancelled"]);

function clean(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function asDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid appointment time.");
  return date;
}

export function normalizeSessionType(value) {
  const exact = SESSION_TYPES.find((type) => type === value);
  if (exact) return exact;
  const lower = String(value || "").toLowerCase();
  return SESSION_TYPES.find((type) => type.toLowerCase() === lower) || SESSION_TYPES[0];
}

export function appointmentRow(row) {
  return {
    id: String(row.id),
    clientId: row.client_id == null ? null : String(row.client_id),
    clientName: row.client_name || null,
    type: row.type,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timeZone: row.timezone,
    status: row.status,
    notes: row.notes || "",
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

export async function listAvailability(pool, coachId) {
  const result = await pool.query(
    `SELECT * FROM coach_availability_rules
     WHERE coach_user_id = $1
     ORDER BY weekday ASC, start_minute ASC`,
    [coachId]
  );
  return (result.rows || []).map((row) => ({
    id: String(row.id),
    weekday: Number(row.weekday),
    startMinute: Number(row.start_minute),
    endMinute: Number(row.end_minute),
    timeZone: row.timezone,
    sessionTypes: row.session_types || []
  }));
}

export async function saveAvailabilityRule(pool, coachId, input = {}) {
  const weekday = Number(input.weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error("Invalid weekday.");
  const startMinute = Number(input.startMinute);
  const endMinute = Number(input.endMinute);
  if (!(endMinute > startMinute)) throw new Error("Availability end must be after start.");
  const result = await pool.query(
    `INSERT INTO coach_availability_rules(
       coach_user_id, weekday, start_minute, end_minute, timezone, session_types
     ) VALUES($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      coachId,
      weekday,
      startMinute,
      endMinute,
      clean(input.timeZone || "UTC", 80),
      JSON.stringify((input.sessionTypes || SESSION_TYPES).map(normalizeSessionType))
    ]
  );
  return (await listAvailability(pool, coachId)).find((row) => row.id === String(result.rows[0].id));
}

export async function findAvailabilitySlots(pool, coachId, input = {}) {
  const day = new Date(input.date || Date.now());
  if (Number.isNaN(day.getTime())) throw new Error("Invalid date.");
  const weekday = day.getUTCDay();
  const rules = await listAvailability(pool, coachId);
  const exceptions = await pool.query(
    "SELECT * FROM coach_availability_exceptions WHERE coach_user_id = $1 AND day = $2",
    [coachId, day.toISOString().slice(0, 10)]
  );
  if (exceptions.rows[0] && exceptions.rows[0].available === false) return [];
  return rules.filter((rule) => rule.weekday === weekday).map((rule) => ({
    date: day.toISOString().slice(0, 10),
    startMinute: rule.startMinute,
    endMinute: rule.endMinute,
    timeZone: rule.timeZone,
    sessionTypes: rule.sessionTypes
  }));
}

export async function listAppointments(pool, coachId, options = {}) {
  const from = options.from || new Date(Date.now() - 7 * 86400000).toISOString();
  const to = options.to || new Date(Date.now() + 21 * 86400000).toISOString();
  const result = await pool.query(
    `SELECT a.*, c.display_name AS client_name
     FROM coach_appointments a
     LEFT JOIN coach_clients c ON c.id = a.client_id
     WHERE a.coach_user_id = $1 AND a.starts_at >= $2 AND a.starts_at < $3
     ORDER BY a.starts_at ASC`,
    [coachId, from, to]
  );
  return (result.rows || []).map(appointmentRow);
}

export async function createAppointment(pool, coachId, input = {}) {
  const type = normalizeSessionType(input.type);
  const startsAt = asDate(input.startsAt);
  const endsAt = input.endsAt ? asDate(input.endsAt) : new Date(startsAt.getTime() + 45 * 60000);
  if (endsAt <= startsAt) throw new Error("Appointment end must be after start.");
  const clash = await pool.query(
    `SELECT id FROM coach_appointments
     WHERE coach_user_id = $1 AND status = 'scheduled'
       AND tstzrange(starts_at, ends_at, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
     LIMIT 1`,
    [coachId, startsAt.toISOString(), endsAt.toISOString()]
  );
  if (clash.rows[0]) throw new Error("Appointment collides with an existing session.");
  const result = await pool.query(
    `INSERT INTO coach_appointments(
       coach_user_id, client_id, type, title, starts_at, ends_at, timezone, notes, created_by
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      coachId,
      input.clientId || null,
      type,
      clean(input.title || type, 160),
      startsAt.toISOString(),
      endsAt.toISOString(),
      clean(input.timeZone || "UTC", 80),
      clean(input.notes, 800) || null,
      clean(input.createdBy || "coach", 40)
    ]
  );
  await pool.query(
    `INSERT INTO coach_reminders(appointment_id, send_at)
     VALUES($1, $2::timestamptz - INTERVAL '60 minutes')
     ON CONFLICT DO NOTHING`,
    [result.rows[0].id, startsAt.toISOString()]
  );
  return appointmentRow(result.rows[0]);
}

export async function updateAppointment(pool, coachId, id, input = {}) {
  const status = input.status == null ? null : clean(input.status, 20);
  if (status && !APPOINTMENT_STATUSES.has(status)) throw new Error("Invalid appointment status.");
  const startsAt = input.startsAt ? asDate(input.startsAt) : null;
  const endsAt = input.endsAt ? asDate(input.endsAt) : null;
  if (startsAt && endsAt) {
    const clash = await pool.query(
      `SELECT id FROM coach_appointments
       WHERE coach_user_id = $1 AND id <> $2 AND status = 'scheduled'
         AND tstzrange(starts_at, ends_at, '[)') && tstzrange($3::timestamptz, $4::timestamptz, '[)')
       LIMIT 1`,
      [coachId, id, startsAt.toISOString(), endsAt.toISOString()]
    );
    if (clash.rows[0]) throw new Error("Appointment collides with an existing session.");
  }
  const result = await pool.query(
    `UPDATE coach_appointments
     SET title = COALESCE($3, title),
         starts_at = COALESCE($4, starts_at),
         ends_at = COALESCE($5, ends_at),
         status = COALESCE($6, status),
         notes = COALESCE($7, notes),
         cancelled_at = CASE WHEN $6 = 'cancelled' THEN NOW() ELSE cancelled_at END,
         updated_at = NOW()
     WHERE id = $1 AND coach_user_id = $2
     RETURNING *`,
    [
      id,
      coachId,
      input.title == null ? null : clean(input.title, 160),
      startsAt && startsAt.toISOString(),
      endsAt && endsAt.toISOString(),
      status,
      input.notes == null ? null : clean(input.notes, 800)
    ]
  );
  return result.rows[0] ? appointmentRow(result.rows[0]) : null;
}

export function toIcs(appointments, coachName = "Nurvan Coach") {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nurvan//Coach OS//IT"];
  for (const item of appointments || []) {
    lines.push(
      "BEGIN:VEVENT",
      "UID:appt-" + item.id + "@nurvan",
      "DTSTART:" + icsDate(item.startsAt),
      "DTEND:" + icsDate(item.endsAt),
      "SUMMARY:" + String(item.title || item.type).replace(/[,;]/g, " "),
      "DESCRIPTION:" + String(coachName).replace(/[,;]/g, " "),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function icsDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export const SchedulingTestHelpers = Object.freeze({ asDate, icsDate });
