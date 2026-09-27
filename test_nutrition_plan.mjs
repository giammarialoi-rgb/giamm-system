// Nutritionist plans (web/nutrition-plan.js): "o" alternatives kept as
// alternatives (the first one in use, never the sum), day groups spread on
// the weekdays, timed meals with courses and notes, recipes with values that
// must agree with themselves, generated alternatives with the same calories,
// recipes as their ingredients in the shopping list, recipes synced by item.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const ctx = { console };
ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('web/nutrition-plan.js', 'utf8'), ctx);
const NP = ctx.NurvanNutritionPlan;

// 1. One alternative.
const o1 = NP.parseOption('1 porzione di pancake Avena e Albumi (165 g)');
ok('1a. porzione con grammi fra parentesi: 165 g di pancake', o1.name === 'pancake Avena e Albumi' && o1.quantity === 165 && o1.unit === 'g');
const o2 = NP.parseOption('100 grammi di uovo strapazzato');
ok('1b. "100 grammi di": 100 g', o2.name === 'uovo strapazzato' && o2.quantity === 100 && o2.unit === 'g');
const o3 = NP.parseOption('1Scoop da 25 gr di whey protein isolate (25 g)');
ok('1c. scoop: 25 g di whey', o3.name === 'whey protein isolate' && o3.quantity === 25);
const o4 = NP.parseOption('2 fette di pollo, petto, senza pelle (200 g)');
ok('1d. fette con grammi: 200 g, nome intero', o4.name === 'pollo, petto, senza pelle' && o4.quantity === 200);
const o5 = NP.parseOption('1 cucchiaio da tavola di olio di oliva extravergine (9 g)');
ok('1e. cucchiaio: 9 g di olio di oliva extravergine', o5.name === 'olio di oliva extravergine' && o5.quantity === 9);
const o6 = NP.parseOption('2 unità di uovo di gallina, intero (100 g)');
ok('1f. unità con grammi: 100 g', o6.quantity === 100 && o6.name === 'uovo di gallina, intero');
const o7 = NP.parseOption('2 broccoli');
ok('1g. un conteggio senza grammi resta in pezzi (niente grammi inventati)', o7.quantity === 2 && o7.unit === 'pezzi' && o7.name === 'broccoli');
const o8 = NP.parseOption('q.b di sale da cucina');
ok('1h. q.b.: nessuna quantita\'', o8.qb === true && o8.quantity == null && o8.name === 'sale da cucina');
const o9 = NP.parseOption('1/2 porzione di farinata di ceci (223 g)');
ok('1i. mezza porzione con grammi: 223 g', o9.quantity === 223 && o9.name === 'farinata di ceci');
ok('1j. le "o" dividono le alternative, anche lette come ©', NP.splitOptions('100 grammi di pane integrale o 120 grammi di pasta © 100 grammi di riso').length === 3);

// 2. Day groups.
ok('2a. "LUN, MER E VEN" -> lunedi\', mercoledi\', venerdi\'', JSON.stringify(NP.weekdaysOf('LUN, MER E VEN')) === '[0,2,4]');
ok('2b. "DOMENICA" -> domenica', JSON.stringify(NP.weekdaysOf('DOMENICA')) === '[6]');
ok('2c. "Lunedì - Venerdì" -> 5 giorni', NP.weekdaysOf('Lunedì - Venerdì').length === 5);
ok('2d. una riga qualunque non e\' un gruppo di giorni', NP.weekdaysOf('PRIMO PIATTO') === null && NP.weekdaysOf('Puoi combinare gli alimenti') === null);

