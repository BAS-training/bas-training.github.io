// L'andamento nel tempo, una parte della pagina Numeri (7.2 e 7.11). Allenamento (Fitness, Fatica,
// Freschezza, carico, la Fitness di Come sto accanto a quella di intervals.icu) e notti (HRV, battito,
// sonno). I testi stanno in js/testi-numeri.js.

import { h } from "../dom.js?v=202611021705";
import { numero, segno, durata } from "../formato.js?v=202611021705";
import { baseHrv, baseFc } from "../modello.js?v=202611021705";
import { fasciaBattito } from "../semaforo.js?v=202611021705";
import { grafico } from "../grafici.js?v=202611021705";
import { ZONE_FRESCHEZZA } from "../testi.js?v=202611021705";
import { NUMERI_ANDAMENTO } from "../testi-numeri.js?v=202611021705";

const A = NUMERI_ANDAMENTO;
const CLASSI_ZONE = ["zona-riposo", "zona-fresco", "zona-neutra", "zona-allenamento", "zona-attenzione", "zona-rischio"];

function blocco(titolo, testo, contenuto) {
  return h("section", { class: "carta blocco-grafico" },
    h("h4", {}, titolo),
    testo ? h("p", { class: "sezione-testo" }, testo) : null,
    contenuto);
}

// Le fasce della Freschezza, le stesse della tessera (ZONE_FRESCHEZZA), così grafico e tessera dicono
// la stessa cosa. Ogni fascia va dal suo «da» a quello della fascia sopra.
function zoneFreschezza() {
  return ZONE_FRESCHEZZA.map((z, i) => ({
    da: z.da, a: i === 0 ? null : ZONE_FRESCHEZZA[i - 1].da, nome: z.nome, classe: CLASSI_ZONE[i] || "zona-neutra",
  }));
}

function filtroPeriodo(ctx, quanti) {
  return h("div", { class: "filtro", role: "group", "aria-label": A.periodo },
    A.intervalli.map((it) => h("button", {
      type: "button",
      id: `periodo-${it.giorni}`,
      class: ["filtro-voce", it.giorni === quanti && "attivo"],
      "aria-pressed": it.giorni === quanti ? "true" : "false",
      on: { click: () => ctx.azioni.preferenza("intervallo", it.giorni) },
    }, it.nome)));
}

function notti(ctx, m, giorni, inizio, date) {
  if (m.notteMaiArrivata) {
    return h("section", { class: "sezione" },
      h("h3", {}, A.notti),
      h("p", { class: "vuoto" }, A.nottiMai));
  }
  // Il "normale" di ogni giorno, calcolato con le notti precedenti a quel giorno, con il dispositivo
  // della notte e le stesse notti escluse del semaforo, così la fascia è quella che il semaforo usa.
  const dispositivo = ctx.esito ? ctx.esito.dispositivo : undefined;
  const escluso = ctx.esito ? ctx.esito.escluso : null;
  const bandaHrv = giorni.map((_, k) => baseHrv(m.giorni, inizio + k, dispositivo, escluso));
  const bandaFc = giorni.map((_, k) => fasciaBattito(baseFc(m.giorni, inizio + k, escluso)));
  return h("section", { class: "sezione" },
    h("h3", {}, A.notti),
    blocco(A.hrv.titolo, A.hrv.testo, grafico({
      descrizione: A.hrv.descrizione,
      etichette: date,
      serie: [{ nome: A.hrv.nome, classe: "s1", valori: giorni.map((g) => g.hrv), formato: (v) => `${numero(v)} ms` }],
      banda: { nome: A.normale, basso: bandaHrv.map((b) => (b.ok ? b.basso : null)), alto: bandaHrv.map((b) => (b.ok ? b.alto : null)) },
      vuoto: A.hrv.vuoto,
    })),
    blocco(A.fc.titolo, A.fc.testo, grafico({
      descrizione: A.fc.descrizione,
      etichette: date,
      serie: [{ nome: A.fc.nome, classe: "s1", valori: giorni.map((g) => g.fc), formato: (v) => A.fc.battiti(numero(v)) }],
      banda: { nome: A.normale, basso: bandaFc.map((b) => b.basso), alto: bandaFc.map((b) => b.alto) },
      vuoto: A.fc.vuoto,
    })),
    blocco(A.sonno.titolo, A.sonno.testo, grafico({
      tipo: "colonne",
      descrizione: A.sonno.descrizione,
      etichette: date,
      serie: [{ nome: A.sonno.nome, classe: "s1", valori: giorni.map((g) => (g.sonno ? g.sonno / 3600 : null)), formato: (v) => durata(v * 3600) }],
      riferimento: { valore: 6, etichetta: A.sonno.riga },
      formatoAsse: (v) => (v ? durata(v * 3600) : "0"),
      vuoto: A.sonno.vuoto,
    })));
}

