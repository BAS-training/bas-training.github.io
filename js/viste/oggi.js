// La pagina principale (7.4). Una carta sola con il semaforo di oggi, poi le domande del mattino,
// il tasto «Sto male», la riga «Ieri sera…», al massimo una carta in più, il «Perché» e, chiusi in
// fondo, i numeri del giorno. In viaggio la carta e le domande sono quelle di 4.5 e 7.10.
// L'esito arriva già calcolato da js/app.js (ctx.esito), con lo stato del giorno (ctx.giorno).

import { h, icona } from "../dom.js?v=202610312043";
import { numero, segno, dataLunga, formatoDurata } from "../formato.js?v=202610312043";
import { zonaFreschezza, ESITO_VOCE } from "../semaforo.js?v=202610312043";
import { nomeTipo } from "../modello.js?v=202610312043";
import { SEMAFORO } from "../parametri.js?v=202610312043";
import {
  SPIEGAZIONI, DOMANDE_MATTINO, OGGI, MATTINO, NUMERI_OGGI, STO_MALE, CAUSE, CONTROLLO, VIAGGIO, MESSAGGI,
  FIDUCIA, TETTI, CAMBIO_DISPOSITIVO,
} from "../testi.js?v=202610312043";
import { sparkline } from "../grafici.js?v=202610312043";
import { pillola, spiegazione, bannerDemo, luceSemaforo } from "./comuni.js?v=202610312043";

// Da due settimane in su il conto alla partenza si dice in settimane (7.4), stima nostra.
const GIORNI_IN_SETTIMANE = 14;
// La sera, per «Ce l'hai fatta» dell'ultimo giorno di viaggio, dalla stessa ora del saluto.
const ORA_SERA = 18;

function saluto(nome) {
  const ora = new Date().getHours();
  const parola = ora < 12 ? "Buongiorno" : ora < ORA_SERA ? "Buon pomeriggio" : "Buonasera";
  return nome ? `${parola}, ${nome}` : parola;
}

const SINTOMI_MALATTIA = new Set(STO_MALE.gruppi.filter((x) => x.id === "malattia").flatMap((x) => x.caselle.map((c) => c.id)));

// Il semaforo a punti dà a ogni voce un pallino verde, giallo o grigio. Il grigio usa lo stile neutro.
const COLORE_PALLINO = { verde: "verde", giallo: "giallo", grigio: "neutro" };
const colorePallino = (v) => COLORE_PALLINO[v.pallino] || "neutro";

const oggi = (m) => m.giorni[m.giorni.length - 1];
const diarioDiOggi = (m) => (m.diario && m.diario[m.oggi]) || {};
const lista = (v) => (Array.isArray(v) ? v : []);

function rispostePronte(m, g) {
  const o = oggi(m);
  if (g.evento) return Boolean(o.fatica && diarioDiOggi(m).viaggio);
  return Boolean(o.fatica && o.dolori && o.infortunio);
}

function occhiello(g) {
  if (g.evento) return VIAGGIO.giorno(g.evento.giorno, g.evento.giorni);
  const n = g.giorniPartenza;
  if (n === null || n === undefined) return OGGI.occhiello;
  if (n === 0) return OGGI.siParte;
  if (n >= GIORNI_IN_SETTIMANE) return OGGI.settimane(Math.floor(n / 7));
  return OGGI.giorni(n);
}

// Una scelta a un tocco, come bottone.
function bottoni(scelte, scegli, classe = "bottone bottone-secondario") {
  return h("div", { class: "riga-bottoni" }, scelte.map((s) => h("button", {
    class: classe, type: "button", on: { click: () => scegli(s.id) },
  }, s.testo)));
}

// --- la carta di oggi ---

