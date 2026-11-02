// Grafici in SVG, disegnati a mano: niente librerie esterne, così la pagina non carica
// codice di altri e la chiave di intervals.icu resta al sicuro.
// Regole: un solo asse verticale per grafico, linee sottili, griglia leggera,
// un tooltip che segue il dito o il mouse, e la tabella con i numeri per chi non vede i colori.

import { h, s } from "./dom.js?v=202611021803";
import { numero, giornoMese, mese, dataLunga, valido } from "./formato.js?v=202611021803";

const ALTEZZA = 200;
let contatore = 0;
const MARGINE = { su: 16, giu: 28, sinistra: 42 };

function scala(d0, d1, r0, r1) {
  const k = (r1 - r0) / (d1 - d0 || 1);
  return (v) => r0 + (v - d0) * k;
}

function tacche(min, max, quante = 4) {
  if (min === max) { min -= 1; max += 1; }
  const grezzo = (max - min) / quante;
  const pot = Math.pow(10, Math.floor(Math.log10(grezzo)));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= grezzo);
  const inizio = Math.floor(min / passo) * passo;
  const fine = Math.ceil(max / passo) * passo;
  const lista = [];
  for (let v = inizio; v <= fine + passo / 2; v += passo) lista.push(Number(v.toFixed(6)));
  return { lista, min: inizio, max: fine };
}

function tacheX(etichette, sonoDate) {
  const n = etichette.length;
  if (sonoDate && n > 45) {
    const primi = [];
    etichette.forEach((d, i) => { if (d.endsWith("-01")) primi.push(i); });
    if (primi.length >= 2) return primi.map((i) => ({ i, testo: mese(etichette[i]) }));
  }
  const passo = Math.max(1, Math.ceil(n / 5));
  const lista = [];
  for (let i = n - 1; i >= 0; i -= passo) lista.unshift(i);
  return lista.map((i) => ({ i, testo: sonoDate ? giornoMese(etichette[i]) : etichette[i] }));
}

