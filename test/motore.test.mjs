// Prove del motore della pagina (js/motore.js) e del contratto con le pagine, scritto in cima al file.
// Si lanciano con  node --test test/motore.test.mjs
// Le persone sono inventate (Giulia dell'esempio, Lucia, Marco) e i numeri sono costruiti, non presi da nessuno.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  calcola, leggiObiettivo, giorniEventoDi, giorniDelViaggioDi, applicaSpostamento, spostaGiorno, spostaWeekend,
  confrontaAtleta, codaPuoPartire, giroDelTelefono, etaDi,
} from "../js/motore.js";
import { generaDemo } from "../js/demo.js";
import { aggiungiGiorni, giornoSettimana } from "../js/modello.js";
import { leggiInvito } from "../js/dati.js";
import { creaMemoria, CHIAVI } from "../js/memoria.js";
import { CHIAVE, ACCESSO } from "../js/credenziali.js";
import { DOMANDE, MEMORIA } from "../js/parametri.js";

const OGGI = "2026-11-04";   // un mercoledì

// Il telefono e le letture dell'esempio, nella forma che calcola vuole.
function dallEsempio(oggi = OGGI, cambia = {}) {
  const d = generaDemo(oggi);
  return {
    oggi,
    adesso: `${oggi}T08:30`,
    letture: { atleta: d.atleta, benessere: d.benessere, attivita: d.uscite },
    telefono: {
      preferenze: {}, profilo: d.profilo, obiettivo: d.obiettivo, disponibilita: d.disponibilita, piano: null,
      uscite: d.detti, palestra: d.palestra, mattino: d.diario, esiti: d.storia, domenica: d.domenica, invito: null,
      ...cambia,
    },
  };
}

// I campi che il contratto promette alle pagine, sempre presenti.
const CAMPI = [
  "oggi", "adesso", "modello", "esito", "giorno", "attivita", "giorniPuliti", "serie", "fitness", "k", "obiettivo", "stima",
  "prontezza", "piano", "settimana", "seduta", "palestra", "domenica", "carteInPiu", "carteAperte", "messaggi", "invito", "primoAvvio",
  "disponibilita", "daSalvare",
];

function controllaContratto(r, dove) {
  for (const c of CAMPI) assert.ok(Object.hasOwn(r, c), `${dove}, manca ${c}`);
  assert.ok(Array.isArray(r.attivita) && Array.isArray(r.giorniPuliti) && Array.isArray(r.serie), dove);
  assert.ok(Array.isArray(r.carteInPiu) && r.carteInPiu.length <= DOMANDE.carteInPiuConBorse, `${dove}, troppe carte`);
  for (const k of ["comeSto", "intervals", "differenza"]) assert.ok(Object.hasOwn(r.fitness, k), `${dove}, fitness.${k}`);
  for (const k of ["registro", "conto", "oggi", "fase"]) assert.ok(Object.hasOwn(r.palestra, k), `${dove}, palestra.${k}`);
  for (const k of ["controllo", "voce"]) assert.ok(Object.hasOwn(r.domenica, k), `${dove}, domenica.${k}`);
  for (const k of ["soloStrava", "notteNonArriva", "copia", "iphone"]) assert.equal(typeof r.messaggi[k], "boolean", `${dove}, messaggi.${k}`);
  for (const k of ["piano", "esito", "domenica"]) assert.ok(Object.hasOwn(r.daSalvare, k), `${dove}, daSalvare.${k}`);
  for (const k of ["contesto", "viaggio", "evento", "giorniPartenza", "malattia", "cuore", "arrivatoOggi", "proposta", "carte"]) {
    assert.ok(Object.hasOwn(r.giorno, k), `${dove}, giorno.${k}`);
  }
  assert.equal(r.modello.oggi, r.oggi, dove);
  assert.equal(typeof r.esito.livello, "string", dove);
}

