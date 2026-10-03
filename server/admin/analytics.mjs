// Visits, app use and the numbers kept by hand or fetched from other services.
//
// No cookies, no identifiers, no third party. A page view is counted by day,
// path, where the visitor came from (the utm_source of a link, or the
// referring site) and the kind of device. A "visitor" is a hash of IP and
// browser mixed with a salt that changes every day, kept two days and then
// forgotten: it can tell that today 40 different people came, never who, and
// never that tomorrow's visitor is the same person. The app does the same:
// once a day it says which platform it runs on (web, installed web app, iOS,
// Android) and, once ever, that it was opened for the first time.
//
// Counting happens in memory and is written every few seconds, so a page view
// costs no query.
import crypto from "node:crypto";
import { dateOnly } from "./dates.mjs";

const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|facebot|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|okhttp|java\/|libwww|scrapy|semrush|ahrefs|mj12|dataforseo|petalbot|bytespider|gptbot|claudebot|perplexity|ccbot/i;
export const PLATFORMS = ["web", "pwa", "ios", "android"];

const dayFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" });
export function dayOf(ms = Date.now()) { return dayFmt.format(new Date(ms)); }

export function deviceOf(ua) {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(String(ua || "")) ? "mobile" : "desktop";
}

/** Where a visit came from: a tagged link first, then the referring site. */
export function sourceOf(req, ownHosts = []) {
  const q = req.query || {};
  const tag = String(q.utm_source || q.ref || "").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 30);
  if (tag) return /^(instagram|ig)$/.test(tag) ? "instagram" : "link:" + tag;
  let host = "";
  try { host = new URL(String(req.headers.referer || req.headers.referrer || "")).hostname.toLowerCase().replace(/^www\./, ""); } catch (_) { host = ""; }
  if (!host) return "diretto";
  if (ownHosts.some((h) => h.replace(/^www\./, "") === host)) return "interno";
  if (/(^|\.)instagram\.com$/.test(host) || host === "l.instagram.com") return "instagram";
  if (/(^|\.)google\./.test(host)) return "google";
  if (/(^|\.)(bing\.com|duckduckgo\.com|ecosia\.org|yahoo\.com|yandex\.|qwant\.com|brave\.com)/.test(host)) return "ricerca";
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me|l\.facebook\.com|m\.facebook\.com)$/.test(host)) return "facebook";
  if (/(^|\.)(t\.co|twitter\.com|x\.com)$/.test(host)) return "x";
  if (/(^|\.)(linkedin\.com|lnkd\.in)$/.test(host)) return "linkedin";
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return "youtube";
  if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(host)) return "whatsapp";
  if (/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com)$/.test(host)) return "assistenti-ai";
  return "altro:" + host.slice(0, 40);
}

export function pagePath(p) {
  let s = String(p || "/").toLowerCase().split("?")[0];
  s = s.replace(/\/{2,}/g, "/");
  if (s.length > 1) s = s.replace(/\/+$/, "");
  return s.slice(0, 120) || "/";
}

function isPageRequest(req) {
  if (req.method !== "GET") return false;
  const p = String(req.path || "");
  if (p.startsWith("/api/") || p.startsWith("/site-assets") || p.startsWith("/admin") || p.startsWith("/media") || p === "/sw.js" || p === "/readyz" || p === "/healthz") return false;
  if (/\.[a-z0-9]{1,8}$/i.test(p) && !p.endsWith(".html")) return false;
  return true;
}

