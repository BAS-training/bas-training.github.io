// La pagina Numeri (7.11), per chi ama i numeri. Dall'alto i sei numeri di oggi con le loro
// spiegazioni, le domande ancora aperte, la Fitness di Come sto con la riga della differenza (6.5),
// i numeri che accompagnano il verdetto senza deciderlo (2.6), poi Andamento e Uscite (7.2), che
// stanno in js/viste/andamento.js e js/viste/uscite.js. #andamento e #uscite portano alla loro parte.
// I testi stanno in js/testi-numeri.js.

import { h } from "../dom.js?v=202611022140";
import { numero, segno, formatoDurata, dataLunga } from "../formato.js?v=202611022140";
import { zonaFreschezza } from "../semaforo.js?v=202611022140";
import { aggiungiGiorni, giorniTra } from "../modello.js?v=202611022140";
import { SEMAFORO, PRONTEZZA } from "../parametri.js?v=202611022140";
import { NUMERI_PAGINA, NUMERI_OGGI, NUMERI_DOMANDE, NUMERI_AVVENTURA, NUMERI_USCITE, SPIEGAZIONI } from "../testi-numeri.js?v=202611022140";
import { testoFitness, testoDurabilita, testoPalestra, testoStomaco } from "../testi-prontezza.js?v=202611022140";
import { sparkline } from "../grafici.js?v=202611022140";
import { intestazione, pillola, spiegazione, bannerDemo } from "./comuni.js?v=202611022140";
import { sezioneAndamento } from "./andamento.js?v=202611022140";
import {
  sezioneUscite, gruppo, letto, domandeBorse, rispostaBorse, conNotteFuori, aMemoria, piedeModulo, sceltaSforzo,
  sceltaDurata, DURATE, quandoDi, nomeDi, durataDi, pulisci,
} from "./uscite.js?v=202611022140";

const T = NUMERI_OGGI;
const D = NUMERI_DOMANDE;
const A = NUMERI_AVVENTURA;
const STOMACO_SETTIMANE = -PRONTEZZA.specchi.stomacoDa;   // l'obiettivo di cibo dalla settimana −10 (3.9)
const FORMA_GIORNI = 21;     // Fitness meno Fatica alla partenza si guarda nelle ultime 3 settimane, stima nostra
const SEMAFORO_DI_OGGI = new Set(["parti", "proposta", "dispositivo"]);

// Il semaforo a punti dà a ogni voce un pallino verde, giallo o grigio. Il grigio usa lo stile neutro.
const COLORE_PALLINO = { verde: "verde", giallo: "giallo", grigio: "neutro" };
const maiuscola = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

function sezione(id, titolo, ...contenuto) {
  return h("section", { class: "sezione numeri-parte", id: `numeri-${id}`, "aria-labelledby": `titolo-${id}` },
    h("h2", { id: `titolo-${id}` }, titolo),
    contenuto);
}

// --- I sei numeri di oggi (7.11), gli stessi che il semaforo ha guardato stamattina ---

function tessera({ chiave, nome, valore, unita, sotto, colore, serie, classeSerie }) {
  const testo = SPIEGAZIONI[chiave];
  return h("article", { class: "tessera" },
    h("header", { class: "tessera-testa" },
      h("div", {},
        h("h3", {}, nome),
        testo ? h("p", { class: "tessera-cosa" }, testo.sottotitolo) : null),
      colore ? pillola(colore) : null),
    h("p", { class: "tessera-valore" }, valore, unita ? h("span", { class: "unita" }, unita) : null),
    sotto ? h("p", { class: "tessera-sotto" }, sotto) : null,
    serie ? sparkline(serie, classeSerie) : null,
    spiegazione(testo));
}

