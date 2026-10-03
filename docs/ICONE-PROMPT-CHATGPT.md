# Icone di Nurvan: prompt per ChatGPT

Generato da `tools/icons/make_prompt.mjs` (elenco in `tools/icons/manifest.mjs`: 121 icone). Non modificare a mano questo file: cambia il manifest e rigenera.

## Come si usa

1. Apri una **nuova chat** di ChatGPT (meglio il modello con "Thinking"/ragionamento attivo e, se puoi, con l'analisi dei dati/code interpreter, che sa restituire uno ZIP).
2. Incolla il **PROMPT 0** (stile e regole) e aspetta "Ready".
3. Incolla i batch uno alla volta (PROMPT 1, 2, ...). Un batch alla volta mantiene lo stile uniforme. Se uno stile deriva, scrivi: "Redraw the batch matching the first batch exactly: same stroke weight, roundness and detail."
4. Salva ogni file come `<id>.svg` (il nome dell'icona è già nel prompt) in **`web/icons/`** del progetto (le icone "art" vanno nella stessa cartella).
5. Controlla i file: `node tools/icons/check.mjs` (verifica formato, griglia, spessore, colori, dimensioni, e dice quali mancano).
6. Dimmelo: monto lo sprite, sostituisco emoji e caratteri e rifaccio il giro di verifica sulle schermate.

Se un'icona non convince, rimanda a ChatGPT solo quella riga con una correzione ("make the sandwich simpler: two slices and one wavy line"). Non servono ritocchi a mano se rispettano le regole: i file sono pronti all'uso.

## Dati utili per chi li disegna

- Tema scuro (sfondo quasi nero, `#0a0a0a`), icone **oro** (`#d4af37`), bianche o rosse in base al contesto: per questo tutto è `currentColor`, mai colori fissi.
- Dimensioni di uso: icone di sezione 24 px, azioni nei bottoni 18-20 px, tessere della Home e delle discipline 28 px, stati vuoti 64 px. Devono restare leggibili a 18 px, con linea sottile su fondo scuro.
- Area di tocco: l'icona è sempre dentro un bottone di almeno 36 px; l'icona stessa non deve avere "aria" extra dentro il file (usa i margini della griglia indicati).
- Stile di riferimento già nell'app: la barra in basso (casa, manubrio, grafico, cerchi, tre linee) è un set a linea molto semplice; le nuove icone devono sembrare della stessa famiglia ma più rotonde e un po' più sportive.
- Le icone di persona sono astratte (cerchio per la testa, linee per il corpo): niente volti, niente genere, niente abiti. Salute e recupero: immagini sobrie e rispettose.

## PROMPT 0 - stile e regole (incollare per primo)

```
You are an icon designer producing a CUSTOM, CONSISTENT SVG icon set for a fitness app called Nurvan (dark UI, gold accent).
I will send you icons in batches. For every icon you return one standalone SVG file. Follow these rules EXACTLY; if an icon cannot respect them, simplify the icon, never break the rules.

STYLE (identical for every icon, this is the most important thing)
- Outline style, drawn with strokes only. Rounded line caps and rounded line joins. One consistent stroke width inside each grid (see below). No fills, except tiny solid dots (r <= 1.2) written as fill="currentColor" stroke="none".
- Friendly, geometric, slightly sporty. Simple shapes, generous curves, corner radius about 2 units on rectangles. Same level of detail in all icons: recognisable at a glance at 20 px, never fussy. Maximum 8 shapes per icon (merge segments into one path when you can).
- One single idea per icon. No text, no letters, no numbers, no background shape, no frame, no decoration.
- Human figures are abstract: a circle for the head, simple lines for body and limbs (stick-figure with rounded strokes, about 3 head-heights tall). No faces, no clothes.
- Keep the icon centred and visually balanced inside the live area. Do not touch the edges.

TWO GRIDS
- UI icons ("ui"): viewBox="0 0 24 24", stroke-width="1.75", live area 2 to 22 (a 2px margin on every side).
- Illustrations ("art", empty states): viewBox="0 0 64 64", stroke-width="2.5", live area 4 to 60 (a 4px margin on every side). They are slightly richer than UI icons but follow the same line style, and may use up to 10 shapes.

FILE FORMAT (strict)
- Start exactly like this (change only the viewBox and stroke-width for the "art" grid):
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
- Allowed elements: path, circle, ellipse, rect, line, polyline, polygon. Nothing else.
- FORBIDDEN: any hard-coded colour (everything must inherit currentColor), gradients, filters, opacity, text, <image>, <style>, class, id, transform, clip-path, mask, <defs>, <use>, comments, metadata, a width/height attribute on the root.
- Coordinates with at most 2 decimals; keep every coordinate inside the live area. Prefer few, smooth paths (use arcs and curves) over many tiny segments. File size under 1200 bytes (ui) or 2500 bytes (art).
- The file name is the icon id plus .svg (for example close.svg).

OUTPUT FORMAT
- If you can create files, give me a ZIP with one <id>.svg per icon. Otherwise reply with one code block per icon (language "svg"), each preceded by a line with the file name only, and nothing else: no explanations, no alternatives.
- After the files, add a short list "Doubts:" only for icons you are not sure are recognisable, with one line each.

CONSISTENCY CHECK before answering: put the whole batch mentally side by side at 24 px. Same stroke weight, same corner roundness, same amount of detail, same visual size (an icon must not look bigger or smaller than its neighbours). Redraw the outliers.

Reply "Ready" and wait for the first batch.
```

## PROMPT 1 - Moduli della Home (8 icone)

```
Batch 1/14 - Moduli della Home - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

module-nutrition.svg (shown at 28px) - draw: a plate seen from above with a fork on the left and a leaf on the right.
module-supplements.svg (shown at 28px) - draw: a capsule lying diagonally next to a round tablet.
module-therapy.svg (shown at 28px) - draw: a stethoscope (two ear tubes joining into one tube that ends in a round chest piece).
module-exams.svg (shown at 28px) - draw: a lab test tube with a drop and two level marks.
module-calendar.svg (shown at 28px) - draw: a wall calendar with two binder rings on top and a small grid of dots.
module-hyrox.svg (shown at 28px) - draw: a chequered finish flag on a pole.
module-home-workout.svg (shown at 28px) - draw: a rolled-out exercise mat seen in perspective with a small round roll at one end.
module-import.svg (shown at 28px) - draw: a document page with a downward arrow entering from the top into an open tray.
```

## PROMPT 2 - Azioni piccole (14 icone)

```
Batch 2/14 - Azioni piccole - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

close.svg (shown at 18px) - draw: a cross made of two diagonal lines.
check.svg (shown at 18px) - draw: a tick mark.
plus.svg (shown at 18px) - draw: a plus sign.
minus.svg (shown at 18px) - draw: a minus sign (one horizontal line).
edit.svg (shown at 18px) - draw: a pencil drawn diagonally with a small line under its tip.
trash.svg (shown at 18px) - draw: a bin with lid, handle and two vertical lines inside.
chevron-left.svg (shown at 20px) - draw: a left-pointing chevron (an open angle, not a triangle).
chevron-right.svg (shown at 20px) - draw: a right-pointing chevron.
chevron-up.svg (shown at 18px) - draw: an up-pointing chevron.
chevron-down.svg (shown at 18px) - draw: a down-pointing chevron.
arrow-up.svg (shown at 18px) - draw: an arrow pointing up with a stem.
arrow-down.svg (shown at 18px) - draw: an arrow pointing down with a stem.
more.svg (shown at 20px) - draw: three dots in a row.
search.svg (shown at 20px) - draw: a magnifying glass.
```

## PROMPT 3 - Azioni piccole (14 icone)

```
Batch 3/14 - Azioni piccole - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

filter.svg (shown at 20px) - draw: a funnel.
undo.svg (shown at 18px) - draw: a curved arrow turning back to the left.
sync.svg (shown at 18px) - draw: two arrows chasing each other in a circle.
share.svg (shown at 20px) - draw: three connected dots (one left, two on the right) joined by two lines.
download.svg (shown at 20px) - draw: an arrow pointing down into a tray.
upload.svg (shown at 20px) - draw: an arrow pointing up out of a tray.
copy.svg (shown at 18px) - draw: two overlapping rounded squares.
info.svg (shown at 18px) - draw: a circle with a small dot above a short vertical line.
warning.svg (shown at 18px) - draw: a triangle with rounded corners, an exclamation mark inside.
lock.svg (shown at 18px) - draw: a padlock, closed.
settings.svg (shown at 20px) - draw: a gear with eight teeth and a round hole.
play.svg (shown at 18px) - draw: a right-pointing triangle with rounded corners.
pause.svg (shown at 18px) - draw: two short vertical bars.
stop.svg (shown at 18px) - draw: a rounded square.
```

## PROMPT 4 - Azioni piccole (10 icone)

```
Batch 4/14 - Azioni piccole - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

timer.svg (shown at 20px) - draw: a stopwatch: circle, small button on top, one hand.
send.svg (shown at 20px) - draw: a paper plane pointing right.
attach.svg (shown at 20px) - draw: a paperclip.
mic.svg (shown at 20px) - draw: a microphone: rounded capsule, a U-shaped holder under it, a short stem and base.
camera.svg (shown at 20px) - draw: a compact camera: rounded body, a round lens, a small bump on top.
image.svg (shown at 20px) - draw: a framed picture with a sun dot and two mountains.
barcode.svg (shown at 20px) - draw: a barcode: five vertical bars of different widths, with four small corner brackets around it.
link.svg (shown at 18px) - draw: two chain links joined diagonally.
bell.svg (shown at 20px) - draw: a bell with a small clapper.
eye.svg (shown at 18px) - draw: an open eye.
```

## PROMPT 5 - Sezioni e persone (14 icone)

```
Batch 5/14 - Sezioni e persone - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

user.svg (shown at 20px) - draw: a head (circle) over shoulders (an open arc).
users.svg (shown at 20px) - draw: two people, the second one slightly behind and smaller.
chat.svg (shown at 20px) - draw: a speech bubble with a small tail at the bottom left and two short lines inside.
video-call.svg (shown at 20px) - draw: a video camera body with a triangular lens on the right.
globe.svg (shown at 20px) - draw: a circle with one vertical ellipse and one horizontal line (a globe).
shield.svg (shown at 20px) - draw: a shield with a small tick inside.
backup.svg (shown at 20px) - draw: a hard-disc: rounded rectangle with a small circle and a short line inside.
ai-spark.svg (shown at 20px) - draw: one large four-pointed sparkle with a small sparkle top right (concave sides).
book.svg (shown at 20px) - draw: an open book seen from the front, two pages.
library.svg (shown at 20px) - draw: three books standing on a shelf, one of them leaning.
clipboard.svg (shown at 20px) - draw: a clipboard with a clip on top and three lines of text.
clipboard-check.svg (shown at 20px) - draw: a clipboard with a clip on top and a tick inside.
chart-line.svg (shown at 20px) - draw: axes (an L shape) with a rising zig-zag line.
chart-bar.svg (shown at 20px) - draw: axes with three vertical bars of rising height.
```

## PROMPT 6 - Sezioni e persone (9 icone)

```
Batch 6/14 - Sezioni e persone - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

table.svg (shown at 20px) - draw: a grid of 3 rows and 3 columns with a header row.
folder.svg (shown at 20px) - draw: a folder with a tab.
tag.svg (shown at 20px) - draw: a price tag with a hole, pointing up-left.
wallet.svg (shown at 20px) - draw: a wallet with a flap and a small clasp.
funnel-pipeline.svg (shown at 20px) - draw: a funnel with three horizontal sections narrowing to a spout.
bolt.svg (shown at 20px) - draw: a lightning bolt.
home.svg (shown at 24px) - draw: a house with a pitched roof and a door.
menu.svg (shown at 24px) - draw: three horizontal lines.
coach.svg (shown at 24px) - draw: a whistle on a short cord (round chamber, mouthpiece on the left).
```

## PROMPT 7 - Allenamento e corpo (14 icone)

```
Batch 7/14 - Allenamento e corpo - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

dumbbell.svg (shown at 24px) - draw: a dumbbell seen from the side: two plates on each side and a short handle, slightly tilted.
barbell.svg (shown at 24px) - draw: a barbell seen from the side: long bar with two plates on each end.
kettlebell.svg (shown at 24px) - draw: a kettlebell: round body with a handle arch on top.
running.svg (shown at 24px) - draw: a running figure in side view: round head, leaning torso, one arm and both legs in stride.
target.svg (shown at 20px) - draw: three concentric circles with a small arrow tip in the middle.
medal.svg (shown at 20px) - draw: a medal on a ribbon (circle with a star, two ribbon tails).
flame.svg (shown at 20px) - draw: a flame with a smaller flame inside.
heart-pulse.svg (shown at 20px) - draw: a heart whose outline is crossed by a heartbeat line.
moon.svg (shown at 20px) - draw: a crescent moon.
scale.svg (shown at 20px) - draw: a bathroom scale seen from above: rounded square with a small dial arc on top.
ruler.svg (shown at 20px) - draw: a diagonal ruler with evenly spaced tick marks.
footsteps.svg (shown at 20px) - draw: two footprints, one behind the other, offset left and right.
water-drop.svg (shown at 20px) - draw: a single water drop.
cart.svg (shown at 20px) - draw: a shopping cart with two wheels and a handle.
```

## PROMPT 8 - Allenamento e corpo (2 icone)

```
Batch 8/14 - Allenamento e corpo - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

apple.svg (shown at 20px) - draw: an apple with a leaf and a small stem.
sandwich.svg (shown at 20px) - draw: a sandwich: two slices of bread with a wavy filling between them.
```

## PROMPT 9 - Gruppi muscolari (7 icone)

```
Batch 9/14 - Gruppi muscolari - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

muscle-chest.svg (shown at 24px) - draw: front torso silhouette (no head) with the chest area drawn as two rounded plates and a centre line.
muscle-back.svg (shown at 24px) - draw: back torso silhouette (no head) with a spine line and two wing-shaped lats.
muscle-shoulders.svg (shown at 24px) - draw: torso silhouette with two round shoulder caps (circles) on each side of the neck line.
muscle-arms.svg (shown at 24px) - draw: a bent arm in side view with a biceps bulge.
muscle-legs.svg (shown at 24px) - draw: two legs seen from the front, thighs wider than calves, a knee line on each.
muscle-core.svg (shown at 24px) - draw: a torso with a 2x3 grid of rounded rectangles (abs) and a centre line.
muscle-fullbody.svg (shown at 24px) - draw: a standing figure with arms slightly open, head as a circle.
```

## PROMPT 10 - Discipline a casa (4 icone)

```
Batch 10/14 - Discipline a casa - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

discipline-pilates.svg (shown at 28px) - draw: a person sitting on a mat in a "teaser" V-shape: legs raised straight, arms reaching forward, a thin mat line underneath.
discipline-mobility.svg (shown at 28px) - draw: a figure in a deep lunge with arms raised, an arc drawn over the body to suggest range of movement.
discipline-calisthenics.svg (shown at 28px) - draw: a pull-up bar (a horizontal line with two short posts) with a figure hanging from it, chin above the bar.
discipline-hiit.svg (shown at 28px) - draw: a stopwatch with a lightning bolt inside the dial.
```

## PROMPT 11 - Stazioni HYROX (9 icone)

```
Batch 11/14 - Stazioni HYROX - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

hyrox-run.svg (shown at 24px) - draw: a runner in side view in mid-stride.
hyrox-skierg.svg (shown at 24px) - draw: a figure bent forward pulling two cords down from a tall frame.
hyrox-sled-push.svg (shown at 24px) - draw: a figure leaning forward pushing a low sled with two upright handles.
hyrox-sled-pull.svg (shown at 24px) - draw: a figure leaning back pulling a rope attached to a low sled.
hyrox-burpee-broad-jump.svg (shown at 24px) - draw: a figure mid-air in a forward jump with arms swinging forward, an arrow below showing the distance.
hyrox-row.svg (shown at 24px) - draw: a figure seated on a rowing machine, arms pulling a handle, a rail underneath.
hyrox-farmers-carry.svg (shown at 24px) - draw: a figure walking upright holding one kettlebell in each hand at its sides.
hyrox-sandbag-lunges.svg (shown at 24px) - draw: a figure in a lunge with a sandbag (a rounded rectangle) across its shoulders.
hyrox-wall-ball.svg (shown at 24px) - draw: a figure throwing a ball up toward a target square on a wall, with a dotted arc.
```

## PROMPT 12 - Salute e recupero (3 icone)

```
Batch 12/14 - Salute e recupero - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

wellbeing-posture.svg (shown at 28px) - draw: a side view of a spine drawn as a gently S-curved column of small rounded segments, with a plumb line beside it.
wellbeing-labour.svg (shown at 28px) - draw: a pregnant belly in side view (one smooth curve) with a small circle inside, a hand resting on top.
wellbeing-postpartum.svg (shown at 28px) - draw: a mother's torso in side view holding a small baby bundle (a circle head and a rounded blanket).
```

## PROMPT 13 - Area coach (5 icone)

```
Batch 13/14 - Area coach - grid "ui" (viewBox 0 0 24 24, stroke-width 1.75).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

coach-today.svg (shown at 24px) - draw: a sun rising over a horizon line.
coach-clients.svg (shown at 24px) - draw: three people in a row, the one in the middle in front.
coach-inbox.svg (shown at 24px) - draw: an inbox tray: a box with a lowered middle section and a small arrow entering.
coach-programs.svg (shown at 24px) - draw: a clipboard with a list of three lines and small bullets.
coach-analytics.svg (shown at 24px) - draw: a bar chart with a trend arrow above it.
```

## PROMPT 14 - Stati vuoti (illustrazioni) (8 icone)

```
Batch 14/14 - Stati vuoti (illustrazioni) - grid "art" (viewBox 0 0 64 64, stroke-width 2.5).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

empty-program.svg (shown at 64px) - draw: an empty clipboard with a clip and a dashed outline, a small plus sign to its right.
empty-supplements.svg (shown at 64px) - draw: an open pill bottle with the cap beside it, and one capsule falling out.
empty-therapy.svg (shown at 64px) - draw: a stethoscope lying in a loop, with a small cross beside it.
empty-exams.svg (shown at 64px) - draw: two test tubes in a rack, one with a small drop.
empty-chart.svg (shown at 64px) - draw: empty chart axes with a dotted line where the data would go.
empty-chat.svg (shown at 64px) - draw: two empty speech bubbles, one larger in front, one smaller behind.
empty-clients.svg (shown at 64px) - draw: a dashed circle head and shoulders outline (placeholder person) with a small plus.
empty-calendar.svg (shown at 64px) - draw: a calendar page with binder rings and an empty grid, a small clock at the bottom right.
```

## Dove vanno e cosa sostituiscono

| Icona | Dove | Dimensione | Sostituisce |
|---|---|---|---|
| `module-nutrition` | Home tile "Alimentazione"; Alimentazione title | 28 px | 🥗 🍽 |
| `module-supplements` | Home tile "Integrazione" | 28 px | 💊 |
| `module-therapy` | Home tile "Terapia medica" | 28 px | 🩺 |
| `module-exams` | Home tile "Esami lab" | 28 px | 🧪 |
| `module-calendar` | Home tile "Calendario"; Alimentazione "aggiungi settimana"; Esami "promemoria" | 28 px | 📅 🗓 |
| `module-hyrox` | Home tile "HYROX" | 28 px | 🏁 |
| `module-home-workout` | Home tile "A casa" | 28 px | 🧘 |
| `module-import` | Home tile "Importa scheda"; Importa titles | 28 px | 📥 |
| `close` | delete a set, close sheets and banners (57 uses) | 18 px | ✕ |
| `check` | confirm a set, done states, plan feature lists (32 uses) | 18 px | ✓ ✅ |
| `plus` | "aggiungi" buttons, add series | 18 px | ➕ + |
| `minus` | remove one, decrement | 18 px | - |
| `edit` | edit buttons | 18 px | ✎ 📝 |
| `trash` | delete (destructive actions) | 18 px | - |
| `chevron-left` | back button in the top bar, previous month | 20 px | ◀ |
| `chevron-right` | next month, open a row, go on | 20 px | ▸ ▶ → |
| `chevron-up` | fold an open section | 18 px | ↑ |
| `chevron-down` | unfold a section, accordion marker (replaces the 8px triangle) | 18 px | ▾ |
| `arrow-up` | move an exercise up, back to top | 18 px | ↑ |
| `arrow-down` | move an exercise down | 18 px | ↓ |
| `more` | overflow menu | 20 px | - |
| `search` | search fields (Cerca, evidence, food) | 20 px | - |
| `filter` | filters | 20 px | - |
| `undo` | "annulla ultima modifica/azione" | 18 px | - |
| `sync` | SYNC, refresh, rotate | 18 px | 🔁 |
| `share` | share program, share card | 20 px | - |
| `download` | export (PDF, CSV, JSON) | 20 px | - |
| `upload` | import file | 20 px | - |
| `copy` | copy invite link, duplicate | 18 px | - |
| `info` | explanations ("come si calcola"), hints | 18 px | ⓘ |
| `warning` | alerts, medical disclaimers, destructive confirmations | 18 px | ⚠ |
| `lock` | privacy blocks, locked features | 18 px | 🔒 |
| `settings` | settings, AI control centre | 20 px | ⚙ |
| `play` | start (timer, warm-up, video) | 18 px | ▶ |
| `pause` | pause the timer | 18 px | - |
| `stop` | stop (voice, timer) | 18 px | - |
| `timer` | rest timer, workout timer, duration | 20 px | ⏱ 🕐 |
| `send` | send message in the chat | 20 px | - |
| `attach` | attach a file in the chat, import file | 20 px | 📎 |
| `mic` | dictation | 20 px | 🎙 |
| `camera` | photograph a plan, meal photo, progress photos | 20 px | 📸 📷 |
| `image` | images, galleries | 20 px | 🖼 |
| `barcode` | food barcode scan | 20 px | - |
| `link` | invite link, sources | 18 px | - |
| `bell` | reminders, notifications | 20 px | 🔔 |
| `eye` | view, preview | 18 px | - |
| `user` | profile | 20 px | 👤 🧑 |
| `users` | clients, athletes, community | 20 px | 👥 |
| `chat` | messages, coach chat | 20 px | 💬 |
| `video-call` | video call with a client | 20 px | - |
| `globe` | language selection | 20 px | 🌍 |
| `shield` | privacy and data protection | 20 px | 🛡 |
| `backup` | backup and restore | 20 px | 💾 |
| `ai-spark` | Nurvan AI / Coach AI (replaces the robot), meal recognition | 20 px | 🤖 ✨ |
| `book` | recipes, library, knowledge | 20 px | 📖 📚 |
| `library` | exercise encyclopedia, database | 20 px | 🗂 🗄 |
| `clipboard` | workout log, plan, check-in form | 20 px | 📑 📋 |
| `clipboard-check` | check-in centre, completed check-in | 20 px | - |
| `chart-line` | statistics, progress centre | 20 px | 📈 📊 |
| `chart-bar` | volume, analytics | 20 px | - |
| `table` | analytic table | 20 px | - |
| `folder` | documents, archive | 20 px | - |
| `tag` | labels, categories | 20 px | 🏷 |
| `wallet` | coach ledger (incassi) | 20 px | 💳 |
| `funnel-pipeline` | coach CRM pipeline | 20 px | - |
| `bolt` | automations | 20 px | - |
| `home` | Home tab, back to home | 24 px | 🏠 |
| `menu` | Menu | 24 px | - |
| `coach` | Coach button in the top bar, Coach hub | 24 px | - |
| `dumbbell` | Workout tab (replaces the crossed arrows), strength | 24 px | 🏋 |
| `barbell` | powerlifting, programmes | 24 px | - |
| `kettlebell` | kettlebell exercises and equipment | 24 px | - |
| `running` | cardio, runs | 24 px | - |
| `target` | goals | 20 px | 🎯 |
| `medal` | personal records (PR) | 20 px | 🏅 |
| `flame` | streak, calories | 20 px | - |
| `heart-pulse` | recovery estimate, heart rate | 20 px | ❤ |
| `moon` | sleep | 20 px | - |
| `scale` | body weight | 20 px | ⚖ |
| `ruler` | body measurements | 20 px | 📏 📐 |
| `footsteps` | steps | 20 px | 👣 |
| `water-drop` | water intake | 20 px | 💧 |
| `cart` | shopping list | 20 px | 🛒 |
| `apple` | foods | 20 px | 🍎 |
| `sandwich` | meals, snacks | 20 px | 🥪 |
| `muscle-chest` | muscle chips and database tags: Petto | 24 px | - |
| `muscle-back` | Dorso | 24 px | - |
| `muscle-shoulders` | Spalle | 24 px | - |
| `muscle-arms` | Braccia | 24 px | - |
| `muscle-legs` | Gambe | 24 px | - |
| `muscle-core` | Addome / core | 24 px | - |
| `muscle-fullbody` | full-body workouts | 24 px | - |
| `discipline-pilates` | Allenarsi a casa: Pilates matwork | 28 px | - |
| `discipline-mobility` | Allenarsi a casa: Mobilità e stretching | 28 px | - |
| `discipline-calisthenics` | Allenarsi a casa: Calisthenics | 28 px | - |
| `discipline-hiit` | Allenarsi a casa: HIIT e Tabata | 28 px | - |
| `hyrox-run` | HYROX: the 1 km run between stations | 24 px | - |
| `hyrox-skierg` | HYROX station 1: Ski erg | 24 px | - |
| `hyrox-sled-push` | HYROX station 2: Sled push | 24 px | - |
| `hyrox-sled-pull` | HYROX station 3: Sled pull | 24 px | - |
| `hyrox-burpee-broad-jump` | HYROX station 4: Burpee broad jump | 24 px | - |
| `hyrox-row` | HYROX station 5: Rowing | 24 px | - |
| `hyrox-farmers-carry` | HYROX station 6: Farmers carry | 24 px | - |
| `hyrox-sandbag-lunges` | HYROX station 7: Sandbag lunges | 24 px | - |
| `hyrox-wall-ball` | HYROX station 8: Wall balls | 24 px | - |
| `wellbeing-posture` | Salute e recupero: Postura e dolori | 28 px | - |
| `wellbeing-labour` | Salute e recupero: Travaglio e parto | 28 px | - |
| `wellbeing-postpartum` | Salute e recupero: Dopo il parto | 28 px | - |
| `coach-today` | Coach: Oggi | 24 px | - |
| `coach-clients` | Coach: Clienti | 24 px | - |
| `coach-inbox` | Coach: Posta / chat | 24 px | - |
| `coach-programs` | Coach: Programmi | 24 px | - |
| `coach-analytics` | Coach: Analisi | 24 px | - |
| `empty-program` | Home with no active programme; programmes list | 64 px | - |
| `empty-supplements` | Integrazione without data | 64 px | 🧴 |
| `empty-therapy` | Terapia without data | 64 px | 🩺 |
| `empty-exams` | Esami without reports | 64 px | 🧪 |
| `empty-chart` | Statistics and Training Market with no data | 64 px | - |
| `empty-chat` | Coach chat with no messages | 64 px | - |
| `empty-clients` | Coach hub with no clients | 64 px | - |
| `empty-calendar` | Calendar with no events | 64 px | - |
