import fs from 'fs';

// Read prepare_task20_views_and_handlers.mjs
const raw = fs.readFileSync('prepare_task20_views_and_handlers.mjs', 'utf8');

// Strip the export const wrapper
let code = raw
  .replace(/^export\s+const\s+JS_VIEWS_AND_HANDLERS\s*=\s*`\s*/, '')
  .replace(/`;\s*$/, '');

// Replace escaped template expressions \${ to ${ and \` to `
code = code.replace(/\\(\`|\$|\$\{)/g, '$1');

// Fix key in duplicateSet to standard w{W}_d{D}_e{E}
code = code.replace(
  'const key = `w${currentWeek}_d${currentDay}_e${exIdx}_customSets`;',
  'const key = `w${currentWeek}_d${currentDay}_e${exIdx}`;'
);

// Safely wrap showToast calls
code = code.replace(/(?<!if\s*\(typeof\s+showToast\s*===\s*'function'\)\s*)showToast\(/g, "if (typeof showToast === 'function') showToast(");

// Replace review header and button
code = code.replace(
  '<h2 style="font-size:18px; margin:2px 0 0; color:#fff; font-weight:900;">CONFERMA IMPORTAZIONE</h2>',
  '<h2 style="font-size:18px; margin:2px 0 0; color:#fff; font-weight:900;">REVISIONE PROGRAMMA IMPORTATO</h2>'
);
code = code.replace(
  "${pState.isConfirming ? 'ATTIVAZIONE...' : '✓ CONFERMA & ATTIVA'}",
  "${pState.isConfirming ? 'ATTIVAZIONE...' : '✓ CONFERMA E ATTIVA'}"
);

fs.writeFileSync('prepare_task20_views_and_handlers.js', code, 'utf8');
console.log('✓ Converted prepare_task20_views_and_handlers.js successfully with safe showToast.');
