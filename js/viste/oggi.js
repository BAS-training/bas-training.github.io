// La pagina principale (7.4). In alto la carta di oggi, cioè cosa fare, quanto e perché, con il semaforo
// che la aggiusta. Sotto, in quest'ordine, le domande del mattino, il tasto «Sto male», la riga «Ieri
// sera…», al massimo una carta in più (due quando una è sulle borse, 6.4), il controllo della domenica
// (7.9), i messaggi di una volta sola, il «Perché» e il collegamento alla Guida. Le sei tessere dei
// numeri stanno nella pagina Numeri (7.2). In viaggio la carta e le domande sono quelle di 4.5 e 7.10.
// Tutto arriva già calcolato da js/app.js e js/motore.js, il contratto è in cima a js/motore.js.

import { h, icona } from "../dom.js?v=202610312043";
import { dataLunga, formatoDurata, formatoOra, numero } from "../formato.js?v=202610312043";
import { inBici } from "../dati.js?v=202610312043";
import { DOMANDE } from "../parametri.js?v=202610312043";
import {
  LIVELLI, ESITO_VOCE, DOMANDE_MATTINO, OGGI, MATTINO, STO_MALE, CAUSE, CONTROLLO, VIAGGIO, MESSAGGI, FIDUCIA, TETTI,
  CAMBIO_DISPOSITIVO,
} from "../testi.js?v=202610312043";
import {
  saluto, AL_EVENTO, contoPartenza, CARTA, CARTE, titoloUscita, titoloPalestra, titoloStub, arrivaDa, sedutaDiIeri,
  lHaiFatto, DOMENICA_OGGI, UNA_VOLTA,
} from "../testi-oggi.js?v=202610312043";
import { TASTI, STOMACO, testoSposta, testoSalta, testoPalestraSposta } from "../testi-piano.js?v=202610312043";
import { TESTI_DATI } from "../testi-dati.js?v=202610312043";
import { PROMEMORIA } from "../testi-app.js?v=202610312043";
import { bannerDemo, luceSemaforo } from "./comuni.js?v=202610312043";

// La sera, per «Ce l'hai fatta» dell'ultimo giorno di viaggio, dalla stessa ora del saluto.
const ORA_SERA = 18;
// Le ultime 6 settimane, per sapere se i giri arrivano da soli e quindi se serve «Fatto» (7.4).
const GIORNI_DISPOSITIVO = 42;
// Con i soli sintomi sopra il collo al massimo un'ora facile (4.4).
const COLLO_MINUTI = 60;
// Le scelte dei chili delle borse (6.4), a cui si aggiunge il peso dell'obiettivo.
const KG_SCELTE = [5, 8, 12, 16];
// Le prove generali del piano, per la riga della posizione dopo la prova (7.5).
const PROVA_GENERALE = /^(T3|prova)$/;
const ORA = 3600;
const GIORNO_MS = 86400000;

const lista = (v) => (Array.isArray(v) ? v : []);
const oggetto = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : null);
const num = (v) => typeof v === "number" && Number.isFinite(v);
const unici = (testi) => testi.filter((t, k) => typeof t === "string" && t && testi.indexOf(t) === k);

function utc(iso) {
  const [a, m, g] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}
const piuGiorni = (iso, n) => new Date(utc(iso) + n * GIORNO_MS).toISOString().slice(0, 10);
const lunediDi = (iso) => piuGiorni(iso, -((new Date(utc(iso)).getUTCDay() + 6) % 7));

// I minuti di un'ora locale come «2026-11-01T08:30», solo per fare differenze. null senza l'ora.
function minutiDi(locale) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})\D(\d{2})/.exec(typeof locale === "string" ? locale : "");
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000 : null;
}

const ultimoGiorno = (m) => m.giorni[m.giorni.length - 1];
const diarioDiOggi = (m) => (m.diario && m.diario[m.oggi]) || {};

const SINTOMI_MALATTIA = new Set(STO_MALE.gruppi.filter((x) => x.id === "malattia").flatMap((x) => x.caselle.map((c) => c.id)));

// Il semaforo a punti dà a ogni voce un pallino verde, giallo o grigio. Il grigio usa lo stile neutro.
const COLORE_PALLINO = { verde: "verde", giallo: "giallo", grigio: "neutro" };
const colorePallino = (v) => COLORE_PALLINO[v.pallino] || "neutro";

// Il gruppo di «Sto male» di ogni casella, per mostrare l'esito sotto la casella giusta.
const GRUPPO_DI = new Map(STO_MALE.gruppi.flatMap((x) => x.caselle.map((c) => [c.id, x.id])));

// Si aspetta la risposta «Il medico mi ha detto che posso riprendere», dal giorno dopo un sintomo di
// cuore e dopo una malattia che chiede il medico (4.9).
function aspettaIlMedico(m, g) {
  const cuore = g.cuore && g.cuore.aperto && g.cuore.ultimo < m.oggi;
  return Boolean(cuore || (g.malattia && g.malattia.attesa));
}

function tastoMedico(ctx, id) {
  return h("button", { class: "bottone", type: "button", id, on: { click: () => ctx.azioni.diario({ medicoSentito: true }) } },
    STO_MALE.medicoSentito);
}

function rispostePronte(m, g) {
  const o = ultimoGiorno(m);
  if (g.evento) return Boolean(o.fatica && diarioDiOggi(m).viaggio);
  return Boolean(o.fatica && o.dolori && o.infortunio);
}

// Una scelta a un tocco, come bottone. Con prefisso ogni bottone ha un id, così il fuoco non si perde.
function bottoni(scelte, scegli, classe = "bottone bottone-secondario", prefisso = null) {
  return h("div", { class: "riga-bottoni" }, scelte.map((s) => h("button", {
    class: classe, type: "button", id: prefisso ? `${prefisso}-${s.id}` : null, on: { click: () => scegli(s.id) },
  }, s.testo)));
}

// --- la carta di oggi (7.4) ---

// Il conto alla partenza dell'occhiello, con il nome dell'evento quando si sa.
export function contoDellaCarta(ctx) {
  const n = ctx.giorno ? ctx.giorno.giorniPartenza : null;
  if (!Number.isInteger(n)) return null;
  const ob = oggetto(ctx.obiettivo);
  const al = ob && ob.tipo === "evento" && ob.percorso ? AL_EVENTO[ob.percorso.eventoId] || null : null;
  return contoPartenza(n, al);
}

// L'occhiello della carta. Con la seduta, la parola del colore e il conto alla partenza, «Via libera ·
// Mancano 9 settimane al Tuscany Trail». La parola non si ripete quando il titolo comincia già con lei,
// come «Giornata tranquilla, giro facile di 1 ora». Senza seduta il titolo è già il colore. In viaggio
// il giorno del viaggio (7.10).
export function occhielloCarta(ctx, titolo = null, conSeduta = false) {
  const g = ctx.giorno || {};
  if (g.evento) return VIAGGIO.giorno(g.evento.giorno, g.evento.giorni);
  const conto = contoDellaCarta(ctx);
  if (!conSeduta) return conto || OGGI.occhiello;
  const parola = (LIVELLI[ctx.esito && ctx.esito.livello] || LIVELLI.nessuno).titolo;
  const ripete = typeof titolo === "string" && titolo.toLowerCase().startsWith(parola.toLowerCase());
  return [ripete ? null : parola, conto].filter(Boolean).join(" · ") || OGGI.occhiello;
}

// La seduta del piano da mostrare nella carta, oppure null. Con uno stop, in un viaggio o in un evento
// vale il semaforo (4.4 e 4.5). Finché si aspetta il medico la carta non propone mai un giro (4.9), e con
// i soli sintomi sopra il collo non più di un'ora facile (4.4), quindi anche lì vale il semaforo.
export function sedutaDaMostrare(ctx) {
  const s = oggetto(ctx.seduta);
  const e = ctx.esito || {};
  const g = ctx.giorno || {};
  if (!s || e.stop || s.tipo === "stop") return null;
  if (g.evento && (g.evento.tipo === "evento" || g.evento.tipo === "viaggio")) return null;
  if (ctx.modello && aspettaIlMedico(ctx.modello, g)) return null;
  const collo = lista(e.tetti).some((t) => t && t.chiave === "sopraIlCollo");
  const x = oggetto(s.seduta);
  if (collo && x && num(x.minuti) && x.minuti > COLLO_MINUTI && lista(s.tasti).includes("fatto")) return null;
  return s;
}

