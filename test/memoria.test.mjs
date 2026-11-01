// Prove della memoria sul telefono. Si lanciano con  node --test test/memoria.test.mjs
// La memoria del browser è finta, e persone, date e numeri sono inventati.
import { test } from "node:test";
import assert from "node:assert/strict";

import { creaMemoria, nomeCopia, CHIAVI, GUASTO, PREFISSO } from "../js/memoria.js";
import { MEMORIA } from "../js/parametri.js";
import { CHIAVE, ACCESSO, leggiCredenziale } from "../js/credenziali.js";

const GIORNO = 86400000;
const OGGI = "2027-03-15";
const ADESSO = Date.UTC(2027, 2, 15, 7, 30);   // le 8.30 a Roma
// Chiave e accesso inventati, lunghi come quelli veri, per vedere che non finiscano mai nella copia.
const CHIAVE_LUCIA = "chiave-inventata-di-lucia-0123456789abcdef";
const ACCESSO_LUCIA = "accesso-inventato-di-lucia-fedcba9876543210";
const MAPPE = [CHIAVI.uscite, CHIAVI.palestra, CHIAVI.mattino, CHIAVI.esiti, CHIAVI.domenica];
const NELLA_COPIA = [CHIAVI.preferenze, CHIAVI.profilo, CHIAVI.obiettivo, CHIAVI.disponibilita, CHIAVI.piano, ...MAPPE, CHIAVI.invito];

function giorniPrima(iso, n) {
  const [a, m, g] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, g) - n * GIORNO).toISOString().slice(0, 10);
}

