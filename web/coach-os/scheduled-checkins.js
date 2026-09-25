// ===================== Check-in programmati =====================
//
// Il coach sceglie per ogni atleta cadenza, giorno, ora e domande; l'atleta
// riceve il promemoria, compila una sola schermata e invia. Il calendario e i
// confronti sono in web/checkin-schedule.js (NurvanCheckIns); qui ci sono le
// schermate.
//
// Dove stanno le cose:
//   - il modello: sul rapporto coach-atleta (server, coach_clients), arriva
//     all'atleta con /api/client/me in store.clientProfile.checkInTemplate;
//   - le compilazioni: voci di store.bodyChecks con kind 'scheduled' o
//     'extra', foto in IndexedDB (bodycheck_front_/side_/back_ + id), inviate
//     con retryCheckInSend, lo stesso percorso dei check fisici (stati, FAILED,
//     RIPROVA);
//   - "in attesa" e "saltato": calcolati dalla cadenza, mai salvati.

function scheduledCheckInLib() {
  return (typeof self !== 'undefined' && self.NurvanCheckIns) || null;
}

var SCHED_CHECKIN_DAY_NAMES = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
var SCHED_CHECKIN_CADENCE_LABELS = { weekly: 'Ogni settimana', biweekly: 'Ogni due settimane', monthly: 'Una volta al mese' };
var SCHED_CHECKIN_ROW_TYPE_LABELS = { scale: 'Scala 1–5', yesno: 'Sì / no', number: 'Numero', text: 'Testo libero' };

