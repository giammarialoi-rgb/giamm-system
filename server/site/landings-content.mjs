// The words of the landing pages, the comparison pages and the free tools
// (brief W4). Italian only: these pages have no translations and the other
// languages' sitemaps and hreflang do not mention them.
//
// Rules the text follows:
//  - the app is NOT released: nothing here says "scarica", no store badges, no
//    reviews, stars, user counters or invented numbers;
//  - every function named is in docs/APP_FUNZIONI.md or on the home page
//    (site/home.html); where one is only on one of the two it is said below;
//  - competitor facts are only those read on the official pages on
//    2026-10-03 (see COMPETITORS) and no price is quoted that is not there.

const b = (s) => "<strong>" + s + "</strong>";
const li = (items) => "<ul>" + items.map((t) => "<li>" + t + "</li>").join("") + "</ul>";

export const COACH_CTA = { href: "/lista-attesa#coach", label: "Candidati come coach fondatore" };
export const ATHLETE_CTA = { href: "/lista-attesa", label: "Entra nella lista d’attesa" };

const ARTICLE = {
  genetica: { href: "/blog/genetica-high-low-responder", text: "Low responder: quanto conta la genetica nei muscoli" },
  proteine: { href: "/blog/proteine-in-definizione", text: "Proteine in definizione: quante ne servono davvero" },
  creatina: { href: "/blog/creatina-caduta-capelli", text: "La creatina fa cadere i capelli? Cosa dicono davvero gli studi" },
  creatinaOver45: { href: "/blog/creatina-senza-allenamento-over-45", text: "Creatina senza palestra dopo i 45: cosa dice lo studio" },
  riso: { href: "/blog/riso-raffreddato-amido-resistente", text: "Riso raffreddato: quanto conta l’amido resistente" },
  guida: { href: "/blog/migliori-software-app-personal-trainer-italia", text: "Migliori software e app per personal trainer in Italia" }
};
export const ARTICLES = ARTICLE;

/* -------------------------------------------------------------------------
 * Competitors. Source and date of each datum. Read on the official page on
 * 2026-10-03 (nothing from memory, nothing from third-party reviews).
 *  - TrueCoach, https://truecoach.co/pricing/ : monthly plans Starter 26,34 USD
 *    (up to 5 active clients), Standard 57,99 USD (up to 20), Pro 136,99 USD
 *    (up to 50), 14-day free trial on each; Standard adds "Custom-Branded
 *    Fitness App", wearables (Apple, Garmin, WHOOP), "Advanced Habit and
 *    Nutrition Tracking"; Starter lists a 3,000+ video exercise library and
 *    MyFitnessPal integration; clients use it at no cost.
 *  - ABC Trainerize, https://www.trainerize.com/pricing/ : a free "Basic" plan
 *    for 1 coaching client; a 30-day free trial on the paid plans; plans up to
 *    "Studio Plus" for 500+ clients; meal/macro tracking from the Grow plan.
 *    The page shows two different prices for the same plan (9 and 10 USD for
 *    the 2-client plan): NO Trainerize price is quoted here.
 *  - Fitmatch, https://www.fitmatch.it : 15-day free trial without card,
 *    29,99 EUR/month or 19,99 EUR/month billed yearly (239,88 EUR); apps for
 *    coach and athlete; "Diario Atleta 2.0".
 *  - EvolutionFit, https://www.evolutionfit.it : owned by TeamSystem S.p.A.
 *    (Pesaro); exercise library "over 1,000 exercises" with 3D graphics, diet
 *    plans on "over 900 foods", free trial, no prices shown.
 *  - GeSoSport, https://www.gesosport.it : management platform for ASD/SSD and
 *    sports clubs; promotion at a fixed 250 EUR per year at the time of reading.
 *  - Fitnessitaly: not described, its website could not be verified (the domain
 *    was for sale on 2026-10-03).
 * ----------------------------------------------------------------------- */
export const VERIFIED_ON = "3 ottobre 2026";
export const VERIFIED_ISO = "2026-10-03";
// Date of the last edit of these pages, for the sitemap (change it when the words change).
export const LASTMOD = "2026-10-03";