// Il giro di oggi è già arrivato, da un dispositivo, da Strava o da «Fatto».
export function giroDiOggi(ctx) {
  return lista(ctx.attivita).some((a) => a && a.giorno === ctx.oggi && inBici(a));
}

// «Fatto» solo se all'app non arriverà il dato da un dispositivo (7.4). I giri arrivano da soli quando
// nelle ultime 6 settimane almeno un giro in bici è arrivato da un dispositivo o da Strava, cioè non a mano.
export function serveFatto(ctx) {
  if (!ctx.oggi || giroDiOggi(ctx)) return false;
  const dal = piuGiorni(ctx.oggi, -GIORNI_DISPOSITIVO);
  return !lista(ctx.attivita).some((a) => a && inBici(a) && !a.manuale && a.giorno >= dal);
}

function palestraDiOggi(ctx) {
  return lista(ctx.palestra && ctx.palestra.registro).some((r) => r && r.data === ctx.oggi);
}

// Le sedute che oggi «Oggi non posso» ha spostato, con le frasi di 3.10. Restano nel piano salvato.
export function righeSpostate(ctx) {
  const p = oggetto(ctx.piano);
  if (!p || !ctx.oggi) return [];
  const lunedi = lunediDi(ctx.oggi);
  return lista(p.spostamenti).filter((x) => x && x.data === ctx.oggi && x.da === ctx.oggi && x.motivo === "nonPosso").map((x) => {
    if (x.tipo === "palestra") return x.a ? testoPalestraSposta(x.da, x.a) : testoSalta(x.tipo);
    return x.a ? testoSposta(x.tipo, x.a, lunediDi(x.a) === lunedi) : testoSalta(x.tipo);
  });
}

// Le righe sotto il come. Quelle della seduta, quelle del semaforo, la palestra della sera, gli
// spostamenti di oggi e la carta della sera del primo giorno, senza ripetere niente.
export function righeDellaCarta(ctx, s) {
  const e = ctx.esito || {};
  const righe = [...lista(s.righe), ...lista(e.aggiunte)];
  const x = oggetto(s.seduta);
  if (s.palestra && x && x.tipo !== "palestra" && lista(s.tasti).includes("scheda")) righe.push(CARTA.anchePalestra);
  righe.push(...righeSpostate(ctx));
  if (s.sera) righe.push(s.sera);
  return unici(righe).filter((t) => t !== s.come);
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
  const delDiario = inViaggio && (g.evento.tipo === "evento" || g.evento.tipo === "viaggio");
  const dia = diarioDiOggi(m);
  const s = sedutaDaMostrare(ctx);
  const titolo = s ? s.titolo : e.titolo;
  // In viaggio i consigli di una riga valgono se la bici va avanti, non con il Rosso.
  const consigliViaggio = e.viaggio && e.livello !== "rosso" ? lista(e.viaggio.consigli) : [];
  const come = s ? s.come : unici([e.consiglio, ...lista(e.aggiunte), ...consigliViaggio]).join(" ");
  const righe = s ? righeDellaCarta(ctx, s) : [];
  // Le frasi che restano, una sola nota e gli inviti dal medico, senza ripetere il consiglio.
  const note = unici([inViaggio ? null : e.nota, ...lista(e.medico).map((x) => x.testo)]).filter((t) => t !== e.consiglio);
  const fermo = e.stop === "cuore" || e.stop === "malattia";
  // Dal giorno dopo lo stop per malattia, se oggi non c'è un sintomo nuovo, si chiede se è passata (4.4).
  const malato = g.malattia && g.malattia.inCorso && g.malattia.dal < m.oggi
    && !lista(dia.stoMale).some((id) => SINTOMI_MALATTIA.has(id)) && dia.controllo !== "si";
  const tastiSeduta = s ? lista(s.tasti) : [];
  const fatto = tastiSeduta.includes("fatto") && giroDiOggi(ctx);
  const palestraSegnata = Boolean(s && s.palestra) && palestraDiOggi(ctx);

  const tasti = [];
  if (malato) {
    tasti.push(h("button", { class: "bottone", type: "button", id: "senza-febbre",
      on: { click: () => ctx.azioni.diario({ senzaFebbre: true }) } }, STO_MALE.senzaFebbre));
  }
  if (aspettaIlMedico(m, g)) tasti.push(tastoMedico(ctx, "medico-sentito"));
  if (tastiSeduta.includes("scheda") && ctx.palestra && ctx.palestra.oggi) {
    const sola = oggetto(s.seduta) && s.seduta.tipo === "palestra";
    tasti.push(h("a", { class: sola ? "bottone" : "bottone bottone-secondario", href: "#palestra", id: "apri-scheda" }, TASTI.scheda));
  }
  if (tastiSeduta.includes("fatto") && !fatto && serveFatto(ctx)) {
    tasti.push(h("button", { class: "bottone", type: "button", id: "fatto", on: { click: () => ctx.azioni.fatto() } }, TASTI.fatto));
  }
  if (tastiSeduta.includes("nonPosso") && !fatto) {
    tasti.push(h("button", { class: "bottone bottone-secondario", type: "button", id: "oggi-non-posso",
      on: { click: () => ctx.azioni.oggiNonPosso() } }, TASTI.nonPosso));
  }
  if (delDiario && !g.arrivatoOggi) {
    const appenaPartito = g.viaggio && g.viaggio.inizio === m.oggi;
    tasti.push(h("button", { class: "bottone bottone-secondario", type: "button", id: "arrivato",
      on: { click: () => ctx.azioni.arrivato() } }, appenaPartito ? VIAGGIO.nonInViaggio : VIAGGIO.arrivato));
  }

  return h("section", { class: ["semaforo", `semaforo-${e.colore}`], id: "carta-oggi", "aria-labelledby": "semaforo-titolo" },
    ctx.appenaSalvato ? h("p", { class: "salvato", role: "status" }, OGGI.salvato) : null,
    h("div", { class: "semaforo-testa" },
      luceSemaforo(e.colore),
      h("div", { class: "semaforo-testo" },
        h("p", { class: "occhiello" }, occhielloCarta(ctx, titolo, Boolean(s))),
        h("h2", { id: "semaforo-titolo" }, titolo),
        !rispostePronte(m, g) && !fermo ? h("p", { class: "semaforo-rispondi" }, MESSAGGI.rispondi) : null,
        come ? h("p", { class: "semaforo-consiglio" }, come) : null)),
    righe.length ? h("ul", { class: "carta-righe" }, righe.map((t) => h("li", {}, t))) : null,
    e.perche ? h("p", { class: "semaforo-perche" }, e.perche) : null,
    e.fiducia && e.fiducia.accanto && e.fiducia.testo ? h("p", { class: "piccolo" }, e.fiducia.testo) : null,
    fatto ? h("p", { class: "carta-fatto" }, CARTA.giroFatto) : null,
    palestraSegnata ? h("p", { class: "carta-fatto" }, CARTA.palestraFatta) : null,
    note.map((t) => h("p", { class: "semaforo-nota" }, t)),
    delDiario && finitoIlViaggio(g) ? h("p", { class: "semaforo-nota semaforo-fine" }, VIAGGIO.fine) : null,
    inViaggio ? h("ul", { class: "promemoria" }, (e.viaggio ? e.viaggio.promemoria : VIAGGIO.promemoria).map((t) => h("li", {}, t))) : null,
    tasti.length ? h("div", { class: "riga-bottoni" }, tasti) : null);
}

