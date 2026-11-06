// I testi delle pagine Guida, Privacy e Collega, della pagina di benvenuto e delle schermate di attesa
// e di errore (7.11). Li usa js/viste/pagine.js. Stesse regole di scrittura di js/testi.js (7.1), e
// la prova 9.8 li legge tutti. Nella Guida (le costanti con GUIDA nel nome) possono stare anche
// «specchio», «tapering» e kJ.

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
    passi: "Funziona, ma a metà. Per le regole di Strava, intervals.icu riceve i tuoi giri ma non può passarne i dettagli ad altre app. Fitness e Fatica si vedono, l'elenco delle uscite resta senza nomi e ogni tanto ti chiedo quanto è durato un giro. Se puoi, collega direttamente il dispositivo.",
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
    r: "I tuoi numeri e le tue risposte li vedi solo tu. La pagina li legge direttamente da intervals.icu, sul tuo telefono o computer, e non passano da nessun server nostro. Se entri con la tua email, nel nostro database stanno solo l'email, l'avventura, i giorni per la bici e poche impostazioni su bici, borse e palestra, e questi li può vedere anche chi amministra l'app.",
  },
  {
    d: "A cosa serve entrare con l'email?",
    r: "A non ripartire da capo. Se cambi telefono o il browser cancella la sua memoria, rientri con un codice via email e ritrovi avventura, giorni e bici. I numeri e le risposte del mattino tornano da intervals.icu, e il piano si rifà da solo. Età, peso, aritmia, ciclo, sintomi, sforzo e palestra restano solo sul telefono dove li hai scritti, per quelli c'è la copia di sicurezza.",
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
    d: "Le ore in sella sono una promessa?",
    r: "No, sono una stima prudente, con una forbice. Contano anche testa, meteo e quanto dormi in viaggio, che nessun numero vede. Dopo la prima uscita lunga con le borse la stima diventa più tua.",
  },
  {
    d: "Perché mi chiede «Avevi le borse?»",
    r: "Perché la bici carica cambia tutto, le ore in sella e le prove. Conta come prova solo un giro con il peso e le borse del viaggio, e solo tu sai se le avevi. Se non te lo ricordi, «Non lo so» chiude la domanda.",
  },
  {
    d: "Ho saltato una seduta del piano. La recupero?",
    r: "No. Le sedute si spostano, non si recuperano mai raddoppiando. Le ore che non ci stanno si lasciano, e il piano va avanti.",
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
    d: "Cosa succede se cambio telefono?",
    r: "Le risposte del mattino stanno su intervals.icu e le ritrovi. Il resto sta sul telefono, quindi prima salva una copia in Impostazioni, poi riprendila sul telefono nuovo.",
  },
  {
    d: "Come esco, o tolgo l'accesso?",
    r: "Premi Esci in fondo alla pagina e la chiave sparisce da questo dispositivo, insieme al consenso e alla copia dei dati presi da intervals.icu. Con «Esci e cancella tutto da questo dispositivo» togli anche le tue risposte. Per togliere l'accesso ovunque, su intervals.icu crea una chiave nuova. Quella vecchia smette subito di funzionare.",
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
  "Le ore stimate sono stime. Contano anche testa, meteo e quanto dormi in viaggio, che nessun numero vede.",
  "Alcune medicine, per esempio i betabloccanti, cambiano battito e HRV. Se le prendi, chiedi al medico come regolarti.",
  "Alcol, caldo, una cena tardi, un viaggio, la quota e, per le donne, la seconda metà del ciclo alzano il battito e abbassano l'HRV anche senza stanchezza.",
  "Ogni orologio misura l'HRV in un momento diverso della notte. Usa un solo dispositivo per la notte. Se lo cambi, segnalo in Impostazioni con «Ho cambiato orologio». Servono un paio di settimane perché l'app impari il tuo nuovo normale.",
  "Il battito misurato al polso durante il giro è spesso sbagliato. Per i giri usa una fascia cardio o il ciclocomputer.",
  "Una sola notte storta non è un problema. Conta la tendenza di tre o quattro giorni.",
  "Il semaforo non sa se ti fa male un ginocchio. Diglielo con le domande del mattino.",
  "Come sto non è un medico e non fa diagnosi. Se il battito a riposo resta alto per giorni o qualcosa non ti convince, parlane con un medico.",
];

