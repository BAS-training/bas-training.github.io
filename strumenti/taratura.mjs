// La taratura privata sui viaggi, i casi T1-T6 di 9.10 (8.2-8.5 e 8.8).
// Rifà ogni viaggio della cartella privata con i moduli veri dell'app. Le righe di giri.json diventano
// attività come le legge js/api.js da intervals.icu e passano da js/dati.js, poi js/stima.js dà le
// ore, js/prontezza.js pilastri, verdetto, giorni consigliati e confronto con la Fitness, js/piano.js
// il piano dei giorni prima della vigilia e js/carico.js la serie di carico. Stampa per ogni caso i
// numeri e lo scarto dall'atteso scritto in eventi.json.
//
// Parte solo se COMESTO_TARATURA punta alla cartella privata (8.1), che non sta mai nel repository.
// Qui non c'è nessun dato di nessuno. Viaggi, giri, masse, profilo e attesi arrivano da quella cartella.
//
//   COMESTO_TARATURA=PERCORSO/DELLA/TARATURA node strumenti/taratura.mjs [opzioni]
//
//   --md       scrive in Markdown
//   --scrivi   scrive il Markdown in esito_viaggi.md nella cartella privata, mai altrove
//
// Le mattine, il caso T7, le rifà strumenti/taratura-mattine.mjs. Esce con 0 quando ogni atteso torna,
// oppure non torna solo per come è scritta una regola, e lo script dice quale. Esce con 1 se un atteso
// non torna. Senza la cartella stampa «taratura privata assente» ed esce con 0.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { preparaAttivita, inBici, mediana } from "../js/dati.js";
import { oreTotali, oreFormula, potenzaGiornata, fattoreCarico, arrotondaMezzora } from "../js/stima.js";
import { valutaProntezza, classeEvento, specchio } from "../js/prontezza.js";
import { pianoLungo } from "../js/piano.js";
import { puntiOra, serieCarico } from "../js/carico.js";
import { trovaPercorso } from "../js/catalogo.js";
import { migliaia } from "../js/testi-stima.js";
import { BORSE, CHIAMATE, PASSO, PRONTEZZA, STIMA } from "../js/parametri.js";

const RADICE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE_ESITO = "esito_viaggi.md";
const GIORNO_MS = 86400000;
const ORA = 3600;
const EPS = 1e-9;

// I criteri di 9.10 e le tolleranze dei numeri di 8.2 e 8.3. Sono prove, non regole dell'app.
const CRITERI = Object.freeze({
  scartoTutti: { da: -0.05, a: 0.15 },   // T1, T fra −5% e +15% su tutti i viaggi
  scartoLunghi: 0.05,                    // T1, entro ±5% sui viaggi di 11 giorni e più
  conFattore: 0.10,                      // T6, con il fattore carico entro ±10% delle ore vere
  ore: 0.05,                             // T di 8.2, scritte con un decimale
  scarto: 0.005,                         // scarti di 8.2, in percento con un decimale e con le ore vere arrotondate
  numeri: 0.1,                           // H, ore a settimana, uscita lunga e obiettivi di 8.3, con un decimale
  specchio: 1,                           // k e Fitness di confronto di 8.3, senza decimali
  passoH: 0.01,                          // T3, il gradino si cerca con H a centesimi di ora
  passoQuota: 0.005,                     // T3, «fino a H +2%» si prova a mezzi punti
});

// Il modello per segmenti sui profili tipo, con 75 + 12 + 10 kg fra 100 e 140 W (1.2). Rifà la C di
// una classe senza il viaggio che l'ha tarata, a 122 W come le C delle classi.
const PROFILI_TIPO = Object.freeze({
  watt: [100, 140],
  c: { "asfalto-passi": [11.9, 11.1], "asfalto-collinare": [11.3, 10.5], "misto-dolce": [10.3, 9.2] },
});
// La classe con cui 8.2 rifà il viaggio segnato «un caso solo», il collinare misto del capitolo 7.
const CLASSE_DI_CONFRONTO = "misto";

// Le sorgenti di giri.json con i nomi di intervals.icu. Le righe esportate da Strava hanno durata, km
// e dislivello, quindi non sono stub.
const SORGENTI = Object.freeze({ wahoo: "WAHOO", garmin: "GARMIN_CONNECT", "strava-stub": "STRAVA", manuale: "MANUAL", "strava-export": "STRAVA_EXPORT" });
const RISPOSTE_BORSE = new Set(["no", "parte", "evento"]);
const ALLENATO = new Set(["gambe", "corpo", "alto"]);

const ESITI = Object.freeze({ conMargine: "pronto con margine", pronto: "pronto", quasiPronto: "quasi pronto", pocoPronto: "poco pronto", nonValutabile: "non posso ancora dirlo" });
const SPECCHI = Object.freeze({ sotto: "sotto", inLinea: "in linea", sopra: "sopra" });
const CLASSI = Object.freeze({ "1": "un giorno", "2-5": "2-5 giorni", "6-10": "6-10 giorni", "11+": "11 giorni e più" });
const PILASTRI = ["volume", "lunga", "borse", "continuita"];
const DA_DOVE = Object.freeze({ registrati: "dai km e dal dislivello registrati", catalogo: "dai totali del catalogo" });

const num = (v) => typeof v === "number" && Number.isFinite(v);
const vicino = (a, b, tolleranza) => num(a) && num(b) && Math.abs(a - b) <= tolleranza + EPS;

function utc(iso) {
  const [a, m, g] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}

const piuGiorni = (iso, n) => new Date(utc(iso) + n * GIORNO_MS).toISOString().slice(0, 10);
const giorniFra = (da, a) => Math.round((utc(a) - utc(da)) / GIORNO_MS);

