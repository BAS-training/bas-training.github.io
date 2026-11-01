// Prove della serie di carico di Come sto (6.5 e 9.6 della specifica).
// Si lanciano con  node --test test/carico.test.mjs
// Le persone e i numeri sono inventati.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  fonteCarico, stimaGrezza, divisoreSforzo, divisorePer, puntiOra, serieCarico, differenzaFitness,
  provaCoincidenza, controlloIncrociato, FONTI,
} from "../js/carico.js";
import { normalizzaAttivita, normalizzaGiorno, preparaAttivita, QUALITA } from "../js/dati.js";
import { TESTI_DATI } from "../js/testi-dati.js";

const vicino = (a, b, tolleranza) => Math.abs(a - b) <= tolleranza;
const registrazione = (nome) => JSON.parse(readFileSync(new URL(`./registrazioni/${nome}.json`, import.meta.url), "utf8"));

function piuGiorni(iso, n) {
  const [a, m, g] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, g) + n * 86400000).toISOString().slice(0, 10);
}

// Un giro di Marco, grezzo come da intervals.icu.
function giro(id, inizio, extra = {}) {
  return { id, start_date_local: inizio, type: "Ride", source: "GARMIN_CONNECT", moving_time: 3600, distance: 26000, total_elevation_gain: 200, ...extra };
}

const pulita = (grezza, detto) => normalizzaAttivita(grezza, detto);

// --- La fonte del carico ---

test("la fonte del carico in ordine, potenza, battito, sforzo, stima grezza", () => {
  const conPotenza = pulita(giro("i1", "2026-05-02T08:00:00", { icu_training_load: 80, device_watts: true, has_heartrate: true, icu_rpe: 6 }));
  assert.deepEqual([conPotenza.fonteCarico, conPotenza.carico, conPotenza.qualita.carico], [FONTI.potenza, 80, QUALITA.vera]);
  const conBattito = pulita(giro("i2", "2026-05-02T08:00:00", { icu_training_load: 70, has_heartrate: true, icu_rpe: 6 }));
  assert.deepEqual([conBattito.fonteCarico, conBattito.carico], [FONTI.battito, 70]);
  const conSforzo = pulita(giro("i3", "2026-05-02T08:00:00", { icu_rpe: 6 }));
  assert.deepEqual([conSforzo.fonteCarico, conSforzo.carico, conSforzo.qualita.carico], [FONTI.sforzo, 72, QUALITA.detta]);
  const senzaNiente = pulita(giro("i4", "2026-05-02T08:00:00"));
  assert.deepEqual([senzaNiente.fonteCarico, senzaNiente.qualita.carico], [FONTI.stima, QUALITA.stimata]);
  assert.ok(senzaNiente.carico > 30 && senzaNiente.carico < 50, `carico ${senzaNiente.carico}`);
  const corsa = pulita({ id: "i5", start_date_local: "2026-05-02T08:00:00", type: "Run", source: "GARMIN_CONNECT", moving_time: 3600 });
  assert.deepEqual([corsa.carico, corsa.fonteCarico, corsa.qualita.carico], [null, null, QUALITA.manca]);
});

test("un carico su intervals.icu senza sensori resta, e non si somma alla stima", () => {
  const aMano = pulita(giro("i6", "2026-05-03T08:00:00", { icu_training_load: 65, icu_rpe: 3 }));
  assert.deepEqual([aMano.fonteCarico, aMano.carico], [FONTI.intervals, 65]);
  const diComeSto = pulita(giro("i7", "2026-05-03T08:00:00", { source: "MANUAL", external_id: "comesto-s-16010000001", icu_training_load: 72, icu_rpe: 6 }));
  assert.deepEqual([diComeSto.fonteCarico, diComeSto.carico, diComeSto.qualita.carico], [FONTI.sforzo, 72, QUALITA.detta]);
});

test("sforzo 6 per 60 minuti vale 72 punti", () => {
  const a = pulita(giro("i8", "2026-05-04T08:00:00"), { sforzo: 6 });
  assert.equal(a.carico, 72);
  assert.equal(fonteCarico(a, {}, 5).carico, 72);
});