// La domanda di controllo e quella sulla pedalata compaiono prima del livello (4.4). «Rispondo dopo»
// mostra il livello per questa apertura, e la domanda torna alla prossima.
function cartaControllo(ctx, domanda) {
  const scegli = (id) => {
    if (domanda.chiave === "pedalata") { ctx.azioni.diario({ pedalata: id }); return; }
    if (id === "motivo") { ctx.ui.cause = true; ctx.ui.versoCause = true; }
    ctx.azioni.diario({ controllo: id });
  };
  return h("section", { class: ["semaforo", "semaforo-neutro", "semaforo-controllo"], id: "carta-oggi", "aria-labelledby": "semaforo-titolo" },
    h("div", { class: "semaforo-testa" },
      luceSemaforo("neutro"),
      h("div", { class: "semaforo-testo" },
        h("p", { class: "occhiello" }, occhielloCarta(ctx)),
        h("h2", { id: "semaforo-titolo" }, CONTROLLO.titolo),
        h("p", { class: "semaforo-consiglio" }, CONTROLLO[domanda.chiave].testo),
        domanda.chiave === "pedalata" ? h("p", { class: "piccolo" }, CONTROLLO.pedalataDove) : null)),
    bottoni(domanda.scelte, scegli, "bottone", "controllo"),
    h("p", {}, h("button", { class: "collegamento", type: "button", id: "rispondo-dopo", on: { click: () => ctx.azioni.ui("rispondoDopo", true) } }, CONTROLLO.dopo)));
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
  // raccogli dà le risposte, null senza nessuna risposta, oppure { errore, fuoco } con una risposta
  // che manca e il campo da cui ripartire.
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dati = raccogli(form);
    if (!dati) { stato.textContent = MATTINO.almenoUna; return; }
    if (dati.errore) {
      stato.textContent = dati.errore;
      if (dati.fuoco) dati.fuoco.focus();
      return;
    }
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
// Le scelte non ancora salvate stanno in ctx.ui.bozzaMattino, così un ridisegno della pagina, per
// esempio dopo una casella di «Sto male», non le perde.
function domandeMattino(ctx) {
  const m = ctx.modello;
  const g = ultimoGiorno(m);
  const risposte = { fatica: g.fatica, dolori: g.dolori, infortunio: g.infortunio };
  const pedalata = diarioDiOggi(m).pedalata || null;
  const bozza = ctx.ui.bozzaMattino;
  const scelto = (campo) => (bozza ? bozza[campo] : risposte[campo] || null);
  if (DOMANDE_MATTINO.every((d) => risposte[d.campo]) && !ctx.ui.modificaDomande) {
    const righe = DOMANDE_MATTINO.map((d) => [d.testo, d.opzioni[risposte[d.campo] - 1] || MATTINO.nessuna]);
    if (pedalata && (risposte.dolori === 4 || risposte.infortunio === 3)) {
      righe.push([CONTROLLO.pedalata.domanda, (CONTROLLO.pedalata.scelte.find((s) => s.id === pedalata) || {}).testo || MATTINO.nessuna]);
    }
    return riepilogo(MATTINO.fatte, righe, () => ctx.azioni.ui("modificaDomande", true));
  }

  const domandaPedalata = h("fieldset", { class: "domanda domanda-in-piu" },
    h("legend", {}, CONTROLLO.pedalata.domanda),
    scelteRadio("pedalata", CONTROLLO.pedalata.scelte, bozza ? bozza.pedalata : pedalata),
    h("p", { class: "piccolo" }, CONTROLLO.pedalataDove));
  const servePedalata = (form) => {
    const gambe = form.querySelector("input[name=gambe]:checked");
    const acciacchi = form.querySelector("input[name=acciacchi]:checked");
    return (gambe && gambe.value === "4") || (acciacchi && acciacchi.value === "3");
  };
  const campi = [
    ...DOMANDE_MATTINO.map((d) => h("fieldset", { class: "domanda" },
      h("legend", {}, d.testo),
      scelteRadio(d.nome, d.opzioni, scelto(d.campo)))),
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
  form.addEventListener("change", () => {
    domandaPedalata.hidden = !servePedalata(form);
    const valore = (nome) => {
      const x = form.querySelector(`input[name="${nome}"]:checked`);
      return x ? x.value : null;
    };
    const bozzaNuova = {};
    for (const d of DOMANDE_MATTINO) bozzaNuova[d.campo] = valore(d.nome) === null ? null : Number(valore(d.nome));
    bozzaNuova.pedalata = valore("pedalata");
    ctx.ui.bozzaMattino = bozzaNuova;
  });
  return form;
}

// Le tre domande in viaggio (4.5). L'energia va su intervals.icu come al solito, il sonno e «Qualcosa
// non va?» restano sul telefono. Ogni casella apre al massimo una scelta in più, che parte vuota e va
// scelta prima di salvare, perché la scelta cambia il colore. Le scelte non ancora salvate stanno in
// ctx.ui.bozzaViaggio, come per le domande di casa.
function domandeViaggio(ctx) {
  const m = ctx.modello;
  const g = ultimoGiorno(m);
  const D = VIAGGIO.domande;
  const prima = diarioDiOggi(m).viaggio || {};
  const problemi = prima.problemi || {};
  const chiedeSonno = !g.sonno;
  const energia = D.energia.scelte;
  const bozza = ctx.ui.bozzaViaggio;

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

  const salvatoAcceso = (c) => (c.id === "niente" ? Object.keys(problemi).length === 0 && Boolean(diarioDiOggi(m).viaggio) : Boolean(problemi[c.id]));
  const salvataScelta = (c) => (problemi[c.id] && problemi[c.id] !== true ? problemi[c.id] : null);
  const caselle = D.problemi.caselle.map((c) => {
    const id = `problema-${c.id}`;
    const acceso = bozza ? bozza.caselle.includes(c.id) : salvatoAcceso(c);
    const casella = h("input", { type: "checkbox", id, name: "problema", value: c.id, checked: acceso });
    const altre = c.scelte
      ? h("fieldset", { class: "domanda-sotto", hidden: !acceso },
        h("legend", { class: "nascosto" }, c.testo),
        scelteRadio(`problema-${c.id}-scelta`, c.scelte, bozza ? bozza.scelte[c.id] || null : salvataScelta(c)))
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
      scelteRadio("viaggio-energia", energia, bozza ? bozza.energia : g.fatica || null)),
    chiedeSonno ? h("fieldset", { class: "domanda" },
      h("legend", {}, D.sonno.testo),
      scelteRadio("viaggio-sonno", D.sonno.scelte, bozza ? bozza.sonno : prima.sonno || null)) : null,
    h("fieldset", { class: "domanda" },
      h("legend", {}, D.problemi.testo),
      h("div", { class: "caselle-viaggio" }, caselle.map((x) => x.elemento))),
  ];
  const sceltaDi = (f, x) => f.querySelector(`input[name="problema-${x.c.id}-scelta"]:checked`);
  const form = modulo(ctx, {
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
        const scelta = sceltaDi(f, x);
        if (!scelta) return { errore: VIAGGIO.sceltaMancante(x.c.testo), fuoco: x.altre.querySelector("input") };
        scelti[x.c.id] = scelta.value;
      }
      if (!e && !s && !qualcosa) return null;
      const viaggio = { problemi: scelti };
      if (s) viaggio.sonno = s.value;
      return { risposte: e ? { fatica: Number(e.value) } : {}, diario: { viaggio } };
    },
  });
  form.addEventListener("change", () => {
    const e = form.querySelector("input[name=viaggio-energia]:checked");
    const s = form.querySelector("input[name=viaggio-sonno]:checked");
    const scelte = {};
    for (const x of caselle) {
      const scelta = x.altre ? sceltaDi(form, x) : null;
      if (scelta) scelte[x.c.id] = scelta.value;
    }
    ctx.ui.bozzaViaggio = {
      energia: e ? Number(e.value) : null,
      sonno: s ? s.value : null,
      caselle: caselle.filter((x) => x.casella.checked).map((x) => x.c.id),
      scelte,
    };
  });
  return form;
}

// --- «Sto male» e «Ieri sera…» ---

// cambia(contenitore, valore) riceve anche la casella toccata. dopo { id, elemento } mette un elemento
// subito sotto quella casella.
function caselle(nome, elenco, scelte, cambia, dopo = null) {
  return h("div", { class: "scelte caselle" }, elenco.map((c) => {
    const id = `${nome}-${c.id}`;
    return [
      h("span", { class: "scelta casella" },
        h("input", { type: "checkbox", id, name: nome, value: c.id, checked: scelte.includes(c.id),
          on: { change: (e) => cambia(e.target.closest("details, form, section"), c.id) } }),
        h("label", { for: id }, c.testo)),
      dopo && dopo.id === c.id ? dopo.elemento : null,
    ];
  }));
}

