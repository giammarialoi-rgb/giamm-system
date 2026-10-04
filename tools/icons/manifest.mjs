// The icon set of the app, as a list: what each icon is, where it appears, how big it is shown and
// which emoji / character it replaces. It is the single source for the prompt given to the image
// model (make_prompt.mjs) and for the check of the delivered files (check.mjs).
//
// grid "ui": viewBox 0 0 24 24, stroke 1.75.  grid "art": viewBox 0 0 64 64, stroke 2.5 (empty states).
// size: the size, in CSS px, at which it is shown.
export const GRIDS = {
  ui: { viewBox: '0 0 24 24', stroke: 1.75, live: '2 to 22 (a 2px margin on every side)' },
  art: { viewBox: '0 0 64 64', stroke: 2.5, live: '4 to 60 (a 4px margin on every side)' }
};

const ui = (id, group, size, draw, usage, replaces = '') => ({ id, group, grid: 'ui', size, draw, usage, replaces });
const art = (id, group, size, draw, usage, replaces = '') => ({ id, group, grid: 'art', size, draw, usage, replaces });

export const ICONS = [
  // --- 1. The eight modules of the Home page (tiles, 28px)
  ui('module-nutrition', 'home-modules', 28, 'a plate seen from above with a fork on the left and a leaf on the right', 'Home tile "Alimentazione"; Alimentazione title', '🥗 🍽'),
  ui('module-supplements', 'home-modules', 28, 'a capsule lying diagonally next to a round tablet', 'Home tile "Integrazione"', '💊'),
  ui('module-therapy', 'home-modules', 28, 'a stethoscope (two ear tubes joining into one tube that ends in a round chest piece)', 'Home tile "Terapia medica"', '🩺'),
  ui('module-exams', 'home-modules', 28, 'a lab test tube with a drop and two level marks', 'Home tile "Esami lab"', '🧪'),
  ui('module-calendar', 'home-modules', 28, 'a wall calendar with two binder rings on top and a small grid of dots', 'Home tile "Calendario"; Alimentazione "aggiungi settimana"; Esami "promemoria"', '📅 🗓'),
  ui('module-hyrox', 'home-modules', 28, 'a chequered finish flag on a pole', 'Home tile "HYROX"', '🏁'),
  ui('module-home-workout', 'home-modules', 28, 'a rolled-out exercise mat seen in perspective with a small round roll at one end', 'Home tile "A casa"', '🧘'),
  ui('module-import', 'home-modules', 28, 'a document page with a downward arrow entering from the top into an open tray', 'Home tile "Importa scheda"; Importa titles', '📥'),

  // --- 2. Small actions (inline in buttons and rows, 18-20px)
  ui('close', 'actions', 18, 'a cross made of two diagonal lines', 'delete a set, close sheets and banners (57 uses)', '✕'),
  ui('check', 'actions', 18, 'a tick mark', 'confirm a set, done states, plan feature lists (32 uses)', '✓ ✅'),
  ui('plus', 'actions', 18, 'a plus sign', '"aggiungi" buttons, add series', '➕ +'),
  ui('minus', 'actions', 18, 'a minus sign (one horizontal line)', 'remove one, decrement', ''),
  ui('edit', 'actions', 18, 'a pencil drawn diagonally with a small line under its tip', 'edit buttons', '✎ 📝'),
  ui('trash', 'actions', 18, 'a bin with lid, handle and two vertical lines inside', 'delete (destructive actions)', ''),
  ui('chevron-left', 'actions', 20, 'a left-pointing chevron (an open angle, not a triangle)', 'back button in the top bar, previous month', '◀'),
  ui('chevron-right', 'actions', 20, 'a right-pointing chevron', 'next month, open a row, go on', '▸ ▶ →'),
  ui('chevron-up', 'actions', 18, 'an up-pointing chevron', 'fold an open section', '↑'),
  ui('chevron-down', 'actions', 18, 'a down-pointing chevron', 'unfold a section, accordion marker (replaces the 8px triangle)', '▾'),
  ui('arrow-up', 'actions', 18, 'an arrow pointing up with a stem', 'move an exercise up, back to top', '↑'),
  ui('arrow-down', 'actions', 18, 'an arrow pointing down with a stem', 'move an exercise down', '↓'),
  ui('more', 'actions', 20, 'three dots in a row', 'overflow menu', ''),
  ui('search', 'actions', 20, 'a magnifying glass', 'search fields (Cerca, evidence, food)', ''),
  ui('filter', 'actions', 20, 'a funnel', 'filters', ''),
  ui('undo', 'actions', 18, 'a curved arrow turning back to the left', '"annulla ultima modifica/azione"', ''),
  ui('sync', 'actions', 18, 'two arrows chasing each other in a circle', 'SYNC, refresh, rotate', '🔁'),
  ui('share', 'actions', 20, 'three connected dots (one left, two on the right) joined by two lines', 'share program, share card', ''),
  ui('download', 'actions', 20, 'an arrow pointing down into a tray', 'export (PDF, CSV, JSON)', ''),
  ui('upload', 'actions', 20, 'an arrow pointing up out of a tray', 'import file', ''),
  ui('copy', 'actions', 18, 'two overlapping rounded squares', 'copy invite link, duplicate', ''),
  ui('info', 'actions', 18, 'a circle with a small dot above a short vertical line', 'explanations ("come si calcola"), hints', 'ⓘ'),
  ui('warning', 'actions', 18, 'a triangle with rounded corners, an exclamation mark inside', 'alerts, medical disclaimers, destructive confirmations', '⚠'),
  ui('lock', 'actions', 18, 'a padlock, closed', 'privacy blocks, locked features', '🔒'),
  ui('settings', 'actions', 20, 'a gear with eight teeth and a round hole', 'settings, AI control centre', '⚙'),
  ui('play', 'actions', 18, 'a right-pointing triangle with rounded corners', 'start (timer, warm-up, video)', '▶'),
  ui('pause', 'actions', 18, 'two short vertical bars', 'pause the timer', ''),
  ui('stop', 'actions', 18, 'a rounded square', 'stop (voice, timer)', ''),
  ui('timer', 'actions', 20, 'a stopwatch: circle, small button on top, one hand', 'rest timer, workout timer, duration', '⏱ 🕐'),
  ui('send', 'actions', 20, 'a paper plane pointing right', 'send message in the chat', ''),
  ui('attach', 'actions', 20, 'a paperclip', 'attach a file in the chat, import file', '📎'),
  ui('mic', 'actions', 20, 'a microphone: rounded capsule, a U-shaped holder under it, a short stem and base', 'dictation', '🎙'),
  ui('camera', 'actions', 20, 'a compact camera: rounded body, a round lens, a small bump on top', 'photograph a plan, meal photo, progress photos', '📸 📷'),
  ui('image', 'actions', 20, 'a framed picture with a sun dot and two mountains', 'images, galleries', '🖼'),
  ui('barcode', 'actions', 20, 'a barcode: five vertical bars of different widths, with four small corner brackets around it', 'food barcode scan', ''),
  ui('link', 'actions', 18, 'two chain links joined diagonally', 'invite link, sources', ''),
  ui('bell', 'actions', 20, 'a bell with a small clapper', 'reminders, notifications', '🔔'),
  ui('eye', 'actions', 18, 'an open eye', 'view, preview', ''),

  // --- 3. App sections and people
  ui('user', 'sections', 20, 'a head (circle) over shoulders (an open arc)', 'profile', '👤 🧑'),
  ui('users', 'sections', 20, 'two people, the second one slightly behind and smaller', 'clients, athletes, community', '👥'),
  ui('chat', 'sections', 20, 'a speech bubble with a small tail at the bottom left and two short lines inside', 'messages, coach chat', '💬'),
  ui('video-call', 'sections', 20, 'a video camera body with a triangular lens on the right', 'video call with a client', ''),
  ui('globe', 'sections', 20, 'a circle with one vertical ellipse and one horizontal line (a globe)', 'language selection', '🌍'),
  ui('shield', 'sections', 20, 'a shield with a small tick inside', 'privacy and data protection', '🛡'),
  ui('backup', 'sections', 20, 'a hard-disc: rounded rectangle with a small circle and a short line inside', 'backup and restore', '💾'),
  ui('ai-spark', 'sections', 20, 'one large four-pointed sparkle with a small sparkle top right (concave sides)', 'Nurvan AI / Coach AI (replaces the robot), meal recognition', '🤖 ✨'),
  ui('book', 'sections', 20, 'an open book seen from the front, two pages', 'recipes, library, knowledge', '📖 📚'),
  ui('library', 'sections', 20, 'three books standing on a shelf, one of them leaning', 'exercise encyclopedia, database', '🗂 🗄'),
  ui('clipboard', 'sections', 20, 'a clipboard with a clip on top and three lines of text', 'workout log, plan, check-in form', '📑 📋'),
  ui('clipboard-check', 'sections', 20, 'a clipboard with a clip on top and a tick inside', 'check-in centre, completed check-in', ''),
  ui('chart-line', 'sections', 20, 'axes (an L shape) with a rising zig-zag line', 'statistics, progress centre', '📈 📊'),
  ui('chart-bar', 'sections', 20, 'axes with three vertical bars of rising height', 'volume, analytics', ''),
  ui('table', 'sections', 20, 'a grid of 3 rows and 3 columns with a header row', 'analytic table', ''),
  ui('folder', 'sections', 20, 'a folder with a tab', 'documents, archive', ''),
  ui('tag', 'sections', 20, 'a price tag with a hole, pointing up-left', 'labels, categories', '🏷'),
  ui('wallet', 'sections', 20, 'a wallet with a flap and a small clasp', 'coach ledger (incassi)', '💳'),
  ui('funnel-pipeline', 'sections', 20, 'a funnel with three horizontal sections narrowing to a spout', 'coach CRM pipeline', ''),
  ui('bolt', 'sections', 20, 'a lightning bolt', 'automations', ''),
  ui('home', 'sections', 24, 'a house with a pitched roof and a door', 'Home tab, back to home', '🏠'),
  ui('menu', 'sections', 24, 'three horizontal lines', 'Menu', ''),
  ui('coach', 'sections', 24, 'a whistle on a short cord (round chamber, mouthpiece on the left)', 'Coach button in the top bar, Coach hub, "Modalità coach"', '👔'),
  ui('map-pin', 'sections', 20, 'a map pin: a rounded drop shape pointing down with a small circle inside', 'Dove mi alleno (gym locations)', '📍'),
  ui('diamond', 'sections', 20, 'a faceted gem seen from the front: a flat top, two slanted sides meeting at a point below, one line across the top part', 'Abbonamento e piani', '💎'),
  ui('graduation-cap', 'sections', 20, 'a graduation cap: a flat diamond-shaped board on top of a rounded cap, with a small tassel hanging at the right', 'Tutorial', '🎓'),
  ui('lightbulb', 'sections', 20, 'a light bulb: round glass, a short neck with two lines, and three small rays on top', 'tips and hints', '💡'),
  ui('puzzle', 'sections', 20, 'a single jigsaw piece with one round knob on top and one on the right', 'integrations and extras', '🧩'),
  ui('compass', 'sections', 20, 'a circle with a diamond-shaped needle at 45 degrees (north-east), a small dot at the centre', 'explore, guides', '🧭'),
  ui('document', 'sections', 20, 'a sheet of paper with a folded top-right corner and two short text lines', 'reports, PDF and documents', '📄'),
  ui('microscope', 'sections', 20, 'a microscope in side view: a slanted tube on top, an arm on the right, a round base and a small stage', 'clinical lab, research', '🔬'),
  ui('sun', 'sections', 20, 'a circle with eight short rays around it', 'light theme, daytime', '☀'),

  // --- 4. Training and body
  ui('dumbbell', 'training', 24, 'a dumbbell seen from the side: two plates on each side and a short handle, slightly tilted', 'Workout tab (replaces the crossed arrows), strength', '🏋'),
  ui('barbell', 'training', 24, 'a barbell seen from the side: long bar with two plates on each end', 'powerlifting, programmes', ''),
  ui('kettlebell', 'training', 24, 'a kettlebell: round body with a handle arch on top', 'kettlebell exercises and equipment', ''),
  ui('running', 'training', 24, 'a running figure in side view: round head, leaning torso, one arm and both legs in stride', 'cardio, runs', ''),
  ui('target', 'training', 20, 'three concentric circles with a small arrow tip in the middle', 'goals', '🎯'),
  ui('medal', 'training', 20, 'a medal on a ribbon (circle with a star, two ribbon tails)', 'personal records (PR)', '🏅'),
  ui('flame', 'training', 20, 'a flame with a smaller flame inside', 'streak, calories', ''),
  ui('heart-pulse', 'training', 20, 'a heart whose outline is crossed by a heartbeat line', 'recovery estimate, heart rate', '❤'),
  ui('moon', 'training', 20, 'a crescent moon', 'sleep, recovery (Salute e recupero tile)', '🌙'),
  ui('scale', 'training', 20, 'a bathroom scale seen from above: rounded square with a small dial arc on top', 'body weight', '⚖'),
  ui('ruler', 'training', 20, 'a diagonal ruler with evenly spaced tick marks', 'body measurements', '📏 📐'),
  ui('footsteps', 'training', 20, 'two footprints, one behind the other, offset left and right', 'steps', '👣'),
  ui('water-drop', 'training', 20, 'a single water drop', 'water intake', '💧'),
  ui('cart', 'training', 20, 'a shopping cart with two wheels and a handle', 'shopping list', '🛒'),
  ui('apple', 'training', 20, 'an apple with a leaf and a small stem', 'foods', '🍎'),
  ui('sandwich', 'training', 20, 'a sandwich: two slices of bread with a wavy filling between them', 'meals, snacks', '🥪'),
  ui('muscle-chest', 'muscles', 24, 'front torso silhouette (no head) with the chest area drawn as two rounded plates and a centre line', 'muscle chips and database tags: Petto', ''),
  ui('muscle-back', 'muscles', 24, 'back torso silhouette (no head) with a spine line and two wing-shaped lats', 'Dorso', ''),
  ui('muscle-shoulders', 'muscles', 24, 'torso silhouette with two round shoulder caps (circles) on each side of the neck line', 'Spalle', ''),
  ui('muscle-arms', 'muscles', 24, 'a bent arm in side view with a biceps bulge', 'Braccia', ''),
  ui('muscle-legs', 'muscles', 24, 'two legs seen from the front, thighs wider than calves, a knee line on each', 'Gambe', ''),
  ui('muscle-core', 'muscles', 24, 'a torso with a 2x3 grid of rounded rectangles (abs) and a centre line', 'Addome / core', ''),
  ui('muscle-fullbody', 'muscles', 24, 'a standing figure with arms slightly open, head as a circle', 'full-body workouts', ''),

  // --- 5. The four home disciplines (cards, 28px)
  ui('discipline-pilates', 'disciplines', 28, 'a person sitting on a mat in a "teaser" V-shape: legs raised straight, arms reaching forward, a thin mat line underneath', 'Allenarsi a casa: Pilates matwork', ''),
  ui('discipline-mobility', 'disciplines', 28, 'a figure in a deep lunge with arms raised, an arc drawn over the body to suggest range of movement', 'Allenarsi a casa: Mobilità e stretching', ''),
  ui('discipline-calisthenics', 'disciplines', 28, 'a pull-up bar (a horizontal line with two short posts) with a figure hanging from it, chin above the bar', 'Allenarsi a casa: Calisthenics', ''),
  ui('discipline-hiit', 'disciplines', 28, 'a stopwatch with a lightning bolt inside the dial', 'Allenarsi a casa: HIIT e Tabata', ''),
  ui('discipline-gag', 'disciplines', 28, 'a figure in a glute bridge seen from the side: head on a mat line, hips lifted, knees bent, feet on the floor', 'Allenarsi a casa: GAG, gambe addome glutei', ''),

  // --- 6. The HYROX stations, in race order (list rows, 24px)
  ui('hyrox-run', 'hyrox', 24, 'a runner in side view in mid-stride', 'HYROX: the 1 km run between stations', ''),
  ui('hyrox-skierg', 'hyrox', 24, 'a figure bent forward pulling two cords down from a tall frame', 'HYROX station 1: Ski erg', ''),
  ui('hyrox-sled-push', 'hyrox', 24, 'a figure leaning forward pushing a low sled with two upright handles', 'HYROX station 2: Sled push', ''),
  ui('hyrox-sled-pull', 'hyrox', 24, 'a figure leaning back pulling a rope attached to a low sled', 'HYROX station 3: Sled pull', ''),
  ui('hyrox-burpee-broad-jump', 'hyrox', 24, 'a figure mid-air in a forward jump with arms swinging forward, an arrow below showing the distance', 'HYROX station 4: Burpee broad jump', ''),
  ui('hyrox-row', 'hyrox', 24, 'a figure seated on a rowing machine, arms pulling a handle, a rail underneath', 'HYROX station 5: Rowing', ''),
  ui('hyrox-farmers-carry', 'hyrox', 24, 'a figure walking upright holding one kettlebell in each hand at its sides', 'HYROX station 6: Farmers carry', ''),
  ui('hyrox-sandbag-lunges', 'hyrox', 24, 'a figure in a lunge with a sandbag (a rounded rectangle) across its shoulders', 'HYROX station 7: Sandbag lunges', ''),
  ui('hyrox-wall-ball', 'hyrox', 24, 'a figure throwing a ball up toward a target square on a wall, with a dotted arc', 'HYROX station 8: Wall balls', ''),

  // --- 7. Salute e recupero (area cards, 28px)
  ui('wellbeing-posture', 'wellbeing', 28, 'a side view of a spine drawn as a gently S-curved column of small rounded segments, with a plumb line beside it', 'Salute e recupero: Postura e dolori', ''),
  ui('wellbeing-labour', 'wellbeing', 28, 'a pregnant belly in side view (one smooth curve) with a small circle inside, a hand resting on top', 'Salute e recupero: Travaglio e parto', ''),
  ui('wellbeing-postpartum', 'wellbeing', 28, 'a mother\'s torso in side view holding a small baby bundle (a circle head and a rounded blanket)', 'Salute e recupero: Dopo il parto', ''),

  // --- 8. Coach area navigation (tab bar of the coach area, 24px)
  ui('coach-today', 'coach-os', 24, 'a sun rising over a horizon line', 'Coach: Oggi', ''),
  ui('coach-clients', 'coach-os', 24, 'three people in a row, the one in the middle in front', 'Coach: Clienti', ''),
  ui('coach-inbox', 'coach-os', 24, 'an inbox tray: a box with a lowered middle section and a small arrow entering', 'Coach: Posta / chat', ''),
  ui('coach-programs', 'coach-os', 24, 'a clipboard with a list of three lines and small bullets', 'Coach: Programmi', ''),
  ui('coach-analytics', 'coach-os', 24, 'a bar chart with a trend arrow above it', 'Coach: Analisi', ''),

  // --- 9. Empty states (64px, one per screen without data)
  art('empty-program', 'empty-states', 64, 'an empty clipboard with a clip and a dashed outline, a small plus sign to its right', 'Home with no active programme; programmes list', ''),
  art('empty-supplements', 'empty-states', 64, 'an open pill bottle with the cap beside it, and one capsule falling out', 'Integrazione without data', '🧴'),
  art('empty-therapy', 'empty-states', 64, 'a stethoscope lying in a loop, with a small cross beside it', 'Terapia without data', '🩺'),
  art('empty-exams', 'empty-states', 64, 'two test tubes in a rack, one with a small drop', 'Esami without reports', '🧪'),
  art('empty-chart', 'empty-states', 64, 'empty chart axes with a dotted line where the data would go', 'Statistics and Training Market with no data', ''),
  art('empty-chat', 'empty-states', 64, 'two empty speech bubbles, one larger in front, one smaller behind', 'Coach chat with no messages', ''),
  art('empty-clients', 'empty-states', 64, 'a dashed circle head and shoulders outline (placeholder person) with a small plus', 'Coach hub with no clients', ''),
  art('empty-calendar', 'empty-states', 64, 'a calendar page with binder rings and an empty grid, a small clock at the bottom right', 'Calendar with no events', '')
];

