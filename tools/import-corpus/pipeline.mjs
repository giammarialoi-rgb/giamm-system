// The app's import path, run in Node: the same steps processUniversalFileInner
// (web/index.base.html) takes for a picked file - format detection, the
// extractor for that format, the parser, the prescription lock. Used by the
// corpus runner to measure what a real file becomes in the app.
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(path.join(root, 'package.json'));
const XLSX = require('xlsx');
globalThis.XLSX = XLSX;

const engine = await import(pathToUrl(path.join(root, 'universal-import-engine.mjs')));
const di = await import(pathToUrl(path.join(root, 'document-intelligence-core.mjs')));
const rx = await import(pathToUrl(path.join(root, 'prescription-engine.mjs')));
const tables = await import(pathToUrl(path.join(root, 'import-tables.mjs')));
const pdf = await import(pathToUrl(path.join(root, 'pdf-layout.mjs')));

function pathToUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/');
}

export function routeFor(bytes, name) {
  const detect = di.detectFormat(bytes, name, '');
  const route = detect.route;
  return {
    detect,
    isExcel: route === 'excel' || /\.(xlsx|xls|xlsm)$/i.test(name),
    isPdf: route === 'pdf' || /\.pdf$/i.test(name),
    isDocx: route === 'docx' || /\.docx$/i.test(name),
    isDoc: route === 'doc' || (/\.doc$/i.test(name) && !/\.docx$/i.test(name)),
    isImage: route === 'image'
  };
}

// Returns { program, text, route } where program is the canonical program the
// review screen would show.
export async function importFile(filePath) {
  const name = path.basename(filePath);
  const bytes = new Uint8Array(fs.readFileSync(filePath));
  const r = routeFor(bytes, name);
  let parsed = null;
  let text = '';
  if (r.isExcel) {
    const wb = XLSX.read(bytes, { type: 'array', cellFormula: true, cellDates: true });
    parsed = engine.parseStructuredWorkbook(wb, name);
    if (parsed && Array.isArray(parsed.sheets)) {
      text = parsed.sheets.map((s) => {
        const rows = (s.rawRows || []).map((row) => (row || []).filter((c) => c != null && String(c).trim() !== '').join('\t')).filter(Boolean);
        return (s.name ? ('# ' + s.name + '\n') : '') + rows.join('\n');
      }).join('\n\n');
    }
  } else if (r.isPdf) {
    // As the app: the layout reader (fonts one by one, table cells), the
    // old extractor only when it finds nothing.
    let warnings = [];
    try {
      const lay = await pdf.readPdfLayout(bytes, { inflate: async (u8) => new Uint8Array(zlib.inflateSync(u8)) });
      const res = pdf.pdfLayoutToText(lay);
      if (res.text.trim().length > 40) { text = res.text; warnings = res.warnings; }
    } catch (_) {}
    if (!text) text = await engine.extractPdfPlainTextAsync(bytes);
    parsed = engine.parseCanonicalProgramFromText(text, name);
    if (warnings.length && parsed) (parsed.canonicalProgram || parsed.program || parsed).pdf_warnings = warnings;
  } else if (r.isDocx) {
    parsed = await engine.extractDocxStructured(bytes, name);
  } else if (r.isDoc) {
    text = engine.extractDocBinaryText(bytes);
    parsed = engine.parseCanonicalProgramFromText(text, name);
  } else if (r.isImage) {
    // Tesseract runs in the browser (the app loads it there): its text for this
    // image is saved next to the corpus, <corpus>/ocr/<file>.txt, and the
    // parser is measured on that real OCR output.
    // <file>.ocr.json holds { raw: { text, words }, prep: { text, words } }
    // (prep: the image cleaned up before OCR); OCR_MODE picks one.
    const ocrPath = path.join(path.dirname(filePath), '..', 'ocr', name + '.ocr.json');
    if (!fs.existsSync(ocrPath)) throw new Error('OCR mancante (' + ocrPath + '): va letto nel browser');
    const all = JSON.parse(fs.readFileSync(ocrPath, 'utf8'));
    const ocr = all[process.env.OCR_MODE || 'raw'];
    // The app's second pass (one colour channel) gives back day headings in coloured boxes.
    const second = all[process.env.OCR_HEADINGS_FROM || 'greengray'] || all.green;
    if (second && process.env.OCR_HEADINGS !== '0') ocr.words = tables.mergeOcrHeadings(ocr.words, second.words);
    text = tables.cleanOcrText((process.env.OCR_REFLOW !== '0' && tables.reflowOcrColumns(ocr.words)) || ocr.text);
    parsed = engine.parseCanonicalProgramFromText(text, name);
  } else {
    throw new Error('Formato non gestito dal runner: ' + name);
  }
  const program = engine.buildCanonicalProgram(parsed);
  try {
    if (program) {
      rx.applyPrescriptionsToProgram(program, text || (program.documentIR && program.documentIR.originalText) || '');
      rx.enforceAllPrescriptions(program);
    }
  } catch (_) {}
  return { program, text, route: r.detect.route, parsed };
}

// The weeks of a canonical program, whatever the shape (training.weeks or weeks).
export function programWeeks(program) {
  if (!program) return [];
  return (program.training && program.training.weeks) || program.weeks || [];
}
