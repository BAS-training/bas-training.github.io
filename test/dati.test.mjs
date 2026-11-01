// Prove dello strato dei dati (9.6 della specifica). Si lanciano con  node --test test/dati.test.mjs
// Le persone e i numeri sono inventati. In test/registrazioni ci sono risposte nella forma di
// intervals.icu, con id e valori inventati, per i casi di 9.11.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  QUALITA, qualita, normalizzaAttivita, normalizzaGiorno, doppioni, oreDelGiorno, contoOre, giriUniti,
  caricoNascosto, durataStub, preparaAttivita, palestraAbbinata, soloStrava, notteNonArrivaPiu, settimaneDiStoria,
} from "../js/dati.js";
import { TESTI_DATI } from "../js/testi-dati.js";

const vicino = (a, b, tolleranza) => Math.abs(a - b) <= tolleranza;
const registrazione = (nome) => JSON.parse(readFileSync(new URL(`./registrazioni/${nome}.json`, import.meta.url), "utf8"));

// Un'attività grezza come la manda intervals.icu, con i campi chiesti da js/api.js.
function giro(id, inizio, extra = {}) {
  return { id, start_date_local: inizio, type: "Ride", source: "GARMIN_CONNECT", moving_time: 7200, distance: 50000, total_elevation_gain: 400, trainer: false, commute: false, ...extra };
}

function stub(id, inizio, sorgente = "STRAVA") {
  return { _note: `${sorgente} activities are not available via the API`, icu_athlete_id: "i100001", id, source: sorgente, start_date_local: inizio };
}

const giorno = (id, extra = {}) => normalizzaGiorno({ id, ...extra });

// --- Gli stub ---

test("uno stub con carico nascosto 120 e nient'altro quel giorno, con k 40, dura 3 ore stimate", () => {
  const s = normalizzaAttivita(stub("16010000001", "2026-03-07T08:30:00"));
  assert.equal(s.stub, true);
  assert.equal(s.secondi, null);
  const d = durataStub(s, giorno("2026-03-07", { atlLoad: 120, ctlLoad: 120 }), 40, [s]);
  assert.ok(vicino(d.secondi, 3 * 3600, 1), `secondi ${d.secondi}`);
  assert.equal(d.qualita, QUALITA.stimata);
  assert.equal(d.carico, 120);
});

test("due stub nello stesso giorno, un'ora e mezza ciascuno", () => {
  const a = normalizzaAttivita(stub("16010000002", "2026-03-07T08:30:00"));
  const b = normalizzaAttivita(stub("16010000003", "2026-03-07T16:00:00"));
  const g = giorno("2026-03-07", { atlLoad: 120 });
  for (const s of [a, b]) {
    const d = durataStub(s, g, 40, [a, b]);
    assert.ok(vicino(d.secondi, 1.5 * 3600, 1), `secondi ${d.secondi}`);
    assert.equal(d.carico, 60);
  }
});

test("con il carico nascosto a zero, o senza il carico del giorno, la durata manca", () => {
  const s = normalizzaAttivita(stub("16010000004", "2026-03-08T09:00:00"));
  const visibile = normalizzaAttivita(giro("i1", "2026-03-08T17:00:00", { icu_training_load: 50 }));
  const zero = durataStub(s, giorno("2026-03-08", { atlLoad: 50 }), 40, [s, visibile]);
  assert.equal(zero.secondi, null);
  assert.equal(zero.qualita, QUALITA.manca);
  assert.equal(durataStub(s, giorno("2026-03-08"), 40, [s]).qualita, QUALITA.manca);
  assert.equal(durataStub(s, null, 40, [s]).qualita, QUALITA.manca);
});

test("uno stub con la durata detta vale «detta da te» e resta fuori dal passo", () => {
  const s = normalizzaAttivita(stub("16010000005", "2026-03-07T08:30:00"), { secondi: 9000, tipo: "bici" });
  assert.equal(s.secondi, 9000);
  assert.equal(s.qualita.secondi, QUALITA.detta);
  assert.equal(s.tipo, "Ride");
  assert.equal(s.fuoriDalPasso, true);
  assert.equal(s.motivoFuoriPasso, "stub");
  const d = durataStub(s, giorno("2026-03-07", { atlLoad: 120 }), 40, [s]);
  assert.equal(d.secondi, 9000);
  assert.equal(d.qualita, QUALITA.detta);
  // Anche un giro a mano ha la durata detta, e non entra nel passo.
  const aMano = normalizzaAttivita(giro("i2", "2026-03-09T10:00:00", { source: "MANUAL" }));
  assert.equal(aMano.qualita.secondi, QUALITA.detta);
  assert.equal(aMano.motivoFuoriPasso, "detta");
});

