// I testi delle pagine Guida, Privacy e Collega, e della pagina di benvenuto (7.11). Li usa
// js/viste/pagine.js. Stesse regole di scrittura di js/testi.js (7.1), e la prova 9.8 li legge tutti.

// La tabella della Guida e del README, con le regole a punti. Per ogni voce cosa la lascia verde,
// cosa la fa pesare e quando porta al rosso.
export const GUIDA_SEMAFORO = [
  {
    voce: "HRV, la variabilità del battito",
    verde: "Nel tuo normale. Sopra il solito non è un premio, a volte arriva con la stanchezza.",
    giallo: "Sotto il tuo normale stanotte, o nella media della settimana. Molto sotto, conta il doppio e il semaforo ti fa una domanda prima di decidere.",
    rosso: "Mai da sola. Solo insieme ad altri segnali che vanno d'accordo, per esempio da tre mattine e con poca energia.",
  },
  {
    voce: "Battito a riposo",
    verde: "Fino a 2 battiti sopra il tuo normale.",
    giallo: "3 battiti sopra il tuo normale. Con 5, o con 3 per due notti, conta il doppio.",
    rosso: "Con 7 battiti sopra e un sintomo del pannello «Sto male», oppure insieme ad altri segnali che vanno d'accordo.",
  },
  {
    voce: "Sonno",
    verde: "Almeno 6 ore, e non molto meno del tuo solito.",
    giallo: "Meno di 6 ore, un'ora e mezza meno del tuo solito, o una settimana in media sotto le 6 ore e mezza. Meno di 5 ore, o due notti sotto le 6, conta il doppio.",
    rosso: "Mai da solo. Solo insieme ad altri segnali che vanno d'accordo.",
  },
  {
    voce: "Carico recente",
    verde: "In linea con il tuo solito.",
    giallo: "Oltre 1,3 volte il solito, con almeno 15 punti di differenza. Oltre 1,5 volte e 25 punti conta il doppio.",
    rosso: "Molto alto per tre mattine di fila, fuori dai viaggi e dai giorni dopo le fatiche volute.",
  },
  {
    voce: "Energia",
    verde: "Tanta o normale.",
    giallo: "Poca.",
    rosso: "Sono a pezzi. Il semaforo diventa rosso comunque.",
  },
  {
    voce: "Gambe",
    verde: "Fresche o normali.",
    giallo: "Un po' indolenzite. Molto doloranti conta il doppio, e il semaforo chiede se ti cambiano la pedalata.",
    rosso: "Molto doloranti, con la pedalata che cambia o peggiora pedalando.",
  },
  {
    voce: "Acciacchi, oggi o ieri",
    verde: "Niente.",
    giallo: "Un fastidio. Un dolore che non cambia la pedalata conta il doppio.",
    rosso: "Un infortunio, o un dolore che cambia la pedalata. Senza risposta un dolore vale come rosso.",
  },
  {
    voce: "Sto male",
    verde: "Niente segnato.",
    giallo: "Solo naso che cola o gola appena irritata. Il semaforo non va oltre il giallo.",
    rosso: "Febbre, brividi, dolori in tutto il corpo, tosse con il petto chiuso, mal di pancia. Ogni sintomo di cuore, con l'invito dal medico, e il rosso resta finché il medico non ti dice che puoi riprendere.",
  },
];

// I quattro livelli, per la Guida.
export const GUIDA_LIVELLI = [
  { livello: "verde", titolo: "Verde, via libera.", testo: "Nessun segnale di stanchezza." },
  { livello: "giallo-leggero", titolo: "Giallo, senza esagerare.", testo: "Un segnale piccolo." },
  { livello: "giallo", titolo: "Giallo, giornata tranquilla.", testo: "Due segnali piccoli o uno che conta il doppio. Nei giorni dopo un weekend lungo, una prova, un'uscita grande o un viaggio, e quando riparti dopo la febbre, il semaforo non va oltre il giallo." },
  { livello: "rosso", titolo: "Rosso, oggi recupera.", testo: "Più segnali che vanno d'accordo, da più notti o con le tue risposte, o il carico molto più alto del solito per tre mattine di fila. E sempre con un dolore, un infortunio, la febbre, un sintomo di cuore o quando dici di essere a pezzi. Una notte storta da sola non dà mai rosso." },
];