function oggiLocale(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Un numero con la virgola e il meno tipografico, senza «−0».
function dec(x, cifre = 1) {
  if (!num(x)) return "-";
  const t = x.toFixed(cifre);
  return (/^-0\.?0*$/.test(t) ? t.slice(1) : t).replace(".", ",").replace(/^-/, "−");
}

const conSegno = (x, cifre = 1) => (num(x) && Number(x.toFixed(cifre)) > 0 ? `+${dec(x, cifre)}` : dec(x, cifre));
const perc = (x, cifre = 1) => (num(x) ? `${conSegno(100 * x, cifre)}%` : "-");
const elenco = (voci, vuoto = "nessuno") => (voci.length ? voci.join(", ") : vuoto);
const leggiNumero = (t) => Number(String(t).replace("−", "-").replace(",", "."));
const maiuscola = (s) => (typeof s === "string" && s ? s[0].toUpperCase() + s.slice(1) : s);

// --- La cartella privata ---

export function dentroIlRepository(cartella) {
  const r = relative(RADICE, resolve(cartella));
  return r === "" || (!r.startsWith("..") && !isAbsolute(r));
}

// La cartella di COMESTO_TARATURA, se c'è e ha eventi.json e giri.json, altrimenti null.
export function cartellaPrivata(valore = process.env.COMESTO_TARATURA) {
  if (!valore) return null;
  const cartella = resolve(valore);
  return existsSync(join(cartella, "eventi.json")) && existsSync(join(cartella, "giri.json")) ? cartella : null;
}

function leggiFile(cartella, nome, obbligatorio) {
  const percorso = join(cartella, nome);
  if (!existsSync(percorso)) {
    if (obbligatorio) throw new Error(`manca ${nome}`);
    return null;
  }
  const dati = JSON.parse(readFileSync(percorso, "utf8"));
  if (!dati || dati.formato !== 1) throw new Error(`${nome} ha un formato che non conosco`);
  return dati;
}

const perOra = (x, y) => (x.data !== y.data ? (x.data < y.data ? -1 : 1) : (x.inizio || "") < (y.inizio || "") ? -1 : (x.inizio || "") > (y.inizio || "") ? 1 : 0);

// I file della taratura. I viaggi hanno percorso del catalogo, partenza, vigilia, giorni, numeri
// registrati, ore vere, masse, esperienza e atteso (9.10).
export function leggiTaratura(cartella) {
  const eventi = leggiFile(cartella, "eventi.json", true);
  const giri = leggiFile(cartella, "giri.json", true);
  const vigilie = leggiFile(cartella, "vigilie.json", false);
  const profilo = eventi.profilo || {};
  if (!num(profilo.ftp) || profilo.ftp <= 0) throw new Error("eventi.json non ha la FTP del profilo");
  const viaggi = (eventi.eventi || []).filter((v) => v && typeof v.id === "string" && typeof v.partenza === "string" && num(v.giorni) && v.giorni >= 1);
  if (!viaggi.length) throw new Error("eventi.json non ha viaggi");
  for (const v of viaggi) {
    if (!trovaPercorso(v.percorso)) throw new Error(`${v.id} ha un percorso che il catalogo non ha`);
    if (!num(v.km) || !num(v.dislivello) || !num(v.oreVere) || !v.masse) throw new Error(`${v.id} non ha km, dislivello, ore vere o masse`);
    if (typeof v.vigilia !== "string") v.vigilia = piuGiorni(v.partenza, -1);
  }
  const fitness = new Map(((vigilie && vigilie.vigilie) || []).filter((x) => x && typeof x.evento === "string").map((x) => [x.evento, x]));
  const righe = (giri.giri || []).filter((r) => r && typeof r.data === "string" && r.id !== undefined && r.id !== null).sort(perOra);
  return { profilo, viaggi, giri: righe, vigilie: fitness };
}

// --- Le attività come le vede l'app ---

// Le righe esportate da Strava non hanno l'ora. La prima del giorno parte alle 8 e le altre 3 ore dopo
// la fine della precedente, così non diventano doppioni e nell'uscita lunga non si uniscono, la
// lettura prudente.
function conOra(righe) {
  const prossima = new Map();
  return righe.map((r) => {
    if (typeof r.inizio === "string" && r.inizio.length >= 16) return { r, inizio: r.inizio };
    const minuti = prossima.get(r.data) ?? 8 * 60;
    prossima.set(r.data, minuti + Math.ceil((r.secondiTotali || r.secondi || 0) / 60) + 3 * 60);
    const hh = String(Math.floor(minuti / 60)).padStart(2, "0");
    const mm = String(minuti % 60).padStart(2, "0");
    return { r, inizio: `${r.data}T${hh}:${mm}:00` };
  });
}

// Una riga di giri.json come la legge js/api.js. La potenza e il battito vengono dalla fonte del
// carico, un carico senza sensori resta quello di intervals.icu.
function grezza(r, inizio) {
  return {
    id: String(r.id),
    start_date_local: inizio,
    type: typeof r.tipo === "string" && r.tipo ? r.tipo : null,
    source: SORGENTI[r.fonte] || null,
    moving_time: num(r.secondi) ? r.secondi : null,
    elapsed_time: num(r.secondiTotali) ? r.secondiTotali : null,
    distance: num(r.km) ? Math.round(r.km * 1000) : null,
    total_elevation_gain: num(r.dislivello) ? r.dislivello : null,
    icu_training_load: num(r.carico) ? r.carico : null,
    device_watts: r.fonteCarico === "potenza",
    has_heartrate: r.fonteCarico === "battito" || num(r.fcMedia),
    average_heartrate: num(r.fcMedia) ? r.fcMedia : null,
    icu_rpe: num(r.sforzo) ? r.sforzo : null,
    trainer: r.rulli === true,
    name: typeof r.nome === "string" && r.nome ? r.nome : null,
  };
}

// La voce del telefono di una riga, con le risposte che la persona avrebbe dato. «non so» vale
// senza risposta, cioè «No» per le prove e fuori dal passo oltre 3 ore (2.4 e 6.3).
function dettoDi(r, borse) {
  const b = borse === undefined ? r.borse : borse;
  return {
    borse: RISPOSTE_BORSE.has(b) ? b : null,
    notteFuori: typeof r.notteFuori === "boolean" ? r.notteFuori : null,
    allenato: ALLENATO.has(r.palestra) ? r.palestra : null,
  };
}

// Le attività pulite che l'app vede quel giorno, cioè quelle della finestra di lettura fino a quel
// giorno (6.7), con le borse cambiate da una variante (una mappa da id a risposta). giorni allarga la
// finestra, per esempio ai 365 giorni del fattore carico (1.7), oppure a tutto con Infinity.
function attivitaAl(dati, giorno, { borse = null, giorni = CHIAMATE.primaLetturaGiorni } = {}) {
  const dal = Number.isFinite(giorni) ? piuGiorni(giorno, 1 - giorni) : "";
  const righe = dati.giri.filter((r) => r.data >= dal && r.data <= giorno);
  const grezze = [];
  const detti = {};
  for (const { r, inizio } of conOra(righe)) {
    const id = String(r.id);
    grezze.push(grezza(r, inizio));
    detti[id] = dettoDi(r, borse && borse.has(id) ? borse.get(id) : undefined);
  }
  return preparaAttivita(grezze, [], { detti, oggi: giorno });
}

// --- Percorsi, masse e ore ---

// La potenza della giornata della taratura, 0,625 × FTP, la fonte 1 di 1.4 come in 8.2.
const potenzaDi = (dati) => STIMA.potenza.quotaFtp * dati.profilo.ftp;

function profiloDi(dati, v) {
  const m = v.masse || {};
  const p = { pesoKg: num(m.ciclista) ? m.ciclista : dati.profilo.peso };
  if (num(m.bici)) p.biciKg = m.bici;
  if (num(m.borse)) p.borseKg = m.borse;
  if (m.laterali === true) p.borseTipo = "laterali";
  return p;
}

// Il percorso del catalogo con acqua e cibo del viaggio, che il profilo non porta.
function conAcqua(percorso, v) {
  const kg = v.masse && v.masse.acquaCibo;
  return num(kg) ? { ...percorso, modello: { ...percorso.modello, acquaCiboKg: kg } } : percorso;
}

// Il viaggio come percorso, con i km e il dislivello registrati, la classe di 8.2 e il fattore del
// dislivello del viaggio. cambi tocca il modello, per esempio la classe o la C.
function percorsoRegistrato(v, cambi = {}) {
  const c = trovaPercorso(v.percorso);
  return conAcqua({
    ...c,
    id: `${v.id}-registrato`,
    km: v.km,
    dislivello: v.dislivello,
    modello: { ...c.modello, classe: v.classe || c.modello.classe, fattoreDislivello: num(v.fattoreDislivello) ? v.fattoreDislivello : 1, dislivelloLavoro: null, ...cambi },
  }, v);
}

const oreDi = (dati, v, percorso, extra = {}) => oreTotali({ percorso, profilo: profiloDi(dati, v), potenza: potenzaDi(dati), ...extra });

// La giornata della vigilia, H = T / G (8.3). T è quello del modello sui numeri registrati oppure sui
// totali del catalogo, il più vicino all'H scritto nell'atteso, perché 8.3 li usa tutti e due. Senza
// atteso valgono i registrati. La forbice è quella del livello 1, la FTP con il misuratore (1.4).
function giornataDi(dati, v) {
  const registrati = oreDi(dati, v, percorsoRegistrato(v));
  const catalogo = oreDi(dati, v, conAcqua(trovaPercorso(v.percorso), v));
  const voluto = v.atteso && v.atteso.pilastri ? v.atteso.pilastri.H : null;
  const conCatalogo = num(voluto) && Math.abs(catalogo / v.giorni - voluto) < Math.abs(registrati / v.giorni - voluto);
  const T = conCatalogo ? catalogo : registrati;
  return { T, H: T / v.giorni, da: conCatalogo ? "catalogo" : "registrati", registrati, catalogo };
}

function stimaDi(v, H) {
  const f = STIMA.forbice[1];
  return { T: H * v.giorni, H, giorni: v.giorni, livello: 1, basso: H * (1 - f), alto: H * (1 + f), fonte: { tipo: "ftp" }, avvisi: [] };
}

// Il piano che l'app avrebbe quel giorno, dal primo avvio con le risposte di base (3.1), con lo
// storico delle uscite, k e la Fitness di Come sto.
function pianoAl(dati, v, giorno, uscite, H) {
  if (giorno >= v.partenza) return null;
  const serie = fitnessDiComeSto(dati, giorno);
  return pianoLungo({
    obiettivo: { percorso: v.percorso, giorni: v.giorni, partenza: v.partenza },
    stima: stimaDi(v, H),
    profilo: { esperienza: v.esperienza === true },
    storico: { uscite, fitness: serie ? serie.fitness : null, k: puntiOra(uscite, giorno) },
    disponibilita: {},
    oggi: giorno,
    atleta: { ftp: dati.profilo.ftp },
  });
}

// «Pronto?» di quel giorno, con la giornata della vigilia o con un'altra H. Il percorso corto prende
// le ore della taratura con le masse del viaggio.
function prontezzaAl(dati, v, giorno, { giornata = null, uscite = null, borse = null, H = null, fitness = null, conPiano = false } = {}) {
  const g = giornata || giornataDi(dati, v);
  const h = num(H) ? H : g.H;
  const lista = uscite || attivitaAl(dati, giorno, { borse });
  const piano = conPiano ? pianoAl(dati, v, giorno, lista, h) : null;
  const r = valutaProntezza({
    percorso: trovaPercorso(v.percorso),
    giorni: v.giorni,
    partenza: v.partenza,
    oggi: giorno,
    uscite: lista,
    profilo: profiloDi(dati, v),
    atleta: { ftp: dati.profilo.ftp },
    stima: stimaDi(v, h),
    esperienza: v.esperienza === true,
    fitness,
    piano,
    stimaPer: (percorso) => oreDi(dati, v, conAcqua(percorso, v)),
  });
  return { ...r, piano };
}

// --- Gli attesi ---

// stato vale «torna», «regola» quando non torna con la regola scritta così ma torna con la lettura
// che usa la specifica, e lo dice perche, oppure «non torna».
function atteso(caso, cosa, esce, torna, regola = null) {
  return { caso, cosa, esce, stato: torna ? "torna" : regola ? "regola" : "non torna", perche: torna ? null : regola };
}

const ESITO_DA_TESTO = Object.freeze(Object.fromEntries(Object.entries(ESITI).map(([k, t]) => [t, k])));
const esitoAtteso = (testo) => (typeof testo === "string" ? ESITO_DA_TESTO[testo.trim().toLowerCase()] || null : null);

// --- T1, le ore stimate contro le ore vere (8.2) ---

// La C di una classe dai soli profili tipo, interpolata a 122 W. null se la classe non ha un profilo.
function cDaiProfiliTipo(classe) {
  const c = PROFILI_TIPO.c[classe];
  if (!c) return null;
  const [w1, w2] = PROFILI_TIPO.watt;
  return c[0] + ((STIMA.costanteSalita.potenza - w1) / (w2 - w1)) * (c[1] - c[0]);
}

function casoT1(dati) {
  const righe = [];
  const attesi = [];
  const { da, a: fino } = CRITERI.scartoTutti;
  for (const v of dati.viaggi) {
    const a = v.atteso || {};
    const T = oreDi(dati, v, percorsoRegistrato(v));
    const scarto = T / v.oreVere - 1;
    const lungo = classeEvento(v.giorni) === "11+";
    const catalogo = trovaPercorso(v.percorso);
    const Tc = oreDi(dati, v, conAcqua(catalogo, v));
    const riga = { v, T, scarto, lungo, catalogo: { T: Tc, scarto: Tc / v.oreVere - 1, ufficiale: num(catalogo.dislivello) }, unCasoSolo: null, confronto: null, passo: null };

    if (num(a.oreModello)) attesi.push(atteso("T1", `${v.nome}, T del modello ${dec(a.oreModello)} ore`, `${dec(T, 2)} ore`, vicino(T, a.oreModello, CRITERI.ore)));
    if (num(a.scarto)) attesi.push(atteso("T1", `${v.nome}, scarto ${perc(a.scarto)} sulle ore vere`, perc(scarto, 2), vicino(scarto, a.scarto, CRITERI.scarto)));
    attesi.push(atteso("T1", `${v.nome}, scarto fra ${perc(da, 0)} e ${perc(fino, 0)}`, perc(scarto, 2), scarto >= da - EPS && scarto <= fino + EPS));
    if (lungo) attesi.push(atteso("T1", `${v.nome}, scarto entro ±${dec(100 * CRITERI.scartoLunghi, 0)}%, viaggio di 11 giorni e più`, perc(scarto, 2), Math.abs(scarto) <= CRITERI.scartoLunghi + EPS));
    if (num(a.oreCatalogo)) attesi.push(atteso("T1", `${v.nome}, T con i totali del catalogo ${dec(a.oreCatalogo)} ore`, `${dec(Tc, 2)} ore`, vicino(Tc, a.oreCatalogo, CRITERI.ore)));
    if (num(a.scartoCatalogo)) attesi.push(atteso("T1", `${v.nome}, scarto con i totali del catalogo ${perc(a.scartoCatalogo)}`, perc(riga.catalogo.scarto, 2), vicino(riga.catalogo.scarto, a.scartoCatalogo, CRITERI.scarto)));

    // Il viaggio che ha tarato la C della sua classe, rifatto con la C dei soli profili tipo (8.2).
    if (a.unCasoSolo) {
      const c = cDaiProfiliTipo(riga.v.classe);
      if (num(c)) {
        const Tf = oreDi(dati, v, percorsoRegistrato(v, { c }));
        riga.unCasoSolo = { c, cClasse: STIMA.classi[v.classe].c, T: Tf, scarto: Tf / v.oreVere - 1 };
      }
      attesi.push(atteso("T1", `${v.nome}, lasciato fuori con la C dei soli profili tipo, con l'etichetta «un caso solo»`,
        riga.unCasoSolo ? `C ${dec(c, 2)}, scarto ${perc(riga.unCasoSolo.scarto, 2)}, un caso solo` : "la classe non ha un profilo tipo", Boolean(riga.unCasoSolo)));
      if (num(a.scartoConCostanteDelMisto)) {
        const Tm = oreDi(dati, v, percorsoRegistrato(v, { classe: CLASSE_DI_CONFRONTO }));
        riga.confronto = { classe: CLASSE_DI_CONFRONTO, T: Tm, scarto: Tm / v.oreVere - 1 };
        attesi.push(atteso("T1", `${v.nome} con la classe del collinare misto, scarto ${perc(a.scartoConCostanteDelMisto)}`, perc(riga.confronto.scarto, 2), vicino(riga.confronto.scarto, a.scartoConCostanteDelMisto, CRITERI.scarto)));
      }
    }

    // La strada del passo dai giri (1.6), come confronto e senza soglia (8.2).
    const uscite = attivitaAl(dati, v.vigilia);
    const p = potenzaGiornata({ profilo: profiloDi(dati, v), atleta: null, uscite, oggi: v.vigilia });
    if (p.fonte === "giri") {
      const Tg = oreTotali({ percorso: percorsoRegistrato(v), profilo: profiloDi(dati, v), potenza: p.p });
      riga.passo = { P: p.p, pGiri: p.passo.p, limitata: p.limitata, giri: p.passo.tenuti.length, tolti: p.passo.tolti.length, giorni: p.passo.giorni, T: Tg, scarto: Tg / v.oreVere - 1 };
    } else {
      riga.passo = { fonte: p.fonte };
    }
    righe.push(riga);
  }
  return { righe, attesi };
}

// --- T2, pronto o no alla vigilia (8.3) ---

// Le borse delle varianti di 8.3, riconosciute dal testo dell'atteso. «non era con le borse» toglie le
// borse all'ultimo viaggio carico prima della partenza, «dichiarato carico» mette «Sì, come
// all'evento» sui giorni di fila senza risposta della finestra delle prove.
function borseDellaVariante(dati, v, testo) {
  const t = String(testo || "").toLowerCase();
  const borse = new Map();
  if (/non era con le borse/.test(t)) {
    const prima = dati.giri.filter((r) => r.viaggio && r.viaggio !== v.id && r.data < v.partenza);
    const ultimo = prima.length ? prima[prima.length - 1].viaggio : null;
    if (!ultimo) return null;
    for (const r of prima.filter((x) => x.viaggio === ultimo)) borse.set(String(r.id), "no");
    return { tipo: "senzaBorse", borse, viaggio: ultimo, giorni: [...new Set(prima.filter((x) => x.viaggio === ultimo).map((x) => x.data))] };
  }
  if (/dichiarat[oaie] caric[oaie]/.test(t)) {
    const dal = piuGiorni(v.partenza, 7 * PRONTEZZA.finestre.T1.da);
    const senza = dati.giri.filter((r) => r.data >= dal && r.data < v.partenza && !RISPOSTE_BORSE.has(r.borse) && num(r.secondi) && r.secondi >= PRONTEZZA.giornoCaricoOre * ORA);
    const date = [...new Set(senza.map((r) => r.data))].sort();
    const diFila = date.filter((d) => date.includes(piuGiorni(d, -1)) || date.includes(piuGiorni(d, 1)));
    if (!diFila.length) return null;
    for (const r of senza.filter((x) => diFila.includes(x.data))) borse.set(String(r.id), "evento");
    return { tipo: "carichi", borse, giorni: diFila };
  }
  return null;
}

const difettiDi = (r) => (r.pilastri ? PILASTRI.map((n) => r.pilastri[n].difetto) : null);

function riassunto(r, g) {
  const p = r.pilastri;
  return {
    esito: r.esito,
    classe: r.classe,
    H: g.H,
    da: g.da,
    vMin: r.obiettivi && r.obiettivi.vMin,
    vComodo: r.obiettivi && r.obiettivi.vComodo,
    lt: r.obiettivi && r.obiettivi.lt,
    V: p && p.volume.valore,
    L: p && p.lunga.valore,
    giornoL: p && p.lunga.giorno,
    buco: p && p.continuita.valore,
    difetti: difettiDi(r),
    prove: p ? p.borse.righe.map((x) => ({ prova: x.prova, stato: x.stato, da: x.da, a: x.a, tardi: x.tardi, doppioUso: x.doppioUso })) : [],
    avvisi: r.avvisi.map((x) => x.tipo),
    verdetto: r.verdetto,
    fiducia: r.fiducia,
    proposta: r.proposta,
    confronto: r.confronto,
  };
}

function casoT2(dati) {
  const righe = [];
  const attesi = [];
  for (const v of dati.viaggi) {
    const a = v.atteso || {};
    const g = giornataDi(dati, v);
    const uscite = attivitaAl(dati, v.vigilia);
    const fitness = dati.vigilie.has(v.id) ? dati.vigilie.get(v.id).fitness : null;
    const r = prontezzaAl(dati, v, v.vigilia, { giornata: g, uscite, fitness });
    const s = riassunto(r, g);
    const riga = { v, g, uscite, r, s, varianti: [] };
    const voluto = esitoAtteso(a.verdetto);
    if (voluto) attesi.push(atteso("T2", `${v.nome}, verdetto alla vigilia «${a.verdetto}»`, ESITI[r.esito] || r.esito, r.esito === voluto));

    const pa = a.pilastri;
    if (pa) {
      if (pa.difetti) {
        const attesiDifetti = PILASTRI.map((n) => pa.difetti[n]);
        attesi.push(atteso("T2", `${v.nome}, difetti di volume, lunga, borse e continuità ${attesiDifetti.join(", ")}`, s.difetti ? s.difetti.join(", ") : "-", Boolean(s.difetti) && s.difetti.every((d, i) => d === attesiDifetti[i])));
      }
      const diversi = [];
      if (pa.classe && pa.classe !== s.classe) diversi.push(`classe ${s.classe}`);
      for (const [nome, chiave] of [["H", "H"], ["V_min", "vMin"], ["V_comodo", "vComodo"], ["V", "V"], ["LT", "lt"], ["L", "L"]]) {
        if (num(pa[chiave]) && !vicino(s[chiave], pa[chiave], CRITERI.numeri)) diversi.push(`${nome} ${dec(s[chiave], 2)} contro ${dec(pa[chiave], 2)}`);
      }
      if (num(pa.buco) && pa.buco !== s.buco) diversi.push(`buco ${s.buco} giorni contro ${pa.buco}`);
      const scritti = ["H", "vMin", "vComodo", "V", "lt", "L"].filter((k) => num(pa[k])).length + (num(pa.buco) ? 1 : 0);
      attesi.push(atteso("T2", `${v.nome}, i ${scritti} numeri di 8.3 entro ${dec(CRITERI.numeri)}`, diversi.length ? elenco(diversi) : "tutti uguali", diversi.length === 0));
    }

    for (const variante of Array.isArray(a.varianti) ? a.varianti : []) {
      const vb = borseDellaVariante(dati, v, variante.caso);
      const votato = esitoAtteso(variante.verdetto);
      if (!vb) {
        riga.varianti.push({ caso: variante.caso, r: null });
        attesi.push(atteso("T2", `${v.nome}, variante «${variante.caso}»`, "non so rifare questa variante", false));
        continue;
      }
      const rv = prontezzaAl(dati, v, v.vigilia, { giornata: g, borse: vb.borse, fitness });
      riga.varianti.push({ caso: variante.caso, vb, r: rv, s: riassunto(rv, g) });
      attesi.push(atteso("T2", `${v.nome}, variante «${variante.caso}», «${variante.verdetto}»`, ESITI[rv.esito] || rv.esito, rv.esito === votato));
    }
    righe.push(riga);
  }
  return { righe, attesi };
}

// --- T3, la sensibilità a H (8.7) ---

function casoT3(dati, t2) {
  const righe = [];
  const attesi = [];
  for (const base of t2.righe) {
    const { v, g, uscite } = base;
    const testo = v.atteso && typeof v.atteso.sensibilita === "string" ? v.atteso.sensibilita : null;
    if (!testo) continue;
    const esitoCon = (h) => prontezzaAl(dati, v, v.vigilia, { giornata: g, uscite, H: h }).esito;
    const voluto = esitoAtteso(v.atteso.verdetto);
    const riga = { v, g, testo, forbice: [], fino: null, gradino: null };

    // Tutta la forbice di 9.10, da −30% a +30% a passi dell'1%.
    for (let i = -30; i <= 30; i++) riga.forbice.push({ quota: i / 100, H: g.H * (1 + i / 100), esito: esitoCon(g.H * (1 + i / 100)) });
    let letto = false;
    const fra = /fra\s*([−-]?\d+(?:[.,]\d+)?)%\s*e\s*\+?(\d+(?:[.,]\d+)?)%/.exec(testo);
    if (fra) {
      letto = true;
      const da = leggiNumero(fra[1]) / 100;
      const a = leggiNumero(fra[2]) / 100;
      const dentro = riga.forbice.filter((x) => x.quota >= da - EPS && x.quota <= a + EPS);
      const diversi = dentro.filter((x) => x.esito !== voluto);
      attesi.push(atteso("T3", `${v.nome}, con H da ${perc(da, 0)} a ${perc(a, 0)} sempre «${ESITI[voluto]}»`,
        diversi.length ? `diverso con ${elenco(diversi.map((x) => `${perc(x.quota, 0)} ${ESITI[x.esito]}`))}` : `${dentro.length} casi, tutti ${ESITI[voluto]}`, diversi.length === 0));
    }
    const fino = /fino a H \+(\d+(?:[.,]\d+)?)%/.exec(testo);
    if (fino) {
      letto = true;
      const quota = leggiNumero(fino[1]) / 100;
      const passi = [];
      for (let q = 0; q <= quota + EPS; q += CRITERI.passoQuota) passi.push({ quota: q, esito: esitoCon(g.H * (1 + q)) });
      riga.fino = { quota, passi };
      const diversi = passi.filter((x) => x.esito !== voluto);
      attesi.push(atteso("T3", `${v.nome}, «${ESITI[voluto]}» fino a H ${perc(quota, 0)}`,
        diversi.length ? `diverso con ${elenco(diversi.map((x) => `${perc(x.quota)} ${ESITI[x.esito]}`))}` : `${passi.length} casi, tutti ${ESITI[voluto]}`, diversi.length === 0));
    }
    const da = /(poco pronto|quasi pronto|pronto con margine|pronto) da H (\d+(?:[.,]\d+)?)/.exec(testo);
    if (da) {
      letto = true;
      const hVoluta = leggiNumero(da[2]);
      const dopo = esitoAtteso(da[1]);
      // Il primo H, a centesimi, da cui il verdetto cambia, fino al 50% in più.
      let h = Math.round(g.H / CRITERI.passoH) * CRITERI.passoH;
      let primo = null;
      while (h <= g.H * 1.5 && !primo) {
        h = Math.round((h + CRITERI.passoH) * 100) / 100;
        const e = esitoCon(h);
        if (e !== voluto) primo = { H: h, esito: e };
      }
      const classe = classeEvento(v.giorni);
      const tabella = PRONTEZZA.obiettivi[classe];
      const prima = primo ? prontezzaAl(dati, v, v.vigilia, { giornata: g, uscite, H: primo.H - CRITERI.passoH }) : null;
      const al = primo ? prontezzaAl(dati, v, v.vigilia, { giornata: g, uscite, H: primo.H }) : null;
      riga.gradino = primo && {
        H: primo.H, esito: primo.esito, daH: tabella.daH ?? null,
        vMinPrima: prima.obiettivi.vMin, vMinDopo: al.obiettivi.vMin, V: al.pilastri.volume.valore,
        difettiPrima: difettiDi(prima), difettiDopo: difettiDi(al),
      };
      attesi.push(atteso("T3", `${v.nome}, «${ESITI[dopo]}» da H ${dec(hVoluta, 2)}, il gradino delle ${dec(hVoluta, 0)} ore`,
        primo ? `${ESITI[primo.esito]} da H ${dec(primo.H, 2)}` : "il verdetto non cambia fino al 50% in più",
        Boolean(primo) && primo.esito === dopo && vicino(primo.H, hVoluta, CRITERI.passoH)));
    }
    if (!letto) attesi.push(atteso("T3", `${v.nome}, «${testo}»`, "non so leggere questo atteso", false));
    righe.push(riga);
  }
  return { righe, attesi };
}

// --- T4, i giorni consigliati (2.8 e 8.4) ---

function casoT4(dati, t2) {
  const righe = [];
  const attesi = [];
  for (const base of t2.righe) {
    const { v, g } = base;
    const voluti = v.atteso && v.atteso.giorniConsigliati && typeof v.atteso.giorniConsigliati === "object" ? v.atteso.giorniConsigliati : null;
    if (!voluti) continue;
    const giorni = [];
    for (const [quando, n] of Object.entries(voluti)) {
      const giorno = quando === "vigilia" ? v.vigilia : quando;
      const r = prontezzaAl(dati, v, giorno, { giornata: g, conPiano: true });
      const p = r.proposta;
      giorni.push({ quando, giorno, voluti: n, r, settimane: giorniFra(giorno, v.partenza) / 7 });
      attesi.push(atteso("T4", `${v.nome}, giorni consigliati ${quando === "vigilia" ? "alla vigilia" : `il ${giorno}`} ${n}`,
        p ? `${p.giorni ?? "nessun giorno in più"}, ${p.tipo === "adattare" ? "poi arrivare e adattare" : p.tipo === "corto" ? `poi il percorso ${p.percorso.id}` : "più giorni"}` : "nessuna proposta",
        Boolean(p) && p.giorni === n));
    }
    // Come informazione 8.4, a 6 settimane, con il piano.
    const sei = piuGiorni(v.partenza, -42);
    const r6 = prontezzaAl(dati, v, sei, { giornata: g, conPiano: true });
    righe.push({ v, g, giorni, seiSettimane: { giorno: sei, r: r6 } });
  }
  return { righe, attesi };
}

// --- T5, il confronto con la Fitness (2.6 e 8.3) ---

// k come lo conta 8.3, con i carichi di tutte le uscite in bici di almeno 45 minuti delle ultime 6
// settimane, anche quelli stimati o scritti a mano. La regola di 2.6 vuole solo potenza, battito o sforzo.
function kComeIn83(uscite, oggi) {
  const s = PRONTEZZA.specchi;
  const dal = piuGiorni(oggi, -7 * s.settimane);
  const valori = uscite
    .filter((a) => a && inBici(a) && !a.stub && !a.eBike && a.secondi >= s.minutiMinimi * 60 && a.carico > 0 && a.giorno > dal && a.giorno <= oggi)
    .map((a) => a.carico / (a.secondi / ORA));
  return valori.length >= s.usciteMinime ? mediana(valori) : null;
}

// La serie di Come sto (6.5) dai carichi delle attività, da zero al primo giorno, fino al giorno dato.
function fitnessDiComeSto(dati, giorno) {
  const tutte = attivitaAl(dati, giorno, { giorni: Infinity });
  const primo = tutte.length ? tutte[tutte.length - 1].giorno : giorno;
  const serie = serieCarico([], tutte, primo, { fino: giorno });
  return serie.length ? serie[serie.length - 1] : null;
}

function casoT5(dati, t2) {
  const righe = [];
  const attesi = [];
  const cambiati = [];
  for (const base of t2.righe) {
    const { v, g, uscite, r } = base;
    const vigilia = dati.vigilie.get(v.id) || null;
    const conf = r.confronto;
    const atteso5 = v.atteso && v.atteso.specchio ? v.atteso.specchio : null;
    const k83 = kComeIn83(uscite, v.vigilia);
    const alt = num(k83) && r.obiettivi ? specchio(k83, r.obiettivi.vMin, r.obiettivi.vComodo, conf.fitness, conf.inTapering) : null;
    const comeSto = fitnessDiComeSto(dati, v.vigilia);
    const senza = prontezzaAl(dati, v, v.vigilia, { giornata: g, uscite, fitness: null });
    if (senza.esito !== r.esito) cambiati.push(`${v.nome} ${ESITI[r.esito]} contro ${ESITI[senza.esito]}`);
    righe.push({ v, conf, k83, alt, vigilia, comeSto, senza: senza.esito });
    if (!atteso5) continue;

    const perche = "La regola di 2.6 conta solo le uscite con il carico da potenza, battito o sforzo";
    const esce = SPECCHI[conf.esito] || "senza Fitness";
    if (typeof atteso5.esito === "string") {
      const torna = esce === atteso5.esito;
      const regola = !torna && alt && SPECCHI[alt.esito] === atteso5.esito
        ? `${perche}, e qui k vale ${dec(conf.k)}. 8.3 conta anche i carichi stimati, con k ${dec(k83)} il confronto è ${SPECCHI[alt.esito]}.`
        : null;
      attesi.push(atteso("T5", `${v.nome}, confronto con la Fitness «${atteso5.esito}»`, `${esce}, Fitness ${dec(conf.confronto)} contro ${dec(conf.minimo)}-${dec(conf.comodo)}`, torna, regola));
    }
    if (num(atteso5.k)) {
      const torna = vicino(conf.k, atteso5.k, CRITERI.specchio);
      const regola = !torna && vicino(k83, atteso5.k, CRITERI.specchio) ? `${perche}. Con tutti i carichi k vale ${dec(k83)}.` : null;
      attesi.push(atteso("T5", `${v.nome}, k ${dec(atteso5.k, 0)}`, dec(conf.k), torna, regola));
    }
    if (num(atteso5.minimo) && num(atteso5.comodo)) {
      const torna = vicino(conf.minimo, atteso5.minimo, CRITERI.specchio) && vicino(conf.comodo, atteso5.comodo, CRITERI.specchio);
      const regola = !torna && alt && vicino(alt.minimo, atteso5.minimo, CRITERI.specchio) && vicino(alt.comodo, atteso5.comodo, CRITERI.specchio)
        ? `${perche}. Con k ${dec(k83)} viene ${dec(alt.minimo)}-${dec(alt.comodo)}.`
        : null;
      attesi.push(atteso("T5", `${v.nome}, Fitness minima e comoda ${dec(atteso5.minimo, 0)}-${dec(atteso5.comodo, 0)}`, `${dec(conf.minimo)}-${dec(conf.comodo)}`, torna, regola));
    }
  }
  attesi.push(atteso("T5", "nessun verdetto cambia togliendo la Fitness", cambiati.length ? `cambiano ${elenco(cambiati)}` : "nessuno cambia", cambiati.length === 0));
  return { righe, attesi };
}

// --- T6, il fattore carico dai viaggi carichi (1.7) ---

// I giorni carichi di almeno 3 ore degli ultimi 365 giorni, uniti per giorno, con le ore vere e
// quelle previste senza borse alla potenza della taratura, lo stesso conto di js/stima.js senza i
// limiti 1,00-1,40, raggruppati in giorni di fila. Servono a scrivere r di ogni uscita carica.
function usciteCariche(cariche, P, ciclista, oggi) {
  const perGiorno = new Map();
  for (const u of cariche) {
    const fondo = Object.hasOwn(PASSO.tipi, u.tipo || "") ? PASSO.tipi[u.tipo] : null;
    if (!fondo || u.rulli || u.eBike || !(u.secondi > 0) || !(u.metri > 0)) continue;
    const fa = giorniFra(u.giorno, oggi);
    if (fa < 0 || fa >= BORSE.giorni) continue;
    const km = u.metri / 1000;
    if (!num(u.dislivello) && km > PASSO.zeroOltreKm) continue;
    const previste = oreFormula({ km, metri: num(u.dislivello) ? u.dislivello : 0, potenza: P, massa: ciclista + fondo.biciKg + PASSO.acquaCiboKg, classe: fondo.classe });
    const g = perGiorno.get(u.giorno) || { giorno: u.giorno, ore: 0, previste: 0, evento: false };
    g.ore += u.secondi / ORA;
    g.previste += previste;
    g.evento = g.evento || u.borse === "evento";
    perGiorno.set(u.giorno, g);
  }
  const giorni = [...perGiorno.values()].filter((g) => g.ore >= BORSE.oreMinime).sort((a, b) => (a.giorno < b.giorno ? -1 : 1));
  const gruppi = [];
  for (const g of giorni) {
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && giorniFra(ultimo[ultimo.length - 1].giorno, g.giorno) === 1) ultimo.push(g);
    else gruppi.push([g]);
  }
  return gruppi.map((l) => ({ da: l[0].giorno, a: l[l.length - 1].giorno, giorni: l.length, ore: l.reduce((s, x) => s + x.ore, 0), previste: l.reduce((s, x) => s + x.previste, 0) }))
    .map((x) => ({ ...x, r: x.ore / x.previste }));
}

