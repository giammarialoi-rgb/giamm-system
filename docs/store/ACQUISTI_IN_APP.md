# Acquisti in-app: RevenueCat + App Store + Google Play

Stato al 04/10/2026: il codice è scritto e provato (server su PostgreSQL reale, test, build Android). **Mai provato con gli store veri**: serve il sandbox (passo 8).

## Come funziona (per capire cosa si configura)
- Gli abbonamenti si comprano **solo dagli store** nelle app (Apple e Google, 3.1.1). Dal sito si potrà comprare con Stripe (non ancora costruito); un piano comprato altrove vale anche nell'app solo se è acquistabile anche con l'acquisto in-app (3.1.3(b)) — lo è.
- **RevenueCat** fa da livello unico: verifica le ricevute con Apple e Google e avvisa il server di Nurvan con un *webhook* a ogni acquisto, rinnovo, annullamento, scadenza. L'app, dopo un acquisto o un «ripristina», chiede anche al server di rileggere (`POST /api/billing/refresh`).
- Il cliente in RevenueCat è **l'ID dell'account Nurvan**; il server mette `plan` e `plan_source` (`apple`/`play`/`stripe`) e la scadenza sull'account (`setAccountPlan`, con storico).
- Gli ID dei prodotti stanno in `web/features.json` → `billing.products`. Sono gli stessi in Apple, Google e RevenueCat:

| Piano Nurvan (entitlement) | Prodotti |
|---|---|
| `standard` | `nurvan.standard.year` |
| `coach` | `nurvan.coach.month`, `nurvan.coach.year` |
| `coach_pro` | `nurvan.coach_pro.month`, `nurvan.coach_pro.year` |

## 1. Account RevenueCat (gratuito fino a 2.500 $ di ricavi mensili)
1. https://www.revenuecat.com › crea l'account › **Project** `Nurvan`.
2. **Apps** › aggiungi **App Store** (bundle ID `com.nurvan.app`) e **Play Store** (package `com.nurvan.app`).

## 2. Collegare Apple
1. App Store Connect › **Utenti e accessi › Integrazioni › Chiavi in-app** (In-App Purchase) › genera una chiave: scarica il file `.p8`, annota *Key ID* e *Issuer ID*.
2. RevenueCat › app App Store › **In-app purchase key configuration**: carica il `.p8` e inserisci Key ID e Issuer ID.
3. App Store Connect › **Utenti e accessi › Integrazioni › App Store Connect API** › genera una chiave (accesso *App Manager*) e caricala nella stessa pagina di RevenueCat (serve a importare i prodotti).
4. RevenueCat › app App Store › **Chiave pubblica SDK** (`appl_…`): serve al passo 6.
5. **Shared secret** (facoltativo se usi la chiave in-app): App Store Connect › app › Informazioni app › *Segreto condiviso specifico dell'app*.

## 3. Collegare Google Play
1. Google Cloud Console › crea (o usa) un progetto › **Account di servizio** › crea `revenuecat` › scarica la **chiave JSON**.
2. Play Console › **Utenti e autorizzazioni › Invita nuovi utenti** › incolla l'email dell'account di servizio › permessi: *Visualizza informazioni finanziarie*, *Gestisci ordini e abbonamenti*.
3. Abilita le API **Google Play Android Developer API** e **Google Play Developer Reporting API** nel progetto Cloud, e (per le notifiche in tempo reale) **Cloud Pub/Sub**.
4. RevenueCat › app Play Store › **Service account credentials**: carica il JSON. Segui «Connect to Google Real-time developer notifications» (RevenueCat mostra il topic Pub/Sub da incollare in Play Console › Monetizza › Impostazioni di monetizzazione).
5. Le credenziali impiegano fino a 36 ore ad attivarsi.
6. RevenueCat › app Play Store › **Chiave pubblica SDK** (`goog_…`).

## 4. Creare i prodotti negli store
Come nelle guide di `store/apple/subscriptions.md` e `store/google-play/subscriptions.md`, con gli **ID esatti** della tabella sopra.