function spuntate(contenitore, nome) {
  return [...contenitore.querySelectorAll(`input[name="${nome}"]:checked`)].map((x) => x.value);
}

// Dove mostrare nel pannello quello che le caselle di oggi hanno deciso, cioè subito sotto la casella
// appena spuntata del gruppo che decide, oppure sotto la prima spuntata di quel gruppo, così l'ordine
// di fermarsi e il 112 arrivano dove la persona sta guardando (4.4 e 4.9). Per il cuore è un avviso,
// che il lettore di schermo legge subito.
function esitoNelPannello(e, segnati, toccata) {
  const gruppi = new Set(segnati.map((id) => GRUPPO_DI.get(id)));
  let qui = null;
  if (e.stop === "cuore" && gruppi.has("cuore")) qui = { gruppo: "cuore", avviso: true };
  else if (e.stop === "malattia" && gruppi.size) qui = { gruppo: gruppi.has("malattia") ? "malattia" : [...gruppi][0], avviso: false };
  else if (!e.stop && gruppi.has("collo") && e.tetti.some((t) => t.chiave === "sopraIlCollo")) qui = { gruppo: "collo", avviso: false };
  if (!qui) return null;
  const delGruppo = segnati.filter((id) => GRUPPO_DI.get(id) === qui.gruppo);
  qui.casella = delGruppo.includes(toccata) ? toccata : delGruppo[0];
  return qui;
}

