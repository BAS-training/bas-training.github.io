// Prove delle scritture verso intervals.icu e delle letture dei soli giorni nuovi (9.7 della specifica).
// Si lanciano con  node --test test/scritture.test.mjs
// Memoria, client e rete sono finti, quindi non parte niente verso intervals.icu. Persone e numeri inventati.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CHIAVE_CODA, CHIAVE_USCITE, STATI, scriviSforzo, aggiungiEtichette, scriviBorse, etichetteBorse, etichettaPalestra,
  scriviCaricoStimato, scriviBenessere, corpoManuale, creaOAggiornaManuale, giroAMano, manualeDaStub, codiceCasuale,
  inCoda, leggiCoda, inviaCoda, unisciEtichette,
} from "../js/scritture.js";
import { creaClient, ErroreApi, lettureDaFare, unisciLetture, leggiNuovi, CAMPI_ATTIVITA } from "../js/api.js";
import { normalizzaAttivita, normalizzaGiorno, preparaAttivita } from "../js/dati.js";

const registrazione = (nome) => JSON.parse(readFileSync(new URL(`./registrazioni/${nome}.json`, import.meta.url), "utf8"));
const ADESSO = Date.UTC(2026, 9, 31, 7, 30);
const MINUTO = 60000;
const GIORNO = 86400000;

// La memoria del telefono, come la darà js/memoria.js, con i valori che passano da JSON.
function memoriaFinta(iniziale = {}) {
  const dati = new Map(Object.entries(iniziale).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    dati,
    leggi: (k) => (dati.has(k) ? JSON.parse(dati.get(k)) : null),
    scrivi: (k, v) => { dati.set(k, JSON.stringify(v)); },
  };
}

// Un client con le stesse funzioni di creaClient, che segna ogni chiamata e risponde come gli si dice.
function clientFinto(risposte = {}) {
  const chiamate = [];
  const rispondi = async (nome, ...argomenti) => {
    chiamate.push({ nome, argomenti: JSON.parse(JSON.stringify(argomenti)) });
    const r = risposte[nome];
    return typeof r === "function" ? r(...argomenti) : r ?? null;
  };
  const metodi = ["salvaAttivita", "leggiAttivita", "creaManuali", "salvaBenessere", "atleta", "benessere", "uscite"];
  return Object.assign({ chiamate }, Object.fromEntries(metodi.map((m) => [m, (...a) => rispondi(m, ...a)])));
}

const errore = (tipo, stato = null) => () => { throw new ErroreApi(tipo, "prova", stato); };

const risposta = (stato, corpo) => ({
  ok: stato >= 200 && stato < 300,
  status: stato,
  text: async () => (typeof corpo === "string" ? corpo : JSON.stringify(corpo)),
});

async function conFetchFinto(rispondi, prova) {
  const originale = globalThis.fetch;
  const viste = [];
  globalThis.fetch = async (url, opzioni) => { viste.push({ url, opzioni }); return rispondi(url, opzioni); };
  try {
    await prova();
  } finally {
    globalThis.fetch = originale;
  }
  return viste;
}

function giro(id, extra = {}, detto = null) {
  return normalizzaAttivita({ id, start_date_local: "2026-10-13T18:00:00", type: "Ride", source: "WAHOO", moving_time: 5400, distance: 42000, total_elevation_gain: 280, ...extra }, detto);
}

const stubStrava = () => normalizzaAttivita({ _note: "STRAVA activities are not available via the API", id: "16012345678", source: "STRAVA", start_date_local: "2026-10-24T08:30:00" });

// --- Lo sforzo e le etichette ---

test("il PUT dello sforzo manda solo icu_rpe, e l'esito si salva sul telefono", async () => {
  const memoria = memoriaFinta();
  const a = giro("i7100008");
  const viste = await conFetchFinto(() => risposta(200, registrazione("risposta-put")), async () => {
    inCoda(scriviSforzo(a, 4), memoria, ADESSO);
    const esito = await inviaCoda(creaClient({ chiave: "chiave-di-prova-123" }), memoria, { adesso: ADESSO });
    assert.deepEqual(esito.inviate.map((x) => x.id), ["i7100008"]);
    assert.equal(esito.rimaste, 0);
  });
  assert.equal(viste.length, 1);
  assert.equal(viste[0].url, "https://intervals.icu/api/v1/activity/i7100008");
  assert.equal(viste[0].opzioni.method, "PUT");
  assert.deepEqual(JSON.parse(viste[0].opzioni.body), { icu_rpe: 4 });
  const voce = memoria.leggi(CHIAVE_USCITE).i7100008;
  assert.deepEqual([voce.scritture.icu_rpe.valore, voce.scritture.icu_rpe.stato], [4, STATI.inviata]);
  assert.deepEqual(memoria.leggi(CHIAVE_CODA), []);
});