// La domanda di controllo e quella sulla pedalata compaiono prima del livello (4.4). «Rispondo dopo»
// mostra il livello per questa apertura, e la domanda torna alla prossima.
function cartaControllo(ctx, domanda) {
  const g = ctx.giorno;
  const scegli = (id) => {
    if (domanda.chiave === "pedalata") { ctx.azioni.diario({ pedalata: id }); return; }
    if (id === "motivo") { ctx.ui.cause = true; ctx.ui.versoCause = true; }
    ctx.azioni.diario({ controllo: id });
  };
  return h("section", { class: ["semaforo", "semaforo-neutro", "semaforo-controllo"], "aria-labelledby": "semaforo-titolo" },
    h("div", { class: "semaforo-testa" },
      luceSemaforo("neutro"),
      h("div", { class: "semaforo-testo" },
        h("p", { class: "occhiello" }, occhiello(g)),
        h("h2", { id: "semaforo-titolo" }, CONTROLLO.titolo),
        h("p", { class: "semaforo-consiglio" }, CONTROLLO[domanda.chiave].testo),
        domanda.chiave === "pedalata" ? h("p", { class: "piccolo" }, CONTROLLO.pedalataDove) : null)),
    bottoni(domanda.scelte, scegli, "bottone"),
    h("p", {}, h("button", { class: "collegamento", type: "button", on: { click: () => ctx.azioni.ui("rispondoDopo", true) } }, CONTROLLO.dopo)));
}

function finitoIlViaggio(g) {
  if (g.arrivatoOggi) return true;
  const e = g.evento;
  if (!e || !e.giorni) return false;
  return e.giorno > e.giorni || (e.giorno === e.giorni && new Date().getHours() >= ORA_SERA);
}

function cartaSemaforo(ctx) {
  const m = ctx.modello;
  const e = ctx.esito;
  const g = ctx.giorno;
  const inViaggio = Boolean(g.evento);
  const dia = diarioDiOggi(m);
  // In viaggio i consigli di una riga valgono se la bici va avanti, non con il Rosso.
  const consigliViaggio = e.viaggio && e.livello !== "rosso" ? e.viaggio.consigli : [];
  const consiglio = [e.consiglio, ...e.aggiunte, ...consigliViaggio]
    .filter((t, k, tutte) => t && tutte.indexOf(t) === k).join(" ");
  // Le frasi che restano, una sola nota e gli inviti dal medico, senza ripetere il consiglio.
  const note = [inViaggio ? null : e.nota, ...e.medico.map((x) => x.testo)]
    .filter((t, k, tutte) => t && t !== e.consiglio && tutte.indexOf(t) === k);
  const fermo = e.stop === "cuore" || e.stop === "malattia";
  // Dal giorno dopo lo stop per malattia, se oggi non c'è un sintomo nuovo, si chiede se è passata (4.4).
  const malato = g.malattia && g.malattia.inCorso && g.malattia.dal < m.oggi
    && !lista(dia.stoMale).some((id) => SINTOMI_MALATTIA.has(id)) && dia.controllo !== "si";

  const tasti = [];
  if (malato) {
    tasti.push(h("button", { class: "bottone", type: "button", id: "senza-febbre",
      on: { click: () => ctx.azioni.diario({ senzaFebbre: true }) } }, STO_MALE.senzaFebbre));
  }
  if (inViaggio && !g.arrivatoOggi) {
    const appenaPartito = g.viaggio && g.viaggio.inizio === m.oggi;
    tasti.push(h("button", { class: "bottone bottone-secondario", type: "button", id: "arrivato",
      on: { click: () => ctx.azioni.arrivato() } }, appenaPartito ? VIAGGIO.nonInViaggio : VIAGGIO.arrivato));
  }

  return h("section", { class: ["semaforo", `semaforo-${e.colore}`], "aria-labelledby": "semaforo-titolo" },
    ctx.appenaSalvato ? h("p", { class: "salvato", role: "status" }, OGGI.salvato) : null,
    h("div", { class: "semaforo-testa" },
      luceSemaforo(e.colore),
      h("div", { class: "semaforo-testo" },
        h("p", { class: "occhiello" }, occhiello(g)),
        h("h2", { id: "semaforo-titolo" }, e.titolo),
        !rispostePronte(m, g) && !fermo ? h("p", { class: "semaforo-rispondi" }, MESSAGGI.rispondi) : null,
        h("p", { class: "semaforo-consiglio" }, consiglio),
        e.perche ? h("p", { class: "semaforo-perche" }, e.perche) : null,
        e.fiducia && e.fiducia.accanto && e.fiducia.testo ? h("p", { class: "piccolo" }, e.fiducia.testo) : null)),
    note.map((t) => h("p", { class: "semaforo-nota" }, t)),
    inViaggio && finitoIlViaggio(g) ? h("p", { class: "semaforo-nota semaforo-fine" }, VIAGGIO.fine) : null,
    inViaggio ? h("ul", { class: "promemoria" }, (e.viaggio ? e.viaggio.promemoria : VIAGGIO.promemoria).map((t) => h("li", {}, t))) : null,
    tasti.length ? h("div", { class: "riga-bottoni" }, tasti) : null);
}