// Un tasto sempre visibile sotto la carta, non una domanda in più (4.4).
function pannelloStoMale(ctx) {
  const m = ctx.modello;
  const e = ctx.esito;
  const dia = diarioDiOggi(m);
  const segnati = lista(dia.stoMale);
  const g = ctx.giorno;
  const malattiaDiPrima = g.malattia && g.malattia.inCorso && g.malattia.dal < m.oggi && dia.controllo !== "si"
    && !segnati.some((id) => SINTOMI_MALATTIA.has(id));
  const qui = esitoNelPannello(e, segnati, ctx.ui.toccataStoMale);
  const esito = qui
    ? h("div", { class: ["pannello-esito", e.stop && "pannello-esito-stop", qui.avviso && "pannello-esito-cuore"], role: qui.avviso ? "alert" : "status" },
      h("p", {}, h("strong", {}, `${e.titolo}. `), e.consiglio))
    : null;
  const cambia = (contenitore, casella) => {
    ctx.ui.toccataStoMale = casella;
    ctx.azioni.diario({ stoMale: spuntate(contenitore, "sto-male") });
  };
  const pannello = h("details", { class: "sto-male", open: ctx.ui.stoMale || null },
    h("summary", { class: "bottone bottone-secondario sto-male-tasto" }, STO_MALE.tasto,
      segnati.length ? h("span", { class: "conta" }, STO_MALE.segnati(segnati.length)) : null),
    h("div", { class: "pannello" },
      h("p", { class: "sezione-testo" }, STO_MALE.attacco),
      malattiaDiPrima ? h("div", { class: "pannello-febbre" },
        h("p", {}, h("strong", {}, STO_MALE.febbrePassata)),
        h("button", { class: "bottone", type: "button", id: "senza-febbre-pannello",
          on: { click: () => ctx.azioni.diario({ senzaFebbre: true }) } }, STO_MALE.senzaFebbre)) : null,
      aspettaIlMedico(m, g) ? h("div", { class: "pannello-febbre" },
        h("p", {}, h("strong", {}, STO_MALE.medicoDomanda)),
        tastoMedico(ctx, "medico-sentito-pannello")) : null,
      STO_MALE.gruppi.map((gruppo) => h("fieldset", { class: ["domanda", `gruppo-${gruppo.id}`] },
        h("legend", {}, gruppo.titolo),
        caselle("sto-male", gruppo.caselle, segnati, cambia,
          qui && qui.gruppo === gruppo.id ? { id: qui.casella, elemento: esito } : null)))));
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

// --- le carte in più dopo il giro (6.4 e 7.5) ---

// Lo sforzo si chiede da 30 minuti dopo la fine dell'uscita fino a mezzogiorno del giorno dopo (6.4).
// Dopo resta nella scheda dell'uscita, in Numeri. Senza l'ora di adesso vale sempre.
export function sforzoInTempo(carta, adesso) {
  const ora = minutiDi(adesso);
  if (ora === null || !carta || typeof carta.giorno !== "string") return true;
  const fine = minutiDi(carta.fine);
  if (fine !== null && ora < fine + DOMANDE.sforzoDaMinuti) return false;
  return ora < utc(piuGiorni(carta.giorno, 1)) / 60000 + DOMANDE.sforzoFinoAlleOre * 60;
}

const SFORZI = new Set(Object.values(DOMANDE.sforzo).map(String));

function numeroDetto(x) {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Le risposte di una carta, dai valori del suo modulo (per nome del campo), nella forma di
// ctx.azioni.rispondiCarta. null senza nessuna risposta, { errore, campo } con una risposta da finire.
// Per «Sì, ma diverso» la risposta vale anche senza durata e sforzo.
export function campiCarta(tipo, v = {}, { grammi = null, giorno = null } = {}) {
  if (tipo === "prova") {
    const aree = lista(v.aree).filter((x) => CARTE.prova.aree.some((a) => a.id === x));
    if (!aree.length) return { errore: CARTE.prova.nessuna, campo: "aree" };
    return { prova: { esito: "sistemare", aree, giorno } };
  }
  const c = tipo === "seduta" ? { risposta: "diverso" } : {};
  if (SFORZI.has(String(v.sforzo))) c.sforzo = Number(v.sforzo);
  if (tipo === "palestra" && Object.hasOwn(CARTE.palestra.scelte, String(v.allenato))) c.allenato = v.allenato;
  if (tipo === "stub" && Object.hasOwn(CARTE.stub.tipo.scelte, String(v.tipo))) c.tipo = v.tipo;
  if (tipo === "stub" || tipo === "seduta") {
    let minuti = null;
    if (v.durata === "altro") {
      minuti = (numeroDetto(v.ore) || 0) * 60 + (numeroDetto(v.minuti) || 0);
      if (!(minuti > 0)) return { errore: CARTE.stub.durata.manca, campo: "ore" };
    } else if (numeroDetto(v.durata) > 0) {
      minuti = numeroDetto(v.durata);
    }
    if (minuti > 0 && tipo === "stub") c.secondi = Math.round(minuti * 60);
    if (minuti > 0 && tipo === "seduta") c.minuti = Math.round(minuti);
  }
  if ((tipo === "lunga" || tipo === "stub") && DOMANDE.borse.includes(v.borse)) {
    c.borse = v.borse;
    if (v.borse !== "no") {
      const kg = numeroDetto(v.kgAltro) > 0 ? numeroDetto(v.kgAltro) : numeroDetto(v.kg);
      if (kg > 0) c.kg = kg;
      if (v.notte === "si" || v.notte === "no") c.notteFuori = v.notte === "si";
      if (tipo === "stub" && numeroDetto(v.km) > 0) c.metri = Math.round(numeroDetto(v.km) * 1000);
      if (tipo === "stub" && numeroDetto(v.dislivello) !== null && numeroDetto(v.dislivello) >= 0) c.dislivello = Math.round(numeroDetto(v.dislivello));
    }
  }
  if (tipo === "lunga" && STOMACO.scelte.some((s) => s.valore === v.stomaco)) {
    c.stomaco = v.stomaco;
    if (num(grammi)) c.grammi = grammi;
  }
  if (tipo === "seduta") return c;
  return Object.keys(c).length ? c : null;
}

const idCarta = (carta) => `carta-${String(carta.chiave).replace(/[^A-Za-z0-9_-]/g, "-")}`;

function bozzaDi(ctx, carta) {
  const b = oggetto(ctx.ui.bozzeCarte);
  return b && oggetto(b[carta.chiave]) ? b[carta.chiave] : null;
}

// I valori di un modulo, per nome. Le caselle sono sempre una lista. Per le risposte si lasciano fuori
// le domande nascoste, per la bozza no.
function valoriDi(form, ancheNascosti = false) {
  const v = {};
  for (const el of form.elements) {
    if (!el.name || (!ancheNascosti && el.closest("[hidden]"))) continue;
    if (el.type === "radio") {
      if (el.checked) v[el.name] = el.value;
    } else if (el.type === "checkbox") {
      if (!Array.isArray(v[el.name])) v[el.name] = [];
      if (el.checked) v[el.name].push(el.value);
    } else if (typeof el.value === "string" && el.value.trim()) {
      v[el.name] = el.value.trim();
    }
  }
  return v;
}

const valoreDi = (form, nome) => {
  const x = form.querySelector(`input[name="${nome}"]:checked`);
  return x ? x.value : null;
};

// Una risposta data. Il fuoco va prima sul contenitore delle carte, che resta dopo il ridisegno, e poi
// sul grazie, così la tastiera e il lettore di schermo non ripartono dall'inizio della pagina.
function rispondi(ctx, carta, campi, consigli = []) {
  const contenitore = document.getElementById("carte-in-piu");
  if (contenitore) contenitore.focus({ preventScroll: true });
  ctx.ui.carteRisposte = (ctx.ui.carteRisposte || 0) + 1;
  ctx.ui.consigliCarte = consigli;
  ctx.ui.fuocoDopo = "carte-grazie";
  ctx.azioni.rispondiCarta(carta, campi);
}

function nonLoSo(ctx, carta) {
  const contenitore = document.getElementById("carte-in-piu");
  if (contenitore) contenitore.focus({ preventScroll: true });
  ctx.ui.carteRisposte = (ctx.ui.carteRisposte || 0) + 1;
  ctx.ui.consigliCarte = [];
  ctx.ui.fuocoDopo = "carte-grazie";
  ctx.azioni.nonLoSo(carta);
}

function sezioneCarta(carta, titolo, ...figli) {
  const id = idCarta(carta);
  return h("section", { class: "carta carta-in-piu", id, "aria-labelledby": `${id}-titolo` },
    h("h2", { id: `${id}-titolo` }, titolo), ...figli);
}

function tastoNonLoSo(ctx, carta) {
  return h("p", {}, h("button", { class: "collegamento", type: "button", id: `${idCarta(carta)}-nonso`,
    on: { click: () => nonLoSo(ctx, carta) } }, CARTE.nonLoSo));
}

function domandaRadio(prefisso, nome, legenda, opzioni, scelta, classe = null) {
  return h("fieldset", { class: ["domanda", classe] },
    h("legend", {}, legenda),
    h("div", { class: "scelte" }, opzioni.map((o) => {
      const id = `${prefisso}-${nome}-${o.id}`;
      return h("span", { class: "scelta" },
        h("input", { type: "radio", id, name: nome, value: o.id, checked: scelta !== null && scelta !== undefined && String(scelta) === String(o.id) }),
        h("label", { for: id }, o.testo));
    })));
}

function campoNumero(id, nome, etichetta, valore, { min = "0", max = null, step = "1" } = {}) {
  return h("span", { class: "campo-numero" },
    h("label", { for: id }, etichetta),
    h("input", { type: "number", id, name: nome, inputmode: step === "1" ? "numeric" : "decimal", min, max, step, value: valore ?? null }));
}

const scelteSforzo = () => Object.entries(DOMANDE.sforzo).map(([chiave, valore]) => ({ id: String(valore), testo: CARTE.sforzo.parole[chiave] }));
const scelteBorse = () => DOMANDE.borse.map((b) => ({ id: b, testo: CARTE.borse.scelte[b] }));
const scelteDa = (testi) => Object.entries(testi).map(([id, testo]) => ({ id, testo }));
const scelteDurata = () => [...DOMANDE.durateMinuti.map((m) => ({ id: String(m), testo: formatoDurata(m) })), { id: "altro", testo: CARTE.stub.durata.altro }];

// La durata fra le scelte più vicina a quella stimata, per averla già scelta (6.4).
function sceltaVicina(minuti) {
  if (!(minuti > 0)) return null;
  return String(DOMANDE.durateMinuti.reduce((meglio, x) => (Math.abs(x - minuti) < Math.abs(meglio - minuti) ? x : meglio)));
}

function domandaKg(prefisso, scelta, altro, peso) {
  const valori = [...new Set([...KG_SCELTE, ...(num(peso) && peso > 0 ? [peso] : [])])].sort((a, b) => a - b);
  const scritto = (kg) => (Number.isInteger(kg) ? String(kg) : numero(kg, 1));
  return h("fieldset", { class: "domanda domanda-sotto" },
    h("legend", {}, CARTE.kg.domanda),
    h("div", { class: "scelte" }, valori.map((kg) => {
      const id = `${prefisso}-kg-${String(kg).replace(".", "-")}`;
      return h("span", { class: "scelta" },
        h("input", { type: "radio", id, name: "kg", value: String(kg), checked: scelta !== null && Number(scelta) === kg }),
        h("label", { for: id }, CARTE.kg.unita(scritto(kg))));
    })),
    campoNumero(`${prefisso}-kg-altro`, "kgAltro", CARTE.kg.altro, altro, { min: "1", max: "60", step: "0.5" }));
}

// Le ore e i minuti scritti a mano con «Altro».
function tempoAltro(prefisso, ore, minuti) {
  return h("div", { class: "tempo-altro" },
    campoNumero(`${prefisso}-ore`, "ore", CARTE.stub.durata.ore, ore, { max: "24" }),
    campoNumero(`${prefisso}-minuti`, "minuti", CARTE.stub.durata.minuti, minuti, { max: "59" }));
}

function minutiAltri(form) {
  const ore = numeroDetto(form.querySelector("input[name=ore]") && form.querySelector("input[name=ore]").value) || 0;
  const minuti = numeroDetto(form.querySelector("input[name=minuti]") && form.querySelector("input[name=minuti]").value) || 0;
  return ore * 60 + minuti;
}

// Le sedute del piano di un giorno, da quelle della settimana in corso e da quelle delle settimane.
function sedutePianoDel(piano, giorno) {
  const p = oggetto(piano);
  if (!p) return [];
  const giorni = [...lista(p.giorni), ...lista(p.settimane).flatMap((w) => lista(w && w.giorni))];
  return giorni.filter((x) => x && x.giorno === giorno).flatMap((x) => lista(x.sedute)).filter(Boolean);
}

const sedutaInBici = (x) => x && !["riposo", "palestra", "tronco", "dopoEvento"].includes(x.tipo);

function ciboDelPiano(ctx, giorno) {
  const x = sedutePianoDel(ctx.piano, giorno).find((y) => y.cibo && num(y.cibo.grammi));
  return x ? x.cibo : null;
}

// Con le borse due giorni di fila si chiede anche la notte fuori (6.3).
function piuGiorniDiFila(ctx, a) {
  const vicini = [piuGiorni(a.giorno, -1), piuGiorni(a.giorno, 1)];
  return lista(ctx.attivita).some((x) => x && x.id !== a.id && inBici(x) && vicini.includes(x.giorno) && x.secondi >= DOMANDE.borseDaOre * ORA);
}

const pesoObiettivo = (ctx) => (ctx.profilo && num(ctx.profilo.borseKg) && ctx.profilo.borseKg > 0 ? ctx.profilo.borseKg : null);
const minutiDiAttivita = (a) => (a && a.secondi > 0 ? a.secondi / 60 : null);

// Una carta con più domande. Le scelte non salvate restano in ctx.ui.bozzeCarte, così un ridisegno della
// pagina non le perde. visibili(form) mostra e nasconde le domande che dipendono da un'altra.
function moduloCarta(ctx, carta, { titolo, sopra = null, campi, raccogli, visibili = null, consigli = null }) {
  const id = idCarta(carta);
  const stato = h("p", { class: "stato-salvataggio", role: "status", "aria-live": "polite" });
  const form = h("form", { class: "carta-modulo", novalidate: true },
    campi,
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "submit", id: `${id}-salva` }, CARTE.salva),
      h("button", { class: "bottone bottone-secondario", type: "button", id: `${id}-nonso`,
        on: { click: () => nonLoSo(ctx, carta) } }, CARTE.nonLoSo)),
    stato);
  if (visibili) visibili(form);
  form.addEventListener("change", () => {
    if (visibili) visibili(form);
    ctx.ui.bozzeCarte = { ...(oggetto(ctx.ui.bozzeCarte) || {}), [carta.chiave]: valoriDi(form, true) };
  });
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const r = raccogli(valoriDi(form));
    if (!r) { stato.textContent = CARTE.almenoUna; return; }
    if (r.errore) {
      stato.textContent = r.errore;
      const dove = r.campo ? form.querySelector(`[name="${r.campo}"]`) : null;
      if (dove) dove.focus();
      return;
    }
    rispondi(ctx, carta, r, consigli ? consigli(r) : []);
  });
  return sezioneCarta(carta, titolo, sopra, form);
}