export const DISPOSITIVI = [
  {
    id: "garmin", nome: "Garmin",
    passi: "Nelle impostazioni di intervals.icu trova la sezione Garmin, premi Connect ed entra con il tuo account Garmin. Lascia accese sia le attività sia il benessere (wellness), così arrivano anche sonno, HRV e battito a riposo.",
  },
  {
    id: "wahoo", nome: "Wahoo",
    passi: "Nelle impostazioni di intervals.icu trova Wahoo e premi Connect. Dopo ogni giro il ciclocomputer manda l'uscita da solo. Per sonno e HRV serve in più un orologio o un anello, collegato a parte.",
  },
  {
    id: "altri", nome: "Polar, Suunto, Coros",
    passi: "Nelle impostazioni di intervals.icu trova il tuo marchio e premi Connect. Se c'è l'opzione per il benessere (wellness), attivala per avere anche le notti.",
  },
  {
    id: "anelli", nome: "Oura, Whoop",
    passi: "Collegali nelle impostazioni di intervals.icu per sonno, HRV e battito a riposo. Vanno benissimo insieme al ciclocomputer, che porta i giri.",
  },
  {
    id: "apple", nome: "Apple Watch",
    passi: "intervals.icu non legge direttamente Apple Salute. Di solito si usa un'app ponte sull'iPhone, per esempio HealthFit, che manda a intervals.icu giri e dati della notte. Apple misura l'HRV in un altro modo, ma il confronto con il tuo normale funziona lo stesso.",
  },
  {
    id: "strava", nome: "Solo Strava",
    passi: "Funziona, ma a metà. Per le regole di Strava, intervals.icu riceve i tuoi giri ma non può passarne i dettagli ad altre app. Fitness e Fatica si vedono, l'elenco delle uscite resta senza nomi. Se puoi, collega direttamente il dispositivo.",
  },
];

export const DOMANDE_FREQUENTI = [
  {
    d: "Perché passa da intervals.icu?",
    r: "Perché si collega già da solo a quasi tutti gli orologi e i ciclocomputer, è gratuito e calcola Fitness e Fatica in modo serio. Come sto legge quei numeri e te li spiega.",
  },
  {
    d: "Quanto costa?",
    r: "Niente. Come sto è gratis e senza pubblicità. Il piano gratuito di intervals.icu basta e avanza.",
  },
  {
    d: "Chi vede i miei dati?",
    r: "Solo tu. La pagina li legge direttamente da intervals.icu, sul tuo telefono o computer. Non passano da nessun server nostro e nessuno, nemmeno chi ha fatto l'app, li può vedere.",
  },
  {
    d: "E se non ho un orologio?",
    r: "Funziona lo stesso, con meno numeri. Fitness e Fatica arrivano dai giri registrati, e le tre domande del mattino fanno il resto.",
  },
  {
    d: "Il semaforo è rosso ma io sto bene. Esco?",
    r: "Il rosso arriva da un sintomo, da un dolore, da più segnali che vanno d'accordo o dal carico molto più alto del solito per tre mattine di fila, mai da una notte storta da sola. Se il rosso viene da questi numeri e proprio vuoi uscire, al massimo 45 minuti pianissimo. Con un dolore, un infortunio, «Sono a pezzi», la febbre o un sintomo di cuore niente bici.",
  },
  {
    d: "Posso confrontare i miei numeri con quelli di un amico?",
    r: "No. Ogni orologio misura l'HRV in un momento diverso della notte, e ognuno ha il suo normale. I numeri si confrontano solo con te stesso, e sempre con lo stesso dispositivo.",
  },
  {
    d: "Perché le mie risposte del mattino finiscono su intervals.icu?",
    r: "Perché così restano tue, insieme agli altri dati, e le ritrovi anche nell'app di intervals.icu. Come sto non ci manda niente. Le tue risposte restano su questo dispositivo e nel tuo intervals.icu.",
  },
  {
    d: "Dove finiscono le risposte di «Sto male» e di «Ieri sera…»?",
    r: "Restano su questo dispositivo, al massimo 400 giorni, poi si cancellano da sole. Non vanno su intervals.icu e noi non le riceviamo. Le togli quando vuoi con «Esci e cancella tutto da questo dispositivo», in Impostazioni.",
  },
  {
    d: "Come esco, o tolgo l'accesso?",
    r: "Premi Esci in fondo alla pagina e la chiave sparisce da questo dispositivo, insieme al consenso. Con «Esci e cancella tutto da questo dispositivo» togli anche le tue risposte. Per togliere l'accesso ovunque, su intervals.icu crea una chiave nuova. Quella vecchia smette subito di funzionare.",
  },
];

