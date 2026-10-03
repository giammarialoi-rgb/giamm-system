// A presentation (PDF, landscape slides) of the medical part of "Salute e
// recupero", for a clinician to read and validate. It is written from the app's
// own data (web/wellbeing.js, web/wellbeing-care.js, web/wellbeing-refs.js), so
// what the doctor reads is exactly what the app says.
//
//   node tools/build_wellbeing_deck.mjs [out.pdf]      needs Chrome (like tools/build_site_samples.mjs --pdf)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadWellbeing } from '../server/site/wellbeing.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs/Nurvan-Salute-e-recupero-presentazione.pdf'));
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const { W, REFS } = await loadWellbeing(ROOT);

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ul = (list, cls) => '<ul' + (cls ? ' class="' + cls + '"' : '') + '>' + list.map((t) => '<li>' + t + '</li>').join('') + '</ul>';
const tag = (kind, text) => '<span class="tag ' + kind + '">' + esc(text) + '</span>';
const cite = (id) => (REFS[id] ? esc(REFS[id].cite) + (REFS[id].pmid ? ' — PMID ' + REFS[id].pmid : ' — ' + REFS[id].url) : esc(id));
const short = (id) => {
  const c = REFS[id] ? REFS[id].cite : id;
  const m = /^([^.]+?)(?: et al)?\.\s*(\d{4})\./.exec(c);
  return m ? m[1].split(',')[0] + ' ' + m[2] : c.slice(0, 30);
};
const refsLine = (ids) => ids.length ? '<div class="refs">Fonti: ' + [...new Set(ids)].map((id) => esc(short(id)) + (REFS[id] && REFS[id].pmid ? ' (PMID ' + REFS[id].pmid + ')' : '')).join(' · ') + '</div>' : '';

const slides = [];
const add = (kicker, title, body, opts = {}) => slides.push({ kicker, title, body, cls: opts.cls || '' });
// A long list over as many slides as it needs.
function addList(kicker, title, items, perSlide = 1700, render = (x) => x) {
  let chunk = []; let size = 0; const parts = [];
  items.forEach((it) => { const len = String(typeof it === 'string' ? it : JSON.stringify(it)).length; if (size + len > perSlide && chunk.length) { parts.push(chunk); chunk = []; size = 0; } chunk.push(it); size += len; });
  if (chunk.length) parts.push(chunk);
  parts.forEach((p, i) => add(kicker, title + (parts.length > 1 ? ' (' + (i + 1) + '/' + parts.length + ')' : ''), render(p)));
}

/* ----------------------------------- cover ----------------------------------- */
add('', '', `<div class="cover"><div class="brand">NURVAN</div><h1>Salute e recupero</h1>
<p class="sub">Esercizio per problemi posturali e muscolari, travaglio e parto, ritorno all'allenamento dopo il parto</p>
<p class="meta">Presentazione dei contenuti medici per la revisione clinica<br>3 ottobre 2026</p>
<div class="note">Documento di lavoro per un medico dello sport. Non è materiale destinato al pubblico: serve a far verificare cosa dice l'app prima che venga promossa.</div></div>`, { cls: 'cover-slide' });

/* ------------------------------ what and why ----------------------------------- */
add('Obiettivo', 'Cosa chiediamo e perché', `
<p class="lead">Nurvan è un'app di allenamento. Abbiamo aggiunto una sezione che propone esercizi per tre situazioni che richiedono particolare prudenza: un problema posturale o muscolare, le ultime settimane di gravidanza con il travaglio, e il ritorno all'esercizio dopo il parto.</p>
${ul([
  '<b>Cosa è stato fatto:</b> i contenuti sono stati costruiti partendo da linee guida, revisioni sistematiche e meta-analisi. Ogni riferimento è stato controllato su PubMed (identificativo, titolo, anno, rivista) o, per le linee guida non indicizzate, sul sito ufficiale.',
  '<b>Cosa chiediamo a Lei:</b> di leggere i contenuti e dirci cosa è sbagliato, troppo permissivo, troppo prudente o mancante, con particolare attenzione ai punti segnalati nelle ultime pagine (soglie, tempi, elenchi di segnali d\'allarme, dosaggi).',
  '<b>Cosa non è:</b> una diagnosi, una terapia, o un sostituto di medico, fisioterapista od ostetrica. L\'app lo dice all\'ingresso e in ogni programma.',
  '<b>Come usare queste pagine:</b> ogni argomento ha cosa dicono le fonti, cosa non è dimostrato, i segnali per cui prima serve un professionista e gli esercizi. I dosaggi sono marcati come opinione esperta quando non derivano da studi.'
])}`);

