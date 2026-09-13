import fs from 'fs';

let html = fs.readFileSync('web/index.html', 'utf8');

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
    const eK = \`w\${weekNum}_d\${dayIndex}_e\${ri}\`;
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

function calculateEffectiveIntensityVolume(weekNum, dayIndex) {
  const w = DATA?.weeks?.[weekNum - 1];
  const d = (w?.sessions || w?.days)?.[dayIndex];
  if (!d) return 0;
  let totalEff = 0;
  const exercises = d.exercises || d.rows || [];
  exercises.forEach((row, ri) => {
    const eK = \`w\${weekNum}_d\${dayIndex}_e\${ri}\`;
    if (store.skips && store.skips[eK]) return;
    const isPart = store.loadTypes && store.loadTypes[eK] === 'part';
    const mult = isPart ? 2 : 1;
    const setsCount = getExerciseSetCount ? getExerciseSetCount(ri) : 3;
    for (let s = 1; s <= setsCount; s++) {
      const l = parseFloat(store.data?.[eK + '_s' + s + '_load'] || 0);
      const r = parseInt(store.data?.[eK + '_s' + s + '_reps'] || 0, 10);
      const rir = parseFloat(store.data?.[eK + '_s' + s + '_rir'] || 0);
      if (l > 0 && r > 0) {
        totalEff += l * (r + (10 - Math.min(10, Math.max(0, rir)))) * mult;
      }
    }
  });
  return Math.round(totalEff * 10) / 10;
}

function closeSkipModal() {
  if ($('skip-modal')) $('skip-modal').style.display = 'none';
}

function saveSkipReason(exerciseIndex, reason) {
  store.skips[\`w\${currentWeek}_d\${currentDay}_e\${exerciseIndex}\`] = reason;
  persist();
  closeSkipModal();
  render();
}

function closeReplacementModal() {
  if ($('replace-modal')) $('replace-modal').style.display = 'none';
}

function applyExerciseReplacement(exerciseIndex, newExerciseName) {
  store.subs[\`w\${currentWeek}_d\${currentDay}_e\${exerciseIndex}\`] = newExerciseName;
  persist();
  closeReplacementModal();
  render();
}

function resetTimer() {
  stopTimer();
  timerSeconds = 0;
  updateTimerDisplay();
}

function speakText(text) {
  return speakCoachReply(text);
}

function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

async function confirmAndActivateProgram(canonicalProgram, filename = 'programma_importato') {
  return await importProgramJson(canonicalProgram, filename);
}
`;

// Insert helperCode before LAYER 2 in web/index.html
if (!html.includes('function calculateEpley1RM')) {
  const insertMarker = '// LAYER 2: APPLICATION SERVICES DEFINITIONS';
  const pos = html.indexOf(insertMarker);
  if (pos !== -1) {
    html = html.slice(0, pos) + helperCode + '\n' + html.slice(pos);
  } else {
    const initPos = html.lastIndexOf('init();');
    html = html.slice(0, initPos) + helperCode + '\n' + html.slice(initPos);
  }
}

fs.writeFileSync('web/index.html', html, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');
console.log('✓ Injected calculation engine helpers and modal controllers into web/index.html and app/src/main/assets/index.html.');
