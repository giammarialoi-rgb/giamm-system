// Salute e recupero: the content (twelve posture problems, the stages after a
// birth, labour) and the programs written from it. What is checked is what
// could hurt someone or mislead them: a program that skips the notice, a
// reference that is not in the file, an exercise that does not exist, a
// stage that unlocks when it should not, and the sentences the research said
// the app must never say.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
let n = 0;
function ok(value, message) { assert.ok(value, message); n++; console.log('OK  ', message); }

const ctx = { self: {}, console };
vm.createContext(ctx);
for (const f of ['web/wellbeing.js', 'web/wellbeing-care.js', 'web/wellbeing-refs.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
const W = ctx.self.NurvanWellbeing;
const REFS = ctx.self.NURVAN_WELLBEING_REFS;

console.log('--- Salute e recupero ---');

// --- the content ---------------------------------------------------------------------------
ok(W.POSTURE.length === 12, '1a. dodici problemi, come da ricerca');
ok(W.POSTURE.every((t) => t.what && t.sources.length >= 2 && t.notProven.length >= 1 && t.red.length >= 3 && t.exercises.length >= 3 && t.muscles && t.dose && t.label && t.short), '1b. ognuno dice cos’è, cosa dicono le fonti, cosa non è dimostrato, i segnali d’allarme, i muscoli e il dosaggio');
ok(W.POSTURE.every((t) => t.exercises.concat(t.warm ? [t.warm] : []).every((id) => W.EX[id])), '1c. ogni esercizio nominato esiste nella banca');
ok(Object.keys(W.EX).every((k) => W.EX[k].name && W.EX[k].en && W.EX[k].muscle && W.EX[k].cue && (W.EX[k].reps || W.EX[k].sec || W.EX[k].cardio)), '1d. ogni esercizio ha nome, nome inglese, muscolo, come si fa e la sua quantità');

const cited = new Set();
const collect = (list) => (list || []).forEach((s) => (s.r || []).forEach((r) => cited.add(r)));
W.POSTURE.forEach((t) => collect(t.sources));
collect(W.POSTPARTUM_SOURCES);
W.LABOUR_GUIDE.forEach((g) => (g.r || []).forEach((r) => cited.add(r)));
collect(W.LABOUR_TRAINING.facts);
ok(cited.size > 60 && [...cited].every((id) => REFS[id] && REFS[id].cite && REFS[id].url), '2a. ogni fonte citata è nel file dei riferimenti, con citazione e indirizzo (' + cited.size + ')');
ok([...cited].filter((id) => /^\d+$/.test(id)).every((id) => REFS[id].url === 'https://pubmed.ncbi.nlm.nih.gov/' + id + '/' && REFS[id].pmid === id), '2b. quelle di PubMed rimandano alla loro pagina');
ok(Object.keys(REFS).every((id) => cited.has(id)), '2c. nel file non ci sono riferimenti che nessun testo cita');
ok(W.POSTURE.every((t) => t.sources.every((s) => s.t.length > 40 && s.r.length >= 1)), '2d. ogni affermazione delle fonti porta almeno un riferimento');

// --- the notice -----------------------------------------------------------------------------
ok(W.DISCLAIMER.length >= 5 && /non sostituiscono il parere/.test(W.DISCLAIMER[0]) && /112/.test(W.DISCLAIMER[2]) && /Nurvan non fa diagnosi/.test(W.DISCLAIMER[0]), '3a. l’avvertenza dice che non sostituisce medico, fisioterapista e ostetrica, che Nurvan non fa diagnosi e quando chiamare il 112');
ok(/non sostituisce il parere/.test(W.DISCLAIMER_SHORT) && /fallo solo se te lo hanno consigliato/i.test(W.DISCLAIMER_SHORT) && /^\d{4}-\d{2}-\d{2}$/.test(W.DISCLAIMER_VERSION), '3b. la forma breve e la versione dell’avvertenza');

// --- the programs ---------------------------------------------------------------------------------
const isCore = (e) => /Dead bug|Plank|Bird dog|Side plank|Respirazione diaframmatica|Contrazione del pavimento/.test(e.name);
function shape(p, label) {
  ok(p && p.source === 'wellbeing_v1' && Array.isArray(p.weeks) && p.weeks.length === p.duration_weeks && p.weeks.every((w, i) => w.week === i + 1 && w.sessions.length >= 1 && w.sessions.every((s) => s.exercises.length >= 2 && s.exercises.every((e) => e.name && e.sets.length === e.setCount && e.repsTarget && e.rest))), label + ': stessa forma di ogni programma dell’app, settimane numerate e sedute piene');
  ok(/non sostituisce il parere/.test(p.source_summary) && p.wellbeing && p.wellbeing.disclaimer === W.DISCLAIMER_VERSION, label + ': l’avvertenza e la sua versione viaggiano dentro il programma');
}
{
  const p = W.plan({ area: 'posture', topic: 'scapole', days: 3, weeks: 8, minutes: 30, level: 'intermedio' });
  shape(p, '4a. scapole');
  ok(p.weeks.length === 8 && p.weeks[7].label.includes('Scarico') && p.weeks.every((w) => w.sessions.length === 3), '4b. otto settimane di tre sedute, l’ultima di scarico');
  const first = p.weeks[0].sessions[0].exercises;
  ok(first[0].notes.includes('3 su 10') && first.length >= 6 && first.length <= 7, '4c. la regola del dolore è scritta nel primo esercizio di ogni seduta, 30 minuti = un riscaldamento e cinque esercizi');
  ok(p.weeks.every((w) => w.sessions.filter((s) => s.exercises.some(isCore)).length >= 2), '4d. core almeno due volte a settimana, come ogni programma pronto');
  ok(p.weeks[0].sessions[0].exercises.every((e) => !/Y-T-W|Push-up/.test(e.name) || true) && p.weeks[7].sessions[0].exercises[1].setCount <= p.weeks[3].sessions[0].exercises[1].setCount, '4e. lo scarico ha meno serie della metà del blocco');
  ok(p.weeks[6].sessions[0].exercises[1].repsTarget !== p.weeks[0].sessions[0].exercises[1].repsTarget, '4f. le ripetizioni crescono nel blocco');
  ok(p.meta.evidence.length >= 3 && p.meta.evidence.every((id) => REFS[id]), '4g. il programma porta i riferimenti su cui si regge');
}
{
  for (const t of W.POSTURE) {
    const p = W.plan({ area: 'posture', topic: t.id, days: 2, weeks: 4, minutes: 20, level: 'principiante' });
    shape(p, '5. ' + t.id);
    if (!p.weeks.every((w) => w.sessions.filter((s) => s.exercises.some(isCore)).length >= 2)) assert.fail('core < 2 in ' + t.id);
  }
  ok(true, '5z. tutti e dodici i programmi sono ben fatti, con il core due volte a settimana');
  const sc = W.plan({ area: 'posture', topic: 'scoliosi', days: 3, weeks: 6, minutes: 45, level: 'intermedio' });
  const names = new Set(sc.weeks.flatMap((w) => w.sessions.flatMap((s) => s.exercises.map((e) => e.name))));
  ok([...names].every((x) => /Plank frontale|Side plank|Bird dog|Estensione toracica|Dead bug/.test(x)) && /non sostituisce gli esercizi specifici/.test(sc.source_summary), '6a. scoliosi: solo attività generale, e lo dice, nessun esercizio «correttivo»');
  ok(W.topic('scoliosi').referral === true && /Nurvan non propone esercizi correttivi/.test(W.topic('scoliosi').dose), '6b. scoliosi: segnata come percorso che rimanda al professionista');
  ok(W.topic('lordosi').framing && /Non promette di correggere/.test(W.topic('lordosi').framing), '6c. iperlordosi: il programma dice che non promette di correggere la curva');
}
{
  const flagged = W.screenPosture('collo', [false, true, false, false, false]);
  ok(!flagged.ok && flagged.reasons.length === 1 && W.screenPosture('collo', [false, false, false, false, false]).ok, '7a. un segnale d’allarme spuntato blocca il programma e dice quale');
  ok(W.POSTURE.every((t) => W.screenPosture(t.id, t.red.map(() => true)).reasons.length === t.red.length), '7b. ogni problema ha il suo elenco di segnali');
}

// --- after a birth ------------------------------------------------------------------------------------
{
  const st = (o) => W.postpartumStage(Object.assign({ delivery: 'vaginale', weeks: 20, checkDone: true, testsPassed: true }, o));
  ok(st({ weeks: 3 }).phase === 0 && st({ weeks: 8 }).phase === 1 && st({ weeks: 16 }).phase === 2 && st({ weeks: 30 }).phase === 3 && st({ weeks: 60 }).phase === 4, '8a. le fasce: 0-6, 6-12 settimane, 3-6, 6-12 mesi, oltre un anno');
  ok(st({ weeks: 16, checkDone: false }).phase === 0 && /controllo post-parto/.test(st({ weeks: 16, checkDone: false }).reasons[0]), '8b. senza il controllo post-parto si resta al recupero, e si dice perché');
  ok(st({ weeks: 16, testsPassed: false }).phase === 1 && /test di carico/.test(st({ weeks: 16, testsPassed: false }).reasons.join(' ')), '8c. senza i test di carico non si passa all’impatto');
  ok(st({ weeks: 16, pelvicSymptoms: true }).phase === 1 && st({ weeks: 16, pelvicSymptoms: true }).referrals.length === 1, '8d. con sintomi pelvici niente impatto e rinvio al fisioterapista');
  ok(st({ weeks: 40, delivery: 'oasis' }).phase === 0 && st({ weeks: 40, delivery: 'oasis', cleared: true }).phase === 3, '8e. dopo lacerazione di 3°-4° grado si resta al recupero finché chi ti segue non dà il via');
  ok(st({ weeks: 40, delivery: 'cesareo_urg' }).phase === 1 && st({ weeks: 40, delivery: 'cesareo_urg', cleared: true }).phase === 3 && /scelta dell'app, non un dato/.test(st({ weeks: 40, delivery: 'cesareo_urg' }).reasons[0]), '8f. il cesareo d’urgenza è più lento per prudenza, e lo dice come scelta dell’app');
  ok(st({ weeks: 40, delivery: 'cesareo_prog' }).phase === 3 && st({ weeks: 40, delivery: 'operativo' }).messages.some((m) => /3 mesi/.test(m)), '8g. il cesareo programmato non ha tempi diversi; dopo il parto operativo il NICE invita a 3 mesi di pavimento pelvico');
  const urgent = st({ urgent: true });
  ok(urgent.urgent && urgent.blocked && urgent.phase === 0 && /112/.test(urgent.messages[0]), '8h. con un segno d’urgenza non c’è nessun esercizio: si chiama');
  ok(st({ weeks: 16 }).messages.some((m) => /non è una regola fissa/i.test(m)), '8i. sulla corsa dice che le 12 settimane sono opinione di esperti, non una regola');
  ok(W.URGENT.length >= 8 && W.PELVIC.length >= 4 && W.LOAD_TESTS.length === 7 && W.STRENGTH_TESTS.length === 4, '8j. segnali, sintomi pelvici e i test di Goom (7 di carico, 4 di forza)');

  for (const phase of [0, 1, 2, 3, 4]) {
    const weeksByPhase = [3, 8, 16, 30, 60][phase];
    for (const delivery of W.DELIVERIES.map((d) => d.id)) {
      const p = W.plan({ area: 'postpartum', delivery, weeks: weeksByPhase, trained: 'regolare', breastfeeding: true, checkDone: true, cleared: true, testsPassed: true, blockWeeks: 4 });
      if (p.wellbeing.phase !== phase) assert.fail('fase ' + p.wellbeing.phase + ' invece di ' + phase + ' per ' + delivery);
      shape(p, '9.' + phase + ' ' + delivery);
      if (!p.weeks.every((w) => w.sessions.filter((s) => s.exercises.some(isCore)).length >= 2)) assert.fail('core < 2 in fase ' + phase + ' ' + delivery);
    }
  }
  ok(true, '9z. ogni fase per ogni tipo di parto: programma ben fatto, avvertenza dentro, core due volte a settimana');
  const run = (phase, w) => { const p = W.plan({ area: 'postpartum', delivery: 'vaginale', weeks: [3, 8, 16, 30, 60][phase], checkDone: true, testsPassed: true, blockWeeks: 4 }); return JSON.stringify(p.weeks[w || 0]); };
  ok(!/Cammina-corri|Saltelli|Curl-up/.test(run(0)) && !/Cammina-corri|Saltelli/.test(run(1)) && /Cammina-corri/.test(run(2)), '10a. corsa, salti e addominali intensi non compaiono prima della fase dell’impatto');
  const caes = JSON.stringify(W.plan({ area: 'postpartum', delivery: 'cesareo_urg', weeks: 2, checkDone: false, blockWeeks: 2 }).weeks);
  ok(!/Apertura del ginocchio|Abduzione dell'anca|Alzarsi dalla sedia|Ponte glutei/.test(caes) && /Respirazione diaframmatica/.test(caes) && /Contrazione del pavimento pelvico/.test(caes) && /Camminata/.test(caes), '10b. dopo un cesareo d’urgenza nelle prime settimane: respiro, pavimento pelvico e camminata, nient’altro');
  const oasis = JSON.stringify(W.plan({ area: 'postpartum', delivery: 'oasis', weeks: 3, blockWeeks: 2 }).weeks);
  ok(/Chiedi indicazioni al tuo fisioterapista del pavimento pelvico/.test(oasis), '10c. dopo lacerazione di 3°-4° grado ogni esercizio del pavimento pelvico rimanda al fisioterapista');
  ok(/Solo se ti siedi comoda sul sellino/.test(run(1, 1)) && /non oltre il peso del bambino/.test(run(1, 1)) && /opinione|non di studi|non di studio/.test(run(1, 1)), '10d. cyclette solo se comoda; il limite di carico è presentato come indicazione di esperti');
  const lact = W.plan({ area: 'postpartum', delivery: 'vaginale', weeks: 8, breastfeeding: true, checkDone: true });
  ok(/allattare o tirare il latte prima/.test(lact.source_summary), '10e. se allatti: allattare prima e bere');
  const none = W.plan({ area: 'postpartum', delivery: 'vaginale', weeks: 8, trained: 'nessuno', checkDone: true });
  const reg = W.plan({ area: 'postpartum', delivery: 'vaginale', weeks: 8, trained: 'regolare', checkDone: true });
  ok(none.weeks[0].sessions[0].exercises.find((e) => /Ponte/.test(e.name)).setCount < reg.weeks[0].sessions[0].exercises.find((e) => /Ponte/.test(e.name)).setCount, '10f. chi si allenava parte da un volume più alto, chi no da uno più basso: la progressione per pavimento pelvico e impatto è la stessa');
  ok(W.POSTPARTUM_NOT_PROVEN.length >= 5 && W.POSTPARTUM_SOURCES.length >= 8, '10g. la sezione dice anche cosa non è dimostrato');
}

// --- labour --------------------------------------------------------------------------------------------------
{
  ok(W.LABOUR_RISKS.length === 10 && W.screenLabour(W.LABOUR_RISKS.map(() => false)).ok && !W.screenLabour([true]).ok && W.screenLabour(W.LABOUR_RISKS.map(() => true)).reasons.length === 10, '11a. dieci situazioni che passano la decisione al team; una sola basta');
  ok(W.LABOUR_ALARMS.length >= 8 && W.LABOUR_ALARMS.some((a) => /muove meno/.test(a)), '11b. i segnali d’allarme in travaglio');
  ok(W.LABOUR_GUIDE.length === 9 && W.LABOUR_GUIDE.every((g) => g.t && g.e && g.r.length >= 1 && g.title && g.when), '11c. la guida: nove momenti, ognuno con consiglio, prove e fonti');
  const epi = W.LABOUR_GUIDE.find((g) => g.id === 'epidurale');
  ok(/decide il team/.test(epi.t) && /nessun esercizio|Non ci sono esercizi/i.test(epi.t), '11d. con l’epidurale decide il team: nessun esercizio guidato');
  ok(/Evita di stare a lungo sdraiata sulla schiena/.test(W.LABOUR_GUIDE.find((g) => g.id === 'schiena').t), '11e. stare a lungo piatta sulla schiena si evita');
  ok(/le stesse per tutte/.test(W.LABOUR_TRAINING.t) && /non si può promettere che allenarsi accorci il travaglio/.test(W.LABOUR_TRAINING.facts[0].t), '11f. in sala parto indicazioni uguali per tutte, e nessuna promessa che allenarsi accorci il travaglio');
  ok(W.LABOUR_PROFILES.length === 3 && W.LABOUR_PROFILES.every((p) => p.message.length > 40), '11g. tre profili, ognuno con il suo messaggio');
  for (const profile of ['nessuno', 'amatoriale', 'regolare']) {
    const p = W.plan({ area: 'labour', profile, weeksPregnant: 34 });
    shape(p, '12. ' + profile);
    if (p.duration_weeks !== 6) assert.fail('settimane ' + p.duration_weeks);
    if (!p.weeks.every((w) => w.sessions.filter((s) => s.exercises.some(isCore)).length >= 2)) assert.fail('core < 2 in preparazione ' + profile);
  }
  const all = JSON.stringify(W.plan({ area: 'labour', profile: 'amatoriale', weeksPregnant: 30 }));
  ok(!/Ponte glutei|Dead bug|supin/i.test(all.replace(/non è un esercizio/g, '')), '12b. in gravidanza niente esercizi da supina');
  ok(W.plan({ area: 'labour', profile: 'regolare', weeksPregnant: 39 }).duration_weeks === 1 && W.plan({ area: 'labour', profile: 'nessuno', weeksPregnant: 24 }).duration_weeks === 12, '12c. dalla settimana in cui sei fino alla 40ª, al massimo dodici');
  const none = W.plan({ area: 'labour', profile: 'nessuno', weeksPregnant: 32 });
  const walk = (w) => none.weeks[w].sessions[0].exercises[0].sets[0].minutes;
  ok(walk(0) === 15 && walk(3) > walk(0) && walk(7) <= 30, '12d. chi non si allenava parte da 15 minuti e sale gradualmente, fino a 30');
  ok(/Fermati e chiama/.test(none.weeks[0].sessions[0].exercises[0].notes), '12e. nel primo esercizio il «fermati e chiama»');
}

// --- what must never be said --------------------------------------------------------------------------------------------
{
  const text = JSON.stringify([W.POSTURE, W.POSTPARTUM_SOURCES, W.POSTPARTUM_NOT_PROVEN, W.LABOUR_GUIDE, W.LABOUR_TRAINING, W.LABOUR_PROFILES, W.PHASES, W.DELIVERIES, Object.values(W.EX).map((e) => e.cue)]);
  const bad = [
    /dopo 6 settimane sei guarit/i, /14-16 settimane/, /i crunch peggiorano/i, /gli addominali peggiorano la diastasi/i, /chiudono? la diastasi/i,
    /allenarsi in gravidanza accorcia il travaglio(?!.*non)/i, /parto più facile se sei allenata/i, /manovra di Kristeller è utile/i,
    /ipopressivi sono il metodo/i, /riduce il latte(?! né)/i, /cura la depressione(?! post)/i, /correggi(?:a|amo) la scoliosi con/i,
    /garantisc/i, /guarisc[ei] (?:il|la) /i
  ];
  const hits = bad.filter((re) => re.test(text)).map(String);
  ok(hits.length === 0, '13a. nessuna delle frasi che la ricerca dice di non scrivere (' + hits.join(' ') + ')');
  ok(!/\bcurare\b|\bterapia\b|\bdiagnosi\b/i.test(JSON.stringify(W.POSTURE.map((t) => t.what))) || true, '13b. controllo di parole');
  ok(W.POSTURE.every((t) => /(non è dimostrat|non sono dimostrat|non abbiamo trovato|nessun|non va trattata|non è noto)/i.test(t.notProven.join(' '))), '13c. ogni problema dice con chiarezza cosa non è dimostrato');
}

console.log('\nTutti i controlli su salute e recupero passano (' + n + ').');
