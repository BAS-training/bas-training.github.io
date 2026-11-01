// Prove di «Quando uno è pronto» (9.3 della specifica).
// Si lanciano con  node --test test/prontezza.test.mjs
// Le persone, le date e i numeri sono inventati. I casi tipo hanno la forma dei quattro viaggi di
// 8.3, cioè la stessa classe e gli stessi difetti, con numeri e date diversi.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classeEvento, obiettivi, settimanePilastri, giorniDiBici, pilastroVolume, pilastroLunga, pilastroBorse,
  pilastroContinuita, abbinaProve, verdetto, fiduciaVerdetto, proiezione, giorniConsigliati, lungaRiferimento,
  percorsoCorto, specchio, avvisiFitness, contaPalestra, contaDurabilita, contaStomaco, valutaProntezza,
  haEsperienza, ARRIVARE_E_ADATTARE,
} from "../js/prontezza.js";
import * as testi from "../js/testi-prontezza.js";
import { CATALOGO, trovaPercorso } from "../js/catalogo.js";
import { PRONTEZZA } from "../js/parametri.js";
import { stimaH } from "../js/stima.js";
import { preparaAttivita } from "../js/dati.js";

const GIORNO_MS = 86400000;
const piu = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * GIORNO_MS).toISOString().slice(0, 10);
const vicino = (a, b, tolleranza, messaggio) => assert.ok(Math.abs(a - b) <= tolleranza, `${messaggio ?? ""} ${a} contro ${b}`);

let contatore = 0;
// Un giro già pulito come quelli di js/dati.js, nel giorno dato e di ore in movimento. Le uscite
// da 3 ore in su rispondono «No» alle borse, salvo campi diversi.
function giroIl(giorno, ore, campi = {}) {
  contatore += 1;
  return {
    id: `g${contatore}`, giorno, inizio: `${giorno}T08:00:00`, tipo: "GravelRide", sorgente: "WAHOO",
    secondi: Math.round(ore * 3600), metri: Math.round(ore * 18000), dislivello: Math.round(ore * 250),
    borse: ore >= 3 ? "no" : null, kg: null, notteFuori: null, rulli: false, eBike: false, stub: false,
    commute: false, potenza: false, qualita: { secondi: "vera" }, ...campi,
  };
}

// Lo stesso, a d giorni dalla partenza, con d negativo.
const giro = (partenza, d, ore, campi) => giroIl(piu(partenza, d), ore, campi);

// Tre giri a settimana dalla settimana k1 alla k2 (per esempio da −16 a −1), il secondo, il quarto
// e il sesto giorno del blocco di 7, con la lunga il sesto.
function settimane(partenza, k1, k2, ore, lunga) {
  const lista = [];
  for (let k = k1; k <= k2; k++) {
    const resto = (ore - lunga) / 2;
    lista.push(giro(partenza, 7 * k + 1, resto), giro(partenza, 7 * k + 3, resto), giro(partenza, 7 * k + 5, lunga));
  }
  return lista;
}

// Un viaggio carico «come all'evento» dal giorno d, un giorno per ogni voce di ore, con la notte fuori.
function viaggio(partenza, d, ore, campi = {}) {
  return ore.map((h, i) => giro(partenza, d + i, h, { borse: "evento", kg: 9, notteFuori: true, ...campi }));
}

// Le uscite fuori dai giorni da d1 a d2, per fare posto a un viaggio o a un buco.
function tranne(uscite, partenza, d1, d2) {
  const da = piu(partenza, d1);
  const a = piu(partenza, d2);
  return uscite.filter((u) => u.giorno < da || u.giorno > a);
}

const difetti = (r) => [r.pilastri.volume.difetto, r.pilastri.lunga.difetto, r.pilastri.borse.difetto, r.pilastri.continuita.difetto];

// --- La scrittura (7.1), con le parole vietate scritte a pezzi come in 9.8 ---

const VIETATE = new RegExp("\\b(ga" + "r[ae]" + "|presta" + "zion[ei]" + "|ra" + "c(e|es|ing)" + "|perfor" + "mance)\\b", "i");
const DA_EVITARE = /classifica|cronometro|avversari|vincere|sei in forma|vai forte|principiante|amatore|allenato|indietro|tapering|specchio|watt|%|\bkJ\b|\bT[123]\b|\bRIR\b|\bRPE\b|ritmo-soglia/i;

function controllaTesto(testo, dove) {
  assert.equal(typeof testo, "string", `${dove} non è un testo`);
  assert.ok(testo.length > 0, `${dove} vuoto`);
  assert.ok(!testo.includes(":"), `due punti in ${dove}, ${testo}`);
  assert.ok(!VIETATE.test(testo), `parola vietata in ${dove}, ${testo}`);
  assert.ok(!DA_EVITARE.test(testo), `parola da evitare in ${dove}, ${testo}`);
  assert.ok(!/\d[.,]\d+ (ore|ora|minuti)/.test(testo), `decimali in una durata in ${dove}, ${testo}`);
}

// Tutti i testi di un risultato di valutaProntezza, compresi «Cosa cambia se…» e la Fitness.
function testiDi(r) {
  const lista = [];
  const v = r.verdetto;
  if (v) lista.push(v.titolo, v.perche, v.cosa, ...v.righe.map((x) => x.testo));
  if (r.pilastri) {
    lista.push(...r.pilastri.borse.righe.map((x) => x.testo));
    if (r.pilastri.borse.daSistemare) lista.push(r.pilastri.borse.daSistemare.testo);
  }
  if (r.fiducia) lista.push(r.fiducia.titolo, r.fiducia.testo);
  if (r.proiezione) {
    lista.push(...r.proiezione.frasi, ...r.proiezione.righe.map((x) => x.testo));
    if (r.proiezione.sottoPiano) lista.push(r.proiezione.sottoPiano.testo);
  }
  lista.push(...r.avvisi.map((a) => a.testo), testi.testoFitness(r.confronto));
  if (r.obiettivi) lista.push(...testi.righeProposta(r.proposta, { giorni: r.giorni, H: r.H, vMin: r.obiettivi.vMin, oreDisponibili: 6 }));
  if (r.proposta && r.proposta.giorni) lista.push(testi.tastoGiorni(r.proposta.giorni), testi.propostaBreve(r.proposta));
  if (r.proposta && r.proposta.percorso) lista.push(testi.passaA(r.proposta.percorso));
  return lista.filter((t) => t !== null && t !== undefined);
}

function controllaTutti(r, dove) {
  const lista = testiDi(r);
  assert.ok(lista.length > 0, dove);
  for (const t of lista) controllaTesto(t, dove);
  return lista;
}

// --- Classi e obiettivi (2.1) ---

test("le classi vanno per giorni", () => {
  assert.deepEqual([1, 3, 7, 15].map(classeEvento), ["1", "2-5", "6-10", "11+"]);
  assert.deepEqual([2, 5, 6, 10, 11, 26].map(classeEvento), ["2-5", "2-5", "6-10", "6-10", "11+", "11+"]);
});

test("gli obiettivi per 11 giorni e più, con il gradino delle 9 ore", () => {
  // La specifica prova 9,25 e 8,75. Qui valori vicini e inventati, sopra e sotto il gradino.
  const casi = [[9.3, 9.5, 11.5], [8.7, 7.83, 9.57], [12, 10.8, 12]];
  for (const [h, vMin, vComodo] of casi) {
    const o = obiettivi(h, "11+");
    vicino(o.vMin, vMin, 1e-9, `V_min con H ${h}`);
    vicino(o.vComodo, vComodo, 1e-9, `V_comodo con H ${h}`);
  }
  vicino(obiettivi(9.3, "11+").lt, 5.58, 1e-9);
  assert.equal(obiettivi(15, "11+").lt, 8, "mai oltre 8 ore");
  assert.deepEqual(obiettivi(9.3, "11+").prove, ["T1", "blocco", "T3"]);
});

test("gli obiettivi per 6-10 giorni con H 8 e per un giorno con H 3", () => {
  const sei = obiettivi(8, "6-10");
  vicino(sei.vMin, 7.6, 1e-9);
  vicino(sei.vComodo, 9.6, 1e-9);
  vicino(sei.lt, 5.2, 1e-9);
  assert.deepEqual(sei.prove, ["T1", "T2", "T3"]);
  const uno = obiettivi(3, "1");
  vicino(uno.vMin, 3, 1e-9);
  vicino(uno.vComodo, 3.3, 1e-9);
  vicino(uno.lt, 2.25, 1e-9);
  assert.deepEqual(uno.prove, [], "senza borse nessuna prova");
  assert.deepEqual(obiettivi(3, "1", false, { borseKg: 8 }).prove, ["unGiorno"]);
  assert.deepEqual(obiettivi(3, "1", false, { borseKg: 4 }).prove, [], "fino a 4 kg no");
  // Per 2-5 giorni la lunga sta fra 3 e 7 ore e il comodo non supera mai 12 ore a settimana.
  vicino(obiettivi(3.5, "2-5", true).lt, 3, 1e-9);
  vicino(obiettivi(11, "2-5").lt, 7, 1e-9);
  vicino(obiettivi(11, "2-5").vComodo, 12, 1e-9);
  assert.equal(obiettivi(null, "2-5"), null);
});

