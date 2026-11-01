// I testi della pagina Numeri (7.11), con le sei tessere e le spiegazioni dei numeri, che usa anche la
// Guida. Stesse regole di scrittura di js/testi.js (7.1), e la prova 9.8 li legge tutti.

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

// I sei numeri del giorno, chiusi in fondo alla pagina Oggi finché non arriva la pagina Numeri (7.2).
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

// La pagina Numeri segnaposto, finché 7.11 non c'è. Raccoglie Andamento e Uscite (7.2).
export const NUMERI_PAGINA = {
  titolo: "Numeri",
  sottotitolo: "Per chi ama i numeri",
  attacco: "L'andamento delle notti e degli allenamenti, e tutte le uscite.",
};
