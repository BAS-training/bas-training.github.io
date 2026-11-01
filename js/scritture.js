// Le scritture verso intervals.icu (6.6 della specifica), fatte in modo da potersi ripetere senza
// danni anche con la chiave incollata. Ogni risposta diventa una «scrittura». Va nella coda
// (comesto.coda.v1) e parte subito se c'è rete, altrimenti all'apertura dopo, nell'ordine in cui è
// nata. L'esito, con l'id che intervals.icu restituisce, si salva in comesto.uscite.v1.
// L'app non cancella mai attività, non scrive mai su uno stub (Strava non si aggiorna) e non cambia
// mai il carico di attività che non ha creato, salvo la seconda scelta facoltativa di 6.3.
// La memoria e il client entrano come argomenti. memoria è { leggi(chiave), scrivi(chiave, valore) }
// di js/memoria.js, client è quello di creaClient in js/api.js. Niente DOM e niente window, così si
// prova con node (test/scritture.test.mjs).

import { CHIAMATE } from "./parametri.js?v=202610312043";
import { ETICHETTE, PREFISSI, PREFISSO_COMESTO, RIGA_COMESTO, inBici, tipoDetto } from "./dati.js?v=202610312043";
import { divisorePer } from "./carico.js?v=202610312043";
import { TESTI_DATI } from "./testi-dati.js?v=202610312043";

export const CHIAVE_CODA = "comesto.coda.v1";
export const CHIAVE_USCITE = "comesto.uscite.v1";

export const STATI = Object.freeze({
  daInviare: "da inviare",
  inviata: "inviata",
  rifiutata: "rifiutata",   // intervals.icu ha risposto 403, la risposta resta sul telefono
  scartata: "scartata",     // una risposta che riprovando non cambia, per esempio l'attività non c'è più
});

