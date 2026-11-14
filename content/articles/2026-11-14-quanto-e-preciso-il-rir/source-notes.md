# Appunti interni — Quanto è preciso il tuo RIR? (2026-11-14)

Uso interno. Non pubblicato.

## Scelta dell'articolo: perché il passo 1b (tema di tendenza)

Controllo del 2026-11-14 nell'ordine previsto dalla task:

**a) EVENTI.** I Mondiali IPF Open Equipped di Istanbul (9-15 novembre 2026) sono in corso e l'ultimo articolo `category: eventi` è del 2026-11-04 (anteprima di Istanbul, 10 giorni), quindi la finestra dei 7 giorni è chiusa e un resoconto sarebbe stato ammesso. **Non scritto per mancanza di fonti verificabili**: su goodlift.info (database ufficiale IPF) la competizione non risulta ancora pubblicata fra quelle del 2026 e ipf.powerlifting.sport blocca il fetch (robots); l'unica fonte trovata con risultati è un'agenzia nazionale (Focus Taiwan, 13 novembre 2026, focustaiwan.tw/sports/202611130011) che riporta solo i piazzamenti dei propri atleti. Un resoconto con podi, record e confronti storici non verificabili su fonte ufficiale avrebbe violato la regola "ogni numero ha una fonte". La gara si chiude il 15 novembre: il resoconto va scritto quando i risultati ufficiali sono pubblicati (15-16 novembre, ancora entro i 7 giorni dalla chiusura).

**b) CODA.** La sezione PRIORITÀ di `content/inbox.md` è vuota (0 righe). Restano 3 righe in ALLENAMENTO, tutte annotate in inbox come contenuto debole (meme, promo corso, promo accademia): non reggono un articolo da 1.500 parole.

**c) ROTAZIONE.** Le sezioni ALIMENTAZIONE, INTEGRAZIONE e SALUTE sono vuote; la sola sezione con righe libere è ALLENAMENTO, che è anche la categoria dell'articolo del 12 novembre. Coda quindi esaurita → passo 1b.

## Perché questo tema

**Segnali trovati (con link e data)**

- `risingtrends.co/trends/fitness-trends-2026` (pagina aggiornata il **9 novembre 2026**, dati di ricerca di settembre-ottobre 2026): i temi di metodo in crescita sono tutti su come allenarsi, non su cosa comprare (HYROX +270%, military calisthenics +135%, zercher squat +45%).
- **Nuovo studio nel numero di novembre 2026** del *Journal of Strength and Conditioning Research* (40(11):1335-1341, PMID 42328880): la velocità del bilanciere non è accurata per stimare il RIR nello stacco con bilanciere esagonale. Segnale scientifico fresco esattamente sul tema "quanto possiamo fidarci della misura dello sforzo".
- Contenuto concorrente abbondante e debole: guide 2026 del tipo "training to failure vs reps in reserve" (getfitcraft.com, povver.ai, gymbers.com, jackedforums.com, blog.walterclayton.com), più la ripresa su stampa generalista della meta-analisi sull'accuratezza del RIR (Men's Fitness ripreso da AOL, 29 maggio 2026, aol.com/articles/research-says-youre-leaving-gains-135047000.html). Tutti prescrivono "allenati a 1-3 RIR"; **nessuno riporta i numeri di quanto sbagliamo a stimarlo né i moderatori** (distanza dal cedimento, lunghezza della serie, numero della serie).
- Revisioni di comunità sul confronto RPE/RIR pubblicate a novembre 2026 (dev.to/yonatan_naor_5642e43447ea/rpe-vs-rir-how-lifters-actually-calibrate-effort-evidence-review-476g): conferma che la domanda viva è la calibrazione, non la definizione.

**Punteggi dei candidati (1-5 per criterio: volume/crescita · attualità · pertinenza Nurvan · solidità evidenze · concorrenza debole · copertura pilastro)**

