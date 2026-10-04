# App Store Connect › Privacy dell'app (etichette)

Dove: App Store Connect › la tua app › **Privacy dell'app** › Inizia / Modifica. Rispondi come sotto.
Basato sul codice al 04/10/2026 (informativa `2026-10-04b`). Se cambia cosa raccoglie l'app, va aggiornato qui e sul sito.
Fornitori che trattano dati per conto di Nurvan (non sono "tracciamento" e non sono SDK pubblicitari): Render (hosting), Google Gemini (solo se l'utente dà il consenso AI), Resend (email), Cloudflare, **RevenueCat** (acquisti: riceve l'ID account Nurvan e i dati dell'abbonamento).

## 1. Raccogliete dati dall'app?
**Sì, raccogliamo dati.**

## 2. Tracciamento
**No.** Nessun dato è usato per tracciare gli utenti (nessuna pubblicità, nessun data broker, nessun SDK di analytics di terzi). Quindi **non serve** il prompt App Tracking Transparency e non si inserisce `NSUserTrackingUsageDescription`.

## 3. Tipi di dati, uno per uno

Per ogni tipo Apple chiede: *collegato all'identità dell'utente?* · *usato per tracciamento?* · *finalità*. Qui: **tutti collegati all'utente (Sì), nessuno per tracciamento (No)**.

| Categoria Apple | Tipo | Collegato | Finalità | Note |
|---|---|---|---|---|
| Informazioni di contatto | **Nome** | Sì | Funzionalità dell'app | nome dell'account |
| Informazioni di contatto | **Indirizzo email** | Sì | Funzionalità dell'app | login, inviti, avvisi |
| Salute e fitness | **Salute** | Sì | Funzionalità dell'app | peso, misure, sonno/battito/HRV scritti a mano, esami, terapie, alimentazione |
| Salute e fitness | **Fitness** | Sì | Funzionalità dell'app | allenamenti, carichi, statistiche |
| Contenuti utente | **Foto o video** | Sì | Funzionalità dell'app | check fisici, pasti, etichette (facoltative) |
| Contenuti utente | **Messaggi** *(Altri messaggi in app)* | Sì | Funzionalità dell'app | chat coach-atleta (cifrata end-to-end), segnalazioni |
| Contenuti utente | **Altri contenuti dell'utente** | Sì | Funzionalità dell'app | file dei programmi importati, allegati |
| Identificativi | **ID utente** | Sì | Funzionalità dell'app | ID account Nurvan (usato anche come ID cliente di RevenueCat) |
| Acquisti | **Cronologia degli acquisti** | Sì | Funzionalità dell'app | quale abbonamento ha l'account e fino a quando (da App Store via RevenueCat) |
| Diagnostica | **Altri dati diagnostici** | Sì | Analisi | solo eventi di errore, senza contenuti |

Cose che **non** si dichiarano (non le raccogliamo): posizione, contatti della rubrica, cronologia di navigazione, ricerche, ID del dispositivo o pubblicitario, dati finanziari (la carta la gestisce Apple, mai Nurvan), informazioni sensibili oltre alla salute, dati di utilizzo/prodotto per analytics.

## 4. Dopo la compilazione
- Apple mostra l'anteprima «etichetta»: deve dire *Dati collegati all'utente* (Informazioni di contatto, Salute e fitness, Contenuti utente, Acquisti, Identificativi, Diagnostica) e *Dati non utilizzati per tracciarti: tutto*, senza la sezione «Dati utilizzati per tracciarti».
- Pubblica le risposte (**Pubblica**), poi collega la versione 1.0 alla build.

## 5. Altri campi correlati in App Store Connect

**Valutazione per età** (questionario): 
- Contenuti violenti, sessuali, linguaggio, orrore, gioco d'azzardo, droghe, alcol/tabacco: **Nessuno**
- Temi medici o di trattamento sanitario: **Sì, poco frequenti** *(consigli di allenamento e alimentazione; non è un'app medica)*
- Contenuti generati dagli utenti / messaggi tra utenti: **Sì** (chat coach-atleta) — con segnala e blocca
- Accesso web illimitato: No · Giochi con premi: No
- Risultato atteso: 12+ o 17+ a seconda delle risposte sui temi medici; l'app richiede ≥16 anni nei termini, quindi imposta **età minima 16** se puoi, altrimenti 17+ è accettabile.

**Crittografia (export compliance)**: l'app usa solo HTTPS/crittografia standard del sistema (e la cifratura end-to-end della chat con le API standard del dispositivo). Risposta: *usa crittografia: Sì · esente (solo crittografia standard / di sistema): Sì* → nessun documento da caricare. Nel progetto `ITSAppUsesNonExemptEncryption` è già nell'Info.plist, quindi Apple non lo richiede a ogni build.

**Contenuti di terze parti**: l'app non contiene contenuti di terzi con diritti da dichiarare (le immagini degli esercizi sono prodotte per Nurvan).

**Accesso con Apple**: presente (obbligatorio perché c'è anche Accesso con Google).

**Eliminazione account**: in app (Impostazioni › Privacy e dati › Elimina account) e dalla pagina https://nurvan.app/elimina-account.

## 6. Manifest di privacy (`PrivacyInfo.xcprivacy`)
Il progetto iOS non ha ancora un `PrivacyInfo.xcprivacy` proprio (i plugin Capacitor e RevenueCat portano i loro). Verifica, dopo la prima build su TestFlight, che l'archivio non dia avvisi «ITMS-91053 missing API declaration»: se capitano, aggiungi le *required reason API* indicate nell'email di Apple.
