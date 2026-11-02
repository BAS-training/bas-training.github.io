// I testi del primo avvio (7.3), per js/viste/inizio.js. Stesse regole di scrittura di js/testi.js (7.1),
// e la prova 9.8 li legge tutti. Le domande della palestra stanno in js/palestra.js (DOMANDE_PALESTRA),
// qui ci sono solo le parole intorno e una copia di riserva, se quel file cambiasse forma.
// I modelli che sono funzioni controllano i loro ingressi e restituiscono null quando non tornano.

import { dataLunga } from "./formato.js?v=202611021705";
import { PASSO } from "./parametri.js?v=202611021705";

function congela(oggetto) {
  for (const valore of Object.values(oggetto)) {
    if (valore !== null && typeof valore === "object") congela(valore);
  }
  return Object.freeze(oggetto);
}

const intero = (n) => Number.isInteger(n) && n >= 0;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const IN_LETTERE = ["zero", "un", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci"];

// 5900 diventa «5.900». Intl in italiano mette il punto solo da 10.000, i testi lo vogliono sempre.
export function migliaia(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// La data del via, con l'anno quando non è quello di oggi. «giovedì 20 maggio 2027».
export function dataDelVia(iso, oggi) {
  if (typeof iso !== "string" || !DATA.test(iso)) return null;
  const testo = dataLunga(iso);
  return typeof oggi === "string" && DATA.test(oggi) && oggi.slice(0, 4) !== iso.slice(0, 4) ? `${testo} ${iso.slice(0, 4)}` : testo;
}

const giorniInParole = (n) => (n === 1 ? "un giorno" : `${n} giorni`);
const oreInParole = (n) => (n === 1 ? "1 ora" : `${n} ore`);

// Il primo avvio in generale.
export const INIZIO = congela({
  titolo: "La tua avventura",
  occhiello: "Come sto",
  attacco: "Ti faccio qualche domanda, una per schermata. Ogni risposta è già scelta, e se ti va bene tocchi Avanti.",
  tasti: {
    avanti: "Avanti",
    salta: "Salta",
    fatto: "Fatto",
    prima: "Torna alla domanda prima",
    lascia: "Lascia com'è",
  },
  scegliPrima: "Scegli una risposta, poi tocca Avanti.",
});

// «Passaggio 2 di 6», sopra il titolo di ogni schermata.
export function passaggio(n, di) {
  if (!intero(n) || !intero(di) || n < 1 || n > di) return null;
  return `Passaggio ${n} di ${di}`;
}

// La schermata 1, «Cosa prepari?».
export const SCELTA = congela({
  titolo: "Cosa prepari?",
  attacco: "Scegli il tuo evento della Bike Adventure Series. Le ore di ogni giornata le calcolo dai km e dal dislivello ufficiali, con la bici carica.",
  altro: "Altro",
  avventura: "Un'avventura mia",
  avventuraSotto: "Un giro lungo, un giro con i tuoi km o qualche giorno di fila.",
  semaforo: "Solo il semaforo del mattino",
  semaforoSotto: "Ogni mattina ti dico come stai, senza un piano.",
  nessunEvento: "Nel catalogo non ci sono eventi con una partenza nei prossimi mesi. Puoi preparare un'avventura tua.",
});

// «460 km, 5.900 m di salita», oppure il dislivello che manca.
export function rigaPercorso(km, dislivello) {
  const k = migliaia(km);
  if (!k) return null;
  const m = migliaia(dislivello);
  return m ? `${k} km, ${m} m di salita` : `${k} km, dislivello non ancora pubblicato`;
}

// La schermata 2 per un evento, «In quanti giorni? Quando parti?», e l'esperienza di viaggio.
export const GIORNI = congela({
  titolo: "In quanti giorni? Quando parti?",
  attacco: "Più giorni vogliono dire giornate più corte. Puoi cambiarlo quando vuoi.",
  quanti: "In quanti giorni?",
  unGiorno: "È un giorno solo.",
  dalVia: "I giorni si contano dal via, come fa l'organizzazione. In calendario è un giorno in più.",
  quando: "Quando parti?",
  esperienza: {
    domanda: "Hai già fatto un viaggio in bici di più giorni, con le borse?",
    scelte: [
      { valore: false, testo: "Non ancora" },
      { valore: 2, testo: "Sì, di 2 giorni" },
      { valore: 3, testo: "Sì, di 3 giorni o più" },
    ],
  },
  altraAvventura: "Scegli un'altra avventura",
  attaccoIscritto: "Hai aperto il link della tua iscrizione, quindi evento, giorni e partenza li ho già. Mancano poche domande su di te.",
});

// «Tuscany Trail, Originale.», sopra le domande dei giorni.
export function quale(evento, nome) {
  if (typeof evento !== "string" || !evento) return null;
  return typeof nome === "string" && nome ? `${evento}, ${nome}.` : `${evento}.`;
}

// «Di solito 4-5.»
export function diSolito(tipici) {
  const t = Array.isArray(tipici) ? tipici.filter(intero) : [];
  if (!t.length) return null;
  const da = Math.min(...t);
  const a = Math.max(...t);
  return da === a ? `Di solito ${da}.` : `Di solito ${da}-${a}.`;
}

export function scrittaGiorni(n) {
  return intero(n) && n > 0 ? (n === 1 ? "1 giorno" : `${n} giorni`) : null;
}

export function unaPartenza(data) {
  return typeof data === "string" && data ? `Si parte ${data}.` : null;
}

// «al Tuscany Trail», «alla NorthCape4000». Gli articoli dei nomi degli eventi, per eventoId.
const ARTICOLI = { tt: "al", tg: "al", tge: "a", ur: "a", nc4k: "alla", ffp: "alla" };

// «Sei iscritto al Tuscany Trail 2027», il titolo della schermata e della carta dell'invito.
export function iscrittoTitolo(eventoId, evento, anno) {
  if (typeof evento !== "string" || !evento) return null;
  const quando = typeof anno === "string" && /^\d{4}$/.test(anno) ? ` ${anno}` : "";
  return `Sei iscritto ${ARTICOLI[eventoId] || "a"} ${evento}${quando}`;
}

// La stessa frase dentro il riepilogo, con il punto.
export function iscritto(eventoId, evento, anno) {
  const titolo = iscrittoTitolo(eventoId, evento, anno);
  return titolo ? `${titolo}.` : null;
}

// «Originale, in 4 giorni. Si parte giovedì 20 maggio 2027.»
export function dettaglioIscritto(nome, giorni, data) {
  if (typeof nome !== "string" || !nome) return null;
  const pezzi = [intero(giorni) && giorni > 0 ? `${nome}, in ${giorniInParole(giorni)}.` : `${nome}.`];
  if (typeof data === "string" && data) pezzi.push(`Si parte ${data}.`);
  return pezzi.join(" ");
}

// La schermata 2 con «Un'avventura mia» (1.9). La data è facoltativa.
export const AVVENTURA = congela({
  titolo: "Che avventura?",
  attacco: "Scegli com'è, e se vuoi il giorno.",
  tipo: "Com'è la tua avventura?",
  tipi: [
    { valore: "ore", testo: "Un giro lungo, di qualche ora" },
    { valore: "giro", testo: "Un giro con i tuoi km e la tua salita" },
    { valore: "giorni", testo: "Più giorni di fila" },
  ],
  oreDomanda: "Quante ore?",
  km: "Quanti km?",
  metri: "Quanti metri di salita?",
  metriAiuto: "Se non lo sai, lascia vuoto.",
  fondo: "Su che fondo?",
  fondi: [
    { valore: "strada", testo: "Strada" },
    { valore: "gravel", testo: "Gravel" },
    { valore: "misto", testo: "Misto" },
    { valore: "mountainBike", testo: "Mountain bike" },
  ],
  borse: "Anche con le borse",
  giorniDomanda: "Quanti giorni di fila?",
  oreGiorno: "Quante ore al giorno?",
  data: "Quando",
  dataAiuto: "Facoltativo. Se non hai ancora una data, lascia vuoto. Senza data il piano tiene una settimana tipo, che cresce piano.",
  kmManca: "Scrivi quanti km, con un numero da 1 a 1.000.",
  metriSbagliati: "I metri di salita vanno scritti con un numero da 0 a 20.000, oppure lasciati vuoti.",
  dataSbagliata: "Questa data è già passata. Scegline una da oggi in poi, oppure lascia vuoto.",
});

export function scrittaOre(n) {
  return intero(n) && n > 0 ? oreInParole(n) : null;
}

// La schermata 3, i giorni in bici con la stella sul giorno della lunga.
export const SETTIMANA_INIZIO = congela({
  titolo: "Quali giorni puoi uscire in bici?",
  attacco: "Tocca i giorni in cui di solito hai tempo. Poi scegli il giorno della lunga, che non ha limiti di tempo.",
  giorni: "I giorni in bici",
  nomi: ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"],
  stella: "Il giorno della lunga",
  nessuno: "Scegli almeno un giorno in cui puoi uscire in bici.",
});

// La schermata 4, il tempo di una settimana normale.
export const TEMPO = congela({
  titolo: "Quanto tempo hai per la bici, in una settimana normale?",
  attacco: "Conta le ore che puoi dare alla bici in una settimana come le altre, senza ferie.",
});

// «6 ore», e per l'ultima scelta «12 ore o più».
export function scrittaTempo(n, ultima = false) {
  if (!intero(n) || n <= 0) return null;
  return ultima === true ? `${oreInParole(n)} o più` : oreInParole(n);
}

// Le due domande in più per chi non ha giri registrati (1.4 e 3.1).
export const GIRI = congela({
  titolo: "Come pedali adesso?",
  attacco: `Non vedo ancora giri registrati. Con queste due risposte la prima stima è più vicina a te, e con ${PASSO.giriMinimi} giri lunghi registrati diventa tua.`,
  media: "In un giro di 2-3 ore, che media fai di solito?",
  medie: ["Meno di 18 km/h", "18-21 km/h", "21-24 km/h", "24-27 km/h", "Più di 27 km/h"],
  nonSo: "Non lo so",
  ore: "Quante ore pedali adesso, in una settimana normale?",
  fasce: ["Meno di 2 ore", "2-4 ore", "4-6 ore", "6-8 ore", "Più di 8 ore"],
});

// La schermata 5, la palestra (5.1). Le domande vere stanno in DOMANDE_PALESTRA di js/palestra.js, queste
// sono la copia di riserva e le righe in più della pagina.
export const PALESTRA_INIZIO = congela({
  attacco: "Se la fai, nel piano trovi le schede con esercizi, serie e pesi spiegati a parole.",
  riserva: {
    palestra: {
      testo: "La palestra?",
      scelte: [
        { valore: "no", testo: "No" },
        { valore: "conosco", testo: "Sì, la conosco" },
        { valore: "mai", testo: "Sì, ma non l'ho mai fatta" },
        { valore: "casa", testo: "Sì, ma a casa" },
      ],
    },
    sicurezza: {
      testo: "Hai osteoporosi, una malattia di cuore, un infortunio recente o una protesi?",
      scelte: [{ valore: "si", testo: "Sì" }, { valore: "no", testo: "No" }],
    },
    sicurezzaSi: "Prima di cominciare parlane con il medico o il fisioterapista. Intanto ti propongo solo tronco, collo e mobilità.",
  },
  sicurezzaAiuto: "Della risposta tengo solo il sì o il no, sul telefono.",
  altriSport: {
    domanda: "Oltre alla bici fai un altro sport, almeno una volta a settimana?",
    aiuto: "Se non ne fai, le prime settimane in palestra sono più dolci.",
    scelte: [{ valore: true, testo: "Sì" }, { valore: false, testo: "No" }],
  },
});

// La schermata 6, l'età a fasce. I valori sono quelli di SEMAFORO.fasceEta.
export const ETA = congela({
  titolo: "Quanti anni hai?",
  attacco: "Con l'età cambiano lo scarico, il recupero e la palestra. La fascia resta solo su questo telefono.",
  scelte: [
    { valore: "sotto40", testo: "Sotto i 40" },
    { valore: "40-49", testo: "40-49" },
    { valore: "50-54", testo: "50-54" },
    { valore: "55-59", testo: "55-59" },
    { valore: "60+", testo: "60 e più" },
  ],
});

// La schermata «Prima di cominciare», da 40 anni, alla fine del primo avvio (regola 5.17). Compare già
// dai 40 anni, quindi «40 anni o più». Si salva solo la data in cui è comparsa, nessuna risposta.
export const PRIMA_DI_COMINCIARE = congela({
  titolo: "Prima di cominciare",
  testo: "Hai 40 anni o più. Se hai fattori di rischio per il cuore, come fumo, pressione alta, colesterolo alto, diabete o familiari con malattie di cuore da giovani, o se ricominci adesso con sforzi intensi, parlane prima con il medico. Una visita medico-sportiva con prova da sforzo è il modo giusto per partire tranquillo. Se in bici senti dolore al petto, palpitazioni strane, fiato corto che non conosci o ti gira la testa, fermati e chiedi aiuto.",
  tasto: "Ho capito",
});

// Il riepilogo, «La tua avventura».
export const RIEPILOGO = congela({
  titolo: "La tua avventura",
  vaiAlPiano: "Vai al piano",
  vaiAOggi: "Vai a Oggi",
  cambia: "Cambia la tua avventura",
  scegliAvventura: "Scegli un'avventura",
  cosaCambia: "Vedi cosa cambia",
  senzaData: "Senza una data il piano tiene una settimana tipo per le ore che hai, e la fa crescere piano. Quando sai il giorno, scrivilo e il piano si prepara per quella data.",
  semaforo: "Hai scelto il solo semaforo del mattino. Ogni mattina ti dico come stai e cosa fare, senza un piano.",
  semaforoAltro: "Quando vuoi preparare un evento o un'avventura tua, sceglila qui.",
  preparaInvito: "Prepara questa avventura",
  tieni: "Tieni quella di adesso",
  invitoAttacco: "Hai aperto il link della tua iscrizione. Se vuoi, preparo il piano per questo evento al posto di quello di adesso.",
  fondi: { strada: "su strada", gravel: "in gravel", misto: "su fondo misto", mountainBike: "in mountain bike" },
});

// «Tuscany Trail, Originale, in 4 giorni.»
export function cosaPrepari(evento, nome, giorni) {
  if (typeof evento !== "string" || !evento || !intero(giorni) || giorni < 1) return null;
  const quale = typeof nome === "string" && nome ? `${evento}, ${nome}` : evento;
  return `${quale}, in ${giorniInParole(giorni)}.`;
}

// «Un giro lungo di 4 ore.»
export function giroDiOre(ore) {
  return intero(ore) && ore > 0 ? `Un giro lungo di ${oreInParole(ore)}.` : null;
}

// «Un giro di 120 km con 1.500 m di salita, in gravel, con le borse.»
export function giroDiKm({ km, metri, fondo, conBorse } = {}) {
  const k = migliaia(km);
  if (!k || !(km > 0)) return null;
  const pezzi = [`Un giro di ${k} km`];
  if (typeof metri === "number" && metri > 0) pezzi[0] += ` con ${migliaia(metri)} m di salita`;
  if (RIEPILOGO.fondi[fondo]) pezzi.push(RIEPILOGO.fondi[fondo]);
  if (conBorse === true) pezzi.push("con le borse");
  return `${pezzi.join(", ")}.`;
}

// «Due giorni di fila, da 5 ore al giorno.»
export function giorniDiFila(giorni, ore) {
  if (!intero(giorni) || giorni < 2 || giorni >= IN_LETTERE.length || !intero(ore) || ore < 1) return null;
  const quanti = IN_LETTERE[giorni];
  return `${quanti.charAt(0).toUpperCase()}${quanti.slice(1)} giorni di fila, da ${oreInParole(ore)} al giorno.`;
}

// «Riprendi da una copia», in alto al primo avvio su un telefono nuovo (6.6).
export const COPIA = congela({
  titolo: "Hai già usato Come sto?",
  testo: "Se hai salvato una copia su un altro telefono, da qui riprendi le tue risposte e il tuo piano.",
  scegli: "Scegli la copia",
  riprendi: "Riprendi da questa copia",
  annulla: "Lascia stare",
  leggo: "Leggo la copia…",
  fatto: "Ho ripreso la tua copia.",
  vuota: "Questa copia non ha niente di nuovo per questo telefono.",
  motivi: {
    grande: "Questo file è troppo grande per essere una copia di Come sto.",
    illeggibile: "Non riesco a leggere questo file. Scegli il file come-sto-dati che hai salvato.",
    estranea: "Questo file non è una copia di Come sto.",
    nuova: "Questa copia viene da una versione più nuova di Come sto. Ricarica la pagina e riprova.",
    memoria: "Il telefono non ha spazio per tutta la copia. Ho ripreso quello che ci stava.",
  },
});

// Cosa prende la copia, prima di chiedere conferma. data è già scritta in parole, oppure null.
export function anteprimaCopia(data, nuove, sostituite) {
  if (!intero(nuove) || !intero(sostituite) || nuove + sostituite === 0) return null;
  const da = typeof data === "string" && data ? `La copia di ${data}` : "La copia";
  const voci = (n) => (n === 1 ? "1 voce" : `${n} voci`);
  if (!sostituite) return `${da} aggiunge ${voci(nuove)}. Le voci che hai già su questo telefono restano.`;
  if (!nuove) return `${da} aggiorna ${voci(sostituite)} di questo telefono, con il dato più recente.`;
  return `${da} aggiunge ${voci(nuove)} e ne aggiorna ${sostituite}, con il dato più recente.`;
}

// Gli ingressi di esempio dei modelli che la prova della scrittura (9.8) non sa costruire da sola.
// Ogni voce è una lista di argomenti.
export const ESEMPI = congela({
  dataDelVia: [["2027-05-20", "2026-11-01"], ["2026-12-05", "2026-11-01"]],
  cosaPrepari: [["Tuscany Trail", "Originale", 4], ["Unpaved Roads Punta Ala", "Lungo", 1]],
  giroDiKm: [[{ km: 120, metri: 1500, fondo: "gravel", conBorse: true }], [{ km: 80, metri: 0, fondo: "strada", conBorse: false }]],
  diSolito: [[[4, 5]], [[2]]],
  iscritto: [["tt", "Tuscany Trail", "2027"], ["nc4k", "NorthCape4000", "2027"], ["ur", "Unpaved Roads Punta Ala", null]],
  iscrittoTitolo: [["tt", "Tuscany Trail", "2027"], ["ffp", "Final Frontier Patagonia", "2027"]],
  dettaglioIscritto: [["Originale", 4, "giovedì 20 maggio 2027"], ["Lungo", 1, null]],
  scrittaTempo: [[12, true], [6, false]],
  anteprimaCopia: [["sabato 12 ottobre", 40, 3], [null, 5, 0], ["sabato 12 ottobre", 0, 2]],
});
