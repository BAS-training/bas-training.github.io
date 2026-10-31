// "Obiettivo": scegli la prossima avventura e vedi quanta Fitness serve, dove arrivi e come salire.

import { h } from "../dom.js?v=202610311949";
import { numero, durata, dataLunga } from "../formato.js?v=202610311949";
import {
  SFIDE, SCARICO_GIORNI, fitnessAllaPartenza, salitaSettimanale, caricoSettimanaPer,
  puntiPerOra, giroPiuLungo, giorniTra, aggiungiGiorni,
} from "../modello.js?v=202610311949";
import { intestazione, bannerDemo } from "./comuni.js?v=202610311949";

const PIU_LONTANO = 3 * 365; // giorni: oltre non ha senso pianificare

function barra(attuale, sfida, previsto) {
  const massimo = Math.max(sfida.comodo * 1.15, attuale * 1.1, previsto * 1.1, 20);
  const pct = (v) => `${Math.min(100, Math.max(0, (v / massimo) * 100)).toFixed(1)}%`;
  // larghezze e posizioni passano da proprietà CSS impostate da JavaScript
  const pieno = h("span", { class: "metro-pieno" });
  pieno.style.width = pct(attuale);
  const segnoPrevisto = h("span", { class: "metro-previsto" });
  segnoPrevisto.style.left = pct(previsto);
  const minimo = h("span", { class: "metro-soglia metro-soglia-minimo" }, h("span", {}, `minimo ${numero(sfida.minimo)}`));
  minimo.style.left = pct(sfida.minimo);
  const comodo = h("span", { class: "metro-soglia metro-soglia-comodo" }, h("span", {}, `comodo ${numero(sfida.comodo)}`));
  comodo.style.left = pct(sfida.comodo);
  return h("div", { class: "metro", role: "img",
    "aria-label": `Fitness di oggi ${numero(attuale)}. Ne servono almeno ${sfida.minimo}, comodo da ${sfida.comodo}. Continuando così alla partenza arrivi a ${numero(previsto)}.` },
    h("div", { class: "metro-binario" }, pieno, segnoPrevisto, minimo, comodo),
    h("div", { class: "legenda metro-legenda", "aria-hidden": "true" },
      h("span", { class: "legenda-voce" }, h("span", { class: "chiave chiave-colonna serie-s1" }), "La tua Fitness oggi"),
      h("span", { class: "legenda-voce" }, h("span", { class: "chiave chiave-segno" }), "Dove arrivi alla partenza continuando così")));
}

function ritmo(salita) {
  if (salita <= 3) return "un ritmo tranquillo";
  if (salita <= 6) return "un ritmo impegnativo";
  return null;
}