function schedCheckInWhen(ms) {
  if (ms == null) return '—';
  const d = new Date(ms);
  return SCHED_CHECKIN_DAY_NAMES[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') +
    ' alle ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function schedCheckInDate(ms) {
  if (ms == null) return '—';
  const d = new Date(ms);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}
function schedCheckInNumber(n) {
  return n == null ? '—' : String(n).replace('.', ',');
}

/* ------------------------------ athlete ------------------------------ */

// The athlete's model, only when a coach set one. No coach, no check-ins.
function athleteCheckInTemplate() {
  const K = scheduledCheckInLib();
  if (!K || !store || typeof isAthleteRole !== 'function' || !isAthleteRole()) return null;
  if (store.coachViewingClient || store.coachAssigning) return null;
  // A link waiting for a seat: no reminders until it is active again.
  const link = currentAccountEntitlement().coachLink;
  if (link && link.seatInactive) return null;
  const t = store.clientProfile && store.clientProfile.checkInTemplate;
  return t ? K.normalizeTemplate(t) : null;
}

// Local fills and the server's list, in the shape NurvanCheckIns reads.
function athleteCheckInHistory() {
  const local = (store.bodyChecks || []).filter(function (c) { return c && (c.kind === 'scheduled' || c.kind === 'extra'); }).map(function (c) {
    return { id: c.id, kind: c.kind, scheduledFor: c.scheduledFor || null, receivedAt: c.at, status: 'received', local: c };
  });
  const server = (store.clientCheckIns || []).filter(function (c) {
    return !local.some(function (l) { return l.local.serverCheckInId && String(l.local.serverCheckInId) === String(c.id); });
  });
  return local.concat(server);
}

function findLocalCheckInForSlot(dueAt) {
  const K = scheduledCheckInLib();
  if (!K) return null;
  return (store.bodyChecks || []).filter(function (c) {
    return c && c.kind === 'scheduled' && K.answersSlot({ kind: 'scheduled', scheduledFor: c.scheduledFor, receivedAt: c.at }, dueAt);
  }).pop() || null;
}

async function refreshAthleteCheckIns(force) {
  if (!store || !store.accountToken || typeof isAthleteRole !== 'function' || !isAthleteRole()) return;
  const now = Date.now();
  if (!force && store.__clientCheckInsAt && now - store.__clientCheckInsAt < 5 * 60000) return;
  store.__clientCheckInsAt = now;
  try {
    const payload = await practiceFetch('/api/client/check-ins?limit=20', { method: 'GET', headers: practiceHeaders(false) }, 12000);
    const before = JSON.stringify(store.clientCheckIns || []);
    store.clientCheckIns = (payload.checkIns || []).map(function (c) {
      return {
        id: c.id, kind: c.kind, status: c.status, scheduledFor: c.scheduledFor || null,
        receivedAt: c.receivedAt || null, reviewedAt: c.reviewedAt || null, coachResponse: c.coachResponse || ''
      };
    });
    if (JSON.stringify(store.clientCheckIns) !== before) {
      persist();
      if (typeof currentView !== 'undefined' && currentView === 'home' && typeof render === 'function') render();
    }
  } catch (_) {}
}

// Called after /api/client/me: a new model moves the reminder; a new reply
// from the coach brings the list in now instead of in five minutes.
function onAthleteMeRefreshed(prevTemplateJson, events) {
  const nowJson = JSON.stringify((store.clientProfile && store.clientProfile.checkInTemplate) || null);
  const changed = nowJson !== prevTemplateJson;
  const reviewed = (events || []).some(function (e) {
    return e && e.kind === 'check_in_reviewed' && Date.parse(e.created_at || '') > (store.__clientCheckInsAt || 0);
  });
  if (changed) {
    try { if (typeof scheduleAllItemAlerts === 'function') scheduleAllItemAlerts(); } catch (_) {}
    if (typeof currentView !== 'undefined' && currentView === 'home' && typeof render === 'function') render();
  }
  refreshAthleteCheckIns(changed || reviewed);
}

// The reminder, through the app's own channel: a real notification on
// Android, a notification while the app is open on the web.
function scheduledCheckInReminderJob() {
  const K = scheduledCheckInLib();
  const t = athleteCheckInTemplate();
  if (!K || !t) return null;
  const at = K.nextDue(t, Date.now());
  if (!at) return null;
  return {
    id: 'checkin_sched',
    title: 'Check-in di questa settimana',
    body: 'Il tuo coach aspetta il check-in: hai 48 ore per inviarlo.',
    at: at,
    repeatEveryMs: t.cadence === 'weekly' ? 7 * 86400000 : (t.cadence === 'biweekly' ? 14 * 86400000 : 0)
  };
}

function scheduledCheckInHomeHtml() {
  const K = scheduledCheckInLib();
  const t = athleteCheckInTemplate();
  if (!K || !t) return '';
  const now = Date.now();
  let html = '';
  const slot = K.openSlot(t, now);
  if (slot) {
    const local = findLocalCheckInForSlot(slot.dueAt);
    const onServer = (store.clientCheckIns || []).some(function (c) { return K.answersSlot(c, slot.dueAt); });
    const state = local ? (local.checkInSyncState || (local.serverCheckInId ? 'SYNCED' : 'DRAFT')) : '';
    if (!onServer && state !== 'SYNCED') {
      const failed = local && state !== 'SYNCING';
      html += '<div class="card sched-checkin-banner" style="padding:12px;margin-bottom:12px;border:1px solid var(--gold);">' +
        '<div style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1px;">CHECK-IN DI QUESTA SETTIMANA</div>' +
        (local
          ? '<div style="font-size:13px;font-weight:800;margin-top:4px;">' + esc(checkInStatusLabel(state) || 'Non inviato') + '</div>' +
            (failed ? '<button type="button" class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="retryScheduledCheckIn(\'' + esc(String(local.id)) + '\')">RIPROVA</button>' : '')
          : '<div style="font-size:13px;font-weight:800;margin-top:4px;">Il coach aspetta il tuo check-in</div>' +
            '<div style="font-size:11px;color:#888;margin-top:2px;">Puoi inviarlo fino a ' + esc(schedCheckInWhen(slot.expiresAt)) + '</div>' +
            '<button type="button" class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="openScheduledCheckIn(\'scheduled\')">COMPILA</button>') +
        '</div>';
    }
  }
  html += scheduledCheckInCoachNoteHtml();
  if (!html) {
    const next = K.nextDue(t, now);
    html = '<div class="card" style="padding:10px 12px;margin-bottom:12px;border:1px solid #333;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">' +
      '<div style="min-width:0;"><div style="font-size:10px;color:#888;">Prossimo check-in</div>' +
      '<div style="font-size:12px;font-weight:800;">' + esc(schedCheckInWhen(next)) + '</div></div>' +
      '<button type="button" class="btn btn-outline" style="font-size:10px;padding:6px 10px;" onclick="openScheduledCheckIn(\'extra\')">CHECK-IN EXTRA</button></div>';
  }
  return html;
}

// The coach's reply to the last check-in, until the athlete closes it.
function scheduledCheckInCoachNoteHtml() {
  const seen = store.__checkInNotesSeen || {};
  const withReply = (store.clientCheckIns || []).filter(function (c) {
    return c && c.coachResponse && !seen[c.id] && Date.now() - (Date.parse(c.reviewedAt || c.receivedAt || '') || 0) < 21 * 86400000;
  });
  const c = withReply[0];
  if (!c) return '';
  return '<div class="card sched-checkin-note" style="padding:12px;margin-bottom:12px;border:1px solid #333;">' +
    '<div style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1px;">NOTA DEL COACH</div>' +
    '<div style="font-size:10px;color:#888;margin-top:2px;">Sul check-in del ' + esc(schedCheckInDate(Date.parse(c.receivedAt || ''))) + '</div>' +
    '<div style="font-size:13px;color:#eee;margin-top:6px;white-space:pre-wrap;overflow-wrap:anywhere;">' + esc(c.coachResponse) + '</div>' +
    '<button type="button" class="btn btn-outline" style="width:100%;margin-top:10px;font-size:10px;" onclick="dismissCheckInNote(\'' + esc(String(c.id)) + '\')">LETTA</button></div>';
}
function dismissCheckInNote(id) {
  store.__checkInNotesSeen = Object.assign({}, store.__checkInNotesSeen || {});
  store.__checkInNotesSeen[String(id)] = Date.now();
  persist();
  render();
}
window.dismissCheckInNote = dismissCheckInNote;

async function retryScheduledCheckIn(id) {
  await retryCheckInSend(id);
  render();
}
window.retryScheduledCheckIn = retryScheduledCheckIn;

/* The attachment: numbers the app already has, nothing new. */
function scheduledCheckInAttachment() {
  const K = scheduledCheckInLib();
  let week = null;
  let target = null;
  try {
    const N = typeof nutritionTargetsLib === 'function' ? nutritionTargetsLib() : null;
    const days = (DATA && DATA.nutrition && DATA.nutrition.days) || [];
    const t = currentNutritionTarget(null);
    target = t && t.source ? t : null;
    if (N) week = N.weekAverage({ days: nutritionDiaryDaysForAverage(days), today: isoDateOnly(new Date()), target: target });
  } catch (_) {}
  let done = null;
  let planned = null;
  try {
    done = summarizeCheckLogs('settimanale').sessions;
    const wk = DATA && DATA.weeks && DATA.weeks[Math.max(0, (Number(currentWeek) || 1) - 1)];
    planned = wk && Array.isArray(wk.days) ? wk.days.length : null;
  } catch (_) {}
  // Real rest: the seconds already measured between two sets closed in the
  // last seven days.
  let restAvg = null;
  try {
    const since = Date.now() - 7 * 86400000;
    const data = store.data || {};
    let sum = 0;
    let n = 0;
    Object.keys(data).forEach(function (k) {
      if (!/_rest_actual$/.test(k)) return;
      const v = Number(data[k]);
      const at = Number(data[k.replace(/_rest_actual$/, '_done_at')]);
      if (isFinite(v) && v > 0 && at >= since) { sum += v; n += 1; }
    });
    restAvg = n ? sum / n : null;
  } catch (_) {}
  return K ? K.buildAttachment({ week: week, target: target, sessionsDone: done, sessionsPlanned: planned, restAvgSec: restAvg }) : null;
}

function scheduledCheckInAttachmentHtml(a) {
  if (!a) return '';
  const nut = a.nutrition || {};
  const avg = nut.average;
  const tg = nut.target;
  const macro = function (m) { return m ? 'P ' + schedCheckInNumber(m.pro) + ' · C ' + schedCheckInNumber(m.carb) + ' · G ' + schedCheckInNumber(m.fat) : ''; };
  const line = function (label, value) {
    return '<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #1c1c1c;font-size:12px;">' +
      '<span style="color:#888;">' + esc(label) + '</span><span style="color:#eee;text-align:right;overflow-wrap:anywhere;">' + value + '</span></div>';
  };
  return '<div class="sched-checkin-attachment" style="border:1px solid #333;border-radius:10px;padding:10px 12px;">' +
    '<div style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1px;">ALLEGATO AUTOMATICO · ULTIMI 7 GIORNI</div>' +
    '<div style="font-size:10px;color:#777;margin:2px 0 6px;">Calcolato dall\'app, non modificabile</div>' +
    line('Diario, media al giorno', avg ? esc(schedCheckInNumber(avg.kcal) + ' kcal') + '<br><span style="color:#888;font-size:11px;white-space:nowrap;">' + esc(macro(avg)) + (avg.partial ? ' (parziale)' : '') + '</span>' : 'nessun giorno con diario') +
    line('Target', tg ? esc(schedCheckInNumber(tg.kcal) + ' kcal') + '<br><span style="color:#888;font-size:11px;white-space:nowrap;">' + esc(macro(tg)) + '</span>' : 'non impostato') +
    line('Sedute chiuse', a.training && a.training.done != null ? esc(String(a.training.done)) + (a.training.planned != null ? ' su ' + esc(String(a.training.planned)) + ' previste' : '') : '—') +
    line('Recupero reale medio', a.recovery && a.recovery.avgRestSec != null ? esc(formatRestClock(a.recovery.avgRestSec)) : 'nessuna serie misurata') +
    line('Giorni senza diario', esc(String(nut.emptyDays != null ? nut.emptyDays : '—'))) +
    '</div>';
}

function openScheduledCheckIn(kind) {
  const K = scheduledCheckInLib();
  const t = athleteCheckInTemplate();
  if (!K || !t) return;
  const now = Date.now();
  const slot = kind === 'extra' ? null : K.openSlot(t, now);
  window.__schedCheckInDraft = {
    kind: slot ? 'scheduled' : 'extra',
    scheduledFor: slot ? new Date(slot.dueAt).toISOString() : null,
    weight: K.weightPrefill(store.bodyChecks, now),
    answers: {},
    photos: { front: null, side: null, back: null },
    attachment: scheduledCheckInAttachment()
  };
  drawScheduledCheckInSheet();
}
window.openScheduledCheckIn = openScheduledCheckIn;

function schedCheckInScaleHtml(rowId, value) {
  let h = '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:6px;">';
  for (let v = 1; v <= 5; v++) {
    h += '<button type="button" class="btn ' + (value === v ? 'btn-primary' : 'btn-outline') + '" style="min-height:40px;padding:0;font-size:14px;" onclick="setSchedCheckInAnswer(\'' + esc(rowId) + '\',' + v + ')">' + v + '</button>';
  }
  return h + '</div><div style="display:flex;justify-content:space-between;font-size:9px;color:#666;margin-top:3px;"><span>1 poco</span><span>5 molto</span></div>';
}

function schedCheckInPhotoGridHtml(photos, clickable) {
  const sides = [['front', 'Fronte'], ['side', 'Lato'], ['back', 'Retro']];
  return '<div class="sched-checkin-photos" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:6px;">' +
    sides.map(function (s) {
      const src = photos && photos[s[0]];
      const inner = src
        ? '<img src="' + src + '" alt="' + s[1] + '" style="width:100%;height:100%;object-fit:cover;display:block;">'
        : '<span style="font-size:22px;color:#555;">+</span>';
      return '<div style="min-width:0;">' +
        '<div ' + (clickable ? 'role="button" tabindex="0" onclick="pickSchedCheckInPhoto(\'' + s[0] + '\')" ' : '') +
        'style="aspect-ratio:3/4;border:1px dashed #444;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#111;' + (clickable ? 'cursor:pointer;' : '') + '">' + inner + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:4px;margin-top:4px;font-size:10px;color:#aaa;"><span>' + s[1] + '</span>' +
        (clickable && src ? '<button type="button" onclick="clearSchedCheckInPhoto(\'' + s[0] + '\')" style="background:none;border:0;color:#c66;font-size:10px;padding:2px;">Togli</button>' : '') +
        '</div></div>';
    }).join('') + '</div>';
}

function drawScheduledCheckInSheet() {
  const draft = window.__schedCheckInDraft;
  const t = athleteCheckInTemplate();
  if (!draft || !t) return;
  let overlay = document.getElementById('sched-checkin-sheet');
  const scroll = overlay ? (overlay.querySelector('.sched-checkin-scroll') || {}).scrollTop || 0 : 0;
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sched-checkin-sheet';
    overlay.style.cssText = 'position:fixed;inset:0;background:#050505;z-index:10140;display:flex;justify-content:center;box-sizing:border-box;';
    document.body.appendChild(overlay);
  }
  const rows = t.rows.filter(function (r) { return r.on; });
  const body = rows.map(function (r) {
    const label = '<div style="font-size:12px;font-weight:800;color:#eee;overflow-wrap:anywhere;">' + esc(r.label) + '</div>';
    const a = draft.answers[r.id];
    if (r.type === 'weight') {
      return '<div class="sched-row">' + label +
        '<input id="sched-ci-weight" type="number" inputmode="decimal" step="0.1" value="' + (draft.weight != null ? esc(String(draft.weight)) : '') + '" placeholder="kg" oninput="window.__schedCheckInDraft.weight=this.value" style="width:100%;margin-top:6px;padding:10px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;box-sizing:border-box;font-size:16px;">' +
        (draft.weight != null && draft.weight !== '' ? '<div style="font-size:10px;color:#777;margin-top:3px;">Dall\'ultimo check fisico, se è di questi due giorni</div>' : '') + '</div>';
    }
    if (r.type === 'photos') {
      return '<div class="sched-row">' + label + '<div style="font-size:10px;color:#777;margin-top:2px;">Private: le vede solo il tuo coach</div>' + schedCheckInPhotoGridHtml(draft.photos, true) + '</div>';
    }
    if (r.type === 'scale') return '<div class="sched-row">' + label + schedCheckInScaleHtml(r.id, a) + '</div>';
    if (r.type === 'yesno') {
      return '<div class="sched-row">' + label + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">' +
        '<button type="button" class="btn ' + (a === true ? 'btn-primary' : 'btn-outline') + '" onclick="setSchedCheckInAnswer(\'' + esc(r.id) + '\',true)">SÌ</button>' +
        '<button type="button" class="btn ' + (a === false ? 'btn-primary' : 'btn-outline') + '" onclick="setSchedCheckInAnswer(\'' + esc(r.id) + '\',false)">NO</button></div></div>';
    }
    if (r.type === 'number') {
      return '<div class="sched-row">' + label + '<input type="number" inputmode="decimal" value="' + (a != null ? esc(String(a)) : '') + '" oninput="window.__schedCheckInDraft.answers[\'' + esc(r.id) + '\']=this.value" style="width:100%;margin-top:6px;padding:10px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;box-sizing:border-box;font-size:16px;"></div>';
    }
    return '<div class="sched-row">' + label + '<textarea rows="3" oninput="window.__schedCheckInDraft.answers[\'' + esc(r.id) + '\']=this.value" style="width:100%;margin-top:6px;padding:10px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;box-sizing:border-box;font-size:14px;resize:vertical;">' + esc(a || '') + '</textarea></div>';
  }).join('');
  overlay.innerHTML =
    '<div class="sched-checkin-scroll" style="width:100%;max-width:520px;height:100%;overflow-y:auto;overflow-x:hidden;padding:16px;box-sizing:border-box;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;">' +
    '<div style="min-width:0;"><div style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1px;">' + (draft.kind === 'extra' ? 'CHECK-IN EXTRA' : 'CHECK-IN DI QUESTA SETTIMANA') + '</div>' +
    '<div style="font-size:11px;color:#888;">' + (draft.kind === 'extra' ? 'Fuori calendario: il coach lo vede come extra' : 'Previsto ' + esc(schedCheckInWhen(Date.parse(draft.scheduledFor)))) + '</div></div>' +
    '<button type="button" class="btn btn-outline" style="font-size:10px;padding:6px 10px;flex:0 0 auto;" onclick="closeScheduledCheckInSheet()">CHIUDI</button></div>' +
    '<style>#sched-checkin-sheet .sched-row{padding:12px 0;border-bottom:1px solid #1c1c1c;}</style>' +
    body +
    '<div style="margin-top:14px;">' + scheduledCheckInAttachmentHtml(draft.attachment) + '</div>' +
    '<div style="font-size:10px;color:#777;margin:12px 0 8px;">Una volta inviato non si può modificare.</div>' +
    '<button type="button" class="btn btn-primary" style="width:100%;min-height:48px;margin-bottom:24px;" onclick="sendScheduledCheckIn()">INVIA AL COACH</button>' +
    '</div>';
  const sc = overlay.querySelector('.sched-checkin-scroll');
  if (sc && scroll) sc.scrollTop = scroll;
}

