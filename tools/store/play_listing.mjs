// Puts the Google Play store listing written in store/google-play/listing/<locale>/ (title.txt,
// short_description.txt, full_description.txt) on Play, with the Play Developer API and the service
// account the Android workflow already uses (PLAY_SERVICE_ACCOUNT_JSON).
//
//   MODE=check   node tools/store/play_listing.mjs   reads what is on Play and prints what would change
//   MODE=publish node tools/store/play_listing.mjs   writes title, short and full description, then commits
//
// Only the three texts change; the graphics, the video and the other languages on Play stay as they are.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PACKAGE = process.env.PACKAGE_NAME || 'com.nurvan.app';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PACKAGE;
export const LISTING_DIR = 'store/google-play/listing';
export const LIMITS = { title: 30, shortDescription: 80, fullDescription: 4000 };
// Words Google Play does not allow in the title or the short description (ranking, price, calls to action).
export const BANNED = /\b(best|top|#1|no\.?\s?1|number one|free|discount|sale|download now|install now|migliore|gratis|gratuit[ao]|sconto|offerta|numero 1|scarica ora|installa ora)\b/i;

const len = (s) => [...String(s)].length;

export function readListing(root = '.', dir = LISTING_DIR) {
  const base = path.join(root, dir);
  const out = {};
  for (const locale of fs.readdirSync(base).filter((d) => fs.statSync(path.join(base, d)).isDirectory()).sort()) {
    const read = (f) => fs.readFileSync(path.join(base, locale, f), 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');
    out[locale] = { title: read('title.txt'), shortDescription: read('short_description.txt'), fullDescription: read('full_description.txt') };
  }
  return out;
}

// The problems Play would refuse the listing for, or its policy would flag.
export function listingProblems(locale, l) {
  const p = [];
  for (const [k, max] of Object.entries(LIMITS)) {
    if (!l[k]) p.push(locale + ': ' + k + ' is empty');
    else if (len(l[k]) > max) p.push(locale + ': ' + k + ' is ' + len(l[k]) + ' characters, the limit is ' + max);
  }
  if (BANNED.test(l.title) || BANNED.test(l.shortDescription)) p.push(locale + ': title or short description uses a word Play does not allow (' + (l.title.match(BANNED) || l.shortDescription.match(BANNED))[0] + ')');
  if (/\p{Extended_Pictographic}/u.test(l.title)) p.push(locale + ': emoji in the title');
  if (l.title === l.title.toUpperCase() && /[A-Z]{4}/.test(l.title)) p.push(locale + ': title in capitals');
  return p;
}

export function signJwt(account, now = Date.now()) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const iat = Math.floor(now / 1000);
  const head = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: account.token_uri || 'https://oauth2.googleapis.com/token', iat, exp: iat + 1800 });
  return head + '.' + crypto.sign('sha256', Buffer.from(head), account.private_key).toString('base64url');
}

async function main() {
  const mode = process.env.MODE === 'publish' ? 'publish' : 'check';
  const listing = readListing();
  const problems = Object.entries(listing).flatMap(([loc, l]) => listingProblems(loc, l));
  if (problems.length) throw new Error('The listing is not ready:\n- ' + problems.join('\n- '));
  const raw = process.env.PLAY_SERVICE_ACCOUNT_JSON || '';
  if (!raw) throw new Error('Missing PLAY_SERVICE_ACCOUNT_JSON.');
  const account = JSON.parse(raw);
  const tokenRes = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + signJwt(account)
  });
  const token = (await tokenRes.json()).access_token;
  if (!token) throw new Error('Google did not give an access token for the service account.');

  async function call(method, p, body) {
    const r = await fetch(API + p, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    const json = text ? JSON.parse(text) : {};
    if (!r.ok) throw new Error(method + ' ' + p + ' -> ' + r.status + ' ' + ((json.error && json.error.message) || text));
    return json;
  }

  const edit = await call('POST', '/edits', {});
  try {
    const current = Object.fromEntries(((await call('GET', '/edits/' + edit.id + '/listings')).listings || []).map((l) => [l.language, l]));
    for (const [locale, l] of Object.entries(listing)) {
      const now = current[locale] || {};
      console.log('\n== ' + locale + (current[locale] ? '' : ' (new language on Play)'));
      for (const k of Object.keys(LIMITS)) {
        const same = (now[k] || '') === l[k];
        console.log(k + ' (' + len(l[k]) + '/' + LIMITS[k] + '): ' + (same ? 'unchanged' : 'CHANGES'));
        if (!same && k !== 'fullDescription') console.log('  now: ' + (now[k] || '—') + '\n  new: ' + l[k]);
      }
      if (mode === 'publish') await call('PATCH', '/edits/' + edit.id + '/listings/' + encodeURIComponent(locale), { language: locale, ...l });
    }
    if (mode !== 'publish') {
      await call('DELETE', '/edits/' + edit.id).catch(() => {});
      console.log('\nCHECK OK: nothing was changed (MODE=check).');
      return;
    }
    await call('POST', '/edits/' + edit.id + ':commit');
    console.log('\nPUBLISHED: the listing is sent to Google Play (it goes live after Google\'s review).');
  } catch (err) {
    await call('DELETE', '/edits/' + edit.id).catch(() => {});
    throw err;
  }
}

if (process.argv[1] && /(^|[\\/])play_listing\.mjs$/.test(process.argv[1])) {
  main().catch((err) => { console.error('\nERROR: ' + (err && err.message)); process.exit(1); });
}
