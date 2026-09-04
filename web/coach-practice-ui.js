// ====================================================
// COACH PRACTICE UI — hub, invite, intake, client shell
// Injected after middleCore by build_master25.mjs
// ====================================================

var CLIENT_INTAKE_FIELDS = [
  { key: 'firstName', label: 'Nome', type: 'text', required: true },
  { key: 'lastName', label: 'Cognome', type: 'text', required: true },
  { key: 'sex', label: 'Sesso', type: 'select', required: true, options: ['Maschio', 'Femmina', 'Altro'] },
  { key: 'ageBand', label: 'Età', type: 'select', required: true, options: ['16-17', '18-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60+'] },
  { key: 'heightBand', label: 'Altezza', type: 'select', required: true, options: ['150-154 cm', '155-159 cm', '160-164 cm', '165-169 cm', '170-174 cm', '175-179 cm', '180-184 cm', '185-189 cm', '190-194 cm', '195-199 cm', '200+ cm'] },
  { key: 'weightBand', label: 'Peso', type: 'select', required: true, options: ['45-49 kg', '50-54 kg', '55-59 kg', '60-64 kg', '65-69 kg', '70-74 kg', '75-79 kg', '80-84 kg', '85-89 kg', '90-94 kg', '95-99 kg', '100-109 kg', '110-119 kg', '120-129 kg', '130-139 kg', '140+ kg'] },
  { key: 'trainingAge', label: 'Anzianità di allenamento', type: 'select', required: true, options: ['Mai allenato', 'Meno di 6 mesi', '6-12 mesi', '1-2 anni', '2-5 anni', 'Più di 5 anni'] },
  { key: 'level', label: 'Livello', type: 'select', required: true, options: ['Principiante', 'Intermedio', 'Avanzato', 'Agonista'] },
  { key: 'goal', label: 'Obiettivo', type: 'select', required: true, options: ['Ipertrofia', 'Forza', 'Dimagrimento', 'Ricomposizione', 'Performance sportiva', 'Salute e postura', 'Preparazione gara'] },
  { key: 'sessionsPerWeek', label: 'Sessioni a settimana', type: 'select', required: true, options: ['2', '3', '4', '5', '6 o più'] },
  { key: 'sessionMinutes', label: 'Tempo a sessione', type: 'select', required: true, options: ['30 minuti', '45 minuti', '60 minuti', '75 minuti', '90 minuti o più'] },
  { key: 'equipment', label: 'Attrezzatura', type: 'select', required: true, options: ['Palestra completa', 'Pesi liberi + panca', 'Solo macchine', 'Casa (manubri/bande)', 'Corpo libero'] },
  { key: 'splitPref', label: 'Split preferito', type: 'select', required: false, options: ['Lo decide il coach', 'Full body', 'Upper / Lower', 'Push Pull Legs', 'Distretto per giorno'] },
  { key: 'injuryPrimary', label: 'Problema fisico principale', type: 'select', required: true, options: ['Nessuno', 'Lombare', 'Cervicale', 'Ginocchia', 'Spalle', 'Gomiti', 'Polsi', 'Anche', 'Caviglie', 'Altro'] },
  { key: 'injurySecondary', label: 'Secondo distretto', type: 'select', required: false, options: ['Nessuno', 'Lombare', 'Cervicale', 'Ginocchia', 'Spalle', 'Gomiti', 'Polsi', 'Anche', 'Caviglie', 'Altro'] },
  { key: 'medicalLimit', label: 'Limiti medici', type: 'select', required: false, options: ['Nessuno', 'Infortunio in corso', 'Dolore ricorrente', 'Indicazione medica da rispettare'] },
  { key: 'jobType', label: 'Tipo di lavoro / giornata', type: 'select', required: true, options: ['Sedentario', 'In piedi', 'Lavoro fisico', 'Turni'] },
  { key: 'sleepHours', label: 'Sonno', type: 'select', required: true, options: ['Meno di 6 ore', '6-7 ore', '7-8 ore', 'Più di 8 ore'] },
  { key: 'stress', label: 'Stress', type: 'select', required: true, options: ['Basso', 'Medio', 'Alto'] }
];

var CLIENT_TUTORIAL_STEPS = [
  { t: 'La scheda arriva dal coach', d: 'Non importi PDF da solo: il tuo coach ti assegna il programma. Se non vedi nulla, chiedila dalla Home.' },
  { t: 'Allena e finalizza', d: 'Apri Allenati, registra le serie e tocca Finalizza. Così il coach vede che hai lavorato.' },
  { t: 'Chat umana', d: 'Dal tab Coach parli con la persona che ti segue, non con l’AI.' },
  { t: 'AI solo spiegazioni', d: 'Coach AI può spiegare un esercizio, un cibo o un integratore. Non può cambiare la scheda.' },
  { t: 'Check e pagamenti', d: 'Dal Menu fai il check fisico quando te lo chiede. Se un pagamento è in sospeso, lo vedi in Home.' },
  { t: 'Modifiche al programma', d: 'Puoi proporre cambiamenti. Se il coach non ha dato la massima libertà, aspetta la sua approvazione. Con massima libertà modifichi subito e il coach riceve un avviso.' }
];

function practiceApi(path) {
  try {
    if (typeof coachEndpoint === 'function') return coachEndpoint(path);
  } catch (_) {}
  return path;
}

function practiceHeaders(json) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (store && store.accountToken) h.Authorization = 'Bearer ' + store.accountToken;
  return h;
}

async function practiceFetch(path, options, timeoutMs) {
  const fetchFn = typeof apiFetch === 'function' ? apiFetch : fetch;
  const res = await fetchFn(practiceApi(path), options || {}, timeoutMs || 20000);
  if (typeof readApiJson === 'function') return readApiJson(res);
  return res.json();
}

function practiceToast(msg, kind) {
  if (typeof showToast === 'function') showToast(msg, kind || 'success');
  else try { console.log('[PRACTICE]', msg); } catch (_) {}
}

function detectInviteToken() {
  try {
    const path = String(location.pathname || '').replace(/\/+$/, '');
    const m = path.match(/\/c\/([^/?#]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
    const q = new URLSearchParams(location.search || '');
    return q.get('c') || '';
  } catch (_) { return ''; }
}

function isInAppBrowser() {
  const ua = String(navigator.userAgent || '');
  return /WhatsApp|FBAN|FBAV|Instagram|Line\/|Telegram/i.test(ua);
}

function isClientShellLocked() {
  try {
    if (typeof isAthleteRole === 'function' && isAthleteRole()) return true;
  } catch (_) {}
  return !!(store && (store.clientShell || (store.inviteToken && !store.accountToken)));
}

function fmtShortDate(v) {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (_) { return '—'; }
}

function fmtDay(v) {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('it-IT');
  } catch (_) { return '—'; }
}

function presenceLabel(online, lastSeen, liveWorkout) {
  if (liveWorkout) return 'In allenamento ora';
  if (online) return 'Online ora';
  if (lastSeen) return 'Offline · ultimo accesso ' + fmtShortDate(lastSeen);
  return 'Offline · mai visto';
}

function gatePracticeView(v) {
  if (typeof isAthleteRole === 'function' && isAthleteRole()) {
    const blocked = {
      community: 1, pricing: 1, coachHub: 1, coachClient: 1, import: 1,
      generate: 1, catalog: 1, library: 1, db: 1, programs: 1, unlock: 1
    };
    if ((v === 'programs' || v === 'db') && store.clientProfile && store.clientProfile.allowProgramDb) return v;
    if (blocked[v]) return 'home';
    return v;
  }
  if (store && store.coachSessionActive && !store.coachAssigning) {
    const coachCore = { coachHub: 1, coachClient: 1, coachChat: 1 };
    const clientDomains = { training: 1, nutrition: 1, supplements: 1, therapy: 1, exams: 1, stats: 1, athlete: 1 };
    if (coachCore[v]) return v;
    if (store.coachViewingClient && clientDomains[v]) return v;
  }
  return v;
}

function applyClientChrome() {
  try {
    const athlete = typeof isAthleteRole === 'function' && isAthleteRole();
    const unlocked = typeof isCoachUnlocked === 'function' && isCoachUnlocked();
    const coachSession = !!(store && store.coachSessionActive && !athlete);
    if (document.body) {
      document.body.classList.toggle('role-athlete', !!athlete);
      document.body.classList.toggle('coach-unlocked', !!unlocked);
      document.body.classList.toggle('coach-session', !!coachSession);
      document.body.classList.toggle('coach-viewing-client', !!(store && store.coachViewingClient));
    }
    const stats = typeof $ === 'function' ? $('nav-stats') : document.getElementById('nav-stats');
    const ai = typeof $ === 'function' ? $('nav-ai') : document.getElementById('nav-ai');
    if (stats) {
      const span = stats.querySelector('span');
      if (athlete) {
        if (span) span.textContent = 'COACH';
        stats.onclick = function (event) { navigate('clientChat', event); };
      } else if (coachSession) {
        if (span) span.textContent = 'HUB';
        stats.onclick = function (event) { navigate('coachHub', event); };
      } else {
        if (span) span.textContent = 'STATS';
        stats.onclick = function (event) { navigate('stats', event); };
      }
    }
    if (ai) ai.style.display = (athlete || coachSession) ? 'none' : '';
    document.querySelectorAll('[data-hub="full"]').forEach(function (el) {
      el.style.display = (athlete || coachSession) ? 'none' : '';
    });
    document.querySelectorAll('[data-hub="coach"]').forEach(function (el) {
      el.style.display = athlete ? 'none' : 'flex';
    });
    const coachBtn = document.getElementById('coach-unlock-button');
    if (coachBtn) {
      coachBtn.style.display = athlete ? 'none' : '';
      if (coachSession) coachBtn.textContent = 'ESCI COACH';
      else coachBtn.textContent = unlocked ? 'HUB COACH' : 'SBLOCCA COACH';
      coachBtn.onclick = function () {
        if (coachSession) exitCoachSession();
        else openCoachOrUnlock();
      };
    }
    if (athlete) {
      document.querySelectorAll('button').forEach(function (btn) {
        const tx = String(btn.textContent || '');
        if (/CHIEDI A COACH AI/i.test(tx)) btn.textContent = tx.replace(/CHIEDI A COACH AI(?:\s*\([^)]+\))?/i, 'CHIEDI AL COACH');
      });
      // Block free-account entry points
      const acc = document.getElementById('account-button');
      if (acc) {
        acc.textContent = 'ESCI CLIENT';
        acc.onclick = function () { logoutAccount(); };
      }
    }
    document.querySelectorAll('[data-hub="athlete"]').forEach(function (el) {
      el.style.display = athlete ? 'flex' : 'none';
    });
    document.querySelectorAll('[data-hub="programs"]').forEach(function (el) {
      const allow = !athlete || (store.clientProfile && store.clientProfile.allowProgramDb);
      el.style.display = (allow && !coachSession) ? '' : 'none';
    });
    ensureCoachSessionBanner();
    ensureClientViewBanner();
  } catch (err) {
    console.warn('[CLIENT_CHROME]', err);
  }
}

function ensureCoachSessionBanner() {
  let bar = document.getElementById('cp-coach-session-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'cp-coach-session-bar';
    bar.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;z-index:10060;background:#111;border-bottom:1px solid var(--gold);padding:8px 12px;font-size:11px;';
    document.body.appendChild(bar);
  }
  if (!(store && store.coachSessionActive) || (typeof isAthleteRole === 'function' && isAthleteRole())) {
    bar.style.display = 'none';
    document.body.style.paddingTop = '';
    return;
  }
  bar.style.display = 'block';
  document.body.style.paddingTop = '42px';
  bar.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">' +
    '<span style="color:var(--gold);font-weight:800;">SESSIONE COACH</span>' +
    '<span style="color:#aaa;flex:1;">Hub clienti separato dall’app personale</span>' +
    '<button class="btn btn-outline" style="font-size:10px;padding:6px 8px;" onclick="exitCoachSession()">ESCI</button></div>';
}

function ensureClientViewBanner() {
  let bar = document.getElementById('cp-client-view-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'cp-client-view-bar';
    // Top bar so it never covers chat composer
    bar.style.cssText = 'display:none;position:fixed;left:8px;right:8px;top:8px;z-index:10075;background:#111;border:1px solid var(--gold);border-radius:12px;padding:10px;max-height:42vh;overflow:auto;box-shadow:0 8px 24px rgba(0,0,0,.45);';
    document.body.appendChild(bar);
  }
  if (!(store && store.coachViewingClient && store.coachWorkspace && store.coachWorkspace.clientId)) {
    bar.style.display = 'none';
    document.body.classList.remove('cp-has-client-bar');
    return;
  }
  if (store.coachAssigning || currentView === 'coachChat') {
    bar.style.display = 'none';
    document.body.classList.remove('cp-has-client-bar');
    return;
  }
  const name = (store.coachWorkspace.client && store.coachWorkspace.client.displayName) || 'cliente';
  const live = store.coachWorkspace.client && store.coachWorkspace.client.workoutLive;
  bar.style.display = 'block';
  document.body.classList.add('cp-has-client-bar');
  bar.innerHTML = '<div style="font-size:11px;color:var(--gold);font-weight:800;margin-bottom:6px;">MASTER · DATI DI ' + esc(name) + (live ? ' · IN WORKOUT' : '') + '</div>' +
    '<div style="font-size:11px;color:#aaa;margin-bottom:8px;">Controlli e verifichi · alcuni campi solo lettura + commento.</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'training\')">ALLENAMENTO</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'nutrition\')">ALIMENTAZIONE</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'supplements\')">INTEGRAZIONE</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'therapy\')">TERAPIA</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'exams\')">ESAMI</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'stats\')">STATS</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="openCoachClientChat(\'' + esc(store.coachWorkspace.clientId) + '\')">CHAT</button>' +
    '<button class="btn btn-primary" style="font-size:10px;" onclick="pushCoachClientEdits()">SALVA MODIFICHE</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="leaveCoachClientView()">TORNA ALLA SCHEDA</button></div>';
}

function ensurePracticeStyle() {
  if (document.getElementById('coach-practice-style')) return;
  const s = document.createElement('style');
  s.id = 'coach-practice-style';
  s.textContent = [
    '.cp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:10070;display:none;align-items:center;justify-content:center;padding:16px;}',
    '.cp-panel{background:#0d0d0d;border:1px solid var(--gold);border-radius:14px;max-width:520px;width:100%;max-height:92vh;overflow:auto;padding:16px;}',
    '.cp-panel h2{color:var(--gold);font-size:16px;margin:0 0 8px;}',
    '.cp-help{font-size:12px;color:#aaa;line-height:1.45;margin:0 0 12px;}',
    '.cp-field{margin-bottom:10px;}',
    '.cp-field label{display:block;font-size:10px;color:#888;font-weight:800;margin-bottom:4px;}',
    '.cp-field input,.cp-field select{width:100%;padding:10px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;}',
    '.cp-mode{display:flex;gap:8px;margin-bottom:12px;}',
    '.cp-mode button{flex:1;font-size:11px;padding:10px 8px;line-height:1.3;}',
    '.cp-badge{font-size:9px;padding:3px 6px;border-radius:4px;border:1px solid #444;color:#ccc;margin-left:6px;}',
    '.cp-row{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid #222;}',
    '.cp-msg{padding:8px 10px;border-radius:8px;margin:6px 0;font-size:12px;line-height:1.4;}',
    '.cp-msg.me{background:#1a1608;border:1px solid rgba(212,175,55,.35);}',
    '.cp-msg.them{background:#151515;border:1px solid #333;}',
    '.cp-msg img{max-width:100%;border-radius:8px;margin-top:6px;}',
    '.cp-chat-tools{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}',
    '.cp-assign-bar{position:fixed;left:8px;right:8px;bottom:72px;z-index:10080;background:#111;border:1px solid var(--gold);border-radius:12px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,.45);}',
    '.cp-pw-row{display:flex;gap:6px;align-items:center;}',
    '.cp-pw-row input{flex:1;}',
    'body.cp-has-client-bar #app,body.cp-has-client-bar .main,body.cp-has-client-bar #content{padding-top:118px !important;}',
    '.cp-cal-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}',
    '.cp-cal-grid select{width:100%;padding:12px 8px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;font-size:14px;font-weight:700;}',
    '.cp-exam-cat{margin:10px 0;border:1px solid #222;border-radius:10px;padding:8px;}',
    '.cp-exam-cat h4{margin:0 0 6px;font-size:11px;color:var(--gold);}',
    '.cp-exam-item{display:flex;gap:8px;align-items:center;font-size:12px;color:#ddd;padding:4px 0;}',
    '#cp-call-overlay{position:fixed;inset:0;z-index:10120;background:#050505;display:none;flex-direction:column;}',
    '#cp-call-overlay.active{display:flex;}',
    '#cp-call-overlay video{width:100%;background:#000;object-fit:cover;}',
    '#cp-call-local{position:absolute;right:12px;top:72px;width:112px;height:150px;border-radius:10px;border:1px solid var(--gold);z-index:2;}'
  ].join('');
  document.head.appendChild(s);
}

function ensurePracticeOverlays() {
  if (document.getElementById('cp-invite')) return;
  const wrap = document.createElement('div');
  wrap.id = 'coach-practice-overlays';
  wrap.innerHTML = [
    '<div id="cp-invite" class="cp-overlay"><div class="cp-panel" id="cp-invite-panel"></div></div>',
    '<div id="cp-intake" class="cp-overlay"><div class="cp-panel" id="cp-intake-panel"></div></div>',
    '<div id="cp-tutorial" class="cp-overlay"><div class="cp-panel" id="cp-tutorial-panel"></div></div>',
    '<div id="cp-demo" class="cp-overlay"><div class="cp-panel" id="cp-demo-panel"></div></div>',
    '<div id="cp-add" class="cp-overlay"><div class="cp-panel" id="cp-add-panel"></div></div>',
    '<div id="cp-assign" class="cp-overlay"><div class="cp-panel" id="cp-assign-panel"></div></div>'
  ].join('');
  document.body.appendChild(wrap);
}

function showOverlay(id, on) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = on ? 'flex' : 'none';
  if (typeof pushUiOverlay === 'function' && on) pushUiOverlay(id);
  if (typeof popUiOverlay === 'function' && !on) popUiOverlay(id);
}

