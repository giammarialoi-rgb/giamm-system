import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(root, "web/training-analytics-engine.js")).href);
const TAE = globalThis.TrainingAnalyticsEngine;

assert.equal(TAE.epley1rm(100, 1), 100);
assert.equal(TAE.epley1rm(100, 5), 116.7);
assert.equal(TAE.epley1rm(100, 13), null);
assert.equal(TAE.epley1rm(0, 5), null);
assert.equal(TAE.epley1rm(100, 0), null);

assert.equal(TAE.relativeIntensity(72, 100), 72);
assert.equal(TAE.relativeIntensity(80, null), null);

const rir = TAE.intensityFromRirRpe(2, "RIR");
assert.equal(rir.intensity10, 8);
assert.equal(rir.rpe, 8);
const rpe = TAE.intensityFromRirRpe(8, "RPE");
assert.equal(rpe.intensity10, 8);
assert.equal(rpe.rir, 2);
assert.equal(TAE.intensityFromRirRpe("", "RIR"), null);
assert.equal(TAE.intensityFromRirRpe(12, "RPE"), null);

assert.deepEqual(TAE.movingAverage([1, 2, 3], 4), []);
assert.deepEqual(TAE.movingAverage([10, 20, 30, 40], 4), [null, null, null, 25]);

const sets = TAE.normalizeSets({
  data: {
    w1_d0_e0_s1_load: 100, w1_d0_e0_s1_reps: 8, w1_d0_e0_s1_rir: 2,
    w1_d0_e0_s2_load: 0, w1_d0_e0_s2_reps: 8,
    w2_d0_e0_s1_load: 105, w2_d0_e0_s1_reps: 8, w2_d0_e0_s1_rir: 1
  },
  loadTypes: {},
  skips: {},
  prefs: { intensityType: "RIR", duration: 4 },
  logs: [
    { week: 1, day: 0, at: "2026-09-01T10:00:00.000Z" },
    { week: 2, day: 0, at: "2026-09-01T11:00:00.000Z" }
  ]
}, { weeks: [{ sessions: [{ exercises: [{ name: "Panca" }] }] }, { sessions: [{ exercises: [{ name: "Panca" }] }] }] });
assert.equal(sets.length, 2);
assert.equal(sets[0].volume, 800);
assert.equal(sets[0].intensity10, 8);
assert.ok(sets[0].e1rm > 100);

const sameDay = TAE.build({
  data: {
    w1_d0_e0_s1_load: 100, w1_d0_e0_s1_reps: 10,
    w2_d0_e0_s1_load: 80, w2_d0_e0_s1_reps: 10,
    w3_d0_e0_s1_load: 60, w3_d0_e0_s1_reps: 10
  },
  prefs: { intensityType: "RIR", duration: 3 },
  logs: [
    { week: 1, day: 0, at: "2026-09-01T10:00:00.000Z" },
    { week: 2, day: 0, at: "2026-09-01T11:00:00.000Z" },
    { week: 3, day: 0, at: "2026-09-01T12:00:00.000Z" }
  ]
}, { weeks: [{ sessions: [{ exercises: [{ name: "Squat" }] }] }, { sessions: [{ exercises: [{ name: "Squat" }] }] }, { sessions: [{ exercises: [{ name: "Squat" }] }] }] }, { axis: "training", zoomWeeks: 1 });
assert.equal(sameDay.kpis.volumeTotal, 600, "1 training week is W3 only, even if all logs share a calendar day");
assert.equal(sameDay.window.weeks.length, 1);

TAE.clearCache();
const two = TAE.build({
  data: {
    w1_d0_e0_s1_load: 100, w1_d0_e0_s1_reps: 10,
    w2_d0_e0_s1_load: 80, w2_d0_e0_s1_reps: 10,
    w3_d0_e0_s1_load: 60, w3_d0_e0_s1_reps: 10
  },
  prefs: { intensityType: "RIR", duration: 3 },
  logs: [
    { week: 1, day: 0, at: "2026-09-01T10:00:00.000Z" },
    { week: 2, day: 0, at: "2026-09-01T11:00:00.000Z" },
    { week: 3, day: 0, at: "2026-09-01T12:00:00.000Z" }
  ]
}, { weeks: [{ sessions: [{ exercises: [{ name: "Squat" }] }] }, { sessions: [{ exercises: [{ name: "Squat" }] }] }, { sessions: [{ exercises: [{ name: "Squat" }] }] }] }, { axis: "training", zoomWeeks: 2 });
assert.equal(two.kpis.volumeTotal, 1400, "2 training weeks sum W2+W3");

