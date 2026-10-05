# Vitastrong — ambassador Nurvan: come si fa un articolo promo

Giammaria Loi è ambassador di vitastrong.it. Codice sconto: **nurvan** (10% in più, applicato al checkout).

## Link (sempre in blocchi HTML con `rel="sponsored nofollow noopener"`, mai come link Markdown)
- Coupon automatico: https://vitastrong.it/?coupon=nurvan  → banner e pulsanti
- Carrello essenziali precaricato: https://vitastrong.it/amb/sciencebased

## Quando
Un articolo per ogni nuova promozione di Vitastrong. L'avviso arriva da Giammaria, che mette le grafiche promo nella cartella `vitastrongXnurvan` (sul suo computer) e il carrello aggiornato in PDF. Non c'è un controllo automatico: vitastrong.it blocca i lettori automatici.

## Regole
- Articolo in **solo italiano** (`only: it` nell'intestazione): le promo sono per il mercato italiano.
- In cima: riquadro di trasparenza (ambassador, link di affiliazione, "acquistare da qui ci aiuta a migliorare qualità e frequenza dei contenuti"). Non togliere.
- Banner cliccabile (`banner-nurvan-vitastrong.jpg`, 1400 px) all'inizio, grafiche promo in griglia, banner finale con il coupon.
- Nel testo i percorsi delle immagini in HTML devono essere assoluti: `/blog-media/<cartella-articolo>/images/<file>.jpg` (il renderer riscrive solo le immagini Markdown).
- Prezzi e date: dalle grafiche e dal carrello fornito, con data di rilevazione e nota "vale il prezzo in cassa". Non inventare dosaggi dei prodotti.
- Parti scientifiche: ogni affermazione su PubMed (Cochrane/position stand), con tono onesto — dire anche dove le prove sono deboli. Nessuna promessa di effetti salutistici non autorizzati.
- Commit solo su `content/**`.

## Storico promozioni
| Data | Promo | Scadenza | Articolo |
|---|---|---|---|
| 2026-10-05 | Vitamins Week, fino al 50% sulle vitamine + 10% codice nurvan | 12 ottobre 2026, 23:59 | vitastrong-vitamins-week-codice-nurvan |
