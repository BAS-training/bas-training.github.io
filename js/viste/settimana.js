// La settimana (7.6). In alto il conto alla partenza e una frase sola, poi sette righe da lunedì a
// domenica, ognuna con la seduta in breve e un segno (fatta, saltata, spostata, oggi). Un tocco su una
// riga apre il come e il perché. In fondo «Aggiungi un giro», «Questo weekend non posso» e «Cambia i
// giorni in cui puoi pedalare». Il piano arriva già fatto da js/motore.js (ctx.piano e ctx.settimana),
// quello che è stato fatto davvero da ctx.attivita, e gli spostamenti da ctx.piano.spostamenti.
// righeSettimana è pura, così le prove la guardano con node (test/settimana.test.mjs).

import { h, icona } from "../dom.js?v=202610312043";
import { nomeTipo } from "../modello.js?v=202610312043";
import { inBici, inPalestra } from "../dati.js?v=202610312043";
import { leggiDisponibilita, TIPI_SEDUTA } from "../piano.js?v=202610312043";
import { sedutaPalestra } from "../palestra.js?v=202610312043";
import {
  inBreve, titoloSeduta, comeSeduta, contoAllaPartenza, fraseSettimana, testoSposta, testoSpostiamo, testoSalta,
  NOTE, TASTI, AVVISI,
} from "../testi-piano.js?v=202610312043";
import {
  SETTIMANA, SEGNI, PERCHE, GIRO, SFORZO_PAROLE, giornoRiga, intervallo, nelPiano, fattoDescritto, sedutaAnche,
  arrivaDa, fraseCrescita, liberaAiuto, giroAggiunto,
} from "../testi-settimana.js?v=202610312043";
import { intestazione, bannerDemo } from "./comuni.js?v=202610312043";

const GIORNO_MS = 86400000;
const lista = (v) => (Array.isArray(v) ? v : []);
const num = (v) => typeof v === "number" && Number.isFinite(v);
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function utc(iso) {
  const [a, m, g] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}
const piuGiorni = (iso, n) => new Date(utc(iso) + n * GIORNO_MS).toISOString().slice(0, 10);
const giorniFra = (da, a) => Math.round((utc(a) - utc(da)) / GIORNO_MS);
const lunediDi = (iso) => piuGiorni(iso, -((new Date(utc(iso)).getUTCDay() + 6) % 7));

// Le sedute in bici del piano, per sapere se una seduta è fatta (6.3) e qual è la principale. Sono i
// tipi di js/piano.js senza riposo, palestra, tronco e collo, dopo l'evento e tappa.
const NON_BICI = new Set(["riposo", "palestra", "tronco", "dopoEvento", "tappa"]);
const BICI = new Set(TIPI_SEDUTA.filter((t) => !NON_BICI.has(t)));
// Le sedute chiave che crescono di settimana in settimana, per la riga «rispetto a due settimane fa»,
// cioè quelle in bici senza i giri della settimana, lo scarico e il controllo prima della partenza.
const NON_CRESCONO = new Set(["recupero", "facile", "media", "richiamo", "scarico", "controllo"]);
const CRESCONO = new Set([...BICI].filter((t) => !NON_CRESCONO.has(t)));
// Le settimane del piano in cui la lunga cresce. Scarichi, settimane facili e scarico finale calano apposta.
const SETTIMANE_CHE_CRESCONO = new Set(["base", "N", "E"]);
const PALESTRA = new Set(["palestra", "tronco"]);

// La seduta che dice la riga, prima quella in bici, poi la palestra, poi tronco e collo.
function principale(sedute) {
  return sedute.find((x) => BICI.has(x.tipo)) || sedute.find((x) => x.tipo === "palestra") || sedute[0] || null;
}

// La seduta chiave di due settimane prima, in minuti, dal piano.
function minutiDueSettimaneFa(piano, lunedi) {
  const prima = lista(piano && piano.settimane).find((w) => w && w.lunedi === piuGiorni(lunedi, -14));
  const ore = prima && prima.chiave ? lista(prima.chiave.ore)[0] : null;
  return num(ore) && ore > 0 ? ore * 60 : null;
}