test("2-5 giorni con esperienza, il T2 non serve con H 5,5 e serve con H 6,5", () => {
  assert.deepEqual(obiettivi(5.5, "2-5", true).prove, ["T1", "T3"]);
  assert.deepEqual(obiettivi(6.5, "2-5", true).prove, ["T1", "T2", "T3"]);
  assert.deepEqual(obiettivi(5.5, "2-5", false).prove, ["T1", "T2", "T3"], "al primo viaggio serve sempre");
  assert.deepEqual([true, "2", "3", 2, 4].map(haEsperienza), [true, true, true, true, true]);
  assert.deepEqual([false, "no", "", 0, 1, null, undefined].map(haEsperienza), [false, false, false, false, false, false, false]);
});

// --- Settimane e ore (2.2) ---

test("le settimane dei pilastri con la partenza di domenica, e un giro del venerdì della −3 dentro", () => {
  // La specifica prova domenica 8/3/2026 e un giro del 20/2. Qui la stessa forma con date inventate.
  const partenza = "2027-03-07";
  const s = settimanePilastri(partenza);
  assert.equal(s.length, 16);
  assert.deepEqual(s[0], { indice: -16, da: "2026-11-15", a: "2026-11-21" });
  const meno = (k) => s.find((x) => x.indice === k);
  assert.deepEqual([meno(-1).da, meno(-1).a], ["2027-02-28", "2027-03-06"]);
  assert.deepEqual([meno(-3).da, meno(-3).a], ["2027-02-14", "2027-02-20"]);
  const uscite = [giroIl("2027-02-19", 4)];
  const ob = obiettivi(8, "2-5");
  const volume = pilastroVolume(uscite, partenza, ob);
  assert.equal(volume.settimane.find((x) => x.indice === -3).ore, 4);
  vicino(volume.valore, 0.5, 1e-9);
  const lunga = pilastroLunga(uscite, partenza, "2-5", ob);
  assert.deepEqual([lunga.valore, lunga.giorno], [4, "2027-02-19"]);
});

test("le ore di un giorno, con l'e-bike a metà e i giri spezzati da una sosta uniti nella lunga", () => {
  const partenza = "2027-06-12";
  const d = piu(partenza, -30);
  const uscite = [
    giroIl(d, 2, { inizio: `${d}T08:00:00` }),
    giroIl(d, 1.5, { inizio: `${d}T11:00:00` }),          // un'ora di sosta al bar, vale un giro solo
    giroIl(piu(partenza, -29), 2, { tipo: "EBikeRide", eBike: true }),
    giroIl(piu(partenza, -28), 1, { tipo: "VirtualRide", rulli: true }),
    giroIl(piu(partenza, -27), 1, { tipo: "WeightTraining" }),
  ];
  const giorni = giorniDiBici(uscite, { dal: piu(partenza, -30), al: piu(partenza, -26) });
  assert.deepEqual(giorni.map((g) => g.ore), [3.5, 1, 1, 0, 0]);
  assert.deepEqual(giorni.map((g) => g.bici), [true, true, true, false, false]);
  const ob = obiettivi(7, "2-5");
  assert.equal(pilastroLunga(uscite, partenza, "2-5", ob).valore, 3.5);
  assert.equal(giorniDiBici(uscite, { dal: piu(partenza, -29), al: piu(partenza, -29), eBikeEvento: true })[0].ore, 2);
  // I rulli contano per le ore e non per l'uscita lunga.
  assert.equal(pilastroLunga([giroIl(d, 5, { tipo: "VirtualRide", rulli: true })], partenza, "2-5", ob).valore, 0);
});

// --- I quattro casi tipo (8.3) ---

test("caso tipo come il Trentino Gravel, poco pronto, 5 giorni consigliati, poi partire e adattare", () => {
  const partenza = "2027-09-24";
  const ore = [[-70, 1.5], [-68, 1.2], [-65, 1.7], [-63, 1.5], [-61, 1], [-58, 1.6], [-56, 1.4], [-54, 1.7], [-52, 1],
    [-20, 1.2], [-18, 1.5], [-16, 1.3], [-10, 3.2], [-7, 1], [-4, 1], [-2, 0.8]];
  const uscite = ore.map(([d, h]) => giro(partenza, d, h));
  const percorso = trovaPercorso("tg-medio");
  const oggi = piu(partenza, -1);
  const r = valutaProntezza({ percorso, giorni: 3, partenza, oggi, uscite });
  assert.equal(r.fase, "verdetto");
  assert.ok(r.H > 8 && r.H < 11, `H ${r.H}`);
  assert.deepEqual(difetti(r), [2, 2, 1, 2]);
  assert.equal(r.esito, "pocoPronto");
  assert.equal(r.pilastri.continuita.valore, 31);
  assert.deepEqual([r.proposta.tipo, r.proposta.giorni, r.proposta.motivo, r.proposta.lRif], ["adattare", 5, "lunga", 3.2]);
  assert.equal(r.verdetto.titolo, "Poco pronto");
  assert.equal(r.verdetto.perche, r.pilastri.volume.testo, "la riga del pilastro più lontano");
  assert.equal(r.verdetto.cosa, "Se parti lo stesso, fallo in 5 giorni, tieni corto il primo e scegli posti per dormire che puoi cambiare.");
  // Il Corto ai suoi 4 giorni starebbe nella lunga e nel tetto, ma il verdetto resterebbe poco pronto.
  const soloOre = percorsoCorto(percorso, CATALOGO, {}, 3.2, { uscite, oggi });
  assert.deepEqual([soloOre.esito, soloOre.percorso.id, soloOre.giorni], ["corto", "tg-corto", 4]);
  assert.equal(percorsoCorto(percorso, CATALOGO, {}, 3.2, { uscite, oggi, valuta: () => "pocoPronto" }).esito, ARRIVARE_E_ADATTARE);
  const righe = testi.righeProposta(r.proposta, { giorni: 3, H: r.H });
  assert.ok(righe[0].startsWith("In 3 giorni ogni giornata dura circa "));
  assert.ok(righe[0].includes("Con la tua uscita più lunga delle ultime sei settimane, 3 ore e 10, ti consiglio 5 giorni"), righe[0]);
  assert.equal(righe[1], testi.TESTO_ADATTARE);
  controllaTutti(r, "Trentino Gravel");
});

// Lucia prepara la NorthCape4000 da Berlino in 16 giorni, H 9,5 inventata.
function lucia({ borseUltimo = "evento" } = {}) {
  const partenza = "2027-07-29";
  let uscite = settimane(partenza, -20, -1, 9, 4);
  uscite = tranne(uscite, partenza, -104, -103);
  uscite = tranne(uscite, partenza, -75, -73);
  uscite = tranne(uscite, partenza, -39, -36);
  uscite.push(
    ...viaggio(partenza, -104, [5, 4]),
    ...viaggio(partenza, -75, [5.5, 5, 4.5]),
    ...viaggio(partenza, -39, [6.5, 6, 5.5, 5], { borse: borseUltimo }),
  );
  const stima = { H: 9.5, T: 152, livello: 1, giorni: 16 };
  return valutaProntezza({ percorso: trovaPercorso("nc4k-berlino"), giorni: 16, partenza, oggi: piu(partenza, -1), uscite, stima, esperienza: "3" });
}

test("caso tipo come la NorthCape4000, pronto con il doppio uso, e quasi pronto senza borse nell'uscita di 4 giorni", () => {
  const r = lucia();
  assert.equal(r.classe, "11+");
  assert.ok(r.pilastri.volume.valore >= 9.5 && r.pilastri.volume.valore < 11.5, `V ${r.pilastri.volume.valore}`);
  assert.deepEqual(difetti(r), [0, 0, 0, 0]);
  assert.equal(r.esito, "pronto", "V sotto il comodo, quindi senza margine");
  const prove = Object.fromEntries(r.pilastri.borse.righe.map((x) => [x.prova, x]));
  assert.ok(prove.blocco.doppioUso && prove.T3.doppioUso, "la stessa uscita di 4 giorni");
  assert.deepEqual([prove.blocco.a, prove.T3.a], [piu("2027-07-29", -36), piu("2027-07-29", -36)]);
  assert.ok(prove.blocco.stato === "fatta" && !prove.blocco.tardi);
  assert.deepEqual(r.avvisi.map((a) => a.tipo), ["doppioUso"]);
  assert.equal(r.avvisi[0].testo, "Se dopo il blocco hai cambiato qualcosa, provalo in un'uscita carica di 2-3 ore prima dello scarico finale.");
  assert.equal(r.verdetto.perche, "Ore, uscita lunga, prove con le borse e continuità ci sono.");
  controllaTutti(r, "NorthCape4000");

  const senza = lucia({ borseUltimo: "no" });
  assert.deepEqual(difetti(senza), [0, 0, 1, 0]);
  assert.equal(senza.esito, "quasiPronto");
  assert.deepEqual(senza.pilastri.borse.righe.map((x) => x.stato), ["fatta", "manca", "manca"]);
  assert.deepEqual(senza.avvisi, []);
  controllaTutti(senza, "NorthCape4000 senza borse");
});

