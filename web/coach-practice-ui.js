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
  { t: 'Check e pagamenti', d: 'Dal Menu fai il check fisico quando te lo chiede. Se un pagamento è in sospeso, lo vedi in Home.' }
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

function gatePracticeView(v) {
  if (typeof isAthleteRole !== 'function' || !isAthleteRole()) return v;
  const blocked = { community: 1, pricing: 1, coachHub: 1, coachClient: 1, import: 1 };
  if (blocked[v]) return 'home';
  if ((v === 'programs' || v === 'db') && !(store.clientProfile && store.clientProfile.allowProgramDb)) return 'home';
  return v;
}

function applyClientChrome() {
  try {
    const athlete = typeof isAthleteRole === 'function' && isAthleteRole();
    const unlocked = typeof isCoachUnlocked === 'function' && isCoachUnlocked();
    if (document.body) {
      document.body.classList.toggle('role-athlete', !!athlete);
      document.body.classList.toggle('coach-unlocked', !!unlocked);
    }
    const stats = typeof $ === 'function' ? $('nav-stats') : document.getElementById('nav-stats');
    const ai = typeof $ === 'function' ? $('nav-ai') : document.getElementById('nav-ai');
    if (stats) {
      const span = stats.querySelector('span');
      if (athlete) {
        if (span) span.textContent = 'COACH';
        stats.onclick = function (event) { navigate('clientChat', event); };
      } else {
        stats.onclick = function (event) { navigate('stats', event); };
      }
    }
    if (ai) ai.style.display = athlete ? 'none' : '';
    document.querySelectorAll('[data-hub="full"]').forEach(function (el) {
      el.style.display = athlete ? 'none' : '';
    });
    document.querySelectorAll('[data-hub="coach"]').forEach(function (el) {
      el.style.display = athlete ? 'none' : 'flex';
    });
    const coachBtn = document.getElementById('coach-unlock-button');
    if (coachBtn) {
      coachBtn.style.display = athlete ? 'none' : '';
      coachBtn.textContent = unlocked ? 'HUB COACH' : 'SBLOCCA COACH';
    }
    document.querySelectorAll('[data-hub="athlete"]').forEach(function (el) {
      el.style.display = athlete ? 'flex' : 'none';
    });
    document.querySelectorAll('[data-hub="programs"]').forEach(function (el) {
      const allow = !athlete || (store.clientProfile && store.clientProfile.allowProgramDb);
      el.style.display = allow ? '' : 'none';
    });
  } catch (err) {
    console.warn('[CLIENT_CHROME]', err);
  }
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
    '.cp-msg.them{background:#151515;border:1px solid #333;}'
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
    '<div id="cp-add" class="cp-overlay"><div class="cp-panel" id="cp-add-panel"></div></div>'
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
      await navigator.share({ title: label || 'Nurvan', text: text, url: text });
      return;
    }
  } catch (_) {}
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      practiceToast('Link copiato', 'success');
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
      else if (it.type === 'message') await practiceFetch('/api/client/messages', { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ body: it.body }) });
      else if (it.type === 'request-program') await practiceFetch('/api/client/request-program', { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ note: it.note || '' }) });
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
    '<div class="cp-field"><label>Password</label><input id="cp-login-pass" type="password" autocomplete="current-password"></div>' +
    '<div id="cp-invite-status" class="cp-help"></div>' +
    '<button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="submitClientInviteLogin()">ACCEDI</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="showOverlay(\'cp-invite\', false)">CHIUDI</button>';
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
    store.accountToken = payload.token;
    store.accountUser = payload.user;
    store.role = 'athlete';
    store.clientProfile = payload.client || null;
    if (typeof persist === 'function') persist();
    showOverlay('cp-invite', false);
    try { await syncAccountData(true); } catch (_) {}
    applyClientChrome();
    if (payload.client && payload.client.needIntake) showClientIntake(payload.client.intake || { firstName: '', lastName: '' });
    else showClientTutorial(false);
    if (typeof render === 'function') render();
    practiceToast('Bentornato, ' + (payload.user && payload.user.name || username), 'success');
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
  if (typeof isCoachUnlocked === 'function' && isCoachUnlocked()) navigate('coachHub');
  else showDemoUnlock();
}
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
    if (typeof persist === 'function') persist();
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
  const q = esc(window.__cpClientQ || '');
  c.innerHTML = '<div style="margin-bottom:12px;"><span style="font-size:10px;color:var(--gold);font-weight:800;">HUB COACH</span>' +
    '<h1 style="color:#fff;margin:2px 0 0;font-size:22px;">I tuoi clienti</h1></div>' +
    '<div class="card" style="padding:12px;margin-bottom:12px;">' +
    '<input id="cp-client-q" type="search" placeholder="Cerca nome…" value="' + q + '" oninput="window.__cpClientQ=this.value;debounceCoachClientList()">' +
    '<button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="openAddClientWizard()">AGGIUNGI CLIENTE</button></div>' +
    '<div id="cp-client-list"><div class="cp-help">Caricamento…</div></div>';
  loadCoachClientList();
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
      return '<div class="card" style="padding:12px;margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">' +
        '<div><div style="font-size:15px;font-weight:900;color:#fff;">' + esc(cl.displayName) + '</div>' +
        '<div style="font-size:11px;color:#888;">@' + esc(cl.username) + ' · ' + esc(badge) + ' · ' + esc(paid) +
        (cl.unreadCount ? ' · ' + cl.unreadCount + ' nuovi' : '') + '</div></div></div>' +
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
    const msg = 'Link: ' + url + '\nUtente: ' + user + '\nPassword: ' + password;
    await copyOrShare(url, 'Invito Nurvan');
    practiceToast('Creato ' + firstName + '. Utente ' + user, 'success');
    try { alert('Invito pronto.\n\n' + msg + (intakeMode === 'new' ? '\n\nAl primo accesso compilerà il questionario.' : '\n\nTransizione: entra senza questionario.')); } catch (_) {}
    if (currentView === 'coachHub') loadCoachClientList();
    else navigate('coachHub');
  } catch (err) {
    if (status) status.textContent = (err && err.message) || 'Creazione non riuscita.';
  }
}

