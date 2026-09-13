import fs from 'fs';

const files = ['prepare_task20_import_engine.mjs', 'universal-import-engine.mjs'];

files.forEach(fn => {
  let c = fs.readFileSync(fn, 'utf8');
  if (!c.includes('function getExtName(')) {
    c = `function getExtName(filename) {
  if (!filename) return "";
  const idx = filename.lastIndexOf(".");
  return idx !== -1 ? filename.slice(idx).toLowerCase() : "";
}\n\n` + c;
  }
  c = c.replaceAll('path.extname(filename).toLowerCase()', 'getExtName(filename)');
  c = c.replaceAll('path.extname(filename || "").toLowerCase()', 'getExtName(filename || "")');
  c = c.replaceAll('path.extname(filename || "")', 'getExtName(filename || "")');
  c = c.replaceAll('path.extname(originalName).toLowerCase()', 'getExtName(originalName)');
  fs.writeFileSync(fn, c, 'utf8');
  console.log('Successfully patched ' + fn);
});
