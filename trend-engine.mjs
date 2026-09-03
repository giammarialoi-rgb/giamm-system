/**
 * Adaptive trend / plateau / deload proposal helpers (Wave 2).
 * Emits structured proposals — never silent program mutation.
 */

export function analyzeExerciseTrend(historyRows) {
  // historyRows: [{ load, reps, rir, at }] chronological
  const rows = (historyRows || []).filter((r) => Number(r.load) > 0 && Number(r.reps) > 0);
  if (rows.length < 3) return { status: 'insufficient_data', confidence: 0.2 };
  const epley = (l, r) => (Number(r) === 1 ? Number(l) : Math.round(Number(l) * (1 + Number(r) / 30) * 10) / 10);
  const e1 = rows.map((r) => epley(r.load, r.reps));
  const last3 = e1.slice(-3);
  const first = last3[0];
  const last = last3[last3.length - 1];
  const delta = last - first;
  const avgRir = rows.slice(-3).reduce((s, r) => s + (Number(r.rir) || 2), 0) / 3;
  if (delta > 2) return { status: 'progress', confidence: 0.7, delta, avgRir };
  if (delta < -2) return { status: 'regression', confidence: 0.75, delta, avgRir };
  // plateau: flat e1RM across >= 3 sessions
  if (Math.abs(delta) <= 2 && rows.length >= 4) {
    return { status: 'plateau', confidence: 0.65, delta, avgRir, weeksStalled: rows.length };
  }
  return { status: 'stable', confidence: 0.5, delta, avgRir };
}

export function proposeDeload(ctx) {
  const recovery = Number(ctx && ctx.recoveryScore);
  const declining = !!(ctx && ctx.decliningCount);
  const highFatigue = recovery > 0 && recovery < 45;
  if (!highFatigue && declining < 2) {
    return { needed: false };
  }
  return {
    needed: true,
    reason: highFatigue
      ? 'Recovery score basso — riduci stress allenante.'
      : 'Performance in calo su più esercizi.',
    proposal: {
      action_type: 'APPLY_DELOAD',
      volumeReductionPct: 40,
      weeks: 1,
      intensityNote: 'Mantieni tecnica, RIR +1 rispetto al target'
    },
    confidence: highFatigue ? 0.8 : 0.6
  };
}

export function proposeLoadProgression(lastLoad, lastReps, lastRir, targetReps) {
  const load = Number(lastLoad);
  const reps = Number(lastReps);
  const rir = lastRir === '' || lastRir == null ? null : Number(lastRir);
  if (!Number.isFinite(load) || load <= 0) return null;
  if (rir != null && rir <= 1 && reps >= (Number(targetReps) || reps)) {
    return { newLoad: Math.round(load * 1.025 * 2) / 2, reason: 'Target raggiunto con RIR basso' };
  }
  if (rir != null && rir >= 4) {
    return { newLoad: load, reason: 'RIR alto — valuta più reps prima di alzare il carico' };
  }
  return null;
}

export default { analyzeExerciseTrend, proposeDeload, proposeLoadProgression };