TAE.clearCache();
const cal = TAE.build({
  data: {
    w1_d0_e0_s1_load: 100, w1_d0_e0_s1_reps: 10,
    w2_d0_e0_s1_load: 80, w2_d0_e0_s1_reps: 10
  },
  prefs: { intensityType: "RIR", duration: 2 },
  logs: [
    { week: 1, day: 0, at: "2026-09-01T10:00:00.000Z" },
    { week: 2, day: 0, at: "2026-09-01T11:00:00.000Z" }
  ]
}, { weeks: [{ sessions: [{ exercises: [{ name: "Squat" }] }] }, { sessions: [{ exercises: [{ name: "Squat" }] }] }] }, { axis: "calendar", zoomWeeks: 0 });
assert.equal(cal.window.weeks.length, 1, "same calendar ISO week collapses copied sessions");
assert.equal(cal.kpis.volumeTotal, 1800);

const prs = TAE.detectPRs([
  { name: "Squat", loadRaw: 100, reps: 5, e1rm: 116.7, week: 1 },
  { name: "Squat", loadRaw: 110, reps: 5, e1rm: 128.3, week: 2 }
]);
assert.ok(prs.some(function (p) { return p.type === "weight" && p.value === 110; }));

const cmp = TAE.comparePeriods(
  [{ volume: 120, sets: 10, reps: 80, e1rm: 110, avgIntensity: 8, frequency: 3, empty: false }],
  [{ volume: 100, sets: 8, reps: 70, e1rm: 100, avgIntensity: 7.5, frequency: 2, empty: false }]
);
assert.equal(cmp.volume, 20);
assert.equal(cmp.sets, 25);

const zoomed = TAE.applyZoom(
  [{ empty: false }, { empty: false }, { empty: true }],
  1
);
assert.equal(zoomed.weeks.length, 1);

assert.equal(TAE.estimatedNrm(150, 1), 150);
assert.ok(TAE.estimatedNrm(150, 5) > 100 && TAE.estimatedNrm(150, 5) < 150);
assert.equal(TAE.estimatedNrm(150, 20), null);

const fat = TAE.intraSessionFatigue([
  { set: 1, loadRaw: 120, reps: 6, rpe: 7 },
  { set: 4, loadRaw: 120, reps: 5, rpe: 9 }
]);
assert.equal(fat.repLoss, -16.7);
assert.ok(fat.signal === "moderate" || fat.signal === "high");

const storeSnap = {
  data: {
    w1_d0_e0_s1_load: 100, w1_d0_e0_s1_reps: 5, w1_d0_e0_s1_rir: 2,
    w2_d0_e0_s1_load: 105, w2_d0_e0_s1_reps: 5, w2_d0_e0_s1_rir: 2
  },
  prefs: { intensityType: "RIR", duration: 2 },
  logs: [],
  bw: { 1: 90 }
};
const dataSnap = { weeks: [{ sessions: [{ exercises: [{ name: "Panca" }] }] }, { sessions: [{ exercises: [{ name: "Panca" }] }] }] };
const before = TAE.rawFingerprint(storeSnap);
TAE.clearCache();
TAE.build(storeSnap, dataSnap, { axis: "training", zoomWeeks: 0 });
TAE.liveAfterSet(storeSnap, dataSnap, { week: 2, day: 0, exIdx: 0, set: 1 });
TAE.exerciseReport(storeSnap, dataSnap, { week: 2, day: 0, exIdx: 0, set: 1 });
const reco = TAE.recommendNext(storeSnap, dataSnap, { week: 2, day: 0, exIdx: 0, set: 1 });
assert.equal(TAE.rawFingerprint(storeSnap), before, "analytics never mutates raw workout data");
assert.ok(reco.action === "increase" || reco.action === "maintain");
assert.equal(reco.kind, "heuristic");
assert.ok(reco.why);

const emptyLive = TAE.liveAfterSet({ data: {}, prefs: {} }, { weeks: [] }, { week: 1, day: 0, exIdx: 0, set: 1 });
assert.equal(emptyLive.empty, true);

