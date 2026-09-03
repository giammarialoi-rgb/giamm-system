/**
 * Full-coverage science catalog:
 * days × split × goal × equipment × experience × audience × duration × progression
 * = 5 × 3 × 5 × 5 × 3 × 3 × 6 × 5 = 101_250 selectable programs
 * Unique week-1 templates: 5 × 3 × 5 × 5 × 3 × 3 = 3_375 (shared via body_ref)
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { expandScienceProgramWeeks } from './science-program-engine.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const WEB_INDEX = path.join(ROOT, 'web', 'program-catalog-index.json');
const WEB_BODY = path.join(ROOT, 'web', 'program-catalog-body.json');
const ASSETS_INDEX = path.join(ROOT, 'app', 'src', 'main', 'assets', 'program-catalog-index.json');
const ASSETS_BODY = path.join(ROOT, 'app', 'src', 'main', 'assets', 'program-catalog-body.json');

const DAYS_LIST = [2, 3, 4, 5, 6];
const SPLITS = ['fullbody', 'monofrequency', 'upper_lower'];
const SPLIT_LABEL = { fullbody: 'Full body', monofrequency: 'Monofrequenza', upper_lower: 'Upper/Lower' };
const GOALS = ['ipertrofia', 'forza', 'powerbuilding', 'recomp', 'cut'];
const EQUIPMENT = ['palestra', 'casa', 'minimal', 'kettlebell', 'bodyweight'];
const DURATIONS = [4, 6, 8, 10, 12, 16];
const EXPERIENCE = ['principiante', 'intermedio', 'avanzato'];
const AUDIENCE = [
  { id: 'unisex', sex: 'unisex', label: 'Unisex', focusBoost: null },
  { id: 'female', sex: 'female_glute', label: 'Donna', focusBoost: 'glutei' },
  { id: 'male', sex: 'male_upper', label: 'Uomo', focusBoost: 'petto' }
];
const PROG = ['linear', 'double', 'volume_wave', 'dup', 'block'];
const PROG_LABEL = {
  linear: 'Lineare', double: 'Doppia progressione', volume_wave: 'Onda volume', dup: 'DUP', block: 'Blocchi'
};

const EXPECTED_TEMPLATES = DAYS_LIST.length * SPLITS.length * GOALS.length * EQUIPMENT.length * EXPERIENCE.length * AUDIENCE.length;
const EXPECTED_PROGRAMS = EXPECTED_TEMPLATES * DURATIONS.length * PROG.length;

const GYM = {
  squat: ['Squat', 'Hack squat', 'Leg press', 'Goblet squat'],
  hinge: ['Stacco rumeno', 'Stacco', 'Good morning', 'Hip thrust'],
  pushH: ['Panca piana', 'Panca inclinata manubri', 'Dip', 'Panca inclinata'],
  pushV: ['Military press', 'Spinte manubri spalle', 'Lento avanti'],
  pullV: ['Trazioni', 'Lat machine', 'Pulldown neutro'],
  pullH: ['Rematore bilanciere', 'Rematore manubrio', 'Pulley basso'],
  delts: ['Alzate laterali', 'Face pull', 'Rear delt fly'],
  arms: ['Curl bilanciere', 'Ext tricipiti', 'Curl martello', 'Skull crusher'],
  legsIso: ['Leg curl', 'Leg extension', 'Calf raise', 'Affondi', 'Affondi bulgari'],
  glute: ['Hip thrust', 'Kickback cavo', 'Abductor', 'Step-up', 'Hip thrust unilaterale'],
  uni: ['Affondi bulgari', 'RDL monopodalico', 'Step-up', 'Leg press unilaterale'],
  core: ['Plank', 'Dead bug', 'Ab wheel']
};
const HOME = {
  squat: ['Squat a corpo libero', 'Goblet squat', 'Affondi'],
  hinge: ['Hip thrust a terra', 'Stacco manubri', 'Good morning elastico'],
  pushH: ['Push-up', 'Panca manubri', 'Floor press'],
  pushV: ['Pike push-up', 'Military press manubri'],
  pullV: ['Trazioni', 'Pulldown elastico'],
  pullH: ['Rematore elastico', 'Inverted row'],
  delts: ['Alzate laterali manubri', 'Face pull elastico'],
  arms: ['Curl manubri', 'Ext tricipiti overhead'],
  legsIso: ['Affondi', 'Calf raise', 'Nordic assistito'],
  glute: ['Hip thrust a terra', 'Glute bridge', 'Kickback elastico', 'Frog pump'],
  uni: ['Affondi bulgari', 'Step-up', 'Pistol assistito', 'RDL monopodalico'],
  core: ['Plank', 'Hollow hold']
};
const KB = {
  squat: ['Goblet squat', 'Kettlebell squat'],
  hinge: ['Kettlebell swing', 'Kettlebell deadlift'],
  pushH: ['Kettlebell floor press', 'Push-up'],
  pushV: ['Kettlebell press', 'Kettlebell clean & press'],
  pullV: ['Trazioni', 'Kettlebell pullover'],
  pullH: ['Kettlebell row', 'Gorilla row'],
  delts: ['Kettlebell halo', 'Alzate laterali KB'],
  arms: ['Kettlebell curl', 'Kettlebell tricep press'],
  legsIso: ['Kettlebell lunge', 'Calf raise'],
  glute: ['Kettlebell swing', 'Hip thrust KB'],
  uni: ['Kettlebell lunge', 'Single arm KB row'],
  core: ['Turkish get-up', 'Plank']
};
const BW = {
  squat: ['Squat a corpo libero', 'Pistol assistito', 'Jump squat'],
  hinge: ['Hip hinge', 'Nordic curl assistito'],
  pushH: ['Push-up', 'Diamond push-up', 'Archer push-up'],
  pushV: ['Pike push-up', 'Handstand hold'],
  pullV: ['Trazioni', 'Chin-up'],
  pullH: ['Inverted row', 'Towel row'],
  delts: ['Pike push-up', 'Y raise a terra'],
  arms: ['Diamond push-up', 'Chin-up'],
  legsIso: ['Affondi', 'Calf raise', 'Step-up'],
  glute: ['Hip thrust a terra', 'Frog pump'],
  uni: ['Pistol assistito', 'Affondi', 'Single-leg bridge'],
  core: ['Plank', 'Hollow rock']
};

function pool(equipment) {
  if (equipment === 'kettlebell') return KB;
  if (equipment === 'bodyweight') return BW;
  if (equipment === 'casa' || equipment === 'minimal') return HOME;
  return GYM;
}

function pick(arr, i) {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

function hashFp(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 16);
}

function sessionNames(split, days) {
  if (split === 'fullbody') {
    return Array.from({ length: days }, (_, i) => `Full Body ${String.fromCharCode(65 + i)}`);
  }
  if (split === 'upper_lower') {
    if (days === 2) return ['Upper', 'Lower'];
    if (days === 3) return ['Upper A', 'Lower', 'Upper B'];
    if (days === 4) return ['Upper A', 'Lower A', 'Upper B', 'Lower B'];
    if (days === 5) return ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Upper C'];
    return ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Upper C', 'Lower C'];
  }
  if (days === 2) return ['Torso', 'Gambe + Braccia'];
  if (days === 3) return ['Push', 'Pull', 'Legs'];
  if (days === 4) return ['Petto', 'Dorso', 'Gambe', 'Spalle + Braccia'];
  if (days === 5) return ['Petto', 'Dorso', 'Spalle', 'Gambe', 'Braccia'];
  return ['Petto', 'Dorso', 'Spalle', 'Quadricipiti', 'Catena posteriore', 'Braccia'];
}

function schemeFor(goal, experience, role) {
  const beginner = experience === 'principiante';
  if (goal === 'forza' && role === 'compound') {
    return { sets: beginner ? 3 : 4, reps: '4-6', rir: 2, rest: 180, tempo: '10X0' };
  }
  if (goal === 'powerbuilding' && role === 'compound') {
    return { sets: 4, reps: '5-8', rir: 2, rest: 150, tempo: '2010' };
  }
  if (goal === 'cut') {
    return role === 'compound'
      ? { sets: 3, reps: '8-12', rir: 2, rest: 75, tempo: '2010' }
      : { sets: 2, reps: '12-15', rir: 2, rest: 45, tempo: '3010' };
  }
  if (role === 'compound') {
    return { sets: beginner ? 3 : 4, reps: '6-10', rir: 2, rest: 120, tempo: '3010' };
  }
  return { sets: beginner ? 2 : 3, reps: '10-15', rir: 2, rest: 75, tempo: '3010' };
}

function addEx(list, name, goal, exp, role) {
  if (!name || list.some((e) => e.name === name)) return;
  const s = schemeFor(goal, exp, role);
  list.push({
    name,
    sets_count: s.sets,
    reps_target: s.reps,
    rir: s.rir,
    rest_sec: s.rest,
    tempo: s.tempo,
    role
  });
}

function buildSession(name, split, days, equipment, goal, sex, slot, exp) {
  const P = pool(equipment);
  const sn = name.toLowerCase();
  const ex = [];
  const isUpper = /upper|torso|push|pull|petto|dorso|spalle|braccia/.test(sn) && !/gambe|legs|lower|quad|posteriore/.test(sn);
  const isLower = /lower|gambe|legs|quad|posteriore|catena/.test(sn);
  const isFB = split === 'fullbody';
  const female = sex === 'female_glute';
  const male = sex === 'male_upper';

  if (isFB || (/torso/.test(sn) && /gambe/.test(sn))) {
    addEx(ex, pick(P.squat, slot), goal, exp, 'compound');
    addEx(ex, pick(P.pushH, slot), goal, exp, 'compound');
    addEx(ex, pick(P.pullH, slot + 1), goal, exp, 'compound');
    addEx(ex, pick(P.hinge, slot), goal, exp, 'compound');
    addEx(ex, pick(P.pushV, slot), goal, exp, 'accessory');
    if (female) addEx(ex, pick(P.glute, slot), goal, exp, 'accessory');
    else addEx(ex, pick(P.pullV, slot), goal, exp, 'accessory');
    if (female) addEx(ex, pick(P.uni, slot), goal, exp, 'accessory');
    if (male) addEx(ex, pick(P.pushH, slot + 2), goal, exp, 'accessory');
    if (days <= 4) addEx(ex, pick(P.core, slot), goal, exp, 'accessory');
  } else if (isUpper || /push/.test(sn) || (/petto/.test(sn) && !/dorso/.test(sn))) {
    if (/pull|dorso/.test(sn) && !/push|petto/.test(sn)) {
      addEx(ex, pick(P.pullV, slot), goal, exp, 'compound');
      addEx(ex, pick(P.pullH, slot), goal, exp, 'compound');
      addEx(ex, pick(P.pullH, slot + 1), goal, exp, 'accessory');
      addEx(ex, pick(P.delts, slot), goal, exp, 'accessory');
      addEx(ex, pick(P.arms, slot), goal, exp, 'accessory');
    } else if (/spalle/.test(sn) && !/braccia/.test(sn)) {
      addEx(ex, pick(P.pushV, slot), goal, exp, 'compound');
      addEx(ex, pick(P.pushV, slot + 1), goal, exp, 'accessory');
      addEx(ex, pick(P.delts, slot), goal, exp, 'accessory');
      addEx(ex, pick(P.delts, slot + 1), goal, exp, 'accessory');
      addEx(ex, pick(P.pushH, slot), goal, exp, 'accessory');
    } else if (/braccia/.test(sn) && !/spalle \+/.test(sn)) {
      addEx(ex, pick(P.arms, slot), goal, exp, 'compound');
      addEx(ex, pick(P.arms, slot + 1), goal, exp, 'accessory');
      addEx(ex, pick(P.arms, slot + 2), goal, exp, 'accessory');
      addEx(ex, pick(P.pushH, slot), goal, exp, 'accessory');
      addEx(ex, pick(P.pullV, slot), goal, exp, 'accessory');
    } else if (/petto/.test(sn)) {
      addEx(ex, pick(P.pushH, slot), goal, exp, 'compound');
      addEx(ex, pick(P.pushH, slot + 1), goal, exp, 'compound');
      addEx(ex, pick(P.pushH, slot + 2), goal, exp, 'accessory');
      addEx(ex, pick(P.pushV, slot), goal, exp, 'accessory');
      addEx(ex, pick(P.arms, 2), goal, exp, 'accessory');
    } else {
      addEx(ex, pick(P.pushH, slot), goal, exp, 'compound');
      addEx(ex, pick(P.pullV, slot), goal, exp, 'compound');
      addEx(ex, pick(P.pushV, slot), goal, exp, 'compound');
      addEx(ex, pick(P.pullH, slot), goal, exp, 'compound');
      addEx(ex, pick(P.delts, slot), goal, exp, 'accessory');
      if (male) addEx(ex, pick(P.pushH, slot + 2), goal, exp, 'accessory');
      addEx(ex, pick(P.arms, slot), goal, exp, 'accessory');
    }
  } else if (isLower || /quad/.test(sn) || /posteriore/.test(sn) || /legs/.test(sn)) {
    if (/posteriore/.test(sn)) {
      addEx(ex, pick(P.hinge, slot), goal, exp, 'compound');
      addEx(ex, pick(P.glute, slot), goal, exp, 'compound');
      addEx(ex, pick(P.legsIso, 0), goal, exp, 'accessory');
      addEx(ex, pick(P.uni, slot), goal, exp, 'accessory');
      if (female) addEx(ex, pick(P.glute, slot + 1), goal, exp, 'accessory');
    } else if (/quad/.test(sn)) {
      addEx(ex, pick(P.squat, slot), goal, exp, 'compound');
      addEx(ex, pick(P.squat, slot + 1), goal, exp, 'compound');
      addEx(ex, pick(P.legsIso, 1), goal, exp, 'accessory');
      addEx(ex, pick(P.uni, slot), goal, exp, 'accessory');
    } else {
      addEx(ex, pick(P.squat, slot), goal, exp, 'compound');
      addEx(ex, pick(P.hinge, slot), goal, exp, 'compound');
      addEx(ex, pick(P.uni, slot), goal, exp, 'accessory');
      addEx(ex, pick(P.glute, slot), goal, exp, 'accessory');
      addEx(ex, pick(P.legsIso, 0), goal, exp, 'accessory');
      if (female) addEx(ex, pick(P.glute, slot + 1), goal, exp, 'accessory');
      if (/braccia/.test(sn)) addEx(ex, pick(P.arms, slot), goal, exp, 'accessory');
      addEx(ex, pick(P.core, slot), goal, exp, 'accessory');
    }
  } else if (/spalle \+|spalle \+ braccia/.test(sn) || /spalle \+/.test(name.toLowerCase())) {
    addEx(ex, pick(P.pushV, slot), goal, exp, 'compound');
    addEx(ex, pick(P.delts, slot), goal, exp, 'accessory');
    addEx(ex, pick(P.arms, slot), goal, exp, 'accessory');
    addEx(ex, pick(P.arms, slot + 1), goal, exp, 'accessory');
  }

  if (split === 'fullbody' && days >= 5 && ex.length > 5) ex.length = 5;
  if (split === 'fullbody' && days === 6 && ex.length > 4) ex.length = 4;
  if (ex.length < 4) {
    addEx(ex, pick(P.core, slot + 3), goal, exp, 'accessory');
    addEx(ex, pick(P.delts, slot + 2), goal, exp, 'accessory');
  }
  return { name, exercises: ex };
}

function progressionSummary(model) {
  return PROG_LABEL[model] + ': volume, RIR, tempo e riposi cambiano settimana per settimana; deload ogni 4ª.';
}

function buildTemplate(days, split, goal, equipment, experience, audience, slot) {
  const sex = audience.sex;
  const names = sessionNames(split, days);
  const sessions = names.map((n, si) => buildSession(n, split, days, equipment, goal, sex, slot + si, experience));
  const goals = [...new Set([goal, audience.focusBoost].filter(Boolean))];
  if (sex === 'female_glute' && !goals.includes('glutei')) goals.push('glutei');
  if (sex === 'male_upper' && !goals.includes('petto')) goals.push('petto');
  if (goal === 'cut') goals.push('dimagrimento');

  const bodyId = `tpl_${hashFp([days, split, goal, equipment, experience, audience.id].join('|'))}`;
  let exCount = 0;
  let setCount = 0;
  sessions.forEach((s) => {
    exCount += s.exercises.length;
    s.exercises.forEach((e) => { setCount += e.sets_count; });
  });

  const body = {
    id: bodyId,
    weeks: [{ week_number: 1, label: 'Settimana 1 · template', sessions }],
    days_per_week: days,
    split,
    goals,
    equipment,
    experience,
    purpose: goal,
    source: 'science_v2',
    sex_focus: sex,
    audience: audience.id,
    notes: [
      'Volume settimanale target ≥10 serie/muscolo (Schoenfeld 2016; umbrella review 2022).',
      'Frequenza scelta per preferenza: a volume equated la crescita è simile (Schoenfeld 2019 JSS).',
      'Sforzo RIR 2–3; failure non obbligatorio (ACSM Position Stand 2026).',
      'Compound first. Carichi in %/RIR, non kg personali.',
      audience.id === 'female' ? 'Focus femminile: volume glutei/lower + unilaterali.' : '',
      audience.id === 'male' ? 'Focus maschile: volume upper/petto prioritizzato.' : ''
    ].filter(Boolean)
  };

  return { bodyId, body, goals, exCount, setCount, sessions };
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data), 'utf8');
}

function main() {
  console.log('=== generate_science_programs full coverage ===');
  console.log('Expected templates', EXPECTED_TEMPLATES, 'programs', EXPECTED_PROGRAMS);

  const programs = [];
  const bodyDoc = {};
  let globalI = 0;
  let slot = 0;
  let maxBody = 0;

  for (const days of DAYS_LIST) {
    for (const split of SPLITS) {
      for (const goal of GOALS) {
        for (const equipment of EQUIPMENT) {
          for (const experience of EXPERIENCE) {
            for (const audience of AUDIENCE) {
              const tpl = buildTemplate(days, split, goal, equipment, experience, audience, slot++);
              const size = JSON.stringify(tpl.body).length;
              if (size > maxBody) maxBody = size;
              if (size > 16000) throw new Error('Body too large ' + tpl.bodyId + ' ' + size);
              bodyDoc[tpl.bodyId] = tpl.body;

              for (const duration of DURATIONS) {
                for (const progression of PROG) {
                  globalI += 1;
                  const id = `sci_${String(globalI).padStart(6, '0')}`;
                  const title = `${audience.label} · ${SPLIT_LABEL[split]} · ${goal} · ${days} gg · ${duration} sett · ${PROG_LABEL[progression]} · ${experience} · ${equipment}`;
                  programs.push({
                    id,
                    body_ref: tpl.bodyId,
                    title,
                    days_per_week: days,
                    duration_weeks: duration,
                    split,
                    goals: tpl.goals,
                    equipment,
                    sessions: days,
                    exercises: tpl.exCount,
                    sets: tpl.setCount,
                    purpose: goal,
                    fingerprint: hashFp(id),
                    source_ext: '.science',
                    experience,
                    progression_model: progression,
                    sex_focus: audience.sex,
                    audience: audience.id
                  });
                }
              }
            }
          }
        }
      }
    }
    console.log('  days=' + days + ' templates so far ' + Object.keys(bodyDoc).length);
  }

  if (Object.keys(bodyDoc).length !== EXPECTED_TEMPLATES) {
    throw new Error('templates ' + Object.keys(bodyDoc).length + ' != ' + EXPECTED_TEMPLATES);
  }
  if (programs.length !== EXPECTED_PROGRAMS) {
    throw new Error('programs ' + programs.length + ' != ' + EXPECTED_PROGRAMS);
  }

  const sampleEntry = programs[0];
  const sampleBody = {
    ...bodyDoc[sampleEntry.body_ref],
    duration_weeks: sampleEntry.duration_weeks,
    progression: { model: sampleEntry.progression_model, deload_every: 4 },
    progression_model: sampleEntry.progression_model
  };
  const expanded = expandScienceProgramWeeks(sampleBody);
  if (expanded.length !== sampleEntry.duration_weeks) throw new Error('expand length');

  const indexDoc = {
    version: 4,
    generated_at: new Date().toISOString(),
    imported: 0,
    science_v2: {
      count: EXPECTED_PROGRAMS,
      templates: EXPECTED_TEMPLATES,
      coverage: {
        days: DAYS_LIST,
        splits: SPLITS,
        goals: GOALS,
        equipment: EQUIPMENT,
        experience: EXPERIENCE,
        audience: AUDIENCE.map((a) => a.id),
        durations: DURATIONS,
        progressions: PROG
      },
      max_body_bytes: maxBody,
      evidence: ['Schoenfeld 2016 volume', 'Schoenfeld 2019 frequency volume-equated', 'ACSM 2026 RIR 2-3 progressive overload']
    },
    programs
  };

  writeJson(WEB_INDEX, indexDoc);
  writeJson(WEB_BODY, bodyDoc);
  if (fs.existsSync(path.dirname(ASSETS_INDEX))) {
    writeJson(ASSETS_INDEX, indexDoc);
    writeJson(ASSETS_BODY, bodyDoc);
    console.log('Synced assets');
  }
  console.log('Total', programs.length, 'templates', EXPECTED_TEMPLATES, 'max body', maxBody,
    'idxKB', Math.round(fs.statSync(WEB_INDEX).size / 1024),
    'bodyKB', Math.round(fs.statSync(WEB_BODY).size / 1024));
}

main();
