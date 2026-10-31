// L'andamento nel tempo: allenamento (Fitness, Fatica, Forma, carico) e notti (HRV, battito, sonno).

import { h } from "../dom.js";
import { numero, segno, durata } from "../formato.js";
import { baseHrv, baseFc } from "../modello.js";
import { grafico } from "../grafici.js";
import { intestazione, bannerDemo } from "./comuni.js";

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

  // Il "normale" di ogni giorno, calcolato con le notti precedenti a quel giorno.
  const bandaHrv = giorni.map((_, k) => baseHrv(m.giorni, inizio + k));
  const bandaFc = giorni.map((_, k) => baseFc(m.giorni, inizio + k));

  const filtro = h("div", { class: "filtro", role: "group", "aria-label": "Periodo dei grafici" },
    INTERVALLI.map((it) => h("button", {
      type: "button",
      class: ["filtro-voce", it.giorni === quanti && "attivo"],
      "aria-pressed": it.giorni === quanti ? "true" : "false",
      on: { click: () => ctx.azioni.preferenza("intervallo", it.giorni) },
    }, it.nome)));

  return h("div", { class: "vista" },
    intestazione("Andamento", "Come stai cambiando",
      "I numeri giorno per giorno. Tocca un grafico per leggere i valori di un giorno, oppure apri «Vedi i numeri» sotto ogni grafico."),
    ctx.demo ? bannerDemo(ctx) : null,
    filtro,

    h("section", { class: "sezione" },
      h("h2", {}, "L'allenamento"),
      blocco("Quanto sei allenato",
        "La linea blu è la Fitness, la base che costruisci in settimane. Quella arancione è la Fatica degli ultimi giorni. Quando la Fatica sta sopra per un po', la Fitness sale.",
        grafico({
          descrizione: "Fitness e Fatica",
          etichette: date,
          serie: [
            { nome: "Fitness", classe: "s1", valori: giorni.map((g) => g.ctl) },
            { nome: "Fatica", classe: "s2", valori: giorni.map((g) => g.atl) },
          ],
          daZero: true,
          vuoto: "Qui compariranno Fitness e Fatica dopo i primi giri registrati.",
        })),
      blocco("Fresco o stanco",
        "La Forma in percentuale della tua Fitness. Si migliora nella fascia verde, si arriva agli eventi nella fascia azzurra. Nella gialla e nella rossa stai caricando più di quanto il corpo sia abituato.",
        grafico({
          descrizione: "Forma in percentuale della Fitness",
          etichette: date,
          // con una base minuscola la percentuale salta da un estremo all'altro e non vuol dire niente
          serie: [{ nome: "Forma", classe: "s1", valori: giorni.map((g) => (g.formaPct !== null && g.ctl >= 10 ? g.formaPct * 100 : null)), formato: (v) => `${segno(v)}%` }],
          zone: [
            { da: 20, a: null, nome: "Molto riposato", classe: "zona-riposo" },
            { da: 5, a: 20, nome: "Fresco", classe: "zona-fresco" },
            { da: -10, a: 5, nome: "In equilibrio", classe: "zona-neutra" },
            { da: -30, a: -10, nome: "Ti stai allenando", classe: "zona-allenamento" },
            { da: -50, a: -30, nome: "Molto carico", classe: "zona-attenzione" },
            { da: null, a: -50, nome: "Troppo carico", classe: "zona-rischio" },
          ],
          dominio: [-70, 40],
          valoriAsse: [-50, -30, -10, 5, 20],
          formatoAsse: (v) => `${segno(v)}%`,
          vuoto: "Qui compare la Forma quando la Fitness supera 10.",
        })),
      blocco("Il lavoro di ogni giorno",
        "I punti di ogni giorno. Un'ora di giro tranquillo vale circa 50 punti.",
        grafico({
          tipo: "colonne",
          descrizione: "Carico di ogni giorno in punti",
          etichette: date,
          serie: [{ nome: "Punti", classe: "s2", valori: giorni.map((g) => g.carico) }],
        }))),

    h("section", { class: "sezione" },
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
        "La fascia è il tuo solito, più o meno 3 battiti. Sopra la fascia il semaforo comincia a frenare.",
        grafico({
          descrizione: "Battito a riposo con il tuo solito",
          etichette: date,
          serie: [{ nome: "Battito", classe: "s1", valori: giorni.map((g) => g.fc), formato: (v) => `${numero(v)} battiti` }],
          banda: { nome: "Il tuo solito", basso: bandaFc.map((b) => (b.ok ? b.solito - 3 : null)), alto: bandaFc.map((b) => (b.ok ? b.solito + 3 : null)) },
          vuoto: "Il battito a riposo non arriva da nessun dispositivo.",
        })),
      blocco("Ore di sonno",
        "La riga segna le 6 ore e mezza. Sotto quella riga il recupero resta a metà.",
        grafico({
          tipo: "colonne",
          descrizione: "Ore di sonno per notte",
          etichette: date,
          serie: [{ nome: "Sonno", classe: "s1", valori: giorni.map((g) => (g.sonno ? g.sonno / 3600 : null)), formato: (v) => durata(v * 3600) }],
          riferimento: { valore: 6.5, etichetta: "6 ore e mezza" },
          formatoAsse: (v) => `${numero(v)}h`,
          vuoto: "Il sonno non arriva da nessun dispositivo.",
        }))));
}
