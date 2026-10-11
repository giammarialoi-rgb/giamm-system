# Appunti di lavoro (uso interno) — 2026-10-11

## Scelta dell'articolo
- **Eventi**: Mondiali IPF Classic & Equipped Masters, Reno, 14-25 ottobre → dentro la finestra dei 5 giorni, MA in `content/articles/` c'è già un articolo `category: eventi` del 2026-10-10 (anteprima di Reno), cioè 1 giorno fa, dentro i 7 giorni. **Nessun articolo di evento oggi.**
- **Coda**: presa la prima riga `[ ]` dall'alto della sezione PRIORITÀ di `content/inbox.md`.
- Pilastro `integrazione` (2 articoli finora contro 5 di allenamento): anche la copertura dei pilastri migliora.

## Post sorgente
- Autore: **Todd Anderson** (@toddanderson42_, account "Dream Recovery" / sonno e prestazione), post del **13 settembre 2026**.
- Link: https://www.instagram.com/p/DdNDHgthiYV/
- Letto con Claude in Chrome (tab nuova, chiusa a fine lavoro). Didascalia leggibile; anche l'immagine dell'infografica era visibile, letta solo per capire le assunzioni numeriche. **Nessuno screenshot scaricato, salvato o ripubblicato.**
- Tipo di contenuto: una sola immagine infografica ("SLEEP AND CAFFEINE") + didascalia lunga.

### Didascalia (sintesi delle affermazioni, non trascrizione)
1. L'emivita della caffeina è "circa 5-6 ore".
2. Il caffè del pomeriggio può ancora essere in circolo all'ora di coricarsi.
3. Tre caffè in giornata lasciano "circa 87 mg" di caffeina alle 23.
4. 87 mg sono più della caffeina di un Red Bull standard.
5. La caffeina non è cattiva: conta l'orario; va usata come strumento di prestazione.

### Assunzioni lette nell'infografica (parametri del modello, non testo)
- 1 tazza = 8 oz (240 ml) = 100 mg di caffeina.
- Emivita metabolica dichiarata nell'immagine: **6 ore** (la didascalia dice 5-6).
- Caffè alle 8:00, 12:00, 14:00. Punti del grafico: 100 mg alle 9, 170 alle 12, 220 alle 15, 87 alle 23, 31 alle 8 del giorno dopo.

## Verifica dell'aritmetica del post
Modello a decadimento esponenziale, residuo = Σ dose × 0,5^(Δt/T½).
Con 3 × 100 mg alle 8/12/14 e T½ = 6 h → **81 mg alle 23** (il post mostra 87: stesso ordine di grandezza, la differenza è compatibile con una fase di assorbimento modellata diversamente). **L'aritmetica del post è corretta.**

## Classificazione delle affermazioni
| Affermazione | Esito | Fonte |
|---|---|---|
| Emivita 5-6 ore | **Da precisare** | EFSA 2015: media ~4 h, intervallo 2-8 h; attività CYP1A2 varia 5-6 volte (Grzegorzewski 2022, PMID 35280254) |
| Una tazza = 100 mg | **Smentito** | Ludwig 2014 PMID 25014672: 48-317 mg su 104 espressi (IT/UK/ES); Crozier 2012 PMID 22130653: differenze di 6 volte, massimo 322 mg |
| ~87 mg residui alle 23 | **Confermato come calcolo** | ricalcolo Nurvan: 81 mg con le stesse assunzioni |
| 87 mg > un Red Bull | **Confermato** | EFSA 2015: energy drink 320 mg/L → ~80 mg per lattina da 250 ml |
| Conta l'orario | **Confermato, soglia più severa** | Gardiner 2023 PMID 36870101: 8,8 h per 107 mg, 13,2 h per 217,5 mg; Drake 2013 PMID 24235903: 400 mg a 6 h disturbano ancora |
| "Se mi addormento va bene" (replica comune, non del post) | **Smentito** | Gardiner 2023: sonno profondo −11,4 min, N1 +6,1 min; Chang 2025 PMID 41124973: −34,7 min TST, −4,7% efficienza |
| Caffeina come strumento di prestazione | **Confermato** | ISSN position stand 2021 PMID 33388079: 3-6 mg/kg |

## Note di prudenza
- Niente dosaggi personali: riportati solo i range degli studi e i limiti EFSA come dati.
- Sonno, gravidanza, farmaci, ansia e disturbi cardiaci → rimando al medico nel disclaimer.
- Kocak 2025 riportato nel verso giusto: negli atleti la **percezione** di sonno peggiore è più forte della misura oggettiva, non il contrario; segnalati i limiti (10 studi, 128 atleti, prevalenza maschile).
- Crozier et al.: su PubMed il campo data è 2011-11-30 (epub), il fascicolo è Food Funct 2012;3(1):30-33 → citato come 2012.

## Elemento originale
- Grafico `chart-caffeina-residua.<lang>.svg`: stesso modello e stessi orari del post, ma con i valori misurati (3 dosi × 3 emivite). Risultato: da **3 a 354 mg** alle 23 invece di un singolo 87.
- Tabella orari limite: calcolo Nurvan che applica le soglie di 8,8 h e 13,2 h di Gardiner 2023 a tre orari di coricamento.

## Keyword
- Principale: *caffeina e sonno* / *a che ora smettere di bere caffè*
- Correlate: emivita caffeina, caffeina quante ore prima di dormire, quanta caffeina in un espresso, caffeina pre workout sonno