function numeriDiOggi(ctx) {
  const m = ctx.modello;
  const esito = ctx.esito || {};
  const g = m.giorni;
  const o = g[g.length - 1] || {};
  const voci = Array.isArray(esito.voci) ? esito.voci : [];
  const ultimi = (n, campo, fn = (v) => v) => g.slice(-n).map((x) => (x[campo] ? fn(x[campo]) : null));
  const coloreVoce = (chiave) => {
    const v = voci.find((x) => x.chiave === chiave);
    return v ? COLORE_PALLINO[v.pallino] || "neutro" : null;
  };
  const bh = esito.basi ? esito.basi.hrv : m.base.hrv;
  const bf = esito.basi ? esito.basi.fc : m.base.fc;
  const zona = zonaFreschezza(m.mattino.formaPct);
  const differenzaFitness = m.mattino.ctl !== null && m.fitness28 !== null && m.fitness28 !== undefined ? m.mattino.ctl - m.fitness28 : null;
  const notteMai = m.notteMaiArrivata;
  const minuti = (secondi) => formatoDurata(secondi / 60);

  const tessere = [];
  if (!notteMai) {
    tessere.push(
      tessera({
        chiave: "hrv", nome: T.hrv, valore: numero(o.hrv), unita: o.hrv ? "ms" : null,
        sotto: bh.ok ? T.normaleHrv(numero(bh.basso), numero(bh.alto))
          : m.hrvMisurato ? T.impara(bh.n, SEMAFORO.hrv.nottiPunti) : T.hrvMai,
        colore: coloreVoce("hrv"), serie: ultimi(21, "hrv"),
      }),
      tessera({
        chiave: "fc", nome: T.fc, valore: numero(o.fc), unita: o.fc ? T.battiti : null,
        sotto: bf.ok ? T.normaleFc(numero(bf.solito)) : T.impara(bf.n, SEMAFORO.battito.nottiProvvisorie),
        colore: coloreVoce("fc"), serie: ultimi(21, "fc"),
      }),
      tessera({
        chiave: "sonno", nome: T.sonno, valore: o.sonno ? minuti(o.sonno) : "—",
        sotto: [o.punteggioSonno ? T.punteggio(numero(o.punteggioSonno)) : null,
          m.sonnoSettimana ? T.mediaSettimana(minuti(m.sonnoSettimana)) : null].filter(Boolean).join(", "),
        colore: coloreVoce("sonno"), serie: ultimi(21, "sonno", (v) => v / 3600),
      }));
  }
  tessere.push(
    tessera({
      chiave: "freschezza", nome: T.freschezza,
      valore: m.mattino.formaPct !== null ? `${segno(m.mattino.formaPct * 100)}%` : "—",
      sotto: zona ? T.zona(zona.nome, numero(m.mattino.ctl), numero(m.mattino.atl)) : T.pochiGiri,
      serie: g.slice(-29, -1).map((x) => (x.formaPct !== null && x.ctl >= 10 ? x.formaPct * 100 : null)),
    }),
    tessera({
      chiave: "fitness", nome: T.fitness, valore: numero(m.mattino.ctl),
      sotto: differenzaFitness !== null ? T.differenza(segno(differenzaFitness)) : null,
      serie: g.slice(-91, -1).map((x) => x.ctl),
    }),
    tessera({
      chiave: "carico", nome: T.carico,
      valore: m.mattino.rapporto !== null ? numero(m.mattino.rapporto, 1) : "—",
      unita: m.mattino.rapporto !== null ? T.volte : null,
      sotto: m.mattino.rapporto === null ? T.pochiGiri : T.finoA(numero(SEMAFORO.carico.alto.rapporto, 1)),
      colore: coloreVoce("carico"),
      serie: g.slice(-29, -1).map((x) => (x.ctl > 0 && x.atl !== null ? x.atl / x.ctl : null)), classeSerie: "s2",
    }));

  return sezione("oggi", NUMERI_PAGINA.oggi,
    h("p", { class: "sezione-testo" }, notteMai ? T.attaccoSenzaNotte : T.attacco),
    h("p", { class: "piccolo" }, NUMERI_PAGINA.ieriSera),
    h("div", { class: "griglia-tessere" }, tessere));
}

