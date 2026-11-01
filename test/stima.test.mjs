// Prove della stima delle ore con la bici carica (9.2 della specifica).
// Si lanciano con  node --test test/stima.test.mjs
// Le persone sono inventate, come le loro uscite e le loro date.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  v0, costanteSalita, oreFormula, oreTotali, stimaH, potenzaGiornata, potenzaDaGiri, potenzaDaMedia,
  fattoreCarico, giorniEffettivi, arrotondaMezzora, percorsoLibero, massaCiclista,
} from "../js/stima.js";
import { CATALOGO, trovaPercorso } from "../js/catalogo.js";
import { STIMA, PASSO } from "../js/parametri.js";
import { preparaAttivita } from "../js/dati.js";
import { formatoDurata } from "../js/formato.js";
import { componiModulo } from "./modelli-testi.mjs";
import {
  righeStima, fraseGiornata, fraseFonte, fraseBorse, fraseGiornoInPiu, fraseGiornataNormale,
  migliaia, oreInParole, durataInParole, scelteOreEbike, EBIKE, DA_DOVE_VENGONO, IN_CALENDARIO, PASSO_GIRI,
} from "../js/testi-stima.js";

const OGGI = "2026-11-01";
const vicino = (a, b, tolleranza, messaggio) => assert.ok(Math.abs(a - b) <= tolleranza, `${messaggio ?? ""} ${a} contro ${b}`);

function giornoFa(n) {
  const d = new Date(Date.UTC(2026, 10, 1) - n * 86400000);
  return d.toISOString().slice(0, 10);
}

// Un giro di casa costruito alla potenza p, con il fondo e la bici del suo tipo (1.6).
function giro(id, fa, tipo, km, metri, p, ciclista = 75, campi = {}) {
  const fondo = PASSO.tipi[tipo];
  const ore = oreFormula({ km, metri, potenza: p, massa: ciclista + fondo.biciKg + PASSO.acquaCiboKg, classe: fondo.classe });
  return { id, giorno: giornoFa(fa), tipo, secondi: Math.round(ore * 3600), metri: km * 1000, dislivello: metri, borse: "no", qualita: "vera", ...campi };
}

// Dieci giri di Marco, tutti fatti a 140 W, fra strada, gravel e mountain bike.
const PROFILI_GIRO = [
  ["Ride", 70, 700], ["Ride", 85, 900], ["GravelRide", 55, 800], ["Ride", 62, 400], ["GravelRide", 48, 600],
  ["MountainBikeRide", 35, 900], ["Ride", 90, 1100], ["GravelRide", 60, 900], ["Ride", 75, 650], ["MountainBikeRide", 32, 700],
];
const giriDi = (p, ciclista = 75) => PROFILI_GIRO.map(([tipo, km, metri], i) => giro(`m${i}`, 3 + i * 5, tipo, km, metri, p, ciclista));

// Tre uscite brevi con la potenza del dispositivo, per la fonte FTP.
const conPotenza = [5, 12, 20].map((fa, i) => ({ id: `w${i}`, giorno: giornoFa(fa), tipo: "VirtualRide", secondi: 3600, metri: 30000, dislivello: 0, potenza: true, rulli: true }));

test("V0 della tabella del capitolo 7 e dei tre casi di 9.2", () => {
  vicino(v0(100, 87), 23.1, 0.1, "100 W");
  vicino(v0(122, 97, 10), 24.4, 0.1, "122 W con 10 kg");
  vicino(v0(140, 87), 26.6, 0.1, "140 W");
  const tabella = {
    80: [20.9, 20.5, 20.2, 19.9], 100: [23.1, 22.7, 22.4, 22.0], 120: [24.9, 24.5, 24.2, 23.9], 140: [26.6, 26.2, 25.9, 25.5],
    160: [28.1, 27.7, 27.3, 27.0], 180: [29.4, 29.0, 28.7, 28.3], 200: [30.7, 30.3, 29.9, 29.6],
  };
  for (const [watt, valori] of Object.entries(tabella)) {
    [0, 6, 10, 15].forEach((kg, i) => vicino(v0(Number(watt), 87 + kg, kg), valori[i], 0.15, `${watt} W e ${kg} kg`));
  }
});

test("l'esempio del capitolo 7, 120 km e 2.000 m a 122 W con 10 kg, dà 8,48 ore", () => {
  vicino(oreFormula({ km: 120, metri: 2000, potenza: 122, massa: 97, borseKg: 10, classe: "misto" }), 8.48, 0.02);
});

test("la costante di salita del misto a 122, 92 e 200 W, con il limite a 0,9", () => {
  vicino(costanteSalita("misto", 122), 11.7, 0.05);
  vicino(costanteSalita("misto", 92), 12.4, 0.05);
  vicino(costanteSalita("misto", 200), 10.5, 0.05);
  assert.equal(costanteSalita("misto", 300), costanteSalita("misto", 200));
});