// Con «Entra con intervals.icu» acceso prende il posto della domanda qui sopra con lo stesso titolo.
export const DOMANDA_ESCI_CON_INTERVALS = {
  d: "Come esco, o tolgo l'accesso?",
  r: "Premi Esci in fondo alla pagina. Se sei entrato con il pulsante «Entra con intervals.icu», Esci toglie a Come sto anche il permesso su intervals.icu, e così esci dagli altri telefoni e computer dove sei entrato con il pulsante. Se hai incollato la chiave, Esci la cancella da questo dispositivo. Con «Esci e cancella tutto da questo dispositivo» togli anche le tue risposte. Per togliere l'accesso ovunque, su intervals.icu crea una chiave nuova. Quella vecchia smette subito di funzionare.",
};

export const LIMITI = [
  "Con la febbre, o con tosse e dolori in tutto il corpo, non allenarti, qualunque colore abbia il semaforo.",
  "Se in bici senti dolore al petto, il cuore che batte strano, un fiato corto mai provato o ti gira la testa, fermati e chiama un medico.",
  "Il semaforo non ti dice di partire per un viaggio se stai male, qualunque colore abbia.",
  "Alcune medicine, per esempio i betabloccanti, cambiano battito e HRV. Se le prendi, chiedi al medico come regolarti.",
  "Alcol, caldo, una cena tardi, un viaggio, la quota e, per le donne, la seconda metà del ciclo alzano il battito e abbassano l'HRV anche senza stanchezza.",
  "Ogni orologio misura l'HRV in un momento diverso della notte. Usa un solo dispositivo per la notte. Se lo cambi, segnalo in Impostazioni con «Ho cambiato orologio». Servono un paio di settimane perché l'app impari il tuo nuovo normale.",
  "Il battito misurato al polso durante il giro è spesso sbagliato. Per i giri usa una fascia cardio o il ciclocomputer.",
  "Una sola notte storta non è un problema. Conta la tendenza di tre o quattro giorni.",
  "Il semaforo non sa se ti fa male un ginocchio. Diglielo con le domande del mattino.",
  "Come sto non è un medico e non fa diagnosi. Se il battito a riposo resta alto per giorni o qualcosa non ti convince, parlane con un medico.",
];

// La pagina Collega, l'attacco in alto (7.3). Il normale si impara in quattro settimane (4.1 e 4.3).
export const COLLEGA = {
  attacco: "Ci vogliono cinque minuti. Il semaforo parte dalla prima notte e dal primo giro registrati, e impara il tuo normale in quattro settimane.",
};

