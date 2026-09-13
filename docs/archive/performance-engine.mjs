/**
 * GIAMMARIA SYSTEM - PERFORMANCE DATA CORE & ATHLETE ANALYTICS (Task 12)
 * Deterministic calculation engine for Volume, Tonnage, Estimated 1RM, PRs and Trends.
 */

// 1. Basic Set & Metric Calculations
export function calculateCompletedSets(sets = []) {
  if (!Array.isArray(sets)) return 0;
  return sets.filter(s => Boolean(s.completed)).length;
}

export function calculateMissedSets(sets = []) {
  if (!Array.isArray(sets)) return 0;
  return sets.filter(s => !s.completed).length;
}

export function calculateTotalReps(sets = []) {
  if (!Array.isArray(sets)) return 0;
  return sets.reduce((acc, s) => {
    if (!s.completed) return acc;
    const reps = Number(s.actual_reps || s.reps || 0);
    return acc + (isNaN(reps) ? 0 : reps);
  }, 0);
}

export function calculateTotalTonnage(sets = []) {
  if (!Array.isArray(sets)) return 0;
  return Math.round(sets.reduce((acc, s) => {
    if (!s.completed) return acc;
    const load = Number(s.actual_load || s.load || 0);
    const reps = Number(s.actual_reps || s.reps || 0);
    if (isNaN(load) || isNaN(reps) || load <= 0 || reps <= 0) return acc;
    return acc + (load * reps);
  }, 0) * 10) / 10;
}

export function calculateVolumeLoad(sets = []) {
  return calculateTotalTonnage(sets);
}

