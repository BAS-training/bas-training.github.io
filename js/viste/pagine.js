// Le pagine che si vedono anche senza essere entrati: benvenuto, collegamento con il riquadro «Prima
// di entrare», guida, privacy. Qui ci sono anche la pagina del consenso per chi è già dentro e le
// finestre di conferma.

import { h, icona } from "../dom.js?v=202610312043";
import {
  SPIEGAZIONI, GUIDA_SEMAFORO, GUIDA_LIVELLI, GUIDA_COLONNE, GUIDA, DISPOSITIVI, DOMANDE_FREQUENTI,
  DOMANDA_ESCI_CON_INTERVALS, LIMITI, CONSENSO, PRIVACY,
} from "../testi.js?v=202610312043";
import { intestazione, luceSemaforo } from "./comuni.js?v=202610312043";
import { OAUTH_ATTIVO } from "../config.js?v=202610312043";

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
    intestazione("Come sto", CONSENSO.titolo, prima ? CONSENSO.nuovo : CONSENSO.primaVolta),
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
  return h("div", { class: "vista vista-benvenuto" },
    h("section", { class: "eroe" },
      h("div", { class: "eroe-luce" }, luceSemaforo("verde")),
      h("div", { class: "eroe-testo" },
        h("p", { class: "occhiello" }, "Come sto"),
        h("h1", {}, "Arriva pronto alla tua prossima avventura"),
        h("p", { class: "attacco" }, "Ogni mattina ti dice se oggi puoi spingere o se è meglio andare piano. Legge i dati del tuo orologio e del ciclocomputer e te li spiega in parole semplici."),
        h("div", { class: "riga-bottoni" },
          h("a", { class: "bottone", href: "#collega" }, "Inizia"),
          h("button", { class: "bottone bottone-secondario", type: "button", on: { click: () => ctx.azioni.demo() } }, "Guarda un esempio")),
        h("p", { class: "piccolo" }, "Gratis e senza pubblicità. Serve solo un account gratuito su intervals.icu, e i tuoi dati restano tra te e intervals.icu."))),
    h("section", { class: "tre-punti" },
      h("article", { class: "carta" },
        h("h2", {}, "Un semaforo ogni mattina"),
        h("p", {}, "Verde, giallo o rosso, con il perché in poche righe. Guarda come hai dormito, il cuore a riposo, quanto ti sei allenato e come ti senti.")),
      h("article", { class: "carta" },
        h("h2", {}, "I numeri spiegati semplice"),
        h("p", {}, "Fitness, Fatica, HRV. Ogni numero ha la sua spiegazione e ti dice a cosa è legato, così impari a leggerti da solo.")),
      h("article", { class: "carta" },
        h("h2", {}, "Pronto per il tuo obiettivo?"),
        h("p", {}, "Scegli la tua prossima avventura e la data. Vedi se sei pronto e quanto allenarti per arrivarci bene."))),
    h("section", { class: "sezione" },
      h("h2", {}, "Come funziona"),
      h("ol", { class: "passi-semplici" },
        h("li", {}, h("strong", {}, "Il tuo orologio o ciclocomputer "), "manda allenamenti e notti a intervals.icu, un servizio gratuito usato da tantissimi ciclisti."),
        h("li", {}, h("strong", {}, "Come sto "), OAUTH_ATTIVO
          ? "legge quei dati dal tuo telefono, con il permesso che gli dai su intervals.icu."
          : "legge quei dati dal tuo telefono, con una chiave che ti dà intervals.icu."),
        h("li", {}, h("strong", {}, "Ogni mattina "), "apri la pagina, guardi il semaforo e rispondi a tre domande. Dieci secondi."))));
}

