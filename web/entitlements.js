/*
 * Piani ed entitlement: il solo posto che dice cosa un account puo' fare.
 *
 * Le funzioni e il piano minimo di ciascuna sono in web/features.json (nella
 * pagina arriva come self.NURVAN_FEATURES, scritto dalla build in
 * web/features.js; il server lo legge dal file). Qui, senza DOM e senza stato:
 *
 *   effective(account, now)       -> il piano che vale adesso e perche'
 *   explain(account, feature, u)  -> { allowed, reason, minPlan, plan, limit }
 *   can(account, feature, u)      -> true / false
 *   seatAssignment(clients, seats)-> quali collegamenti sono attivi
 *
 * account = { plan, planSource, planUntil, seats, trialUntil, trialUsedAt,
 *             coachLink: { active, seatInactive } }
 * Regole:
 *   - plan_until scaduto: 7 giorni in cui tutto funziona con un avviso, poi free;
 *   - trial (solo coach, 14 giorni, una volta): vale almeno "coach";
 *   - atleta collegato a un coach attivo, dentro i posti del coach: vale almeno
 *     "standard"; senza collegamento torna al proprio, nessun dato toccato.
 * Lo stesso file gira nella pagina e sul server (nessun import, nessun export).
 */
(function (root) {
  'use strict';

  var DAY_MS = 86400000;
  var FALLBACK = {
    graceDays: 7,
    trialDays: 14,
    trialPlan: 'coach',
    inheritedPlan: 'standard',
    plans: [{ id: 'free', seats: 0 }, { id: 'standard', seats: 3 }, { id: 'coach', seats: 20 }, { id: 'coach_pro', seats: null }],
    features: {}
  };

  function registry(features) {
    return features || root.NURVAN_FEATURES || FALLBACK;
  }
  function planIds(reg) {
    return reg.plans.map(function (p) { return p.id; });
  }
  function rank(plan, reg) {
    return planIds(reg || registry()).indexOf(plan);
  }
  function normalizePlan(plan, reg) {
    var p = String(plan || '').toLowerCase().trim();
    return rank(p, reg) >= 0 ? p : 'free';
  }
  function maxPlan(a, b, reg) {
    return rank(a, reg) >= rank(b, reg) ? a : b;
  }
  function planInfo(plan, reg) {
    reg = registry(reg);
    for (var i = 0; i < reg.plans.length; i++) if (reg.plans[i].id === plan) return reg.plans[i];
    return reg.plans[0];
  }
  function time(v) {
    if (v === null || v === undefined || v === '') return null;
    var t = typeof v === 'number' ? v : new Date(v).getTime();
    return isFinite(t) ? t : null;
  }

  /**
   * effective(account, now) -> {
   *   plan,          what counts now (inheritance and trial included)
   *   ownPlan,       the account's own plan after expiry and trial
   *   assignedPlan,  what the server says, before expiry
   *   status,        'active' | 'grace' | 'expired'
   *   graceUntil, trialActive, trialUntil, inherited, seats, notices[]
   * }
   */
  function effective(account, now, features) {
    var reg = registry(features);
    var a = account || {};
    now = now == null ? Date.now() : now;
    var assigned = normalizePlan(a.plan, reg);
    var own = assigned;
    var status = 'active';
    var notices = [];
    var until = time(a.planUntil);
    var graceUntil = null;
    if (until != null && assigned !== 'free' && now > until) {
      graceUntil = until + (reg.graceDays || 7) * DAY_MS;
      if (now <= graceUntil) {
        status = 'grace';
        notices.push({ kind: 'grace', plan: assigned, until: until, graceUntil: graceUntil });
      } else {
        status = 'expired';
        own = 'free';
      }
    }
    var trialUntil = time(a.trialUntil);
    var trialActive = trialUntil != null && now < trialUntil;
    if (trialActive) own = maxPlan(own, reg.trialPlan || 'coach', reg);

    var plan = own;
    var inherited = false;
    var link = a.coachLink || null;
    if (link && link.active) {
      if (link.seatInactive) {
        notices.push({ kind: 'coach_limit' });
      } else {
        var inh = reg.inheritedPlan || 'standard';
        if (rank(inh, reg) > rank(own, reg)) { plan = inh; inherited = true; }
      }
    }

    // Seats follow the account's own plan (a coach's), never the inherited
    // one. An override from the administrator holds while that plan holds.
    var seats;
    var override = a.seats !== null && a.seats !== undefined && a.seats !== '' && isFinite(Number(a.seats));
    if (override && own === assigned && status !== 'expired') {
      seats = Number(a.seats) < 0 ? Infinity : Number(a.seats);
    } else {
      var def = planInfo(own, reg).seats;
      seats = def === null || def === undefined ? Infinity : def;
    }

    return {
      plan: plan,
      ownPlan: own,
      assignedPlan: assigned,
      status: status,
      graceUntil: graceUntil,
      trialActive: trialActive,
      trialUntil: trialUntil,
      inherited: inherited,
      seats: seats,
      notices: notices
    };
  }

  function limitFor(feature, plan) {
    if (!feature || !feature.limit) return null;
    var v = feature.limit[plan];
    return v === null || v === undefined ? null : Number(v);
  }
  // The cheapest plan that allows `count` more uses of a counted feature.
  function planForCount(def, count, reg, seatsMode) {
    var ids = planIds(reg);
    for (var i = 0; i < ids.length; i++) {
      if (rank(ids[i], reg) < rank(def.min, reg)) continue;
      var lim = seatsMode ? planInfo(ids[i], reg).seats : limitFor(def, ids[i]);
      if (lim === null || lim === undefined || count < lim) return ids[i];
    }
    return null;
  }

  /**
   * explain(account, feature, usage) -> { allowed, reason, minPlan, plan, limit, used }
   * usage: { count } for counted features (imports this month, athletes...).
   * reason: 'ok' | 'plan' (the plan is below the minimum) | 'limit' | 'unknown'.
   */
  function explain(account, featureId, usage, opts) {
    opts = opts || {};
    var reg = registry(opts.features);
    var def = reg.features[featureId];
    var eff = opts.effective || effective(account, opts.now, opts.features);
    if (!def) return { allowed: false, reason: 'unknown', minPlan: null, plan: eff.plan, limit: null, used: null };
    if (rank(eff.plan, reg) < rank(def.min, reg)) {
      return { allowed: false, reason: 'plan', minPlan: def.min, plan: eff.plan, limit: null, used: null, label: def.label };
    }
    var count = usage && usage.count != null ? Number(usage.count) : null;
    var limit = def.seats ? eff.seats : limitFor(def, eff.plan);
    if (limit === Infinity) limit = null;
    if (count != null && limit != null && count >= limit) {
      return { allowed: false, reason: 'limit', minPlan: planForCount(def, count, reg, !!def.seats), plan: eff.plan, limit: limit, used: count, label: def.label };
    }
    return { allowed: true, reason: 'ok', minPlan: def.min, plan: eff.plan, limit: limit, used: count, label: def.label };
  }

  function can(account, featureId, usage, opts) {
    return explain(account, featureId, usage, opts).allowed;
  }

  // Days of history the account sees; null = all of it.
  function historyDays(account, opts) {
    opts = opts || {};
    var reg = registry(opts.features);
    if (can(account, 'history_full', null, opts)) return null;
    var def = reg.features.history;
    var eff = opts.effective || effective(account, opts.now, opts.features);
    var d = def && def.days ? def.days[eff.plan] : 90;
    return d === null || d === undefined ? null : Number(d);
  }

  /**
   * seatAssignment(clients, seats) -> { active: [ids], inactive: [ids] }
   * The oldest links keep their seats; the most recent ones wait. Only active
   * links count; nothing is removed.
   */
  function seatAssignment(clients, seats) {
    var list = (clients || []).filter(function (c) { return c && (c.status == null || c.status === 'active'); }).slice();
    list.sort(function (x, y) {
      var tx = time(x.createdAt) || 0;
      var ty = time(y.createdAt) || 0;
      if (tx !== ty) return tx - ty;
      return Number(x.id) - Number(y.id);
    });
    var n = seats === null || seats === undefined || seats === Infinity ? list.length : Math.max(0, Number(seats) || 0);
    return {
      active: list.slice(0, n).map(function (c) { return String(c.id); }),
      inactive: list.slice(n).map(function (c) { return String(c.id); })
    };
  }

  function planName(plan, reg) {
    return planInfo(normalizePlan(plan, registry(reg)), reg).name || plan;
  }

  root.NurvanEntitlements = {
    DAY_MS: DAY_MS,
    rank: rank,
    normalizePlan: normalizePlan,
    planName: planName,
    planInfo: planInfo,
    effective: effective,
    explain: explain,
    can: can,
    historyDays: historyDays,
    seatAssignment: seatAssignment
  };
})(typeof self !== 'undefined' ? self : globalThis);
