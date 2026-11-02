// «Pronto?» (7.7), al posto della pagina Obiettivo. In cima la barra «Arrivi pronto?» con i quattro
// pilastri (js/viste/barra-pronto.js), poi il verdetto o, prima della vigilia, dove si arriva con il
// piano, con le righe della preparazione sotto il titolo (2.9). Poi «La tua avventura» (1.11), le prove
// con le borse, «Cosa cambia se…» quando serve (2.8), «Per chi ama i numeri», chiuso, e da dove vengono
// i numeri, con il collegamento alle fonti della Guida. Tutto arriva già calcolato da js/motore.js
// (ctx.prontezza, ctx.stima, ctx.obiettivo): la pagina non decide niente, mostra e passa le scelte a
// ctx.azioni.

import { h, s } from "../dom.js?v=202611021803";
import { segno } from "../formato.js?v=202611021803";
import { leggiDisponibilita } from "../piano.js?v=202611021803";
import { PRONTEZZA, SEMAFORO, STIMA } from "../parametri.js?v=202611021803";
import { MEDICO } from "../testi.js?v=202611021803";
import {
  fraseGiornata, fraseGiornataNormale, fraseGiornoInPiu, fraseBorse, fraseFonte, scelteOreEbike, IN_CALENDARIO, EBIKE,
  DA_DOVE_VENGONO, PASSO_GIRI,
} from "../testi-stima.js?v=202611021803";
import {
  PRONTO_PAGINA, STATI_RIGA, PROIEZIONE, NUMERI_PRONTO, BORSE_PRONTO, CAMBIA_PRONTO, FATTO_PRONTO, QUANDO_PARTI,
  fraseProiezione, nomeAvventura, rigaPercorso, rigaGiorni, settimanaTipo, provaDaFare, rigaBorseKg, rigaBorseLeggere,
  righeProposta, tastoGiorni, passaA, anteprimaGiorni, anteprimaCorto, anteprimaEsito, partoIl, giroTolto, testoFitness,
  testoDurabilita, testoStomaco,
} from "../testi-prontezza.js?v=202611021803";
import { bannerDemo } from "./comuni.js?v=202611021803";
import { barraPronto, FORMA_DI } from "./barra-pronto.js?v=202611021803";

const num = (v) => typeof v === "number" && Number.isFinite(v);
const lista = (v) => (Array.isArray(v) ? v : []);
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const avvisoDi = (stima, tipo) => (stima && Array.isArray(stima.avvisi) ? stima.avvisi.find((a) => a && a.tipo === tipo) || null : null);

// Il giorno dopo, per il minimo del campo della data.
function domaniDi(oggi) {
  const [a, m, g] = oggi.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, g + 1)).toISOString().slice(0, 10);
}

// Dopo un tasto che ridisegna la pagina il fuoco va dove serve, così chi usa la tastiera non riparte
// dall'inizio. La pagina è già ridisegnata quando l'azione torna.
function fuocoSu(id) {
  const el = typeof document !== "undefined" && typeof document.getElementById === "function" ? document.getElementById(id) : null;
  if (el && typeof el.focus === "function") el.focus();
}

// --- i segni delle righe (2.9), una spunta, un cerchio o una croce. La forma dice lo stato, il colore no ---
// Il segno di ogni stato (FORMA_DI) sta in js/viste/barra-pronto.js, così righe e barra dicono lo stesso.

const SEGNI = {
  spunta: ["M5 12.5l4.5 4.5L19 7.5"],
  cerchio: ["M12 5a7 7 0 1 1 0 14a7 7 0 0 1 0-14"],
  croce: ["M7.5 7.5l9 9", "M16.5 7.5l-9 9"],
};

