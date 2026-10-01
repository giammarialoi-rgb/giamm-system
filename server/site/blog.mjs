// The site's blog. One Markdown file per article in site/blog/, with a small
// header between two "---" lines:
//
//   ---
//   title: Come scegliere il carico giusto
//   date: 2026-10-01
//   category: Allenamento
//   excerpt: Una riga che riassume l'articolo.
//   cover: /site-assets/blog/carico.jpg        (optional)
//   source: https://example.org/original       (optional, shown as "Fonte")
//   ---
//
// The file name is the address: site/blog/carico-giusto.md -> /blog/carico-giusto.
// Adding an article is adding a file; nothing else has to change. Articles
// dated in the future stay hidden until that day.
import fs from "node:fs/promises";
import path from "node:path";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function slugify(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function safeUrl(u) {
  const url = String(u || "").trim();
  return /^(https?:\/\/|\/|#|mailto:)/i.test(url) ? url : "#";
}

// Inline Markdown on already-escaped text: links, images, bold, italic, code.
function inline(text) {
  let t = esc(text);
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => `<img src="${esc(safeUrl(url.replace(/&amp;/g, "&")))}" alt="${alt}" loading="lazy">`);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const href = safeUrl(url.replace(/&amp;/g, "&"));
    const ext = /^https?:/i.test(href) ? ' target="_blank" rel="noopener nofollow"' : "";
    return `<a href="${esc(href)}"${ext}>${label}</a>`;
  });
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return t;
}

// A small Markdown subset, enough for articles: headings, paragraphs, lists,
// quotes, rules. Raw HTML in the source is shown as text, never run.
export function renderMarkdown(md) {
  const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let para = [];
  let list = null; // { tag, items }
  let quote = [];
  const flushPara = () => { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>` + list.items.map((i) => "<li>" + inline(i) + "</li>").join("") + `</${list.tag}>`); list = null; } };
  const flushQuote = () => { if (quote.length) { out.push("<blockquote><p>" + inline(quote.join(" ")) + "</p></blockquote>"); quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushAll(); continue; }
    if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) {
      flushAll();
      const level = Math.min(4, m[1].length + 1); // "#" is h2: the page title is the h1
      out.push(`<h${level} id="${esc(slugify(m[2]))}">${inline(m[2])}</h${level}>`);
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
  return out.join("\n");
}

export function parseArticle(file, text) {
  const src = String(text || "").replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src);
  const meta = {};
  let body = src;
  if (m) {
    body = m[2];
    m[1].split("\n").forEach((line) => {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    });
  }
  const slug = slugify(path.basename(file).replace(/\.md$/i, ""));
  const date = /^\d{4}-\d{2}-\d{2}/.test(meta.date || "") ? meta.date.slice(0, 10) : "";
  const category = meta.category || meta.categoria || "Generale";
  const plain = body.replace(/[#>*_`\[\]()!-]/g, " ").replace(/\s+/g, " ").trim();
  return {
    slug,
    title: meta.title || meta.titolo || slug,
    date,
    category,
    categorySlug: slugify(category),
    excerpt: meta.excerpt || meta.riassunto || plain.slice(0, 180) + (plain.length > 180 ? "…" : ""),
    cover: meta.cover ? safeUrl(meta.cover) : "",
    source: meta.source || meta.fonte ? safeUrl(meta.source || meta.fonte) : "",
    minutes: Math.max(1, Math.round(plain.split(" ").length / 200)),
    html: renderMarkdown(body)
  };
}

export async function loadArticles(dir, now = new Date()) {
  let files = [];
  try { files = (await fs.readdir(dir)).filter((f) => /\.md$/i.test(f) && !f.startsWith("_")); } catch (_) { return []; }
  const today = now.toISOString().slice(0, 10);
  const list = [];
  for (const f of files) {
    try {
      const a = parseArticle(f, await fs.readFile(path.join(dir, f), "utf8"));
      if (a.slug && (!a.date || a.date <= today)) list.push(a);
    } catch (err) { console.warn("BLOG_ARTICLE", f, err && err.message); }
  }
  return list.sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title));
}

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
function dateIt(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "";
}

function cardHtml(a) {
  return `<a class="post-card" href="/blog/${esc(a.slug)}">` +
    (a.cover ? `<img src="${esc(a.cover)}" alt="" loading="lazy">` : `<div class="post-cover-empty" aria-hidden="true">${esc(a.category)}</div>`) +
    `<div class="post-card-body"><div class="eyebrow">${esc(a.category)}</div><h3>${esc(a.title)}</h3><p>${esc(a.excerpt)}</p>` +
    `<div class="post-meta">${esc(dateIt(a.date))}${a.date ? " · " : ""}${a.minutes} min di lettura</div></div></a>`;
}