function closeScheduledCheckInSheet() {
  const el = document.getElementById('sched-checkin-sheet');
  if (el) el.remove();
}
window.closeScheduledCheckInSheet = closeScheduledCheckInSheet;

function setSchedCheckInAnswer(id, value) {
  const d = window.__schedCheckInDraft;
  if (!d) return;
  const w = document.getElementById('sched-ci-weight');
  if (w) d.weight = w.value;
  d.answers[id] = d.answers[id] === value ? undefined : value;
  drawScheduledCheckInSheet();
}
window.setSchedCheckInAnswer = setSchedCheckInAnswer;

// Photos go through the same picker as the body check (camera, gallery,
// Android bridge); applyCheckFisicoDataUrl hands them here.
function pickSchedCheckInPhoto(side) {
  const d = window.__schedCheckInDraft;
  if (!d) return;
  const w = document.getElementById('sched-ci-weight');
  if (w) d.weight = w.value;
  window.__checkInFormSide = side;
  pickCheckPhoto('front', false);
}
window.pickSchedCheckInPhoto = pickSchedCheckInPhoto;

function applySchedCheckInPhoto(side, dataUrl) {
  const d = window.__schedCheckInDraft;
  if (!d) return;
  d.photos[side === 'side' || side === 'back' ? side : 'front'] = dataUrl;
  drawScheduledCheckInSheet();
}
function clearSchedCheckInPhoto(side) {
  const d = window.__schedCheckInDraft;
  if (!d) return;
  d.photos[side] = null;
  drawScheduledCheckInSheet();
}
window.clearSchedCheckInPhoto = clearSchedCheckInPhoto;

