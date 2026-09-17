import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

console.log('--- Running UI Media Integration Tests ---');

// UI Test 1: Check exercise-media-client is loaded in index.base.html
{
  const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  ok(html.includes('<script src="exercise-media-client.js"></script>'), 'exercise-media-client.js is loaded as script tag');
  ok(html.includes('askExerciseInfoToCoach'), 'askExerciseInfoToCoach function is defined');
  ok(html.includes('refreshWorkoutExerciseMediaSlots'), 'refreshWorkoutExerciseMediaSlots function is defined');
  ok(html.includes('openExerciseInfoSheet'), 'openExerciseInfoSheet function is defined');
  ok(html.includes('paintExerciseInfoSheet'), 'paintExerciseInfoSheet function is defined');
}

// UI Test 2: Check that CHIEDI INFO modal accepts media parameter
{
  const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  ok(html.includes('const media = opts.media || {};'), 'paintExerciseInfoSheet accepts media parameter');
  ok(html.includes('media.hasMedia'), 'paintExerciseInfoSheet checks hasMedia');
  ok(html.includes('media.media.master'), 'paintExerciseInfoSheet references master image');
}

// UI Test 3: Check that openExerciseInfoSheet loads media
{
  const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  ok(html.includes('NurvanExerciseMedia.resolve'), 'openExerciseInfoSheet calls media resolve');
  ok(html.includes('canonicalId'), 'openExerciseInfoSheet derives canonical ID');
}

// UI Test 4: Verify refreshWorkoutExerciseMediaSlots transforms exercise names
{
  const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  ok(html.includes('refreshWorkoutExerciseMediaSlots'), 'function is defined');
  ok(html.includes('.exercise-name-heading'), 'function targets exercise heading elements');
  ok(html.includes('NurvanExerciseMedia.canonicalExerciseId'), 'function derives canonical ID from exercise name');
  ok(html.includes('nurvan-media-slot'), 'function creates media slot div');
}

// UI Test 5: Verify media slot rendering call
{
  const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  ok(html.includes('if (typeof refreshWorkoutExerciseMediaSlots === \'function\')'), 'refreshWorkoutExerciseMediaSlots is called after render');
}

// UI Test 6: Verify built index.html includes all changes
{
  const builtHtml = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  ok(builtHtml.includes('askExerciseInfoToCoach'), 'askExerciseInfoToCoach in built index.html');
  ok(builtHtml.includes('refreshWorkoutExerciseMediaSlots'), 'refreshWorkoutExerciseMediaSlots in built index.html');
  ok(builtHtml.includes('NurvanExerciseMedia.resolve'), 'media resolve in built index.html');
}

// UI Test 7: Verify Android APK asset sync
{
  const syncModule = fs.readFileSync(path.join(root, 'sync_web_assets.mjs'), 'utf8');
  ok(syncModule.includes("'exercise-media-client.js'"), 'exercise-media-client.js in Android asset sync list');
}

console.log('\nAll UI media integration tests passed.');
