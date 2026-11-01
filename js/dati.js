// Lo strato dei dati (6.2 e 6.3 della specifica). È l'unico punto che conosce la forma delle risposte
// di intervals.icu. Riconosce le attività e i giorni, unisce i doppioni, conta le ore e sceglie la
// fonte del carico con js/carico.js. Sopra di lui stima, prontezza, piano, carico e semaforo lavorano
// su attività e giorni già puliti, e non sanno da dove vengono.
// Niente DOM e niente window, così si prova con node (test/dati.test.mjs).
// I numeri stanno in js/parametri.js, nel gruppo DATI.

import { DATI, PASSO, CHIAMATE } from "./parametri.js?v=202610312043";
import { QUALITA, fonteCarico, divisoreSforzo, puntiOra, inBici, inPalestra, mediana } from "./carico.js?v=202610312043";

export { QUALITA, inBici, inPalestra };

// Le attività di Come sto si riconoscono dall'external_id e dalla riga in fondo alla descrizione (6.6).
export const PREFISSO_COMESTO = "comesto-";
export const RIGA_COMESTO = "[come-sto v1]";
export const PREFISSI = Object.freeze({
  stub: "comesto-s-",       // un giro da Strava descritto dalla persona, seguito dall'id dello stub
  palestra: "comesto-p-",   // una seduta di palestra, seguito da data e numero
  giro: "comesto-u-",       // un giro senza dispositivo, seguito da un codice casuale
});

// Le etichette che Come sto aggiunge alle attività su intervals.icu (6.6).
export const ETICHETTE = Object.freeze({
  borseParte: "comesto-borse-parte",
  borseEvento: "comesto-borse-evento",
  borse: "comesto-borse-",
  kg: "comesto-kg-",          // seguito dal peso in kg, per esempio comesto-kg-8
  notteFuori: "comesto-notte-fuori",
  palestra: "comesto-palestra-",   // seguito da gambe, corpo o alto
});

// Le sorgenti che in futuro, o già oggi, mandano solo uno stub senza dettagli (6.1).
const SORGENTI_STUB = new Set(["STRAVA", "GARMIN_CONNECT"]);
const TIPI_EBIKE = new Set(DATI.tipiEbike);
// I tipi dei giri di casa che entrano nel passo personale (1.6).
const TIPI_PASSO = new Set(Object.keys(PASSO.tipi));
// Le scelte di «Cos'era?» per uno stub (6.4), salvate sul telefono.
const TIPI_DETTI = { bici: "Ride", palestra: "WeightTraining", altro: "Other" };
const ALLENATO = new Set(["gambe", "corpo", "alto"]);
const BORSE = new Set(["no", "parte", "evento"]);
const LIVELLO_BORSE = { no: 0, parte: 1, evento: 2 };

const ORA = 3600;
const GIORNO_MS = 86400000;
const GIORNO = /^\d{4}-\d{2}-\d{2}$/;

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pos = (v) => (num(v) !== null && v > 0 ? v : null);
const nonNegativo = (v) => (num(v) !== null && v >= 0 ? v : null);

function utc(iso) {
  const [a, m, g] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}

const piuGiorni = (iso, n) => new Date(utc(iso) + n * GIORNO_MS).toISOString().slice(0, 10);
const giorniFra = (da, a) => Math.round((utc(a) - utc(da)) / GIORNO_MS);

// I minuti di un'ora locale come "2026-10-31T08:30:00", senza fuso, solo per fare differenze.
function minutiDi(locale) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(typeof locale === "string" ? locale : "");
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) / 60000;
}

function oraDi(minuti) {
  return new Date(minuti * 60000).toISOString().slice(0, 19);
}

// --- La qualità di un numero ---

const ORIGINI = { misura: QUALITA.vera, dispositivo: QUALITA.vera, persona: QUALITA.detta, stima: QUALITA.stimata };

