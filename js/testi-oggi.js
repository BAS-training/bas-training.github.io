// I testi nuovi della pagina Oggi (7.4, 7.5, 7.9 e 7.10), per js/viste/oggi.js. Quelli del semaforo e
// del rilascio 1 restano in js/testi.js. Stesse regole di scrittura (7.1), e la prova 9.8 li legge tutti.

import { dataLunga, formatoDurata, numero } from "./formato.js?v=202611022140";

const GIORNO_MS = 86400000;
const DATA = /^\d{4}-\d{2}-\d{2}/;
const dataValida = (v) => typeof v === "string" && DATA.test(v);

function utc(iso) {
  const [a, m, g] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}

// Il saluto in cima alla pagina, con l'ora del telefono.
export function saluto(ora, nome = null) {
  const parola = ora < 12 ? "Buongiorno" : ora < 18 ? "Buon pomeriggio" : "Buonasera";
  return typeof nome === "string" && nome ? `${parola}, ${nome}` : parola;
}

// --- La carta di oggi (7.4) ---

// Il nome degli eventi con la preposizione, per il conto alla partenza dell'occhiello. Gli eventi che
// non sono qui, e le avventure proprie, contano «alla partenza».
export const AL_EVENTO = {
  tt: "al Tuscany Trail",
  tg: "al Trentino Gravel",
  nc4k: "alla NorthCape4000",
  ffp: "alla Final Frontier Patagonia",
};

// «Mancano 9 settimane al Tuscany Trail». Da due settimane in su il conto si dice in settimane.
export function contoPartenza(giorni, alEvento = null) {
  if (!Number.isInteger(giorni) || giorni < 0) return null;
  if (giorni === 0) return "Oggi si parte";
  if (giorni === 1) return "Domani si parte";
  const al = typeof alEvento === "string" && alEvento ? alEvento : "alla partenza";
  if (giorni < 14) return `Mancano ${giorni} giorni ${al}`;
  return `Mancano ${Math.floor(giorni / 7)} settimane ${al}`;
}

export const CARTA = {
  giroFatto: "Il giro di oggi è registrato.",
  palestraFatta: "La palestra di oggi è segnata.",
  anchePalestra: "Oggi c'è anche la palestra. Apri la scheda per serie e ripetizioni.",
  aggiorna: "Aggiorna",
};

// Il collegamento a «La tua avventura» (7.3), sotto la carta di oggi. «Cambia» con un evento o
// un'avventura propria, «Scegli» con il solo semaforo o senza niente.
export const AVVENTURA_OGGI = {
  cambia: "Cambia la tua avventura",
  scegli: "Scegli la tua avventura",
};

// --- Le carte dopo il giro (7.5 e 6.4) ---

// «di oggi», «di ieri», «di sabato 7 marzo».
export function quando(giorno, oggi) {
  if (!dataValida(giorno) || !dataValida(oggi)) return null;
  const n = Math.round((utc(oggi) - utc(giorno)) / GIORNO_MS);
  if (n === 0) return "di oggi";
  if (n === 1) return "di ieri";
  return `di ${dataLunga(giorno.slice(0, 10))}`;
}

function km(metri) {
  return `${numero(metri / 1000, metri < 10000 ? 1 : 0)} km`;
}

// «L'uscita di ieri, 3 ore e 10, 62 km».
export function titoloUscita(giorno, oggi, minuti = null, metri = null) {
  const q = quando(giorno, oggi);
  if (!q) return null;
  const pezzi = [`L'uscita ${q}`];
  if (minuti > 0) pezzi.push(formatoDurata(minuti));
  if (metri > 0) pezzi.push(km(metri));
  return pezzi.join(", ");
}

// «La palestra di ieri, 50 minuti».
export function titoloPalestra(giorno, oggi, minuti = null) {
  const q = quando(giorno, oggi);
  if (!q) return null;
  return minuti > 0 ? `La palestra ${q}, ${formatoDurata(minuti)}` : `La palestra ${q}`;
}