async function sendScheduledCheckIn() {
  const d = window.__schedCheckInDraft;
  const t = athleteCheckInTemplate();
  if (!d || !t) return;
  const w = document.getElementById('sched-ci-weight');
  if (w) d.weight = w.value;
  const weight = parseFloat(String(d.weight == null ? '' : d.weight).replace(',', '.'));
  const answers = {};
  Object.keys(d.answers).forEach(function (k) {
    const v = d.answers[k];
    if (v !== undefined && v !== null && v !== '') answers[k] = typeof v === 'string' ? v.trim() : v;
  });
  const question = t.rows.filter(function (r) { return r.coachQuestion; })[0];
  const id = 'chk_' + Date.now();
  const entry = {
    id: id,
    at: new Date().toISOString(),
    weight: weight > 0 ? Math.round(weight * 10) / 10 : null,
    period: t.cadence === 'monthly' ? 'mensile' : (t.cadence === 'biweekly' ? 'bisettimanale' : 'settimanale'),
    notes: question && answers[question.id] ? String(answers[question.id]) : '',
    hasFront: !!d.photos.front,
    hasSide: !!d.photos.side,
    hasBack: !!d.photos.back,
    analysis: '',
    checkInSyncState: 'DRAFT',
    kind: d.kind,
    scheduledFor: d.scheduledFor,
    answers: answers,
    // The questions as shown: the coach may change the model before it is sent.
    answerRows: t.rows.filter(function (r) { return r && r.type !== 'photos'; }).map(function (r) {
      return { id: r.id, type: r.type, label: r.label, unit: r.unit || undefined };
    }),
    attachment: d.attachment
  };
  try {
    if (d.photos.front) await saveDocumentFile('bodycheck_front_' + id, d.photos.front);
    if (d.photos.side) await saveDocumentFile('bodycheck_side_' + id, d.photos.side);
    if (d.photos.back) await saveDocumentFile('bodycheck_back_' + id, d.photos.back);
  } catch (_) {}
  if (!Array.isArray(store.bodyChecks)) store.bodyChecks = [];
  store.bodyChecks.push(entry);
  // As for every body check: years of them, not sixteen.
  const keep = typeof BODY_CHECKS_KEEP === 'number' ? BODY_CHECKS_KEEP : 400;
  if (store.bodyChecks.length > keep) store.bodyChecks = store.bodyChecks.slice(-keep);
  if (entry.weight) {
    if (!store.profile) store.profile = {};
    store.profile.weight = entry.weight;
    if (!store.bw) store.bw = {};
    store.bw[currentWeek || 1] = entry.weight;
  }
  persist();
  window.__schedCheckInDraft = null;
  closeScheduledCheckInSheet();
  await retryCheckInSend(id);
  refreshAthleteCheckIns(true);
  render();
}
window.sendScheduledCheckIn = sendScheduledCheckIn;

