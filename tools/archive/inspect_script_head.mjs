import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>');
const scriptContent = html.slice(scriptStart + 8, scriptEnd);

console.log('Script first 2000 chars:');
console.log(scriptContent.slice(0, 2000));