add('Principi', 'Come è costruita la sezione', `
<div class="cols">
<div><h3>Onestà sulle prove</h3>${ul([
  'Dove gli studi dicono che la «correzione» posturale non è dimostrata, l\'app lo dice (spalle in avanti, lordosi, testa avanti, piede piatto).',
  'Dove una cosa è consenso di esperti e non risultato di studi, lo scrive (corsa dopo il parto, carichi dopo il cesareo, alcuni dosaggi).',
  'Nessuna promessa di guarigione o di «chiudere» la diastasi; nessuna promessa che allenarsi accorci il travaglio.'
])}</div>
<div><h3>Sicurezza prima del programma</h3>${ul([
  'Si entra solo dopo aver letto e accettato l\'avvertenza.',
  'Ogni area parte dai segni per cui prima serve un professionista; se ne compare uno, nessun programma.',
  'Dove decide il team (epidurale, induzione, gravidanza a rischio, lacerazione di 3°-4° grado), l\'app non propone esercizi.',
  'I sintomi, non il calendario, decidono se si passa alla fase successiva.'
])}</div></div>`);

add('Principi', 'L\'avvertenza mostrata nell\'app', `<div class="warn">${W.DISCLAIMER.map((t) => '<p>' + esc(t) + '</p>').join('')}</div>
<p class="small">Versione ${esc(W.DISCLAIMER_VERSION)}. La forma breve — «${esc(W.DISCLAIMER_SHORT)}» — è scritta in ogni programma generato e compare in cima a ogni seduta.</p>`);

add('Principi', 'Il percorso dell\'utente', `
<div class="flow">
<div class="step"><b>1</b><span>Legge e accetta l'avvertenza</span></div><div class="arrow">→</div>
<div class="step"><b>2</b><span>Sceglie l'area: postura, travaglio, dopo il parto</span></div><div class="arrow">→</div>
<div class="step warnstep"><b>3</b><span>Spunta i segni d'allarme dell'area</span></div><div class="arrow">→</div>
<div class="step"><b>4</b><span>Nessun segno: vede le fonti e il programma. Un segno: «prima il medico», nessun programma</span></div></div>
<div class="cols" style="margin-top:14px"><div><h3>Cosa l'app non fa</h3>${ul(['Diagnosi o valutazione del pavimento pelvico.', 'Esercizi correttivi per la scoliosi.', 'Esercizi guidati in travaglio con epidurale o induzione.', 'Esercizi in gravidanza da supina.', 'Promesse di risultato.'])}</div>
<div><h3>Cosa fa ogni programma</h3>${ul(['Porta l\'avvertenza breve in cima a ogni seduta.', 'Scrive la regola del dolore nel primo esercizio: lieve (al massimo 3 su 10) e di ritorno al livello di partenza entro 24 ore.', 'Include lavoro di core almeno due volte a settimana, tranne dove il recupero parte dal respiro e dal pavimento pelvico.', 'Si può seguire come lezione a tempo.'])}</div></div>`);