test("la palestra mai dal battito, con sforzo × minuti / 5 × il fattore", () => {
  const palestra = (extra, detto) => pulita({ id: "p", start_date_local: "2026-05-05T18:00:00", type: "WeightTraining", source: "GARMIN_CONNECT", moving_time: 3600, ...extra }, detto);
  // dal polso arrivano 12 punti, che non valgono
  const senzaRisposta = palestra({ icu_training_load: 12, has_heartrate: true });
  assert.deepEqual([senzaRisposta.fonteCarico, senzaRisposta.qualita.carico], [FONTI.palestra, QUALITA.stimata]);
  assert.ok(vicino(senzaRisposta.carico, 42, 1e-9), `senza risposta ${senzaRisposta.carico}`);
  assert.ok(vicino(palestra({}, { sforzo: 5, allenato: "corpo" }).carico, 42, 1e-9));
  assert.ok(vicino(palestra({}, { sforzo: 6, allenato: "gambe" }).carico, 72, 1e-9));
  assert.ok(vicino(palestra({}, { sforzo: 6, allenato: "alto" }).carico, 28.8, 1e-9));
  // l'etichetta scritta su intervals.icu vale come la risposta
  assert.ok(vicino(palestra({ icu_rpe: 6, tags: ["comesto-palestra-alto"] }).carico, 28.8, 1e-9));
  // un carico messo a mano senza battito resta
  assert.deepEqual([palestra({ icu_training_load: 55 }).fonteCarico, palestra({ icu_training_load: 55 }).carico], [FONTI.intervals, 55]);
});

test("le gambe con sforzo 6 per 60 minuti valgono 72 nella Fatica e 0 nella Fitness", () => {
  const gambe = pulita({ id: "p1", start_date_local: "2026-05-06T18:00:00", type: "WeightTraining", source: "GARMIN_CONNECT", moving_time: 3600 }, { sforzo: 6, allenato: "gambe" });
  const serie = serieCarico([normalizzaGiorno({ id: "2026-05-06" })], [gambe]);
  assert.equal(serie.length, 1);
  assert.ok(vicino(serie[0].carico, 72, 1e-9));
  assert.equal(serie[0].caricoFitness, 0);
  assert.equal(serie[0].fitness, 0);
  assert.ok(serie[0].fatica > 0);
});

// --- La stima grezza ---

test("stima grezza, gravel di 4 ore con 17 m per km, le borse e la media di riferimento, IF 0,77 e 237 punti", () => {
  const km = 19 * 4;
  const a = pulita({ id: "g1", start_date_local: "2026-05-09T08:00:00", type: "GravelRide", source: "WAHOO", moving_time: 4 * 3600, distance: km * 1000, total_elevation_gain: 17 * km }, { borse: "evento" });
  const s = stimaGrezza(a);
  assert.ok(vicino(s.intensita, 0.77, 0.001), `IF ${s.intensita}`);
  assert.ok(vicino(s.carico, 237, 0.5), `carico ${s.carico}`);
  assert.deepEqual([a.fonteCarico, Math.round(a.carico)], [FONTI.stima, 237]);
});

test("da 4,9 a 5,1 ore il carico della stima grezza cresce, senza salti all'indietro", () => {
  const conOre = (ore) => stimaGrezza({ tipo: "GravelRide", secondi: ore * 3600, metri: 19 * ore * 1000, dislivello: 17 * 19 * ore, borse: "evento" }).carico;
  let prima = conOre(4.9);
  for (let ore = 4.91; ore <= 5.1 + 1e-9; ore += 0.01) {
    const adesso = conOre(ore);
    assert.ok(adesso > prima, `a ${ore.toFixed(2)} ore ${adesso} contro ${prima}`);
    prima = adesso;
  }
  // e su tutta la giornata, dalla mezz'ora alle 12 ore
  prima = 0;
  for (let ore = 0.5; ore <= 12; ore += 0.25) {
    const adesso = conOre(ore);
    assert.ok(adesso > prima, `a ${ore} ore`);
    prima = adesso;
  }
});

