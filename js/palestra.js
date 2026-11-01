// Le schede di palestra (capitolo 5 della specifica) e le regole che le mettono nel piano.
// SCHEDE ed ESERCIZI sono le tabelle del capitolo come dati, e i testi a schermo stanno qui con
// loro, così la prova dei testi li legge tutti (7.1 e 9.8). I numeri delle regole stanno in
// PIANO.palestra di js/parametri.js, le serie, le ripetizioni e le riserve delle tabelle qui.
// Nel codice la riserva è il RIR, le ripetizioni che restano a fine serie. A schermo è una frase.
// Niente DOM e niente window, così il file si prova con node (test/palestra.test.mjs).

import { PIANO, CARICO, STIMA, SEMAFORO } from "./parametri.js?v=202610312043";
import { numero, formatoDurata } from "./formato.js?v=202610312043";

const P = PIANO.palestra;

function congela(oggetto) {
  for (const valore of Object.values(oggetto)) {
    if (valore !== null && typeof valore === "object") congela(valore);
  }
  return Object.freeze(oggetto);
}

const valido = (v) => typeof v === "number" && Number.isFinite(v);
const intero = (v) => (valido(v) ? Math.round(v) : null);
const intervallo = (da, a = da) => ({ da, a });
const copia = (v) => (v && typeof v === "object" ? { ...v } : v);
const meta = (r) => (r.da + r.a) / 2;

// Le date nel formato di intervals.icu, contate a mezzogiorno UTC come in js/modello.js.
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = (v) => typeof v === "string" && DATA.test(v);
function utc(iso) {
  const [a, m, g] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}
const giorniFra = (da, a) => Math.round((utc(a) - utc(da)) / 86400000);
const piuGiorni = (iso, n) => new Date(utc(iso) + n * 86400000).toISOString().slice(0, 10);
const giornoDellaSettimana = (iso) => (new Date(utc(iso)).getUTCDay() + 6) % 7;   // 0 = lunedì
const NOMI_GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

// --- Gli esercizi (5.3) ---

// gruppo dice cosa lavora, e decide le regole del semaforo. grande vuol dire esercizio grande per le
// gambe, con l'aumento più forte (regola 4.3). carico dice con cosa si sceglie la fatica della serie.
// lato dice se le serie si fanno per gamba, per lato o nelle 4 direzioni del collo.
function elenco(lista) {
  const fuori = {};
  for (const e of lista) {
    fuori[e.id] = { dettaglio: null, alternative: [], varianti: null, serve: null, grande: false, carico: "corpo", lato: null, ...e };
  }
  return congela(fuori);
}

export const ESERCIZI = elenco([
  {
    id: "squat", nome: "Squat", dettaglio: "Mezzo squat al multipower o squat completo.",
    gruppo: "gambe", grande: true, carico: "peso", alternative: ["goblet-squat", "leg-press"],
    come: "Piedi larghi come le spalle, schiena dritta, ginocchia nella direzione delle punte. Scendi controllando, fino alle cosce quasi parallele o fino a dove resti dritto senza dolore, e risali deciso.",
    serve: "Gambe più forti in salita e nelle ultime ore.",
  },
  {
    id: "goblet-squat", nome: "Goblet squat", gruppo: "gambe", grande: true, carico: "peso", alternative: ["leg-press"],
    come: "Come lo squat, con un manubrio tenuto al petto con le due mani. Scendi controllando e risali deciso.",
    serve: "Gambe più forti in salita e nelle ultime ore.",
  },
  {
    id: "leg-press", nome: "Leg press", gruppo: "gambe", grande: true, carico: "peso", alternative: ["goblet-squat"],
    come: "Schiena e bacino ben appoggiati, i piedi sulla pedana larghi come le spalle. Spingi con i talloni e non bloccare di scatto le ginocchia in fondo.",
    serve: "Gambe più forti in salita e nelle ultime ore.",
  },
  {
    id: "leg-press-una", nome: "Leg press a una gamba", gruppo: "gambe", grande: true, carico: "peso", lato: "gamba",
    alternative: ["split-squat", "step-up"],
    come: "Schiena e bacino ben appoggiati, un piede sulla pedana. Spingi con il tallone e non bloccare di scatto il ginocchio in fondo.",
    serve: "Lavora una gamba alla volta, come sui pedali.",
  },
  {
    id: "split-squat", nome: "Split squat bulgaro", gruppo: "gambe", grande: true, carico: "peso", lato: "gamba", alternative: ["step-up"],
    come: "Il piede dietro appoggiato su una panca, il busto alto. Scendi in verticale, il ginocchio davanti resta sopra il piede. All'inizio tieni una mano su un appoggio.",
    serve: "Si fa anche a casa.",
  },
  {
    id: "step-up", nome: "Step-up", gruppo: "gambe", grande: true, carico: "peso", lato: "gamba", alternative: ["split-squat"],
    come: "Sali su un gradino non più alto del ginocchio spingendo con la gamba davanti, senza darti la spinta con quella dietro. Scendi lento.",
    serve: "Spinta di una gamba, facile da imparare.",
  },
  {
    id: "squat-una", nome: "Squat a una gamba su una panca", gruppo: "gambe", grande: true, carico: "zaino", lato: "gamba",
    alternative: ["step-up"],
    come: "In piedi davanti a una panca, su una gamba sola e con l'altra un po' in avanti. Scendi lento fino a sfiorare la panca e risali spingendo con il tallone. All'inizio tieni una mano su un appoggio.",
    serve: "Lavora una gamba alla volta, come sui pedali.",
  },
  {
    id: "flessione-anca", nome: "Flessione dell'anca in piedi", gruppo: "gambe", carico: "peso", lato: "gamba",
    alternative: ["ginocchio-elastico"],
    come: "Cavigliera al cavo basso, oppure un elastico. Porta il ginocchio in alto come nella pedalata, poi torna giù lento.",
    serve: "La parte della pedalata che sale.",
  },
  {
    id: "ginocchio-elastico", nome: "Ginocchio in alto contro un elastico", gruppo: "gambe", carico: "elastico", lato: "gamba",
    come: "L'elastico fissato in basso e alla caviglia. Porta il ginocchio in alto come nella pedalata, poi torna giù lento.",
    serve: "La parte della pedalata che sale.",
  },
  {
    id: "polpacci", nome: "Polpacci", gruppo: "gambe", carico: "peso", alternative: ["polpacci-una"],
    varianti: "Con un manubrio in mano, o con lo zaino.",
    come: "L'avampiede sul bordo di un gradino. Sali sulle punte e scendi lento sotto il livello del gradino. A una gamba quando ci riesci.",
    serve: "Piede più stabile sul pedale.",
  },
  {
    id: "polpacci-una", nome: "Polpacci a una gamba", gruppo: "gambe", carico: "peso", lato: "gamba", alternative: ["polpacci"],
    come: "L'avampiede di un piede sul bordo di un gradino, una mano su un appoggio. Sali sulla punta e scendi lento sotto il livello del gradino.",
    serve: "Piede più stabile sul pedale.",
  },
  {
    id: "stacco-rumeno", nome: "Stacco rumeno", gruppo: "gambe", grande: true, carico: "peso", alternative: ["hip-thrust", "ponte"],
    come: "Manubri o bilanciere davanti alle cosce, ginocchia appena piegate. Piegati in avanti dal bacino con la schiena dritta, il sedere va dietro. Scendi finché senti tirare dietro le cosce, poi risali spingendo avanti il bacino.",
    serve: "Glutei e dietro coscia, e probabilmente ossa, perché carica anca e schiena.",
  },
  {
    id: "stacco-una", nome: "Stacco rumeno a una gamba", gruppo: "gambe", grande: true, carico: "zaino", lato: "gamba",
    alternative: ["ponte-una"],
    come: "In piedi su una gamba, lo zaino in mano davanti alla coscia, il ginocchio appena piegato. Piegati in avanti dal bacino con la schiena dritta, l'altra gamba sale dietro. Scendi finché senti tirare dietro la coscia, poi risali. All'inizio tieni una mano su un appoggio.",
    serve: "Glutei e dietro coscia, anche a casa.",
  },
  {
    id: "ponte", nome: "Ponte", gruppo: "gambe", carico: "corpo", alternative: ["ponte-una"],
    come: "Sdraiato, piedi a terra vicini al bacino. Alza il bacino stringendo i glutei, senza inarcare la schiena.",
    serve: "Glutei, utile per chi ha male al ginocchio.",
  },
  {
    id: "hip-thrust", nome: "Hip thrust", gruppo: "gambe", grande: true, carico: "peso", alternative: ["ponte"],
    come: "Le spalle appoggiate su una panca, i piedi a terra vicini al bacino. Alza il bacino stringendo i glutei, senza inarcare la schiena.",
    serve: "Glutei, utile per chi ha male al ginocchio.",
  },
  {
    id: "ponte-una", nome: "Ponte a una gamba", gruppo: "gambe", carico: "corpo", lato: "gamba", alternative: ["ponte"],
    come: "Come il ponte, con un piede solo a terra e l'altra gamba distesa.",
    serve: "Glutei, utile per chi ha male al ginocchio.",
  },
  {
    id: "salti-box", nome: "Squat jump o salti sul box", gruppo: "salti",
    come: "Salti freschi a inizio seduta. Atterra morbido, ginocchia nella direzione delle punte. Niente salti se ginocchia o anche fanno male.",
    serve: "Spinta, rende meno della forza pesante.",
  },
  {
    id: "salti-bassi", nome: "Salti bassi per le ossa", gruppo: "salti",
    come: "Saltelli sul posto, atterraggio morbido. Solo senza problemi alle articolazioni né osteoporosi.",
    serve: "Probabilmente ossa, per chi pedala tanto.",
  },
  {
    id: "plank-laterale", nome: "Plank laterale", gruppo: "tronco", lato: "lato", alternative: ["plank-ginocchia"],
    come: "Sul fianco, appoggiato sull'avambraccio, il corpo in linea dalla testa ai piedi e il bacino fermo. Per cominciare sulle ginocchia.",
    serve: "Fianchi e schiena nelle ore in sella.",
  },
  {
    id: "plank-ginocchia", nome: "Plank laterale sulle ginocchia", gruppo: "tronco", lato: "lato",
    come: "Come il plank laterale, con le ginocchia piegate e appoggiate a terra.",
    serve: "Fianchi e schiena nelle ore in sella.",
  },
  {
    id: "estensione-schiena", nome: "Tenuta in estensione della schiena", gruppo: "tronco",
    come: "Pancia in giù su una panca o a terra, alza un poco busto e gambe e tieni, senza dolore.",
    serve: "Schiena.",
  },
  {
    id: "bird-dog", nome: "Bird-dog", gruppo: "tronco", lato: "lato",
    come: "A quattro zampe, allunga un braccio e la gamba opposta, tieni un secondo senza ruotare il bacino, torna lento.",
    serve: "Schiena ferma.",
  },
  {
    id: "dead-bug", nome: "Dead bug", gruppo: "tronco", lato: "lato",
    come: "Sdraiato sulla schiena, braccia in alto e ginocchia a 90 gradi. Allunga un braccio e la gamba opposta verso il pavimento, la schiena resta appoggiata.",
    serve: "Tronco.",
  },
  {
    id: "collo", nome: "Isometrie del collo", gruppo: "collo", lato: "direzione",
    varianti: "Poi l'elastico in movimento, mai con dolore.",
    come: "Una mano, o un elastico, contro fronte, nuca e lati della testa. Spingi senza muovere la testa, mai con dolore.",
    serve: "Collo, che in viaggio lavora tante ore.",
  },
  {
    id: "rematore", nome: "Rematore con elastico", gruppo: "alto", carico: "elastico",
    alternative: ["scapole-strette", "scrollate", "alzate-laterali"],
    come: "Elastico fissato davanti, tira verso il petto portando le scapole vicine, spalle basse, movimento lento.",
    serve: "Spalle e postura.",
  },
  {
    id: "scapole-strette", nome: "Scapole strette", gruppo: "alto",
    come: "Seduto o in piedi, spalle basse. Avvicina le scapole come per stringere una matita fra loro, tieni un secondo e lascia andare.",
    serve: "Spalle e postura.",
  },
  {
    id: "scrollate", nome: "Scrollate con elastico", gruppo: "alto", carico: "elastico", alternative: ["rematore"],
    come: "In piedi sull'elastico, le mani lungo i fianchi. Alza le spalle verso le orecchie e scendi lento.",
    serve: "Spalle e collo.",
  },
  {
    id: "alzate-laterali", nome: "Alzate laterali con elastico", gruppo: "alto", carico: "elastico", alternative: ["rematore"],
    come: "In piedi sull'elastico, gomiti appena piegati. Alza le braccia di lato fino all'altezza delle spalle e scendi lento.",
    serve: "Spalle e postura.",
  },
  {
    id: "mobilita", nome: "Mobilità dolce", gruppo: "mobilita", lato: "lato",
    come: "Flessori dell'anca, petto e cosce, 20-30 secondi per lato, dopo l'uscita e mai a lungo subito prima di pedalare.",
    serve: "Solo comfort.",
  },
]);