test("lo sforzo fuori dalla scala da 1 a 10 non si scrive, e nemmeno quello che intervals.icu ha già", () => {
  const a = giro("i1");
  assert.equal(scriviSforzo(a, 0), null);
  assert.equal(scriviSforzo(a, 11), null);
  assert.equal(scriviSforzo(a, "tanto"), null);
  assert.equal(scriviSforzo(giro("i2", { icu_rpe: 5 }), 5), null);
  assert.deepEqual(scriviSforzo(giro("i2", { icu_rpe: 5 }), 7).campi, { icu_rpe: 7 });
});

test("le etichette nuove si aggiungono a quelle che ci sono, e quelle vecchie delle borse si rifanno", async () => {
  const a = giro("i3", { tags: ["viaggio", "comesto-borse-parte", "comesto-kg-5"] });
  const client = clientFinto();
  const memoria = memoriaFinta();
  inCoda(scriviBorse(a, { borse: "evento", kg: 12, notteFuori: true }), memoria, ADESSO);
  await inviaCoda(client, memoria, { adesso: ADESSO });
  assert.deepEqual(client.chiamate[0].argomenti, ["i3", { tags: ["viaggio", "comesto-borse-evento", "comesto-kg-12", "comesto-notte-fuori"] }]);
  // sul telefono restano solo le etichette di Come sto, quelle della persona sono testo suo
  assert.deepEqual(memoria.leggi(CHIAVE_USCITE).i3.scritture.tags.valore, ["comesto-borse-evento", "comesto-kg-12", "comesto-notte-fuori"]);
  // con «No» si tolgono solo quelle delle borse di Come sto
  const dopo = giro("i3", { tags: ["viaggio", "comesto-borse-evento", "comesto-kg-12", "comesto-notte-fuori"] });
  inCoda(scriviBorse(dopo, { borse: "no" }), memoria, ADESSO);
  await inviaCoda(client, memoria, { adesso: ADESSO });
  assert.deepEqual(client.chiamate[1].argomenti[1], { tags: ["viaggio"] });
  // le etichette che non sono di Come sto non si scrivono e non si tolgono
  assert.equal(aggiungiEtichette(a, ["Viaggio lungo"]), null);
  assert.equal(aggiungiEtichette(a, ["comesto-borse-parte"]), null);
  assert.equal(aggiungiEtichette(a, ["comesto-palestra-gambe"], ["viaggio"]), null);
  assert.deepEqual(unisciEtichette(["viaggio", "comesto-palestra-alto"], ["comesto-palestra-gambe"]), ["viaggio", "comesto-palestra-gambe"]);
  assert.deepEqual(etichetteBorse({ borse: "parte", kg: 7.6 }), ["comesto-borse-parte", "comesto-kg-8"]);
  assert.deepEqual(etichetteBorse({ borse: "no", kg: 8, notteFuori: true }), []);
  assert.equal(etichettaPalestra("corpo"), "comesto-palestra-corpo");
  assert.equal(etichettaPalestra("braccia"), null);
});

test("le etichette si rifanno sulla lettura più fresca, così quelle aggiunte nel frattempo restano", async () => {
  const memoria = memoriaFinta();
  const client = clientFinto();
  inCoda(scriviBorse(giro("i4", { tags: ["viaggio"] }), { borse: "parte", kg: 8 }), memoria, ADESSO);
  const fresca = giro("i4", { tags: ["viaggio", "salite"] });
  await inviaCoda(client, memoria, { lette: [fresca], adesso: ADESSO });
  assert.deepEqual(client.chiamate[0].argomenti[1].tags, ["viaggio", "salite", "comesto-borse-parte", "comesto-kg-8"]);
});

test("sforzo e borse della stessa attività partono con un solo PUT", async () => {
  const memoria = memoriaFinta();
  const client = clientFinto();
  const a = giro("i5");
  inCoda(scriviSforzo(a, 6), memoria, ADESSO);
  const coda = inCoda(scriviBorse(a, { borse: "evento", kg: 10 }), memoria, ADESSO + MINUTO);
  assert.equal(coda.length, 1);
  await inviaCoda(client, memoria, { adesso: ADESSO });
  assert.equal(client.chiamate.length, 1);
  assert.deepEqual(client.chiamate[0].argomenti, ["i5", { icu_rpe: 6, tags: ["comesto-borse-evento", "comesto-kg-10"] }]);
});