export function vistaObiettivo(ctx) {
  const m = ctx.modello;
  const scelta = SFIDE.find((x) => x.id === ctx.preferenze.sfida) || SFIDE[1];
  const massimaData = aggiungiGiorni(m.oggi, PIU_LONTANO);
  const salvata = ctx.preferenze.dataEvento;
  const dataEvento = salvata && salvata > m.oggi && salvata <= massimaData ? salvata : aggiungiGiorni(m.oggi, 84);
  const giorni = giorniTra(m.oggi, dataEvento);
  const fitness = m.mattino.ctl ?? 0;
  const settimanaleAttuale = (m.caricoMese || 0) / 4;
  const previsto = fitnessAllaPartenza(fitness, settimanaleAttuale, giorni);
  const giorniUtili = Math.max(0, giorni - SCARICO_GIORNI);
  const perOra = puntiPerOra(m.uscite);
  const ore = (punti) => numero(punti / perOra);
  const salita = (obiettivo) => salitaSettimanale(fitness, obiettivo, giorni);

  let verdetto;
  if (fitness >= scelta.comodo) verdetto = "Sei già pronto, e con margine. Adesso si tratta di mantenere e arrivare fresco.";
  else if (fitness >= scelta.minimo) verdetto = "Ci arrivi già oggi. Con qualche settimana in più arrivi più comodo.";
  else if (previsto >= scelta.minimo) verdetto = "Se continui come nell'ultimo mese, ci arrivi.";
  else if (giorniUtili === 0) verdetto = "Mancano meno di due settimane. Non è più il momento di caricare, ma di riposare bene.";
  else verdetto = "Come ti alleni adesso non basta. Qui sotto trovi come salire.";

  // Il piano: di quanto deve salire la Fitness ogni settimana, e quanto fare la prossima settimana.
  let piano = null;
  if (giorniUtili > 0 && previsto < scelta.comodo) {
    const sMin = salita(scelta.minimo);
    const sComodo = salita(scelta.comodo);
    const righe = [h("p", {}, `Nell'ultimo mese hai fatto in media ${numero(settimanaleAttuale)} punti a settimana, più o meno ${ore(settimanaleAttuale)} ore di bici al tuo ritmo solito.`)];
    if (fitness < scelta.minimo && sMin > 0) {
      const r = ritmo(sMin);
      righe.push(h("p", {}, `Per arrivare almeno a ${scelta.minimo} la Fitness deve salire di circa `, h("strong", {}, `${numero(sMin, 1)} punti a settimana`),
        r ? `, ${r}. ` : ". ",
        r ? `La prossima settimana vuol dire circa ${numero(caricoSettimanaPer(fitness, sMin))} punti, cioè ${ore(caricoSettimanaPer(fitness, sMin))} ore, e poi un po' di più ogni settimana.`
          : "È troppo in fretta per farlo senza rischi. Scegli una data più lontana o una sfida più corta."));
    }
    if (sComodo > 0 && ritmo(sComodo)) {
      righe.push(h("p", {}, `Per arrivare comodo, a ${scelta.comodo}, deve salire di circa `, h("strong", {}, `${numero(sComodo, 1)} punti a settimana`), `, ${ritmo(sComodo)}.`));
    }
    righe.push(h("p", { class: "piccolo" }, "Fino a 3 punti a settimana è un ritmo tranquillo, da 4 a 6 è impegnativo. Ogni tre settimane fanne una più leggera, e lascia che il semaforo ti dica se stai esagerando."));
    piano = h("div", { class: "piano" }, h("h3", {}, "Come salire"), righe);
  }

  // Il giro lungo: la Fitness non misura la tenuta sulle ore, quindi si guarda anche il giro più lungo recente.
  const lungo = giroPiuLungo(m.uscite, m.oggi);
  const oreTappa = scelta.oreTappa;
  const giroLungo = h("p", {}, lungo
    ? `Il tuo giro più lungo delle ultime otto settimane è di ${durata(lungo)}. ${lungo < oreTappa * 3600 * 0.6
      ? `Prima di partire fai qualche giro lungo, fino a ${numero(Math.round(oreTappa * 0.75))} ore, per abituare il corpo a stare tante ore in sella.`
      : "Bene, sei abituato a stare a lungo in sella."}`
    : `Prima di partire fai qualche giro lungo, fino a ${numero(Math.round(oreTappa * 0.75))} ore, per abituare il corpo a stare tante ore in sella.`);

  return h("div", { class: "vista" },
    intestazione("Obiettivo", "Sono pronto?",
      "Scegli la tua prossima avventura e la data. Ti dico quanta Fitness serve, dove arrivi continuando così e come salire per arrivarci bene."),
    ctx.demo ? bannerDemo(ctx) : null,

    h("section", { class: "carta" },
      h("h2", {}, "Che cosa vuoi fare?"),
      h("div", { class: "sfide", role: "radiogroup", "aria-label": "La tua prossima avventura" },
        SFIDE.map((x) => {
          const id = `sfida-${x.id}`;
          return h("span", { class: "sfida" },
            h("input", { type: "radio", id, name: "sfida", value: x.id, checked: x.id === scelta.id,
              on: { change: () => ctx.azioni.preferenza("sfida", x.id) } }),
            h("label", { for: id }, h("strong", {}, x.nome), h("span", {}, x.descrizione)));
        })),
      h("div", { class: "campo" },
        h("label", { for: "data-evento" }, "Quando parti?"),
        h("input", { type: "date", id: "data-evento", value: dataEvento, min: aggiungiGiorni(m.oggi, 1), max: massimaData,
          on: { change: (e) => {
            const v = e.target.value;
            if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v > m.oggi && v <= massimaData) ctx.azioni.preferenza("dataEvento", v);
          } } }),
        h("p", { class: "piccolo" }, `${dataLunga(dataEvento)}, tra ${numero(giorni)} giorni.`))),

    h("section", { class: "carta risultato" },
      h("h2", {}, scelta.nome),
      h("p", { class: "verdetto" }, verdetto),
      barra(fitness, scelta, previsto),
      h("dl", { class: "cifre" },
        h("div", {}, h("dt", {}, "La tua Fitness oggi"), h("dd", {}, numero(fitness))),
        h("div", {}, h("dt", {}, "Ne serve almeno"), h("dd", {}, numero(scelta.minimo))),
        h("div", {}, h("dt", {}, "Per arrivarci comodo"), h("dd", {}, numero(scelta.comodo))),
        h("div", {}, h("dt", {}, "Alla partenza, continuando così"), h("dd", {}, numero(previsto)))),
      piano,
      giroLungo,
      h("p", { class: "piccolo" }, "Le ultime due settimane prima di partire si scarica, ed è già messo nel conto. La Fitness cala di qualche punto, ma arrivi fresco, che conta di più.")),

    h("section", { class: "sezione" },
      h("h2", {}, "Da dove vengono questi numeri"),
      h("p", {}, "La Fitness si calcola dai tuoi allenamenti, con la stessa formula di intervals.icu. Le soglie di ogni avventura sono stime prese dall'esperienza di pochi ciclisti, non da studi. Dicono «ci arrivi in fondo», non «vai forte»."),
      h("p", {}, "I punti si contano su quanto puoi spingere tu, quindi le stesse cifre valgono per chi va forte e per chi va piano. Chi va più piano però sta in sella più ore per gli stessi km, quindi guarda le ore al giorno. Contano anche testa, bici, meteo e quanto dormi in viaggio, che nessun numero vede.")));
}