// --- Le domande ancora aperte (7.11 e 6.4) ---

function giornoDetto(ctx, giorno) {
  return giorno === aggiungiGiorni(ctx.oggi, -1) ? D.ieri : maiuscola(dataLunga(giorno));
}

function testaUscita(ctx, a) {
  const cosa = [nomeDi(a), durataDi(a)].filter(Boolean).join(", ");
  return D.uscita(giornoDetto(ctx, a.giorno), cosa);
}

// Le domande di una carta, con il titolo, e la funzione che legge le risposte nella forma di
// rispondiCarta. Restituisce null per le carte che stanno solo nella pagina Oggi.
function domandeDellaCarta(ctx, carta, p) {
  const a = carta.attivita;
  const sforzo = (nota = null) => gruppo(p, "sforzo", D.sforzo.domanda, D.sforzo.scelte, a ? sceltaSforzo(a.sforzo) : null, { nota });
  const sforzoLetto = (form, campi) => {
    const v = letto(form, p, "sforzo");
    if (v !== null) campi.sforzo = Number(v);
  };
  switch (carta.tipo) {
    case "lunga": return {
      titolo: testaUscita(ctx, a),
      parti: [...domandeBorse(ctx, p, a, { notte: conNotteFuori(ctx, a) }), a.sforzo === null ? sforzo() : null],
      leggi: (form) => { const c = {}; rispostaBorse(form, p, c); sforzoLetto(form, c); return c; },
    };
    case "sforzo": return {
      titolo: testaUscita(ctx, a),
      parti: [sforzo(aMemoria(ctx, a) ? D.sforzo.aMemoria : null)],
      leggi: (form) => { const c = {}; sforzoLetto(form, c); return c; },
    };
    case "palestra": return {
      titolo: testaUscita(ctx, a),
      parti: [gruppo(p, "allenato", D.palestra.domanda, D.palestra.scelte, null), sforzo()],
      leggi: (form) => {
        const c = {};
        const allenato = letto(form, p, "allenato");
        if (allenato) c.allenato = allenato;
        sforzoLetto(form, c);
        return c;
      },
    };
    case "stub": {
      const { giorno, ora } = quandoDi(a);
      return {
        titolo: NUMERI_USCITE.daStrava,
        testo: D.stub(giorno, ora),
        parti: [
          gruppo(p, "cosa", D.cosEra.domanda, D.cosEra.scelte, "bici"),
          gruppo(p, "durata", D.durata.domanda, DURATE, sceltaDurata(a.secondi)),
          sforzo(),
          ...(carta.borse ? domandeBorse(ctx, p, a) : []),
        ],
        leggi: (form) => {
          const c = {};
          const cosa = letto(form, p, "cosa");
          if (cosa) c.tipo = cosa;
          const minuti = letto(form, p, "durata");
          if (minuti !== null) c.secondi = Number(minuti) * 60;
          sforzoLetto(form, c);
          rispostaBorse(form, p, c);
          return c;
        },
      };
    }
    case "prova": {
      const esito = gruppo(p, "prova", D.prova.domanda, D.prova.scelte, null);
      const aree = gruppo(p, "aree", D.prova.aree.domanda, D.prova.aree.scelte, [], { multipla: true, nascosto: true });
      esito.addEventListener("change", (e) => { aree.hidden = e.target.value !== "sistemare"; });
      return {
        titolo: testaUscita(ctx, a),
        parti: [esito, aree],
        leggi: (form) => {
          const v = letto(form, p, "prova");
          if (!v) return {};
          const scelte = v === "sistemare" ? letto(form, p, "aree", { multipla: true }) : [];
          if (v === "sistemare" && !scelte.length) return { manca: D.aree };
          return { prova: { giorno: carta.giorno, esito: v, aree: scelte } };
        },
      };
    }
    case "seduta": {
      const s = carta.seduta || {};
      const domanda = typeof s.minuti === "number" && s.minuti > 0
        ? D.sedutaPiano(giornoDetto(ctx, carta.giorno), formatoDurata(s.minuti))
        : D.sedutaSenzaDurata(giornoDetto(ctx, carta.giorno));
      const risposta = gruppo(p, "risposta", domanda, D.seduta.scelte, null);
      const durata = gruppo(p, "durata", D.durata.domanda, DURATE, sceltaDurata(typeof s.minuti === "number" ? s.minuti * 60 : null), { nascosto: true });
      const fatica = gruppo(p, "sforzo", D.sforzo.domanda, D.sforzo.scelte, null, { nascosto: true });
      risposta.addEventListener("change", (e) => {
        durata.hidden = e.target.value !== "diverso";
        fatica.hidden = e.target.value === "no";
      });
      return {
        titolo: null,
        parti: [risposta, durata, fatica],
        leggi: (form) => {
          const v = letto(form, p, "risposta");
          if (!v) return {};
          const c = { risposta: v };
          if (v === "diverso") {
            const minuti = letto(form, p, "durata");
            if (minuti !== null) c.minuti = Number(minuti);
          }
          if (v !== "no") {
            const f = letto(form, p, "sforzo");
            if (f !== null) c.sforzo = Number(f);
          }
          return c;
        },
      };
    }
    default: return null;
  }
}

