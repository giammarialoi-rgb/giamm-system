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
  { key: 'stress', label: 'Stress', type: 'select', required: true, options: ['Basso', 'Medio', 'Alto'] },
  { key: 'rmSquat', label: '1RM Squats (presunto)', type: 'select', required: false, options: ['Non so / Mai fatti', '40 kg', '60 kg', '80 kg', '100 kg', '120 kg', '140 kg', '160 kg', '180 kg', '200 kg', '220+ kg'] },
  { key: 'rmBench', label: '1RM Panca (presunto)', type: 'select', required: false, options: ['Non so / Mai fatti', '20 kg', '40 kg', '60 kg', '80 kg', '100 kg', '120 kg', '140 kg', '160 kg', '180+ kg'] },
  { key: 'rmDeadlift', label: '1RM Stacco (presunto)', type: 'select', required: false, options: ['Non so / Mai fatti', '40 kg', '60 kg', '80 kg', '100 kg', '120 kg', '140 kg', '160 kg', '180 kg', '200 kg', '220 kg', '240+ kg'] },
  { key: 'rmMilitary', label: '1RM Military press (presunto)', type: 'select', required: false, options: ['Non so / Mai fatti', '20 kg', '30 kg', '40 kg', '50 kg', '60 kg', '70 kg', '80 kg', '90 kg', '100+ kg'] }
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
    const tz = (typeof deviceTimeZone === 'function') ? deviceTimeZone() : undefined;
    return d.toLocaleString('it-IT', Object.assign({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }, tz ? { timeZone: tz } : {}));
  } catch (_) { return '—'; }
}

function fmtDay(v) {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '—';
    const tz = (typeof deviceTimeZone === 'function') ? deviceTimeZone() : undefined;
    return d.toLocaleDateString('it-IT', tz ? { timeZone: tz } : undefined);
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
      community: 1, pricing: 1, coachHub: 1, coachClient: 1,
      generate: 1, catalog: 1, library: 1, db: 1, programs: 1, unlock: 1
    };
    if (v === 'ai' && !(store.clientProfile && store.clientProfile.allowNurvanAi)) return 'home';
    if (blocked[v]) return 'home';
    return v;
  }
  if (store && store.coachSessionActive && !store.coachAssigning) {
    const coachCore = { coachHub: 1, coachClient: 1, coachChat: 1, coachLibrary: 1 };
    const clientDomains = { training: 1, nutrition: 1, supplements: 1, therapy: 1, exams: 1, stats: 1, athlete: 1, calendar: 1 };
    if (coachCore[v]) return v;
    if (store.__cpCoachLibraryImport && (v === 'import' || v === 'coachLibrary')) return v;
    if (store.coachViewingClient && clientDomains[v]) return v;
  }
  return v;
}

function athleteCanUseNurvanAi() {
  return !!(typeof isAthleteRole === 'function' && isAthleteRole() && store && store.clientProfile && store.clientProfile.allowNurvanAi);
}

function clearClientShellLock() {
  try { localStorage.removeItem('GS_CLIENT_SHELL'); } catch (_) {}
  if (store) {
    store.clientShell = false;
  }
}

function inviteShortCode(token) {
  return String(token || '').slice(-6).toUpperCase();
}

function formatInviteShareText(opts) {
  opts = opts || {};
  const name = String(opts.name || opts.displayName || '').trim() || 'atleta';
  const code = opts.inviteCode || inviteShortCode(opts.token || opts.inviteUrl);
  const lines = [
    'Ciao ' + name + ',',
    'benvenuto nel mio servizio coaching, clicka sul link qui sotto ed inserisci i dati richiesti che trovi in basso nel messaggio, compila il form se richiesto, preparati a prenderti cura del tuo corpo sotto ogni aspetto 💪🏻🏋️‍♂️🍎💊🧬',
    '',
    'Link: ' + (opts.inviteUrl || ''),
    'Utente: ' + (opts.username || ''),
    'Password: ' + (opts.password || '')
  ];
  if (code) lines.push('Codice invito: ' + code);
  return lines.join('\n');
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
      document.body.classList.remove('cp-has-client-bar');
    }
    const home = document.getElementById('nav-home');
    const train = document.getElementById('nav-training');
    const stats = document.getElementById('nav-stats');
    const ai = document.getElementById('nav-ai');
    const menu = document.getElementById('nav-db');
    if (coachSession) {
      if (home) {
        const sp = home.querySelector('span');
        if (sp) sp.textContent = 'HUB';
        home.onclick = function (event) { navigate('coachHub', event); };
      }
      if (train) {
        const sp = train.querySelector('span');
        if (sp) sp.textContent = 'CLIENTE';
        train.onclick = function (event) {
          const id = store.coachWorkspace && store.coachWorkspace.clientId;
          if (!id) { practiceToast('Seleziona un cliente dalla lista', 'info'); navigate('coachHub', event); return; }
          navigate('coachClient', event);
        };
      }
      if (stats) {
        const sp = stats.querySelector('span');
        if (sp) sp.textContent = 'CHAT';
        stats.onclick = function (event) {
          const id = store.coachWorkspace && store.coachWorkspace.clientId;
          if (!id) { practiceToast('Seleziona un cliente dalla lista', 'info'); navigate('coachHub', event); return; }
          openCoachClientChat(id);
          if (event && event.preventDefault) event.preventDefault();
        };
      }
      if (menu) {
        const sp = menu.querySelector('span');
        if (sp) sp.textContent = 'MENU';
        menu.onclick = function (event) {
          if (event && event.preventDefault) event.preventDefault();
          openCoachDrawer();
          return false;
        };
      }
      if (ai) ai.style.display = 'none';
    } else {
      if (home) {
        const sp = home.querySelector('span');
        if (sp) sp.textContent = 'HOME';
        home.onclick = function (event) { navigate('home', event); };
      }
      if (train) {
        const sp = train.querySelector('span');
        if (sp) sp.textContent = 'WORKOUT';
        train.onclick = function (event) { navigate('training', event); };
      }
      if (stats) {
        const span = stats.querySelector('span');
        if (athlete) {
          if (span) span.textContent = 'COACH';
          stats.onclick = function (event) { navigate('clientChat', event); };
        } else {
          if (span) span.textContent = 'STATS';
          stats.onclick = function (event) { navigate('stats', event); };
        }
      }
      if (menu) {
        const sp = menu.querySelector('span');
        if (sp) sp.textContent = 'MENU';
        menu.onclick = function (event) {
          openMenuHub();
          if (event) event.preventDefault();
          return false;
        };
      }
      if (ai) {
        if (athlete) ai.style.display = athleteCanUseNurvanAi() ? '' : 'none';
        else ai.style.display = coachSession ? 'none' : '';
      }
    }
    document.querySelectorAll('[data-hub="full"]').forEach(function (el) {
      el.style.display = (athlete || coachSession) ? 'none' : '';
    });
    document.querySelectorAll('[data-hub="coach"]').forEach(function (el) {
      el.style.display = athlete ? 'none' : 'flex';
    });
    const coachBtn = document.getElementById('coach-unlock-button');
    if (coachBtn) {
      coachBtn.style.display = athlete ? 'none' : '';
      if (coachSession) coachBtn.textContent = 'ESCI';
      else coachBtn.textContent = unlocked ? 'HUB' : 'COACH';
      coachBtn.onclick = function () {
        if (coachSession) exitCoachSession();
        else openCoachOrUnlock();
      };
    }
    ensureCoachHeaderControls(coachSession);
    ensureNotifyButton();
    if (athlete) {
      document.querySelectorAll('button').forEach(function (btn) {
        const tx = String(btn.textContent || '');
        if (/CHIEDI A COACH AI/i.test(tx) && !athleteCanUseNurvanAi()) {
          btn.style.display = 'none';
        } else if (/CHIEDI A COACH AI/i.test(tx)) {
          btn.textContent = tx.replace(/CHIEDI A COACH AI(?:\s*\([^)]+\))?/i, 'CHIEDI AL COACH');
        }
      });
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
      el.style.display = (athlete || coachSession) ? 'none' : '';
    });
    document.querySelectorAll('[data-athlete-ai]').forEach(function (el) {
      el.style.display = athleteCanUseNurvanAi() ? '' : 'none';
    });
    ensureCoachSessionBanner();
    hideLegacyClientViewBanner();
    ensureCoachDrawer();
  } catch (err) {
    console.warn('[CLIENT_CHROME]', err);
  }
}

function coachHeaderBack() {
  if (store && store.coachViewingClient) {
    leaveCoachClientView();
    return;
  }
  if (store && store.coachAssigning) {
    if (typeof cancelAssignSandbox === 'function') cancelAssignSandbox();
    return;
  }
  exitCoachSession();
}

function ensureCoachHeaderControls(coachSession) {
  let wrap = document.getElementById('cp-coach-header-controls');
  if (!coachSession) {
    if (wrap) wrap.style.display = 'none';
    const hubBtn = document.getElementById('menu-hub-button');
    if (hubBtn) hubBtn.style.display = '';
    const profileBtn = document.getElementById('profile-button');
    if (profileBtn) profileBtn.style.display = '';
    const notifyBtn = document.getElementById('cp-notify-btn');
    if (notifyBtn) notifyBtn.style.display = '';
    const coachBtnRestore = document.getElementById('coach-unlock-button');
    if (coachBtnRestore) coachBtnRestore.style.display = '';
    return;
  }
  const coachBtn = document.getElementById('coach-unlock-button');
  const headerActions = coachBtn && coachBtn.parentElement;
  if (!headerActions) return;
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'cp-coach-header-controls';
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;max-width:min(52vw,280px);';
    headerActions.insertBefore(wrap, coachBtn);
  }
  wrap.style.display = 'flex';
  wrap.style.cssText = 'display:flex;align-items:center;gap:4px;flex-wrap:nowrap;max-width:min(62vw,340px);min-width:0;overflow:hidden;';
  const hubBtn = document.getElementById('menu-hub-button');
  if (hubBtn) hubBtn.style.display = 'none';
  const profileBtn = document.getElementById('profile-button');
  if (profileBtn) profileBtn.style.display = 'none';
  const notifyBtn = document.getElementById('cp-notify-btn');
  if (notifyBtn) notifyBtn.style.display = 'none';
  if (coachBtn) coachBtn.style.display = 'none';
  const clients = (store.__cpClientList || []).slice();
  const curId = store.coachWorkspace && store.coachWorkspace.clientId ? String(store.coachWorkspace.clientId) : '';
  const opts = ['<option value="">Cliente…</option>'].concat(clients.map(function (cl) {
    return '<option value="' + esc(String(cl.id)) + '"' + (String(cl.id) === curId ? ' selected' : '') + '>' + esc(cl.displayName || cl.username || ('#' + cl.id)) + '</option>';
  }));
  wrap.innerHTML =
    '<select id="cp-client-switcher" class="cp-client-switcher" title="Cambia cliente" style="max-width:42vw;min-width:0;flex:1 1 auto;" onchange="switchCoachClientFromHeader(this.value)">' + opts.join('') + '</select>' +
    '<button type="button" class="btn btn-outline" style="font-size:9px;padding:6px 8px;flex-shrink:0;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="navigate(\'coachHub\')">LISTA</button>' +
    '<button type="button" class="btn btn-outline" style="font-size:9px;padding:6px 8px;flex-shrink:0;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="coachHeaderBack()">INDIETRO</button>';
}

function switchCoachClientFromHeader(id) {
  if (!id) return;
  if (store.coachViewingClient) leaveCoachClientView(true);
  openCoachClient(id);
}

function hideLegacyClientViewBanner() {
  const bar = document.getElementById('cp-client-view-bar');
  if (bar) {
    bar.style.display = 'none';
    bar.innerHTML = '';
  }
  if (document.body) document.body.classList.remove('cp-has-client-bar');
}

function ensureCoachSessionBanner() {
  let bar = document.getElementById('cp-coach-session-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'cp-coach-session-bar';
    bar.style.cssText = 'display:none;position:fixed;left:0;right:0;z-index:1005;background:#111;border-bottom:1px solid var(--gold);padding:6px 12px;font-size:11px;box-sizing:border-box;';
    document.body.appendChild(bar);
  }
  if (!(store && store.coachSessionActive) || (typeof isAthleteRole === 'function' && isAthleteRole())) {
    bar.style.display = 'none';
    document.documentElement.style.removeProperty('--cp-session-bar');
    return;
  }
  const headerH = (document.querySelector('header') && document.querySelector('header').offsetHeight) || 60;
  bar.style.top = headerH + 'px';
  bar.style.display = 'block';
  const name = (store.coachWorkspace && store.coachWorkspace.client && store.coachWorkspace.client.displayName)
    || (store.coachAssigning && store.coachWorkspace && store.coachWorkspace.assignName)
    || '';
  const viewing = !!(store.coachViewingClient || store.coachAssigning);
  let mid = 'Hub clienti · mondo separato';
  if (viewing && name) mid = 'Cliente: <b style="color:#fff;">' + esc(name) + '</b>';
  else if (store.coachWorkspace && store.coachWorkspace.clientId && name) mid = 'Scheda: <b style="color:#fff;">' + esc(name) + '</b>';
  bar.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">' +
    '<span style="color:var(--gold);font-weight:800;">SESSIONE COACH</span>' +
    '<span style="color:#bbb;flex:1;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + mid + '</span>' +
    (viewing
      ? '<button class="btn btn-outline" style="font-size:10px;padding:6px 8px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="navigate(\'coachHub\')">LISTA</button>'
      : '') +
    '</div>';
  const h = Math.max(32, bar.offsetHeight || 36);
  document.documentElement.style.setProperty('--cp-session-bar', h + 'px');
}

function ensureClientViewBanner() {
  // Legacy overlay removed — domains live in coach drawer / session chrome
  hideLegacyClientViewBanner();
  ensureCoachSessionBanner();
  ensureCoachDrawer();
}

function ensureCoachDrawer() {
  let drawer = document.getElementById('cp-coach-drawer');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'cp-coach-drawer';
    drawer.innerHTML = '<div class="cp-drawer-backdrop" onclick="closeCoachDrawer()"></div><div class="cp-drawer-panel" id="cp-coach-drawer-panel"></div>';
    document.body.appendChild(drawer);
  }
  const panel = document.getElementById('cp-coach-drawer-panel');
  if (!panel) return;
  const hasClient = !!(store && store.coachWorkspace && store.coachWorkspace.clientId);
  const viewing = !!(store && store.coachViewingClient);
  const id = hasClient ? String(store.coachWorkspace.clientId) : '';
  const name = (store.coachWorkspace && store.coachWorkspace.client && store.coachWorkspace.client.displayName) || 'cliente';
  const n = Math.max(0, Number(store.__cpNotifyCount || 0));
  panel.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
    '<div style="color:var(--gold);font-weight:800;font-size:13px;">MENU COACH</div>' +
    '<button type="button" class="btn btn-outline" style="font-size:10px;padding:6px 8px;" onclick="closeCoachDrawer()">CHIUDI</button></div>' +
    (hasClient ? ('<div class="cp-help" style="margin-bottom:10px;">Cliente: <b style="color:#fff;">' + esc(name) + '</b></div>') : '<div class="cp-help">Nessun cliente aperto. Apri dalla lista.</div>') +
    '<button type="button" class="btn btn-primary" style="width:100%;margin-bottom:10px;position:relative;" onclick="closeCoachDrawer();openNotificationsCenter()">' +
    'NOTIFICHE' + (n > 0 ? (' <span class="cp-notify-count" style="position:static;display:inline-flex;margin-left:6px;">' + (n > 99 ? '99+' : n) + '</span>') : '') +
    '</button>' +
    (hasClient
      ? ('<button type="button" class="btn btn-outline" style="width:100%;margin-bottom:10px;" onclick="closeCoachDrawer();openNotificationsCenter(\'' + esc(id) + '\')">NOTIFICHE CLIENTE · ORA</button>')
      : '') +
    '<div class="cp-drawer-grid">' +
    '<button type="button" class="btn btn-outline" onclick="closeCoachDrawer();navigate(\'coachHub\')">LISTA CLIENTI</button>' +
    '<button type="button" class="btn btn-outline" onclick="closeCoachDrawer();navigate(\'coachLibrary\')">IL MIO DATABASE</button>' +
    (hasClient ? (
      '<button type="button" class="btn btn-outline" onclick="closeCoachDrawer();openCoachClient(\'' + esc(id) + '\')">SCHEDA CLIENTE</button>' +
      '<button type="button" class="btn btn-outline" onclick="closeCoachDrawer();openCoachClientChat(\'' + esc(id) + '\')">CHAT</button>' +
      '<button type="button" class="btn btn-outline" onclick="closeCoachDrawer();enterCoachClientView(\'calendar\')">CALENDARIO</button>' +
      '<button type="button" class="btn btn-outline" onclick="closeCoachDrawer();enterCoachClientView(\'training\')">ALLENAMENTO</button>' +
      '<button type="button" class="btn btn-outline" onclick="closeCoachDrawer();enterCoachClientView(\'nutrition\')">ALIMENTAZIONE</button>' +
      '<button type="button" class="btn btn-outline" onclick="closeCoachDrawer();enterCoachClientView(\'supplements\')">INTEGRAZIONE</button>' +
      '<button type="button" class="btn btn-outline" onclick="closeCoachDrawer();enterCoachClientView(\'therapy\')">TERAPIA</button>' +
      '<button type="button" class="btn btn-outline" onclick="closeCoachDrawer();enterCoachClientView(\'exams\')">ESAMI</button>' +
      '<button type="button" class="btn btn-outline" onclick="closeCoachDrawer();enterCoachClientView(\'stats\')">STATS</button>'
    ) : (
      '<button type="button" class="btn btn-outline" onclick="closeCoachDrawer();practiceToast(\'Apri un cliente per il suo calendario\',\'warning\');navigate(\'coachHub\')">CALENDARIO</button>'
    )) +
    '</div>' +
    (viewing
      ? ('<button type="button" class="btn btn-primary" style="width:100%;margin-top:14px;" onclick="closeCoachDrawer();pushCoachClientEdits()">SALVA MODIFICHE</button>' +
        '<button type="button" class="btn btn-outline" style="width:100%;margin-top:8px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="closeCoachDrawer();leaveCoachClientView()">TORNA ALLA SCHEDA</button>')
      : '') +
    '<button type="button" class="btn btn-outline" style="width:100%;margin-top:16px;color:#c66 !important;-webkit-text-fill-color:#c66 !important;" onclick="closeCoachDrawer();exitCoachSession()">ESCI COACH</button>';
}

function openCoachDrawer() {
  ensureCoachDrawer();
  const d = document.getElementById('cp-coach-drawer');
  if (d) d.classList.add('active');
}

function closeCoachDrawer() {
  const d = document.getElementById('cp-coach-drawer');
  if (d) d.classList.remove('active');
}