/* --------------------------------- posture ---------------------------------------- */
add('Postura e dolori', 'I dodici problemi a colpo d\'occhio', `<table class="grid"><thead><tr><th>Problema</th><th>Cosa dicono le fonti (sintesi)</th><th>Cosa fa l'app</th></tr></thead><tbody>${W.POSTURE.map((t) => {
  const gist = {
    scapole: 'Discinesia comune e spesso senza dolore; rinforzo dentro una riabilitazione completa; effetti brevi.',
    spalle: 'Postura abituale; esercizi cambiano gli angoli, non è dimostrato che riducano il dolore.',
    lordosi: 'Quasi la norma; nessun legame causale chiaro con il mal di schiena; gli esercizi non cambiano la curva.',
    cifosi: 'Reale nell\'anziano; il rinforzo riduce la curva di pochi gradi, senza cambiare la funzione.',
    collo: 'Rinforzo cervico-scapolare riduce il dolore cronico (prove moderate); lo stretching da solo no.',
    scoliosi: 'Esercizi specifici (Schroth, SEAS) con prove da molto incerte a basse; serve supervisione.',
    ginocchio: 'L\'esercizio anca + ginocchio è il trattamento centrale del dolore femoro-rotuleo.',
    schiena: 'L\'esercizio riduce il dolore (prove moderate); nessun tipo superiore agli altri.',
    spalla: 'L\'esercizio è la prima linea; dosaggio ottimale non noto.',
    piede: 'Il piede piatto senza dolore non va trattato; esercizi con effetti piccoli.',
    artrosi: 'Esercizio a terra come trattamento di base (OARSI), effetto per 2-6 mesi.',
    anca: 'Educazione + esercizio migliore dell\'infiltrazione a 8 settimane.'
  }[t.id];
  return '<tr><td><b>' + esc(t.label) + '</b></td><td>' + esc(gist) + '</td><td>' + (t.referral ? 'Rimanda al professionista; solo attività generale' : (t.framing ? 'Programma di forza, senza promettere di correggere' : 'Programma graduale')) + '</td></tr>';
}).join('')}</tbody></table>`);
for (const t of W.POSTURE) {
  add('Postura e dolori', t.label, `
<div class="two">
<div>
<p class="what">${esc(t.what)}</p>
<h3>Cosa dicono le fonti</h3>${ul(t.sources.map((s) => esc(s.t)))}
${refsLine(t.sources.flatMap((s) => s.r))}
</div>
<div>
<h3>Cosa non è dimostrato</h3>${ul(t.notProven.map(esc))}
<h3>Prima il medico se</h3>${ul(t.red.map(esc), 'red')}
<h3>Muscoli e dosaggio</h3><p class="small"><b>Muscoli.</b> ${esc(t.muscles)}</p><p class="small"><b>Dosaggio.</b> ${esc(t.dose)}</p>
<h3>Esercizi proposti</h3><p class="small">${t.exercises.map((id) => esc(W.EX[id].name)).join(' · ')}</p>
</div></div>`);
}

