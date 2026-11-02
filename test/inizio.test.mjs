// Le prove del primo avvio (7.3), la parte pura di js/viste/inizio.js. Si lancia con
// node --test test/inizio.test.mjs
// Le risposte del primo avvio passano anche dal motore vero, così il riepilogo ha la sua giornata.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  eventiAperti, giriLeggibili, invitoInSospeso, bozzaIniziale, scegli, passiDi, serveCuore, ripristina, controlla, risposte, partenzeDi,
  vistaInizio,
} from "../js/viste/inizio.js";
import { CATALOGO, trovaPercorso } from "../js/catalogo.js";
import { DOMANDE, PIANO, STIMA } from "../js/parametri.js";
import { leggiObiettivo, calcola, senzaSfida } from "../js/motore.js";
import { SCELTA, RIEPILOGO, AVVENTURA } from "../js/testi-inizio.js";

const OGGI = "2026-11-01";

// Le risposte che ogni schermata chiede, come le conta 7.3. La schermata dei giorni ne ha tre, giorni,
// partenza e viaggi già fatti.
const RISPOSTE_PER_SCHERMATA = { scelta: 1, giorni: 3, settimana: 1, tempo: 1, giri: 2, palestra: 1, eta: 1 };
const conta = (passi) => passi.reduce((t, p) => t + RISPOSTE_PER_SCHERMATA[p], 0);

const giro = (giorno, campi = {}) => ({
  id: `i${giorno}`, giorno, inizio: `${giorno}T09:00`, tipo: "Ride", secondi: 7200, metri: 50000, dislivello: 600,
  stub: false, manuale: false, daComeSto: false, qualita: { secondi: "vera" }, ...campi,
});

function ctxDi(campi = {}) {
  return { oggi: OGGI, obiettivo: null, profilo: {}, disponibilita: null, invito: null, attivita: [], primoAvvio: true, ...campi };
}

// Il telefono che il motore legge, con le risposte del primo avvio.
const telefonoDi = (r) => ({
  preferenze: {}, profilo: r.profilo, obiettivo: r.obiettivo, disponibilita: r.disponibilita, piano: null, uscite: {}, palestra: {}, mattino: {}, esiti: {},
  domenica: {}, invito: null,
});
const vuote = { atleta: null, benessere: [], attivita: [] };

// Un DOM finto, quanto basta a js/dom.js per disegnare la pagina in node. Le schermate si guardano per id.
class Nodo {
  constructor(tipo, nome = null) {
    this.nodeType = tipo;
    this.nodeName = nome;
    this.childNodes = [];
    this.attributi = new Map();
    this.dataset = {};
    this.dato = "";
  }

  append(...figli) {
    for (const f of figli) this.childNodes.push(f instanceof Nodo ? f : testoFinto(String(f)));
  }

  replaceChildren(...figli) {
    this.childNodes = [];
    this.append(...figli);
  }

  setAttribute(k, v) { this.attributi.set(k, String(v)); }

  getAttribute(k) { return this.attributi.has(k) ? this.attributi.get(k) : null; }

  addEventListener() {}

  get textContent() { return this.nodeType === 3 ? this.dato : this.childNodes.map((c) => c.textContent).join(""); }
}

function testoFinto(t) {
  const n = new Nodo(3, "#text");
  n.dato = t;
  return n;
}

const elementi = (nodo, lista = []) => {
  if (nodo.nodeType !== 1) return lista;
  lista.push(nodo);
  for (const c of nodo.childNodes) elementi(c, lista);
  return lista;
};
const perId = (radice, id) => elementi(radice).find((e) => e.getAttribute("id") === id) || null;

function disegna(ctx) {
  globalThis.Node = Nodo;
  globalThis.document = {
    createElement: (nome) => new Nodo(1, nome.toLowerCase()),
    createElementNS: (_, nome) => new Nodo(1, nome),
    createTextNode: testoFinto,
    getElementById: () => null,
  };
  return vistaInizio({ ui: {}, demo: false, azioni: {}, stima: null, prontezza: null, ...ctx });
}

