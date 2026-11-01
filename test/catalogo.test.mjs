// Prove del catalogo dei percorsi (9.9 della specifica).
// Si lanciano con  node --test test/catalogo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { CATALOGO, trovaPercorso } from "../js/catalogo.js";
import { STIMA } from "../js/parametri.js";
import { stimaH, costanteSalita } from "../js/stima.js";
import { righeStima, migliaia } from "../js/testi-stima.js";

const OGGI = "2026-11-01";
const FILE = fileURLToPath(new URL("../js/catalogo.js", import.meta.url));
// Il catalogo con note e fonti sta fuori dal repository. Se non c'è, la prova che lo confronta si salta.
const PRIVATO = fileURLToPath(new URL("../../BAS Training/03_Eventi/catalogo_eventi.json", import.meta.url));

const CAMPI = ["id", "eventoId", "evento", "nome", "km", "dislivello", "giorniMin", "giorniMax", "giorniTipici", "partenze", "fineFinestra", "modello"];
const CAMPI_MODELLO = ["classe", "fattoreDislivello", "dislivelloLavoro", "biciKg", "borseKg", "acquaCiboKg", "giorniDalVia", "ebikeAmmessa", "c", "fs"];
const DATA = /^\d{4}-\d{2}-\d{2}$/;

test("ci sono i 23 percorsi, con gli id unici", () => {
  assert.equal(CATALOGO.length, 23);
  assert.equal(new Set(CATALOGO.map((p) => p.id)).size, 23);
  assert.equal(trovaPercorso("tg-medio").nome, "Medio");
  assert.equal(trovaPercorso("non-esiste"), null);
});

test("ogni percorso ha km, giorni in ordine, classe, C, fattore, dislivello, bici, borse e acqua", () => {
  for (const p of CATALOGO) {
    const m = p.modello;
    assert.ok(p.km > 0, p.id);
    assert.ok(p.giorniTipici.length > 0, p.id);
    assert.ok(p.giorniMin <= Math.min(...p.giorniTipici) && Math.max(...p.giorniTipici) <= p.giorniMax, `${p.id} giorni`);
    assert.ok([p.giorniMin, p.giorniMax, ...p.giorniTipici].every(Number.isInteger), `${p.id} giorni interi`);
    assert.ok(Object.hasOwn(STIMA.classi, m.classe), `${p.id} classe ${m.classe}`);
    const c = m.c ?? STIMA.classi[m.classe].c;
    assert.ok(c >= 9 && c <= 13, `${p.id} C ${c}`);
    assert.ok(costanteSalita(m.classe, 122) >= 9, p.id);
    assert.ok(m.fattoreDislivello >= 1 && m.fattoreDislivello <= 1.2, `${p.id} fattore`);
    const ufficiale = Number.isFinite(p.dislivello) && p.dislivello > 0;
    const lavoro = Number.isFinite(m.dislivelloLavoro) && m.dislivelloLavoro > 0;
    assert.ok(ufficiale !== lavoro, `${p.id} ha il dislivello ufficiale oppure quello di lavoro`);
    assert.ok(m.biciKg > 0 && m.borseKg >= 0 && m.acquaCiboKg > 0, `${p.id} masse`);
    assert.ok(p.partenze.length > 0 && p.partenze.every((d) => DATA.test(d)), `${p.id} partenze`);
    assert.ok(DATA.test(p.fineFinestra) && p.partenze.every((d) => d <= p.fineFinestra), `${p.id} finestra`);
  }
});

test("giorni dal via ed e-bike vietata solo per NorthCape4000 e Final Frontier Patagonia", () => {
  for (const p of CATALOGO) {
    const lunghi = p.eventoId === "nc4k" || p.eventoId === "ffp";
    assert.equal(p.modello.giorniDalVia, lunghi, p.id);
    assert.equal(p.modello.ebikeAmmessa, !lunghi, p.id);
  }
});

test("i valori di 1.2 per i percorsi", () => {
  const atteso = {
    "tt-originale": ["misto", 1.1, 11, 8, 2], "tt-originale-detour": ["misto", 1.1, 11, 8, 2], "tg-lungo": ["sterrato-ripido", 1, 11, 8, 2],
    "tge-is-express": ["asfalto-passi", 1, 9, 6, 2], "tge-tu-classic": ["asfalto-collinare", 1, 9, 6, 2], "ur-pa-corto": ["misto", 1.1, 11, 0, 1.5],
    "ur-vds-lungo": ["sterrato-ripido", 1, 11, 0, 1.5], "ur-fc-corto": ["sterrato-ripido", 1.1, 11, 0, 1.5], "nc4k-rovereto": ["asfalto-dolce", 1, 10, 10, 2],
    "ffp-huemul": ["misto-dolce", 1.1, 13, 12, 3],
  };
  for (const [id, [classe, fattore, bici, borse, acqua]] of Object.entries(atteso)) {
    const m = trovaPercorso(id).modello;
    assert.deepEqual([m.classe, m.fattoreDislivello, m.biciKg, m.borseKg, m.acquaCiboKg], [classe, fattore, bici, borse, acqua], id);
  }
  const lavoro = Object.fromEntries(CATALOGO.filter((p) => p.dislivello === null).map((p) => [p.id, p.modello.dislivelloLavoro]));
  assert.deepEqual(lavoro, {
    "tt-originale-detour": 7180, "tt-newbie-detour": 3000, "nc4k-rovereto": 36000, "nc4k-berlino": 18000,
    "ffp-puma": 18500, "ffp-guanaco": 14600, "ffp-huemul": 6700,
  });
});

