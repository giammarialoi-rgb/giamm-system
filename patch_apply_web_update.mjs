import fs from 'fs';

let script = fs.readFileSync('apply_web_update.mjs', 'utf8').replace(/\r\n/g, '\n');

// 1. Fix startMarker logic
script = script.replace(
  `const startIndex = html.indexOf(startMarker);
const endIndex = html.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end markers in web/index.html");
  process.exit(1);
}`,
  `let startIndex = html.indexOf(startMarker);
const endIndex = html.indexOf(endMarker);

if (endIndex === -1) {
  console.error("Could not find end marker in web/index.html");
  process.exit(1);
}
if (startIndex === -1) {
  startIndex = endIndex;
}`
);

// 2. Fix post-processing
script = script.replace(
  `const newHtml = html.slice(0, startIndex) + replacementCode + html.slice(endIndex);
fs.writeFileSync(htmlPath, newHtml, 'utf8');`,
  `let newHtml = html.slice(0, startIndex) + replacementCode + html.slice(endIndex);

if (!newHtml.includes('<script src="xlsx.full.min.js"></script>')) {
  newHtml = newHtml.replace("</head>", '  <script src="xlsx.full.min.js"></script>\\n</head>');
}
if (!newHtml.includes("else if(currentView === 'import') renderImport(c);")) {
  newHtml = newHtml.replace("else if(currentView === 'db') renderDb(c);", "else if(currentView === 'db') renderDb(c);\\n  else if(currentView === 'import') renderImport(c);");
}
fs.writeFileSync(htmlPath, newHtml, 'utf8');`
);

fs.writeFileSync('apply_web_update.mjs', script, 'utf8');
console.log("apply_web_update.mjs patched successfully!");