// --- Le attività a mano ---

const PALESTRA = {
  start_date_local: "2026-10-31T18:00:00", type: "WeightTraining", name: "Palestra, scheda 3, seduta B", moving_time: 3000,
  elapsed_time: 3000, icu_rpe: 6, icu_training_load: 42, external_id: "comesto-p-2026-10-31-1", tags: ["comesto-palestra-corpo"],
  description: "Panca 3 × 8 a 30 kg, riserva 2",
};

test("un'attività a mano nuova va al bulk, e l'id restituito si salva sul telefono", async () => {
  const memoria = memoriaFinta();
  const viste = await conFetchFinto(() => risposta(200, registrazione("risposta-bulk")), async () => {
    const s = creaOAggiornaManuale(PALESTRA, [], memoria);
    assert.equal(s.tipo, "crea");
    inCoda(s, memoria, ADESSO);
    const esito = await inviaCoda(creaClient({ chiave: "chiave-di-prova-123" }), memoria, { adesso: ADESSO });
    assert.deepEqual(esito.inviate.map((x) => x.id), ["i7100099"]);
  });
  assert.equal(viste[0].url, "https://intervals.icu/api/v1/athlete/0/activities/manual/bulk");
  assert.equal(viste[0].opzioni.method, "POST");
  const corpo = JSON.parse(viste[0].opzioni.body);
  assert.ok(Array.isArray(corpo) && corpo.length === 1);
  assert.equal(corpo[0].external_id, "comesto-p-2026-10-31-1");
  assert.ok(corpo[0].description.endsWith("[come-sto v1]"));
  const voce = memoria.leggi(CHIAVE_USCITE).i7100099;
  assert.deepEqual([voce.externalId, voce.giorno, voce.scritture.creata.stato], ["comesto-p-2026-10-31-1", "2026-10-31", STATI.inviata]);
  // una scrittura confermata non riparte, né con un secondo POST né con un PUT uguale
  assert.equal(creaOAggiornaManuale(PALESTRA, [], memoria), null);
  const cambiata = creaOAggiornaManuale({ ...PALESTRA, icu_rpe: 7 }, [], memoria);
  assert.deepEqual([cambiata.tipo, cambiata.id], ["attivita", "i7100099"]);
  const client = clientFinto();
  await inviaCoda(client, memoria, { adesso: ADESSO });
  assert.equal(client.chiamate.length, 0);
});

test("prima di creare un'attività a mano si cerca lo stesso external_id fra quelle lette, e si fa un PUT", async () => {
  const lette = registrazione("attivita");
  const corpo = giroAMano({ inizio: "2026-10-15T18:30:00", secondi: 6000, sforzo: 6, metri: 40000, dislivello: 300, codice: "k7f3q9a2b1" });
  const s = creaOAggiornaManuale(corpo, lette);
  assert.deepEqual([s.tipo, s.id], ["attivita", "i7100009"]);
  assert.equal("external_id" in s.campi, false);
  const client = clientFinto();
  const memoria = memoriaFinta();
  inCoda(s, memoria, ADESSO);
  await inviaCoda(client, memoria, { adesso: ADESSO });
  assert.deepEqual(client.chiamate.map((c) => c.nome), ["salvaAttivita"]);
  assert.equal(client.chiamate[0].argomenti[0], "i7100009");
  assert.equal(client.chiamate[0].argomenti[1].moving_time, 6000);
  // le stesse attività lette e pulite vanno bene uguale
  const pulite = preparaAttivita(lette, [], { oggi: "2026-10-31" });
  assert.equal(creaOAggiornaManuale(corpo, pulite).id, "i7100009");
});

