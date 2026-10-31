// Piccoli attrezzi per costruire la pagina senza mai usare innerHTML.
// Tutto quello che arriva da intervals.icu (nomi dei giri, note) diventa testo, mai codice.

const SVG_NS = "http://www.w3.org/2000/svg";

function aggiungi(el, figli) {
  for (const f of figli.flat(Infinity)) {
    if (f === null || f === undefined || f === false || f === "") continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
}

function imposta(el, attributi) {
  for (const [k, v] of Object.entries(attributi || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "on") {
      for (const [evento, fn] of Object.entries(v)) el.addEventListener(evento, fn);
    } else if (k === "class") {
      el.setAttribute("class", Array.isArray(v) ? v.filter(Boolean).join(" ") : v);
    } else if (k === "dataset") {
      Object.assign(el.dataset, v);
    } else {
      el.setAttribute(k, v === true ? "" : String(v));
    }
  }
}

export function h(tag, attributi, ...figli) {
  const el = document.createElement(tag);
  imposta(el, attributi);
  aggiungi(el, figli);
  return el;
}

export function s(tag, attributi, ...figli) {
  const el = document.createElementNS(SVG_NS, tag);
  imposta(el, attributi);
  aggiungi(el, figli);
  return el;
}

// Le icone sono tracciati semplici a 24x24, disegnati con il colore del testo.
const ICONE = {
  oggi: ["M12 3v2", "M12 19v2", "M4.2 4.2l1.4 1.4", "M18.4 18.4l1.4 1.4", "M3 12h2", "M19 12h2", "M4.2 19.8l1.4-1.4", "M18.4 5.6l1.4-1.4", "M16 12a4 4 0 1 1-8 0a4 4 0 0 1 8 0"],
  andamento: ["M3 20h18", "M4 16l5-6l4 3l7-8"],
  uscite: ["M5.5 17.5a3.5 3.5 0 1 0 0-.01", "M18.5 17.5a3.5 3.5 0 1 0 0-.01", "M5.5 17.5l4-8h6l3 8", "M9.5 9.5l3 8h-7", "M13 6h3"],
  obiettivo: ["M5 21V4", "M5 4h11l-2 4l2 4H5"],
  guida: ["M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z", "M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"],
  aggiorna: ["M20 11a8 8 0 1 0-2.3 5.7", "M20 4v7h-7"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  attenzione: ["M12 6v8", "M12 17.5v.5"],
  pausa: ["M9 6v12", "M15 6v12"],
  domanda: ["M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6", "M12 17.5v.5"],
};

export function icona(nome, classe = "icona") {
  return s("svg", { class: classe, viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" },
    (ICONE[nome] || []).map((d) => s("path", { d })));
}
