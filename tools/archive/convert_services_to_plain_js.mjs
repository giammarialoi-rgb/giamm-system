import fs from 'fs';

const raw = fs.readFileSync('prepare_task20_js_services.mjs', 'utf8');

let code = raw
  .replace(/^export\s+const\s+JS_PRODUCT_SERVICES\s*=\s*`\s*/, '')
  .replace(/`;\s*$/, '');

code = code.replace(/\\(\`|\$|\$\{)/g, '$1');

fs.writeFileSync('prepare_task20_js_services.js', code, 'utf8');
console.log('✓ Converted prepare_task20_js_services.js successfully.');
