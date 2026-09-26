// PDF programs read by their layout (pdf-layout.mjs), on PDFs built here:
// a grid of weeks x days drawn with ruling lines, text in a two-byte font
// whose own map says which letter each code is, a note under the table, and
// a document that declares its "% . reps . serie" notation.
import zlib from 'node:zlib';
import { readPdfLayout, pdfLayoutToText, expandDeclaredDotNotation } from './pdf-layout.mjs';
import { parseCanonicalProgramFromText } from './universal-import-engine.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

// A PDF from its objects (no xref: the reader does not need one).
function pdf(objects) {
  let s = '%PDF-1.4\n';
  objects.forEach((body, i) => {
    s += (i + 1) + ' 0 obj\n' + body + '\nendobj\n';
  });
  s += 'trailer\n<< /Root 1 0 R >>\n%%EOF\n';
  return new Uint8Array(Buffer.from(s, 'latin1'));
}
const stream = (text, dict = '') => '<< /Length ' + Buffer.byteLength(text, 'latin1') + dict + ' >>\nstream\n' + text + '\nendstream';
// Two-byte codes, each letter shifted by 0x10 - the kind of font a Word or
// Pages export writes: only its ToUnicode map says what the codes are.
const hex2 = (str) => '<' + Array.from(str).map((ch) => (ch.charCodeAt(0) - 0x10).toString(16).padStart(4, '0')).join('') + '>';
const cmap = '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n1 beginbfrange\n<0010> <00EF> <0020>\nendbfrange\nendcmap\nend\nend';
const inflate = async (u8) => new Uint8Array(zlib.inflateSync(u8));

console.log('');
console.log('--- 1. griglia settimane x giorni, font a due byte, nota sotto la tabella ---');
{
  const cell = (x, y, text) => 'BT /F2 11 Tf 1 0 0 1 ' + x + ' ' + y + ' Tm ' + hex2(text) + ' Tj ET\n';
  const line = (x0, y0, x1, y1) => x0 + ' ' + y0 + ' m ' + x1 + ' ' + y1 + ' l S\n';
  let content = 'BT /F1 14 Tf 50 760 Td (Programma di prova) Tj ET\n';
  [50, 200, 350, 500].forEach((x) => { content += line(x, 700, x, 500); });
  [700, 600, 500].forEach((y) => { content += line(50, y, 500, y); });
  content += cell(60, 680, 'Squat 5x5') + cell(60, 665, 'Leg curl 3x12');
  content += cell(210, 680, 'Panca 4x6');
  content += cell(360, 680, 'Stacco 3x3');
  content += cell(60, 580, 'Squat 5x3 80%');
  content += cell(210, 580, 'Panca 5x5');
  content += 'BT /F1 10 Tf 50 470 Td (Con andamento ondulato 6x6 70%-4x4 80%-8x5 75% etc) Tj ET\n';
  const bytes = pdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    stream(content),
    '<< /Type /Font /Subtype /Type0 /BaseFont /ABCDEF+Arial /Encoding /Identity-H /DescendantFonts [8 0 R] /ToUnicode 7 0 R >>',
    stream(cmap),
    '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /ABCDEF+Arial /DW 500 >>'
  ]);
  const layout = await readPdfLayout(bytes, { inflate });
  ok('1a. il testo del font a due byte si legge con la sua mappa', layout.items.some((i) => i.text === 'Squat 5x5'));
  const { text } = pdfLayoutToText(layout);
  ok('1b. righe = settimane, colonne = giorni', /SETTIMANA 1\nGIORNO 1\nSquat 5x5\nLeg curl 3x12\nGIORNO 2\nPanca 4x6\nGIORNO 3\nStacco 3x3\nSETTIMANA 2\nGIORNO 1\nSquat 5x3 80%\nGIORNO 2\nPanca 5x5/.test(text));
  ok('1c. la spiegazione sotto la tabella e\' una nota', /\n_Con andamento ondulato/.test(text));
  const parsed = parseCanonicalProgramFromText(text, 'prova.pdf');
  const p = parsed.canonicalProgram || parsed.program || parsed;
  const w = p.weeks || [];
  ok('1d. il programma ha 2 settimane, la prima di 3 giorni', w.length === 2 && w[0].sessions.length === 3);
  ok('1e. l\'ultimo giorno non riceve la nota come esercizio', !w[1].sessions.some((s) => s.exercises.some((e) => /andamento/i.test(e.name_original || ''))));
}

