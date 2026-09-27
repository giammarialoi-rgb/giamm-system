// Shopping list from the meal plan: foods added up over the days of the
// week, as one list or split in two; diary days never count, foods merge only
// by the same name, quantities only in the same unit.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const SRC = fs.readFileSync('web/index.base.html', 'utf8');
const block = (start) => {
  const at = SRC.indexOf(start);
  if (at < 0) throw new Error(start);
  let d = 0;
  for (let i = SRC.indexOf('{', at); i < SRC.length; i++) {
    if (SRC[i] === '{') d++;
    else if (SRC[i] === '}' && --d === 0) return SRC.slice(at, i + 1);
  }
  throw new Error('unterminated ' + start);
};
const ctx = { store: { prefs: {} } };
vm.createContext(ctx);
const weekdays = SRC.slice(SRC.indexOf('const SHOP_WEEKDAYS'), SRC.indexOf('\n', SRC.indexOf('const SHOP_WEEKDAYS')));
vm.runInContext(weekdays + '\n' + ['function shopFold(', 'function shoppingPlanWeek(', 'function selectableFoodUnit(', 'function shoppingListFor(', 'function shoppingQtyText(', 'function shoppingParts(', 'function shoppingPartLabel('].map(block).join('\n') + '\nthis.SHOP_WEEKDAYS = SHOP_WEEKDAYS;', ctx);
const run = (code) => vm.runInContext(code, ctx);

const meals = (foods) => [{ name: 'Pranzo', foods }];
ctx.days = [
  { day: 'Lunedì', meals: meals([{ name: 'Riso', qty: 100, unit: 'g' }, { name: 'Uova', qty: 2, unit: 'pz' }]) },
  { day: 'Martedì', meals: meals([{ name: 'riso', qty: 0.1, unit: 'kg' }, { name: 'Mela' }]) },
  { day: 'Giovedì', meals: meals([{ name: 'Riso', qty: 900, unit: 'g' }, { name: 'Mela' }]) },
  { day: 'Lunedì · 1 set', date: '2026-09-21', meals: meals([{ name: 'Pizza', qty: 1, unit: 'pz' }]) },
];
run('var pw = shoppingPlanWeek(days)');
ok('1a. giorni del piano per nome, il diario escluso', run('pw.week[0].day') === 'Lunedì' && run('pw.week[2]') === null && run('pw.cycled') === false);
const all = run('shoppingListFor(pw.week, 0, 6)');
const riso = all.find((i) => i.name === 'Riso');
ok('1b. riso in g e in kg sommati: 1,1 kg', riso && run('shoppingQtyText(' + JSON.stringify(riso) + ')') === '1,1 kg');
ok('1c. la pizza del diario non c\'e\'', !all.some((i) => /pizza/i.test(i.name)));
const mela = all.find((i) => i.name === 'Mela');
ok('1d. senza quantita\': quante volte', mela && run('shoppingQtyText(' + JSON.stringify(mela) + ')') === '× 2');
ok('1e. uova in pezzi', run('shoppingQtyText(' + JSON.stringify(all.find((i) => i.name === 'Uova')) + ')') === '2 pezzi');

ctx.store.prefs = { shoppingSplit: 'split' };
const parts = run('shoppingParts()');
ok('2a. divisa in due: di default Lun–Mer e Gio–Dom', parts.length === 2 && parts[0].to === 2 && parts[1].from === 3 && run('shoppingPartLabel(shoppingParts()[1])') === 'Giovedì – Domenica');
ok('2b. prima parte: 200 g di riso; seconda: 900 g', run('shoppingQtyText(shoppingListFor(pw.week, 0, 2).find(i => i.name === "Riso"))') === '200 g' && run('shoppingQtyText(shoppingListFor(pw.week, 3, 6)[1] || shoppingListFor(pw.week, 3, 6)[0])') !== '');
ctx.store.prefs = { shoppingSplit: 'split', shoppingSplitAfter: 3 };
ok('2c. divisione scelta: Lun–Gio e Ven–Dom', run('shoppingParts()[0].to') === 3 && run('shoppingParts()[1].from') === 4);
ctx.store.prefs = {};
ok('2d. senza scelta: unica, lunedi\'–domenica', run('shoppingParts().length') === 1 && run('shoppingPartLabel(shoppingParts()[0])') === 'Lunedì – Domenica');

ctx.days = [{ day: 'Giorno ON', meals: meals([{ name: 'Pasta', qty: 80, unit: 'g' }]) }, { day: 'Giorno OFF', meals: meals([{ name: 'Pane', qty: 50, unit: 'g' }]) }];
run('pw = shoppingPlanWeek(days)');
ok('3a. piano senza giorni della settimana: ripetuto in ordine, e lo dice', run('pw.cycled') === true && run('shoppingQtyText(shoppingListFor(pw.week, 0, 6).find(i => i.name === "Pasta"))') === '320 g');
ok('4a. il pulsante sta nell\'alimentazione', /onclick="openShoppingList\(\)">🛒 Lista della spesa/.test(SRC));

console.log('');
if (failed) { console.log(failed + ' controlli della lista della spesa falliti.'); process.exit(1); }
console.log('Tutti i controlli della lista della spesa passano.');
