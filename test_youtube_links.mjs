// The YouTube link of each exercise and warm-up: the hand-verified clip when
// data/youtube-links.json has one, the YouTube search otherwise.
//
// A wrong video is worse than none: a demo opens only when it is verified and
// its address is exactly a Short (or watch page) of its own id; an exercise
// the file does not know, or a warm-up without its library id, gets the
// search. Nothing is matched loosely. The resolver and the button are cut out
// of web/index.base.html and run in a vm against the real generated data.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { compileYoutubeLinks, verifiedDemoUrl, buildYoutubeLinksScript } from './build_youtube_links.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

const raw = JSON.parse(read('data/youtube-links.json'));
const html = read('web/index.base.html');
const slice = (from, to) => { const a = html.indexOf(from); const b = html.indexOf(to, a + 1); if (a < 0 || b < a) throw new Error('slice ' + from); return html.slice(a, b); };

function loadPage(entries) {
  const ctx = { console, Math, String, Number, Array, Object, JSON, RegExp, encodeURIComponent, window: {}, self: { EXERCISE_YOUTUBE_LINKS: entries } };
  vm.createContext(ctx);
  vm.runInContext(html.match(/const esc = x => [^\n]+/)[0], ctx);
  vm.runInContext(slice('function youtubeSearchUrl(query)', 'function snapshotAppSurface'), ctx);
  return ctx;
}
const loadBrowserGlobal = (file, name) => {
  const ctx = { self: {}, window: {} };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(read(file), ctx);
  return ctx.self[name] || ctx.window[name] || ctx[name];
};

console.log('--- 1. il file e il catalogo ---');
const catalog = loadBrowserGlobal('web/exercise-catalog-extra.js', 'WEB_EXERCISE_CATALOG');
const warmups = loadBrowserGlobal('web/warmup-exercise-library.js', 'WARMUP_EXERCISE_LIBRARY');
const exNames = new Set(catalog.map((e) => e.name));
const wuIds = new Set(warmups.map((w) => w.id));
ok('1a. ogni esercizio del file e\' un nome esatto del catalogo', raw.filter((e) => e.type === 'exercise').every((e) => exNames.has(e.name)));
ok('1b. ogni riscaldamento del file e\' un id della libreria', raw.filter((e) => e.type === 'warmup').every((e) => wuIds.has(e.id)));
const built = buildYoutubeLinksScript({ root });
ok('1c. nessuna voce scartata dal build', built.rejected.length === 0);
ok('1d. web/youtube-links.js generato, caricato dalla pagina e dal service worker, copiato per Android',
  /<script src="youtube-links\.js"><\/script>/.test(html) && /'\.\/youtube-links\.js'/.test(read('web/sw.js')) && /'youtube-links\.js'/.test(read('sync_web_assets.mjs')));
const shipped = loadBrowserGlobal('web/youtube-links.js', 'EXERCISE_YOUTUBE_LINKS');
ok('1e. il file generato ha tutte le voci', shipped.length === raw.length);

console.log('');
console.log('--- 2. la regola: solo verificato, solo il suo indirizzo ---');
ok('2a. verified true e url shorts del suo id: passa', verifiedDemoUrl({ id: 'kUIY-keZ11A', url: 'https://www.youtube.com/shorts/kUIY-keZ11A', verified: true }) === 'https://www.youtube.com/shorts/kUIY-keZ11A');
ok('2b. verified false: no', verifiedDemoUrl({ id: 'kUIY-keZ11A', url: 'https://www.youtube.com/shorts/kUIY-keZ11A', verified: false }) === null);
ok('2c. verified mancante: no', verifiedDemoUrl({ id: 'kUIY-keZ11A', url: 'https://www.youtube.com/shorts/kUIY-keZ11A' }) === null);
ok('2d. url di un altro id, o di un altro sito: no', verifiedDemoUrl({ id: 'kUIY-keZ11A', url: 'https://www.youtube.com/shorts/AAAAAAAAAAA', verified: true }) === null &&
  verifiedDemoUrl({ id: 'kUIY-keZ11A', url: 'https://evil.example/shorts/kUIY-keZ11A', verified: true }) === null);