// --- Le nove schede (5.4) ---

// I valori di un esercizio si cercano prima nella riga dell'esercizio, poi nel periodo di settimane,
// poi nella scheda. Le settimane sono quelle della fase, come nelle tabelle (scheda 2 dalla 4 alla 12).
const SCHEDA_UNO_RIPETIZIONI = intervallo(12, 15);
const SCHEDA_UNO_SERIE = intervallo(2);
const ULTIME_RISERVA = intervallo(4);
const MANTENIMENTO_CASA = { ripetizioni: intervallo(8, 15), recupero: intervallo(120), riserva: intervallo(0, 2), riservaDa40: intervallo(1, 2) };
const E = P.eta;
const S = P.salti;

const TESTO_OSSA = "Chi pedala tanto ha spesso le ossa un po' meno dense. Vale la pena parlarne con il medico.";

export const SCHEDE = congela({
  1: {
    numero: 1,
    nome: "Si comincia",
    descrizione: "Le prime settimane, per imparare i movimenti con pesi leggeri. Due sedute a settimana, con almeno tre giorni in mezzo.",
    ripetizioni: SCHEDA_UNO_RIPETIZIONI,
    recupero: intervallo(60, 90),
    riserva: intervallo(3, 4),
    primaSeduta: { serie: intervallo(1), riserva: intervallo(4, 5) },
    ultime: { riserva: ULTIME_RISERVA },   // il principiante partito con meno di 8 settimane, nelle ultime settimane
    aumento: { regola: "cima", ripetizioni: 15, riserva: 5 },
    quandoAumentare: "Quando in tutte le serie arrivi a 15 e potresti farne ancora 5 o più, la volta dopo un po' di peso in più.",
    esercizi: [
      { id: "leg-press", alternative: ["goblet-squat"], serie: SCHEDA_UNO_SERIE },
      { id: "step-up", serie: SCHEDA_UNO_SERIE },
      { id: "flessione-anca", serie: SCHEDA_UNO_SERIE },
      { id: "polpacci", serie: SCHEDA_UNO_SERIE },
      { id: "ponte", serie: SCHEDA_UNO_SERIE },
      { id: "rematore", serie: SCHEDA_UNO_SERIE, quandoAumentare: "Quando in tutte le serie arrivi a 15 e potresti farne ancora 5 o più, un elastico più duro." },
      {
        id: "plank-laterale", serie: SCHEDA_UNO_SERIE, ripetizioni: null, secondi: intervallo(20), crescitaSecondi: 5,
        recupero: intervallo(30), riserva: null, sforzo: "medio", quandoAumentare: "5 secondi in più ogni settimana.",
      },
    ],
  },
  2: {
    numero: 2,
    nome: "Costruzione",
    descrizione: "Due sedute a settimana, A e B, per costruire la forza delle gambe.",
    sedute: ["A", "B"],
    periodi: [
      { finoSettimana: 7, ripetizioni: { A: intervallo(8, 10), B: intervallo(10, 12) }, recupero: intervallo(120), riserva: intervallo(2, 3) },
      { finoSettimana: 12, ripetizioni: { A: intervallo(6), B: intervallo(4, 5) }, recupero: intervallo(120, 180), riserva: intervallo(2) },
    ],
    aumento: { regola: "cima" },
    quandoAumentare: "Quando in tutte le serie arrivi in cima alle ripetizioni con la riserva giusta, la volta dopo un po' di peso in più.",
    esercizi: [
      { id: "squat", alternative: ["leg-press", "goblet-squat"], serie: intervallo(3) },
      { id: "leg-press-una", alternative: ["split-squat", "step-up"], serie: intervallo(3) },
      { id: "flessione-anca", serie: intervallo(3) },
      { id: "polpacci", serie: intervallo(3) },
    ],
    tronco: true,
  },
  3: {
    numero: 3,
    nome: "Costruzione",
    descrizione: "Il metodo norvegese degli studi sui ciclisti, con pesi pesanti. Due sedute a settimana, A e B.",
    sedute: ["A", "B"],
    periodi: [
      { finoSettimana: 3, ripetizioni: { A: intervallo(10), B: intervallo(6) } },
      { finoSettimana: 6, ripetizioni: { A: intervallo(8), B: intervallo(5) } },
      { finoSettimana: 12, ripetizioni: { A: intervallo(6), B: intervallo(4) } },
    ],
    recupero: intervallo(120, 180),
    riserva: intervallo(1, 2),
    riservaDa40: intervallo(2),   // dalla scheda 9, mai fino a non farcela più, stima nostra, prudente
    aumento: { regola: "riserva", oltre: 2 },
    quandoAumentare: "Quando a fine serie potresti farne più di 2, la volta dopo un po' di peso in più.",
    esercizi: [
      {
        id: "salti-box", serie: intervallo(3), ripetizioni: intervallo(5), recupero: intervallo(120), riserva: null,
        sforzo: "fresco", facoltativo: true, quandoAumentare: null,
      },
      { id: "squat", serie: intervallo(3), nota: "Anche 4 serie, se c'è tempo." },
      { id: "leg-press-una", serie: intervallo(3) },
      { id: "stacco-rumeno", serie: intervallo(3), facoltativo: true },
      { id: "flessione-anca", serie: intervallo(3) },
      { id: "polpacci-una", serie: intervallo(3) },
    ],
    tronco: true,
  },
  4: {
    numero: 4,
    nome: "Mantenimento",
    descrizione: "Una seduta a settimana tiene la forza costruita, con gli esercizi principali e lo stesso peso.",
    minuti: intervallo(30, 40),
    serie: intervallo(2),
    ripetizioni: intervallo(5, 6),
    recupero: intervallo(120, 180),
    riserva: intervallo(2),
    breve: { serie: intervallo(1) },   // da 50 anni la seconda seduta, la tabella dice 1-2
    casa: MANTENIMENTO_CASA,           // con gli esercizi della scheda 8 restano ripetizioni e riserve di casa
    quandoAumentare: "Tieni il peso della costruzione.",
    tronco: true,
  },
  5: {
    numero: 5,
    nome: "Ultime settimane",
    descrizione: "Niente esercizi nuovi e nessun aumento di peso, così le gambe arrivano fresche alla partenza.",
    minuti: intervallo(30, 40),        // è il mantenimento
    serie: intervallo(2),              // un terzo in meno delle 3 della costruzione
    ripetizioni: intervallo(5, 6),
    recupero: intervallo(120, 180),
    riserva: intervallo(2),
    casa: MANTENIMENTO_CASA,
    leggera: { serieInMeno: 1, sforzo: "leggero", minuti: intervallo(15, 20) },   // gli ultimi 7 giorni, fino a 3 giorni prima
    quandoAumentare: "Nessun aumento di peso.",
    tronco: true,
  },
  6: {
    numero: 6,
    nome: "In viaggio",
    descrizione: "Per stare più comodo, nessun beneficio dimostrato. 5-10 minuti la sera dopo la tappa, da saltare se qualcosa fa male.",
    minuti: intervallo(5, 10),
    esercizi: [
      { id: "collo", serie: intervallo(3), secondi: intervallo(10), recupero: intervallo(10), sforzo: "leggero", nota: "Nelle 4 direzioni." },
      { id: "rematore", alternative: ["scapole-strette"], serie: intervallo(2), ripetizioni: intervallo(12, 15), recupero: intervallo(30), sforzo: "leggero" },
      { id: "plank-laterale", serie: intervallo(2), secondi: intervallo(20), recupero: intervallo(20), sforzo: "leggero" },
      { id: "mobilita", serie: intervallo(1), secondi: intervallo(20, 30), recupero: intervallo(0), sforzo: "leggero", nota: "Flessori dell'anca e petto." },
    ],
  },
  7: {
    numero: 7,
    nome: "Tronco e collo",
    descrizione: "Fianchi, schiena e collo, che in viaggio lavorano tante ore. Dopo la palestra o dopo un giro facile.",
    minuti: intervallo(15, 20),        // tronco 10-15 minuti, collo e parte alta 5
    sforzo: "medio",
    esercizi: [
      { id: "plank-laterale", serie: intervallo(2, 3), secondi: intervallo(20, 45), recupero: intervallo(30), quandoAumentare: "5-10 secondi in più a settimana, fino a 60." },
      { id: "estensione-schiena", serie: intervallo(2, 3), secondi: intervallo(20, 45), recupero: intervallo(30), quandoAumentare: "5-10 secondi in più a settimana, fino a 60." },
      { id: "bird-dog", serie: intervallo(2, 3), ripetizioni: intervallo(8, 12), lento: true, recupero: intervallo(30), quandoAumentare: "Da 8 a 12 ripetizioni." },
      { id: "dead-bug", serie: intervallo(2, 3), ripetizioni: intervallo(8, 12), lento: true, recupero: intervallo(30), quandoAumentare: "Da 8 a 12 ripetizioni." },
      { id: "collo", serie: intervallo(3, 5), secondi: intervallo(10), recupero: intervallo(10), nota: "Nelle 4 direzioni.", quandoAumentare: "Poi l'elastico in movimento, mai con dolore." },
      { id: "rematore", alternative: ["scrollate", "alzate-laterali"], serie: intervallo(2), ripetizioni: intervallo(12, 15), recupero: intervallo(30, 60), quandoAumentare: "Elastico più duro oltre 15." },
    ],
  },
  8: {
    numero: 8,
    nome: "A casa",
    descrizione: "A corpo libero, con lo zaino carico e un elastico. Lo stesso calendario della palestra.",
    ripetizioni: intervallo(8, 15),
    recupero: intervallo(120),
    riserva: intervallo(0, 2),
    riservaDa40: intervallo(1, 2),   // mai fino a non farcela più, stima nostra, prudente
    familiarizzazione: { riserva: intervallo(3, 4), primaSeduta: intervallo(4, 5) },   // le riserve della scheda 1
    aumento: { regola: "cima" },
    quandoAumentare: "Più peso nello zaino quando arrivi oltre 15.",
    esercizi: [
      { id: "split-squat", alternative: ["step-up"], serie: intervallo(3), carico: "zaino", nota: "Con lo zaino carico." },
      { id: "squat-una", serie: intervallo(3), carico: "zaino" },
      { id: "stacco-una", alternative: ["ponte-una"], serie: intervallo(3), carico: "zaino" },
      { id: "ginocchio-elastico", serie: intervallo(3), carico: "elastico", quandoAumentare: "Elastico più duro quando arrivi oltre 15." },
      { id: "polpacci-una", serie: intervallo(3), carico: "zaino", quandoAumentare: "Più peso nello zaino." },
      { id: "rematore", serie: intervallo(3), carico: "elastico", quandoAumentare: "Elastico più duro quando arrivi oltre 15." },
    ],
  },
  9: {
    numero: 9,
    nome: "Correzioni per età e ossa",
    descrizione: "Si applicano da sole, con la tua età.",
    correzioni: [
      { chi: `Da ${E.riservaDa} anni`, cosa: `Almeno ${P.familiarizzazione} settimane per cominciare. Entro le settimane 8-12 serie da 4-8, chiuse quando potresti farne ancora 2. Almeno 2 serie per gli esercizi principali, mai fino a non farcela più.` },
      { chi: `Da ${E.mantenimentoDa} anni`, cosa: "Nel mantenimento 2 sedute a settimana se si può, la seconda breve. Solleva sempre con l'idea di andare veloce." },
      { chi: `Da ${P.familiarizzazioneLungaDaAnni} anni, o senza altri sport oltre alla bici`, cosa: `${P.familiarizzazioneLunga} settimane per cominciare.` },
      { chi: `Per le ossa, da ${E.saltiDa} anni e senza problemi alle articolazioni né osteoporosi`, cosa: `Salti bassi ${S.giorni[0]}-${S.giorni[1]} giorni a settimana, da ${S.serieDa} a ${S.serieA} serie da ${S.ripetizioni}, crescendo in ${S.settimane} settimane.` },
      { chi: `Da ${E.ossaDa} anni`, cosa: TESTO_OSSA },
    ],
  },
});

