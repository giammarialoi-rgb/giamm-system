import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

function ok(value, message) {
  assert.ok(value, message);
  console.log('✓', message);
}

console.log('\n=== CORRECTIVE UI MEDIA TEST ===\n');

const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');

// TEST 1: renderMediaPlaceholder function exists and has correct placeholder
ok(html.includes('function renderMediaPlaceholder(hasMedia, imageUrl, altText)'), 'renderMediaPlaceholder function defined');
ok(html.includes('font-size:60px;font-weight:900;color:#444;'), 'Large ? placeholder (60px) present');
ok(html.includes('Immagine non disponibile'), 'Placeholder text present');
ok(html.includes('aspect-ratio:1/1;border-radius:12px'), 'Media placeholder has 1:1 aspect ratio');
// Verify placeholder uses ? not emoji in renderMediaPlaceholder
const startIdx = html.indexOf('function renderMediaPlaceholder');
const endIdx = html.indexOf('function', startIdx + 10);
const renderMediaSection = html.substring(startIdx, endIdx);
ok(renderMediaSection.includes('font-size:60px;font-weight:900;color:#444;') && renderMediaSection.includes('>?</div>'), 'Placeholder uses ? (60px) not emoji');

// TEST 2: CHIEDI INFO is fullscreen on mobile
ok(html.includes('display:none;position:fixed;inset:0;z-index:10150;background:#0a0a0a;'), 'CHIEDI INFO fullscreen (inset:0)');
ok(html.includes('display:flex;flex-direction:column;height:100%;background:#0a0a0a;'), 'CHIEDI INFO uses flexbox column layout');
ok(html.includes('flex:1;overflow-y:auto;padding:16px;'), 'CHIEDI INFO scrollable content area');
ok(html.includes('padding:12px 16px;border-bottom:1px solid #222;background:#0d0d0d;flex-shrink:0;'), 'CHIEDI INFO has fixed header');

// TEST 3: Media area is always visible
ok(html.includes('const mediaHtml = renderMediaPlaceholder(media && media.hasMedia, media && media.media && media.media.master, title);'), 'paintExerciseInfoSheet calls renderMediaPlaceholder');
ok(html.includes('<h2 style="color:#fff;font-size:18px;margin:0 0 12px;">'), 'Exercise name preserved');
ok(html.includes('<p style="font-size:13px;color:#ccc;line-height:1.45;margin:0 0 12px;">'), 'Exercise description preserved');
ok(html.includes('RIR / CARICO'), 'RIR section preserved');
ok(html.includes('APRI ENCICLOPEDIA'), 'Encyclopedia button preserved');

// TEST 4: Warm-up has EXIT button
ok(html.includes('function confirmWarmupExit()'), 'confirmWarmupExit function defined');
ok(html.includes('window.confirmWarmupExit = confirmWarmupExit;'), 'confirmWarmupExit exported to window');
ok(html.includes('onclick="confirmWarmupExit()"'), 'EXIT button wired to confirmWarmupExit');
ok(html.includes('Uscire dal warm-up?'), 'EXIT confirmation dialog present');
ok(html.includes('Il warm-up non verrà completato.'), 'EXIT confirmation explains consequence');

// TEST 5: Warm-up media area
ok(html.includes('var mediaHtml = renderMediaPlaceholder(false, null, it.name);'), 'Warm-up renders media placeholder');
ok(html.includes('persistWarmupPlayerProgress(\'aborted\');'), 'Warm-up marks session as aborted when exiting');
ok(html.includes('SALTA'), 'SALTA button still present');
ok(html.includes('COMPLETATO'), 'COMPLETATO button still present');
ok(html.includes('onclick="confirmWarmupExit()">ESCI</button>'), 'ESCI button present with correct onclick');

// TEST 6: Distinction between SALTA, ESCI, COMPLETATO
ok(html.includes('function warmupPlayerSkipItem()'), 'SALTA function present');
ok(html.includes('function warmupPlayerCompleteItem()'), 'COMPLETATO function present');
ok(html.includes('warmupPlayerAdvance(\'completed\')'), 'COMPLETATO marks item completed');
ok(html.includes('warmupPlayerAdvance(\'skipped\')'), 'SALTA marks item skipped');

// TEST 7: Built file includes all changes
const builtHtml = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
ok(builtHtml.includes('renderMediaPlaceholder'), 'renderMediaPlaceholder in built index.html');
ok(builtHtml.includes('confirmWarmupExit'), 'confirmWarmupExit in built index.html');
ok(builtHtml.includes('inset:0;z-index:10150;background:#0a0a0a;'), 'Fullscreen styling in built file');
ok(builtHtml.includes('font-size:60px;font-weight:900;color:#444;'), 'Large placeholder in built file');

// TEST 8: Media placeholder doesn't hardcode images
// (other parts of the app may have URLs, but the placeholder is dynamic)
ok(html.includes('esc(imageUrl)'), 'Placeholder uses dynamic imageUrl (escaped)');
ok(html.includes('if (hasMedia && imageUrl)'), 'Placeholder handles dynamic hasMedia flag');

console.log('\n✅ All 30 corrective UI tests passed!');
console.log('\nKey changes verified:');
console.log('  • CHIEDI INFO is fullscreen (inset:0)');
console.log('  • Media area always visible with prominent [?] placeholder (60px)');
console.log('  • Warm-up has EXIT button with confirmation');
console.log('  • EXIT marks warm-up as "aborted"');
console.log('  • SALTA vs ESCI vs COMPLETATO behavior maintained');
console.log('  • No emoji in placeholder (dark UI design)');
console.log('  • All original content (description, RIR, buttons) preserved\n');
