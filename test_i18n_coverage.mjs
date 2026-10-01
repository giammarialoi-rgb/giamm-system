// The app in every language: the texts written in Italian in the code are
// all listed (i18n/strings.json), every language translates all of them
// (i18n/tm/<lang>.json -> web/i18n/<lang>.json), and the page layer
// (web/i18n-runtime.js) puts the translation in place of the Italian text.
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { LANGS, problems } from './tools/i18n_pack.mjs';
import { JS_PRODUCT_SERVICES } from './prepare_task20_js_services.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const json = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

// 1. The list of texts is the one the code has now.
let listFresh = true;
try { execFileSync(process.execPath, ['tools/i18n_extract.mjs', '--check'], { stdio: 'pipe' }); } catch (e) { listFresh = false; console.log(String(e.stdout || '').split('\n').slice(0, 12).join('\n')); }
ok('1a. i18n/strings.json corrisponde ai testi del codice (node tools/i18n_extract.mjs)', listFresh);
const keys = json('i18n/strings.json');
ok('1b. migliaia di testi, non una manciata', keys.length > 5000);

// 2. Every language has every text, with the same holes.
for (const lang of LANGS) {
  const tm = fs.existsSync('i18n/tm/' + lang + '.json') ? json('i18n/tm/' + lang + '.json') : {};
  const bad = keys.filter((k) => !(k in tm) || problems(k, tm[k]));
  ok('2a. ' + lang + ': tutti i ' + keys.length + ' testi tradotti' + (bad.length ? ' (mancano ' + bad.length + ': ' + bad.slice(0, 3).map((k) => k.slice(0, 40)).join(' | ') + ')' : ''), bad.length === 0);
  const pack = fs.existsSync('web/i18n/' + lang + '.json') ? json('web/i18n/' + lang + '.json') : {};
  const stale = keys.filter((k) => (k in tm) && (tm[k] !== k || /\{\d+\}/.test(k)) && pack[k] !== tm[k]);
  ok('2b. ' + lang + ': web/i18n/' + lang + '.json aggiornato (node tools/i18n_pack.mjs build)', stale.length === 0 && Object.keys(pack).length > 0);
}

// 3. The labels of I18nService: in the language's own dictionary, or their
// Italian text is one of the translated texts.
{
  const ctx = { window: {}, localStorage: { getItem() { return null; }, setItem() {} }, document: { documentElement: {}, querySelectorAll() { return []; } }, navigator: { language: 'it' }, console };
  vm.createContext(ctx);
  vm.runInContext(JS_PRODUCT_SERVICES + ';this.__I = I18nService;', ctx);
  const I = ctx.__I;
  const set = new Set(keys.map((k) => k.toLowerCase()));
  const same = /^(NURVAN|NURVAN AI|Free|Standard|Coach|Coach Pro|Coach OS|CRM|Check-in|Business|Live|Report|Set)$/i;
  for (const lang of I.supportedLangs) {
    if (lang === 'it') continue;
    const d = I.dictionaries[lang] || {};
    const lost = Object.keys(I.dictionaries.it).filter((k) => !d[k] && !set.has(String(I.dictionaries.it[k]).replace(/\s+/g, ' ').trim().toLowerCase()) && !same.test(I.dictionaries.it[k]) && String(I.dictionaries.it[k]).trim().length > 1);
    ok('3a. ' + lang + ': ogni etichetta ha la sua traduzione' + (lost.length ? ' (senza: ' + lost.slice(0, 6).join(', ') + ')' : ''), lost.length === 0);
  }
}

