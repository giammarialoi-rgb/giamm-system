# BRIEF W1 — Lista d'attesa e candidatura founding coach

**Repo:** giamm-system · **Sito:** nurvan.app · **Priorità:** 1 di 3 (fare per primo)
**Perché:** oggi il sito non ha nessun percorso di conversione. Il CTA principale della homepage
è `<span class="btn soon" aria-disabled="true">In arrivo</span>`: non è un link, non è
scansionabile, e non raccoglie niente. Stiamo costruendo un pubblico su Instagram e sul blog
senza un posto dove mandarlo. Finché manca questa pagina, ogni visita è persa.
**Obiettivo commerciale:** raccogliere email per il lancio e soprattutto intercettare i COACH,
che valgono 190–390 €/anno contro i 24 €/anno di un utente Standard e che portano con sé i
propri atleti.

## Cosa costruire

### 1. Pagina `/lista-attesa` (italiano, lingua master)
Pagina indicizzabile, server-rendered come il resto del sito, con lo stesso layout, header e
footer delle altre pagine.

Contenuti, in quest'ordine:
- H1: `Nurvan sta arrivando. Entra nella lista.`
- Un paragrafo di 2-3 frasi: cos'è Nurvan e cosa riceve chi si iscrive (accesso anticipato,
  nessuno spam, email solo quando c'è qualcosa di concreto).
- **Form email** (vedi punto 3).
- Un blocco con 4-5 punti sulle funzioni principali, ripresi dalla homepage.
- **Sezione "Sei un personal trainer o un coach?"** con link/anchor alla sezione coach sotto.

### 2. Sezione/pagina `/lista-attesa/coach` (o anchor `#coach` nella stessa pagina)
Questa è la parte che conta di più. Testo rivolto ai coach, non agli atleti:
- H2: `Cerchiamo 10 coach fondatori.`
- Cosa offriamo: **Coach Pro gratuito per 12 mesi** (valore 390 €), accesso diretto allo
  sviluppo, le loro richieste hanno priorità.
- Cosa chiediamo: che lo usino davvero con i propri atleti e che diano feedback.
- Form di candidatura con i campi: nome, email, Instagram o sito, numero di atleti seguiti
  attualmente (fascia: 1-5 / 6-20 / 21-50 / oltre 50), qualifica o certificazione (testo
  libero), un campo note facoltativo.

### 3. Raccolta dei dati
- Le iscrizioni vanno salvate dove sono poi recuperabili: tabella dedicata su Postgres
  (`waitlist` e `coach_applications`) **oppure**, se è più rapido, un servizio email esterno.
  Scegli la via più semplice già compatibile con lo stack attuale e scrivi nel riepilogo quale
  hai scelto e perché.
- Doppio opt-in non necessario in questa fase, ma il form deve avere la casella di consenso
  privacy con link alla privacy policy, e salvare data/ora del consenso.
- Protezione anti-spam senza CAPTCHA: honeypot + rate limit per IP.
- Dopo l'invio: messaggio di conferma in pagina (non un redirect), diverso per i due form.
- Nessun dato sensibile oltre a quelli elencati.

### 4. Collegamenti dal resto del sito
- Sostituisci il `<span>In arrivo</span>` della homepage con un vero `<a href="/lista-attesa">`
  che mantiene lo stile attuale. Il testo del bottone diventa `Entra nella lista`.
- Aggiungi una voce `Lista d'attesa` nel footer.
- Aggiungi in fondo a ogni articolo del blog, sotto il box Nurvan, un link alla lista d'attesa.

### 5. Multilingua
Crea la pagina in tutte le lingue già presenti sul sito, con gli hreflang coerenti con il
sistema esistente (reciproci + `x-default`). Lo slug può restare `/lista-attesa` per l'italiano
e `/waitlist` per le altre lingue, purché gli hreflang siano corretti.

## Criteri di accettazione
- [ ] `https://nurvan.app/lista-attesa` risponde 200 e il suo contenuto è presente nell'HTML
      grezzo (verifica con `curl -s https://nurvan.app/lista-attesa | grep -i "<h1"`).
- [ ] La homepage non contiene più `aria-disabled="true"` sul CTA principale: c'è un `<a href>`.
- [ ] Entrambi i form salvano correttamente: inviane uno di prova e verifica che il record
      esista nella destinazione scelta.
- [ ] Il form rifiuta un invio senza consenso privacy e un invio con il campo honeypot pieno.
- [ ] La pagina ha title e meta description propri (title ≤ 60 caratteri, description 140-160).
- [ ] Gli hreflang della pagina sono reciproci su tutte le lingue e includono `x-default`.
- [ ] Nessuna regressione: la homepage e il blog continuano a rispondere 200.

## Fuori perimetro
Non toccare la sitemap, i dati strutturati e le pagine di fiducia: sono i brief W2 e W3.