function ensurePracticeStyle() {
  let s = document.getElementById('coach-practice-style');
  if (!s) {
    s = document.createElement('style');
    s.id = 'coach-practice-style';
    document.head.appendChild(s);
  }
  s.textContent = [
    '.cp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:10110;display:none;align-items:center;justify-content:center;padding:16px;}',
    '#cp-modal.cp-overlay{z-index:10120;}',
    '.cp-panel{background:#0d0d0d;border:1px solid var(--gold);border-radius:14px;max-width:520px;width:100%;max-height:92vh;overflow:auto;padding:16px;color:#eee !important;-webkit-text-fill-color:#eee;}',
    '.cp-panel h2{color:var(--gold);font-size:16px;margin:0 0 8px;}',
    '.cp-help{font-size:12px;color:#bbb !important;-webkit-text-fill-color:#bbb;line-height:1.45;margin:0 0 12px;}',
    '.cp-field{margin-bottom:10px;}',
    '.cp-field label{display:block;font-size:10px;color:#e8e8e8 !important;-webkit-text-fill-color:#e8e8e8 !important;font-weight:800;margin-bottom:4px;}',
    '.cp-field input,.cp-field select,.cp-field textarea{width:100%;padding:10px;background:#111;border:1px solid #333;color:#fff !important;-webkit-text-fill-color:#fff !important;border-radius:8px;}',
    '.cp-field input::placeholder,.cp-panel input::placeholder{color:#888 !important;}',
    '.cp-mode{display:flex;gap:8px;margin-bottom:12px;}',
    '.cp-mode button{flex:1;font-size:11px;padding:10px 8px;line-height:1.3;}',
    'body.coach-session label,body.coach-viewing-client label,#cp-client-list label,.card label,body.coach-session label span,body.coach-viewing-client label span,.card label span{color:#eee !important;-webkit-text-fill-color:#eee !important;}',
    'body.coach-session .btn-outline,body.coach-viewing-client .btn-outline,.cp-chat-tools .btn-outline,.cp-chat-composer .btn-outline{color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;}',
    'body.coach-session .btn-primary,body.coach-viewing-client .btn-primary{color:#000 !important;-webkit-text-fill-color:#000 !important;}',
    'body.coach-session input[type="search"],body.coach-session input[type="text"]:not(.cp-chat-input),body.coach-viewing-client input[type="search"],body.coach-viewing-client input[type="text"]:not(.cp-chat-input){background:#111 !important;color:#fff !important;-webkit-text-fill-color:#fff !important;border:1px solid #333;border-radius:8px;padding:10px;width:100%;}',
    'body.coach-session input[type="checkbox"],body.coach-viewing-client input[type="checkbox"],.card input[type="checkbox"],#view-container input[type="checkbox"]{width:18px !important;min-width:18px !important;max-width:22px !important;height:18px !important;padding:0 !important;margin:0;flex-shrink:0;box-sizing:border-box;}',
    'body.coach-session label:has(input[type="checkbox"]),body.coach-viewing-client label:has(input[type="checkbox"]),.card label:has(input[type="checkbox"]){display:flex !important;align-items:flex-start;gap:10px;width:100%;box-sizing:border-box;}',
    'body.coach-session label:has(input[type="checkbox"])>span,body.coach-viewing-client label:has(input[type="checkbox"])>span,.card label:has(input[type="checkbox"])>span{flex:1;min-width:0;white-space:normal;overflow-wrap:anywhere;word-break:normal;line-height:1.35;}',
    'body.coach-session .fab-save,body.coach-viewing-client .fab-save,body.role-athlete .fab-save{display:none !important;}',
    'body.coach-session header #profile-button{display:none !important;}',
    'body.coach-session header #account-button{display:none !important;}',
    '.cp-msg{padding:8px 10px;border-radius:10px;margin:6px 0;font-size:13px;line-height:1.4;color:#f2f2f2 !important;}',
    '.cp-msg.me{background:#1a1608;border:1px solid rgba(212,175,55,.35);margin-left:18%;}',
    '.cp-msg.them{background:#151515;border:1px solid #333;margin-right:18%;}',
    '.cp-msg-img{display:block;max-width:220px;max-height:220px;width:auto;height:auto;object-fit:cover;border-radius:10px;margin-top:6px;cursor:pointer;border:1px solid #333;}',
    '.cp-lightbox{position:fixed;inset:0;z-index:10150;background:rgba(0,0,0,.92);display:none;align-items:center;justify-content:center;padding:16px;flex-direction:column;gap:12px;}',
    '.cp-lightbox.active{display:flex;}',
    '.cp-lightbox img{max-width:100%;max-height:72vh;border-radius:10px;object-fit:contain;}',
    '.cp-badge{font-size:9px;padding:3px 6px;border-radius:4px;border:1px solid #444;color:#ccc;margin-left:6px;}',
    '.cp-row{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid #222;}',
    '.cp-chat-tools{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;}',
    '.cp-chat-shell{display:flex;flex-direction:column;flex:1;min-height:0;height:100%;}',
    '.cp-chat-thread{flex:1;min-height:0;overflow:auto;background:#0a0a0a;border:1px solid #222;border-radius:12px;padding:8px;}',
    '.cp-chat-composer{display:flex;gap:6px;align-items:center;margin-top:6px;flex-shrink:0;}',
    '.cp-icon-btn{width:44px;height:44px;min-width:44px;min-height:44px;padding:0 !important;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;flex-shrink:0;overflow:visible;line-height:1;}',
    '.cp-icon-btn svg{width:20px !important;height:20px !important;min-width:20px;min-height:20px;fill:currentColor;stroke:currentColor;display:block;flex-shrink:0;overflow:visible;}',
    '.cp-file-chip{display:inline-flex;align-items:center;gap:8px;margin-top:6px;padding:8px 10px;border:1px solid #333;border-radius:10px;background:#141414;color:var(--gold);text-decoration:none;font-size:11px;max-width:100%;}',
    '.cp-file-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eee !important;-webkit-text-fill-color:#eee !important;}',
    '.cp-file-ico{width:28px;height:28px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;color:var(--gold);}',
    '.cp-file-ico svg{width:24px !important;height:24px !important;display:block;}',
    '.cp-icon-btn.cp-dictate-on{border-color:#2ecc71 !important;color:#2ecc71 !important;-webkit-text-fill-color:#2ecc71 !important;background:rgba(46,204,113,.12);}',
    '.cp-icon-btn.cp-dictate-off{border-color:#e74c3c !important;color:#e74c3c !important;-webkit-text-fill-color:#e74c3c !important;}',
    '.cp-chat-input{flex:1;min-width:0;padding:10px 12px !important;border-radius:20px !important;border:1px solid #333 !important;background:#151515 !important;color:#fff !important;-webkit-text-fill-color:#fff !important;width:auto !important;}',
    '.cp-client-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
    '.cp-client-actions .btn{font-size:10px;padding:8px 10px;flex:0 0 auto;}',
    '@media (min-width:768px){.cp-icon-btn{width:48px;height:48px;min-width:48px;}.cp-icon-btn svg{width:22px !important;height:22px !important;}.cp-client-actions{gap:10px;}.cp-client-actions .btn{font-size:11px;padding:10px 12px;}}',
    '.cp-client-switcher{max-width:120px;min-width:72px;padding:6px 4px;background:#111;border:1px solid #444;color:#eee;border-radius:8px;font-size:10px;}',
    '#cp-coach-drawer{position:fixed;inset:0;z-index:10130;display:none;}',
    '#cp-coach-drawer.active{display:block;}',
    '#cp-coach-drawer .cp-drawer-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.65);}',
    '#cp-coach-drawer .cp-drawer-panel{position:absolute;top:0;right:0;bottom:0;width:min(320px,92vw);background:#0d0d0d;border-left:1px solid var(--gold);padding:16px;padding-top:calc(16px + env(safe-area-inset-top,0px));padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));overflow:auto;box-sizing:border-box;color:#eee;}',
    '.cp-drawer-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}',
    '.cp-drawer-grid .btn{font-size:10px;padding:10px 8px;width:100%;}',
    'body.coach-session .bottom-nav .nav-item svg{width:22px;height:22px;flex-shrink:0;}',
    'body.coach-session .bottom-nav .nav-item span{font-size:9px;}',
    '.cp-attach-sheet{position:fixed;inset:0;z-index:10140;background:rgba(0,0,0,.72);display:none;align-items:flex-end;justify-content:center;padding:16px;}',
    '.cp-attach-sheet.active{display:flex;}',
    '.cp-attach-sheet .cp-sheet{width:100%;max-width:420px;background:#121212;border:1px solid #333;border-radius:16px 16px 12px 12px;padding:14px;color:#eee;}',
    '.cp-attach-sheet button{width:100%;margin-top:8px;}',
    '.cp-inapp-notify{position:fixed;left:10px;right:10px;top:calc(var(--header-height) + 8px + var(--cp-session-bar, 0px));z-index:10160;background:#151515;border:1px solid var(--gold);border-radius:12px;padding:10px 12px;color:#eee;box-shadow:0 8px 24px rgba(0,0,0,.45);cursor:pointer;}',
    '.cp-inapp-notify b{color:var(--gold);display:block;font-size:12px;margin-bottom:2px;}',
    '.cp-inapp-notify span{font-size:11px;color:#ccc;}',
    '#cp-notify-btn{position:relative;font-size:9px;padding:6px 8px;margin-left:0;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;flex-shrink:0;white-space:nowrap;}',
    '#cp-notify-btn .cp-notify-count{position:absolute;top:-6px;right:-6px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#c66;color:#fff !important;-webkit-text-fill-color:#fff !important;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1;}',
    '#cp-notify-center{position:fixed;inset:0;z-index:10170;background:rgba(0,0,0,.88);display:none;align-items:flex-end;justify-content:center;padding:16px;box-sizing:border-box;}',
    '#cp-notify-center.active{display:flex;}',
    '#cp-notify-center .cp-notify-panel{width:100%;max-width:440px;max-height:min(78vh,640px);overflow:auto;background:#0d0d0d;border:1px solid var(--gold);border-radius:16px;padding:14px;color:#eee;box-sizing:border-box;}',
    '.cp-notify-item{display:block;width:100%;text-align:left;padding:12px;margin:0 0 8px;background:#141414;border:1px solid #333;border-radius:10px;color:#eee !important;-webkit-text-fill-color:#eee !important;box-sizing:border-box;}',
    '.cp-notify-item-main{display:block;width:100%;text-align:left;background:transparent;border:0;padding:0;color:inherit;cursor:pointer;}',
    '.cp-notify-item b{display:block;color:var(--gold);font-size:12px;margin-bottom:4px;}',
    '.cp-notify-item span{display:block;font-size:11px;color:#bbb;}',
    '.cp-notify-item small{display:block;font-size:10px;color:#777;margin-top:6px;}',
    '.cp-notify-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}',
    '.cp-notify-actions .btn{flex:1;min-width:110px;font-size:10px;padding:8px 6px;}',
    '.cp-notify-toolbar{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;}',
    '.cp-notify-toolbar .btn{flex:1;min-width:120px;font-size:10px;padding:8px 6px;}',
    '.cp-assign-bar{position:fixed;right:10px;bottom:calc(72px + env(safe-area-inset-bottom,0px));left:auto;z-index:10080;background:#111;border:1px solid var(--gold);border-radius:12px;padding:8px 10px;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:min(360px,calc(100vw - 20px));max-height:min(42vh,320px);overflow:auto;box-sizing:border-box;}',
    '.cp-assign-bar.cp-assign-collapsed{left:auto;right:10px;bottom:calc(72px + env(safe-area-inset-bottom,0px));padding:0;max-width:none;max-height:none;overflow:visible;background:transparent;border:0;box-shadow:none;}',
    '.cp-assign-chip{display:inline-flex;align-items:center;gap:8px;padding:10px 12px;background:#111;border:1px solid var(--gold);border-radius:999px;color:var(--gold);font-size:11px;font-weight:800;cursor:pointer;-webkit-tap-highlight-color:transparent;box-shadow:0 6px 18px rgba(0,0,0,.4);}',
    '.cp-assign-bar.cp-assign-expanded{left:8px;right:8px;width:auto;max-width:none;}',
    'body.cp-assign-expanded main{padding-bottom:calc(160px + env(safe-area-inset-bottom,0px)) !important;}',
    'body.cp-modal-open .cp-assign-bar,body.cp-busy .cp-assign-bar{visibility:hidden !important;pointer-events:none !important;}',
    '.cp-chat-send-progress{height:3px;background:#222;border-radius:2px;overflow:hidden;margin:4px 0 0;display:none;}',
    '.cp-chat-send-progress.active{display:block;}',
    '.cp-chat-send-progress>i{display:block;height:100%;width:35%;background:var(--gold);animation:cpSendBar 0.9s ease-in-out infinite;}',
    '@keyframes cpSendBar{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}',
    '.cp-icon-btn.cp-send-pressed{transform:scale(0.88);filter:brightness(1.25);transition:transform .12s ease,filter .12s ease;}',
    '.cp-icon-btn.cp-sending{opacity:.55;pointer-events:none;}',
    '.cp-pw-row{display:flex;gap:6px;align-items:center;}',
    '.cp-pw-row input{flex:1;}',
    '.cp-cal-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}',
    '.cp-cal-grid select{width:100%;padding:12px 8px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;font-size:14px;font-weight:700;}',
    '.cp-exam-cat{margin:10px 0;border:1px solid #222;border-radius:10px;padding:8px;}',
    '.cp-exam-cat h4{margin:0 0 6px;font-size:11px;color:var(--gold);}',
    '.cp-exam-item{display:flex;gap:8px;align-items:center;font-size:12px;color:#ddd;padding:4px 0;}',
    '#cp-call-overlay{position:fixed;inset:0;z-index:10120;background:#050505;display:none;flex-direction:column;width:100%;height:100%;height:100dvh;max-height:100dvh;overflow:hidden;box-sizing:border-box;}',
    '#cp-call-overlay.active{display:flex;}',
    '#cp-call-overlay .cp-call-bar{padding:10px 12px;padding-top:calc(10px + env(safe-area-inset-top,0px));display:flex;justify-content:space-between;align-items:center;gap:8px;background:rgba(8,8,8,.92);border-bottom:1px solid #333;flex-shrink:0;z-index:3;}',
    '#cp-call-stage{position:relative;flex:1;min-height:0;background:#000;overflow:hidden;}',
    '#cp-call-remote{position:absolute;inset:0;width:100% !important;height:100% !important;object-fit:cover;background:#000;z-index:1;}',
    '#cp-call-local{position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(92px + env(safe-area-inset-bottom,0px));width:104px !important;height:140px !important;border-radius:10px;border:1px solid var(--gold);z-index:2;object-fit:cover;background:#111;box-shadow:0 4px 16px rgba(0,0,0,.45);}',
    '#cp-call-controls{position:absolute;left:0;right:0;bottom:0;z-index:4;display:flex;justify-content:center;align-items:center;gap:18px;padding:14px 16px;padding-bottom:calc(14px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,rgba(0,0,0,.75));}',
    '#cp-call-controls .cp-call-btn{width:52px;height:52px;border-radius:50%;border:1px solid #444;background:#1a1a1a;color:#eee;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0;-webkit-tap-highlight-color:transparent;}',
    '#cp-call-controls .cp-call-btn.is-off{background:#333;color:#f66;border-color:#844;}',
    '#cp-call-controls .cp-call-btn.cp-call-hangup{background:#b00020;border-color:#b00020;color:#fff;width:58px;height:58px;}',
    '@media (orientation:landscape){#cp-call-local{width:148px !important;height:100px !important;bottom:calc(72px + env(safe-area-inset-bottom,0px));right:max(16px,env(safe-area-inset-right,0px));}#cp-call-controls{gap:24px;padding:10px 20px;padding-bottom:calc(10px + env(safe-area-inset-bottom,0px));}#cp-call-controls .cp-call-btn{width:48px;height:48px;}#cp-call-controls .cp-call-btn.cp-call-hangup{width:54px;height:54px;}}',
    '@media (min-width:900px){#cp-call-local{width:132px !important;height:176px !important;}}'
  ].join('');
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

function setNurvanAppBadge(n) {
  try {
    if (typeof window !== 'undefined' && window.NativeConfig) return;
    const count = Math.max(0, Number(n) || 0);
    if (count <= 0) {
      clearNurvanAppBadge();
      return;
    }
    if (navigator.setAppBadge) navigator.setAppBadge(count).catch(function () {});
  } catch (_) {}
}

function clearNurvanAppBadge() {
  try {
    if (typeof window !== 'undefined' && window.NativeConfig) return;
    if (navigator.clearAppBadge) navigator.clearAppBadge().catch(function () {});
  } catch (_) {}
}

function updateNotifyCount(n, items) {
  store.__cpNotifyCount = Math.max(0, Number(n) || 0);
  if (Array.isArray(items)) store.__cpNotifyItems = items;
  setNurvanAppBadge(store.__cpNotifyCount);
  ensureNotifyButton();
}

function ensureNotifyButton() {
  const headerActions = document.querySelector('.header-actions');
  if (!headerActions) return;
  let btn = document.getElementById('cp-notify-btn');
  const logged = !!(store && store.accountToken);
  const athlete = typeof isAthleteRole === 'function' && isAthleteRole();
  const coachSession = !!(store && store.coachSessionActive && !athlete);
  // Coach: notifiche generali nel MENU COACH. Header solo atleta (o coach fuori sessione).
  if (!logged || coachSession) {
    if (btn) btn.style.display = 'none';
    return;
  }
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'cp-notify-btn';
    btn.className = 'btn btn-outline';
    btn.onclick = function () { openNotificationsCenter(); };
    const account = document.getElementById('account-button');
    if (account && account.parentElement === headerActions) headerActions.insertBefore(btn, account.nextSibling);
    else headerActions.insertBefore(btn, headerActions.firstChild);
  }
  const n = Math.max(0, Number(store.__cpNotifyCount || 0));
  btn.style.display = '';
  btn.innerHTML = 'NOTIFICHE' + (n > 0 ? '<span class="cp-notify-count">' + (n > 99 ? '99+' : n) + '</span>' : '');
}

function fmtNotifyWhen(iso) {
  const raw = String(iso || '');
  if (!raw) return '';
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return dd + '/' + mm + ' · ' + hh + ':' + mi;
  }
  return raw.replace('T', ' ').slice(0, 16);
}

function coachEventLabel(kind, name) {
  const n = name || 'Atleta';
  if (kind === 'message') return { title: 'Messaggio', body: n + ' ti ha scritto', view: 'chat' };
  if (kind === 'ask_coach') return { title: 'Richiesta al coach', body: n + ' chiede qualcosa', view: 'chat' };
  if (kind === 'password_help') return { title: 'Recupero password', body: n + ' ha chiesto la password', view: 'coachClient' };
  if (kind === 'leave_request') return { title: 'Fine collaborazione', body: n + ' ha chiesto di chiudere', view: 'coachClient' };
  if (kind === 'change_request') return { title: 'Modifica da approvare', body: n + ' vuole cambiare il programma', view: 'coachClient' };
  if (kind === 'change_notice') return { title: 'Atleta ha modificato', body: n + ' ha cambiato il programma', view: 'coachClient' };
  if (kind === 'request_program') return { title: 'Richiesta scheda', body: n + ' chiede la scheda', view: 'coachClient' };
  if (kind === 'workout_started') return { title: 'In allenamento', body: n + ' ha iniziato il workout', view: 'workout_started' };
  if (kind === 'workout_done') return { title: 'Workout finito', body: n + ' ha finalizzato', view: 'workout_done' };
  const copy = eventNotifyCopy(kind);
  if (copy) return { title: copy[0], body: n + ' · ' + copy[1], view: 'coachClient' };
  return { title: 'Attività', body: n + ' · ' + String(kind || 'evento'), view: 'coachClient' };
}

function athleteNotifyRoute(kind) {
  const copy = eventNotifyCopy(kind);
  return (copy && copy[2]) || { view: 'home' };
}

function notifyIsAthlete() {
  return typeof isAthleteRole === 'function' && isAthleteRole();
}

function notifyAckPath() {
  return notifyIsAthlete() ? '/api/client/inbox/ack' : '/api/coach/inbox/ack';
}

function notifyDismissPath() {
  return notifyIsAthlete() ? '/api/client/inbox/dismiss' : '/api/coach/inbox/dismiss';
}

function buildAthleteNotifyItems(box) {
  const items = [];
  const unreadMsg = Number(box.unreadMessages || 0);
  if (unreadMsg > 0) {
    items.push({
      key: 'msg',
      kind: 'message',
      title: unreadMsg === 1 ? 'Nuovo messaggio' : (unreadMsg + ' messaggi nuovi'),
      body: 'Il coach ti ha scritto — apri la chat',
      when: '',
      unread: true,
      route: { view: 'clientChat' },
      eventIds: []
    });
  }
  const events = (box.events || []).filter(function (e) {
    if (!e || e.kind === 'message') return false;
    const df = e.dismissed_for;
    if (Array.isArray(df) && df.indexOf('athlete') >= 0) return false;
    return true;
  }).slice();
  events.sort(function (a, b) {
    const au = a.read_at ? 1 : 0;
    const bu = b.read_at ? 1 : 0;
    if (au !== bu) return au - bu;
    return Number(b.id || 0) - Number(a.id || 0);
  });
  events.slice(0, 30).forEach(function (e) {
    const copy = eventNotifyCopy(e.kind) || ['Aggiornamento', String(e.kind || 'Notifica'), { view: 'home' }];
    const unread = !e.read_at;
    items.push({
      key: 'ev_' + e.id,
      kind: 'event',
      title: copy[0] + (unread ? '' : ''),
      body: copy[1],
      when: fmtNotifyWhen(e.created_at),
      unread: unread,
      route: copy[2] || { view: 'home' },
      eventIds: [Number(e.id)]
    });
  });
  return items;
}

function countAthleteUnread(box) {
  const unreadEv = (box.events || []).filter(function (e) {
    if (!e || e.read_at || e.kind === 'message') return false;
    const df = e.dismissed_for;
    if (Array.isArray(df) && df.indexOf('athlete') >= 0) return false;
    return true;
  }).length;
  return Number(box.unreadMessages || 0) + unreadEv;
}

function renderNotifyItemsHtml(items, emptyText) {
  if (!items || !items.length) return '<div class="cp-help">' + esc(emptyText || 'Nessuna notifica.') + '</div>';
  return items.map(function (it, idx) {
    return '<div class="cp-notify-item" style="' + (it.unread ? 'border-color:rgba(212,175,55,.55);' : 'opacity:.88;') + '">' +
      '<button type="button" class="cp-notify-item-main" onclick="openNotifyItem(' + idx + ')">' +
      '<b>' + esc(it.title) + (it.unread ? ' · NUOVA' : '') + '</b>' +
      '<span>' + esc(it.body) + '</span>' +
      (it.when ? '<small>' + esc(it.when) + '</small>' : '') +
      '</button>' +
      '<div class="cp-notify-actions">' +
      '<button type="button" class="btn btn-outline" onclick="markNotifyRead(' + idx + ')">SEGNA LETTA</button>' +
      '<button type="button" class="btn btn-outline" onclick="dismissNotifyItem(' + idx + ')">CANCELLA</button>' +
      '</div></div>';
  }).join('');
}

function buildCoachNotifyItems(box) {
  const items = [];
  (box.events || []).forEach(function (e) {
    if (!e) return;
    const df = e.dismissed_for;
    if (Array.isArray(df) && df.indexOf('coach') >= 0) return;
    const name = e.display_name || 'Atleta';
    const lab = coachEventLabel(e.kind, name);
    items.push({
      key: 'ev_' + e.id,
      kind: 'event',
      title: lab.title,
      body: lab.body,
      when: fmtNotifyWhen(e.created_at),
      unread: true,
      route: { view: lab.view, clientId: String(e.client_id || '') },
      eventIds: [Number(e.id)]
    });
  });
  (box.clients || []).forEach(function (c) {
    const n = Number(c.unreadCount || 0);
    if (n <= 0) return;
    const already = items.some(function (it) {
      return it.route && String(it.route.clientId) === String(c.id) && (it.route.view === 'chat' || it.title === 'Messaggio');
    });
    if (already) return;
    items.push({
      key: 'cl_' + c.id,
      kind: 'message',
      title: n === 1 ? 'Messaggio non letto' : (n + ' messaggi non letti'),
      body: (c.displayName || 'Cliente') + (c.hasPendingChange ? ' · modifica da approvare' : '') + (c.leaveRequested ? ' · fine richiesta' : ''),
      when: '',
      unread: true,
      route: { view: 'chat', clientId: String(c.id) },
      eventIds: []
    });
  });
  return items;
}

function buildCoachClientNotifyItems(events, clientId, clientName) {
  const name = clientName || 'Cliente';
  const cid = String(clientId || '');
  return (events || []).map(function (e) {
    if (!e) return null;
    const df = e.dismissed_for;
    if (Array.isArray(df) && df.indexOf('coach') >= 0) return null;
    const lab = coachEventLabel(e.kind, name);
    const unread = !e.read_at;
    return {
      key: 'ev_' + e.id,
      kind: 'event',
      title: lab.title + (unread ? '' : ''),
      body: lab.body,
      when: fmtNotifyWhen(e.created_at),
      unread: unread,
      route: { view: lab.view, clientId: cid },
      eventIds: [Number(e.id)]
    };
  }).filter(Boolean);
}

function closeNotificationsCenter() {
  const el = document.getElementById('cp-notify-center');
  if (el) el.classList.remove('active');
}

async function ackNotifyEventIds(ids) {
  const list = (ids || []).map(function (n) { return Number(n); }).filter(function (n) { return n > 0; });
  if (!list.length) return { ok: true, updated: 0 };
  return practiceFetch(notifyAckPath(), {
    method: 'POST', headers: practiceHeaders(true),
    body: JSON.stringify({ ids: list })
  }, 15000);
}

async function dismissNotifyEventIds(ids) {
  const list = (ids || []).map(function (n) { return Number(n); }).filter(function (n) { return n > 0; });
  if (!list.length) return { ok: true, updated: 0 };
  return practiceFetch(notifyDismissPath(), {
    method: 'POST', headers: practiceHeaders(true),
    body: JSON.stringify({ ids: list })
  }, 15000);
}

async function ackNotifyMessages(it) {
  if (!it || it.kind !== 'message') return;
  if (notifyIsAthlete()) {
    await practiceFetch('/api/client/messages', { method: 'GET', headers: practiceHeaders(false) }, 12000);
  } else if (it.route && it.route.clientId) {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(String(it.route.clientId)) + '/messages', {
      method: 'GET', headers: practiceHeaders(false)
    }, 12000);
  }
}

function refreshNotificationsCenterUi() {
  const scoped = store.__cpNotifyScopeId || '';
  openNotificationsCenter(scoped || undefined);
}

async function openNotificationsCenter(clientId) {
  ensurePracticeStyle();
  let el = document.getElementById('cp-notify-center');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cp-notify-center';
    el.onclick = function (ev) { if (ev.target === el) closeNotificationsCenter(); };
    document.body.appendChild(el);
  }
  const scopedId = clientId ? String(clientId) : '';
  store.__cpNotifyScopeId = scopedId;
  const scopedName = scopedId
    ? ((store.coachWorkspace && store.coachWorkspace.client && store.coachWorkspace.client.displayName) || 'cliente')
    : '';
  el.innerHTML = '<div class="cp-notify-panel"><div style="font-size:10px;color:var(--gold);font-weight:800;">' +
    (scopedId ? ('NOTIFICHE · ' + esc(scopedName)) : 'NOTIFICHE') + '</div>' +
    '<div class="cp-help" style="margin:8px 0;">Caricamento…</div></div>';
  el.classList.add('active');
  try {
    let items = [];
    let title = 'NOTIFICHE';
    if (notifyIsAthlete()) {
      const box = await practiceFetch('/api/client/inbox', { method: 'GET', headers: practiceHeaders(false) }, 15000);
      items = buildAthleteNotifyItems(box);
      updateNotifyCount(countAthleteUnread(box), items);
      title = 'LE TUE NOTIFICHE';
    } else if (scopedId) {
      const ev = await practiceFetch('/api/coach/clients/' + encodeURIComponent(scopedId) + '/events', { method: 'GET', headers: practiceHeaders(false) }, 15000);
      items = buildCoachClientNotifyItems(ev.events || [], scopedId, scopedName);
      store.__cpNotifyItems = items;
      title = 'NOTIFICHE · ' + scopedName;
    } else {
      const box = await practiceFetch('/api/coach/inbox', { method: 'GET', headers: practiceHeaders(false) }, 15000);
      items = buildCoachNotifyItems(box);
      updateNotifyCount(items.length, items);
      title = 'NOTIFICHE COACH';
    }
    store.__cpNotifyItems = items;
    const toolbar = items.length
      ? ('<div class="cp-notify-toolbar">' +
        '<button type="button" class="btn btn-outline" onclick="markAllNotifyRead()">SEGNA TUTTE LETTE</button>' +
        '<button type="button" class="btn btn-outline" onclick="dismissAllNotifyItems()">CANCELLA TUTTE</button>' +
        '</div>')
      : '';
    el.innerHTML = '<div class="cp-notify-panel">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">' +
      '<div style="font-size:10px;color:var(--gold);font-weight:800;">' + esc(title) + (items.length ? ' · ' + items.length : '') + '</div>' +
      '<button type="button" class="btn btn-outline" style="font-size:10px;padding:6px 8px;" onclick="closeNotificationsCenter()">CHIUDI</button></div>' +
      (notifyIsAthlete()
        ? '<div class="cp-help" style="margin-bottom:8px;">Messaggi e aggiornamenti del coach, con data e ora.</div>'
        : (scopedId
          ? '<div class="cp-help" style="margin-bottom:8px;">Solo attività di questo cliente, con data e ora.</div>'
          : '<div class="cp-help" style="margin-bottom:8px;">Panoramica di tutti i clienti.</div>')) +
      toolbar +
      renderNotifyItemsHtml(items, notifyIsAthlete()
        ? 'Nessuna notifica per ora.'
        : (scopedId ? 'Nessuna attività recente per questo cliente.' : 'Nessuna notifica da leggere.')) +
      '</div>';
  } catch (err) {
    el.innerHTML = '<div class="cp-notify-panel"><div style="font-size:10px;color:var(--gold);font-weight:800;">NOTIFICHE</div>' +
      '<div class="cp-help">' + esc(friendlyApiError(err)) + '</div>' +
      '<button type="button" class="btn btn-outline" style="width:100%;" onclick="openNotificationsCenter(' + (scopedId ? ("'" + esc(scopedId) + "'") : '') + ')">RIPROVA</button>' +
      '<button type="button" class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="closeNotificationsCenter()">CHIUDI</button></div>';
  }
}

function removeNotifyItemLocal(idx) {
  const items = (store.__cpNotifyItems || []).slice();
  if (idx < 0 || idx >= items.length) return;
  items.splice(idx, 1);
  store.__cpNotifyItems = items;
  const unreadLeft = items.filter(function (x) { return x && x.unread; }).length;
  updateNotifyCount(unreadLeft, items);
  const panel = document.querySelector('#cp-notify-center .cp-notify-panel');
  if (!panel) return;
  const headerRow = panel.children[0] ? panel.children[0].outerHTML : '';
  const help = panel.querySelector('.cp-help');
  const helpHtml = help ? help.outerHTML : '';
  const toolbar = items.length
    ? ('<div class="cp-notify-toolbar">' +
      '<button type="button" class="btn btn-outline" onclick="markAllNotifyRead()">SEGNA TUTTE LETTE</button>' +
      '<button type="button" class="btn btn-outline" onclick="dismissAllNotifyItems()">CANCELLA TUTTE</button>' +
      '</div>')
    : '';
  const empty = notifyIsAthlete()
    ? 'Nessuna notifica per ora.'
    : ((store.__cpNotifyScopeId) ? 'Nessuna attività recente per questo cliente.' : 'Nessuna notifica da leggere.');
  panel.innerHTML = headerRow + helpHtml + toolbar + renderNotifyItemsHtml(items, empty);
}

