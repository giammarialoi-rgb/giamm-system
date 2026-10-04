# Play Console › Contenuti dell'app › Sicurezza dei dati

Basato sul codice al 04/10/2026. Rispondi come sotto. Fornitori che trattano dati per conto di Nurvan (per Play non è «condivisione»): Render, Google Gemini (solo con consenso AI), Resend, Cloudflare, **RevenueCat** (acquisti).
Il dettaglio per ogni tipo di dato è in `../../docs/store/PRIVACY_STORE.md`.

## Domande generali
| Domanda | Risposta |
|---|---|
| L'app raccoglie o condivide tipi di dati utente richiesti? | **Sì** |
| Tutti i dati utente sono criptati in transito? | **Sì** (HTTPS) |
| Offri un modo per richiedere l'eliminazione dei dati? | **Sì** — URL: `https://nurvan.app/elimina-account` (e in app: Impostazioni › Privacy e dati › Elimina account) |
| Segui le Norme Famiglie? | No: l'app non è rivolta ai bambini |
| Hai fatto una verifica di sicurezza indipendente? | No |

## Dati raccolti — tutti **non condivisi**, finalità indicate

| Categoria Play | Tipo | Obbligatorio / facoltativo | Finalità |
|---|---|---|---|
| Informazioni personali | Nome | Obbligatorio | Funzionalità dell'app, Gestione dell'account |
| Informazioni personali | Indirizzo email | Obbligatorio | Funzionalità dell'app, Gestione dell'account |
| Informazioni personali | ID utente | Obbligatorio | Funzionalità dell'app, Gestione dell'account |
| Salute e fitness | Informazioni sulla salute | Facoltativo | Funzionalità dell'app |
| Salute e fitness | Informazioni sull'attività fisica | Facoltativo | Funzionalità dell'app |
| Foto e video | Foto | Facoltativo | Funzionalità dell'app |
| File e documenti | File e documenti | Facoltativo | Funzionalità dell'app |
| Messaggi | Altri messaggi in-app | Facoltativo | Funzionalità dell'app |
| **Informazioni finanziarie** | **Cronologia degli acquisti** | Obbligatorio per chi compra | Funzionalità dell'app, Gestione dell'account |
| Informazioni e prestazioni dell'app | Log di arresto anomalo / Diagnostica | Obbligatorio | Analisi (solo errori, per stabilità) |

Novità rispetto alla versione precedente di questo modulo: **Cronologia degli acquisti** (gli abbonamenti passano da Google Play Billing e RevenueCat; Nurvan riceve solo prodotto, store e data di scadenza, mai dati di carta).

Per «Informazioni sulla salute», «Foto» e i file inviati all'AI: dichiara che una parte del trattamento avviene tramite fornitore di servizi e che l'invio è facoltativo (consenso AI separato).

Non raccolti: posizione, contatti, calendario, dati di pagamento (carta), audio registrato (il riconoscimento vocale è del sistema: l'app riceve solo il testo), cronologia web, ID dispositivo o pubblicitario.

## Pratiche di sicurezza (mostrate sulla scheda)
- Dati criptati in transito: sì
- Puoi chiedere di eliminare i dati: sì
- «Dati non condivisi con terze parti»: sì
- Eventuale scritta «Impegnato a rispettare le Norme sulle famiglie»: no
