// I testi della regia della pagina, cioè consenso, Esci, gli avvisi della memoria e la schermata di
// un altro atleta sullo stesso telefono. Li usano js/app.js, js/viste/pagine.js e js/viste/accesso.js.
// Stesse regole di scrittura di js/testi.js (7.1), e la prova 9.8 li legge tutti.

// Una volta per apertura, quando la memoria del browser manca o è piena (6.6). Le risposte restano
// nella pagina e l'app va avanti lo stesso.
export const AVVISI = {
  soloPagina: "Questo browser non mi lascia salvare le tue risposte sul telefono. Restano finché la pagina è aperta.",
};

// C0-1.0, il testo del rilascio 1. È quello di 6.8 senza sforzo, borse e palestra, che arrivano con
// il rilascio 2 e una versione nuova. Cambiando il testo cambia la versione, e chi è già dentro lo
// rivede una volta.
export const CONSENSO = {
  versione: "C0-1.0",
  titolo: "Prima di entrare",
  intro: "Noi non riceviamo i tuoi numeri e le tue risposte. Restano su questo dispositivo e nel tuo account intervals.icu.",
  informativa: "Leggi l'informativa",
  maggiorenne: "Ho almeno 18 anni.",
  testo: "Acconsento che Come sto usi su questo dispositivo i miei dati sulla salute presi da intervals.icu. Sono HRV (variabilità del battito), battito a riposo, sonno, acciacchi e allenamenti, e servono solo a darmi il semaforo e il piano. Acconsento anche che tenga su questo dispositivo le risposte che do qui, compresi i sintomi del pannello Sto male, e che scriva nel mio account intervals.icu le risposte del mattino. AdventureLab non riceve questi dati. Posso ritirare il consenso quando voglio con Esci.",
  servono: "Per entrare servono tutte e due le spunte.",
  serve: "Per continuare serve la spunta.",
  primaVolta: "Da questa versione Come sto tiene su questo dispositivo anche le risposte di Sto male, e per questo ti chiede il consenso. Bastano due spunte, una volta.",
  nuovo: "Il testo del consenso è cambiato. Leggilo e, se sei d'accordo, spunta la casella. Finché non rispondi non leggo i tuoi dati.",
  continua: "Continua",
  esci: "Esci",
  ricordaChiave: "Se la spunti, la chiave resta su questo dispositivo finché premi Esci. Non spuntarla su un telefono o un computer che usano anche altri.",
  ricordaAccesso: "Se la spunti, l'accesso resta su questo dispositivo finché premi Esci. Non spuntarla su un telefono o un computer che usano anche altri.",
};

// Esci toglie il modo di entrare, il consenso, la copia dei dati presi da intervals.icu e le scritture
// ancora da mandare, e dice cosa resta, con il tasto per cancellare anche quello (6.6).
export const ESCI = {
  titolo: "Vuoi uscire?",
  chiave: "Con Esci togli da questo dispositivo la chiave, il consenso e la copia dei dati presi da intervals.icu. Per rientrare dovrai incollare di nuovo la chiave.",
  chiaveOppure: "Con Esci togli da questo dispositivo la chiave, il consenso e la copia dei dati presi da intervals.icu. Per rientrare premi «Entra con intervals.icu», oppure incolla di nuovo la chiave.",
  accesso: "Con Esci togli da questo dispositivo l'accesso, il consenso e la copia dei dati presi da intervals.icu. Come sto perde il permesso su intervals.icu, e uscirai anche dagli altri telefoni e computer dove sei entrato con intervals.icu. Per rientrare premi di nuovo «Entra con intervals.icu».",
  accessoSenzaRete: "Con Esci togli da questo dispositivo l'accesso, il consenso e la copia dei dati presi da intervals.icu. Senza connessione esci solo da questo dispositivo, e Come sto tiene il permesso su intervals.icu. Lo puoi togliere tu dalle impostazioni di intervals.icu.",
  restano: "Restano qui le tue risposte, compresi i sintomi di Sto male, e le tue scelte, cioè profilo, avventura e piano, così le ritrovi quando rientri. Se il dispositivo lo usano anche altri, scegli Esci e cancella tutto.",
  intervals: "Quello che Come sto ha scritto nel tuo intervals.icu resta lì.",
  esci: "Esci",
  cancella: "Esci e cancella tutto da questo dispositivo",
  resta: "Resta dentro",
  revocaFallita: "Sei uscito, ma non sono riuscito a togliere il permesso a Come sto su intervals.icu. Lo puoi togliere tu dalle impostazioni di intervals.icu.",
  cancellaTitolo: "Vuoi cancellare tutto?",
  cancellaDomanda: "Tolgo da questo dispositivo tutto quello che Come sto ci tiene, cioè risposte, sintomi di Sto male, scelte e il modo di entrare. Dopo non si può più recuperare.",
  cancellaSi: "Cancella tutto",
  cancellaNo: "Lascia com'è",
  cancellato: "Fatto. Su questo dispositivo Come sto non tiene più niente.",
  account: "Esci anche dal tuo account di Come sto. Quello che è salvato online resta, e lo ritrovi rientrando con la tua email.",
  cancellaOnline: "Quello che è salvato online resta. Per toglierlo, rientra con la tua email e scegli «Cancella il mio account» in Impostazioni.",
};

