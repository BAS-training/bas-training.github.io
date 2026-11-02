// Il primo avvio (7.3). Prima, come sempre, il collegamento con intervals.icu e «Prima di entrare», che
// non stanno qui. Poi una domanda per schermata, ognuna con la risposta già scelta, «Avanti» e «Salta»,
// che tiene quella. Cosa prepari, giorni e partenza, i giorni in bici, il tempo di una settimana, la
// palestra e l'età, più due domande per chi non ha giri registrati e «Prima di cominciare» da 40 anni.
// Alla fine le risposte vanno tutte insieme con ctx.azioni.fineInizio, e la pagina mostra «La tua
// avventura». Dal link degli iscritti (6.9) evento, giorni e partenza ci sono già. Con un'avventura
// già scelta la pagina mostra il riepilogo, con «Cambia la tua avventura». Chi arriva dalla versione di
// prima ha l'obiettivo fatto dalla sfida (daSfida), che vale come primo avvio, quindi la pagina parte
// dalle domande, con la prima schermata da scegliere.
// Le scelte non ancora salvate stanno in ctx.ui.inizio, così un ridisegno della pagina non le perde.
// La parte pura (bozza, schermate, controlli e risposte) è esportata e provata con node.

import { h } from "../dom.js?v=202611022140";
import { CATALOGO, trovaPercorso } from "../catalogo.js?v=202611022140";
import { DATI, PIANO, SEMAFORO, STIMA } from "../parametri.js?v=202611022140";
import * as TESTI_PALESTRA from "../palestra.js?v=202611022140";
import * as TESTI_STIMA from "../testi-stima.js?v=202611022140";
import * as TESTI_PRONTO from "../testi-prontezza.js?v=202611022140";
import {
  INIZIO, SCELTA, GIORNI, AVVENTURA, SETTIMANA_INIZIO, TEMPO, GIRI, PALESTRA_INIZIO, ETA, PRIMA_DI_COMINCIARE, RIEPILOGO, COPIA,
  passaggio, rigaPercorso, quale, diSolito, scrittaGiorni, unaPartenza, iscritto, iscrittoTitolo, dettaglioIscritto, scrittaOre, scrittaTempo,
  cosaPrepari, giroDiOre, giroDiKm, giorniDiFila, giorniDiFilaKm, anteprimaCopia, dataDelVia,
} from "../testi-inizio.js?v=202611022140";
import { bannerDemo } from "./comuni.js?v=202611022140";

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const BICI = new Set(DATI.tipiBici);
const SPECIALI = new Set(["libero", "semaforo"]);
const PALESTRE = ["no", "conosco", "mai", "casa"];
const SICUREZZE = ["si", "no", "parlato"];
const ESPERIENZE = [false, 2, 3];
const ORE_A = PIANO.disponibilita.ore;
const CENTRI_MEDIA = STIMA.mediaDichiarata.centri;
const FASCE_ORE = PIANO.storicoDichiarato.centri.length;
const OL = STIMA.obiettivoLibero;
const KM_MASSIMI = 1000;
const METRI_MASSIMI = 20000;
const FASCIA_ORE_PREDEFINITA = 1;          // «2-4 ore», 7.3
const FASCIA_ETA_PREDEFINITA = "40-49";    // 7.3
const ORE_LIBERE_PREDEFINITE = 4;          // il giro lungo di 1.9, stima nostra
const ORE_AL_GIORNO_PREDEFINITE = 5;       // i giorni di fila di 1.9, stima nostra
const STELLA_VERSO = [5, 6, 4, 3, 2, 1, 0]; // sabato, domenica, venerdì e poi indietro, come js/piano.js

const oggetto = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : null);
const copia = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
const lista = (v) => (Array.isArray(v) ? v : []);

// --- La parte pura ---

const partenzeFuture = (percorso, oggi) => lista(percorso && percorso.partenze).filter((d) => DATA.test(d) && d >= oggi).sort();

// Le partenze da proporre, quelle future del catalogo più quella salvata, se è una data valida da oggi
// in poi, così cambiare l'avventura non sposta da sola una data già scelta.
export function partenzeDi(percorso, oggi, salvata = null) {
  const future = partenzeFuture(percorso, oggi);
  if (typeof salvata === "string" && DATA.test(salvata) && salvata >= oggi && !future.includes(salvata)) future.push(salvata);
  return future.sort();
}

// Gli eventi del catalogo con almeno una partenza da oggi in poi, raggruppati per evento nell'ordine
// del catalogo. [{ evento, eventoId, percorsi }].
export function eventiAperti(oggi, catalogo = CATALOGO) {
  const gruppi = [];
  for (const p of lista(catalogo)) {
    if (!p || !partenzeFuture(p, oggi).length) continue;
    let g = gruppi.find((x) => x.evento === p.evento);
    if (!g) {
      g = { evento: p.evento, eventoId: p.eventoId, percorsi: [] };
      gruppi.push(g);
    }
    g.percorsi.push(p);
  }
  return gruppi;
}

// Ci sono giri in bici con la durata letta dal dispositivo nei 182 giorni che l'app legge. Senza, il
// primo avvio chiede la media e le ore di adesso (7.3, 1.4 e 3.1).
export function giriLeggibili(attivita) {
  return lista(attivita).some((a) => a && BICI.has(a.tipo) && !a.stub && !a.manuale && a.secondi > 0
    && (!oggetto(a.qualita) || a.qualita.secondi === "vera"));
}

// L'invito degli iscritti ancora da usare, cioè valido, con una partenza da oggi in poi e diverso
// dall'evento già scelto con il link. Oppure null.
export function invitoInSospeso(ctx) {
  const inv = oggetto(ctx.invito);
  const percorso = inv ? trovaPercorso(inv.percorso) : null;
  if (!percorso || !partenzeDi(percorso, ctx.oggi, inv.partenza).length) return null;
  const ob = oggetto(ctx.obiettivo);
  if (ob && ob.tipo === "evento" && ob.percorsoId === inv.percorso && ob.iscritto) return null;
  return inv;
}

function giorniValidi(percorso, giorni) {
  if (Number.isInteger(giorni) && giorni >= percorso.giorniMin && giorni <= percorso.giorniMax) return giorni;
  const tipici = lista(percorso.giorniTipici).filter(Number.isInteger);
  return tipici.length ? tipici[0] : percorso.giorniMin;
}

function partenzaValida(percorso, oggi, partenza) {
  const possibili = partenzeDi(percorso, oggi, partenza);
  return possibili.includes(partenza) ? partenza : possibili[0] || null;
}

