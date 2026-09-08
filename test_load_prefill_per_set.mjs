import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, "web/index.base.html"), "utf8");
const start = html.indexOf("function normalizeExerciseKey");
const end = html.indexOf("function getLoadSuggestion");
assert.ok(start >= 0 && end > start, "prefill helpers exist in index.base.html");
const code = html.slice(start, end);

function makeCtx(overrides) {
  const ctx = {
    store: { data: {}, logs: [], subs: {} },
    DATA: { weeks: [] },
    currentWeek: 2,
    currentDay: 3,
    Number,
    Math,
    Array,
    String,
    parseFloat,
    Boolean,
    console
  };
  Object.assign(ctx, overrides);
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx;
}

function setLoads(data, week, day, ex, loads, extra) {
  extra = extra || {};
  loads.forEach(function (kg, i) {
    const s = i + 1;
    const base = "w" + week + "_d" + day + "_e" + ex + "_s" + s;
    if (kg != null) data[base + "_load"] = kg;
    if (extra.reps != null) data[base + "_reps"] = extra.reps;
    if (extra.rir != null) data[base + "_rir"] = extra.rir;
    if (extra.done) data[base + "_done"] = 1;
  });
}

const weeks = [
  { week: 1, sessions: [{ exercises: [{ name: "Stacco" }] }] },
  { week: 2, sessions: [{ exercises: [{ name: "Stacco" }] }] },
  { week: 3, sessions: [{ exercises: [{ name: "Stacco" }] }] },
  { week: 4, sessions: [{ exercises: [{ name: "Stacco" }] }] }
];
// days are 0-indexed in store keys; currentDay=3 needs 4 sessions
weeks.forEach(function (w) {
  w.sessions = [{}, {}, {}, { exercises: [{ name: "Stacco" }] }];
});

// Week 2: last week 220/200/200 @2, store still has copied 225.5 on every set
{
  const data = {};
  setLoads(data, 1, 3, 0, [220, 200, 200], { reps: 6, rir: 2, done: true });
  setLoads(data, 2, 3, 0, [225.5, 225.5, 225.5]);
  const ctx = makeCtx({
    currentWeek: 2,
    currentDay: 3,
    store: { data: data, logs: [{ week: 1, day: 3 }], subs: {} },
    DATA: { weeks: weeks }
  });
  assert.equal(ctx.effectiveSetLoad(0, 1, {}), 222.5);
  assert.equal(ctx.effectiveSetLoad(0, 2, {}), 202.5);
  assert.equal(ctx.effectiveSetLoad(0, 3, {}), 202.5);
  console.log("OK   week2 ignores copied 225.5 and prefills per-set +2.5");
}

// Week 3: week2 was seeded/copied identical, week1 has real variation
{
  const data = {};
  setLoads(data, 1, 3, 0, [220, 200, 200], { reps: 6, rir: 2, done: true });
  setLoads(data, 2, 3, 0, [225.5, 225.5, 225.5], { reps: 6, rir: 2, done: true });
  setLoads(data, 3, 3, 0, [225.5, 225.5, 225.5]);
  const ctx = makeCtx({
    currentWeek: 3,
    currentDay: 3,
    store: { data: data, logs: [{ week: 1, day: 3 }, { week: 2, day: 3 }], subs: {} },
    DATA: { weeks: weeks }
  });
  const prev = ctx.collectPrevWeekSetLogs(0, {});
  assert.equal(JSON.stringify(prev.map(function (s) { return Number(s.load); })), JSON.stringify([220, 200, 200]));
  assert.equal(ctx.effectiveSetLoad(0, 1, {}), 222.5);
  assert.equal(ctx.effectiveSetLoad(0, 2, {}), 202.5);
  assert.equal(ctx.effectiveSetLoad(0, 3, {}), 202.5);
  console.log("OK   later weeks walk back to last varied week, not copied first-set");
}

