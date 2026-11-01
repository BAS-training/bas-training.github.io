// Tutti i testi dell'app, in parole semplici. Li usano le pagine, il semaforo e la Guida.
// Regole di scrittura (capitolo 7.1 della specifica). Del tu, frasi brevi, nessun carattere dei due
// punti, orari con il punto, durate in parole, niente sigle a schermo, nessuna pagella e nessuna
// promessa medica. I modelli con un valore dentro sono funzioni, così le prove li compongono.

// Le durate in parole. Sotto l'ora in minuti, poi «1 ora e 20» o «3 ore e mezza», arrotondate a 5
// minuti sotto le 2 ore e a 10 sopra (7.1). Quando js/formato.js avrà formatoDurata, si usa quella.
export function durataInParole(minuti) {
  if (typeof minuti !== "number" || !Number.isFinite(minuti) || minuti < 0) return "";
  const passo = minuti < 120 ? 5 : 10;
  const tondi = Math.round(minuti / passo) * passo;
  if (tondi < 60) return `${tondi} minuti`;
  const ore = Math.floor(tondi / 60);
  const resto = tondi % 60;
  const parola = ore === 1 ? "1 ora" : `${ore} ore`;
  if (!resto) return parola;
  return resto === 30 ? `${parola} e mezza` : `${parola} e ${resto}`;
}

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
    cosa: "Il numero di battiti al minuto della notte, quando sei fermo e rilassato. Se il tuo dispositivo lo dà, è la media del sonno, altrimenti il battito più basso della giornata.",
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
    cosa: "La media del lavoro che hai fatto nelle ultime sei settimane, contando di più i giorni recenti. Dice quanto ti stai allenando, e non è un voto.",
    come: "Sale piano quando ti alleni con costanza, di solito da 2 a 5 punti a settimana. Se ti fermi cala di circa un sesto a settimana, più in fretta del tuo motore. Intorno a 20 è chi pedala ogni tanto, 40-50 è chi pedala con costanza, 70 e oltre è chi si prepara per qualcosa di grosso. Questi numeri valgono se su intervals.icu la tua soglia è giusta.",
    legami: "Cresce solo se per settimane fai un po' più del tuo solito senza che le notti protestino. Se il lavoro funziona lo senti in salita, quando la stessa salita costa meno fatica.",
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

// --- Il semaforo (capitolo 4) ---

// I livelli, con titolo e consiglio (4.1). Il colore serve alla pagina.
export const LIVELLI = {
  verde: {
    colore: "verde",
    titolo: "Via libera",
    consiglio: "Fai la seduta di oggi come è scritta. Il verde non la allunga.",
  },
  "giallo-leggero": {
    colore: "giallo",
    titolo: "Vai, ma senza esagerare",
    consiglio: "La seduta di oggi va bene, ma niente sforzi al massimo. In salita resta a frasi brevi. In palestra tieni una ripetizione in più in riserva.",
  },
  giallo: {
    colore: "giallo",
    titolo: "Giornata tranquilla",
    consiglio: "Un giro facile da mezz'ora a un'ora e mezza, a ritmo da chiacchiera. Oppure palestra leggera. Oggi niente lunga, weekend o prove, si spostano.",
  },
  rosso: {
    colore: "rosso",
    titolo: "Oggi recupera",
    consiglio: "Riposo o una camminata. Se proprio vuoi la bici, al massimo 45 minuti pianissimo. In palestra solo 10 minuti di mobilità.",
  },
  nessuno: {
    colore: "neutro",
    titolo: "Ancora pochi dati",
    consiglio: "Il semaforo impara il tuo normale in quattro settimane. Intanto segui il piano senza sforzi al massimo e rispondi alle domande del mattino.",
  },
};

// La parola accanto al pallino di una tessera.
export const ESITO_VOCE = {
  verde: "a posto",
  giallo: "attenzione",
  rosso: "frena",
  neutro: "non conta oggi",
};

