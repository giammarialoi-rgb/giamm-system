// A hundred people asking the Coach AI at once: how the server holds up.
import fs from 'node:fs';
import vm from 'node:vm';
import { createAiLimiter } from './server/ai/limiter.mjs';
import { cleanTrainingData, trainingTools } from './server/coach-ai/training-tools.mjs';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- the line
{
  const lim = createAiLimiter({ max: 3, maxQueue: 10, waitMs: 5000 });
  let live = 0, peak = 0;
  const order = [];
  const job = (i, ms) => lim.run(async () => { live++; peak = Math.max(peak, live); order.push(i); await sleep(ms); live--; return i; });
  const res = await Promise.all(Array.from({ length: 9 }, (_, i) => job(i, 20)));
  ok('never more than the limit at once', peak === 3);
  ok('everyone is served, in order of arrival', res.length === 9 && order.join() === '0,1,2,3,4,5,6,7,8');
  ok('nothing is left running or waiting', lim.stats().running === 0 && lim.stats().queued === 0 && lim.stats().served === 9);
}
{
  const lim = createAiLimiter({ max: 1, maxQueue: 2, waitMs: 5000 });
  const slow = lim.run(() => sleep(60));
  const a = lim.run(() => 'a'), b = lim.run(() => 'b');
  const full = await lim.run(() => 'c').catch((e) => e);
  ok('a line that is too long answers at once with a retry message', full instanceof Error && full.aiQueue === 'full' && full.status === 429 && /riprova/.test(full.message));
  await Promise.all([slow, a, b]);
  ok('the ones in line were still served', lim.stats().served === 3 && lim.stats().rejectedFull === 1);
}
{
  const lim = createAiLimiter({ max: 1, maxQueue: 5, waitMs: 30 });
  const slow = lim.run(() => sleep(120));
  const late = await lim.run(() => 'x').catch((e) => e);
  ok('a wait that is too long ends with a retry message', late.aiQueue === 'timeout' && lim.stats().rejectedTimeout === 1);
  await slow;
  ok('a call that failed gives its place back', await (async () => {
    const l = createAiLimiter({ max: 1 });
    await l.run(() => { throw new Error('boom'); }).catch(() => {});
    return (await l.run(() => 'fine')) === 'fine' && l.stats().running === 0;
  })());
}

// ---- a hundred accounts, each question being three steps (ask, two tool rounds)
{
  const lim = createAiLimiter({ max: 20, maxQueue: 300, waitMs: 45000 });
  const t0 = Date.now();
  let live = 0, peak = 0, failedSteps = 0;
  const step = () => lim.run(async () => { live++; peak = Math.max(peak, live); await sleep(30); live--; });
  await Promise.all(Array.from({ length: 100 }, async () => { for (let i = 0; i < 3; i++) await step().catch(() => { failedSteps++; }); }));
  ok('100 users x 3 steps: all served, none refused', failedSteps === 0 && lim.stats().served === 300);
  ok('and never more than 20 calls to the provider at once', peak <= 20);
  console.log('     (simulated: ' + (Date.now() - t0) + ' ms for 300 steps of 30 ms)');
}

// ---- how heavy is the request
{
  const exercises = ['Panca piana bilanciere', 'Rematore bilanciere', 'Squat bilanciere', 'Stacco rumeno', 'Military press', 'Trazioni presa prona', 'Curl manubri', 'French press', 'Calf raise in piedi'];
  const sessions = Array.from({ length: 120 }, (_, i) => ({
    d: new Date(Date.UTC(2026, 0, 1) + i * 86400000 * 1.5).toISOString().slice(0, 10), w: (i % 12) + 1, day: i % 4, n: 'Giorno ' + ((i % 4) + 1) + ' - Upper', min: 62, t: 7400, s: 22,
    m: { PETTO: 8, DORSO: 8, SPALLE: 4, BRACCIA: 6 },
    l: exercises.map((n) => ({ n, s: [[82.5, 8], [82.5, 8], [82.5, 7], [80, 8]], wu: [[40, 10], [60, 6]] }))
  }));
  const body = JSON.stringify({ message: 'Come sto andando?', context: { trainingData: { unit: 'kg', date: '2026-10-03', sessions, bodyWeight: [] } } });
  const kb = Math.round(body.length / 1024);
  console.log('     (a heavy history, 120 sessions of 9 exercises: ' + kb + ' KB per question)');
  ok('even a heavy history is a light request (under 250 KB)', kb < 250);
  const data = cleanTrainingData(JSON.parse(body).context.trainingData);
  ok('it is cleaned and the tools answer from it in a few milliseconds', (() => {
    const t0 = process.hrtime.bigint();
    const tools = trainingTools(data);
    for (let i = 0; i < 50; i++) { tools.call('get_exercise_history', { exercise: 'panca' }); tools.call('get_muscle_volume', { weeks: 12 }); tools.call('get_stats_summary', { days: 90 }); }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log('     (150 tool calls: ' + Math.round(ms) + ' ms)');
    return ms < 1500;
  })());
  ok('the server keeps at most 150 sessions of a history', data.sessions.length <= 150);
}