// Le carte del semaforo, «Oggi parti?», «Sei in viaggio?» e il cambio di dispositivo (4.5 e 4.3).
function cartaDelSemaforo(ctx, carta, domanda, scelte) {
  const id = idCarta(carta);
  const scegli = (risposta) => {
    if (carta.tipo === "dispositivo") rispondi(ctx, carta, { risposta });
    else ctx.azioni.rispondiCarta(carta, { risposta });
  };
  return sezioneCarta(carta, domanda, bottoni(scelte, scegli, "bottone bottone-secondario", id));
}

// Borse e sforzo della lunga di ieri o di oggi, nella stessa carta (6.4 e 7.5). Con un sì alle borse i
// chili e, per due giorni di fila carichi, la notte fuori. Nella lunga con l'obiettivo di cibo «Lo
// stomaco?», facoltativa (3.9).
function cartaLunga(ctx, carta) {
  const a = carta.attivita;
  const id = idCarta(carta);
  const b = bozzaDi(ctx, carta);
  const scelto = (nome, predefinito = null) => (b ? b[nome] ?? null : predefinito);
  const peso = pesoObiettivo(ctx);
  const cibo = ciboDelPiano(ctx, a.giorno);
  const sforzo = sforzoInTempo(carta, ctx.adesso) ? domandaRadio(id, "sforzo", CARTE.sforzo.domanda, scelteSforzo(), scelto("sforzo")) : null;
  const borse = domandaRadio(id, "borse", CARTE.borse.domanda, scelteBorse(), scelto("borse"));
  const kg = domandaKg(id, scelto("kg", peso !== null ? String(peso) : null), scelto("kgAltro"), peso);
  const notte = piuGiorniDiFila(ctx, a)
    ? domandaRadio(id, "notte", CARTE.notte.domanda, [{ id: "si", testo: CARTE.notte.si }, { id: "no", testo: CARTE.notte.no }], scelto("notte"), "domanda-sotto")
    : null;
  const stomaco = cibo
    ? domandaRadio(id, "stomaco", STOMACO.domanda, STOMACO.scelte.map((s) => ({ id: s.valore, testo: s.testo })), scelto("stomaco"))
    : null;
  return moduloCarta(ctx, carta, {
    titolo: titoloUscita(a.giorno, ctx.oggi, minutiDiAttivita(a), a.metri),
    campi: [sforzo, borse, kg, notte, stomaco],
    raccogli: (v) => campiCarta("lunga", v, { grammi: cibo ? cibo.grammi : null }),
    visibili: (form) => {
      const carica = Boolean(valoreDi(form, "borse")) && valoreDi(form, "borse") !== "no";
      kg.hidden = !carica;
      if (notte) notte.hidden = !carica;
    },
  });
}

// Lo sforzo di un giro senza sensori, a un tocco (6.3).
function cartaSforzo(ctx, carta) {
  const a = carta.attivita;
  const id = idCarta(carta);
  return sezioneCarta(carta, titoloUscita(a.giorno, ctx.oggi, minutiDiAttivita(a), a.metri),
    h("p", { class: "carta-domanda", id: `${id}-domanda` }, CARTE.sforzo.domanda),
    h("div", { class: "riga-bottoni", role: "group", "aria-labelledby": `${id}-domanda` },
      scelteSforzo().map((s) => h("button", { class: "bottone bottone-secondario", type: "button", id: `${id}-sforzo-${s.id}`,
        on: { click: () => rispondi(ctx, carta, { sforzo: Number(s.id) }) } }, s.testo))),
    tastoNonLoSo(ctx, carta));
}

// «Cosa hai allenato?» e lo sforzo, per una palestra arrivata dal dispositivo (6.3).
function cartaPalestra(ctx, carta) {
  const a = carta.attivita;
  const id = idCarta(carta);
  const b = bozzaDi(ctx, carta);
  const scelto = (nome) => (b ? b[nome] ?? null : null);
  return moduloCarta(ctx, carta, {
    titolo: titoloPalestra(a.giorno, ctx.oggi, minutiDiAttivita(a)),
    campi: [
      domandaRadio(id, "allenato", CARTE.palestra.domanda, scelteDa(CARTE.palestra.scelte), scelto("allenato")),
      domandaRadio(id, "sforzo", CARTE.sforzo.domanda, scelteSforzo(), scelto("sforzo")),
    ],
    raccogli: (v) => campiCarta("palestra", v),
  });
}

// Un'uscita arrivata da Strava senza dettagli (6.4). Cos'era, quanto è durata con la stima già scelta, com'è
// stata e, per la bici di almeno 2 ore, le borse, con km e dislivello facoltativi.
function cartaStub(ctx, carta) {
  const a = carta.attivita;
  const id = idCarta(carta);
  const b = bozzaDi(ctx, carta);
  const scelto = (nome, predefinito = null) => (b ? b[nome] ?? null : predefinito);
  const previste = sedutePianoDel(ctx.piano, a.giorno).filter((x) => x.tipo !== "riposo");
  const bici = previste.find(sedutaInBici);
  const tipoPrevisto = !bici && previste.some((x) => x.tipo === "palestra") ? "palestra" : "bici";
  const peso = pesoObiettivo(ctx);
  const tipo = domandaRadio(id, "tipo", CARTE.stub.tipo.domanda, scelteDa(CARTE.stub.tipo.scelte), scelto("tipo", tipoPrevisto));
  const altro = tempoAltro(id, scelto("ore"), scelto("minuti"));
  const durata = domandaRadio(id, "durata", CARTE.stub.durata.domanda, scelteDurata(), scelto("durata", sceltaVicina(minutiDiAttivita(a) || (bici && bici.minuti))));
  durata.append(altro);
  const sforzo = domandaRadio(id, "sforzo", CARTE.sforzo.domanda, scelteSforzo(), scelto("sforzo"));
  const borse = domandaRadio(id, "borse", CARTE.borse.domanda, scelteBorse(), scelto("borse"));
  const kg = domandaKg(id, scelto("kg", peso !== null ? String(peso) : null), scelto("kgAltro"), peso);
  const strada = h("fieldset", { class: "domanda domanda-sotto domanda-facoltativa" },
    h("legend", {}, CARTE.stub.strada),
    h("div", { class: "tempo-altro" },
      campoNumero(`${id}-km`, "km", CARTE.stub.km, scelto("km"), { step: "0.1" }),
      campoNumero(`${id}-dislivello`, "dislivello", CARTE.stub.dislivello, scelto("dislivello"))));
  return moduloCarta(ctx, carta, {
    titolo: titoloStub(a.giorno, ctx.oggi, a.inizio ? formatoOra(a.inizio) : null),
    sopra: h("p", { class: "carta-contesto" }, arrivaDa(a.sorgente)),
    campi: [tipo, durata, sforzo, borse, kg, strada],
    raccogli: (v) => campiCarta("stub", v),
    visibili: (form) => {
      const d = valoreDi(form, "durata");
      altro.hidden = d !== "altro";
      const minuti = d === "altro" ? minutiAltri(form) : numeroDetto(d) || 0;
      const inSella = valoreDi(form, "tipo") === "bici" && minuti >= DOMANDE.borseDaOre * 60;
      borse.hidden = !inSella;
      const carica = inSella && Boolean(valoreDi(form, "borse")) && valoreDi(form, "borse") !== "no";
      kg.hidden = !carica;
      strada.hidden = !carica;
    },
  });
}