test("la stima grezza senza km vale 40 punti all'ora, e il tetto continuo vale anche per strada e rulli", () => {
  assert.equal(stimaGrezza({ tipo: "Ride", secondi: 7200, metri: null }).carico, 80);
  assert.equal(stimaGrezza({ tipo: "Ride", secondi: null }).carico, null);
  // strada alla media di riferimento, senza salita e senza borse, IF 0,62
  assert.ok(vicino(stimaGrezza({ tipo: "Ride", secondi: 3600, metri: 26000, dislivello: 0 }).intensita, 0.62, 1e-9));
  // rulli alla media di riferimento, IF 0,70
  assert.ok(vicino(stimaGrezza({ tipo: "VirtualRide", rulli: true, secondi: 3600, metri: 30000, dislivello: 0 }).intensita, 0.70, 1e-9));
  // in 10 ore il tetto è 0,65
  assert.ok(vicino(stimaGrezza({ tipo: "MountainBikeRide", secondi: 36000, metri: 150000, dislivello: 3000, borse: "evento" }).intensita, 0.65, 1e-9));
  // mai sotto 0,60, nemmeno piano e in pianura
  assert.ok(vicino(stimaGrezza({ tipo: "Ride", secondi: 7200, metri: 30000, dislivello: 0 }).intensita, 0.60, 1e-9));
});

// --- Il divisore personale e k ---

test("il divisore personale dopo 10 uscite con sensori e sforzo, a parte sotto e sopra le 3 ore", () => {
  const corte = [];
  for (let k = 0; k < 10; k++) {
    // sforzo 6 × 60 minuti = 360, con 60 punti dal battito, rapporto 6
    corte.push(pulita(giro(`c${k}`, `2026-04-${String(k + 1).padStart(2, "0")}T18:00:00`, { icu_training_load: 60, has_heartrate: true, icu_rpe: 6 })));
  }
  const lunghe = [];
  for (let k = 0; k < 9; k++) {
    lunghe.push(pulita(giro(`l${k}`, `2026-04-${String(k + 11).padStart(2, "0")}T08:00:00`, { moving_time: 4 * 3600, icu_training_load: 200, device_watts: true, icu_rpe: 5 })));
  }
  const d = divisoreSforzo([...corte, ...lunghe]);
  assert.equal(d.sotto, 6);
  assert.equal(d.sopra, 5);
  assert.deepEqual([d.usciteSotto, d.usciteSopra], [10, 9]);
  assert.equal(divisoreSforzo(corte.slice(0, 9)).sotto, 5);
  // con il divisore personale un giro senza sensori di un'ora a sforzo 6 vale 60 punti
  const senza = pulita(giro("s1", "2026-04-25T18:00:00"), { sforzo: 6 });
  assert.equal(fonteCarico(senza, {}, d).carico, 60);
  assert.equal(fonteCarico({ ...senza, secondi: 4 * 3600 }, {}, d).carico, 6 * 240 / 5);
  assert.equal(divisorePer(null, 3600), 5);
  // in preparaAttivita il divisore personale vale per tutti
  const tutte = preparaAttivita([...corte, ...lunghe].map((a) => giro(a.id, a.inizio, { moving_time: a.secondi, icu_training_load: a.caricoIcu, has_heartrate: a.battito, device_watts: a.potenza, icu_rpe: a.sforzo })).concat([giro("s2", "2026-04-26T18:00:00", { icu_rpe: 6 })]), [], { oggi: "2026-04-30" });
  assert.equal(tutte.find((a) => a.id === "s2").carico, 60);
});

test("k, i punti per ora delle uscite di 6 settimane, 40 con meno di 3 uscite", () => {
  const oggi = "2026-05-31";
  const uscite = [50, 40, 30, 60, 45].map((punti, k) => pulita(giro(`k${k}`, `2026-05-${String(10 + k).padStart(2, "0")}T08:00:00`, { moving_time: 7200, icu_training_load: punti * 2, has_heartrate: true })));
  assert.equal(puntiOra(uscite, oggi), 45);
  assert.equal(puntiOra(uscite.slice(0, 2), oggi), 40);
  // fuori dalle 6 settimane non conta
  assert.equal(puntiOra(uscite, "2026-08-31"), 40);
});

// --- La serie ---

