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
["volume", "bw", "sets", "reps", "load", "frequency", "sessions", "e1rm", "intensity", "landmarks", "recovery", "atlCtl", "hardSets", "effectiveVolume", "adaptation", "fatigue", "performance", "volumeResponse", "muscleContribution", "trainingLoad", "rpe", "rir", "mev", "mav", "mrv", "readiness", "confidence", "performanceVsPrevious", "volumeVsPrevious", "atl", "ctl", "tsb", "recommendation", "volumeLoad", "relativeIntensity", "effort", "performanceTrend", "performanceResponse", "performanceEfficiency", "fatigueSignal", "recoverySignal", "trainingDose", "intensityTrend", "sessionQuality", "performanceContext"].forEach(function (id) {
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
assert.ok(reduceReco.action === "reduce_volume" || reduceReco.action === "maintain" || reduceReco.action === "monitor");

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
assert.ok(html.includes("Volume totale") && html.includes("Seleziona un gruppo muscolare"), "global volume is not compared to a muscle MRV");
assert.ok(!html.includes("lm.MRV || 20"), "no universal MRV 20 fallback in the stats UI");
assert.ok(html.includes("Volume vs precedente") && html.includes("formatIntelPct"), "performance and volume deltas are separate");
assert.ok(html.includes("Come vengono calcolati questi dati?"), "intel card uses one explanation CTA");
assert.ok(!html.includes("row.sets + ' / '"), "no ambiguous sets/MRV slash");
assert.equal(TAE.humanState("performance", "improving"), "Prestazione in miglioramento");

function writeSets(obj, week, day, exIdx, rows) {
  rows.forEach(function (r, i) {
    const n = i + 1;
    obj["w" + week + "_d" + day + "_e" + exIdx + "_s" + n + "_load"] = r[0];
    obj["w" + week + "_d" + day + "_e" + exIdx + "_s" + n + "_reps"] = r[1];
    if (r[2] != null) obj["w" + week + "_d" + day + "_e" + exIdx + "_s" + n + "_rir"] = r[2];
  });
}
function nWeeks(name, n) {
  return {
    weeks: Array.from({ length: n }, function () {
      return { sessions: [{ exercises: [{ name: name }] }] };
    })
  };
}

const pancaData = {};
writeSets(pancaData, 1, 0, 0, [[120, 8, 1], [120, 8, 1], [120, 8, 1]]);
writeSets(pancaData, 2, 0, 0, [[120, 9, 1], [120, 9, 1], [120, 8, 1]]);
writeSets(pancaData, 3, 0, 0, [[122.5, 8, 1], [122.5, 8, 1], [122.5, 8, 1]]);
const pancaStore = {
  data: pancaData,
  prefs: { intensityType: "RIR", duration: 3 },
  logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }, { week: 3, day: 0 }]
};
const pancaProg = nWeeks("Panca piana", 3);
const pancaBefore = TAE.rawFingerprint(pancaStore);
TAE.clearCache();
const pancaLive2 = TAE.liveAfterSet(pancaStore, pancaProg, { week: 2, day: 0, exIdx: 0, set: 3 });
const pancaLive3 = TAE.liveAfterSet(pancaStore, pancaProg, { week: 3, day: 0, exIdx: 0, set: 3 });
const pancaAx = TAE.analyzeExercise(pancaStore, pancaProg, "Panca piana");
TAE.clearCache();
const pancaSnap1 = TAE.exerciseAnalyticsSnapshot(pancaStore, pancaProg, { week: 1, day: 0, exIdx: 0, set: 3 });
const pancaReco1 = TAE.recommendNext(pancaStore, pancaProg, { week: 1, day: 0, exIdx: 0, set: 3 }, pancaSnap1);
assert.equal(pancaSnap1.previousExposure, null);
assert.equal(pancaSnap1.performanceDelta, null);
assert.equal(pancaSnap1.volumeDelta, null);
assert.ok(pancaReco1.why);
assert.ok(pancaReco1.action === "insufficient" || pancaReco1.eligibility.reason);

assert.equal(pancaLive2.direction, "improving", "bench exposure 2 is improving");
assert.notEqual(pancaLive2.direction, "declining");
assert.equal(pancaLive3.direction, "improving", "bench exposure 3 is improving");
assert.notEqual(pancaLive3.direction, "declining");
assert.equal(pancaAx.direction, "improving");
assert.ok(pancaAx.multiTrend === "improving" || pancaLive3.trend === "improving", "multi-session bench trend is improving");
assert.ok(pancaLive2.vsPreviousBest == null || pancaLive2.vsPreviousBest >= 0, "no false negative vs previous");
assert.ok(pancaLive3.vsPreviousBest == null || pancaLive3.vsPreviousBest >= 0);
const pancaReco = TAE.recommendNext(pancaStore, pancaProg, { week: 3, day: 0, exIdx: 0, set: 3 });
assert.ok(pancaReco.action && pancaReco.action !== "undefined");
assert.ok(pancaReco.action === "increase" || pancaReco.action === "maintain");
assert.ok(pancaReco.suggestedLoad != null);
assert.ok(pancaReco.why);
assert.equal(TAE.rawFingerprint(pancaStore), pancaBefore, "panca analytics does not mutate raw data");