// --- le domande del mattino ---

function scelteRadio(nome, opzioni, scelta) {
  return h("div", { class: "scelte" }, opzioni.map((o, k) => {
    const valore = typeof o === "string" ? String(k + 1) : o.id;
    const id = `${nome}-${valore}`;
    return h("span", { class: "scelta" },
      h("input", { type: "radio", id, name: nome, value: valore, checked: String(scelta) === valore }),
      h("label", { for: id }, typeof o === "string" ? o : o.testo));
  }));
}

function modulo(ctx, { titolo, attacco, campi, raccogli }) {
  const stato = h("p", { class: "stato-salvataggio", role: "status", "aria-live": "polite" });
  const form = h("form", { class: "carta domande", novalidate: true },
    h("h2", {}, titolo),
    attacco ? h("p", { class: "sezione-testo" }, attacco) : null,
    campi,
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "submit", id: "salva-risposte" }, MATTINO.salva),
      ctx.demo ? h("span", { class: "piccolo" }, MATTINO.demo) : null),
    stato);
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dati = raccogli(form);
    if (!dati) { stato.textContent = MATTINO.almenoUna; return; }
    const bottone = form.querySelector("button[type=submit]");
    bottone.disabled = true;
    stato.textContent = MATTINO.salvo;
    try {
      await ctx.azioni.salvaDomande(dati.risposte, dati.diario);
    } catch (errore) {
      bottone.disabled = false;
      stato.textContent = errore && errore.messaggio ? errore.messaggio : MATTINO.errore;
    }
  });
  return form;
}

// Le risposte date, con «Cambia le risposte». Una risposta può essere una lista, una riga per voce.
function riepilogo(titolo, righe, cambia) {
  return h("section", { class: "carta domande domande-fatte" },
    h("h2", {}, titolo),
    h("ul", { class: "risposte" }, righe.map(([domanda, risposta]) => h("li", {},
      h("span", { class: "risposte-domanda" }, domanda),
      Array.isArray(risposta)
        ? h("span", { class: "risposte-righe" }, risposta.map((r) => h("strong", {}, r)))
        : h("strong", {}, risposta)))),
    h("button", { class: "bottone bottone-secondario", type: "button", id: "cambia-risposte", on: { click: cambia } }, MATTINO.cambia));
}

// Le tre domande del mattino. Le risposte vanno su intervals.icu, nel giorno di oggi. Con «Molto
// doloranti» o «Un dolore» compare subito la domanda sulla pedalata, che resta sul telefono (4.4).
function domandeMattino(ctx) {
  const m = ctx.modello;
  const g = oggi(m);
  const risposte = { fatica: g.fatica, dolori: g.dolori, infortunio: g.infortunio };
  const pedalata = diarioDiOggi(m).pedalata || null;
  if (DOMANDE_MATTINO.every((d) => risposte[d.campo]) && !ctx.ui.modificaDomande) {
    const righe = DOMANDE_MATTINO.map((d) => [d.testo, d.opzioni[risposte[d.campo] - 1] || MATTINO.nessuna]);
    if (pedalata && (risposte.dolori === 4 || risposte.infortunio === 3)) {
      righe.push([CONTROLLO.pedalata.domanda, (CONTROLLO.pedalata.scelte.find((s) => s.id === pedalata) || {}).testo || MATTINO.nessuna]);
    }
    return riepilogo(MATTINO.fatte, righe, () => ctx.azioni.ui("modificaDomande", true));
  }

  const domandaPedalata = h("fieldset", { class: "domanda domanda-in-piu" },
    h("legend", {}, CONTROLLO.pedalata.domanda),
    scelteRadio("pedalata", CONTROLLO.pedalata.scelte, pedalata),
    h("p", { class: "piccolo" }, CONTROLLO.pedalataDove));
  const servePedalata = (form) => {
    const gambe = form.querySelector("input[name=gambe]:checked");
    const acciacchi = form.querySelector("input[name=acciacchi]:checked");
    return (gambe && gambe.value === "4") || (acciacchi && acciacchi.value === "3");
  };
  const campi = [
    ...DOMANDE_MATTINO.map((d) => h("fieldset", { class: "domanda" },
      h("legend", {}, d.testo),
      scelteRadio(d.nome, d.opzioni, risposte[d.campo] || null))),
    domandaPedalata,
  ];
  const form = modulo(ctx, {
    titolo: MATTINO.titolo,
    attacco: MATTINO.attacco,
    campi,
    raccogli: (f) => {
      const dati = {};
      for (const d of DOMANDE_MATTINO) {
        const scelto = f.querySelector(`input[name="${d.nome}"]:checked`);
        if (scelto) dati[d.campo] = Number(scelto.value);
      }
      if (!Object.keys(dati).length) return null;
      const p = f.querySelector("input[name=pedalata]:checked");
      return { risposte: dati, diario: servePedalata(f) && p ? { pedalata: p.value } : null };
    },
  });
  domandaPedalata.hidden = !servePedalata(form);
  form.addEventListener("change", () => { domandaPedalata.hidden = !servePedalata(form); });
  return form;
}