test("Tuscany Trail Originale in 4 giorni con FTP 188 W, circa +7% ogni 10 kg di borse", () => {
  const percorso = trovaPercorso("tt-originale");
  const attese = { 0: 7.49, 6: 7.81, 8: 7.91, 10: 8.02, 15: 8.29 };
  for (const [kg, atteso] of Object.entries(attese)) {
    const s = stimaH({ percorso, giorni: 4, profilo: { pesoKg: 75, bici: "gravel", borseKg: Number(kg) }, atleta: { ftp: 188 }, uscite: conPotenza, oggi: OGGI });
    assert.equal(s.fonte.tipo, "ftp");
    vicino(s.potenza, 117.5, 1e-9);
    vicino(s.H, atteso, 0.05, `${kg} kg`);
  }
});

test("la tabella di 1.10, con i valori esatti e quelli alla mezz'ora", () => {
  const senzaDati = (id, giorni) => stimaH({ percorso: trovaPercorso(id), giorni, profilo: {}, uscite: [], oggi: OGGI });
  const media2124 = (id, giorni) => stimaH({ percorso: trovaPercorso(id), giorni, profilo: { mediaDichiarata: 22.5 }, uscite: [], oggi: OGGI });
  [11.36, 8.52, 6.82, 5.68].forEach((h, i) => vicino(senzaDati("tt-originale", 3 + i).H, h, 0.05, `Tuscany Trail in ${3 + i} giorni`));
  [10.16, 7.62, 6.10].forEach((h, i) => vicino(senzaDati("tg-medio", 3 + i).H, h, 0.05, `Trentino Gravel Medio in ${3 + i} giorni`));
  vicino(senzaDati("nc4k-berlino", 17).T, 158.0, 0.05, "NorthCape4000 da Berlino");
  [9.65, 7.24, 5.79, 4.83].forEach((h, i) => vicino(media2124("tt-originale", 3 + i).H, h, 0.05, `a 134 W in ${3 + i} giorni`));

  // Percorso, giorni, H e giornata normale alla mezz'ora per «Non lo so» e per «21-24».
  const tabella = [
    ["tt-originale", 3, 11.5, null, 9.5, null], ["tt-originale", 4, 8.5, null, 7, null], ["tt-originale", 5, 7, null, 6, null],
    ["tt-newbie", 2, 5.5, null, 4.5, null], ["tg-corto", 2, 8, null, 7, null], ["tg-medio", 3, 10, null, 8.5, null],
    ["tg-medio", 4, 7.5, null, 6.5, null], ["tge-is-classic", 4, 9, null, 7.5, null], ["tge-ga-classic", 4, 7.5, null, 6.5, null],
    ["tge-tu-classic", 5, 7.5, null, 6.5, null], ["ur-pa-lungo", 1, 6, null, 5, null], ["ur-vds-lungo", 1, 7.5, null, 6, null],
    ["nc4k-rovereto", 22, 10.5, 11, 9, 9.5], ["nc4k-berlino", 17, 9.5, 10, 8, 8.5], ["ffp-completo", 20, 9, 9.5, 8, 8.5],
  ];
  for (const [id, giorni, h1, hn1, h2, hn2] of tabella) {
    const a = senzaDati(id, giorni).mezzore;
    const b = media2124(id, giorni).mezzore;
    assert.deepEqual([a.H, a.Hn, b.H, b.Hn], [h1, hn1, h2, hn2], `${id} in ${giorni} giorni`);
  }
  // La forbice del livello 0 della tabella, 8 ore e mezza (7-10) e 7 ore (6-8 e mezza).
  const a = senzaDati("tt-originale", 4).mezzore;
  const b = media2124("tt-originale", 4).mezzore;
  assert.deepEqual([a.basso, a.alto, b.basso, b.alto], [7, 10, 6, 8.5]);
});

test("giorni effettivi e arrotondamento alla mezz'ora", () => {
  assert.equal(giorniEffettivi(10), 10);
  vicino(giorniEffettivi(12), 11.2, 1e-9);
  vicino(giorniEffettivi(19), 17.8, 1e-9);
  assert.deepEqual([7.24, 7.25, 8.74, 8.75].map(arrotondaMezzora), [7, 7.5, 8.5, 9]);
});

