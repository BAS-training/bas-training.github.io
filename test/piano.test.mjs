// Prove del piano della settimana (9.4 della specifica).
// Si lanciano con  node --test test/piano.test.mjs
// Le persone, le date e i numeri sono inventati. Il piano di 3.5 è quello dell'esempio della
// specifica, con una partenza di lunedì, così le settimane di calendario e i blocchi di 7 giorni
// coincidono.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  settimanePiano, scegliSchema, pianoLungo, applicaCrescita, giorniTapering, durataTapering, settimanaConcreta,
  oggiCosaFaccio, adattaSeduta, sposta, controlloDomenica, limiteFacile, obiettivoCarboidrati, passoLunga,
  tettoSettimana, oreSettimanaChiave, giroDelGiallo, crescitaRapida, carboidratiPer, leggiDisponibilita,
  leggiStorico, fatichePiano, modoEventoPiano, giorniPersi, TIPI_SEDUTA,
} from "../js/piano.js";
import * as T from "../js/testi-piano.js";
import { componiModulo } from "./modelli-testi.mjs";
import { PIANO, PRONTEZZA, DOMENICA } from "../js/parametri.js";
import { CATALOGO, trovaPercorso } from "../js/catalogo.js";
import { stimaH, percorsoLibero } from "../js/stima.js";
import { obiettivi, giorniDiBici, pilastroVolume, pilastroLunga, pilastroBorse, valutaProntezza } from "../js/prontezza.js";

const GIORNO_MS = 86400000;
const piu = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * GIORNO_MS).toISOString().slice(0, 10);
const fra = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / GIORNO_MS);
const dow = (iso) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
const vicino = (a, b, tolleranza, messaggio) => assert.ok(Math.abs(a - b) <= tolleranza, `${messaggio ?? ""} ${a} contro ${b}`);

const BICI = new Set(["recupero", "facile", "media", "richiamo", "lunga", "scarico", "controllo", "weekend", "weekendCarico", "T1", "T2", "T3", "prova", "blocco", "carica", "unGiorno"]);
const PIU = new Set(["weekend", "weekendCarico", "T3", "prova", "blocco"]);
const PROVE = new Set(["T1", "T2", "T3", "prova", "blocco", "weekendCarico", "carica", "unGiorno"]);
const NON_FACILI = new Set(["media", "richiamo"]);

// --- La scrittura (7.1), con le parole vietate scritte a pezzi come in 9.8 ---

const VIETATE = new RegExp("\\b(ga" + "r[ae]" + "|presta" + "zion[ei]" + "|ra" + "c(e|es|ing)" + "|perfor" + "mance)\\b", "i");
const DA_EVITARE = /classifica|cronometro|avversari|vincere|sei in forma|vai forte|principiante|amatore|allenato|indietro|tapering|specchio|watt|%|\bkJ\b|\bT[123]\b|\bRIR\b|\bRPE\b|ritmo-soglia|grammi/i;

function controllaTesto(testo, dove) {
  assert.equal(typeof testo, "string", `${dove} non è un testo`);
  assert.ok(testo.length > 0, `${dove} vuoto`);
  assert.ok(!testo.includes(":"), `due punti in ${dove}, ${testo}`);
  assert.ok(!VIETATE.test(testo), `parola vietata in ${dove}, ${testo}`);
  assert.ok(!DA_EVITARE.test(testo), `parola da evitare in ${dove}, ${testo}`);
  assert.ok(!/\d[.,]\d+ (ore|ora|minuti)/.test(testo), `decimali in una durata in ${dove}, ${testo}`);
  assert.ok(!/undefined|null|NaN/.test(testo), `valore mancante in ${dove}, ${testo}`);
}

// Tutte le stringhe dentro un valore, anche in oggetti e liste.
function stringhe(valore, lista = []) {
  if (typeof valore === "string") lista.push(valore);
  else if (Array.isArray(valore)) valore.forEach((v) => stringhe(v, lista));
  else if (valore && typeof valore === "object") Object.values(valore).forEach((v) => stringhe(v, lista));
  return lista;
}

// --- Le persone e le uscite inventate ---

let contatore = 0;
// Tre giri a settimana per 26 settimane prima di oggi, martedì e giovedì il resto e sabato la lunga.
function storia(oggi, h4, l30, settimane = 26) {
  const lista = [];
  const lunedi = piu(oggi, -dow(oggi));
  for (let w = settimane; w >= 1; w--) {
    const l = piu(lunedi, -7 * w);
    const resto = Math.max(0, h4 - l30) / 2;
    for (const [i, ore] of [[1, resto], [3, resto], [5, l30]]) {
      if (ore <= 0) continue;
      contatore += 1;
      const giorno = piu(l, i);
      lista.push({
        id: `s${contatore}`, giorno, inizio: `${giorno}T08:00:00`, tipo: "Ride", sorgente: "WAHOO", secondi: Math.round(ore * 3600),
        borse: ore >= 3 ? "no" : null, rulli: false, eBike: false, stub: false, commute: false, qualita: { secondi: "vera" },
      });
    }
  }
  return lista;
}

// Il lunedì della settimana −w per una partenza.
function lunediDi(partenza, w) {
  const gp = dow(partenza);
  const domenica1 = piu(partenza, -(gp === 6 ? 7 : gp + 1));
  return piu(domenica1, -6 - 7 * (w - 1));
}

// --- Il piano di 3.5 e la settimana di 3.7 ---

// Lucia prepara il Tuscany Trail Originale in 4 giorni, H 7,9, meno di 50 anni, con 5 ore e mezza a
// settimana e una lunga di 3 ore, 16 settimane prima di una partenza di lunedì.
const PARTENZA_LUCIA = "2027-05-24";
function pianoDiLucia(campi = {}) {
  return pianoLungo({
    obiettivo: { percorso: "tt-originale", giorni: 4, partenza: PARTENZA_LUCIA },
    stima: { H: 7.9, giorni: 4 },
    profilo: { eta: 45, palestra: "conosco", palestraSicurezza: "no" },
    storico: { h4: 5.5, l30: 3, settimane: [5.5, 5.5, 5.5, 5.5].map((ore) => ({ ore, lunga: 3 })) },
    disponibilita: { ore: 10 },
    oggi: "2027-02-01",
    ...campi,
  });
}

test("il piano di 3.5 dà le ore, la media e il picco della lunga", () => {
  const p = pianoDiLucia();
  const attese = [5.9, 6.1, 6.1, 3.6, 6.1, 7.0, 7.0, 4.2, 9.7, 8.5, 5.1, 10.3, 11.6, 7.5, 5.6, 3.5];
  const settimane = p.settimane.filter((s) => s.indice < 0);
  assert.deepEqual(settimane.map((s) => s.indice), Array.from({ length: 16 }, (_, i) => i - 16));
  settimane.forEach((s, i) => vicino(s.ore, attese[i], 0.1, `settimana ${s.indice}`));
  const media = settimane.filter((s) => s.indice >= -10 && s.indice <= -3).reduce((t, s) => t + s.ore, 0) / 8;
  vicino(media, 8.0, 0.1, "media dalla −10 alla −3");
  vicino(p.tapering.vRif, 8.0, 0.1, "V_rif");
  const picco = Math.max(...settimane.flatMap((s) => s.sedute.map((x) => x.ore)));
  vicino(picco, 6.29, 0.05, "picco della lunga");
  assert.equal(p.schema.nome, "A");
  assert.equal(p.schema.base, 4);
  assert.deepEqual(p.settimane.find((s) => s.indice === -8).sedute.map((x) => Math.round(x.ore * 60 / 10) * 10), [280, 210], "4 ore e 40 + 3 ore e mezza");
  assert.equal(p.fattibilita.corto, false);
  assert.deepEqual(p.avvisi, []);
});

test("la settimana −11 di 3.7 dà esattamente i giorni scritti lì", () => {
  const p = pianoDiLucia();
  const s = p.settimane.find((x) => x.indice === -11);
  vicino(s.ore, 7.0, 0.05);
  const giorni = s.giorni.map((g) => g.sedute.map((x) => (x.tipo === "palestra" ? `palestra ${x.seduta}` : x.tipo === "riposo" ? "riposo" : `${x.tipo} ${T.durata(x.minuti)}`)).join(" + "));
  assert.deepEqual(giorni, [
    "palestra A", "media 1 ora e mezza", "palestra B", "riposo", "riposo", "lunga 4 ore", "facile 1 ora e mezza",
  ]);
  assert.equal(T.titoloSeduta(s.giorni[5].sedute[0]), "Uscita lunga, 4 ore");
  assert.equal(T.titoloSeduta(s.giorni[1].sedute[0]), "Giro di 1 ora e mezza con qualche salita");
  assert.equal(s.frase, "Questa settimana 7 ore di bici e 2 palestre. La seduta che conta è la lunga di sabato.");
});

test("per una partenza in ognuno dei sette giorni il test pieno finisce almeno 22 giorni prima", () => {
  for (let i = 0; i < 7; i++) {
    const partenza = piu("2027-06-07", i);
    const settimane = settimanePiano(piu(partenza, -140), partenza);
    const meno4 = settimane.find((s) => s.indice === -4);
    const meno1 = settimane.find((s) => s.indice === -1);
    assert.equal(dow(meno1.domenica), 6);
    assert.ok(meno1.domenica < partenza, `la −1 finisce prima della partenza, ${partenza}`);
    assert.ok(fra(meno4.domenica, partenza) >= 22, `T3 a ${fra(meno4.domenica, partenza)} giorni, partenza ${partenza}`);
    const zero = settimane.find((s) => s.indice === 0);
    if (dow(partenza) === 0) assert.equal(zero, undefined, "con la partenza di lunedì non c'è la settimana 0");
    else assert.equal(zero.al, piu(partenza, -1));
    // E con il piano vero, il T3 dello schema A.
    const p = pianoLungo({
      obiettivo: { giorni: 4, partenza }, stima: { H: 7, giorni: 4 }, profilo: { eta: 40 },
      storico: { h4: 6, l30: 3.5 }, disponibilita: { ore: 10 }, oggi: piu(partenza, -84),
    });
    const t3 = p.settimane.flatMap((s) => s.sedute).filter((x) => x.tipo === "T3");
    assert.equal(t3.length, 2, `prova generale di due giorni, partenza ${partenza}`);
    assert.ok(fra(t3[1].giorno, partenza) >= 22, `partenza ${partenza}`);
  }
  // Nato a metà settimana, le ore della prima settimana si riducono per i giorni che restano.
  const s = settimanePiano("2027-04-08", "2027-06-07")[0];
  assert.deepEqual([s.dal, s.giorni], ["2027-04-08", 4]);
  vicino(s.quota, 4 / 7, 1e-9);
});

test("quale schema, per classe e settimane (3.3)", () => {
  const v = 8.1;
  assert.deepEqual([scegliSchema("2-5", 16, 5, 3, 7.9, v).schema, scegliSchema("2-5", 16, 5, 3, 7.9, v).base], ["A", 4]);
  const conBase = scegliSchema("2-5", 9, 0.7 * v, 0.4 * 7.9, 7.9, v);
  assert.deepEqual([conBase.schema, conBase.base], ["B", 1]);
  const senzaBase = scegliSchema("2-5", 9, 0.6 * v, 0.4 * 7.9, 7.9, v);
  assert.deepEqual([senzaBase.schema, senzaBase.ultime], ["A", 9]);
  assert.equal(scegliSchema("2-5", 9, 0.7 * v, 0.3 * 7.9, 7.9, v).schema, "A", "senza la lunga della base");
  assert.equal(scegliSchema("2-5", 6, 5, 3, 7.9, v).schema, "7.13");
  assert.equal(scegliSchema("2-5", 7, 5, 3, 7.9, v).schema, "7.13");
  assert.equal(scegliSchema("2-5", 5, 5, 3, 7.9, v).schema, "7.14");
  assert.equal(scegliSchema("2-5", 2, 5, 3, 7.9, v).schema, "7.15");
  const lungo = scegliSchema("11+", 22, 8, 4, 10, 10.5);
  assert.deepEqual([lungo.schema, lungo.base, lungo.blocco], ["C", 6, "obbligatorio"]);
  const dodici = scegliSchema("11+", 12, 8, 4, 10, 10.5);
  assert.deepEqual([dodici.schema, dodici.ultime, dodici.avvisi], ["C", 12, ["ventiSettimane"]]);
  assert.deepEqual(scegliSchema("11+", 18, 8, 4, 10, 10.5).avvisi, ["ventiSettimane"]);
  assert.equal(scegliSchema("6-10", 16, 8, 4, 9, 9.5).blocco, "consigliato");
  assert.deepEqual([scegliSchema("6-10", 8, 8, 4, 9, 9.5).schema, scegliSchema("6-10", 8, 8, 4, 9, 9.5).adattare], ["7.13", true]);
  const uno = scegliSchema("1", 12, 4, 2, 5, 4.75);
  assert.deepEqual([uno.schema, uno.base], ["D", 2]);
  assert.deepEqual([scegliSchema("1", 7, 4, 2, 5, 4.75).schema, scegliSchema("1", 7, 4, 2, 5, 4.75).ultime], ["D", 7]);
  assert.equal(scegliSchema("2-5", null, 5, 3, 7.9, v).schema, "libero");
  // Il piano senza data è la modalità libera.
  const libero = pianoLungo({ obiettivo: {}, stima: null, disponibilita: { ore: 6 }, storico: { h4: 5, l30: 2.5 }, oggi: "2027-01-04" });
  assert.equal(libero.fase, "libero");
  assert.equal(libero.schema.riga, 6);
  assert.ok(libero.settimane.every((s) => s.sedute.every((x) => !PROVE.has(x.tipo))), "senza prove");
  assert.ok(libero.settimane.every((s) => s.tipo !== "tapering"), "senza scarico finale");
  assert.deepEqual(libero.settimane.slice(0, 4).map((s) => s.tipo), ["base", "base", "base", "S"], "3+1");
});

test("il passo della lunga e il tetto della settimana normale (regole 2.4 e 2.6)", () => {
  vicino(passoLunga(3), 3.6, 1e-9);
  vicino(passoLunga(4), 4.75, 1e-9);
  vicino(passoLunga(3, true), 3.3, 1e-9, "con i dolori che tornano");
  vicino(tettoSettimana([{ ore: 6, tipo: "N" }, { ore: 6, tipo: "N" }, { ore: 3.6, tipo: "S" }]), 6.9, 1e-9, "lo scarico conta come la settimana prima");
  vicino(tettoSettimana([{ ore: 2.5, tipo: "N" }, { ore: 2.5, tipo: "N" }, { ore: 2.5, tipo: "N" }]), 3.0, 1e-9, "sotto le 3 ore mezz'ora");
  assert.equal(tettoSettimana([]), Infinity);
});