/* -------------------------------- postpartum --------------------------------------- */
add('Dopo il parto', 'Come ragiona l\'app', `
<p class="lead">Il tipo di parto decide <b>quando</b> si può sbloccare una fase; i sintomi decidono <b>se</b> si procede. Tutte le fonti chiedono una progressione guidata dai sintomi.</p>
${ul([
  'Nessuno studio indica quando riprendere corsa, salti o carichi pesanti: i tempi usati sono consenso di esperti (Goom 2019: non prima di circa 3 mesi e solo senza sintomi) e l\'app lo dice.',
  'Il controllo post-parto delle 6-8 settimane è un passaggio di valutazione, non un via libera automatico all\'impatto: senza, l\'app resta alla fase di recupero.',
  'Non ci sono prove di tempi diversi per cesareo programmato e d\'urgenza: l\'app tratta il cesareo d\'urgenza come percorso più lento <b>per prudenza propria</b> e lo scrive.',
  'Il pavimento pelvico si lavora ogni giorno dall\'inizio (ACOG, UK CMO, Canada 2025); per lacerazioni di 3°-4° grado e parti operativi si rimanda alla fisioterapia (RCOG, NICE).'
])}`);
add('Dopo il parto', 'Le cinque fasi', `<table class="grid"><thead><tr><th>Fase</th><th>Finestra</th><th>Contenuto</th><th>Si sblocca se</th></tr></thead><tbody>${W.PHASES.map((p, i) => {
  const unlock = ['—', 'Controllo post-parto fatto; nessun segno d\'urgenza', 'Almeno 12 settimane; nessun sintomo pelvico; test di carico e di forza superati', 'Come la fase 2', 'Come la fase 2'][i];
  return '<tr><td><b>' + esc(p.label) + '</b></td><td>' + esc(p.range) + '</td><td>' + esc(p.summary) + '</td><td>' + esc(unlock) + '</td></tr>';
}).join('')}</tbody></table>`);
add('Dopo il parto', 'Il tipo di parto', `<table class="grid"><thead><tr><th>Tipo di parto</th><th>Cosa cambia nell'app</th></tr></thead><tbody>${[
  ['vaginale', 'Fasi per settimane; nessuna regola particolare.'],
  ['lacerazione', 'Cyclette e nuoto solo quando la zona è guarita e ci si siede comode (consenso Goom).'],
  ['oasis', 'L\'app resta alla fase di recupero finché la persona non dichiara di aver fatto la visita e di avere il via di chi la segue; ogni esercizio del pavimento pelvico rimanda al fisioterapista; messaggio forte per chiedere la fisioterapia.'],
  ['operativo', 'Come il parto vaginale, con l\'invito del NICE a considerare 3 mesi di pavimento pelvico supervisionato.'],
  ['cesareo_prog', 'Nessun tempo fisso: carichi e guida «quando ci si sente completamente riprese» (NICE NG192). Mobilizzazione precoce. Mobilizzazione della cicatrice dalle 6 settimane. Nelle prime 4 settimane niente aperture del ginocchio né abduzioni.'],
  ['cesareo_urg', 'Come sopra, più cautela dell\'app: nelle prime settimane solo respiro, pavimento pelvico e camminata; la fase 2 richiede il via di chi la segue. Scelta di prudenza, non dato di studio.']
].map(([id, text]) => '<tr><td><b>' + esc(W.DELIVERIES.find((d) => d.id === id).label) + '</b></td><td>' + esc(text) + '</td></tr>').join('')}</tbody></table>`);
add('Dopo il parto', 'Segnali: quando fermarsi e chiamare', `<div class="two"><div><h3>Nessun esercizio: si chiama</h3>${ul(W.URGENT.map(esc), 'red')}</div><div><h3>Da far vedere a un fisioterapista del pavimento pelvico</h3>${ul(W.PELVIC.map(esc))}
<h3>Fonti degli elenchi</h3><p class="small">NICE NG194 (cura postnatale), linea guida canadese 2025, Goom 2019, RCOG GTG 29. L'elenco è una sintesi: <b>Le chiediamo di verificarne la completezza.</b></p></div></div>`);
add('Dopo il parto', 'Prima della corsa: i test', `<p class="small">Autovalutazione proposta, tratta da Goom 2019 (consenso di esperti, non risultati di studi). Si fa senza dolore, pesantezza, trascinamento o perdite; solo con tutti superati l'app apre la fase dell'impatto.</p><div class="two"><div><h3>Carico e impatto</h3>${ul(W.LOAD_TESTS.map(esc))}</div><div><h3>Forza (obiettivo: 20 ripetizioni)</h3>${ul(W.STRENGTH_TESTS.map(esc))}
<h3>Progressione della corsa</h3><p class="small">Alternanza cammina-corri in sei gradini (da 1 minuto di corsa e 2 di camminata a 15 minuti continui), prima il volume e poi l'intensità.</p></div></div>`);
addList('Dopo il parto', 'Cosa dicono le fonti', W.POSTPARTUM_SOURCES, 1900, (p) => ul(p.map((s) => esc(s.t) + refsLine(s.r))));
add('Dopo il parto', 'Cosa non è dimostrato', ul(W.POSTPARTUM_NOT_PROVEN.map(esc)) + `<h3>Frasi che l'app non scrive</h3>${ul([
  '«Dopo 6 settimane sei guarita e puoi fare tutto».', '«Dopo il cesareo servono 14-16 settimane prima di correre» (non presente nella linea guida originale).',
  '«Gli addominali/crunch peggiorano la diastasi» o «vanno evitati» (un RCT dice che non la peggiorano).', '«Questi esercizi chiudono la diastasi».',
  '«L\'esercizio riduce il latte».', '«L\'esercizio cura la depressione post-parto» (riduce i sintomi, non sostituisce la cura).'
])}`);

