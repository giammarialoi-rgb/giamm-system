import fs from "fs";
import vm from "vm";

const html = fs.readFileSync("web/index.html", "utf8");

// Extract script content
const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;

while ((match = scriptRegex.exec(html)) !== null) {
  count++;
  const code = match[1];
  console.log(`Checking script block #${count} (length: ${code.length} chars)...`);
  try {
    new vm.Script(code);
    console.log(`✓ Script block #${count} passed JavaScript syntax parsing!`);
  } catch (err) {
    console.error(`✗ Syntax error in script block #${count}:`, err.message);
    process.exit(1);
  }
}

console.log("All inline scripts parsed cleanly with 0 syntax errors!");
