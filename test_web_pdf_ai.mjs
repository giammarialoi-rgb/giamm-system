import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, "web/index.base.html"), "utf8");
const practice = fs.readFileSync(path.join(root, "web/coach-practice-ui.js"), "utf8");

assert.ok(html.includes("pdfExerciseDisplayName"), "check/workout PDF use substituted names");
assert.ok(html.includes("sortLogsChronological"), "logs sorted first→last");
assert.ok(!/logs\.slice\(\)\.reverse\(\)/.test(html.match(/function collectCheckFisicoPdfExtraLines[\s\S]*?function buildCheckFisicoPdfBytes/)[0]), "check extra lines are not newest-first");
assert.ok(html.includes('value="range"') && html.includes('value="pick"'), "export modal has range and picker");
assert.ok(html.includes("pdf-inc-logged") && html.includes("pdf-inc-planned"), "export modal has load toggles");
assert.ok(html.includes("collectStructuredNutritionPlanLines"), "check PDF reuses structured nutrition");
assert.ok(/askAIInner\(buildCheckFisicoCoachPrompt|askAIInner\(prompt/.test(html.match(/async function analyzeCheckFisicoWithCoach[\s\S]*?function setCheckFisicoPdfOpt/)[0]), "analyze uses askAIInner");
assert.ok(!/askAI\(prompt\)/.test(html.match(/async function analyzeCheckFisicoWithCoach[\s\S]*?function setCheckFisicoPdfOpt/)[0]), "analyze no longer calls askAI(prompt)");
assert.ok(html.includes("function classifyMaxTestLift") && html.includes("weekExerciseWasLogged"), "taper classifies lift and skips logged weeks");
assert.ok(html.includes("function openSavedCheckFisico") && html.includes("function openLoggedSessionReview"), "storico reopen exists");
assert.ok(html.includes("draft.clearedAt = Date.now()"), "save check clears compose draft");
assert.ok(practice.includes("buildPersonalExerciseInfoPrompt") && practice.includes("askAIInner"), "personal CHIEDI INFO goes to Coach AI");
assert.ok(/if \(!athleteOk\) \{[\s\S]*navigate\('ai'\)/.test(practice), "personal path navigates to ai");
assert.ok(!/if \(!athleteOk\) \{\s*practiceToast\(prefill/.test(practice), "personal path is not toast-only");

const start = html.indexOf("function maxTestKey");
const end = html.indexOf("function pdfSessionKey");
assert.ok(start >= 0 && end > start, "max-test helpers exist");
const extraStart = html.indexOf("function sortLogsChronological");
const extraEnd = html.indexOf("function summarizeCheckLogs");
const loggedStart = html.indexOf("function weekExerciseWasLogged");
const loggedEnd = html.indexOf("function collectSetLogsAtWeek");
const finStart = html.indexOf("function isTrainingDayFinalized");
const finEnd = html.indexOf("function advanceToNextOpenTrainingDay");
const nameStart = html.indexOf("function pdfExerciseDisplayName");
const nameEnd = html.indexOf("function workoutPdfScopeBounds");

const code = [
  html.slice(loggedStart, loggedEnd),
  html.slice(finStart, finEnd),
  html.slice(start, end),
  html.slice(extraStart, extraEnd),
  html.slice(nameStart, nameEnd)
].join("\n");

const store = {
  data: {
    w1_d0_e0_s1_done: 1,
    w1_d0_e0_s1_load: 100
  },
  logs: [{ week: 1, day: 0, at: "2026-09-02T10:00:00.000Z" }],
  subs: { w2_d0_e0: "Panca sostituita" }
};
const DATA = {
  weeks: [
    { week: 1, sessions: [{ exercises: [{ name: "Panca piana", sets: [{ reps: "8-12" }, { reps: "8-12" }, { reps: "8-12" }], repsTarget: "8-12" }] }] },
    { week: 2, sessions: [{ exercises: [{ name: "Panca piana", sets: [{ reps: "8-12" }, { reps: "8-12" }, { reps: "8-12" }], repsTarget: "8-12" }] }] },
    { week: 3, sessions: [{ exercises: [{ name: "Panca piana", sets: [{ reps: "8-12" }, { reps: "8-12" }, { reps: "8-12" }], repsTarget: "8-12" }] }] },
    { week: 4, sessions: [{ exercises: [{ name: "Panca piana", sets: [{ reps: "8-12" }, { reps: "8-12" }, { reps: "8-12" }], repsTarget: "8-12" }] }] }
  ]
};
const ctx = {
  store,
  DATA,
  currentWeek: 1,
  currentDay: 0,
  Number,
  Math,
  Array,
  String,
  parseFloat,
  Boolean,
  Object,
  console
};
vm.createContext(ctx);
vm.runInContext(code, ctx);

assert.equal(ctx.classifyMaxTestLift("Panca piana"), "bench");
assert.equal(ctx.classifyMaxTestLift("Stacco da terra"), "deadlift");
assert.equal(ctx.classifyMaxTestLift("Squat basso"), "squat");
assert.equal(ctx.classifyMaxTestLift("Military press"), "military");
assert.equal(ctx.classifyMaxTestLift("Trazioni prese strette"), "pullup");

const sorted = ctx.sortLogsChronological([
  { week: 1, day: 0, at: "2026-09-02T10:00:00.000Z" },
  { week: 2, day: 0, at: "2026-09-01T10:00:00.000Z" }
]);
assert.equal(sorted[0].week, 2);
assert.equal(sorted[1].week, 1);
assert.equal(ctx.pdfExerciseDisplayName(2, 0, 0, { name: "Panca piana" }), "Panca sostituita");

const w1sets = JSON.parse(JSON.stringify(DATA.weeks[0].sessions[0].exercises[0].sets));
ctx.applyMaxTestAdaptation("panca piana", {
  exercise: "Panca piana",
  originalName: "Panca piana",
  exIdx: 0,
  targetWeek: 4
});
assert.deepEqual(DATA.weeks[0].sessions[0].exercises[0].sets, w1sets, "logged week 1 sets untouched");
assert.equal(DATA.weeks[0].sessions[0].exercises[0].repsTarget, "8-12");
assert.notEqual(String(DATA.weeks[3].sessions[0].exercises[0].repsTarget), "8-12", "test week drops 8-12");
assert.equal(DATA.weeks[3].sessions[0].exercises[0].sets.some(function (s) { return Number(s.reps) === 1; }), true);
assert.equal(DATA.weeks[2].sessions[0].exercises[0].sets.length, 3);
assert.equal(Number(DATA.weeks[2].sessions[0].exercises[0].sets[0].reps), 3);

console.log("OK   web pdf / coach AI / massimale / storico");