// Anna prepara la Final Frontier Patagonia completa in 20 giorni, H 8,6 inventata, e ha esperienza.
function anna(borseDelBlocco) {
  const partenza = "2027-03-06";
  const uscite = [
    ...tranne(settimane(partenza, -14, -1, 8.4, 5.5), partenza, -15, -13),
    ...viaggio(partenza, -15, [6.5, 6.5, 6.5], { borse: borseDelBlocco, notteFuori: null }),
  ];
  const stima = { H: 8.6, T: 172, livello: 1, giorni: 20 };
  return valutaProntezza({ percorso: trovaPercorso("ffp-completo"), giorni: 20, partenza, oggi: piu(partenza, -1), uscite, stima, esperienza: "3" });
}

test("caso tipo come la Patagonia, quasi pronto con il blocco senza risposta e con il blocco carico, testo dell'esperto", () => {
  for (const borse of [null, "evento"]) {
    const r = anna(borse);
    assert.deepEqual(difetti(r), [0, 0, 1, 0], `blocco con ${borse}`);
    assert.equal(r.esito, "quasiPronto");
    assert.equal(r.verdetto.perche, "Ti manca solo la prova con le borse.");
    assert.equal(r.verdetto.cosa, "Con i viaggi che hai già fatto puoi anche partire sapendolo, ma tre ore con la bici carica ti dicono se sella, mani e borse vanno.");
    controllaTutti(r, `Patagonia, blocco con ${borse}`);
  }
  // Dichiarato carico, il blocco vale come blocco e come test, fatti tardi, e la prova generale manca
  // perché ogni uscita vale una prova sola.
  const carico = Object.fromEntries(anna("evento").pilastri.borse.righe.map((x) => [x.prova, x]));
  assert.deepEqual([carico.T1.stato, carico.T1.tardi, carico.blocco.stato, carico.blocco.tardi, carico.T3.stato], ["fatta", true, "fatta", true, "manca"]);
  assert.ok(carico.blocco.testo.endsWith("fatto tardi. Arrivi meno fresco."));
});

test("caso tipo come il Tuscany Trail, pronto con margine", () => {
  const partenza = "2027-05-21";
  const uscite = [
    ...tranne(settimane(partenza, -16, -1, 8, 4), partenza, -39, -22),
    ...viaggio(partenza, -39, Array.from({ length: 18 }, (_, i) => 8 + (i % 3))),
  ];
  const stima = { H: 9.9, T: 29.7, livello: 1, giorni: 3 };
  const r = valutaProntezza({ percorso: trovaPercorso("tt-originale"), giorni: 3, partenza, oggi: piu(partenza, -1), uscite, stima });
  assert.deepEqual(difetti(r), [0, 0, 0, 0]);
  assert.ok(r.pilastri.volume.margine && r.pilastri.lunga.margine);
  assert.equal(r.esito, "conMargine");
  assert.deepEqual([r.verdetto.titolo, r.verdetto.perche, r.verdetto.cosa], ["Pronto, con margine", "Hai le ore, l'uscita lunga e le prove con le borse.", "Adesso conta arrivare riposato. Segui lo scarico finale."]);
  assert.ok(r.pilastri.borse.righe.every((x) => x.stato === "fatta" && !x.tardi), "il viaggio finisce 22 giorni prima");
  assert.equal(r.pilastri.borse.testo, "Prove con le borse, fatte tutte e tre.");
  controllaTutti(r, "Tuscany Trail");
});

test("primo viaggio senza prove cariche, con volume e lunga a posto, quasi pronto con il testo del primo viaggio", () => {
  const partenza = "2027-05-21";
  const stima = { H: 6.8, T: 34, livello: 1, giorni: 5 };
  const r = valutaProntezza({ percorso: trovaPercorso("tt-originale"), giorni: 5, partenza, oggi: piu(partenza, -1), uscite: settimane(partenza, -16, -1, 7.5, 5), stima });
  assert.deepEqual(difetti(r), [0, 0, 1, 0]);
  assert.equal(r.esito, "quasiPronto");
  assert.equal(r.verdetto.perche, "Hai le ore, ma non hai mai pedalato con le borse per più giorni.");
  assert.equal(r.verdetto.cosa, "Per un primo viaggio è la cosa che conta di più, perché sella, mani e borse si scoprono solo così.");
  controllaTutti(r, "primo viaggio");
});

test("6 giorni e più senza uscite cariche di più giorni e senza esperienza, difetto 2 e poco pronto", () => {
  const partenza = "2027-07-29";
  const uscite = [...tranne(settimane(partenza, -16, -1, 8, 5), partenza, -82, -82), giro(partenza, -82, 4, { borse: "evento" })];
  const stima = { H: 8, T: 72, livello: 1, giorni: 9 };
  const dati = { percorso: trovaPercorso("nc4k-berlino"), giorni: 9, partenza, oggi: piu(partenza, -1), uscite, stima };
  const r = valutaProntezza(dati);
  assert.equal(r.classe, "6-10");
  assert.deepEqual(difetti(r), [0, 0, 2, 0]);
  assert.equal(r.esito, "pocoPronto");
  assert.equal(r.verdetto.perche, testi.BORSE_DIFETTO_DUE);
  controllaTutti(r, "sei giorni senza viaggi");
  // Con un viaggio di più giorni già fatto il difetto scende a 1, ma non a 0.
  const esperta = valutaProntezza({ ...dati, esperienza: "2" });
  assert.deepEqual(difetti(esperta), [0, 0, 1, 0]);
  assert.equal(esperta.esito, "quasiPronto");
});

// --- Le prove con le borse (2.4) ---

test("una prova finita 18 giorni prima conta, con la nota «fatta tardi»", () => {
  const partenza = "2027-05-20";
  const uscite = [
    giro(partenza, -60, 4, { borse: "evento" }),
    giro(partenza, -50, 5, { borse: "evento" }),
    ...viaggio(partenza, -19, [5, 3.5]),
  ];
  const b = pilastroBorse(uscite, partenza, 7, "2-5", true, [], { oggi: piu(partenza, -1) });
  const t3 = b.righe.find((x) => x.prova === "T3");
  assert.deepEqual([t3.stato, t3.tardi, t3.a], ["fatta", true, piu(partenza, -18)]);
  assert.equal(b.difetto, 0, "conta come fatta");
  assert.equal(t3.testo, "Prova generale con le borse, sabato 1 maggio, fatta tardi. Arrivi meno fresco.");
  // Finita 21 giorni prima non è tardi.
  const inTempo = pilastroBorse([...uscite.slice(0, 2), ...viaggio(partenza, -22, [5, 3.5])], partenza, 7, "2-5", true);
  assert.equal(inTempo.righe.find((x) => x.prova === "T3").tardi, false);
});

test("un'uscita carica di 4 giorni finita 30 giorni prima vale come blocco e come prova generale, con l'avviso", () => {
  const partenza = "2027-07-29";
  const b = pilastroBorse(viaggio(partenza, -33, [6, 5.5, 5, 5]), partenza, 9.5, "11+", true);
  assert.deepEqual(b.righe.map((x) => [x.prova, x.stato, x.doppioUso]), [["T1", "fatta", false], ["blocco", "fatta", true], ["T3", "fatta", true]]);
  assert.equal(b.difetto, 0);
  assert.deepEqual(b.avvisi.map((a) => a.testo), [testi.AVVISO_DOPPIO_USO]);
  // Finita 14 giorni prima vale una prova sola, e vince la più grande.
  const tardi = pilastroBorse(viaggio(partenza, -17, [6, 5.5, 5, 5]), partenza, 9.5, "11+", true);
  assert.deepEqual(tardi.righe.map((x) => x.stato), ["fatta", "fatta", "manca"]);
  assert.deepEqual(tardi.avvisi, []);
  // Due uscite diverse tengono blocco e prova generale separati, senza avviso.
  const due = pilastroBorse([...viaggio(partenza, -55, [6, 5.5, 5]), ...viaggio(partenza, -33, [6, 5.5, 5, 5])], partenza, 9.5, "11+", true);
  assert.equal(due.difetto, 0);
  assert.deepEqual(due.avvisi, []);
});

test("un giro di 5 ore senza risposta sulle borse non è una prova, e nemmeno «Sì, in parte»", () => {
  const partenza = "2027-05-20";
  const prove = (borse) => abbinaProve([giro(partenza, -40, 5, { borse })], partenza, 7, "2-5").prove.T1.stato;
  assert.deepEqual([prove(null), prove("no"), prove("parte"), prove("evento")], ["manca", "manca", "manca", "fatta"]);
  // Sotto le 3 ore nemmeno «come all'evento» fa un test.
  assert.equal(abbinaProve([giro(partenza, -40, 2.5, { borse: "evento" })], partenza, 7, "2-5").prove.T1.stato, "manca");
  // Un evento fatto con l'app vale come uscita carica di più giorni, con la notte fuori.
  const evento = [giro(partenza, -45, 6, { modoEvento: true, borse: null }), giro(partenza, -44, 5, { modoEvento: true, borse: null })];
  assert.equal(abbinaProve(evento, partenza, 7, "2-5").prove.T3.stato, "fatta");
  // Due giorni carichi senza la notte fuori non fanno la prova generale.
  const senzaNotte = viaggio(partenza, -45, [6, 5], { notteFuori: false });
  assert.equal(abbinaProve(senzaNotte, partenza, 7, "2-5").prove.T3.stato, "manca");
  // I rulli non sono mai una prova.
  assert.equal(abbinaProve([giro(partenza, -40, 4, { borse: "evento", tipo: "VirtualRide", rulli: true })], partenza, 7, "2-5").prove.T1.stato, "manca");
});