test("uno stub Garmin senza durata è come uno da Strava, e un'attività Garmin con la durata no", () => {
  assert.equal(normalizzaAttivita(stub("i7000001", "2026-03-07T08:30:00", "GARMIN_CONNECT")).stub, true);
  assert.equal(normalizzaAttivita(giro("i7000002", "2026-03-07T08:30:00")).stub, false);
});

// --- I doppioni ---

test("Garmin e Wahoo con partenza a 4 minuti e durate entro il 10%, resta quella con la potenza", () => {
  const garmin = giro("i10", "2026-03-14T09:00:00", { moving_time: 14400, icu_training_load: 210, device_watts: true, has_heartrate: true });
  const wahoo = giro("i11", "2026-03-14T09:04:00", { source: "WAHOO", moving_time: 13800, icu_training_load: 190, has_heartrate: true });
  const lista = doppioni([normalizzaAttivita(wahoo, { borse: "evento", kg: 8 }), normalizzaAttivita(garmin)]);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].id, "i10");
  assert.equal(lista[0].potenza, true);
  assert.deepEqual(lista[0].doppioni.map((x) => x.id), ["i11"]);
  // la risposta data sulla copia tolta passa a quella che resta
  assert.equal(lista[0].borse, "evento");
  assert.equal(lista[0].kg, 8);
});

test("i doppioni restano due con partenze lontane o durate troppo diverse", () => {
  const a = normalizzaAttivita(giro("i12", "2026-03-14T09:00:00", { moving_time: 7200 }));
  const tardi = normalizzaAttivita(giro("i13", "2026-03-14T09:11:00", { moving_time: 7200 }));
  const corto = normalizzaAttivita(giro("i14", "2026-03-14T09:02:00", { moving_time: 5400 }));
  assert.equal(doppioni([a, tardi]).length, 2);
  assert.equal(doppioni([a, corto]).length, 2);
});

test("mai una vuota al posto di una piena, e due stub restano due", () => {
  const pieno = normalizzaAttivita(giro("i15", "2026-03-15T08:00:00", { has_heartrate: true, icu_training_load: 90 }));
  const vuoto = normalizzaAttivita(stub("16010000006", "2026-03-15T08:03:00"));
  const lista = doppioni([vuoto, pieno]);
  assert.deepEqual(lista.map((a) => a.id), ["i15"]);
  const altro = normalizzaAttivita(stub("16010000007", "2026-03-15T08:05:00"));
  assert.equal(doppioni([vuoto, altro]).length, 2);
});

test("un giro da Strava già scritto da Come sto conta una volta sola", () => {
  const s = normalizzaAttivita(stub("16010000008", "2026-03-21T08:30:00"));
  const scritto = normalizzaAttivita(giro("i16", "2026-03-21T08:30:00", { source: "MANUAL", external_id: "comesto-s-16010000008", icu_rpe: 5, icu_training_load: 120 }));
  const lista = doppioni([s, scritto]);
  assert.deepEqual(lista.map((a) => a.id), ["i16"]);
  assert.equal(lista[0].daComeSto, true);
});

test("la stessa palestra dall'app e dall'orologio, entro 2 ore, conta una seduta sola", () => {
  const app = normalizzaAttivita({ id: "i20", start_date_local: "2026-03-18T18:30:00", type: "WeightTraining", source: "MANUAL", moving_time: 3000, icu_rpe: 7, icu_training_load: 70, external_id: "comesto-p-2026-03-18-1", tags: ["comesto-palestra-gambe"] });
  const orologio = normalizzaAttivita({ id: "i21", start_date_local: "2026-03-18T18:35:00", type: "WeightTraining", source: "GARMIN_CONNECT", moving_time: 2900, icu_training_load: 9, has_heartrate: true });
  const lontana = normalizzaAttivita({ id: "i22", start_date_local: "2026-03-18T07:00:00", type: "WeightTraining", source: "GARMIN_CONNECT", moving_time: 2900, has_heartrate: true });
  const lista = doppioni([orologio, app, lontana]);
  assert.deepEqual(lista.map((a) => a.id).sort(), ["i20", "i22"]);
  assert.equal(palestraAbbinata([orologio, lontana], "2026-03-18T19:00:00").id, "i21");
  assert.equal(palestraAbbinata([orologio], "2026-03-18T21:00:00"), null);
});