test("la potenza della giornata, nell'ordine delle fonti", () => {
  const lucia = potenzaGiornata({ profilo: {}, atleta: { ftp: 200 }, uscite: conPotenza, oggi: OGGI });
  assert.deepEqual([lucia.p, lucia.fonte], [125, "ftp"]);
  const sportSettings = [{ types: ["Ride", "VirtualRide"], ftp: 200 }];
  assert.equal(potenzaGiornata({ atleta: { sportSettings }, uscite: conPotenza, oggi: OGGI }).fonte, "ftp");
  const dueSole = potenzaGiornata({ atleta: { ftp: 200 }, uscite: conPotenza.slice(0, 2), oggi: OGGI });
  assert.equal(dueSole.fonte, "nessuna", "con 2 uscite con la potenza la FTP non basta");

  const quattro = giriDi(140).slice(0, 4);
  const marco = potenzaGiornata({ profilo: {}, uscite: quattro, oggi: OGGI });
  assert.equal(marco.fonte, "giri");
  vicino(marco.p, 0.9 * potenzaDaGiri(quattro, {}, OGGI).p, 1e-9);
  vicino(marco.p, 126, 1);

  const luca = potenzaGiornata({ profilo: { mediaDichiarata: 22.5 }, uscite: [], oggi: OGGI });
  assert.equal(luca.fonte, "media");
  vicino(luca.p, 134, 2);
  const veloce = potenzaGiornata({ profilo: { mediaDichiarata: 28.5 }, uscite: [], oggi: OGGI });
  vicino(veloce.p, 164, 0.1, "il tetto di 0,625 × 3,5 W/kg");
  assert.equal(veloce.limitata, true);
  const nessuno = potenzaGiornata({ profilo: {}, uscite: [], oggi: OGGI });
  assert.equal(nessuno.fonte, "nessuna");
  vicino(nessuno.p, 105.5, 0.05);
  // Le cinque medie per 75 kg danno 75, 105, 134, 170 e 214 W prima del tetto.
  [75, 105, 134, 170, 214].forEach((w, i) => vicino(0.9 * potenzaDaMedia(STIMA.mediaDichiarata.centri[i], {}), w, 1));
  // «Non lo so» e «18-21» danno quasi la stessa stima.
  vicino(0.9 * potenzaDaMedia(19.5, {}), nessuno.p, 1.5);
});

test("il passo dai giri trova i 140 W con cui sono stati costruiti", () => {
  const giri = giriDi(140);
  const passo = potenzaDaGiri(giri, {}, OGGI);
  vicino(passo.p, 140, 1);
  assert.equal(passo.tenuti.length, 10);
  assert.deepEqual(passo.tolti, []);
  assert.equal(potenzaDaGiri(giri.slice(0, 2), {}, OGGI), null, "con 2 giri nessun risultato");
  // Anna pesa 65 kg, e il passo lo tiene in conto.
  vicino(potenzaDaGiri(giriDi(120, 65), { pesoFascia: 1 }, OGGI).p, 120, 1);
});

test("un giro con il 50% di tempo in più esce alla seconda passata", () => {
  const strano = giro("strano", 9, "Ride", 30, 200, 140);
  strano.secondi = Math.round(strano.secondi * 1.5);
  const passo = potenzaDaGiri([...giriDi(140), strano], {}, OGGI);
  assert.deepEqual(passo.tolti.map((g) => g.id), ["strano"]);
  assert.equal(passo.tenuti.length, 10);
  vicino(passo.p, 140, 1);
  // Rimesso dalla persona, resta dentro.
  const rimesso = potenzaDaGiri([...giriDi(140), { ...strano, rimessaNelPasso: true }], {}, OGGI);
  assert.deepEqual(rimesso.tolti, []);
  assert.ok(rimesso.p < 140);
});

test("borse, rulli, e-bike, durate dette e gli altri giri che non entrano nel passo", () => {
  const base = giriDi(140);
  const fuori = [
    giro("borse", 4, "GravelRide", 60, 800, 110, 75, { borse: "evento" }),
    giro("parte", 6, "GravelRide", 60, 800, 110, 75, { borse: "parte" }),
    { ...giro("virtuale", 7, "Ride", 40, 300, 100), tipo: "VirtualRide" },
    giro("rulli", 7, "Ride", 40, 300, 100, 75, { rulli: true }),
    { ...giro("ebike", 8, "Ride", 60, 900, 220), tipo: "EBikeRide" },
    giro("detta", 10, "Ride", 60, 600, 90, 75, { qualita: "detta da te" }),
    giro("dettaCampo", 10, "Ride", 60, 600, 90, 75, { qualita: { secondi: "detta da te" } }),
    giro("stub", 10, "Ride", 60, 600, 90, 75, { stub: true, qualita: { secondi: "stimata" } }),
    giro("mano", 11, "Ride", 60, 600, 90, 75, { externalId: "comesto-u-abc123" }),
    giro("daApp", 11, "Ride", 60, 600, 90, 75, { daComeSto: true }),
    giro("lavoro", 12, "Ride", 40, 300, 90, 75, { commute: true }),
    giro("esclusa", 13, "Ride", 60, 600, 90, 75, { fuoriDalPasso: true }),
    giro("viaggio", 14, "Ride", 60, 600, 90, 75, { modoEvento: true }),
    giro("senzaRisposta", 15, "Ride", 110, 1200, 90, 75, { borse: null }),
    giro("piatto", 16, "Ride", 45, 0, 90),
    giro("corto", 17, "Ride", 15, 100, 90),
    giro("vecchio", 200, "Ride", 60, 600, 90),
  ];
  const conFuori = potenzaDaGiri([...base, ...fuori], {}, OGGI);
  const senza = potenzaDaGiri(base, {}, OGGI);
  assert.equal(conFuori.p, senza.p);
  assert.equal(conFuori.tenuti.length, 10);
  assert.equal(potenzaDaGiri(fuori, {}, OGGI), null);
});

test("se negli ultimi 84 giorni i giri non bastano, si guarda fino a 182", () => {
  const lontani = giriDi(140).map((g, i) => ({ ...g, giorno: giornoFa(100 + i) }));
  const passo = potenzaDaGiri(lontani, {}, OGGI);
  assert.equal(passo.giorni, 182);
  vicino(passo.p, 140, 1);
});