// Le tre domande in viaggio (4.5). L'energia va su intervals.icu come al solito, il sonno e «Qualcosa
// non va?» restano sul telefono. Ogni casella apre al massimo una scelta in più.
function domandeViaggio(ctx) {
  const m = ctx.modello;
  const g = oggi(m);
  const D = VIAGGIO.domande;
  const prima = diarioDiOggi(m).viaggio || {};
  const problemi = prima.problemi || {};
  const chiedeSonno = !g.sonno;
  const energia = D.energia.scelte;

  if (g.fatica && diarioDiOggi(m).viaggio && !ctx.ui.modificaViaggio) {
    const segnati = D.problemi.caselle.filter((c) => problemi[c.id] && c.id !== "niente").map((c) => {
      const scelta = (c.scelte || []).find((s) => s.id === problemi[c.id]);
      return scelta ? `${c.testo}, ${scelta.testo.toLowerCase()}` : c.testo;
    });
    const righe = [[D.energia.testo, energia[g.fatica - 1] || MATTINO.nessuna]];
    if (chiedeSonno && prima.sonno) righe.push([D.sonno.testo, (D.sonno.scelte.find((s) => s.id === prima.sonno) || {}).testo || MATTINO.nessuna]);
    righe.push([D.problemi.testo, segnati.length ? segnati : VIAGGIO.nienteSegnato]);
    return riepilogo(VIAGGIO.risposte, righe, () => ctx.azioni.ui("modificaViaggio", true));
  }

  const caselle = D.problemi.caselle.map((c) => {
    const id = `problema-${c.id}`;
    const acceso = c.id === "niente" ? Object.keys(problemi).length === 0 && Boolean(diarioDiOggi(m).viaggio) : Boolean(problemi[c.id]);
    const casella = h("input", { type: "checkbox", id, name: "problema", value: c.id, checked: acceso });
    const altre = c.scelte
      ? h("fieldset", { class: "domanda-sotto", hidden: !acceso },
        h("legend", { class: "nascosto" }, c.testo),
        scelteRadio(`problema-${c.id}-scelta`, c.scelte, problemi[c.id] && problemi[c.id] !== true ? problemi[c.id] : c.scelte[0].id))
      : null;
    return { c, casella, altre, elemento: h("div", { class: "casella-con-scelta" },
      h("span", { class: "scelta casella" }, casella, h("label", { for: id }, c.testo)),
      altre) };
  });
  // «Niente» toglie le altre, e una casella spuntata toglie «Niente».
  for (const x of caselle) {
    x.casella.addEventListener("change", () => {
      if (x.casella.checked && x.c.id === "niente") for (const y of caselle) if (y !== x) y.casella.checked = false;
      if (x.casella.checked && x.c.id !== "niente") for (const y of caselle) if (y.c.id === "niente") y.casella.checked = false;
      for (const y of caselle) if (y.altre) y.altre.hidden = !y.casella.checked;
    });
  }

  const campi = [
    h("fieldset", { class: "domanda" },
      h("legend", {}, D.energia.testo),
      scelteRadio("viaggio-energia", energia, g.fatica || null)),
    chiedeSonno ? h("fieldset", { class: "domanda" },
      h("legend", {}, D.sonno.testo),
      scelteRadio("viaggio-sonno", D.sonno.scelte, prima.sonno || null)) : null,
    h("fieldset", { class: "domanda" },
      h("legend", {}, D.problemi.testo),
      h("div", { class: "caselle-viaggio" }, caselle.map((x) => x.elemento))),
  ];
  return modulo(ctx, {
    titolo: VIAGGIO.titoloDomande,
    attacco: chiedeSonno ? VIAGGIO.attaccoDomande : VIAGGIO.attaccoDomandeCorto,
    campi,
    raccogli: (f) => {
      const e = f.querySelector("input[name=viaggio-energia]:checked");
      const s = f.querySelector("input[name=viaggio-sonno]:checked");
      const scelti = {};
      let qualcosa = false;
      for (const x of caselle) {
        if (!x.casella.checked) continue;
        qualcosa = true;
        if (x.c.id === "niente") continue;
        if (!x.altre) { scelti[x.c.id] = true; continue; }
        const scelta = f.querySelector(`input[name="problema-${x.c.id}-scelta"]:checked`);
        scelti[x.c.id] = scelta ? scelta.value : x.c.scelte[0].id;
      }
      if (!e && !s && !qualcosa) return null;
      const viaggio = { problemi: scelti };
      if (s) viaggio.sonno = s.value;
      return { risposte: e ? { fatica: Number(e.value) } : {}, diario: { viaggio } };
    },
  });
}