const expl = TAE.explainMetric("e1rm");
assert.equal(expl.evidenceLevel, "DERIVED");
assert.ok(String(expl.limitIt).includes("1RM testato"));
assert.ok(expl.nameIt && expl.whatIt && expl.howIt && expl.limitIt);
["volume", "bw", "sets", "reps", "load", "frequency", "sessions", "e1rm", "intensity", "landmarks", "recovery", "atlCtl", "hardSets", "effectiveVolume", "adaptation", "fatigue", "performance", "volumeResponse", "muscleContribution", "trainingLoad", "rpe", "rir", "mev", "mav", "mrv", "readiness", "confidence", "performanceVsPrevious", "volumeVsPrevious", "atl", "ctl", "tsb", "recommendation"].forEach(function (id) {
  const row = TAE.explainMetric(id);
  assert.ok(row, "catalog has " + id);
  assert.ok(row.nameIt && row.shortNameIt && row.whatIt && row.howIt && row.limitIt && row.unit && row.evidenceLevel && row.formulaVersion, "catalog fields for " + id);
  assert.ok(row.technicalName, "technical label for " + id);
});
assert.equal(TAE.humanState("fatigue", "high"), "Fatica elevata");
assert.equal(TAE.humanState("recovery", "GOOD"), "Recupero buono");
assert.equal(TAE.humanState("performance", "POSITIVE"), "Prestazione in miglioramento");
assert.ok(String(TAE.explainMetric("mrv").whatIt).toLowerCase().includes("serie"));

function week2days(name) {
  return { sessions: [{ exercises: [{ name: name }] }, { exercises: [{ name: name }] }] };
}
const incompleteStore = {
  data: {
    w1_d0_e0_s1_load: 100, w1_d0_e0_s1_reps: 10,
    w1_d1_e0_s1_load: 100, w1_d1_e0_s1_reps: 10,
    w2_d0_e0_s1_load: 100, w2_d0_e0_s1_reps: 10,
    w2_d1_e0_s1_load: 100, w2_d1_e0_s1_reps: 10,
    w3_d0_e0_s1_load: 50, w3_d0_e0_s1_reps: 10
  },
  prefs: { intensityType: "RIR", duration: 3, includeIncompleteWeeks: false },
  logs: [
    { week: 1, day: 0 }, { week: 1, day: 1 },
    { week: 2, day: 0 }, { week: 2, day: 1 },
    { week: 3, day: 0 }
  ],
  trainingWeek: 3
};
const incompleteData = { weeks: [week2days("Squat"), week2days("Squat"), week2days("Squat")] };
assert.equal(TAE.isWeekComplete(incompleteStore, incompleteData, 1), true);
assert.equal(TAE.isWeekComplete(incompleteStore, incompleteData, 2), true);
assert.equal(TAE.isWeekComplete(incompleteStore, incompleteData, 3), false);
const oneDayW3 = {
  data: { w3_d0_e0_s1_load: 50, w3_d0_e0_s1_reps: 10, w1_d0_e0_s1_load: 100, w1_d0_e0_s1_reps: 10, w1_d1_e0_s1_load: 100, w1_d1_e0_s1_reps: 10, w1_d2_e0_s1_load: 100, w1_d2_e0_s1_reps: 10, w1_d3_e0_s1_load: 100, w1_d3_e0_s1_reps: 10 },
  prefs: { intensityType: "RIR", duration: 3, frequency: 4 },
  logs: [{ week: 1, day: 0 }, { week: 1, day: 1 }, { week: 1, day: 2 }, { week: 1, day: 3 }, { week: 3, day: 0 }],
  trainingWeek: 3
};
const oneDayData = {
  weeks: [
    { sessions: [{ exercises: [{ name: "Squat" }] }, { exercises: [{ name: "Squat" }] }, { exercises: [{ name: "Squat" }] }, { exercises: [{ name: "Squat" }] }] },
    { sessions: [{ exercises: [{ name: "Squat" }] }, { exercises: [{ name: "Squat" }] }, { exercises: [{ name: "Squat" }] }, { exercises: [{ name: "Squat" }] }] },
    { sessions: [{ exercises: [{ name: "Squat" }] }] }
  ]
};
assert.equal(TAE.isWeekComplete(oneDayW3, oneDayData, 3), false, "W3 with only day 1 is incomplete if other weeks have 4 days");

TAE.clearCache();
const z2off = TAE.build(incompleteStore, incompleteData, { axis: "training", zoomWeeks: 2, includeIncompleteWeeks: false, currentWeek: 3 });
assert.equal(z2off.window.weeks.length, 2);
assert.ok(z2off.window.weeks.every(function (w) { return w.complete; }), "zoom 2 OFF uses only complete weeks");
assert.equal(z2off.kpis.volumeTotal, 4000, "zoom 2 OFF is W1+W2 not W3+W2");
assert.ok(z2off.kpis.volumeVarWeek == null || Math.abs(z2off.kpis.volumeVarWeek) < 1, "W2 vs W1 is flat, not -75%");
assert.ok(String(z2off.kpis.volumeVarNote || "").includes("W3") || String(z2off.kpis.volumeVarNote || "").includes("in corso"));