// 3. A plan in three columns, going on to a second page, then recipes.
const col = (group, extra) => [
  'INFORMAZIONI SUL CLIENTE', 'PASTI', group,
  '07:30 COLAZIONE',
  'e 1porzione di pancake Avena e Albumi (165',
  'g) o 100 grammi di uovo strapazzato o 1 porzione di',
  'colazione toast veloce (260 g)',
  'e 1Scoop da 25 gr di whey protein isolate (25 g)',
  'Note',
  'Puoi combinare gli alimenti come preferisci.',
  '13:00 PRANZO',
  'PRIMO PIATTO',
  'e 100 grammi di pane integrale o 120 grammi di',
  'pasta di semola integrale'
].concat(extra || []);
const recipePage = [
  'COLAZIONE TOAST VELOCE',
  'da FRANCESCA TRASIMENO',
  'French toast: pane bagnato nell\'albume e cotto in padella 6 PORZIONE 1',
  'INGREDIENTI',
  'e 1 porzione di pane integrale (50 g) o 50 grammi di pancarrè integrale',
  'e 80 grammi di albume o 50 grammi di philadelphia active',
  'e 1 porzione di frutta (in media), fresca (150 g)',
  'e 5 grammi di miele',
  'COME PREPARARE LA RICETTA INFORMAZIONI NUTRIZIONALI',
  '1° scegliere tra albume, Philadelphia , prosciutto PER 100 g PER PORZIONE (260 g) % AR',
  '2° comporre il toast ENERGIA 113 kcal 294 kcal 12%',
  'PROTEINE 5g 149 7%',
  'CARBOIDRATI 179 439 20%',
  'LIPIDI 3g 8g 10 %'
];
const doc = { pages: [
  { columns: [col('LUN, MER E VEN'), col('MAR, GIO E SAB'), col('DOMENICA')] },
  { columns: [['SECONDO PIATTO', 'e 2 filetti medi di merluzzo (300 g) o 150 grammi di uova fresche', 'o 2 fette di pollo, petto, senza pelle (200', 'g)'], ['SECONDO PIATTO', 'e 200 grammi di orata selvatica, filetti'], ['SECONDO PIATTO', 'e 230 grammi di ceci in scatola']] },
  { columns: [['DESSERT', 'e 100 grammi di dessert generico', 'RACCOMANDAZIONI', 'ASSUNZIONE D\'ACQUA TRA I PASTI', 'Tra 2 e 2.5 litri']], slot: 0 },
  { columns: [recipePage] }
] };
const plan = NP.parsePlanDocument(doc);
ok('3a. letto come piano del nutrizionista', plan && plan.source === 'nutritionist');
ok('3b. sette giorni della settimana dai tre gruppi', plan.days.length === 7 && plan.days[0].day === 'Lunedì' && plan.days[6].day === 'Domenica');
const lun = plan.days[0];
ok('3c. pasti con orario', lun.meals.length === 2 && lun.meals[0].name === 'Colazione' && lun.meals[0].time === '07:30' && lun.meals[1].time === '13:00');
const first = lun.meals[0].foods[0];
ok('3d. una riga = un alimento con le sue alternative, la prima in uso', first.alternatives.length === 3 && first.name === 'pancake Avena e Albumi' && first.quantity === 165 && first.choice === 0);
ok('3e. mai la somma: la riga conta solo l\'alternativa in uso', lun.meals[0].foods.length === 2);
ok('3f. note del pasto', /combinare/.test(lun.meals[0].notes));
const pranzo = lun.meals[1].foods;
ok('3g. portate: primo e secondo', pranzo[0].course === 'Primo piatto' && pranzo[1].course === 'Secondo piatto');
ok('3h. la colonna prosegue sulla pagina dopo, anche una riga spezzata "(200 / g)"', pranzo[1].alternatives.length === 3 && pranzo[1].alternatives[2].quantity === 200);
ok('3i. una colonna sola sulla pagina dopo resta del suo gruppo (dessert di lun/mer/ven)', lun.meals[1].foods.some((f) => f.course === 'Dessert') && !plan.days[1].meals[1].foods.some((f) => f.course === 'Dessert'));
ok('3j. mar/gio/sab hanno il loro secondo', plan.days[1].meals[1].foods[1].name === 'orata selvatica, filetti' && plan.days[6].meals[1].foods[1].name === 'ceci in scatola');
ok('3k. le raccomandazioni finiscono nelle note del piano', /Tra 2 e 2\.5 litri/.test(plan.notes));
ok('3l. i giorni di un gruppo sono indipendenti (cambiarne uno non cambia gli altri)', plan.days[0].meals[0].foods[0] !== plan.days[2].meals[0].foods[0] || (NP.applyChoice(plan.days[0].meals[0].foods[0], 1), plan.days[2].meals[0].foods[0].choice === 0));

