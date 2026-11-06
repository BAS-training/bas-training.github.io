// I testi delle pagine Settimana e Palestra (7.6 e 7.8), per js/viste/settimana.js e js/viste/palestra.js.
// Quelli delle sedute stanno in js/testi-piano.js, quelli delle schede in js/palestra.js. Stesse regole
// di scrittura di js/testi.js (7.1), e la prova 9.8 li legge tutti.
// Niente DOM, così le prove li compongono con node.

import { dataLunga, formatoDurata, formatoOra, numero } from "./formato.js?v=202611061254";
import { DOMANDE, PIANO, STIMA } from "./parametri.js?v=202611061254";

function congela(oggetto) {
  for (const valore of Object.values(oggetto)) {
    if (valore !== null && typeof valore === "object") congela(valore);
  }
  return Object.freeze(oggetto);
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = (v) => typeof v === "string" && DATA.test(v);
const NOMI_GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
const maiuscola = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const minuscola = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

function utc(iso) {
  const [a, m, g] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}

// Il nome del giorno della settimana, «sabato». Un aiuto dei testi, non un testo.
function nomeGiorno(iso) {
  return NOMI_GIORNI[(new Date(utc(iso)).getUTCDay() + 6) % 7];
}

// Le durate a parole (7.1), mai sotto il passo più piccolo. null senza durata.
function durata(minuti) {
  if (!(minuti > 0)) return null;
  return formatoDurata(Math.max(STIMA.arrotondaMinuti.passo, minuti));
}

// --- La settimana (7.6) ---

export const SETTIMANA = congela({
  titolo: "La tua settimana",
  senzaPiano: "Il piano nasce dalla tua prossima avventura. Scegli un evento o un'avventura tua, e qui trovi la settimana.",
  scegli: "Scegli",
  evento: "Sei in viaggio. Niente piano, ogni mattina decide il semaforo.",
  finito: "Il viaggio è finito. Quando vuoi, scegli la prossima avventura e qui trovi la settimana.",
  giorni: "Giorno per giorno",
  note: "Da sapere",
  azioni: "Cambia la settimana",
  primaDelPiano: "Prima del piano",
  siParte: "Si parte",
  inViaggio: "In viaggio",
  riposo: "Riposo",
  saltata: "Non è segnato niente. Va bene così, non si recupera.",
  apriScheda: "Apri la scheda",
  anteprima: "Il giorno stesso il semaforo può cambiarla.",
  nato: "Il piano comincia questa settimana. I giorni già passati non contano.",
  lunedi: "Ogni lunedì la settimana si rifà con le ore e le uscite vere delle settimane prima.",
  rifatto: "Ho rifatto la settimana con le tue scelte nuove. Le settimane passate restano com'erano.",
  weekendNiente: "Questo weekend non c'è niente da spostare.",
  liberaNo: "Va bene. Resta un'uscita lunga di un giorno solo.",
});

// I segni accanto a ogni giorno (7.6).
export const SEGNI = congela({
  fatta: "Fatta",
  saltata: "Saltata",
  spostata: "Spostata",
  oggi: "Oggi",
});

// Il perché di ogni seduta, a un tocco dalla riga (7.6). Nessuna promessa, la palestra con «probabilmente».
export const PERCHE = congela({
  riposo: "Il corpo si rafforza quando recupera. Un giorno senza bici fa parte del piano.",
  recupero: "Fa girare le gambe dopo la fatica, senza aggiungerne.",
  facile: "Le uscite facili costruiscono il fondo che serve in viaggio, senza toglierti energia per la seduta che conta.",
  media: "Una volta a settimana un po' di ritmo in salita tiene sveglie le gambe. Mai a tutta.",
  richiamo: "Nello scarico finale qualche tratto più svelto tiene le gambe pronte, senza stancarle.",
  lunga: "La lunga abitua corpo, sella e stomaco alle ore di una giornata di viaggio.",
  scarico: "Nella settimana leggera il corpo assorbe il lavoro delle settimane prima.",
  controllo: "Prima di partire si prova la bici come la porterai, con calma.",
  weekend: "Due giorni di fila insegnano al corpo a ripartire il giorno dopo, come in viaggio.",
  weekendCarico: "Due giorni di fila con la bici carica, come in viaggio.",
  T1: "Il primo test con le borse dice se bici, borse e posizione vanno bene insieme.",
  T2: "Un'uscita lunga con la bici carica prova il passo e il cibo del viaggio.",
  T3: "Due giorni come in viaggio, con la notte fuori. Dopo la prova generale la bici non si tocca più.",
  prova: "Due giorni come in viaggio, con la notte fuori. Dopo la prova generale la bici non si tocca più.",
  blocco: "Tre giorni di fila con le borse preparano ai viaggi lunghi. Si parte solo con il verde.",
  carica: "Un'uscita con la bici carica dice se bici e borse vanno bene insieme.",
  unGiorno: "Un'uscita con la bici carica dice se bici e borse vanno bene insieme.",
  palestra: "La palestra probabilmente rende più leggere le ultime ore delle giornate lunghe. Dà più forza alle gambe.",
  tronco: "Fianchi, schiena e collo lavorano tante ore in viaggio. Pochi minuti dopo il giro bastano.",
  dopoEvento: "Dopo il viaggio il corpo recupera. Niente piano.",
});

// Le sedute con l'articolo indeterminato, per dire cosa c'era nel piano di un giorno passato.
const UN_NOME = congela({
  recupero: "un giro di recupero",
  facile: "un giro facile",
  media: "un giro con qualche salita",
  richiamo: "un giro con le accelerazioni",
  lunga: "un'uscita lunga",
  scarico: "un'uscita tranquilla",
  controllo: "un giro con la bici pronta",
  weekend: "il weekend lungo",
  weekendCarico: "il weekend con le borse",
  T1: "il test con le borse",
  T2: "l'uscita lunga con le borse",
  T3: "la prova generale",
  prova: "la prova generale",
  blocco: "il blocco di tre giorni",
  carica: "un'uscita con le borse",
  unGiorno: "un'uscita con le borse",
  palestra: "la palestra",
  tronco: "tronco e collo",
});

const PIU_GIORNI = new Set(["weekend", "weekendCarico", "T3", "prova", "blocco"]);

// Sotto le 2 ore la lunga della settimana si chiama giro facile, come in js/testi-piano.js.
const tipoDetto = (s) => (s.tipo === "lunga" && s.minuti > 0 && s.minuti < PIANO.lungaDaMinuti ? "facile" : s.tipo);

// Il perché di una seduta, con la lunga corta detta come un giro facile.
export function percheSeduta(seduta) {
  const s = seduta && typeof seduta === "object" ? seduta : null;
  return s ? PERCHE[tipoDetto(s)] || null : null;
}

// «Lunedì 2», il giorno di una riga della settimana.
export function giornoRiga(iso) {
  if (!dataValida(iso)) return null;
  return `${maiuscola(nomeGiorno(iso))} ${Number(iso.slice(8, 10))}`;
}

// «Da lunedì 2 a domenica 8 novembre.», con il mese due volte quando la settimana ne prende due.
export function intervallo(lunedi) {
  if (!dataValida(lunedi)) return null;
  const domenica = new Date(utc(lunedi) + 6 * 86400000).toISOString().slice(0, 10);
  const primo = dataLunga(lunedi);
  const stessoMese = lunedi.slice(0, 7) === domenica.slice(0, 7);
  const inizio = stessoMese ? primo.split(" ").slice(0, 2).join(" ") : primo;
  return `Da ${inizio} a ${dataLunga(domenica)}.`;
}

// «Nel piano c'era un giro facile di 1 ora.»
export function nelPiano(seduta) {
  const s = seduta && typeof seduta === "object" ? seduta : null;
  if (!s || !UN_NOME[s.tipo]) return null;
  const parte = PIU_GIORNI.has(s.tipo) && Number.isInteger(s.parte) && s.di > 1 ? `, giorno ${s.parte}` : "";
  const d = s.tipo === "palestra" ? null : durata(s.minuti);
  return `Nel piano c'era ${UN_NOME[tipoDetto(s)]}${parte}${d ? `, ${d}` : ""}.`;
}

// Quello che è stato fatto in un giorno, «Bici, 1 ora e 30, 42 km». tipo è il nome del tipo a parole.
export function fattoDescritto(tipo, secondi, metri = null) {
  if (typeof tipo !== "string" || !tipo) return null;
  const d = secondi > 0 ? durata(secondi / 60) : null;
  const km = metri >= 1000 ? `${numero(metri / 1000)} km` : null;
  return [tipo, d, km].filter(Boolean).join(", ");
}

// Una seduta in più nello stesso giorno, sotto la principale.
export function sedutaAnche(seduta) {
  const s = seduta && typeof seduta === "object" ? seduta : null;
  if (!s) return null;
  if (s.tipo === "palestra") return "Anche la palestra.";
  if (s.tipo === "tronco") return `Anche tronco e collo${s.facoltativa ? ", se ti va" : ""}.`;
  if (!UN_NOME[s.tipo]) return null;
  const d = durata(s.minuti);
  return `Anche ${UN_NOME[s.tipo]}${d ? `, ${d}` : ""}.`;
}

// La seduta arrivata da un altro giorno, «Spostata qui da martedì.»
export function arrivaDa(giorno) {
  if (!dataValida(giorno)) return null;
  return `Spostata qui da ${nomeGiorno(giorno)}.`;
}

// La lunga rispetto a due settimane fa (7.6). minuti è la differenza, anche negativa.
export function fraseCrescita(tipo, minuti) {
  if (typeof minuti !== "number" || !Number.isFinite(minuti)) return null;
  const chi = tipo === "lunga" ? "La lunga" : "La seduta che conta";
  const d = durata(Math.abs(minuti));
  if (!d || Math.abs(minuti) < STIMA.arrotondaMinuti.passo) return `${chi} resta come due settimane fa.`;
  if (minuti > 0) return `${chi} cresce di ${d} rispetto a due settimane fa.`;
  return `${chi} è più corta di ${d} rispetto a due settimane fa.`;
}

// Il sì alla domanda del giorno da liberare (3.7) cambia i giorni in cui si pedala, e lo si dice prima.
export function liberaAiuto(giorno) {
  if (!dataValida(giorno)) return null;
  const nome = nomeGiorno(giorno);
  return `Con il sì ${nome === "domenica" ? "la" : "il"} ${nome} entra fra i giorni in cui puoi pedalare. Lo cambi quando vuoi in Impostazioni.`;
}

// --- Aggiungi un giro (6.3 e 6.4) ---

export const SFORZO_PAROLE = congela([
  { valore: DOMANDE.sforzo.facilissima, testo: "Facilissima" },
  { valore: DOMANDE.sforzo.facile, testo: "Facile" },
  { valore: DOMANDE.sforzo.media, testo: "Media" },
  { valore: DOMANDE.sforzo.dura, testo: "Dura" },
  { valore: DOMANDE.sforzo.durissima, testo: "Durissima" },
]);

const DURATE = [30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 420];

export const GIRO = congela({
  titolo: "Aggiungi un giro",
  aiuto: "Per un giro senza dispositivo, o uno che non è arrivato. Resta sul telefono e conta nelle tue ore.",
  apri: "Aggiungi un giro",
  tipo: "Cos'era?",
  tipi: [
    { valore: "Ride", testo: "Strada" },
    { valore: "GravelRide", testo: "Gravel o sterrato" },
    { valore: "MountainBikeRide", testo: "Mountain bike" },
    { valore: "VirtualRide", testo: "Rulli" },
  ],
  giorno: "Che giorno?",
  durata: "Quanto è durata?",
  durate: DURATE.map((m) => ({ valore: String(m), testo: formatoDurata(m) })),
  altro: "Altro",
  ore: "Ore",
  minuti: "Minuti",
  sforzo: "Com'è stata?",
  borse: "Avevi le borse?",
  borseScelte: [
    { valore: DOMANDE.borse[0], testo: "No" },
    { valore: DOMANDE.borse[1], testo: "Sì, in parte" },
    { valore: DOMANDE.borse[2], testo: "Sì, come all'evento" },
  ],
  kg: "Quanto pesavano, più o meno?",
  kgScelte: [5, 8, 12, 16].map((kg) => ({ valore: String(kg), testo: `${kg} kg` })),
  facoltativi: "Se vuoi, km e dislivello",
  km: "Km",
  metri: "Metri di salita",
  salva: "Aggiungi il giro",
  annulla: "Annulla",
  manca: "Mancano il giorno o la durata.",
  demo: "Nell'esempio il giro resta solo per questa visita.",
});

// «Giro aggiunto a sabato 7 novembre.»
export function giroAggiunto(giorno) {
  if (!dataValida(giorno)) return null;
  return `Giro aggiunto a ${dataLunga(giorno)}.`;
}

// --- La palestra (7.8) ---

export const PALESTRA_PAGINA = congela({
  titolo: "Palestra",
  niente: "Oggi il piano non ha palestra.",
  ferma: "Oggi niente palestra. La carta di oggi ti dice perché.",
  scheda: "Apri la scheda dalla carta di oggi o dalla settimana.",
  senzaPiano: "La palestra entra nel piano quando scegli la tua prossima avventura.",
  oggi: "Oggi",
  guarda: "Guarda la scheda",
  anteprima: "È la seduta del piano. Il giorno stesso il semaforo può alleggerirla.",
  segnaIlGiorno: "La segni il giorno stesso, quando l'hai fatta.",
  settimana: "Le sedute di questa settimana",
  prima: "Prima di cominciare",
  regole: "Come si lavora",
  gruppi: {
    salti: "Per cominciare, se ti va",
    forza: "Gli esercizi",
    tronco: "Tronco e collo",
    mobilita: "Mobilità dolce",
  },
  alternative: "Le alternative",
  tornaAllaScheda: "Torna all'esercizio della scheda",
  troncoTitolo: "Tronco e collo",
  noPalestra: "Nel tuo piano non c'è palestra. Restano tronco e collo, pochi minuti dopo i giri facili.",
  hoCapito: "Ho capito",
  sicurezza: "Prima di proporti la scheda, una domanda.",
});

// La seduta di un altro giorno della settimana, «La prossima seduta è giovedì 5 novembre.»
export function prossimaSeduta(giorno) {
  if (!dataValida(giorno)) return null;
  return `La prossima seduta è ${dataLunga(giorno)}.`;
}

// L'occhiello della scheda di un giorno che non è oggi, «Giovedì 5 novembre».
export function giornoScheda(giorno) {
  if (!dataValida(giorno)) return null;
  return maiuscola(dataLunga(giorno));
}

// L'esercizio scelto al posto di quello della scheda.
export function alPostoDi(nome) {
  if (typeof nome !== "string" || !nome) return null;
  return `Al posto di ${minuscola(nome)}.`;
}

// Il nome della scheda con la seduta, «Costruzione, seduta A».
export function nomeScheda(nome, seduta) {
  if (typeof nome !== "string" || !nome) return null;
  return seduta === "A" || seduta === "B" ? `${nome}, seduta ${seduta}` : nome;
}

// La settimana della fase, «Settimana 2 della costruzione.»
const NOMI_FASE = congela({ costruzione: "della costruzione", mantenimento: "del mantenimento", ultime: "delle ultime settimane" });
export function settimanaFase(fase, n) {
  if (!NOMI_FASE[fase] || !Number.isInteger(n) || n < 1) return null;
  return `Settimana ${n} ${NOMI_FASE[fase]}.`;
}

// Tronco e collo nei giorni dei giri facili, con i minuti del piano.
export function troncoAttacco(minuti) {
  const d = durata(minuti);
  return d ? `${d}, dopo il giro facile, se ti va.` : "Dopo il giro facile, se ti va.";
}

export const REGISTRA = congela({
  titolo: "Com'è andata",
  fatta: "Fatta?",
  sforzo: "Com'è stata la seduta?",
  pesi: "Segna i pesi",
  pesiAiuto: "Per ogni esercizio il peso e le ripetizioni dell'ultima serie, la più dura. Così la prossima volta ti propongo il peso giusto.",
  kg: "Peso in chili",
  ripetizioni: "Ripetizioni",
  riserva: "Ne potevi fare ancora",
  salva: "Fatta",
  segnata: "Seduta segnata.",
  errore: "Non sono riuscito a segnare la seduta. Riprova.",
  demo: "Nell'esempio la seduta resta solo per questa visita.",
});

// «Seduta segnata oggi alle 18.30.», con l'ora salvata dall'app.
export function segnataAlle(ora) {
  const quando = formatoOra(ora);
  return quando ? `Seduta segnata oggi alle ${quando}.` : REGISTRA.segnata;
}

// Gli ingressi di esempio dei modelli che vogliono una data, una seduta o un'attività, che la prova
// della scrittura (9.8) non sa costruire da sola. Ogni voce è una lista di argomenti.
export const ESEMPI = congela({
  giornoRiga: [["2026-11-02"], ["2026-11-08"]],
  intervallo: [["2026-11-02"], ["2026-11-30"]],
  nelPiano: [[{ tipo: "facile", minuti: 60 }], [{ tipo: "palestra", minuti: 50 }], [{ tipo: "weekend", minuti: 280, parte: 1, di: 2 }], [{ tipo: "lunga", minuti: 60 }]],
  percheSeduta: [[{ tipo: "lunga", minuti: 200 }], [{ tipo: "lunga", minuti: 60 }], [{ tipo: "palestra", minuti: 50 }]],
  fattoDescritto: [["Bici", 5400, 42000], ["Palestra", 3000, null]],
  sedutaAnche: [[{ tipo: "tronco", minuti: 10, facoltativa: true }], [{ tipo: "palestra", minuti: 50 }], [{ tipo: "facile", minuti: 45 }]],
  arrivaDa: [["2026-11-03"]],
  fraseCrescita: [["lunga", 30], ["T2", 0], ["lunga", -40]],
  liberaAiuto: [["2026-11-08"]],
  giroAggiunto: [["2026-11-07"]],
  prossimaSeduta: [["2026-11-05"]],
  giornoScheda: [["2026-11-05"]],
  alPostoDi: [["Squat"]],
  nomeScheda: [["Costruzione", "A"], ["Mantenimento", null]],
  settimanaFase: [["costruzione", 2], ["mantenimento", 1]],
  troncoAttacco: [[10], [null]],
  segnataAlle: [["18:30"], [null]],
});
