// Le pagine che si vedono anche senza essere entrati: benvenuto, collegamento, guida, privacy.

import { h, icona } from "../dom.js?v=202610311949";
import { SPIEGAZIONI, GUIDA_SEMAFORO, DISPOSITIVI, DOMANDE_FREQUENTI, LIMITI } from "../testi.js?v=202610311949";
import { intestazione, luceSemaforo } from "./comuni.js?v=202610311949";

const IMPOSTAZIONI = "https://intervals.icu/settings";

export function vistaBenvenuto(ctx) {
  return h("div", { class: "vista vista-benvenuto" },
    h("section", { class: "eroe" },
      h("div", { class: "eroe-luce" }, luceSemaforo("verde")),
      h("div", { class: "eroe-testo" },
        h("h1", {}, "Come sto"),
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
        h("li", {}, h("strong", {}, "Come sto "), "legge quei dati dal tuo telefono, con una chiave che ti dà intervals.icu."),
        h("li", {}, h("strong", {}, "Ogni mattina "), "apri la pagina, guardi il semaforo e rispondi a tre domande. Dieci secondi."))));
}

export function vistaCollega(ctx) {
  const errore = ctx.erroreAccesso;
  const scelto = DISPOSITIVI.find((d) => d.id === ctx.preferenze.dispositivo) || DISPOSITIVI[0];

  const stato = h("p", { class: "stato-salvataggio", role: "status", "aria-live": "polite" });
  const campo = h("input", {
    type: "password", id: "chiave", name: "chiave", autocomplete: "off", autocapitalize: "off",
    spellcheck: "false", inputmode: "text", required: true, placeholder: "Incolla qui la chiave",
    "aria-describedby": "chiave-aiuto",
  });
  const mostra = h("input", { type: "checkbox", id: "mostra-chiave", on: { change: (e) => { campo.type = e.target.checked ? "text" : "password"; } } });
  const ricorda = h("input", { type: "checkbox", id: "ricorda", checked: true });

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
      try { ctx.preferenze.dispositivo = d.id; } catch { /* solo una comodità */ }
    });
  }

  const modulo = h("form", { class: "carta passo accesso", id: "passo-chiave", novalidate: true },
    h("h2", {}, "3. Copia la chiave e incollala qui"),
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
    h("div", { class: "riga-bottoni" }, h("button", { class: "bottone", type: "submit", id: "entra" }, "Entra")),
    stato);

  modulo.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const chiave = campo.value.trim();
    if (!chiave) { stato.textContent = "Incolla prima la chiave."; campo.focus(); return; }
    const bottone = modulo.querySelector("button[type=submit]");
    bottone.disabled = true;
    stato.textContent = "Controllo la chiave…";
    const esito = await ctx.azioni.entra(chiave, ricorda.checked);
    if (esito) { bottone.disabled = false; stato.textContent = esito; }
  });

  const vaiAllaChiave = () => {
    modulo.scrollIntoView({ block: "start" });
    campo.focus({ preventScroll: true });
  };

  return h("div", { class: "vista" },
    intestazione("Collega i tuoi dati", "Tre passi, una volta sola",
      "Ci vogliono cinque minuti. Il semaforo parte dalla prima notte e dal primo giro registrati, e diventa completo in due settimane."),

    errore ? h("div", { class: "banner banner-errore", role: "alert" },
      h("p", {}, h("strong", {}, errore), " Copiala di nuovo e incollala qui sotto, al punto 3."),
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone", type: "button", on: { click: vaiAllaChiave } }, "Vai al punto 3"))) : null,

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

    modulo,

    h("section", { class: "carta passo" },
      h("h2", {}, "Per ritrovarla ogni mattina"),
      h("p", {}, "Mettila nella schermata Home del telefono, così si apre come un'app."),
      h("ul", { class: "elenco" },
        h("li", {}, h("strong", {}, "iPhone. "), "In Safari tocca Condividi e poi Aggiungi alla schermata Home. Apri l'icona e incolla lì la chiave, perché l'icona non vede quella salvata in Safari."),
        h("li", {}, h("strong", {}, "Android. "), "Nel menu di Chrome, i tre puntini, tocca Aggiungi a schermata Home."))),

    h("p", { class: "centrato" },
      "Vuoi prima dare un'occhiata? ",
      h("button", { class: "collegamento", type: "button", on: { click: () => ctx.azioni.demo() } }, "Guarda i dati di esempio")));
}

