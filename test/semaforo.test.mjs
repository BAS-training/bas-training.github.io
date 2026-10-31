// Prove del calcolo. Si lanciano con  node --test test/semaforo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  aggiungiGiorni, giorniTra, giornoSettimana, calendario, baseHrv, baseFc, costruisciModello,
  proiettaFitness, fitnessAllaPartenza, salitaSettimanale, caricoSettimanaPer, puntiPerOra,
  settimane, normalizzaUscite, oggiNelFuso,
} from "../js/modello.js";
import { valuta, voceHrv, voceFc, voceSonno, voceCarico, zonaFreschezza, LIVELLI } from "../js/semaforo.js";
import { numero, segno, durata } from "../js/formato.js";
import { generaDemo } from "../js/demo.js";

const OGGI = "2026-10-31";

// 60 notti tranquille: HRV attorno a 50, battito 48, sonno 7h30, Fitness 40 stabile.
function storicoTranquillo(oggi = OGGI, giorni = 60) {
  const lista = [];
  for (let i = giorni; i >= 1; i--) {
    const d = aggiungiGiorni(oggi, -i);
    const onda = Math.sin(i) * 5;
    lista.push({ id: d, hrv: 50 + onda, restingHR: 48 + (i % 3) - 1, sleepSecs: 27000, ctl: 40, atl: 40, atlLoad: 40 });
  }
  return lista;
}

function modello(oggiCampi, opzioni = {}) {
  const benessere = (opzioni.storico || storicoTranquillo()).map((w) => ({ ...w }));
  if (opzioni.ieri) {
    const ieri = benessere.find((w) => w.id === aggiungiGiorni(OGGI, -1));
    Object.assign(ieri, opzioni.ieri);
  }
  benessere.push({ id: OGGI, ...oggiCampi });
  return costruisciModello({ atleta: { firstname: "Prova" }, benessere, uscite: opzioni.uscite || [] }, OGGI);
}

const NOTTE_BUONA = { hrv: 51, restingHR: 48, sleepSecs: 27000 };

test("date: aggiunte e differenze attraversano il cambio dell'ora", () => {
  assert.equal(aggiungiGiorni("2026-10-24", 1), "2026-10-25");
  assert.equal(aggiungiGiorni("2026-10-25", 1), "2026-10-26");
  assert.equal(aggiungiGiorni("2026-03-01", -1), "2026-02-28");
  assert.equal(giorniTra("2026-10-01", "2026-10-31"), 30);
  assert.equal(giornoSettimana("2026-11-02"), 0); // lunedì
  assert.equal(giornoSettimana("2026-11-01"), 6); // domenica
});

test("oggi nel fuso dell'atleta", () => {
  const mezzanotteItaliana = new Date(Date.UTC(2026, 9, 31, 23, 30)); // 00:30 del 1/11 a Roma
  assert.equal(oggiNelFuso("Europe/Rome", mezzanotteItaliana), "2026-11-01");
  assert.equal(oggiNelFuso("America/New_York", mezzanotteItaliana), "2026-10-31");
  assert.match(oggiNelFuso("Fuso/Inventato", mezzanotteItaliana), /^\d{4}-\d{2}-\d{2}$/);
});

test("formati italiani", () => {
  assert.equal(numero(1234.6), "1235"); // in italiano il punto delle migliaia parte da 10.000
  assert.equal(numero(12345), "12.345");
  assert.equal(numero(1.35, 1), "1,4");
  assert.equal(segno(-3.2), "−3");
  assert.equal(segno(12), "+12");
  assert.equal(segno(0), "0");
  assert.equal(durata(5430), "1h31");
  assert.equal(durata(2400), "40 min");
  assert.equal(numero(null), "—");
});