| Candidato | V | A | P | E | C | Pil | Tot |
|---|---|---|---|---|---|---|---|
| **Precisione del RIR / calibrazione dello sforzo** | 4 | 4 | 5 | 5 | 5 | 5 | **28** |
| Collagene e muscoli (+242% su explodingtopics) | 4 | 4 | 4 | 4 | 3 | 3 | 22 |
| HYROX: come allenarsi (+270%) | 5 | 4 | 3 | 2 | 3 | 1 | 18 |
| Zone 2 / Zone 5 cardio | 3 | 3 | 3 | 3 | 2 | 1 | 15 |
| Military calisthenics | 3 | 3 | 2 | 2 | 3 | 1 | 14 |

Copertura pilastro al 14 novembre 2026 (campo `pillar` dei 51 articoli esistenti): allenamento 20, nutrizione 9, integrazione 9, **coaching 5** → il pilastro meno coperto è coaching, e il tema è stato impostato sul lavoro coach-atleta (che cosa significa davvero il RIR che un cliente riporta, come calibrarlo, cosa trattare come rumore), con una sottosezione dedicata a chi allena a distanza.

- **Pilastro**: coaching · **Categoria**: allenamento
- **Keyword principale**: "quanto è preciso il RIR" / "ripetizioni in riserva"
- **Correlate**: RIR allenamento, RIR o cedimento, come capire a quante ripetizioni dal cedimento sei, RPE allenamento pesi
- Nessuno slug esistente copre il tema (controllati tutti i 51 in `content/articles/`); l'articolo del 2026-10-05 tocca serie e ripetizioni ma non la precisione della stima.

## Affermazioni diffuse e verdetti