export function vistaCollega(ctx) {
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
    spellcheck: "false", inputmode: "text", required: true, placeholder: "Incolla qui la chiave",
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

  const entra = h("button", { class: "bottone", type: "submit", id: "entra", disabled: true }, "Entra");
  pulsanti.push(entra);
  const modulo = h("form", { class: conIntervals ? "accesso-chiave" : "carta passo accesso", id: "passo-chiave", novalidate: true },
    conIntervals ? null : h("h2", {}, "3. Copia la chiave e incollala qui"),
    conIntervals ? null : riquadro,
    h("ol", { class: "passi-semplici" },
      h("li", {}, "Apri le ", h("a", { href: IMPOSTAZIONI, target: "_blank", rel: "noopener" }, "impostazioni di intervals.icu"), "."),
      h("li", {}, "Scorri fino in fondo alla pagina, alla sezione ", h("strong", {}, "Developer Settings"), "."),
      h("li", {}, "Accanto ad ", h("strong", {}, "API Key"), " premi il pulsante per vederla o crearla, poi copiala."),
      h("li", {}, "Torna qui e incollala nel riquadro.")),
    h("p", { class: "piccolo" }, "È una fila lunga di lettere e numeri. Non confonderla con l'Athlete ID, quello corto che comincia con la i."),
    h("div", { class: "campo" },
      h("label", { for: "chiave" }, "La tua chiave di intervals.icu"),
      campo,
      h("p", { class: "piccolo", id: "chiave-aiuto" }, "La chiave apre il tuo account intervals.icu, come una password. Come sto la usa solo per leggere i tuoi dati e scrivere le risposte del mattino, e la tiene solo su questo telefono o computer.")),
    h("div", { class: "spunte" },
      h("span", { class: "spunta" }, mostra, h("label", { for: "mostra-chiave" }, "Mostra la chiave")),
      h("span", { class: "spunta" }, ricorda, h("label", { for: "ricorda" }, "Ricordami su questo dispositivo"))),
    h("p", { class: "piccolo", id: "ricorda-aiuto" }, CONSENSO.ricordaChiave),
    h("div", { class: "riga-bottoni" }, entra),
    stato);

  modulo.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!tutte()) { stato.textContent = CONSENSO.servono; return; }
    const chiave = campo.value.trim();
    if (!chiave) { stato.textContent = "Incolla prima la chiave."; campo.focus(); return; }
    entra.disabled = true;
    entra.dataset.inCorso = "1";
    stato.textContent = "Controllo la chiave…";
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
    // «Vai al punto 3» porta alla chiave quando a non funzionare è la chiave incollata, oppure quando
    // l'errore stesso dice di usare la chiave. Se la richiesta di accesso non si ritrova il riquadro
    // della chiave si apre lo stesso, perché succede quando il browser non riporta qui la stessa
    // scheda (può capitare nell'icona dell'iPhone), e allora la chiave è la via d'uscita.
    const tipo = ctx.tipoErroreAccesso;
    const versoChiave = Boolean(errore) && (!ctx.erroreConIntervals || tipo === "configurazione" || tipo === "oauth");
    const alternativa = h("details", { class: "alternativa", open: versoChiave || (Boolean(errore) && tipo === "state") },
      h("summary", {}, "Oppure entra con la chiave API di intervals.icu"),
      modulo);
    const ricordaIntervals = h("input", { type: "checkbox", id: "ricorda-intervals", checked: true, "aria-describedby": "ricorda-intervals-aiuto" });
    const statoIntervals = h("p", { class: "stato-salvataggio", id: "stato-intervals", role: "status", "aria-live": "polite" });
    const bottoneIntervals = h("button", { class: "bottone", type: "button", id: "entra-intervals", disabled: true }, "Entra con intervals.icu");
    pulsanti.push(bottoneIntervals);
    bottoneIntervals.addEventListener("click", async () => {
      if (!tutte()) { statoIntervals.textContent = CONSENSO.servono; return; }
      bottoneIntervals.disabled = true;
      bottoneIntervals.dataset.inCorso = "1";
      statoIntervals.textContent = "Ti porto su intervals.icu…";
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
      h("h2", {}, "3. Entra con intervals.icu"),
      riquadro,
      h("p", {}, "Premi il pulsante. Si apre intervals.icu, entri con il tuo account e dai il permesso a Come sto. Poi intervals.icu ti riporta qui da solo."),
      h("p", { class: "piccolo" }, "Come sto chiede di leggere allenamenti, notti e profilo, e di scrivere le risposte del mattino. Lascia accese tutte le voci. La password la scrivi solo su intervals.icu, Come sto non la vede mai."),
      h("div", { class: "spunte" },
        h("span", { class: "spunta" }, ricordaIntervals, h("label", { for: "ricorda-intervals" }, "Ricordami su questo dispositivo"))),
      h("p", { class: "piccolo", id: "ricorda-intervals-aiuto" }, CONSENSO.ricordaAccesso),
      h("div", { class: "riga-bottoni" }, bottoneIntervals),
      statoIntervals,
      alternativa);
    vaiAlPunto = versoChiave
      ? () => { alternativa.open = true; vaiAllaChiave(); }
      : () => { passoTre.scrollIntoView({ block: "start" }); bottoneIntervals.focus({ preventScroll: true }); };
  }

  return h("div", { class: "vista" },
    intestazione("Collega i tuoi dati", "Tre passi, una volta sola",
      "Ci vogliono cinque minuti. Il semaforo parte dalla prima notte e dal primo giro registrati, e diventa completo in due settimane."),

    // tabindex -1 perché al ritorno da intervals.icu con un errore il fuoco viene messo qui.
    errore ? h("div", { class: "banner banner-errore", role: "alert", id: "errore-accesso", tabindex: "-1" },
      h("p", {}, h("strong", {}, errore), ctx.erroreConIntervals ? null : " Copiala di nuovo e incollala qui sotto, al punto 3."),
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone", type: "button", on: { click: vaiAlPunto } }, "Vai al punto 3"))) : null,

    h("section", { class: "carta passo" },
      h("h2", {}, "1. Crea un account gratuito su intervals.icu"),
      h("p", {}, "intervals.icu è il servizio che raccoglie i dati dal tuo orologio e calcola Fitness e Fatica. Il piano gratuito basta."),
      h("p", {}, h("a", { href: "https://intervals.icu", target: "_blank", rel: "noopener" }, "Apri intervals.icu"), " e crea l'account. Se ce l'hai già, passa al punto 2.")),

    h("section", { class: "carta passo" },
      h("h2", {}, "2. Collega il tuo orologio o ciclocomputer"),
      h("p", {}, "Si fa su intervals.icu, non qui. Scegli cosa usi."),
      h("div", { class: "scelte scelte-dispositivi", role: "group", "aria-label": "Il tuo dispositivo" }, bottoniDispositivo),
      istruzioni,
      h("p", {}, h("a", { href: IMPOSTAZIONI, target: "_blank", rel: "noopener" }, "Apri le impostazioni di intervals.icu")),
      h("p", { class: "piccolo" }, "Se hai un ciclocomputer e un orologio, collegali tutti e due. Al primo collegamento intervals.icu scarica anche un po' di storico, così i numeri sono pronti prima.")),

    passoTre,

    h("section", { class: "carta passo" },
      h("h2", {}, "Per ritrovarla ogni mattina"),
      h("p", {}, "Mettila nella schermata Home del telefono, così si apre come un'app."),
      h("ul", { class: "elenco" },
        h("li", {}, h("strong", {}, "iPhone. "), conIntervals
          ? "In Safari tocca Condividi e poi Aggiungi alla schermata Home. Apri l'icona ed entra da lì, perché l'icona non vede l'accesso fatto in Safari."
          : "In Safari tocca Condividi e poi Aggiungi alla schermata Home. Apri l'icona e incolla lì la chiave, perché l'icona non vede quella salvata in Safari."),
        h("li", {}, h("strong", {}, "Android. "), "Nel menu di Chrome, i tre puntini, tocca Aggiungi a schermata Home."))),

    h("p", { class: "centrato" },
      "Vuoi prima dare un'occhiata? ",
      h("button", { class: "collegamento", type: "button", on: { click: () => ctx.azioni.demo() } }, "Guarda i dati di esempio")));
}

