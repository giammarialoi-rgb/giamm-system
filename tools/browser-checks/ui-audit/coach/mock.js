/* Fetch mock for the COACH area. Injected with Page.addScriptToEvaluateOnNewDocument.
 * Every /api/ call is answered here, nothing leaves the browser (coach-api is never touched).
 * Unmocked /api/ URLs return {ok:true} and are listed in window.__coachMock.unmocked. */
(function () {
  var realFetch = window.fetch;
  var DAY = 86400000;
  var now = Date.now();
  var iso = function (ms) { return new Date(ms).toISOString(); };
  var ago = function (d, h) { return iso(now - d * DAY - (h || 0) * 3600000); };
  var ahead = function (d, h) { return iso(now + d * DAY + (h || 0) * 3600000); };

  var M = window.__coachMock = { unmocked: [], calls: [], appointments: [], payments: [], checkIns: [], messages: {}, tasks: [] };

  /* ------------------------------- clients ------------------------------- */
  function client(o) {
    return Object.assign({
      id: '1', displayName: 'Cliente', username: 'cliente', photo: null, status: 'active', paid: true,
      billingCycle: 'monthly', nextDueAt: ahead(20), allowProgramDb: false, lastWorkoutAt: ago(1), lastSeenAt: ago(0, 3),
      online: false, workoutLive: false, workoutStartedAt: null, programExpiresAt: ahead(30), nextCheckAt: ahead(5),
      checkInTemplate: null, unreadCount: 0, inviteToken: 'tok_abcdef123456', createdAt: ago(60), intakeMode: 'new',
      intakeDone: true, leaveRequested: false, chatThread: 1, allowMaxFreedom: false, allowNurvanAi: false,
      coachingMode: 'remote', hasPendingChange: false, hasPendingUnlock: false, hasPendingIntake: false,
      pendingIntake: null, pendingUnlock: null, seatInactive: false, crmStage: 'ACTIVE'
    }, o);
  }
  var CLIENTS = [
    client({ id: '1', displayName: 'Alessandra Montanari-Bellini', username: 'alessandra.montanari-bellini', unreadCount: 3, nextCheckAt: ago(2), programExpiresAt: ahead(4), lastWorkoutAt: ago(1), online: true, lastSeenAt: ago(0, 0), inviteToken: 'tok_ale111111' }),
    client({ id: '2', displayName: 'Marco Rossi', username: 'marco.rossi', intakeDone: false, lastWorkoutAt: null, createdAt: ago(2), programExpiresAt: null, nextCheckAt: null, inviteToken: 'tok_mar222222' }),
    client({ id: '3', displayName: 'Giulia Esposito', username: 'giulia.esposito', paid: false, nextDueAt: ago(6), lastWorkoutAt: ago(9), lastSeenAt: ago(8), inviteToken: 'tok_giu333333' }),
    client({ id: '4', displayName: 'Davide De Santis', username: 'davide.desantis', workoutLive: true, workoutStartedAt: ago(0, 1), online: true, lastSeenAt: ago(0, 0), lastWorkoutAt: ago(0, 1), inviteToken: 'tok_dav444444' }),
    client({ id: '5', displayName: 'Francesca Lombardi', username: 'francesca.lombardi', hasPendingChange: true, unreadCount: 1, inviteToken: 'tok_fra555555' }),
    client({ id: '6', displayName: 'Luca Bianchi', username: 'luca.bianchi', leaveRequested: true, lastWorkoutAt: ago(4), inviteToken: 'tok_luc666666' }),
    client({ id: '7', displayName: 'Chiara Ferrari-Santoro Nardelli', username: 'chiara.ferrari-santoro', intakeMode: 'transition', coachingMode: 'presence', seatInactive: true, lastWorkoutAt: ago(12), inviteToken: 'tok_chi777777' }),
    client({ id: '8', displayName: 'Matteo Greco', username: 'matteo.greco', hasPendingUnlock: true, pendingUnlock: { feature: 'max_freedom', note: 'Vorrei poter cambiare da solo gli esercizi quando viaggio per lavoro.', at: ago(1) }, hasPendingIntake: true, pendingIntake: { at: ago(1), summary: 'Aggiornamento anagrafica', intake: { goal: 'Ricomposizione corporea', weightBand: '75-80 kg', ageBand: '36-45' } }, coachingMode: 'presence', inviteToken: 'tok_mat888888' }),
    client({ id: '9', displayName: 'Anna', username: 'anna.v', lastWorkoutAt: ago(2), programExpiresAt: ahead(12), inviteToken: 'tok_ann999999' })
  ];
  M.clients = CLIENTS;

  /* ----------------------------- appointments ---------------------------- */
  function appt(i, dayOff, hour, min, type, title, clientId, mode, status, notes) {
    var d = new Date(now); d.setDate(d.getDate() + dayOff); d.setHours(hour, 0, 0, 0);
    var c = CLIENTS.filter(function (x) { return x.id === clientId; })[0];
    return { id: String(i), clientId: clientId || null, clientName: c ? c.displayName : null, type: type, title: title, startsAt: d.toISOString(), endsAt: new Date(d.getTime() + min * 60000).toISOString(), timeZone: 'Europe/Rome', status: status || 'scheduled', mode: mode || null, notes: notes || '', createdBy: 'coach' };
  }
  M.appointments = [
    appt(1, 0, 9, 60, 'Training Session', 'Allenamento insieme · Davide De Santis', '4', 'presence'),
    appt(2, 0, 11, 30, 'Coaching Call', 'Chiamata di coaching · Alessandra Montanari-Bellini', '1', 'remote', 'scheduled', 'Parlare di spalla destra e modifiche alla scheda della settimana 5 prima del viaggio'),
    appt(3, 0, 15, 45, 'Check-in', 'Check-in · Giulia Esposito', '3', 'remote'),
    appt(4, 0, 18, 60, 'Custom Session', 'Riunione con il nutrizionista', null, null),
    appt(5, 1, 10, 60, 'Review', 'Revisione del programma · Marco Rossi', '2', 'presence'),
    appt(6, 2, 17, 90, 'Consultation', 'Consulenza · Chiara Ferrari-Santoro Nardelli', '7', 'presence', 'scheduled', ''),
    appt(7, 3, 8, 60, 'Training Session', 'Allenamento insieme · Matteo Greco', '8', 'presence'),
    appt(8, 5, 19, 30, 'Coaching Call', 'Chiamata di coaching · Francesca Lombardi', '5', 'remote'),
    appt(9, 8, 12, 60, 'Check-in', 'Check-in · Luca Bianchi', '6', 'remote'),
    appt(10, 12, 16, 60, 'Training Session', 'Allenamento insieme · Anna', '9', 'presence'),
    appt(11, 20, 10, 45, 'Review', 'Revisione del programma · Alessandra Montanari-Bellini', '1', 'remote'),
    appt(12, 27, 18, 60, 'Custom Session', 'Open day in palestra', null, null),
    appt(13, -1, 9, 60, 'Training Session', 'Allenamento insieme · Davide De Santis', '4', 'presence', 'completed')
  ];

  /* ------------------------------ payments ------------------------------- */
  function pay(i, clientId, daysAgo, cents, method, label, note) {
    var c = CLIENTS.filter(function (x) { return x.id === clientId; })[0];
    return { id: String(i), clientId: clientId, planId: null, clientName: c ? c.displayName : null, kind: 'paid', amountCents: cents == null ? 0 : cents, hasAmount: cents != null, currency: 'EUR', occurredAt: ago(daysAgo), method: method, label: label, note: note || '' };
  }
  M.payments = [
    pay(1, '1', 2, 15000, 'transfer', 'Mensile coaching', 'Ottobre'),
    pay(2, '4', 5, 8000, 'cash', 'Seduta in presenza', ''),
    pay(3, '5', 9, 12000, 'card', 'Mensile coaching', 'Pagato con la carta, ricevuta richiesta via email'),
    pay(4, '8', 14, null, 'other', 'Altro', 'Cifra da concordare'),
    pay(5, '1', 33, 15000, 'transfer', 'Mensile coaching', 'Settembre'),
    pay(6, '9', 40, 24000, 'transfer', 'Pacchetto di sedute', '10 sedute'),
    pay(7, '5', 41, 12000, 'card', 'Mensile coaching', ''),
    pay(8, '4', 70, 8000, 'cash', 'Seduta in presenza', '')
  ];

  /* ------------------------------ check-ins ------------------------------ */
  M.checkIns = [
    { id: '101', clientId: '1', clientName: 'Alessandra Montanari-Bellini', status: 'received', requestedAt: ago(4), receivedAt: ago(0, 5), reviewedAt: null, weight: 61.4, notes: 'Settimana tosta al lavoro, ho dormito poco ma gli allenamenti sono andati bene.', trainingAdherence: 90, nutritionAdherence: 75, deterministicSummary: { signals: [{ id: 's1', severity: 'medium', title: 'Sonno sotto la media', detail: '2 su 5 per due settimane di fila' }, { id: 's2', severity: 'low', title: 'Peso stabile', detail: 'Variazione -0,2 kg in 14 giorni' }] }, aiSummary: null, coachResponse: '', previousCheckInId: '90', answers: { sleep: 2, energy: 3, hunger: 4, pain: 1, adh_nutrition: 3, adh_training: 5, question: 'Un po stanca ma motivata.' }, answerRows: null, attachment: null, kind: 'scheduled', scheduledFor: ago(0, 6), media: [] },
    { id: '102', clientId: '3', clientName: 'Giulia Esposito', status: 'received', requestedAt: ago(6), receivedAt: ago(1, 2), weight: 58, notes: '', deterministicSummary: { signals: [] }, coachResponse: '', answers: {}, answerRows: null, kind: 'extra', media: [] },
    { id: '103', clientId: '5', clientName: 'Francesca Lombardi', status: 'requested', requestedAt: ago(2), receivedAt: null, weight: null, notes: '', deterministicSummary: {}, coachResponse: '', answers: {}, kind: 'scheduled', media: [] },
    { id: '104', clientId: '9', clientName: 'Anna', status: 'requested', requestedAt: ago(1), receivedAt: null, weight: null, notes: '', deterministicSummary: {}, coachResponse: '', answers: {}, kind: 'scheduled', media: [] },
    { id: '105', clientId: '4', clientName: 'Davide De Santis', status: 'reviewed', requestedAt: ago(10), receivedAt: ago(8), reviewedAt: ago(7), weight: 84.2, notes: 'Tutto ok.', deterministicSummary: { signals: [] }, coachResponse: 'Ottimo lavoro, continuiamo cosi.', answers: {}, kind: 'scheduled', media: [] },
    { id: '106', clientId: '1', clientName: 'Alessandra Montanari-Bellini', status: 'reviewed', requestedAt: ago(18), receivedAt: ago(15), reviewedAt: ago(14), weight: 61.6, notes: '', deterministicSummary: { signals: [] }, coachResponse: 'Bene, aumentiamo un po i carichi sulla gamba.', answers: {}, kind: 'scheduled', media: [] }
  ];

  M.tasks = [
    { id: 't1', title: 'Rivedere la scheda di Alessandra prima del viaggio', clientId: '1', clientName: 'Alessandra Montanari-Bellini', dueAt: ahead(0, 4), status: 'open', priority: 'high' },
    { id: 't2', title: 'Mandare il PDF dell\'alimentazione a Marco', clientId: '2', clientName: 'Marco Rossi', dueAt: ahead(1), status: 'open', priority: 'normal' },
    { id: 't3', title: 'Chiamare il fisioterapista', clientId: null, clientName: '', dueAt: null, status: 'open', priority: 'normal' }
  ];

  var sched = function (rows) { return rows; };
  M.template = { cadence: 'weekly', weekday: 0, time: '18:00', customized: false, since: ago(60).slice(0, 10), rows: null };

  /* ----------------------------- generators ------------------------------ */
  function program(title, weeks) {
    try {
      var g = window.NurvanProgramGenerator;
      var p = g.plan({ days: 4, weeks: weeks || 4, goal: 'hypertrophy', experience: 'intermediate', equipment: 'gym', cardio: { mode: 'steady', minutes: 20, sessions: 2 } });
      p.title = title; p.id = 'prog_mock_1';
      return p;
    } catch (e) {
      return { id: 'prog_mock_1', title: title, weeks: [{ week: 1, days: [{ name: 'Upper A', exercises: [{ name: 'Panca piana', sets: 4, reps: '8-10' }, { name: 'Rematore con manubrio', sets: 3, reps: '10-12' }] }] }] };
    }
  }
  function snapshotFor(id) {
    var c = CLIENTS.filter(function (x) { return x.id === String(id); })[0] || CLIENTS[0];
    var withData = c.id !== '2';
    var data = { profile: { name: c.displayName } };
    if (withData) {
      data.activeProgram = program('Ipertrofia upper/lower 8 settimane', 4);
      data.nutrition = { plan_name: 'Ricomposizione 2.100 kcal', present: true, daily_calories_target: 2100, daily_protein_target: 140, daily_carbs_target: 220, daily_fats_target: 65, days: [{ day: 'Lunedì', meals: [{ name: 'Colazione', foods: [{ name: 'Yogurt greco 0%', quantity: 200 }, { name: 'Fiocchi d\'avena', quantity: 50 }] }, { name: 'Pranzo', foods: [{ name: 'Riso basmati', quantity: 80 }, { name: 'Petto di pollo', quantity: 150 }] }] }] };
      data.supplementation = { protocol_name: 'Base', present: true, items: [{ name: 'Creatina monoidrato', dose: '5 g', timing: 'Al mattino' }, { name: 'Omega 3', dose: '2 g', timing: 'Con il pasto' }, { name: 'Vitamina D3', dose: '2000 UI', timing: 'A colazione' }] };
      data.logs = [3, 5, 8, 10, 12].map(function (d, i) { return { week: 1 + (i > 2 ? 1 : 0), day: i % 4, at: ago(d).slice(0, 19), sets: 18 + i, tonnage: 5200 + i * 310, kcal: 340 + i * 12 }; });
      data.bodyChecks = [];
      data.bw = {};
    }
    var enc = { ageBand: '26-35', sex: 'F', heightBand: '165-170 cm', weightBand: '60-65 kg', goal: 'Ipertrofia' };
    return { ok: true, client: Object.assign({}, c, { intake: c.intakeDone ? enc : {}, needIntake: !c.intakeDone }), inviteUrl: 'https://app.nurvan.app/c/' + c.inviteToken, inviteCode: c.inviteToken.slice(-6).toUpperCase(), inviteText: 'Ciao ' + c.displayName + ', entra qui: https://app.nurvan.app/c/' + c.inviteToken, credentials: { username: c.username, password: '', oneTime: true, requiresReset: true }, intake: c.intakeDone ? enc : {}, data: data, pendingChange: c.hasPendingChange ? { summary: 'Vuole sostituire lo stacco da terra con lo stacco rumeno per un fastidio alla schiena', at: ago(1) } : null, pendingUnlock: c.pendingUnlock, pendingIntake: c.pendingIntake };
  }

  /* ------------------------------ routing -------------------------------- */
  function json(obj, status) {
    return Promise.resolve(new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } }));
  }
  function body(o) { try { return JSON.parse(o && o.body || '{}'); } catch (_) { return {}; } }
  var FLAGS = { coachShellV2: true, coachTodayV2: true, coachOverviewV2: false, coachImportV2: true, coachTasksV1: true, clientTimelineV1: true, clientIntelligence: true, checkInCenterV1: true, agentV1: true, schedulingV1: true, coachAnalyticsV1: true, businessV1: true, inboxV2: true, athleteBrainV1: true, mealAiV1: true, videoFormV1: true, warmupEngineV1: true, exerciseMediaV1: true };
  var ENT = { plan: 'coach_pro', planSource: 'manual', planUntil: null, seats: null, trialUntil: null, trialUsedAt: null, coachLink: null, at: iso(now) };

  function ledgerTotals() {
    var out = { allCents: 0, yearCents: 0, monthCents: 0, last30Cents: 0, count: 0, withoutAmount: 0, byMonth: [], byClient: [] };
    var months = {}, clients = {};
    var nowD = new Date(now);
    var yk = String(nowD.getFullYear()), mk = yk + '-' + String(nowD.getMonth() + 1).padStart(2, '0');
    M.payments.forEach(function (e) {
      out.count++;
      var w = new Date(e.occurredAt); var k = w.getFullYear() + '-' + String(w.getMonth() + 1).padStart(2, '0');
      var m = months[k] = months[k] || { month: k, cents: 0, count: 0 };
      var c = clients[e.clientId] = clients[e.clientId] || { clientId: e.clientId, clientName: e.clientName, cents: 0, count: 0 };
      m.count++; c.count++;
      if (e.hasAmount === false) { out.withoutAmount++; return; }
      out.allCents += e.amountCents; if (String(w.getFullYear()) === yk) out.yearCents += e.amountCents; if (k === mk) out.monthCents += e.amountCents; if (w.getTime() >= now - 30 * DAY) out.last30Cents += e.amountCents;
      m.cents += e.amountCents; c.cents += e.amountCents;
    });
    out.byMonth = Object.keys(months).sort().reverse().map(function (k) { return months[k]; });
    out.byClient = Object.keys(clients).map(function (k) { return clients[k]; }).sort(function (a, b) { return b.cents - a.cents; });
    return out;
  }

  function attention() {
    return [
      { id: 'a1', type: 'unread', severity: 'high', title: 'Alessandra Montanari-Bellini ha messaggi non letti', detail: '3 da leggere', dueAt: null, clientId: '1', clientName: 'Alessandra Montanari-Bellini', action: { view: 'coachChat', clientId: '1' } },
      { id: 'a2', type: 'payment_due', severity: 'high', title: 'Pagamento da verificare · Giulia Esposito', detail: 'Scadenza superata', dueAt: ago(6), clientId: '3', clientName: 'Giulia Esposito', action: { view: 'coachClient', clientId: '3' } },
      { id: 'a3', type: 'program_change', severity: 'high', title: 'Modifica richiesta da Francesca Lombardi', detail: 'Richiede approvazione', dueAt: null, clientId: '5', clientName: 'Francesca Lombardi', action: { view: 'coachClient', clientId: '5' } },
      { id: 'a4', type: 'leave_request', severity: 'high', title: 'Luca Bianchi chiede di chiudere', detail: 'Verifica collaborazione e pagamenti', dueAt: null, clientId: '6', clientName: 'Luca Bianchi', action: { view: 'coachClient', clientId: '6' } },
      { id: 'a5', type: 'check_in', severity: 'medium', title: 'Check-in dovuto · Alessandra Montanari-Bellini', detail: 'Richiedi o revisiona il check-in', dueAt: ago(2), clientId: '1', clientName: 'Alessandra Montanari-Bellini', action: { view: 'coachClient', clientId: '1' } },
      { id: 'a6', type: 'program_expiring', severity: 'medium', title: 'Programma in scadenza · Alessandra Montanari-Bellini', detail: 'Scade entro 7 giorni', dueAt: ahead(4), clientId: '1', clientName: 'Alessandra Montanari-Bellini', action: { view: 'coachClient', clientId: '1' } },
      { id: 'a7', type: 'inactive', severity: 'medium', title: 'Chiara Ferrari-Santoro Nardelli è inattivo', detail: 'Nessun workout negli ultimi 7 giorni', dueAt: ago(12), clientId: '7', clientName: 'Chiara Ferrari-Santoro Nardelli', action: { view: 'coachClient', clientId: '7' } }
    ];
  }

  function route(url, method, o) {
    var u = new URL(url, location.origin); var p = u.pathname; var q = u.searchParams; var m;
    if (/\/api\/account\/me$/.test(p)) return { user: { id: 'coach1', email: 'c@example.com', name: 'Giammaria Loi', provider: 'email' }, data: {}, entitlement: ENT };
    if (/\/api\/account\/(sync|data|personal-backup)/.test(p)) return { ok: true };
    if (/\/api\/coach\/status$/.test(p)) return { ok: true, unlocked: true, role: 'coach', entitlement: ENT, license: { status: 'active' }, hidePresence: false, allowVideocall: true, featureFlags: FLAGS };
    if (/\/api\/coach\/features$/.test(p)) return { ok: true, flags: FLAGS };
    if (/\/api\/coach\/today$/.test(p)) {
      var ses = M.appointments.filter(function (a) { return new Date(a.startsAt).toDateString() === new Date(now).toDateString() && a.status === 'scheduled'; }).map(function (a) { return { id: a.id, title: a.title, type: a.type, time: a.startsAt, clientName: a.clientName }; });
      return { ok: true, date: iso(now).slice(0, 10), timeZone: 'Europe/Rome', kpi: { clients: 9, activeClients: 8, unread: 4, liveNow: 1, attention: 7 }, attention: attention(), sessions: ses, tasks: M.tasks.filter(function (t) { return t.status === 'open'; }), recentActivity: [
        { id: 'e1', kind: 'message', title: 'Nuovo messaggio', clientId: '1', clientName: 'Alessandra Montanari-Bellini', at: ago(0, 1), action: { view: 'coachChat', clientId: '1' } },
        { id: 'e2', kind: 'workout_started', title: 'Workout iniziato', clientId: '4', clientName: 'Davide De Santis', at: ago(0, 1), action: { view: 'coachClient', clientId: '4' } },
        { id: 'e3', kind: 'workout_done', title: 'Workout completato', clientId: '9', clientName: 'Anna', at: ago(1), action: { view: 'coachClient', clientId: '9' } },
        { id: 'e4', kind: 'change_request', title: 'Modifica richiesta', clientId: '5', clientName: 'Francesca Lombardi', at: ago(1, 4), action: { view: 'coachClient', clientId: '5' } },
        { id: 'e5', kind: 'intake_completed', title: 'Intake completato', clientId: '8', clientName: 'Matteo Greco', at: ago(2), action: { view: 'coachClient', clientId: '8' } },
        { id: 'e6', kind: 'request_program', title: 'Scheda richiesta', clientId: '2', clientName: 'Marco Rossi', at: ago(2, 3), action: { view: 'coachClient', clientId: '2' } },
        { id: 'e7', kind: 'payment_due', title: 'Pagamento in scadenza', clientId: '3', clientName: 'Giulia Esposito', at: ago(3), action: { view: 'coachClient', clientId: '3' } }
      ] };
    }
    if (/\/api\/coach\/tasks\/reorder$/.test(p) || /\/api\/coach\/tasks\//.test(p)) return { ok: true };
    if (/\/api\/coach\/tasks$/.test(p)) return method === 'POST' ? { ok: true } : { ok: true, tasks: M.tasks };
    if (/\/api\/coach\/attention/.test(p)) return { ok: true, items: attention() };
    if (/\/api\/coach\/saved-views$/.test(p)) return { ok: true, views: [{ id: 'system:at-risk', name: 'At Risk' }, { id: 'system:no-workout-7d', name: 'No Workout 7d' }, { id: 'system:check-ins', name: 'Check-ins' }, { id: 'system:payments', name: 'Payments' }, { id: 'system:new-clients', name: 'New Clients' }] };
    if (/\/api\/coach\/clients$/.test(p) && method === 'GET') {
      var qq = (q.get('q') || '').toLowerCase(); var rows = CLIENTS.filter(function (c) { return !qq || c.displayName.toLowerCase().indexOf(qq) >= 0; });
      return { ok: true, clients: rows, seats: { limit: 20, active: 8, waiting: 1 }, total: rows.length, filter: q.get('filter') || 'all', sort: 'name', nextCursor: null, origin: 'https://app.nurvan.app' };
    }
    if (/\/api\/coach\/clients$/.test(p) && method === 'POST') { var b = body(o); return { ok: true, inviteUrl: 'https://app.nurvan.app/c/tok_new000000', inviteCode: 'NEW000', credentials: { username: (b.firstName + '.' + b.lastName).toLowerCase(), password: b.password, displayName: b.firstName + ' ' + b.lastName } }; }
    if ((m = p.match(/\/api\/coach\/clients\/(\d+)\/snapshot$/))) return snapshotFor(m[1]);
    if ((m = p.match(/\/api\/coach\/clients\/(\d+)\/overview$/))) { var c1 = CLIENTS.filter(function (x) { return x.id === m[1]; })[0]; return { ok: true, client: { id: c1.id, name: c1.displayName, username: c1.username, goal: 'Ipertrofia' }, operationalStatus: { label: 'Richiede attenzione' }, nextAction: { label: 'Rispondere ai messaggi', view: 'coachChat' }, snapshot: { weight: { current: 61.4, delta: -0.2 }, training: { programTitle: 'Ipertrofia upper/lower', weeks: 8, lastWorkoutAt: ago(1) } }, timeline: [{ type: 'w', summary: 'Workout completato', domain: 'allenamento', at: ago(1), sourceLink: { view: 'training' } }] }; }
    if ((m = p.match(/\/api\/coach\/clients\/(\d+)\/intelligence$/))) return { ok: true, formulaVersion: 'v1', derivedMetrics: { adherence: { value: 82 }, performance: { deltaPct: 3 } }, signals: [{ id: 's', severity: 'medium', title: 'Sonno sotto la media', detail: '2 su 5' }], aiInterpretation: null };
    if ((m = p.match(/\/api\/coach\/clients\/(\d+)\/events$/))) return { ok: true, events: [
      { id: 501, kind: 'message', payload: { from: 'athlete', preview: 'Ciao coach, posso spostare l\'allenamento di giovedì?' }, created_at: ago(0, 1), read_at: null },
      { id: 502, kind: 'workout_done', payload: { week: 2, day: 1, sets: 22 }, created_at: ago(1), read_at: null },
      { id: 503, kind: 'checkin_received', payload: { weight: 61.4 }, created_at: ago(2), read_at: ago(2) },
      { id: 504, kind: 'ask_coach', payload: { domain: 'alimentazione', note: 'Posso sostituire il riso con la pasta integrale a cena?' }, created_at: ago(3), read_at: null }
    ] };
    if ((m = p.match(/\/api\/coach\/clients\/(\d+)\/check-ins$/))) { var cid = m[1]; return { ok: true, template: M.template.rows ? M.template : (cid === '9' ? null : { cadence: 'weekly', weekday: 0, time: '18:00', customized: false, rows: null, since: ago(60).slice(0, 10) }), checkIns: M.checkIns.filter(function (c) { return c.clientId === cid; }).map(function (c) { return Object.assign({}, c, { scheduled_for: c.scheduledFor }); }) }; }
    if ((m = p.match(/\/api\/coach\/clients\/(\d+)\/check-in-template/))) return { ok: true, template: M.template, update: 3, keep: 1, updated: [1, 2, 3] };
    if ((m = p.match(/\/api\/coach\/clients\/(\d+)\/messages$/))) {
      if (method === 'POST') return { ok: true, message: { id: 999, from_role: 'coach', body: body(o).body || '', created_at: iso(Date.now()), read_at: null } };
      return { ok: true, messages: [
        { id: 1, from_role: 'athlete', body: 'Ciao coach! Ho finito l\'allenamento di oggi, la panca è andata bene.', thread_id: 1, created_at: ago(1, 3), read_at: ago(1) },
        { id: 2, from_role: 'coach', body: 'Perfetto Alessandra. Per la prossima volta prova ad aggiungere 2,5 kg sulla panca.', thread_id: 1, created_at: ago(1, 2), read_at: ago(1) },
        { id: 3, from_role: 'athlete', body: 'Ok! Una domanda: ho un fastidio alla spalla destra quando faccio le alzate laterali, secondo te devo fermarmi o posso continuare con meno carico e un movimento più controllato?', thread_id: 1, created_at: ago(0, 6), read_at: ago(0, 5) },
        { id: 4, from_role: 'coach', body: 'Riduci il carico e fai le alzate con presa neutra. Ti mando il PDF con gli esercizi di mobilità.', attachment: { kind: 'file', name: 'Mobilita_spalla_Alessandra_Montanari-Bellini_ottobre_2026.pdf', mime: 'application/pdf' }, thread_id: 1, created_at: ago(0, 5), read_at: null },
        { id: 5, from_role: 'athlete', body: 'Grazie mille!', thread_id: 1, created_at: ago(0, 1), read_at: null }
      ], threadId: 1, e2e: { coach: null, athlete: null } };
    }
    if (/\/api\/coach\/clients\/\d+\/e2e-keys?$/.test(p)) return { ok: true, e2e: { coach: null, athlete: null } };
    if (/\/api\/coach\/clients\/\d+\/(reset-password)$/.test(p)) return { ok: true, credentials: { username: 'x', password: body(o).password || 'forza1234' } };
    if (/\/api\/coach\/inbox-feed$/.test(p)) {
      var items = [
        { id: 'm1', kind: 'message', clientId: '1', clientName: 'Alessandra Montanari-Bellini', title: 'Alessandra Montanari-Bellini', preview: 'Grazie mille! Ho un fastidio alla spalla destra quando faccio le alzate laterali e non so se continuare', at: ago(0, 1), unread: true, pinned: true, reaction: null, href: { view: 'coachChat', clientId: '1' } },
        { id: 'k1', kind: 'ask_coach', clientId: '3', clientName: 'Giulia Esposito', title: 'Giulia Esposito · richiesta alimentazione', preview: 'Posso sostituire il riso con la pasta integrale a cena?', at: ago(0, 8), unread: true, pinned: false, reaction: null, href: { view: 'coachChat', clientId: '3' } },
        { id: 'c1', kind: 'check_in', clientId: '1', clientName: 'Alessandra Montanari-Bellini', title: 'Check-in · Alessandra Montanari-Bellini', preview: 'received', at: ago(0, 5), unread: true, pinned: false, reaction: null, href: { view: 'coachCheckIns' } },
        { id: 'm2', kind: 'message', clientId: '5', clientName: 'Francesca Lombardi', title: 'Francesca Lombardi', preview: 'Ok coach, aspetto la nuova scheda.', at: ago(1), unread: false, pinned: false, reaction: '👍', href: { view: 'coachChat', clientId: '5' } },
        { id: 'at1', kind: 'attention', clientId: '6', clientName: 'Luca Bianchi', title: 'Luca Bianchi chiede di chiudere', preview: 'Verifica collaborazione e pagamenti', at: ago(2), unread: true, pinned: false, reaction: null, href: { view: 'coachClient', clientId: '6' } }
      ];
      return { ok: true, items: items, unread: 3, checkIns: 2, attention: 1 };
    }
    if (/\/api\/coach\/inbox$/.test(p)) return { ok: true, clients: [], events: [
      { id: 601, kind: 'message', client_id: 1, created_at: ago(0, 1), display_name: 'Alessandra Montanari-Bellini', payload: { from: 'athlete', preview: 'Grazie mille!' } },
      { id: 602, kind: 'workout_done', client_id: 9, created_at: ago(1), display_name: 'Anna', payload: {} },
      { id: 603, kind: 'ask_coach', client_id: 3, created_at: ago(0, 8), display_name: 'Giulia Esposito', payload: { domain: 'alimentazione', note: 'Posso sostituire il riso?' } }
    ] };
    if (/\/api\/coach\/inbox\/(ack|dismiss)$/.test(p)) return { ok: true };
    if (/\/api\/coach\/check-ins$/.test(p)) {
      var st = q.get('status') || 'to_review'; var map = { requested: ['requested'], received: ['received'], to_review: ['received'], reviewed: ['reviewed'] }[st] || ['received'];
      return { ok: true, checkIns: M.checkIns.filter(function (c) { return map.indexOf(c.status) >= 0; }) };
    }
    if ((m = p.match(/\/api\/coach\/check-ins\/(\d+)$/))) { var ci = M.checkIns.filter(function (c) { return c.id === m[1]; })[0]; return { ok: true, checkIn: Object.assign({}, ci, { previous: { id: '90', weight: 61.6, received_at: ago(7), answers: { sleep: 4, energy: 4, hunger: 3, pain: 1, adh_nutrition: 4, adh_training: 5 }, coach_response: '' }, media: [{ id: 'med1', kind: 'front', contentType: 'image/jpeg', byteSize: 220000 }, { id: 'med2', kind: 'side', contentType: 'image/jpeg', byteSize: 210000 }, { id: 'med3', kind: 'back', contentType: 'image/jpeg', byteSize: 230000 }] }) }; }
    if (/\/api\/coach\/check-ins\/(request|\d+\/review)$/.test(p)) return { ok: true };
    if (/\/api\/media\//.test(p)) return { ok: true, token: 't', contentPath: '/api/media/x/content' };
    if (/\/api\/coach\/appointments\.ics$/.test(p)) return { __text: 'BEGIN:VCALENDAR\nEND:VCALENDAR' };
    if (/\/api\/coach\/appointments$/.test(p) && method === 'POST') { var ab = body(o); var c2 = CLIENTS.filter(function (x) { return x.id === ab.clientId; })[0]; M.appointments.push(Object.assign({ id: String(M.appointments.length + 20), status: 'scheduled', clientName: c2 ? c2.displayName : null }, ab)); return { ok: true }; }
    if ((m = p.match(/\/api\/coach\/appointments\/(\d+)$/))) { var ap = M.appointments.filter(function (x) { return x.id === m[1]; })[0]; if (ap) Object.assign(ap, body(o)); return { ok: true, appointment: ap }; }
    if (/\/api\/coach\/appointments$/.test(p)) return { ok: true, appointments: M.appointments };
    if (/\/api\/coach\/analytics$/.test(p)) return { ok: true, analytics: { clients: 9, adherence: { average: 76, atRisk: 3 }, workouts: { completed28d: 112, inactive7d: 2 }, volume: { averageTonnage: 5840 }, e1rm: { samples: 46 }, weight: { moving: 4 }, engagement: { unread: 4, liveNow: 1 }, checkIns: { due: 3, reviewed: 12 }, clientsAtRisk: [{ id: '3', name: 'Giulia Esposito', adherence: 48 }, { id: '7', name: 'Chiara Ferrari-Santoro Nardelli', adherence: 55 }, { id: '1', name: 'Alessandra Montanari-Bellini', adherence: 66 }] } };
    if (/\/api\/coach\/business$/.test(p)) return { ok: true, plans: [], events: M.payments, totals: ledgerTotals(), sessions: [{ clientId: '4', clientName: 'Davide De Santis', mode: 'presence', count: 14 }, { clientId: '4', clientName: 'Davide De Santis', mode: 'remote', count: 3 }, { clientId: '1', clientName: 'Alessandra Montanari-Bellini', mode: 'remote', count: 22 }, { clientId: '7', clientName: 'Chiara Ferrari-Santoro Nardelli', mode: 'presence', count: 9 }, { clientId: '9', clientName: 'Anna', mode: null, count: 2 }], summary: {} };
    if (/\/api\/coach\/business\/payments$/.test(p) && method === 'POST') { var pb = body(o); M.payments.unshift({ id: String(M.payments.length + 30), clientId: pb.clientId, clientName: (CLIENTS.filter(function (x) { return x.id === pb.clientId; })[0] || {}).displayName, kind: 'paid', amountCents: pb.amountCents || 0, hasAmount: pb.amountCents != null, currency: 'EUR', occurredAt: pb.occurredAt, method: pb.method, label: pb.label, note: pb.note }); return { ok: true }; }
    if (/\/api\/coach\/business\/payments\//.test(p)) return { ok: true };
    if (/\/api\/coach\/crm$/.test(p)) { var stages = ['ACTIVE', 'LEAD', 'TRIAL', 'ACTIVE', 'CHURN_RISK', 'CHURNED', 'PAUSED', 'ACTIVE', 'ACTIVE']; var acts = ['Mandare il preventivo del pacchetto trimestrale', '', 'Chiamata conoscitiva giovedì', '', 'Proporre il rinnovo con sconto', 'Chiedere feedback', '', 'Fissare check mensile', '']; return { ok: true, pipeline: CLIENTS.map(function (c, i) { return { id: c.id, name: c.displayName, stage: stages[i], source: 'Instagram', value: 150, nextAction: acts[i], paid: c.paid, nextDueAt: c.nextDueAt }; }) }; }
    if (/\/api\/coach\/automations$/.test(p) && method === 'GET') return { ok: true, rules: [{ id: '1', name: 'Crea un task quando arriva un check-in', trigger: 'check_in_received', action: 'create_task', enabled: true }, { id: '2', name: 'Avvisa se un cliente è inattivo da 7 giorni', trigger: 'inactive_7d', action: 'send_message', enabled: false }, { id: '3', name: 'Promemoria rinnovo del programma', trigger: 'program_expiring', action: 'create_task', enabled: true }] };
    if (/\/api\/coach\/automations/.test(p)) return { ok: true, preview: { action: 'create_task' }, result: {} };
    if (/\/api\/coach\/agent\/runs$/.test(p)) return { ok: true, intent: { id: 'inactive_clients' }, run: { id: 'run1', intent: 'Clienti inattivi', proposals: [{ id: 'p1', toolId: 'clients.message_inactive', summary: 'Scrivere un messaggio di richiamo a Giulia Esposito e Chiara Ferrari-Santoro Nardelli, inattive da oltre 7 giorni', why: { reasons: [{ statement: 'Nessun workout negli ultimi 7 giorni', evidence: { source: 'workout_logs', clients: 2, lastWorkoutDaysAgo: [9, 12] } }], viewData: true }, expectedRevision: 1, expectedFingerprint: 'fp', targetSet: ['3', '7'] }] } };
    if (/\/api\/coach\/agent\//.test(p)) return { ok: true, result: { sent: 2 }, runs: [], items: [] };
    if (/\/api\/coach\/preferences$/.test(p)) return { ok: true, preferences: {} };
    if (/\/api\/coach\/availability/.test(p)) return { ok: true, rules: [], slots: [] };
    if (/\/api\/coach\/warmup-templates/.test(p)) return { ok: true, templates: [] };
    if (/\/api\/coach\/broadcast\/preview$/.test(p)) return { ok: true, preview: { targetCount: 3 } };
    if (/\/api\/coach\/clients\/\d+\/(paid|revoke|remove|schedule|check-request|assign|allow-db|max-freedom|coaching-mode)/.test(p)) return { ok: true };
    if (/\/api\/(client\/ask-coach|presence\/ping|push\/|webrtc\/ice)/.test(p)) return { ok: true, iceServers: [] };
    return undefined;
  }

  window.fetch = function (u, o) {
    var url = String((u && u.url) || u || '');
    var isApi = /\/api\//.test(url);
    if (!isApi) {
      if (/nurvan\.app|onrender/.test(url)) return Promise.reject(new TypeError('offline test'));
      return realFetch.apply(this, arguments);
    }
    var method = String((o && o.method) || (u && u.method) || 'GET').toUpperCase();
    M.calls.push(method + ' ' + url.replace(/^https?:\/\/[^/]+/, '').slice(0, 120));
    var out;
    try { out = route(url, method, o); } catch (e) { M.calls.push('MOCK-ERROR ' + e.message); }
    if (out === undefined) { M.unmocked.push(method + ' ' + url.replace(/^https?:\/\/[^/]+/, '').slice(0, 120)); out = { ok: true }; }
    if (out && out.__text) return Promise.resolve(new Response(out.__text, { status: 200, headers: { 'Content-Type': 'text/calendar' } }));
    return json(out);
  };
})();