test("il corpo di un'attività a mano si controlla, e porta la riga [come-sto v1]", () => {
  assert.equal(corpoManuale({ ...PALESTRA, external_id: "palestra-1" }), null);
  assert.equal(corpoManuale({ ...PALESTRA, moving_time: 0 }), null);
  assert.equal(corpoManuale({ ...PALESTRA, start_date_local: "domani" }), null);
  const c = corpoManuale({ ...PALESTRA, icu_rpe: 6.4, icu_training_load: 41.6, tags: ["comesto-palestra-corpo", "Altro tipo"] });
  assert.deepEqual([c.icu_rpe, c.icu_training_load, c.tags], [6, 42, ["comesto-palestra-corpo"]]);
  assert.equal(c.description, "Panca 3 × 8 a 30 kg, riserva 2\n\n[come-sto v1]");
  const g = giroAMano({ inizio: "2026-10-30T09:00:00", secondi: 7200, borse: "evento", kg: 9, codice: "abc1234567" });
  assert.equal(g.external_id, "comesto-u-abc1234567");
  assert.equal("icu_training_load" in corpoManuale(g), false);
  assert.deepEqual(corpoManuale(g).tags, ["comesto-borse-evento", "comesto-kg-9"]);
  assert.match(codiceCasuale(), /^[a-z0-9]{10}$/);
});

// --- La coda ---

test("una scrittura fallita resta in coda e parte all'apertura dopo, nell'ordine in cui è nata", async () => {
  const memoria = memoriaFinta();
  inCoda(scriviSforzo(giro("i10"), 5), memoria, ADESSO);
  inCoda(scriviBorse(giro("i11"), { borse: "parte", kg: 5 }), memoria, ADESSO + MINUTO);
  inCoda(scriviBenessere("2026-10-31", { fatigue: 2, soreness: 3, injury: 1 }), memoria, ADESSO + 2 * MINUTO);
  const senzaRete = clientFinto({ salvaAttivita: errore("rete"), salvaBenessere: errore("rete") });
  const prima = await inviaCoda(senzaRete, memoria, { adesso: ADESSO });
  assert.deepEqual([prima.ferma, prima.rimaste, prima.inviate.length], ["rete", 3, 0]);
  assert.equal(leggiCoda(memoria).length, 3);
  const conRete = clientFinto();
  const dopo = await inviaCoda(conRete, memoria, { adesso: ADESSO + GIORNO });
  assert.equal(dopo.rimaste, 0);
  assert.deepEqual(conRete.chiamate.map((c) => [c.nome, c.argomenti[0]]), [["salvaAttivita", "i10"], ["salvaAttivita", "i11"], ["salvaBenessere", "2026-10-31"]]);
  assert.deepEqual(conRete.chiamate[2].argomenti[1], { fatigue: 2, soreness: 3, injury: 1 });
});

test("un 403 lascia la risposta sul telefono, senza errori a schermo", async () => {
  const memoria = memoriaFinta({ [CHIAVE_USCITE]: { i12: { giorno: "2026-10-13", sforzo: 6 } } });
  inCoda(scriviSforzo(giro("i12"), 6), memoria, ADESSO);
  const esito = await inviaCoda(clientFinto({ salvaAttivita: errore("permesso") }), memoria, { adesso: ADESSO });
  assert.deepEqual(esito.rifiutate, ["attivita:i12"]);
  assert.equal(esito.ferma, null);
  assert.deepEqual(leggiCoda(memoria), []);
  const voce = memoria.leggi(CHIAVE_USCITE).i12;
  assert.equal(voce.sforzo, 6);
  assert.equal(voce.scritture.icu_rpe.stato, STATI.rifiutata);
});

test("un 404 toglie la scrittura dalla coda, un errore del server o un 401 la tengono", async () => {
  const memoria = memoriaFinta();
  inCoda(scriviSforzo(giro("i13"), 5), memoria, ADESSO);
  const via = await inviaCoda(clientFinto({ salvaAttivita: errore("server", 404) }), memoria, { adesso: ADESSO });
  assert.deepEqual([via.scartate, via.rimaste], [["attivita:i13"], 0]);
  inCoda(scriviSforzo(giro("i14"), 5), memoria, ADESSO);
  const tenuta = await inviaCoda(clientFinto({ salvaAttivita: errore("server", 503) }), memoria, { adesso: ADESSO });
  assert.deepEqual([tenuta.ferma, tenuta.rimaste], ["server", 1]);
  const chiave = await inviaCoda(clientFinto({ salvaAttivita: errore("chiave") }), memoria, { adesso: ADESSO });
  assert.deepEqual([chiave.ferma, chiave.rimaste], ["chiave", 1]);
});

