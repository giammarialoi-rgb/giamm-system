/**
 * PubMed tool for AI Coach — fetches real PMIDs, never invents citations.
 */
import { searchPubMed } from '../../evidence/index.mjs';

const EVIDENCE_KEYWORDS =
  /\b(eviden|pubmed|letteratura|studio|studi|meta-?anal|systematic|RCT|randomized|perch[eé].*consigli|scientific|research|creatin|protein|volume|deload|sonno|ipertrof)\b/i;

export function shouldFetchPubMed(message, neededDomains = {}) {
  if (neededDomains.evidence) return true;
  return EVIDENCE_KEYWORDS.test(String(message || ''));
}

export function evidenceLevelFromStudyType(studyType) {
  const t = String(studyType || '').toLowerCase();
  if (t === 'meta-analysis') return { level: 'HIGH', label: 'Meta-analisi' };
  if (t === 'systematic-review') return { level: 'HIGH', label: 'Revisione sistematica' };
  if (t === 'rct') return { level: 'MODERATE', label: 'RCT' };
  if (t === 'review') return { level: 'MODERATE', label: 'Review narrativa' };
  return { level: 'LOW', label: 'Altro / osservazionale' };
}

/** Build a PubMed query from user message (strip Italian filler). */
export function buildPubMedQuery(message) {
  let q = String(message || '').trim();
  q = q.replace(/^(quali|quanto|perch[eé]|dimmi|mostra|evidenze|evidenza)\s+/i, '');
  q = q.replace(/\?+$/, '').trim();
  if (q.length < 4) return 'resistance training hypertrophy';
  if (/creatin/i.test(q)) return 'creatine supplementation muscle strength meta-analysis';
  if (/protein|proteine/i.test(q)) return 'dietary protein muscle hypertrophy';
  if (/volume/i.test(q) && /ipertrof|hypertrophy|muscle/i.test(q)) return 'resistance training volume hypertrophy';
  if (/deload/i.test(q)) return 'deload resistance training fatigue';
  if (/sonno|sleep/i.test(q)) return 'sleep deprivation athletic performance recovery';
  if (/RPE|RIR|autoregol/i.test(q)) return 'autoregulation resistance training RPE';
  return q.slice(0, 120);
}

/**
 * @returns {Promise<Array>} slim studies for LLM context
 */
export async function fetchEvidenceForCoach(message, env = process.env) {
  const query = buildPubMedQuery(message);
  const studies = await searchPubMed(query, {
    apiKey: env.NCBI_API_KEY || env.PUBMED_API_KEY || '',
    retmax: 6,
    email: env.NCBI_EMAIL || 'dev@giammaria.system'
  });
  return studies.map((s) => {
    const grade = evidenceLevelFromStudyType(s.studyType);
    return {
      pmid: s.pmid,
      title: s.title,
      year: s.year,
      journal: s.journal,
      studyType: s.studyType,
      evidenceLevel: grade.level,
      evidenceLabel: grade.label,
      url: s.url,
      authors: (s.authors || []).slice(0, 3)
    };
  });
}