// La pagina Collega (7.3). Il normale si impara in quattro settimane (4.1 e 4.3).
export const COLLEGA = {
  occhiello: "Collega i tuoi dati",
  titolo: "Tre passi, una volta sola",
  attacco: "Ci vogliono cinque minuti. Il semaforo parte dalla prima notte e dal primo giro registrati, e impara il tuo normale in quattro settimane.",
  errore: " Copiala di nuovo e incollala qui sotto, al punto 3.",
  vaiAlPunto: "Vai al punto 3",
  uno: {
    titolo: "1. Crea un account gratuito su intervals.icu",
    testo: "intervals.icu è il servizio che raccoglie i dati dal tuo orologio e calcola Fitness e Fatica. Il piano gratuito basta.",
    apri: "Apri intervals.icu",
    dopo: " e crea l'account. Se ce l'hai già, passa al punto 2.",
  },
  due: {
    titolo: "2. Collega il tuo orologio o ciclocomputer",
    testo: "Si fa su intervals.icu, non qui. Scegli cosa usi.",
    gruppo: "Il tuo dispositivo",
    impostazioni: "Apri le impostazioni di intervals.icu",
    piccolo: "Se hai un ciclocomputer e un orologio, collegali tutti e due. Al primo collegamento intervals.icu scarica anche un po' di storico, così i numeri sono pronti prima.",
  },
  chiave: {
    titolo: "3. Copia la chiave e incollala qui",
    passi: [
      ["Apri le ", { link: "impostazioni di intervals.icu" }, "."],
      ["Scorri fino in fondo alla pagina, alla sezione ", { forte: "Developer Settings" }, "."],
      ["Accanto ad ", { forte: "API Key" }, " premi il pulsante per vederla o crearla, poi copiala."],
      ["Torna qui e incollala nel riquadro."],
    ],
    attenzione: "È una fila lunga di lettere e numeri. Non confonderla con l'Athlete ID, quello corto che comincia con la i.",
    etichetta: "La tua chiave di intervals.icu",
    segnaposto: "Incolla qui la chiave",
    aiuto: "La chiave apre il tuo account intervals.icu, come una password. Come sto la usa solo per leggere i tuoi dati e scrivere le risposte del mattino, e la tiene solo su questo telefono o computer.",
    mostra: "Mostra la chiave",
    ricorda: "Ricordami su questo dispositivo",
    entra: "Entra",
    prima: "Incolla prima la chiave.",
    controllo: "Controllo la chiave…",
  },
  intervals: {
    titolo: "3. Entra con intervals.icu",
    testo: "Premi il pulsante. Si apre intervals.icu, entri con il tuo account e dai il permesso a Come sto. Poi intervals.icu ti riporta qui da solo.",
    piccolo: "Come sto chiede di leggere allenamenti, notti e profilo, e di scrivere le risposte del mattino. Lascia accese tutte le voci. La password la scrivi solo su intervals.icu, Come sto non la vede mai.",
    ricorda: "Ricordami su questo dispositivo",
    entra: "Entra con intervals.icu",
    partenza: "Ti porto su intervals.icu…",
    oppure: "Oppure entra con la chiave API di intervals.icu",
  },
  home: {
    titolo: "Per ritrovarla ogni mattina",
    testo: "Mettila nella schermata Home del telefono, così si apre come un'app.",
    iphone: "iPhone. ",
    iphoneChiave: "In Safari tocca Condividi e poi Aggiungi alla schermata Home. Apri l'icona e incolla lì la chiave, perché l'icona non vede quella salvata in Safari.",
    iphoneIntervals: "In Safari tocca Condividi e poi Aggiungi alla schermata Home. Apri l'icona ed entra da lì, perché l'icona non vede l'accesso fatto in Safari.",
    android: "Android. ",
    androidTesto: "Nel menu di Chrome, i tre puntini, tocca Aggiungi a schermata Home.",
  },
  esempio: "Vuoi prima dare un'occhiata? ",
  esempioTasto: "Guarda i dati di esempio",
};

// La pagina di benvenuto, prima di entrare.
export const BENVENUTO = {
  occhiello: "Come sto",
  titolo: "Arriva pronto alla tua prossima avventura",
  attacco: "Ogni mattina ti dice se oggi puoi spingere o se è meglio andare piano, e ti prepara alla tua avventura con la bici carica. Legge i dati del tuo orologio e del ciclocomputer e te li spiega in parole semplici.",
  inizia: "Inizia",
  esempio: "Guarda un esempio",
  nota: "Gratis e senza pubblicità. Serve solo un account gratuito su intervals.icu, e i tuoi dati restano tra te e intervals.icu.",
  account: "Hai già un account? Entra con la tua email",
  punti: [
    { titolo: "Un semaforo ogni mattina", testo: "Verde, giallo o rosso, con il perché in poche righe. Guarda come hai dormito, il cuore a riposo, quanto ti sei allenato e come ti senti." },
    { titolo: "Pronto per la tua avventura?", testo: "Scegli l'evento e in quanti giorni. Ti dico quante ore starai in sella con la bici carica, se ci arrivi pronto e come allenarti ogni settimana, con bici e palestra." },
    { titolo: "I numeri spiegati semplice", testo: "Fitness, Fatica e la variabilità del battito. Ogni numero ha la sua spiegazione e ti dice a cosa è legato, così impari a leggerti da solo." },
  ],
  comeFunziona: "Come funziona",
  passi: [
    { forte: "Il tuo orologio o ciclocomputer ", testo: "manda allenamenti e notti a intervals.icu, un servizio gratuito usato da tantissimi ciclisti." },
    { forte: "Come sto ", chiave: "legge quei dati dal tuo telefono, con una chiave che ti dà intervals.icu.", intervals: "legge quei dati dal tuo telefono, con il permesso che gli dai su intervals.icu." },
    { forte: "Ogni mattina ", testo: "apri la pagina, guardi il semaforo e rispondi a tre domande. Dieci secondi." },
  ],
};

// Le schermate di attesa e di errore.
export const ATTESA = {
  lettura: "Leggo i tuoi dati da intervals.icu…",
};

export const ERRORE = {
  titolo: "Qualcosa non è andato",
  messaggio: "Non sono riuscito a leggere i dati.",
  riprova: "Riprova",
  esciEntra: "Esci ed entra di nuovo",
  chiave: "La tua chiave resta salvata. Se il problema è solo la connessione, basta riprovare tra poco.",
  permesso: "Il tuo accesso resta salvato finché non premi Esci.",
  accesso: "Il tuo accesso resta salvato. Se il problema è solo la connessione, basta riprovare tra poco.",
};