// La qualità di un valore (6.2). Un valore assente vale «manca». Un valore con l'origine scritta,
// { valore, da } con da fra «misura», «persona» e «stima», vale «vera», «detta da te» o «stimata».
// Un numero senza origine vale «vera», perché arriva da un dispositivo.
export function qualita(valore) {
  if (valore === null || valore === undefined) return QUALITA.manca;
  if (typeof valore === "number") return Number.isFinite(valore) ? QUALITA.vera : QUALITA.manca;
  if (typeof valore === "object" && !Array.isArray(valore)) {
    const v = valore.valore;
    if (v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v))) return QUALITA.manca;
    return ORIGINI[valore.da] || QUALITA.vera;
  }
  return QUALITA.vera;
}

// --- Le etichette lette ---

function leggiEtichette(tags) {
  const lette = { borse: null, kg: null, notteFuori: null, allenato: null };
  for (const t of tags) {
    if (t === ETICHETTE.borseEvento) lette.borse = "evento";
    else if (t === ETICHETTE.borseParte && lette.borse !== "evento") lette.borse = "parte";
    else if (t === ETICHETTE.notteFuori) lette.notteFuori = true;
    else if (t.startsWith(ETICHETTE.kg)) {
      const kg = Number(t.slice(ETICHETTE.kg.length).replace(",", "."));
      if (Number.isFinite(kg) && kg > 0) lette.kg = kg;
    } else if (t.startsWith(ETICHETTE.palestra) && ALLENATO.has(t.slice(ETICHETTE.palestra.length))) {
      lette.allenato = t.slice(ETICHETTE.palestra.length);
    }
  }
  return lette;
}

// Il tipo di intervals.icu da una risposta, «bici», «palestra» o «altro» di «Cos'era?», oppure già
// un tipo come GravelRide. null senza risposta.
export function tipoDetto(t) {
  if (typeof t !== "string" || !t.trim()) return null;
  return Object.hasOwn(TIPI_DETTI, t) ? TIPI_DETTI[t] : t.trim();
}

// Lo sforzo sulla scala di icu_rpe, da 1 a 10.
function sforzoValido(v) {
  const n = num(v);
  return n !== null && n >= CHIAMATE.sforzoScritto.minimo && n <= CHIAMATE.sforzoScritto.massimo ? n : null;
}

// Perché un giro non entra nel passo personale (6.3 e 1.6), oppure null. Le soglie del passo vero e
// proprio (durata, km, velocità, borse senza risposta) le applica js/stima.js.
function motivoFuoriPasso(a) {
  if (a.esclusaDalPasso) return "esclusa";
  if (a.stub) return "stub";
  if (a.manuale || a.qualita.secondi === QUALITA.detta) return "detta";
  if (a.qualita.secondi !== QUALITA.vera) return "durata";
  if (a.rulli) return "rulli";
  if (a.eBike) return "ebike";
  if (!TIPI_PASSO.has(a.tipo)) return "tipo";
  if (a.commute) return "commute";
  if (a.borse === "parte" || a.borse === "evento") return "borse";
  if (a.metri > 0 && num(a.dislivello) !== null) {
    const km = a.metri / 1000;
    if (a.dislivello / km > PASSO.metriPerKm.massimi) return "dislivello";
    if (a.dislivello === 0 && km > DATI.dislivelloZeroOltreKm) return "dislivello";
  }
  return null;
}

// --- Riconoscere ---

