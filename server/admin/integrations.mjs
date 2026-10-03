// Connections to the places the numbers live: Instagram, the App Store and
// Google Play. Each one is switched on by the variables it needs on the host
// and does nothing without them; the dashboard says which ones are missing.
// What they fetch goes into admin_metrics (one number per day) next to
// whatever was typed by hand; a number typed by hand is never overwritten by
// a fetch.
//
//   Instagram   IG_ACCESS_TOKEN  (Instagram API with Instagram login, a business
//               or creator account; the long-lived token lasts 60 days and is
//               renewed here every month, the new one kept encrypted in the database)
//   App Store   ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY (the .p8 text),
//               ASC_VENDOR_NUMBER  (a key with access to Sales and Reports)
//   Google Play PLAY_SERVICE_ACCOUNT_JSON, PLAY_BUCKET (pubsite_prod_rev_...),
//               PLAY_PACKAGE (default com.nurvan.app)  (the account must be
//               allowed to see the app's reports in Play Console)
import crypto from "node:crypto";
import zlib from "node:zlib";
import { SignJWT, importPKCS8 } from "jose";
import { putMetric, dayOf } from "./analytics.mjs";
import { addLedger } from "./economy.mjs";
import { dateOnly } from "./dates.mjs";

const DAY = 86400000;
const TIMEOUT = 20000;

async function http(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try { return await fetch(url, { ...opts, signal: ctl.signal }); } finally { clearTimeout(t); }
}

/* ------------------------------ token at rest ------------------------------ */

