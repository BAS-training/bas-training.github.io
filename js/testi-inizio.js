// I testi del primo avvio (7.3), per js/viste/inizio.js. Stesse regole di scrittura di js/testi.js (7.1),
// e la prova 9.8 li legge tutti.

// La schermata «Prima di cominciare», da 40 anni, alla fine del primo avvio (regola 5.17). Compare già
// dai 40 anni, quindi «40 anni o più». Si salva solo la data in cui è comparsa, nessuna risposta.
export const PRIMA_DI_COMINCIARE = {
  titolo: "Prima di cominciare",
  testo: "Hai 40 anni o più. Se hai fattori di rischio per il cuore, come fumo, pressione alta, colesterolo alto, diabete o familiari con malattie di cuore da giovani, o se ricominci adesso con sforzi intensi, parlane prima con il medico. Una visita medico-sportiva con prova da sforzo è il modo giusto per partire tranquillo. Se in bici senti dolore al petto, palpitazioni strane, fiato corto che non conosci o ti gira la testa, fermati e chiedi aiuto.",
  tasto: "Ho capito",
};

// La pagina segnaposto, finché il primo avvio di 7.3 non c'è.
export const INIZIO = {
  occhiello: "Come sto",
  titolo: "La tua prossima avventura",
  attacco: "Qui scegli cosa prepari, in quanti giorni e quando parti. Intanto il semaforo del mattino funziona già.",
  invito: (evento, giorni) => (giorni ? `Arrivi dal link degli iscritti di ${evento}, in ${giorni} giorni.` : `Arrivi dal link degli iscritti di ${evento}.`),
  soloSemaforo: "Solo il semaforo del mattino",
  oggi: "Vai a Oggi",
};