async function markNotifyRead(idx) {
  const items = store.__cpNotifyItems || [];
  const it = items[Number(idx)];
  if (!it) return;
  try {
    if (it.kind === 'message') {
      await ackNotifyMessages(it);
    } else if (it.eventIds && it.eventIds.length) {
      await ackNotifyEventIds(it.eventIds);
      await dismissNotifyEventIds(it.eventIds);
    }
    removeNotifyItemLocal(Number(idx));
    practiceToast('Notifica archiviata', 'success');
    setTimeout(function () { pollPracticeInbox(); }, 400);
  } catch (err) {
    practiceToast((err && err.message) || 'Impossibile segnare come letta', 'danger');
  }
}

async function dismissNotifyItem(idx) {
  const items = store.__cpNotifyItems || [];
  const it = items[Number(idx)];
  if (!it) return;
  try {
    if (it.kind === 'message') {
      await ackNotifyMessages(it);
    } else if (it.eventIds && it.eventIds.length) {
      await dismissNotifyEventIds(it.eventIds);
    }
    removeNotifyItemLocal(Number(idx));
    practiceToast('Notifica cancellata', 'success');
    setTimeout(function () { pollPracticeInbox(); }, 400);
  } catch (err) {
    practiceToast((err && err.message) || 'Impossibile cancellare', 'danger');
  }
}

async function markAllNotifyRead() {
  const items = (store.__cpNotifyItems || []).slice();
  if (!items.length) return;
  try {
    const ids = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'message') await ackNotifyMessages(it);
      else if (it.eventIds && it.eventIds.length) ids.push.apply(ids, it.eventIds);
    }
    if (ids.length) {
      await ackNotifyEventIds(ids);
      await dismissNotifyEventIds(ids);
    }
    store.__cpNotifyItems = [];
    updateNotifyCount(0, []);
    practiceToast('Tutte archiviate', 'success');
    refreshNotificationsCenterUi();
    setTimeout(function () { pollPracticeInbox(); }, 400);
  } catch (err) {
    practiceToast((err && err.message) || 'Operazione non riuscita', 'danger');
  }
}

async function dismissAllNotifyItems() {
  const items = (store.__cpNotifyItems || []).slice();
  if (!items.length) return;
  if (!window.confirm('Cancellare tutte le notifiche dalla lista?')) return;
  try {
    const ids = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'message') await ackNotifyMessages(it);
      else if (it.eventIds && it.eventIds.length) ids.push.apply(ids, it.eventIds);
    }
    if (ids.length) await dismissNotifyEventIds(ids);
    store.__cpNotifyItems = [];
    updateNotifyCount(0, []);
    practiceToast('Lista svuotata', 'success');
    refreshNotificationsCenterUi();
    setTimeout(function () { pollPracticeInbox(); }, 400);
  } catch (err) {
    practiceToast((err && err.message) || 'Operazione non riuscita', 'danger');
  }
}

async function openNotifyItem(idx) {
  const items = store.__cpNotifyItems || [];
  const it = items[Number(idx)];
  if (!it) return;
  closeNotificationsCenter();
  try {
    if (it.kind === 'message') {
      await ackNotifyMessages(it);
    } else if (it.eventIds && it.eventIds.length) {
      await ackNotifyEventIds(it.eventIds);
    }
  } catch (_) {}
  try { handleNotifyRoute(it.route); } catch (_) {}
  setTimeout(function () { pollPracticeInbox(); }, 400);
}

function openClientSheetNotify(idx) {
  store.__cpNotifyItems = window.__cpClientSheetNotifies || [];
  openNotifyItem(idx);
}

function maybePromptUnreadNotifications() {
  if (!(store && store.accountToken)) return;
  if (store.__cpNotifPrompted) return;
  const n = Number(store.__cpNotifyCount || 0);
  if (n <= 0) return;
  store.__cpNotifPrompted = true;
  showInAppNotify(
    n === 1 ? '1 notifica da leggere' : (n + ' notifiche da leggere'),
    'Tocca per aprirle',
    { view: '__notify_center' }
  );
}

function scheduleAthleteLiveWorkoutSync() {
  if (!(typeof isAthleteRole === 'function' && isAthleteRole())) return;
  if (!store || !store.accountToken || !store.sessionStartedAt) return;
  clearTimeout(window.__cpLiveSyncTimer);
  window.__cpLiveSyncTimer = setTimeout(function () {
    pushAthleteLiveWorkoutSync();
  }, 2500);
}

async function pushAthleteLiveWorkoutSync() {
  if (!(typeof isAthleteRole === 'function' && isAthleteRole())) return;
  if (!store || !store.accountToken || !store.sessionStartedAt) return;
  const payload = {
    data: store.data || {},
    currentWeek: typeof currentWeek !== 'undefined' ? currentWeek : null,
    currentDay: typeof currentDay !== 'undefined' ? currentDay : null,
    liveWorkoutSyncedAt: new Date().toISOString()
  };
  try {
    await practiceFetch('/api/client/workout-live-sync', {
      method: 'POST', headers: practiceHeaders(true),
      body: JSON.stringify({ data: payload })
    }, 12000);
  } catch (_) {
    enqueueClientOutbox({ type: 'workout-live-sync', data: payload });
  }
}

async function flushClientOutbox() {
  if (!store || !store.accountToken || !Array.isArray(store.clientOutbox) || !store.clientOutbox.length) return;
  const left = [];
  for (let i = 0; i < store.clientOutbox.length; i++) {
    const it = store.clientOutbox[i];
    try {
      if (it.type === 'workout-ping') await practiceFetch('/api/client/workout-ping', { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ data: it.data || null }) });
      else if (it.type === 'workout-live-sync') await practiceFetch('/api/client/workout-live-sync', { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ data: it.data || null }) });
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
  const canClose = !!(typeof isAthleteRole === 'function' && !isAthleteRole() && store && store.coachSessionActive)
    || !!(store && store.accountToken && store.role !== 'athlete');
  p.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
    '<div style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1px;">INVITO COACH</div>' +
    '<button type="button" class="btn btn-outline" style="font-size:10px;padding:4px 10px;" onclick="closeClientInviteOverlay()">' + (canClose ? 'CHIUDI' : 'ESCI') + '</button></div>' +
    '<h2>Ciao' + (info && info.displayName ? ', ' + esc(info.displayName) : '') + '</h2>' +
    '<p class="cp-help">Ti segue <b style="color:#fff;">' + esc((info && info.coachName) || 'il tuo coach') + '</b>. Accedi con nome utente e password che ti ha dato. Un solo link, su qualsiasi telefono.</p>' +
    (info && info.intakeMode === 'new' ? '<p class="cp-help">Al primo accesso compilerai un questionario di acquisizione (menu a tendina).</p>' : '<p class="cp-help">Il coach ha già le tue informazioni: entri subito in app.</p>') +
    (info && info.error ? '<p class="cp-help" style="color:#f88;">' + esc(info.error) + '</p>' : '') +
    (inApp ? '<p class="cp-help">Puoi già accedere da qui. Per installare Nurvan sulla Home, apri il link in Safari o Chrome.</p>' : '') +
    '<div class="cp-field"><label>Nome utente</label><input id="cp-login-user" type="text" autocomplete="username" value="' + esc((info && info.username) || '') + '"></div>' +
    '<div class="cp-field"><label>Password</label><div class="cp-pw-row"><input id="cp-login-pass" type="password" autocomplete="current-password">' +
    '<button class="btn btn-outline" type="button" style="font-size:10px;padding:8px 10px;" onclick="toggleClientLoginPassword()">MOSTRA</button></div></div>' +
    '<label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:#ccc;margin:8px 0;width:100%;box-sizing:border-box;"><input id="cp-login-stay" type="checkbox" checked style="margin-top:2px;flex-shrink:0;width:18px;height:18px;"><span style="flex:1;min-width:0;">Resta connesso</span></label>' +
    '<div id="cp-invite-status" class="cp-help"></div>' +
    '<button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="submitClientInviteLogin()">ACCEDI</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="requestClientPasswordHelp()">RICHIEDI RECUPERO PASSWORD AL COACH</button>' +
    '<p class="cp-help" style="margin-top:12px;">Questo link apre solo lo spazio cliente Nurvan collegato al coach. Non è l’app completa.</p>';
}

function closeClientInviteOverlay() {
  showOverlay('cp-invite', false);
  const coachHere = !!(store && store.coachSessionActive) || !!(store && store.accountToken && store.role !== 'athlete');
  if (coachHere) {
    try { history.replaceState(null, '', '/'); } catch (_) {}
    store.inviteToken = null;
    store.clientShell = false;
    if (typeof persist === 'function') persist();
    applyClientChrome();
    if (typeof navigate === 'function') navigate(store.coachSessionActive ? 'coachHub' : 'home');
    return;
  }
  // Atleta senza sessione: esci dal shell invite senza restare bloccato
  try {
    store.inviteToken = null;
    store.clientShell = false;
    clearClientShellLock();
    history.replaceState(null, '', '/');
  } catch (_) {}
  if (typeof persist === 'function') persist();
  applyClientChrome();
  practiceToast('Finestra chiusa. Apri di nuovo il link invito del coach per accedere.', 'info');
  if (typeof navigate === 'function') navigate('home');
}

async function showClientInvite(token) {
  ensurePracticeStyle();
  ensurePracticeOverlays();
  const t = token || store.inviteToken || detectInviteToken();
  if (!t) return;
  store.inviteToken = t;
  applyInviteManifestStartUrl(t);
  let info = { username: '', displayName: '', coachName: 'Coach', intakeMode: 'new' };
  try {
    info = await practiceFetch('/api/client/invite/' + encodeURIComponent(t), { method: 'GET' }, 15000);
  } catch (err) {
    info.error = err && err.message;
  }
  renderInvitePanel(info);
  showOverlay('cp-invite', true);
  setTimeout(function () { maybeOfferClientHomeInstall(t); }, 600);
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
    if (payload.inviteToken) store.inviteToken = payload.inviteToken;
    store.inviteTokenBound = store.inviteToken || '';
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
    try {
      if (store.inviteToken) history.replaceState(null, '', '/c/' + encodeURIComponent(store.inviteToken));
    } catch (_) {}
    requestNotifyPermission();
    try { await syncAccountData(true); } catch (_) {}
    applyClientChrome();
    if (payload.client && payload.client.needIntake) showClientIntake(payload.client.intake || { firstName: '', lastName: '' });
    else showClientTutorial(false);
    if (typeof render === 'function') render();
    practiceToast('Bentornato, ' + (payload.user && payload.user.name || username), 'success');
    startPresenceHeartbeat();
    setTimeout(function () {
      maybeOfferClientHomeInstall(store.inviteToken);
      maybeSubscribeWebPush();
    }, 900);
  } catch (err) {
    const msg = (err && err.message) || 'Accesso non riuscito.';
    if (status) status.innerHTML = '<span style="color:#f88;">' + esc(msg.replace(/^HTTP\s*\d+:\s*/i, '')) + '</span>';
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
  if (!force && isClientTutorialDone()) return;
  ensurePracticeStyle();
  ensurePracticeOverlays();
  const p = document.getElementById('cp-tutorial-panel');
  if (!p) return;
  window.__cpTutStep = 0;
  drawClientTutorial();
  showOverlay('cp-tutorial', true);
}

function tutorialStorageKey() {
  const id = (store.accountUser && (store.accountUser.id || store.accountUser.email)) || store.inviteToken || 'anon';
  return 'NURVAN_CLIENT_TUTORIAL_DONE_' + String(id);
}

function isClientTutorialDone() {
  if (store && store.clientTutorialDone) return true;
  try { return localStorage.getItem(tutorialStorageKey()) === '1'; } catch (_) { return false; }
}

function markClientTutorialDone() {
  store.clientTutorialDone = true;
  try { localStorage.setItem(tutorialStorageKey(), '1'); } catch (_) {}
  if (typeof persist === 'function') persist();
}

function drawClientTutorial() {
  const p = document.getElementById('cp-tutorial-panel');
  if (!p) return;
  const i = window.__cpTutStep || 0;
  const step = CLIENT_TUTORIAL_STEPS[i] || CLIENT_TUTORIAL_STEPS[0];
  p.innerHTML = '<div style="font-size:10px;color:var(--gold);font-weight:800;">GUIDA ' + (i + 1) + '/5 · solo al primo accesso</div>' +
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
  markClientTutorialDone();
  showOverlay('cp-tutorial', false);
}

function openCoachOrUnlock() {
  if (typeof isCoachUnlocked === 'function' && isCoachUnlocked()) enterCoachSession();
  else showDemoUnlock();
}

function enterCoachSession() {
  if (store.coachViewingClient) {
    try { leaveCoachClientView(true); } catch (_) {}
  }
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
  clearClientShellLock();
  closeCoachDrawer();
  if (typeof persist === 'function') persist();
  applyClientChrome();
  navigate('home');
  practiceToast('Sessione Coach chiusa', 'success');
  return true;
}

function emptyDomainShell(domain) {
  const at = new Date().toISOString();
  if (domain === 'nutrition') {
    return {
      plan_name: '',
      present: false,
      days: [],
      daily_calories_target: null,
      daily_protein_target: null,
      daily_carbs_target: null,
      daily_fats_target: null,
      cleared: true,
      clearedAt: at
    };
  }
  if (domain === 'supplements' || domain === 'supplementation') {
    return { protocol_name: '', items: [], present: false, cleared: true, clearedAt: at };
  }
  if (domain === 'therapy') {
    return { present: false, medications: [], protocols: [], entries: [], cleared: true, clearedAt: at };
  }
  if (domain === 'exams') {
    return { patient_name: '', records: [], present: false, reminders: [], cleared: true, clearedAt: at };
  }
  return null;
}

function isClearedDomainPayload(obj, kind) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.cleared === true) return true;
  if (obj.present === false) {
    if (kind === 'nutrition') return !(Array.isArray(obj.days) && obj.days.length);
    if (kind === 'supplements' || kind === 'supplementation') return !(Array.isArray(obj.items) && obj.items.length);
    if (kind === 'therapy') {
      return !(Array.isArray(obj.medications) && obj.medications.length) &&
        !(Array.isArray(obj.entries) && obj.entries.length);
    }
    if (kind === 'exams') return !(Array.isArray(obj.records) && obj.records.length);
  }
  return false;
}

function preferFilledNutrition(a, b) {
  if (a && isClearedDomainPayload(a, 'nutrition')) return a;
  if (b && isClearedDomainPayload(b, 'nutrition') && !(a && !isClearedDomainPayload(a, 'nutrition'))) return b;
  function score(n) {
    if (!n || typeof n !== 'object' || isClearedDomainPayload(n, 'nutrition')) return 0;
    const days = Array.isArray(n.days) ? n.days : [];
    let foods = 0;
    days.forEach(function (d) {
      (d.meals || []).forEach(function (m) {
        foods += ((m.foods && m.foods.length) || (m.items && m.items.length) || 0);
      });
    });
    return days.length * 10 + foods;
  }
  return score(a) >= score(b) ? (a || b || null) : (b || a || null);
}

function preferFilledSupplementation(a, b) {
  if (a && isClearedDomainPayload(a, 'supplementation')) return a;
  if (b && isClearedDomainPayload(b, 'supplementation') && !(a && !isClearedDomainPayload(a, 'supplementation'))) return b;
  function score(s) {
    if (!s || typeof s !== 'object' || isClearedDomainPayload(s, 'supplementation')) return 0;
    return (Array.isArray(s.items) ? s.items.length : 0);
  }
  return score(a) >= score(b) ? (a || b || null) : (b || a || null);
}

function preferFilledTherapy(a, b) {
  if (a && isClearedDomainPayload(a, 'therapy')) return a;
  if (b && isClearedDomainPayload(b, 'therapy') && !(a && !isClearedDomainPayload(a, 'therapy'))) return b;
  function score(t) {
    if (!t || typeof t !== 'object' || isClearedDomainPayload(t, 'therapy')) return 0;
    return (Array.isArray(t.medications) ? t.medications.length : 0) +
      (Array.isArray(t.entries) ? t.entries.length : 0) +
      (Array.isArray(t.protocols) ? t.protocols.length : 0);
  }
  return score(a) >= score(b) ? (a || b || null) : (b || a || null);
}

function preferFilledExams(a, b) {
  if (a && isClearedDomainPayload(a, 'exams')) return a;
  if (b && isClearedDomainPayload(b, 'exams') && !(a && !isClearedDomainPayload(a, 'exams'))) return b;
  function score(e) {
    if (!e || typeof e !== 'object' || isClearedDomainPayload(e, 'exams')) return 0;
    return (Array.isArray(e.records) ? e.records.length : 0) +
      (Array.isArray(e.items) ? e.items.length : 0);
  }
  return score(a) >= score(b) ? (a || b || null) : (b || a || null);
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
  const nutr = preferFilledNutrition(payload.nutrition, DATA && DATA.nutrition);
  const supp = preferFilledSupplementation(payload.supplementation, DATA && DATA.supplementation);
  store.nutrition = nutr;
  store.supplementation = supp;
  store.therapy = payload.therapy || (DATA && DATA.therapy) || null;
  store.exams = payload.exams || (DATA && DATA.exams) || null;
  store.data = payload.data && typeof payload.data === 'object' ? JSON.parse(JSON.stringify(payload.data)) : {};
  store.customSets = payload.customSets && typeof payload.customSets === 'object' ? JSON.parse(JSON.stringify(payload.customSets)) : {};
  store.subs = payload.subs && typeof payload.subs === 'object' ? JSON.parse(JSON.stringify(payload.subs)) : {};
  store.skips = payload.skips && typeof payload.skips === 'object' ? JSON.parse(JSON.stringify(payload.skips)) : {};
  store.logs = Array.isArray(payload.logs) ? JSON.parse(JSON.stringify(payload.logs)) : [];
  store.bodyChecks = Array.isArray(payload.bodyChecks) ? JSON.parse(JSON.stringify(payload.bodyChecks)) : [];
  store.nutritionDaily = payload.nutritionDaily && typeof payload.nutritionDaily === 'object' ? JSON.parse(JSON.stringify(payload.nutritionDaily)) : {};
  store.bw = payload.bw && typeof payload.bw === 'object' ? JSON.parse(JSON.stringify(payload.bw)) : {};
  store.exMuscle = payload.exMuscle && typeof payload.exMuscle === 'object' ? JSON.parse(JSON.stringify(payload.exMuscle)) : {};
  store.loadTypes = payload.loadTypes && typeof payload.loadTypes === 'object' ? JSON.parse(JSON.stringify(payload.loadTypes)) : {};
  store.tempos = payload.tempos && typeof payload.tempos === 'object' ? JSON.parse(JSON.stringify(payload.tempos)) : {};
  store.bonus = payload.bonus && typeof payload.bonus === 'object' ? JSON.parse(JSON.stringify(payload.bonus)) : {};
  // Never merge client profile into the coach's personal store.profile (causes Giada→Giammaria leak)
  if (payload.profile && typeof payload.profile === 'object') {
    store.__cpClientViewProfile = JSON.parse(JSON.stringify(payload.profile));
    if (store.coachWorkspace) store.coachWorkspace.clientProfile = store.__cpClientViewProfile;
    if (typeof isAthleteRole === 'function' && isAthleteRole()) {
      store.profile = Object.assign({}, store.profile || {}, payload.profile);
    }
  }
  if (DATA) {
    if (typeof normalizeNutritionMeals === 'function' && store.nutrition && !isClearedDomainPayload(store.nutrition, 'nutrition')) {
      store.nutrition = normalizeNutritionMeals(store.nutrition);
    }
    DATA.nutrition = store.nutrition;
    DATA.supplementation = store.supplementation;
    DATA.therapy = store.therapy;
    DATA.exams = store.exams;
    if (typeof isAthleteRole === 'function' && isAthleteRole() && payload.profile) {
      DATA.profile = payload.profile;
    } else if (DATA.profile && store.coachViewingClient) {
      // Keep program profile display separate; do not overwrite coach identity in DATA
      delete DATA.profile;
    }
  }
  try {
    const lastOpen = (store.logs || []).slice().reverse().find(function (l) { return l && (l.week || l.day != null); });
    if (typeof advanceToNextOpenTrainingDay === 'function') {
      if (lastOpen) {
        currentWeek = Number(lastOpen.week) || 1;
        currentDay = Number(lastOpen.day) || 0;
        advanceToNextOpenTrainingDay(true);
      } else {
        currentWeek = 1;
        currentDay = 0;
        advanceToNextOpenTrainingDay(false);
      }
    } else if (lastOpen) {
      currentWeek = Number(lastOpen.week) || 1;
      currentDay = Number(lastOpen.day) || 0;
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
      if (window.__cpCoachViewBackup && window.__cpCoachViewBackup.profile) {
        store.profile = JSON.parse(JSON.stringify(window.__cpCoachViewBackup.profile));
      }
    }, 'Carico dati cliente…', { immediate: true });
  } else {
    if (!window.__cpCoachViewBackup) window.__cpCoachViewBackup = snapshotCoachMaster();
    try {
      const snap = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/snapshot', { method: 'GET', headers: practiceHeaders(false) }, 25000);
      store.coachWorkspace.data = snap.data || {};
      store.coachWorkspace.client = snap.client || store.coachWorkspace.client;
      applyClientPayloadToLocal(snap.data || {});
    } catch (_) { applyClientPayloadToLocal(store.coachWorkspace.data || {}); }
    if (window.__cpCoachViewBackup && window.__cpCoachViewBackup.profile) {
      store.profile = JSON.parse(JSON.stringify(window.__cpCoachViewBackup.profile));
    }
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
  stopClientLivePoll({ keepFollow: true });
  window.__cpClientLiveFp = '';
  const tickMs = function () {
    const live = !!(store && store.coachWorkspace && store.coachWorkspace.client && store.coachWorkspace.client.workoutLive);
    return live || window.__cpFollowLive ? 2500 : 4000;
  };
  const run = async function () {
    if (!(store && store.coachViewingClient && store.coachWorkspace && store.coachWorkspace.clientId)) return;
    try {
      const id = store.coachWorkspace.clientId;
      const snap = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/snapshot', { method: 'GET', headers: practiceHeaders(false) }, 12000);
      const data = snap.data || {};
      store.coachWorkspace.data = data;
      store.coachWorkspace.client = snap.client || store.coachWorkspace.client;
      if (data.data) store.data = JSON.parse(JSON.stringify(data.data));
      if (Array.isArray(data.logs)) store.logs = JSON.parse(JSON.stringify(data.logs));
      if (Array.isArray(data.bodyChecks)) store.bodyChecks = JSON.parse(JSON.stringify(data.bodyChecks));
      if (data.nutritionDaily) store.nutritionDaily = JSON.parse(JSON.stringify(data.nutritionDaily));
      if (data.subs) store.subs = JSON.parse(JSON.stringify(data.subs));
      // Never wipe domain edits with a stale activeProgram shell from live poll
      const keepLocalNutr = !!(store.__cpNutritionDirty || store.__cpKeepLocalNutrition);
      const keepLocalSupp = !!(store.__cpSupplementsDirty || store.__cpKeepLocalSupplements);
      const keepLocalTher = !!store.__cpTherapyCleared;
      const keepLocalExams = !!store.__cpExamsCleared;
      const keepLocalTraining = !!store.__cpTrainingCleared;
      const localNutr = (DATA && DATA.nutrition) || store.nutrition;
      const localSupp = (DATA && DATA.supplementation) || store.supplementation;
      const localTher = (DATA && DATA.therapy) || store.therapy;
      const localExams = (DATA && DATA.exams) || store.exams;
      if (data.activeProgram && typeof data.activeProgram === 'object') {
        try {
          const next = JSON.parse(JSON.stringify(data.activeProgram));
          if (keepLocalTraining && DATA && Array.isArray(DATA.weeks) && !DATA.weeks.length && DATA.clearedTraining) {
            next.weeks = [];
            next.title = DATA.title || '';
            next.clearedTraining = true;
          }
          const remoteNutr = preferFilledNutrition(data.nutrition, next.nutrition);
          const remoteSupp = preferFilledSupplementation(data.supplementation, next.supplementation);
          const remoteTher = preferFilledTherapy(data.therapy, next.therapy);
          const remoteExams = preferFilledExams(data.exams, next.exams);
          next.nutrition = keepLocalNutr ? preferFilledNutrition(localNutr, remoteNutr) : preferFilledNutrition(remoteNutr, localNutr);
          next.supplementation = keepLocalSupp ? preferFilledSupplementation(localSupp, remoteSupp) : preferFilledSupplementation(remoteSupp, localSupp);
          next.therapy = keepLocalTher ? preferFilledTherapy(localTher, remoteTher) : preferFilledTherapy(remoteTher, localTher);
          next.exams = keepLocalExams ? preferFilledExams(localExams, remoteExams) : preferFilledExams(remoteExams, localExams);
          if (typeof normalizeNutritionMeals === 'function' && next.nutrition && !isClearedDomainPayload(next.nutrition, 'nutrition')) {
            next.nutrition = normalizeNutritionMeals(next.nutrition);
          }
          DATA = next;
          store.activeProgram = next;
          store.nutrition = next.nutrition;
          store.supplementation = next.supplementation;
          store.therapy = next.therapy;
          store.exams = next.exams;
        } catch (_) {}
      } else {
        if (!keepLocalNutr && data.nutrition) {
          store.nutrition = preferFilledNutrition(data.nutrition, localNutr);
          if (DATA) DATA.nutrition = store.nutrition;
        }
        if (!keepLocalSupp && data.supplementation) {
          store.supplementation = preferFilledSupplementation(data.supplementation, localSupp);
          if (DATA) DATA.supplementation = store.supplementation;
        }
        if (!keepLocalTher && data.therapy) {
          store.therapy = preferFilledTherapy(data.therapy, localTher);
          if (DATA) DATA.therapy = store.therapy;
        }
        if (!keepLocalExams && data.exams) {
          store.exams = preferFilledExams(data.exams, localExams);
          if (DATA) DATA.exams = store.exams;
        }
      }
      let dataFp = '';
      try {
        const raw = JSON.stringify(data.data || {});
        dataFp = String(raw.length) + ':' + raw.slice(0, 120) + ':' + raw.slice(-80);
      } catch (_) { dataFp = String(Object.keys(data.data || {}).length); }
      const fp = String((data.logs && data.logs.length) || 0) + ':' +
        String((data.logs && data.logs.length && data.logs[data.logs.length - 1] && data.logs[data.logs.length - 1].at) || '') + ':' +
        String(!!(snap.client && snap.client.workoutLive)) + ':' +
        String(typeof currentWeek !== 'undefined' ? currentWeek : '') + ':' +
        String(typeof currentDay !== 'undefined' ? currentDay : '') + ':' + dataFp;
      const domainViews = { training: 1, stats: 1, nutrition: 1, supplements: 1, therapy: 1, exams: 1, calendar: 1 };
      if (typeof render === 'function' && domainViews[currentView] && fp !== window.__cpClientLiveFp) {
        window.__cpClientLiveFp = fp;
        render();
      }
      ensureLiveFollowBanner();
    } catch (_) {}
  };
  run();
  window.__cpClientLiveTimer = setInterval(run, tickMs());
}