// A sent check-in, read only: what went, and whether it arrived.
async function openSentScheduledCheckIn(id) {
  const entry = (store.bodyChecks || []).find(function (c) { return c && String(c.id) === String(id); });
  if (!entry) return;
  const photos = { front: null, side: null, back: null };
  try {
    if (entry.hasFront) photos.front = await getDocumentFile('bodycheck_front_' + entry.id);
    if (entry.hasSide) photos.side = await getDocumentFile('bodycheck_side_' + entry.id);
    if (entry.hasBack) photos.back = await getDocumentFile('bodycheck_back_' + entry.id);
  } catch (_) {}
  const t = athleteCheckInTemplate() || (scheduledCheckInLib() ? scheduledCheckInLib().defaultTemplate() : { rows: [] });
  const state = entry.checkInSyncState || (entry.serverCheckInId ? 'SYNCED' : 'DRAFT');
  const overlay = document.createElement('div');
  overlay.id = 'sched-checkin-sheet';
  overlay.style.cssText = 'position:fixed;inset:0;background:#050505;z-index:10140;display:flex;justify-content:center;box-sizing:border-box;';
  closeScheduledCheckInSheet();
  overlay.innerHTML = '<div class="sched-checkin-scroll" style="width:100%;max-width:520px;height:100%;overflow-y:auto;overflow-x:hidden;padding:16px;box-sizing:border-box;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;">' +
    '<div style="min-width:0;"><div style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1px;">' + (entry.kind === 'extra' ? 'CHECK-IN EXTRA' : 'CHECK-IN') + '</div>' +
    '<div style="font-size:11px;color:#888;">' + esc(String(entry.at || '').replace('T', ' ').slice(0, 16)) + ' · ' + esc(checkInStatusLabel(state)) + '</div></div>' +
    '<button type="button" class="btn btn-outline" style="font-size:10px;padding:6px 10px;flex:0 0 auto;" onclick="closeScheduledCheckInSheet()">CHIUDI</button></div>' +
    scheduledCheckInAnswersHtml(entry, null, t.rows) +
    ((photos.front || photos.side || photos.back) ? schedCheckInPhotoGridHtml(photos, false) : '') +
    '<div style="margin-top:14px;">' + scheduledCheckInAttachmentHtml(entry.attachment) + '</div>' +
    ((state === 'FAILED' || state === 'QUEUED' || state === 'DRAFT') ? '<button type="button" class="btn btn-primary" style="width:100%;margin:14px 0 24px;" onclick="closeScheduledCheckInSheet();retryScheduledCheckIn(\'' + esc(String(entry.id)) + '\')">RIPROVA</button>' : '') +
    '</div>';
  document.body.appendChild(overlay);
}
window.openSentScheduledCheckIn = openSentScheduledCheckIn;

// Answers and numbers. With a previous check-in, each number shows how far it
// moved and which way: an arrow, no colour, no verdict.
function scheduledCheckInAnswersHtml(curr, prev, rows) {
  const K = scheduledCheckInLib();
  rows = rows && rows.length ? rows : (K ? K.defaultRows() : []);
  const diffs = K ? K.diffFromPrevious(curr, prev, rows) : [];
  const byId = {};
  diffs.forEach(function (d) { byId[d.id] = d; });
  const answers = (curr && curr.answers) || {};
  const out = [];
  rows.forEach(function (r) {
    if (r.type === 'photos') return;
    const d = byId[r.id];
    let value = '';
    let delta = '';
    if (d) {
      value = schedCheckInNumber(d.value) + (d.unit ? ' ' + d.unit : (r.type === 'scale' ? '/5' : ''));
      if (d.delta != null) delta = d.arrow + ' ' + K.formatDelta(d);
    } else if (r.type === 'yesno' && answers[r.id] != null) {
      value = answers[r.id] ? 'Sì' : 'No';
    } else if (r.type === 'text' && answers[r.id]) {
      out.push('<div style="padding:8px 0;border-bottom:1px solid #1c1c1c;"><div style="font-size:11px;color:#888;">' + esc(r.label) + '</div>' +
        '<div style="font-size:13px;color:#eee;margin-top:3px;white-space:pre-wrap;overflow-wrap:anywhere;">' + esc(answers[r.id]) + '</div></div>');
      return;
    }
    if (!value) return;
    out.push('<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 0;border-bottom:1px solid #1c1c1c;">' +
      '<span style="font-size:11px;color:#888;min-width:0;overflow-wrap:anywhere;">' + esc(r.label) + '</span>' +
      '<span style="font-size:13px;color:#eee;white-space:nowrap;">' + esc(value) +
      (delta ? ' <span class="sched-delta" style="font-size:11px;color:#aaa;">' + esc(delta) + '</span>' : '') + '</span></div>');
  });
  return out.length ? '<div>' + out.join('') + '</div>' : '<div style="font-size:11px;color:#777;">Nessuna risposta.</div>';
}

/* ------------------------------ coach ------------------------------ */

// "3 check-in da leggere", above the athlete list.
async function loadCoachCheckInCounter() {
  const box = document.getElementById('cp-checkin-counter');
  if (!box) return;
  try {
    const payload = await practiceFetch('/api/coach/check-ins?status=to_review&limit=100', { method: 'GET', headers: practiceHeaders(false) }, 15000);
    const rows = payload.checkIns || [];
    window.__cpCheckInsToRead = rows;
    box.innerHTML = rows.length
      ? '<button type="button" class="btn btn-primary" style="width:100%;margin-bottom:10px;" onclick="openCoachCheckInsToRead()">' + rows.length + (rows.length === 1 ? ' check-in da leggere' : ' check-in da leggere') + '</button>'
      : '';
  } catch (_) { box.innerHTML = ''; }
}

function openCoachCheckInsToRead() {
  const rows = window.__cpCheckInsToRead || [];
  ensurePracticeOverlays();
  const panel = document.getElementById('cp-assign-panel');
  if (!panel) return;
  panel.innerHTML = '<div style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1px;">DA LEGGERE</div>' +
    '<h2 style="margin:4px 0 10px;">Check-in ricevuti</h2>' +
    (rows.length ? rows.map(function (r) {
      return '<button type="button" class="cp-notify-item" style="margin-bottom:6px;" onclick="openScheduledCheckInDetail(\'' + esc(String(r.id)) + '\')">' +
        '<b>' + esc(r.clientName || 'Atleta') + (r.kind === 'extra' ? ' · extra' : '') + '</b>' +
        '<span>' + esc(schedCheckInWhen(Date.parse(r.receivedAt || ''))) + (r.weight ? ' · ' + esc(schedCheckInNumber(r.weight)) + ' kg' : '') + '</span></button>';
    }).join('') : '<div class="cp-help">Niente da leggere.</div>') +
    '<button type="button" class="btn btn-outline" style="width:100%;margin-top:10px;" onclick="showOverlay(\'cp-assign\',false)">CHIUDI</button>';
  showOverlay('cp-assign', true);
}
window.openCoachCheckInsToRead = openCoachCheckInsToRead;

