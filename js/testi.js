// Le spiegazioni dei numeri, in parole semplici. Le usano le tessere di "Oggi" e la Guida.
// Regola di scrittura: frasi brevi, niente due punti in mezzo alle frasi, niente sigle senza spiegazione.

export const SPIEGAZIONI = {
  hrv: {
    nome: "HRV",
    sottotitolo: "Variabilità del battito, quanto hai recuperato stanotte",
    cosa: "HRV vuol dire variabilità del battito. Tra un battito e l'altro del cuore non passa sempre lo stesso tempo, e l'HRV misura quanto varia questa distanza mentre dormi, in millesimi di secondo (ms). Quando sei riposato di solito varia di più, sotto sforzo o con un malanno varia di meno.",
    come: "Il numero da solo non dice niente, perché ognuno ha il suo e ogni orologio lo misura a modo suo. Conta il confronto con il tuo normale, che l'app calcola dalle tue ultime notti. Una notte storta capita a tutti. Tre o quattro notti di fila sotto il normale vogliono dire che il corpo sta ancora smaltendo qualcosa.",
    legami: "Scende dopo un giro duro, una giornata stressante, una cena pesante, un bicchiere di troppo o un raffreddore in arrivo. Di solito si muove al contrario del battito a riposo.",
  },
  fc: {
    nome: "Battito a riposo",
    sottotitolo: "Il cuore più tranquillo della notte",
    cosa: "Il numero di battiti al minuto più basso della notte, quando sei fermo e rilassato.",
    come: "Ognuno ha il suo. Tre battiti sopra il tuo normale possono essere un segnale di stanchezza o di un malanno in arrivo, anche se ti senti bene. Se dura due o tre notti, ascoltalo. Cinque battiti sopra è un campanello forte.",
    legami: "Con l'allenamento costante scende piano piano, mese dopo mese. Con la stanchezza o un malanno sale subito, spesso prima che tu te ne accorga.",
  },
  sonno: {
    nome: "Sonno",
    sottotitolo: "Il carburante del recupero",
    cosa: "Le ore che hai dormito davvero e, se il tuo orologio lo calcola, il punteggio della notte da 0 a 100.",
    come: "Sotto le 6 ore la notte è corta e la fatica si sente di più. Sotto le 5 è proprio poca. Conta anche la settimana, perché una media sotto le 6 ore e mezza è un debito che si accumula.",
    legami: "Sonno, HRV e battito si influenzano a vicenda. Se hai dormito poco, vai piano, stai più attento in strada e stasera vai a letto prima.",
  },
  freschezza: {
    nome: "Freschezza",
    sottotitolo: "Fresco o stanco, oggi",
    cosa: "È la Fitness meno la Fatica, in percentuale della Fitness. Dice se in questo momento sei riposato o se ti porti dietro la stanchezza degli ultimi giorni. Su intervals.icu si chiama Form.",
    come: "Positiva vuol dire riposato. Un po' negativa, fino a meno 30%, vuol dire che ti stai allenando nel modo giusto, ed è lì che si migliora. Più negativa vuol dire che stai caricando più di quanto il corpo sia abituato.",
    legami: "Prima di un evento si cerca una freschezza positiva, scaricando negli ultimi giorni. Quando è molto negativa, di solito anche l'HRV della notte cala.",
  },
  fitness: {
    nome: "Fitness",
    sottotitolo: "Quanto ti stai allenando",
    cosa: "La media del lavoro che hai fatto nelle ultime sei settimane, contando di più i giorni recenti. Dice quanto ti stai allenando, non quanto vai forte.",
    come: "Sale piano quando ti alleni con costanza, di solito da 2 a 5 punti a settimana. Se ti fermi cala di circa un sesto a settimana, più in fretta del tuo motore. Intorno a 20 è chi pedala ogni tanto, 40-50 è un amatore costante, 70 e oltre è chi si prepara per qualcosa di grosso. Questi numeri valgono se su intervals.icu la tua soglia è giusta.",
    legami: "Cresce solo se per settimane fai un po' più del tuo solito senza che le notti protestino. Se il lavoro funziona lo vedi in salita, quando a parità di fatica vai più forte.",
  },
  fatica: {
    nome: "Fatica",
    sottotitolo: "Il lavoro degli ultimi sette giorni",
    cosa: "La media del lavoro dell'ultima settimana. Sale in fretta dopo un giro grosso e in una settimana si sgonfia.",
    come: "Non è la stanchezza che senti nelle gambe, è quella che hai messo in conto. Quando supera di molto la Fitness, ti stai caricando più del solito.",
    legami: "Fitness e Fatica nascono dagli stessi giri. La Fitness è la media lunga, la Fatica quella corta.",
  },
  carico: {
    nome: "Carico recente",
    sottotitolo: "Quanto stai facendo rispetto al solito",
    cosa: "Confronta il lavoro degli ultimi giorni (la Fatica) con il tuo solito delle ultime sei settimane (la Fitness). 1 vuol dire che sei in linea. 1,3 vuol dire il 30% in più del solito. Il lavoro si misura in punti, che intervals.icu calcola dal battito o dai watt di ogni allenamento. Un'ora di giro tranquillo vale circa 40-50 punti.",
    come: "Fino a 1,3 volte va bene. Più su, e con una bella differenza in punti, stai caricando parecchio. Oltre 1,5 volte è un salto grosso, e uno o due giorni facili aiutano il corpo ad assorbirlo. Sotto 0,8 stai riposando.",
    legami: "È un indizio, non una sentenza. Negli studi non predice bene gli infortuni da solo, per questo il semaforo lo mette insieme alla notte e a come ti senti. Si guarda com'era ieri sera, così il giro di stamattina non cambia il consiglio di stamattina.",
  },
};