function cartaAperta(ctx, carta) {
  const p = `carta-${pulisci(carta.chiave)}`;
  const def = domandeDellaCarta(ctx, carta, p);
  if (!def) return null;
  const { riga, stato } = piedeModulo(ctx, D.salva, () => ctx.azioni.nonLoSo(carta));
  const form = h("form", { class: "carta domanda-aperta", novalidate: true },
    def.titolo ? h("h3", {}, def.titolo) : null,
    def.testo ? h("p", {}, def.testo) : null,
    def.parti.filter(Boolean),
    riga, stato);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const campi = def.leggi(form);
    if (campi.manca) { stato.textContent = campi.manca; return; }
    if (!Object.keys(campi).length) { stato.textContent = D.scegli; return; }
    ctx.azioni.rispondiCarta(carta, campi);
  });
  return form;
}

function domandeAperte(ctx) {
  const carte = Array.isArray(ctx.carteAperte) ? ctx.carteAperte : [];
  if (!carte.length) return null;
  const delSemaforo = carte.some((c) => SEMAFORO_DI_OGGI.has(c.tipo));
  const qui = carte.filter((c) => !SEMAFORO_DI_OGGI.has(c.tipo)).map((c) => cartaAperta(ctx, c)).filter(Boolean);
  if (!qui.length && !delSemaforo) return null;
  return sezione("domande", D.titolo,
    qui.length ? h("p", { class: "sezione-testo" }, D.attacco) : null,
    qui.length ? h("div", { class: "domande-aperte" }, qui) : null,
    delSemaforo ? h("p", { class: "riga-con-tasto" }, D.suOggi, " ",
      h("button", { class: "collegamento", type: "button", on: { click: () => ctx.azioni.vai("oggi") } }, D.vaiOggi)) : null);
}

// --- La Fitness di Come sto (6.5) ---

function fitnessDiComeSto(ctx) {
  const f = ctx.fitness;
  if (!f || typeof f.comeSto !== "number") return null;
  return sezione("fitness", A.fitnessTitolo,
    h("p", { class: "sezione-testo" }, A.fitnessTesto),
    h("dl", { class: "cifre" },
      h("div", {}, h("dt", {}, A.fitnessComeSto), h("dd", {}, numero(f.comeSto))),
      typeof f.intervals === "number" ? h("div", {}, h("dt", {}, A.fitnessIntervals), h("dd", {}, numero(f.intervals))) : null),
    typeof f.intervals === "number" ? h("p", {}, f.differenza ? f.differenza.testo : A.fitnessUguale) : null);
}