function followClientLiveWorkout(clientId) {
  const id = clientId || (store.coachWorkspace && store.coachWorkspace.clientId);
  if (!id) {
    practiceToast('Apri un cliente in allenamento', 'warning');
    return;
  }
  window.__cpFollowLive = true;
  Promise.resolve(enterCoachClientView('training')).then(function () {
    ensureLiveFollowBanner();
    practiceToast('Segui live: aggiornamento in tempo reale', 'success');
  }).catch(function () {
    ensureLiveFollowBanner();
  });
}

function ensureLiveFollowBanner() {
  let el = document.getElementById('cp-live-follow-banner');
  const live = !!(store && store.coachWorkspace && store.coachWorkspace.client && store.coachWorkspace.client.workoutLive);
  const show = !!(window.__cpFollowLive && store && store.coachViewingClient && live);
  if (!show) {
    if (el) el.style.display = 'none';
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id = 'cp-live-follow-banner';
    el.style.cssText = 'position:fixed;top:calc(8px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:10050;background:#0a2a0a;border:1px solid #6c6;color:#9f9;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.5px;display:flex;align-items:center;gap:10px;';
    document.body.appendChild(el);
  }
  el.style.display = 'flex';
  el.innerHTML = '<span>● LIVE · stai seguendo l’allenamento</span>' +
    '<button type="button" class="btn btn-outline" style="font-size:10px;padding:4px 10px;border-color:#6c6;color:#9f9 !important;-webkit-text-fill-color:#9f9 !important;" onclick="stopLiveFollowWorkout()">STOP</button>';
}

function stopLiveFollowWorkout() {
  window.__cpFollowLive = false;
  stopClientLivePoll();
  ensureLiveFollowBanner();
  practiceToast('Follow live interrotto', 'info');
}

function stopClientLivePoll(opts) {
  opts = opts || {};
  if (window.__cpClientLiveTimer) {
    clearInterval(window.__cpClientLiveTimer);
    window.__cpClientLiveTimer = null;
  }
  if (!opts.keepFollow) {
    window.__cpFollowLive = false;
    const el = document.getElementById('cp-live-follow-banner');
    if (el) el.style.display = 'none';
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
  const n = Math.max(0, Number(store.__cpNotifyCount || 0));
  return '<div class="card" style="margin-top:12px;"><div class="card-header"><h2>Menu</h2></div>' +
    '<div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:10px;">' +
    '<button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;position:relative;" onclick="openNotificationsCenter()"><span style="font-size:18px;">🔔</span><span style="font-size:11px;font-weight:800;">Notifiche</span>' +
    (n > 0 ? '<span class="cp-notify-count" style="position:absolute;top:6px;right:8px;">' + (n > 99 ? '99+' : n) + '</span>' : '') + '</button>' +
    '<button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate(\'clientChat\')"><span style="font-size:18px;">💬</span><span style="font-size:11px;font-weight:800;">Chat coach</span></button>' +
    '<button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate(\'nutrition\')"><span style="font-size:18px;">🥗</span><span style="font-size:11px;font-weight:800;">Alimentazione</span></button>' +
    '<button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate(\'supplements\')"><span style="font-size:18px;">💊</span><span style="font-size:11px;font-weight:800;">Integrazione</span></button>' +
    '<button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate(\'therapy\')"><span style="font-size:18px;">🩺</span><span style="font-size:11px;font-weight:800;">Terapia</span></button>' +
    '<button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate(\'exams\')"><span style="font-size:18px;">🧪</span><span style="font-size:11px;font-weight:800;">Esami</span></button>' +
    '<button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="startDomainImport(\'nutrition\')"><span style="font-size:18px;">📥</span><span style="font-size:11px;font-weight:800;">Importa file</span></button>' +
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
    '<label class="cp-toggle-row" style="display:flex;gap:10px;align-items:flex-start;font-size:12px;color:#eee !important;-webkit-text-fill-color:#eee !important;margin-bottom:10px;padding:10px;background:#141414;border-radius:8px;border:1px solid #2a2a2a;width:100%;box-sizing:border-box;">' +
    '<input type="checkbox" ' + (hide ? 'checked' : '') + ' onchange="toggleCoachHidePresence(this.checked)" style="margin-top:2px;flex-shrink:0;width:18px;height:18px;">' +
    '<span style="flex:1;min-width:0;color:#eee !important;-webkit-text-fill-color:#eee !important;line-height:1.35;">Nascondi che sei online agli atleti</span></label>' +
    '<label class="cp-toggle-row" style="display:flex;gap:10px;align-items:flex-start;font-size:12px;color:#eee !important;-webkit-text-fill-color:#eee !important;margin-bottom:10px;padding:10px;background:#141414;border-radius:8px;border:1px solid #2a2a2a;width:100%;box-sizing:border-box;">' +
    '<input type="checkbox" ' + ((store.coachAllowVideocall !== false) ? 'checked' : '') + ' onchange="toggleCoachVideocall(this.checked)" style="margin-top:2px;flex-shrink:0;width:18px;height:18px;">' +
    '<span style="flex:1;min-width:0;color:#eee !important;-webkit-text-fill-color:#eee !important;line-height:1.35;">Consenti videocall interne con i clienti</span></label>' +
    '<input id="cp-client-q" type="search" placeholder="Cerca nome…" value="' + q + '" oninput="window.__cpClientQ=this.value;debounceCoachClientList()" style="width:100%;padding:10px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;">' +
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

function friendlyApiError(err) {
  const raw = String((err && err.message) || err || '').trim();
  if (!raw) return 'Server non disponibile. Riprova tra poco.';
  if (/<!DOCTYPE|<html[\s>]|^\s*</i.test(raw) || /HTTP\s*5\d\d/i.test(raw) && /</.test(raw)) {
    const code = (raw.match(/HTTP\s*(\d{3})/i) || [])[1] || '500';
    return 'Server non disponibile (' + code + '). Riprova tra poco.';
  }
  if (raw.length > 160) return raw.slice(0, 140).replace(/\s+\S*$/, '') + '…';
  return raw;
}

async function loadCoachClientList() {
  const box = document.getElementById('cp-client-list');
  if (!box) return;
  try {
    const q = window.__cpClientQ || '';
    const payload = await practiceFetch('/api/coach/clients?limit=30&offset=0&q=' + encodeURIComponent(q), { method: 'GET', headers: practiceHeaders(false) }, 20000);
    store.__cpOrigin = payload.origin || '';
    const rows = payload.clients || [];
    store.__cpClientList = rows;
    ensureCoachHeaderControls(!!(store && store.coachSessionActive));
    if (!rows.length) {
      box.innerHTML = '<div class="cp-help">Nessun cliente. Aggiungine uno: nuovo (compilerà il questionario) o transizione (compili tu le info).</div>';
      return;
    }
    box.innerHTML = rows.map(function (cl) {
      const badge = cl.intakeMode === 'transition' ? 'Transizione' : (cl.intakeDone ? 'Questionario ok' : 'Nuovo · questionario');
      const paid = cl.paid ? 'Pagato' : 'Non pagato';
      const presence = presenceLabel(cl.online, cl.lastSeenAt, cl.workoutLive);
      const presenceColor = cl.workoutLive ? '#6c6' : (cl.online ? '#6c6' : '#888');
      const code = inviteShortCode(cl.inviteToken);
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
        ' · Prossimo check: ' + esc(fmtDay(cl.nextCheckAt)) +
        (code ? (' · Codice link: <b style="color:var(--gold);">' + esc(code) + '</b>') : '') + '</div></div></div>' +
        '<div class="cp-client-actions" style="margin-top:10px;">' +
        '<button class="btn btn-primary" onclick="openCoachClient(\'' + esc(cl.id) + '\')">APRI</button>' +
        '<button class="btn btn-outline" onclick="openCoachClientChat(\'' + esc(cl.id) + '\')">CHAT</button>' +
        (cl.workoutLive ? ('<button class="btn btn-outline" style="border-color:#6c6;color:#6c6;" onclick="followClientLiveWorkout(\'' + esc(cl.id) + '\')">SEGUI LIVE</button>') : '') +
        '<button class="btn btn-outline" onclick="copyClientInvite(\'' + esc(cl.id) + '\',\'' + esc(cl.inviteToken || '') + '\')">LINK</button>' +
        '<button class="btn btn-outline" onclick="toggleClientPaid(\'' + esc(cl.id) + '\',' + (cl.paid ? 'false' : 'true') + ')">' + (cl.paid ? 'SEGNA NON PAGATO' : 'SEGNA PAGATO') + '</button>' +
        '<button class="btn btn-outline" onclick="revokeCoachClient(\'' + esc(cl.id) + '\')">REVOCA</button>' +
        '<button class="btn btn-outline" style="color:#c66;border-color:#c66;" onclick="removeCoachClient(\'' + esc(cl.id) + '\')">RIMUOVI</button>' +
        '</div></div>';
    }).join('');
  } catch (err) {
    box.innerHTML = '<div class="cp-help" style="margin-bottom:10px;">' + esc(friendlyApiError(err)) + '</div>' +
      '<button type="button" class="btn btn-outline" style="width:100%;" onclick="loadCoachClientList()">RIPROVA</button>';
  }
}

function ensureCoachDomainToolbar(domain) {
  const c = document.getElementById('view-container');
  let bar = document.getElementById('cp-domain-toolbar');
  const domains = { training: 1, nutrition: 1, supplements: 1, therapy: 1, exams: 1 };
  const d = domain || currentView;
  if (!c || !(store && store.coachViewingClient) || !domains[d]) {
    if (bar) bar.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'cp-domain-toolbar';
    bar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px;';
  }
  bar.setAttribute('data-domain', d);
  bar.innerHTML =
    '<button type="button" class="btn btn-outline" style="flex:1;min-width:100px;font-size:11px;" onclick="openNotificationsCenter(\'' + esc(String(store.coachWorkspace.clientId)) + '\')">NOTIFICHE</button>' +
    '<button type="button" class="btn btn-outline" style="flex:1;min-width:100px;font-size:11px;color:#c66 !important;-webkit-text-fill-color:#c66 !important;border-color:#c66;" onclick="clearCoachClientDomain(\'' + esc(d) + '\')">CANCELLA</button>' +
    '<button type="button" class="btn btn-primary" style="flex:1;min-width:100px;font-size:11px;" onclick="startDomainImport(\'' + esc(d) + '\')">IMPORTA NUOVO</button>';
  if (bar.parentElement !== c || c.firstChild !== bar) {
    c.insertBefore(bar, c.firstChild);
  }
}

async function clearCoachClientDomain(domain) {
  if (!(store && store.coachViewingClient)) return;
  const labels = {
    training: 'allenamento',
    nutrition: 'alimentazione',
    supplements: 'integrazione',
    therapy: 'terapia',
    exams: 'esami'
  };
  const label = labels[domain] || domain;
  if (!window.confirm('Cancellare ' + label + ' del cliente? Le modifiche verranno inviate al cliente.')) return;
  try {
    const pushDomain = domain === 'supplements' ? 'supplements' : domain;
    if (domain === 'training') {
      if (typeof DATA !== 'undefined' && DATA) {
        DATA.weeks = [];
        DATA.title = '';
        DATA.clearedTraining = true;
        DATA.clearedAt = new Date().toISOString();
      }
      store.customSets = {};
      store.subs = {};
      store.__cpTrainingCleared = true;
    } else if (domain === 'nutrition') {
      const empty = emptyDomainShell('nutrition');
      store.nutrition = empty;
      if (typeof DATA !== 'undefined' && DATA) DATA.nutrition = empty;
      store.__cpNutritionDirty = true;
      store.__cpKeepLocalNutrition = true;
    } else if (domain === 'supplements') {
      const empty = emptyDomainShell('supplements');
      store.supplementation = empty;
      if (typeof DATA !== 'undefined' && DATA) DATA.supplementation = empty;
      store.__cpSupplementsDirty = true;
      store.__cpKeepLocalSupplements = true;
    } else if (domain === 'therapy') {
      const empty = emptyDomainShell('therapy');
      store.therapy = empty;
      if (typeof DATA !== 'undefined' && DATA) DATA.therapy = empty;
      store.__cpTherapyCleared = true;
    } else if (domain === 'exams') {
      const empty = emptyDomainShell('exams');
      store.exams = empty;
      if (typeof DATA !== 'undefined' && DATA) DATA.exams = empty;
      store.__cpExamsCleared = true;
    } else {
      return;
    }
    if (typeof persist === 'function') persist();
    await pushCoachClientEdits({ domains: [pushDomain], cleared: true });
    practiceToast(label.charAt(0).toUpperCase() + label.slice(1) + ' cancellata', 'success');
    if (typeof render === 'function') render();
  } catch (err) {
    practiceToast((err && err.message) || 'Cancellazione fallita', 'danger');
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
    const display = (payload.credentials && payload.credentials.displayName) ||
      ((firstName + ' ' + lastName).trim()) || 'atleta';
    const msg = payload.inviteText || formatInviteShareText({
      name: display,
      inviteUrl: url,
      inviteCode: payload.inviteCode || inviteShortCode(url),
      username: user,
      password: pass
    });
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
    text = snap.inviteText || formatInviteShareText({
      name: snap.client && snap.client.displayName,
      inviteUrl: snap.inviteUrl || ((store.__cpOrigin && token) ? store.__cpOrigin + '/c/' + token : ''),
      inviteCode: snap.inviteCode || inviteShortCode(token || (snap.inviteUrl || '').split('/').pop()),
      username: snap.credentials && snap.credentials.username,
      password: snap.credentials && snap.credentials.password
    });
  } catch (_) {
    if (store.__cpOrigin && token) {
      text = formatInviteShareText({
        inviteUrl: store.__cpOrigin + '/c/' + token,
        inviteCode: inviteShortCode(token),
        token: token
      });
    }
  }
  if (!text) { practiceToast('Link non disponibile', 'warning'); return; }
  copyOrShare(text, 'Invito Nurvan');
  try { alert('Invito univoco pronto.\n\n' + text); } catch (_) {}
}

async function rotateClientInvite(id) {
  if (!confirm('Rigenerare il link? Il vecchio smette di funzionare.')) return;
  try {
    const res = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/rotate-invite', {
      method: 'POST', headers: practiceHeaders(true), body: '{}'
    }, 20000);
    const text = res.inviteText || formatInviteShareText({
      inviteUrl: res.inviteUrl,
      inviteCode: res.inviteCode,
      username: res.credentials && res.credentials.username,
      password: res.credentials && res.credentials.password
    });
    await copyOrShare(text, 'Nuovo invito Nurvan');
    practiceToast('Nuovo link univoco creato', 'success');
    try { alert('Nuovo link univoco.\n\n' + text); } catch (_) {}
    if (currentView === 'coachClient') renderPracticeView();
    else loadCoachClientList();
  } catch (err) {
    practiceToast((err && err.message) || 'Rigenerazione fallita', 'danger');
  }
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
  try { clearNurvanAppBadge(); } catch (_) {}
  navigate('coachChat');
}

function cpSvg(name) {
  if (name === 'attach') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 6.5l-7.8 7.8a2.5 2.5 0 103.5 3.5l8.1-8.1a4 4 0 10-5.7-5.7l-8.5 8.5a5.5 5.5 0 107.8 7.8l7.1-7.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (name === 'mic') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z" fill="currentColor"/><path d="M5 11a7 7 0 0014 0M12 18v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  if (name === 'video') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 10l6-3v10l-6-3z" fill="currentColor"/></svg>';
  if (name === 'send') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2-6-8-2z" fill="currentColor"/></svg>';
  if (name === 'pdf') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 2v6h6" fill="none" stroke="currentColor" stroke-width="1.8"/><text x="7" y="17" font-size="6" font-weight="800" fill="currentColor">PDF</text></svg>';
  if (name === 'doc') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 2v6h6M8 13h8M8 17h6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  if (name === 'xls') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 2v6h6M8 14l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  if (name === 'file') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 2v6h6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  return '';
}

function chatFileIconKind(att) {
  const name = String((att && att.name) || '').toLowerCase();
  const mime = String((att && att.mime) || '').toLowerCase();
  if (mime.indexOf('pdf') >= 0 || /\.pdf$/.test(name)) return 'pdf';
  if (mime.indexOf('sheet') >= 0 || mime.indexOf('excel') >= 0 || /\.(xlsx?|csv)$/.test(name)) return 'xls';
  if (mime.indexOf('word') >= 0 || mime.indexOf('msword') >= 0 || /\.(docx?|rtf|txt)$/.test(name)) return 'doc';
  if (mime.indexOf('image') >= 0 || /\.(png|jpe?g|webp|gif)$/.test(name)) return 'img';
  return 'file';
}

function clearChatAttachPreview() {
  window.__cpPendingAttach = null;
  ['cp-attach-preview', 'cp-chat-attach-preview'].forEach(function (id) {
    const prev = document.getElementById(id);
    if (prev) prev.innerHTML = '';
  });
}

function chatToolsHtml(inputId, sendCall, clearCall, newCall, opts) {
  opts = opts || {};
  const videoBtn = opts.videoCall
    ? '<button type="button" class="btn btn-outline cp-icon-btn" title="Videocall" onclick="' + opts.videoCall + '">' + cpSvg('video') + '</button>'
    : '';
  return '<div id="cp-chat-attach-preview" class="cp-help" style="margin:0;"></div>' +
    '<div id="cp-chat-send-progress" class="cp-chat-send-progress" aria-hidden="true"><i></i></div>' +
    '<div class="cp-chat-composer">' +
    '<button type="button" class="btn btn-outline cp-icon-btn" title="Allega" onclick="openChatAttachSheet()">' + cpSvg('attach') + '</button>' +
    '<button type="button" id="cp-dictate-btn" class="btn btn-outline cp-icon-btn cp-dictate-off" title="Dettatura" onclick="toggleChatDictation(\'' + inputId + '\')">' + cpSvg('mic') + '</button>' +
    videoBtn +
    '<input id="' + inputId + '" class="cp-chat-input" type="text" placeholder="Messaggio cifrato…">' +
    '<button type="button" id="cp-chat-send-btn" class="btn btn-primary cp-icon-btn" title="Invia" onclick="pulseChatSendBtn();' + sendCall + '">' + cpSvg('send') + '</button>' +
    '</div>' +
    '<div class="cp-chat-tools">' +
    '<button type="button" class="btn btn-outline" style="font-size:10px;padding:8px 10px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="' + clearCall + '">AZZERA (PER ME)</button>' +
    '<button type="button" class="btn btn-outline" style="font-size:10px;padding:8px 10px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="' + newCall + '">NUOVA CHAT</button>' +
    '</div>';
}

function pulseChatSendBtn() {
  const btn = document.getElementById('cp-chat-send-btn');
  if (!btn) return;
  btn.classList.add('cp-send-pressed');
  setTimeout(function () { btn.classList.remove('cp-send-pressed'); }, 160);
}

function setChatSending(on) {
  window.__cpSending = !!on;
  const prog = document.getElementById('cp-chat-send-progress');
  const btn = document.getElementById('cp-chat-send-btn');
  if (prog) prog.classList.toggle('active', !!on);
  if (btn) btn.classList.toggle('cp-sending', !!on);
}

function renderMessageHtml(m, mine) {
  const att = m.attachment || {};
  let extra = '';
  if (att.kind === 'image' && att.data) {
    const src = att.data.replace(/"/g, '');
    extra = '<img class="cp-msg-img" src="' + src + '" alt="' + esc(att.name || 'foto') + '" onclick="openChatLightbox(this.src)">' +
      '<div style="font-size:10px;color:#888;margin-top:4px;">Tocca per ingrandire</div>';
  } else if (att.kind === 'file' && att.data) {
    const ik = chatFileIconKind(att);
    const icon = ik === 'img' ? cpSvg('file') : cpSvg(ik);
    extra = '<a class="cp-file-chip" href="' + att.data + '" download="' + esc(att.name || 'documento') + '">' +
      '<span class="cp-file-ico">' + icon + '</span><span>' + esc(att.name || 'documento') + '</span></a>';
  } else if (att.kind) {
    const ik = chatFileIconKind(att);
    extra = '<div class="cp-file-chip" style="margin-top:4px;"><span class="cp-file-ico">' + cpSvg(ik === 'img' ? 'file' : ik) + '</span><span>' + esc(att.name || 'allegato') + '</span></div>';
  }
  const ticks = mine
    ? (m.read_at ? ' <span style="color:#4fc3f7;">✓✓</span>' : ' <span style="color:#888;">✓</span>')
    : '';
  const lock = (m.e2e || (typeof m.body === 'string' && m.body.indexOf('E2E1:') === 0)) ? ' · e2e' : '';
  const text = m._plain != null ? m._plain : (m.body || '');
  const showText = text && text !== '[allegato]';
  return '<div class="cp-msg ' + (mine ? 'me' : 'them') + '">' + (showText ? esc(text) + lock : '') + extra +
    '<div style="font-size:9px;color:#888;margin-top:4px;">' + esc(String(m.created_at || '').replace('T', ' ').slice(0, 16)) + ticks + '</div></div>';
}

function openChatLightbox(src) {
  ensurePracticeStyle();
  let box = document.getElementById('cp-lightbox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'cp-lightbox';
    box.className = 'cp-lightbox';
    box.onclick = function (ev) { if (ev.target === box) closeChatLightbox(); };
    document.body.appendChild(box);
  }
  box.innerHTML = '<img src="' + String(src || '').replace(/"/g, '') + '" alt="foto">' +
    '<div style="display:flex;gap:8px;width:100%;max-width:360px;">' +
    '<a class="btn btn-primary" style="flex:1;text-align:center;text-decoration:none;" href="' + String(src || '').replace(/"/g, '') + '" download="nurvan-chat.jpg">SALVA</a>' +
    '<button class="btn btn-outline" style="flex:1;" onclick="closeChatLightbox()">CHIUDI</button></div>';
  box.classList.add('active');
}
function closeChatLightbox() {
  const box = document.getElementById('cp-lightbox');
  if (box) box.classList.remove('active');
}
window.openChatLightbox = openChatLightbox;
window.closeChatLightbox = closeChatLightbox;

async function pushCoachClientEdits(opts) {
  opts = opts || {};
  const id = store.coachWorkspace && store.coachWorkspace.clientId;
  if (!id || !store.coachViewingClient) return;
  const domains = Array.isArray(opts.domains) ? opts.domains : null;
  const silentToast = !!opts.cleared;
  if (typeof DATA !== 'undefined' && DATA) {
    if (store.nutrition != null) DATA.nutrition = store.nutrition;
    if (store.supplementation != null) DATA.supplementation = store.supplementation;
    if (store.therapy != null) DATA.therapy = store.therapy;
    if (store.exams != null) DATA.exams = store.exams;
  }
  const nutr = (store.nutrition != null) ? store.nutrition : ((DATA && DATA.nutrition) || null);
  const supp = (store.supplementation != null) ? store.supplementation : ((DATA && DATA.supplementation) || null);
  const ther = (store.therapy != null) ? store.therapy : ((DATA && DATA.therapy) || null);
  const exams = (store.exams != null) ? store.exams : ((DATA && DATA.exams) || null);
  let payload;
  if (domains && domains.length) {
    payload = {};
    if (domains.indexOf('nutrition') >= 0) {
      payload.nutrition = nutr;
      payload.activeProgram = Object.assign({}, (DATA && typeof DATA === 'object') ? DATA : { title: 'Piano cliente', weeks: [] }, { nutrition: nutr });
    }
    if (domains.indexOf('supplements') >= 0) {
      payload.supplementation = supp;
      payload.activeProgram = Object.assign({}, payload.activeProgram || (DATA && typeof DATA === 'object' ? DATA : { title: 'Piano cliente', weeks: [] }), { supplementation: supp });
    }
    if (domains.indexOf('therapy') >= 0) {
      payload.therapy = ther;
      payload.activeProgram = Object.assign({}, payload.activeProgram || (DATA && typeof DATA === 'object' ? DATA : { title: 'Piano cliente', weeks: [] }), { therapy: ther });
    }
    if (domains.indexOf('exams') >= 0) {
      payload.exams = exams;
      payload.activeProgram = Object.assign({}, payload.activeProgram || (DATA && typeof DATA === 'object' ? DATA : { title: 'Piano cliente', weeks: [] }), { exams: exams });
    }
    if (domains.indexOf('training') >= 0) {
      payload.activeProgram = typeof DATA !== 'undefined' ? DATA : null;
      payload.data = store.data || {};
      payload.subs = store.subs || {};
      payload.customSets = store.customSets || {};
    }
  } else {
    payload = {
      activeProgram: typeof DATA !== 'undefined' ? DATA : null,
      nutrition: nutr,
      supplementation: supp,
      therapy: ther,
      exams: exams,
      data: store.data || {},
      subs: store.subs || {},
      customSets: store.customSets || {},
      bodyChecks: Array.isArray(store.bodyChecks) ? store.bodyChecks : [],
      logs: (Array.isArray(store.logs) && store.logs.length) ? store.logs : undefined
    };
  }
  try {
    await withBusy(async function () {
      await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/patch-data', {
        method: 'POST', headers: practiceHeaders(true),
        body: JSON.stringify({ data: payload, notify: true, summary: silentToast ? 'Il coach ha cancellato una sezione del piano' : undefined })
      }, 25000);
    }, silentToast ? 'Cancello…' : 'Salvo…', { immediate: true, maxMs: 30000 });
    if (store.coachWorkspace) {
      store.coachWorkspace.data = Object.assign({}, store.coachWorkspace.data || {}, payload);
      if (Object.prototype.hasOwnProperty.call(payload, 'nutrition')) {
        store.coachWorkspace.data.nutrition = payload.nutrition;
        if (store.coachWorkspace.data.activeProgram && typeof store.coachWorkspace.data.activeProgram === 'object') {
          store.coachWorkspace.data.activeProgram.nutrition = payload.nutrition;
        }
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'supplementation')) {
        store.coachWorkspace.data.supplementation = payload.supplementation;
        if (store.coachWorkspace.data.activeProgram && typeof store.coachWorkspace.data.activeProgram === 'object') {
          store.coachWorkspace.data.activeProgram.supplementation = payload.supplementation;
        }
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'therapy')) {
        store.coachWorkspace.data.therapy = payload.therapy;
        if (store.coachWorkspace.data.activeProgram && typeof store.coachWorkspace.data.activeProgram === 'object') {
          store.coachWorkspace.data.activeProgram.therapy = payload.therapy;
        }
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'exams')) {
        store.coachWorkspace.data.exams = payload.exams;
        if (store.coachWorkspace.data.activeProgram && typeof store.coachWorkspace.data.activeProgram === 'object') {
          store.coachWorkspace.data.activeProgram.exams = payload.exams;
        }
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'activeProgram') && payload.activeProgram) {
        store.coachWorkspace.data.activeProgram = payload.activeProgram;
      }
    }
    if (!silentToast) practiceToast('Modifiche inviate al cliente', 'success');
  } catch (err) {
    practiceToast((err && err.message) || 'Salvataggio fallito', 'danger');
    throw err;
  }
}

