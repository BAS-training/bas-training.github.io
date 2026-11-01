// Le uscite, una parte della pagina Numeri (7.2 e 7.11). Le ore in bici di ogni settimana e le uscite
// degli ultimi due mesi, ognuna con la sua scheda, dove si dice quello che manca (6.3 e 6.4). Qui ci
// sono anche le domande a un tocco che la pagina Numeri usa per le domande ancora aperte. I testi
// stanno in js/testi-numeri.js.

import { h } from "../dom.js?v=202610312043";
import { numero, durata, formatoDurata, formatoOra, dataBreve, dataLunga, giornoMese } from "../formato.js?v=202610312043";
import { aggiungiGiorni, giornoSettimana, nomeTipo } from "../modello.js?v=202610312043";
import { oreDelGiorno } from "../dati.js?v=202610312043";
import { QUALITA, inBici, inPalestra } from "../carico.js?v=202610312043";
import { DOMANDE, STIMA } from "../parametri.js?v=202610312043";
import { grafico } from "../grafici.js?v=202610312043";
import { NUMERI_USCITE, NUMERI_SCHEDA, NUMERI_DOMANDE } from "../testi-numeri.js?v=202610312043";

const U = NUMERI_USCITE;
const S = NUMERI_SCHEDA;
const D = NUMERI_DOMANDE;
const ORA = 3600;
const GIORNI_LISTA = 60;          // le uscite degli ultimi due mesi, come prima nella pagina Uscite
const SETTIMANE = 12;
const CARICHE = new Set(["parte", "evento"]);
const SU_STRADA = new Set(["Ride", "GravelRide"]);   // i tipi a cui si chiede «Era su sterrato?» (6.3)

// --- Le domande a un tocco, per le schede e per le domande ancora aperte ---

const pulisci = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, "-");
const vicino = (valori, v) => (typeof v === "number" && valori.length
  ? valori.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a)) : null);

// Un gruppo di scelte a un tocco. scelto è quella già scelta, o null. multipla per le caselle.
export function gruppo(prefisso, nome, domanda, scelte, scelto = null, { nota = null, multipla = false, nascosto = false } = {}) {
  const campo = `${prefisso}-${nome}`;
  const presi = multipla ? new Set((Array.isArray(scelto) ? scelto : []).map(String)) : null;
  return h("fieldset", { class: "domanda", dataset: { campo: nome }, hidden: nascosto },
    h("legend", {}, domanda, nota ? h("span", { class: "domanda-nota" }, nota) : null),
    h("div", { class: "scelte" }, scelte.map((s) => {
      const id = `${campo}-${pulisci(s.valore)}`;
      const acceso = multipla ? presi.has(String(s.valore)) : scelto !== null && scelto !== undefined && String(scelto) === String(s.valore);
      return h("span", { class: "scelta" },
        h("input", { type: multipla ? "checkbox" : "radio", id, name: campo, value: String(s.valore), checked: acceso }),
        h("label", { for: id }, s.testo));
    })));
}

// Il valore scelto in un gruppo, o null. Con le caselle la lista dei valori.
export function letto(modulo, prefisso, nome, { multipla = false } = {}) {
  const scelti = [...modulo.querySelectorAll(`input[name="${prefisso}-${nome}"]:checked`)].map((x) => x.value);
  if (multipla) return scelti;
  return scelti.length ? scelti[0] : null;
}

const SFORZI = D.sforzo.scelte;
export function sceltaSforzo(sforzo) {
  return vicino(SFORZI.map((s) => s.valore), sforzo);
}

export const DURATE = DOMANDE.durateMinuti.map((m) => ({ valore: m, testo: formatoDurata(m) }));
export function sceltaDurata(secondi) {
  return typeof secondi === "number" && secondi > 0 ? vicino(DOMANDE.durateMinuti, secondi / 60) : null;
}

export const CHILI = STIMA.borseScelte.map((kg) => ({ valore: kg, testo: D.kg.scelta(kg) }));
export function sceltaChili(ctx, kg) {
  const percorso = ctx.obiettivo && ctx.obiettivo.percorso;
  const dellObiettivo = percorso && percorso.modello && typeof percorso.modello.borseKg === "number" && percorso.modello.borseKg > 0 ? percorso.modello.borseKg : null;
  const dato = typeof kg === "number" && kg > 0 ? kg : typeof ctx.profilo.borseKg === "number" && ctx.profilo.borseKg > 0 ? ctx.profilo.borseKg : dellObiettivo;
  return vicino(STIMA.borseScelte, dato);
}

