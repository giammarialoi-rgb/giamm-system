# Appunti di lavorazione (uso interno) — 2026-11-16

## Perché questo articolo
Scelta per regola EVENTI del passo 1a, non dalla coda di inbox.md.
- I Mondiali IPF Open Equipped di Istanbul (9-15 novembre 2026) si sono chiusi il 15 novembre: dentro la finestra dei 7 giorni dalla conclusione.
- L'ultimo articolo `category: eventi` era del 2026-11-04 (anteprima di Istanbul, pubblicata il 5 novembre): 12 giorni fa, quindi fuori dalla finestra dei 7 giorni.
- Condizione mancante nei controlli dei giorni precedenti (11-15 novembre): i risultati ufficiali. Oggi esistono: l'IPF ha pubblicato la pagina risultati dell'evento con i quattro PDF (scoresheet uomini e donne, team points uomini e donne), datati 2026-11-15.

## Fonti ufficiali usate (scaricate e analizzate)
- Men_Results_2026_IPF_World_Open_Equipped_Powerlifting_Championships_2026-11-15.pdf
- Women_Results_2026_IPF_World_Open_Equipped_Powerlifting_Championships_2026-11-15.pdf
- Men_Team_Points / Women_Team_Points — 2026 IPF World Open Equipped Powerlifting Championships
- Confronto: Men_Results_07.pdf e Women_Results_08.pdf dei 2026 IPF World Classic Powerlifting Championships (Druskininkai, 13-21/06/2026)
Pagina risultati IPF: https://www.powerlifting.sport/championships/results/2026/world-open-equipped-powerlifting-championships-2026
Scartato: goodlift.info (non raggiungibile da fetch) e results.kraft.is (già inaffidabile nelle edizioni precedenti). Non servivano: i PDF ufficiali bastano.

## Numeri verificati dagli scoresheet (parsing riga per riga)
- Istanbul: 179 righe di piazzamento = 179 atleti unici (96 uomini, 83 donne), 34 nazioni (30 uomini, 26 donne), 16 categorie.
- 24 righe su 179 senza piazzamento (13,4%) = nessun totale valido. Classic 2026: 5 su 351 (1,4%).
- Record: 17 maschili + 15 femminili = 32. Divisioni: Open 9, Master 1 9, Master 2 9, Junior 5.
- Best lifter: Musiienko (UKR) 1064,5 kg / 115,442896 GL; McCarthy (USA) 655,0 kg / 113,882230 GL.
- Squadre uomini: UKR 51, TPE 42, JPN 38, NOR 38 (JPN terza sui migliori cinque: 12+9+6+6+5). Donne: CAN 43, TPE 42, BRA 34.
- Italia: 6 atleti. Mancinelli 3° 120 kg (410/257,5/305 = 972,5); Caneo 5° 66 kg 652,5; Cecchetti 8° 93 kg 852,5; Milani 9° 74 kg 760,0; Caravaggio 5ª 69 kg 552,5; Marostica 10ª 76 kg 530,0. Squadra uomini 9ª (19 punti, 4 atleti), donne 19ª (7 punti, 2 atlete).
- Olech (POL, 1974) 1° 74 kg con 865,0 kg; record Master 2 su squat 360, panca 205 e totale. Lillo (USA, 2006) 2° con 852,5 e record Junior nel totale.
- Pareggi: donne 76 kg tre atlete a 610,0 (2ª-3ª-4ª per peso corporeo); donne 47 kg Chen e Duno a 480,0 (Chen 46,50 kg contro 46,95); uomini 105 kg Bell e Lentz-Nielsen a 1050,0.

## Elaborazioni originali Nurvan
1. Terzo tentativo mancato = terzo peso dichiarato > miglior risultato di quella alzata (deducibile con certezza dallo scoresheet; i tentativi sotto il miglior risultato non sono classificabili, quindi la quota è una stima per difetto delle alzate nulle).
   Istanbul: squat 75/176 = 42,6%; panca 76/175 = 43,4%; stacco 92/152 = 60,5%.
   Druskininkai: squat 105/347 = 30,3%; panca 148/345 = 42,9%; stacco 162/344 = 47,1%.
   (I denominatori diversi dipendono dagli atleti che non hanno effettuato tutti e tre i tentativi.)
2. Distacchi di podio: 48 per gara (1°-2°, 2°-3°, 3°-4° nelle 16 categorie).
   Istanbul: ≤6,09 kg 15/48 = 31%; ≤16,9 kg 29/48 = 60%; mediana 12,5 kg; 6 distacchi a 0,0 kg.
   Druskininkai: ≤6,09 kg 16/48 = 33%; ≤16,9 kg 30/48 = 62%; mediana 11,5 kg.
   Soglie prese da Amdi et al., 2026 (SEM del totale 6,09 kg; MDD = 2,77 × SEM ≈ 16,9 kg).
3. Controllo di coerenza: per ogni atleta la somma delle tre migliori alzate è stata confrontata con il totale ufficiale; le righe incoerenti (>0,6 kg di scarto) sono state escluse dalle medie.

## Fonti scientifiche (PubMed)
- Amdi et al., 2026, J Strength Cond Res, PMID 42862018 — SEM: squat 4,16 kg (2,20%), panca 2,60 kg (2,09%), stacco 4,07 kg (1,95%), totale 6,09 kg (1,17%); 14,3-44,2 kg per guadagnare una posizione; differenze fra piazzamenti spesso dentro l'errore di misura, soprattutto ai Mondiali.
- Robinson et al., 2024, Sports Med, PMID 38970765 — forza simile su un ampio range di RIR; ipertrofia migliore vicino al cedimento.
- Odgers et al., 2021, J Strength Cond Res, PMID 33629974 — errore di stima RIR 0,09-0,25 rip a RPE 9 contro 0,71-1,19 a RPE 6.
- Motlagh & Lipps, 2024, J Strength Cond Res, PMID 39808810 — preferire RPE/RIR, VBT e autoregolazione alle serie a cedimento.

## Note editoriali
- Angolo scelto perché l'anteprima del 4 novembre aveva già trattato "quanto aggiunge l'attrezzatura" (confronto equipped/classic sui pesi vincenti): qui il confronto è su tutto il campo gara e su due metriche nuove (terzi tentativi e distacchi di podio).
- Nessun pronostico, nessun commento su singoli atleti oltre ai dati ufficiali, nessun consiglio medico personale.
- Meta description: per `zh` la lunghezza è contata in caratteri CJK (66), non nel range 140-160 pensato per gli alfabeti latini.
- Pilastro: allenamento (categoria eventi). Conteggio pilastri prima di questo articolo: allenamento 20, integrazione 10, nutrizione 9, coaching 6.