test("le mani segnate dopo un test danno «da sistemare», e un test dopo con «Tutto bene» lo toglie", () => {
  const partenza = "2027-05-20";
  const uscite = [giro(partenza, -60, 4, { borse: "evento" }), giro(partenza, -45, 5, { borse: "evento" }), ...viaggio(partenza, -30, [5.5, 4])];
  const segnato = [{ giorno: piu(partenza, -29), esito: "sistemare", aree: ["mani", "borse"] }];
  const b = pilastroBorse(uscite, partenza, 7, "2-5", true, segnato);
  assert.equal(b.mancano, 0);
  assert.equal(b.difetto, 1);
  assert.equal(b.daSistemare.testo, "Nell'ultima prova hai segnato le mani. Cambia presa più spesso, controlla guanti e manubrio, poi rifai tre ore con la bici carica.");
  const dopo = [...segnato, { giorno: piu(partenza, -25), esito: "bene" }];
  const bene = pilastroBorse([...uscite, giro(partenza, -25, 3, { borse: "evento" })], partenza, 7, "2-5", true, dopo);
  assert.deepEqual([bene.difetto, bene.daSistemare], [0, null]);
  // Solo le borse che si muovono non sono un punto di contatto.
  assert.equal(pilastroBorse(uscite, partenza, 7, "2-5", true, [{ giorno: piu(partenza, -29), esito: "sistemare", aree: ["borse"] }]).difetto, 0);
  // Due prove con due punti diversi, senza «Tutto bene» in mezzo.
  const due = pilastroBorse(uscite, partenza, 7, "2-5", true, [...segnato, { giorno: piu(partenza, -26), esito: "sistemare", aree: ["sedere"] }]);
  assert.ok(due.daSistemare.testo.startsWith("Nelle ultime prove hai segnato le mani e il sedere."));
  controllaTesto(due.daSistemare.testo, "due punti di contatto");
});

test("chi segue il piano supera sempre le soglie delle prove (2.4 e 9.4)", () => {
  const partenza = "2027-06-12";
  const fra = (x, a, b) => Math.min(b, Math.max(a, x));
  // Le sedute carichi degli schemi di 3.4 nelle loro settimane, a giorni dalla partenza.
  const schemi = {
    A: (h) => [...viaggio(partenza, -68, [fra(0.5 * h, 3, 4)]), ...viaggio(partenza, -47, [0.7 * h]), ...viaggio(partenza, -26, [0.8 * h, 0.55 * h])],
    B: (h) => [...viaggio(partenza, -54, [fra(0.5 * h, 3, 4)]), ...viaggio(partenza, -33, [0.7 * h]), ...viaggio(partenza, -26, [0.75 * h, 0.5 * h])],
    C: (h) => [...viaggio(partenza, -96, [3.5]), ...viaggio(partenza, -75, [0.5 * h]), ...viaggio(partenza, -61, [0.55 * h, 0.36 * h]),
      ...viaggio(partenza, -40, [0.6 * h, 0.6 * h, 0.55 * h]), ...viaggio(partenza, -26, [0.6 * h, 0.5 * h])],
  };
  for (const h of [4, 5.5, 7, 9, 11]) {
    for (const nome of ["A", "B"]) {
      const b = pilastroBorse(schemi[nome](h), partenza, h, "2-5", false);
      assert.equal(b.difetto, 0, `schema ${nome} con H ${h}`);
      assert.ok(b.righe.every((x) => !x.tardi), `schema ${nome} con H ${h} in tempo`);
    }
  }
  for (const [h, classe] of [[7, "6-10"], [9, "6-10"], [9, "11+"], [12, "11+"]]) {
    const b = pilastroBorse(schemi.C(h), partenza, h, classe, false);
    assert.equal(b.difetto, 0, `schema C con H ${h} per ${classe}`);
    assert.deepEqual(b.avvisi, [], "blocco e prova generale in due uscite diverse");
  }
  // Schema D, un giorno con le borse, un giorno carico di 0,5 × H alla −6.
  for (const h of [3, 5, 7]) {
    assert.equal(pilastroBorse(viaggio(partenza, -40, [0.5 * h]), partenza, h, "1", false, [], { borseKg: 8 }).difetto, 0, `schema D con H ${h}`);
  }
  assert.equal(pilastroBorse([], partenza, 5, "1", false).stato, "nonServe", "senza borse per un giorno il pilastro non vale");
});

// --- Continuità, volume e verdetto ---

// Paola, Tuscany Trail Originale in 4 giorni con H 7 inventata, ha già fatto viaggi, ed è a posto
// in tutto. buco sono i giorni di fila senza bici prima della partenza.
function paola(buco) {
  const partenza = "2027-05-20";
  let uscite = settimane(partenza, -16, -1, 10, 4.6);
  for (const [d1, d2] of [[-80, -80], [-60, -60], [-40, -39]]) uscite = tranne(uscite, partenza, d1, d2);
  uscite = tranne(uscite, partenza, -buco, -1);
  uscite.push(giro(partenza, -80, 4, { borse: "evento" }), giro(partenza, -60, 4.5, { borse: "evento" }), ...viaggio(partenza, -40, [4.5, 3.2]), giro(partenza, -buco - 1, 1));
  const stima = { H: 7, T: 28, livello: 1, giorni: 4 };
  return valutaProntezza({ percorso: trovaPercorso("tt-originale"), giorni: 4, partenza, oggi: partenza, uscite, stima, esperienza: true });
}

test("un buco di 20, 24 e 28 giorni con tutto il resto a posto dà pronto, quasi pronto e poco pronto", () => {
  const esiti = [20, 24, 28].map(paola);
  assert.deepEqual(esiti.map((r) => r.pilastri.continuita.valore), [20, 24, 28]);
  assert.deepEqual(esiti.map((r) => r.pilastri.continuita.difetto), [0, 1, 2]);
  for (const r of esiti) assert.deepEqual(difetti(r).slice(0, 3), [0, 0, 0]);
  assert.deepEqual(esiti.map((r) => r.esito), ["pronto", "quasiPronto", "pocoPronto"]);
  assert.equal(esiti[2].verdetto.perche, "Ti sei fermato 28 giorni di fila. Si riparte piano, il piano lo sa.");
  assert.ok(esiti[0].verdetto.righe.every((x) => x.pilastro !== "continuita"), "la continuità a posto non si mostra");
  for (const r of esiti) controllaTutti(r, `buco di ${r.pilastri.continuita.valore} giorni`);
});

test("V uguale a V_min dà difetto 0, a 0,8 × V_min 1, appena sotto 2", () => {
  const partenza = "2027-05-20";
  const ob = obiettivi(8, "2-5");   // V_min 7,2
  const conOre = (ore) => {
    const giorni = [];
    for (let k = -10; k <= -3; k++) giorni.push({ giorno: piu(partenza, 7 * k + 5), ore, vere: ore });
    return pilastroVolume(giorni, partenza, ob);
  };
  assert.deepEqual([conOre(7.2), conOre(0.8 * 7.2), conOre(5.7)].map((v) => v.difetto), [0, 1, 2]);
  assert.equal(conOre(7.2).testo, "Ore in bici, in media 7 ore e 10 a settimana. Bene.");
  assert.equal(conOre(5.7).testo, "Ore in bici, in media 5 ore e 40 a settimana. Ne servono almeno 7 e mezza.");
  // La lunga, allo stesso modo con 0,9 e 0,75 × LT.
  const lt = ob.lt;   // 5,6
  const lunga = (ore) => pilastroLunga([giro(partenza, -30, ore)], partenza, "2-5", ob).difetto;
  assert.deepEqual([lunga(0.9 * lt), lunga(0.75 * lt), lunga(0.74 * lt)], [0, 1, 2]);
});

test("verdetto, somme dei difetti e il pilastro più lontano", () => {
  const p = (nome, d, extra = {}) => ({ difetto: d, testo: `riga ${nome}`, stato: "fatto", margine: false, ...extra });
  const base = (v, l, b, c) => ({
    volume: p("volume", v), lunga: p("lunga", l), continuita: p("continuita", c),
    borse: { ...p("borse", b), righe: [], mancano: b ? 1 : 0, uscitePiuGiorni: 1 },
  });
  assert.equal(verdetto(base(0, 0, 0, 0)).esito, "pronto");
  assert.equal(verdetto({ ...base(0, 0, 0, 0), volume: p("volume", 0, { margine: true }), lunga: p("lunga", 0, { margine: true }) }).esito, "conMargine");
  assert.equal(verdetto(base(0, 1, 0, 0)).esito, "quasiPronto");
  assert.equal(verdetto(base(1, 1, 0, 0)).esito, "pocoPronto", "somma 2");
  assert.equal(verdetto(base(0, 0, 0, 2)).esito, "pocoPronto", "un difetto da 2");
  assert.equal(verdetto(base(1, 2, 0, 2)).perche, "riga lunga", "a parità vince l'uscita lunga sulla continuità");
  assert.equal(verdetto(base(1, 1, 0, 0)).perche, "riga volume");
  assert.equal(verdetto(base(0, 0, 2, 1)).perche, "riga borse");
  assert.equal(verdetto(base(1, 1, 0, 0)).cosa, "Prova con più giorni, ti faccio vedere come cambia.");
  assert.equal(verdetto(base(1, 1, 0, 0), { proposta: { tipo: "corto" } }).cosa, "Prova un percorso più corto, ti faccio vedere come cambia.");
  const nv = verdetto(null);
  assert.deepEqual([nv.esito, nv.titolo, nv.perche, nv.cosa], ["nonValutabile", "Non posso ancora dirlo", "Mi servono almeno 4 settimane di uscite.", null]);
});

