# Icone da ridisegnare (secondo giro)

Le 121 icone sono già nell'app (barra in basso, tessere della Home, graffetta, microfono, frecce, ecc.). Su 24 px alcune non si leggono: sono quelle qui sotto. Vanno rifatte **nella stessa chat di ChatGPT dei primi batch** (così mantiene lo stile). Per le prime due l'emoji resta al suo posto finché non sostituisci il file. Le altre non sono ancora usate nell'app: le inserisco quando sono pronte.

Salva i nuovi file con lo stesso nome in `web/icons/` (sovrascrivi), lancia `node tools/icons/check.mjs` e dimmelo.

## Prompt da incollare

```
Redraw ONLY the icons below. Same rules, same grid and same stroke as the first batches (ui: viewBox 0 0 24 24, stroke-width 1.75, outline only, round caps and joins, currentColor, maximum 8 shapes). Same file names.

The problem with these: at 24 px they are not recognisable. Fix: draw OBJECTS and EQUIPMENT as flat pictograms, not stick-figure people. Fewer details, bolder shapes, one clear silhouette that fills about 80% of the live area (from 2 to 22). Test each one mentally at 20 px: if you cannot tell what it is in half a second, simplify it again.

module-nutrition.svg - a round plate seen from above (a big circle with a smaller circle inside) with a fork on the left of it and a knife on the right of it, both vertical and outside the plate. No leaf.
module-home-workout.svg - a yoga mat seen from above, drawn as a long rounded rectangle lying slightly diagonal, rolled at one end (a small spiral at the left end), with two short parallel lines on it. Nothing else.
kettlebell.svg - a kettlebell: a round heavy body with a flat base, and a thick handle arch on top that is clearly separate from the body (a gap between handle and body). Not an egg.
hyrox-run.svg - a running shoe in side view (sole line, rounded toe, ankle opening), with two short speed lines behind it.
hyrox-skierg.svg - a tall A-frame machine seen from the front with two cords hanging down from the top, each ending in a small handle (a short horizontal line).
hyrox-sled-push.svg - a low flat sled (a rounded rectangle on two runners) with two upright posts at the back and a small arrow pointing right above it.
hyrox-sled-pull.svg - the same low sled on two runners, with a rope leaving its front as a gentle curve to a small handle on the left, and a small arrow pointing left.
hyrox-burpee-broad-jump.svg - two footprints (two rounded ovals) on the left and two on the right, joined by one long curved arrow arc going over them from left to right.
hyrox-row.svg - a rowing machine in side view: a long thin rail, a small seat on it, a round flywheel at the left end and a handle on a short line.
hyrox-farmers-carry.svg - two kettlebells side by side, each with its handle arch, standing on a baseline.
hyrox-sandbag-lunges.svg - a sandbag: a thick rounded rectangle with two short curved stitch lines and a small strap loop on top.
hyrox-wall-ball.svg - a ball (circle with two curved seam lines) and above it a square target on a vertical line (a wall), with a short dotted arc between the ball and the target.
wellbeing-labour.svg - a pregnant belly in side view as one smooth curve (a half circle bulging to the right), with a small circle inside it. No hand, no figure.
wellbeing-postpartum.svg - a baby wrapped in a blanket: a rounded bundle shape (like a teardrop lying down) with a small circle for the head at one end. No adult.
discipline-pilates.svg - a Pilates ring (a large circle with two small handle pads on opposite sides) lying on a mat line (a long rounded line below it).
discipline-mobility.svg - a joint in motion: a small filled dot in the middle (r 1.2), a line leaving it to the upper right, and a large curved arc with an arrowhead at both ends around the dot to show the range of movement.
discipline-calisthenics.svg - a pull-up bar: a horizontal line between two short vertical posts, with a large upward chevron-shaped arrow under the middle of the bar.

Return the files only, as before. Add "Doubts:" only for icons you are not sure about.
```

## Facoltative (se ti piacciono poco)

`muscle-arms`, `muscle-shoulders`, `muscle-chest`: leggibili ma poco distinguibili tra loro a 24 px. Se li vuoi più netti, chiedi a ChatGPT di disegnare solo la **zona** del muscolo evidenziata su una sagoma di torso uguale per tutti e sei (stessa sagoma, cambia solo la zona).
