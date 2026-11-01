// La composizione dei modelli dei testi come la fa la prova della scrittura (9.8), per le prove dei
// moduli. Ogni funzione esportata da un file dei testi si chiama con i valori di prova di 9.8 e con
// gli ingressi di esempio che il file esporta in ESEMPI. Una funzione che non dà nessun testo è muta.
// Non è un file di prove, lo usano test/piano.test.mjs, test/prontezza.test.mjs e test/stima.test.mjs.

const NUMERI = [0, 1, 2, 3, 5, 7, 9, 12, 14, 45, 80, 210, 400];
const PAROLE = ["domenica 14 marzo", "8.30", "1 ora e 20", "4 ore e 10", "7 ore e mezza", "Tuscany Trail", "il weekend lungo", "1,3", "Oggi riposo o 30-45 minuti di recupero."];

// Un oggetto qualsiasi, per i modelli che ricevono un oggetto. Ogni campo vale 3, come in 9.8.
const QUALSIASI = new Proxy({}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => 3 : k === "toString" || k === "valueOf" ? () => "3" : 3),
});

function componi(fn, esempi = []) {
  const n = Math.max(fn.length, 1);
  const prove = [Array(n).fill(null), Array(n).fill(QUALSIASI)];
  for (const x of NUMERI) prove.push(Array(n).fill(x));
  for (const p of PAROLE) prove.push(Array(n).fill(p));
  for (const x of [1, 2, 7]) {
    for (const p of PAROLE) {
      prove.push([x, ...Array(n - 1).fill(p)]);
      prove.push([...Array(n - 1).fill(x), p]);
    }
  }
  prove.push(...esempi);
  const risultati = [];
  for (const argomenti of prove) {
    try {
      const r = fn(...argomenti);
      if (r !== undefined && r !== null) risultati.push(r);
    } catch { /* una combinazione che il modello non accetta */ }
  }
  return risultati;
}

function stringhe(valore, lista) {
  if (typeof valore === "string") lista.push(valore);
  else if (Array.isArray(valore)) valore.forEach((v) => stringhe(v, lista));
  else if (valore && typeof valore === "object") Object.values(valore).forEach((v) => stringhe(v, lista));
  return lista;
}

// Per un modulo dei testi { muti, testi }, con i nomi delle funzioni che non danno nessun testo e
// tutte le stringhe, quelle fisse e quelle composte. ESEMPI non è un testo e non si legge.
export function componiModulo(modulo) {
  const esempi = modulo.ESEMPI && typeof modulo.ESEMPI === "object" ? modulo.ESEMPI : {};
  const muti = [];
  const testi = [];
  const visita = (valore, nome) => {
    if (typeof valore === "function") {
      const risultati = componi(valore, Array.isArray(esempi[nome]) ? esempi[nome] : []);
      if (!risultati.length) muti.push(nome);
      for (const r of risultati) stringhe(r, testi);
    } else if (Array.isArray(valore)) valore.forEach((v) => visita(v, nome));
    else if (valore && typeof valore === "object") Object.values(valore).forEach((v) => visita(v, nome));
    else if (typeof valore === "string") testi.push(valore);
  };
  for (const [nome, valore] of Object.entries(modulo)) if (nome !== "ESEMPI") visita(valore, nome);
  return { muti, testi };
}
