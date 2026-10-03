// The site's blog.
//
// Articles come from two places:
//
// 1. content/articles/<date>-<slug>/  - what the daily routine writes:
//      article.it.md   the article (Markdown with a header between "---" lines)
//      images/         its cover and charts (paths in the article are relative)
//    An older folder may hold only index.html (a finished page): its <main> is
//    shown inside the site's page, with its own styles kept to that article.
//
// 2. site/blog/<slug>.md - an article written by hand, same header.
//
// Header fields: title, date (YYYY-MM-DD), category, description (or excerpt),
// slug, cover, cover_credit. Adding an article is adding a folder or a file;
// nothing else has to change. Articles dated in the future stay hidden until
// that day; files and folders starting with "_" are never published.
import fs from "node:fs/promises";
import path from "node:path";
import { SITE_LANGS, SITE_LOCALES, langPrefix, langOfPath, siteDict, st } from "./i18n.mjs";
import { waitlistPath } from "./waitlist.mjs";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Letters of any script are kept: a category written in Russian or Chinese has an address too.
export function slugify(s) {
  return String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

function safeUrl(u) {
  const url = String(u || "").trim();
  return /^(https?:\/\/|\/|#|mailto:)/i.test(url) ? url : "#";
}

// Inline Markdown on already-escaped text: links, images, bold, italic, code.
// `media` is the address of the article's own folder, for relative paths.
function inline(text, media) {
  const abs = (url) => {
    const u = url.replace(/&amp;/g, "&");
    return media && !/^(https?:|\/|#|mailto:)/i.test(u) ? media + u.replace(/^\.\//, "") : safeUrl(u);
  };
  let t = esc(text);
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => `<img src="${esc(abs(url))}" alt="${alt}" loading="lazy">`);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const href = abs(url);
    const ext = /^https?:/i.test(href) ? ' target="_blank" rel="noopener nofollow"' : "";
    return `<a href="${esc(href)}"${ext}>${label}</a>`;
  });
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[\s(>])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return t;
}

// The Markdown the articles use: headings, paragraphs, lists, quotes, rules,
// tables, images with a caption. With opts.html a block starting with a tag
// (a box written in the article) passes through as it is: only for our own
// files. Anything else written as HTML is shown as text.
export function renderMarkdown(md, opts = {}) {
  const media = opts.media || "";
  const il = (t) => inline(t, media);
  const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let para = [];
  let list = null; // { tag, items }
  let quote = [];
  const flushPara = () => { if (para.length) { out.push("<p>" + il(para.join(" ")) + "</p>"); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>` + list.items.map((i) => "<li>" + il(i) + "</li>").join("") + `</${list.tag}>`); list = null; } };
  const flushQuote = () => { if (quote.length) { out.push("<blockquote><p>" + il(quote.join(" ")) + "</p></blockquote>"); quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };
  const isRow = (l) => /^\|.*\|$/.test(String(l || "").trim());
  const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n].trimEnd();
    let m;
    if (!line.trim()) { flushAll(); continue; }
    if (opts.html && /^<(div|figure|details|table|section|aside)\b/i.test(line)) {
      flushAll();
      const block = [];
      while (n < lines.length && lines[n].trim()) { block.push(lines[n]); n++; }
      out.push(block.join("\n"));
      continue;
    }
    if (isRow(line) && /^\|[\s:|-]+\|$/.test(String(lines[n + 1] || "").trim())) {
      flushAll();
      const head = cells(line);
      const rows = [];
      n += 2;
      while (n < lines.length && isRow(lines[n])) { rows.push(cells(lines[n])); n++; }
      n--;
      out.push('<div class="table-scroll"><table><thead><tr>' + head.map((c) => "<th>" + il(c) + "</th>").join("") + "</tr></thead><tbody>" +
        rows.map((row) => "<tr>" + row.map((c) => "<td>" + il(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>");
      continue;
    }
    if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) {
      flushAll();
      const level = Math.min(4, Math.max(2, m[1].length)); // the page title is the only h1
      out.push(`<h${level} id="${esc(slugify(m[2]))}">${il(m[2])}</h${level}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { flushAll(); out.push("<hr>"); continue; }
    if ((m = /^>\s?(.*)$/.exec(line))) { flushPara(); flushList(); quote.push(m[1]); continue; }
    if ((m = /^\s*[-*]\s+(.*)$/.exec(line))) {
      flushPara(); flushQuote();
      if (!list || list.tag !== "ul") { flushList(); list = { tag: "ul", items: [] }; }
      list.items.push(m[1]);
      continue;
    }
    if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) {
      flushPara(); flushQuote();
      if (!list || list.tag !== "ol") { flushList(); list = { tag: "ol", items: [] }; }
      list.items.push(m[1]);
      continue;
    }
    flushList(); flushQuote();
    para.push(line.trim());
  }
  flushAll();
  // An image followed by a line in italics is a figure with its caption.
  return out.join("\n").replace(/<p>(<img [^>]+>)\s*<em>([\s\S]*?)<\/em><\/p>/g, "<figure>$1<figcaption>$2</figcaption></figure>");
}

