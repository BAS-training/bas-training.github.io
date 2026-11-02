// I testi della pagina Numeri (7.11), con le sei tessere e le spiegazioni dei numeri, che usa anche la
// Guida. Stesse regole di scrittura di js/testi.js (7.1), e la prova 9.8 li legge tutti. Qui, e solo
// qui e nella Guida, possono stare «specchio», «scarico finale» con i numeri e i kJ, perché è la
// pagina di chi ama i numeri (le costanti con NUMERI nel nome).

import { DOMANDE } from "./parametri.js?v=202611021705";

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

// I sei numeri del giorno, nella pagina Numeri (7.2). Fino al rilascio 4 li usava anche la pagina Oggi.
export const NUMERI_OGGI = {
  titolo: "Per chi ama i numeri",
  attacco: "I primi tre vengono dalla notte e dicono come hai recuperato. Gli altri tre vengono dagli allenamenti e dicono quanto hai caricato. Apri «Cosa vuol dire» per capire ogni numero.",
  attaccoSenzaNotte: "Vengono dagli allenamenti e dicono quanto hai caricato. Apri «Cosa vuol dire» per capire ogni numero.",
  hrv: "HRV della notte",
  normaleHrv: (basso, alto) => `Il tuo normale ${basso}–${alto}`,
  impara: (notti, servono) => `Sto imparando il tuo normale, ${notti} notti su ${servono}`,
  hrvMai: "Non arriva dal tuo dispositivo",
  fc: "Battito a riposo",
  normaleFc: (solito) => `Il tuo normale ${solito}`,
  sonno: "Sonno",
  punteggio: (p) => `Punteggio ${p}`,
  mediaSettimana: (durata) => `media della settimana ${durata}`,
  freschezza: "Freschezza",
  zona: (nome, fitness, fatica) => `${nome}. Fitness ${fitness}, Fatica ${fatica}`,
  pochiGiri: "Servono un po' di giri registrati",
  fitness: "Fitness",
  differenza: (punti) => `${punti} nelle ultime 4 settimane`,
  carico: "Carico recente",
  volte: "volte il solito",
  finoA: (rapporto) => `Fino a ${rapporto} volte va bene`,
  ultima: "L'ultima uscita",
  tutte: "Tutte le uscite",
  punti: (n) => `${n} punti`,
  km: (n) => `${n} km`,
  salita: (n) => `${n} m di salita`,
  battiti: "battiti",
};

// La pagina Numeri (7.11). Raccoglie i sei numeri di oggi, le domande ancora aperte, la Fitness di
// Come sto, i numeri della preparazione, Andamento e Uscite (7.2).
export const NUMERI_PAGINA = {
  titolo: "Numeri",
  sottotitolo: "Per chi ama i numeri",
  attacco: "I numeri dietro il semaforo e la preparazione, le tue uscite e le domande ancora aperte. Nessuno di questi numeri ti dà un voto.",
  oggi: "I numeri di oggi",
  ieriSera: "Fitness, Fatica, Freschezza e carico recente sono quelli di ieri sera, come li vede il semaforo stamattina.",
};

// Le domande ancora aperte (7.11 e 6.4), con le scelte a un tocco di 6.4. Le stesse domande stanno
// nella scheda di ogni uscita.
const SFORZI = [
  { valore: DOMANDE.sforzo.facilissima, testo: "Facilissima" },
  { valore: DOMANDE.sforzo.facile, testo: "Facile" },
  { valore: DOMANDE.sforzo.media, testo: "Media" },
  { valore: DOMANDE.sforzo.dura, testo: "Dura" },
  { valore: DOMANDE.sforzo.durissima, testo: "Durissima" },
];

