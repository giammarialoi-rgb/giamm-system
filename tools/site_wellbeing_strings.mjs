// The texts of the site pages of "Salute e recupero" (server/site/wellbeing.mjs).
//
//   node tools/site_wellbeing_strings.mjs           list the texts into site/i18n/_server.json and fill
//                                                   site/i18n/<lang>.json from the app's translation
//                                                   memory (i18n/tm/<lang>.json) where the same text exists
//   node tools/site_wellbeing_strings.mjs --missing print the texts a language still lacks (to translate)
//
// The pages are written from the app's own data, so most of their sentences are
// already translated for the app: they are copied, not translated twice.
import fs from 'node:fs';
import path from 'node:path';
import { pageTexts, SITE_LANGS } from '../server/site/i18n.mjs';
import { loadWellbeing, hubMain, postureMain, postpartumMain, labourMain } from '../server/site/wellbeing.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const { W, REFS } = await loadWellbeing(ROOT);
const TITLES = [
  'Salute e recupero — Nurvan', 'Postura e dolori: cosa dicono le fonti — Nurvan', 'Dopo il parto: tornare all\'esercizio — Nurvan', 'Travaglio e parto: cosa dicono le prove — Nurvan',
  'Esercizio per un problema fisico, per il parto e per il dopo parto: informazioni con le fonti, i limiti di ciò che gli studi dimostrano e un\'avvertenza chiara.',
  'Scapole alate, spalle in avanti, iperlordosi, collo, scoliosi, ginocchio, schiena, spalla, piede e anca: cosa dicono studi e linee guida, cosa non è dimostrato e quali esercizi hanno più supporto.',
  'Il ritorno all\'esercizio dopo il parto in base al tipo di parto e ai mesi passati: fasi, segnali per fermarsi, pavimento pelvico, diastasi, corsa e cesareo, con le fonti.',
  'Posizioni e movimento in travaglio, preparazione delle ultime settimane e il ruolo dell\'allenamento: cosa dicono le revisioni Cochrane e le linee guida, e quando decide il team.',
  'Salute e recupero', 'Problemi'
];
const texts = new Set(TITLES);
for (const html of [hubMain(W, 'it'), postureMain(W, REFS, 'it'), postpartumMain(W, REFS, 'it'), labourMain(W, REFS, 'it')]) pageTexts(html).forEach((t) => texts.add(t));
const list = [...texts].filter((t) => !/^\{\{/.test(t));

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeLike = (f, data, spread) => {
  const raw = fs.readFileSync(f, 'utf8'); const crlf = raw.includes('\r\n');
  const out = spread ? JSON.stringify(data, null, 0).replace(/","/g, '",\n"') + '\n' : JSON.stringify(data, null, (/^\{\r?\n( +)/.exec(raw) || [, ' '])[1].length) + (raw.endsWith('\n') ? '\n' : '');
  fs.writeFileSync(f + '.tmp', crlf ? out.replace(/\n/g, '\r\n') : out); fs.renameSync(f + '.tmp', f);
};

const serverFile = path.join(ROOT, 'site/i18n/_server.json');
if (process.argv.includes('--missing')) {
  const out = {};
  for (const lang of SITE_LANGS.filter((l) => l !== 'it')) {
    const dict = readJson(path.join(ROOT, 'site/i18n', lang + '.json'));
    out[lang] = list.filter((t) => !(t in dict) && /[A-Za-zÀ-ÿ]{2,}/.test(t) && !/^\{\{/.test(t));
  }
  const first = out.en || [];
  console.log(first.length + ' texts missing in en');
  fs.writeFileSync(path.join(ROOT, 'tmp-debug/site_wb_missing.json'), JSON.stringify(first, null, 1));
  console.log(Object.entries(out).map(([l, m]) => l + ': ' + m.length).join(' · '));
  process.exit(0);
}
const server = readJson(serverFile);
let added = 0;
for (const t of list) if (!server.includes(t)) { server.push(t); added++; }
writeLike(serverFile, server, true);
let copied = 0;
for (const lang of SITE_LANGS.filter((l) => l !== 'it')) {
  const tmFile = path.join(ROOT, 'i18n/tm', lang + '.json');
  const tm = fs.existsSync(tmFile) ? readJson(tmFile) : {};
  const file = path.join(ROOT, 'site/i18n', lang + '.json');
  const dict = readJson(file);
  for (const t of list) if (!(t in dict) && t in tm) { dict[t] = tm[t]; copied++; }
  writeLike(file, dict, false);
}
console.log(list.length + ' texts on the pages, ' + added + ' added to _server.json, ' + copied + ' translations copied from the app');
