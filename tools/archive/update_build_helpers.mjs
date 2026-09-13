import fs from 'fs';

const helperCode = `
// ====================================================
// CANONICAL MODEL & CALCULATION ENGINE HELPERS
// ====================================================
function canonicalToData(canonical) {
  return normalizeProgram(canonical);
}

function dataToCanonical(data) {
  if (!data) return null;
  return {
    id: data.id || 'program_' + Date.now(),
    title: data.title || 'Programma',
    duration_weeks: (data.weeks || []).length,
    weeks: data.weeks || [],
    nutrition: data.nutrition || null,
    supplementation: data.supplementation || null,
    therapy: data.therapy || null,
    clinical_exams: data.clinical_exams || null,
    exerciseDb: data.exerciseDb || {}
  };
}

function calculateEpley1RM(load, reps) {
  const l = parseFloat(load) || 0;
  const r = parseInt(reps, 10) || 0;
  if (l <= 0 || r <= 0) return 0;
  if (r === 1) return l;
  return Math.round((l * (1 + r / 30)) * 10) / 10;
}

function calculateSetVolume(load, reps, multiplier = 1) {
  const l = parseFloat(load) || 0;
  const r = parseInt(reps, 10) || 0;
  const m = Number(multiplier) || 1;
  return Math.round(l * r * m * 10) / 10;
}

function calculateSessionVolume(weekNum, dayIndex) {
  const w = DATA?.weeks?.[weekNum - 1];
  const d = (w?.sessions || w?.days)?.[dayIndex];
  if (!d) return 0;
  let totalVol = 0;
  const exercises = d.exercises || d.rows || [];
  exercises.forEach((row, ri) => {
    const eK = 'w' + weekNum + '_d' + dayIndex + '_e' + ri;
    if (store.skips && store.skips[eK]) return;
    const isPart = store.loadTypes && store.loadTypes[eK] === 'part';
    const mult = isPart ? 2 : 1;
    const setsCount = getExerciseSetCount ? getExerciseSetCount(ri) : 3;
    for (let s = 1; s <= setsCount; s++) {
      const l = parseFloat(store.data?.[eK + '_s' + s + '_load'] || 0);
      const r = parseInt(store.data?.[eK + '_s' + s + '_reps'] || 0, 10);
      totalVol += calculateSetVolume(l, r, mult);
    }
  });
  return Math.round(totalVol * 10) / 10;
}

function calculateEffectiveIntensityVolume(arg1, arg2, arg3) {
  if (typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'number') {
    const load = parseFloat(arg1) || 0;
    const reps = parseInt(arg2, 10) || 0;
    const rir = parseFloat(arg3);
    let intensityFactor = 1.0;
    if (rir <= 2) {
      intensityFactor = 1.0;
    } else if (rir === 3) {
      intensityFactor = 0.8;
    } else if (rir === 4) {
      intensityFactor = 0.5;
    } else {
      intensityFactor = 0.0;
    }
    return Math.round(load * reps * intensityFactor * 10) / 10;
  }
  const weekNum = arg1;
  const dayIndex = arg2;
  const w = DATA?.weeks?.[weekNum - 1];
  const d = (w?.sessions || w?.days)?.[dayIndex];
  if (!d) return 0;
  let totalEff = 0;
  const exercises = d.exercises || d.rows || [];
  exercises.forEach((row, ri) => {
    const eK = 'w' + weekNum + '_d' + dayIndex + '_e' + ri;
    if (store.skips && store.skips[eK]) return;
    const isPart = store.loadTypes && store.loadTypes[eK] === 'part';
    const mult = isPart ? 2 : 1;
    const setsCount = getExerciseSetCount ? getExerciseSetCount(ri) : 3;
    for (let s = 1; s <= setsCount; s++) {
      const l = parseFloat(store.data?.[eK + '_s' + s + '_load'] || 0);
      const r = parseInt(store.data?.[eK + '_s' + s + '_reps'] || 0, 10);
      const rir = parseFloat(store.data?.[eK + '_s' + s + '_rir'] || 0);
      if (l > 0 && r > 0) {
        totalEff += calculateEffectiveIntensityVolume(l, r, rir) * mult;
      }
    }
  });
  return Math.round(totalEff * 10) / 10;
}

function closeSkipModal() {
  if (typeof $ === 'function' && $('skip-modal')) $('skip-modal').style.display = 'none';
}

function saveSkipReason(exerciseIndex, reason) {
  if (!store.skips) store.skips = {};
  store.skips['w' + currentWeek + '_d' + currentDay + '_e' + exerciseIndex] = reason;
  if (typeof persist === 'function') persist();
  closeSkipModal();
  if (typeof render === 'function') render();
}

function closeReplacementModal() {
  if (typeof $ === 'function' && $('replace-modal')) $('replace-modal').style.display = 'none';
}

function applyExerciseReplacement(exerciseIndex, newExerciseName) {
  if (!store.subs) store.subs = {};
  store.subs['w' + currentWeek + '_d' + currentDay + '_e' + exerciseIndex] = newExerciseName;
  if (typeof persist === 'function') persist();
  closeReplacementModal();
  if (typeof render === 'function') render();
}

function resetTimer() {
  if (typeof stopTimer === 'function') stopTimer();
  if (typeof timerSeconds !== 'undefined') timerSeconds = 0;
  if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
}

function speakText(text) {
  if (typeof speakCoachReply === 'function') return speakCoachReply(text);
}

function stopSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

async function confirmAndActivateProgram(canonicalProgram, filename = 'programma_importato') {
  if (typeof importProgramJson === 'function') return await importProgramJson(canonicalProgram, filename);
  DATA = normalizeProgram(canonicalProgram);
  if (typeof persist === 'function') persist();
  if (typeof render === 'function') render();
  return { ok: true, program: DATA };
}
`;

let buildMasterCode = fs.readFileSync('build_master22.mjs', 'utf8');

if (!buildMasterCode.includes('function calculateSetVolume')) {
  buildMasterCode = buildMasterCode.replace('const ProgramService = {', helperCode + '\nconst ProgramService = {');
  fs.writeFileSync('build_master22.mjs', buildMasterCode, 'utf8');
  console.log('Successfully injected calculation engine helpers into build_master22.mjs');
} else {
  console.log('Helpers already present in build_master22.mjs');
}