// Un punto può essere un testo, oppure { chiave, intervals } con la riga per chi incolla la chiave e
// quella per quando c'è «Entra con intervals.icu». Dice solo quello che l'app fa davvero oggi. Le
// scritture sulle attività sono spente (js/config.js), e quando si accendono questo testo cambia
// insieme al consenso.
export const PRIVACY = {
  titolo: "Privacy",
  sottotitolo: "I tuoi dati restano tuoi",
  sezioni: [
    {
      titolo: "In breve",
      punti: [
        "Come sto ti dà ogni mattina un semaforo, per capire se oggi puoi spingere o se è meglio andare piano, e ti aiuta ad arrivare pronto alla tua avventura.",
        "La pagina legge i tuoi dati da intervals.icu direttamente sul tuo telefono o computer. Le tue risposte restano lì e nel tuo account intervals.icu. Noi non riceviamo i tuoi numeri e le tue risposte.",
        "Se vuoi, puoi entrare anche con la tua email. Allora salviamo online solo l'email, l'avventura, i giorni per la bici e poche impostazioni, mai i dati sulla salute.",
        "Per ora Come sto è in prova, con poche persone.",
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
        "Il tuo browser chiede a intervals.icu i dati che servono e li mette insieme sul tuo dispositivo per calcolare il semaforo, le ore in sella della tua avventura, se ci arrivi pronto, il piano della settimana e i numeri.",
        "Le risposte alle tre domande del mattino il tuo browser le scrive nel tuo account intervals.icu, nel giorno di oggi. In viaggio fa lo stesso con la risposta sull'energia.",
        "Le altre risposte che dai nella pagina, per esempio «Sto male», lo sforzo e le borse delle uscite o la palestra, restano sul tuo dispositivo.",
        "I tuoi numeri e le tue risposte non passano da un server nostro. Non li vediamo e non li conserviamo.",
      ],
    },
    {
      titolo: "Quali dati usa la pagina",
      punti: [
        "La notte. HRV, cioè la variabilità del battito mentre dormi, battito a riposo, ore e punteggio del sonno. Anche il battito medio mentre dormi, se il tuo dispositivo lo manda.",
        "Gli allenamenti. Di ogni uscita la pagina usa data, tipo, nome, durata, distanza, dislivello, battito medio e carico, cioè i punti di lavoro dell'uscita. Usa anche se la potenza arriva da un misuratore, se c'era il battito, lo sforzo che hai segnato su intervals.icu, se l'uscita era sui rulli o per andare al lavoro, e le etichette. La descrizione la legge solo nelle attività create da Come sto. Usa Fitness e Fatica di intervals.icu, la media del tuo lavoro nelle ultime sei settimane e nell'ultima settimana, e ne calcola una sua. Il nome dell'uscita lo mostra così come l'hai scritto tu o il tuo dispositivo.",
        "Le tue risposte del mattino. Energia, gambe e acciacchi, su una scala da 1 a 4.",
        "Le altre tue risposte. Il pannello «Sto male», con i sintomi di cuore, di malattia e del raffreddore e la risposta sul medico, le caselle di «Ieri sera…», per esempio l'alcol o una notte in alta quota, e le domande in viaggio. Poi lo sforzo delle uscite, le borse, i chili e se hai dormito fuori, com'è andata una prova con le borse, lo stomaco nelle uscite lunghe, la domanda della domenica su fame, voglia e peso, le sedute di palestra con pesi e riserve e i giri che aggiungi a mano.",
        "Quello che ci dici di te. La fascia d'età, il dispositivo che porti di notte, se hai un'aritmia nota, se in bici usi la fascia cardio e, solo se la accendi, la casella dei giorni prima del ciclo. Poi la tua avventura, i giorni e il tempo per la bici, la bici e le borse, se vuoi la fascia di peso, i viaggi che hai già fatto, la palestra e la risposta sulla sicurezza in palestra. Le caselle facoltative, come quella del ciclo o la fascia di peso, puoi lasciarle vuote, e l'app funziona lo stesso.",
        "Il tuo profilo intervals.icu. Arriva intero nella memoria della pagina, perché intervals.icu non permette di chiederne solo una parte. La pagina ne usa solo il nome, per salutarti, il fuso orario, per sapere qual è il tuo «oggi», e le soglie dei profili sportivi, cioè la soglia di potenza, il battito di soglia e il battito massimo. Il resto, come email, data di nascita, sesso o peso, non lo usa e non lo salva da nessuna parte. Non chiede mai la fase del ciclo.",
        "La chiave di intervals.icu, che apre il tuo account come una password, oppure l'accesso che ti dà intervals.icu se entri con il pulsante.",
        "Le tue scelte nella pagina, cioè l'avventura con i suoi giorni e la data, il piano della settimana, il periodo dei grafici e i messaggi che hai già visto.",
        "Il link della tua iscrizione. Se apri Come sto dal link che arriva con l'iscrizione a un evento, l'indirizzo porta solo percorso, giorni e data, niente di te. Nei link nuovi stanno dopo il segno #, che il browser non manda a nessun server. La pagina li salva sul tuo dispositivo e li toglie dall'indirizzo.",
        "La schermata «Prima di cominciare». Se hai almeno 40 anni, alla fine della prima scelta ti ricordiamo quando sentire il medico per il cuore. Teniamo solo la data in cui l'hai vista, nessuna risposta.",
      ],
      dopo: "Battito, HRV, sonno, acciacchi e il semaforo stesso sono dati sulla salute, che la legge protegge di più. Lo sono anche i sintomi di «Sto male», le domande in viaggio, l'aritmia, la casella del ciclo e lo sforzo, e per prudenza trattiamo così anche la fascia di peso, la risposta sulla sicurezza in palestra e le sedute di palestra.",
    },
    {
      titolo: "Perché e con quale permesso",
      punti: [
        "La pagina usa questi dati sul tuo dispositivo, solo per darti quello che chiedi entrando, cioè semaforo, numeri e preparazione alla tua avventura.",
        "Per i dati sulla salute ti chiediamo un consenso esplicito, con una casella da spuntare prima di entrare.",
        "Il consenso copre anche le risposte che tieni sul dispositivo, compresi i sintomi di «Sto male», e le risposte del mattino che l'app scrive nel tuo account intervals.icu. Se il testo cambia in modo importante, per esempio quando l'app comincerà a scrivere anche sforzo, borse e palestra, te lo chiediamo di nuovo, una volta. Finché non rispondi, l'app non fa le cose nuove.",
        "Se non ci dai il consenso, la pagina non legge i tuoi dati. Puoi sempre guardare l'esempio con i dati inventati.",
      ],
    },
    {
      titolo: "Dove restano e per quanto",
      punti: [
        "La chiave, o l'accesso dato da intervals.icu, resta solo sul tuo dispositivo. Con «Ricordami» resta finché premi Esci. Senza, sparisce quando chiudi la scheda.",
        "I numeri che arrivano da intervals.icu, cioè notti, risposte del mattino, uscite senza il loro nome e il profilo ridotto a nome, fuso orario e soglie, restano su questo dispositivo in una copia, così a ogni apertura la pagina chiede solo i giorni nuovi. La copia tiene al massimo 182 giorni e si cancella con Esci.",
        "La tua scelta sul consenso resta finché sei dentro e si cancella con Esci.",
        "Le tue risposte restano sul tuo dispositivo per 400 giorni, poi si cancellano da sole. Sono i sintomi di «Sto male», le caselle di «Ieri sera…», il sonno e «Qualcosa non va?» in viaggio, le risposte sulle uscite, le sedute di palestra e i controlli della domenica.",
        "Per ogni giorno restano sul dispositivo per 400 giorni anche il colore del semaforo, quanto ha pesato ogni voce e se c'è stato uno stop, per esempio per un sintomo di cuore.",
        "Quello che ci dici di te e le tue scelte restano nel browser finché non le cancelli con «Esci e cancella tutto da questo dispositivo» o dalle impostazioni del browser. L'avventura e il piano si cancellano da soli 3 mesi dopo l'evento.",
        "Per sapere di chi sono i dati del telefono, la pagina tiene un'impronta del numero del tuo account intervals.icu, al posto del numero scritto in chiaro. Resta anche dopo Esci, così se sullo stesso telefono entra un'altra persona i tuoi dati non si mostrano e non si usano. Si cancella con «Esci e cancella tutto da questo dispositivo».",
        "Quello che sta su intervals.icu, comprese le risposte del mattino, resta nel tuo account e segue l'informativa di intervals.icu.",
      ],
      dopo: "Per ricordare chiave, risposte e scelte la pagina usa una piccola memoria del browser. Serve solo a farti usare l'app. Niente cookie e niente statistiche sulle visite. Se apri la pagina in navigazione privata, o su iPhone da Safari e non dall'icona nella schermata Home, il browser può cancellare questa memoria da solo. Per non perdere le risposte puoi salvarne una copia.",
    },
    {
      titolo: "Se entri con la tua email",
      punti: [
        "È facoltativo. L'app funziona anche senza, con le tue scelte solo sul tuo dispositivo.",
        "Entri con un codice che ti arriva per email, senza password. Il codice vale 10 minuti e una volta sola. L'accesso resta su questo dispositivo finché esci.",
        "Salviamo la tua email, l'avventura con i suoi giorni e la data, i giorni e il tempo per la bici, la bici, le borse, la scelta sulla palestra, gli altri sport e i viaggi che hai già fatto. Servono a farti ritrovare le tue scelte su ogni telefono.",
        "Non salviamo mai battito, HRV, sonno, semaforo, risposte del mattino, sintomi, sforzo, sedute di palestra, età, peso, aritmia, ciclo, la risposta sulla sicurezza in palestra o la chiave di intervals.icu. Il database li rifiuta anche se per errore gli arrivassero.",
        "Il piano non si salva online. Su un telefono nuovo si rifà da avventura, giorni e numeri di intervals.icu.",
        "Li custodisce Supabase, il fornitore del nostro database, a Francoforte in Germania. Ogni persona può leggere e cambiare solo i suoi. Chi amministra l'app può vederli, e il personale di Supabase solo per assistenza o per un incidente di sicurezza, anche da Singapore e dagli Stati Uniti.",
        "Il codice te lo manda Brevo, il nostro fornitore di email, che vede il tuo indirizzo e il messaggio. Questa email non la usiamo per scriverti d'altro.",
        "Restano finché non cancelli l'account. L'avventura si cancella anche online 3 mesi dopo l'evento, alla prima apertura dell'app.",
        "Con «Cancella il mio account», in Impostazioni, togli subito dal database la tua email e i tuoi dati. Con «Esci dall'account» esci solo da questo dispositivo, e i dati online restano.",
        "Su un telefono nuovo serve anche collegare di nuovo intervals.icu, perché la chiave non la salviamo mai online.",
      ],
    },
    {
      titolo: "Cosa scrive l'app nel tuo intervals.icu",
      punti: [
        "Le tre risposte del mattino, nel giorno di oggi, e in viaggio la risposta sull'energia.",
        "Per ora nient'altro. Sforzo, borse, palestra e giri aggiunti a mano restano sul tuo dispositivo e nella copia di sicurezza. Prima che l'app cominci a scriverli te lo diciamo, e ti chiediamo di nuovo il consenso.",
        "Non scrive mai i sintomi di «Sto male», le caselle di «Ieri sera…», il sonno e «Qualcosa non va?» in viaggio, la casella del ciclo, l'aritmia o la domanda della domenica. Non cancella mai un'attività.",
        "Quello che l'app scrive lo vedi tu, e lo vede chi può vedere il tuo account intervals.icu, per esempio un allenatore con cui lo condividi o un'altra app che hai collegato.",
        "Lo puoi cambiare o cancellare da intervals.icu quando vuoi.",
      ],
    },
    {
      titolo: "La copia di sicurezza",
      punti: [
        "Con «Salva una copia», in Impostazioni, scarichi un file con le tue risposte e le tue scelte, compresi i sintomi di «Sto male». Il file si chiama «come-sto-dati» seguito dalla data. Dentro non ci sono la chiave, il consenso, la copia dei dati presi da intervals.icu e l'impronta del tuo account.",
        "Il file lo crea il tuo browser e non passa da noi. Dopo, sta dove lo salvi tu. Se il tuo telefono copia i file in un archivio online, finisce anche lì. Tienilo per te e non mandarlo a nessuno.",
        "Con «Riprendi da una copia» lo rileggi su un altro dispositivo. La pagina ti mostra cosa cambia e ti chiede di confermare.",
        "Se hai un piano e sono passati 30 giorni dall'ultima copia, la pagina te lo ricorda una volta.",
      ],
    },
    {
      titolo: "Chi altro c'entra",
      punti: [
        "intervals.icu custodisce i tuoi dati nel tuo account, con la sua informativa sulla privacy.",
        "GitHub pubblica la pagina, e come per ogni sito tiene i registri tecnici delle visite.",
        "Solo se entri con la tua email, Supabase custodisce quello che salviamo online e Brevo ti manda il codice.",
        "Nessun altro. La pagina non carica niente da altri siti. Parla solo con intervals.icu e, se entri con la tua email, con il nostro database.",
      ],
    },
    {
      titolo: "Come togli l'accesso, con Esci ed «Esci e cancella tutto»",
      punti: [
        "Premi Esci e la chiave, o l'accesso, sparisce da questo dispositivo insieme alla tua scelta sul consenso, alla copia dei dati presi da intervals.icu e alle scritture ancora da mandare.",
        "Con Esci le tue risposte e quello che ci hai detto di te, compresi i sintomi di «Sto male», restano sul dispositivo, così le ritrovi quando rientri. La pagina non le usa finché non rientri e non dai di nuovo il consenso.",
        "Premi «Esci e cancella tutto da questo dispositivo» e cancelli tutto quello che Come sto tiene sul dispositivo, cioè anche risposte, sintomi, profilo, avventura, piano e scelte. Se il dispositivo lo usano anche altri, scegli questo. Lo trovi anche in Impostazioni.",
        "Con tutti e due restano quello che l'app ha scritto nel tuo account intervals.icu, che cancelli da lì, e le copie che hai scaricato, che cancelli tu.",
        {
          chiave: "Per togliere l'accesso ovunque, su intervals.icu crea una chiave nuova. Quella vecchia smette subito di funzionare.",
          intervals: "Se sei entrato con «Entra con intervals.icu», Esci toglie a Come sto anche il permesso su intervals.icu, e lo puoi togliere anche dalle impostazioni di intervals.icu. Se hai incollato la chiave, per togliere l'accesso ovunque creane una nuova su intervals.icu, e la vecchia smette subito di funzionare.",
        },
        "Se sei entrato anche con la tua email, con tutti e due esci anche da lì. Quello che è salvato online resta finché non scegli «Cancella il mio account».",
        "Così ritiri anche il consenso, quando vuoi. Il ritiro vale da quel momento in poi.",
      ],
    },
    {
      titolo: "Età",
      punti: [
        "Come sto è per persone maggiorenni. Per usarla devi avere almeno 18 anni, e se ne hai meno non usarla con i tuoi dati.",
        "Prima di entrare ti chiediamo di confermare con una casella che hai almeno 18 anni. È una tua dichiarazione, e non la possiamo controllare. La fascia d'età che scegli in Impostazioni serve al semaforo e al piano, non a controllare l'età.",
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
  attacco: "Tutto quello che c'è dietro il semaforo, le ore in sella, il verdetto, il piano e i numeri, spiegato semplice.",
  indice: "In questa pagina",
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
        "Anche il secondo giorno di un weekend lungo, di una prova o di un blocco del piano vale come un giorno di viaggio.",
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
  // Le pagine della preparazione (7.11), con i numeri veri delle regole.
  preparazione: [
    {
      id: "ore",
      titolo: "Come stimo le tue ore in sella",
      paragrafi: [
        "Scegli l'evento e in quanti giorni farlo. Dai km e dal dislivello ufficiali calcolo le ore in movimento di tutto il percorso con la bici carica, e le divido per i giorni. È la tua giornata media in sella.",
        "Conto il tuo peso, la bici, le borse, l'acqua e il cibo. La bici carica va più piano soprattutto in salita, e in discesa i chili non restituiscono niente. Con 8 kg di borse una giornata di bikepacking dura di solito circa mezz'ora in più.",
        "Il tuo passo viene dalla soglia di potenza che hai su intervals.icu, se pedali con il misuratore, altrimenti dai tuoi giri lunghi degli ultimi mesi, oppure dalla media che mi hai detto. Dopo la prima uscita con le borse uso i tuoi tempi veri con la bici carica. Finché ti conosco poco la stima è prudente, e la forbice è più larga.",
        "Ti mostro le ore alla mezz'ora, con la forbice, e quanto starai fuori con le soste. Con 8 ore e mezza in sella di solito sei fuori da 10 ore e mezza a 12. Per un viaggio di 11 giorni e più ti dico anche la giornata normale, perché ogni 5-7 giorni ne conviene una più corta.",
        "Uso solo i km e il dislivello pubblici di ogni evento, mai il tracciato. Nei Numeri trovi anche il lavoro di una giornata in kJ e in punti, e i giri che uso per il tuo passo.",
      ],
    },
    {
      id: "pronto",
      titolo: "Come decido se sei pronto",
      paragrafi: [
        "Guardo quattro cose nelle settimane prima della partenza. Le ore in bici a settimana, l'uscita più lunga, le prove con le borse e la continuità, cioè nessuna pausa lunga.",
        "Le ore a settimana contano dalla decima alla terza settimana prima della partenza, scarichi compresi. Per esempio, per un viaggio di 2-5 giorni con 8 ore in sella al giorno servono almeno 7 ore e 10 a settimana, meglio 9 ore e 10, e un'uscita lunga di circa 5 ore e 40.",
        "Il verdetto è «Pronto, con margine», «Pronto», «Quasi pronto» o «Poco pronto», sempre con cosa fare. Arriva quando finisce la terza settimana prima della partenza. Prima vedi dove arrivi se continui così.",
        "Se non basta, ti propongo prima più giorni, poi il percorso corto dello stesso evento, poi di partire e adattare. Mai un piano impossibile.",
        "La Fitness la trovi nei Numeri, con lo specchio di dove arriva di solito chi si prepara a un viaggio come il tuo, ma non decide il verdetto.",
      ],
    },
    {
      id: "piano",
      titolo: "Come nasce il tuo piano",
      paragrafi: [
        "Il piano è la settimana, con bici e palestra. Nasce dalla tua avventura, dai giorni in cui puoi uscire, dal giorno della lunga e dalle ore che hai. Ogni lunedì diventa sette giorni concreti.",
        "La lunga cresce un passo alla volta, mai più di 45 minuti o di un quinto della più lunga del mese. Una sola uscita a settimana ha qualche salita a frasi brevi, le altre sono facili, a ritmo da chiacchiera.",
        "Una settimana ogni quattro è leggera, una ogni tre da 50 anni. Prima della partenza c'è lo scarico finale, di solito due settimane con meno ore e tutto facile, il tapering degli allenatori.",
        "Ogni mattina il semaforo adatta la seduta di oggi. Il colore toglie e non aggiunge. Con «Oggi non posso» la seduta si sposta, e niente si recupera raddoppiando.",
        "La domenica guardo la settimana. Se più segnali dicono stanchezza, la settimana dopo è facile. Le ore che non ci stanno le scrivo in chiaro, e non si recuperano.",
      ],
    },
    {
      id: "prove",
      titolo: "I test con le borse",
      paragrafi: [
        "Prima di un viaggio di 3-5 giorni il piano mette tre prove con la bici carica. Un test di almeno 3 ore, un'uscita lunga con le borse e una prova di due giorni con una notte fuori, che finisce almeno 3 settimane prima della partenza. Per i viaggi di 11 giorni e più le prove sono il test, un blocco di tre giorni e la prova generale.",
        "Conta come prova solo un'uscita di almeno 3 ore con la risposta «Sì, come all'evento», cioè con il peso e le borse del viaggio. Per questo dopo i giri lunghi ti chiedo «Avevi le borse?».",
        "Dopo una prova ti chiedo com'è andata. Se segni mani, sedere, collo, ginocchia o piedi, la prova resta da sistemare finché una prova dopo va tutta bene.",
        "Una prova fatta nelle ultime tre settimane conta, ma arrivi meno fresco. Il piano non la mette mai lì.",
      ],
    },
    {
      id: "palestra",
      titolo: "La palestra",
      paragrafi: [
        "Se la palestra ti va, il piano la mette due volte a settimana per qualche mese, poi una. Negli ultimi 7 giorni prima della partenza niente gambe.",
        "Ci sono nove schede, con esercizi, serie e ripetizioni spiegati a parole, dalla prima volta in palestra al mantenimento, una per chi si allena a casa e una per tronco e collo.",
        "Il peso si sceglie con le ripetizioni che restano. A fine serie dovresti poterne fare ancora 2 o 3. Mai fino a non farcela più.",
        "Probabilmente rende più leggere le ultime ore delle giornate lunghe, con meno fatica. Dà più forza e più muscolo, e probabilmente ossa più forti. Non è provato che prevenga gli infortuni.",
        "Lontano dalle uscite lunghe. Niente gambe nei giorni dopo un weekend lungo o una prova, e mai nel giorno della lunga. Se hai osteoporosi, una malattia di cuore, un infortunio recente o una protesi, prima parlane con il medico o il fisioterapista.",
      ],
    },
    {
      id: "dati",
      titolo: "Quando mancano i dati",
      paragrafi: [
        "Non tutti i dati arrivano. Le uscite da Strava arrivano senza dettagli, alcuni giri non hanno né battito né potenza, la palestra al polso vale poco. Per ogni buco c'è una regola e, quando serve, una domanda.",
        "Le domande sono poche. Tre al mattino e al massimo una carta in più, due quando una è sulle borse. Ogni domanda ha «Non lo so», e dopo 14 giorni senza risposta sparisce. Tutte quelle ancora aperte le trovi nei Numeri.",
        "Un numero stimato ha davanti «circa». Uno che mi hai detto tu ha accanto «lo hai detto tu».",
        "Se un giro non ha sensori, lo sforzo che mi dici diventa il suo carico. Per questo calcolo anche una Fitness mia, che conta i giri senza sensori e la palestra. La trovi nei Numeri accanto a quella di intervals.icu.",
        "Le ore che mancano valgono zero, così il verdetto sbaglia dalla parte prudente e non si blocca mai.",
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

// «Le fonti» della Guida (7.11). Le fonti scientifiche principali dietro le regole dell'app, prese tutte e
// solo dalla ricerca «Allenamento di endurance in bici e in palestra» del 31 ottobre 2026 (BAS Training,
// 01_Scienza), dalle 17 regole in testa e dalle prime citazioni dei capitoli, che hanno autore, anno,
// rivista e collegamento. Per ognuna il primo autore, con «e altri» quando sono di più, l'anno, la
// rivista con il nome corto del documento e cosa sostiene nell'app, mai il titolo originale. Il DOI è
// senza «https», il collegamento a doi.org lo fa js/viste/pagine.js.
export const GUIDA_FONTI = {
  titolo: "Le fonti",
  paragrafi: [
    "Le regole di Come sto vengono da una ricerca sugli studi di allenamento in bici e in palestra, fatta per la Bike Adventure Series alla fine di ottobre 2026. Qui trovi le fonti principali, divise per tema.",
    "Per ognuna c'è il primo autore, l'anno, la rivista e cosa sostiene nell'app. Il codice sotto apre la pagina dello studio, fuori da Come sto.",
    "Quasi tutti gli studi riguardano giovani uomini allenati. Per chi ha più di 40 anni danno la direzione, non il numero esatto. Sui viaggi di più giorni con la bici carica gli studi quasi non ci sono, quindi dove non danno un numero la scelta è nostra, e prudente.",
  ],
  temi: [
    {
      titolo: "Ore in bici e uscita lunga",
      fonti: [
        { autore: "Valenti e altri", anno: "2022", rivista: "J Transl Med", doi: "10.1186/s12967-022-03591-5",
          testo: "Le ore a settimana che ti consiglio non vanno oltre le 12, perché otto partecipanti della NorthCape4000 2021, nei tre mesi prima, ne pedalavano in media circa 11." },
        { autore: "Knechtle e altri", anno: "2011", rivista: "J Strength Cond Res", doi: "10.1519/JSC.0b013e31821606b3",
          testo: "Il verdetto guarda prima le ore a settimana e l'uscita lunga, perché su 720 km chi arrivava in fondo si allenava di più e aveva fatto uscite più lunghe." },
        { autore: "Frandsen e altri", anno: "2025", rivista: "Br J Sports Med", doi: "10.1136/bjsports-2024-109380",
          testo: "L'uscita lunga cresce un passo alla volta, perché in più di 5.000 corridori una corsa molto più lunga della più lunga del mese prima alzava il rischio di farsi male." },
        { autore: "Rosenblat e altri", anno: "2025", rivista: "Sports Med", doi: "10.1007/s40279-024-02149-3",
          testo: "Il piano è quasi tutto facile, con un po' di ritmo medio e poco duro, perché su 348 atleti chi non fa agonismo sembra rispondere meglio così." },
        { autore: "Quinn e Coons", anno: "2011", rivista: "J Sports Sci", doi: "10.1080/02640414.2011.585165",
          testo: "Con il battito nei giri la carta ti dà anche il limite del facile, perché parlando si può superare la soglia senza accorgersene." },
        { autore: "Stevenson e altri", anno: "2022", rivista: "Eur J Appl Physiol", doi: "10.1007/s00421-022-05036-9",
          testo: "Le uscite di almeno 4 ore si contano a parte, perché dopo due ore di bici il limite del facile si abbassa e il battito, a quel limite, sale." },
        { autore: "Burke e altri", anno: "2011", rivista: "J Sports Sci", doi: "10.1080/02640414.2011.585473",
          testo: "Quanto mangiare all'ora nelle uscite lunghe viene dal consenso del Comitato olimpico internazionale sulla nutrizione." },
      ],
    },
    {
      titolo: "Lo scarico finale",
      fonti: [
        { autore: "Bosquet e altri", anno: "2007", rivista: "Med Sci Sports Exerc", doi: "10.1249/mss.0b013e31806010e0",
          testo: "Lo scarico finale dura circa due settimane e toglie ore poco alla volta, tenendo le uscite e qualche accelerazione, come indicano 27 studi." },
        { autore: "Wang e altri", anno: "2023", rivista: "PLoS One", doi: "10.1371/journal.pone.0282838",
          testo: "Con poche ore a settimana lo scarico finale è più corto, perché su 14 studi funziona già da una settimana, purché resti un po' di ritmo." },
        { autore: "Mujika e Padilla", anno: "2003", rivista: "Med Sci Sports Exerc", doi: "10.1249/01.MSS.0000074448.73931.11",
          testo: "Nello scarico finale le uscite restano quasi tutte, perché negli scarichi che funzionano il numero delle sedute cala di poco." },
        { autore: "Coyle e altri", anno: "1984", rivista: "J Appl Physiol", doi: "10.1152/jappl.1984.57.6.1857",
          testo: "Una Fitness che scende nello scarico finale non vuol dire forma persa, perché anche fermi del tutto si perde poco nelle prime settimane." },
      ],
    },
    {
      titolo: "Forza e palestra",
      fonti: [
        { autore: "Llanos-Lagos e altri", anno: "2026", rivista: "Eur J Appl Physiol", doi: "10.1007/s00421-025-05883-2",
          testo: "La palestra è consigliata e non decide il verdetto, perché su 17 studi la forza rende la pedalata più economica, con un beneficio moderato e una certezza bassa." },
        { autore: "Rønnestad e altri", anno: "2011", rivista: "Scand J Med Sci Sports", doi: "10.1111/j.1600-0838.2009.01035.x",
          testo: "La palestra serve alle giornate lunghe, perché dopo 12 settimane di pesi 20 ciclisti arrivavano in fondo a tre ore di bici con più forza e meno fatica." },
        { autore: "Rønnestad e altri", anno: "2010", rivista: "Eur J Appl Physiol", doi: "10.1007/s00421-010-1622-4",
          testo: "Dopo qualche mese la palestra passa a una seduta a settimana, perché una bastava a tenere la forza costruita con due." },
        { autore: "Devantier-Thomas e altri", anno: "2024", rivista: "J Strength Cond Res", doi: "10.1519/JSC.0000000000004629",
          testo: "Le gambe pesanti stanno lontane dalle uscite lunghe, perché nelle 24-48 ore dopo una seduta che lascia i muscoli indolenziti la bici costa più fatica." },
        { autore: "Currier e altri", anno: "2026", rivista: "Med Sci Sports Exerc", doi: "10.1249/MSS.0000000000003897",
          testo: "Nelle schede non si arriva mai a non farcela più, perché per l'American College of Sports Medicine bastano 2 o 3 ripetizioni di riserva." },
      ],
    },
    {
      titolo: "La variabilità del battito",
      fonti: [
        { autore: "Manresa-Rocamora e altri", anno: "2021", rivista: "Int J Environ Res Public Health", doi: "10.3390/ijerph181910299",
          testo: "Con la variabilità del battito bassa il semaforo toglie lo sforzo e non lo aggiunge, come negli studi in cui la seduta dura diventava un giorno facile." },
        { autore: "Plews e altri", anno: "2013", rivista: "Int J Sports Physiol Perform", doi: "10.1123/ijspp.8.6.688",
          testo: "Il semaforo guarda soprattutto la media di sette notti, perché il miglioramento seguiva poco la notte singola e molto la media della settimana." },
        { autore: "Vesterinen e altri", anno: "2016", rivista: "Med Sci Sports Exerc", doi: "10.1249/MSS.0000000000000910",
          testo: "Le soglie della variabilità del battito vengono da questo studio su 40 corridori, che confrontava la media di sette giorni con il proprio normale." },
        { autore: "Le Meur e altri", anno: "2013", rivista: "Med Sci Sports Exerc", doi: "10.1249/MSS.0b013e3182980125",
          testo: "Una variabilità del battito sopra il solito non è mai un premio, perché in 21 triatleti stanchi per il troppo carico saliva invece di scendere." },
        { autore: "Dial e altri", anno: "2025", rivista: "Physiol Rep", doi: "10.14814/phy2.70527",
          testo: "Una notte sola conta poco e ogni dispositivo ha il suo normale, perché gli orologi sbagliano la variabilità della notte singola, alcuni più di altri." },
      ],
    },
    {
      titolo: "Sonno e recupero",
      fonti: [
        { autore: "Chinoy e altri", anno: "2021", rivista: "Sleep", doi: "10.1093/sleep/zsaa291",
          testo: "Il sonno da solo non dà mai il rosso, perché due orologi contavano circa 45 minuti di sonno in più, di più nelle notti disturbate." },
        { autore: "Craven e altri", anno: "2022", rivista: "Sports Med", doi: "10.1007/s40279-022-01706-y",
          testo: "Sotto le 6 ore il sonno pesa nel semaforo, perché una notte di 6 ore o meno toglie un po' di resistenza." },
        { autore: "Saw e altri", anno: "2016", rivista: "Br J Sports Med", doi: "10.1136/bjsports-2015-094758",
          testo: "Le tre domande del mattino contano sempre per intero, perché le risposte di chi si allena seguono il carico meglio dei numeri misurati." },
        { autore: "Meeusen e altri", anno: "2013", rivista: "Med Sci Sports Exerc", doi: "10.1249/MSS.0b013e318279a10a",
          testo: "Il rosso dei numeri viene da più segnali che vanno d'accordo, perché per il consenso europeo e americano sul troppo allenamento nessun numero basta da solo." },
        { autore: "Borges e altri", anno: "2018", rivista: "Exp Aging Res", doi: "10.1080/0361073X.2018.1477361",
          testo: "Da 50 anni la settimana leggera arriva ogni tre, perché ciclisti di circa 56 anni recuperavano come quelli di 26 ma si sentivano più stanchi." },
      ],
    },
    {
      titolo: "Carico e Fitness",
      fonti: [
        { autore: "Impellizzeri e altri", anno: "2021", rivista: "Sports Med", doi: "10.1007/s40279-020-01378-6",
          testo: "Il carico recente da solo pesa poco nel semaforo, perché il rapporto fra carico recente e carico di fondo non prevedeva gli infortuni meglio del caso." },
        { autore: "Vermeire e altri", anno: "2023", rivista: "Int J Sports Physiol Perform", doi: "10.1123/ijspp.2022-0157",
          testo: "Dopo i giri ti chiedo com'è stata, perché in 11 ciclisti solo il carico calcolato dallo sforzo percepito seguiva la fatica vera." },
        { autore: "Foster e altri", anno: "2001", rivista: "J Strength Cond Res", doi: "10.1519/00124278-200102000-00019",
          testo: "Per un giro senza sensori il carico è lo sforzo che mi dici per i suoi minuti, il metodo nato con questo studio." },
        { autore: "Lea e altri", anno: "2022", rivista: "Sports Med Open", doi: "10.1186/s40798-021-00386-8",
          testo: "Anche il carico della palestra viene dallo sforzo che mi dici, perché su 118 studi lo sforzo percepito misura bene le sedute di forza." },
      ],
    },
    {
      titolo: "Bici carica e borse",
      fonti: [
        { autore: "Martin e altri", anno: "1998", rivista: "J Appl Biomech", doi: "10.1123/jab.14.3.276",
          testo: "Le ore in sella vengono dal modello fisico della bici, che su strada prevede bene quanto si spinge sui pedali, anche se con le borse nessuno l'ha mai provato." },
        { autore: "Knapik e altri", anno: "2012", rivista: "J Strength Cond Res", doi: "10.1519/JSC.0b013e3182429853",
          testo: "Le prove con le borse crescono dal test corto alla prova generale, perché nei militari portare peso si impara con marce cariche che crescono poco alla volta." },
        { autore: "Ashe e altri", anno: "2003", rivista: "Br J Sports Med", doi: "10.1136/bjsm.37.5.441",
          testo: "Dopo la prova generale la posizione in bici non si cambia più, perché una posizione mai provata fa spingere meno." },
        { autore: "Patterson e altri", anno: "2003", rivista: "Am J Sports Med", doi: "10.1177/03635465030310041801",
          testo: "Dopo una prova con le borse ti chiedo di mani, sedere e collo, perché dopo 600 km quasi tutti avevano disturbi alle mani, esperti compresi." },
      ],
    },
    {
      titolo: "Cuore e medico",
      fonti: [
        { autore: "Pelliccia e altri", anno: "2021", rivista: "Eur Heart J", doi: "10.1093/eurheartj/ehaa605",
          testo: "Un sintomo di cuore ferma sempre la giornata e porta dal medico, come chiedono le linee guida europee di cardiologia dello sport." },
        { autore: "Schwellnus e altri", anno: "2016", rivista: "Br J Sports Med", doi: "10.1136/bjsports-2016-096572",
          testo: "Con la febbre o i dolori in tutto il corpo niente bici, e dopo 24 ore senza febbre si riparte piano, come dice un consenso di esperti." },
        { autore: "Snyders e altri", anno: "2022", rivista: "Br J Sports Med", doi: "10.1136/bjsports-2021-104719",
          testo: "Dopo una malattia di più di una settimana serve il medico prima di riprendere, perché i disturbi delle vie respiratorie durano in media circa una settimana." },
        { autore: "Wundersitz e altri", anno: "2019", rivista: "Int J Cardiol", doi: "10.1016/j.ijcard.2019.03.016",
          testo: "Da 40 anni, prima di un viaggio di 11 giorni e più, ti ricordo di sentire il medico, perché dopo 21 giorni in bici adulti e anziani avevano molte più aritmie di prima." },
        { autore: "Peltola", anno: "2012", rivista: "Front Physiol", doi: "10.3389/fphys.2012.00148",
          testo: "Con un'aritmia nota una variabilità del battito alta non vale mai come verde, perché i battiti fuori tempo la fanno salire." },
      ],
    },
  ],
};

// «Valenti e altri, 2022.», la riga di una fonte prima della rivista.
export function chiFonte(fonte) {
  const f = fonte && typeof fonte === "object" ? fonte : null;
  if (!f || typeof f.autore !== "string" || !f.autore || !/^\d{4}$/.test(String(f.anno ?? ""))) return null;
  return `${f.autore}, ${f.anno}.`;
}

// Gli ingressi di esempio dei modelli che vogliono un oggetto, che la prova della scrittura (9.8) non sa
// costruire da sola. Ogni voce è una lista di argomenti.
export const ESEMPI = {
  chiFonte: [[{ autore: "Valenti e altri", anno: "2022" }], [{ autore: "Peltola", anno: 2012 }]],
};