function readHeader(text) {
  let src = String(text || "").replace(/\r\n/g, "\n");
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src);
  const meta = {};
  if (!m) return { meta, body: src };
  m[1].split("\n").forEach((line) => {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  });
  return { meta, body: m[2] };
}

const capital = (s) => { const t = String(s || "").trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; };
const dirDate = (name) => (/^(\d{4}-\d{2}-\d{2})-/.exec(name) || [])[1] || "";
const dirSlug = (name) => slugify(String(name).replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/i, ""));

function article(fields) {
  const category = capital(fields.category || "Generale");
  const plain = String(fields.plain || "").replace(/\s+/g, " ").trim();
  return {
    slug: fields.slug,
    title: fields.title || fields.slug,
    date: /^\d{4}-\d{2}-\d{2}/.test(fields.date || "") ? fields.date.slice(0, 10) : "",
    category,
    categorySlug: slugify(category),
    excerpt: fields.excerpt || plain.slice(0, 180) + (plain.length > 180 ? "…" : ""),
    cover: fields.cover || "",
    coverCredit: fields.coverCredit || "",
    minutes: Math.max(1, Math.round(plain.split(" ").length / 200)),
    html: fields.html || "",
    style: fields.style || "",
    dir: fields.dir || ""
  };
}

// name: the file or folder name; media: where the article's own files are served.
export function parseArticle(name, text, media = "") {
  const { meta, body } = readHeader(text);
  const title = meta.title || meta.titolo || "";
  // The first heading repeats the title: the page already shows it.
  const text2 = body.replace(/^\s*#\s+[^\n]*\n/, "");
  const cover = meta.cover ? (/^(https?:|\/)/i.test(meta.cover) ? safeUrl(meta.cover) : (media ? media + meta.cover : "")) : "";
  return article({
    slug: slugify(meta.slug || "") || dirSlug(name),
    title,
    date: meta.date || dirDate(name),
    category: meta.category || meta.categoria,
    excerpt: meta.description || meta.excerpt || meta.riassunto || "",
    cover,
    coverCredit: meta.cover_credit || "",
    plain: text2.replace(/<[^>]+>/g, " ").replace(/[#>*_`\[\]()!|-]/g, " "),
    html: renderMarkdown(text2, { html: true, media })
  });
}

// An article that exists only as a finished page: its <main>, without the
// parts the site's page already has, and its styles limited to .legacy-post.
export function parseHtmlArticle(name, html) {
  const src = String(html || "");
  const main = (/<main[^>]*>([\s\S]*?)<\/main>/i.exec(src) || [])[1] || "";
  if (!main) return null;
  const pick = (re) => { const m = re.exec(main); return m ? m[1].replace(/<[^>]+>/g, "").trim() : ""; };
  const title = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const lede = pick(/<p class="lede">([\s\S]*?)<\/p>/i);
  const crumb = pick(/<div class="crumb">([\s\S]*?)<\/div>/i).split("·").map((x) => x.trim()).filter(Boolean);
  const body = main
    .replace(/<div class="crumb">[\s\S]*?<\/div>/i, "")
    .replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, "")
    .replace(/<div class="meta">[\s\S]*?<\/div>/i, "")
    .replace(/<p class="lede">[\s\S]*?<\/p>/i, "")
    .replace(/<p class="cap">[^<]*provvisori[^<]*<\/p>/i, "");
  const css = (/<style[^>]*>([\s\S]*?)<\/style>/i.exec(src) || [])[1] || "";
  const scoped = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\})\s*([^@{}]+)\{/g, (all, close, sel) => {
      const list = sel.split(",").map((one) => {
        const x = one.trim();
        if (!x) return "";
        if (x === ":root" || x === "body" || x === "html") return ".legacy-post";
        if (x === "*" || /^\.site\b/.test(x) || /^(header|footer|nav)\b/.test(x)) return "";
        return ".legacy-post " + x;
      }).filter(Boolean);
      return close + (list.length ? list.join(",") : ".legacy-post .never") + "{";
    });
  return article({
    slug: dirSlug(name),
    title,
    date: dirDate(name),
    category: crumb[1] || "Generale",
    excerpt: lede,
    plain: body.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " "),
    html: '<div class="legacy-post">' + body + "</div>",
    style: scoped
  });
}