async function copyClientInvite(id, token) {
  let url = '';
  if (store.__cpOrigin && token) url = store.__cpOrigin + '/c/' + token;
  if (!url) {
    try {
      const snap = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/snapshot', { method: 'GET', headers: practiceHeaders(false) }, 20000);
      url = snap.inviteUrl || url;
    } catch (_) {}
  }
  if (!url) { practiceToast('Link non disponibile', 'warning'); return; }
  copyOrShare(url, 'Invito Nurvan');
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
  store.coachWorkspace = { clientId: id };
  if (typeof persist === 'function') persist();
  navigate('coachClient');
}

function openCoachClientChat(id) {
  store.coachWorkspace = Object.assign({}, store.coachWorkspace || {}, { clientId: id, chat: true });
  navigate('coachClient');
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
      loadedAt: Date.now()
    };
    const cl = snap.client || {};
    const prog = (snap.data && snap.data.activeProgram) || {};
    const weeks = (prog.weeks && prog.weeks.length) || 0;
    const intake = store.coachWorkspace.intake || {};
    const intakeRows = CLIENT_INTAKE_FIELDS.filter(function (f) { return intake[f.key]; }).map(function (f) {
      return '<div class="cp-row"><span style="color:#888;font-size:11px;">' + esc(f.label) + '</span><span style="font-size:12px;color:#fff;">' + esc(intake[f.key]) + '</span></div>';
    }).join('');
    c.innerHTML = '<button class="btn btn-outline" style="font-size:10px;margin-bottom:10px;" onclick="navigate(\'coachHub\')">← LISTA</button>' +
      '<h1 style="color:#fff;font-size:22px;margin:0 0 4px;">' + esc(cl.displayName || 'Cliente') + '</h1>' +
      '<div style="font-size:11px;color:#888;margin-bottom:12px;">@' + esc(cl.username || '') + ' · ' +
      (cl.intakeMode === 'transition' ? 'Transizione' : 'Nuovo') + (cl.intakeDone ? ' · questionario ok' : ' · questionario in attesa') + '</div>' +
      '<div class="card" style="padding:12px;margin-bottom:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:6px;">Programma</div>' +
      '<div style="font-size:12px;color:#ccc;">' + esc(prog.title || 'Nessuna scheda assegnata') + (weeks ? ' · ' + weeks + ' settimane' : '') + '</div>' +
      '<button class="btn btn-primary" style="width:100%;margin-top:10px;font-size:11px;" onclick="assignActiveToClient(\'' + esc(id) + '\')">ASSEGNA SCHEDA ATTIVA</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="copyOrShare(\'' + esc(snap.inviteUrl || '') + '\',\'Invito\')">COPIA LINK UNICO</button></div>' +
      '<div class="card" style="padding:12px;margin-bottom:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:6px;">Anagrafica acquisizione</div>' +
      (intakeRows || '<div class="cp-help">Questionario non ancora compilato.</div>') + '</div>' +
      '<div class="card" style="padding:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:8px;">Chat</div>' +
      '<div id="cp-ws-chat" style="min-height:80px;"></div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;"><input id="cp-ws-msg" type="text" placeholder="Messaggio al cliente…">' +
      '<button class="btn btn-primary" onclick="sendCoachHumanMessage(\'' + esc(id) + '\')">INVIA</button></div></div>';
    loadHumanMessages(id, 'cp-ws-chat', 'coach');
  } catch (err) {
    c.innerHTML = '<div class="cp-help">' + esc((err && err.message) || 'Snapshot non disponibile.') + '</div>';
  }
}