// Easy session: +2.5 on each set
{
  const data = {};
  setLoads(data, 1, 3, 0, [220, 200, 200], { reps: 6, rir: 3, done: true });
  const ctx = makeCtx({
    currentWeek: 2,
    currentDay: 3,
    store: { data: data, logs: [{ week: 1, day: 3 }], subs: {} },
    DATA: { weeks: weeks }
  });
  assert.equal(ctx.effectiveSetLoad(0, 1, {}), 222.5);
  assert.equal(ctx.effectiveSetLoad(0, 2, {}), 202.5);
  assert.equal(ctx.effectiveSetLoad(0, 3, {}), 202.5);
  console.log("OK   easy session adds +2.5 per set");
}

// Limit session: keep last week's per-set loads
{
  const data = {};
  setLoads(data, 1, 3, 0, [220, 200, 200], { reps: 6, rir: 0, done: true });
  const ctx = makeCtx({
    currentWeek: 2,
    currentDay: 3,
    store: { data: data, logs: [{ week: 1, day: 3 }], subs: {} },
    DATA: { weeks: weeks }
  });
  assert.equal(ctx.effectiveSetLoad(0, 1, {}), 220);
  assert.equal(ctx.effectiveSetLoad(0, 2, {}), 200);
  assert.equal(ctx.effectiveSetLoad(0, 3, {}), 200);
  console.log("OK   limit session keeps last week's per-set loads");
}

// Confirmed current set is not overwritten
{
  const data = {};
  setLoads(data, 1, 3, 0, [220, 200, 200], { reps: 6, rir: 2, done: true });
  data.w2_d3_e0_s1_load = 230;
  data.w2_d3_e0_s1_done = 1;
  data.w2_d3_e0_s2_load = 225.5;
  const ctx = makeCtx({
    currentWeek: 2,
    currentDay: 3,
    store: { data: data, logs: [{ week: 1, day: 3 }], subs: {} },
    DATA: { weeks: weeks }
  });
  assert.equal(ctx.effectiveSetLoad(0, 1, {}), 230);
  assert.equal(ctx.effectiveSetLoad(0, 2, {}), 202.5);
  console.log("OK   finalized current set stays, other sets still follow last week");
}

// Copied 225.5 marked as user-typed is still stale on unfinalized session
{
  const data = {};
  setLoads(data, 1, 3, 0, [220, 200, 200], { reps: 6, rir: 2, done: true });
  data.w2_d3_e0_s1_load = 225.5;
  data.w2_d3_e0_s1_load_user = 1;
  data.w2_d3_e0_s2_load = 225.5;
  data.w2_d3_e0_s2_load_user = 1;
  data.w2_d3_e0_s3_load = 225.5;
  const ctx = makeCtx({
    currentWeek: 2,
    currentDay: 3,
    store: { data: data, logs: [{ week: 1, day: 3 }], subs: {} },
    DATA: { weeks: weeks }
  });
  assert.equal(ctx.effectiveSetLoad(0, 1, {}), 222.5);
  assert.equal(ctx.effectiveSetLoad(0, 2, {}), 202.5);
  assert.equal(ctx.effectiveSetLoad(0, 3, {}), 202.5);
  console.log("OK   stale copied 225.5 is replaced even if marked user-owned");
}

// Finalized current session keeps stored loads
{
  const data = {};
  setLoads(data, 1, 3, 0, [220, 200, 200], { reps: 6, rir: 2, done: true });
  setLoads(data, 2, 3, 0, [225.5, 225.5, 225.5]);
  const ctx = makeCtx({
    currentWeek: 2,
    currentDay: 3,
    store: { data: data, logs: [{ week: 1, day: 3 }, { week: 2, day: 3 }], subs: {} },
    DATA: { weeks: weeks }
  });
  assert.equal(ctx.effectiveSetLoad(0, 1, {}), 225.5);
  assert.equal(ctx.effectiveSetLoad(0, 2, {}), 225.5);
  console.log("OK   finalized workout loads are left untouched");
}

