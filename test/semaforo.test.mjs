// Prove del calcolo. Si lanciano con:  node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  aggiungiGiorni, giorniTra, giornoSettimana, calendario, baseHrv, baseFc, costruisciModello,
  proiettaFitness, caricoNecessario, settimane, normalizzaUscite,
} from "../js/modello.js";
import { valuta, voceHrv, voceFc, voceSonno, voceCarico, zonaForma } from "../js/semaforo.js";
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
  const benessere = (opzioni.storico || storicoTranquillo()).slice();
  if (opzioni.ieri) {
    const ieri = benessere.find((w) => w.id === aggiungiGiorni(OGGI, -1));
    Object.assign(ieri, opzioni.ieri);
  }
  benessere.push({ id: OGGI, ...oggiCampi });
  return costruisciModello({ atleta: { firstname: "Prova" }, benessere, uscite: [] }, OGGI);
}

test("date: aggiunte e differenze attraversano il cambio dell'ora", () => {
  assert.equal(aggiungiGiorni("2026-10-24", 1), "2026-10-25");
  assert.equal(aggiungiGiorni("2026-10-25", 1), "2026-10-26");
  assert.equal(aggiungiGiorni("2026-03-01", -1), "2026-02-28");
  assert.equal(giorniTra("2026-10-01", "2026-10-31"), 30);
  assert.equal(giornoSettimana("2026-11-02"), 0); // lunedì
  assert.equal(giornoSettimana("2026-11-01"), 6); // domenica
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

test("calendario: un giorno per riga, anche quelli vuoti, con la Forma", () => {
  const cal = calendario([{ id: OGGI, ctl: 40, atl: 50 }], OGGI, 10);
  assert.equal(cal.length, 10);
  assert.equal(cal[9].d, OGGI);
  assert.equal(cal[9].forma, -10);
  assert.equal(cal[9].formaPct, -0.25);
  assert.equal(cal[0].ctl, null);
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

test("il battito solito è la mediana delle ultime 30 notti", () => {
  const cal = calendario(storicoTranquillo(), OGGI, 61);
  const b = baseFc(cal, cal.length - 1);
  assert.ok(b.ok);
  assert.equal(b.solito, 48);
});

test("tutto in ordine: verde", () => {
  const e = valuta(modello({ hrv: 51, restingHR: 48, sleepSecs: 27000, ctl: 40, atl: 40 }));
  assert.equal(e.livello, "verde");
  assert.equal(e.colore, "verde");
});

test("HRV appena sotto il normale: giallo leggero", () => {
  const m = modello({ hrv: 46.5, restingHR: 48, sleepSecs: 27000 });
  assert.equal(voceHrv(m).colore, "giallo");
  assert.equal(valuta(m).livello, "giallo-leggero");
});

test("HRV crollato: voce rossa", () => {
  const m = modello({ hrv: 35, restingHR: 48, sleepSecs: 27000 });
  assert.equal(voceHrv(m).colore, "rosso");
  assert.equal(valuta(m).livello, "giallo"); // un rosso da solo fa giallo
});

test("HRV basso più battito alto: rosso", () => {
  const m = modello({ hrv: 35, restingHR: 52, sleepSecs: 27000 });
  assert.equal(voceFc(m).colore, "giallo");
  assert.equal(valuta(m).livello, "rosso");
});

test("battito: +3 giallo, +5 rosso", () => {
  assert.equal(voceFc(modello({ restingHR: 51 })).colore, "giallo");
  assert.equal(voceFc(modello({ restingHR: 53 })).colore, "rosso");
  assert.equal(voceFc(modello({ restingHR: 49 })).colore, "verde");
});

test("sonno: sotto 6h30 giallo, sotto 5h30 rosso, punteggio basso conta", () => {
  assert.equal(voceSonno(modello({ sleepSecs: 6 * 3600 })).colore, "giallo");
  assert.equal(voceSonno(modello({ sleepSecs: 5 * 3600 })).colore, "rosso");
  assert.equal(voceSonno(modello({ sleepSecs: 8 * 3600, sleepScore: 65 })).colore, "giallo");
  assert.equal(voceSonno(modello({ sleepSecs: 8 * 3600, sleepScore: 82 })).colore, "verde");
});

test("carico: si guarda la Fitness di ieri, non quella col giro di oggi", () => {
  // Ieri Fitness 40 e Fatica 42; oggi un giro enorme porta la Fatica a 70.
  const m = modello({ hrv: 50, restingHR: 48, sleepSecs: 27000, ctl: 41, atl: 70 }, { ieri: { ctl: 40, atl: 42 } });
  assert.equal(m.mattino.atl, 42);
  assert.equal(voceCarico(m).colore, "verde");
});

test("carico: oltre 1,3 volte giallo, oltre 1,5 rosso, base piccola non vota", () => {
  assert.equal(voceCarico(modello({}, { ieri: { ctl: 40, atl: 56 } })).colore, "giallo");
  assert.equal(voceCarico(modello({}, { ieri: { ctl: 40, atl: 64 } })).colore, "rosso");
  assert.equal(voceCarico(modello({}, { ieri: { ctl: 10, atl: 30 } })).colore, "neutro");
});

test("senza orologio decidono allenamento e sensazioni, con una nota", () => {
  const storico = storicoTranquillo().map((w) => ({ id: w.id, ctl: 40, atl: 40, atlLoad: 40 }));
  const m = modello({ fatigue: 2, soreness: 2 }, { storico });
  const e = valuta(m);
  assert.equal(e.livello, "verde");
  assert.ok(e.notaDati);
  assert.equal(e.voci.find((v) => v.chiave === "hrv").colore, "neutro");
});

test("nessun dato: nessun consiglio", () => {
  const m = costruisciModello({ atleta: {}, benessere: [], uscite: [] }, OGGI);
  assert.equal(valuta(m).livello, "nessuno");
});

test("ti senti benissimo ma il corpo frena: nota di disaccordo", () => {
  const m = modello({ hrv: 35, restingHR: 52, sleepSecs: 27000, fatigue: 1, soreness: 1 });
  const e = valuta(m);
  assert.equal(e.livello, "rosso");
  assert.ok(e.nota && e.nota.includes("Tu ti senti bene"));
});

test("un fastidio segnato ieri vale ancora oggi", () => {
  const m = modello({ hrv: 51, restingHR: 48, sleepSecs: 27000 }, { ieri: { injury: 2 } });
  const e = valuta(m);
  assert.equal(e.voci.find((v) => v.chiave === "acciacchi").colore, "giallo");
  assert.equal(e.livello, "giallo-leggero");
});

test("più notti di fila sotto il normale accendono il giallo anche con un valore nella fascia", () => {
  const storico = storicoTranquillo();
  for (let k = 1; k <= 5; k++) storico[storico.length - k].hrv = 42;
  const m = modello({ hrv: 48, restingHR: 48, sleepSecs: 27000 }, { storico });
  assert.equal(voceHrv(m).colore, "giallo");
});

test("fasce della Forma", () => {
  assert.equal(zonaForma(0.25).nome, "Molto riposato");
  assert.equal(zonaForma(0.1).nome, "Fresco");
  assert.equal(zonaForma(0).nome, "In equilibrio");
  assert.equal(zonaForma(-0.2).nome, "Ti stai allenando");
  assert.equal(zonaForma(-0.4).nome, "Molto carico");
  assert.equal(zonaForma(-0.6).nome, "Troppo carico");
  assert.equal(zonaForma(null), null);
});

test("proiezione della Fitness: stessa formula di intervals.icu", () => {
  const f = proiettaFitness(32, 500, 28);
  assert.ok(f > 50 && f < 52, `f ${f}`);
  const settimanale = caricoNecessario(32, 60, 56);
  assert.ok(Math.abs(proiettaFitness(32, settimanale, 56) - 60) < 0.01);
  assert.equal(caricoNecessario(32, 60, 0), null);
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
