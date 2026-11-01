// Prove della palestra (9.9 della specifica). Si lanciano con  node --test test/palestra.test.mjs
// Le persone sono inventate (Lucia, Marco, Luca, Anna, Paolo), con date e numeri inventati.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ESERCIZI, SCHEDE, TESTI_PALESTRA, DOMANDE_PALESTRA, RIGA_APP,
  fasePalestra, sedutaPalestra, pesoProposto, caricoPalestra, rientroDopoPausa,
  descrizioneAttivita, leggiDescrizione, sedutaFatta, nomeAttivita, contoSedute,
} from "../js/palestra.js";
import { PIANO, CARICO } from "../js/parametri.js";

// --- Date e piano, rifatti qui con il conteggio dei weekend di 3.2 ---

const GIORNO = 86400000;
const utc = (iso) => { const [a, m, g] = iso.split("-").map(Number); return Date.UTC(a, m - 1, g); };
const piu = (iso, n) => new Date(utc(iso) + n * GIORNO).toISOString().slice(0, 10);
const fra = (da, a) => Math.round((utc(a) - utc(da)) / GIORNO);
const giornoSett = (iso) => (new Date(utc(iso)).getUTCDay() + 6) % 7;

// L'ultima domenica che finisce prima della partenza, cioè il weekend 1.
function domenicaPrima(partenza) {
  let d = piu(partenza, -1);
  while (giornoSett(d) !== 6) d = piu(d, -1);
  return d;
}

// Quello che js/piano.js passa a fasePalestra per un giorno.
function pianoDelGiorno(giorno, partenza, settimane, giorniEvento = 4, extra = {}) {
  const s1 = domenicaPrima(partenza);
  const w = giorno <= s1 ? Math.floor(fra(giorno, s1) / 7) + 1 : 0;
  return { settimane, settimaneAllaPartenza: w, giorniAllaPartenza: fra(giorno, partenza), giorniEvento, ...extra };
}

const lunediMeno = (partenza, n) => piu(domenicaPrima(partenza), -6 - 7 * (n - 1));

const PARTENZA = "2027-05-20";   // un giovedì
const LUCIA = { eta: 45, palestra: "mai", palestraSicurezza: "no" };
const MARCO = { eta: 45, palestra: "conosco", palestraSicurezza: "no" };
const LUCA = { eta: 35, palestra: "conosco", palestraSicurezza: "no" };
const ANNA = { eta: 40, palestra: "casa", palestraSicurezza: "no" };
const PAOLO = { eta: 62, palestra: "mai", palestraSicurezza: "no" };

// La scheda di ogni settimana del piano, chiesta il lunedì.
function schedePerSettimana(profilo, settimane, partenza = PARTENZA) {
  const lista = [];
  for (let k = 1; k <= settimane; k++) {
    const lunedi = piu(lunediMeno(partenza, settimane), 7 * (k - 1));
    lista.push(fasePalestra(pianoDelGiorno(lunedi, partenza, settimane), profilo, lunedi).scheda);
  }
  return lista;
}

const ripeti = (valore, volte) => Array(volte).fill(valore);
const forza = (s) => s.esercizi.filter((v) => v.blocco === "forza");
const gambe = (s) => s.esercizi.filter((v) => v.blocco === "forza" && v.gruppo === "gambe");
const voce = (s, id) => s.esercizi.find((v) => v.id === id);
const r = (da, a = da) => ({ da, a });

// Una seduta fatta per il registro, con gli esercizi { id, serie, ripetizioni, kg, riserva }.
function fatta(data, scheda, seduta, settimana, esercizi, altro = {}) {
  return {
    data, scheda, seduta, settimana, minuti: 50, sforzo: 6, allenato: "corpo", fatta: "tutta", livello: "verde",
    esercizi: esercizi.map((e) => ({ serie: 3, secondi: null, ...e })), ...altro,
  };
}

// --- I dati ---

test("le nove schede ci sono, e ogni esercizio e ogni alternativa esistono", () => {
  for (let n = 1; n <= 9; n++) assert.equal(SCHEDE[n].numero, n);
  for (const [id, e] of Object.entries(ESERCIZI)) {
    assert.equal(e.id, id);
    assert.match(id, /^[a-z0-9-]+$/);
    assert.ok(e.nome && e.come, id);
    assert.ok(["gambe", "salti", "tronco", "collo", "alto", "mobilita"].includes(e.gruppo), id);
    for (const alt of e.alternative) assert.ok(ESERCIZI[alt], `${id} → ${alt}`);
  }
  for (const n of [1, 2, 3, 6, 7, 8]) {
    for (const riga of SCHEDE[n].esercizi) {
      assert.ok(ESERCIZI[riga.id], `scheda ${n}, ${riga.id}`);
      for (const alt of riga.alternative || []) assert.ok(ESERCIZI[alt], `scheda ${n}, ${alt}`);
    }
  }
  assert.ok(Object.isFrozen(SCHEDE[3].periodi[0]) && Object.isFrozen(ESERCIZI.squat.alternative));
});

test("ogni scheda dà una seduta completa, con serie, ripetizioni o secondi, recupero e testi", () => {
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
    for (const profilo of [LUCIA, MARCO, ANNA]) {
      const s = sedutaPalestra(n, 2, "A", profilo, [], "verde");
      assert.ok(s.esercizi.length > 0, `scheda ${n}`);
      assert.ok(s.minuti >= 5 && s.minuti <= 75, `scheda ${n}, ${s.minuti} minuti`);
      for (const v of s.esercizi) {
        assert.ok(v.serie.da >= 1 && v.serie.a >= v.serie.da, `${n} ${v.id}`);
        assert.ok(v.ripetizioni || v.secondi, `${n} ${v.id}`);
        assert.ok(v.riserva || v.sforzo, `${n} ${v.id}`);
        assert.ok(v.testi.serie && v.testi.peso && v.testi.come, `${n} ${v.id}`);
      }
    }
  }
  assert.equal(sedutaPalestra(9, 1, null, LUCIA), null);
  const costruzione = sedutaPalestra(2, 5, "A", LUCIA, [], "verde");
  assert.ok(costruzione.minuti >= 40 && costruzione.minuti <= 65, `${costruzione.minuti}`);
  assert.equal(costruzione.riscaldamento[0], "Prima, 5-10 minuti di cyclette o camminata svelta.");
  assert.match(costruzione.sottotitolo, /^\d+ esercizi, circa /);
  assert.equal(voce(costruzione, "squat").testi.serie, "3 serie da 8-10");
  assert.equal(voce(costruzione, "squat").testi.recupero, "Riposa 2 minuti fra le serie");
  assert.equal(voce(costruzione, "squat").testi.peso, "Scegli un peso con cui, a fine serie, potresti farne ancora 2 o 3.");
  assert.ok(costruzione.avvertenze.includes("Mai fino a non farcela più."));
});