// Le sette righe della settimana, pronte per la pagina. Per ogni giorno la data, la seduta prevista e le
// altre dello stesso giorno, quello che è stato fatto, lo spostamento che lo riguarda e il segno.
export function righeSettimana(ctx) {
  const w = ctx.settimana;
  if (!w) return [];
  const oggi = ctx.oggi;
  const ob = ctx.obiettivo || {};
  const partenza = DATA.test(ob.partenza || "") ? ob.partenza : null;
  const giorniViaggio = Number.isInteger(ob.giorni) && ob.giorni > 0 ? ob.giorni : 1;
  const spostamenti = lista(ctx.piano && ctx.piano.spostamenti).filter((x) => x && DATA.test(x.da || ""));
  const attivita = lista(ctx.attivita);
  const giorni = lista(w.giorni);
  const minutiPrima = minutiDueSettimaneFa(ctx.piano, w.lunedi);
  return giorni.map((g) => {
    const sedute = lista(g.sedute).filter((x) => x && x.tipo !== "riposo");
    const p = principale(sedute);
    const altre = sedute.filter((x) => x !== p);
    const fatte = attivita.filter((a) => a && a.giorno === g.giorno);
    const passato = g.giorno < oggi;
    const via = lista(spostamenti).filter((x) => x.da === g.giorno).pop() || null;
    const arrivata = lista(spostamenti).filter((x) => x.a === g.giorno).pop() || null;
    // La seduta andata altrove, presa dal giorno dove è arrivata per dire quanto dura.
    let spostata = null;
    if (via && !p) {
      const dove = via.a ? giorni.find((y) => y.giorno === via.a) : null;
      const la = dove ? lista(dove.sedute).find((x) => x && x.tipo === via.tipo) : null;
      spostata = { tipo: via.tipo, minuti: la ? la.minuti : null };
    }
    const fattaBici = fatte.some((a) => inBici(a));
    const fattaPalestra = fatte.some((a) => inPalestra(a));
    const fatta = p ? (BICI.has(p.tipo) ? fattaBici : fattaPalestra || (p.tipo === "tronco" && fatte.length > 0)) : fatte.length > 0;

    let stato = "previsto";
    if (partenza && g.giorno >= partenza) {
      stato = giorniFra(partenza, g.giorno) === 0 ? "partenza" : giorniFra(partenza, g.giorno) < giorniViaggio ? "viaggio" : "dopo";
    } else if (g.fuori && !p) stato = passato ? "primaDelPiano" : "fuori";

    let segno = null;
    if (g.giorno === oggi) segno = fatta && fatte.length ? "fatta" : "oggi";
    else if (via && !p) segno = via.a ? "spostata" : "saltata";
    else if (passato && p && p.facoltativa !== true && !fatta) segno = "saltata";
    else if (passato && fatte.length) segno = "fatta";
    if (stato === "partenza" || stato === "viaggio") segno = g.giorno === oggi ? "oggi" : null;

    // La riga «rispetto a due settimane fa», solo per la seduta chiave che cresce, il primo giorno.
    let crescita = null;
    if (p && p.chiave && CRESCONO.has(p.tipo) && (p.parte || 1) === 1 && minutiPrima && SETTIMANE_CHE_CRESCONO.has(w.tipo) && num(p.minuti)) {
      crescita = { tipo: p.tipo, minuti: Math.round(p.minuti - minutiPrima) };
    }
    return {
      giorno: g.giorno, oggi: g.giorno === oggi, passato, stato, segno, seduta: p, altre, fatte, fatta,
      via, arrivata: arrivata && p && arrivata.tipo === p.tipo ? arrivata : null, spostata, crescita,
      palestra: sedute.filter((x) => PALESTRA.has(x.tipo)),
    };
  });
}

// --- La riga di un giorno ---

function testoRiga(r) {
  if (r.stato === "partenza") return SETTIMANA.siParte;
  if (r.stato === "viaggio") return SETTIMANA.inViaggio;
  if (r.stato === "dopo") return inBreve({ tipo: "dopoEvento" });
  if (r.seduta) return inBreve(r.seduta);
  if (r.spostata) return inBreve(r.spostata);
  if (r.stato === "primaDelPiano") {
    const a = r.fatte.find((x) => inBici(x)) || r.fatte[0];
    return a ? fattoDescritto(nomeTipo(a.tipo, a.sorgente), a.secondi, inBici(a) ? a.metri : null) : SETTIMANA.primaDelPiano;
  }
  return SETTIMANA.riposo;
}