// L'avventura propria di 1.9, dalle scelte salvate o con i valori già scelti. I giorni di fila vanno a
// ore (misura «ore») oppure con km, metri e fondo di ogni giorno (misura «km»), e sono con le borse
// salvo quando la persona le toglie. Hanno campi propri, così non si mescolano con quelli del giro.
function liberoIniziale(ob) {
  const l = ob && ob.tipo === "libero" ? oggetto(ob.libero) || {} : {};
  const tipo = ["ore", "giro", "giorni"].includes(l.tipo) ? l.tipo : "ore";
  const giorniKm = tipo === "giorni" && l.misura === "km";
  return {
    tipo,
    ore: tipo === "ore" && OL.oreGiro.includes(l.ore) ? l.ore : ORE_LIBERE_PREDEFINITE,
    km: tipo === "giro" && l.km > 0 ? l.km : null,
    metri: tipo === "giro" && l.metri >= 0 ? l.metri : null,
    fondo: tipo === "giro" && Object.hasOwn(OL.classi, l.fondo) ? l.fondo : "strada",
    conBorse: tipo === "giro" && l.conBorse === true,
    giorni: tipo === "giorni" && OL.giorniDiFila.includes(l.giorni) ? l.giorni : OL.giorniDiFila[0],
    misura: giorniKm ? "km" : "ore",
    oreGiorno: tipo === "giorni" && OL.oreGiro.includes(l.ore) ? l.ore : ORE_AL_GIORNO_PREDEFINITE,
    kmGiorno: giorniKm && l.km > 0 ? l.km : null,
    metriGiorno: giorniKm && l.metri >= 0 ? l.metri : null,
    fondoGiorni: giorniKm && Object.hasOwn(OL.classi, l.fondo) ? l.fondo : "strada",
    borseGiorni: tipo === "giorni" ? l.conBorse !== false : true,
  };
}

function stellaFra(giorni, preferita) {
  if (giorni.includes(preferita)) return preferita;
  return STELLA_VERSO.find((g) => giorni.includes(g)) ?? null;
}

function settimanaIniziale(d) {
  const scelti = lista(d.giorni).filter((g) => Number.isInteger(g) && g >= 0 && g <= 6);
  const giorniBici = [...new Set(scelti.length ? scelti : PIANO.disponibilita.giorni)].sort();
  return { giorniBici, stella: stellaFra(giorniBici, Number.isInteger(d.stella) ? d.stella : PIANO.disponibilita.stella) };
}

// Le ore della settimana fra le scelte di 3.1. Un valore scritto in Impostazioni che non è fra le scelte
// va alla scelta più vicina sotto, la lettura prudente.
function oreIniziali(ore) {
  if (!(typeof ore === "number" && ore > 0)) return PIANO.disponibilita.orePredefinite;
  const sotto = ORE_A.filter((x) => x <= ore);
  return sotto.length ? sotto[sotto.length - 1] : ORE_A[0];
}

const RISPOSTE_DEL_PASSO = {
  giorni: ["scelta", "giorni", "partenza", "esperienza", "libero", "data"],
  settimana: ["giorniBici", "stella"],
  tempo: ["ore"],
  giri: ["media", "fasciaOre"],
  palestra: ["palestra", "sicurezza", "altriSport"],
  eta: ["fasciaEta"],
};
const RISPOSTE = [...new Set(Object.values(RISPOSTE_DEL_PASSO).flat())];

// La bozza del primo avvio. ctx ha oggi, obiettivo, profilo, disponibilita, invito, attivita e
// primoAvvio, come il ctx delle pagine. Con un'avventura già scelta le risposte già scelte sono le sue.
export function bozzaIniziale(ctx) {
  const oggi = ctx.oggi;
  const ob = oggetto(ctx.obiettivo);
  const p = oggetto(ctx.profilo) || {};
  const d = oggetto(ctx.disponibilita) || {};
  const inv = ctx.primoAvvio ? invitoInSospeso(ctx) : null;
  let scelta = null;
  let giorni = null;
  let partenza = null;
  if (inv) {
    scelta = inv.percorso;
    giorni = inv.giorni;
    partenza = inv.partenza;
  } else if (ob && ob.tipo === "evento" && ob.percorsoId) {
    scelta = ob.percorsoId;
    giorni = ob.giorni;
    partenza = ob.partenza;
  } else if (ob && SPECIALI.has(ob.tipo) && !ob.daSfida) {
    // L'obiettivo fatto dalla sfida di prima non è una scelta, la prima schermata resta da scegliere.
    // Le sue ore e la sua data restano già scelte, se si sceglie un'avventura propria.
    scelta = ob.tipo;
  }
  const percorso = scelta && !SPECIALI.has(scelta) ? trovaPercorso(scelta) : null;
  if (scelta && !SPECIALI.has(scelta) && (!percorso || !partenzeDi(percorso, oggi, partenza).length)) scelta = null;
  const mediaSalvata = CENTRI_MEDIA.indexOf(p.mediaDichiarata);
  const b = {
    passo: inv ? "giorni" : "scelta",
    dalInvito: Boolean(inv),
    chiediGiri: !giriLeggibili(ctx.attivita),
    scelta,
    giorni: scelta && percorso ? giorniValidi(percorso, giorni) : null,
    partenza: scelta && percorso ? partenzaValida(percorso, oggi, partenza) : null,
    esperienza: ESPERIENZE.includes(p.esperienza) ? p.esperienza : false,
    libero: liberoIniziale(ob),
    data: ob && ob.tipo === "libero" && DATA.test(ob.partenza || "") && ob.partenza >= oggi ? ob.partenza : "",
    ...settimanaIniziale(d),
    ore: oreIniziali(d.ore),
    media: mediaSalvata >= 0 ? mediaSalvata : null,
    fasciaOre: Number.isInteger(p.fasciaOre) && p.fasciaOre >= 0 && p.fasciaOre < FASCE_ORE ? p.fasciaOre : FASCIA_ORE_PREDEFINITA,
    palestra: PALESTRE.includes(p.palestra) ? p.palestra : "no",
    sicurezza: SICUREZZE.includes(p.palestraSicurezza) ? p.palestraSicurezza : null,
    altriSport: typeof p.altriSport === "boolean" ? p.altriSport : false,
    fasciaEta: SEMAFORO.fasceEta.includes(p.fasciaEta) ? p.fasciaEta : FASCIA_ETA_PREDEFINITA,
  };
  b.origine = { scelta: b.scelta, giorni: b.giorni, partenza: b.partenza };
  b.iniziale = Object.fromEntries(RISPOSTE.map((k) => [k, copia(b[k])]));
  return b;
}