// Un'attività di intervals.icu, con i nomi della pagina (6.2). detto è la voce di comesto.uscite.v1
// per quell'id, con le risposte della persona, e vince sulle etichette lette. Uno stub è
// un'attività con source STRAVA o GARMIN_CONNECT e senza moving_time. Il carico viene da
// fonteCarico con il divisore di base. preparaAttivita lo rifà con il divisore personale, unisce i
// doppioni e stima la durata degli stub. Restituisce null per un'attività senza id o senza inizio.
export function normalizzaAttivita(a, detto = null) {
  if (!a || typeof a !== "object" || a.id === null || a.id === undefined || typeof a.start_date_local !== "string") return null;
  const inizio = a.start_date_local;
  if (minutiDi(inizio) === null) return null;
  const d = detto && typeof detto === "object" ? detto : {};
  const sorgente = typeof a.source === "string" ? a.source : null;
  const mossi = pos(a.moving_time);
  const stub = SORGENTI_STUB.has(sorgente) && mossi === null;
  const externalId = typeof a.external_id === "string" && a.external_id ? a.external_id : null;
  const etichette = Array.isArray(a.tags) ? a.tags.filter((t) => typeof t === "string") : [];
  const descrizione = typeof a.description === "string" ? a.description : null;
  const daComeSto = Boolean(externalId && externalId.startsWith(PREFISSO_COMESTO))
    || Boolean(descrizione && descrizione.includes(RIGA_COMESTO));
  const manuale = sorgente === "MANUAL" || daComeSto;
  const lette = leggiEtichette(etichette);

  const tipoCorretto = tipoDetto(d.tipo);
  const tipoLetto = typeof a.type === "string" && a.type ? a.type : null;
  const tipo = tipoCorretto || tipoLetto;

  // Durata, km e dislivello, dal dispositivo o detti dalla persona.
  let secondi = mossi;
  let qSecondi = mossi ? (manuale ? QUALITA.detta : QUALITA.vera) : QUALITA.manca;
  if (!mossi && pos(d.secondi)) { secondi = pos(d.secondi); qSecondi = QUALITA.detta; }
  let metri = pos(a.distance);
  let qMetri = metri ? (manuale ? QUALITA.detta : QUALITA.vera) : QUALITA.manca;
  if (!metri && pos(d.metri)) { metri = pos(d.metri); qMetri = QUALITA.detta; }
  let dislivello = nonNegativo(a.total_elevation_gain);
  let qDislivello = dislivello !== null ? (manuale ? QUALITA.detta : QUALITA.vera) : QUALITA.manca;
  if (dislivello === null && nonNegativo(d.dislivello) !== null) { dislivello = nonNegativo(d.dislivello); qDislivello = QUALITA.detta; }

  const sforzoLetto = sforzoValido(a.icu_rpe);
  const sforzo = sforzoValido(d.sforzo) ?? sforzoLetto;
  const borse = BORSE.has(d.borse) ? d.borse : lette.borse;
  const fcMedia = pos(a.average_heartrate);
  const elapsed = pos(a.elapsed_time);
  const durataFine = elapsed || secondi;
  const iniz = minutiDi(inizio);

  const att = {
    id: String(a.id),
    inizio,
    giorno: inizio.slice(0, 10),
    tipo,
    sorgente,
    secondi,
    metri,
    dislivello,
    carico: null,
    fonteCarico: null,
    fcMedia,
    potenza: a.device_watts === true,
    rulli: tipo === "VirtualRide" || a.trainer === true,
    commute: a.commute === true,
    eBike: TIPI_EBIKE.has(tipo),
    borse,
    sforzo,
    etichette,
    externalId,
    qualita: {
      tipo: tipoCorretto ? QUALITA.detta : tipoLetto ? QUALITA.vera : QUALITA.manca,
      secondi: qSecondi,
      metri: qMetri,
      dislivello: qDislivello,
      carico: QUALITA.manca,
      sforzo: sforzo === null ? QUALITA.manca : QUALITA.detta,
      borse: borse === null ? QUALITA.manca : QUALITA.detta,
    },
    // Quello che serve agli altri moduli, oltre ai campi della specifica.
    stub,
    manuale,
    daComeSto,
    battito: a.has_heartrate === true || (a.has_heartrate !== false && fcMedia !== null),
    caricoIcu: nonNegativo(a.icu_training_load),
    sforzoLetto,
    kg: pos(d.kg) ?? lette.kg,
    notteFuori: typeof d.notteFuori === "boolean" ? d.notteFuori : lette.notteFuori,
    allenato: ALLENATO.has(d.allenato) ? d.allenato : lette.allenato,
    tipoLetto,
    tipoCorretto,
    secondiTotali: elapsed,
    fine: iniz !== null && durataFine ? oraDi(iniz + durataFine / 60) : null,
    fuoriDalPasso: false,
    motivoFuoriPasso: null,
    esclusaDalPasso: d.fuoriDalPasso === true,
    rimessaNelPasso: d.rimessaNelPasso === true,
    nome: typeof a.name === "string" && a.name.trim() ? a.name.trim() : null,
    // La descrizione si tiene solo per le attività di Come sto, per la riga [come-sto v1].
    descrizione: daComeSto ? descrizione : null,
    caricoNascosto: null,
    stubDelGiorno: null,
    doppioni: [],
  };
  segnaPasso(att);
  conCarico(att, fonteCarico(att));
  return att;
}