// «Avevi le borse?», con i chili e «Hai dormito fuori?» che compaiono solo con un sì (6.4). notte vero
// se il giorno prima o dopo c'è un'altra uscita carica, perché la notte fuori sta fra due giorni carichi.
export function domandeBorse(ctx, prefisso, a, { notte = false } = {}) {
  const borse = a && a.borse ? a.borse : null;
  const carica = CARICHE.has(borse);
  const kg = gruppo(prefisso, "kg", D.kg.domanda, CHILI, sceltaChili(ctx, a ? a.kg : null), { nascosto: !carica });
  const fuori = notte
    ? gruppo(prefisso, "notte", D.notte.domanda, D.notte.scelte, a && typeof a.notteFuori === "boolean" ? (a.notteFuori ? "si" : "no") : null, { nascosto: !carica })
    : null;
  const domanda = gruppo(prefisso, "borse", D.borse.domanda, D.borse.scelte, borse);
  domanda.addEventListener("change", (e) => {
    const si = CARICHE.has(e.target.value);
    kg.hidden = !si;
    if (fuori) fuori.hidden = !si;
  });
  return [domanda, kg, fuori];
}

// Le risposte sulle borse lette dal modulo, nella forma di rispostaUscita.
export function rispostaBorse(modulo, prefisso, campi) {
  const borse = letto(modulo, prefisso, "borse");
  if (!borse) return;
  campi.borse = borse;
  if (!CARICHE.has(borse)) return;
  const kg = letto(modulo, prefisso, "kg");
  if (kg !== null) campi.kg = Number(kg);
  const notte = letto(modulo, prefisso, "notte");
  if (notte !== null) campi.notteFuori = notte === "si";
}

// C'è un'altra uscita carica il giorno prima o il giorno dopo.
export function conNotteFuori(ctx, a) {
  if (!a) return false;
  const prima = aggiungiGiorni(a.giorno, -1);
  const dopo = aggiungiGiorni(a.giorno, 1);
  return (ctx.attivita || []).some((b) => b && b.id !== a.id && inBici(b) && CARICHE.has(b.borse) && (b.giorno === prima || b.giorno === dopo));
}

// Lo sforzo si chiede da 30 minuti dopo la fine fino a mezzogiorno del giorno dopo. Dopo, «a memoria» (6.4).
export function aMemoria(ctx, a) {
  if (!a || typeof ctx.adesso !== "string") return false;
  const dopo = aggiungiGiorni(a.giorno, 1);
  const giorno = ctx.adesso.slice(0, 10);
  return giorno > dopo || (giorno === dopo && Number(ctx.adesso.slice(11, 13)) >= DOMANDE.sforzoFinoAlleOre);
}

// Un pulsante e la riga di stato sotto i moduli.
export function piedeModulo(ctx, testoSalva, conNonLoSo = null) {
  const stato = h("p", { class: "stato-salvataggio", role: "status", "aria-live": "polite" });
  const riga = h("div", { class: "riga-bottoni" },
    h("button", { class: "bottone", type: "submit" }, testoSalva),
    conNonLoSo ? h("button", { class: "bottone bottone-secondario", type: "button", on: { click: conNonLoSo } }, D.nonLoSo) : null);
  return { riga, stato };
}

// --- La lista ---

function nomeDi(a) {
  return nomeTipo(a.tipo, a.sorgente);
}

function durataDi(a) {
  if (!(a.secondi > 0)) return null;
  const testo = formatoDurata(a.secondi / 60);
  if (a.qualita && a.qualita.secondi === QUALITA.stimata) return U.circa(testo);
  if (a.qualita && a.qualita.secondi === QUALITA.detta && !a.manuale) return U.dettaDaTe(testo);
  return testo;
}

function segniDi(a, passo) {
  const segni = [];
  if (a.stub && !a.tipoCorretto) segni.push(U.daStrava);
  if (a.borse === "evento") segni.push(U.conBorse);
  else if (a.borse === "parte") segni.push(U.inParte);
  if (a.sforzo !== null && a.sforzo !== undefined) segni.push(U.sforzoTuo);
  if (a.manuale && !a.stub) segni.push(U.aMano);
  if (passo.tenuti.has(a.id)) segni.push(U.nelPasso);
  else if (passo.tolti.has(a.id)) segni.push(U.fuoriPasso);
  return segni;
}

