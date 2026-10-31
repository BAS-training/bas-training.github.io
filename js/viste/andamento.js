// L'andamento nel tempo: allenamento (Fitness, Fatica, Freschezza, carico) e notti (HRV, battito, sonno).

import { h } from "../dom.js?v=202610311949";
import { numero, segno, durata } from "../formato.js?v=202610311949";
import { baseHrv, baseFc } from "../modello.js?v=202610311949";
import { grafico } from "../grafici.js?v=202610311949";
import { intestazione, bannerDemo } from "./comuni.js?v=202610311949";

const INTERVALLI = [
  { giorni: 30, nome: "30 giorni" },
  { giorni: 90, nome: "3 mesi" },
  { giorni: 180, nome: "6 mesi" },
];

function blocco(titolo, testo, contenuto) {
  return h("section", { class: "carta blocco-grafico" },
    h("h3", {}, titolo),
    testo ? h("p", { class: "sezione-testo" }, testo) : null,
    contenuto);
}

export function vistaAndamento(ctx) {
  const m = ctx.modello;
  const quanti = ctx.preferenze.intervallo || 90;
  const inizio = m.giorni.length - quanti;
  const giorni = m.giorni.slice(inizio);
  const date = giorni.map((g) => g.d);
  // Fitness, Fatica e Freschezza si fermano a ieri sera, come il semaforo e le tessere di Oggi.
  const fineIeri = giorni.slice(0, -1);
  const dateIeri = date.slice(0, -1);

  // Il "normale" di ogni giorno, calcolato con le notti precedenti a quel giorno.
  const bandaHrv = giorni.map((_, k) => baseHrv(m.giorni, inizio + k));
  const bandaFc = giorni.map((_, k) => baseFc(m.giorni, inizio + k));

  // con una base minuscola la percentuale salta da un estremo all'altro e non vuol dire niente
  const freschezza = fineIeri.map((g) => (g.formaPct !== null && g.ctl >= 10 ? g.formaPct * 100 : null));
  const valoriFreschezza = freschezza.filter((v) => v !== null);
  // la scala mostra sempre tutte le fasce, e si allarga quando la Freschezza va oltre
  const dominioFreschezza = [
    Math.min(-70, ...valoriFreschezza.map((v) => Math.floor(v / 10) * 10 - 5)),
    Math.max(40, ...valoriFreschezza.map((v) => Math.ceil(v / 10) * 10 + 5)),
  ];

  const filtro = h("div", { class: "filtro", role: "group", "aria-label": "Periodo dei grafici" },
    INTERVALLI.map((it) => h("button", {
      type: "button",
      id: `periodo-${it.giorni}`,
      class: ["filtro-voce", it.giorni === quanti && "attivo"],
      "aria-pressed": it.giorni === quanti ? "true" : "false",
      on: { click: () => ctx.azioni.preferenza("intervallo", it.giorni) },
    }, it.nome)));

  const notti = m.notteMaiArrivata
    ? h("section", { class: "sezione" },
      h("h2", {}, "Le notti"),
      h("p", { class: "vuoto" }, "HRV, battito a riposo e sonno non arrivano da nessun dispositivo. Se colleghi a intervals.icu un orologio o un anello che li misura, qui vedi anche le tue notti."))
    : h("section", { class: "sezione" },
      h("h2", {}, "Le notti"),
      blocco("HRV",
        "La fascia azzurra è il tuo normale, ricalcolato ogni giorno con le notti precedenti. Una notte sotto capita. Più notti di fila sotto vogliono dire che il recupero non è finito.",
        grafico({
          descrizione: "HRV della notte con il tuo normale",
          etichette: date,
          serie: [{ nome: "HRV", classe: "s1", valori: giorni.map((g) => g.hrv), formato: (v) => `${numero(v)} ms` }],
          banda: { nome: "Il tuo normale", basso: bandaHrv.map((b) => (b.ok ? b.basso : null)), alto: bandaHrv.map((b) => (b.ok ? b.alto : null)) },
          vuoto: "Il tuo dispositivo non manda l'HRV a intervals.icu.",
        })),
      blocco("Battito a riposo",
        "La fascia è il tuo normale, più o meno 3 battiti. Sopra la fascia il semaforo comincia a frenare.",
        grafico({
          descrizione: "Battito a riposo con il tuo normale",
          etichette: date,
          serie: [{ nome: "Battito", classe: "s1", valori: giorni.map((g) => g.fc), formato: (v) => `${numero(v)} battiti` }],
          banda: { nome: "Il tuo normale", basso: bandaFc.map((b) => (b.ok ? b.solito - 3 : null)), alto: bandaFc.map((b) => (b.ok ? b.solito + 3 : null)) },
          vuoto: "Il battito a riposo non arriva dal tuo dispositivo.",
        })),
      blocco("Ore di sonno",
        "La riga segna le 6 ore. Sotto quella riga la notte è corta e la fatica si sente di più.",
        grafico({
          tipo: "colonne",
          descrizione: "Ore di sonno per notte",
          etichette: date,
          serie: [{ nome: "Sonno", classe: "s1", valori: giorni.map((g) => (g.sonno ? g.sonno / 3600 : null)), formato: (v) => durata(v * 3600) }],
          riferimento: { valore: 6, etichetta: "6 ore" },
          formatoAsse: (v) => (v ? durata(v * 3600) : "0"),
          vuoto: "Il sonno non arriva dal tuo dispositivo.",
        })));

  return h("div", { class: "vista" },
    intestazione("Andamento", "Come stai cambiando",
      "I numeri giorno per giorno. Tocca un grafico per leggere i valori di un giorno, oppure apri «Vedi i numeri» sotto ogni grafico."),
    ctx.demo ? bannerDemo(ctx) : null,
    filtro,

    h("section", { class: "sezione" },
      h("h2", {}, "L'allenamento"),
      h("p", { class: "piccolo" }, "Fitness, Fatica e Freschezza arrivano fino a ieri sera, come il semaforo."),
      blocco("Quanto ti stai allenando",
        "La linea blu è la Fitness, la media del lavoro delle ultime sei settimane. Quella arancione è la Fatica degli ultimi giorni. Quando la Fatica sta sopra per un po', la Fitness sale.",
        grafico({
          descrizione: "Fitness e Fatica",
          etichette: dateIeri,
          serie: [
            { nome: "Fitness", classe: "s1", valori: fineIeri.map((g) => g.ctl) },
            { nome: "Fatica", classe: "s2", valori: fineIeri.map((g) => g.atl) },
          ],
          daZero: true,
          vuoto: "Qui compariranno Fitness e Fatica dopo i primi giri registrati.",
        })),
      blocco("Fresco o stanco",
        "La Freschezza in percentuale della tua Fitness. Si migliora nella fascia «Ti stai allenando», si arriva agli eventi nella fascia «Fresco». Nella fascia «Molto carico» e in «Troppo carico» stai caricando più di quanto il corpo sia abituato.",
        grafico({
          descrizione: "Freschezza in percentuale della Fitness",
          etichette: dateIeri,
          serie: [{ nome: "Freschezza", classe: "s1", valori: freschezza, formato: (v) => `${segno(v)}%` }],
          zone: [
            { da: 20, a: null, nome: "Molto riposato", classe: "zona-riposo" },
            { da: 5, a: 20, nome: "Fresco", classe: "zona-fresco" },
            { da: -10, a: 5, nome: "In equilibrio", classe: "zona-neutra" },
            { da: -30, a: -10, nome: "Ti stai allenando", classe: "zona-allenamento" },
            { da: -50, a: -30, nome: "Molto carico", classe: "zona-attenzione" },
            { da: null, a: -50, nome: "Troppo carico", classe: "zona-rischio" },
          ],
          dominio: dominioFreschezza,
          // se la scala si allarga il grafico cresce, così le fasce restano leggibili
          altezza: Math.min(360, Math.round(200 * (dominioFreschezza[1] - dominioFreschezza[0]) / 110)),
          valoriAsse: [-50, -30, -10, 5, 20],
          formatoAsse: (v) => `${segno(v)}%`,
          vuoto: "Qui compare la Freschezza quando la Fitness supera 10.",
        })),
      blocco("Il lavoro di ogni giorno",
        "I punti di ogni giorno, oggi compreso. Un'ora di giro tranquillo vale circa 40-50 punti.",
        grafico({
          tipo: "colonne",
          descrizione: "Carico di ogni giorno in punti",
          etichette: date,
          serie: [{ nome: "Punti", classe: "s2", valori: giorni.map((g) => g.carico) }],
          vuoto: "Nessun allenamento registrato in questo periodo.",
        }))),
    notti);
}