const volDiff = {};
writeSets(volDiff, 1, 0, 0, [[120, 8, 1], [120, 8, 1], [120, 8, 1], [120, 8, 1]]);
writeSets(volDiff, 2, 0, 0, [[120, 9, 1], [120, 9, 1], [120, 9, 1]]);
const volStore = { data: volDiff, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] };
const volLive = TAE.liveAfterSet(volStore, nWeeks("Panca piana", 2), { week: 2, day: 0, exIdx: 0, set: 3 });
assert.notEqual(volLive.direction, "declining", "fewer sets with more reps is not a performance drop");
assert.ok(volLive.volumeVsPrevious == null || volLive.volumeVsPrevious < 0, "volume can fall while performance does not");

const rirData = {};
writeSets(rirData, 1, 0, 0, [[120, 8, 1]]);
writeSets(rirData, 2, 0, 0, [[120, 8, 2]]);
const rirLive = TAE.liveAfterSet({
  data: rirData, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }]
}, nWeeks("Panca piana", 2), { week: 2, day: 0, exIdx: 0, set: 1 });
assert.notEqual(rirLive.direction, "declining", "same output with easier RIR is not negative");

const customName = "Cubo di ferro nurvan";
const custom1 = {};
writeSets(custom1, 1, 0, 0, [[120, 8, 2]]);
const customProg1 = nWeeks(customName, 1);
const customStore1 = { data: custom1, prefs: { intensityType: "RIR", duration: 1 }, logs: [{ week: 1, day: 0 }] };
const customFirstReco = TAE.recommendNext(customStore1, customProg1, { week: 1, day: 0, exIdx: 0, set: 1 });
assert.equal(customFirstReco.action, "insufficient");
assert.ok(String(customFirstReco.why).toLowerCase().includes("dati") || String(customFirstReco.why).toLowerCase().includes("esposizione"));
const customAx1 = TAE.analyzeExercise(customStore1, customProg1, customName);
assert.equal(customAx1.empty, false);
assert.ok(customAx1.e1rm > 0);

const custom2 = Object.assign({}, custom1);
writeSets(custom2, 2, 0, 0, [[122.5, 8, 2]]);
const customProg2 = nWeeks(customName, 2);
const customStore2 = { data: custom2, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] };
const customBefore = JSON.parse(JSON.stringify(customStore2.data));
const customLive = TAE.liveAfterSet(customStore2, customProg2, { week: 2, day: 0, exIdx: 0, set: 1 });
const customAx = TAE.analyzeExercise(customStore2, customProg2, customName);
const customReco = TAE.recommendNext(customStore2, customProg2, { week: 2, day: 0, exIdx: 0, set: 1 });
const customFuture = TAE.recommendNext(customStore2, nWeeks(customName, 3), { week: 3, day: 0, exIdx: 0, set: 1 });
assert.ok(customLive.direction === "improving" || customLive.direction === "stable");
assert.ok(customAx.e1rm > 0);
assert.ok(customReco.action === "increase" || customReco.action === "maintain");
assert.equal(customReco.performanceDelta, customLive.vsPreviousExposure);
assert.ok(customReco.suggestedLoad != null && customReco.why);
assert.ok(customFuture.action === "increase" || customFuture.action === "maintain", "future day still returns a recommendation");
assert.ok(customFuture.action !== "insufficient" || customFuture.why);
assert.deepEqual(customStore2.data, customBefore, "custom exercise analytics does not mutate store.data");

const mrvData = {};
for (let s = 1; s <= 16; s++) { mrvData["w1_d0_e0_s" + s + "_load"] = 100; mrvData["w1_d0_e0_s" + s + "_reps"] = 8; }
for (let s = 1; s <= 14; s++) { mrvData["w1_d0_e1_s" + s + "_load"] = 140; mrvData["w1_d0_e1_s" + s + "_reps"] = 8; }
for (let s = 1; s <= 57; s++) { mrvData["w1_d0_e2_s" + s + "_load"] = 80; mrvData["w1_d0_e2_s" + s + "_reps"] = 8; }
const mrvStore = {
  data: mrvData,
  prefs: {
    intensityType: "RIR",
    duration: 1,
    volumeLandmarks: {
      PETTO: { MV: 6, MEV: 8, MAV_LOW: 12, MAV_HIGH: 16, MRV: 20 },
      QUADRICIPITI: { MV: 6, MEV: 8, MAV_LOW: 10, MAV_HIGH: 14, MRV: 18 }
    }
  },
  logs: [{ week: 1, day: 0 }]
};
const mrvProg = { weeks: [{ sessions: [{ exercises: [{ name: "Panca piana" }, { name: "Squat" }, { name: "Rematore" }] }] }] };
TAE.clearCache();
const globalA = TAE.build(mrvStore, mrvProg, { axis: "training", zoomWeeks: 0, muscle: "TOTAL", includeIncompleteWeeks: true });
assert.equal(globalA.landmarks.scale, "global");
assert.equal(globalA.landmarks.comparable, false);
assert.equal(globalA.landmarks.MRV, null);
assert.equal(globalA.landmarks.currentSets, 87);
assert.ok(String(globalA.landmarks.note || "").toLowerCase().includes("gruppo"));
TAE.clearCache();
const chestA = TAE.build(mrvStore, mrvProg, { axis: "training", zoomWeeks: 0, muscle: "PETTO", includeIncompleteWeeks: true });
assert.equal(chestA.landmarks.scale, "muscle");
assert.equal(chestA.landmarks.comparable, true);
assert.equal(chestA.landmarks.currentSets, 16);
assert.equal(chestA.landmarks.MRV, 20);
TAE.clearCache();
const quadsA = TAE.build(mrvStore, mrvProg, { axis: "training", zoomWeeks: 0, muscle: "QUADRICIPITI", includeIncompleteWeeks: true });
assert.equal(quadsA.landmarks.currentSets, 14);
assert.equal(quadsA.landmarks.MRV, 18);
assert.equal(quadsA.landmarks.unit, "serie / settimana");
TAE.clearCache();
const backAll = TAE.build(mrvStore, mrvProg, { axis: "training", zoomWeeks: 0, muscle: "TOTAL", includeIncompleteWeeks: true });
assert.equal(backAll.landmarks.MRV, null);
assert.equal(backAll.landmarks.currentSets, 87);
assert.deepEqual(mrvStore.data, mrvData, "MRV scale analytics does not mutate raw sets");

