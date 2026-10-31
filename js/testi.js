// Le spiegazioni dei numeri, in parole semplici. Le usano le tessere di "Oggi" e la Guida.
// Regola di scrittura: frasi brevi, niente due punti in mezzo alle frasi, niente sigle senza spiegazione.

export const SPIEGAZIONI = {
  hrv: {
    nome: "HRV",
    sottotitolo: "Quanto il corpo ha recuperato stanotte",
    cosa: "Tra un battito e l'altro del cuore non passa sempre lo stesso tempo. L'HRV misura quanto varia questa distanza mentre dormi, in millesimi di secondo (ms). Un cuore che varia tanto è un corpo rilassato, che ha recuperato.",
    come: "Il numero da solo non dice niente, perché ognuno ha il suo. Conta il confronto con il tuo normale, che l'app calcola dalle tue ultime notti. Una notte storta capita a tutti. Tre o quattro notti di fila sotto il normale vogliono dire che il corpo sta ancora riparando qualcosa.",
    legami: "Scende dopo un giro duro, una giornata stressante, una cena pesante, un bicchiere di troppo o un raffreddore in arrivo. Di solito si muove al contrario del battito a riposo.",
  },
  fc: {
    nome: "Battito a riposo",
    sottotitolo: "Il cuore più tranquillo della notte",
    cosa: "Il numero di battiti al minuto più basso della notte, quando sei fermo e rilassato.",
    come: "Ognuno ha il suo. Tre battiti sopra il tuo solito sono un segnale di stanchezza o di un malanno in arrivo, anche se ti senti bene. Cinque battiti sopra è un campanello forte.",
    legami: "Con l'allenamento costante scende piano piano, mese dopo mese. Con la stanchezza sale subito, già la notte dopo un giro duro.",
  },
  sonno: {
    nome: "Sonno",
    sottotitolo: "Il carburante del recupero",
    cosa: "Le ore che hai dormito davvero e, se il tuo orologio lo calcola, il punteggio della notte da 0 a 100.",
    come: "Sotto le 6 ore e mezza il recupero resta a metà. Sotto le 5 ore e mezza quasi non c'è. Il punteggio sotto 70 vale come una notte corta anche se le ore ci sono.",
    legami: "Il sonno è la causa, HRV e battito a riposo sono l'effetto. Se il semaforo è giallo e hai dormito poco, la cura è dormire di più, non allenarti di meno.",
  },
  forma: {
    nome: "Forma",
    sottotitolo: "Fresco o stanco, oggi",
    cosa: "È la Fitness meno la Fatica. Dice se in questo momento sei riposato o se ti porti dietro la stanchezza degli ultimi giorni.",
    come: "Positiva vuol dire riposato. Un po' negativa vuol dire che ti stai allenando nel modo giusto, ed è lì che si migliora. Molto negativa vuol dire che stai caricando più di quanto il corpo sia abituato.",
    legami: "Prima di un evento si cerca una Forma positiva, scaricando negli ultimi giorni. Quando è molto negativa, di solito anche l'HRV della notte cala.",
  },
  fitness: {
    nome: "Fitness",
    sottotitolo: "Quanto sei allenato",
    cosa: "La media del lavoro che hai fatto nelle ultime sei settimane, contando di più i giorni recenti. È la tua base, il motore che hai costruito.",
    come: "Sale piano quando ti alleni con costanza, di solito da 2 a 5 punti a settimana. Scende da sola se ti fermi, ma lentamente. Intorno a 20 è chi pedala ogni tanto, 40-50 è un amatore costante, 70 e oltre è chi si prepara per qualcosa di grosso.",
    legami: "Cresce solo se per settimane fai un po' più del tuo solito senza che le notti protestino. È il progresso vero, più del tempo su una salita.",
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
    cosa: "Confronta il lavoro degli ultimi giorni con il tuo solito delle ultime sei settimane. 1 vuol dire che sei in linea. 1,3 vuol dire il 30% in più del solito. Il lavoro si misura in punti, che intervals.icu calcola dal battito o dai watt di ogni allenamento. Un'ora di giro tranquillo vale circa 50 punti, un'ora a tutta più di 100.",
    come: "Sotto 1,3 tutto bene. Tra 1,3 e 1,5 stai caricando parecchio e il semaforo comincia a frenare. Oltre 1,5 è il punto in cui ci si fa male più facilmente. Sotto 0,8 stai riposando.",
    legami: "È la Fatica divisa per la Fitness. Si guarda com'era ieri sera, così il giro di stamattina non cambia il consiglio di stamattina.",
  },
};

