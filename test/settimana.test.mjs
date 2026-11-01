// Prove delle pagine Settimana e Palestra (7.6 e 7.8), sulla parte pura delle due viste.
// Si lanciano con  node --test test/settimana.test.mjs
// Le persone sono inventate, Giulia dell'esempio e una settimana costruita qui, con date e numeri inventati.
import { test } from "node:test";
import assert from "node:assert/strict";

import { calcola } from "../js/motore.js";
import { generaDemo } from "../js/demo.js";
import { aggiungiGiorni, giornoSettimana } from "../js/modello.js";
import { righeSettimana } from "../js/viste/settimana.js";
import { sceltaPalestra } from "../js/viste/palestra.js";
import {
  giornoRiga, intervallo, nelPiano, fattoDescritto, sedutaAnche, fraseCrescita, liberaAiuto, segnataAlle,
} from "../js/testi-settimana.js";

const LUNEDI = "2026-11-02";
const MERCOLEDI = "2026-11-04";
const giorno = (n) => aggiungiGiorni(LUNEDI, n);

// --- Una settimana costruita qui, come la scrive js/piano.js ---

const seduta = (tipo, minuti, altro = {}) => ({ tipo, minuti, borse: "no", notteFuori: false, parte: null, di: null, chiave: false, nota: null, carboidrati: null, ...altro });
const riposo = () => seduta("riposo", 0);
const palestraA = () => seduta("palestra", 50, { scheda: 3, seduta: "A", settimana: 2, nome: "Costruzione", gambe: true });
const palestraB = () => seduta("palestra", 50, { scheda: 3, seduta: "B", settimana: 2, nome: "Costruzione", gambe: true });

function settimanaDiProva(cambia = {}) {
  const sedute = {
    0: [riposo()],
    1: [seduta("media", 60)],
    2: [palestraA()],
    3: [seduta("facile", 60), seduta("tronco", 10, { facoltativa: true })],
    4: [palestraB()],
    5: [seduta("lunga", 210, { chiave: true })],
    6: [seduta("facile", 60)],
    ...cambia,
  };
  return {
    lunedi: LUNEDI, indice: -9, tipo: "N", ore: 7, frase: "Questa settimana 7 ore di bici e 2 palestre.",
    avvisi: [], giorni: Array.from({ length: 7 }, (_, i) => ({ giorno: giorno(i), fuori: false, disponibile: true, sedute: sedute[i] })),
  };
}

// Un giro come lo restituisce js/dati.js, ridotto ai campi che la pagina legge.
const giro = (g, secondi = 3600, tipo = "Ride") => ({ id: `giro-${g}`, giorno: g, tipo, secondi, metri: 30000, sorgente: "WAHOO", nome: "Giro di prova" });

function ctxDiProva({ oggi = MERCOLEDI, settimana = settimanaDiProva(), spostamenti = [], attivita = [], obiettivo = { partenza: "2027-01-10", giorni: 4 }, settimane = [] } = {}) {
  return {
    oggi, settimana, attivita, obiettivo,
    piano: { fase: "piano", spostamenti, settimane: [...settimane, settimana], avvisi: [], inizio: aggiungiGiorni(LUNEDI, -42), motore: { rifatto: LUNEDI } },
    palestra: { registro: [], conto: null, oggi: null, fase: null },
    esito: { livello: "verde", stop: null },
    profilo: { palestra: "conosco", palestraSicurezza: "no", fasciaEta: "40-49" },
    ui: {}, preferenze: {}, azioni: {},
  };
}

// L'esempio vero, con il piano che nasce il giorno che si guarda.
function ctxEsempio(oggi, ui = {}) {
  const d = generaDemo(oggi);
  const r = calcola({
    oggi, adesso: `${oggi}T08:30`,
    letture: { atleta: d.atleta, benessere: d.benessere, attivita: d.uscite },
    telefono: {
      preferenze: {}, profilo: d.profilo, obiettivo: d.obiettivo, disponibilita: d.disponibilita, piano: null,
      uscite: d.detti, palestra: d.palestra, mattino: d.diario, esiti: d.storia, domenica: d.domenica, invito: null,
    },
  });
  return { ...r, profilo: d.profilo, preferenze: {}, ui, demo: true, azioni: {} };
}

// --- La settimana ---