export const NUMERI_DOMANDE = {
  titolo: "Le domande ancora aperte",
  attacco: "Ogni risposta rende più giuste le ore in sella, il piano e il verdetto. Se non ti ricordi, «Non lo so» chiude la domanda.",
  nessuna: "Nessuna domanda aperta. Grazie delle risposte.",
  suOggi: "Le domande di stamattina sul semaforo stanno nella pagina Oggi.",
  vaiOggi: "Vai a Oggi",
  sforzo: { domanda: "Com'è stata?", scelte: SFORZI, aMemoria: "a memoria" },
  borse: {
    domanda: "Avevi le borse?",
    scelte: [{ valore: "no", testo: "No" }, { valore: "parte", testo: "Sì, in parte" }, { valore: "evento", testo: "Sì, come all'evento" }],
  },
  kg: { domanda: "Quanto pesavano, più o meno?", scelta: (kg) => `${kg} kg` },
  notte: { domanda: "Hai dormito fuori?", scelte: [{ valore: "si", testo: "Sì" }, { valore: "no", testo: "No" }] },
  cosEra: {
    domanda: "Cos'era?",
    scelte: [{ valore: "bici", testo: "Bici" }, { valore: "palestra", testo: "Palestra" }, { valore: "altro", testo: "Altro" }],
  },
  durata: { domanda: "Quanto è durata?", circa: (durata) => `circa ${durata}` },
  sterrato: { domanda: "Era su sterrato?", scelte: [{ valore: "si", testo: "Sì, quasi tutto" }, { valore: "no", testo: "No, su strada" }] },
  palestra: {
    domanda: "Cosa hai allenato?",
    scelte: [{ valore: "corpo", testo: "Gambe e tutto il corpo" }, { valore: "gambe", testo: "Solo le gambe" }, { valore: "alto", testo: "Solo parte alta e tronco" }],
  },
  prova: {
    domanda: "Com'è andata la prova con le borse?",
    scelte: [{ valore: "bene", testo: "Tutto bene" }, { valore: "sistemare", testo: "Qualcosa da sistemare" }],
    aree: {
      domanda: "Dove?",
      scelte: [
        { valore: "mani", testo: "Mani" }, { valore: "sedere", testo: "Sedere" }, { valore: "collo", testo: "Collo" },
        { valore: "ginocchia", testo: "Ginocchia" }, { valore: "piedi", testo: "Piedi" },
      ],
    },
  },
  seduta: {
    scelte: [{ valore: "si", testo: "Sì, così" }, { valore: "diverso", testo: "Sì, ma diverso" }, { valore: "no", testo: "No" }],
  },
  // L'intestazione di ogni domanda, con il giorno e quello che si sa dell'uscita.
  uscita: (giorno, cosa) => `${giorno}, ${cosa}`,
  stub: (giorno, ora) => (ora
    ? `Questa uscita di ${giorno} alle ${ora} arriva da Strava, e intervals.icu non me ne passa i dettagli. Me li dici tu?`
    : `Questa uscita di ${giorno} arriva da Strava, e intervals.icu non me ne passa i dettagli. Me li dici tu?`),
  sedutaPiano: (giorno, durata) => `${giorno} il piano diceva un giro di ${durata}. L'hai fatto?`,
  sedutaSenzaDurata: (giorno) => `${giorno} il piano diceva un giro. L'hai fatto?`,
  ieri: "Ieri",
  salva: "Salva",
  nonLoSo: "Non lo so",
  scegli: "Scegli almeno una risposta, oppure premi «Non lo so».",
  aree: "Dimmi dove, oppure scegli «Tutto bene».",
};

// La scheda di ogni uscita, nella lista delle uscite (7.11 e 6.3).
export const NUMERI_SCHEDA = {
  apri: "Dimmi di più",
  numeri: "I numeri",
  punti: (n) => `${n} punti di carico`,
  battito: (n) => `battito medio ${n}`,
  sforzo: (n) => `sforzo ${n} su 10`,
  potenza: "con la potenza",
  doppione: "Lo stesso giro è arrivato anche da un altro dispositivo, e lo conto una volta sola.",
  incerti: "Numeri incerti. Il carico dello sforzo e quello dei sensori non tornano.",
  racconta: "Racconta l'uscita",
  salva: "Salva",
  salvato: "Salvato.",
  scegli: "Cambia almeno una risposta, poi salva.",
  nienteDaChiedere: "Di questa uscita so già tutto quello che serve.",
};

