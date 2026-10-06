# Appunti grezzi — carboidrati e aumento di peso (uso interno)

Data di lavorazione: 2026-10-06
Slug: carboidrati-fanno-ingrassare-grassi-nascosti
Pilastro: nutrizione · Categoria: nutrizione

## Origine

Riga presa dalla sezione PRIORITÀ di `content/inbox.md` (prima riga `[ ]` dall'alto):

> https://www.instagram.com/p/Dd_OSqQiFfi/ — Carboidrati e aumento di peso: sono davvero il problema? (italiano, tabelle nutrizionali) (Andrea Biasci)

Nessun articolo di evento era dovuto: il resoconto Mr. Olympia è stato pubblicato il 2026-10-03 e il calendario fissa il prossimo articolo di evento non prima del 2026-10-10. I Mondiali IPF Classic & Equipped Masters (Reno, 14-25 ottobre) iniziano fra 8 giorni, oltre la finestra dei 5 giorni.

Post aperto con Claude in Chrome in una tab nuova, poi chiusa. L'account risultava loggato su Instagram (il post risulta già messo "mi piace" da giamm1989), ma **la didascalia era sufficiente**: il testo completo dell'argomentazione è nel caption, non nelle slide. Nessuno screenshot scaricato.

Autore del post: `andrea_biasci`. Data: 3 giorni prima della lavorazione → **2026-10-03**. 972 like, 12 commenti al momento della lettura.

## Affermazioni estratte dal post

1. Molte persone attribuiscono ai carboidrati la responsabilità dell'aumento di peso.
2. Alimenti percepiti come prevalentemente glucidici (lasagne, cracker, grissini, biscotti, merendine, dolci) contengono anche quantità rilevanti di grassi, che contribuiscono significativamente all'apporto energetico. Le proteine sono una quota modesta.
3. Il gusto dolce maschera la percezione sensoriale dei grassi — cita Drewnowski e Schwartz, 1990.
4. La combinazione zuccheri + grassi aumenta la palatabilità.
5. Chi dimagrisce in low carb spesso riduce anche i lipidi e soprattutto l'apporto calorico totale: il beneficio deriva dal deficit energetico, non dall'eliminazione dei carboidrati.
6. Leggere le etichette e usare un'app per monitorare l'alimentazione aiuta a capire quali macronutrienti contribuiscono all'introito.

Chiusura promozionale sul libro "Project Nutrition": ignorata, non pertinente.

## Verifica

### 2 — Composizione degli alimenti (CONFERMATA, con precisazione nostra)

Fonte usata: `data/food-crea.json` del repo giamm-system — tabelle CREA, aggiornamento 2019, 900 alimenti letti da alimentinutrizione.it. Calcolo nostro: g carboidrati × 4, g proteine × 4, g grassi × 9, poi percentuali arrotondate a somma 100.

| Alimento | codice CREA | kcal/100 g | % kcal carb | % kcal grassi | % kcal pro |
|---|---|---|---|---|---|
| Crema di nocciole e cacao | 203500 | 537 | 42 | **53** | 5 |
| Patatine, fritte, in busta | 006570 | 512 | 45 | **51** | 4 |
| Lasagna | PC0048 | 196 | 27 | **49** | 24 |
| Wafer ricoperto di cioccolato | 214500 | 498 | 47 | **47** | 6 |
| Crackers, al formaggio | 001000 | 498 | 47 | **45** | 8 |
| Cornetti | 002500 | 403 | 53 | **40** | 7 |
| Merendine, farcite con cacao | 210040 | 410 | 62 | **32** | 6 |
| Grissini | 002000 | 421 | 60 | **29** | 11 |
| Biscotti, frollini | 000900 | 426 | 65 | **28** | 7 |
| Pasta di semola, cotta | 000805 | 175 | 82 | **3** | 15 |
| Pane bianco | 000530 | 268 | 86 | **2** | 12 |

**Angolo originale dell'articolo**: il post si ferma a "anche i cibi da carboidrati hanno grassi". I dati mostrano una linea di separazione più netta: le fonti NON trasformate (pane, pasta, riso, patate) sono praticamente prive di grassi, mentre tutto ciò che è composto o industriale sta tra il 28% e il 53% di calorie dai grassi. La variabile non è il macronutriente, è il grado di trasformazione. Questa precisazione è il valore aggiunto rispetto al post.

### 3 — Drewnowski e Schwartz 1990 (CONFERMATA)

PMID **2369116** verificato. *Invisible fats: sensory assessment of sugar/fat mixtures.* Appetite 1990 Jun;14(3):203-217. DOI 10.1016/0195-6663(90)90088-p.
50 studentesse normopeso, 15 stimoli tipo glassa per torte, saccarosio 20-77% p/p, burro 15-35% p/p. La dolcezza percepita seguiva il saccarosio; il grasso percepito dipendeva dalla texture e **aumentando il saccarosio le valutazioni di grassezza scendevano**. Gli autori scrivono esplicitamente che questo può spiegare perché molti dessert dolci e ricchi di grassi siano visti come alimenti ricchi di carboidrati.
Limite dichiarato nell'articolo: campione piccolo, matrice artificiale, dato sensoriale e non sul peso.

### 4 — Palatabilità della combinazione (CONFERMATA e rafforzata)

PMID **29909968**. DiFeliceantonio et al., 2018. *Supra-Additive Effects of Combining Fat and Carbohydrate on Food Reward.* Cell Metab 28(1):33-44. DOI 10.1016/j.cmet.2018.05.018.
Task d'asta + fMRI: disponibilità a pagare superiore per alimenti grassi+carboidrati rispetto ad alimenti ugualmente familiari, graditi e isocalorici composti da solo grasso o solo carboidrati. Inoltre: stima della densità energetica **migliore** per i cibi grassi e **peggiore** per i misti. Quest'ultimo dato serve anche come precisazione sull'affermazione 6.

### 5 — Deficit energetico vs eliminazione dei carboidrati (DA PRECISARE)

- PMID **29466592** — DIETFITS, Gardner et al., JAMA 2018;319(7):667-679. 609 adulti, 12 mesi, −5,3 kg (low fat) vs −6,0 kg (low carb), differenza 0,7 kg, IC 95% −0,2…1,6: non significativa. Nessuna interazione con genotipo (p=0,20) o secrezione insulinica INS-30 (p=0,47). → dà ragione al post.
- PMID **33317019** — Chawla et al., Nutrients 2020. 38 RCT, 6.499 adulti: a 6-12 mesi vantaggio low carb di −1,30 kg (IC −2,02…−0,57), con LDL più alto di 0,07 mmol/L.
- PMID **26768850** — Mansoor et al., Br J Nutr 2016. 11 RCT, 1.369 partecipanti, ≥6 mesi: vantaggio low carb −2,17 kg (IC −3,36…−0,99), LDL +0,16 mmol/L.
→ La conclusione del post è sostanzialmente corretta ma non del tutto neutra: nella vita reale un piccolo vantaggio low carb esiste. Etichettata "Da precisare" e non "Confermata".

### Affermazione implicita SMENTITA (aggiunta nostra, non presente nel post)

PMID **33479499** — Hall et al., Nat Med 2021;27(2):344-353. 20 adulti ricoverati al NIH Clinical Center, crossover 2+2 settimane, cibo ad libitum: dieta povera di grassi (10,3% grassi, 75,2% carboidrati) vs chetogenica (75,8% grassi, 10,0% carboidrati). La **povera di grassi** ha prodotto **689 ± 73 kcal/die in meno** sulle due settimane (p<0,0001) e 544 ± 68 kcal/die in meno nell'ultima settimana. Un partecipante ritirato per ipoglicemia durante la low carb.
PMID **31105044** — Hall et al., Cell Metab 2019;30(1):67-77. 20 adulti ricoverati, 2+2 settimane, ultraprocessata vs non processata con calorie offerte, densità energetica, macronutrienti, zuccheri, sodio e fibra equiparati: **+508 ± 106 kcal/die** (p=0,0001) con l'ultraprocessata, +0,9 ± 0,3 kg in 2 settimane contro −0,9 ± 0,3 kg.
→ Insieme sostengono l'angolo dell'articolo: conta la forma del cibo, non il macronutriente.

### 6 — Monitorare con un'app (DA PRECISARE)

Il consiglio è buono. Precisazione sostenuta da PMID 29909968: la stima a occhio della densità energetica è peggiore proprio sui cibi che uniscono grassi e carboidrati, quindi il dato scritto serve più della sensazione.

## Nessuna fonte trovata / non usato

- Nessuna affermazione del post è risultata priva di supporto: non ci sono voci "Non verificabile" in questo articolo.
- Non abbiamo usato i commenti al post (non sono fonte).

## Decisioni editoriali

- Keyword principale: "carboidrati fanno ingrassare". Correlate: grassi nascosti negli alimenti, calorie dai carboidrati, dieta low carb funziona, leggere le etichette nutrizionali.
- Elemento originale obbligatorio: due grafici SVG (ripartizione calorica CREA; calorie spontanee nei due studi NIH) più la tabella CREA, tutti costruiti da noi.
- Box Nurvan agganciato al database alimenti CREA già presente nell'app (`data/food-crea.json`) e alla ripartizione giornaliera dei macronutrienti: pertinente, non slogan.
- Link interni: proteine-in-definizione (anche nel corpo, nel passo 5), riso-raffreddato-amido-resistente, cbl-514-farmaco-grasso-sottocutaneo. Nelle lingue diverse dall'italiano puntano a `/<lang>/blog/<slug-lingua>` secondo gli slug nel frontmatter degli articoli esistenti.
- Nessun consiglio medico personale: il rimando a medico/nutrizionista è presente in tutte le lingue, insieme al disclaimer standard.