| Affermazione | Verdetto | Fonte |
|---|---|---|
| "Allenati a 2 RIR e sai cosa stai facendo" | Da precisare | Refalo 2024 (0,65 ± 0,78 rip in panca a 1-3 RIR); Zourdos 2021 (5,15 a 5 RIR) |
| "Con l'esperienza impari a sentire il RIR" | Smentito | Halperin 2022 (β = -0,006, IC -0,02 a 0,007); Remmert 2023b (6 settimane, errore assoluto non migliorato); Zourdos 2021 (età di allenamento non predittiva) |
| "Se sbaglio, sbaglio in entrambe le direzioni" | Smentito | Halperin 2022 (sottostima 0,95 rip, IC 0,17-1,73) |
| "Il RIR vale allo stesso modo in ogni serie" | Smentito | Halperin 2022 (β 0,06 fino a 12 rip vs 0,47 oltre) |
| "Fermarsi lontano dal cedimento non cambia nulla" | Da precisare | Robinson 2024 (trascurabile per forza, pendenza negativa per ipertrofia); Refalo 2023 (ES 0,12 ns per cedimento vs non-cedimento) |
| "La velocità del bilanciere risolve il problema" | Smentito (su quell'esercizio) | Chen 2026 (nessuna condizione ha superato i 3 criteri) |

## Fonti (10 citate + 1 consultata) — dati chiave

1. **Halperin 2022**, Sports Med 52(2):377-390, PMID 34542869 — 12 studi, 414 partecipanti, 262 effect size. Sottostima 0,95 rip (IC 0,17-1,73), I² 97,9%. Moderatori: vicinanza al cedimento β -0,025 (-0,05 a 0,0014); ripetizioni ≤12 β 0,06 (0,04-0,09) vs >12 β 0,47 (0,44-0,49); serie successive β -0,07 (-0,14 a -0,005); stato di allenamento β -0,006 (-0,02 a 0,007) = nessun effetto; alto vs basso corpo -0,58 rip (IC -2,32 a 1,16); SD fra partecipanti 1,45 (0,99-2,12).
2. **Zourdos 2021**, JSCR 35(Suppl 1):S158-S165, PMID 30747900 — 25 uomini (età allenamento 4,7 ± 3,2 anni), squat 70% 1RM, carico medio 123,10 ± 24,25 kg, 16 ± 4 ripetizioni. RIRDIFF: 2,05 ± 1,73 (9RPE), 3,65 ± 2,46 (7RPE), 5,15 ± 2,92 (5RPE). r fra ripetizioni totali ed errore: 0,65 (5RPE, p=0,001), 0,56 (7RPE, p=0,004), 0,01 (9RPE, p=0,97). Età di allenamento non predittiva.
3. **Refalo 2024**, JSCR 38(3):e78-e85, PMID 37967832 — 24 allenati (12 M, 12 F), panca 75% 1RM, chiamate a 1 e 3 RIR. Accuratezza grezza -0,17 ± 1,00; assoluta 0,65 ± 0,78. Equivalenza entro ±1 rip. Nessuna relazione con sesso, anni di esperienza, forza relativa.
4. **Steele 2017**, PeerJ 5:e4105, PMID 29204323 — 141 partecipanti, seduta full body, serie singole a cedimento. Sottostima; SEM fra 2,64 (IC 2,36-2,99) e 3,38 (3,02-3,83). Tendenza al miglioramento con l'esperienza.
5. **Armes 2020**, Front Psychol 11:565416, PMID 33424678 — leg extension, disegno a inganno, 2 esperimenti (n=14 al 70% 1RM, n=24 al 70% della MVC isometrica del giorno), ≥1 anno di esperienza. Sottostima 2,0 rip (IC 0,0-4,0).
6. **Remmert 2023a**, Percept Mot Skills 130(3):1239-1254, PMID 37036795 — 27 uomini e 31 donne, curl, pushdown, rematore alla macchina, 72,5% 1RM, 4 serie a cedimento. Stime più precise vicino al cedimento e nelle serie successive; sesso, esperienza e pratica del RIR non significativi; nessuna differenza fra esercizi.
7. **Remmert 2023b**, Percept Mot Skills 130(5):2139-2160, PMID 37436724 — 9 uomini, panca 3 volte a settimana per 6 settimane, chiamate a 4 e 1 RIR. Errore grezzo in calo (-0,077 rip per seduta), **errore assoluto senza variazioni significative**; maggiore tendenza a sottostimare nelle sedute finali e nelle serie più lunghe (-0,404 per ripetizione).
8. **Robinson 2024**, Sports Med 54(9):2209-2231, PMID 38970765 — meta-regressioni multilivello, aggiustate per carico, equiparazione del volume, durata, stato di allenamento. Forza: IC delle pendenze per il RIR stimato contengono lo zero. Ipertrofia: pendenze negative con IC che escludono lo zero.
9. **Refalo 2023**, Sports Med 53(3):649-665, PMID 36334240 — 15 studi. Set failure (qualunque definizione) vs non-failure ES 0,19 (IC 0,00-0,37, p=0,045); cedimento momentaneo vs non-cedimento ES 0,12 (IC -0,13 a 0,37, p=0,343); perdita di velocità alta (>25%) vs moderata (20-25%) ES 0,08 (IC -0,16 a 0,32). Relazione potenzialmente non lineare.
10. **Chen 2026**, JSCR 40(11):1335-1341, PMID 42328880 — 19 uomini ben allenati, stacco con bilanciere esagonale, 4 serie a cedimento al 65% e all'85% 1RM. Tre criteri: errore assoluto mediano ≤ 2 rip, ≥75% di probabilità di stima accettabile, ≥75% di probabilità che la soglia di velocità si presenti. Nessuna condizione li soddisfa tutti e tre.
- Consultata: **Bastos 2024**, Percept Mot Skills 131(3):940-970, PMID 38563729 — scoping review, 31 studi, N=855: le scale RIR sono praticabili e utili; la stima va fatta vicino al cedimento per aumentarne l'accuratezza.

Tutte le voci (autori, anno, rivista, volume, pagine, PMID, DOI) verificate sui metadati PubMed il 2026-11-14.

## Note editoriali

- Nessun consiglio medico personale: il tema è di programmazione, il disclaimer è presente in tutte le lingue.
- Box Nurvan collegato alla funzione reale di tracciamento del RIR e delle serie di calibrazione; nessuna promessa di risultati.
- Link interni: nelle versioni non italiane si usa il prefisso di lingua (`/en/blog/…`), come nel resto del corpus; in italiano `/blog/…`.
- Lunghezza dei corpi fra ~2.200 e ~2.700 parole, in linea con gli articoli dei giorni precedenti e sopra il range indicativo di 1.200-2.000 della task: le sezioni previste (In breve, tabella verdetti, applicazione, coaching, 4 FAQ) non stanno sotto le 2.000 parole senza tagliare contenuto.