// I testi che le pagine mostrano subito, senza i due punti (7.1).
function testiPuliti(r, dove) {
  const testi = [r.esito.titolo, r.esito.consiglio];
  if (r.seduta) testi.push(r.seduta.titolo, r.seduta.come, ...r.seduta.righe);
  if (r.settimana && r.settimana.frase) testi.push(r.settimana.frase);
  if (r.prontezza && r.prontezza.verdetto) testi.push(r.prontezza.verdetto.titolo, r.prontezza.verdetto.perche, r.prontezza.verdetto.cosa);
  if (r.prontezza && r.prontezza.proiezione) testi.push(r.prontezza.proiezione.frase);
  for (const t of testi.filter(Boolean)) {
    assert.equal(typeof t, "string", `${dove}, un testo non è una stringa`);
    assert.ok(!t.includes(":"), `${dove}, due punti in «${t}»`);
    assert.ok(!/undefined|NaN|null/.test(t), `${dove}, valore mancante in «${t}»`);
  }
}

// --- Le persone ---

test("una persona senza dati né scelte arriva al primo avvio, con il semaforo che impara", () => {
  const r = calcola({ oggi: OGGI, letture: { atleta: null, benessere: [], attivita: [] }, telefono: {} });
  controllaContratto(r, "senza dati");
  assert.equal(r.primoAvvio, true);
  assert.equal(r.obiettivo, null);
  assert.equal(r.esito.livello, "nessuno");
  assert.deepEqual([r.stima, r.prontezza, r.piano, r.settimana, r.seduta], [null, null, null, null, null]);
  assert.deepEqual(r.carteInPiu, []);
  assert.equal(r.daSalvare.piano, null);
  assert.equal(r.messaggi.copia, false, "senza piano niente promemoria della copia");
});

test("con «Solo il semaforo del mattino» c'è il semaforo e nient'altro", () => {
  const r = calcola(dallEsempio(OGGI, { obiettivo: { tipo: "semaforo" } }));
  controllaContratto(r, "solo semaforo");
  assert.equal(r.primoAvvio, false);
  assert.equal(r.obiettivo.tipo, "semaforo");
  assert.deepEqual([r.stima, r.prontezza, r.piano, r.seduta], [null, null, null, null]);
  assert.notEqual(r.esito.livello, "nessuno");
  testiPuliti(r, "solo semaforo");
});

test("con un evento ci sono giornata, piano, seduta di oggi e proiezione, e il piano si salva una volta", () => {
  const stato = dallEsempio();
  const r = calcola(stato);
  controllaContratto(r, "evento");
  testiPuliti(r, "evento");
  assert.equal(r.obiettivo.tipo, "evento");
  assert.equal(r.obiettivo.percorsoId, "tt-originale");
  assert.ok(r.stima.H > 0 && r.stima.mezzore.H > 0);
  assert.equal(r.piano.fase, "piano");
  assert.ok(r.settimana && r.settimana.lunedi <= OGGI);
  assert.ok(r.seduta && typeof r.seduta.titolo === "string");
  assert.equal(r.prontezza.fase, "proiezione");
  assert.ok(r.daSalvare.piano, "il piano nuovo va salvato");
  assert.equal(r.daSalvare.piano.motore.rifatto, OGGI);
  assert.equal(r.giorno.giorniPartenza, 70);
  // Con il piano salvato, lo stesso giorno, il piano non si rifà.
  const dopo = calcola({ ...stato, telefono: { ...stato.telefono, piano: r.daSalvare.piano } });
  assert.equal(dopo.daSalvare.piano, null, "lo stesso giorno il piano salvato vale");
  assert.equal(dopo.piano.motore.rifatto, OGGI);
});