// --- Chi riceve quale scheda, e quando (5.1) ---

test("principiante con 16 settimane, scheda 1 per 3, scheda 2 per 9, scheda 5 dalla −4", () => {
  // Con 16 settimane la costruzione arriva alla −5, quindi al mantenimento non resta nessuna settimana.
  assert.deepEqual(schedePerSettimana(LUCIA, 16), [...ripeti(1, 3), ...ripeti(2, 9), ...ripeti(5, 4)]);
  // Con una settimana in più c'è la scheda 4, e con 20 ce ne sono 4.
  assert.deepEqual(schedePerSettimana(LUCIA, 17), [...ripeti(1, 3), ...ripeti(2, 9), 4, ...ripeti(5, 4)]);
  assert.deepEqual(schedePerSettimana(LUCIA, 20), [...ripeti(1, 3), ...ripeti(2, 9), ...ripeti(4, 4), ...ripeti(5, 4)]);
  const inizio = lunediMeno(PARTENZA, 16);
  const quinta = piu(inizio, 28);
  const f = fasePalestra(pianoDelGiorno(quinta, PARTENZA, 16), LUCIA, quinta);
  assert.deepEqual([f.fase, f.scheda, f.settimana, f.settimanaBlocco, f.sedute], ["costruzione", 2, 5, 2, 2]);
  const prima = fasePalestra(pianoDelGiorno(inizio, PARTENZA, 16), LUCIA, inizio);
  assert.deepEqual([prima.scheda, prima.familiarizzazione, prima.sedute], [1, true, 2]);
  // Le ripetizioni della scheda 2 seguono le settimane della tabella.
  assert.deepEqual(voce(sedutaPalestra(2, 5, "A", LUCIA), "squat").ripetizioni, r(8, 10));
  assert.deepEqual(voce(sedutaPalestra(2, 5, "B", LUCIA), "squat").ripetizioni, r(10, 12));
  assert.deepEqual(voce(sedutaPalestra(2, 9, "A", LUCIA), "squat").ripetizioni, r(6));
  assert.deepEqual(voce(sedutaPalestra(2, 9, "B", LUCIA), "squat").ripetizioni, r(4, 5));
});

test("principiante con 6 settimane, solo la scheda 1, ultima seduta almeno 14 giorni prima", () => {
  let giorniConScheda = 0;
  let piuVicino = Infinity;
  for (let g = lunediMeno(PARTENZA, 6); g < PARTENZA; g = piu(g, 1)) {
    const f = fasePalestra(pianoDelGiorno(g, PARTENZA, 6), LUCIA, g);
    const d = fra(g, PARTENZA);
    assert.ok(f.scheda === 1 || f.scheda === null, `${g} scheda ${f.scheda}`);
    assert.ok(f.messaggi.some((m) => m.chiave === "beneficio"));
    if (f.scheda === 1) {
      assert.ok(d >= 14, `${g}, ${d} giorni alla partenza`);
      giorniConScheda++;
      piuVicino = Math.min(piuVicino, d);
    }
  }
  assert.ok(giorniConScheda > 0);
  assert.equal(piuVicino, 14);
  assert.match(TESTI_PALESTRA.messaggi.beneficio, /dopo 8-12 settimane/);
  // Nelle ultime settimane la scheda 1 tiene 4 ripetizioni in riserva.
  const ultime = sedutaPalestra(1, 3, "ultime", LUCIA, [fatta("2027-04-01", 1, null, 1, [{ id: "step-up", ripetizioni: 15, kg: 8, riserva: 4 }])]);
  for (const v of forza(ultime)) if (v.riserva) assert.ok(v.riserva.da >= 4, v.id);
});

test("principiante con lo schema B, solo la scheda 1 anche con 8-11 settimane, ultima seduta almeno 14 giorni prima", () => {
  for (const settimane of [8, 9, 11]) {
    let piuVicino = Infinity;
    const schede = new Set();
    for (let g = lunediMeno(PARTENZA, settimane); g < PARTENZA; g = piu(g, 1)) {
      const f = fasePalestra(pianoDelGiorno(g, PARTENZA, settimane, 4, { schema: "B" }), LUCIA, g);
      schede.add(f.scheda);
      assert.ok(f.messaggi.some((m) => m.chiave === "beneficio"), `${settimane} settimane, ${g}`);
      if (f.scheda === 1) piuVicino = Math.min(piuVicino, fra(g, PARTENZA));
    }
    assert.deepEqual([...schede].filter(Boolean), [1], `${settimane} settimane, nessuna scheda pesante`);
    assert.equal(piuVicino, 14, `${settimane} settimane`);
  }
  // Con lo schema A e le stesse settimane il principiante passa alla scheda 2, e l'esperto resta
  // con la costruzione anche nello schema B.
  assert.ok(schedePerSettimana(LUCIA, 11).includes(2));
  const lunedi = lunediMeno(PARTENZA, 9);
  assert.equal(fasePalestra(pianoDelGiorno(lunedi, PARTENZA, 9, 4, { schema: "B" }), MARCO, lunedi).scheda, 3);
});