function segnaPasso(a) {
  a.motivoFuoriPasso = motivoFuoriPasso(a);
  a.fuoriDalPasso = a.motivoFuoriPasso !== null;
  return a;
}

function conCarico(a, scelta) {
  a.carico = scelta.carico;
  a.fonteCarico = scelta.fonte;
  a.qualita.carico = scelta.qualita;
  return a;
}

// Un giorno di benessere di intervals.icu, con i nomi della pagina. Tiene i nomi di oggi di
// js/modello.js (d, fc, carico...) e aggiunge il battito del sonno (avgSleepingHR), che il semaforo
// preferisce quando c'è (4.3). Le risposte del mattino restano sulla scala 1-4 di intervals.icu.
// Restituisce null senza una data valida.
export function normalizzaGiorno(w) {
  if (!w || typeof w !== "object" || typeof w.id !== "string" || !GIORNO.test(w.id)) return null;
  const hrvVera = pos(w.hrv);
  const hrvSdnn = pos(w.hrvSDNN);
  const hrv = hrvVera ?? hrvSdnn;
  const fcRiposo = pos(w.restingHR);
  const fcSonno = pos(w.avgSleepingHR);
  const sonno = pos(w.sleepSecs);
  return {
    d: w.id,
    giorno: w.id,
    ctl: num(w.ctl),
    atl: num(w.atl),
    carico: num(w.atlLoad ?? w.ctlLoad),
    caricoFatica: num(w.atlLoad),
    caricoFitness: num(w.ctlLoad),
    fc: fcRiposo,
    fcRiposo,
    fcSonno,
    hrv,
    // Apple manda l'HRV come SDNN, in un campo a parte. Per il confronto con il proprio normale va bene.
    hrvSdnn: hrvVera === null && hrvSdnn !== null,
    sonno,
    punteggioSonno: pos(w.sleepScore),
    infortunio: pos(w.injury),
    fatica: pos(w.fatigue),
    dolori: pos(w.soreness),
    notte: Boolean(hrv || fcRiposo || fcSonno || sonno),
  };
}

// --- Unire ---

const MINUTI_DOPPIONE = DATI.doppioneMinuti;

function candidatoDoppione(a) {
  return inBici(a) && !inPalestra(a);
}

// Uno stub senza durata si riconosce solo dall'ora, accanto a un'attività leggibile. Due stub restano
// due, perché di due stub non si sa niente.
function durateVicine(x, y) {
  if (x.stub && y.stub) return false;
  if (!(x.secondi > 0) || !(y.secondi > 0)) return x.stub || y.stub;
  return Math.abs(x.secondi - y.secondi) / Math.max(x.secondi, y.secondi) <= DATI.doppioneDurata;
}

function stessoGiro(x, y) {
  const mx = minutiDi(x.inizio);
  const my = minutiDi(y.inizio);
  return mx !== null && my !== null && Math.abs(mx - my) < MINUTI_DOPPIONE && durateVicine(x, y);
}

