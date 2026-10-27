# Appunti di lavorazione (uso interno) — 2026-10-27

## Perché questo articolo: EVENTO (passo 1a)

I Mondiali IPF Classic & Equipped Masters di Reno (Nevada) si sono chiusi il 24-25 ottobre 2026, quindi dentro la finestra dei 7 giorni; l'ultimo articolo `category: eventi` in content/articles/ è del 2026-10-10 (anteprima di Reno), cioè 17 giorni fa: articolo di evento ammesso.

Differenza rispetto ai controlli dal 20 al 26 ottobre, che avevano tutti rinviato il resoconto: **oggi i risultati ufficiali esistono**. L'IPF ha pubblicato la pagina
https://www.powerlifting.sport/championships/results/2026/world-masters-classic-equipped-powerlifting-championships-2026
con otto PDF (uomini/donne × classic/equipped, scoresheet dettagliati + punti a squadre). Scaricati tutti e quattro gli scoresheet e convertiti in testo:
- Men_Results_2026_IPF_World_Masters_Classic_Powerlifting_Championships_2026-10-21.pdf
- Women_Results_2026_IPF_World_Masters_Classic_Powerlifting_Championships_2026-10-21.pdf
- Men_Results_2026_IPF_World_Masters_Equipped_Powerlifting_Championships_2026-10-25.pdf
- Women_Results_2026_IPF_World_Masters_Equipped_Powerlifting_Championships_2026-10-25.pdf

results.kraft.is resta inutilizzabile (0 partecipanti, tabelle vuote, date sbagliate): non usata.

## Dati estratti e verificati (parsing dei quattro PDF ufficiali)

- Intestazione dei PDF: "Reno, Nevada, United States of America - 15-10-2026 to 24-10-2026". Nell'articolo si usano queste date, non quelle del calendario IPF (14-25), perché sono quelle dei risultati finali.
- 465 piazzamenti (classic 338, equipped 127), 443 atleti unici (nome + anno di nascita), 41 nazioni.
- Età: minima 40, massima 82, mediana 54.
- 68 record del mondo nelle "List of Records" dei quattro documenti: Master 1 → 9, Master 2 → 11, Master 3 → 33, Master 4 → 15 (quindi 48 su 68 nelle due fasce più anziane); 40 di donne, 28 di uomini.
- Classifiche a squadre classic: USA primo in tutte e quattro le fasce maschili e in tutte e quattro le femminili (8 su 8).
- Best lifter classic: Nathan Kulas (USA, 1983, 91,40 kg) 817 kg / 107,792529 GL; Dayna McNeal (USA, 1984, 75,40 kg) 540 kg / 106,865460 GL.
- Michael Garozzo (USA, 1982, 104,70 kg): squat 328,0, stacco 351,0, totale 861,5 — tre record Master 1 nei 105 kg (righe 16, 17, 18 della lista record uomini classic).
- Italia, 8 atleti classificati, 7 podi, 5 ori:
  Pisano Martina (1986, 46,55, F M1 47 kg) 130,5/72,5/147,5 = 350,5 — oro, record squat 130,5 (19-10);
  Guidi Elisa (1982, 50,15, F M1 52 kg) 387,5 — argento;
  Romussi Allegra (1983, 64,35, F M1 69 kg) 462,5 — argento;
  Arienta Luisa (1976, 51,30, F M2 52 kg) 365,0 — oro;
  Girardi Marzia (1963, 46,30, F M3 47 kg) 97,5/47,5/162,5 = 307,5 — oro;
  Canella Barbara (1966, 51,20, F M3 52 kg) 305,0 — oro;
  Cuoghi Alessandro (1975, 90,95, M M2 93 kg) 275/177,5/275 = 727,5, GL 96,216968 — oro e 2° best lifter M2 (1° Sean Manders RSA 96,538260);
  Xaxa Matteo (1986, 59,00, M M1 59 kg) 487,5 — quarto.
- Girardi: lo stacco da 162,5 kg del 16-10-2026 compare TRE volte nella lista record donne classic (righe 19, 20, 21) come record 47 kg di Master 1, Master 2 e Master 3, più il record di totale M3 (riga 22, 307,5). 162,5 / 46,30 = 3,51 volte il peso corporeo.

## Elaborazioni originali Nurvan (grafici)

Mediana punti IPF GL, gara classic, per fascia:
- Uomini: M1 89,7 (n=54) · M2 81,3 (n=54) · M3 73,5 (n=41) · M4 55,3 (n=18) → -9,4%, -18,1%, -38,4% rispetto a M1
- Donne: M1 86,2 (n=62) · M2 79,6 (n=50) · M3 70,5 (n=42) · M4 60,2 (n=17) → -7,6%, -18,2%, -30,1%

Quota mediana di ciascuna alzata sul totale, gara classic:
- M1 (n=116) SQ 36,7 · BP 21,7 · DL 41,7
- M2 (n=104) SQ 35,8 · BP 22,2 · DL 41,9
- M3 (n=83) SQ 35,7 · BP 20,7 · DL 43,1
- M4 (n=35) SQ 34,2 · BP 21,3 · DL 44,2
(Le mediane non sommano esattamente a 100: per questo il grafico è a barre raggruppate e non impilate.)

Limite dichiarato nel testo: confronto trasversale fra persone diverse, non longitudinale; fasce anziane poco numerose e doppiamente selezionate.

## Affermazioni classificate

- "Dopo i 40 la forza crolla" → DA PRECISARE (dati IPF: ~9% a decennio fino ai 69, poi gradino)
- "Se ti alleni non perdi forza" → SMENTITO (Pearson 2002 PMID 12131263: 0,6%/anno negli atleti contro 0,5% nei controlli, stessa pendenza)
- "Allenarsi da anziani non serve" → SMENTITO (stesso studio: +32% potenza e +32% forza isometrica; 85enne allenato = 65enne sedentario, ~20 anni di vantaggio)
- "Basta mantenere la massa" → SMENTITO (Goodpaster 2006 PMID 17077199: forza -3,4%/anno uomini bianchi, -2,6% donne bianche contro ~1%/anno di massa magra; guadagnare massa non ha protetto la forza, β -0,48 p=0,92 uomini e -1,68 p=0,64 donne)
- "A 80-90 anni è tardi" → SMENTITO (Fiatarone 1990 PMID 2342214: 9 soggetti di 90±1 anni, +174±31% di forza in 8 settimane, area della coscia +9,0±4,5%)
- "Dopo una certa età carichi leggeri" → DA PRECISARE (Borde 2015 PMID 26420238: effetto maggiore a 70-79% 1RM, 2 sedute/sett., 2-3 serie, 7-9 ripetizioni)
- "Il calo è uguale in tutte le alzate" → DA PRECISARE (nostra elaborazione, differenza di pochi punti)

Dato aggiuntivo usato: Pearson 2002 riporta che la potenza cala circa al doppio della velocità della forza isometrica (1,2% contro 0,6% l'anno).
Fonte nutrizionale: Bauer 2013 PROT-AGE PMID 23867520 — 1,0-1,2 g/kg/die oltre i 65 anni, ≥1,2 g/kg per chi è attivo; eccezione insufficienza renale grave.

## Vincoli rispettati

Nessun consiglio medico personale, nessun dosaggio di farmaci. Nessuna foto di federazioni, agenzie, organizzatori, social o atleti dell'evento: solo due foto in pubblico dominio (U.S. Army Reserve, licenza verificata sul wikitesto Commons) più due grafici originali in 10 lingue. Disclaimer esteso in tutte le lingue. I pronostici e i commenti sui singoli atleti si limitano a risultati verificati nei PDF ufficiali.