test("esperto di 45 anni, scheda 3 con riserva 2, e a 35 anni 1-2", () => {
  const inizio = lunediMeno(PARTENZA, 16);
  const f = fasePalestra(pianoDelGiorno(inizio, PARTENZA, 16), MARCO, inizio);
  assert.deepEqual([f.fase, f.scheda, f.percorso], ["costruzione", 3, "esperto"]);
  for (const seduta of ["A", "B"]) {
    for (const settimana of [1, 5, 9, 12]) {
      for (const v of forza(sedutaPalestra(3, settimana, seduta, MARCO))) {
        if (v.gruppo === "salti") continue;
        assert.deepEqual(v.riserva, r(2), `${seduta} ${settimana} ${v.id}`);
      }
      for (const v of forza(sedutaPalestra(3, settimana, seduta, LUCA))) {
        if (v.gruppo !== "salti") assert.deepEqual(v.riserva, r(1, 2));
      }
    }
  }
  const ripetizioni = (settimana, seduta) => voce(sedutaPalestra(3, settimana, seduta, MARCO), "squat").ripetizioni.da;
  assert.deepEqual([ripetizioni(1, "A"), ripetizioni(1, "B"), ripetizioni(5, "A"), ripetizioni(5, "B"), ripetizioni(8, "A"), ripetizioni(8, "B")], [10, 6, 8, 5, 6, 4]);
  // Con 16 settimane anche l'esperto costruisce fino alla −5, poi le ultime settimane.
  assert.deepEqual(schedePerSettimana(MARCO, 16), [...ripeti(3, 12), ...ripeti(5, 4)]);
});

test("a casa da 40 anni la riserva non scende mai sotto 1", () => {
  const sotto = [];
  for (let settimana = 1; settimana <= 12; settimana++) {
    for (const livello of ["verde", "giallo-leggero", "giallo"]) {
      for (const v of sedutaPalestra(8, settimana, null, ANNA, [], livello).esercizi) {
        if (v.riserva && v.riserva.da < 1) sotto.push(`${settimana} ${livello} ${v.id}`);
      }
    }
  }
  for (const [n, seduta] of [[4, null], [5, "pesante"], [8, "ultime"], [8, "familiarizzazione"]]) {
    for (const v of sedutaPalestra(n, 1, seduta, ANNA).esercizi) if (v.riserva && v.riserva.da < 1) sotto.push(`${n} ${v.id}`);
  }
  assert.deepEqual(sotto, []);
  // A 39 anni a casa si va più vicino al limite, dopo la familiarizzazione.
  const giovane = sedutaPalestra(8, 5, null, { ...ANNA, eta: 39 });
  assert.ok(forza(giovane).some((v) => v.riserva && v.riserva.da === 0));
  assert.match(voce(giovane, "split-squat").testi.peso, /^Metti nello zaino un peso con cui, a fine serie, potresti farne ancora al massimo 2\.$/);
  // Le prime settimane a casa hanno le riserve della scheda 1.
  assert.deepEqual(voce(sedutaPalestra(8, 1, null, ANNA), "split-squat").riserva, r(4, 5));
  // Mantenimento e ultime settimane a casa usano gli esercizi della scheda 8.
  const mantenimento = sedutaPalestra(4, 1, null, ANNA);
  assert.ok(voce(mantenimento, "split-squat") && voce(mantenimento, "squat-una") && !voce(mantenimento, "squat"));
  const inizio = lunediMeno(PARTENZA, 20);
  assert.deepEqual(schedePerSettimana(ANNA, 20), [...ripeti(8, 12), ...ripeti(4, 4), ...ripeti(5, 4)]);
  assert.equal(fasePalestra(pianoDelGiorno(inizio, PARTENZA, 20), ANNA, inizio).familiarizzazione, true);
});

test("62 anni, familiarizzazione di 4 settimane, e lo stesso senza altri sport", () => {
  assert.deepEqual(schedePerSettimana(PAOLO, 16), [...ripeti(1, 4), ...ripeti(2, 8), ...ripeti(5, 4)]);
  assert.deepEqual(schedePerSettimana({ ...LUCIA, altriSport: false }, 16).slice(0, 5), [1, 1, 1, 1, 2]);
  assert.deepEqual(schedePerSettimana(LUCIA, 16).slice(0, 4), [1, 1, 1, 2]);
});

test("chi conosce la palestra ma è fermo da più di 6 mesi rifà il percorso dei principianti", () => {
  const inizio = lunediMeno(PARTENZA, 16);
  const vecchio = [fatta(piu(inizio, -200), 3, "A", 5, [{ id: "squat", ripetizioni: 8, kg: 70, riserva: 2 }])];
  const recente = [fatta(piu(inizio, -60), 3, "A", 5, [{ id: "squat", ripetizioni: 8, kg: 70, riserva: 2 }])];
  const piano = pianoDelGiorno(inizio, PARTENZA, 16);
  assert.equal(fasePalestra(piano, MARCO, inizio, vecchio).scheda, 1);
  assert.equal(fasePalestra(piano, MARCO, inizio, recente).scheda, 3);
  assert.equal(fasePalestra(piano, MARCO, inizio, []).scheda, 3);
});

test("con 3 settimane o meno la palestra si rimanda, e senza data costruzione e poi mantenimento", () => {
  const inizio = lunediMeno(PARTENZA, 3);
  const f = fasePalestra(pianoDelGiorno(inizio, PARTENZA, 3), MARCO, inizio);
  assert.deepEqual([f.fase, f.scheda, f.sedute], ["rimandata", null, 0]);
  assert.ok(f.messaggi.some((m) => m.chiave === "rimandata"));
  assert.equal(f.tronco.scheda, 7);
  const libera = (k, profilo) => fasePalestra({ settimanaPiano: k }, profilo, "2027-01-04");
  assert.deepEqual([1, 3, 4, 12, 13, 30].map((k) => libera(k, LUCIA).scheda), [1, 1, 2, 2, 4, 4]);
  assert.deepEqual([1, 12, 13].map((k) => libera(k, MARCO).scheda), [3, 3, 4]);
  assert.equal(libera(40, MARCO).fase, "mantenimento");
});