test("stessi dati con Fitness 0 e 200, stesso verdetto", () => {
  const partenza = "2027-05-21";
  const uscite = [...tranne(settimane(partenza, -16, -1, 8, 4), partenza, -39, -22), ...viaggio(partenza, -39, Array.from({ length: 18 }, () => 8))];
  const dati = { percorso: trovaPercorso("tt-originale"), giorni: 3, partenza, oggi: piu(partenza, -1), uscite, stima: { H: 9.9, T: 29.7, livello: 1, giorni: 3 } };
  const zero = valutaProntezza({ ...dati, fitness: 0 });
  const duecento = valutaProntezza({ ...dati, fitness: 200 });
  assert.equal(zero.esito, duecento.esito);
  assert.deepEqual(difetti(zero), difetti(duecento));
  assert.deepEqual([zero.confronto.esito, duecento.confronto.esito], ["sotto", "sopra"]);
  assert.ok(zero.confronto.inTapering, "alla vigilia lo scarico finale è cominciato");
});

// --- La fiducia (2.5) ---

test("6 giri da Strava senza durata su 20, il 30% delle ore, fiducia bassa con la riga di cosa manca", () => {
  const partenza = "2027-05-20";
  const uscite = [];
  for (let i = 0; i < 20; i++) {
    const stub = i % 10 < 3;   // 6 su 20
    const campi = stub ? { stub: true, sorgente: "STRAVA", secondi: null, metri: null, dislivello: null, tipo: null, qualita: { secondi: "manca" } } : {};
    uscite.push(giro(partenza, -69 + Math.floor(i * 2.75), 2, campi));
  }
  const giorni = giorniDiBici(uscite, { dal: piu(partenza, -112), al: piu(partenza, -1) });
  const f = fiduciaVerdetto(giorni, uscite, 1, { partenza, oggi: piu(partenza, -1) });
  vicino(f.quota, 0.7, 1e-9);
  assert.equal(f.livello, "bassa");
  assert.equal(f.testo, "Mi mancano le ore di 6 giri arrivati da Strava. Toccali per dirmele.");
  assert.equal(f.titolo, testi.FIDUCIA.bassa);
  // Le ore che mancano valgono zero nel conto del volume.
  vicino(pilastroVolume(giorni, partenza, obiettivi(7, "2-5")).valore, 28 / 8, 1e-9);
  // Con le durate dette la fiducia torna alta.
  const dette = uscite.map((u) => (u.stub ? { ...u, secondi: 7200, qualita: { secondi: "detta da te" } } : u));
  assert.equal(fiduciaVerdetto(giorniDiBici(dette, { dal: piu(partenza, -112), al: piu(partenza, -1) }), dette, 1, { partenza, oggi: piu(partenza, -1) }).livello, "alta");
});

test("fiducia media con le borse senza risposta o con la stima al livello 0, bassa con meno di 6 settimane di dati", () => {
  const partenza = "2027-05-20";
  const oggi = piu(partenza, -1);
  const uscite = settimane(partenza, -12, -1, 7, 3.5);
  assert.equal(fiduciaVerdetto([], uscite, 1, { partenza, oggi }).livello, "alta");
  const stima = fiduciaVerdetto([], uscite, 0, { partenza, oggi });
  assert.deepEqual([stima.livello, stima.motivo.tipo], ["media", "stima"]);
  controllaTesto(stima.testo, "fiducia della stima");
  const senzaRisposta = uscite.map((u, i) => (i === 5 ? { ...u, borse: null } : u));
  const borse = fiduciaVerdetto([], senzaRisposta, 1, { partenza, oggi });
  assert.deepEqual([borse.livello, borse.testo], ["media", "Mi manca la risposta sulle borse di un'uscita lunga. Toccala per dirmela."]);
  const corta = fiduciaVerdetto([], uscite, 1, { partenza, oggi, primoGiorno: piu(partenza, -36) });
  assert.deepEqual([corta.livello, corta.testo], ["bassa", "Ho le tue uscite da 5 settimane. Da 6 il verdetto è più sicuro."]);
});

test("con dati da 3 settimane il verdetto è «Non posso ancora dirlo»", () => {
  const partenza = "2027-05-20";
  const uscite = settimane(partenza, -3, -1, 8, 4);
  const r = valutaProntezza({ percorso: trovaPercorso("tt-originale"), giorni: 4, partenza, oggi: piu(partenza, -1), uscite, stima: { H: 8, T: 32, livello: 1, giorni: 4 } });
  assert.equal(r.fase, "nonValutabile");
  assert.deepEqual([r.verdetto.titolo, r.verdetto.perche, r.verdetto.cosa], ["Non posso ancora dirlo", "Mi servono almeno 4 settimane di uscite.", null]);
  assert.ok(r.obiettivi && r.H === 8, "mostra solo H e gli obiettivi");
  // Senza giornata non si può dire niente, e con la e-bike senza risposta nemmeno.
  assert.equal(valutaProntezza({ partenza, oggi: piu(partenza, -1) }).verdetto.perche, testi.NON_VALUTABILE.giornata);
  const ebike = valutaProntezza({ percorso: trovaPercorso("tt-originale"), giorni: 4, partenza, oggi: piu(partenza, -1), profilo: { ebike: true } });
  assert.equal(ebike.verdetto.perche, testi.NON_VALUTABILE.ebike);
  assert.equal(valutaProntezza({ percorso: trovaPercorso("tt-originale"), giorni: 4, oggi: "2027-01-10" }).fase, "senzaData");
});

// --- Prima della vigilia (2.7) ---

// Luca prepara il Tuscany Trail Originale in 4 giorni, partenza giovedì 20 maggio 2027, con H 7,9
// inventata. Il piano ha le settimane di calendario dalla −12 alla −1 e le sedute chiave del sabato.
function pianoDiLuca() {
  const lunedi = (w) => piu("2027-05-10", -7 * (w - 1));
  const schema = [
    [12, "N", 6.1, [["lunga", 3.55]]], [11, "N", 7.0, [["lunga", 3.95]]], [10, "E", 7.5, [["T1", 3.95]]],
    [9, "S", 4.5, [["lunga", 2.4]]], [8, "E", 9.7, [["weekend", 5.1], ["weekend", 3.55]]], [7, "E", 8.7, [["T2", 5.5]]],
    [6, "S", 5.2, [["lunga", 2.75]]], [5, "E", 10.3, [["weekend", 5.5], ["weekend", 3.55]]], [4, "E", 10.8, [["T3", 6.3], ["T3", 4.35]]],
    [3, "N", 7.5, [["lunga", 3.95]]], [2, "tapering", 5.6, [["controllo", 2.4]]], [1, "tapering", 3.5, []],
  ];
  return {
    settimane: schema.map(([w, tipo, ore, sedute]) => ({
      lunedi: lunedi(w), indice: -w, tipo, ore,
      sedute: sedute.map(([t, h], i) => ({ giorno: piu(lunedi(w), 5 + i), tipo: t, ore: h })),
    })),
  };
}

// Le settimane passate del piano fatte a una quota delle ore, con la seduta chiave del sabato alla
// stessa quota e il resto martedì e giovedì, più quattro settimane prima del piano.
function usciteDiLuca(piano, oggi, quota) {
  const uscite = [];
  for (const s of piano.settimane) {
    if (piu(s.lunedi, 6) >= oggi) continue;
    let chiave = 0;
    for (const x of s.sedute) {
      const carica = ["T1", "T2", "T3"].includes(x.tipo);
      uscite.push(giroIl(x.giorno, x.ore * quota, carica ? { borse: "evento", notteFuori: x.tipo === "T3" } : {}));
      chiave += x.ore * quota;
    }
    const resto = (quota * s.ore - chiave) / 2;
    uscite.push(giroIl(piu(s.lunedi, 1), resto), giroIl(piu(s.lunedi, 3), resto));
  }
  for (let i = 1; i <= 4; i++) {
    const l = piu(piano.settimane[0].lunedi, -7 * i);
    uscite.push(giroIl(piu(l, 1), 1.5), giroIl(piu(l, 3), 1.5), giroIl(piu(l, 5), 3));
  }
  uscite.push(giroIl(piu(oggi, -1), 1));
  return uscite;
}