test("una scrittura confermata non rientra in coda", async () => {
  const memoria = memoriaFinta();
  inCoda(scriviSforzo(giro("i15"), 6), memoria, ADESSO);
  await inviaCoda(clientFinto(), memoria, { adesso: ADESSO });
  assert.deepEqual(inCoda(scriviSforzo(giro("i15"), 6), memoria, ADESSO), []);
  assert.equal(inCoda(scriviSforzo(giro("i15"), 7), memoria, ADESSO).length, 1);
  // e se la coda non si è salvata dopo l'invio, la scrittura confermata non riparte
  const cadente = memoriaFinta({ [CHIAVE_USCITE]: { i16: { scritture: { icu_rpe: { valore: 8, stato: STATI.inviata } } } } });
  const client = clientFinto();
  await inviaCoda(client, cadente, { coda: [{ ...scriviSforzo(giro("i16"), 8), nata: "2026-10-31T07:00:00.000Z", stato: STATI.daInviare }] });
  assert.equal(client.chiamate.length, 0);
});

test("con la memoria che lancia errori le scritture partono lo stesso", async () => {
  const rotta = { leggi() { throw new Error("memoria piena"); }, scrivi() { throw new Error("memoria piena"); } };
  const coda = inCoda(scriviSforzo(giro("i17"), 5), rotta, ADESSO);
  assert.equal(coda.length, 1);
  const client = clientFinto();
  const esito = await inviaCoda(client, rotta, { coda, adesso: ADESSO });
  assert.deepEqual([esito.inviate.length, client.chiamate.length], [1, 1]);
  assert.deepEqual(await inviaCoda(client, null), { inviate: [], rifiutate: [], scartate: [], rimaste: 0, ferma: null, chiamate: 0 });
});

// --- Quello che non si fa mai ---

test("mai DELETE, nemmeno passando da creaClient con tutte le scritture", async () => {
  const memoria = memoriaFinta();
  const scelte = { caricoSenzaSensori: true, stravaSuIntervals: true };
  const senzaSensori = giro("i20", {}, { sforzo: 5 });
  let nuove = 0;
  const viste = await conFetchFinto((url, opzioni) => {
    // il bulk restituisce le attività create, con un id nuovo
    if (opzioni.method === "POST") return risposta(200, JSON.parse(opzioni.body).map((a) => ({ ...a, id: `i72000${++nuove}`, source: "MANUAL" })));
    if (!opzioni.method || opzioni.method === "GET") return risposta(200, { id: "i20", description: "Uscita con Paolo" });
    return risposta(200, {});
  }, async () => {
    for (const s of [
      scriviSforzo(giro("i21"), 6),
      scriviBorse(giro("i22"), { borse: "evento", kg: 8, notteFuori: true }),
      scriviCaricoStimato(senzaSensori, scelte),
      creaOAggiornaManuale(PALESTRA, [], memoria),
      creaOAggiornaManuale(manualeDaStub(stubStrava(), { secondi: 7200, sforzo: 5 }, { nascosto: 0, scelte }), [], memoria),
      scriviBenessere("2026-10-31", { fatigue: 1 }),
    ]) {
      assert.ok(s, "ogni scrittura c'è");
      inCoda(s, memoria, ADESSO);
    }
    const esito = await inviaCoda(creaClient({ chiave: "chiave-di-prova-123" }), memoria, { adesso: ADESSO });
    assert.equal(esito.rimaste, 0);
  });
  assert.ok(viste.length >= 6);
  assert.ok(viste.every((v) => v.opzioni.method !== "DELETE"), viste.map((v) => v.opzioni.method).join(" "));
  const indirizzi = new Set(viste.map((v) => `${v.opzioni.method || "GET"} ${v.url}`));
  assert.ok(indirizzi.has("GET https://intervals.icu/api/v1/activity/i20"));
  assert.ok(indirizzi.has("PUT https://intervals.icu/api/v1/athlete/0/wellness/2026-10-31"));
  // la riga del carico stimato si aggiunge alla descrizione che c'è
  const put = viste.find((v) => v.opzioni.method === "PUT" && v.url.endsWith("/activity/i20"));
  assert.deepEqual(JSON.parse(put.opzioni.body), { icu_training_load: 90, description: "Uscita con Paolo\n\nCarico stimato da Come sto con lo sforzo." });
  // ogni attività creata ha il suo id sul telefono, e la descrizione d'altri non si salva
  const uscite = memoria.leggi(CHIAVE_USCITE);
  assert.deepEqual([uscite.i720001.externalId, uscite.i720002.externalId], ["comesto-p-2026-10-31-1", "comesto-s-16012345678"]);
  assert.equal(uscite.i20.scritture.description.valore, true);
  assert.ok(!JSON.stringify(uscite).includes("Paolo"));
});

