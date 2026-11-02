// La barra «Arrivi pronto?» (2.3 e 2.9), condivisa da Oggi, sotto la carta del giorno, e da Pronto?, in
// cima. Quattro segmenti, uno per pilastro (ore a settimana, uscita lunga, prove con le borse e costanza),
// pieni, a metà o vuoti con lo stesso stato dei segni delle righe di Pronto?, cioè spunta, cerchio o
// croce. Lo stato lo dice quanto è pieno il segmento, non il colore. Chi usa un lettore di schermo sente
// lo stato di ogni pilastro a parole. In Oggi sotto c'è la frase del verdetto o di dove arrivi, e un
// tocco porta a #pronto. In Pronto? quella frase è già il titolo della pagina, subito sotto.
// Niente numeri a schermo. I testi stanno in js/testi-prontezza.js, lo stile in css/barra.css.
// La parte pura (segmentiPronto) si prova con node.

import { h, s } from "../dom.js?v=202611022140";
import { BARRA_PRONTO, nomeBarra, fraseBarra } from "../testi-prontezza.js?v=202611022140";

// I pilastri della barra, nell'ordine di 2.3.
export const PILASTRI_BARRA = ["volume", "lunga", "borse", "continuita"];

// Il segno di ogni stato, una spunta, un cerchio o una croce (2.9). Lo usano le righe di Pronto? e la
// barra, così dicono sempre la stessa cosa.
export const FORMA_DI = { fatto: "spunta", fatta: "spunta", inProgramma: "cerchio", quasi: "cerchio", consiglio: "cerchio", daFare: "cerchio", manca: "croce" };

// Come si riempie il segmento di ogni segno.
const RIEMPIMENTO = { spunta: "pieno", cerchio: "meta", croce: "vuoto" };

// I quattro segmenti, [{ pilastro, stato, forma, riempimento }], oppure null quando i pilastri non ci
// sono ancora, cioè senza data, con poche settimane di uscite o senza la giornata. Le prove con le borse
// che non servono, per un giorno senza borse, valgono come un segmento pieno, perché non manca niente.
export function segmentiPronto(prontezza) {
  const p = prontezza && typeof prontezza === "object" ? prontezza.pilastri : null;
  if (!p || typeof p !== "object") return null;
  if (!PILASTRI_BARRA.every((n) => p[n] && typeof p[n].stato === "string")) return null;
  return PILASTRI_BARRA.map((pilastro) => {
    const stato = p[pilastro].stato;
    const forma = stato === "nonServe" ? "spunta" : FORMA_DI[stato] || "cerchio";
    return { pilastro, stato, forma, riempimento: RIEMPIMENTO[forma] };
  });
}

// La freccia del tocco in Oggi, solo un disegno.
function freccia() {
  return s("svg", { class: "barra-pronto-freccia", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" },
    s("path", { d: "M9 5.5l6.5 6.5L9 18.5" }));
}

// La barra di ctx.prontezza, oppure null senza un evento o un'avventura con i pilastri. Con collegamento
// la barra intera è un collegamento a Pronto?, con la frase sotto (Oggi). Senza, è solo la barra (Pronto?).
export function barraPronto(ctx, { collegamento = false, id = "barra-pronto" } = {}) {
  const ob = ctx && ctx.obiettivo;
  if (!ob || !ob.percorso || !ctx.prontezza) return null;
  const segmenti = segmentiPronto(ctx.prontezza);
  const nome = segmenti ? nomeBarra(segmenti) : null;
  if (!nome) return null;
  const frase = collegamento ? fraseBarra(ctx.prontezza) : null;
  const barra = h("span", { class: "barra-pronto-segmenti", role: "img", "aria-label": nome },
    segmenti.map((x) => h("span", { class: ["barra-segmento", `barra-segmento-${x.riempimento}`] },
      h("span", { class: "barra-segmento-forma" }),
      h("span", { class: "barra-segmento-nome" }, BARRA_PRONTO.brevi[x.pilastro]))));
  const contenuto = [
    h("span", { class: "barra-pronto-testa" },
      h("span", { class: "barra-pronto-titolo" }, BARRA_PRONTO.titolo),
      collegamento ? freccia() : null),
    barra,
    frase ? h("span", { class: "barra-pronto-frase" }, frase) : null,
  ];
  if (collegamento) return h("a", { class: "barra-pronto barra-pronto-tocco", href: "#pronto", id }, contenuto);
  return h("div", { class: "barra-pronto", id }, contenuto);
}