export const COMPETITORS = {
  trainerize: {
    name: "Trainerize", full: "ABC Trainerize", url: "https://www.trainerize.com/pricing/",
    rows: [
      ["Disponibilità", "Si può usare già oggi", "Non ancora rilasciata: lista d’attesa"],
      ["Prova gratuita", "30 giorni sui piani a pagamento e un piano gratuito per 1 cliente", "14 giorni di prova di tutte le funzioni, senza carta (prevista al lancio)"],
      ["Prezzi", "Sono sulla pagina ufficiale (la pagina riporta due cifre diverse per lo stesso piano, quindi non le citiamo)", "Coach 19 € al mese fino a 20 atleti; Coach Pro 39 € al mese con atleti illimitati (piani previsti)"],
      ["Alimentazione", "Controllo di pasti e macro dal piano Grow", "Piano alimentare, diario, ricettario e lista della spesa"],
      ["Import di schede esistenti", "Non lo abbiamo trovato sulla pagina dei prezzi", "Excel, PDF, Word o foto, anche per assegnare la scheda a un atleta"],
      ["Fascia di clienti", "Dal singolo cliente a oltre 500 (Studio Plus)", "Da 3 atleti sul piano Standard a illimitati con Coach Pro"]
    ],
    better: [
      "Ti serve uno strumento che puoi aprire oggi, non una lista d’attesa.",
      "Gestisci una struttura grande: i suoi piani arrivano oltre i 500 clienti.",
      "Vuoi una prova più lunga (30 giorni) o iniziare gratis con un solo cliente."
    ]
  },
  truecoach: {
    name: "TrueCoach", full: "TrueCoach", url: "https://truecoach.co/pricing/",
    rows: [
      ["Disponibilità", "Si può usare già oggi", "Non ancora rilasciata: lista d’attesa"],
      ["Prova gratuita", "14 giorni su ogni piano", "14 giorni di prova di tutte le funzioni, senza carta (prevista al lancio)"],
      ["Prezzi", "In dollari: 26,34 $ al mese (fino a 5 clienti attivi), 57,99 $ (fino a 20), 136,99 $ (fino a 50)", "In euro: Coach 19 € al mese fino a 20 atleti; Coach Pro 39 € al mese con atleti illimitati (piani previsti)"],
      ["App con il tuo marchio", "Dal piano Standard", "Con Coach Pro, pensata per palestre e coach"],
      ["Alimentazione", "Controllo di abitudini e nutrizione dal piano Standard, integrazione con MyFitnessPal", "Piano alimentare, diario, ricettario e lista della spesa dentro l’app"],
      ["Libreria di esercizi", "Oltre 3.000 esercizi con video", "Oltre 250 esercizi con immagini, esecuzione, errori comuni e video"],
      ["Dispositivi indossabili", "Apple, Garmin e WHOOP dal piano Standard", "Non è tra le funzioni che dichiariamo"]
    ],
    better: [
      "Ti serve uno strumento che puoi usare oggi, non tra qualche mese.",
      "Vuoi una libreria di video più ampia (oltre 3.000 esercizi).",
      "Per te contano i dispositivi indossabili dei tuoi clienti (Apple, Garmin, WHOOP)."
    ]
  }
};

/* ------------------------------ the pages ------------------------------- */