test("gli eventi aperti sono quelli con una partenza da oggi in poi, raggruppati come nel catalogo", () => {
  const gruppi = eventiAperti(OGGI);
  assert.equal(gruppi.reduce((t, g) => t + g.percorsi.length, 0), CATALOGO.length);
  assert.deepEqual(gruppi.map((g) => g.evento), [...new Set(CATALOGO.map((p) => p.evento))]);
  assert.deepEqual(gruppi[0].percorsi.map((p) => p.id), CATALOGO.filter((p) => p.evento === gruppi[0].evento).map((p) => p.id));
  // Dopo la finestra del Tuscany Trail i suoi percorsi non si propongono più.
  const dopo = eventiAperti("2027-05-22");
  assert.ok(!dopo.some((g) => g.eventoId === "tt"), "il Tuscany Trail è finito");
  assert.ok(dopo.some((g) => g.eventoId === "tg"));
  assert.deepEqual(eventiAperti("2030-01-01"), []);
});

test("le partenze proposte sono le future, più quella già scelta se è da oggi in poi", () => {
  const tt = trovaPercorso("tt-originale");
  assert.deepEqual(partenzeDi(tt, OGGI), ["2027-05-19", "2027-05-20", "2027-05-21"]);
  assert.deepEqual(partenzeDi(tt, OGGI, "2027-01-10"), ["2027-01-10", "2027-05-19", "2027-05-20", "2027-05-21"]);
  assert.deepEqual(partenzeDi(tt, OGGI, "2026-10-01"), ["2027-05-19", "2027-05-20", "2027-05-21"], "una data passata non torna");
  assert.deepEqual(partenzeDi(tt, "2027-05-20"), ["2027-05-20", "2027-05-21"]);
});

test("i giri leggibili sono quelli in bici con la durata del dispositivo", () => {
  assert.equal(giriLeggibili([]), false);
  assert.equal(giriLeggibili(undefined), false);
  assert.equal(giriLeggibili([giro("2026-10-20")]), true);
  assert.equal(giriLeggibili([giro("2026-10-20", { tipo: "VirtualRide" })]), true, "anche i rulli contano per le ore");
  assert.equal(giriLeggibili([giro("2026-10-20", { stub: true, secondi: null })]), false, "uno stub da Strava no");
  assert.equal(giriLeggibili([giro("2026-10-20", { manuale: true })]), false, "un giro a mano no");
  assert.equal(giriLeggibili([giro("2026-10-20", { qualita: { secondi: "detta da te" } })]), false, "una durata detta no");
  assert.equal(giriLeggibili([giro("2026-10-20", { tipo: "EBikeRide" })]), false, "l'e-bike no");
  assert.equal(giriLeggibili([giro("2026-10-20", { tipo: "WeightTraining" })]), false, "la palestra no");
});

test("al primo avvio le risposte già scelte sono quelle di 7.3", () => {
  const b = bozzaIniziale(ctxDi());
  assert.equal(b.passo, "scelta");
  assert.equal(b.scelta, null, "la prima schermata non ha una risposta già scelta");
  assert.deepEqual(b.giorniBici, [1, 3, 5, 6], "martedì, giovedì, sabato e domenica");
  assert.equal(b.stella, 5, "la stella sul sabato");
  assert.equal(b.ore, 6);
  assert.equal(b.esperienza, false, "Non ancora");
  assert.equal(b.palestra, "no");
  assert.equal(b.fasciaEta, "40-49");
  assert.equal(b.media, null, "Non lo so");
  assert.equal(b.fasciaOre, 1, "2-4 ore");
  assert.equal(b.chiediGiri, true, "senza giri registrati le due domande in più");
  assert.equal(bozzaIniziale(ctxDi({ attivita: [giro("2026-10-20")] })).chiediGiri, false);
});

test("le schermate e le risposte sono quelle contate da 7.3 e da DOMANDE", () => {
  const b = bozzaIniziale(ctxDi());
  scegli(b, "tt-originale", OGGI);
  assert.deepEqual(passiDi(b), ["scelta", "giorni", "settimana", "tempo", "giri", "palestra", "eta"]);
  assert.equal(conta(passiDi(b)), DOMANDE.primoAvvioSenzaGiri);
  const conGiri = bozzaIniziale(ctxDi({ attivita: [giro("2026-10-20")] }));
  scegli(conGiri, "tt-originale", OGGI);
  assert.equal(passiDi(conGiri).length, 6, "sei schermate");
  assert.equal(conta(passiDi(conGiri)), DOMANDE.primoAvvio);
  scegli(conGiri, "semaforo", OGGI);
  assert.deepEqual(passiDi(conGiri), ["scelta", "eta"]);
  assert.equal(conta(passiDi(conGiri)), DOMANDE.soloSemaforo);
  scegli(conGiri, "libero", OGGI);
  assert.equal(conta(passiDi(conGiri)), DOMANDE.primoAvvio);
});