test("la settimana con una prova, feriali come l'ultima normale e almeno la seduta chiave più un'ora", () => {
  vicino(oreSettimanaChiave(7.53, 3.95, 3.03), 6.98, 1e-9, "il minore fra schema e chiave più feriali");
  vicino(oreSettimanaChiave(10.77, 10.63, 3.03), 11.63, 1e-9, "almeno la chiave più un'ora");
  vicino(oreSettimanaChiave(9.72, 8.26, 3.03), 9.72, 1e-9);
  const p = pianoDiLucia();
  const normale = p.settimane.find((s) => s.indice === -11);
  const feriali = normale.ore - normale.sedute.reduce((t, x) => t + x.ore, 0);
  for (const indice of [-10, -8, -7, -5, -4]) {
    const s = p.settimane.find((x) => x.indice === indice);
    const chiave = s.sedute.reduce((t, x) => t + x.ore, 0);
    assert.ok(s.ore <= chiave + Math.max(feriali, 1) + 0.01, `settimana ${indice}`);
    assert.ok(s.ore + 0.01 >= chiave + 1, `settimana ${indice} almeno la chiave più un'ora`);
    const feriale = s.giorni.filter((g) => !s.sedute.some((x) => x.giorno === g.giorno))
      .reduce((t, g) => t + g.sedute.filter((x) => BICI.has(x.tipo)).reduce((u, x) => u + x.minuti, 0), 0) / 60;
    assert.ok(feriale <= Math.max(feriali, 1) + 0.05, `feriali della ${indice}, ${feriale}`);
  }
});

test("lo scarico al 60% con almeno l'80% delle uscite, 3+1 a 45 anni e 2+1 a 52", () => {
  const p = pianoDiLucia();
  const uscite = (s) => s.giorni.reduce((n, g) => n + g.sedute.filter((x) => BICI.has(x.tipo)).length, 0);
  for (let i = 1; i < p.settimane.length; i++) {
    const s = p.settimane[i];
    if (s.tipo !== "S") continue;
    const prima = p.settimane[i - 1];
    vicino(s.ore, 0.6 * prima.orePiene, 0.01, `scarico ${s.indice}`);
    assert.ok(uscite(s) >= Math.ceil(0.8 * uscite(prima) - 1e-9), `uscite dello scarico ${s.indice}, ${uscite(s)} contro ${uscite(prima)}`);
    assert.ok(s.giorni.some((g) => g.sedute.some((x) => x.tipo === "media")), "la media resta");
    assert.ok(s.sedute.every((x) => !PIU.has(x.tipo)), "nessun weekend");
  }
  assert.deepEqual(p.settimane.filter((s) => s.indice < 0).map((s) => s.tipo).join(","), "base,base,base,S,N,N,E,S,E,E,S,E,E,N,tapering,tapering");
  // A 52 anni il 2+1, nello schema A scarico alla −12 e la −3 al 60% della −4.
  const p52 = pianoDiLucia({ profilo: { eta: 52, palestra: "conosco", palestraSicurezza: "no" } });
  const tipo = (w) => p52.settimane.find((s) => s.indice === w).tipo;
  assert.equal(tipo(-12), "S");
  assert.equal(tipo(-3), "S");
  vicino(p52.settimane.find((s) => s.indice === -3).ore, 0.6 * p52.settimane.find((s) => s.indice === -4).orePiene, 0.01);
  vicino(p52.settimane.find((s) => s.indice === -3).sedute[0].ore, 0.4 * 7.9, 0.01, "la lunga col set-up a 0,4 × H");
  let serie = 0;
  for (const s of p52.settimane) {
    serie = ["base", "N", "E"].includes(s.tipo) ? serie + 1 : 0;
    assert.ok(serie <= 2, `mai più di 2 settimane di carico di fila con il 2+1, ${s.indice}`);
  }
  // Con il 2+1 spento torna il 3+1.
  const spento = pianoDiLucia({ profilo: { eta: 52, scaricoOgniTre: false } });
  assert.equal(spento.settimane.find((s) => s.indice === -12).tipo, "N");
  // Lo schema D con la colonna dei 50 anni.
  const d = (eta) => pianoLungo({ obiettivo: { giorni: 1, partenza: PARTENZA_LUCIA }, stima: { H: 5 }, profilo: { eta }, storico: { h4: 5, l30: 2.5 }, disponibilita: { ore: 8 }, oggi: lunediDi(PARTENZA_LUCIA, 10) });
  const tipiD = (p2) => p2.settimane.filter((s) => s.indice <= -2).map((s) => s.tipo).join(",");
  assert.equal(tipiD(d(45)), "N,N,N,S,N,N,N,S,N");
  assert.equal(tipiD(d(52)), "S,N,N,S,N,N,S,N,N");
  vicino(d(52).settimane.find((s) => s.indice === -5).sedute[0].ore, Math.min(0.75 * 5, passoLunga(d(52).settimane.find((s) => s.indice === -6).sedute[0].ore)), 0.01, "la lunga della −5 a 0,75 × H con il 2+1");
});

test("lo scarico finale di 14, 10, 16 e 7 giorni (3.6)", () => {
  const media = (l) => l.reduce((t, x) => t + x, 0) / l.length;
  const quattordici = giorniTapering("2027-05-24", 14, 8);
  assert.equal(quattordici.length, 14);
  vicino(media(quattordici.slice(0, 7).map((g) => g.fattore)), 0.7, 0.02, "settimana −2 al 70%");
  vicino(media(quattordici.slice(7).map((g) => g.fattore)), 0.44, 0.02, "settimana −1 al 44%");
  vicino(quattordici.slice(0, 7).reduce((t, g) => t + g.ore, 0), 0.7 * 8, 0.02 * 8);
  assert.equal(quattordici[0].giorno, "2027-05-10");
  assert.equal(quattordici[13].giorno, "2027-05-23");
  // Nel piano di Lucia la −2 al 70% e la −1 al 44% di V_rif.
  const p = pianoDiLucia();
  vicino(p.settimane.find((s) => s.indice === -2).ore / p.tapering.vRif, 0.7, 0.02);
  vicino(p.settimane.find((s) => s.indice === -1).ore / p.tapering.vRif, 0.443, 0.02);
  assert.equal(durataTapering("2-5", 45, 4.5), 10, "10 giorni con V_rif sotto 5 ore");
  assert.equal(durataTapering("2-5", 45, 4.5, { pieno: true }), 14, "pieno dopo più giorni Rosso");
  assert.equal(durataTapering("2-5", 57, 8), 16, "16 giorni a 57 anni");
  assert.equal(durataTapering("1", 45, 8), 7, "7 giorni per un giorno");
  assert.equal(durataTapering("2-5", 45, 8), 14);
  const dieci = giorniTapering("2027-05-24", 10, 4.5);
  assert.deepEqual([dieci.length, dieci[0].fattore, dieci[9].fattore], [10, 0.6, 0.3]);
  const sedici = giorniTapering("2027-05-24", 16, 8);
  assert.deepEqual([sedici.length, sedici[0].fattore, sedici[15].fattore], [16, 0.7, 0.3]);
  const sette = giorniTapering("2027-05-24", 7, 5);
  assert.deepEqual([sette.length, sette[0].fattore, sette[6].fattore], [7, 0.6, 0.35]);
  // Nel piano vero, a 57 anni e con poche ore.
  const p57 = pianoDiLucia({ profilo: { eta: 57, palestra: "conosco", palestraSicurezza: "no" } });
  assert.equal(p57.tapering.durata, 16);
  const poche = pianoLungo({ obiettivo: { giorni: 3, partenza: PARTENZA_LUCIA }, stima: { H: 4.5 }, storico: { h4: 3, l30: 2 }, disponibilita: { ore: 4 }, oggi: lunediDi(PARTENZA_LUCIA, 12) });
  assert.ok(poche.tapering.vRif < 5);
  assert.equal(poche.tapering.durata, 10);
});

test("il giro del giallo", () => {
  assert.equal(giroDelGiallo(120), 90);
  assert.equal(giroDelGiallo(60), 60);
  assert.equal(giroDelGiallo(20), 30);
  assert.equal(giroDelGiallo(120, true), 45);
});

// --- Ogni mattina, la seduta di oggi (3.10) ---

const LUNEDI = "2027-04-05";
const LIVELLI = ["verde", "giallo-leggero", "giallo", "rosso"];

// Una settimana con la seduta da provare il sabato e una domenica libera.
function settimanaCon(seduta) {
  const giorni = Array.from({ length: 7 }, (_, i) => ({
    giorno: piu(LUNEDI, i), fuori: false, disponibile: [1, 3, 5, 6].includes(i), tetto: i === 5 ? 1440 : [1, 3, 6].includes(i) ? 90 : 0,
    tettoChiave: i === 5 || i === 6 ? 1440 : [1, 3].includes(i) ? 90 : 0, sedute: [{ tipo: "riposo", minuti: 0 }], ore: 0,
  }));
  giorni[5].sedute = [seduta];
  giorni[6].sedute = [{ tipo: "facile", minuti: 60, chiave: false }];
  const sedute = seduta.chiave ? [{ giorno: giorni[5].giorno, tipo: seduta.tipo, ore: seduta.minuti / 60, parte: seduta.parte || null, di: seduta.di || null }] : [];
  const settimana = { lunedi: LUNEDI, indice: -6, tipo: "N", ore: 6, giorni, sedute };
  return { obiettivo: { data: "2027-06-07" }, settimane: [settimana, { lunedi: piu(LUNEDI, 7), indice: -5, tipo: "N", ore: 6, giorni: [], sedute: [{ giorno: piu(LUNEDI, 12), tipo: "lunga", ore: 3 }] }], giorni };
}

const sedutaDi = (tipo, minuti, campi = {}) => ({ tipo, minuti, chiave: ["lunga", "weekend", "T1", "T2", "T3", "prova", "blocco"].includes(tipo), borse: PROVE.has(tipo) ? "evento" : "no", ...campi });

test("oggiCosaFaccio per tutte le coppie seduta e colore della tabella di 3.10", () => {
  const sabato = piu(LUNEDI, 5);
  const casi = [
    ["riposo", sedutaDi("riposo", 0), ["riposo", "riposo", "riposo", "riposo"]],
    ["facile", sedutaDi("facile", 75), ["prevista", "leggera", "giroGiallo", "rossoBici"]],
    ["media", sedutaDi("media", 90), ["prevista", "leggera", "giroGiallo", "rossoBici"]],
    ["lunga", sedutaDi("lunga", 240), ["prevista", "leggera", "giroGiallo", "riposo"]],
    ["weekend", sedutaDi("weekend", 280, { parte: 1, di: 2 }), ["prevista", "leggera", "giroGiallo", "riposo"]],
    ["T1", sedutaDi("T1", 240), ["prevista", "leggera", "giroGiallo", "riposo"]],
    ["T2", sedutaDi("T2", 330), ["prevista", "leggera", "giroGiallo", "riposo"]],
    ["T3", sedutaDi("T3", 380, { parte: 1, di: 2, notteFuori: true }), ["prevista", "leggera", "giroGiallo", "riposo"]],
    ["prova", sedutaDi("prova", 380, { parte: 1, di: 2, notteFuori: true }), ["prevista", "leggera", "giroGiallo", "riposo"]],
    ["blocco", sedutaDi("blocco", 360, { parte: 1, di: 3 }), ["prevista", "nonParte", "giroGiallo", "riposo"]],
    ["palestra gambe", { tipo: "palestra", minuti: 50, scheda: 3, seduta: "A", settimana: 6, gambe: true }, ["prevista", "leggera", "palestraLeggera", "mobilita"]],
    ["palestra tronco", { tipo: "palestra", minuti: 20, scheda: 7, seduta: null, settimana: 2, gambe: false }, ["prevista", "leggera", "palestraLeggera", "mobilita"]],
  ];
  for (const [nome, seduta, attese] of casi) {
    LIVELLI.forEach((livello, i) => {
      const r = oggiCosaFaccio(settimanaCon(seduta), { livello }, { profilo: { eta: 45, palestra: "conosco", palestraSicurezza: "no" } }, sabato);
      assert.equal(r.azione, attese[i], `${nome} con il ${livello}`);
      controllaTesto(r.titolo, `${nome} ${livello} titolo`);
      controllaTesto(r.come, `${nome} ${livello} come`);
      r.righe.forEach((x) => controllaTesto(x, `${nome} ${livello} riga`));
      const m = r.seduta ? r.seduta.minuti : 0;
      if (attese[i] === "giroGiallo") assert.equal(m, Math.max(30, Math.min(seduta.minuti, 90)), `${nome} giro del giallo`);
      if (attese[i] === "rossoBici") assert.ok(m <= 45, `${nome} al massimo 45 minuti`);
      if (attese[i] === "riposo") assert.equal(r.seduta, null, `${nome} riposo`);
      if (attese[i] === "prevista" || attese[i] === "leggera") assert.equal(m, seduta.minuti, `${nome} come prevista, il colore non aggiunge`);
      if (["lunga", "weekend", "T1", "T2", "T3", "prova", "blocco"].includes(nome)) {
        assert.equal(Boolean(r.sposta && r.sposta.seduta), ["giroGiallo", "riposo", "nonParte"].includes(attese[i]), `${nome} ${livello} si sposta`);
      }
      if (nome.startsWith("palestra")) {
        assert.ok(r.palestra, `${nome} la scheda c'è`);
        if (livello === "rosso") assert.equal(r.palestra.minuti, 10, "10 minuti di mobilità");
      }
    });
  }
  // Con un segnale forte il giro del giallo dura 45 minuti.
  const forte = oggiCosaFaccio(settimanaCon(sedutaDi("lunga", 240)), { livello: "giallo", forti: 1 }, {}, sabato);
  assert.equal(forte.seduta.minuti, 45);
  // Con uno stop il rosso dello stop e basta.
  const stop = oggiCosaFaccio(settimanaCon(sedutaDi("lunga", 240)), { livello: "rosso", stop: "malattia", consiglio: "Oggi niente allenamento." }, {}, sabato);
  assert.deepEqual([stop.tipo, stop.seduta, stop.come], ["stop", null, "Oggi niente allenamento."]);
  // Senza dati, la seduta del piano senza sforzi al massimo.
  const pochi = oggiCosaFaccio(settimanaCon(sedutaDi("lunga", 240)), { livello: "nessuno" }, {}, sabato);
  assert.equal(pochi.seduta.minuti, 240);
  assert.ok(pochi.righe.includes(T.LIVELLO.pochiDati));
  // Il giallo sulla media fa saltare il ritmo della settimana.
  const media = oggiCosaFaccio(settimanaCon(sedutaDi("media", 90)), { livello: "giallo" }, {}, sabato);
  assert.ok(media.righe.includes(T.LIVELLO.ritmoSalta));
  // Dal giorno 2 di un weekend in modalità evento vale la tappa del giorno, più corta con il giallo.
  const secondo = settimanaCon(sedutaDi("weekend", 210, { parte: 2, di: 2 }));
  const evento = oggiCosaFaccio(secondo, { livello: "giallo" }, { evento: { tipo: "weekend", giorno: 2, giorni: 2 } }, sabato);
  assert.equal(evento.seduta.minuti, Math.round(210 * 0.7));
  assert.equal(evento.titolo, "Weekend lungo, secondo giorno, 2 ore e 30".replace("2 ore e 30", T.durata(147)));
  // Nei giorni di guardia la seduta di recupero.
  const guardia = oggiCosaFaccio(settimanaCon(sedutaDi("lunga", 240)), { livello: "giallo" }, { guardia: { attiva: true, tipo: "weekend", giorno: 1 } }, sabato);
  assert.ok(guardia.seduta.minuti <= 45);
  // In viaggio la tappa.
  const tappa = oggiCosaFaccio(null, { livello: "verde" }, { evento: { tipo: "evento", giorno: 2, giorni: 4 }, oreTappa: 8 }, sabato);
  assert.deepEqual([tappa.tipo, tappa.titolo], ["tappa", "Giorno 2 di 4"]);
  // Dopo l'evento niente piano.
  const dopo = oggiCosaFaccio(null, { livello: "verde" }, { guardia: { attiva: true, tipo: "evento", giorno: 3 } }, sabato);
  assert.equal(dopo.titolo, "Settimana di recupero");
});

