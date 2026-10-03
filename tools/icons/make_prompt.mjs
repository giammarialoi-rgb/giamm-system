// node tools/icons/make_prompt.mjs  ->  docs/ICONE-PROMPT-CHATGPT.md
// Writes the prompts to copy into ChatGPT, from the manifest (so the list never drifts from what the app needs).
import fs from 'node:fs';
import { ICONS, GRIDS, GROUPS } from './manifest.mjs';

const GROUP_TITLE = {
  'home-modules': 'Moduli della Home', actions: 'Azioni piccole', sections: 'Sezioni e persone', training: 'Allenamento e corpo', muscles: 'Gruppi muscolari',
  disciplines: 'Discipline a casa', hyrox: 'Stazioni HYROX', wellbeing: 'Salute e recupero', 'coach-os': 'Area coach', 'empty-states': 'Stati vuoti (illustrazioni)'
};
const BATCH = 14;
const g = GRIDS;

const master = `You are an icon designer producing a CUSTOM, CONSISTENT SVG icon set for a fitness app called Nurvan (dark UI, gold accent).
I will send you icons in batches. For every icon you return one standalone SVG file. Follow these rules EXACTLY; if an icon cannot respect them, simplify the icon, never break the rules.

STYLE (identical for every icon, this is the most important thing)
- Outline style, drawn with strokes only. Rounded line caps and rounded line joins. One consistent stroke width inside each grid (see below). No fills, except tiny solid dots (r <= 1.2) written as fill="currentColor" stroke="none".
- Friendly, geometric, slightly sporty. Simple shapes, generous curves, corner radius about 2 units on rectangles. Same level of detail in all icons: recognisable at a glance at 20 px, never fussy. Maximum 8 shapes per icon (merge segments into one path when you can).
- One single idea per icon. No text, no letters, no numbers, no background shape, no frame, no decoration.
- Human figures are abstract: a circle for the head, simple lines for body and limbs (stick-figure with rounded strokes, about 3 head-heights tall). No faces, no clothes.
- Keep the icon centred and visually balanced inside the live area. Do not touch the edges.

TWO GRIDS
- UI icons ("ui"): viewBox="${g.ui.viewBox}", stroke-width="${g.ui.stroke}", live area ${g.ui.live}.
- Illustrations ("art", empty states): viewBox="${g.art.viewBox}", stroke-width="${g.art.stroke}", live area ${g.art.live}. They are slightly richer than UI icons but follow the same line style, and may use up to 10 shapes.

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

Reply "Ready" and wait for the first batch.`;

function batchPrompt(group, items, n, total) {
  const grid = items[0].grid;
  const lines = items.map((i) => `${i.id}.svg (shown at ${i.size}px) - draw: ${i.draw}.`).join('\n');
  return `Batch ${n}/${total} - ${GROUP_TITLE[group] || group} - grid "${grid}" (viewBox ${g[grid].viewBox}, stroke-width ${g[grid].stroke}).
Same rules and style as before. Return one SVG per icon, file names exactly as written:

${lines}`;
}

let out = `# Icone di Nurvan: prompt per ChatGPT

Generato da \`tools/icons/make_prompt.mjs\` (elenco in \`tools/icons/manifest.mjs\`: ${ICONS.length} icone). Non modificare a mano questo file: cambia il manifest e rigenera.

## Come si usa

1. Apri una **nuova chat** di ChatGPT (meglio il modello con "Thinking"/ragionamento attivo e, se puoi, con l'analisi dei dati/code interpreter, che sa restituire uno ZIP).
2. Incolla il **PROMPT 0** (stile e regole) e aspetta "Ready".
3. Incolla i batch uno alla volta (PROMPT 1, 2, ...). Un batch alla volta mantiene lo stile uniforme. Se uno stile deriva, scrivi: "Redraw the batch matching the first batch exactly: same stroke weight, roundness and detail."
4. Salva ogni file come \`<id>.svg\` (il nome dell'icona è già nel prompt) in **\`web/icons/\`** del progetto (le icone "art" vanno nella stessa cartella).
5. Controlla i file: \`node tools/icons/check.mjs\` (verifica formato, griglia, spessore, colori, dimensioni, e dice quali mancano).
6. Dimmelo: monto lo sprite, sostituisco emoji e caratteri e rifaccio il giro di verifica sulle schermate.

Se un'icona non convince, rimanda a ChatGPT solo quella riga con una correzione ("make the sandwich simpler: two slices and one wavy line"). Non servono ritocchi a mano se rispettano le regole: i file sono pronti all'uso.

## Dati utili per chi li disegna

- Tema scuro (sfondo quasi nero, \`#0a0a0a\`), icone **oro** (\`#d4af37\`), bianche o rosse in base al contesto: per questo tutto è \`currentColor\`, mai colori fissi.
- Dimensioni di uso: icone di sezione 24 px, azioni nei bottoni 18-20 px, tessere della Home e delle discipline 28 px, stati vuoti 64 px. Devono restare leggibili a 18 px, con linea sottile su fondo scuro.
- Area di tocco: l'icona è sempre dentro un bottone di almeno 36 px; l'icona stessa non deve avere "aria" extra dentro il file (usa i margini della griglia indicati).
- Stile di riferimento già nell'app: la barra in basso (casa, manubrio, grafico, cerchi, tre linee) è un set a linea molto semplice; le nuove icone devono sembrare della stessa famiglia ma più rotonde e un po' più sportive.
- Le icone di persona sono astratte (cerchio per la testa, linee per il corpo): niente volti, niente genere, niente abiti. Salute e recupero: immagini sobrie e rispettose.

## PROMPT 0 - stile e regole (incollare per primo)

\`\`\`
${master}
\`\`\`
`;

let n = 0;
const batches = [];
for (const group of GROUPS) {
  const items = ICONS.filter((i) => i.group === group);
  for (let i = 0; i < items.length; i += BATCH) batches.push({ group, items: items.slice(i, i + BATCH) });
}
for (const b of batches) {
  n++;
  out += `\n## PROMPT ${n} - ${GROUP_TITLE[b.group] || b.group} (${b.items.length} icone)\n\n\`\`\`\n${batchPrompt(b.group, b.items, n, batches.length)}\n\`\`\`\n`;
}

out += `\n## Dove vanno e cosa sostituiscono

| Icona | Dove | Dimensione | Sostituisce |
|---|---|---|---|
${ICONS.map((i) => `| \`${i.id}\` | ${i.usage} | ${i.size} px | ${i.replaces || '-'} |`).join('\n')}
`;

fs.writeFileSync(new URL('../../docs/ICONE-PROMPT-CHATGPT.md', import.meta.url), out);
console.log('written docs/ICONE-PROMPT-CHATGPT.md:', ICONS.length, 'icons,', batches.length, 'batches');
