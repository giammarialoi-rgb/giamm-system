// Sex is asked in three ways everywhere: man, woman, non-binary. The numbers that
// need a sex (resting energy) take the middle of the two formulas for the third;
// the muscle figure is a drawing anyone can switch.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

// ---- the targets
const ctx = vm.createContext({ self: {}, window: {} });
vm.runInContext(read('web/nutrition-targets.js'), ctx);
const N = ctx.self.NurvanNutrition || ctx.self.NURVAN_NUTRITION || ctx.window.NurvanNutrition || Object.values(ctx.self)[0] || Object.values(ctx.window)[0];
const base = { age: 30, height: 175, weight: 75, activity: 3, goal: 'maintain', pace: 'moderate' };
const m = N.mifflin(Object.assign({}, base, { sex: 'm' }));
const f = N.mifflin(Object.assign({}, base, { sex: 'f' }));
const n = N.mifflin(Object.assign({}, base, { sex: 'n' }));
ok('man +5 and woman -161 are unchanged', m - f === 166);
ok('non-binary takes the middle of the two', Math.abs(n - (m + f) / 2) < 0.6);
ok('"Non binario", "Altro" and "x" are the same as "n"', ['Non binario', 'Altro', 'altro', 'x'].every((v) => N.mifflin(Object.assign({}, base, { sex: v })) === n));
ok('a target is proposed for a non-binary person, nothing is missing', (() => { const r = N.propose(Object.assign({}, base, { sex: 'n' })); return r.target && r.target.kcal > 1500 && !r.missing.length; })());
ok('with no answer the sex is still the thing that is missing', N.propose(Object.assign({}, base, { sex: '' })).missing.includes('sesso'));

// ---- where it is asked
const app = read('web/index.base.html');
ok('the profile asks Maschio, Femmina, Non binario', /<option value="n"[^>]*>Non binario<\/option>/.test(app) && />Maschio<\/option>/.test(app) && />Femmina<\/option>/.test(app));
ok('the coach questionnaire offers it too', /options: \['Maschio', 'Femmina', 'Non binario', 'Altro'\]/.test(read('web/coach-practice-ui.js')));
ok('the coach\'s client profile keeps it', /intake\.sex === "Non binario" \|\| intake\.sex === "Altro" \? "n"/.test(read('coach-practice.mjs')));
const land = read('server/site/landings.mjs');
ok('the site\'s calorie calculator offers it', /\["n", "Non binario"\]/.test(land));
ok('the strength-score calculator asks for a comparison category, not for a sex', /"Categoria di confronto", \[\["m", "Maschile"\], \["f", "Femminile"\]\]/.test(land));
const cctx = vm.createContext({});
vm.runInContext(read('site/assets/calc.js'), cctx);
const calc = cctx.NurvanCalc;
const sm = calc.macros({ sex: 'm', age: 30, height: 175, weight: 75, activity: 'moderate', goal: 'maintain' });
const sf = calc.macros({ sex: 'f', age: 30, height: 175, weight: 75, activity: 'moderate', goal: 'maintain' });
const sn = calc.macros({ sex: 'n', age: 30, height: 175, weight: 75, activity: 'moderate', goal: 'maintain' });
ok('the site calculator gives a non-binary person the middle', sn && Math.abs(sn.bmr - (sm.bmr + sf.bmr) / 2) <= 1);
ok('the app\'s own energy estimate does the same', /\(\/\^\(n\|a\|x\)\/\.test\(sex\) \? -78 : 5\)/.test(app));

// ---- the figure
const fn = app.slice(app.indexOf('function athleteSexCode()'), app.indexOf('window.setBodyFigure'));
const store = { prefs: {}, profile: { sex: 'n' }, coachViewingClient: false };
const fctx = vm.createContext({ store, DATA: null });
vm.runInContext(fn, fctx);
ok('non-binary starts from the male drawing, one tap from the other', vm.runInContext('athleteSexCode()', fctx) === 'm');
store.prefs.bodyFigure = 'f';
ok('anyone can pick the female drawing, and it sticks', vm.runInContext('athleteSexCode()', fctx) === 'f');
store.profile.sex = 'f'; store.prefs.bodyFigure = 'm';
ok('a woman can pick the male drawing', vm.runInContext('athleteSexCode()', fctx) === 'm');
store.coachViewingClient = true; store.coachWorkspace = { client: { sex: 'f' }, intake: {} };
ok('a coach looking at a client sees the figure of that client, not their own choice', vm.runInContext('athleteSexCode()', fctx) === 'f');
ok('the statistics card offers both drawings', /Figura femminile/.test(app) && /Figura maschile/.test(app) && /onclick="setBodyFigure\(/.test(app));

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nSesso inclusivo: tutto verde');