// --- Verso la tua avventura, i numeri che non decidono (2.6) ---

function riquadro(titolo, ...testi) {
  const righe = testi.flat().filter(Boolean);
  if (!righe.length) return null;
  return h("article", { class: "carta riquadro-numeri" },
    h("h3", {}, titolo),
    righe.map((t) => h("p", {}, t)));
}

function formaAllaPartenza(ctx, ob) {
  if (!ob.partenza) return null;
  const mancano = giorniTra(ctx.oggi, ob.partenza);
  const m = ctx.modello.mattino;
  if (!(mancano > 0 && mancano <= FORMA_GIORNI) || typeof m.ctl !== "number" || typeof m.atl !== "number") return null;
  const f = PRONTEZZA.specchi.formaPartenza;
  const [da, a] = typeof ob.giorni === "number" && ob.giorni > 5 ? f.lunga : f.breve;
  return riquadro(A.forma, A.formaTesto(segno(m.ctl - m.atl), segno(da), segno(a), segno(f.nonAllarmeDa)));
}

function ilPasso(ctx) {
  const st = ctx.stima;
  if (!st) return null;
  const passo = st.passo;
  if (!passo || !Array.isArray(passo.tenuti) || !passo.tenuti.length) return riquadro(A.passo, A.passoNo);
  return riquadro(A.passo,
    A.passoGiri(passo.tenuti.length, passo.giorni),
    passo.tolti && passo.tolti.length ? A.passoFuori(passo.tolti.length) : null);
}

function versoLAvventura(ctx) {
  const ob = ctx.obiettivo;
  if (!ob || ob.tipo === "semaforo") return null;
  const st = ctx.stima;
  const pr = ctx.prontezza;
  const blocchi = [];
  if (st && typeof st.kj === "number" && typeof st.punti === "number") {
    blocchi.push(riquadro(A.lavoro, A.lavoroTesto(numero(Math.round(st.kj / 100) * 100), numero(Math.round(st.punti / 10) * 10)), A.lavoroCosa));
  }
  if (pr) {
    const avvisi = (Array.isArray(pr.avvisi) ? pr.avvisi : []).filter((x) => x && (x.tipo === "intensita" || x.tipo === "sforzo")).map((x) => x.testo);
    blocchi.push(riquadro(A.specchio, pr.confronto ? testoFitness(pr.confronto) : null, avvisi));
    blocchi.push(riquadro(A.lunghe, testoDurabilita(pr.durabilita)));
    blocchi.push(riquadro(A.palestra, testoPalestra(pr.palestra)));
    const mancano = ob.partenza ? giorniTra(ctx.oggi, ob.partenza) : null;
    if (mancano !== null && mancano > 0 && mancano <= 7 * STOMACO_SETTIMANE) blocchi.push(riquadro(A.stomaco, testoStomaco(pr.stomaco)));
  }
  blocchi.push(formaAllaPartenza(ctx, ob));
  blocchi.push(ilPasso(ctx));
  const pieni = blocchi.filter(Boolean);
  if (!pieni.length) return null;
  return sezione("avventura", A.titolo,
    h("p", { class: "sezione-testo" }, A.attacco),
    h("div", { class: "griglia-numeri" }, pieni));
}

export function vistaNumeri(ctx) {
  return h("div", { class: "vista vista-numeri" },
    intestazione(NUMERI_PAGINA.sottotitolo, NUMERI_PAGINA.titolo, NUMERI_PAGINA.attacco),
    ctx.demo ? bannerDemo(ctx) : null,
    numeriDiOggi(ctx),
    domandeAperte(ctx),
    fitnessDiComeSto(ctx),
    versoLAvventura(ctx),
    sezioneAndamento(ctx),
    sezioneUscite(ctx));
}