test("mantenimento, 1 seduta a settimana e da 50 anni 2 con la seconda breve", () => {
  const tredicesima = piu(lunediMeno(PARTENZA, 20), 7 * 12);
  const piano = pianoDelGiorno(tredicesima, PARTENZA, 20);
  const a45 = fasePalestra(piano, MARCO, tredicesima);
  const a52 = fasePalestra(piano, { ...MARCO, eta: 52 }, tredicesima);
  assert.deepEqual([a45.fase, a45.scheda, a45.settimana, a45.sedute, a45.sedutaBreve], ["mantenimento", 4, 1, 1, false]);
  assert.deepEqual([a52.sedute, a52.sedutaBreve], [2, true]);
  assert.equal(fasePalestra({ ...piano, palestraMassima: 1 }, { ...MARCO, eta: 52 }, tredicesima).sedute, 1);
  const normale = sedutaPalestra(4, 1, null, { ...MARCO, eta: 52 });
  const breve = sedutaPalestra(4, 1, "breve", { ...MARCO, eta: 52 });
  assert.ok(gambe(normale).every((v) => v.serie.da === 2 && v.ripetizioni.da === 5 && v.ripetizioni.a === 6));
  assert.ok(gambe(breve).every((v) => v.serie.da === 1));
  assert.ok(!breve.esercizi.some((v) => v.blocco === "tronco") && normale.esercizi.some((v) => v.blocco === "tronco"));
  assert.ok(breve.minuti < normale.minuti);
  assert.ok(normale.avvertenze.includes(TESTI_PALESTRA.pagina.ritmoDa50));
  // Il mantenimento dell'esperto usa gli esercizi principali della scheda 3, senza i facoltativi.
  assert.ok(voce(normale, "polpacci-una") && !voce(normale, "stacco-rumeno") && !voce(normale, "salti-box"));
});

test("ultime settimane, giorno per giorno, e l'ultima seduta pesante fra 8 e 10 giorni prima", () => {
  const visti = [];
  for (let g = lunediMeno(PARTENZA, 4); g < PARTENZA; g = piu(g, 1)) {
    const f = fasePalestra(pianoDelGiorno(g, PARTENZA, 16), MARCO, g);
    const d = fra(g, PARTENZA);
    assert.equal(f.fase, "ultime");
    if (d >= 8) assert.deepEqual([f.scheda, f.variante, f.sedute], [5, "pesante", 1], `${d}`);
    else if (d >= 3) assert.deepEqual([f.scheda, f.variante, f.sedute, f.facoltativa], [5, "leggera", 0, true], `${d}`);
    else assert.deepEqual([f.scheda, f.tronco], [null, null], `${d}`);
    visti.push(f.settimana);
  }
  assert.deepEqual([...new Set(visti)], [1, 2, 3, 4, 5]);
  const f = fasePalestra(pianoDelGiorno(piu(PARTENZA, -9), PARTENZA, 16), MARCO, piu(PARTENZA, -9));
  assert.deepEqual([f.gambeFinoA, f.troncoFinoA, f.ultimaPesante], [8, 3, { da: 10, a: 8 }]);
  const ultima = sedutaPalestra(5, 3, "ultima", MARCO);
  assert.ok(ultima.righe.includes(TESTI_PALESTRA.giorno.ultimaPesante));
  assert.ok(gambe(ultima).every((v) => v.serie.da === 2 && v.riserva.da === 2));
  const leggera = sedutaPalestra(5, 4, "leggera", MARCO);
  assert.equal(gambe(leggera).length, 0);
  assert.ok(leggera.facoltativa && leggera.esercizi.every((v) => v.sforzo === "leggero"));
  assert.ok(voce(leggera, "mobilita") && voce(leggera, "plank-laterale").serie.a === 2);
});

test("la scheda 1 nella prima seduta ha una serie e più riserva, poi due serie", () => {
  const prima = sedutaPalestra(1, 1, null, LUCIA, []);
  assert.ok(prima.righe.includes(TESTI_PALESTRA.giorno.primaSeduta));
  assert.ok(prima.esercizi.every((v) => v.serie.da === 1));
  assert.deepEqual(voce(prima, "leg-press").riserva, r(4, 5));
  const dopo = sedutaPalestra(1, 2, null, LUCIA, [fatta("2027-01-25", 1, null, 1, [{ id: "leg-press", ripetizioni: 15, kg: 40, riserva: 4 }])]);
  assert.ok(dopo.esercizi.every((v) => v.serie.da === 2));
  assert.deepEqual(voce(dopo, "leg-press").riserva, r(3, 4));
  assert.deepEqual(voce(dopo, "plank-laterale").secondi, r(25));
  assert.equal(voce(dopo, "plank-laterale").testi.serie, "2 serie da 25 secondi per lato");
});

// --- Il peso (regola 4.3) ---

