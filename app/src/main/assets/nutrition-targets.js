/*
 * Target nutrizionale e somme dei pasti.
 *
 * L'app propone, chi segue l'atleta decide. Qui:
 *   - il target proposto: Mifflin-St Jeor x fattore di attivita' x obiettivo,
 *     proteine per chilo, grassi al 25 % delle kcal, carboidrati il resto;
 *   - quale target vale: prescritto (coach o nutrizionista) > impostato
 *     dall'atleta > target del piano > proposto. Se c'e' un prescritto il
 *     proposto non esce di qui;
 *   - le somme di un pasto o di una giornata, per grammi dai valori per 100 g;
 *     un alimento senza valori rende la somma parziale, non zero;
 *   - lo scostamento, senza giudizio: un numero e un tono (neutro entro il 5 %,
 *     ambra oltre);
 *   - la media degli ultimi 7 giorni di diario per il coach, con i giorni senza
 *     diario contati a parte.
 * Nessun DOM, nessuno stato: le funzioni ricevono cio' che serve.
 */
(function (root) {
  'use strict';

  // Five steps of activity.
  var ACTIVITY = [
    { level: 1, factor: 1.2, label: 'Sedentario', hint: 'lavoro seduto, poco movimento' },
    { level: 2, factor: 1.375, label: 'Leggero', hint: '1-3 allenamenti a settimana' },
    { level: 3, factor: 1.55, label: 'Moderato', hint: '3-5 allenamenti a settimana' },
    { level: 4, factor: 1.725, label: 'Intenso', hint: '6-7 allenamenti a settimana' },
    { level: 5, factor: 1.9, label: 'Molto intenso', hint: 'lavoro fisico e allenamento ogni giorno' }
  ];
  // Goal and pace -> share of maintenance.
  var GOALS = {
    loss: { slow: -0.10, moderate: -0.20 },
    maintain: { slow: 0, moderate: 0 },
    gain: { slow: 0.05, moderate: 0.10 }
  };
  var PROTEIN_PER_KG = { loss: 2.2, maintain: 1.8, gain: 1.8 };
  var FAT_SHARE = 0.25;
  var FIBER_PER_1000_KCAL = 14;
  var TOLERANCE = 0.05;
  var DISCLAIMER = 'Stima indicativa. Se hai una condizione clinica, fai riferimento al tuo medico o nutrizionista.';
  var KEYS = ['kcal', 'pro', 'carb', 'fat'];

  function round10(n) { return Math.round(n / 10) * 10; }
  function round5(n) { return Math.round(n / 5) * 5; }
  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  function activityFactor(level) {
    var a = ACTIVITY.filter(function (x) { return x.level === Number(level); })[0];
    return a ? a.factor : null;
  }

  function goalShare(goal, pace) {
    var g = GOALS[goal] || null;
    if (!g) return null;
    return g[pace === 'slow' ? 'slow' : 'moderate'];
  }

  // Mifflin-St Jeor, kcal/day at rest.
  function mifflin(p) {
    var w = num(p.weight), h = num(p.height), a = num(p.age);
    if (!(w > 0 && h > 0 && a > 0)) return null;
    var sex = String(p.sex || '').toLowerCase();
    if (sex !== 'm' && sex !== 'f') return null;
    return 10 * w + 6.25 * h - 5 * a + (sex === 'f' ? -161 : 5);
  }

  /**
   * propose({ sex, age, height, weight, activity (1-5), goal, pace })
   * -> { kcal, pro, carb, fat, fiber, bmr, factor, share, missing: [] }
   * Missing inputs are listed and the target is null: nothing is guessed.
   */
  function propose(p) {
    p = p || {};
    var missing = [];
    if (!(num(p.weight) > 0)) missing.push('peso');
    if (!(num(p.height) > 0)) missing.push('altezza');
    if (!(num(p.age) > 0)) missing.push('eta');
    var sex = String(p.sex || '').toLowerCase();
    if (sex !== 'm' && sex !== 'f') missing.push('sesso');
    var factor = activityFactor(p.activity);
    if (!factor) missing.push('attivita');
    var goal = GOALS[p.goal] ? p.goal : null;
    if (!goal) missing.push('obiettivo');
    if (missing.length) return { target: null, missing: missing };
    var bmr = mifflin(p);
    var share = goalShare(goal, p.pace);
    var kcal = round10(bmr * factor * (1 + share));
    var pro = round5(num(p.weight) * PROTEIN_PER_KG[goal]);
    var fat = round5(kcal * FAT_SHARE / 9);
    var carb = round5(Math.max(0, kcal - pro * 4 - fat * 9) / 4);
    return {
      target: { kcal: kcal, pro: pro, carb: carb, fat: fat, fiber: round5(kcal / 1000 * FIBER_PER_1000_KCAL) },
      bmr: Math.round(bmr),
      factor: factor,
      share: share,
      missing: []
    };
  }

  // A prescribed target may leave the fat "a saldo": whatever the kcal leave
  // after protein and carbohydrates.
  function completeTarget(t) {
    if (!t) return null;
    var kcal = num(t.kcal), pro = num(t.pro), carb = num(t.carb), fat = num(t.fat);
    if (!(kcal > 0)) return null;
    var balanced = false;
    if (fat == null && pro != null && carb != null) {
      fat = round5(Math.max(0, kcal - pro * 4 - carb * 4) / 9);
      balanced = true;
    }
    return { kcal: kcal, pro: pro, carb: carb, fat: fat, fatBalanced: balanced };
  }

  // The prescription's variant for a day: training, rest or the base one.
  function prescribedFor(prescribed, dayType) {
    if (!prescribed) return null;
    if (dayType === 'training' && prescribed.training && num(prescribed.training.kcal) > 0) return prescribed.training;
    if (dayType === 'rest' && prescribed.rest && num(prescribed.rest.kcal) > 0) return prescribed.rest;
    return prescribed;
  }

  /**
   * resolve({ prescribed, own, plan, proposed, dayType })
   * -> { kcal, pro, carb, fat, fatBalanced, source, by, note }
   * source: 'prescribed' | 'own' | 'plan' | 'proposed' | null.
   * With a prescription nothing else is returned - not even as a hint.
   */
  function resolve(o) {
    o = o || {};
    var pres = o.prescribed && num(o.prescribed.kcal) > 0 ? o.prescribed : null;
    if (pres) {
      var t = completeTarget(prescribedFor(pres, o.dayType));
      return Object.assign(t, {
        source: 'prescribed',
        variant: (o.dayType === 'training' && pres.training && num(pres.training.kcal) > 0) ? 'training'
          : ((o.dayType === 'rest' && pres.rest && num(pres.rest.kcal) > 0) ? 'rest' : 'base'),
        by: pres.by || null,
        note: pres.note || ''
      });
    }
    var own = completeTarget(o.own);
    if (own) return Object.assign(own, { source: 'own', by: null, note: '' });
    var plan = completeTarget(o.plan);
    if (plan) return Object.assign(plan, { source: 'plan', by: null, note: '' });
    var prop = o.proposed && o.proposed.target ? completeTarget(o.proposed.target) : null;
    if (prop) return Object.assign(prop, { source: 'proposed', by: null, note: '', fiber: o.proposed.target.fiber, disclaimer: DISCLAIMER });
    return { kcal: null, pro: null, carb: null, fat: null, source: null, by: null, note: '' };
  }

  /* ------------------------------ sums ------------------------------ */

  var PER100 = { kcal: ['kcalPer100'], pro: ['proPer100'], carb: ['carbPer100'], fat: ['fatPer100'] };
  var TOTAL = { kcal: ['kcal', 'calories'], pro: ['pro', 'protein_g', 'protein'], carb: ['carb', 'carbs_g', 'carbs'], fat: ['fat', 'fat_g'] };
  function first(f, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = num(f[keys[i]]);
      if (v != null) return v;
    }
    return null;
  }

  /**
   * One food's contribution. With values per 100 g: value x grams / 100.
   * Without them, the totals written on the food (older entries, imports).
   * With neither: missing - it makes the sum partial, it does not count as 0.
   */
  function foodValues(f, grams) {
    if (!f) return { missing: true };
    var kcal100 = first(f, PER100.kcal);
    if (kcal100 != null && grams > 0) {
      var out = { missing: false, basis: 'per100' };
      KEYS.forEach(function (k) {
        var v = first(f, PER100[k]);
        out[k] = v == null ? 0 : v * grams / 100;
      });
      return out;
    }
    var kcal = first(f, TOTAL.kcal);
    if (kcal != null) {
      var tot = { missing: false, basis: 'total' };
      KEYS.forEach(function (k) {
        var v = first(f, TOTAL[k]);
        tot[k] = v == null ? 0 : v;
      });
      return tot;
    }
    return { missing: true };
  }

  /**
   * sumFoods(foods, gramsOf) -> { kcal, pro, carb, fat, partial, missing: [names] }
   * gramsOf(food) -> grams (the page knows units and portions).
   */
  function sumFoods(foods, gramsOf) {
    var s = { kcal: 0, pro: 0, carb: 0, fat: 0, partial: false, missing: [] };
    (foods || []).forEach(function (f) {
      var g = gramsOf ? gramsOf(f) : num(f && f.quantity);
      var v = foodValues(f, g);
      if (v.missing) { s.partial = true; s.missing.push(String((f && f.name) || '?')); return; }
      KEYS.forEach(function (k) { s[k] += v[k]; });
    });
    return s;
  }

  function sumDay(day, gramsOf) {
    var all = [];
    ((day && day.meals) || []).forEach(function (m) { all = all.concat((m && (m.foods || m.items)) || []); });
    return sumFoods(all, gramsOf);
  }

  /**
   * compare(total, target) -> per key { total, target, diff, pct, tone }
   * tone: 'neutral' within +-5 %, 'amber' beyond, 'none' without a target.
   * Never a judgement: a number and a colour.
   */
  function compare(total, target) {
    var out = {};
    KEYS.forEach(function (k) {
      var t = target ? num(target[k]) : null;
      var v = total ? (num(total[k]) || 0) : 0;
      if (!(t > 0)) { out[k] = { total: v, target: null, diff: null, pct: null, fill: null, tone: 'none' }; return; }
      var diff = v - t;
      out[k] = {
        total: v,
        target: t,
        diff: diff,
        pct: diff / t,
        fill: Math.max(0, Math.min(1, v / t)),
        tone: Math.abs(diff / t) <= TOLERANCE ? 'neutral' : 'amber'
      };
    });
    return out;
  }

  /**
   * weekAverage({ days: [{ date, total }], today, target })
   * days: the diary, one entry per date that has something logged.
   * -> { logged, empty, average: {kcal,pro,carb,fat} | null, compare }
   * An empty day is counted apart, never averaged in as zero.
   */
  function isoDay(d) {
    var x = new Date(d);
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }
  function lastDates(today, n) {
    var out = [];
    var base = new Date(String(today).slice(0, 10) + 'T12:00:00');
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(base.getTime() - i * 86400000);
      out.push(isoDay(d));
    }
    return out;
  }
  function weekAverage(o) {
    o = o || {};
    var dates = lastDates(o.today || isoDay(Date.now()), 7);
    var byDate = {};
    (o.days || []).forEach(function (d) { if (d && d.date && d.total) byDate[String(d.date).slice(0, 10)] = d.total; });
    var logged = dates.filter(function (d) { return !!byDate[d]; });
    var avg = null;
    if (logged.length) {
      avg = { kcal: 0, pro: 0, carb: 0, fat: 0, partial: false };
      logged.forEach(function (d) {
        KEYS.forEach(function (k) { avg[k] += (num(byDate[d][k]) || 0) / logged.length; });
        if (byDate[d].partial) avg.partial = true;
      });
    }
    return {
      dates: dates,
      logged: logged.length,
      empty: dates.length - logged.length,
      emptyDates: dates.filter(function (d) { return !byDate[d]; }),
      average: avg,
      compare: avg ? compare(avg, o.target) : null
    };
  }

  root.NurvanNutritionTargets = {
    ACTIVITY: ACTIVITY,
    GOALS: GOALS,
    PROTEIN_PER_KG: PROTEIN_PER_KG,
    FAT_SHARE: FAT_SHARE,
    FIBER_PER_1000_KCAL: FIBER_PER_1000_KCAL,
    TOLERANCE: TOLERANCE,
    DISCLAIMER: DISCLAIMER,
    round10: round10,
    round5: round5,
    mifflin: mifflin,
    activityFactor: activityFactor,
    propose: propose,
    completeTarget: completeTarget,
    resolve: resolve,
    foodValues: foodValues,
    sumFoods: sumFoods,
    sumDay: sumDay,
    compare: compare,
    weekAverage: weekAverage,
    lastDates: lastDates
  };
})(typeof self !== 'undefined' ? self : this);
