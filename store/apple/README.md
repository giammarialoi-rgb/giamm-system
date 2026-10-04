# Pubblicare Nurvan su App Store — percorso passo passo

Contenuto di questa cartella:

| File / cartella | A cosa serve |
|---|---|
| `listing.md` | nome, sottotitolo, descrizione, parole chiave, URL, novità (IT + EN) da incollare |
| `app-privacy-labels.md` | risposte alle «etichette nutrizionali» (Privacy dell'app), età, crittografia |
| `review-notes.md` | note e account di prova per il revisore |
| `subscriptions.md` | abbonamenti: gruppo, ID, descrizioni, prezzi, screenshot |
| `screenshots/iphone-6.9/` | 8 screenshot 1320×2868 (obbligatori) |
| `screenshots/iphone-6.5/` | 8 screenshot 1284×2778 (facoltativi) |
| `app-icon-1024.png` | icona 1024×1024 |

L'app è **solo iPhone** (impostato nel progetto): non servono screenshot iPad. Per tornare a iPhone+iPad basta rimettere `TARGETED_DEVICE_FAMILY = "1,2"` in `ios/App/App.xcodeproj/project.pbxproj`, ma allora Apple chiede anche le schermate iPad e la revisione guarda come si vede su iPad.

## Prima di tutto (una tantum)
1. **Apple Developer Program** attivo (99 $/anno). Se è un account individuale, il nome del venditore sullo store è il tuo nome e cognome.
2. App Store Connect › **Business**: accordo *Apps a pagamento*, conto bancario, modulo fiscale. Servono per gli abbonamenti.
3. L'app esiste già in App Store Connect con bundle ID `com.nurvan.app` (la build di TestFlight la carica).

## Sequenza
1. **Compila i campi del titolare** in `web/features.json` → `legal` (già compilati il 03-04/10). Controlla che https://nurvan.app/privacy e /termini non mostrino «Bozza».
2. **Configura gli acquisti** — `../../docs/store/ACQUISTI_IN_APP.md` (RevenueCat + chiavi + prodotti), e `subscriptions.md` per la parte App Store Connect. Metti su Render le variabili `REVENUECAT_*`.
3. **Crea gli account dei revisori** (le password restano solo a te):
   ```bash
   DATABASE_URL="<la stringa del database di produzione, da Render › Postgres › External>" node tools/seed_review_accounts.mjs
   ```
   Copia le password stampate nei campi di `review-notes.md`. Rilancialo quando vuoi nuove password.
4. **Build**: dopo la CI verde, `gh workflow run "iOS TestFlight" --ref main`. Attendi l'elaborazione (10-30 min), poi installa da TestFlight sul tuo iPhone.
5. **Prova su dispositivo vero** (questo è il passaggio che non posso fare io): accesso con email e con Apple, un allenamento, Coach AI, acquisto sandbox di un piano, ripristino acquisti, eliminazione account (su un account di prova).
6. **Scheda dell'app**: incolla i testi di `listing.md` (IT principale, EN aggiunta), carica le schermate, l'icona, gli URL.
7. **Privacy dell'app**: compila come `app-privacy-labels.md` e premi *Pubblica*. Poi il questionario sull'età.
8. **Abbonamenti**: crea gruppo e prodotti come `subscriptions.md`, allegali alla versione.
9. **Informazioni per la revisione**: account e note da `review-notes.md`.
10. **Seleziona la build**, scegli *Rilascio manuale* (così decidi tu quando uscire dopo l'approvazione) e **Invia per la revisione**.

## Dopo l'invio
- Prima revisione: di solito 24-48 ore. I rifiuti più probabili per questa app (e come rispondere) sono in `review-notes.md`: 3.1.1 (acquisti), 1.2 (chat tra utenti), 5.1.1/5.1.2 (dati sanitari e AI) e 4.2 (app che è un sito impacchettato: nelle note ci sono le funzioni native).
- Se rifiutano, rispondi nello **Resolution Center** con calma e dettagli; non serve ricostruire l'app per rispondere a un chiarimento.
