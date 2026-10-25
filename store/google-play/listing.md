# Google Play — scheda dello store (testi da incollare)

Package: `com.nurvan.app` · Categoria: **Salute e fitness** · Tag suggeriti: Fitness, Allenamento in palestra, Personal trainer · Gratis con acquisti in-app
Limiti: titolo 30 · descrizione breve 80 · descrizione completa 4000.

Contatti (Play Console › Scheda dello store › Dettagli di contatto):
- Email: info@nurvan.app · Sito web: https://nurvan.app · Telefono: facoltativo
- Informativa sulla privacy: https://nurvan.app/privacy
- Eliminazione account (URL obbligatorio): https://nurvan.app/elimina-account

---

## Testi (fonte: `listing/<lingua>/`)

Titolo, descrizione breve e descrizione completa stanno nei file `listing/it-IT/` (predefinita) e `listing/en-US/`:
`title.txt` (≤30), `short_description.txt` (≤80), `full_description.txt` (≤4000).

Riscritti il 25/10/2026 dopo il report ASO di Testers Community (57/100): keyword primaria **app personal trainer** nel titolo
(«Nurvan: App Personal Trainer»), nella descrizione breve e nella descrizione; descrizione oltre 3.000 caratteri, a sezioni con elenchi
puntati, aperta dai benefici. In inglese la keyword è «personal trainer app». `node test_play_listing.mjs` controlla limiti, keyword e
parole vietate da Play.

Pubblicazione senza copia-incolla: `gh workflow run play-listing.yml -f mode=check` (mostra cosa cambierebbe) e
`-f mode=publish` (scrive i testi su Play, che li rivede prima di pubblicarli). Usa lo stesso account di servizio del workflow Android.

---

## Grafica (cartella `screenshots/` e file accanto)

| Elemento | File | Misura |
|---|---|---|
| Icona | `icon-512.png` | 512×512 |
| Immagine in evidenza | `feature-graphic.png` | 1024×500 |
| Screenshot telefono (2-8) | `screenshots/phone/01…08` | 1080×1920 |

Gli screenshot sono 8, nell'ordine: Allenamento, Statistiche, Coach AI, Esercizio, Home, Salute, Clienti coach, Oggi coach. Dati inventati («Alex», «Marco Conti»).
Tablet 7"/10": facoltativi. Se vuoi comparire anche nelle ricerche da tablet servono screenshot a parte (non ancora fatti); l'app funziona anche su tablet.