test("spostare, non recuperare (3.10)", () => {
  const sabato = piu(LUNEDI, 5);
  const domenica = piu(LUNEDI, 6);
  const piano = settimanaCon(sedutaDi("lunga", 240));
  const s = piano.settimane[0];
  // Lunga saltata sabato per il giallo e domenica verde, la lunga va a domenica.
  const via = sposta({ tipo: "lunga", giorno: sabato, minuti: 240 }, s, { [sabato]: "giallo", [domenica]: "verde" }, "2027-06-07", piano);
  assert.deepEqual([via.esito, via.giorno], ["sposta", domenica]);
  assert.equal(via.testo, "La lunga va a domenica.");
  const carta = oggiCosaFaccio(piano, { livello: "giallo" }, {}, sabato);
  assert.ok(carta.righe.includes("La lunga la spostiamo a domenica, se stai meglio."), carta.righe.join(" | "));
  // Sabato e domenica gialli, salta.
  const salta = sposta({ tipo: "lunga", giorno: sabato, minuti: 240 }, s, { [sabato]: "giallo", [domenica]: "giallo" }, "2027-06-07", piano);
  assert.equal(salta.esito, "salta");
  controllaTesto(salta.testo, "salta");
  // E la settimana dopo non c'è una lunga doppia, il passo parte dalle uscite vere.
  const oggi = piu(LUNEDI, 7);
  const vere = storia(oggi, 6, 3, 8).filter((a) => a.giorno !== sabato);
  const dopo = pianoLungo({ obiettivo: { giorni: 4, partenza: "2027-07-26" }, stima: { H: 7 }, storico: { uscite: vere }, disponibilita: { ore: 10 }, oggi });
  assert.ok(dopo.settimane[0].sedute[0].ore <= passoLunga(3) + 1e-9, "la lunga dopo resta nel passo");
  // Un weekend con il giallo a 30 giorni dalla partenza va al weekend dopo, al posto di una lunga semplice.
  const partenza = piu(sabato, 30);
  const conWeekend = settimanaCon(sedutaDi("weekend", 280, { parte: 1, di: 2 }));
  conWeekend.obiettivo.data = partenza;
  conWeekend.settimane[0].sedute = [{ giorno: sabato, tipo: "weekend", ore: 4.7, parte: 1, di: 2 }, { giorno: domenica, tipo: "weekend", ore: 3.5, parte: 2, di: 2 }];
  conWeekend.tapering = { inizio: piu(partenza, -14) };
  const weekend = sposta({ tipo: "weekend", giorno: sabato, minuti: 280, parte: 1, di: 2 }, conWeekend.settimane[0], { [sabato]: "giallo" }, partenza, conWeekend);
  assert.deepEqual([weekend.esito, weekend.giorni], ["sposta", [piu(sabato, 7), piu(sabato, 8)]]);
  // Una prova con il giallo a 22 giorni salta, perché il weekend dopo sarebbe a 15.
  const vicina = settimanaCon(sedutaDi("T3", 380, { parte: 1, di: 2 }));
  vicina.obiettivo.data = piu(sabato, 22);
  const prova = sposta({ tipo: "T3", giorno: sabato, minuti: 380, parte: 1, di: 2 }, vicina.settimane[0], { [sabato]: "giallo" }, piu(sabato, 22), vicina);
  assert.equal(prova.esito, "salta");
  // Se la settimana dopo non ha una lunga semplice, salta.
  const occupata = settimanaCon(sedutaDi("weekend", 280, { parte: 1, di: 2 }));
  occupata.obiettivo.data = partenza;
  occupata.settimane[1].sedute = [{ giorno: piu(LUNEDI, 12), tipo: "T2", ore: 5 }];
  assert.equal(sposta({ tipo: "weekend", giorno: sabato, minuti: 280, parte: 1, di: 2 }, occupata.settimane[0], {}, partenza, occupata).esito, "salta");
  // Il blocco con il giallo leggero non parte.
  const blocco = oggiCosaFaccio(settimanaCon(sedutaDi("blocco", 360, { parte: 1, di: 3 })), { livello: "giallo-leggero" }, {}, sabato);
  assert.equal(blocco.azione, "nonParte");
  assert.ok(blocco.seduta.minuti <= 90);
  // Una facile non si recupera mai raddoppiando.
  assert.equal(sposta({ tipo: "facile", giorno: sabato, minuti: 60 }, s, {}, "2027-06-07", piano).esito, "salta");
});

// --- La domenica (3.11) ---

const DOMENICA_PROVA = "2027-03-14";

// Cinque settimane di mattine normali, energia e gambe a 2, sette ore e mezza di sonno, battito 52.
function mattine(cambi = {}) {
  const giorni = [];
  for (let k = 34; k >= 0; k--) {
    const d = piu(DOMENICA_PROVA, -k);
    giorni.push({ d, fatica: 2, dolori: 2, sonno: 7.5 * 3600, fcRiposo: 52, hrv: 60 + (k % 5), ...(cambi[d] || {}) });
  }
  return giorni;
}
const ultimi = (n) => Array.from({ length: n }, (_, i) => piu(DOMENICA_PROVA, -i));
const conCambi = (date, campi) => Object.fromEntries(date.map((d) => [d, campi]));

test("la domenica con 0, 1, 2 e 3 segnali, e S6 solo con un altro segnale", () => {
  const zero = controlloDomenica(mattine(), [], {}, null, { oggi: DOMENICA_PROVA });
  assert.deepEqual([zero.conta, zero.proposta.tipo, zero.chiedi], [0, "continua", null]);
  assert.deepEqual(zero.testi, [T.TESTI_DOMENICA.nessuno]);
  // Un segnale, il sonno corto in 3 notti. S6 si chiede.
  const sonno = conCambi(ultimi(3), { sonno: 6 * 3600 });
  const uno = controlloDomenica(mattine(sonno), [], {}, null, { oggi: DOMENICA_PROVA });
  assert.deepEqual([uno.segnali.S3, uno.conta, uno.proposta.tipo, uno.chiedi], [true, 1, "continua", "S6"]);
  controllaTesto(uno.domandaS6, "domanda S6");
  // Due segnali, sonno ed energia, la settimana facile.
  const energia = conCambi(ultimi(4), { fatica: 3, sonno: 6 * 3600 });
  const due = controlloDomenica(mattine(energia), [], {}, null, { oggi: DOMENICA_PROVA });
  assert.deepEqual([due.segnali.S2, due.segnali.S3, due.conta, due.proposta.tipo], [true, true, 2, "settimanaFacile"]);
  assert.equal(due.proposta.giorniSenzaBici, 2);
  assert.equal(due.proposta.giroMassimo, 120);
  due.testi.forEach((t) => controllaTesto(t, "due segnali"));
  // Con il sì a S6 il cibo viene prima.
  const s6 = controlloDomenica(mattine(energia), [], { [DOMENICA_PROVA]: { s6: "si" } }, null, { oggi: DOMENICA_PROVA });
  assert.equal(s6.conta, 3);
  assert.equal(s6.testi[0], T.TESTI_DOMENICA.cibo);
  // Tre segnali, anche il semaforo, sette giorni facili e il giro di prova di un'ora.
  const diario = Object.fromEntries(ultimi(4).map((d) => [d, { livello: "giallo" }]));
  const tre = controlloDomenica(mattine(energia), [], diario, null, { oggi: DOMENICA_PROVA });
  assert.deepEqual([tre.segnali.S7, tre.conta, tre.proposta.tipo, tre.proposta.riferimento], [true, 3, "giorniFacili", 60]);
  // Due domeniche di fila con almeno 2, come con 3.
  const fila = controlloDomenica(mattine(energia), [], {}, null, { oggi: DOMENICA_PROVA, precedenti: [{ conta: 2, proposta: { tipo: "settimanaFacile" } }] });
  assert.equal(fila.proposta.tipo, "giorniFacili");
  // Il giallo leggero non conta per S7.
  const leggero = controlloDomenica(mattine(), [], Object.fromEntries(ultimi(6).map((d) => [d, { livello: "giallo-leggero" }])), null, { oggi: DOMENICA_PROVA });
  assert.equal(leggero.segnali.S7, false);
});

test("la domenica con un weekend in programma, con la febbre e con il piano", () => {
  // Il weekend di sabato 6 e domenica 7 marzo e le 72 ore dopo restano fuori da S1-S4 e S7.
  const piano = { obiettivo: { data: "2027-06-07" }, settimane: [{ lunedi: "2027-03-01", tipo: "E", ore: 9, sedute: [{ giorno: "2027-03-06", tipo: "weekend", ore: 4.5, parte: 1, di: 2 }, { giorno: "2027-03-07", tipo: "weekend", ore: 3, parte: 2, di: 2 }] }] };
  const fatica = ["2027-03-08", "2027-03-09", "2027-03-10"];
  const cambi = conCambi(fatica, { sonno: 6 * 3600 });
  const diario = Object.fromEntries(fatica.map((d) => [d, { livello: "giallo" }]));
  diario["2027-03-08"].livello = "rosso";
  diario["2027-03-09"].livello = "rosso";
  const senza = controlloDomenica(mattine(cambi), [], diario, null, { oggi: DOMENICA_PROVA });
  assert.ok(senza.segnali.S3 && senza.segnali.S7, "senza il piano contano");
  const con = controlloDomenica(mattine(cambi), [], diario, piano, { oggi: DOMENICA_PROVA });
  assert.deepEqual([con.segnali.S3, con.segnali.S7, con.conta], [false, false, 0]);
  // S1, S2 e S4 negli stessi giorni. Due giri facili duri l'8 e il 9, il battito alto dall'8 al 10,
  // l'energia peggiore dall'8 al 10 che torna, e una che non torna l'11.
  const norma = [];
  for (let k = 34; k >= 11; k -= 3) {
    const g = piu(DOMENICA_PROVA, -k);
    norma.push({ id: `n${k}`, giorno: g, inizio: `${g}T08:00:00`, tipo: "Ride", secondi: 3600, sforzo: 3, qualita: { secondi: "vera" } });
  }
  const duri = ["2027-03-08", "2027-03-09"].map((g, i) => ({ id: `d${i}`, giorno: g, inizio: `${g}T08:00:00`, tipo: "Ride", secondi: 3600, sforzo: 6, qualita: { secondi: "vera" } }));
  const battito = conCambi(fatica, { fcRiposo: 70 });
  const torna = conCambi(fatica, { fcRiposo: 70, fatica: 3 });
  const nonTorna = { ...torna, "2027-03-11": { fatica: 3 } };
  const s1 = (p) => controlloDomenica(mattine(battito), [...norma, ...duri], {}, p, { oggi: DOMENICA_PROVA }).segnali;
  assert.deepEqual([s1(null).S1, s1(null).S4], [true, true], "senza il piano i giri duri e il battito alto contano");
  assert.deepEqual([s1(piano).S1, s1(piano).S4], [false, false], "nei giorni del weekend e nelle 72 ore dopo no");
  const s2 = (cambi2, p) => controlloDomenica(mattine(cambi2), norma, {}, p, { oggi: DOMENICA_PROVA }).segnali;
  assert.equal(s2(torna, piano).S2, false, "le sensazioni tornate entro 72 ore non contano");
  assert.equal(s2(nonTorna, piano).S2, true, "le sensazioni che non tornano contano, anche quelle dentro le 72 ore");
  assert.equal(s2(nonTorna, piano).S4, false, "il battito alto solo nei giorni esclusi non conta, anche con S2");
  assert.equal(s2(nonTorna, null).S4, true, "senza il piano sì");
  // La febbre conta sempre, e porta ai giorni facili con la ripartenza dopo 24 ore.
  const febbre = controlloDomenica(mattine(), [], { "2027-03-12": { stoMale: ["febbre"] } }, piano, { oggi: DOMENICA_PROVA });
  assert.deepEqual([febbre.segnali.S5, febbre.proposta.tipo, febbre.proposta.riparteDopoOre], [true, "giorniFacili", 24]);
  // In modalità evento il controllo è spento.
  assert.equal(controlloDomenica(mattine(), [], { [DOMENICA_PROVA]: { evento: true } }, null, { oggi: DOMENICA_PROVA }).spento, true);
  // S1, lo sforzo delle uscite facili 2 punti sopra la mediana in almeno 2 uscite.
  const uscite = [];
  for (let k = 34; k >= 0; k -= 2) {
    const giorno = piu(DOMENICA_PROVA, -k);
    uscite.push({ id: `f${k}`, giorno, inizio: `${giorno}T08:00:00`, tipo: "Ride", secondi: 3600, sforzo: k <= 6 ? 6 : 3, qualita: { secondi: "vera" } });
  }
  const sforzo = controlloDomenica(mattine(), uscite, {}, null, { oggi: DOMENICA_PROVA });
  assert.equal(sforzo.segnali.S1, true);
});

test("la settimana facile entro 2 settimane da uno scarico lo sostituisce, nelle ultime 2 coincide con lo scarico finale", () => {
  const energia = conCambi(ultimi(4), { fatica: 3, sonno: 6 * 3600 });
  const settimane = (tipi) => tipi.map((tipo, i) => ({ lunedi: piu("2027-02-08", 7 * i), tipo, ore: 7, sedute: [] }));
  const conScarico = { obiettivo: { data: "2027-06-07" }, settimane: settimane(["N", "N", "N", "N", "N", "S"]) };
  const r = controlloDomenica(mattine(energia), [], {}, conScarico, { oggi: DOMENICA_PROVA });
  assert.equal(r.proposta.tipo, "settimanaFacile");
  assert.equal(r.proposta.sostituisceScarico, "2027-03-15", "lo scarico della settimana dopo");
  const dopo = controlloDomenica(mattine(energia), [], {}, { obiettivo: { data: "2027-06-07" }, settimane: settimane(["N", "N", "N", "N", "N", "N", "S"]) }, { oggi: DOMENICA_PROVA });
  assert.equal(dopo.proposta.sostituisceScarico, "2027-03-22", "lo scarico di due settimane dopo");
  assert.ok(r.testi.includes(T.TESTI_DOMENICA.scarico));
  vicino(r.proposta.ore, 0.55 * 7, 1e-9, "al 55% della media delle ultime 3 settimane di carico");
  const finale = { obiettivo: { data: "2027-03-29" }, settimane: settimane(["N", "N", "N", "N", "N", "tapering"]) };
  const t = controlloDomenica(mattine(energia), [], {}, finale, { oggi: DOMENICA_PROVA });
  assert.deepEqual([t.proposta.coincideConTapering, t.proposta.sostituisceScarico], [true, null]);
  // E il piano rifatto il lunedì ha la settimana facile, con almeno due giorni senza bici.
  const oggi = "2027-03-15";
  const p = pianoLungo({
    obiettivo: { giorni: 4, partenza: "2027-07-26" }, stima: { H: 7 }, storico: { h4: 6, l30: 3, domenica: { ...r.proposta, lunedi: oggi } },
    disponibilita: { giorni: [0, 1, 2, 3, 4, 5, 6], ore: 10 }, oggi,
  });
  const facile = p.settimane[0];
  assert.equal(facile.tipo, "F");
  assert.ok(facile.giorni.filter((g) => !g.sedute.some((x) => BICI.has(x.tipo))).length >= 2);
  assert.ok(facile.giorni.every((g) => g.sedute.every((x) => !BICI.has(x.tipo) || (!NON_FACILI.has(x.tipo) && x.minuti <= 120))));
  vicino(facile.ore, 0.55 * 6, 0.01);
  controllaTesto(facile.frase, "frase della settimana facile");
});