test("sette righe da lunedì a domenica, oggi segnato, la principale prima in bici e poi la palestra", () => {
  const righe = righeSettimana(ctxDiProva());
  assert.equal(righe.length, 7);
  assert.deepEqual(righe.map((r) => giornoSettimana(r.giorno)), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(righe.filter((r) => r.oggi).map((r) => r.giorno), [MERCOLEDI]);
  assert.equal(righe[2].segno, "oggi");
  assert.equal(righe[2].seduta.tipo, "palestra");
  assert.equal(righe[3].seduta.tipo, "facile");
  assert.deepEqual(righe[3].altre.map((x) => x.tipo), ["tronco"]);
  assert.deepEqual(righe[3].palestra.map((x) => x.tipo), ["tronco"]);
  assert.equal(righe[0].seduta, null, "il riposo non è una seduta");
  for (const r of righe.slice(3)) assert.equal(r.segno, null, `nessun segno ${r.giorno}`);
});

test("un giorno passato con la seduta e niente fatto è saltato, con il giro è fatto, e un giro nel riposo conta", () => {
  const saltata = righeSettimana(ctxDiProva());
  assert.equal(saltata[1].segno, "saltata");
  assert.equal(saltata[0].segno, null);
  const fatta = righeSettimana(ctxDiProva({ attivita: [giro(giorno(1)), giro(giorno(0), 2400)] }));
  assert.equal(fatta[1].segno, "fatta");
  assert.equal(fatta[1].fatta, true);
  assert.equal(fatta[0].segno, "fatta", "un giro nel giorno di riposo si vede");
  // Oggi, con la palestra fatta, il segno è fatta.
  const palestra = righeSettimana(ctxDiProva({ attivita: [giro(MERCOLEDI, 3000, "WeightTraining")] }));
  assert.equal(palestra[2].segno, "fatta");
  // In bici invece della palestra la palestra non è fatta, e il giro si vede.
  const altro = righeSettimana(ctxDiProva({ oggi: giorno(5), attivita: [giro(giorno(4))] }));
  assert.equal(altro[4].segno, "saltata");
  assert.equal(altro[4].fatte.length, 1);
});

test("la lunga spostata dice dove va, quella che arriva da dove viene, quella saltata lo dice", () => {
  const settimana = settimanaDiProva({ 5: [riposo()], 6: [seduta("lunga", 210, { chiave: true })] });
  const spostamenti = [{ data: MERCOLEDI, tipo: "lunga", da: giorno(5), a: giorno(6), motivo: "weekend", colore: null }];
  const righe = righeSettimana(ctxDiProva({ settimana, spostamenti }));
  assert.equal(righe[5].segno, "spostata");
  assert.deepEqual(righe[5].spostata, { tipo: "lunga", minuti: 210 });
  assert.equal(righe[6].arrivata.da, giorno(5));
  assert.equal(righe[6].segno, null);
  const salta = righeSettimana(ctxDiProva({
    settimana: settimanaDiProva({ 5: [riposo()] }),
    spostamenti: [{ data: MERCOLEDI, tipo: "lunga", da: giorno(5), a: null, motivo: "weekend", colore: null }],
  }));
  assert.equal(salta[5].segno, "saltata");
  assert.equal(salta[5].spostata.tipo, "lunga");
});

test("la lunga che cresce rispetto a due settimane fa, solo nelle settimane che crescono", () => {
  const prima = { lunedi: aggiungiGiorni(LUNEDI, -14), tipo: "N", chiave: { tipo: "lunga", giorno: aggiungiGiorni(LUNEDI, -9), ore: [3] }, passata: true };
  const righe = righeSettimana(ctxDiProva({ settimane: [prima] }));
  assert.deepEqual(righe[5].crescita, { tipo: "lunga", minuti: 30 });
  assert.equal(fraseCrescita("lunga", righe[5].crescita.minuti), "La lunga cresce di 30 minuti rispetto a due settimane fa.");
  const scarico = settimanaDiProva();
  scarico.tipo = "S";
  assert.equal(righeSettimana(ctxDiProva({ settimana: scarico, settimane: [prima] }))[5].crescita, null);
  assert.equal(righeSettimana(ctxDiProva())[5].crescita, null, "senza la settimana di due settimane fa niente riga");
});

test("la settimana della partenza ha il giorno del via e i giorni in viaggio", () => {
  const settimana = settimanaDiProva();
  for (const g of settimana.giorni.slice(3)) { g.fuori = true; g.sedute = []; }
  const righe = righeSettimana(ctxDiProva({ settimana, obiettivo: { partenza: giorno(3), giorni: 4 } }));
  assert.deepEqual(righe.slice(3).map((r) => r.stato), ["partenza", "viaggio", "viaggio", "viaggio"]);
  assert.ok(righe.slice(3).every((r) => r.segno === null));
});

test("il piano nato oggi a metà settimana lascia i giorni passati fuori, con quello che è stato fatto", () => {
  const ctx = ctxEsempio(MERCOLEDI);
  const righe = righeSettimana(ctx);
  assert.equal(righe.length, 7);
  for (const r of righe.filter((x) => x.passato)) {
    assert.equal(r.seduta, null, r.giorno);
    assert.equal(r.stato, "primaDelPiano", r.giorno);
    assert.equal(r.segno, r.fatte.length ? "fatta" : null, r.giorno);
  }
});

// --- La palestra ---

test("la palestra di oggi arriva dal motore, e dalla settimana si apre quella di un altro giorno con il verde", () => {
  const ctx = ctxEsempio(MERCOLEDI);
  const oggi = ctx.settimana.giorni.find((g) => g.giorno === MERCOLEDI);
  assert.ok(oggi.sedute.some((x) => x.tipo === "palestra"), "nell'esempio il mercoledì c'è la palestra");
  const sc = sceltaPalestra(ctx);
  assert.equal(sc.oggi, true);
  assert.equal(sc.scheda, ctx.palestra.oggi);
  assert.ok(sc.scheda.esercizi.some((v) => v.blocco === "forza"));
  const altro = ctx.settimana.giorni.find((g) => g.giorno > MERCOLEDI && g.sedute.some((x) => x.tipo === "palestra"));
  assert.ok(altro, "l'esempio ha un'altra palestra in settimana");
  const anteprima = sceltaPalestra({ ...ctx, ui: { palestraGiorno: altro.giorno } });
  assert.equal(anteprima.oggi, false);
  assert.equal(anteprima.giorno, altro.giorno);
  assert.equal(anteprima.scheda.livello, "verde");
  assert.deepEqual(anteprima.giorni.map((x) => x.giorno).sort(), [MERCOLEDI, altro.giorno].sort());
  // Un giorno passato o fuori dalla settimana torna alla seduta di oggi.
  assert.equal(sceltaPalestra({ ...ctx, ui: { palestraGiorno: LUNEDI } }).oggi, true);
  assert.equal(sceltaPalestra({ ...ctx, ui: { palestraGiorno: "2027-03-01" } }).oggi, true);
});

test("senza palestra oggi la pagina dice la prossima, e con uno stop che oggi è ferma", () => {
  const ctx = ctxDiProva({ oggi: giorno(3) });
  const sc = sceltaPalestra(ctx);
  assert.equal(sc.dalPiano.tipo, "tronco", "il giovedì ha tronco e collo dopo il giro facile");
  assert.equal(sc.scheda.scheda, 7);
  const venerdi = sceltaPalestra({ ...ctxDiProva({ oggi: giorno(5) }) });
  assert.equal(venerdi.scheda, null);
  assert.equal(venerdi.prossima, null, "dopo il venerdì in settimana non c'è altra palestra");
  const martedi = sceltaPalestra(ctxDiProva({ oggi: giorno(1) }));
  assert.equal(martedi.scheda, null);
  assert.equal(martedi.prossima.giorno, MERCOLEDI);
  const stop = sceltaPalestra({ ...ctxDiProva(), esito: { livello: "rosso", stop: "dolore" } });
  assert.equal(stop.scheda, null);
  assert.equal(stop.ferma, true);
});

test("la scheda di un altro giorno legge l'età dalla fascia del primo avvio", () => {
  const ctx = ctxDiProva({ oggi: giorno(1) });
  const giovane = sceltaPalestra({ ...ctx, profilo: { ...ctx.profilo, fasciaEta: "sotto40" }, ui: { palestraGiorno: MERCOLEDI } });
  const da40 = sceltaPalestra({ ...ctx, ui: { palestraGiorno: MERCOLEDI } });
  const squat = (s) => s.scheda.esercizi.find((v) => v.id === "squat");
  assert.deepEqual(squat(giovane).riserva, { da: 1, a: 2 });
  assert.deepEqual(squat(da40).riserva, { da: 2, a: 2 }, "da 40 anni la riserva è 2");
});

// --- I testi ---

test("i testi della settimana e della palestra si compongono senza i due punti", () => {
  assert.equal(intervallo("2026-11-02"), "Da lunedì 2 a domenica 8 novembre.");
  assert.equal(intervallo("2026-11-30"), "Da lunedì 30 novembre a domenica 6 dicembre.");
  assert.equal(giornoRiga("2026-11-08"), "Domenica 8");
  assert.equal(nelPiano({ tipo: "facile", minuti: 60 }), "Nel piano c'era un giro facile, 1 ora.");
  assert.equal(fattoDescritto("Bici", 5400, 42500), "Bici, 1 ora e mezza, 43 km");
  assert.equal(segnataAlle("18:30"), "Seduta segnata oggi alle 18.30.");
  assert.match(liberaAiuto("2026-11-08"), /^Con il sì la domenica/);
  assert.match(liberaAiuto("2026-11-07"), /^Con il sì il sabato/);
  const testi = [
    nelPiano({ tipo: "lunga", minuti: 210 }), nelPiano({ tipo: "T3", minuti: 380, parte: 1, di: 2 }), nelPiano({ tipo: "palestra", minuti: 50 }),
    sedutaAnche({ tipo: "tronco", minuti: 10, facoltativa: true }), sedutaAnche({ tipo: "palestra" }), sedutaAnche({ tipo: "facile", minuti: 45 }),
    fraseCrescita("lunga", 30), fraseCrescita("T2", -40), fraseCrescita("lunga", 2),
  ];
  for (const t of testi) {
    assert.equal(typeof t, "string");
    assert.ok(!t.includes(":"), t);
    assert.ok(!/undefined|NaN|null|T[123]\b/.test(t), t);
  }
});