// La scelta della schermata 1. Con un evento nuovo giorni e partenza tornano ai valori già scelti
// di quell'evento, quelli salvati se è l'evento di prima.
export function scegli(b, valore, oggi) {
  if (b.scelta === valore) return;
  b.scelta = valore;
  const percorso = SPECIALI.has(valore) ? null : trovaPercorso(valore);
  const prima = b.origine && b.origine.scelta === valore ? b.origine : {};
  b.giorni = percorso ? giorniValidi(percorso, prima.giorni) : null;
  b.partenza = percorso ? partenzaValida(percorso, oggi, prima.partenza) : null;
  b.iniziale.scelta = valore;
  b.iniziale.giorni = b.giorni;
  b.iniziale.partenza = b.partenza;
}

// Le schermate, nell'ordine, senza «Prima di cominciare». Con il solo semaforo restano la scelta e
// l'età. Dal link degli iscritti la scelta si salta.
export function passiDi(b) {
  if (b.scelta === "semaforo") return ["scelta", "eta"];
  const passi = b.dalInvito ? ["giorni"] : ["scelta", "giorni"];
  passi.push("settimana", "tempo");
  if (b.chiediGiri) passi.push("giri");
  passi.push("palestra", "eta");
  return passi;
}

// «Prima di cominciare» compare da 40 anni, una volta sola (regola 5.17).
export function serveCuore(b, profilo = {}) {
  return b.fasciaEta !== SEMAFORO.fasceEta[0] && !DATA.test((oggetto(profilo) || {}).primaDiCominciare || "");
}

// «Salta» tiene la risposta già scelta della schermata.
export function ripristina(b, passo) {
  for (const k of RISPOSTE_DEL_PASSO[passo] || []) {
    if (k === "scelta") continue;
    b[k] = copia(b.iniziale[k]);
  }
}

const numeroDa = (testo) => {
  const t = String(testo ?? "").trim().replace(/\./g, "");
  return /^\d{1,6}$/.test(t) ? Number(t) : t === "" ? null : NaN;
};

// Il controllo prima di «Avanti». Restituisce null, oppure { campo, testo } con l'id del campo da
// portare in vista e il testo da dire.
export function controlla(b, passo, oggi) {
  if (passo === "scelta" && !b.scelta) return { campo: "inizio-scelta-0", testo: INIZIO.scegliPrima };
  if (passo === "giorni" && b.scelta === "libero") {
    const l = b.libero;
    if (l.tipo === "giro") {
      if (!(Number.isInteger(l.km) && l.km >= 1 && l.km <= KM_MASSIMI)) return { campo: "inizio-km", testo: AVVENTURA.kmManca };
      if (l.metri !== null && !(Number.isInteger(l.metri) && l.metri >= 0 && l.metri <= METRI_MASSIMI)) return { campo: "inizio-metri", testo: AVVENTURA.metriSbagliati };
    }
    if (l.tipo === "giorni" && l.misura === "km") {
      if (!(Number.isInteger(l.kmGiorno) && l.kmGiorno >= 1 && l.kmGiorno <= KM_MASSIMI)) return { campo: "inizio-km-giorno", testo: AVVENTURA.kmGiornoManca };
      if (l.metriGiorno !== null && !(Number.isInteger(l.metriGiorno) && l.metriGiorno >= 0 && l.metriGiorno <= METRI_MASSIMI)) {
        return { campo: "inizio-metri-giorno", testo: AVVENTURA.metriSbagliati };
      }
    }
    if (b.data && (!DATA.test(b.data) || b.data < oggi)) return { campo: "inizio-data", testo: AVVENTURA.dataSbagliata };
  }
  if (passo === "settimana" && !b.giorniBici.length) return { campo: "inizio-giorno-0", testo: SETTIMANA_INIZIO.nessuno };
  return null;
}

// Le risposte per ctx.azioni.fineInizio, { obiettivo, disponibilita, profilo }. disponibilita è null
// con il solo semaforo. Della disponibilità salvata restano i tetti dei giorni e le due cose nello
// stesso giorno, scelti in Impostazioni, salvo il «niente» di un giorno che adesso è fra quelli in bici.
export function risposte(b, ctx) {
  const profilo = { fasciaEta: b.fasciaEta };
  if (b.scelta === "semaforo") return { obiettivo: { tipo: "semaforo" }, disponibilita: null, profilo };
  profilo.esperienza = b.esperienza;
  profilo.palestra = b.palestra;
  if (b.palestra !== "no" && (b.sicurezza === "si" || b.sicurezza === "no")) profilo.palestraSicurezza = b.sicurezza;
  if (b.palestra === "mai" || b.palestra === "casa") profilo.altriSport = b.altriSport === true;
  if (b.chiediGiri) {
    profilo.mediaDichiarata = Number.isInteger(b.media) ? CENTRI_MEDIA[b.media] : null;
    profilo.fasciaOre = b.fasciaOre;
  }
  const prima = oggetto(ctx.disponibilita) || {};
  const tetti = Array.from({ length: 7 }, (_, i) => {
    const t = Array.isArray(prima.tetti) ? prima.tetti[i] : null;
    if (typeof t !== "number" || !(t >= 0)) return null;
    return t === 0 && b.giorniBici.includes(i) ? null : t;
  });
  const giorni = [...b.giorniBici].sort();
  const disponibilita = { giorni, stella: stellaFra(giorni, b.stella), ore: b.ore, tetti, dueCose: prima.dueCose === true };
  let obiettivo;
  if (b.scelta === "libero") {
    const l = b.libero;
    const partenza = b.data && DATA.test(b.data) ? b.data : null;
    // I giorni di fila sono con le borse, salvo quando la persona toglie la spunta.
    const conBorse = l.borseGiorni !== false;
    if (l.tipo === "giro") {
      obiettivo = { tipo: "libero", libero: "giro", km: l.km, metri: l.metri ?? 0, fondo: l.fondo, conBorse: l.conBorse === true, partenza };
    } else if (l.tipo === "giorni" && l.misura === "km") {
      obiettivo = { tipo: "libero", libero: "giorni", giorni: l.giorni, misura: "km", km: l.kmGiorno, metri: l.metriGiorno ?? 0, fondo: l.fondoGiorni, conBorse, partenza };
    } else if (l.tipo === "giorni") {
      obiettivo = { tipo: "libero", libero: "giorni", giorni: l.giorni, misura: "ore", ore: l.oreGiorno, conBorse, partenza };
    } else {
      obiettivo = { tipo: "libero", libero: "ore", ore: l.ore, partenza };
    }
  } else {
    // Il link degli iscritti vale per il suo evento anche quando la persona lo sceglie a mano.
    const inv = oggetto(ctx.invito);
    const conInvito = Boolean(inv && inv.percorso === b.scelta);
    const ob = oggetto(ctx.obiettivo);
    const giaIscritto = Boolean(ob && ob.tipo === "evento" && ob.percorsoId === b.scelta && ob.iscritto);
    obiettivo = { tipo: "evento", percorso: b.scelta, giorni: b.giorni, partenza: b.partenza, iscritto: conInvito || giaIscritto };
  }
  return { obiettivo, disponibilita, profilo };
}