function campiPieni(a) {
  return [a.secondi, a.metri, a.dislivello, a.caricoIcu, a.fcMedia, a.sforzo, a.tipoLetto].filter((v) => v !== null && v !== undefined).length;
}

// Si tiene quella con la potenza, poi con il battito, poi con più campi, e mai una vuota al posto di una piena.
function punteggio(a) {
  return (a.stub ? 0 : 1000) + (a.potenza ? 100 : 0) + (a.battito ? 10 : 0) + campiPieni(a);
}

// Le risposte della persona date su una copia passano a quella che resta.
function unisciRisposte(tenuta, tolta) {
  if (tenuta.borse === null && tolta.borse !== null) { tenuta.borse = tolta.borse; tenuta.qualita.borse = QUALITA.detta; }
  if (tenuta.sforzo === null && tolta.sforzo !== null) { tenuta.sforzo = tolta.sforzo; tenuta.qualita.sforzo = QUALITA.detta; }
  if (tenuta.kg === null && tolta.kg !== null) tenuta.kg = tolta.kg;
  if (tenuta.notteFuori === null && tolta.notteFuori !== null) tenuta.notteFuori = tolta.notteFuori;
  if (tenuta.allenato === null && tolta.allenato !== null) tenuta.allenato = tolta.allenato;
  if (tolta.esclusaDalPasso) tenuta.esclusaDalPasso = true;
  tenuta.doppioni.push({ id: tolta.id, sorgente: tolta.sorgente, caricoIcu: tolta.caricoIcu }, ...tolta.doppioni);
  segnaPasso(tenuta);
}

// Una copia in meno. Restituisce la lista senza le copie, nello stesso ordine, e la tenuta porta in
// doppioni gli id e i carichi di intervals.icu di quelle tolte.
//  - Lo stesso giro da due dispositivi, cioè due uscite in bici che partono a meno di 10 minuti e
//    durano entro il 15%, diventa un'attività sola (6.3).
//  - Uno stub che Come sto ha già scritto come attività a mano (comesto-s- e l'id) conta una volta sola.
//  - La stessa seduta di palestra dall'app e dall'orologio, nello stesso giorno ed entro 2 ore, conta
//    una volta sola, e resta quella di Come sto (5.6).
export function doppioni(attivita) {
  const lista = (Array.isArray(attivita) ? attivita : []).filter(Boolean);
  const tolte = new Set();
  const descritti = new Map();
  for (const a of lista) {
    if (a.externalId && a.externalId.startsWith(PREFISSI.stub)) descritti.set(a.externalId.slice(PREFISSI.stub.length), a);
  }
  for (const a of lista) {
    if (a.stub && descritti.has(a.id)) { unisciRisposte(descritti.get(a.id), a); tolte.add(a); }
  }

  const giri = lista.filter((a) => !tolte.has(a) && candidatoDoppione(a)).sort((x, y) => (x.inizio < y.inizio ? -1 : x.inizio > y.inizio ? 1 : 0));
  const gruppi = [];
  for (const a of giri) {
    const gruppo = gruppi.find((g) => g.some((x) => stessoGiro(x, a)));
    if (gruppo) gruppo.push(a);
    else gruppi.push([a]);
  }
  for (const gruppo of gruppi) {
    if (gruppo.length < 2) continue;
    const tenuta = gruppo.reduce((m, a) => (punteggio(a) > punteggio(m) ? a : m), gruppo[0]);
    for (const a of gruppo) if (a !== tenuta) { unisciRisposte(tenuta, a); tolte.add(a); }
  }

  const sedute = lista.filter((a) => !tolte.has(a) && inPalestra(a));
  for (const app of sedute.filter((a) => a.daComeSto)) {
    for (const altra of sedute) {
      if (altra === app || altra.daComeSto || tolte.has(altra) || altra.giorno !== app.giorno) continue;
      if (Math.abs(minutiDi(altra.inizio) - minutiDi(app.inizio)) > DATI.palestraAbbinamentoOre * 60) continue;
      unisciRisposte(app, altra);
      tolte.add(altra);
    }
  }
  return lista.filter((a) => !tolte.has(a));
}

