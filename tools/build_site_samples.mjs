// The example workouts shown on the site (/allenamenti) and sent as a PDF.
//
//   node tools/build_site_samples.mjs          write site/samples.json
//   node tools/build_site_samples.mjs --pdf    and print site/samples/<id>.pdf with Chrome
//   node tools/build_site_samples.mjs --check  exit 1 when site/samples.json is not what the engines write today
//
// Nothing here is written by hand: each example is a program of the app's own
// database, built by the same code the app runs (web/program-catalog.js,
// web/hyrox.js, web/disciplines.js), so the site shows what the app gives.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site', 'samples.json');
const PDF_DIR = path.join(ROOT, 'site', 'samples');

// The three examples: which program of the database each one is.
export const SAMPLE_IDS = {
  'ipertrofia-3-giorni': 'sci2-3-fullbody-ipertrofia-palestra-intermedio-unisex-8-double-a',
  'hyrox-8-settimane': 'hyx-4-intermediate-8-open_m-gym',
  'casa-corpo-libero': 'dsc-calisthenics-3-intermedio-8-30-floor'
};

function engines() {
  const ctx = { console };
  ctx.self = ctx;
  vm.createContext(ctx);
  for (const f of ['web/exercise-taxonomy.js', 'web/program-builder.js', 'web/hyrox.js', 'web/disciplines.js', 'web/program-catalog.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  }
  return ctx;
}

const restText = (r) => {
  if (r == null || r === '') return '';
  if (typeof r === 'number') return r >= 120 && r % 60 === 0 ? (r / 60) + ' min' : r + 's';
  return String(r);
};

// One row of a session, whatever engine wrote it, as the site and the PDF show it.
function rowOf(e) {
  if (e.circuit) {
    const c = e.circuit;
    return {
      name: e.name, circuit: true,
      dose: c.rounds + ' round · ' + c.work + 's / ' + c.rest + 's',
      items: c.items.map((it) => it.name),
      note: e.notes || ''
    };
  }
  if (e.sets_count != null) {
    return { name: e.name, dose: e.sets_count + ' × ' + e.reps_target, rir: e.rir != null ? 'RIR ' + e.rir : '', rest: restText(e.rest_sec), main: !!e.progressed };
  }
  const count = e.setCount || (Array.isArray(e.sets) ? e.sets.length : 1);
  return {
    name: e.name,
    dose: count + ' × ' + String(e.repsTarget || (e.sets && e.sets[0] && e.sets[0].reps) || ''),
    rir: e.unit === 'reps' && e.rirTarget != null ? 'RIR ' + e.rirTarget : '',
    rest: restText(e.rest),
    note: e.notes || ''
  };
}
const sessionOf = (s) => ({ name: s.name, rows: (s.exercises || []).map(rowOf) });

export function buildSamples() {
  const ctx = engines();
  const out = {};
  for (const [slug, id] of Object.entries(SAMPLE_IDS)) {
    const body = ctx.NurvanProgramCatalog.bodyFor(id);
    if (!body || !Array.isArray(body.weeks) || !body.weeks.length) throw new Error('no program for ' + id);
    out[slug] = {
      slug, program_id: id,
      days: body.days_per_week,
      weeks_total: body.duration_weeks,
      weeks: body.weeks.map((w, i) => ({ n: i + 1, label: String(w.label || '').replace(/^Settimana \d+ · /, '').replace(/^template$/, ''), sessions: w.sessions.map(sessionOf) }))
    };
  }
  return out;
}

/* ------------------------------- PDF -------------------------------- */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// What the PDF says around the tables. Italian: the PDF is the Italian one.
const PDF_TEXT = {
  'ipertrofia-3-giorni': {
    title: 'Ipertrofia in 3 giorni',
    sub: 'Full body · palestra · livello intermedio · 8 settimane',
    how: [
      'Tre sedute a settimana, con almeno un giorno di pausa tra una e l’altra.',
      'RIR 2 vuol dire fermarsi quando ne avresti ancora due: non serve arrivare al cedimento.',
      'Doppia progressione: resta sullo stesso peso finché non fai il massimo delle ripetizioni in tutte le serie, poi aumenta il carico e riparti dal minimo.',
      'Gli esercizi segnati con ● sono i fondamentali: restano gli stessi per tutte le 8 settimane, così il progresso si misura.',
      'Ogni quattro settimane è prevista una settimana di scarico, più leggera.'
    ]
  },
  'hyrox-8-settimane': {
    title: 'Preparazione HYROX in 8 settimane',
    sub: '4 giorni · palestra classica · categoria Open · per chi ha già gareggiato',
    how: [
      'Quattro fasi: base, costruzione, picco con le simulazioni di gara, scarico nell’ultima settimana.',
      'La corsa vale circa metà del tempo di gara: per questo ogni settimana ha una seduta di sola corsa e una di corsa con le stazioni.',
      'Dove la palestra non ha la slitta o lo ski erg, la stazione è sostituita dall’esercizio più vicino: è scritto nella nota.',
      'I carichi di gara dipendono dalla categoria: nell’app scegli la tua e la data della gara, e la preparazione viene scritta su quella.'
    ]
  },
  'casa-corpo-libero': {
    title: 'A casa a corpo libero',
    sub: 'Calisthenics · 3 giorni · 30 minuti · senza attrezzi · 8 settimane',
    how: [
      'Tre sedute da circa 30 minuti: serve solo il pavimento.',
      'Fermati a due ripetizioni dal cedimento. Quando arrivi al massimo delle ripetizioni in tutte le serie, l’esercizio è diventato facile.',
      'Da metà programma ogni esercizio passa alla variante più difficile: è già scritto nelle settimane 5-8.',
      'L’ultima settimana è più leggera, per assorbire il lavoro fatto.'
    ]
  }
};

function tableOf(session) {
  return '<div class="session"><h3>' + esc(session.name) + '</h3><table><thead><tr><th>Esercizio</th><th>Serie × rip.</th><th>Sforzo</th><th>Recupero</th></tr></thead><tbody>' +
    session.rows.map((r) => {
      const sub = r.circuit ? r.items.join(' · ') : (r.note || '');
      return '<tr><td><span class="n">' + (r.main ? '<i>●</i> ' : '') + esc(r.name) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</td><td>' + esc(r.dose) + '</td><td>' + esc(r.rir || '') + '</td><td>' + esc(r.rest || '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

export function pdfHtml(sample) {
  const t = PDF_TEXT[sample.slug];
  const logo = pathToFileURL(path.join(ROOT, 'web', 'nurvan_wordmark.png')).href;
  // A program whose weeks are all the same (one template) is printed once.
  const single = sample.weeks.length === 1;
  const weeks = sample.weeks.map((w) =>
    '<section class="week"><h2>' + (single ? 'La settimana' : 'Settimana ' + w.n + (w.label ? ' · ' + esc(w.label) : '')) + '</h2>' + w.sessions.map(tableOf).join('') + '</section>').join('');
  return '<!doctype html><html lang="it"><head><meta charset="utf-8"><title>' + esc(t.title) + ' — Nurvan</title><style>' +
    '@page{size:A4;margin:16mm 14mm 18mm}*{box-sizing:border-box}body{margin:0;font-family:Helvetica,Arial,sans-serif;color:#151515;font-size:10.5pt;line-height:1.4}' +
    '.cover{background:#0a0a0a;color:#fff;border-radius:14px;padding:26px 26px 24px;margin-bottom:18px;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.cover img{height:20px;display:block;margin-bottom:26px}.cover .eb{color:#d4af37;font-size:8.5pt;font-weight:700;letter-spacing:2.5px;text-transform:uppercase}' +
    '.cover h1{font-size:25pt;line-height:1.1;margin:6px 0 8px}.cover p{margin:0;color:#c9c9c9;font-size:11pt}' +
    '.how{border:1px solid #e4dcc0;background:#fbf8ee;border-radius:12px;padding:14px 18px;margin-bottom:6px;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.how h2{margin:0 0 6px;font-size:11pt}.how ul{margin:0;padding-left:18px}.how li{margin:3px 0}' +
    '.week{break-before:auto}.week h2{font-size:13pt;margin:20px 0 8px;padding-bottom:5px;border-bottom:2px solid #d4af37;break-after:avoid}' +
    '.session{break-inside:avoid;margin-bottom:12px}.session h3{font-size:10.5pt;margin:0 0 4px;color:#8a6d0f;text-transform:uppercase;letter-spacing:1px}' +
    'table{width:100%;border-collapse:collapse}th{font-size:7.5pt;text-transform:uppercase;letter-spacing:.8px;color:#777;text-align:left;padding:4px 6px;border-bottom:1px solid #ccc}' +
    'td{padding:5px 6px;border-bottom:1px solid #ececec;vertical-align:top}td:nth-child(n+2),th:nth-child(n+2){white-space:nowrap;width:1%}' +
    '.n{font-weight:700}.n i{color:#b8941f;font-style:normal;font-size:8pt}small{display:block;color:#666;font-size:8.5pt;font-weight:400}' +
    '.end{break-inside:avoid;margin-top:22px;background:#0a0a0a;color:#fff;border-radius:14px;padding:20px 24px;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.end strong{display:block;font-size:13pt;margin-bottom:4px}.end span{color:#c9c9c9}.end b{color:#d4af37}' +
    '.legal{color:#888;font-size:8pt;margin-top:12px}' +
    '</style></head><body>' +
    '<div class="cover"><img src="' + logo + '" alt="Nurvan"><div class="eb">Allenamento di esempio</div><h1>' + esc(t.title) + '</h1><p>' + esc(t.sub) + '</p></div>' +
    '<div class="how"><h2>Come usarlo</h2><ul>' + t.how.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
    weeks +
    '<div class="end"><strong>Nell’app è tutto pronto da seguire.</strong><span>Serie da spuntare, timer di recupero, carico consigliato per la volta dopo e la scheda adattata ai tuoi giorni e alla tua attrezzatura. <b>nurvan.app</b></span></div>' +
    '<p class="legal">Programma generico a scopo informativo: non sostituisce il parere di un medico o di un professionista. Con dolori, patologie o dopo un lungo stop, chiedi prima a un medico.' +
    (sample.slug.indexOf('hyrox') === 0 ? ' HYROX® è un marchio registrato del suo titolare: Nurvan non è affiliata né sponsorizzata da HYROX.' : '') + '</p>' +
    '</body></html>';
}

async function printPdfs(samples) {
  const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-pdf-'));
  const port = 9340;
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let target = null;
  for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find((t) => t.type === 'page'); } catch (_) {} }
  if (!target) { chrome.kill(); throw new Error('Chrome did not start'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let seq = 0; const waiting = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
  const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const tmp = path.join(profile, 'page.html');
  for (const sample of Object.values(samples)) {
    fs.writeFileSync(tmp, pdfHtml(sample));
    await send('Page.navigate', { url: pathToFileURL(tmp).href });
    await sleep(1200);
    const r = await send('Page.printToPDF', {
      printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: '<div style="width:100%;font-size:7px;color:#999;padding:0 14mm;display:flex;justify-content:space-between;font-family:Helvetica,Arial,sans-serif;"><span>Nurvan · nurvan.app</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'
    });
    const file = path.join(PDF_DIR, sample.slug + '.pdf');
    fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
    console.log('pdf', sample.slug, Math.round(fs.statSync(file).size / 1024) + ' KB');
  }
  ws.close(); chrome.kill(); await sleep(400);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const samples = buildSamples();
  const text = JSON.stringify(samples, null, 1) + '\n';
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
    if (now !== text) { console.log('site/samples.json is out of date: run node tools/build_site_samples.mjs --pdf'); process.exit(1); }
    for (const slug of Object.keys(samples)) if (!fs.existsSync(path.join(PDF_DIR, slug + '.pdf'))) { console.log('missing PDF: ' + slug); process.exit(1); }
    console.log('site samples up to date');
  } else {
    fs.writeFileSync(OUT, text);
    for (const s of Object.values(samples)) console.log(s.slug, s.days + ' giorni', s.weeks.length + ' settimane scritte', s.weeks[0].sessions.map((x) => x.name + ' (' + x.rows.length + ')').join(', '));
    if (process.argv.includes('--pdf')) await printPdfs(samples);
  }
}