// Un'uscita carica di Paolo, con le ore previste senza borse alla potenza p tenute a oreAttese.
function carica(id, fa, p, orePreviste, oreVere, borse = "evento") {
  const fondo = PASSO.tipi.GravelRide;
  const prima = oreFormula({ km: 80, metri: 1200, potenza: p, massa: 75 + fondo.biciKg + PASSO.acquaCiboKg, classe: fondo.classe });
  const scala = orePreviste / prima;   // la formula è lineare in km e metri
  return { id, giorno: giornoFa(fa), tipo: "GravelRide", secondi: oreVere * 3600, metri: 80000 * scala, dislivello: 1200 * scala, borse, borseKg: 9 };
}

test("il fattore carico personale, livello 2 e livello 3", () => {
  const p = 115;
  const una = fattoreCarico([carica("c1", 20, p, 3.7, 4)], {}, p, { giorni: 4, oggi: OGGI });
  vicino(una.fattore, 1.081, 0.001);
  assert.equal(una.livello, 2);
  assert.equal(fattoreCarico([carica("c2", 20, p, 3.5, 5.6)], {}, p, { oggi: OGGI }).fattore, 1.4);
  assert.equal(fattoreCarico([carica("c3", 20, p, 4, 3.6)], {}, p, { oggi: OGGI }).fattore, 1);
  assert.equal(fattoreCarico([carica("c4", 20, p, 2.5, 2.8)], {}, p, { oggi: OGGI }), null, "sotto le 3 ore non conta");
  assert.equal(fattoreCarico([carica("c5", 400, p, 3.7, 4)], {}, p, { oggi: OGGI }), null, "oltre 365 giorni non conta");

  // Un viaggio carico di 3 giorni, più un'uscita «in parte» più vecchia.
  const viaggio = [carica("v1", 32, p, 6, 6.6), carica("v2", 31, p, 5, 5.4), carica("v3", 30, p, 4, 4.6), carica("vecchia", 60, p, 4, 5.2, "parte")];
  const tre = fattoreCarico(viaggio, {}, p, { giorni: 4, oggi: OGGI });
  assert.equal(tre.livello, 3);
  vicino(tre.fattore, (6.6 + 5.4 + 4.6) / 15, 1e-9, "la somma dei 3 giorni");
  assert.deepEqual([tre.data, tre.giorni], [giornoFa(32), 3]);
  // Per un evento di un giorno vale la mediana delle uscite cariche.
  const unGiorno = fattoreCarico(viaggio, {}, p, { giorni: 1, oggi: OGGI });
  assert.equal(unGiorno.livello, 2);
  vicino(unGiorno.fattore, (6.6 / 6 + 4.6 / 4) / 2, 1e-9);
});

test("con il fattore carico le ore sono quelle scariche per il fattore, senza il passo delle borse", () => {
  const percorso = trovaPercorso("tg-medio");
  const senza = oreTotali({ percorso, profilo: { borseKg: 0 }, potenza: 120 });
  vicino(oreTotali({ percorso, profilo: { borseKg: 12 }, potenza: 120, fattoreCarico: 1.2 }), senza * 1.2, 1e-9);
  vicino(oreTotali({ percorso, profilo: {}, potenza: 120, fattoreCarico: { fattore: 1.1, livello: 2 } }), senza * 1.1, 1e-9);
});

test("con le borse laterali si aggiunge il 5% del tempo in piano senza borse", () => {
  const percorso = trovaPercorso("tt-originale");
  const p = 117.5;
  const da = oreTotali({ percorso, profilo: { borseKg: 10 }, potenza: p });
  const laterali = oreTotali({ percorso, profilo: { borseKg: 10, borseTipo: "laterali" }, potenza: p });
  const piano = (percorso.km * STIMA.classi.misto.fs) / v0(p, 75 + 11 + 2);
  vicino(laterali - da, 0.05 * piano, 1e-9);
  // Senza borse il tipo non conta.
  assert.equal(oreTotali({ percorso, profilo: { borseKg: 0, borseTipo: "laterali" }, potenza: p }), oreTotali({ percorso, profilo: { borseKg: 0 }, potenza: p }));
});

test("il fattore del dislivello moltiplica il dislivello, mai i km", () => {
  const percorso = trovaPercorso("tt-originale");
  const piatto = { ...percorso, dislivello: 5900 * 1.1, modello: { ...percorso.modello, fattoreDislivello: 1 } };
  vicino(oreTotali({ percorso, potenza: 110 }), oreTotali({ percorso: piatto, potenza: 110 }), 1e-9);
  const piuKm = { ...piatto, km: 460 * 1.1 };
  assert.ok(oreTotali({ percorso: piuKm, potenza: 110 }) > oreTotali({ percorso, potenza: 110 }) + 1);
  const s = stimaH({ percorso, giorni: 4, oggi: OGGI });
  assert.deepEqual([s.kmGiorno, s.metriGiorno], [115, 1500], "a schermo km e metri ufficiali");
});

