// Prove della pagina «Pronto?» (js/viste/pronto.js, 7.7). Si lanciano con  node --test test/pronto.test.mjs
// La pagina si disegna in node con un DOM finto e piccolo, che fa solo quello che usa js/dom.js, a
// partire dal motore vero (js/motore.js) con l'esempio inventato di Giulia, in molti casi diversi. Poi
// si controllano le regole di scrittura (7.1) sul testo a schermo, i titoli, i tasti e le azioni che
// partono, ridisegnando la pagina come fa js/app.js. Nessuna persona vera.
import { test } from "node:test";
import assert from "node:assert/strict";

// --- un DOM finto, quanto basta ---

class Nodo {
  constructor(tipo, nome = null) {
    this.nodeType = tipo;
    this.nodeName = nome;
    this.childNodes = [];
    this.parentNode = null;
    this.attributi = new Map();
    this.ascoltatori = new Map();
    this.dataset = {};
    this.dato = "";
    this.value = "";
    this.open = false;
  }

  append(...figli) {
    for (const f of figli) {
      const n = f instanceof Nodo ? f : testo(String(f));
      n.parentNode = this;
      this.childNodes.push(n);
    }
  }

  setAttribute(k, v) {
    this.attributi.set(k, String(v));
    if (k === "open") this.open = true;
  }

  getAttribute(k) {
    return this.attributi.has(k) ? this.attributi.get(k) : null;
  }

  addEventListener(tipo, fn) {
    if (!this.ascoltatori.has(tipo)) this.ascoltatori.set(tipo, []);
    this.ascoltatori.get(tipo).push(fn);
  }

  emetti(tipo) {
    const evento = { type: tipo, target: this, preventDefault() {} };
    for (const fn of this.ascoltatori.get(tipo) || []) fn(evento);
  }

  get textContent() {
    return this.nodeType === 3 ? this.dato : this.childNodes.map((c) => c.textContent).join("");
  }

  set textContent(v) {
    this.childNodes = [testo(String(v))];
  }

  focus() {
    globalThis.__fuoco = this;
  }
}

function testo(t) {
  const n = new Nodo(3, "#text");
  n.dato = t;
  return n;
}

function elementi(nodo, lista = []) {
  if (nodo.nodeType !== 1) return lista;
  lista.push(nodo);
  for (const c of nodo.childNodes) elementi(c, lista);
  return lista;
}

globalThis.Node = Nodo;
globalThis.document = {
  createElement: (nome) => new Nodo(1, nome.toLowerCase()),
  createElementNS: (_, nome) => new Nodo(1, nome),
  createTextNode: testo,
  getElementById: (id) => (globalThis.__radice ? elementi(globalThis.__radice).find((e) => e.getAttribute("id") === id) || null : null),
};

const { vistaPronto } = await import("../js/viste/pronto.js");
const { sottoLaCarta } = await import("../js/viste/oggi.js");
const { segmentiPronto, PILASTRI_BARRA } = await import("../js/viste/barra-pronto.js");
const { AVVENTURA_OGGI } = await import("../js/testi-oggi.js");
const { calcola } = await import("../js/motore.js");
const { generaDemo } = await import("../js/demo.js");
const { aggiungiGiorni } = await import("../js/modello.js");
const { CATALOGO } = await import("../js/catalogo.js");
const { MEDICO } = await import("../js/testi.js");
const T = await import("../js/testi-prontezza.js");

const OGGI = "2026-11-04";   // un mercoledì