function riga(stato, testo, forma = FORMA_DI[stato] || "cerchio") {
  return h("li", { class: ["pronto-riga", `pronto-riga-${forma}`] },
    s("svg", { class: ["pronto-segno", `pronto-segno-${forma}`], viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" },
      SEGNI[forma].map((d) => s("path", { d }))),
    h("span", { class: "pronto-riga-testo" }, STATI_RIGA[stato] ? h("span", { class: "nascosto" }, STATI_RIGA[stato], " ") : null, testo));
}

function sezione(id, titolo, ...figli) {
  return h("section", { class: ["carta", id], id, "aria-labelledby": `${id}-titolo` },
    h("h2", { id: `${id}-titolo` }, titolo),
    ...figli);
}

// --- in alto, il verdetto o la proiezione con le tre parti di 2.9 ---

// La barra, quando c'è, sta fra l'occhiello e il titolo, che è la sua frase.
function testa(occhiello, titolo, attacco, barra = null) {
  return h("header", { class: "intestazione" },
    occhiello ? h("p", { class: "occhiello" }, occhiello) : null,
    barra,
    h("h1", { id: "pronto-titolo", tabindex: "-1" }, titolo),
    attacco ? h("p", { class: "attacco" }, attacco) : null);
}

// Titolo e attacco per ogni fase di valutaProntezza. Prima della vigilia il titolo è la frase di 2.7 e
// sotto c'è cosa manca o cosa si propone, con «Siamo nella base» quando la partenza è lontana.
function parole(p) {
  if (!p || p.fase === "senzaData") return { titolo: PRONTO_PAGINA.senzaData, attacco: PRONTO_PAGINA.senzaDataTesto };
  if (p.fase === "verdetto" || p.fase === "nonValutabile") {
    const v = p.verdetto || {};
    return { titolo: v.titolo, attacco: [v.perche, v.cosa].filter(Boolean).join(" ") };
  }
  const pr = p.proiezione;
  if (!pr || pr.storiaCorta || !p.esito) return { titolo: PRONTO_PAGINA.storiaCorta, attacco: pr && pr.frase ? pr.frase : PROIEZIONE.storiaCorta };
  const prima = fraseProiezione(p.esito);
  const frase = typeof pr.frase === "string" ? pr.frase : prima;
  const resto = prima && frase.startsWith(prima) ? frase.slice(prima.length).trim() : null;
  return { titolo: prima || frase, attacco: [pr.base ? PROIEZIONE.base : null, resto].filter(Boolean).join(" ") };
}

// La stima con il fattore carico personale, che prende il posto del modello delle borse (1.7): allora i
// chili scritti cambiano poco le ore.
const dalViaggio = (stima) => Boolean(stima && num(stima.fattore));

// Una riga sola dopo una scelta fatta qui, poi sparisce.
function fatto(ctx) {
  let quale = ctx.ui.prontoFatto;
  if (!quale) return null;
  ctx.ui.prontoFatto = null;
  if (quale === "borse" && dalViaggio(ctx.stima)) quale = "borseDalViaggio";
  return FATTO_PRONTO[quale] ? h("p", { class: "salvato", role: "status" }, FATTO_PRONTO[quale]) : null;
}

// La fiducia del verdetto, accanto al verdetto e solo quando non è alta (2.5). Prima della vigilia
// conta solo la riga di cosa manca. «Rispondi adesso» porta alle domande ancora aperte, in Numeri.
function fiducia(ctx, p) {
  const f = p.fiducia;
  if (!f || f.livello === "alta" || !f.testo) return null;
  const toccare = f.motivo && (f.motivo.tipo === "ore" || f.motivo.tipo === "borse");
  return h("div", { class: "pronto-fiducia" },
    h("p", {}, p.fase === "verdetto" && f.titolo ? h("strong", {}, f.titolo, " ") : null, f.testo),
    toccare ? h("p", {}, h("button", { class: "collegamento", type: "button", id: "pronto-rispondi", on: { click: () => ctx.azioni.vai("numeri") } }, PRONTO_PAGINA.rispondi)) : null);
}

// Le righe dei pilastri sotto il titolo, con la palestra che non decide (2.9).
function preparazione(ctx, p) {
  const righe = lista(p && p.righe);
  if (!righe.length) return null;
  const conPiano = p.fase === "proiezione";
  const sotto = conPiano && p.proiezione && p.proiezione.sottoPiano ? p.proiezione.sottoPiano.testo : null;
  return sezione("pronto-preparazione", conPiano ? PRONTO_PAGINA.preparazioneConPiano : PRONTO_PAGINA.preparazione,
    h("ul", { class: "pronto-righe" }, righe.map((r) => riga(r.stato, r.testo))),
    sotto ? h("p", { class: "pronto-nota" }, sotto) : null,
    fiducia(ctx, p));
}

// Da 40 anni, per un viaggio di 11 giorni e più, nelle 4 settimane prima (4.9 e 7.7).
function rigaCuore(ctx) {
  const ob = ctx.obiettivo;
  const M = SEMAFORO.medico;
  const n = ctx.giorno ? ctx.giorno.giorniPartenza : null;
  const prof = ctx.profilo || {};
  // Senza risposta vale la fascia 40-49, come nel semaforo (6.3).
  const daQuaranta = num(prof.eta) ? prof.eta >= M.daAnni : prof.fasciaEta !== SEMAFORO.fasceEta[0];
  if (ob.tipo !== "evento" || !(ob.giorni >= M.viaggioDaGiorni) || !num(n) || n <= 0 || n > M.settimanePrima * 7 || !daQuaranta) return null;
  return h("p", { class: "carta pronto-cuore" }, MEDICO.viaggioLungo);
}

// --- «La tua avventura» (1.11 e 7.7) ---

// I chili delle borse della stima, e da dove vengono, per la riga con «Cambia».
function borseDi(ctx) {
  const a = avvisoDi(ctx.stima, "borse");
  if (!a || !num(a.kg) || a.kg <= 0) return null;
  const ob = ctx.obiettivo;
  const scritti = ctx.profilo && num(ctx.profilo.borseKg) ? ctx.profilo.borseKg : null;
  const m = ob.percorso && ob.percorso.modello;
  const delPercorso = m && num(m.borseKg) ? m.borseKg : null;
  const uguale = (x) => x !== null && Math.abs(x - a.kg) < 0.05;
  const origine = uguale(scritti) ? "tue" : scritti === null && uguale(delPercorso) ? "catalogo" : scritti === null ? "prova" : "tue";
  return { kg: a.kg, ore: a.ore, origine };
}

function apriBorse(ctx, aperto) {
  ctx.azioni.ui("prontoBorse", aperto);
  fuocoSu(aperto ? "pronto-borse-scelta" : "pronto-borse-cambia");
}

function scegliBorse(ctx, kg) {
  ctx.ui.prontoBorse = false;
  ctx.ui.prontoFatto = "borse";
  ctx.azioni.profilo({ borseKg: kg }, "pronto-borse");
  fuocoSu("pronto-borse-cambia");
}

function borse(ctx, b) {
  if (!b) return null;
  const aperto = Boolean(ctx.ui.prontoBorse);
  // Il tasto della scelta di adesso, o il primo, prende il fuoco quando la scelta si apre.
  const vicina = BORSE_PRONTO.scelte.reduce((m, x) => (Math.abs(x.kg - b.kg) < Math.abs(m.kg - b.kg) ? x : m));
  return h("div", { class: "pronto-borse" },
    h("p", {}, rigaBorseKg(b.kg, b.origine)),
    fraseBorse(ctx.stima) ? h("p", {}, fraseBorse(ctx.stima)) : null,
    h("div", { class: "riga-bottoni" },
      h("button", {
        class: "bottone bottone-secondario", type: "button", id: "pronto-borse-cambia",
        "aria-expanded": aperto ? "true" : "false", "aria-controls": aperto ? "pronto-borse-scelte" : null,
        on: { click: () => apriBorse(ctx, !aperto) },
      }, BORSE_PRONTO.cambia)),
    aperto ? h("fieldset", { class: "pronto-scelte", id: "pronto-borse-scelte" },
      h("legend", {}, BORSE_PRONTO.domanda),
      h("div", { class: "riga-bottoni" },
        BORSE_PRONTO.scelte.map((x) => h("button", {
          class: x.kg === b.kg ? "bottone" : "bottone bottone-secondario", type: "button",
          id: x === vicina ? "pronto-borse-scelta" : `pronto-borse-${x.kg}`, "aria-pressed": x.kg === b.kg ? "true" : "false",
          on: { click: () => scegliBorse(ctx, x.kg) },
        }, x.testo)),
        h("button", { class: "collegamento", type: "button", id: "pronto-borse-lascia", on: { click: () => apriBorse(ctx, false) } }, BORSE_PRONTO.lascia)))
      : null);
}

// Con la e-bike, le ore al giorno, che la persona dice (1.8).
function domandaEbike(ctx) {
  const a = avvisoDi(ctx.stima, "ebike");
  if (!a) return null;
  const ore = lista(a.scelte).filter(num).length ? a.scelte.filter(num) : STIMA.oreEbike;
  const nomi = scelteOreEbike();
  return h("fieldset", { class: "pronto-scelte", id: "pronto-ebike" },
    h("legend", {}, EBIKE.domanda),
    h("div", { class: "riga-bottoni" }, ore.map((x) => h("button", {
      class: "bottone bottone-secondario", type: "button", id: `pronto-ebike-${x}`,
      on: { click: () => { ctx.ui.prontoFatto = "ebike"; ctx.azioni.profilo({ oreEbike: x }, "pronto-ebike"); } },
    }, nomi[STIMA.oreEbike.indexOf(x)] || String(x)))));
}

// La settimana tipo, per un obiettivo senza data (7.7).
function rigaSettimana(ctx) {
  const w = ctx.settimana;
  if (!w || !num(w.ore)) return null;
  const sedute = lista(w.sedute).filter((x) => x && num(x.ore));
  const lunga = sedute.length ? Math.max(...sedute.map((x) => x.ore)) : null;
  return settimanaTipo({ ore: w.ore, lunga, palestra: Number.isInteger(w.palestra) ? w.palestra : 0 });
}

function avventura(ctx, p) {
  const ob = ctx.obiettivo;
  const st = ctx.stima;
  const g = ctx.giorno;
  const righe = [
    rigaPercorso(ob.percorso, ob.tipo === "libero" ? ob.libero : null),
    rigaGiorni({ giorni: ob.tipo === "evento" ? ob.giorni : null, partenza: ob.partenza, mancano: g ? g.giorniPartenza : null }),
    st ? fraseGiornata(st) : null,
    avvisoDi(st, "giorniDalVia") ? IN_CALENDARIO : null,
    st ? fraseGiornoInPiu(st) : null,
    p && p.fase === "senzaData" ? rigaSettimana(ctx) : null,
  ].filter(Boolean);
  const fonte = st ? fraseFonte(st) : null;
  return sezione("pronto-avventura", PRONTO_PAGINA.avventura,
    righe.map((t) => h("p", {}, t)),
    domandaEbike(ctx),
    borse(ctx, borseDi(ctx)),
    fonte ? h("p", { class: "piccolo" }, fonte) : null,
    avvisoDi(st, "autonomia") ? h("p", {}, EBIKE.autonomia) : null);
}

// --- la data, per un obiettivo che non ce l'ha (7.7) ---

// L'obiettivo di adesso con un'altra partenza, nella forma di ctx.azioni.salvaObiettivo.
function conPartenza(ob, partenza) {
  if (ob.tipo === "evento") return { tipo: "evento", percorso: ob.percorsoId, giorni: ob.giorni, partenza, iscritto: ob.iscritto };
  const l = ob.libero || {};
  return {
    tipo: "libero", libero: l.tipo, ore: l.ore, giorni: l.giorni, km: l.km, metri: l.metri, fondo: l.fondo, conBorse: l.conBorse,
    misura: l.misura, partenza, daSfida: ob.daSfida || null,
  };
}

function salvaPartenza(ctx, partenza) {
  ctx.ui.prontoFatto = "data";
  ctx.azioni.salvaObiettivo(conPartenza(ctx.obiettivo, partenza));
  fuocoSu("pronto-titolo");
}

function quandoParti(ctx, p) {
  if (!p || p.fase !== "senzaData") return null;
  const ob = ctx.obiettivo;
  const oggi = ctx.oggi;
  const partenze = ob.tipo === "evento" && ob.percorso ? lista(ob.percorso.partenze).filter((d) => DATA.test(d) && d > oggi) : [];
  const campo = h("input", { type: "date", id: "pronto-data-giorno", min: domaniDi(oggi), "aria-describedby": "pronto-data-stato" });
  const stato = h("p", { class: "stato-salvataggio", id: "pronto-data-stato", role: "status", "aria-live": "polite" });
  const modulo = h("form", { class: "pronto-data-modulo", novalidate: true },
    h("div", { class: "campo" }, h("label", { for: "pronto-data-giorno" }, QUANDO_PARTI.etichetta), campo),
    h("div", { class: "riga-bottoni" }, h("button", { class: "bottone", type: "submit", id: "pronto-data-salva" }, QUANDO_PARTI.salva)),
    stato);
  modulo.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const v = campo.value;
    if (typeof v !== "string" || !DATA.test(v) || v <= oggi) {
      stato.textContent = QUANDO_PARTI.errore;
      campo.focus();
      return;
    }
    salvaPartenza(ctx, v);
  });
  return sezione("pronto-data", QUANDO_PARTI.domanda,
    partenze.length ? [
      h("p", { class: "sezione-testo" }, QUANDO_PARTI.scegli),
      h("div", { class: "riga-bottoni" }, partenze.map((d) => h("button", {
        class: "bottone bottone-secondario", type: "button", id: `pronto-parto-${d}`, on: { click: () => salvaPartenza(ctx, d) },
      }, partoIl(d)))),
    ] : null,
    modulo);
}