// --- «Sto male» e «Ieri sera…» ---

function caselle(nome, elenco, scelte, cambia) {
  return h("div", { class: "scelte caselle" }, elenco.map((c) => {
    const id = `${nome}-${c.id}`;
    return h("span", { class: "scelta casella" },
      h("input", { type: "checkbox", id, name: nome, value: c.id, checked: scelte.includes(c.id),
        on: { change: (e) => cambia(e.target.closest("details, form, section")) } }),
      h("label", { for: id }, c.testo));
  }));
}

function spuntate(contenitore, nome) {
  return [...contenitore.querySelectorAll(`input[name="${nome}"]:checked`)].map((x) => x.value);
}

// Un tasto sempre visibile sotto la carta, non una domanda in più (4.4).
function pannelloStoMale(ctx) {
  const m = ctx.modello;
  const dia = diarioDiOggi(m);
  const segnati = lista(dia.stoMale);
  const g = ctx.giorno;
  const malattiaDiPrima = g.malattia && g.malattia.inCorso && g.malattia.dal < m.oggi && dia.controllo !== "si"
    && !segnati.some((id) => SINTOMI_MALATTIA.has(id));
  const pannello = h("details", { class: "sto-male", open: ctx.ui.stoMale || null },
    h("summary", { class: "bottone bottone-secondario sto-male-tasto" }, STO_MALE.tasto,
      segnati.length ? h("span", { class: "conta" }, STO_MALE.segnati(segnati.length)) : null),
    h("div", { class: "pannello" },
      h("p", { class: "sezione-testo" }, STO_MALE.attacco),
      malattiaDiPrima ? h("div", { class: "pannello-febbre" },
        h("p", {}, h("strong", {}, STO_MALE.febbrePassata)),
        h("button", { class: "bottone", type: "button", id: "senza-febbre-pannello",
          on: { click: () => ctx.azioni.diario({ senzaFebbre: true }) } }, STO_MALE.senzaFebbre)) : null,
      STO_MALE.gruppi.map((gruppo) => h("fieldset", { class: ["domanda", `gruppo-${gruppo.id}`] },
        h("legend", {}, gruppo.titolo),
        caselle("sto-male", gruppo.caselle, segnati, (contenitore) => ctx.azioni.diario({ stoMale: spuntate(contenitore, "sto-male") }))))));
  pannello.addEventListener("toggle", () => { ctx.ui.stoMale = pannello.open; });
  return pannello;
}