// La seduta del piano di ieri senza niente registrato (6.3), con «Sì, così», «Sì, ma diverso» e «No». Con
// «diverso» la durata e lo sforzo.
function cartaSeduta(ctx, carta) {
  const id = idCarta(carta);
  const x = oggetto(carta.seduta) || {};
  const titolo = sedutaDiIeri(x);
  if (ctx.ui.sedutaDiversa !== carta.chiave) {
    return sezioneCarta(carta, titolo,
      h("p", { class: "carta-domanda", id: `${id}-domanda` }, lHaiFatto(x)),
      h("div", { class: "riga-bottoni", role: "group", "aria-labelledby": `${id}-domanda` },
        h("button", { class: "bottone bottone-secondario", type: "button", id: `${id}-si`,
          on: { click: () => rispondi(ctx, carta, { risposta: "si" }) } }, CARTE.seduta.si),
        h("button", { class: "bottone bottone-secondario", type: "button", id: `${id}-diverso`,
          on: { click: () => { ctx.ui.fuocoDopo = `${id}-titolo`; ctx.azioni.ui("sedutaDiversa", carta.chiave); } } }, CARTE.seduta.diverso),
        h("button", { class: "bottone bottone-secondario", type: "button", id: `${id}-no`,
          on: { click: () => rispondi(ctx, carta, { risposta: "no" }) } }, CARTE.seduta.no)),
      tastoNonLoSo(ctx, carta));
  }
  const b = bozzaDi(ctx, carta);
  const scelto = (nome, predefinito = null) => (b ? b[nome] ?? null : predefinito);
  const altro = tempoAltro(id, scelto("ore"), scelto("minuti"));
  const durata = domandaRadio(id, "durata", CARTE.stub.durata.domanda, scelteDurata(), scelto("durata", sceltaVicina(x.minuti)));
  durata.append(altro);
  return moduloCarta(ctx, carta, {
    titolo,
    sopra: h("p", { class: "carta-domanda" }, CARTE.seduta.diverso),
    campi: [durata, domandaRadio(id, "sforzo", CARTE.sforzo.domanda, scelteSforzo(), scelto("sforzo"))],
    raccogli: (v) => campiCarta("seduta", v),
    visibili: (form) => { altro.hidden = valoreDi(form, "durata") !== "altro"; },
  });
}

// Dopo una prova con le borse, la sera o il mattino dopo (7.5). «Qualcosa da sistemare» apre le caselle,
// ognuna con il suo consiglio di una riga, che compare quando la si spunta.
function cartaProva(ctx, carta) {
  const a = carta.attivita;
  const id = idCarta(carta);
  const contesto = h("p", { class: "carta-contesto" }, titoloUscita(a.giorno, ctx.oggi, minutiDiAttivita(a), a.metri));
  const generale = sedutePianoDel(ctx.piano, a.giorno).some((x) => PROVA_GENERALE.test(x.tipo));
  const dopo = generale ? [CARTE.prova.posizione] : [];
  if (ctx.ui.provaAperta !== carta.chiave) {
    return sezioneCarta(carta, CARTE.prova.domanda, contesto,
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone bottone-secondario", type: "button", id: `${id}-bene`,
          on: { click: () => rispondi(ctx, carta, { prova: { esito: "bene", aree: [], giorno: carta.giorno } }, dopo) } }, CARTE.prova.bene),
        h("button", { class: "bottone bottone-secondario", type: "button", id: `${id}-sistemare`,
          on: { click: () => { ctx.ui.fuocoDopo = `${id}-titolo`; ctx.azioni.ui("provaAperta", carta.chiave); } } }, CARTE.prova.sistemare)),
      tastoNonLoSo(ctx, carta));
  }
  const b = bozzaDi(ctx, carta);
  const segnate = b && Array.isArray(b.aree) ? b.aree : [];
  const caselleProva = CARTE.prova.aree.map((x) => {
    const idx = `${id}-area-${x.id}`;
    const consiglio = h("p", { class: "consiglio-casella", id: `${idx}-consiglio`, hidden: !segnate.includes(x.id) }, x.consiglio);
    const casella = h("input", { type: "checkbox", id: idx, name: "aree", value: x.id, checked: segnate.includes(x.id), "aria-describedby": `${idx}-consiglio` });
    casella.addEventListener("change", () => { consiglio.hidden = !casella.checked; });
    return h("div", { class: "casella-con-scelta" },
      h("span", { class: "scelta casella" }, casella, h("label", { for: idx }, x.testo)),
      consiglio);
  });
  return moduloCarta(ctx, carta, {
    titolo: CARTE.prova.domanda,
    sopra: contesto,
    campi: [h("fieldset", { class: "domanda" }, h("legend", {}, CARTE.prova.quali), h("div", { class: "caselle-viaggio" }, caselleProva))],
    raccogli: (v) => campiCarta("prova", v, { giorno: carta.giorno }),
    consigli: (r) => [...CARTE.prova.aree.filter((x) => r.prova.aree.includes(x.id)).map((x) => x.consiglio), ...dopo],
  });
}

function cartaInPiu(ctx, carta) {
  if (!carta || typeof carta.chiave !== "string") return null;
  switch (carta.tipo) {
    case "parti": return cartaDelSemaforo(ctx, carta, VIAGGIO.parti.domanda, VIAGGIO.parti.scelte);
    case "proposta": return cartaDelSemaforo(ctx, carta, VIAGGIO.proposta, [{ id: "si", testo: VIAGGIO.propostaSi }, { id: "no", testo: VIAGGIO.propostaNo }]);
    case "dispositivo": return cartaDelSemaforo(ctx, carta, MESSAGGI.dispositivo, CAMBIO_DISPOSITIVO.scelte);
    case "seduta": return carta.seduta ? cartaSeduta(ctx, carta) : null;
    default:
      if (!carta.attivita) return null;
      if (carta.tipo === "lunga") return cartaLunga(ctx, carta);
      if (carta.tipo === "sforzo") return cartaSforzo(ctx, carta);
      if (carta.tipo === "palestra") return cartaPalestra(ctx, carta);
      if (carta.tipo === "stub") return cartaStub(ctx, carta);
      if (carta.tipo === "prova") return cartaProva(ctx, carta);
      return null;
  }
}

// Al massimo una carta per apertura, due quando una è sulle borse, già contate da js/motore.js (6.4).
// Dopo una risposta resta il grazie, con i consigli della prova, per tutta l'apertura.
function carteInPiu(ctx) {
  const carte = lista(ctx.carteInPiu).map((c) => cartaInPiu(ctx, c)).filter(Boolean);
  const risposte = ctx.ui.carteRisposte || 0;
  if (!carte.length && !risposte) return null;
  const consigli = lista(ctx.ui.consigliCarte);
  return h("div", { class: "carte-in-piu", id: "carte-in-piu", tabindex: "-1" },
    risposte ? h("div", { class: "carte-grazie", id: "carte-grazie", tabindex: "-1" },
      h("p", { role: "status" }, h("strong", {}, CARTE.grazie), " ", ctx.coda && ctx.coda.attiva ? CARTE.ancheIntervals : CARTE.soloTelefono),
      consigli.length ? h("ul", { class: "carta-righe" }, consigli.map((t) => h("li", {}, t))) : null) : null,
    carte);
}

// --- la domenica (3.11 e 7.9) ---

// Il controllo della domenica, la domenica e il lunedì, o prima dopo tre gialli di fila. Al massimo una
// domanda, quella di S6, solo con un altro segnale. In viaggio il controllo è spento.
function cartaDomenica(ctx) {
  const d = ctx.domenica && ctx.domenica.controllo;
  if (!d || d.spento) return null;
  const testi = [...lista(d.testi)];
  if (d.crescita && d.crescita.avviso && d.crescita.testo) testi.push(d.crescita.testo);
  return h("section", { class: "carta carta-domenica", id: "domenica", "aria-labelledby": "domenica-titolo" },
    h("h2", { id: "domenica-titolo" }, DOMENICA_OGGI.titolo),
    unici(testi).map((t) => h("p", {}, t)),
    d.chiedi === "S6" && d.domandaS6 ? h("div", { class: "domanda-domenica" },
      h("p", { class: "carta-domanda", id: "domenica-s6" }, d.domandaS6),
      h("div", { class: "riga-bottoni", role: "group", "aria-labelledby": "domenica-s6" },
        h("button", { class: "bottone bottone-secondario", type: "button", id: "domenica-si",
          on: { click: () => { ctx.ui.fuocoDopo = "domenica-titolo"; ctx.azioni.rispostaDomenica("si"); } } }, DOMENICA_OGGI.si),
        h("button", { class: "bottone bottone-secondario", type: "button", id: "domenica-no",
          on: { click: () => { ctx.ui.fuocoDopo = "domenica-titolo"; ctx.azioni.rispostaDomenica("no"); } } }, DOMENICA_OGGI.no))) : null);
}