async function assignActiveToClient(id) {
  if (!DATA || !Array.isArray(DATA.weeks) || !DATA.weeks.length) {
    practiceToast('Apri prima una scheda attiva da assegnare.', 'warning');
    return;
  }
  try {
    const payload = { activeProgram: DATA };
    if (DATA.nutrition) payload.nutrition = DATA.nutrition;
    if (DATA.supplementation) payload.supplementation = DATA.supplementation;
    if (DATA.therapy) payload.therapy = DATA.therapy;
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/assign', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ data: payload })
    }, 25000);
    practiceToast('Scheda assegnata', 'success');
    renderCoachWorkspace(document.getElementById('view-container'));
  } catch (err) {
    practiceToast((err && err.message) || 'Assegnazione fallita', 'danger');
  }
}

function renderClientChat(c) {
  c.innerHTML = '<div style="margin-bottom:12px;"><span style="font-size:10px;color:var(--gold);font-weight:800;">COACH</span>' +
    '<h1 style="color:#fff;margin:2px 0 0;font-size:22px;">Chat con il coach</h1></div>' +
    '<div class="card" style="padding:12px;"><div id="cp-client-chat"></div>' +
    '<div style="display:flex;gap:8px;margin-top:10px;"><input id="cp-client-msg" type="text" placeholder="Scrivi al coach…">' +
    '<button class="btn btn-primary" onclick="sendAthleteHumanMessage()">INVIA</button></div></div>';
  loadHumanMessages(null, 'cp-client-chat', 'athlete');
}

async function loadHumanMessages(clientId, boxId, role) {
  const box = document.getElementById(boxId);
  if (!box) return;
  try {
    const path = role === 'athlete' ? '/api/client/messages' : '/api/coach/clients/' + encodeURIComponent(clientId) + '/messages';
    const payload = await practiceFetch(path, { method: 'GET', headers: practiceHeaders(false) }, 20000);
    const msgs = payload.messages || [];
    if (!msgs.length) { box.innerHTML = '<div class="cp-help">Nessun messaggio.</div>'; return; }
    box.innerHTML = msgs.map(function (m) {
      const mine = (role === 'athlete' && m.from_role === 'athlete') || (role === 'coach' && m.from_role === 'coach');
      return '<div class="cp-msg ' + (mine ? 'me' : 'them') + '">' + esc(m.body) +
        '<div style="font-size:9px;color:#666;margin-top:4px;">' + esc(String(m.created_at || '').replace('T', ' ').slice(0, 16)) + '</div></div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  } catch (err) {
    box.innerHTML = '<div class="cp-help">' + esc((err && err.message) || 'Chat non disponibile.') + '</div>';
  }
}

async function sendCoachHumanMessage(id) {
  const input = document.getElementById('cp-ws-msg');
  const body = input && input.value.trim();
  if (!body) return;
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/messages', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ body: body })
    }, 15000);
    input.value = '';
    loadHumanMessages(id, 'cp-ws-chat', 'coach');
  } catch (err) { practiceToast((err && err.message) || 'Messaggio non inviato', 'danger'); }
}

async function sendAthleteHumanMessage() {
  const input = document.getElementById('cp-client-msg');
  const body = input && input.value.trim();
  if (!body) return;
  try {
    await practiceFetch('/api/client/messages', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ body: body })
    }, 15000);
    input.value = '';
    loadHumanMessages(null, 'cp-client-chat', 'athlete');
  } catch (_) {
    enqueueClientOutbox({ type: 'message', body: body });
    input.value = '';
    practiceToast('Messaggio in coda offline', 'warning');
  }
}