// The check-in card on the athlete's page: the model and the list.
async function loadCoachScheduledCheckIns(clientId) {
  const box = document.getElementById('cp-ws-checkins');
  if (!box) return;
  try {
    const payload = await practiceFetch('/api/coach/clients/' + encodeURIComponent(clientId) + '/check-ins', { method: 'GET', headers: practiceHeaders(false) }, 15000);
    window.__cpSchedCI = { clientId: String(clientId), template: payload.template || null, checkIns: payload.checkIns || [], editing: null };
    drawCoachScheduledCheckIns();
  } catch (err) {
    box.innerHTML = '<div class="card" style="padding:12px;margin-bottom:12px;"><div style="font-weight:900;color:var(--gold);">Check-in programmati</div><div class="cp-help">' + esc(friendlyApiError(err)) + '</div></div>';
  }
}

function drawCoachScheduledCheckIns() {
  const box = document.getElementById('cp-ws-checkins');
  const st = window.__cpSchedCI;
  const K = scheduledCheckInLib();
  if (!box || !st || !K) return;
  if (st.editing) { box.innerHTML = coachCheckInEditorHtml(st.editing); return; }
  const t = st.template ? K.normalizeTemplate(st.template) : null;
  const list = K.statuses({ template: t, checkIns: st.checkIns, now: Date.now() }).slice(0, 12);
  const statusLabel = function (x) {
    if (x.status === 'received') return x.checkIn && x.checkIn.status === 'received' ? 'ricevuto · da leggere' : 'ricevuto';
    if (x.status === 'pending') return 'in attesa' + (x.lateDays > 0 ? ' · ' + x.lateDays + (x.lateDays === 1 ? ' giorno' : ' giorni') + ' di ritardo' : '');
    if (x.status === 'skipped') return 'saltato';
    return 'extra' + (x.checkIn && x.checkIn.status === 'received' ? ' · da leggere' : '');
  };
  const rowsHtml = list.length ? list.map(function (x) {
    const open = x.checkIn && x.checkIn.id && x.checkIn.status !== 'requested';
    const inner = '<b>' + esc(schedCheckInDate(x.dueAt)) + '</b><span>' + esc(statusLabel(x)) +
      (x.checkIn && x.checkIn.weight ? ' · ' + esc(schedCheckInNumber(x.checkIn.weight)) + ' kg' : '') + '</span>';
    return open
      ? '<button type="button" class="cp-notify-item sched-ci-row" data-status="' + x.status + '" style="margin-bottom:6px;" onclick="openScheduledCheckInDetail(\'' + esc(String(x.checkIn.id)) + '\')">' + inner + '</button>'
      : '<div class="cp-notify-item sched-ci-row" data-status="' + x.status + '" style="margin-bottom:6px;opacity:.75;">' + inner + '</div>';
  }).join('') : '<div class="cp-help" style="margin:6px 0 0;">Nessun check-in ancora.</div>';
  box.innerHTML = '<div class="card" style="padding:12px;margin-bottom:12px;border-color:rgba(212,175,55,.35);">' +
    '<div style="font-weight:900;color:var(--gold);">Check-in programmati</div>' +
    (t
      ? '<div style="font-size:12px;color:#ddd;margin-top:4px;">' + esc(SCHED_CHECKIN_CADENCE_LABELS[t.cadence]) + ' · ' + esc(SCHED_CHECKIN_DAY_NAMES[t.weekday]) + ' · ' + esc(t.time) + '</div>' +
        '<div style="font-size:10px;color:#888;margin-top:2px;">' + (t.customized ? 'Modello personalizzato per questo atleta' : 'Modello applicato a tutti') + ' · prossimo: ' + esc(schedCheckInWhen(K.nextDue(t, Date.now()))) + '</div>'
      : '<div class="cp-help" style="margin:4px 0 0;">Nessun check-in programmato: l\'atleta non riceve promemoria.</div>') +
    (planCan('scheduled_checkins')
      ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">' +
        '<button type="button" class="btn btn-outline" style="font-size:10px;flex:1 1 auto;" onclick="editCoachCheckInTemplate()">' + (t ? 'MODIFICA MODELLO' : 'IMPOSTA CHECK-IN') + '</button>' +
        (t ? '<button type="button" class="btn btn-outline" style="font-size:10px;flex:1 1 auto;" onclick="applyCoachCheckInTemplateToAll()">APPLICA A TUTTI</button>' : '') +
        '</div>'
      : planLockedHtml('scheduled_checkins')) +
    '<div style="margin-top:10px;">' + rowsHtml + '</div></div>';
}

window.drawCoachScheduledCheckIns = drawCoachScheduledCheckIns;

function editCoachCheckInTemplate() {
  if (!requirePlan('scheduled_checkins')) return;
  const st = window.__cpSchedCI;
  const K = scheduledCheckInLib();
  if (!st || !K) return;
  st.editing = JSON.parse(JSON.stringify(st.template ? K.normalizeTemplate(st.template) : K.defaultTemplate()));
  drawCoachScheduledCheckIns();
}
window.editCoachCheckInTemplate = editCoachCheckInTemplate;

