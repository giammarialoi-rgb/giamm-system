/**
 * Copy the built web shell into Android assets and fail if anything diverges.
 * Used by build_master25.mjs and Gradle preBuild so APK === web.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const ANDROID_STATIC_ASSETS = [
  'index.html',
  'gs_logo.png',
  'nurvan_logo.png',
  'nurvan_wordmark.png',
  'nurvan_app_icon.png',
  'xlsx.full.min.js',
  'peerjs.min.js',
  'data.json',
  'program-catalog-index.json',
  'program-catalog-body.json',
  'exam-request-catalog.json',
  'allergen-intolerance-catalog.json',
  'manifest.webmanifest',
  'sw.js',
  'release-meta.js',
  'i18n-runtime.js',
  'training-analytics-engine.js',
  'training-knowledge.js',
  'exercise-catalog-extra.js',
  'warmup-exercise-library.js',
  'youtube-links.js',
  'warmup-engine.js',
  'exercise-media-client.js',
  'exercise-media-ui.js',
  'domain-merge.js',
  'exercise-taxonomy.js',
  'program-builder.js',
  'program-catalog.js',
  'progression-models.js',
  'progression-advisor.js',
  'food-search.js',
  'nutrition-targets.js',
  'nutrition-plan.js',
  'food-ciqual.json',
  'recipe-catalog.json',
  'checkin-schedule.js',
  'features.js',
  'entitlements.js',
  'cardio-library.js',
  'program-generator.js',
  'hyrox.js',
  'disciplines.js',
  'hyrox-events.json',
  'apple-touch-icon.png',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'favicon.png',
  'muscle-male-front.png',
  'muscle-male-back.png',
  'muscle-female-front.png',
  'muscle-female-back.png'
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function syncWebAssetsToAndroid({ root = process.cwd(), required = true } = {}) {
  const webDir = path.join(root, 'web');
  const assetsDir = path.join(root, 'app', 'src', 'main', 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  const missing = [];
  const mismatched = [];
  for (const file of ANDROID_STATIC_ASSETS) {
    const src = path.join(webDir, file);
    const dest = path.join(assetsDir, file);
    if (!fs.existsSync(src)) {
      missing.push(file);
      continue;
    }
    fs.copyFileSync(src, dest);
    if (sha256(src) !== sha256(dest)) mismatched.push(file);
    else console.log('  ✓ Synced asset:', file);
  }
  // The translations of the interface (i18n-runtime.js reads them).
  const i18nSrc = path.join(webDir, 'i18n');
  if (fs.existsSync(i18nSrc)) {
    const i18nDest = path.join(assetsDir, 'i18n');
    fs.rmSync(i18nDest, { recursive: true, force: true });
    fs.cpSync(i18nSrc, i18nDest, { recursive: true });
    console.log('  ✓ Synced dir: i18n');
  }
  // The exercise images shipped with the app (tools/bundle_exercise_media.mjs).
  const mediaSrc = path.join(webDir, 'media');
  if (fs.existsSync(mediaSrc)) {
    const mediaDest = path.join(assetsDir, 'media');
    fs.rmSync(mediaDest, { recursive: true, force: true });
    fs.cpSync(mediaSrc, mediaDest, { recursive: true });
    console.log('  ✓ Synced dir: media');
  }
  if (required && missing.length) {
    throw new Error('Web assets missing (Android cannot ship them): ' + missing.join(', '));
  }
  if (mismatched.length) {
    throw new Error('Web/Android asset parity failed: ' + mismatched.join(', '));
  }
  return { missing, mismatched };
}

if (process.argv[1] && path.basename(process.argv[1]).toLowerCase() === 'sync_web_assets.mjs') {
  syncWebAssetsToAndroid();
  console.log('Web ↔ Android assets are identical.');
}
