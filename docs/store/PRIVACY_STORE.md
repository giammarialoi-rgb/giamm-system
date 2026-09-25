# Privacy per Google Play e App Store

**BOZZA da far verificare a un consulente legale / DPO prima della pubblicazione.**
Risposte basate sul codice al 25/09/2026 (versione informativa `2026-09-25`).
Quando il codice cambia (nuovi dati, nuovi fornitori, pagamenti) vanno aggiornate
queste risposte, `web/privacy.html` e la `legal.version` in `web/features.json`.

## 0. Da fare prima di pubblicare

| Cosa | Dove | Stato |
|---|---|---|
| Nome/ragione sociale, indirizzo, P. IVA/C.F. del titolare | `web/features.json` → `legal.controllerName`, `controllerAddress`, `controllerVat` | da compilare |
| Email per le richieste privacy (altrimenti si usa `contactEmail`) | `legal.privacyEmail` | da compilare |
| Regione dei server Render (es. Frankfurt, Oregon) | `legal.hostingRegion` | da verificare sulla dashboard Render |
| Chiave Gemini a pagamento (con il livello gratuito Google può usare i contenuti per migliorare i modelli: incompatibile con quanto scritto nell'informativa) | variabile `GEMINI_API_KEY` su Render | da verificare |
| DPA (accordo art. 28) con Render, Google Cloud/Gemini, Resend, Cloudflare | account dei fornitori | da accettare/scaricare |
| Periodo di rotazione dei backup del database Render | dashboard Render | da verificare e, se serve, indicarlo nell'informativa |
| Account demo per la revisione (email + password, con dati di esempio) | Play Console → Accesso all'app; App Store Connect → App Review Information | da creare |
| Ricompilare features.js e le app dopo aver compilato i campi | `node build_master25.mjs`, poi APK/IPA | dopo i campi |

Finché i campi del titolare sono vuoti, `/privacy`, `/termini` ed `/elimina-account` mostrano un avviso "Bozza".

URL da inserire negli store (dominio di produzione):

- Informativa privacy: `https://<dominio>/privacy`
- Termini: `https://<dominio>/termini`
- Eliminazione account (obbligatorio su Play): `https://<dominio>/elimina-account`

## 1. Cosa fa l'app (riassunto per le risposte)

- **Account**: nome, email, password (hash bcrypt) oppure Accesso con Google / Accedi con Apple (identificativo del provider, email eventualmente relay, token Apple per la revoca).
- **Dati inseriti dall'utente**: allenamenti; salute (peso, misure, foto dei check fisici, alimentazione, foto dei pasti, integratori, terapie, esami del sangue, sonno/battito se inseriti a mano); messaggi, check-in e file scambiati col coach.
- **AI (facoltativa, consenso separato)**: Google Gemini riceve testo della chat, file dei programmi da importare, foto di pasti/etichette, codici a barre, con il contesto necessario.
- **Nessuna lettura da altre app** (Health Connect rimosso: nessun permesso `health.*`), nessuna posizione, nessuna rubrica, nessuna pubblicità, nessun SDK di analytics o tracking.
- **Permessi Android**: `INTERNET`, `CAMERA` e `RECORD_AUDIO` (chiesti solo all'uso), `POST_NOTIFICATIONS`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED` (ripristino promemoria).
- **Backup Android**: disattivato (`allowBackup=false` + `data_extraction_rules.xml`).
- **Tecnici**: IP per rate limit e sicurezza; ultimo accesso; eventi di errore nel pannello admin (senza contenuti).
- **Cifratura in transito**: HTTPS (HSTS in produzione).
- **Eliminazione**: in app (Impostazioni › Privacy e dati › Elimina account, conferma "ELIMINA"; `DELETE /api/account`) e via web (`/elimina-account`). Gli account atleta creati dal coach si eliminano tramite il coach o scrivendo al contatto privacy.
- **Consensi registrati sul server** (`app_users`, migrazione 0019): versione informativa, età ≥ 16, dati sanitari (art. 9), AI (dato/revocato con data).

## 2. Google Play: sezione "Sicurezza dei dati"

**Raccolta e condivisione**
- L'app raccoglie o condivide tipi di dati utente richiesti? **Sì**
- Tutti i dati sono criptati in transito? **Sì**
- Gli utenti possono chiedere l'eliminazione dei dati? **Sì** (URL: `/elimina-account`)
- Condivisione con terze parti: **No**. Gemini, Render, Resend, Cloudflare trattano per nostro conto (fornitori di servizi), e per Play non è "condivisione".

**Tipi di dati raccolti** (tutti: *non* condivisi, *non* trattati solo in modo effimero salvo AI, finalità "Funzionalità dell'app" e "Gestione dell'account")

| Categoria Play | Tipo | Obbligatorio? | Finalità |
|---|---|---|---|
| Informazioni personali | Nome | Obbligatorio | Funzionalità app, gestione account |
| Informazioni personali | Indirizzo email | Obbligatorio | Gestione account |
| Informazioni personali | ID utente | Obbligatorio | Gestione account |
| Salute e fitness | Informazioni sulla salute | Facoltativo (lo inserisce l'utente) | Funzionalità app |
| Salute e fitness | Informazioni sull'attività fisica | Facoltativo | Funzionalità app |
| Foto e video | Foto | Facoltativo | Funzionalità app |
| File e documenti | File e documenti | Facoltativo (import programmi, allegati al coach) | Funzionalità app |
| Messaggi | Altri messaggi in-app | Facoltativo (coach-atleta) | Funzionalità app |
| Informazioni e prestazioni app | Log degli arresti anomali / Diagnostica | Obbligatorio | Analisi (solo errori, per stabilità) |

Non raccolti: posizione, contatti, calendario del telefono, dati finanziari (finché non ci sono acquisti in app), audio (il riconoscimento vocale è il servizio di sistema Android: l'app riceve solo il testo), cronologia web, ID dispositivo/pubblicità.

Per i dati inviati a Gemini: indicare in "Informazioni sulla salute" / "Foto" che una parte del trattamento avviene tramite fornitore di servizi, e che l'invio è facoltativo (consenso AI).

**Altre dichiarazioni Play Console**
- *Accesso all'app*: account demo per i revisori.
- *Annunci*: l'app **non** contiene annunci.
- *Pubblico di destinazione*: 16-17 e 18+; l'app non è rivolta ai bambini.
- *App sanitarie* (dichiarazione "Health apps"): categoria fitness e benessere/alimentazione. **Non** è un dispositivo medico, **non** usa Health Connect. Il disclaimer è in app (foglio consensi, Privacy e dati) e nei termini.
- *Permessi sensibili*: nessuno che richieda un modulo (niente `health.*`, niente `SCHEDULE_EXACT_ALARM`, niente `ACTIVITY_RECOGNITION`, niente posizione in background).
- *Classificazione dei contenuti*: questionario IARC (nessun contenuto violento/sessuale; comunicazione tra utenti: sì, tra coach e atleta).
- *Account deletion*: URL `/elimina-account` + percorso in app.

## 3. App Store: "Privacy dell'app" (etichette nutrizionali)

Tracciamento: **No** (nessun dato usato per tracciare, nessun SDK di terze parti per pubblicità/analytics).

**Dati collegati all'utente** (finalità: *Funzionalità dell'app*; per la diagnostica anche *Analisi*)

| Categoria Apple | Tipo |
|---|---|
| Informazioni di contatto | Nome, Indirizzo email |
| Salute e fitness | Salute, Fitness |
| Contenuti utente | Foto o video; Altri contenuti dell'utente (messaggi al coach, check-in, file importati) |
| Identificativi | ID utente |
| Diagnostica | Altri dati diagnostici (eventi di errore) |

Non raccolti: posizione, contatti, dati finanziari, cronologia, acquisti (finché non ci sono acquisti in app), dati sensibili oltre alla salute.

**Linee guida App Review da rispettare (già coperte dal codice)**
- 4.8 *Login Services*: c'è Accesso con Google, quindi serve Accedi con Apple. ✔
- 5.1.1(v) *Account deletion*: eliminazione in app, non solo via email. ✔ (Impostazioni › Privacy e dati, e Profilo › Account)
- 5.1.1(i) *Privacy policy*: link nell'app (schermata di accesso, foglio consensi, Privacy e dati) e in App Store Connect. ✔
- 5.1.2(i) *Dati personali a un'AI di terze parti*: spiegazione e consenso esplicito prima del primo invio a Gemini, revocabile. ✔
- 5.1.3 *Salute*: i dati sanitari non si usano per pubblicità né per data mining, non si scrivono dati falsi in HealthKit (l'app non usa HealthKit). ✔
- 1.4.1 *Medical*: disclaimer "non è un dispositivo medico". ✔
- *Privacy manifest* (`PrivacyInfo.xcprivacy`): nel repository non c'è ancora un progetto iOS. Quando si crea, dichiarare: nessun tracking, i tipi di dati sopra, e le "required reason API" usate dal wrapper (es. `UserDefaults` → CA92.1, timestamp file → C617.1).
- *Descrizioni dei permessi iOS* (`Info.plist`): `NSCameraUsageDescription` ("per fotografare pasti, etichette e check fisici"), `NSMicrophoneUsageDescription` ("per dettare domande e dati con la voce"), `NSSpeechRecognitionUsageDescription` se si usa il riconoscimento vocale nativo, `NSPhotoLibraryUsageDescription` se si scelgono foto dalla libreria.

## 4. GDPR: cosa è già in app

- Consenso alla registrazione (email) e, per Google/Apple/atleti, al primo accesso: età ≥ 16, informativa + termini, dati sanitari (art. 9.2.a). Senza il consenso l'account non si usa su quel dispositivo ("Non accetto: esci").
- Nuova versione dell'informativa (`legal.version`): il consenso viene richiesto di nuovo a ogni account.
- Consenso AI separato, revocabile; dopo la revoca il server rifiuta le rotte AI per quell'account (403 `AI_CONSENT_WITHDRAWN`).
- Diritti: esporta i miei dati (JSON completo, senza token di sessione), rettifica in app, eliminazione in app e via web, contatto privacy.
- Registro dei consensi sul server con data (prova del consenso, art. 7.1).

**Da valutare con il consulente**
- Ruoli coach/atleta: nell'informativa il coach è titolare autonomo per il rapporto con l'atleta e Nurvan conserva i dati per conto dell'account del coach. Potrebbe servire un DPA tra Nurvan e i coach (termini B2B) se il coach è un professionista.
- DPIA (art. 35): trattamento su larga scala di dati sanitari + AI → probabilmente necessaria.
- Registro dei trattamenti (art. 30).
- Tempi di conservazione dei log tecnici e dei backup: da fissare e indicare.