assert.ok(html.includes("effectiveSetLoad"), "render uses effectiveSetLoad helper");
assert.ok(html.includes("_load_user"), "manual kg edits are marked user-owned");

function twoExWeeks(a, b) {
  return [1, 2, 3, 4].map(function () {
    return { sessions: [{}, {}, {}, { exercises: [{ name: a }, { name: b }] }] };
  });
}

{
  const data = {};
  setLoads(data, 1, 3, 1, [30, 30, 30], { reps: 8, rir: 2, done: true });
  setLoads(data, 2, 3, 1, [30, 30, 30]);
  const ctx = makeCtx({
    currentWeek: 2,
    currentDay: 3,
    store: {
      data: data,
      logs: [{ week: 1, day: 3 }],
      subs: { w2_d3_e1: "Multi bench leverage" }
    },
    DATA: { weeks: twoExWeeks("Panca piana", "Spinte con manubri") }
  });
  assert.equal(ctx.exerciseNameAt(2, 3, 1), "Multi bench leverage");
  assert.equal(ctx.findMatchingExerciseIndex(1, 3, "Multi bench leverage", 1), null);
  assert.equal(ctx.collectPrevWeekSetLogs(1, { name: "Multi bench leverage" }).length, 0);
  assert.equal(ctx.effectiveSetLoad(1, 1, { name: "Multi bench leverage" }), "");
  assert.equal(ctx.effectiveSetLoad(1, 2, { name: "Multi bench leverage" }), "");
  console.log("OK   substituted slot does not inherit previous occupant's kg");
}

{
  const data = {};
  setLoads(data, 1, 3, 0, [80, 75, 75], { reps: 8, rir: 2, done: true });
  const weeksMoved = [
    { sessions: [{}, {}, {}, { exercises: [{ name: "Multi bench leverage" }, { name: "Spinte con manubri" }] }] },
    { sessions: [{}, {}, {}, { exercises: [{ name: "Spinte con manubri" }, { name: "Multi bench leverage" }] }] }
  ];
  const ctx = makeCtx({
    currentWeek: 2,
    currentDay: 3,
    store: { data: data, logs: [{ week: 1, day: 3 }], subs: {} },
    DATA: { weeks: weeksMoved }
  });
  const prev = ctx.collectPrevWeekSetLogs(1, { name: "Multi bench leverage" });
  assert.equal(JSON.stringify(prev.map(function (s) { return Number(s.load); })), JSON.stringify([80, 75, 75]));
  assert.equal(ctx.effectiveSetLoad(1, 1, { name: "Multi bench leverage" }), 82.5);
  assert.equal(ctx.effectiveSetLoad(1, 2, { name: "Multi bench leverage" }), 77.5);
  console.log("OK   same exercise is followed across slots");
}

{
  const data = {};
  setLoads(data, 1, 0, 0, [80, 75], { reps: 8, rir: 2, done: true });
  const weeksOtherDay = [
    { sessions: [{ exercises: [{ name: "Multi bench leverage" }] }, {}, {}, { exercises: [{ name: "Spinte con manubri" }] }] },
    { sessions: [{ exercises: [{ name: "Spinte con manubri" }] }, {}, {}, { exercises: [{ name: "Multi bench leverage" }] }] }
  ];
  const ctx = makeCtx({
    currentWeek: 2,
    currentDay: 3,
    store: { data: data, logs: [{ week: 1, day: 0 }], subs: {} },
    DATA: { weeks: weeksOtherDay }
  });
  const prev = ctx.collectPrevWeekSetLogs(0, { name: "Multi bench leverage" });
  assert.equal(JSON.stringify(prev.map(function (s) { return Number(s.load); })), JSON.stringify([80, 75]));
  console.log("OK   same exercise is followed across days");
}

console.log("OK   per-set load prefill");
