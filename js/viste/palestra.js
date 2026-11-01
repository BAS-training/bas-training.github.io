// La palestra (7.8), per ora il segnaposto. Il nome della seduta di oggi e gli esercizi, con serie e
// ripetizioni. «Come si fa», «Segna i pesi» e «Fatta» arrivano con la pagina vera.

import { h } from "../dom.js?v=202610312043";
import { PALESTRA_PAGINA } from "../testi-settimana.js?v=202610312043";
import { intestazione, bannerDemo } from "./comuni.js?v=202610312043";

export function vistaPalestra(ctx) {
  const s = ctx.palestra ? ctx.palestra.oggi : null;
  if (!s) {
    return h("div", { class: "vista vista-palestra" },
      intestazione(null, PALESTRA_PAGINA.titolo, PALESTRA_PAGINA.niente),
      ctx.demo ? bannerDemo(ctx) : null,
      h("p", { class: "piccolo" }, PALESTRA_PAGINA.scheda));
  }
  return h("div", { class: "vista vista-palestra" },
    intestazione(s.sottotitolo || PALESTRA_PAGINA.titolo, s.titolo, s.quanti || null),
    ctx.demo ? bannerDemo(ctx) : null,
    h("ol", { class: "carta palestra-esercizi" }, (s.esercizi || []).map((e) => h("li", {},
      h("strong", {}, e.nome), e.testi && e.testi.serie ? h("span", { class: "piccolo" }, ` ${e.testi.serie}`) : null))));
}