function intakeFormHtml(prefix, values, opts) {
  opts = opts || {};
  values = values || {};
  const skipName = !!opts.skipName;
  return CLIENT_INTAKE_FIELDS.filter(function (f) {
    return !(skipName && (f.key === 'firstName' || f.key === 'lastName'));
  }).map(function (f) {
    const id = prefix + '-' + f.key;
    const val = values[f.key] || '';
    const req = f.required ? ' *' : '';
    if (f.type === 'text') {
      return '<div class="cp-field"><label for="' + id + '">' + f.label + req + '</label>' +
        '<input id="' + id + '" type="text" value="' + esc(val) + '" autocomplete="name"></div>';
    }
    const optsHtml = '<option value="">Seleziona…</option>' + f.options.map(function (o) {
      return '<option value="' + esc(o) + '"' + (val === o ? ' selected' : '') + '>' + esc(o) + '</option>';
    }).join('');
    return '<div class="cp-field"><label for="' + id + '">' + f.label + req + '</label>' +
      '<select id="' + id + '">' + optsHtml + '</select></div>';
  }).join('');
}

function readIntakeForm(prefix) {
  const out = {};
  CLIENT_INTAKE_FIELDS.forEach(function (f) {
    const el = document.getElementById(prefix + '-' + f.key);
    if (el) out[f.key] = String(el.value || '').trim();
  });
  return out;
}

function intakeFormMissing(data) {
  return CLIENT_INTAKE_FIELDS.filter(function (f) {
    return f.required && !data[f.key];
  }).map(function (f) { return f.label; });
}

async function copyOrShare(text, label) {
  try {
    if (navigator.share) {
      const payload = { title: label || 'Nurvan', text: text };
      if (/^https?:\/\//i.test(text) && text.indexOf('\n') < 0) payload.url = text;
      await navigator.share(payload);
      return;
    }
  } catch (_) {}
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      practiceToast('Copiato', 'success');
      return;
    }
  } catch (_) {}
  try { prompt(label || 'Copia', text); } catch (_) {}
}

function enqueueClientOutbox(item) {
  if (!store.clientOutbox) store.clientOutbox = [];
  store.clientOutbox.push(Object.assign({ id: 'ob_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), at: Date.now() }, item));
  if (typeof persist === 'function') persist();
}

async function flushClientOutbox() {
  if (!store || !store.accountToken || !Array.isArray(store.clientOutbox) || !store.clientOutbox.length) return;
  const left = [];
  for (let i = 0; i < store.clientOutbox.length; i++) {
    const it = store.clientOutbox[i];
    try {
      if (it.type === 'workout-ping') await practiceFetch('/api/client/workout-ping', { method: 'POST', headers: practiceHeaders(true), body: '{}' });
      else if (it.type === 'message') await practiceFetch('/api/client/messages', { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ body: it.body, attachment: it.attachment || null }) });
      else if (it.type === 'request-program') await practiceFetch('/api/client/request-program', { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ note: it.note || '' }) });
      else if (it.type === 'ask-coach') await practiceFetch('/api/client/ask-coach', { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ domain: it.domain || 'general', note: it.note || '' }) });
      else if (it.type === 'change-request') await practiceFetch('/api/client/change-request', { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ summary: it.summary || '', data: it.data || {} }) });
      else if (it.type === 'change-notice') await practiceFetch('/api/client/change-notice', { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ summary: it.summary || '', data: it.data || {} }) });
    } catch (_) { left.push(it); }
  }
  store.clientOutbox = left;
  if (typeof persist === 'function') persist();
}

function renderInvitePanel(info) {
  const p = document.getElementById('cp-invite-panel');
  if (!p) return;
  const inApp = isInAppBrowser();
  p.innerHTML = '<div style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1px;">INVITO COACH</div>' +
    '<h2>Ciao' + (info && info.displayName ? ', ' + esc(info.displayName) : '') + '</h2>' +
    '<p class="cp-help">Ti segue <b style="color:#fff;">' + esc((info && info.coachName) || 'il tuo coach') + '</b>. Accedi con nome utente e password che ti ha dato. Un solo link, su qualsiasi telefono.</p>' +
    (info && info.intakeMode === 'new' ? '<p class="cp-help">Al primo accesso compilerai un questionario di acquisizione (menu a tendina).</p>' : '<p class="cp-help">Il coach ha già le tue informazioni: entri subito in app.</p>') +
    (inApp ? '<p class="cp-help">Puoi già accedere da qui. Per installare Nurvan sulla Home, apri il link in Safari o Chrome.</p>' : '') +
    '<div class="cp-field"><label>Nome utente</label><input id="cp-login-user" type="text" autocomplete="username" value="' + esc((info && info.username) || '') + '"></div>' +
    '<div class="cp-field"><label>Password</label><div class="cp-pw-row"><input id="cp-login-pass" type="password" autocomplete="current-password">' +
    '<button class="btn btn-outline" type="button" style="font-size:10px;padding:8px 10px;" onclick="toggleClientLoginPassword()">MOSTRA</button></div></div>' +
    '<label style="display:flex;gap:8px;align-items:center;font-size:12px;color:#ccc;margin:8px 0;"><input id="cp-login-stay" type="checkbox" checked> Resta connesso</label>' +
    '<div id="cp-invite-status" class="cp-help"></div>' +
    '<button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="submitClientInviteLogin()">ACCEDI</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="requestClientPasswordHelp()">RICHIEDI RECUPERO PASSWORD AL COACH</button>' +
    '<p class="cp-help" style="margin-top:12px;">Questo link apre solo lo spazio cliente Nurvan collegato al coach. Non è l’app completa.</p>';
}

async function showClientInvite(token) {
  ensurePracticeStyle();
  ensurePracticeOverlays();
  const t = token || store.inviteToken || detectInviteToken();
  if (!t) return;
  store.inviteToken = t;
  let info = { username: '', displayName: '', coachName: 'Coach', intakeMode: 'new' };
  try {
    info = await practiceFetch('/api/client/invite/' + encodeURIComponent(t), { method: 'GET' }, 15000);
  } catch (err) {
    info.error = err && err.message;
  }
  renderInvitePanel(info);
  showOverlay('cp-invite', true);
}

async function submitClientInviteLogin() {
  const status = document.getElementById('cp-invite-status');
  const username = (document.getElementById('cp-login-user') && document.getElementById('cp-login-user').value || '').trim();
  const password = (document.getElementById('cp-login-pass') && document.getElementById('cp-login-pass').value) || '';
  if (!username || password.length < 4) {
    if (status) status.textContent = 'Inserisci nome utente e password.';
    return;
  }
  if (status) status.textContent = 'Accesso…';
  try {
    const payload = await practiceFetch('/api/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: store.inviteToken, username: username, password: password })
    }, 20000);
    if (!payload || !payload.token) throw new Error((payload && payload.error) || 'Accesso non riuscito.');
    const stayEl = document.getElementById('cp-login-stay');
    store.stayLoggedIn = !(stayEl && stayEl.checked === false);
    store.accountToken = payload.token;
    store.accountUser = payload.user;
    store.role = 'athlete';
    store.clientShell = true;
    store.clientProfile = payload.client || null;
    try {
      localStorage.setItem('GS_CLIENT_SHELL', JSON.stringify({
        inviteToken: store.inviteToken,
        locked: true,
        at: Date.now()
      }));
    } catch (_) {}
    try {
      if (store.stayLoggedIn) sessionStorage.removeItem('GS_SESSION_AUTH');
      else sessionStorage.setItem('GS_SESSION_AUTH', JSON.stringify({
        token: payload.token, user: payload.user, role: 'athlete', inviteToken: store.inviteToken, clientShell: true
      }));
    } catch (_) {}
    if (typeof persist === 'function') persist();
    showOverlay('cp-invite', false);
    requestNotifyPermission();
    try { await syncAccountData(true); } catch (_) {}
    applyClientChrome();
    if (payload.client && payload.client.needIntake) showClientIntake(payload.client.intake || { firstName: '', lastName: '' });
    else showClientTutorial(false);
    if (typeof render === 'function') render();
    practiceToast('Bentornato, ' + (payload.user && payload.user.name || username), 'success');
    startPresenceHeartbeat();
  } catch (err) {
    if (status) status.textContent = (err && err.message) || 'Accesso non riuscito.';
  }
}

function showClientIntake(prefill) {
  ensurePracticeStyle();
  ensurePracticeOverlays();
  const p = document.getElementById('cp-intake-panel');
  if (!p) return;
  const data = prefill || (store.clientProfile && store.clientProfile.intake) || {};
  p.innerHTML = '<div style="font-size:10px;color:var(--gold);font-weight:800;">ACQUISIZIONE</div>' +
    '<h2>Questionario iniziale</h2>' +
    '<p class="cp-help">Compila tutti i campi. Nome e cognome a mano; il resto è a tendina. Serve al coach per impostare la scheda.</p>' +
    '<div id="cp-intake-fields">' + intakeFormHtml('cpi', data) + '</div>' +
    '<div id="cp-intake-status" class="cp-help"></div>' +
    '<button class="btn btn-primary" style="width:100%;" onclick="submitClientIntake()">INVIA AL COACH</button>';
  showOverlay('cp-intake', true);
}

async function submitClientIntake() {
  const status = document.getElementById('cp-intake-status');
  const intake = readIntakeForm('cpi');
  const missing = intakeFormMissing(intake);
  if (missing.length) {
    if (status) status.textContent = 'Manca: ' + missing.join(', ');
    return;
  }
  if (status) status.textContent = 'Invio…';
  try {
    const payload = await practiceFetch('/api/client/intake', {
      method: 'POST',
      headers: practiceHeaders(true),
      body: JSON.stringify({ intake: intake })
    }, 20000);
    store.clientProfile = payload.client || store.clientProfile;
    if (payload.profile) store.profile = Object.assign({}, store.profile || {}, payload.profile);
    if (typeof persist === 'function') persist();
    showOverlay('cp-intake', false);
    showClientTutorial(false);
    practiceToast('Questionario inviato', 'success');
    if (typeof render === 'function') render();
  } catch (err) {
    if (status) status.textContent = (err && err.message) || 'Invio non riuscito.';
  }
}

function showClientTutorial(force) {
  if (!force && store.clientTutorialDone) return;
  ensurePracticeStyle();
  ensurePracticeOverlays();
  const p = document.getElementById('cp-tutorial-panel');
  if (!p) return;
  window.__cpTutStep = 0;
  drawClientTutorial();
  showOverlay('cp-tutorial', true);
}

function drawClientTutorial() {
  const p = document.getElementById('cp-tutorial-panel');
  if (!p) return;
  const i = window.__cpTutStep || 0;
  const step = CLIENT_TUTORIAL_STEPS[i] || CLIENT_TUTORIAL_STEPS[0];
  p.innerHTML = '<div style="font-size:10px;color:var(--gold);font-weight:800;">GUIDA ' + (i + 1) + '/5</div>' +
    '<h2>' + esc(step.t) + '</h2>' +
    '<p class="cp-help">' + esc(step.d) + '</p>' +
    '<div style="display:flex;gap:8px;">' +
    (i > 0 ? '<button class="btn btn-outline" style="flex:1;" onclick="window.__cpTutStep--;drawClientTutorial()">INDIETRO</button>' : '') +
    (i < CLIENT_TUTORIAL_STEPS.length - 1
      ? '<button class="btn btn-primary" style="flex:1;" onclick="window.__cpTutStep++;drawClientTutorial()">AVANTI</button>'
      : '<button class="btn btn-primary" style="flex:1;" onclick="closeClientTutorial()">HO CAPITO</button>') +
    '</div>';
}

function closeClientTutorial() {
  store.clientTutorialDone = true;
  if (typeof persist === 'function') persist();
  showOverlay('cp-tutorial', false);
}

function openCoachOrUnlock() {
  if (typeof isCoachUnlocked === 'function' && isCoachUnlocked()) enterCoachSession();
  else showDemoUnlock();
}

function enterCoachSession() {
  store.coachSessionActive = true;
  store.coachViewingClient = false;
  if (typeof persist === 'function') persist();
  requestNotifyPermission();
  applyClientChrome();
  navigate('coachHub');
}

function exitCoachSession(force) {
  if (!force && !confirm('Uscire dall’hub Coach? Tornerai all’app personale Nurvan.')) return false;
  if (store.coachAssigning) {
    practiceToast('Prima completa o annulla l’assegnazione.', 'warning');
    return false;
  }
  if (store.coachViewingClient) leaveCoachClientView(true);
  store.coachSessionActive = false;
  store.coachWorkspace = null;
  if (typeof persist === 'function') persist();
  applyClientChrome();
  navigate('home');
  practiceToast('Sessione Coach chiusa', 'success');
  return true;
}

function applyClientPayloadToLocal(payload) {
  payload = payload || {};
  const prog = payload.activeProgram || payload;
  try {
    DATA = (typeof normalizeProgram === 'function' && prog && prog.weeks)
      ? normalizeProgram(prog)
      : (prog && typeof prog === 'object' ? prog : { title: 'Cliente', weeks: [] });
  } catch (_) {
    DATA = { title: 'Cliente', weeks: [] };
  }
  store.activeProgram = DATA;
  store.activeProgramId = (DATA && DATA.id) || ('client_view_' + Date.now());
  store.nutrition = payload.nutrition || (DATA && DATA.nutrition) || null;
  store.supplementation = payload.supplementation || (DATA && DATA.supplementation) || null;
  store.therapy = payload.therapy || (DATA && DATA.therapy) || null;
  store.exams = payload.exams || (DATA && DATA.exams) || null;
  store.data = payload.data && typeof payload.data === 'object' ? JSON.parse(JSON.stringify(payload.data)) : {};
  store.customSets = payload.customSets && typeof payload.customSets === 'object' ? JSON.parse(JSON.stringify(payload.customSets)) : {};
  store.subs = payload.subs && typeof payload.subs === 'object' ? JSON.parse(JSON.stringify(payload.subs)) : {};
  store.skips = payload.skips && typeof payload.skips === 'object' ? JSON.parse(JSON.stringify(payload.skips)) : {};
  store.logs = Array.isArray(payload.logs) ? JSON.parse(JSON.stringify(payload.logs)) : [];
  store.nutritionDaily = payload.nutritionDaily && typeof payload.nutritionDaily === 'object' ? JSON.parse(JSON.stringify(payload.nutritionDaily)) : {};
  store.bw = payload.bw && typeof payload.bw === 'object' ? JSON.parse(JSON.stringify(payload.bw)) : {};
  store.exMuscle = payload.exMuscle && typeof payload.exMuscle === 'object' ? JSON.parse(JSON.stringify(payload.exMuscle)) : {};
  store.loadTypes = payload.loadTypes && typeof payload.loadTypes === 'object' ? JSON.parse(JSON.stringify(payload.loadTypes)) : {};
  store.tempos = payload.tempos && typeof payload.tempos === 'object' ? JSON.parse(JSON.stringify(payload.tempos)) : {};
  store.bonus = payload.bonus && typeof payload.bonus === 'object' ? JSON.parse(JSON.stringify(payload.bonus)) : {};
  if (payload.profile && typeof payload.profile === 'object') {
    store.profile = Object.assign({}, store.profile || {}, payload.profile);
  }
  if (DATA) {
    DATA.nutrition = store.nutrition;
    DATA.supplementation = store.supplementation;
    DATA.therapy = store.therapy;
    DATA.exams = store.exams;
    if (payload.profile) DATA.profile = payload.profile;
  }
  try {
    const last = (store.logs || []).slice().reverse().find(function (l) { return l && (l.week || l.day != null); });
    if (last) {
      currentWeek = Number(last.week) || 1;
      currentDay = Number(last.day) || 0;
    } else {
      currentWeek = 1;
      currentDay = 0;
    }
  } catch (_) {
    currentWeek = 1;
    currentDay = 0;
  }
}

async function enterCoachClientView(domain) {
  const id = store.coachWorkspace && store.coachWorkspace.clientId;
  if (!id) return;
  if (typeof withBusy === 'function') {
    await withBusy(async function () {
      if (!window.__cpCoachViewBackup) window.__cpCoachViewBackup = snapshotCoachMaster();
      let data = store.coachWorkspace.data;
      const snap = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/snapshot', { method: 'GET', headers: practiceHeaders(false) }, 25000);
      data = snap.data || data || {};
      store.coachWorkspace.data = data;
      store.coachWorkspace.client = snap.client || store.coachWorkspace.client;
      store.coachWorkspace.intake = snap.intake || store.coachWorkspace.intake;
      applyClientPayloadToLocal(data);
    }, 'Carico dati cliente…', { immediate: true });
  } else {
    if (!window.__cpCoachViewBackup) window.__cpCoachViewBackup = snapshotCoachMaster();
    try {
      const snap = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/snapshot', { method: 'GET', headers: practiceHeaders(false) }, 25000);
      store.coachWorkspace.data = snap.data || {};
      store.coachWorkspace.client = snap.client || store.coachWorkspace.client;
      applyClientPayloadToLocal(snap.data || {});
    } catch (_) { applyClientPayloadToLocal(store.coachWorkspace.data || {}); }
  }
  store.coachViewingClient = true;
  store.coachSessionActive = true;
  if (typeof persist === 'function') persist();
  ensureClientViewBanner();
  startClientLivePoll();
  navigate(domain || 'training');
  practiceToast('Stai vedendo i dati del cliente', 'success');
}

function startClientLivePoll() {
  stopClientLivePoll();
  window.__cpClientLiveTimer = setInterval(async function () {
    if (!(store && store.coachViewingClient && store.coachWorkspace && store.coachWorkspace.clientId)) return;
    try {
      const id = store.coachWorkspace.clientId;
      const snap = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/snapshot', { method: 'GET', headers: practiceHeaders(false) }, 12000);
      const data = snap.data || {};
      store.coachWorkspace.data = data;
      store.coachWorkspace.client = snap.client || store.coachWorkspace.client;
      // Refresh live maps without resetting week/day unless workout finished
      if (data.data) store.data = JSON.parse(JSON.stringify(data.data));
      if (Array.isArray(data.logs)) store.logs = JSON.parse(JSON.stringify(data.logs));
      if (data.nutritionDaily) store.nutritionDaily = JSON.parse(JSON.stringify(data.nutritionDaily));
      if (data.subs) store.subs = JSON.parse(JSON.stringify(data.subs));
      if (snap.client && snap.client.workoutLive && typeof render === 'function' && (currentView === 'training' || currentView === 'stats')) {
        render();
      }
    } catch (_) {}
  }, 4000);
}