test("l'interruzione di 10 giorni porta la settimana dopo al 75%", () => {
  const base = { obiettivo: { giorni: 4, partenza: "2027-07-26" }, stima: { H: 7 }, disponibilita: { ore: 10 }, oggi: "2027-03-15" };
  // Con h4 6 la settimana senza interruzione avrebbe 5,38 ore, quindi il 75% delle 6 di prima si vede.
  const p = pianoLungo({ ...base, storico: { h4: 6, l30: 3, interruzione: { giorni: 10, orePrima: 6 } } });
  vicino(p.settimane[0].orePiene, 0.75 * 6, 0.05, "al 75% delle ore di prima");
  const senza = pianoLungo({ ...base, storico: { h4: 6, l30: 3 } });
  vicino(senza.settimane[0].orePiene, 5.38, 0.05, "senza interruzione");
  assert.ok(p.avvisi.some((a) => a.tipo === "interruzione"));
  assert.ok(!senza.avvisi.some((a) => a.tipo === "interruzione"));
  const lunga = pianoLungo({ ...base, storico: { h4: 4, l30: 3, interruzione: { giorni: 25 } } });
  assert.ok(lunga.avvisi.some((a) => a.tipo === "interruzioneLunga" && a.rivedi));
  const breve = pianoLungo({ ...base, storico: { h4: 4, l30: 3, interruzione: { giorni: 5, orePrima: 6 } } });
  assert.ok(!breve.avvisi.some((a) => a.tipo === "interruzione"), "fino a 7 giorni si riparte come prima");
  // I giorni persi si contano dal piano e dalle uscite.
  const piano = { settimane: [{ lunedi: "2027-03-01", ore: 7, giorni: [] }, { lunedi: "2027-03-08", ore: 7, giorni: [] }] };
  assert.equal(giorniPersi(piano, [], "2027-03-15"), 14);
});

test("la crescita rapida ferma la settimana dopo e il semaforo per 7 giorni", () => {
  const oggi = "2027-03-14";
  const serie = Array.from({ length: 29 }, (_, i) => ({ d: piu(oggi, i - 28), fitness: 40 + (i >= 21 ? (i - 21) * (8 / 7) : 0) }));
  const r = crescitaRapida(serie, oggi);
  assert.deepEqual([r.avviso, r.tetto, r.fino], [true, "giallo-leggero", "2027-03-21"]);
  controllaTesto(r.testo, "crescita");
  assert.equal(crescitaRapida(serie.map((x) => ({ ...x, fitness: 40 })), oggi).avviso, false);
  const lenta = Array.from({ length: 29 }, (_, i) => ({ d: piu(oggi, i - 28), fitness: 40 + i * (4.5 / 7) }));
  assert.equal(crescitaRapida(lenta, oggi, 45).avviso, false, "4,5 a settimana sotto i 50 anni no");
  assert.equal(crescitaRapida(lenta, oggi, 52).avviso, true, "4,5 a settimana per 3 settimane da 50 anni sì");
  const prima = { ore: 6, lunga: 3 };
  const p = pianoLungo({ obiettivo: { giorni: 4, partenza: "2027-07-26" }, stima: { H: 9 }, storico: { h4: 6, l30: 3, settimane: [prima, prima, prima, prima], crescitaRapida: r }, disponibilita: { ore: 12 }, oggi: "2027-03-15" });
  assert.ok(p.settimane[0].ore <= 6 + 1e-9, "la settimana dopo non sale");
});

test("il cibo nella lunga, lo stomaco e i carboidrati (3.9)", () => {
  const s = (indice, lunedi) => ({ indice, lunedi });
  assert.equal(obiettivoCarboidrati(s(-10, "2027-03-01"), []), 35);
  assert.equal(obiettivoCarboidrati(s(-11, "2027-02-22"), []), null, "prima della −10 niente obiettivo");
  assert.equal(obiettivoCarboidrati(s(-1, "2027-05-03"), []), null, "nello scarico finale no");
  assert.equal(obiettivoCarboidrati(s(-9, "2027-03-08"), [{ giorno: "2027-03-06", grammi: 35, stomaco: "bene" }]), 45);
  assert.equal(obiettivoCarboidrati(s(-9, "2027-03-08"), [{ giorno: "2027-03-06", grammi: 35, stomaco: "cosi" }]), 35);
  assert.equal(obiettivoCarboidrati(s(-9, "2027-03-08"), [{ giorno: "2027-03-06", grammi: 35 }]), 35);
  assert.equal(obiettivoCarboidrati(s(-8, "2027-03-15"), [{ giorno: "2027-03-13", grammi: 45, stomaco: "male" }]), 35);
  assert.equal(obiettivoCarboidrati(s(-3, "2027-04-26"), [{ giorno: "2027-04-24", grammi: 60, stomaco: "bene" }]), 60, "mai oltre 60");
  assert.equal(carboidratiPer(60, "facile"), null, "sotto 75 minuti facili nessun obbligo");
  assert.deepEqual(carboidratiPer(120, "facile").grammi, [30, 60]);
  assert.deepEqual(carboidratiPer(240, "lunga").grammi, [40, 60]);
  assert.ok(Math.max(...carboidratiPer(600, "lunga").grammi) <= PIANO.carboidrati.massimo);
  for (const g of [30, 35, 40, 45, 50, 55, 60]) controllaTesto(T.testoStomaco(g), `stomaco ${g}`);
  assert.equal(T.ciboPerOra(40), "una barretta e mezza borraccia di bevanda zuccherata");
  // Nel piano di Lucia la lunga della −10 ha l'obiettivo di cibo, e la carta lo dice con il cibo.
  const p = pianoDiLucia();
  const lunga = p.settimane.find((x) => x.indice === -10).giorni.flatMap((g) => g.sedute).find((x) => x.chiave);
  assert.equal(lunga.cibo.grammi, 35);
  controllaTesto(lunga.cibo.testo, "cibo");
});

test("il limite del facile (3.8)", () => {
  const atleta = { sportSettings: [{ types: ["Ride", "GravelRide"], lthr: 160, max_hr: 185 }] };
  assert.deepEqual([limiteFacile(atleta, {}).battito, limiteFacile(atleta, {}).fonte], [128, "soglia"]);
  const bassa = { sportSettings: [{ types: ["Ride"], lthr: 170, max_hr: 176 }] };
  assert.deepEqual([limiteFacile(bassa, {}).battito, limiteFacile(bassa, {}).fonte], [123, "massima"], "vale la più bassa");
  const eta = limiteFacile(null, { fasciaEta: 1 });
  assert.deepEqual([eta.battito, eta.fonte], [124, "eta"], "208 − 0,7 × 45, mai 220 − età");
  assert.equal(limiteFacile(null, { battitoNeiGiri: false }), null);
  assert.deepEqual(T.righeLimite(eta, 60), ["Tieni il battito sotto 124."]);
  assert.deepEqual(T.righeLimite(eta, 300), ["Tieni il battito sotto 124.", "Quasi tutto il tempo facile, e il battito medio non oltre 124."]);
});

test("il piano parla la lingua del verdetto, la proiezione di js/prontezza.js lo legge", () => {
  const oggi = "2027-02-01";
  const uscite = storia(oggi, 5.5, 3);
  const p = pianoLungo({ obiettivo: { percorso: "tt-originale", giorni: 4, partenza: PARTENZA_LUCIA }, stima: { H: 7.9, giorni: 4 }, profilo: { eta: 45 }, storico: { uscite }, disponibilita: { ore: 10 }, oggi });
  const r = valutaProntezza({ percorso: trovaPercorso("tt-originale"), giorni: 4, partenza: PARTENZA_LUCIA, oggi, uscite, piano: p, stima: { H: 7.9, T: 31.6, livello: 1, giorni: 4 }, oreDisponibili: 10 });
  assert.equal(r.fase, "proiezione");
  assert.deepEqual(r.proiezione.frasi, ["Siamo nella base.", "Se segui il piano, ci arrivi pronto."]);
  assert.deepEqual(Object.values(r.pilastri).map((x) => x.difetto), [0, 0, 0, 0]);
  assert.ok(r.pilastri.borse.righe.every((x) => x.stato === "inProgramma"));
  // La sera del primo giorno del weekend lungo, la carta del recupero (regola 8.9).
  const sabato = p.settimane.find((s) => s.indice === -8).sedute[0].giorno;
  const carta = oggiCosaFaccio(p, { livello: "verde" }, {}, sabato);
  assert.equal(carta.sera, T.CIBO.sera);
  assert.equal(carta.titolo, "Weekend lungo, primo giorno, 4 ore e 40");
});

test("le fatiche del piano per il semaforo e la modalità evento dal giorno 2", () => {
  const p = pianoDiLucia();
  const weekend = p.settimane.find((s) => s.indice === -8).sedute;
  const fatti = [{ id: "w1", giorno: weekend[0].giorno, inizio: `${weekend[0].giorno}T08:00:00`, tipo: "Ride", secondi: 4 * 3600, qualita: { secondi: "vera" } }];
  assert.deepEqual(fatichePiano(p, fatti, weekend[1].giorno), [{ tipo: "weekend", inizio: weekend[0].giorno, fine: weekend[1].giorno }]);
  assert.deepEqual(modoEventoPiano(p, fatti, weekend[1].giorno), { tipo: "weekend", giorno: 2, giorni: 2 });
  assert.equal(modoEventoPiano(p, [], weekend[1].giorno), null, "senza il giorno 1 fatto no");
  assert.ok(p.fatiche.some((f) => f.tipo === "prova"));
});

// --- I tetti, la media, lo scarico finale e le borse, sui casi dei revisori ---

const stimaDi = (id, giorni) => stimaH({ percorso: trovaPercorso(id), giorni, profilo: {}, oggi: "2026-11-01" });

test("le regole di 3.5 abbassano e non alzano, e i piani corti restano sotto h4 di più del 30% o del 20%", () => {
  // The Grand Escape Germany/Austria Classic in 4 giorni, 16 settimane prima, 6 ore a settimana,
  // 5 ore a settimana di storia, 45 anni. La −3 non sale mai sopra lo schema e le ore A.
  const partenza = trovaPercorso("tge-ga-classic").partenze[0];
  const oggi = lunediDi(partenza, 16);
  const p = pianoLungo({
    obiettivo: { percorso: "tge-ga-classic", giorni: 4, partenza }, stima: stimaDi("tge-ga-classic", 4), profilo: { eta: 45 },
    storico: { uscite: storia(oggi, 5, Math.max(1.5, 5 * 0.45)) }, disponibilita: { ore: 6 }, oggi,
  });
  const meno3 = p.settimane.find((s) => s.indice === -3);
  assert.ok(meno3.orePiene <= Math.min(meno3.oreSchema, 6) + 1e-6, `${meno3.orePiene} contro lo schema ${meno3.oreSchema}`);
  // Trentino Gravel Medio in 3 giorni a 6 settimane con h4 di 1,8 ore, il piano della regola 7.13.
  const tg = trovaPercorso("tg-medio");
  const oggiTg = lunediDi(tg.partenze[0], 6);
  const corto = pianoLungo({
    obiettivo: { percorso: "tg-medio", giorni: 3, partenza: tg.partenze[0] }, stima: stimaDi("tg-medio", 3), profilo: { eta: 45 },
    storico: { uscite: storia(oggiTg, 1.8, 1.5) }, disponibilita: { ore: 6 }, oggi: oggiTg,
  });
  assert.equal(corto.schema.nome, "7.13");
  for (const s of corto.settimane) assert.ok(s.orePiene <= 1.3 * 1.8 + 1e-6, `${s.indice} ${s.orePiene}`);
  assert.equal(corto.fattibilita.corto, true, "e le prove non bastano, quindi parte 2.8");
  // Tuscany Trail Originale in 4 giorni a 5 settimane con h4 di 2,25 ore, la regola 7.14.
  const tt = trovaPercorso("tt-originale");
  const oggiTt = lunediDi(tt.partenze[0], 5);
  const quattordici = pianoLungo({
    obiettivo: { percorso: "tt-originale", giorni: 4, partenza: tt.partenze[0] }, stima: stimaDi("tt-originale", 4), profilo: { eta: 45 },
    storico: { uscite: storia(oggiTt, 2.25, 1.5) }, disponibilita: { ore: 6 }, oggi: oggiTt,
  });
  assert.equal(quattordici.schema.nome, "7.14");
  for (const s of quattordici.settimane) assert.ok(s.orePiene <= 1.2 * 2.25 + 1e-6, `${s.indice} ${s.orePiene}`);
  // Tuscany Trail Newbie con Detour in 3 giorni, 16 settimane, 6 ore, h4 5. Dopo la settimana del
  // weekend oltre il 150% del solito, quella del test lungo con le borse resta al 70%.
  const nd = trovaPercorso("tt-newbie-detour");
  const oggiNd = lunediDi(nd.partenze[0], 16);
  const uscite = storia(oggiNd, 5, 2.25);
  const newbie = pianoLungo({
    obiettivo: { percorso: "tt-newbie-detour", giorni: 3, partenza: nd.partenze[0] }, stima: stimaDi("tt-newbie-detour", 3), profilo: { eta: 45 },
    storico: { uscite }, disponibilita: { ore: 6 }, oggi: oggiNd,
  });
  const errori = violazioni(newbie, { nome: "Newbie con Detour", eta: 45, disp: { ore: 6 }, uscite });
  assert.deepEqual(errori.filter((e) => e.startsWith("2 ")), []);
});

