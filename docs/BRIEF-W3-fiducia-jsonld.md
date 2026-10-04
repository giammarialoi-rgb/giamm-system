# BRIEF W3 — Pagine di fiducia, firma degli articoli e dati strutturati

**Repo:** giamm-system · **Sito:** nurvan.app · **Priorità:** 3 di 3
**Perché:** il blog tratta creatina e DHT, fumo in gravidanza e fertilità, peso paterno e
concepimento: sono argomenti di salute, dove Google pesa molto chi scrive e con quale
competenza. Oggi **gli articoli non hanno autore**, e `/chi-siamo`, `/autore` e `/contatti`
rispondono tutti 404. Giammaria è personal trainer certificato FIPE, coach dal 2013 e atleta di
powerlifting a livello nazionale: è un vantaggio reale che il sito non dichiara da nessuna parte.
In più il sito non ha **nessun** blocco JSON-LD.

I dati dell'autore sono già nel repo: **`content/author.md`** (con la foto in
`content/author/giammaria-loi.jpg`). Usa quel file come unica fonte, non riscrivere la bio.

## Cosa costruire

### 1. Pagine di fiducia
- **`/autore/giammaria-loi`** — foto, ruolo, certificazione FIPE, anni di attività, powerlifting,
  link Instagram (@giamm1989 personale, @nurvan.app del progetto), elenco degli articoli scritti.
  Contenuto da `content/author.md` (campo bio estesa).
- **`/chi-siamo`** — cos'è Nurvan, chi c'è dietro, e un paragrafo **"Come scegliamo le fonti"**:
  si parte dalla letteratura (PubMed, meta-analisi, position stand), ogni numero ha una fonte con
  PMID o DOI, le affermazioni sono etichettate come confermate / da precisare / smentite, e i
  contenuti sono informativi e non sostituiscono il parere di un medico.
- **`/contatti`** — email, ragione sociale, sede e partita IVA se disponibili, form di contatto.
  *Se ragione sociale e P.IVA non sono ancora definite, lascia un segnaposto evidente e
  segnalalo nel riepilogo: non inventarle.*
- **Legali sul dominio editoriale:** oggi il footer punta a `https://app.nurvan.app/privacy`,
  cioè a un altro host. Porta privacy e termini sotto `nurvan.app` (anche in reverse proxy),
  con l'header e il footer del sito.

### 2. Firma su ogni articolo
Sotto l'H1 di ogni articolo, in tutte le lingue:
```html
<p class="byline">
  di <a href="/autore/giammaria-loi">Giammaria Loi</a> — personal trainer certificato FIPE, coach dal 2013
  · <time datetime="2026-10-01">1 ottobre 2026</time>
</p>
```
- La data oggi è testo semplice: deve diventare un `<time datetime="AAAA-MM-GG">`.
- Se il frontmatter ha il campo `reviewed`, mostra anche "Ultimo aggiornamento: <data>".
- In fondo all'articolo, prima delle fonti, un blocco bio di 2 righe con la foto, preso da
  `content/author.md`, con link alla pagina autore.

### 3. Dati strutturati JSON-LD
Nessuno presente oggi. Aggiungi, come `<script type="application/ld+json">`:

- **Homepage:** `Organization` (name, url, logo assoluto, sameAs con gli Instagram),
  `WebSite`, e `SoftwareApplication` con `applicationCategory: "HealthApplication"`,
  `operatingSystem: "Web, iOS, Android"` e l'offerta del piano Free.
- **Articoli:** `BlogPosting` con `headline`, `description`, `image` (URL assoluto),
  `author` di tipo `Person` che punta a `/autore/giammaria-loi`, `publisher`, `datePublished`,
  `dateModified`, `inLanguage`.
- **Pagina autore:** `Person` con `name`, `jobTitle`, `image`, `sameAs`, `knowsAbout`.
- **FAQ:** `FAQPage` sulla sezione "Domande" della homepage (5 Q&A già scritte in pagina) e sul
  blocco "Domande frequenti" degli articoli che ce l'hanno. Il contenuto esiste già: è solo
  marcatura, ed è la strada più rapida a uno snippet esteso in SERP.
- **`BreadcrumbList`** su articoli e `/allenamenti/*`.

Regola: il JSON-LD deve rispecchiare **esattamente** ciò che è visibile in pagina. Niente FAQ
nel markup che non siano scritte nel testo.

### 4. Open Graph e Twitter Card — bug che si vede subito
`og:image` oggi è un **percorso relativo** (`/nurvan_wordmark.png`): quando un link del sito
viene condiviso su WhatsApp, LinkedIn o Telegram l'immagine **non compare**. Inoltre il wordmark
non ha le proporzioni giuste.
- Rendi `og:image` un **URL assoluto** e crea un'immagine social 1200×630 dedicata; per gli
  articoli usa la cover dell'articolo.
- Aggiungi `og:url`, `og:site_name="Nurvan"`, `og:locale` + `og:locale:alternate`,
  `og:image:width`, `og:image:height`, `og:image:alt`.
- Sugli articoli `og:type` deve essere `article` (ora è `website`), con `article:published_time`
  e `article:author`.
- Aggiungi la Twitter Card su tutte le pagine: `twitter:card="summary_large_image"`,
  `twitter:title`, `twitter:description`, `twitter:image` (assoluto).

### 5. Alt text mancanti
Le cover degli articoli hanno `alt=""` in homepage, `/blog`, pagine categoria e dentro
l'articolo. Sono contenuto, non decorazione: usa il titolo dell'articolo o una descrizione
della foto. I grafici interni hanno già alt descrittivi corretti: non toccarli.

## Criteri di accettazione
- [ ] `/autore/giammaria-loi`, `/chi-siamo` e `/contatti` rispondono 200 in italiano e sono
      raggiungibili dal footer.
- [ ] Ogni articolo mostra la firma con link alla pagina autore e un `<time datetime>` valido.
- [ ] Il validatore Rich Results di Google (o `schema.org` validator) non segnala errori su:
      homepage, un articolo, la pagina autore.
- [ ] La homepage espone `Organization`, `WebSite`, `SoftwareApplication` e `FAQPage`.
- [ ] `curl -s https://nurvan.app/ | grep 'og:image'` mostra un URL **assoluto** `https://`.
- [ ] Il debugger di condivisione di Facebook e il validator di X mostrano l'immagine corretta.
- [ ] Nessuna cover di articolo ha più `alt=""`.
- [ ] Nessuna informazione inventata: se ragione sociale o P.IVA mancano, c'è un segnaposto
      dichiarato nel riepilogo, non un dato di fantasia.

## Fuori perimetro
Ottimizzazione immagini, font e cache: sono migliorie di performance, le facciamo dopo.