function stopClientLivePoll() {
  if (window.__cpClientLiveTimer) {
    clearInterval(window.__cpClientLiveTimer);
    window.__cpClientLiveTimer = null;
  }
}

async function leaveCoachClientView(silent) {
  stopClientLivePoll();
  if (window.__cpCoachViewBackup) {
    await restoreCoachMaster(window.__cpCoachViewBackup);
    window.__cpCoachViewBackup = null;
  }
  store.coachViewingClient = false;
  if (typeof persist === 'function') persist();
  ensureClientViewBanner();
  if (!silent) {
    const id = store.coachWorkspace && store.coachWorkspace.clientId;
    if (id) navigate('coachClient');
    else navigate('coachHub');
  }
}

function showDemoUnlock() {
  if (!store.accountToken) {
    practiceToast('Accedi al tuo account Nurvan per sbloccare Coach.', 'warning');
    if (typeof openAccount === 'function') openAccount();
    return;
  }
  if (typeof isAthleteRole === 'function' && isAthleteRole()) {
    practiceToast('Un account atleta non può sbloccare Coach.', 'warning');
    return;
  }
  ensurePracticeStyle();
  ensurePracticeOverlays();
  const p = document.getElementById('cp-demo-panel');
  p.innerHTML = '<div style="font-size:10px;color:var(--gold);font-weight:800;">SBLOCCO DEMO</div>' +
    '<h2>Modalità Coach</h2>' +
    '<p class="cp-help">Per provare l’hub Coach completa il checkout demo (carta finta, addebito 0,00 €). Lo stesso tasto servirà dopo per il pagamento vero.</p>' +
    '<div class="cp-field"><label>Intestatario</label><input value="Giammaria Loi" readonly></div>' +
    '<div class="cp-field"><label>Carta</label><input value="4242 4242 4242 4242" readonly></div>' +
    '<div style="display:flex;gap:8px;"><div class="cp-field" style="flex:1;"><label>Scadenza</label><input value="12/29" readonly></div>' +
    '<div class="cp-field" style="flex:1;"><label>CVC</label><input value="123" readonly></div></div>' +
    '<button class="btn btn-primary" style="width:100%;" onclick="confirmDemoUnlock()">PAGA 0,00 € E SBLOCCA</button>' +
    '<div id="cp-demo-status" class="cp-help" style="margin-top:8px;"></div>' +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="showOverlay(\'cp-demo\', false)">ANNULLA</button>';
  showOverlay('cp-demo', true);
}

async function confirmDemoUnlock() {
  const status = document.getElementById('cp-demo-status');
  if (status) status.textContent = 'Pagamento in corso…';
  try {
    const payload = await practiceFetch('/api/coach/unlock/demo', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 20000);
    if (!payload || !payload.ok) throw new Error((payload && payload.error) || 'Sblocco non riuscito.');
    store.coachUnlocked = true;
    store.coachSessionActive = true;
    if (typeof persist === 'function') persist();
    requestNotifyPermission();
    showOverlay('cp-demo', false);
    applyClientChrome();
    practiceToast('Pagamento ricevuto. Modalità Coach sbloccata.', 'success');
    navigate('coachHub');
  } catch (err) {
    const raw = String((err && err.message) || '');
    const msg = /404|not found|failed/i.test(raw)
      ? 'Il server sta ancora aggiornando lo sblocco. Riprova tra un minuto.'
      : (raw || 'Sblocco non riuscito.');
    if (status) status.textContent = msg;
    practiceToast(msg, 'danger');
  }
}

function renderCoachUnlockCardHtml() {
  if (typeof isAthleteRole === 'function' && isAthleteRole()) return '';
  if (typeof isCoachUnlocked === 'function' && isCoachUnlocked()) {
    return '<div class="card" style="border:1px solid var(--gold);margin-bottom:14px;padding:12px;">' +
      '<div style="font-size:13px;font-weight:900;color:var(--gold);margin-bottom:6px;">Modalità Coach</div>' +
      '<p style="font-size:11px;color:#aaa;margin:0 0 10px;">Hub clienti, inviti e chat umana.</p>' +
      '<button class="btn btn-primary" style="width:100%;font-size:11px;" onclick="navigate(\'coachHub\')">APRI HUB COACH</button></div>';
  }
  return '<div class="card" style="border:1px solid var(--gold);margin-bottom:14px;padding:12px;">' +
    '<div style="font-size:13px;font-weight:900;color:var(--gold);margin-bottom:6px;">Diventa Coach</div>' +
    '<p style="font-size:11px;color:#aaa;margin:0 0 10px;">Sblocca l’hub per seguire i clienti. Per ora il pagamento è demo.</p>' +
    '<button class="btn btn-primary" style="width:100%;font-size:11px;" onclick="showDemoUnlock()">SBLOCCA MODALITÀ COACH</button></div>';
}

function injectCoachUnlockInto(container) {
  if (!container || container.querySelector('[data-cp-unlock]')) return;
  const html = renderCoachUnlockCardHtml();
  if (!html) return;
  const hold = document.createElement('div');
  hold.setAttribute('data-cp-unlock', '1');
  hold.innerHTML = html;
  const cards = container.querySelectorAll('.card');
  if (cards.length >= 2) cards[1].insertAdjacentElement('afterend', hold);
  else container.insertBefore(hold, container.firstChild);
}

function athleteWaitingHomeHtml() {
  const due = (store.clientEvents || []).some(function (e) { return e && e.kind === 'payment_due' && !e.read_at; });
  const check = (store.clientEvents || []).some(function (e) { return e && e.kind === 'check_request' && !e.read_at; });
  return '<div class="card" style="border:2px solid var(--gold);padding:22px;text-align:center;">' +
    '<div style="font-size:18px;font-weight:900;color:var(--gold);margin-bottom:8px;">In attesa della scheda</div>' +
    '<p style="font-size:12px;color:#aaa;line-height:1.5;margin-bottom:16px;">Il tuo coach ti assegna il programma. Se tarda, chiedila da qui.</p>' +
    (due ? '<p style="font-size:12px;color:#f6c;margin-bottom:10px;">Pagamento in sospeso: scrivi al coach.</p>' : '') +
    (check ? '<p style="font-size:12px;color:var(--gold);margin-bottom:10px;">Il coach ha chiesto un check fisico.</p>' : '') +
    '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="requestProgramFromCoach()">CHIEDI LA SCHEDA</button>' +
    '<button class="btn btn-outline" style="width:100%;" onclick="navigate(\'clientChat\')">SCRIVI AL COACH</button></div>';
}

function athleteHomeModulesHtml() {
  return '<div class="card" style="margin-top:12px;"><div class="card-header"><h2>Menu</h2></div>' +
    '<div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:10px;">' +
    '<button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate(\'nutrition\')"><span style="font-size:18px;">🥗</span><span style="font-size:11px;font-weight:800;">Alimentazione</span></button>' +
    '<button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate(\'supplements\')"><span style="font-size:18px;">💊</span><span style="font-size:11px;font-weight:800;">Integrazione</span></button>' +
    '<button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate(\'therapy\')"><span style="font-size:18px;">🩺</span><span style="font-size:11px;font-weight:800;">Terapia</span></button>' +
    '<button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate(\'exams\')"><span style="font-size:18px;">🧪</span><span style="font-size:11px;font-weight:800;">Esami</span></button>' +
    '<button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate(\'calendar\')"><span style="font-size:18px;">📅</span><span style="font-size:11px;font-weight:800;">Calendario</span></button>' +
    '</div></div>';
}

function athleteHomeHtml() {
  const coachStatus = store.coachOnline
    ? '<div style="font-size:12px;color:#6c6;margin-top:8px;">● Coach online</div>'
    : (store.coachLastSeen
      ? '<div style="font-size:12px;color:#888;margin-top:8px;">● Coach offline · ultimo ' + esc(fmtShortDate(store.coachLastSeen)) + '</div>'
      : '<div style="font-size:12px;color:#888;margin-top:8px;">● Stato coach non disponibile</div>');
  return '<div style="text-align:center;padding:16px 0 8px;">' +
    '<img src="nurvan_logo.png" class="logo-blend" alt="NURVAN" style="width:132px;max-width:46vw;filter:drop-shadow(0 0 16px var(--gold));">' +
    '<h1 class="text-gold" style="font-size:26px;font-weight:900;letter-spacing:3px;margin:8px 0 0;">NURVAN</h1>' +
    coachStatus +
    '<button class="btn btn-outline" style="margin-top:10px;font-size:11px;" onclick="reloadClientHome()">⟳ AGGIORNA</button>' +
    '</div>' +
    athleteWaitingHomeHtml() +
    athleteHomeModulesHtml();
}

async function reloadClientHome() {
  practiceToast('Aggiornamento…', 'success');
  try {
    if (typeof syncAccountData === 'function') await syncAccountData(true);
    await refreshAthleteMe();
    if (typeof render === 'function') render();
  } catch (_) {
    try { location.reload(); } catch (__) {}
  }
}

async function requestProgramFromCoach() {
  try {
    enqueueClientOutbox({ type: 'request-program' });
    await flushClientOutbox();
    practiceToast('Richiesta inviata al coach', 'success');
  } catch (_) {
    practiceToast('Richiesta salvata: partirà quando sei online.', 'warning');
  }
}

function renderCoachHub(c) {
  if (typeof isCoachUnlocked === 'function' && !isCoachUnlocked()) {
    c.innerHTML = renderCoachUnlockCardHtml();
    return;
  }
  store.coachSessionActive = true;
  const q = esc(window.__cpClientQ || '');
  const hide = !!(store.coachHidePresence);
  c.innerHTML = '<div style="margin-bottom:12px;display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">' +
    '<div><span style="font-size:10px;color:var(--gold);font-weight:800;">HUB COACH</span>' +
    '<h1 style="color:#fff;margin:2px 0 0;font-size:22px;">I tuoi clienti</h1></div>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="exitCoachSession()">ESCI DALL’HUB</button></div>' +
    '<div class="card" style="padding:12px;margin-bottom:12px;">' +
    '<label style="display:flex;gap:8px;align-items:center;font-size:12px;color:#ccc;margin-bottom:8px;">' +
    '<input type="checkbox" ' + (hide ? 'checked' : '') + ' onchange="toggleCoachHidePresence(this.checked)"> Nascondi che sei online agli atleti</label>' +
    '<label style="display:flex;gap:8px;align-items:center;font-size:12px;color:#ccc;margin-bottom:10px;">' +
    '<input type="checkbox" ' + ((store.coachAllowVideocall !== false) ? 'checked' : '') + ' onchange="toggleCoachVideocall(this.checked)"> Consenti videocall interne con i clienti</label>' +
    '<input id="cp-client-q" type="search" placeholder="Cerca nome…" value="' + q + '" oninput="window.__cpClientQ=this.value;debounceCoachClientList()">' +
    '<button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="openAddClientWizard()">AGGIUNGI CLIENTE</button></div>' +
    '<div id="cp-client-list"><div class="cp-help">Caricamento…</div></div>';
  loadCoachClientList();
  applyClientChrome();
}

var __cpListTimer = 0;
function debounceCoachClientList() {
  clearTimeout(__cpListTimer);
  __cpListTimer = setTimeout(loadCoachClientList, 280);
}

async function loadCoachClientList() {
  const box = document.getElementById('cp-client-list');
  if (!box) return;
  try {
    const q = window.__cpClientQ || '';
    const payload = await practiceFetch('/api/coach/clients?limit=30&offset=0&q=' + encodeURIComponent(q), { method: 'GET', headers: practiceHeaders(false) }, 20000);
    store.__cpOrigin = payload.origin || '';
    const rows = payload.clients || [];
    if (!rows.length) {
      box.innerHTML = '<div class="cp-help">Nessun cliente. Aggiungine uno: nuovo (compilerà il questionario) o transizione (compili tu le info).</div>';
      return;
    }
    box.innerHTML = rows.map(function (cl) {
      const badge = cl.intakeMode === 'transition' ? 'Transizione' : (cl.intakeDone ? 'Questionario ok' : 'Nuovo · questionario');
      const paid = cl.paid ? 'Pagato' : 'Non pagato';
      const presence = presenceLabel(cl.online, cl.lastSeenAt, cl.workoutLive);
      const presenceColor = cl.workoutLive ? '#6c6' : (cl.online ? '#6c6' : '#888');
      return '<div class="card" style="padding:12px;margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">' +
        '<div><div style="font-size:15px;font-weight:900;color:#fff;">' + esc(cl.displayName) +
        (cl.leaveRequested ? ' <span class="cp-badge" style="color:#c66;border-color:#c66;">FINE RICHIESTA</span>' : '') +
        (cl.workoutLive ? ' <span class="cp-badge" style="color:#6c6;border-color:#6c6;">IN WORKOUT</span>' : '') + '</div>' +
        '<div style="font-size:11px;color:#888;">@' + esc(cl.username) + ' · ' + esc(badge) + ' · ' + esc(paid) +
        (cl.unreadCount ? ' · ' + cl.unreadCount + ' nuovi' : '') +
        (cl.hasPendingChange ? ' · modifica da approvare' : '') + '</div>' +
        '<div style="font-size:11px;color:' + presenceColor + ';margin-top:4px;">● ' + esc(presence) + '</div>' +
        '<div style="font-size:10px;color:#777;margin-top:4px;">Scheda scade: ' + esc(fmtDay(cl.programExpiresAt)) +
        ' · Prossimo check: ' + esc(fmtDay(cl.nextCheckAt)) + '</div></div></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">' +
        '<button class="btn btn-primary" style="font-size:10px;padding:8px 10px;" onclick="openCoachClient(\'' + esc(cl.id) + '\')">APRI</button>' +
        '<button class="btn btn-outline" style="font-size:10px;padding:8px 10px;" onclick="openCoachClientChat(\'' + esc(cl.id) + '\')">CHAT</button>' +
        '<button class="btn btn-outline" style="font-size:10px;padding:8px 10px;" onclick="copyClientInvite(\'' + esc(cl.id) + '\',\'' + esc(cl.inviteToken || '') + '\')">LINK</button>' +
        '<button class="btn btn-outline" style="font-size:10px;padding:8px 10px;" onclick="toggleClientPaid(\'' + esc(cl.id) + '\',' + (cl.paid ? 'false' : 'true') + ')">' + (cl.paid ? 'SEGNA NON PAGATO' : 'SEGNA PAGATO') + '</button>' +
        '<button class="btn btn-outline" style="font-size:10px;padding:8px 10px;" onclick="revokeCoachClient(\'' + esc(cl.id) + '\')">REVOCA</button>' +
        '<button class="btn btn-outline" style="font-size:10px;padding:8px 10px;color:#c66;border-color:#c66;" onclick="removeCoachClient(\'' + esc(cl.id) + '\')">RIMUOVI</button>' +
        '</div></div>';
    }).join('');
  } catch (err) {
    box.innerHTML = '<div class="cp-help">' + esc((err && err.message) || 'Lista non disponibile.') + '</div>';
  }
}

function openAddClientWizard() {
  ensurePracticeStyle();
  ensurePracticeOverlays();
  window.__cpAddMode = window.__cpAddMode || 'new';
  drawAddClientWizard();
  showOverlay('cp-add', true);
}

function setAddClientMode(mode) {
  window.__cpAddMode = mode === 'transition' ? 'transition' : 'new';
  drawAddClientWizard();
}

function drawAddClientWizard() {
  const p = document.getElementById('cp-add-panel');
  if (!p) return;
  const mode = window.__cpAddMode || 'new';
  const isNew = mode === 'new';
  p.innerHTML = '<div style="font-size:10px;color:var(--gold);font-weight:800;">NUOVO CLIENTE</div>' +
    '<h2>Aggiungi un atleta</h2>' +
    '<div class="cp-mode">' +
    '<button class="btn ' + (isNew ? 'btn-primary' : 'btn-outline') + '" onclick="setAddClientMode(\'new\')">NUOVO CLIENTE</button>' +
    '<button class="btn ' + (!isNew ? 'btn-primary' : 'btn-outline') + '" onclick="setAddClientMode(\'transition\')">TRANSIZIONE VERSO APP</button>' +
    '</div>' +
    (isNew
      ? '<p class="cp-help"><b style="color:#fff;">Nuovo:</b> al primo login si apre il questionario di acquisizione (nome/cognome + menu a tendina: anzianità, obiettivo, problemi fisici, tempo a disposizione).</p>'
      : '<p class="cp-help"><b style="color:#fff;">Transizione:</b> lo conosci già. Compili tu il questionario ora: al login entra in app senza form.</p>') +
    '<div class="cp-field"><label>Nome *</label><input id="cp-add-first" type="text"></div>' +
    '<div class="cp-field"><label>Cognome *</label><input id="cp-add-last" type="text"></div>' +
    '<div class="cp-field"><label>Password di accesso (min. 4) *</label><input id="cp-add-pass" type="text" autocomplete="off"></div>' +
    (isNew ? '' : '<div id="cp-add-intake">' + intakeFormHtml('cpa', {}, { skipName: true }) + '</div>') +
    '<div id="cp-add-status" class="cp-help"></div>' +
    '<button class="btn btn-primary" style="width:100%;" onclick="submitAddClient()">CREA E GENERA LINK</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="showOverlay(\'cp-add\', false)">ANNULLA</button>';
}

