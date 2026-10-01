# Come aggiungere un articolo al blog

Un file `.md` per articolo, in questa cartella. Il nome del file diventa
l'indirizzo: `carico-giusto.md` -> `/blog/carico-giusto` (solo lettere
minuscole, numeri e trattini).

In cima al file, tra due righe `---`:

    ---
    title: Titolo dell'articolo
    date: 2026-10-01
    category: Allenamento
    excerpt: Una frase che riassume l'articolo (compare nell'elenco e su Google).
    cover: /site-assets/blog/nome-immagine.jpg
    source: https://sito-da-cui-prende-spunto.it/articolo
    ---

- `title`, `date` e `category` servono sempre; `excerpt`, `cover` e `source` sono facoltativi.
- La data decide l'ordine. Un articolo con data futura resta nascosto fino a quel giorno.
- Categorie usate finora: Allenamento, Alimentazione, Recupero, Gare ed eventi, Coach e palestre.
  Una categoria nuova si crea scrivendola: compare da sola tra i filtri.
- Le immagini vanno in `site/assets/blog/`.

Sotto l'intestazione, il testo in Markdown: `# Titolo di sezione`, `## Sottotitolo`,
paragrafi separati da una riga vuota, elenchi con `-` o `1.`, `**grassetto**`,
`*corsivo*`, `[testo del link](https://...)`, `![descrizione](/site-assets/blog/foto.jpg)`,
`> citazione`. L'HTML scritto nel testo non viene eseguito: appare come testo.

I file che iniziano con `_` (come questo) non vengono pubblicati.