// Un punto può essere un testo, oppure { chiave, intervals } con la riga per chi incolla la chiave e
// quella per quando c'è «Entra con intervals.icu».
export const PRIVACY = {
  titolo: "Privacy",
  sottotitolo: "I tuoi dati restano tuoi",
  sezioni: [
    {
      titolo: "In breve",
      punti: [
        "Come sto ti dà ogni mattina un semaforo, per capire se oggi puoi spingere o se è meglio andare piano.",
        "La pagina legge i tuoi dati da intervals.icu direttamente sul tuo telefono o computer. Le tue risposte restano lì e nel tuo account intervals.icu. Noi non riceviamo niente.",
        "Niente pubblicità, niente vendita di dati e niente intelligenza artificiale sui tuoi dati.",
        "Come sto non è un dispositivo medico e non fa diagnosi.",
      ],
    },
    {
      titolo: "Cosa succede quando entri",
      punti: [
        {
          chiave: "Incolli nella pagina la chiave del tuo account intervals.icu.",
          intervals: "Premi «Entra con intervals.icu» e dai il permesso a Come sto, oppure incolli la chiave del tuo account intervals.icu.",
        },
        "Prima di entrare confermi di avere almeno 18 anni e dai il consenso per i dati sulla salute, con due caselle. A ogni nuovo ingresso le caselle sono vuote. Che hai almeno 18 anni lo dichiari tu, e noi non possiamo controllarlo.",
        "Il tuo browser chiede a intervals.icu i dati che servono e li mette insieme sul tuo dispositivo per calcolare semaforo, andamento, uscite e obiettivo.",
        "Le risposte alle tre domande del mattino il tuo browser le scrive nel tuo account intervals.icu, nel giorno di oggi. In viaggio fa lo stesso con la risposta sull'energia.",
        "Le altre risposte che dai nella pagina, per esempio quelle del pannello «Sto male», restano sul tuo dispositivo.",
        "Niente passa da un server nostro. Non vediamo e non conserviamo i dati dell'app.",
      ],
    },
    {
      titolo: "Quali dati usa la pagina",
      punti: [
        "La notte. HRV, cioè la variabilità del battito mentre dormi, battito a riposo, ore e punteggio del sonno. Anche il battito medio mentre dormi, se il tuo dispositivo lo manda.",
        "Gli allenamenti. Di ogni uscita la pagina usa data, tipo, nome, durata, distanza, dislivello, battito medio e carico, cioè i punti di lavoro dell'uscita, se la potenza arriva da un misuratore e lo sforzo che hai segnato su intervals.icu. Usa anche Fitness e Fatica, la media del tuo lavoro nelle ultime sei settimane e nell'ultima settimana, calcolate da intervals.icu. Il nome dell'uscita lo mostra così come l'hai scritto tu o il tuo dispositivo.",
        "Le tue risposte del mattino. Energia, gambe e acciacchi, su una scala da 1 a 4.",
        "Le altre tue risposte. Il pannello «Sto male», con i sintomi di cuore, di malattia e del raffreddore e la risposta sul medico, le caselle di «Ieri sera…», per esempio l'alcol o una notte in alta quota, e le domande in viaggio.",
        "Quello che ci dici di te, in Impostazioni. La fascia d'età, il dispositivo che porti di notte, se hai un'aritmia nota, se in bici usi la fascia cardio e, solo se la accendi, la casella dei giorni prima del ciclo. Puoi lasciarle vuote, e l'app funziona lo stesso.",
        "Il tuo profilo intervals.icu. Arriva intero nella memoria della pagina, perché intervals.icu non permette di chiederne solo una parte. La pagina ne usa solo il nome, per salutarti, e il fuso orario, per sapere qual è il tuo «oggi». Il resto, come email, data di nascita, sesso o peso, non lo usa e non lo salva da nessuna parte. Non chiede mai la fase del ciclo.",
        "La chiave di intervals.icu, che apre il tuo account come una password, oppure l'accesso che ti dà intervals.icu se entri con il pulsante.",
        "Le tue scelte nella pagina, cioè la prossima avventura, la sua data e il periodo dei grafici.",
      ],
      dopo: "Battito, HRV, sonno, acciacchi e il semaforo stesso sono dati sulla salute, che la legge protegge di più. Lo sono anche i sintomi di «Sto male», le domande in viaggio, l'aritmia e la casella del ciclo.",
    },
    {
      titolo: "Perché e con quale permesso",
      punti: [
        "La pagina usa questi dati sul tuo dispositivo, solo per darti quello che chiedi entrando, cioè semaforo, grafici e preparazione al tuo obiettivo.",
        "Per i dati sulla salute ti chiediamo un consenso esplicito, con una casella da spuntare prima di entrare.",
        "Il consenso copre anche le risposte che tieni sul dispositivo, compresi i sintomi di «Sto male», e le risposte del mattino che l'app scrive nel tuo account intervals.icu. Se il testo cambia in modo importante te lo chiediamo di nuovo, una volta.",
        "Se non ci dai il consenso, la pagina non legge i tuoi dati. Puoi sempre guardare l'esempio con i dati inventati.",
      ],
    },
    {
      titolo: "Dove restano e per quanto",
      punti: [
        "La chiave, o l'accesso dato da intervals.icu, resta solo sul tuo dispositivo. Con «Ricordami» resta finché premi Esci. Senza, sparisce quando chiudi la scheda.",
        "I numeri che arrivano da intervals.icu, cioè notti, risposte del mattino e uscite senza il loro nome, restano su questo dispositivo in una copia, così a ogni apertura la pagina chiede solo i giorni nuovi. La copia tiene al massimo 182 giorni e si cancella con Esci.",
        "La tua scelta sul consenso resta finché sei dentro e si cancella con Esci.",
        "Le tue risposte restano sul tuo dispositivo per 400 giorni, poi si cancellano da sole. Sono i sintomi di «Sto male», le caselle di «Ieri sera…», il sonno e «Qualcosa non va?» in viaggio.",
        "Per ogni giorno restano sul dispositivo per 400 giorni anche il colore del semaforo, quanto ha pesato ogni voce e se c'è stato uno stop, per esempio per un sintomo di cuore.",
        "Quello che ci dici di te e le tue scelte restano nel browser finché non le cancelli con «Esci e cancella tutto da questo dispositivo» o dalle impostazioni del browser.",
        "Quello che sta su intervals.icu, comprese le risposte del mattino, resta nel tuo account e segue l'informativa di intervals.icu.",
      ],
      dopo: "Per ricordare chiave, risposte e scelte la pagina usa una piccola memoria del browser. Serve solo a farti usare l'app. Niente cookie e niente statistiche sulle visite. Se apri la pagina in navigazione privata, o su iPhone da Safari e non dall'icona nella schermata Home, il browser può cancellare questa memoria da solo.",
    },
    {
      titolo: "Cosa scrive l'app nel tuo intervals.icu",
      punti: [
        "Le tre risposte del mattino, nel giorno di oggi, e in viaggio la risposta sull'energia.",
        "Non scrive mai i sintomi di «Sto male», le caselle di «Ieri sera…», il sonno e «Qualcosa non va?» in viaggio, la casella del ciclo o l'aritmia. Non cancella mai un'attività.",
        "Quello che l'app scrive lo vedi tu, e lo vede chi può vedere il tuo account intervals.icu, per esempio un allenatore con cui lo condividi o un'altra app che hai collegato.",
        "Lo puoi cambiare o cancellare da intervals.icu quando vuoi.",
      ],
    },
    {
      titolo: "Chi altro c'entra",
      punti: [
        "intervals.icu custodisce i tuoi dati nel tuo account, con la sua informativa sulla privacy.",
        "GitHub pubblica la pagina, e come per ogni sito tiene i registri tecnici delle visite.",
        "Nessun altro. La pagina non carica niente da altri siti e parla solo con intervals.icu.",
      ],
    },
    {
      titolo: "Come togli l'accesso, con Esci ed «Esci e cancella tutto»",
      punti: [
        "Premi Esci e la chiave, o l'accesso, sparisce da questo dispositivo insieme alla tua scelta sul consenso, alla copia dei dati presi da intervals.icu e alle scritture ancora da mandare.",
        "Con Esci le tue risposte e quello che ci hai detto di te, compresi i sintomi di «Sto male», restano sul dispositivo, così le ritrovi quando rientri. La pagina non le usa finché non rientri e non dai di nuovo il consenso.",
        "Premi «Esci e cancella tutto da questo dispositivo» e cancelli tutto quello che Come sto tiene sul dispositivo, cioè anche risposte, sintomi, profilo e scelte. Se il dispositivo lo usano anche altri, scegli questo. Lo trovi anche in Impostazioni.",
        "Con tutti e due resta quello che l'app ha scritto nel tuo account intervals.icu, che cancelli da lì.",
        {
          chiave: "Per togliere l'accesso ovunque, su intervals.icu crea una chiave nuova. Quella vecchia smette subito di funzionare.",
          intervals: "Se sei entrato con «Entra con intervals.icu», Esci toglie a Come sto anche il permesso su intervals.icu, e lo puoi togliere anche dalle impostazioni di intervals.icu. Se hai incollato la chiave, per togliere l'accesso ovunque creane una nuova su intervals.icu, e la vecchia smette subito di funzionare.",
        },
        "Così ritiri anche il consenso, quando vuoi. Il ritiro vale da quel momento in poi.",
      ],
    },
    {
      titolo: "Età",
      punti: [
        "Come sto è per persone maggiorenni. Per usarla devi avere almeno 18 anni, e se ne hai meno non usarla con i tuoi dati.",
        "Prima di entrare ti chiediamo di confermare con una casella che hai almeno 18 anni. È una tua dichiarazione, e non la possiamo controllare. La fascia d'età che scegli in Impostazioni serve al semaforo, non a controllare l'età.",
        "Se hai meno di 18 anni, usa «Esci e cancella tutto da questo dispositivo».",
      ],
    },
    {
      titolo: "Non è un dispositivo medico",
      punti: [
        "Come sto dà consigli di allenamento basati su numeri, non fa diagnosi. Se hai febbre, dolori, o il battito a riposo resta alto per giorni, parlane con un medico.",
      ],
    },
    {
      titolo: "Se cambia qualcosa",
      punti: [
        "Se cambiamo queste regole in modo importante te lo diciamo nell'app prima che valgano e, quando serve, ti chiediamo di nuovo il consenso.",
      ],
    },
  ],
  impostazioni: "Apri le Impostazioni",
  guida: "Torna alla guida",
};

