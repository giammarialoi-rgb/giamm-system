# Account demo per i revisori (Apple e Google)

Tre account già pronti, con dati di esempio inventati (nessuna persona reale). Le password **non sono in questo
repository**: le crea lo script, le mostra una volta sola, e le inserisci tu in App Store Connect / Play Console.

| Account | Piano | A cosa serve al revisore |
|---|---|---|
| `review-free@nurvan.app` | Free | **Paywall e acquisto**: pagina Piani, bottoni degli acquisti dello store, Ripristina acquisti, funzioni gratuite |
| `review-coach@nurvan.app` | Coach Pro | Tutte le schermate, **modalità Coach** (clienti, chat, segnalazione e blocco, gestionale, marchio, questionario) |
| `review-athlete@nurvan.app` | Free | Lato atleta (un coach lo può collegare con un invito) |

I tre account hanno la stessa base di dati (vedi sotto) e il piano è "manuale": un acquisto o un evento dello store non lo
cambia, quindi i dati e il piano restano quelli finché non rilanci lo script.

## Cosa contengono

- un **programma attivo** scritto dal generatore dell'app («Demo Nurvan · Full body 3 giorni · 6 settimane»);
- **5 allenamenti nel diario** con le serie spuntate (settimana 1 completa, settimana 2 iniziata) e 5 sedute concluse nello storico;
- **un giorno di pasti** nel diario alimentare (colazione, pranzo, merenda, cena) con calorie e macro;
- **un integratore** (creatina), **una voce di terapia** di esempio (vitamina D3, scritta come «non è una prescrizione») e **due esami** inventati (glicemia, vitamina D);
- **tre check fisici** con il peso.

Le date sono spostate al giorno in cui lanci lo script, così lo storico è sempre «di questi giorni».

## Come ricrearli

Serve l'URL del database di produzione (Render → il database → *External Database URL*). Non incollarlo in nessuna chat.

```powershell
$env:DATABASE_URL = "postgres://..."
node tools/seed_review_accounts.mjs
```

Lo script:

1. crea gli account se non ci sono (o rimette password nuova e verifica email se ci sono già);
2. imposta il piano (`coach_pro`, `free`, `free`) con sorgente "manuale", senza scadenza;
3. carica i dati di esempio da `tools/review-demo/demo-account-data.json` (**sostituisce** i dati di quegli account: non usarlo su un account vero);
4. stampa le tre password. **Si vedono solo ora**: copiale subito in App Store Connect → *App Review Information → Sign-in required* (un account per riga di note) e in Play Console → *App access*.

Opzioni: `--no-data` lascia i dati degli account come sono (cambia solo password e piano).

Per rifare il file dei dati (ad esempio dopo un cambio del generatore di schede):

```powershell
npm run build:web
node preview-webapp.mjs            # in un altro terminale, porta 4173
node tools/review-demo/build_demo.mjs
```

I tre file da importare (PDF, CSV, immagine) si rifanno con `node tools/review-demo/build_samples.mjs`.

## File di esempio da importare

In `docs/review-samples/` (inventati):

| File | Come si prova |
|---|---|
| `scheda-demo.pdf` | Menu → Database → importa: legge una scheda di 2 giorni dal documento |
| `scheda-demo.csv` | stesso percorso: la stessa scheda come tabella |
| `etichetta-demo.png` | Alimentazione → aggiungi alimento → foto/etichetta: legge i valori nutrizionali |

Vanno messi sul telefono del revisore (o allegati nelle note), perché l'app li legge dal selettore file del telefono.

## Paywall e acquisto in sandbox

1. In App Store Connect → *Users and Access → Sandbox* crea un tester Sandbox (email mai usata come ID Apple).
2. Sul telefono: Impostazioni → App Store → *Account Sandbox*: accedi con il tester.
3. In app, accedi con **review-free@nurvan.app** → Menu → **Piani**: si vedono i piani con prezzo, durata e rinnovo automatico, i link a Termini e Privacy, RIPRISTINA ACQUISTI e GESTISCI ABBONAMENTO.
4. Acquisto: scegli un piano → conferma con l'account Sandbox. A fine acquisto il piano dell'account passa al piano acquistato (lo stato arriva da RevenueCat).
5. Ripristino: da un altro telefono (o dopo aver reinstallato) → Piani → RIPRISTINA ACQUISTI.

Perché funzioni devono essere veri, sullo store e su RevenueCat: i cinque prodotti in stato *Ready to Submit* e allegati alla versione,
l'Offering `default` come corrente con un pacchetto per prodotto, e le chiavi `REVENUECAT_SECRET_KEY` e `REVENUECAT_WEBHOOK_AUTH` su Render.
Dettagli e id dei prodotti: `docs/store/ACQUISTI_IN_APP.md`, `store/apple/subscriptions.md`.

Il piano del revisore parte come "manuale": dopo un acquisto sandbox lo store prende il comando (se vuoi ripartire da Free rilancia lo script).

## Eliminazione account (da provare)

Impostazioni → *Privacy e dati* → **ELIMINA ACCOUNT** → scrivi `ELIMINA` → conferma. Cancella l'account e i dati sul server.
Dopo averla provata, rilancia lo script per rifare gli account.

## Cose da sapere

- Il primo avvio chiede i consensi (età, termini, dati sulla salute): il revisore li accetta. I consensi alle funzioni AI sono separati e si chiedono al primo uso.
- Registrazione libera (per chi vuole provarla): l'email riceve un codice a 6 cifre da digitare nell'app.
- Il server su Render può impiegare qualche secondo a svegliarsi dopo un periodo di inattività.

## Account in più per i tester (test chiuso)

```powershell
$env:DATABASE_URL = "postgres://..."
node tools/seed_review_accounts.mjs --only-testers 10
```

Crea `tester-01@nurvan.app` … `tester-10@nurvan.app` (piano Free, con i dati di esempio; massimo 50). **`--only-testers` non tocca i tre account dei revisori**, quindi le loro password già date ad Apple e Google restano valide. Senza questa opzione lo script rigenera anche le password dei revisori. Le password si vedono una volta sola. Rilanciando per lo stesso numero le password cambiano: usalo anche per rifare un account che un tester ha eliminato.