// --- Le ore ---

test("le ore del giorno, con rulli, e-bike a metà, palestra e corsa fuori, stub con la stima", () => {
  const lista = [
    normalizzaAttivita(giro("i30", "2026-03-22T08:00:00", { moving_time: 7200 })),
    normalizzaAttivita(giro("i31", "2026-03-22T18:00:00", { type: "VirtualRide", moving_time: 3600, trainer: true })),
    normalizzaAttivita(giro("i32", "2026-03-22T12:00:00", { type: "EBikeRide", moving_time: 7200 })),
    normalizzaAttivita({ id: "i33", start_date_local: "2026-03-22T19:30:00", type: "WeightTraining", source: "GARMIN_CONNECT", moving_time: 3600 }),
    normalizzaAttivita({ id: "i34", start_date_local: "2026-03-22T06:30:00", type: "Run", source: "GARMIN_CONNECT", moving_time: 3600 }),
    normalizzaAttivita(giro("i35", "2026-03-23T08:00:00")),
  ];
  const s = normalizzaAttivita(stub("16010000009", "2026-03-22T15:00:00"));
  s.secondi = 3600;
  s.qualita.secondi = QUALITA.stimata;
  lista.push(s);
  const conto = contoOre(lista, "2026-03-22");
  assert.ok(vicino(conto.ore, 5, 1e-9), `ore ${conto.ore}`);
  assert.ok(vicino(conto.vere, 4, 1e-9));
  assert.ok(vicino(conto.stimate, 1, 1e-9));
  assert.ok(vicino(oreDelGiorno(lista, "2026-03-22", { eBikeEvento: true }), 6, 1e-9));
  assert.equal(oreDelGiorno(lista, giorno("2026-03-23")), 2);
  // uno stub senza durata vale zero ore e si conta a parte
  const senza = normalizzaAttivita(stub("16010000010", "2026-03-24T08:00:00"));
  assert.deepEqual(contoOre([senza], "2026-03-24"), { ore: 0, vere: 0, dette: 0, stimate: 0, senzaDurata: 1 });
});

test("i doppioni contano una volta sola nelle ore", () => {
  const lista = doppioni([
    normalizzaAttivita(giro("i40", "2026-03-28T09:00:00", { moving_time: 14400, device_watts: true, icu_training_load: 200 })),
    normalizzaAttivita(giro("i41", "2026-03-28T09:04:00", { source: "WAHOO", moving_time: 14000, icu_training_load: 180 })),
  ]);
  assert.equal(oreDelGiorno(lista, "2026-03-28"), 4);
});

test("per l'uscita lunga i giri separati da meno di 2 ore si uniscono, i rulli no", () => {
  const mattina = giro("i50", "2026-03-29T08:00:00", { moving_time: 7200, elapsed_time: 7500 });
  const dopoBar = giro("i51", "2026-03-29T11:00:00", { moving_time: 5400, elapsed_time: 5600 });
  const sera = giro("i52", "2026-03-29T17:00:00", { moving_time: 3600 });
  const rulli = giro("i53", "2026-03-29T21:00:00", { type: "VirtualRide", trainer: true, moving_time: 3600 });
  const lista = [normalizzaAttivita(mattina, { borse: "evento", kg: 10 }), normalizzaAttivita(dopoBar), normalizzaAttivita(sera), normalizzaAttivita(rulli)];
  const giri = giriUniti(lista, "2026-03-29");
  assert.equal(giri.length, 2);
  assert.equal(giri[0].secondi, 12600);
  assert.deepEqual(giri[0].ids, ["i50", "i51"]);
  // la parte corta senza domanda non smentisce le borse della parte lunga
  assert.equal(giri[0].borse, "evento");
  assert.equal(giri[0].kg, 10);
  assert.equal(giri[1].secondi, 3600);
  // con un «No» in una delle parti vale la risposta più bassa
  const conNo = giriUniti([normalizzaAttivita(mattina, { borse: "evento" }), normalizzaAttivita(dopoBar, { borse: "no" })], "2026-03-29");
  assert.equal(conNo[0].borse, "no");
});

// --- Il carico nascosto ---

