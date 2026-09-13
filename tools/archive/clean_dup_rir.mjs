import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

// Find the two occurrences of "function rirToRpe"
const firstIdx = html.indexOf('function rirToRpe');
const secondIdx = html.indexOf('function rirToRpe', firstIdx + 1);

console.log('First occurrence idx:', firstIdx);
console.log('Second occurrence idx:', secondIdx);

if (firstIdx !== -1 && secondIdx !== -1) {
  // Let's find where the duplicate section starts before secondIdx and ends before EXERCISE_DICTIONARY
  const dupStart = html.lastIndexOf('// ====================================================\n// UNIVERSAL IMPORT ENGINE 2.1', secondIdx) !== -1 ?
    html.lastIndexOf('// ====================================================\n// UNIVERSAL IMPORT ENGINE 2.1', secondIdx) :
    html.lastIndexOf('// ====================================================\r\n// UNIVERSAL IMPORT ENGINE 2.1', secondIdx);

  const dupEnd = html.indexOf('const EXERCISE_DICTIONARY = [', secondIdx);

  console.log('dupStart:', dupStart, 'dupEnd:', dupEnd);

  if (dupStart !== -1 && dupEnd !== -1) {
    const cleaned = html.slice(0, dupStart) + html.slice(dupEnd);
    console.log('Cleaned length:', cleaned.length);
    fs.writeFileSync('web/index.html', cleaned, 'utf8');
    fs.writeFileSync('app/src/main/assets/index.html', cleaned, 'utf8');
    console.log('Cleaned successfully and synced!');
  }
}
