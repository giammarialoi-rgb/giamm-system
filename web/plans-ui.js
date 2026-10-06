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
// A client link remembers its own plan: the one cache used to be shared, so a
// client session overwrote the plan of the personal account on this browser
// and cleared it on logout.
function planEntitlementKey() {
  try { if (typeof isClientStorageContext === 'function' && isClientStorageContext()) return 'nurvan.entitlement.client.v1'; } catch (_) {}
  return PLAN_ENTITLEMENT_KEY;
}

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
    const raw = localStorage.getItem(planEntitlementKey());
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
  // Compared without `at`: the server stamps every answer with the time, and
  // that alone used to count as a change of plan and redraw the page each
  // time the account was read.
  const same = function (e) { return JSON.stringify(Object.assign({}, e || {}, { at: null })); };
  const before = same(window.__nurvanEntitlement);
  window.__nurvanEntitlement = keep;
  try { localStorage.setItem(planEntitlementKey(), JSON.stringify(keep)); } catch (_) {}
  if (before !== same(keep) && typeof render === 'function') {
    try { render(); } catch (_) {}
  }
}
window.onEntitlementReceived = onEntitlementReceived;

function clearAccountEntitlement() {
  window.__nurvanEntitlement = null;
  try { localStorage.removeItem(planEntitlementKey()); } catch (_) {}
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

// "1 programmi" reads as a mistake: the singular for the units the plans count.
function planUnitFor(n, unit) {
  const one = { programmi: 'programma', atleti: 'atleta', 'import al mese': 'import al mese' };
  return Number(n) === 1 && one[unit] ? one[unit] : unit;
}
// The sentence the athlete or coach reads when something is closed.
function planLockMessage(why) {
  if (!why || why.allowed) return '';
  if (why.reason === 'limit') {
    const unit = ((planFeatures() || {}).features || {})[why.feature || ''] || {};
    return 'Hai raggiunto il limite del piano ' + planDisplayName(why.plan) + ' (' + why.limit + (unit.unit ? ' ' + planUnitFor(why.limit, unit.unit) : '') + ')' +
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

/* ------------------------------ buying in the app ------------------------------ */
//
// Plans are bought through the store of the phone: Apple on iPhone, Google Play on Android. RevenueCat
// reads the store and tells the server (server/billing/index.mjs), which changes the account's plan. The
// page never sees a card: it asks the store for the prices, starts the purchase, then asks the server to
// look again. On the web (a browser) there is no store: the plans page keeps "Contattaci".
//
// The person in RevenueCat is the Nurvan account (its id), so the same plan follows the account to any
// device, and a plan bought on the website (Stripe) is the same plan.
var __billing = { state: 'idle', packs: [], adapter: null, cfg: null, busy: false };
window.__billing = __billing; // read by the store-screenshot tool (tools/store/make_screenshots.mjs)

function billingPlatform() {
  try { if (typeof isIosApp === 'function' && isIosApp()) return 'ios'; } catch (_) {}
  try { if (typeof NativeConfig !== 'undefined') return 'android'; } catch (_) {}
  return 'web';
}
function billingIsNative() { return billingPlatform() !== 'web'; }

// Android: the app's Java side answers through window.__nvBillingResult(id, json).
function billingAndroidCall(method, args) {
  window.__nvBillingCb = window.__nvBillingCb || {};
  window.__nvBillingSeq = (window.__nvBillingSeq || 0) + 1;
  const id = String(window.__nvBillingSeq);
  window.__nvBillingResult = window.__nvBillingResult || function (cbId, json) {
    const cb = window.__nvBillingCb[cbId];
    if (!cb) return;
    delete window.__nvBillingCb[cbId];
    clearTimeout(cb.timer);
    let r = null;
    try { r = JSON.parse(json); } catch (_) { r = { ok: false, error: 'risposta non valida' }; }
    if (r && r.ok) cb.resolve(r.data);
    else cb.reject(Object.assign(new Error((r && r.error) || 'Operazione non riuscita'), { userCancelled: !!(r && r.cancelled) }));
  };
  return new Promise(function (resolve, reject) {
    const timer = setTimeout(function () { delete window.__nvBillingCb[id]; reject(new Error('Il negozio non risponde. Riprova.')); }, 120000);
    window.__nvBillingCb[id] = { resolve: resolve, reject: reject, timer: timer };
    try { NativeConfig[method].apply(NativeConfig, (args || []).concat([id])); } catch (err) { clearTimeout(timer); delete window.__nvBillingCb[id]; reject(err); }
  });
}

// What the plans page needs from the store, the same on both phones:
//   configure(key, userId), offerings(products) -> [{ plan, productId, packageId, priceString, period }],
//   purchase(productId), restore()
function billingAdapter() {
  if (__billing.adapter) return __billing.adapter;
  const platform = billingPlatform();
  const planOf = function (products, productId) {
    const id = String(productId || '').split(':')[0];
    const plans = Object.keys(products || {});
    for (let i = 0; i < plans.length; i++) { if ((products[plans[i]] || []).indexOf(id) >= 0) return plans[i]; }
    return '';
  };
  if (platform === 'ios') {
    // The plugin as the native bridge hands it over (Capacitor.Plugins, like the other iOS plugins of the page),
    // or registered by name when the bridge offers registerPlugin.
    let P = null;
    try { P = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases) || null; } catch (_) { P = null; }
    if (!P) { try { P = (window.Capacitor && typeof window.Capacitor.registerPlugin === 'function') ? window.Capacitor.registerPlugin('Purchases') : null; } catch (_) { P = null; } }
    if (!P) return null;
    const pkgs = {};
    let configured = false, lastUser = null;
    __billing.adapter = {
      configure: async function (key, userId) {
        if (!configured) { await P.configure({ apiKey: key, appUserID: String(userId) }); configured = true; lastUser = String(userId); }
        else if (lastUser !== String(userId)) { await P.logIn({ appUserID: String(userId) }); lastUser = String(userId); }
      },
      offerings: async function (products) {
        const o = await P.getOfferings();
        const off = (o && (o.current || (o.offerings && o.offerings.current))) || null;
        const list = (off && off.availablePackages) || [];
        return list.map(function (pk) {
          const prod = pk.product || {};
          const productId = String(prod.identifier || '').split(':')[0];
          pkgs[productId] = pk;
          const iso = String(prod.subscriptionPeriod || '');
          const period = /^P1Y$/i.test(iso) || pk.packageType === 'ANNUAL' ? 'year' : (/^P1M$/i.test(iso) || pk.packageType === 'MONTHLY' ? 'month' : '');
          return { plan: planOf(products, productId), productId: productId, packageId: pk.identifier, priceString: prod.priceString || '', period: period };
        }).filter(function (x) { return x.plan; });
      },
      purchase: async function (productId) {
        const pk = pkgs[productId];
        if (!pk) throw new Error('Prodotto non disponibile.');
        return P.purchasePackage({ aPackage: pk });
      },
      restore: async function () { return P.restorePurchases(); }
    };
    return __billing.adapter;
  }
  if (platform === 'android' && typeof NativeConfig !== 'undefined' && typeof NativeConfig.purchasesConfigure === 'function') {
    __billing.adapter = {
      configure: function (key, userId) { return billingAndroidCall('purchasesConfigure', [key, String(userId)]); },
      offerings: async function (products) {
        const list = await billingAndroidCall('purchasesOfferings', []);
        return (list || []).map(function (x) { return Object.assign({}, x, { plan: planOf(products, x.productId) }); }).filter(function (x) { return x.plan; });
      },
      purchase: function (productId) { return billingAndroidCall('purchasesBuy', [String(productId)]); },
      restore: function () { return billingAndroidCall('purchasesRestore', []); }
    };
    return __billing.adapter;
  }
  return null;
}

async function billingConfig() {
  if (__billing.cfg) return __billing.cfg;
  const cfg = await practiceFetch('/api/billing/config', { method: 'GET', headers: practiceHeaders(false) }, 15000);
  __billing.cfg = cfg || {};
  return __billing.cfg;
}

// What the person reads when the store does not answer or a purchase fails: never the technical message (it goes to the
// console), always something they can act on.
function billingFriendlyError(err, fallback) {
  const raw = String((err && err.message) || err || '');
  try { console.warn('[billing]', raw); } catch (_) {}
  if (/network|internet|offline|connession|timeout|non risponde|fetch/i.test(raw)) return 'Connessione assente o lenta: controlla la rete e riprova.';
  if (/pending|ask to buy|in attesa/i.test(raw)) return 'L’acquisto è in attesa di approvazione. Appena confermato, il piano si attiva.';
  if (/not allowed|disabled|restricted|non consentit/i.test(raw)) return 'Gli acquisti non sono consentiti su questo dispositivo (controlla le restrizioni di Tempo di utilizzo).';
  return fallback;
}

function billingRedraw() {
  try { if (typeof currentView !== 'undefined' && currentView === 'pricing' && typeof render === 'function') render(); } catch (_) {}
}

// Asks the store for the prices (once; again if it failed).
async function billingLoad(force) {
  if (!billingIsNative()) return;
  if (__billing.state === 'loading') return;
  if (!force && (__billing.state === 'ready' || __billing.state === 'unavailable')) return;
  const user = String((typeof store !== 'undefined' && store && store.accountUser && store.accountUser.id) || '');
  if (!user) { __billing.state = 'login'; return; }
  __billing.state = 'loading';
  try {
    const cfg = await billingConfig();
    const key = billingPlatform() === 'ios' ? cfg.appleKey : cfg.googleKey;
    const adapter = billingAdapter();
    if (!cfg.enabled) throw new Error('acquisti non configurati sul server');
    if (!key) throw new Error('chiave dello store mancante');
    if (!adapter) throw new Error('componente acquisti non trovato nell’app');
    await adapter.configure(key, user);
    __billing.packs = await adapter.offerings(cfg.products || {});
    __billing.state = __billing.packs.length ? 'ready' : 'unavailable';
  } catch (err) {
    __billing.state = 'unavailable';
    __billing.error = String((err && err.message) || err || '');
    try { console.warn('[billing] store not ready:', __billing.error); } catch (_) {}
  }
  billingRedraw();
}

// The plan on the server is the one that counts: after a purchase or a restore, ask it to look again.
async function billingSyncPlan() {
  try { await practiceFetch('/api/billing/refresh', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 25000); } catch (_) {}
  try {
    const payload = await practiceFetch('/api/account/plan', { method: 'GET', headers: practiceHeaders(false) }, 15000);
    if (payload && payload.entitlement) onEntitlementReceived(payload.entitlement);
  } catch (_) {}
}

function billingCancelled(err) {
  return !!(err && (err.userCancelled === true || /cancel|annull/i.test(String(err.message || ''))));
}

async function billingBuy(productId) {
  if (__billing.busy) return;
  if (!store.accountToken) { if (typeof openAccount === 'function') openAccount(); return; }
  const adapter = billingAdapter();
  if (!adapter || __billing.state !== 'ready') { if (typeof showToast === 'function') showToast('Gli acquisti non sono disponibili in questo momento.', 'error'); return; }
  __billing.busy = true;
  billingRedraw();
  try {
    await adapter.purchase(productId);
    await billingSyncPlan();
    if (typeof showToast === 'function') showToast('Abbonamento attivo. Grazie!', 'ok');
  } catch (err) {
    if (!billingCancelled(err) && typeof showToast === 'function') showToast(billingFriendlyError(err, 'Acquisto non riuscito. Riprova tra poco.'), 'error');
  } finally {
    __billing.busy = false;
    billingRedraw();
  }
}
window.billingBuy = billingBuy;

async function billingRestore() {
  if (__billing.busy) return;
  if (!store.accountToken) { if (typeof openAccount === 'function') openAccount(); return; }
  const adapter = billingAdapter();
  if (!adapter || __billing.state !== 'ready') { if (typeof showToast === 'function') showToast('Gli acquisti non sono disponibili in questo momento.', 'error'); return; }
  __billing.busy = true;
  billingRedraw();
  try {
    await adapter.restore();
    const before = currentPlanEffective().plan;
    await billingSyncPlan();
    const after = currentPlanEffective().plan;
    if (typeof showToast === 'function') {
      if (after !== 'free' || before !== after) showToast('Acquisti ripristinati', 'ok');
      else showToast('Nessun acquisto da ripristinare', 'info');
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast(billingFriendlyError(err, 'Ripristino non riuscito. Riprova tra poco.'), 'error');
  } finally {
    __billing.busy = false;
    billingRedraw();
  }
}
window.billingRestore = billingRestore;

// Opens the store's own page where a subscription is cancelled or changed.
function billingManage() {
  const url = billingPlatform() === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions?package=com.nurvan.app';
  try { window.open(url, '_blank'); } catch (_) { try { window.location.href = url; } catch (__) {} }
}
window.billingManage = billingManage;
window.billingLoad = billingLoad;

const BILLING_PERIOD_LABEL = { month: 'mese', year: 'anno' };

// The buttons of one plan: what the store charges, as the store says it.
function billingButtonsHtml(planId) {
  if (!billingIsNative()) return '';
  if (typeof isAthleteRole === 'function' && isAthleteRole()) return '';
  const st = __billing.state;
  if (st === 'login') return '<button type="button" class="btn btn-primary" style="width:100%;font-size:11px;" onclick="openAccount()">ACCEDI PER ABBONARTI</button>';
  if (st === 'loading' || st === 'idle') return '<div class="plan-store-note" style="font-size:11px;color:#888;">Carico i prezzi dallo store…</div>';
  if (st !== 'ready') return '<div class="plan-store-note" style="font-size:11px;color:#aaa;line-height:1.45;"><div>Non riusciamo a caricare i piani dallo store in questo momento. Controlla la connessione e riprova.</div><button type="button" class="btn btn-outline" style="width:100%;font-size:11px;margin-top:8px;" onclick="billingLoad(true)">RIPROVA</button></div>';
  const mine = __billing.packs.filter(function (x) { return x.plan === planId; });
  if (!mine.length) return '';
  const off = __billing.busy ? ' disabled' : '';
  return mine.map(function (x, i) {
    return '<button type="button" class="btn ' + (i === 0 ? 'btn-primary' : 'btn-outline') + '" style="width:100%;font-size:11px;margin-top:' + (i ? 6 : 0) + 'px;"' + off +
      ' onclick="billingBuy(\'' + esc(x.productId) + '\')"><span>ABBONATI</span> · ' + esc(x.priceString) + (x.period ? ' / <span>' + esc(BILLING_PERIOD_LABEL[x.period] || x.period) + '</span>' : '') + '</button>';
  }).join('');
}

// The price line of a plan card: the store's, when it is known.
function billingPriceLine(planId) {
  const mine = (__billing.packs || []).filter(function (x) { return x.plan === planId; });
  if (!mine.length) return '';
  return mine.map(function (x) { return x.priceString + (x.period ? ' / ' + (BILLING_PERIOD_LABEL[x.period] || x.period) : ''); }).join(' · ');
}
// The same line as markup, the period in a piece of its own (so it is translated).
function billingPriceLineHtml(planId) {
  const mine = (__billing.packs || []).filter(function (x) { return x.plan === planId; });
  return mine.map(function (x) { return esc(x.priceString) + (x.period ? ' / <span>' + esc(BILLING_PERIOD_LABEL[x.period] || x.period) + '</span>' : ''); }).join(' · ');
}

// What the stores require next to a subscription: renewal, cancellation, the terms, restore.
function billingFooterHtml() {
  if (!billingIsNative()) return '';
  const ios = billingPlatform() === 'ios';
  const reg = planFeatures() || {};
  const lg = (typeof legalLinkHtml === 'function') ? legalLinkHtml : function (k, l) { return esc(l); };
  const where = ios ? 'Il pagamento viene addebitato sull’account Apple al momento della conferma dell’acquisto.' : 'Il pagamento viene addebitato sull’account Google Play al momento della conferma dell’acquisto.';
  const manage = ios ? 'Puoi gestire o annullare l’abbonamento in qualsiasi momento da Impostazioni › il tuo nome › Abbonamenti.' : 'Puoi gestire o annullare l’abbonamento in qualsiasi momento da Google Play › Pagamenti e abbonamenti › Abbonamenti.';
  return '<div class="card plan-billing-footer" style="padding:12px;margin-top:4px;border:1px solid #333;">' +
    '<div style="font-size:11px;color:#aaa;line-height:1.5;"><span>' + where + '</span> <span>L’abbonamento si rinnova automaticamente alle stesse condizioni, a meno che non venga annullato almeno 24 ore prima della fine del periodo in corso.</span> <span>' + manage + '</span></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">' +
    '<button type="button" class="btn btn-outline" style="flex:1;min-width:130px;font-size:10px;padding:8px;" onclick="billingRestore()">RIPRISTINA ACQUISTI</button>' +
    '<button type="button" class="btn btn-outline" style="flex:1;min-width:130px;font-size:10px;padding:8px;" onclick="billingManage()">GESTISCI ABBONAMENTO</button></div>' +
    '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11px;margin-top:10px;">' + lg('privacy', 'Informativa privacy') + lg('termini', 'Termini di servizio') + '</div>' +
    (reg.contactEmail ? '<div style="font-size:10px;color:#777;margin-top:8px;"><span>Assistenza:</span> ' + esc(reg.contactEmail) + '</div>' : '') +
    '</div>';
}

/* ------------------------------ buying on the website ------------------------------ */
//
// In a browser (not in the apps) the plans are bought with Stripe: the button asks the server for a Checkout
// session and goes to Stripe's page; Stripe tells the server, which changes the plan (server/billing/stripe.mjs).
// The free month is announced only here, never in the apps (the stores' rules). Until Stripe is set up on the
// server the page keeps "Contattaci".
var __stripe = { cfg: null, status: null, loading: false, busy: false };

async function webStripeLoad(force) {
  if (billingIsNative() || __stripe.loading) return;
  if (!force && __stripe.cfg) return;
  if (typeof practiceFetch !== 'function') return;
  __stripe.loading = true;
  try {
    const cfg = await practiceFetch('/api/billing/config', { method: 'GET', headers: practiceHeaders(false) }, 15000);
    __stripe.cfg = { enabled: !!(cfg && cfg.stripe) };
    if (__stripe.cfg.enabled && store && store.accountToken) {
      __stripe.status = await practiceFetch('/api/billing/stripe/status', { method: 'GET', headers: practiceHeaders(false) }, 15000);
    }
  } catch (_) {
    __stripe.cfg = __stripe.cfg || { enabled: false };
  } finally {
    __stripe.loading = false;
  }
  billingRedraw();
}
function webStripeOn() { return !!(__stripe.cfg && __stripe.cfg.enabled); }

async function webStripeBuy(productId) {
  if (__stripe.busy) return;
  if (!store.accountToken) { if (typeof openAccount === 'function') openAccount(); return; }
  __stripe.busy = true;
  billingRedraw();
  try {
    const out = await practiceFetch('/api/billing/stripe/checkout', { method: 'POST', headers: practiceHeaders(true), body: JSON.stringify({ productId: productId }) }, 25000);
    if (!out || !out.url) throw new Error('Pagamento non disponibile ora.');
    window.location.href = out.url;
    return;
  } catch (err) {
    if (typeof showToast === 'function') showToast((err && err.message) || 'Pagamento non avviato', 'error');
  }
  __stripe.busy = false;
  billingRedraw();
}
window.webStripeBuy = webStripeBuy;

async function webStripePortal() {
  if (__stripe.busy) return;
  if (!store.accountToken) { if (typeof openAccount === 'function') openAccount(); return; }
  __stripe.busy = true;
  billingRedraw();
  try {
    const out = await practiceFetch('/api/billing/stripe/portal', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 25000);
    if (!out || !out.url) throw new Error('Portale non disponibile ora.');
    window.location.href = out.url;
    return;
  } catch (err) {
    if (typeof showToast === 'function') showToast((err && err.message) || 'Portale non aperto', 'error');
  }
  __stripe.busy = false;
  billingRedraw();
}
window.webStripePortal = webStripePortal;

// The buttons of one plan in a browser: a price per period, each to Stripe's page.
function webStripeButtonsHtml(plan) {
  if (typeof isAthleteRole === 'function' && isAthleteRole()) return '';
  if (!store || !store.accountToken) return '<button type="button" class="btn btn-primary" style="width:100%;font-size:11px;" onclick="openAccount()">ACCEDI PER ABBONARTI</button>';
  const off = __stripe.busy ? ' disabled' : '';
  const trial = __stripe.status && __stripe.status.trialEligible;
  const lines = (plan.prices || []).map(function (x, i) {
    const productId = ['nurvan', plan.id, x.period].join('.');
    return '<button type="button" class="btn ' + (i === 0 ? 'btn-primary' : 'btn-outline') + '" style="width:100%;font-size:11px;margin-top:' + (i ? 6 : 0) + 'px;"' + off +
      ' onclick="webStripeBuy(\'' + esc(productId) + '\')"><span>ABBONATI</span> · ' + esc(String(x.amount)) + ' € / <span>' + esc(BILLING_PERIOD_LABEL[x.period] || x.period) + '</span></button>';
  }).join('');
  return lines + (trial && lines ? '<div style="font-size:10px;color:var(--gold);margin-top:6px;font-weight:800;"><span>Il primo mese è gratis</span></div>' : '');
}

// Back from Stripe's page: say so, and read the plan again (the webhook can be a moment late).
async function webStripeReturn(result) {
  if (result !== 'success') { if (typeof showToast === 'function') showToast('Pagamento annullato: non ti è stato addebitato nulla.', 'info'); return; }
  if (typeof navigate === 'function') navigate('pricing');
  try { await practiceFetch('/api/billing/stripe/sync', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 25000); } catch (_) {}
  try {
    const payload = await practiceFetch('/api/account/plan', { method: 'GET', headers: practiceHeaders(false) }, 15000);
    if (payload && payload.entitlement) onEntitlementReceived(payload.entitlement);
  } catch (_) {}
  if (typeof showToast === 'function') showToast('Abbonamento attivo. Grazie!', 'ok');
  billingRedraw();
}
(function webStripeBoot() {
  try {
    if (typeof window === 'undefined' || !window.location || typeof URLSearchParams === 'undefined') return;
    const q = new URLSearchParams(window.location.search || '');
    const r = q.get('checkout');
    if (r !== 'success' && r !== 'cancel') return;
    try { q.delete('checkout'); history.replaceState(null, '', window.location.pathname + (q.toString() ? '?' + q.toString() : '') + (window.location.hash || '')); } catch (_) {}
    let tries = 0;
    const wait = setInterval(function () {
      tries++;
      if ((typeof store !== 'undefined' && store && store.accountToken) || tries > 40) { clearInterval(wait); if (tries <= 40) webStripeReturn(r); }
    }, 500);
  } catch (_) {}
})();

function webStripeFooterHtml(on) {
  if (!on) return '';
  const reg = planFeatures() || {};
  const lg = (typeof legalLinkHtml === 'function') ? legalLinkHtml : function (k, l) { return esc(l); };
  const mine = currentAccountEntitlement() || {};
  const manage = ((__stripe.status && __stripe.status.hasCustomer) || mine.planSource === 'stripe')
    ? '<button type="button" class="btn btn-outline" style="width:100%;font-size:11px;margin-top:10px;" onclick="webStripePortal()">GESTISCI ABBONAMENTO</button>' : '';
  return '<div class="card plan-billing-footer" style="padding:12px;margin-top:4px;border:1px solid #333;">' +
    '<div style="font-size:11px;color:#aaa;line-height:1.5;"><span>L’abbonamento si rinnova automaticamente alla fine di ogni periodo, finché non lo annulli. Puoi annullarlo o cambiare piano in qualsiasi momento dal portale: resta attivo fino alla fine del periodo pagato.</span> <span>Il pagamento è gestito da Stripe: Nurvan non vede mai i dati della tua carta.</span></div>' +
    manage +
    '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11px;margin-top:10px;">' + lg('privacy', 'Informativa privacy') + lg('termini', 'Termini di servizio') + '</div>' +
    (reg.contactEmail ? '<div style="font-size:10px;color:#777;margin-top:8px;"><span>Assistenza:</span> ' + esc(reg.contactEmail) + '</div>' : '') +
    '</div>';
}

function renderPlansPricing(c) {
  const reg = planFeatures();
  if (!reg) { c.innerHTML = '<div class="cp-help">Piani non disponibili.</div>'; return; }
  const eff = currentPlanEffective();
  const native = billingIsNative();
  if (native) billingLoad(); else webStripeLoad();
  const webPay = !native && webStripeOn();
  const period = { month: 'mese', year: 'anno' };
  const featuresOf = function (planId) {
    return Object.keys(reg.features).filter(function (k) { return reg.features[k].min === planId; }).map(function (k) {
      const f = reg.features[k];
      let label = f.label;
      if (f.limit && f.limit[planId] != null) label += ': ' + f.limit[planId] + (f.unit ? ' ' + planUnitFor(f.limit[planId], f.unit) : '');
      return label;
    });
  };
  const seatsLine = function (p) {
    if (!p.seats && p.seats !== null) return '';
    return p.seats === null ? 'Atleti illimitati' : ('Fino a ' + p.seats + ' atleti');
  };
  const cards = reg.plans.map(function (p) {
    const current = p.id === eff.plan;
    // On a phone the price is the store's (local currency, taxes included), never ours.
    const price = p.id === 'free' ? 'Gratis'
      : (native ? billingPriceLine(p.id) : (p.prices && p.prices.length
        ? p.prices.map(function (x) { return x.amount + ' €/' + period[x.period]; }).join(' · ')
        : 'Gratis'));
    const coachTier = p.id === 'coach' || p.id === 'coach_pro';
    let action = '';
    if (current) {
      action = '<div class="plan-current-label" style="font-size:11px;font-weight:900;color:var(--gold);">IL TUO PIANO' + (eff.inherited ? ' (DAL TUO COACH)' : '') + (eff.trialActive && p.id === 'coach' ? ' (PROVA)' : '') + '</div>';
    } else if (p.id !== 'free') {
      // In the apps: the store's own purchase. In a browser there is no store: contact.
      action = native
        ? billingButtonsHtml(p.id)
        : (webPay ? webStripeButtonsHtml(p) : '<button type="button" class="btn btn-outline" style="width:100%;font-size:11px;" onclick="contactAboutPlan(\'' + p.id + '\')">CONTATTACI</button>');
    }
    const trial = p.id === 'coach' && !current && canStartCoachTrial()
      ? '<button type="button" class="btn btn-primary" style="width:100%;font-size:11px;margin-top:6px;" onclick="startCoachTrialFromApp()">ATTIVA ' + (reg.trialDays || 14) + ' GIORNI DI COACH</button><div class="plan-trial-note" style="font-size:10px;color:#999;margin-top:4px;">Nessun addebito e nessun rinnovo automatico: alla fine torni al tuo piano.</div>'
      : '';
    return '<div class="card plan-card' + (current ? ' plan-card-current' : '') + '" data-plan="' + p.id + '" style="padding:14px;margin-bottom:12px;border:' + (current ? '2px solid var(--gold)' : '1px solid #333') + ';">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;">' +
      '<div style="font-size:17px;font-weight:900;color:' + (current ? 'var(--gold)' : '#fff') + ';">' + esc(p.name) + '</div>' +
      '<div style="font-size:14px;font-weight:800;color:#fff;">' + ((native && p.id !== 'free') ? billingPriceLineHtml(p.id) : esc(price)) + '</div></div>' +
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
    (native
      ? '<p style="font-size:11px;color:#aaa;margin:0;">Gli abbonamenti si acquistano e si gestiscono dallo store del tuo telefono.</p></div>'
      : (webPay
        ? '<p style="font-size:11px;color:#aaa;margin:0;">Paghi con carta su una pagina sicura di Stripe e annulli quando vuoi.</p></div>'
        : '<p style="font-size:11px;color:#aaa;margin:0;">Per attivare un piano scrivici: lo attiviamo noi su richiesta.</p></div>')) +
    planNoticesHtml() + cards + billingFooterHtml() + webStripeFooterHtml(webPay);
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
  return !!(typeof store !== 'undefined' && store && store.accountToken);
}

async function startCoachTrialFromApp() {
  if (!canStartCoachTrial()) {
    if (typeof showToast === 'function') showToast('La prova Coach si usa una volta sola, da un account personale (non da un atleta).', 'error');
    return;
  }
  try {
    const payload = await practiceFetch('/api/account/trial', { method: 'POST', headers: practiceHeaders(true), body: '{}' }, 15000);
    onEntitlementReceived(payload.entitlement);
    if (typeof showToast === 'function') showToast('Prova Coach attiva per 14 giorni', 'ok');
    render();
    // The trial is a plan: Coach mode can be opened now.
    try { if (typeof unlockCoachFromPlan === 'function' && !(typeof isCoachUnlocked === 'function' && isCoachUnlocked())) await unlockCoachFromPlan(); } catch (_) {}
  } catch (err) {
    if (typeof showToast === 'function') showToast((err && err.message) || 'Prova non attivata', 'error');
  }
}
window.startCoachTrialFromApp = startCoachTrialFromApp;