test("alla −6 con il piano, la frase della proiezione e, con l'80% delle ore del piano, la riga di 2.7", () => {
  const partenza = "2027-05-20";
  const oggi = "2027-04-08";
  const piano = pianoDiLuca();
  const stima = { H: 7.9, T: 31.6, livello: 1, giorni: 4 };
  const dati = { percorso: trovaPercorso("tt-originale"), giorni: 4, partenza, oggi, piano, stima, oreDisponibili: 10 };
  const r = valutaProntezza({ ...dati, uscite: usciteDiLuca(piano, oggi, 0.8) });
  assert.equal(r.fase, "proiezione");
  assert.equal(r.verdetto, null, "prima della −3 il verdetto non c'è");
  assert.equal(r.proiezione.frase, "Se segui il piano, ci arrivi pronto.");
  assert.ok(!r.proiezione.base);
  const sotto = r.proiezione.sottoPiano;
  assert.ok(sotto && sotto.rifare, "da due domeniche sotto l'85%");
  vicino(sotto.fatte / sotto.piano, 0.8, 1e-6);
  assert.match(sotto.testo, /^Nelle ultime tre settimane hai fatto .+ contro le .+ del piano\. Se succede ancora, rifaccio il piano con i tuoi tempi\.$/);
  const righe = r.proiezione.righe.map((x) => x.testo);
  assert.ok(righe.includes("Uscita più lunga, 4 ore e 20. L'obiettivo è 5 ore e mezza, il piano ci arriva sabato 17 aprile."), righe.join(" | "));
  assert.ok(righe.includes("Prova generale con le borse, in programma sabato 24 aprile. È la prova che conta di più per bici, borse e sedere."), righe.join(" | "));
  const tutti = controllaTutti(r, "proiezione alla −6");
  assert.ok(tutti.every((t) => !/indietro/i.test(t)));
  // Con tutte le ore del piano la riga non c'è.
  assert.equal(valutaProntezza({ ...dati, uscite: usciteDiLuca(piano, oggi, 1) }).proiezione.sottoPiano, null);
});

test("la proiezione nella base, con poca storia e quando arriva poco pronto", () => {
  const partenza = "2027-05-20";
  const piano = pianoDiLuca();
  const ob = obiettivi(7.9, "2-5");
  const lontano = "2027-02-01";   // 15 settimane prima
  const uscite = settimane(partenza, -22, -17, 6, 3);
  const base = proiezione(uscite, piano, lontano, partenza, 7.9, "2-5", { uscite, esperienza: true });
  assert.ok(base.base);
  assert.equal(base.frasi[0], "Siamo nella base.");
  assert.ok(base.pilastri.volume.valore > ob.vMin, "dà per fatto tutto il piano");
  const corta = proiezione([], piano, "2027-04-08", partenza, 7.9, "2-5", { uscite: [giro(partenza, -50, 2)] });
  assert.deepEqual([corta.storiaCorta, corta.esito, corta.frase], [true, null, "Per dirti dove arrivi mi servono almeno 3 settimane di uscite. Intanto segui il piano."]);
  // Senza piano e con poche ore la proiezione arriva poco pronto e la frase propone i giorni.
  const poche = settimane(partenza, -12, -7, 2, 1);
  const p = proiezione(poche, null, "2027-04-08", partenza, 7.9, "2-5", { uscite: poche, proposta: { tipo: "adattare", giorni: 6 } });
  assert.equal(p.esito, "pocoPronto");
  assert.equal(p.frase, "Se continui così, arrivi poco pronto. Ti propongo 6 giorni.");
});

// --- Più giorni, il percorso corto, partire e adattare (2.8) ---

test("giorni consigliati con T 34 e una lunga di 4 ore, 6, la formula vince sull'esempio", () => {
  const g = giorniConsigliati({ percorso: trovaPercorso("tt-originale"), giorni: 4, T: 34, lRif: 4 });
  assert.deepEqual([g.giorni, g.motivo, g.restano], [6, "lunga", []]);
  // Senza un percorso non c'è il tetto dei giorni massimi.
  assert.equal(giorniConsigliati({ giorni: 3, T: 60, lRif: 4 }).giorni, 10);
  // Mai oltre i giorni massimi, e allora il limite resta.
  const oltre = giorniConsigliati({ percorso: trovaPercorso("tt-originale"), giorni: 4, T: 34, lRif: 3 });
  assert.deepEqual([oltre.giorni, oltre.motivo, oltre.restano], [6, "lunga", ["lunga"]]);
});

test("Tuscany Trail Originale senza dati, in 3 giorni almeno 4 per il tetto, in 4 giorni con 6 ore 6 per il tempo", () => {
  const percorso = trovaPercorso("tt-originale");
  const tre = giorniConsigliati({ percorso, giorni: 3, T: stimaH({ percorso, giorni: 3, oggi: "2027-01-10" }).T });
  assert.ok(tre.giorni >= 4);
  assert.equal(tre.motivo, "tetto");
  const quattro = giorniConsigliati({ percorso, giorni: 4, T: stimaH({ percorso, giorni: 4, oggi: "2027-01-10" }).T, oreDisponibili: 6 });
  assert.deepEqual([quattro.giorni, quattro.motivo], [6, "tempo"]);
  assert.equal(giorniConsigliati({ percorso, giorni: 5, T: 30 }).motivo, null, "con abbastanza giorni nessuna proposta");
  // Il tetto è di 12 ore da 11 giorni in su.
  assert.equal(giorniConsigliati({ percorso: trovaPercorso("nc4k-berlino"), giorni: 12, T: 158 }).giorni, 14);
});

test("più giorni quando bastano, anche oltre i quattro numeri, con la loro frase", () => {
  const partenza = "2027-05-20";
  let uscite = tranne(settimane(partenza, -16, -1, 4, 3.5), partenza, -60, -59);
  uscite = tranne(uscite, partenza, -40, -40);
  uscite.push(giro(partenza, -80, 4, { borse: "evento" }), ...viaggio(partenza, -60, [6, 4]), giro(partenza, -40, 6));
  const dati = { percorso: trovaPercorso("tt-originale"), giorni: 4, partenza, oggi: piu(partenza, -1), uscite, stima: { H: 8.5, T: 34, livello: 1, giorni: 4 }, esperienza: true };
  const r = valutaProntezza(dati);
  assert.equal(r.pilastri.volume.difetto, 2);
  assert.equal(r.esito, "pocoPronto");
  assert.deepEqual([r.proposta.tipo, r.proposta.giorni, r.proposta.motivo], ["giorni", 5, "uscite"]);
  assert.equal(r.verdetto.cosa, "Prova con più giorni, ti faccio vedere come cambia.");
  assert.deepEqual(testi.righeProposta(r.proposta, { giorni: 4, H: 8.5 }), ["In 4 giorni ogni giornata dura circa 8 ore e mezza. Con le uscite che hai fatto ti consiglio 5 giorni, con circa 7 ore al giorno."]);
  controllaTutti(r, "più giorni");
});

test("il percorso corto è il più lungo che basta, nell'ordine dell'evento", () => {
  const oggi = "2027-01-10";
  const corto = percorsoCorto(trovaPercorso("tg-lungo"), CATALOGO, {}, 3, { oggi });
  assert.deepEqual([corto.esito, corto.percorso.id, corto.giorni], ["corto", "tg-corto", 4], "dal Lungo si va al Corto, non al Medio");
  assert.equal(percorsoCorto(trovaPercorso("tg-lungo"), CATALOGO, {}, 2, { oggi }).esito, ARRIVARE_E_ADATTARE);
  assert.equal(percorsoCorto(trovaPercorso("tt-newbie"), CATALOGO, {}, 6, { oggi }).esito, ARRIVARE_E_ADATTARE, "il Newbie non ha un percorso più corto");
  assert.equal(percorsoCorto(trovaPercorso("ffp-completo"), CATALOGO, {}, 8, { oggi }).percorso.id, "ffp-puma");
  assert.equal(percorsoCorto(trovaPercorso("nc4k-rovereto"), CATALOGO, {}, 8, { oggi }).percorso.id, "nc4k-berlino");
  assert.equal(percorsoCorto(trovaPercorso("tt-originale-detour"), CATALOGO, {}, 8, { oggi }).percorso.id, "tt-originale");
  // Le ore stimate possono arrivare da fuori, e le ore disponibili contano.
  const fisso = percorsoCorto(trovaPercorso("tt-originale"), CATALOGO, {}, 4, { stimaPer: () => 12 });
  assert.deepEqual([fisso.percorso.id, fisso.giorni, fisso.H], ["tt-newbie", 3, 4]);
  assert.equal(percorsoCorto(trovaPercorso("tt-originale"), CATALOGO, {}, 4, { stimaPer: () => 12, oreDisponibili: 3 }).esito, ARRIVARE_E_ADATTARE);
  // I testi della proposta.
  assert.equal(testi.passaA(trovaPercorso("tg-corto")), "Passa al Corto");
  assert.equal(testi.passaA(trovaPercorso("tge-is-express")), "Passa all'Express");
  assert.equal(testi.passaA(trovaPercorso("nc4k-berlino")), "Parti da Berlino");
  assert.equal(testi.fraseCorto({ percorso: trovaPercorso("tg-corto"), giorni: 4, H: 3.6 }), "Ti propongo il Corto in 4 giorni, con circa 3 ore e mezza al giorno. È lo stesso viaggio, con meno strada.");
  assert.equal(testi.propostaBreve({ tipo: "corto", percorso: trovaPercorso("nc4k-berlino") }), "Ti propongo la partenza da Berlino.");
});

