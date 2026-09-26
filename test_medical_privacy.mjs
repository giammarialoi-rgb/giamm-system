// Therapy and exams are health data: who sees them, and what the person can do.
// - The server gives the coach an athlete's record without the sections the
//   athlete keeps private (also the copies inside the program), and the coach's
//   saves cannot clear or replace them, nor write the athlete's settings.
// - The page (functions cut out of web/index.base.html, run in a vm): the first
//   visit shows the notice once, the privacy card sets the choices, "elimina
//   tutto" empties the section and removes the attached files, an exam value
//   goes to Coach AI only with the switch on or a confirmation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coachVisibleAccountData, medicalHiddenFromCoach } from './server/coach-os/workspace.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

console.log('--- 1. il record che vede il coach ---');
{
  const record = {
    prefs: { medicalPrivacy: { therapyCoach: false } },
    therapy: { medications: [{ name: 'Levotiroxina' }] },
    exams: { records: [{ parameter: 'TSH', value: '1,8' }] },
    activeProgram: { weeks: [{}], therapy: { medications: [{ name: 'Levotiroxina' }] }, exams: { records: [{ parameter: 'TSH' }] } },
    bodyChecks: [{ id: 1, sentToCoach: true }, { id: 2 }]
  };
  const seen = coachVisibleAccountData(record);
  ok('1a. terapia nascosta: non c\'e\', ne\' fuori ne\' dentro il programma', !('therapy' in seen) && !('therapy' in seen.activeProgram));
  ok('1b. gli esami condivisi restano', seen.exams && seen.exams.records.length === 1 && seen.activeProgram.exams);
  ok('1c. il coach sa cosa e\' nascosto', seen.medicalHidden && seen.medicalHidden.therapy === true && seen.medicalHidden.exams === false);
  ok('1d. i check fisici solo se inviati', seen.bodyChecks.length === 1 && seen.bodyChecks[0].id === 1);
  ok('1e. il record dell\'atleta non cambia', record.therapy && record.activeProgram.therapy);
  const plain = coachVisibleAccountData({ therapy: { medications: [1] }, exams: { records: [1] } });
  ok('1f. senza scelta tutto resta condiviso, come prima', plain.therapy && plain.exams && !plain.medicalHidden);
  ok('1g. medicalHiddenFromCoach legge le due scelte', JSON.stringify(medicalHiddenFromCoach({ prefs: { medicalPrivacy: { examsCoach: false } } })) === '{"therapy":false,"exams":true}');
}

