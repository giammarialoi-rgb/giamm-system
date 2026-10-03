// Two things people see straight away: a new screen starts from its top, and
// the muscle figure is neutral with the worked muscles lit exactly.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}

const app = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const grab = (name) => {
  const a = app.indexOf('function ' + name + '(');
  return a < 0 ? '' : app.slice(a, app.indexOf('\n}\n', a) + 3);
};

// ---- a new screen starts from the top
const render = grab('render');
ok('a different screen scrolls back to the top after it is drawn', /if \(!sameScreen\) \{[\s\S]*draw\(\);\s*scrollAppToTop\(\);/.test(render));
ok('the same screen keeps its place', /return keepScrollDuring\(draw\);/.test(render));
const top = grab('scrollAppToTop');
ok('every scroller is reset, the window too', /view-container/.test(top) && /scrollingElement/.test(top) && /window\.scrollTo\(0, 0\)/.test(top));

// Run it against stand-ins: the scrolled containers go to 0
const els = [{ scrollTop: 480 }, { scrollTop: 300 }];
const ctx = vm.createContext({
  document: { scrollingElement: els[0], documentElement: els[1], body: { scrollTop: 0 }, getElementById: () => null, querySelector: () => null },
  window: { scrollTo(x, y) { ctx.__to = [x, y]; } }
});
vm.runInContext(top, ctx);
vm.runInContext('scrollAppToTop()', ctx);
ok('scrolled containers end at 0', els[0].scrollTop === 0 && els[1].scrollTop === 0 && ctx.__to && ctx.__to[1] === 0);

// ---- the figure
ok('the four neutral figures and their maps exist', ['m', 'f'].every((s) => ['front', 'back'].every((v) => fs.existsSync('web/body-' + s + '-' + v + '.png') && fs.existsSync('web/body-' + s + '-' + v + '-map.png'))));
ok('the coloured originals are kept as the source, not shipped', fs.existsSync('tools/body-source/muscle-male-front.png') && !fs.existsSync('web/muscle-male-front.png'));
ok('the offline list and the sync list carry the new files', ['body-m-front-map.png', 'body-f-back.png'].every((n) => fs.readFileSync('web/sw.js', 'utf8').includes(n) && fs.readFileSync('sync_web_assets.mjs', 'utf8').includes(n)) && !/muscle-male/.test(fs.readFileSync('web/sw.js', 'utf8')));
ok('no more boxes over the figure', !/statsHotspots|hotspotClass|stats-hotspot/.test(app));
ok('choosing a muscle relights the figure', /function selectStatsMuscle[\s\S]*paintStatsBodies\(\);/.test(app));
ok('a tap on a muscle selects its group', /function statsBodyTap\(ev, view\) \{\n  const g = statsBodyMuscleAt\(ev, view\);\n  if \(g\) selectStatsMuscle\(g\);/.test(app));
ok('the shared image draws the same lit figure', /const lit = assets \? paintBodyHighlight\(assets, muscles, null\) : null;/.test(app));
const mapLabels = fs.readFileSync('tools/build_body_maps.mjs', 'utf8');
ok('every muscle number of the map belongs to a group in the page', [...mapLabels.matchAll(/^\s+(\d+): '(\w+)'/gm)].map((m) => Number(m[1])).filter((n) => n && n < 20).every((n) => new RegExp('\\b' + n + ": '[A-Z]+'").test(app.slice(app.indexOf('var BODY_MUSCLE_GROUP'), app.indexOf('var __bodyAssets')))));

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nSchermate: tutto verde');