function resolveExerciseNameForAsk(idx, exerciseName) {
  const fromArg = String(exerciseName || '').trim();
  if (fromArg) return fromArg;
  try {
    const week = (typeof currentWeek !== 'undefined' ? currentWeek : 1);
    const day = (typeof currentDay !== 'undefined' ? currentDay : 0);
    const sub = store && store.subs && store.subs['w' + week + '_d' + day + '_e' + idx];
    if (sub) return String(sub);
    const w = (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.weeks))
      ? DATA.weeks.find(function (x) { return (x.weekNumber || x.week) === week; })
      : null;
    const days = w && (w.days || w.sessions || w.workouts);
    const d = days && days[day];
    const list = d && (d.exercises || d.exerciseList || d.items) || [];
    const row = list[idx];
    if (row) return String(row.name || row.exercise || '').trim() || 'esercizio';
  } catch (_) {}
  return 'esercizio';
}

function buildExerciseInfoPrefill(idx, exerciseName) {
  const name = resolveExerciseNameForAsk(idx, exerciseName);
  const week = (typeof currentWeek !== 'undefined' ? currentWeek : 1);
  const day = (typeof currentDay !== 'undefined' ? currentDay : 0) + 1;
  // Contesto chiaro per il coach; cursore dopo " — " per la domanda del cliente
  return name + ' giorno ' + day + ' settimana ' + week + ' — ';
}

function applyChatPrefill(text, tries) {
  const body = String(text || '');
  if (!body) return;
  window.__cpChatPrefill = body;
  const attempt = function (left) {
    const input = document.getElementById('cp-client-msg') || document.getElementById('cp-ath-msg');
    if (input) {
      input.value = body;
      try {
        input.focus();
        const len = input.value.length;
        if (typeof input.setSelectionRange === 'function') input.setSelectionRange(len, len);
      } catch (_) {}
      window.__cpChatPrefill = null;
      return;
    }
    if (left > 0) setTimeout(function () { attempt(left - 1); }, 120);
  };
  attempt(typeof tries === 'number' ? tries : 12);
}

async function askExerciseInfoToCoach(idx, exerciseName) {
  const prefill = buildExerciseInfoPrefill(idx, exerciseName);
  const athleteOk = (typeof isAthleteRole === 'function' && isAthleteRole())
    || !!(store && store.clientShell && store.accountToken);
  if (!athleteOk) {
    practiceToast(prefill.trim(), 'info');
    return;
  }
  if (!store || !store.accountToken) {
    practiceToast('Accedi con il link del coach per scrivere in chat.', 'warning');
    try {
      const t = store && (store.inviteToken || (typeof detectInviteToken === 'function' && detectInviteToken()));
      if (t && typeof showClientInvite === 'function') showClientInvite(t);
    } catch (_) {}
    return;
  }
  window.__cpChatPrefill = prefill;
  store.__cpExerciseAsk = {
    idx: idx,
    name: resolveExerciseNameForAsk(idx, exerciseName),
    week: (typeof currentWeek !== 'undefined' ? currentWeek : 1),
    day: (typeof currentDay !== 'undefined' ? currentDay : 0) + 1,
    at: Date.now()
  };
  // Non bloccare su online/confirm: apri chat subito con contesto già scritto
  try {
    practiceFetch('/api/client/me', { method: 'GET', headers: practiceHeaders(false) }, 8000).then(function (me) {
      store.coachOnline = !!(me && me.coachOnline);
    }).catch(function () {});
  } catch (_) {}
  if (typeof currentView !== 'undefined' && currentView === 'clientChat') {
    applyChatPrefill(prefill);
    practiceToast('Contesto esercizio in chat: aggiungi la domanda e invia', 'success');
    return;
  }
  navigate('clientChat');
  applyChatPrefill(prefill);
  practiceToast('Scrivi la domanda (es. che carico consigli?) e invia', 'success');
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
    const logs = (snap.data && Array.isArray(snap.data.logs)) ? snap.data.logs : [];
    const lastLog = logs.length ? logs[logs.length - 1] : null;
    const lastWoLabel = lastLog
      ? ('Ultimo allenamento: W' + (lastLog.week || '?') + ' · seduta ' + ((Number(lastLog.day) || 0) + 1) +
        (lastLog.at ? (' · ' + String(lastLog.at).replace('T', ' ').slice(0, 16)) : '') +
        ' · ' + logs.length + ' sessioni sync')
      : (cl.lastWorkoutAt ? ('Ultimo ping workout: ' + String(cl.lastWorkoutAt).replace('T', ' ').slice(0, 16)) : 'Nessun allenamento finalizzato sync');
    const intake = store.coachWorkspace.intake || {};
    const intakeRows = CLIENT_INTAKE_FIELDS.filter(function (f) { return intake[f.key]; }).map(function (f) {
      return '<div class="cp-row"><span style="color:#888;font-size:11px;">' + esc(f.label) + '</span><span style="font-size:12px;color:#fff;">' + esc(intake[f.key]) + '</span></div>';
    }).join('');
    let eventsHtml = '';
    let clientNotifyItems = [];
    try {
      const ev = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/events', { method: 'GET', headers: practiceHeaders(false) }, 15000);
      clientNotifyItems = buildCoachClientNotifyItems(ev.events || [], id, cl.displayName || 'Cliente');
      eventsHtml = clientNotifyItems.slice(0, 10).map(function (it, idx) {
        return '<button type="button" class="cp-notify-item" style="margin-bottom:6px;' + (it.unread ? 'border-color:rgba(212,175,55,.55);' : '') + '" onclick="openClientSheetNotify(' + idx + ')">' +
          '<b>' + esc(it.title) + (it.unread ? ' · NUOVA' : '') + '</b>' +
          '<span>' + esc(it.body) + '</span>' +
          (it.when ? '<small>' + esc(it.when) + '</small>' : '') + '</button>';
      }).join('');
      window.__cpClientSheetNotifies = clientNotifyItems;
    } catch (_) {}
    if (!store.__cpWsCollapse || typeof store.__cpWsCollapse !== 'object') {
      store.__cpWsCollapse = { intake: true, events: false };
    }
    const collapsed = store.__cpWsCollapse;
    c.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'coachHub\')">← LISTA</button>' +
      '<button class="btn btn-primary" style="font-size:10px;" onclick="openCoachClientChat(\'' + esc(id) + '\')">CHAT</button>' +
      '<button class="btn btn-outline" style="font-size:10px;position:relative;" onclick="openNotificationsCenter(\'' + esc(id) + '\')">NOTIFICHE' +
      (clientNotifyItems.filter(function (x) { return x.unread; }).length ? (' <span class="cp-notify-count" style="position:static;display:inline-flex;margin-left:4px;">' + clientNotifyItems.filter(function (x) { return x.unread; }).length + '</span>') : '') +
      '</button></div>' +
      '<h1 style="color:#fff;font-size:22px;margin:0 0 4px;">' + esc(cl.displayName || 'Cliente') + '</h1>' +
      '<div style="font-size:11px;color:#888;margin-bottom:6px;">@' + esc(cl.username || '') + ' · ' +
      (cl.intakeMode === 'transition' ? 'Transizione' : 'Nuovo') + (cl.intakeDone ? ' · questionario ok' : ' · questionario in attesa') + '</div>' +
      '<div style="font-size:12px;margin-bottom:12px;color:' + (cl.workoutLive || cl.online ? '#6c6' : '#888') + ';">● ' +
      esc(presenceLabel(cl.online, cl.lastSeenAt, cl.workoutLive)) + '</div>' +
      (cl.workoutLive ? ('<button class="btn btn-primary" style="width:100%;margin-bottom:12px;border-color:#6c6;background:#143014;" onclick="followClientLiveWorkout(\'' + esc(id) + '\')">SEGUI ALLENAMENTO LIVE</button>') : '') +
      '<div class="card" style="padding:10px;margin-bottom:12px;border-color:rgba(212,175,55,.35);"><div style="font-size:11px;color:var(--gold);font-weight:800;">ALLENAMENTI CLIENTE</div>' +
      '<div style="font-size:12px;color:#ddd;margin-top:4px;">' + esc(lastWoLabel) + '</div>' +
      (logs.length ? ('<div style="margin-top:8px;">' + logs.slice().reverse().slice(0, 6).map(function (row, i) {
        const realIdx = logs.length - 1 - i;
        return '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #222;font-size:11px;">' +
          '<span style="color:#ccc;">W' + (row.week || '?') + ' · S' + ((row.day || 0) + 1) + ' · ' + esc(String(row.at || '').replace('T', ' ').slice(0, 16)) +
          '<br><span style="color:#888;">' + (row.sets || 0) + ' serie · ' + (row.tonnage || 0) + ' kg · ' + (row.kcal || 0) + ' kcal</span></span>' +
          '<button type="button" class="btn btn-outline" style="font-size:9px;padding:6px 8px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="openClientWorkoutReport(' + realIdx + ')">VEDI REPORT</button></div>';
      }).join('') + '</div>') : '') +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:10px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="enterCoachClientView(\'stats\')">APRI STATS / CRONOLOGIA</button></div>' +
      (cl.leaveRequested ? '<div class="card" style="padding:12px;margin-bottom:12px;border-color:#c66;"><div style="font-weight:900;color:#c66;">Richiesta fine collaborazione</div>' +
        '<button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="confirmLeaveClient(\'' + esc(id) + '\')">CONFERMA FINE COLLABORAZIONE</button></div>' : '') +
      ((snap.pendingChange || cl.hasPendingChange) ? '<div class="card" style="padding:12px;margin-bottom:12px;border-color:var(--gold);"><div style="font-weight:900;color:var(--gold);">Modifica richiesta dall’atleta</div>' +
        '<p class="cp-help">' + esc((snap.pendingChange && snap.pendingChange.summary) || 'Vuole cambiare il programma.') + '</p>' +
        '<button class="btn btn-primary" style="width:100%;margin-top:6px;" onclick="approveClientChange(\'' + esc(id) + '\')">APPROVA MODIFICA</button>' +
        '<button class="btn btn-outline" style="width:100%;margin-top:6px;" onclick="rejectClientChange(\'' + esc(id) + '\')">RIFIUTA</button></div>' : '') +
      '<div class="card" style="padding:12px;margin-bottom:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:6px;">Programma cliente</div>' +
      '<div style="font-size:12px;color:#ccc;">' + esc(prog.title || 'Nessuna scheda assegnata') + (weeks ? ' · ' + weeks + ' settimane' : '') + '</div>' +
      '<div style="font-size:11px;color:#aaa;margin-top:8px;">Scade: <b style="color:#fff;">' + esc(fmtDay(cl.programExpiresAt)) + '</b> · Prossimo check: <b style="color:#fff;">' + esc(fmtDay(cl.nextCheckAt)) + '</b></div>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="editClientSchedule(\'' + esc(id) + '\')">IMPOSTA SCADENZA / CHECK</button>' +
      '<div style="margin-top:10px;padding:10px;background:#141414;border:1px solid #333;border-radius:10px;">' +
      '<label style="display:flex;gap:10px;align-items:flex-start;margin:0;padding:0;background:transparent;border:0;font-size:12px;line-height:1.4;color:#eee !important;-webkit-text-fill-color:#eee !important;">' +
      '<input id="cp-max-freedom" type="checkbox"' + (cl.allowMaxFreedom ? ' checked' : '') + ' onchange="toggleMaxFreedom(\'' + esc(id) + '\', this.checked)" style="margin-top:3px;flex-shrink:0;width:18px;height:18px;">' +
      '<span style="display:block;color:#eee !important;-webkit-text-fill-color:#eee !important;"><b style="color:#fff !important;-webkit-text-fill-color:#fff !important;">Consenti massima libertà</b><br>' +
      '<span style="color:#bbb !important;-webkit-text-fill-color:#bbb !important;font-size:11px;">L\'atleta puo modificare da solo. Ti arriva comunque un avviso. Senza spunta, ogni modifica richiede la tua approvazione.</span></span></label>' +
      '<label style="display:flex;gap:10px;align-items:flex-start;margin:12px 0 0;padding:0;background:transparent;border:0;font-size:12px;line-height:1.4;color:#eee !important;-webkit-text-fill-color:#eee !important;">' +
      '<input id="cp-nurvan-ai" type="checkbox"' + (cl.allowNurvanAi ? ' checked' : '') + ' onchange="toggleNurvanAi(\'' + esc(id) + '\', this.checked)" style="margin-top:3px;flex-shrink:0;width:18px;height:18px;">' +
      '<span style="display:block;color:#eee !important;-webkit-text-fill-color:#eee !important;"><b style="color:#fff !important;-webkit-text-fill-color:#fff !important;">Consenti Nurvan AI</b><br>' +
      '<span style="color:#bbb !important;-webkit-text-fill-color:#bbb !important;font-size:11px;">Se attivo, il cliente vede Coach AI nell\'app. Di default e nascosta.</span></span></label></div>' +
      '<button class="btn btn-primary" style="width:100%;margin-top:10px;font-size:11px;" onclick="openAssignChooser(\'' + esc(id) + '\',\'' + esc(cl.displayName || '') + '\')">ASSEGNA SCHEDA</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="enterCoachClientView(\'training\')">VISUALIZZA ALLENAMENTO</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="requestCheckFromClient(\'' + esc(id) + '\')">RICHIEDI CHECK</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="requestExamsFromClient(\'' + esc(id) + '\')">RICHIEDI ESAMI</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="resetClientPassword(\'' + esc(id) + '\')">REIMPOSTA PASSWORD</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;" onclick="copyClientInvite(\'' + esc(id) + '\',\'' + esc(cl.inviteToken || '') + '\')">COPIA LINK + CREDENZIALI</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:11px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="rotateClientInvite(\'' + esc(id) + '\')">RIGENERA LINK UNIVOCO</button>' +
      (snap.inviteCode || cl.inviteToken ? ('<div class="cp-help" style="margin-top:6px;">Codice invito: <b style="color:var(--gold);">' + esc(snap.inviteCode || inviteShortCode(cl.inviteToken)) + '</b></div>') : '') +
      '</div>' +
      '<div class="card" style="padding:12px;margin-bottom:12px;"><div style="font-weight:900;color:var(--gold);margin-bottom:8px;">Vedi dati del cliente</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'training\')">ALLENAMENTO</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'stats\')">STATS WORKOUT</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'nutrition\')">ALIMENTAZIONE</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'supplements\')">INTEGRAZIONE</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'therapy\')">TERAPIA</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'exams\')">ESAMI</button>' +
      '<button class="btn btn-outline" style="font-size:10px;" onclick="enterCoachClientView(\'athlete\')">PROFILO</button></div></div>' +
      '<div class="card" style="padding:12px;margin-bottom:12px;">' +
      '<button type="button" class="cp-ws-collapse-h" onclick="toggleCoachWsSection(\'intake\')" style="display:flex;width:100%;justify-content:space-between;align-items:center;gap:8px;background:transparent;border:0;padding:0;cursor:pointer;text-align:left;">' +
      '<span style="font-weight:900;color:var(--gold);">Anagrafica acquisizione</span>' +
      '<span id="cp-ws-arrow-intake" style="color:var(--gold);font-size:14px;">' + (collapsed.intake ? '▸' : '▾') + '</span></button>' +
      '<div id="cp-intake-body" style="margin-top:8px;' + (collapsed.intake ? 'display:none;' : '') + '">' +
      (intakeRows || '<div class="cp-help">Questionario non ancora compilato.</div>') + '</div></div>' +
      '<div class="card" style="padding:12px;margin-bottom:12px;">' +
      '<button type="button" class="cp-ws-collapse-h" onclick="toggleCoachWsSection(\'events\')" style="display:flex;width:100%;justify-content:space-between;align-items:center;gap:8px;background:transparent;border:0;padding:0;cursor:pointer;text-align:left;">' +
      '<span style="font-weight:900;color:var(--gold);">Notifiche cliente (con orario)</span>' +
      '<span id="cp-ws-arrow-events" style="color:var(--gold);font-size:14px;">' + (collapsed.events ? '▸' : '▾') + '</span></button>' +
      '<div id="cp-events-body" style="margin-top:8px;' + (collapsed.events ? 'display:none;' : '') + '">' +
      (eventsHtml || '<div class="cp-help">Nessuna attività recente.</div>') +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;font-size:10px;" onclick="openNotificationsCenter(\'' + esc(id) + '\')">VEDI TUTTE</button></div></div>';
    // Chat solo in navigate('coachChat') — niente composer inline qui
  } catch (err) {
    c.innerHTML = '<div class="cp-help">' + esc((err && err.message) || 'Snapshot non disponibile.') + '</div>';
  }
}

function toggleCoachWsSection(key) {
  if (!store.__cpWsCollapse || typeof store.__cpWsCollapse !== 'object') {
    store.__cpWsCollapse = { intake: true, events: true };
  }
  store.__cpWsCollapse[key] = !store.__cpWsCollapse[key];
  const body = document.getElementById(key === 'intake' ? 'cp-intake-body' : 'cp-events-body');
  const arrow = document.getElementById(key === 'intake' ? 'cp-ws-arrow-intake' : 'cp-ws-arrow-events');
  const on = !!store.__cpWsCollapse[key];
  if (body) body.style.display = on ? 'none' : '';
  if (arrow) arrow.textContent = on ? '▸' : '▾';
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
    bodyChecks: Array.isArray(store.bodyChecks) ? JSON.parse(JSON.stringify(store.bodyChecks)) : [],
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
  store.bodyChecks = backup.bodyChecks || [];
  store.nutritionDaily = backup.nutritionDaily || {};
  store.profile = (backup.profile != null && typeof backup.profile === 'object')
    ? backup.profile
    : (store.profile && !store.__cpClientViewProfile ? store.profile : {});
  if (store.__cpClientViewProfile) delete store.__cpClientViewProfile;
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

/* ——— Add to Home (A2HS) + Web Push ——— */
function captureInstallPromptEarly() {
  if (window.__nurvanInstallCaptureBound) return;
  window.__nurvanInstallCaptureBound = true;
  window.addEventListener('beforeinstallprompt', function (e) {
    try { e.preventDefault(); } catch (_) {}
    window.__nurvanDeferredInstall = e;
  });
  window.addEventListener('appinstalled', function () {
    window.__nurvanDeferredInstall = null;
    try { localStorage.setItem('NURVAN_A2HS_INSTALLED', '1'); } catch (_) {}
  });
}

function isStandalonePwaLocal() {
  try {
    if (typeof isStandalonePwa === 'function') return isStandalonePwa();
    if (window.navigator && window.navigator.standalone === true) return true;
    return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  } catch (_) { return false; }
}

function applyInviteManifestStartUrl(token) {
  if (!token) return;
  try {
    const existing = document.querySelector('link[rel="manifest"]');
    const href = existing ? existing.getAttribute('href') : 'manifest.webmanifest';
    fetch(href, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (man) {
      const start = '/c/' + encodeURIComponent(token);
      const next = Object.assign({}, man, { start_url: start, scope: '/', id: start });
      const blob = new Blob([JSON.stringify(next)], { type: 'application/manifest+json' });
      const url = URL.createObjectURL(blob);
      if (existing) {
        if (existing.__cpBlob) try { URL.revokeObjectURL(existing.__cpBlob); } catch (_) {}
        existing.__cpBlob = url;
        existing.setAttribute('href', url);
      } else {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = url;
        link.__cpBlob = url;
        document.head.appendChild(link);
      }
    }).catch(function () {});
  } catch (_) {}
}

function a2hsDismissKey(token) {
  return 'NURVAN_A2HS_DISMISS_' + String(token || 'x').slice(0, 48);
}

function ensureA2hsSheet() {
  let sheet = document.getElementById('cp-a2hs-sheet');
  if (sheet) return sheet;
  sheet = document.createElement('div');
  sheet.id = 'cp-a2hs-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.style.cssText = 'display:none;position:fixed;inset:0;z-index:10140;background:rgba(0,0,0,.88);align-items:flex-end;justify-content:center;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));box-sizing:border-box;';
  sheet.innerHTML = '<div style="width:100%;max-width:440px;background:#0d0d0d;border:1px solid var(--gold);border-radius:16px 16px 12px 12px;padding:16px;color:#eee;box-sizing:border-box;">' +
    '<div style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1px;">NURVAN</div>' +
    '<h2 style="color:var(--gold);font-size:18px;margin:6px 0 8px;">Aggiungi Nurvan alla Home</h2>' +
    '<p id="cp-a2hs-copy" style="font-size:12px;color:#bbb;line-height:1.45;margin:0 0 12px;">Si apre come app, senza barra del browser. Ideale per il link del coach.</p>' +
    '<ol id="cp-a2hs-steps" style="display:none;font-size:12px;color:#ccc;line-height:1.5;margin:0 0 12px;padding-left:18px;"></ol>' +
    '<button type="button" class="btn btn-primary" id="cp-a2hs-primary" style="width:100%;margin-bottom:8px;font-weight:900;">AGGIUNGI ALLA HOME</button>' +
    '<button type="button" class="btn btn-outline" id="cp-a2hs-push" style="width:100%;margin-bottom:8px;display:none;">ATTIVA NOTIFICHE (ANCHE A SCHERMO SPENTO)</button>' +
    '<button type="button" class="btn btn-outline" id="cp-a2hs-later" style="width:100%;">PIÙ TARDI</button></div>';
  document.body.appendChild(sheet);
  return sheet;
}

function hideA2hsSheet() {
  const sheet = document.getElementById('cp-a2hs-sheet');
  if (sheet) sheet.style.display = 'none';
}