test("i tetti scelti per sabato, domenica e venerdì valgono anche per le sedute chiave (3.1 e 3.7)", () => {
  const tt = trovaPercorso("tt-originale");
  const partenza = tt.partenze[0];
  const oggi = lunediDi(partenza, 12);
  const piano = (disponibilita, id = "tt-originale", giorni = 4, h = 7.5) => pianoLungo({
    obiettivo: { percorso: id, giorni, partenza: trovaPercorso(id).partenze[0] }, stima: { H: h, giorni }, profilo: { eta: 45 },
    storico: { uscite: storia(lunediDi(trovaPercorso(id).partenze[0], 12), 7, 3.5) }, disponibilita, oggi: lunediDi(trovaPercorso(id).partenze[0], 12),
  });
  const sedute = (p) => p.settimane.flatMap((s) => s.giorni.flatMap((g) => g.sedute.filter((x) => BICI.has(x.tipo)).map((x) => ({ ...x, giorno: g.giorno, settimana: s }))));
  // La domenica fino a 2 ore, il giorno 2 di weekend e prova generale non la passa, e lo dice.
  const domenica = piano({ giorni: [1, 3, 5, 6], stella: 5, tetti: { 6: 120 }, ore: 10 });
  const giorni2 = sedute(domenica).filter((x) => dow(x.giorno) === 6);
  assert.ok(giorni2.length > 0);
  assert.ok(giorni2.every((x) => x.minuti <= 120 + 0.5), giorni2.map((x) => `${x.tipo} ${x.minuti}`).join(", "));
  const avviso = domenica.settimane.flatMap((s) => s.avvisi).find((a) => a.tipo === "tettoGiorno");
  assert.ok(avviso, "le ore che mancano si scrivono");
  controllaTesto(avviso.testo, "tetto del giorno");
  assert.match(avviso.testo, /perché domenica puoi pedalare fino a 2 ore\. Va bene così, non si recuperano\.$/);
  // Il sabato fino a 3 ore, la lunga e il test lungo con le borse vanno di domenica, intere.
  const sabato = piano({ giorni: [1, 3, 5, 6], stella: 5, tetti: { 5: 180 }, ore: 10 });
  assert.ok(sedute(sabato).filter((x) => dow(x.giorno) === 5).every((x) => x.minuti <= 180 + 0.5));
  const lunghe = sabato.settimane.flatMap((s) => s.sedute).filter((x) => ["lunga", "T2"].includes(x.tipo) && x.ore > 3);
  assert.ok(lunghe.length > 0 && lunghe.every((x) => dow(x.giorno) === 6), lunghe.map((x) => `${x.tipo} ${x.giorno} ${x.ore}`).join(", "));
  // Il venerdì fino a un'ora, il blocco di un viaggio di 20 giorni non lo passa.
  const venerdi = piano({ giorni: [1, 3, 4, 5, 6], stella: 5, tetti: { 4: 60 }, ore: 12 }, "ffp-completo", 20, 9);
  const blocco = sedute(venerdi).filter((x) => x.tipo === "blocco");
  assert.equal(blocco.length, 3);
  assert.ok(sedute(venerdi).filter((x) => dow(x.giorno) === 4).every((x) => x.minuti <= 60 + 0.5));
});

test("la media mai il giorno prima della seduta chiave né nel weekend, e se non c'è un giorno la pagina lo dice", () => {
  const tt = trovaPercorso("tt-originale");
  const partenza = tt.partenze[0];
  const oggi = lunediDi(partenza, 12);
  const conGiorni = (giorni) => pianoLungo({
    obiettivo: { percorso: "tt-originale", giorni: 4, partenza }, stima: { H: 7.5, giorni: 4 }, profilo: { eta: 45 },
    storico: { uscite: storia(oggi, 6, 3) }, disponibilita: { giorni, stella: 5, ore: 10 }, oggi,
  });
  for (const giorni of [[4, 5, 6], [5, 6]]) {
    const p = conGiorni(giorni);
    const chiave = new Set(p.settimane.flatMap((s) => s.sedute.map((x) => x.giorno)));
    for (const s of p.settimane) {
      for (const g of s.giorni) {
        const media = g.sedute.find((x) => x.tipo === "media" || x.tipo === "richiamo");
        if (media) assert.ok(dow(g.giorno) <= 4 && !chiave.has(piu(g.giorno, 1)), `${giorni} ${g.giorno}`);
      }
    }
    const senza = p.settimane.filter((s) => !s.giorni.some((g) => g.sedute.some((x) => x.tipo === "media" || x.tipo === "richiamo")) && s.giorni.filter((g) => !g.fuori).length === 7);
    assert.ok(senza.length > 0, `${giorni}`);
    for (const s of senza) {
      assert.ok(s.avvisi.some((a) => ["mediaSalta", "richiamoSalta"].includes(a.tipo)), `${giorni} ${s.indice}`);
      for (const a of s.avvisi) controllaTesto(a.testo, "avviso della settimana");
    }
  }
  // Il venerdì prima di una lunga del sabato non porta più la media, nemmeno la terza volta.
  const venerdi = conGiorni([4, 5, 6]);
  assert.ok(venerdi.settimane.every((s) => s.giorni.filter((g) => dow(g.giorno) === 4).every((g) => !g.sedute.some((x) => x.tipo === "media"))));
});

test("nello scarico finale mai più di tre giorni di fila senza bici, anche prima del via (3.6)", () => {
  const ur = trovaPercorso("ur-pa-corto");
  const partenza = ur.partenze[0];
  const oggi = lunediDi(partenza, 12);
  for (const disponibilita of [{ giorni: [0, 1, 2, 3, 4, 5, 6], tetti: { 0: 120, 1: 120, 2: 120, 3: 120, 4: 120, 5: 120, 6: 120 }, ore: 6 }, { ore: 6 }]) {
    const p = pianoLungo({ obiettivo: { percorso: "ur-pa-corto", giorni: 1, partenza }, stima: stimaDi("ur-pa-corto", 1), profilo: { eta: 45 }, storico: { uscite: storia(oggi, 5, 2.5) }, disponibilita, oggi });
    const giorni = new Map(p.settimane.flatMap((s) => s.giorni.filter((g) => !g.fuori)).map((g) => [g.giorno, g]));
    let serie = 0;
    for (const d of p.tapering.giorni.map((g) => g.giorno)) {
      serie = giorni.get(d).sedute.some((x) => BICI.has(x.tipo)) ? 0 : serie + 1;
      assert.ok(serie <= 3, `${d} ${serie} giorni senza bici`);
    }
    const prima = [1, 2, 3, 4].map((k) => giorni.get(piu(partenza, -k)));
    assert.ok(prima.some((g) => g.sedute.some((x) => BICI.has(x.tipo))), "un giro nei quattro giorni prima del via");
    for (const s of p.settimane.filter((x) => x.tipo === "tapering")) {
      const messe = s.giorni.flatMap((g) => g.sedute).filter((x) => BICI.has(x.tipo)).reduce((t, x) => t + x.minuti, 0) / 60;
      assert.ok(messe <= s.ore * 1.02 + 0.05, `${s.indice} ${messe} contro ${s.ore}`);
    }
  }
});

test("le borse dell'obiettivo libero e l'evento in e-bike entrano nel piano come nel verdetto", () => {
  // Un giro libero di 120 km e 1.500 m su strada, anche con le borse, fra 12 settimane.
  const partenza = "2027-06-12";
  const oggi = lunediDi(partenza, 12);
  const libero = percorsoLibero({ tipo: "giro", km: 120, metri: 1500, fondo: "strada", conBorse: true });
  const atleta = { sportSettings: [{ types: ["Ride"], ftp: 220 }] };
  const stima = stimaH({ percorso: libero, giorni: 1, atleta, oggi });
  const p = pianoLungo({ obiettivo: { percorso: libero, giorni: 1, partenza }, stima, profilo: { eta: 45 }, storico: { uscite: storia(oggi, 6, 3) }, disponibilita: { ore: 8 }, oggi, atleta });
  assert.deepEqual(p.obiettivi.prove, ["unGiorno"]);
  const carica = p.settimane.flatMap((s) => s.sedute).find((x) => x.tipo === "unGiorno");
  assert.ok(carica && carica.borse === "evento" && carica.ore >= 3, JSON.stringify(carica));
  const r = valutaProntezza({ percorso: libero, giorni: 1, partenza, oggi, uscite: storia(oggi, 6, 3), piano: p, stima, atleta, oreDisponibili: 8 });
  assert.ok(!r.righe.some((x) => /non ancora in programma/.test(x.testo)), r.righe.map((x) => x.testo).join(" | "));
  // Sedici settimane di e-bike, con l'evento in e-bike l'e-bike conta per intero (2.2).
  const oggiE = "2027-02-01";
  const ebike = storia(oggiE, 7, 4, 16).map((a) => ({ ...a, tipo: "EBikeRide", eBike: true }));
  const intero = leggiStorico({ uscite: ebike, eBikeEvento: true }, oggiE);
  vicino(intero.h4, 7, 1e-6);
  vicino(intero.l30, 4, 1e-6);
  const meta = leggiStorico({ uscite: ebike }, oggiE);
  vicino(meta.h4, 3.5, 1e-6);
  const pe = pianoLungo({ obiettivo: { percorso: "tt-originale", giorni: 4, partenza: PARTENZA_LUCIA }, stima: { H: 6, giorni: 4, fonte: { tipo: "ebike" } }, profilo: { eta: 45, ebike: true }, storico: { uscite: ebike }, disponibilita: { ore: 10 }, oggi: oggiE });
  assert.equal(pe.obiettivo.eBike, true);
  const pm = pianoLungo({ obiettivo: { percorso: "tt-originale", giorni: 4, partenza: PARTENZA_LUCIA }, stima: { H: 6, giorni: 4 }, profilo: { eta: 45 }, storico: { uscite: ebike }, disponibilita: { ore: 10 }, oggi: oggiE });
  assert.ok(pe.settimane[0].orePiene > pm.settimane[0].orePiene + 0.5, `${pe.settimane[0].orePiene} contro ${pm.settimane[0].orePiene}`);
  assert.ok(pe.settimane[0].sedute[0].ore > pm.settimane[0].sedute[0].ore + 0.2, `la prima lunga ${pe.settimane[0].sedute[0].ore} contro ${pm.settimane[0].sedute[0].ore}`);
  // E il giorno 1 di un weekend fatto in e-bike conta per intero per la modalità evento.
  const weekend = pe.settimane.flatMap((s) => s.sedute).filter((x) => x.tipo === "weekend");
  const giro = { id: "e1", giorno: weekend[0].giorno, inizio: `${weekend[0].giorno}T08:00:00`, tipo: "EBikeRide", eBike: true, secondi: Math.round(weekend[0].ore * 0.7 * 3600), qualita: { secondi: "vera" } };
  assert.deepEqual(modoEventoPiano(pe, [giro], weekend[1].giorno), { tipo: "weekend", giorno: 2, giorni: 2 });
  assert.equal(modoEventoPiano(pe, [giro], weekend[1].giorno, { eBikeEvento: false }), null, "a metà non basta");
});

// --- Il piano rifatto ogni lunedì (3.12) ---

// Segue il piano alla lettera, a una quota delle ore, e lo rifà ogni lunedì con il piano salvato.
// Ogni seduta in bici diventa un'uscita, con le borse e la notte fuori delle prove. fino è il lunedì
// dell'ultimo piano rifatto, e da ferma in poi non si pedala più.
function seguiAllaLettera(ingressi, { fino = null, quota = 1, ferma = null } = {}) {
  const partenza = ingressi.obiettivo.partenza || null;
  const uscite = [...ingressi.storico.uscite];
  let piano = pianoLungo(ingressi);
  const piani = [piano];
  for (let i = 0; i < 40; i++) {
    const corrente = piano.settimane.find((s) => !s.passata);
    if (!corrente) break;
    for (const g of corrente.giorni) {
      if (g.fuori || (ferma && g.giorno >= ferma)) continue;
      for (const x of g.sedute) {
        if (!BICI.has(x.tipo) || !(x.minuti > 0)) continue;
        contatore += 1;
        const secondi = Math.round(x.minuti * 60 * quota);
        uscite.push({
          id: `l${contatore}`, giorno: g.giorno, inizio: `${g.giorno}T08:00:00`, tipo: "Ride", sorgente: "WAHOO", secondi,
          borse: x.borse === "evento" ? "evento" : secondi >= 2 * 3600 ? "no" : null, notteFuori: x.notteFuori === true,
          rulli: false, eBike: false, stub: false, commute: false, qualita: { secondi: "vera" },
        });
      }
    }
    const oggi = piu(corrente.lunedi, 7);
    if ((partenza && oggi >= partenza) || (fino && oggi > fino)) break;
    piano = pianoLungo({ ...ingressi, oggi, storico: { ...ingressi.storico, uscite, piano } });
    piani.push(piano);
  }
  return { piani, uscite };
}

const proveDel = (p) => p.settimane.flatMap((s) => s.sedute).filter((x) => ["T1", "T2", "T3", "prova", "blocco", "weekendCarico"].includes(x.tipo)).map((x) => `${x.tipo} ${x.giorno}`);

test("il piano rifatto ogni lunedì seguendolo alla lettera tiene lo schema e le date delle prove (3.3 e 3.12)", () => {
  // Lucia, Tuscany Trail Originale in 4 giorni, partenza giovedì 20 maggio 2027, piano nato lunedì
  // 1 febbraio con lo schema A.
  const oggi = "2027-02-01";
  const partenza = "2027-05-20";
  const ingressi = {
    obiettivo: { percorso: "tt-originale", giorni: 4, partenza }, stima: { H: 7.9, giorni: 4 }, profilo: { eta: 45 },
    storico: { uscite: storia(oggi, 5.5, 3) }, disponibilita: { ore: 10 }, oggi,
  };
  const { piani, uscite } = seguiAllaLettera(ingressi);
  assert.ok(piani.length >= 15, `${piani.length} piani`);
  const prove = proveDel(piani[0]);
  assert.deepEqual(prove, ["T1 2027-03-13", "T2 2027-04-03", "T3 2027-04-24", "T3 2027-04-25"]);
  for (const p of piani) {
    assert.equal(p.schema.nome, "A", `schema del piano del ${p.creato}`);
    assert.deepEqual(proveDel(p), prove, `prove del piano del ${p.creato}`);
    assert.equal(p.inizio, oggi);
    assert.ok(!p.avvisi.some((a) => a.tipo === "adattare"), `${p.creato}`);
  }
  // Le settimane passate restano com'erano, e la settimana di oggi è la prima non passata.
  const p19 = piani.find((p) => p.creato === "2027-04-19");
  assert.deepEqual(p19.settimane.filter((s) => s.passata).map((s) => s.lunedi), piani[0].settimane.filter((s) => s.lunedi < "2027-04-19").map((s) => s.lunedi));
  assert.equal(p19.giorni[0].giorno, "2027-04-19");
  // «Pronto?» con il piano rifatto il 19 aprile, il venerdì prima della prova generale e la sera del
  // suo primo giorno.
  const stima = { H: 7.9, T: 31.6, livello: 1, giorni: 4 };
  for (const [giorno, fino] of [["2027-04-23", "2027-04-22"], ["2027-04-24", "2027-04-24"]]) {
    const fatte = uscite.filter((a) => a.giorno <= fino);
    const r = valutaProntezza({ percorso: trovaPercorso("tt-originale"), giorni: 4, partenza, oggi: giorno, uscite: fatte, piano: p19, stima, oreDisponibili: 10 });
    assert.equal(r.proiezione.frase, "Se segui il piano, ci arrivi pronto.", giorno);
  }
  // I controlli che guardano i giorni passati li trovano nel piano rifatto (3.5 punto 8, 4.5 e 4.6).
  const p29 = piani.find((p) => p.creato === "2027-03-29");
  assert.deepEqual(fatichePiano(p29, uscite, "2027-03-30"), fatichePiano(piani[0], uscite, "2027-03-30"));
  assert.ok(fatichePiano(p29, uscite, "2027-03-30").some((f) => f.fine === "2027-03-28"), "il weekend del 27 e 28 marzo");
});