// Le righe del «Perché», una per voce (4.8). Mai i punti scritti.
export const VOCI = {
  energia: {
    nome: "Energia",
    uno: "Hai detto che hai poca energia.",
    tanta: "Hai detto che hai tanta energia.",
    normale: "Hai detto che l'energia è quella di sempre.",
    pezzi: "Hai detto che sei a pezzi.",
    senza: "Non hai ancora risposto.",
  },
  gambe: {
    nome: "Gambe",
    uno: "Hai detto che le gambe sono un po' indolenzite.",
    due: "Hai detto che le gambe sono molto doloranti.",
    fresche: "Hai detto che le gambe sono fresche.",
    normali: "Hai detto che le gambe sono normali.",
    pedalata: "Hai detto che le gambe sono molto doloranti e che ti cambiano la pedalata.",
    senza: "Non hai ancora risposto.",
  },
  acciacchi: {
    nome: "Acciacchi",
    uno: "Hai segnato un fastidio. Oggi niente sforzi che lo peggiorano.",
    due: "Hai segnato un dolore che non cambia la pedalata. Oggi solo giri facili, e se non passa in una o due settimane fatti vedere.",
    niente: "Nessun acciacco segnato.",
    dolore: "Hai segnato un dolore.",
    infortunio: "Hai segnato un infortunio.",
    ieri: "Lo hai segnato ieri, e oggi non hai ancora risposto.",
    senza: "Non hai ancora risposto.",
  },
  sonno: {
    nome: "Sonno",
    poco: "Hai dormito poco stanotte.",
    settimana: "Questa settimana dormi poco.",
    dueNotti: "Hai dormito poco due notti di fila.",
    moltoPoco: "Hai dormito molto poco stanotte.",
    sottoSolito: "Stanotte hai dormito molto meno del tuo solito.",
    punteggio: "Il tuo orologio dice che la notte non è stata buona.",
    bene: (minuti) => `Stanotte hai dormito ${durataInParole(minuti)}.`,
    soloPunteggio: "Il tuo orologio dice che la notte è andata bene.",
    mai: "Non arriva da nessun dispositivo.",
  },
  fc: {
    nome: "Battito a riposo",
    uno: "Il battito a riposo è un po' più alto del tuo solito.",
    due: "Il battito a riposo è alto da due notti.",
    moltoAlto: "Il battito a riposo è molto più alto del tuo solito.",
    normale: (battiti, solito) => `Stanotte ${battiti} battiti, il tuo normale è ${solito}.`,
    impara: (notti) => `Sto ancora imparando il tuo normale, ho ${notti} notti su 7.`,
    mai: "Il tuo dispositivo non lo manda di notte.",
  },
  hrv: {
    nome: "HRV, la variabilità del battito",
    uno: "Le notti dicono che il corpo sta ancora recuperando.",
    due: "Da qualche notte il corpo recupera meno del solito.",
    moltoBassa: "Stanotte il corpo ha recuperato molto meno del solito.",
    normale: "Stanotte è nel tuo normale.",
    calo: "Un po' sotto il tuo normale, come capita dopo un'uscita lunga.",
    saturazione: "È scesa insieme al battito, succede a chi è molto allenato. Oggi non conta.",
    sopra: "Sopra il tuo solito. Non è un premio.",
    altaFatica: "Sopra il tuo solito, con il battito basso e qualche segno di fatica. A volte vuol dire stanchezza.",
    altaEta: "Stanotte è più alta del tuo solito. Se capita spesso, parlane con il medico.",
    insolita: "Stanotte la lettura è insolita. Controlla i dati del tuo dispositivo.",
    corta: "Stanotte hai dormito meno di 4 ore, e la notte non si legge.",
    impara: (notti) => `Sto ancora imparando il tuo normale, ho ${notti} notti su 14.`,
    mai: "Il tuo dispositivo non la misura, oppure non la manda a intervals.icu.",
  },
  carico: {
    nome: "Carico recente",
    uno: "Negli ultimi giorni hai fatto più del tuo solito.",
    due: "Negli ultimi giorni hai fatto molto più del solito.",
    linea: "Negli ultimi giorni sei in linea con il tuo solito.",
    meno: "Negli ultimi giorni hai fatto meno del solito.",
    pochi: "Hai ancora pochi giri registrati. Qui conto poco, quindi non voto.",
    nessuno: "Non c'è ancora nessun giro registrato.",
  },
  notte: {
    nome: "La notte",
    mai: "HRV, battito a riposo e sonno non arrivano da nessun dispositivo. Il semaforo guarda le tue risposte e il carico.",
  },
  // Le righe comuni a più voci.
  nonArrivata: "Stanotte non è ancora arrivata.",
  viaggio: "In viaggio questi numeri cambiano da soli. Oggi guardo come stai tu.",
  guardiaNotte: "Dopo una fatica voluta le notti sono storte per forza, e oggi non contano.",
  guardiaCarico: "Dopo una fatica voluta questo numero sale per forza, e oggi non conta.",
};