test("dal link degli iscritti la scelta dell'evento si salta, e l'obiettivo è da iscritto", () => {
  const invito = { percorso: "tt-originale", giorni: 4, partenza: "2027-05-20" };
  const ctx = ctxDi({ invito, attivita: [giro("2026-10-20")] });
  const b = bozzaIniziale(ctx);
  assert.equal(b.passo, "giorni");
  assert.equal(b.dalInvito, true);
  assert.equal(b.scelta, "tt-originale");
  assert.equal(b.giorni, 4);
  assert.equal(b.partenza, "2027-05-20");
  assert.equal(passiDi(b)[0], "giorni");
  assert.equal(passiDi(b).length, 5);
  const r = risposte(b, ctx);
  assert.deepEqual(r.obiettivo, { tipo: "evento", percorso: "tt-originale", giorni: 4, partenza: "2027-05-20", iscritto: true });
  // Chi cambia evento non è iscritto a quello che sceglie, e lo è di nuovo se torna all'evento del link.
  b.dalInvito = false;
  scegli(b, "tg-medio", OGGI);
  assert.equal(risposte(b, ctx).obiettivo.iscritto, false);
  scegli(b, "tt-originale", OGGI);
  assert.equal(risposte(b, ctx).obiettivo.iscritto, true);
  // Senza giorni nel link valgono i giorni tipici.
  const senzaGiorni = bozzaIniziale(ctxDi({ invito: { percorso: "tt-originale", giorni: null, partenza: null } }));
  assert.equal(senzaGiorni.giorni, 4);
  assert.equal(senzaGiorni.partenza, "2027-05-19");
});

test("l'invito in sospeso sparisce quando l'evento del link è già l'obiettivo", () => {
  const invito = { percorso: "tt-originale", giorni: 4, partenza: "2027-05-20" };
  assert.equal(invitoInSospeso(ctxDi({ invito })), invito);
  const ob = leggiObiettivo({ tipo: "evento", percorso: "tt-originale", giorni: 4, partenza: "2027-05-20", iscritto: true });
  assert.equal(invitoInSospeso(ctxDi({ invito, obiettivo: ob })), null);
  const altro = leggiObiettivo({ tipo: "evento", percorso: "tg-medio", giorni: 4, partenza: "2027-09-23", iscritto: false });
  assert.equal(invitoInSospeso(ctxDi({ invito, obiettivo: altro })), invito);
  assert.equal(invitoInSospeso(ctxDi({ invito, oggi: "2027-06-01" })), null, "un evento già passato non si propone");
  assert.equal(invitoInSospeso(ctxDi({ invito: { percorso: "inventato" } })), null);
});

test("con un'avventura già scelta le risposte già scelte sono le sue", () => {
  const ob = leggiObiettivo({ tipo: "evento", percorso: "tg-medio", giorni: 4, partenza: "2027-09-24" });
  const profilo = { esperienza: 3, palestra: "mai", palestraSicurezza: "no", altriSport: true, fasciaEta: "50-54", mediaDichiarata: 22.5, fasciaOre: 3 };
  const disponibilita = { giorni: [0, 2, 5], stella: 2, ore: 10, tetti: [null, null, null, null, null, null, null], dueCose: true };
  const b = bozzaIniziale(ctxDi({ obiettivo: ob, profilo, disponibilita, primoAvvio: false }));
  assert.equal(b.passo, "scelta");
  assert.equal(b.scelta, "tg-medio");
  assert.equal(b.giorni, 4);
  assert.equal(b.partenza, "2027-09-24");
  assert.equal(b.esperienza, 3);
  assert.equal(b.palestra, "mai");
  assert.equal(b.sicurezza, "no");
  assert.equal(b.altriSport, true);
  assert.equal(b.fasciaEta, "50-54");
  assert.equal(b.media, 2);
  assert.equal(b.fasciaOre, 3);
  assert.deepEqual(b.giorniBici, [0, 2, 5]);
  assert.equal(b.stella, 2);
  assert.equal(b.ore, 10);
  const libero = leggiObiettivo({ tipo: "libero", libero: "giorni", giorni: 3, ore: 6, partenza: "2027-04-10" });
  const l = bozzaIniziale(ctxDi({ obiettivo: libero, primoAvvio: false }));
  assert.equal(l.scelta, "libero");
  assert.equal(l.libero.tipo, "giorni");
  assert.equal(l.libero.giorni, 3);
  assert.equal(l.libero.oreGiorno, 6);
  assert.equal(l.data, "2027-04-10");
  assert.equal(bozzaIniziale(ctxDi({ disponibilita: { ore: 7 } })).ore, 6, "un tempo fuori dalle scelte va alla scelta sotto");
});