// --- le prove con le borse, una riga ciascuna (2.4 e 2.9) ---

function prove(ctx, p) {
  if (!p) return null;
  const b = p.pilastri ? p.pilastri.borse : null;
  if (b && b.stato === "nonServe") return null;
  const doppio = lista(p.avvisi).filter((a) => a && a.tipo === "doppioUso" && a.testo).map((a) => a.testo);
  if (b && lista(b.righe).length) {
    return sezione("pronto-prove", PRONTO_PAGINA.prove,
      h("ul", { class: "pronto-righe" }, b.righe.map((r) => riga(r.stato, r.testo))),
      doppio.map((t) => h("p", { class: "pronto-nota" }, t)));
  }
  // Senza data, o con poche settimane di uscite, le prove che serviranno, senza giudizio.
  const servono = p.obiettivi ? lista(p.obiettivi.prove).map(provaDaFare).filter(Boolean) : [];
  if (!servono.length) return null;
  return sezione("pronto-prove", PRONTO_PAGINA.proveDaFare,
    h("ul", { class: "pronto-righe" }, servono.map((t) => riga("daFare", t))));
}

// --- «Cosa cambia se…», solo se serve (2.8) ---

const chiaveDi = (nuovo) => `${nuovo.percorso}-${nuovo.giorni}`;