test("progressione, +5% sugli esercizi grandi per le gambe e +2,5% sugli altri, al chilo", () => {
  const registro = [fatta("2027-02-01", 3, "A", 1, [
    { id: "squat", ripetizioni: 10, kg: 60, riserva: 3 },
    { id: "polpacci-una", ripetizioni: 10, kg: 40, riserva: 3 },
    { id: "leg-press-una", ripetizioni: 10, kg: 47, riserva: 3 },
    { id: "flessione-anca", ripetizioni: 10, kg: 33, riserva: 3 },
  ])];
  const prossima = (id) => pesoProposto(registro, id, 3, { seduta: "A", settimana: 2, profilo: MARCO });
  assert.deepEqual(prossima("squat"), { kg: 63, prima: 60, aumento: true, pronto: true });
  assert.equal(prossima("polpacci-una").kg, 41);
  assert.equal(prossima("leg-press-una").kg, 49);    // 49,35 al chilo
  assert.equal(prossima("flessione-anca").kg, 34);   // 33,825 al chilo
  // Con la riserva a 2 il peso resta, perché la scheda 3 sale solo oltre 2.
  const fermo = [fatta("2027-02-01", 3, "A", 1, [{ id: "squat", ripetizioni: 10, kg: 60, riserva: 2 }])];
  assert.deepEqual(pesoProposto(fermo, "squat", 3, { seduta: "A", settimana: 2, profilo: MARCO }), { kg: 60, prima: 60, aumento: false, pronto: false });
  // Scheda 2, in cima alle ripetizioni con la riserva giusta.
  const cima = [fatta("2027-02-01", 2, "A", 5, [{ id: "squat", ripetizioni: 10, kg: 40, riserva: 2 }])];
  const meta = [fatta("2027-02-01", 2, "A", 5, [{ id: "squat", ripetizioni: 9, kg: 40, riserva: 2 }])];
  assert.equal(pesoProposto(cima, "squat", 2, { seduta: "A", settimana: 6, profilo: LUCIA }).kg, 42);
  assert.equal(pesoProposto(meta, "squat", 2, { seduta: "A", settimana: 6, profilo: LUCIA }).kg, 40);
  // Scheda 1, a 15 con 5 o più in riserva.
  const uno = [fatta("2027-02-01", 1, null, 2, [{ id: "leg-press", ripetizioni: 15, kg: 50, riserva: 5 }])];
  assert.equal(pesoProposto(uno, "leg-press", 1, { settimana: 3, profilo: LUCIA }).kg, 53);
  // La seduta B non prende l'aumento della A, e non propone mai un peso fatto con meno ripetizioni.
  const b = pesoProposto(registro, "squat", 3, { seduta: "B", settimana: 2, profilo: MARCO });
  assert.deepEqual([b.kg, b.aumento], [60, false]);
  const soloB = [fatta("2027-02-01", 3, "B", 1, [{ id: "squat", ripetizioni: 6, kg: 75, riserva: 3 }])];
  assert.equal(pesoProposto(soloB, "squat", 3, { seduta: "A", settimana: 2, profilo: MARCO }), null);
  // Mantenimento e ultime settimane tengono il peso della costruzione.
  const costruzione = [fatta("2027-04-01", 3, "A", 9, [{ id: "squat", ripetizioni: 6, kg: 80, riserva: 3 }])];
  assert.deepEqual(pesoProposto(costruzione, "squat", 4, { profilo: MARCO }), { kg: 80, prima: 80, aumento: false, pronto: false });
  assert.equal(pesoProposto(costruzione, "squat", 5, { profilo: MARCO }).aumento, false);
  assert.equal(pesoProposto([], "squat", 3, { seduta: "A" }), null);
  // Nella seduta la proposta compare con le parole di 5.6.
  const s = sedutaPalestra(3, 2, "A", MARCO, registro, "verde");
  assert.equal(voce(s, "squat").testi.proposta, "La volta scorsa 60 kg, oggi prova 63.");
  assert.equal(voce(sedutaPalestra(3, 2, "A", MARCO, fermo), "squat").testi.proposta, "La volta scorsa 60 kg, oggi lo stesso.");
});

// --- Il semaforo (regola 4.5) ---

test("giallo, stesso peso e un terzo delle serie in meno, e con le gambe indolenzite solo tronco, collo e parte alta", () => {
  const registro = [fatta("2027-02-01", 3, "A", 1, [{ id: "squat", ripetizioni: 10, kg: 60, riserva: 3 }])];
  const verde = sedutaPalestra(3, 2, "A", MARCO, registro, "verde");
  const giallo = sedutaPalestra(3, 2, "A", MARCO, registro, "giallo");
  assert.equal(voce(verde, "squat").kg, 63);
  assert.equal(voce(giallo, "squat").kg, 60);
  assert.equal(giallo.righe[0], "Oggi scheda leggera, stesso peso e meno serie.");
  for (const v of gambe(giallo)) {
    const prima = voce(verde, v.id);
    assert.equal(v.serie.da, 2, v.id);                     // da 3 a 2
    assert.equal(v.riserva.da, prima.riserva.da + 1, v.id);
  }
  assert.ok(!giallo.esercizi.some((v) => v.gruppo === "salti" || v.facoltativo));
  assert.ok(giallo.minuti < verde.minuti);
  const indolenzite = sedutaPalestra(3, 2, "A", MARCO, registro, { livello: "giallo", gambeIndolenzite: true });
  assert.equal(gambe(indolenzite).length, 0);
  assert.ok(indolenzite.esercizi.length > 0 && indolenzite.esercizi.every((v) => ["tronco", "collo", "alto"].includes(v.gruppo)));
  assert.deepEqual(indolenzite.righe, ["Oggi niente gambe pesanti, solo tronco, collo e parte alta."]);
  assert.equal(indolenzite.allenato, "alto");
  // Con una lunga vicina il testo dice quale.
  const lunga = sedutaPalestra(3, 2, "A", MARCO, registro, { livello: "verde", lungaVicina: { data: "2027-02-06", minuti: 300 } });
  assert.equal(gambe(lunga).length, 0);
  assert.deepEqual(lunga.righe, ["Sabato hai la lunga di 5 ore. Oggi niente gambe pesanti, solo tronco, collo e parte alta."]);
  // Giallo leggero, una ripetizione in più in riserva e niente salti, come anche con pochi dati. A
  // schermo con le parole della carta di Oggi (7.4), mai la riserva come sigla o come gergo.
  for (const livello of ["giallo-leggero", "nessuno"]) {
    const s = sedutaPalestra(3, 2, "A", MARCO, registro, livello);
    assert.ok(!s.esercizi.some((v) => v.gruppo === "salti"));
    assert.equal(voce(s, "squat").riserva.da, 3);
    assert.equal(voce(s, "squat").serie.da, 3);
    assert.equal(voce(s, "squat").kg, 60);
    assert.equal(s.righe[0], "Una ripetizione in meno in ogni serie, niente salti.");
  }
  // Nessun testo della palestra dice la riserva a parole come «in riserva».
  const testi = JSON.stringify(TESTI_PALESTRA) + JSON.stringify(SCHEDE);
  assert.ok(!/in riserva/.test(testi), "la riserva si dice con «potresti farne ancora»");
  assert.equal(TESTI_PALESTRA.rientro.media, "Torni dopo qualche settimana senza pesi. Per una settimana una serie in meno, e fermati una ripetizione prima del solito.");
  // Tronco e collo non hanno pesi, e il semaforo lo dice con altre parole.
  assert.equal(sedutaPalestra(7, 2, null, MARCO, [], "giallo").righe[0], TESTI_PALESTRA.giorno.gialloTronco);
  const leggero = sedutaPalestra(7, 2, null, MARCO, [], "giallo-leggero");
  assert.equal(leggero.righe[0], TESTI_PALESTRA.giorno.gialloLeggeroTronco);
  assert.ok(leggero.esercizi.every((v) => v.sforzo === "leggero"));
  assert.equal(verde.quanti, verde.esercizi.filter((v) => !v.facoltativo).length);
  assert.match(verde.sottotitolo, new RegExp(`^${verde.quanti} esercizi, circa `));
});

