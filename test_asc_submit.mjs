// Sending a TestFlight build to App Review (tools/store/asc_submit.mjs): the version order and the signed
// token App Store Connect accepts (ES256, the raw r|s signature, 20 minutes at most). The calls themselves
// run in the "iOS App Review" workflow with the real key (mode=check changes nothing).
import crypto from 'node:crypto';
import fs from 'node:fs';
import { compareVersions, signToken, readAppStoreMetadata, metadataProblems } from './tools/store/asc_submit.mjs';

let failed = 0;
function ok(message, value) { if (value) console.log('OK  ', message); else { failed += 1; console.log('FAIL', message); } }

ok('versions compare by number, not by text', compareVersions('1.5.34', '1.0') === 1 && compareVersions('1.10', '1.9') === 1 && compareVersions('1.0', '1.0.0') === 0 && compareVersions('1.0', '1.0.1') === -1);
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const now = Date.parse('2026-10-13T10:00:00Z');
const t = signToken({ keyId: 'ABC123', issuerId: 'iss-1', privateKey, now });
const [h, p, s] = t.split('.');
const head = JSON.parse(Buffer.from(h, 'base64url')), body = JSON.parse(Buffer.from(p, 'base64url'));
ok('the token names the key and App Store Connect', head.alg === 'ES256' && head.kid === 'ABC123' && body.iss === 'iss-1' && body.aud === 'appstoreconnect-v1');
ok('it lasts less than the 20 minutes allowed', body.exp - body.iat <= 1200 && body.iat === now / 1000);
ok('the signature is the raw 64 bytes and verifies', Buffer.from(s, 'base64url').length === 64 && crypto.verify('sha256', Buffer.from(h + '.' + p), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url')));
const wf = fs.readFileSync('.github/workflows/ios-release.yml', 'utf8');
ok('the workflow is started by hand, verifies by default and uses the build key', /workflow_dispatch/.test(wf) && /default: check/.test(wf) && /ASC_KEY_P8_BASE64/.test(wf) && !/push:/.test(wf));
// the App Store listing texts sent with metadata=yes (store/apple/metadata/<locale>/)
const meta = readAppStoreMetadata();
ok('the App Store texts exist for Italian and English', meta.it && meta['en-US'] && ['subtitle', 'keywords', 'description'].every((k) => meta.it[k] && meta['en-US'][k]));
ok('within Apple\'s limits, keywords without spaces and without the subtitle\'s words', Object.entries(meta).every(([loc, m]) => metadataProblems(loc, m).length === 0));
ok('"app personal trainer" is found from the subtitle and the keywords together (Apple joins them)', /personal trainer/i.test(meta.it.subtitle) && meta.it.keywords.split(',').includes('app') && /personal trainer/i.test(meta['en-US'].subtitle));
ok('the description states Apple\'s renewal terms and is not a medical device', /24 ore prima/.test(meta.it.description) && /account Apple/.test(meta.it.description) && /24 hours before/.test(meta['en-US'].description) && !/Google|Play Store/.test(meta.it.description + meta['en-US'].description) && /dispositivo medico/.test(meta.it.description));
ok('the problems are caught: too long, spaces, repeated words', metadataProblems('x', { subtitle: 'Coach AI', keywords: 'coach, gym', description: 'x'.repeat(4001) }).length === 3);
ok('the workflow writes the texts only when asked', /metadata:/.test(wf) && /default: 'no'/.test(wf) && /METADATA: \$\{\{ inputs\.metadata \}\}/.test(wf));
if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nInvio in revisione Apple: tutto verde');