console.log('');
console.log('--- 2. le rotte del coach ---');
{
  const src = fs.readFileSync(path.join(root, 'coach-practice.mjs'), 'utf8');
  const route = (name) => {
    const at = src.indexOf('app.' + name);
    assert.ok(at !== -1, name);
    return src.slice(at, src.indexOf('\n  app.', at + 10));
  };
  const snap = route('get("/api/coach/clients/:id/snapshot"');
  ok('2a. lo snapshot passa da coachVisibleAccountData', /data: coachVisibleAccountData\(/.test(snap));
  const patch = route('post("/api/coach/clients/:id/patch-data"');
  ok('2b. patch-data non scrive impostazioni e consensi dell\'atleta', /\["prefs", "privacyConsent", "aiConsent", "medicalHidden"\]\.forEach\(\(k\) => \{ delete patch\[k\]; \}\)/.test(patch));
  ok('2c. patch-data lascia stare terapia/esami nascosti (anche nel programma)', /medicalHiddenFromCoach\(current\)/.test(patch) && /delete patch\.activeProgram\[k\]/.test(patch));
  const assign = route('post("/api/coach/clients/:id/assign"');
  ok('2d. assign rifiuta una sezione nascosta', /medicalHiddenFromCoach\(current\)/.test(assign) && /status\(403\)/.test(assign));
}

console.log('');
console.log('--- 3. la pagina ---');
const base = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
function blockAfter(src, at, what) {
  assert.ok(at !== -1, what + ' not found');
  let depth = 0;
  for (let i = src.indexOf('{', at); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(at, i + 1);
  }
  throw new Error('unterminated ' + what);
}
const fn = (name) => {
  let at = base.indexOf('async function ' + name + '(');
  if (at === -1) at = base.indexOf('function ' + name + '(');
  return blockAfter(base, at, name);
};
const NAMES = ['medicalPrivacy', 'medicalSharedWithCoach', 'medicalAiAllowed', 'medicalAiAvailable', 'medicalCoachViewing',
  'medicalDomainLabel', 'setMedicalCoachShare', 'setMedicalAiShare', 'medicalHiddenBannerHtml', 'medicalPrivacyCardHtml',
  'maybeShowMedicalPrivacyNotice', 'showMedicalPrivacyNotice', 'acceptMedicalPrivacyNotice', 'deleteAllMedicalDomain',
  'deleteExamAttachment', 'explainExamParameterAI'];

function loadPage({ athlete = true, allowAi = true, confirmAnswer = true } = {}) {
  const elements = new Map();
  const body = { appendChild(el) { elements.set(el.id, el); } };
  const ctx = {
    store: { prefs: {}, clientProfile: { allowNurvanAi: allowAi }, docs: [{ id: 'doc_a' }, { id: 'doc_b' }] },
    DATA: {
      therapy: { medications: [{ name: 'A' }], protocols: [{ medications: [{ name: 'A' }] }] },
      exams: { records: [{ parameter: 'TSH', value: '1,8' }], reminders: [{ title: 'x' }], attachments: [{ id: 'doc_a', name: 'referto.pdf' }] }
    },
    removed: [], persisted: 0, rendered: 0, toasts: [], asked: [], navigated: [], aiAsked: 0,
    document: {
      body,
      getElementById: (id) => elements.get(id) || null,
      createElement: () => ({ id: '', className: '', style: {}, innerHTML: '', remove() { elements.delete(this.id); } })
    },
    elements
  };
  Object.assign(ctx, {
    isAthleteRole: () => athlete,
    esc: (s) => String(s == null ? '' : s),
    legalLinkHtml: (slug, label) => '<a>' + label + '</a>',
    persist() { ctx.persisted++; },
    render() { ctx.rendered++; },
    showToast(m) { ctx.toasts.push(m); },
    confirm(m) { ctx.asked.push(m); return confirmAnswer; },
    removeDocumentFile: async (id) => { ctx.removed.push(id); },
    navigate(v) { ctx.navigated.push(v); },
    $: () => ({ value: '' }),
    askAI() { ctx.aiAsked++; },
    window: {}
  });
  vm.createContext(ctx);
  vm.runInContext(NAMES.map(fn).join('\n'), ctx);
  return ctx;
}

{
  const p = loadPage();
  vm.runInContext("maybeShowMedicalPrivacyNotice('exams')", p);
  const sheet = p.elements.get('medical-privacy-sheet');
  ok('3a. prima visita: l\'avviso si apre', !!sheet && /dati sulla salute/.test(sheet.innerHTML));
  ok('3b. l\'avviso chiede all\'atleta cosa vede il coach', /mp-therapy-coach/.test(sheet.innerHTML) && /mp-exams-coach/.test(sheet.innerHTML));
  // The athlete keeps exams from the coach and says no to Coach AI.
  p.elements.set('mp-therapy-coach', { checked: true });
  p.elements.set('mp-exams-coach', { checked: false });
  p.elements.set('mp-ai', { checked: false });
  vm.runInContext('acceptMedicalPrivacyNotice()', p);
  const mp = p.store.prefs.medicalPrivacy;
  ok('3c. le scelte si salvano, con la data dell\'avviso', mp.therapyCoach === true && mp.examsCoach === false && p.store.prefs.shareMedicalWithCoach === false && !!mp.noticeAt && p.persisted > 0);
  ok('3d. l\'avviso si chiude', !p.elements.get('medical-privacy-sheet'));
  vm.runInContext("maybeShowMedicalPrivacyNotice('therapy')", p);
  ok('3e. non si ripresenta', !p.elements.get('medical-privacy-sheet'));
  const card = vm.runInContext("medicalPrivacyCardHtml('exams')", p);
  ok('3f. il riquadro dice lo stato e ha elimina tutto', /nascosta al coach/.test(card) && /Coach AI: no/.test(card) && /deleteAllMedicalDomain\('exams'\)/.test(card));
  vm.runInContext("setMedicalCoachShare('exams', true)", p);
  ok('3g. dal riquadro si torna a condividere', p.store.prefs.medicalPrivacy.examsCoach === true);
}
{
  const p = loadPage({ athlete: false });
  vm.runInContext("showMedicalPrivacyNotice('therapy', false)", p);
  const html = p.elements.get('medical-privacy-sheet').innerHTML;
  ok('3h. chi non ha un coach non vede le scelte sul coach', !/mp-therapy-coach/.test(html) && /mp-ai/.test(html));
}
{
  const p = loadPage({ allowAi: false });
  const card = vm.runInContext("medicalPrivacyCardHtml('therapy')", p);
  ok('3i. senza Coach AI concesso dal coach, nessun interruttore AI', !/setMedicalAiShare/.test(card));
}
{
  const p = loadPage();
  p.store.coachViewingClient = true;
  p.store.coachWorkspace = { data: { medicalHidden: { therapy: true, exams: false } } };
  ok('3j. il coach vede solo l\'avviso "sezione privata"', /Sezione privata/.test(vm.runInContext("medicalPrivacyCardHtml('therapy')", p)) && vm.runInContext("medicalPrivacyCardHtml('exams')", p) === '');
  vm.runInContext("maybeShowMedicalPrivacyNotice('therapy')", p);
  ok('3k. e nessun avviso per lui', !p.elements.get('medical-privacy-sheet'));
}
{
  const p = loadPage();
  await vm.runInContext("deleteAllMedicalDomain('exams')", p);
  const ex = p.DATA.exams;
  ok('3l. elimina tutti gli esami: referti, promemoria, allegati', !ex.records.length && !ex.reminders.length && !ex.attachments.length && ex.present === false);
  ok('3m. e i file allegati dal dispositivo', p.removed.join() === 'doc_a' && p.store.docs.map((d) => d.id).join() === 'doc_b');
  await vm.runInContext("deleteAllMedicalDomain('therapy')", p);
  ok('3n. elimina tutta la terapia, blocchi compresi', !p.DATA.therapy.medications.length && !p.DATA.therapy.protocols.length);
}
{
  const p = loadPage({ confirmAnswer: false });
  await vm.runInContext("deleteAllMedicalDomain('exams')", p);
  ok('3o. senza conferma non si elimina niente', p.DATA.exams.records.length === 1 && !p.removed.length);
  vm.runInContext("explainExamParameterAI('TSH', '1,8', 'uUI/mL')", p);
  ok('3p. un valore a Coach AI senza interruttore: chiede, e se no non parte', p.asked.some((m) => /TSH 1,8/.test(m)) && p.aiAsked === 0);
  p.store.prefs.shareMedicalWithCoach = true;
  p.asked.length = 0;
  vm.runInContext("explainExamParameterAI('TSH', '1,8', 'uUI/mL')", p);
  ok('3q. con l\'interruttore attivo parte senza chiedere', !p.asked.length && p.aiAsked === 1);
}
{
  const p = loadPage();
  await vm.runInContext('deleteExamAttachment(0)', p);
  ok('3r. un allegato si elimina da solo, file compreso', !p.DATA.exams.attachments.length && p.removed.join() === 'doc_a' && p.DATA.exams.records.length === 1);
}
ok('3s. le sezioni mostrano riquadro e avviso', /medicalPrivacyCardHtml\('therapy'\)/.test(fn('renderTherapy')) && /maybeShowMedicalPrivacyNotice\('therapy'\)/.test(fn('renderTherapy'))
  && /medicalPrivacyCardHtml\('exams'\)/.test(fn('renderExams')) && /maybeShowMedicalPrivacyNotice\('exams'\)/.test(fn('renderExams')));

console.log('');
if (failed) { console.log(failed + ' controlli privacy falliti.'); process.exit(1); }
console.log('Tutti i controlli privacy di terapia ed esami passano.');
