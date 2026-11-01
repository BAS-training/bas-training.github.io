// La catena intera sui quattro casi tipo (8.8, con l'idea di 9.11). Le uscite inventate di
// test/casi-tipo.mjs, nella forma delle risposte di intervals.icu, passano da js/dati.js, js/stima.js,
// js/carico.js, js/prontezza.js e js/piano.js come farebbe la pagina, alla vigilia e qualche settimana
// prima con il piano. In fondo la taratura privata sui viaggi veri, che parte solo con COMESTO_TARATURA
// e altrimenti si salta con «taratura privata assente» (9.10).
// Si lanciano con  node --test test/catena.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { CASI_TIPO } from "./casi-tipo.mjs";
import { preparaAttivita, normalizzaGiorno, QUALITA } from "../js/dati.js";
import { stimaH } from "../js/stima.js";
import { puntiOra, serieCarico } from "../js/carico.js";
import { valutaProntezza } from "../js/prontezza.js";
import { pianoLungo } from "../js/piano.js";
import { trovaPercorso } from "../js/catalogo.js";
import { AVVISO_DOPPIO_USO, VARIANTI, VERDETTI, cosaAllaVigilia, righeProposta, testoFitness } from "../js/testi-prontezza.js";
import { righeStima } from "../js/testi-stima.js";

const GIORNO_MS = 86400000;
const piu = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * GIORNO_MS).toISOString().slice(0, 10);

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
  assert.ok(!/undefined|null|NaN/.test(testo), `valore mancante in ${dove}, ${testo}`);
}

// I testi che la pagina mostrerebbe, dalla stima, da «Pronto?» e dal piano.
function testiDi({ stima, r, piano }) {
  const lista = [...righeStima(stima)];
  const v = r.verdetto;
  if (v) lista.push(v.titolo, v.perche, v.cosa);
  lista.push(...r.righe.map((x) => x.testo));
  if (r.pilastri) lista.push(...r.pilastri.borse.righe.map((x) => x.testo));
  if (r.fiducia) lista.push(r.fiducia.titolo, r.fiducia.testo);
  if (r.proiezione) lista.push(...r.proiezione.frasi, ...r.proiezione.righe.map((x) => x.testo));
  lista.push(...r.avvisi.map((a) => a.testo), testoFitness(r.confronto));
  if (r.obiettivi && r.proposta) lista.push(...righeProposta(r.proposta, { giorni: r.giorni, H: r.H, vMin: r.obiettivi.vMin }));
  if (piano) lista.push(...piano.avvisi.map((a) => a.testo), ...piano.settimane.map((s) => s.frase));
  return lista.filter((t) => t !== null && t !== undefined);
}

// --- La pagina quel giorno ---

// Le attività fino a oggi passano da js/dati.js con le risposte del telefono, la stima da js/stima.js,
// k e la Fitness di Come sto da js/carico.js, il piano da js/piano.js se serve, poi «Pronto?».
function catena(caso, oggi, { conPiano = false, fitness = undefined } = {}) {
  const giorni = caso.benessere.map(normalizzaGiorno).filter(Boolean);
  const grezze = caso.attivita.filter((a) => a.start_date_local.slice(0, 10) <= oggi);
  const uscite = preparaAttivita(grezze, giorni, { detti: caso.detti, oggi });
  const percorso = trovaPercorso(caso.percorso);
  const stima = stimaH({ percorso, giorni: caso.giorni, profilo: caso.profilo, atleta: caso.atleta, uscite, oggi });
  const serie = serieCarico(giorni, uscite, uscite[uscite.length - 1].giorno, { fino: oggi });
  const comeSto = serie[serie.length - 1].fitness;
  const k = puntiOra(uscite, oggi);
  const piano = conPiano
    ? pianoLungo({
      obiettivo: { percorso: caso.percorso, giorni: caso.giorni, partenza: caso.partenza },
      stima,
      profilo: { esperienza: caso.esperienza },
      storico: { uscite, fitness: comeSto, k },
      disponibilita: caso.disponibilita,
      oggi,
      atleta: caso.atleta,
    })
    : null;
  const r = valutaProntezza({
    percorso, giorni: caso.giorni, partenza: caso.partenza, oggi, uscite, benessere: giorni, piano, profilo: caso.profilo,
    atleta: caso.atleta, stima, esperienza: caso.esperienza, oreDisponibili: caso.disponibilita.ore, fitness: fitness === undefined ? comeSto : fitness, k,
  });
  return { uscite, stima, fitness: comeSto, k, piano, r };
}

const difetti = (r) => ["volume", "lunga", "borse", "continuita"].map((n) => r.pilastri[n].difetto);
const stati = (r) => Object.fromEntries(r.pilastri.borse.righe.map((x) => [x.prova, x.stato]));

