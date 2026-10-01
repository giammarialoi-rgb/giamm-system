// The site in more languages.
//
// The pages are written in Italian (site/*.html and the texts in the server
// code). Every other language has site/i18n/<lang>.json: Italian text ->
// translation. A page is built in Italian and then its texts are replaced,
// so a new section of the site needs no change here: only its texts in the
// language files (tools/site_i18n.mjs lists what is missing).
//
// Addresses: Italian at "/", the others under "/<lang>/" ("/en/", "/en/blog").
import fs from "node:fs/promises";
import path from "node:path";

export const SITE_LANGS = ["it", "en", "es", "fr", "de", "pt", "ru", "zh", "ar", "hi"];
export const SITE_LANG_NAMES = {
  it: "Italiano", en: "English", es: "Español", fr: "Français", de: "Deutsch",
  pt: "Português", ru: "Русский", zh: "中文", ar: "العربية", hi: "हिन्दी"
};
export const SITE_LOCALES = { it: "it-IT", en: "en-GB", es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-BR", ru: "ru-RU", zh: "zh-CN", ar: "ar", hi: "hi-IN" };

export const isSiteLang = (l) => SITE_LANGS.includes(l);
export const langPrefix = (lang) => (lang && lang !== "it" ? "/" + lang : "");
// "/en/blog/x" -> "en"; "/blog/x" -> "it". The preview lives under "/sito".
export function langOfPath(p) {
  const seg = String(p || "").replace(/^\/sito(?=\/|$)/, "").split("/")[1] || "";
  return seg !== "it" && SITE_LANGS.includes(seg) ? seg : "it";
}

const cache = new Map(); // lang -> { at, dict }
export async function siteDict(siteDir, lang) {
  if (!lang || lang === "it") return null;
  const hit = cache.get(lang);
  if (hit && Date.now() - hit.at < 60 * 1000) return hit.dict;
  let dict = {};
  try { dict = JSON.parse(await fs.readFile(path.join(siteDir, "i18n", lang + ".json"), "utf8")); } catch (_) {}
  cache.set(lang, { at: Date.now(), dict });
  return dict;
}

// One text, with values: st(dict, "{0} min di lettura", 5).
export function st(dict, text, ...values) {
  const out = dict && Object.prototype.hasOwnProperty.call(dict, text) ? dict[text] : text;
  return values.length ? out.replace(/\{(\d+)\}/g, (_, n) => (values[n] == null ? "" : String(values[n]))) : out;
}

const squash = (s) => s.replace(/\s+/g, " ").trim();
const ATTR_RE = /\b(alt|aria-label|title|placeholder|content)="([^"]*)"/g;

// The texts of a page: what is between the tags and the attributes a person
// reads. Scripts, styles and anything inside data-notr are left out.
export function pageTexts(html) {
  const found = new Set();
  walkTexts(html, (text) => { found.add(text); return null; });
  return [...found];
}

function walkTexts(html, replace) {
  // Blocks that are not text, or not ours to translate (an article's body).
  const kept = [];
  let src = String(html).replace(/<(script|style)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->|<([a-z0-9]+)\b[^>]*\bdata-notr\b[^>]*>[\s\S]*?<!--\/notr-->/gi, (m) => { kept.push(m); return "\u0000" + (kept.length - 1) + "\u0000"; });
  const one = (raw, inAttr) => {
    const core = squash(raw).replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    if (!core || !/[A-Za-zÀ-ÿ]{2,}/.test(core) || /^\{\{[A-Z_]+\}\}$/.test(core)) return raw;
    const out = replace(core);
    if (out == null || out === core) return raw;
    const safe = String(out).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, inAttr ? "&quot;" : '"');
    return raw.replace(/^(\s*)[\s\S]*?(\s*)$/, (_, a, b) => a + safe + b);
  };
  src = src.replace(/<[^>]+>/g, (tag) => tag.replace(ATTR_RE, (all, name, value) => {
    if (name === "content" && !/\b(name|property)="(description|og:title|og:description)"/.test(tag)) return all;
    return name + '="' + one(value, true) + '"';
  }));
  src = src.replace(/>([^<>]+)</g, (all, text) => ">" + one(text) + "<");
  return src.replace(/\u0000(\d+)\u0000/g, (_, i) => kept[Number(i)]);
}

export function translateHtml(html, dict) {
  if (!dict) return html;
  return walkTexts(html, (text) => (Object.prototype.hasOwnProperty.call(dict, text) ? dict[text] : null));
}

// The language a visitor's browser asks for, among the ones the site has.
export function preferredLang(header) {
  const list = String(header || "").split(",").map((p) => p.trim().slice(0, 2).toLowerCase());
  for (const l of list) if (isSiteLang(l)) return l;
  return "it";
}
