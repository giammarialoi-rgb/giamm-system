// Scientific search for the "Evidenze" box: GET /api/evidence/search?q=...&limit=6
// The question is looked up on PubMed (NCBI E-utilities) by our server, so the reader's address never reaches NCBI; only the
// words typed in the box are sent, never an account, a name or any training data. Answer: { ok, studies: [{ pmid, title,
// journal, year, studyType, url }] }. Nothing is stored; the same question is kept in memory for ten minutes.

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const TYPE_ORDER = [
  "Meta-Analysis", "Systematic Review", "Randomized Controlled Trial", "Clinical Trial",
  "Review", "Observational Study", "Case Reports", "Journal Article"
];

export function studyTypeOf(pubtypes) {
  const list = Array.isArray(pubtypes) ? pubtypes.map((x) => String(x)) : [];
  for (const t of TYPE_ORDER) if (list.includes(t)) return t;
  return list[0] || "";
}

export function normalizeStudy(raw) {
  if (!raw || typeof raw !== "object") return null;
  const pmid = String(raw.uid || "").replace(/\D/g, "");
  const title = String(raw.title || "").replace(/\s+/g, " ").trim();
  if (!pmid || !title) return null;
  const year = (String(raw.pubdate || raw.epubdate || "").match(/\d{4}/) || [""])[0];
  return {
    pmid,
    title: title.slice(0, 300),
    journal: String(raw.fulljournalname || raw.source || "").slice(0, 120),
    year,
    studyType: studyTypeOf(raw.pubtype),
    url: "https://pubmed.ncbi.nlm.nih.gov/" + pmid + "/"
  };
}

export async function searchPubMed(query, limit, fetchImpl = fetch, env = process.env) {
  const term = String(query || "").replace(/\s+/g, " ").trim().slice(0, 200);
  const n = Math.min(10, Math.max(1, Math.round(Number(limit)) || 6));
  if (term.length < 3) throw Object.assign(new Error("Scrivi almeno 3 caratteri."), { status: 400 });
  const common = "&tool=nurvan" + (env.NCBI_EMAIL ? "&email=" + encodeURIComponent(env.NCBI_EMAIL) : "") + (env.NCBI_API_KEY ? "&api_key=" + encodeURIComponent(env.NCBI_API_KEY) : "");
  const get = async (url) => {
    const res = await fetchImpl(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw Object.assign(new Error("PubMed non risponde, riprova tra poco."), { status: 502 });
    return res.json();
  };
  let ids = [];
  try {
    const found = await get(EUTILS + "/esearch.fcgi?db=pubmed&retmode=json&sort=relevance&retmax=" + n + "&term=" + encodeURIComponent(term) + common);
    ids = ((found && found.esearchresult && found.esearchresult.idlist) || []).map((x) => String(x).replace(/\D/g, "")).filter(Boolean).slice(0, n);
    if (!ids.length) return [];
    const sum = await get(EUTILS + "/esummary.fcgi?db=pubmed&retmode=json&id=" + ids.join(",") + common);
    const result = (sum && sum.result) || {};
    return ids.map((id) => normalizeStudy(result[id])).filter(Boolean);
  } catch (err) {
    if (err && err.status) throw err;
    throw Object.assign(new Error("PubMed non risponde, riprova tra poco."), { status: 502 });
  }
}

export function mountEvidenceRoutes(app, { fetchImpl = fetch, now = () => Date.now(), env = process.env } = {}) {
  const cache = new Map();
  const hits = new Map();
  app.get("/api/evidence/search", async (req, res) => {
    // A small brake per address: 20 searches a minute.
    const who = String(req.ip || req.headers["x-forwarded-for"] || "anon");
    const t = now();
    const recent = (hits.get(who) || []).filter((x) => t - x < 60000);
    if (recent.length >= 20) return res.status(429).json({ ok: false, error: "Troppe ricerche: riprova tra un minuto." });
    recent.push(t);
    hits.set(who, recent);
    if (hits.size > 5000) hits.clear();
    const q = String(req.query.q || "").replace(/\s+/g, " ").trim().slice(0, 200);
    const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 6));
    const key = q.toLowerCase() + "|" + limit;
    const cached = cache.get(key);
    if (cached && t - cached.at < 600000) return res.json({ ok: true, studies: cached.studies, cached: true });
    try {
      const studies = await searchPubMed(q, limit, fetchImpl, env);
      cache.set(key, { at: t, studies });
      if (cache.size > 300) cache.delete(cache.keys().next().value);
      return res.json({ ok: true, studies });
    } catch (err) {
      return res.status(err.status || 502).json({ ok: false, error: err.message || "Ricerca non riuscita." });
    }
  });
}
