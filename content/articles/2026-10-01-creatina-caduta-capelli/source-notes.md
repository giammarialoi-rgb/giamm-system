# Appunti grezzi (uso interno)

- Post: https://www.instagram.com/p/Dd169MICJ8G/
- Autore: Marco Guercioni (@the___doc)
- Contenuto ricevuto come riassunto della didascalia (post non aperto direttamente): studio 2009 su "16 rugbisti" per 3 settimane (van der Merwe, Clin J Sport Med 2009) che misurò il DHT nel sangue e non i capelli; da lì il mito "la creatina fa cadere i capelli"; nel 2025 primo studio costruito per misurare la caduta dei capelli con la creatina; tre regole per leggere uno studio (non copiate: la sezione "Tre domande" dell'articolo è scritta da zero).

## Classificazione affermazioni
- Lo studio 2009 misurò il DHT nel sangue, non i capelli → Confermato (abstract: T, DHT, DHT:T, composizione corporea)
- Durata 3 settimane → Confermato (7 gg carico 25 g/die + 14 gg 5 g/die)
- 16 rugbisti → Da precisare (abstract: n = 20 volontari, crossover; numero di completers non nell'abstract; full text non consultato)
- Da lì è nato il mito → Da precisare (plausibile; unico studio sull'uomo con aumento DHT, discusso in Antonio 2021; origine del passaparola non misurabile)
- 2025 primo studio progettato per i capelli → Confermato (Lak 2025: "first to directly assess hair follicle health")
- Smentite: nessuna

## Ricerca
- van der Merwe 2009 PMID 19741313: crossover doppio cieco, washout 6 sett, n=20 rugbisti universitari in stagione; T invariato; DHT +56% a 7 gg, +40% a 21 gg (P<0,001); DHT:T +36% e +22% (P<0,01). Autori: "further investigation is warranted".
- Lak 2025 PMID 40265319 (JISSN 22 sup1): RCT 12 sett, 45 uomini allenati 18–40 anni, 5 g/die creatina monoidrato vs 5 g maltodestrina; 38 completati; tricogramma + FotoFinder (densità, unità follicolari, spessore cumulativo); nessuna interazione gruppo×tempo per ormoni e capelli; T totale ↑ (creatina +124±149, placebo +216±203 ng/dL), T libero ↓ (−9,0±8,7 vs −9±6,4 pg/mL) in entrambi; DHT e DHT:T senza differenze.
- Antonio 2021 PMID 33557850: review ISSN domande e falsi miti; dosi 3–5 g/die o 0,1 g/kg/die; domanda 4 su capelli/calvizie; carico non necessario (domanda 8); efficacia anche nelle donne (domanda 11). Conclusioni su capelli/carico/donne dal full text PMC7871530, non dall'abstract.
- Kreider 2017 PMID 28615996: position stand ISSN; sicurezza a breve e lungo termine (fino a 30 g/die per 5 anni) in persone sane.
- York 2020 PMID 32066284: AGA = miniaturizzazione follicolare, genetica + androgeni; finasteride = inibitore 5-alfa-reduttasi.

## Nota prodotto
- supplement-catalog.mjs (root del repo, auto-generato, incluso nei bundle da generate_bundles.mjs): catalogo prodotti per brand con categoria, ingrediente, dose tipica, unità e timing; include categoria "Creatina" (monoidrato, HCl…).
- Funzione reale: dominio "supplementation" nel piano cliente; il cliente può richiedere un protocollo di integrazione al coach (web/coach-practice-ui.js: "Richiesta integrazione … chiede un protocollo di integrazione"); il coach lo assegna (server/coach-os/today.mjs: "Integrazione assegnata"). Box scritto su questa base (richiesta al coach + catalogo con dose/timing), senza promettere promemoria o tracciamento dell'assunzione.