function maybeOfferClientHomeInstall(token) {
  captureInstallPromptEarly();
  if (typeof window !== 'undefined' && window.NativeConfig) return;
  if (isStandalonePwaLocal()) {
    maybeSubscribeWebPush();
    return;
  }
  const t = token || store.inviteToken || '';
  try {
    if (t && localStorage.getItem(a2hsDismissKey(t)) === '1') return;
    if (localStorage.getItem('NURVAN_A2HS_INSTALLED') === '1' && isStandalonePwaLocal()) return;
  } catch (_) {}
  if (t) applyInviteManifestStartUrl(t);
  const sheet = ensureA2hsSheet();
  const copy = document.getElementById('cp-a2hs-copy');
  const steps = document.getElementById('cp-a2hs-steps');
  const primary = document.getElementById('cp-a2hs-primary');
  const later = document.getElementById('cp-a2hs-later');
  const pushBtn = document.getElementById('cp-a2hs-push');
  const deferred = window.__nurvanDeferredInstall;
  const ios = (function () {
    try { return typeof isIosDevice === 'function' ? isIosDevice() : /iPhone|iPad|iPod/i.test(navigator.userAgent || ''); } catch (_) { return false; }
  })();
  if (steps) {
    steps.style.display = 'none';
    steps.innerHTML = '';
  }
  if (deferred) {
    if (copy) copy.textContent = 'Tocca AGGIUNGI ALLA HOME: Nurvan diventa un’icona e riapre il tuo spazio coach.';
    if (primary) primary.textContent = 'AGGIUNGI ALLA HOME';
  } else if (ios) {
    if (copy) copy.textContent = 'Su iPhone apri questo link in Safari, poi Condividi → Aggiungi a Home.';
    if (steps) {
      steps.style.display = 'block';
      steps.innerHTML = '<li>Tocca Condividi</li><li>Scorri e tocca <b style="color:#fff;">Aggiungi a Home</b></li><li>Conferma: icona Nurvan sulla Home</li>';
    }
    if (primary) primary.textContent = 'HO CAPITO';
  } else {
    if (copy) copy.textContent = 'Su Chrome: menu ⋮ → Installa app / Aggiungi a schermata Home. Poi riapri dall’icona.';
    if (primary) primary.textContent = 'HO CAPITO';
  }
  if (pushBtn) {
    pushBtn.style.display = (store && store.accountToken) ? 'block' : 'none';
    pushBtn.onclick = function () { enableWebPushFromUi(); };
  }
  if (primary) {
    primary.onclick = function () {
      if (deferred && typeof deferred.prompt === 'function') {
        deferred.prompt();
        Promise.resolve(deferred.userChoice).then(function () {
          window.__nurvanDeferredInstall = null;
          hideA2hsSheet();
          maybeSubscribeWebPush();
        }).catch(function () { hideA2hsSheet(); });
        return;
      }
      hideA2hsSheet();
    };
  }
  if (later) {
    later.onclick = function () {
      try { if (t) localStorage.setItem(a2hsDismissKey(t), '1'); } catch (_) {}
      hideA2hsSheet();
    };
  }
  sheet.style.display = 'flex';
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function enableWebPushFromUi() {
  try {
    await maybeSubscribeWebPush(true);
    practiceToast('Notifiche attivate (se il browser le consente)', 'success');
  } catch (err) {
    practiceToast((err && err.message) || 'Notifiche non disponibili', 'warning');
  }
}

async function maybeSubscribeWebPush(force) {
  if (typeof window !== 'undefined' && window.NativeConfig) return;
  if (!store || !store.accountToken) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    if (!force) {
      try { if (localStorage.getItem('NURVAN_PUSH_DENIED') === '1') return; } catch (_) {}
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      try { localStorage.setItem('NURVAN_PUSH_DENIED', '1'); } catch (_) {}
      return;
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const p = await Notification.requestPermission();
      if (p !== 'granted') {
        try { localStorage.setItem('NURVAN_PUSH_DENIED', '1'); } catch (_) {}
        return;
      }
    }
    const vapidRes = await practiceFetch('/api/push/vapid-public-key', { method: 'GET' }, 10000);
    const key = vapidRes && vapidRes.publicKey;
    if (!key) return;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key)
      });
    }
    await practiceFetch('/api/push/subscribe', {
      method: 'POST',
      headers: practiceHeaders(true),
      body: JSON.stringify({ subscription: sub.toJSON() })
    }, 15000);
    try { localStorage.removeItem('NURVAN_PUSH_DENIED'); } catch (_) {}
  } catch (err) {
    console.warn('[WEB_PUSH_SUBSCRIBE]', err);
    if (force) throw err;
  }
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
  if (!job) {
    bar.style.display = 'none';
    bar.classList.remove('cp-assign-expanded', 'cp-assign-collapsed');
    if (document.body) document.body.classList.remove('cp-assign-expanded');
    return;
  }
  const expanded = !!store.__cpAssignBarExpanded;
  bar.style.display = 'block';
  bar.classList.toggle('cp-assign-expanded', expanded);
  bar.classList.toggle('cp-assign-collapsed', !expanded);
  if (document.body) document.body.classList.toggle('cp-assign-expanded', expanded);
  if (!expanded) {
    bar.innerHTML = '<button type="button" class="cp-assign-chip" onclick="toggleAssignBannerExpand()">' +
      'ASSEGNA · ' + esc((job.name || 'cliente').slice(0, 18)) + ' ▴</button>';
    return;
  }
  bar.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px;">' +
    '<div style="font-size:11px;color:var(--gold);font-weight:800;">ASSEGNAZIONE A ' + esc(job.name || 'cliente') + ' · SPAZIO CLIENTE</div>' +
    '<button type="button" class="btn btn-outline" style="font-size:10px;padding:4px 8px;" onclick="toggleAssignBannerExpand()">RIDUCI</button></div>' +
    '<div style="font-size:11px;color:#aaa;margin-bottom:8px;">Questo non è il tuo allenamento. Importa o scegli, modifica, poi invia.</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'training\')">VISUALIZZA ALLENAMENTO</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'nutrition\')">ALIMENTAZIONE</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'supplements\')">INTEGRAZIONE</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'therapy\')">TERAPIA</button>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'exams\')">ESAMI</button></div>' +
    '<div style="display:flex;gap:8px;"><button class="btn btn-primary" style="flex:1;font-size:11px;" onclick="confirmAssignSandbox()">INVIA AL CLIENTE</button>' +
    '<button class="btn btn-outline" style="flex:1;font-size:11px;" onclick="cancelAssignSandbox()">ANNULLA</button></div>';
}

function toggleAssignBannerExpand() {
  store.__cpAssignBarExpanded = !store.__cpAssignBarExpanded;
  ensureAssignBanner();
}

function collapseAssignBannerForOverlay() {
  if (store && store.coachAssigning && store.__cpAssignBarExpanded) {
    store.__cpAssignBarExpanded = false;
    ensureAssignBanner();
  }
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
    '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="beginAssignSandbox(\'' + esc(clientId) + '\',\'' + esc(name || '') + '\',\'mylib\')">DAL MIO DATABASE</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="beginAssignSandbox(\'' + esc(clientId) + '\',\'' + esc(name || '') + '\',\'programs\')">DATABASE PROGRAMMI (NURVAN)</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="beginAssignSandbox(\'' + esc(clientId) + '\',\'' + esc(name || '') + '\',\'copy\')">USA SCHEDA ATTIVA COME BASE</button>' +
    '<button class="btn btn-outline" style="width:100%;" onclick="showOverlay(\'cp-assign\', false)">ANNULLA</button>';
  showOverlay('cp-assign', true);
  requestNotifyPermission();
}

function beginAssignSandbox(clientId, name, mode) {
  requestNotifyPermission();
  store.coachAssigning = { clientId: clientId, name: name, mode: mode || 'import' };
  store.__cpAssignBarExpanded = false;
  window.__cpAssignBackup = snapshotCoachMaster();
  if (typeof persist === 'function') persist();
  // copy: parte dalla scheda personale. import/programs/mylib: parti dai dati GIÀ del cliente (merge), non bozza vuota.
  if (mode === 'copy') {
    /* keep master DATA as base (already snapshotted) */
  } else {
    seedAssignSandboxFromClient(clientId);
  }
  showOverlay('cp-assign', false);
  ensureAssignBanner();
  if (mode === 'import') {
    navigate('import');
    practiceToast('Spazio cliente: parti dai dati già assegnati. Importi solo le sezioni che scegli — le altre restano.', 'success');
  } else if (mode === 'mylib') {
    openCoachLibraryAssignPicker(clientId, name);
  } else if (mode === 'programs') {
    promptCatalogFromIntakeThenOpen(clientId, name);
  } else {
    navigate('training');
    practiceToast('Copia della tua scheda attiva come base cliente. Modifica e conferma.', 'success');
  }
}

function seedAssignSandboxFromClient(clientId) {
  const ws = store.coachWorkspace;
  const data = (ws && String(ws.clientId) === String(clientId) && ws.data) ? ws.data : null;
  const prog = (data && data.activeProgram) ? data.activeProgram : null;
  const hasWeeks = !!(prog && Array.isArray(prog.weeks) && prog.weeks.length);
  if (hasWeeks || (data && (data.nutrition || data.supplementation || data.therapy || data.exams))) {
    try {
      let base = prog && typeof prog === 'object' ? JSON.parse(JSON.stringify(prog)) : emptyClientAssignDraft();
      if (!base.id) base.id = 'assign_merge_' + Date.now();
      if (data.nutrition) base.nutrition = JSON.parse(JSON.stringify(data.nutrition));
      if (data.supplementation) base.supplementation = JSON.parse(JSON.stringify(data.supplementation));
      if (data.therapy) base.therapy = JSON.parse(JSON.stringify(data.therapy));
      if (data.exams) base.exams = JSON.parse(JSON.stringify(data.exams));
      DATA = base;
      store.activeProgram = base;
      store.activeProgramId = base.id;
      store.nutrition = base.nutrition || null;
      store.supplementation = base.supplementation || null;
      store.therapy = base.therapy || null;
      store.exams = base.exams || null;
    } catch (_) {
      const draft = emptyClientAssignDraft();
      try { DATA = draft; } catch (__) {}
      store.activeProgram = draft;
      store.activeProgramId = draft.id;
      store.nutrition = null;
      store.supplementation = null;
      store.therapy = null;
      store.exams = null;
    }
  } else {
    const draft = emptyClientAssignDraft();
    try { DATA = draft; } catch (_) {}
    store.activeProgram = draft;
    store.activeProgramId = draft.id;
    store.nutrition = null;
    store.supplementation = null;
    store.therapy = null;
    store.exams = null;
  }
  if (typeof currentWeek !== 'undefined') currentWeek = 1;
  if (typeof currentDay !== 'undefined') currentDay = 0;
  // Async refresh: if workspace stale/empty, pull snapshot then re-seed without wiping imports already done
  if (clientId) {
    practiceFetch('/api/coach/clients/' + encodeURIComponent(clientId) + '/snapshot', { method: 'GET', headers: practiceHeaders(false) }, 20000).then(function (snap) {
      if (!store.coachAssigning || String(store.coachAssigning.clientId) !== String(clientId)) return;
      store.coachWorkspace = Object.assign({}, store.coachWorkspace || {}, {
        clientId: clientId,
        client: snap.client || (store.coachWorkspace && store.coachWorkspace.client),
        data: snap.data || {}
      });
      const curWeeks = (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.weeks)) ? DATA.weeks.length : 0;
      const remoteProg = snap.data && snap.data.activeProgram;
      const remoteWeeks = (remoteProg && Array.isArray(remoteProg.weeks)) ? remoteProg.weeks.length : 0;
      // Only adopt remote base if local draft still empty (no training yet imported)
      if (curWeeks < 1 && remoteWeeks > 0) {
        seedAssignSandboxFromClient(clientId);
        if (typeof render === 'function' && currentView === 'import') render();
      } else if (curWeeks < 1) {
        // Fill missing domains from remote without touching local weeks
        if (snap.data && snap.data.nutrition && !(DATA && DATA.nutrition)) {
          DATA.nutrition = snap.data.nutrition;
          store.nutrition = snap.data.nutrition;
        }
        if (snap.data && snap.data.supplementation && !(DATA && DATA.supplementation)) {
          DATA.supplementation = snap.data.supplementation;
          store.supplementation = snap.data.supplementation;
        }
        if (snap.data && snap.data.therapy && !(DATA && DATA.therapy)) {
          DATA.therapy = snap.data.therapy;
          store.therapy = snap.data.therapy;
        }
        if (snap.data && snap.data.exams && !(DATA && DATA.exams)) {
          DATA.exams = snap.data.exams;
          store.exams = snap.data.exams;
        }
      }
    }).catch(function () {});
  }
}

function mapIntakeToCatalogFilters(intake) {
  intake = intake || {};
  const filters = { q: '', days: '', split: '', goal: '', equipment: '', experience: '', duration: '', progression: '', audience: '' };
  const sex = String(intake.sex || '').toLowerCase();
  if (/femmin/.test(sex)) filters.audience = 'female';
  else if (/masch|uomo/.test(sex)) filters.audience = 'male';
  else if (sex) filters.audience = 'unisex';

  const goal = String(intake.goal || '');
  if (/ipertrof/i.test(goal)) filters.goal = 'ipertrofia';
  else if (/forza/i.test(goal)) filters.goal = 'forza';
  else if (/dimagr/i.test(goal)) filters.goal = 'cut';
  else if (/ricompos/i.test(goal)) filters.goal = 'recomp';
  else if (/performance|power/i.test(goal)) filters.goal = 'powerbuilding';
  else if (/gara/i.test(goal)) filters.goal = 'forza';
  else if (/salute|postura/i.test(goal)) filters.goal = 'ipertrofia';

  const sess = String(intake.sessionsPerWeek || '');
  if (/^2/.test(sess)) filters.days = '2';
  else if (/^3/.test(sess)) filters.days = '3';
  else if (/^4/.test(sess)) filters.days = '4';
  else if (/^5/.test(sess)) filters.days = '5';
  else if (/^6/.test(sess)) filters.days = '6';

  const eq = String(intake.equipment || '');
  if (/corpo\s*libero/i.test(eq)) filters.equipment = 'bodyweight';
  else if (/casa/i.test(eq)) filters.equipment = 'casa';
  else if (/palestra|macchine|pesi|panca/i.test(eq)) filters.equipment = 'palestra';

  const level = String(intake.level || '');
  if (/princip/i.test(level)) filters.experience = 'principiante';
  else if (/interm/i.test(level)) filters.experience = 'intermedio';
  else if (/avanz|agon/i.test(level)) filters.experience = 'avanzato';

  const split = String(intake.splitPref || '');
  if (/full\s*body/i.test(split)) filters.split = 'fullbody';
  else if (/upper|lower/i.test(split)) filters.split = 'upper_lower';
  else if (/distretto|mono/i.test(split)) filters.split = 'monofrequency';
  else if (/push|pull|ppl/i.test(split)) filters.split = 'upper_lower';

  const bits = [];
  if (filters.days) bits.push(filters.days + ' giorni');
  if (filters.split) bits.push(filters.split.replace('_', ' '));
  if (filters.goal) bits.push(filters.goal);
  if (filters.audience === 'female') bits.push('donna');
  if (filters.audience === 'male') bits.push('uomo');
  if (filters.equipment) bits.push(filters.equipment);
  if (filters.experience) bits.push(filters.experience);
  filters.q = bits.join(' ');
  return filters;
}

function intakeFilterSummary(filters, intake) {
  const parts = [];
  if (intake && (intake.firstName || intake.lastName)) parts.push(((intake.firstName || '') + ' ' + (intake.lastName || '')).trim());
  if (intake && intake.sex) parts.push(intake.sex);
  if (filters.goal) parts.push(filters.goal);
  if (filters.days) parts.push(filters.days + ' gg');
  if (filters.equipment) parts.push(filters.equipment);
  if (filters.experience) parts.push(filters.experience);
  if (filters.audience) parts.push(filters.audience);
  if (filters.split) parts.push(filters.split);
  return parts.filter(Boolean).join(' · ') || 'anagrafica cliente';
}

async function promptCatalogFromIntakeThenOpen(clientId, name) {
  let intake = (store.coachWorkspace && String(store.coachWorkspace.clientId) === String(clientId) && store.coachWorkspace.intake) || {};
  if (!intake || !Object.keys(intake).length) {
    try {
      const snap = await practiceFetch('/api/coach/clients/' + encodeURIComponent(clientId) + '/snapshot', { method: 'GET', headers: practiceHeaders(false) }, 20000);
      intake = snap.intake || (snap.client && snap.client.intake) || {};
      store.coachWorkspace = Object.assign({}, store.coachWorkspace || {}, {
        clientId: clientId,
        client: snap.client || (store.coachWorkspace && store.coachWorkspace.client),
        intake: intake,
        data: snap.data || {}
      });
    } catch (_) {}
  }
  const hasAnag = !!(intake && (intake.goal || intake.sex || intake.sessionsPerWeek || intake.level || intake.equipment));
  if (!hasAnag) {
    window.__cpCatalogFromIntake = null;
    navigate('programs');
    practiceToast('Database programmi: anagrafica assente — cerca liberamente.', 'warning');
    return;
  }
  const mapped = mapIntakeToCatalogFilters(intake);
  const summary = intakeFilterSummary(mapped, intake);
  openCpModal(
    '<h2>Cerca nel database</h2>' +
    '<p class="cp-help">Il cliente <b style="color:#fff;">' + esc(name || 'cliente') + '</b> ha compilato l\'anagrafica. Vuoi filtrare le schede in base a quei dati?</p>' +
    '<div style="padding:10px;background:#141414;border:1px solid #333;border-radius:10px;font-size:12px;color:#eee;margin-bottom:12px;line-height:1.45;">' +
    '<div style="font-size:10px;color:var(--gold);font-weight:800;margin-bottom:4px;">FILTRI DA ANAGRAFICA</div>' +
    esc(summary) +
    (mapped.q ? '<div style="margin-top:6px;color:#aaa;font-size:11px;">Query: ' + esc(mapped.q) + '</div>' : '') +
    '</div>' +
    '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="applyCatalogFromIntake(true)">SI, USA ANAGRAFICA</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="applyCatalogFromIntake(false)">NO, CERCA LIBERAMENTE</button>' +
    '<button class="btn btn-outline" style="width:100%;" onclick="closeCpModal()">ANNULLA</button>'
  );
  window.__cpPendingIntakeFilters = { mapped: mapped, intake: intake, name: name };
}

function applyCatalogFromIntake(useIt) {
  const pending = window.__cpPendingIntakeFilters || {};
  closeCpModal();
  if (useIt && pending.mapped) {
    window.__catalogFilters = Object.assign({}, pending.mapped);
    window.__cpCatalogFromIntake = {
      summary: intakeFilterSummary(pending.mapped, pending.intake),
      name: pending.name || '',
      at: Date.now()
    };
    practiceToast('Database filtrato sull\'anagrafica di ' + (pending.name || 'cliente'), 'success');
  } else {
    window.__cpCatalogFromIntake = null;
    window.__catalogFilters = { q: '', days: '', split: '', goal: '', equipment: '', experience: '', duration: '', progression: '', audience: '' };
    practiceToast('Database aperto senza filtri anagrafica', 'info');
  }
  navigate('programs');
}
window.applyCatalogFromIntake = applyCatalogFromIntake;
window.mapIntakeToCatalogFilters = mapIntakeToCatalogFilters;

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
  const weeks = (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.weeks)) ? DATA.weeks.length : 0;
  const expDays = weeks > 0 ? weeks * 7 : 56;
  const dExp = new Date(); dExp.setHours(12, 0, 0, 0); dExp.setDate(dExp.getDate() + expDays);
  const dChk = new Date(); dChk.setHours(12, 0, 0, 0); dChk.setDate(dChk.getDate() + Math.min(14, Math.max(7, Math.round(expDays / 2))));
  const defExp = dExp.getFullYear() + '-' + String(dExp.getMonth() + 1).padStart(2, '0') + '-' + String(dExp.getDate()).padStart(2, '0');
  const defChk = dChk.getFullYear() + '-' + String(dChk.getMonth() + 1).padStart(2, '0') + '-' + String(dChk.getDate()).padStart(2, '0');
  openCpModal(
    '<h2>Invia scheda al cliente</h2>' +
    '<p class="cp-help">Contenuti: ' + esc(kinds.join(', ')) + '.</p>' +
    (weeks
      ? '<div style="padding:10px;background:#141414;border:1px solid #333;border-radius:10px;margin-bottom:12px;font-size:12px;color:#eee !important;-webkit-text-fill-color:#eee;">Scadenza automatica: <b style="color:#fff;">' + weeks + ' settimane</b> (~ <b style="color:var(--gold);">' + esc(fmtDay(defExp)) + '</b>). Si ricalcola al primo allenamento finalizzato.</div>'
      : '<div style="padding:10px;background:#141414;border:1px solid #333;border-radius:10px;margin-bottom:12px;font-size:12px;color:#eee !important;">Nessun allenamento: scadenza default 8 settimane.</div>') +
    '<input type="hidden" id="cp-asg-exp-auto" value="' + esc(defExp) + '">' +
    '<div class="cp-field"><label>PROSSIMO CHECK (modificabile)</label>' + buildEuDateSelects('cp-asg-chk', defChk) + '</div>' +
    '<button class="btn btn-primary" style="width:100%;margin-top:14px;" onclick="confirmAssignSandboxSend()">CONFERMA INVIO</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="closeCpModal()">ANNULLA</button>'
  );
}

async function confirmAssignSandboxSend() {
  const job = store.coachAssigning;
  if (!job || !job.clientId) { closeCpModal(); return; }
  const kinds = detectSandboxKinds();
  const autoEl = document.getElementById('cp-asg-exp-auto');
  let programExpiresAt = autoEl && autoEl.value;
  if (!programExpiresAt) {
    const w = (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.weeks)) ? DATA.weeks.length : 0;
    const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + ((w || 8) * 7));
    programExpiresAt = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  const nextCheckAt = readEuDateSelects('cp-asg-chk') || programExpiresAt;
  if (!programExpiresAt || !nextCheckAt) {
    practiceToast('Date non valide', 'warning');
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
    if (!payload.activeProgram || !Array.isArray(payload.activeProgram.weeks) || !payload.activeProgram.weeks.length) {
      if (!kinds.filter(function (k) { return k !== 'training'; }).length) {
        throw new Error('Nessun contenuto da inviare.');
      }
      // Domain-only (es. sola alimentazione): non mandare weeks vuote che potrebbero far perdere la scheda
      if (kinds.indexOf('training') < 0) {
        delete payload.activeProgram;
      } else {
        payload.activeProgram = payload.activeProgram || { title: 'Piano cliente', weeks: [] };
      }
    } else {
      payload.activeProgram.programExpiryAnchor = 'assign';
      payload.activeProgram.programWeeksPlanned = payload.activeProgram.weeks.length;
    }
    // Se non stiamo assegnando training, non includere weeks nel payload
    if (kinds.indexOf('training') < 0 && payload.activeProgram) {
      const shell = {
        nutrition: payload.activeProgram.nutrition,
        supplementation: payload.activeProgram.supplementation,
        therapy: payload.activeProgram.therapy,
        exams: payload.activeProgram.exams
      };
      payload.activeProgram = shell;
    }
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(job.clientId) + '/assign', {
      method: 'POST', headers: practiceHeaders(true),
      body: JSON.stringify({
        data: payload,
        kinds: kinds,
        programExpiresAt: programExpiresAt,
        nextCheckAt: nextCheckAt
      })
    }, 45000);
    closeCpModal();
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
window.confirmAssignSandboxSend = confirmAssignSandboxSend;

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
  collapseAssignBannerForOverlay();
  const ov = ensureCpModal();
  const panel = document.getElementById('cp-modal-panel');
  if (panel) panel.innerHTML = html;
  ov.style.display = 'flex';
  if (document.body) document.body.classList.add('cp-modal-open');
  const bar = document.getElementById('cp-assign-bar');
  if (bar) bar.style.visibility = 'hidden';
}

function closeCpModal() {
  const ov = document.getElementById('cp-modal');
  if (ov) ov.style.display = 'none';
  if (document.body) document.body.classList.remove('cp-modal-open');
  const bar = document.getElementById('cp-assign-bar');
  if (bar && store.coachAssigning) {
    bar.style.visibility = 'visible';
    bar.style.display = 'block';
  }
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
    if (!hide) {
      practiceFetch('/api/presence/ping', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 8000).catch(function () {});
    }
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

async function toggleNurvanAi(id, allow) {
  try {
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/nurvan-ai', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ allow: !!allow })
    }, 15000);
    if (store.coachWorkspace && store.coachWorkspace.client && String(store.coachWorkspace.clientId) === String(id)) {
      store.coachWorkspace.client.allowNurvanAi = !!allow;
    }
    practiceToast(allow ? 'Nurvan AI attiva per il cliente' : 'Nurvan AI nascosta al cliente', 'success');
  } catch (err) {
    practiceToast((err && err.message) || 'Aggiornamento non riuscito', 'danger');
    const el = document.getElementById('cp-nurvan-ai');
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
  if (document.body) document.body.classList.add('cp-chat-view');
  try { clearNurvanAppBadge(); } catch (_) {}
  c.innerHTML = '<div class="cp-chat-shell">' +
    '<div style="flex-shrink:0;margin-bottom:6px;"><span style="font-size:10px;color:var(--gold);font-weight:800;">COACH · E2E</span>' +
    '<h1 style="color:#fff;margin:2px 0 0;font-size:18px;">Chat con il coach</h1></div>' +
    '<div id="cp-client-chat" class="cp-chat-thread"></div>' +
    chatToolsHtml('cp-client-msg', 'sendAthleteHumanMessage()', 'clearChatForMe(null,\'athlete\')', 'newChatThread(null,\'athlete\')', {
      videoCall: 'startInternalVideocall(null,\'athlete\')'
    }) +
    '</div>';
  window.__cpChatInputId = 'cp-client-msg';
  ensureE2EReady('athlete', null).then(function () { startChatPoll(null, 'cp-client-chat', 'athlete'); });
  if (window.__cpChatPrefill) {
    applyChatPrefill(window.__cpChatPrefill);
  }
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
  toggleChatDictation(inputId);
}