// Una memoria come localStorage, con un limite di spazio in caratteri e la possibilità di non
// funzionare affatto. dati serve alle prove per guardarci dentro.
function memoriaFinta(iniziale = {}, { quota = Infinity, rotta = false } = {}) {
  const dati = new Map(Object.entries(iniziale).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  const occupato = () => [...dati].reduce((s, [k, v]) => s + k.length + v.length, 0);
  const controlla = () => {
    if (rotta) throw new DOMException("La memoria non è disponibile", "SecurityError");
  };
  return {
    dati,
    get length() { controlla(); return dati.size; },
    key(i) { controlla(); return [...dati.keys()][i] ?? null; },
    getItem(k) { controlla(); return dati.has(k) ? dati.get(k) : null; },
    setItem(k, v) {
      controlla();
      const testo = String(v);
      const prima = dati.has(k) ? k.length + dati.get(k).length : 0;
      if (occupato() - prima + k.length + testo.length > quota) throw new DOMException("La memoria è piena", "QuotaExceededError");
      dati.set(k, testo);
    },
    removeItem(k) { controlla(); dati.delete(k); },
  };
}

const grezzo = (locale, chiave) => JSON.parse(locale.getItem(chiave));
const vuotoAtteso = (chiave) => (MAPPE.includes(chiave) ? {} : chiave === CHIAVI.coda ? [] : null);

// Il telefono di Lucia, con tutte le chiavi della tabella, la chiave API salvata con «Ricordami» e
// un accesso rimasto nella scheda. Ogni scrittura avviene un giorno dopo l'altra.
function telefonoDiLucia() {
  const locale = memoriaFinta({ [CHIAVE]: CHIAVE_LUCIA });
  const sessione = memoriaFinta({ [ACCESSO]: ACCESSO_LUCIA });
  const orologio = { t: ADESSO - 30 * GIORNO };
  const memoria = creaMemoria(locale, { sessione, adesso: () => orologio.t });
  const valori = {
    [CHIAVI.preferenze]: { intervallo: 90, pagina: "oggi" },
    [CHIAVI.profilo]: { eta: "40-49", peso: "60-70", bici: "gravel", borse: "bikepacking", notte: "orologio", palestra: "conosco" },
    [CHIAVI.obiettivo]: { tipo: "evento", percorso: "tt-originale", giorni: 4, partenza: "2027-05-20" },
    [CHIAVI.disponibilita]: { giorni: [1, 3, 5, 6], stella: 5, ore: 6 },
    [CHIAVI.piano]: { versione: 1, creato: "2027-02-13", firma: "f00d", settimane: [{ lunedi: "2027-03-15", indice: -10, tipo: "carico", ore: 6.1 }] },
    [CHIAVI.uscite]: { i301: { d: "2027-03-13", sforzo: 5, borse: "parte", kg: 8 }, i302: { d: "2027-03-14", sforzo: 3 } },
    [CHIAVI.palestra]: { "2027-03-11-1": { data: "2027-03-11", scheda: 2, minuti: 50, sforzo: 6, allenato: "gambe" } },
    [CHIAVI.mattino]: { "2027-03-15": { stoMale: false } },
    [CHIAVI.esiti]: { "2027-03-14": { livello: "verde", punti: 0 }, "2027-03-15": { livello: "giallo", punti: 2 } },
    [CHIAVI.domenica]: { "2027-03-14": { segnali: 1, proposta: "continua" } },
    [CHIAVI.invito]: { percorso: "tt-originale", giorni: 4, partenza: "2027-05-20" },
    [CHIAVI.cache]: { letto: "2027-03-15", benessere: [{ id: "2027-03-15", hrv: 48 }] },
    [CHIAVI.coda]: [{ tipo: "sforzo", id: "i302", sforzo: 3 }],
    [CHIAVI.consenso]: { versione: 2, data: "2027-02-13" },
  };
  for (const [chiave, valore] of Object.entries(valori)) {
    assert.equal(memoria.scrivi(chiave, valore), true, chiave);
    orologio.t += GIORNO;
  }
  return { locale, sessione, memoria, orologio, valori };
}

test("le chiavi sono quelle della tabella di 6.6, con il prefisso e la versione nel nome", () => {
  // In più c'è l'impronta dell'atleta dei dati, per chi entra con un altro account (R21).
  assert.deepEqual(Object.values(CHIAVI).sort(), [
    "comesto.atleta.v1", "comesto.cache.v1", "comesto.coda.v1", "comesto.consenso", "comesto.disponibilita.v1",
    "comesto.domenica.v1", "comesto.esiti.v1", "comesto.invito.v1", "comesto.mattino.v1", "comesto.obiettivo.v1",
    "comesto.palestra.v1", "comesto.piano.v1", "comesto.preferenze", "comesto.profilo.v1", "comesto.uscite.v1",
  ]);
  assert.ok(Object.isFrozen(CHIAVI));
  assert.ok(Object.values(CHIAVI).every((k) => k.startsWith(PREFISSO)));
  // chiave e accesso di intervals.icu restano fuori, in js/credenziali.js
  assert.ok(!Object.values(CHIAVI).includes(CHIAVE) && !Object.values(CHIAVI).includes(ACCESSO));
  assert.equal(GUASTO, ".guasto");
});

test("si legge quello che si è scritto, e senza niente le mappe e la coda sono vuote", () => {
  const locale = memoriaFinta();
  const memoria = creaMemoria(locale, { adesso: () => ADESSO });
  for (const chiave of Object.values(CHIAVI)) assert.deepEqual(memoria.leggi(chiave), vuotoAtteso(chiave), chiave);

  const profilo = { eta: "40-49", bici: "gravel", palestra: "no" };
  assert.equal(memoria.scrivi(CHIAVI.profilo, profilo), true);
  assert.deepEqual(memoria.leggi(CHIAVI.profilo), profilo);
  const esiti = { "2027-03-14": { livello: "giallo", punti: 2 } };
  assert.equal(memoria.scrivi(CHIAVI.esiti, esiti), true);
  assert.deepEqual(memoria.leggi(CHIAVI.esiti), esiti);
  // quello che si legge è una copia, e cambiarlo non cambia la memoria
  memoria.leggi(CHIAVI.esiti)["2027-03-14"].livello = "rosso";
  assert.equal(memoria.leggi(CHIAVI.esiti)["2027-03-14"].livello, "giallo");

  // niente chiavi fuori dalla tabella e niente forme sbagliate
  assert.equal(memoria.scrivi("comesto.diario.v1", { nota: "prova" }), false);
  assert.equal(memoria.scrivi(CHIAVE, "una-chiave-qualsiasi-123"), false);
  assert.equal(memoria.scrivi(CHIAVI.esiti, [1, 2]), false);
  assert.equal(memoria.scrivi(CHIAVI.uscite, { i101: 3 }), false);
  assert.equal(memoria.scrivi(CHIAVI.coda, { tipo: "sforzo" }), false);
  assert.equal(memoria.scrivi(CHIAVI.profilo, "40-49"), false);
  const giro = {};
  giro.stesso = giro;
  assert.equal(memoria.scrivi(CHIAVI.profilo, giro), false);
  assert.equal(memoria.leggi("comesto.diario.v1"), null);
  assert.deepEqual([...locale.dati.keys()].sort(), [CHIAVI.esiti, CHIAVI.profilo]);
  assert.deepEqual(memoria.leggi(CHIAVI.profilo), profilo);

  // scrivere null toglie la chiave
  assert.equal(memoria.scrivi(CHIAVI.profilo, null), true);
  assert.equal(locale.getItem(CHIAVI.profilo), null);
});

test("ogni voce tiene l'istante del suo ultimo cambiamento, e leggi non lo mostra", () => {
  const locale = memoriaFinta();
  const orologio = { t: ADESSO };
  const memoria = creaMemoria(locale, { adesso: () => orologio.t });
  const ora = 3600000;
  memoria.scrivi(CHIAVI.mattino, { "2027-03-14": { stoMale: false } });
  orologio.t += ora;
  memoria.scrivi(CHIAVI.mattino, { ...memoria.leggi(CHIAVI.mattino), "2027-03-15": { stoMale: true, cause: ["febbre"] } });
  assert.equal(grezzo(locale, CHIAVI.mattino)["2027-03-14"].agg, ADESSO);         // non è cambiata, tiene il suo
  assert.equal(grezzo(locale, CHIAVI.mattino)["2027-03-15"].agg, ADESSO + ora);
  orologio.t += ora;
  memoria.scrivi(CHIAVI.mattino, { "2027-03-14": { stoMale: true }, "2027-03-15": { cause: ["febbre"], stoMale: true } });
  assert.equal(grezzo(locale, CHIAVI.mattino)["2027-03-14"].agg, ADESSO + 2 * ora);  // cambiata
  assert.equal(grezzo(locale, CHIAVI.mattino)["2027-03-15"].agg, ADESSO + ora);      // uguale, con i campi in un altro ordine
  assert.deepEqual(memoria.leggi(CHIAVI.mattino), { "2027-03-14": { stoMale: true }, "2027-03-15": { stoMale: true, cause: ["febbre"] } });

  // un agg messo da chi scrive non conta
  memoria.scrivi(CHIAVI.esiti, { "2027-03-15": { livello: "verde", agg: 1 } });
  assert.equal(grezzo(locale, CHIAVI.esiti)["2027-03-15"].agg, ADESSO + 2 * ora);
  // gli oggetti interi hanno il loro, coda, cache e consenso no
  memoria.scrivi(CHIAVI.profilo, { eta: "50-54" });
  assert.equal(grezzo(locale, CHIAVI.profilo).agg, ADESSO + 2 * ora);
  assert.deepEqual(memoria.leggi(CHIAVI.profilo), { eta: "50-54" });
  const coda = [{ tipo: "sforzo", id: "i101", sforzo: 5 }];
  memoria.scrivi(CHIAVI.coda, coda);
  memoria.scrivi(CHIAVI.consenso, { versione: 2, data: OGGI });
  assert.deepEqual(grezzo(locale, CHIAVI.coda), coda);
  assert.deepEqual(grezzo(locale, CHIAVI.consenso), { versione: 2, data: OGGI });
});

test("senza memoria, come in navigazione privata, niente si rompe e l'app parte come al primo avvio", () => {
  const casi = {
    assente: null,
    rotta: memoriaFinta({}, { rotta: true }),
    senzaSpazio: memoriaFinta({}, { quota: 0 }),
  };
  const copiaDiMarco = { formato: 1, app: "come-sto", giorno: OGGI, chiavi: { [CHIAVI.profilo]: { eta: "40-49", agg: ADESSO } } };
  for (const [nome, locale] of Object.entries(casi)) {
    const memoria = creaMemoria(locale, { sessione: locale, adesso: () => ADESSO });
    // l'avvio dell'app
    assert.deepEqual(memoria.migra(), { guaste: [], obiettivo: false }, nome);
    assert.deepEqual(memoria.pulisci(OGGI), { voci: 0, chiavi: [] }, nome);
    // gli stessi ingressi di un primo avvio, così il semaforo si calcola con i soli dati di intervals.icu
    for (const chiave of Object.values(CHIAVI)) assert.deepEqual(memoria.leggi(chiave), vuotoAtteso(chiave), `${nome} ${chiave}`);
    assert.equal(memoria.scrivi(CHIAVI.profilo, { eta: "40-49" }), false, nome);
    assert.equal(memoria.leggi(CHIAVI.profilo), null, nome);
    assert.doesNotThrow(() => memoria.togli(CHIAVI.profilo), nome);
    assert.deepEqual(memoria.copia(OGGI).chiavi, {}, nome);
    assert.equal(memoria.riprendi(copiaDiMarco, { anteprima: true }).ok, true, nome);
    const ripresa = memoria.riprendi(JSON.stringify(copiaDiMarco));
    assert.deepEqual([ripresa.ok, ripresa.motivo, ripresa.nonScritte], [false, "memoria", [CHIAVI.profilo]], nome);
    assert.deepEqual(memoria.esciCancellaTutto(), [], nome);
  }
});

test("una chiave rotta finisce in .guasto e si riparte vuoti, senza bloccare niente", () => {
  const rotti = {
    [CHIAVI.profilo]: "{\"eta\":\"40-49\"",                             // il testo si interrompe a metà
    [CHIAVI.esiti]: "[1,2,3]",                                           // una lista al posto della mappa
    [CHIAVI.uscite]: JSON.stringify({ i101: { sforzo: 5 }, i102: 7 }),   // una voce che non è un oggetto
    [CHIAVI.coda]: JSON.stringify({ tipo: "sforzo" }),                   // un oggetto al posto della lista
    [CHIAVI.obiettivo]: "null",
    [CHIAVI.consenso]: "",
  };
  const locale = memoriaFinta(rotti);
  const memoria = creaMemoria(locale, { adesso: () => ADESSO });
  // chi legge trova la memoria vuota, e il guasto resta da parte com'era
  assert.equal(memoria.leggi(CHIAVI.profilo), null);
  assert.deepEqual(memoria.leggi(CHIAVI.esiti), {});
  assert.equal(locale.getItem(CHIAVI.profilo), null);
  assert.equal(locale.getItem(CHIAVI.profilo + GUASTO), rotti[CHIAVI.profilo]);
  // migra all'avvio trova anche quelle che nessuno ha ancora letto
  assert.deepEqual(memoria.migra().guaste.sort(), [CHIAVI.coda, CHIAVI.consenso, CHIAVI.obiettivo, CHIAVI.uscite]);
  for (const [chiave, contenuto] of Object.entries(rotti)) {
    assert.equal(locale.getItem(chiave), null, chiave);
    assert.equal(locale.getItem(chiave + GUASTO), contenuto, chiave);
  }
  assert.deepEqual(memoria.leggi(CHIAVI.coda), []);
  // poi si scrive di nuovo, e il guasto resta dov'è
  assert.equal(memoria.scrivi(CHIAVI.profilo, { eta: "50-54" }), true);
  assert.deepEqual(memoria.leggi(CHIAVI.profilo), { eta: "50-54" });
  assert.equal(locale.getItem(CHIAVI.profilo + GUASTO), rotti[CHIAVI.profilo]);
  assert.deepEqual(memoria.migra().guaste, []);
});

test("una chiave con una versione sconosciuta finisce in .guasto, le altre chiavi restano", () => {
  const locale = memoriaFinta({
    "comesto.profilo.v2": { eta: "40-49" },
    "comesto.esiti.v0": {},
    "comesto.obiettivo": { tipo: "semaforo" },      // senza versione
    "comesto.consenso.v3": { versione: 3 },
    [CHIAVI.piano]: { versione: 1, settimane: [] },
    [CHIAVE]: CHIAVE_LUCIA,
    "comesto.oauth.giro": "1",
    "comesto.diario.v1": { nota: "un nome che questa versione non conosce" },
    "altrosito.tema": "scuro",
  });
  const memoria = creaMemoria(locale, { adesso: () => ADESSO });
  const { guaste } = memoria.migra();
  assert.deepEqual(guaste.sort(), ["comesto.consenso.v3", "comesto.esiti.v0", "comesto.obiettivo", "comesto.profilo.v2"]);
  for (const k of guaste) {
    assert.equal(locale.getItem(k), null, k);
    assert.notEqual(locale.getItem(k + GUASTO), null, k);
  }
  assert.equal(memoria.leggi(CHIAVI.profilo), null);   // si riparte vuoti
  assert.equal(memoria.leggi(CHIAVI.obiettivo), null);
  assert.deepEqual(memoria.leggi(CHIAVI.piano), { versione: 1, settimane: [] });
  assert.equal(locale.getItem(CHIAVE), CHIAVE_LUCIA);
  assert.equal(locale.getItem("comesto.oauth.giro"), "1");
  assert.notEqual(locale.getItem("comesto.diario.v1"), null);
  assert.equal(locale.getItem("altrosito.tema"), "scuro");
  assert.deepEqual(memoria.migra().guaste, []);
});

test("le voci oltre i 400 giorni si tolgono, le altre restano con il loro istante", () => {
  const fuori = giorniPrima(OGGI, MEMORIA.giorni + 1);
  const dentro = giorniPrima(OGGI, MEMORIA.giorni);
  assert.deepEqual([fuori, dentro], ["2026-02-07", "2026-02-08"]);
  const vecchio = Date.UTC(2026, 0, 10);
  const locale = memoriaFinta({
    [CHIAVI.esiti]: { [fuori]: { livello: "verde", agg: vecchio }, [dentro]: { livello: "giallo", agg: vecchio }, "2027-03-14": { livello: "verde", agg: ADESSO } },
    [CHIAVI.mattino]: { [fuori]: { stoMale: true, agg: vecchio } },
    [CHIAVI.domenica]: { "2026-01-04": { segnali: 2 }, "2027-03-14": { segnali: 0 } },
    [CHIAVI.palestra]: { "2026-01-20-1": { scheda: 1 }, "2027-03-10-1": { scheda: 3, data: "2027-03-10" } },
    [CHIAVI.uscite]: {
      i201: { d: fuori, sforzo: 5 },                  // la data dell'uscita
      i202: { giorno: "2027-03-12", borse: "evento" },
      i203: { sforzo: 3, agg: vecchio },              // senza data vale il giorno dell'ultimo cambiamento
      i204: { sforzo: 4 },                            // senza nessuna data resta
    },
    [CHIAVI.profilo]: { eta: "40-49" },
  });
  const memoria = creaMemoria(locale, { adesso: () => ADESSO });
  assert.deepEqual(memoria.pulisci(OGGI), { voci: 6, chiavi: [] });
  assert.deepEqual(Object.keys(memoria.leggi(CHIAVI.esiti)).sort(), [dentro, "2027-03-14"]);
  assert.equal(grezzo(locale, CHIAVI.esiti)[dentro].agg, vecchio);   // pulire non cambia l'istante
  assert.deepEqual(memoria.leggi(CHIAVI.mattino), {});
  assert.deepEqual(Object.keys(memoria.leggi(CHIAVI.domenica)), ["2027-03-14"]);
  assert.deepEqual(Object.keys(memoria.leggi(CHIAVI.palestra)), ["2027-03-10-1"]);
  assert.deepEqual(Object.keys(memoria.leggi(CHIAVI.uscite)).sort(), ["i202", "i204"]);
  assert.deepEqual(memoria.leggi(CHIAVI.profilo), { eta: "40-49" });
  assert.deepEqual(memoria.pulisci(OGGI), { voci: 0, chiavi: [] });
  // una data che non è una data non toglie niente
  assert.deepEqual(memoria.pulisci("15/03/2027"), { voci: 0, chiavi: [] });
  assert.deepEqual(memoria.pulisci(undefined), { voci: 0, chiavi: [] });
});

test("obiettivo e piano restano fino a 3 mesi dopo l'ultimo giorno dell'evento", () => {
  // il viaggio di Marco parte il 20 novembre e dura 4 giorni, l'ultimo è il 23
  const obiettivo = { tipo: "evento", percorso: "tt-originale", giorni: 4, partenza: "2026-11-20" };
  const piano = { versione: 1, creato: "2026-08-01", obiettivo: { percorso: "tt-originale", giorni: 4, data: "2026-11-20" } };
  for (const [oggi, restano] of [["2027-02-23", true], ["2027-02-24", false]]) {
    const locale = memoriaFinta({ [CHIAVI.obiettivo]: obiettivo, [CHIAVI.piano]: piano, [CHIAVI.profilo]: { eta: "40-49" } });
    const memoria = creaMemoria(locale);
    assert.deepEqual(memoria.pulisci(oggi).chiavi, restano ? [] : [CHIAVI.obiettivo, CHIAVI.piano], oggi);
    assert.equal(memoria.leggi(CHIAVI.obiettivo) !== null, restano, oggi);
    assert.equal(memoria.leggi(CHIAVI.piano) !== null, restano, oggi);
    assert.deepEqual(memoria.leggi(CHIAVI.profilo), { eta: "40-49" }, oggi);   // il profilo resta finché la persona esce
  }
  // tre mesi di calendario anche a fine mese
  const fineMese = { tipo: "evento", percorso: "ur-lungo", giorni: 1, partenza: "2026-11-30" };
  for (const [oggi, resta] of [["2027-02-28", true], ["2027-03-01", false]]) {
    const memoria = creaMemoria(memoriaFinta({ [CHIAVI.obiettivo]: fineMese }));
    memoria.pulisci(oggi);
    assert.equal(memoria.leggi(CHIAVI.obiettivo) !== null, resta, oggi);
  }
  // un piano senza una data sua se ne va con il suo obiettivo
  const senzaDataSua = { versione: 1, settimane: [] };
  const conObiettivo = creaMemoria(memoriaFinta({ [CHIAVI.obiettivo]: obiettivo, [CHIAVI.piano]: senzaDataSua }));
  assert.deepEqual(conObiettivo.pulisci("2027-02-23").chiavi, []);
  assert.deepEqual(conObiettivo.pulisci("2027-02-24").chiavi, [CHIAVI.obiettivo, CHIAVI.piano]);
  // senza data l'obiettivo libero, il solo semaforo e il loro piano restano
  for (const senzaData of [{ tipo: "libero", libero: "ore", giorni: 1, ore: 5 }, { tipo: "semaforo" }]) {
    const memoria = creaMemoria(memoriaFinta({ [CHIAVI.obiettivo]: senzaData, [CHIAVI.piano]: senzaDataSua }));
    assert.deepEqual(memoria.pulisci("2031-01-01").chiavi, []);
    assert.deepEqual(memoria.leggi(CHIAVI.obiettivo), senzaData);
    assert.deepEqual(memoria.leggi(CHIAVI.piano), senzaDataSua);
  }
});

test("con la memoria piena si svuota prima la cache, poi le chiavi guaste", () => {
  const locale = memoriaFinta({}, { quota: 4000 });
  const memoria = creaMemoria(locale, { adesso: () => ADESSO });
  assert.equal(memoria.scrivi(CHIAVI.cache, { letto: OGGI, benessere: "x".repeat(2000) }), true);
  assert.equal(memoria.scrivi(CHIAVI.profilo, { eta: "40-49" }), true);
  locale.setItem(CHIAVI.mattino + GUASTO, "y".repeat(500));   // rimasto da un guasto di prima
  // le risposte di oggi non ci stanno, si toglie la cache e basta quella
  assert.equal(memoria.scrivi(CHIAVI.esiti, { [OGGI]: { livello: "verde", nota: "z".repeat(1500) } }), true);
  assert.equal(locale.getItem(CHIAVI.cache), null);
  assert.notEqual(locale.getItem(CHIAVI.mattino + GUASTO), null);
  // senza più cache si tolgono le chiavi guaste
  assert.equal(memoria.scrivi(CHIAVI.mattino, { [OGGI]: { stoMale: false, nota: "w".repeat(1900) } }), true);
  assert.equal(locale.getItem(CHIAVI.mattino + GUASTO), null);
  // e se non basta ancora la scrittura non riesce, senza toccare il resto
  assert.equal(memoria.scrivi(CHIAVI.domenica, { "2027-03-14": { nota: "v".repeat(5000) } }), false);
  assert.equal(locale.getItem(CHIAVI.domenica), null);
  assert.deepEqual(memoria.leggi(CHIAVI.profilo), { eta: "40-49" });
  assert.equal(memoria.leggi(CHIAVI.esiti)[OGGI].livello, "verde");
  assert.equal(memoria.leggi(CHIAVI.mattino)[OGGI].stoMale, false);
});

test("le preferenze di oggi con sfida e dataEvento diventano un obiettivo libero con la stessa data", () => {
  const locale = memoriaFinta({ [CHIAVI.preferenze]: { sfida: "settimana", dataEvento: "2027-06-12", intervallo: 90, dispositivo: "anello" } });
  const memoria = creaMemoria(locale, { adesso: () => ADESSO });
  assert.deepEqual(memoria.migra(), { guaste: [], obiettivo: true });
  assert.deepEqual(memoria.leggi(CHIAVI.obiettivo),
    { tipo: "libero", libero: "giorni", giorni: 3, ore: 8, partenza: "2027-06-12", daSfida: "settimana" });
  assert.deepEqual(memoria.leggi(CHIAVI.preferenze), { intervallo: 90, dispositivo: "anello" });
  // una volta sola
  assert.deepEqual(memoria.migra(), { guaste: [], obiettivo: false });
  assert.equal(memoria.leggi(CHIAVI.obiettivo).partenza, "2027-06-12");
});

test("ogni sfida di prima ha il suo obiettivo libero, e senza sfida vale quella che la pagina mostrava", () => {
  const casi = [
    [{ sfida: "giornata", dataEvento: "2027-04-03" }, { libero: "ore", giorni: 1, ore: 5, partenza: "2027-04-03", daSfida: "giornata" }],
    [{ sfida: "weekend" }, { libero: "giorni", giorni: 3, ore: 7, daSfida: "weekend" }],
    [{ sfida: "grande", dataEvento: "2027-07-01" }, { libero: "giorni", giorni: 3, ore: 10, partenza: "2027-07-01", daSfida: "grande" }],
    [{ dataEvento: "2027-05-20" }, { libero: "giorni", giorni: 3, ore: 7, partenza: "2027-05-20", daSfida: "weekend" }],
    [{ sfida: "inventata", dataEvento: "2027-02-30" }, { libero: "giorni", giorni: 3, ore: 7, daSfida: "weekend" }],   // una data che non esiste
  ];
  for (const [preferenze, atteso] of casi) {
    const memoria = creaMemoria(memoriaFinta({ [CHIAVI.preferenze]: preferenze }), { adesso: () => ADESSO });
    assert.equal(memoria.migra().obiettivo, true, JSON.stringify(preferenze));
    assert.deepEqual(memoria.leggi(CHIAVI.obiettivo), { tipo: "libero", ...atteso }, JSON.stringify(preferenze));
    assert.deepEqual(memoria.leggi(CHIAVI.preferenze), {}, JSON.stringify(preferenze));
  }
  // senza sfida e senza data non nasce niente
  const memoria = creaMemoria(memoriaFinta({ [CHIAVI.preferenze]: { intervallo: 30 } }), { adesso: () => ADESSO });
  assert.deepEqual(memoria.migra(), { guaste: [], obiettivo: false });
  assert.equal(memoria.leggi(CHIAVI.obiettivo), null);
  assert.deepEqual(memoria.leggi(CHIAVI.preferenze), { intervallo: 30 });
});

test("la migrazione non cambia un obiettivo già scelto, e con la memoria piena non perde la sfida", () => {
  const scelto = { tipo: "evento", percorso: "tt-originale", giorni: 5, partenza: "2027-05-20" };
  const locale = memoriaFinta({ [CHIAVI.preferenze]: { sfida: "giornata", dataEvento: "2027-04-03" }, [CHIAVI.obiettivo]: scelto });
  const memoria = creaMemoria(locale, { adesso: () => ADESSO });
  assert.deepEqual(memoria.migra(), { guaste: [], obiettivo: false });
  assert.deepEqual(memoria.leggi(CHIAVI.obiettivo), scelto);
  assert.deepEqual(memoria.leggi(CHIAVI.preferenze), {});

  const preferenze = { sfida: "weekend", dataEvento: "2027-04-03" };
  const testo = JSON.stringify(preferenze);
  const piena = memoriaFinta({ [CHIAVI.preferenze]: testo }, { quota: CHIAVI.preferenze.length + testo.length });
  const sulTelefonoPieno = creaMemoria(piena, { adesso: () => ADESSO });
  assert.deepEqual(sulTelefonoPieno.migra(), { guaste: [], obiettivo: false });
  assert.deepEqual(sulTelefonoPieno.leggi(CHIAVI.preferenze), preferenze);
  assert.equal(sulTelefonoPieno.leggi(CHIAVI.obiettivo), null);
});

test("la copia ha il numero di formato e tutto tranne chiave, accesso, consenso, cache e coda", () => {
  const { memoria } = telefonoDiLucia();
  assert.equal(nomeCopia(OGGI), "come-sto-dati-2027-03-15.json");
  assert.equal(nomeCopia("oggi"), "come-sto-dati.json");
  const file = memoria.copia(OGGI);
  assert.equal(file.formato, MEMORIA.formatoCopia);
  assert.equal(file.app, "come-sto");
  assert.equal(file.giorno, OGGI);
  assert.equal(file.creato, new Date(ADESSO - 16 * GIORNO).toISOString());
  assert.deepEqual(Object.keys(file.chiavi).sort(), [...NELLA_COPIA].sort());
  const testo = JSON.stringify(file);
  for (const fuori of [CHIAVE_LUCIA, ACCESSO_LUCIA, CHIAVE, ACCESSO, CHIAVI.consenso, CHIAVI.cache, CHIAVI.coda]) {
    assert.ok(!testo.includes(fuori), fuori);
  }
  // nel file le voci hanno il loro istante, che serve per unire
  assert.equal(typeof file.chiavi[CHIAVI.esiti]["2027-03-15"].agg, "number");
});

test("salvare e riprendere la copia su un telefono nuovo dà gli stessi dati", () => {
  const vecchio = telefonoDiLucia();
  const testo = JSON.stringify(vecchio.memoria.copia(OGGI), null, 2);
  const locale = memoriaFinta();
  const nuovo = creaMemoria(locale, { sessione: memoriaFinta(), adesso: () => ADESSO + GIORNO });
  const anteprima = nuovo.riprendi(testo, { anteprima: true });
  assert.equal(anteprima.ok, true);
  assert.equal(anteprima.giorno, OGGI);
  assert.equal(locale.dati.size, 0);                               // l'anteprima non scrive niente
  assert.ok(anteprima.voci.every((v) => v.sostituite === 0));      // un telefono vuoto non perde niente
  assert.deepEqual(anteprima.voci.map((v) => v.chiave).sort(), [...NELLA_COPIA].sort());

  const ripresa = nuovo.riprendi(testo);
  assert.deepEqual([ripresa.ok, ripresa.motivo, ripresa.ignorate, ripresa.nonScritte], [true, null, [], []]);
  for (const chiave of NELLA_COPIA) {
    assert.deepEqual(nuovo.leggi(chiave), vecchio.memoria.leggi(chiave), chiave);
    assert.deepEqual(nuovo.leggi(chiave), vecchio.valori[chiave], chiave);
  }
  for (const chiave of [CHIAVI.consenso, CHIAVI.cache]) assert.equal(nuovo.leggi(chiave), null, chiave);
  assert.deepEqual(nuovo.leggi(CHIAVI.coda), []);
  assert.equal(leggiCredenziale(locale, memoriaFinta()), null);
  // la copia del telefono nuovo è uguale a quella del vecchio, istanti compresi
  assert.deepEqual(nuovo.copia(OGGI).chiavi, vecchio.memoria.copia(OGGI).chiavi);
  // e riprenderla di nuovo non cambia niente
  assert.deepEqual(nuovo.riprendi(testo).voci, []);
});

test("un valore con dentro la chiave o l'accesso non si salva e non va nella copia", () => {
  const locale = memoriaFinta({ [CHIAVE]: CHIAVE_LUCIA });
  const sessione = memoriaFinta({ [ACCESSO]: ACCESSO_LUCIA });
  const memoria = creaMemoria(locale, { sessione, adesso: () => ADESSO });
  assert.equal(memoria.scrivi(CHIAVI.profilo, { nota: `per entrare uso ${CHIAVE_LUCIA}` }), false);
  assert.equal(memoria.scrivi(CHIAVI.uscite, { i401: { nota: ACCESSO_LUCIA } }), false);
  assert.equal(locale.getItem(CHIAVI.profilo), null);
  // anche se ci finisse per un errore, la copia la lascia fuori
  locale.setItem(CHIAVI.profilo, JSON.stringify({ nota: CHIAVE_LUCIA }));
  assert.equal(memoria.scrivi(CHIAVI.esiti, { [OGGI]: { livello: "verde" } }), true);
  const file = memoria.copia(OGGI);
  assert.deepEqual(Object.keys(file.chiavi), [CHIAVI.esiti]);
  assert.ok(!JSON.stringify(file).includes(CHIAVE_LUCIA));
  // e una copia che la contiene non la porta dentro
  const conLaChiave = { formato: 1, app: "come-sto", giorno: OGGI, chiavi: { [CHIAVI.disponibilita]: { nota: CHIAVE_LUCIA } } };
  const ripresa = memoria.riprendi(conLaChiave);
  assert.deepEqual([ripresa.ok, ripresa.voci, ripresa.ignorate], [true, [], [CHIAVI.disponibilita]]);
  assert.equal(locale.getItem(CHIAVI.disponibilita), null);
});

test("riprendere una copia unisce, e per ogni giorno e ogni uscita resta il dato più recente", () => {
  const prima = ADESSO - 10 * GIORNO;
  const dopo = ADESSO - 2 * GIORNO;
  // il telefono di Marco
  const locale = memoriaFinta({
    [CHIAVI.esiti]: { "2027-03-10": { livello: "rosso", agg: dopo }, "2027-03-11": { livello: "verde", agg: prima } },
    [CHIAVI.uscite]: { i501: { d: "2027-03-09", sforzo: 7, agg: dopo }, i502: { d: "2027-03-10", sforzo: 3, agg: prima } },
    [CHIAVI.profilo]: { eta: "50-54", agg: dopo },
    [CHIAVI.obiettivo]: { tipo: "semaforo", agg: prima },
    [CHIAVI.mattino]: { "2027-03-11": { stoMale: false, agg: prima } },
  });
  // la copia fatta sul computer di Marco
  const file = {
    formato: 1, app: "come-sto", giorno: "2027-03-13", creato: new Date(dopo).toISOString(),
    chiavi: {
      [CHIAVI.esiti]: {
        "2027-03-10": { livello: "giallo", agg: prima },    // più vecchio, resta il rosso del telefono
        "2027-03-11": { livello: "giallo", agg: dopo },     // più nuovo, sostituisce
        "2027-03-12": { livello: "verde", agg: dopo },      // nuovo
      },
      [CHIAVI.uscite]: {
        i501: { d: "2027-03-09", sforzo: 5, agg: prima },
        i502: { d: "2027-03-10", sforzo: 4, borse: "evento", agg: dopo },
        i503: { d: "2027-03-12", sforzo: 6, agg: dopo },
      },
      [CHIAVI.profilo]: { eta: "40-49", agg: prima },
      [CHIAVI.obiettivo]: { tipo: "evento", percorso: "tt-originale", giorni: 5, partenza: "2027-05-20", agg: dopo },
      [CHIAVI.mattino]: { "2027-03-11": { stoMale: false, agg: dopo } },   // gli stessi dati non contano
    },
  };
  const memoria = creaMemoria(locale, { adesso: () => ADESSO });
  const prova = memoria.riprendi(file, { anteprima: true });
  const atteso = [
    { chiave: CHIAVI.esiti, nuove: 1, sostituite: 1 },
    { chiave: CHIAVI.uscite, nuove: 1, sostituite: 1 },
    { chiave: CHIAVI.obiettivo, nuove: 0, sostituite: 1 },
  ];
  assert.deepEqual(prova.voci, atteso);
  assert.equal(memoria.leggi(CHIAVI.esiti)["2027-03-11"].livello, "verde");   // l'anteprima non ha scritto
  assert.equal(memoria.leggi(CHIAVI.obiettivo).tipo, "semaforo");

  const ripresa = memoria.riprendi(JSON.stringify(file));
  assert.deepEqual([ripresa.ok, ripresa.voci], [true, atteso]);
  assert.deepEqual(memoria.leggi(CHIAVI.esiti), {
    "2027-03-10": { livello: "rosso" }, "2027-03-11": { livello: "giallo" }, "2027-03-12": { livello: "verde" },
  });
  assert.deepEqual(memoria.leggi(CHIAVI.uscite), {
    i501: { d: "2027-03-09", sforzo: 7 }, i502: { d: "2027-03-10", sforzo: 4, borse: "evento" }, i503: { d: "2027-03-12", sforzo: 6 },
  });
  assert.deepEqual(memoria.leggi(CHIAVI.profilo), { eta: "50-54" });
  assert.deepEqual(memoria.leggi(CHIAVI.obiettivo), { tipo: "evento", percorso: "tt-originale", giorni: 5, partenza: "2027-05-20" });
  // le voci riprese tengono l'istante della copia, non quello della ripresa
  assert.equal(grezzo(locale, CHIAVI.esiti)["2027-03-12"].agg, dopo);
  assert.equal(grezzo(locale, CHIAVI.mattino)["2027-03-11"].agg, prima);
});

test("riprendere controlla il formato e non prende mai credenziali, consenso, coda o cache", () => {
  const locale = memoriaFinta();
  const memoria = creaMemoria(locale, { adesso: () => ADESSO });
  const motivo = (file) => memoria.riprendi(file).motivo;
  assert.equal(motivo("questa non è una copia"), "illeggibile");
  assert.equal(motivo("{\"formato\":1}"), "estranea");
  assert.equal(motivo(null), "estranea");
  assert.equal(motivo([]), "estranea");
  assert.equal(motivo({ formato: 1, app: "altra-app", chiavi: {} }), "estranea");
  assert.equal(motivo({ formato: "1", app: "come-sto", chiavi: {} }), "estranea");
  assert.equal(motivo({ formato: 1, app: "come-sto", chiavi: [] }), "estranea");
  assert.equal(motivo({ formato: 2, app: "come-sto", chiavi: {} }), "nuova");
  assert.equal(motivo(" ".repeat(MEMORIA.copiaMassima + 1)), "grande");
  assert.equal(locale.dati.size, 0);

  const file = {
    formato: 1, app: "come-sto", giorno: OGGI,
    chiavi: {
      [CHIAVE]: "chiave-di-qualcun-altro-0123456789",
      [ACCESSO]: "accesso-di-qualcun-altro-0123456789",
      [CHIAVI.consenso]: { versione: 2, data: OGGI },
      [CHIAVI.coda]: [{ tipo: "manuale", attivita: { type: "Ride", moving_time: 3600 } }],
      [CHIAVI.cache]: { letto: OGGI },
      "comesto.profilo.v2": { eta: "40-49" },
      [CHIAVI.esiti]: [1, 2],
      [CHIAVI.uscite]: { i601: "Dura" },
      [CHIAVI.disponibilita]: { giorni: [1, 3], stella: 3, ore: 4, agg: ADESSO },
    },
  };
  const ripresa = memoria.riprendi(file);
  assert.equal(ripresa.ok, true);
  assert.deepEqual(ripresa.voci, [{ chiave: CHIAVI.disponibilita, nuove: 1, sostituite: 0 }]);
  assert.deepEqual(ripresa.ignorate.sort(), [ACCESSO, CHIAVE, CHIAVI.cache, CHIAVI.coda, CHIAVI.consenso, CHIAVI.esiti,
    "comesto.profilo.v2", CHIAVI.uscite].sort());
  assert.deepEqual([...locale.dati.keys()], [CHIAVI.disponibilita]);
});

test("l'anteprima della ripresa non scrive niente, nemmeno lo spostamento di una chiave rotta", () => {
  const locale = memoriaFinta({ [CHIAVI.esiti]: "{rotto" });
  const memoria = creaMemoria(locale, { adesso: () => ADESSO });
  const file = { formato: 1, app: "come-sto", giorno: OGGI, chiavi: { [CHIAVI.esiti]: { [OGGI]: { livello: "verde", agg: ADESSO } } } };
  assert.deepEqual(memoria.riprendi(file, { anteprima: true }).voci, [{ chiave: CHIAVI.esiti, nuove: 1, sostituite: 0 }]);
  assert.deepEqual([...locale.dati.keys()], [CHIAVI.esiti]);
  assert.equal(locale.getItem(CHIAVI.esiti), "{rotto");
  // la ripresa vera sposta il guasto da parte e scrive la copia
  assert.equal(memoria.riprendi(file).ok, true);
  assert.equal(locale.getItem(CHIAVI.esiti + GUASTO), "{rotto");
  assert.deepEqual(memoria.leggi(CHIAVI.esiti), { [OGGI]: { livello: "verde" } });
});

test("riprendere su un telefono con la memoria piena lo dice", () => {
  const { memoria } = telefonoDiLucia();
  const testo = JSON.stringify(memoria.copia(OGGI));
  const piccola = creaMemoria(memoriaFinta({}, { quota: 300 }), { adesso: () => ADESSO });
  const ripresa = piccola.riprendi(testo);
  assert.equal(ripresa.ok, false);
  assert.equal(ripresa.motivo, "memoria");
  assert.ok(ripresa.nonScritte.length > 0);
});

test("Esci e cancella tutto non lascia nessuna chiave comesto., credenziali comprese", () => {
  const { locale, sessione, memoria } = telefonoDiLucia();
  locale.setItem(CHIAVI.profilo + GUASTO, "{rotto");
  locale.setItem("comesto.diario.v1", "{}");
  locale.setItem("altrosito.tema", "scuro");
  sessione.setItem("comesto.demo", "1");
  sessione.setItem("comesto.oauth", "{}");
  sessione.setItem("altrosito.scheda", "2");
  const tolte = memoria.esciCancellaTutto();
  const rimaste = [...locale.dati.keys(), ...sessione.dati.keys()];
  assert.deepEqual(rimaste.filter((k) => k.startsWith(PREFISSO)), []);
  assert.deepEqual(rimaste.sort(), ["altrosito.scheda", "altrosito.tema"]);
  for (const k of [CHIAVE, ACCESSO, CHIAVI.consenso, CHIAVI.coda, CHIAVI.cache, CHIAVI.profilo + GUASTO, "comesto.diario.v1", "comesto.demo"]) {
    assert.ok(tolte.includes(k), k);
  }
  assert.equal(leggiCredenziale(locale, sessione), null);
  assert.deepEqual(memoria.esciCancellaTutto(), []);
});

test("il link degli iscritti resta per il ritorno da intervals.icu, finché non entra nell'obiettivo", () => {
  const locale = memoriaFinta();
  const invito = { percorso: "tt-originale", giorni: 4, partenza: "2027-05-20" };
  // prima di «Entra con intervals.icu»
  const prima = creaMemoria(locale, { sessione: memoriaFinta(), adesso: () => ADESSO });
  assert.equal(prima.scrivi(CHIAVI.invito, invito), true);
  // al ritorno la pagina riparte da capo, con una scheda nuova
  const dopo = creaMemoria(locale, { sessione: memoriaFinta(), adesso: () => ADESSO + 60000 });
  dopo.migra();
  dopo.pulisci(OGGI);
  assert.deepEqual(dopo.leggi(CHIAVI.invito), invito);
  // un obiettivo diverso non lo tocca
  dopo.scrivi(CHIAVI.obiettivo, { tipo: "libero", libero: "ore", giorni: 1, ore: 5 });
  assert.deepEqual(dopo.pulisci(OGGI).chiavi, []);
  assert.deepEqual(dopo.leggi(CHIAVI.invito), invito);
  // quando entra nell'obiettivo si toglie, anche con i giorni cambiati
  dopo.scrivi(CHIAVI.obiettivo, { tipo: "evento", percorso: "tt-originale", giorni: 5, partenza: "2027-05-20" });
  assert.deepEqual(dopo.pulisci(OGGI).chiavi, [CHIAVI.invito]);
  assert.equal(dopo.leggi(CHIAVI.invito), null);
  // un invito mai usato se ne va 3 mesi dopo il suo evento, l'ultimo giorno è il 23 maggio
  const mai = creaMemoria(memoriaFinta({ [CHIAVI.invito]: invito }));
  assert.deepEqual(mai.pulisci("2027-08-23").chiavi, []);
  assert.deepEqual(mai.pulisci("2027-08-24").chiavi, [CHIAVI.invito]);
});

test("con la memoria assente, bloccata o piena le risposte della stessa apertura non si perdono una dopo l'altra", () => {
  // Lucia risponde «Un dolore» e no alla pedalata, poi spunta «Naso che cola». La memoria non tiene,
  // e la seconda risposta deve partire da quella che l'app ha in pagina, non da un diario vuoto.
  for (const locale of [null, memoriaFinta({}, { rotta: true }), memoriaFinta({}, { quota: 10 })]) {
    const memoria = creaMemoria(locale, { adesso: () => ADESSO });
    let diario = memoria.leggi(CHIAVI.mattino);
    let esito = memoria.cambia(CHIAVI.mattino, (d) => { d[OGGI] = { ...(d[OGGI] || {}), pedalata: "no" }; }, diario);
    assert.equal(esito.salvato, false);
    assert.equal(memoria.tiene(), false);
    diario = esito.valore;
    esito = memoria.cambia(CHIAVI.mattino, (d) => { d[OGGI] = { ...(d[OGGI] || {}), stoMale: ["naso"] }; }, diario);
    assert.deepEqual(esito.valore[OGGI], { pedalata: "no", stoMale: ["naso"] });
    // lo stesso per il profilo, dove scegliere il dispositivo non cancella la fascia d'età appena scelta
    let profilo = {};
    profilo = memoria.cambia(CHIAVI.profilo, (p) => ({ ...(p || {}), fasciaEta: "50-54" }), profilo).valore;
    profilo = memoria.cambia(CHIAVI.profilo, (p) => ({ ...(p || {}), dispositivo: "anello" }), profilo).valore;
    assert.deepEqual(profilo, { fasciaEta: "50-54", dispositivo: "anello" });
    // dopo «Esci e cancella tutto» non c'è più niente da tenere in pagina
    memoria.esciCancellaTutto();
    assert.equal(memoria.tiene(), true);
  }

  // Con la memoria che funziona si riparte da quello salvato, anche se la pagina ha altro.
  const locale = memoriaFinta();
  const memoria = creaMemoria(locale, { adesso: () => ADESSO });
  memoria.cambia(CHIAVI.profilo, () => ({ fasciaEta: "40-49" }), {});
  const { valore, salvato } = memoria.cambia(CHIAVI.profilo, (p) => ({ ...p, dispositivo: "anello" }), { altro: 1 });
  assert.equal(salvato, true);
  assert.deepEqual(valore, { fasciaEta: "40-49", dispositivo: "anello" });
  assert.deepEqual(memoria.leggi(CHIAVI.profilo), { fasciaEta: "40-49", dispositivo: "anello" });
  assert.equal(memoria.tiene(), true);
  // con false non cambia niente, con true vale la modifica sul posto, con null la chiave si toglie
  assert.equal(memoria.cambia(CHIAVI.profilo, () => false).valore.dispositivo, "anello");
  const storia = memoria.cambia(CHIAVI.esiti, (s) => { s[OGGI] = { livello: "verde" }; return true; }).valore;
  assert.deepEqual(storia, { [OGGI]: { livello: "verde" } });
  memoria.cambia(CHIAVI.profilo, () => null);
  assert.equal(memoria.leggi(CHIAVI.profilo), null);
});

test("togli toglie solo le chiavi della tabella", () => {
  const locale = memoriaFinta({ [CHIAVI.profilo]: { eta: "40-49" }, [CHIAVE]: CHIAVE_LUCIA });
  const memoria = creaMemoria(locale);
  assert.equal(memoria.togli(CHIAVI.profilo), true);
  assert.equal(locale.getItem(CHIAVI.profilo), null);
  assert.equal(memoria.togli(CHIAVI.profilo), true);   // già tolta
  // le credenziali le toglie js/credenziali.js, oppure Esci e cancella tutto
  assert.equal(memoria.togli(CHIAVE), false);
  assert.equal(locale.getItem(CHIAVE), CHIAVE_LUCIA);
});

test("le chiavi .guasto restano ${MEMORIA.guastoGiorni} giorni dal primo avvio che le trova, poi si tolgono", () => {
  const locale = memoriaFinta({ [CHIAVI.profilo + GUASTO]: "{rotto", [CHIAVI.esiti]: {} });
  const memoria = creaMemoria(locale, { adesso: () => ADESSO });
  const dopo = (n) => giorniPrima(OGGI, -n);
  // il primo avvio la trova e segna il giorno, il contenuto resta com'era
  assert.deepEqual(memoria.pulisci(OGGI).chiavi, []);
  assert.equal(locale.getItem(CHIAVI.profilo + GUASTO), "{rotto");
  assert.deepEqual(grezzo(locale, "comesto.guasti"), { [CHIAVI.profilo + GUASTO]: OGGI });
  assert.deepEqual(memoria.pulisci(dopo(MEMORIA.guastoGiorni - 1)).chiavi, []);
  // dopo i giorni scritti in js/parametri.js si toglie, e con lei l'elenco dei giorni
  assert.deepEqual(memoria.pulisci(dopo(MEMORIA.guastoGiorni)).chiavi, [CHIAVI.profilo + GUASTO]);
  assert.equal(locale.getItem(CHIAVI.profilo + GUASTO), null);
  assert.equal(locale.getItem("comesto.guasti"), null);
  // le chiavi dei dati non c'entrano
  assert.notEqual(locale.getItem(CHIAVI.esiti), null);
  assert.deepEqual(memoria.migra().guaste, []);
});