test("l'uscita di riferimento, la più lunga delle ultime 6 settimane oppure il picco con il passo della lunga", () => {
  const partenza = "2027-05-20";
  const uscite = [giro(partenza, -70, 5), giro(partenza, -40, 3), giro(partenza, -20, 2.5)];
  assert.deepEqual(lungaRiferimento({ uscite, oggi: piu(partenza, -14), partenza }), { ore: 3, giorno: piu(partenza, -40), dalPiano: false });
  // A 57 giorni dalla partenza, sei settimane fino alla fine della −3, con lo scarico alla quarta.
  const lontano = piu(partenza, -57);
  const l = lungaRiferimento({ uscite: [giro(partenza, -60, 3)], oggi: lontano, partenza });
  vicino(l.ore, 6.57, 1e-9);
  assert.ok(l.dalPiano);
  // Dal piano, con le sedute tagliate dal passo della lunga.
  const piano = { settimane: [0, 1, 2].map((i) => ({ lunedi: piu(lontano, 3 + 7 * i), ore: 6, sedute: [{ giorno: piu(lontano, 8 + 7 * i), ore: [4, 4.5, 5][i] }] })) };
  vicino(lungaRiferimento({ uscite: [giro(partenza, -60, 3)], oggi: lontano, partenza, piano }).ore, 5, 1e-9);
});

// --- Gli altri numeri (2.6) ---

test("il confronto con la Fitness, divisa per 0,9 dopo l'inizio dello scarico finale, e i suoi avvisi", () => {
  const prima = specchio(50, 9.5, 11.5, 66, false);
  vicino(prima.minimo, 50 * 9.5 / 7, 1e-9);
  vicino(prima.comodo, 50 * 11.5 / 7, 1e-9);
  assert.deepEqual([prima.confronto, prima.esito], [66, "sotto"]);
  const dopo = specchio(50, 9.5, 11.5, 66, true);
  vicino(dopo.confronto, 66 / 0.9, 1e-9);
  assert.equal(dopo.esito, "inLinea");
  assert.equal(specchio(null, 7, 9, 30).k, 40, "senza dati k vale 40");
  assert.equal(specchio(50, 9.5, 11.5, null).esito, null);
  controllaTesto(testi.testoFitness(dopo), "Fitness nello scarico finale");
  assert.ok(testi.testoFitness(dopo).includes("Prima dello scarico valeva circa 73, in linea."));
  const pilastri = { volume: { difetto: 0 }, lunga: { difetto: 1 }, borse: { difetto: 0 } };
  assert.deepEqual(avvisiFitness(specchio(50, 9.5, 11.5, 80), pilastri).map((a) => a.tipo), ["intensita"]);
  assert.deepEqual(avvisiFitness(specchio(50, 9.5, 11.5, 40), { ...pilastri, lunga: { difetto: 0 } }).map((a) => a.tipo), ["sforzo"]);
  assert.deepEqual(avvisiFitness(specchio(50, 9.5, 11.5, 75), { ...pilastri, lunga: { difetto: 0 } }), []);
});

test("palestra, durabilità e stomaco, che non decidono", () => {
  const oggi = "2027-05-01";
  const uscite = [
    giroIl("2027-04-20", 1, { tipo: "WeightTraining", allenato: "gambe" }),
    giroIl("2027-04-10", 1, { tipo: "WeightTraining", allenato: null }),
    giroIl("2027-04-12", 1, { tipo: "WeightTraining", allenato: "alto" }),
    giroIl("2027-02-01", 1, { tipo: "WeightTraining", allenato: "gambe" }),
    giroIl("2027-04-24", 4.5, { stomaco: "bene" }),
    giroIl("2027-04-17", 3.5, { stomaco: "male" }),
    giroIl("2027-03-20", 5, { stomaco: "bene" }),
  ];
  assert.equal(contaPalestra(uscite, oggi), 2);
  assert.equal(contaDurabilita(uscite, oggi), 1);
  assert.equal(contaStomaco(uscite, "2027-06-12", oggi), 1, "dalla settimana −10, cioè dal 3 aprile");
  assert.equal(testi.testoDurabilita(1), "Uscite di almeno 4 ore negli ultimi 28 giorni, 1.");
  controllaTesto(testi.testoStomaco(2), "stomaco");
});

// --- Dai dati di intervals.icu al verdetto ---

test("dalle attività di intervals.icu, con le etichette delle borse, al verdetto", () => {
  const partenza = "2027-06-12";
  const grezza = (id, d, ore, extra = {}) => ({
    id, start_date_local: `${piu(partenza, d)}T08:00:00`, type: "GravelRide", source: "WAHOO",
    moving_time: Math.round(ore * 3600), elapsed_time: Math.round(ore * 3900), distance: ore * 18000,
    total_elevation_gain: ore * 250, device_watts: false, has_heartrate: true, icu_training_load: Math.round(ore * 55),
    tags: [], ...extra,
  });
  const carica = ["comesto-borse-evento", "comesto-kg-9", "comesto-notte-fuori"];
  const grezze = [];
  const detti = {};
  for (let k = -14; k <= -1; k++) {
    grezze.push(grezza(`a${k}a`, 7 * k + 1, 2), grezza(`a${k}b`, 7 * k + 3, 2), grezza(`a${k}c`, 7 * k + 5, 4.5));
    detti[`a${k}c`] = { borse: "no" };   // la risposta «No» resta sul telefono, in comesto.uscite.v1
  }
  grezze.push(grezza("t1", -66, 4, { tags: carica }), grezza("t2", -47, 6, { tags: carica }), grezza("p1", -29, 6.5, { tags: carica }), grezza("p2", -28, 4.5, { tags: carica }));
  const oggi = piu(partenza, -1);
  const uscite = preparaAttivita(grezze, [], { detti, oggi });
  const stima = { H: 7.5, T: 30, livello: 1, giorni: 4 };
  const r = valutaProntezza({ percorso: trovaPercorso("tge-is-classic"), giorni: 4, partenza, oggi, uscite, stima, esperienza: true });
  assert.deepEqual(r.pilastri.borse.righe.map((x) => [x.prova, x.stato]), [["T1", "fatta"], ["T2", "fatta"], ["T3", "fatta"]]);
  assert.deepEqual(difetti(r), [0, 0, 0, 0]);
  assert.equal(r.fiducia.livello, "alta");
  controllaTutti(r, "dalle attività di intervals.icu");
});

// --- I testi (2.9), come nella specifica ---