// I segni accanto alle uscite (7.11). La durata stimata ha davanti «circa», quella detta da te ha
// accanto «lo hai detto tu», e le altre etichette di qualità non si scrivono.
export const NUMERI_USCITE = {
  titolo: "Le tue uscite",
  attacco: "Le ore in bici di ogni settimana e tutte le uscite degli ultimi due mesi. Tocca un'uscita per vedere i suoi numeri e dirmi quello che manca.",
  settimane: {
    titolo: "Ore in bici per settimana",
    testo: "Ogni colonna è una settimana, da lunedì a domenica. L'ultima è quella in corso. Contano solo le ore in bici, l'e-bike a metà.",
    descrizione: "Ore in bici per settimana",
    ore: "Ore",
    dal: (giorno) => `dal ${giorno}`,
    vuoto: "Nelle ultime 12 settimane non ci sono uscite in bici con la durata.",
  },
  ultimi: "Gli ultimi due mesi",
  vuoto: "Negli ultimi due mesi non ci sono uscite. Appena registri un giro compare qui.",
  daStrava: "da Strava, mi mancano i dettagli",
  conBorse: "con le borse",
  inParte: "con un po' di borse",
  sforzoTuo: "sforzo detto da te",
  aMano: "aggiunta a mano",
  nelPasso: "nel tuo passo",
  fuoriPasso: "lasciata fuori dal passo",
  circa: (durata) => `circa ${durata}`,
  dettaDaTe: (durata) => `${durata}, lo hai detto tu`,
  km: (n) => `${n} km`,
  salita: (n) => `${n} m`,
};

// La Fitness di Come sto (6.5) e i numeri che accompagnano il verdetto senza deciderlo (2.6).
export const NUMERI_AVVENTURA = {
  fitnessTitolo: "La Fitness di Come sto",
  fitnessTesto: "La calcolo come intervals.icu, ma conto anche i giri senza sensori e la palestra, con il carico che stimo dallo sforzo. Il semaforo usa ancora quella di intervals.icu.",
  fitnessComeSto: "Come sto",
  fitnessIntervals: "Su intervals.icu",
  fitnessUguale: "Le due Fitness vanno d'accordo.",
  titolo: "Verso la tua avventura",
  attacco: "Questi numeri accompagnano il verdetto di Pronto?, ma non lo decidono. Il verdetto viene dalle ore, dall'uscita lunga, dalle prove con le borse e dalla continuità.",
  senzaObiettivo: "Scegli un'avventura e qui trovi i numeri che la accompagnano.",
  scegli: "Scegli l'avventura",
  specchio: "Lo specchio della Fitness",
  lavoro: "Una giornata della tua avventura",
  lavoroTesto: (kj, punti) => `Ogni giorno della tua avventura vale circa ${kj} kJ di lavoro sui pedali e ${punti} punti di carico.`,
  lavoroCosa: "Servono a confrontare l'avventura con i tuoi giri, non a decidere. I kJ sono il lavoro fatto sui pedali, i punti quelli che intervals.icu dà a un'uscita.",
  lunghe: "Le uscite lunghe",
  palestra: "La palestra",
  stomaco: "Lo stomaco",
  forma: "Fitness meno Fatica, alla partenza",
  formaTesto: (oggi, da, a, fino) => `Ieri sera Fitness meno Fatica faceva ${oggi}. Alla partenza di solito sta fra ${da} e ${a}, in salita negli ultimi giorni. Fino a ${fino} va bene lo stesso, se hai fatto lo scarico finale.`,
  passo: "Il tuo passo",
  passoGiri: (n, giorni) => `Per le tue ore in sella uso ${n === 1 ? "1 giro" : `${n} giri`} degli ultimi ${giorni} giorni. Nella lista delle uscite li trovi segnati «nel tuo passo».`,
  passoFuori: (n) => (n === 1
    ? "Un giro l'ho lasciato fuori, perché le sue ore non tornano con i km e il dislivello. Di solito vuol dire soste lunghe, vento o un giro in gruppo."
    : `${n} giri li ho lasciati fuori, perché le loro ore non tornano con i km e il dislivello. Di solito vuol dire soste lunghe, vento o un giro in gruppo.`),
  passoNo: "Per ora le ore in sella non vengono dai tuoi giri, perché quelli adatti sono ancora pochi. Bastano 3 giri lunghi registrati, senza borse.",
};

