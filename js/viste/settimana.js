// La settimana (7.6), per ora il segnaposto. La frase in alto e le sette righe del piano, con la seduta
// in breve. Toccare una seduta, spostare e «Aggiungi un giro» arrivano con la pagina vera.

import { h } from "../dom.js?v=202610312043";
import { dataBreve } from "../formato.js?v=202610312043";
import { inBreve, contoAllaPartenza } from "../testi-piano.js?v=202610312043";
import { SETTIMANA } from "../testi-settimana.js?v=202610312043";
import { intestazione, bannerDemo } from "./comuni.js?v=202610312043";

// La seduta che dice la riga, prima quella in bici, poi la palestra.
function principale(g) {
  const sedute = (g.sedute || []).filter((x) => x && x.tipo !== "riposo");
  return sedute.find((x) => x.tipo !== "palestra" && x.tipo !== "tronco") || sedute[0] || null;
}

export function vistaSettimana(ctx) {
  const w = ctx.settimana;
  const partenza = ctx.obiettivo ? ctx.obiettivo.partenza : null;
  if (!ctx.piano || !w) {
    return h("div", { class: "vista vista-settimana" },
      intestazione(null, SETTIMANA.titolo, SETTIMANA.senzaPiano),
      ctx.demo ? bannerDemo(ctx) : null,
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone", type: "button", on: { click: () => ctx.azioni.vai("inizio") } }, SETTIMANA.scegli)));
  }
  return h("div", { class: "vista vista-settimana" },
    intestazione(contoAllaPartenza(ctx.oggi, partenza), SETTIMANA.titolo, w.frase || null),
    ctx.demo ? bannerDemo(ctx) : null,
    h("ol", { class: "carta settimana-giorni" }, (w.giorni || []).map((g) => h("li", {
      class: ["settimana-giorno", g.giorno === ctx.oggi && "settimana-oggi"],
    }, h("span", { class: "settimana-data" }, dataBreve(g.giorno)), h("span", {}, inBreve(principale(g)))))));
}