assert.ok(TAE.exerciseAnalyticsSnapshot && TAE.evaluateExerciseState, "central snapshot + decision engine exist");
const shotData = {};
writeSets(shotData, 1, 0, 0, [[120, 9, 1], [120, 8, 1], [120, 8, 1]]);
writeSets(shotData, 2, 0, 0, [[122.5, 8, 1], [122.5, 8, 1], [120, 8, 1]]);
const shotStore = { data: shotData, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] };
const shotProg = nWeeks("Panca piana", 2);
const shotBefore = JSON.parse(JSON.stringify(shotStore.data));
const shotSnap = TAE.exerciseAnalyticsSnapshot(shotStore, shotProg, { week: 2, day: 0, exIdx: 0, set: 3 });
const shotReco = TAE.recommendNext(shotStore, shotProg, { week: 2, day: 0, exIdx: 0, set: 3 }, shotSnap);
const shotLive = TAE.liveAfterSet(shotStore, shotProg, { week: 2, day: 0, exIdx: 0, set: 3 }, shotSnap);
const shotReport = TAE.exerciseReport(shotStore, shotProg, { week: 2, day: 0, exIdx: 0, set: 3 }, shotSnap);
const shotSum = TAE.sessionSummary(shotStore, shotProg, { week: 2, day: 0 });
assert.equal(shotSnap.performanceDelta, shotReco.performanceDelta, "analyticsSnapshotConsistency performance");
assert.equal(shotSnap.volumeDelta, shotReco.volumeDelta, "analyticsSnapshotConsistency volume");
assert.equal(shotSnap.fatigue && shotSnap.fatigue.signal, shotReco.fatigueSignal, "analyticsSnapshotConsistency fatigue");
assert.equal(shotLive.vsPreviousExposure, shotSnap.performanceDelta);
assert.equal(shotLive.volumeVsPrevious, shotSnap.volumeDelta);
assert.equal(shotReport.volumeChange, shotSnap.volumeDelta);
assert.equal(shotSum.performanceChange, shotSnap.performanceDelta, "session summary uses the same exercise delta");
assert.ok(shotSnap.lastSetE1RM != null && shotSnap.previousE1RM != null);
const lastVsPeak = Math.round(((shotSnap.lastSetE1RM - shotSnap.previousE1RM) / shotSnap.previousE1RM) * 1000) / 10;
assert.ok(lastVsPeak < 0, "screenshot case: last-set e1RM vs previous peak is negative");
assert.notEqual(shotSnap.performanceDelta, lastVsPeak, "card performance is not last-set vs previous peak");
assert.notEqual(shotReco.performanceDelta, lastVsPeak, "recommendation must not use last-set e1RM vs previous peak");
assert.notEqual(shotReco.action, "reduce_volume", "improving/stable composite must not force reduce");
assert.notEqual(shotReco.action, "reduce_load");
assert.ok(String(shotReco.evidence.join(" ")).indexOf(String(shotSnap.performanceDelta)) >= 0 || shotSnap.performanceDelta == null);
assert.deepEqual(shotStore.data, shotBefore, "snapshot path does not mutate raw data");

const rpePos = {};
writeSets(rpePos, 1, 0, 0, [[120, 8, 1], [120, 8, 1], [120, 8, 1]]);
writeSets(rpePos, 2, 0, 0, [[120, 9, 1], [120, 9, 1], [120, 8, 1]]);
const rpeStore = { data: rpePos, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] };
const rpeSnap = TAE.exerciseAnalyticsSnapshot(rpeStore, nWeeks("Panca piana", 2), { week: 2, day: 0, exIdx: 0, set: 3 });
const rpeReco = TAE.recommendNext(rpeStore, nWeeks("Panca piana", 2), { week: 2, day: 0, exIdx: 0, set: 3 }, rpeSnap);
assert.equal(rpeSnap.performanceDirection, "improving");
assert.ok(rpeSnap.currentRPE >= 8);
assert.notEqual(rpeReco.action, "reduce_volume");
assert.notEqual(rpeReco.action, "reduce_load");
assert.ok(rpeReco.action === "maintain" || rpeReco.action === "increase" || rpeReco.action === "monitor");
assert.equal(rpeReco.performanceDelta, rpeSnap.performanceDelta);