TAE.clearCache();
const z3off = TAE.build(incompleteStore, incompleteData, { axis: "training", zoomWeeks: 3, includeIncompleteWeeks: false, currentWeek: 3 });
assert.equal(z3off.kpis.volumeTotal, z2off.kpis.volumeTotal, "zoom 3 OFF still excludes incomplete W3");

TAE.clearCache();
const z2on = TAE.build(incompleteStore, incompleteData, { axis: "training", zoomWeeks: 2, includeIncompleteWeeks: true, currentWeek: 3 });
assert.equal(z2on.kpis.volumeTotal, 2500, "zoom 2 ON includes partial W3 + W2");
assert.ok(z2on.kpis.volumeVarWeek < -50, "ON variation uses partial W3 vs full W2");
assert.ok(z2on.window.weeks.some(function (w) { return w.inProgress; }));

const contrib = TAE.muscleContributionForExercise("Panca Piana con Bilanciere", {});
assert.ok(contrib.primary.includes("PETTO"));
const byM = TAE.buildByMuscle(TAE.normalizeSets(incompleteStore, incompleteData, {}));
assert.ok(byM.length, "byMuscle rollup exists");
assert.ok(byM.some(function (m) { return m.directSets > 0 || m.indirectSets > 0; }));

TAE.clearCache();
const snap2 = JSON.parse(JSON.stringify(storeSnap));
const before2 = TAE.rawFingerprint(snap2);
TAE.build(snap2, dataSnap, { axis: "training", zoomWeeks: 0 });
TAE.liveAfterSet(snap2, dataSnap, { week: 2, day: 0, exIdx: 0, set: 1 });
TAE.recommendNext(snap2, dataSnap, { week: 2, day: 0, exIdx: 0, set: 1 });
assert.deepEqual(snap2.data, storeSnap.data, "deepEqual store.data before/after analytics");
assert.equal(TAE.rawFingerprint(snap2), before2);

const incReco = TAE.recommendNext({
  data: {
    w1_d0_e0_s1_load: 100, w1_d0_e0_s1_reps: 5, w1_d0_e0_s1_rir: 2,
    w2_d0_e0_s1_load: 110, w2_d0_e0_s1_reps: 5, w2_d0_e0_s1_rir: 2
  },
  prefs: { intensityType: "RIR", duration: 2 },
  logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }]
}, { weeks: [{ sessions: [{ exercises: [{ name: "Panca" }] }] }, { sessions: [{ exercises: [{ name: "Panca" }] }] }] }, { week: 2, day: 0, exIdx: 0, set: 1 });
assert.equal(incReco.action, "increase");

const maintainReco = TAE.recommendNext({
  data: {
    w1_d0_e0_s1_load: 100, w1_d0_e0_s1_reps: 5, w1_d0_e0_s1_rir: 2,
    w2_d0_e0_s1_load: 100, w2_d0_e0_s1_reps: 5, w2_d0_e0_s1_rir: 2
  },
  prefs: { intensityType: "RIR", duration: 2 },
  logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }]
}, { weeks: [{ sessions: [{ exercises: [{ name: "Panca" }] }] }, { sessions: [{ exercises: [{ name: "Panca" }] }] }] }, { week: 2, day: 0, exIdx: 0, set: 1 });
assert.ok(maintainReco.action === "maintain" || maintainReco.action === "increase");

const reduceReco = TAE.recommendNext({
  data: {
    w1_d0_e0_s1_load: 120, w1_d0_e0_s1_reps: 5, w1_d0_e0_s1_rir: 1,
    w2_d0_e0_s1_load: 120, w2_d0_e0_s1_reps: 3, w2_d0_e0_s1_rir: 0
  },
  prefs: { intensityType: "RIR", duration: 2 },
  logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }]
}, { weeks: [{ sessions: [{ exercises: [{ name: "Panca" }] }] }, { sessions: [{ exercises: [{ name: "Panca" }] }] }] }, { week: 2, day: 0, exIdx: 0, set: 1 });
assert.ok(reduceReco.action === "reduce_volume" || reduceReco.action === "maintain");