// La giornata e il verdetto nuovi, prima di «Sì, cambia». Il verdetto nuovo arriva da
// ctx.azioni.anteprima, quando c'è. Senza, la pagina mostra la giornata che dà la proposta.
function apriAnteprima(ctx, tipo, nuovo, idTasto) {
  const ora = ctx.ui.prontoAnteprima;
  if (ora && ora.tipo === tipo && ora.chiave === chiaveDi(nuovo)) {
    chiudiAnteprima(ctx, idTasto);
    return;
  }
  let H = null;
  let esito = null;
  let fase = null;
  if (typeof ctx.azioni.anteprima === "function") {
    try {
      const a = ctx.azioni.anteprima(nuovo);
      if (a && a.stima && a.stima.mezzore && num(a.stima.mezzore.H)) H = a.stima.mezzore.H;
      if (a && a.prontezza && typeof a.prontezza.esito === "string") {
        esito = a.prontezza.esito;
        fase = a.prontezza.fase || null;
      }
    } catch { /* senza anteprima resta la giornata della proposta */ }
  }
  ctx.azioni.ui("prontoAnteprima", { tipo, chiave: chiaveDi(nuovo), H, esito, fase });
  fuocoSu("pronto-anteprima-titolo");
}

function chiudiAnteprima(ctx, idTasto) {
  ctx.azioni.ui("prontoAnteprima", null);
  fuocoSu(idTasto);
}