function setDictateButtonState(on) {
  const btn = document.getElementById('cp-dictate-btn');
  if (!btn) return;
  btn.classList.toggle('cp-dictate-on', !!on);
  btn.classList.toggle('cp-dictate-off', !on);
}

function toggleChatDictation(inputId) {
  window.__cpVoiceTarget = inputId;
  if (window.__cpDictating) {
    window.__cpDictating = false;
    setDictateButtonState(false);
    if (typeof stopVoiceInput === 'function') stopVoiceInput();
    practiceToast('Dettatura terminata', 'info');
    return;
  }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const native = typeof nativeBridge === 'function' ? nativeBridge() : (typeof NativeConfig !== 'undefined' ? NativeConfig : null);
  const hasNative = !!(native && (typeof native.startVoiceInputWithLang === 'function' || typeof native.startVoiceInput === 'function'));
  if (!hasNative && !Recognition) {
    setDictateButtonState(false);
    practiceToast('Dettatura non disponibile su questo browser. Usa Chrome/Edge o l’app.', 'warning');
    return;
  }
  window.__cpDictating = true;
  setDictateButtonState(true);
  if (typeof startVoiceInputFor === 'function') startVoiceInputFor(inputId);
  else if (typeof startVoiceInput === 'function') startVoiceInput();
}

function openChatAttachSheet() {
  ensurePracticeStyle();
  let sheet = document.getElementById('cp-attach-sheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'cp-attach-sheet';
    sheet.className = 'cp-attach-sheet';
    sheet.innerHTML = '<div class="cp-sheet">' +
      '<div style="font-size:13px;font-weight:800;color:var(--gold);margin-bottom:4px;">Allega alla chat</div>' +
      '<div class="cp-help" style="margin-bottom:4px;">Scegli come caricare il file</div>' +
      '<button type="button" class="btn btn-primary" onclick="pickChatAttachmentMode(\'camera\')">SCATTA FOTO</button>' +
      '<button type="button" class="btn btn-outline" style="color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="pickChatAttachmentMode(\'file\')">ALLEGA FILE O FOTO</button>' +
      '<button type="button" class="btn btn-outline" style="color:#ccc !important;-webkit-text-fill-color:#ccc !important;border-color:#555;" onclick="closeChatAttachSheet()">ANNULLA</button>' +
      '</div>';
    sheet.addEventListener('click', function (ev) { if (ev.target === sheet) closeChatAttachSheet(); });
    document.body.appendChild(sheet);
  }
  sheet.classList.add('active');
}
function closeChatAttachSheet() {
  const sheet = document.getElementById('cp-attach-sheet');
  if (sheet) sheet.classList.remove('active');
}

function pickChatAttachmentMode(mode) {
  closeChatAttachSheet();
  store.__cpChatAttachIntent = true;
  if (typeof setFilePickIntent === 'function') setFilePickIntent('CHAT_ATTACH');
  const native = typeof nativeBridge === 'function' ? nativeBridge() : (typeof NativeConfig !== 'undefined' ? NativeConfig : null);
  if (mode === 'camera') {
    if (native && typeof native.pickCamera === 'function') {
      try { native.pickCamera(); return; } catch (_) {}
    }
    const cam = document.getElementById('camera-import-input');
    if (cam) { cam.click(); return; }
  }
  if (native && typeof native.pickDocument === 'function') {
    try { native.pickDocument(); return; } catch (_) {}
  }
  const uni = document.getElementById('universal-file-input');
  if (uni) { uni.click(); return; }
  // last resort
  pickChatAttachment();
}

function pickChatAttachment() {
  openChatAttachSheet();
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

function prepareChatAttachment(att, enc) {
  if (!att) return null;
  const plain = att.data || null;
  if (enc && String(enc).indexOf('E2E1:') === 0) {
    return Object.assign({}, att, { e2eData: enc, data: null });
  }
  // Keep plaintext data URL so server sanitizeAttachment accepts it
  const out = Object.assign({}, att, { data: plain });
  delete out.e2eData;
  return out;
}

async function sendCoachHumanMessage(id) {
  if (window.__cpSending) return;
  const input = document.getElementById(window.__cpChatInputId || 'cp-ws-msg') || document.getElementById('cp-ws-msg') || document.getElementById('cp-chat-input');
  const body = input && input.value.trim();
  const pending = window.__cpPendingAttach || null;
  if (!body && !pending) return;
  setChatSending(true);
  try {
    await ensureE2EReady('coach', id);
    const encBody = body ? await encryptChatBody(body, 'coach', id) : '';
    let attachment = null;
    if (pending && pending.data) {
      const encAtt = await encryptChatBody(pending.data, 'coach', id);
      attachment = prepareChatAttachment(pending, encAtt);
    }
    await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/messages', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ body: encBody || (attachment ? '[allegato]' : ''), attachment: attachment, e2e: true })
    }, 20000);
    if (input) input.value = '';
    clearChatAttachPreview();
    loadHumanMessages(id, document.getElementById('cp-wa-chat') ? 'cp-wa-chat' : 'cp-ws-chat', 'coach');
  } catch (err) { practiceToast((err && err.message) || 'Messaggio non inviato', 'danger'); }
  finally { setChatSending(false); }
}

async function sendAthleteHumanMessage() {
  if (window.__cpSending) return;
  const input = document.getElementById('cp-client-msg');
  const body = input && input.value.trim();
  const pending = window.__cpPendingAttach || null;
  if (!body && !pending) return;
  setChatSending(true);
  try {
    await ensureE2EReady('athlete', null);
    const encBody = body ? await encryptChatBody(body, 'athlete', null) : '';
    let attachment = null;
    if (pending && pending.data) {
      const encAtt = await encryptChatBody(pending.data, 'athlete', null);
      attachment = prepareChatAttachment(pending, encAtt);
    }
    await practiceFetch('/api/client/messages', {
      method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ body: encBody || (attachment ? '[allegato]' : ''), attachment: attachment, e2e: true })
    }, 20000);
    if (input) input.value = '';
    clearChatAttachPreview();
    loadHumanMessages(null, 'cp-client-chat', 'athlete');
  } catch (_) {
    enqueueClientOutbox({ type: 'message', body: body || '[allegato]', attachment: pending });
    if (input) input.value = '';
    clearChatAttachPreview();
    practiceToast('Messaggio in coda offline', 'warning');
  } finally { setChatSending(false); }
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
  showInAppNotify(title, body, route);
  try {
    const native = typeof nativeBridge === 'function' ? nativeBridge() : (typeof NativeConfig !== 'undefined' ? NativeConfig : null);
    if (native && typeof native.notifyNow === 'function') {
      native.notifyNow(JSON.stringify({ title: title, body: body, id: 'n_' + Date.now(), route: route || null }));
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

function showInAppNotify(title, body, route) {
  let el = document.getElementById('cp-inapp-notify');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cp-inapp-notify';
    el.className = 'cp-inapp-notify';
    document.body.appendChild(el);
  }
  el.innerHTML = '<b>' + esc(title || 'Nurvan') + '</b><span>' + esc(body || '') + '</span>';
  el.onclick = function () {
    el.style.display = 'none';
    try { handleNotifyRoute(route); } catch (_) {}
  };
  el.style.display = 'block';
  clearTimeout(window.__cpInappNotifyTimer);
  window.__cpInappNotifyTimer = setTimeout(function () {
    if (el) el.style.display = 'none';
  }, 8000);
}

function handleNotifyRoute(route) {
  if (typeof route === 'string') {
    try { route = JSON.parse(route); } catch (_) { route = { view: route }; }
  }
  route = route || {};
  const view = route.view || route;
  if (view === '__notify_center' || view === 'notifications') {
    openNotificationsCenter();
    return;
  }
  const clientId = route.clientId;
  if (typeof isAthleteRole === 'function' && isAthleteRole()) {
    if (view === 'clientChat' || view === 'message' || view === 'chat') return navigate('clientChat');
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
    if (view === 'workout_done' || view === 'stats') {
      store.coachWorkspace = Object.assign({}, store.coachWorkspace || {}, { clientId: clientId });
      return openCoachClient(clientId);
    }
    if (view === 'training' || view === 'workout_started') {
      store.coachWorkspace = Object.assign({}, store.coachWorkspace || {}, { clientId: clientId });
      return enterCoachClientView('training');
    }
    return openCoachClient(clientId);
  }
  if (view === 'coachHub') return enterCoachSession();
}

function openClientWorkoutReport(logIndex) {
  const logs = (store.coachWorkspace && store.coachWorkspace.data && Array.isArray(store.coachWorkspace.data.logs))
    ? store.coachWorkspace.data.logs
    : (store.logs || []);
  const row = logs[logIndex];
  if (!row) { practiceToast('Report non trovato', 'warning'); return; }
  ensurePracticeStyle();
  let box = document.getElementById('cp-workout-report');
  if (!box) {
    box = document.createElement('div');
    box.id = 'cp-workout-report';
    box.className = 'cp-overlay';
    box.style.display = 'none';
    document.body.appendChild(box);
  }
  const mins = Math.max(1, Math.floor((row.durationSec || 0) / 60));
  const muscles = row.muscles || {};
  const muscleHtml = Object.keys(muscles).filter(function (k) { return muscles[k] > 0; }).map(function (k) {
    return '<div class="cp-row"><span>' + esc(k) + '</span><span>' + muscles[k] + ' serie</span></div>';
  }).join('') || '<div class="cp-help">Nessun dettaglio muscolare.</div>';
  box.innerHTML = '<div class="cp-panel">' +
    '<h2>Report allenamento</h2>' +
    '<div class="cp-help">W' + esc(String(row.week || '?')) + ' · seduta ' + ((row.day || 0) + 1) + ' · ' + esc(String(row.at || '').replace('T', ' ').slice(0, 16)) + '</div>' +
    '<div class="cp-row"><span>Durata</span><span>' + mins + ' min</span></div>' +
    '<div class="cp-row"><span>Serie</span><span>' + (row.sets || 0) + '</span></div>' +
    '<div class="cp-row"><span>Esercizi</span><span>' + (row.exercises || 0) + '</span></div>' +
    '<div class="cp-row"><span>Tonnellaggio</span><span>' + (row.tonnage || 0) + ' kg</span></div>' +
    '<div class="cp-row"><span>Intensità</span><span>' + (row.intensity || 0) + ' pts</span></div>' +
    '<div class="cp-row"><span>Kcal</span><span>' + (row.kcal || 0) + '</span></div>' +
    '<div style="margin-top:10px;font-size:11px;color:var(--gold);font-weight:800;">MUSCOLI</div>' + muscleHtml +
    '<button class="btn btn-primary" style="width:100%;margin-top:12px;" onclick="enterCoachClientView(\'stats\')">APRI STATS COMPLETE</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="closeClientWorkoutReport()">CHIUDI</button>' +
    '</div>';
  box.style.display = 'flex';
  box.onclick = function (ev) { if (ev.target === box) closeClientWorkoutReport(); };
}
function closeClientWorkoutReport() {
  const box = document.getElementById('cp-workout-report');
  if (box) box.style.display = 'none';
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
      const items = buildAthleteNotifyItems(box);
      updateNotifyCount(countAthleteUnread(box), items);
      if (!store.clientInboxReady) {
        store.clientInboxReady = true;
        store.clientSeenEventId = maxId;
        store.clientSeenMsgId = box.lastMessageId || 0;
        if (typeof persist === 'function') persist();
        maybePromptUnreadNotifications();
        return;
      }
      const seen = store.clientSeenEventId || 0;
      (box.events || []).forEach(function (e) {
        const id = Number(e.id || 0);
        if (id > seen && e.kind !== 'message') {
          const copy = eventNotifyCopy(e.kind);
          if (copy) notifyUser(copy[0], copy[1], copy[2] || { view: 'home' });
          if ((e.kind === 'program_assigned' || e.kind === 'nutrition_assigned' || e.kind === 'supplements_assigned' || e.kind === 'therapy_assigned' || e.kind === 'exams_assigned' || e.kind === 'change_approved' || e.kind === 'coach_modified') && typeof syncAccountData === 'function') {
            window.__cpForceRemoteProgram = true;
            syncAccountData(true).then(function () {
              window.__cpForceRemoteProgram = false;
              if (e.kind === 'change_approved') rememberApprovedProgram();
              if (typeof render === 'function') render();
              practiceToast('Nuova scheda ricevuta dal coach', 'success');
            }).catch(function () { window.__cpForceRemoteProgram = false; });
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
      const accountKey = String((store.accountUser && (store.accountUser.id || store.accountUser.email)) || 'coach');
      if (!store.coachInboxByAccount || typeof store.coachInboxByAccount !== 'object') store.coachInboxByAccount = {};
      const accState = store.coachInboxByAccount[accountKey] || { ready: false, seenId: 0 };
      const maxCoachId = (box.events || []).reduce(function (m, e) { return Math.max(m, Number(e.id || 0)); }, 0);
      const items = buildCoachNotifyItems(box);
      updateNotifyCount(items.length, items);
      if (!accState.ready) {
        accState.ready = true;
        accState.seenId = maxCoachId;
        store.coachInboxByAccount[accountKey] = accState;
        store.coachInboxReady = true;
        store.coachSeenEventId = maxCoachId;
        if (typeof persist === 'function') persist();
        maybePromptUnreadNotifications();
        return;
      }
      const seen = Number(accState.seenId || store.coachSeenEventId || 0);
      const ackIds = [];
      (box.events || []).forEach(function (e) {
        const id = Number(e.id || 0);
        if (id <= seen) return;
        ackIds.push(id);
        const from = (e.payload && e.payload.from) || '';
        if (e.kind === 'message' && from === 'coach') return;
        const route = { view: 'coachClient', clientId: String(e.client_id || '') };
        if (e.kind === 'message') notifyUser('Messaggio cliente', (e.display_name || 'Atleta') + ' ti ha scritto', Object.assign({}, route, { view: 'chat' }));
        else if (e.kind === 'ask_coach') notifyUser('Richiesta dal cliente', (e.display_name || 'Atleta') + ' chiede al coach', Object.assign({}, route, { view: 'chat' }));
        else if (e.kind === 'password_help') notifyUser('Recupero password', (e.display_name || 'Atleta') + ' ha chiesto la password', route);
        else if (e.kind === 'leave_request') notifyUser('Fine collaborazione', (e.display_name || 'Atleta') + ' ha chiesto di chiudere', route);
        else if (e.kind === 'change_request') notifyUser('Modifica da approvare', (e.display_name || 'Atleta') + ' vuole cambiare il programma', route);
        else if (e.kind === 'change_notice') notifyUser('Atleta ha modificato', (e.display_name || 'Atleta') + ' ha cambiato il programma', route);
        else if (e.kind === 'request_program') notifyUser('Richiesta scheda', (e.display_name || 'Atleta') + ' chiede la scheda', route);
        else if (e.kind === 'workout_started') notifyUser('In allenamento', (e.display_name || 'Atleta') + ' ha iniziato il workout', route);
        else if (e.kind === 'workout_done') notifyUser('Workout finito', (e.display_name || 'Atleta') + ' ha finalizzato', Object.assign({}, route, { view: 'workout_done' }));
      });
      accState.seenId = Math.max(seen, maxCoachId);
      store.coachInboxByAccount[accountKey] = accState;
      store.coachSeenEventId = accState.seenId;
      if (ackIds.length) {
        practiceFetch('/api/coach/inbox/ack', {
          method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ ids: ackIds })
        }, 8000).catch(function () {});
      }
      if (typeof persist === 'function') persist();
    }
  } catch (_) {}
}

function renderPracticeView() {
  const c = typeof $ === 'function' ? $('view-container') : document.getElementById('view-container');
  if (!c) return false;
  if (document.body && currentView !== 'clientChat' && currentView !== 'coachChat') {
    document.body.classList.remove('cp-chat-view');
  }
  if (currentView === 'coachHub') { ensurePracticeStyle(); c.innerHTML = ''; renderCoachHub(c); applyClientChrome(); return true; }
  if (currentView === 'clientChat') { ensurePracticeStyle(); c.innerHTML = ''; renderClientChat(c); applyClientChrome(); return true; }
  if (currentView === 'coachClient') { ensurePracticeStyle(); c.innerHTML = ''; renderCoachWorkspace(c); applyClientChrome(); return true; }
  if (currentView === 'coachChat') { ensurePracticeStyle(); c.innerHTML = ''; renderCoachChatPage(c); applyClientChrome(); return true; }
  if (currentView === 'coachLibrary') { ensurePracticeStyle(); c.innerHTML = ''; renderCoachLibrary(c); applyClientChrome(); return true; }
  stopChatPoll();
  return false;
}

function renderCoachChatPage(c) {
  const id = store.coachWorkspace && store.coachWorkspace.clientId;
  if (!id) {
    c.innerHTML = '<div class="cp-help">Seleziona un cliente.</div>';
    return;
  }
  if (document.body) document.body.classList.add('cp-chat-view');
  ensureClientViewBanner();
  const name = (store.coachWorkspace.client && store.coachWorkspace.client.displayName) || 'Cliente';
  const videoOk = store.coachAllowVideocall !== false;
  c.innerHTML = '<div class="cp-chat-shell">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;flex-shrink:0;">' +
    '<button class="btn btn-outline" style="font-size:10px;padding:6px 8px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="navigate(\'coachClient\')">← SCHEDA</button>' +
    '<div style="text-align:center;flex:1;"><div style="font-size:10px;color:var(--gold);font-weight:800;">CHAT E2E</div>' +
    '<div style="font-size:15px;font-weight:900;color:#fff;">' + esc(name) + '</div></div>' +
    '<button class="btn btn-outline" style="font-size:10px;padding:6px 8px;color:#d4af37 !important;-webkit-text-fill-color:#d4af37 !important;" onclick="navigate(\'coachHub\')">HUB</button></div>' +
    '<div id="cp-wa-chat" class="cp-chat-thread"></div>' +
    chatToolsHtml('cp-chat-input', 'sendCoachHumanMessage(\'' + esc(id) + '\')', 'clearChatForMe(\'' + esc(id) + '\',\'coach\')', 'newChatThread(\'' + esc(id) + '\',\'coach\')', {
      videoCall: videoOk ? ('startInternalVideocall(\'' + esc(id) + '\',\'coach\')') : ''
    }) +
    '</div>';
  window.__cpChatInputId = 'cp-chat-input';
  ensureE2EReady('coach', id).then(function () { startChatPoll(id, 'cp-wa-chat', 'coach'); });
}

function coachLibraryList() {
  if (!store.coachProgramLibrary) store.coachProgramLibrary = [];
  return store.coachProgramLibrary;
}

function renderCoachLibrary(c) {
  store.coachSessionActive = true;
  store.__cpCoachLibraryImport = false;
  const rows = coachLibraryList();
  c.innerHTML = '<div style="margin-bottom:12px;display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">' +
    '<div><span style="font-size:10px;color:var(--gold);font-weight:800;">COACH</span>' +
    '<h1 style="color:#fff;margin:2px 0 0;font-size:20px;">Il mio database schede</h1>' +
    '<p class="cp-help" style="margin-top:6px;">Personale: importi qui senza toccare la scheda attiva né i clienti. Poi assegni dal flusso ASSEGNA.</p></div>' +
    '<button class="btn btn-outline" style="font-size:10px;" onclick="navigate(\'coachHub\')">HUB</button></div>' +
    '<button class="btn btn-primary" style="width:100%;margin-bottom:12px;" onclick="beginCoachLibraryImport()">IMPORTA NEL MIO DATABASE</button>' +
    (rows.length
      ? rows.map(function (e, i) {
        const meta = e.meta || {};
        return '<div class="card" style="padding:12px;margin-bottom:8px;">' +
          '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">' +
          '<div><div style="font-size:14px;font-weight:800;color:#fff;">' + esc(e.title || 'Scheda') + '</div>' +
          '<div style="font-size:10px;color:#888;margin-top:4px;">' + esc(e.source || '') +
          (meta.weeks ? (' · ' + meta.weeks + ' sett.') : '') +
          (e.savedAt ? (' · ' + esc(String(e.savedAt).replace('T', ' ').slice(0, 16))) : '') +
          '</div></div>' +
          '<div style="display:flex;flex-direction:column;gap:6px;">' +
          '<button class="btn btn-outline" style="font-size:10px;padding:6px 8px;" onclick="deleteCoachLibraryEntry(\'' + esc(e.id) + '\')">ELIMINA</button>' +
          '</div></div></div>';
      }).join('')
      : '<div class="cp-help">Nessuna scheda salvata. Importa PDF/Excel come fai di solito — resta qui, non si attiva sul tuo profilo.</div>');
}

function beginCoachLibraryImport() {
  store.__cpCoachLibraryImport = true;
  store.coachSessionActive = true;
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : null;
  if (pState) {
    pState.importDomain = 'training';
    pState.canonicalProgram = null;
    pState.currentImportId = null;
  }
  navigate('import');
  practiceToast('Import nel tuo database personale (non attiva la scheda master).', 'success');
}

async function saveCanonicalToCoachLibrary(prog, filename) {
  prog = prog || {};
  if (!store.coachProgramLibrary) store.coachProgramLibrary = [];
  const id = 'cpl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const weeks = Array.isArray(prog.weeks) ? prog.weeks.length : 0;
  let payload = prog;
  try { payload = JSON.parse(JSON.stringify(prog)); } catch (_) { payload = prog; }
  const entry = {
    id: id,
    title: prog.title || filename || 'Scheda coach',
    source: filename || '',
    savedAt: new Date().toISOString(),
    meta: { weeks: weeks },
    payload: payload
  };
  store.coachProgramLibrary.unshift(entry);
  while (store.coachProgramLibrary.length > 40) store.coachProgramLibrary.pop();
  store.__cpCoachLibraryImport = false;
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : null;
  if (pState) {
    pState.canonicalProgram = null;
    pState.currentImportId = null;
    pState.isConfirming = false;
  }
  if (typeof persist === 'function') persist();
  if (typeof scheduleAccountSync === 'function') scheduleAccountSync();
  practiceToast('Scheda salvata nel mio database', 'success');
  navigate('coachLibrary');
}

function deleteCoachLibraryEntry(id) {
  if (!confirm('Eliminare questa scheda dal tuo database?')) return;
  store.coachProgramLibrary = (store.coachProgramLibrary || []).filter(function (e) { return e && e.id !== id; });
  if (typeof persist === 'function') persist();
  if (typeof scheduleAccountSync === 'function') scheduleAccountSync();
  if (typeof render === 'function') render();
}

function openCoachLibraryAssignPicker(clientId, name) {
  ensurePracticeStyle();
  ensurePracticeOverlays();
  const p = document.getElementById('cp-assign-panel');
  if (!p) return;
  const rows = coachLibraryList();
  if (!rows.length) {
    p.innerHTML = '<h2>Database vuoto</h2><p class="cp-help">Importa prima una scheda in «Il mio database».</p>' +
      '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="showOverlay(\'cp-assign\', false);navigate(\'coachLibrary\')">APRI IL MIO DATABASE</button>' +
      '<button class="btn btn-outline" style="width:100%;" onclick="showOverlay(\'cp-assign\', false)">CHIUDI</button>';
    showOverlay('cp-assign', true);
    return;
  }
  p.innerHTML = '<div style="font-size:10px;color:var(--gold);font-weight:800;">DAL MIO DATABASE</div>' +
    '<h2>Scegli scheda per ' + esc(name || 'cliente') + '</h2>' +
    '<div style="max-height:50vh;overflow:auto;margin:10px 0;">' +
    rows.map(function (e) {
      return '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;text-align:left;" onclick="applyCoachLibraryToAssign(\'' + esc(clientId) + '\',\'' + esc(name || '') + '\',\'' + esc(e.id) + '\')">' +
        esc(e.title || 'Scheda') + '</button>';
    }).join('') +
    '</div>' +
    '<button class="btn btn-outline" style="width:100%;" onclick="showOverlay(\'cp-assign\', false)">ANNULLA</button>';
  showOverlay('cp-assign', true);
}

function applyCoachLibraryToAssign(clientId, name, entryId) {
  const entry = (store.coachProgramLibrary || []).find(function (e) { return e && e.id === entryId; });
  if (!entry || !entry.payload) {
    practiceToast('Scheda non trovata', 'danger');
    return;
  }
  if (!store.coachAssigning) {
    store.coachAssigning = { clientId: clientId, name: name, mode: 'mylib' };
    store.__cpAssignBarExpanded = false;
    window.__cpAssignBackup = snapshotCoachMaster();
  }
  try {
    let prog = entry.payload;
    try { prog = JSON.parse(JSON.stringify(entry.payload)); } catch (_) {}
    if (typeof normalizeProgram === 'function') prog = normalizeProgram(prog);
    DATA = prog;
    store.activeProgram = prog;
    store.activeProgramId = prog.id || ('lib_' + entryId);
    if (prog.nutrition) { store.nutrition = prog.nutrition; DATA.nutrition = prog.nutrition; }
    if (prog.supplementation) { store.supplementation = prog.supplementation; DATA.supplementation = prog.supplementation; }
    if (prog.therapy) { store.therapy = prog.therapy; DATA.therapy = prog.therapy; }
    if (prog.exams) { store.exams = prog.exams; DATA.exams = prog.exams; }
    if (typeof currentWeek !== 'undefined') currentWeek = 1;
    if (typeof currentDay !== 'undefined') currentDay = 0;
  } catch (err) {
    practiceToast((err && err.message) || 'Caricamento fallito', 'danger');
    return;
  }
  showOverlay('cp-assign', false);
  ensureAssignBanner();
  navigate('training');
  practiceToast('Scheda dal tuo database caricata nello spazio cliente. Modifica e INVIA.', 'success');
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
    if (typeof isAthleteRole === 'function' && isAthleteRole()) {
      const prev = !!store.coachOnline;
      refreshAthleteMe().then(function () {
        if (prev !== !!store.coachOnline && typeof currentView !== 'undefined' && currentView === 'home' && typeof render === 'function') {
          try { render(); } catch (_) {}
        }
      }).catch(function () {});
    }
  };
  beat();
  window.__cpPresenceTimer = setInterval(beat, 30000);
}