const manySets = {};
for (let s = 1; s <= 22; s++) {
  manySets["w2_d0_e0_s" + s + "_load"] = 110;
  manySets["w2_d0_e0_s" + s + "_reps"] = 5;
  manySets["w2_d0_e0_s" + s + "_rir"] = 2;
}
manySets.w1_d0_e0_s1_load = 100;
manySets.w1_d0_e0_s1_reps = 5;
manySets.w1_d0_e0_s1_rir = 2;
const aboveMrv = TAE.recommendNext({
  data: manySets,
  prefs: { intensityType: "RIR", duration: 2 },
  logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }]
}, { weeks: [{ sessions: [{ exercises: [{ name: "Panca" }] }] }, { sessions: [{ exercises: [{ name: "Panca" }] }] }] }, { week: 2, day: 0, exIdx: 0, set: 22 });
assert.notEqual(aboveMrv.action, "reduce_volume", "above estimated MRV with positive response does not auto-reduce");
assert.ok(aboveMrv.mrvNote);

TAE.clearCache();
const ctrlStore = JSON.parse(JSON.stringify(incompleteStore));
const lmBefore = JSON.stringify(ctrlStore.prefs && ctrlStore.prefs.volumeLandmarks || null);
const built = TAE.build(ctrlStore, incompleteData, { axis: "training", zoomWeeks: 2, includeIncompleteWeeks: false, currentWeek: 3 });
assert.ok(built.control && built.control.performance && built.control.dose, "control snapshot prepared");
assert.ok(built.personalResponse && built.personalResponse.note);
assert.equal(built.personalResponse.formulaVersion, "personal-prep-v1");
assert.ok(built.performanceEfficiency && built.performanceEfficiency.kind === "heuristic");
assert.equal(JSON.stringify(ctrlStore.prefs && ctrlStore.prefs.volumeLandmarks || null), lmBefore, "one build does not rewrite landmarks");
assert.deepEqual(ctrlStore.data, incompleteStore.data);
assert.ok(built.recovery && (built.recovery.signal === "GOOD" || built.recovery.signal === "MODERATE" || built.recovery.signal === "LOW" || built.recovery.signal === "INSUFFICIENT_DATA"));

const emptyRec = TAE.build({ data: {}, prefs: {}, logs: [] }, { weeks: [] }, { axis: "training", zoomWeeks: 0 });
assert.ok(emptyRec.kpis.volumeTotal === 0 || emptyRec.table, "empty store still builds");
assert.ok(emptyRec.recovery);

const html = fs.readFileSync(path.join(root, "web/index.base.html"), "utf8");
assert.ok(html.includes("training-analytics-engine.js"), "stats page loads the engine");
assert.ok(html.includes("INTENSITÀ MEDIA") && !html.includes("id=\"stats-kpi-mode\""), "carico per parte KPI is gone");
assert.ok(html.includes("stats-zoom-slider") && html.includes("setStatsAxis"), "slider + training/date axis");
assert.ok(html.includes("Training Market") && html.includes("setStatsAdvancedMode"), "one main chart + advanced exercise/muscle");
assert.ok(html.includes("function compactChartX") && html.includes("function formatMrvWeekCell"), "market ticks + human MRV cells");
assert.ok(html.includes("SERIE vs LIMITE") && html.includes("Attuale: ") && html.includes("Limite superiore stimato"), "MRV cell is human-readable");
assert.ok(!html.includes("row.sets + ' / '"), "no ambiguous sets/MRV slash");
assert.ok(html.includes("function showLiveSetIntel") && html.includes("acceptIntelRecommendation"), "live post-set and Accept/Keep recommendations");
assert.ok(html.includes("clientMayApplyIntel") && html.includes("CHIEDI AL COACH"), "client cannot apply intel; asks the coach");
assert.ok(html.includes("openPdfStayInApp") && html.includes("blobDownloadWouldNavigate") && html.includes("nurvan-pdf-overlay"), "check PDF stays in-app on iOS/PWA");
assert.ok(!/shareOrSavePdfBlob[\s\S]{0,800}location\.href/.test(html), "PDF share does not navigate location.href");
assert.ok(html.includes("store.intelligence"), "recommendations live outside raw workout rows");
assert.ok(!/function setStatsAdvancedMode[\s\S]{0,220}render\(\);/.test(html), "advanced mode does not full-render");

const sw = fs.readFileSync(path.join(root, "web/sw.js"), "utf8");
assert.ok(sw.includes("training-analytics-engine.js"), "SW precaches the analytics engine");
assert.ok(fs.existsSync(path.join(root, "TRAINING_ANALYTICS_METHODOLOGY.md")), "methodology doc exists");

console.log("OK   training analytics engine formulas + zoom axis + intelligence");