// 4. Recipes.
ok('4a. una ricetta letta', plan.recipes.length === 1);
const r = plan.recipes[0];
ok('4b. nome, autore, porzioni', r.name === 'Colazione toast veloce' && r.author === 'FRANCESCA TRASIMENO' && r.portions === 1);
ok('4c. ingredienti con alternative', r.ingredients.length === 4 && r.ingredients[0].alternatives.length === 2 && r.ingredients[3].alternatives[0].name === 'miele');
ok('4d. passi senza la tabella accanto', r.steps.length === 2 && r.steps[1] === 'comporre il toast');
ok('4e. valori: 113 kcal/100 g, porzione 260 g', r.per100.kcal === 113 && r.portionGrams === 260);
ok('4f. "149" letto dall\'OCR per "14g": torna 5 g/100 g, perche\' 5 x 2,6 = 13', r.per100.pro === 5 && r.per100.carb === 17 && r.per100.fat === 3);
const t2 = NP.parseNutritionTable(['PER 100 g PER PORZIONE (303 g)', 'ENERGIA 16 kcal 352 kcal', 'PROTEINE 129 s79', 'CARBOIDRATI 139 409', 'LIPIDI 19 39']);
ok('4g. un valore che non torna con se\' stesso resta vuoto (16 kcal vs 352 in 303 g; "s79")', t2.per100.kcal == null && t2.per100.pro == null && t2.per100.carb === 13 && t2.per100.fat === 1);
const toast = lun.meals[0].foods[0].alternatives[2];
ok('4h. l\'alternativa "colazione toast veloce" e\' la ricetta, con i suoi valori', toast.recipeId === r.id && toast.kcalPer100 === 113 && toast.quantity === 260);

// 4b. What the OCR does to a real plan.
const ocrMeals = NP.parseMealColumn([
  '13:00 PRANZO',
  'CONTORNO',
  'e 500 grammi di verdura a foglia (in media), cotta (senza aggiunta di',
  'grassi o sale)',
  'e 1 porzione di frutta (in media), fresca (300 g) 01',
  'porzione di pane integrale (50 g) o 40 grammi',
  'e 1 unità di barretta ai cereali, senza copertura o ripieno (30 g) o 30 grammi di grana 16:30',
  'MERENDA',
  'e | porzione di pancake Avena e Albumi (165',
  '9g) o 1 scatola di tonno al naturale (5609)',
  'e 1 Scoop da 25 gr di whey protein isolate (25 g) e 1 pacchetto di crackers integrali (30 g)',
  'DESSERT',
  'e 100 grammi di dessert generico',
  'BEVANDA',
  'e 1 bicchiere di vino rosso (125 g)'
]);
ok('4i. un pasto senza orario (MERENDA) prende l\'ora rimasta sulla riga prima', ocrMeals.length === 2 && ocrMeals[1].name === 'Merenda' && ocrMeals[1].time === '16:30');
ok('4j. "o" fra parentesi non divide: (senza aggiunta di grassi o sale)', ocrMeals[0].rows[0].alternatives.length === 1 && /grassi o sale/.test(ocrMeals[0].rows[0].alternatives[0].name));
ok('4k. "01" letto per "o 1": due alternative', ocrMeals[0].rows[1].alternatives.length === 3 && ocrMeals[0].rows[1].alternatives[1].name === 'pane integrale');
ok('4l. "senza copertura o ripieno" resta un nome; l\'ora in fondo alla riga non entra nel nome', ocrMeals[0].rows[2].alternatives.length === 2 && ocrMeals[0].rows[2].alternatives[0].name === 'barretta ai cereali, senza copertura o ripieno' && ocrMeals[0].rows[2].alternatives[1].name === 'grana');
ok('4m. "e | porzione", "9g)" e "(5609)": 1 porzione da 165 g, (5609) = 560 g', ocrMeals[1].rows[0].alternatives[0].quantity === 165 && ocrMeals[1].rows[0].alternatives[1].quantity === 560);
ok('4n. due voci lette su una riga tornano due', ocrMeals[1].rows[1].alternatives[0].name === 'whey protein isolate' && ocrMeals[1].rows[2].alternatives[0].name === 'crackers integrali');
ok('4o. BEVANDA e\' una portata', ocrMeals[1].rows[4].course === 'Bevanda');
const t3 = NP.parseNutritionTable(['PER 100 g PER PORZIONE (260 g) % AR', 'ENERGIA 113 kcal 294 kcal 12%', 'PROTEINE 5g 149 7%', 'CARBOIDRATI 7g 43g 20%', 'LIPIDI 3g 8g 10%']);
ok('4p. "7g 43g" non tornano fra loro: le calorie scelgono 43 g a porzione (16,5 g/100 g)', t3.per100.carb === 16.5 && t3.per100.pro === 5);
const twoCol = NP.parseRecipe([
  'PIZZA DI LENTICCHIE', 'INGREDIENTI',
  'e 150 grammi di lenticchie, decorticate, secche e Per la Farcitura (esempio):',
  'e 1 spicchio di aglio, fresco e 2 broccoli',
  'COME PREPARARE LA RICETTA',
  '1° Sciacquate le lenticchie. Ron 129 579 18 %',
  'e 1 cucchiaino di bicarbonato'
]);
ok('4q. ingredienti su due colonne: il gruppo "Per la Farcitura" solo a destra', twoCol.ingredients.find((i) => /aglio/.test(i.alternatives[0].name)).group == null && twoCol.ingredients.find((i) => /broccoli/.test(i.alternatives[0].name)).group === 'Per la Farcitura (esempio)');
ok('4r. l\'altra colonna dopo i passi: ingredienti, non testo del passo; righe della tabella tolte', twoCol.ingredients.some((i) => /bicarbonato/.test(i.alternatives[0].name)) && twoCol.steps[0] === 'Sciacquate le lenticchie.');