const fake = compileYoutubeLinks([
  { name: 'Panca piana bilanciere', type: 'exercise', youtube_demo: { id: 'kUIY-keZ11A', url: 'https://www.youtube.com/shorts/kUIY-keZ11A', verified: true, channel: 'Canale X', duration_s: 9.6 }, youtube_query: 'Barbell Bench Press exercise how to' },
  { name: 'Esercizio non verificato', type: 'exercise', youtube_demo: { id: 'Ne_9EKkUVXY', url: 'https://www.youtube.com/shorts/Ne_9EKkUVXY', verified: false }, youtube_query: 'Unverified exercise how to' },
  { name: 'Esercizio senza demo', type: 'exercise', youtube_demo: null, youtube_query: 'No demo exercise how to' },
  { name: 'Glute Bridge', id: 'act_glute_bridge', type: 'warmup', youtube_demo: { id: 'i06buX4DNHQ', url: 'https://www.youtube.com/shorts/i06buX4DNHQ', verified: true }, youtube_query: 'Glute Bridge exercise how to' },
  { name: 'Foam Roll', id: 'smr_x', type: 'warmup', youtube_demo: null, youtube_query: 'Foam Roll exercise how to' }
]);
ok('2e. il build lascia fuori la demo non verificata, e lo dice', !fake.entries[1].demo && fake.rejected.some((r) => r.entry === 'Esercizio non verificato'));