function renderPracticeView() {
  const c = typeof $ === 'function' ? $('view-container') : document.getElementById('view-container');
  if (!c) return false;
  if (currentView === 'coachHub') { ensurePracticeStyle(); c.innerHTML = ''; renderCoachHub(c); applyClientChrome(); return true; }
  if (currentView === 'clientChat') { ensurePracticeStyle(); c.innerHTML = ''; renderClientChat(c); applyClientChrome(); return true; }
  if (currentView === 'coachClient') { ensurePracticeStyle(); c.innerHTML = ''; renderCoachWorkspace(c); applyClientChrome(); return true; }
  return false;
}

async function refreshCoachStatus() {
  if (!store.accountToken || (typeof isAthleteRole === 'function' && isAthleteRole())) return;
  try {
    const s = await practiceFetch('/api/coach/status', { method: 'GET', headers: practiceHeaders(false) }, 12000);
    store.coachUnlocked = !!(s && s.unlocked);
    if (typeof persist === 'function') persist();
  } catch (_) {}
}

async function refreshAthleteMe() {
  if (!store.accountToken || typeof isAthleteRole !== 'function' || !isAthleteRole()) return;
  try {
    const me = await practiceFetch('/api/client/me', { method: 'GET', headers: practiceHeaders(false) }, 15000);
    store.clientProfile = me.client || store.clientProfile;
    store.clientEvents = me.events || [];
    store.role = 'athlete';
    if (typeof persist === 'function') persist();
    if (me.client && me.client.needIntake) showClientIntake(me.client.intake || {});
  } catch (_) {}
}

async function bootCoachPractice() {
  ensurePracticeStyle();
  ensurePracticeOverlays();
  const token = detectInviteToken() || store.inviteToken;
  if (token) store.inviteToken = token;
  applyClientChrome();
  if (token && !(typeof isAthleteRole === 'function' && isAthleteRole() && store.accountToken)) {
    showClientInvite(token);
    return;
  }
  if (typeof isAthleteRole === 'function' && isAthleteRole() && store.accountToken) {
    await refreshAthleteMe();
    if (store.clientProfile && store.clientProfile.needIntake) showClientIntake(store.clientProfile.intake || {});
    else if (!store.clientTutorialDone) showClientTutorial(false);
    flushClientOutbox();
  } else {
    await refreshCoachStatus();
    applyClientChrome();
  }
}

function wrapPracticeHooks() {
  if (typeof navigate === 'function' && !navigate.__cpWrapped) {
    const _nav = navigate;
    navigate = function (v, e) {
      v = gatePracticeView(v);
      if (v === 'coachHub' || v === 'clientChat' || v === 'coachClient') {
        if (e && e.preventDefault) e.preventDefault();
        currentView = v;
        document.querySelectorAll('.nav-item').forEach(function (el) { el.classList.remove('active'); });
        if (v === 'clientChat') {
          const a = document.getElementById('nav-stats');
          if (a) a.classList.add('active');
        }
        renderPracticeView();
        return;
      }
      _nav(v, e);
      applyClientChrome();
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
        if (c && currentView === 'home' && typeof isAthleteRole === 'function' && isAthleteRole() && (!DATA || !DATA.weeks || !DATA.weeks.length)) {
          c.innerHTML = athleteWaitingHomeHtml();
        }
        if (c && (currentView === 'athlete' || currentView === 'settings' || currentView === 'home' || currentView === 'pricing')) injectCoachUnlockInto(c);
      } catch (_) {}
      applyClientChrome();
    };
    render.__cpWrapped = true;
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
      _lo();
      store.role = null;
      store.clientProfile = null;
      store.coachWorkspace = null;
      if (athlete && token) {
        store.inviteToken = token;
        if (typeof persist === 'function') persist();
        showClientInvite(token);
      }
      applyClientChrome();
    };
    logoutAccount.__cpWrapped = true;
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
window.sendCoachHumanMessage = sendCoachHumanMessage;
window.sendAthleteHumanMessage = sendAthleteHumanMessage;
window.requestProgramFromCoach = requestProgramFromCoach;
window.copyOrShare = copyOrShare;
window.showOverlay = showOverlay;
window.applyClientChrome = applyClientChrome;
window.CLIENT_INTAKE_FIELDS = CLIENT_INTAKE_FIELDS;
window.isAthleteRole = isAthleteRole;
window.isCoachUnlocked = isCoachUnlocked;
