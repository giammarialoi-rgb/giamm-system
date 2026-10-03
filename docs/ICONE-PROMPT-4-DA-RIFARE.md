# Le 4 icone da ridisegnare: un solo prompt per ChatGPT

Apri una **nuova chat**, incolla tutto il blocco qui sotto, salva i 4 file come `<id>.svg` in `web/icons/` (sostituiscono quelli attuali), poi lancia `node tools/icons/check.mjs`.

```
You are an icon designer producing 4 CUSTOM SVG icons for a fitness app called Nurvan (dark UI, gold accent). They must match an existing set of 126 icons, so follow these rules EXACTLY; if an icon cannot respect them, simplify the icon, never break the rules.

STYLE
- Outline style, strokes only. Rounded line caps and joins. ONE stroke width: 1.75 on a 24x24 grid. No fills, except tiny solid dots (r <= 1.2) written as fill="currentColor" stroke="none".
- Friendly, geometric, slightly sporty. Simple shapes, generous curves, corner radius about 2 units on rectangles. Recognisable at a glance at 20 px (they are shown at 24 and 28 px on a near-black background). One single idea per icon. No text, letters, numbers, background shape, frame or decoration.
- Human figures, if any, are abstract (circle head, rounded lines). No faces, no clothes.
- Centred and visually balanced inside the live area 2 to 22 (2 px margin on every side). Do not touch the edges. Each icon must look the same visual size as a typical icon of the set (the main shape fills about 16 to 18 units).
- Maximum 6 shapes per icon, merge segments into one path when you can.

FILE FORMAT (strict)
- Every file starts exactly like this:
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
- Allowed elements: path, circle, ellipse, rect, line, polyline, polygon. Nothing else.
- FORBIDDEN: any hard-coded colour (only currentColor), gradients, filters, opacity, text, <image>, <style>, class, id, transform, clip-path, mask, <defs>, <use>, comments, metadata, width/height on the root.
- Coordinates with at most 2 decimals, all inside 2..22. Prefer few smooth paths (arcs and curves) over many tiny segments. File under 1200 bytes.
- The file name is the icon id plus .svg.

THE 4 ICONS (the previous versions were not readable at small size: redraw them from scratch following these precise descriptions)

1) module-home-workout.svg - tile "A casa" (home workouts)
   A yoga/exercise mat rolled up, seen from its end, with the loose flat part unrolling to the right.
   - A circle for the roll, centre about (8,12), radius 5.5. Inside it ONE spiral arc (a smaller open circle radius about 2.5, not closed) to show it is rolled.
   - From the right side of the circle, the unrolled mat: a thin long rounded shape going right along the ground, from x=13 to x=21, thickness about 3 (two parallel lines joined by a rounded end), slightly curved up at the far end.
   - A short line under everything as the floor is NOT wanted. Nothing else.

2) wellbeing-labour.svg - "Travaglio e parto" (labour and birth)
   A stopwatch for timing contractions, with a contraction wave inside.
   - Circle, centre (12,13.5), radius 7.5.
   - A short button on top: a line from (12,6) to (12,3.5) and a short horizontal cap line from (10,3.5) to (14,3.5).
   - Inside the circle ONE smooth wave line (like a bell/contraction curve): starts at (7.5,15), rises smoothly to a peak at about (12,10.5), comes back down to (16.5,15).
   - Nothing else (no clock hands, no numbers).

3) wellbeing-postpartum.svg - "Dopo il parto" (after birth)
   A swaddled newborn bundle held safe, with a small heart.
   - The baby: a circle head, radius 2.6, centre about (9,8.5).
   - The swaddle: one rounded capsule-like body, tilted about 30 degrees, starting just below the head and ending lower right at about (19,18.5); width about 7. Draw it as a single closed rounded path.
   - One short curved line across the swaddle as the blanket fold.
   - A small heart outline (about 5 units wide) at the upper right, centre about (18,6.5).

4) hyrox-sandbag-lunges.svg - HYROX station 7: sandbag lunges
   The sandbag itself plus a forward step arrow.
   - The sandbag: a horizontal rounded bag (capsule/rounded rectangle, about 14 wide and 7 tall, corner radius 3.2) centred around (12,9.5); on its top two small handle loops (arcs about 2 units high) near x=9 and x=15; a short seam line across its middle vertical, from (12,6.5) to (12,12.5).
   - Under it, a lunge step: two short chevron lines (">" shapes), about 4 wide, one at x=8 and one at x=13, y about 18, pointing right, to show walking forward.

OUTPUT FORMAT
- If you can create files, give me a ZIP with the 4 SVG files. Otherwise one code block per icon (language "svg"), each preceded by a line with the file name only, and nothing else.
- Then a short list "Doubts:" only for icons you are not sure are recognisable.

CONSISTENCY CHECK before answering: put the 4 icons side by side at 24 px and a fifth imaginary icon of the set (a simple dumbbell) next to them: same stroke weight, same roundness, same visual size. Redraw the outliers.
```