export const GUIDA_SEMAFORO = [
  { voce: "HRV della notte", verde: "Nel tuo normale o sopra", giallo: "Un po' sotto il normale, oppure la media della settimana è bassa", rosso: "Molto sotto il normale, oppure sotto il normale da più notti di fila" },
  { voce: "Battito a riposo", verde: "Fino a 2 battiti sopra il tuo solito", giallo: "3 o 4 battiti sopra", rosso: "5 battiti sopra o più" },
  { voce: "Sonno", verde: "Almeno 6 ore e mezza e punteggio 70", giallo: "Meno di 6 ore e mezza o punteggio sotto 70", rosso: "Meno di 5 ore e mezza o punteggio sotto 60" },
  { voce: "Allenamento recente", verde: "In linea con il tuo solito", giallo: "Più di 1,3 volte il solito", rosso: "Più di 1,5 volte il solito" },
  { voce: "Acciacchi", verde: "Niente", giallo: "Un fastidio, oggi o ieri", rosso: "Un dolore o un infortunio" },
  { voce: "Come ti senti", verde: "Bene o normale", giallo: "Un po' stanco o gambe indolenzite", rosso: "A pezzi" },
];

export const DOMANDE_MATTINO = [
  {
    campo: "fatica", nome: "energia", testo: "Come ti senti di energia?",
    opzioni: ["Pieno di energia", "Normale", "Un po' stanco", "A pezzi"],
  },
  {
    campo: "dolori", nome: "gambe", testo: "Come stanno le gambe?",
    opzioni: ["Fresche", "Normali", "Un po' indolenzite", "Molto doloranti"],
  },
  {
    campo: "infortunio", nome: "acciacchi", testo: "Hai dolori o fastidi?",
    opzioni: ["Niente", "Un fastidio", "Un dolore", "Sono infortunato"],
  },
];

export const DISPOSITIVI = [
  {
    id: "garmin", nome: "Garmin",
    passi: "Su intervals.icu apri Settings, l'ingranaggio in alto. Nella sezione Garmin premi Connect ed entra con il tuo account Garmin. Lascia accese sia le attività sia il benessere (wellness), così arrivano anche sonno, HRV e battito a riposo.",
  },
  {
    id: "wahoo", nome: "Wahoo",
    passi: "In Settings trova Wahoo e premi Connect. Dopo ogni giro il ciclocomputer manda l'uscita da solo. Per sonno e HRV serve in più un orologio o un anello, collegato a parte.",
  },
  {
    id: "altri", nome: "Polar, Suunto, Coros",
    passi: "In Settings trova il tuo marchio e premi Connect. Se c'è l'opzione per il benessere (wellness), attivala per avere anche le notti.",
  },
  {
    id: "anelli", nome: "Oura, Whoop",
    passi: "In Settings collegali per sonno, HRV e battito a riposo. Vanno benissimo insieme al ciclocomputer, che porta i giri.",
  },
  {
    id: "apple", nome: "Apple Watch",
    passi: "intervals.icu non legge direttamente Apple Salute. Di solito si usa un'app ponte sull'iPhone, per esempio HealthFit, che manda a intervals.icu giri e dati della notte.",
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
    r: "Puoi, ma accorcia il giro e tieni un ritmo da chiacchiera. Il semaforo legge una stanchezza che spesso non si sente nelle gambe la mattina. Se anche il giorno dopo i numeri restano bassi, ascoltali.",
  },
  {
    d: "Perché le mie domande del mattino finiscono su intervals.icu?",
    r: "Perché così restano tue, insieme agli altri dati, e le ritrovi anche nell'app di intervals.icu. Come sto non tiene niente per sé.",
  },
  {
    d: "Come esco, o tolgo l'accesso?",
    r: "Premi Esci in fondo alla pagina e la chiave sparisce da questo dispositivo. Per togliere l'accesso ovunque, su intervals.icu crea una chiave nuova. Quella vecchia smette subito di funzionare.",
  },
];

export const LIMITI = [
  "Il battito misurato al polso durante il giro è spesso sbagliato. Per i giri usa una fascia cardio o il ciclocomputer.",
  "Una sola notte storta non è un problema. Conta la tendenza di tre o quattro giorni.",
  "Se cambi orologio, i numeri dell'HRV cambiano. Servono un paio di settimane perché l'app impari il tuo nuovo normale.",
  "Il semaforo non sa se ti fa male un ginocchio. Diglielo con le domande del mattino.",
  "Come sto non è un medico e non fa diagnosi. Se hai dolori, febbre, o il battito a riposo resta alto per giorni, parlane con un medico.",
];