export const PAGES = {
  "app-per-personal-trainer": {
    kind: "coach",
    title: "App per personal trainer: schede, atleti e check-in | Nurvan",
    description: "Nurvan è l’app per personal trainer e coach: schede da importare o creare, check-in programmati, chat cifrata e area coach per seguire i tuoi atleti. In arrivo.",
    h1: "App per personal trainer: schede, atleti e check-in in un posto solo",
    eyebrow: "Per i coach",
    lead: "Nurvan è un’app per personal trainer e coach che vogliono seguire i propri atleti senza file sparsi, messaggi persi e fogli di calcolo. Non è ancora uscita: stiamo cercando i primi coach fondatori che la provino con noi.",
    shot: { file: "allenamento.webp", alt: "Schermata di allenamento dell’app Nurvan con serie, carichi e RIR" },
    sections: [
      { h2: "Il lavoro di un coach non sta in una sola app", html:
        "<p>Chi segue atleti a distanza o in presenza di solito mette insieme più strumenti: un foglio Excel per la scheda, un’app di messaggi per le domande, un’altra per i pagamenti, le foto dei check-in nella galleria del telefono. Funziona finché i clienti sono pochi. Quando crescono, il tempo se ne va nel rimettere in ordine invece che nel programmare.</p>" +
        "<p>Nurvan nasce da questo problema. È scritta da un personal trainer e coach certificato FIPE che gareggia nel powerlifting a livello nazionale dal 2018, e parte dal modo in cui un coach lavora davvero: una scheda, un atleta, un controllo ogni tanto, una conversazione quando serve.</p>" },
      { h2: "Cosa puoi fare con l’area coach", html:
        "<p>Queste sono le funzioni dell’area coach che l’app prevede già oggi nella versione in sviluppo:</p>" +
        li([
          b("Schede per ogni atleta.") + " Le crei con l’app, le prendi dal database di programmi di Nurvan oppure le importi da un file Excel, PDF, Word o da una foto, e le assegni con un passaggio.",
          b("Alimentazione e integrazione.") + " Per ogni cliente puoi assegnare anche piano alimentare e integratori, oltre all’allenamento.",
          b("Check-in programmati.") + " Chiedi all’atleta come sta con la cadenza che decidi tu; trovi le risposte in un unico elenco, da rivedere.",
          b("Chat privata cifrata e videochiamata.") + " Le conversazioni coach-atleta restano dentro l’app, con allegati e dettatura; la videochiamata c’è quando il coach la consente.",
          b("Storico dei progressi.") + " Carichi, volume e massimali stimati di ogni atleta, senza chiedere un file a fine mese.",
          b("Oggi, clienti, posta in arrivo, programmi e calendario.") + " L’area coach si apre da una schermata “Oggi” che ti dice chi ha bisogno di te.",
          b("Registro economico, CRM e automazioni.") + " Un registro manuale degli incassi, una pipeline dei contatti (dal primo contatto al cliente perso) e regole automatiche che puoi provare prima di attivare. Non serve collegare Stripe."
        ]) },
      { h2: "I dati di ogni atleta restano separati", html:
        "<p>Ogni atleta ha il proprio spazio. Terapia ed esami, ad esempio, sono dati suoi: decide lui se il coach li vede. Con il piano Coach Pro il tuo marchio compare nell’app dei tuoi iscritti, utile se lavori per una palestra o vuoi un’immagine coerente con la tua attività.</p>" },
      { h2: "I piani previsti", html:
        "<p>I piani sono quelli che trovi nella home e possono cambiare prima del lancio. Il piano Coach è previsto a 19 € al mese (oppure 190 € l’anno) per seguire fino a 20 atleti, con check-in programmati, prescrizione nutrizionale e import illimitato. Il piano Coach Pro è previsto a 39 € al mese (390 € l’anno) con atleti illimitati, marchio nell’app, terapia ed esami degli atleti e export dei dati. Al lancio è prevista una prova di 14 giorni di tutte le funzioni, senza carta.</p>" },
      { h2: "Chi sono i coach fondatori", html:
        "<p>Prima dell’uscita vogliamo lavorare con un piccolo gruppo di personal trainer e coach che usino l’app con i propri clienti e ci dicano cosa manca e cosa è inutile. Non è un programma di vendita: è una candidatura, e ti rispondiamo noi. Se vuoi confrontare Nurvan con quello che usi oggi, leggi anche " +
        '<a href="' + ARTICLE.guida.href + '">' + ARTICLE.guida.text + "</a> e il confronto con " +
        '<a href="/alternativa-a-trainerize">Trainerize</a> e <a href="/alternativa-a-truecoach">TrueCoach</a>.</p>' },
      { h2: "Per saperne di più", html:
        "<p>Come si costruisce una scheda e cosa dicono gli studi su quanto contano genetica e programmazione lo trovi su " +
        '<a href="' + ARTICLE.genetica.href + '">' + ARTICLE.genetica.text + "</a>. Se i tuoi atleti seguono schede in PDF o Excel, guarda il " +
        '<a href="/software-schede-allenamento">software per schede di allenamento</a>. Se alleni persone che preparano gare, c’è la pagina sull’<a href="/app-allenamento-hyrox">allenamento per HYROX</a> e quella sul <a href="/app-powerlifting">powerlifting</a>.</p>' }
    ],
    faq: [
      { q: "Nurvan è già disponibile?", a: "No. L’app non è ancora uscita: non c’è niente da scaricare e non è sugli store. Puoi candidarti come coach fondatore o entrare nella lista d’attesa." },
      { q: "Posso importare le schede che ho già?", a: "Sì. Puoi importare una scheda da un file Excel, PDF, Word o da una foto e assegnarla a un atleta. Le parti che non scegli di importare non vengono cancellate." },
      { q: "Quanti atleti posso seguire?", a: "Il piano Coach previsto arriva a 20 atleti, il Coach Pro non ha un limite. I piani possono cambiare prima del lancio." },
      { q: "I messaggi con gli atleti sono privati?", a: "La chat coach-atleta è cifrata e ha allegati e dettatura. La videochiamata è disponibile se il coach la consente." },
      { q: "Serve collegare Stripe per gestire gli incassi?", a: "No. Il registro economico dell’area coach è manuale e non richiede Stripe." },
      { q: "Chi c’è dietro Nurvan?", a: "Giammaria Loi, personal trainer e coach certificato FIPE dal 2013, che gareggia nel powerlifting a livello nazionale dal 2018. Trovi la sua pagina nella sezione Chi siamo." }
    ],
    crumbs: [["App per personal trainer", "/app-per-personal-trainer"]]
  },

  "software-schede-allenamento": {
    kind: "coach",
    title: "Software schede di allenamento per coach e PT | Nurvan",
    description: "Come creare, importare e assegnare schede di allenamento con un software: Excel, PDF o foto, serie, carichi, RIR e progressione. Nurvan, in arrivo.",
    h1: "Software per schede di allenamento: crea, importa e assegna",
    eyebrow: "Per i coach",
    lead: "Una scheda di allenamento è un documento vivo: cambia ogni settimana e va letta in palestra, con il telefono in mano. Un software per schede di allenamento serve a tenerla in un posto solo, assegnarla all’atleta e vedere cosa ha fatto davvero.",
    shot: { file: "esercizio.webp", alt: "Scheda di un esercizio nell’app Nurvan con immagine, esecuzione ed errori comuni" },
    sections: [
      { h2: "Perché Excel e PDF non bastano più", html:
        "<p>Il foglio di calcolo è comodo da scrivere e scomodo da usare: l’atleta lo apre sul telefono, i carichi vanno annotati a parte, il coach riceve foto o messaggi e deve ricopiare tutto per capire come sta andando. Un PDF è ancora più statico. Un software dedicato fa tre cose in più: guida l’atleta serie per serie, registra quello che fa e lo rimette davanti al coach.</p>" },
      { h2: "Cosa deve fare un buon software per schede", html:
        li([
          "Permettere di " + b("costruire una scheda") + " con serie, ripetizioni, carico, recupero, RIR o RPE e superset, senza campi inutili.",
          "Leggere le " + b("schede che esistono già") + ": quando passi a un nuovo strumento non vuoi riscrivere un anno di lavoro.",
          "Mostrare all’atleta " + b("come si esegue") + " ogni esercizio, con immagini, errori comuni e video.",
          "Proporre una " + b("progressione") + " chiara, così il carico della settimana dopo non è un’ipotesi.",
          "Restituire al coach i " + b("dati reali") + ": cosa è stato fatto, con che carichi, quanto volume."
        ]) },
      { h2: "Come lo fa Nurvan", html:
        "<p>Nurvan è un’app di allenamento con un’area coach. La scheda si crea in pochi tocchi, si prende dal database di programmi di Nurvan oppure si importa da un file. L’import legge Excel, PDF, Word o una foto e trasforma il contenuto in una scheda da seguire: l’app ti mostra il risultato e le parti che non scegli di importare restano com’erano. Le schede importate si possono salvare nel database del coach senza attivarle sul proprio profilo e senza toccare i clienti.</p>" +
        "<p>Durante l’allenamento l’atleta vede serie, carichi e timer di recupero. Dopo ogni esercizio l’app dà un solo suggerimento per la volta successiva, che si può accettare, mantenere o scartare. Il database conta oltre 250 esercizi con immagine, esecuzione, errori comuni e video, anche offline.</p>" },
      { h2: "La progressione, in modo chiaro", html:
        "<p>Le schede non sono tutte uguali: ci sono modelli di progressione per l’ipertrofia e per la forza, dalla doppia progressione all’ondulata giornaliera, dalle onde 5/3/1 al peaking verso il massimale. Se i carichi si fermano, la fatica sale o i numeri calano, Nurvan propone un’altra progressione da cui ripartire dalla settimana dopo. Decide sempre il coach o l’atleta, e la modifica si può annullare. Se vuoi capire quanto contano davvero genetica e programmazione, leggi " +
        '<a href="' + ARTICLE.genetica.href + '">' + ARTICLE.genetica.text + "</a>.</p>" },
      { h2: "Dalla scheda al controllo dell’atleta", html:
        "<p>Una volta assegnata la scheda, il coach vede lo storico di ogni atleta, i check-in programmati e i massimali stimati. Per le conversazioni c’è una chat privata cifrata. Chi lavora con molti clienti può usare l’area coach (oggi, clienti, posta in arrivo, programmi, calendario) per sapere subito chi ha bisogno di attenzione. Tutto questo è descritto nella pagina <a href=\"/app-per-personal-trainer\">app per personal trainer</a>.</p>" },
      { h2: "Prima di scegliere", html:
        "<p>Nurvan non è ancora uscita, quindi oggi non è una scelta possibile: è una candidatura. Se hai bisogno di uno strumento subito, guarda il confronto onesto con <a href=\"/alternativa-a-trainerize\">Trainerize</a> e <a href=\"/alternativa-a-truecoach\">TrueCoach</a>, oppure la <a href=\"" + ARTICLE.guida.href + "\">guida ai software per personal trainer in Italia</a>.</p>" }
    ],
    faq: [
      { q: "Posso usare le mie schede Excel?", a: "Sì: Nurvan importa un file Excel, PDF o Word, e anche una foto, e lo trasforma in una scheda da seguire serie per serie." },
      { q: "Cosa succede alle parti che non importo?", a: "Restano come sono. Quando importi scegli cosa trasferire (allenamento, alimentazione, integrazione, terapia, esami) e le sezioni non scelte non vengono cancellate." },
      { q: "Quali dati mostra l’app al coach?", a: "Storico dei carichi e del volume, massimali stimati e check-in dei singoli atleti, che restano separati tra loro." },
      { q: "Si può usare senza internet?", a: "L’enciclopedia degli esercizi è pensata per essere sempre a portata di mano, anche offline." },
      { q: "È già possibile provare il software?", a: "No, non è ancora uscito. Puoi candidarti come coach fondatore dalla pagina della lista d’attesa." }
    ],
    crumbs: [["Software schede di allenamento", "/software-schede-allenamento"]]
  },

  "alternativa-a-trainerize": { kind: "compare", competitor: "trainerize",
    title: "Alternativa a Trainerize per coach italiani | Nurvan",
    description: "Nurvan e Trainerize a confronto, senza giri di parole: cosa fa ciascuno, cosa costa quello che abbiamo potuto verificare e per chi è meglio il concorrente.",
    h1: "Alternativa a Trainerize: confronto onesto con Nurvan",
    crumbs: [["Alternativa a Trainerize", "/alternativa-a-trainerize"]] },
  "alternativa-a-truecoach": { kind: "compare", competitor: "truecoach",
    title: "Alternativa a TrueCoach per coach italiani | Nurvan",
    description: "Nurvan e TrueCoach a confronto, con i prezzi letti sulla pagina ufficiale e l’elenco di chi dovrebbe scegliere TrueCoach al posto di Nurvan.",
    h1: "Alternativa a TrueCoach: confronto onesto con Nurvan",
    crumbs: [["Alternativa a TrueCoach", "/alternativa-a-truecoach"]] },

  "app-allenamento-hyrox": {
    kind: "athlete",
    title: "App di allenamento per HYROX: piano sulla data | Nurvan",
    description: "Programma di allenamento per HYROX scritto sulla data della tua gara: base, costruzione, picco e scarico, con le stazioni adattate all’attrezzatura che hai.",
    h1: "App di allenamento per HYROX: un programma scritto sulla tua gara",
    eyebrow: "Atleti · HYROX",
    lead: "HYROX ha un formato sempre uguale, e questo lo rende una gara che si può preparare con metodo. Nurvan genera un programma in base alla data della gara, alla tua categoria e all’attrezzatura che hai a disposizione. L’app non è ancora uscita.",
    shot: { file: "hyrox.webp", alt: "Programma HYROX nell’app Nurvan con le stazioni della gara" },
    sections: [
      { h2: "Come è fatta la gara", html:
        "<p>Si corrono otto chilometri, uno alla volta, e dopo ognuno c’è una stazione, sempre nello stesso ordine: ski erg 1000 m, sled push 50 m, sled pull 50 m, burpee broad jump 80 m, vogatore 1000 m, farmer carry 200 m, affondi con sandbag 100 m e wall ball per 100 ripetizioni. Il peso della slitta, dei kettlebell, del sandbag e della palla dipende dalla categoria: Open, Pro, Doubles o Relay, uomini e donne.</p>" +
        "<p>Per questo la preparazione ha due metà: la corsa e la forza resistente delle stazioni. Se lavori solo su una, l’altra ti presenta il conto verso la fine.</p>" },
      { h2: "Cosa fa il generatore di Nurvan", html:
        "<p>Scegli la categoria, il livello (prima gara, ho già gareggiato, punto al tempo), i giorni a settimana e il numero di settimane. L’app costruisce il programma indietro dalla data della gara, con quattro fasi (base, costruzione, picco e scarico pre-gara), che sono quelle che ritrovi nel programma:</p>" +
        li(["base", "costruzione", "picco", "scarico pre-gara nelle ultime settimane prima della partenza"]) +
        "<p>Il programma ha la stessa forma delle altre schede dell’app: si legge, si modifica e si registra allo stesso modo, e il core è presente almeno due volte a settimana.</p>" },
      { h2: "E se non hai la slitta?", html:
        "<p>Pochi hanno ski erg, slitta, vogatore, sandbag e wall ball sotto casa. Per questo il generatore parte da cosa hai: palestra HYROX completa, box senza slitta, palestra classica, casa con manubri o kettlebell, oppure solo corpo libero. Dove manca un attrezzo, la stazione viene sostituita da un esercizio che allena lo stesso sforzo, con una nota che spiega perché. La sostituzione non è l’allenamento originale e nel programma è detto chiaramente.</p>" },
      { h2: "Quanto tempo serve", html:
        "<p>Con una base di corsa e di pesi bastano 8 settimane; partendo da zero è meglio contarne 12-16. Le ultime settimane sono le più importanti, perché contengono simulazioni e scarico. Il calendario delle gare in Italia, in Europa e nel resto del mondo è nella pagina <a href=\"/hyrox\">calendario gare HYROX</a>, con i link alle pagine ufficiali per date, categorie e iscrizioni.</p>" },
      { h2: "Una preparazione, non una promessa", html:
        "<p>Nessun programma garantisce un tempo. Nurvan scrive la settimana, tu la fai: ciò che puoi aspettarti è un percorso ordinato verso una data, che si adatta a ciò che hai. Per l’alimentazione di chi si allena tanto, due letture utili sono " +
        '<a href="' + ARTICLE.proteine.href + '">' + ARTICLE.proteine.text + '</a> e <a href="' + ARTICLE.riso.href + '">' + ARTICLE.riso.text + "</a>. HYROX è un marchio registrato del suo titolare: Nurvan non è affiliata né approvata da HYROX, e questo è materiale di allenamento indipendente per chi si iscrive alla gara.</p>" }
    ],
    faq: [
      { q: "Come si prepara una gara HYROX?", a: "Con una base di corsa e di forza resistente, poi lavoro specifico sulle stazioni, simulazioni di gara e uno scarico finale. Nurvan scrive queste fasi a partire dalla data della tua gara." },
      { q: "Quante settimane servono?", a: "Con una base di corsa e pesi bastano 8 settimane; partendo da zero è meglio contarne 12-16." },
      { q: "Posso prepararmi senza slitta o ski erg?", a: "Sì. Il generatore parte dall’attrezzatura che hai e sostituisce le stazioni mancanti con esercizi che allenano lo stesso sforzo, indicando cosa è stato sostituito." },
      { q: "Quali categorie sono previste?", a: "Open uomini e donne, Pro uomini e donne, Doubles e Relay, con i carichi della categoria." },
      { q: "L’app è già scaricabile?", a: "No, non ancora. Puoi entrare nella lista d’attesa per sapere quando esce." }
    ],
    crumbs: [["App allenamento HYROX", "/app-allenamento-hyrox"]]
  },

  "app-powerlifting": {
    kind: "athlete",
    title: "App per powerlifting: programmi di forza e gara | Nurvan",
    description: "App per powerlifting con programmi per squat, panca e stacco: onde 5/3/1, Texas, blocchi, RPE, peaking e avvicinamento gara. Scritta da un powerlifter. In arrivo.",
    h1: "App per powerlifting: programmi per squat, panca e stacco",
    eyebrow: "Atleti · Forza",
    lead: "Chi fa powerlifting vuole sapere tre cose: che carico mettere sul bilanciere oggi, come arrivare al massimale e come non bruciarsi prima della gara. Nurvan è pensata anche per questo ed è scritta da chi gareggia a livello nazionale dal 2018.",
    shot: { file: "allenamento.webp", alt: "Allenamento di forza nell’app Nurvan con serie e carichi" },
    sections: [
      { h2: "Perché una app generica non basta", html:
        "<p>Il powerlifting ha poche alzate e molta pianificazione. Il carico dipende dal massimale, il massimale cambia, e la settimana di gara ha regole sue. Chi tiene tutto su un foglio rifà i conti a ogni seduta; chi usa un’app generica spesso trova solo un elenco di esercizi.</p>" },
      { h2: "I modelli di progressione per la forza", html:
        "<p>Per il powerlifting Nurvan ha modelli di progressione dedicati. Ogni modello cambia il modo in cui carico, ripetizioni e fatica evolvono nelle settimane:</p>" +
        li([b("Onde 5/3/1") + ": cicli di quattro settimane (5, 3, poi 5/3/1, poi scarico) su un massimale allenante al 90%", b("Metodo Texas") + ": ogni settimana una seduta di volume, una leggera e una di intensità", b("Blocchi") + ": tre fasi nette, tanto lavoro, poi lavoro più duro, poi poco lavoro molto pesante", b("Autoregolata a RPE") + ": non percentuali fisse ma un RPE bersaglio per serie, con il carico deciso in giornata", b("Peaking classico") + ": il volume scende e le percentuali salgono, fino al singolo di gara", b("Avvicinamento gara") + ": un blocco corto in cui si toglie volume e si prova il gesto di gara"]) +
        "<p>Le ultime due, dedicate alla gara, non vengono cambiate dalla funzione che suggerisce di cambiare progressione: serve a riprendere i miglioramenti quando i carichi si fermano, non a sconvolgere il picco.</p>" },
      { h2: "Massimali, carichi e storico", html:
        "<p>Puoi inserire i tuoi massimali di squat, panca e stacco e l’app li usa per calcolare i carichi. Dopo ogni esercizio trovi un suggerimento per la volta successiva e, quando vuoi approfondire, massimali stimati, volume e storico. Per fare i conti da solo c’è anche il <a href=\"/strumenti/calcolatore-1rm\">calcolatore 1RM</a> e il <a href=\"/strumenti/calcolatore-wilks-ipf-gl\">calcolatore Wilks e IPF GL</a>, gratuiti e senza registrazione.</p>" },
      { h2: "Chi l’ha scritta", html:
        "<p>Giammaria Loi, fondatore di Nurvan, si allena con i pesi dal 2012, è personal trainer e coach certificato FIPE dal 2013 e gareggia nel powerlifting a livello nazionale dal 2018. La scelta dei modelli, del loro ordine e dei loro limiti viene da quell’esperienza, controllata sugli studi pubblicati. Se vuoi un esempio di come ragioniamo, leggi " +
        '<a href="' + ARTICLE.genetica.href + '">' + ARTICLE.genetica.text + '</a> o <a href="' + ARTICLE.creatina.href + '">' + ARTICLE.creatina.text + "</a>.</p>" },
      { h2: "Se segui un coach", html:
        "<p>Se il tuo coach ti manda la scheda in PDF o Excel, puoi importarla nell’app e allenarti con serie, carichi e timer. Se sei tu il coach, guarda la pagina <a href=\"/app-per-personal-trainer\">app per personal trainer</a>.</p>" },
      { h2: "Cosa non fa", html:
        "<p>Nurvan non sostituisce un allenatore che ti guarda sotto il bilanciere e non promette un totale. È uno strumento per tenere in ordine pianificazione e dati. L’app non è ancora uscita: non c’è niente da scaricare, e puoi iscriverti alla lista d’attesa.</p>" }
    ],
    faq: [
      { q: "Quale progressione è meglio per il powerlifting?", a: "Dipende dal livello e dal momento. Onde 5/3/1, Texas, blocchi e RPE servono a costruire; peaking classico e avvicinamento gara servono per l’ultima parte prima della gara." },
      { q: "L’app calcola i carichi dai miei massimali?", a: "Sì: inserisci i massimali di squat, panca e stacco e i carichi si calcolano da quelli." },
      { q: "Posso calcolare il punteggio Wilks o IPF GL?", a: "Sì, con i calcolatori gratuiti della sezione Strumenti, che funzionano nel browser senza registrarsi." },
      { q: "Posso importare la scheda del mio coach?", a: "Sì, da Excel, PDF, Word o foto." },
      { q: "L’app è già disponibile?", a: "No. Non è ancora uscita: puoi entrare nella lista d’attesa." }
    ],
    crumbs: [["App powerlifting", "/app-powerlifting"]]
  },

  "app-allenamento-palestra": {
    kind: "athlete",
    title: "App allenamento in palestra: schede, carichi, progressi | Nurvan",
    description: "Come usare un’app per l’allenamento in palestra: schede, carichi, RIR, progressione e storico. Per ipertrofia, forza, HYROX e powerlifting. Nurvan, in arrivo.",
    h1: "App per l’allenamento in palestra: schede, carichi e progressi",
    eyebrow: "Atleti",
    lead: "Allenarsi in palestra con metodo significa sapere cosa fare oggi, con che carico, e rendersi conto se il lavoro sta funzionando. Un’app serve a questo, a patto che ti lasci in pace durante la serie. Nurvan non è ancora uscita: qui spieghiamo cosa fa.",
    shot: { file: "home.webp", alt: "Schermata principale dell’app Nurvan con la prossima seduta in primo piano" },
    sections: [
      { h2: "Cosa deve fare un’app da palestra", html:
        "<p>In palestra hai poco tempo e le mani occupate. Un’app utile ti dice quale esercizio viene dopo, quante serie, che carico e quanto recuperare, e si prende il tuo dato con un tocco. Il resto (grafici, storico, massimali) deve essere lì quando lo cerchi, non in mezzo.</p>" },
      { h2: "Una seduta in Nurvan", html:
        "<p>Ogni seduta mostra serie, ripetizioni, carico e RIR, con superset e timer di recupero. Alla fine di un esercizio vedi un solo suggerimento per la volta successiva, per esempio il peso consigliato con un piccolo incremento. Puoi accettare, mantenere o scartare. Se hai già la scheda del tuo coach, la importi da Excel, PDF, Word o da una foto; se non l’hai, la generi in pochi tocchi a partire dall’attrezzatura e dal tempo che hai.</p>" },
      { h2: "Progressi che si leggono", html:
        "<p>Dopo gli allenamenti trovi massimali stimati, volume e storico. Se i carichi si fermano, la fatica sale o i numeri calano, l’app te lo dice e propone un’altra progressione da cui ripartire dalla settimana dopo. Quanto sia importante la risposta individuale all’allenamento lo spiega <a href=\"" + ARTICLE.genetica.href + "\">" + ARTICLE.genetica.text + "</a>.</p>" },
      { h2: "Per chi ha un obiettivo specifico", html:
        "<p>Se prepari una gara, ci sono due percorsi dedicati: il programma sulla data per <a href=\"/app-allenamento-hyrox\">HYROX</a> e i modelli di progressione per il <a href=\"/app-powerlifting\">powerlifting</a>. Per ipertrofia e forza di base ci sono modelli come la doppia progressione, l’onda di volume 3:1 e l’ondulata giornaliera. Se vuoi mettere a posto i numeri prima di iniziare, usa gratis il <a href=\"/strumenti/calcolatore-1rm\">calcolatore 1RM</a> e il <a href=\"/strumenti/calcolatore-macro\">calcolatore macro</a>.</p>" },
      { h2: "Alimentazione e integrazione, se vuoi", html:
        "<p>Nurvan tiene insieme anche il piano alimentare, il diario a calendario, 150 ricette con macro e costo e gli integratori con dose e orario. Sono funzioni opzionali: puoi usare l’app solo per allenarti. Per le basi scientifiche leggi " +
        '<a href="' + ARTICLE.proteine.href + '">' + ARTICLE.proteine.text + '</a> e <a href="' + ARTICLE.creatinaOver45.href + '">' + ARTICLE.creatinaOver45.text + "</a>.</p>" },
      { h2: "Come scegliere un’app per allenarti", html:
        "<p>Prima di installarne una, controlla tre cose. Primo: quanto ci metti a registrare una serie, perché se serve più di un tocco la smetterai presto. Secondo: se puoi portare dentro le schede che hai già, invece di ricominciare da zero. Terzo: se ti dice come ti stai muovendo davvero, con un dato che capisci, e non solo un grafico. Nurvan è pensata attorno a queste tre cose, ma finché non esce il consiglio è di provare qualunque app con una settimana di allenamenti veri prima di giudicarla.</p>" },
      { h2: "A casa e in palestra", html:
        "<p>La stessa app serve anche quando ti alleni a casa: il generatore parte dall’attrezzatura che hai, e ci sono programmi di Pilates, mobilità, calisthenics e HIIT. Quando l’app uscirà, potrai iniziare con il piano gratuito e provare tutte le funzioni per 14 giorni.</p>" }
    ],
    faq: [
      { q: "Qual è la differenza tra un’app e una scheda su carta?", a: "L’app guida la seduta serie per serie, registra i carichi, calcola il suggerimento per la volta dopo e conserva lo storico. Sulla carta devi fare tutto a mano." },
      { q: "Posso usare la scheda del mio personal trainer?", a: "Sì: puoi importarla da un file Excel, PDF, Word o da una foto." },
      { q: "Serve il piano alimentare per usare l’app?", a: "No, l’alimentazione è una parte opzionale: puoi usare Nurvan solo per l’allenamento." },
      { q: "Che cos’è il RIR?", a: "Sono le ripetizioni che ti restano in riserva alla fine di una serie. Nurvan lo usa per calibrare i carichi." },
      { q: "Quando esce l’app?", a: "Non c’è ancora una data pubblica. Iscriviti alla lista d’attesa per saperlo." }
    ],
    crumbs: [["App allenamento palestra", "/app-allenamento-palestra"]]
  }
};

