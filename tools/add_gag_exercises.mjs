// One-off, kept for the record: adds to the library the lower-body and core movements of the Booty By Bret
// exercise list that the library did not have (04-10-2026). Only base movements: the techniques of that list
// (pause, tempo, eccentric, pulse, drop set, deficit, 1 1/4...) are ways of doing an exercise, not other exercises.
//
//   node tools/add_gag_exercises.mjs          writes web/exercise-catalog-extra.js, web/exercise-taxonomy.js,
//                                             data/youtube-links.json (search link only: no unverified demo)
// Safe to run twice: what is already there is left alone.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const read = (f) => { const s = fs.readFileSync(path.join(root, f), 'utf8'); return { text: s.replace(/\r\n/g, '\n'), crlf: s.includes('\r\n') }; };
const write = (f, o, text) => fs.writeFileSync(path.join(root, f), o.crlf ? text.replace(/\n/g, '\r\n') : text);

// name (IT) | en | muscle | catalog equipment | aliases | taxonomy [pattern, role, equip, level, also] | section of the taxonomy
const NEW = [
  // --- hip extension: thrusts, bridges, reverse hypers ---
  ['Hip thrust manubrio', 'Dumbbell Hip Thrust', 'GLUTEI', 'manubri', ['hip thrust con manubrio'], ['glute', 'secondary', 'dumbbell', 0], 'glutes'],
  ['Hip thrust piedi rialzati', 'Feet-Elevated Hip Thrust', 'GLUTEI', 'bilanciere', ['feet elevated hip thrust'], ['glute', 'secondary', 'barbell', 1], 'glutes'],
  ['B-stance hip thrust', 'B-Stance Hip Thrust', 'GLUTEI', 'manubri', ['hip thrust b-stance', 'hip thrust con gamba di appoggio'], ['glute', 'secondary', 'dumbbell', 1], 'glutes'],
  ['Hip thrust con elastico', 'Banded Hip Thrust', 'GLUTEI', 'bilanciere', ['hip thrust elastico alle ginocchia', 'knee banded hip thrust'], ['glute', 'secondary', 'barbell', 1], 'glutes'],
  ['Glute bridge con elastico', 'Banded Glute Bridge', 'GLUTEI', 'elastici', ['ponte glutei con elastico', 'knee banded glute bridge'], ['glute', 'secondary', 'band', 0], 'glutes'],
  ['Glute bridge bilanciere', 'Barbell Glute Bridge', 'GLUTEI', 'bilanciere', ['ponte glutei con bilanciere'], ['glute', 'secondary', 'barbell', 0], 'glutes'],
  ['Glute bridge manubrio', 'Dumbbell Glute Bridge', 'GLUTEI', 'manubri', ['ponte glutei con manubrio'], ['glute', 'secondary', 'dumbbell', 0], 'glutes'],
  ['Glute bridge piedi rialzati', 'Feet-Elevated Glute Bridge', 'GLUTEI', 'corpo libero', ['ponte glutei piedi sul rialzo'], ['glute', 'secondary', 'bodyweight', 1], 'glutes'],
  ['Reverse hyper', 'Reverse Hyperextension', 'GLUTEI', 'macchina', ['reverse hyperextension', 'iperestensione inversa'], ['glute', 'secondary', 'machine', 1], 'glutes'],
  ['Reverse hyper su panca', 'Bench Reverse Hyperextension', 'GLUTEI', 'panca', ['iperestensione inversa su panca'], ['glute', 'secondary', 'bench', 1], 'glutes'],
  ['Iperestensione 45° glutei', 'Glute-Focus 45° Back Extension', 'GLUTEI', 'panca', ['45 degree hyperextension', 'back extension glutei'], ['glute', 'secondary', 'bench', 0], 'glutes'],
  // --- kickbacks, abductions ---
  ['Kickback cavo in ginocchio', 'Kneeling Cable Glute Kickback', 'GLUTEI', 'cavi', ['cable kneeling glute kickback'], ['glute', 'iso', 'cable', 0], 'glutes'],
  ['Donkey kick', 'Donkey Kick', 'GLUTEI', 'corpo libero', ['quadruped hip extension', 'calcio all’indietro in quadrupedia'], ['glute', 'iso', 'bodyweight', 0, ['band']], 'glutes'],
  ['Fire hydrant', 'Fire Hydrant', 'GLUTEI', 'corpo libero', ['fire hydrant con elastico', 'idrante'], ['glute', 'iso', 'bodyweight', 0, ['band']], 'glutes'],
  ['Clam shell', 'Side-Lying Clam', 'GLUTEI', 'corpo libero', ['clam', 'conchiglia', 'clamshell'], ['glute', 'iso', 'bodyweight', 0, ['band']], 'glutes'],
  ['Abduzione sdraiata sul fianco', 'Side-Lying Hip Abduction', 'GLUTEI', 'corpo libero', ['side lying hip abduction', 'abduzione anca sul fianco'], ['glute', 'iso', 'bodyweight', 0, ['band']], 'glutes'],
  ['Abduzione in piedi con elastico', 'Standing Band Hip Abduction', 'GLUTEI', 'elastici', ['standing hip abduction', 'abduzione anca in piedi'], ['glute', 'iso', 'band', 0], 'glutes'],
  ['Abduzione ai cavi in piedi', 'Standing Cable Hip Abduction', 'GLUTEI', 'cavi', ['cable standing hip abduction'], ['glute', 'iso', 'cable', 0], 'glutes'],
  ['Abduzione seduta con elastico', 'Seated Band Hip Abduction', 'GLUTEI', 'elastici', ['band seated hip abduction'], ['glute', 'iso', 'band', 0], 'glutes'],
  ['Lateral band walk', 'Lateral Band Walk', 'GLUTEI', 'elastici', ['camminata laterale con elastico', 'side step con elastico'], ['glute', 'iso', 'band', 0], 'glutes'],
  ['Monster walk', 'Monster Walk', 'GLUTEI', 'elastici', ['camminata del mostro', 'band monster walk'], ['glute', 'iso', 'band', 0], 'glutes'],
  ['Hip hike', 'Hip Hike', 'GLUTEI', 'corpo libero', ['hip hike sul gradino'], ['glute', 'iso', 'bodyweight', 1], 'glutes'],
  // --- squats, lunges, steps ---
  ['Sumo squat', 'Dumbbell Sumo Squat', 'QUADRICIPITI', 'manubri', ['squat sumo', 'plié squat', 'plie squat', 'sumo squat manubrio'], ['squat', 'secondary', 'dumbbell', 0, ['kettlebell']], 'squat'],
  ['Front squat manubri', 'Dumbbell Front Squat', 'QUADRICIPITI', 'manubri', ['db front squat'], ['squat', 'main', 'dumbbell', 1], 'squat'],
  ['Curtsy lunge', 'Curtsy Lunge', 'GLUTEI', 'manubri', ['affondo incrociato', 'curtsy affondo'], ['lunge', 'secondary', 'dumbbell', 1, ['bodyweight']], 'lunge'],
  ['Lateral lunge', 'Lateral Lunge', 'QUADRICIPITI', 'manubri', ['affondo laterale'], ['lunge', 'secondary', 'dumbbell', 0, ['bodyweight']], 'lunge'],
  ['Affondi bilanciere', 'Barbell Lunge', 'QUADRICIPITI', 'bilanciere', ['affondi con bilanciere', 'barbell reverse lunge'], ['lunge', 'secondary', 'barbell', 1], 'lunge'],
  ['High step-up', 'High Step-Up', 'GLUTEI', 'manubri', ['step-up alto', 'step up alto'], ['lunge', 'secondary', 'dumbbell', 1], 'lunge'],
  ['Skater squat', 'Skater Squat', 'QUADRICIPITI', 'corpo libero', ['squat del pattinatore'], ['lunge', 'secondary', 'bodyweight', 2], 'lunge'],
  ['Single-leg box squat', 'Single-Leg Box Squat', 'QUADRICIPITI', 'corpo libero', ['squat monopodalico su panca'], ['lunge', 'secondary', 'bodyweight', 1], 'lunge'],
  // --- hinges and hamstrings ---
  ['Stacco rumeno manubri', 'Dumbbell Romanian Deadlift', 'FEMORALI', 'manubri', ['db rdl', 'rdl manubri'], ['hinge', 'main', 'dumbbell', 0], 'hinge'],
  ['B-stance RDL', 'B-Stance Romanian Deadlift', 'FEMORALI', 'manubri', ['rdl b-stance', 'stacco rumeno con gamba di appoggio'], ['hinge', 'secondary', 'dumbbell', 1], 'hinge'],
  ['Leg curl con slider', 'Slider Leg Curl', 'FEMORALI', 'corpo libero', ['sliding leg curl', 'gliding leg curl', 'leg curl sul pavimento'], ['hamIso', 'secondary', 'bodyweight', 1], 'legs'],
  ['Leg curl con fitball', 'Stability Ball Leg Curl', 'FEMORALI', 'palla', ['stability ball leg curl', 'leg curl con palla'], ['hamIso', 'secondary', 'tool', 1], 'legs'],
  ['Leg curl manubrio', 'Dumbbell Lying Leg Curl', 'FEMORALI', 'manubri', ['db lying leg curl'], ['hamIso', 'iso', 'dumbbell', 1], 'legs'],
  // --- core ---
  ['RKC plank', 'RKC Plank', 'ADDOME', 'corpo libero', ['plank rkc'], ['core', 'iso', 'bodyweight', 1], 'core']
];