test("il carico nascosto è il carico del giorno meno quello delle attività leggibili, mai sotto zero", () => {
  const visibile = normalizzaAttivita(giro("i60", "2026-04-04T08:00:00", { icu_training_load: 50 }));
  assert.equal(caricoNascosto(giorno("2026-04-04", { atlLoad: 150 }), [visibile]), 100);
  assert.equal(caricoNascosto(giorno("2026-04-04", { atlLoad: 30 }), [visibile]), 0);
  assert.equal(caricoNascosto(giorno("2026-04-04"), [visibile]), null);
  assert.equal(caricoNascosto(giorno("2026-04-05", { atlLoad: 80 }), [visibile]), 80);
});

test("il carico nascosto toglie anche le copie dei doppioni, che intervals.icu conta tutte e due", () => {
  const lista = doppioni([
    normalizzaAttivita(giro("i61", "2026-04-11T09:00:00", { moving_time: 14400, device_watts: true, icu_training_load: 210 })),
    normalizzaAttivita(giro("i62", "2026-04-11T09:04:00", { source: "WAHOO", moving_time: 13800, icu_training_load: 190 })),
  ]);
  assert.equal(caricoNascosto(giorno("2026-04-11", { atlLoad: 400 }), lista), 0);
});

// --- I giorni ---

test("un giorno di benessere, con il battito del sonno e l'HRV di Apple", () => {
  const g = normalizzaGiorno({ id: "2026-04-01", ctl: 40.5, atl: 38.2, atlLoad: 80, ctlLoad: 68, restingHR: 48, avgSleepingHR: 53.5, hrv: 61.2, sleepSecs: 26100, sleepScore: 81, fatigue: 2, soreness: 3, injury: 1 });
  assert.deepEqual(
    [g.d, g.giorno, g.ctl, g.atl, g.carico, g.caricoFatica, g.caricoFitness, g.fc, g.fcRiposo, g.fcSonno, g.hrv, g.sonno, g.punteggioSonno, g.fatica, g.dolori, g.infortunio, g.notte],
    ["2026-04-01", "2026-04-01", 40.5, 38.2, 80, 80, 68, 48, 48, 53.5, 61.2, 26100, 81, 2, 3, 1, true],
  );
  const apple = normalizzaGiorno({ id: "2026-04-02", hrvSDNN: 44 });
  assert.equal(apple.hrv, 44);
  assert.equal(apple.hrvSdnn, true);
  assert.equal(apple.sonno, null);
  const vuoto = normalizzaGiorno({ id: "2026-04-03" });
  assert.equal(vuoto.notte, false);
  assert.equal(vuoto.carico, null);
  assert.equal(normalizzaGiorno({ id: "ieri" }), null);
  assert.equal(normalizzaGiorno(null), null);
});

// --- La qualità e il riconoscimento ---

test("la qualità di un numero", () => {
  assert.equal(qualita(null), QUALITA.manca);
  assert.equal(qualita(undefined), QUALITA.manca);
  assert.equal(qualita(Number.NaN), QUALITA.manca);
  assert.equal(qualita(3600), QUALITA.vera);
  assert.equal(qualita({ valore: 3600, da: "persona" }), QUALITA.detta);
  assert.equal(qualita({ valore: 10800, da: "stima" }), QUALITA.stimata);
  assert.equal(qualita({ valore: null, da: "persona" }), QUALITA.manca);
  assert.equal(qualita({ valore: 3600, da: "dispositivo" }), QUALITA.vera);
});

test("un'attività pulita ha i campi della specifica, nell'ordine di 6.2", () => {
  const a = normalizzaAttivita(giro("i70", "2026-04-04T08:00:00", { icu_training_load: 90, has_heartrate: true, average_heartrate: 131, icu_rpe: 6, external_id: "20512345670", tags: ["comesto-borse-parte", "comesto-kg-5"] }));
  assert.deepEqual(Object.keys(a).slice(0, 20), ["id", "inizio", "giorno", "tipo", "sorgente", "secondi", "metri", "dislivello", "carico", "fonteCarico", "fcMedia", "potenza", "rulli", "commute", "eBike", "borse", "sforzo", "etichette", "externalId", "qualita"]);
  assert.equal(a.giorno, "2026-04-04");
  assert.equal(a.carico, 90);
  assert.equal(a.fonteCarico, "battito");
  assert.equal(a.borse, "parte");
  assert.equal(a.kg, 5);
  assert.equal(a.sforzo, 6);
  assert.equal(a.qualita.sforzo, QUALITA.detta);
  assert.equal(a.motivoFuoriPasso, "borse");
  assert.equal(normalizzaAttivita({ id: "i71" }), null);
  assert.equal(normalizzaAttivita({ start_date_local: "2026-04-04T08:00:00" }), null);
});

