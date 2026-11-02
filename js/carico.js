// La serie di carico di Come sto (6.5 della specifica). Per ogni attività sceglie da dove viene il
// carico, cioè potenza, battito, sforzo detto o stima grezza, e da lì calcola Fitness, Fatica e
// Fatica lenta giorno per giorno con il conto di intervals.icu. Lavora su attività già pulite da
// js/dati.js e non conosce la forma delle risposte di intervals.icu.
// Niente DOM e niente window, così si prova con node (test/carico.test.mjs).
// I numeri stanno in js/parametri.js, nel gruppo CARICO.

import { CARICO, DATI, PRONTEZZA } from "./parametri.js?v=202611021803";
import { TESTI_DATI } from "./testi-dati.js?v=202611021803";

const ORA = 3600;
const GIORNO_MS = 86400000;

// La qualità di ogni numero (6.2), interna. js/dati.js la usa per tutti i campi delle attività.
export const QUALITA = Object.freeze({ vera: "vera", detta: "detta da te", stimata: "stimata", manca: "manca" });

// Da dove viene il carico di un'attività.
export const FONTI = Object.freeze({
  potenza: "potenza",       // device_watts e il carico di intervals.icu
  battito: "battito",       // has_heartrate e il carico di intervals.icu
  intervals: "intervals",   // un carico che c'è su intervals.icu senza sensori, per esempio messo a mano
  sforzo: "sforzo",         // sforzo detto × minuti / divisore
  palestra: "palestra",     // sforzo × minuti / 5 × fattore, solo nella Fatica
  nascosto: "nascosto",     // uno stub, con il carico che intervals.icu ha contato nel giorno senza mostrarlo
  stima: "stima",           // la stima grezza, senza sensori e senza sforzo
});

const num = (v) => typeof v === "number" && Number.isFinite(v);
const limita = (x, minimo, massimo) => Math.min(massimo, Math.max(minimo, x));

export function mediana(valori) {
  const v = [...valori].sort((a, b) => a - b);
  const n = v.length;
  if (!n) return null;
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
}

function utc(iso) {
  const [a, m, g] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}

const piuGiorni = (iso, n) => new Date(utc(iso) + n * GIORNO_MS).toISOString().slice(0, 10);

// --- Che attività è ---

const TIPI_BICI = new Set([...DATI.tipiBici, ...DATI.tipiEbike]);
const TIPI_PALESTRA = new Set(CARICO.tipiPalestra);

// Bici, rulli ed e-bike. Uno stub senza tipo vale bici, come dice 2.2.
export function inBici(a) {
  return Boolean(a) && (TIPI_BICI.has(a.tipo) || (a.stub === true && !a.tipo));
}

export function inPalestra(a) {
  return Boolean(a) && TIPI_PALESTRA.has(a.tipo);
}

// La base della stima grezza per tipo. Velomobile ed e-bike prendono quella della bici più vicina.
const BASE_TIPO = {
  Ride: "Ride", GravelRide: "GravelRide", MountainBikeRide: "MountainBikeRide", Velomobile: "Ride",
  EBikeRide: "Ride", EMountainBikeRide: "MountainBikeRide", VirtualRide: "rulli",
};

// --- La fonte del carico ---

// Il divisore dello sforzo per una certa durata, da un numero o dal risultato di divisoreSforzo.
export function divisorePer(divisore, secondi) {
  if (num(divisore) && divisore > 0) return divisore;
  if (divisore && typeof divisore === "object") {
    const d = secondi >= CARICO.sforzo.oreSoglia * ORA ? divisore.sopra : divisore.sotto;
    if (num(d) && d > 0) return d;
  }
  return CARICO.sforzo.divisore;
}