/* --------------------------------- labour ---------------------------------------- */
add('Travaglio e parto', 'Quando decide solo il team', `<p class="lead">L'app chiede la situazione clinica prima di mostrare qualsiasi cosa. Con anche uno solo di questi punti propone solo informazioni generali e rimanda a chi segue la gravidanza:</p>${ul(W.LABOUR_RISKS.map(esc), 'cols2')}
<p class="small">Con epidurale o induzione, in travaglio, l'app mostra solo ciò che resta valido (posizioni decise dal team, spinta, respiro) e nessun esercizio. Le revisioni su posizioni e mobilità includono donne a basso rischio: i risultati non si trasferiscono alle altre.</p>`);
addList('Travaglio e parto', 'La guida: cosa dicono le prove', W.LABOUR_GUIDE, 2300, (p) => '<table class="grid"><thead><tr><th>Momento</th><th>Cosa dice l\'app</th><th>Prove</th></tr></thead><tbody>' + p.map((g) => '<tr><td><b>' + esc(g.title) + '</b><br><span class="small">' + esc(g.when) + '</span></td><td>' + esc(g.t) + '</td><td class="small">' + esc(g.e) + '<br>' + [...new Set(g.r)].map((id) => esc(short(id))).join(' · ') + '</td></tr>').join('') + '</tbody></table>');
add('Travaglio e parto', 'Essere allenate cambia il travaglio?', `<p class="lead">${esc(W.LABOUR_TRAINING.t)}</p>${ul(W.LABOUR_TRAINING.facts.map((f) => esc(f.t) + refsLine(f.r)))}`);
add('Travaglio e parto', 'La preparazione delle ultime settimane, per profilo', `<table class="grid"><thead><tr><th>Profilo</th><th>Messaggio</th></tr></thead><tbody>${W.LABOUR_PROFILES.map((p) => '<tr><td><b>' + esc(p.label) + '</b></td><td>' + esc(p.message) + '</td></tr>').join('')}</tbody></table>
<p class="small" style="margin-top:12px">Il programma (dalla settimana indicata fino alla 40ª, al massimo dodici): camminata (per chi non si allenava da 15 minuti, a salire fino a 30; almeno 150 minuti a settimana come obiettivo delle linee guida), pavimento pelvico ogni seduta, una seduta di posizioni comode e movimento libero (palla, appoggio in avanti, carponi, sul fianco), una di forza leggera o di camminata facile, una di respiro e rilassamento. Nessun esercizio da supina. Il massaggio perineale dalla 34ª-35ª settimana è citato nella guida come gesto da concordare con l'ostetrica, non come esercizio.</p>`);
add('Travaglio e parto', 'Quando chiamare subito', `${ul(W.LABOUR_ALARMS.map(esc), 'red')}<p class="small"><b>Attenzione:</b> questo elenco è una sintesi di uso comune nelle informazioni ostetriche; non è stato verificato frase per frase su una singola fonte. <b>Le chiediamo di validarlo o sostituirlo.</b> L'app lo mostra con questa riserva.</p>`);

