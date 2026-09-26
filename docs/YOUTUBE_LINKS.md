# Link YouTube di esercizi e riscaldamenti

Il pulsante YouTube della scheda esercizio (CHIEDI INFO), delle stazioni dei circuiti e dei riscaldamenti (player e VISUALIZZA) apre:

- **il clip verificato** dell'esercizio: uno YouTube Short che mostra solo quel movimento, controllato a mano. Il pulsante dice «Vedi esecuzione», con la fonte in piccolo;
- **altrimenti la ricerca YouTube**, come prima («Cerca su YouTube»), con `youtube_query` se la voce c'è, se no con il nome dell'esercizio.

È sempre un link esterno, mai un video incorporato: sul telefono lo apre l'app YouTube, sul web una nuova scheda.

**Regola:** un link sbagliato è peggio di nessun link. Un video si apre solo se `youtube_demo.verified === true` e l'indirizzo è esattamente `https://www.youtube.com/shorts/<id>` (o `watch?v=<id>`) del suo stesso `id`. L'app non indovina e non cerca nomi simili. Lo controllano due volte:

1. il build (`build_youtube_links.mjs`), che scarta e segnala ogni demo che non rispetta la regola;
2. la pagina (`youtubeVerifiedDemoUrl` in `web/index.base.html`).

## Dove stanno i dati

- **Sorgente:** `data/youtube-links.json`, una voce per ogni esercizio del catalogo (`web/exercise-catalog-extra.js`, chiave `name` esatta) e per ogni riscaldamento (`web/warmup-exercise-library.js`, chiave `id`).
- **File generato:** `web/youtube-links.js`, prodotto da `node build_master25.mjs` (o da `node build_youtube_links.mjs`). È caricato dalla pagina, messo in cache dal service worker e copiato negli asset Android: funziona offline e leggerlo non richiede connessione. Non va modificato a mano.

## Aggiungere o correggere un link

1. Trova la voce in `data/youtube-links.json`:
   - per un esercizio, `name` è identico al catalogo, maiuscole comprese;
   - per un riscaldamento, cerca l'`id` della libreria.

   Se il nome non combacia, correggi il JSON, non il catalogo.
2. Guarda il video e verifica che mostri **solo** quell'esercizio, eseguito bene. Preferisci uno Short: niente pubblicità iniziale.
3. Scrivi la demo:
   ```json
   "youtube_demo": {
     "id": "kUIY-keZ11A",
     "url": "https://www.youtube.com/shorts/kUIY-keZ11A",
     "title": "Titolo del video",
     "format": "short",
     "verified": true,
     "verified_on": "AAAA-MM-GG",
     "verified_by": "chi l'ha guardato"
   }
   ```
   `channel` (nome del canale) e `duration_s` (secondi) sono facoltativi. Se ci sono, il pulsante li mostra: «Vedi esecuzione (10 s)» e la fonte.
4. Per togliere un video sbagliato metti `"youtube_demo": null`, oppure `"verified": false` finché non è ricontrollato: il pulsante torna alla ricerca.
5. Esegui `node build_master25.mjs` e `node test_youtube_links.mjs`. Il test controlla, tra l'altro, che ogni `name` e ogni `id` esistano nel catalogo e che ogni esercizio apra esattamente la demo verificata del file, oppure la ricerca.

## Video scelto dal coach

Una riga del programma può avere `youtube_override_id`, cioè l'id di 11 caratteri di un video. Se è presente, ha la precedenza sulla mappatura, e la scheda esercizio apre `watch?v=<id>` con la fonte «scelto dal coach». Il coach non ha ancora un campo nell'interfaccia per impostarlo: oggi lo si scrive solo nei dati del programma.