// --- I pezzi della pagina ---

function testa(occhiello, titolo, attacco, idOcchiello = null) {
  return h("header", { class: "intestazione" },
    occhiello ? h("p", { class: "occhiello", id: idOcchiello }, occhiello) : null,
    h("h1", { id: "inizio-titolo", tabindex: "-1" }, titolo),
    attacco ? h("p", { class: "attacco" }, attacco) : null);
}

// Il titolo in vista e con il fuoco, a ogni schermata nuova.
function portaSu() {
  const titolo = document.getElementById("inizio-titolo");
  if (!titolo) return;
  window.scrollTo(0, 0);
  titolo.focus({ preventScroll: true });
}

// Un pezzo della pagina che si ridisegna da solo quando cambia una risposta, senza ridisegnare la
// pagina intera, così il fuoco resta dov'è. Chi usa un lettore di schermo sente cosa è cambiato.
function zona(id, disegna) {
  const el = h("div", { class: "inizio-zona", id, "aria-live": "polite" });
  const rifai = () => el.replaceChildren(...[disegna()].flat(Infinity).filter(Boolean));
  rifai();
  return { el, rifai };
}

// Un gruppo di scelte a un tocco. scelte è [{ valore, testo }], valore quella già scelta. Il valore vero
// resta nella funzione, l'attributo value ne è solo il testo.
function gruppo(nome, domanda, scelte, valore, cambia, { aiuto = null, nascosta = false } = {}) {
  const idAiuto = aiuto ? `${nome}-aiuto` : null;
  return h("fieldset", { class: "domanda", id: `${nome}-gruppo`, "aria-describedby": idAiuto },
    h("legend", { class: nascosta ? "nascosto" : null }, domanda),
    aiuto ? h("p", { class: "piccolo", id: idAiuto }, aiuto) : null,
    h("div", { class: "scelte" }, scelte.map((s, i) => {
      const id = `${nome}-${i}`;
      return h("span", { class: "scelta" },
        h("input", { type: "radio", id, name: nome, value: String(s.valore), checked: s.valore === valore,
          on: { change: () => cambia(s.valore) } }),
        h("label", { for: id }, s.testo));
    })));
}

function campoTesto(id, etichetta, valore, cambia, { aiuto = null } = {}) {
  const idAiuto = aiuto ? `${id}-aiuto` : null;
  return h("div", { class: "campo" },
    h("label", { for: id }, etichetta),
    aiuto ? h("p", { class: "piccolo", id: idAiuto }, aiuto) : null,
    h("input", { type: "text", id, inputmode: "numeric", autocomplete: "off", class: "inizio-numero",
      value: valore === null || valore === undefined ? "" : String(valore), "aria-describedby": idAiuto,
      on: { input: (e) => cambia(numeroDa(e.target.value)) } }));
}

// Le domande della palestra stanno in js/palestra.js. Se quel file cambiasse forma vale la copia di riserva.
function domandePalestra() {
  const d = TESTI_PALESTRA.DOMANDE_PALESTRA;
  const R = PALESTRA_INIZIO.riserva;
  const buona = (x) => oggetto(x) && typeof x.testo === "string" && Array.isArray(x.scelte);
  const sicurezzaSi = oggetto(TESTI_PALESTRA.TESTI_PALESTRA) && oggetto(TESTI_PALESTRA.TESTI_PALESTRA.messaggi)
    && typeof TESTI_PALESTRA.TESTI_PALESTRA.messaggi.sicurezza === "string" ? TESTI_PALESTRA.TESTI_PALESTRA.messaggi.sicurezza : R.sicurezzaSi;
  return {
    palestra: d && buona(d.palestra) ? d.palestra : R.palestra,
    sicurezza: d && buona(d.sicurezza) ? d.sicurezza : R.sicurezza,
    sicurezzaSi,
  };
}

const testoDi = (fn, ...argomenti) => {
  if (typeof fn !== "function") return null;
  try { return fn(...argomenti); } catch { return null; }
};

// --- Le schermate ---

function corpoScelta(ctx, b, aggiornaPassaggio) {
  const nome = "inizio-scelta";
  let k = 0;
  const opzione = (valore, titolo, sotto) => {
    const id = `${nome}-${k++}`;
    return h("span", { class: "inizio-opzione" },
      h("input", { type: "radio", id, name: nome, value: valore, checked: b.scelta === valore,
        on: { change: () => { scegli(b, valore, ctx.oggi); aggiornaPassaggio(); } } }),
      h("label", { for: id }, h("strong", {}, titolo), sotto ? h("span", {}, sotto) : null));
  };
  const gruppi = eventiAperti(ctx.oggi);
  return {
    titolo: SCELTA.titolo,
    attacco: SCELTA.attacco,
    contenuto: h("fieldset", { class: "domanda inizio-scelta", id: `${nome}-gruppo` },
      h("legend", { class: "nascosto" }, SCELTA.titolo),
      gruppi.map((g) => h("fieldset", { class: "inizio-evento" },
        h("legend", {}, g.evento),
        h("div", { class: "inizio-opzioni" }, g.percorsi.map((p) => opzione(p.id, p.nome, rigaPercorso(p.km, p.dislivello)))))),
      gruppi.length ? null : h("p", { class: "piccolo" }, SCELTA.nessunEvento),
      h("fieldset", { class: "inizio-evento" },
        h("legend", {}, SCELTA.altro),
        h("div", { class: "inizio-opzioni" },
          opzione("libero", SCELTA.avventura, SCELTA.avventuraSotto),
          opzione("semaforo", SCELTA.semaforo, SCELTA.semaforoSotto)))),
  };
}

function domandaEsperienza(b) {
  const E = GIORNI.esperienza;
  return gruppo("inizio-esperienza", E.domanda, E.scelte, b.esperienza, (v) => { b.esperienza = v; });
}

