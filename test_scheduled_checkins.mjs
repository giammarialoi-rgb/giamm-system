// Check-in programmati: il coach sceglie cadenza, giorno e ora; l'atleta ha 48
// ore; il coach vede ricevuti, in attesa e saltati, con le differenze dal
// check-in precedente.
//
// Qui: il calendario (cadenza -> prossima data), la scadenza a 48 ore, lo
// stato di ogni appuntamento, la differenza dal precedente, l'allegato fatto
// con i numeri che l'app ha gia', "Applica a tutti" che non tocca i modelli
// personalizzati (puro e sul server), la pulizia lato server e i fili nella
// pagina.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  CheckInTestHelpers,
  applyCheckInTemplateToAll,
  countApplyCheckInTemplate
} from './server/coach-os/checkins.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
function eq(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message + '\n     atteso ' + b + ', ottenuto ' + a);
}

function loadLibs(extra) {
  const ctx = Object.assign({ console }, extra || {});
  ctx.self = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('web/nutrition-targets.js'), ctx);
  vm.runInContext(read('web/checkin-schedule.js'), ctx);
  return ctx;
}
const { NurvanCheckIns: K, NurvanNutritionTargets: N } = loadLibs();
const at = (y, m, d, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const fmt = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

// ------------------------------------------------------------ cadence -> next date
{
  const weekly = K.defaultTemplate();
  eq([weekly.cadence, weekly.weekday, weekly.time], ['weekly', 0, '18:00'], 'default: weekly, Sunday, 18:00');
  const friday = at(2026, 9, 25, 12);
  eq(fmt(K.nextDue(weekly, friday)), '2026-09-27 18:00', 'weekly from Friday 25/09 -> Sunday 27/09 18:00');
  eq(fmt(K.nextDue(weekly, at(2026, 9, 27, 18, 1))), '2026-10-04 18:00', 'one minute after the time -> the following Sunday');
  const bi = Object.assign({}, weekly, { cadence: 'biweekly', since: '2026-09-13' });
  eq(K.slots(bi, friday, at(2026, 10, 31)).map(fmt), ['2026-09-27 18:00', '2026-10-11 18:00', '2026-10-25 18:00'], 'every two weeks, counted from the start of the model');
  const monthly = Object.assign({}, weekly, { cadence: 'monthly', weekday: 1, time: '07:30' });
  eq(K.slots(monthly, friday, at(2026, 12, 31)).map(fmt), ['2026-10-05 07:30', '2026-11-02 07:30', '2026-12-07 07:30'], 'monthly: the first Monday of each month');
  eq(fmt(K.nextDue(Object.assign({}, weekly, { weekday: 3, time: '9:05' }), friday)), '2026-09-30 09:05', 'Wednesday, time written without the leading zero');
  // Across the end of summer time (25/10/2026) the hour stays the chosen one.
  eq(K.slots(weekly, at(2026, 10, 20), at(2026, 11, 2)).map(fmt), ['2026-10-25 18:00', '2026-11-01 18:00'], 'daylight-saving change does not move the time');
}

// ------------------------------------------------------------ 48 hours, statuses
{
  const t = Object.assign(K.defaultTemplate(), { since: '2026-09-01' });
  const due = at(2026, 9, 27, 18);
  ok('Sunday 18:30: the check-in is open', K.openSlot(t, at(2026, 9, 27, 18, 30)).dueAt === due);
  ok('Sunday 17:59: nothing open yet (last week expired)', K.openSlot(t, at(2026, 9, 27, 17, 59)) === null);
  ok('Tuesday 17:59: still open (47:59 h)', !!K.openSlot(t, at(2026, 9, 29, 17, 59)));
  ok('Tuesday 18:00: expired at 48 h', K.openSlot(t, at(2026, 9, 29, 18, 0)) === null);

  const pending = K.statuses({ template: t, checkIns: [], now: at(2026, 9, 28, 20), from: at(2026, 9, 21) });
  eq(pending.map((x) => [fmt(x.dueAt), x.status, x.lateDays]), [['2026-09-27 18:00', 'pending', 1]], 'within 48 h: pending, one day late');
  const skipped = K.statuses({ template: t, checkIns: [], now: at(2026, 9, 29, 18, 0), from: at(2026, 9, 21) });
  eq(skipped.map((x) => x.status), ['skipped'], 'after 48 h without a fill: skipped');

  const sent = { id: '7', kind: 'scheduled', status: 'received', scheduledFor: new Date(due).toISOString(), receivedAt: new Date(at(2026, 9, 28, 9)).toISOString() };
  const extra = { id: '8', kind: 'extra', status: 'received', receivedAt: new Date(at(2026, 10, 1, 10)).toISOString() };
  const list = K.statuses({ template: t, checkIns: [sent, extra], now: at(2026, 10, 2, 12), from: at(2026, 9, 21) });
  eq(list.map((x) => [x.status, x.checkIn && x.checkIn.id]), [['extra', '8'], ['received', '7']], 'received matches its appointment; the extra is listed as extra');
  // A received check-in without scheduledFor (an older app) still answers its window.
  const legacy = { id: '9', status: 'received', receivedAt: new Date(at(2026, 9, 27, 21)).toISOString() };
  eq(K.statuses({ template: t, checkIns: [legacy], now: at(2026, 10, 2), from: at(2026, 9, 21) }).map((x) => x.status), ['received'], 'no scheduledFor: matched by the 48 h window');
  // A request from the coach is not a fill.
  const request = { id: '10', status: 'requested', createdAt: new Date(at(2026, 9, 27, 19)).toISOString() };
  eq(K.statuses({ template: t, checkIns: [request], now: at(2026, 10, 2), from: at(2026, 9, 21) }).map((x) => x.status), ['skipped'], 'a pending request does not count as sent');
  eq(K.statuses({ template: null, checkIns: [], now: at(2026, 10, 2) }), [], 'no model (no coach): no appointments at all');
}

// ------------------------------------------------------------ difference from the previous
{
  const rows = K.defaultRows();
  const d = K.diffFromPrevious(
    { weight: 79.4, answers: { sleep: 4, energy: 3, hunger: 2 } },
    { weight: 80, answers: { sleep: 3, energy: 3 } },
    rows
  );
  eq(d.map((x) => [x.id, x.delta, x.arrow]), [['weight', -0.6, '↓'], ['sleep', 1, '↑'], ['energy', 0, '='], ['hunger', null, '']], 'weight -0.6 down, sleep +1 up, energy unchanged, hunger new');
  eq(d.map(K.formatDelta), ['−0,6 kg', '+1', '±0', ''], 'written as the coach reads it, no colour');
  eq(K.diffFromPrevious({ weight: 80 }, null, rows).map((x) => x.delta), [null], 'first check-in: values without differences');
}

// ------------------------------------------------------------ attachment from the existing modules
{
  const today = '2026-09-27';
  const days = [
    { date: '2026-09-21', total: { kcal: 2300, pro: 170, carb: 240, fat: 70 } },
    { date: '2026-09-23', total: { kcal: 2500, pro: 190, carb: 260, fat: 80 } }
  ];
  const target = { source: 'prescribed', kcal: 2400, pro: 180, carb: 250, fat: 75 };
  const week = N.weekAverage({ days, today, target });
  const a = K.buildAttachment({ week, target, sessionsDone: 3, sessionsPlanned: 4, restAvgSec: 131.6 });
  eq(a.nutrition.average, { kcal: 2400, pro: 180, carb: 250, fat: 75, partial: false }, 'diary average: the H module\'s weekAverage');
  eq([a.nutrition.loggedDays, a.nutrition.emptyDays], [2, 5], 'days without diary counted apart');
  eq(a.nutrition.target.kcal, 2400, 'target from the resolved target');
  eq([a.training.done, a.training.planned, a.recovery.avgRestSec], [3, 4, 132], 'sessions closed vs planned, average real rest');

  // The page's version, with the page's helpers stubbed to the real modules.
  const src = read('web/coach-os/scheduled-checkins.js');
  const store = {
    data: {
      w1_d0_e0_s1_rest_actual: 120, w1_d0_e0_s1_done_at: at(2026, 9, 26, 10),
      w1_d0_e0_s2_rest_actual: 150, w1_d0_e0_s2_done_at: at(2026, 9, 26, 10, 3),
      w1_d0_e0_s3_rest_actual: 600, w1_d0_e0_s3_done_at: at(2026, 9, 1, 10)
    }
  };
  const FIXED = at(2026, 9, 27, 19);
  class FixedDate extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXED); } static now() { return FIXED; } }
  const ctx = loadLibs({
    Date: FixedDate,
    store,
    DATA: { weeks: [{ days: [1, 2, 3, 4] }], nutrition: { days: [] } },
    currentWeek: 1,
    nutritionTargetsLib: () => ctx.NurvanNutritionTargets,
    currentNutritionTarget: () => target,
    nutritionDiaryDaysForAverage: () => days,
    isoDateOnly: () => today,
    summarizeCheckLogs: () => ({ sessions: 3 })
  });
  vm.runInContext(src, ctx);
  const pa = ctx.scheduledCheckInAttachment();
  eq([pa.nutrition.average.kcal, pa.nutrition.emptyDays, pa.training.done, pa.training.planned, pa.recovery.avgRestSec], [2400, 5, 3, 4, 135],
    'page attachment: diary, sessions from the logs, rest from the sets of the last 7 days only');
}