const multiTrendData = {};
writeSets(multiTrendData, 1, 0, 0, [[120, 8, 1]]);
writeSets(multiTrendData, 2, 0, 0, [[120, 8, 1]]);
writeSets(multiTrendData, 3, 0, 0, [[120, 9, 1]]);
writeSets(multiTrendData, 4, 0, 0, [[120, 9, 1]]);
const multiStore = { data: multiTrendData, prefs: { intensityType: "RIR", duration: 4 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }, { week: 3, day: 0 }, { week: 4, day: 0 }] };
const multiW3 = TAE.exerciseAnalyticsSnapshot(multiStore, nWeeks("Panca piana", 4), { week: 3, day: 0, exIdx: 0, set: 1 });
const multiSnap = TAE.exerciseAnalyticsSnapshot(multiStore, nWeeks("Panca piana", 4), { week: 4, day: 0, exIdx: 0, set: 1 });
assert.equal(multiW3.performanceDirection, "improving", "single-exposure W3 vs W2 is positive");
assert.ok(multiSnap.performanceDirection === "improving" || multiSnap.performanceDirection === "stable", "W4 vs W3 is not a drop");
assert.equal(multiSnap.multiTrend, "improving", "multi-session trend stays positive");

const fatNeg = {};
writeSets(fatNeg, 1, 0, 0, [[120, 8, 2], [120, 8, 2], [120, 8, 2]]);
writeSets(fatNeg, 2, 0, 0, [[120, 6, 1], [120, 5, 0], [120, 4, 0]]);
writeSets(fatNeg, 3, 0, 0, [[120, 5, 0], [120, 4, 0], [120, 3, 0]]);
const fatStore = { data: fatNeg, prefs: { intensityType: "RIR", duration: 3 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }, { week: 3, day: 0 }] };
const fatSnap = TAE.exerciseAnalyticsSnapshot(fatStore, nWeeks("Panca piana", 3), { week: 3, day: 0, exIdx: 0, set: 3 });
const fatReco = TAE.recommendNext(fatStore, nWeeks("Panca piana", 3), { week: 3, day: 0, exIdx: 0, set: 3 }, fatSnap);
assert.equal(fatSnap.performanceDirection, "declining");
assert.ok(fatReco.action === "reduce_volume" || fatReco.action === "reduce_load" || fatReco.action === "monitor");
assert.equal(fatReco.performanceDelta, fatSnap.performanceDelta);

const indep = {};
writeSets(indep, 1, 0, 0, [[100, 8, 1], [100, 8, 1], [100, 8, 1], [100, 8, 1]]);
writeSets(indep, 2, 0, 0, [[102, 8, 1], [102, 8, 1], [102, 8, 1], [102, 8, 1], [102, 8, 1]]);
const indepSnap = TAE.exerciseAnalyticsSnapshot({ data: indep, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] }, nWeeks("Panca piana", 2), { week: 2, day: 0, exIdx: 0, set: 5 });
assert.ok(indepSnap.performanceDelta > 0 && indepSnap.performanceDelta < 8, "performance is load/e1RM, not volume");
assert.ok(indepSnap.volumeDelta > 20, "volume delta stays independent");
assert.notEqual(indepSnap.volumeDelta, indepSnap.performanceDelta);

const firstOnly = {};
writeSets(firstOnly, 1, 0, 0, [[100, 8, 1]]);
const firstSnap = TAE.exerciseAnalyticsSnapshot({ data: firstOnly, prefs: { intensityType: "RIR", duration: 1 }, logs: [{ week: 1, day: 0 }] }, nWeeks("Panca piana", 1), { week: 1, day: 0, exIdx: 0, set: 1 });
const firstReco = TAE.recommendNext({ data: firstOnly, prefs: { intensityType: "RIR", duration: 1 }, logs: [{ week: 1, day: 0 }] }, nWeeks("Panca piana", 1), { week: 1, day: 0, exIdx: 0, set: 1 }, firstSnap);
assert.equal(firstSnap.performanceDirection, "insufficient");
assert.equal(firstReco.action, "insufficient");
assert.equal(firstReco.performanceDelta, firstSnap.performanceDelta);

assert.ok(html.includes("exerciseAnalyticsSnapshot") && html.includes("recommendNext(store, DATA, loc, snap)"), "UI passes the same snapshot into recommendation");
assert.ok(html.includes("Intensità vs precedente") && html.includes("PRESTAZIONE ESPRESSA") && html.includes("SFORZO") && html.includes("DOSE DI LAVORO"), "exercise card shows intensity + Italian PIC sections");
assert.ok(TAE.evaluatePerformanceContext, "performance context evaluator exists");

