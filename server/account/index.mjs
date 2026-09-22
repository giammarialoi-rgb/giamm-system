/**
 * Merge logic for the cross-device account data blob (app_account_data.data).
 * Pulled out of coach-api.mjs so it can be unit-tested without importing the
 * server entrypoint itself (which binds a port as a side effect of import).
 */

import fs from "node:fs";
import vm from "node:vm";

// The app's own merge (web/domain-merge.js), run here unchanged so the phone
// and the server combine two copies of a record the same way.
function loadDomainMerge() {
  const sandbox = {};
  sandbox.self = sandbox;
  vm.runInNewContext(fs.readFileSync(new URL("../../web/domain-merge.js", import.meta.url), "utf8"), sandbox);
  return sandbox.NurvanDomainMerge;
}
export const DomainMerge = loadDomainMerge();
export const NutritionMerge = DomainMerge.forDomain("nutrition");
export const MERGED_DOMAINS = ["nutrition", "supplementation", "therapy", "exams"];

const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);

// A sync from an app that tracks item ids (__v) never loses an entry to a
// stale copy: both sides are combined item by item. Copies from an app that
// predates that keep the old rules, including its explicit clear.
function mergeSyncedDomain(cur, inc, key) {
  const curVal = cur[key];
  const incVal = inc[key];
  const aware = DomainMerge.isMergeAware(curVal) || DomainMerge.isMergeAware(incVal);
  if (!aware) return mergeDomainField(cur, inc, key);
  if (incVal && !DomainMerge.isMergeAware(incVal) && (incVal.cleared || incVal.isCleared)) return incVal;
  if (!isObj(incVal)) return curVal !== undefined ? curVal : incVal;
  if (!isObj(curVal)) return incVal;
  return DomainMerge.merge(curVal, incVal, key);
}

// What a coach or athlete sends for one domain of an athlete's record, and
// how it lands on what the record holds now (current):
//
// - "assign": the coach assigns a plan. It takes the old one's place, as it
//   always did, and the old one's entries are recorded as deleted so no
//   device brings them back. (Two plans can hold the same day - a Monday, a
//   breakfast - so what they share says nothing about one being an edit of
//   the other; a coach editing the athlete's plan goes through "edit".)
// - "edit": an edited copy of the record (coach editing a client, an
//   athlete's approved or free change). A copy that tracks ids carries its own
//   deletions and is merged, so whatever the athlete added meanwhile stays; an
//   older app's copy replaces the record, as it always did.
// - "clear": the section is emptied on purpose.
//
// Entries added on a device the server has not heard from yet are never in
// current, so none of these can delete them.
export function landDomainValue(current, next, key, how) {
  if (!MERGED_DOMAINS.includes(key)) return next;
  if (how === "clear") return DomainMerge.replace(current, next, Date.now(), key);
  if (!isObj(next)) return next;
  if (!isObj(current)) return DomainMerge.merge(null, next, key);
  if (how === "assign") return DomainMerge.replace(current, next, Date.now(), key);
  return DomainMerge.isMergeAware(next)
    ? DomainMerge.merge(current, next, key)
    : DomainMerge.replace(current, next, Date.now(), key);
}

// Whether a nutrition/supplementation/therapy/exams blob actually holds real
// entries (as opposed to an empty shell that just happens to be the value in
// RAM at the moment some unrelated sync fired - e.g. before boot finished
// loading, or a mid-navigation snapshot).
export function domainHasContent(v) {
  if (!v || typeof v !== "object") return false;
  return !!(
    (Array.isArray(v.days) && v.days.length) ||
    (Array.isArray(v.items) && v.items.length) ||
    (Array.isArray(v.medications) && v.medications.length) ||
    (Array.isArray(v.records) && v.records.length) ||
    // The user's own "my foods" library (typed once, remembered forever) -
    // it can outlive every day/meal it was ever logged into (e.g. after
    // clearing a week's plan), so it must count as content on its own too.
    (Array.isArray(v.customFoods) && v.customFoods.length) ||
    // A "budget" nutrition plan (kcal/macro target only, no prescribed foods -
    // the client logs their own choices against it) has no days at all, so
    // its target fields are the only signal that it's real content.
    v.daily_calories_target != null ||
    v.daily_protein_target != null ||
    v.daily_carbs_target != null ||
    v.daily_fats_target != null
  );
}

// A client upload can legitimately be a domain-only edit (e.g. just logged a
// meal) with no bearing on whether that domain should ever be emptied. Only
// let an empty/missing incoming value replace a richer existing one when the
// client explicitly marked it as an intentional clear (matches the
// cleared/isCleared convention already used for the "azzera" flows).
export function mergeDomainField(cur, inc, key) {
  const curVal = cur[key];
  const incVal = inc[key];
  if (incVal && (incVal.cleared || incVal.isCleared)) return incVal;
  if (!domainHasContent(incVal) && domainHasContent(curVal)) return curVal;
  return incVal !== undefined ? incVal : curVal;
}

