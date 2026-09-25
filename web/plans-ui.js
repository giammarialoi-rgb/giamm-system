// ===================== Piani: il solo punto di controllo =====================
//
// Ogni schermata che chiude o apre qualcosa per piano chiede qui, e qui si
// chiede a web/entitlements.js (NurvanEntitlements.can), con le funzioni e i
// piani minimi di web/features.json. Nessuna schermata decide da se'.
//
// Il piano arriva dal server con /api/account/me, /api/client/me e
// /api/coach/status. Si tiene fuori dallo store: durante la vista di un
// cliente lo store del coach cambia area, il piano del coach no. Offline vale
// l'ultimo piano noto, salvato in localStorage; il logout lo cancella.

var PLAN_ENTITLEMENT_KEY = 'nurvan.entitlement.v1';

function planLib() {
  return (typeof self !== 'undefined' && self.NurvanEntitlements) || null;
}
function planFeatures() {
  return (typeof self !== 'undefined' && self.NURVAN_FEATURES) || null;
}

// What the server said last: the account's fields, with the coach link.
function currentAccountEntitlement() {
  if (window.__nurvanEntitlement) return window.__nurvanEntitlement;
  try {
    const raw = localStorage.getItem(PLAN_ENTITLEMENT_KEY);
    if (raw) window.__nurvanEntitlement = JSON.parse(raw);
  } catch (_) {}
  return window.__nurvanEntitlement || { plan: 'free' };
}

function onEntitlementReceived(ent) {
  if (!ent || typeof ent !== 'object') return;
  const keep = {
    plan: ent.plan || 'free',
    planSource: ent.planSource || 'manual',
    planUntil: ent.planUntil || null,
    seats: ent.seats === undefined ? null : ent.seats,
    trialUntil: ent.trialUntil || null,
    trialUsedAt: ent.trialUsedAt || null,
    coachLink: ent.coachLink || null,
    at: ent.at || new Date().toISOString()
  };
  const before = JSON.stringify(window.__nurvanEntitlement || null);
  window.__nurvanEntitlement = keep;
  try { localStorage.setItem(PLAN_ENTITLEMENT_KEY, JSON.stringify(keep)); } catch (_) {}
  if (before !== JSON.stringify(keep) && typeof render === 'function') {
    try { render(); } catch (_) {}
  }
}
window.onEntitlementReceived = onEntitlementReceived;

function clearAccountEntitlement() {
  window.__nurvanEntitlement = null;
  try { localStorage.removeItem(PLAN_ENTITLEMENT_KEY); } catch (_) {}
}

function currentPlanEffective() {
  const E = planLib();
  return E ? E.effective(currentAccountEntitlement()) : { plan: 'free', status: 'active', notices: [], seats: 0 };
}

function planExplain(feature, usage) {
  const E = planLib();
  if (!E) return { allowed: true, reason: 'ok', minPlan: null };
  return E.explain(currentAccountEntitlement(), feature, usage);
}
function planCan(feature, usage) {
  return planExplain(feature, usage).allowed;
}
function planDisplayName(plan) {
  const E = planLib();
  return E ? E.planName(plan) : String(plan || '');
}

// The sentence the athlete or coach reads when something is closed.
function planLockMessage(why) {
  if (!why || why.allowed) return '';
  if (why.reason === 'limit') {
    const unit = ((planFeatures() || {}).features || {})[why.feature || ''] || {};
    return 'Hai raggiunto il limite del piano ' + planDisplayName(why.plan) + ' (' + why.limit + (unit.unit ? ' ' + unit.unit : '') + ')' +
      (why.minPlan ? '. Con ' + planDisplayName(why.minPlan) + ' puoi andare oltre.' : '.');
  }
  return (why.label ? why.label + ': disponibile' : 'Disponibile') + ' con il piano ' + planDisplayName(why.minPlan) + '.';
}

// true, or a message and false. Nothing is deleted, nothing is hidden for good.
function requirePlan(feature, usage) {
  const why = planExplain(feature, usage);
  if (why.allowed) return true;
  why.feature = feature;
  if (typeof showToast === 'function') showToast(planLockMessage(why), 'error');
  return false;
}
window.requirePlan = requirePlan;

function planLockedHtml(feature, usage) {
  const why = planExplain(feature, usage);
  if (why.allowed) return '';
  why.feature = feature;
  return '<div class="plan-locked" style="border:1px dashed #555;border-radius:10px;padding:10px 12px;margin:8px 0;">' +
    '<div style="font-size:12px;color:#ddd;">' + esc(planLockMessage(why)) + '</div>' +
    '<button type="button" class="btn btn-outline" style="margin-top:8px;font-size:10px;padding:6px 10px;" onclick="navigate(\'pricing\')">VEDI I PIANI</button></div>';
}