// La frase del perché sulla carta, quando non viene da una voce (4.8).
export const PERCHE = {
  nessuno: "Nessun segnale di stanchezza.",
  pochiDati: "Sto ancora imparando il tuo normale.",
  ultimi: (giorni) => (giorni === 1
    ? "Manca un giorno. Adesso conta arrivare riposato."
    : `Mancano ${giorni} giorni. Adesso conta arrivare riposato.`),
  rientro: (giorno, giorni) => `Riparti dopo la malattia, giorno ${giorno} di ${giorni}. In questi giorni il semaforo non va oltre il giallo.`,
  crescita: "La Fitness è salita in fretta. Per qualche giorno niente sforzi al massimo, e la settimana prossima non aumentare.",
  collo: "Hai segnato naso che cola o gola irritata.",
  stop: {
    cuore: "Hai segnato un sintomo di cuore.",
    malattia: "Hai segnato un sintomo di malattia.",
    malattiaRiportata: "Nei giorni scorsi hai segnato un sintomo di malattia, e non mi hai ancora detto che è passato.",
    battito: "Il battito a riposo è molto più alto del solito, e hai segnato un sintomo.",
    dolore: "Hai segnato un dolore.",
    infortunio: "Hai segnato un infortunio.",
    pezzi: "Hai detto che sei a pezzi.",
  },
};

// Le note che restano, una sola, quando servono (4.8).
export const NOTE = {
  malanno: "Non hai fatto niente di duro, eppure le notti sono basse. Può essere un malanno in arrivo. Oggi resta fermo, e se hai febbre o dolori in tutto il corpo non allenarti.",
  ascolta: "Le notti sono buone, ma tu non ti senti al meglio. Ascolta anche te stesso.",
  caloAtteso: "L'HRV è scesa dopo l'uscita lunga di ieri. È normale e non conta.",
  hrvAlta: "L'HRV è sopra il tuo solito. Non è un premio, a volte arriva con la stanchezza o prima di un raffreddore.",
  senzaNotte: "La notte non arriva da nessun dispositivo. Oggi decidono le tue risposte e il carico.",
};

// Le frasi degli stop (4.4 e 4.9).
export const STOP = {
  cuore: "Fermati e chiama il medico oggi. Dolore al petto, svenimento, palpitazioni o fiato corto che non conosci vengono prima di ogni numero. Se sei in sella, fermati e chiedi aiuto. Se il dolore al petto è forte o non passa, chiama il 112.",
  malattia: "Oggi niente allenamento. Con la febbre o con i dolori in tutto il corpo il corpo deve guarire. Riparti 24 ore dopo l'ultima febbre, senza farmaci per la febbre, con qualche giorno tranquillo.",
  dolore: "Hai segnato un dolore. Oggi lascialo riposare. Se non migliora in una o due settimane, fatti vedere da un medico o da un fisioterapista.",
  infortunio: "Hai segnato un infortunio. Oggi niente bici. Se il dolore è forte o non passa in pochi giorni, fatti vedere.",
  pezzi: "Hai detto che sei a pezzi. Oggi riposo, o al massimo una passeggiata.",
};

// Non è uno stop, ma ha il suo testo (4.4).
export const CARICO_TRE_MATTINE = "Da tre mattine il carico è molto più alto del tuo solito. Oggi recupera, così il corpo lo assorbe.";