test("mai un carico scritto su attività che l'app non ha creato, con le scelte facoltative spente", () => {
  const senzaSensori = giro("i30", {}, { sforzo: 5 });
  assert.equal(senzaSensori.fonteCarico, "sforzo");
  assert.equal(scriviCaricoStimato(senzaSensori, {}), null);
  assert.equal(scriviCaricoStimato(senzaSensori), null);
  // accesa, mai su un giro con il battito, con un carico che c'è già o con la sola stima grezza
  const accesa = { caricoSenzaSensori: true };
  assert.ok(scriviCaricoStimato(senzaSensori, accesa));
  assert.equal(scriviCaricoStimato(giro("i31", { has_heartrate: true, icu_training_load: 60 }, { sforzo: 5 }), accesa), null);
  assert.equal(scriviCaricoStimato(giro("i32", { icu_training_load: 40 }, { sforzo: 5 }), accesa), null);
  assert.equal(scriviCaricoStimato(giro("i33"), accesa), null);
  // il giro da Strava diventa un'attività a mano solo con la scelta accesa e il carico nascosto a zero
  const s = stubStrava();
  assert.equal(manualeDaStub(s, { secondi: 7200, sforzo: 5 }, { nascosto: 0 }), null);
  const scelte = { stravaSuIntervals: true };
  assert.equal(manualeDaStub(s, { secondi: 7200, sforzo: 5 }, { nascosto: 40, scelte }), null);
  assert.equal(manualeDaStub(s, { secondi: 7200, sforzo: 5 }, { nascosto: null, scelte }), null);
  const corpo = manualeDaStub(s, { secondi: 7200, sforzo: 5 }, { nascosto: 0, scelte });
  assert.deepEqual([corpo.external_id, corpo.icu_rpe, corpo.icu_training_load, corpo.moving_time], ["comesto-s-16012345678", 5, 120, 7200]);
  // sforzo e borse non portano mai un carico
  assert.equal("icu_training_load" in scriviSforzo(giro("i34"), 6).campi, false);
  assert.equal(scriviBorse(giro("i35"), { borse: "parte" }).campi, null);
});

test("mai una scrittura su uno stub, nemmeno se arriva grezzo", () => {
  const s = stubStrava();
  assert.equal(scriviSforzo(s, 5), null);
  assert.equal(aggiungiEtichette(s, ["comesto-borse-evento"]), null);
  assert.equal(scriviBorse(s, { borse: "evento" }), null);
  assert.equal(scriviCaricoStimato(s, { caricoSenzaSensori: true }), null);
  assert.equal(scriviSforzo({ id: "16012345678", source: "STRAVA", start_date_local: "2026-10-24T08:30:00" }, 5), null);
  assert.equal(scriviSforzo({ id: "i7100014", source: "GARMIN_CONNECT", start_date_local: "2026-10-27T07:00:00" }, 5), null);
  assert.equal(scriviSforzo(registrazione("attivita").find((a) => a.id === "i7100014"), 5), null);
});

test("le risposte del mattino, un solo PUT del benessere con la scala 1-4", () => {
  const s = scriviBenessere("2026-10-31", { fatigue: 2, soreness: 5, injury: 1, hrv: 50 });
  assert.deepEqual(s.campi, { fatigue: 2, injury: 1 });
  assert.equal(scriviBenessere("oggi", { fatigue: 2 }), null);
  assert.equal(scriviBenessere("2026-10-31", {}), null);
});

// --- Le chiamate e la cache (6.7) ---

function clientLetture() {
  return clientFinto({
    atleta: () => registrazione("atleta"),
    benessere: () => registrazione("benessere"),
    uscite: () => registrazione("attivita"),
  });
}

test("la prima apertura legge 182 giorni di benessere e di attività, e il profilo", async () => {
  const client = clientLetture();
  const r = await leggiNuovi(client, null, "2026-10-31", { adesso: ADESSO });
  assert.deepEqual(client.chiamate.map((c) => c.nome).sort(), ["atleta", "benessere", "uscite"]);
  assert.deepEqual(client.chiamate.find((c) => c.nome === "benessere").argomenti, ["2026-05-03", "2026-11-01"]);
  assert.deepEqual(client.chiamate.find((c) => c.nome === "uscite").argomenti, ["2026-05-03", "2026-11-01"]);
  assert.equal(r.letto, true);
  assert.equal(r.chiamate, 3);
  assert.equal(r.cache.chiamate.n, 3);
  assert.equal(r.benessere.length, 42);
  assert.equal(r.uscite.length, 17);
});

