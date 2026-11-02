// Le pagine che si vedono anche senza essere entrati: benvenuto, collegamento con il riquadro «Prima
// di entrare», guida, privacy. Qui ci sono anche la pagina del consenso per chi è già dentro, le
// finestre di conferma e le schermate di attesa e di errore. I testi stanno in js/testi-pagine.js.

import { h, icona } from "../dom.js?v=202611021705";
import {
  GUIDA_SEMAFORO, GUIDA_LIVELLI, GUIDA_COLONNE, GUIDA, DISPOSITIVI, DOMANDE_FREQUENTI, DOMANDA_ESCI_CON_INTERVALS, LIMITI,
  PRIVACY, COLLEGA, BENVENUTO, ATTESA, ERRORE,
} from "../testi-pagine.js?v=202611021705";
import { SPIEGAZIONI } from "../testi-numeri.js?v=202611021705";
import { GUIDA_PRONTO } from "../testi-prontezza.js?v=202611021705";
import { CONSENSO } from "../testi-app.js?v=202611021705";
import { intestazione, luceSemaforo } from "./comuni.js?v=202611021705";
import { OAUTH_ATTIVO } from "../config.js?v=202611021705";

const IMPOSTAZIONI = "https://intervals.icu/settings";

// Il riquadro «Prima di entrare» (6.8 e Consensi, S1-2), con la conferma dei 18 anni e il consenso
// C0. Le caselle partono sempre vuote. cambia(pronto) dice se ci sono tutte le spunte.
function riquadroConsenso({ conMaggiorenne = true, conTitolo = true, cambia = () => {} } = {}) {
  const maggiorenne = conMaggiorenne ? h("input", { type: "checkbox", id: "consenso-18", name: "consenso-18" }) : null;
  const consenso = h("input", { type: "checkbox", id: "consenso-c0", name: "consenso-c0" });
  const tutte = () => Boolean((!maggiorenne || maggiorenne.checked) && consenso.checked);
  for (const c of [maggiorenne, consenso]) if (c) c.addEventListener("change", () => cambia(tutte()));
  const spazio = CONSENSO.testo.indexOf(" ");
  const riquadro = h("div", { class: "consenso", role: "group", "aria-label": CONSENSO.titolo },
    conTitolo ? h("h3", {}, CONSENSO.titolo) : null,
    h("p", {}, CONSENSO.intro, " ", h("a", { href: "#privacy" }, CONSENSO.informativa)),
    maggiorenne ? h("div", { class: "spunta spunta-consenso" }, maggiorenne,
      h("label", { for: "consenso-18" }, CONSENSO.maggiorenne)) : null,
    h("div", { class: "spunta spunta-consenso" }, consenso,
      h("label", { for: "consenso-c0" }, h("strong", {}, CONSENSO.testo.slice(0, spazio)), CONSENSO.testo.slice(spazio))),
    h("p", { class: "piccolo" }, conMaggiorenne ? CONSENSO.servono : CONSENSO.serve));
  return { riquadro, tutte };
}

// Chi era già dentro prima di questa versione, o con un testo del consenso più vecchio, rivede il
// riquadro una volta. Senza le spunte i suoi dati non si leggono (6.8 e Consensi, S1-7).
export function vistaConsenso(ctx) {
  const prima = ctx.consensoPrima;
  const continua = h("button", { class: "bottone", type: "button", id: "consenso-continua", disabled: true }, CONSENSO.continua);
  const { riquadro, tutte } = riquadroConsenso({
    conMaggiorenne: !prima, conTitolo: false, cambia: (pronto) => { continua.disabled = !pronto; },
  });
  continua.addEventListener("click", () => { if (tutte()) ctx.azioni.accettaConsenso(); });
  return h("div", { class: "vista vista-testo" },
    intestazione(BENVENUTO.occhiello, CONSENSO.titolo, prima ? CONSENSO.nuovo : CONSENSO.primaVolta),
    h("section", { class: "carta passo accesso" },
      riquadro,
      h("div", { class: "riga-bottoni" },
        continua,
        h("button", { class: "bottone bottone-secondario", type: "button", on: { click: () => ctx.azioni.esci() } }, CONSENSO.esci))));
}