// Le attese comuni di un caso alla vigilia, scritte in test/casi-tipo.mjs.
function controllaVigilia(caso, c) {
  const { stima, r } = c;
  const a = caso.atteso;
  const dove = `${caso.nome}, ${caso.tipo}`;
  assert.equal(r.fase, "verdetto", dove);
  assert.equal(r.classe, a.classe, dove);
  assert.equal(stima.fonte.tipo, a.fonte, `${dove}, fonte della stima`);
  assert.ok(stima.livello >= 1, `${dove}, la potenza viene dal misuratore`);
  assert.equal(r.esito, a.esito, `${dove}, verdetto`);
  assert.deepEqual(difetti(r), a.difetti, `${dove}, difetti`);
  assert.deepEqual(stati(r), a.prove, `${dove}, prove con le borse`);
  if (a.avvisi) assert.deepEqual(r.avvisi.map((x) => x.tipo), a.avvisi, `${dove}, avvisi`);
  if (a.fiducia) assert.equal(r.fiducia.livello, a.fiducia, `${dove}, fiducia`);
  if (a.specchio) assert.equal(r.confronto.esito, a.specchio, `${dove}, confronto con la Fitness`);
  if (a.variante) assert.deepEqual([r.verdetto.perche, r.verdetto.cosa], [VARIANTI[a.variante].perche, VARIANTI[a.variante].cosa], `${dove}, testo del quasi pronto`);
  if (a.tardi) assert.deepEqual(r.pilastri.borse.righe.filter((x) => x.tardi).map((x) => x.prova), a.tardi, `${dove}, prove fatte tardi`);
  for (const t of testiDi(c)) controllaTesto(t, dove);
  // La Fitness non decide mai il verdetto (2.6).
  for (const fitness of [0, 200]) assert.equal(catena(caso, caso.vigilia, { fitness }).r.esito, a.esito, `${dove}, con la Fitness a ${fitness}`);
}

// --- I casi tipo ---

test("i casi tipo hanno le ore alla mezz'ora, nessuna notte e nessuna data dei viaggi della taratura", () => {
  for (const [nome, crea] of Object.entries(CASI_TIPO)) {
    const caso = crea();
    for (const a of caso.attivita) {
      if (!(a.moving_time > 0) || a.id === (caso.doppio && caso.doppio.tolta)) continue;
      assert.equal(a.moving_time % 1800, 0, `${nome}, ${a.id} non è alla mezz'ora`);
    }
    for (const g of caso.benessere) assert.ok(!["hrv", "restingHR", "sleepSecs", "sleepScore"].some((k) => k in g), `${nome}, una notte nel benessere`);
    assert.ok(caso.partenza >= "2027-01-01", `${nome}, la partenza è inventata e futura`);
  }
});

test("Marco, un viaggio lungo ben preparato, pronto con il blocco e la prova generale nella stessa uscita", () => {
  const caso = CASI_TIPO.marco();
  const c = catena(caso, caso.vigilia);
  // Lo stesso giro da due dispositivi conta una volta sola, e resta quello con la potenza (6.3).
  assert.equal(c.uscite.some((u) => u.id === caso.doppio.tolta), false);
  assert.deepEqual(c.uscite.find((u) => u.id === caso.doppio.tenuta).doppioni.map((x) => x.id), [caso.doppio.tolta]);
  // La giornata viene dal viaggio di quattro giorni e sta oltre il gradino delle 9 ore (8.7). Con H fra
  // 4 / 0,45 e 6 / 0,54 il viaggio di tre giorni fa la prova generale ma non il blocco.
  assert.deepEqual([c.stima.livello, c.stima.fonte.giorni], [3, 4]);
  assert.ok(c.stima.H >= 9 && c.stima.H < 6 / 0.54, `H ${c.stima.H}`);
  assert.ok(c.r.obiettivi.vMin >= 9.5, "il minimo delle ore a settimana con il gradino");
  assert.ok(c.r.pilastri.volume.valore < c.r.obiettivi.vComodo, "le ore sotto il comodo, quindi senza margine");
  controllaVigilia(caso, c);
  const prove = Object.fromEntries(c.r.pilastri.borse.righe.map((x) => [x.prova, x]));
  assert.ok(prove.blocco.doppioUso && prove.T3.doppioUso);
  assert.equal(prove.blocco.a, prove.T3.a, "la stessa uscita, la più recente");
  assert.equal(c.r.avvisi[0].testo, AVVISO_DOPPIO_USO);
  assert.equal(c.r.verdetto.titolo, VERDETTI.pronto.titolo);
});

test("Marco senza le borse nel viaggio di quattro giorni, quasi pronto, la prova generale torna al viaggio di tre", () => {
  const caso = CASI_TIPO.marco({ senzaBorse: true });
  const c = catena(caso, caso.vigilia);
  controllaVigilia(caso, c);
  const t3 = c.r.pilastri.borse.righe.find((x) => x.prova === "T3");
  assert.equal(t3.a, piu(caso.partenza, -52));
  assert.equal(t3.doppioUso, false);
});