// --- I testi a schermo (7.1, 7.8) ---

// I modelli hanno i segnaposto fra graffe, {durata}, {giorno}, {kg}, e si compongono con componi.
const R = P.rientro;
export const TESTI_PALESTRA = congela({
  pagina: {
    riscaldamento: "Prima, 5-10 minuti di cyclette o camminata svelta.",
    serieLeggere: "Poi 1 o 2 serie leggere del primo esercizio.",
    ritmo: "Sali deciso, con l'idea di andare veloce, e scendi in 2-3 secondi.",
    ritmoDa50: "Solleva sempre con l'idea di andare veloce, anche con i pesi pesanti.",
    maiAlLimite: "Mai fino a non farcela più.",
    respiro: "Respira, senza trattenere il fiato.",
    dolore: "Se un esercizio fa male, fermati e passa all'alternativa. Se un dolore non migliora in una o due settimane, senti il medico o il fisioterapista.",
    comeSiFa: "Come si fa",
    alternativa: "Alternativa",
    quandoAumentare: "Quando aumentare",
    facoltativo: "Facoltativo",
    segnaPesi: "Segna i pesi",
    fatta: "Fatta",
  },
  giorno: {
    giallo: "Oggi scheda leggera, stesso peso e meno serie.",
    gialloLeggero: "Una ripetizione in meno in ogni serie, niente salti.",
    gialloTronco: "Oggi tutto a sforzo moderato, senza fretta.",
    gialloLeggeroTronco: "Oggi sforzo leggero, senza salti.",
    soloAlto: "Oggi niente gambe pesanti, solo tronco, collo e parte alta.",
    ultimaPesante: "È l'ultima seduta pesante prima della partenza. Da qui solo tronco e mobilità, se vuoi.",
    leggeraFinale: "Negli ultimi giorni solo un po' di tronco, collo e mobilità, se ti va. Sforzo leggero.",
    primaSeduta: "È la prima seduta. Una serie per esercizio e pesi leggeri, il corpo impara i movimenti.",
    viaggio: "Per stare più comodo, nessun beneficio dimostrato. Saltala se qualcosa fa male.",
    sella: "In sella cambia spesso presa, usa guanti imbottiti e nelle giornate lunghe valuta un manubrio più alto.",
  },
  messaggi: {
    beneficio: `Il beneficio della palestra arriva dopo ${P.soloFamiliarizzazioneSotto}-${P.costruzioneSettimane} settimane. Quest'anno la usi per abituarti, il guadagno vero lo vedi la stagione dopo.`,
    rimandata: "Mancano poche settimane alla partenza, e la palestra non farebbe in tempo a servire. La riprendi dopo il viaggio.",
    invito: `La palestra due volte a settimana rende più leggere le ultime ore di una giornata lunga. Se ti va, si comincia con ${PIANO.sedute.palestra.minimo} minuti.`,
    sicurezza: "Prima di cominciare parlane con il medico o il fisioterapista. Intanto ti propongo solo tronco, collo e mobilità.",
    ossa: TESTO_OSSA,
    viaggio: "In viaggio niente palestra. Se ti va, 5-10 minuti la sera dopo la tappa per stare più comodo, da saltare se qualcosa fa male.",
    nessunaRoutine: "In viaggio niente palestra e niente esercizi. Pedala, mangia e dormi.",
  },
  rientro: {
    breve: "Sei stato qualche giorno senza pesi. Oggi il peso di prima, con una serie in meno.",
    media: "Torni dopo qualche settimana senza pesi. Per una settimana una serie in meno, e fermati una ripetizione prima del solito.",
    lunga: `Torni dopo più di ${R.mediaFino / 7} settimane senza pesi. Per ${R.lungaGiorni / 7} settimane serie leggere da ${SCHEDA_UNO_RIPETIZIONI.da}-${SCHEDA_UNO_RIPETIZIONI.a}, e a fine serie potresti farne ancora ${R.lungaRiserva[0]} o ${R.lungaRiserva[1]}.`,
    dopoEvento: `Dopo il viaggio si riparte piano. Le prime ${R.seduteDopoEvento} sedute sono leggere, serie da ${SCHEDA_UNO_RIPETIZIONI.da}-${SCHEDA_UNO_RIPETIZIONI.a}.`,
  },
  sforzo: {
    medio: "Sforzo medio, senza dolore.",
    leggero: "Sforzo leggero.",
    fresco: "Salti freschi, a inizio seduta.",
  },
  registra: {
    domanda: "Fatta?",
    scelte: [{ valore: "tutta", testo: "Sì, tutta" }, { valore: "leggera", testo: "Sì, leggera" }, { valore: "no", testo: "No" }],
  },
  guida: {
    promessa: "La palestra due volte a settimana probabilmente rende più leggere le ultime ore delle uscite lunghe, con meno fatica e il battito più basso. Dà più forza e più muscolo, e probabilmente ossa più forti. Non è provato che prevenga gli infortuni.",
    proteine: "Le proteine aiutano i muscoli, circa 1,6 g per kg al giorno, oltre non serve. Da 50 anni circa 0,4 g per kg a ogni pasto.",
    mobilita: "La mobilità dolce serve al comfort. Va fatta dopo l'uscita, e mai a lungo subito prima di pedalare.",
    ginocchio: "Per il dolore al tendine sotto la rotula la via con le prove è la forza pesante e lenta, meglio con un fisioterapista.",
  },
  modelli: {
    titolo: "Palestra, {nome}, circa {durata}",
    titoloBreve: "{nome}, circa {durata}",
    titoloFisso: "{nome}, {durata}",
    sottotitolo: "{n} esercizi, circa {durata}",
    sottotitoloUno: "1 esercizio, circa {durata}",
    rosso: "Oggi solo {durata} di mobilità dolce.",
    lungaVicina: "{giorno} hai la lunga di {durata}. Oggi niente gambe pesanti, solo tronco, collo e parte alta.",
    proposta: "La volta scorsa {prima}, oggi prova {kg}.",
    propostaUguale: "La volta scorsa {prima}, oggi lo stesso.",
    peso: "Scegli un peso con cui, a fine serie, potresti farne ancora {n}.",
    elastico: "Scegli un elastico con cui, a fine serie, potresti farne ancora {n}.",
    zaino: "Metti nello zaino un peso con cui, a fine serie, potresti farne ancora {n}.",
    corpo: "A fine serie dovresti poterne fare ancora {n}.",
    attivita: "Palestra, scheda {scheda}",
    attivitaSeduta: "Palestra, scheda {scheda}, seduta {seduta}",
  },
});

