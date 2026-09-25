// Tabelle di Composizione degli Alimenti CREA (aggiornamento 2019), da
// alimentinutrizione.it, in data/food-crea.json.
//
// Si percorre l'indice alfabetico e si legge ogni scheda. Una richiesta al
// secondo; ogni pagina scaricata resta in tools/.cache/crea/, quindi un giro
// interrotto riprende da dove si era fermato e un giro gia' fatto non tocca
// piu' la rete. Un giro legge ogni scheda una volta sola: chi fallisce finisce
// nell'elenco dei falliti, non viene riprovato nello stesso giro.
//
// Per ogni alimento: nome, categoria e codice CREA, per 100 g di parte edibile
// energia (kcal), proteine, carboidrati disponibili, zuccheri, lipidi, fibra
// totale, acqua; parte edibile, porzione standard, stato (crudo/cotto e
// metodo) quando il nome lo dice, e l'URL della scheda. "tr" (tracce) vale 0,
// un valore assente resta null.
//
//   node tools/fetch_crea.mjs              un giro (usa la cache)
//   node tools/fetch_crea.mjs --parse-only solo dalla cache, niente rete
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://www.alimentinutrizione.it';
const INDEX_URL = BASE + '/tabelle-nutrizionali/ricerca-per-ordine-alfabetico';
const CACHE = path.join(root, 'tools', '.cache', 'crea');
const OUTPUT = path.join(root, 'data', 'food-crea.json');
const DELAY_MS = 1000;
const USER_AGENT = 'NurvanCatalogBuilder/1.0 (catalogo alimenti Nurvan; una richiesta al secondo)';
export const CREA_CITATION = 'CREA – Centro di ricerca Alimenti e Nutrizione, Tabelle di composizione degli alimenti, aggiornamento 2019 (alimentinutrizione.it)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decode(s) {
  return String(s || '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&agrave;/g, 'à').replace(/&egrave;/g, 'è').replace(/&eacute;/g, 'é')
    .replace(/&igrave;/g, 'ì').replace(/&ograve;/g, 'ò').replace(/&ugrave;/g, 'ù')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
function text(html) {
  return decode(String(html || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// The cells of a table row, as text. A value cell carries a popover (<i ...>)
// after the number: only the text before it counts.
function cells(rowHtml) {
  const out = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/g;
  let m;
  while ((m = re.exec(rowHtml))) out.push(text(m[1].replace(/<i[\s\S]*?<\/i>/g, '')));
  return out;
}

// "11.3" -> 11.3, "tr" -> 0, "" or "-" -> null.
export function creaNumber(raw) {
  const s = String(raw == null ? '' : raw).trim().toLowerCase();
  if (!s || s === '-' || s === 'n.d.' || s === 'nd') return null;
  if (s === 'tr' || s === 'tracce') return 0;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const NUTRIENTS = {
  kcal: /^Energia \(kcal\)/i,
  pro: /^Proteine/i,
  carb: /^Carboidrati disponibili/i,
  sugars: /^Zuccheri solubili/i,
  fat: /^Lipidi/i,
  fiber: /^Fibra totale/i,
  water: /^Acqua/i
};

// Crudo/cotto and the method, only when the name says it.
const METHODS = [
  ['bollito', /\bbollit[oaie]\b|\blessat[oaie]\b|\bin acqua\b/i],
  ['al forno', /\bal forno\b|\bforno\b/i],
  ['alla griglia', /\balla griglia\b|\bgrigliat[oaie]\b|\bai ferri\b/i],
  ['fritto', /\bfritt[oaie]\b/i],
  ['arrosto', /\barrost[oaie]\b/i],
  ['al vapore', /\bal vapore\b/i],
  ['in padella', /\bin padella\b|\bsaltat[oaie]\b/i],
  ['stufato', /\bstufat[oaie]\b|\bin umido\b/i]
];
export function creaState(name) {
  const n = String(name || '');
  const method = (METHODS.find(([, re]) => re.test(n)) || [null])[0];
  if (/\bcrud[oaie]\b/i.test(n)) return { state: 'crudo', method: null };
  if (/\bcott[oaie]\b/i.test(n) || method) return { state: 'cotto', method: method };
  return { state: null, method: null };
}

export function parseCreaIndex(html) {
  const out = [];
  const seen = new Set();
  const re = /<a href="\/tabelle-nutrizionali\/([0-9A-Za-z]+)">([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const code = m[1];
    if (seen.has(code)) continue;
    seen.add(code);
    out.push({ code, name: text(m[2]) });
  }
  return out;
}

export function parseCreaFood(html, code) {
  const titleMatch = html.match(/<h1 class="article-title"[^>]*>([\s\S]*?)<meta/);
  const name = text(titleMatch ? titleMatch[1] : '');
  const info = {};
  const infoRe = /<tr><td>([^<]+)<\/td><td>([\s\S]*?)<\/td><\/tr>/g;
  let m;
  while ((m = infoRe.exec(html))) info[text(m[1])] = text(m[2]);
  const per100 = {};
  const rowRe = /<tr class="corpo[a-z]*">([\s\S]*?)<\/tr>/g;
  while ((m = rowRe.exec(html))) {
    const c = cells(m[1]);
    if (c.length < 3) continue;
    Object.keys(NUTRIENTS).forEach((k) => {
      if (per100[k] === undefined && NUTRIENTS[k].test(c[0])) per100[k] = creaNumber(c[2]);
    });
  }
  const portion = creaNumber(String(info['Porzione'] || '').replace(/[^\d.,]/g, ''));
  const edible = creaNumber(String(info['Parte Edibile'] || '').replace(/[^\d.,]/g, ''));
  const st = creaState(name);
  return {
    code: info['Codice Alimento'] || code,
    name: name,
    name_en: info['English Name'] || null,
    category: info['Categoria'] || null,
    scientific_name: info['Nome Scientifico'] || null,
    edible_pct: edible,
    portion_g: portion,
    state: st.state,
    method: st.method,
    per100: {
      kcal: per100.kcal ?? null,
      pro: per100.pro ?? null,
      carb: per100.carb ?? null,
      sugars: per100.sugars ?? null,
      fat: per100.fat ?? null,
      fiber: per100.fiber ?? null,
      water: per100.water ?? null
    },
    url: BASE + '/tabelle-nutrizionali/' + code
  };
}

let lastRequest = 0;
async function get(url, cacheFile, parseOnly) {
  if (cacheFile && fs.existsSync(cacheFile)) return { html: fs.readFileSync(cacheFile, 'utf8'), cached: true };
  if (parseOnly) throw new Error('non in cache');
  const wait = lastRequest + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const html = await res.text();
  if (cacheFile) fs.writeFileSync(cacheFile, html, 'utf8');
  return { html, cached: false };
}

async function main() {
  const parseOnly = process.argv.includes('--parse-only');
  fs.mkdirSync(CACHE, { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  const index = parseCreaIndex((await get(INDEX_URL, path.join(CACHE, '_index.html'), parseOnly)).html);
  console.log('indice: ' + index.length + ' schede');
  const foods = [];
  const failed = [];
  let fromNet = 0;
  for (let i = 0; i < index.length; i++) {
    const { code, name } = index[i];
    try {
      const got = await get(BASE + '/tabelle-nutrizionali/' + code, path.join(CACHE, code + '.html'), parseOnly);
      if (!got.cached) fromNet++;
      const food = parseCreaFood(got.html, code);
      if (!food.name) food.name = name;
      if (food.per100.kcal == null) throw new Error('energia mancante');
      foods.push(food);
    } catch (e) {
      failed.push({ code, name, error: e.message });
    }
    if ((i + 1) % 50 === 0) console.log('  ' + (i + 1) + '/' + index.length + ' (' + fromNet + ' dalla rete, ' + failed.length + ' fallite)');
  }
  const out = {
    source: 'CREA',
    citation: CREA_CITATION,
    url: INDEX_URL,
    generatedAt: new Date().toISOString().slice(0, 10),
    read: foods.length,
    failed: failed,
    foods: foods
  };
  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log('schede lette: ' + foods.length + ', fallite: ' + failed.length + ', scaricate in questo giro: ' + fromNet);
  failed.forEach((f) => console.log('  fallita ' + f.code + ' ' + f.name + ': ' + f.error));
}

const direct = /fetch_crea\.mjs$/.test(String(process.argv[1] || '').replace(/\\/g, '/'));
if (direct) main().catch((e) => { console.error(e); process.exit(1); });