test("un evento nuovo prende i suoi giorni tipici, quello di prima i giorni salvati", () => {
  const ob = leggiObiettivo({ tipo: "evento", percorso: "tt-originale", giorni: 6, partenza: "2027-05-21" });
  const b = bozzaIniziale(ctxDi({ obiettivo: ob, primoAvvio: false }));
  scegli(b, "nc4k-berlino", OGGI);
  assert.equal(b.giorni, 11, "il primo dei giorni tipici");
  assert.equal(b.partenza, "2027-07-29");
  scegli(b, "tt-originale", OGGI);
  assert.equal(b.giorni, 6);
  assert.equal(b.partenza, "2027-05-21");
  b.giorni = 3;
  ripristina(b, "giorni");
  assert.equal(b.giorni, 6, "Salta tiene la risposta già scelta");
});

test("Salta tiene le risposte già scelte della schermata", () => {
  const b = bozzaIniziale(ctxDi());
  b.ore = 12;
  b.giorniBici = [0];
  b.stella = 0;
  b.palestra = "casa";
  b.fasciaEta = "60+";
  ripristina(b, "tempo");
  assert.equal(b.ore, 6);
  assert.deepEqual(b.giorniBici, [0], "le altre schermate non cambiano");
  ripristina(b, "settimana");
  assert.deepEqual(b.giorniBici, [1, 3, 5, 6]);
  assert.equal(b.stella, 5);
  ripristina(b, "palestra");
  assert.equal(b.palestra, "no");
  ripristina(b, "eta");
  assert.equal(b.fasciaEta, "40-49");
});

test("«Prima di cominciare» da 40 anni, una volta sola", () => {
  const b = bozzaIniziale(ctxDi());
  assert.equal(serveCuore(b, {}), true);
  b.fasciaEta = "sotto40";
  assert.equal(serveCuore(b, {}), false);
  b.fasciaEta = "60+";
  assert.equal(serveCuore(b, { primaDiCominciare: "2026-10-01" }), false);
});

test("i controlli prima di Avanti", () => {
  const b = bozzaIniziale(ctxDi());
  assert.equal(controlla(b, "scelta", OGGI).campo, "inizio-scelta-0");
  scegli(b, "libero", OGGI);
  assert.equal(controlla(b, "scelta", OGGI), null);
  assert.equal(controlla(b, "giorni", OGGI), null, "il giro lungo a ore è già scelto");
  b.libero.tipo = "giro";
  assert.equal(controlla(b, "giorni", OGGI).campo, "inizio-km");
  b.libero.km = 0;
  assert.equal(controlla(b, "giorni", OGGI).campo, "inizio-km");
  b.libero.km = 120;
  assert.equal(controlla(b, "giorni", OGGI), null, "i metri si possono lasciare vuoti");
  b.libero.metri = Number.NaN;
  assert.equal(controlla(b, "giorni", OGGI).campo, "inizio-metri");
  b.libero.metri = 1500;
  b.data = "2026-10-31";
  assert.equal(controlla(b, "giorni", OGGI).campo, "inizio-data");
  b.data = OGGI;
  assert.equal(controlla(b, "giorni", OGGI), null);
  b.giorniBici = [];
  assert.equal(controlla(b, "settimana", OGGI).campo, "inizio-giorno-0");
});