// Il telefono e le letture dell'esempio, nella forma che calcola vuole, come in test/motore.test.mjs.
function dallEsempio(cambia = {}, oggi = OGGI) {
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

const evento = (percorso, giorni, fra) => ({ tipo: "evento", percorso, giorni, partenza: fra === null ? null : aggiungiGiorni(OGGI, fra) });

// La pagina come la mostra js/app.js. Ogni azione cambia lo stato e ridisegna, così si prova anche dove
// va il fuoco. con.anteprima aggiunge ctx.azioni.anteprima, calcolata con il motore vero.
function apri(stato, con = {}) {
  const ui = {};
  const chiamate = [];
  const pagina = { stato, ui, chiamate, ctx: null, radice: null };
  const cambiaTelefono = (campi) => { pagina.stato = { ...pagina.stato, telefono: { ...pagina.stato.telefono, ...campi } }; };
  const azioni = {
    vai: (rotta) => { chiamate.push(["vai", rotta]); },
    esciDemo: () => {},
    ui: (nome, valore) => { chiamate.push(["ui", nome, valore]); ui[nome] = valore; disegna(); },
    salvaObiettivo: (o) => { chiamate.push(["salvaObiettivo", o]); cambiaTelefono({ obiettivo: o }); disegna(); },
    profilo: (campi, dove) => { chiamate.push(["profilo", campi, dove]); cambiaTelefono({ profilo: { ...pagina.stato.telefono.profilo, ...campi } }); disegna(); },
    rispostaUscita: (id, campi) => {
      chiamate.push(["rispostaUscita", id, campi]);
      const uscite = pagina.stato.telefono.uscite || {};
      cambiaTelefono({ uscite: { ...uscite, [id]: { ...(uscite[id] || {}), ...campi } } });
      disegna();
    },
  };
  if (con.anteprima) {
    azioni.anteprima = (o) => {
      const r = calcola({ ...pagina.stato, telefono: { ...pagina.stato.telefono, obiettivo: o } });
      return { stima: r.stima, prontezza: r.prontezza };
    };
  }
  function disegna() {
    const r = con.ritocca ? con.ritocca(calcola(pagina.stato)) : calcola(pagina.stato);
    pagina.ctx = { ...r, profilo: pagina.stato.telefono.profilo || {}, preferenze: {}, ui, demo: Boolean(con.demo), azioni };
    pagina.radice = vistaPronto(pagina.ctx);
    globalThis.__radice = pagina.radice;
  }
  disegna();
  return pagina;
}

// --- le regole della pagina ---

const VIETATE = new RegExp("\\b(ga" + "r[ae]" + "|presta" + "zion[ei]" + "|ra" + "c(e|es|ing)" + "|perfor" + "mance)\\b", "i");

// Le scritte a schermo, con il loro posto. Dentro «Per chi ama i numeri» possono stare kJ e punti (7.1).
function scritte(nodo, numeri = false, lista = []) {
  if (nodo.nodeType === 3) {
    const t = nodo.dato.trim();
    if (t) lista.push({ t, numeri });
    return lista;
  }
  if (nodo.nodeName === "svg") return lista;
  const dentro = numeri || (nodo.nodeName === "details" && nodo.getAttribute("id") === "pronto-numeri");
  for (const c of nodo.childNodes) scritte(c, dentro, lista);
  return lista;
}

const tutto = (radice) => scritte(radice).map((x) => x.t).join(" ");

function controlla(radice, dove) {
  const els = elementi(radice);
  const h1 = els.filter((e) => e.nodeName === "h1");
  assert.equal(h1.length, 1, `${dove}, un solo h1`);
  // I titoli in ordine, senza salti.
  let prima = 1;
  for (const e of els.filter((x) => /^h[1-6]$/.test(x.nodeName))) {
    const livello = Number(e.nodeName[1]);
    assert.ok(livello <= prima + 1, `${dove}, titolo ${e.nodeName} «${e.textContent}» dopo un h${prima}`);
    prima = livello;
  }
  const ids = els.map((e) => e.getAttribute("id")).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, `${dove}, id ripetuti ${ids.filter((x, i) => ids.indexOf(x) !== i)}`);
  for (const e of els) {
    for (const a of ["aria-labelledby", "aria-controls", "aria-describedby", "for"]) {
      const v = e.getAttribute(a);
      if (v) assert.ok(ids.includes(v), `${dove}, ${a}=${v} senza l'elemento`);
    }
    if (e.nodeName === "button") assert.ok(e.textContent.trim().length > 0, `${dove}, tasto senza testo`);
    if (e.nodeName === "details") assert.equal(e.childNodes[0] && e.childNodes[0].nodeName, "summary", `${dove}, details senza summary`);
    if (e.nodeName === "button") assert.ok(e.getAttribute("type"), `${dove}, tasto senza type`);
  }
  for (const { t, numeri } of scritte(radice)) {
    assert.ok(!t.includes(":"), `${dove}, due punti in «${t}»`);
    assert.ok(!VIETATE.test(t), `${dove}, parola vietata in «${t}»`);
    assert.ok(!/undefined|NaN|\bnull\b|\[object/.test(t), `${dove}, valore mancante in «${t}»`);
    assert.ok(!/\b(T[123]|RIR)\b/.test(t), `${dove}, sigla in «${t}»`);
    assert.ok(!/\b\d+[.,]\d+\s*(ore|ora|minuti|min|h)\b/i.test(t), `${dove}, decimali in una durata in «${t}»`);
    assert.ok(!/\b(sei in forma|vai forte|sei indietro|classifica|cronometro|avversari|vincere)\b/i.test(t), `${dove}, «${t}»`);
    if (!numeri) assert.ok(!/\bkJ\b|\bwatt\b|%|\bpunti\b|\bspecchio\b|\btapering\b/i.test(t), `${dove}, numeri fuori posto in «${t}»`);
  }
}

const tasto = (radice, testoTasto) => elementi(radice).find((e) => e.nodeName === "button" && e.textContent.trim() === testoTasto) || null;
const perId = (radice, id) => elementi(radice).find((e) => e.getAttribute("id") === id) || null;

// --- i casi ---

test("l'esempio, dieci settimane prima, dice dove si arriva con il piano, con le righe e le prove", () => {
  const p = apri(dallEsempio());
  controlla(p.radice, "esempio");
  const h1 = elementi(p.radice).find((e) => e.nodeName === "h1").textContent;
  assert.equal(h1, "Se segui il piano, ci arrivi quasi pronto.");
  const testoPagina = tutto(p.radice);
  assert.match(testoPagina, /Manca qualche ora in bici a settimana\./);
  assert.match(testoPagina, /Tuscany Trail, Originale, 460 km e 5\.900 m di salita\./);
  assert.match(testoPagina, /In 5 giorni\. Si parte mercoledì 13 gennaio, fra 10 settimane\./);
  assert.match(testoPagina, /Ogni giorno starai in sella circa 6 ore, fra 5 ore e mezza e 6 ore e mezza\./);
  assert.match(testoPagina, /Borse, circa 10 kg\./);
  assert.match(testoPagina, /Prova generale con le borse, in programma/);
  assert.ok(perId(p.radice, "pronto-preparazione") && perId(p.radice, "pronto-prove") && perId(p.radice, "pronto-avventura"));
  // «Per chi ama i numeri» è chiuso, e dentro c'è il confronto con la Fitness, che non decide.
  const numeri = perId(p.radice, "pronto-numeri");
  assert.equal(numeri.nodeName, "details");
  assert.equal(numeri.open, false);
  assert.match(numeri.textContent, /È solo un confronto, il verdetto viene dalle ore\./);
  assert.match(numeri.textContent, /kJ di lavoro sui pedali/);
  assert.match(tutto(p.radice), /Le ore vengono dalla fisica della bici/);
  // Il segno di ogni riga è nascosto ai lettori di schermo, lo stato è scritto.
  const prima = elementi(perId(p.radice, "pronto-preparazione")).find((e) => e.nodeName === "li");
  assert.ok(elementi(prima).some((e) => e.nodeName === "svg" && e.getAttribute("aria-hidden") === "true"));
  assert.ok(elementi(prima).some((e) => e.getAttribute("class") === "nascosto"));
});

test("alla vigilia c'è il verdetto con le sue tre parti, e niente «Cosa cambia se…» quando non serve", () => {
  const p = apri(dallEsempio({ obiettivo: evento("tt-originale", 5, 10) }));
  controlla(p.radice, "vigilia");
  assert.equal(elementi(p.radice).find((e) => e.nodeName === "h1").textContent, "Pronto, con margine");
  assert.match(tutto(p.radice), /Hai le ore, l'uscita lunga e le prove con le borse\. Adesso conta arrivare riposato\. Segui lo scarico finale\./);
  assert.equal(perId(p.radice, "pronto-cambia"), null);
  assert.equal(perId(p.radice, "pronto-preparazione-titolo").textContent, T.PRONTO_PAGINA.preparazione);
});

test("«Fallo in 4 giorni» mostra prima la giornata e il verdetto nuovi, e cambia solo con «Sì, cambia»", () => {
  const p = apri(dallEsempio({ obiettivo: evento("tt-originale", 3, 12) }), { anteprima: true });
  controlla(p.radice, "tre giorni");
  assert.match(perId(p.radice, "pronto-cambia").textContent, /In 3 giorni servono almeno 9 ore di bici a settimana, e ne hai 8\./);
  const fallo = tasto(p.radice, "Fallo in 4 giorni");
  assert.ok(fallo, "manca il tasto dei giorni");
  assert.equal(fallo.getAttribute("aria-expanded"), "false");
  fallo.emetti("click");
  assert.ok(!p.chiamate.some((c) => c[0] === "salvaObiettivo"), "l'obiettivo cambia solo con «Sì, cambia»");
  const pannello = perId(p.radice, "pronto-anteprima");
  assert.ok(pannello, "manca la giornata nuova");
  assert.match(pannello.textContent, /In 4 giorni ogni giornata dura circa 7 ore e mezza\./);
  assert.match(pannello.textContent, /Con questa scelta il verdetto diventa /);
  assert.equal(globalThis.__fuoco, perId(p.radice, "pronto-anteprima-titolo"), "il fuoco va sulla giornata nuova");
  assert.equal(perId(p.radice, "pronto-giorni").getAttribute("aria-expanded"), "true");
  controlla(p.radice, "tre giorni, anteprima");
  tasto(p.radice, "Sì, cambia").emetti("click");
  const salvato = p.chiamate.find((c) => c[0] === "salvaObiettivo")[1];
  assert.deepEqual(salvato, { tipo: "evento", percorso: "tt-originale", giorni: 4, partenza: aggiungiGiorni(OGGI, 12), iscritto: false });
  // Dopo la scelta la pagina dice cosa ha fatto, e il fuoco va al titolo nuovo.
  assert.match(tutto(p.radice), /Fatto, ho cambiato i giorni\./);
  assert.equal(globalThis.__fuoco, perId(p.radice, "pronto-titolo"));
  assert.match(tutto(p.radice), /In 4 giorni\. Si parte/);
  controlla(p.radice, "quattro giorni");
});

test("senza ctx.azioni.anteprima la giornata nuova viene dalla proposta, e «Lascia com'è» richiude", () => {
  const p = apri(dallEsempio({ obiettivo: evento("tt-originale", 3, 12) }));
  tasto(p.radice, "Fallo in 4 giorni").emetti("click");
  const pannello = perId(p.radice, "pronto-anteprima");
  assert.match(pannello.textContent, /In 4 giorni ogni giornata dura circa 7 ore e mezza\./);
  assert.doesNotMatch(pannello.textContent, /verdetto diventa/);
  tasto(p.radice, "Lascia com'è").emetti("click");
  assert.equal(perId(p.radice, "pronto-anteprima"), null);
  assert.equal(globalThis.__fuoco, perId(p.radice, "pronto-giorni"), "il fuoco torna sul tasto");
  assert.ok(!p.chiamate.some((c) => c[0] === "salvaObiettivo"));
});

test("con poche ore a settimana propone anche il percorso corto, che si sceglie allo stesso modo", () => {
  const p = apri(dallEsempio({ obiettivo: evento("tt-originale", 4, 12), disponibilita: { giorni: [1, 3, 5, 6], stella: 5, ore: 3 } }), { anteprima: true });
  controlla(p.radice, "corto");
  const cambia = perId(p.radice, "pronto-cambia").textContent;
  assert.match(cambia, /Ti propongo il Newbie in 3 giorni, con circa 3 ore al giorno\. È lo stesso viaggio, con meno strada\./);
  assert.ok(tasto(p.radice, "Fallo in 6 giorni"));
  tasto(p.radice, "Passa al Newbie").emetti("click");
  assert.match(perId(p.radice, "pronto-anteprima").textContent, /Con il Newbie in 3 giorni ogni giornata dura circa 3 ore\./);
  controlla(p.radice, "corto, anteprima");
  tasto(p.radice, "Sì, cambia").emetti("click");
  const salvato = p.chiamate.find((c) => c[0] === "salvaObiettivo")[1];
  assert.equal(salvato.percorso, "tt-newbie");
  assert.equal(salvato.giorni, 3);
  assert.match(tutto(p.radice), /Tuscany Trail, Newbie, 160 km e 1\.600 m di salita\./);
});

test("«Partire e adattare» lascia il tasto dei giorni per chi vuole vedere i numeri", () => {
  const p = apri(dallEsempio({ obiettivo: evento("tg-medio", 3, 9), disponibilita: { giorni: [5, 6], stella: 5, ore: 2 } }));
  controlla(p.radice, "adattare");
  const cambia = perId(p.radice, "pronto-cambia").textContent;
  assert.match(cambia, /Ti propongo di partire e adattare\./);
  assert.ok(tasto(p.radice, "Fallo in 5 giorni"));
  assert.equal(elementi(p.radice).filter((e) => e.nodeName === "button" && /^Passa /.test(e.textContent)).length, 0);
});

test("le borse si cambiano a un tocco, e il fuoco torna su «Cambia»", () => {
  const p = apri(dallEsempio());
  const cambia = perId(p.radice, "pronto-borse-cambia");
  assert.equal(cambia.getAttribute("aria-expanded"), "false");
  cambia.emetti("click");
  const scelte = perId(p.radice, "pronto-borse-scelte");
  assert.ok(scelte, "si aprono le scelte");
  assert.equal(globalThis.__fuoco, perId(p.radice, "pronto-borse-scelta"));
  assert.deepEqual(elementi(scelte).filter((e) => e.nodeName === "button").map((e) => e.textContent),
    ["Leggere, 5 kg", "Normali, 8 kg", "Pesanti, 12 kg", "Molto pesanti, 16 kg", "Lascia così"]);
  controlla(p.radice, "borse aperte");
  tasto(p.radice, "Leggere, 5 kg").emetti("click");
  assert.deepEqual(p.chiamate.find((c) => c[0] === "profilo").slice(1), [{ borseKg: 5 }, "pronto-borse"]);
  assert.match(tutto(p.radice), /Borse, circa 5 kg\./);
  // Le ore dell'esempio vengono dal suo viaggio con le borse (1.7), e la riga lo dice.
  assert.match(tutto(p.radice), /Fatto, ho cambiato le borse\. Le tue ore vengono dalle uscite che hai fatto con le borse, quindi cambiano poco\./);
  assert.equal(globalThis.__fuoco, perId(p.radice, "pronto-borse-cambia"));
  assert.equal(perId(p.radice, "pronto-borse-scelte"), null);
});

test("le borse più leggere entrano in «Cosa cambia se…» solo quando le ore vengono dal modello delle borse", () => {
  // Con il viaggio con le borse dell'esempio le ore non dipendono dai chili, e la riga non c'è.
  const conViaggio = apri(dallEsempio());
  assert.ok(Number.isFinite(conViaggio.ctx.stima.fattore));
  assert.doesNotMatch(tutto(conViaggio.radice), /Con le borse più leggere/);
  // Senza risposte sulle borse e senza il viaggio nel diario il fattore personale non c'è, e i chili contano.
  const p = apri(dallEsempio({ uscite: {}, mattino: {}, esiti: {}, obiettivo: evento("tt-originale", 4, 70) }));
  assert.equal(p.ctx.stima.fattore, null);
  assert.equal(p.ctx.prontezza.esito, "quasiPronto");
  controlla(p.radice, "senza fattore");
  assert.match(perId(p.radice, "pronto-cambia").textContent, /Con le borse più leggere la giornata si accorcia\. Oggi i tuoi 10 kg pesano circa 25 minuti al giorno\./);
  tasto(p.radice, "Cambia le borse").emetti("click");
  assert.ok(perId(p.radice, "pronto-borse-scelte"), "si aprono le scelte delle borse");
  assert.equal(globalThis.__fuoco, perId(p.radice, "pronto-borse-scelta"));
  tasto(p.radice, "Leggere, 5 kg").emetti("click");
  assert.match(tutto(p.radice), /Fatto, ho cambiato le borse\. Le ore sono già rifatte\./);
  controlla(p.radice, "borse leggere");
});

test("senza i chili scritti le borse sono quelle del catalogo o quelle della prova", () => {
  const d = generaDemo(OGGI);
  const senza = { ...d.profilo };
  delete senza.borseKg;
  const p = apri(dallEsempio({ profilo: senza }));
  controlla(p.radice, "borse senza chili");
  assert.match(tutto(p.radice), /Borse, circa \d+ kg, come (nella tua prova con le borse|la maggior parte)\./);
});

test("quando la stima è una e-bike senza ore, la pagina le chiede con un tocco", () => {
  const p = apri(dallEsempio({ profilo: { fasciaEta: "50-54", ebike: true } }));
  controlla(p.radice, "e-bike");
  assert.equal(elementi(p.radice).find((e) => e.nodeName === "h1").textContent, "Non posso ancora dirlo");
  const sei = perId(p.radice, "pronto-ebike-6");
  assert.equal(sei.textContent, "6 ore");
  sei.emetti("click");
  assert.deepEqual(p.chiamate.find((c) => c[0] === "profilo").slice(1), [{ oreEbike: 6 }, "pronto-ebike"]);
  controlla(p.radice, "e-bike con le ore");
  assert.notEqual(elementi(p.radice).find((e) => e.nodeName === "h1").textContent, "Non posso ancora dirlo");
});

test("un evento senza data mostra la giornata e la settimana tipo, e le partenze a un tocco", () => {
  const p = apri(dallEsempio({ obiettivo: evento("tt-originale", 4, null) }));
  controlla(p.radice, "senza data");
  assert.equal(elementi(p.radice).find((e) => e.nodeName === "h1").textContent, T.PRONTO_PAGINA.senzaData);
  const testoPagina = tutto(p.radice);
  assert.match(testoPagina, /Una settimana tipo, circa .+ in bici, con un'uscita lunga di .+\./);
  assert.match(testoPagina, /Le prove che ti serviranno/);
  assert.equal(perId(p.radice, "pronto-preparazione"), null);
  const parto = tasto(p.radice, "Parto mercoledì 19 maggio");
  assert.ok(parto, "le partenze del catalogo");
  parto.emetti("click");
  assert.equal(p.chiamate.find((c) => c[0] === "salvaObiettivo")[1].partenza, "2027-05-19");
  assert.match(tutto(p.radice), /Fatto, ho segnato la partenza\./);
  controlla(p.radice, "con la data");
});

test("un'avventura mia senza data si data con il campo, e un giorno passato non vale", () => {
  const p = apri(dallEsempio({ obiettivo: { tipo: "libero", libero: "ore", ore: 5 } }));
  controlla(p.radice, "libero senza data");
  assert.match(tutto(p.radice), /Il tuo giro di 5 ore/);
  assert.match(tutto(p.radice), /Un giro di 5 ore\./);
  const modulo = elementi(p.radice).find((e) => e.nodeName === "form");
  const campo = perId(p.radice, "pronto-data-giorno");
  campo.value = OGGI;
  modulo.emetti("submit");
  assert.equal(perId(p.radice, "pronto-data-stato").textContent, T.QUANDO_PARTI.errore);
  assert.ok(!p.chiamate.some((c) => c[0] === "salvaObiettivo"));
  campo.value = aggiungiGiorni(OGGI, 30);
  modulo.emetti("submit");
  const salvato = p.chiamate.find((c) => c[0] === "salvaObiettivo")[1];
  assert.equal(salvato.tipo, "libero");
  assert.equal(salvato.libero, "ore");
  assert.equal(salvato.ore, 5);
  assert.equal(salvato.partenza, aggiungiGiorni(OGGI, 30));
  controlla(p.radice, "libero con la data");
});

test("un giro mio con le borse e una data dice cosa c'è per quel giro", () => {
  const p = apri(dallEsempio({ obiettivo: { tipo: "libero", libero: "giro", km: 140, metri: 2200, fondo: "gravel", conBorse: true, partenza: aggiungiGiorni(OGGI, 40) } }));
  controlla(p.radice, "giro con le borse");
  const testoPagina = tutto(p.radice);
  assert.match(testoPagina, /Un giro di 140 km e 2\.200 m di salita, su gravel, con le borse\./);
  assert.match(testoPagina, /Uscita con le borse, fatta/);
  assert.equal(tasto(p.radice, "Fallo in 2 giorni"), null);
});

test("da 40 anni e per 11 giorni e più, nelle ultime 4 settimane, c'è la riga del medico", () => {
  const con = apri(dallEsempio({ obiettivo: evento("nc4k-berlino", 12, 20) }));
  controlla(con.radice, "nc4k");
  assert.ok(tutto(con.radice).includes(MEDICO.viaggioLungo));
  // La giornata normale per 11 giorni e più sta fra i numeri.
  assert.match(perId(con.radice, "pronto-numeri").textContent, /Una giornata normale dura circa/);
  const giovane = apri(dallEsempio({ obiettivo: evento("nc4k-berlino", 12, 20), profilo: { fasciaEta: "sotto40" } }));
  assert.ok(!tutto(giovane.radice).includes(MEDICO.viaggioLungo));
  const lontano = apri(dallEsempio({ obiettivo: evento("nc4k-berlino", 12, 60) }));
  assert.ok(!tutto(lontano.radice).includes(MEDICO.viaggioLungo));
});

test("nell'ultima settimana fra i numeri c'è Fitness meno Fatica alla partenza", () => {
  const p = apri(dallEsempio({ obiettivo: evento("tt-originale", 5, 5) }));
  controlla(p.radice, "ultima settimana");
  assert.match(perId(p.radice, "pronto-numeri").textContent, /Ieri sera Fitness meno Fatica faceva [+−]?\d+\. .+ fra 0 e \+15\. Fino a −10 non è un allarme/);
});

test("lontano dalla partenza c'è «Siamo nella base»", () => {
  const p = apri(dallEsempio({ obiettivo: evento("nc4k-rovereto", 15, 140) }));
  controlla(p.radice, "base");
  assert.match(elementi(p.radice).find((e) => e.nodeName === "header").textContent, /Siamo nella base\./);
});

test("con poche settimane di uscite la pagina lo dice, senza righe e senza giudizio", () => {
  const stato = dallEsempio();
  const dal = aggiungiGiorni(OGGI, -15);
  stato.letture.benessere = stato.letture.benessere.filter((w) => w.id >= dal);
  stato.letture.attivita = stato.letture.attivita.filter((a) => a.start_date_local.slice(0, 10) >= dal);
  const p = apri(stato);
  controlla(p.radice, "storia corta");
  assert.equal(elementi(p.radice).find((e) => e.nodeName === "h1").textContent, T.PRONTO_PAGINA.storiaCorta);
  assert.match(tutto(p.radice), /mi servono almeno 3 settimane di uscite/);
  assert.equal(perId(p.radice, "pronto-preparazione"), null);
});

test("con le risposte sulle borse che mancano, la fiducia lo dice e «Rispondi adesso» porta a Numeri", () => {
  const p = apri(dallEsempio({ uscite: {}, obiettivo: evento("tt-originale", 5, 10) }));
  controlla(p.radice, "senza risposte");
  const f = elementi(p.radice).find((e) => e.getAttribute("class") === "pronto-fiducia");
  assert.ok(f, "manca la riga della fiducia");
  assert.match(f.textContent, /Verdetto con qualche dato in meno\. Mi mancano le risposte sulle borse di \d+ uscite lunghe\./);
  tasto(p.radice, "Rispondi adesso").emetti("click");
  assert.deepEqual(p.chiamate.find((c) => c[0] === "vai"), ["vai", "numeri"]);
});

test("un punto di contatto segnato dopo la prova compare con il suo consiglio", () => {
  const stato = dallEsempio({ obiettivo: evento("tt-originale", 5, 10) });
  for (const v of Object.values(stato.telefono.uscite)) if (v.prova) v.prova = { ...v.prova, esito: "sistemare", aree: ["mani", "sedere"] };
  const p = apri(stato);
  controlla(p.radice, "da sistemare");
  assert.match(tutto(p.radice), /Nell'ultima prova hai segnato le mani e il sedere\./);
  assert.equal(elementi(p.radice).find((e) => e.nodeName === "h1").textContent, "Quasi pronto");
});

test("un giro lasciato fuori dal passo si rimette con «Rimettilo»", () => {
  const ritocca = (r) => (r.stima && r.stima.passo
    ? { ...r, stima: { ...r.stima, passo: { ...r.stima.passo, tolti: [{ id: "giro-inventato", giorno: "2026-10-10", ore: 3.2, previste: 2.4 }] } } }
    : r);
  const p = apri(dallEsempio(), { ritocca });
  const numeri = perId(p.radice, "pronto-numeri");
  assert.match(numeri.textContent, /Sabato 10 ottobre, 3 ore e 10\. Non usato per il tuo passo, sembra diverso dagli altri\./);
  controlla(p.radice, "passo");
  perId(p.radice, "pronto-rimetti-giro-inventato").emetti("click");
  assert.deepEqual(p.chiamate.find((c) => c[0] === "rispostaUscita").slice(1), ["giro-inventato", { rimessaNelPasso: true }]);
  assert.equal(globalThis.__fuoco, perId(p.radice, "pronto-passo-titolo"));
});

test("«Per chi ama i numeri» resta aperto quando la pagina si ridisegna", () => {
  const p = apri(dallEsempio());
  const numeri = perId(p.radice, "pronto-numeri");
  numeri.open = true;
  numeri.emetti("toggle");
  perId(p.radice, "pronto-borse-cambia").emetti("click");
  assert.equal(perId(p.radice, "pronto-numeri").open, true);
});

test("senza avventura e con il solo semaforo la pagina invita a scegliere", () => {
  for (const obiettivo of [null, { tipo: "semaforo" }]) {
    const p = apri(dallEsempio({ obiettivo }));
    controlla(p.radice, `senza avventura ${JSON.stringify(obiettivo)}`);
    assert.equal(elementi(p.radice).find((e) => e.nodeName === "h1").textContent, "Pronto?");
    assert.match(tutto(p.radice), obiettivo ? /Per ora segui solo il semaforo del mattino\./ : /Pronto per cosa\?/);
    tasto(p.radice, "Scegli").emetti("click");
    assert.deepEqual(p.chiamate.find((c) => c[0] === "vai"), ["vai", "inizio"]);
  }
});

test("nell'esempio c'è la striscia dell'esempio, e la pagina regge con tutti i percorsi del catalogo", () => {
  const p = apri(dallEsempio(), { demo: true });
  assert.ok(elementi(p.radice).some((e) => /banner-demo/.test(e.getAttribute("class") || "")));
  for (const percorso of CATALOGO) {
    for (const [giorni, fra] of [[percorso.giorniMin, 40], [percorso.giorniMax, 12]]) {
      const q = apri(dallEsempio({ obiettivo: evento(percorso.id, giorni, fra) }));
      controlla(q.radice, `${percorso.id} in ${giorni} giorni fra ${fra}`);
      assert.ok(tutto(q.radice).includes(percorso.evento), percorso.id);
    }
  }
});

// --- la barra «Arrivi pronto?», in cima a Pronto? e sotto la carta di Oggi ---

const conClasse = (radice, classe) => elementi(radice).filter((e) => (e.getAttribute("class") || "").split(" ").includes(classe));

test("in cima a Pronto? la barra «Arrivi pronto?» ha un segmento per pilastro, con lo stato dei segni delle righe", () => {
  for (const [dove, stato] of [["dieci settimane prima", dallEsempio()], ["alla vigilia", dallEsempio({ obiettivo: evento("tt-originale", 5, 10) })]]) {
    const p = apri(stato);
    controlla(p.radice, dove);
    const header = elementi(p.radice).find((e) => e.nodeName === "header");
    const barra = perId(p.radice, "pronto-barra");
    assert.ok(barra, `${dove}, manca la barra`);
    // Nell'intestazione, fra l'occhiello e il titolo, che è la frase del verdetto o di dove arrivi.
    const figli = header.childNodes.filter((c) => c.nodeType === 1);
    assert.deepEqual([figli.indexOf(barra), figli.findIndex((e) => e.nodeName === "h1")], [1, 2], dove);
    assert.equal(figli[2].textContent.replace(/\.?$/, "."), T.fraseBarra(p.ctx.prontezza), dove);
    assert.equal(conClasse(barra, "barra-pronto-frase").length, 0, `${dove}, la frase è già il titolo`);
    // Quattro segmenti nell'ordine dei pilastri, con il nome a parole per i lettori di schermo.
    const segmenti = segmentiPronto(p.ctx.prontezza);
    assert.deepEqual(segmenti.map((x) => x.pilastro), PILASTRI_BARRA);
    const immagine = elementi(barra).find((e) => e.getAttribute("role") === "img");
    assert.equal(immagine.getAttribute("aria-label"), T.nomeBarra(segmenti));
    assert.match(immagine.getAttribute("aria-label"), /^Ore a settimana, .+\. Uscita lunga, .+\. Prove con le borse, .+\. Costanza, .+\.$/);
    assert.deepEqual(conClasse(barra, "barra-segmento").map((e) => e.getAttribute("class")), segmenti.map((x) => `barra-segmento barra-segmento-${x.riempimento}`));
    // Lo stesso segno della riga del suo pilastro, spunta piena, cerchio a metà, croce vuota.
    const righe = elementi(perId(p.radice, "pronto-preparazione")).filter((e) => e.nodeName === "li");
    p.ctx.prontezza.righe.forEach((r, i) => {
      const x = segmenti.find((s) => s.pilastro === r.pilastro);
      if (x) assert.match(righe[i].getAttribute("class"), new RegExp(`pronto-riga-${x.forma}$`), `${dove}, ${r.pilastro}`);
    });
    // Niente numeri e niente percentuali a schermo.
    assert.ok(!/\d|%/.test(barra.textContent), `${dove}, «${barra.textContent}»`);
  }
});

test("senza i pilastri la barra non c'è, e in fondo a «Da dove vengono questi numeri» ci sono le fonti", () => {
  const corta = dallEsempio();
  const dal = aggiungiGiorni(OGGI, -15);
  corta.letture.benessere = corta.letture.benessere.filter((w) => w.id >= dal);
  corta.letture.attivita = corta.letture.attivita.filter((a) => a.start_date_local.slice(0, 10) >= dal);
  for (const [dove, stato] of [["storia corta", corta], ["senza data", dallEsempio({ obiettivo: evento("tt-originale", 5, null) })]]) {
    const p = apri(stato);
    controlla(p.radice, dove);
    assert.equal(perId(p.radice, "pronto-barra"), null, dove);
    assert.equal(segmentiPronto(p.ctx.prontezza), null, dove);
  }
  assert.equal(perId(apri(dallEsempio({ obiettivo: { tipo: "semaforo" } })).radice, "pronto-barra"), null, "solo semaforo");
  const p = apri(dallEsempio());
  const fonti = perId(p.radice, "pronto-fonti");
  assert.deepEqual([fonti.nodeName, fonti.getAttribute("href"), fonti.textContent], ["a", "#fonti", T.PRONTO_PAGINA.fonti]);
  assert.ok(elementi(perId(p.radice, "pronto-dove")).includes(fonti));
});

test("sotto la carta di Oggi la barra porta a Pronto? con la sua frase, e il collegamento all'avventura c'è sempre", () => {
  const p = apri(dallEsempio());
  const sotto = sottoLaCarta(p.ctx);
  globalThis.__radice = sotto;
  const barra = perId(sotto, "oggi-pronto");
  assert.deepEqual([barra.nodeName, barra.getAttribute("href")], ["a", "#pronto"]);
  const frase = conClasse(barra, "barra-pronto-frase")[0];
  assert.equal(frase.textContent, T.fraseBarra(p.ctx.prontezza));
  assert.equal(frase.textContent, "Se segui il piano, ci arrivi quasi pronto.");
  assert.match(barra.textContent, /^Arrivi pronto\?/);
  assert.ok(!/\d|%/.test(barra.textContent), barra.textContent);
  assert.equal(elementi(barra).find((e) => e.getAttribute("role") === "img").getAttribute("aria-label"), T.nomeBarra(segmentiPronto(p.ctx.prontezza)));
  const avventura = perId(sotto, "oggi-avventura");
  assert.deepEqual([avventura.getAttribute("href"), avventura.textContent], ["#inizio", AVVENTURA_OGGI.cambia]);
  // In viaggio, dopo la partenza e senza avventura la barra non c'è. Con il solo semaforo l'avventura si sceglie.
  const inViaggio = sottoLaCarta({ ...p.ctx, giorno: { ...p.ctx.giorno, evento: { tipo: "evento", giorno: 1, giorni: 5 } } });
  assert.equal(perId(inViaggio, "oggi-pronto"), null);
  assert.equal(perId(sottoLaCarta({ ...p.ctx, giorno: { ...p.ctx.giorno, giorniPartenza: null } }), "oggi-pronto"), null);
  const solo = apri(dallEsempio({ obiettivo: { tipo: "semaforo" } }));
  const sottoSolo = sottoLaCarta(solo.ctx);
  assert.equal(perId(sottoSolo, "oggi-pronto"), null);
  assert.equal(perId(sottoSolo, "oggi-avventura").textContent, AVVENTURA_OGGI.scegli);
  assert.equal(perId(sottoLaCarta({ ...solo.ctx, obiettivo: null }), "oggi-avventura").textContent, AVVENTURA_OGGI.scegli);
});