// 5. Choosing.
const f = JSON.parse(JSON.stringify(first));
NP.applyChoice(f, 1);
ok('5a. scegliere l\'alternativa 2: la riga diventa uovo strapazzato 100 g', f.name === 'uovo strapazzato' && f.quantity === 100 && f.choice === 1 && f.alternatives.length === 3);
NP.applyChoice(f, 2);
ok('5b. scegliere la ricetta: porta i valori della ricetta', f.recipeId === r.id && f.kcalPer100 === 113);
NP.applyChoice(f, 1);
ok('5c. tornando a un alimento semplice la ricetta non resta attaccata', f.recipeId == null && f.kcalPer100 == null);

// 6. Generated alternatives.
const catalog = [
  { name: 'Riso basmati', category: 'Cereali', kcal: 360, pro: 7, carb: 79, fat: 0.6 },
  { name: 'Pasta di semola', category: 'Cereali', kcal: 350, pro: 12, carb: 72, fat: 1.5 },
  { name: 'Pane integrale', category: 'Cereali', kcal: 240, pro: 9, carb: 45, fat: 2 },
  { name: 'Olio di oliva', category: 'Oli', kcal: 900, pro: 0, carb: 0, fat: 100 },
  { name: 'Biscotti al burro', category: 'Cereali', kcal: 480, pro: 6, carb: 65, fat: 22 }
];
const gen = NP.generateAlternatives(catalog[0], 80, catalog);
ok('6a. alternative dello stesso gruppo, mai l\'olio', gen.length === 3 && gen.every((g) => g.name !== 'Olio di oliva' && g.name !== 'Riso basmati'));
ok('6b. stesse calorie: 80 g di riso (288 kcal) = 80 g di pasta, 120 g di pane', gen.find((g) => g.name === 'Pasta di semola').quantity === 80 && gen.find((g) => g.name === 'Pane integrale').quantity === 120);
ok('6c. i piu\' vicini nei macro per primi, i biscotti ultimi', gen[gen.length - 1].name === 'Biscotti al burro' && gen.every((g) => g.generated));

const prot = [
  { name: 'Whey isolate', category: 'Proteine', kcal: 370, pro: 90, carb: 1.5, fat: 1, rank: 32 },
  { name: 'Rana, cruda', category: 'Proteine', kcal: 64, pro: 16, carb: 0, fat: 0.2, rank: 999 },
  { name: 'Petto di pollo', category: 'Proteine', kcal: 110, pro: 23, carb: 0, fat: 1.2, rank: 0 },
  { name: 'Tonno al naturale', category: 'Proteine', kcal: 103, pro: 24, carb: 0, fat: 0.8, rank: 8 },
  { name: 'Albume uovo', category: 'Proteine', kcal: 43, pro: 11, carb: 0.7, fat: 0.2, rank: 3 }
];
const g2 = NP.generateAlternatives(prot[0], 25, prot);
ok('6g. alimenti comuni prima: pollo, tonno, albume, non la rana', g2.length === 3 && !g2.some((g) => /Rana/.test(g.name)));