// Il pannello «Sto male», un tasto sempre visibile sotto la carta (4.4). Gli id sono quelli che il
// diario salva in stoMale.
export const STO_MALE = {
  tasto: "Sto male",
  gruppi: [
    {
      id: "cuore",
      titolo: "Cuore",
      caselle: [
        { id: "petto", testo: "Dolore, peso o oppressione al petto." },
        { id: "svenimento", testo: "Sono svenuto, o quasi." },
        { id: "palpitazioni", testo: "Il cuore batte strano, molto veloce o irregolare." },
        { id: "fiato", testo: "Fiato corto mai provato." },
        { id: "faticaNuova", testo: "Fatica nuova negli sforzi di sempre." },
        { id: "avvisoRitmo", testo: "L'orologio mi ha avvisato di un ritmo irregolare." },
      ],
    },
    {
      id: "malattia",
      titolo: "Malattia",
      caselle: [
        { id: "febbre", testo: "Febbre da 38 in su." },
        { id: "brividi", testo: "Brividi." },
        { id: "dolori", testo: "Dolori in tutto il corpo." },
        { id: "tosse", testo: "Tosse con il petto chiuso o fischi." },
        { id: "pancia", testo: "Mal di pancia o diarrea." },
      ],
    },
    {
      id: "collo",
      titolo: "Sopra il collo",
      caselle: [
        { id: "naso", testo: "Naso che cola o starnuti." },
        { id: "gola", testo: "Gola appena irritata." },
      ],
    },
  ],
  // Il giorno dopo uno stop per malattia. Con questa risposta parte il rientro (senzaFebbre nel diario).
  senzaFebbre: "Non ho più febbre da 24 ore, senza farmaci per la febbre",
  sopraIlCollo: "Se esci, al massimo un'ora facile, a ritmo da chiacchiera.",
};

// Le caselle delle cause, la riga chiusa sotto le domande (4.4). Gli id vanno nel diario in cause.
export const CAUSE = {
  titolo: "Ieri sera…",
  caselle: [
    { id: "alcol", testo: "Ho bevuto alcol, anche poco" },
    { id: "viaggio", testo: "Ho viaggiato, almeno 2 fusi o più di 6 ore" },
    { id: "cena", testo: "Cena tardi e pesante" },
    { id: "caldo", testo: "Notte calda o sauna" },
    { id: "quota", testo: "Ho dormito sopra i 1.500 m" },
    { id: "ciclo", testo: "Sono nei giorni prima del ciclo", soloSeAccesa: true },
  ],
};

// La domanda di controllo e la domanda sulla pedalata (4.4). Le risposte vanno nel diario in
// controllo («no», «si», «motivo») e in pedalata («si», «no»).
export const CONTROLLO = {
  malattia: {
    domanda: "Prima di decidere, una domanda. Se puoi, misura la temperatura. Hai febbre, brividi, dolori in tutto il corpo, mal di gola o tosse?",
    scelte: [{ id: "no", testo: "No, niente" }, { id: "si", testo: "Sì" }, { id: "motivo", testo: "C'è un motivo" }],
  },
  pedalata: {
    domanda: "Ti cambia la pedalata o peggiora pedalando?",
    scelte: [{ id: "si", testo: "Sì" }, { id: "no", testo: "No" }],
  },
};

// I giorni di guardia dopo le fatiche volute (4.6).
export const GUARDIA = {
  nomi: {
    weekend: "il weekend lungo",
    prova: "la prova con le borse",
    uscitaGrande: "l'uscita lunga",
    blocco: "il blocco di tre giorni",
    evento: "l'evento",
    viaggio: "il viaggio",
  },
  fare: {
    primo: "Oggi riposo o 30-45 minuti di recupero.",
    riposo: "Oggi ancora riposo o 30-45 minuti di recupero.",
    facile: "Oggi un giro facile.",
    evento: "Niente piano, solo giri facili se ti va.",
  },
  testo: (giorno, nome, fare) => `${giorno === 1 ? "Ieri" : `${giorno} giorni fa`} hai finito ${nome}. ${fare} Il semaforo oggi non va oltre il giallo. È stanchezza voluta.`,
  perche: (nome) => `Dopo ${nome} è normale che le notti siano un po' storte. Oggi il piano è leggero.`,
  percheDopo: (nome) => `Dopo ${nome} il corpo recupera ancora. Oggi il piano è leggero.`,
};