// Le domande della palestra al primo avvio e in Impostazioni (5.1). I valori sono quelli di profilo.palestra
// e di profilo.palestraSicurezza. Della sicurezza si tiene solo sì, no o «ne ho parlato».
export const DOMANDE_PALESTRA = congela({
  palestra: {
    testo: "La palestra?",
    scelte: [
      { valore: "no", testo: "No" },
      { valore: "conosco", testo: "Sì, la conosco" },
      { valore: "mai", testo: "Sì, ma non l'ho mai fatta" },
      { valore: "casa", testo: "Sì, ma a casa" },
    ],
    predefinita: "no",
  },
  sicurezza: {
    testo: "Hai osteoporosi, una malattia di cuore, un infortunio recente o una protesi?",
    scelte: [{ valore: "si", testo: "Sì" }, { valore: "no", testo: "No" }],
    parlato: { valore: "parlato", testo: "Ne ho parlato" },
  },
});

const T = TESTI_PALESTRA;
const M = TESTI_PALESTRA.modelli;

// Riempie i segnaposto di un modello. Un segnaposto senza valore resta com'è.
function componi(modello, valori = {}) {
  return modello.replace(/\{(\w+)\}/g, (tutto, chiave) => (chiave in valori ? String(valori[chiave]) : tutto));
}

// Le durate a parole (7.1), con formatoDurata di js/formato.js, e mai meno del passo più piccolo.
function durataTesto(minuti) {
  const m = valido(minuti) && minuti > 0 ? minuti : 0;
  return formatoDurata(Math.max(STIMA.arrotondaMinuti.passo, m));
}

const kgNumero = (kg) => numero(kg, Number.isInteger(kg) ? 0 : 1);
const kgTesto = (kg) => `${kgNumero(kg)} kg`;
const testoIntervallo = (r) => (r.da === r.a ? `${r.da}` : `${r.da}-${r.a}`);

function testoSecondi(r) {
  if (r.da >= 120 && r.da % 60 === 0 && r.a % 60 === 0) {
    return r.da === r.a ? `${r.da / 60} minuti` : `${r.da / 60}-${r.a / 60} minuti`;
  }
  return r.da === r.a ? `${r.da} secondi` : `${r.da}-${r.a} secondi`;
}

function testoRiserva(r) {
  if (r.da === r.a) return `${r.da}`;
  if (r.da === 0) return `al massimo ${r.a}`;
  if (r.a - r.da === 1) return `${r.da} o ${r.a}`;
  return `da ${r.da} a ${r.a}`;
}

const PER_LATO = { gamba: " per gamba", lato: " per lato", direzione: " per direzione" };

function testoSerie(v) {
  const serie = `${testoIntervallo(v.serie)} serie`;
  const lato = PER_LATO[v.lato] || "";
  if (v.secondi) return `${serie} da ${testoSecondi(v.secondi)}${lato}`;
  if (v.ripetizioni) return `${serie} da ${testoIntervallo(v.ripetizioni)}${lato}${v.lento ? ", lente" : ""}`;
  return serie;
}

function testoPeso(v) {
  if (v.riserva) return componi(M[v.carico] || M.peso, { n: testoRiserva(v.riserva) });
  return v.sforzo ? T.sforzo[v.sforzo] : null;
}

function testoAlternativa(v) {
  const nomi = v.alternative.filter((id) => ESERCIZI[id]).map((id, i) => {
    const nome = ESERCIZI[id].nome;
    return i ? nome.charAt(0).toLowerCase() + nome.slice(1) : nome;
  });
  const pezzi = [];
  if (nomi.length) pezzi.push(`${nomi.length === 1 ? nomi[0] : `${nomi.slice(0, -1).join(", ")} o ${nomi[nomi.length - 1]}`}.`);
  if (ESERCIZI[v.id].varianti) pezzi.push(ESERCIZI[v.id].varianti);
  return pezzi.length ? pezzi.join(" ") : null;
}

function conTesti(v) {
  const es = ESERCIZI[v.id];
  let proposta = null;
  if (valido(v.kg)) {
    proposta = v.aumento
      ? componi(M.proposta, { prima: kgTesto(v.kgPrima), kg: kgNumero(v.kg) })
      : componi(M.propostaUguale, { prima: kgTesto(v.kgPrima) });
  }
  v.testi = {
    serie: testoSerie(v),
    recupero: v.recupero && v.recupero.a > 0 ? `Riposa ${testoSecondi(v.recupero)} fra le serie` : null,
    peso: testoPeso(v),
    proposta,
    come: es.come,
    dettaglio: es.dettaglio,
    serve: es.serve,
    alternativa: testoAlternativa(v),
    nota: v.nota,
    quandoAumentare: v.quandoAumentare,
  };
  return v;
}

// --- Profilo, livello e registro ---

const PALESTRE = ["no", "conosco", "mai", "casa"];
const SICUREZZE = ["no", "si", "parlato"];

// profilo.eta in anni (o fasciaEta, l'indice delle fasce di 7.3 oppure il loro nome, «40-49», come
// lo salva il primo avvio), profilo.palestra con le risposte di DOMANDE_PALESTRA,
// profilo.palestraSicurezza, e profilo.altriSport se si sa.
function leggiProfilo(profilo) {
  const p = profilo && typeof profilo === "object" ? profilo : {};
  let eta = valido(p.eta) ? p.eta : null;
  const fascia = Number.isInteger(p.fasciaEta) ? p.fasciaEta : SEMAFORO.fasceEta.indexOf(p.fasciaEta);
  if (eta === null && fascia >= 0) eta = PIANO.limiteFacile.etaCentri[fascia] ?? null;
  return {
    eta: eta === null ? E.predefinita : eta,
    palestra: PALESTRE.includes(p.palestra) ? p.palestra : "no",
    sicurezza: SICUREZZE.includes(p.palestraSicurezza) ? p.palestraSicurezza : null,
    altriSport: typeof p.altriSport === "boolean" ? p.altriSport : null,
  };
}

const LIVELLI = {
  "verde": "verde", "giallo-leggero": "giallo-leggero", "gialloLeggero": "giallo-leggero",
  "giallo": "giallo", "rosso": "rosso", "stop": "rosso", "nessuno": "nessuno",
};

// Il livello del semaforo, una stringa o { livello, gambeIndolenzite, lungaVicina }. Un livello che non
// si riconosce vale «nessuno», cioè niente sforzi al massimo.
function leggiLivello(livello) {
  const o = livello && typeof livello === "object" ? livello : { livello };
  return {
    livello: LIVELLI[o.livello] || "nessuno",
    gambeIndolenzite: o.gambeIndolenzite === true,
    lungaVicina: o.lungaVicina ? (typeof o.lungaVicina === "object" ? o.lungaVicina : {}) : null,
  };
}

const ID = /^[a-z0-9-]+$/;
const PAROLA = /^[A-Za-z][A-Za-z-]*$/;
const numeroO = (v) => (valido(v) ? v : null);
const parola = (v) => (typeof v === "string" && PAROLA.test(v) ? v : null);

function normalizzaVoceFatta(e) {
  if (!e || typeof e.id !== "string" || !ID.test(e.id)) return null;
  return { id: e.id, serie: numeroO(e.serie), ripetizioni: numeroO(e.ripetizioni), secondi: numeroO(e.secondi), kg: numeroO(e.kg), riserva: numeroO(e.riserva) };
}

// La forma unica di una seduta fatta, quella del registro sul telefono e della riga [come-sto v1].
function normalizzaFatta(s) {
  if (!s || typeof s !== "object") return null;
  return {
    data: dataValida(s.data) ? s.data : null,
    scheda: Number.isInteger(s.scheda) ? s.scheda : null,
    seduta: parola(s.seduta),
    settimana: Number.isInteger(s.settimana) && s.settimana > 0 ? s.settimana : null,
    minuti: valido(s.minuti) && s.minuti >= 0 ? s.minuti : null,
    sforzo: valido(s.sforzo) && s.sforzo >= 0 ? s.sforzo : null,
    allenato: ["gambe", "corpo", "alto"].includes(s.allenato) ? s.allenato : null,
    fatta: ["tutta", "leggera"].includes(s.fatta) ? s.fatta : null,
    livello: parola(s.livello),
    esercizi: (Array.isArray(s.esercizi) ? s.esercizi : []).map(normalizzaVoceFatta).filter(Boolean),
  };
}

// Il registro, con le sedute più recenti per prime.
function registroValido(registro) {
  return (Array.isArray(registro) ? registro : [])
    .map(normalizzaFatta)
    .filter((s) => s && s.data)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}

const FORZA = new Set([1, 2, 3, 4, 5, 8]);

// Una seduta con i pesi. Dal dispositivo senza risposta vale come corpo intero, come in 6.3.
function conPesi(s) {
  if (s.allenato) return s.allenato !== "alto";
  if (s.scheda === null) return true;
  return FORZA.has(s.scheda) && !(s.scheda === 5 && s.seduta === "leggera");
}

const familiarizzazioneDi = (pr) => (pr.eta >= P.familiarizzazioneLungaDaAnni || pr.altriSport === false
  ? P.familiarizzazioneLunga : P.familiarizzazione);

function normalizzaSeduta(n, seduta) {
  const s = typeof seduta === "string" ? seduta : null;
  if (n === 2 || n === 3) return s === "B" ? "B" : "A";
  if (n === 4) return s === "breve" ? "breve" : null;
  if (n === 5) return s === "ultima" || s === "leggera" ? s : "pesante";
  if (n === 1) return s === "ultime" ? "ultime" : null;
  if (n === 8) return s === "ultime" || s === "familiarizzazione" ? s : null;
  return null;
}

// --- In che fase si è (5.1) ---

function messaggio(chiave, quando) {
  return { chiave, testo: T.messaggi[chiave], quando };
}

function troncoDelGiorno(d, nelleSedute) {
  if (d === null || d > P.giorniSenzaGambe) return { scheda: 7, aSettimana: [...P.troncoVolte], nelleSedute };
  if (d >= P.troncoFinoA) return { scheda: 5, variante: "leggera", facoltativa: true };
  return null;
}

