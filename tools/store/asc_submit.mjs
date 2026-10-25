// Sends an iOS build that is already on TestFlight to App Review, with the App Store Connect API
// (the same key the build uses: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8_BASE64 or ASC_KEY_P8_PATH).
//
// What it does, in order:
//   1. finds the app (bundle id com.nurvan.app) and the build: the latest valid one, or BUILD=<number>;
//      a build still processing is waited for (up to 40 minutes);
//   2. finds the App Store version being prepared, or creates it: its number is VERSION, otherwise the
//      build's own version (the "versionName" of release.json);
//   3. attaches the build, writes "What's new" (WHATS_NEW in Italian, WHATS_NEW_EN for the other
//      languages, the Italian when it is not given) and the release after approval (RELEASE=auto|manual);
//   4. MODE=check stops here and prints what it would send; MODE=submit sends it to App Review.
//
// Everything else of the version (screenshots, description, review notes and demo accounts) is the
// one App Store Connect copies from the version before.
//
//   MODE=check node tools/store/asc_submit.mjs
//   MODE=submit WHATS_NEW="Correzioni e miglioramenti" node tools/store/asc_submit.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';

const API = 'https://api.appstoreconnect.apple.com';
const BUNDLE_ID = process.env.BUNDLE_ID || 'com.nurvan.app';
const MODE = process.env.MODE === 'submit' ? 'submit' : 'check';
const EDITABLE = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY'];
const LIVE = ['READY_FOR_SALE', 'READY_FOR_DISTRIBUTION', 'PENDING_DEVELOPER_RELEASE', 'PENDING_APPLE_RELEASE', 'PROCESSING_FOR_APP_STORE', 'PROCESSING_FOR_DISTRIBUTION'];
const IN_REVIEW = ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'WAITING_FOR_EXPORT_COMPLIANCE'];

export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

export function signToken({ keyId, issuerId, privateKey, now = Date.now() }) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const iat = Math.floor(now / 1000);
  const head = b64({ alg: 'ES256', kid: keyId, typ: 'JWT' }) + '.' + b64({ iss: issuerId, iat, exp: iat + 1100, aud: 'appstoreconnect-v1' });
  const sig = crypto.sign('sha256', Buffer.from(head), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return head + '.' + sig;
}

const stateOf = (v) => (v && v.attributes && (v.attributes.appVersionState || v.attributes.appStoreState)) || '';