// Le colonne della tabella GUIDA_SEMAFORO, uguali nella Guida e nel README.
export const GUIDA_COLONNE = { voce: "Voce", verde: "Va bene", giallo: "Pesa", rosso: "Porta al rosso" };

export const GUIDA = {
  titolo: "Guida",
  sottotitolo: "Come si legge Come sto",
  attacco: "Tutto quello che c'è dietro il semaforo e i numeri, spiegato semplice.",
  semaforo: {
    titolo: "Il semaforo a punti",
    paragrafi: [
      "Ogni mattina il semaforo guarda la notte, il carico degli ultimi giorni e le tue tre risposte. Ogni voce può pesare poco o tanto. Quando una voce pesa tanto, prima di decidere ti fa una domanda.",
      "Il colore toglie e non aggiunge. Il verde non allunga mai il giro di oggi.",
      "Una notte storta da sola non dà mai rosso. Il carico da solo arriva al massimo al giallo, salvo tre mattine di fila molto sopra il solito. Febbre, cuore e dolore fermano sempre.",
      "Nelle prime settimane, finché impara il tuo normale, il semaforo può dire «Ancora pochi dati».",
    ],
    livelli: "I quattro livelli",
    voci: "Le voci, una per una",
    vociAttacco: "Per ogni voce, quando va bene, quando pesa e quando porta al rosso.",
  },
  sezioni: [
    {
      titolo: "Quando si ferma tutto",
      paragrafi: [
        "Alcune cose fermano la giornata, qualunque cosa dicano i numeri. Un sintomo di cuore, la febbre o un altro sintomo di malattia, il battito a riposo molto alto con un sintomo, «Sono a pezzi», un infortunio, o un dolore che cambia la pedalata.",
        "Il tasto «Sto male» sotto la carta di oggi apre le caselle di cuore, malattia e naso e gola. Con un sintomo di cuore l'app ti dice di fermarti e di sentire il medico oggi stesso. Nei giorni dopo il semaforo resta rosso, finché non segni «Il medico mi ha detto che posso riprendere».",
        "Con naso che cola o gola appena irritata il semaforo non va oltre il giallo, e se esci al massimo un'ora facile.",
        "Dopo la febbre, quando segni «Non ho più febbre da 24 ore, senza farmaci per la febbre», parte il rientro. Per 4 giorni il semaforo non va oltre il giallo, per 7 se la malattia è durata più di una settimana.",
        "Dopo una malattia di più di una settimana, o con la febbre e il petto chiuso, prima di riprendere serve il medico. Il semaforo consiglia riposo finché non segni «Il medico mi ha detto che posso riprendere», e da lì contano i giorni del rientro. Se per due settimane non mi dici niente, conto la malattia come lunga.",
      ],
    },
    {
      titolo: "Ieri sera…",
      paragrafi: [
        "Alcol, un viaggio lungo, una cena tardi e pesante, una notte calda o sopra i 1.500 m cambiano la notte anche senza stanchezza. Se spunti una di queste caselle, la notte pesa meno e non entra nel tuo normale.",
        "La casella dei giorni prima del ciclo compare solo se la accendi in Impostazioni.",
      ],
    },
    {
      titolo: "Dopo le fatiche volute",
      paragrafi: [
        "Dopo un weekend lungo, una prova con le borse o un'uscita grande il corpo è stanco per forza, e il semaforo lo sa. Per 2 giorni non va oltre il giallo, e per 3 mattine le notti storte non contano.",
        "Un'uscita grande dura almeno 5 ore, oppure almeno 3 ore e una volta e mezza la più lunga delle 4 settimane prima.",
        "Dopo un viaggio di 2-5 giorni per una settimana il semaforo non va oltre il giallo, per 10 giorni dopo un viaggio di 6-10 giorni, per 2 settimane dopo un viaggio più lungo. Contano i giorni dal primo all'ultimo, anche quelli in cui non hai aperto l'app.",
        "Il rosso resta sempre possibile, con un sintomo o con segnali che vanno d'accordo.",
      ],
    },
    {
      titolo: "In viaggio",
      paragrafi: [
        "Con il tasto «Sono in viaggio» il semaforo cambia. In viaggio battito, variabilità del battito e carico cambiano da soli, quindi li vedi ma non contano.",
        "Contano come stai tu. L'energia, il sonno vero e quello che non va, cioè mani, sedere, collo, ginocchia, stomaco e gonfiore. Con l'orologio il sonno vero è circa 45 minuti meno di quello che mostra.",
        "Se per 2 giorni di fila vedo tante ore in bici, ti chiedo io se sei in viaggio. Quando torni premi «Sono arrivato», e nei giorni dopo il semaforo ti fa recuperare.",
        "Ogni mattina in viaggio, sotto la carta, tre promemoria. Mangia ogni ora, anche senza fame. Bevi a sete, non a forza. Niente antinfiammatori in sella.",
      ],
    },
    {
      titolo: "Il tuo normale",
      paragrafi: [
        "Il semaforo confronta ogni notte con il tuo normale, che calcola dalle tue ultime notti. Per la variabilità del battito servono almeno 2 settimane di notti, e il conto è pieno da 4 settimane. Per il battito a riposo basta una settimana, ed è pieno da 2.",
        "Una notte vale se hai dormito almeno 4 ore. Con meno, la variabilità del battito non si legge.",
        "Il carico recente si guarda com'era ieri sera, prima di uscire, così un giro fatto stamattina non cambia il consiglio di stamattina.",
        "Se cambi orologio o anello, segnalo in Impostazioni. Per due settimane imparo di nuovo le tue notti.",
      ],
    },
    {
      titolo: "Quanto fidarti",
      paragrafi: [
        "Sotto «Perché» il semaforo dice anche quanto si fida dei suoi numeri. Si fida meno con il battito al polso in bici, con tanti giri senza dati, con meno di sei settimane di giri o mentre impara le tue notti.",
        "Quando si fida poco lo scrive accanto al colore. Le tue risposte contano sempre per intero.",
      ],
    },
  ],
  numeri: "I numeri, uno per uno",
  limiti: "Quando non fidarti dei numeri",
  domande: "Domande frequenti",
  privacy: "Come trattiamo i tuoi dati",
  leggi: "Come leggerlo.",
  legato: "A cosa è legato.",
};