test("nella cache niente nomi, niente descrizioni d'altri e il profilo dell'atleta ridotto", async () => {
  const { cache, uscite } = await leggiNuovi(clientLetture(), null, "2026-10-31", { adesso: ADESSO });
  assert.ok(cache.uscite.every((a) => !("name" in a)));
  assert.ok(cache.uscite.filter((a) => "description" in a).every((a) => a.external_id.startsWith("comesto-")));
  assert.equal(cache.uscite.find((a) => a.id === "i7100002").description, undefined);
  assert.equal(cache.uscite.find((a) => a.id === "i7100015").description.endsWith("[come-sto v1]"), true);
  // il nome resta nelle attività appena lette, per mostrarlo, ma non si salva
  assert.equal(uscite.find((a) => a.id === "i7100002").name, "Colline e sterrati");
  assert.deepEqual(Object.keys(cache.atleta).sort(), ["firstname", "sportSettings", "timezone"]);
  assert.equal(cache.atleta.firstname, "Lucia");
  assert.deepEqual(cache.atleta.sportSettings[0], { types: ["Ride", "VirtualRide", "GravelRide", "MountainBikeRide", "EBikeRide"], ftp: 190, lthr: 162, max_hr: 181 });
  const testo = JSON.stringify(cache);
  for (const via of ["Prova", "1981-04-12", "weight", "sex", "Colline"]) assert.ok(!testo.includes(via), `nella cache c'è ${via}`);
});

test("nessuna lettura entro 10 minuti dall'ultima, salvo «Aggiorna», e mai più di due letture per apertura", async () => {
  const { cache } = await leggiNuovi(clientLetture(), null, "2026-10-31", { adesso: ADESSO });
  const presto = clientLetture();
  const r = await leggiNuovi(presto, cache, "2026-10-31", { adesso: ADESSO + 9 * MINUTO });
  assert.deepEqual([presto.chiamate.length, r.letto], [0, false]);
  assert.equal(r.uscite.length, 17);
  const aggiorna = clientLetture();
  await leggiNuovi(aggiorna, cache, "2026-10-31", { adesso: ADESSO + 9 * MINUTO, aggiorna: true });
  assert.deepEqual(aggiorna.chiamate.map((c) => c.nome).sort(), ["benessere", "uscite"]);
  const dopo = clientLetture();
  await leggiNuovi(dopo, cache, "2026-10-31", { adesso: ADESSO + 11 * MINUTO });
  assert.equal(dopo.chiamate.length, 2);
});

test("le letture solo dei giorni nuovi più 3, e il profilo dell'atleta una volta ogni 7 giorni", async () => {
  const { cache } = await leggiNuovi(clientLetture(), null, "2026-10-31", { adesso: ADESSO });
  const domani = clientLetture();
  const r = await leggiNuovi(domani, cache, "2026-11-01", { adesso: ADESSO + GIORNO });
  assert.deepEqual(domani.chiamate.map((c) => c.nome).sort(), ["benessere", "uscite"]);
  assert.deepEqual(domani.chiamate.find((c) => c.nome === "uscite").argomenti, ["2026-10-29", "2026-11-02"]);
  assert.equal(r.cache.chiamate.giorno, "2026-11-01");
  assert.equal(r.cache.chiamate.n, 2);
  const settimana = clientLetture();
  await leggiNuovi(settimana, r.cache, "2026-11-08", { adesso: ADESSO + 8 * GIORNO });
  assert.deepEqual(settimana.chiamate.map((c) => c.nome).sort(), ["atleta", "benessere", "uscite"]);
  assert.deepEqual(settimana.chiamate.find((c) => c.nome === "benessere").argomenti, ["2026-10-30", "2026-11-09"]);
  // il profilo già letto entrando non si chiede due volte
  const entrando = clientLetture();
  await leggiNuovi(entrando, null, "2026-10-31", { adesso: ADESSO, atleta: registrazione("atleta") });
  assert.deepEqual(entrando.chiamate.map((c) => c.nome).sort(), ["benessere", "uscite"]);
  assert.deepEqual(lettureDaFare({ rotta: true }, "2026-10-31", { adesso: ADESSO }), { dal: "2026-05-03", al: "2026-11-01", atleta: true, prima: true });
});

