# Google Play Console › Abbonamenti

Prerequisiti:
- **Profilo dei pagamenti (merchant)** collegato alla Console (Impostazioni › Profilo dei pagamenti): nome, indirizzo, conto bancario, dati fiscali.
- L'app con la libreria di acquisto deve essere stata **caricata almeno su una traccia** (la build Android Play del workflow la carica sul test interno): solo dopo la Console permette di creare gli abbonamenti.
- Guida al collegamento con RevenueCat: `../../docs/store/ACQUISTI_IN_APP.md` (account di servizio, chiave Play, ecc.).

## Prodotti — ID ESATTI (uguali a App Store e a `web/features.json`)

Play usa «abbonamento» + «piano base». L'**ID abbonamento** è quello della tabella. Il **piano base** ha ID libero (sotto uno suggerito); l'app legge solo la parte prima dei due punti.

| ID abbonamento | Piano base (ID) | Durata | Piano Nurvan | Prezzo oggi |
|---|---|---|---|---|
| `nurvan.standard.year` | `annuale` | 1 anno, rinnovo automatico | Standard (3 clienti) | 24 € |
| `nurvan.coach.month` | `mensile` | 1 mese | Coach (20 clienti) | 19 € |
| `nurvan.coach.year` | `annuale` | 1 anno | Coach | 190 € |
| `nurvan.coach_pro.month` | `mensile` | 1 mese | Coach Pro (illimitati) | 39 € |
| `nurvan.coach_pro.year` | `annuale` | 1 anno | Coach Pro | 390 € |

Per ogni abbonamento:
- **Nome** (IT): `Standard annuale`, `Coach mensile`, `Coach annuale`, `Coach Pro mensile`, `Coach Pro annuale`.
- **Descrizione** (≤80): `Sblocca le funzioni del piano Standard di Nurvan.` (analoga per gli altri).
- **Piano base**: rinnovo automatico, periodo di fatturazione come tabella, **periodo di tolleranza** per pagamenti rifiutati: 7 giorni (consigliato), «sospensione dell'account» sì.
- **Prezzi**: impostali in euro e lascia che Play converta nelle altre valute (o usa gli stessi che metti su Apple).
- **Nessuna offerta di prova gratuita** nello store (la prova di 14 giorni della modalità Coach è gestita dall'app, una volta per account). Se in futuro vuoi offerte, crea una *offerta* sul piano base.
- Stato: **Attivo** (altrimenti RevenueCat non lo vede).

Dopo la creazione:
1. In RevenueCat collega l'app Android, importa i prodotti, agganciali agli *entitlement* (`standard`, `coach`, `coach_pro`) e all'*offering* (`ACQUISTI_IN_APP.md`).
2. Aggiungi **tester di licenza** (Impostazioni › Test della licenza): le email Google che possono comprare senza pagare davvero; negli abbonamenti di test un mese dura 5 minuti.
3. Provali dalla versione di test (interno o chiuso) sul telefono con un account tester di licenza: acquisto, rinnovo, annullamento, ripristino.

Politiche da rispettare (già coperte nell'app): addebito solo tramite Play Billing per i piani; nessun invito a pagare fuori da Play nell'app (le offerte del sito si pubblicizzano solo fuori dall'app); mostra prezzo, periodo, rinnovo e come annullare prima dell'acquisto.