test("rosso, 10 minuti di mobilità", () => {
  for (const n of [1, 3, 4, 7, 8]) {
    const s = sedutaPalestra(n, 2, "A", MARCO, [], "rosso");
    assert.equal(s.minuti, PIANO.sedute.mobilitaRosso);
    assert.deepEqual(s.esercizi.map((v) => v.id), ["mobilita"]);
    assert.deepEqual(s.righe, ["Oggi solo 10 minuti di mobilità dolce."]);
    assert.equal(s.allenato, "alto");
  }
  assert.equal(sedutaPalestra(3, 2, "A", MARCO, [], "stop").minuti, 10);
});

// --- Sedute saltate e ritorno (regole 4.8 e 4.7) ---

test("pausa di 5 settimane, una settimana con una serie in meno e una ripetizione in più in riserva", () => {
  const oggi = "2027-03-08";
  const registro = [fatta(piu(oggi, -35), 3, "A", 5, [{ id: "squat", ripetizioni: 8, kg: 70, riserva: 2 }])];
  const rientro = rientroDopoPausa(registro, oggi);
  assert.equal(rientro.tipo, "media");
  assert.deepEqual([rientro.pausaGiorni, rientro.dal, rientro.fino, rientro.serieInMeno, rientro.riservaInPiu], [35, oggi, piu(oggi, 6), 1, 1]);
  const s = sedutaPalestra(3, 6, "A", MARCO, registro, "verde", { oggi });
  assert.equal(s.rientro, "media");
  assert.ok(s.righe.includes(TESTI_PALESTRA.rientro.media));
  assert.deepEqual([voce(s, "squat").serie.da, voce(s, "squat").riserva.da], [2, 3]);
  assert.equal(voce(s, "squat").aumento, false);
  // La settimana vale anche dopo la prima seduta del ritorno, e poi finisce.
  const conRitorno = [...registro, fatta(oggi, 3, "A", 6, [{ id: "squat", ripetizioni: 8, kg: 70, riserva: 3 }])];
  assert.equal(rientroDopoPausa(conRitorno, piu(oggi, 3)).tipo, "media");
  assert.equal(rientroDopoPausa(conRitorno, piu(oggi, 6)).tipo, "media");
  assert.equal(rientroDopoPausa(conRitorno, piu(oggi, 7)), null);
});

test("pause più corte e più lunghe, e il ritorno dopo un evento", () => {
  const oggi = "2027-03-08";
  const una = (giorni, scheda = 3) => [fatta(piu(oggi, -giorni), scheda, "A", 5, [{ id: "squat", ripetizioni: 8, kg: 70, riserva: 2 }])];
  assert.equal(rientroDopoPausa(una(5), oggi), null);
  assert.equal(rientroDopoPausa(una(9, 4), oggi), null);   // nel mantenimento si va ogni 7, al massimo ogni 10
  const breve = rientroDopoPausa(una(14), oggi);
  assert.deepEqual([breve.tipo, breve.serieInMeno, breve.riservaInPiu, breve.sedute], ["breve", 1, 0, 1]);
  const dopoUna = [...una(14), fatta(oggi, 3, "A", 6, [{ id: "squat", ripetizioni: 8, kg: 70, riserva: 2 }])];
  assert.equal(rientroDopoPausa(dopoUna, piu(oggi, 3)), null);   // vale per una seduta sola
  const lunga = rientroDopoPausa(una(50), oggi);
  assert.deepEqual([lunga.tipo, lunga.volumeScheda1, lunga.riserva, lunga.fino], ["lunga", true, [3, 4], piu(oggi, 13)]);
  const s = sedutaPalestra(3, 6, "A", MARCO, una(50), "verde", { oggi });
  for (const v of gambe(s)) {
    assert.deepEqual([v.serie, v.ripetizioni, v.riserva], [r(2), r(12, 15), r(3, 4)], v.id);
    assert.equal(v.kg, null);   // il peso di 8 ripetizioni non vale per 12-15
  }
  assert.ok(!s.esercizi.some((v) => v.gruppo === "salti"));
  // Dopo un evento, con la pausa oltre 4 settimane, 2 sedute al volume della scheda 1.
  const evento = rientroDopoPausa(una(30), oggi, piu(oggi, -10));
  assert.deepEqual([evento.tipo, evento.sedute, evento.volumeScheda1], ["dopoEvento", 2, true]);
  assert.equal(rientroDopoPausa(una(30), oggi).tipo, "media");
  assert.equal(rientroDopoPausa([], oggi), null);
});

// --- In viaggio (regola 4.7) ---

test("evento di 4 giorni, nessuna routine, ed evento di 15 giorni, la scheda 6 facoltativa", () => {
  for (const d of [0, -1, -2, -3]) {
    const f = fasePalestra({ settimane: 16, settimaneAllaPartenza: 0, giorniAllaPartenza: d, giorniEvento: 4 }, MARCO, null);
    assert.deepEqual([f.fase, f.scheda, f.sedute], ["evento", null, 0]);
    assert.ok(f.messaggi.some((m) => m.chiave === "nessunaRoutine"));
  }
  assert.equal(fasePalestra({ settimane: 16, settimaneAllaPartenza: 0, giorniAllaPartenza: -4, giorniEvento: 4 }, MARCO, null).fase, "dopo");
  const lungo = fasePalestra({ settimane: 20, settimaneAllaPartenza: 0, giorniAllaPartenza: -6, giorniEvento: 15 }, MARCO, null);
  assert.deepEqual([lungo.fase, lungo.scheda, lungo.facoltativa], ["evento", 6, true]);
  const s = sedutaPalestra(6, 1, null, MARCO);
  assert.deepEqual(s.esercizi.map((v) => v.id), ["collo", "rematore", "plank-laterale", "mobilita"]);
  assert.ok(s.facoltativa && s.minuti >= 5 && s.minuti <= 10, `${s.minuti}`);
  assert.ok(s.esercizi.every((v) => v.sforzo === "leggero"));
  assert.ok(s.righe.includes(TESTI_PALESTRA.giorno.viaggio));
  assert.equal(gambe(s).length, 0);
});