function segno(chiave) {
  if (!chiave) return null;
  return h("span", { class: ["segno", `segno-${chiave}`] },
    chiave === "fatta" ? icona("check", "icona segno-icona") : null,
    SEGNI[chiave]);
}

// Le righe sotto il come di una seduta, come nella carta di oggi (7.4).
function righeSeduta(s) {
  const righe = [];
  if (s.nota && NOTE[s.nota]) righe.push(NOTE[s.nota]);
  if (s.notteFuori && (s.parte || 1) === 1) righe.push(NOTE.notteFuori);
  if (s.cibo && s.cibo.testo) righe.push(s.cibo.testo);
  else if (s.carboidrati && s.carboidrati.testo) righe.push(s.carboidrati.testo);
  righe.push(...lista(s.limiteFacile));
  return [...new Set(righe.filter(Boolean))];
}

function tastoScheda(ctx, giorno, id) {
  return h("button", {
    class: "bottone bottone-secondario", type: "button", id,
    on: { click: () => { ctx.ui.palestraGiorno = giorno; ctx.azioni.vai("palestra"); } },
  }, SETTIMANA.apriScheda);
}

// La scheda di palestra di un giorno, per dire nome, durata ed esercizi come li dice la scheda. Oggi
// quella del motore, già adattata al semaforo, gli altri giorni quella del piano con il verde.
function schedaDelGiorno(ctx, s, r) {
  if (r.oggi && ctx.palestra && ctx.palestra.oggi) return ctx.palestra.oggi;
  if (!Number.isInteger(s.scheda)) return null;
  return sedutaPalestra(s.scheda, s.settimana, s.seduta, ctx.profilo || {}, lista(ctx.palestra && ctx.palestra.registro), "verde", { oggi: r.giorno });
}

// Il contenuto che si apre sotto una riga. Per oggi e i giorni che vengono il come e il perché della
// seduta, per i giorni passati cosa c'era nel piano e cosa è stato fatto.
function corpo(ctx, r) {
  const dentro = [];
  const s = r.seduta;
  const daFare = !r.passato && (r.stato === "previsto" || r.stato === "fuori");
  if (s && daFare && s.tipo === "palestra") {
    const scheda = schedaDelGiorno(ctx, s, r);
    dentro.push(h("h3", {}, scheda ? scheda.titolo : titoloSeduta(s)));
    dentro.push(h("p", {}, comeSeduta({ tipo: "palestra", quanti: scheda ? scheda.quanti : null })));
    if (r.arrivata) dentro.push(h("p", { class: "settimana-nota" }, arrivaDa(r.arrivata.da)));
    dentro.push(h("p", { class: "settimana-perche" }, PERCHE.palestra));
  } else if (s && daFare) {
    dentro.push(h("h3", {}, titoloSeduta(s)));
    dentro.push(h("p", {}, comeSeduta(s)));
    for (const riga of righeSeduta(s)) dentro.push(h("p", { class: "settimana-riga-piccola" }, riga));
    if (r.arrivata) dentro.push(h("p", { class: "settimana-nota" }, arrivaDa(r.arrivata.da)));
    const perche = [PERCHE[s.tipo], r.crescita ? fraseCrescita(r.crescita.tipo, r.crescita.minuti) : null].filter(Boolean).join(" ");
    if (perche) dentro.push(h("p", { class: "settimana-perche" }, perche));
  } else if (s && r.passato) {
    dentro.push(h("p", {}, nelPiano(s)));
  }
  if (daFare || r.passato) for (const x of r.altre) dentro.push(h("p", {}, sedutaAnche(x)));
  if (r.via) {
    const stessa = Boolean(r.via.a) && lunediDi(r.via.a) === lunediDi(r.giorno);
    const testo = r.via.a
      ? (r.via.motivo === "semaforo" ? testoSpostiamo(r.via.tipo, r.via.a, stessa) : testoSposta(r.via.tipo, r.via.a, stessa))
      : testoSalta(r.via.tipo);
    dentro.push(h("p", { class: "settimana-nota" }, testo));
  }
  if (r.fatte.length && (r.passato || r.oggi)) {
    dentro.push(h("ul", { class: "settimana-fatte" }, r.fatte.map((a) => h("li", {},
      h("span", {}, fattoDescritto(nomeTipo(a.tipo, a.sorgente), a.secondi, inBici(a) ? a.metri : null)),
      a.nome ? h("span", { class: "piccolo" }, a.nome) : null))));
  }
  if (r.segno === "saltata" && !r.via && !r.fatte.length) dentro.push(h("p", { class: "settimana-nota" }, SETTIMANA.saltata));
  if (!s && !r.via && !r.fatte.length && daFare) dentro.push(h("p", { class: "settimana-perche" }, PERCHE.riposo));
  if (!r.passato && r.palestra.length) {
    dentro.push(h("div", { class: "riga-bottoni" }, tastoScheda(ctx, r.giorno, `scheda-${r.giorno}`)));
    if (!r.oggi) dentro.push(h("p", { class: "piccolo" }, SETTIMANA.anteprima));
  }
  return dentro;
}