test("tt-originale-detour usa 7.180 m e non li restituisce fra i numeri da mostrare", () => {
  const percorso = trovaPercorso("tt-originale-detour");
  assert.equal(percorso.dislivello, null);
  const ufficiale = { ...percorso, dislivello: 7180, modello: { ...percorso.modello, dislivelloLavoro: null } };
  vicino(oreTotali({ percorso, potenza: 105 }), oreTotali({ percorso: ufficiale, potenza: 105 }), 1e-9);
  const s = stimaH({ percorso, giorni: 5, oggi: OGGI });
  assert.equal(s.metriGiorno, null);
  assert.ok(s.avvisi.some((a) => a.tipo === "dislivelloNonPubblicato"));
  const daMostrare = JSON.stringify({ km: s.kmGiorno, metri: s.metriGiorno, ore: s.mezzore, righe: righeStima(s) });
  for (const n of [7180, 7898, 1436, 1450, 1580, 1600]) {
    assert.ok(!daMostrare.includes(String(n)) && !daMostrare.includes(migliaia(n)), `${n} non si mostra`);
  }
  assert.ok(righeStima(s)[0].includes("dislivello non ancora pubblicato"));
  assert.ok(!righeStima(s).join(" ").includes("m di salita"));
});

test("la forbice dipende da quanto l'app conosce la persona", () => {
  const percorso = trovaPercorso("tge-is-classic");
  const casi = [
    [stimaH({ percorso, giorni: 4, oggi: OGGI }), 0, 0.15],
    [stimaH({ percorso, giorni: 4, atleta: { ftp: 210 }, uscite: conPotenza, oggi: OGGI }), 1, 0.10],
    [stimaH({ percorso, giorni: 4, uscite: [carica("u1", 25, 105, 3.6, 4.1)], oggi: OGGI }), 2, 0.08],
    [stimaH({ percorso, giorni: 4, uscite: [carica("t1", 30, 105, 6, 6.5), carica("t2", 29, 105, 5, 5.5), carica("t3", 28, 105, 4, 4.5)], oggi: OGGI }), 3, 0.06],
  ];
  for (const [s, livello, f] of casi) {
    assert.equal(s.livello, livello);
    vicino(s.basso, s.H * (1 - f), 1e-9);
    vicino(s.alto, s.H * (1 + f), 1e-9);
  }
  assert.equal(casi[2][0].fonte.tipo, "uscitaCarica");
  assert.equal(casi[3][0].fonte.tipo, "viaggioCarico");
  assert.equal(casi[1][0].fonte.tipo, "ftp");
});

test("dopo il primo test di viaggio valgono le borse dette nel test, se il profilo non le ha", () => {
  const percorso = trovaPercorso("tt-originale");
  const test1 = { ...carica("t", 40, 105, 3.6, 4.2), borseKg: 12 };
  const conTest = stimaH({ percorso, giorni: 4, prove: [test1], profilo: {}, oggi: OGGI });
  assert.equal(conTest.avvisi.find((a) => a.tipo === "borse").kg, 12);
  const scritte = stimaH({ percorso, giorni: 4, prove: [test1], profilo: { borseKg: 5 }, oggi: OGGI });
  assert.equal(scritte.avvisi.find((a) => a.tipo === "borse").kg, 5);
});

test("i chili detti nel test arrivano anche dalle attività di js/dati.js, nel campo kg", () => {
  // Il test di viaggio di Paolo, letto da intervals.icu con le etichette di Come sto.
  const grezza = {
    id: "p1", start_date_local: `${giornoFa(40)}T08:00:00`, type: "GravelRide", source: "WAHOO",
    moving_time: 6.5 * 3600, elapsed_time: 7 * 3600, distance: 70000, total_elevation_gain: 1000,
    tags: ["comesto-borse-evento", "comesto-kg-12"],
  };
  const [test1] = preparaAttivita([grezza], [], { oggi: OGGI });
  assert.deepEqual([test1.borse, test1.kg], ["evento", 12]);
  const s = stimaH({ percorso: trovaPercorso("tt-originale"), giorni: 4, uscite: [test1], profilo: {}, oggi: OGGI });
  assert.ok(s.fattore > 1, "il test è più lento del modello senza borse");
  assert.equal(s.avvisi.find((a) => a.tipo === "borse").kg, 12, "i chili del test, non gli 8 del catalogo");
});