// La stima grezza, solo senza sensori e senza sforzo (regola 1.4). IF dal tipo, dalla salita, dalla
// velocità e dalle borse, poi il tetto continuo che cala con le ore. Con un tetto che non scende mai
// sotto 0,60 anche IF non scende sotto 0,60, la lettura che dà più carico. Senza i km valgono
// 40 punti all'ora. Restituisce { carico, intensita }.
export function stimaGrezza(a) {
  const ore = a && a.secondi > 0 ? a.secondi / ORA : null;
  if (!ore) return { carico: null, intensita: null };
  if (!(a.metri > 0)) return { carico: ore * CARICO.puntiOraSenzaDati, intensita: null };
  const g = CARICO.stimaGrezza;
  const chiave = a.rulli ? "rulli" : (BASE_TIPO[a.tipo] || "Ride");
  const km = a.metri / 1000;
  const salita = Math.min(num(a.dislivello) && a.dislivello > 0 ? a.dislivello / km : 0, g.salitaMetriPerKm);
  const riferimento = g.velocitaRiferimento[chiave];
  const velocita = limita((km / ore - riferimento) / riferimento * g.velocitaPeso, g.velocitaMinimo, g.velocitaMassimo);
  const borse = a.borse === "parte" || a.borse === "evento" ? g.borse : 0;
  const tetto = Math.max(g.tetto.minimo, g.tetto.base - g.tetto.perOra * ore);
  const intensita = limita(g.base[chiave] + salita / g.salitaMetriPerKm * g.salitaPeso + velocita + borse, g.tetto.minimo, tetto);
  return { carico: ore * intensita * intensita * 100, intensita };
}

function esito(carico, fonte, qualita) {
  return { carico: num(carico) ? carico : null, fonte: num(carico) ? fonte : null, qualita: num(carico) ? qualita : QUALITA.manca };
}

// Da dove viene il carico di un'attività pulita da js/dati.js, nell'ordine di 6.5 (regola 1.2).
// Restituisce { carico, fonte, qualita }. Il carico stimato non si somma mai a quello di
// intervals.icu della stessa attività, si sceglie uno solo dei due. profilo serve alle regole che
// arrivano Presto, come il caldo, e oggi non cambia il conto. divisore è un numero o il risultato
// di divisoreSforzo, e senza vale 5.
export function fonteCarico(a, profilo = {}, divisore = null) {
  if (!a) return esito(null, null, QUALITA.manca);
  const minuti = a.secondi > 0 ? a.secondi / 60 : null;
  const icu = num(a.caricoIcu) && a.caricoIcu > 0 ? a.caricoIcu : null;
  const sforzo = num(a.sforzo) && a.sforzo > 0 ? a.sforzo : null;
  const qualitaSforzo = a.qualita && a.qualita.sforzo === QUALITA.stimata ? QUALITA.stimata : QUALITA.detta;

  // Gli stub prendono il carico nascosto del giorno, e con il nascosto a zero vale lo sforzo detto.
  if (a.stub) {
    if (num(a.caricoNascosto) && a.caricoNascosto > 0) {
      return esito(a.caricoNascosto, FONTI.nascosto, a.stubDelGiorno > 1 ? QUALITA.stimata : QUALITA.vera);
    }
    if (sforzo && minuti) return esito(sforzo * minuti / divisorePer(divisore, a.secondi), FONTI.sforzo, qualitaSforzo);
    if (a.caricoNascosto === 0 && minuti && inBici(a)) return esito(stimaGrezza(a).carico, FONTI.stima, QUALITA.stimata);
    return esito(null, null, QUALITA.manca);
  }

  // La palestra mai dal battito al polso (regola 1.6). Un carico messo a mano su intervals.icu, senza
  // battito, resta. Senza risposta valgono sforzo 5 e fattore 0,7, e il carico è stimato.
  if (inPalestra(a)) {
    const p = CARICO.palestra;
    const fattore = num(p[a.allenato]) ? p[a.allenato] : p.fattorePredefinito;
    const durata = minuti || (a.secondiTotali > 0 ? a.secondiTotali / 60 : p.minutiPredefiniti);
    if (sforzo) return esito(sforzo * durata / CARICO.sforzo.divisore * fattore, FONTI.palestra, qualitaSforzo);
    if (icu && !a.battito) return esito(icu, FONTI.intervals, a.daComeSto ? QUALITA.detta : QUALITA.vera);
    return esito(p.sforzoPredefinito * durata / CARICO.sforzo.divisore * fattore, FONTI.palestra, QUALITA.stimata);
  }

  if (a.potenza && icu) return esito(icu, FONTI.potenza, QUALITA.vera);
  if (a.battito && icu) return esito(icu, FONTI.battito, QUALITA.vera);
  // Un carico su intervals.icu senza potenza né battito lo ha messo qualcuno, la persona o Come sto con
  // lo sforzo, e vale così com'è.
  if (icu) return a.daComeSto ? esito(icu, FONTI.sforzo, QUALITA.detta) : esito(icu, FONTI.intervals, QUALITA.vera);
  if (sforzo && minuti) return esito(sforzo * minuti / divisorePer(divisore, a.secondi), FONTI.sforzo, qualitaSforzo);
  if (inBici(a) && minuti) return esito(stimaGrezza(a).carico, FONTI.stima, QUALITA.stimata);
  return esito(null, null, QUALITA.manca);
}

