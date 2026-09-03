/**
 * PubMed / NCBI E-utilities evidence proxy (server-side API key).
 */

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

function studyTypeFromPublicationTypes(types) {
  const t = (types || []).map((x) => String(x).toLowerCase());
  if (t.some((x) => x.includes('meta-analysis'))) return 'meta-analysis';
  if (t.some((x) => x.includes('systematic review'))) return 'systematic-review';
  if (t.some((x) => x.includes('review'))) return 'review';
  if (t.some((x) => x.includes('randomized') || x.includes('clinical trial'))) return 'rct';
  return 'other';
}

export async function searchPubMed(query, { apiKey, retmax = 8, tool = 'giammaria_system', email = 'dev@giammaria.system' } = {}) {
  if (!query) return [];
  const keyParam = apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : '';
  const searchUrl =
    `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${retmax}` +
    `&term=${encodeURIComponent(query)}&tool=${encodeURIComponent(tool)}&email=${encodeURIComponent(email)}${keyParam}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error('PUBMED_SEARCH_' + searchRes.status);
  const searchJson = await searchRes.json();
  const ids = searchJson.esearchresult?.idlist || [];
  if (!ids.length) return [];

  const summaryUrl =
    `${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}` +
    `&tool=${encodeURIComponent(tool)}&email=${encodeURIComponent(email)}${keyParam}`;
  const sumRes = await fetch(summaryUrl);
  if (!sumRes.ok) throw new Error('PUBMED_SUMMARY_' + sumRes.status);
  const sumJson = await sumRes.json();
  const result = sumJson.result || {};

  return ids.map((pmid) => {
    const doc = result[pmid] || {};
    const pubTypes = doc.pubtype || [];
    return {
      pmid: String(pmid),
      title: doc.title || '',
      journal: doc.fulljournalname || doc.source || '',
      year: (doc.pubdate || '').slice(0, 4),
      authors: (doc.authors || []).slice(0, 6).map((a) => a.name).filter(Boolean),
      studyType: studyTypeFromPublicationTypes(pubTypes),
      pubTypes,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      provenance: {
        source: 'pubmed',
        sourceId: String(pmid),
        kind: 'api',
        confidence: 0.85,
        method: 'ncbi_eutilities'
      }
    };
  });
}

export async function fetchPubMedAbstract(pmid, { apiKey, tool = 'giammaria_system', email = 'dev@giammaria.system' } = {}) {
  const keyParam = apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : '';
  const url =
    `${EUTILS}/efetch.fcgi?db=pubmed&retmode=xml&id=${encodeURIComponent(pmid)}` +
    `&tool=${encodeURIComponent(tool)}&email=${encodeURIComponent(email)}${keyParam}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('PUBMED_FETCH_' + res.status);
  const xml = await res.text();
  const abstractMatch = xml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/i);
  const abstract = abstractMatch
    ? abstractMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
  return { pmid: String(pmid), abstract, rawLength: xml.length };
}

export function mountEvidenceRoutes(app, { requireAuth } = {}) {
  app.get('/api/evidence/search', async (req, res) => {
    try {
      if (requireAuth) {
        const auth = await requireAuth(req);
        if (!auth) return res.status(401).json({ ok: false, error: 'Auth required' });
      }
      const q = String(req.query.q || req.query.query || '').trim();
      const type = String(req.query.type || '').toLowerCase();
      let term = q;
      if (type === 'meta-analysis') term += ' AND Meta-Analysis[pt]';
      else if (type === 'systematic-review') term += ' AND Systematic Review[pt]';
      else if (type === 'review') term += ' AND Review[pt]';
      else if (type === 'rct') term += ' AND Randomized Controlled Trial[pt]';

      const studies = await searchPubMed(term, {
        apiKey: process.env.NCBI_API_KEY || process.env.PUBMED_API_KEY || '',
        retmax: Math.min(20, parseInt(req.query.limit || '8', 10) || 8),
        email: process.env.NCBI_EMAIL || 'dev@giammaria.system'
      });
      return res.json({
        ok: true,
        query: q,
        studies,
        note: 'Mostra più studi quando disponibili; non fare cherry-picking. Gli abstract possono richiedere /api/evidence/:pmid'
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message || 'evidence_search_failed' });
    }
  });

  app.get('/api/evidence/:pmid', async (req, res) => {
    try {
      const pmid = String(req.params.pmid || '').replace(/\D/g, '');
      if (!pmid) return res.status(400).json({ ok: false, error: 'invalid_pmid' });
      const detail = await fetchPubMedAbstract(pmid, {
        apiKey: process.env.NCBI_API_KEY || process.env.PUBMED_API_KEY || '',
        email: process.env.NCBI_EMAIL || 'dev@giammaria.system'
      });
      return res.json({ ok: true, ...detail, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message || 'evidence_fetch_failed' });
    }
  });
}