function conferma(ctx, tipo, nuovo) {
  ctx.ui.prontoAnteprima = null;
  ctx.ui.prontoFatto = tipo;
  ctx.azioni.salvaObiettivo(nuovo);
  fuocoSu("pronto-titolo");
}

function pannelloAnteprima(ctx, scelta) {
  const a = ctx.ui.prontoAnteprima;
  const H = num(a.H) ? a.H : scelta.H;
  const giornata = scelta.tipo === "corto" ? anteprimaCorto(scelta.corto.percorso, scelta.nuovo.giorni, H) : anteprimaGiorni(scelta.nuovo.giorni, H);
  const esito = a.esito ? anteprimaEsito(a.esito, a.fase) : null;
  return h("div", { class: "pronto-anteprima", id: "pronto-anteprima", role: "group", "aria-labelledby": "pronto-anteprima-titolo" },
    h("h3", { id: "pronto-anteprima-titolo", tabindex: "-1" }, CAMBIA_PRONTO.anteprima),
    giornata ? h("p", {}, giornata) : null,
    esito ? h("p", {}, h("strong", {}, esito)) : null,
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "button", id: "pronto-conferma", on: { click: () => conferma(ctx, scelta.tipo, scelta.nuovo) } }, CAMBIA_PRONTO.conferma),
      h("button", { class: "bottone bottone-secondario", type: "button", id: "pronto-lascia", on: { click: () => chiudiAnteprima(ctx, scelta.id) } }, CAMBIA_PRONTO.lascia)));
}