function corpoGiorni(ctx, b) {
  if (b.scelta === "libero") return corpoAvventura(ctx, b);
  const p = trovaPercorso(b.scelta);
  const parti = [];
  const partenze = partenzeDi(p, ctx.oggi, b.partenza);
  if (!partenze.includes(b.partenza)) b.partenza = partenze[0] || null;
  const chiediGiorni = !b.dalInvito || !Number.isInteger(ctx.invito && ctx.invito.giorni);
  const chiediPartenza = !b.dalInvito || !(ctx.invito && ctx.invito.partenza);
  if (chiediGiorni) {
    if (p.giorniMin === p.giorniMax) {
      parti.push(h("p", { class: "inizio-nota" }, p.giorniMin === 1 ? GIORNI.unGiorno : scrittaGiorni(p.giorniMin)));
    } else {
      const scelte = [];
      for (let n = p.giorniMin; n <= p.giorniMax; n++) scelte.push({ valore: n, testo: String(n) });
      parti.push(gruppo("inizio-giorni", GIORNI.quanti, scelte, b.giorni, (v) => { b.giorni = v; }, { aiuto: diSolito(p.giorniTipici) }));
    }
    if (p.modello && p.modello.giorniDalVia) parti.push(h("p", { class: "piccolo" }, GIORNI.dalVia));
  }
  if (chiediPartenza) {
    if (partenze.length === 1) parti.push(h("p", { class: "inizio-nota" }, unaPartenza(dataDelVia(partenze[0], ctx.oggi))));
    else parti.push(gruppo("inizio-partenza", GIORNI.quando, partenze.map((d) => ({ valore: d, testo: dataDelVia(d, ctx.oggi) })), b.partenza, (v) => { b.partenza = v; }));
  }
  parti.push(domandaEsperienza(b));
  if (b.dalInvito) {
    parti.push(h("p", {}, h("button", { class: "collegamento", type: "button", id: "inizio-altra",
      on: { click: () => { b.dalInvito = false; b.scelta = null; cambiaPasso(ctx, b, "scelta"); } } }, GIORNI.altraAvventura)));
    return {
      titolo: iscrittoTitolo(p.eventoId, p.evento, (b.partenza || "").slice(0, 4)),
      attacco: [dettaglioIscritto(p.nome, b.giorni, dataDelVia(b.partenza, ctx.oggi)), GIORNI.attaccoIscritto].filter(Boolean).join(" "),
      contenuto: parti,
    };
  }
  return { titolo: GIORNI.titolo, attacco: [quale(p.evento, p.nome), GIORNI.attacco].filter(Boolean).join(" "), contenuto: parti };
}

function dettagliAvventura(b) {
  const l = b.libero;
  const A = AVVENTURA;
  const ore = OL.oreGiro.map((n) => ({ valore: n, testo: scrittaOre(n) }));
  if (l.tipo === "giro") {
    return [
      campoTesto("inizio-km", A.km, l.km, (v) => { l.km = v; }),
      campoTesto("inizio-metri", A.metri, l.metri, (v) => { l.metri = v; }, { aiuto: A.metriAiuto }),
      gruppo("inizio-fondo", A.fondo, A.fondi, l.fondo, (v) => { l.fondo = v; }),
      h("span", { class: "spunta" },
        h("input", { type: "checkbox", id: "inizio-borse", checked: l.conBorse, on: { change: (e) => { l.conBorse = e.target.checked; } } }),
        h("label", { for: "inizio-borse" }, A.borse)),
    ];
  }
  if (l.tipo === "giorni") {
    // Ogni giorno a ore oppure con km, salita e fondo. Cambiando misura si ridisegna solo quella parte.
    const giornata = zona("inizio-giornata", () => (l.misura === "km"
      ? [
        campoTesto("inizio-km-giorno", A.kmGiorno, l.kmGiorno, (v) => { l.kmGiorno = v; }),
        campoTesto("inizio-metri-giorno", A.metriGiorno, l.metriGiorno, (v) => { l.metriGiorno = v; }, { aiuto: A.metriAiuto }),
        gruppo("inizio-fondo-giorni", A.fondo, A.fondi, l.fondoGiorni, (v) => { l.fondoGiorni = v; }),
      ]
      : gruppo("inizio-ore-giorno", A.oreGiorno, ore, l.oreGiorno, (v) => { l.oreGiorno = v; })));
    return [
      gruppo("inizio-giorni-fila", A.giorniDomanda, OL.giorniDiFila.map((n) => ({ valore: n, testo: String(n) })), l.giorni, (v) => { l.giorni = v; }),
      gruppo("inizio-misura", A.misura, A.misure, l.misura, (v) => { l.misura = v; giornata.rifai(); }),
      giornata.el,
      h("span", { class: "spunta" },
        h("input", { type: "checkbox", id: "inizio-borse-giorni", checked: l.borseGiorni, on: { change: (e) => { l.borseGiorni = e.target.checked; } } }),
        h("label", { for: "inizio-borse-giorni" }, A.borseGiorni)),
    ];
  }
  return [gruppo("inizio-ore-giro", A.oreDomanda, ore, l.ore, (v) => { l.ore = v; })];
}

function corpoAvventura(ctx, b) {
  const A = AVVENTURA;
  const dettagli = zona("inizio-avventura", () => dettagliAvventura(b));
  const data = h("input", { type: "date", id: "inizio-data", min: ctx.oggi, value: b.data || "", "aria-describedby": "inizio-data-aiuto",
    on: { input: (e) => { b.data = e.target.value; }, change: (e) => { b.data = e.target.value; } } });
  return {
    titolo: A.titolo,
    attacco: A.attacco,
    contenuto: [
      gruppo("inizio-tipo", A.tipo, A.tipi, b.libero.tipo, (v) => { b.libero.tipo = v; dettagli.rifai(); }),
      dettagli.el,
      h("div", { class: "campo" },
        h("label", { for: "inizio-data" }, A.data),
        h("p", { class: "piccolo", id: "inizio-data-aiuto" }, A.dataAiuto),
        data),
      domandaEsperienza(b),
    ],
  };
}

function corpoSettimana(ctx, b) {
  const S = SETTIMANA_INIZIO;
  const stella = zona("inizio-stella", () => (b.giorniBici.length
    ? gruppo("inizio-lunga", S.stella, b.giorniBici.map((g) => ({ valore: g, testo: S.nomi[g] })), b.stella, (v) => { b.stella = v; })
    : null));
  const giorni = h("fieldset", { class: "domanda", id: "inizio-giorni-bici" },
    h("legend", {}, S.giorni),
    h("div", { class: "scelte" }, S.nomi.map((nome, i) => {
      const id = `inizio-giorno-${i}`;
      return h("span", { class: "scelta" },
        h("input", { type: "checkbox", id, value: String(i), checked: b.giorniBici.includes(i), on: { change: (e) => {
          const altri = b.giorniBici.filter((g) => g !== i);
          b.giorniBici = (e.target.checked ? [...altri, i] : altri).sort();
          b.stella = stellaFra(b.giorniBici, b.stella);
          stella.rifai();
        } } }),
        h("label", { for: id }, nome));
    })));
  return { titolo: S.titolo, attacco: S.attacco, contenuto: [giorni, stella.el] };
}

function corpoTempo(ctx, b) {
  const scelte = ORE_A.map((n, i) => ({ valore: n, testo: scrittaTempo(n, i === ORE_A.length - 1) }));
  return { titolo: TEMPO.titolo, attacco: TEMPO.attacco, contenuto: gruppo("inizio-ore", TEMPO.titolo, scelte, b.ore, (v) => { b.ore = v; }, { nascosta: true }) };
}