function percorso(valori, x, y) {
  let d = "";
  let aperto = false;
  valori.forEach((v, i) => {
    if (!valido(v)) { aperto = false; return; }
    d += `${aperto ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    aperto = true;
  });
  return d;
}

// La fascia del "normale": tanti pezzi chiusi, interrotti dove mancano i dati.
function percorsoBanda(basso, alto, x, y) {
  let d = "";
  let pezzo = [];
  const chiudi = () => {
    if (pezzo.length > 1) {
      d += "M" + pezzo.map((i) => `${x(i).toFixed(1)},${y(alto[i]).toFixed(1)}`).join("L");
      d += "L" + [...pezzo].reverse().map((i) => `${x(i).toFixed(1)},${y(basso[i]).toFixed(1)}`).join("L") + "Z";
    }
    pezzo = [];
  };
  basso.forEach((b, i) => (valido(b) && valido(alto[i]) ? pezzo.push(i) : chiudi()));
  chiudi();
  return d;
}

function colonna(xc, larghezza, y0, yv) {
  const sx = xc - larghezza / 2;
  const alt = y0 - yv;
  if (alt <= 0.5) return "";
  const r = Math.min(4, larghezza / 2, alt);
  return `M${sx},${y0}L${sx},${yv + r}Q${sx},${yv} ${sx + r},${yv}L${sx + larghezza - r},${yv}Q${sx + larghezza},${yv} ${sx + larghezza},${yv + r}L${sx + larghezza},${y0}Z`;
}

function legenda(opz) {
  const voci = [];
  if (opz.serie.length > 1 || opz.banda) {
    for (const se of opz.serie) {
      voci.push(h("span", { class: "legenda-voce" },
        h("span", { class: `chiave chiave-${opz.tipo === "colonne" ? "colonna" : "linea"} serie-${se.classe}`, "aria-hidden": "true" }), se.nome));
    }
  }
  if (opz.banda) {
    voci.push(h("span", { class: "legenda-voce" }, h("span", { class: "chiave chiave-banda", "aria-hidden": "true" }), opz.banda.nome));
  }
  return voci.length ? h("div", { class: "legenda" }, voci) : null;
}

function tabella(opz) {
  const righe = [];
  for (let i = opz.etichette.length - 1; i >= 0; i--) {
    const valori = opz.serie.map((se) => se.valori[i]);
    if (!valori.some(valido)) continue;
    righe.push(h("tr", {},
      h("th", { scope: "row" }, opz.date ? giornoMese(opz.etichette[i]) : opz.etichette[i]),
      opz.serie.map((se) => h("td", {}, valido(se.valori[i]) ? se.formato(se.valori[i]) : "—")),
      opz.banda ? h("td", {}, valido(opz.banda.basso[i]) ? `${numero(opz.banda.basso[i])}–${numero(opz.banda.alto[i])}` : "—") : null));
  }
  if (!righe.length) return null;
  return h("details", { class: "grafico-numeri" },
    h("summary", {}, "Vedi i numeri"),
    h("div", { class: "scorri" },
      h("table", {},
        h("thead", {}, h("tr", {},
          h("th", { scope: "col" }, opz.date ? "Giorno" : "Periodo"),
          opz.serie.map((se) => h("th", { scope: "col" }, se.nome)),
          opz.banda ? h("th", { scope: "col" }, opz.banda.nome) : null)),
        h("tbody", {}, righe))));
}

export function grafico(opzioni) {
  const opz = {
    tipo: "linee",
    date: true,
    zone: null,
    banda: null,
    riferimento: null,
    ...opzioni,
  };
  opz.serie = opz.serie.map((se) => ({ classe: "s1", formato: (v) => numero(v), ...se }));
  // Un grafico a colonne fatto solo di zeri (per esempio nessuna uscita) è un grafico vuoto.
  const vuoto = !opz.serie.some((se) => se.valori.some((v) => valido(v) && (opz.tipo !== "colonne" || v > 0)));

  const area = h("div", { class: "grafico-area" });
  const radice = h("figure", { class: ["grafico", vuoto && "grafico-vuoto"] },
    legenda(opz),
    area,
    vuoto ? null : tabella(opz));

  if (vuoto) {
    area.append(h("p", { class: "grafico-niente" }, opz.vuoto || "Non ci sono ancora dati per questo grafico."));
    return radice;
  }

  const suggerimento = h("div", { class: "grafico-tooltip", hidden: true });
  let larghezza = 0;
  const osservatore = new ResizeObserver((voci) => {
    if (!area.isConnected) { osservatore.disconnect(); return; }
    const w = Math.round(voci[0].contentRect.width);
    if (w > 0 && Math.abs(w - larghezza) > 2) { larghezza = w; disegna(); }
  });
  osservatore.observe(area);
  // Primo disegno subito dopo l'aggancio alla pagina, senza aspettare l'osservatore
  // (che in una scheda nascosta o in certi browser arriva tardi).
  setTimeout(() => {
    if (!larghezza && area.isConnected && area.clientWidth > 0) {
      larghezza = area.clientWidth;
      disegna();
    }
  }, 0);

  function disegna() {
    const n = opz.etichette.length;
    const fineSerie = opz.tipo === "linee" && opz.serie.length <= 2 ? 46 : 14;
    const W = larghezza;
    const H = opz.altezza || ALTEZZA;
    const pl = MARGINE.sinistra;
    const pr = W - fineSerie;
    const pt = MARGINE.su;
    const pb = H - MARGINE.giu;

    const tutti = [];
    for (const se of opz.serie) for (const v of se.valori) if (valido(v)) tutti.push(v);
    if (opz.banda) for (const arr of [opz.banda.basso, opz.banda.alto]) for (const v of arr) if (valido(v)) tutti.push(v);
    if (opz.riferimento) tutti.push(opz.riferimento.valore);
    let min = Math.min(...tutti);
    let max = Math.max(...tutti);
    if (opz.tipo === "colonne" || opz.daZero) min = Math.min(0, min);
    const t = opz.dominio
      ? { min: opz.dominio[0], max: opz.dominio[1], lista: opz.valoriAsse || tacche(opz.dominio[0], opz.dominio[1]).lista.filter((v) => v >= opz.dominio[0] && v <= opz.dominio[1]) }
      : tacche(min, max);
    const y = scala(t.min, t.max, pb, pt);
    const passo = n > 1 ? (pr - pl) / (opz.tipo === "colonne" ? n : n - 1) : 0;
    const x = opz.tipo === "colonne" ? (i) => pl + passo * (i + 0.5) : (i) => (n > 1 ? pl + passo * i : (pl + pr) / 2);

    const svgEl = s("svg", {
      class: "grafico-svg", width: W, height: H, viewBox: `0 0 ${W} ${H}`,
      role: "img", "aria-label": opz.descrizione || "",
    });
    // Tutto quello che è dato resta dentro il riquadro, anche i valori fuori scala.
    const idRitaglio = `ritaglio-${++contatore}`;
    svgEl.append(s("defs", {}, s("clipPath", { id: idRitaglio }, s("rect", { x: pl - 4, y: pt - 4, width: pr - pl + 8, height: pb - pt + 8 }))));
    const dati = s("g", { "clip-path": `url(#${idRitaglio})` });

    // Fasce di significato (per esempio le zone della Forma), con il nome scritto dentro.
    const nomiZone = [];
    let riferimentoNome = null;
    if (opz.zone) {
      for (const z of opz.zone) {
        const ya = y(Math.min(t.max, z.a ?? t.max));
        const yd = y(Math.max(t.min, z.da ?? t.min));
        if (yd - ya < 2) continue;
        svgEl.append(s("rect", { class: `zona ${z.classe || ""}`, x: pl, y: ya, width: pr - pl, height: yd - ya }));
        if (yd - ya >= 14) nomiZone.push(s("text", { class: "zona-nome", x: pl + 6, y: ya + 12 }, z.nome));
      }
    }

    // Griglia e asse verticale.
    for (const v of t.lista) {
      svgEl.append(s("line", { class: v === 0 ? "asse" : "griglia", x1: pl, x2: pr, y1: y(v), y2: y(v) }));
      svgEl.append(s("text", { class: "etichetta-asse", x: pl - 6, y: y(v) + 4, "text-anchor": "end" },
        opz.formatoAsse ? opz.formatoAsse(v) : numero(v, Number.isInteger(v) ? 0 : 1)));
    }
    for (const tx of tacheX(opz.etichette, opz.date)) {
      svgEl.append(s("text", { class: "etichetta-asse", x: x(tx.i), y: H - 8, "text-anchor": "middle" }, tx.testo));
    }

    svgEl.append(dati);
    if (opz.banda) dati.append(s("path", { class: "banda", d: percorsoBanda(opz.banda.basso, opz.banda.alto, x, y) }));

    if (opz.riferimento) {
      const yr = y(opz.riferimento.valore);
      svgEl.append(s("line", { class: "riferimento", x1: pl, x2: pr, y1: yr, y2: yr }));
      riferimentoNome = s("text", { class: "riferimento-nome", x: pl + 6, y: yr - 6 }, opz.riferimento.etichetta);
    }

    if (opz.tipo === "colonne") {
      const larghezzaColonna = Math.max(1, Math.min(24, passo >= 6 ? passo - 2 : passo * 0.7));
      const se = opz.serie[0];
      const d = se.valori.map((v, i) => (valido(v) && v > 0 ? colonna(x(i), larghezzaColonna, y(0), y(v)) : "")).join("");
      dati.append(s("path", { class: `colonne serie-${se.classe}`, d }));
    } else {
      for (const se of opz.serie) {
        dati.append(s("path", { class: `linea serie-${se.classe}`, d: percorso(se.valori, x, y) }));
        // punti isolati (un giorno con dato tra due vuoti) altrimenti non si vedrebbero
        se.valori.forEach((v, i) => {
          if (valido(v) && !valido(se.valori[i - 1]) && !valido(se.valori[i + 1])) {
            dati.append(s("circle", { class: `punto serie-${se.classe}`, cx: x(i), cy: y(v), r: 3 }));
          }
        });
      }
      // Il valore in fondo a ogni linea, se le linee finiscono abbastanza lontane.
      const finali = opz.serie.map((se) => {
        for (let i = n - 1; i >= 0; i--) if (valido(se.valori[i])) return { se, i, v: se.valori[i] };
        return null;
      }).filter(Boolean);
      const lontane = finali.length < 2 || Math.abs(y(finali[0].v) - y(finali[1].v)) >= 16;
      const dentroY = (v) => Math.max(pt, Math.min(pb, y(v)));
      for (const f of finali) {
        svgEl.append(s("circle", { class: `punto-finale serie-${f.se.classe}`, cx: x(f.i), cy: dentroY(f.v), r: 4 }));
        if (lontane && opz.serie.length <= 2) {
          svgEl.append(s("text", { class: "etichetta-finale", x: x(f.i) + 8, y: dentroY(f.v) + 4 }, f.se.formato(f.v)));
        }
      }
    }
    for (const n of nomiZone) svgEl.append(n);
    if (riferimentoNome) svgEl.append(riferimentoNome);

    // Mirino e tooltip: si muove col dito, col mouse o con le frecce della tastiera.
    const mirino = s("line", { class: "mirino", x1: 0, x2: 0, y1: pt, y2: pb, visibility: "hidden" });
    const evidenza = s("g", { class: "evidenza" });
    const sopra = s("rect", {
      class: "sopra", x: pl, y: pt, width: Math.max(1, pr - pl), height: pb - pt, tabindex: 0,
      role: "button", "aria-label": `${opz.descrizione || "Grafico"}. Usa le frecce per leggere i valori giorno per giorno.`,
    });
    svgEl.append(mirino, evidenza, sopra);

    let corrente = null;
    function mostra(i) {
      corrente = Math.max(0, Math.min(n - 1, i));
      const xi = x(corrente);
      mirino.setAttribute("x1", xi);
      mirino.setAttribute("x2", xi);
      mirino.setAttribute("visibility", "visible");
      evidenza.replaceChildren();
      const righe = [];
      for (const se of opz.serie) {
        const v = se.valori[corrente];
        if (opz.tipo === "linee" && valido(v)) {
          evidenza.append(s("circle", { class: `punto-finale serie-${se.classe}`, cx: xi, cy: Math.max(pt, Math.min(pb, y(v))), r: 4 }));
        }
        righe.push(h("div", { class: "tooltip-riga" },
          h("span", { class: `chiave chiave-${opz.tipo === "colonne" ? "colonna" : "linea"} serie-${se.classe}`, "aria-hidden": "true" }),
          h("strong", {}, valido(v) ? se.formato(v) : "—"),
          h("span", {}, se.nome)));
      }
      if (opz.banda && valido(opz.banda.basso[corrente])) {
        righe.push(h("div", { class: "tooltip-riga tooltip-piccola" },
          h("span", { class: "chiave chiave-banda", "aria-hidden": "true" }),
          h("span", {}, `${opz.banda.nome} ${numero(opz.banda.basso[corrente])}–${numero(opz.banda.alto[corrente])}`)));
      }
      suggerimento.replaceChildren(
        h("div", { class: "tooltip-data" }, opz.date ? dataLunga(opz.etichette[corrente]) : opz.etichette[corrente]),
        ...righe);
      suggerimento.hidden = false;
      const lw = suggerimento.offsetWidth || 160;
      const sinistra = xi + 12 + lw > W ? xi - 12 - lw : xi + 12;
      suggerimento.style.left = `${Math.max(0, sinistra)}px`;
      suggerimento.style.top = `${pt}px`;
    }
    function nascondi() {
      mirino.setAttribute("visibility", "hidden");
      evidenza.replaceChildren();
      suggerimento.hidden = true;
    }
    function indiceDa(evento) {
      const box = svgEl.getBoundingClientRect();
      const px = evento.clientX - box.left;
      if (opz.tipo === "colonne") return Math.floor((px - pl) / passo);
      return Math.round((px - pl) / (passo || 1));
    }
    sopra.addEventListener("pointermove", (e) => mostra(indiceDa(e)));
    sopra.addEventListener("pointerdown", (e) => mostra(indiceDa(e)));
    sopra.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") nascondi(); });
    sopra.addEventListener("focus", () => mostra(corrente ?? n - 1));
    sopra.addEventListener("blur", nascondi);
    sopra.addEventListener("keydown", (e) => {
      const salti = { ArrowLeft: -1, ArrowRight: 1, PageUp: -7, PageDown: 7 };
      if (e.key in salti) { mostra((corrente ?? n - 1) + salti[e.key]); e.preventDefault(); }
      else if (e.key === "Home") { mostra(0); e.preventDefault(); }
      else if (e.key === "End") { mostra(n - 1); e.preventDefault(); }
      else if (e.key === "Escape") { nascondi(); }
    });

    area.replaceChildren(svgEl, suggerimento);
  }

  return radice;
}

// Linea minuscola per le tessere: solo la forma degli ultimi giorni, senza assi.
export function sparkline(valori, classe = "s1") {
  const W = 120;
  const H = 32;
  const indici = valori.map((v, i) => (valido(v) ? i : -1)).filter((i) => i >= 0);
  const svgEl = s("svg", { class: "sparkline", viewBox: `0 0 ${W} ${H}`, width: W, height: H, "aria-hidden": "true", focusable: "false" });
  if (indici.length < 2) return svgEl;
  const vv = indici.map((i) => valori[i]);
  let min = Math.min(...vv);
  let max = Math.max(...vv);
  if (min === max) { min -= 1; max += 1; }
  const x = scala(0, valori.length - 1, 3, W - 5);
  const y = scala(min, max, H - 4, 4);
  svgEl.append(s("path", { class: `linea serie-${classe}`, d: percorso(valori, x, y) }));
  const ultimo = indici[indici.length - 1];
  svgEl.append(s("circle", { class: `punto-finale serie-${classe}`, cx: x(ultimo), cy: y(valori[ultimo]), r: 3 }));
  return svgEl;
}
