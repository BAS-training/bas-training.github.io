// «Pronto?» (7.7), per ora il segnaposto, al posto della pagina Obiettivo. Il verdetto o la proiezione
// e la giornata dell'avventura. Le prove, «Cosa cambia se…» e i numeri arrivano con la pagina vera.

import { h } from "../dom.js?v=202610312043";
import { righeStima } from "../testi-stima.js?v=202610312043";
import { PRONTO_PAGINA } from "../testi-prontezza.js?v=202610312043";
import { intestazione, bannerDemo } from "./comuni.js?v=202610312043";

export function vistaPronto(ctx) {
  const p = ctx.prontezza;
  if (!ctx.obiettivo || !ctx.obiettivo.percorso) {
    return h("div", { class: "vista vista-pronto" },
      intestazione(null, PRONTO_PAGINA.titolo, PRONTO_PAGINA.senzaObiettivo),
      ctx.demo ? bannerDemo(ctx) : null,
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone", type: "button", on: { click: () => ctx.azioni.vai("inizio") } }, PRONTO_PAGINA.scegli)));
  }
  const v = p && p.verdetto ? p.verdetto : null;
  const frasi = p && p.proiezione ? p.proiezione.frasi || [p.proiezione.frase] : [];
  return h("div", { class: "vista vista-pronto" },
    intestazione(PRONTO_PAGINA.titolo, v ? v.titolo : frasi[0] || PRONTO_PAGINA.avventura, v ? v.perche : null),
    ctx.demo ? bannerDemo(ctx) : null,
    v && v.cosa ? h("p", { class: "carta" }, v.cosa) : null,
    h("section", { class: "carta pronto-avventura" },
      h("h2", {}, PRONTO_PAGINA.avventura),
      righeStima(ctx.stima).map((t) => h("p", {}, t))));
}