test("rifatto il lunedì dopo un weekend cominciato la domenica, il giorno 2 resta e vale la modalità evento", () => {
  // Paolo, Tuscany Trail Originale con Detour in 7 giorni, disponibile lunedì, martedì, giovedì e
  // domenica con la stella la domenica, 12 ore, piano nato il 25 gennaio (schema C).
  const oggi = "2027-01-25";
  const partenza = "2027-05-20";
  const ingressi = {
    obiettivo: { percorso: "tt-originale-detour", giorni: 7, partenza }, stima: { H: 7, giorni: 7 }, profilo: { eta: 45 },
    storico: { uscite: storia(oggi, 7, 3.5) }, disponibilita: { giorni: [0, 1, 3, 6], stella: 6, ore: 12 }, oggi,
  };
  const { piani, uscite } = seguiAllaLettera(ingressi, { fino: "2027-03-29" });
  const primo = piani[0];
  assert.equal(primo.schema.nome, "C");
  for (const p of piani) assert.deepEqual(proveDel(p), proveDel(primo), `${p.creato}`);
  // Il weekend della −12 è domenica 28 febbraio e lunedì 1 marzo.
  const weekend = primo.settimane.find((s) => s.lunedi === "2027-02-22").sedute;
  assert.deepEqual(weekend.map((x) => [x.tipo, x.giorno, x.parte]), [["weekend", "2027-02-28", 1], ["weekend", "2027-03-01", 2]]);
  const rifatto = piani.find((p) => p.creato === "2027-03-01");
  const lunedi = rifatto.giorni[0];
  const giorno2 = lunedi.sedute.find((x) => x.chiave);
  assert.ok(giorno2 && giorno2.tipo === "weekend" && giorno2.parte === 2, JSON.stringify(lunedi.sedute.map((x) => x.tipo)));
  vicino(giorno2.minuti, weekend[1].ore * 60, 1);
  assert.ok(!lunedi.sedute.some((x) => x.tipo === "media"), "niente giro con le salite al posto del giorno 2");
  assert.deepEqual(modoEventoPiano(rifatto, uscite, "2027-03-01"), { tipo: "weekend", giorno: 2, giorni: 2 });
  // Il martedì dopo la fine del weekend è riposo o recupero, e il giorno 2 conta fra le fatiche.
  assert.ok(rifatto.giorni[1].sedute.every((x) => !BICI.has(x.tipo) || x.tipo === "recupero"), JSON.stringify(rifatto.giorni[1].sedute.map((x) => x.tipo)));
  assert.ok(fatichePiano(rifatto, uscite, "2027-03-02").some((f) => f.inizio === "2027-02-28" && f.fine === "2027-03-01"));
  // La domenica dopo, il controllo lascia fuori il weekend e le 72 ore dopo anche con il piano rifatto.
  const notti = conCambi(["2027-03-01", "2027-03-02", "2027-03-03", "2027-03-04"], { sonno: 6 * 3600 });
  const domenica = controlloDomenica(mattine(notti), [], {}, rifatto, { oggi: "2027-03-07" });
  assert.equal(domenica.segnali.S3, false);
  assert.equal(controlloDomenica(mattine(notti), [], {}, null, { oggi: "2027-03-07" }).segnali.S3, true, "senza il piano contano");
});

test("dopo una pausa i giorni persi si contano anche sul piano rifatto, e così le ore sotto il piano", () => {
  const oggi = "2027-01-25";
  const partenza = "2027-05-20";
  const ingressi = {
    obiettivo: { percorso: "tt-originale", giorni: 4, partenza }, stima: { H: 7.9, giorni: 4 }, profilo: { eta: 45 },
    storico: { uscite: storia(oggi, 5.5, 3) }, disponibilita: { ore: 10 }, oggi,
  };
  // Ultimo giro sabato 13 febbraio, poi niente. Il piano si rifà lunedì 15 e lunedì 22.
  const { piani, uscite } = seguiAllaLettera(ingressi, { fino: "2027-02-22", ferma: "2027-02-14" });
  const p22 = piani.find((p) => p.creato === "2027-02-22");
  assert.ok(p22, "piano del 22 febbraio");
  // I 12 giorni dal 14 al 25 febbraio senza giri, con le ore del piano, anche quelle della settimana
  // passata che il piano rifatto ha copiato.
  assert.ok(giorniPersi(p22, uscite, "2027-02-26") >= 12, `${giorniPersi(p22, uscite, "2027-02-26")} giorni`);
  // Seguito all'80% per sei settimane, «Pronto?» lo dice con il piano rifatto.
  const lento = seguiAllaLettera({ ...ingressi, storico: { uscite: storia(oggi, 5.5, 3) } }, { fino: "2027-03-08", quota: 0.8 });
  const p8 = lento.piani[lento.piani.length - 1];
  const r = valutaProntezza({ percorso: trovaPercorso("tt-originale"), giorni: 4, partenza, oggi: "2027-03-10", uscite: lento.uscite, piano: p8, stima: { H: 7.9, T: 31.6, livello: 1, giorni: 4 }, oreDisponibili: 10 });
  assert.ok(r.proiezione.sottoPiano, "le ore sotto il piano");
  const quota = r.proiezione.sottoPiano.fatte / r.proiezione.sottoPiano.piano;
  assert.ok(quota > 0.7 && quota < 0.85, `${quota}`);
});

test("lo scarico finale guarda le ore fatte delle settimane passate, se sono meno di quelle previste (3.6)", () => {
  const oggi = "2027-02-01";
  const partenza = "2027-05-20";
  const ingressi = {
    obiettivo: { percorso: "tt-originale", giorni: 4, partenza }, stima: { H: 7.9, giorni: 4 }, profilo: { eta: 45 },
    storico: { uscite: storia(oggi, 5.5, 3) }, disponibilita: { ore: 10 }, oggi,
  };
  const pieno = seguiAllaLettera(ingressi, { fino: "2027-04-26" });
  const meno = seguiAllaLettera(ingressi, { fino: "2027-04-26", quota: 0.7 });
  const vRif = (r) => r.piani[r.piani.length - 1].tapering.vRif;
  vicino(vRif(pieno), pieno.piani[0].tapering.vRif, 0.15, "seguito alla lettera, come previsto");
  assert.ok(vRif(meno) < vRif(pieno) - 1, `${vRif(meno)} contro ${vRif(pieno)}`);
  // Con più ore di quelle previste vale la previsione, mai le ore in più.
  const piu12 = seguiAllaLettera(ingressi, { fino: "2027-04-26", quota: 1.3 });
  const ultimo = piu12.piani[piu12.piani.length - 1];
  const vere = ultimo.settimane.filter((s) => s.passata && s.indice >= -10).map((s) => piu12.uscite.filter((a) => a.giorno >= s.lunedi && a.giorno <= piu(s.lunedi, 6)).reduce((t, a) => t + a.secondi / 3600, 0));
  const previste = ultimo.settimane.filter((s) => s.passata && s.indice >= -10).map((s) => s.orePiene);
  assert.equal(vere.length, 7);
  vere.forEach((ore, i) => assert.ok(ore > previste[i] + 0.5, `settimana ${i}, ${ore} contro ${previste[i]}`));
  const conLePreviste = [...previste, ultimo.settimane.find((s) => s.indice === -3).orePiene].reduce((t, x) => t + x, 0) / 8;
  vicino(vRif(piu12), conLePreviste, 1e-6, "le ore previste delle settimane passate");
});

test("senza data il piano rifatto ogni lunedì tiene lo scarico ogni quattro settimane", () => {
  const oggi = "2027-01-04";
  const ingressi = { obiettivo: {}, stima: null, profilo: { eta: 45 }, storico: { uscite: storia(oggi, 6, 3, 8) }, disponibilita: { ore: 6 }, oggi };
  const { piani } = seguiAllaLettera(ingressi, { fino: "2027-03-22" });
  const tipi = piani.map((p) => p.settimane.find((s) => !s.passata).tipo);
  assert.equal(tipi.length, 12);
  assert.deepEqual(tipi, ["base", "base", "base", "S", "base", "base", "base", "S", "base", "base", "base", "S"]);
  // A 52 anni con il 2+1, ogni tre.
  const a52 = seguiAllaLettera({ ...ingressi, profilo: { eta: 52 } }, { fino: "2027-02-08" });
  assert.deepEqual(a52.piani.map((p) => p.settimane.find((s) => !s.passata).tipo), ["base", "base", "S", "base", "base", "S"]);
});

// --- Le regole che nessun piano deve violare (9.4) ---

const DISPONIBILITA = {
  poca: { giorni: [1, 3, 5, 6], stella: 5, tetti: { 1: 60, 3: 60 }, ore: 4 },
  media: { ore: 6 },
  tanta: { giorni: [0, 1, 2, 3, 4, 5, 6], stella: 5, tetti: { 0: 120, 1: 120, 2: 120, 3: 120, 4: 120 }, ore: 12 },
  // Con il tetto anche sul weekend, scelto in Impostazioni, che vale anche per le sedute chiave (3.1).
  weekendCorto: { giorni: [1, 3, 4, 5, 6], stella: 5, tetti: { 4: 60, 5: 180, 6: 120 }, ore: 8 },
};
const H4 = { poca: 3, media: 5, tanta: 8, weekendCorto: 5 };

// Le ore di una settimana contate per la media di 3, uno scarico come la settimana prima (regola 2.6).
const CALO = new Set(["S", "F", "F7", "tapering"]);
function mediaTreDi(storia, fino) {
  const valori = [];
  for (let i = fino - 1; i >= 0 && valori.length < 3; i--) {
    let j = i;
    while (j > 0 && CALO.has(storia[j].tipo)) j -= 1;
    valori.push(storia[j].ore);
  }
  return valori.length ? valori.reduce((t, x) => t + x, 0) / valori.length : null;
}