// A colour for every icon that names a thing (the small actions - close, plus, arrows... - take the colour of the text).
// Bright enough for the dark background, spread over the wheel so neighbours differ, gold kept for the brand (Nurvan AI, coach).
export const COLORS = {
  'module-nutrition': '#6FCF97', 'module-supplements': '#F2994A', 'module-therapy': '#56CCF2', 'module-exams': '#BB6BD9',
  'module-calendar': '#F2C94C', 'module-hyrox': '#EB5757', 'module-home-workout': '#2DD4BF', 'module-import': '#9AA7B8',
  user: '#A5B4FC', users: '#818CF8', chat: '#56CCF2', 'video-call': '#38BDF8', globe: '#38BDF8', shield: '#34D399', backup: '#94A3B8',
  'ai-spark': '#D4AF37', book: '#F59E0B', library: '#FBBF24', clipboard: '#60A5FA', 'clipboard-check': '#34D399',
  'chart-line': '#4ADE80', 'chart-bar': '#22C55E', table: '#94A3B8', folder: '#FBBF24', tag: '#F472B6', wallet: '#34D399',
  'funnel-pipeline': '#A78BFA', bolt: '#FACC15', coach: '#D4AF37',
  dumbbell: '#FF7A59', barbell: '#FB7185', kettlebell: '#F97316', running: '#4ADE80', target: '#F87171', medal: '#FACC15', flame: '#FB923C',
  'heart-pulse': '#F87171', moon: '#A5B4FC', scale: '#94A3B8', ruler: '#2DD4BF', footsteps: '#4ADE80', 'water-drop': '#38BDF8',
  cart: '#F472B6', apple: '#EF4444', sandwich: '#FBBF24',
  'muscle-chest': '#F87171', 'muscle-back': '#60A5FA', 'muscle-shoulders': '#FB923C', 'muscle-arms': '#A78BFA', 'muscle-legs': '#34D399', 'muscle-core': '#FBBF24', 'muscle-fullbody': '#D4AF37',
  'discipline-pilates': '#F472B6', 'discipline-mobility': '#2DD4BF', 'discipline-calisthenics': '#FB923C', 'discipline-hiit': '#F87171', 'discipline-gag': '#E879F9',
  'hyrox-run': '#4ADE80', 'hyrox-skierg': '#38BDF8', 'hyrox-sled-push': '#F97316', 'hyrox-sled-pull': '#FB7185', 'hyrox-burpee-broad-jump': '#FACC15',
  'hyrox-row': '#2DD4BF', 'hyrox-farmers-carry': '#A78BFA', 'hyrox-sandbag-lunges': '#F59E0B', 'hyrox-wall-ball': '#60A5FA',
  'wellbeing-posture': '#60A5FA', 'wellbeing-labour': '#F472B6', 'wellbeing-postpartum': '#FB7185',
  'coach-today': '#FACC15', 'coach-clients': '#A5B4FC', 'coach-inbox': '#56CCF2', 'coach-programs': '#60A5FA', 'coach-analytics': '#4ADE80',
  'map-pin': '#F87171', diamond: '#67E8F9', 'graduation-cap': '#A78BFA', lightbulb: '#FDE047', puzzle: '#FB923C', compass: '#38BDF8',
  document: '#94A3B8', microscope: '#BB6BD9', sun: '#FACC15',
  'empty-program': '#60A5FA', 'empty-supplements': '#F2994A', 'empty-therapy': '#56CCF2', 'empty-exams': '#BB6BD9',
  'empty-chart': '#4ADE80', 'empty-chat': '#56CCF2', 'empty-clients': '#A5B4FC', 'empty-calendar': '#F2C94C'
};

export const GROUPS = [...new Set(ICONS.map((i) => i.group))];
