// I testi dello strato dei dati, del carico e delle scritture (capitolo 6 della specifica).
// Valgono le regole di scrittura del capitolo 7.1. Del tu, frasi brevi, nessun carattere dei due
// punti, niente sigle, nessuna pagella e nessuna promessa medica. Seguono le stesse regole anche i
// testi che finiscono su intervals.icu, come i nomi delle attività a mano.

export const TESTI_DATI = Object.freeze({
  // 6.4, una volta, quando più di metà delle attività degli ultimi 60 giorni arriva da Strava.
  soloStrava: "I tuoi giri arrivano da Strava, e da lì intervals.icu non mi passa quanto durano. Basta rispondere alle carte dopo i giri che contano. Se hai un ciclocomputer o un orologio, collegarlo direttamente a intervals.icu ti risparmia anche quelle.",
  // La stessa riga senza il dispositivo, per chi registra solo con il telefono.
  soloStravaTelefono: "I tuoi giri arrivano da Strava, e da lì intervals.icu non mi passa quanto durano. Basta rispondere alle carte dopo i giri che contano.",
  // 6.3, una volta, dopo 14 giorni senza notti quando prima c'erano.
  notteGarmin: "Garmin per ora non manda più le notti a intervals.icu. Il semaforo guarda le tue risposte e il carico.",
  // 6.5, solo in «Per chi ama i numeri».
  fitnessPiuBassaSuIntervals: "Su intervals.icu la Fitness è più bassa, perché qui contano anche i giri senza sensori e la palestra.",
  fitnessPiuAltaSuIntervals: "Su intervals.icu la Fitness è più alta, perché qui lo stesso giro registrato da due dispositivi conta una volta sola.",
  // 6.5, il controllo incrociato, nella scheda dell'uscita.
  numeriIncerti: "Numeri incerti. Controlla la soglia su intervals.icu.",
  sogliaBassa: "La tua soglia di potenza su intervals.icu è probabilmente troppo bassa.",
  // Testi che Come sto scrive su intervals.icu.
  caricoStimato: "Carico stimato da Come sto con lo sforzo.",
  nomeGiro: "Giro aggiunto con Come sto",
  nomeStrava: "Giro da Strava, descritto con Come sto",
  // Le due scelte facoltative di Impostazioni (6.3 e 7.12), spente di default.
  sceltaStrava: "Scrivi su intervals.icu i giri da Strava che mi descrivi, quando il carico del giorno è zero",
  aiutoSceltaStrava: "Così Fitness e Fatica di intervals.icu tornano giuste e le tue risposte restano anche cambiando telefono. Su intervals.icu vedrai quel giro due volte, una da Strava e una da Come sto.",
  sceltaCarico: "Scrivi su intervals.icu il carico dei giri senza sensori",
  aiutoSceltaCarico: "Lo scrivo solo sui giri senza potenza e senza battito, quando su intervals.icu il carico è vuoto. Lo calcolo dallo sforzo che mi dici, e nella descrizione del giro trovi scritto da dove viene.",
});