test("con la e-bike nessuna H, e la domanda delle ore", () => {
  const percorso = trovaPercorso("tt-originale");
  const s = stimaH({ percorso, giorni: 4, profilo: { ebike: true }, oggi: OGGI });
  assert.equal(s.H, null);
  assert.equal(s.T, null);
  assert.deepEqual(s.avvisi.find((a) => a.tipo === "ebike").scelte, [4, 5, 6, 7, 8, 9]);
  assert.deepEqual(righeStima(s), [EBIKE.domanda]);
  assert.deepEqual(scelteOreEbike(), ["4 ore", "5 ore", "6 ore", "7 ore", "8 ore", "9 ore"]);
  const risposta = stimaH({ percorso, giorni: 4, profilo: { ebike: true, oreEbike: 6 }, oggi: OGGI });
  assert.deepEqual([risposta.H, risposta.T, risposta.kj], [6, 24, null]);
  assert.ok(righeStima(risposta).includes(EBIKE.autonomia));
  // L'ultimo giro lungo in e-bike vale la stessa scelta.
  const giri = [giro("g1", 20, "Ride", 60, 600, 120), { ...giro("g2", 2, "Ride", 70, 900, 200), tipo: "EBikeRide" }];
  assert.equal(stimaH({ percorso, giorni: 4, uscite: giri, oggi: OGGI }).H, null);
  // Dove l'e-bike è vietata la scelta non compare e la stima resta.
  assert.ok(stimaH({ percorso: trovaPercorso("nc4k-berlino"), giorni: 17, profilo: { ebike: true }, oggi: OGGI }).H > 0);
});

test("tutti i 23 percorsi ai giorni tipici, profilo senza dati, H fra 3 e 16 ore e nessun valore mancante", () => {
  assert.equal(CATALOGO.length, 23);
  for (const percorso of CATALOGO) {
    for (const giorni of percorso.giorniTipici) {
      const s = stimaH({ percorso, giorni, profilo: {}, uscite: [], oggi: OGGI });
      const nome = `${percorso.id} in ${giorni} giorni`;
      assert.ok(s.H >= 3 && s.H <= 16, `${nome} H ${s.H}`);
      for (const campo of ["T", "H", "basso", "alto", "giornataMin", "giornataMax", "kmGiorno", "kj", "punti", "potenza", "oreSenzaBorse"]) {
        assert.ok(Number.isFinite(s[campo]), `${nome} ${campo}`);
      }
      for (const [campo, valore] of Object.entries(s.mezzore)) {
        if (campo !== "Hn") assert.ok(Number.isFinite(valore) && valore % 0.5 === 0, `${nome} ${campo}`);
      }
      assert.equal(Number.isFinite(s.Hn), giorni >= 11, `${nome} Hn`);
      assert.equal(s.metriGiorno === null, percorso.dislivello === null, `${nome} metri al giorno`);
      assert.equal(s.livello, 0);
      assert.ok(righeStima(s).length >= 2, nome);
    }
  }
});

test("lavoro e punti al giorno, solo per la pagina dei numeri", () => {
  const s = stimaH({ percorso: trovaPercorso("tt-originale"), giorni: 4, atleta: { ftp: 188 }, uscite: conPotenza, oggi: OGGI });
  vicino(s.kj, 3.6 * 117.5 * s.H * 0.85, 1e-6);
  vicino(s.punti, s.H * 0.6 ** 2 * 100 * 1.06, 1e-6);
  const piatto = stimaH({ percorso: trovaPercorso("tge-ga-classic"), giorni: 4, oggi: OGGI });
  vicino(piatto.kj, 3.6 * piatto.potenza * piatto.H * 0.95, 1e-6, "sotto i 10 m per km");
});

test("l'obiettivo libero", () => {
  const ore = stimaH({ percorso: percorsoLibero({ tipo: "ore", ore: 5 }), oggi: OGGI });
  assert.deepEqual([ore.H, ore.giorni, ore.basso, ore.alto, ore.kmGiorno, ore.livello], [5, 1, 5, 5, null, null]);
  const giorni = stimaH({ percorso: percorsoLibero({ tipo: "giorni", giorni: 3, ore: 6 }), oggi: OGGI });
  assert.deepEqual([giorni.H, giorni.T, giorni.giorni], [6, 18, 3]);
  const giroGravel = percorsoLibero({ tipo: "giro", km: 100, metri: 1500, fondo: "gravel" });
  const s = stimaH({ percorso: giroGravel, oggi: OGGI });
  vicino(s.T, oreFormula({ km: 100, metri: 1500, potenza: s.potenza, massa: 75 + 11 + 1.5, classe: "misto" }), 1e-9);
  assert.deepEqual([s.kmGiorno, s.metriGiorno, s.giorni], [100, 1500, 1]);
  const conBorse = stimaH({ percorso: percorsoLibero({ tipo: "giro", km: 100, metri: 1500, fondo: "gravel", conBorse: true }), oggi: OGGI });
  assert.ok(conBorse.H > s.H);
  assert.equal(conBorse.avvisi.find((a) => a.tipo === "borse").kg, 8);
  const borseDelProfilo = stimaH({ percorso: giroGravel, profilo: { borseKg: 12 }, oggi: OGGI });
  assert.equal(borseDelProfilo.H, s.H, "senza «anche con le borse» le borse del profilo non contano");
  assert.equal(percorsoLibero({ tipo: "giro", km: 50, fondo: "mountainBike", conBorse: true }).modello.borseKg, 8);
});

