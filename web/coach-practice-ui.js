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
    if (athlete) {
      document.querySelectorAll('button').forEach(function (btn) {
        const tx = String(btn.textContent || '');
        if (/CHIEDI A COACH AI/i.test(tx)) btn.textContent = tx.replace(/CHIEDI A COACH AI(?:\s*\([^)]+\))?/i, 'CHIEDI AL COACH');
      });
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
    '.cp-msg.them{background:#151515;border:1px solid #333;}',
    '.cp-msg img{max-width:100%;border-radius:8px;margin-top:6px;}',
    '.cp-chat-tools{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}',
    '.cp-assign-bar{position:fixed;left:8px;right:8px;bottom:72px;z-index:10080;background:#111;border:1px solid var(--gold);border-radius:12px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,.45);}',
    '.cp-pw-row{display:flex;gap:6px;align-items:center;}',
    '.cp-pw-row input{flex:1;}'
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
      else if (it.type === 'message') await practiceFetch('/api/client/messages', { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ body: it.body }) });
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
    const stayEl = document.getElementById('cp-login-stay');
    store.stayLoggedIn = !(stayEl && stayEl.checked === false);
    store.accountToken = payload.token;
    store.accountUser = payload.user;
    store.role = 'athlete';
    store.clientProfile = payload.client || null;
    try {
      if (store.stayLoggedIn) sessionStorage.removeItem('GS_SESSION_AUTH');
      else sessionStorage.setItem('GS_SESSION_AUTH', JSON.stringify({
        token: payload.token, user: payload.user, role: 'athlete', inviteToken: store.inviteToken
      }));
    } catch (_) {}
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
  return '<div style="text-align:center;padding:16px 0 8px;">' +
    '<img src="nurvan_logo.png" class="logo-blend" alt="NURVAN" style="width:132px;max-width:46vw;filter:drop-shadow(0 0 16px var(--gold));">' +
    '<h1 class="text-gold" style="font-size:26px;font-weight:900;letter-spacing:3px;margin:8px 0 0;">NURVAN</h1>' +
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
        '<div><div style="font-size:15px;font-weight:900;color:#fff;">' + esc(cl.displayName) +
        (cl.leaveRequested ? ' <span class="cp-badge" style="color:#c66;border-color:#c66;">FINE RICHIESTA</span>' : '') + '</div>' +
        '<div style="font-size:11px;color:#888;">@' + esc(cl.username) + ' · ' + esc(badge) + ' · ' + esc(paid) +
        (cl.unreadCount ? ' · ' + cl.unreadCount + ' nuovi' : '') +
        (cl.hasPendingChange ? ' · modifica da approvare' : '') + '</div></div></div>' +
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
  store.coachWorkspace = { clientId: id };
  if (typeof persist === 'function') persist();
  navigate('coachClient');
}

