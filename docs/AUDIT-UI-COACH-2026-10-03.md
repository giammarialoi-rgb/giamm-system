# Audit dell'area coach — 3 ottobre 2026

Fatto con un accesso coach di prova (account finto + risposte simulate nel browser per ogni chiamata `/api/`: nessun contatto con il server vero né con il database). Strumenti in `tools/browser-checks/ui-audit/coach/` (come rilanciarli: `tools/browser-checks/README.md`). 65 schermate (pagine, modali, fogli, menu) a 400 px e 360 px in italiano e 400 px in tedesco; il report completo con tutti i dettagli per schermata è nelle schermate in `tmp-debug/ui/coach/out/` (non committate).

## Già corretto in questa tornata
- **Barra in basso:** la quarta voce era "AI" e la scheda **Programmi** non esisteva (un blocco del vecchio hub riscriveva l'etichetta dopo il Coach OS). Ora la barra è Oggi · Clienti · Chat · Programmi · Calendario.
- **Calendario:** con FATTA / SPOSTA / ANNULLA la colonna di testo si riduceva a 13 px e le parole andavano a capo lettera per lettera (a 400 px in italiano). I pulsanti vanno ora sotto il testo.
- **Programmi:** il titolo della card "Crea programma" era nero su nero. Ora è leggibile.
- **Oggi:** gli orari delle sessioni erano ISO grezzi (`2026-10-03T07:00:00.000Z`) e senza nome del cliente; ora "09:00 · Davide De Santis".
- **Libreria schede:** il pulsante ELIMINA usciva dalla card con titoli lunghi.
- **Testata a 360 px:** il pulsante con le iniziali del coach era tagliato dal bordo.
- **Testi in inglese/tecnici:** stati dei check-in (received/requested/…), fasi del CRM (LEAD, TRIAL, ACTIVE, CHURN_RISK…), trigger e azioni delle automazioni, tipi di voce nell'inbox (message, ask_coach…), stato "active" nell'assegnazione programma. Tradotti in italiano e nelle altre 9 lingue.
- **Testo piccolo:** etichette KPI, kicker e sottotitoli di riga da 8–10 px a 10,5–11 px; margine sotto i gruppi di azioni; il periodo selezionato (Calendario, Analisi) ora si vede; le azioni piccole non sono più card da 72 px.
- **Voci senza schermata:** "Meal AI" e "Registro agente" nel menu laterale aprivano il cruscotto personale; ora sono nascoste finché non hanno una schermata.

## Ancora da fare (in ordine di importanza)
1. **Alimentazione e Video tecnica del coach** (`web/coach-os/media-ai.js`) sono moduli provvisori: si digita a mano "ID cliente", macro o marker; non c'è modo di caricare foto o video; i pulsanti sembrano testo. Servono schermate vere o vanno tolti dal menu.
2. **Icone della barra** del coach non coerenti con le voci (Clienti = manubrio, Chat = grafico, Programmi = bersaglio, Calendario = tre righe): si cambia solo il testo. Si sistema con il set di icone proprio (`coach-today`, `coach-clients`, `coach-inbox`, `coach-programs`, e `module-calendar`).
3. **Scheda cliente** lunga 3.200–3.500 px: 11 pulsanti impilati, anagrafica ripetuta, 12 righe "saltato" da 65 px in "Check-in programmati" (≈800 px vuoti; per un cliente nuovo gli slot precedenti alla creazione risultano "saltato"). Mostrare gli ultimi 3 slot con "Vedi tutti" e raggruppare i pulsanti.
4. **Hub clienti:** 4–6 pulsanti per card su due righe, nessun avatar, due interruttori e due pulsanti sopra al primo cliente. Un solo APRI e le azioni rare in "•••".
5. **Aggiungi cliente / Transizione:** 27 campi in una finestra da 3.458 px e 25+ caselle bianche. Meglio un percorso a passi.
6. **Traduzioni di frasi composte** in tedesco ("Aderenza 48%", "Atleti: 8 su 20 Plätze", titoli di "Oggi" che arrivano dal server come "Pagamento da verificare · …"): servono chiavi con segnaposto e titoli dal server come codice più parametri.
7. **Automazioni:** nessun interruttore attivo/disattivo (il server manda `enabled`), "Nuova regola" apre un `prompt()`; **CRM:** elenco in sola lettura, nessuna UI per cambiare fase (la rotta `POST /api/coach/crm/:id` esiste); **Analisi:** "Cliente" apre un `prompt()` che chiede l'id numerico; **Incassi:** un incasso senza cifra appare "0,00 €" nella lista per cliente e "senza cifra" nel mese.
8. **Centro Verifiche:** nel dettaglio la card con le note dell'atleta è intitolata "FEEDBACK COACH"; foto private come pulsanti "front/side/back"; ultimo filtro tagliato.
9. **Piccole cose:** banner "3 notifiche da leggere" largo come lo schermo e sopra il titolo; "1 nuovi" (plurale); orari non localizzati nella chat col cliente; microfono con bordo rosso permanente; caselle bianche residue (esami, allergie).
10. **Viste dati-cliente dentro la sessione coach** (Allenamento, Statistiche, Alimentazione, Integrazione, Calendario del cliente) mostrano i comandi dell'atleta (timer, warm-up, "ASK COACH", "Passi di oggi", "Acqua", "BARCODE / OPEN FOOD FACTS") e testi inglesi ("SCIENTIFIC EVIDENCE", "NUTRITION", "SUPPLEMENTATION"): per il coach andrebbero nascosti i comandi da atleta e tradotte le etichette.

## Icone ed emoji nell'area coach
Emoji colorate nelle viste del cliente e nel cruscotto, solo testo e puntini nelle pagine nuove del Coach OS, SVG a contorno nella barra e nella chat; glifi come `♢` (notifiche), `●`, `•••`, `→`, `↑ ↓`, `✕`, `✓✓`. Il set proprio (`docs/ICONE-PROMPT-CHATGPT.md`) include le icone dell'area coach.