// Una finestra di conferma. Ogni scelta chiude la finestra e poi fa la sua azione. Le scelte che
// escono hanno lo stesso peso, quella che resta è secondaria (Consensi, S1-4).
export function dialogo({ titolo, testi = [], piccolo = null, scelte = [] }) {
  const finestra = h("dialog", { class: "dialogo", "aria-labelledby": "dialogo-titolo" },
    h("h2", { id: "dialogo-titolo" }, titolo),
    testi.map((t) => h("p", {}, t)),
    piccolo ? h("p", { class: "piccolo" }, piccolo) : null);
  const riga = h("div", { class: "dialogo-bottoni" }, scelte.map((s) => h("button", {
    class: s.secondario ? "bottone bottone-secondario" : "bottone", type: "button",
    on: { click: () => { finestra.close(); if (s.azione) s.azione(); } },
  }, s.testo)));
  finestra.append(riga);
  return finestra;
}

export function vistaBenvenuto(ctx) {
  const B = BENVENUTO;
  return h("div", { class: "vista vista-benvenuto" },
    h("section", { class: "eroe" },
      h("div", { class: "eroe-luce" }, luceSemaforo("verde")),
      h("div", { class: "eroe-testo" },
        h("p", { class: "occhiello" }, B.occhiello),
        h("h1", {}, B.titolo),
        h("p", { class: "attacco" }, B.attacco),
        h("div", { class: "riga-bottoni" },
          h("a", { class: "bottone", href: "#collega" }, B.inizia),
          h("button", { class: "bottone bottone-secondario", type: "button", on: { click: () => ctx.azioni.demo() } }, B.esempio)),
        h("p", { class: "piccolo" }, B.nota))),
    h("section", { class: "tre-punti" },
      B.punti.map((p) => h("article", { class: "carta" }, h("h2", {}, p.titolo), h("p", {}, p.testo)))),
    h("section", { class: "sezione" },
      h("h2", {}, B.comeFunziona),
      h("ol", { class: "passi-semplici" },
        B.passi.map((p) => h("li", {}, h("strong", {}, p.forte), p.testo || (OAUTH_ATTIVO ? p.intervals : p.chiave))))));
}

// Un passo scritto a pezzi, con un link o un grassetto in mezzo (COLLEGA.chiave.passi).
function aPezzi(pezzi) {
  return pezzi.map((x) => {
    if (typeof x === "string") return x;
    if (x.link) return h("a", { href: IMPOSTAZIONI, target: "_blank", rel: "noopener" }, x.link);
    return h("strong", {}, x.forte);
  });
}