function openCoachClientChat(id) {
  store.coachWorkspace = Object.assign({}, store.coachWorkspace || {}, { clientId: id, chat: true });
  navigate('coachClient');
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
  return '<div class="cp-msg ' + (mine ? 'me' : 'them') + '">' + esc(m.body || '') + extra +
    '<div style="font-size:9px;color:#666;margin-top:4px;">' + esc(String(m.created_at || '').replace('T', ' ').slice(0, 16)) + '</div></div>';
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
    c.innerHTML = '<button class="btn btn-outline" style="font-size:10px;margin-bottom:10px;" onclick="navigate(\'coachHub\')">← LISTA</button>' +
      '<h1 style="color:#fff;font-size:22px;margin:0 0 4px;">' + esc(cl.displayName || 'Cliente') + '</h1>' +
      '<div style="font-size:11px;color:#888;margin-bottom:12px;">@' + esc(cl.username || '') + ' · ' +
      (cl.intakeMode === 'transition' ? 'Transizione' : 'Nuovo') + (cl.intakeDone ? ' · questionario ok' : ' · questionario in attesa') + '</div>' +
      (cl.leaveRequested ? '<div class="card" style="padding:12px;margin-bottom:12px;border-color:#c66;"><div style="font-weight:900;color:#c66;">Richiesta fine collaborazione</div>' +
        '<button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="confirmLeaveClient(\'' + esc(id) + '\')">CONFERMA FINE COLLABORAZIONE</button></div>' : '') +
      ((snap.pendingChange || cl.hasPendingChange) ? '<div class="card" style="padding:12px;margin-bottom:12px;border-color:var(--gold);"><div style="font-weight:900;color:var(--gold);">Modifica richiesta dall’atleta</div>' +
        '<p class="cp-help">' + esc((snap.pendingChange && snap.pendingChange.summary) || 'Vuole cambiare il programma.') + '</p>' +
        '<button class="btn btn-primary" style="width:100%;margin-top:6px;" onclick="approveClientChange(\'' + esc(id) + '\')">APPROVA MODIFICA</button>' +
        '<button class="btn btn-outline" style="width:100%;margin-top:6px;" onclick="rejectClientChange(\'' + esc(id) + '\')">RIFIUTA</button></div>' : '') +
      '<div class="card" style="padding:12px;margin-bottom:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:6px;">Programma</div>' +
      '<div style="font-size:12px;color:#ccc;">' + esc(prog.title || 'Nessuna scheda assegnata') + (weeks ? ' · ' + weeks + ' settimane' : '') + '</div>' +
      '<label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:12px;color:#ccc;line-height:1.35;"><input id="cp-max-freedom" type="checkbox"' + (cl.allowMaxFreedom ? ' checked' : '') + ' onchange="toggleMaxFreedom(\'' + esc(id) + '\', this.checked)"> <span><b style="color:#fff;">Consenti massima libertà</b> — l’atleta può modificare da solo. Ti arriva comunque un avviso. Senza spunta, ogni modifica è una richiesta che tu approvi.</span></label>' +
      '<button class="btn btn-primary" style="width:100%;margin-top:10px;font-size:11px;" onclick="openAssignChooser(\'' + esc(id) + '\',\'' + esc(cl.displayName || '') + '\')">ASSEGNA SCHEDA</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="sendCheckToClient(\'' + esc(id) + '\')">INVIA CHECK</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="requestExamsFromClient(\'' + esc(id) + '\')">RICHIEDI ESAMI</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="resetClientPassword(\'' + esc(id) + '\')">REIMPOSTA PASSWORD</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="copyClientInvite(\'' + esc(id) + '\',\'' + esc(cl.inviteToken || '') + '\')">COPIA LINK + CREDENZIALI</button></div>' +
      '<div class="card" style="padding:12px;margin-bottom:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:6px;">Anagrafica acquisizione</div>' +
      (intakeRows || '<div class="cp-help">Questionario non ancora compilato.</div>') + '</div>' +
      '<div class="card" style="padding:12px;margin-bottom:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:6px;">Richieste</div>' +
      (eventsHtml || '<div class="cp-help">Nessuna richiesta recente.</div>') + '</div>' +
      '<div class="card" style="padding:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:8px;">Chat</div>' +
      '<div id="cp-ws-chat" style="min-height:80px;max-height:46vh;overflow:auto;"></div>' +
      chatToolsHtml('cp-ws-msg', 'sendCoachHumanMessage(\'' + esc(id) + '\')', 'clearChatForMe(\'' + esc(id) + '\',\'coach\')', 'newChatThread(\'' + esc(id) + '\',\'coach\')') +
      '</div>';
    startChatPoll(id, 'cp-ws-chat', 'coach');
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
    activeProgram: store.activeProgram ? JSON.parse(JSON.stringify(store.activeProgram)) : null
  };
}

function restoreCoachMaster(backup) {
  if (!backup) return;
  try { DATA = backup.DATA || {}; } catch (_) {}
  store.nutrition = backup.nutrition;
  store.supplementation = backup.supplementation;
  store.therapy = backup.therapy;
  store.exams = backup.exams;
  store.activeProgramId = backup.activeProgramId;
  store.activeProgram = backup.activeProgram;
  if (typeof persist === 'function') persist();
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
  bar.innerHTML = '<div style="font-size:11px;color:var(--gold);font-weight:800;margin-bottom:6px;">ASSEGNAZIONE A ' + esc(job.name || 'cliente') + '</div>' +
    '<div style="font-size:11px;color:#aaa;margin-bottom:8px;">Importa o scegli, poi <b style="color:#fff;">apri e modifica</b> (es. aggiungi la Leg Extension al giorno 2). La tua scheda personale non cambia.</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'training\')">ALLENAMENTO</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'nutrition\')">ALIMENTAZIONE</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'supplements\')">INTEGRAZIONE</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'therapy\')">TERAPIA</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'exams\')">ESAMI</button></div>' +
    '<div style="display:flex;gap:8px;"><button class="btn btn-primary" style="flex:1;font-size:11px;" onclick="confirmAssignSandbox()">CONFERMA ASSEGNAZIONE</button>' +
    '<button class="btn btn-outline" style="flex:1;font-size:11px;" onclick="cancelAssignSandbox()">ANNULLA</button></div>';
}