export function calculateAverageLoad(sets = []) {
  if (!Array.isArray(sets)) return 0;
  const valid = sets.filter(s => s.completed && Number(s.actual_load || s.load) > 0);
  if (!valid.length) return 0;
  const sum = valid.reduce((acc, s) => acc + Number(s.actual_load || s.load), 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

export function calculateAverageRIR(sets = []) {
  if (!Array.isArray(sets)) return null;
  const valid = sets.filter(s => s.completed && s.actual_rir !== null && s.actual_rir !== undefined && !isNaN(Number(s.actual_rir)));
  if (!valid.length) return null;
  const sum = valid.reduce((acc, s) => acc + Number(s.actual_rir), 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

export function calculateAverageRPE(sets = []) {
  if (!Array.isArray(sets)) return null;
  const valid = sets.filter(s => s.completed && s.actual_rpe !== null && s.actual_rpe !== undefined && !isNaN(Number(s.actual_rpe)));
  if (!valid.length) return null;
  const sum = valid.reduce((acc, s) => acc + Number(s.actual_rpe), 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

// 2. Estimated 1RM Calculation (Epley Formula)
export function calculateEstimated1RM(load, reps, formula = "epley") {
  const l = Number(load);
  const r = Number(reps);
  if (isNaN(l) || isNaN(r) || l <= 0 || r <= 0) return null;
  if (r === 1) return l;

  // Epley: 1RM = load * (1 + reps / 30)
  if (formula.toLowerCase() === "epley") {
    return Math.round((l * (1 + r / 30)) * 10) / 10;
  }
  // Brzycki: 1RM = load * (36 / (37 - reps))
  if (formula.toLowerCase() === "brzycki" && r < 37) {
    return Math.round((l * (36 / (37 - r))) * 10) / 10;
  }

  return Math.round((l * (1 + r / 30)) * 10) / 10;
}

// 3. Exercise Performance Metrics
export function calculateExercisePerformance(exercise = {}) {
  const sets = exercise.sets || [];
  const completedSets = sets.filter(s => Boolean(s.completed));

  let bestLoad = 0;
  let bestReps = 0;
  let bestEstimated1RM = 0;

  completedSets.forEach(s => {
    const l = Number(s.actual_load || s.load || 0);
    const r = Number(s.actual_reps || s.reps || 0);
    if (l > bestLoad) bestLoad = l;
    if (r > bestReps) bestReps = r;

    const est1RM = calculateEstimated1RM(l, r);
    if (est1RM && est1RM > bestEstimated1RM) {
      bestEstimated1RM = est1RM;
    }
  });

  return {
    exercise_id: exercise.exercise_id || exercise.id,
    canonical_id: exercise.canonical_exercise_id || exercise.canonical_id || exercise.name,
    exercise_name: exercise.name || exercise.exercise || "Esercizio",
    muscle_group: exercise.muscle_group || "TOTAL",
    completed_sets: completedSets.length,
    total_sets: sets.length,
    total_reps: calculateTotalReps(completedSets),
    total_tonnage: calculateTotalTonnage(completedSets),
    average_load: calculateAverageLoad(completedSets),
    best_load: bestLoad || null,
    best_reps: bestReps || null,
    best_estimated_1rm: bestEstimated1RM || null,
    average_rir: calculateAverageRIR(completedSets),
    average_rpe: calculateAverageRPE(completedSets)
  };
}

// 4. Workout Session Performance Metrics
export function calculateWorkoutPerformance(session = {}) {
  const exercises = session.exercises || [];
  let allSets = [];
  const exerciseMetrics = exercises.map(ex => {
    const sets = ex.sets || [];
    allSets = allSets.concat(sets);
    return calculateExercisePerformance(ex);
  });

  const completedSets = allSets.filter(s => Boolean(s.completed));
  const completionPercentage = allSets.length > 0 ? Math.round((completedSets.length / allSets.length) * 100) : 0;

  return {
    workout_id: session.id,
    session_name: session.session_name || session.title || "Workout",
    week_number: session.week_number || 1,
    session_number: session.session_number || 1,
    status: session.status || "completed",
    duration_seconds: session.duration_seconds || 0,
    total_exercises: exercises.length,
    total_sets: allSets.length,
    completed_sets: completedSets.length,
    missed_sets: allSets.length - completedSets.length,
    completion_percentage: completionPercentage,
    total_reps: calculateTotalReps(completedSets),
    total_tonnage: calculateTotalTonnage(completedSets),
    average_rir: calculateAverageRIR(completedSets),
    average_rpe: calculateAverageRPE(completedSets),
    exercises: exerciseMetrics
  };
}

// 5. Trend Engine (Improving, Stable, Declining, Insufficient Data)
export function calculateTrend(performances = []) {
  if (!Array.isArray(performances) || performances.length < 2) {
    return {
      status: "insufficient_data",
      label: "Dati Insufficienti",
      score: 0,
      detail: "Servono almeno 2 sessioni registrate per calcolare il trend."
    };
  }

  const current = performances[0]; // most recent
  const previous = performances[1]; // older

  const curr1RM = current.best_estimated_1rm || current.estimated_1rm || 0;
  const prev1RM = previous.best_estimated_1rm || previous.estimated_1rm || 0;

  const currTonnage = current.total_tonnage || current.tonnage || 0;
  const prevTonnage = previous.total_tonnage || previous.tonnage || 0;

  const currLoad = current.best_load || current.load || 0;
  const prevLoad = previous.best_load || previous.load || 0;

  let score = 0;

  if (curr1RM > 0 && prev1RM > 0) {
    const diff1RM = (curr1RM - prev1RM) / prev1RM;
    if (diff1RM > 0.02) score += 2;
    else if (diff1RM < -0.02) score -= 2;
  }

  if (currTonnage > 0 && prevTonnage > 0) {
    const diffTonnage = (currTonnage - prevTonnage) / prevTonnage;
    if (diffTonnage > 0.03) score += 1;
    else if (diffTonnage < -0.03) score -= 1;
  }

  if (currLoad > 0 && prevLoad > 0) {
    if (currLoad > prevLoad) score += 1;
    else if (currLoad < prevLoad) score -= 1;
  }

  if (score >= 2) {
    return {
      status: "improving",
      label: "In Miglioramento ↑",
      score,
      detail: "Incremento riscontrato su carico / 1RM stimato e volume rispetto alla sessione precedente."
    };
  } else if (score <= -2) {
    return {
      status: "declining",
      label: "In Calo ↓",
      score,
      detail: "Flessione rispetto alla prestazione precedente. Monitorare recupero e fatica."
    };
  } else {
    return {
      status: "stable",
      label: "Stabile ➔",
      score,
      detail: "Prestazione coerente e consolidata rispetto alla sessione precedente."
    };
  }
}

// 6. Personal Records (PR) Engine
export function detectPersonalRecords(allPerformances = []) {
  if (!Array.isArray(allPerformances) || !allPerformances.length) {
    return {
      max_load: null,
      max_reps: null,
      max_estimated_1rm: null,
      max_tonnage: null
    };
  }

  let maxLoad = { value: 0, date: null, workout_id: null };
  let maxReps = { value: 0, date: null, workout_id: null };
  let max1RM = { value: 0, date: null, workout_id: null };
  let maxTonnage = { value: 0, date: null, workout_id: null };

  allPerformances.forEach(p => {
    if (p.best_load && p.best_load > maxLoad.value) {
      maxLoad = { value: p.best_load, date: p.date, workout_id: p.workout_id };
    }
    if (p.best_reps && p.best_reps > maxReps.value) {
      maxReps = { value: p.best_reps, date: p.date, workout_id: p.workout_id };
    }
    if (p.best_estimated_1rm && p.best_estimated_1rm > max1RM.value) {
      max1RM = { value: p.best_estimated_1rm, date: p.date, workout_id: p.workout_id };
    }
    if (p.total_tonnage && p.total_tonnage > maxTonnage.value) {
      maxTonnage = { value: p.total_tonnage, date: p.date, workout_id: p.workout_id };
    }
  });

  return {
    max_load: maxLoad.value > 0 ? maxLoad : null,
    max_reps: maxReps.value > 0 ? maxReps : null,
    max_estimated_1rm: max1RM.value > 0 ? max1RM : null,
    max_tonnage: maxTonnage.value > 0 ? maxTonnage : null
  };
}

// 7. Muscle Group Volume Aggregator
export function aggregateMuscleGroupVolume(exercises = []) {
  const muscleGroups = {
    "PETTO": { completed_sets: 0, total_reps: 0, tonnage: 0, frequency: 0 },
    "DORSALI": { completed_sets: 0, total_reps: 0, tonnage: 0, frequency: 0 },
    "SCHIENA": { completed_sets: 0, total_reps: 0, tonnage: 0, frequency: 0 },
    "DELTOIDI": { completed_sets: 0, total_reps: 0, tonnage: 0, frequency: 0 },
    "BICIPITI": { completed_sets: 0, total_reps: 0, tonnage: 0, frequency: 0 },
    "TRICIPITI": { completed_sets: 0, total_reps: 0, tonnage: 0, frequency: 0 },
    "QUADRICIPITI": { completed_sets: 0, total_reps: 0, tonnage: 0, frequency: 0 },
    "FEMORALI": { completed_sets: 0, total_reps: 0, tonnage: 0, frequency: 0 },
    "GLUTEI": { completed_sets: 0, total_reps: 0, tonnage: 0, frequency: 0 },
    "POLPACCI": { completed_sets: 0, total_reps: 0, tonnage: 0, frequency: 0 },
    "CORE": { completed_sets: 0, total_reps: 0, tonnage: 0, frequency: 0 },
    "TOTAL": { completed_sets: 0, total_reps: 0, tonnage: 0, frequency: 0 }
  };

  const seenPerSession = new Set();

  exercises.forEach(ex => {
    let rawMg = String(ex.muscle_group || "TOTAL").toUpperCase().trim();
    if (!muscleGroups[rawMg]) {
      // Fuzzy map
      if (rawMg.includes("CHEST") || rawMg.includes("PETTO") || rawMg.includes("SPINTA")) rawMg = "PETTO";
      else if (rawMg.includes("BACK") || rawMg.includes("DORS") || rawMg.includes("LAT") || rawMg.includes("TIRATA")) rawMg = "DORSALI";
      else if (rawMg.includes("SHOULDER") || rawMg.includes("SPALLE") || rawMg.includes("DELT")) rawMg = "DELTOIDI";
      else if (rawMg.includes("BICEP") || rawMg.includes("BRACCIA")) rawMg = "BICIPITI";
      else if (rawMg.includes("TRICEP")) rawMg = "TRICIPITI";
      else if (rawMg.includes("QUAD") || rawMg.includes("GAMBE")) rawMg = "QUADRICIPITI";
      else if (rawMg.includes("HAM") || rawMg.includes("FEMOR")) rawMg = "FEMORALI";
      else if (rawMg.includes("GLUT")) rawMg = "GLUTEI";
      else if (rawMg.includes("CALF") || rawMg.includes("POLP")) rawMg = "POLPACCI";
      else if (rawMg.includes("ABS") || rawMg.includes("ADDOM") || rawMg.includes("CORE")) rawMg = "CORE";
      else rawMg = "TOTAL";
    }

    const sets = ex.sets || [];
    const completedSets = sets.filter(s => Boolean(s.completed));
    const reps = calculateTotalReps(completedSets);
    const tonnage = calculateTotalTonnage(completedSets);

    if (completedSets.length > 0) {
      muscleGroups[rawMg].completed_sets += completedSets.length;
      muscleGroups[rawMg].total_reps += reps;
      muscleGroups[rawMg].tonnage += tonnage;
      if (!seenPerSession.has(rawMg)) {
        seenPerSession.add(rawMg);
        muscleGroups[rawMg].frequency += 1;
      }
    }
  });

  return muscleGroups;
}