// La riga chiusa «Ieri sera…» con le cause note. La casella del ciclo solo per chi la accende (4.4).
function causeIeriSera(ctx) {
  const m = ctx.modello;
  const dia = diarioDiOggi(m);
  const scelte = lista(dia.cause);
  const elenco = CAUSE.caselle.filter((c) => !c.soloSeAccesa || ctx.profilo.ciclo);
  const dopoIlMotivo = dia.controllo === "motivo" && !scelte.length;
  const riga = h("details", { class: "carta cause", id: "cause", open: ctx.ui.cause || dopoIlMotivo || null },
    h("summary", {}, h("span", { class: "cause-titolo" }, CAUSE.titolo),
      scelte.length ? h("span", { class: "conta" }, CAUSE.segnate(scelte.length)) : null),
    dopoIlMotivo ? h("p", { class: "domanda-in-piu" }, CONTROLLO.motivo) : null,
    h("p", { class: "sezione-testo" }, CAUSE.attacco),
    caselle("causa", elenco, scelte, (contenitore) => ctx.azioni.diario({ cause: spuntate(contenitore, "causa") })));
  riga.addEventListener("toggle", () => { ctx.ui.cause = riga.open; });
  if (ctx.ui.versoCause) {
    ctx.ui.versoCause = false;
    setTimeout(() => {
      if (!riga.isConnected) return;
      riga.scrollIntoView({ block: "start" });
      const prima = riga.querySelector("input");
      if (prima) prima.focus({ preventScroll: true });
    }, 0);
  }
  return riga;
}

// --- la carta in più, una sola per apertura (6.4) ---

function cartaInPiu(ctx) {
  const carta = ctx.giorno.carta;
  if (!carta) return null;
  const rispondi = (id) => ctx.azioni.carta(carta, id);
  if (carta === "parti") {
    return h("section", { class: "carta carta-in-piu" },
      h("h2", {}, VIAGGIO.parti.domanda),
      bottoni(VIAGGIO.parti.scelte, rispondi));
  }
  if (carta === "proposta") {
    return h("section", { class: "carta carta-in-piu" },
      h("h2", {}, VIAGGIO.proposta),
      bottoni([{ id: "si", testo: VIAGGIO.propostaSi }, { id: "no", testo: VIAGGIO.propostaNo }], rispondi));
  }
  if (carta === "dispositivo") {
    return h("section", { class: "carta carta-in-piu" },
      h("h2", {}, MESSAGGI.dispositivo),
      bottoni(CAMBIO_DISPOSITIVO.scelte, rispondi));
  }
  return null;
}

// --- il «Perché», chiuso (4.8), con «Quanto fidarti oggi» quando la fiducia non è alta (4.7) ---

function riga(nome, testo, colore) {
  return h("li", { class: ["voce", `voce-${colore}`] },
    h("span", { class: "voce-pallino", "aria-hidden": "true" }),
    h("span", { class: "voce-nome" }, nome, h("span", { class: "voce-esito" }, ESITO_VOCE[colore])),
    h("span", { class: "voce-testo" }, testo));
}

function perche(ctx) {
  const e = ctx.esito;
  const inViaggio = Boolean(ctx.giorno.evento);
  const righe = e.voci.map((v) => riga(v.nome, v.testo, colorePallino(v)));
  for (const t of e.tetti) righe.push(riga(TETTI[t.chiave] || t.chiave, t.perche, "giallo"));
  const note = [
    inViaggio ? e.nota : null,
    ...e.messaggi.filter((x) => x.chiave === "insolita" || x.chiave === "sopraSolito").map((x) => x.testo),
  ].filter((t, k, tutte) => t && tutte.indexOf(t) === k);
  const f = e.fiducia;
  const fiducia = f && f.indice && f.indice !== "alta"
    ? h("div", { class: "fiducia" },
      h("h3", {}, FIDUCIA.titolo),
      h("p", {}, h("strong", {}, `${FIDUCIA.livelli[f.indice]}. `), [...f.righe, FIDUCIA.risposte].join(" ")))
    : null;
  return h("details", { class: "carta perche", id: "perche" },
    h("summary", {}, OGGI.perche),
    h("ul", { class: "voci" }, righe),
    note.map((t) => h("p", { class: "perche-nota" }, t)),
    fiducia);
}

// --- i numeri del giorno, chiusi in fondo ---

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

