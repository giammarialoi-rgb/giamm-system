// The app's import path, run in Node: the same steps processUniversalFileInner
// (web/index.base.html) takes for a picked file - format detection, the
// extractor for that format, the parser, the prescription lock. Used by the
// corpus runner to measure what a real file becomes in the app.
import fs from 'node:fs';
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
    text = await engine.extractPdfPlainTextAsync(bytes);
    parsed = engine.parseCanonicalProgramFromText(text, name);
  } else if (r.isDocx) {
    parsed = await engine.extractDocxStructured(bytes, name);
  } else if (r.isDoc) {
    text = engine.extractDocBinaryText(bytes);
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
