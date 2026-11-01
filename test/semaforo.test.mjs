// Prove del semaforo a punti (capitolo 4 e 9.5 della specifica) e del modello che lo nutre.
// Si lanciano con  node --test test/semaforo.test.mjs
// Le persone sono inventate (Lucia, Marco, Anna) e i numeri sono costruiti, non presi da nessuno.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  aggiungiGiorni, giorniTra, giornoSettimana, calendario, baseHrv, baseFc, costruisciModello, notteValida,
  proiettaFitness, fitnessAllaPartenza, salitaSettimanale, caricoSettimanaPer, puntiPerOra, settimane,
  normalizzaUscite, oggiNelFuso, decadimento, GIORNI_STORICO, GIORNI_USCITE,
} from "../js/modello.js";
import {
  valuta, valutaInViaggio, giorniDiGuardia, fiducia, stop, puntiHrv, puntiFc, puntiSonno, puntiDomande,
  puntiCarico, statoMalattia, eventoDiOggi, propostaViaggio, partenza, zonaFreschezza, usciteGrandi, LIVELLI,
} from "../js/semaforo.js";
import {
  VOCI, STOP, MEDICO, MESSAGGI, NOTE, PERCHE, CARICO_TRE_MATTINE, CONTROLLO, VIAGGIO, GUIDA_SEMAFORO, durataInParole,
} from "../js/testi.js";
import { numero, segno, durata } from "../js/formato.js";
import { generaDemo } from "../js/demo.js";

const OGGI = "2026-10-31";
const ORA = 3600;
const giorniFa = (n, da = OGGI) => aggiungiGiorni(da, -n);

// Due successioni a bassa discrepanza danno notti normali senza caso. La somma è triangolare e fitta
// attorno al centro, così la mediana resta quasi ferma anche con qualche notte strana.
const fraz = (x) => x - Math.floor(x);
const onda = (k) => fraz(k * 0.6180339887) + fraz(k * 0.7548776662) - 1;

// Lucia, una ciclista inventata. HRV attorno a 50, battito 47-49, sonno 7 ore e mezza, Fitness e
// Fatica a 40, 40 punti al giorno.
function notti(n = 90, da = OGGI, campi = () => ({})) {
  const lista = [];
  for (let k = n; k >= 1; k--) {
    lista.push({
      id: giorniFa(k, da),
      hrv: 50 * Math.exp(0.3 * onda(k)),
      restingHR: 47 + (k % 3),
      sleepSecs: 7.5 * ORA,
      ctl: 40,
      atl: 40,
      atlLoad: 40,
      ...campi(k),
    });
  }
  return lista;
}

// Un'ora facile ogni due giorni per 90 giorni, con il battito, così la fiducia del carico è media.
function giri(n = 90, da = OGGI, extra = []) {
  const lista = [];
  for (let k = n; k >= 1; k -= 2) {
    lista.push({ id: `g${k}`, start_date_local: `${giorniFa(k, da)}T08:00:00`, type: "Ride", moving_time: ORA, icu_training_load: 40, average_heartrate: 125 });
  }
  return lista.concat(extra);
}

function giro(giorni, ore, da = OGGI, tipo = "Ride") {
  return { id: `x${giorni}-${ore}`, start_date_local: `${giorniFa(giorni, da)}T07:30:00`, type: tipo, moving_time: Math.round(ore * ORA), icu_training_load: Math.round(45 * ore), average_heartrate: 130 };
}

// La scena di un mattino. modifica { giorni fa: campi } cambia le notti di prima.
function scena({ benessere = notti(), oggi = {}, modifica = {}, uscite = giri(), diario, storia, profilo, piano, data = OGGI } = {}) {
  const lista = benessere.map((w) => ({ ...w }));
  for (const [quanti, campi] of Object.entries(modifica)) {
    const d = giorniFa(Number(quanti), data);
    const w = lista.find((x) => x.id === d);
    if (w) Object.assign(w, campi);
    else lista.push({ id: d, ...campi });
  }
  lista.push({ id: data, hrv: 50, restingHR: 48, sleepSecs: 7.5 * ORA, ...oggi });
  return costruisciModello({ atleta: { firstname: "Lucia" }, benessere: lista, uscite, diario, storia, profilo, piano }, data);
}

// La stessa scena con l'HRV di stanotte a z DS dalla base che il semaforo usa davvero.
function conHrvZ(z, opzioni = {}, contesto = {}) {
  const b = valuta(scena(opzioni), contesto).basi.hrv;
  return scena({ ...opzioni, oggi: { ...(opzioni.oggi || {}), hrv: Math.exp(b.centro + z * b.ds) } });
}

// Le notti di 1..n giorni fa a z DS dalla base della scena senza modifiche.
function nottiA(z, quante, opzioni = {}) {
  const b = valuta(scena(opzioni), {}).basi.hrv;
  const modifica = { ...(opzioni.modifica || {}) };
  for (let k = 1; k <= quante; k++) modifica[k] = { ...(modifica[k] || {}), hrv: Math.exp(b.centro + z * b.ds) };
  return modifica;
}

const voceDi = (esito, chiave) => esito.voci.find((v) => v.chiave === chiave);

// Ogni stringa dentro un valore, anche in oggetti e liste.
function stringhe(valore, lista = []) {
  if (typeof valore === "string") lista.push(valore);
  else if (Array.isArray(valore)) for (const x of valore) stringhe(x, lista);
  else if (valore && typeof valore === "object") for (const x of Object.values(valore)) stringhe(x, lista);
  return lista;
}
// Le parole vietate scritte a pezzi, come chiede 9.8, così nemmeno questo file le contiene intere.
const VIETATE = new RegExp("\\b(ga" + "r[ae]" + "|presta" + "zion[ei]" + "|ra" + "c(e|es|ing)" + "|perfor" + "mance)\\b", "i");
function testiPuliti(esito) {
  const testi = stringhe({
    titolo: esito.titolo, consiglio: esito.consiglio, perche: esito.perche, nota: esito.nota,
    voci: esito.voci.map((v) => [v.nome, v.testo]), aggiunte: esito.aggiunte, medico: esito.medico,
    messaggi: esito.messaggi, tetti: esito.tetti, controllo: esito.controllo, fiducia: esito.fiducia.righe,
  });
  for (const t of testi) {
    assert.ok(!t.includes(":"), `due punti in «${t}»`);
    assert.ok(!VIETATE.test(t), `parola vietata in «${t}»`);
  }
}

// --- Le prove di oggi su date, fusi e formati, che valgono ancora ---

test("date: aggiunte e differenze attraversano il cambio dell'ora", () => {
  assert.equal(aggiungiGiorni("2026-10-24", 1), "2026-10-25");
  assert.equal(aggiungiGiorni("2026-10-25", 1), "2026-10-26");
  assert.equal(aggiungiGiorni("2026-03-01", -1), "2026-02-28");
  assert.equal(giorniTra("2026-10-01", "2026-10-31"), 30);
  assert.equal(giornoSettimana("2026-11-02"), 0); // lunedì
  assert.equal(giornoSettimana("2026-11-01"), 6); // domenica
});

