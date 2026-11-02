// Le schermate della regia della pagina, quando l'ingresso non è ancora finito. Per ora una, quella di
// un account diverso da quello dei dati che stanno sul telefono (R21). Finché la persona non sceglie,
// i dati dell'altra non si mostrano, non si usano e le sue scritture non partono.

import { h } from "../dom.js?v=202611021803";
import { ATLETA_DIVERSO } from "../testi-app.js?v=202611021803";
import { intestazione } from "./comuni.js?v=202611021803";

export function vistaAtletaDiverso(ctx) {
  const A = ATLETA_DIVERSO;
  return h("div", { class: "vista vista-testo" },
    intestazione(A.occhiello, A.titolo, A.testo),
    h("section", { class: "carta passo" },
      h("p", {}, A.cancellaTesto),
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone", type: "button", id: "atleta-cancella", on: { click: () => ctx.azioni.atletaDiverso("cancella") } }, A.cancella))),
    h("section", { class: "carta passo" },
      h("p", {}, A.esciTesto),
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone bottone-secondario", type: "button", id: "atleta-esci", on: { click: () => ctx.azioni.atletaDiverso("esci") } }, A.esci))));
}