console.log('');
console.log('--- 2. una griglia di soli nomi, e una tabella alternativa ---');
{
  const t = (x, y, s) => 'BT /F1 10 Tf ' + x + ' ' + y + ' Td (' + s + ') Tj ET\n';
  const box = (x0, y0, x1, y1) => x0 + ' ' + y0 + ' m ' + x1 + ' ' + y0 + ' l S\n' + x0 + ' ' + y1 + ' m ' + x1 + ' ' + y1 + ' l S\n';
  const cols = (y0, y1) => [50, 250, 450].map((x) => x + ' ' + y0 + ' m ' + x + ' ' + y1 + ' l S\n').join('');
  let content = box(50, 700, 450, 600) + cols(700, 600) + t(60, 680, 'Panca isocinetica') + t(60, 665, 'Squat volume') + t(260, 680, 'Stacco variante ramp');
  content += t(50, 560, 'Alternativa ortodossa');
  content += box(50, 540, 450, 440) + cols(540, 440) + t(60, 520, 'Squat gara volume') + t(260, 520, 'Panca volume');
  const bytes = pdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    stream(content)
  ]);
  const { text, warnings } = pdfLayoutToText(await readPdfLayout(bytes, { inflate }));
  ok('2a. una cella di soli nomi e\' l\'elenco degli esercizi', /GIORNO 1\n- Panca isocinetica\n- Squat volume\nGIORNO 2\n- Stacco variante ramp/.test(text));
  ok('2b. la tabella "alternativa" non diventa altre settimane, ed e\' segnalata', !/Squat gara volume/.test(text) && warnings.length === 1 && /Alternativa ortodossa/.test(warnings[0]));
  const parsed = parseCanonicalProgramFromText(text, 'template.pdf');
  const p = parsed.canonicalProgram || parsed.program || parsed;
  ok('2c. i nomi senza schema diventano esercizi del loro giorno', p.weeks[0] && p.weeks[0].sessions[0].exercises.map((e) => e.name_original).join('|') === 'Panca isocinetica|Squat volume');
}

console.log('');
console.log('--- 3. notazione dichiarata "% . reps . serie" e settimana scritta a margine ---');
{
  ok('3a. "75.3.5" e\' 5x3 al 75%, "8/6.5 Serie" e\' 5x8/6, solo se il documento lo dichiara',
    expandDeclaredDotNotation('Giorno 1 % . reps . serie\nSquat 75.3.5\nTrazioni 8/6.5 Serie\nStacco 80.3.5.') === 'Giorno 1 % . reps . serie\nSquat 5x3 75%\nTrazioni 5x8/6\nStacco 5x3 80%'
    && expandDeclaredDotNotation('Squat 75.3.5') === 'Squat 75.3.5');
  const t = (x, y, s) => 'BT /F1 10 Tf ' + x + ' ' + y + ' Td (' + s + ') Tj ET\n';
  const content = t(80, 740, 'Giorno 1') + t(200, 740, '% . reps . serie') + t(20, 720, 'Settimana') + t(80, 720, 'Squat 75.3.5') + t(80, 705, 'Panca 65.4.4') + t(20, 705, '01') + t(80, 680, 'Giorno 2') + t(80, 665, 'Stacco 70.4.5');
  const bytes = pdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    stream(content)
  ]);
  const { text } = pdfLayoutToText(await readPdfLayout(bytes, { inflate }));
  ok('3b. "Settimana" / "01" a margine: SETTIMANA 1 prima del suo Giorno 1, non attaccata agli esercizi', /^SETTIMANA 1\nGiorno 1 % \. reps \. serie\nSquat 5x3 75%\nPanca 4x4 65%\nGiorno 2\nStacco 5x4 70%$/.test(text));
}

console.log('');
console.log('--- 4. la lunghezza indiretta di uno stream ---');
{
  // "/Length 180 0 R": read as 18 it cut the stream (the text of a real PDF came out empty).
  const text = 'BT /F1 10 Tf 50 700 Td (Squat 5x5 lunga abbastanza da superare diciotto byte) Tj ET';
  const bytes = pdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length 18 0 R >>\nstream\n' + text + '\nendstream'
  ]);
  const layout = await readPdfLayout(bytes, { inflate });
  ok('4a. "/Length 18 0 R" e\' un riferimento, non 18 byte', layout.items.some((i) => /diciotto byte/.test(i.text)));
}

console.log('');
if (failed) { console.log(failed + ' controlli dei PDF falliti.'); process.exit(1); }
console.log('Tutti i controlli dei PDF passano.');
