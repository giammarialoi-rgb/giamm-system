# Pagamenti dal sito con Stripe

Stato al 05/10/2026: il codice è scritto e provato (firma del webhook, eventi, checkout con Stripe simulato, server su PostgreSQL reale). **Mai provato contro Stripe vero**: serve la modalità test (passo 4).

## Come funziona
- Si compra **solo in un browser** (app.nurvan.app, o il sito che rimanda lì). **Mai nelle app iOS/Android**, dove restano gli acquisti degli store: nelle app non compare Stripe, né il «primo mese gratis», né rimandi al sito (regole Apple 3.1.1/3.1.3(b) e Google).
- Pagina **Piani & Pro** nel browser: se si è entrati con l'account, per ogni piano c'è un pulsante per ciascun prezzo («ABBONATI · 19 € / mese»). Il pulsante chiede al server una sessione **Stripe Checkout** e porta alla pagina di pagamento di Stripe: la carta si scrive lì, Nurvan non la vede.
- Stripe avvisa il server con un **webhook firmato** (`POST /api/billing/stripe/webhook`); il server cambia il piano dell'account con origine `stripe`, nello stesso modo e con lo stesso storico degli acquisti degli store. Un piano comprato sul sito vale anche nell'app (stesso account).
- **Primo mese gratis** (30 giorni, una sola volta per account, `STRIPE_TRIAL_DAYS`): annunciato solo sul sito/browser. Si chiede comunque la carta; se non si annulla, dopo 30 giorni parte l'addebito.
- Cambio piano, annullamento (a fine periodo), fatture e carta: **portale clienti** di Stripe, dal pulsante «GESTISCI ABBONAMENTO».
- Regole di sicurezza già nel codice: chi ha un abbonamento in corso su App Store/Google Play non può pagare di nuovo dal sito; chi ha già un abbonamento Stripe va al portale; un piano più alto dato a mano non viene abbassato; un evento duplicato o arrivato in ritardo non fa danni; la fine di un abbonamento Stripe toglie solo il piano che dava Stripe.

## 1. Account Stripe
1. https://dashboard.stripe.com › crea l'account e completa i dati dell'attività (anche come persona fisica/ditta individuale: nome, indirizzo, codice fiscale, conto bancario per i pagamenti). Finché non è attivato si lavora in **modalità test**.
2. Impostazioni › **Attività › Dettagli pubblici**: nome «Nurvan», sito, email di assistenza (`info@nurvan.app`), indirizzo.
3. Impostazioni › **Pagamenti › Metodi di pagamento**: carte attive (e, se vuoi, Apple Pay/Google Pay, che funzionano da browser).
4. **Imposte**: se vendi con partita IVA, imposta l'IVA (Stripe Tax: Impostazioni › Tax, e poi `STRIPE_AUTOMATIC_TAX=1` su Render). Come privato/senza P. IVA chiedi al commercialista **prima** di incassare.
5. Impostazioni › **Billing › Fatture**: dati dell'emittente, numerazione, testo in fattura.

## 2. Prezzi e portale: lo script
Le chiavi si prendono da Stripe › Sviluppatori › Chiavi API (`sk_test_…` in test, `sk_live_…` in produzione). **Non incollarle in chat.**
```bash
STRIPE_SECRET_KEY="sk_test_..." node tools/stripe_setup.mjs
```
Crea (una sola volta, si può rilanciare): un prodotto per piano, un prezzo per ogni ID prodotto di `web/features.json` (`nurvan.standard.year`, `nurvan.coach.month`, `nurvan.coach.year`, `nurvan.coach_pro.month`, `nurvan.coach_pro.year`, in euro, con l'ID come *lookup key*), e la configurazione del portale clienti (cambio piano tra questi prezzi, annullamento a fine periodo, fatture, carta).
I prezzi sono quelli di `features.json` (24 / 19 / 190 / 39 / 390 €). Se li cambi: modifica `features.json` e rilancia lo script, che sposta la chiave sul nuovo prezzo.

## 3. Webhook
Con lo script (stampa il segreto **una volta**):
```bash
STRIPE_SECRET_KEY="sk_test_..." node tools/stripe_setup.mjs --webhook https://app.nurvan.app/api/billing/stripe/webhook
```
oppure a mano: Sviluppatori › Webhook › Aggiungi endpoint, URL sopra, eventi `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`; copia il *Signing secret* (`whsec_…`).

## 4. Variabili su Render
| Variabile | Valore |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` (test) poi `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` dell'endpoint (test e live sono diversi) |
| `STRIPE_TRIAL_DAYS` | già `30` in `render.yaml`; `0` per spegnere il mese gratis |
| `STRIPE_AUTOMATIC_TAX` | `1` solo se hai attivato Stripe Tax |
| `APP_PUBLIC_URL` | facoltativa (di default `https://app.nurvan.app/`): dove Stripe riporta dopo il pagamento |
Controllo: `https://app.nurvan.app/api/billing/config` deve contenere `"stripe": true`. Finché la chiave non c'è, la pagina Piani nel browser mostra «Contattaci» come prima.

## 5. Prova in modalità test
1. Dal browser entra con un tuo account di prova › Piani & Pro › «ABBONATI» su Coach (mensile).
2. Su Stripe usa la carta di prova `4242 4242 4242 4242`, scadenza futura, CVC qualsiasi. (Altre: `4000 0000 0000 9995` = pagamento rifiutato.)
3. Torni sull'app: «Abbonamento attivo»; il piano è Coach, con origine `stripe` (lo vedi anche in dashboard admin › account).
4. Prova: «GESTISCI ABBONAMENTO» (portale) › cambia in Coach Pro; poi annulla › il piano resta fino a fine periodo; poi nella dashboard Stripe › Abbonamenti « Annulla subito» › il piano torna Free.
5. Prova il mese gratis: il primo abbonamento è «in prova» (`trialing`); un secondo abbonamento dello stesso account non ha più la prova.
6. Stripe › Sviluppatori › Webhook › l'endpoint: gli eventi devono risultare consegnati con `200`.
7. **Orologio di prova** (Stripe › Test clocks) per simulare rinnovi e fine prova senza aspettare.

## 6. Passaggio a live
Rifai i passi 2-4 con le chiavi `sk_live_…` e il nuovo webhook live; fai un acquisto vero di un importo piccolo con una tua carta e rimborsalo dalla dashboard.

## 7. Cose legali da confermare (con il consulente)
- **Recesso** (consumatori UE, 14 giorni, servizio digitale): nei Termini (punto 8) c'è il testo; la pagina di pagamento dice «accetti i Termini e che il servizio inizi subito». Verificare la formula e la gestione dei rimborsi.
- **Fatturazione / IVA** secondo la tua forma giuridica; ricevute di Stripe vs fattura.
- **Informativa privacy**: aggiornata con Stripe (versione `2026-10-05`: a ogni account viene richiesto di nuovo il consenso).
- Prezzi mostrati con IVA inclusa o esclusa, a seconda del regime.
