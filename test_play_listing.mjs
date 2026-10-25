// The Google Play listing (store/google-play/listing/<locale>/) against what Play accepts and what the ASO
// report of 25-10-2026 (Testers Community, 57/100) asked for: the primary keyword "app personal trainer"
// in the title, the short description and the description, a description of at least 3,000 characters in
// labelled sections with bullets, no word Play forbids.
import crypto from 'node:crypto';
import { readListing, listingProblems, signJwt, LIMITS, BANNED } from './tools/store/play_listing.mjs';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}
const len = (s) => [...s].length;
const listing = readListing();

ok('Italian (the default) and English are written', !!listing['it-IT'] && !!listing['en-US']);
for (const [loc, l] of Object.entries(listing)) {
  ok(loc + ': within Play\'s limits and policy', listingProblems(loc, l).length === 0);
  ok(loc + ': the description is long enough to be indexed (3,000+) and fits (4,000)', len(l.fullDescription) >= 3000 && len(l.fullDescription) <= LIMITS.fullDescription);
  const sections = (l.fullDescription.match(/^[A-ZÀ-Ý' ]{6,}$/gm) || []).length;
  const bullets = (l.fullDescription.match(/^• /gm) || []).length;
  ok(loc + ': scannable, in labelled sections with bullets', sections >= 6 && bullets >= 20);
  ok(loc + ': the first lines say what the app is', /Nurvan/.test(l.fullDescription.slice(0, 250)));
  ok(loc + ': subscriptions, renewal and where to cancel are stated', /Google/.test(l.fullDescription) && /(rinnovano automaticamente|renew automatically)/.test(l.fullDescription));
  ok(loc + ': not a medical device', /(non è un dispositivo medico|not a medical device)/.test(l.fullDescription));
}
const it = listing['it-IT'];
const kw = 'app personal trainer';
ok('it-IT: the primary keyword is in the title', it.title.toLowerCase().includes(kw) && it.title.startsWith('Nurvan'));
ok('it-IT: and in the short description, which opens with a verb', it.shortDescription.toLowerCase().includes(kw) && /^Allenati\b/.test(it.shortDescription));
ok('it-IT: and in the description, near the top, without stuffing', it.fullDescription.toLowerCase().slice(0, 250).includes(kw) && it.fullDescription.toLowerCase().split(kw).length - 1 <= 3);
const en = listing['en-US'];
ok('en-US: "personal trainer app" in title, short and full description', ['title', 'shortDescription', 'fullDescription'].every((k) => en[k].toLowerCase().includes('personal trainer app')));
ok('the policy check catches the words Play forbids', BANNED.test('Nurvan gratis') && BANNED.test('Best workout app') && !BANNED.test(it.title));
ok('the policy check catches a title too long', listingProblems('x', { title: 'x'.repeat(31), shortDescription: 'ok', fullDescription: 'ok' }).length === 1);

// the service-account token is signed as Google expects (RS256)
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwt = signJwt({ client_email: 'ci@example.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }, Date.parse('2026-10-25T10:00:00Z'));
const [h, p, s] = jwt.split('.');
const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
ok('the token for Google is RS256, for the androidpublisher scope, 30 minutes',
  JSON.parse(Buffer.from(h, 'base64url').toString()).alg === 'RS256' && claims.scope === 'https://www.googleapis.com/auth/androidpublisher' && claims.exp - claims.iat === 1800 &&
  crypto.verify('sha256', Buffer.from(h + '.' + p), publicKey, Buffer.from(s, 'base64url')));

if (failed) { console.log('\n' + failed + ' failed'); process.exit(1); }
console.log('\nPlay listing checks pass.');