test("le risposte sul telefono vincono sulle etichette, e il tipo corretto sul tipo letto", () => {
  const letta = giro("i72", "2026-04-05T08:00:00", { tags: ["comesto-borse-evento", "comesto-kg-12", "comesto-notte-fuori"], icu_rpe: 4 });
  const a = normalizzaAttivita(letta, { borse: "no", sforzo: 7, notteFuori: false, tipo: "GravelRide" });
  assert.deepEqual([a.borse, a.sforzo, a.sforzoLetto, a.notteFuori, a.tipo, a.tipoLetto, a.qualita.tipo], ["no", 7, 4, false, "GravelRide", "Ride", QUALITA.detta]);
  const soloEtichette = normalizzaAttivita(letta);
  assert.deepEqual([soloEtichette.borse, soloEtichette.kg, soloEtichette.notteFuori], ["evento", 12, true]);
});

test("rulli, e-bike, commute e dislivello strano restano fuori dal passo, ma contano per le ore", () => {
  assert.equal(normalizzaAttivita(giro("i73", "2026-04-06T08:00:00", { trainer: true })).rulli, true);
  assert.equal(normalizzaAttivita(giro("i74", "2026-04-06T08:00:00", { type: "EBikeRide" })).motivoFuoriPasso, "ebike");
  assert.equal(normalizzaAttivita(giro("i75", "2026-04-06T08:00:00", { commute: true })).motivoFuoriPasso, "commute");
  assert.equal(normalizzaAttivita(giro("i76", "2026-04-06T08:00:00", { distance: 20000, total_elevation_gain: 1000 })).motivoFuoriPasso, "dislivello");
  assert.equal(normalizzaAttivita(giro("i77", "2026-04-06T08:00:00", { distance: 35000, total_elevation_gain: 0 })).motivoFuoriPasso, "dislivello");
  assert.equal(normalizzaAttivita(giro("i78", "2026-04-06T08:00:00"), { fuoriDalPasso: true }).motivoFuoriPasso, "esclusa");
  assert.equal(normalizzaAttivita(giro("i79", "2026-04-06T08:00:00")).motivoFuoriPasso, null);
});

test("la descrizione resta solo per le attività di Come sto, il nome si mostra", () => {
  const altra = normalizzaAttivita(giro("i80", "2026-04-07T08:00:00", { name: "Giro con Anna", description: "Testo libero della persona" }));
  assert.equal(altra.descrizione, null);
  assert.equal(altra.daComeSto, false);
  assert.equal(altra.nome, "Giro con Anna");
  const nostra = normalizzaAttivita(giro("i81", "2026-04-07T18:00:00", { source: "MANUAL", external_id: "comesto-u-abc123", description: "[come-sto v1]" }));
  assert.equal(nostra.descrizione, "[come-sto v1]");
  assert.equal(nostra.daComeSto, true);
  assert.equal(nostra.manuale, true);
});

// --- Gli altri casi di 6.3 e 6.4 ---

test("chi ha solo Strava, la notte che non arriva più e le settimane di storia", () => {
  const oggi = "2026-04-30";
  const stubs = [1, 2, 3].map((k) => normalizzaAttivita(stub(`1601000010${k}`, `2026-04-1${k}T08:00:00`)));
  const letti = [normalizzaAttivita(giro("i90", "2026-04-20T08:00:00")), normalizzaAttivita(giro("i91", "2026-01-20T08:00:00"))];
  assert.equal(soloStrava([...stubs, ...letti], oggi), true);
  assert.equal(soloStrava([...stubs.slice(0, 1), ...letti], oggi), false);
  assert.equal(settimaneDiStoria(letti, oggi), 14);
  assert.equal(settimaneDiStoria([], oggi), 0);

  const giorni = [];
  for (let k = 1; k <= 30; k++) {
    const d = `2026-04-${String(k).padStart(2, "0")}`;
    giorni.push(normalizzaGiorno(k <= 16 ? { id: d, hrv: 55, restingHR: 50, sleepSecs: 27000 } : { id: d, atlLoad: 40 }));
  }
  assert.equal(notteNonArrivaPiu(giorni), true);
  assert.equal(notteNonArrivaPiu(giorni.slice(0, 29)), false);
  assert.equal(notteNonArrivaPiu(giorni.map((g) => ({ ...g, hrv: null, fc: null, sonno: null }))), false);
});