// Le altre frasi del semaforo.
export const MESSAGGI = {
  sonno: "Se hai sonno, oggi evita il traffico e i percorsi tecnici.",
  ultimiGiorni: "Negli ultimi giorni lo sforzo non porta niente. Dormi tanto, anche un pisolino.",
  sopraSolito: "L'HRV è sopra il tuo solito.",
  insolita: "Stanotte la lettura della variabilità del battito è insolita. Controlla i dati del tuo dispositivo.",
  notteNonArrivata: "Stanotte non è ancora arrivata. Se hai un orologio, apri la sua app per sincronizzarlo, poi premi Aggiorna.",
  dispositivo: "Hai cambiato orologio o anello? Se sì, per due settimane imparo di nuovo le tue notti.",
  gialliDiFila: "Sono tre giorni che il semaforo frena. Ho guardato la settimana.",
  rispondi: "Rispondi qui sotto, il consiglio può cambiare.",
};

// Quando mandare dal medico (4.9).
export const MEDICO = {
  subito: STOP.cuore,
  primaDiRiprendere: "Prima di riprendere ad allenarti, fatti vedere dal medico.",
  presto: "Il battito a riposo è alto da tre notti e ti senti stanco. Senti il medico, senza fretta ma presto.",
  viaggioLungo: "Prima di un viaggio così lungo, un controllo dal medico sportivo è una buona idea. Se in viaggio senti il cuore che batte strano, fermati e chiedi aiuto.",
};

// Quanto fidarsi (4.7). Una riga per parte sotto «Perché», e accanto al colore solo quando è bassa.
export const FIDUCIA = {
  titolo: "Quanto fidarti oggi",
  livelli: { alta: "Alta", media: "Media", bassa: "Bassa" },
  carico: {
    alta: "Il carico arriva dalla potenza, ed è preciso.",
    battito: "Il carico arriva dal battito. Va bene, ma è meno preciso della potenza.",
    sforzo: "Il carico arriva dallo sforzo che mi dici. Va bene, ma è meno preciso dei sensori.",
    polso: "Mi fido poco del carico, il battito al polso in bici sbaglia spesso.",
    storia: "Mi fido poco del carico, ho meno di sei settimane di giri.",
    dati: "Mi fido poco del carico, molti giri non hanno dati.",
  },
  notte: {
    alta: "Le notti sono complete e conosco il tuo normale.",
    provvisoria: "Sto ancora imparando le tue notti, quindi le conto poco.",
    nonNotturno: "Il battito arriva dalla mezz'ora più tranquilla del giorno, non dalla notte.",
    notte: "Mi fido poco della notte, stanotte i dati sono incompleti.",
    taratura: "Mi fido poco della notte, sto ancora imparando il tuo normale.",
    dispositivo: "Mi fido poco della notte, hai cambiato dispositivo da poco.",
  },
  risposte: "Le tue risposte contano per intero.",
};