function coachCheckInEditorHtml(t) {
  const sel = 'width:100%;margin-top:4px;padding:8px;background:#111;border:1px solid #333;color:#fff;border-radius:6px;box-sizing:border-box;';
  const rows = t.rows.map(function (r, i) {
    const fixed = r.type === 'weight' || r.type === 'photos';
    const editableLabel = !fixed && (r.coachQuestion || /^c_/.test(r.id));
    return '<div class="sched-ci-edit-row" style="display:flex;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid #1c1c1c;">' +
      '<input type="checkbox"' + (r.on ? ' checked' : '') + ' onchange="coachCheckInEdit(\'toggle\',' + i + ',this.checked)" style="width:18px;height:18px;flex:0 0 auto;" aria-label="Attiva">' +
      '<div style="flex:1 1 auto;min-width:0;">' +
      (editableLabel
        ? '<input type="text" value="' + esc(r.label) + '" oninput="coachCheckInEdit(\'label\',' + i + ',this.value)" style="' + sel + 'margin-top:0;">'
        : '<div style="font-size:12px;color:' + (r.on ? '#eee' : '#666') + ';overflow-wrap:anywhere;">' + esc(r.label) + '</div>') +
      '<div style="font-size:9px;color:#666;">' + esc(fixed ? (r.type === 'weight' ? 'Numero (kg)' : 'Foto') : SCHED_CHECKIN_ROW_TYPE_LABELS[r.type] || '') + '</div></div>' +
      '<button type="button" class="btn btn-outline" style="flex:0 0 auto;padding:4px 8px;font-size:11px;" ' + (i === 0 ? 'disabled' : '') + ' onclick="coachCheckInEdit(\'up\',' + i + ')" aria-label="Su">↑</button>' +
      '<button type="button" class="btn btn-outline" style="flex:0 0 auto;padding:4px 8px;font-size:11px;" ' + (i === t.rows.length - 1 ? 'disabled' : '') + ' onclick="coachCheckInEdit(\'down\',' + i + ')" aria-label="Giù">↓</button>' +
      (/^c_/.test(r.id) ? '<button type="button" class="btn btn-outline" style="flex:0 0 auto;padding:4px 8px;font-size:11px;color:#c66;border-color:#c66;" onclick="coachCheckInEdit(\'remove\',' + i + ')" aria-label="Elimina">✕</button>' : '') +
      '</div>';
  }).join('');
  return '<div class="card sched-ci-editor" style="padding:12px;margin-bottom:12px;border-color:var(--gold);">' +
    '<div style="font-weight:900;color:var(--gold);margin-bottom:8px;">Modello di check-in</div>' +
    '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">' +
    '<label style="font-size:10px;color:#ccc;min-width:0;grid-column:1/-1;">Cadenza<select onchange="coachCheckInEdit(\'cadence\',0,this.value)" style="' + sel + '">' +
    ['weekly', 'biweekly', 'monthly'].map(function (c) { return '<option value="' + c + '"' + (t.cadence === c ? ' selected' : '') + '>' + SCHED_CHECKIN_CADENCE_LABELS[c] + '</option>'; }).join('') + '</select></label>' +
    '<label style="font-size:10px;color:#ccc;min-width:0;">Giorno<select onchange="coachCheckInEdit(\'weekday\',0,this.value)" style="' + sel + '">' +
    [1, 2, 3, 4, 5, 6, 0].map(function (d) { return '<option value="' + d + '"' + (t.weekday === d ? ' selected' : '') + '>' + SCHED_CHECKIN_DAY_NAMES[d] + '</option>'; }).join('') + '</select></label>' +
    '<label style="font-size:10px;color:#ccc;min-width:0;">Ora<input type="time" value="' + esc(t.time) + '" onchange="coachCheckInEdit(\'time\',0,this.value)" style="' + sel + '"></label></div>' +
    (t.cadence === 'monthly' ? '<div style="font-size:10px;color:#777;margin-top:4px;">Il primo ' + esc(SCHED_CHECKIN_DAY_NAMES[t.weekday]) + ' di ogni mese.</div>' : '') +
    '<div style="font-size:10px;color:#888;margin:10px 0 2px;">Righe: spunta per attivarle, frecce per l\'ordine</div>' +
    rows +
    '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">' +
    '<select id="sched-ci-new-type" style="' + sel + 'margin-top:0;flex:1 1 110px;width:auto;">' +
    ['scale', 'yesno', 'number', 'text'].map(function (k) { return '<option value="' + k + '">' + SCHED_CHECKIN_ROW_TYPE_LABELS[k] + '</option>'; }).join('') + '</select>' +
    '<input id="sched-ci-new-label" type="text" placeholder="Nuova domanda" style="' + sel + 'margin-top:0;flex:2 1 160px;width:auto;">' +
    '<button type="button" class="btn btn-outline" style="font-size:10px;flex:1 1 100%;" onclick="coachCheckInEdit(\'add\')">AGGIUNGI RIGA</button></div>' +
    '<button type="button" class="btn btn-primary" style="width:100%;margin-top:12px;" onclick="saveCoachCheckInTemplate(false)">SALVA</button>' +
    '<div style="display:flex;gap:6px;margin-top:8px;">' +
    '<button type="button" class="btn btn-outline" style="flex:1;font-size:10px;" onclick="window.__cpSchedCI.editing=null;drawCoachScheduledCheckIns()">ANNULLA</button>' +
    ((window.__cpSchedCI && window.__cpSchedCI.template) ? '<button type="button" class="btn btn-outline" style="flex:1;font-size:10px;color:#c66;border-color:#c66;" onclick="saveCoachCheckInTemplate(true)">DISATTIVA</button>' : '') +
    '</div></div>';
}

function coachCheckInEdit(action, i, value) {
  const st = window.__cpSchedCI;
  const t = st && st.editing;
  if (!t) return;
  const rows = t.rows;
  if (action === 'toggle') rows[i].on = !!value;
  else if (action === 'label') { rows[i].label = String(value || '').slice(0, 120); return; }
  else if (action === 'up' && i > 0) { const x = rows[i - 1]; rows[i - 1] = rows[i]; rows[i] = x; }
  else if (action === 'down' && i < rows.length - 1) { const x = rows[i + 1]; rows[i + 1] = rows[i]; rows[i] = x; }
  else if (action === 'remove') rows.splice(i, 1);
  else if (action === 'cadence') t.cadence = value;
  else if (action === 'weekday') t.weekday = Number(value);
  else if (action === 'time') t.time = value || '18:00';
  else if (action === 'add') {
    const type = (document.getElementById('sched-ci-new-type') || {}).value || 'scale';
    const label = String((document.getElementById('sched-ci-new-label') || {}).value || '').trim();
    if (!label) { practiceToast('Scrivi la domanda', 'error'); return; }
    if (rows.length >= 30) { practiceToast('Massimo 30 righe', 'error'); return; }
    rows.push({ id: 'c_' + Date.now().toString(36), type: type, label: label.slice(0, 120), on: true, coachQuestion: false });
  }
  drawCoachScheduledCheckIns();
}
window.coachCheckInEdit = coachCheckInEdit;

async function saveCoachCheckInTemplate(off) {
  const st = window.__cpSchedCI;
  if (!st) return;
  if (off && !confirm('Disattivare i check-in programmati per questo atleta? Non riceverà più promemoria.')) return;
  try {
    const payload = await practiceFetch('/api/coach/clients/' + encodeURIComponent(st.clientId) + '/check-in-template', {
      method: 'PUT',
      headers: practiceHeaders(true),
      body: JSON.stringify(off ? { off: true } : { template: st.editing })
    }, 15000);
    st.template = payload.template || null;
    st.editing = null;
    drawCoachScheduledCheckIns();
    practiceToast(off ? 'Check-in disattivati' : 'Salvato', 'ok');
  } catch (err) {
    practiceToast(friendlyApiError(err), 'error');
  }
}
window.saveCoachCheckInTemplate = saveCoachCheckInTemplate;

