/**
 * Weekly AI Check-in — structured coach review from athlete data.
 */

export const CHECKIN_SYSTEM = `Sei Coach AI di Nurvan. Genera un CHECK-IN SETTIMANALE evidence-informed in italiano.
Usa SOLO i dati in ATHLETE_DATA e EVIDENCE_RESULTS se presenti. Non inventare numeri né studi.

Struttura OBBLIGATORIA (titoli esatti, testo chiaro, no markdown pesante):
1) COSA STA FUNZIONANDO
2) COSA NON STA FUNZIONANDO
3) POSSIBILI SPIEGAZIONI (usa "possibile/probabile", mai causalità certa)
4) COSA MODIFICARE (max 2 interventi prioritizzati — non cambiare tutto insieme)
5) COSA MONITORARE
6) OBIETTIVO SETTIMANA PROSSIMA

Se proponi UNA modifica concreta al programma, aggiungi in fondo un solo blocco JSON:
\`\`\`json
{"action":"modify_program","summary":"...","operations":[...]}
\`\`\`
Altrimenti ometti il JSON.
Non è consulenza medica.`;

export function buildCheckInUserPrompt(builtContext, evidenceResults = []) {
  const block =
    `ATHLETE_DATA:\n${JSON.stringify(builtContext)}\n\n` +
    (evidenceResults.length
      ? `EVIDENCE_RESULTS:\n${JSON.stringify(evidenceResults)}\n\n`
      : '') +
    `USER_QUERY:\nGenera il check-in settimanale completo seguendo la struttura richiesta.`;
  return block;
}

export function parseCheckInSections(replyText) {
  const text = String(replyText || '');
  const sections = {};
  const markers = [
    ['worked', /1\)\s*COSA STA FUNZIONANDO/i],
    ['notWorked', /2\)\s*COSA NON STA FUNZIONANDO/i],
    ['hypotheses', /3\)\s*POSSIBILI SPIEGAZIONI/i],
    ['changes', /4\)\s*COSA MODIFICARE/i],
    ['monitor', /5\)\s*COSA MONITORARE/i],
    ['nextGoal', /6\)\s*OBIETTIVO SETTIMANA PROSSIMA/i]
  ];
  for (let i = 0; i < markers.length; i++) {
    const [key, re] = markers[i];
    const start = text.search(re);
    if (start < 0) continue;
    const end = i + 1 < markers.length ? text.search(markers[i + 1][1]) : text.indexOf('```');
    sections[key] = text.slice(start, end > start ? end : undefined).replace(re, '').trim();
  }
  return sections;
}
