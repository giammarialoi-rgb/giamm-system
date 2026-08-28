import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const bodyStart = html.indexOf('<body');
const scriptStart = html.indexOf('<script>');

console.log('HTML Markup between <body> and <script>:\n');
console.log(html.slice(bodyStart, scriptStart));