// ------------------------------------------------------------ banner on the athlete's home
{
  const src = read('web/coach-os/scheduled-checkins.js');
  function home(now, opts = {}) {
    class FixedDate extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } }
    const ctx = loadLibs({
      Date: FixedDate,
      store: {
        clientProfile: opts.noCoach ? {} : { checkInTemplate: Object.assign(K.defaultTemplate(), { since: '2026-09-01' }) },
        bodyChecks: opts.bodyChecks || [],
        clientCheckIns: opts.server || []
      },
      isAthleteRole: () => true,
      esc: (s) => String(s),
      checkInStatusLabel: (s) => ({ FAILED: 'Non inviato — riprova', SYNCED: 'Inviato al coach' })[s] || ''
    });
    vm.runInContext(src, ctx);
    return ctx.scheduledCheckInHomeHtml();
  }
  const sunday = at(2026, 9, 27, 18, 5);
  ok('Sunday 18:05: banner «Check-in di questa settimana» with COMPILA', /CHECK-IN DI QUESTA SETTIMANA/.test(home(sunday)) && /COMPILA/.test(home(sunday)));
  ok('Saturday: no banner, the next date and CHECK-IN EXTRA', !/COMPILA/.test(home(at(2026, 9, 26, 12))) && /CHECK-IN EXTRA/.test(home(at(2026, 9, 26, 12))) && /domenica 27\/09 alle 18:00/.test(home(at(2026, 9, 26, 12))));
  ok('Tuesday 18:00: expired, the banner is gone', !/COMPILA/.test(home(at(2026, 9, 29, 18))));
  ok('athlete without a coach: nothing at all', home(sunday, { noCoach: true }) === '');
  const due = new Date(at(2026, 9, 27, 18)).toISOString();
  const failedFill = { id: 'chk_1', kind: 'scheduled', scheduledFor: due, at: new Date(sunday).toISOString(), checkInSyncState: 'FAILED' };
  ok('failed send: the banner says so and offers RIPROVA', /Non inviato/.test(home(sunday + 60000, { bodyChecks: [failedFill] })) && /retryScheduledCheckIn\('chk_1'\)/.test(home(sunday + 60000, { bodyChecks: [failedFill] })));
  const synced = Object.assign({}, failedFill, { checkInSyncState: 'SYNCED', serverCheckInId: '5' });
  ok('sent: no banner', !/CHECK-IN DI QUESTA SETTIMANA/.test(home(sunday + 60000, { bodyChecks: [synced] })));
  const reply = { id: '5', kind: 'scheduled', status: 'reviewed', receivedAt: due, reviewedAt: due, coachResponse: 'Bene, teniamo così.' };
  ok('the coach\'s note shows in the hub', /NOTA DEL COACH/.test(home(sunday + 3600000, { bodyChecks: [synced], server: [reply] })) && /teniamo così/.test(home(sunday + 3600000, { bodyChecks: [synced], server: [reply] })));
}

