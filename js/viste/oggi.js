// La pagina principale: il semaforo, le domande del mattino e i sei numeri del giorno.

import { h, icona } from "../dom.js?v=202610312043";
import { numero, segno, durata, dataLunga } from "../formato.js?v=202610312043";
import { valuta, zonaFreschezza, ESITO_VOCE } from "../semaforo.js?v=202610312043";
import { nomeTipo } from "../modello.js?v=202610312043";
import { SPIEGAZIONI, DOMANDE_MATTINO } from "../testi.js?v=202610312043";
import { sparkline } from "../grafici.js?v=202610312043";
import { pillola, spiegazione, bannerDemo, luceSemaforo } from "./comuni.js?v=202610312043";

function saluto(nome) {
  const ora = new Date().getHours();
  const parola = ora < 12 ? "Buongiorno" : ora < 18 ? "Buon pomeriggio" : "Buonasera";
  return nome ? `${parola}, ${nome}` : parola;
}

// Il semaforo a punti dà a ogni voce un pallino verde, giallo o grigio. Il grigio usa lo stile neutro.
const COLORE_PALLINO = { verde: "verde", giallo: "giallo", grigio: "neutro" };
const colorePallino = (v) => COLORE_PALLINO[v.pallino] || "neutro";

function cartaSemaforo(e, appenaSalvato) {
  // La pagina nuova con il pannello «Sto male» e le domande arriva dopo. Qui le frasi del semaforo
  // si mostrano tutte, una volta sola, e l'avviso della notte resta quello sotto l'intestazione.
  const note = [e.nota, ...e.medico.map((x) => x.testo), ...e.messaggi.filter((x) => x.chiave !== "notte").map((x) => x.testo)]
    .filter((t, k, tutte) => t && t !== e.consiglio && tutte.indexOf(t) === k);
  return h("section", { class: ["semaforo", `semaforo-${e.colore}`], "aria-labelledby": "semaforo-titolo" },
    appenaSalvato ? h("p", { class: "salvato", role: "status" }, "Salvato. Il semaforo è aggiornato con le tue risposte.") : null,
    h("div", { class: "semaforo-testa" },
      luceSemaforo(e.colore),
      h("div", { class: "semaforo-testo" },
        h("p", { class: "occhiello" }, "Il semaforo di oggi"),
        h("h2", { id: "semaforo-titolo" }, e.titolo),
        h("p", { class: "semaforo-consiglio" }, [e.consiglio, ...e.aggiunte].join(" ")),
        e.perche ? h("p", { class: "piccolo" }, e.perche) : null,
        e.fiducia && e.fiducia.accanto ? h("p", { class: "piccolo" }, e.fiducia.testo) : null)),
    note.map((t) => h("p", { class: "semaforo-nota" }, t)),
    h("div", { class: "semaforo-voci" },
      h("h3", {}, "Perché"),
      h("ul", { class: "voci" }, e.voci.map((v) => h("li", { class: ["voce", `voce-${colorePallino(v)}`] },
        h("span", { class: "voce-pallino", "aria-hidden": "true" }),
        h("span", { class: "voce-nome" }, v.nome, h("span", { class: "voce-esito" }, ESITO_VOCE[colorePallino(v)])),
        h("span", { class: "voce-testo" }, v.testo))))),
    h("p", { class: "semaforo-piede" }, h("a", { href: "#guida" }, "Come nasce il semaforo")));
}

function avvisoNotte(ctx) {
  return h("aside", { class: "banner" },
    h("p", {}, h("strong", {}, "La notte non è ancora arrivata. "),
      "Apri l'app del tuo orologio per sincronizzarlo, poi premi Aggiorna. Intanto il semaforo usa quello che c'è."),
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone bottone-secondario", type: "button", on: { click: () => ctx.azioni.ricarica() } },
        icona("aggiorna"), "Aggiorna")));
}