function key(secret) { return crypto.createHash("sha256").update("admin-integrations|" + secret).digest(); }
export function seal(text, secret) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(secret), iv);
  const enc = Buffer.concat([c.update(String(text), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}
export function unseal(blob, secret) {
  const [iv, tag, enc] = String(blob || "").split(".").map((x) => Buffer.from(x || "", "base64url"));
  if (!iv || !tag || !enc || iv.length !== 12) return null;
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", key(secret), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch (_) { return null; }
}

/* ------------------------------ configuration ------------------------------ */

export const INTEGRATIONS = {
  instagram: { label: "Instagram", needs: ["IG_ACCESS_TOKEN"] },
  appstore: { label: "App Store", needs: ["ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_PRIVATE_KEY", "ASC_VENDOR_NUMBER"] },
  playstore: { label: "Google Play", needs: ["PLAY_SERVICE_ACCOUNT_JSON", "PLAY_BUCKET"] }
};
export function missing(name, env = process.env) {
  return INTEGRATIONS[name].needs.filter((k) => !String(env[k] || "").trim());
}
export function configured(name, env = process.env) { return missing(name, env).length === 0; }

async function loadRow(pool, name) {
  const r = (await pool.query("SELECT state, last_run_at, last_ok_at, last_error FROM admin_integrations WHERE name = $1", [name])).rows[0];
  return r ? { state: r.state || {}, lastRunAt: r.last_run_at, lastOkAt: r.last_ok_at, lastError: r.last_error } : { state: {}, lastRunAt: null, lastOkAt: null, lastError: null };
}
async function saveRow(pool, name, patch) {
  await pool.query(
    `INSERT INTO admin_integrations(name, state, last_run_at, last_ok_at, last_error) VALUES($1,$2,$3,$4,$5)
     ON CONFLICT (name) DO UPDATE SET state = EXCLUDED.state, last_run_at = EXCLUDED.last_run_at, last_ok_at = EXCLUDED.last_ok_at, last_error = EXCLUDED.last_error`,
    [name, JSON.stringify(patch.state || {}), patch.lastRunAt || null, patch.lastOkAt || null, patch.lastError || null]
  );
}

export async function status(pool, env = process.env) {
  const out = [];
  for (const name of Object.keys(INTEGRATIONS)) {
    const row = await loadRow(pool, name);
    out.push({
      name,
      label: INTEGRATIONS[name].label,
      configured: configured(name, env),
      missing: missing(name, env),
      lastRunAt: row.lastRunAt ? new Date(row.lastRunAt).toISOString() : null,
      lastOkAt: row.lastOkAt ? new Date(row.lastOkAt).toISOString() : null,
      lastError: row.lastError || null,
      info: publicState(name, row.state)
    });
  }
  return out;
}
function publicState(name, state) {
  if (name === "instagram") return { username: state.username || null, tokenRefreshedAt: state.tokenRefreshedAt || null, recentMedia: state.recentMedia || [] };
  if (name === "appstore") return { currency: state.currency || null, lastDay: state.lastDay || null };
  if (name === "playstore") return { lastDay: state.lastDay || null };
  return {};
}

/* ------------------------------ Instagram ------------------------------ */

const IG = "https://graph.instagram.com/v21.0";

async function igToken(pool, env, secret, state) {
  // The copy kept here is only for renewing a token; the one on the server
  // wins as soon as it changes (a new token means a new account, perhaps).
  const envToken = String(env.IG_ACCESS_TOKEN || "").trim();
  const fp = crypto.createHash("sha256").update(envToken).digest("hex").slice(0, 16);
  if (state.envFp !== fp) {
    state.tokenSealed = null; state.tokenRefreshedAt = null; state.tokenExpiresAt = null;
    state.envFp = fp; state.tokenChanged = true;
  }
  let token = state.tokenSealed ? unseal(state.tokenSealed, secret) : null;
  if (!token) token = envToken;
  // The long-lived token is good for 60 days and can be renewed after the first
  // day: once a month, keeping the new one here.
  const age = state.tokenRefreshedAt ? Date.now() - Date.parse(state.tokenRefreshedAt) : Infinity;
  if (age > 30 * DAY) {
    try {
      const r = await http("https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=" + encodeURIComponent(token));
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.access_token) {
        token = j.access_token;
        state.tokenSealed = seal(token, secret);
        state.tokenRefreshedAt = new Date().toISOString();
        state.tokenExpiresAt = new Date(Date.now() + Number(j.expires_in || 0) * 1000).toISOString();
      }
    } catch (_) { /* the token still works until it expires: try again next time */ }
  }
  return token;
}

async function igGet(path, token) {
  const sep = path.includes("?") ? "&" : "?";
  const r = await http(IG + path + sep + "access_token=" + encodeURIComponent(token));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Instagram: " + ((j.error && j.error.message) || ("errore " + r.status)));
  return j;
}

export async function fetchInstagram(pool, { env, secret, now = Date.now() }) {
  const row = await loadRow(pool, "instagram");
  const state = row.state;
  const token = await igToken(pool, env, secret, state);
  const me = await igGet("/me?fields=user_id,username,followers_count,follows_count,media_count", token);
  const today = dayOf(now);
  // Another profile than before: the numbers and posts of the old one go away.
  const who = String(me.user_id || me.id || me.username || "");
  if (state.tokenChanged || (state.accountId && who && state.accountId !== who)) {
    await pool.query("DELETE FROM admin_metrics WHERE source = 'instagram' AND origin <> 'manual'");
    state.recentMedia = [];
  }
  delete state.tokenChanged;
  if (who) state.accountId = who;
  state.username = me.username || null;
  for (const [metric, value] of [["followers", me.followers_count], ["follows", me.follows_count], ["media_count", me.media_count]]) {
    if (Number.isFinite(Number(value))) await putMetric(pool, { day: today, source: "instagram", metric, value: Number(value) }, "api");
  }
  // Yesterday's reach and activity (Instagram gives them per full day).
  const end = Math.floor(new Date(today + "T00:00:00Z").getTime() / 1000);
  const start = end - 86400;
  try {
    const ins = await igGet("/me/insights?metric=reach,profile_views,website_clicks,accounts_engaged&period=day&metric_type=total_value&since=" + start + "&until=" + end, token);
    const yesterday = dayOf(now - DAY);
    for (const m of ins.data || []) {
      const v = m.total_value && Number(m.total_value.value);
      if (Number.isFinite(v)) await putMetric(pool, { day: yesterday, source: "instagram", metric: m.name, value: v }, "api");
    }
  } catch (err) {
    state.insightsNote = String(err.message).slice(0, 160);
  }
  try {
    const media = await igGet("/me/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=12", token);
    state.recentMedia = (media.data || []).map((m) => ({
      type: m.media_type, at: m.timestamp, url: m.permalink, likes: Number(m.like_count || 0), comments: Number(m.comments_count || 0),
      caption: String(m.caption || "").replace(/\s+/g, " ").slice(0, 80)
    }));
  } catch (err) {
    state.mediaNote = String(err.message).slice(0, 160);
  }
  await saveRow(pool, "instagram", { state, lastRunAt: new Date(now), lastOkAt: new Date(now), lastError: null });
  return { followers: me.followers_count };
}

/* ------------------------------ App Store ------------------------------ */

const DOWNLOAD_TYPES = new Set(["1", "1F", "1T", "F1", "1E", "1EP", "1EU"]);
const UPDATE_TYPES = new Set(["7", "7F", "7T", "F7"]);

export function parseAscSales(tsv) {
  const lines = String(tsv || "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { downloads: 0, updates: 0, proceeds: {}, rows: 0 };
  const head = lines[0].split("\t").map((h) => h.trim());
  const at = (name) => head.indexOf(name);
  const iType = at("Product Type Identifier"), iUnits = at("Units"), iProceeds = at("Developer Proceeds"), iCur = at("Currency of Proceeds");
  let downloads = 0, updates = 0;
  const proceeds = {};
  for (const line of lines.slice(1)) {
    const c = line.split("\t");
    const type = c[iType]; const units = Number(c[iUnits]) || 0;
    if (DOWNLOAD_TYPES.has(type)) downloads += units;
    else if (UPDATE_TYPES.has(type)) updates += units;
    const p = Number(c[iProceeds]) || 0;
    if (p && units) proceeds[c[iCur] || "?"] = (proceeds[c[iCur] || "?"] || 0) + p * units;
  }
  return { downloads, updates, proceeds, rows: lines.length - 1 };
}

async function ascToken(env) {
  const pem = String(env.ASC_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const k = await importPKCS8(pem, "ES256");
  return new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: env.ASC_KEY_ID, typ: "JWT" })
    .setIssuer(env.ASC_ISSUER_ID).setAudience("appstoreconnect-v1").setIssuedAt().setExpirationTime("15m").sign(k);
}

export async function fetchAppStore(pool, { env, now = Date.now() }) {
  const row = await loadRow(pool, "appstore");
  const state = row.state;
  const jwt = await ascToken(env);
  // Apple publishes a day's report a day or two later: the last 14 days, the ones not yet kept.
  const have = new Set((await pool.query(
    "SELECT day FROM admin_metrics WHERE source = 'appstore' AND metric = 'downloads' AND origin = 'api' AND day >= $1::date", [dayOf(now - 14 * DAY)]
  )).rows.map((r) => dateOnly(r.day)));
  let fetched = 0;
  for (let back = 2; back <= 14; back++) {
    const day = dayOf(now - back * DAY);
    if (have.has(day)) continue;
    const url = "https://api.appstoreconnect.apple.com/v1/salesReports?filter%5Bfrequency%5D=DAILY&filter%5BreportType%5D=SALES&filter%5BreportSubType%5D=SUMMARY&filter%5BvendorNumber%5D="
      + encodeURIComponent(env.ASC_VENDOR_NUMBER) + "&filter%5BreportDate%5D=" + day + "&filter%5Bversion%5D=1_1";
    const r = await http(url, { headers: { Authorization: "Bearer " + jwt, Accept: "application/a-gzip" } });
    if (r.status === 404) { await putMetric(pool, { day, source: "appstore", metric: "downloads", value: 0 }, "api"); continue; }
    if (!r.ok) throw new Error("App Store Connect: errore " + r.status + " " + String((await r.text().catch(() => "")).slice(0, 120)));
    const sales = parseAscSales(zlib.gunzipSync(Buffer.from(await r.arrayBuffer())).toString("utf8"));
    await putMetric(pool, { day, source: "appstore", metric: "downloads", value: sales.downloads }, "api");
    await putMetric(pool, { day, source: "appstore", metric: "updates", value: sales.updates }, "api");
    const cur = Object.keys(sales.proceeds);
    if (cur.length === 1) {
      state.currency = cur[0];
      await putMetric(pool, { day, source: "appstore", metric: "proceeds", value: Math.round(sales.proceeds[cur[0]] * 100) / 100 }, "api");
      if (cur[0] === "EUR" && sales.proceeds.EUR > 0) {
        await addLedger(pool, { day, kind: "income", cents: Math.round(sales.proceeds.EUR * 100), category: "app-store", userId: null, source: "apple", reference: "asc:" + day, note: "Incasso App Store, netto Apple", actor: "integrazione" });
      }
    }
    state.lastDay = day;
    fetched += 1;
  }
  await saveRow(pool, "appstore", { state, lastRunAt: new Date(now), lastOkAt: new Date(now), lastError: null });
  return { days: fetched };
}

/* ------------------------------ Google Play ------------------------------ */

function decodeUtf16(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.slice(2).toString("utf16le");
  if (buf[0] === 0xfe && buf[1] === 0xff) { const b = Buffer.from(buf.slice(2)); b.swap16(); return b.toString("utf16le"); }
  return buf.toString("utf8");
}

export function parsePlayInstalls(text) {
  const lines = String(text || "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const head = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  const at = (n) => head.indexOf(n);
  const iDate = at("Date"), iInst = at("Daily User Installs"), iUn = at("Daily User Uninstalls"), iAct = at("Active Device Installs");
  return lines.slice(1).map((l) => l.split(",").map((c) => c.replace(/"/g, "").trim())).filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c[iDate] || "")).map((c) => ({
    day: c[iDate], installs: Number(c[iInst]) || 0, uninstalls: Number(c[iUn]) || 0, active: Number(c[iAct]) || 0
  }));
}

async function googleToken(sa) {
  const k = await importPKCS8(String(sa.private_key), "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/devstorage.read_only" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" }).setIssuer(sa.client_email).setSubject(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token").setIssuedAt().setExpirationTime("30m").sign(k);
  const r = await http("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + encodeURIComponent(assertion)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error("Google: " + (j.error_description || j.error || ("errore " + r.status)));
  return j.access_token;
}

export async function fetchPlayStore(pool, { env, now = Date.now() }) {
  const row = await loadRow(pool, "playstore");
  const state = row.state;
  let sa;
  try { sa = JSON.parse(env.PLAY_SERVICE_ACCOUNT_JSON); } catch (_) { throw new Error("PLAY_SERVICE_ACCOUNT_JSON non e' un JSON valido."); }
  const token = await googleToken(sa);
  const pkg = String(env.PLAY_PACKAGE || "com.nurvan.app");
  const months = new Set([dayOf(now).slice(0, 7), dayOf(now - 30 * DAY).slice(0, 7)]);
  let count = 0;
  for (const m of months) {
    const obj = "stats/installs/installs_" + pkg + "_" + m.replace("-", "") + "_overview.csv";
    const r = await http("https://storage.googleapis.com/storage/v1/b/" + encodeURIComponent(env.PLAY_BUCKET) + "/o/" + encodeURIComponent(obj) + "?alt=media", { headers: { Authorization: "Bearer " + token } });
    if (r.status === 404) continue;
    if (!r.ok) throw new Error("Google Play: errore " + r.status + " leggendo " + obj);
    for (const d of parsePlayInstalls(decodeUtf16(Buffer.from(await r.arrayBuffer())))) {
      await putMetric(pool, { day: d.day, source: "playstore", metric: "downloads", value: d.installs }, "api");
      await putMetric(pool, { day: d.day, source: "playstore", metric: "uninstalls", value: d.uninstalls }, "api");
      await putMetric(pool, { day: d.day, source: "playstore", metric: "active_devices", value: d.active }, "api");
      state.lastDay = d.day;
      count += 1;
    }
  }
  await saveRow(pool, "playstore", { state, lastRunAt: new Date(now), lastOkAt: new Date(now), lastError: null });
  return { days: count };
}

/* ------------------------------ running them ------------------------------ */

const RUNNERS = { instagram: fetchInstagram, appstore: fetchAppStore, playstore: fetchPlayStore };

/** Runs one connection and keeps the outcome, whatever it was. */
export async function runIntegration(pool, name, { env = process.env, secret, now = Date.now() } = {}) {
  if (!RUNNERS[name]) throw Object.assign(new Error("Connessione sconosciuta."), { statusCode: 404 });
  if (!configured(name, env)) throw Object.assign(new Error("Mancano le variabili: " + missing(name, env).join(", ") + "."), { statusCode: 400 });
  try {
    return await RUNNERS[name](pool, { env, secret, now });
  } catch (err) {
    const row = await loadRow(pool, name);
    await saveRow(pool, name, { state: row.state, lastRunAt: new Date(now), lastOkAt: row.lastOkAt, lastError: String(err.message || err).slice(0, 300) });
    throw Object.assign(new Error(String(err.message || err)), { statusCode: 502 });
  }
}

/**
 * The background pass: every connection that is configured and has not run
 * for six hours runs now, once an hour at most. On a host that sleeps this
 * simply runs when it wakes, and opening the dashboard runs it too.
 */
export function startIntegrationsJob({ pool, initDb, env = process.env, secret, intervalMs = 3600000, everyMs = 6 * 3600000 }) {
  async function pass() {
    try {
      await initDb();
      for (const name of Object.keys(INTEGRATIONS)) {
        if (!configured(name, env)) continue;
        const row = await loadRow(pool, name);
        if (row.lastRunAt && Date.now() - new Date(row.lastRunAt).getTime() < everyMs) continue;
        try { await runIntegration(pool, name, { env, secret }); } catch (err) { console.warn("INTEGRATION", name, err && err.message); }
      }
    } catch (err) { console.warn("INTEGRATIONS_PASS", err && err.message); }
  }
  const first = setTimeout(pass, 60000);
  const timer = setInterval(pass, intervalMs);
  if (first.unref) first.unref();
  if (timer.unref) timer.unref();
  return { pass, stop() { clearTimeout(first); clearInterval(timer); } };
}