function casoT6(dati) {
  const righe = [];
  const attesi = [];
  const P = potenzaDi(dati);
  for (const v of dati.viaggi) {
    const profilo = profiloDi(dati, v);
    const lista = attivitaAl(dati, v.vigilia, { giorni: BORSE.giorni });
    const cariche = lista.filter((a) => a.borse === "evento" || a.borse === "parte");
    const fattore = fattoreCarico(cariche, profilo, P, { giorni: v.giorni, oggi: v.vigilia });
    const gruppi = usciteCariche(cariche, P, profilo.pesoKg, v.vigilia);
    const T = fattore ? oreDi(dati, v, percorsoRegistrato(v), { fattoreCarico: fattore }) : null;
    const riga = { v, fattore, gruppi, T, scarto: num(T) ? T / v.oreVere - 1 : null };
    righe.push(riga);
    if (v.atteso && v.atteso.fattoreCarico) {
      attesi.push(atteso("T6", `${v.nome}, il fattore carico dai viaggi carichi prima, calcolato e scritto`,
        fattore ? `${dec(fattore.fattore, 3)}, livello ${fattore.livello}` : "nessuna uscita carica", Boolean(fattore)));
      attesi.push(atteso("T6", `${v.nome}, con quel fattore T entro ±${dec(100 * CRITERI.conFattore, 0)}% delle ore vere`,
        num(T) ? `${dec(T)} ore, ${perc(riga.scarto)}` : "-", num(riga.scarto) && Math.abs(riga.scarto) <= CRITERI.conFattore + EPS));
    }
  }
  return { righe, attesi };
}