test("le risposte hanno la forma che il motore legge", () => {
  const ctx = ctxDi({ disponibilita: { giorni: [1, 3, 5, 6], stella: 5, ore: 6, tetti: [0, null, 60, null, null, null, 0], dueCose: true } });
  const b = bozzaIniziale(ctx);
  scegli(b, "tt-originale", OGGI);
  b.giorniBici = [6, 0, 3];
  b.stella = 5;
  b.media = 1;
  b.fasciaOre = 2;
  b.palestra = "mai";
  b.sicurezza = "si";
  const r = risposte(b, ctx);
  assert.deepEqual(r.obiettivo, { tipo: "evento", percorso: "tt-originale", giorni: 4, partenza: "2027-05-19", iscritto: false });
  assert.deepEqual(r.disponibilita.giorni, [0, 3, 6]);
  assert.equal(r.disponibilita.stella, 6, "la stella va su un giorno in bici");
  assert.deepEqual(r.disponibilita.tetti, [null, null, 60, null, null, null, null], "il niente di un giorno di nuovo in bici si toglie, gli altri tetti restano");
  assert.equal(r.disponibilita.dueCose, true);
  assert.deepEqual(r.profilo, {
    fasciaEta: "40-49", esperienza: false, palestra: "mai", palestraSicurezza: "si", altriSport: false,
    mediaDichiarata: STIMA.mediaDichiarata.centri[1], fasciaOre: 2,
  });
  const ob = leggiObiettivo(r.obiettivo);
  assert.equal(ob.percorsoId, "tt-originale");
  assert.equal(ob.giorni, 4);
  assert.equal(ob.partenza, "2027-05-19");
  // «Non lo so» toglie la media, e chi ha giri registrati non manda né media né ore.
  b.media = null;
  assert.equal(risposte(b, ctx).profilo.mediaDichiarata, null);
  b.chiediGiri = false;
  assert.ok(!("mediaDichiarata" in risposte(b, ctx).profilo));
  assert.ok(!("fasciaOre" in risposte(b, ctx).profilo));
  // Senza palestra non si mandano sicurezza e altri sport.
  b.palestra = "no";
  assert.ok(!("palestraSicurezza" in risposte(b, ctx).profilo));
  assert.ok(!("altriSport" in risposte(b, ctx).profilo));
  // Il solo semaforo manda l'obiettivo e l'età.
  scegli(b, "semaforo", OGGI);
  assert.deepEqual(risposte(b, ctx), { obiettivo: { tipo: "semaforo" }, disponibilita: null, profilo: { fasciaEta: "40-49" } });
});

test("le tre avventure proprie tornano dal motore come sono state scelte", () => {
  const b = bozzaIniziale(ctxDi());
  scegli(b, "libero", OGGI);
  const ore = leggiObiettivo(risposte(b, ctxDi()).obiettivo);
  assert.equal(ore.tipo, "libero");
  assert.deepEqual(ore.libero, { tipo: "ore", ore: 4 });
  assert.equal(ore.partenza, null);
  b.libero.tipo = "giro";
  b.libero.km = 120;
  b.libero.metri = null;
  b.libero.fondo = "gravel";
  b.libero.conBorse = true;
  b.data = "2027-04-10";
  const g = leggiObiettivo(risposte(b, ctxDi()).obiettivo);
  assert.deepEqual(g.libero, { tipo: "giro", km: 120, metri: 0, fondo: "gravel", conBorse: true });
  assert.equal(g.partenza, "2027-04-10");
  b.libero.tipo = "giorni";
  b.libero.giorni = 3;
  b.libero.oreGiorno = 6;
  const f = leggiObiettivo(risposte(b, ctxDi()).obiettivo);
  assert.deepEqual(f.libero, { tipo: "giorni", giorni: 3, ore: 6 });
  assert.equal(f.giorni, 3);
});

test("dopo il primo avvio il motore ha la giornata e dove arrivi, per il riepilogo", () => {
  const ctx = ctxDi();
  const b = bozzaIniziale(ctx);
  scegli(b, "tt-originale", OGGI);
  const r = risposte(b, ctx);
  const stato = calcola({
    oggi: OGGI, adesso: `${OGGI}T09:00`, letture: { atleta: null, benessere: [], attivita: [] },
    telefono: { preferenze: {}, profilo: r.profilo, obiettivo: r.obiettivo, disponibilita: r.disponibilita, piano: null, uscite: {}, palestra: {}, mattino: {}, esiti: {}, domenica: {}, invito: null },
  });
  assert.equal(stato.primoAvvio, false);
  assert.equal(stato.obiettivo.percorsoId, "tt-originale");
  assert.ok(stato.stima && stato.stima.H > 0, "la giornata c'è");
  assert.ok(stato.prontezza, "Pronto? c'è");
  assert.equal(stato.disponibilita.ore, PIANO.disponibilita.orePredefinite);
});

