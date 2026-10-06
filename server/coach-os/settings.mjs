// The coach's own questionnaire for new clients, and the other settings that belong to the coach.
//
// The app asks a new client a fixed list of questions (INTAKE_KEYS in coach-practice.mjs): the program generator, the
// assignment filters and the client sheet read them. A coach changes it without breaking those: any of the fixed
// questions can be hidden, made optional or required, renamed, and its choices rewritten; and the coach adds questions
// of their own - open (free text), one choice, several choices (the choices decided first). The coach's own questions are
// answered into intake.custom, as [{ id, label, type, answer }]: the label travels with the answer, so a later change of
// the question does not rewrite what a client said.
export const CUSTOM_TYPES = ["text", "choice", "multi"];
const MAX_CUSTOM = 30;
const MAX_OPTIONS = 30;

const cleanText = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function emptyIntakeConfig() {
  return { hidden: [], overrides: {}, custom: [] };
}

function cleanOptions(list) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const o = cleanText(raw, 60);
    if (!o || seen.has(o.toLowerCase())) continue;
    seen.add(o.toLowerCase());
    out.push(o);
    if (out.length >= MAX_OPTIONS) break;
  }
  return out;
}

// builtinKeys: the fixed questions' keys (INTAKE_KEYS); selectKeys: those that are a list of choices.
export function sanitizeIntakeConfig(raw, builtinKeys, selectKeys) {
  const out = emptyIntakeConfig();
  if (!raw || typeof raw !== "object") return out;
  const known = new Set(builtinKeys);
  const selects = new Set(selectKeys);
  out.hidden = [...new Set((Array.isArray(raw.hidden) ? raw.hidden : []).map(String).filter((k) => known.has(k)))];
  const ov = raw.overrides && typeof raw.overrides === "object" ? raw.overrides : {};
  for (const key of Object.keys(ov)) {
    if (!known.has(key) || !ov[key] || typeof ov[key] !== "object") continue;
    const o = {};
    const label = cleanText(ov[key].label, 80);
    if (label) o.label = label;
    if (typeof ov[key].required === "boolean") o.required = ov[key].required;
    if (selects.has(key)) {
      const options = cleanOptions(ov[key].options);
      if (options.length >= 2) o.options = options;
    }
    if (Object.keys(o).length) out.overrides[key] = o;
  }
  const ids = new Set();
  for (const q of Array.isArray(raw.custom) ? raw.custom : []) {
    if (!q || typeof q !== "object") continue;
    const type = CUSTOM_TYPES.includes(String(q.type)) ? String(q.type) : "text";
    const label = cleanText(q.label, 120);
    if (!label) continue;
    let id = String(q.id || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
    if (!id || ids.has(id)) id = "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    ids.add(id);
    const entry = { id, label, type, required: !!q.required };
    if (type !== "text") {
      entry.options = cleanOptions(q.options);
      if (entry.options.length < 2) continue;   // a choice with fewer than two choices is not a question
    }
    out.custom.push(entry);
    if (out.custom.length >= MAX_CUSTOM) break;
  }
  return out;
}

// What a client answered to the coach's own questions. raw: { id: answer } (what the form sends) or the stored list.
export function sanitizeCustomAnswers(raw, config) {
  const stored = Array.isArray(raw);
  const questions = (config && Array.isArray(config.custom)) ? config.custom : [];
  const out = [];
  if (stored) {
    for (const e of raw.slice(0, MAX_CUSTOM)) {
      if (!e || typeof e !== "object") continue;
      const type = CUSTOM_TYPES.includes(String(e.type)) ? String(e.type) : "text";
      const id = String(e.id || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
      const label = cleanText(e.label, 120);
      if (!id || !label) continue;
      const answer = Array.isArray(e.answer) ? e.answer.map((x) => cleanText(x, 80)).filter(Boolean).slice(0, MAX_OPTIONS) : cleanText(e.answer, 500);
      out.push({ id, label, type, answer });
    }
    return out;
  }
  if (!raw || typeof raw !== "object") return out;
  for (const q of questions) {
    const v = raw[q.id];
    if (v == null || v === "") continue;
    if (q.type === "text") {
      const t = cleanText(v, 500);
      if (t) out.push({ id: q.id, label: q.label, type: "text", answer: t });
    } else if (q.type === "choice") {
      const t = cleanText(v, 80);
      if (q.options.includes(t)) out.push({ id: q.id, label: q.label, type: "choice", answer: t });
    } else {
      const picked = (Array.isArray(v) ? v : [v]).map((x) => cleanText(x, 80)).filter((x) => q.options.includes(x));
      if (picked.length) out.push({ id: q.id, label: q.label, type: "multi", answer: [...new Set(picked)] });
    }
  }
  return out;
}

// Which questions must be answered, for this coach: the fixed required ones that are not hidden or relaxed, the fixed
// optional ones the coach made required, and the coach's own required questions.
export function requiredKeys(defaultRequired, builtinKeys, config) {
  const cfg = config || emptyIntakeConfig();
  const hidden = new Set(cfg.hidden || []);
  const out = [];
  for (const key of builtinKeys) {
    if (hidden.has(key)) continue;
    const o = (cfg.overrides || {})[key];
    const required = o && typeof o.required === "boolean" ? o.required : defaultRequired.includes(key);
    if (required) out.push(key);
  }
  return out;
}

export async function getIntakeConfig(pool, coachId) {
  try {
    const r = await pool.query("SELECT intake_config FROM coach_settings WHERE coach_user_id = $1", [coachId]);
    const cfg = r.rows[0] && r.rows[0].intake_config;
    return cfg && typeof cfg === "object" ? cfg : emptyIntakeConfig();
  } catch (_) {
    return emptyIntakeConfig();
  }
}

export async function saveIntakeConfig(pool, coachId, config) {
  await pool.query(
    `INSERT INTO coach_settings(coach_user_id, intake_config, updated_at) VALUES($1,$2::jsonb,NOW())
     ON CONFLICT (coach_user_id) DO UPDATE SET intake_config = EXCLUDED.intake_config, updated_at = NOW()`,
    [coachId, JSON.stringify(config)]
  );
  return config;
}

// How the coach is notified: a push for each thing ("instant"), or one a day with what is waiting ("digest").
export const NOTIFY_MODES = ["instant", "digest"];
export function cleanNotify(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const mode = NOTIFY_MODES.includes(String(r.mode)) ? String(r.mode) : "instant";
  const hour = Math.max(6, Math.min(22, Math.round(Number(r.hour)) || 18));
  return { mode, hour };
}

export async function getNotifySettings(pool, coachId) {
  try {
    const r = await pool.query("SELECT notify_mode, notify_hour FROM coach_settings WHERE coach_user_id = $1", [coachId]);
    const row = r.rows[0];
    return row ? cleanNotify({ mode: row.notify_mode, hour: row.notify_hour }) : cleanNotify({});
  } catch (_) {
    return cleanNotify({});
  }
}

export async function saveNotifySettings(pool, coachId, raw) {
  const n = cleanNotify(raw);
  await pool.query(
    `INSERT INTO coach_settings(coach_user_id, notify_mode, notify_hour, updated_at) VALUES($1,$2,$3,NOW())
     ON CONFLICT (coach_user_id) DO UPDATE SET notify_mode = EXCLUDED.notify_mode, notify_hour = EXCLUDED.notify_hour, updated_at = NOW()`,
    [coachId, n.mode, n.hour]
  );
  return n;
}

// The text of the daily digest from what is waiting: clients with something unread, the total, requests to answer.
export function digestText(waiting) {
  const clients = Number(waiting && waiting.clients) || 0;
  const total = Number(waiting && waiting.total) || 0;
  const requests = Number(waiting && waiting.requests) || 0;
  if (!clients || !total) return null;
  const parts = [total + (total === 1 ? " novità" : " novità") + " da " + clients + (clients === 1 ? " cliente" : " clienti")];
  if (requests) parts.push(requests + (requests === 1 ? " richiesta da valutare" : " richieste da valutare"));
  return parts.join(" · ");
}
