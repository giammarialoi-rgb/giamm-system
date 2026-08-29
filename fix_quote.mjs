import fs from 'fs';

let content = fs.readFileSync('generate_bundles.mjs', 'utf8');
content = content.replace(
  "showToast('Errore durante l\\'attivazione: ' + err.message, 'danger');",
  'showToast("Errore durante l\'attivazione: " + err.message, "danger");'
);
fs.writeFileSync('generate_bundles.mjs', content, 'utf8');
console.log('Fixed generate_bundles.mjs');
