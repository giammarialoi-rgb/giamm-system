// IndexNow: when a page of the site is new, or an article changes, the search
// engines that support the protocol (Bing, Yandex, Seznam, Naver... - not
// Google) are told at once instead of waiting for their next visit.
//
// How it works: a key file at https://<site>/<key>.txt proves the site is
// ours; every hour the job reads the same list of pages as the sitemap and
// announces the ones not announced before (indexnow_urls: migration 0025).
// A page already announced is announced again only when it is an article or
// category whose date changed: the date of the other pages is the day of the
// last deploy, which says nothing. The first run announces the whole site.
//
// The key is public by design (it is served as a file). INDEXNOW_KEY on the
// host replaces it; INDEXNOW=0 turns the job off.
import { SITE_LANGS } from "./i18n.mjs";

export const DEFAULT_KEY = "ad3fc9381314634d2b86e65233e3c9ef";
export const ENDPOINT = "https://api.indexnow.org/IndexNow";
export const BATCH = 1000;
export const EVERY_MS = 60 * 60 * 1000;

export const keyOf = (env = process.env) => String(env.INDEXNOW_KEY || DEFAULT_KEY).trim();

// [{ url, lastmod, dated }] for every language of every page.
export function urlsOf(entries, origin) {
  const out = [];
  for (const e of entries) for (const l of SITE_LANGS) if (e.urls[l]) out.push({ url: origin + e.urls[l], lastmod: e.lastmod || "", dated: !!e.dated });
  return out;
}

// Of those, the ones to announce: not announced yet, or dated and changed.
export function toAnnounce(urls, known) {
  return urls.filter((u) => {
    const prev = known.get(u.url);
    return prev === undefined || (u.dated && prev !== u.lastmod);
  });
}

export async function submit(list, { key, host, fetchFn = fetch }) {
  const body = { host, key, keyLocation: "https://" + host + "/" + key + ".txt", urlList: list.map((u) => u.url) };
  const res = await fetchFn(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body) });
  return { ok: res.status === 200 || res.status === 202, status: res.status };
}

// One pass. Returns how many addresses were announced.
export async function runIndexNow({ pool, initDb, entries, origin, key = keyOf(), fetchFn = fetch, log = console }) {
  await initDb();
  const host = new URL(origin).host;
  const known = new Map((await pool.query("SELECT url, lastmod FROM indexnow_urls")).rows.map((r) => [r.url, r.lastmod]));
  const pending = toAnnounce(urlsOf(await entries(), origin), known);
  let sent = 0;
  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    const result = await submit(chunk, { key, host, fetchFn });
    if (!result.ok) { log.warn("INDEXNOW", "status " + result.status + ": retry at the next pass"); break; }
    for (const u of chunk) {
      await pool.query(
        "INSERT INTO indexnow_urls(url, lastmod, submitted_at) VALUES ($1, $2, NOW()) ON CONFLICT (url) DO UPDATE SET lastmod = EXCLUDED.lastmod, submitted_at = NOW()",
        [u.url, u.lastmod]
      );
    }
    sent += chunk.length;
  }
  return sent;
}

// The key file, on the site's own domain.
export function mountIndexNowKey(app, { isSiteHost, key = keyOf() }) {
  app.get("/" + key + ".txt", (req, res, next) => {
    if (!isSiteHost(req)) return next();
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.type("text/plain").send(key);
  });
}

// Starts the hourly job (the first pass a few minutes after the start).
export function startIndexNowJob(options, { firstDelayMs = 3 * 60 * 1000, everyMs = EVERY_MS } = {}) {
  const pass = () => runIndexNow(options).then((n) => { if (n) console.log("INDEXNOW announced " + n + " addresses"); }).catch((err) => console.warn("INDEXNOW", err && err.message));
  const first = setTimeout(() => { pass(); setInterval(pass, everyMs).unref(); }, firstDelayMs);
  first.unref();
}