export const GUIDA_SEMAFORO = [
  { voce: "HRV della notte", verde: "Nel tuo normale o sopra", giallo: "Un po' sotto il normale, oppure la media della settimana è bassa", rosso: "Molto sotto il normale, oppure sotto il normale da più notti di fila" },
  { voce: "Battito a riposo", verde: "Fino a 2 battiti sopra il tuo normale", giallo: "3 o 4 battiti sopra", rosso: "5 battiti sopra o più" },
  { voce: "Sonno", verde: "Almeno 6 ore, punteggio da 60 in su", giallo: "Meno di 6 ore, punteggio sotto 60, o una settimana in media sotto le 6 ore e mezza", rosso: "Meno di 5 ore o punteggio sotto 50" },
  { voce: "Carico recente", verde: "In linea con il tuo solito", giallo: "Oltre 1,3 volte il solito, con almeno 15 punti di differenza", rosso: "Oltre 1,5 volte il solito, con almeno 25 punti di differenza" },
  { voce: "Acciacchi", verde: "Niente", giallo: "Un fastidio, oggi o ieri", rosso: "Un dolore o un infortunio. Il semaforo diventa rosso comunque" },
  { voce: "Come ti senti", verde: "Bene o normale", giallo: "Poca energia o gambe un po' indolenzite", rosso: "A pezzi o gambe molto doloranti. Il semaforo diventa rosso comunque" },
];

export const DOMANDE_MATTINO = [
  {
    campo: "fatica", nome: "energia", testo: "Quanta energia hai?",
    opzioni: ["Tanta", "Normale", "Poca", "Sono a pezzi"],
  },
  {
    campo: "dolori", nome: "gambe", testo: "Come stanno le gambe?",
    opzioni: ["Fresche", "Normali", "Un po' indolenzite", "Molto doloranti"],
  },
  {
    campo: "infortunio", nome: "acciacchi", testo: "Hai qualche acciacco, oltre alla solita stanchezza delle gambe?",
    opzioni: ["Niente", "Un fastidio", "Un dolore", "Un infortunio"],
  },
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
    r: "Puoi, ma accorcia il giro e tieni un ritmo da chiacchiera. Il semaforo legge una stanchezza che spesso non si sente nelle gambe la mattina. Se non hai fatto niente di duro e i numeri crollano lo stesso, può essere un malanno in arrivo. Allora resta fermo.",
  },
  {
    d: "Posso confrontare i miei numeri con quelli di un amico?",
    r: "No. Ogni orologio misura l'HRV in un momento diverso della notte, e ognuno ha il suo normale. I numeri si confrontano solo con te stesso, e sempre con lo stesso dispositivo.",
  },
  {
    d: "Perché le mie risposte del mattino finiscono su intervals.icu?",
    r: "Perché così restano tue, insieme agli altri dati, e le ritrovi anche nell'app di intervals.icu. Come sto non tiene niente per sé.",
  },
  {
    d: "Come esco, o tolgo l'accesso?",
    r: "Premi Esci in fondo alla pagina e la chiave sparisce da questo dispositivo. Per togliere l'accesso ovunque, su intervals.icu crea una chiave nuova. Quella vecchia smette subito di funzionare.",
  },
];

export const LIMITI = [
  "Con la febbre, o con tosse e dolori in tutto il corpo, non allenarti, qualunque colore abbia il semaforo.",
  "Se in bici senti dolore al petto, il cuore che batte strano, un fiato corto mai provato o ti gira la testa, fermati e chiama un medico.",
  "Alcune medicine, per esempio i betabloccanti, cambiano battito e HRV. Se le prendi, chiedi al medico come regolarti.",
  "Alcol, caldo, una cena tardi, un viaggio, la quota e, per le donne, la seconda metà del ciclo alzano il battito e abbassano l'HRV anche senza stanchezza.",
  "Ogni orologio misura l'HRV in un momento diverso della notte. Usa un solo dispositivo per la notte. Se lo cambi, servono un paio di settimane perché l'app impari il tuo nuovo normale.",
  "Il battito misurato al polso durante il giro è spesso sbagliato. Per i giri usa una fascia cardio o il ciclocomputer.",
  "Una sola notte storta non è un problema. Conta la tendenza di tre o quattro giorni.",
  "Il semaforo non sa se ti fa male un ginocchio. Diglielo con le domande del mattino.",
  "Come sto non è un medico e non fa diagnosi. Se il battito a riposo resta alto per giorni o qualcosa non ti convince, parlane con un medico.",
];