// Le tre domande del mattino. Le risposte vanno su intervals.icu, nel giorno di oggi.
function domandeMattino(m, ctx) {
  const g = m.giorni[m.giorni.length - 1];
  const risposte = { fatica: g.fatica, dolori: g.dolori, infortunio: g.infortunio };
  const giaFatte = DOMANDE_MATTINO.every((d) => risposte[d.campo]);

  if (giaFatte && !ctx.preferenze.modificaDomande) {
    return h("section", { class: "carta domande domande-fatte" },
      h("h2", {}, "Le tue risposte di stamattina"),
      h("ul", { class: "risposte" }, DOMANDE_MATTINO.map((d) => h("li", {},
        h("span", { class: "risposte-domanda" }, d.testo),
        h("strong", {}, d.opzioni[risposte[d.campo] - 1] || "—")))),
      h("button", { class: "bottone bottone-secondario", type: "button", id: "cambia-risposte",
        on: { click: () => ctx.azioni.preferenza("modificaDomande", true) } }, "Cambia le risposte"));
  }

  const stato = h("p", { class: "stato-salvataggio", role: "status", "aria-live": "polite" });
  const modulo = h("form", { class: "carta domande", novalidate: true },
    h("h2", {}, "Come ti senti stamattina?"),
    h("p", { class: "sezione-testo" }, "Tre risposte, dieci secondi. Contano nel semaforo, perché il tuo corpo lo conosci anche tu."),
    DOMANDE_MATTINO.map((d) => h("fieldset", { class: "domanda" },
      h("legend", {}, d.testo),
      h("div", { class: "scelte" }, d.opzioni.map((testo, k) => {
        const id = `domanda-${d.nome}-${k + 1}`;
        return h("span", { class: "scelta" },
          h("input", { type: "radio", id, name: d.nome, value: k + 1, checked: risposte[d.campo] === k + 1 }),
          h("label", { for: id }, testo));
      })))),
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "submit", id: "salva-risposte" }, "Salva le risposte"),
      ctx.demo ? h("span", { class: "piccolo" }, "Con i dati di esempio le risposte restano solo in questa pagina.") : null),
    stato);

  modulo.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dati = {};
    for (const d of DOMANDE_MATTINO) {
      const scelto = modulo.querySelector(`input[name="${d.nome}"]:checked`);
      if (scelto) dati[d.campo] = Number(scelto.value);
    }
    if (!Object.keys(dati).length) {
      stato.textContent = "Scegli almeno una risposta.";
      return;
    }
    const bottone = modulo.querySelector("button[type=submit]");
    bottone.disabled = true;
    stato.textContent = "Salvo…";
    try {
      await ctx.azioni.salvaDomande(dati);
    } catch (errore) {
      bottone.disabled = false;
      stato.textContent = errore && errore.messaggio ? errore.messaggio : "Non sono riuscito a salvare. Riprova tra poco.";
    }
  });
  return modulo;
}

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
  const g = m.giorni;
  const oggi = g[g.length - 1];
  const ultimi = (n, campo, fn = (v) => v) => g.slice(-n).map((x) => (x[campo] ? fn(x[campo]) : null));
  const coloreVoce = (chiave) => {
    const v = esito.voci.find((x) => x.chiave === chiave);
    return v ? colorePallino(v) : null;
  };
  const bh = m.base.hrv;
  const bf = m.base.fc;
  const zona = zonaFreschezza(m.mattino.formaPct);
  const differenzaFitness = m.mattino.ctl !== null && m.fitness28 !== null ? m.mattino.ctl - m.fitness28 : null;
  const notteMai = m.notteMaiArrivata;

  const tessere = [];
  if (!notteMai) {
    tessere.push(
      tessera({
        chiave: "hrv", nome: "HRV della notte", valore: numero(oggi.hrv), unita: oggi.hrv ? "ms" : null,
        sotto: bh.ok ? `Il tuo normale ${numero(bh.basso)}–${numero(bh.alto)}`
          : m.hrvMisurato ? `Sto imparando il tuo normale, ${bh.n} notti su 14` : "Non arriva dal tuo dispositivo",
        colore: coloreVoce("hrv"), serie: ultimi(21, "hrv"),
      }),
      tessera({
        chiave: "fc", nome: "Battito a riposo", valore: numero(oggi.fc), unita: oggi.fc ? "battiti" : null,
        sotto: bf.ok ? `Il tuo normale ${numero(bf.solito)}` : `Sto imparando il tuo normale, ${bf.n} notti su 7`,
        colore: coloreVoce("fc"), serie: ultimi(21, "fc"),
      }),
      tessera({
        chiave: "sonno", nome: "Sonno", valore: oggi.sonno ? durata(oggi.sonno) : "—",
        sotto: [oggi.punteggioSonno ? `Punteggio ${numero(oggi.punteggioSonno)}` : null,
          m.sonnoSettimana ? `media della settimana ${durata(m.sonnoSettimana)}` : null].filter(Boolean).join(", "),
        colore: coloreVoce("sonno"), serie: ultimi(21, "sonno", (v) => v / 3600),
      }));
  }
  tessere.push(
    tessera({
      chiave: "freschezza", nome: "Freschezza",
      valore: m.mattino.formaPct !== null ? `${segno(m.mattino.formaPct * 100)}%` : "—",
      sotto: zona ? `${zona.nome}. Fitness ${numero(m.mattino.ctl)}, Fatica ${numero(m.mattino.atl)}` : "Servono un po' di giri registrati",
      serie: g.slice(-29, -1).map((x) => (x.formaPct !== null && x.ctl >= 10 ? x.formaPct * 100 : null)),
    }),
    tessera({
      chiave: "fitness", nome: "Fitness", valore: numero(m.mattino.ctl),
      sotto: differenzaFitness !== null ? `${segno(differenzaFitness)} nelle ultime 4 settimane` : null,
      serie: g.slice(-91, -1).map((x) => x.ctl),
    }),
    tessera({
      chiave: "carico", nome: "Carico recente",
      valore: m.mattino.rapporto !== null ? numero(m.mattino.rapporto, 1) : "—",
      unita: m.mattino.rapporto !== null ? "volte il solito" : null,
      sotto: m.mattino.rapporto === null ? "Servono un po' di giri registrati" : "Fino a 1,3 volte va bene",
      colore: coloreVoce("carico"),
      serie: g.slice(-29, -1).map((x) => (x.ctl > 0 && x.atl !== null ? x.atl / x.ctl : null)), classeSerie: "s2",
    }));

  return h("section", { class: "sezione" },
    h("h2", {}, "I numeri del giorno"),
    h("p", { class: "sezione-testo" }, notteMai
      ? "Vengono dagli allenamenti e dicono quanto hai caricato. Apri «Cosa vuol dire» per capire ogni numero."
      : "I primi tre vengono dalla notte e dicono come hai recuperato. Gli altri tre vengono dagli allenamenti e dicono quanto hai caricato. Apri «Cosa vuol dire» per capire ogni numero."),
    h("div", { class: "griglia-tessere" }, tessere));
}