console.log('');
console.log('--- 3. il resolver della pagina ---');
{
  // Also a verified: false demo planted straight in the shipped data: the page checks again.
  const entries = fake.entries.concat([{ type: 'exercise', name: 'Piantato a mano', youtube_query: 'Planted how to', demo: { id: 'Ne_9EKkUVXY', url: 'https://www.youtube.com/shorts/Ne_9EKkUVXY', verified: false } }]);
  const p = loadPage(entries);
  const demo = p.getExerciseVideoLink('Panca piana bilanciere');
  ok('3a. demo verificata: apre lo Short di quell\'id', demo.kind === 'demo' && demo.url === 'https://www.youtube.com/shorts/kUIY-keZ11A');
  ok('3b. con durata e canale quando il file li ha', demo.label === 'Vedi esecuzione (10 s)' && demo.channel === 'Canale X');
  const none = p.getExerciseVideoLink('Esercizio senza demo');
  ok('3c. youtube_demo null: ricerca con youtube_query', none.kind === 'search' && none.url === 'https://www.youtube.com/results?search_query=No%20demo%20exercise%20how%20to' && none.label === 'Cerca su YouTube');
  const unknown = p.getExerciseVideoLink('Panca Piana Bilanciere');
  ok('3d. nome non esatto (maiuscole diverse): nessuna voce, ricerca col nome', unknown.kind === 'search' && unknown.url === 'https://www.youtube.com/results?search_query=Panca%20Piana%20Bilanciere');
  ok('3e. voce con verified false: ricerca', p.getExerciseVideoLink('Esercizio non verificato').kind === 'search' && p.getExerciseVideoLink('Piantato a mano').kind === 'search');
  const wDemo = p.getExerciseVideoLink({ warmup: true, warmupId: 'act_glute_bridge', name: 'Glute Bridge' });
  ok('3f. riscaldamento con demo: lo Short', wDemo.kind === 'demo' && wDemo.url === 'https://www.youtube.com/shorts/i06buX4DNHQ');
  const wNone = p.getExerciseVideoLink({ warmup: true, warmupId: 'smr_x', name: 'Foam Roll' });
  ok('3g. riscaldamento senza demo: ricerca', wNone.kind === 'search' && /search_query=Foam%20Roll%20exercise/.test(wNone.url));
  const wNoId = p.getExerciseVideoLink({ warmup: true, name: 'Panca piana bilanciere' });
  ok('3h. un riscaldamento senza id non prende la demo di un esercizio con lo stesso nome', wNoId.kind === 'search');
  const alt = p.getExerciseVideoLink({ name: 'Titolo spiegato dall\'AI', names: ['Panca piana bilanciere'] });
  ok('3i. la scheda prova i suoi nomi, ognuno esatto', alt.kind === 'demo' && alt.url.endsWith('kUIY-keZ11A'));
  const over = p.getExerciseVideoLink({ name: 'Esercizio senza demo', overrideId: 'dQw4w9WgXcQ' });
  const badOver = p.getExerciseVideoLink({ name: 'Esercizio senza demo', overrideId: 'javascript:alert(1)' });
  ok('3j. youtube_override_id della riga: prima di tutto, solo se e\' un id valido', over.kind === 'demo' && over.url === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' && badOver.kind === 'search');

  const btn = p.youtubeButtonHtml('Panca piana bilanciere');
  ok('3k. pulsante demo: link esterno allo Short, "Vedi esecuzione", fonte in piccolo',
    btn.includes('href="https://www.youtube.com/shorts/kUIY-keZ11A"') && /target="_blank"/.test(btn) && /rel="noopener noreferrer"/.test(btn) &&
    btn.includes('VEDI ESECUZIONE (10 S)') && btn.includes('YouTube · Canale X') && !/<iframe/i.test(btn));
  const sbtn = p.youtubeButtonHtml('Esercizio senza demo');
  ok('3l. pulsante ricerca: come prima, con youtube_query, e il nome dell\'app nel titolo', sbtn.includes('CERCA SU YOUTUBE') && sbtn.includes('search_query=No%20demo%20exercise%20how%20to') && sbtn.includes('Cerca &quot;Esercizio senza demo&quot; su YouTube'));
  ok('3l2. esercizio che il file non conosce: ricerca col suo nome', p.youtubeButtonHtml('Esercizio inventato').includes('search_query=Esercizio%20inventato'));
  ok('3m. compatto: stesso link, icona', /^<a [^>]*href="https:\/\/www\.youtube\.com\/shorts\/kUIY-keZ11A"/.test(p.youtubeButtonHtml('Panca piana bilanciere', { compact: true })));
  ok('3n. niente nome e niente id: niente pulsante', p.youtubeButtonHtml('') === '' && p.youtubeButtonHtml({}) === '');
}

console.log('');
console.log('--- 4. sui dati veri ---');
{
  const p = loadPage(shipped);
  let exDemo = 0, exSearch = 0, wuDemo = 0, wuSearch = 0;
  let wrong = 0;
  catalog.forEach((e) => {
    const l = p.getExerciseVideoLink(e.name);
    const src = raw.find((r) => r.type === 'exercise' && r.name === e.name);
    const expect = src && src.youtube_demo && src.youtube_demo.verified === true ? src.youtube_demo.url : null;
    if (l.kind === 'demo') { exDemo++; if (l.url !== expect) wrong++; } else { exSearch++; if (expect) wrong++; }
  });
  warmups.forEach((w) => {
    const l = p.getExerciseVideoLink({ warmup: true, warmupId: w.id, name: w.name });
    const src = raw.find((r) => r.type === 'warmup' && r.id === w.id);
    const expect = src && src.youtube_demo && src.youtube_demo.verified === true ? src.youtube_demo.url : null;
    if (l.kind === 'demo') { wuDemo++; if (l.url !== expect) wrong++; } else { wuSearch++; if (expect) wrong++; }
  });
  console.log('     esercizi: ' + exDemo + ' demo, ' + exSearch + ' ricerca; riscaldamenti: ' + wuDemo + ' demo, ' + wuSearch + ' ricerca');
  ok('4a. ogni esercizio e riscaldamento apre esattamente la demo verificata del file, o la ricerca', wrong === 0);
  ok('4b. i conti del build e della pagina coincidono', exDemo === built.exerciseDemo && exSearch === built.exerciseSearch && wuDemo === built.warmupDemo && wuSearch === built.warmupSearch);
  ok('4c. ogni demo e\' uno Short (niente pre-roll)', shipped.filter((e) => e.demo).every((e) => e.demo.url.startsWith('https://www.youtube.com/shorts/')));
}

console.log('');
if (failed) { console.log(failed + ' controlli dei link YouTube falliti.'); process.exit(1); }
console.log('Tutti i controlli dei link YouTube passano.');