test("js/catalogo.js non contiene campi di traccia, note o fonti", () => {
  for (const p of CATALOGO) {
    assert.deepEqual(Object.keys(p).filter((k) => !CAMPI.includes(k)), [], p.id);
    assert.deepEqual(Object.keys(p.modello).filter((k) => !CAMPI_MODELLO.includes(k)), [], p.id);
  }
  const testo = readFileSync(FILE, "utf8");
  const dati = testo.slice(testo.indexOf("export const CATALOGO"));
  assert.ok(!/https?|\.gpx|\blat\b|\blon\b|coordinat|punti|analisi|sintesi|\bnota\b|\bfonte\b|traccia|sterrato_pct|quota_max/i.test(dati));
  // Solo nomi, id e date, niente testi lunghi come le note.
  const stringhe = (v) => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(stringhe) : []);
  for (const s of stringhe(CATALOGO)) assert.ok(s.length <= 80, s);
});

test("il catalogo non si cambia per sbaglio", () => {
  assert.ok(Object.isFrozen(CATALOGO) && Object.isFrozen(CATALOGO[0]) && Object.isFrozen(CATALOGO[0].modello) && Object.isFrozen(CATALOGO[0].giorniTipici));
  assert.throws(() => { CATALOGO[0].km = 1; }, TypeError);
});

test("il dislivello di lavoro non compare mai nei testi mostrati", () => {
  const profili = [{}, { mediaDichiarata: 22.5 }, { pesoFascia: 4, borseKg: 12 }];
  const conLavoro = CATALOGO.filter((p) => p.modello.dislivelloLavoro !== null);
  assert.equal(conLavoro.length, 7);
  for (const p of conLavoro) {
    const l = p.modello.dislivelloLavoro;
    for (let g = p.giorniMin; g <= p.giorniMax; g++) {
      for (const profilo of profili) {
        const s = stimaH({ percorso: p, giorni: g, profilo, oggi: OGGI });
        const righe = righeStima(s).join(" ");
        const numeri = [l, l * p.modello.fattoreDislivello, l / g, Math.round(l / g / 50) * 50];
        for (const n of numeri) {
          assert.ok(!righe.includes(migliaia(n)) && !righe.includes(String(Math.round(n))), `${p.id} in ${g} giorni mostra ${n}`);
        }
        assert.equal(s.metriGiorno, null, p.id);
        assert.ok(righe.includes("dislivello non ancora pubblicato") && !righe.includes("m di salita"), `${p.id} in ${g} giorni`);
      }
    }
  }
});

test("con il catalogo privato accanto, js/catalogo.js è aggiornato", { skip: !existsSync(PRIVATO) && "catalogo privato assente" }, () => {
  const privato = JSON.parse(readFileSync(PRIVATO, "utf8"));
  assert.deepEqual(privato.map((p) => p.id), CATALOGO.map((p) => p.id), "rilancia python strumenti/catalogo.py");
  for (const p of privato) {
    const q = trovaPercorso(p.id);
    const m = p.modello;
    assert.deepEqual(
      [q.km, q.dislivello, q.giorniMin, q.giorniMax, q.giorniTipici, q.partenze, q.fineFinestra],
      [p.km, p.dislivello_m, p.giorni_min, p.giorni_max, p.giorni_tipici, p.partenze, p.fine_finestra], p.id);
    assert.deepEqual(
      [q.modello.classe, q.modello.fattoreDislivello, q.modello.dislivelloLavoro, q.modello.biciKg, q.modello.borseKg, q.modello.acquaCiboKg],
      [m.classe_fondo, m.fattore_dislivello, p.dislivello_m === null ? m.dislivello_lavoro_m : null, m.bici_kg, m.borse_kg, m.acqua_cibo_kg], p.id);
    if (p.evento_id === "tt") assert.equal(p.analisi_tracce, null, "per il Tuscany Trail solo i totali pubblici");
  }
});