export function vistaCollega(ctx) {
  const C = COLLEGA;
  const K = C.chiave;
  const errore = ctx.erroreAccesso;
  // Con «Entra con intervals.icu» acceso, la chiave da incollare diventa l'alternativa del punto 3.
  // Spento (clientId null in js/config.js) la pagina è quella di sempre.
  const conIntervals = OAUTH_ATTIVO;
  const scelto = DISPOSITIVI.find((d) => d.id === ctx.ui.dispositivo) || DISPOSITIVI[0];

  // «Entra con intervals.icu» e il pulsante Entra della chiave restano spenti finché mancano le due
  // spunte del riquadro «Prima di entrare».
  const pulsanti = [];
  const { riquadro, tutte } = riquadroConsenso({
    cambia: (pronto) => { for (const b of pulsanti) if (!b.dataset.inCorso) b.disabled = !pronto; },
  });

  const stato = h("p", { class: "stato-salvataggio", role: "status", "aria-live": "polite" });
  const campo = h("input", {
    type: "password", id: "chiave", name: "chiave", autocomplete: "off", autocapitalize: "off",
    spellcheck: "false", inputmode: "text", required: true, placeholder: K.segnaposto,
    "aria-describedby": "chiave-aiuto",
  });
  const mostra = h("input", { type: "checkbox", id: "mostra-chiave", on: { change: (e) => { campo.type = e.target.checked ? "text" : "password"; } } });
  const ricorda = h("input", { type: "checkbox", id: "ricorda", checked: true, "aria-describedby": "ricorda-aiuto" });

  // Scegliere il dispositivo cambia solo le istruzioni: la chiave già incollata resta dov'è.
  const istruzioni = h("p", { class: "istruzioni", "aria-live": "polite" }, scelto.passi);
  const bottoniDispositivo = DISPOSITIVI.map((d) => h("button", {
    type: "button",
    class: ["scelta-bottone", d.id === scelto.id && "attivo"],
    "aria-pressed": d.id === scelto.id ? "true" : "false",
    dataset: { dispositivo: d.id },
  }, d.nome));
  for (const b of bottoniDispositivo) {
    b.addEventListener("click", () => {
      const d = DISPOSITIVI.find((x) => x.id === b.dataset.dispositivo);
      istruzioni.textContent = d.passi;
      for (const altro of bottoniDispositivo) {
        const attivo = altro === b;
        altro.classList.toggle("attivo", attivo);
        altro.setAttribute("aria-pressed", attivo ? "true" : "false");
      }
      ctx.ui.dispositivo = d.id; // solo una comodità, cambia le istruzioni e non si salva
    });
  }

  const entra = h("button", { class: "bottone", type: "submit", id: "entra", disabled: true }, K.entra);
  pulsanti.push(entra);
  const modulo = h("form", { class: conIntervals ? "accesso-chiave" : "carta passo accesso", id: "passo-chiave", novalidate: true },
    conIntervals ? null : h("h2", {}, K.titolo),
    conIntervals ? null : riquadro,
    h("ol", { class: "passi-semplici" }, K.passi.map((p) => h("li", {}, aPezzi(p)))),
    h("p", { class: "piccolo" }, K.attenzione),
    h("div", { class: "campo" },
      h("label", { for: "chiave" }, K.etichetta),
      campo,
      h("p", { class: "piccolo", id: "chiave-aiuto" }, K.aiuto)),
    h("div", { class: "spunte" },
      h("span", { class: "spunta" }, mostra, h("label", { for: "mostra-chiave" }, K.mostra)),
      h("span", { class: "spunta" }, ricorda, h("label", { for: "ricorda" }, K.ricorda))),
    h("p", { class: "piccolo", id: "ricorda-aiuto" }, CONSENSO.ricordaChiave),
    h("div", { class: "riga-bottoni" }, entra),
    stato);

  modulo.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!tutte()) { stato.textContent = CONSENSO.servono; return; }
    const chiave = campo.value.trim();
    if (!chiave) { stato.textContent = K.prima; campo.focus(); return; }
    entra.disabled = true;
    entra.dataset.inCorso = "1";
    stato.textContent = K.controllo;
    const esito = await ctx.azioni.entra(chiave, ricorda.checked);
    delete entra.dataset.inCorso;
    if (esito) { entra.disabled = !tutte(); stato.textContent = esito; }
  });

  const vaiAllaChiave = () => {
    modulo.scrollIntoView({ block: "start" });
    campo.focus({ preventScroll: true });
  };

  let passoTre = modulo;
  let vaiAlPunto = vaiAllaChiave;
  if (conIntervals) {
    const O = C.intervals;
    // «Vai al punto 3» porta alla chiave quando a non funzionare è la chiave incollata, oppure quando
    // l'errore stesso dice di usare la chiave. Se la richiesta di accesso non si ritrova il riquadro
    // della chiave si apre lo stesso, perché succede quando il browser non riporta qui la stessa
    // scheda (può capitare nell'icona dell'iPhone), e allora la chiave è la via d'uscita.
    const tipo = ctx.tipoErroreAccesso;
    const versoChiave = Boolean(errore) && (!ctx.erroreConIntervals || tipo === "configurazione" || tipo === "oauth");
    const alternativa = h("details", { class: "alternativa", open: versoChiave || (Boolean(errore) && tipo === "state") },
      h("summary", {}, O.oppure),
      modulo);
    const ricordaIntervals = h("input", { type: "checkbox", id: "ricorda-intervals", checked: true, "aria-describedby": "ricorda-intervals-aiuto" });
    const statoIntervals = h("p", { class: "stato-salvataggio", id: "stato-intervals", role: "status", "aria-live": "polite" });
    const bottoneIntervals = h("button", { class: "bottone", type: "button", id: "entra-intervals", disabled: true }, O.entra);
    pulsanti.push(bottoneIntervals);
    bottoneIntervals.addEventListener("click", async () => {
      if (!tutte()) { statoIntervals.textContent = CONSENSO.servono; return; }
      bottoneIntervals.disabled = true;
      bottoneIntervals.dataset.inCorso = "1";
      statoIntervals.textContent = O.partenza;
      const esito = await ctx.azioni.entraConIntervals(ricordaIntervals.checked);
      if (!esito) return;
      delete bottoneIntervals.dataset.inCorso;
      bottoneIntervals.disabled = !tutte();
      statoIntervals.textContent = esito.messaggio;
      // Se questo browser non può entrare con intervals.icu, il messaggio dice di usare la chiave.
      if (esito.tipo === "oauth") {
        alternativa.open = true;
        campo.focus();
      }
    });
    passoTre = h("section", { class: "carta passo accesso", id: "passo-intervals" },
      h("h2", {}, O.titolo),
      riquadro,
      h("p", {}, O.testo),
      h("p", { class: "piccolo" }, O.piccolo),
      h("div", { class: "spunte" },
        h("span", { class: "spunta" }, ricordaIntervals, h("label", { for: "ricorda-intervals" }, O.ricorda))),
      h("p", { class: "piccolo", id: "ricorda-intervals-aiuto" }, CONSENSO.ricordaAccesso),
      h("div", { class: "riga-bottoni" }, bottoneIntervals),
      statoIntervals,
      alternativa);
    vaiAlPunto = versoChiave
      ? () => { alternativa.open = true; vaiAllaChiave(); }
      : () => { passoTre.scrollIntoView({ block: "start" }); bottoneIntervals.focus({ preventScroll: true }); };
  }

  return h("div", { class: "vista" },
    intestazione(C.occhiello, C.titolo, C.attacco),

    // tabindex -1 perché al ritorno da intervals.icu con un errore il fuoco viene messo qui.
    errore ? h("div", { class: "banner banner-errore", role: "alert", id: "errore-accesso", tabindex: "-1" },
      h("p", {}, h("strong", {}, errore), ctx.erroreConIntervals ? null : C.errore),
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone", type: "button", on: { click: vaiAlPunto } }, C.vaiAlPunto))) : null,

    h("section", { class: "carta passo" },
      h("h2", {}, C.uno.titolo),
      h("p", {}, C.uno.testo),
      h("p", {}, h("a", { href: "https://intervals.icu", target: "_blank", rel: "noopener" }, C.uno.apri), C.uno.dopo)),

    h("section", { class: "carta passo" },
      h("h2", {}, C.due.titolo),
      h("p", {}, C.due.testo),
      h("div", { class: "scelte scelte-dispositivi", role: "group", "aria-label": C.due.gruppo }, bottoniDispositivo),
      istruzioni,
      h("p", {}, h("a", { href: IMPOSTAZIONI, target: "_blank", rel: "noopener" }, C.due.impostazioni)),
      h("p", { class: "piccolo" }, C.due.piccolo)),

    passoTre,

    h("section", { class: "carta passo" },
      h("h2", {}, C.home.titolo),
      h("p", {}, C.home.testo),
      h("ul", { class: "elenco" },
        h("li", {}, h("strong", {}, C.home.iphone), conIntervals ? C.home.iphoneIntervals : C.home.iphoneChiave),
        h("li", {}, h("strong", {}, C.home.android), C.home.androidTesto))),

    h("p", { class: "centrato" },
      C.esempio,
      h("button", { class: "collegamento", type: "button", on: { click: () => ctx.azioni.demo() } }, C.esempioTasto)));
}