// I tasti di 2.8, solo per gli eventi del catalogo. «Fallo in 5 giorni» quando i giorni consigliati
// sono più di quelli scelti, «Passa al Corto» con il percorso corto. Con «partire e adattare» resta il
// tasto dei giorni, per chi vuole vedere i numeri (2.8).
function scelteDi(ctx, pr) {
  const ob = ctx.obiettivo;
  if (!pr || ob.tipo !== "evento") return [];
  const base = { partenza: ob.partenza, iscritto: ob.iscritto };
  const scelte = [];
  if (Number.isInteger(pr.giorni) && pr.giorni > ob.giorni) {
    scelte.push({ tipo: "giorni", id: "pronto-giorni", testo: tastoGiorni(pr.giorni), H: pr.H, nuovo: { tipo: "evento", percorso: ob.percorsoId, giorni: pr.giorni, ...base } });
  }
  const c = pr.tipo === "corto" ? pr.corto : null;
  if (c && c.percorso && typeof c.percorso.id === "string" && Number.isInteger(c.giorni)) {
    scelte.push({ tipo: "corto", id: "pronto-corto", testo: passaA(c.percorso), H: c.H, corto: c, nuovo: { tipo: "evento", percorso: c.percorso.id, giorni: c.giorni, ...base } });
  }
  return scelte;
}