// --- Tutto ---

export function rifai(cartella) {
  const dati = leggiTaratura(cartella);
  const t1 = casoT1(dati);
  const t2 = casoT2(dati);
  const t3 = casoT3(dati, t2);
  const t4 = casoT4(dati, t2);
  const t5 = casoT5(dati, t2);
  const t6 = casoT6(dati);
  const attesi = [...t1.attesi, ...t2.attesi, ...t3.attesi, ...t4.attesi, ...t5.attesi, ...t6.attesi];
  return { dati, P: potenzaDi(dati), t1, t2, t3, t4, t5, t6, attesi };
}

// --- L'uscita, a righe o in Markdown ---

const giorniDi = (g) => (g === 1 ? "1 giorno" : `${g} giorni`);
const forbice = (H) => `forbice da ${dec(H * (1 - STIMA.forbice[1]), 1)} a ${dec(H * (1 + STIMA.forbice[1]), 1)}, alla mezz'ora ${dec(arrotondaMezzora(H))}`;
const NOMI_AVVISI = Object.freeze({ doppioUso: "doppio uso", intensita: "Fitness alta e ore lunghe che mancano", sforzo: "chiedere lo sforzo dei giri" });
const MOTIVI_FIDUCIA = Object.freeze({
  borse: (n) => `${n} uscite di almeno 3 ore senza la risposta sulle borse`,
  ore: (n) => `${n} uscite senza la durata`,
  settimane: (n) => `${n} settimane di dati`,
  stima: () => "la stima della giornata al livello 0",
});
const MOTIVI_GIORNI = Object.freeze({ tetto: "per il tetto delle ore al giorno", tempo: "per le ore che ci sono", lunga: "per l'uscita lunga", uscite: "per togliere il poco pronto" });