// ------------------------------------------------------------ apply to all
{
  const clients = [
    { id: '1', template: { customized: true } },
    { id: '2', template: null },
    { id: '3', template: { customized: false } },
    { id: '4', template: { customized: true } }
  ];
  eq(K.planApplyToAll('1', clients), { update: ['2', '3'], keep: ['4'] }, 'pure: the source is skipped, the customized one is kept');

  // Server, with a pool that records the writes: 3 other athletes, 1 customized.
  const rows = [
    { id: 11, checkin_template: null },
    { id: 12, checkin_template: { cadence: 'weekly', weekday: 1, time: '08:00', customized: true, rows: [] } },
    { id: 13, checkin_template: { cadence: 'weekly', weekday: 0, time: '18:00', customized: false, since: '2026-08-02', rows: [] } }
  ];
  const writes = [];
  const pool = {
    async query(sql, params) {
      if (/^SELECT/.test(sql.trim())) return { rows };
      writes.push({ id: params[0], template: JSON.parse(params[1]), coach: params[2] });
      return { rows: [] };
    }
  };
  const source = CheckInTestHelpers.sanitizeCheckInTemplate(Object.assign(K.defaultTemplate(), { cadence: 'biweekly', weekday: 3 }), { customized: true });
  const counts = await countApplyCheckInTemplate(pool, 1, 10);
  eq(counts, { update: 2, keep: 1 }, 'confirmation count: «2 atleti», 1 kept');
  const done = await applyCheckInTemplateToAll(pool, 1, 10, source);
  eq(done, { updated: ['11', '13'], kept: ['12'] }, 'server: 2 updated, 1 untouched');
  eq(writes.map((w) => [w.id, w.template.cadence, w.template.weekday, w.template.customized, w.coach]), [[11, 'biweekly', 3, false, 1], [13, 'biweekly', 3, false, 1]], 'the copies are marked not customized, and scoped to the coach');
  ok('the customized athlete got no write', !writes.some((w) => w.id === 12));
}