function cosaCambia(ctx, p) {
  if (!p) return null;
  const ob = ctx.obiettivo;
  const st = ctx.stima;
  const pr = p.proposta;
  // Le borse più leggere accorciano la giornata solo quando le ore vengono dal modello delle borse.
  const b = dalViaggio(st) ? null : borseDi(ctx);
  const leggere = b && b.kg > STIMA.borseScelte[0] && (p.esito === "quasiPronto" || p.esito === "pocoPronto") ? rigaBorseLeggere(b.kg, b.ore) : null;
  if (!pr && !leggere) return null;
  const ora = {
    giorni: ob.giorni, H: st && num(st.H) ? st.H : null, vMin: p.obiettivi ? p.obiettivi.vMin : null,
    oreDisponibili: leggiDisponibilita(ctx.disponibilita || {}).ore,
  };
  const frasi = pr ? righeProposta(pr, ora) : [];
  const scelte = scelteDi(ctx, pr);
  const aperta = ctx.ui.prontoAnteprima;
  const daMostrare = aperta ? scelte.find((x) => x.tipo === aperta.tipo && chiaveDi(x.nuovo) === aperta.chiave) || null : null;
  return sezione("pronto-cambia", PRONTO_PAGINA.cosaCambia,
    frasi.map((t) => h("p", {}, t)),
    scelte.length ? h("div", { class: "riga-bottoni" }, scelte.map((x) => h("button", {
      class: daMostrare === x ? "bottone" : "bottone bottone-secondario", type: "button", id: x.id,
      "aria-expanded": daMostrare === x ? "true" : "false", "aria-controls": daMostrare === x ? "pronto-anteprima" : null,
      on: { click: () => apriAnteprima(ctx, x.tipo, x.nuovo, x.id) },
    }, x.testo))) : null,
    daMostrare ? pannelloAnteprima(ctx, daMostrare) : null,
    leggere ? [
      h("p", {}, leggere),
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone bottone-secondario", type: "button", id: "pronto-borse-leggere", on: { click: () => apriBorse(ctx, true) } }, CAMBIA_PRONTO.borse)),
    ] : null);
}

// --- «Per chi ama i numeri», chiuso (2.6 e 7.7) ---

function blocco(titolo, righe, idTitolo = null) {
  const testi = righe.filter(Boolean);
  if (!testi.length) return null;
  return h("div", { class: "pronto-blocco" },
    h("h3", idTitolo ? { id: idTitolo, tabindex: "-1" } : {}, titolo),
    testi.map((t) => (typeof t === "string" ? h("p", {}, t) : t)));
}

function rimetti(ctx, id) {
  ctx.azioni.rispostaUscita(id, { rimessaNelPasso: true });
  fuocoSu("pronto-passo-titolo");
}

// Fitness meno Fatica di ieri sera, negli ultimi giorni prima della partenza (2.6).
function formaAllaPartenza(ctx, p) {
  const n = ctx.giorno ? ctx.giorno.giorniPartenza : null;
  if (!num(n) || n < 1 || n > 7) return null;
  const ieri = [...lista(ctx.serie)].reverse().find((r) => r && r.d < ctx.oggi && num(r.fitness) && num(r.fatica));
  if (!ieri) return null;
  const f = PRONTEZZA.specchi.formaPartenza;
  const [da, a] = p.classe === "1" || p.classe === "2-5" ? f.breve : f.lunga;
  return NUMERI_PRONTO.formaTesto(segno(ieri.fitness - ieri.fatica), segno(da), segno(a), segno(f.nonAllarmeDa));
}