export function createAnalytics({ pool, initDb, secret, siteHosts = [], appHosts = [], hiddenPrefixes = [], flushMs = 20000 }) {
  const hits = new Map();
  const visitors = new Map();
  const pings = new Map();
  const installs = new Map();
  const known = new Set([...siteHosts, ...appHosts].map((h) => String(h).toLowerCase()));
  const own = [...known];
  let timer = null;
  let lastPurge = 0;
  let flushing = null;
  const pings_rate = new Map();

  const salt = (day) => crypto.createHmac("sha256", String(secret || "nurvan")).update("visitors|" + day).digest("hex");
  function vhash(req, day) {
    const ip = String(req.ip || req.socket?.remoteAddress || "");
    return crypto.createHash("sha256").update(salt(day) + "|" + ip + "|" + String(req.headers["user-agent"] || "")).digest("hex").slice(0, 24);
  }

  function middleware(req, res, next) {
    if (!isPageRequest(req)) return next();
    const host = String(req.hostname || "").toLowerCase();
    if (!known.has(host)) return next();
    const p = pagePath(req.path);
    if (hiddenPrefixes.some((x) => x && (p === "/" + x || p.startsWith("/" + x + "/")))) return next();
    res.on("finish", () => {
      try {
        if (res.statusCode !== 200) return;
        if (!/text\/html/i.test(String(res.getHeader("content-type") || ""))) return;
        const ua = String(req.headers["user-agent"] || "");
        if (!ua || BOT.test(ua)) return;
        const day = dayOf();
        const source = sourceOf(req, own);
        const key = [day, host, p, source, deviceOf(ua)].join("\u0001");
        hits.set(key, (hits.get(key) || 0) + 1);
        const vk = day + "\u0001" + vhash(req, day);
        if (!visitors.has(vk)) visitors.set(vk, source === "interno" ? "diretto" : source);
        schedule();
      } catch (_) { /* counting never breaks a page */ }
    });
    return next();
  }

  function rateOk(ip) {
    const now = Date.now();
    const list = (pings_rate.get(ip) || []).filter((t) => now - t < 3600000);
    list.push(now);
    pings_rate.set(ip, list);
    if (pings_rate.size > 5000) pings_rate.clear();
    return list.length <= 30;
  }

  // POST /api/app/ping { platform, first }
  function appPing(req, res) {
    const platform = String((req.body && req.body.platform) || "");
    if (!PLATFORMS.includes(platform)) return res.status(400).json({ ok: false });
    if (!rateOk(String(req.ip || ""))) return res.status(429).json({ ok: false });
    const ua = String(req.headers["user-agent"] || "");
    if (BOT.test(ua)) return res.json({ ok: true });
    const day = dayOf();
    const pk = [day, platform, vhash(req, day)].join("\u0001");
    pings.set(pk, 1);
    if (req.body && req.body.first === true) {
      const ik = day + "\u0001" + platform;
      installs.set(ik, (installs.get(ik) || 0) + 1);
    }
    schedule();
    return res.json({ ok: true });
  }

  function schedule() {
    if (timer) return;
    timer = setTimeout(() => { timer = null; flush().catch(() => {}); }, flushMs);
    if (timer.unref) timer.unref();
  }

  async function flush() {
    if (flushing) return flushing;
    if (!hits.size && !visitors.size && !pings.size && !installs.size) return;
    const h = [...hits]; hits.clear();
    const v = [...visitors]; visitors.clear();
    const p = [...pings.keys()]; pings.clear();
    const i = [...installs]; installs.clear();
    flushing = (async () => {
      try {
        await initDb();
        if (h.length) {
          const cols = h.map(([k, n]) => k.split("\u0001").concat(n));
          await pool.query(
            `INSERT INTO site_hits_day(day, host, path, source, device, hits)
             SELECT * FROM UNNEST($1::date[], $2::text[], $3::text[], $4::text[], $5::text[], $6::int[])
             ON CONFLICT (day, host, path, source, device) DO UPDATE SET hits = site_hits_day.hits + EXCLUDED.hits`,
            [0, 1, 2, 3, 4].map((x) => cols.map((c) => c[x])).concat([cols.map((c) => Number(c[5]))])
          );
        }
        const days = new Set();
        if (v.length) {
          const cols = v.map(([k, source]) => k.split("\u0001").concat(source));
          cols.forEach((c) => days.add(c[0]));
          await pool.query(
            `INSERT INTO site_visitors_day(day, vhash, source)
             SELECT * FROM UNNEST($1::date[], $2::text[], $3::text[]) ON CONFLICT (day, vhash) DO NOTHING`,
            [0, 1, 2].map((x) => cols.map((c) => c[x]))
          );
          await pool.query(
            `INSERT INTO site_uniques_day(day, source, uniques)
             SELECT day, source, COUNT(*)::int FROM site_visitors_day WHERE day = ANY($1::date[]) GROUP BY day, source
             ON CONFLICT (day, source) DO UPDATE SET uniques = EXCLUDED.uniques`,
            [[...days]]
          );
        }
        const appDays = new Set();
        if (p.length) {
          const cols = p.map((k) => k.split("\u0001"));
          cols.forEach((c) => appDays.add(c[0]));
          await pool.query(
            `INSERT INTO app_pings_day(day, platform, vhash)
             SELECT * FROM UNNEST($1::date[], $2::text[], $3::text[]) ON CONFLICT DO NOTHING`,
            [0, 1, 2].map((x) => cols.map((c) => c[x]))
          );
        }
        if (i.length) {
          const cols = i.map(([k, n]) => k.split("\u0001").concat(n));
          cols.forEach((c) => appDays.add(c[0]));
          await pool.query(
            `INSERT INTO app_stats_day(day, platform, active, installs)
             SELECT d, pl, 0, n FROM UNNEST($1::date[], $2::text[], $3::int[]) AS t(d, pl, n)
             ON CONFLICT (day, platform) DO UPDATE SET installs = app_stats_day.installs + EXCLUDED.installs`,
            [cols.map((c) => c[0]), cols.map((c) => c[1]), cols.map((c) => Number(c[2]))]
          );
        }
        if (appDays.size) {
          await pool.query(
            `INSERT INTO app_stats_day(day, platform, active, installs)
             SELECT day, platform, COUNT(*)::int, 0 FROM app_pings_day WHERE day = ANY($1::date[]) GROUP BY day, platform
             ON CONFLICT (day, platform) DO UPDATE SET active = EXCLUDED.active`,
            [[...appDays]]
          );
        }
        if (Date.now() - lastPurge > 3600000) {
          lastPurge = Date.now();
          await pool.query("DELETE FROM site_visitors_day WHERE day < (NOW() AT TIME ZONE 'Europe/Rome')::date - 2");
          await pool.query("DELETE FROM app_pings_day WHERE day < (NOW() AT TIME ZONE 'Europe/Rome')::date - 2");
        }
      } catch (err) {
        // Put the counts back: a failed write must not lose a day of visits.
        h.forEach(([k, n]) => hits.set(k, (hits.get(k) || 0) + n));
        v.forEach(([k, s]) => { if (!visitors.has(k)) visitors.set(k, s); });
        p.forEach((k) => pings.set(k, 1));
        i.forEach(([k, n]) => installs.set(k, (installs.get(k) || 0) + n));
        console.warn("ANALYTICS_FLUSH", err && err.message);
      } finally {
        flushing = null;
      }
    })();
    return flushing;
  }

  function stop() { if (timer) clearTimeout(timer); timer = null; return flush(); }
  return { middleware, appPing, flush, stop, siteHosts, appHosts };
}

