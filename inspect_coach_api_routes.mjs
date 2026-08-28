import fs from 'fs';

const coachApi = fs.readFileSync('coach-api.mjs', 'utf8');
console.log('coach-api.mjs length:', coachApi.length, 'lines:', coachApi.split('\n').length);

const routes = [];
const routeRegex = /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
let match;
while ((match = routeRegex.exec(coachApi)) !== null) {
  routes.push(`${match[1].toUpperCase()} ${match[2]}`);
}
console.log('Backend routes found:', routes);
