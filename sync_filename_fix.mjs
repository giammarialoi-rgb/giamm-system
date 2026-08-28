import fs from 'fs';

let uie = fs.readFileSync('universal-import-engine.mjs', 'utf8');
if (!uie.includes('if (typeof filename === \'object\'')) {
  uie = uie.replace(
    'export function parseStructuredWorkbook(workbook, filename = "documento.xlsx") {\n  const { sheets, sheetNames } = readStructuredWorkbook(workbook);',
    'export function parseStructuredWorkbook(workbook, filename = "documento.xlsx") {\n  if (typeof filename === \'object\' && filename !== null) {\n    filename = filename.fileName || filename.filename || filename.name || "documento.xlsx";\n  }\n  if (typeof filename !== \'string\') {\n    filename = "documento.xlsx";\n  }\n  const { sheets, sheetNames } = readStructuredWorkbook(workbook);'
  );
  fs.writeFileSync('universal-import-engine.mjs', uie, 'utf8');
}

let web = fs.readFileSync('web/index.html', 'utf8');
if (!web.includes('if (typeof filename === \'object\'')) {
  web = web.replace(
    'function parseStructuredWorkbook(workbook, filename = "documento.xlsx") {\n  const { sheets, sheetNames } = readStructuredWorkbook(workbook);',
    'function parseStructuredWorkbook(workbook, filename = "documento.xlsx") {\n  if (typeof filename === \'object\' && filename !== null) {\n    filename = filename.fileName || filename.filename || filename.name || "documento.xlsx";\n  }\n  if (typeof filename !== \'string\') {\n    filename = "documento.xlsx";\n  }\n  const { sheets, sheetNames } = readStructuredWorkbook(workbook);'
  );
  fs.writeFileSync('web/index.html', web, 'utf8');
  fs.writeFileSync('app/src/main/assets/index.html', web, 'utf8');
}

console.log('Filename safe handling synced');