const conSensore = (a) => (a.potenza || a.battito) && num(a.caricoIcu) && a.caricoIcu > 0;
const biciPersonale = (a) => inBici(a) && !a.stub && !DATI.tipiEbike.includes(a.tipo);

// Il divisore personale dello sforzo (regola 1.3). Il rapporto mediano fra sforzo × minuti e punti
// delle uscite in bici con sensori e sforzo, a parte sotto e sopra le 3 ore. Ognuna delle due parti
// diventa personale solo con almeno 10 uscite sue, altrimenti resta 5.
export function divisoreSforzo(attivita) {
  const sotto = [];
  const sopra = [];
  for (const a of Array.isArray(attivita) ? attivita : []) {
    if (!a || !biciPersonale(a) || !conSensore(a) || !(a.sforzo > 0) || !(a.secondi > 0)) continue;
    const rapporto = a.sforzo * (a.secondi / 60) / a.caricoIcu;
    (a.secondi >= CARICO.sforzo.oreSoglia * ORA ? sopra : sotto).push(rapporto);
  }
  const { divisore, usciteDivisore } = CARICO.sforzo;
  return {
    sotto: sotto.length >= usciteDivisore ? mediana(sotto) : divisore,
    sopra: sopra.length >= usciteDivisore ? mediana(sopra) : divisore,
    usciteSotto: sotto.length,
    usciteSopra: sopra.length,
  };
}

// k, i punti per ora della persona (2.6). La mediana delle uscite in bici di almeno 45 minuti delle
// ultime 6 settimane con il carico da potenza, battito o sforzo, 40 se sono meno di 3.
export function puntiOra(attivita, oggi) {
  const s = PRONTEZZA.specchi;
  const dal = oggi ? piuGiorni(oggi, -7 * s.settimane) : null;
  const valori = (Array.isArray(attivita) ? attivita : [])
    .filter((a) => a && biciPersonale(a) && a.secondi >= s.minutiMinimi * 60 && a.carico > 0)
    .filter((a) => [FONTI.potenza, FONTI.battito, FONTI.sforzo].includes(a.fonteCarico))
    .filter((a) => !oggi || (a.giorno > dal && a.giorno <= oggi))
    .map((a) => a.carico / (a.secondi / ORA));
  return valori.length >= s.usciteMinime ? mediana(valori) : CARICO.puntiOraSenzaDati;
}

// --- La serie, giorno per giorno ---

// Quanto resta del valore di ieri e quanto entra del carico di oggi. La forma esponenziale è quella
// di intervals.icu (regola 1.7, forum 4485), la forma a passi è quella di oggi in js/modello.js.
function passo(giorni, forma) {
  if (forma === "passi") return { resta: 1 - 1 / giorni, entra: 1 / giorni };
  const resta = Math.exp(-1 / giorni);
  return { resta, entra: 1 - resta };
}