/* ------------------------------ reading ------------------------------ */

function daysList(days, now = Date.now()) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push(dayOf(now - i * 86400000));
  return out;
}
const sum = (list) => list.reduce((n, x) => n + x, 0);
const iso = dateOnly;

function fillSeries(days, rows, field = "n") {
  const map = new Map(rows.map((r) => [iso(r.day), Number(r[field])]));
  return days.map((d) => ({ day: d, value: map.get(d) || 0 }));
}

/** The public site: views, visitors, where they came from, what they read. */
export async function siteStats(pool, siteHosts, { days = 30, now = Date.now() } = {}) {
  const n = Math.min(365, Math.max(7, Number(days) || 30));
  const list = daysList(n * 2, now);
  const cur = list.slice(n);
  const from = list[0];
  const hosts = siteHosts.length ? siteHosts : ["nurvan.app"];
  const hitsRows = (await pool.query(
    "SELECT day, SUM(hits)::int AS n FROM site_hits_day WHERE day >= $1::date AND host = ANY($2::text[]) GROUP BY day", [from, hosts]
  )).rows;
  const uniqRows = (await pool.query(
    "SELECT day, SUM(uniques)::int AS n FROM site_uniques_day WHERE day >= $1::date GROUP BY day", [from]
  )).rows;
  const hitsSeries = fillSeries(list, hitsRows);
  const uniqSeries = fillSeries(list, uniqRows);
  const since = cur[0];
  const sources = (await pool.query(
    "SELECT source, SUM(hits)::int AS hits FROM site_hits_day WHERE day >= $1::date AND host = ANY($2::text[]) AND source <> 'interno' GROUP BY source ORDER BY 2 DESC LIMIT 25", [since, hosts]
  )).rows.map((r) => ({ source: r.source, hits: Number(r.hits) }));
  const visitorsBySource = (await pool.query(
    "SELECT source, SUM(uniques)::int AS n FROM site_uniques_day WHERE day >= $1::date GROUP BY source ORDER BY 2 DESC LIMIT 25", [since]
  )).rows.map((r) => ({ source: r.source, visitors: Number(r.n) }));
  const pages = (await pool.query(
    "SELECT path, SUM(hits)::int AS hits FROM site_hits_day WHERE day >= $1::date AND host = ANY($2::text[]) GROUP BY path ORDER BY 2 DESC LIMIT 40", [since, hosts]
  )).rows.map((r) => ({ path: r.path, hits: Number(r.hits) }));
  const devices = (await pool.query(
    "SELECT device, SUM(hits)::int AS hits FROM site_hits_day WHERE day >= $1::date AND host = ANY($2::text[]) GROUP BY device", [since, hosts]
  )).rows.map((r) => ({ device: r.device, hits: Number(r.hits) }));
  const total = (series, from2, to2) => sum(series.slice(from2, to2).map((x) => x.value));
  return {
    days: n,
    views: { current: total(hitsSeries, n), previous: total(hitsSeries, 0, n), series: hitsSeries.slice(n) },
    visitors: { current: total(uniqSeries, n), previous: total(uniqSeries, 0, n), series: uniqSeries.slice(n) },
    sources, visitorsBySource, pages, devices,
    note: "Un visitatore e' un'impronta giornaliera di IP e browser, dimenticata dopo due giorni: lo stesso visitatore in giorni diversi conta piu' volte."
  };
}