// Il lunedì della prima settimana del percorso di palestra.
function inizioPercorso(oggi, k) {
  return dataValida(oggi) ? piuGiorni(oggi, -giornoDellaSettimana(oggi) - 7 * (k - 1)) : null;
}

// Chi dice «la conosco» ma ha l'ultima seduta con i pesi più di 6 mesi prima di cominciare rifà il
// percorso dei principianti (regola 4.1). Senza sedute nel registro vale la risposta.
function percorsoDi(pr, registro, inizio) {
  if (pr.palestra === "casa") return "casa";
  if (pr.palestra !== "conosco") return "principiante";
  if (inizio) {
    const prima = registroValido(registro).find((s) => conPesi(s) && s.data < inizio);
    if (prima && giorniFra(prima.data, inizio) > P.pausaPrincipianteGiorni) return "principiante";
  }
  return "esperto";
}

function costruzione(k, percorso, F) {
  if (percorso === "esperto") return { scheda: 3, familiarizzazione: false, settimanaBlocco: k };
  const fam = k <= F;
  if (percorso === "casa") return { scheda: 8, familiarizzazione: fam, settimanaBlocco: fam ? k : k - F };
  return { scheda: fam ? 1 : 2, familiarizzazione: fam, settimanaBlocco: fam ? k : k - F };
}

function conTetto(fase, piano) {
  const massimo = intero(piano.palestraMassima);
  if (massimo !== null && fase.sedute > massimo) fase.sedute = Math.max(0, massimo);
  if (fase.sedute < 2) fase.sedutaBreve = false;
  return fase;
}

// La fase di palestra per oggi. piano porta solo quello che serve, vedi il resoconto e la prova:
// con la data settimane (N, le settimane del piano dalla −N alla −1), settimaneAllaPartenza (w, la
// settimana di oggi è la −w, 0 nei giorni fra la −1 e la partenza), giorniAllaPartenza (0 il giorno
// del via, negativi in viaggio), giorniEvento, schema (il nome dello schema del piano, con lo schema
// B chi non ha mai fatto palestra fa solo la familiarizzazione) e, se c'è, palestraMassima (le sedute
// che lo schema ammette in questa settimana). Senza data settimanaPiano, 1 la settimana in cui è
// nato il piano. registro serve solo a riconoscere chi torna da più di 6 mesi di pausa.
export function fasePalestra(piano, profilo, oggi = null, registro = []) {
  const pr = leggiProfilo(profilo);
  const fase = {
    fase: "nessuna", scheda: null, settimana: null, sedute: 0, sedutaBreve: false, percorso: null,
    familiarizzazione: false, settimanaBlocco: null, variante: null, facoltativa: false,
    gambeFinoA: null, troncoFinoA: null, ultimaPesante: null, tronco: null, messaggi: [], chiedi: null,
  };
  if (pr.eta >= E.ossaDa) fase.messaggi.push(messaggio("ossa", "una-volta"));
  if (pr.palestra === "no") {
    fase.tronco = { scheda: 7, minuti: P.troncoSenzaPalestra, dopo: "facile" };
    fase.messaggi.push(messaggio("invito", "al-mese"));
    return fase;
  }
  if (pr.sicurezza === null || pr.sicurezza === "si") {
    fase.fase = "solo-tronco";
    fase.scheda = 7;
    fase.sedute = P.troncoVolte[0];
    if (pr.sicurezza === "si") fase.messaggi.push(messaggio("sicurezza", "sempre"));
    else fase.chiedi = "sicurezza";
    return fase;
  }
  if (!piano || typeof piano !== "object") return fase;

  const w = intero(piano.settimaneAllaPartenza);
  const d = intero(piano.giorniAllaPartenza);
  if (w === null || d === null) return faseLibera(fase, piano, pr, oggi, registro);

  if (d <= 0) {
    const G = Math.max(1, intero(piano.giorniEvento) ?? 1);
    if (d <= -G) return { ...fase, fase: "dopo" };
    fase.fase = "evento";
    if (G >= P.viaggioDaGiorni) {
      fase.scheda = 6;
      fase.facoltativa = true;
      fase.messaggi.push(messaggio("viaggio", "sempre"));
    } else {
      fase.messaggi.push(messaggio("nessunaRoutine", "sempre"));
    }
    return fase;
  }

  const k0 = intero(piano.settimanaPiano);
  let N = intero(piano.settimane);
  if (N === null) N = k0 !== null ? k0 + w - 1 : w;
  N = Math.max(N, w, 1);
  const k = N - Math.max(w, 0) + 1;
  const percorso = percorsoDi(pr, registro, inizioPercorso(oggi, k));
  const F = familiarizzazioneDi(pr);
  fase.percorso = percorso;
  fase.troncoFinoA = P.troncoFinoA;

  if (N <= P.rimandaFinoA) {
    fase.fase = "rimandata";
    fase.messaggi.push(messaggio("rimandata", "sempre"));
    fase.tronco = troncoDelGiorno(d, 0);
    return fase;
  }

  // Chi comincia con meno di 8 settimane davanti, o con lo schema B, fa solo la familiarizzazione,
  // ferma 14 giorni prima (3.4 e regola 4.2).
  if (percorso !== "esperto" && (N < P.soloFamiliarizzazioneSotto || P.soloFamiliarizzazioneSchemi.includes(piano.schema))) {
    const ultime = w <= P.ultimeSettimane;
    Object.assign(fase, {
      fase: ultime ? "ultime" : "costruzione", settimana: k, settimanaBlocco: k, familiarizzazione: true,
      gambeFinoA: P.ultimaPesanteFamiliarizzazione.a, ultimaPesante: { ...P.ultimaPesanteFamiliarizzazione },
    });
    fase.messaggi.push(messaggio("beneficio", "sempre"));
    if (d >= fase.gambeFinoA) {
      fase.scheda = percorso === "casa" ? 8 : 1;
      fase.sedute = ultime ? P.sedute.ultime : P.sedute.costruzione;
      fase.variante = ultime ? "ultime" : (percorso === "casa" ? "familiarizzazione" : null);
    }
    conTetto(fase, piano);
    fase.tronco = troncoDelGiorno(d, 0);
    return fase;
  }

  const C = Math.min(P.costruzioneSettimane, N - P.ultimeSettimane);
  fase.gambeFinoA = P.giorniSenzaGambe + 1;
  fase.ultimaPesante = { ...P.ultimaPesante };
  if (w > P.ultimeSettimane && k <= C) {
    Object.assign(fase, { fase: "costruzione", settimana: k, sedute: P.sedute.costruzione }, costruzione(k, percorso, F));
  } else if (w > P.ultimeSettimane) {
    const da50 = pr.eta >= E.mantenimentoDa;
    Object.assign(fase, {
      fase: "mantenimento", scheda: 4, settimana: k - C, settimanaBlocco: k - C,
      sedute: da50 ? P.sedute.mantenimentoDa50 : P.sedute.mantenimento, sedutaBreve: da50,
    });
  } else {
    const settimana = P.ultimeSettimane - w + 1;
    Object.assign(fase, { fase: "ultime", settimana, settimanaBlocco: settimana });
    if (d > P.giorniSenzaGambe) {
      Object.assign(fase, { scheda: 5, sedute: P.sedute.ultime, variante: "pesante" });
    } else if (d >= P.troncoFinoA) {
      Object.assign(fase, { scheda: 5, sedute: 0, variante: "leggera", facoltativa: true });
    }
  }
  conTetto(fase, piano);
  const dentro = [2, 3, 4].includes(fase.scheda) || fase.variante === "pesante" ? fase.sedute : 0;
  fase.tronco = troncoDelGiorno(d, dentro);
  return fase;
}

// Senza data, costruzione e poi mantenimento, senza le ultime settimane (5.1).
function faseLibera(fase, piano, pr, oggi, registro) {
  const k = Math.max(1, intero(piano.settimanaPiano) ?? 1);
  const percorso = percorsoDi(pr, registro, inizioPercorso(oggi, k));
  const C = P.costruzioneSettimane;
  fase.percorso = percorso;
  if (k <= C) {
    Object.assign(fase, { fase: "costruzione", settimana: k, sedute: P.sedute.costruzione }, costruzione(k, percorso, familiarizzazioneDi(pr)));
  } else {
    const da50 = pr.eta >= E.mantenimentoDa;
    Object.assign(fase, {
      fase: "mantenimento", scheda: 4, settimana: k - C, settimanaBlocco: k - C,
      sedute: da50 ? P.sedute.mantenimentoDa50 : P.sedute.mantenimento, sedutaBreve: da50,
    });
  }
  conTetto(fase, piano);
  fase.tronco = troncoDelGiorno(null, [2, 3, 4].includes(fase.scheda) ? fase.sedute : 0);
  return fase;
}

// --- Gli esercizi di una seduta ---

function prendi(livelli, chiave, base = null) {
  for (const l of livelli) {
    if (l && Object.prototype.hasOwnProperty.call(l, chiave)) return l[chiave];
  }
  return base;
}

const perSeduta = (valore, seduta) => (valore && typeof valore === "object" && "A" in valore ? valore[seduta === "B" ? "B" : "A"] : valore);
const piuRiserva = (r, quante) => ({ da: r.da + quante, a: r.a + quante });
const almeno = (r, minimo) => ({ da: Math.max(r.da, minimo.da), a: Math.max(r.a, minimo.a) });
const menoSerie = (serie, quante) => ({ da: Math.max(1, serie.da - quante), a: Math.max(1, serie.a - quante) });

function nuovaVoce(riga, livelli, seduta, blocco = null) {
  const es = ESERCIZI[riga.id];
  return {
    id: riga.id,
    nome: es.nome,
    gruppo: es.gruppo,
    blocco: blocco || (es.gruppo === "salti" ? "salti" : "forza"),
    serie: copia(prendi(livelli, "serie", intervallo(1))),
    ripetizioni: copia(perSeduta(prendi(livelli, "ripetizioni"), seduta)),
    secondi: copia(prendi(livelli, "secondi")),
    recupero: copia(prendi(livelli, "recupero", intervallo(0))),
    riserva: copia(prendi(livelli, "riserva")),
    sforzo: prendi(livelli, "sforzo"),
    carico: prendi(livelli, "carico", es.carico),
    lato: es.lato,
    lento: prendi(livelli, "lento", false) === true,
    facoltativo: prendi(livelli, "facoltativo", false) === true,
    grande: es.grande,
    nota: prendi(livelli, "nota"),
    alternative: [...prendi(livelli, "alternative", es.alternative)],
    quandoAumentare: prendi(livelli, "quandoAumentare"),
    kg: null,
    kgPrima: null,
    aumento: false,
  };
}