// --- chi arriva dalla versione di prima, con l'obiettivo fatto dalla sfida ---

const DI_PRIMA = { tipo: "libero", libero: "giorni", giorni: 3, ore: 8, daSfida: "settimana", partenza: "2027-01-10" };

test("chi arriva dalla versione di prima riparte dalle domande, con la prima schermata da scegliere", () => {
  const prima = calcola({ oggi: OGGI, adesso: `${OGGI}T09:00`, letture: vuote, telefono: telefonoDi({ profilo: {}, obiettivo: DI_PRIMA, disponibilita: null }) });
  assert.equal(prima.primoAvvio, true, "per il motore è un primo avvio");
  const ctx = ctxDi({ obiettivo: prima.obiettivo, primoAvvio: prima.primoAvvio });
  const b = bozzaIniziale(ctx);
  assert.equal(b.passo, "scelta");
  assert.equal(b.scelta, null, "l'obiettivo di prima non è una scelta");
  assert.equal(controlla(b, "scelta", OGGI).campo, "inizio-scelta-0");
  // Le sue ore e la sua data restano già scelte, se la persona sceglie un'avventura propria.
  scegli(b, "libero", OGGI);
  assert.deepEqual([b.libero.tipo, b.libero.giorni, b.libero.oreGiorno, b.libero.borseGiorni, b.data], ["giorni", 3, 8, true, "2027-01-10"]);
  // Dopo le risposte l'obiettivo non porta la sfida, e il primo avvio finisce.
  scegli(b, "tt-originale", OGGI);
  const r = risposte(b, ctx);
  assert.ok(!("daSfida" in r.obiettivo));
  const dopo = calcola({ oggi: OGGI, adesso: `${OGGI}T09:00`, letture: vuote, telefono: telefonoDi({ ...r, obiettivo: senzaSfida(r.obiettivo) }) });
  assert.equal(dopo.primoAvvio, false);
  assert.equal(dopo.obiettivo.percorsoId, "tt-originale");
});

test("#inizio con l'obiettivo di prima mostra le domande, senza «Lascia com'è» e senza la copia di un telefono nuovo", () => {
  const ob = leggiObiettivo(DI_PRIMA);
  const ctx = ctxDi({ obiettivo: ob, primoAvvio: true, ui: {} });
  const vista = disegna(ctx);
  assert.equal(elementi(vista).find((e) => e.nodeName === "h1").textContent, SCELTA.titolo);
  assert.equal(ctx.ui.inizio.passo, "scelta");
  assert.equal(perId(vista, "inizio-lascia"), null);
  assert.equal(perId(vista, "inizio-copia"), null);
  // Senza nessun obiettivo, su un telefono nuovo, la copia c'è.
  assert.ok(perId(disegna(ctxDi()), "inizio-copia"));
  // Con un'avventura scelta con le domande la pagina è il riepilogo, con «Cambia la tua avventura».
  const scelta = leggiObiettivo(senzaSfida(DI_PRIMA));
  const riepilogo = disegna(ctxDi({ obiettivo: scelta, primoAvvio: false }));
  assert.equal(elementi(riepilogo).find((e) => e.nodeName === "h1").textContent, RIEPILOGO.titolo);
  assert.equal(perId(riepilogo, "inizio-cambia").textContent, RIEPILOGO.cambia);
});

// --- «Più giorni di fila», da 2 a 14 giorni, a ore o con km e salita ---

