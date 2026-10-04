# Task: link YouTube verificati per esercizio (al posto della sola ricerca generica)

## Contesto
- In `data/youtube-links.json` c'è una mappatura per ogni esercizio del catalogo (`web/exercise-catalog-extra.js`, chiave `name`) e per ogni riscaldamento (`web/warmup-exercise-library.js`, chiave `id`).
- Ogni voce ha:
  - `youtube_demo`: `{channel, id, title, duration_s, url, verified: true, verified_on}` **oppure `null`**. È uno **YouTube Short** (verticale, ≤60 s, `format: 'short'`, url `youtube.com/shorts/ID`) che mostra SOLO quell'esercizio, verificato guardando i fotogrammi. Presente per 182 esercizi su 216 e 23 riscaldamenti su 33. Gli Shorts non hanno pre-roll pubblicitario: aprire sempre l'url `shorts/` (non `watch?v=`).
  - `youtube_query`: stringa di fallback per la ricerca YouTube.
- Oggi l'app offre già un pulsante che apre una ricerca YouTube (vedi `test_warmup_overview_youtube.mjs`, `web/exercise-media-ui.js`). Va mantenuto come fallback.

## Regola non negoziabile
Un link sbagliato è peggio di nessun link. L'app apre un video specifico **solo se `youtube_demo` esiste ed è `verified === true`**. In ogni altro caso apre la ricerca YouTube con `youtube_query` (o con il nome dell'esercizio, come oggi). Mai dedurre/indovinare un video lato client.

## Cosa fare
1. Caricare `data/youtube-links.json` come dato statico offline-first, con la stessa convenzione degli altri cataloghi (nessuna chiamata di rete per leggerlo). Esporre una funzione tipo `getExerciseVideoLink(exerciseName | warmupId) → { kind: 'demo' | 'search', url, label }`.
2. Nel pulsante YouTube della scheda esercizio (e del riscaldamento):
   - se `kind === 'demo'`: etichetta "Vedi esecuzione", apre `url` (formato `youtube.com/shorts/ID`) (deep link che l'app YouTube intercetta; su web apre in nuova scheda). Mostrare in piccolo il nome del canale (`channel`) come fonte.
   - se `kind === 'search'`: comportamento attuale, etichetta "Cerca su YouTube".
   - Nessun embed/iframe: solo link esterno (coerente con la scelta già presa nel codice).
3. Match robusto: la chiave è `name` esatto per gli esercizi e `id` per i riscaldamenti. Se un esercizio del catalogo non ha una voce nel JSON, trattarlo come `search`. Non fare fuzzy matching.
4. Override coach/admin (facoltativo ma utile): se esiste già una struttura per metadati per-esercizio lato coach, permettere un campo `youtube_override_id` che, se presente, ha priorità sulla mappatura. Se non esiste una struttura adatta, saltare questo punto e segnalarlo.
5. Test (stile dei `test_*.mjs` esistenti):
   - esercizio con demo verificata → url `watch?v=<id>`;
   - esercizio senza voce o con `youtube_demo: null` → url di ricerca;
   - voce con `verified: false` (creane una fittizia nel test) → url di ricerca;
   - riscaldamento con demo → url shorts; riscaldamento senza → ricerca.
6. Aggiornare `test_warmup_overview_youtube.mjs` se le sue asserzioni sull'URL cambiano, e documentare in README/docs come si aggiunge o corregge un link (modifica del JSON + `verified: true`).

## Non fare
- Non scaricare, ri-ospitare o incorporare i video.
- Non modificare i nomi degli esercizi nel catalogo per farli combaciare col JSON: se un nome non combacia, correggi il JSON.
- Non aggiungere dipendenze esterne per questa feature.

## Output atteso
PR con: loader del JSON, funzione di risoluzione link, aggiornamento UI del pulsante, test verdi, nota nei docs. Elenca nel messaggio finale quanti esercizi risolvono a `demo` e quanti a `search`.