test("calendario: un giorno per riga, anche quelli vuoti, con la Freschezza", () => {
  const cal = calendario([{ id: OGGI, ctl: 40, atl: 50 }], OGGI, 10);
  assert.equal(cal.length, 10);
  assert.equal(cal[9].d, OGGI);
  assert.equal(cal[9].forma, -10);
  assert.equal(cal[9].formaPct, -0.25);
  assert.equal(cal[0].ctl, null);
});

test("l'HRV di Apple (SDNN) vale come HRV", () => {
  const cal = calendario([{ id: OGGI, hrvSDNN: 62 }], OGGI, 2);
  assert.equal(cal[1].hrv, 62);
});

test("il normale di HRV esclude oggi e chiede almeno 14 notti", () => {
  const cal = calendario(storicoTranquillo().concat([{ id: OGGI, hrv: 10 }]), OGGI, 61);
  const b = baseHrv(cal, cal.length - 1);
  assert.ok(b.ok);
  assert.ok(b.basso > 44 && b.basso < 49, `basso ${b.basso}`);
  assert.ok(b.alto > 51 && b.alto < 57, `alto ${b.alto}`);
  const poche = calendario(storicoTranquillo(OGGI, 10), OGGI, 11);
  assert.equal(baseHrv(poche, poche.length - 1).ok, false);
});

test("il battito normale è la mediana delle ultime 30 notti", () => {
  const cal = calendario(storicoTranquillo(), OGGI, 61);
  const b = baseFc(cal, cal.length - 1);
  assert.ok(b.ok);
  assert.equal(b.solito, 48);
});

test("tutto in ordine: verde", () => {
  const e = valuta(modello({ ...NOTTE_BUONA, ctl: 40, atl: 40 }));
  assert.equal(e.livello, "verde");
  assert.equal(e.consiglio, LIVELLI.verde.consiglio);
});

test("HRV appena sotto il normale: giallo leggero", () => {
  const m = modello({ ...NOTTE_BUONA, hrv: 46.5 });
  assert.equal(voceHrv(m).colore, "giallo");
  assert.equal(valuta(m).livello, "giallo-leggero");
});

test("HRV crollato: voce rossa, da sola fa giallo", () => {
  const m = modello({ ...NOTTE_BUONA, hrv: 35 });
  assert.equal(voceHrv(m).colore, "rosso");
  assert.equal(valuta(m).livello, "giallo");
});

test("HRV crollato e battito alto senza allenamento duro: rosso con l'avviso del malanno", () => {
  const e = valuta(modello({ ...NOTTE_BUONA, hrv: 35, restingHR: 52 }));
  assert.equal(e.livello, "rosso");
  assert.ok(e.nota && e.nota.includes("malanno"), e.nota);
});

test("battito: +3 giallo, +5 rosso", () => {
  assert.equal(voceFc(modello({ restingHR: 51 })).colore, "giallo");
  assert.equal(voceFc(modello({ restingHR: 53 })).colore, "rosso");
  assert.equal(voceFc(modello({ restingHR: 49 })).colore, "verde");
});

test("sonno: sotto 6 ore giallo, sotto 5 rosso, punteggio sotto 60 e 50, settimana corta", () => {
  assert.equal(voceSonno(modello({ sleepSecs: 5.9 * 3600 })).colore, "giallo");
  assert.equal(voceSonno(modello({ sleepSecs: 6.2 * 3600 })).colore, "verde");
  assert.equal(voceSonno(modello({ sleepSecs: 4.5 * 3600 })).colore, "rosso");
  assert.equal(voceSonno(modello({ sleepSecs: 8 * 3600, sleepScore: 55 })).colore, "giallo");
  assert.equal(voceSonno(modello({ sleepSecs: 8 * 3600, sleepScore: 45 })).colore, "rosso");
  assert.equal(voceSonno(modello({ sleepSecs: 8 * 3600, sleepScore: 66 })).colore, "verde");
  const storico = storicoTranquillo().map((w) => ({ ...w, sleepSecs: 6 * 3600 }));
  const corta = voceSonno(modello({ sleepSecs: 6.2 * 3600 }, { storico }));
  assert.equal(corta.colore, "giallo");
  assert.ok(corta.testo.includes("Questa settimana"), corta.testo);
});