async function applyCoachCheckInTemplateToAll() {
  if (!requirePlan('scheduled_checkins')) return;
  const st = window.__cpSchedCI;
  if (!st || !st.template) return;
  const base = '/api/coach/clients/' + encodeURIComponent(st.clientId) + '/check-in-template/apply-all';
  try {
    const counts = await practiceFetch(base, { method: 'GET', headers: practiceHeaders(false) }, 15000);
    if (!counts.update) {
      practiceToast(counts.keep ? 'Gli altri atleti hanno tutti un modello personalizzato' : 'Nessun altro atleta', 'info');
      return;
    }
    const msg = 'Applicare questo modello a ' + counts.update + (counts.update === 1 ? ' atleta' : ' atleti') + '?' +
      (counts.keep ? '\n' + counts.keep + (counts.keep === 1 ? ' atleta ha' : ' atleti hanno') + ' un modello personalizzato e resta come è.' : '');
    if (!confirm(msg)) return;
    const done = await practiceFetch(base, { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 20000);
    const n = (done.updated || []).length;
    practiceToast('Modello applicato a ' + n + (n === 1 ? ' atleta' : ' atleti'), 'ok');
  } catch (err) {
    practiceToast(friendlyApiError(err), 'error');
  }
}
window.applyCoachCheckInTemplateToAll = applyCoachCheckInTemplateToAll;

async function openScheduledCheckInDetail(checkInId) {
  let row = null;
  try {
    const payload = await practiceFetch('/api/coach/check-ins/' + encodeURIComponent(checkInId), { method: 'GET', headers: practiceHeaders(false) }, 15000);
    row = payload.checkIn;
  } catch (err) {
    practiceToast(friendlyApiError(err), 'error');
    return;
  }
  if (!row) return;
  const K = scheduledCheckInLib();
  const st = window.__cpSchedCI;
  const tpl = st && String(st.clientId) === String(row.clientId) && st.template ? K.normalizeTemplate(st.template) : null;
  // The model's questions, plus the ones the athlete saw that are no longer
  // in it (a question removed after the form was opened keeps its answer).
  const rows = ((tpl && tpl.rows) || (K ? K.defaultRows() : [])).slice();
  (Array.isArray(row.answerRows) ? row.answerRows : []).forEach(function (r) {
    if (r && r.id && !rows.some(function (x) { return x && x.id === r.id; })) rows.push(r);
  });
  const prev = row.previous ? { weight: row.previous.weight, answers: row.previous.answers || {} } : null;
  const media = (row.media || []).filter(function (m) { return /^image\//.test(m.contentType || ''); });
  const order = { front: 0, side: 1, back: 2 };
  media.sort(function (a, b) { return (order[a.kind] != null ? order[a.kind] : 9) - (order[b.kind] != null ? order[b.kind] : 9); });
  const kindLabel = { front: 'Fronte', side: 'Lato', back: 'Retro' };
  ensurePracticeOverlays();
  const panel = document.getElementById('cp-assign-panel');
  if (!panel) return;
  window.__cpSchedDetail = row;
  panel.innerHTML =
    '<div style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1px;">' + (row.kind === 'extra' ? 'CHECK-IN EXTRA' : 'CHECK-IN') + '</div>' +
    '<h2 style="margin:4px 0 2px;overflow-wrap:anywhere;">' + esc(row.clientName || 'Atleta') + '</h2>' +
    '<div style="font-size:11px;color:#888;margin-bottom:10px;">Ricevuto ' + esc(schedCheckInWhen(Date.parse(row.receivedAt || ''))) +
    (row.previous ? ' · confronto con il ' + esc(schedCheckInDate(Date.parse(row.previous.received_at || ''))) : ' · primo check-in') + '</div>' +
    scheduledCheckInAnswersHtml(row, prev, rows) +
    (media.length ? '<div class="sched-checkin-photos" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px;">' + media.map(function (m) {
      return '<div style="min-width:0;"><button type="button" onclick="if (window.CoachOS && window.CoachOS.openCheckInMedia) window.CoachOS.openCheckInMedia(\'' + esc(m.id) + '\')" style="display:block;width:100%;aspect-ratio:3/4;border:1px solid #333;border-radius:8px;overflow:hidden;background:#111;padding:0;">' +
        '<img data-media="' + esc(m.id) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"></button>' +
        '<div style="font-size:10px;color:#aaa;margin-top:3px;">' + esc(kindLabel[m.kind] || 'Foto') + '</div></div>';
    }).join('') + '</div>' : '') +
    (row.attachment ? '<div style="margin-top:12px;">' + scheduledCheckInAttachmentHtml(row.attachment) + '</div>' : '') +
    '<label style="display:block;margin-top:14px;font-size:10px;color:#ccc;">Nota per l\'atleta (la vede nella home)</label>' +
    '<textarea id="sched-ci-reply" rows="3" style="width:100%;margin-top:6px;padding:8px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;box-sizing:border-box;">' + esc(row.coachResponse || '') + '</textarea>' +
    '<button type="button" class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="replyScheduledCheckIn(false)">INVIA NOTA</button>' +
    (row.status === 'received' ? '<button type="button" class="btn btn-outline" style="width:100%;margin-top:8px;font-size:10px;" onclick="replyScheduledCheckIn(true)">SEGNA COME LETTO SENZA NOTA</button>' : '') +
    '<button type="button" class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="showOverlay(\'cp-assign\',false)">CHIUDI</button>';
  showOverlay('cp-assign', true);
  media.forEach(function (m) { loadCheckInMediaThumb(m.id); });
}
window.openScheduledCheckInDetail = openScheduledCheckInDetail;

async function loadCheckInMediaThumb(mediaId) {
  try {
    const access = await practiceFetch('/api/media/' + encodeURIComponent(mediaId) + '/access', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 10000);
    const response = await fetch(practiceApi(access.contentPath) + '?token=' + encodeURIComponent(access.token), { headers: practiceHeaders(false), cache: 'no-store' });
    if (!response.ok) return;
    const url = URL.createObjectURL(await response.blob());
    const img = document.querySelector('#cp-assign-panel img[data-media="' + mediaId + '"]');
    if (img) img.src = url;
  } catch (_) {}
}

async function replyScheduledCheckIn(readOnly) {
  const row = window.__cpSchedDetail;
  if (!row) return;
  const input = document.getElementById('sched-ci-reply');
  const response = input ? input.value.trim() : '';
  if (!readOnly && !response) { practiceToast('Scrivi la nota', 'error'); return; }
  try {
    await practiceFetch('/api/coach/check-ins/' + encodeURIComponent(row.id) + '/review', {
      method: 'POST',
      headers: practiceHeaders(true),
      body: JSON.stringify(readOnly ? { markRead: true } : { response: response })
    }, 15000);
    showOverlay('cp-assign', false);
    practiceToast(readOnly ? 'Segnato come letto' : 'Nota inviata', 'ok');
    const st = window.__cpSchedCI;
    if (st && String(st.clientId) === String(row.clientId)) loadCoachScheduledCheckIns(st.clientId);
    loadCoachCheckInCounter();
  } catch (err) {
    practiceToast(friendlyApiError(err), 'error');
  }
}
window.replyScheduledCheckIn = replyScheduledCheckIn;