function numeriDelGiorno(m, esito) {
  const T = NUMERI_OGGI;
  const g = m.giorni;
  const o = oggi(m);
  const ultimi = (n, campo, fn = (v) => v) => g.slice(-n).map((x) => (x[campo] ? fn(x[campo]) : null));
  const coloreVoce = (chiave) => {
    const v = esito.voci.find((x) => x.chiave === chiave);
    return v ? colorePallino(v) : null;
  };
  const bh = esito.basi ? esito.basi.hrv : m.base.hrv;
  const bf = esito.basi ? esito.basi.fc : m.base.fc;
  const zona = zonaFreschezza(m.mattino.formaPct);
  const differenzaFitness = m.mattino.ctl !== null && m.fitness28 !== null ? m.mattino.ctl - m.fitness28 : null;
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

  return h("details", { class: "numeri-oggi" },
    h("summary", {}, T.titolo),
    h("div", { class: "numeri-dentro" },
      h("p", { class: "sezione-testo" }, notteMai ? T.attaccoSenzaNotte : T.attacco),
      h("div", { class: "griglia-tessere" }, tessere),
      ultimaUscita(m)));
}

function ultimaUscita(m) {
  const T = NUMERI_OGGI;
  const u = m.uscite.find((x) => x.nome || x.secondi || x.carico !== null);
  if (!u) return null;
  const tipo = nomeTipo(u.tipo, u.sorgente);
  const pezzi = [
    u.secondi ? formatoDurata(u.secondi / 60) : null,
    u.metri ? T.km(numero(u.metri / 1000, u.metri < 10000 ? 1 : 0)) : null,
    u.dislivello ? T.salita(numero(u.dislivello)) : null,
    u.carico !== null ? T.punti(numero(u.carico)) : null,
  ].filter(Boolean);
  return h("section", { class: "carta ultima" },
    h("p", { class: "occhiello" }, T.ultima),
    h("h3", {}, u.nome || tipo),
    h("p", { class: "ultima-quando" }, u.nome && u.nome.toLowerCase() !== tipo.toLowerCase() ? `${tipo}, ${dataLunga(u.d)}` : dataLunga(u.d)),
    pezzi.length ? h("p", { class: "ultima-numeri" }, pezzi.join(" · ")) : null,
    h("a", { href: "#uscite" }, T.tutte));
}

function avvisoNotte(ctx) {
  return h("aside", { class: "banner" },
    h("p", {}, MESSAGGI.notteNonArrivata),
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone bottone-secondario", type: "button", on: { click: () => ctx.azioni.ricarica() } },
        icona("aggiorna"), "Aggiorna")));
}

export function vistaOggi(ctx) {
  const m = ctx.modello;
  const e = ctx.esito;
  const g = ctx.giorno;
  const inViaggio = Boolean(g.evento);
  const domanda = !ctx.ui.rispondoDopo && e.controllo.length ? e.controllo[0] : null;
  return h("div", { class: "vista vista-oggi" },
    h("header", { class: "intestazione intestazione-oggi" },
      h("div", { class: "intestazione-testo" },
        h("p", { class: "occhiello" }, dataLunga(m.oggi)),
        h("h1", {}, saluto(m.atleta.nome))),
      inViaggio ? null : h("button", { class: "bottone bottone-secondario bottone-viaggio", type: "button", id: "sono-in-viaggio",
        on: { click: () => ctx.azioni.inViaggio() } }, VIAGGIO.tasto)),
    ctx.demo ? bannerDemo(ctx) : null,
    !m.notteArrivata && !m.notteMaiArrivata && !ctx.demo ? avvisoNotte(ctx) : null,
    domanda ? cartaControllo(ctx, domanda) : cartaSemaforo(ctx),
    inViaggio ? domandeViaggio(ctx) : domandeMattino(ctx),
    pannelloStoMale(ctx),
    // In viaggio le notti non contano, e la riga serve solo dopo «C'è un motivo».
    !inViaggio || diarioDiOggi(m).controllo === "motivo" ? causeIeriSera(ctx) : null,
    cartaInPiu(ctx),
    perche(ctx),
    h("p", { class: "semaforo-piede" }, h("a", { href: "#guida" }, OGGI.comeNasce)),
    numeriDelGiorno(m, e));
}