// Il pallino di ogni livello nella Guida. Il giallo leggero e il giallo hanno lo stesso colore.
const PALLINO_LIVELLO = { verde: "pallino-verde", "giallo-leggero": "pallino-giallo", giallo: "pallino-giallo", rosso: "pallino-rosso" };

function pallino(colore) {
  return h("span", { class: ["pallino", `pallino-${colore}`], "aria-hidden": "true" });
}

function paragrafi(lista) {
  return lista.map((t) => h("p", {}, t));
}

// Una sezione della Guida con il suo titolo, e la voce dell'indice che porta lì. L'indice usa dei
// tasti e non dei link, perché il cancelletto nell'indirizzo è la rotta della pagina.
function sezioneGuida(id, titolo, ...contenuto) {
  return h("section", { class: "sezione", id: `guida-${id}`, "aria-labelledby": `guida-titolo-${id}` },
    h("h2", { id: `guida-titolo-${id}` }, titolo),
    contenuto);
}

function indiceGuida(voci) {
  return h("nav", { class: "indice-guida", "aria-label": GUIDA.indice },
    h("p", { class: "occhiello" }, GUIDA.indice),
    h("ul", {}, voci.map((v) => h("li", {},
      h("button", { class: "collegamento", type: "button", on: { click: () => {
        const titolo = document.getElementById(`guida-titolo-${v.id}`);
        if (!titolo) return;
        titolo.setAttribute("tabindex", "-1");
        titolo.scrollIntoView({ block: "start" });
        titolo.focus({ preventScroll: true });
      } } }, v.titolo)))));
}