// I numeri della scheda, quelli che nella riga non ci stanno.
function numeriDellaScheda(a) {
  const pezzi = [
    typeof a.carico === "number" ? S.punti(numero(a.carico)) : null,
    a.fcMedia ? S.battito(numero(a.fcMedia)) : null,
    a.sforzo !== null && a.sforzo !== undefined ? S.sforzo(numero(a.sforzo)) : null,
    a.potenza ? S.potenza : null,
  ].filter(Boolean);
  return pezzi.length ? h("p", { class: "scheda-numeri" }, pezzi.join(" · ")) : null;
}

// Le domande della scheda di un'uscita, secondo il tipo (6.3).
function moduloScheda(ctx, a) {
  const p = `scheda-${pulisci(a.id)}`;
  const parti = [];
  const bici = inBici(a);
  if (a.stub) {
    parti.push(gruppo(p, "cosa", D.cosEra.domanda, D.cosEra.scelte, a.tipoCorretto ? (inPalestra(a) ? "palestra" : bici ? "bici" : "altro") : "bici"));
    parti.push(gruppo(p, "durata", D.durata.domanda, DURATE, sceltaDurata(a.secondi)));
  }
  if (inPalestra(a)) parti.push(gruppo(p, "allenato", D.palestra.domanda, D.palestra.scelte, a.allenato));
  parti.push(gruppo(p, "sforzo", D.sforzo.domanda, SFORZI, sceltaSforzo(a.sforzo), { nota: aMemoria(ctx, a) ? D.sforzo.aMemoria : null }));
  if ((bici || a.stub) && !a.rulli && !a.eBike && (a.stub || a.secondi >= DOMANDE.borseDaOre * ORA)) {
    parti.push(...domandeBorse(ctx, p, a, { notte: conNotteFuori(ctx, a) }));
  }
  if (!a.stub && SU_STRADA.has(a.tipo) && !a.rulli) {
    parti.push(gruppo(p, "sterrato", D.sterrato.domanda, D.sterrato.scelte, a.tipo === "GravelRide" ? "si" : a.tipoCorretto ? "no" : null));
  }

  const { riga, stato } = piedeModulo(ctx, S.salva);
  const modulo = h("form", { class: "scheda-modulo", novalidate: true }, h("h4", {}, S.racconta), parti.filter(Boolean), riga, stato);
  modulo.addEventListener("submit", (e) => {
    e.preventDefault();
    const campi = {};
    const sforzo = letto(modulo, p, "sforzo");
    if (sforzo !== null && Number(sforzo) !== a.sforzo) campi.sforzo = Number(sforzo);
    if (a.stub) {
      const cosa = letto(modulo, p, "cosa");
      if (cosa) campi.tipo = cosa;
      const minuti = letto(modulo, p, "durata");
      if (minuti !== null) campi.secondi = Number(minuti) * 60;
    }
    const allenato = letto(modulo, p, "allenato");
    if (allenato && allenato !== a.allenato) campi.allenato = allenato;
    const prima = { borse: a.borse, kg: a.kg, notteFuori: a.notteFuori };
    const borse = {};
    rispostaBorse(modulo, p, borse);
    if (borse.borse && (borse.borse !== prima.borse || borse.kg !== prima.kg || (borse.notteFuori !== undefined && borse.notteFuori !== prima.notteFuori))) Object.assign(campi, borse);
    const sterrato = letto(modulo, p, "sterrato");
    if (sterrato) {
      const tipo = sterrato === "si" ? "GravelRide" : "Ride";
      if (tipo !== a.tipo) campi.tipo = tipo;
    }
    if (!Object.keys(campi).length) { stato.textContent = S.scegli; return; }
    ctx.azioni.rispostaUscita(a.id, campi);
  });
  return modulo;
}