const ab = {};
writeSets(ab, 1, 0, 0, [[130, 7, 1], [117.5, 9, 1], [117.5, 7, 1]]);
writeSets(ab, 2, 0, 0, [[132.5, 7, 1], [120, 7, 1], [120, 7, 1]]);
const abStore = { data: ab, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] };
const abBefore = JSON.parse(JSON.stringify(abStore.data));
const abProg = nWeeks("Panca piana", 2);
const abSnap = TAE.exerciseAnalyticsSnapshot(abStore, abProg, { week: 2, day: 0, exIdx: 0, set: 3 });
const abReco = TAE.recommendNext(abStore, abProg, { week: 2, day: 0, exIdx: 0, set: 3 }, abSnap);
const abPic = TAE.evaluatePerformanceContext(abSnap);
assert.ok(abSnap.comparison.topLoadDelta > 0, "guide case: top load rose");
assert.equal(abSnap.comparison.topRepDelta, 0, "guide case: top reps unchanged");
assert.equal(abSnap.effortContext.effortTrend, "stable", "guide case: effort stable");
assert.equal(abSnap.performanceState, "positive", "guide case: performance positive");
assert.notEqual(abSnap.performanceState, "negative");
assert.ok(abSnap.volumeDelta != null);
assert.notEqual(abSnap.volumeDelta, abSnap.performanceDelta, "volume load is not performance");
assert.equal(abSnap.performanceDelta, abReco.performanceDelta);
assert.notEqual(abReco.action, "reduce_volume");
assert.notEqual(abReco.action, "reduce_load");
assert.ok(String(abSnap.explanationIt || "").toLowerCase().includes("carico") || String(abSnap.explanationIt || "").toLowerCase().includes("prestaz"));
assert.equal(abPic.performanceState, "positive");
assert.deepEqual(abStore.data, abBefore, "PIC path does not mutate raw data");

const sameVol = {};
writeSets(sameVol, 1, 0, 0, [[130, 7, 1], [117.5, 7, 1], [117.5, 7, 1]]);
writeSets(sameVol, 2, 0, 0, [[132.5, 7, 1], [120, 7, 1], [120, 7, 1]]);
const sameVolSnap = TAE.exerciseAnalyticsSnapshot({ data: sameVol, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] }, nWeeks("Panca piana", 2), { week: 2, day: 0, exIdx: 0, set: 3 });
assert.ok(Math.abs(sameVolSnap.volumeDelta) < 4, "matched-structure volume is small");
assert.ok(sameVolSnap.intensityDelta > 0);
assert.equal(sameVolSnap.performanceState, "positive");

const volUpPerfDown = {};
writeSets(volUpPerfDown, 1, 0, 0, [[120, 8, 2], [120, 8, 2], [120, 8, 2]]);
writeSets(volUpPerfDown, 2, 0, 0, [[120, 6, 0], [120, 5, 0], [120, 5, 0], [120, 4, 0], [120, 4, 0], [120, 8, 0]]);
const vupdSnap = TAE.exerciseAnalyticsSnapshot({ data: volUpPerfDown, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] }, nWeeks("Panca piana", 2), { week: 2, day: 0, exIdx: 0, set: 6 });
assert.ok(vupdSnap.volumeDelta > 0);
assert.equal(vupdSnap.performanceState, "negative");
assert.ok(vupdSnap.effortContext.effortTrend === "rising" || vupdSnap.fatigue.signal === "high" || vupdSnap.fatigue.signal === "moderate");

const lessVol = {};
writeSets(lessVol, 1, 0, 0, [[120, 8, 1], [120, 8, 1], [120, 8, 1], [120, 8, 1]]);
writeSets(lessVol, 2, 0, 0, [[125, 8, 2], [125, 8, 2]]);
const lessSnap = TAE.exerciseAnalyticsSnapshot({ data: lessVol, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] }, nWeeks("Panca piana", 2), { week: 2, day: 0, exIdx: 0, set: 2 });
assert.ok(lessSnap.volumeDelta < 0);
assert.equal(lessSnap.performanceState, "positive");
assert.notEqual(lessSnap.overallSignal, "negative");

const rirBetter = {};
writeSets(rirBetter, 1, 0, 0, [[120, 8, 1]]);
writeSets(rirBetter, 2, 0, 0, [[120, 8, 2]]);
const rirBSnap = TAE.exerciseAnalyticsSnapshot({ data: rirBetter, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] }, nWeeks("Panca piana", 2), { week: 2, day: 0, exIdx: 0, set: 1 });
assert.notEqual(rirBSnap.performanceState, "negative");
assert.equal(rirBSnap.effortContext.effortTrend, "falling");
assert.ok(rirBSnap.comparison.efficiency === "improved" || rirBSnap.performanceState === "neutral" || rirBSnap.performanceState === "positive");

