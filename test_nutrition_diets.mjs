// The diet generator writes vegetarian and vegan plans from their own meal
// layouts: nothing animal gets in, not even through an allergy substitute,
// the numbers add up, and the main meals still carry their protein.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const html = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const cut = (a, b) => { const i = html.indexOf(a); const j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('block not found: ' + a); return html.slice(i, j); };
const c = { console };
vm.createContext(c);
vm.runInContext([
  cut('function foldAllergenText(s) {', 'function getAllergenIntoleranceCatalog()'),
  cut('const NUTRITION_MEAL_TEMPLATES_ON = {', 'function fillNutritionDayWithMeals('),
  'this.api = { omni: NUTRITION_MEAL_COMBO_VARIANTS, veg: NUTRITION_MEAL_COMBO_VEGETARIAN, vegan: NUTRITION_MEAL_COMBO_VEGAN, allows: dietAllowsFood, pick: nutritionComboTemplates, filter: filterMealTemplateForDiet, norm: normalizeNutritionDiet };'
].join('\n'), c);
const { omni, veg, vegan, allows, pick, filter, norm } = c.api;
const foods = (list) => list.flatMap((v) => Object.values(v).flat());

ok('1a. sette combinazioni vegetariane e sette vegane, come le onnivore', veg.length === 7 && vegan.length === 7 && omni.length === 7);
ok('1b. ognuna ha i cinque pasti', veg.concat(vegan).every((v) => ['Colazione', 'Pranzo', 'Spuntino', 'Spuntino mattina', 'Cena'].every((m) => Array.isArray(v[m]) && v[m].length)));

const badVegan = foods(vegan).filter((f) => !allows(f.name, 'vegana')).map((f) => f.name);
const badVeg = foods(veg).filter((f) => !allows(f.name, 'vegetariana')).map((f) => f.name);
ok('2a. nei piani vegani nessun alimento di origine animale' + (badVegan.length ? ' (' + badVegan.join(', ') + ')' : ''), badVegan.length === 0);
ok('2b. nei piani vegetariani niente carne né pesce' + (badVeg.length ? ' (' + badVeg.join(', ') + ')' : ''), badVeg.length === 0);
ok('2c. il controllo riconosce davvero carne, pesce, uova e latticini', foods(omni).filter((f) => !allows(f.name, 'vegetariana')).length >= 12
  && !allows('Petto di pollo', 'vegana') && !allows('Salmone', 'vegetariana') && !allows('Uova', 'vegana') && !allows('Yogurt greco 0%', 'vegana') && !allows('Whey protein', 'vegana') && !allows('Miele', 'vegana'));
ok('2d. e non scambia per animali gli alimenti vegetali dal nome simile', allows('Yogurt di soia', 'vegana') && allows('Burro di arachidi', 'vegana') && allows('Bevanda di soia', 'vegana') && allows('Burger di soia', 'vegana') && allows('Uova', 'vegetariana') && allows('Petto di pollo', 'onnivora'));

const off = foods(veg).concat(foods(vegan)).filter((f) => {
  const kcal = f.protein * 4 + f.carbs * 4 + f.fat * 9;
  return Math.abs(kcal - f.kcal) > Math.max(25, f.kcal * 0.2);
}).map((f) => f.name + ' ' + f.kcal);
ok('3a. le calorie di ogni alimento tornano con i suoi macro' + (off.length ? ' (' + off.join(', ') + ')' : ''), off.length === 0);
const protein = (meal) => meal.reduce((n, f) => n + f.protein, 0);
ok('3b. pranzo e cena hanno almeno 25 g di proteine anche senza carne', veg.concat(vegan).every((v) => protein(v.Pranzo) >= 25 && protein(v.Cena) >= 25));
const dayProtein = (v) => protein(v.Colazione) + protein(v.Pranzo) + protein(v.Spuntino) + protein(v.Cena);
ok('3c. una giornata vegana da quattro pasti arriva ad almeno 70 g di proteine', vegan.every((v) => dayProtein(v) >= 70));

ok('4a. la dieta sceglie le sue combinazioni', pick(0, true, 'vegana') === vegan[0] && pick(8, true, 'vegetariana') === veg[1] && pick(0, true) === omni[0] && pick(0, true, 'boh') === omni[0]);
ok('4b. un nome sconosciuto vale onnivora', norm('VEGANA') === 'vegana' && norm('') === 'onnivora' && norm('paleo') === 'onnivora');
{
  // What the allergy filter hands back for an excluded food can be animal.
  const out = filter({ Pranzo: [{ name: 'Petto di pollo', unit: 'g' }, { name: 'Riso basmati', unit: 'g' }], Cena: [{ name: 'Uova', unit: 'pz' }] }, 'vegana');
  ok('4c. un sostituto per allergia di origine animale non rientra nel piano vegano', out.Pranzo.length === 1 && out.Pranzo[0].name === 'Riso basmati');
  ok('4d. un pasto non resta mai vuoto', out.Cena.length === 1);
}

ok('5a. la scelta è nel generatore, e sparisce con "solo budget"', /id="gen-nutr-diet-box"/.test(html) && /\['gen-nutr-diet-box', 'gen-nutr-daycount-box'/.test(html) && /function setGenNutritionDiet\(diet\)/.test(html));
ok('5b. il piano ricorda la dieta e, se vegana, dice della B12', /diet: diet,/.test(html) && /la vitamina B12 va integrata/.test(html) && /diet: st\.diet,/.test(html));

console.log('');
if (failed) { console.log(failed + ' controlli delle diete falliti.'); process.exit(1); }
console.log('Tutti i controlli delle diete passano.');