// La Fitness di Come sto accanto a quella di intervals.icu (6.5), fino a ieri sera come le altre.
function dueFitness(ctx, fineIeri, dateIeri) {
  const serie = new Map((Array.isArray(ctx.serie) ? ctx.serie : []).map((r) => [r.d, r]));
  if (!serie.size) return null;
  const nostra = dateIeri.map((d) => {
    const r = serie.get(d);
    return r && typeof r.fitness === "number" ? r.fitness : null;
  });
  return blocco(A.dueFitness.titolo, A.dueFitness.testo, grafico({
    descrizione: A.dueFitness.descrizione,
    etichette: dateIeri,
    serie: [
      { nome: A.dueFitness.comeSto, classe: "s1", valori: nostra },
      { nome: A.dueFitness.intervals, classe: "s2", valori: fineIeri.map((g) => g.ctl) },
    ],
    daZero: true,
    vuoto: A.dueFitness.vuoto,
  }));
}

export function sezioneAndamento(ctx) {
  const m = ctx.modello;
  const quanti = ctx.preferenze.intervallo || 90;
  const inizio = Math.max(0, m.giorni.length - quanti);
  const giorni = m.giorni.slice(inizio);
  const date = giorni.map((g) => g.d);
  // Fitness, Fatica e Freschezza si fermano a ieri sera, come il semaforo e le tessere.
  const fineIeri = giorni.slice(0, -1);
  const dateIeri = date.slice(0, -1);

  // con una base minuscola la percentuale salta da un estremo all'altro e non vuol dire niente
  const freschezza = fineIeri.map((g) => (g.formaPct !== null && g.ctl >= 10 ? g.formaPct * 100 : null));
  const valoriFreschezza = freschezza.filter((v) => v !== null);
  // la scala mostra sempre tutte le fasce, e si allarga quando la Freschezza va oltre
  const dominioFreschezza = [
    Math.min(-70, ...valoriFreschezza.map((v) => Math.floor(v / 10) * 10 - 5)),
    Math.max(40, ...valoriFreschezza.map((v) => Math.ceil(v / 10) * 10 + 5)),
  ];

  return h("section", { class: "sezione numeri-parte", id: "numeri-andamento", "aria-labelledby": "titolo-andamento" },
    h("h2", { id: "titolo-andamento" }, A.titolo),
    h("p", { class: "sezione-testo" }, A.attacco),
    filtroPeriodo(ctx, quanti),

    h("section", { class: "sezione" },
      h("h3", {}, A.allenamento),
      h("p", { class: "piccolo" }, A.finoAIeri),
      blocco(A.fitness.titolo, A.fitness.testo, grafico({
        descrizione: A.fitness.descrizione,
        etichette: dateIeri,
        serie: [
          { nome: A.fitnessNome, classe: "s1", valori: fineIeri.map((g) => g.ctl) },
          { nome: A.faticaNome, classe: "s2", valori: fineIeri.map((g) => g.atl) },
        ],
        daZero: true,
        vuoto: A.fitness.vuoto,
      })),
      dueFitness(ctx, fineIeri, dateIeri),
      blocco(A.freschezza.titolo, A.freschezza.testo, grafico({
        descrizione: A.freschezza.descrizione,
        etichette: dateIeri,
        serie: [{ nome: A.freschezzaNome, classe: "s1", valori: freschezza, formato: (v) => `${segno(v)}%` }],
        zone: zoneFreschezza(),
        dominio: dominioFreschezza,
        // se la scala si allarga il grafico cresce, così le fasce restano leggibili
        altezza: Math.min(360, Math.round(200 * (dominioFreschezza[1] - dominioFreschezza[0]) / 110)),
        valoriAsse: [-50, -30, -10, 5, 20],
        formatoAsse: (v) => `${segno(v)}%`,
        vuoto: A.freschezza.vuoto,
      })),
      blocco(A.lavoro.titolo, A.lavoro.testo, grafico({
        tipo: "colonne",
        descrizione: A.lavoro.descrizione,
        etichette: date,
        serie: [{ nome: A.lavoro.punti, classe: "s2", valori: giorni.map((g) => g.carico) }],
        vuoto: A.lavoro.vuoto,
      }))),
    notti(ctx, m, giorni, inizio, date));
}