// Una serie nota, costruita come intervals.icu, con il conto della regola 1.7 scritto qui a parte.
function serieNota(giorniTotali = 120) {
  const resta42 = Math.exp(-1 / 42);
  const resta7 = Math.exp(-1 / 7);
  const giorni = [];
  const attivita = [];
  let ctl = 35;
  let atl = 40;
  for (let k = 0; k < giorniTotali; k++) {
    const d = piuGiorni("2026-01-01", k);
    const carico = [0, 60, 0, 85, 0, 140, 95][k % 7] + (k % 11 === 0 ? 30 : 0);
    if (k > 0) {
      ctl = ctl * resta42 + carico * (1 - resta42);
      atl = atl * resta7 + carico * (1 - resta7);
    }
    giorni.push(normalizzaGiorno({ id: d, ctl, atl, atlLoad: carico, ctlLoad: carico }));
    if (carico > 0) attivita.push(pulita(giro(`n${k}`, `${d}T08:00:00`, { moving_time: 3600 + carico * 20, icu_training_load: carico, device_watts: true, has_heartrate: true })));
  }
  return { giorni, attivita };
}

test("la serie di Come sto su una serie nota è uguale a quella di intervals.icu entro 0,1", () => {
  const { giorni, attivita } = serieNota();
  const serie = serieCarico(giorni, attivita, "2026-01-01");
  assert.equal(serie.length, giorni.length);
  for (const r of serie) {
    assert.ok(vicino(r.fitness, r.ctl, 0.1), `${r.d} Fitness ${r.fitness} contro ${r.ctl}`);
    assert.ok(vicino(r.fatica, r.atl, 0.1), `${r.d} Fatica ${r.fatica} contro ${r.atl}`);
  }
  // la prova di coincidenza passa su tutti i giorni con le uscite
  const prova = provaCoincidenza(giorni, attivita);
  assert.equal(prova.passa, true);
  assert.equal(prova.giorni, attivita.length);
});

test("la serie parte dai valori di intervals.icu del primo giorno, altrimenti da zero", () => {
  const { giorni, attivita } = serieNota(30);
  const serie = serieCarico(giorni, attivita);
  assert.deepEqual([serie[0].fitness, serie[0].fatica, serie[0].faticaLenta], [35, 40, 40]);
  // da zero, con il carico del primo giorno, 30 punti
  const senzaPartenza = serieCarico(giorni.map((g) => ({ ...g, ctl: null, atl: null })), attivita);
  assert.ok(vicino(senzaPartenza[0].fitness, 30 * (1 - Math.exp(-1 / 42)), 1e-9), `Fitness ${senzaPartenza[0].fitness}`);
  assert.ok(vicino(senzaPartenza[0].fatica, 30 * (1 - Math.exp(-1 / 7)), 1e-9));
  assert.ok(senzaPartenza[29].fitness < serie[29].fitness);
  // con una partenza più tardi si comincia da quel giorno
  const dopo = serieCarico(giorni, attivita, "2026-01-10");
  assert.equal(dopo[0].d, "2026-01-10");
  assert.ok(vicino(dopo[0].fitness, giorni[9].ctl, 1e-9));
});

test("la Fatica lenta a 10 giorni scende più piano della Fatica", () => {
  const giorni = [normalizzaGiorno({ id: "2026-06-01", ctl: 0, atl: 0 })];
  for (let k = 1; k < 15; k++) giorni.push(normalizzaGiorno({ id: piuGiorni("2026-06-01", k) }));
  const giornata = pulita(giro("f1", "2026-06-02T08:00:00", { moving_time: 5 * 3600, icu_training_load: 300, device_watts: true }));
  const serie = serieCarico(giorni, [giornata]);
  const dopo = serie[serie.length - 1];
  assert.ok(vicino(serie[1].fatica, 300 * (1 - Math.exp(-1 / 7)), 1e-9));
  assert.ok(vicino(serie[1].faticaLenta, 300 * (1 - Math.exp(-1 / 10)), 1e-9));
  assert.ok(dopo.faticaLenta > dopo.fatica, `lenta ${dopo.faticaLenta} contro ${dopo.fatica}`);
});

test("la forma a passi si sceglie con un parametro, e non è quella di intervals.icu", () => {
  const { giorni, attivita } = serieNota();
  const passi = serieCarico(giorni, attivita, null, { forma: "passi" });
  const esponenziale = serieCarico(giorni, attivita);
  const scarto = Math.max(...passi.map((r, i) => Math.abs(r.fitness - esponenziale[i].fitness)));
  assert.ok(scarto > 0.01, `scarto ${scarto}`);
  assert.ok(vicino(passi[1].fitness, 35 + (giorni[1].carico - 35) / 42, 1e-9));
});