const rirWorse = {};
writeSets(rirWorse, 1, 0, 0, [[120, 8, 2]]);
writeSets(rirWorse, 2, 0, 0, [[120, 8, 0]]);
const rirWSnap = TAE.exerciseAnalyticsSnapshot({ data: rirWorse, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] }, nWeeks("Panca piana", 2), { week: 2, day: 0, exIdx: 0, set: 1 });
assert.notEqual(rirWSnap.performanceState, "positive", "harder effort at same output is not automatically positive");
assert.equal(rirWSnap.effortContext.effortTrend, "rising");

const topOnly = {};
writeSets(topOnly, 1, 0, 0, [[130, 7, 1], [117.5, 9, 1]]);
writeSets(topOnly, 2, 0, 0, [[132.5, 7, 1], [110, 7, 1]]);
const topSnap = TAE.exerciseAnalyticsSnapshot({ data: topOnly, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] }, nWeeks("Panca piana", 2), { week: 2, day: 0, exIdx: 0, set: 2 });
assert.ok(topSnap.performanceState === "positive" || topSnap.performanceState === "mixed");
assert.ok(topSnap.comparison.topLoadDelta > 0);

const multiLoad = {};
writeSets(multiLoad, 1, 0, 0, [[120, 8, 1]]);
writeSets(multiLoad, 2, 0, 0, [[120, 8, 1]]);
writeSets(multiLoad, 3, 0, 0, [[122.5, 8, 1]]);
writeSets(multiLoad, 4, 0, 0, [[122.5, 9, 1]]);
const multiLoadSnap = TAE.exerciseAnalyticsSnapshot({ data: multiLoad, prefs: { intensityType: "RIR", duration: 4 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }, { week: 3, day: 0 }, { week: 4, day: 0 }] }, nWeeks("Panca piana", 4), { week: 4, day: 0, exIdx: 0, set: 1 });
assert.equal(multiLoadSnap.multiTrend, "improving");

function nWeeksExs(names, n) {
  return {
    weeks: Array.from({ length: n }, function () {
      return { sessions: [{ exercises: names.map(function (nm) { return { name: nm }; }) }] };
    })
  };
}

const swapped = {};
writeSets(swapped, 1, 0, 0, [[100, 8, 1]]);
writeSets(swapped, 1, 0, 1, [[30, 8, 2], [30, 8, 2]]);
swapped.w1_d0_e1_s1_done = 1;
swapped.w1_d0_e1_s2_done = 1;
writeSets(swapped, 2, 0, 0, [[102.5, 8, 1]]);
writeSets(swapped, 2, 0, 1, [[30, 8, 2], [30, 8, 2]]);
const swappedStore = {
  data: swapped,
  subs: { w2_d0_e1: "Multi bench leverage" },
  prefs: { intensityType: "RIR", duration: 2 },
  logs: [{ week: 1, day: 0 }]
};
const swappedBefore = JSON.parse(JSON.stringify(swappedStore.data));
const swappedProg = nWeeksExs(["Panca piana", "Spinte con manubri"], 2);
assert.equal(TAE.resolveExerciseName(swappedProg, swappedStore, 2, 0, 1), "Multi bench leverage");
assert.equal(TAE.resolveExerciseName(swappedProg, swappedStore, 1, 0, 1), "Spinte con manubri");
const swappedSnap = TAE.exerciseAnalyticsSnapshot(swappedStore, swappedProg, { week: 2, day: 0, exIdx: 1, set: 1 });
const swappedReco = TAE.recommendNext(swappedStore, swappedProg, { week: 2, day: 0, exIdx: 1, set: 1 }, swappedSnap);
assert.ok(TAE.sameExerciseName(swappedSnap.name, "Multi bench leverage"));
assert.equal(swappedSnap.performanceDirection, "insufficient");
assert.notEqual(swappedReco.suggestedLoad, 30);
assert.equal(swappedReco.action, "insufficient");
assert.deepEqual(swappedStore.data, swappedBefore, "substitution snapshot does not mutate logged sets");

const moved = {};
writeSets(moved, 1, 0, 0, [[80, 8, 1], [75, 8, 1]]);
moved.w1_d0_e0_s1_done = 1;
moved.w1_d0_e0_s2_done = 1;
const movedProg = {
  weeks: [
    { sessions: [{ exercises: [{ name: "Multi bench leverage" }, { name: "Spinte con manubri" }] }] },
    { sessions: [{ exercises: [{ name: "Spinte con manubri" }, { name: "Multi bench leverage" }] }] }
  ]
};
const movedStore = { data: moved, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }] };
const movedSnap = TAE.exerciseAnalyticsSnapshot(movedStore, movedProg, { week: 2, day: 0, exIdx: 1, set: 1 });
const movedReco = TAE.recommendNext(movedStore, movedProg, { week: 2, day: 0, exIdx: 1, set: 1 }, movedSnap);
assert.ok(TAE.sameExerciseName(movedSnap.name, "Multi bench leverage"));
assert.equal(movedSnap.lastLoad, 80, "same exercise is found in another slot");
assert.notEqual(movedReco.suggestedLoad, 30);
assert.equal(movedReco.suggestedLoad, 80);

assert.ok(html.includes("clearCopiedLoadsAfterSubstitution") && html.includes("findNamedExerciseInWeek"), "substitution clears copied slot loads and matches by name");