// Le regole di 9.4 su un piano. ingresso ha nome, eta, disp, uscite, dueCose, borseKg ed esperienza.
// Restituisce la lista delle regole violate, con un messaggio.
function violazioni(p, ingresso) {
  const errori = [];
  const no = (regola, messaggio) => errori.push(`${regola} ${ingresso.nome} ${messaggio}`);
  const partenza = p.obiettivo.data;
  const dueUno = ingresso.eta >= 50;
  const disp = leggiDisponibilita(ingresso.disp);
  const settimane = p.settimane;
  const giorni = new Map();
  for (const s of settimane) for (const g of s.giorni) if (!g.fuori) giorni.set(g.giorno, { ...g, settimana: s });
  const gg = (d) => giorni.get(d);

  // 1. Almeno un giorno a settimana senza bici e senza palestra.
  for (const s of settimane) {
    const dentro = s.giorni.filter((g) => !g.fuori);
    if (dentro.length >= 3 && !dentro.some((g) => g.sedute.every((x) => x.tipo === "riposo"))) no(1, `settimana ${s.indice}`);
  }
  // 2. Le settimane normali nel tetto della regola 2.6.
  const storiaOre = [];
  for (let w = 4; w >= 1; w--) {
    const l = piu(settimane[0].lunedi, -7 * w);
    let ore = 0;
    for (const a of ingresso.uscite) if (a.giorno >= l && a.giorno <= piu(l, 6)) ore += a.secondi / 3600;
    storiaOre.push({ ore, tipo: "N" });
  }
  const storiaVera = storiaOre.map((x) => ({ ...x }));
  for (const s of settimane) {
    const piena = s.orePiene ?? s.ore;
    if (["base", "N"].includes(s.tipo) && piena > tettoSettimana(storiaOre) + 1e-6 && piena > PIANO.lungaDichiarata.minimo + 1 + 1e-6) no(2, `${s.indice} ${piena} oltre ${tettoSettimana(storiaOre)}`);
    storiaOre.push({ ore: piena, tipo: s.tipo });
  }
  // 2b. Le regole di 3.5 possono solo abbassare le ore dello schema (3.4). Le settimane normali e di
  // base mai sopra le ore dello schema e le ore A, i piani corti mai sopra h4 di oltre il 30% (7.13)
  // o il 20% (7.14), e dopo un blocco o una settimana oltre il 150% del solito al massimo il 70% del
  // solito (regola 2.7). La settimana minima di un'ora di lunga e della media vale sempre, salvo il
  // tetto dei piani corti.
  const minima = PIANO.lungaDichiarata.minimo + PIANO.sedute.media.minimo / 60;
  const oggiPiano = settimane[0].dal;
  const oreH4 = ingresso.uscite.filter((a) => a.giorno >= piu(oggiPiano, -28) && a.giorno < oggiPiano).reduce((t, a) => t + a.secondi / 3600, 0) / 4;
  const tettoCorto = { "7.13": 1.3, "7.14": 1.2 }[p.schema.nome];
  const storia6 = storiaVera.map((x) => ({ ...x }));
  for (const s of settimane) {
    const piena = s.orePiene ?? s.ore;
    if (["base", "N"].includes(s.tipo)) {
      if (s.oreSchema !== null && piena > Math.max(s.oreSchema, minima) + 1e-6) no(2, `${s.indice} ${piena} oltre lo schema ${s.oreSchema}`);
      if (piena > Math.max(disp.ore, minima) + 1e-6) no(2, `${s.indice} ${piena} oltre le ore A ${disp.ore}`);
    }
    if (tettoCorto && piena > tettoCorto * Math.max(oreH4, PIANO.base.oreMinime) + 1e-6) no(2, `${p.schema.nome} ${s.indice} ${piena} oltre h4 ${oreH4}`);
    const prima = storia6[storia6.length - 1];
    const solito = mediaTreDi(storia6, storia6.length - 1);
    if (["base", "N", "E", "S"].includes(s.tipo) && prima && solito !== null && (prima.blocco || prima.ore > 1.5 * solito + 1e-9)) {
      if (piena > Math.max(0.7 * solito, minima) + 1e-6) no(2, `${s.indice} ${piena} dopo una settimana grande, oltre il 70% di ${solito}`);
    }
    storia6.push({ ore: piena, tipo: s.tipo, blocco: s.sedute.some((x) => x.tipo === "blocco") });
  }
  // 3. Nessuna lunga, giorno 1 o giorno del blocco oltre il passo.
  const lunghe = new Map();
  for (const a of ingresso.uscite) lunghe.set(a.giorno, Math.max(lunghe.get(a.giorno) || 0, a.secondi / 3600));
  for (const [d, g] of giorni) {
    const m = Math.max(0, ...g.sedute.filter((x) => BICI.has(x.tipo)).map((x) => x.minuti / 60));
    if (m > 0) lunghe.set(d, m);
  }
  for (const s of settimane) {
    for (const x of s.sedute) {
      if (PIU.has(x.tipo) && x.tipo !== "blocco" && (x.parte || 1) > 1) continue;
      let l30 = 0;
      for (let k = 1; k <= 30; k++) l30 = Math.max(l30, lunghe.get(piu(x.giorno, -k)) || 0);
      if (x.ore > passoLunga(Math.max(1, l30)) + 0.01) no(3, `${x.tipo} ${x.giorno} ${x.ore} oltre ${passoLunga(Math.max(1, l30))}`);
    }
  }
  // 4. Mai più di 3 settimane di carico di fila, 2 con il 2+1.
  let serie = 0;
  for (const s of settimane) {
    serie = ["base", "N", "E"].includes(s.tipo) ? serie + 1 : 0;
    if (serie > (dueUno ? 2 : 3)) no(4, `${s.indice}`);
  }
  // 5. Lo scarico finale con i fattori di 3.6 entro il 2%, e almeno l'80% delle uscite.
  if (p.tapering) {
    const vol = new Map(p.tapering.giorni.map((g) => [g.giorno, g.ore]));
    const prima = settimane.filter((s) => s.tipo !== "tapering").pop();
    const usciteDi = (s) => s.giorni.reduce((n, g) => n + g.sedute.filter((x) => BICI.has(x.tipo)).length, 0);
    for (const s of settimane) {
      const dentro = s.giorni.filter((g) => !g.fuori);
      if (!dentro.length || !dentro.every((g) => vol.has(g.giorno))) continue;
      const atteso = dentro.reduce((t, g) => t + vol.get(g.giorno), 0);
      const schema = ["A", "B", "C", "D"].includes(p.schema.nome);
      if (schema && Math.abs(s.ore - atteso) > 0.02 * atteso + 1e-6) no(5, `${s.indice} ${s.ore} contro ${atteso}`);
      if (!schema && s.ore > atteso * 1.02 + 1e-6) no(5, `${s.indice} ${s.ore} oltre ${atteso}`);
      const messe = s.giorni.reduce((t, g) => t + g.sedute.filter((x) => BICI.has(x.tipo)).reduce((u, x) => u + x.minuti, 0), 0) / 60;
      if (messe > s.ore * 1.02 + 0.05) no(5, `${s.indice} messe ${messe} oltre ${s.ore}`);
      // Le uscite, l'80% di quelle dell'ultima settimana prima dello scarico finale, quando ci stanno.
      if (prima && s.tipo === "tapering" && dentro.length === 7) {
        const possibili = dentro.filter((g) => g.disponibile).length - 1;
        const minuti = s.ore * 60;
        const stanno = minuti >= PIANO.sedute.richiamo.minimo ? 1 + Math.floor((minuti - PIANO.sedute.richiamo.minimo) / PIANO.facileBreve + 1e-9) : 0;
        const servono = Math.min(Math.ceil(0.8 * usciteDi(prima) - 1e-9), possibili, stanno);
        if (usciteDi(s) < servono) no(5, `${s.indice} uscite ${usciteDi(s)} contro ${servono}`);
      }
    }
    // Mai più di 3 giorni di fila senza bici nello scarico finale (3.6), quando un giorno della serie
    // nella stessa settimana poteva avere un giro e la settimana aveva minuti da spostare.
    const minimoDi = (x) => (x.chiave ? 60 : x.tipo === "media" ? PIANO.sedute.media.minimo : x.tipo === "richiamo" ? PIANO.sedute.richiamo.minimo : PIANO.facileBreve);
    const margine = (s) => {
      const giri = s.giorni.flatMap((g) => g.sedute).filter((x) => BICI.has(x.tipo) && !x.portata);
      const messe = giri.reduce((t, x) => t + x.minuti, 0);
      return Math.max(0, s.ore * 60 - messe) + giri.reduce((t, x) => t + Math.max(0, x.minuti - minimoDi(x)), 0);
    };
    let serie = [];
    for (const d of p.tapering.giorni.map((g) => g.giorno)) {
      const g = gg(d);
      if (!g || g.sedute.some((x) => BICI.has(x.tipo))) {
        serie = [];
        continue;
      }
      serie.push(g);
      if (serie.length <= PIANO.tapering.giorniSenzaBici) continue;
      const stessa = serie.filter((h) => h.settimana === g.settimana);
      const regge = (h) => h.disponibile && !h.riservato && h.limite !== "riposo" && h.tetto >= 5 && (ingresso.dueCose || !h.sedute.some((x) => x.tipo === "palestra"));
      if (stessa.some(regge) && margine(g.settimana) >= 5) {
        no(5, `${serie.length} giorni di fila senza bici fino al ${d}`);
        serie = [];
      }
    }
  }
  // 6. L'ultimo test pieno finisce almeno 21 giorni prima.
  for (const s of settimane) for (const x of s.sedute) {
    if (["T2", "T3", "prova", "weekendCarico", "blocco"].includes(x.tipo) && fra(x.giorno, partenza) < PRONTEZZA.giorniProvaFinita) no(6, `${x.tipo} ${x.giorno}`);
  }
  // 7. La palestra di gambe lontana dalle uscite lunghe, dalle fatiche e dalla partenza.
  let ultimaPesante = null;
  let famSola = false;
  for (const [d, g] of giorni) {
    for (const x of g.sedute) {
      if (x.tipo !== "palestra" || !x.gambe) continue;
      const fase = g.settimana.fase || {};
      if (fase.gambeFinoA === PIANO.palestra.ultimaPesanteFamiliarizzazione.a) famSola = true;
      for (let k = 1; k <= (fase.settimanaBlocco <= 4 ? 2 : 1); k++) {
        const h = gg(piu(d, k));
        if (h && h.sedute.some((y) => BICI.has(y.tipo) && y.minuti > 180)) no(7, `gambe ${d} prima di un'uscita lunga a +${k}`);
      }
      if (!ultimaPesante || d > ultimaPesante) ultimaPesante = d;
    }
  }
  if (ultimaPesante) {
    // Mai più vicina di 8 giorni (14 con la sola familiarizzazione), e nella finestra di 8-10 giorni
    // (14) quando lì c'era un giorno buono, cioè senza sedute chiave o media, fuori dai 2 giorni dopo
    // le fatiche e non il giorno prima di un'uscita di oltre 3 ore.
    const d = fra(ultimaPesante, partenza);
    const [a, da] = famSola ? [14, 14] : [8, 10];
    if (d < a) no(7, `ultima pesante a ${d} giorni`);
    const fatiche = [];
    for (const s of settimane) {
      const multi = s.sedute.filter((x) => PIU.has(x.tipo));
      if (multi.length) fatiche.push(multi[multi.length - 1].giorno);
      for (const x of s.sedute) if ((PROVE.has(x.tipo) && !PIU.has(x.tipo)) || x.ore >= 5) fatiche.push(x.giorno);
    }
    const lunga = (d) => {
      const h = gg(d);
      return Boolean(h && h.sedute.some((y) => BICI.has(y.tipo) && y.minuti > 180));
    };
    const buono = (k) => {
      const g = gg(piu(partenza, -k));
      if (!g || g.sedute.some((x) => x.chiave || NON_FACILI.has(x.tipo))) return false;
      if (fatiche.some((f) => g.giorno > f && fra(f, g.giorno) <= 2)) return false;
      const inizio = g.settimana.fase && g.settimana.fase.settimanaBlocco <= 4;
      if (lunga(piu(g.giorno, 1)) || (inizio && lunga(piu(g.giorno, 2)))) return false;
      // Con sette giorni disponibili il giorno prima della seduta chiave è riposo (3.7).
      const domani = gg(piu(g.giorno, 1));
      return !(disp.giorni.size === 7 && domani && domani.sedute.some((x) => x.chiave));
    };
    const finestra = Array.from({ length: da - a + 1 }, (_, i) => a + i);
    if ((d > da) && finestra.some(buono) && d <= 28) no(7, `ultima pesante a ${d} giorni con la finestra libera`);
  }
  // 8. Una media con salite in ogni settimana, scarico e scarico finale compresi, quando c'è un giorno
  // feriale disponibile fuori dai 3 giorni dopo le fatiche, dalle sedute chiave e dal giorno prima di
  // una seduta chiave. Mai nel weekend e mai il giorno prima di una seduta chiave (3.7 passo 3).
  const fini = [];
  for (const s of settimane) {
    const multi = s.sedute.filter((x) => PIU.has(x.tipo));
    if (multi.length) fini.push(multi[multi.length - 1].giorno);
    for (const x of s.sedute) if ((PROVE.has(x.tipo) && !PIU.has(x.tipo)) || x.ore >= 5) fini.push(x.giorno);
  }
  const dopoLunghe = new Set(settimane.flatMap((s) => s.sedute).filter((x) => x.ore > 4).map((x) => piu(x.giorno, 1)));
  const giorniChiave = new Set(settimane.flatMap((s) => s.sedute.map((x) => x.giorno)));
  for (const s of settimane) {
    for (const g of s.giorni) {
      if (g.sedute.some((x) => NON_FACILI.has(x.tipo)) && (dow(g.giorno) > 4 || giorniChiave.has(piu(g.giorno, 1)))) no(8, `media il ${g.giorno}, nel weekend o prima della seduta chiave`);
    }
    const dentro = s.giorni.filter((g) => !g.fuori);
    if (dentro.length < 4 || ["F", "F7", "corto"].includes(s.tipo) || s.ore < 1) continue;
    const libero = (g) => g.disponibile && dow(g.giorno) <= 4 && !giorniChiave.has(piu(g.giorno, 1)) && !dopoLunghe.has(g.giorno)
      && g.tetto >= PIANO.sedute.richiamo.minimo && !g.sedute.some((x) => x.chiave)
      && !fini.some((f) => g.giorno > f && fra(f, g.giorno) <= 3) && fra(g.giorno, partenza) > 1;
    if (!dentro.some(libero)) continue;
    if (!dentro.some((g) => g.sedute.some((x) => NON_FACILI.has(x.tipo)))) no(8, `${s.indice} ${s.tipo}`);
  }
  // 9. Almeno 2 uscite su 3 facili o di recupero. Una sola media a settimana, nelle settimane con
  // almeno tre uscite 2 su 3, e su tutto il piano almeno il 60% (vedi il resoconto).
  let corse = 0;
  let facili = 0;
  for (const s of settimane) {
    const c = s.giorni.flatMap((g) => g.sedute.filter((x) => BICI.has(x.tipo)));
    const m = c.filter((x) => NON_FACILI.has(x.tipo)).length;
    if (m > 1) no(9, `${s.indice} ${m} medie`);
    if (c.length >= 3 && c.length - m < (2 / 3) * c.length - 1e-9) no(9, `${s.indice}`);
    corse += c.length;
    facili += c.length - m;
  }
  if (ingresso.tuttoIlPiano && corse && !(p.fattibilita && p.fattibilita.corto) && facili < 0.6 * corse) no(9, `${facili} su ${corse}`);
  // 10 e 11. La palestra mai con la lunga, le prove o la media, e nessun giorno oltre il tetto.
  for (const s of settimane) {
    const palestre = [];
    s.giorni.forEach((g, i) => {
      if (g.sedute.some((x) => x.tipo === "palestra")) {
        palestre.push(i);
        if (g.sedute.some((x) => x.chiave || NON_FACILI.has(x.tipo))) no(10, `${g.giorno}`);
        if (!ingresso.dueCose && g.sedute.some((x) => x.tipo === "facile" || x.tipo === "recupero")) no(10, `${g.giorno} con un giro facile`);
      }
      // Ogni seduta nel tetto del suo giorno, anche le sedute chiave e quelle di più giorni (3.1 e 3.7).
      for (const x of g.sedute) {
        if (!BICI.has(x.tipo)) continue;
        if (!disp.giorni.has(dow(g.giorno))) no(11, `${g.giorno} non disponibile`);
        const tetto = PIU.has(x.tipo) ? g.tettoPiuGiorni : x.chiave ? g.tettoChiave : g.tetto;
        if (x.minuti > tetto + 0.5) no(11, `${g.giorno} ${x.tipo} ${x.minuti} oltre ${tetto}`);
        const scelto = disp.tetti[dow(g.giorno)];
        if (scelto !== null && x.minuti > scelto + 0.5) no(11, `${g.giorno} ${x.tipo} ${x.minuti} oltre il tetto scelto ${scelto}`);
      }
    });
    const distanza = s.fase && s.fase.familiarizzazione ? 3 : 2;
    for (let a = 0; a < palestre.length; a++) for (let b = a + 1; b < palestre.length; b++) if (palestre[b] - palestre[a] < distanza) no(10, `${s.indice} palestre vicine`);
  }
  // 12. Per 11 giorni e più con almeno 10 settimane il blocco fra la −7 e la −5, quando ci sono tre
  // giorni di fila disponibili.
  const N = settimane.filter((s) => s.indice < 0).length;
  if (p.obiettivo.classe === "11+" && N >= 10 && (disp.giorni.has(4) || disp.giorni.has(0)) && disp.giorni.has(5) && disp.giorni.has(6)) {
    const blocco = settimane.filter((s) => s.indice >= -7 && s.indice <= -5).flatMap((s) => s.sedute).filter((x) => x.tipo === "blocco");
    if (blocco.length !== 3 || fra(blocco[2].giorno, partenza) < 21) no(12, "manca il blocco");
  }
  // 13. Dopo weekend, prove e blocchi il giorno dopo riposo o recupero (2 da 50 anni), il secondo facile.
  for (const s of settimane) {
    const fini = [];
    const multi = s.sedute.filter((x) => PIU.has(x.tipo));
    if (multi.length) fini.push(multi[multi.length - 1].giorno);
    for (const x of s.sedute) if (PROVE.has(x.tipo) && !PIU.has(x.tipo)) fini.push(x.giorno);
    for (const fine of fini) {
      const riposi = dueUno ? 2 : 1;
      for (let k = 1; k <= riposi; k++) {
        const g = gg(piu(fine, k));
        if (g && !g.sedute.some((x) => x.chiave) && g.sedute.some((x) => BICI.has(x.tipo) && x.tipo !== "recupero")) no(13, `dopo ${fine} giorno ${k}`);
        if (g && g.sedute.some((x) => x.tipo === "palestra" && x.gambe)) no(13, `gambe dopo ${fine}`);
      }
      const dopo = gg(piu(fine, riposi + 1));
      if (dopo && !dopo.sedute.some((x) => x.chiave) && dopo.sedute.some((x) => ["media", "richiamo", "lunga"].includes(x.tipo))) no(13, `secondo giorno dopo ${fine}`);
      for (let k = 1; k <= 2; k++) {
        const g = gg(piu(fine, k));
        if (g && g.sedute.some((x) => x.tipo === "palestra" && x.gambe)) no(7, `gambe nei 3 giorni dopo ${fine}`);
      }
      for (let k = 1; k <= 3; k++) {
        const g = gg(piu(fine, k));
        if (g && g.sedute.some((x) => x.tipo === "media")) no(13, `media nei 3 giorni dopo ${fine}`);
      }
    }
  }
  // 14. Le prove nelle loro settimane.
  const attese = { A: { T1: -10, T2: -7, T3: -4 }, B: { T1: -8, T2: -5, T3: -4 }, C: { T1: -14, T2: -11, prova: -4 } }[p.schema.nome];
  if (attese) {
    for (const [tipo, w] of Object.entries(attese)) {
      const s = settimane.find((x) => x.indice === w);
      // Senza due giorni di fila disponibili la prova diventa un'uscita lunga con le borse (3.7).
      if (s && s.dal <= piu(s.lunedi, 5) && !s.sedute.some((x) => x.tipo === tipo || (["T3", "prova"].includes(tipo) && x.tipo === "T2"))) no(14, `${tipo} non alla ${w}`);
    }
  }
  // 16. Un piano che non è corto, seguito alla lettera, porta prove, volume e lunga a difetto 0.
  if (p.fattibilita && !p.fattibilita.corto) {
    const att = [...ingresso.uscite];
    for (const [d, g] of giorni) for (const x of g.sedute) {
      if (BICI.has(x.tipo) && x.minuti > 0) {
        att.push({ id: `p${att.length}`, giorno: d, inizio: `${d}T08:00:00`, tipo: "Ride", sorgente: "PIANO", secondi: x.minuti * 60, borse: x.borse, notteFuori: x.notteFuori === true, rulli: false, eBike: false, stub: false, commute: false, qualita: { secondi: "vera" } });
      }
    }
    const ob = obiettivi(p.obiettivo.H, p.obiettivo.classe, ingresso.esperienza ?? false, { borseKg: ingresso.borseKg ?? null });
    const giorniB = giorniDiBici(att, { dal: piu(partenza, -112), al: piu(partenza, -1) });
    const v = pilastroVolume(giorniB, partenza, ob);
    const l = pilastroLunga(att, partenza, p.obiettivo.classe, ob);
    const b = pilastroBorse(att, partenza, p.obiettivo.H, p.obiettivo.classe, ingresso.esperienza ?? false, [], { borseKg: ingresso.borseKg ?? null });
    if (v.difetto || l.difetto || b.difetto) no(16, `volume ${v.difetto} lunga ${l.difetto} prove ${b.difetto}`);
  }
  return errori;
}