function testoProve(s) {
  if (!s.prove.length) return "nessuna prova minima";
  return s.prove.map((x) => {
    if (x.stato === "manca") return `${x.prova} manca`;
    const quando = x.da === x.a ? `il ${x.a}` : `dal ${x.da} al ${x.a}`;
    return `${x.prova} ${x.stato === "inProgramma" ? "in programma " : ""}${quando}${x.tardi ? ", fatta tardi" : ""}${x.doppioUso ? ", doppio uso" : ""}`;
  }).join(", ");
}

function testoFiducia(f) {
  if (!f) return "-";
  const m = f.motivo && MOTIVI_FIDUCIA[f.motivo.tipo] ? `, ${MOTIVI_FIDUCIA[f.motivo.tipo](f.motivo.quanti)}` : "";
  return `${f.livello}${m}`;
}

function testoProposta(p) {
  if (!p) return "nessuna";
  const parti = [];
  if (p.giorni) parti.push(`${giorniDi(p.giorni)}${p.motivo ? ` ${MOTIVI_GIORNI[p.motivo] || p.motivo}` : ""}`);
  if (p.tipo === "corto") parti.push(`poi il percorso ${p.percorso.id}`);
  if (p.tipo === "adattare") parti.push("poi arrivare e adattare");
  if (num(p.lRif)) parti.push(`uscita di riferimento ${dec(p.lRif, 2)} ore${p.lRifDalPiano ? " dal piano" : ""}`);
  return parti.join(", ");
}