async function submitAddClient() {
  const status = document.getElementById('cp-add-status');
  const firstName = (document.getElementById('cp-add-first') && document.getElementById('cp-add-first').value || '').trim();
  const lastName = (document.getElementById('cp-add-last') && document.getElementById('cp-add-last').value || '').trim();
  const password = (document.getElementById('cp-add-pass') && document.getElementById('cp-add-pass').value) || '';
  const intakeMode = window.__cpAddMode === 'transition' ? 'transition' : 'new';
  const intake = intakeMode === 'transition' ? Object.assign(readIntakeForm('cpa'), { firstName: firstName, lastName: lastName }) : { firstName: firstName, lastName: lastName };
  if (firstName.length < 2 || lastName.length < 2 || password.length < 4) {
    if (status) status.textContent = 'Nome, cognome e password sono obbligatori.';
    return;
  }
  if (intakeMode === 'transition') {
    const missing = intakeFormMissing(intake);
    if (missing.length) {
      if (status) status.textContent = 'In transizione compili tu il form. Manca: ' + missing.join(', ');
      return;
    }
  }
  if (status) status.textContent = 'Creazione…';
  try {
    const payload = await practiceFetch('/api/coach/clients', {
      method: 'POST',
      headers: practiceHeaders(true),
      body: JSON.stringify({ firstName: firstName, lastName: lastName, password: password, intakeMode: intakeMode, intake: intake })
    }, 25000);
    if (!payload || !payload.ok) throw new Error((payload && payload.error) || 'Cliente non creato.');
    showOverlay('cp-add', false);
    const url = payload.inviteUrl || '';
    const user = payload.credentials && payload.credentials.username;
    const pass = (payload.credentials && payload.credentials.password) || password;
    const msg = payload.inviteText || ('Link: ' + url + '\nUtente: ' + user + '\nPassword: ' + pass);
    await copyOrShare(msg, 'Invito Nurvan');
    practiceToast('Creato ' + firstName + '. Utente ' + user, 'success');
    try { alert('Invito pronto.\n\n' + msg + (intakeMode === 'new' ? '\n\nAl primo accesso compilerà il questionario.' : '\n\nTransizione: entra senza questionario.')); } catch (_) {}
    if (currentView === 'coachHub') loadCoachClientList();
    else navigate('coachHub');
  } catch (err) {
    if (status) status.textContent = (err && err.message) || 'Creazione non riuscita.';
  }
}

async function copyClientInvite(id, token) {
  let text = '';
  try {
    const snap = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/snapshot', { method: 'GET', headers: practiceHeaders(false) }, 20000);
    text = snap.inviteText || '';
    if (!text) {
      const url = snap.inviteUrl || ((store.__cpOrigin && token) ? store.__cpOrigin + '/c/' + token : '');
      const user = snap.credentials && snap.credentials.username;
      const pass = snap.credentials && snap.credentials.password;
      text = 'Link: ' + url + '\nUtente: ' + (user || '') + '\nPassword: ' + (pass || '');
    }
  } catch (_) {
    if (store.__cpOrigin && token) text = store.__cpOrigin + '/c/' + token;
  }
  if (!text) { practiceToast('Link non disponibile', 'warning'); return; }
  copyOrShare(text, 'Invito Nurvan');
}

async function toggleClientPaid(id, paid) {
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/paid', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ paid: !!paid })
    }, 15000);
    loadCoachClientList();
  } catch (err) { practiceToast((err && err.message) || 'Aggiornamento pagamento fallito', 'danger'); }
}

async function revokeCoachClient(id) {
  if (!confirm('Revocare l’accesso a questo cliente?')) return;
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/revoke', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 15000);
    loadCoachClientList();
  } catch (err) { practiceToast((err && err.message) || 'Revoca fallita', 'danger'); }
}

async function removeCoachClient(id) {
  if (!confirm('Rimuovere il cliente dalla lista?')) return;
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/remove', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 15000);
    loadCoachClientList();
  } catch (err) { practiceToast((err && err.message) || 'Rimozione fallita', 'danger'); }
}

async function openCoachClient(id) {
  if (store.coachViewingClient) await leaveCoachClientView(true);
  store.coachSessionActive = true;
  store.coachWorkspace = { clientId: id };
  if (typeof persist === 'function') persist();
  navigate('coachClient');
}

function openCoachClientChat(id) {
  store.coachSessionActive = true;
  store.coachWorkspace = Object.assign({}, store.coachWorkspace || {}, { clientId: id, chat: true });
  navigate('coachChat');
}

function chatToolsHtml(inputId, sendCall, clearCall, newCall) {
  return '<div style="display:flex;gap:8px;margin-top:10px;align-items:center;">' +
    '<input id="' + inputId + '" type="text" placeholder="Scrivi…">' +
    '<button class="btn btn-primary" onclick="' + sendCall + '">INVIA</button></div>' +
    '<div class="cp-chat-tools">' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="startChatDictation(\'' + inputId + '\')">🎙 DETTA</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="pickChatAttachment()">📎 ALLEGA</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="' + clearCall + '">AZZERA CHAT (PER ME)</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="' + newCall + '">NUOVA CHAT</button>' +
    '</div><div id="cp-attach-preview" class="cp-help"></div>';
}

function renderMessageHtml(m, mine) {
  const att = m.attachment || {};
  let extra = '';
  if (att.kind === 'image' && att.data) extra = '<img src="' + att.data + '" alt="' + esc(att.name || 'foto') + '">';
  else if (att.kind === 'file' && att.data) extra = '<a href="' + att.data + '" download="' + esc(att.name || 'documento') + '" style="color:var(--gold);font-size:11px;">📄 ' + esc(att.name || 'documento') + '</a>';
  const ticks = mine
    ? (m.read_at ? ' <span style="color:#4fc3f7;">✓✓</span>' : ' <span style="color:#888;">✓</span>')
    : '';
  const lock = (m.e2e || (typeof m.body === 'string' && m.body.indexOf('E2E1:') === 0)) ? ' 🔒' : '';
  const text = m._plain != null ? m._plain : (m.body || '');
  return '<div class="cp-msg ' + (mine ? 'me' : 'them') + '">' + esc(text) + lock + extra +
    '<div style="font-size:9px;color:#666;margin-top:4px;">' + esc(String(m.created_at || '').replace('T', ' ').slice(0, 16)) + ticks + '</div></div>';
}

async function pushCoachClientEdits() {
  const id = store.coachWorkspace && store.coachWorkspace.clientId;
  if (!id || !store.coachViewingClient) return;
  const payload = {
    activeProgram: typeof DATA !== 'undefined' ? DATA : null,
    nutrition: store.nutrition || (DATA && DATA.nutrition) || null,
    supplementation: store.supplementation || (DATA && DATA.supplementation) || null,
    therapy: store.therapy || (DATA && DATA.therapy) || null,
    exams: store.exams || (DATA && DATA.exams) || null,
    data: store.data || {},
    subs: store.subs || {},
    customSets: store.customSets || {},
    logs: store.logs || []
  };
  try {
    await withBusy(async function () {
      await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/patch-data', {
        method: 'POST', headers: practiceHeaders(true),
        body: JSON.stringify({ data: payload, notify: true })
      }, 45000);
    }, 'Salvo modifiche al cliente…', { immediate: true });
    practiceToast('Modifiche inviate al cliente', 'success');
  } catch (err) {
    practiceToast((err && err.message) || 'Salvataggio fallito', 'danger');
  }
}

async function askExerciseInfoToCoach(idx, exerciseName) {
  const name = exerciseName || 'esercizio';
  const week = (typeof currentWeek !== 'undefined' ? currentWeek : 1);
  const day = (typeof currentDay !== 'undefined' ? currentDay : 0) + 1;
  const msg = 'Coach chiedo info su allenamento ' + day + ' settimana ' + week + ' esercizio "' + name + '"';
  if (typeof isAthleteRole === 'function' && isAthleteRole()) {
    let online = !!store.coachOnline;
    try {
      const me = await practiceFetch('/api/client/me', { method: 'GET', headers: practiceHeaders(false) }, 10000);
      online = !!me.coachOnline;
      store.coachOnline = online;
    } catch (_) {}
    if (!online) {
      if (!confirm('Il coach non è online. Chiedere comunque?')) return;
    }
    navigate('clientChat');
    setTimeout(function () {
      const input = document.getElementById('cp-ath-msg');
      if (input) { input.value = msg; input.focus(); }
    }, 350);
    return;
  }
  practiceToast(msg, 'info');
}

async function renderCoachWorkspace(c) {
  const id = store.coachWorkspace && store.coachWorkspace.clientId;
  if (!id) { c.innerHTML = '<div class="cp-help">Nessun cliente selezionato.</div>'; return; }
  c.innerHTML = '<div class="cp-help">Caricamento scheda cliente…</div>';
  try {
    const snap = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/snapshot', { method: 'GET', headers: practiceHeaders(false) }, 25000);
    store.coachWorkspace = {
      clientId: id,
      client: snap.client,
      data: snap.data || {},
      intake: snap.intake || (snap.client && snap.client.intake) || {},
      inviteUrl: snap.inviteUrl,
      inviteText: snap.inviteText,
      loadedAt: Date.now()
    };
    const cl = snap.client || {};
    const prog = (snap.data && snap.data.activeProgram) || {};
    const weeks = (prog.weeks && prog.weeks.length) || 0;
    const intake = store.coachWorkspace.intake || {};
    const intakeRows = CLIENT_INTAKE_FIELDS.filter(function (f) { return intake[f.key]; }).map(function (f) {
      return '<div class="cp-row"><span style="color:#888;font-size:11px;">' + esc(f.label) + '</span><span style="font-size:12px;color:#fff;">' + esc(intake[f.key]) + '</span></div>';
    }).join('');
    let eventsHtml = '';
    try {
      const ev = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/events', { method: 'GET', headers: practiceHeaders(false) }, 15000);
      eventsHtml = (ev.events || []).slice(0, 8).map(function (e) {
        return '<div class="cp-help" style="margin:0 0 4px;">' + esc(e.kind) + ' · ' + esc(String(e.created_at || '').replace('T', ' ').slice(0, 16)) + '</div>';
      }).join('');
    } catch (_) {}
    c.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'coachHub\')">← LISTA</button>' +
      '<button class="btn btn-primary" style="font-size:10px;" onclick="openCoachClientChat(\'' + esc(id) + '\')">CHAT</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="exitCoachSession()">ESCI COACH</button></div>' +
      '<h1 style="color:#fff;font-size:22px;margin:0 0 4px;">' + esc(cl.displayName || 'Cliente') + '</h1>' +
      '<div style="font-size:11px;color:#888;margin-bottom:6px;">@' + esc(cl.username || '') + ' · ' +
      (cl.intakeMode === 'transition' ? 'Transizione' : 'Nuovo') + (cl.intakeDone ? ' · questionario ok' : ' · questionario in attesa') + '</div>' +
      '<div style="font-size:12px;margin-bottom:12px;color:' + (cl.workoutLive || cl.online ? '#6c6' : '#888') + ';">● ' +
      esc(presenceLabel(cl.online, cl.lastSeenAt, cl.workoutLive)) + '</div>' +
      (cl.leaveRequested ? '<div class="card" style="padding:12px;margin-bottom:12px;border-color:#c66;"><div style="font-weight:900;color:#c66;">Richiesta fine collaborazione</div>' +
        '<button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="confirmLeaveClient(\'' + esc(id) + '\')">CONFERMA FINE COLLABORAZIONE</button></div>' : '') +
      ((snap.pendingChange || cl.hasPendingChange) ? '<div class="card" style="padding:12px;margin-bottom:12px;border-color:var(--gold);"><div style="font-weight:900;color:var(--gold);">Modifica richiesta dall’atleta</div>' +
        '<p class="cp-help">' + esc((snap.pendingChange && snap.pendingChange.summary) || 'Vuole cambiare il programma.') + '</p>' +
        '<button class="btn btn-primary" style="width:100%;margin-top:6px;" onclick="approveClientChange(\'' + esc(id) + '\')">APPROVA MODIFICA</button>' +
        '<button class="btn btn-outline" style="width:100%;margin-top:6px;" onclick="rejectClientChange(\'' + esc(id) + '\')">RIFIUTA</button></div>' : '') +
      '<div class="card" style="padding:12px;margin-bottom:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:6px;">Programma cliente</div>' +
      '<div style="font-size:12px;color:#ccc;">' + esc(prog.title || 'Nessuna scheda assegnata') + (weeks ? ' · ' + weeks + ' settimane' : '') + '</div>' +
      '<div style="font-size:11px;color:#aaa;margin-top:8px;">Scade: <b style="color:#fff;">' + esc(fmtDay(cl.programExpiresAt)) + '</b> · Prossimo check: <b style="color:#fff;">' + esc(fmtDay(cl.nextCheckAt)) + '</b></div>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="editClientSchedule(\'' + esc(id) + '\')">IMPOSTA SCADENZA / CHECK</button>' +
      '<label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:12px;color:#ccc;line-height:1.35;"><input id="cp-max-freedom" type="checkbox"' + (cl.allowMaxFreedom ? ' checked' : '') + ' onchange="toggleMaxFreedom(\'' + esc(id) + '\', this.checked)"> <span><b style="color:#fff;">Consenti massima libertà</b> — l’atleta può modificare da solo. Ti arriva comunque un avviso. Senza spunta, ogni modifica è una richiesta che tu approvi.</span></label>' +
      '<button class="btn btn-primary" style="width:100%;margin-top:10px;font-size:11px;" onclick="openAssignChooser(\'' + esc(id) + '\',\'' + esc(cl.displayName || '') + '\')">ASSEGNA SCHEDA</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="requestCheckFromClient(\'' + esc(id) + '\')">RICHIEDI CHECK</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="requestExamsFromClient(\'' + esc(id) + '\')">RICHIEDI ESAMI</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="resetClientPassword(\'' + esc(id) + '\')">REIMPOSTA PASSWORD</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="copyClientInvite(\'' + esc(id) + '\',\'' + esc(cl.inviteToken || '') + '\')">COPIA LINK + CREDENZIALI</button></div>' +
      '<div class="card" style="padding:12px;margin-bottom:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:8px;">Vedi dati del cliente</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'training\')">ALLENAMENTO</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'stats\')">STATS WORKOUT</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'nutrition\')">ALIMENTAZIONE</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'supplements\')">INTEGRAZIONE</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'therapy\')">TERAPIA</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'exams\')">ESAMI</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'athlete\')">PROFILO</button></div></div>' +
      '<div class="card" style="padding:12px;margin-bottom:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:6px;">Anagrafica acquisizione</div>' +
      (intakeRows || '<div class="cp-help">Questionario non ancora compilato.</div>') + '</div>' +
      '<div class="card" style="padding:12px;margin-bottom:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:6px;">Attività / richieste</div>' +
      (eventsHtml || '<div class="cp-help">Nessuna richiesta recente.</div>') + '</div>' +
      '<div class="card" id="cp-ws-chat-card" style="padding:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:8px;">Chat con ' + esc(cl.displayName || 'cliente') + '</div>' +
      '<div id="cp-ws-chat" style="min-height:80px;max-height:46vh;overflow:auto;"></div>' +
      chatToolsHtml('cp-ws-msg', 'sendCoachHumanMessage(\'' + esc(id) + '\')', 'clearChatForMe(\'' + esc(id) + '\',\'coach\')', 'newChatThread(\'' + esc(id) + '\',\'coach\')') +
      '</div>';
    startChatPoll(id, 'cp-ws-chat', 'coach');
    if (store.coachWorkspace && store.coachWorkspace.chat) {
      setTimeout(function () {
        const el = document.getElementById('cp-ws-chat-card');
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  } catch (err) {
    c.innerHTML = '<div class="cp-help">' + esc((err && err.message) || 'Snapshot non disponibile.') + '</div>';
  }
}

function snapshotCoachMaster() {
  return {
    DATA: typeof DATA !== 'undefined' ? JSON.parse(JSON.stringify(DATA || {})) : {},
    nutrition: store.nutrition ? JSON.parse(JSON.stringify(store.nutrition)) : null,
    supplementation: store.supplementation ? JSON.parse(JSON.stringify(store.supplementation)) : null,
    therapy: store.therapy ? JSON.parse(JSON.stringify(store.therapy)) : null,
    exams: store.exams ? JSON.parse(JSON.stringify(store.exams)) : null,
    activeProgramId: store.activeProgramId || null,
    activeProgram: store.activeProgram ? JSON.parse(JSON.stringify(store.activeProgram)) : null,
    currentWeek: typeof currentWeek !== 'undefined' ? currentWeek : 1,
    currentDay: typeof currentDay !== 'undefined' ? currentDay : 0,
    data: store.data ? JSON.parse(JSON.stringify(store.data)) : {},
    customSets: store.customSets ? JSON.parse(JSON.stringify(store.customSets)) : {},
    subs: store.subs ? JSON.parse(JSON.stringify(store.subs)) : {},
    skips: store.skips ? JSON.parse(JSON.stringify(store.skips)) : {},
    logs: Array.isArray(store.logs) ? JSON.parse(JSON.stringify(store.logs)) : [],
    nutritionDaily: store.nutritionDaily ? JSON.parse(JSON.stringify(store.nutritionDaily)) : {},
    profile: store.profile ? JSON.parse(JSON.stringify(store.profile)) : {},
    bw: store.bw ? JSON.parse(JSON.stringify(store.bw)) : {},
    exMuscle: store.exMuscle ? JSON.parse(JSON.stringify(store.exMuscle)) : {},
    loadTypes: store.loadTypes ? JSON.parse(JSON.stringify(store.loadTypes)) : {},
    tempos: store.tempos ? JSON.parse(JSON.stringify(store.tempos)) : {},
    bonus: store.bonus ? JSON.parse(JSON.stringify(store.bonus)) : {}
  };
}

function emptyClientAssignDraft() {
  return {
    id: 'assign_draft_' + Date.now(),
    title: 'Bozza per cliente',
    weeks: [],
    nutrition: null,
    supplementation: null,
    therapy: null,
    exams: null,
    depersonalized: true
  };
}

async function restoreCoachMaster(backup) {
  if (!backup) return;
  try { DATA = backup.DATA || { title: 'Nessun Programma Attivo', weeks: [] }; } catch (_) {}
  store.nutrition = backup.nutrition;
  store.supplementation = backup.supplementation;
  store.therapy = backup.therapy;
  store.exams = backup.exams;
  store.activeProgramId = backup.activeProgramId;
  store.activeProgram = backup.activeProgram;
  store.data = backup.data || {};
  store.customSets = backup.customSets || {};
  store.subs = backup.subs || {};
  store.skips = backup.skips || {};
  store.logs = backup.logs || [];
  store.nutritionDaily = backup.nutritionDaily || {};
  store.profile = backup.profile || store.profile || {};
  store.bw = backup.bw || {};
  store.exMuscle = backup.exMuscle || {};
  store.loadTypes = backup.loadTypes || {};
  store.tempos = backup.tempos || {};
  store.bonus = backup.bonus || {};
  if (typeof currentWeek !== 'undefined') currentWeek = backup.currentWeek || 1;
  if (typeof currentDay !== 'undefined') currentDay = backup.currentDay || 0;
  if (typeof persist === 'function') persist();
  try {
    if (backup.DATA && typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.activateCanonicalProgram) {
      await GiammariaPersistence.activateCanonicalProgram(backup.DATA);
    }
  } catch (err) {
    console.warn('[ASSIGN_RESTORE_IDB]', err);
  }
}

function requestNotifyPermission() {
  try {
    const native = typeof nativeBridge === 'function' ? nativeBridge() : (typeof NativeConfig !== 'undefined' ? NativeConfig : null);
    if (native && typeof native.requestNotifications === 'function') native.requestNotifications();
  } catch (_) {}
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  } catch (_) {}
}

function ensureAssignBanner() {
  let bar = document.getElementById('cp-assign-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'cp-assign-bar';
    bar.className = 'cp-assign-bar';
    bar.style.display = 'none';
    document.body.appendChild(bar);
  }
  const job = store.coachAssigning;
  if (!job) { bar.style.display = 'none'; return; }
  bar.style.display = 'block';
  bar.innerHTML = '<div style="font-size:11px;color:var(--gold);font-weight:800;margin-bottom:6px;">ASSEGNAZIONE A ' + esc(job.name || 'cliente') + ' · SPAZIO CLIENTE</div>' +
    '<div style="font-size:11px;color:#aaa;margin-bottom:8px;">Questo non è il tuo allenamento. Importa o scegli, modifica, poi invia. Annulla per tornare al master.</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'training\')">ALLENAMENTO</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'nutrition\')">ALIMENTAZIONE</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'supplements\')">INTEGRAZIONE</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'therapy\')">TERAPIA</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'exams\')">ESAMI</button></div>' +
    '<div style="display:flex;gap:8px;"><button class="btn btn-primary" style="flex:1;font-size:11px;" onclick="confirmAssignSandbox()">INVIA AL CLIENTE</button>' +
    '<button class="btn btn-outline" style="flex:1;font-size:11px;" onclick="cancelAssignSandbox()">ANNULLA</button></div>';
}

function openAssignChooser(clientId, name) {
  ensurePracticeStyle();
  ensurePracticeOverlays();
  const p = document.getElementById('cp-assign-panel');
  if (!p) return;
  p.innerHTML = '<div style="font-size:10px;color:var(--gold);font-weight:800;">ASSEGNA SCHEDA</div>' +
    '<h2>Cosa vuoi assegnare a ' + esc(name || 'cliente') + '?</h2>' +
    '<p class="cp-help">Si apre uno <b style="color:#fff;">spazio cliente separato</b> dal tuo allenamento. Importa o scegli, modifica, poi INVIA. Solo «usa scheda attiva» parte dalla tua come base.</p>' +
    '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="beginAssignSandbox(\'' + esc(clientId) + '\',\'' + esc(name || '') + '\',\'import\')">IMPORTA PDF / EXCEL / WORD</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="beginAssignSandbox(\'' + esc(clientId) + '\',\'' + esc(name || '') + '\',\'programs\')">DATABASE PROGRAMMI</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="beginAssignSandbox(\'' + esc(clientId) + '\',\'' + esc(name || '') + '\',\'copy\')">USA SCHEDA ATTIVA COME BASE</button>' +
    '<button class="btn btn-outline" style="width:100%;" onclick="showOverlay(\'cp-assign\', false)">ANNULLA</button>';
  showOverlay('cp-assign', true);
  requestNotifyPermission();
}

function beginAssignSandbox(clientId, name, mode) {
  requestNotifyPermission();
  store.coachAssigning = { clientId: clientId, name: name, mode: mode || 'import' };
  window.__cpAssignBackup = snapshotCoachMaster();
  if (typeof persist === 'function') persist();
  // import / database: spazio cliente vuoto. copy: parte dalla scheda personale (solo in memoria).
  if (mode !== 'copy') {
    const draft = emptyClientAssignDraft();
    try { DATA = draft; } catch (_) {}
    store.activeProgram = draft;
    store.activeProgramId = draft.id;
    store.nutrition = null;
    store.supplementation = null;
    store.therapy = null;
    store.exams = null;
    if (typeof currentWeek !== 'undefined') currentWeek = 1;
    if (typeof currentDay !== 'undefined') currentDay = 0;
  }
  showOverlay('cp-assign', false);
  ensureAssignBanner();
  if (mode === 'import') {
    navigate('import');
    practiceToast('Spazio cliente vuoto: importa il file da assegnare. Il tuo allenamento resta intatto.', 'success');
  } else if (mode === 'programs') {
    navigate('programs');
    practiceToast('Scegli una scheda dal database per il cliente. La tua resta intatta.', 'success');
  } else {
    navigate('training');
    practiceToast('Copia della tua scheda attiva come base cliente. Modifica e conferma.', 'success');
  }
}

function detectSandboxKinds() {
  const kinds = [];
  if (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.weeks) && DATA.weeks.length) kinds.push('training');
  if ((DATA && DATA.nutrition && DATA.nutrition.days && DATA.nutrition.days.length) || (store.nutrition && store.nutrition.days && store.nutrition.days.length)) kinds.push('nutrition');
  if ((DATA && DATA.supplementation && DATA.supplementation.items && DATA.supplementation.items.length) || (store.supplementation && store.supplementation.items && store.supplementation.items.length)) kinds.push('supplements');
  if ((DATA && DATA.therapy && DATA.therapy.medications && DATA.therapy.medications.length) || (store.therapy && store.therapy.medications && store.therapy.medications.length)) kinds.push('therapy');
  if ((DATA && DATA.exams && DATA.exams.records && DATA.exams.records.length) || (store.exams && store.exams.records && store.exams.records.length)) kinds.push('exams');
  return kinds;
}

async function confirmAssignSandbox() {
  const job = store.coachAssigning;
  if (!job || !job.clientId) return;
  const kinds = detectSandboxKinds();
  if (!kinds.length) {
    practiceToast('Nessun contenuto da assegnare: importa o scegli una scheda prima.', 'warning');
    return;
  }
  const run = async function () {
    const payload = {
      activeProgram: (typeof DATA !== 'undefined' && DATA) ? JSON.parse(JSON.stringify(DATA)) : null
    };
    if (DATA && DATA.nutrition) payload.nutrition = JSON.parse(JSON.stringify(DATA.nutrition));
    else if (store.nutrition) payload.nutrition = JSON.parse(JSON.stringify(store.nutrition));
    if (DATA && DATA.supplementation) payload.supplementation = JSON.parse(JSON.stringify(DATA.supplementation));
    else if (store.supplementation) payload.supplementation = JSON.parse(JSON.stringify(store.supplementation));
    if (DATA && DATA.therapy) payload.therapy = JSON.parse(JSON.stringify(DATA.therapy));
    else if (store.therapy) payload.therapy = JSON.parse(JSON.stringify(store.therapy));
    if (DATA && DATA.exams) payload.exams = JSON.parse(JSON.stringify(DATA.exams));
    else if (store.exams) payload.exams = JSON.parse(JSON.stringify(store.exams));
    const defExp = new Date(Date.now() + 56 * 86400000).toISOString().slice(0, 10);
    const programExpiresAt = prompt('Scadenza programma per il cliente (AAAA-MM-GG)', defExp);
    if (programExpiresAt === null) throw new Error('Invio annullato');
    const defChk = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const nextCheckAt = prompt('Prossimo check (AAAA-MM-GG, opzionale)', defChk);
    if (nextCheckAt === null) throw new Error('Invio annullato');
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(job.clientId) + '/assign', {
      method: 'POST', headers: practiceHeaders(true),
      body: JSON.stringify({
        data: payload,
        kinds: kinds,
        programExpiresAt: programExpiresAt || null,
        nextCheckAt: nextCheckAt || null
      })
    }, 45000);
    await restoreCoachMaster(window.__cpAssignBackup || job.backup);
    window.__cpAssignBackup = null;
    store.coachAssigning = null;
    if (typeof persist === 'function') persist();
    ensureAssignBanner();
    practiceToast('Scheda inviata a ' + (job.name || 'cliente'), 'success');
    store.coachSessionActive = true;
    store.coachWorkspace = { clientId: job.clientId };
    navigate('coachClient');
  };
  try {
    if (typeof withBusy === 'function') {
      await withBusy(run, 'Invio scheda al cliente…', { immediate: true });
    } else {
      practiceToast('Invio in corso…', 'info');
      await run();
    }
  } catch (err) {
    practiceToast((err && err.message) || 'Assegnazione fallita', 'danger');
  }
}

