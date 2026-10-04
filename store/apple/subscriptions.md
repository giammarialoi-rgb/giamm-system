# App Store Connect › Abbonamenti

Prerequisiti (una tantum, sezione **Business** / **Accordi, fiscalità e banca**): contratto *Apps a pagamento* accettato, conto bancario e modulo fiscale compilati. Senza questi gli abbonamenti non si possono vendere né testare in produzione.
Guida completa al collegamento con RevenueCat: `../../docs/store/ACQUISTI_IN_APP.md`.

## Gruppo di abbonamenti
App › **Monetizzazione › Abbonamenti** › crea il gruppo **`Nurvan`** (un solo gruppo: così l'utente passa da un livello all'altro senza pagare due volte).
Nome visibile del gruppo (IT): `Nurvan` · (EN): `Nurvan`

Livelli nel gruppo, dal più alto al più basso (l'ordine decide cosa è upgrade/downgrade):
1. Coach Pro (`nurvan.coach_pro.*`)
2. Coach (`nurvan.coach.*`)
3. Standard (`nurvan.standard.year`)

> I due Coach Pro sono stati creati su App Store come `nurvan.coach.pro.month` / `nurvan.coach.pro.year`: il server li accetta (alias). Su Google Play usa le stesse grafie.

## Prodotti — ID ESATTI (devono essere identici in Play e in `web/features.json`)

| ID prodotto | Durata | Piano che sblocca | Prezzo del piano oggi (`features.json`) |
|---|---|---|---|
| `nurvan.standard.year` | 1 anno | Standard (fino a 3 clienti) | 24 € |
| `nurvan.coach.month` | 1 mese | Coach (fino a 20 clienti) | 19 € |
| `nurvan.coach.year` | 1 anno | Coach | 190 € |
| `nurvan.coach_pro.month` | 1 mese | Coach Pro (clienti illimitati) | 39 € |
| `nurvan.coach_pro.year` | 1 anno | Coach Pro | 390 € |

Apple propone fasce di prezzo fisse: scegli quella più vicina (es. 23,99 / 18,99 / 189,99 / 38,99 / 389,99 €) e, se vuoi prezzi tondi uguali ovunque, aggiorna anche `features.json`.

Prezzi: **li scegli tu in App Store Connect** (l'app mostra quello dello store, nella valuta dell'utente). Allinea i prezzi a quelli del sito tenendo conto della commissione Apple (15% con lo *Small Business Program*, da chiedere: ricavi < 1 M$/anno).
Metti gli stessi prezzi in Google Play per non avere scarti tra gli store.

Per ogni prodotto compila:
- **Nome di riferimento** (interno): es. `Coach mensile`
- **ID prodotto**: dalla tabella
- **Localizzazioni** (IT e EN) — nome visibile e descrizione:

| ID | Nome IT (≤30) | Descrizione IT (≤45) | Nome EN | Descrizione EN |
|---|---|---|---|---|
| `nurvan.standard.year` | Standard annuale | Più funzioni per allenarti, per un anno | Standard yearly | More features for your training, 1 year |
| `nurvan.coach.month` | Coach mensile | Modalità coach per seguire i tuoi clienti | Coach monthly | Coach mode to follow your clients |
| `nurvan.coach.year` | Coach annuale | Modalità coach per i tuoi clienti, 1 anno | Coach yearly | Coach mode for your clients, 1 year |
| `nurvan.coach_pro.month` | Coach Pro mensile | Tutte le funzioni coach, senza limiti | Coach Pro monthly | All coach features, no client limit |
| `nurvan.coach_pro.year` | Coach Pro annuale | Funzioni coach complete, clienti illimitati | Coach Pro yearly | Full coach features, unlimited clients |

  (I limiti di clienti per piano sono quelli della tabella sopra: se li scrivi nella descrizione, tienili uguali.)
- **Screenshot per la revisione** (uno per prodotto, obbligatorio): `subscription-review-screenshot.png` in questa cartella (la schermata dei Piani come appare su iPhone con i prezzi dello store); lo stesso file va bene per tutti e 5. Quando hai la build su TestFlight puoi sostituirlo con uno schermo reale.
- **Note di revisione** del prodotto: `Abbonamento che sblocca il piano indicato nell'app. Si acquista da MENU › Piani & Pro.`
- **Offerte introduttive**: nessuna (la prova gratuita di 14 giorni della modalità Coach è gestita dall'app, una sola volta per account, senza passare dallo store). Non aggiungere un secondo periodo di prova negli store finché non lo decidi.

## Cosa deve mostrare l'app (già implementato)
Apple (3.1.2) richiede nella schermata d'acquisto: nome, durata e prezzo; indicazione di rinnovo automatico e come disdire; link a termini e privacy; **Ripristina acquisti**. La schermata Piani lo fa. Nessun rimando a pagamenti esterni dentro l'app (3.1.1/3.1.3(b)).

## Dopo aver creato i prodotti
1. In **RevenueCat** importa i prodotti, collegali agli *entitlement* e all'*offering* (guida in `ACQUISTI_IN_APP.md`).
2. Crea gli utenti **Sandbox**: App Store Connect › Utenti e accessi › Sandbox. Su iPhone: Impostazioni › App Store › Account Sandbox.
3. Prova su TestFlight: acquisto, rinnovo (nel sandbox un mese dura 5 minuti), annullamento, ripristino, passaggio da Coach a Coach Pro.
4. Allegare i prodotti alla versione: nella pagina della versione, sezione **Acquisti in-app e abbonamenti** › seleziona i cinque prodotti. Il **primo invio** degli abbonamenti deve viaggiare insieme alla nuova versione dell'app.