export function vistaGuida() {
  const G = GUIDA;
  const metriche = ["hrv", "fc", "sonno", "fitness", "fatica", "freschezza", "carico"].map((k) => SPIEGAZIONI[k]);
  const domande = OAUTH_ATTIVO
    ? DOMANDE_FREQUENTI.map((f) => (f.d === DOMANDA_ESCI_CON_INTERVALS.d ? DOMANDA_ESCI_CON_INTERVALS : f))
    : DOMANDE_FREQUENTI;
  const altre = G.sezioni.map((s, k) => ({ id: `regole-${k}`, titolo: s.titolo, paragrafi: s.paragrafi }));
  const voci = [
    { id: "semaforo", titolo: G.semaforo.titolo },
    ...G.preparazione.map((s) => ({ id: s.id, titolo: s.titolo })),
    ...altre.map((s) => ({ id: s.id, titolo: s.titolo })),
    { id: "numeri", titolo: G.numeri },
    { id: "limiti", titolo: G.limiti },
    { id: "domande", titolo: G.domande },
  ];
  return h("div", { class: "vista vista-testo vista-guida" },
    intestazione(G.titolo, G.sottotitolo, G.attacco),
    indiceGuida(voci),

    // La pagina del semaforo a punti (7.11). La tabella è GUIDA_SEMAFORO, uguale nel README.
    sezioneGuida("semaforo", G.semaforo.titolo,
      paragrafi(G.semaforo.paragrafi),
      h("h3", {}, G.semaforo.livelli),
      h("ul", { class: "regole" }, GUIDA_LIVELLI.map((l) => h("li", {},
        h("span", { class: ["pallino", PALLINO_LIVELLO[l.livello]], "aria-hidden": "true" }),
        h("span", {}, h("strong", {}, `${l.titolo} `), l.testo)))),
      h("h3", {}, G.semaforo.voci),
      h("p", {}, G.semaforo.vociAttacco),
      h("div", { class: "carte-regole" }, GUIDA_SEMAFORO.map((r) => h("article", { class: "carta regola" },
        h("h4", {}, r.voce),
        h("p", {}, pallino("verde"), h("strong", {}, `${GUIDA_COLONNE.verde}. `), r.verde),
        h("p", {}, pallino("giallo"), h("strong", {}, `${GUIDA_COLONNE.giallo}. `), r.giallo),
        h("p", {}, pallino("rosso"), h("strong", {}, `${GUIDA_COLONNE.rosso}. `), r.rosso))))),

    // Le pagine della preparazione (7.11). «Come decido se sei pronto» comincia con la riga di 2.9.
    G.preparazione.map((s) => sezioneGuida(s.id, s.titolo,
      s.id === "pronto" ? h("p", { class: "guida-riga" }, GUIDA_PRONTO) : null,
      paragrafi(s.paragrafi))),

    altre.map((s) => sezioneGuida(s.id, s.titolo, paragrafi(s.paragrafi))),

    sezioneGuida("numeri", G.numeri,
      metriche.map((t) => h("article", { class: "carta metrica" },
        h("h3", {}, t.nome, h("span", { class: "metrica-sotto" }, t.sottotitolo)),
        h("p", {}, t.cosa),
        h("p", {}, h("strong", {}, `${G.leggi} `), t.come),
        h("p", {}, h("strong", {}, `${G.legato} `), t.legami)))),

    sezioneGuida("limiti", G.limiti,
      h("ul", { class: "elenco" }, LIMITI.map((l) => h("li", {}, l)))),

    sezioneGuida("domande", G.domande,
      domande.map((f) => h("details", { class: "faq" }, h("summary", {}, f.d), h("p", {}, f.r)))),

    h("p", {}, h("a", { href: "#privacy" }, G.privacy)));
}