// The listing texts in store/apple/metadata/<locale>/ (subtitle.txt, keywords.txt, description.txt), written
// with METADATA=yes. The locale folders are App Store Connect's codes ("it", "en-US").
export const METADATA_DIR = 'store/apple/metadata';
export const METADATA_LIMITS = { subtitle: 30, keywords: 100, description: 4000 };
export function readAppStoreMetadata(root = '.', dir = METADATA_DIR) {
  const base = root + '/' + dir;
  if (!fs.existsSync(base)) return {};
  const out = {};
  for (const locale of fs.readdirSync(base).sort()) {
    if (!fs.statSync(base + '/' + locale).isDirectory()) continue;
    out[locale] = {};
    for (const key of Object.keys(METADATA_LIMITS)) {
      const file = base + '/' + locale + '/' + key + '.txt';
      if (fs.existsSync(file)) out[locale][key] = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');
    }
  }
  return out;
}
export function metadataProblems(locale, m) {
  const p = [];
  for (const [k, max] of Object.entries(METADATA_LIMITS)) {
    if (m[k] != null && [...m[k]].length > max) p.push(locale + ': ' + k + ' is ' + [...m[k]].length + ' characters, the limit is ' + max);
  }
  if (m.keywords && /,\s|\s,/.test(m.keywords)) p.push(locale + ': keywords have spaces around the commas (they count against the 100)');
  if (m.keywords && m.subtitle) {
    const sub = new Set(m.subtitle.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
    const twice = m.keywords.toLowerCase().split(',').filter((k) => sub.has(k));
    if (twice.length) p.push(locale + ': keywords repeat words of the subtitle (' + twice.join(', ') + '): Apple already indexes them');
  }
  return p;
}

async function main() {
  const keyId = process.env.ASC_KEY_ID, issuerId = process.env.ASC_ISSUER_ID;
  const pem = process.env.ASC_KEY_P8_PATH ? fs.readFileSync(process.env.ASC_KEY_P8_PATH, 'utf8') : Buffer.from(String(process.env.ASC_KEY_P8_BASE64 || ''), 'base64').toString('utf8');
  if (!keyId || !issuerId || !/PRIVATE KEY/.test(pem)) throw new Error('Mancano ASC_KEY_ID, ASC_ISSUER_ID o la chiave .p8.');
  const privateKey = crypto.createPrivateKey(pem);
  let token = null, tokenAt = 0;
  const auth = () => { if (!token || Date.now() - tokenAt > 600000) { token = signToken({ keyId, issuerId, privateKey }); tokenAt = Date.now(); } return token; };

  async function call(method, path, body) {
    const r = await fetch(API + path, { method, headers: { Authorization: 'Bearer ' + auth(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    const json = text ? JSON.parse(text) : {};
    if (!r.ok) {
      const errs = (json.errors || []).map((e) => e.status + ' ' + e.code + ': ' + (e.detail || e.title)).join(' | ');
      throw new Error(method + ' ' + path + ' -> ' + r.status + ' ' + errs);
    }
    return json;
  }

  // 1. the app and the build
  const app = ((await call('GET', '/v1/apps?filter[bundleId]=' + encodeURIComponent(BUNDLE_ID) + '&limit=1')).data || [])[0];
  if (!app) throw new Error('App ' + BUNDLE_ID + ' non trovata con questa chiave.');
  console.log('App:', app.attributes.name, '(' + app.id + ')');

  const wanted = String(process.env.BUILD || '').trim();
  // With VERSION, only a build of that version will do: a fresh upload takes some minutes to be listed
  // by Apple, and in the meantime the newest listed build is an older one (of a closed version).
  const wantedVersion = String(process.env.VERSION || '').trim();
  let build = null, version = '';
  for (let tries = 0; tries < 80; tries++) {
    const q = '/v1/builds?filter[app]=' + app.id + '&filter[expired]=false&sort=-uploadedDate&limit=20&include=preReleaseVersion' +
      (wanted ? '&filter[version]=' + encodeURIComponent(wanted) : '') + (wantedVersion ? '&filter[preReleaseVersion.version]=' + encodeURIComponent(wantedVersion) : '');
    const res = await call('GET', q);
    const pre = new Map((res.included || []).filter((x) => x.type === 'preReleaseVersions').map((x) => [x.id, x.attributes.version]));
    const b = (res.data || [])[0];
    if (!b && (wanted || wantedVersion)) {
      console.log('La build ' + (wanted || 'della versione ' + wantedVersion) + ' non è ancora visibile su App Store Connect, aspetto 30 secondi…');
      await new Promise((r) => setTimeout(r, 30000));
      continue;
    }
    if (!b) throw new Error('Nessuna build su TestFlight.');
    const preId = b.relationships && b.relationships.preReleaseVersion && b.relationships.preReleaseVersion.data && b.relationships.preReleaseVersion.data.id;
    version = pre.get(preId) || '';
    if (b.attributes.processingState === 'VALID') { build = b; break; }
    if (b.attributes.processingState === 'FAILED' || b.attributes.processingState === 'INVALID') throw new Error('La build ' + b.attributes.version + ' è ' + b.attributes.processingState + ' su App Store Connect.');
    console.log('La build ' + b.attributes.version + ' è ancora in elaborazione da Apple, aspetto 30 secondi…');
    await new Promise((r) => setTimeout(r, 30000));
  }
  if (!build) throw new Error('La build non ha finito l\'elaborazione in tempo: riprova più tardi.');
  console.log('Build:', build.attributes.version, '(versione ' + version + ', caricata ' + build.attributes.uploadedDate + ')');

  // 2. the App Store version
  const versions = (await call('GET', '/v1/apps/' + app.id + '/appStoreVersions?filter[platform]=IOS&limit=20')).data || [];
  const busy = versions.find((v) => IN_REVIEW.includes(stateOf(v)));
  if (busy) throw new Error('La versione ' + busy.attributes.versionString + ' è già in revisione (' + stateOf(busy) + '): aspetta l\'esito.');
  const live = versions.filter((v) => LIVE.includes(stateOf(v))).map((v) => v.attributes.versionString).sort(compareVersions).pop() || '0';
  const versionString = String(process.env.VERSION || '').trim() || version;
  if (compareVersions(versionString, live) <= 0) throw new Error('La versione ' + versionString + ' non è più alta di quella pubblicata (' + live + '): imposta VERSION, per esempio ' + live.replace(/(\d+)$/, (n) => String(Number(n) + 1)) + '.');
  const releaseType = process.env.RELEASE === 'manual' ? 'MANUAL' : 'AFTER_APPROVAL';
  let draft = versions.find((v) => EDITABLE.includes(stateOf(v)));
  const whatsNewIt = String(process.env.WHATS_NEW || '').trim();
  const whatsNewEn = String(process.env.WHATS_NEW_EN || '').trim() || whatsNewIt;
  console.log('Pubblicata ora:', live, '· nuova versione:', versionString, '· uscita:', releaseType === 'MANUAL' ? 'a mano dopo l\'approvazione' : 'automatica dopo l\'approvazione');
  console.log(draft ? 'Versione in preparazione già presente: ' + draft.attributes.versionString + ' (' + stateOf(draft) + ')' : 'Verrà creata la versione ' + versionString + '.');
  if (!whatsNewIt) throw new Error('Scrivi le novità (WHATS_NEW): per un aggiornamento Apple le chiede.');
  console.log('Novità (it):', whatsNewIt);
  if (whatsNewEn !== whatsNewIt) console.log('Novità (altre lingue):', whatsNewEn);
  const meta = process.env.METADATA === 'yes' ? readAppStoreMetadata() : null;
  if (meta) {
    const problems = Object.entries(meta).flatMap(([loc, m]) => metadataProblems(loc, m));
    if (problems.length) throw new Error('Testi della scheda non validi:\n- ' + problems.join('\n- '));
    for (const [loc, m] of Object.entries(meta)) console.log('Scheda (' + loc + '): sottotitolo «' + (m.subtitle || '—') + '» · parole chiave «' + (m.keywords || '—') + '» · descrizione ' + (m.description ? [...m.description].length + ' caratteri' : '—'));
  }

  if (MODE !== 'submit') {
    console.log('\nVERIFICA OK: chiave, app, build e versione sono a posto. Niente è stato cambiato (MODE=check).');
    return;
  }

  // 3. prepare the version
  if (!draft) {
    draft = (await call('POST', '/v1/appStoreVersions', { data: { type: 'appStoreVersions', attributes: { platform: 'IOS', versionString, releaseType }, relationships: { app: { data: { type: 'apps', id: app.id } } } } })).data;
    console.log('Creata la versione', versionString);
  } else {
    await call('PATCH', '/v1/appStoreVersions/' + draft.id, { data: { type: 'appStoreVersions', id: draft.id, attributes: { versionString, releaseType } } });
  }
  if (build.attributes.usesNonExemptEncryption == null) {
    await call('PATCH', '/v1/builds/' + build.id, { data: { type: 'builds', id: build.id, attributes: { usesNonExemptEncryption: false } } });
  }
  await call('PATCH', '/v1/appStoreVersions/' + draft.id + '/relationships/build', { data: { type: 'builds', id: build.id } });
  console.log('Build', build.attributes.version, 'collegata.');
  const locs = (await call('GET', '/v1/appStoreVersions/' + draft.id + '/appStoreVersionLocalizations?limit=50')).data || [];
  for (const l of locs) {
    const text = /^it/i.test(l.attributes.locale) ? whatsNewIt : whatsNewEn;
    await call('PATCH', '/v1/appStoreVersionLocalizations/' + l.id, { data: { type: 'appStoreVersionLocalizations', id: l.id, attributes: { whatsNew: text.slice(0, 4000) } } });
  }
  console.log('Novità scritte in', locs.length, 'lingue:', locs.map((l) => l.attributes.locale).join(', '));
  if (meta) {
    // keywords and description belong to the version; the subtitle to the app information being prepared
    for (const l of locs) {
      const m = meta[l.attributes.locale];
      if (!m) continue;
      const attributes = {};
      if (m.keywords) attributes.keywords = m.keywords;
      if (m.description) attributes.description = m.description;
      if (Object.keys(attributes).length) await call('PATCH', '/v1/appStoreVersionLocalizations/' + l.id, { data: { type: 'appStoreVersionLocalizations', id: l.id, attributes } });
    }
    const infos = (await call('GET', '/v1/apps/' + app.id + '/appInfos')).data || [];
    const info = infos.find((i) => !LIVE.includes(i.attributes.state || i.attributes.appStoreState || '')) || null;
    if (info) {
      const infoLocs = (await call('GET', '/v1/appInfos/' + info.id + '/appInfoLocalizations?limit=50')).data || [];
      for (const l of infoLocs) {
        const m = meta[l.attributes.locale];
        if (m && m.subtitle) await call('PATCH', '/v1/appInfoLocalizations/' + l.id, { data: { type: 'appInfoLocalizations', id: l.id, attributes: { subtitle: m.subtitle } } });
      }
    } else {
      console.log('Sottotitolo non cambiato: nessuna scheda informazioni in preparazione.');
    }
    console.log('Scheda scritta per:', Object.keys(meta).filter((loc) => locs.some((l) => l.attributes.locale === loc)).join(', '));
  }

  // 4. send it to App Review: the open draft submission, or a new one
  let sub = ((await call('GET', '/v1/reviewSubmissions?filter[app]=' + app.id + '&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW&limit=5')).data || [])[0];
  if (!sub) sub = (await call('POST', '/v1/reviewSubmissions', { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: app.id } } } } })).data;
  try {
    await call('POST', '/v1/reviewSubmissionItems', { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } }, appStoreVersion: { data: { type: 'appStoreVersions', id: draft.id } } } } });
  } catch (err) {
    if (!/already|ENTITY_ERROR\.RELATIONSHIP\.INVALID|409/.test(String(err.message))) throw err;
  }
  await call('PATCH', '/v1/reviewSubmissions/' + sub.id, { data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } } });
  console.log('\nINVIATA: la versione ' + versionString + ' (build ' + build.attributes.version + ') è in attesa di revisione da Apple.');
}

if (process.argv[1] && /(^|[\\/])asc_submit\.mjs$/.test(process.argv[1])) {
  main().catch((err) => { console.error('\nERRORE: ' + (err && err.message)); process.exit(1); });
}
