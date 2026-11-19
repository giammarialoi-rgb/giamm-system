# Note di lavorazione (uso interno) — 2026-11-19

## Controllo della coda e degli eventi (passo 1)

**Eventi.** L'ultimo articolo `category: eventi` in `content/articles/` è del **2026-11-16** (resoconto dei Mondiali IPF Open Equipped di Istanbul), cioè 3 giorni fa: dentro la finestra dei 7 giorni, quindi nessun articolo di evento oggi. La SBD Sheffield Classic del 21 novembre è dentro la finestra dei 5 giorni (2 giorni) ma resta bloccata dalla regola dei 7 giorni: valutabile dal 2026-11-23. Seguono FISU Sharjah (26-30 novembre), Asian Open & Masters Ulaanbaatar (1-10 dicembre) ed Europei giovanili/junior EPF a Kranjska Gora (3-13 dicembre). Ricerca web del giorno su mondiali ed europei di powerlifting, bodybuilding, HYROX e calisthenics: nessun evento nuovo verificabile da aggiungere al calendario (i risultati utili rimandano ai calendari HYROX 2026/2027 già presenti e a tappe regolari di stagione).

**Coda.** `PRIORITÀ` è vuota (0 righe). Le tre righe `\[ ]` rimaste in `ALLENAMENTO` sono tutte marcate "poco contenuto" (meme e promo di corsi: Mike Tuchscherer, Science for Sport, Ben Yanes) e l'intestazione dell'inbox dice che probabilmente non vale la pena farne un articolo; `ALIMENTAZIONE`, `INTEGRAZIONE` e `SALUTE` sono a 0; `DA VERIFICARE` contiene solo un post con didascalia vuota. Nessuna riga utilizzabile → passo 1b (tema di tendenza), come nei giorni precedenti.

**Rotazione.** Ultimi due articoli: 2026-11-18 `pillar: integrazione` (collagene) e 2026-11-17 `pillar: allenamento` (sovraccarico progressivo). Entrambi i pilastri esclusi per oggi. Conteggio per pilastro in `content/articles/`: allenamento 22, integrazione 11, nutrizione 9, **coaching 6** (il meno coperto). Il tema scelto è di pilastro coaching.

## Perché questo tema (passo 1b)

**Segnali trovati (ricerca del 2026-11-19).**
- Gli store sono pieni di app di "AI form check" pubblicate nel 2026: FormCheck AI, Form Fix (AI Form Check Coach), FormLens, VeraLift, SquatEye (Squat Depth Check), Squat Trainer, Gym Assistant — AI Form Check, GymSpotter, Formly, oltre a pagine commerciali "Best AI Workout Form Check App 2026" (gymscore.ai, sensai.fit, kensoforge.com).
- La prima pagina di risultati in italiano per "form check app intelligenza artificiale tecnica squat" è composta **solo** da schede App Store/Play e pagine di prodotto: nessun contenuto con un dato di accuratezza. Contenuto concorrente debolissimo.
- Scienza recente e molto citabile: **Rode et al., Scientific Reports, 5 novembre 2025** — il benchmark più ampio mai pubblicato sugli stimatori di posa monoculari (dataset Physio2.2M: 25 partecipanti, oltre 2,2 milioni di fotogrammi, 11 stimatori open source in 18 varianti 2D e 26 3D). Dato chiave: errore di posizione 72-122 mm (2D) e 146-249 mm (3D); errore medio sull'angolo del ginocchio da 9,3° (2D) e da 14,1° (3D); nella discussione gli autori scrivono che nessuno dei modelli testati raggiunge l'errore angolare richiesto per un'interpretazione clinica corretta.

**Punteggi dei candidati (1-5 per criterio: domanda di ricerca, attualità, pertinenza Nurvan, solidità delle evidenze, debolezza dei concorrenti, copertura del pilastro).**

| Candidato | Dom. | Att. | Nurvan | Evid. | Concorr. | Pilastro | Totale |
|---|---|---|---|---|---|---|---|
| **Precisione del form check da video/AI (coaching)** | 4 | 5 | 5 | 5 | 5 | 5 | **29** |
| Costo per 30 g di proteine da cibo vero, dati CREA (nutrizione) | 4 | 3 | 5 | 3 | 4 | 3 | 22 |
| Perché i clienti di coaching online smettono (coaching) | 3 | 3 | 5 | 2 (solo dati di un fornitore, non scientifici) | 4 | 5 | 22 |
| Omega-3 (+293% di ricerche) | 5 | 4 | 4 | 4 | 2 | 1 (integrazione, appena trattata) | 20 |
| Allenarsi in gruppo o da soli (trend "fitness community" +383%) | 3 | 4 | 3 | 3 | 3 | 5 | 21 |

Esclusi perché già trattati: ricomposizione corporea, beef protein, collagene, creatina, magnesio, fibra. Esclusi perché richiederebbero consigli medici personali: nessuno fra i candidati.

**Pilastro:** coaching. **Categoria:** allenamento. **Keyword principale:** form check ai / app ai correzione tecnica palestra. **Correlate:** analisi video tecnica squat, come filmare la tecnica, precisione app palestra, valgo di ginocchio da video.

## Affermazioni analizzate (passo 2)