/* ---------------------------- validation and limits ------------------------------- */
add('Revisione clinica', 'Cosa Le chiediamo di verificare', `<ol class="check">${[
  '<b>Elenchi di segnali d\'allarme</b> (travaglio, dopo il parto, ogni problema posturale): sono completi? Qualcosa è formulato in modo troppo generico o troppo allarmistico?',
  '<b>Fasi dopo il parto e criteri di sblocco:</b> le finestre (6, 12 settimane, 3-6 mesi), il controllo post-parto come condizione, i test di Goom come autovalutazione. Sono ragionevoli per un\'app senza valutazione dal vivo?',
  '<b>Cesareo e lacerazioni di 3°-4° grado:</b> la scelta di non andare oltre il recupero senza il via di chi segue la persona (e di trattare il cesareo d\'urgenza come percorso più lento) è appropriata?',
  '<b>Dosaggi marcati come opinione esperta:</b> 2-3 serie da 10-15 ripetizioni, regola del dolore (al massimo 3 su 10, ritorno alla base in 24 ore), carico massimo di 15 kg per lo stacco leggero dopo il parto, contrazioni del pavimento pelvico tenute 3-6 secondi.',
  '<b>Travaglio:</b> la scelta di non dare indicazioni di posizione con epidurale o induzione; la formulazione di ciò che si può chiedere all\'ostetrica; l\'avviso sull\'acqua e sul massaggio perineale.',
  '<b>Scoliosi:</b> l\'app non propone esercizi correttivi e offre solo attività generale con diagnosi già fatta. È la scelta giusta?',
  '<b>Gravidanza:</b> nessun esercizio da supina, camminata come base, cautela sulle alte intensità per le atlete. Mancano controindicazioni o cautele che userebbe Lei?',
  '<b>Linguaggio:</b> le frasi sono comprensibili per un non addetto? Ci sono formulazioni che potrebbero essere lette come promessa?'
].map((t) => '<li>' + t + '</li>').join('')}</ol>`);
add('Revisione clinica', 'Limiti e punti aperti', ul([
  'I contenuti sono stati costruiti da fonti pubblicate, non da una valutazione clinica diretta: nessun professionista li ha ancora rivisti.',
  'Per molte indicazioni (tempi di ripresa, dosaggi) esiste solo consenso di esperti: l\'app lo dichiara ma non può sostituirlo con prove che non ci sono.',
  'Non abbiamo trovato una revisione di buona qualità sugli esercizi nella scoliosi dell\'adulto, sul cesareo d\'urgenza o sui tempi per lacerazioni di 1°-2° grado: l\'app non dice nulla di specifico su questi punti.',
  'Gli esercizi hanno descrizione scritta ma non ancora immagini o video verificati.',
  'Le traduzioni in altre lingue sono state fatte con strumenti automatici e non rivedute da professionisti sanitari.',
  'I riferimenti sono verificati nella loro esistenza e nei dati bibliografici; il contenuto di alcune linee guida (NICE, WHO) è stato letto da sintesi ufficiali o pagine di ricerca perché il sito bloccava il testo integrale. Dove era così, lo abbiamo indicato nella ricerca.'
]));

/* --------------------------------- references -------------------------------------- */
const ids = Object.keys(REFS);
const guidelines = ids.filter((id) => !/^\d+$/.test(id));
const pubmed = ids.filter((id) => /^\d+$/.test(id)).sort((a, b) => REFS[a].cite.localeCompare(REFS[b].cite));
addList('Riferimenti', 'Linee guida e documenti ufficiali', guidelines, 2600, (p) => '<ol class="refl" start="1">' + p.map((id) => '<li>' + cite(id) + '</li>').join('') + '</ol>');
for (let i = 0; i < pubmed.length; i += 30) add('Riferimenti', 'Bibliografia (' + (Math.floor(i / 30) + 1) + '/' + Math.ceil(pubmed.length / 30) + ')', '<ol class="refl small" start="' + (i + 1) + '">' + pubmed.slice(i, i + 30).map((id) => '<li>' + cite(id) + '</li>').join('') + '</ol>');

