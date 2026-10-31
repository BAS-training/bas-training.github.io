// Le uscite: le ore di ogni settimana e l'elenco degli allenamenti.

import { h } from "../dom.js?v=202610312043";
import { numero, durata, dataBreve, giornoMese } from "../formato.js?v=202610312043";
import { settimane, nomeTipo, aggiungiGiorni } from "../modello.js?v=202610312043";
import { grafico } from "../grafici.js?v=202610312043";
import { intestazione, bannerDemo } from "./comuni.js?v=202610312043";

export function vistaUscite(ctx) {
  const m = ctx.modello;
  const sett = settimane(m.uscite, m.oggi, 12);
  const limite = aggiungiGiorni(m.oggi, -59);
  const ultime = m.uscite.filter((u) => u.d >= limite);
  // Le attività arrivate solo da Strava non hanno dettagli: invece di righe di lineette, una riga sola.
  const senzaDettagli = (u) => u.sorgente === "STRAVA" && !u.nome && !u.secondi && u.carico === null;
  const recenti = ultime.filter((u) => !senzaDettagli(u));
  const daStrava = ultime.length - recenti.length;
  const nomeDiverso = (u) => u.nome && u.nome.toLowerCase() !== nomeTipo(u.tipo, u.sorgente).toLowerCase();

  const tabella = recenti.length
    ? h("div", { class: "scorri" },
      h("table", { class: "tabella-uscite" },
        h("thead", {}, h("tr", {},
          h("th", { scope: "col" }, "Giorno"),
          h("th", { scope: "col" }, "Cosa"),
          h("th", { scope: "col", class: "num" }, "Tempo"),
          h("th", { scope: "col", class: "num" }, "Km"),
          h("th", { scope: "col", class: "num solo-largo" }, "Salita"),
          h("th", { scope: "col", class: "num" }, "Punti"),
          h("th", { scope: "col", class: "num solo-largo" }, "Battito"))),
        h("tbody", {}, recenti.map((u) => h("tr", {},
          h("td", { class: "giorno" }, dataBreve(u.d)),
          h("td", {}, h("span", { class: "tipo" }, nomeTipo(u.tipo, u.sorgente)), nomeDiverso(u) ? h("span", { class: "nome-uscita" }, u.nome) : null),
          h("td", { class: "num" }, u.secondi ? durata(u.secondi) : "—"),
          h("td", { class: "num" }, u.metri ? numero(u.metri / 1000, u.metri < 10000 ? 1 : 0) : "—"),
          h("td", { class: "num solo-largo" }, u.dislivello ? `${numero(u.dislivello)} m` : "—"),
          h("td", { class: "num" }, u.carico !== null ? numero(u.carico) : "—"),
          h("td", { class: "num solo-largo" }, u.fcMedia ? numero(u.fcMedia) : "—"))))))
    : h("p", { class: "vuoto" }, "Negli ultimi due mesi non ci sono uscite. Appena registri un giro compare qui.");

  return h("div", { class: "vista" },
    intestazione("Uscite", "Quanto pedali",
      "Le ore di ogni settimana e tutti gli allenamenti degli ultimi due mesi, con i punti di carico che intervals.icu dà a ciascuno."),
    ctx.demo ? bannerDemo(ctx) : null,
    h("section", { class: "carta blocco-grafico" },
      h("h2", {}, "Ore di allenamento per settimana"),
      h("p", { class: "sezione-testo" }, "Ogni colonna è una settimana, da lunedì a domenica. L'ultima è quella in corso."),
      grafico({
        tipo: "colonne",
        date: false,
        descrizione: "Ore di allenamento per settimana",
        etichette: sett.map((x) => `dal ${giornoMese(x.inizio)}`),
        serie: [{ nome: "Ore", classe: "s1", valori: sett.map((x) => x.secondi / 3600), formato: (v) => durata(v * 3600) }],
        formatoAsse: (v) => (v ? durata(v * 3600) : "0"),
        vuoto: "Nessun allenamento con la durata registrata nelle ultime 12 settimane.",
      })),
    h("section", { class: "sezione" },
      h("h2", {}, "Gli ultimi due mesi"),
      tabella,
      daStrava
        ? h("p", { class: "piccolo" }, `In più ${daStrava === 1 ? "c'è un'attività arrivata" : `ci sono ${daStrava} attività arrivate`} solo da Strava, senza dettagli. Sono le regole di Strava per le app collegate, non un errore. I loro punti contano lo stesso in Fitness e Fatica.`)
        : null));
}
