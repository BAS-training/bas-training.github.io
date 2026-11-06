// Pezzi usati da più pagine.

import { h, icona } from "../dom.js?v=202611061254";
import { ESITO_VOCE } from "../semaforo.js?v=202611061254";

export function pillola(colore, testo) {
  return h("span", { class: ["pillola", `pillola-${colore}`] },
    h("span", { class: "pillola-pallino", "aria-hidden": "true" }),
    testo || ESITO_VOCE[colore]);
}

export function spiegazione(testo) {
  if (!testo) return null;
  return h("details", { class: "spiega" },
    h("summary", {}, "Cosa vuol dire"),
    h("p", {}, testo.cosa),
    h("p", {}, h("strong", {}, "Come leggerlo. "), testo.come),
    h("p", {}, h("strong", {}, "A cosa è legato. "), testo.legami));
}

export function intestazione(occhiello, titolo, testo) {
  return h("header", { class: "intestazione" },
    occhiello && h("p", { class: "occhiello" }, occhiello),
    h("h1", {}, titolo),
    testo && h("p", { class: "attacco" }, testo));
}

export function bannerDemo(ctx) {
  return h("aside", { class: "banner banner-demo" },
    h("p", {}, h("strong", {}, "Stai guardando dati di esempio. "),
      "Giulia è una ciclista inventata, con sei mesi di allenamenti e di notti. Per vedere i tuoi numeri collega il tuo account."),
    h("div", { class: "riga-bottoni" },
      h("a", { class: "bottone", href: "#collega", on: { click: () => ctx.azioni.esciDemo() } }, "Collega i miei dati")));
}

export function luceSemaforo(colore) {
  const simbolo = { verde: "check", giallo: "attenzione", rosso: "pausa", neutro: "domanda" }[colore];
  return h("div", { class: ["luce", `luce-${colore}`], "aria-hidden": "true" },
    h("span", { class: "luce-spenta luce-alta" }),
    h("span", { class: "luce-spenta luce-media" }),
    h("span", { class: "luce-spenta luce-bassa" }),
    h("span", { class: "luce-accesa" }, icona(simbolo, "luce-simbolo")));
}