test("la riga della differenza solo oltre il 10% e oltre 3 punti", () => {
  assert.equal(differenzaFitness(44, 40), null);           // 4 punti, ma solo il 10%
  assert.equal(differenzaFitness(33, 30), null);           // 10%, ma solo 3 punti
  assert.equal(differenzaFitness(60, 57), null);
  const sopra = differenzaFitness(44.5, 40);
  assert.equal(sopra.testo, TESTI_DATI.fitnessPiuBassaSuIntervals);
  assert.ok(vicino(sopra.scarto, 4.5, 1e-9));
  assert.equal(differenzaFitness(30, 40).testo, TESTI_DATI.fitnessPiuAltaSuIntervals);
  assert.equal(differenzaFitness(null, 40), null);
});

test("registrazioni, la serie e la prova di coincidenza con stub, doppioni e palestra", () => {
  const giorni = registrazione("benessere").map(normalizzaGiorno);
  const attivita = preparaAttivita(registrazione("attivita"), giorni, { oggi: "2026-10-31" });
  const serie = serieCarico(giorni, attivita);
  assert.equal(serie.length, 42);
  assert.equal(serie[0].d, "2026-09-20");
  const prova = provaCoincidenza(giorni, attivita);
  assert.equal(prova.passa, true);
  assert.ok(prova.giorni >= 8, `giorni ${prova.giorni}`);
  // il giorno del doppione intervals.icu conta tutte e due le copie, Come sto una
  const doppione = serie.find((r) => r.d === "2026-10-18");
  assert.equal(doppione.carico, 210);
  assert.ok(doppione.fitness < doppione.ctl);
  // lo stub da Strava porta il suo carico nascosto, la palestra solo nella Fatica
  assert.equal(serie.find((r) => r.d === "2026-10-24").carico, 120);
  const palestra = serie.find((r) => r.d === "2026-10-29");
  assert.deepEqual([palestra.carico, palestra.caricoFitness], [70, 0]);
});

// --- Il controllo incrociato ---

test("il controllo incrociato oltre il 40%, e la soglia bassa con un'uscita «Facile» a 75 punti all'ora", () => {
  // 2 ore a sforzo 5 valgono 120 dallo sforzo, contro 70 dal battito, il 71% in più
  const incerta = pulita(giro("x1", "2026-05-16T08:00:00", { moving_time: 7200, icu_training_load: 70, has_heartrate: true, icu_rpe: 5 }));
  assert.deepEqual(controlloIncrociato(incerta).map((a) => a.tipo), ["incerti"]);
  assert.equal(controlloIncrociato(incerta)[0].testo, TESTI_DATI.numeriIncerti);
  // entro il 40% niente
  const giusta = pulita(giro("x2", "2026-05-16T08:00:00", { moving_time: 7200, icu_training_load: 100, has_heartrate: true, icu_rpe: 5 }));
  assert.deepEqual(controlloIncrociato(giusta), []);
  // «Facile» è sforzo 3, 2 ore a 75 punti all'ora dalla potenza
  const facile = pulita(giro("x3", "2026-05-17T08:00:00", { moving_time: 7200, icu_training_load: 150, device_watts: true, icu_rpe: 3 }));
  const avvisi = controlloIncrociato(facile);
  assert.ok(avvisi.some((a) => a.tipo === "soglia" && a.testo === TESTI_DATI.sogliaBassa));
  // con il battito, o con un'uscita «Dura», la soglia non si tocca
  assert.ok(!controlloIncrociato({ ...facile, fonteCarico: FONTI.battito }).some((a) => a.tipo === "soglia"));
  assert.ok(!controlloIncrociato({ ...facile, sforzo: 7 }).some((a) => a.tipo === "soglia"));
  // senza sforzo o senza sensore niente
  assert.deepEqual(controlloIncrociato(pulita(giro("x4", "2026-05-18T08:00:00", { icu_training_load: 150, device_watts: true }))), []);
  assert.deepEqual(controlloIncrociato(pulita(giro("x5", "2026-05-18T08:00:00"), { sforzo: 3 })), []);
});
