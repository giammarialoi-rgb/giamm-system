// Texts the server writes for a person (emails) in that person's language.
// The translations are the app's own (web/i18n/<lang>.json: Italian text ->
// translation, built by tools/i18n_pack.mjs); Italian is the source.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "web", "i18n");
export const SERVER_LANGS = ["it", "en", "es", "fr", "de", "pt", "ru", "zh", "ar", "hi"];
const cache = new Map();

function pack(lang) {
  if (!cache.has(lang)) {
    let dict = {};
    try { dict = JSON.parse(fs.readFileSync(path.join(DIR, lang + ".json"), "utf8")); } catch (_) {}
    cache.set(lang, dict);
  }
  return cache.get(lang);
}

// tr("Conferma la tua email") in the given language; the Italian text when
// there is no translation.
export function serverTr(lang) {
  if (!lang || lang === "it" || !SERVER_LANGS.includes(lang)) return (text) => text;
  const dict = pack(lang);
  return (text) => (Object.prototype.hasOwnProperty.call(dict, text) ? dict[text] : text);
}

// The language of whoever is making the request: what the app says
// (body.lang), otherwise the first language of the browser that we have.
export function reqLang(req) {
  const asked = String((req && req.body && req.body.lang) || "").slice(0, 2).toLowerCase();
  if (SERVER_LANGS.includes(asked)) return asked;
  const header = String((req && req.headers && req.headers["accept-language"]) || "");
  for (const part of header.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (SERVER_LANGS.includes(code)) return code;
  }
  return "it";
}
