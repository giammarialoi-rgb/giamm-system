# Da dove arrivano gli articoli del blog

1. **`content/articles/<data>-<slug>/`** — la cartella che scrive la programmazione giornaliera.
   Il blog legge `article.it.md` (intestazione tra due righe `---`: title, description, slug,
   date, category, cover, cover_credit) e serve le immagini della sottocartella `images/`.
   Se in una cartella c'e' solo `index.html`, viene mostrato il suo contenuto dentro la pagina del sito.
2. **`site/blog/<slug>.md`** — un articolo scritto a mano, con la stessa intestazione.

Per pubblicare basta che la cartella sia nel repository (commit + push): entro un minuto
dal riavvio del sito l'articolo compare in `/blog`, nella sua categoria e in home.
Un articolo con data futura resta nascosto fino a quel giorno. Cartelle e file che
iniziano con `_` non vengono pubblicati. `source-notes.md`, `credits.md` e `inbox.md`
restano nel repository ma non sono raggiungibili dal sito: sono pubbliche solo le immagini.
