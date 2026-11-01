// Prove dei parametri. Si lanciano con  node --test test/parametri.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import * as parametri from "../js/parametri.js";
import { STIMA, PASSO, BORSE, PRONTEZZA, PIANO, DOMENICA, SEMAFORO, CARICO, DOMANDE, MEMORIA, CHIAMATE } from "../js/parametri.js";

const GRUPPI = ["STIMA", "PASSO", "BORSE", "PRONTEZZA", "PIANO", "DOMENICA", "SEMAFORO", "DATI", "CARICO", "DOMANDE", "MEMORIA", "CHIAMATE"];
const vicino = (a, b, tolleranza = 1e-9) => Math.abs(a - b) <= tolleranza;

// Ogni oggetto e ogni lista dentro il valore, con il suo percorso.
function oggetti(valore, percorso, lista = []) {
  if (valore !== null && typeof valore === "object") {
    lista.push([percorso, valore]);
    for (const [chiave, dentro] of Object.entries(valore)) oggetti(dentro, `${percorso}.${chiave}`, lista);
  }
  return lista;
}

test("ci sono tutti i gruppi dell'appendice A", () => {
  for (const nome of GRUPPI) {
    assert.equal(typeof parametri[nome], "object", nome);
    assert.ok(parametri[nome] !== null && Object.keys(parametri[nome]).length > 0, nome);
  }
});

test("ogni gruppo è congelato anche dentro, e non si cambia per sbaglio", () => {
  for (const [nome, gruppo] of Object.entries(parametri)) {
    const sciolti = oggetti(gruppo, nome).filter(([, o]) => !Object.isFrozen(o)).map(([p]) => p);
    assert.deepEqual(sciolti, [], nome);
  }
  assert.throws(() => { STIMA.potenza.quotaFtp = 1; }, TypeError);
  assert.throws(() => { PIANO.tapering.normale.fasi.push({ da: 1, a: 1, fattore: 1 }); }, TypeError);
  assert.throws(() => { SEMAFORO.nuovo = 1; }, TypeError);
});

test("ogni valore è un numero finito o un nome", () => {
  for (const [nome, gruppo] of Object.entries(parametri)) {
    for (const [percorso, o] of oggetti(gruppo, nome)) {
      for (const [chiave, v] of Object.entries(o)) {
        if (v !== null && typeof v === "object") continue;
        const buono = (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && v.length > 0);
        assert.ok(buono, `${percorso}.${chiave}`);
      }
    }
  }
});

test("una dozzina di valori dell'appendice A", () => {
  assert.deepEqual([STIMA.densitaAria, STIMA.gravita, STIMA.rendimento, STIMA.cda, STIMA.crr], [1.2, 9.81, 0.96, 0.4, 0.006]);
  assert.deepEqual(STIMA.forbice, [0.15, 0.1, 0.08, 0.06]);
  assert.deepEqual([STIMA.classi["sterrato-ripido"].fs, STIMA.classi["sterrato-ripido"].c], [1.111, 12.5]);
  assert.equal(PASSO.minutiMinimi, 90);
  assert.equal(PASSO.erroreMassimo, 0.3);
  assert.deepEqual([BORSE.minimo, BORSE.massimo], [1, 1.4]);
  assert.deepEqual([PRONTEZZA.obiettivi["2-5"].vMin, PRONTEZZA.obiettivi["2-5"].vComodo], [0.9, 1.15]);
  assert.deepEqual([PRONTEZZA.soglie.T3.giorno1, PRONTEZZA.soglie.T3.giorno1DaSei, PRONTEZZA.soglie.T3.giorno2], [0.63, 0.54, 0.45]);
  assert.deepEqual(PRONTEZZA.pilastri.continuita, { difetto1Da: 21, difetto2Da: 28 });
  assert.deepEqual(PIANO.tapering.normale.fasi.map((f) => f.fattore), [0.7, 0.55, 0.3]);
  assert.deepEqual([DOMENICA.segnali, DOMENICA.settimanaFacile.ore, DOMENICA.medico.giorni], [7, 0.55, 14]);
  assert.deepEqual(SEMAFORO.hrv.dsMinima, { polso: 0.08, anelloFascia: 0.06 });
  assert.deepEqual([SEMAFORO.carico.moltoAlto.rapporto, SEMAFORO.carico.moltoAlto.differenza], [1.5, 25]);
  assert.deepEqual([CARICO.serie.fitness, CARICO.serie.fatica, CARICO.serie.faticaLenta], [42, 7, 10]);
  assert.deepEqual([DOMANDE.primoAvvio, DOMANDE.primoAvvioSenzaGiri, DOMANDE.scadenzaGiorni], [8, 10, 14]);
  assert.deepEqual([MEMORIA.giorni, MEMORIA.copiaOgniGiorni, MEMORIA.cacheGiorniInPiu], [400, 30, 3]);
  assert.deepEqual([CHIAMATE.lettureApertura, CHIAMATE.minutiFraLetture, CHIAMATE.giorniAtleta, CHIAMATE.serverPrimaDiPersone], [2, 10, 7, 1500]);
});

test("le classi di fondo tornano con le loro quote, e i nomi usati esistono", () => {
  const f = STIMA.fattoriFondo;
  for (const [nome, classe] of Object.entries(STIMA.classi)) {
    const q = classe.quote;
    assert.ok(vicino(q.asfalto + q.compatto + q.smosso, 1), nome);
    assert.ok(vicino(q.asfalto / f.asfalto + q.compatto / f.compatto + q.smosso / f.smosso, classe.fs, 0.001), nome);
  }
  const usate = [STIMA.mediaDichiarata.classe, ...Object.values(STIMA.obiettivoLibero.classi), ...Object.values(PASSO.tipi).map((t) => t.classe)];
  for (const nome of usate) assert.ok(STIMA.classi[nome], nome);
});

test("il tapering di 14 giorni porta la settimana −2 al 70% e la −1 al 44%", () => {
  const t = PIANO.tapering.normale;
  const giorni = [];
  for (let d = t.giorni; d >= 1; d--) giorni.push(t.fasi.find((fase) => d <= fase.da && d >= fase.a).fattore);
  const media = (lista) => lista.reduce((s, x) => s + x, 0) / lista.length;
  assert.ok(vicino(media(giorni.slice(0, 7)), 0.7, 0.02));
  assert.ok(vicino(media(giorni.slice(7)), 0.44, 0.02));
});