function numeri(ctx, p) {
  const st = ctx.stima;
  const c = p ? p.confronto : null;
  const fitness = c ? testoFitness(c) : null;
  const passo = st && st.passo ? st.passo : null;
  const tolti = passo ? lista(passo.tolti).filter((x) => x && typeof x.id === "string") : [];
  const blocchi = [
    fitness ? blocco(NUMERI_PRONTO.fitness, [
      NUMERI_PRONTO.fitnessCosa,
      fitness,
      num(ctx.k) ? NUMERI_PRONTO.puntiOra(c.k) : NUMERI_PRONTO.puntiOraSenzaDati(c.k),
      ...lista(p.avvisi).filter((x) => x && (x.tipo === "intensita" || x.tipo === "sforzo")).map((x) => x.testo),
    ]) : null,
    st ? blocco(NUMERI_PRONTO.giornata, [fraseGiornataNormale(st), NUMERI_PRONTO.lavoro(st.kj, st.punti)]) : null,
    p ? blocco(NUMERI_PRONTO.lunghe, [
      num(p.durabilita) ? testoDurabilita(p.durabilita) : null,
      ctx.obiettivo.partenza && num(p.stomaco) ? testoStomaco(p.stomaco) : null,
    ]) : null,
    passo ? blocco(NUMERI_PRONTO.passo, [
      NUMERI_PRONTO.passoGiri(lista(passo.tenuti).length, passo.giorni),
      ...tolti.map((x) => h("div", { class: "pronto-tolto" },
        h("p", {}, giroTolto(x.giorno, x.ore)),
        h("button", { class: "bottone bottone-secondario", type: "button", id: `pronto-rimetti-${x.id}`, on: { click: () => rimetti(ctx, x.id) } }, PASSO_GIRI.rimetti))),
    ], "pronto-passo-titolo") : null,
    p ? blocco(NUMERI_PRONTO.forma, [formaAllaPartenza(ctx, p)]) : null,
  ].filter(Boolean);
  if (!blocchi.length) return null;
  const d = h("details", { class: "carta pronto-numeri", id: "pronto-numeri", open: ctx.ui.prontoNumeri ? true : null },
    h("summary", {}, h("h2", { class: "pronto-sommario" }, NUMERI_PRONTO.titolo)),
    blocchi);
  d.addEventListener("toggle", () => { ctx.ui.prontoNumeri = d.open; });
  return d;
}

// In fondo il collegamento a «Le fonti» della Guida, con la rotta #fonti di js/app.js.
function daDove() {
  return sezione("pronto-dove", DA_DOVE_VENGONO.titolo,
    h("p", { class: "sezione-testo" }, DA_DOVE_VENGONO.testo),
    h("p", { class: "pronto-fonti" }, h("a", { href: "#fonti", id: "pronto-fonti" }, PRONTO_PAGINA.fonti)));
}

// --- senza un'avventura, oppure con il solo semaforo (7.7) ---

function senzaAvventura(ctx) {
  const solo = Boolean(ctx.obiettivo && ctx.obiettivo.tipo === "semaforo");
  return h("div", { class: "vista vista-pronto" },
    testa(null, PRONTO_PAGINA.titolo, solo ? PRONTO_PAGINA.soloSemaforo : PRONTO_PAGINA.senzaObiettivo),
    ctx.demo ? bannerDemo(ctx) : null,
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "button", id: "pronto-scegli", on: { click: () => ctx.azioni.vai("inizio") } }, PRONTO_PAGINA.scegli)));
}

export function vistaPronto(ctx) {
  const ob = ctx.obiettivo;
  if (!ob || !ob.percorso) return senzaAvventura(ctx);
  const p = ctx.prontezza;
  const { titolo, attacco } = parole(p);
  return h("div", { class: "vista vista-pronto" },
    testa(nomeAvventura({ percorso: ob.tipo === "evento" ? ob.percorso : null, libero: ob.tipo === "libero" ? ob.libero : null, giorni: ob.giorni }), titolo, attacco,
      barraPronto(ctx, { id: "pronto-barra" })),
    fatto(ctx),
    ctx.demo ? bannerDemo(ctx) : null,
    preparazione(ctx, p),
    rigaCuore(ctx),
    avventura(ctx, p),
    quandoParti(ctx, p),
    prove(ctx, p),
    cosaCambia(ctx, p),
    numeri(ctx, p),
    daDove());
}