test("il piano si rifà il lunedì tenendo lo schema, e da capo quando cambia l'avventura", () => {
  const stato = dallEsempio();
  const primo = calcola(stato).daSalvare.piano;
  // Il lunedì dopo, con la stessa avventura e la stessa partenza, si rifà e tiene lo schema.
  const lunedi = aggiungiGiorni(OGGI, 7 - giornoSettimana(OGGI));
  const d = generaDemo(OGGI);
  const statoLunedi = {
    ...stato, oggi: lunedi, adesso: `${lunedi}T08:30`,
    telefono: { ...stato.telefono, piano: primo, obiettivo: d.obiettivo },
  };
  const lun = calcola(statoLunedi);
  assert.ok(lun.daSalvare.piano, "il lunedì il piano si rifà");
  assert.equal(lun.piano.schema.nome, primo.schema.nome, "lo schema resta quello della nascita");
  assert.equal(lun.piano.motore.obiettivo, primo.motore.obiettivo);
  // Cambiano i giorni dell'evento, e il piano riparte da oggi.
  const altro = calcola({ ...stato, telefono: { ...stato.telefono, piano: primo, obiettivo: { ...d.obiettivo, giorni: 4 } } });
  assert.ok(altro.daSalvare.piano);
  assert.notEqual(altro.piano.motore.obiettivo, primo.motore.obiettivo);
  assert.equal(altro.piano.inizio, aggiungiGiorni(OGGI, -giornoSettimana(OGGI)), "nasce questa settimana");
});

test("con un'avventura propria senza data c'è la settimana tipo e niente verdetto", () => {
  const r = calcola(dallEsempio(OGGI, { obiettivo: { tipo: "libero", libero: "ore", ore: 5 } }));
  controllaContratto(r, "libero");
  testiPuliti(r, "libero");
  assert.equal(r.obiettivo.tipo, "libero");
  assert.equal(r.piano.fase, "libero");
  assert.equal(r.prontezza.fase, "senzaData");
  assert.equal(r.giorno.giorniPartenza, null);
  // L'obiettivo libero di prima, quello che la migrazione fa dalle sfide, si legge uguale.
  const migrato = leggiObiettivo({ tipo: "libero", libero: "giorni", giorni: 3, ore: 7, daSfida: "weekend", partenza: "2027-01-10" });
  assert.deepEqual([migrato.giorni, migrato.partenza, giorniEventoDi(migrato), giorniDelViaggioDi(migrato)], [3, "2027-01-10", MEMORIA.sfide.weekend.giorniEvento, 3]);
  assert.equal(giorniDelViaggioDi(leggiObiettivo({ tipo: "libero", libero: "giorni", giorni: 3, ore: 10, daSfida: "grande" })), null);
});

test("dal link degli iscritti arrivano percorso, giorni e partenza, dopo il cancelletto o con la query", () => {
  const dalCancelletto = leggiInvito("#percorso=tt-originale&giorni=4&partenza=2027-05-20");
  assert.deepEqual(dalCancelletto, { percorso: "tt-originale", giorni: 4, partenza: "2027-05-20", valido: true });
  assert.deepEqual(leggiInvito("?percorso=tt-originale&giorni=4&partenza=2027-05-20"), dalCancelletto);
  const r = calcola(dallEsempio(OGGI, { obiettivo: null, invito: { percorso: "tt-originale", giorni: 4, partenza: "2027-05-20" } }));
  assert.equal(r.primoAvvio, true);
  assert.deepEqual(r.invito, { percorso: "tt-originale", giorni: 4, partenza: "2027-05-20" });
  // Un percorso che il catalogo non conosce non vale, e giorni fuori dal percorso si ignorano.
  assert.equal(calcola(dallEsempio(OGGI, { invito: { percorso: "inventato", giorni: 4 } })).invito, null);
  assert.equal(calcola(dallEsempio(OGGI, { invito: { percorso: "tt-originale", giorni: 40 } })).invito.giorni, null);
  // Iscritto, l'obiettivo dice da dove arriva.
  const iscritto = leggiObiettivo({ tipo: "evento", percorso: "tt-originale", giorni: 4, partenza: "2027-05-20", iscritto: true });
  assert.deepEqual([iscritto.iscritto, iscritto.giorni], [true, 4]);
  assert.equal(leggiObiettivo({ tipo: "evento", percorso: "tt-originale", giorni: 40 }).giorni, 4, "fuori dal percorso, il primo dei giorni tipici");
  assert.equal(leggiObiettivo({ tipo: "evento", percorso: "che-non-esiste" }), null);
});