test("carico: si guarda la Fitness di ieri, non quella col giro di oggi", () => {
  // Ieri Fitness 40 e Fatica 42; oggi un giro enorme porta la Fatica a 70.
  const m = modello({ ...NOTTE_BUONA, ctl: 41, atl: 70 }, { ieri: { ctl: 40, atl: 42 } });
  assert.equal(m.mattino.atl, 42);
  assert.equal(voceCarico(m).colore, "verde");
});

test("carico: servono il rapporto e una differenza vera in punti", () => {
  assert.equal(voceCarico(modello({}, { ieri: { ctl: 40, atl: 56 } })).colore, "giallo");
  assert.equal(voceCarico(modello({}, { ieri: { ctl: 40, atl: 64 } })).colore, "giallo");
  assert.equal(voceCarico(modello({}, { ieri: { ctl: 40, atl: 66 } })).colore, "rosso");
  assert.equal(voceCarico(modello({}, { ieri: { ctl: 10, atl: 20 } })).colore, "verde"); // un giro solo con poca base
  assert.equal(voceCarico(modello({}, { ieri: { ctl: 4, atl: 20 } })).colore, "neutro");
});

test("senza dati della notte: una voce sola e un consiglio che non promette sul recupero", () => {
  const storico = storicoTranquillo().map((w) => ({ id: w.id, ctl: 40, atl: 40, atlLoad: 40 }));
  const m = modello({ fatigue: 2, soreness: 2 }, { storico });
  const e = valuta(m);
  assert.ok(m.notteMaiArrivata);
  assert.equal(e.livello, "verde");
  assert.deepEqual(e.voci.map((v) => v.chiave), ["notte", "carico", "sensazioni"]);
  assert.ok(e.consiglio.startsWith("In allenamento sei in linea"), e.consiglio);
});

test("nessun dato: nessun consiglio", () => {
  const m = costruisciModello({ atleta: {}, benessere: [], uscite: [] }, OGGI);
  assert.equal(valuta(m).livello, "nessuno");
});

test("un dolore o un infortunio fermano sempre, anche con i numeri buoni", () => {
  const dolore = valuta(modello({ ...NOTTE_BUONA, injury: 3 }));
  assert.equal(dolore.livello, "rosso");
  assert.ok(dolore.consiglio.includes("dolore"), dolore.consiglio);
  const infortunio = valuta(modello({ ...NOTTE_BUONA, injury: 4 }));
  assert.equal(infortunio.livello, "rosso");
  assert.ok(infortunio.consiglio.includes("niente bici"), infortunio.consiglio);
});

test("a pezzi o gambe molto doloranti fermano sempre, con le parole delle risposte", () => {
  const gambe = valuta(modello({ ...NOTTE_BUONA, fatigue: 1, soreness: 4 }));
  assert.equal(gambe.livello, "rosso");
  assert.ok(gambe.voci.find((v) => v.chiave === "sensazioni").testo.includes("le gambe sono molto doloranti"));
  assert.equal(valuta(modello({ ...NOTTE_BUONA, fatigue: 4 })).livello, "rosso");
});

test("ti senti benissimo ma il corpo frena: nota di disaccordo", () => {
  const e = valuta(modello({ ...NOTTE_BUONA, hrv: 46.5, fatigue: 1, soreness: 1 }, { ieri: { ctl: 40, atl: 56 } }));
  assert.equal(e.livello, "giallo");
  assert.ok(e.nota && e.nota.includes("Tu ti senti bene"), e.nota);
});

test("numeri buoni ma ti senti stanco: una nota, senza cambiare il consiglio", () => {
  const e = valuta(modello({ ...NOTTE_BUONA, fatigue: 3 }));
  assert.equal(e.livello, "giallo-leggero");
  assert.ok(e.nota && e.nota.includes("Ascolta anche te stesso"), e.nota);
});