// L'account di Come sto e il salvataggio online (js/nuvola.js). Dice solo quello che succede davvero, e
// se la lista dei dati cambia va cambiata anche qui, nella Privacy e nel database.
export const ACCOUNT = {
  titolo: "Il tuo account",
  titoloCollega: "Salva le tue scelte con la tua email",
  attacco: "È facoltativo. Entri con un codice che ti arriva per email, senza password. Così avventura, giorni e bici ti seguono su ogni telefono, anche se cambi telefono o il browser cancella la sua memoria.",
  cosa: "Salviamo solo la tua email, l'avventura, i giorni per la bici e poche impostazioni su bici, borse e palestra, in un database a Francoforte. Mai numeri, semaforo, sintomi, risposte o la chiave di intervals.icu.",
  privacy: "Come trattiamo i tuoi dati",
  email: "La tua email",
  emailSegnaposto: "nome@esempio.it",
  manda: "Mandami il codice",
  mando: "Ti mando il codice…",
  codice: "Il codice che hai ricevuto",
  arrivato: (email) => `Ti ho mandato un codice a ${email}. Guarda anche nella posta indesiderata. Vale 10 minuti.`,
  entra: "Entra",
  controllo: "Controllo il codice…",
  altroCodice: "Mandami un altro codice",
  altroMandato: "Ti ho mandato un altro codice.",
  cambiaEmail: "Ho sbagliato email",
  dentro: (email) => `Sei entrato come ${email}.`,
  salvataggio: {
    ok: "Avventura, giorni e bici si salvano anche online, da soli.",
    errore: "Adesso non riesco a salvare online. Sul telefono è tutto a posto, e riprovo da solo.",
  },
  esci: "Esci dall'account",
  esciAiuto: "Esci da questo dispositivo. Quello che è salvato online resta, e lo ritrovi rientrando con la tua email.",
  cancella: "Cancella il mio account",
  cancellaAiuto: "Togli dal database la tua email e tutto quello che c'è salvato. Quello che sta su questo telefono e su intervals.icu resta dov'è.",
  cancellaTitolo: "Vuoi cancellare il tuo account?",
  cancellaDomanda: "Tolgo dal database la tua email, l'avventura, i giorni e le impostazioni. Dopo non si può più recuperare. Quello che sta su questo telefono e su intervals.icu resta.",
  cancellaSi: "Cancella l'account",
  cancellaNo: "Lascia com'è",
  cancellato: "Fatto. Il tuo account e quello che c'era salvato online non ci sono più.",
  cancellaFallita: "Non sono riuscito a cancellare l'account. Controlla la connessione e riprova.",
  ripreso: "Bentornato. Ho ripreso avventura, giorni e bici. Età, peso, aritmia e ciclo non si salvano online, controllali in Impostazioni.",
  novita: "Novità. Ora puoi salvare avventura, giorni e bici con la tua email, così non riparti da capo se cambi telefono. Lo trovi in Impostazioni.",
  scaduta: "Il tuo accesso con l'email è scaduto. Rientra da Impostazioni, sul telefono non si è perso niente.",
  altro: {
    titolo: "Su questo telefono ci sono i dati di un altro account",
    testo: "Sei entrato con un'email diversa da quella dei dati che stanno qui. Finché non scegli non salvo niente online.",
    cancella: "Cancella quei dati e continua",
    esci: "Esci dall'account",
  },
  errori: {
    rete: "Non riesco a collegarmi. Controlla la connessione e riprova.",
    servizio: "Il servizio adesso non risponde. Riprova fra poco.",
    email: "Questa email non sembra giusta. Controllala e riprova.",
    posta: "Adesso non riesco a mandare il codice. Riprova fra poco. Intanto puoi usare l'app anche senza account.",
    limite: "Troppi tentativi ravvicinati. Aspetta un minuto e riprova.",
    codice: "Questo codice non vale o è scaduto. Controllalo, oppure fatti mandare un altro codice.",
    sessione: "Il tuo accesso è scaduto. Entra di nuovo con la tua email.",
  },
};

// Chi entra con un account diverso da quello dei dati che stanno sul telefono (R21). Le scritture
// dell'altra persona non partono mai con l'account di chi è entrato.
export const ATLETA_DIVERSO = {
  occhiello: "Come sto",
  titolo: "Su questo telefono ci sono i dati di un'altra persona",
  testo: "Sei entrato con un account di intervals.icu diverso da quello delle risposte e delle scelte che stanno qui. Finché non scegli non le mostro e non le uso.",
  cancellaTesto: "Se sono di qualcun altro, cancellale. Le sue risposte su intervals.icu restano nel suo account.",
  cancella: "Cancella i suoi dati e continua",
  esciTesto: "Se il telefono è di un'altra persona, esci. I suoi dati restano com'erano.",
  esci: "Esci",
};

// Il promemoria della copia di sicurezza e quello per iPhone, una volta sola (6.6).
export const PROMEMORIA = {
  copia: "Alcune tue risposte stanno solo su questo telefono. Salva una copia, così le ritrovi se cambi telefono.",
  copiaTasto: "Salva una copia",
  iphone: "Aggiungi Come sto alla schermata Home. Così il telefono non cancella le tue risposte se per qualche giorno non apri l'app.",
  chiudi: "Ho capito",
};