// --- Esci e l'atleta ---

// Un telefono finto, come in test/memoria.test.mjs.
function memoriaFinta() {
  const dati = new Map();
  return {
    dati,
    get length() { return dati.size; },
    key(i) { return [...dati.keys()][i] ?? null; },
    getItem(k) { return dati.has(k) ? dati.get(k) : null; },
    setItem(k, v) { dati.set(k, String(v)); },
    removeItem(k) { dati.delete(k); },
  };
}

test("Esci toglie consenso, copia dei dati di intervals.icu e coda, e lascia risposte, scelte e impronta", () => {
  const locale = memoriaFinta();
  const memoria = creaMemoria(locale, { adesso: () => Date.UTC(2026, 10, 4) });
  memoria.scrivi(CHIAVI.consenso, { versione: "C0-1.0", data: OGGI });
  memoria.scrivi(CHIAVI.cache, { letto: 1, al: OGGI, benessere: [], uscite: [] });
  memoria.scrivi(CHIAVI.coda, [{ chiave: "attivita:i1", tipo: "attivita" }]);
  memoria.scrivi(CHIAVI.mattino, { [OGGI]: { stoMale: ["naso"] } });
  memoria.scrivi(CHIAVI.obiettivo, { tipo: "semaforo" });
  memoria.scrivi(CHIAVI.atleta, { impronta: "abc", dal: OGGI });
  locale.setItem(CHIAVE, "chiave-di-prova-123");
  const tolte = memoria.esci();
  assert.deepEqual(tolte.sort(), [CHIAVI.cache, CHIAVI.coda, CHIAVI.consenso].sort());
  for (const k of [CHIAVI.mattino, CHIAVI.obiettivo, CHIAVI.atleta]) assert.notEqual(locale.getItem(k), null, k);
  assert.equal(locale.getItem(CHIAVE), "chiave-di-prova-123", "il modo di entrare lo toglie js/credenziali.js");
});

test("con un altro atleta la coda non parte, e cancellare i suoi dati tiene il modo di entrare e il consenso", () => {
  assert.equal(confrontaAtleta(null, "aaa"), "nuovo");
  assert.equal(confrontaAtleta({ impronta: "aaa" }, "aaa"), "uguale");
  assert.equal(confrontaAtleta({ impronta: "aaa" }, "bbb"), "diverso");
  assert.equal(confrontaAtleta({ impronta: "aaa" }, null), "ignoto");
  // La coda parte solo con le scritture accese e lo stesso atleta, mai nell'esempio o con l'altra persona.
  const base = { attive: true, impronta: "aaa", salvata: { impronta: "aaa" } };
  assert.equal(codaPuoPartire(base), true);
  assert.equal(codaPuoPartire({ ...base, attive: false }), false, "spenta in js/config.js");
  assert.equal(codaPuoPartire({ ...base, impronta: "bbb" }), false, "le scritture di Lucia non partono con l'account di Marco");
  assert.equal(codaPuoPartire({ ...base, salvata: null }), false, "un telefono non ancora legato non manda niente");
  assert.equal(codaPuoPartire({ ...base, demo: true }), false);
  assert.equal(codaPuoPartire({ ...base, atletaDiverso: true }), false);

  const locale = memoriaFinta();
  const memoria = creaMemoria(locale, { adesso: () => Date.UTC(2026, 10, 4) });
  memoria.scrivi(CHIAVI.consenso, { versione: "C0-1.0", data: OGGI });
  memoria.scrivi(CHIAVI.mattino, { [OGGI]: { stoMale: ["febbre"] } });
  memoria.scrivi(CHIAVI.coda, [{ chiave: "attivita:i1", tipo: "attivita" }]);
  memoria.scrivi(CHIAVI.atleta, { impronta: "aaa", dal: OGGI });
  locale.setItem(CHIAVE, "chiave-di-marco-456");
  locale.setItem(`${CHIAVI.profilo}.guasto`, "{rotto");
  memoria.cancellaDati();
  assert.deepEqual([...locale.dati.keys()].sort(), [CHIAVE, CHIAVI.consenso].sort());
  assert.equal(locale.getItem(ACCESSO), null);
});