function ultimaUscita(m) {
  const u = m.uscite.find((x) => x.nome || x.secondi || x.carico !== null);
  if (!u) return null;
  const tipo = nomeTipo(u.tipo, u.sorgente);
  const pezzi = [
    u.secondi ? durata(u.secondi) : null,
    u.metri ? `${numero(u.metri / 1000, u.metri < 10000 ? 1 : 0)} km` : null,
    u.dislivello ? `${numero(u.dislivello)} m di salita` : null,
    u.carico !== null ? `${numero(u.carico)} punti` : null,
  ].filter(Boolean);
  return h("section", { class: "carta ultima" },
    h("p", { class: "occhiello" }, "L'ultima uscita"),
    h("h2", {}, u.nome || tipo),
    h("p", { class: "ultima-quando" }, u.nome && u.nome.toLowerCase() !== tipo.toLowerCase() ? `${tipo}, ${dataLunga(u.d)}` : dataLunga(u.d)),
    pezzi.length ? h("p", { class: "ultima-numeri" }, pezzi.join(" · ")) : null,
    h("a", { href: "#uscite" }, "Tutte le uscite"));
}

export function vistaOggi(ctx) {
  const m = ctx.modello;
  const esito = valuta(m);
  return h("div", { class: "vista" },
    h("header", { class: "intestazione" },
      h("p", { class: "occhiello" }, dataLunga(m.oggi)),
      h("h1", {}, saluto(m.atleta.nome))),
    ctx.demo ? bannerDemo(ctx) : null,
    !m.notteArrivata && !m.notteMaiArrivata && !ctx.demo ? avvisoNotte(ctx) : null,
    cartaSemaforo(esito, ctx.appenaSalvato),
    domandeMattino(m, ctx),
    numeriDelGiorno(m, esito),
    ultimaUscita(m));
}
