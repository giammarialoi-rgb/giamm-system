// What search engines and the apps that show a link's preview read from a
// page: Open Graph and Twitter Card tags, and JSON-LD structured data.
//
// The structured data only says what the page shows: the FAQ is taken from
// the questions and answers written in the page itself (faqFromDetails,
// faqFromArticle), never from a separate list.
import { SITE_LANGS, SITE_LOCALES } from "./i18n.mjs";

export const DEFAULT_OG_IMAGE = { path: "/site-assets/og-nurvan.png", width: 1200, height: 630, alt: "Nurvan: allenamento, alimentazione e coaching in un’unica app" };
export const INSTAGRAM_APP = "https://www.instagram.com/nurvan.app";

const escAttr = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function absUrl(origin, u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return origin + (s.startsWith("/") ? s : "/" + s);
}
const ogLocale = (lang) => String(SITE_LOCALES[lang] || "it-IT").replace("-", "_");

// Width and height of a JPEG, PNG or WebP from its first bytes ("" when unknown).
export function imageSize(buf) {
  try {
    if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
    if (buf.length > 30 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") {
      const kind = buf.toString("latin1", 12, 16);
      if (kind === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      if (kind === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (kind === "VP8L") { const b = buf.readUInt32LE(21); return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }; }
    }
  } catch (_) { /* unknown size */ }
  return null;
}

// All the social tags of a page. page.og: { type, image, imageAlt, imageWidth,
// imageHeight, published, modified, author, section }.
export function metaTags({ origin, lang, title, description, alternates, url, og = {} }) {
  const tag = (attr, name, value) => (value === undefined || value === null || value === "" ? "" : `<meta ${attr}="${name}" content="${escAttr(value)}">`);
  const image = og.image ? absUrl(origin, og.image) : origin + DEFAULT_OG_IMAGE.path;
  const isDefault = !og.image;
  const alt = og.imageAlt || (isDefault ? DEFAULT_OG_IMAGE.alt : title);
  const width = isDefault ? DEFAULT_OG_IMAGE.width : og.imageWidth;
  const height = isDefault ? DEFAULT_OG_IMAGE.height : og.imageHeight;
  const type = og.type || "website";
  const others = alternates ? SITE_LANGS.filter((l) => l !== lang && alternates[l]) : [];
  return [
    tag("property", "og:title", title),
    tag("property", "og:description", description),
    tag("property", "og:type", type),
    tag("property", "og:url", url),
    tag("property", "og:site_name", "Nurvan"),
    tag("property", "og:locale", ogLocale(lang)),
    ...others.map((l) => tag("property", "og:locale:alternate", ogLocale(l))),
    tag("property", "og:image", image),
    tag("property", "og:image:width", width),
    tag("property", "og:image:height", height),
    tag("property", "og:image:alt", alt),
    type === "article" ? tag("property", "article:published_time", og.published) : "",
    type === "article" ? tag("property", "article:modified_time", og.modified) : "",
    type === "article" ? tag("property", "article:author", og.author) : "",
    type === "article" ? tag("property", "article:section", og.section) : "",
    tag("name", "twitter:card", "summary_large_image"),
    tag("name", "twitter:title", title),
    tag("name", "twitter:description", description),
    tag("name", "twitter:image", image),
    tag("name", "twitter:image:alt", alt)
  ].filter(Boolean).join("\n");
}

// Each object a <script type="application/ld+json">; "<" is escaped so nothing in
// the text can close the script.
export function jsonLdScripts(list) {
  return (list || []).filter(Boolean).map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
}

/* ------------------------------ the objects ----------------------------- */

export const organizationLd = (origin) => ({
  "@context": "https://schema.org", "@type": "Organization", "@id": origin + "/#organization",
  name: "Nurvan", url: origin + "/", logo: origin + "/icon-512.png",
  sameAs: [INSTAGRAM_APP]
});
export const websiteLd = (origin, lang) => ({
  "@context": "https://schema.org", "@type": "WebSite", "@id": origin + "/#website",
  name: "Nurvan", url: origin + "/", inLanguage: lang, publisher: { "@id": origin + "/#organization" }
});
export const softwareLd = (origin, description) => ({
  "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Nurvan", url: origin + "/",
  applicationCategory: "HealthApplication", operatingSystem: "Web, iOS, Android", description,
  image: origin + "/icon-512.png",
  offers: { "@type": "Offer", name: "Free", price: "0", priceCurrency: "EUR" }
});
export const faqLd = (items) => (items && items.length >= 1 ? {
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: items.map((q) => ({ "@type": "Question", name: q.q, acceptedAnswer: { "@type": "Answer", text: q.a } }))
} : null);
export const breadcrumbLd = (crumbs) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url }))
});
export const personLd = ({ origin, author, url, jobTitle, image, sameAs, knowsAbout, credential }) => ({
  "@context": "https://schema.org", "@type": "Person", "@id": url + "#person", name: author.name, url, jobTitle, image,
  sameAs, knowsAbout, worksFor: { "@id": origin + "/#organization" },
  ...(credential ? { hasCredential: { "@type": "EducationalOccupationalCredential", name: credential } } : {})
});
export const blogPostingLd = ({ origin, lang, url, headline, description, image, authorUrl, authorName, published, modified }) => ({
  "@context": "https://schema.org", "@type": "BlogPosting", mainEntityOfPage: { "@type": "WebPage", "@id": url },
  headline, description, ...(image ? { image: [image] } : {}),
  author: { "@type": "Person", name: authorName, url: authorUrl },
  publisher: { "@type": "Organization", name: "Nurvan", url: origin + "/", logo: { "@type": "ImageObject", url: origin + "/icon-512.png" } },
  ...(published ? { datePublished: published } : {}), ...((modified || published) ? { dateModified: modified || published } : {}),
  inLanguage: lang
});

/* ------------------------- the FAQ the page shows ------------------------ */

const plain = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

// The <details><summary>question</summary><p>answer</p></details> of the home.
export function faqFromDetails(html) {
  const out = [];
  for (const m of String(html).matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g)) {
    const q = plain(m[1]); const a = plain(m[2]);
    if (q && a) out.push({ q, a });
  }
  return out;
}

// The section of an article made of questions (h3 ending with "?") and their
// answers, whatever the language of its heading.
export function faqFromArticle(html) {
  const sections = String(html).split(/<h2\b/).slice(1);
  for (const sec of sections) {
    const parts = sec.split(/<h3\b[^>]*>/).slice(1);
    if (parts.length < 2) continue;
    const items = parts.map((p) => {
      const end = p.indexOf("</h3>");
      return { q: plain(p.slice(0, end)), a: plain(p.slice(end + 5).replace(/<\/?(ul|ol)>/g, " ")) };
    });
    if (items.every((i) => /[?？؟]$/.test(i.q) && i.a)) return items;
  }
  return [];
}