// --- Le carte, gli spostamenti e il telefono ---

test("le carte in più seguono l'ordine e il tetto di 6.4, e una risposta le chiude", () => {
  const stato = dallEsempio();
  const r = calcola(stato);
  assert.ok(r.carteInPiu.length >= 1, "l'esempio ha la lunga di sabato senza le borse");
  assert.equal(r.carteInPiu[0].tipo, "lunga");
  assert.equal(r.carteInPiu[0].borse, true);
  assert.ok(r.carteInPiu[0].attivita && r.carteInPiu[0].attivita.id);
  const conBorse = r.carteInPiu.some((c) => c.borse);
  assert.ok(r.carteInPiu.length <= (conBorse ? DOMANDE.carteInPiuConBorse : DOMANDE.carteInPiu));
  // Tutte le domande aperte, per Numeri, cominciano con quelle di questa apertura.
  assert.ok(r.carteAperte.length >= r.carteInPiu.length);
  assert.deepEqual(r.carteAperte.slice(0, r.carteInPiu.length).map((c) => c.chiave), r.carteInPiu.map((c) => c.chiave));
  // Le carte di questa apertura restano quelle, anche se intanto ne arriva un'altra.
  const fisse = calcola({ ...stato, ui: { carteMostrate: [r.carteInPiu[0].chiave] } });
  assert.deepEqual(fisse.carteInPiu.map((c) => c.chiave), [r.carteInPiu[0].chiave]);
  // Una risposta, anche «Non lo so», chiude la carta.
  const id = r.carteInPiu[0].attivita.id;
  const uscite = { ...stato.telefono.uscite, [id]: { giorno: r.carteInPiu[0].giorno, carte: { lunga: "nonSo" } } };
  const dopo = calcola({ ...stato, telefono: { ...stato.telefono, uscite } });
  assert.ok(!dopo.carteInPiu.some((c) => c.chiave === r.carteInPiu[0].chiave));
});

test("«Oggi non posso» sposta la seduta senza toccare il piano di prima, e il weekend si sposta tutto", () => {
  const r = calcola(dallEsempio());
  const piano = r.piano;
  const prima = JSON.stringify(piano);
  // Il primo giorno della settimana con una seduta in bici, da oggi in poi.
  const giorno = r.settimana.giorni.find((g) => g.giorno >= OGGI && g.sedute.some((x) => !["riposo", "palestra", "tronco"].includes(x.tipo)));
  assert.ok(giorno, "l'esempio ha una seduta in bici questa settimana");
  const fatto = spostaGiorno(piano, giorno.giorno, { oggi: OGGI, livello: "verde" });
  assert.ok(fatto && fatto.spostamento && fatto.seduta);
  assert.equal(JSON.stringify(piano), prima, "il piano di prima non cambia");
  const riga = fatto.piano.spostamenti.at(-1);
  assert.deepEqual([riga.data, riga.da, riga.motivo, riga.tipo], [OGGI, giorno.giorno, "nonPosso", fatto.seduta.tipo]);
  const dopo = fatto.piano.giorni.find((g) => g.giorno === giorno.giorno);
  assert.ok(!dopo.sedute.some((x) => x.tipo === fatto.seduta.tipo && x.minuti === fatto.seduta.minuti) || fatto.spostamento.esito === "salta");
  if (fatto.spostamento.esito === "sposta") {
    const verso = fatto.piano.giorni.find((g) => g.giorno === fatto.spostamento.giorno);
    if (verso) assert.ok(verso.sedute.some((x) => x.tipo === fatto.seduta.tipo), "la seduta è nel giorno nuovo");
  }
  // Un giorno senza niente da spostare non cambia niente.
  assert.equal(spostaGiorno(piano, "2020-01-01", { oggi: OGGI }), null);
  // applicaSpostamento con una seduta che salta la toglie e la segna come non possibile.
  const salta = applicaSpostamento(piano, { esito: "salta", giorno: null, giorni: [], palestra: [] }, fatto.seduta, { oggi: OGGI });
  assert.equal(salta.spostamenti.at(-1).a, null);
  const w = spostaWeekend(piano, OGGI);
  if (w) assert.ok(["sposta", "salta"].includes(w.spostamento.esito));
});