test("Anna, un viaggio lungo senza prove con le borse, quasi pronto con il testo di chi ha esperienza", () => {
  const caso = CASI_TIPO.anna();
  const c = catena(caso, caso.vigilia);
  assert.ok(c.stima.H < 9, `H ${c.stima.H}, sotto il gradino`);
  controllaVigilia(caso, c);
  // I tre giorni lunghi senza risposta sulle borse abbassano la fiducia e lo dicono (2.5).
  assert.deepEqual(c.r.fiducia.motivo, { tipo: "borse", quanti: 3 });
  assert.ok(c.r.pilastri.lunga.valore >= 7);
});

test("Anna con i tre giorni dichiarati con le borse, ancora quasi pronto, perché ogni uscita vale una prova sola", () => {
  const caso = CASI_TIPO.anna({ bloccoCarico: true });
  const c = catena(caso, caso.vigilia);
  controllaVigilia(caso, c);
  assert.equal(c.stima.fattore, 1, "il fattore carico resta al minimo di 1,00");
});

test("Luca, un viaggio corto con tanta Fitness, pronto con margine", () => {
  const caso = CASI_TIPO.luca();
  const c = catena(caso, caso.vigilia);
  controllaVigilia(caso, c);
  const p = c.r.pilastri;
  assert.ok(p.volume.margine && p.lunga.margine);
  assert.ok(p.volume.valore > 1.5 * c.r.obiettivi.vComodo, `V ${p.volume.valore}`);
  assert.deepEqual([c.r.verdetto.titolo, c.r.verdetto.perche, c.r.verdetto.cosa], [VERDETTI.conMargine.titolo, VERDETTI.conMargine.perche, VERDETTI.conMargine.cosa]);
  assert.ok(c.r.pilastri.borse.righe.every((x) => !x.tardi), "il viaggio finisce 22 giorni prima");
  assert.deepEqual([c.stima.livello, c.stima.fonte.giorni], [3, 14], "la giornata viene dal viaggio di 14 giorni");
});

test("Paolo, un viaggio corto poco preparato, poco pronto, 5 giorni e poi arrivare e adattare", () => {
  const caso = CASI_TIPO.paolo();
  const c = catena(caso, caso.vigilia);
  // Lo stub da Strava prende la durata dal carico nascosto del giorno (6.3).
  const stub = c.uscite.find((u) => u.id === caso.stub);
  assert.deepEqual([stub.stub, stub.qualita.secondi, stub.fonteCarico], [true, QUALITA.stimata, "nascosto"]);
  assert.ok(stub.secondi > 0);
  controllaVigilia(caso, c);
  assert.equal(c.r.pilastri.continuita.valore, caso.atteso.buco);
  const p = c.r.proposta;
  assert.deepEqual([p.tipo, p.giorni, p.motivo], [caso.atteso.proposta.tipo, caso.atteso.proposta.giorni, caso.atteso.proposta.motivo]);
  assert.equal(c.r.verdetto.cosa, cosaAllaVigilia(5));
});

test("i casi tipo qualche settimana prima, con il piano e la frase di dove arrivano (2.7, 3.3 e 8.4)", () => {
  for (const [nome, crea] of Object.entries(CASI_TIPO)) {
    const caso = crea();
    for (const atteso of caso.piani) {
      const oggi = piu(caso.partenza, -7 * atteso.settimanePrima);
      const c = catena(caso, oggi, { conPiano: true });
      const dove = `${nome} a ${atteso.settimanePrima} settimane`;
      assert.equal(c.piano.fase, "piano", dove);
      assert.equal(c.piano.schema.nome, atteso.schema, `${dove}, schema`);
      assert.deepEqual(c.piano.avvisi.map((a) => a.tipo), atteso.avvisi, `${dove}, avvisi del piano`);
      assert.equal(c.r.fase, "proiezione", dove);
      assert.equal(c.r.esito, atteso.esito, `${dove}, dove arriva`);
      assert.equal(c.r.proiezione.frase, atteso.frase, `${dove}, la frase`);
      if (atteso.giorni) assert.equal(c.r.proposta.giorni, atteso.giorni, `${dove}, giorni consigliati`);
      for (const t of testiDi(c)) controllaTesto(t, dove);
    }
  }
});

// --- La taratura privata (9.10) ---

test("la taratura privata sui viaggi, solo con COMESTO_TARATURA", async (t) => {
  const { cartellaPrivata, dentroIlRepository, rifai } = await import("../strumenti/taratura.mjs");
  const cartella = cartellaPrivata();
  if (!cartella) {
    t.skip("taratura privata assente");
    return;
  }
  assert.equal(dentroIlRepository(cartella), false, "la cartella privata non sta mai nel repository");
  const { attesi } = rifai(cartella);
  const conta = (stato) => attesi.filter((a) => a.stato === stato).length;
  t.diagnostic(`${attesi.length} attesi, ${conta("torna")} tornano e ${conta("regola")} non tornano per come è scritta una regola`);
  assert.deepEqual(attesi.filter((a) => a.stato === "non torna").map((a) => `${a.caso} ${a.cosa}, esce ${a.esce}`), []);
});