// Il carico di ogni giorno, per la Fitness (senza palestra) e per la Fatica (con la palestra).
function carichiPerGiorno(attivita) {
  const perGiorno = new Map();
  for (const a of Array.isArray(attivita) ? attivita : []) {
    if (!a || typeof a.giorno !== "string" || !(a.carico > 0)) continue;
    const c = perGiorno.get(a.giorno) || { fitness: 0, fatica: 0, attivita: [] };
    const palestra = inPalestra(a);
    c.fitness += a.carico * (palestra ? CARICO.palestraNellaFitness : 1);
    c.fatica += a.carico * (palestra ? CARICO.palestraNellaFatica : 1);
    c.attivita.push(a);
    perGiorno.set(a.giorno, c);
  }
  return perGiorno;
}

function costruisciSerie(giorni, perGiorno, partenza, opzioni, caricoDi) {
  const perData = new Map();
  for (const g of Array.isArray(giorni) ? giorni : []) if (g && typeof g.d === "string") perData.set(g.d, g);
  const date = [...perData.keys(), ...perGiorno.keys()].sort();
  const inizio = partenza || date[0];
  const fine = opzioni.fino || date[date.length - 1];
  if (!inizio || !fine || inizio > fine) return [];
  const s = CARICO.serie;
  const forma = opzioni.forma || s.forma;
  const pFitness = passo(s.fitness, forma);
  const pFatica = passo(s.fatica, forma);
  const pLenta = passo(s.faticaLenta, forma);
  const primo = perData.get(inizio);
  const daIntervals = Boolean(primo && num(primo.ctl) && num(primo.atl));
  let fitness = daIntervals ? primo.ctl : 0;
  let fatica = daIntervals ? primo.atl : 0;
  let lenta = fatica;
  const serie = [];
  for (let d = inizio; d <= fine; d = piuGiorni(d, 1)) {
    const g = perData.get(d) || null;
    const c = caricoDi(d, g);
    if (!(d === inizio && daIntervals)) {
      fitness = fitness * pFitness.resta + c.fitness * pFitness.entra;
      fatica = fatica * pFatica.resta + c.fatica * pFatica.entra;
      lenta = lenta * pLenta.resta + c.fatica * pLenta.entra;
    }
    serie.push({
      d,
      carico: c.fatica,
      caricoFitness: c.fitness,
      fitness,
      fatica,
      faticaLenta: lenta,
      ctl: g && num(g.ctl) ? g.ctl : null,
      atl: g && num(g.atl) ? g.atl : null,
    });
  }
  return serie;
}

// Fitness, Fatica e Fatica lenta di Come sto, un giorno per riga dalla partenza all'ultimo giorno.
// giorni sono i giorni puliti da js/dati.js (servono ctl e atl di intervals.icu del primo giorno),
// attivita quelle di preparaAttivita con il carico scelto. Il primo giorno parte dai valori di
// intervals.icu, se ci sono, altrimenti da zero. partenza è la data del primo giorno, di solito
// 182 giorni prima di oggi, e senza vale il giorno più vecchio. opzioni.fino è l'ultimo giorno,
// opzioni.forma «esponenziale» o «passi» (di default quella di js/parametri.js).
export function serieCarico(giorni, attivita, partenza = null, opzioni = {}) {
  const perGiorno = carichiPerGiorno(attivita);
  return costruisciSerie(giorni, perGiorno, partenza, opzioni, (d) => perGiorno.get(d) || { fitness: 0, fatica: 0 });
}