// ---- the wiring
const api = fs.readFileSync('coach-api.mjs', 'utf8').replace(/\r\n/g, '\n');
ok('every call to the provider goes through the line', /aiLimiter\.run\(\(\) => ai\.models\.generateContent\(request\)\)/.test(api));
ok('a refused place is not retried', /if \(err && err\.aiQueue\) \{[\s\S]*break;/.test(api));
ok('the line can be tuned from the environment', /AI_MAX_CONCURRENT/.test(api) && /AI_QUEUE_MAX/.test(api) && /AI_QUEUE_WAIT_MS/.test(api));
const gw = fs.readFileSync('server/ai/gateway.mjs', 'utf8');
ok('the Vertex path passes the tools on and returns the model\'s tool requests', /const \{ tools, \.\.\.generationConfig \} = config;/.test(gw) && /functionCalls: calls\.length \? calls : undefined/.test(gw));

// ---- when the provider answers "overloaded"
ok('the chat waits seconds, not fractions of a second, between tries', /const delaysMs = patient \? \[0, 1500, 4000, 9000\] : \[0, 700, 1800\];/.test(api));
ok('the last tries can go to fallback models chosen on the server, one or several', /AI_FALLBACK_MODEL/.test(api) && /split\(","\)/.test(api) && /attempt >= firstFallbackAt/.test(api));
ok('all three chat calls use it', (api.match(/\.\.\.CHAT_RETRY/g) || []).length === 3);
ok('a failure says which model and which status, to read in the logs', /failed \(\$\{useModel\}, status/.test(api));

// the models actually used, try by try (the real function, with the provider stubbed)
{
  const start = api.indexOf('async function generateContentWithRetry(');
  const src = api.slice(start, api.indexOf('\n}\n', start) + 3);
  const run = async (fallbacks, failFirst) => {
    const used = [];
    const ctx = vm.createContext({
      console: { warn() {} }, sleep: () => Promise.resolve(), aiLimiter: { run: (fn) => fn() },
      isRetryableGeminiError: () => true, geminiErrorStatus: () => 503, Math, Promise
    });
    vm.runInContext(src, ctx);
    ctx.__ai = { models: { generateContent: async (req) => { used.push(req.model); if (used.length <= failFirst) { const e = new Error('overloaded'); e.status = 503; throw e; } return { text: 'ok from ' + req.model }; } } };
    let out = null, err = null;
    try { out = await vm.runInContext("generateContentWithRetry(__ai, { model: 'A', partsAttempts: [[{ text: 'x' }]], label: 't', patient: true, fallbackModels: " + JSON.stringify(fallbacks) + " })", ctx); } catch (e) { err = e; }
    return { used, out, err };
  };
  const two = await run(['B', 'C'], 99);
  ok('two fallbacks: the first two tries stay on the main model, then B, then C', two.used.join() === 'A,A,B,C' && two.err);
  const one = await run(['B'], 99);
  ok('one fallback: it takes the last try', one.used.join() === 'A,A,A,B');
  const none = await run([], 99);
  ok('no fallback: four tries on the main model, patiently', none.used.join() === 'A,A,A,A');
  const same = await run(['A'], 99);
  ok('a fallback equal to the main model is ignored', same.used.join() === 'A,A,A,A');
  const rescued = await run(['B', 'C'], 2);
  ok('if a fallback answers, that answer is used and the rest is not tried', rescued.used.join() === 'A,A,B' && rescued.out && rescued.out.text === 'ok from B');
  const quick = await run(['B'], 0);
  ok('when the main model answers, nothing else is called', quick.used.join() === 'A' && quick.out.text === 'ok from A');
}

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nCoach AI sotto carico: tutto verde');
