// Il primo avvio (7.3), per ora il segnaposto. Dice da dove arrivi, se dal link degli iscritti, e lascia
// scegliere il solo semaforo del mattino. Le sei schermate di 7.3 arrivano con la pagina vera.

import { h } from "../dom.js?v=202610312043";
import { trovaPercorso } from "../catalogo.js?v=202610312043";
import { INIZIO } from "../testi-inizio.js?v=202610312043";
import { intestazione } from "./comuni.js?v=202610312043";

export function vistaInizio(ctx) {
  const invito = ctx.invito;
  const percorso = invito ? trovaPercorso(invito.percorso) : null;
  return h("div", { class: "vista vista-inizio" },
    intestazione(INIZIO.occhiello, INIZIO.titolo, INIZIO.attacco),
    percorso ? h("p", { class: "carta inizio-invito" }, INIZIO.invito(percorso.evento, invito.giorni)) : null,
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "button", id: "inizio-semaforo",
        on: { click: () => { ctx.azioni.salvaObiettivo({ tipo: "semaforo" }); ctx.azioni.vai("oggi"); } } }, INIZIO.soloSemaforo),
      h("button", { class: "bottone bottone-secondario", type: "button", id: "inizio-oggi",
        on: { click: () => ctx.azioni.vai("oggi") } }, INIZIO.oggi)));
}
