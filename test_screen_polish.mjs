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
// ---- in the statistics, "Generale" lights what was worked in the period chosen there; the cards after a workout use their session
ok('the map is fed with the muscles of the chosen period', /renderMuscleMap\(periodMusclesForMap\(snap\.muscles\)/.test(app));
ok('the figure and the chips follow the zoom: they are refreshed whenever the stats data is', /function renderStatsData\(\)\{\n  try \{ refreshStatsMuscleMap\(\); \} catch \(_\) \{\}/.test(app));
ok('the period is the one of the charts: same zoom, same axis, all muscles, no exercise filter', /zoomWeeks: statsZoomWeeks\(\),\n      muscle: 'TOTAL',\n      exercise: ''/.test(app) && /axis: statsAxis\(\),\n      zoomWeeks/.test(app));
ok('the post-workout cards keep their own session, not the period', /window\.__bodyStaticMuscles = muscles;/.test(app) && /const muscles = isStatic \? \(window\.__bodyStaticMuscles \|\| \{\}\) : \(window\.__statsBodyMuscles \|\| \{\}\);/.test(app));
{
  const src = app.slice(app.indexOf('function bodyGroupLevels('), app.indexOf('function paintBodyHighlight('));
  const groups = ['PETTO', 'GAMBE', 'ADDOME', 'BRACCIA', 'SPALLE', 'DORSO'];
  // a stand-in for the analytics engine: the sets of each window of weeks
  const WINDOWS = {
    1: [{ id: 'GAMBE', effectiveWeightedSets: 14.2 }, { id: 'ADDOME', effectiveWeightedSets: 3 }],
    0: groups.map((id, i) => ({ id, effectiveWeightedSets: 8 + i * 4 }))
  };
  const sctx = vm.createContext({
    MACRO_MUSCLE_GROUPS: groups.map((id) => ({ id })),
    statsMuscleVolume: (m, id) => Number(m[id]) || 0,
    statsAxis: () => 'training',
    statsZoomWeeks: () => sctx.__zoom,
    currentWeek: 6,
    store: { prefs: {}, trainingWeek: 6 },
    DATA: {},
    window: { TrainingAnalyticsEngine: { build: (st, d, o) => (sctx.__broken ? null : { byMuscle: WINDOWS[o.zoomWeeks] || [] }) } },
    __zoom: 1
  });
  vm.runInContext(src, sctx);
  vm.runInContext(app.slice(app.indexOf('function statsPeriodMuscles('), app.indexOf('// The period changed (zoom, axis')), sctx);
  const week = vm.runInContext('periodMusclesForMap({ PETTO: 99 })', sctx);
  ok('a one-week period holds only what that week worked, never the fallback', week.GAMBE === 14 && week.ADDOME === 3 && week.PETTO === undefined);
  sctx.__zoom = 0;
  const all = vm.runInContext('periodMusclesForMap(null)', sctx);
  ok('the whole period holds every group worked in it', groups.every((g) => all[g] >= 1));
  sctx.__m = all;
  const lv = vm.runInContext("bodyGroupLevels(__m, 'GENERALE')", sctx);
  ok('Generale lights all six groups of that period', Object.values(lv).every((v) => v > 0.4));
  ok('the most worked group is the brightest, the least worked still visible', lv.DORSO > lv.PETTO && lv.PETTO >= 0.45 && lv.DORSO <= 0.95);
  sctx.__w = week;
  const lw = vm.runInContext("bodyGroupLevels(__w, 'GENERALE')", sctx);
  ok('in a short period the groups not worked stay neutral', lw.GAMBE > 0.4 && lw.PETTO === 0 && lw.DORSO === 0);
  ok('a chosen group is fully lit and the other worked ones only softly', (() => { const c = vm.runInContext("bodyGroupLevels(__w, 'GAMBE')", sctx); return c.GAMBE === 1 && c.ADDOME === 0.2 && c.PETTO === 0; })());
  sctx.__broken = true;
  ok('without the analytics it falls back on what it is given', vm.runInContext('periodMusclesForMap({ GAMBE: 5 })', sctx).GAMBE === 5);
}

// ---- the Coach AI conversation reads like a chat
ok('what you write is on the right, in gold; the answers are on the left, with the name', /#chat-history \.msg\.user \{\n  align-self: flex-end;/.test(app) && /#chat-history \.msg\.ai \{\n  align-self: flex-start;/.test(app) && /content: 'NURVAN AI'/.test(app));
ok('the bubbles do not stretch the whole width, so the two sides are told apart', /#chat-history \.msg \{ margin: 0; max-width: 88%;/.test(app) && /#chat-history \{ display: flex; flex-direction: column;/.test(app));
ok('the proposal cards keep the full width', /#chat-history \.card \{ align-self: stretch;/.test(app));

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nSchermate: tutto verde');