// --- Le ore e il carico nascosto ---

const giornoDi = (giorno) => (typeof giorno === "string" ? giorno : giorno && typeof giorno.d === "string" ? giorno.d : null);

// Le ore in bici di un giorno (2.2), divise per qualità della durata. Bici, rulli e Velomobile per
// intero, l'e-bike a metà salvo un evento in e-bike, palestra, corsa e camminate no. Gli stub
// valgono la durata detta o stimata, e senza durata contano in senzaDurata.
export function contoOre(attivita, giorno, { eBikeEvento = false } = {}) {
  const d = giornoDi(giorno);
  const conto = { ore: 0, vere: 0, dette: 0, stimate: 0, senzaDurata: 0 };
  for (const a of Array.isArray(attivita) ? attivita : []) {
    if (!a || a.giorno !== d || !inBici(a)) continue;
    if (!(a.secondi > 0)) { conto.senzaDurata += 1; continue; }
    const ore = a.secondi / ORA * (a.eBike && !eBikeEvento ? DATI.fattoreEbike : 1);
    conto.ore += ore;
    if (a.qualita.secondi === QUALITA.vera) conto.vere += ore;
    else if (a.qualita.secondi === QUALITA.detta) conto.dette += ore;
    else conto.stimate += ore;
  }
  return conto;
}

// Le ore in bici di un giorno, un numero.
export function oreDelGiorno(attivita, giorno, opzioni = {}) {
  return contoOre(attivita, giorno, opzioni).ore;
}

// Le uscite di un giorno per l'uscita lunga (2.2). Due attività in bici separate da meno di 2 ore
// valgono una, come un giro spezzato da una sosta al bar, e i rulli non contano. Ogni giro unito ha
// inizio, fine, secondi in movimento, le parti e le borse. Le borse del giro sono la risposta più
// bassa fra le parti che l'hanno avuta, perché le parti corte non hanno la domanda (6.3).
export function giriUniti(attivita, giorno, { eBikeEvento = false } = {}) {
  const d = giornoDi(giorno);
  const parti = (Array.isArray(attivita) ? attivita : [])
    .filter((a) => a && a.giorno === d && inBici(a) && !a.rulli && a.secondi > 0)
    .sort((x, y) => (x.inizio < y.inizio ? -1 : x.inizio > y.inizio ? 1 : 0));
  const giri = [];
  for (const a of parti) {
    const inizio = minutiDi(a.inizio);
    const fine = a.fine ? minutiDi(a.fine) : inizio + a.secondi / 60;
    const secondi = a.secondi * (a.eBike && !eBikeEvento ? DATI.fattoreEbike : 1);
    const ultimo = giri[giri.length - 1];
    if (ultimo && inizio - ultimo.fineMinuti < DATI.unioneOre * 60) {
      ultimo.secondi += secondi;
      ultimo.fineMinuti = Math.max(ultimo.fineMinuti, fine);
      ultimo.parti.push(a);
    } else {
      giri.push({ inizioMinuti: inizio, fineMinuti: fine, secondi, parti: [a] });
    }
  }
  return giri.map((g) => {
    const risposte = g.parti.map((p) => p.borse).filter((b) => b !== null);
    const borse = risposte.length ? risposte.reduce((m, b) => (LIVELLO_BORSE[b] < LIVELLO_BORSE[m] ? b : m)) : null;
    const qualitaPeggiore = [QUALITA.manca, QUALITA.stimata, QUALITA.detta].find((q) => g.parti.some((p) => p.qualita.secondi === q)) || QUALITA.vera;
    return {
      giorno: d,
      inizio: oraDi(g.inizioMinuti),
      fine: oraDi(g.fineMinuti),
      secondi: g.secondi,
      ids: g.parti.map((p) => p.id),
      parti: g.parti,
      borse,
      kg: g.parti.map((p) => p.kg).find((k) => k !== null) ?? null,
      notteFuori: g.parti.some((p) => p.notteFuori === true),
      qualita: qualitaPeggiore,
    };
  });
}