// La modalità evento, in viaggio (4.5 e 7.10).
export const VIAGGIO = {
  tasto: "Sono in viaggio",
  arrivato: "Sono arrivato",
  parti: {
    domanda: "Oggi parti?",
    scelte: [{ id: "si", testo: "Sì, parto" }, { id: "no", testo: "Non ancora" }],
  },
  proposta: "Sei in viaggio? Ti chiedo le cose giuste per i giorni di fila.",
  giorno: (giorno, giorni) => (giorni ? `Giorno ${giorno} di ${giorni}` : `Giorno ${giorno}`),
  // Le tre domande del mattino in viaggio. La seconda solo se il sonno non arriva da un dispositivo.
  domande: {
    energia: { testo: "Quanta energia hai?", scelte: ["Tanta", "Normale", "Poca", "Sono a pezzi"] },
    sonno: {
      testo: "Quanto hai dormito davvero?",
      scelte: [{ id: "bene", testo: "Bene, 6 ore o più" }, { id: "poco", testo: "Poco, 5-6 ore" }, { id: "pochissimo", testo: "Pochissimo, meno di 5" }],
    },
    problemi: {
      testo: "Qualcosa non va?",
      caselle: [
        { id: "mani", testo: "Mani", scelte: [{ id: "formicolano", testo: "Formicolano o si addormentano" }, { id: "deboli", testo: "Dita deboli, o intorpidite da più di 2 giorni" }] },
        { id: "sedere", testo: "Sedere", scelte: [{ id: "fastidio", testo: "Fastidio" }, { id: "genitali", testo: "Intorpidimento ai genitali che non passa" }] },
        { id: "collo", testo: "Collo", scelte: [{ id: "male", testo: "Fa male" }, { id: "testa", testo: "La testa non sta su" }] },
        { id: "ginocchia", testo: "Ginocchia", scelte: [{ id: "fastidio", testo: "Fastidio" }, { id: "dolore", testo: "Un dolore che cambia la pedalata" }] },
        { id: "stomaco", testo: "Stomaco", scelte: [{ id: "nausea", testo: "Nausea, o non riesco a mangiare da più di 2 ore" }, { id: "vomito", testo: "Vomito, o più di 4 ore senza mangiare" }] },
        { id: "gonfiore", testo: "Gonfiore a viso o caviglie", scelte: [{ id: "piuDiIeri", testo: "Più di ieri" }, { id: "sintomi", testo: "Con mal di testa, nausea o confusione" }] },
        { id: "addormentato", testo: "Mi sono addormentato in sella o mi sono confuso" },
        { id: "niente", testo: "Niente" },
      ],
    },
  },
  esiti: {
    verde: "Oggi la tappa come previsto. I primi 30 minuti piano, poi il tuo passo. Mangia qualcosa ogni ora.",
    giallo: "Oggi una tappa più corta e più facile. Se puoi, fermati prima. Domani si rivede.",
    sonno: "Oggi prima di tutto si dorme. Accorcia la tappa e non pedalare di notte finché non torni a 6 ore.",
    collo: "Se la testa non sta su, oggi la bici si ferma.",
    gonfiore: "Fermati, niente acqua semplice a litri, mangia salato e cerca un medico. Può essere sodio basso nel sangue.",
    stomaco: "Fermati, rinfrescati e mangia poco alla volta. Riparti solo quando lo stomaco tiene.",
    mani: "Oggi riposo, e fatti vedere da un medico prima di ripartire.",
    sedere: "Oggi riposo, e fatti vedere da un medico prima di ripartire.",
  },
  // Il consiglio di una riga per le caselle che non cambiano il colore.
  consigli: {
    mani: "Cambia presa ogni 10-15 minuti, controlla guanti e manubrio.",
    sedere: "Controlla altezza e inclinazione della sella, e usa la crema.",
    collo: "Alza un po' il manubrio, se puoi, e nelle soste muovi piano il collo.",
    ginocchia: "Controlla l'altezza della sella e le tacchette, e in salita usa rapporti più agili.",
    stomaco: "Mangia poco alla volta, anche salato, e rinfrescati nelle soste.",
    gonfiore: "Bevi a sete, non a forza. Niente antinfiammatori.",
  },
  // Le righe del «Perché» in viaggio.
  sonno: (minuti) => `Stanotte hai dormito ${durataInParole(minuti)} davvero.`,
  sonnoCorto: (notti) => (notti === 1 ? "Stanotte hai dormito meno di 5 ore." : `Hai dormito meno di 5 ore per ${notti} notti di fila.`),
  sonnoSenza: "Dimmi quanto hai dormito davvero.",
  promemoria: ["Mangia ogni ora, anche senza fame.", "Bevi a sete, non a forza.", "Niente antinfiammatori in sella."],
  fine: "Ce l'hai fatta. Per una settimana niente piano, solo giri facili se ti va.",
  perche: "In viaggio questi numeri cambiano da soli. Oggi guardo come stai tu.",
  notte: "In viaggio battito e HRV sono bassi per forza. Li vedi, ma non contano.",
};

