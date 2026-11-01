// Numeri (7.11), per ora il segnaposto. Raccoglie Andamento e Uscite di prima (7.2), una sotto l'altra.
// Le sei tessere, la Fitness di Come sto e le domande ancora aperte arrivano con la pagina vera.

import { h } from "../dom.js?v=202610312043";
import { NUMERI_PAGINA } from "../testi-numeri.js?v=202610312043";
import { intestazione } from "./comuni.js?v=202610312043";
import { vistaAndamento } from "./andamento.js?v=202610312043";
import { vistaUscite } from "./uscite.js?v=202610312043";

export function vistaNumeri(ctx) {
  return h("div", { class: "vista vista-numeri" },
    intestazione(NUMERI_PAGINA.sottotitolo, NUMERI_PAGINA.titolo, NUMERI_PAGINA.attacco),
    h("section", { id: "numeri-andamento", class: "numeri-parte" }, vistaAndamento(ctx)),
    h("section", { id: "numeri-uscite", class: "numeri-parte" }, vistaUscite(ctx)));
}
