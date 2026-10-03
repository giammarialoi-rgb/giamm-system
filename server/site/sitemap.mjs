// robots.txt and sitemap.xml of the site.
//
// The sitemap is not written by hand: it is built, on every request, from
// the same data the pages come from - the blog's articles (so a new article
// is in it as soon as the page exists), the HYROX calendar file, the example
// workouts and the fixed pages - in every language the page really exists in.
// Each address lists all its versions (hreflang, with x-default), the way the
// pages themselves do.
//
// Over MAX_URLS addresses the answer becomes an index with one sitemap per
// language (/sitemap-<lang>.xml).
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_LANGS, langPrefix } from "./i18n.mjs";
import { SAMPLES } from "./samples.mjs";
import { waitlistPath } from "./waitlist.mjs";
import { authorPath, aboutPath, contactPath, legalPath } from "./trust.mjs";
import { wellbeingPath } from "./wellbeing.mjs";

export const MAX_URLS = 1000;

const xml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
const day = (d) => (d instanceof Date ? d.toISOString() : String(d || "")).slice(0, 10);
const newest = (...dates) => dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "")).sort().pop() || "";

export function robotsTxt(origin) {
  return "User-agent: *\nAllow: /\n\nSitemap: " + origin + "/sitemap.xml\n";
}

// [{ urls: { lang: "/path" }, lastmod: "YYYY-MM-DD" }]: one per page, with
// the addresses of its versions.
export async function collectEntries({ articles, events = [], siteDir, webDir, now = new Date() }) {
  const mtime = async (...files) => {
    let best = "";
    for (const f of files) { try { best = newest(best, day((await fs.stat(f)).mtime)); } catch (_) {} }
    return best || day(now);
  };
  const fixed = (tail, lastmod) => ({ urls: Object.fromEntries(SITE_LANGS.map((l) => [l, (langPrefix(l) + tail) || "/"])), lastmod });
  const entries = [];

  // The articles, as written in each language (not the English text a page
  // falls back to: that page is not a version of its own).
  const written = {};
  for (const l of SITE_LANGS) written[l] = (await articles(l)).filter((a) => a.lang === l);
  const all = SITE_LANGS.flatMap((l) => written[l]);
  const lastPost = newest(...all.map((a) => newest(a.updated, a.date)));

  entries.push({ urls: Object.fromEntries(SITE_LANGS.map((l) => [l, langPrefix(l) || "/"])), lastmod: await mtime(path.join(siteDir, "home.html"), path.join(siteDir, "shell.html")) });
  entries.push(fixed("/blog", lastPost || await mtime(path.join(siteDir, "shell.html"))));
  entries.push(fixed("/allenamenti", await mtime(path.join(siteDir, "samples.json"))));
  for (const s of SAMPLES) entries.push(fixed("/allenamenti/" + s.slug, await mtime(path.join(siteDir, "samples.json"))));
  const eventsFile = path.join(webDir, "hyrox-events.json");
  const eventsDate = await mtime(eventsFile);
  entries.push(fixed("/hyrox", eventsDate));
  const today = day(now);
  for (const ev of events) if (ev && ev.id && (!ev.start || (ev.end || ev.start) >= today)) entries.push(fixed("/hyrox/" + ev.id, eventsDate));
  entries.push({ urls: Object.fromEntries(SITE_LANGS.map((l) => [l, waitlistPath(l)])), lastmod: await mtime(new URL("./waitlist.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")) });

  // Who writes, and the legal pages (now under the site's own domain).
  const own = async (fn, file) => ({ urls: Object.fromEntries(SITE_LANGS.map((l) => [l, fn(l)])), lastmod: await mtime(file) });
  const here = (name) => fileURLToPath(new URL("./" + name, import.meta.url));
  entries.push(await own(aboutPath, here("trust.mjs")), await own(contactPath, here("trust.mjs")));
  for (const key of ["hub", "posture", "postpartum", "labour"]) entries.push(await own((l) => wellbeingPath(key, l), path.join(path.dirname(path.dirname(path.dirname(here("trust.mjs")))), "web", "wellbeing-care.js")));
  entries.push(await own(authorPath, path.join(path.dirname(path.dirname(path.dirname(here("trust.mjs")))), "content", "author.md")));
  entries.push(await own((l) => legalPath(l, "privacy"), path.join(webDir, "privacy.html")), await own((l) => legalPath(l, "termini"), path.join(webDir, "termini.html")));

  // One entry per article: its folder is what ties the languages together.
  const byDir = new Map();
  for (const l of SITE_LANGS) for (const a of written[l]) {
    if (!byDir.has(a.dir)) byDir.set(a.dir, { urls: {}, lastmod: "" });
    const e = byDir.get(a.dir);
    e.urls[l] = langPrefix(l) + "/blog/" + a.slug;
    e.lastmod = newest(e.lastmod, a.updated, a.date);
  }
  for (const e of byDir.values()) entries.push({ urls: e.urls, lastmod: e.lastmod || today, dated: true });

  // The category pages, tied across languages through the articles they
  // list. When a group has two categories in one language (a category named
  // differently in two translations), they are not tied: each stands alone.
  const parent = new Map();
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const add = (x) => { if (!parent.has(x)) parent.set(x, x); };
  const join = (x, y) => { add(x); add(y); parent.set(find(x), find(y)); };
  const nodes = new Map(); // "lang:slug" -> { lang, slug, lastmod }
  for (const l of SITE_LANGS) for (const a of written[l]) {
    const id = l + ":" + a.categorySlug;
    if (!nodes.has(id)) nodes.set(id, { lang: l, slug: a.categorySlug, lastmod: "" });
    nodes.get(id).lastmod = newest(nodes.get(id).lastmod, a.updated, a.date);
    join(id, "dir:" + a.dir);
  }
  const groups = new Map();
  for (const [id, n] of nodes) { const r = find(id); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(n); }
  const pathOf = (n) => langPrefix(n.lang) + "/blog/categoria/" + encodeURIComponent(n.slug);
  for (const members of groups.values()) {
    const tied = new Set(members.map((n) => n.lang)).size === members.length;
    const sets = tied ? [members] : members.map((n) => [n]);
    for (const set of sets) entries.push({ urls: Object.fromEntries(set.map((n) => [n.lang, pathOf(n)])), lastmod: newest(...set.map((n) => n.lastmod)) || today, dated: true });
  }
  return entries;
}

