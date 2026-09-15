/**
 * Merge logic for the cross-device account data blob (app_account_data.data).
 * Pulled out of coach-api.mjs so it can be unit-tested without importing the
 * server entrypoint itself (which binds a port as a side effect of import).
 */

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
    (Array.isArray(v.customFoods) && v.customFoods.length)
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
  if (logs.length) merged.logs = logs.slice(-80);
  else if (Array.isArray(cur.logs) && cur.logs.length) merged.logs = cur.logs;
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
  for (const key of domainKeys) {
    merged[key] = mergeDomainField(cur, inc, key);
  }
  if (merged.activeProgram) {
    const curProg = cur.activeProgram || {};
    const incProg = inc.activeProgram || {};
    const progPatch = {};
    for (const key of domainKeys) {
      progPatch[key] = mergeDomainField(curProg, incProg, key);
    }
    merged.activeProgram = { ...merged.activeProgram, ...progPatch };
  }
  return merged;
}