// Il carico nascosto del giorno (6.2), cioè il carico del giorno nel benessere (atlLoad) meno i
// carichi di intervals.icu delle attività leggibili di quel giorno, copie tolte comprese, se è
// positivo. È il carico degli stub che intervals.icu ha contato senza mostrarli. null senza il
// carico del giorno.
export function caricoNascosto(giorno, attivita) {
  if (!giorno || typeof giorno !== "object") return null;
  const d = giornoDi(giorno);
  const totale = num(giorno.caricoFatica) ?? num(giorno.carico);
  if (!d || totale === null) return null;
  const visti = new Set();
  let visibili = 0;
  const conta = (id, carico) => {
    if (visti.has(id)) return;
    visti.add(id);
    visibili += num(carico) || 0;
  };
  for (const a of Array.isArray(attivita) ? attivita : []) {
    if (!a || a.giorno !== d) continue;
    if (!a.stub) conta(a.id, a.caricoIcu);
    for (const x of a.doppioni || []) conta(x.id, x.caricoIcu);
  }
  return Math.max(0, totale - visibili);
}

function stubDelGiorno(d, attivita) {
  return (Array.isArray(attivita) ? attivita : []).filter((a) => a && a.stub && a.giorno === d).length;
}

// La durata di uno stub (6.3). Con la durata detta dalla persona vale quella. Altrimenti è il carico
// nascosto del giorno diviso k (2.6), in parti uguali fra gli stub del giorno, con la qualità
// «stimata». Con il carico nascosto a zero, o senza, la durata manca. attivita sono quelle del
// giorno, o tutte, già senza doppioni. Restituisce { secondi, qualita, carico, stubDelGiorno }, dove
// carico è la parte del carico nascosto che tocca a questo stub.
export function durataStub(stub, giorno, k, attivita = []) {
  if (!stub) return { secondi: null, qualita: QUALITA.manca, carico: null, stubDelGiorno: 0 };
  const n = Math.max(1, stubDelGiorno(stub.giorno, attivita));
  const nascosto = caricoNascosto(giorno, attivita);
  const parte = nascosto === null ? null : nascosto / n;
  if (stub.secondi > 0 && stub.qualita && stub.qualita.secondi === QUALITA.detta) {
    return { secondi: stub.secondi, qualita: QUALITA.detta, carico: parte, stubDelGiorno: n };
  }
  if (!(parte > 0) || !(k > 0)) return { secondi: null, qualita: QUALITA.manca, carico: parte, stubDelGiorno: n };
  return { secondi: Math.round(parte / k * ORA), qualita: QUALITA.stimata, carico: parte, stubDelGiorno: n };
}

// --- Tutto insieme ---

