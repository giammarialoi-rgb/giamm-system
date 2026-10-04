# Pubblicare Nurvan su Google Play — percorso passo passo

| File / cartella | A cosa serve |
|---|---|
| `listing.md` | titolo, descrizione breve e completa (IT + EN), contatti, URL |
| `data-safety.md` | modulo «Sicurezza dei dati», risposta per risposta |
| `declarations.md` | accesso all'app (account revisori), annunci, classificazione, pubblico, app di salute, permessi |
| `subscriptions.md` | abbonamenti: ID, piani base, prezzi, tester di licenza |
| `tester-guide.md` | testo da mandare ai 20 tester + come attivare il test chiuso e i 14 giorni |
| `screenshots/phone/` | 8 screenshot 1080×1920 |
| `feature-graphic.png` | immagine in evidenza 1024×500 |
| `icon-512.png` | icona 512×512 |

Applicazione: `com.nurvan.app`, `targetSdk 36`, App Bundle firmato dal workflow GitHub **Android Play** (carica sul test interno).

## Situazione dell'account (ottobre 2026)
- Account **personale** (verifica del documento d'identità in corso). Regola Google per i personali nuovi: **test chiuso con ≥12 tester iscritti per 14 giorni consecutivi** prima della produzione. Hai 20 tester: ok, con margine.
- Finché l'identità non è verificata non puoi pubblicare né creare il test chiuso: nel frattempo prepara tutto da questa cartella e usa il test interno (solo email dei tuoi tester, fino a 100) se la Console lo permette.
- Un account personale mostra il tuo **nome e indirizzo** nella scheda dello store. Se non vuoi, serve un account Organizzazione (richiede D-U-N-S) — decisione tua, non blocca il resto.

## Sequenza
1. **Account e profilo pagamenti**: completa la verifica dell'identità; crea il profilo dei pagamenti (merchant) per gli abbonamenti.
2. **Account dei revisori** (le password restano solo a te):
   ```bash
   DATABASE_URL="<stringa del database di produzione da Render › Postgres › External>" node tools/seed_review_accounts.mjs
   ```
   Copia le password stampate nei campi di `declarations.md` › *Accesso all'app*.
3. **Crea l'app** in Play Console (nome, lingua predefinita Italiano, app, gratuita) e compila **Dashboard › Configura l'app**: `declarations.md` e `data-safety.md`, categoria Salute e fitness, contatti e URL di `listing.md`.
4. **Scheda dello store**: testi di `listing.md`, grafica di questa cartella.
5. **Build**: dopo la CI verde, `gh workflow run "Android Play" --ref main` → arriva sul test interno. Controlla che si installi e provala.
6. **Acquisti**: `../../docs/store/ACQUISTI_IN_APP.md` + `subscriptions.md` (i prodotti si creano solo dopo il primo caricamento di una build con la libreria di acquisto).
7. **Test chiuso con i 20 tester**: segui `tester-guide.md` (parte «Per te»). Dopo 14 giorni: *Candidati per la produzione*.
8. **Produzione**: crea la versione, scegli *rilascio graduale* (es. 20%) per le prime ore, invia.

## Avvisi comuni al primo invio
- **Politica sui dati degli utenti**: informativa e modulo Data Safety devono coincidere (qui lo sono, incluso l'acquisto).
- **App di salute**: la dichiarazione è obbligatoria; il disclaimer «non è un dispositivo medico» è in app.
- **Account demo**: se Play non riesce ad accedere rifiuta: provalo sul telefono pulito prima di inviare.
- Il server su Render deve essere raggiungibile (non in sospensione) durante la revisione.