test("un fastidio segnato ieri vale ancora oggi", () => {
  const e = valuta(modello(NOTTE_BUONA, { ieri: { injury: 2 } }));
  assert.equal(e.voci.find((v) => v.chiave === "acciacchi").colore, "giallo");
  assert.equal(e.livello, "giallo-leggero");
});

test("più notti di fila sotto il normale accendono il giallo anche con un valore nella fascia", () => {
  const storico = storicoTranquillo();
  for (let k = 1; k <= 5; k++) storico[storico.length - k].hrv = 42;
  const m = modello({ ...NOTTE_BUONA, hrv: 48 }, { storico });
  assert.equal(voceHrv(m).colore, "giallo");
});

test("fasce della Freschezza", () => {
  assert.equal(zonaFreschezza(0.25).nome, "Molto riposato");
  assert.equal(zonaFreschezza(0.1).nome, "Fresco");
  assert.equal(zonaFreschezza(0).nome, "In equilibrio");
  assert.equal(zonaFreschezza(-0.2).nome, "Ti stai allenando");
  assert.equal(zonaFreschezza(-0.4).nome, "Molto carico");
  assert.equal(zonaFreschezza(-0.6).nome, "Troppo carico");
  assert.equal(zonaFreschezza(null), null);
});

test("Obiettivo: proiezione, scarico e salita settimanale", () => {
  const f = proiettaFitness(32, 500, 28);
  assert.ok(f > 50 && f < 52, `f ${f}`);
  // con lo scarico delle ultime due settimane si arriva un po' più in basso
  assert.ok(fitnessAllaPartenza(32, 500, 84) < proiettaFitness(32, 500, 84));
  const s = salitaSettimanale(32, 60, 84);
  assert.ok(s > 3 && s < 4.5, `salita ${s}`);
  assert.equal(salitaSettimanale(32, 60, 10), null);
  // il carico suggerito per la prossima settimana fa salire la Fitness proprio di quanto serve
  const carico = caricoSettimanaPer(32, 3);
  assert.ok(Math.abs(proiettaFitness(32, carico, 7) - 35) < 0.01);
});

test("punti per ora: dai giri della persona, altrimenti 40", () => {
  assert.equal(puntiPerOra([]), 40);
  const giri = normalizzaUscite([1, 2, 3].map((k) => ({
    id: k, start_date_local: `2026-10-2${k}T08:00:00`, type: "Ride", moving_time: 7200, icu_training_load: 110,
  })));
  assert.equal(puntiPerOra(giri), 55);
});

test("settimane: le uscite finiscono nella settimana giusta", () => {
  const u = normalizzaUscite([
    { id: 1, start_date_local: "2026-10-31T08:00:00", moving_time: 3600, icu_training_load: 50 },
    { id: 2, start_date_local: "2026-10-27T08:00:00", moving_time: 7200, icu_training_load: 100 },
    { id: 3, start_date_local: "2026-10-25T08:00:00", moving_time: 1800, icu_training_load: 20 },
  ]);
  const s = settimane(u, OGGI, 2);
  assert.equal(s[1].inizio, "2026-10-26");
  assert.equal(s[1].secondi, 10800);
  assert.equal(s[1].carico, 150);
  assert.equal(s[0].carico, 20);
});

test("i dati di esempio producono un modello completo e un consiglio", () => {
  const demo = generaDemo(OGGI);
  const m = costruisciModello(demo, OGGI);
  assert.ok(m.base.hrv.ok && m.base.fc.ok);
  assert.ok(m.notteArrivata);
  assert.ok(m.uscite.length > 30);
  const e = valuta(m);
  assert.notEqual(e.livello, "nessuno");
  assert.ok(m.mattino.ctl > 20, `ctl ${m.mattino.ctl}`);
});