function openAssignChooser(clientId, name) {
  ensurePracticeStyle();
  ensurePracticeOverlays();
  const p = document.getElementById('cp-assign-panel');
  if (!p) return;
  p.innerHTML = '<div style="font-size:10px;color:var(--gold);font-weight:800;">ASSEGNA SCHEDA</div>' +
    '<h2>Cosa vuoi assegnare a ' + esc(name || 'cliente') + '?</h2>' +
    '<p class="cp-help">Si apre il flusso generale dell’app. Dopo import o scelta <b style="color:#fff;">visualizzi e puoi modificare</b> (aggiungere un esercizio, cambiare un pasto, ecc.) e solo dopo confermi l’invio al cliente. La tua scheda personale resta intatta.</p>' +
    '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="beginAssignSandbox(\'' + esc(clientId) + '\',\'' + esc(name || '') + '\',\'import\')">IMPORTA PDF / EXCEL / WORD</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="beginAssignSandbox(\'' + esc(clientId) + '\',\'' + esc(name || '') + '\',\'programs\')">DATABASE PROGRAMMI</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="beginAssignSandbox(\'' + esc(clientId) + '\',\'' + esc(name || '') + '\',\'copy\')">USA SCHEDA ATTIVA COME BASE</button>' +
    '<button class="btn btn-outline" style="width:100%;" onclick="showOverlay(\'cp-assign\', false)">ANNULLA</button>';
  showOverlay('cp-assign', true);
}

function beginAssignSandbox(clientId, name, mode) {
  store.coachAssigning = { clientId: clientId, name: name, mode: mode };
  window.__cpAssignBackup = snapshotCoachMaster();
  if (typeof persist === 'function') persist();
  showOverlay('cp-assign', false);
  ensureAssignBanner();
  if (mode === 'import') navigate('import');
  else if (mode === 'programs') navigate('programs');
  else {
    navigate('training');
    practiceToast('Apri i giorni, modifica se serve, poi CONFERMA ASSEGNAZIONE.', 'success');
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
  const payload = { activeProgram: (typeof DATA !== 'undefined' ? DATA : null) };
  if (DATA && DATA.nutrition) payload.nutrition = DATA.nutrition;
  else if (store.nutrition) payload.nutrition = store.nutrition;
  if (DATA && DATA.supplementation) payload.supplementation = DATA.supplementation;
  if (DATA && DATA.therapy) payload.therapy = DATA.therapy;
  if (DATA && DATA.exams) payload.exams = DATA.exams;
  const kinds = detectSandboxKinds();
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(job.clientId) + '/assign', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ data: payload, kinds: kinds })
    }, 25000);
    restoreCoachMaster(window.__cpAssignBackup || job.backup);
    window.__cpAssignBackup = null;
    store.coachAssigning = null;
    if (typeof persist === 'function') persist();
    ensureAssignBanner();
    practiceToast('Scheda assegnata al cliente', 'success');
    store.coachWorkspace = { clientId: job.clientId };
    navigate('coachClient');
  } catch (err) {
    practiceToast((err && err.message) || 'Assegnazione fallita', 'danger');
  }
}

function cancelAssignSandbox() {
  const job = store.coachAssigning;
  if (job) restoreCoachMaster(window.__cpAssignBackup || job.backup);
  window.__cpAssignBackup = null;
  store.coachAssigning = null;
  if (typeof persist === 'function') persist();
  ensureAssignBanner();
  practiceToast('Assegnazione annullata', 'warning');
  navigate('coachHub');
}