// La riga sotto la Fitness, solo in «Per chi ama i numeri», quando quella di Come sto e quella di
// intervals.icu differiscono di oltre il 10% e di oltre 3 punti. Restituisce { scarto, testo } o null.
export function differenzaFitness(nostra, intervals) {
  if (!num(nostra) || !num(intervals)) return null;
  const scarto = nostra - intervals;
  const { quota, punti } = CARICO.differenzaSchermo;
  if (Math.abs(scarto) <= punti || Math.abs(scarto) <= quota * Math.abs(intervals)) return null;
  return { scarto, testo: scarto > 0 ? TESTI_DATI.fitnessPiuBassaSuIntervals : TESTI_DATI.fitnessPiuAltaSuIntervals };
}

const FONTI_CONFRONTABILI = new Set([FONTI.potenza, FONTI.battito, FONTI.nascosto]);

// La prova di coincidenza (6.5), da fare sui dati privati prima che la serie voti nel semaforo.
// Si confronta la serie con ctl e atl di intervals.icu nei giorni con tutte le attività con potenza
// o battito (e gli stub, che hanno il carico di intervals.icu). Negli altri giorni la serie di
// prova usa il carico del giorno di intervals.icu, così un giorno diverso, per esempio con la
// palestra o con un doppione, non sposta i confronti dei giorni dopo. Restituisce
// { passa, giorni, scartoFitness, scartoFatica }.
export function provaCoincidenza(giorni, attivita, opzioni = {}) {
  const perGiorno = carichiPerGiorno(attivita);
  const confrontabile = (d) => {
    const c = perGiorno.get(d);
    return Boolean(c) && c.attivita.every((a) => FONTI_CONFRONTABILI.has(a.fonteCarico) && !(a.doppioni && a.doppioni.length));
  };
  const caricoDi = (d, g) => {
    if (confrontabile(d)) return perGiorno.get(d);
    const fatica = g && num(g.caricoFatica) ? g.caricoFatica : g && num(g.carico) ? g.carico : 0;
    const fitness = g && num(g.caricoFitness) ? g.caricoFitness : fatica;
    return { fitness, fatica };
  };
  const serie = costruisciSerie(giorni, perGiorno, opzioni.partenza || null, opzioni, caricoDi);
  let n = 0;
  let scartoFitness = 0;
  let scartoFatica = 0;
  for (const r of serie) {
    if (!confrontabile(r.d) || r.ctl === null || r.atl === null) continue;
    n += 1;
    scartoFitness = Math.max(scartoFitness, Math.abs(r.fitness - r.ctl));
    scartoFatica = Math.max(scartoFatica, Math.abs(r.fatica - r.atl));
  }
  const tolleranza = CARICO.serie.coincidenza;
  return { passa: n > 0 && scartoFitness <= tolleranza && scartoFatica <= tolleranza, giorni: n, scartoFitness, scartoFatica };
}

// --- Il controllo incrociato (regola 1.5) ---

// Due avvisi per un'attività con il carico da sensore e lo sforzo. «incerti» se il carico dallo
// sforzo (× minuti / 5) differisce di oltre il 40% da quello del sensore, «soglia» se un'uscita
// «Facile» o «Media» supera 70 punti all'ora dalla potenza. Restituisce una lista di
// { tipo, testo }, vuota se non c'è niente da dire.
export function controlloIncrociato(a) {
  const avvisi = [];
  if (!a || !(a.secondi > 0) || !(a.carico > 0) || !(a.sforzo > 0)) return avvisi;
  if (a.fonteCarico !== FONTI.potenza && a.fonteCarico !== FONTI.battito) return avvisi;
  const c = CARICO.controlloIncrociato;
  const daSforzo = a.sforzo * (a.secondi / 60) / CARICO.sforzo.divisore;
  if (Math.abs(daSforzo - a.carico) / a.carico > c.differenza) avvisi.push({ tipo: "incerti", testo: TESTI_DATI.numeriIncerti });
  if (a.fonteCarico === FONTI.potenza && a.sforzo <= c.sforzoFino && a.carico / (a.secondi / ORA) > c.puntiOra) {
    avvisi.push({ tipo: "soglia", testo: TESTI_DATI.sogliaBassa });
  }
  return avvisi;
}