// ------------------------------------------------------------ server sanitizing
{
  const S = CheckInTestHelpers;
  const now = new Date('2026-09-25T10:00:00Z');
  const t = S.sanitizeCheckInTemplate({ cadence: 'yearly', weekday: 9, time: '25:00', rows: [{ id: 'sleep', type: 'scale', label: 'Sonno' }, { id: 'sleep', type: 'text' }, { id: 'x', type: 'bogus', label: '' }] }, { now });
  eq([t.cadence, t.weekday, t.time, t.rows.length, t.rows[1].type, t.rows[1].label, t.customized, t.since], ['weekly', 0, '18:00', 2, 'scale', 'Domanda', true, '2026-09-25'], 'bad values fall back; duplicate rows dropped; saved from the athlete page = customized');
  const prev = { cadence: 'weekly', weekday: 0, time: '18:00', since: '2026-08-02' };
  eq(S.sanitizeCheckInTemplate(Object.assign(K.defaultTemplate(), { rows: K.defaultRows().slice(0, 3) }), { previous: prev, now }).since, '2026-08-02', 'same rhythm: the calendar keeps its start');
  eq(S.sanitizeCheckInTemplate(Object.assign(K.defaultTemplate(), { weekday: 2 }), { previous: prev, now }).since, '2026-09-25', 'new day: the calendar starts again today');
  ok('no rows, no model', S.sanitizeCheckInTemplate({ rows: [] }) === null);

  const tpl = { rows: [{ id: 'sleep', type: 'scale' }, { id: 'c_a', type: 'yesno' }, { id: 'c_b', type: 'number' }, { id: 'question', type: 'text' }] };
  eq(S.sanitizeCheckInAnswers({ sleep: 7, c_a: true, c_b: '72,5', question: '  tutto ok  ', hacker: 'x' }, tpl), { c_a: true, c_b: 72.5, question: 'tutto ok' }, 'answers: scale out of 1–5 dropped, unknown keys dropped');
  const a = S.sanitizeCheckInAttachment({ nutrition: { average: { kcal: '2400', pro: 180, carb: -3, fat: 'x', partial: true }, target: null, loggedDays: 2, emptyDays: 9 }, training: { done: 3, planned: 4 }, recovery: { avgRestSec: 131.6 }, extra: 'no' });
  eq(a, { period: '7 giorni', nutrition: { average: { kcal: 2400, pro: 180, carb: null, fat: null, partial: true }, target: null, loggedDays: 2, emptyDays: null }, training: { done: 3, planned: 4 }, recovery: { avgRestSec: 131.6 } }, 'attachment: numbers only, fixed shape');
  const row = S.checkInRow({ id: 5, client_id: 2, status: 'received', answers: { sleep: 4 }, attachment: a, kind: 'extra', scheduled_for: null });
  eq([row.answers.sleep, row.kind, row.attachment.training.done], [4, 'extra', 3], 'the row carries answers, kind and attachment');
  eq(S.checkInRow({ id: 6, client_id: 2, status: 'received' }).kind, 'scheduled', 'an older check-in reads as scheduled');
}

