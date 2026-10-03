/* Formulas of the free tools (/strumenti). Pure functions, no personal data is
 * read or sent anywhere: the pages call them in the browser. Also loadable in
 * Node (test_site_landings.mjs).
 *
 * Sources, checked 2026-10-03:
 *  - Epley (1985): 1RM = w * (1 + r / 30).
 *  - Brzycki (1993): 1RM = w * 36 / (37 - r).
 *  - Wilks (2005 coefficients) and IPF GOODLIFT (2020 coefficients): the
 *    constants are the ones of the OpenPowerlifting project, files
 *    crates/coefficients/src/wilks.rs and goodlift.rs
 *    (https://gitlab.com/openpowerlifting/opl-data), read 2026-10-03.
 *  - Mifflin-St Jeor (1990): 10 w + 6.25 h - 5 a + 5 (men) or - 161 (women).
 */
(function (root) {
  'use strict';

  function epley(weight, reps) { return reps === 1 ? weight : weight * (1 + reps / 30); }
  function brzycki(weight, reps) { return reps === 1 ? weight : weight * 36 / (37 - reps); }
  // Both formulas are for sets of up to about ten repetitions; Brzycki breaks at 37.
  function oneRm(weight, reps) {
    const w = Number(weight); const r = Math.round(Number(reps));
    if (!(w > 0) || !(r >= 1) || r > 12) return null;
    return { epley: epley(w, r), brzycki: brzycki(w, r), reps: r };
  }
  const PERCENTS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 50];
  function percentTable(rm, step) {
    const s = step || 2.5;
    return PERCENTS.map((p) => ({ percent: p, kg: Math.round(rm * p / 100 / s) * s }));
  }

  function poly5(f, e, d, c, b, a, x) { return ((((f * x + e) * x + d) * x + c) * x + b) * x + a; }
  function wilksCoefficient(sex, bw) {
    if (sex === 'm') return 500 / poly5(-1.291e-08, 7.01863e-06, -0.00113732, -0.002388645, 16.2606339, -216.0475144, Math.min(Math.max(bw, 40), 201.9));
    return 500 / poly5(-0.00000009054, 0.00004731582, -0.00930733913, 0.82112226871, -27.23842536447, 594.31747775582, Math.min(Math.max(bw, 26.51), 154.53));
  }
  function wilks(sex, bw, total) {
    if (!(bw > 0) || !(total > 0)) return null;
    return total * wilksCoefficient(sex, bw);
  }
  // [A, B, C] by sex, equipment (raw | single) and event (sbd | bench).
  const GL = {
    m: { raw: { sbd: [1199.72839, 1025.18162, 0.00921], bench: [320.98041, 281.40258, 0.01008] }, single: { sbd: [1236.25115, 1449.21864, 0.01644], bench: [381.22073, 733.79378, 0.02398] } },
    f: { raw: { sbd: [610.32796, 1045.59282, 0.03048], bench: [142.40398, 442.52671, 0.04724] }, single: { sbd: [758.63878, 949.31382, 0.02435], bench: [221.82209, 357.00377, 0.02937] } }
  };
  function goodlift(sex, equipment, event, bw, total) {
    const p = GL[sex] && GL[sex][equipment] && GL[sex][equipment][event];
    if (!p || !(bw >= 35) || !(total > 0)) return null;
    return total * 100 / (p[0] - p[1] * Math.exp(-p[2] * bw));
  }

  const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, extreme: 1.9 };
  const GOALS = { cut: -0.15, maintain: 0, bulk: 0.1 };
  function bmr(sex, weight, height, age) { return 10 * weight + 6.25 * height - 5 * age + (sex === 'm' ? 5 : -161); }
  function macros(o) {
    const w = Number(o.weight); const h = Number(o.height); const a = Number(o.age);
    if (!(w >= 30 && w <= 300) || !(h >= 120 && h <= 230) || !(a >= 18 && a <= 90)) return null;
    if (!ACTIVITY[o.activity] || !(o.goal in GOALS) || (o.sex !== 'm' && o.sex !== 'f')) return null;
    const base = bmr(o.sex, w, h, a);
    const tdee = base * ACTIVITY[o.activity];
    const kcal = Math.round(tdee * (1 + GOALS[o.goal]) / 10) * 10;
    const protein = Math.round(w * (o.goal === 'cut' ? 2 : 1.8));
    const fat = Math.round(kcal * 0.25 / 9);
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { bmr: Math.round(base), tdee: Math.round(tdee), kcal, protein, fat, carbs };
  }

  const api = { oneRm, percentTable, wilksCoefficient, wilks, goodlift, bmr, macros, PERCENTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NurvanCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
