// I testi del semaforo e della pagina Oggi, in parole semplici. Li usano js/semaforo.js e js/viste/oggi.js.
// Gli altri testi stanno nei file js/testi-*.js di ogni pagina e in js/palestra.js per le schede.
// Regole di scrittura (capitolo 7.1 della specifica). Del tu, frasi brevi, nessun carattere dei due
// punti, orari con il punto, durate in parole, niente sigle a schermo, nessuna pagella e nessuna
// promessa medica. I modelli con un valore dentro sono funzioni, così le prove li compongono
// (test/testi.test.mjs, 9.8).

import { formatoDurata } from "./formato.js?v=202611061254";

// Le durate in parole, «45 minuti», «1 ora e 20», «3 ore e mezza» (7.1). È formatoDurata di
// js/formato.js, con il nome che usano i testi del semaforo.
export function durataInParole(minuti) {
  return formatoDurata(minuti);
}

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

// La parola accanto al pallino di una tessera. daRispondere è per le domande ancora senza risposta,
// che contano sempre per intero (4.3), così il grigio non vuol dire «non conta».
export const ESITO_VOCE = {
  verde: "a posto",
  giallo: "attenzione",
  rosso: "frena",
  neutro: "non conta oggi",
  daRispondere: "da rispondere",
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
    saturazione: "È scesa insieme al battito, succede quando il battito a riposo è molto basso. Oggi non conta.",
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
    mai: "La variabilità del battito (HRV), il battito a riposo e il sonno non arrivano da nessun dispositivo. Il semaforo guarda le tue risposte e il carico.",
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
  // Dopo una malattia di più di una settimana, o con la febbre e il petto chiuso, finché non mi dici
  // che il medico ti ha detto che puoi riprendere (4.9 e regola 5.17).
  attesa: "Dopo questa malattia, prima di riprendere serve il medico. Il semaforo aspetta che tu me lo dica.",
  crescita: "La Fitness è salita in fretta. Per qualche giorno niente sforzi al massimo, e la settimana prossima non aumentare.",
  collo: "Hai segnato naso che cola o gola irritata.",
  stop: {
    cuore: "Hai segnato un sintomo di cuore.",
    cuoreRiportato: "Nei giorni scorsi hai segnato un sintomo di cuore, e non mi hai ancora detto che il medico ti ha detto che puoi riprendere.",
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
  // Le due note stanno sulla carta, sopra ogni altra riga, e la sigla si spiega qui la prima volta (7.1).
  caloAtteso: "L'HRV, la variabilità del battito, è scesa dopo l'uscita lunga di ieri. È normale e non conta.",
  // Vale per la media delle ultime 7 notti, che può essere alta anche dopo una notte bassa.
  hrvAlta: "Negli ultimi sette giorni l'HRV, la variabilità del battito, è sopra il tuo solito. Non è un premio, a volte arriva con la stanchezza o prima di un raffreddore.",
  senzaNotte: "La notte non arriva da nessun dispositivo. Oggi decidono le tue risposte e il carico.",
};

// Le frasi degli stop (4.4 e 4.9).
export const STOP = {
  cuore: "Fermati e chiama il medico oggi. Dolore al petto, svenimento, palpitazioni o fiato corto che non conosci vengono prima di ogni numero. Se sei in sella, fermati e chiedi aiuto. Se il dolore al petto è forte o non passa, chiama il 112.",
  // Dal giorno dopo un sintomo di cuore, finché la persona non dice di aver sentito il medico (regola 5.10).
  cuoreRiportato: "Oggi niente allenamento, finché il medico non ti ha visto. Se torna un dolore al petto forte o che non passa, chiama il 112.",
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
  // Dal giorno dopo un sintomo di cuore, e dopo una malattia che chiede il medico. Con questa risposta
  // (medicoSentito nel diario) il semaforo torna a leggere la giornata (4.9).
  medicoDomanda: "Hai sentito il medico?",
  medicoSentito: "Il medico mi ha detto che posso riprendere",
  sopraIlCollo: "Se esci, al massimo un'ora facile, a ritmo da chiacchiera.",
  // Il consiglio del Giallo con i soli sintomi sopra il collo, con la durata di 4.4 e non quella del
  // giro del Giallo, così nella carta c'è un massimo solo (regola 5.10).
  consiglio: "Se esci, al massimo un'ora facile, a ritmo da chiacchiera. Oppure palestra leggera. Oggi niente lunga, weekend o prove, si spostano.",
  // Il pannello sulla pagina Oggi (7.4).
  attacco: "Segna quello che senti oggi. Una casella basta, il semaforo fa il resto. Resta su questo telefono e non va su intervals.icu.",
  segnati: (n) => (n === 1 ? "Hai segnato un sintomo." : `Hai segnato ${n} sintomi.`),
  febbrePassata: "La febbre è passata?",
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
  attacco: "Se una vale, spuntala. Stanotte pesa meno e non entra nel tuo normale. Resta su questo telefono.",
  segnate: (n) => (n === 1 ? "Una casella spuntata." : `${n} caselle spuntate.`),
};

// La domanda di controllo e la domanda sulla pedalata (4.4). Le risposte vanno nel diario in
// controllo («no», «si», «motivo») e in pedalata («si», «no»).
export const CONTROLLO = {
  malattia: {
    domanda: "Prima di decidere, una domanda. Se puoi, misura la temperatura. Hai febbre, brividi, dolori in tutto il corpo, mal di gola o tosse?",
    scelte: [{ id: "no", testo: "No, niente" }, { id: "si", testo: "Sì" }, { id: "motivo", testo: "C'è un motivo" }],
    // La stessa domanda, a pezzi, per la carta che compare prima del livello.
    testo: "Se puoi, misura la temperatura. Hai febbre, brividi, dolori in tutto il corpo, mal di gola o tosse?",
  },
  pedalata: {
    domanda: "Ti cambia la pedalata o peggiora pedalando?",
    scelte: [{ id: "si", testo: "Sì" }, { id: "no", testo: "No" }],
    testo: "Ti cambia la pedalata o peggiora pedalando?",
  },
  titolo: "Prima di decidere, una domanda.",
  dopo: "Rispondo dopo",
  motivo: "Spunta qui sotto cosa è successo.",
  pedalataDove: "Questa risposta resta su questo telefono.",
};

// Le scelte della domanda che compare una volta quando le notti cambiano di colpo per tre mattine
// (4.3). La domanda è MESSAGGI.dispositivo.
export const CAMBIO_DISPOSITIVO = {
  scelte: [{ id: "si", testo: "Sì" }, { id: "no", testo: "No" }, { id: "nonso", testo: "Non lo so" }],
};

// I tetti come righe del «Perché», con il loro nome (4.2, passo 11).
export const TETTI = {
  guardia: "Dopo la fatica",
  rientro: "Dopo la malattia",
  sopraIlCollo: "Naso e gola",
  ultimiGiorni: "Prima della partenza",
  crescita: "La Fitness sale in fretta",
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
    // Con le durate del giro del Giallo, PIANO.sedute.giroGiallo in js/parametri.js.
    facile: (minimo, massimo) => `Oggi un giro facile, da ${durataInParole(minimo)} a ${durataInParole(massimo)}.`,
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
  sopraSolito: "Negli ultimi sette giorni l'HRV è sopra il tuo solito.",
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
  // Il consiglio finché si aspetta il medico, che non propone mai un giro.
  attesa: "Oggi riposo, o una camminata tranquilla, finché il medico non ti ha visto.",
  presto: "Il battito a riposo è alto da tre notti e ti senti stanco. Senti il medico, senza fretta ma presto.",
  viaggioLungo: "Prima di un viaggio così lungo, un controllo dal medico sportivo è una buona idea. Se in viaggio senti il cuore che batte strano, fermati e chiedi aiuto.",
};

// Quanto fidarsi (4.7). Una riga per parte sotto «Perché», e accanto al colore solo quando è bassa.
export const FIDUCIA = {
  titolo: "Quanto fidarti oggi",
  livelli: { alta: "Alta", media: "Media", bassa: "Bassa" },
  carico: {
    alta: "Il carico arriva dalla potenza, ed è preciso.",
    potenza: "Il carico arriva dalla potenza. È preciso se su intervals.icu la tua soglia è giusta.",
    battito: "Il carico arriva dal battito. Va bene, ma è meno preciso della potenza.",
    sensori: "Il carico arriva dai dati dei tuoi giri. Va bene, ma è meno preciso della potenza misurata.",
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
  // La modalità evento resta accesa G giorni più uno (4.5). Il giorno in più non è un giorno del viaggio.
  giorno: (giorno, giorni) => {
    if (giorni && giorno > giorni) return "Il giorno dopo il viaggio";
    return giorni ? `Giorno ${giorno} di ${giorni}` : `Giorno ${giorno}`;
  },
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
  // Le parti della pagina Oggi in viaggio (7.10).
  titoloDomande: "Come stai stamattina?",
  attaccoDomande: "Tre domande per i giorni di fila. Una casella apre al massimo una scelta in più.",
  attaccoDomandeCorto: "Due domande per i giorni di fila. Una casella apre al massimo una scelta in più.",
  // Una casella spuntata senza la scelta sotto non si salva, perché la scelta cambia il colore (4.5).
  sceltaMancante: (casella) => `Sotto «${casella}» scegli quale delle due.`,
  risposte: "Le tue risposte di stamattina",
  nienteSegnato: "Niente",
  propostaSi: "Sì, sono in viaggio",
  propostaNo: "No",
  // Il giorno in cui hai premuto «Sono in viaggio», per tornare indietro se l'hai premuto per sbaglio.
  nonInViaggio: "Non sono in viaggio",
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

// --- La pagina Oggi (7.4) ---

export const OGGI = {
  occhiello: "Il semaforo di oggi",
  settimane: (n) => `Mancano ${n} settimane alla partenza`,
  giorni: (n) => (n === 1 ? "Manca un giorno alla partenza" : `Mancano ${n} giorni alla partenza`),
  siParte: "Oggi si parte",
  salvato: "Salvato. Il semaforo è aggiornato con le tue risposte.",
  perche: "Perché",
  comeNasce: "Come nasce il semaforo",
};

// Le tre domande del mattino, il modulo (7.4). Le domande e le scelte sono in DOMANDE_MATTINO.
export const MATTINO = {
  titolo: "Come ti senti stamattina?",
  attacco: "Tre risposte, dieci secondi. Contano nel semaforo, perché il tuo corpo lo conosci anche tu.",
  fatte: "Le tue risposte di stamattina",
  cambia: "Cambia le risposte",
  salva: "Salva le risposte",
  demo: "Con i dati di esempio le risposte restano solo in questa pagina.",
  almenoUna: "Scegli almeno una risposta.",
  salvo: "Salvo…",
  errore: "Non sono riuscito a salvare. Riprova tra poco.",
  nessuna: "—",
};