// ------------------------------------------------------------ wiring
{
  const base = read('web/index.base.html');
  const migration = read('server/db/migrations/0014_checkin_schedule.sql');
  ok('migration: model on coach_clients, fills in coach_check_ins', /coach_clients ADD COLUMN IF NOT EXISTS checkin_template JSONB/.test(migration) && ['answers JSONB', 'attachment JSONB', 'kind TEXT', 'scheduled_for TIMESTAMPTZ'].every((c) => migration.includes('coach_check_ins ADD COLUMN IF NOT EXISTS ' + c)));
  ok('the module is loaded by the page, cached offline and copied to Android', base.includes('<script src="checkin-schedule.js"></script>') && read('web/sw.js').includes("'./checkin-schedule.js'") && read('sync_web_assets.mjs').includes("'checkin-schedule.js'"));
  ok('the screens are in the build', read('build_master25.mjs').includes("'web/coach-os/scheduled-checkins.js'"));
  ok('home: the banner before the last session, with or without a program', base.includes('${scheduledCheckInHomeHtml()}\n    ${lastSessionHomeCardHtml()}') && /scheduledCheckInHomeHtml\(\) \+\n    athleteWaitingHomeHtml\(\)/.test(read('web/coach-practice-ui.js')));
  ok('photos: picked through the body-check picker, side photo in IndexedDB', base.includes('applySchedCheckInPhoto(formSide, dataUrl)') && read('web/coach-os/scheduled-checkins.js').includes("saveDocumentFile('bodycheck_side_' + id"));
  ok('send: the one canonical path (retryCheckInSend), with side photo and answers', read('web/coach-os/scheduled-checkins.js').includes('await retryCheckInSend(id);') && /kind: 'side'/.test(read('web/coach-os/checkins.js')) && /answers: scheduled \?/.test(read('web/coach-os/checkins.js')));
  ok('reminder: the app\'s own channel, cancelled when the coach turns it off', base.includes('checkInJob = scheduledCheckInReminderJob()') && base.includes("NativeConfig.cancelReminder('checkin_sched')"));
  ok('a sent check-in opens read only', base.includes('openSentScheduledCheckIn(entry.id);'));
  ok('coach: counter above the list, card on the athlete page', read('web/coach-practice-ui.js').includes('<div id="cp-checkin-counter"></div>') && read('web/coach-practice-ui.js').includes('loadCoachScheduledCheckIns(id);'));
  const routes = read('coach-practice.mjs');
  ok('routes: model, apply to all, per-athlete list', ['app.put("/api/coach/clients/:id/check-in-template"', 'app.post("/api/coach/clients/:id/check-in-template/apply-all"', 'app.get("/api/coach/clients/:id/check-ins"'].every((r) => routes.includes(r)));
  ok('the athlete gets the model with /api/client/me', routes.includes('checkInTemplate: r.checkin_template || null'));
}

if (failed) {
  console.log('\n' + failed + ' FAIL');
  process.exit(1);
}
console.log('\nCheck-in programmati: tutto verde');
