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
  leggiStorico, fatichePiano, modoEventoPiano, giorniPersi,
} from "../js/piano.js";
import * as T from "../js/testi-piano.js";
import { PIANO, PRONTEZZA, DOMENICA } from "../js/parametri.js";
import { CATALOGO, trovaPercorso } from "../js/catalogo.js";
import { stimaH } from "../js/stima.js";
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
  const p = pianoLungo({ ...base, storico: { h4: 4, l30: 3, interruzione: { giorni: 10, orePrima: 6 } } });
  assert.ok(p.settimane[0].ore <= 0.75 * 6 + 1e-9, `${p.settimane[0].ore}`);
  assert.ok(p.avvisi.some((a) => a.tipo === "interruzione"));
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

// --- Le regole che nessun piano deve violare (9.4) ---

const DISPONIBILITA = {
  poca: { giorni: [1, 3, 5, 6], stella: 5, tetti: { 1: 60, 3: 60 }, ore: 4 },
  media: { ore: 6 },
  tanta: { giorni: [0, 1, 2, 3, 4, 5, 6], stella: 5, tetti: { 0: 120, 1: 120, 2: 120, 3: 120, 4: 120 }, ore: 12 },
};
const H4 = { poca: 3, media: 5, tanta: 8 };

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
  for (const s of settimane) {
    const piena = s.orePiene ?? s.ore;
    if (["base", "N"].includes(s.tipo) && piena > tettoSettimana(storiaOre) + 1e-6 && piena > PIANO.lungaDichiarata.minimo + 1 + 1e-6) no(2, `${s.indice} ${piena} oltre ${tettoSettimana(storiaOre)}`);
    storiaOre.push({ ore: piena, tipo: s.tipo });
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
  // disponibile fuori dai 3 giorni dopo le fatiche e dalle sedute chiave.
  const fini = [];
  for (const s of settimane) {
    const multi = s.sedute.filter((x) => PIU.has(x.tipo));
    if (multi.length) fini.push(multi[multi.length - 1].giorno);
    for (const x of s.sedute) if ((PROVE.has(x.tipo) && !PIU.has(x.tipo)) || x.ore >= 5) fini.push(x.giorno);
  }
  const dopoLunghe = new Set(settimane.flatMap((s) => s.sedute).filter((x) => x.ore > 4).map((x) => piu(x.giorno, 1)));
  for (const s of settimane) {
    const dentro = s.giorni.filter((g) => !g.fuori);
    if (dentro.length < 4 || ["F", "F7", "corto"].includes(s.tipo) || s.ore < 1) continue;
    const libero = (g) => g.disponibile && !dopoLunghe.has(g.giorno) && g.tetto >= PIANO.sedute.richiamo.minimo && !g.sedute.some((x) => x.chiave)
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
      for (const x of g.sedute) {
        if (!BICI.has(x.tipo)) continue;
        if (PIU.has(x.tipo)) {
          if (!disp.giorni.has(dow(g.giorno))) no(11, `${g.giorno} non disponibile`);
          continue;
        }
        const tetto = x.chiave ? g.tettoChiave : g.tetto;
        if (x.minuti > tetto + 0.5) no(11, `${g.giorno} ${x.tipo} ${x.minuti} oltre ${tetto}`);
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
  for (const tipo of T.TIPI) {
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