function corpoGiri(ctx, b) {
  const medie = [...GIRI.medie.map((testo, i) => ({ valore: i, testo })), { valore: null, testo: GIRI.nonSo }];
  const fasce = GIRI.fasce.map((testo, i) => ({ valore: i, testo }));
  return {
    titolo: GIRI.titolo,
    attacco: GIRI.attacco,
    contenuto: [
      gruppo("inizio-media", GIRI.media, medie, b.media, (v) => { b.media = v; }),
      gruppo("inizio-fascia-ore", GIRI.ore, fasce, b.fasciaOre, (v) => { b.fasciaOre = v; }),
    ],
  };
}

function corpoPalestra(ctx, b) {
  const D = domandePalestra();
  const altre = zona("inizio-palestra-altre", () => {
    if (b.palestra === "no") return null;
    const pezzi = [];
    if (b.sicurezza !== "parlato") {
      const messaggio = h("p", { class: "avviso-piccolo", id: "inizio-sicurezza-si", hidden: b.sicurezza !== "si" }, D.sicurezzaSi);
      pezzi.push(gruppo("inizio-sicurezza", D.sicurezza.testo, D.sicurezza.scelte, b.sicurezza,
        (v) => { b.sicurezza = v; messaggio.hidden = v !== "si"; }, { aiuto: PALESTRA_INIZIO.sicurezzaAiuto }), messaggio);
    }
    if (b.palestra === "mai" || b.palestra === "casa") {
      const S = PALESTRA_INIZIO.altriSport;
      pezzi.push(gruppo("inizio-altri-sport", S.domanda, S.scelte, b.altriSport, (v) => { b.altriSport = v; }, { aiuto: S.aiuto }));
    }
    return pezzi;
  });
  return {
    titolo: D.palestra.testo,
    attacco: PALESTRA_INIZIO.attacco,
    contenuto: [
      gruppo("inizio-palestra", D.palestra.testo, D.palestra.scelte, b.palestra, (v) => { b.palestra = v; altre.rifai(); }, { nascosta: true }),
      altre.el,
    ],
  };
}

function corpoEta(ctx, b) {
  return { titolo: ETA.titolo, attacco: ETA.attacco, contenuto: gruppo("inizio-eta", ETA.titolo, ETA.scelte, b.fasciaEta, (v) => { b.fasciaEta = v; }, { nascosta: true }) };
}

const CORPI = { scelta: corpoScelta, giorni: corpoGiorni, settimana: corpoSettimana, tempo: corpoTempo, giri: corpoGiri, palestra: corpoPalestra, eta: corpoEta };

// --- Il giro fra le schermate ---

function cambiaPasso(ctx, b, passo) {
  b.passo = passo;
  ctx.azioni.ui("inizio", b);
  portaSu();
}

function mostraErrore(errore) {
  const riga = document.getElementById("inizio-errore");
  if (riga) riga.textContent = errore.testo;
  const campo = errore.campo ? document.getElementById(errore.campo) : null;
  if (campo) {
    campo.focus({ preventScroll: true });
    campo.scrollIntoView({ block: "center" });
  }
}

function prossimo(ctx, b) {
  const passi = passiDi(b);
  const i = passi.indexOf(b.passo);
  if (i >= 0 && i < passi.length - 1) { cambiaPasso(ctx, b, passi[i + 1]); return; }
  if (b.passo !== "cuore" && serveCuore(b, ctx.profilo)) { cambiaPasso(ctx, b, "cuore"); return; }
  salva(ctx, b);
}

function avanti(ctx, b) {
  const riga = document.getElementById("inizio-errore");
  if (riga) riga.textContent = "";
  const errore = controlla(b, b.passo, ctx.oggi);
  if (errore) { mostraErrore(errore); return; }
  prossimo(ctx, b);
}

function salta(ctx, b) {
  ripristina(b, b.passo);
  prossimo(ctx, b);
}

// Tutte le risposte insieme. Con il solo semaforo si va a Oggi, altrimenti la pagina diventa il
// riepilogo «La tua avventura».
function salva(ctx, b) {
  const { obiettivo, disponibilita, profilo } = risposte(b, ctx);
  if (b.passo === "cuore") profilo.primaDiCominciare = ctx.oggi;
  ctx.ui.inizio = null;
  ctx.azioni.fineInizio({ obiettivo, disponibilita, profilo });
  if (obiettivo.tipo === "semaforo") {
    ctx.azioni.vai("oggi");
    return;
  }
  portaSu();
}

function tasti(ctx, b) {
  const passi = passiDi(b);
  const i = passi.indexOf(b.passo);
  const ultimo = i === passi.length - 1 && !serveCuore(b, ctx.profilo);
  const indietro = i > 0 ? passi[i - 1] : null;
  return h("div", { class: "inizio-tasti" },
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "submit", id: `inizio-avanti-${b.passo}` }, ultimo ? INIZIO.tasti.fatto : INIZIO.tasti.avanti),
      b.passo !== "scelta"
        ? h("button", { class: "bottone bottone-secondario", type: "button", id: `inizio-salta-${b.passo}`, on: { click: () => salta(ctx, b) } }, INIZIO.tasti.salta)
        : null),
    indietro
      ? h("p", {}, h("button", { class: "collegamento", type: "button", id: `inizio-prima-${b.passo}`, on: { click: () => cambiaPasso(ctx, b, indietro) } }, INIZIO.tasti.prima))
      : null,
    // Al primo avvio non c'è un'avventura scelta da lasciare com'è, nemmeno con l'obiettivo di prima.
    b.passo === "scelta" && ctx.obiettivo && !ctx.primoAvvio
      ? h("p", {}, h("button", { class: "collegamento", type: "button", id: "inizio-lascia", on: { click: () => { ctx.ui.inizio = null; ctx.azioni.ui("inizio", null); portaSu(); } } }, INIZIO.tasti.lascia))
      : null);
}