/* ------------------------------ imports this month ------------------------------ */

function importUseLog() {
  const prefs = (store && store.prefs) || {};
  return Array.isArray(prefs.importLog) ? prefs.importLog : [];
}
function importsThisMonth(now) {
  const d = new Date(now == null ? Date.now() : now);
  const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  return importUseLog().filter(function (iso) { return String(iso || '').slice(0, 7) === key; }).length;
}
// Counted when an import is applied, not when a file is only read.
function recordImportUse() {
  if (!store.prefs) store.prefs = {};
  store.prefs.importLog = importUseLog().concat([new Date().toISOString()]).slice(-40);
  persist();
}
function requireImportAllowed() {
  return requirePlan('import', { count: importsThisMonth() });
}

/* ------------------------------ history ------------------------------ */

// Sessions the plan shows. Older ones stay in store.logs, untouched.
function historyVisibleLogs(logs) {
  const E = planLib();
  const list = Array.isArray(logs) ? logs : [];
  if (!E) return list;
  const days = E.historyDays(currentAccountEntitlement());
  if (days == null) return list;
  const since = Date.now() - days * 86400000;
  return list.filter(function (row) {
    const t = Date.parse((row && (row.finalizedAt || row.at || row.date)) || '');
    return !isFinite(t) || t >= since;
  });
}
function historyHiddenNoteHtml(all, visible) {
  const hidden = (all || []).length - (visible || []).length;
  if (hidden <= 0) return '';
  return '<div class="plan-history-note" style="font-size:11px;color:#aaa;padding:8px 0;">' + hidden +
    (hidden === 1 ? ' seduta più vecchia' : ' sedute più vecchie') + ' di 90 giorni: sono salvate, le vedi con il piano ' +
    esc(planDisplayName((planExplain('history_full') || {}).minPlan || 'standard')) + '.</div>';
}

/* ------------------------------ notices ------------------------------ */