function categoriesHtml(articles, active) {
  const seen = new Map();
  articles.forEach((a) => { if (!seen.has(a.categorySlug)) seen.set(a.categorySlug, a.category); });
  if (seen.size < 2) return "";
  const chip = (href, label, on) => `<a class="chip${on ? " on" : ""}" href="${href}">${esc(label)}</a>`;
  return '<nav class="chips" aria-label="Categorie">' + chip("/blog", "Tutti", !active) +
    [...seen].sort((a, b) => a[1].localeCompare(b[1])).map(([slug, name]) => chip("/blog/categoria/" + slug, name, active === slug)).join("") + "</nav>";
}

// mountBlog(app, { siteDir, shell }) - shell(req, { title, description, main, ogImage }) returns the full page.
export function mountBlog(app, { siteDir, shell }) {
  const dir = path.join(siteDir, "blog");
  let cache = { at: 0, list: [] };
  async function articles() {
    if (Date.now() - cache.at > 60 * 1000) cache = { at: Date.now(), list: await loadArticles(dir) };
    return cache.list;
  }
  const send = async (req, res, page, status = 200) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(status).type("html").send(await shell(req, page));
  };
  const listPage = (list, all, active, heading, lead) =>
    `<section class="blog"><div class="wrap"><div class="head"><div class="eyebrow">Blog</div><h1 class="blog-title">${esc(heading)}</h1><p class="lead">${esc(lead)}</p></div>` +
    categoriesHtml(all, active) +
    (list.length ? `<div class="posts">${list.map(cardHtml).join("")}</div>` : '<p class="lead">Ancora nessun articolo in questa sezione.</p>') +
    "</div></section>";

  app.get("/blog", async (req, res) => {
    const all = await articles();
    return send(req, res, { title: "Blog — Nurvan", description: "Allenamento, alimentazione e recupero: gli articoli di Nurvan.", main: listPage(all, all, "", "Idee per allenarti meglio", "Allenamento, alimentazione, recupero e gare: articoli brevi, da mettere in pratica.") });
  });

  app.get("/blog/categoria/:cat", async (req, res) => {
    const all = await articles();
    const slug = slugify(req.params.cat);
    const list = all.filter((a) => a.categorySlug === slug);
    if (!list.length) return send(req, res, { title: "Categoria non trovata — Nurvan", description: "", main: listPage([], all, slug, "Categoria non trovata", "Torna a tutti gli articoli.") }, 404);
    return send(req, res, { title: `${list[0].category} — Blog Nurvan`, description: `Articoli su ${list[0].category}.`, main: listPage(list, all, slug, list[0].category, `Tutti gli articoli su ${list[0].category.toLowerCase()}.`) });
  });

  app.get("/blog/:slug", async (req, res) => {
    const all = await articles();
    const a = all.find((x) => x.slug === slugify(req.params.slug));
    if (!a) return send(req, res, { title: "Articolo non trovato — Nurvan", description: "", main: listPage(all.slice(0, 6), all, "", "Articolo non trovato", "Forse cercavi uno di questi.") }, 404);
    const more = all.filter((x) => x.slug !== a.slug && x.categorySlug === a.categorySlug).slice(0, 3);
    const main = `<article class="post"><div class="wrap narrow">` +
      `<a class="back" href="/blog">← Tutti gli articoli</a>` +
      `<a class="eyebrow" href="/blog/categoria/${esc(a.categorySlug)}">${esc(a.category)}</a>` +
      `<h1 class="blog-title">${esc(a.title)}</h1>` +
      `<div class="post-meta">${esc(dateIt(a.date))}${a.date ? " · " : ""}${a.minutes} min di lettura</div>` +
      (a.cover ? `<img class="post-cover" src="${esc(a.cover)}" alt="">` : "") +
      `<div class="prose">${a.html}</div>` +
      (a.source && a.source !== "#" ? `<p class="post-source">Fonte: <a href="${esc(a.source)}" target="_blank" rel="noopener nofollow">${esc(a.source.replace(/^https?:\/\/(www\.)?/, "").split("/")[0])}</a></p>` : "") +
      `<div class="post-cta"><strong>Mettilo in pratica con Nurvan.</strong><a class="btn primary" href="{{APP_URL}}">Apri l'app</a></div>` +
      `</div></article>` +
      (more.length ? `<section class="blog"><div class="wrap"><div class="head"><h2>Altri articoli su ${esc(a.category.toLowerCase())}</h2></div><div class="posts">${more.map(cardHtml).join("")}</div></div></section>` : "");
    return send(req, res, { title: `${a.title} — Nurvan`, description: a.excerpt, main, ogImage: a.cover });
  });

  return { articles, cardHtml };
}