function sezioneT1(t1, P, md) {
  const out = [];
  if (md) {
    out.push("| Viaggio | Classe | Registrati | Masse | T del modello | T vere | Scarto | Con i totali del catalogo |", "|---|---|---|---|---|---|---|---|");
    for (const x of t1.righe) {
      const m = x.v.masse;
      out.push(`| ${x.v.nome} | ${x.v.classe} | ${migliaia(x.v.km)} km, ${migliaia(x.v.dislivello)} m | ${m.ciclista} + ${m.bici} + ${m.borse} + ${m.acquaCibo} kg | ${dec(x.T, 1)} ore | ${dec(x.v.oreVere, 1)} ore | ${perc(x.scarto)} | ${dec(x.catalogo.T, 1)} ore, ${perc(x.catalogo.scarto)}${x.catalogo.ufficiale ? "" : ", dislivello di lavoro"} |`);
    }
    out.push("");
  } else {
    for (const x of t1.righe) out.push(`  ${x.v.nome}, ${x.v.classe}, T ${dec(x.T, 2)} ore contro ${dec(x.v.oreVere, 2)} vere, scarto ${perc(x.scarto, 2)}, con il catalogo ${dec(x.catalogo.T, 2)} ore e ${perc(x.catalogo.scarto, 2)}`);
  }
  const punto = md ? "- " : "  ";
  for (const x of t1.righe) {
    if (x.unCasoSolo) out.push(`${punto}${x.v.nome}, lasciato fuori. Con la C della classe ${x.v.classe} rifatta dai soli profili tipo, ${dec(x.unCasoSolo.c, 2)} a 122 W contro ${dec(x.unCasoSolo.cClasse, 1)}, T viene ${dec(x.unCasoSolo.T, 1)} ore, scarto ${perc(x.unCasoSolo.scarto)}, un caso solo.`);
    if (x.confronto) out.push(`${punto}${x.v.nome} con la classe ${x.confronto.classe}, C ${dec(STIMA.classi[x.confronto.classe].c, 1)}, T ${dec(x.confronto.T, 1)} ore, scarto ${perc(x.confronto.scarto)}.`);
  }
  for (const x of t1.righe) {
    const p = x.passo;
    if (p && num(p.T)) out.push(`${punto}Passo dai giri, ${x.v.nome}, ${p.giri} giri degli ultimi ${p.giorni} giorni${p.tolti ? ` e ${p.tolti} tolti` : ""}, P dei giri ${dec(p.pGiri, 1)} W, giornata ${dec(p.P, 1)} W${p.limitata ? " per il tetto" : ""}, T ${dec(p.T, 1)} ore, scarto ${perc(p.scarto)}. Confronto senza soglia.`);
    else out.push(`${punto}Passo dai giri, ${x.v.nome}, i giri non bastano, la potenza verrebbe dalla fonte «${p ? p.fonte : "-"}».`);
  }
  out.push(`${punto}La potenza della giornata è ${dec(P, 1)} W per tutti, e il fattore del dislivello è quello del viaggio, perché il dislivello registrato è già del dispositivo.`);
  return out;
}