1. "L'app misura i tuoi angoli come un laboratorio" → **Smentita** (Rode 2025, Sci Rep).
2. "Se è 3D è più preciso" → **Smentita** (errore di posizione 2D 72-122 mm vs 3D 146-249 mm).
3. "Basta inquadrare, l'angolo di ripresa è un dettaglio" → **Smentita** (Rode 2025 ICORR; Wang 2025).
4. "Un coach umano è oggettivo" → **Da precisare** (Gianola 2017: kappa inter-valutatore 0,30-0,34).
5. "Il form check da video non serve a niente" → **Smentita** (Edwards e Liberatore 2018; Erdman 2024).
6. "L'app può dirti se un movimento è sicuro per te" → **Non verificabile**: nessuno studio disponibile testa la previsione di infortuni in chi si allena con i pesi.

## Fonti usate (8, tutte verificate su PubMed il 2026-11-19)

1. Rode D et al., 2025. *Sci Rep* 15(1):38767. PMID 41193590 · DOI 10.1038/s41598-025-22626-7 — 25 partecipanti, 2,2 M fotogrammi, 11 stimatori; MPJPE 72-122 mm (2D) e 146-249 mm (3D); MAE ginocchio da 9,3° (2D) e da 14,1° (3D); MAE gomito da 21,5° (2D) e da 16,3° (3D); miglior 2D RTMPose "Performance" (MPJPE 72 mm); nessun modello sotto la soglia di errore per l'uso clinico. Full text letto su PMC (PMC12589393): i valori dei limiti superiori degli intervalli non sono leggibili nel testo estratto (formule inline), quindi nell'articolo sono riportati solo i limiti inferiori, con la dicitura "da".
2. Rode D et al., 2025. *IEEE Int Conf Rehabil Robot* 2025:773-778. PMID 40644081 · DOI 10.1109/ICORR66766.2025.11063086 — gomito: BlazePose MAE 10,5° e RMSE 14,7° nell'orientamento ottimale (movimento interamente nel piano dell'immagine, dopo calibrazione di offset statico); IMU MAE 4,2° e RMSE 6,0°; l'orientamento rispetto alla telecamera influisce in modo significativo; la stima da video sottostima le flessioni ampie.
3. Wang J et al., 2025. *J Biomech* 181:112529. PMID 39862716 · DOI 10.1016/j.jbiomech.2025.112529 — OpenCap su 53 pazienti con artrosi di ginocchio e 30 controlli; RMSE medio 6,1° e ICC 0,67 camminando verso la telecamera; peggioramento significativo camminando in direzione opposta; errori appena sopra le soglie accettabili sulla maggior parte degli angoli.
4. Wade L et al., 2022. *PeerJ* 10:e12995. PMID 35237469 · DOI 10.7717/peerj.12995 — review: misure temporo-spaziali equivalenti, ma centri articolari e angoli non ancora sufficientemente accurati per uso clinico; gli algoritmi open source non sono stati progettati per la biomeccanica.
5. Gianola S et al., 2017. *BMC Musculoskelet Disord* 18(1):299. PMID 28709418 · DOI 10.1186/s12891-017-1660-8 — 72 adulti, sei clinici esperti, tre momenti; kappa pesato intra-valutatore 0,55-0,85, inter-valutatore 0,34 / 0,31 / 0,30.
6. Edwards S, Liberatore M, 2018. *J Sport Rehabil* 27(2). PMID 28872403 · DOI 10.1123/jsr.2017-0064 — 16 partecipanti con pregresso infortunio al ginocchio, 5 prove di squat su video 2D, tre valutatori esperti e tre novizi: buona affidabilità inter-valutatore con il metodo "overall" (giudizio d'insieme), più affidabile del metodo segmentale.
7. Erdman A et al., 2024. *Front Sports Act Living* 6:1352286. PMID 38558858 · DOI 10.3389/fspor.2024.1352286 — 41 pallavoliste adolescenti; AUC dei criteri 2D fra 0,62 e 0,93; criterio "MEDIAL" (ginocchio dentro il bordo interno della scarpa) il migliore, AUC 0,67-0,93.
8. Jamaludin NI et al., 2022. *Int J Sports Phys Ther* 17(4):574-584. PMID 35693857 · DOI 10.26603/001c.35706 — 34 donne attive; affidabilità intra e inter-giornata ICC ≥ 0,50; la validità dell'FPPA dipende da profondità dello squat, gamba in appoggio e presenza di valgo marcato.

Fonte di contesto non usata nell'articolo (dati di un fornitore, non scientifici, scartati per la regola "ogni numero ha una fonte"): benchmark di retention di Coachway (agosto 2026, 5.666 clienti nordici).

## Elementi originali

- **Grafico 1** (errore medio sugli angoli): accostamento originale di tre studi, con avvertenza esplicita che si tratta di articolazioni e compiti diversi.
- **Grafico 2** (accordo fra valutatori): kappa intra e inter-valutatore letti sulle fasce di interpretazione convenzionali.
- **Tabella 2D vs 3D** costruita sui valori di Rode et al., 2025.
- **Tabella dei verdetti** con sei affermazioni etichettate.

## Lingue e link interni

10 lingue (it, en, es, fr, de, pt, ru, zh, ar, hi). Link interni a `coaching-online-funziona-studi`, `quanto-e-preciso-il-rir` e `scheda-allenamento-ai-studi`, con gli slug tradotti di ciascuna lingua e il prefisso `/<lang>/blog/` per tutte le lingue diverse dall'italiano (nota tecnica dell'inbox del 2026-10-08). Un link interno è presente anche nel corpo del testo (punto 5 di "Come applicarlo").