function schermata(ctx, b) {
  if (b.passo === "cuore") return schermataCuore(ctx, b);
  if (!CORPI[b.passo] || (b.passo !== "scelta" && !b.scelta)) b.passo = b.dalInvito ? "giorni" : "scelta";
  const passi = passiDi(b);
  const scritta = () => passaggio(passiDi(b).indexOf(b.passo) + 1, passiDi(b).length);
  const aggiornaPassaggio = () => {
    const el = document.getElementById("inizio-passaggio");
    if (el) el.textContent = scritta();
  };
  const corpo = CORPI[b.passo](ctx, b, aggiornaPassaggio);
  return h("div", { class: "vista vista-testo vista-inizio" },
    ctx.demo ? bannerDemo(ctx) : null,
    testa(passaggio(passi.indexOf(b.passo) + 1, passi.length), corpo.titolo, corpo.attacco, "inizio-passaggio"),
    b.passo === "scelta" ? copiaRipresa(ctx) : null,
    b.passo === "scelta" && ctx.primoAvvio ? h("p", { class: "inizio-nota" }, INIZIO.attacco) : null,
    // «Riprendi da una copia» è per un telefono nuovo, non per chi ha già qui l'obiettivo di prima.
    b.passo === "scelta" && ctx.primoAvvio && !ctx.obiettivo && !ctx.demo ? boxCopia(ctx) : null,
    h("form", { class: "inizio-modulo", id: "inizio-modulo", novalidate: true, on: { submit: (e) => { e.preventDefault(); avanti(ctx, b); } } },
      corpo.contenuto,
      h("p", { class: "inizio-errore", id: "inizio-errore", role: "alert" }),
      tasti(ctx, b)));
}

function schermataCuore(ctx, b) {
  return h("div", { class: "vista vista-testo vista-inizio" },
    ctx.demo ? bannerDemo(ctx) : null,
    testa(null, PRIMA_DI_COMINCIARE.titolo, null),
    h("section", { class: "carta inizio-cuore" },
      h("p", {}, PRIMA_DI_COMINCIARE.testo),
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone", type: "button", id: "inizio-cuore-ok", on: { click: () => salva(ctx, b) } }, PRIMA_DI_COMINCIARE.tasto))));
}

// --- «Riprendi da una copia», in alto su un telefono nuovo (6.6) ---

const NOMI_MOTIVI = Object.keys(COPIA.motivi);

function boxCopia(ctx) {
  const s = oggetto(ctx.ui.inizioCopia) || (ctx.ui.inizioCopia = { file: null, esito: null, leggo: false });
  const box = h("section", { class: "carta inizio-copia", id: "inizio-copia", "aria-labelledby": "inizio-copia-titolo" });
  const esitoRiga = () => {
    if (s.leggo) return h("p", { role: "status" }, COPIA.leggo);
    const e = s.esito;
    if (!e) return null;
    if (e.motivo && NOMI_MOTIVI.includes(e.motivo)) return h("p", { class: "avviso-piccolo", role: "status", id: "inizio-copia-esito" }, COPIA.motivi[e.motivo]);
    const nuove = lista(e.voci).reduce((t, v) => t + (v.nuove || 0), 0);
    const sostituite = lista(e.voci).reduce((t, v) => t + (v.sostituite || 0), 0);
    const testo = anteprimaCopia(e.giorno ? dataDelVia(e.giorno, ctx.oggi) : null, nuove, sostituite);
    if (!testo) return h("p", { role: "status", id: "inizio-copia-esito" }, COPIA.vuota);
    return [
      h("p", { role: "status", id: "inizio-copia-esito" }, testo),
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone", type: "button", id: "inizio-copia-riprendi", on: { click: riprendi } }, COPIA.riprendi),
        h("button", { class: "bottone bottone-secondario", type: "button", id: "inizio-copia-annulla",
          on: { click: () => { s.file = null; s.esito = null; disegna(); } } }, COPIA.annulla)),
    ];
  };
  const disegna = () => box.replaceChildren(
    h("h2", { id: "inizio-copia-titolo" }, COPIA.titolo),
    h("p", {}, COPIA.testo),
    h("div", { class: "inizio-file" },
      h("input", { type: "file", id: "inizio-copia-file", accept: "application/json,.json", class: "inizio-file-campo",
        on: { change: (e) => anteprima(e.target.files && e.target.files[0]) } }),
      h("label", { for: "inizio-copia-file", class: "bottone bottone-secondario" }, COPIA.scegli)),
    ...[esitoRiga()].flat().filter(Boolean));
  async function anteprima(file) {
    if (!file) return;
    s.file = file;
    s.leggo = true;
    disegna();
    try { s.esito = await ctx.azioni.anteprimaCopia(file); } catch { s.esito = { motivo: "illeggibile", voci: [] }; }
    s.leggo = false;
    disegna();
    const riga = document.getElementById("inizio-copia-esito");
    if (riga) { riga.setAttribute("tabindex", "-1"); riga.focus(); }
  }
  async function riprendi() {
    if (!s.file) return;
    s.leggo = true;
    disegna();
    let esito;
    try { esito = await ctx.azioni.riprendiCopia(s.file); } catch { esito = { ok: false, motivo: "illeggibile", voci: [] }; }
    const ripresa = Boolean(esito && (esito.ok || esito.motivo === "memoria"));
    ctx.ui.inizioCopia = { file: null, esito: ripresa ? null : esito, leggo: false, fatto: ripresa, motivo: esito ? esito.motivo : null };
    // Le risposte della copia diventano quelle già scelte, quindi la bozza riparte da lì.
    ctx.ui.inizio = null;
    ctx.azioni.ui("inizioCopia", ctx.ui.inizioCopia);
    portaSu();
  }
  disegna();
  return box;
}

// La riga «Ho ripreso la tua copia», dopo «Riprendi».
function copiaRipresa(ctx) {
  const s = oggetto(ctx.ui.inizioCopia);
  if (!s || !s.fatto) return null;
  return h("p", { class: "salvato", role: "status" }, s.motivo === "memoria" ? COPIA.motivi.memoria : COPIA.fatto);
}

// --- Il riepilogo, «La tua avventura» ---

function descrizione(ob, oggi) {
  const righe = [];
  if (ob.tipo === "evento" && ob.percorso) {
    const p = ob.percorso;
    if (ob.iscritto) righe.push(iscritto(p.eventoId, p.evento, (ob.partenza || "").slice(0, 4)));
    righe.push(cosaPrepari(p.evento, p.nome, ob.giorni));
    if (ob.partenza) righe.push(unaPartenza(dataDelVia(ob.partenza, oggi)));
  } else if (ob.tipo === "libero" && ob.libero) {
    const l = ob.libero;
    if (l.tipo === "giro") righe.push(giroDiKm(l));
    else if (l.tipo === "giorni") righe.push(l.misura === "km" ? giorniDiFilaKm(l) : giorniDiFila(l.giorni, l.ore, l.conBorse !== false));
    else righe.push(giroDiOre(l.ore));
    if (ob.partenza) righe.push(unaPartenza(dataDelVia(ob.partenza, oggi)));
  }
  return righe.filter(Boolean);
}

function righeGiornata(stima) {
  if (!stima || stima.H === null || stima.H === undefined) return [];
  const conGiorniDalVia = lista(stima.avvisi).some((a) => a && a.tipo === "giorniDalVia");
  return [
    testoDi(TESTI_STIMA.fraseGiornata, stima),
    testoDi(TESTI_STIMA.fraseGiornataNormale, stima),
    conGiorniDalVia && typeof TESTI_STIMA.IN_CALENDARIO === "string" ? TESTI_STIMA.IN_CALENDARIO : null,
    testoDi(TESTI_STIMA.fraseGiornoInPiu, stima),
  ].filter(Boolean);
}

// La frase di 2.7, oppure il verdetto quando la vigilia è già cominciata.
function righeProntezza(pr) {
  if (!pr) return { forte: null, righe: [] };
  if (pr.fase === "senzaData") return { forte: null, righe: [RIEPILOGO.senzaData] };
  if (pr.fase === "proiezione" && pr.proiezione) return { forte: null, righe: lista(pr.proiezione.frasi).filter((x) => typeof x === "string") };
  const v = oggetto(pr.verdetto);
  if (!v) return { forte: null, righe: [] };
  return { forte: typeof v.titolo === "string" ? v.titolo : null, righe: [v.perche, v.cosa].filter((x) => typeof x === "string" && x) };
}

function righeConsiglio(ctx) {
  const pr = ctx.prontezza;
  if (!pr || !pr.proposta || !ctx.stima) return [];
  const ora = {
    giorni: ctx.obiettivo.giorni,
    H: ctx.stima.H,
    vMin: pr.obiettivi ? pr.obiettivi.vMin : null,
    oreDisponibili: ctx.disponibilita && typeof ctx.disponibilita.ore === "number" ? ctx.disponibilita.ore : null,
  };
  const righe = testoDi(TESTI_PRONTO.righeProposta, pr.proposta, ora);
  return lista(righe).filter((x) => typeof x === "string" && x);
}

function cartaInvito(ctx, inv) {
  const p = trovaPercorso(inv.percorso);
  const giorni = giorniValidi(p, inv.giorni);
  const partenza = partenzaValida(p, ctx.oggi, inv.partenza);
  return h("section", { class: "carta inizio-invito", id: "inizio-invito", "aria-labelledby": "inizio-invito-titolo" },
    h("h2", { id: "inizio-invito-titolo" }, iscrittoTitolo(p.eventoId, p.evento, (partenza || "").slice(0, 4))),
    h("p", {}, dettaglioIscritto(p.nome, giorni, dataDelVia(partenza, ctx.oggi))),
    h("p", { class: "piccolo" }, RIEPILOGO.invitoAttacco),
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "button", id: "inizio-invito-prepara", on: { click: () => {
        ctx.azioni.salvaObiettivo({ tipo: "evento", percorso: p.id, giorni, partenza, iscritto: true });
        portaSu();
      } } }, RIEPILOGO.preparaInvito),
      h("button", { class: "bottone bottone-secondario", type: "button", id: "inizio-invito-tieni",
        on: { click: () => { ctx.azioni.ui("invitoTenuto", true); portaSu(); } } }, RIEPILOGO.tieni)));
}