/* ------------------------------------ html ----------------------------------------- */
const css = `
@page { size: 297mm 210mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1b1b1f; }
.slide { width: 297mm; height: 210mm; padding: 14mm 18mm 12mm 18mm; position: relative; overflow: hidden; page-break-after: always; break-after: page; background: #fff; }
.slide:before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 6mm; background: #d4af37; }
.kicker { font-size: 9.5pt; letter-spacing: 2px; text-transform: uppercase; color: #8a6d0b; font-weight: 700; }
h2 { margin: 2px 0 8px; font-size: 21pt; line-height: 1.15; color: #101827; }
h3 { margin: 8px 0 3px; font-size: 11pt; color: #101827; }
p { margin: 0 0 6px; font-size: 10.5pt; line-height: 1.42; }
.lead { font-size: 12pt; line-height: 1.45; }
.what { font-size: 10.5pt; background: #f6f3e8; border-left: 3px solid #d4af37; padding: 6px 9px; }
.small { font-size: 9pt; color: #333; }
ul, ol { margin: 0 0 6px; padding-left: 17px; }
li { font-size: 10.2pt; line-height: 1.38; margin-bottom: 3px; }
ul.red li { color: #8a1c1c; }
ul.cols2 { columns: 2; column-gap: 12mm; }
.two, .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; }
.refs { font-size: 8pt; color: #666; margin: 2px 0 6px; line-height: 1.35; }
table.grid { width: 100%; border-collapse: collapse; font-size: 9.2pt; }
table.grid th { text-align: left; background: #101827; color: #fff; padding: 5px 7px; font-size: 9pt; }
table.grid td { padding: 5px 7px; border-bottom: 1px solid #ddd; vertical-align: top; line-height: 1.35; }
.warn { border: 2px solid #b8860b; background: #fff8e1; border-radius: 8px; padding: 10px 14px; }
.warn p { font-size: 11pt; }
.flow { display: flex; align-items: stretch; gap: 6px; }
.step { flex: 1; border: 1px solid #ccc; border-radius: 8px; padding: 8px 10px; display: flex; gap: 8px; align-items: flex-start; font-size: 10pt; }
.step b { background: #d4af37; color: #101827; border-radius: 50%; min-width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 9pt; }
.warnstep { border-color: #b8860b; background: #fff8e1; }
.arrow { align-self: center; color: #8a6d0b; font-size: 16pt; }
ol.check li { margin-bottom: 7px; font-size: 10.5pt; }
ol.refl li { font-size: 9pt; line-height: 1.32; margin-bottom: 4px; }
ol.refl.small { columns: 2; column-gap: 9mm; }
ol.refl.small li { font-size: 7.8pt; line-height: 1.28; margin-bottom: 3px; break-inside: avoid; }
.foot { position: absolute; left: 18mm; right: 14mm; bottom: 6mm; display: flex; justify-content: space-between; font-size: 8pt; color: #777; border-top: 1px solid #e3e3e3; padding-top: 3px; }
.cover-slide { background: #0a0a0a; color: #f2f2f2; }
.cover-slide:before { background: #d4af37; width: 9mm; }
.cover .brand { font-size: 14pt; letter-spacing: 6px; color: #d4af37; font-weight: 800; margin-top: 18mm; }
.cover h1 { font-size: 46pt; margin: 14mm 0 6mm; line-height: 1.05; }
.cover .sub { font-size: 16pt; color: #ddd; max-width: 200mm; line-height: 1.35; }
.cover .meta { font-size: 12pt; color: #d4af37; margin-top: 14mm; line-height: 1.6; }
.cover .note { position: absolute; left: 18mm; right: 18mm; bottom: 16mm; border: 1px solid #5f4c13; background: #14110a; padding: 10px 14px; border-radius: 8px; font-size: 10pt; color: #e8d9a8; }
.tag { display: inline-block; font-size: 8pt; padding: 1px 6px; border-radius: 10px; background: #eee; }
`;
const total = slides.length;
const html = '<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Nurvan — Salute e recupero</title><style>' + css + '</style></head><body>' +
  slides.map((s, i) => '<section class="slide ' + s.cls + '">' + (s.kicker ? '<div class="kicker">' + esc(s.kicker) + '</div>' : '') + (s.title ? '<h2>' + esc(s.title) + '</h2>' : '') + s.body +
    (i === 0 ? '' : '<div class="foot"><span>Nurvan · Salute e recupero · documento per revisione clinica</span><span>' + (i + 1) + ' / ' + total + '</span></div>') + '</section>').join('') +
  '</body></html>';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-deck-'));
const file = path.join(tmp, 'deck.html');
fs.writeFileSync(file, html, 'utf8');
if (process.env.DECK_HTML) fs.writeFileSync(process.env.DECK_HTML, html, 'utf8');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const run = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--print-to-pdf=' + OUT, 'file:///' + file.replace(/\\/g, '/')], { stdio: 'ignore', timeout: 120000 });
fs.rmSync(tmp, { recursive: true, force: true });
if (run.status !== 0 || !fs.existsSync(OUT)) { console.error('PDF not written'); process.exit(1); }
console.log(total + ' slides -> ' + OUT);