// --- Chi non fa palestra, e la domanda di sicurezza (5.1) ---

test("senza palestra restano tronco e collo, e con un sì alla domanda di sicurezza solo la scheda 7", () => {
  const giorno = lunediMeno(PARTENZA, 16);
  const piano = pianoDelGiorno(giorno, PARTENZA, 16);
  const no = fasePalestra(piano, { eta: 45, palestra: "no" }, giorno);
  assert.deepEqual([no.fase, no.scheda, no.sedute, no.tronco.minuti], ["nessuna", null, 0, 10]);
  assert.deepEqual(no.messaggi.map((m) => [m.chiave, m.quando]), [["invito", "al-mese"]]);
  assert.match(no.messaggi[0].testo, /si comincia con 40 minuti\.$/);
  const si = fasePalestra(piano, { ...LUCIA, palestraSicurezza: "si" }, giorno);
  assert.deepEqual([si.fase, si.scheda], ["solo-tronco", 7]);
  assert.equal(si.messaggi[0].testo, "Prima di cominciare parlane con il medico o il fisioterapista. Intanto ti propongo solo tronco, collo e mobilità.");
  const daChiedere = fasePalestra(piano, { eta: 45, palestra: "conosco" }, giorno);
  assert.deepEqual([daChiedere.fase, daChiedere.chiedi], ["solo-tronco", "sicurezza"]);
  // Dopo «Ne ho parlato» tornano le schede, ma i salti restano fuori.
  const parlato = { ...MARCO, palestraSicurezza: "parlato" };
  assert.equal(fasePalestra(piano, parlato, giorno).scheda, 3);
  assert.ok(!sedutaPalestra(3, 2, "A", parlato).esercizi.some((v) => v.gruppo === "salti"));
  assert.ok(sedutaPalestra(3, 2, "A", MARCO).esercizi.some((v) => v.id === "salti-box"));
  assert.equal(DOMANDE_PALESTRA.palestra.predefinita, "no");
  assert.deepEqual(DOMANDE_PALESTRA.palestra.scelte.map((s) => s.valore), ["no", "conosco", "mai", "casa"]);
});

test("da 40 anni i salti bassi per le ossa, facoltativi e crescendo in 4 settimane, e da 50 il messaggio una volta", () => {
  const serie = (settimana) => voce(sedutaPalestra(2, settimana, "A", LUCIA), "salti-bassi").serie.da;
  assert.deepEqual([4, 5, 6, 7, 9].map(serie), [2, 3, 4, 5, 5]);   // la scheda 2 comincia alla settimana 4
  assert.equal(voce(sedutaPalestra(4, 1, null, LUCIA), "salti-bassi").serie.da, 5);
  assert.deepEqual([1, 2, 3, 4, 5].map((k) => voce(sedutaPalestra(7, k, null, LUCIA), "salti-bassi").serie.da), [2, 3, 4, 5, 5]);
  assert.ok(voce(sedutaPalestra(7, 1, null, LUCIA), "salti-bassi").facoltativo);
  assert.equal(voce(sedutaPalestra(2, 5, "A", { ...LUCIA, eta: 35 }), "salti-bassi"), undefined);
  assert.equal(voce(sedutaPalestra(1, 1, null, LUCIA), "salti-bassi"), undefined);
  assert.equal(voce(sedutaPalestra(2, 5, "A", LUCIA, [], "giallo"), "salti-bassi"), undefined);
  const giorno = lunediMeno(PARTENZA, 16);
  const ossa = fasePalestra(pianoDelGiorno(giorno, PARTENZA, 16), { ...LUCIA, eta: 52 }, giorno).messaggi.find((m) => m.chiave === "ossa");
  assert.deepEqual([ossa.quando, ossa.testo], ["una-volta", "Chi pedala tanto ha spesso le ossa un po' meno dense. Vale la pena parlarne con il medico."]);
  assert.equal(fasePalestra(pianoDelGiorno(giorno, PARTENZA, 16), LUCIA, giorno).messaggi.some((m) => m.chiave === "ossa"), false);
});

// --- Il carico (regola 1.6) ---

test("il carico della palestra per la Fatica, e niente nella Fitness", () => {
  const vicino = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(vicino(caricoPalestra(60, 6, "gambe"), 72));
  assert.ok(vicino(caricoPalestra(60, 5, "corpo"), 42));
  assert.ok(vicino(caricoPalestra(60, 6, "alto"), 28.8));
  assert.ok(vicino(caricoPalestra(null, null, null), 35));   // 50 minuti, sforzo 5, corpo intero
  assert.equal(caricoPalestra(60, 6, "gambe") * CARICO.palestraNellaFitness, 0);
});

// --- La registrazione e la riga [come-sto v1] (5.6) ---