// Una riga che si apre con un tocco. Lo stato aperto resta in ctx.ui.settimanaAperte, così un ridisegno
// della pagina non la chiude.
function rigaGiorno(ctx, r) {
  const aperte = ctx.ui.settimanaAperte || {};
  const contenuto = corpo(ctx, r);
  const testa = [
    h("span", { class: "settimana-data" }, giornoRiga(r.giorno)),
    h("span", { class: "settimana-seduta" }, testoRiga(r)),
    segno(r.segno),
  ];
  const classi = ["settimana-giorno", r.oggi && "settimana-oggi", r.passato && "settimana-passato"];
  if (!contenuto.length) return h("li", { class: classi }, h("div", { class: "settimana-riga settimana-riga-ferma" }, testa));
  const d = h("details", { class: "settimana-dettagli", open: aperte[r.giorno] || null },
    h("summary", { class: "settimana-riga", id: `giorno-${r.giorno}` }, testa),
    h("div", { class: "settimana-corpo" }, contenuto));
  d.addEventListener("toggle", () => { ctx.ui.settimanaAperte = { ...(ctx.ui.settimanaAperte || {}), [r.giorno]: d.open }; });
  return h("li", { class: classi }, d);
}

// --- Le note della settimana ---

// La domanda del giorno da liberare (3.7). Con il sì il giorno entra nella disponibilità, e il piano si
// rifà da solo. Il no vale per questa apertura, perché il telefono non ha ancora un posto dove tenerlo.
function domandaLibera(ctx, avviso) {
  const no = ctx.ui.liberaNo || {};
  if (no[avviso.giorno]) return h("p", { class: "settimana-libera" }, SETTIMANA.liberaNo);
  const si = () => {
    const d = leggiDisponibilita(ctx.disponibilita || {});
    const dow = (new Date(utc(avviso.giorno)).getUTCDay() + 6) % 7;
    const tetti = [...d.tetti];
    if (tetti[dow] === 0) tetti[dow] = null;
    ctx.azioni.salvaDisponibilita({ giorni: [...new Set([...d.giorni, dow])].sort(), stella: d.stella, ore: d.ore, tetti, dueCose: d.dueCose });
  };
  return h("div", { class: "settimana-libera" },
    h("p", { class: "settimana-libera-domanda" }, avviso.testo),
    h("p", { class: "piccolo" }, liberaAiuto(avviso.giorno)),
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "button", id: `libera-si-${avviso.giorno}`, on: { click: si } }, TASTI.si),
      h("button", {
        class: "bottone bottone-secondario", type: "button", id: `libera-no-${avviso.giorno}`,
        on: { click: () => ctx.azioni.ui("liberaNo", { ...no, [avviso.giorno]: true }) },
      }, TASTI.no)));
}

// Il piano rifatto oggi lo si dice (3.12). Il lunedì è la regola, a metà settimana una scelta nuova.
function notaRifatto(ctx) {
  const p = ctx.piano;
  const w = ctx.settimana;
  if (!p || !p.motore || p.motore.rifatto !== ctx.oggi) return null;
  const nato = p.inizio === w.lunedi && !lista(p.settimane).some((x) => x && x.passata);
  if (nato) return lista(w.giorni).some((g) => g.fuori && g.giorno < ctx.oggi) ? SETTIMANA.nato : null;
  return ctx.oggi === w.lunedi ? SETTIMANA.lunedi : SETTIMANA.rifatto;
}