function sezioneT2(t2, md) {
  const out = [];
  if (md) {
    out.push("| Viaggio | Classe e H | Forbice di H | V_min e V_comodo | V | LT e L | Buco | Difetti | Verdetto |", "|---|---|---|---|---|---|---|---|---|");
    for (const x of t2.righe) {
      const s = x.s;
      out.push(`| ${x.v.nome} | ${CLASSI[s.classe]}, ${dec(s.H, 2)} ${DA_DOVE[s.da]} | ${forbice(s.H).replace("forbice ", "")} | ${dec(s.vMin, 2)} e ${dec(s.vComodo, 2)} | ${dec(s.V, 2)} | ${dec(s.lt, 2)} e ${dec(s.L, 2)}, il ${s.giornoL || "-"} | ${s.buco} giorni | ${s.difetti ? s.difetti.join(", ") : "-"} | ${ESITI[s.esito]} |`);
    }
    out.push("");
  } else {
    for (const x of t2.righe) {
      const s = x.s;
      out.push(`  ${x.v.nome}, ${CLASSI[s.classe]}, H ${dec(s.H, 2)} ${DA_DOVE[s.da]}, ${forbice(s.H)}, V ${dec(s.V, 2)} contro ${dec(s.vMin, 2)}-${dec(s.vComodo, 2)}, L ${dec(s.L, 2)} contro LT ${dec(s.lt, 2)}, buco ${s.buco}, difetti ${s.difetti ? s.difetti.join(" ") : "-"}, ${ESITI[s.esito]}`);
    }
  }
  const punto = md ? "- " : "  ";
  for (const x of t2.righe) {
    const s = x.s;
    const v = s.verdetto;
    const avvisi = s.avvisi.map((a) => NOMI_AVVISI[a] || a);
    const testoApp = v ? ` A schermo «${v.titolo}». ${[v.perche, v.cosa].filter(Boolean).join(" ")}` : "";
    out.push(`${punto}${x.v.nome}. Prove ${testoProve(s)}. Avvisi ${elenco(avvisi)}. Fiducia ${testoFiducia(s.fiducia)}. Proposta ${testoProposta(s.proposta)}.${testoApp}`);
    for (const y of x.varianti) {
      if (!y.r) out.push(`${punto}${x.v.nome}, variante «${y.caso}», non la so rifare.`);
      else out.push(`${punto}${x.v.nome}, variante «${y.caso}», sui giorni ${elenco(y.vb.giorni)}. ${maiuscola(ESITI[y.s.esito])}, difetti ${y.s.difetti.join(", ")}, prove ${testoProve(y.s)}.`);
    }
  }
  return out;
}

function sezioneT3(t3, md) {
  const out = [];
  const punto = md ? "- " : "  ";
  for (const x of t3.righe) {
    // La forbice a tratti con lo stesso verdetto.
    const tratti = [];
    for (const f of x.forbice) {
      const ultimo = tratti[tratti.length - 1];
      if (ultimo && ultimo.esito === f.esito) ultimo.a = f.quota;
      else tratti.push({ esito: f.esito, da: f.quota, a: f.quota });
    }
    out.push(`${punto}${x.v.nome}, H ${dec(x.g.H, 2)}. Da ${perc(-0.3, 0)} a ${perc(0.3, 0)} ${tratti.map((t) => `${ESITI[t.esito]} da ${perc(t.da, 0)} a ${perc(t.a, 0)}`).join(", ")}.`);
    if (x.gradino) {
      const gr = x.gradino;
      out.push(`${punto}Il gradino delle ${dec(gr.daH ?? gr.H, 0)} ore. Con H da ${dec(gr.H, 2)}, cioè ${perc(gr.H / x.g.H - 1)}, il minimo delle ore a settimana sale da ${dec(gr.vMinPrima, 2)} a ${dec(gr.vMinDopo, 2)} contro le ${dec(gr.V, 2)} fatte, il volume passa dal difetto ${gr.difettiPrima[0]} al ${gr.difettiDopo[0]} e il verdetto diventa ${ESITI[gr.esito]}. È l'effetto della tabella 7.7, da ritarare per primo con i dati della BAS (8.7).`);
    }
  }
  return out;
}

function sezioneT4(t4, md) {
  const out = [];
  const punto = md ? "- " : "  ";
  for (const x of t4.righe) {
    for (const g of x.giorni) {
      const r = g.r;
      out.push(`${punto}${x.v.nome}, ${g.quando === "vigilia" ? "alla vigilia" : `il ${g.giorno}`}, a ${dec(g.settimane, 1)} settimane. Fase ${r.fase}, ${ESITI[r.esito] || r.esito}. Proposta ${testoProposta(r.proposta)}.${r.proiezione && r.proiezione.frase ? ` La frase «${r.proiezione.frase}»` : ""}`);
    }
    const s = x.seiSettimane;
    const r = s.r;
    out.push(`${punto}Come informazione, 8.4 a 6 settimane, il ${s.giorno}, con il piano ${r.piano && r.piano.schema ? r.piano.schema.nome : "-"}. Fase ${r.fase}, ${ESITI[r.esito] || r.esito}, ore a settimana proiettate ${r.pilastri ? dec(r.pilastri.volume.valore, 2) : "-"}. Proposta ${testoProposta(r.proposta)}.${r.proiezione && r.proiezione.frase ? ` La frase «${r.proiezione.frase}»` : ""}`);
  }
  return out;
}