async function assignActiveToClient(id) {
  openAssignChooser(id, (store.coachWorkspace && store.coachWorkspace.client && store.coachWorkspace.client.displayName) || '');
}

async function sendCheckToClient(id) {
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/check-request', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ note: '' })
    }, 15000);
    practiceToast('Check inviato al cliente', 'success');
  } catch (err) { practiceToast((err && err.message) || 'Invio check fallito', 'danger'); }
}

async function requestExamsFromClient(id) {
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/request-exams', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ note: '' })
    }, 15000);
    practiceToast('Richiesta esami inviata', 'success');
  } catch (err) { practiceToast((err && err.message) || 'Richiesta esami fallita', 'danger'); }
}

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
  c.innerHTML = '<div style="margin-bottom:12px;"><span style="font-size:10px;color:var(--gold);font-weight:800;">COACH</span>' +
    '<h1 style="color:#fff;margin:2px 0 0;font-size:22px;">Chat con il coach</h1></div>' +
    '<div class="card" style="padding:12px;"><div id="cp-client-chat" style="max-height:52vh;overflow:auto;"></div>' +
    chatToolsHtml('cp-client-msg', 'sendAthleteHumanMessage()', 'clearChatForMe(null,\'athlete\')', 'newChatThread(null,\'athlete\')') +
    '</div>';
  startChatPoll(null, 'cp-client-chat', 'athlete');
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
    const msgs = payload.messages || [];
    const nearBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) < 80;
    if (!msgs.length) { box.innerHTML = '<div class="cp-help">Nessun messaggio.</div>'; return; }
    box.innerHTML = msgs.map(function (m) {
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
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*,.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp';
  inp.onchange = function () {
    const file = inp.files && inp.files[0];
    if (!file) return;
    if (file.size > 900000) { practiceToast('File troppo grande (max circa 700 KB)', 'warning'); return; }
    if (/^image\//i.test(file.type)) compressChatImage(file).then(setPendingAttachment);
    else {
      const reader = new FileReader();
      reader.onload = function () {
        const data = String(reader.result || '');
        if (data.length > 450000) { practiceToast('Documento troppo grande', 'warning'); return; }
        setPendingAttachment({ kind: 'file', name: file.name, mime: file.type || 'application/octet-stream', data: data });
      };
      reader.readAsDataURL(file);
    }
  };
  inp.click();
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

function setPendingAttachment(att) {
  window.__cpPendingAttach = att;
  const prev = document.getElementById('cp-attach-preview');
  if (prev) prev.textContent = 'Allegato: ' + (att && att.name ? att.name : 'pronto');
  practiceToast('Allegato pronto', 'success');
}

async function sendCoachHumanMessage(id) {
  const input = document.getElementById('cp-ws-msg');
  const body = input && input.value.trim();
  const attachment = window.__cpPendingAttach || null;
  if (!body && !attachment) return;
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/messages', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ body: body || '', attachment: attachment })
    }, 20000);
    if (input) input.value = '';
    window.__cpPendingAttach = null;
    const prev = document.getElementById('cp-attach-preview');
    if (prev) prev.textContent = '';
    loadHumanMessages(id, 'cp-ws-chat', 'coach');
  } catch (err) { practiceToast((err && err.message) || 'Messaggio non inviato', 'danger'); }
}

async function sendAthleteHumanMessage() {
  const input = document.getElementById('cp-client-msg');
  const body = input && input.value.trim();
  const attachment = window.__cpPendingAttach || null;
  if (!body && !attachment) return;
  try {
    await practiceFetch('/api/client/messages', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ body: body || '', attachment: attachment })
    }, 20000);
    if (input) input.value = '';
    window.__cpPendingAttach = null;
    const prev = document.getElementById('cp-attach-preview');
    if (prev) prev.textContent = '';
    loadHumanMessages(null, 'cp-client-chat', 'athlete');
  } catch (_) {
    enqueueClientOutbox({ type: 'message', body: body || '[allegato]' });
    if (input) input.value = '';
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

function notifyUser(title, body) {
  try {
    const native = typeof nativeBridge === 'function' ? nativeBridge() : (typeof NativeConfig !== 'undefined' ? NativeConfig : null);
    if (native && typeof native.notifyNow === 'function') {
      native.notifyNow(JSON.stringify({ title: title, body: body, id: 'n_' + Date.now() }));
      return;
    }
  } catch (_) {}
  try {
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') new Notification(title, { body: body });
      else if (Notification.permission !== 'denied') Notification.requestPermission();
    }
  } catch (_) {}
}