// --- Le registrazioni, i casi di 9.11 ---

const OGGI = "2026-10-31";

function registrate() {
  const giorni = registrazione("benessere").map(normalizzaGiorno);
  const attivita = preparaAttivita(registrazione("attivita"), giorni, { oggi: OGGI });
  const per = (id) => attivita.find((a) => a.id === id);
  return { giorni, attivita, per };
}

test("registrazioni, lo stub da Strava e lo stub Garmin prendono la durata dal carico nascosto", () => {
  const { attivita, per } = registrate();
  const strava = per("16012345678");
  assert.deepEqual([strava.stub, strava.secondi, strava.qualita.secondi, strava.carico, strava.fonteCarico], [true, 10800, QUALITA.stimata, 120, "nascosto"]);
  const garmin = per("i7100014");
  assert.deepEqual([garmin.stub, garmin.secondi, garmin.qualita.secondi, garmin.carico], [true, 5400, QUALITA.stimata, 60]);
  assert.ok(attivita.every((a, i) => i === 0 || attivita[i - 1].inizio >= a.inizio), "dalla più recente");
  assert.equal(new Set(attivita.map((a) => a.id)).size, attivita.length);
});

test("registrazioni, l'attività a mano con external_id vale «detta da te» e resta fuori dal passo", () => {
  const a = registrate().per("i7100009");
  assert.deepEqual([a.daComeSto, a.manuale, a.qualita.secondi, a.fuoriDalPasso, a.fonteCarico, a.carico], [true, true, QUALITA.detta, true, "sforzo", 90]);
});

test("registrazioni, lo stesso giro da due dispositivi resta uno, quello con la potenza", () => {
  const { attivita, per } = registrate();
  assert.equal(per("i7100011"), undefined);
  assert.deepEqual(per("i7100010").doppioni.map((x) => x.id), ["i7100011"]);
  assert.equal(oreDelGiorno(attivita, "2026-10-18"), 4);
});

test("registrazioni, la palestra dall'orologio e quella dall'app", () => {
  const { per } = registrate();
  const orologio = per("i7100012");
  assert.deepEqual([orologio.fonteCarico, orologio.qualita.carico], ["palestra", QUALITA.stimata]);
  assert.ok(vicino(orologio.carico, 31.5, 1e-9), `carico ${orologio.carico}`);
  const app = per("i7100015");
  assert.deepEqual([app.fonteCarico, app.carico, app.allenato, app.qualita.carico], ["palestra", 70, "gambe", QUALITA.detta]);
  assert.equal(per("i7100016"), undefined);
});

test("registrazioni, notti con l'HRV e senza sonno, e il giro di due giorni con le borse", () => {
  const { giorni, attivita } = registrate();
  const ultima = giorni[giorni.length - 1];
  assert.deepEqual([ultima.hrv, ultima.sonno, ultima.fcSonno, ultima.notte], [54, null, 57, true]);
  assert.equal(notteNonArrivaPiu(giorni), false);
  const sabato = giriUniti(attivita, "2026-10-10");
  assert.deepEqual([sabato[0].borse, sabato[0].kg, sabato[0].notteFuori], ["evento", 8, true]);
  assert.equal(soloStrava(attivita, OGGI), false);
  // la descrizione di un'altra attività non resta, quella di Come sto sì
  assert.equal(registrate().per("i7100002").descrizione, null);
  assert.ok(registrate().per("i7100015").descrizione.endsWith("[come-sto v1]"));
});

// --- I testi a schermo di questo strato ---

test("i testi di js/testi-dati.js seguono le regole di scrittura del 7.1", () => {
  const vietate = new RegExp("\\b(ga" + "r[ae]" + "|presta" + "zion[ei]" + "|ra" + "c(e|es|ing)" + "|perfor" + "mance)\\b", "i");
  for (const [nome, testo] of Object.entries(TESTI_DATI)) {
    assert.equal(typeof testo, "string", nome);
    assert.ok(!testo.includes(":"), `due punti in ${nome}`);
    assert.ok(!vietate.test(testo), `parola vietata in ${nome}`);
    assert.ok(!/\b(T1|T2|T3|RIR|kJ|FTP|RPE)\b/.test(testo), `sigla in ${nome}`);
    assert.ok(!/\d[.,]\d/.test(testo), `decimali in ${nome}`);
  }
});