function note(ctx) {
  const w = ctx.settimana;
  const voci = [];
  const testi = new Set();
  const aggiungi = (t) => { if (t && !testi.has(t)) { testi.add(t); voci.push(h("li", {}, t)); } };
  aggiungi(notaRifatto(ctx));
  for (const a of lista(w.avvisi)) if (a && a.tipo !== "liberaGiorno") aggiungi(a.testo);
  for (const a of lista(ctx.piano && ctx.piano.avvisi)) if (a) aggiungi(a.testo);
  const libere = lista(w.avvisi).filter((a) => a && a.tipo === "liberaGiorno" && DATA.test(a.giorno || "") && a.giorno >= ctx.oggi);
  if (!voci.length && !libere.length) return null;
  return h("section", { class: "sezione", id: "settimana-note", "aria-labelledby": "settimana-note-titolo" },
    h("h2", { id: "settimana-note-titolo" }, SETTIMANA.note),
    libere.map((a) => domandaLibera(ctx, a)),
    voci.length ? h("ul", { class: "settimana-avvisi" }, voci) : null);
}

// --- Aggiungi un giro (6.3) ---

function scelte(nome, opzioni, scelta, classe = "scelte") {
  return h("div", { class: classe }, opzioni.map((o) => {
    const id = `${nome}-${o.valore}`;
    return h("span", { class: "scelta" },
      h("input", { type: "radio", id, name: nome, value: o.valore, checked: String(scelta) === String(o.valore) }),
      h("label", { for: id }, o.testo));
  }));
}

function domanda(legenda, ...figli) {
  return h("fieldset", { class: "domanda" }, h("legend", {}, legenda), ...figli);
}

// Il peso delle borse già scelto, quello dell'obiettivo arrotondato alla scelta più vicina.
function kgPredefiniti(ctx) {
  const p = ctx.profilo || {};
  const percorso = ctx.obiettivo && ctx.obiettivo.percorso;
  const kg = num(p.borseKg) && p.borseKg > 0 ? p.borseKg : percorso && num(percorso.borseKg) && percorso.borseKg > 0 ? percorso.borseKg : 8;
  return GIRO.kgScelte.map((s) => Number(s.valore)).reduce((m, x) => (Math.abs(x - kg) < Math.abs(m - kg) ? x : m));
}

function campoNumero(id, etichetta, valore, attributi = {}) {
  return h("span", { class: "campo giro-campo" },
    h("label", { for: id }, etichetta),
    h("input", { type: "number", id, name: id, inputmode: "numeric", min: "0", value: valore ?? "", ...attributi }));
}