// Le attività pulite, dalla lista grezza di intervals.icu ai campi che usano gli altri moduli.
// Riconosce ogni attività con le risposte del telefono (detti = comesto.uscite.v1, per id), toglie
// i doppioni, sceglie la fonte del carico con il divisore personale, stima la durata e il carico
// degli stub con il carico nascosto del giorno. giorni sono i giorni puliti con normalizzaGiorno.
// Restituisce la lista dalla più recente, come oggi in js/modello.js.
export function preparaAttivita(grezze, giorni = [], { detti = {}, profilo = {}, oggi = null } = {}) {
  const risposte = detti && typeof detti === "object" ? detti : {};
  const lette = (Array.isArray(grezze) ? grezze : [])
    .map((a) => normalizzaAttivita(a, a && a.id !== undefined && a.id !== null ? risposte[String(a.id)] : null))
    .filter(Boolean);
  const pulite = doppioni(lette);
  const divisore = divisoreSforzo(pulite);
  for (const a of pulite) if (!a.stub) conCarico(a, fonteCarico(a, profilo, divisore));

  const perData = new Map();
  for (const g of Array.isArray(giorni) ? giorni : []) if (g && typeof g.d === "string") perData.set(g.d, g);
  const ultimo = oggi || [...perData.keys(), ...pulite.map((a) => a.giorno)].sort().pop() || null;
  const k = puntiOra(pulite, ultimo);
  for (const s of pulite.filter((a) => a.stub)) {
    const dur = durataStub(s, perData.get(s.giorno) || null, k, pulite);
    s.secondi = dur.secondi;
    s.qualita.secondi = dur.qualita;
    s.caricoNascosto = dur.carico;
    s.stubDelGiorno = dur.stubDelGiorno;
    const iniz = minutiDi(s.inizio);
    s.fine = s.secondi > 0 && iniz !== null ? oraDi(iniz + s.secondi / 60) : null;
    conCarico(s, fonteCarico(s, profilo, divisore));
  }
  return pulite.sort((x, y) => (x.inizio < y.inizio ? 1 : x.inizio > y.inizio ? -1 : 0));
}

// --- Altri casi di 6.3 e 6.4 ---

// La palestra arrivata dal dispositivo nello stesso giorno ed entro 2 ore dall'ora della seduta, su
// cui l'app scrive sforzo ed etichetta senza creare niente (5.6). quando è l'ora locale della seduta.
export function palestraAbbinata(attivita, quando) {
  const m = minutiDi(quando);
  if (m === null) return null;
  const giorno = quando.slice(0, 10);
  const vicine = (Array.isArray(attivita) ? attivita : [])
    .filter((a) => a && inPalestra(a) && !a.daComeSto && !a.stub && a.giorno === giorno)
    .filter((a) => Math.abs(minutiDi(a.inizio) - m) <= DATI.palestraAbbinamentoOre * 60);
  return vicine.sort((x, y) => Math.abs(minutiDi(x.inizio) - m) - Math.abs(minutiDi(y.inizio) - m))[0] || null;
}

// Più di metà delle attività degli ultimi 60 giorni sono stub (6.4), per il messaggio a chi ha solo Strava.
export function soloStrava(attivita, oggi) {
  const dal = piuGiorni(oggi, -DATI.soloStrava.giorni);
  const recenti = (Array.isArray(attivita) ? attivita : []).filter((a) => a && a.giorno > dal && a.giorno <= oggi);
  return recenti.length > 0 && recenti.filter((a) => a.stub).length > DATI.soloStrava.quota * recenti.length;
}

// La notte non arriva più (6.3), cioè 14 giorni senza HRV, battito e sonno dopo che c'erano.
// giorni arrivano fino a oggi, e l'ultimo è oggi.
export function notteNonArrivaPiu(giorni) {
  const lista = (Array.isArray(giorni) ? giorni : []).filter((g) => g && typeof g.d === "string").sort((x, y) => (x.d < y.d ? -1 : 1));
  if (!lista.length) return false;
  const notti = lista.filter((g) => Boolean(g.hrv || g.fc || g.fcSonno || g.sonno));
  if (!notti.length) return false;
  return giorniFra(notti[notti.length - 1].d, lista[lista.length - 1].d) >= DATI.notteMancaGiorni;
}

// Le settimane di storia, dalla prima attività a oggi, per la storia corta (6 settimane) e
// cortissima (3 settimane) di 6.3.
export function settimaneDiStoria(attivita, oggi) {
  const prima = (Array.isArray(attivita) ? attivita : []).filter((a) => a && a.giorno <= oggi).map((a) => a.giorno).sort()[0];
  return prima ? Math.floor(giorniFra(prima, oggi) / 7) : 0;
}

// Il divisore dello sforzo e k, utili alle carte e alle prove, come li usa preparaAttivita.
export { divisoreSforzo, puntiOra, mediana };