// lang: the article in that language when the folder has it (article.<lang>.md),
// otherwise the English one, otherwise the Italian one.
export async function loadArticles({ contentDir, siteDir }, now = new Date(), lang = "it") {
  const today = now.toISOString().slice(0, 10);
  const list = [];
  // written: the language the text is really in (the visitor's, or the one it fell back to).
  const add = (a, dir, written) => { if (a && a.slug && (!a.date || a.date <= today) && !list.some((x) => x.slug === a.slug)) { a.dir = dir || a.slug; a.lang = written || "it"; list.push(a); } };
  const order = [...new Set([lang, lang === "it" ? "it" : "en", "it"])];
  const first = async (dir, stem, ext) => {
    for (const l of order) { const t = await read(path.join(dir, stem + "." + l + "." + ext)); if (t) return { text: t, lang: l }; }
    const t = await read(path.join(dir, stem + "." + ext));
    return t ? { text: t, lang: "it" } : null;
  };
  const read = (file) => fs.readFile(file, "utf8").catch(() => null);

  let folders = [];
  try { folders = (await fs.readdir(contentDir, { withFileTypes: true })).filter((d) => d.isDirectory() && !d.name.startsWith("_")).map((d) => d.name); } catch (_) {}
  for (const name of folders) {
    try {
      const dir = path.join(contentDir, name);
      const md = await first(dir, "article", "md");
      if (md) { add(parseArticle(name, md.text, "/blog-media/" + encodeURIComponent(name) + "/"), name, md.lang); continue; }
      const page = await first(dir, "index", "html");
      if (page) add(parseHtmlArticle(name, page.text), name, page.lang);
    } catch (err) { console.warn("BLOG_ARTICLE", name, err && err.message); }
  }

  let files = [];
  try { files = (await fs.readdir(siteDir)).filter((f) => /\.md$/i.test(f) && !f.startsWith("_")); } catch (_) {}
  for (const f of files) {
    try { add(parseArticle(f, await fs.readFile(path.join(siteDir, f), "utf8")), f); }
    catch (err) { console.warn("BLOG_ARTICLE", f, err && err.message); }
  }
  return list.sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title));
}