test("il fattore carico vale solo dove si va con le borse", () => {
  const percorso = trovaPercorso("ur-vds-lungo");
  const uscite = [carica("u1", 25, 105, 3.6, 4.5)];
  const senza = stimaH({ percorso, giorni: 1, uscite, oggi: OGGI });
  assert.deepEqual([senza.fattore, senza.livello, senza.fonte.tipo], [null, 0, "nessuna"]);
  vicino(senza.H, stimaH({ percorso, giorni: 1, oggi: OGGI }).H, 1e-9);
  const conBorse = stimaH({ percorso, giorni: 1, uscite, profilo: { borseKg: 5 }, oggi: OGGI });
  assert.equal(conBorse.livello, 2);
  vicino(conBorse.H, conBorse.oreSenzaBorse * conBorse.fattore, 1e-9);
});

test("le masse del profilo, mai il peso di intervals.icu", () => {
  assert.equal(massaCiclista({}), 75);
  assert.equal(massaCiclista({ pesoFascia: 0 }), 55);
  assert.equal(massaCiclista({ pesoFascia: 5 }), 105);
  assert.equal(massaCiclista({ pesoKg: 68 }), 68);
  const percorso = trovaPercorso("tg-corto");
  const leggera = oreTotali({ percorso, profilo: { bici: "strada" }, potenza: 120 });
  const pesante = oreTotali({ percorso, profilo: { biciKg: 14 }, potenza: 120 });
  assert.ok(pesante > oreTotali({ percorso, profilo: {}, potenza: 120 }) && oreTotali({ percorso, profilo: {}, potenza: 120 }) > leggera);
});

// --- I testi della stima ---

const VIETATE = new RegExp("\\b(ga" + "r[ae]" + "|presta" + "zion[ei]" + "|ra" + "c(e|es|ing)" + "|perfor" + "mance)\\b", "i");
const DA_EVITARE = /classifica|cronometro|avversari|vincere|sei in forma|vai forte|principiante|amatore|allenato|indietro|watt|%|\bkJ\b|\bT[123]\b/i;

function controllaTesto(testo, dove) {
  assert.ok(!testo.includes(":"), `due punti in ${dove}, ${testo}`);
  assert.ok(!VIETATE.test(testo), `parola vietata in ${dove}, ${testo}`);
  assert.ok(!DA_EVITARE.test(testo), `parola da evitare in ${dove}, ${testo}`);
  assert.ok(!/\d[.,]\d+ (ore|ora|minuti)/.test(testo), `decimali in una durata in ${dove}, ${testo}`);
}

test("la frase della giornata e le altre righe di 1.11, come nella specifica", () => {
  const s = stimaH({ percorso: trovaPercorso("tt-originale"), giorni: 4, oggi: OGGI });
  assert.equal(fraseGiornata(s), "Ogni giorno starai in sella circa 8 ore e mezza, fra 7 e 10. Con le soste sei fuori da 10 ore e mezza a 12. Sono circa 115 km e 1.500 m di salita al giorno.");
  assert.equal(fraseBorse(s), "Con 8 kg di borse la giornata dura circa mezz'ora in più. In salita i chili pesano, in discesa non restituiscono niente.");
  assert.equal(fraseFonte(s), "È una stima prudente, perché non conosco ancora il tuo passo. Con 3 giri lunghi registrati diventa tua.");
  assert.equal(fraseGiornoInPiu(s), null, "sotto le 9 ore non serve");

  const tre = stimaH({ percorso: trovaPercorso("tg-medio"), giorni: 3, oggi: OGGI });
  assert.equal(fraseGiornoInPiu(tre), "Con un giorno in più la giornata scende a circa 7 ore e mezza.");
  const corto = { ...trovaPercorso("tg-medio"), giorniMax: 3 };
  const ultimo = stimaH({ percorso: corto, giorni: 3, oggi: OGGI });
  assert.ok(ultimo.H >= 9 && fraseGiornoInPiu(ultimo) === null, "mai oltre i giorni massimi del percorso");
  const otto = stimaH({ percorso: trovaPercorso("nc4k-berlino"), giorni: 8, oggi: OGGI });
  assert.ok(otto.H >= 9 && fraseGiornoInPiu(otto) === null, "solo per 2-5 giorni");

  const lungo = stimaH({ percorso: trovaPercorso("nc4k-berlino"), giorni: 17, oggi: OGGI });
  assert.equal(fraseGiornataNormale(lungo), "Una giornata normale dura circa 10 ore, e ogni 5-7 giorni ne conviene una più corta.");
  assert.ok(fraseGiornata(lungo).startsWith("In media starai in sella circa 9 ore e mezza al giorno"));
  assert.ok(righeStima(lungo).includes(IN_CALENDARIO));
  assert.equal(fraseGiornataNormale(s), null);

  const marco = stimaH({ percorso: trovaPercorso("tt-originale"), giorni: 4, uscite: [...giriDi(140), giro("extra", 1, "Ride", 50, 500, 140)].slice(2), oggi: OGGI });
  assert.equal(fraseFonte(marco), "Lo calcolo dai tuoi ultimi 9 giri lunghi.");
  assert.equal(fraseFonte({ fonte: { tipo: "ftp" } }), "Lo calcolo dalla tua potenza.");
  assert.equal(fraseFonte({ fonte: { tipo: "media" } }), "Lo calcolo dalla media che mi hai detto. Con 3 giri lunghi registrati la stima diventa tua.");
  assert.equal(fraseFonte({ fonte: { tipo: "uscitaCarica", data: "2027-04-12", uscite: 1 } }), "Lo calcolo dalla tua uscita con le borse del 12 aprile.");
  assert.equal(fraseFonte({ fonte: { tipo: "uscitaCarica", data: "2027-05-08", uscite: 1 } }), "Lo calcolo dalla tua uscita con le borse dell'8 maggio.");
  assert.equal(fraseFonte({ fonte: { tipo: "viaggioCarico", data: "2027-06-11", giorni: 3 } }), "Lo calcolo dal tuo viaggio con le borse dell'11 giugno.");
  assert.ok(DA_DOVE_VENGONO.testo.startsWith("Le ore vengono dalla fisica della bici"));
});