assert.ok(TAE.buildExerciseAnalyticsSnapshot && TAE.isRecommendationEligible && TAE.debugExerciseTrace && TAE.assertComparableMetric);

const pancaSnap2 = TAE.buildExerciseAnalyticsSnapshot(pancaStore, pancaProg, { week: 2, day: 0, exIdx: 0, set: 3 });
const pancaSnap3 = TAE.buildExerciseAnalyticsSnapshot(pancaStore, pancaProg, { week: 3, day: 0, exIdx: 0, set: 3 });
assert.equal(pancaSnap2.previousExposureId, "w1_d0");
assert.equal(pancaSnap2.currentExposureId, "w2_d0");
assert.equal(pancaSnap3.previousExposureId, "w2_d0");
assert.equal(pancaSnap3.currentExposureId, "w3_d0");
assert.equal(pancaSnap3.performanceState, "positive");
assert.equal(pancaSnap2.performanceState, "positive");
assert.ok(pancaSnap3.exposureSequence.length === 3);

const stalePair = {};
writeSets(stalePair, 1, 0, 0, [[133, 8, 1], [133, 8, 1], [133, 8, 1]]);
writeSets(stalePair, 2, 0, 0, [[122.5, 8, 1], [122.5, 8, 1], [122.5, 8, 1]]);
const staleStore = { data: stalePair, prefs: { intensityType: "RIR", duration: 2 }, logs: [{ week: 1, day: 0 }, { week: 2, day: 0 }] };
const staleProg = nWeeks("Panca piana", 3);
const emptyToday = TAE.buildExerciseAnalyticsSnapshot(staleStore, staleProg, { week: 3, day: 0, exIdx: 0, set: 3 });
assert.equal(emptyToday.usedPreviousPair, false, "empty today must not steal W2 vs W1 as today's comparison");
assert.equal(emptyToday.performanceDelta, null);
assert.equal(emptyToday.volumeDelta, null);
assert.equal(emptyToday.currentExposureId, null);

writeSets(stalePair, 3, 0, 0, [[125, 8, 1], [125, 8, 1], [125, 8, 1]]);
staleStore.logs = [{ week: 1, day: 0 }, { week: 2, day: 0 }, { week: 3, day: 0 }];
const todaySnap = TAE.buildExerciseAnalyticsSnapshot(staleStore, nWeeks("Panca piana", 3), { week: 3, day: 0, exIdx: 0, set: 3 });
const todayReco = TAE.recommendNext(staleStore, nWeeks("Panca piana", 3), { week: 3, day: 0, exIdx: 0, set: 3 }, todaySnap);
const todayAx = TAE.analyzeExercise(staleStore, nWeeks("Panca piana", 3), "Panca piana");
assert.equal(todayReco.performanceDelta, todaySnap.performanceDelta);
assert.equal(todayReco.volumeDelta, todaySnap.volumeDelta);
assert.equal(todayReco.fatigueState, todaySnap.fatigue && todaySnap.fatigue.signal);
assert.equal(todayReco.recoveryState, todaySnap.recovery && (todaySnap.recovery.signal || todaySnap.recovery.estimate));
assert.equal(todayReco.currentExposureId, todaySnap.currentExposureId);
assert.equal(todayReco.previousExposureId, todaySnap.previousExposureId);
assert.equal(todayAx.performanceDelta, todaySnap.performanceDelta, "stats analyzeExercise uses the same snapshot pair");
assert.equal(todayAx.volumeVsPrevious, todaySnap.volumeDelta);
assert.ok(todayReco.eligibility && todayReco.eligibility.eligible === true);
assert.ok(todayReco.eligibility.reason);

const contradictBefore = JSON.parse(JSON.stringify(staleStore.data));
const cardPlus = todaySnap.performanceDelta;
const recoPlus = todayReco.performanceDelta;
assert.equal(cardPlus, recoPlus, "screenshot regression: card and recommendation cannot show +1.9 vs -2.6");
assert.equal(todaySnap.volumeDelta, todayReco.volumeDelta, "screenshot regression: card and recommendation cannot show +5.3 vs -8.1");
assert.equal(todayReco.basedOn.performanceDelta, todaySnap.performanceDelta);
assert.equal(todayReco.basedOn.volumeDelta, todaySnap.volumeDelta);
assert.equal(todayReco.basedOn.currentExposureId, todaySnap.currentExposureId);
assert.equal(todayReco.basedOn.previousExposureId, todaySnap.previousExposureId);
assert.equal(todaySnap.source, "exerciseAnalyticsSnapshot");
assert.equal(todaySnap.performanceDeltaPct, todaySnap.performanceDelta);
assert.equal(todaySnap.volumeDeltaPct, todaySnap.volumeDelta);
assert.deepEqual(staleStore.data, contradictBefore);

const trace = TAE.debugExerciseTrace(todaySnap, todayReco);
assert.equal(trace.performanceDelta, todayReco.performanceDelta);
assert.equal(trace.recommendationPerformanceDelta, todayReco.performanceDelta);
assert.equal(trace.volumeDelta, todayReco.volumeDelta);
assert.equal(trace.recommendationVolumeDelta, todayReco.volumeDelta);
assert.equal(trace.currentExposure, todaySnap.currentExposureId);
assert.equal(trace.previousExposure, todaySnap.previousExposureId);