## 5. Prodotti, entitlement, offering in RevenueCat
1. **Product catalog › Products**: importa (o aggiungi a mano) i 5 prodotti per ciascuna app.
2. **Entitlements**: crea `standard`, `coach`, `coach_pro` e collega ai rispettivi prodotti come in tabella. (Il server riconosce il piano dal nome dell'entitlement o, in subordine, dall'ID prodotto.)
3. **Offerings**: nell'offering `default` (quello *current*) aggiungi un **package** per prodotto:
   - Package **annuale** (`$rc_annual`) per i prodotti `.year`
   - Package **mensile** (`$rc_monthly`) per i prodotti `.month`
   - Per avere più prodotti dello stesso periodo (uno per piano) usa **package personalizzati**: `standard_year`, `coach_month`, `coach_year`, `coach_pro_month`, `coach_pro_year`. L'app riconosce il piano dall'ID prodotto e il periodo dal prodotto stesso (non dal nome del package).
4. L'app mostra i prezzi presi dallo store: non vanno scritti nell'app.

## 6. Chiavi e variabili su Render
Render › servizio › **Environment** (le chiavi sono già dichiarate in `render.yaml` con `sync: false`; i valori li metti tu):

| Variabile | Valore | Dove si trova |
|---|---|---|
| `REVENUECAT_APPLE_KEY` | `appl_…` | RevenueCat › app App Store › chiave pubblica SDK |
| `REVENUECAT_GOOGLE_KEY` | `goog_…` | RevenueCat › app Play Store › chiave pubblica SDK |
| `REVENUECAT_SECRET_KEY` | `sk_…` | RevenueCat › Project settings › API keys › **Secret API key v1** (sola lettura) |
| `REVENUECAT_WEBHOOK_AUTH` | una stringa lunga a caso (≥32 caratteri) che inventi tu | la stessa va nel webhook, passo 7 |

Le chiavi `appl_`/`goog_` sono pubbliche per natura (stanno dentro l'app); `sk_` e il segreto del webhook **mai** in chat, nel repository o nelle app.
Dopo aver salvato, Render riavvia il servizio. Controlla: `https://app.nurvan.app/api/billing/config` deve rispondere `"enabled": true`.

## 7. Webhook
RevenueCat › Integrations › **Webhooks** › *Add new*:
- **Webhook URL**: `https://app.nurvan.app/api/billing/revenuecat/webhook`
- **Authorization header value**: `Bearer <il valore di REVENUECAT_WEBHOOK_AUTH>`
- Eventi: tutti. Ambienti: Production **e** Sandbox.
- Invia un evento di prova: il server risponde 200 e non cambia nulla.

## 8. Provare con il sandbox (non saltare)
**iPhone**: crea un utente Sandbox (App Store Connect › Utenti e accessi › Sandbox) › installa la build da TestFlight › in Impostazioni › App Store › *Account Sandbox* accedi › in app: Piani & Pro › compra. Verifica: l'app mostra il piano, in RevenueCat compare l'evento, `GET /api/account/plan` dà il piano con origine `apple`.
**Android**: aggiungi la tua email come *tester di licenza* (Play Console › Impostazioni › Test della licenza) › installa dal test interno › compra. Origine `play`.
Da provare per ciascuno: acquisto · riapertura dell'app · «Ripristina acquisti» su un secondo dispositivo · passaggio Coach → Coach Pro · annullamento (il piano resta fino alla scadenza) · scadenza (nel sandbox il mese dura 5 minuti; torna Free) · apertura della modalità Coach prima e dopo l'acquisto.
Un account con piano assegnato a mano (`plan_source = manual`, come gli account dei revisori) non viene mai cambiato da un evento degli store.

## 9. Prima dell'uscita
- [ ] Accordi e banca/fiscalità completi in entrambi gli store
- [ ] Prodotti attivi e collegati in RevenueCat; offering *current* con i package
- [ ] Variabili su Render e webhook con evento di prova ok
- [ ] Una prova sandbox riuscita su iPhone e una su Android
- [ ] Il sito non mostra offerte «un mese gratis» dentro l'app (si pubblicizzano solo fuori)
- [ ] Informativa privacy aggiornata (è già: RevenueCat e acquisti) — `docs/store/PRIVACY_STORE.md`