const TIPI = new Set(["attivita", "benessere", "crea"]);
const GIORNO = /^\d{4}-\d{2}-\d{2}$/;
const ORA_LOCALE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const ETICHETTA = /^comesto-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EXTERNAL_ID = /^comesto-[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const FAMIGLIE = [ETICHETTE.borse, ETICHETTE.kg, ETICHETTE.palestra];
const DOMANDE_MATTINO = ["fatigue", "soreness", "injury"];

const num = (v) => typeof v === "number" && Number.isFinite(v);
const copia = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

// --- La memoria, sempre dentro un try e catch ---

function leggi(memoria, chiave) {
  try {
    return memoria && typeof memoria.leggi === "function" ? memoria.leggi(chiave) : null;
  } catch {
    return null;
  }
}

function scrivi(memoria, chiave, valore) {
  try {
    if (memoria && typeof memoria.scrivi === "function") memoria.scrivi(chiave, valore);
  } catch {
    // senza memoria la scrittura parte lo stesso, ma non resta in coda
  }
}

function leggiUscite(memoria) {
  const v = leggi(memoria, CHIAVE_USCITE);
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

// --- Le etichette ---

const famiglia = (t) => FAMIGLIE.find((f) => t.startsWith(f)) || null;
const togliQuesta = (t, togli) => togli.some((p) => t === p || (p.endsWith("-") && t.startsWith(p)));

// Le etichette dopo una scrittura. Le nuove si aggiungono a quelle che ci sono. Una nuova di Come sto
// con una famiglia (borse, chili, palestra) prende il posto di quella vecchia della stessa famiglia,
// e togli leva solo etichette di Come sto. Le altre etichette restano sempre.
export function unisciEtichette(attuali, nuove = [], togli = []) {
  const famiglieNuove = new Set(nuove.map(famiglia).filter(Boolean));
  const tieni = (Array.isArray(attuali) ? attuali : []).filter((t) => {
    if (typeof t !== "string") return false;
    if (!t.startsWith(PREFISSO_COMESTO)) return true;
    return !famiglieNuove.has(famiglia(t)) && !togliQuesta(t, togli);
  });
  return [...new Set([...tieni, ...nuove])];
}

const stesseEtichette = (a, b) => a.length === b.length && [...a].sort().join("\n") === [...b].sort().join("\n");

// Le etichette delle borse (6.6). Con «No» o senza risposta nessuna.
export function etichetteBorse({ borse = null, kg = null, notteFuori = false } = {}) {
  if (borse !== "parte" && borse !== "evento") return [];
  const lista = [borse === "evento" ? ETICHETTE.borseEvento : ETICHETTE.borseParte];
  const chili = Math.round(Number(kg));
  if (Number.isFinite(chili) && chili > 0 && chili < 100) lista.push(ETICHETTE.kg + chili);
  if (notteFuori === true) lista.push(ETICHETTE.notteFuori);
  return lista;
}

// L'etichetta di «Cosa hai allenato?» (5.6), oppure null.
export function etichettaPalestra(allenato) {
  return ["gambe", "corpo", "alto"].includes(allenato) ? ETICHETTE.palestra + allenato : null;
}

// --- Le scritture ---

// Una scrittura è { chiave, tipo, id, giorno, campi, etichette, attivita, descrizione }.
// tipo «attivita» è un PUT su un'attività che c'è già, «crea» un'attività a mano nuova, «benessere»
// le risposte del mattino. Due scritture con la stessa chiave diventano un solo invio.
function scrittura(tipo, dati) {
  return {
    chiave: dati.chiave,
    tipo,
    id: dati.id ?? null,
    giorno: dati.giorno ?? null,
    campi: dati.campi ?? null,
    etichette: dati.etichette ?? null,
    attivita: dati.attivita ?? null,
    descrizione: dati.descrizione ?? null,
  };
}

// Si scrive solo su un'attività leggibile di intervals.icu, mai su uno stub, nemmeno se arriva grezza.
function scrivibile(a) {
  if (!a || typeof a !== "object" || typeof a.id !== "string" || !a.id) return false;
  const sorgente = a.sorgente ?? a.source ?? null;
  const senzaDurata = !(a.secondi > 0) && !(a.moving_time > 0);
  return a.stub !== true && sorgente !== "STRAVA" && !(sorgente === "GARMIN_CONNECT" && senzaDurata);
}

const suAttivita = (a, extra) => scrittura("attivita", { chiave: `attivita:${a.id}`, id: a.id, giorno: a.giorno || null, ...extra });

// Lo sforzo di un'uscita leggibile (6.6), un PUT con il solo icu_rpe, da 1 a 10 (lo 0 non si scrive).
// attivita è quella pulita da js/dati.js. null se non c'è niente da scrivere.
export function scriviSforzo(attivita, sforzo) {
  if (!scrivibile(attivita)) return null;
  const { minimo, massimo } = CHIAMATE.sforzoScritto;
  const valore = Math.round(Number(sforzo));
  if (!Number.isFinite(valore) || valore < minimo || valore > massimo) return null;
  if (attivita.sforzoLetto === valore) return null;
  return suAttivita(attivita, { campi: { icu_rpe: valore } });
}

// Etichette di Come sto aggiunte a quelle dell'attività, senza togliere le altre (6.6). togli sono
// etichette o famiglie di Come sto da levare, per esempio quando le borse passano a «No».
export function aggiungiEtichette(attivita, etichette, togli = []) {
  if (!scrivibile(attivita)) return null;
  const nuove = Array.isArray(etichette) ? etichette : [];
  const via = Array.isArray(togli) ? togli : [];
  if (!nuove.every((t) => typeof t === "string" && ETICHETTA.test(t))) return null;
  if (!via.every((t) => typeof t === "string" && t.startsWith(PREFISSO_COMESTO))) return null;
  const attuali = Array.isArray(attivita.etichette) ? attivita.etichette : Array.isArray(attivita.tags) ? attivita.tags : [];
  if (stesseEtichette(unisciEtichette(attuali, nuove, via), attuali)) return null;
  return suAttivita(attivita, { etichette: { lette: [...attuali], aggiungi: [...new Set(nuove)], togli: [...via] } });
}

// Borse, chili e notte fuori di un'uscita leggibile, al posto di quelle scritte prima da Come sto.
export function scriviBorse(attivita, risposta) {
  return aggiungiEtichette(attivita, etichetteBorse(risposta), [ETICHETTE.borse, ETICHETTE.kg, ETICHETTE.notteFuori]);
}

// La seconda scelta facoltativa di 6.3, spenta di default. Il carico dallo sforzo si scrive solo su
// un giro leggibile senza potenza, senza battito e con il carico vuoto o zero, con una riga in più
// nella descrizione. scelte è la voce di comesto.profilo.v1 con caricoSenzaSensori.
export function scriviCaricoStimato(attivita, scelte = {}) {
  if (!scelte || scelte.caricoSenzaSensori !== true) return null;
  if (!scrivibile(attivita) || attivita.daComeSto || !inBici(attivita)) return null;
  if (attivita.potenza || attivita.battito || attivita.caricoIcu > 0) return null;
  if (attivita.fonteCarico !== "sforzo" || !(attivita.carico > 0)) return null;
  return suAttivita(attivita, { campi: { icu_training_load: Math.round(attivita.carico) }, descrizione: TESTI_DATI.caricoStimato });
}

// Le risposte del mattino del giorno, un solo PUT del benessere con la scala 1-4 di intervals.icu.
export function scriviBenessere(giorno, campi) {
  if (typeof giorno !== "string" || !GIORNO.test(giorno) || !campi || typeof campi !== "object") return null;
  const pulite = {};
  for (const k of DOMANDE_MATTINO) {
    const v = campi[k];
    if (Number.isInteger(v) && v >= 1 && v <= 4) pulite[k] = v;
  }
  if (!Object.keys(pulite).length) return null;
  return scrittura("benessere", { chiave: `benessere:${giorno}`, giorno, campi: pulite });
}

// --- Le attività a mano ---

const CAMPI_MANUALE = ["start_date_local", "type", "name", "description", "moving_time", "elapsed_time", "distance", "total_elevation_gain", "icu_rpe", "icu_training_load", "external_id", "tags"];

// Il corpo di un'attività a mano, ripulito e controllato, oppure null. Serve sempre un external_id
// che comincia con comesto-, e in fondo alla descrizione c'è la riga [come-sto v1].
export function corpoManuale(attivita) {
  if (!attivita || typeof attivita !== "object") return null;
  const a = {};
  for (const k of CAMPI_MANUALE) if (attivita[k] !== null && attivita[k] !== undefined) a[k] = copia(attivita[k]);
  if (typeof a.external_id !== "string" || !EXTERNAL_ID.test(a.external_id)) return null;
  if (typeof a.type !== "string" || !a.type) return null;
  if (typeof a.start_date_local !== "string" || !ORA_LOCALE.test(a.start_date_local)) return null;
  if (!num(a.moving_time) || a.moving_time <= 0) return null;
  a.moving_time = Math.round(a.moving_time);
  if (num(a.elapsed_time)) a.elapsed_time = Math.max(a.moving_time, Math.round(a.elapsed_time));
  for (const k of ["distance", "total_elevation_gain"]) if (k in a && (!num(a[k]) || a[k] < 0)) delete a[k];
  if ("icu_rpe" in a) {
    const rpe = Math.round(Number(a.icu_rpe));
    if (rpe >= CHIAMATE.sforzoScritto.minimo && rpe <= CHIAMATE.sforzoScritto.massimo) a.icu_rpe = rpe;
    else delete a.icu_rpe;
  }
  if ("icu_training_load" in a) {
    if (num(a.icu_training_load) && a.icu_training_load >= 0) a.icu_training_load = Math.round(a.icu_training_load);
    else delete a.icu_training_load;
  }
  if ("tags" in a) {
    a.tags = Array.isArray(a.tags) ? [...new Set(a.tags.filter((t) => typeof t === "string" && ETICHETTA.test(t)))] : [];
    if (!a.tags.length) delete a.tags;
  }
  const descrizione = typeof a.description === "string" ? a.description.trim() : "";
  a.description = descrizione.includes(RIGA_COMESTO) ? descrizione : (descrizione ? `${descrizione}\n\n${RIGA_COMESTO}` : RIGA_COMESTO);
  return a;
}

// L'id di un'attività a mano già confermata, salvato in comesto.uscite.v1, con la voce, oppure null.
function confermata(memoria, externalId) {
  const uscite = leggiUscite(memoria);
  for (const [id, voce] of Object.entries(uscite)) {
    if (voce && voce.externalId === externalId) return { id, voce };
  }
  return null;
}

// Un'impronta corta del corpo di un'attività a mano, per sapere se è uguale a quella già creata.
export function impronta(corpo) {
  const testo = JSON.stringify(Object.keys(corpo).sort().map((k) => [k, corpo[k]]));
  let h = 0x811c9dc5;
  for (let i = 0; i < testo.length; i++) {
    h ^= testo.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const externalIdDi = (a) => (a && typeof a.externalId === "string" ? a.externalId : a && typeof a.external_id === "string" ? a.external_id : null);

// Crea un'attività a mano, oppure aggiorna quella che c'è già (6.6). Prima cerca fra le attività
// lette una con lo stesso external_id, poi l'id salvato sul telefono dopo una creazione confermata.
// Se c'è, la scrittura è un PUT sul suo id e non un secondo POST, perché l'aggiornamento per
// external_id del bulk vale solo per le attività create dalla stessa applicazione OAuth.
// lette sono le attività lette, grezze o pulite. Restituisce la scrittura, oppure null quando
// l'attività è già stata creata così com'è.
export function creaOAggiornaManuale(attivita, lette = [], memoria = null) {
  const corpo = corpoManuale(attivita);
  if (!corpo) return null;
  const giorno = corpo.start_date_local.slice(0, 10);
  const trovata = (Array.isArray(lette) ? lette : []).find((a) => externalIdDi(a) === corpo.external_id);
  const salvata = trovata ? null : confermata(memoria, corpo.external_id);
  if (salvata) {
    const creata = salvata.voce.scritture && salvata.voce.scritture.creata;
    if (creata && creata.stato === STATI.inviata && creata.valore === impronta(corpo)) return null;
  }
  const id = trovata && trovata.id !== undefined && trovata.id !== null ? String(trovata.id) : salvata ? salvata.id : null;
  if (id) {
    const { external_id, ...campi } = corpo;
    // Sull'attività che c'è già restano le etichette messe dalla persona, e quelle di Come sto si rifanno.
    const attuali = trovata ? (Array.isArray(trovata.etichette) ? trovata.etichette : Array.isArray(trovata.tags) ? trovata.tags : null) : null;
    if (attuali) {
      const tags = unisciEtichette(attuali, campi.tags || [], [ETICHETTE.borse, ETICHETTE.kg, ETICHETTE.notteFuori, ETICHETTE.palestra]);
      if (stesseEtichette(tags, attuali)) delete campi.tags;
      else campi.tags = tags;
    }
    return scrittura("attivita", { chiave: `attivita:${id}`, id, giorno, campi });
  }
  return scrittura("crea", { chiave: `crea:${corpo.external_id}`, giorno, attivita: corpo });
}

// Un codice casuale per l'external_id di un giro senza dispositivo.
export function codiceCasuale(caso = globalThis.crypto) {
  const byte = new Uint8Array(6);
  if (caso && typeof caso.getRandomValues === "function") caso.getRandomValues(byte);
  else for (let i = 0; i < byte.length; i++) byte[i] = Math.floor(Math.random() * 256);
  return [...byte].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 10);
}

// «Aggiungi un giro» (6.3), un'attività a mano con tipo, durata, km e dislivello se detti, sforzo,
// borse e l'external_id comesto-u- con un codice casuale, da salvare con il giro sul telefono così
// un secondo invio aggiorna e non crea.
export function giroAMano({ tipo = "Ride", inizio, secondi, sforzo = null, metri = null, dislivello = null, borse = null, kg = null, notteFuori = false, nome = null, codice = null } = {}) {
  return {
    start_date_local: inizio,
    type: tipoDetto(tipo) || "Ride",
    name: nome || TESTI_DATI.nomeGiro,
    moving_time: secondi,
    elapsed_time: secondi,
    distance: metri,
    total_elevation_gain: dislivello,
    icu_rpe: sforzo,
    external_id: PREFISSI.giro + (codice || codiceCasuale()),
    tags: etichetteBorse({ borse, kg, notteFuori }),
    description: RIGA_COMESTO,
  };
}

// La prima scelta facoltativa di 6.3, spenta di default. Uno stub da Strava descritto dalla persona
// diventa un'attività a mano con la durata detta, lo sforzo e il carico dallo sforzo, e l'external_id
// comesto-s- con l'id dello stub. Solo con il carico nascosto del giorno a zero, perché sopra zero
// intervals.icu ha già contato quei punti. nascosto è caricoNascosto del giorno, scelte la voce del
// profilo con stravaSuIntervals, divisore quello di divisoreSforzo. Restituisce il corpo, oppure null.
export function manualeDaStub(stub, risposta = {}, { nascosto = null, scelte = {}, divisore = null } = {}) {
  if (!scelte || scelte.stravaSuIntervals !== true) return null;
  if (!stub || stub.stub !== true || stub.sorgente !== "STRAVA" || nascosto !== 0) return null;
  const secondi = Math.round(Number(risposta.secondi));
  if (!(secondi > 0)) return null;
  const rpe = Math.round(Number(risposta.sforzo));
  const sforzo = rpe >= CHIAMATE.sforzoScritto.minimo && rpe <= CHIAMATE.sforzoScritto.massimo ? rpe : null;
  return {
    start_date_local: stub.inizio,
    type: tipoDetto(risposta.tipo) || stub.tipo || "Ride",
    name: TESTI_DATI.nomeStrava,
    moving_time: secondi,
    elapsed_time: secondi,
    distance: risposta.metri ?? null,
    total_elevation_gain: risposta.dislivello ?? null,
    icu_rpe: sforzo,
    icu_training_load: sforzo ? Math.round(sforzo * secondi / 60 / divisorePer(divisore, secondi)) : null,
    external_id: PREFISSI.stub + stub.id,
    tags: etichetteBorse(risposta),
    description: RIGA_COMESTO,
  };
}

// --- La coda ---

function valida(s) {
  return Boolean(s && typeof s === "object" && TIPI.has(s.tipo) && typeof s.chiave === "string" && s.chiave);
}

export function leggiCoda(memoria) {
  const v = leggi(memoria, CHIAVE_CODA);
  return Array.isArray(v) ? v.filter(valida) : [];
}

// Due scritture sulla stessa chiave diventano una, al posto della prima, così sforzo e borse della
// stessa attività partono con un solo PUT.
function unisci(prima, dopo) {
  const s = { ...prima };
  if (dopo.tipo !== prima.tipo) return { ...dopo, nata: prima.nata, stato: prima.stato };
  if (dopo.campi) s.campi = { ...(prima.campi || {}), ...dopo.campi };
  if (dopo.attivita) s.attivita = dopo.attivita;
  if (dopo.descrizione) s.descrizione = dopo.descrizione;
  if (dopo.etichette) {
    // togli vale solo sulle etichette lette, quindi le aggiunte della seconda restano sempre.
    const a = prima.etichette || { lette: dopo.etichette.lette, aggiungi: [], togli: [] };
    s.etichette = {
      lette: a.lette,
      aggiungi: unisciEtichette(a.aggiungi, dopo.etichette.aggiungi, dopo.etichette.togli),
      togli: [...new Set([...a.togli, ...dopo.etichette.togli])],
    };
  }
  return s;
}

// Toglie da una scrittura quello che intervals.icu ha già confermato, secondo comesto.uscite.v1.
// Un'attività a mano già creata non si crea una seconda volta.
function senzaConfermato(s, uscite) {
  if (s.tipo === "crea") {
    const fatta = Object.values(uscite).some((v) => v && v.externalId === s.attivita.external_id && v.scritture && v.scritture.creata && v.scritture.creata.stato === STATI.inviata);
    return fatta ? null : s;
  }
  if (s.tipo !== "attivita") return s;
  const fatte = (uscite[s.id] && uscite[s.id].scritture) || {};
  const confermato = (campo, valore) => fatte[campo] && fatte[campo].stato === STATI.inviata && JSON.stringify(fatte[campo].valore) === JSON.stringify(valore);
  const nuova = { ...s, campi: s.campi ? { ...s.campi } : null };
  if (nuova.campi) {
    for (const [campo, valore] of Object.entries(nuova.campi)) if (confermato(campo, valore)) delete nuova.campi[campo];
    if (!Object.keys(nuova.campi).length) nuova.campi = null;
  }
  if (nuova.etichette && fatte.tags && fatte.tags.stato === STATI.inviata) {
    const dopo = unisciEtichette(fatte.tags.valore, nuova.etichette.aggiungi, nuova.etichette.togli);
    if (stesseEtichette(dopo, fatte.tags.valore)) nuova.etichette = null;
  }
  return nuova.campi || nuova.etichette || nuova.descrizione ? nuova : null;
}

// Mette una scrittura in coda (comesto.coda.v1) e restituisce la coda. Una scrittura già confermata
// non rientra, e una con la stessa chiave di una ancora da inviare si unisce a quella e ne tiene il
// posto. Senza memoria restituisce lo stesso la coda, che allora vive solo in questa apertura.
export function inCoda(scrittura, memoria, adesso = Date.now()) {
  const coda = leggiCoda(memoria);
  if (!valida(scrittura)) return coda;
  const nuova = senzaConfermato(copia(scrittura), leggiUscite(memoria));
  if (!nuova) return coda;
  const i = coda.findIndex((s) => s.chiave === nuova.chiave);
  if (i >= 0) coda[i] = unisci(coda[i], nuova);
  else coda.push({ ...nuova, nata: new Date(adesso).toISOString(), stato: STATI.daInviare });
  scrivi(memoria, CHIAVE_CODA, coda);
  return coda;
}

// --- L'invio ---

// Quello che resta sul telefono di un campo scritto. La descrizione e le etichette della persona sono
// testo libero e non si salvano. Della descrizione si segna solo che è stata scritta, delle
// etichette si tengono quelle di Come sto.
function valoreDaSalvare(campo, valore) {
  if (campo === "description") return true;
  if (campo === "tags") return (Array.isArray(valore) ? valore : []).filter((t) => typeof t === "string" && t.startsWith(PREFISSO_COMESTO));
  return valore;
}

// L'esito di una scrittura in comesto.uscite.v1, per id di intervals.icu.
function registra(memoria, s, esito, stato, adesso) {
  const quando = new Date(adesso).toISOString();
  const uscite = leggiUscite(memoria);
  if (s.tipo === "attivita") {
    const voce = uscite[s.id] && typeof uscite[s.id] === "object" ? uscite[s.id] : { giorno: s.giorno };
    voce.scritture = voce.scritture && typeof voce.scritture === "object" ? voce.scritture : {};
    for (const [campo, valore] of Object.entries(esito.campi || {})) {
      voce.scritture[campo] = { valore: valoreDaSalvare(campo, valore), stato, quando };
    }
    uscite[s.id] = voce;
  } else if (s.tipo === "crea" && esito.id) {
    const voce = uscite[esito.id] && typeof uscite[esito.id] === "object" ? uscite[esito.id] : {};
    const creata = { valore: impronta(s.attivita), stato, quando };
    uscite[esito.id] = { ...voce, giorno: voce.giorno || s.giorno, externalId: s.attivita.external_id, scritture: { ...(voce.scritture || {}), creata } };
  } else {
    return;
  }
  scrivi(memoria, CHIAVE_USCITE, uscite);
}

// I campi del PUT, con le etichette rifatte sulla lettura più fresca, e la riga della descrizione
// aggiunta a quella che c'è.
async function campiDaInviare(client, s, perId, conto) {
  const campi = { ...(s.campi || {}) };
  if (s.etichette) {
    const fresca = perId.get(s.id);
    const base = fresca && Array.isArray(fresca.etichette) ? fresca.etichette
      : fresca && Array.isArray(fresca.tags) ? fresca.tags
        : s.etichette.lette;
    const dopo = unisciEtichette(base, s.etichette.aggiungi, s.etichette.togli);
    if (!stesseEtichette(dopo, base)) campi.tags = dopo;
  }
  if (s.descrizione) {
    conto.chiamate += 1;
    const letta = await client.leggiAttivita(s.id);
    const prima = letta && typeof letta.description === "string" ? letta.description.trim() : "";
    if (!prima.includes(s.descrizione)) campi.description = prima ? `${prima}\n\n${s.descrizione}` : s.descrizione;
  }
  return campi;
}

async function invia(client, s, perId, conto) {
  if (s.tipo === "benessere") {
    conto.chiamate += 1;
    await client.salvaBenessere(s.giorno, s.campi);
    return { giorno: s.giorno, campi: s.campi };
  }
  if (s.tipo === "crea") {
    conto.chiamate += 1;
    const risposta = await client.creaManuali([s.attivita]);
    const lista = Array.isArray(risposta) ? risposta : risposta ? [risposta] : [];
    const creata = lista.find((a) => a && a.external_id === s.attivita.external_id) || lista[0] || null;
    return { id: creata && creata.id !== undefined && creata.id !== null ? String(creata.id) : null, campi: null };
  }
  const campi = await campiDaInviare(client, s, perId, conto);
  if (!Object.keys(campi).length) return { id: s.id, campi };
  conto.chiamate += 1;
  await client.salvaAttivita(s.id, campi);
  return { id: s.id, campi };
}

// Manda le scritture della coda, nell'ordine in cui sono nate, e non lancia mai errori.
//  - Confermata, esce dalla coda e l'esito va in comesto.uscite.v1, con l'id di un'attività creata.
//  - Un 403 la toglie dalla coda come «rifiutata», e la risposta resta sul telefono, senza errori.
//  - Una risposta che riprovando non cambia (400, 404 e simili) la toglie come «scartata».
//  - Senza rete, con intervals.icu lento, con un 429, un 401 o un errore del server si ferma, e il
//    resto riparte all'apertura dopo, nello stesso ordine.
// lette sono le attività della lettura appena fatta, per rifare le etichette su quelle di adesso.
// coda è quella restituita da inCoda, per quando la memoria del telefono non c'è.
// Restituisce { inviate, rifiutate, scartate, rimaste, ferma, chiamate }.
export async function inviaCoda(client, memoria, { lette = [], adesso = Date.now(), coda: data = null } = {}) {
  const coda = Array.isArray(data) ? data.filter(valida) : leggiCoda(memoria);
  const esito = { inviate: [], rifiutate: [], scartate: [], rimaste: 0, ferma: null, chiamate: 0 };
  const perId = new Map();
  for (const a of Array.isArray(lette) ? lette : []) if (a && a.id !== undefined && a.id !== null) perId.set(String(a.id), a);
  while (coda.length) {
    // Quello che è già confermato, rimasto in coda perché la memoria non si è salvata, non riparte.
    const s = senzaConfermato(coda[0], leggiUscite(memoria));
    if (!s) {
      coda.shift();
      scrivi(memoria, CHIAVE_CODA, coda);
      continue;
    }
    try {
      const risultato = await invia(client, s, perId, esito);
      registra(memoria, s, risultato, STATI.inviata, adesso);
      esito.inviate.push({ chiave: s.chiave, tipo: s.tipo, id: risultato.id ?? null });
    } catch (e) {
      const tipo = e && typeof e.tipo === "string" ? e.tipo : null;
      if (tipo === "permesso") {
        registra(memoria, s, { campi: { ...(s.campi || {}), ...(s.etichette ? { tags: s.etichette.aggiungi } : {}) } }, STATI.rifiutata, adesso);
        esito.rifiutate.push(s.chiave);
      } else if (tipo === "server" && CHIAMATE.scartaCodici.includes(e.stato)) {
        registra(memoria, s, { campi: s.campi || {} }, STATI.scartata, adesso);
        esito.scartate.push(s.chiave);
      } else {
        esito.ferma = tipo || "errore";
        break;
      }
    }
    coda.shift();
    scrivi(memoria, CHIAVE_CODA, coda);
  }
  esito.rimaste = coda.length;
  return esito;
}