test("i testi di 2.9 e 2.7, come nella specifica", () => {
  assert.equal(testi.testoVolume({ valore: 7.5, vMin: 7, difetto: 0 }), "Ore in bici, in media 7 ore e mezza a settimana. Bene.");
  assert.equal(testi.testoVolume({ valore: 4, vMin: 7, difetto: 2 }), "Ore in bici, in media 4 ore a settimana. Ne servono almeno 7.");
  assert.equal(testi.testoLunga({ valore: 5.5, giorno: "2026-04-18", lt: 5.5, raggiunta: true }), "Uscita più lunga, 5 ore e mezza, sabato 18 aprile.");
  assert.equal(testi.testoLunga({ valore: 3, giorno: "2026-03-28", lt: 5.5, raggiunta: false, dataPiano: "2026-04-25" }), "Uscita più lunga, 3 ore. L'obiettivo è 5 ore e mezza, il piano ci arriva sabato 25 aprile.");
  const fatta = (prova) => ({ prova, stato: "fatta", tardi: false, da: "2027-04-10" });
  assert.equal(testi.testoBorse({ difetto: 0, righe: ["T1", "T2", "T3"].map(fatta) }), "Prove con le borse, fatte tutte e tre.");
  assert.equal(testi.testoBorse({ difetto: 0, righe: ["T1", "T3"].map(fatta) }), "Prove con le borse, fatte tutte e due.");
  assert.equal(testi.testoProva("T3", { stato: "inProgramma", da: "2027-04-24" }), "Prova generale con le borse, in programma sabato 24 aprile. È la prova che conta di più per bici, borse e sedere.");
  assert.equal(testi.testoDaSistemare({ aree: ["mani"], ultima: true }), "Nell'ultima prova hai segnato le mani. Cambia presa più spesso, controlla guanti e manubrio, poi rifai tre ore con la bici carica.");
  assert.equal(testi.testoContinuita({ valore: 33, difetto: 2 }), "Ti sei fermato 33 giorni di fila. Si riparte piano, il piano lo sa.");
  assert.equal(testi.testoContinuita({ valore: 12, difetto: 0 }), null);
  assert.equal(testi.testoPalestra(14), "Palestra, 14 sedute nelle ultime 8 settimane.");
  assert.equal(testi.testoPalestra(0), "La palestra aiuta a stare meglio nelle ultime ore della giornata. Se ti va, comincia con la scheda Si comincia.");
  const quasi = testi.testiVerdetto("quasiPronto");
  assert.deepEqual([quasi.titolo, quasi.perche, quasi.cosa], ["Quasi pronto", "Manca una cosa sola, la trovi qui sotto.", "Si può sistemare, oppure si parte sapendolo."]);
  const pronto = testi.testiVerdetto("pronto");
  assert.deepEqual([pronto.titolo, pronto.perche, pronto.cosa], ["Pronto", "Ore, uscita lunga, prove con le borse e continuità ci sono.", "Nelle ultime settimane non aggiungere niente di nuovo."]);
  assert.equal(testi.testiVerdetto("pronto", { senzaProve: true }).perche, "Ore, uscita lunga e continuità ci sono.");
  assert.equal(testi.cosaAllaVigilia(5), "Se parti lo stesso, fallo in 5 giorni, tieni corto il primo e scegli posti per dormire che puoi cambiare.");
  assert.equal(testi.fraseGiorniConsigliati({ giorni: 3, H: 10.1, nuovi: 5, nuovaH: 6.06, motivo: "lunga", lRif: 4 }), "In 3 giorni ogni giornata dura circa 10 ore. Con la tua uscita più lunga delle ultime sei settimane, 4 ore, ti consiglio 5 giorni, con circa 6 ore al giorno.");
  assert.equal(testi.fraseGiorniConsigliati({ giorni: 4, H: 8.5, nuovi: 6, nuovaH: 5.7, motivo: "tempo", vMin: 7.6, oreDisponibili: 6 }), "In 4 giorni servono almeno 8 ore di bici a settimana, e ne hai 6. Ti consiglio 6 giorni, con circa 5 ore e mezza al giorno.");
  assert.equal(testi.fraseGiorniConsigliati({ giorni: 3, H: 11.4, nuovi: 4, nuovaH: 8.5, motivo: "tetto" }), "In 3 giorni ogni giornata dura circa 11 ore e mezza. Sono troppe ore per dormire e mangiare bene. Ti consiglio 4 giorni, con circa 8 ore e mezza al giorno.");
  assert.equal(testi.testoSottoPiano(12, 18), "Nelle ultime tre settimane hai fatto 12 ore contro le 18 del piano. Se succede ancora, rifaccio il piano con i tuoi tempi.");
  assert.equal(testi.rigaFiducia({ tipo: "ore", quanti: 6, sorgente: "STRAVA" }), "Mi mancano le ore di 6 giri arrivati da Strava. Toccali per dirmele.");
  assert.equal(testi.fraseProiezione("pronto"), "Se segui il piano, ci arrivi pronto.");
  assert.equal(testi.fraseProiezione("quasiPronto", { manca: testi.testoManca("borse", { righe: [{ prova: "T1", stato: "fatta" }, { prova: "T3", stato: "manca" }] }) }), "Se segui il piano, ci arrivi quasi pronto. Manca la prova generale con le borse.");
  assert.equal(testi.fraseProiezione("pocoPronto", { proposta: { tipo: "giorni", giorni: 5 } }), "Se continui così, arrivi poco pronto. Ti propongo 5 giorni.");
  assert.equal(testi.tastoGiorni(5), "Fallo in 5 giorni");
  assert.equal(testi.TASTI.conferma, "Sì, cambia");
  assert.equal(testi.GUIDA_PRONTO, "Pronto vuol dire che hai fatto quello che serve per goderti il viaggio. Non è una promessa, e non è una pagella.");
  assert.equal(testi.AVVISI_FITNESS.intensita, "La Fitness è alta, ma le ore lunghe mancano. Succede quando ci si allena forte e corto.");
});

// Tutte le stringhe esportate, anche dentro oggetti e liste, come chiede 9.8.
function stringhe(valore, dove, lista = []) {
  if (typeof valore === "string") lista.push([dove, valore]);
  else if (valore && typeof valore === "object") for (const [k, v] of Object.entries(valore)) stringhe(v, `${dove}.${k}`, lista);
  return lista;
}

test("nessun testo di «Pronto?» ha i due punti, le parole vietate, le sigle o i decimali nelle durate", () => {
  const fissi = stringhe(testi, "testi");
  assert.ok(fissi.length > 30);
  for (const [dove, t] of fissi) controllaTesto(t, dove);
  // I testi composti, per ogni prova e ogni stato, e per i numeri di molte giornate.
  for (const prova of ["T1", "T2", "T3", "blocco", "unGiorno"]) {
    for (const esito of [{ stato: "fatta", da: "2027-04-03" }, { stato: "fatta", tardi: true, da: "2027-05-01" }, { stato: "inProgramma", da: "2027-04-24" }, { stato: "manca" }]) {
      controllaTesto(testi.testoProva(prova, esito), `${prova} ${esito.stato}`);
      controllaTesto(testi.testoProva(prova, esito, { proiezione: true }), `${prova} ${esito.stato} nella proiezione`);
    }
  }
  for (const ore of [0, 0.4, 1.25, 2.04, 3.33, 5.55, 7.07, 9.99, 12.4, 25.6]) {
    for (const difetto of [0, 1, 2]) controllaTesto(testi.testoVolume({ valore: ore, vMin: 7.13, difetto }), `volume ${ore}`);
    controllaTesto(testi.testoLunga({ valore: ore, giorno: "2027-04-03", lt: 5.53, raggiunta: ore > 5, dataPiano: "2027-04-17" }), `lunga ${ore}`);
    controllaTesto(testi.testoSottoPiano(ore, ore + 3.7), `sotto il piano ${ore}`);
  }
  for (const aree of [["mani"], ["sedere", "collo"], ["ginocchia", "piedi", "mani"]]) controllaTesto(testi.testoDaSistemare({ aree, ultima: false }), aree.join(" "));
  for (const motivo of [{ tipo: "ore", quanti: 1, sorgente: "GARMIN_CONNECT" }, { tipo: "ore", quanti: 3 }, { tipo: "ore", quanti: 0 }, { tipo: "borse", quanti: 4 }, { tipo: "settimane", quanti: 0 }, { tipo: "settimane", quanti: 1 }]) {
    controllaTesto(testi.rigaFiducia(motivo), motivo.tipo);
  }
  for (const motivo of ["tetto", "tempo", "lunga", "uscite"]) {
    controllaTesto(testi.fraseGiorniConsigliati({ giorni: 3, H: 10.3, nuovi: 5, nuovaH: 6.2, motivo, lRif: 3.4, vMin: 9.3, oreDisponibili: 8 }), motivo);
    controllaTesto(testi.fraseGiorniConsigliati({ giorni: 3, H: 10.3, nuovi: 5, nuovaH: 6.2, motivo, lRif: 0, lRifDalPiano: true }), `${motivo} senza lunga`);
  }
  for (const percorso of CATALOGO) {
    controllaTesto(testi.passaA(percorso), percorso.id);
    controllaTesto(testi.fraseCorto({ percorso, giorni: percorso.giorniMax, H: 6.3 }), percorso.id);
  }
  for (const esito of ["sotto", "inLinea", "sopra"]) {
    for (const inTapering of [false, true]) controllaTesto(testi.testoFitness({ minimo: 61.3, comodo: 77.8, fitness: 66.6, confronto: 74, esito, inTapering }), esito);
  }
});

test("tutti i 23 percorsi, ai giorni minimi e massimi, alla vigilia e 6 settimane prima, senza errori e con i testi puliti", () => {
  const ESITI = ["conMargine", "pronto", "quasiPronto", "pocoPronto", "nonValutabile", null];
  for (const percorso of CATALOGO) {
    const partenza = percorso.partenze[0];
    const tutte = Array.from({ length: 70 }, (_, i) => giro(partenza, -160 + 2 * i, i % 3 === 2 ? 4.5 : 1.5, i === 40 ? { borse: "evento" } : {}));
    for (const giorni of [...new Set([percorso.giorniMin, percorso.giorniMax])]) {
      for (const oggi of [piu(partenza, -1), piu(partenza, -42)]) {
        const r = valutaProntezza({ percorso, giorni, partenza, oggi, uscite: tutte.filter((u) => u.giorno <= oggi), oreDisponibili: 6, fitness: 40 });
        const dove = `${percorso.id} in ${giorni} giorni il ${oggi}`;
        assert.ok(ESITI.includes(r.esito), dove);
        assert.equal(r.fase, oggi > piu(partenza, -15) ? "verdetto" : "proiezione", dove);
        controllaTutti(r, dove);
        for (const riga of r.righe) controllaTesto(riga.testo, dove);
      }
    }
  }
});

test("i parametri della prontezza sono quelli della specifica", () => {
  assert.deepEqual(PRONTEZZA.soglie.T2, { "2-5": 0.63, daSei: 0.45 });
  assert.deepEqual(PRONTEZZA.finestre.unGiorno, { da: -10, a: -3 });
  for (const [id, corti] of Object.entries(PRONTEZZA.percorsiCorti)) {
    const percorso = trovaPercorso(id);
    assert.ok(percorso, id);
    for (const c of corti) {
      const corto = trovaPercorso(c);
      assert.ok(corto && corto.evento === percorso.evento && corto.km < percorso.km, `${id} verso ${c}`);
    }
  }
});