async function cancelAssignSandbox() {
  const job = store.coachAssigning;
  if (job) await restoreCoachMaster(window.__cpAssignBackup || job.backup);
  window.__cpAssignBackup = null;
  store.coachAssigning = null;
  if (typeof persist === 'function') persist();
  ensureAssignBanner();
  practiceToast('Assegnazione annullata — scheda personale ripristinata', 'warning');
  navigate('coachHub');
}

async function assignActiveToClient(id) {
  openAssignChooser(id, (store.coachWorkspace && store.coachWorkspace.client && store.coachWorkspace.client.displayName) || '');
}

function euDateParts(iso) {
  const s = iso ? String(iso).slice(0, 10) : '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }
  return { y: +m[1], m: +m[2], d: +m[3] };
}

function buildEuDateSelects(prefix, initialIso) {
  const p = euDateParts(initialIso);
  const years = [];
  const nowY = new Date().getFullYear();
  for (let y = nowY - 1; y <= nowY + 5; y++) years.push(y);
  const months = [
    [1, 'gennaio'], [2, 'febbraio'], [3, 'marzo'], [4, 'aprile'], [5, 'maggio'], [6, 'giugno'],
    [7, 'luglio'], [8, 'agosto'], [9, 'settembre'], [10, 'ottobre'], [11, 'novembre'], [12, 'dicembre']
  ];
  const days = [];
  for (let d = 1; d <= 31; d++) days.push(d);
  return '<div class="cp-cal-grid">' +
    '<div><label style="font-size:9px;color:#888;font-weight:800;">GIORNO</label><select id="' + prefix + '-d">' +
    days.map(function (d) { return '<option value="' + d + '"' + (d === p.d ? ' selected' : '') + '>' + String(d).padStart(2, '0') + '</option>'; }).join('') +
    '</select></div>' +
    '<div><label style="font-size:9px;color:#888;font-weight:800;">MESE</label><select id="' + prefix + '-m">' +
    months.map(function (mo) { return '<option value="' + mo[0] + '"' + (mo[0] === p.m ? ' selected' : '') + '>' + mo[1] + '</option>'; }).join('') +
    '</select></div>' +
    '<div><label style="font-size:9px;color:#888;font-weight:800;">ANNO</label><select id="' + prefix + '-y">' +
    years.map(function (y) { return '<option value="' + y + '"' + (y === p.y ? ' selected' : '') + '>' + y + '</option>'; }).join('') +
    '</select></div></div>';
}

function readEuDateSelects(prefix) {
  const d = +((document.getElementById(prefix + '-d') || {}).value || 0);
  const m = +((document.getElementById(prefix + '-m') || {}).value || 0);
  const y = +((document.getElementById(prefix + '-y') || {}).value || 0);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function ensureCpModal() {
  let ov = document.getElementById('cp-modal');
  if (ov) return ov;
  ov = document.createElement('div');
  ov.id = 'cp-modal';
  ov.className = 'cp-overlay';
  ov.style.display = 'none';
  ov.innerHTML = '<div class="cp-panel" id="cp-modal-panel"></div>';
  document.body.appendChild(ov);
  return ov;
}

function openCpModal(html) {
  ensurePracticeStyle();
  const ov = ensureCpModal();
  const panel = document.getElementById('cp-modal-panel');
  if (panel) panel.innerHTML = html;
  ov.style.display = 'flex';
}

function closeCpModal() {
  const ov = document.getElementById('cp-modal');
  if (ov) ov.style.display = 'none';
}
window.closeCpModal = closeCpModal;

async function requestCheckFromClient(id) {
  const def = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  openCpModal(
    '<h2>Richiedi check fisico</h2>' +
    '<p class="cp-help">Scegli la data in cui vuoi ricevere il check (formato europeo).</p>' +
    buildEuDateSelects('cp-chk', def) +
    '<textarea id="cp-chk-note" rows="2" placeholder="Nota opzionale per il cliente…" style="width:100%;margin-top:12px;padding:10px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;"></textarea>' +
    '<button class="btn btn-primary" style="width:100%;margin-top:12px;" onclick="confirmRequestCheck(\'' + esc(id) + '\')">INVIA RICHIESTA</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="closeCpModal()">ANNULLA</button>'
  );
}

async function confirmRequestCheck(id) {
  const when = readEuDateSelects('cp-chk');
  if (!when) { practiceToast('Data non valida', 'warning'); return; }
  const note = ((document.getElementById('cp-chk-note') || {}).value || '').trim();
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/check-request', {
      method: 'POST', headers: practiceHeaders(true),
      body: JSON.stringify({ note: note, nextCheckAt: when })
    }, 15000);
    closeCpModal();
    practiceToast('Check richiesto al cliente', 'success');
    if (currentView === 'coachClient') openCoachClient(id);
  } catch (err) { practiceToast((err && err.message) || 'Richiesta check fallita', 'danger'); }
}
window.confirmRequestCheck = confirmRequestCheck;

async function sendCheckToClient(id) {
  return requestCheckFromClient(id);
}

async function editClientSchedule(id) {
  const cl = store.coachWorkspace && store.coachWorkspace.client;
  const exp0 = cl && cl.programExpiresAt ? String(cl.programExpiresAt).slice(0, 10) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const chk0 = cl && cl.nextCheckAt ? String(cl.nextCheckAt).slice(0, 10) : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  openCpModal(
    '<h2>Scadenza e check</h2>' +
    '<p class="cp-help">Seleziona le date dal calendario (giorno / mese / anno).</p>' +
    '<div class="cp-field"><label>SCADENZA PROGRAMMA</label>' + buildEuDateSelects('cp-exp', exp0) + '</div>' +
    '<div class="cp-field" style="margin-top:14px;"><label>PROSSIMO CHECK</label>' + buildEuDateSelects('cp-nx', chk0) + '</div>' +
    '<button class="btn btn-primary" style="width:100%;margin-top:14px;" onclick="confirmClientSchedule(\'' + esc(id) + '\')">SALVA DATE</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="closeCpModal()">ANNULLA</button>'
  );
}

async function confirmClientSchedule(id) {
  const exp = readEuDateSelects('cp-exp');
  const chk = readEuDateSelects('cp-nx');
  if (!exp || !chk) { practiceToast('Date non valide', 'warning'); return; }
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/schedule', {
      method: 'POST', headers: practiceHeaders(true),
      body: JSON.stringify({ programExpiresAt: exp, nextCheckAt: chk })
    }, 15000);
    closeCpModal();
    practiceToast('Date aggiornate', 'success');
    openCoachClient(id);
  } catch (err) { practiceToast((err && err.message) || 'Aggiornamento date fallito', 'danger'); }
}
window.confirmClientSchedule = confirmClientSchedule;

async function toggleCoachHidePresence(hide) {
  try {
    await practiceFetch('/api/coach/presence/hide', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ hide: !!hide })
    }, 12000);
    store.coachHidePresence = !!hide;
    if (typeof persist === 'function') persist();
    practiceToast(hide ? 'Presenza nascosta agli atleti' : 'Gli atleti possono vederti online', 'success');
  } catch (err) {
    practiceToast((err && err.message) || 'Impostazione presenza fallita', 'danger');
  }
}

async function toggleCoachVideocall(allow) {
  try {
    await practiceFetch('/api/coach/videocall', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ allow: !!allow })
    }, 12000);
    store.coachAllowVideocall = !!allow;
    if (typeof persist === 'function') persist();
    practiceToast(allow ? 'Videocall abilitate' : 'Videocall disabilitate', 'success');
  } catch (err) {
    practiceToast((err && err.message) || 'Impostazione videocall fallita', 'danger');
  }
}
window.toggleCoachVideocall = toggleCoachVideocall;

var __examCatalogCache = null;
async function loadExamCatalog() {
  if (__examCatalogCache) return __examCatalogCache;
  try {
    const res = await fetch((typeof COACH_API_ORIGIN === 'string' ? COACH_API_ORIGIN : '') + '/exam-request-catalog.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('catalog');
    __examCatalogCache = await res.json();
  } catch (_) {
    try {
      const res2 = await fetch('exam-request-catalog.json', { cache: 'no-store' });
      __examCatalogCache = await res2.json();
    } catch (e2) {
      __examCatalogCache = { categories: [] };
    }
  }
  return __examCatalogCache;
}

async function requestExamsFromClient(id) {
  const cat = await loadExamCatalog();
  const def = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const catsHtml = (cat.categories || []).map(function (c) {
    const items = (c.exams || []).map(function (ex) {
      return '<label class="cp-exam-item"><input type="checkbox" class="cp-exam-cb" value="' + esc(ex.id) + '" data-name="' + esc(ex.name) + '"> ' + esc(ex.name) + '</label>';
    }).join('');
    return '<div class="cp-exam-cat"><h4>' + esc(c.label) + '</h4>' + items + '</div>';
  }).join('');
  openCpModal(
    '<h2>Richiedi esami</h2>' +
    '<p class="cp-help">Seleziona gli esami dal database e la data entro cui caricarli.</p>' +
    '<div class="cp-field"><label>SCADENZA CARICAMENTO</label>' + buildEuDateSelects('cp-examdue', def) + '</div>' +
    '<div style="max-height:42vh;overflow:auto;margin-top:10px;">' + (catsHtml || '<div class="cp-help">Catalogo non disponibile.</div>') + '</div>' +
    '<textarea id="cp-exam-note" rows="2" placeholder="Nota opzionale…" style="width:100%;margin-top:10px;padding:10px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;"></textarea>' +
    '<button class="btn btn-primary" style="width:100%;margin-top:12px;" onclick="confirmRequestExams(\'' + esc(id) + '\')">INVIA RICHIESTA</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="closeCpModal()">ANNULLA</button>'
  );
}

async function confirmRequestExams(id) {
  const due = readEuDateSelects('cp-examdue');
  if (!due) { practiceToast('Data non valida', 'warning'); return; }
  const exams = Array.prototype.slice.call(document.querySelectorAll('.cp-exam-cb:checked')).map(function (el) {
    return { id: el.value, name: el.getAttribute('data-name') || el.value };
  });
  if (!exams.length) { practiceToast('Seleziona almeno un esame', 'warning'); return; }
  const note = ((document.getElementById('cp-exam-note') || {}).value || '').trim();
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/request-exams', {
      method: 'POST', headers: practiceHeaders(true),
      body: JSON.stringify({ note: note, dueAt: due, exams: exams })
    }, 15000);
    closeCpModal();
    practiceToast('Richiesta esami inviata (' + exams.length + ')', 'success');
  } catch (err) { practiceToast((err && err.message) || 'Richiesta esami fallita', 'danger'); }
}
window.confirmRequestExams = confirmRequestExams;

