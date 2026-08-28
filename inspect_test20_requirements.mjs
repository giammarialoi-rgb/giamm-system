import fs from 'fs';

const test20 = fs.readFileSync('test_master_task20_architecture.mjs', 'utf8');

const requiredFnsMatch = test20.match(/const requiredFunctions\s*=\s*\[([\s\S]*?)\];/);
if (requiredFnsMatch) {
  console.log('Required functions in test 20:');
  console.log(requiredFnsMatch[0]);
}

const requiredDomMatch = test20.match(/const requiredDomIds\s*=\s*\[([\s\S]*?)\];/);
if (requiredDomMatch) {
  console.log('Required DOM IDs in test 20:');
  console.log(requiredDomMatch[0]);
}
