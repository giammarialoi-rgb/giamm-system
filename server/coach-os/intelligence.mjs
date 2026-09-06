import crypto from "node:crypto";

export const INTELLIGENCE_FORMULA_VERSION = "deterministic-v1";

function asDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value || {})).digest("hex");
}

function programSessionsPerWeek(program) {
  const weeks = Array.isArray(program && program.weeks) ? program.weeks : [];
  const counts = weeks.map((week) => (week.sessions || week.days || []).length).filter((n) => n > 0);
  if (!counts.length) return 0;
  return round(counts.reduce((sum, count) => sum + count, 0) / counts.length, 1);
}

function logsInRange(logs, start, end) {
  return (Array.isArray(logs) ? logs : []).filter((log) => {
    const date = asDate(log && log.at);
    return date && date.getTime() >= start && date.getTime() < end;
  });
}

function average(rows, getter) {
  const values = rows.map(getter).map(Number).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function weightTrend(bodyChecks) {
  const rows = (Array.isArray(bodyChecks) ? bodyChecks : [])
    .map((row) => ({ value: Number(row && row.weight), at: asDate(row && row.at) }))
    .filter((row) => row.value > 0 && row.at)
    .sort((a, b) => a.at - b.at);
  if (!rows.length) return { current: null, delta: null, weeks: null };
  const last = rows[rows.length - 1];
  const first = rows[0];
  return {
    current: last.value,
    delta: rows.length > 1 ? round(last.value - first.value, 1) : null,
    weeks: rows.length > 1 ? Math.max(1, round((last.at - first.at) / (7 * 86400000), 1)) : null
  };
}

function signal(id, severity, title, detail, evidence) {
  return { id, severity, title, detail, evidence: evidence || [] };
}

export function buildDeterministicIntelligence(client, accountData = {}, now = Date.now()) {
  const program = accountData.activeProgram || {};
  const logs = Array.isArray(accountData.logs) ? accountData.logs : [];
  const sessionsPerWeek = programSessionsPerWeek(program);
  const currentLogs = logsInRange(logs, now - 28 * 86400000, now);
  const previousLogs = logsInRange(logs, now - 56 * 86400000, now - 28 * 86400000);
  const planned28 = sessionsPerWeek ? sessionsPerWeek * 4 : 0;
  const adherence = planned28 ? Math.min(100, round(currentLogs.length / planned28 * 100, 0)) : null;
  const previousAdherence = planned28 ? Math.min(100, round(previousLogs.length / planned28 * 100, 0)) : null;
  const adherenceDelta = adherence != null && previousAdherence != null
    ? adherence - previousAdherence
    : null;
  const currentTonnage = average(currentLogs, (row) => row.tonnage || row.weight || 0);
  const previousTonnage = average(previousLogs, (row) => row.tonnage || row.weight || 0);
  const performanceDelta = currentTonnage != null && previousTonnage > 0
    ? round((currentTonnage - previousTonnage) / previousTonnage * 100, 1)
    : null;
  const lastLog = logs.length ? logs.slice().sort((a, b) => String(a.at || "").localeCompare(String(b.at || ""))).pop() : null;
  const lastWorkoutAt = (lastLog && lastLog.at) || client.last_workout_at || null;
  const lastWorkoutDate = asDate(lastWorkoutAt);
  const inactiveDays = lastWorkoutDate ? Math.floor((now - lastWorkoutDate.getTime()) / 86400000) : null;
  const weights = weightTrend(accountData.bodyChecks);
  const intake = client.intake || {};
  const sleepLow = /meno di 6|<\s*6/i.test(String(intake.sleepHours || ""));
  const stressHigh = /alto|high/i.test(String(intake.stress || ""));
  let recoveryScore = 70;
  if (sleepLow) recoveryScore -= 20;
  if (stressHigh) recoveryScore -= 15;
  if (accountData.health && Number.isFinite(Number(accountData.health.recoveryScore))) {
    recoveryScore = Number(accountData.health.recoveryScore);
  }
  recoveryScore = Math.max(0, Math.min(100, round(recoveryScore, 0)));

  const signals = [];
  if (inactiveDays != null && inactiveDays >= 7) {
    signals.push(signal(
      "inactivity",
      inactiveDays >= 14 ? "high" : "medium",
      "Workout inactivity",
      `${inactiveDays} giorni dall’ultimo workout`,
      [{ source: "workout_logs", value: lastWorkoutAt, windowDays: inactiveDays }]
    ));
  }
  if (adherence != null && adherence < 70) {
    signals.push(signal(
      "adherence_drop",
      adherence < 50 ? "high" : "medium",
      "Adherence below target",
      `${adherence}% negli ultimi 28 giorni`,
      [{ source: "workout_logs", completed: currentLogs.length, planned: planned28, windowDays: 28 }]
    ));
  } else if (adherenceDelta != null && adherenceDelta <= -20) {
    signals.push(signal(
      "adherence_drop",
      "medium",
      "Adherence declining",
      `${adherenceDelta} punti vs periodo precedente`,
      [{ source: "workout_logs", current: adherence, previous: previousAdherence }]
    ));
  }
  if (weights.delta != null && Math.abs(weights.delta) >= 3) {
    signals.push(signal(
      "weight_change",
      "medium",
      "Weight changed",
      `${weights.delta > 0 ? "+" : ""}${weights.delta} kg in ${weights.weeks} settimane`,
      [{ source: "body_checks", current: weights.current, delta: weights.delta, weeks: weights.weeks }]
    ));
  }
  const expires = asDate(client.program_expires_at);
  if (expires && expires.getTime() <= now + 7 * 86400000) {
    signals.push(signal(
      "program_expiration",
      expires.getTime() < now ? "high" : "medium",
      "Program expiring",
      expires.getTime() < now ? "Programma scaduto" : "Scade entro 7 giorni",
      [{ source: "coach_clients.program_expires_at", value: client.program_expires_at }]
    ));
  }
  const nextCheck = asDate(client.next_check_at);
  if (nextCheck && nextCheck.getTime() <= now) {
    signals.push(signal(
      "missing_check_in",
      "medium",
      "Check-in due",
      "Il check-in programmato non risulta revisionato",
      [{ source: "coach_clients.next_check_at", value: client.next_check_at }]
    ));
  }
  if (performanceDelta != null && Math.abs(performanceDelta) < 2 && currentLogs.length >= 4 && previousLogs.length >= 4) {
    signals.push(signal(
      "performance_plateau",
      "low",
      "Performance plateau",
      `${performanceDelta > 0 ? "+" : ""}${performanceDelta}% tonnage medio`,
      [{ source: "workout_logs.tonnage", current: currentTonnage, previous: previousTonnage, windowDays: 56 }]
    ));
  }

  const derivedMetrics = {
    adherence: {
      value: adherence,
      previous: previousAdherence,
      delta: adherenceDelta,
      windowDays: 28,
      source: "workout_logs+active_program"
    },
    performance: {
      tonnageAverage: currentTonnage == null ? null : round(currentTonnage, 0),
      previousTonnageAverage: previousTonnage == null ? null : round(previousTonnage, 0),
      deltaPct: performanceDelta,
      source: "workout_logs"
    },
    recovery: {
      score: recoveryScore,
      sleepLow,
      stressHigh,
      source: accountData.health && accountData.health.recoveryScore != null ? "health" : "intake"
    },
    consistency: {
      workouts28d: currentLogs.length,
      workoutsPrevious28d: previousLogs.length,
      inactiveDays,
      source: "workout_logs"
    },
    weight: { ...weights, source: "body_checks" }
  };

  const sourceFingerprint = fingerprint({
    logs: logs.slice(-120),
    bodyChecks: (accountData.bodyChecks || []).slice(-40),
    programId: program.id || null,
    programExpiresAt: client.program_expires_at || null,
    nextCheckAt: client.next_check_at || null,
    sleepHours: intake.sleepHours || null,
    stress: intake.stress || null
  });

  return {
    formulaVersion: INTELLIGENCE_FORMULA_VERSION,
    sourceFingerprint,
    computedAt: new Date(now).toISOString(),
    signals,
    derivedMetrics,
    aiInterpretation: null,
    provenance: {
      deterministic: true,
      sources: ["workout_logs", "active_program", "body_checks", "intake", "coach_clients"],
      clinicalDiagnosis: false
    }
  };
}

export function interpretAthleteBrain({ signals = [], derivedMetrics = {}, sourceFingerprint = null } = {}) {
  const positives = [];
  const risks = [];
  if (derivedMetrics.adherence && derivedMetrics.adherence.value != null && derivedMetrics.adherence.value >= 80) {
    positives.push({
      text: `Adherence ${derivedMetrics.adherence.value}% negli ultimi 28 giorni.`,
      source: derivedMetrics.adherence
    });
  }
  if (derivedMetrics.performance && derivedMetrics.performance.deltaPct != null && derivedMetrics.performance.deltaPct > 5) {
    positives.push({
      text: `Tonnage medio +${derivedMetrics.performance.deltaPct}% rispetto al periodo precedente.`,
      source: derivedMetrics.performance
    });
  }
  for (const signal of signals) {
    risks.push({
      text: signal.detail || signal.title,
      signalId: signal.id,
      evidence: signal.evidence
    });
  }
  const top = signals[0] || null;
  const suggestedAction = top
    ? {
      text: top.id === "missing_check_in"
        ? "Richiedi o revisiona il check-in."
        : top.id === "inactivity"
          ? "Apri il cliente e valuta un nudge o una modifica di volume."
          : "Apri i dati e decidi la next action.",
      signalId: top.id,
      viewData: { view: "coachClient" }
    }
    : { text: "Nessun rischio deterministico. Mantieni il piano corrente.", signalId: null };
  return {
    currentStatus: top
      ? `Segnale principale: ${top.title}.`
      : "Nessun segnale di rischio deterministico.",
    positives,
    risks,
    suggestedAction,
    grounded: true,
    clinicalDiagnosis: false,
    sourceFingerprint,
    generatedAt: new Date().toISOString()
  };
}

export async function saveIntelligenceSnapshot(pool, coachId, clientId, intelligence) {
  await pool.query(
    `INSERT INTO coach_client_metric_snapshots(
       client_id, coach_user_id, formula_version, source_fingerprint,
       signals, derived_metrics, computed_at
     ) VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (client_id) DO UPDATE SET
       coach_user_id = EXCLUDED.coach_user_id,
       formula_version = EXCLUDED.formula_version,
       source_fingerprint = EXCLUDED.source_fingerprint,
       signals = EXCLUDED.signals,
       derived_metrics = EXCLUDED.derived_metrics,
       computed_at = EXCLUDED.computed_at`,
    [
      clientId,
      coachId,
      intelligence.formulaVersion,
      intelligence.sourceFingerprint,
      JSON.stringify(intelligence.signals),
      JSON.stringify(intelligence.derivedMetrics),
      intelligence.computedAt
    ]
  );
}

export const IntelligenceTestHelpers = Object.freeze({
  asDate,
  programSessionsPerWeek,
  logsInRange,
  weightTrend,
  fingerprint
});