test("nel tratto riletto vince la lettura nuova, e oltre 182 giorni si toglie", () => {
  const vecchia = {
    letto: ADESSO - GIORNO, al: "2026-10-31", atleta: null, atletaLetto: null, chiamate: { giorno: "2026-10-30", n: 3 },
    benessere: [{ id: "2026-04-01", hrv: 50 }, { id: "2026-10-28", hrv: 51 }, { id: "2026-10-30", hrv: 52 }],
    uscite: [
      { id: "vecchia", start_date_local: "2026-04-02T08:00:00", moving_time: 3600 },
      { id: "tenuta", start_date_local: "2026-10-20T08:00:00", moving_time: 3600 },
      { id: "cancellata", start_date_local: "2026-10-29T08:00:00", moving_time: 3600 },
    ],
  };
  const r = unisciLetture(vecchia, {
    dal: "2026-10-28", al: "2026-11-01",
    benessere: [{ id: "2026-10-28", hrv: 60 }, { id: "2026-10-31", hrv: 61 }],
    uscite: [{ id: "nuova", start_date_local: "2026-10-31T09:00:00", moving_time: 3600, name: "Giro con Luca" }],
  }, "2026-10-31", { adesso: ADESSO, chiamate: 2 });
  assert.deepEqual(r.cache.uscite.map((a) => a.id), ["nuova", "tenuta"]);
  assert.deepEqual(r.cache.benessere.map((w) => [w.id, w.hrv]), [["2026-10-28", 60], ["2026-10-31", 61]]);
  assert.deepEqual(r.cache.chiamate, { giorno: "2026-10-31", n: 2 });
  assert.equal(r.uscite[0].name, "Giro con Luca");
  assert.equal(r.cache.uscite[0].name, undefined);
});

test("le letture chiedono i campi nuovi delle attività, e un errore porta il suo codice", async () => {
  for (const campo of ["icu_rpe", "device_watts", "has_heartrate", "trainer", "commute", "elapsed_time", "external_id", "tags", "description", "moving_time", "icu_training_load"]) {
    assert.ok(CAMPI_ATTIVITA.split(",").includes(campo), campo);
  }
  const viste = await conFetchFinto(() => risposta(404, ""), async () => {
    const client = creaClient({ chiave: "chiave-di-prova-123" });
    await assert.rejects(client.salvaAttivita("i1", { icu_rpe: 5 }), (e) => e.tipo === "server" && e.stato === 404);
    await assert.rejects(client.uscite("2026-10-01", "2026-10-31"), (e) => e.stato === 404);
  });
  assert.ok(viste[1].url.includes("fields=id,start_date_local,type,name,source,moving_time"));
  assert.ok(viste[1].url.includes("icu_rpe,device_watts,has_heartrate"));
});

test("le registrazioni passano da dati e scritture senza una chiamata di troppo", async () => {
  // Il ciclo di un'apertura, con le risposte registrate, le scritture in coda e nessun DELETE.
  const giorni = registrazione("benessere").map(normalizzaGiorno);
  const attivita = preparaAttivita(registrazione("attivita"), giorni, { oggi: "2026-10-31" });
  const memoria = memoriaFinta();
  const senzaSensori = attivita.find((a) => a.id === "i7100008");
  inCoda(scriviSforzo(senzaSensori, 4), memoria, ADESSO);
  inCoda(scriviBorse(senzaSensori, { borse: "no" }), memoria, ADESSO);
  const palestra = attivita.find((a) => a.id === "i7100012");
  inCoda(scriviSforzo(palestra, 5), memoria, ADESSO);
  inCoda(aggiungiEtichette(palestra, [etichettaPalestra("corpo")]), memoria, ADESSO);
  assert.equal(scriviSforzo(attivita.find((a) => a.id === "16012345678"), 5), null);
  const client = clientFinto({ salvaAttivita: (id) => ({ id }) });
  const esito = await inviaCoda(client, memoria, { lette: attivita, adesso: ADESSO });
  assert.deepEqual(client.chiamate.map((c) => [c.nome, c.argomenti[0]]), [["salvaAttivita", "i7100008"], ["salvaAttivita", "i7100012"]]);
  assert.deepEqual(client.chiamate[0].argomenti[1], { icu_rpe: 4 });
  assert.deepEqual(client.chiamate[1].argomenti[1], { icu_rpe: 5, tags: ["comesto-palestra-corpo"] });
  assert.equal(esito.chiamate, 2);
});