function vociSchedaUno(settimana, seduta, registro) {
  const s = SCHEDE[1];
  const prima = !registro.some((r) => r.scheda === 1);
  return s.esercizi.map((riga) => {
    const v = nuovaVoce(riga, [riga, s], seduta);
    if (prima) {
      v.serie = { ...s.primaSeduta.serie };
      if (v.riserva) v.riserva = { ...s.primaSeduta.riserva };
    }
    if (seduta === "ultime" && v.riserva) v.riserva = almeno(v.riserva, s.ultime.riserva);
    if (v.secondi && riga.crescitaSecondi) v.secondi = intervallo(v.secondi.da + riga.crescitaSecondi * (settimana - 1));
    return v;
  });
}

function vociCostruzione(n, settimana, seduta, pr) {
  const s = SCHEDE[n];
  const periodo = s.periodi.find((p) => settimana <= p.finoSettimana) || s.periodi[s.periodi.length - 1];
  const da40 = pr.eta >= E.riservaDa;
  return s.esercizi.map((riga) => {
    const livelli = [riga, periodo, s];
    const v = nuovaVoce(riga, livelli, seduta);
    const r40 = prendi(livelli, "riservaDa40");
    if (da40 && v.riserva && r40) v.riserva = { ...r40 };
    return v;
  });
}

// La scheda della costruzione della persona, per gli esercizi principali di mantenimento e ultime settimane.
function costruzioneDi(pr, registro) {
  if (pr.palestra === "casa") return 8;
  const fatta = registro.find((r) => r.scheda === 2 || r.scheda === 3);
  if (fatta) return fatta.scheda;
  return pr.palestra === "conosco" ? 3 : 2;
}

function vociMantenimento(n, seduta, pr, registro) {
  const s = SCHEDE[n];
  const c = costruzioneDi(pr, registro);
  const variante = c === 8 ? s.casa : {};
  const serie = n === 4 && seduta === "breve" ? s.breve.serie : s.serie;
  const da40 = pr.eta >= E.riservaDa;
  return SCHEDE[c].esercizi
    .filter((riga) => ESERCIZI[riga.id].gruppo === "gambe" && !riga.facoltativo)
    .map((riga) => {
      const propria = { id: riga.id, serie };
      for (const chiave of ["alternative", "carico", "nota"]) if (chiave in riga) propria[chiave] = riga[chiave];
      const v = nuovaVoce(propria, [propria, variante, s], seduta);
      const r40 = prendi([variante, s], "riservaDa40");
      if (da40 && v.riserva && r40) v.riserva = { ...r40 };
      return v;
    });
}

function vociTronco() {
  const s = SCHEDE[7];
  return s.esercizi.map((riga) => nuovaVoce(riga, [riga, s], null, "tronco"));
}

// Gli ultimi 7 giorni, fino a 3 giorni prima. Una serie in meno della scheda 7, la mobilità, sforzo leggero.
function vociLeggere() {
  const l = SCHEDE[5].leggera;
  const voci = vociTronco().map((v) => ({ ...v, serie: menoSerie(v.serie, l.serieInMeno), sforzo: l.sforzo }));
  const mobilita = { id: "mobilita", serie: intervallo(1), secondi: intervallo(20, 30), recupero: intervallo(0), sforzo: l.sforzo };
  voci.push(nuovaVoce(mobilita, [mobilita], null, "mobilita"));
  return voci;
}

function vociViaggio() {
  const s = SCHEDE[6];
  return s.esercizi.map((riga) => nuovaVoce(riga, [riga, s], null, riga.id === "mobilita" ? "mobilita" : "tronco"));
}

function vociCasa(settimana, seduta, pr, registro) {
  const s = SCHEDE[8];
  const fam = seduta === "familiarizzazione" || seduta === "ultime" || settimana <= familiarizzazioneDi(pr);
  const prima = !registro.some((r) => r.scheda === 8);
  const da40 = pr.eta >= E.riservaDa;
  return s.esercizi.map((riga) => {
    const v = nuovaVoce(riga, [riga, s], seduta);
    if (v.riserva) {
      if (fam) v.riserva = { ...(prima ? s.familiarizzazione.primaSeduta : s.familiarizzazione.riserva) };
      else if (da40) v.riserva = { ...s.riservaDa40 };
      if (seduta === "ultime") v.riserva = almeno(v.riserva, SCHEDE[1].ultime.riserva);
    }
    return v;
  });
}

function vociScheda(n, settimana, seduta, pr, registro) {
  if (n === 1) return vociSchedaUno(settimana, seduta, registro);
  if (n === 2 || n === 3) return vociCostruzione(n, settimana, seduta, pr);
  if (n === 4) return vociMantenimento(4, seduta, pr, registro);
  if (n === 5) return seduta === "leggera" ? vociLeggere() : vociMantenimento(5, seduta, pr, registro);
  if (n === 6) return vociViaggio();
  if (n === 7) return vociTronco();
  if (n === 8) return vociCasa(settimana, seduta, pr, registro);
  return [];
}

// I salti bassi per le ossa (scheda 9), facoltativi a inizio seduta, crescendo in 4 settimane.
function voceSalti(settimana) {
  const riga = {
    id: "salti-bassi", serie: intervallo(Math.min(S.serieA, S.serieDa + settimana - 1)), ripetizioni: intervallo(S.ripetizioni),
    recupero: intervallo(S.recupero), sforzo: "leggero", facoltativo: true,
    nota: `${S.giorni[0]}-${S.giorni[1]} giorni a settimana, anche a casa.`,
  };
  return nuovaVoce(riga, [riga], null, "salti");
}

// I salti cominciano con la scheda che segue la familiarizzazione, e nel mantenimento sono già cresciuti.
function settimanaSalti(n, settimana, pr) {
  if (n === 4 || n === 5) return S.settimane;
  if (n === 2 || n === 8) return Math.max(1, settimana - familiarizzazioneDi(pr));
  return settimana;
}

// Niente salti nella familiarizzazione, nella seduta breve e negli ultimi 7 giorni, e mai dopo un sì
// alla domanda di sicurezza, anche dopo «ne ho parlato» (stima nostra, prudente).
function vuoleSaltiOssa(n, seduta, settimana, pr, voci) {
  if (pr.eta < E.saltiDa || pr.sicurezza !== "no") return false;
  if (voci.some((v) => v.gruppo === "salti")) return false;
  if (n === 7) return true;
  if (n === 1 || seduta === "breve" || seduta === "leggera") return false;
  if (n === 8 && (seduta === "familiarizzazione" || seduta === "ultime" || settimana <= familiarizzazioneDi(pr))) return false;
  return FORZA.has(n);
}

// Le sedute saltate (regola 4.8), solo sugli esercizi della scheda, non su tronco e collo.
function applicaRientro(voci, r) {
  const fuori = r.volumeScheda1 ? voci.filter((v) => v.gruppo !== "salti") : voci;
  for (const v of fuori) {
    if (v.blocco !== "forza") continue;
    if (r.volumeScheda1) {
      v.serie = { ...SCHEDA_UNO_SERIE };
      if (v.ripetizioni) v.ripetizioni = { ...SCHEDA_UNO_RIPETIZIONI };
      if (v.riserva) v.riserva = intervallo(R.lungaRiserva[0], R.lungaRiserva[1]);
    } else {
      if (r.serieInMeno) v.serie = menoSerie(v.serie, r.serieInMeno);
      if (r.riservaInPiu && v.riserva) v.riserva = piuRiserva(v.riserva, r.riservaInPiu);
    }
  }
  return fuori;
}

// Il semaforo (regola 4.5 e tabella di 3.10). Il Rosso ha la sua seduta, la mobilità.
function applicaLivello(voci, lv, righe, soloAlto, forza) {
  const livello = lv.livello;
  if (livello === "verde") return voci;
  let fuori = voci.filter((v) => v.gruppo !== "salti");
  if (livello === "giallo") fuori = fuori.filter((v) => !v.facoltativo);
  for (const v of fuori) {
    if (v.riserva) v.riserva = piuRiserva(v.riserva, P.riservaInPiu);
    if (livello === "giallo") {
      if (v.blocco === "forza" && v.gruppo === "gambe") {
        v.serie = { da: Math.max(1, Math.floor(v.serie.da * P.gialloSerie)), a: Math.max(1, Math.floor(v.serie.a * P.gialloSerie)) };
      }
    } else if (v.sforzo === "medio") {
      v.sforzo = "leggero";
    }
  }
  if (soloAlto) return fuori;
  if (forza) righe.unshift(livello === "giallo" ? T.giorno.giallo : T.giorno.gialloLeggero);
  else righe.unshift(livello === "giallo" ? T.giorno.gialloTronco : T.giorno.gialloLeggeroTronco);
  return fuori;
}

function proponiPesi(voci, n, seduta, settimana, pr, registro, aumenta) {
  for (const v of voci) {
    if (v.blocco !== "forza" || !v.riserva || (v.carico !== "peso" && v.carico !== "zaino")) continue;
    const proposta = pesoProposto(registro, v.id, n, { seduta, settimana, profilo: pr, ripetizioni: v.ripetizioni, aumenta });
    if (proposta) Object.assign(v, { kg: proposta.kg, kgPrima: proposta.prima, aumento: proposta.aumento });
  }
}

// I minuti della seduta, dal lavoro e dai recuperi, mai oltre quelli che dice la tabella della scheda
// (5.2 e 5.4). Una seduta ridotta dal semaforo o dal rientro resta più corta.
function stimaMinuti(voci, conRiscaldamento, massimo) {
  const d = P.durata;
  let secondi = conRiscaldamento ? d.riscaldamento * 60 : 0;
  for (const v of voci) {
    if (v.facoltativo) continue;
    const volte = v.lato === "gamba" || v.lato === "lato" ? 2 : v.lato === "direzione" ? 4 : 1;
    const lavoro = (v.secondi ? meta(v.secondi) : v.ripetizioni ? meta(v.ripetizioni) * d.secondiRipetizione : 0) * volte;
    const serie = v.serie.da;
    secondi += serie * lavoro + Math.max(0, serie - 1) * meta(v.recupero) + d.cambio * 60;
  }
  return Math.min(massimo, Math.max(d.arrotonda, Math.round(secondi / 60 / d.arrotonda) * d.arrotonda));
}