// 4. The page layer.
{
  const ctx = { document: { currentScript: null, querySelector() { return null; }, readyState: 'complete', addEventListener() {} }, localStorage: { getItem() { return 'it'; }, setItem() {} }, navigator: { language: 'it' }, console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('web/i18n-runtime.js', 'utf8'), ctx);
  const N = ctx.NurvanI18n;
  ok('4a. in italiano non cambia nulla', ctx.tr('Salva') === 'Salva' && N.ready());
  N._use('en', {
    'Salva': 'Save', 'circa {0} s rimanenti': 'about {0} s left', '{0} serie': '{0} sets', 'Ciao, {0}': 'Hi, {0}',
    'ANNULLA ULTIMA MODIFICA{0}': 'UNDO LAST CHANGE{0}', 'Fatica bassa': 'Low fatigue', 'Dati insufficienti': 'Not enough data',
    'Esercizi usati per questo calcolo:': 'Exercises used for this figure:', 'Sedentario': 'Sedentary', 'lavoro seduto': 'desk job',
    '{0} di {1} completate': '{1} total, {0} done', 'lavoro seduto, poco movimento': 'desk job, little movement',
    'Volume {0}': 'Volume {0}', 'Generale': 'General', '{0} rip{1}': '{0} reps{1}', 'Seleziona {0} con pasto libero': 'Select {0} with a free meal', '{0} giorni': '{0} days',
    '{0} settimane {1}': '{0} weeks {1}', 'IL TUO PIANO{0}{1}': 'YOUR PLAN{0}{1}', 'Prima frase.': 'First sentence.', 'Seconda frase!': 'Second sentence!', 'Uno. Due.': 'One. Two.', 'Tre. Quattro.': 'Three. Four.',
    'Formati: PDF{0}': 'Formats: PDF{0}', '{0} — oppure fotografa la scheda, come preferisci tu, quando vuoi.': '{0} — or take a photo of the program, as you prefer, whenever you like.'
  });
  ok('4b. testo esatto, con gli spazi attorno', ctx.tr('  Salva ') === '  Save ');
  ok('4c. maiuscole come sullo schermo', ctx.tr('SALVA') === 'SAVE' && ctx.tr('salva') === 'Save');
  ok('4d. simboli attorno al testo', ctx.tr('✓ Salva:') === '✓ Save:');
  ok('4e. testo con un valore', ctx.tr('circa 12 s rimanenti') === 'about 12 s left' && ctx.tr('3 serie') === '3 sets');
  ok('4f. il valore, se è un testo noto, viene tradotto anche lui', ctx.tr('Ciao, Salva') === 'Hi, Save');
  ok('4g. valore vuoto', ctx.tr('ANNULLA ULTIMA MODIFICA') === 'UNDO LAST CHANGE' && ctx.tr('ANNULLA ULTIMA MODIFICA · 2') === 'UNDO LAST CHANGE · 2');
  ok('4h. valori in ordine diverso', ctx.tr('3 di 5 completate') === '5 total, 3 done');
  ok('4i. testo composto da pezzi', ctx.tr('Fatica bassa · Dati insufficienti') === 'Low fatigue · Not enough data' && ctx.tr('Sedentario (lavoro seduto)') === 'Sedentary (desk job)');
  ok('4j. etichetta seguita da un elenco', ctx.tr('Esercizi usati per questo calcolo: Panca, Squat') === 'Exercises used for this figure: Panca, Squat');
  ok('4k. più righe (confirm)', ctx.tr('Salva\nDati insufficienti') === 'Save\nNot enough data');
  ok('4i2. pezzi che insieme sono un testo noto', ctx.tr('Sedentario (lavoro seduto, poco movimento)') === 'Sedentary (desk job, little movement)');
  ok('4i3. il valore di un testo uguale nelle due lingue viene tradotto', ctx.tr('Volume Generale') === 'Volume General');
  ok('4i4. un pezzo di parola non è un testo ("rip" dentro "ripetizioni")', ctx.tr('Somma carico × ripetizioni di ogni serie valida') === 'Somma carico × ripetizioni di ogni serie valida' && ctx.tr('8 rip · RIR 2') === '8 reps · RIR 2');
  ok('4i5. una frase che contiene per caso una parola nota resta intera', ctx.tr('Servono almeno due settimane con serie registrate per confrontare davvero tutti i periodi.') === 'Servono almeno due settimane con serie registrate per confrontare davvero tutti i periodi.');
  ok('4i6. frase con un valore che è a sua volta un testo con valore', ctx.tr('Seleziona 2 giorni con pasto libero') === 'Select 2 days with a free meal');
  ok('4i7. più valori in coda, tutti assenti', ctx.tr('IL TUO PIANO') === 'YOUR PLAN');
  ok('4i8. più frasi note in fila; se una non è nota il testo resta intero', ctx.tr('Prima frase. Seconda frase!') === 'First sentence. Second sentence!' && ctx.tr('Prima frase. Terza frase.') === 'Prima frase. Terza frase.');
  ok('4i8b. testi di più frasi messi in fila', ctx.tr('Uno. Due. Tre. Quattro.') === 'One. Two. Three. Four.');
  ok('4i9. un valore lungo che è a sua volta un testo noto', ctx.tr('Formati: PDF — oppure fotografa la scheda, come preferisci tu, quando vuoi.') === 'Formats: PDF — or take a photo of the program, as you prefer, whenever you like.');
  ok('4l. un testo sconosciuto resta com’è', ctx.tr('Mario Rossi') === 'Mario Rossi');
  N.setLang('it');
  ok('4m. tornando all’italiano i testi tornano quelli scritti', ctx.tr('Salva') === 'Salva');
}

// 5. The app loads the layer and ships the translations.
{
  const html = fs.readFileSync('web/index.base.html', 'utf8');
  ok('5a. la pagina carica i18n-runtime.js prima degli altri script', /<script src="i18n-runtime\.js"><\/script>\s*<script src="exercise-catalog-extra\.js">/.test(html));
  ok('5b. il cambio lingua avvisa lo strato di traduzione', /NurvanI18n\.setLang\(lang\)/.test(html));
  const sync = fs.readFileSync('sync_web_assets.mjs', 'utf8');
  ok('5c. traduzioni copiate nelle app (i18n-runtime.js e cartella i18n)', /'i18n-runtime\.js'/.test(sync) && /Synced dir: i18n/.test(sync));
  ok('5d. Coach AI risponde nella lingua dell’app', /Rispondi sempre in \$\{replyLanguage\}/.test(fs.readFileSync('coach-api.mjs', 'utf8')));
}

console.log('');
if (failed) { console.log(failed + ' controlli di copertura lingue falliti.'); process.exit(1); }
console.log('Tutti i controlli di copertura lingue passano.');