const alternatesOf = (urls, origin) => {
  const keys = SITE_LANGS.filter((l) => urls[l]);
  const lines = keys.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${xml(origin + urls[l])}"/>`);
  const def = urls.it || urls.en || urls[keys[0]];
  lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xml(origin + def)}"/>`);
  return lines.join("\n");
};

// lang: only that language's addresses (a sitemap of the index); none: all.
export function renderUrlset(entries, origin, lang = null) {
  const blocks = [];
  for (const e of entries) for (const l of SITE_LANGS) {
    if (!e.urls[l] || (lang && l !== lang)) continue;
    blocks.push(`  <url>\n    <loc>${xml(origin + e.urls[l])}</loc>\n    <lastmod>${xml(e.lastmod)}</lastmod>\n${alternatesOf(e.urls, origin)}\n  </url>`);
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + blocks.join("\n") + "\n</urlset>\n";
}
export const countUrls = (entries) => entries.reduce((n, e) => n + SITE_LANGS.filter((l) => e.urls[l]).length, 0);

export function renderIndex(entries, origin) {
  const items = SITE_LANGS.filter((l) => entries.some((e) => e.urls[l])).map((l) => {
    const last = newest(...entries.filter((e) => e.urls[l]).map((e) => e.lastmod));
    return `  <sitemap>\n    <loc>${xml(origin + "/sitemap-" + l + ".xml")}</loc>${last ? `\n    <lastmod>${xml(last)}</lastmod>` : ""}\n  </sitemap>`;
  });
  return '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + items.join("\n") + "\n</sitemapindex>\n";
}

// isSiteHost(req): the site's own domain; elsewhere (the app's address) these
// files are not served. origin: "https://nurvan.app".
export function mountSitemap(app, { articles, calendar, siteDir, webDir, isSiteHost, origin, maxUrls = MAX_URLS }) {
  let cache = { at: 0, entries: [] };
  const entries = async () => {
    if (Date.now() - cache.at > 60 * 1000) {
      const data = calendar ? await calendar() : { events: [] };
      cache = { at: Date.now(), entries: await collectEntries({ articles, events: data.events || [], siteDir, webDir }) };
    }
    return cache.entries;
  };
  const guard = (handler) => async (req, res, next) => {
    if (!isSiteHost(req)) return next();
    try { return await handler(req, res); } catch (err) { console.error("SITEMAP", err); return res.status(500).type("text/plain").send("Sitemap non disponibile.\n"); }
  };
  app.get("/robots.txt", guard(async (req, res) => {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("text/plain").send(robotsTxt(origin));
  }));
  app.get("/sitemap.xml", guard(async (req, res) => {
    const list = await entries();
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("application/xml").send(countUrls(list) > maxUrls ? renderIndex(list, origin) : renderUrlset(list, origin));
  }));
  const result = { entries };
  app.get("/sitemap-:lang.xml", guard(async (req, res) => {
    const lang = String(req.params.lang || "");
    const list = await entries();
    if (!SITE_LANGS.includes(lang) || countUrls(list) <= maxUrls) return res.status(404).type("text/plain").send("Non trovata.\n");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("application/xml").send(renderUrlset(list, origin, lang));
  }));
  return result;
}