function minutiMassimi(n, seduta, soloAlto) {
  if (soloAlto) return SCHEDE[7].minuti.a;
  if (n === 5 && seduta === "leggera") return SCHEDE[5].leggera.minuti.a;
  return SCHEDE[n].minuti ? SCHEDE[n].minuti.a : PIANO.sedute.palestra.massimo;
}

function allenatoDi(voci) {
  const gambe = voci.some((v) => v.blocco === "forza" && v.gruppo === "gambe");
  const altro = voci.some((v) => ["tronco", "collo", "alto"].includes(v.gruppo));
  if (gambe) return altro ? "corpo" : "gambe";
  return "alto";
}

function testoLungaVicina(lunga) {
  if (!lunga || !valido(lunga.minuti)) return null;
  let giorno = typeof lunga.giorno === "string" && lunga.giorno ? lunga.giorno : null;
  if (!giorno && dataValida(lunga.data)) giorno = NOMI_GIORNI[giornoDellaSettimana(lunga.data)];
  if (!giorno) return null;
  return componi(M.lungaVicina, { giorno: giorno.charAt(0).toUpperCase() + giorno.slice(1), durata: durataTesto(lunga.minuti) });
}

function sedutaMobilita(n, seduta, settimana) {
  const minuti = PIANO.sedute.mobilitaRosso;
  const riga = { id: "mobilita", serie: intervallo(1), secondi: intervallo(20, 30), recupero: intervallo(0), sforzo: "leggero" };
  const voce = conTesti(nuovaVoce(riga, [riga], null, "mobilita"));
  const durata = durataTesto(minuti);
  return {
    scheda: n, seduta, settimana, livello: "rosso", nome: ESERCIZI.mobilita.nome,
    titolo: componi(M.titoloFisso, { nome: ESERCIZI.mobilita.nome, durata }),
    sottotitolo: componi(M.sottotitoloUno, { durata }),
    quanti: 1, minuti, allenato: "alto", facoltativa: false, riscaldamento: [],
    righe: [componi(M.rosso, { durata })], avvertenze: [T.pagina.respiro], esercizi: [voce], rientro: null,
  };
}

// La seduta di oggi (5.4 e 5.5). scheda e settimana come da fasePalestra, seduta «A» o «B» nelle
// schede 2 e 3, «breve» per la seconda seduta da 50 anni, «pesante», «ultima» o «leggera» nella
// scheda 5, «ultime» o «familiarizzazione» per chi fa solo la familiarizzazione. livello è il colore
// del semaforo, anche come { livello, gambeIndolenzite, lungaVicina: { giorno o data, minuti } }.
// contesto porta oggi (per il rientro dopo una pausa), fineEvento, o il rientro già calcolato.
export function sedutaPalestra(scheda, settimana, seduta, profilo, registro = [], livello = "verde", contesto = {}) {
  const n = Number(scheda);
  if (!Number.isInteger(n) || n < 1 || n > 8) return null;
  const pr = leggiProfilo(profilo);
  const lv = leggiLivello(livello);
  const sett = Math.max(1, intero(settimana) ?? 1);
  const tipo = normalizzaSeduta(n, seduta);
  const reg = registroValido(registro);
  const ctx = contesto && typeof contesto === "object" ? contesto : {};
  const forza = FORZA.has(n) && tipo !== "leggera";
  let rientro = null;
  if (forza && Object.prototype.hasOwnProperty.call(ctx, "rientro")) rientro = ctx.rientro || null;
  else if (forza && dataValida(ctx.oggi)) rientro = rientroDopoPausa(reg, ctx.oggi, ctx.fineEvento);

  if (lv.livello === "rosso") return sedutaMobilita(n, tipo, sett);

  const righe = [];
  const soloAlto = forza && Boolean(lv.lungaVicina || (lv.livello === "giallo" && lv.gambeIndolenzite));
  let nome = SCHEDE[n].nome;
  let voci;
  if (soloAlto) {
    voci = vociTronco();
    nome = SCHEDE[7].nome;
    rientro = null;
    righe.push(testoLungaVicina(lv.lungaVicina) || T.giorno.soloAlto);
  } else {
    voci = vociScheda(n, sett, tipo, pr, reg);
    if (forza && SCHEDE[n].tronco && tipo !== "breve") voci.push(...vociTronco());
    if (pr.sicurezza !== "no") voci = voci.filter((v) => v.gruppo !== "salti");
    if (vuoleSaltiOssa(n, tipo, sett, pr, voci)) voci.unshift(voceSalti(settimanaSalti(n, sett, pr)));
    if (n === 1 && !reg.some((r) => r.scheda === 1)) righe.push(T.giorno.primaSeduta);
    if (n === 5 && tipo === "ultima") righe.push(T.giorno.ultimaPesante);
    if (n === 5 && tipo === "leggera") righe.push(T.giorno.leggeraFinale);
    if (n === 6) righe.push(T.giorno.viaggio, T.giorno.sella);
    if (rientro) {
      voci = applicaRientro(voci, rientro);
      righe.push(rientro.testo);
    }
  }
  voci = applicaLivello(voci, lv, righe, soloAlto, forza);
  proponiPesi(voci, n, tipo, sett, pr, reg, lv.livello === "verde" && !rientro);
  voci.forEach(conTesti);

  const conRiscaldamento = forza && !soloAlto;
  const minuti = stimaMinuti(voci, conRiscaldamento, minutiMassimi(n, tipo, soloAlto));
  const durata = durataTesto(minuti);
  const conta = voci.filter((v) => !v.facoltativo).length || voci.length;
  const avvertenze = [];
  if (conRiscaldamento) avvertenze.push(T.pagina.ritmo);
  if (conRiscaldamento && pr.eta >= E.mantenimentoDa) avvertenze.push(T.pagina.ritmoDa50);
  if (voci.some((v) => v.riserva)) avvertenze.push(T.pagina.maiAlLimite);
  avvertenze.push(T.pagina.respiro, T.pagina.dolore);
  return {
    scheda: n,
    seduta: tipo,
    settimana: sett,
    livello: lv.livello,
    nome,
    titolo: componi(conRiscaldamento ? M.titolo : M.titoloBreve, { nome, durata }),
    sottotitolo: componi(conta === 1 ? M.sottotitoloUno : M.sottotitolo, { n: conta, durata }),
    quanti: conta,
    minuti,
    allenato: allenatoDi(voci),
    facoltativa: n === 6 || tipo === "leggera",
    riscaldamento: conRiscaldamento ? [T.pagina.riscaldamento, T.pagina.serieLeggere] : [],
    righe,
    avvertenze,
    esercizi: voci,
    rientro: rientro ? rientro.tipo : null,
  };
}

// --- Il peso della volta dopo (regola 4.3) ---

const COSTRUZIONE = new Set([1, 2, 3, 8]);
const arrotonda = (kg) => Math.round(kg / P.arrotondaKg) * P.arrotondaKg;

function voceDi(n, settimana, seduta, id, pr, registro) {
  return vociScheda(n, settimana, normalizzaSeduta(n, seduta), pr, registro).find((v) => v.id === id) || null;
}

// Il peso proposto per un esercizio. registro è la lista delle sedute fatte, esercizio l'id, scheda
// quella di oggi. In opzioni seduta, settimana e profilo dicono le ripetizioni e la riserva di oggi,
// ripetizioni le sostituisce, aumenta false tiene il peso (semaforo non verde, rientro).
// Restituisce null senza un peso segnato, altrimenti { kg, prima, aumento, pronto }.
export function pesoProposto(registro, esercizio, scheda, opzioni = {}) {
  const id = typeof esercizio === "string" ? esercizio : esercizio && esercizio.id;
  const n = Number(scheda);
  if (!ESERCIZI[id] || !FORZA.has(n)) return null;
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const pr = leggiProfilo(o.profilo);
  const reg = registroValido(registro);
  const seduta = normalizzaSeduta(n, o.seduta);
  const settimana = Math.max(1, intero(o.settimana) ?? 1);
  const oggiVoce = voceDi(n, settimana, seduta, id, pr, reg);
  const obiettivo = o.ripetizioni || (oggiVoce && oggiVoce.ripetizioni) || null;

  const fatte = [];
  for (const s of reg) {
    for (const e of s.esercizi) {
      if (e.id === id && valido(e.kg) && e.kg > 0) fatte.push({ ...e, scheda: s.scheda, seduta: s.seduta, settimana: s.settimana });
    }
  }
  if (!fatte.length || !obiettivo) return null;

  // La volta prima nella stessa scheda, nella stessa seduta e con le stesse ripetizioni.
  if (COSTRUZIONE.has(n)) {
    const stessa = fatte.find((f) => {
      if (f.scheda !== n || ((n === 2 || n === 3) && f.seduta !== seduta)) return false;
      if (f.settimana !== null) {
        const sua = voceDi(n, f.settimana, f.seduta, id, pr, reg);
        return Boolean(sua && sua.ripetizioni && sua.ripetizioni.da === obiettivo.da && sua.ripetizioni.a === obiettivo.a);
      }
      return valido(f.ripetizioni) && f.ripetizioni >= obiettivo.da && f.ripetizioni <= obiettivo.a;
    });
    if (stessa) {
      const pronto = prontoPerAumentare(stessa, n, obiettivo, oggiVoce);
      if (pronto && o.aumenta !== false) {
        const kg = arrotonda(stessa.kg * (1 + (ESERCIZI[id].grande ? P.aumento.gambe : P.aumento.altri)));
        return { kg, prima: stessa.kg, aumento: kg > stessa.kg, pronto };
      }
      return { kg: stessa.kg, prima: stessa.kg, aumento: false, pronto };
    }
  }
  // Altrimenti il peso più recente fatto con almeno le ripetizioni di oggi, quindi mai più pesante, e
  // senza aumento. Così fanno mantenimento e ultime settimane, che tengono il peso della costruzione.
  const leggero = fatte.find((f) => valido(f.ripetizioni) && f.ripetizioni >= obiettivo.da);
  return leggero ? { kg: leggero.kg, prima: leggero.kg, aumento: false, pronto: false } : null;
}

// Tutte le serie in cima con la riserva giusta. Si guarda l'ultima serie, la più dura.
function prontoPerAumentare(f, n, obiettivo, voce) {
  if (!valido(f.riserva) || !valido(f.ripetizioni)) return false;
  const regola = SCHEDE[n].aumento || {};
  if (regola.regola === "riserva") return f.ripetizioni >= obiettivo.a && f.riserva > regola.oltre;
  if (valido(regola.ripetizioni)) return f.ripetizioni >= regola.ripetizioni && f.riserva >= regola.riserva;
  const minima = voce && voce.riserva ? voce.riserva.da : 0;
  return f.ripetizioni >= obiettivo.a && f.riserva >= minima;
}