// La Freschezza (su intervals.icu si chiama Form) in parole semplici, sulle fasce di intervals.icu
// in percentuale della Fitness, più due fasce per il carico alto.
export const ZONE_FRESCHEZZA = [
  { da: 20, nome: "Molto riposato", testo: "Riposato da tanto. Va bene prima di un evento, ma se dura settimane la Fitness cala." },
  { da: 5, nome: "Fresco", testo: "Riposato e pronto. È la freschezza giusta per una giornata importante." },
  { da: -10, nome: "In equilibrio", testo: "Né fresco né stanco. Ti stai mantenendo." },
  { da: -30, nome: "Ti stai allenando", testo: "Un po' stanco, nel modo giusto. È la zona in cui si migliora." },
  { da: -50, nome: "Molto carico", testo: "Stai caricando più del solito. Va bene per pochi giorni, poi serve recuperare." },
  { da: null, nome: "Troppo carico", testo: "Molto più stanco di quanto il corpo sia abituato. Qualche giorno facile ti fa bene." },
];

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
    rosso: "Febbre, brividi, dolori in tutto il corpo, tosse con il petto chiuso, mal di pancia. Ogni sintomo di cuore, con l'invito dal medico.",
  },
];

// I quattro livelli, per la Guida.
export const GUIDA_LIVELLI = [
  { livello: "verde", titolo: "Verde, via libera.", testo: "Nessun segnale di stanchezza." },
  { livello: "giallo-leggero", titolo: "Giallo, senza esagerare.", testo: "Un segnale piccolo." },
  { livello: "giallo", titolo: "Giallo, giornata tranquilla.", testo: "Due segnali piccoli o uno che conta il doppio. E sempre nei giorni dopo un weekend lungo, una prova, un'uscita grande o un viaggio, e quando riparti dopo la febbre." },
  { livello: "rosso", titolo: "Rosso, oggi recupera.", testo: "Più segnali che vanno d'accordo, da più notti o con le tue risposte. E sempre con un dolore, un infortunio, la febbre, un sintomo di cuore o quando dici di essere a pezzi. Una notte storta da sola non dà mai rosso." },
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
    r: "Il rosso arriva solo da un sintomo, da un dolore o da più segnali che vanno d'accordo, mai da una notte storta da sola. Se proprio vuoi uscire, al massimo 45 minuti pianissimo. Con febbre, dolori in tutto il corpo o un sintomo di cuore resta fermo.",
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

// Con «Entra con intervals.icu» acceso prende il posto della domanda qui sopra con lo stesso titolo.
export const DOMANDA_ESCI_CON_INTERVALS = {
  d: "Come esco, o tolgo l'accesso?",
  r: "Premi Esci in fondo alla pagina. Se sei entrato con il pulsante «Entra con intervals.icu», Esci toglie a Come sto anche il permesso su intervals.icu, e così esci dagli altri telefoni e computer dove sei entrato con il pulsante. Se hai incollato la chiave, Esci la cancella da questo dispositivo. Per togliere l'accesso ovunque, su intervals.icu crea una chiave nuova. Quella vecchia smette subito di funzionare.",
};

export const LIMITI = [
  "Con la febbre, o con tosse e dolori in tutto il corpo, non allenarti, qualunque colore abbia il semaforo.",
  "Se in bici senti dolore al petto, il cuore che batte strano, un fiato corto mai provato o ti gira la testa, fermati e chiama un medico.",
  "Il semaforo non ti dice di partire per un viaggio se stai male, qualunque colore abbia.",
  "Alcune medicine, per esempio i betabloccanti, cambiano battito e HRV. Se le prendi, chiedi al medico come regolarti.",
  "Alcol, caldo, una cena tardi, un viaggio, la quota e, per le donne, la seconda metà del ciclo alzano il battito e abbassano l'HRV anche senza stanchezza.",
  "Ogni orologio misura l'HRV in un momento diverso della notte. Usa un solo dispositivo per la notte. Se lo cambi, servono un paio di settimane perché l'app impari il tuo nuovo normale.",
  "Il battito misurato al polso durante il giro è spesso sbagliato. Per i giri usa una fascia cardio o il ciclocomputer.",
  "Una sola notte storta non è un problema. Conta la tendenza di tre o quattro giorni.",
  "Il semaforo non sa se ti fa male un ginocchio. Diglielo con le domande del mattino.",
  "Come sto non è un medico e non fa diagnosi. Se il battito a riposo resta alto per giorni o qualcosa non ti convince, parlane con un medico.",
];