// La Privacy, con quello che l'app fa oggi e quello che resta su questo telefono (Informativa, Parte 1).
export function vistaPrivacy() {
  const P = PRIVACY;
  const testo = (x) => (typeof x === "string" ? x : OAUTH_ATTIVO ? x.intervals : x.chiave);
  return h("div", { class: "vista vista-testo" },
    intestazione(P.titolo, P.sottotitolo, null),
    P.sezioni.map((s) => h("section", { class: "sezione" },
      h("h2", {}, s.titolo),
      h("ul", { class: "elenco" }, s.punti.map((x) => h("li", {}, testo(x)))),
      s.dopo ? h("p", {}, s.dopo) : null)),
    h("p", { class: "riga-link" },
      h("a", { href: "#impostazioni" }, P.impostazioni),
      h("a", { href: "#guida" }, P.guida)));
}

export function vistaCaricamento(testo = ATTESA.lettura) {
  return h("div", { class: "vista vista-caricamento", role: "status", "aria-live": "polite" },
    h("div", { class: "rotella", "aria-hidden": "true" }),
    h("p", {}, testo));
}

export function vistaErrore(ctx, errore) {
  const E = ERRORE;
  // Con l'accesso di intervals.icu un 403 vuol dire di solito che manca un permesso. Riprovare non
  // basta, serve uscire ed entrare di nuovo lasciando accese tutte le voci.
  const permessoTolto = errore.tipo === "permesso" && ctx.accesso === "token";
  let nota = E.chiave;
  if (permessoTolto) nota = E.permesso;
  else if (ctx.accesso === "token") nota = E.accesso;
  return h("div", { class: "vista vista-testo" },
    intestazione(null, E.titolo, errore.messaggio || E.messaggio),
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "button", on: { click: () => ctx.azioni.ricarica() } }, icona("aggiorna"), E.riprova),
      permessoTolto
        ? h("button", { class: "bottone bottone-secondario", type: "button", on: { click: () => ctx.azioni.esci("collega") } }, E.esciEntra)
        : null),
    h("p", { class: "piccolo" }, nota));
}
