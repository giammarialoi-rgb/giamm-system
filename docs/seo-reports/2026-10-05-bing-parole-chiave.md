# SEO, Bing e parole chiave — 2026-10-05 (seconda passata)

## Bing: cosa risulta
- **IndexNow attivo** (`server/site/indexnow.mjs`): chiave servita live su `/ad3fc9381314634d2b86e65233e3c9ef.txt` (200); Bing, Yandex e Naver ricevono ogni pagina nuova o articolo modificato.
- `robots.txt` apre tutto a ogni bot (Bingbot compreso) e indica la sitemap; sitemap con hreflang e x-default.
- **Non verificabile da qui**: quante pagine Bing ha indicizzato. Una ricerca `site:nurvan.app` fatta da qui restituisce risultati non pertinenti. Serve **Bing Webmaster Tools** (verifica con meta `msvalidate.01` o file `BingSiteAuth.xml`, oggi assenti) e l'invio di `sitemap.xml`. Si può importare la proprietà direttamente da Google Search Console.
- Bing pesa più di Google le parole esatte in title, description, h1 e URL, e premia i link da altri siti: per le parole chiave valgono quindi i title sotto.

## Title e description delle pagine che puntano a una ricerca
| Pagina | Ricerca che intercetta | Prima → dopo |
|---|---|---|
| /app-allenamento-palestra | "app allenamento palestra", "schede" | title 64 → 53 caratteri, "App allenamento in palestra: schede e carichi" |
| /strumenti | "calcolatore 1RM", "calcolatore Wilks", "calcolatore macro" | 64 → 46, "Calcolatori gratuiti: 1RM, Wilks e macro" |
| /strumenti/calcolatore-macro | "calcolatore macro e calorie" | 63 → 45, "Calcolatore macro e calorie gratuito" (Mifflin-St Jeor resta nella description) |
| /blog | "allenamento, alimentazione, integratori, recupero" | description 136 → 151 (tutte le lingue) |
| /hyrox | "calendario gare HYROX", "gare HYROX Italia" | description 128 → 150 (tutte le lingue) |
| home /es e /fr | brand + categoria | title 63 e 66 → 58 e 54 |

Sono corretti nel branch `seo/2026-10-05b`. Dati strutturati: BreadcrumbList aggiunta su /blog e /hyrox in tutte le lingue.

## Cosa resta (richiede una decisione tua)
1. Registrare il sito su Bing Webmaster Tools e Google Search Console: da lì si vedono le query reali e si decide quali parole chiave spingere.
2. Title degli articoli sopra i 60 caratteri (56 pagine): vanno accorciati nel frontmatter della routine del blog.
3. Description sopra i 160 (salute, recupero, autore) e sotto i 140 (articoli, HYROX nelle lingue non latine).
4. Categorie del blog senza x-default: lo slug cambia per lingua, serve una mappa categoria↔lingua.
5. Le landing (/app-allenamento-*, /strumenti/*) esistono solo in italiano: per cercare in inglese o spagnolo servirebbero versioni tradotte, decisione di contenuto.