// I testi di un piano, per la regola 15.
function testiDelPiano(p) {
  const lista = [...p.avvisi.map((a) => a.testo)];
  for (const s of p.settimane) {
    if (s.frase) lista.push(s.frase);
    lista.push(...stringhe(s.avvisi.map((a) => a.testo)));
    for (const g of s.giorni) for (const x of g.sedute) {
      lista.push(T.inBreve(x));
      if (x.tipo !== "riposo" || true) lista.push(T.titoloSeduta(x), T.comeSeduta(x));
      if (x.carboidrati) lista.push(x.carboidrati.testo);
      if (x.cibo) lista.push(x.cibo.testo);
      if (x.nota && T.NOTE[x.nota]) lista.push(T.NOTE[x.nota]);
    }
  }
  return lista.filter((t) => t !== null && t !== undefined);
}

const STIME = new Map();
function stimaPer(percorso, giorni) {
  const chiave = `${percorso.id}-${giorni}`;
  if (!STIME.has(chiave)) STIME.set(chiave, stimaH({ percorso, giorni, profilo: {}, oggi: "2026-11-01" }));
  return STIME.get(chiave);
}

test("le regole che nessun piano deve violare, 23 percorsi per giorni, settimane, disponibilità, età e palestra", () => {
  const errori = [];
  let piani = 0;
  let firmati = null;
  for (const percorso of CATALOGO) {
    for (const giorni of [...new Set([percorso.giorniTipici[0], percorso.giorniMax])]) {
      const stima = stimaPer(percorso, giorni);
      const partenza = percorso.partenze[0];
      for (const w of [3, 4, 6, 8, 10, 12, 16, 24]) {
        const oggi = lunediDi(partenza, w);
        for (const [nome, disp] of Object.entries(DISPONIBILITA)) {
          const h4 = H4[nome];
          const uscite = storia(oggi, h4, Math.min(4, Math.max(1.5, h4 * 0.45)));
          for (const eta of [45, 52, 58]) {
            for (const palestra of ["mai", "conosco"]) {
              const ingressi = {
                obiettivo: { percorso: percorso.id, giorni, partenza }, stima, profilo: { eta, palestra, palestraSicurezza: "no" },
                storico: { uscite }, disponibilita: disp, oggi,
              };
              const p = pianoLungo(ingressi);
              piani += 1;
              errori.push(...violazioni(p, { nome: `${percorso.id} ${giorni} giorni w${w} ${nome} ${eta} ${palestra}`, eta, disp, uscite, tuttoIlPiano: true }));
              // 15. Stessi ingressi, stesso piano, e la firma cambia con gli ingressi.
              if (piani % 97 === 0) {
                assert.deepEqual(pianoLungo(ingressi), p, "stessi ingressi, stesso piano");
                if (firmati) assert.notEqual(firmati.firma, p.firma);
                assert.notEqual(pianoLungo({ ...ingressi, disponibilita: { ...disp, ore: disp.ore + 2 } }).firma, p.firma);
                firmati = p;
              }
              if (piani % 7 === 0) for (const t of testiDelPiano(p)) controllaTesto(t, `piano ${percorso.id} w${w}`);
            }
          }
        }
      }
    }
  }
  assert.ok(piani > 5500, `piani ${piani}`);
  const tipi = {};
  for (const e of errori) tipi[e.split(" ")[0]] = (tipi[e.split(" ")[0]] || 0) + 1;
  assert.deepEqual(errori.slice(0, 20), [], `${errori.length} violazioni ${JSON.stringify(tipi)}`);
});

// Un generatore di numeri a caso con un seme fisso, mulberry32.
function caso(seme) {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("le stesse regole su 2.000 combinazioni a caso, con un seme fisso", () => {
  const r = caso(20261101);
  const scegli = (lista) => lista[Math.floor(r() * lista.length)];
  const errori = [];
  for (let i = 0; i < 2000; i++) {
    const classe = scegli(["1", "2-5", "6-10", "11+"]);
    const giorni = classe === "1" ? 1 : classe === "2-5" ? 2 + Math.floor(r() * 4) : classe === "6-10" ? 6 + Math.floor(r() * 5) : 11 + Math.floor(r() * 10);
    const H = 4 + r() * 7;
    const ore = scegli([4, 6, 8, 10, 12]);
    const fascia = Math.floor(r() * 5);
    const eta = PIANO.limiteFacile.etaCentri[fascia];
    const palestra = scegli(["no", "mai", "conosco", "casa"]);
    const settimane = 2 + Math.floor(r() * 29);
    const partenza = piu("2027-06-07", Math.floor(r() * 7));
    const disponibili = [0, 1, 2, 3, 4, 5, 6].filter(() => r() < 0.55);
    while (disponibili.length < 2) disponibili.push(scegli([1, 3, 5, 6].filter((x) => !disponibili.includes(x))));
    disponibili.sort();
    const stella = disponibili.includes(5) ? 5 : disponibili.includes(6) ? 6 : scegli(disponibili);
    const disp = { giorni: disponibili, stella, ore };
    const oggi = lunediDi(partenza, settimane);
    const h4 = 2 + r() * 7;
    const uscite = storia(oggi, h4, Math.min(4, Math.max(1.5, h4 * 0.45)), 12);
    const p = pianoLungo({ obiettivo: { giorni, partenza }, stima: { H, giorni }, profilo: { fasciaEta: fascia, palestra, palestraSicurezza: "no" }, storico: { uscite }, disponibilita: disp, oggi });
    errori.push(...violazioni(p, { nome: `caso ${i} ${classe} H${H.toFixed(1)} ${ore}h w${settimane} ${disponibili.join("")} ${eta} ${palestra}`, eta, disp, uscite }));
    if (i % 10 === 0) for (const t of testiDelPiano(p)) controllaTesto(t, `caso ${i}`);
  }
  const tipi = {};
  for (const e of errori) tipi[e.split(" ")[0]] = (tipi[e.split(" ")[0]] || 0) + 1;
  assert.deepEqual(errori.slice(0, 20), [], `${errori.length} violazioni ${JSON.stringify(tipi)}`);
});

// --- I testi (9.8 e 7.1) ---

test("ogni tipo di seduta e ogni livello ha un titolo e un come", () => {
  const minuti = { riposo: 0, palestra: 50, tronco: 10, dopoEvento: 0, tappa: 480 };
  for (const tipo of TIPI_SEDUTA) {
    for (const livello of [...LIVELLI, "nessuno"]) {
      for (const parte of PIU.has(tipo) ? [1, 2, 3].slice(0, tipo === "blocco" ? 3 : 2) : [null]) {
        const seduta = { tipo, minuti: minuti[tipo] ?? 150, parte, di: parte ? (tipo === "blocco" ? 3 : 2) : null, chiave: true, nome: "Costruzione", quanti: 6, gambe: true, scheda: 3, seduta: "A", settimana: 2 };
        const r = adattaSeduta(seduta, livello, {});
        controllaTesto(r.titolo, `${tipo} ${livello} titolo`);
        controllaTesto(r.come, `${tipo} ${livello} come`);
        r.righe.forEach((x) => controllaTesto(x, `${tipo} ${livello} riga`));
      }
    }
    controllaTesto(T.inBreve({ tipo, minuti: minuti[tipo] ?? 150, parte: 1 }), `${tipo} in breve`);
  }
});

test("ogni modello di js/testi-piano.js si compone con i valori di prova di 9.8, senza sigle e senza due punti", () => {
  const { muti, testi } = componiModulo(T);
  assert.deepEqual(muti, [], "modelli che non danno nessun testo");
  assert.ok(testi.length > 300);
  for (const t of testi) {
    assert.ok(!t.includes(":"), t);
    assert.ok(!VIETATE.test(t), t);
    assert.ok(!/\b(T[123]|RIR)\b/.test(t), t);
    assert.ok(!/\b\d+[.,]\d+\s*(ore|ora|minuti|min|h)\b/i.test(t), t);
  }
  assert.equal(T.TIPI, undefined, "i tipi di seduta stanno in js/piano.js");
  assert.equal(T.nomeGiorno, undefined, "gli aiuti non si esportano");
});

test("i testi del piano, tutti, senza due punti e senza le parole vietate", () => {
  for (const t of stringhe([T.COME, T.NOTE, T.LIVELLO, T.VIAGGIO, T.TASTI, T.AVVISI, T.CIBO, T.STOMACO, T.TESTI_DOMENICA, T.FRASI_SEGNALI, T.PALESTRA_SALTA_OGGI])) controllaTesto(t, "testi esportati");
  const giorni = ["2027-04-05", "2027-04-10", "2027-04-11", "2027-04-16"];
  for (const g of giorni) {
    for (const tipo of ["lunga", "weekend", "T1", "T2", "T3", "prova", "blocco", "media", "facile", "palestra", "scarico", "controllo", "carica"]) {
      controllaTesto(T.testoSposta(tipo, g, true), "sposta");
      controllaTesto(T.testoSposta(tipo, g, false), "sposta");
      controllaTesto(T.testoSpostiamo(tipo, g, true), "spostiamo");
      controllaTesto(T.testoSalta(tipo), "salta");
    }
    controllaTesto(T.domandaGiorno("weekend", g), "domanda");
    controllaTesto(T.domandaGiorno("blocco", g), "domanda");
    controllaTesto(T.testoPalestraSposta(g, "2027-04-06"), "palestra");
  }
  assert.equal(T.domandaGiorno("weekend", "2027-04-11"), "Per il weekend lungo ti serve anche la domenica 11 aprile. Riesci a liberarla?");
  for (const tipo of ["N", "S", "E", "F", "F7", "tapering", "dopoEvento", "corto"]) {
    for (const chiave of [null, { tipo: "lunga", giorno: "2027-04-10" }, { tipo: "T3", giorno: "2027-04-10" }, { tipo: "T1", giorno: "2027-04-10" }]) {
      controllaTesto(T.fraseSettimana({ tipo, ore: 7.4, palestre: 2, chiave }), `frase ${tipo}`);
    }
  }
  assert.equal(T.fraseSettimana({ tipo: "E", ore: 11.6, chiave: { tipo: "T3", giorno: "2027-04-10" } }), "Questa settimana c'è la prova generale. Servono circa 11 ore e 40, quasi tutte nel weekend.");
  for (const m of [35, 90, 125]) controllaTesto(T.fraseMancano(m, ["2027-04-08", "2027-04-09"]), "mancano");
  assert.equal(T.fraseMancano(90, ["2027-04-08", "2027-04-09"]), "Questa settimana mancano 1 ora e mezza rispetto al piano, perché giovedì e venerdì non puoi. Va bene così, non si recuperano.");
  controllaTesto(T.testoDueSegnali(["S1", "S3"]), "due segnali");
  for (const giorni of [0, 1, 5, 13, 20, 63]) {
    const t = T.contoAllaPartenza(piu("2027-06-07", -giorni), "2027-06-07");
    if (t) controllaTesto(t, "conto alla partenza");
  }
  assert.equal(T.contoAllaPartenza("2027-04-05", "2027-06-07"), "Mancano 9 settimane alla partenza");
  // Le durate a parole del 7.1.
  assert.deepEqual([45, 80, 210, 250, 142, 115].map(T.durata), ["45 minuti", "1 ora e 20", "3 ore e mezza", "4 ore e 10", "2 ore e 20", "1 ora e 55"]);
});

test("la disponibilità, i tetti e lo storico", () => {
  const d = leggiDisponibilita({});
  assert.deepEqual([[...d.giorni].sort(), d.stella, d.ore], [[1, 3, 5, 6], 5, 6]);
  const tolto = leggiDisponibilita({ giorni: [1, 3, 5, 6], tetti: { 3: 0 } });
  assert.ok(!tolto.giorni.has(3), "niente vuol dire non disponibile");
  // Lo storico senza giri, dalla risposta del primo avvio.
  const s = leggiStorico({ fasciaOre: 2 }, "2027-03-01");
  assert.deepEqual([s.h4, s.l30], [5, 2.25]);
  const poco = leggiStorico({ fasciaOre: 0 }, "2027-03-01");
  assert.deepEqual([poco.h4, poco.l30], [1.5, 1]);
  const vere = leggiStorico({ uscite: storia("2027-03-01", 6, 3) }, "2027-03-01");
  vicino(vere.h4, 6, 1e-6);
  vicino(vere.l30, 3, 1e-6);
  // La settimana concreta da sola, con la stessa forma che usa il piano.
  const c = settimanaConcreta({ lunedi: "2027-03-08", indice: -11, tipo: "N", ore: 6, sedute: [{ giorno: "2027-03-13", tipo: "lunga", ore: 3, possibile: true }] }, {}, { eta: 45 }, null, {});
  assert.equal(c.giorni.length, 7);
  assert.equal(c.giorni[5].sedute[0].tipo, "lunga");
  assert.ok(c.giorni.some((g) => g.sedute.some((x) => x.tipo === "media")));
  vicino(c.oreMesse, 6, 0.1);
  const a = applicaCrescita([{ lunedi: "2027-03-08", dal: "2027-03-08", al: "2027-03-14", quota: 1, indice: -11, tipo: "N", oreTarget: 9, sedute: [{ giorno: "2027-03-13", tipo: "lunga", ore: 5, possibile: true }] }], { h4: 6, l30: 3 }, {}, 40, { oggi: "2027-03-08" });
  vicino(a.settimane[0].orePiene, 6.9, 1e-6, "il tetto della settimana normale");
  vicino(a.settimane[0].sedute[0].ore, 3.6, 1e-6, "il passo della lunga");
});