function eventNotifyCopy(kind) {
  const map = {
    program_assigned: ['Scheda assegnata', 'Il coach ti ha assegnato un allenamento'],
    nutrition_assigned: ['Alimentazione aggiornata', 'Il coach ha inviato il piano alimentare'],
    supplements_assigned: ['Integrazione aggiornata', 'Il coach ha inviato l’integrazione'],
    therapy_assigned: ['Terapia aggiornata', 'Il coach ha aggiornato la terapia'],
    exams_assigned: ['Esami aggiornati', 'Il coach ha caricato degli esami'],
    exams_request: ['Richiesta esami', 'Il coach ha chiesto degli esami'],
    check_request: ['Check richiesto', 'Il coach ha chiesto un check fisico'],
    message: ['Nuovo messaggio', 'Hai un messaggio dal coach'],
    password_reset: ['Password aggiornata', 'Il coach ha reimpostato la password'],
    leave_confirmed: ['Collaborazione chiusa', 'Il coach ha confermato la chiusura'],
    change_approved: ['Modifica approvata', 'Il coach ha approvato la tua modifica'],
    change_rejected: ['Modifica rifiutata', 'Il coach ha rifiutato la modifica'],
    max_freedom: ['Libertà aggiornata', 'Il coach ha cambiato il consenso di modifica']
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
          if (copy) notifyUser(copy[0], copy[1]);
          if (e.kind === 'change_approved' && typeof syncAccountData === 'function') {
            syncAccountData(true).then(function () { rememberApprovedProgram(); if (typeof render === 'function') render(); }).catch(function () {});
          }
          if (e.kind === 'max_freedom') refreshAthleteMe();
        }
      });
      if (box.unreadMessages && box.lastMessageId && box.lastMessageId !== store.clientSeenMsgId) {
        if (store.clientSeenMsgId) notifyUser('Nuovo messaggio', 'Il coach ti ha scritto');
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
          if (e.kind === 'message') notifyUser('Messaggio cliente', (e.display_name || 'Atleta') + ' ti ha scritto');
          else if (e.kind === 'ask_coach') notifyUser('Richiesta dal cliente', (e.display_name || 'Atleta') + ' chiede al coach');
          else if (e.kind === 'password_help') notifyUser('Recupero password', (e.display_name || 'Atleta') + ' ha chiesto la password');
          else if (e.kind === 'leave_request') notifyUser('Fine collaborazione', (e.display_name || 'Atleta') + ' ha chiesto di chiudere');
          else if (e.kind === 'change_request') notifyUser('Modifica da approvare', (e.display_name || 'Atleta') + ' vuole cambiare il programma');
          else if (e.kind === 'change_notice') notifyUser('Atleta ha modificato', (e.display_name || 'Atleta') + ' ha cambiato il programma');
          else if (e.kind === 'request_program') notifyUser('Richiesta scheda', (e.display_name || 'Atleta') + ' chiede la scheda');
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
  stopChatPoll();
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
  ensureAssignBanner();
  const token = detectInviteToken() || store.inviteToken;
  if (token) store.inviteToken = token;
  applyClientChrome();
  try {
    const native = typeof nativeBridge === 'function' ? nativeBridge() : (typeof NativeConfig !== 'undefined' ? NativeConfig : null);
    if (native && native.requestNotifications) native.requestNotifications();
  } catch (_) {}
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
        ensureAssignBanner();
        return;
      }
      _nav(v, e);
      applyClientChrome();
      ensureAssignBanner();
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
      try { sessionStorage.removeItem('GS_SESSION_AUTH'); } catch (_) {}
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
window.openAssignChooser = openAssignChooser;
window.beginAssignSandbox = beginAssignSandbox;
window.confirmAssignSandbox = confirmAssignSandbox;
window.cancelAssignSandbox = cancelAssignSandbox;
window.sendCheckToClient = sendCheckToClient;
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