// --- i messaggi di una volta sola (6.4, 6.3 e 6.6) ---

// Un messaggio compare una volta e resta per tutta l'apertura. Si segna subito come visto.
function messaggiUnaVolta(ctx) {
  const mostrati = oggetto(ctx.ui.unaVolta) || {};
  ctx.ui.unaVolta = mostrati;
  const apri = (nome) => {
    if (ctx.messaggi && ctx.messaggi[nome] && !mostrati[nome]) {
      mostrati[nome] = "aperto";
      ctx.azioni.visto(nome);
    }
    return mostrati[nome];
  };
  const chiudi = (nome) => h("button", { class: "bottone bottone-secondario", type: "button", id: `una-volta-${nome}`,
    on: { click: () => { mostrati[nome] = "chiuso"; ctx.azioni.ui("unaVolta", mostrati); } } }, PROMEMORIA.chiudi);
  const fuori = [];
  if (apri("soloStrava") === "aperto") {
    fuori.push(h("aside", { class: "banner una-volta" }, h("p", {}, ctx.modello.notteMaiArrivata ? TESTI_DATI.soloStravaTelefono : TESTI_DATI.soloStrava)));
  }
  if (apri("notteNonArriva") === "aperto") fuori.push(h("aside", { class: "banner una-volta" }, h("p", {}, TESTI_DATI.notteGarmin)));
  // Con l'esempio la copia non serve, le risposte stanno solo nella pagina.
  if (!ctx.demo) {
    const copia = apri("copia");
    if (copia === "aperto") {
      const salva = async () => {
        const esito = await ctx.azioni.salvaCopia();
        mostrati.copia = esito && esito.ok ? "fatta" : "nonFatta";
        ctx.azioni.ui("unaVolta", mostrati);
      };
      fuori.push(h("aside", { class: "banner una-volta" },
        h("p", {}, PROMEMORIA.copia),
        h("div", { class: "riga-bottoni" },
          h("button", { class: "bottone", type: "button", id: "una-volta-copia-salva", on: { click: salva } }, PROMEMORIA.copiaTasto),
          chiudi("copia"))));
    } else if (copia === "fatta" || copia === "nonFatta") {
      fuori.push(h("p", { class: copia === "fatta" ? "salvato" : "avviso-piccolo", role: "status" }, copia === "fatta" ? UNA_VOLTA.copiaFatta : UNA_VOLTA.copiaNo));
    }
  }
  if (apri("iphone") === "aperto") {
    fuori.push(h("aside", { class: "banner una-volta" }, h("p", {}, PROMEMORIA.iphone), h("div", { class: "riga-bottoni" }, chiudi("iphone"))));
  }
  return fuori;
}

// --- il «Perché», chiuso (4.8), con «Quanto fidarti oggi» quando la fiducia non è alta (4.7) ---

// esito, se c'è, è la scritta propria della voce, per esempio «da rispondere» per una domanda senza
// risposta, che conta sempre per intero e non è «non conta oggi» (4.3).
function riga(nome, testo, colore, esito = null) {
  return h("li", { class: ["voce", `voce-${colore}`] },
    h("span", { class: "voce-pallino", "aria-hidden": "true" }),
    h("span", { class: "voce-nome" }, nome, h("span", { class: "voce-esito" }, ESITO_VOCE[esito] || ESITO_VOCE[colore])),
    h("span", { class: "voce-testo" }, testo));
}

// Un details che resta aperto o chiuso anche quando la pagina si ridisegna, con lo stato in ctx.ui.
function apribile(ctx, chiave, attributi, ...figli) {
  const d = h("details", { ...attributi, open: ctx.ui[chiave] || null }, ...figli);
  d.addEventListener("toggle", () => { ctx.ui[chiave] = d.open; });
  return d;
}

function perche(ctx) {
  const e = ctx.esito;
  const inViaggio = Boolean(ctx.giorno.evento);
  const righe = e.voci.map((v) => riga(v.nome, v.testo, colorePallino(v), v.esito));
  for (const t of e.tetti) righe.push(riga(TETTI[t.chiave] || t.chiave, t.perche, "giallo"));
  // In viaggio battito e HRV ci sono, ma non contano (7.10).
  const note = unici([
    inViaggio ? VIAGGIO.notte : null,
    inViaggio ? e.nota : null,
    ...e.messaggi.filter((x) => x.chiave === "insolita" || x.chiave === "sopraSolito").map((x) => x.testo),
  ]);
  const f = e.fiducia;
  const fiducia = f && f.indice && f.indice !== "alta"
    ? h("div", { class: "fiducia" },
      h("h3", {}, FIDUCIA.titolo),
      h("p", {}, h("strong", {}, `${FIDUCIA.livelli[f.indice]}. `), [...f.righe, FIDUCIA.risposte].join(" ")))
    : null;
  return apribile(ctx, "perche", { class: "carta perche", id: "perche" },
    h("summary", {}, OGGI.perche),
    h("ul", { class: "voci" }, righe),
    note.map((t) => h("p", { class: "perche-nota" }, t)),
    fiducia);
}

function avvisoNotte(ctx) {
  return h("aside", { class: "banner" },
    h("p", {}, MESSAGGI.notteNonArrivata),
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone bottone-secondario", type: "button", id: "aggiorna-notte", on: { click: () => ctx.azioni.ricarica() } },
        icona("aggiorna"), CARTA.aggiorna)));
}

// Dopo una risposta il fuoco va dove la persona stava guardando, quando la pagina si è ridisegnata.
function fuocoDopo(ctx) {
  const id = ctx.ui.fuocoDopo;
  if (!id) return;
  ctx.ui.fuocoDopo = null;
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el || !el.isConnected) return;
    if (el.tabIndex < 0 && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: "center" });
  }, 0);
}

export function vistaOggi(ctx) {
  const m = ctx.modello;
  const e = ctx.esito;
  const g = ctx.giorno;
  const inViaggio = Boolean(g.evento);
  const domanda = !ctx.ui.rispondoDopo && e.controllo.length ? e.controllo[0] : null;
  const vista = h("div", { class: "vista vista-oggi" },
    h("header", { class: "intestazione intestazione-oggi" },
      h("div", { class: "intestazione-testo" },
        h("p", { class: "occhiello" }, dataLunga(m.oggi)),
        h("h1", {}, saluto(new Date().getHours(), m.atleta.nome))),
      inViaggio ? null : h("button", { class: "bottone bottone-secondario bottone-viaggio", type: "button", id: "sono-in-viaggio",
        on: { click: () => ctx.azioni.inViaggio() } }, VIAGGIO.tasto)),
    ctx.demo ? bannerDemo(ctx) : null,
    !m.notteArrivata && !m.notteMaiArrivata && !ctx.demo ? avvisoNotte(ctx) : null,
    domanda ? cartaControllo(ctx, domanda) : cartaSemaforo(ctx),
    inViaggio ? domandeViaggio(ctx) : domandeMattino(ctx),
    pannelloStoMale(ctx),
    // In viaggio le notti non contano, e la riga serve solo dopo «C'è un motivo».
    !inViaggio || diarioDiOggi(m).controllo === "motivo" ? causeIeriSera(ctx) : null,
    carteInPiu(ctx),
    cartaDomenica(ctx),
    messaggiUnaVolta(ctx),
    perche(ctx),
    h("p", { class: "semaforo-piede" }, h("a", { href: "#guida" }, OGGI.comeNasce)));
  fuocoDopo(ctx);
  return vista;
}