function moduloGiro(ctx) {
  const b = ctx.ui.giroBozza || {};
  const oggi = ctx.oggi;
  const stato = h("p", { class: "stato-salvataggio", role: "status", "aria-live": "polite" });
  const durataScelta = b.durata ?? null;
  const altro = h("div", { class: "giro-altro", hidden: durataScelta !== "altro" || null },
    campoNumero("giro-ore", GIRO.ore, b.ore, { max: "24", step: "1" }),
    campoNumero("giro-minuti", GIRO.minuti, b.minuti, { max: "59", step: "5" }));
  const borseScelte = b.borse ?? "no";
  const kg = h("div", { class: "giro-kg", hidden: borseScelte === "no" || null },
    domanda(GIRO.kg, scelte("giro-kg", GIRO.kgScelte, b.kg ?? kgPredefiniti(ctx))));
  const form = h("form", { class: "giro-modulo", novalidate: true },
    h("p", { class: "sezione-testo" }, GIRO.aiuto),
    domanda(GIRO.tipo, scelte("giro-tipo", GIRO.tipi, b.tipo ?? "Ride")),
    h("div", { class: "campo" },
      h("label", { for: "giro-giorno" }, GIRO.giorno),
      h("input", { type: "date", id: "giro-giorno", name: "giro-giorno", value: b.giorno || oggi, max: oggi, min: piuGiorni(oggi, -60) })),
    domanda(GIRO.durata, scelte("giro-durata", [...GIRO.durate, { valore: "altro", testo: GIRO.altro }], durataScelta), altro),
    domanda(GIRO.sforzo, scelte("giro-sforzo", SFORZO_PAROLE, b.sforzo ?? null)),
    domanda(GIRO.borse, scelte("giro-borse", GIRO.borseScelte, borseScelte), kg),
    h("details", { class: "giro-facoltativi" },
      h("summary", {}, GIRO.facoltativi),
      h("div", { class: "giro-numeri" },
        campoNumero("giro-km", GIRO.km, b.km, { step: "0.1", inputmode: "decimal" }),
        campoNumero("giro-metri", GIRO.metri, b.metri, { step: "10" }))),
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "submit", id: "giro-salva" }, GIRO.salva),
      ctx.demo ? h("span", { class: "piccolo" }, GIRO.demo) : null),
    stato);

  const valore = (nome) => {
    const x = form.querySelector(`input[name="${nome}"]:checked`);
    return x ? x.value : null;
  };
  const numero = (id) => {
    const v = form.querySelector(`#${id}`).value.trim().replace(",", ".");
    const n = v === "" ? null : Number(v);
    return num(n) && n >= 0 ? n : null;
  };
  const leggi = () => ({
    tipo: valore("giro-tipo"), giorno: form.querySelector("#giro-giorno").value || null, durata: valore("giro-durata"),
    ore: form.querySelector("#giro-ore").value, minuti: form.querySelector("#giro-minuti").value, sforzo: valore("giro-sforzo"),
    borse: valore("giro-borse"), kg: valore("giro-kg"), km: form.querySelector("#giro-km").value, metri: form.querySelector("#giro-metri").value,
  });
  form.addEventListener("change", () => {
    const ora = leggi();
    ctx.ui.giroBozza = ora;
    altro.hidden = ora.durata !== "altro";
    kg.hidden = !ora.borse || ora.borse === "no";
  });
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const ora = leggi();
    let minuti = ora.durata && ora.durata !== "altro" ? Number(ora.durata) : null;
    if (ora.durata === "altro") minuti = (numero("giro-ore") || 0) * 60 + (numero("giro-minuti") || 0);
    const giorno = DATA.test(ora.giorno || "") && ora.giorno <= oggi ? ora.giorno : null;
    if (!giorno || !(minuti > 0)) {
      stato.textContent = GIRO.manca;
      const fuoco = !giorno ? form.querySelector("#giro-giorno") : ora.durata === "altro" ? form.querySelector("#giro-ore") : form.querySelector('input[name="giro-durata"]');
      if (fuoco) fuoco.focus();
      return;
    }
    const conBorse = ora.borse && ora.borse !== "no";
    const giro = {
      tipo: ora.tipo || "Ride", giorno, minuti,
      sforzo: ora.sforzo ? Number(ora.sforzo) : null,
      borse: ora.borse || "no",
      kg: conBorse && ora.kg ? Number(ora.kg) : null,
      km: numero("giro-km"), metri: numero("giro-metri"),
    };
    // L'azione ridisegna la pagina, quindi il messaggio e il modulo chiuso vanno detti prima.
    const prima = { aperto: ctx.ui.giroAperto, bozza: ctx.ui.giroBozza };
    ctx.ui.giroAperto = false;
    ctx.ui.giroBozza = null;
    ctx.ui.settimanaMessaggio = giroAggiunto(giorno);
    if (!ctx.azioni.aggiungiGiro(giro)) {
      ctx.ui.giroAperto = prima.aperto;
      ctx.ui.giroBozza = prima.bozza;
      ctx.ui.settimanaMessaggio = null;
      stato.textContent = GIRO.manca;
    }
  });
  return form;
}

// --- In fondo ---

function weekendDaSpostare(ctx) {
  const w = ctx.settimana;
  const sabato = piuGiorni(w.lunedi, 5);
  return lista(w.giorni).some((g) => g && (g.giorno === sabato || g.giorno === piuGiorni(sabato, 1)) && g.giorno >= ctx.oggi
    && lista(g.sedute).some((x) => x && x.tipo !== "riposo" && x.tipo !== "tronco"));
}