// Il pallino di ogni livello nella Guida. Il giallo leggero e il giallo hanno lo stesso colore.
const PALLINO_LIVELLO = { verde: "pallino-verde", "giallo-leggero": "pallino-giallo", giallo: "pallino-giallo", rosso: "pallino-rosso" };

function pallino(colore) {
  return h("span", { class: ["pallino", `pallino-${colore}`], "aria-hidden": "true" });
}

function paragrafi(lista) {
  return lista.map((t) => h("p", {}, t));
}

export function vistaGuida() {
  const G = GUIDA;
  const metriche = ["hrv", "fc", "sonno", "fitness", "fatica", "freschezza", "carico"].map((k) => SPIEGAZIONI[k]);
  const domande = OAUTH_ATTIVO
    ? DOMANDE_FREQUENTI.map((f) => (f.d === DOMANDA_ESCI_CON_INTERVALS.d ? DOMANDA_ESCI_CON_INTERVALS : f))
    : DOMANDE_FREQUENTI;
  return h("div", { class: "vista vista-testo" },
    intestazione(G.titolo, G.sottotitolo, G.attacco),

    // La pagina del semaforo a punti (7.11). La tabella è GUIDA_SEMAFORO, uguale nel README.
    h("section", { class: "sezione" },
      h("h2", {}, G.semaforo.titolo),
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

    G.sezioni.map((s) => h("section", { class: "sezione" },
      h("h2", {}, s.titolo),
      paragrafi(s.paragrafi))),

    h("section", { class: "sezione" },
      h("h2", {}, G.numeri),
      metriche.map((t) => h("article", { class: "carta metrica" },
        h("h3", {}, t.nome, h("span", { class: "metrica-sotto" }, t.sottotitolo)),
        h("p", {}, t.cosa),
        h("p", {}, h("strong", {}, `${G.leggi} `), t.come),
        h("p", {}, h("strong", {}, `${G.legato} `), t.legami)))),

    h("section", { class: "sezione" },
      h("h2", {}, G.limiti),
      h("ul", { class: "elenco" }, LIMITI.map((l) => h("li", {}, l)))),

    h("section", { class: "sezione" },
      h("h2", {}, G.domande),
      domande.map((f) => h("details", { class: "faq" }, h("summary", {}, f.d), h("p", {}, f.r)))),

    h("p", {}, h("a", { href: "#privacy" }, G.privacy)));
}

// La Privacy del rilascio 1, con quello che resta su questo telefono (Informativa, Parte 1).
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

export function vistaCaricamento(testo = "Leggo i tuoi dati da intervals.icu…") {
  return h("div", { class: "vista vista-caricamento", role: "status", "aria-live": "polite" },
    h("div", { class: "rotella", "aria-hidden": "true" }),
    h("p", {}, testo));
}

export function vistaErrore(ctx, errore) {
  // Con l'accesso di intervals.icu un 403 vuol dire di solito che manca un permesso. Riprovare non
  // basta, serve uscire ed entrare di nuovo lasciando accese tutte le voci.
  const permessoTolto = errore.tipo === "permesso" && ctx.accesso === "token";
  let nota = "La tua chiave resta salvata. Se il problema è solo la connessione, basta riprovare tra poco.";
  if (permessoTolto) nota = "Il tuo accesso resta salvato finché non premi Esci.";
  else if (ctx.accesso === "token") nota = "Il tuo accesso resta salvato. Se il problema è solo la connessione, basta riprovare tra poco.";
  return h("div", { class: "vista vista-testo" },
    intestazione(null, "Qualcosa non è andato", errore.messaggio || "Non sono riuscito a leggere i dati."),
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "button", on: { click: () => ctx.azioni.ricarica() } }, icona("aggiorna"), "Riprova"),
      permessoTolto
        ? h("button", { class: "bottone bottone-secondario", type: "button", on: { click: () => ctx.azioni.esci("collega") } }, "Esci ed entra di nuovo")
        : null),
    h("p", { class: "piccolo" }, nota));
}