test("ore, durate e numeri in parole", () => {
  assert.deepEqual([0.5, 1, 1.5, 7, 7.5].map(oreInParole), ["mezz'ora", "1 ora", "1 ora e mezza", "7 ore", "7 ore e mezza"]);
  // Le durate sono quelle di formatoDurata, e sotto l'ora sono minuti, anche la mezz'ora (7.1).
  assert.deepEqual([45, 80, 210, 250, 30, 27.6, 2].map(durataInParole), ["45 minuti", "1 ora e 20", "3 ore e mezza", "4 ore e 10", "30 minuti", "30 minuti", null]);
  for (const m of [3, 25, 30, 45, 80, 118, 125, 210, 250, 600]) assert.equal(durataInParole(m), formatoDurata(m), `${m} minuti`);
  // Solo la frase delle borse di 1.11 dice la mezz'ora a parole.
  assert.equal(fraseBorse({ avvisi: [{ tipo: "borse", kg: 8, ore: 0.5 }] }), "Con 8 kg di borse la giornata dura circa mezz'ora in più. In salita i chili pesano, in discesa non restituiscono niente.");
  assert.equal(fraseBorse({ avvisi: [{ tipo: "borse", kg: 12, ore: 0.75 }] }), "Con 12 kg di borse la giornata dura circa 45 minuti in più. In salita i chili pesano, in discesa non restituiscono niente.");
  assert.deepEqual([115, 1500, 6740, 36000].map(migliaia), ["115", "1.500", "6.740", "36.000"]);
});

test("senza i giorni la stima usa i giorni tipici del percorso, mai tutto il percorso in un giorno", () => {
  const percorso = trovaPercorso("tt-originale");
  const s = stimaH({ percorso, oggi: OGGI });
  assert.equal(s.giorni, percorso.giorniTipici[0]);
  vicino(s.H, stimaH({ percorso, giorni: percorso.giorniTipici[0], oggi: OGGI }).H, 1e-9);
  assert.ok(s.H < 12, `H ${s.H}`);
  assert.equal(stimaH({ percorso: { ...percorso, giorniTipici: [] }, oggi: OGGI }).giorni, percorso.giorniMin);
  assert.equal(stimaH({ percorso: percorsoLibero({ tipo: "giorni", giorni: 3, ore: 6 }), oggi: OGGI }).giorni, 3);
});

test("ogni modello di js/testi-stima.js si compone con i valori di prova di 9.8 e i suoi esempi", async () => {
  const modulo = await import("../js/testi-stima.js");
  const { muti, testi } = componiModulo(modulo);
  assert.deepEqual(muti, [], "modelli che non danno nessun testo");
  for (const t of testi) {
    assert.ok(!t.includes(":"), t);
    assert.ok(!VIETATE.test(t), t);
    assert.ok(!/\b(T[123]|RIR)\b/.test(t), t);
    assert.ok(!/\b\d+[.,]\d+\s*(ore|ora|minuti|min|h)\b/i.test(t), t);
  }
});

test("nessun testo della stima ha i due punti, le parole vietate o i decimali nelle durate", () => {
  const profili = [{}, { mediaDichiarata: 16 }, { mediaDichiarata: 28.5 }, { pesoFascia: 5, borseKg: 16, borseTipo: "laterali" }, { borseKg: 5 }];
  let righe = 0;
  for (const percorso of CATALOGO) {
    const giorni = [...new Set([percorso.giorniMin, ...percorso.giorniTipici, percorso.giorniMax])];
    for (const g of giorni) {
      for (const profilo of profili) {
        for (const r of righeStima(stimaH({ percorso, giorni: g, profilo, oggi: OGGI }))) {
          controllaTesto(r, `${percorso.id} in ${g} giorni`);
          righe++;
        }
      }
    }
  }
  assert.ok(righe > 500);
  const fissi = [DA_DOVE_VENGONO.titolo, DA_DOVE_VENGONO.testo, IN_CALENDARIO, ...Object.values(EBIKE), ...Object.values(PASSO_GIRI), ...scelteOreEbike()];
  for (const t of fissi) controllaTesto(t, "testi fissi");
  for (const tipo of ["giri", "ftp", "media", "nessuna", "ebike"]) controllaTesto(fraseFonte({ H: 6, fonte: { tipo, giri: 5 } }), tipo);
});
