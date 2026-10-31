// Le pagine che si vedono anche senza essere entrati: benvenuto, collegamento, guida, privacy.

import { h, icona } from "../dom.js";
import { SPIEGAZIONI, GUIDA_SEMAFORO, DISPOSITIVI, DOMANDE_FREQUENTI, LIMITI } from "../testi.js";
import { intestazione, luceSemaforo } from "./comuni.js";

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
        h("p", { class: "piccolo" }, "Gratis, senza pubblicità e senza registrarti. I tuoi dati restano tra te e intervals.icu."))),
    h("section", { class: "tre-punti" },
      h("article", { class: "carta" },
        h("h2", {}, "Un semaforo ogni mattina"),
        h("p", {}, "Verde, giallo o rosso, con il perché in poche righe. Guarda come hai dormito, il cuore a riposo, quanto ti sei allenato e come ti senti.")),
      h("article", { class: "carta" },
        h("h2", {}, "I numeri spiegati semplice"),
        h("p", {}, "Fitness, Fatica, HRV. Ogni numero ha la sua spiegazione e ti dice a cosa è legato, così impari a leggerti da solo.")),
      h("article", { class: "carta" },
        h("h2", {}, "Quanto ti manca"),
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
  const scelto = ctx.preferenze.dispositivo || "garmin";
  const dispositivo = DISPOSITIVI.find((d) => d.id === scelto) || DISPOSITIVI[0];

  const stato = h("p", { class: "stato-salvataggio", role: "status", "aria-live": "polite" }, errore || "");
  const campo = h("input", {
    type: "password", id: "chiave", name: "chiave", autocomplete: "off", autocapitalize: "off",
    spellcheck: "false", inputmode: "text", required: true, placeholder: "Incolla qui la chiave",
    "aria-describedby": "chiave-aiuto",
  });
  const mostra = h("input", { type: "checkbox", id: "mostra-chiave", on: { change: (e) => { campo.type = e.target.checked ? "text" : "password"; } } });
  const ricorda = h("input", { type: "checkbox", id: "ricorda", checked: true });

  const modulo = h("form", { class: "carta accesso", novalidate: true },
    h("h2", {}, "3. Incolla la chiave ed entra"),
    h("div", { class: "campo" },
      h("label", { for: "chiave" }, "La tua chiave di intervals.icu"),
      campo,
      h("p", { class: "piccolo", id: "chiave-aiuto" }, "Resta su questo telefono o computer. Non arriva a chi ha fatto l'app né a nessun altro.")),
    h("div", { class: "spunte" },
      h("span", { class: "spunta" }, mostra, h("label", { for: "mostra-chiave" }, "Mostra la chiave")),
      h("span", { class: "spunta" }, ricorda, h("label", { for: "ricorda" }, "Ricordami su questo dispositivo"))),
    h("div", { class: "riga-bottoni" }, h("button", { class: "bottone", type: "submit" }, "Entra")),
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

  return h("div", { class: "vista" },
    intestazione("Collega i tuoi dati", "Tre passi, una volta sola",
      "Ci vogliono cinque minuti. Poi ogni mattina apri la pagina e trovi tutto pronto."),

    h("section", { class: "carta passo" },
      h("h2", {}, "1. Crea un account gratuito su intervals.icu"),
      h("p", {}, "intervals.icu è il servizio che raccoglie i dati dal tuo orologio e calcola Fitness e Fatica. Il piano gratuito basta."),
      h("p", {}, h("a", { href: "https://intervals.icu", target: "_blank", rel: "noopener" }, "Apri intervals.icu"), ". Se hai già un account, passa al punto 2.")),

    h("section", { class: "carta passo" },
      h("h2", {}, "2. Collega il tuo orologio o ciclocomputer"),
      h("p", {}, "Si fa su intervals.icu, non qui. Scegli cosa usi."),
      h("div", { class: "scelte scelte-dispositivi", role: "group", "aria-label": "Il tuo dispositivo" },
        DISPOSITIVI.map((d) => h("button", {
          type: "button",
          class: ["scelta-bottone", d.id === dispositivo.id && "attivo"],
          "aria-pressed": d.id === dispositivo.id ? "true" : "false",
          on: { click: () => ctx.azioni.preferenza("dispositivo", d.id) },
        }, d.nome))),
      h("p", { class: "istruzioni" }, dispositivo.passi),
      h("p", { class: "piccolo" }, "Se hai un ciclocomputer e un orologio, collegali tutti e due. Al primo collegamento intervals.icu scarica anche un po' di storico, così i numeri sono pronti prima.")),

    h("section", { class: "carta passo" },
      h("h2", {}, "Dove trovi la chiave"),
      h("ol", { class: "passi-semplici" },
        h("li", {}, "Su intervals.icu apri ", h("strong", {}, "Settings"), ", l'ingranaggio in alto."),
        h("li", {}, "Scorri fino in fondo alla pagina, alla sezione ", h("strong", {}, "Developer Settings"), "."),
        h("li", {}, "Accanto ad ", h("strong", {}, "API Key"), " premi il pulsante per vederla o crearla, poi copiala."),
        h("li", {}, "Torna qui e incollala nel riquadro qui sotto.")),
      h("p", { class: "piccolo" }, "La chiave è come una password che serve solo a leggere e scrivere i tuoi dati di intervals.icu. Se un giorno vuoi togliere l'accesso, su intervals.icu ne crei una nuova e questa smette di funzionare.")),

    modulo,
    h("p", { class: "centrato" },
      "Vuoi prima dare un'occhiata? ",
      h("button", { class: "collegamento", type: "button", on: { click: () => ctx.azioni.demo() } }, "Guarda i dati di esempio")));
}

export function vistaGuida() {
  const metriche = ["hrv", "fc", "sonno", "fitness", "fatica", "forma", "carico"].map((k) => SPIEGAZIONI[k]);
  return h("div", { class: "vista vista-testo" },
    intestazione("Guida", "Come si legge Come sto",
      "Tutto quello che c'è dietro il semaforo e i numeri, spiegato semplice."),

    h("section", { class: "sezione", id: "semaforo" },
      h("h2", {}, "Il semaforo, come nasce"),
      h("p", {}, "Ogni mattina l'app guarda sei cose e dà a ognuna un colore. Le cose senza dati non votano. Poi mette insieme i colori così."),
      h("ul", { class: "regole" },
        h("li", {}, h("span", { class: "pallino pallino-verde", "aria-hidden": "true" }), h("strong", {}, "Verde, via libera. "), "Tutto a posto."),
        h("li", {}, h("span", { class: "pallino pallino-giallo", "aria-hidden": "true" }), h("strong", {}, "Giallo, senza esagerare. "), "Una sola cosa in giallo."),
        h("li", {}, h("span", { class: "pallino pallino-giallo", "aria-hidden": "true" }), h("strong", {}, "Giallo, giornata tranquilla. "), "Due cose in giallo, oppure una in rosso."),
        h("li", {}, h("span", { class: "pallino pallino-rosso", "aria-hidden": "true" }), h("strong", {}, "Rosso, oggi recupera. "), "Due cose in rosso, oppure una rossa e una gialla.")),
      h("div", { class: "scorri" },
        h("table", { class: "tabella-regole" },
          h("thead", {}, h("tr", {},
            h("th", { scope: "col" }, "Cosa guarda"),
            h("th", { scope: "col" }, h("span", { class: "pallino pallino-verde", "aria-hidden": "true" }), "Verde"),
            h("th", { scope: "col" }, h("span", { class: "pallino pallino-giallo", "aria-hidden": "true" }), "Giallo"),
            h("th", { scope: "col" }, h("span", { class: "pallino pallino-rosso", "aria-hidden": "true" }), "Rosso"))),
          h("tbody", {}, GUIDA_SEMAFORO.map((r) => h("tr", {},
            h("th", { scope: "row" }, r.voce), h("td", {}, r.verde), h("td", {}, r.giallo), h("td", {}, r.rosso)))))),
      h("p", {}, "Il tuo «normale» e il tuo «solito» li calcola l'app dalle tue ultime notti. Per l'HRV servono almeno due settimane, per il battito una. Prima di allora quella voce non vota."),
      h("p", {}, "L'allenamento recente si guarda com'era ieri sera, prima di uscire, così un giro fatto stamattina non cambia il consiglio di stamattina.")),

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
        h("li", {}, "La chiave di intervals.icu resta salvata solo sul tuo dispositivo, e solo se scegli «Ricordami». Con Esci la cancelli."),
        h("li", {}, "Le risposte alle domande del mattino le scriviamo nel tuo account intervals.icu, nel giorno di oggi. Restano tue e le vedi anche là."),
        h("li", {}, "Le tue scelte nella pagina, come il periodo dei grafici o la tua prossima avventura, restano salvate solo nel tuo browser."),
        h("li", {}, "Niente pubblicità, niente statistiche di visita, niente cookie, niente servizi di terzi. La pagina parla solo con intervals.icu."))),
    h("section", { class: "sezione" },
      h("h2", {}, "Chi tratta cosa"),
      h("p", {}, "I dati dei tuoi allenamenti e delle tue notti stanno nel tuo account intervals.icu, che ha la sua informativa sulla privacy. La pagina è pubblicata su GitHub Pages, che come ogni sito tiene i registri tecnici delle visite."),
      h("p", {}, "Per togliere l'accesso a Come sto in qualsiasi momento, su intervals.icu crea una nuova chiave. Quella vecchia smette subito di funzionare.")),
    h("section", { class: "sezione" },
      h("h2", {}, "Non è un dispositivo medico"),
      h("p", {}, "Come sto dà consigli di allenamento basati su numeri, non fa diagnosi. Se hai dolori, febbre, o il battito a riposo resta alto per giorni, parlane con un medico.")),
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
      h("button", { class: "bottone", type: "button", on: { click: () => ctx.azioni.ricarica() } }, icona("aggiorna"), "Riprova"),
      h("button", { class: "bottone bottone-secondario", type: "button", on: { click: () => ctx.azioni.esci() } }, "Esci")));
}