test("la riga [come-sto v1] scritta e riletta dà la stessa seduta", () => {
  const registro = [fatta("2027-02-01", 3, "A", 1, [{ id: "squat", ripetizioni: 10, kg: 60, riserva: 3 }])];
  const seduta = sedutaPalestra(3, 2, "A", MARCO, registro, "verde");
  const fattaOggi = sedutaFatta(seduta, {
    data: "2027-02-04", fatta: "tutta", sforzo: 7,
    pesi: { "squat": { kg: 63, riserva: 2 }, "leg-press-una": { kg: 42.5, riserva: 2, ripetizioni: 9 }, "polpacci-una": { id: "polpacci", kg: 50, riserva: 3 } },
  });
  assert.deepEqual([fattaOggi.minuti, fattaOggi.allenato, fattaOggi.scheda, fattaOggi.seduta, fattaOggi.settimana], [50, "corpo", 3, "A", 2]);
  const testo = descrizioneAttivita(fattaOggi);
  const righe = testo.split("\n");
  assert.equal(righe[0], "Squat 3 × 10 a 63 kg, riserva 2");
  assert.equal(righe[1], "Leg press a una gamba 3 × 9 a 42,5 kg, riserva 2");
  assert.ok(righe.includes("Polpacci 3 × 10 a 50 kg, riserva 3"));
  assert.ok(righe.includes("Plank laterale 2 × 20 secondi per lato"));
  assert.ok(righe[righe.length - 1].startsWith(`${RIGA_APP} d=2027-02-04 s=3 q=A w=2`));
  assert.ok(!testo.includes(":"));
  assert.deepEqual(leggiDescrizione(testo), fattaOggi);
  // Anche fra altre righe scritte dalla persona, e senza la riga niente.
  assert.deepEqual(leggiDescrizione(`Bella seduta\n${testo}\nCon Marco`), fattaOggi);
  assert.equal(leggiDescrizione("Giro con gli amici"), null);
  assert.equal(leggiDescrizione(null), null);
  // Una seduta leggera senza pesi segnati, e una di tronco.
  const veloce = sedutaFatta(sedutaPalestra(7, 1, null, LUCIA), { data: "2027-02-05", fatta: "leggera", sforzo: 3 });
  assert.equal(veloce.allenato, "alto");
  assert.ok(veloce.minuti < 50);
  assert.deepEqual(leggiDescrizione(descrizioneAttivita(veloce)), veloce);
  assert.equal(nomeAttivita(fattaOggi), "Palestra, scheda 3, seduta A");
  assert.equal(nomeAttivita({ scheda: 1, seduta: null }), "Palestra, scheda 1");
  // Il registro ricostruito dalla riga propone il peso come quello del telefono.
  const riletto = [leggiDescrizione(testo)];
  assert.equal(pesoProposto(riletto, "squat", 3, { seduta: "A", settimana: 3, profilo: MARCO }).kg, 63);
});

test("il conto delle sedute, per le finestre del piano", () => {
  const oggi = "2027-02-10";
  const registro = [
    fatta("2027-02-01", 3, "A", 1, []),
    fatta("2027-02-05", 3, "B", 1, []),
    fatta("2027-02-09", 7, null, 2, [], { allenato: "alto" }),
  ];
  assert.deepEqual(contoSedute(registro, oggi), { totali: 2, ultimi7: 1, ultimaGambe: "2027-02-05", giorniDaGambe: 5 });
  assert.deepEqual(contoSedute([], oggi), { totali: 0, ultimi7: 0, ultimaGambe: null, giorniDaGambe: null });
});

// --- I testi (7.1 e 9.8) ---

const VIETATE = new RegExp("\\b(ga" + "r[ae]" + "|presta" + "zion[ei]" + "|ra" + "c(e|es|ing)" + "|perfor" + "mance)\\b", "i");
const SIGLE = /\b(T1|T2|T3|RIR|kJ|RPE)\b/;
const GERGO = /\b(indietro|tapering|ritmo-soglia|specchio|principiante|amatore|allenato)\b/i;
const DECIMALI_DURATA = /\d[.,]\d+\s*(minut|or[ae]\b|second)/;

function stringhe(valore, lista = []) {
  if (typeof valore === "string") lista.push(valore);
  else if (valore && typeof valore === "object") for (const v of Object.values(valore)) stringhe(v, lista);
  return lista;
}

function controlla(testi) {
  const male = [];
  for (const t of testi) {
    if (t.includes(":")) male.push(`due punti in «${t}»`);
    if (VIETATE.test(t)) male.push(`parola vietata in «${t}»`);
    if (SIGLE.test(t)) male.push(`sigla in «${t}»`);
    if (GERGO.test(t)) male.push(`gergo in «${t}»`);
    if (DECIMALI_DURATA.test(t)) male.push(`durata con decimali in «${t}»`);
  }
  return male;
}

test("i testi esportati non hanno due punti, parole vietate, sigle o gergo", () => {
  const testi = stringhe({ ESERCIZI, SCHEDE, TESTI_PALESTRA, DOMANDE_PALESTRA, RIGA_APP });
  assert.ok(testi.length > 150);
  assert.deepEqual(controlla(testi), []);
});

test("nemmeno i testi composti delle sedute, dei messaggi e delle descrizioni", () => {
  const testi = [];
  const profili = [LUCIA, MARCO, LUCA, ANNA, PAOLO, { ...MARCO, eta: 55 }];
  const registro = [fatta("2027-02-01", 3, "A", 1, [{ id: "squat", ripetizioni: 10, kg: 62.5, riserva: 3 }])];
  for (const profilo of profili) {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
      for (const seduta of ["A", "B", "breve", "pesante", "ultima", "leggera", "ultime", "familiarizzazione"]) {
        for (const livello of ["verde", "giallo-leggero", "giallo", "rosso", "nessuno", { livello: "giallo", gambeIndolenzite: true }, { livello: "verde", lungaVicina: { giorno: "domenica", minuti: 270 } }]) {
          for (const settimana of [1, 4, 9]) {
            const s = sedutaPalestra(n, settimana, seduta, profilo, registro, livello, { oggi: "2027-03-20" });
            testi.push(s.nome, s.titolo, s.sottotitolo, ...s.righe, ...s.avvertenze, ...s.riscaldamento);
            for (const v of s.esercizi) testi.push(...Object.values(v.testi).filter((t) => typeof t === "string"));
            testi.push(...descrizioneAttivita(sedutaFatta(s, { data: "2027-03-20", sforzo: 5 })).split("\n"), nomeAttivita(s));
          }
        }
      }
    }
  }
  for (let g = lunediMeno(PARTENZA, 24); g < piu(PARTENZA, 20); g = piu(g, 3)) {
    for (const profilo of [...profili, { eta: 45, palestra: "no" }, { ...LUCIA, palestraSicurezza: "si" }]) {
      for (const settimane of [3, 6, 16, 24]) {
        const f = fasePalestra(pianoDelGiorno(g, PARTENZA, settimane, 15), profilo, g);
        testi.push(...f.messaggi.map((m) => m.testo));
      }
    }
  }
  for (const r of [7, 14, 30, 50]) {
    const ritorno = rientroDopoPausa([fatta("2027-01-01", 3, "A", 2, [])], piu("2027-01-01", r), "2027-01-20");
    if (ritorno) testi.push(ritorno.testo);
  }
  assert.ok(testi.length > 10000);
  assert.deepEqual([...new Set(controlla(testi))], []);
});