const badMrv = TAE.assertComparableMetric(
  { scope: "global", unit: "sets", period: "program" },
  { scope: "muscle", unit: "sets/week", period: "week" },
  "MRV"
);
assert.equal(badMrv.ok, false);
const goodMrv = TAE.assertComparableMetric(
  { scope: "muscle", unit: "sets/week", period: "week" },
  { scope: "muscle", unit: "sets/week", period: "week" },
  "MRV"
);
assert.equal(goodMrv.ok, true);

const silentNull = TAE.isRecommendationEligible({ empty: true, exposures: 0, lastLoad: null });
assert.equal(silentNull.eligible, false);
assert.ok(silentNull.reason);

assert.ok(html.includes("recommendNext(store, DATA, loc, snap)") && html.includes("live.snapshot"), "UI binds recommendation to the displayed snapshot");
assert.ok(html.includes("PRESTAZIONE ESPRESSA") && html.includes("SFORZO") && html.includes("COSTO (MODELLO)"));
assert.ok(!html.includes(">OUTPUT</div>") && !html.includes(">RESPONSE</div>") && !html.includes(">COST</div>"));
assert.ok(!html.includes("rep.performance && rep.performance.delta") && !html.includes("live.vsPreviousBest"));

TAE.liveAfterSet(abStore, abProg, { week: 2, day: 0, exIdx: 0, set: 3 }, abSnap);
TAE.evaluatePerformanceContext(abSnap);
assert.deepEqual(abStore.data, abBefore);

assert.ok(html.includes("function showLiveSetIntel") && html.includes("acceptIntelRecommendation"), "live post-set and Accept/Keep recommendations");
assert.ok(html.includes("clientMayApplyIntel") && html.includes("CHIEDI AL COACH"), "client cannot apply intel; asks the coach");
assert.ok(html.includes("openPdfStayInApp") && html.includes("blobDownloadWouldNavigate") && html.includes("nurvan-pdf-overlay"), "check PDF stays in-app on iOS/PWA");
assert.ok(!/shareOrSavePdfBlob[\s\S]{0,800}location\.href/.test(html), "PDF share does not navigate location.href");
assert.ok(html.includes("store.intelligence"), "recommendations live outside raw workout rows");
assert.ok(!/function setStatsAdvancedMode[\s\S]{0,220}render\(\);/.test(html), "advanced mode does not full-render");

function primaryMuscle(name) {
  return ((TAE.muscleContributionForExercise(name, {}) || {}).primary || [])[0] || null;
}
[
  ["Panca piana", "PETTO"],
  ["Squat con bilanciere", "GAMBE"],
  ["Rematore con bilanciere", "DORSO"],
  ["Curl manubri", "BRACCIA"],
  ["Alzate laterali", "SPALLE"],
  ["Crunch", "ADDOME"],
  ["Hip thrust", "GAMBE"],
  ["Trazioni alla sbarra", "DORSO"],
  ["Stacco da terra", "GAMBE"],
  ["French press", "BRACCIA"],
  ["Military press", "SPALLE"],
  ["Leg press 45", "GAMBE"]
].forEach(function (row) {
  assert.equal(primaryMuscle(row[0]), row[1], row[0] + " → " + row[1]);
});
const latRaise = TAE.muscleContributionForExercise("Alzate laterali", {});
assert.ok((latRaise.primary || []).indexOf("GAMBE") < 0, "lateral raise is not classified as legs");
assert.equal(TAE.normalizeMuscleId("SCHIENA"), "DORSO");
assert.equal(TAE.normalizeMuscleId("QUADRICIPITI"), "GAMBE");
assert.equal(TAE.normalizeMuscleId("GLUTEI"), "GAMBE");
assert.equal(TAE.normalizeMuscleId("BICIPITI"), "BRACCIA");
assert.deepEqual(TAE.MACRO_MUSCLE_IDS.slice().sort(), ["ADDOME", "BRACCIA", "DORSO", "GAMBE", "PETTO", "SPALLE"]);
const rollIds = (backAll.byMuscle || []).map(function (m) { return m.id; });
rollIds.forEach(function (id) {
  assert.ok(TAE.MACRO_MUSCLE_IDS.indexOf(id) >= 0, "byMuscle key is a macro: " + id);
});
assert.ok(html.includes("id: 'DORSO'") && html.includes("label: 'Dorso'") && !html.includes("label: 'Schiena / Dorsali'"), "UI uses the six macro groups");

const sw = fs.readFileSync(path.join(root, "web/sw.js"), "utf8");
assert.ok(sw.includes("training-analytics-engine.js"), "SW precaches the analytics engine");
assert.ok(sw.includes("analytics13"), "SW cache bumped after analytics snapshot contract");
assert.ok(fs.existsSync(path.join(root, "TRAINING_ANALYTICS_METHODOLOGY.md")), "methodology doc exists");

console.log("OK   training analytics engine formulas + zoom axis + intelligence");
