// Aggancia le voci di food-staples.json agli alimenti CREA (data/food-crea.json).
//
// Il CREA scrive i nomi "dal generale al particolare": «Pollo, petto, crudo»,
// «Riso, brillato, bollito». I nostri sono in italiano parlato: «Petto di
// pollo», «Riso basmati». Qui si confrontano le parole che contano (senza
// articoli e preposizioni, al singolare, senza accenti) e si cerca un alimento
// CREA che contenga tutte le parole del nostro nome.
//
// Stato: una voce nostra "cotto/cotta" cerca un CREA cotto; le altre un CREA
// crudo o senza stato. Fra piu' candidati, se uno solo ha il nome esattamente
// uguale al nostro (parole identiche) e' quello.
//
// Esito per voce:
//   certa    - un solo candidato, o un sinonimo esplicito in crea-aliases.json
//   ambigua  - piu' candidati: si decide a mano (crea-aliases.json)
//   nessuna  - nessun candidato
// crea-aliases.json: { "Nome nostro": "codice CREA" | null } - null dice
// "questa voce non ha un equivalente CREA", e la chiude come nessuna.
//
//   node tools/match_crea.mjs          stampa il report
//   node tools/match_crea.mjs --json   report in JSON
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const STOP = new Set(['di', 'd', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'al', 'alla', 'allo', 'ai', 'agli', 'alle',
  'a', 'da', 'in', 'con', 'e', 'o', 'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'uno', 'per', 'su', 'all', 'dell', 'nell', 'sull']);
const STATE_WORDS = new Set(['crudo', 'cotto', 'bollito', 'lessato', 'forno', 'griglia', 'grigliato', 'fritto', 'arrosto', 'vapore', 'padella', 'stufato', 'umido']);

export function foldWords(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}
function singular(w) {
  if (w.length < 4) return w;
  if (/i$/.test(w)) return w.slice(0, -1) + 'o';
  if (/e$/.test(w)) return w.slice(0, -1) + 'a';
  return w;
}
// The words that name the food: no stopwords, singular, and the words that
// only say how it is cooked are kept apart.
export function keyWords(text) {
  const words = foldWords(text).map(singular).filter((w) => !STOP.has(w));
  return {
    food: words.filter((w) => !STATE_WORDS.has(w) && !STATE_WORDS.has(w.replace(/a$/, 'o'))),
    cooked: words.some((w) => /^cott[oa]$/.test(w) || (STATE_WORDS.has(w) && w !== 'crudo'))
  };
}

export function matchStaple(staple, crea, aliases) {
  const alias = aliases && Object.prototype.hasOwnProperty.call(aliases, staple.name) ? aliases[staple.name] : undefined;
  if (alias === null) return { status: 'nessuna', reason: 'senza equivalente (crea-aliases.json)', candidates: [] };
  if (alias !== undefined) {
    const hit = crea.find((c) => c.code === String(alias));
    return hit
      ? { status: 'certa', reason: 'sinonimo', match: hit, candidates: [hit] }
      : { status: 'nessuna', reason: 'sinonimo verso un codice CREA che non esiste: ' + alias, candidates: [] };
  }
  const ours = keyWords(staple.name);
  if (!ours.food.length) return { status: 'nessuna', reason: 'nome vuoto', candidates: [] };
  let candidates = crea.filter((c) => {
    const theirs = keyWords(c.name).food;
    return ours.food.every((w) => theirs.includes(w));
  });
  // The state: cooked with cooked, the rest with raw (or no state).
  const sameState = candidates.filter((c) => (ours.cooked ? c.state === 'cotto' : c.state !== 'cotto'));
  if (sameState.length) candidates = sameState;
  if (candidates.length > 1) {
    const exact = candidates.filter((c) => {
      const theirs = keyWords(c.name).food;
      return theirs.length === ours.food.length;
    });
    if (exact.length === 1) candidates = exact;
  }
  if (candidates.length === 1) return { status: 'certa', reason: 'unico candidato', match: candidates[0], candidates };
  if (candidates.length > 1) return { status: 'ambigua', reason: candidates.length + ' candidati', candidates };
  return { status: 'nessuna', reason: 'nessun candidato', candidates: [] };
}

export function matchAll(staples, crea, aliases) {
  return staples.map((s) => Object.assign({ staple: s }, matchStaple(s, crea, aliases)));
}

const direct = /match_crea\.mjs$/.test(String(process.argv[1] || '').replace(/\\/g, '/'));
if (direct) {
  const staples = JSON.parse(fs.readFileSync(path.join(root, 'food-staples.json'), 'utf8'));
  const crea = JSON.parse(fs.readFileSync(path.join(root, 'data', 'food-crea.json'), 'utf8')).foods;
  const aliasFile = path.join(root, 'data', 'crea-aliases.json');
  const aliases = fs.existsSync(aliasFile) ? JSON.parse(fs.readFileSync(aliasFile, 'utf8')) : {};
  const report = matchAll(staples, crea, aliases);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report.map((r) => ({ name: r.staple.name, status: r.status, reason: r.reason, match: r.match ? r.match.code + ' ' + r.match.name : null, candidates: r.candidates.map((c) => c.code + ' ' + c.name) })), null, 1));
  } else {
    ['certa', 'ambigua', 'nessuna'].forEach((st) => {
      const rows = report.filter((r) => r.status === st);
      console.log('\n' + st.toUpperCase() + ': ' + rows.length);
      rows.forEach((r) => {
        if (st === 'certa') console.log('  ' + r.staple.name + '  →  ' + r.match.code + ' ' + r.match.name + (r.reason === 'sinonimo' ? '  (sinonimo)' : ''));
        else if (st === 'ambigua') console.log('  ' + r.staple.name + ':\n' + r.candidates.map((c) => '      ' + c.code + ' ' + c.name).join('\n'));
        else console.log('  ' + r.staple.name + (r.reason !== 'nessun candidato' ? '  (' + r.reason + ')' : ''));
      });
    });
  }
}