test("«Più giorni di fila» chiede da 2 a 14 giorni, ogni giorno a ore o con km e salita, e le borse", () => {
  const b = bozzaIniziale(ctxDi());
  scegli(b, "libero", OGGI);
  b.libero.tipo = "giorni";
  assert.deepEqual([b.libero.giorni, b.libero.misura, b.libero.borseGiorni], [2, "ore", true], "già scelti, con le borse come prima");
  b.libero.giorni = 5;
  b.libero.misura = "km";
  assert.equal(controlla(b, "giorni", OGGI).campo, "inizio-km-giorno");
  b.libero.kmGiorno = 100;
  assert.equal(controlla(b, "giorni", OGGI), null, "i metri si possono lasciare vuoti");
  b.libero.metriGiorno = Number.NaN;
  assert.equal(controlla(b, "giorni", OGGI).campo, "inizio-metri-giorno");
  b.libero.metriGiorno = 2000;
  b.libero.borseGiorni = false;
  const r = risposte(b, ctxDi());
  assert.deepEqual(r.obiettivo, { tipo: "libero", libero: "giorni", giorni: 5, misura: "km", km: 100, metri: 2000, fondo: "strada", conBorse: false, partenza: null });
  const ob = leggiObiettivo(r.obiettivo);
  assert.deepEqual(ob.libero, { tipo: "giorni", giorni: 5, misura: "km", km: 100, metri: 2000, fondo: "strada", conBorse: false });
  // Ripresa come risposta già scelta, la bozza torna uguale.
  const di = bozzaIniziale(ctxDi({ obiettivo: ob, primoAvvio: false }));
  assert.deepEqual(
    [di.scelta, di.libero.tipo, di.libero.giorni, di.libero.misura, di.libero.kmGiorno, di.libero.metriGiorno, di.libero.fondoGiorni, di.libero.borseGiorni],
    ["libero", "giorni", 5, "km", 100, 2000, "strada", false]);
  // A ore resta la forma di prima, fino a 14 giorni.
  Object.assign(b.libero, { misura: "ore", giorni: 14, oreGiorno: 6, borseGiorni: true });
  assert.deepEqual(leggiObiettivo(risposte(b, ctxDi()).obiettivo).libero, { tipo: "giorni", giorni: 14, ore: 6 });
  assert.deepEqual(STIMA.obiettivoLibero.giorniDiFila, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
});

test("il caso di prova, cinque giorni da 100 km e 2.000 m su strada senza borse, ha la giornata di 1.5 e la classe dei cinque giorni", () => {
  const b = bozzaIniziale(ctxDi());
  scegli(b, "libero", OGGI);
  Object.assign(b.libero, { tipo: "giorni", giorni: 5, misura: "km", kmGiorno: 100, metriGiorno: 2000, fondoGiorni: "strada", borseGiorni: false });
  b.data = "2027-03-01";
  const r = risposte(b, ctxDi());
  const stato = calcola({ oggi: OGGI, adesso: `${OGGI}T09:00`, letture: vuote, telefono: telefonoDi(r) });
  assert.deepEqual([stato.stima.giorni, stato.stima.kmGiorno, stato.stima.metriGiorno, stato.stima.mezzore.H], [5, 100, 2000, 7]);
  assert.ok(Math.abs(stato.stima.H - 7.24) < 0.01, `H ${stato.stima.H}`);
  assert.equal(stato.stima.avvisi.find((a) => a.tipo === "borse"), undefined, "senza borse");
  assert.deepEqual([stato.prontezza.classe, stato.piano.obiettivo.classe, stato.piano.obiettivo.giorni], ["2-5", "2-5", 5]);
});

test("le schermate dei giorni di fila hanno i giorni da 2 a 14, la misura di ogni giorno e la casella delle borse", () => {
  const ctx = ctxDi();
  const b = bozzaIniziale(ctx);
  scegli(b, "libero", OGGI);
  Object.assign(b, { passo: "giorni" });
  b.libero.tipo = "giorni";
  ctx.ui = { inizio: b };
  const aOre = disegna(ctx);
  const giorni = elementi(perId(aOre, "inizio-giorni-fila-gruppo")).filter((e) => e.nodeName === "input");
  assert.deepEqual(giorni.map((e) => e.getAttribute("value")), STIMA.obiettivoLibero.giorniDiFila.map(String));
  assert.ok(perId(aOre, "inizio-misura-gruppo") && perId(aOre, "inizio-ore-giorno-gruppo"));
  assert.equal(perId(aOre, "inizio-km-giorno"), null);
  assert.equal(perId(aOre, "inizio-borse-giorni").getAttribute("checked"), "");
  assert.equal(perId(aOre, "inizio-borse-giorni").getAttribute("type"), "checkbox");
  b.libero.misura = "km";
  const aKm = disegna(ctx);
  assert.ok(perId(aKm, "inizio-km-giorno") && perId(aKm, "inizio-metri-giorno") && perId(aKm, "inizio-fondo-giorni-gruppo"));
  assert.equal(perId(aKm, "inizio-ore-giorno-gruppo"), null);
  assert.match(aKm.textContent, new RegExp(AVVENTURA.kmGiorno.replace("?", "\\?")));
});
