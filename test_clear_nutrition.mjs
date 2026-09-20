import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const i18n = fs.readFileSync(path.join(root, 'prepare_task20_js_services.mjs'), 'utf8');
const practice = fs.readFileSync(path.join(root, 'web/coach-practice-ui.js'), 'utf8');

for (const token of [
  'function canClearPersonalNutrition(',
  'function personalNutritionClearButtonHtml(',
  'function applyPersonalNutritionClear(',
  'async function clearPersonalNutrition(',
  'onclick="clearPersonalNutrition()"',
  'data-clear-domain="nutrition"',
  "emptyDomainShell('nutrition')"
]) {
  ok(html.includes(token), `source contains ${token}`);
  ok(built.includes(token), `built PWA contains ${token}`);
}

ok(html.includes('if (!confirm(confirmMsg)) return;'), 'clear requires confirmation');
ok(html.includes("clearCoachClientDomain('nutrition')"), 'coach client view reuses CANCELLA path');
ok(html.includes('function canClearPersonalNutrition') && html.includes('athleteCanSelfGeneratePlans()'), 'athlete freedom gate is respected');

const applyStart = html.indexOf('function applyPersonalNutritionClear');
const applyEnd = html.indexOf('function openNutritionBackupsModal');
ok(applyStart >= 0 && applyEnd > applyStart, 'apply helper is extractable');
const applySrc = html.slice(applyStart, applyEnd);
ok(!/DATA\.weeks|store\.data|customSets|store\.logs|supplementation|therapy|exams|personal-recovery-16w/.test(applySrc),
  'apply helper writes only nutrition fields');

const emptyStart = practice.indexOf('function emptyDomainShell');
const emptyEnd = practice.indexOf('function isClearedDomainPayload');
ok(emptyStart >= 0 && emptyEnd > emptyStart, 'emptyDomainShell exists in coach practice');

const ctx = {
  DATA: {
    title: 'Upper/Lower 16w',
    weeks: [{ week: 3, days: [{ name: 'A', exercises: [{ name: 'Panca' }] }] }],
    nutrition: {
      plan_name: 'Piano test',
      present: true,
      days: [{ day: 'Lunedì', meals: [{ name: 'Pranzo', foods: [{ name: 'Riso', quantity: 80 }] }] }]
    },
    supplementation: { protocol_name: 'Base', items: [{ name: 'Creatina' }], present: true },
    therapy: { medications: [{ name: 'Eutirox' }], present: true },
    exams: { records: [{ parameter: 'TSH', value: '1' }], present: true }
  },
  store: {
    data: { 'w3d1s0': { load: 80 } },
    customSets: { panca: 1 },
    logs: [{ at: '2026-09-01', exercise: 'Panca' }],
    nutrition: null,
    supplementation: { protocol_name: 'Base', items: [{ name: 'Creatina' }] },
    therapy: { medications: [{ name: 'Eutirox' }] },
    exams: { records: [{ parameter: 'TSH' }] },
    nutritionDaily: { '2026-09-12': { confirmed: true } }
  },
  Date,
  emptyDomainShell: null
};
vm.createContext(ctx);
vm.runInContext(practice.slice(emptyStart, emptyEnd) + '\nthis.emptyDomainShell = emptyDomainShell;\n' + applySrc + '\nthis.applyPersonalNutritionClear = applyPersonalNutritionClear;', ctx);

const weeksBefore = JSON.stringify(ctx.DATA.weeks);
const loadsBefore = JSON.stringify(ctx.store.data);
const logsBefore = JSON.stringify(ctx.store.logs);
const suppBefore = JSON.stringify(ctx.DATA.supplementation);
const therapyBefore = JSON.stringify(ctx.DATA.therapy);
const examsBefore = JSON.stringify(ctx.DATA.exams);

const empty = ctx.applyPersonalNutritionClear({ DATA: ctx.DATA, store: ctx.store });
ok(empty && empty.cleared === true && Array.isArray(empty.days) && empty.days.length === 0, 'returns cleared nutrition shell');
ok(ctx.DATA.nutrition === empty && ctx.store.nutrition === empty, 'writes empty shell to DATA and store');
ok(ctx.store.__cpNutritionDirty && ctx.store.__cpKeepLocalNutrition, 'sets keep-local flags like other nutrition saves');
ok(Object.keys(ctx.store.nutritionDaily).length === 0, 'clears nutrition daily confirmations only');
ok(JSON.stringify(ctx.DATA.weeks) === weeksBefore, 'does not mutate training weeks');
ok(JSON.stringify(ctx.store.data) === loadsBefore, 'does not mutate workout loads');
ok(JSON.stringify(ctx.store.logs) === logsBefore, 'does not mutate workout logs');
ok(JSON.stringify(ctx.DATA.supplementation) === suppBefore, 'does not mutate supplements');
ok(JSON.stringify(ctx.DATA.therapy) === therapyBefore, 'does not mutate therapy');
ok(JSON.stringify(ctx.DATA.exams) === examsBefore, 'does not mutate exams');

ok(i18n.includes('clearNutrition: "Azzera alimentazione"'), 'Italian label matches Azzera style');
ok(i18n.includes('clearNutritionConfirm:') && i18n.includes('clearNutritionDone:'), 'confirm and done strings exist');

const recovery = path.join(root, 'private/personal-recovery-16w.json');
// The owner's own program backup: kept out of the app (anyone with the app's
// URL could download it) and out of every code path that could rewrite it.
const status = execSync('git status --porcelain -- private/personal-recovery-16w.json', { cwd: root }).toString().trim();
// Moving it out of the web app (A/R) is fine; a content change is not.
ok(!status || /^[AR]/.test(status), 'personal-recovery-16w.json was not modified: ' + status);
ok(!fs.existsSync(path.join(root, 'web/personal-recovery-16w.json')), 'and is not served with the app');
ok(fs.existsSync(recovery) && JSON.parse(fs.readFileSync(recovery, 'utf8')).id === 'personal_16w_giammaria', 'personal 16w glass box file still present and untouched');

console.log('\nAll personal nutrition clear tests passed.');
