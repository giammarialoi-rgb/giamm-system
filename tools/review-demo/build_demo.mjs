// Builds tools/review-demo/demo-account-data.json: the data of the demo account the store reviewers use.
// Everything in it is made up (no real person): an active program written by the app's own generator, workouts with
// ticked sets, a day of meals in the food diary, a supplement, a therapy entry, an exam and body checks.
//
//   node preview-webapp.mjs            (port 4173, in another terminal, after npm run build:web)
//   node tools/review-demo/build_demo.mjs
//
// The dates are relative to the day of the build; tools/seed_review_accounts.mjs moves them to the day it runs.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = process.env.APP_URL || 'http://localhost:4173';
const out = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'demo-account-data.json');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-demo-'));
const port = 9700 + Math.floor(Math.random() * 90);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find((t) => t.type === 'page'); } catch (_) {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let seq = 0; const waiting = new Map();
ws.onmessage = (ev) => { const x = JSON.parse(ev.data); if (x.id && waiting.has(x.id)) { waiting.get(x.id)(x); waiting.delete(x.id); } };
const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (body) => {
  const r = await send('Runtime.evaluate', { expression: '(async () => { ' + body + ' })()', awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description).slice(0, 500));
  return r.result && r.result.result && r.result.result.value;
};
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: base + '/?eval=1&b=' + Date.now() });
await sleep(5500);

const json = await evaluate(`
  const day = (n) => { const d = new Date(Date.now() - n * 86400000); return d.toISOString().slice(0, 10); };
  const at = (n, h) => { const d = new Date(Date.now() - n * 86400000); d.setHours(h || 18, 0, 0, 0); return d.toISOString(); };
  const plan = window.NurvanProgramGenerator.plan({ days: 3, weeks: 6, goal: 'hypertrophy', experience: 'beginner', equipment: 'gym' });
  plan.id = 'review_demo_program';
  plan.title = 'Demo Nurvan · Full body 3 giorni · 6 settimane';
  const prog = normalizeProgram(plan);
  prog.id = plan.id;
  // ticked sets: week 1 (3 sessions) and the first two of week 2
  const data = {};
  const sessionsDone = [[1, 0, 9], [1, 1, 7], [1, 2, 5], [2, 0, 2], [2, 1, 1]];
  const logs = [];
  sessionsDone.forEach(([w, d, ago]) => {
    const wk = prog.weeks[w - 1]; const sess = (wk.sessions || wk.days)[d]; const lines = [];
    (sess.exercises || []).forEach((ex, e) => {
      const base = 20 + e * 5 + (w - 1) * 2.5;
      const sets = [];
      for (let s = 1; s <= 3; s++) {
        const k = 'w' + w + '_d' + d + '_e' + e + '_s' + s;
        data[k + '_load'] = String(base); data[k + '_reps'] = String(10 - (s - 1)); data[k + '_done'] = true;
        sets.push({ load: base, reps: 10 - (s - 1) });
      }
      lines.push({ name: ex.name || ex.exercise || ('Esercizio ' + (e + 1)), cardio: false, sets: sets });
    });
    logs.push({ id: 'demo_sess_' + w + '_' + d, at: at(ago), finalizedAt: at(ago, 19), week: w, day: d, programId: prog.id, exerciseLines: lines, sets: lines.length * 3, tonnage: lines.reduce((t, l) => t + l.sets.reduce((a, x) => a + x.load * x.reps, 0), 0) });
  });
  const food = (name, quantity, unit, kcal, pro, carb, fat) => ({ name, quantity, unit, kcal, pro, carb, fat, kcalPer100: Math.round(kcal / quantity * 100), proPer100: +(pro / quantity * 100).toFixed(1), carbPer100: +(carb / quantity * 100).toFixed(1), fatPer100: +(fat / quantity * 100).toFixed(1), notes: '', provenance: { source: 'user_custom', kind: 'Esempio', confidence: 1 } });
  const nutritionDaily = {};
  nutritionDaily[day(1)] = { diary: { source: 'manual', at: at(1, 21), meals: [
    { name: 'Colazione', foods: [food('Fiocchi di avena', 50, 'g', 190, 6.5, 33, 3.5), food('Yogurt greco 0%', 150, 'g', 88, 15, 5.5, 0.4)] },
    { name: 'Spuntino', foods: [] },
    { name: 'Pranzo', foods: [food('Riso basmati (cotto)', 200, 'g', 260, 5, 56, 0.6), food('Petto di pollo', 150, 'g', 165, 34, 0, 2.5), food('Zucchine', 150, 'g', 25, 2, 4, 0.4)] },
    { name: 'Merenda', foods: [food('Mela', 150, 'g', 78, 0.4, 20, 0.3)] },
    { name: 'Cena', foods: [food('Merluzzo', 200, 'g', 164, 36, 0, 1.4), food('Patate lesse', 200, 'g', 140, 3.6, 31, 0.2)] }
  ] } };
  const bodyChecks = [
    { id: 'demo_check_1', at: at(21, 8), weight: 72.4, period: 'weekly', notes: 'Esempio: primo check', kind: 'manual' },
    { id: 'demo_check_2', at: at(14, 8), weight: 72.0, period: 'weekly', notes: '', kind: 'manual' },
    { id: 'demo_check_3', at: at(7, 8), weight: 71.6, period: 'weekly', notes: 'Esempio: settimana 3', kind: 'manual' }
  ];
  const exams = { present: true, reminders: [], records: [
    { parameter: 'Glicemia', value: 88, unit: 'mg/dL', range: '70-99', date: day(30), notes: 'Esempio inventato' },
    { parameter: 'Vitamina D (25-OH)', value: 34, unit: 'ng/mL', range: '30-100', date: day(30), notes: 'Esempio inventato' }
  ] };
  const therapy = { present: true, protocols: [], entries: [], medications: [
    { name: 'Vitamina D3', medication: 'Vitamina D3', active_ingredient: 'Colecalciferolo', principio_attivo: 'Colecalciferolo', category: 'Integratore', dose: '2000 UI', timing: 'Mattina', days: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'], notes: 'Voce di esempio per la demo: non è una prescrizione' }
  ] };
  const supplementation = { present: true, protocol_name: 'Esempio', items: [
    { name: 'Creatina monoidrato', dose: '5 g', timing: 'Al mattino', days: ['Tutti i giorni'], notes: 'Voce di esempio' }
  ] };
  return JSON.stringify({
    builtOn: day(0),
    profile: { name: 'Revisore Demo', sex: 'm', age: 34, height: 178, weight: 71.6, goal: 'Ipertrofia', allergies: [] },
    activeProgram: prog, activeProgramId: prog.id, currentWeek: 2, currentDay: 2,
    data: data, logs: logs, bw: { 1: 72.4, 2: 72.0, 3: 71.6 }, bodyChecks: bodyChecks,
    nutritionDaily: nutritionDaily, exams: exams, therapy: therapy, supplementation: supplementation
  });`);

ws.close(); chrome.kill(); await sleep(300);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
const blob = JSON.parse(json);
fs.writeFileSync(out, JSON.stringify(blob, null, 1) + '\n');
const n = (o) => Object.keys(o || {}).length;
console.log('written ' + out + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB): program "' + blob.activeProgram.title + '" with ' + blob.activeProgram.weeks.length + ' weeks, ' + n(blob.data) + ' diary keys, ' + blob.logs.length + ' workouts, ' + blob.bodyChecks.length + ' checks, ' + n(blob.nutritionDaily) + ' day of meals, ' + blob.exams.records.length + ' exams, ' + blob.therapy.medications.length + ' therapy entry');