function scheda(ctx, a, passo) {
  const durataTesto = durataDi(a);
  const pezzi = [
    durataTesto,
    a.metri ? U.km(numero(a.metri / 1000, a.metri < 10000 ? 1 : 0)) : null,
    a.dislivello ? U.salita(numero(a.dislivello)) : null,
  ].filter(Boolean);
  const tipo = nomeDi(a);
  const nome = a.nome && a.nome.toLowerCase() !== tipo.toLowerCase() ? a.nome : null;
  const segni = segniDi(a, passo);
  const id = `uscita-${pulisci(a.id)}`;
  const aperte = Array.isArray(ctx.ui.schedeAperte) ? ctx.ui.schedeAperte : [];
  const corpo = h("div", { class: "scheda-corpo" });
  const riempi = () => {
    if (corpo.childElementCount) return;
    corpo.append(
      numeriDellaScheda(a),
      a.doppioni && a.doppioni.length ? h("p", { class: "piccolo" }, S.doppione) : null,
      moduloScheda(ctx, a));
  };
  const el = h("details", { class: "uscita", id },
    h("summary", {},
      h("span", { class: "uscita-testa" },
        h("span", { class: "uscita-giorno" }, dataBreve(a.giorno)),
        h("span", { class: "uscita-tipo" }, tipo)),
      nome ? h("span", { class: "uscita-nome" }, nome) : null,
      pezzi.length ? h("span", { class: "uscita-numeri" }, pezzi.join(" · ")) : null,
      segni.length ? h("span", { class: "uscita-segni" }, segni.map((t) => h("span", { class: "segno" }, t))) : null),
    corpo);
  // La scheda aperta resta aperta quando la pagina si ridisegna, per esempio dopo una risposta.
  el.addEventListener("toggle", () => {
    const lista = Array.isArray(ctx.ui.schedeAperte) ? ctx.ui.schedeAperte : [];
    if (el.open) {
      riempi();
      if (!lista.includes(a.id)) ctx.ui.schedeAperte = [...lista, a.id];
    } else {
      ctx.ui.schedeAperte = lista.filter((x) => x !== a.id);
    }
  });
  if (aperte.includes(a.id)) { el.open = true; riempi(); }
  return el;
}

// Le ore in bici di ogni settimana, da lunedì, le ultime 12 fino a oggi (2.2, l'e-bike a metà).
function oreSettimane(attivita, oggi) {
  const lunedi = aggiungiGiorni(oggi, -giornoSettimana(oggi));
  const lista = [];
  for (let k = SETTIMANE - 1; k >= 0; k--) {
    const inizio = aggiungiGiorni(lunedi, -7 * k);
    let ore = 0;
    for (let g = 0; g < 7; g++) ore += oreDelGiorno(attivita, aggiungiGiorni(inizio, g));
    lista.push({ inizio, ore });
  }
  return lista;
}

export function sezioneUscite(ctx) {
  const oggi = ctx.oggi;
  const attivita = Array.isArray(ctx.attivita) ? ctx.attivita : [];
  const limite = aggiungiGiorni(oggi, -(GIORNI_LISTA - 1));
  const ultime = attivita.filter((a) => a && a.giorno >= limite && a.giorno <= oggi);
  const passoStima = ctx.stima && ctx.stima.passo ? ctx.stima.passo : null;
  const passo = {
    tenuti: new Set(passoStima ? passoStima.tenuti.map((g) => String(g.id)) : []),
    tolti: new Set(passoStima ? passoStima.tolti.map((g) => String(g.id)) : []),
  };
  const sett = oreSettimane(attivita, oggi);

  return h("section", { class: "sezione numeri-parte", id: "numeri-uscite", "aria-labelledby": "titolo-uscite" },
    h("h2", { id: "titolo-uscite" }, U.titolo),
    h("p", { class: "sezione-testo" }, U.attacco),
    h("section", { class: "carta blocco-grafico" },
      h("h3", {}, U.settimane.titolo),
      h("p", { class: "sezione-testo" }, U.settimane.testo),
      grafico({
        tipo: "colonne",
        date: false,
        descrizione: U.settimane.descrizione,
        etichette: sett.map((x) => U.settimane.dal(giornoMese(x.inizio))),
        // nel riquadro del dito la durata in parole, sull'asse la forma corta, che ci sta
        serie: [{ nome: U.settimane.ore, classe: "s1", valori: sett.map((x) => x.ore), formato: (v) => formatoDurata(v * 60) }],
        formatoAsse: (v) => (v ? durata(v * 3600) : "0"),
        vuoto: U.settimane.vuoto,
      })),
    h("section", { class: "sezione" },
      h("h3", {}, U.ultimi),
      ultime.length
        ? h("div", { class: "lista-uscite" }, ultime.map((a) => scheda(ctx, a, passo)))
        : h("p", { class: "vuoto" }, U.vuoto)));
}

// Per le domande ancora aperte di js/viste/numeri.js, il giorno e l'ora di un'uscita in parole.
export function quandoDi(a) {
  const giorno = dataLunga(a.giorno);
  const ora = typeof a.inizio === "string" ? formatoOra(a.inizio) : "";
  return { giorno, ora };
}

export { nomeDi, durataDi, pulisci };