function riepilogo(ctx) {
  const ob = ctx.obiettivo;
  const inv = ctx.ui.invitoTenuto ? null : invitoInSospeso(ctx);
  const cambia = () => cambiaPasso(ctx, (ctx.ui.inizio = bozzaIniziale(ctx)), "scelta");
  const corpo = [];
  let tastiRiepilogo;
  if (!ob || ob.tipo === "semaforo") {
    corpo.push(h("p", {}, RIEPILOGO.semaforo), h("p", { class: "piccolo" }, RIEPILOGO.semaforoAltro));
    tastiRiepilogo = [
      h("button", { class: "bottone", type: "button", id: "inizio-vai-oggi", on: { click: () => ctx.azioni.vai("oggi") } }, RIEPILOGO.vaiAOggi),
      h("button", { class: "bottone bottone-secondario", type: "button", id: "inizio-cambia", on: { click: cambia } }, RIEPILOGO.scegliAvventura),
    ];
  } else {
    const cosa = descrizione(ob, ctx.oggi);
    corpo.push(h("div", { class: "inizio-cosa" }, cosa.map((t, i) => h("p", { class: i === 0 ? "inizio-cosa-prima" : null }, t))));
    const giornata = righeGiornata(ctx.stima);
    if (giornata.length) corpo.push(h("div", { class: "inizio-giornata" }, giornata.map((t) => h("p", {}, t))));
    const fonte = ctx.stima ? testoDi(TESTI_STIMA.fraseFonte, ctx.stima) : null;
    if (fonte) corpo.push(h("p", { class: "piccolo" }, fonte));
    const pronto = righeProntezza(ctx.prontezza);
    if (pronto.forte || pronto.righe.length) {
      corpo.push(h("div", { class: "inizio-dove" },
        pronto.forte ? h("p", { class: "verdetto" }, pronto.forte) : null,
        pronto.righe.map((t) => h("p", {}, t))));
    }
    const consiglio = righeConsiglio(ctx);
    if (consiglio.length) {
      corpo.push(h("div", { class: "inizio-consiglio" },
        consiglio.map((t) => h("p", {}, t)),
        h("p", {}, h("button", { class: "collegamento", type: "button", id: "inizio-cosa-cambia", on: { click: () => ctx.azioni.vai("pronto") } }, RIEPILOGO.cosaCambia))));
    }
    const daDove = oggetto(TESTI_STIMA.DA_DOVE_VENGONO);
    if (daDove && ctx.stima && ctx.stima.H !== null) {
      corpo.push(h("details", { class: "spiega" }, h("summary", {}, daDove.titolo), h("p", {}, daDove.testo)));
    }
    tastiRiepilogo = [
      h("button", { class: "bottone", type: "button", id: "inizio-vai-piano", on: { click: () => ctx.azioni.vai("settimana") } }, RIEPILOGO.vaiAlPiano),
      h("button", { class: "bottone bottone-secondario", type: "button", id: "inizio-cambia", on: { click: cambia } }, RIEPILOGO.cambia),
    ];
  }
  return h("div", { class: "vista vista-testo vista-inizio" },
    ctx.demo ? bannerDemo(ctx) : null,
    testa(INIZIO.occhiello, RIEPILOGO.titolo, null),
    copiaRipresa(ctx),
    inv ? cartaInvito(ctx, inv) : null,
    h("section", { class: "carta inizio-riepilogo", "aria-labelledby": "inizio-titolo" }, corpo),
    h("div", { class: "riga-bottoni" }, tastiRiepilogo));
}

// --- La pagina ---

export function vistaInizio(ctx) {
  let b = oggetto(ctx.ui.inizio);
  if (!b && ctx.primoAvvio) {
    b = bozzaIniziale(ctx);
    ctx.ui.inizio = b;
  }
  return b ? schermata(ctx, b) : riepilogo(ctx);
}