test("un giro aggiunto a mano e la palestra segnata nell'app contano nelle attività finché intervals.icu non li ha", () => {
  const stato = dallEsempio();
  const giro = giroDelTelefono({ tipo: "Ride", giorno: aggiungiGiorni(OGGI, -1), ora: "17.30", minuti: 75, sforzo: 5, borse: "no" }, "abc123");
  assert.equal(giro.id, "comesto-u-abc123");
  assert.equal(giro.voce.grezza.start_date_local, `${aggiungiGiorni(OGGI, -1)}T17:30:00`);
  assert.equal(giroDelTelefono({ giorno: OGGI, minuti: 0 }, "x"), null, "senza durata niente giro");
  const con = calcola({ ...stato, telefono: { ...stato.telefono, uscite: { ...stato.telefono.uscite, [giro.id]: giro.voce } } });
  const trovato = con.attivita.find((a) => a.id === giro.id);
  assert.ok(trovato && trovato.daComeSto && trovato.secondi === 75 * 60);
  assert.equal(trovato.sforzo, 5);
  // Quando intervals.icu ha un'attività con lo stesso external_id vale quella.
  const letta = { id: "i999", start_date_local: `${aggiungiGiorni(OGGI, -1)}T17:30:00`, type: "Ride", moving_time: 75 * 60, source: "MANUAL", external_id: giro.id };
  const doppia = calcola({
    ...stato,
    letture: { ...stato.letture, attivita: [...stato.letture.attivita, letta] },
    telefono: { ...stato.telefono, uscite: { ...stato.telefono.uscite, [giro.id]: giro.voce } },
  });
  assert.equal(doppia.attivita.filter((a) => a.externalId === giro.id).length, 1);
  // La palestra segnata nell'app senza orologio è un'attività con l'external_id comesto-p-.
  const palestra = con.attivita.filter((a) => a.externalId && a.externalId.startsWith("comesto-p-"));
  assert.ok(palestra.length >= 1, "le sedute dell'esempio segnate nell'app");
  assert.ok(con.palestra.registro.length >= 2);
});

test("il peso del profilo di intervals.icu non cambia mai la giornata, l'età conta solo dalla fascia", () => {
  const stato = dallEsempio();
  const senza = calcola(stato);
  const conPeso = calcola({ ...stato, letture: { ...stato.letture, atleta: { ...stato.letture.atleta, weight: 52, icu_weight: 52 } } });
  assert.equal(conPeso.stima.H, senza.stima.H);
  assert.equal(etaDi({}), 45);
  assert.equal(etaDi({ fasciaEta: "55-59" }), 57.5);
});

test("l'esempio per 180 giorni di fila, senza errori e con tutti i campi del contratto", () => {
  let piano = null;
  let giorni = 0;
  for (let i = 0; i < 180; i++) {
    const oggi = aggiungiGiorni("2026-11-01", i);
    const stato = dallEsempio(oggi, { piano });
    const r = calcola(stato);
    controllaContratto(r, oggi);
    testiPuliti(r, oggi);
    assert.ok(r.daSalvare.esito && typeof r.daSalvare.esito.livello === "string", `${oggi}, l'esito del giorno da salvare`);
    assert.ok(r.piano && r.stima && r.prontezza, `${oggi}, piano, giornata e Pronto?`);
    if (r.daSalvare.piano) piano = r.daSalvare.piano;
    else piano = r.piano;
    giorni += 1;
  }
  assert.equal(giorni, 180);
});