function dateText(iso, lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "";
  try { return new Intl.DateTimeFormat(SITE_LOCALES[lang] || "it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))); }
  catch (_) { return iso; }
}

function cardHtml(a, lang = "it", dict = null) {
  return `<a class="post-card" href="${langPrefix(lang)}/blog/${esc(a.slug)}">` +
    (a.cover ? `<img src="${esc(a.cover)}" alt="" loading="lazy">` : `<div class="post-cover-empty" aria-hidden="true">${esc(a.category)}</div>`) +
    `<div class="post-card-body" data-notr><div class="eyebrow">${esc(a.category)}</div><h3>${esc(a.title)}</h3><p>${esc(a.excerpt)}</p>` +
    `<div class="post-meta">${esc(dateText(a.date, lang))}${a.date ? " · " : ""}${esc(st(dict, "{0} min di lettura", a.minutes))}</div></div><!--/notr--></a>`;
}

function categoriesHtml(articles, active, lang, dict) {
  const seen = new Map();
  articles.forEach((a) => { if (!seen.has(a.categorySlug)) seen.set(a.categorySlug, a.category); });
  if (seen.size < 2) return "";
  const base = langPrefix(lang) + "/blog";
  const chip = (href, label, on) => `<a class="chip${on ? " on" : ""}" href="${href}">${esc(label)}</a>`;
  return '<nav class="chips" aria-label="Categorie">' + chip(base, st(dict, "Tutti"), !active) +
    '<span data-notr>' + [...seen].sort((a, b) => a[1].localeCompare(b[1])).map(([slug, name]) => chip(base + "/categoria/" + encodeURIComponent(slug), name, active === slug)).join("") + "</span><!--/notr--></nav>";
}

// mountBlog(app, { contentDir, siteDir, shell, staticFiles })
// shell(req, { title, description, main, ogImage }) returns the full page;
// staticFiles(dir) is express.static, passed in so this file needs no import of it.
export function mountBlog(app, { contentDir, siteDir, shell, staticFiles }) {
  const cache = new Map(); // lang -> { at, list }
  async function articles(lang = "it") {
    const hit = cache.get(lang);
    if (hit && Date.now() - hit.at < 60 * 1000) return hit.list;
    const list = await loadArticles({ contentDir, siteDir: path.join(siteDir, "blog") }, new Date(), lang);
    cache.set(lang, { at: Date.now(), list });
    return list;
  }
  // Only the images of an article are public, not its notes or drafts.
  if (staticFiles) {
    app.use("/blog-media", (req, res, next) => (/^\/[^/]+\/images\/[^/]+\.(jpe?g|png|webp|svg|gif)$/i.test(decodeURIComponent(req.path)) ? next() : res.status(404).end()), staticFiles(contentDir));
  }
  const send = async (req, res, page, status = 200) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(status).type("html").send(await shell(req, page));
  };
  const langOf = (req) => langOfPath(req.path);
  // The same page in every language, for the language menu and for search engines.
  const everyLang = (tail) => Object.fromEntries(SITE_LANGS.map((l) => [l, langPrefix(l) + tail]));
  const listPage = (list, all, active, heading, lead, lang, dict, ownText) =>
    `<section class="blog"><div class="wrap"><div class="head"><div class="eyebrow">Blog</div><h1 class="blog-title"${ownText ? " data-notr" : ""}>${esc(heading)}</h1>${ownText ? "<!--/notr-->" : ""}<p class="lead">${esc(lead)}</p></div>` +
    categoriesHtml(all, active, lang, dict) +
    (list.length ? `<div class="posts">${list.map((a) => cardHtml(a, lang, dict)).join("")}</div>` : '<p class="lead">Ancora nessun articolo in questa sezione.</p>') +
    "</div></section>";

  const index = async (req, res) => {
    const lang = langOf(req);
    const dict = await siteDict(siteDir, lang);
    const all = await articles(lang);
    return send(req, res, { lang, alternates: everyLang("/blog"), title: "Blog — Nurvan", description: "Allenamento, alimentazione e recupero: gli articoli di Nurvan.", main: listPage(all, all, "", "Idee per allenarti meglio", "Allenamento, alimentazione, recupero e gare: articoli da mettere in pratica, con le fonti.", lang, dict) });
  };
  const category = async (req, res) => {
    const lang = langOf(req);
    const dict = await siteDict(siteDir, lang);
    const all = await articles(lang);
    const slug = slugify(req.params.cat);
    const list = all.filter((a) => a.categorySlug === slug);
    if (!list.length) return send(req, res, { lang, title: "Categoria non trovata — Nurvan", description: "", main: listPage([], all, slug, "Categoria non trovata", "Torna a tutti gli articoli.", lang, dict) }, 404);
    return send(req, res, { lang, ownTitle: true, title: st(dict, "{0} — Blog Nurvan", list[0].category), description: st(dict, "Articoli su {0}.", list[0].category), main: listPage(list, all, slug, list[0].category, st(dict, "Tutti gli articoli su {0}.", list[0].category.toLowerCase()), lang, dict, true) });
  };
  const one = async (req, res) => {
    const lang = langOf(req);
    const dict = await siteDict(siteDir, lang);
    const all = await articles(lang);
    const a = all.find((x) => x.slug === slugify(req.params.slug));
    if (!a) return send(req, res, { lang, title: "Articolo non trovato — Nurvan", description: "", main: listPage(all.slice(0, 6), all, "", "Articolo non trovato", "Forse cercavi uno di questi.", lang, dict) }, 404);
    // The same article in the other languages: found by its folder.
    // For search engines only the languages it is really written in; the
    // language menu reaches it in every language (the text falls back to
    // English, the page around it is in that language).
    const alternates = {};
    const menu = {};
    for (const l of SITE_LANGS) {
      const other = l === lang ? a : (await articles(l)).find((x) => x.dir === a.dir);
      if (!other) continue;
      menu[l] = langPrefix(l) + "/blog/" + other.slug;
      if (other.lang === l) alternates[l] = menu[l];
    }
    const base = langPrefix(lang) + "/blog";
    const more = all.filter((x) => x.slug !== a.slug).sort((x, y) => (y.categorySlug === a.categorySlug) - (x.categorySlug === a.categorySlug)).slice(0, 3);
    const main = (a.style ? `<style>${a.style}</style>` : "") +
      `<article class="post"><div class="wrap narrow">` +
      `<a class="back" href="${base}">← Tutti gli articoli</a>` +
      `<a class="eyebrow" href="${base}/categoria/${encodeURIComponent(a.categorySlug)}" data-notr>${esc(a.category)}</a><!--/notr-->` +
      `<div data-notr><h1 class="blog-title">${esc(a.title)}</h1>` +
      (a.excerpt ? `<p class="lead">${esc(a.excerpt)}</p>` : "") +
      `<div class="post-meta">${esc(dateText(a.date, lang))}${a.date ? " · " : ""}${esc(st(dict, "{0} min di lettura", a.minutes))}</div>` +
      (a.cover ? `<figure class="post-cover"><img src="${esc(a.cover)}" alt="">${a.coverCredit ? `<figcaption>${esc(st(dict, "Foto: {0}", a.coverCredit.replace(/\s*\(https?:[^)]*\)/g, "")))}</figcaption>` : ""}</figure>` : "") +
      `<div class="prose">${a.html}</div></div><!--/notr-->` +
      `<div class="post-cta"><strong>Mettilo in pratica con Nurvan.</strong><a class="btn primary" href="{{APP_URL}}">Apri l'app</a></div>` +
      `<p class="post-wait"><a href="${waitlistPath(lang)}">Entra nella lista d'attesa di Nurvan →</a></p>` +
      `</div></article>` +
      (more.length ? `<section class="blog"><div class="wrap"><div class="head"><h2>Continua a leggere</h2></div><div class="posts">${more.map((x) => cardHtml(x, lang, dict)).join("")}</div></div></section>` : "");
    return send(req, res, { lang, alternates, menu, title: `${a.title} — Nurvan`, ownTitle: true, description: a.excerpt, main, ogImage: a.cover });
  };
  for (const base of SITE_LANGS.map(langPrefix)) {
    app.get(base + "/blog", index);
    app.get(base + "/blog/categoria/:cat", category);
    app.get(base + "/blog/:slug", one);
  }

  return { articles, cardHtml };
}