// --- Il carico (regola 1.6) ---

// Il carico della seduta per la Fatica, sforzo × minuti / 5 × fattore. tipo è «gambe», «corpo» o
// «alto». Nella Fitness la palestra conta CARICO.palestraNellaFitness, cioè niente.
export function caricoPalestra(minuti, sforzo, tipo) {
  const p = CARICO.palestra;
  const m = valido(minuti) && minuti > 0 ? minuti : p.minutiPredefiniti;
  const f = valido(sforzo) && sforzo >= 0 ? Math.min(sforzo, 10) : p.sforzoPredefinito;
  const fattore = ["gambe", "corpo", "alto"].includes(tipo) ? p[tipo] : p.fattorePredefinito;
  return f * m / CARICO.sforzo.divisore * fattore;
}

// --- Le sedute saltate e il ritorno dopo l'evento (regole 4.8 e 4.7) ---

function nuovoRientro(pausa, ultimaPrima, dal, fineEvento) {
  const evento = dataValida(fineEvento) && fineEvento > ultimaPrima && fineEvento <= dal;
  let tipo = "breve";
  if (pausa > R.mediaFino) tipo = "lunga";
  else if (evento && pausa > R.dopoEventoOltre) tipo = "dopoEvento";
  else if (pausa > R.breveFino) tipo = "media";
  const scheda1 = tipo === "lunga" || tipo === "dopoEvento";
  return {
    tipo,
    pausaGiorni: pausa,
    dal,
    fino: tipo === "media" ? piuGiorni(dal, R.mediaGiorni - 1) : tipo === "lunga" ? piuGiorni(dal, R.lungaGiorni - 1) : null,
    sedute: tipo === "breve" ? 1 : tipo === "dopoEvento" ? R.seduteDopoEvento : null,
    serieInMeno: tipo === "breve" || tipo === "media" ? 1 : 0,
    riservaInPiu: tipo === "media" ? 1 : 0,
    volumeScheda1: scheda1,
    riserva: scheda1 ? [...R.lungaRiserva] : null,
    testo: T.rientro[tipo],
  };
}

// Il rientro che vale oggi, oppure null. Una pausa è un buco senza pesi di oltre 7 giorni, 10 dopo una
// seduta di mantenimento. Vale dalla prima seduta dopo la pausa (oggi, se non c'è ancora) per una
// seduta, una settimana, due settimane o due sedute, secondo quanto è durata. fineEvento è l'ultimo
// giorno di un evento, per la regola 4.7.
export function rientroDopoPausa(registro, oggi, fineEvento = null) {
  if (!dataValida(oggi)) return null;
  const sedute = registroValido(registro).filter((s) => conPesi(s) && s.data <= oggi).reverse();
  if (!sedute.length) return null;
  const soglia = (s) => (s.scheda === 4 || s.scheda === 5 ? R.sogliaMantenimento : R.soglia);
  const ultima = sedute[sedute.length - 1];
  const finora = giorniFra(ultima.data, oggi);
  if (finora > soglia(ultima)) return nuovoRientro(finora, ultima.data, oggi, fineEvento);
  for (let i = sedute.length - 1; i >= 1; i--) {
    const pausa = giorniFra(sedute[i - 1].data, sedute[i].data);
    if (pausa <= soglia(sedute[i - 1])) continue;
    const r = nuovoRientro(pausa, sedute[i - 1].data, sedute[i].data, fineEvento);
    const fatte = sedute.slice(i).filter((s) => s.data < oggi).length;
    if (r.fino) return oggi <= r.fino ? r : null;
    return fatte < r.sedute ? r : null;
  }
  return null;
}

// --- Registrare una seduta (5.6) ---

// Quante sedute con i pesi, quante negli ultimi 7 giorni e da quanti giorni l'ultima di gambe, per
// le finestre del piano (regola 4.12).
export function contoSedute(registro, oggi) {
  const sedute = registroValido(registro).filter((s) => !dataValida(oggi) || s.data <= oggi);
  const pesi = sedute.filter(conPesi);
  const ultimaGambe = pesi.length ? pesi[0].data : null;
  return {
    totali: pesi.length,
    ultimi7: dataValida(oggi) ? pesi.filter((s) => giorniFra(s.data, oggi) < 7).length : null,
    ultimaGambe,
    giorniDaGambe: ultimaGambe && dataValida(oggi) ? giorniFra(ultimaGambe, oggi) : null,
  };
}

// La seduta fatta, dalla seduta di sedutaPalestra e dalle risposte. fatta è «tutta» o «leggera», pesi
// per ogni id { kg, riserva, ripetizioni, serie, id } se la persona li segna, id per l'alternativa
// scelta. Senza minuti dal dispositivo una seduta di pesi vale 50 minuti (5.6), le altre la stima.
export function sedutaFatta(seduta, risposte = {}) {
  if (!seduta || !Array.isArray(seduta.esercizi)) return null;
  const r = risposte && typeof risposte === "object" ? risposte : {};
  const pesi = r.pesi && typeof r.pesi === "object" ? r.pesi : {};
  const forza = seduta.esercizi.some((v) => v.blocco === "forza");
  const esercizi = seduta.esercizi
    .filter((v) => !v.facoltativo || pesi[v.id])
    .map((v) => {
      const segnato = pesi[v.id] || {};
      return {
        id: typeof segnato.id === "string" ? segnato.id : v.id,
        serie: valido(segnato.serie) ? segnato.serie : v.serie.da,
        ripetizioni: valido(segnato.ripetizioni) ? segnato.ripetizioni : v.ripetizioni ? v.ripetizioni.a : null,
        secondi: valido(segnato.secondi) ? segnato.secondi : v.secondi ? v.secondi.da : null,
        kg: valido(segnato.kg) ? segnato.kg : null,
        riserva: valido(segnato.riserva) ? segnato.riserva : null,
      };
    });
  return normalizzaFatta({
    data: r.data,
    scheda: seduta.scheda,
    seduta: seduta.seduta,
    settimana: seduta.settimana,
    minuti: valido(r.minuti) ? r.minuti : forza ? CARICO.palestra.minutiPredefiniti : seduta.minuti,
    sforzo: r.sforzo,
    allenato: seduta.allenato,
    fatta: r.fatta === "leggera" ? "leggera" : "tutta",
    livello: seduta.livello,
    esercizi,
  });
}

// Il nome dell'attività a mano su intervals.icu, «Palestra, scheda 3, seduta A».
export function nomeAttivita(seduta) {
  const s = seduta && typeof seduta === "object" ? seduta : {};
  const valori = { scheda: Number.isInteger(s.scheda) ? s.scheda : "" };
  return ["A", "B", "breve", "leggera"].includes(s.seduta)
    ? componi(M.attivitaSeduta, { ...valori, seduta: s.seduta })
    : componi(M.attivita, valori);
}

// --- La descrizione dell'attività e la riga [come-sto v1] ---

export const RIGA_APP = "[come-sto v1]";
const CHIAVI_RIGA = [["d", "data"], ["s", "scheda"], ["q", "seduta"], ["w", "settimana"], ["m", "minuti"], ["f", "sforzo"], ["a", "allenato"], ["x", "fatta"], ["l", "livello"]];
const NUMERICHE = new Set(["scheda", "settimana", "minuti", "sforzo"]);
const CAMPI_ESERCIZIO = ["id", "serie", "ripetizioni", "secondi", "kg", "riserva"];

function rigaEsercizio(e) {
  const es = ESERCIZI[e.id];
  const nome = es ? es.nome : e.id;
  let riga;
  if (e.serie === null) riga = nome;
  else if (e.secondi !== null) riga = `${nome} ${e.serie} × ${e.secondi} secondi${es && es.lato !== "gamba" ? PER_LATO[es.lato] || "" : ""}`;
  else if (e.ripetizioni !== null) riga = `${nome} ${e.serie} × ${e.ripetizioni}`;
  else riga = `${nome} ${e.serie} serie`;
  if (e.kg !== null) riga += ` a ${kgTesto(e.kg)}`;
  if (e.riserva !== null) riga += `, riserva ${e.riserva}`;
  return riga;
}

// La descrizione dell'attività a mano, una riga per esercizio in chiaro («Squat 3 × 6 a 60 kg,
// riserva 2») e in fondo la riga per l'app, senza due punti, che leggiDescrizione rilegge.
export function descrizioneAttivita(seduta) {
  const s = normalizzaFatta(seduta);
  if (!s) return "";
  const pezzi = [RIGA_APP];
  for (const [corta, lunga] of CHIAVI_RIGA) if (s[lunga] !== null) pezzi.push(`${corta}=${s[lunga]}`);
  if (s.esercizi.length) {
    pezzi.push(`e=${s.esercizi.map((e) => CAMPI_ESERCIZIO.map((c) => (e[c] === null ? "" : String(e[c]))).join(",")).join(";")}`);
  }
  return [...s.esercizi.map(rigaEsercizio), pezzi.join(" ")].join("\n");
}

// Rilegge la riga [come-sto v1] di una descrizione e restituisce la seduta fatta, oppure null.
export function leggiDescrizione(testo) {
  if (typeof testo !== "string") return null;
  const riga = testo.split(/\r?\n/).map((r) => r.trim()).find((r) => r.startsWith(RIGA_APP));
  if (!riga) return null;
  const grezzi = {};
  for (const pezzo of riga.slice(RIGA_APP.length).trim().split(/\s+/)) {
    const i = pezzo.indexOf("=");
    if (i > 0) grezzi[pezzo.slice(0, i)] = pezzo.slice(i + 1);
  }
  const numeroDa = (v) => (v === undefined || v === "" ? null : Number(v));
  const seduta = {};
  for (const [corta, lunga] of CHIAVI_RIGA) seduta[lunga] = NUMERICHE.has(lunga) ? numeroDa(grezzi[corta]) : grezzi[corta];
  seduta.esercizi = (grezzi.e || "").split(";").filter(Boolean).map((pezzo) => {
    const valori = pezzo.split(",");
    const e = { id: valori[0] };
    CAMPI_ESERCIZIO.slice(1).forEach((c, i) => { e[c] = numeroDa(valori[i + 1]); });
    return e;
  });
  return normalizzaFatta(seduta);
}
