/**
 * data/youtube-links.json -> web/youtube-links.js
 *
 * The YouTube link of each exercise of the catalog (web/exercise-catalog-extra.js,
 * by exact `name`) and of each warm-up (web/warmup-exercise-library.js, by `id`),
 * shipped as a static script like the other catalogs: offline, no request to read it.
 *
 * A wrong video is worse than none, so a demo goes through only when it was
 * checked by hand (`verified === true`) and its address is exactly a YouTube
 * Short or watch page for its own 11-character id. Anything else is shipped
 * without a demo, and the app offers the YouTube search (`youtube_query`).
 * How to add or fix a link: docs/YOUTUBE_LINKS.md.
 */
import fs from 'node:fs';
import path from 'node:path';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

// The address a verified demo may open, or null.
export function verifiedDemoUrl(demo) {
  if (!demo || typeof demo !== 'object' || demo.verified !== true) return null;
  const id = String(demo.id || '');
  if (!VIDEO_ID.test(id)) return null;
  const url = String(demo.url || '');
  const allowed = ['https://www.youtube.com/shorts/' + id, 'https://www.youtube.com/watch?v=' + id];
  return allowed.includes(url) ? url : null;
}

// The entries as the app gets them, and what was left out and why.
export function compileYoutubeLinks(entries) {
  const out = [];
  const rejected = [];
  const seen = new Set();
  for (const e of Array.isArray(entries) ? entries : []) {
    if (!e || (e.type !== 'exercise' && e.type !== 'warmup')) { rejected.push({ entry: e && e.name, reason: 'type' }); continue; }
    const key = e.type === 'warmup' ? 'w:' + String(e.id || '') : 'e:' + String(e.name || '');
    if (key.length < 3) { rejected.push({ entry: e.name, reason: 'key' }); continue; }
    if (seen.has(key)) { rejected.push({ entry: e.name, reason: 'duplicate' }); continue; }
    seen.add(key);
    const row = { type: e.type, youtube_query: String(e.youtube_query || '').trim() || null };
    if (e.type === 'warmup') row.id = String(e.id); else row.name = String(e.name);
    const url = verifiedDemoUrl(e.youtube_demo);
    if (url) {
      const d = e.youtube_demo;
      row.demo = { id: String(d.id), url, verified: true };
      if (d.channel) row.demo.channel = String(d.channel);
      if (Number(d.duration_s) > 0) row.demo.duration_s = Math.round(Number(d.duration_s));
    } else if (e.youtube_demo) {
      rejected.push({ entry: e.name || e.id, reason: 'demo not verified or address not allowed' });
    }
    out.push(row);
  }
  return { entries: out, rejected };
}

export function buildYoutubeLinksScript({ root = process.cwd() } = {}) {
  const src = path.join(root, 'data', 'youtube-links.json');
  const dest = path.join(root, 'web', 'youtube-links.js');
  const { entries, rejected } = compileYoutubeLinks(JSON.parse(fs.readFileSync(src, 'utf8')));
  const body = '/* Generated from data/youtube-links.json by build_youtube_links.mjs - do not edit.\n' +
    ' * Only hand-verified demos are here; everything else opens a YouTube search.\n' +
    ' * See docs/YOUTUBE_LINKS.md. */\n' +
    'self.EXERCISE_YOUTUBE_LINKS = ' + JSON.stringify(entries, null, 1) + ';\n';
  fs.writeFileSync(dest, body);
  const demos = entries.filter((e) => e.demo);
  return {
    exerciseDemo: demos.filter((e) => e.type === 'exercise').length,
    exerciseSearch: entries.filter((e) => e.type === 'exercise' && !e.demo).length,
    warmupDemo: demos.filter((e) => e.type === 'warmup').length,
    warmupSearch: entries.filter((e) => e.type === 'warmup' && !e.demo).length,
    rejected
  };
}

if (import.meta.url === 'file://' + path.resolve(process.argv[1] || '').replace(/\\/g, '/') ||
    import.meta.url === 'file:///' + path.resolve(process.argv[1] || '').replace(/\\/g, '/')) {
  console.log(buildYoutubeLinksScript());
}