// Un'uscita arrivata senza dettagli (6.4). «L'uscita di sabato 7 marzo alle 8.30». ora è già scritta con
// formatoOra di js/formato.js.
export function titoloStub(giorno, oggi, ora = null) {
  const q = quando(giorno, oggi);
  if (!q) return null;
  return typeof ora === "string" && ora ? `L'uscita ${q} alle ${ora}` : `L'uscita ${q}`;
}

export function arrivaDa(sorgente) {
  const da = sorgente === "GARMIN_CONNECT" ? "Garmin" : "Strava";
  return `Arriva da ${da}, e intervals.icu non me ne passa i dettagli. Me li dici tu?`;
}

// La seduta del piano di ieri senza niente registrato (6.3), con l'articolo giusto per la domanda.
const NEL_PIANO = {
  facile: { frase: "un giro facile", f: false },
  recupero: { frase: "un giro di recupero", f: false },
  media: { frase: "un giro con qualche salita", f: false },
  richiamo: { frase: "un giro con le accelerazioni", f: false },
  lunga: { frase: "un'uscita lunga", f: true },
  scarico: { frase: "un'uscita tranquilla", f: true },
  controllo: { frase: "un giro con la bici pronta", f: false },
  weekend: { frase: "il weekend lungo", f: false },
  weekendCarico: { frase: "il weekend con le borse", f: false },
  T1: { frase: "il test con le borse", f: false },
  T2: { frase: "l'uscita lunga con le borse", f: true },
  T3: { frase: "la prova generale", f: true },
  prova: { frase: "la prova generale", f: true },
  blocco: { frase: "il blocco di tre giorni", f: false },
  carica: { frase: "un'uscita con le borse", f: true },
  unGiorno: { frase: "un'uscita con le borse", f: true },
};

const nelPiano = (seduta) => (seduta && typeof seduta === "object" && NEL_PIANO[seduta.tipo]) || NEL_PIANO.facile;

// «Ieri nel piano c'era un giro facile, 1 ora».
export function sedutaDiIeri(seduta) {
  if (!seduta || typeof seduta !== "object") return null;
  const voce = nelPiano(seduta);
  return seduta.minuti > 0 ? `Ieri nel piano c'era ${voce.frase}, ${formatoDurata(seduta.minuti)}` : `Ieri nel piano c'era ${voce.frase}`;
}

export function lHaiFatto(seduta) {
  return nelPiano(seduta).f ? "L'hai fatta?" : "L'hai fatto?";
}