// I testi di Andamento, dentro Numeri (7.2).
export const NUMERI_ANDAMENTO = {
  titolo: "Come stai cambiando",
  attacco: "I numeri giorno per giorno. Tocca un grafico per leggere i valori di un giorno, oppure apri «Vedi i numeri» sotto ogni grafico.",
  periodo: "Periodo dei grafici",
  intervalli: [{ giorni: 30, nome: "30 giorni" }, { giorni: 90, nome: "3 mesi" }, { giorni: 180, nome: "6 mesi" }],
  allenamento: "L'allenamento",
  finoAIeri: "Fitness, Fatica e Freschezza arrivano fino a ieri sera, come il semaforo.",
  fitness: {
    titolo: "Quanto ti stai allenando",
    testo: "La linea blu è la Fitness, la media del lavoro delle ultime sei settimane. Quella arancione è la Fatica degli ultimi giorni. Quando la Fatica sta sopra per un po', la Fitness sale.",
    descrizione: "Fitness e Fatica",
    vuoto: "Qui compariranno Fitness e Fatica dopo i primi giri registrati.",
  },
  dueFitness: {
    titolo: "La Fitness di Come sto e quella di intervals.icu",
    testo: "La linea blu è la Fitness di Come sto, quella arancione la Fitness di intervals.icu. Si separano quando ci sono giri senza sensori o la palestra.",
    descrizione: "La Fitness di Come sto e quella di intervals.icu",
    comeSto: "Come sto",
    intervals: "intervals.icu",
    vuoto: "Qui compare la Fitness di Come sto dopo i primi giri registrati.",
  },
  freschezza: {
    titolo: "Fresco o stanco",
    testo: "La Freschezza in percentuale della tua Fitness. Si migliora nella fascia «Ti stai allenando», si arriva agli eventi nella fascia «Fresco». Nella fascia «Molto carico» e in «Troppo carico» stai caricando più di quanto il corpo sia abituato.",
    descrizione: "Freschezza in percentuale della Fitness",
    vuoto: "Qui compare la Freschezza quando la Fitness supera 10.",
  },
  lavoro: {
    titolo: "Il lavoro di ogni giorno",
    testo: "I punti di ogni giorno, oggi compreso. Un'ora di giro tranquillo vale circa 40-50 punti.",
    descrizione: "Carico di ogni giorno in punti",
    punti: "Punti",
    vuoto: "Nessun allenamento registrato in questo periodo.",
  },
  notti: "Le notti",
  nottiMai: "La variabilità del battito (HRV), il battito a riposo e il sonno non arrivano da nessun dispositivo. Se colleghi a intervals.icu un orologio o un anello che li misura, qui vedi anche le tue notti.",
  hrv: {
    titolo: "HRV, la variabilità del battito",
    testo: "La fascia azzurra è il tuo normale, ricalcolato ogni giorno con le notti precedenti. Una notte sotto capita. Più notti di fila sotto vogliono dire che il recupero non è finito.",
    descrizione: "HRV della notte con il tuo normale",
    nome: "HRV",
    vuoto: "Il tuo dispositivo non manda l'HRV a intervals.icu.",
  },
  fc: {
    titolo: "Battito a riposo",
    testo: "La fascia è il tuo normale, almeno 3 battiti sopra e sotto, di più se le tue notti cambiano tanto da una all'altra. Sopra la fascia il semaforo comincia a frenare.",
    descrizione: "Battito a riposo con il tuo normale",
    nome: "Battito",
    battiti: (n) => `${n} battiti`,
    vuoto: "Il battito a riposo non arriva dal tuo dispositivo.",
  },
  sonno: {
    titolo: "Ore di sonno",
    testo: "La riga segna le 6 ore. Sotto quella riga la notte è corta e la fatica si sente di più.",
    descrizione: "Ore di sonno per notte",
    nome: "Sonno",
    riga: "6 ore",
    vuoto: "Il sonno non arriva dal tuo dispositivo.",
  },
  normale: "Il tuo normale",
  fitnessNome: "Fitness",
  faticaNome: "Fatica",
  freschezzaNome: "Freschezza",
};