async function resetClientPassword(id) {
  const password = prompt('Nuova password per il cliente (min. 4):');
  if (!password || password.length < 4) return;
  try {
    const res = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/reset-password', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ password: password })
    }, 15000);
    const user = res.credentials && res.credentials.username;
    const msg = 'Utente: ' + user + '\nPassword: ' + password;
    await copyOrShare(msg, 'Nuove credenziali');
    practiceToast('Password aggiornata', 'success');
  } catch (err) { practiceToast((err && err.message) || 'Reset fallito', 'danger'); }
}

async function confirmLeaveClient(id) {
  if (!confirm('Confermi la fine della collaborazione? L’atleta perderà l’accesso.')) return;
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/leave-confirm', {
      method: 'POST', headers: practiceHeaders(true), body: '{}'
    }, 15000);
    practiceToast('Collaborazione chiusa', 'success');
    navigate('coachHub');
  } catch (err) { practiceToast((err && err.message) || 'Conferma non riuscita', 'danger'); }
}

async function toggleMaxFreedom(id, allow) {
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/max-freedom', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ allow: !!allow })
    }, 15000);
    if (store.coachWorkspace && store.coachWorkspace.client && String(store.coachWorkspace.clientId) === String(id)) {
      store.coachWorkspace.client.allowMaxFreedom = !!allow;
    }
    practiceToast(allow ? 'Massima libertà attiva: l’atleta può modificare, ti arriva avviso.' : 'Massima libertà disattivata: le modifiche diventano richieste.', 'success');
  } catch (err) {
    practiceToast((err && err.message) || 'Aggiornamento non riuscito', 'danger');
    const el = document.getElementById('cp-max-freedom');
    if (el) el.checked = !allow;
  }
}

async function approveClientChange(id) {
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/change-approve', {
      method: 'POST', headers: practiceHeaders(true), body: '{}'
    }, 20000);
    practiceToast('Modifica approvata e inviata al cliente', 'success');
    renderCoachWorkspace(document.getElementById('view-container'));
  } catch (err) { practiceToast((err && err.message) || 'Approvazione fallita', 'danger'); }
}

async function rejectClientChange(id) {
  if (!confirm('Rifiutare la modifica dell’atleta?')) return;
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/change-reject', {
      method: 'POST', headers: practiceHeaders(true), body: '{}'
    }, 15000);
    practiceToast('Modifica rifiutata', 'warning');
    renderCoachWorkspace(document.getElementById('view-container'));
  } catch (err) { practiceToast((err && err.message) || 'Rifiuto fallito', 'danger'); }
}

function renderClientChat(c) {
  c.innerHTML = '<div style="margin-bottom:12px;"><span style="font-size:10px;color:var(--gold);font-weight:800;">COACH · E2E 🔒</span>' +
    '<h1 style="color:#fff;margin:2px 0 0;font-size:22px;">Chat con il coach</h1></div>' +
    '<div class="card" style="padding:12px;"><div id="cp-client-chat" style="max-height:52vh;overflow:auto;"></div>' +
    chatToolsHtml('cp-client-msg', 'sendAthleteHumanMessage()', 'clearChatForMe(null,\'athlete\')', 'newChatThread(null,\'athlete\')') +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="startInternalVideocall(null,\'athlete\')">📹 VIDEOCALL INTERNA</button>' +
    '</div>';
  ensureE2EReady('athlete', null).then(function () { startChatPoll(null, 'cp-client-chat', 'athlete'); });
}

var __cpChatPoll = null;
function stopChatPoll() {
  if (__cpChatPoll) { clearInterval(__cpChatPoll); __cpChatPoll = null; }
}
function startChatPoll(clientId, boxId, role) {
  stopChatPoll();
  loadHumanMessages(clientId, boxId, role);
  __cpChatPoll = setInterval(function () {
    if (!document.getElementById(boxId)) { stopChatPoll(); return; }
    loadHumanMessages(clientId, boxId, role, true);
  }, 2500);
}

async function loadHumanMessages(clientId, boxId, role, silent) {
  const box = document.getElementById(boxId);
  if (!box) return;
  try {
    const path = role === 'athlete' ? '/api/client/messages' : '/api/coach/clients/' + encodeURIComponent(clientId) + '/messages';
    const payload = await practiceFetch(path, { method: 'GET', headers: practiceHeaders(false) }, 20000);
    if (payload.e2e) store.__cpE2EPeer = payload.e2e;
    const msgs = payload.messages || [];
    const nearBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) < 80;
    if (!msgs.length) { box.innerHTML = '<div class="cp-help">Nessun messaggio. Chat cifrata end-to-end.</div>'; return; }
    const decrypted = [];
    for (let i = 0; i < msgs.length; i++) {
      const m = Object.assign({}, msgs[i]);
      m._plain = await decryptChatBody(m.body, role, clientId);
      if (m.attachment && m.attachment.e2eData) {
        try {
          const plainAtt = await decryptChatBody(m.attachment.e2eData, role, clientId);
          m.attachment = Object.assign({}, m.attachment, { data: plainAtt, e2eData: undefined });
        } catch (_) {}
      }
      decrypted.push(m);
    }
    box.innerHTML = decrypted.map(function (m) {
      const mine = (role === 'athlete' && m.from_role === 'athlete') || (role === 'coach' && m.from_role === 'coach');
      return renderMessageHtml(m, mine);
    }).join('');
    if (!silent || nearBottom) box.scrollTop = box.scrollHeight;
  } catch (err) {
    if (!silent) box.innerHTML = '<div class="cp-help">' + esc((err && err.message) || 'Chat non disponibile.') + '</div>';
  }
}

function startChatDictation(inputId) {
  window.__cpVoiceTarget = inputId;
  if (typeof startVoiceInputFor === 'function') startVoiceInputFor(inputId);
  else if (typeof startVoiceInput === 'function') startVoiceInput();
  else practiceToast('Dettatura non disponibile su questo dispositivo', 'warning');
}

function pickChatAttachment() {
  store.__cpChatAttachIntent = true;
  if (typeof setFilePickIntent === 'function') setFilePickIntent('CHAT_ATTACH');
  const native = typeof nativeBridge === 'function' ? nativeBridge() : (typeof NativeConfig !== 'undefined' ? NativeConfig : null);
  const choice = confirm('OK = scatta/scegli foto\nAnnulla = scegli file documento');
  if (choice) {
    if (native && typeof native.pickCamera === 'function') {
      try { native.pickCamera(); return; } catch (_) {}
    }
  } else if (native && typeof native.pickDocument === 'function') {
    try { native.pickDocument(); return; } catch (_) {}
  }
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = choice ? 'image/*' : 'image/*,.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp';
  if (choice) inp.capture = 'environment';
  inp.onchange = function () {
    const file = inp.files && inp.files[0];
    if (!file) return;
    showAttachProgress(5, file.name);
    if (/^image\//i.test(file.type)) {
      compressChatImage(file).then(function (att) {
        showAttachProgress(100, file.name);
        setPendingAttachment(att);
        hideAttachProgress();
      });
    } else {
      if (file.size > 900000) { practiceToast('File troppo grande (max circa 700 KB)', 'warning'); hideAttachProgress(); return; }
      const reader = new FileReader();
      reader.onprogress = function (ev) {
        if (ev.lengthComputable) showAttachProgress(Math.round((ev.loaded / ev.total) * 100), file.name);
      };
      reader.onload = function () {
        const data = String(reader.result || '');
        if (data.length > 450000) { practiceToast('Documento troppo grande', 'warning'); hideAttachProgress(); return; }
        setPendingAttachment({ kind: 'file', name: file.name, mime: file.type || 'application/octet-stream', data: data });
        hideAttachProgress();
      };
      reader.readAsDataURL(file);
    }
  };
  inp.click();
}

function showAttachProgress(pct, name) {
  let el = document.getElementById('cp-attach-progress');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cp-attach-progress';
    el.style.cssText = 'position:fixed;left:50%;bottom:140px;transform:translateX(-50%);z-index:10090;background:#111;border:1px solid var(--gold);border-radius:10px;padding:10px 14px;min-width:200px;font-size:11px;color:#ccc;';
    document.body.appendChild(el);
  }
  el.style.display = 'block';
  el.innerHTML = 'Caricamento ' + esc(name || 'file') + '… <b style="color:var(--gold);">' + Math.round(pct) + '%</b>';
}

function hideAttachProgress() {
  const el = document.getElementById('cp-attach-progress');
  if (el) el.style.display = 'none';
}

function setPendingAttachment(att) {
  window.__cpPendingAttach = att;
  const prev = document.getElementById('cp-attach-preview') || document.getElementById('cp-chat-attach-preview');
  if (prev) {
    if (att && att.kind === 'image' && att.data) {
      prev.innerHTML = '<img src="' + att.data + '" style="max-width:120px;border-radius:8px;display:block;margin-top:6px;"> ' + esc(att.name || 'foto');
    } else {
      prev.textContent = 'Allegato: ' + (att && att.name ? att.name : 'pronto');
    }
  }
  practiceToast('Allegato pronto', 'success');
}

function compressChatImage(file) {
  return new Promise(function (resolve) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      const max = 1280;
      let w = img.width, h = img.height;
      if (w > max || h > max) {
        const scale = Math.min(max / w, max / h);
        w = Math.round(w * scale); h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ kind: 'image', name: file.name || 'foto.jpg', mime: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.72) });
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = function () { resolve({ kind: 'image', name: file.name, mime: file.type, data: reader.result }); };
      reader.readAsDataURL(file);
    };
    img.src = url;
  });
}

async function sendCoachHumanMessage(id) {
  const input = document.getElementById(window.__cpChatInputId || 'cp-ws-msg') || document.getElementById('cp-ws-msg') || document.getElementById('cp-chat-input');
  const body = input && input.value.trim();
  let attachment = window.__cpPendingAttach || null;
  if (!body && !attachment) return;
  try {
    await ensureE2EReady('coach', id);
    const encBody = body ? await encryptChatBody(body, 'coach', id) : '';
    if (attachment && attachment.data) {
      attachment = Object.assign({}, attachment, {
        e2eData: await encryptChatBody(attachment.data, 'coach', id),
        data: null
      });
    }
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/messages', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ body: encBody || '', attachment: attachment, e2e: true })
    }, 20000);
    if (input) input.value = '';
    window.__cpPendingAttach = null;
    const prev = document.getElementById('cp-attach-preview') || document.getElementById('cp-chat-attach-preview');
    if (prev) prev.innerHTML = '';
    loadHumanMessages(id, document.getElementById('cp-wa-chat') ? 'cp-wa-chat' : 'cp-ws-chat', 'coach');
  } catch (err) { practiceToast((err && err.message) || 'Messaggio non inviato', 'danger'); }
}

async function sendAthleteHumanMessage() {
  const input = document.getElementById('cp-client-msg');
  const body = input && input.value.trim();
  let attachment = window.__cpPendingAttach || null;
  if (!body && !attachment) return;
  try {
    await ensureE2EReady('athlete', null);
    const encBody = body ? await encryptChatBody(body, 'athlete', null) : '';
    if (attachment && attachment.data) {
      attachment = Object.assign({}, attachment, {
        e2eData: await encryptChatBody(attachment.data, 'athlete', null),
        data: null
      });
    }
    await practiceFetch('/api/client/messages', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ body: encBody || '', attachment: attachment, e2e: true })
    }, 20000);
    if (input) input.value = '';
    window.__cpPendingAttach = null;
    const prev = document.getElementById('cp-attach-preview');
    if (prev) prev.textContent = '';
    loadHumanMessages(null, 'cp-client-chat', 'athlete');
  } catch (_) {
    enqueueClientOutbox({ type: 'message', body: body || '[allegato]', attachment: attachment });
    if (input) input.value = '';
    window.__cpPendingAttach = null;
    practiceToast('Messaggio in coda offline', 'warning');
  }
}

async function clearChatForMe(clientId, role) {
  if (!confirm('Azzerare la chat solo per te? L’altra persona la vede ancora.')) return;
  try {
    const path = role === 'athlete' ? '/api/client/messages/clear' : '/api/coach/clients/' + encodeURIComponent(clientId) + '/messages/clear';
    await practiceFetch(path, { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 15000);
    loadHumanMessages(clientId, role === 'athlete' ? 'cp-client-chat' : 'cp-ws-chat', role);
  } catch (err) { practiceToast((err && err.message) || 'Azzera non riuscito', 'danger'); }
}

async function newChatThread(clientId, role) {
  if (!confirm('Aprire una nuova chat? I messaggi precedenti restano in archivio.')) return;
  try {
    const path = role === 'athlete' ? '/api/client/messages/new-thread' : '/api/coach/clients/' + encodeURIComponent(clientId) + '/messages/new-thread';
    await practiceFetch(path, { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 15000);
    loadHumanMessages(clientId, role === 'athlete' ? 'cp-client-chat' : 'cp-ws-chat', role);
  } catch (err) { practiceToast((err && err.message) || 'Nuova chat non riuscita', 'danger'); }
}

function toggleClientLoginPassword() {
  const el = document.getElementById('cp-login-pass');
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
}

async function requestClientPasswordHelp() {
  const status = document.getElementById('cp-invite-status');
  const username = (document.getElementById('cp-login-user') && document.getElementById('cp-login-user').value || '').trim();
  if (!username) { if (status) status.textContent = 'Inserisci il nome utente.'; return; }
  try {
    await practiceFetch('/api/client/password-help', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: store.inviteToken, username: username })
    }, 15000);
    if (status) status.textContent = 'Richiesta inviata al coach.';
    practiceToast('Il coach ha ricevuto la richiesta di recupero password', 'success');
  } catch (err) {
    if (status) status.textContent = (err && err.message) || 'Richiesta non inviata.';
  }
}

async function askRealCoachForDomain(domain) {
  const note = prompt('Messaggio per il coach (opzionale):') || '';
  try {
    await practiceFetch('/api/client/ask-coach', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ domain: domain || 'general', note: note })
    }, 15000);
    practiceToast('Richiesta inviata al coach', 'success');
  } catch (err) {
    enqueueClientOutbox({ type: 'ask-coach', domain: domain, note: note });
    practiceToast('Richiesta salvata: partirà quando sei online.', 'warning');
  }
}

async function requestLeaveCoach() {
  if (!confirm('Chiedere al coach di chiudere la collaborazione?')) return;
  try {
    await practiceFetch('/api/client/leave-request', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 15000);
    practiceToast('Richiesta inviata: il coach deve confermare.', 'success');
  } catch (err) {
    practiceToast((err && err.message) || 'Richiesta non inviata', 'danger');
  }
}

function notifyUser(title, body, route) {
  requestNotifyPermission();
  const go = function () {
    if (!route) return;
    try { handleNotifyRoute(route); } catch (_) {}
  };
  try {
    const native = typeof nativeBridge === 'function' ? nativeBridge() : (typeof NativeConfig !== 'undefined' ? NativeConfig : null);
    if (native && typeof native.notifyNow === 'function') {
      native.notifyNow(JSON.stringify({ title: title, body: body, id: 'n_' + Date.now(), route: route || '' }));
      // Native tap routing is best-effort; also keep in-app toast path
    }
  } catch (_) {}
  try {
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        const n = new Notification(title, { body: body, data: { route: route || '' } });
        n.onclick = function () {
          try { window.focus(); } catch (_) {}
          go();
          try { n.close(); } catch (_) {}
        };
        return;
      }
      if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(function (p) {
          if (p === 'granted') {
            const n = new Notification(title, { body: body, data: { route: route || '' } });
            n.onclick = function () { try { window.focus(); } catch (_) {} go(); };
          }
        });
      }
    }
  } catch (_) {}
}

function handleNotifyRoute(route) {
  route = route || {};
  const view = route.view || route;
  const clientId = route.clientId;
  if (typeof isAthleteRole === 'function' && isAthleteRole()) {
    if (view === 'clientChat' || view === 'message') return navigate('clientChat');
    if (view === 'check' || view === 'check_request') return navigate('athlete');
    if (view === 'exams' || view === 'exams_request') return navigate('exams');
    if (view === 'training' || view === 'program_assigned') return navigate('training');
    if (view === 'nutrition' || view === 'nutrition_assigned') return navigate('nutrition');
    if (view === 'supplements' || view === 'supplements_assigned') return navigate('supplements');
    if (view === 'therapy' || view === 'therapy_assigned') return navigate('therapy');
    return navigate('home');
  }
  if (clientId) {
    store.coachSessionActive = true;
    if (view === 'chat' || view === 'message' || view === 'ask_coach') return openCoachClientChat(clientId);
    if (view === 'training' || view === 'workout_started' || view === 'workout_done') {
      store.coachWorkspace = Object.assign({}, store.coachWorkspace || {}, { clientId: clientId });
      return enterCoachClientView('training');
    }
    return openCoachClient(clientId);
  }
  if (view === 'coachHub') return enterCoachSession();
}

