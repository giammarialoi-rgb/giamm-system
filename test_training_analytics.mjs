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
assert.ok(String(expl.limitations).includes("Not a tested 1RM"));

const html = fs.readFileSync(path.join(root, "web/index.base.html"), "utf8");
assert.ok(html.includes("training-analytics-engine.js"), "stats page loads the engine");
assert.ok(html.includes("INTENSITÀ MEDIA") && !html.includes("id=\"stats-kpi-mode\""), "carico per parte KPI is gone");
assert.ok(html.includes("stats-zoom-slider") && html.includes("setStatsAxis"), "slider + training/date axis");
assert.ok(html.includes("TRAINING MARKET") && html.includes("setStatsAdvancedMode"), "one main chart + advanced exercise/muscle");
assert.ok(html.includes("function showLiveSetIntel") && html.includes("acceptIntelRecommendation"), "live post-set and Accept/Keep recommendations");
assert.ok(html.includes("store.intelligence"), "recommendations live outside raw workout rows");

const sw = fs.readFileSync(path.join(root, "web/sw.js"), "utf8");
assert.ok(sw.includes("training-analytics-engine.js"), "SW precaches the analytics engine");
assert.ok(fs.existsSync(path.join(root, "TRAINING_ANALYTICS_METHODOLOGY.md")), "methodology doc exists");

console.log("OK   training analytics engine formulas + zoom axis + intelligence");