export const CARTE = {
  salva: "Salva",
  nonLoSo: "Non lo so",
  almenoUna: "Scegli almeno una risposta, oppure premi Non lo so.",
  grazie: "Grazie, ho segnato.",
  soloTelefono: "Le risposte restano su questo telefono.",
  ancheIntervals: "Le risposte restano su questo telefono, e sforzo e borse vanno anche su intervals.icu.",
  sforzo: {
    domanda: "Com'è stata?",
    parole: { facilissima: "Facilissima", facile: "Facile", media: "Media", dura: "Dura", durissima: "Durissima" },
  },
  borse: {
    domanda: "Avevi le borse?",
    scelte: { no: "No", parte: "Sì, in parte", evento: "Sì, come all'evento" },
  },
  kg: {
    domanda: "Quanto pesavano, più o meno?",
    altro: "Un altro peso, in chili",
    unita: (kg) => `${kg} kg`,
  },
  notte: { domanda: "Hai dormito fuori?", si: "Sì", no: "No" },
  stub: {
    tipo: { domanda: "Cos'era?", scelte: { bici: "Bici", palestra: "Palestra", altro: "Altro" } },
    durata: {
      domanda: "Quanto è durata?",
      altro: "Altro",
      ore: "Ore",
      minuti: "Minuti",
      manca: "Scrivi quanto è durata, in ore e minuti.",
    },
    strada: "Se vuoi, li trovi su Strava. Servono a misurare quanto pesano le borse per te.",
    km: "Chilometri",
    dislivello: "Metri di salita",
  },
  palestra: {
    domanda: "Cosa hai allenato?",
    scelte: { corpo: "Gambe e tutto il corpo", gambe: "Solo le gambe", alto: "Solo parte alta e tronco" },
  },
  seduta: { si: "Sì, così", diverso: "Sì, ma diverso", no: "No" },
  prova: {
    domanda: "Com'è andata con la bici carica?",
    bene: "Tutto bene",
    sistemare: "Qualcosa da sistemare",
    quali: "Cosa c'è da sistemare?",
    nessuna: "Spunta almeno una casella, oppure premi Non lo so.",
    posizione: "Da adesso la posizione non si cambia più, solo piccole regolazioni.",
    // Le aree della regola 6.9, con il consiglio di una riga. Mani, sedere, collo, ginocchia e piedi
    // sono i punti di contatto del pilastro «da sistemare» (2.4).
    aree: [
      { id: "mani", testo: "Mani", consiglio: "Cambia presa ogni 10-15 minuti, controlla guanti e manubrio." },
      { id: "sedere", testo: "Sedere", consiglio: "Controlla altezza e inclinazione della sella, e usa la crema. Se resta, prova un'altra sella prima della prossima uscita con le borse." },
      { id: "collo", testo: "Collo", consiglio: "Alza un po' il manubrio, e fai gli esercizi per il collo della scheda Tronco e collo." },
      { id: "ginocchia", testo: "Ginocchia", consiglio: "Controlla l'altezza della sella e le tacchette, e in salita usa rapporti più agili." },
      { id: "piedi", testo: "Piedi", consiglio: "Prova a stringere meno le scarpe nelle ore calde, o scarpe un po' più larghe." },
      { id: "borse", testo: "Borse che si muovono", consiglio: "Stringi le cinghie e metti le cose pesanti in basso, vicino al telaio." },
      { id: "guida", testo: "Guida in discesa o su sterrato", consiglio: "Con la bici carica frena prima e tieni il peso basso." },
      { id: "cibo", testo: "Mangiare e bere", consiglio: "Mangia ogni 30-40 minuti, e tieni il cibo dove lo prendi senza fermarti." },
      { id: "dormire", testo: "Dormire", consiglio: "Prova a casa il materiale per dormire e la colazione del viaggio." },
      { id: "luci", testo: "Luci e batterie", consiglio: "Ricarica tutto la sera, e porta un caricatore da tenere in tasca." },
    ],
  },
};

// --- La domenica (7.9) ---

export const DOMENICA_OGGI = {
  titolo: "La tua settimana",
  si: "Sì",
  no: "No",
};

// --- I messaggi di una volta sola (6.4, 6.3 e 6.6) ---

export const UNA_VOLTA = {
  copiaFatta: "Copia salvata. Tienila in un posto sicuro, per esempio fra i file del telefono.",
  copiaNo: "Non sono riuscito a salvare la copia. Riprova da Impostazioni.",
};

// Gli ingressi di esempio dei modelli che vogliono date o sedute, che la prova della scrittura (9.8)
// non sa costruire da sola. Ogni voce è una lista di argomenti.
export const ESEMPI = {
  saluto: [[8, "Lucia"], [15, "Marco"], [20, null]],
  contoPartenza: [[70, "al Tuscany Trail"], [9, null], [1, null], [0, "al Trentino Gravel"]],
  quando: [["2027-03-14", "2027-03-14"], ["2027-03-13", "2027-03-14"], ["2027-03-07", "2027-03-14"]],
  titoloUscita: [["2027-03-13", "2027-03-14", 190, 62000], ["2027-03-14", "2027-03-14", 70, 8500], ["2027-03-07", "2027-03-14", null, null]],
  titoloPalestra: [["2027-03-13", "2027-03-14", 50], ["2027-03-07", "2027-03-14", null]],
  titoloStub: [["2027-03-07", "2027-03-14", "8.30"], ["2027-03-13", "2027-03-14", null]],
  arrivaDa: [["STRAVA"], ["GARMIN_CONNECT"]],
  sedutaDiIeri: [[{ tipo: "facile", minuti: 60 }], [{ tipo: "lunga", minuti: 240 }], [{ tipo: "weekend", minuti: 280 }]],
  lHaiFatto: [[{ tipo: "facile" }], [{ tipo: "lunga" }]],
};