function sezioneT5(t5, md) {
  const out = [];
  if (md) {
    out.push("| Viaggio | k | Minimo e comodo | Fitness alla vigilia, e divisa per 0,9 | Confronto | Con il k di 8.3 | Fitness di Come sto dai giri |", "|---|---|---|---|---|---|---|");
    for (const x of t5.righe) {
      const c = x.conf;
      out.push(`| ${x.v.nome} | ${dec(c.k)} | ${dec(c.minimo)}-${dec(c.comodo)} | ${dec(c.fitness)}${c.inTapering ? `, ${dec(c.confronto)}` : ""} | ${SPECCHI[c.esito] || "-"} | ${x.alt ? `k ${dec(x.k83)}, ${dec(x.alt.minimo)}-${dec(x.alt.comodo)}, ${SPECCHI[x.alt.esito]}` : "-"} | ${x.comeSto ? dec(x.comeSto.fitness) : "-"} |`);
    }
    out.push("");
  } else {
    for (const x of t5.righe) {
      const c = x.conf;
      out.push(`  ${x.v.nome}, k ${dec(c.k)}, ${dec(c.minimo)}-${dec(c.comodo)}, Fitness ${dec(c.fitness)}${c.inTapering ? ` divisa per 0,9 ${dec(c.confronto)}` : ""}, ${SPECCHI[c.esito] || "-"}${x.alt ? `, con il k di 8.3 ${dec(x.k83)} ${SPECCHI[x.alt.esito]}` : ""}, Fitness di Come sto dai giri ${x.comeSto ? dec(x.comeSto.fitness) : "-"}`);
    }
  }
  const punto = md ? "- " : "  ";
  out.push(`${punto}La Fitness è quella della serie ricostruita in vigilie.json. Quella di Come sto, rifatta da zero con js/carico.js dai carichi dei giri, non conta la palestra (regola 1.6) e serve solo da controllo.`);
  return out;
}

function sezioneT6(t6, md) {
  const out = [];
  const punto = md ? "- " : "  ";
  for (const x of t6.righe) {
    const f = x.fattore;
    const gruppi = x.gruppi.map((g) => `${g.da === g.a ? `il ${g.da}` : `dal ${g.da} al ${g.a}`} r ${dec(g.r, 2)}`);
    out.push(`${punto}${x.v.nome}. Uscite cariche dei 365 giorni prima ${elenco(gruppi, "nessuna")}. ${f ? `Fattore ${dec(f.fattore, 3)}, livello ${f.livello}, dal ${f.data}${f.giorni ? ` per ${giorniDi(f.giorni)}` : ""}, T ${dec(x.T, 1)} ore, scarto ${perc(x.scarto)}.` : "Nessun fattore, valgono le borse del modello."}`);
  }
  out.push(`${punto}r è ore vere diviso ore previste senza borse, che il fattore tiene fra ${dec(BORSE.minimo, 2)} e ${dec(BORSE.massimo, 2)} (1.7).`);
  return out;
}

const STATI = { torna: "torna", regola: "non torna per la regola scritta così", "non torna": "NON TORNA" };

function sezioneAttesi(attesi, caso, md) {
  const out = [];
  for (const a of attesi.filter((x) => x.caso === caso)) {
    out.push(`${md ? "- " : "  "}${a.cosa}, esce ${a.esce}, ${STATI[a.stato]}.${a.perche ? ` ${a.perche}` : ""}`);
  }
  return out;
}

function testo(risultato, opzioni) {
  const { P, attesi } = risultato;
  const md = opzioni.md;
  const out = [];
  const titolo = (t) => (md ? out.push(`## ${t}`, "") : out.push(t));
  const fine = () => out.push("");
  const intro = `La potenza della giornata è ${dec(P, 1)} W, cioè ${dec(STIMA.potenza.quotaFtp, 3)} per la FTP del profilo della taratura, la fonte 1 di 1.4 come in 8.2, con la forbice del livello 1. Le uscite di ogni giorno sono quelle che l'app legge, i ${CHIAMATE.primaLetturaGiorni} giorni fino a quel giorno, passate da js/dati.js, e il fattore carico guarda ${BORSE.giorni} giorni. Le righe esportate da Strava non hanno l'ora, quindi la prima del giorno parte alle 8 e le altre 3 ore dopo la fine della precedente. «non so» sulle borse vale senza risposta. Le mattine, il caso T7, le rifà strumenti/taratura-mattine.mjs.`;
  if (md) {
    out.push("# Le ore e i verdetti dei viaggi con le regole nuove", "");
    out.push(`*Cartella privata, mai nel repository, mai su Notion, mai condivisa. Esito di \`strumenti/taratura.mjs\` (casi T1-T6 di 9.10, capitolo 8 della specifica), rifatto il ${oggiLocale()}.*`, "");
    out.push(intro, "");
  } else {
    out.push(intro, "");
  }
  const sezioni = [
    ["T1, le ore stimate contro le ore vere (8.2)", "T1", sezioneT1(risultato.t1, P, md)],
    ["T2, pronto o no alla vigilia (8.3)", "T2", sezioneT2(risultato.t2, md)],
    ["T3, la sensibilità a H (8.7)", "T3", sezioneT3(risultato.t3, md)],
    ["T4, i giorni consigliati (2.8 e 8.4)", "T4", sezioneT4(risultato.t4, md)],
    ["T5, il confronto con la Fitness (2.6 e 8.3)", "T5", sezioneT5(risultato.t5, md)],
    ["T6, il fattore carico dai viaggi carichi (1.7)", "T6", sezioneT6(risultato.t6, md)],
  ];
  for (const [nome, caso, righe] of sezioni) {
    titolo(nome);
    out.push(...righe);
    fine();
    if (md) out.push(`Gli attesi di ${caso}.`, "");
    else out.push(`  Gli attesi di ${caso}`);
    out.push(...sezioneAttesi(attesi, caso, md));
    fine();
  }
  const tornano = attesi.filter((a) => a.stato === "torna").length;
  const regola = attesi.filter((a) => a.stato === "regola").length;
  const no = attesi.filter((a) => a.stato === "non torna").length;
  titolo("In tutto");
  out.push(`${attesi.length} attesi, ${tornano} tornano, ${regola} non tornano per come è scritta una regola, ${no} non tornano.`);
  return out.join("\n");
}

// --- Da riga di comando ---

function leggiOpzioni(argv) {
  const o = { md: false, scrivi: false };
  for (const a of argv) {
    const chiave = a.replace(/^--/, "");
    if (chiave === "md" || chiave === "scrivi") o[chiave] = true;
    else throw new Error(`opzione che non conosco, ${a}`);
  }
  if (o.scrivi) o.md = true;
  return o;
}

function principale() {
  let opzioni;
  try {
    opzioni = leggiOpzioni(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    return 2;
  }
  const cartella = cartellaPrivata();
  if (!cartella) {
    console.log("taratura privata assente");
    return 0;
  }
  if (dentroIlRepository(cartella)) {
    console.error("la cartella della taratura sta dentro il repository, e lì non ci deve stare");
    return 2;
  }
  const risultato = rifai(cartella);
  const uscita = testo(risultato, opzioni);
  const noTorna = risultato.attesi.filter((a) => a.stato === "non torna").length;
  if (opzioni.scrivi) {
    writeFileSync(join(cartella, FILE_ESITO), `${uscita}\n`, "utf8");
    const tornano = risultato.attesi.filter((a) => a.stato === "torna").length;
    console.log(`scritto ${FILE_ESITO} nella cartella privata, ${tornano} attesi su ${risultato.attesi.length} tornano e ${noTorna} non tornano`);
  } else console.log(uscita);
  return noTorna ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = principale();
}