function weekendNonPosso(ctx) {
  const r = ctx.azioni.weekendNonPosso();
  let testo = SETTIMANA.weekendNiente;
  if (r) testo = r.testo || (r.esito === "sposta" && r.giorno ? testoSposta("palestra", r.giorno, lunediDi(r.giorno) === lunediDi(ctx.oggi)) : testoSalta("palestra"));
  ctx.azioni.ui("settimanaMessaggio", testo);
}

function inFondo(ctx, messaggio) {
  // Il modulo nasce quando si apre, così da chiuso non lascia campi nascosti dove il fuoco si perderebbe.
  const aperto = Boolean(ctx.ui.giroAperto);
  const giro = h("details", { class: "giro", open: aperto || null },
    h("summary", { class: "bottone bottone-secondario giro-apri", id: "giro-apri" }, GIRO.apri),
    aperto ? moduloGiro(ctx) : null);
  giro.addEventListener("toggle", () => {
    ctx.ui.giroAperto = giro.open;
    if (giro.open && !giro.querySelector("form")) giro.append(moduloGiro(ctx));
  });
  return h("section", { class: "sezione settimana-azioni", id: "settimana-azioni", "aria-labelledby": "settimana-azioni-titolo" },
    h("h2", { id: "settimana-azioni-titolo" }, SETTIMANA.azioni),
    messaggio ? h("p", { class: "salvato", role: "status" }, messaggio) : null,
    giro,
    h("div", { class: "riga-bottoni" },
      weekendDaSpostare(ctx)
        ? h("button", { class: "bottone bottone-secondario", type: "button", id: "weekend-non-posso", on: { click: () => weekendNonPosso(ctx) } }, TASTI.weekendNonPosso)
        : null,
      h("button", {
        class: "collegamento", type: "button", id: "cambia-giorni",
        on: { click: () => { ctx.ui.sezione = "giorni-e-tempo"; ctx.azioni.vai("impostazioni"); } },
      }, TASTI.cambiaGiorni)));
}

// --- La pagina ---

function senzaSettimana(ctx) {
  const p = ctx.piano;
  let testo = SETTIMANA.senzaPiano;
  let scegli = true;
  if (p && p.fase === "evento") { testo = SETTIMANA.evento; scegli = false; }
  else if (p && p.fase === "dopo") { testo = fraseSettimana({ tipo: "dopoEvento" }); scegli = false; }
  else if (p && p.fase === "finito") testo = SETTIMANA.finito;
  else if (p && p.fase === "senzaGiornata") testo = AVVISI.senzaGiornata;
  const partenza = ctx.obiettivo ? ctx.obiettivo.partenza : null;
  return h("div", { class: "vista vista-settimana" },
    intestazione(contoAllaPartenza(ctx.oggi, partenza), SETTIMANA.titolo, testo),
    ctx.demo ? bannerDemo(ctx) : null,
    scegli ? h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "button", id: "settimana-scegli", on: { click: () => ctx.azioni.vai("inizio") } }, SETTIMANA.scegli)) : null);
}

export function vistaSettimana(ctx) {
  const w = ctx.settimana;
  if (!ctx.piano || !w) return senzaSettimana(ctx);
  // Il messaggio di un'azione appena fatta si mostra una volta sola.
  const messaggio = ctx.ui.settimanaMessaggio || null;
  ctx.ui.settimanaMessaggio = null;
  const partenza = ctx.obiettivo ? ctx.obiettivo.partenza : null;
  const righe = righeSettimana(ctx);
  return h("div", { class: "vista vista-settimana" },
    h("header", { class: "intestazione" },
      contoAllaPartenza(ctx.oggi, partenza) ? h("p", { class: "occhiello" }, contoAllaPartenza(ctx.oggi, partenza)) : null,
      h("h1", {}, SETTIMANA.titolo),
      w.frase ? h("p", { class: "attacco" }, w.frase) : null,
      h("p", { class: "piccolo" }, intervallo(w.lunedi))),
    ctx.demo ? bannerDemo(ctx) : null,
    h("section", { class: "sezione", "aria-labelledby": "settimana-giorni-titolo" },
      h("h2", { id: "settimana-giorni-titolo", class: "nascosto" }, SETTIMANA.giorni),
      h("ol", { class: "carta settimana-giorni" }, righe.map((r) => rigaGiorno(ctx, r)))),
    note(ctx),
    inFondo(ctx, messaggio));
}