function planDate(ms) {
  if (ms == null) return '';
  const d = new Date(ms);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

// Grace period, trial, coach at the limit: said plainly, blaming nobody.
function planNoticesHtml() {
  const eff = currentPlanEffective();
  const out = [];
  (eff.notices || []).forEach(function (n) {
    if (n.kind === 'grace') {
      out.push('Il piano ' + esc(planDisplayName(n.plan)) + ' è scaduto il ' + planDate(n.until) + '. Tutto funziona fino al ' + planDate(n.graceUntil) + ', poi torna Free. Nessun dato viene cancellato.');
    } else if (n.kind === 'coach_limit') {
      out.push('Il tuo coach ha raggiunto il limite di atleti del suo piano: il collegamento tornerà attivo appena si libera un posto. Scheda e dati restano tutti qui.');
    }
  });
  if (eff.trialActive) {
    const left = Math.max(1, Math.ceil((eff.trialUntil - Date.now()) / 86400000));
    out.push('Prova Coach: ' + left + (left === 1 ? ' giorno rimasto' : ' giorni rimasti') + '.');
  }
  return out.map(function (text) {
    return '<div class="card plan-notice" style="padding:10px 12px;margin-bottom:12px;border:1px solid #444;font-size:12px;color:#ddd;line-height:1.4;">' + text + '</div>';
  }).join('');
}

/* ------------------------------ pricing ------------------------------ */

function planIsAndroidApp() {
  try { if (typeof NativeConfig !== 'undefined') return true; } catch (_) {}
  try { return typeof isAndroidWebViewNative === 'function' && isAndroidWebViewNative(); } catch (_) { return false; }
}

function renderPlansPricing(c) {
  const reg = planFeatures();
  if (!reg) { c.innerHTML = '<div class="cp-help">Piani non disponibili.</div>'; return; }
  const eff = currentPlanEffective();
  const android = planIsAndroidApp();
  const period = { month: 'mese', year: 'anno' };
  const featuresOf = function (planId) {
    return Object.keys(reg.features).filter(function (k) { return reg.features[k].min === planId; }).map(function (k) {
      const f = reg.features[k];
      let label = f.label;
      if (f.limit && f.limit[planId] != null) label += ': ' + f.limit[planId] + (f.unit ? ' ' + f.unit : '');
      return label;
    });
  };
  const seatsLine = function (p) {
    if (!p.seats && p.seats !== null) return '';
    return p.seats === null ? 'Atleti illimitati' : ('Fino a ' + p.seats + ' atleti');
  };
  const cards = reg.plans.map(function (p) {
    const current = p.id === eff.plan;
    const price = p.prices && p.prices.length
      ? p.prices.map(function (x) { return x.amount + ' €/' + period[x.period]; }).join(' · ')
      : 'Gratis';
    const coachTier = p.id === 'coach' || p.id === 'coach_pro';
    let action = '';
    if (current) {
      action = '<div class="plan-current-label" style="font-size:11px;font-weight:900;color:var(--gold);">IL TUO PIANO' + (eff.inherited ? ' (DAL TUO COACH)' : '') + (eff.trialActive && p.id === 'coach' ? ' (PROVA)' : '') + '</div>';
    } else if (p.id !== 'free' && !(android && coachTier)) {
      // No purchase in this version: contact, never a checkout. On the Android
      // app, Coach and Pro show no purchase button at all.
      action = '<button type="button" class="btn btn-outline" style="width:100%;font-size:11px;" onclick="contactAboutPlan(\'' + p.id + '\')">CONTATTACI</button>';
    }
    const trial = p.id === 'coach' && !current && canStartCoachTrial()
      ? '<button type="button" class="btn btn-primary" style="width:100%;font-size:11px;margin-top:6px;" onclick="startCoachTrialFromApp()">PROVA COACH ' + (reg.trialDays || 14) + ' GIORNI</button>'
      : '';
    return '<div class="card plan-card' + (current ? ' plan-card-current' : '') + '" data-plan="' + p.id + '" style="padding:14px;margin-bottom:12px;border:' + (current ? '2px solid var(--gold)' : '1px solid #333') + ';">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;">' +
      '<div style="font-size:17px;font-weight:900;color:' + (current ? 'var(--gold)' : '#fff') + ';">' + esc(p.name) + '</div>' +
      '<div style="font-size:14px;font-weight:800;color:#fff;">' + esc(price) + '</div></div>' +
      '<div style="font-size:11px;color:#aaa;margin:4px 0 8px;">' + esc(p.tagline || '') + '</div>' +
      '<ul style="margin:0 0 10px 16px;padding:0;font-size:12px;color:#ddd;line-height:1.5;">' +
      (p.id !== 'free' ? '<li>Tutto quello del piano precedente</li>' : '') +
      (seatsLine(p) && p.id !== 'free' ? '<li>' + esc(seatsLine(p)) + '</li>' : '') +
      featuresOf(p.id).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') +
      '</ul>' + action + trial + '</div>';
  }).join('');
  c.innerHTML =
    '<div style="margin-bottom:12px;">' +
    '<span style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1.5px;">PIANI</span>' +
    '<h1 style="color:#fff;margin:2px 0 4px;font-size:22px;">Piani Nurvan</h1>' +
    '<p style="font-size:11px;color:#aaa;margin:0;">Nessun pagamento nell\'app in questa versione: il piano lo attiviamo noi su richiesta.</p></div>' +
    planNoticesHtml() + cards;
}
window.renderPlansPricing = renderPlansPricing;

function contactAboutPlan(planId) {
  const reg = planFeatures() || {};
  const email = String(reg.contactEmail || '').trim();
  if (email) {
    try { window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Piano ' + planDisplayName(planId)); return; } catch (_) {}
  }
  if (typeof showToast === 'function') showToast('Per attivare ' + planDisplayName(planId) + ' scrivi al supporto Nurvan: il piano lo attiviamo noi.', 'info');
}
window.contactAboutPlan = contactAboutPlan;

// The trial is for coaches, once per account; the server has the last word.
function canStartCoachTrial() {
  const a = currentAccountEntitlement();
  if (a.trialUsedAt) return false;
  if (typeof isAthleteRole === 'function' && isAthleteRole()) return false;
  return typeof isCoachUnlocked === 'function' && isCoachUnlocked();
}

async function startCoachTrialFromApp() {
  if (!canStartCoachTrial()) {
    if (typeof showToast === 'function') showToast('La prova Coach si usa una volta sola, da un account coach.', 'error');
    return;
  }
  try {
    const payload = await practiceFetch('/api/account/trial', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 15000);
    onEntitlementReceived(payload.entitlement);
    if (typeof showToast === 'function') showToast('Prova Coach attiva per 14 giorni', 'ok');
    render();
  } catch (err) {
    if (typeof showToast === 'function') showToast((err && err.message) || 'Prova non attivata', 'error');
  }
}
window.startCoachTrialFromApp = startCoachTrialFromApp;