async function bootCoachPractice() {
  captureInstallPromptEarly();
  ensurePracticeStyle();
  ensurePracticeOverlays();
  ensureAssignBanner();
  requestNotifyPermission();
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', function (ev) {
        if (ev && ev.data && ev.data.type === 'NURVAN_NOTIFY_ROUTE') {
          try { handleNotifyRoute(ev.data.route && (ev.data.route.route || ev.data.route)); } catch (_) {}
        }
      });
    }
  } catch (_) {}
  const urlToken = detectInviteToken();
  try {
    const shell = JSON.parse(localStorage.getItem('GS_CLIENT_SHELL') || 'null');
    if (shell && shell.locked && shell.inviteToken) {
      if (urlToken && shell.inviteToken !== urlToken) {
        clearClientShellLock();
      } else if (!urlToken) {
        store.clientShell = true;
        store.inviteToken = store.inviteToken || shell.inviteToken;
      }
    }
  } catch (_) {}
  const token = urlToken || store.inviteToken;
  if (token) {
    store.inviteToken = token;
  }
  // Athlete JWT bound to a different invite → force re-login for this link
  if (urlToken && typeof isAthleteRole === 'function' && isAthleteRole() && store.accountToken) {
    const bound = store.inviteTokenBound || (store.clientProfile && store.clientProfile.inviteToken) || '';
    const shellTok = (function () {
      try { return (JSON.parse(localStorage.getItem('GS_CLIENT_SHELL') || 'null') || {}).inviteToken || ''; } catch (_) { return ''; }
    })();
    if ((bound && bound !== urlToken) || (shellTok && shellTok !== urlToken) || (store.inviteToken && store.inviteToken !== urlToken && shellTok !== urlToken)) {
      store.accountToken = null;
      store.accountUser = null;
      store.role = null;
      store.clientProfile = null;
      clearClientShellLock();
      store.inviteToken = urlToken;
      store.clientShell = true;
      if (typeof persist === 'function') persist();
      applyClientChrome();
      showClientInvite(urlToken);
      return;
    }
  }
  // Coach master opening /c/... — confirm before entering client shell
  if (urlToken && store.coachSessionActive && !(typeof isAthleteRole === 'function' && isAthleteRole())) {
    if (!confirm('Questo è un link cliente. Entrare come atleta su questo dispositivo? (Il master resta separato solo se usi un altro browser/profilo.)')) {
      try { history.replaceState(null, '', '/'); } catch (_) {}
      store.inviteToken = null;
      applyClientChrome();
      return;
    }
  }
  if (token) store.clientShell = true;
  applyClientChrome();
  if (token && !(typeof isAthleteRole === 'function' && isAthleteRole() && store.accountToken)) {
    showClientInvite(token);
    return;
  }
  if (typeof isAthleteRole === 'function' && isAthleteRole() && store.accountToken) {
    store.clientShell = true;
    store.inviteTokenBound = store.inviteToken || urlToken || '';
    await refreshAthleteMe();
    startPresenceHeartbeat();
    if (store.clientProfile && store.clientProfile.needIntake) showClientIntake(store.clientProfile.intake || {});
    else if (!isClientTutorialDone()) showClientTutorial(false);
    flushClientOutbox();
    setTimeout(function () {
      maybeOfferClientHomeInstall(store.inviteToken || urlToken);
      maybeSubscribeWebPush();
    }, 1200);
  } else {
    await refreshCoachStatus();
    if (store.coachUnlocked) startPresenceHeartbeat();
    applyClientChrome();
    if (store.accountToken) setTimeout(function () { maybeSubscribeWebPush(); }, 1500);
    try {
      if (store.coachViewingClient && !window.__cpCoachViewBackup) {
        store.coachViewingClient = false;
      }
      if (typeof purgeCoachProfileLeakIfNeeded === 'function' && purgeCoachProfileLeakIfNeeded()) {
        practiceToast('Profilo coach ripristinato (dati cliente rimossi)', 'info');
      }
    } catch (_) {}
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
        const coachCore = { coachHub: 1, coachClient: 1, coachChat: 1, coachLibrary: 1 };
        const clientDomains = { training: 1, nutrition: 1, supplements: 1, therapy: 1, exams: 1, stats: 1, athlete: 1, import: 1, programs: 1, calendar: 1 };
        const ok = coachCore[raw]
          || ((store.coachViewingClient || store.coachAssigning) && clientDomains[raw])
          || (store.__cpCoachLibraryImport && (raw === 'import' || raw === 'coachLibrary'));
        if (!ok) {
          practiceToast('Sei in modalità Coach. Usa ESCI COACH per tornare all’app personale.', 'warning');
          return;
        }
        if (raw === 'import' && store.coachViewingClient && !store.coachAssigning && !store.__cpCoachLibraryImport) {
          const id = store.coachWorkspace && store.coachWorkspace.clientId;
          const name = (store.coachWorkspace && store.coachWorkspace.client && store.coachWorkspace.client.displayName) || 'cliente';
          if (id && typeof beginAssignSandbox === 'function') beginAssignSandbox(id, name, 'import');
        }
      }
      v = gatePracticeView(v);
      if (v === 'coachHub' || v === 'clientChat' || v === 'coachClient' || v === 'coachChat' || v === 'coachLibrary') {
        if (e && e.preventDefault) e.preventDefault();
        if (v === 'coachHub' || v === 'coachClient' || v === 'coachChat' || v === 'coachLibrary') store.coachSessionActive = true;
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
        ensureCoachDomainToolbar(currentView);
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
        if (athleteCanUseNurvanAi()) return _ask(domain);
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
      store.coachInboxReady = false;
      store.coachSeenEventId = 0;
      store.coachInboxByAccount = {};
      store.clientInboxReady = false;
      store.clientSeenEventId = 0;
      _lo();
      store.role = null;
      store.clientProfile = null;
      store.coachWorkspace = null;
      store.coachSessionActive = false;
      store.accountToken = null;
      store.accountUser = null;
      store.inviteTokenBound = null;
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
      clearClientShellLock();
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
        const last = Array.isArray(store.logs) && store.logs.length ? store.logs[store.logs.length - 1] : null;
        const weeksPlanned = (DATA && Array.isArray(DATA.weeks) && DATA.weeks.length)
          ? DATA.weeks.length
          : (DATA && DATA.programWeeksPlanned) || 0;
        const alreadyAnchored = !!(DATA && DATA.programExpiryAnchor === 'first_workout');
        const data = {
          logs: Array.isArray(store.logs) ? store.logs : [],
          data: store.data || {},
          lastLog: last ? { week: last.week, day: last.day, at: last.at || last.ts || null } : null,
          programWeeksPlanned: weeksPlanned,
          programExpiryAnchor: alreadyAnchored ? 'first_workout' : (DATA && DATA.programExpiryAnchor) || 'assign',
          anchorExpiryOnFirstWorkout: !alreadyAnchored && Array.isArray(store.logs) && store.logs.length === 1
        };
        // Sync account then push workout snapshot for coach visibility
        Promise.resolve(typeof syncAccountData === 'function' ? syncAccountData(false) : null)
          .catch(function () {})
          .then(function () {
            return practiceFetch('/api/client/workout-ping', {
              method: 'POST', headers: practiceHeaders(true),
              body: JSON.stringify({ data: data })
            }, 20000);
          })
          .catch(function () {
            enqueueClientOutbox({ type: 'workout-ping', data: data });
            flushClientOutbox();
          });
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

try { captureInstallPromptEarly(); } catch (_) {}

window.bootCoachPractice = bootCoachPractice;
window.toggleCoachWsSection = toggleCoachWsSection;
window.maybeOfferClientHomeInstall = maybeOfferClientHomeInstall;
window.maybeSubscribeWebPush = maybeSubscribeWebPush;
window.enableWebPushFromUi = enableWebPushFromUi;
window.showClientInvite = showClientInvite;
window.closeClientInviteOverlay = closeClientInviteOverlay;
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

/* ——— Videocall via PeerJS (open-source WebRTC) ——— */
var __cpCall = { peer: null, call: null, local: null, role: null, clientId: null, poll: null, myPeerId: null, muted: false, camOff: false };

function loadPeerJs() {
  return new Promise(function (resolve, reject) {
    if (typeof Peer !== 'undefined') return resolve(Peer);
    const existing = document.querySelector('script[data-peerjs]');
    if (existing) {
      if (typeof Peer !== 'undefined') return resolve(Peer);
      existing.addEventListener('load', function () { resolve(window.Peer); });
      existing.addEventListener('error', function () { reject(new Error('PeerJS script error')); });
      return;
    }
    const localUrl = (typeof location !== 'undefined' && location.origin)
      ? (location.origin.replace(/\/$/, '') + '/peerjs.min.js')
      : '/peerjs.min.js';
    const s = document.createElement('script');
    s.src = localUrl;
    s.setAttribute('data-peerjs', '1');
    s.onload = function () {
      if (typeof window.Peer !== 'undefined') resolve(window.Peer);
      else reject(new Error('PeerJS non definito dopo load'));
    };
    s.onerror = function () {
      s.removeAttribute('data-peerjs');
      const cdn = document.createElement('script');
      cdn.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      cdn.setAttribute('data-peerjs', '1');
      cdn.onload = function () {
        if (typeof window.Peer !== 'undefined') resolve(window.Peer);
        else reject(new Error('PeerJS CDN senza Peer'));
      };
      cdn.onerror = function () { reject(new Error('Impossibile caricare PeerJS')); };
      document.head.appendChild(cdn);
    };
    document.head.appendChild(s);
  });
}

function callOverlayMarkup() {
  return '<div class="cp-call-bar">' +
    '<div style="color:var(--gold);font-weight:800;font-size:12px;">VIDEOCALL</div>' +
    '<div id="cp-call-status" style="font-size:11px;color:#aaa;flex:1;text-align:center;">Connessione…</div>' +
    '<span style="width:48px;"></span></div>' +
    '<div id="cp-call-stage">' +
    '<video id="cp-call-remote" autoplay playsinline muted webkit-playsinline></video>' +
    '<video id="cp-call-local" autoplay playsinline muted webkit-playsinline></video>' +
    '<div id="cp-call-controls">' +
    '<button type="button" id="cp-call-mute" class="cp-call-btn" title="Microfono" onclick="toggleCallMute()">MIC</button>' +
    '<button type="button" class="cp-call-btn cp-call-hangup" title="Chiudi" onclick="hangupInternalVideocall()">FINE</button>' +
    '<button type="button" id="cp-call-cam" class="cp-call-btn" title="Videocamera" onclick="toggleCallCamera()">CAM</button>' +
    '</div></div>';
}

function ensureCallOverlay() {
  let ov = document.getElementById('cp-call-overlay');
  if (ov && !document.getElementById('cp-call-controls')) {
    ov.innerHTML = callOverlayMarkup();
    return ov;
  }
  if (ov) return ov;
  ov = document.createElement('div');
  ov.id = 'cp-call-overlay';
  ov.innerHTML = callOverlayMarkup();
  document.body.appendChild(ov);
  return ov;
}

function defaultStunIceServers() {
  return [
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: ['stun:stun1.l.google.com:19302'] }
  ];
}

async function fetchWebRtcIceServers() {
  try {
    const res = await practiceFetch('/api/webrtc/ice', { method: 'GET', headers: practiceHeaders(false) }, 8000);
    if (res && Array.isArray(res.iceServers) && res.iceServers.length) return res.iceServers;
  } catch (_) {}
  return defaultStunIceServers();
}

function setCallStatus(t) {
  const el = document.getElementById('cp-call-status');
  if (el) el.textContent = t || '';
}

function syncCallControlButtons() {
  const muteBtn = document.getElementById('cp-call-mute');
  const camBtn = document.getElementById('cp-call-cam');
  if (muteBtn) {
    muteBtn.textContent = __cpCall.muted ? 'MUTE' : 'MIC';
    muteBtn.classList.toggle('is-off', !!__cpCall.muted);
  }
  if (camBtn) {
    camBtn.textContent = __cpCall.camOff ? 'OFF' : 'CAM';
    camBtn.classList.toggle('is-off', !!__cpCall.camOff);
  }
}

function toggleCallMute() {
  if (!__cpCall.local) return;
  __cpCall.muted = !__cpCall.muted;
  __cpCall.local.getAudioTracks().forEach(function (t) { t.enabled = !__cpCall.muted; });
  syncCallControlButtons();
}

function toggleCallCamera() {
  if (!__cpCall.local) return;
  __cpCall.camOff = !__cpCall.camOff;
  __cpCall.local.getVideoTracks().forEach(function (t) { t.enabled = !__cpCall.camOff; });
  syncCallControlButtons();
}

async function publishPeerId(role, clientId, peerId) {
  const path = role === 'athlete'
    ? '/api/client/call/signal'
    : '/api/coach/clients/' + encodeURIComponent(clientId) + '/call/signal';
  await practiceFetch(path, {
    method: 'POST', headers: practiceHeaders(true),
    body: JSON.stringify({ signal: { type: 'peerjs', peerId: peerId, action: 'ready' } })
  }, 12000);
}

async function fetchRemotePeerId(role, clientId) {
  const path = role === 'athlete'
    ? '/api/client/call/signals?after=0'
    : '/api/coach/clients/' + encodeURIComponent(clientId) + '/call/signals?after=0';
  const res = await practiceFetch(path, { method: 'GET', headers: practiceHeaders(false) }, 12000);
  const list = (res.signals || []).slice().reverse();
  for (let i = 0; i < list.length; i++) {
    const sig = list[i] && list[i].signal;
    if (!sig || sig.type !== 'peerjs' || !sig.peerId) continue;
    if (list[i].from_role === role) continue;
    return sig.peerId;
  }
  return null;
}

function attachRemoteStream(remote) {
  const el = document.getElementById('cp-call-remote');
  if (!el) return;
  el.srcObject = remote;
  el.muted = true;
  const playP = el.play && el.play();
  if (playP && playP.then) {
    playP.then(function () {
      try { el.muted = false; } catch (_) {}
    }).catch(function () {
      try { el.muted = true; el.play(); } catch (_) {}
    });
  } else {
    try { el.muted = false; } catch (_) {}
  }
  setCallStatus('In chiamata');
}

function bindPeerIncoming(stream) {
  if (!__cpCall.peer) return;
  __cpCall.peer.on('call', function (call) {
    setCallStatus('Risposta chiamata…');
    __cpCall.call = call;
    call.answer(stream);
    call.on('stream', function (remote) { attachRemoteStream(remote); });
    call.on('close', function () { hangupInternalVideocall(true); });
    call.on('error', function () { practiceToast('Errore chiamata', 'danger'); });
  });
}

async function postVideocallChatNotice(role, clientId) {
  const notice = '📹 Sto avviando una videocall. Per sentirci e vederci, anche tu devi premere il pulsante VIDEO in chat.';
  try {
    if (role === 'athlete') {
      await ensureE2EReady('athlete', null);
      const encBody = await encryptChatBody(notice, 'athlete', null);
      await practiceFetch('/api/client/messages', {
        method: 'POST', headers: practiceHeaders(true),
        body: JSON.stringify({ body: encBody || notice, e2e: true })
      }, 12000);
      if (document.getElementById('cp-client-chat')) loadHumanMessages(null, 'cp-client-chat', 'athlete');
    } else if (clientId) {
      await ensureE2EReady('coach', clientId);
      const encBody = await encryptChatBody(notice, 'coach', clientId);
      await practiceFetch('/api/coach/clients/' + encodeURIComponent(clientId) + '/messages', {
        method: 'POST', headers: practiceHeaders(true),
        body: JSON.stringify({ body: encBody || notice, e2e: true })
      }, 12000);
      const boxId = document.getElementById('cp-wa-chat') ? 'cp-wa-chat' : (document.getElementById('cp-chat-thread') ? 'cp-chat-thread' : 'cp-ws-chat');
      if (document.getElementById(boxId)) loadHumanMessages(clientId, boxId, 'coach');
    }
  } catch (_) {}
}

async function startInternalVideocall(clientId, role) {
  if (role === 'coach' && store.coachAllowVideocall === false) {
    practiceToast('Hai disabilitato le videocall dall’hub', 'warning');
    return;
  }
  if (__cpCall.peer || __cpCall.call) {
    practiceToast('Chiamata già attiva', 'info');
    return;
  }
  practiceToast('Anche l’altro deve premere VIDEO in chat per collegarsi', 'info');
  postVideocallChatNotice(role, clientId);
  ensureCallOverlay().classList.add('active');
  setCallStatus('Nota inviata in chat · scarico PeerJS…');
  __cpCall.role = role;
  __cpCall.clientId = clientId;
  __cpCall.muted = false;
  __cpCall.camOff = false;
  syncCallControlButtons();
  try {
    const PeerCtor = await loadPeerJs();
    if (!PeerCtor) throw new Error('PeerJS non disponibile');
    setCallStatus('PeerJS OK · permessi camera…');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      });
    } catch (mediaErr) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }
    __cpCall.local = stream;
    const loc = document.getElementById('cp-call-local');
    if (loc) {
      loc.srcObject = stream;
      try { loc.play(); } catch (_) {}
    }

    setCallStatus('Configuro ICE…');
    const iceServers = await fetchWebRtcIceServers();
    setCallStatus('Connessione PeerServer…');
    const peer = new PeerCtor(undefined, {
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
      debug: 1,
      config: { iceServers: iceServers }
    });
    __cpCall.peer = peer;

    await new Promise(function (resolve, reject) {
      const t = setTimeout(function () { reject(new Error('Timeout PeerServer (rete/firewall). Riprova su Wi‑Fi o configura TURN.')); }, 20000);
      peer.on('open', function (id) {
        clearTimeout(t);
        __cpCall.myPeerId = id;
        resolve(id);
      });
      peer.on('error', function (err) {
        clearTimeout(t);
        reject(err);
      });
    });

    bindPeerIncoming(stream);
    await publishPeerId(role, clientId, __cpCall.myPeerId);
    setCallStatus('In attesa: anche l’altro deve premere VIDEO · ID ' + String(__cpCall.myPeerId).slice(0, 8));

    let tries = 0;
    __cpCall.poll = setInterval(async function () {
      if (__cpCall.call) return;
      tries += 1;
      if (tries > 40) {
        setCallStatus('In attesa: apri anche la chat sull’altro dispositivo e tocca VIDEO');
        return;
      }
      try {
        const remoteId = await fetchRemotePeerId(role, clientId);
        if (!remoteId || remoteId === __cpCall.myPeerId) return;
        setCallStatus('Chiamo…');
        const call = peer.call(remoteId, stream);
        __cpCall.call = call;
        call.on('stream', function (remote) { attachRemoteStream(remote); });
        call.on('close', function () { hangupInternalVideocall(true); });
        call.on('error', function (e) {
          practiceToast((e && e.message) || 'Chiamata fallita', 'danger');
          __cpCall.call = null;
        });
        clearInterval(__cpCall.poll);
        __cpCall.poll = null;
      } catch (_) {}
    }, 2000);

    practiceToast('Videocall attiva — l’altro utente deve premere VIDEO', 'success');
  } catch (err) {
    hangupInternalVideocall(true);
    practiceToast((err && err.message) || 'Camera/microfono o PeerJS non disponibili', 'danger');
  }
}

function hangupInternalVideocall(silent) {
  try {
    if (__cpCall.call) __cpCall.call.close();
  } catch (_) {}
  try {
    if (__cpCall.peer) __cpCall.peer.destroy();
  } catch (_) {}
  if (__cpCall.poll) { clearInterval(__cpCall.poll); __cpCall.poll = null; }
  if (__cpCall.local) { __cpCall.local.getTracks().forEach(function (t) { t.stop(); }); }
  if (!silent && __cpCall.role) {
    const path = __cpCall.role === 'athlete'
      ? '/api/client/call/signal'
      : '/api/coach/clients/' + encodeURIComponent(__cpCall.clientId) + '/call/signal';
    practiceFetch(path, {
      method: 'POST', headers: practiceHeaders(true),
      body: JSON.stringify({ signal: { type: 'peerjs', action: 'hangup' } })
    }, 8000).catch(function () {});
  }
  __cpCall = { peer: null, call: null, local: null, role: null, clientId: null, poll: null, myPeerId: null, muted: false, camOff: false };
  const ov = document.getElementById('cp-call-overlay');
  if (ov) ov.classList.remove('active');
  const loc = document.getElementById('cp-call-local');
  const rem = document.getElementById('cp-call-remote');
  if (loc) loc.srcObject = null;
  if (rem) rem.srcObject = null;
}

window.startInternalVideocall = startInternalVideocall;
window.hangupInternalVideocall = hangupInternalVideocall;
window.toggleCallMute = toggleCallMute;
window.toggleCallCamera = toggleCallCamera;
window.confirmDemoUnlock = confirmDemoUnlock;
window.openAddClientWizard = openAddClientWizard;
window.setAddClientMode = setAddClientMode;
window.submitAddClient = submitAddClient;
window.loadCoachClientList = loadCoachClientList;
window.debounceCoachClientList = debounceCoachClientList;
window.copyClientInvite = copyClientInvite;
window.rotateClientInvite = rotateClientInvite;
window.openCoachDrawer = openCoachDrawer;
window.closeCoachDrawer = closeCoachDrawer;
window.switchCoachClientFromHeader = switchCoachClientFromHeader;
window.toggleClientPaid = toggleClientPaid;
window.revokeCoachClient = revokeCoachClient;
window.removeCoachClient = removeCoachClient;
window.openCoachClient = openCoachClient;
window.openCoachClientChat = openCoachClientChat;
window.followClientLiveWorkout = followClientLiveWorkout;
window.stopLiveFollowWorkout = stopLiveFollowWorkout;
window.coachHeaderBack = coachHeaderBack;
window.clearCoachClientDomain = clearCoachClientDomain;
window.ensureCoachDomainToolbar = ensureCoachDomainToolbar;
window.friendlyApiError = friendlyApiError;
window.setNurvanAppBadge = setNurvanAppBadge;
window.clearNurvanAppBadge = clearNurvanAppBadge;
window.openNotificationsCenter = openNotificationsCenter;
window.closeNotificationsCenter = closeNotificationsCenter;
window.openNotifyItem = openNotifyItem;
window.markNotifyRead = markNotifyRead;
window.dismissNotifyItem = dismissNotifyItem;
window.markAllNotifyRead = markAllNotifyRead;
window.dismissAllNotifyItems = dismissAllNotifyItems;
window.openClientSheetNotify = openClientSheetNotify;
window.ensureNotifyButton = ensureNotifyButton;
window.assignActiveToClient = assignActiveToClient;
window.openAssignChooser = openAssignChooser;
window.beginAssignSandbox = beginAssignSandbox;
window.confirmAssignSandbox = confirmAssignSandbox;
window.promptCatalogFromIntakeThenOpen = promptCatalogFromIntakeThenOpen;
window.cancelAssignSandbox = cancelAssignSandbox;
window.toggleAssignBannerExpand = toggleAssignBannerExpand;
window.collapseAssignBannerForOverlay = collapseAssignBannerForOverlay;
window.pulseChatSendBtn = pulseChatSendBtn;
window.setChatSending = setChatSending;
window.toggleNurvanAi = toggleNurvanAi;
window.renderCoachLibrary = renderCoachLibrary;
window.beginCoachLibraryImport = beginCoachLibraryImport;
window.saveCanonicalToCoachLibrary = saveCanonicalToCoachLibrary;
window.deleteCoachLibraryEntry = deleteCoachLibraryEntry;
window.openCoachLibraryAssignPicker = openCoachLibraryAssignPicker;
window.applyCoachLibraryToAssign = applyCoachLibraryToAssign;
window.athleteCanUseNurvanAi = athleteCanUseNurvanAi;
window.exitCoachSession = exitCoachSession;
window.enterCoachSession = enterCoachSession;
window.enterCoachClientView = enterCoachClientView;
window.leaveCoachClientView = leaveCoachClientView;
window.requestCheckFromClient = requestCheckFromClient;
window.editClientSchedule = editClientSchedule;
window.toggleCoachHidePresence = toggleCoachHidePresence;
window.handleNotifyRoute = handleNotifyRoute;
window.openChatAttachSheet = openChatAttachSheet;
window.closeChatAttachSheet = closeChatAttachSheet;
window.pickChatAttachmentMode = pickChatAttachmentMode;
window.toggleChatDictation = toggleChatDictation;
window.openClientWorkoutReport = openClientWorkoutReport;
window.closeClientWorkoutReport = closeClientWorkoutReport;
window.startChatDictation = startChatDictation;
window.pickChatAttachment = pickChatAttachment;
window.sendCheckToClient = sendCheckToClient;
window.pushCoachClientEdits = pushCoachClientEdits;
window.askExerciseInfoToCoach = askExerciseInfoToCoach;
window.buildExerciseInfoPrefill = buildExerciseInfoPrefill;
window.applyChatPrefill = applyChatPrefill;
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