/** The app: how many open it each day and how many opened it for the first time, by platform. */
export async function appStats(pool, { days = 30, now = Date.now() } = {}) {
  const n = Math.min(365, Math.max(7, Number(days) || 30));
  const list = daysList(n * 2, now);
  const rows = (await pool.query("SELECT day, platform, active, installs FROM app_stats_day WHERE day >= $1::date", [list[0]])).rows;
  const out = {};
  for (const platform of PLATFORMS) {
    const mine = rows.filter((r) => r.platform === platform);
    const active = fillSeries(list, mine, "active");
    const installs = fillSeries(list, mine, "installs");
    out[platform] = {
      active: { current: sum(active.slice(n).map((x) => x.value)), previous: sum(active.slice(0, n).map((x) => x.value)), series: active.slice(n), today: active[active.length - 1].value },
      installs: { current: sum(installs.slice(n).map((x) => x.value)), previous: sum(installs.slice(0, n).map((x) => x.value)), series: installs.slice(n) }
    };
  }
  return { days: n, platforms: out };
}

/* ------------------------------ metrics by hand or from APIs ------------------------------ */

export const METRIC_SOURCES = {
  instagram: ["followers", "follows", "media_count", "reach", "profile_views", "website_clicks", "accounts_engaged", "likes", "comments", "shares", "saves"],
  appstore: ["downloads", "updates", "proceeds", "rating", "ratings_count"],
  playstore: ["downloads", "uninstalls", "active_devices", "rating", "ratings_count", "proceeds"],
  other: []
};

export function cleanMetric(body) {
  const source = String(body && body.source || "");
  if (!Object.prototype.hasOwnProperty.call(METRIC_SOURCES, source)) throw Object.assign(new Error("Fonte non valida."), { statusCode: 400 });
  const metric = String(body.metric || "").toLowerCase();
  const ok = source === "other" ? /^[a-z][a-z0-9_]{1,30}$/.test(metric) : METRIC_SOURCES[source].includes(metric);
  if (!ok) throw Object.assign(new Error("Metrica non valida per " + source + "."), { statusCode: 400 });
  const day = String(body.day || dayOf()).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) throw Object.assign(new Error("Data non valida."), { statusCode: 400 });
  const value = Number(String(body.value).replace(",", "."));
  if (!Number.isFinite(value) || value < 0 || value > 1e12) throw Object.assign(new Error("Valore non valido."), { statusCode: 400 });
  return { day, source, metric, value };
}

export async function putMetric(pool, m, origin = "manual") {
  await pool.query(
    `INSERT INTO admin_metrics(day, source, metric, value, origin, updated_at) VALUES($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (day, source, metric) DO UPDATE SET value = EXCLUDED.value, origin = EXCLUDED.origin, updated_at = NOW()
     WHERE admin_metrics.origin <> 'manual' OR EXCLUDED.origin = 'manual'`,
    [m.day, m.source, m.metric, m.value, origin]
  );
}

export async function deleteMetric(pool, m) {
  const r = await pool.query("DELETE FROM admin_metrics WHERE day = $1::date AND source = $2 AND metric = $3 RETURNING day", [m.day, m.source, m.metric]);
  return r.rows.length > 0;
}

/** Series of every metric of a source for the last N days (missing days stay missing: they are not zero). */
export async function metricSeries(pool, source, { days = 30, now = Date.now() } = {}) {
  const n = Math.min(730, Math.max(7, Number(days) || 30));
  const from = dayOf(now - (n - 1) * 86400000);
  const rows = (await pool.query(
    "SELECT day, metric, value, origin FROM admin_metrics WHERE source = $1 AND day >= $2::date ORDER BY day", [source, from]
  )).rows;
  const out = {};
  for (const r of rows) {
    const m = out[r.metric] || (out[r.metric] = []);
    m.push({ day: iso(r.day), value: Number(r.value), origin: r.origin });
  }
  return out;
}

export async function latestMetric(pool, source, metric) {
  const r = (await pool.query(
    "SELECT day, value FROM admin_metrics WHERE source = $1 AND metric = $2 ORDER BY day DESC LIMIT 1", [source, metric]
  )).rows[0];
  return r ? { day: iso(r.day), value: Number(r.value) } : null;
}

export async function metricTotal(pool, source, metric, { days = 30, now = Date.now() } = {}) {
  const from = dayOf(now - (days - 1) * 86400000);
  const r = (await pool.query(
    "SELECT COALESCE(SUM(value), 0) AS v FROM admin_metrics WHERE source = $1 AND metric = $2 AND day >= $3::date", [source, metric, from]
  )).rows[0];
  return Number(r.v);
}
