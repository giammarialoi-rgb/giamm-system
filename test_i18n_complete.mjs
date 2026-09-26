// Every language the app offers has every key of the Italian dictionary, so
// no screen falls back to another language for these words, and the
// translations added from i18n-fill.mjs never replace one that was there.
import vm from 'node:vm';
import fs from 'node:fs';
import { JS_PRODUCT_SERVICES } from './prepare_task20_js_services.mjs';
import { I18N_FILL } from './i18n-fill.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const ctx = { window: {}, localStorage: { getItem() { return null; }, setItem() {} }, document: { documentElement: {}, querySelectorAll() { return []; } }, navigator: { language: 'it' }, console };
vm.createContext(ctx);
vm.runInContext(JS_PRODUCT_SERVICES + ';this.__I = I18nService;', ctx);
const I = ctx.__I;
const it = I.dictionaries.it;
const keys = Object.keys(it);

ok('1a. dieci lingue offerte', I.supportedLangs.length === 10);
for (const l of I.supportedLangs) {
  const d = I.dictionaries[l] || {};
  const missing = keys.filter((k) => !(k in d) || !String(d[k] || '').trim());
  ok('1b. ' + l + ': tutte le ' + keys.length + ' voci' + (missing.length ? ' (mancano: ' + missing.slice(0, 5).join(', ') + ')' : ''), missing.length === 0);
}
// Where a language already had a word, the fill did not change it.
const src = fs.readFileSync('prepare_task20_js_services.mjs', 'utf8');
ok('2a. le voci che esistevano restano le loro (en.save, de.load)', I.dictionaries.en.save === 'SAVE' && /de: \{/.test(src) && I.dictionaries.de.load && I.dictionaries.de.load !== I18N_FILL.pt.load);
ok('2b. t() in ogni lingua: nessuna chiave grezza per le voci del dizionario', I.supportedLangs.every((l) => { I.currentLang = l; return keys.every((k) => { const v = I.t(k); return v && v !== k; }); }));
I.currentLang = 'ar';
ok('2c. arabo: testo in arabo', /[؀-ۿ]/.test(I.t('settings')));
I.currentLang = 'zh';
ok('2d. cinese: testo in cinese', /[一-鿿]/.test(I.t('settings')));
I.currentLang = 'hi';
ok('2e. hindi: testo in devanagari', /[ऀ-ॿ]/.test(I.t('settings')));
ok('3a. le etichette nuove passano dal dizionario', /\$\{t\('weightUnit'\)\}/.test(fs.readFileSync('web/index.base.html', 'utf8')));

console.log('');
if (failed) { console.log(failed + ' controlli delle lingue falliti.'); process.exit(1); }
console.log('Tutti i controlli delle lingue passano.');