function eventNotifyCopy(kind) {
  const map = {
    program_assigned: ['Scheda assegnata', 'Il coach ti ha assegnato un allenamento', { view: 'training' }],
    nutrition_assigned: ['Alimentazione aggiornata', 'Il coach ha inviato il piano alimentare', { view: 'nutrition' }],
    supplements_assigned: ['Integrazione aggiornata', 'Il coach ha inviato l’integrazione', { view: 'supplements' }],
    therapy_assigned: ['Terapia aggiornata', 'Il coach ha aggiornato la terapia', { view: 'therapy' }],
    exams_assigned: ['Esami aggiornati', 'Il coach ha caricato degli esami', { view: 'exams' }],
    exams_request: ['Richiesta esami', 'Il coach ha chiesto degli esami', { view: 'exams' }],
    check_request: ['Check richiesto', 'Il coach ha chiesto un check fisico', { view: 'check' }],
    message: ['Nuovo messaggio', 'Hai un messaggio dal coach', { view: 'clientChat' }],
    password_reset: ['Password aggiornata', 'Il coach ha reimpostato la password', { view: 'home' }],
    leave_confirmed: ['Collaborazione chiusa', 'Il coach ha confermato la chiusura', { view: 'home' }],
    change_approved: ['Modifica approvata', 'Il coach ha approvato la tua modifica', { view: 'training' }],
    change_rejected: ['Modifica rifiutata', 'Il coach ha rifiutato la modifica', { view: 'clientChat' }],
    max_freedom: ['Libertà aggiornata', 'Il coach ha cambiato il consenso di modifica', { view: 'home' }],
    coach_modified: ['Piano aggiornato', 'Il coach ha modificato qualcosa per te', { view: 'home' }],
    workout_started: ['Cliente in allenamento', 'Un atleta ha iniziato il workout', { view: 'coachClient' }],
    workout_done: ['Workout completato', 'Un atleta ha finalizzato l’allenamento', { view: 'coachClient' }]
  };
  return map[kind] || null;
}

async function pollPracticeInbox() {
  if (!store || !store.accountToken) return;
  try {
    if (typeof isAthleteRole === 'function' && isAthleteRole()) {
      const box = await practiceFetch('/api/client/inbox', { method: 'GET', headers: practiceHeaders(false) }, 12000);
      const maxId = (box.events || []).reduce(function (m, e) { return Math.max(m, Number(e.id || 0)); }, 0);
      if (!store.clientInboxReady) {
        store.clientInboxReady = true;
        store.clientSeenEventId = maxId;
        store.clientSeenMsgId = box.lastMessageId || 0;
        if (typeof persist === 'function') persist();
        return;
      }
      const seen = store.clientSeenEventId || 0;
      (box.events || []).forEach(function (e) {
        const id = Number(e.id || 0);
        if (id > seen && e.kind !== 'message') {
          const copy = eventNotifyCopy(e.kind);
          if (copy) notifyUser(copy[0], copy[1], copy[2] || { view: 'home' });
          if ((e.kind === 'program_assigned' || e.kind === 'nutrition_assigned' || e.kind === 'supplements_assigned' || e.kind === 'therapy_assigned' || e.kind === 'exams_assigned' || e.kind === 'change_approved' || e.kind === 'coach_modified') && typeof syncAccountData === 'function') {
            syncAccountData(true).then(function () {
              if (e.kind === 'change_approved') rememberApprovedProgram();
              if (typeof render === 'function') render();
            }).catch(function () {});
          }
          if (e.kind === 'max_freedom') refreshAthleteMe();
        }
      });
      if (box.unreadMessages && box.lastMessageId && box.lastMessageId !== store.clientSeenMsgId) {
        if (store.clientSeenMsgId) notifyUser('Nuovo messaggio', 'Il coach ti ha scritto', { view: 'clientChat' });
        store.clientSeenMsgId = box.lastMessageId;
      }
      store.clientSeenEventId = maxId;
      if (typeof persist === 'function') persist();
    } else if (typeof isCoachUnlocked === 'function' && isCoachUnlocked()) {
      const box = await practiceFetch('/api/coach/inbox', { method: 'GET', headers: practiceHeaders(false) }, 12000);
      const maxCoachId = (box.events || []).reduce(function (m, e) { return Math.max(m, Number(e.id || 0)); }, 0);
      if (!store.coachInboxReady) {
        store.coachInboxReady = true;
        store.coachSeenEventId = maxCoachId;
        if (typeof persist === 'function') persist();
        return;
      }
      const seen = store.coachSeenEventId || 0;
      (box.events || []).forEach(function (e) {
        const id = Number(e.id || 0);
        if (id > seen) {
          const route = { view: 'coachClient', clientId: String(e.client_id || '') };
          if (e.kind === 'message') notifyUser('Messaggio cliente', (e.display_name || 'Atleta') + ' ti ha scritto', Object.assign({}, route, { view: 'chat' }));
          else if (e.kind === 'ask_coach') notifyUser('Richiesta dal cliente', (e.display_name || 'Atleta') + ' chiede al coach', Object.assign({}, route, { view: 'chat' }));
          else if (e.kind === 'password_help') notifyUser('Recupero password', (e.display_name || 'Atleta') + ' ha chiesto la password', route);
          else if (e.kind === 'leave_request') notifyUser('Fine collaborazione', (e.display_name || 'Atleta') + ' ha chiesto di chiudere', route);
          else if (e.kind === 'change_request') notifyUser('Modifica da approvare', (e.display_name || 'Atleta') + ' vuole cambiare il programma', route);
          else if (e.kind === 'change_notice') notifyUser('Atleta ha modificato', (e.display_name || 'Atleta') + ' ha cambiato il programma', route);
          else if (e.kind === 'request_program') notifyUser('Richiesta scheda', (e.display_name || 'Atleta') + ' chiede la scheda', route);
          else if (e.kind === 'workout_started') notifyUser('In allenamento', (e.display_name || 'Atleta') + ' ha iniziato il workout', route);
          else if (e.kind === 'workout_done') notifyUser('Workout finito', (e.display_name || 'Atleta') + ' ha finalizzato', route);
        }
      });
      store.coachSeenEventId = (box.events || []).reduce(function (m, e) { return Math.max(m, Number(e.id || 0)); }, seen);
      if (typeof persist === 'function') persist();
    }
  } catch (_) {}
}

function renderPracticeView() {
  const c = typeof $ === 'function' ? $('view-container') : document.getElementById('view-container');
  if (!c) return false;
  if (currentView === 'coachHub') { ensurePracticeStyle(); c.innerHTML = ''; renderCoachHub(c); applyClientChrome(); return true; }
  if (currentView === 'clientChat') { ensurePracticeStyle(); c.innerHTML = ''; renderClientChat(c); applyClientChrome(); return true; }
  if (currentView === 'coachClient') { ensurePracticeStyle(); c.innerHTML = ''; renderCoachWorkspace(c); applyClientChrome(); return true; }
  if (currentView === 'coachChat') { ensurePracticeStyle(); c.innerHTML = ''; renderCoachChatPage(c); applyClientChrome(); return true; }
  stopChatPoll();
  return false;
}

function renderCoachChatPage(c) {
  const id = store.coachWorkspace && store.coachWorkspace.clientId;
  if (!id) {
    c.innerHTML = '<div class="cp-help">Seleziona un cliente.</div>';
    return;
  }
  ensureClientViewBanner();
  const name = (store.coachWorkspace.client && store.coachWorkspace.client.displayName) || 'Cliente';
  const videoOk = store.coachAllowVideocall !== false;
  c.innerHTML = '<div style="display:flex;flex-direction:column;height:calc(100dvh - 140px);min-height:420px;padding-bottom:8px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'coachClient\')">← SCHEDA</button>' +
    '<div style="text-align:center;flex:1;"><div style="font-size:10px;color:var(--gold);font-weight:800;">CHAT E2E 🔒</div>' +
    '<div style="font-size:16px;font-weight:900;color:#fff;">' + esc(name) + '</div></div>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'coachHub\')">HUB</button></div>' +
    '<div id="cp-wa-chat" style="flex:1;overflow:auto;background:#0a0a0a;border:1px solid #222;border-radius:12px;padding:10px;margin-bottom:10px;"></div>' +
    '<div id="cp-chat-attach-preview" class="cp-help"></div>' +
    '<div style="display:flex;gap:8px;align-items:center;">' +
    '<button class="btn btn-outline" style="font-size:12px;padding:10px;" onclick="pickChatAttachment()">📎</button>' +
    '<button class="btn btn-outline" style="font-size:12px;padding:10px;" onclick="startChatDictation(\'cp-chat-input\')">🎙</button>' +
    (videoOk ? '<button class="btn btn-outline" style="font-size:12px;padding:10px;" title="Videocall" onclick="startInternalVideocall(\'' + esc(id) + '\',\'coach\')">📹</button>' : '') +
    '<input id="cp-chat-input" type="text" placeholder="Messaggio cifrato…" style="flex:1;padding:12px;border-radius:20px;border:1px solid #333;background:#151515;color:#fff;">' +
    '<button class="btn btn-primary" style="border-radius:20px;padding:10px 14px;" onclick="sendCoachHumanMessage(\'' + esc(id) + '\')">➤</button></div>' +
    '<div class="cp-chat-tools" style="margin-top:8px;">' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="clearChatForMe(\'' + esc(id) + '\',\'coach\')">AZZERA (PER ME)</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="newChatThread(\'' + esc(id) + '\',\'coach\')">NUOVA CHAT</button></div></div>';
  window.__cpChatInputId = 'cp-chat-input';
  ensureE2EReady('coach', id).then(function () { startChatPoll(id, 'cp-wa-chat', 'coach'); });
}

async function refreshAthleteMe() {
  if (!store.accountToken || typeof isAthleteRole !== 'function' || !isAthleteRole()) return;
  try {
    const me = await practiceFetch('/api/client/me', { method: 'GET', headers: practiceHeaders(false) }, 15000);
    store.clientProfile = me.client || store.clientProfile;
    store.clientEvents = me.events || [];
    store.coachOnline = !!me.coachOnline;
    store.coachLastSeen = me.coachLastSeen || null;
    store.role = 'athlete';
    store.clientShell = true;
    if (typeof persist === 'function') persist();
    if (me.client && me.client.needIntake) showClientIntake(me.client.intake || {});
  } catch (_) {}
}

async function refreshCoachStatus() {
  if (!store.accountToken || (typeof isAthleteRole === 'function' && isAthleteRole())) return;
  try {
    const s = await practiceFetch('/api/coach/status', { method: 'GET', headers: practiceHeaders(false) }, 12000);
    store.coachUnlocked = !!(s && s.unlocked);
    store.coachHidePresence = !!(s && s.hidePresence);
    store.coachAllowVideocall = s && s.allowVideocall !== false;
    if (typeof persist === 'function') persist();
  } catch (_) {}
}

function startPresenceHeartbeat() {
  if (window.__cpPresenceTimer) return;
  const beat = function () {
    if (!store || !store.accountToken) return;
    practiceFetch('/api/presence/ping', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 8000).catch(function () {});
  };
  beat();
  window.__cpPresenceTimer = setInterval(beat, 45000);
}

async function bootCoachPractice() {
  ensurePracticeStyle();
  ensurePracticeOverlays();
  ensureAssignBanner();
  requestNotifyPermission();
  try {
    const shell = JSON.parse(localStorage.getItem('GS_CLIENT_SHELL') || 'null');
    if (shell && shell.locked && shell.inviteToken) {
      store.clientShell = true;
      store.inviteToken = store.inviteToken || shell.inviteToken;
    }
  } catch (_) {}
  const token = detectInviteToken() || store.inviteToken;
  if (token) {
    store.inviteToken = token;
    store.clientShell = true;
  }
  applyClientChrome();
  if (token && !(typeof isAthleteRole === 'function' && isAthleteRole() && store.accountToken)) {
    showClientInvite(token);
    return;
  }
  if (typeof isAthleteRole === 'function' && isAthleteRole() && store.accountToken) {
    store.clientShell = true;
    await refreshAthleteMe();
    startPresenceHeartbeat();
    if (store.clientProfile && store.clientProfile.needIntake) showClientIntake(store.clientProfile.intake || {});
    else if (!store.clientTutorialDone) showClientTutorial(false);
    flushClientOutbox();
  } else {
    await refreshCoachStatus();
    if (store.coachUnlocked) startPresenceHeartbeat();
    applyClientChrome();
  }
  if (!window.__cpInboxTimer) {
    window.__cpInboxTimer = setInterval(pollPracticeInbox, 8000);
    setTimeout(pollPracticeInbox, 1500);
  }
}

function clientProgramSlice() {
  return {
    weeks: (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.weeks)) ? DATA.weeks : [],
    nutrition: (DATA && DATA.nutrition) || store.nutrition || null,
    supplementation: (DATA && DATA.supplementation) || store.supplementation || null,
    therapy: (DATA && DATA.therapy) || store.therapy || null,
    exams: (DATA && DATA.exams) || store.exams || null
  };
}

function rememberApprovedProgram() {
  try {
    const slice = JSON.parse(JSON.stringify(clientProgramSlice()));
    store.clientApprovedProgram = slice;
    store.clientApprovedFp = JSON.stringify(slice);
  } catch (_) {}
}

function restoreApprovedProgram() {
  const a = store.clientApprovedProgram;
  if (!a || typeof DATA === 'undefined') return;
  window.__cpProgramLock = true;
  try {
    DATA.weeks = JSON.parse(JSON.stringify(a.weeks || []));
    DATA.nutrition = a.nutrition;
    DATA.supplementation = a.supplementation;
    DATA.therapy = a.therapy;
    DATA.exams = a.exams;
    store.nutrition = a.nutrition;
    store.supplementation = a.supplementation;
    store.therapy = a.therapy;
    store.exams = a.exams;
  } catch (_) {}
  setTimeout(function () { window.__cpProgramLock = false; }, 30);
}

function summarizeProgramDiff(prev, next) {
  const bits = [];
  function same(a, b) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (_) { return a === b; }
  }
  if (!same(prev && prev.weeks, next.weeks)) bits.push('allenamento');
  if (!same(prev && prev.nutrition, next.nutrition)) bits.push('alimentazione');
  if (!same(prev && prev.supplementation, next.supplementation)) bits.push('integrazione');
  if (!same(prev && prev.therapy, next.therapy)) bits.push('terapia');
  if (!same(prev && prev.exams, next.exams)) bits.push('esami');
  return bits.join(', ') || 'programma';
}

var __cpChangeTimer = null;
function queueAthleteProgramChange(kind, summary, data) {
  clearTimeout(__cpChangeTimer);
  window.__cpPendingChange = { kind: kind, summary: summary, data: data };
  __cpChangeTimer = setTimeout(async function () {
    const pending = window.__cpPendingChange;
    window.__cpPendingChange = null;
    if (!pending) return;
    try {
      const path = pending.kind === 'notice' ? '/api/client/change-notice' : '/api/client/change-request';
      await practiceFetch(path, {
        method: 'POST', headers: practiceHeaders(true),
        body: JSON.stringify({ summary: pending.summary, data: pending.data })
      }, 20000);
      practiceToast(pending.kind === 'notice' ? 'Modifica salvata. Avviso inviato al coach.' : 'Richiesta di modifica inviata al coach.', 'success');
    } catch (err) {
      enqueueClientOutbox({ type: pending.kind === 'notice' ? 'change-notice' : 'change-request', summary: pending.summary, data: pending.data });
      practiceToast((err && err.message) || 'Modifica in coda offline', 'warning');
    }
  }, 700);
}

function gateAthleteProgramPersist() {
  if (window.__cpProgramLock) return;
  if (typeof isAthleteRole !== 'function' || !isAthleteRole()) return;
  if (store.coachAssigning) return;
  let fp;
  let slice;
  try {
    slice = clientProgramSlice();
    fp = JSON.stringify(slice);
  } catch (_) { return; }
  if (!store.clientApprovedFp) {
    if (slice.weeks && slice.weeks.length) rememberApprovedProgram();
    return;
  }
  if (fp === store.clientApprovedFp) return;
  const summary = summarizeProgramDiff(store.clientApprovedProgram, slice);
  if (store.clientProfile && store.clientProfile.allowMaxFreedom) {
    rememberApprovedProgram();
    queueAthleteProgramChange('notice', summary, slice);
    return;
  }
  restoreApprovedProgram();
  queueAthleteProgramChange('request', summary, slice);
}

