// "Sono pronto?": scegli la prossima avventura e vedi quanta Fitness serve e quanto manca.

import { h } from "../dom.js";
import { numero, dataLunga } from "../formato.js";
import { SFIDE, proiettaFitness, caricoNecessario, giorniTra, aggiungiGiorni, PUNTI_ORA_TRANQUILLA } from "../modello.js";
import { intestazione, bannerDemo } from "./comuni.js";

function barra(attuale, sfida, previsto) {
  const massimo = Math.max(sfida.comodo * 1.15, attuale * 1.1, previsto * 1.1, 20);
  const pct = (v) => `${Math.min(100, Math.max(0, (v / massimo) * 100)).toFixed(1)}%`;
  // larghezze e posizioni passano da proprietà CSS impostate da JavaScript
  const pieno = h("span", { class: "metro-pieno" });
  pieno.style.width = pct(attuale);
  const segnoPrevisto = h("span", { class: "metro-previsto" });
  segnoPrevisto.style.left = pct(previsto);
  const minimo = h("span", { class: "metro-soglia" }, h("span", {}, `ci arrivi ${numero(sfida.minimo)}`));
  minimo.style.left = pct(sfida.minimo);
  const comodo = h("span", { class: "metro-soglia metro-soglia-comodo" }, h("span", {}, `comodo ${numero(sfida.comodo)}`));
  comodo.style.left = pct(sfida.comodo);
  return h("div", { class: "metro", role: "img", "aria-label": `Fitness attuale ${numero(attuale)}, ne servono almeno ${sfida.minimo}, comodo da ${sfida.comodo}, continuando così arrivi a ${numero(previsto)}` },
    h("div", { class: "metro-binario" }, pieno, segnoPrevisto, minimo, comodo),
    h("div", { class: "legenda metro-legenda", "aria-hidden": "true" },
      h("span", { class: "legenda-voce" }, h("span", { class: "chiave chiave-colonna serie-s1" }), "La tua Fitness oggi"),
      h("span", { class: "legenda-voce" }, h("span", { class: "chiave chiave-segno" }), "Dove arrivi continuando così")));
}

export function vistaObiettivo(ctx) {
  const m = ctx.modello;
  const scelta = SFIDE.find((x) => x.id === ctx.preferenze.sfida) || SFIDE[1];
  const dataEvento = ctx.preferenze.dataEvento && ctx.preferenze.dataEvento > m.oggi
    ? ctx.preferenze.dataEvento
    : aggiungiGiorni(m.oggi, 84);
  const giorni = giorniTra(m.oggi, dataEvento);
  const fitness = m.mattino.ctl ?? 0;
  const settimanaleAttuale = (m.caricoMese || 0) / 4;
  // Le ultime due settimane prima di partire si scarica: l'allenamento vero finisce prima.
  const giorniUtili = Math.max(0, giorni - 14);
  const previsto = proiettaFitness(fitness, settimanaleAttuale, giorniUtili);
  const serveMinimo = giorniUtili > 0 ? caricoNecessario(fitness, scelta.minimo, giorniUtili) : null;
  const serveComodo = giorniUtili > 0 ? caricoNecessario(fitness, scelta.comodo, giorniUtili) : null;
  const ore = (punti) => numero(punti / PUNTI_ORA_TRANQUILLA);

  let verdetto;
  if (fitness >= scelta.comodo) verdetto = "Sei già pronto, e con margine. Adesso si tratta di mantenere e arrivare fresco.";
  else if (fitness >= scelta.minimo) verdetto = "Ci arrivi già oggi. Con qualche settimana in più arrivi più comodo.";
  else if (previsto >= scelta.minimo) verdetto = "Se continui come nell'ultimo mese, ci arrivi.";
  else if (giorniUtili === 0) verdetto = "Mancano meno di due settimane. Non è più il momento di caricare, ma di riposare bene.";
  else verdetto = "Come ti alleni adesso non basta. Qui sotto trovi quanto serve.";

  const salto = serveMinimo !== null && settimanaleAttuale > 0 && serveMinimo > settimanaleAttuale * 1.5;

  return h("div", { class: "vista" },
    intestazione("Obiettivo", "Sono pronto?",
      "Scegli la tua prossima avventura e la data. Ti dico quanta Fitness serve, dove arrivi continuando così e quanto allenarti per arrivarci bene."),
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
        h("input", { type: "date", id: "data-evento", value: dataEvento, min: aggiungiGiorni(m.oggi, 1),
          on: { change: (e) => { if (e.target.value) ctx.azioni.preferenza("dataEvento", e.target.value); } } }),
        h("p", { class: "piccolo" }, `${dataLunga(dataEvento)}, tra ${numero(giorni)} giorni.`))),

    h("section", { class: "carta risultato" },
      h("h2", {}, scelta.nome),
      h("p", { class: "verdetto" }, verdetto),
      barra(fitness, scelta, previsto),
      h("dl", { class: "cifre" },
        h("div", {}, h("dt", {}, "La tua Fitness oggi"), h("dd", {}, numero(fitness))),
        h("div", {}, h("dt", {}, "Ne serve almeno"), h("dd", {}, numero(scelta.minimo))),
        h("div", {}, h("dt", {}, "Per arrivarci comodo"), h("dd", {}, numero(scelta.comodo))),
        h("div", {}, h("dt", {}, "Continuando così, alla partenza"), h("dd", {}, numero(previsto)))),
      giorniUtili > 0 && fitness < scelta.comodo
        ? h("div", { class: "piano" },
          h("h3", {}, "Quanto allenarti"),
          h("p", {}, `Nell'ultimo mese hai fatto in media ${numero(settimanaleAttuale)} punti a settimana, più o meno ${ore(settimanaleAttuale)} ore di giro tranquillo.`),
          serveMinimo !== null && fitness < scelta.minimo
            ? h("p", {}, `Per arrivare a ${scelta.minimo} servono circa `, h("strong", {}, `${numero(serveMinimo)} punti a settimana`), `, cioè circa ${ore(serveMinimo)} ore di giro tranquillo, da qui a due settimane prima della partenza.`)
            : null,
          serveComodo !== null
            ? h("p", {}, `Per arrivare comodo, a ${scelta.comodo}, ne servono circa `, h("strong", {}, `${numero(serveComodo)} a settimana`), `, cioè circa ${ore(serveComodo)} ore.`)
            : null,
          salto ? h("p", { class: "avviso-piccolo" }, "È un salto grosso rispetto a quello che fai adesso. Aumenta un po' alla volta e ogni tre settimane fanne una più leggera. Il semaforo ti dirà se stai esagerando.") : null)
        : null,
      h("p", { class: "piccolo" }, "Le ultime due settimane prima di partire si scarica. La Fitness cala di poco e arrivi fresco, che conta di più.")),

    h("section", { class: "sezione" },
      h("h2", {}, "Da dove vengono questi numeri"),
      h("p", {}, "La Fitness si calcola dai tuoi allenamenti, con la stessa formula di intervals.icu. Le soglie di ogni avventura sono ordini di grandezza, presi da ciclisti che queste cose le hanno fatte. Dicono «ci arrivi in fondo», non «vai forte»."),
      h("p", {}, "Visto che i punti di carico si misurano rispetto alla tua soglia, le soglie valgono per chi va forte come per chi va piano. Contano anche testa, bici, meteo e quanto dormi in viaggio, che nessun numero vede.")));
}
