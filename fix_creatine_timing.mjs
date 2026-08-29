import fs from 'fs';

let content = fs.readFileSync('prepare_task20_js_services.mjs', 'utf8');
content = content.replaceAll('timing: "Post-workout / Quotidiano"', 'timing: "Post-workout"');
content = content.replaceAll("timing: 'Post-workout / Quotidiano'", "timing: 'Post-workout'");

fs.writeFileSync('prepare_task20_js_services.mjs', content, 'utf8');
console.log('Replaced all timing: Post-workout in prepare_task20_js_services.mjs');