function wrapPracticeHooks() {
  if (typeof navigate === 'function' && !navigate.__cpWrapped) {
    const _nav = navigate;
    navigate = function (v, e) {
      const raw = v;
      if (store && store.coachSessionActive && !store.coachAssigning && !(typeof isAthleteRole === 'function' && isAthleteRole())) {
        const coachCore = { coachHub: 1, coachClient: 1, coachChat: 1 };
        const clientDomains = { training: 1, nutrition: 1, supplements: 1, therapy: 1, exams: 1, stats: 1, athlete: 1 };
        const ok = coachCore[raw] || (store.coachViewingClient && clientDomains[raw]);
        if (!ok) {
          if (!confirm('Stai uscendo dall’hub Coach per tornare all’app personale. Continuare?')) return;
          store.coachSessionActive = false;
          if (store.coachViewingClient) {
            leaveCoachClientView(true);
          }
          if (typeof persist === 'function') persist();
        }
      }
      v = gatePracticeView(v);
      if (v === 'coachHub' || v === 'clientChat' || v === 'coachClient' || v === 'coachChat') {
        if (e && e.preventDefault) e.preventDefault();
        if (v === 'coachHub' || v === 'coachClient' || v === 'coachChat') store.coachSessionActive = true;
        currentView = v;
        document.querySelectorAll('.nav-item').forEach(function (el) { el.classList.remove('active'); });
        if (v === 'clientChat') {
          const a = document.getElementById('nav-stats');
          if (a) a.classList.add('active');
        }
        renderPracticeView();
        ensureAssignBanner();
        applyClientChrome();
        return;
      }
      _nav(v, e);
      applyClientChrome();
      ensureAssignBanner();
      ensureClientViewBanner();
    };
    navigate.__cpWrapped = true;
  }
  if (typeof render === 'function' && !render.__cpWrapped) {
    const _render = render;
    render = function () {
      if (renderPracticeView()) return;
      _render();
      try {
        const c = document.getElementById('view-container');
        if (c && currentView === 'home' && typeof isAthleteRole === 'function' && isAthleteRole()) {
          if (!DATA || !DATA.weeks || !DATA.weeks.length) c.innerHTML = athleteHomeHtml();
          else if (!c.querySelector('[data-cp-reload]')) {
            const hold = document.createElement('div');
            hold.setAttribute('data-cp-reload', '1');
            hold.style.cssText = 'display:flex;justify-content:flex-end;margin:0 0 8px;';
            hold.innerHTML = '<button class="btn btn-outline" style="font-size:11px;" onclick="reloadClientHome()">⟳ AGGIORNA</button>';
            c.insertBefore(hold, c.firstChild);
          }
        }
        if (c && (currentView === 'athlete' || currentView === 'settings' || currentView === 'home' || currentView === 'pricing')) injectCoachUnlockInto(c);
      } catch (_) {}
      applyClientChrome();
      ensureAssignBanner();
    };
    render.__cpWrapped = true;
  }
  if (typeof askCoachAiForDomain === 'function' && !askCoachAiForDomain.__cpWrapped) {
    const _ask = askCoachAiForDomain;
    askCoachAiForDomain = function (domain) {
      if (typeof isAthleteRole === 'function' && isAthleteRole()) {
        askRealCoachForDomain(domain);
        return;
      }
      _ask(domain);
    };
    askCoachAiForDomain.__cpWrapped = true;
    window.askCoachAiForDomain = askCoachAiForDomain;
  }
  if (typeof persist === 'function' && !persist.__cpWrapped) {
    const _persist = persist;
    persist = function () {
      try { gateAthleteProgramPersist(); } catch (_) {}
      return _persist.apply(this, arguments);
    };
    persist.__cpWrapped = true;
    window.persist = persist;
  }
  if (typeof applyCoachProposal === 'function' && !applyCoachProposal.__cpWrapped) {
    const _apply = applyCoachProposal;
    applyCoachProposal = function (proposalId) {
      const ret = _apply.apply(this, arguments);
      if (typeof isAthleteRole === 'function' && isAthleteRole() && store.clientProfile && store.clientProfile.allowMaxFreedom) {
        try {
          Promise.resolve(ret).then(function () {
            queueAthleteProgramChange('notice', 'proposta AI applicata', clientProgramSlice());
          }).catch(function () {});
        } catch (_) {}
      }
      return ret;
    };
    applyCoachProposal.__cpWrapped = true;
    window.applyCoachProposal = applyCoachProposal;
  }
  if (typeof syncAccountData === 'function' && !syncAccountData.__cpWrapped) {
    const _sync = syncAccountData;
    syncAccountData = function () {
      const ret = _sync.apply(this, arguments);
      Promise.resolve(ret).then(function () {
        if (typeof isAthleteRole === 'function' && isAthleteRole()) rememberApprovedProgram();
      }).catch(function () {});
      return ret;
    };
    syncAccountData.__cpWrapped = true;
    window.syncAccountData = syncAccountData;
  }
  if (typeof applyChromeI18n === 'function' && !applyChromeI18n.__cpWrapped) {
    const _chrome = applyChromeI18n;
    applyChromeI18n = function () { _chrome(); applyClientChrome(); };
    applyChromeI18n.__cpWrapped = true;
  }
  if (typeof logoutAccount === 'function' && !logoutAccount.__cpWrapped) {
    const _lo = logoutAccount;
    logoutAccount = function () {
      const token = store.inviteToken;
      const athlete = typeof isAthleteRole === 'function' && isAthleteRole();
      const shell = !!(store.clientShell || athlete);
      try { sessionStorage.removeItem('GS_SESSION_AUTH'); } catch (_) {}
      _lo();
      store.role = null;
      store.clientProfile = null;
      store.coachWorkspace = null;
      store.coachSessionActive = false;
      store.accountToken = null;
      store.accountUser = null;
      if (shell && token) {
        store.clientShell = true;
        store.inviteToken = token;
        try {
          localStorage.setItem('GS_CLIENT_SHELL', JSON.stringify({ inviteToken: token, locked: true, at: Date.now() }));
        } catch (_) {}
        if (typeof persist === 'function') persist();
        showClientInvite(token);
        applyClientChrome();
        return;
      }
      applyClientChrome();
    };
    logoutAccount.__cpWrapped = true;
  }
  if (typeof openAccount === 'function' && !openAccount.__cpWrapped) {
    const _oa = openAccount;
    openAccount = function () {
      if (isClientShellLocked()) {
        const t = store.inviteToken || detectInviteToken();
        if (t) showClientInvite(t);
        else practiceToast('Spazio cliente: usa il link del coach.', 'warning');
        return;
      }
      return _oa.apply(this, arguments);
    };
    openAccount.__cpWrapped = true;
    window.openAccount = openAccount;
  }
  if (typeof maybeShowRewardsOnboarding === 'function' && !maybeShowRewardsOnboarding.__cpWrapped) {
    const _rw = maybeShowRewardsOnboarding;
    maybeShowRewardsOnboarding = function () {
      if (typeof isAthleteRole === 'function' && isAthleteRole()) {
        if (typeof applyFocusUi === 'function') applyFocusUi();
        return;
      }
      _rw();
    };
    maybeShowRewardsOnboarding.__cpWrapped = true;
  }
  if (typeof finalizeWorkout === 'function' && !finalizeWorkout.__cpWrapped) {
    const _fw = finalizeWorkout;
    finalizeWorkout = function () {
      const ret = _fw.apply(this, arguments);
      if (typeof isAthleteRole === 'function' && isAthleteRole()) {
        enqueueClientOutbox({ type: 'workout-ping' });
        flushClientOutbox();
      }
      return ret;
    };
    finalizeWorkout.__cpWrapped = true;
  }
  if (typeof markSessionClockIfNeeded === 'function' && !markSessionClockIfNeeded.__cpWrapped) {
    const _ms = markSessionClockIfNeeded;
    markSessionClockIfNeeded = function () {
      const had = !!(store && store.sessionStartedAt);
      const ret = _ms.apply(this, arguments);
      if (!had && store && store.sessionStartedAt && typeof isAthleteRole === 'function' && isAthleteRole()) {
        practiceFetch('/api/client/workout-start', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 8000).catch(function () {});
      }
      return ret;
    };
    markSessionClockIfNeeded.__cpWrapped = true;
    window.markSessionClockIfNeeded = markSessionClockIfNeeded;
  }
}

wrapPracticeHooks();

window.bootCoachPractice = bootCoachPractice;
window.showClientInvite = showClientInvite;
window.submitClientInviteLogin = submitClientInviteLogin;
window.showClientIntake = showClientIntake;
window.submitClientIntake = submitClientIntake;
window.showClientTutorial = showClientTutorial;
window.drawClientTutorial = drawClientTutorial;
window.closeClientTutorial = closeClientTutorial;
window.showDemoUnlock = showDemoUnlock;
window.openCoachOrUnlock = openCoachOrUnlock;
/* ——— E2E chat crypto (ECDH P-256 + AES-GCM) ——— */
function b64FromBuf(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function bufFromB64(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out.buffer;
}

async function getOrCreateE2EKeyPair() {
  const raw = localStorage.getItem('NURVAN_E2E_KEYPAIR');
  if (raw) {
    try {
      const j = JSON.parse(raw);
      const privateKey = await crypto.subtle.importKey('jwk', j.privateKey, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
      const publicKey = await crypto.subtle.importKey('jwk', j.publicKey, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
      return { privateKey, publicKey, publicJwk: j.publicKey };
    } catch (_) {}
  }
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  localStorage.setItem('NURVAN_E2E_KEYPAIR', JSON.stringify({ publicKey: publicJwk, privateKey: privateJwk }));
  return { privateKey: pair.privateKey, publicKey: pair.publicKey, publicJwk: publicJwk };
}

async function ensureE2EReady(role, clientId) {
  if (!window.crypto || !crypto.subtle) return null;
  const kp = await getOrCreateE2EKeyPair();
  const pub = JSON.stringify(kp.publicJwk);
  try {
    if (role === 'athlete') {
      await practiceFetch('/api/client/e2e-key', { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ publicKey: pub }) }, 12000);
    } else if (clientId) {
      await practiceFetch('/api/coach/clients/' + encodeURIComponent(clientId) + '/e2e-key', {
        method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ publicKey: pub })
      }, 12000);
    }
  } catch (_) {}
  return kp;
}

async function resolvePeerPublicKey(role, clientId) {
  let peer = store.__cpE2EPeer || {};
  if (role === 'coach') {
    if (!peer.athlete && clientId) {
      try {
        const r = await practiceFetch('/api/coach/clients/' + encodeURIComponent(clientId) + '/e2e-keys', { method: 'GET', headers: practiceHeaders(false) }, 10000);
        peer = r.e2e || peer;
        store.__cpE2EPeer = peer;
      } catch (_) {}
    }
    return peer.athlete || null;
  }
  if (!peer.coach) {
    try {
      const r = await practiceFetch('/api/client/e2e-keys', { method: 'GET', headers: practiceHeaders(false) }, 10000);
      peer = r.e2e || peer;
      store.__cpE2EPeer = peer;
    } catch (_) {}
  }
  return peer.coach || null;
}

async function deriveSharedAes(role, clientId) {
  const kp = await getOrCreateE2EKeyPair();
  const peerJwkStr = await resolvePeerPublicKey(role, clientId);
  if (!peerJwkStr) return null;
  let peerJwk;
  try { peerJwk = typeof peerJwkStr === 'string' ? JSON.parse(peerJwkStr) : peerJwkStr; } catch (_) { return null; }
  const peerKey = await crypto.subtle.importKey('jwk', peerJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
  const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: peerKey }, kp.privateKey, 256);
  return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptChatBody(plain, role, clientId) {
  if (!plain) return '';
  try {
    const key = await deriveSharedAes(role, clientId);
    if (!key) return plain; // peer key not ready yet — send plaintext until both published
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(plain));
    const packed = new Uint8Array(iv.length + ct.byteLength);
    packed.set(iv, 0);
    packed.set(new Uint8Array(ct), iv.length);
    return 'E2E1:' + b64FromBuf(packed.buffer);
  } catch (_) {
    return plain;
  }
}

async function decryptChatBody(body, role, clientId) {
  const text = String(body || '');
  if (text.indexOf('E2E1:') !== 0) return text;
  try {
    const key = await deriveSharedAes(role, clientId);
    if (!key) return '[Messaggio cifrato — in attesa chiavi]';
    const packed = new Uint8Array(bufFromB64(text.slice(5)));
    const iv = packed.slice(0, 12);
    const ct = packed.slice(12);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch (_) {
    return '[Messaggio cifrato]';
  }
}

/* ——— Internal WebRTC videocall ——— */
var __cpCall = { pc: null, local: null, remote: null, role: null, clientId: null, poll: null, lastId: 0 };

function ensureCallOverlay() {
  let ov = document.getElementById('cp-call-overlay');
  if (ov) return ov;
  ov = document.createElement('div');
  ov.id = 'cp-call-overlay';
  ov.innerHTML = '<div style="padding:12px;display:flex;justify-content:space-between;align-items:center;gap:8px;background:#111;border-bottom:1px solid #333;">' +
    '<div style="color:var(--gold);font-weight:800;font-size:12px;">VIDEOCALL INTERNA</div>' +
    '<button class="btn btn-outline" style="font-size:11px;" onclick="hangupInternalVideocall()">CHIUDI</button></div>' +
    '<div style="position:relative;flex:1;background:#000;">' +
    '<video id="cp-call-remote" autoplay playsinline style="width:100%;height:100%;object-fit:cover;"></video>' +
    '<video id="cp-call-local" autoplay playsinline muted></video></div>';
  document.body.appendChild(ov);
  return ov;
}

async function postCallSignal(role, clientId, signal) {
  const path = role === 'athlete'
    ? '/api/client/call/signal'
    : '/api/coach/clients/' + encodeURIComponent(clientId) + '/call/signal';
  await practiceFetch(path, { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ signal: signal }) }, 15000);
}

async function pollCallSignals() {
  if (!__cpCall.pc) return;
  const role = __cpCall.role;
  const clientId = __cpCall.clientId;
  const path = role === 'athlete'
    ? '/api/client/call/signals?after=' + (__cpCall.lastId || 0)
    : '/api/coach/clients/' + encodeURIComponent(clientId) + '/call/signals?after=' + (__cpCall.lastId || 0);
  try {
    const res = await practiceFetch(path, { method: 'GET', headers: practiceHeaders(false) }, 12000);
    const list = res.signals || [];
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      __cpCall.lastId = Math.max(__cpCall.lastId, row.id || 0);
      if (row.from_role === role) continue;
      await handleRemoteSignal(row.signal);
    }
  } catch (_) {}
}

async function handleRemoteSignal(sig) {
  const pc = __cpCall.pc;
  if (!pc || !sig) return;
  if (sig.type === 'offer') {
    await pc.setRemoteDescription(sig);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await postCallSignal(__cpCall.role, __cpCall.clientId, pc.localDescription);
  } else if (sig.type === 'answer') {
    await pc.setRemoteDescription(sig);
  } else if (sig.candidate) {
    try { await pc.addIceCandidate(sig); } catch (_) {}
  } else if (sig.type === 'hangup') {
    hangupInternalVideocall(true);
  }
}

async function startInternalVideocall(clientId, role) {
  if (role === 'coach' && store.coachAllowVideocall === false) {
    practiceToast('Hai disabilitato le videocall dall’hub', 'warning');
    return;
  }
  if (__cpCall.pc) { practiceToast('Chiamata già attiva', 'info'); return; }
  ensureCallOverlay().classList.add('active');
  __cpCall.role = role;
  __cpCall.clientId = clientId;
  __cpCall.lastId = 0;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    __cpCall.local = stream;
    document.getElementById('cp-call-local').srcObject = stream;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    __cpCall.pc = pc;
    stream.getTracks().forEach(function (t) { pc.addTrack(t, stream); });
    pc.ontrack = function (ev) {
      const remote = document.getElementById('cp-call-remote');
      if (remote) remote.srcObject = ev.streams[0];
    };
    pc.onicecandidate = function (ev) {
      if (ev.candidate) postCallSignal(role, clientId, ev.candidate.toJSON()).catch(function () {});
    };
    // Either side can start: create offer if we don't have remote yet
    if (!pc.currentRemoteDescription) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await postCallSignal(role, clientId, pc.localDescription);
    }
    __cpCall.poll = setInterval(pollCallSignals, 1500);
    pollCallSignals();
    practiceToast('Videocall avviata', 'success');
  } catch (err) {
    hangupInternalVideocall(true);
    practiceToast((err && err.message) || 'Camera/microfono non disponibili', 'danger');
  }
}

function hangupInternalVideocall(silent) {
  try {
    if (__cpCall.pc && !silent) postCallSignal(__cpCall.role, __cpCall.clientId, { type: 'hangup' }).catch(function () {});
  } catch (_) {}
  if (__cpCall.poll) { clearInterval(__cpCall.poll); __cpCall.poll = null; }
  if (__cpCall.local) { __cpCall.local.getTracks().forEach(function (t) { t.stop(); }); }
  if (__cpCall.pc) { try { __cpCall.pc.close(); } catch (_) {} }
  __cpCall = { pc: null, local: null, remote: null, role: null, clientId: null, poll: null, lastId: 0 };
  const ov = document.getElementById('cp-call-overlay');
  if (ov) ov.classList.remove('active');
  const loc = document.getElementById('cp-call-local');
  const rem = document.getElementById('cp-call-remote');
  if (loc) loc.srcObject = null;
  if (rem) rem.srcObject = null;
}

window.startInternalVideocall = startInternalVideocall;
window.hangupInternalVideocall = hangupInternalVideocall;
window.confirmDemoUnlock = confirmDemoUnlock;
window.openAddClientWizard = openAddClientWizard;
window.setAddClientMode = setAddClientMode;
window.submitAddClient = submitAddClient;
window.loadCoachClientList = loadCoachClientList;
window.debounceCoachClientList = debounceCoachClientList;
window.copyClientInvite = copyClientInvite;
window.toggleClientPaid = toggleClientPaid;
window.revokeCoachClient = revokeCoachClient;
window.removeCoachClient = removeCoachClient;
window.openCoachClient = openCoachClient;
window.openCoachClientChat = openCoachClientChat;
window.assignActiveToClient = assignActiveToClient;
window.openAssignChooser = openAssignChooser;
window.beginAssignSandbox = beginAssignSandbox;
window.confirmAssignSandbox = confirmAssignSandbox;
window.cancelAssignSandbox = cancelAssignSandbox;
window.exitCoachSession = exitCoachSession;
window.enterCoachSession = enterCoachSession;
window.enterCoachClientView = enterCoachClientView;
window.leaveCoachClientView = leaveCoachClientView;
window.requestCheckFromClient = requestCheckFromClient;
window.editClientSchedule = editClientSchedule;
window.toggleCoachHidePresence = toggleCoachHidePresence;
window.handleNotifyRoute = handleNotifyRoute;
window.sendCheckToClient = sendCheckToClient;
window.pushCoachClientEdits = pushCoachClientEdits;
window.askExerciseInfoToCoach = askExerciseInfoToCoach;
window.renderCoachChatPage = renderCoachChatPage;
window.requestExamsFromClient = requestExamsFromClient;
window.resetClientPassword = resetClientPassword;
window.confirmLeaveClient = confirmLeaveClient;
window.toggleMaxFreedom = toggleMaxFreedom;
window.approveClientChange = approveClientChange;
window.rejectClientChange = rejectClientChange;
window.sendCoachHumanMessage = sendCoachHumanMessage;
window.sendAthleteHumanMessage = sendAthleteHumanMessage;
window.startChatDictation = startChatDictation;
window.pickChatAttachment = pickChatAttachment;
window.clearChatForMe = clearChatForMe;
window.newChatThread = newChatThread;
window.toggleClientLoginPassword = toggleClientLoginPassword;
window.requestClientPasswordHelp = requestClientPasswordHelp;
window.askRealCoachForDomain = askRealCoachForDomain;
window.requestLeaveCoach = requestLeaveCoach;
window.reloadClientHome = reloadClientHome;
window.requestProgramFromCoach = requestProgramFromCoach;
window.copyOrShare = copyOrShare;
window.showOverlay = showOverlay;
window.applyClientChrome = applyClientChrome;
window.CLIENT_INTAKE_FIELDS = CLIENT_INTAKE_FIELDS;
window.isAthleteRole = isAthleteRole;
window.isCoachUnlocked = isCoachUnlocked;
window.clientProgramSlice = clientProgramSlice;
window.queueAthleteProgramChange = queueAthleteProgramChange;
window.ensureAssignBanner = ensureAssignBanner;
window.rememberApprovedProgram = rememberApprovedProgram;