export function vistaGuida() {
  const metriche = ["hrv", "fc", "sonno", "fitness", "fatica", "freschezza", "carico"].map((k) => SPIEGAZIONI[k]);
  return h("div", { class: "vista vista-testo" },
    intestazione("Guida", "Come si legge Come sto",
      "Tutto quello che c'è dietro il semaforo e i numeri, spiegato semplice."),

    h("section", { class: "sezione" },
      h("h2", {}, "Il semaforo, come nasce"),
      h("p", {}, "Ogni mattina l'app guarda sei cose e dà a ognuna un colore. Le cose senza dati non votano. Poi mette insieme i colori così."),
      h("ul", { class: "regole" },
        h("li", {}, h("span", { class: "pallino pallino-verde", "aria-hidden": "true" }), h("strong", {}, "Verde, via libera. "), "Tutto a posto."),
        h("li", {}, h("span", { class: "pallino pallino-giallo", "aria-hidden": "true" }), h("strong", {}, "Giallo, senza esagerare. "), "Una sola cosa in giallo."),
        h("li", {}, h("span", { class: "pallino pallino-giallo", "aria-hidden": "true" }), h("strong", {}, "Giallo, giornata tranquilla. "), "Due cose in giallo, oppure una in rosso."),
        h("li", {}, h("span", { class: "pallino pallino-rosso", "aria-hidden": "true" }), h("strong", {}, "Rosso, oggi recupera. "), "Due cose in rosso, oppure una rossa e una gialla. E sempre quando segni un dolore, un infortunio, o dici di essere a pezzi.")),
      h("div", { class: "carte-regole" }, GUIDA_SEMAFORO.map((r) => h("article", { class: "carta regola" },
        h("h3", {}, r.voce),
        h("p", {}, h("span", { class: "pallino pallino-verde", "aria-hidden": "true" }), h("strong", {}, "Verde. "), r.verde),
        h("p", {}, h("span", { class: "pallino pallino-giallo", "aria-hidden": "true" }), h("strong", {}, "Giallo. "), r.giallo),
        h("p", {}, h("span", { class: "pallino pallino-rosso", "aria-hidden": "true" }), h("strong", {}, "Rosso. "), r.rosso)))),
      h("p", {}, "Il tuo «normale» lo calcola l'app dalle tue ultime notti. Per l'HRV servono almeno due settimane, per il battito una. Prima di allora quella voce non vota."),
      h("p", {}, "Il carico recente si guarda com'era ieri sera, prima di uscire, così un giro fatto stamattina non cambia il consiglio di stamattina."),
      h("p", {}, "Nessun numero sa dire con certezza se il corpo ha recuperato. Il semaforo mette insieme più indizi, ed è più affidabile quando guardi la tendenza di qualche giorno.")),

    h("section", { class: "sezione" },
      h("h2", {}, "I numeri, uno per uno"),
      metriche.map((t) => h("article", { class: "carta metrica" },
        h("h3", {}, t.nome, h("span", { class: "metrica-sotto" }, t.sottotitolo)),
        h("p", {}, t.cosa),
        h("p", {}, h("strong", {}, "Come leggerlo. "), t.come),
        h("p", {}, h("strong", {}, "A cosa è legato. "), t.legami)))),

    h("section", { class: "sezione" },
      h("h2", {}, "Quando non fidarti dei numeri"),
      h("ul", { class: "elenco" }, LIMITI.map((l) => h("li", {}, l)))),

    h("section", { class: "sezione" },
      h("h2", {}, "Domande frequenti"),
      DOMANDE_FREQUENTI.map((f) => h("details", { class: "faq" }, h("summary", {}, f.d), h("p", {}, f.r)))),

    h("p", {}, h("a", { href: "#privacy" }, "Come trattiamo i tuoi dati")));
}

export function vistaPrivacy() {
  return h("div", { class: "vista vista-testo" },
    intestazione("Privacy", "I tuoi dati restano tuoi", null),
    h("section", { class: "sezione" },
      h("h2", {}, "In breve"),
      h("ul", { class: "elenco" },
        h("li", {}, "Come sto è una pagina web e basta. Non ha un server, non ha un database, non raccoglie niente."),
        h("li", {}, "I tuoi dati vanno direttamente da intervals.icu al tuo telefono o computer. Nessun altro li vede, nemmeno chi ha fatto l'app."),
        h("li", {}, "La chiave di intervals.icu resta salvata solo sul tuo dispositivo. Se togli la spunta «Ricordami», si cancella quando chiudi la pagina. Con Esci la cancelli subito."),
        h("li", {}, "Le risposte alle domande del mattino le scriviamo nel tuo account intervals.icu, nel giorno di oggi. Restano tue e le vedi anche là."),
        h("li", {}, "Le tue scelte nella pagina, come il periodo dei grafici o la tua prossima avventura, restano salvate solo nel tuo browser."),
        h("li", {}, "Niente pubblicità, niente statistiche di visita, niente cookie, niente servizi di terzi. La pagina parla solo con intervals.icu."))),
    h("section", { class: "sezione" },
      h("h2", {}, "Chi tratta cosa"),
      h("p", {}, "I dati dei tuoi allenamenti e delle tue notti stanno nel tuo account intervals.icu, che ha la sua informativa sulla privacy. La pagina è pubblicata su GitHub Pages, che come ogni sito tiene i registri tecnici delle visite."),
      h("p", {}, "Per togliere l'accesso a Come sto in qualsiasi momento, su intervals.icu crea una nuova chiave. Quella vecchia smette subito di funzionare.")),
    h("section", { class: "sezione" },
      h("h2", {}, "Non è un dispositivo medico"),
      h("p", {}, "Come sto dà consigli di allenamento basati su numeri, non fa diagnosi. Se hai febbre, dolori, o il battito a riposo resta alto per giorni, parlane con un medico.")),
    h("p", {}, h("a", { href: "#guida" }, "Torna alla guida")));
}

export function vistaCaricamento() {
  return h("div", { class: "vista vista-caricamento", role: "status", "aria-live": "polite" },
    h("div", { class: "rotella", "aria-hidden": "true" }),
    h("p", {}, "Leggo i tuoi dati da intervals.icu…"));
}

export function vistaErrore(ctx, errore) {
  return h("div", { class: "vista vista-testo" },
    intestazione(null, "Qualcosa non è andato", errore.messaggio || "Non sono riuscito a leggere i dati."),
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "button", on: { click: () => ctx.azioni.ricarica() } }, icona("aggiorna"), "Riprova")),
    h("p", { class: "piccolo" }, "La tua chiave resta salvata. Se il problema è solo la connessione, basta riprovare tra poco."));
}