/* ------------------------------ the tools -------------------------------- */

export const TOOLS = {
  "calcolatore-1rm": {
    title: "Calcolatore 1RM gratuito: formule Epley e Brzycki | Nurvan",
    description: "Calcola il massimale stimato (1RM) da peso e ripetizioni con le formule di Epley e Brzycki, e ottieni la tabella dei carichi in percentuale. Gratis, nel browser.",
    h1: "Calcolatore 1RM: stima il tuo massimale da peso e ripetizioni",
    name: "Calcolatore 1RM",
    lead: "Inserisci il peso che hai sollevato e le ripetizioni: ottieni il massimale stimato con le formule di Epley e Brzycki e la tabella dei carichi in percentuale.",
    formula: "<h2>Come si calcola</h2><p>Il massimale stimato (1RM) è il carico che potresti sollevare per una sola ripetizione. Qui si usano due formule molto diffuse:</p>" +
      "<ul><li><strong>Epley</strong>: 1RM = peso × (1 + ripetizioni ÷ 30)</li><li><strong>Brzycki</strong>: 1RM = peso × 36 ÷ (37 − ripetizioni)</li></ul>" +
      "<p>Con una sola ripetizione il risultato è il peso stesso. Entrambe le formule sono tarate su serie fino a circa dieci ripetizioni: il calcolatore accetta da 1 a 12 ripetizioni. Sono stime, non misure: la tecnica, la fatica e l’esercizio fanno variare il risultato di qualche chilo.</p>" +
      "<p>La tabella a destra mostra il carico per ogni percentuale del massimale, arrotondato ai 2,5 kg più vicini, utile per costruire le serie di lavoro.</p>",
    faq: [
      { q: "Qual è la formula più precisa, Epley o Brzycki?", a: "Nessuna delle due è la più precisa in assoluto: entrambe sono stime e sono più affidabili con poche ripetizioni (da 2 a 6). Con più ripetizioni i risultati si allontanano." },
      { q: "Posso usare più di 12 ripetizioni?", a: "Il calcolatore si ferma a 12 perché oltre le stime perdono affidabilità; la formula di Brzycki non è nemmeno definita da 37 ripetizioni in su." },
      { q: "Devo testare il massimale vero?", a: "Non è necessario per allenarsi bene: una serie di 3-5 ripetizioni vicino al limite dà una stima utile e riduce i rischi di un tentativo massimale." },
      { q: "I dati che inserisco vengono salvati?", a: "No. Il calcolo avviene nel browser e nessun dato viene inviato o salvato." }
    ]
  },
  "calcolatore-wilks-ipf-gl": {
    title: "Calcolatore Wilks e IPF GL: punti powerlifting | Nurvan",
    description: "Calcola i punti Wilks e IPF GL (GOODLIFT) dal tuo totale e dal peso corporeo. Classic o equipaggiato, totale o panca. Gratis, nel browser, senza registrazione.",
    h1: "Calcolatore Wilks e IPF GL per il powerlifting",
    name: "Calcolatore Wilks e IPF GL",
    lead: "Inserisci sesso, peso corporeo e totale: ottieni i punti Wilks e IPF GL (GOODLIFT), per confrontare risultati di atleti di peso diverso.",
    formula: "<h2>Come si calcola</h2><p>I punti servono a confrontare atleti di peso corporeo diverso. Sono il risultato moltiplicato per un coefficiente che dipende dal peso e dal sesso.</p>" +
      "<ul><li><strong>Wilks</strong> (coefficienti del 2005): punti = totale × 500 ÷ (a + b·x + c·x² + d·x³ + e·x⁴ + f·x⁵), dove x è il peso corporeo in kg.</li>" +
      "<li><strong>IPF GL</strong> (GOODLIFT, formula IPF dal 2020): punti = totale × 100 ÷ (A − B·e<sup>−C·peso</sup>), con costanti diverse per sesso, per powerlifting classico o equipaggiato e per totale o sola panca.</li></ul>" +
      "<p>Le costanti sono quelle del progetto OpenPowerlifting, che le pubblica come software aperto. La Wilks è stata sostituita dalla IPF GL nelle competizioni IPF; resta molto usata per confronto. I punti sono un confronto, non un giudizio sull’atleta.</p>" +
      "<p>I coefficienti sono definiti entro certi limiti di peso: la Wilks è limitata tra 40 e 201,9 kg per gli uomini e tra 26,51 e 154,53 kg per le donne, la IPF GL parte da 35 kg. Fuori da questi intervalli il calcolatore usa il limite più vicino (Wilks) o non calcola (IPF GL).</p>",
    faq: [
      { q: "Qual è la differenza tra Wilks e IPF GL?", a: "Sono due formule per confrontare atleti di peso diverso. IPF GL è quella ufficiale IPF dal 2020, la Wilks è la precedente e rimane molto usata." },
      { q: "Che cosa inserisco come totale?", a: "La somma dei migliori tentativi validi di squat, panca e stacco in kg. Per la sola panca, il miglior tentativo valido." },
      { q: "Posso usarlo per l’equipaggiato?", a: "Sì: per la IPF GL puoi scegliere classic o equipaggiato (singolo strato), e totale o panca." },
      { q: "I miei dati vengono salvati?", a: "No. Il calcolo avviene nel browser e nessun dato viene inviato o salvato." }
    ]
  },
  "calcolatore-macro": {
    title: "Calcolatore macro e calorie gratuito (Mifflin-St Jeor) | Nurvan",
    description: "Stima il fabbisogno di calorie, proteine, carboidrati e grassi con la formula di Mifflin-St Jeor per dimagrire, mantenere o aumentare. Non è un consiglio medico.",
    h1: "Calcolatore macro e calorie: una stima di partenza",
    name: "Calcolatore macro",
    lead: "Inserisci sesso, età, altezza, peso, attività e obiettivo: ottieni una stima di calorie, proteine, carboidrati e grassi da cui partire.",
    warning: "Questo calcolatore dà una stima generica e non è un consiglio medico né un piano alimentare. Se hai una patologia, sei in gravidanza o in allattamento, hai un disturbo alimentare o prendi farmaci, chiedi al medico o al dietista.",
    formula: "<h2>Come si calcola</h2><p>Il metabolismo basale (BMR) si stima con la formula di Mifflin-St Jeor: 10 × peso (kg) + 6,25 × altezza (cm) − 5 × età, più 5 per gli uomini o meno 161 per le donne. Si moltiplica per un fattore di attività (sedentario 1,2; leggero 1,375; moderato 1,55; alto 1,725; molto alto 1,9) e si ottiene il fabbisogno giornaliero.</p>" +
      "<p>L’obiettivo modifica le calorie: −15% per dimagrire, +10% per aumentare, nessuna variazione per mantenere. I macronutrienti si dividono così: proteine 2 g per kg di peso in dimagrimento e 1,8 g negli altri casi, grassi il 25% delle calorie, carboidrati il resto. Sono scelte di partenza, comuni nella pratica, non la regola per tutti.</p>" +
      "<p>È una stima: il fabbisogno reale varia da persona a persona di centinaia di calorie. Il modo migliore per correggerla è osservare peso e prestazioni per due o tre settimane e aggiustare. Per capire quante proteine servono davvero in definizione, leggi <a href=\"" + ARTICLE.proteine.href + "\">" + ARTICLE.proteine.text + "</a>.</p>",
    faq: [
      { q: "Perché Mifflin-St Jeor?", a: "È una formula molto usata per stimare il metabolismo basale negli adulti sani, ed è semplice da applicare a mano." },
      { q: "Il risultato è la dieta che devo seguire?", a: "No: è un punto di partenza. Non tiene conto di patologie, farmaci o esigenze particolari." },
      { q: "Perché le proteine sono diverse se dimagrisco?", a: "In deficit calorico una quota proteica un po’ più alta aiuta a conservare la massa magra; qui usiamo 2 g per kg invece di 1,8 g." },
      { q: "I miei dati vengono salvati?", a: "No. Il calcolo avviene nel browser e nessun dato viene inviato o salvato." }
    ]
  }
};
