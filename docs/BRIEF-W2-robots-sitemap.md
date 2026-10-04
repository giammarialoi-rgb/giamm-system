# BRIEF W2 — robots.txt, sitemap.xml e invio a Search Console

**Repo:** giamm-system · **Sito:** nurvan.app · **Priorità:** 2 di 3
**Perché:** `https://nurvan.app/robots.txt` e `https://nurvan.app/sitemap.xml` rispondono
entrambi **404**. Il sito ha circa 170 URL indicizzabili (17 pagine × 10 lingue) e nessuno è
dichiarato da nessuna parte. Stiamo pubblicando un articolo al giorno in un posto che Google
deve trovare per caso. È l'intervento con il miglior rapporto tra impatto e lavoro.

## Cosa costruire

### 1. `/robots.txt`
Servito a `https://nurvan.app/robots.txt` con `Content-Type: text/plain`:

```
User-agent: *
Allow: /

Sitemap: https://nurvan.app/sitemap.xml
```

Non bloccare nulla: in questa fase vogliamo che tutto sia scansionabile.

### 2. `/sitemap.xml` — generata dinamicamente, non scritta a mano
Deve generarsi dalle stesse strutture dati che già producono le pagine e il blog, così resta
aggiornata da sola quando la task giornaliera pubblica un articolo nuovo. Una sitemap statica da
aggiornare a mano si romperà entro una settimana.

Requisiti:
- Include tutte le pagine: homepage, `/allenamenti` e le sue sottopagine, `/hyrox`, `/blog`,
  le pagine categoria, tutti gli articoli, la nuova `/lista-attesa` — per ogni lingua.
- `<lastmod>` con la data reale di ultima modifica (per gli articoli, la data dell'articolo o
  la data di revisione), in formato W3C.
- Per ogni URL includi i blocchi alternate hreflang:
  ```xml
  <url>
    <loc>https://nurvan.app/blog/creatina-caduta-capelli</loc>
    <lastmod>2026-10-01</lastmod>
    <xhtml:link rel="alternate" hreflang="it" href="https://nurvan.app/blog/creatina-caduta-capelli"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://nurvan.app/en/blog/creatine-hair-loss"/>
    <!-- ...tutte le lingue... -->
    <xhtml:link rel="alternate" hreflang="x-default" href="https://nurvan.app/blog/creatina-caduta-capelli"/>
  </url>
  ```
  con il namespace `xmlns:xhtml="http://www.w3.org/1999/xhtml"` sul tag `<urlset>`.
- Se supera i 1.000 URL, passa a una sitemap index con una sitemap per lingua.
- Escludi: le pagine legali su un altro host, eventuali pagine di errore.
- `Content-Type: application/xml`.

### 3. Correzioni correlate, veloci
- `/favicon.ico` risponde 404 (esiste solo `/icon-192.png`): aggiungi un favicon.
- Rimuovi l'header `x-powered-by: Express`.
- Aggiungi un 301 da `/it/*` alla root equivalente: oggi chi scrive `/it/blog` prende un 404.
- Normalizza il trailing slash con un 301 (`/blog/` → `/blog`) invece di affidarti solo al
  canonical.

## Dopo il deploy — passaggi manuali per Giammaria
1. Google Search Console → aggiungi la proprietà `nurvan.app` (verifica via DNS o file HTML).
2. Invia `https://nurvan.app/sitemap.xml`.
3. Chiedi l'indicizzazione della homepage e di 2-3 articoli con lo strumento "Controllo URL".
4. Ripeti l'invio della sitemap su Bing Webmaster Tools (si può importare da Search Console).

## Criteri di accettazione
- [ ] `curl -s https://nurvan.app/robots.txt` restituisce il testo atteso con status 200.
- [ ] `curl -s https://nurvan.app/sitemap.xml | head -5` restituisce XML valido con status 200.
- [ ] La sitemap contiene almeno un URL per ogni lingua e per ogni articolo pubblicato.
- [ ] Ogni `<url>` ha `<lastmod>` e i blocchi hreflang con `x-default`.
- [ ] Pubblicando un articolo nuovo, la sitemap lo include **senza interventi manuali**
      (verificalo generando la sitemap dopo aver aggiunto un articolo di prova, poi rimuovilo).
- [ ] `curl -sI https://nurvan.app/` non contiene più `x-powered-by`.
- [ ] `curl -sI https://nurvan.app/it/blog` restituisce 301, non 404.

## Fuori perimetro
I dati strutturati JSON-LD sono il brief W3.