export function mergeAccountDataBlobs(current, incoming) {
  const cur = current && typeof current === "object" ? current : {};
  const inc = incoming && typeof incoming === "object" ? incoming : {};
  const merged = { ...cur, ...inc, lastSyncedAt: new Date().toISOString() };
  const mapKeys = [
    "data", "customSets", "bw", "skips", "subs", "loadTypes", "tempos",
    "exIntensity", "maxTests", "bonus", "exMuscle", "nutritionDaily"
  ];
  for (const key of mapKeys) {
    const a = cur[key] && typeof cur[key] === "object" && !Array.isArray(cur[key]) ? cur[key] : {};
    const b = inc[key] && typeof inc[key] === "object" && !Array.isArray(inc[key]) ? inc[key] : {};
    merged[key] = Object.keys(b).length ? { ...a, ...b } : (Object.keys(a).length ? a : (merged[key] || {}));
  }
  const byId = {};
  (Array.isArray(cur.logs) ? cur.logs : []).concat(Array.isArray(inc.logs) ? inc.logs : []).forEach((row) => {
    if (!row) return;
    byId[row.id || row.at] = row;
  });
  const logs = Object.keys(byId).map((k) => byId[k]).sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
  // A year and more of sessions. At eighty, a person training four times a
  // week lost the older ones from the record - and with them everything a new
  // phone could have shown.
  if (logs.length) merged.logs = logs.slice(-400);
  else if (Array.isArray(cur.logs) && cur.logs.length) merged.logs = cur.logs;
  // Saved programs are the person's own: kept by id from both sides.
  {
    const byModel = {};
    (Array.isArray(cur.models) ? cur.models : []).concat(Array.isArray(inc.models) ? inc.models : []).forEach((m) => {
      if (m && m.id) byModel[m.id] = m;
    });
    const models = Object.keys(byModel).map((k) => byModel[k]);
    if (models.length) merged.models = models.slice(-12);
  }
  // Histories: whichever side has more of it, rather than the one that
  // happened to sync last.
  for (const key of ["chatHistory", "actionHistory"]) {
    const a = Array.isArray(cur[key]) ? cur[key] : [];
    const b = Array.isArray(inc[key]) ? inc[key] : [];
    merged[key] = b.length >= a.length ? b : a;
  }
  // Something switched on stays on: unlocking the coach hub or finishing the
  // tutorial on one device is true everywhere.
  for (const key of ["coachUnlocked", "clientTutorialDone"]) {
    merged[key] = !!(cur[key] || inc[key]);
  }
  for (const key of ["intelligence", "bodyComposition", "nutritionLoop", "seasonBoard"]) {
    if (inc[key] == null && cur[key] != null) merged[key] = cur[key];
  }
  // Where the person trains, merged by id: an athlete adding a gym on their
  // phone and a coach correcting it on theirs must both survive.
  {
    const a = Array.isArray(cur.trainingSpaces) ? cur.trainingSpaces : [];
    const b = Array.isArray(inc.trainingSpaces) ? inc.trainingSpaces : [];
    if (a.length || b.length) {
      const byId = new Map();
      for (const sp of a) if (sp && sp.id) byId.set(sp.id, sp);
      for (const sp of b) if (sp && sp.id) byId.set(sp.id, sp);
      merged.trainingSpaces = [...byId.values()].slice(0, 12);
    }
  }
  {
    const a = cur.intelTargets && typeof cur.intelTargets === "object" ? cur.intelTargets : {};
    const b = inc.intelTargets && typeof inc.intelTargets === "object" ? inc.intelTargets : {};
    if (Object.keys(a).length || Object.keys(b).length) merged.intelTargets = { ...a, ...b };
  }
  // Never let an empty/sandbox program wipe a richer cloud scheda
  const curWeeks = cur.activeProgram && Array.isArray(cur.activeProgram.weeks) ? cur.activeProgram.weeks.length : 0;
  const incWeeks = inc.activeProgram && Array.isArray(inc.activeProgram.weeks) ? inc.activeProgram.weeks.length : 0;
  if (inc.activeProgram == null || incWeeks < 1) {
    if (cur.activeProgram) merged.activeProgram = cur.activeProgram;
  } else if (curWeeks > incWeeks) {
    merged.activeProgram = cur.activeProgram;
  } else if (!merged.activeProgram && cur.activeProgram) {
    merged.activeProgram = cur.activeProgram;
  }
  // Nutrition/supplementation/therapy/exams travel two places: top-level, and
  // bundled again inside activeProgram (mirrors how the client's
  // accountPayload() ships them). Either spot receiving an empty/stale
  // snapshot - e.g. a sync that fired for an unrelated training change while
  // DATA.nutrition happened to not be loaded yet - used to silently overwrite
  // real logged meals/supplements/therapy/exams with nothing. Protect all four
  // domains the same way activeProgram's own weeks are already protected above.
  const domainKeys = ["nutrition", "supplementation", "therapy", "exams"];
  const mergeField = (a, b, key) => mergeSyncedDomain(a, b, key);
  for (const key of domainKeys) {
    merged[key] = mergeField(cur, inc, key);
  }
  if (merged.activeProgram) {
    const curProg = cur.activeProgram || {};
    const incProg = inc.activeProgram || {};
    const progPatch = {};
    for (const key of domainKeys) {
      progPatch[key] = mergeField(curProg, incProg, key);
    }
    merged.activeProgram = { ...merged.activeProgram, ...progPatch };
  }
  return merged;
}

// Reads, rebuilds and writes one user's record as a single locked step.
// Every writer of app_account_data reads the whole record, changes part of
// it and writes the whole record back; without the row lock, two of them
// running together (an athlete's sync and a coach's edit, a finished workout
// and a background sync) let the second write put back what it read before
// the first one merged anything in. build(current) returns the new record,
// or null to leave it as it is.
export async function updateAccountData(pool, userId, build) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO app_account_data(user_id, data, updated_at) VALUES($1, '{}'::jsonb, NOW()) ON CONFLICT (user_id) DO NOTHING",
      [userId]
    );
    const existing = await client.query("SELECT data FROM app_account_data WHERE user_id = $1 FOR UPDATE", [userId]);
    const current = existing.rows[0]?.data || {};
    const next = await build(current);
    if (next && typeof next === "object") {
      await client.query(
        "UPDATE app_account_data SET data = $2, revision = revision + 1, updated_at = NOW() WHERE user_id = $1",
        [userId, JSON.stringify(next)]
      );
    }
    await client.query("COMMIT");
    return next;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}
