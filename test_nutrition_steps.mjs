// I passi sono del giorno che stai guardando.
//
// Erano scritti su oggi, sempre, dentro una schermata che mostra un giorno
// alla volta: scrivere i passi di un giorno appena aggiunto li salvava su
// oggi, e lo stesso numero restava lì qualunque giorno aprissi. Da fuori
// sembrava che il bottone non facesse niente.
//
// Le funzioni vivono dentro la pagina: qui vengono ritagliate dal sorgente e
// fatte girare con uno store finto, così il controllo è su quello che gira
// davvero e non su una copia.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');

let failed = 0;
function ok(message, value) {
  try {
    assert.ok(value, message);
    console.log('OK   ' + message);
  } catch (e) {
    failed++;
    console.log('FAIL ' + message);
  }
}
function eq(actual, expected, message) {
  const a = actual !== null && typeof actual === 'object' ? JSON.stringify(actual) : actual;
  const b = expected !== null && typeof expected === 'object' ? JSON.stringify(expected) : expected;
  try {
    assert.equal(a, b);
    console.log('OK   ' + message);
  } catch (e) {
    failed++;
    console.log('FAIL ' + message + '\n     atteso ' + JSON.stringify(expected) + ', ottenuto ' + JSON.stringify(actual));
  }
}

// One function, from its declaration to the brace that closes it at column 0.
function grab(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) return '';
  const end = SRC.indexOf('\n}', at);
  return end < 0 ? '' : SRC.slice(at, end + 2) + '\n';
}

const slice = ['nutritionStepsDay', 'nutritionStepsValue', 'nutritionStepsLabel', 'saveNutritionSteps']
  .map(grab).join('\n');

console.log('\n--- i passi seguono il giorno aperto ---');
ok('0a. le quattro funzioni si ritagliano dal sorgente della pagina', slice.length > 800);

const TODAY = '2026-09-23';
const ctx = {
  console,
  DATA: null,
  store: null,
  currentNutritionDayIndex: 0,
  window: {},
  document: { getElementById: function () { return ctx.input; } },
  input: { value: '' },
  nutritionTodayKey: function () { return TODAY; },
  formatNutritionDayDate: function (iso) { return String(iso || '').slice(8, 10) + '/' + String(iso || '').slice(5, 7); },
  persist: function () { ctx.persisted = (ctx.persisted || 0) + 1; },
  showToast: function (msg) { ctx.toast = msg; },
  render: function () { ctx.rendered = (ctx.rendered || 0) + 1; },
  persisted: 0,
  rendered: 0,
  toast: ''
};
vm.createContext(ctx);
vm.runInContext(slice, ctx);

function reset(days, dayIndex) {
  ctx.DATA = { nutrition: { days: days } };
  ctx.store = { nutritionDaily: {}, health: {}, accountToken: '' };
  ctx.currentNutritionDayIndex = dayIndex || 0;
  ctx.input.value = '';
}

const DAYS = [
  { day: 'Lunedì', date: '2026-09-21', meals: [] },
  { day: 'Martedì', date: '2026-09-22', meals: [] },
  { day: 'Mercoledì', date: TODAY, meals: [] }
];

console.log('\n--- 1. ogni giorno tiene i suoi passi ---');
{
  reset(DAYS, 0);
  ctx.input.value = '12345';
  vm.runInContext('saveNutritionSteps();', ctx);
  eq(ctx.store.nutritionDaily['2026-09-21'].steps, 12345, '1a. i passi scritti su lunedì finiscono su lunedì');
  ok('1b. e non su oggi', !ctx.store.nutritionDaily[TODAY]);

  ctx.currentNutritionDayIndex = 1;
  eq(vm.runInContext('nutritionStepsValue()', ctx), '', '1c. cambiando giorno il campo è quello di quel giorno, vuoto');
  ctx.input.value = '7000';
  vm.runInContext('saveNutritionSteps();', ctx);
  eq(ctx.store.nutritionDaily['2026-09-22'].steps, 7000, '1d. e quello che scrivi lì resta lì');

  ctx.currentNutritionDayIndex = 0;
  eq(vm.runInContext('nutritionStepsValue()', ctx), 12345, '1e. tornando su lunedì ci sono ancora i suoi');
}

console.log('\n--- 2. il campo dice di che giorno sta parlando ---');
{
  reset(DAYS, 0);
  ok('2a. un giorno passato porta il suo nome e la sua data',
    /Luned/.test(vm.runInContext('nutritionStepsLabel()', ctx)) && /21\/09/.test(vm.runInContext('nutritionStepsLabel()', ctx)));
  ctx.currentNutritionDayIndex = 2;
  eq(vm.runInContext('nutritionStepsLabel()', ctx), 'Passi di oggi (opzionale)', '2b. e oggi si chiama oggi');
}

console.log('\n--- 3. un giorno senza data è oggi, e lo dice ---');
{
  reset([{ day: 'Giorno 1', meals: [] }], 0);
  eq(vm.runInContext('nutritionStepsDay().key', ctx), TODAY, '3a. una giornata di piano senza data scrive su oggi');
  eq(vm.runInContext('nutritionStepsDay().isToday', ctx), true, '3b. e si sa che è oggi');
  eq(vm.runInContext('nutritionStepsLabel()', ctx), 'Passi di oggi (opzionale)', '3c. l\'etichetta non promette altro');
}

console.log('\n--- 4. la stima di recupero legge oggi, non la settimana scorsa ---');
{
  reset(DAYS, 0);
  ctx.input.value = '12345';
  vm.runInContext('saveNutritionSteps();', ctx);
  ok('4a. i passi di un giorno passato non diventano "i tuoi passi" in home', ctx.store.health.steps === undefined);

  ctx.currentNutritionDayIndex = 2;
  ctx.input.value = '9100';
  vm.runInContext('saveNutritionSteps();', ctx);
  eq(ctx.store.health.steps, 9100, '4b. quelli di oggi sì');
  eq(ctx.store.health.stepsSource, 'manual', '4c. e si sa che li hai scritti tu');

  ctx.input.value = '';
  vm.runInContext('saveNutritionSteps();', ctx);
  ok('4d. cancellandoli sparisce anche il numero in home', ctx.store.health.steps === undefined);
  ok('4e. e la riga del giorno resta senza passi', ctx.store.nutritionDaily[TODAY].steps === undefined);
}

console.log('\n--- 5. quello che l\'app dice di aver fatto ---');
{
  reset(DAYS, 0);
  ctx.input.value = '8000';
  vm.runInContext('saveNutritionSteps();', ctx);
  ok('5a. il messaggio dice quanti passi e su che giorno', /8000 passi salvati/.test(ctx.toast) && /Luned/.test(ctx.toast));
  ok('5b. e la scheda viene salvata davvero', ctx.persisted > 0);
  ok('5c. e la schermata ridisegnata', ctx.rendered > 0);
}

console.log('');
if (failed) { console.log(failed + ' test dei passi falliti.'); process.exit(1); }
console.log('Tutti i test dei passi passano.');