const SECTION_ANCHOR = {
  glutes: "    ['Adductor machine', 'adductor', 'iso', 'machine', 0],\n",
  squat: "    ['Sissy squat', 'quadIso', 'iso', 'bodyweight', 2],\n",
  hinge: "    ['Hyperextension', 'hinge', 'iso', 'bench', 0],\n",
  lunge: "    ['Pistol squat assistito', 'lunge', 'secondary', 'bodyweight', 1],\n",
  legs: "    ['Glute ham raise', 'hamIso', 'secondary', 'machine', 2],\n",
  core: "    ['Side plank', 'core', 'iso', 'bodyweight', 0],\n"
};

// ---- the web catalogue
const cat = read('web/exercise-catalog-extra.js');
let ctext = cat.text;
const existing = new Set([...ctext.matchAll(/\{ name: "([^"]+)"/g)].map((m) => m[1]));
const lines = [];
for (const [name, en, muscle, eq, aliases] of NEW) {
  if (existing.has(name)) continue;
  lines.push('  { name: ' + JSON.stringify(name) + ', en: ' + JSON.stringify(en) + ', muscle: "' + muscle + '", eq: "' + eq + '"' + (aliases.length ? ', aliases: ' + JSON.stringify(aliases) : '') + ' },\n');
}
if (lines.length) {
  const at = ctext.indexOf('\n];');
  if (at < 0) throw new Error('catalogue end not found');
  ctext = ctext.slice(0, at + 1) + lines.join('') + ctext.slice(at + 1);
}
// "Criss cross" is the Pilates bicycle crunch.
ctext = ctext.replace(/(\{ name: "Criss cross", en: "Pilates Criss Cross", muscle: "ADDOME", eq: "tappetino")( \},)/, (m, a, b) => (m.includes('aliases') ? m : a + ', aliases: ["bicycle crunch", "crunch a bicicletta"]' + b));
write('web/exercise-catalog-extra.js', cat, ctext);

// ---- the taxonomy
const tax = read('web/exercise-taxonomy.js');
let ttext = tax.text;
const taxHas = (n) => ttext.includes("['" + n.replace(/'/g, "\\'") + "',");
const bySection = {};
for (const row of NEW) {
  if (taxHas(row[0])) continue;
  const t = row[5];
  const also = t[4] ? ", " + JSON.stringify(t[4]).replace(/"/g, "'") : '';
  (bySection[row[6]] = bySection[row[6]] || []).push("    ['" + row[0].replace(/'/g, "\\'") + "', '" + t[0] + "', '" + t[1] + "', '" + t[2] + "', " + t[3] + also + "],\n");
}
for (const sec of Object.keys(bySection)) {
  const anchor = SECTION_ANCHOR[sec];
  if (!ttext.includes(anchor)) throw new Error('taxonomy anchor missing: ' + sec);
  ttext = ttext.replace(anchor, anchor + bySection[sec].join(''));
}
write('web/exercise-taxonomy.js', tax, ttext);

// ---- the YouTube search links (no demo: a wrong video is worse than none)
const yt = read('data/youtube-links.json');
const list = JSON.parse(yt.text);
const have = new Set(list.map((e) => e.type + ':' + e.name));
let added = 0;
for (const [name, en, muscle] of NEW) {
  if (have.has('exercise:' + name)) continue;
  list.push({ name, en, muscle, type: 'exercise', youtube_demo: null, youtube_query: en + ' exercise how to' });
  added++;
}
write('data/youtube-links.json', yt, JSON.stringify(list, null, 1) + '\n');
console.log('catalogue +' + lines.length + ', taxonomy +' + Object.values(bySection).reduce((n, a) => n + a.length, 0) + ', youtube +' + added);