// 6d. The same food in the database, never a close one.
const db = [
  { name: 'Riso Basmati, crudo', kcal: 360 }, { name: 'Riso Basmati, cotto, bollito', kcal: 120 },
  { name: 'Olio di oliva extra vergine', kcal: 899 }, { name: 'Merluzzo o nasello', kcal: 71 },
  { name: 'Ricotta di vacca', kcal: 146 }, { name: 'Yogurt greco, 0% lipidi', kcal: 57 }
];
ok('6d. "riso basmati" = "Riso Basmati, crudo", mai il cotto', NP.sameFood('riso basmati', db).kcal === 360);
ok('6e. "olio di oliva extravergine" = "Olio di oliva extra vergine"; "merluzzo" = "Merluzzo o nasello"', NP.sameFood('olio di oliva extravergine', db).kcal === 899 && NP.sameFood('merluzzo', db).kcal === 71);
ok('6f. nomi vicini non valgono: "frutta (in media), fresca" non e\' "ricotta", "yogurt greco" non e\' "yogurt greco 0%"', NP.sameFood('frutta (in media), fresca', db) === null && NP.sameFood('yogurt greco', db) === null);

// 7. Recipe in the shopping list.
const ings = NP.recipeIngredientsFor({}, { portions: 2, portionGrams: 300, ingredients: [{ alternatives: [{ name: 'lenticchie', quantity: 150, unit: 'g' }] }, { alternatives: [{ name: 'sale', qb: true }] }] }, 300);
ok('7a. una porzione (300 g) di una ricetta per 2: meta\' degli ingredienti', ings[0].quantity === 75 && ings[1].qb === true);
ok('7b. senza peso della porzione non si indovina', NP.recipeIngredientsFor({}, { portions: 1, ingredients: [] }, 200) === null);

// 8. Not a plan.
ok('8a. un programma di allenamento non e\' un piano del nutrizionista', NP.parsePlanDocument({ pages: [{ columns: [['Settimana 1', 'Squat 5x5 80%', 'Panca 4x8']] }] }) === null);

// 9. Recipes sync by item.
const mctx = {};
vm.createContext(mctx);
vm.runInContext(fs.readFileSync('web/domain-merge.js', 'utf8'), mctx);
const M = mctx.NurvanDomainMerge || (mctx.window && mctx.window.NurvanDomainMerge) || mctx.self?.NurvanDomainMerge;
if (M) {
  const a = { __v: 2, days: [], recipes: [{ id: 'r1', name: 'Pizza di lenticchie', updatedAt: 1 }] };
  const b = { __v: 2, days: [], recipes: [{ id: 'r2', name: 'French toast', updatedAt: 2 }] };
  const merged = M.merge(a, b, 'nutrition');
  ok('9a. due telefoni con una ricetta ciascuno: tutte e due restano', merged.recipes.length === 2);
} else {
  ok('9a. merge caricato', false);
}

// 10. The page is wired.
const SRC = fs.readFileSync('web/index.base.html', 'utf8');
ok('10a. lo script e\' caricato', /<script src="nutrition-plan\.js"><\/script>/.test(SRC));
ok('10b. i PDF senza testo (pagine disegnate) passano dall\'OCR a colonne', /ocrDoc = await ocrPdfDocument\(bytes/.test(SRC) && /if \(pdfDrawnPages \|\| /.test(SRC));
ok('10c. pdf.js fissato con il suo hash, e il worker controllato', /PDFJS_SRI = 'sha256-/.test(SRC) && /digest\('SHA-256', buf\)/.test(SRC));
ok('10d. ogni riga ha "cambia combinazione"', /onclick="openFoodSwap\(\$\{currentNutritionDayIndex\}, \$\{mIdx\}, \$\{fIdx\}\)"/.test(SRC));
ok('10e. "solo oggi" non tocca il piano: sta nel giorno di oggi', /rec\.swaps\[fkey\] = foodSwapSnapshot\(o\)/.test(SRC) && /nutritionDayForDisplay\(activeDay\)/.test(SRC));
ok('10f. modificare un alimento con alternative le tiene', /foodObj\.alternatives = old\.alternatives\.slice\(\)/.test(SRC));
ok('10g. offline e Android: il file e\' nella cache e negli asset', /'\.\/nutrition-plan\.js'/.test(fs.readFileSync('web/sw.js', 'utf8')) && /'nutrition-plan\.js'/.test(fs.readFileSync('sync_web_assets.mjs', 'utf8')));

console.log('');
if (failed) { console.log(failed + ' controlli del piano del nutrizionista falliti.'); process.exit(1); }
console.log('Tutti i controlli del piano del nutrizionista passano.');