test("oggi nel fuso dell'atleta", () => {
  const mezzanotteItaliana = new Date(Date.UTC(2026, 9, 31, 23, 30)); // mezzanotte e mezza del 1/11 a Roma
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

test("le durate in parole dei testi del semaforo", () => {
  assert.equal(durataInParole(45), "45 minuti");
  assert.equal(durataInParole(80), "1 ora e 20");
  assert.equal(durataInParole(210), "3 ore e mezza");
  assert.equal(durataInParole(250), "4 ore e 10");
  assert.equal(durataInParole(60), "1 ora");
  assert.equal(durataInParole(335), "5 ore e 40");
});

test("calendario: un giorno per riga, anche quelli vuoti, con la Freschezza", () => {
  const cal = calendario([{ id: OGGI, ctl: 40, atl: 50 }], OGGI, 10);
  assert.equal(cal.length, 10);
  assert.equal(cal[9].d, OGGI);
  assert.equal(cal[9].forma, -10);
  assert.equal(cal[9].formaPct, -0.25);
  assert.equal(cal[0].ctl, null);
});

test("finestre di 182 giorni per benessere e attività", () => {
  assert.equal(GIORNI_STORICO, 182);
  assert.equal(GIORNI_USCITE, 182);
  assert.equal(calendario([], OGGI).length, 182);
});

test("l'HRV di Apple (SDNN) vale come HRV", () => {
  const cal = calendario([{ id: OGGI, hrvSDNN: 62 }], OGGI, 2);
  assert.equal(cal[1].hrv, 62);
});

test("la Fatica lenta a 10 giorni, con la forma esponenziale, parte dalla Fatica di intervals.icu", () => {
  assert.equal(decadimento(42), Math.exp(-1 / 42));
  const k = Math.exp(-1 / 10);
  const benessere = [{ id: giorniFa(3), atl: 20, atlLoad: 0 }, { id: giorniFa(2), atlLoad: 100 }, { id: giorniFa(1), atlLoad: 0 }];
  const cal = calendario(benessere, OGGI, 4);
  assert.equal(cal[0].faticaLenta, 20);
  assert.ok(Math.abs(cal[1].faticaLenta - (20 * k + 100 * (1 - k))) < 1e-9);
  assert.ok(Math.abs(cal[2].faticaLenta - cal[1].faticaLenta * k) < 1e-9);
  // con un carico costante arriva a quel carico
  const piatto = calendario(notti(150).map((w) => ({ ...w, atl: null })), OGGI, 151);
  assert.ok(Math.abs(piatto[149].faticaLenta - 40) < 0.01, `${piatto[149].faticaLenta}`);
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

test("Obiettivo: proiezione, scarico e salita settimanale, con la forma esponenziale", () => {
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
  const lista = normalizzaUscite([1, 2, 3].map((k) => ({
    id: k, start_date_local: `2026-10-2${k}T08:00:00`, type: "Ride", moving_time: 7200, icu_training_load: 110,
  })));
  assert.equal(puntiPerOra(lista), 55);
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
  testiPuliti(e);
});

// --- 9.5, le basi ---

test("base HRV: con 13, 20 e 30 notti valide non vota, dà al massimo 1 punto, è piena", () => {
  const atteso = { 13: ["taratura", 0], 20: ["provvisoria", 1], 30: ["piena", 2] };
  for (const [quante, [stato, punti]] of Object.entries(atteso)) {
    const m = conHrvZ(-2.5, { benessere: notti(Number(quante)) });
    const hrv = puntiHrv(m);
    assert.equal(m.base.hrv.stato, stato, quante);
    assert.equal(hrv.punti, punti, quante);
  }
  assert.equal(puntiHrv(conHrvZ(-2.5, { benessere: notti(13) })).attiva, false);
});

test("base robusta: una notte con HRV 200 dentro 40 notti normali non sposta la base", () => {
  const normali = calendario(notti(40), OGGI, 41);
  const conStrana = calendario(notti(40, OGGI, (k) => (k === 20 ? { hrv: 200 } : {})).concat([]), OGGI, 41);
  const a = baseHrv(normali, 40);
  const b = baseHrv(conStrana, 40);
  assert.ok(Math.abs(a.centro - b.centro) < 0.02, `${a.centro} ${b.centro}`);
  assert.ok(Math.abs(b.ds / a.ds - 1) < 0.15, `${a.ds} ${b.ds}`);
  assert.ok(Math.abs(Math.exp(b.centro) - 50) < 2.5);
});

test("notte valida: con 3 ore e 50 di sonno non vale, l'HRV senza sonno vale", () => {
  assert.equal(notteValida({ hrv: 50, sonno: (3 * 60 + 50) * 60 }), false);
  assert.equal(notteValida({ hrv: 50, sonno: null }), true);
  assert.equal(notteValida({ hrv: 50, sonno: 4 * ORA }), true);
  assert.equal(notteValida({ hrv: null, sonno: 8 * ORA }), false);
  const corta = conHrvZ(-3, { oggi: { sleepSecs: (3 * 60 + 50) * 60 } });
  const hrv = puntiHrv(corta);
  assert.equal(hrv.punti, 0);
  assert.equal(hrv.testo, VOCI.hrv.corta);
});

test("DS minima: gli stessi dati danno 0,08 con l'orologio e 0,06 con l'anello", () => {
  const cal = calendario(notti(40, OGGI, () => ({ hrv: 50 })), OGGI, 41);
  assert.equal(baseHrv(cal, 40, "orologio").ds, 0.08);
  assert.equal(baseHrv(cal, 40, "anello").ds, 0.06);
  assert.equal(baseHrv(cal, 40).ds, 0.08); // «non so» vale come l'orologio
});

test("base del battito: da 7 notti provvisoria, da 14 piena, con la mediana e la DS robusta", () => {
  for (const [quante, stato] of [[6, "taratura"], [7, "provvisoria"], [14, "piena"]]) {
    const cal = calendario(notti(quante), OGGI, 30);
    assert.equal(baseFc(cal, 29).stato, stato, String(quante));
  }
  const b = baseFc(calendario(notti(), OGGI, 91), 90);
  assert.equal(b.centro, 48);
  assert.ok(Math.abs(b.ds - 1.4826) < 1e-9);
});

// --- 9.5, l'HRV ---

test("punti HRV: z7 a −0,6, notte a −1,2, notte a −2,1, z7 basso da 3 mattine e notte a −1,1", () => {
  const sola = puntiHrv(conHrvZ(-0.7, { modifica: nottiA(-0.75, 6) }));
  assert.ok(sola.lettura.z7 < -0.5 && sola.lettura.zNotte > -1, `${sola.lettura.z7} ${sola.lettura.zNotte}`);
  assert.equal(sola.punti, 1);

  const notte12 = puntiHrv(conHrvZ(-1.2));
  assert.ok(notte12.lettura.z7 > -0.5);
  assert.equal(notte12.punti, 1);

  assert.equal(puntiHrv(conHrvZ(-2.1)).punti, 2);

  const tre = puntiHrv(conHrvZ(-1.1, { modifica: nottiA(-1.0, 6) }));
  assert.ok(tre.lettura.treMattine, "z7 basso da 3 mattine");
  assert.ok(tre.lettura.zNotte < -1 && tre.lettura.zNotte > -2, `${tre.lettura.zNotte}`);
  assert.equal(tre.punti, 2);
  assert.equal(tre.piuNotti, true);
});

test("una notte sola: −1,8 dà Giallo leggero, −2,3 Giallo con la domanda di controllo, −3 mai Rosso", () => {
  const a = valuta(conHrvZ(-1.8));
  assert.equal(a.livello, "giallo-leggero");
  const b = valuta(conHrvZ(-2.3));
  assert.equal(b.livello, "giallo");
  assert.deepEqual(b.controllo.map((x) => x.chiave), ["malattia"]);
  assert.equal(b.controllo[0].domanda, CONTROLLO.malattia.domanda);
  const c = valuta(conHrvZ(-3));
  assert.equal(c.livello, "giallo");
  assert.equal(c.concordanza, false);
});

test("Rosso vero: media bassa da 3 mattine, notte sotto −1 ed energia «Poca»", () => {
  const e = valuta(conHrvZ(-1.3, { modifica: nottiA(-1.0, 6), oggi: { fatigue: 3 } }));
  assert.equal(voceDi(e, "hrv").punti, 2);
  assert.equal(e.livello, "rosso");
  assert.equal(e.consiglio, LIVELLI.rosso.consiglio);
});

test("senza concordanza: 4 punti tutti dalla notte di oggi danno Giallo, HRV e battito bassi con il carico basso la nota del malanno", () => {
  const a = valuta(conHrvZ(-2.5, { oggi: { sleepSecs: 4.5 * ORA } }));
  assert.equal(a.P, 4);
  assert.equal(a.concordanza, false);
  assert.equal(a.livello, "giallo");

  const b = valuta(conHrvZ(-2.5, { oggi: { restingHR: 54 } }));
  assert.equal(voceDi(b, "fc").punti, 2);
  assert.equal(voceDi(b, "carico").punti, 0);
  assert.equal(b.livello, "giallo");
  assert.equal(b.nota, NOTE.malanno);
});

test("con concordanza: lo stesso, ma ieri il battito era già alto, dà Rosso", () => {
  const e = valuta(conHrvZ(-2.5, { oggi: { restingHR: 54 }, modifica: { 1: { restingHR: 54 } } }));
  assert.equal(e.concordanza, true);
  assert.equal(e.livello, "rosso");
});

test("calo atteso: dopo un'uscita di 4 ore e mezza ieri una notte a −1,5 non dà punti", () => {
  const uscite = giri(90, OGGI, [giro(1, 4.5), giro(8, 3.5), giro(15, 3.5), giro(22, 3.5)]);
  const m = conHrvZ(-1.5, { uscite });
  const e = valuta(m);
  const hrv = voceDi(e, "hrv");
  assert.ok(hrv.lettura.calo && hrv.lettura.sospesaCalo);
  assert.equal(hrv.punti, 0);
  assert.equal(e.tetti.length, 0, "non è un'uscita grande");
  assert.equal(e.nota, NOTE.caloAtteso);
  // senza l'uscita lunga la stessa notte dà un punto
  assert.equal(puntiHrv(conHrvZ(-1.5)).punti, 1);
});

test("saturazione: con la mediana del battito a 50, HRV e battito giù di 1,2 DS non danno punti dall'HRV", () => {
  const benessere = notti(90, OGGI, (k) => ({ restingHR: 49 + (k % 3) }));
  const m = conHrvZ(-1.2, { benessere, oggi: { restingHR: 50 - 1.2 * 1.4826 - 0.01 } });
  const hrv = puntiHrv(m);
  assert.equal(m.base.fc.centro, 50);
  assert.ok(hrv.lettura.saturazione);
  assert.equal(hrv.punti, 0);
});

test("HRV alta: sopra il solito, con battito basso e gambe indolenzite, lettura insolita, da 57 anni", () => {
  const alta = conHrvZ(0.9, { modifica: nottiA(0.9, 6) });
  const a = valuta(alta);
  const hrvA = voceDi(a, "hrv");
  assert.ok(hrvA.lettura.z7 > 0.5);
  assert.equal(hrvA.punti, 0);
  assert.equal(hrvA.pallino, "grigio", "mai il verde come premio");
  assert.equal(hrvA.testo, VOCI.hrv.sopra);
  assert.equal(a.nota, NOTE.hrvAlta);

  const b = valuta(conHrvZ(0.9, { modifica: nottiA(0.9, 6), oggi: { restingHR: 45, soreness: 3 } }));
  assert.equal(voceDi(b, "hrv").punti, 1);

  const c = valuta(conHrvZ(2.3));
  assert.equal(voceDi(c, "hrv").punti, 0);
  assert.ok(voceDi(c, "hrv").lettura.insolita);
  assert.ok(c.messaggi.some((x) => x.chiave === "insolita"));

  const d = valuta(conHrvZ(1.2), { eta: 57 });
  assert.equal(voceDi(d, "hrv").punti, 1);
  assert.notEqual(d.livello, "verde");
  const conAritmia = valuta(conHrvZ(1.2), { aritmia: true });
  assert.equal(voceDi(conAritmia, "hrv").punti, 1);
  assert.equal(voceDi(valuta(conHrvZ(1.2)), "hrv").punti, 0);
});

// --- 9.5, battito e sonno ---

test("battito: +3 con z 2,5, +5, +3 per 2 notti, +7 con il naso che cola, la FC del sonno prima del battito a riposo", () => {
  const stretti = notti(90, OGGI, (k) => ({ restingHR: [47.2, 48, 48.8][k % 3] }));
  const tre = puntiFc(scena({ benessere: stretti, oggi: { restingHR: 51 } }));
  assert.ok(Math.abs(tre.lettura.z - 2.5) < 0.1, `${tre.lettura.z}`);
  assert.equal(tre.punti, 1);

  const cinque = valuta(scena({ oggi: { restingHR: 53 } }));
  assert.equal(voceDi(cinque, "fc").punti, 2);
  assert.ok(cinque.controllo.some((x) => x.chiave === "malattia"));

  const dueNotti = puntiFc(scena({ oggi: { restingHR: 51 }, modifica: { 1: { restingHR: 51 } } }));
  assert.equal(dueNotti.punti, 2);
  assert.equal(dueNotti.piuNotti, true);

  const naso = valuta(scena({ oggi: { restingHR: 55 }, diario: { [OGGI]: { stoMale: ["naso"] } } }));
  assert.equal(naso.stop, "malattia");
  assert.equal(naso.livello, "rosso");
  assert.equal(naso.consiglio, STOP.malattia);

  const sonno = notti(90, OGGI, () => ({ avgSleepingHR: 52, restingHR: 45 }));
  const m = scena({ benessere: sonno, oggi: { avgSleepingHR: 56, restingHR: 45 } });
  assert.equal(m.fonteFc, "sonno");
  const fc = puntiFc(m);
  assert.equal(fc.lettura.fc, 56);
  assert.equal(fc.punti, 1);
});

test("sonno: 5 ore e 40, 4 ore e 50, 5 ore e 50 dopo 5 ore e 45, 7 ore con punteggio 45, 5 ore e 50 con punteggio 45", () => {
  const ore = (h, m = 0) => (h * 60 + m) * 60;
  assert.equal(puntiSonno(scena({ oggi: { sleepSecs: ore(5, 40) } })).punti, 1);
  assert.equal(puntiSonno(scena({ oggi: { sleepSecs: ore(4, 50) } })).punti, 2);
  const due = puntiSonno(scena({ oggi: { sleepSecs: ore(5, 50) }, modifica: { 1: { sleepSecs: ore(5, 45) } } }));
  assert.equal(due.punti, 2);
  assert.equal(due.testo, VOCI.sonno.dueNotti);
  assert.equal(puntiSonno(scena({ oggi: { sleepSecs: ore(7), sleepScore: 45 } })).punti, 1);
  assert.equal(puntiSonno(scena({ oggi: { sleepSecs: ore(5, 50), sleepScore: 45 } })).punti, 1);
  assert.equal(puntiSonno(scena({ oggi: { sleepSecs: ore(7, 20) } })).testo, "Stanotte hai dormito 7 ore e 20.");
  // a chi ha dormito poco l'app consiglia prudenza in strada
  assert.ok(valuta(scena({ oggi: { sleepSecs: ore(5, 40) } })).aggiunte.includes(MESSAGGI.sonno));
});

// --- 9.5, le domande ---

test("domande: poca energia, a pezzi, gambe molto doloranti, la pedalata, il dolore, il fastidio di ieri", () => {
  const energia = (campi, diario) => puntiDomande(scena({ oggi: campi, diario }));
  assert.equal(energia({ fatigue: 3 })[0].punti, 1);
  assert.equal(stop(scena({ oggi: { fatigue: 4 } })), "pezzi");

  const gambe = valuta(scena({ oggi: { soreness: 4 } }));
  assert.equal(voceDi(gambe, "gambe").punti, 2);
  assert.ok(gambe.controllo.some((x) => x.chiave === "pedalata"));
  assert.equal(gambe.controllo[0].domanda, CONTROLLO.pedalata.domanda);
  assert.equal(stop(scena({ oggi: { soreness: 4 }, diario: { [OGGI]: { pedalata: "si" } } })), "dolore");

  assert.equal(stop(scena({ oggi: { injury: 3 } })), "dolore");
  const conNo = scena({ oggi: { injury: 3 }, diario: { [OGGI]: { pedalata: "no" } } });
  assert.equal(stop(conNo), null);
  assert.equal(puntiDomande(conNo)[2].punti, 2);

  const ieri = puntiDomande(scena({ modifica: { 1: { injury: 2 } } }))[2];
  assert.equal(ieri.punti, 1);
  assert.match(ieri.testo, /lo hai segnato ieri/i);
  const dueGiorni = puntiDomande(scena({ modifica: { 2: { injury: 2 } } }))[2];
  assert.equal(dueGiorni.punti, 0);
  assert.equal(dueGiorni.attiva, false);
});

test("un dolore e l'infortunio di ieri valgono ancora oggi senza risposta", () => {
  assert.equal(stop(scena({ modifica: { 1: { injury: 3 } } })), "dolore");
  assert.equal(stop(scena({ modifica: { 1: { injury: 4 } } })), "infortunio");
  // il no di ieri alla pedalata vale anche oggi
  const conNo = scena({ modifica: { 1: { injury: 3 } }, diario: { [giorniFa(1)]: { pedalata: "no" } } });
  assert.equal(stop(conNo), null);
});

// --- 9.5, Sto male, rientro e caselle ---

test("Sto male: la febbre ferma, il dolore al petto dà Rosso con il cuore e il 112, il naso solo dà almeno Giallo", () => {
  const febbre = valuta(scena({ diario: { [OGGI]: { stoMale: ["febbre"] } } }));
  assert.equal(febbre.stop, "malattia");
  assert.equal(febbre.livello, "rosso");

  const petto = valuta(scena({ diario: { [OGGI]: { stoMale: ["petto"] } } }));
  assert.equal(petto.stop, "cuore");
  assert.equal(petto.livello, "rosso");
  assert.equal(petto.consiglio, STOP.cuore);
  assert.match(petto.consiglio, /112/);
  assert.ok(petto.medico.some((x) => x.quando === "subito"));

  const naso = valuta(scena({ diario: { [OGGI]: { stoMale: ["naso"] } } }));
  assert.equal(naso.stop, null);
  assert.equal(naso.livello, "giallo");
  assert.ok(naso.aggiunte.includes("Se esci, al massimo un'ora facile, a ritmo da chiacchiera."));

  const ritmo = valuta(scena({ diario: { [OGGI]: { stoMale: ["avvisoRitmo"] } } }));
  assert.ok(ritmo.medico.some((x) => x.testo === MEDICO.primaDiRiprendere));
});

test("dopo lo stop per malattia, senza «Non ho più febbre» lo stop resta, fino a 14 giorni", () => {
  const ieri = valuta(scena({ diario: { [giorniFa(1)]: { stoMale: ["febbre"] } } }));
  assert.equal(ieri.stop, "malattia");
  assert.equal(ieri.registro.riportato, true);
  assert.equal(ieri.perche, PERCHE.stop.malattiaRiportata);
  const scaduto = valuta(scena({ diario: { [giorniFa(15)]: { stoMale: ["febbre"] } } }));
  assert.equal(scaduto.stop, null);
  // uno stop riportato e salvato nella storia non allunga la malattia
  const storia = {};
  for (let k = 1; k <= 13; k++) storia[giorniFa(k)] = { livello: "rosso", stop: "malattia", riportato: true };
  const s = statoMalattia({ [giorniFa(14)]: { stoMale: ["febbre"] } }, storia, OGGI);
  assert.equal(s.inCorso, true);
  assert.equal(statoMalattia({ [giorniFa(16)]: { stoMale: ["febbre"] } }, storia, OGGI).inCorso, false);
});

test("rientro: il secondo giorno dopo la febbre è Giallo, e con 9 giorni di malattia anche il sesto", () => {
  const breve = valuta(scena({ diario: { [giorniFa(3)]: { stoMale: ["febbre"] }, [giorniFa(1)]: { senzaFebbre: true } } }));
  assert.equal(breve.stop, null);
  assert.equal(breve.livello, "giallo");
  assert.ok(breve.tetti.some((t) => t.chiave === "rientro"));
  assert.equal(breve.perche, PERCHE.rientro(2, 4));

  const lunga = valuta(scena({ diario: { [giorniFa(14)]: { stoMale: ["febbre"] }, [giorniFa(5)]: { senzaFebbre: true } } }));
  assert.equal(lunga.livello, "giallo");
  assert.ok(lunga.medico.some((x) => x.testo === MEDICO.primaDiRiprendere));

  const finito = valuta(scena({ diario: { [giorniFa(8)]: { stoMale: ["febbre"] }, [giorniFa(5)]: { senzaFebbre: true } } }));
  assert.equal(finito.livello, "verde");
});

test("caselle: con l'alcol un'HRV a −2,5 dà 1 punto e la notte esce dalla base", () => {
  const diario = { [OGGI]: { cause: ["alcol"] } };
  const m = conHrvZ(-2.5, { diario });
  const e = valuta(m);
  assert.equal(voceDi(e, "hrv").punti, 1);
  assert.equal(e.registro.notteEsclusa, true);
  // il giorno dopo la notte con l'alcol non entra nella base
  const domani = aggiungiGiorni(OGGI, 1);
  const lista = m.giorni.filter((g) => g.hrv).map((g) => ({ id: g.d, hrv: g.hrv, restingHR: g.fcRiposo, sleepSecs: g.sonno, ctl: 40, atl: 40, atlLoad: 40 }));
  lista.push({ id: domani, hrv: 50, restingHR: 48, sleepSecs: 7.5 * ORA });
  const conDiario = costruisciModello({ benessere: lista, uscite: giri(), diario }, domani);
  const senzaDiario = costruisciModello({ benessere: lista, uscite: giri() }, domani);
  assert.equal(valuta(conDiario).basi.hrv.n, valuta(senzaDiario).basi.hrv.n - 1);
});

test("sensazioni ottime: con un punto dalla sola HRV Verde, con un punto dal carico Giallo leggero", () => {
  const ottime = { fatigue: 1, soreness: 1, injury: 1 };
  const notte = valuta(conHrvZ(-1.5, { oggi: ottime }));
  assert.equal(voceDi(notte, "hrv").punti, 1);
  assert.equal(notte.livello, "verde");

  const carico = valuta(scena({ oggi: ottime, modifica: { 1: { ctl: 40, atl: 57 } } }));
  assert.equal(voceDi(carico, "carico").punti, 1);
  assert.equal(carico.livello, "giallo-leggero");
});

// --- 9.5, il carico ---

test("carico: 1,35 e 18, 1,6 e 30 da solo, per 3 mattine, da 52 anni, con la Fitness a 4, con la fiducia bassa", () => {
  assert.equal(puntiCarico(scena({ modifica: { 1: { ctl: 52, atl: 70.2 } } })).punti, 1);

  const solo = valuta(scena({ modifica: { 1: { ctl: 50, atl: 80 } } }));
  assert.equal(voceDi(solo, "carico").punti, 2);
  assert.equal(solo.livello, "giallo");

  const tre = valuta(scena({ modifica: { 1: { ctl: 50, atl: 80 }, 2: { ctl: 50, atl: 80 }, 3: { ctl: 50, atl: 80 } } }));
  assert.equal(tre.livello, "rosso");
  assert.equal(tre.consiglio, CARICO_TRE_MATTINE);

  assert.equal(puntiCarico(scena({ modifica: { 1: { ctl: 4, atl: 20 } } })).attiva, false);

  const basso = scena({ modifica: { 1: { ctl: 50, atl: 80 }, 2: { ctl: 50, atl: 80 }, 3: { ctl: 50, atl: 80 } }, profilo: { fasciaCardio: "no" } });
  assert.equal(fiducia(basso, basso.profilo).carico, "bassa");
  assert.equal(puntiCarico(basso).punti, 1);
  assert.notEqual(valuta(basso).livello, "rosso");
});

test("carico da 52 anni: il rapporto usa la Fatica lenta a 10 giorni", () => {
  const benessere = notti(90, OGGI, (k) => ({ atlLoad: k <= 3 ? 150 : 40, atl: k <= 3 ? 50 : 40, ctl: 40 }));
  const m = scena({ benessere });
  const giovane = puntiCarico(m, { eta: 45 });
  const anziano = puntiCarico(m, { eta: 52 });
  assert.equal(giovane.lettura.lenta, false);
  assert.equal(giovane.lettura.A, 50);
  assert.equal(anziano.lettura.lenta, true);
  assert.ok(Math.abs(anziano.lettura.A - m.giorni[m.giorni.length - 2].faticaLenta) < 1e-9);
  assert.equal(giovane.punti, 0);
  assert.equal(anziano.punti, 2);
  assert.equal(puntiCarico(m, { fasciaEta: "50-54" }).lettura.lenta, true);
});

test("carico molto alto per 3 mattine dentro i giorni di guardia non dà Rosso, e il conto riparte dopo", () => {
  const alto = { ctl: 50, atl: 80 };
  const evento = (giorni) => Object.fromEntries(giorni.map((k, j) => [giorniFa(k), { livello: "verde", evento: { tipo: "evento", giorno: j + 1, giorni: 3 } }]));
  const dentro = valuta(scena({ modifica: { 1: alto, 2: alto, 3: alto }, storia: evento([6, 5, 4]) }));
  assert.equal(dentro.livello, "giallo");
  assert.ok(dentro.tetti.some((t) => t.chiave === "guardia"));
  // il primo mattino dopo la guardia conta 1, non 3
  const dopo = valuta(scena({ modifica: { 1: alto, 2: alto, 3: alto }, storia: evento([10, 9, 8]) }));
  assert.equal(dopo.tetti.length, 0);
  assert.notEqual(dopo.livello, "rosso");
  // tre mattine dopo la guardia il conto arriva a 3
  const data = aggiungiGiorni(OGGI, 2);
  const tardi = valuta(scena({ data, benessere: notti(90, data), uscite: giri(90, data), modifica: { 1: alto, 2: alto, 3: alto }, storia: evento([12, 11, 10]) }));
  assert.equal(tardi.livello, "rosso");
});

// --- 9.5, i tetti ---

test("tetti: dopo un weekend, con uno stop, a 5 giorni dalla partenza, 6 e 8 giorni dopo un evento di 3 giorni", () => {
  const weekend = { [giorniFa(1)]: { livello: "verde", evento: { tipo: "weekend", giorno: 2 } } };
  const dopoWeekend = valuta(scena({ storia: weekend }));
  assert.equal(dopoWeekend.livello, "giallo");
  assert.equal(dopoWeekend.consiglio, "Ieri hai finito il weekend lungo. Oggi riposo o 30-45 minuti di recupero. Il semaforo oggi non va oltre il giallo. È stanchezza voluta.");
  assert.equal(dopoWeekend.perche, "Dopo il weekend lungo è normale che le notti siano un po' storte. Oggi il piano è leggero.");
  assert.equal(voceDi(dopoWeekend, "hrv").pallino, "grigio", "nelle 72 ore HRV e battito non contano");

  assert.equal(valuta(scena({ storia: weekend, oggi: { injury: 4 } })).livello, "rosso");

  const partenza5 = valuta(scena({ oggi: { fatigue: 3 } }), { giorniPartenza: 5 });
  assert.equal(partenza5.livello, "giallo");
  assert.equal(partenza5.perche, "Mancano 5 giorni. Adesso conta arrivare riposato.");
  assert.ok(partenza5.aggiunte.includes(MESSAGGI.ultimiGiorni));
  assert.equal(valuta(scena(), { giorniPartenza: 5 }).livello, "verde", "il verde resta verde");

  const evento = (fine) => Object.fromEntries([fine + 2, fine + 1, fine].map((k, j) => [giorniFa(k), { livello: "verde", evento: { tipo: "evento", giorno: j + 1, giorni: 3 } }]));
  assert.equal(valuta(scena({ storia: evento(6) })).livello, "giallo");
  assert.equal(valuta(scena({ storia: evento(8) })).livello, "verde");
});

test("tetti: crescita rapida al massimo Giallo leggero, e il Rosso resta possibile", () => {
  assert.equal(valuta(scena(), { crescita: true }).livello, "giallo-leggero");
  const weekend = { [giorniFa(1)]: { livello: "verde", evento: { tipo: "weekend", giorno: 2 } } };
  const conFebbre = valuta(scena({ storia: weekend, diario: { [OGGI]: { stoMale: ["febbre"] } } }));
  assert.equal(conFebbre.livello, "rosso");
});

test("giorni di guardia: un'uscita grande, i giorni, il testo e le esclusioni", () => {
  const uscite = normalizzaUscite([giro(1, 5.2), giro(9, 2), giro(16, 2)]);
  const g = giorniDiGuardia({}, null, uscite, OGGI);
  assert.equal(g.attiva, true);
  assert.equal(g.tipo, "uscitaGrande");
  assert.equal(g.giorno, 1);
  assert.equal(g.giorni, 2);
  assert.equal(g.tetto, "giallo");
  assert.equal(g.senzaPuntiNotte, true);
  assert.equal(g.testo, "Ieri hai finito l'uscita lunga. Oggi riposo o 30-45 minuti di recupero. Il semaforo oggi non va oltre il giallo. È stanchezza voluta.");
  assert.deepEqual(g.esclusioni.notti, [OGGI]);
  // il secondo giorno dopo è facile, da 50 anni ancora riposo
  const secondo = giorniDiGuardia({}, null, normalizzaUscite([giro(2, 5.2)]), OGGI);
  assert.equal(secondo.giorno, 2);
  assert.match(secondo.testo, /Oggi un giro facile/);
  assert.match(giorniDiGuardia({}, null, normalizzaUscite([giro(2, 5.2)]), OGGI, { eta: 52 }).testo, /ancora riposo/);
  // 1,5 volte la più lunga delle 4 settimane prima, e almeno 3 ore
  assert.deepEqual(usciteGrandi(normalizzaUscite([giro(1, 3.5), giro(10, 2)]), OGGI), [giorniFa(1)]);
  assert.deepEqual(usciteGrandi(normalizzaUscite([giro(1, 3.5), giro(10, 3), giro(20, 2.5)]), OGGI), []);
  // senza giri nelle 4 settimane prima, 3 ore bastano
  assert.deepEqual(usciteGrandi(normalizzaUscite([giro(1, 3)]), OGGI), [giorniFa(1)]);
  // un blocco di 3 giorni del piano, il tetto dura 3 giorni
  const piano = { fatiche: [{ tipo: "blocco", inizio: giorniFa(5), fine: giorniFa(3) }] };
  assert.equal(giorniDiGuardia({}, piano, [], OGGI).giorni, 3);
  assert.equal(giorniDiGuardia({}, piano, [], OGGI).attiva, true);
  // un viaggio di 12 giorni, 14 giorni di guardia
  const lungo = {};
  for (let k = 20; k >= 9; k--) lungo[giorniFa(k)] = { evento: { tipo: "viaggio", giorno: 21 - k } };
  const g12 = giorniDiGuardia(lungo, null, [], OGGI);
  assert.equal(g12.giorni, 14);
  assert.equal(g12.giorno, 9);
  assert.match(g12.testo, /9 giorni fa hai finito il viaggio/);
});

// --- 9.5, la modalità evento ---

test("modalità evento: HRV e battito non contano, il sonno vero, il collo, il vomito, il gonfiore", () => {
  const evento = { tipo: "evento", giorno: 3, giorni: 4 };
  const numeri = valuta(conHrvZ(-3, { oggi: { restingHR: 56 } }), { evento });
  assert.equal(numeri.livello, "verde");
  assert.equal(numeri.consiglio, VIAGGIO.esiti.verde);
  assert.equal(voceDi(numeri, "hrv").testo, VOCI.viaggio);

  const ore = (h, m) => (h * 60 + m) * 60;
  const due = valuta(scena({ oggi: { sleepSecs: ore(5, 30) }, modifica: { 1: { sleepSecs: ore(5, 20) } } }), { evento });
  assert.equal(due.livello, "giallo");
  const tre = valuta(scena({ oggi: { sleepSecs: ore(5, 30) }, modifica: { 1: { sleepSecs: ore(5, 20) }, 2: { sleepSecs: ore(5, 10) } } }), { evento });
  assert.equal(tre.livello, "rosso");
  assert.equal(tre.consiglio, VIAGGIO.esiti.sonno);

  const problemi = (p) => valuta(scena({ diario: { [OGGI]: { viaggio: { problemi: p } } } }), { evento });
  const collo = problemi({ collo: "testa" });
  assert.equal(collo.livello, "rosso");
  assert.equal(collo.viaggio.fermaBici, true);
  assert.equal(collo.consiglio, VIAGGIO.esiti.collo);
  assert.equal(problemi({ stomaco: "vomito" }).livello, "rosso");
  const gonfiore = problemi({ gonfiore: "sintomi" });
  assert.equal(gonfiore.livello, "rosso");
  assert.equal(gonfiore.viaggio.medico, true);
  assert.equal(gonfiore.consiglio, VIAGGIO.esiti.gonfiore);
  // gli stop restano tutti
  assert.equal(valuta(scena({ diario: { [OGGI]: { stoMale: ["febbre"] } } }), { evento }).stop, "malattia");
  assert.equal(problemi({ ginocchia: "dolore" }).stop, "dolore");
});

test("modalità evento: Garmin con 6 ore e 20 vuol dire 5 ore e 35 vere, con l'anello le ore restano", () => {
  const m = scena({ oggi: { sleepSecs: (6 * 60 + 20) * 60 } });
  assert.equal(valutaInViaggio(m, {}, { dispositivo: "garmin" }).sonnoVero, 335);
  assert.equal(valutaInViaggio(m, {}, { dispositivo: "anello" }).sonnoVero, 380);
  // senza dispositivo si chiede
  const senza = scena({ oggi: { sleepSecs: null } });
  assert.equal(valutaInViaggio(senza, {}).domandaSonno, true);
  assert.equal(valutaInViaggio(senza, { sonno: "pochissimo" }).sonnoVero, 240);
  // il gonfiore conta alla seconda mattina di fila
  const ieri = scena({ diario: { [giorniFa(1)]: { viaggio: { problemi: { gonfiore: "piuDiIeri" } } } } });
  assert.equal(valutaInViaggio(ieri, { problemi: { gonfiore: "piuDiIeri" } }).livello, "giallo");
  assert.equal(valutaInViaggio(scena(), { problemi: { gonfiore: "piuDiIeri" } }).livello, "verde");
  assert.deepEqual(valutaInViaggio(scena(), {}).promemoria, VIAGGIO.promemoria);
});

test("modalità evento: quando è accesa, e la proposta da sola dopo due giorni lunghi", () => {
  assert.deepEqual(eventoDiOggi({ inizio: giorniFa(2), tipo: "evento", giorni: 4 }, OGGI), { tipo: "evento", giorno: 3, giorni: 4 });
  assert.equal(eventoDiOggi({ inizio: giorniFa(4), giorni: 4 }, OGGI).giorno, 5, "G giorni più uno");
  assert.equal(eventoDiOggi({ inizio: giorniFa(5), giorni: 4 }, OGGI), null);
  assert.equal(eventoDiOggi({ inizio: giorniFa(3), fine: giorniFa(1) }, OGGI), null, "«Sono arrivato»");
  assert.equal(eventoDiOggi({ inizio: aggiungiGiorni(OGGI, 1) }, OGGI), null);

  const lunghi = normalizzaUscite([giro(1, 4.5), giro(2, 4.2)]);
  assert.equal(propostaViaggio(lunghi, OGGI), true);
  assert.equal(propostaViaggio(lunghi, OGGI, 8), true);
  assert.equal(propostaViaggio(lunghi, OGGI, 10), false);
  assert.equal(propostaViaggio(normalizzaUscite([giro(1, 4.5)]), OGGI), false);
});

test("partenza: la prova con il Giallo si sposta, il blocco con il Giallo leggero no, il weekend con il Giallo leggero sì", () => {
  assert.deepEqual(partenza("giallo", "prova"), { parte: false, sposta: true });
  assert.equal(partenza("giallo-leggero", "blocco").parte, false);
  assert.equal(partenza("verde", "blocco").parte, true);
  assert.equal(partenza("giallo-leggero", "weekend").parte, true);
  assert.equal(partenza("rosso", "weekend").parte, false);
});

// --- 9.5, i controlli su più giorni ---

test("gialli di fila: tre giorni in Giallo senza spiegazione fanno partire il controllo della domenica", () => {
  const storia = { [giorniFa(1)]: { livello: "giallo", spiegato: false }, [giorniFa(2)]: { livello: "rosso", spiegato: false } };
  const e = valuta(scena({ oggi: { sleepSecs: 4.5 * ORA }, storia }));
  assert.equal(e.livello, "giallo");
  assert.equal(e.domenica, true);
  assert.ok(e.messaggi.some((x) => x.testo === MESSAGGI.gialliDiFila));
  // con le caselle, o con un giallo leggero in mezzo, no
  const spiegati = { ...storia, [giorniFa(2)]: { livello: "giallo", spiegato: true } };
  assert.equal(valuta(scena({ oggi: { sleepSecs: 4.5 * ORA }, storia: spiegati })).domenica, false);
  const leggero = { ...storia, [giorniFa(1)]: { livello: "giallo-leggero", spiegato: false } };
  assert.equal(valuta(scena({ oggi: { sleepSecs: 4.5 * ORA }, storia: leggero })).domenica, false);
});

test("dispositivo: la mediana che sale di 3 DS per 3 mattine fa chiedere se è cambiato", () => {
  const m0 = scena();
  const b = valuta(m0).basi.hrv;
  const modifica = {};
  for (let k = 1; k <= 9; k++) modifica[k] = { hrv: Math.exp(b.centro + 3.2 * b.ds) };
  const e = valuta(scena({ modifica, oggi: { hrv: Math.exp(b.centro + 3.2 * b.ds) } }));
  assert.equal(e.domande.dispositivo, true);
  assert.ok(e.messaggi.some((x) => x.testo === MESSAGGI.dispositivo));
  assert.equal(valuta(m0).domande.dispositivo, false);
  // con «Ho cambiato orologio» segnato le basi ripartono e la domanda non serve
  const cambiato = valuta(scena({ modifica, oggi: { hrv: Math.exp(b.centro + 3.2 * b.ds) }, profilo: { cambioDispositivo: giorniFa(9) } }));
  assert.equal(cambiato.domande.dispositivo, false);
  assert.equal(cambiato.fiducia.notte, "bassa");
  assert.equal(cambiato.basi.hrv.stato, "taratura");
});

test("medico: il battito alto da tre notti con stanchezza, e il viaggio lungo da 40 anni", () => {
  const alto = { restingHR: 54 };
  const e = valuta(scena({ oggi: { restingHR: 54, fatigue: 3 }, modifica: { 1: alto, 2: alto } }));
  assert.ok(e.medico.some((x) => x.chiave === "battito" && x.testo === MEDICO.presto));
  const senzaStanchezza = valuta(scena({ oggi: { restingHR: 54 }, modifica: { 1: alto, 2: alto } }));
  assert.ok(!senzaStanchezza.medico.some((x) => x.chiave === "battito"));
  const viaggio = valuta(scena(), { eta: 45, giorniEvento: 14, giorniPartenza: 25 });
  assert.ok(viaggio.medico.some((x) => x.testo === MEDICO.viaggioLungo));
  assert.ok(!valuta(scena(), { eta: 35, giorniEvento: 14, giorniPartenza: 25 }).medico.length);
});

// --- 9.5, fiducia e nessun dato ---

test("fiducia: notte e carico, il più basso dei due, e il testo accanto al colore solo quando è bassa", () => {
  const buona = valuta(scena());
  assert.equal(buona.fiducia.notte, "alta");
  assert.equal(buona.fiducia.carico, "media");
  assert.equal(buona.fiducia.indice, "media");
  assert.equal(buona.fiducia.accanto, false);

  const storiaCorta = valuta(scena({ uscite: giri(30) }));
  assert.equal(storiaCorta.fiducia.carico, "bassa");
  assert.equal(storiaCorta.fiducia.testo, "Mi fido poco del carico, ho meno di sei settimane di giri. Le tue risposte contano per intero.");

  const senzaDati = giri(90).map((u) => ({ ...u, icu_training_load: null, average_heartrate: null }));
  assert.equal(valuta(scena({ uscite: senzaDati })).fiducia.testo, "Mi fido poco del carico, molti giri non hanno dati. Le tue risposte contano per intero.");

  const conPotenza = giri(90).map((u) => ({ ...u, device_watts: true }));
  assert.equal(fiducia(scena({ uscite: conPotenza }), { ftp: 200 }).carico, "alta");

  const nottiCorte = valuta(scena({ benessere: notti(20) }));
  assert.equal(nottiCorte.fiducia.notte, "media");
  const garmin = valuta(scena(), { dispositivo: "garmin" });
  assert.equal(garmin.fiducia.notte, "media", "il battito di Garmin non è notturno");
  const senzaNotte = valuta(scena({ oggi: { hrv: null, restingHR: null, sleepSecs: null } }));
  assert.equal(senzaNotte.fiducia.notte, "bassa");
  assert.equal(senzaNotte.fiducia.accanto, true);
});

test("nessun dato: niente notti, niente risposte, niente giri", () => {
  const m = costruisciModello({ atleta: {}, benessere: [], uscite: [] }, OGGI);
  const e = valuta(m);
  assert.equal(e.livello, "nessuno");
  assert.equal(e.titolo, "Ancora pochi dati");
  assert.equal(e.colore, "neutro");
  assert.equal(e.nota, NOTE.senzaNotte);
  assert.deepEqual(e.voci.map((v) => v.chiave), ["energia", "gambe", "acciacchi", "notte", "carico"]);
  testiPuliti(e);
});

test("senza dati della notte decidono domande e carico", () => {
  const benessere = notti(90).map((w) => ({ id: w.id, ctl: 40, atl: 40, atlLoad: 40 }));
  const m = costruisciModello({ benessere: benessere.concat([{ id: OGGI, fatigue: 2, soreness: 2 }]), uscite: giri() }, OGGI);
  const e = valuta(m);
  assert.ok(m.notteMaiArrivata);
  assert.equal(e.livello, "verde");
  assert.equal(e.nota, NOTE.senzaNotte);
  assert.equal(voceDi(e, "notte").pallino, "grigio");
  assert.equal(valuta(costruisciModello({ benessere: benessere.concat([{ id: OGGI, fatigue: 3 }]), uscite: giri() }, OGGI)).livello, "giallo-leggero");
});

// --- 9.5, i testi ---

test("testi: titolo e consiglio di ogni livello come in 4.1, le righe del «Perché» come in 4.8", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(LIVELLI).map(([k, v]) => [k, v.titolo])),
    { verde: "Via libera", "giallo-leggero": "Vai, ma senza esagerare", giallo: "Giornata tranquilla", rosso: "Oggi recupera", nessuno: "Ancora pochi dati" },
  );
  assert.equal(LIVELLI.verde.consiglio, "Fai la seduta di oggi come è scritta. Il verde non la allunga.");
  assert.equal(LIVELLI["giallo-leggero"].consiglio, "La seduta di oggi va bene, ma niente sforzi al massimo. In salita resta a frasi brevi. In palestra tieni una ripetizione in più in riserva.");
  assert.equal(LIVELLI.giallo.consiglio, "Un giro facile da mezz'ora a un'ora e mezza, a ritmo da chiacchiera. Oppure palestra leggera. Oggi niente lunga, weekend o prove, si spostano.");
  assert.equal(LIVELLI.rosso.consiglio, "Riposo o una camminata. Se proprio vuoi la bici, al massimo 45 minuti pianissimo. In palestra solo 10 minuti di mobilità.");
  assert.equal(LIVELLI.nessuno.consiglio, "Il semaforo impara il tuo normale in quattro settimane. Intanto segui il piano senza sforzi al massimo e rispondi alle domande del mattino.");

  const righe = {
    energia: ["Hai detto che hai poca energia."],
    gambe: ["Hai detto che le gambe sono un po' indolenzite.", "Hai detto che le gambe sono molto doloranti."],
    acciacchi: ["Hai segnato un fastidio. Oggi niente sforzi che lo peggiorano.", "Hai segnato un dolore che non cambia la pedalata. Oggi solo giri facili, e se non passa in una o due settimane fatti vedere."],
    fc: ["Il battito a riposo è un po' più alto del tuo solito.", "Il battito a riposo è alto da due notti."],
    hrv: ["Le notti dicono che il corpo sta ancora recuperando.", "Da qualche notte il corpo recupera meno del solito."],
    carico: ["Negli ultimi giorni hai fatto più del tuo solito.", "Negli ultimi giorni hai fatto molto più del solito."],
  };
  for (const [chiave, [uno, due]] of Object.entries(righe)) {
    assert.equal(VOCI[chiave].uno, uno, chiave);
    if (due) assert.equal(VOCI[chiave].due, due, chiave);
  }
  assert.equal(VOCI.sonno.poco, "Hai dormito poco stanotte.");
  assert.equal(VOCI.sonno.settimana, "Questa settimana dormi poco.");
  assert.equal(VOCI.sonno.dueNotti, "Hai dormito poco due notti di fila.");
  assert.equal(PERCHE.nessuno, "Nessun segnale di stanchezza.");
  assert.equal(valuta(scena()).perche, PERCHE.nessuno);
  // i testi che arrivano davvero sulla carta, in giorni diversi
  testiPuliti(valuta(conHrvZ(-2.5, { oggi: { restingHR: 54 } })));
  testiPuliti(valuta(scena({ oggi: { soreness: 4, injury: 2, fatigue: 3 } })));
  testiPuliti(valuta(scena({ diario: { [OGGI]: { stoMale: ["petto", "febbre"] } } })));
  testiPuliti(valuta(scena({ diario: { [OGGI]: { viaggio: { problemi: { mani: "formicolano", collo: "male" } } } } }), { evento: { tipo: "viaggio", giorno: 2, giorni: 3 } }));
  testiPuliti(valuta(scena({ storia: { [giorniFa(1)]: { evento: { tipo: "weekend", giorno: 2 } } } })));
  for (const t of stringhe(GUIDA_SEMAFORO)) assert.ok(!t.includes(":") && !VIETATE.test(t), t);
});

test("il registro del giorno, da salvare nella storia", () => {
  const e = valuta(conHrvZ(-1.8));
  assert.deepEqual(Object.keys(e.registro).sort(), ["P", "evento", "forti", "guardia", "livello", "notteEsclusa", "punti", "riportato", "spiegato", "stop", "tetti"]);
  assert.equal(e.registro.livello, "giallo-leggero");
  assert.equal(e.registro.punti.hrv, 1);
  assert.equal(e.registro.notteEsclusa, false);
  const inViaggio = valuta(scena(), { evento: { tipo: "viaggio", giorno: 2, giorni: 3 } });
  assert.deepEqual(inViaggio.registro.evento, { tipo: "viaggio", giorno: 2, giorni: 3 });
  assert.equal(inViaggio.registro.notteEsclusa, true);
});
