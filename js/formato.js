// Come si scrivono numeri, durate e date nella pagina, all'italiana.
// Nessun riferimento al DOM: lo usano anche i test con node.

const intero = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const decimali = new Map();

function conDecimali(n) {
  if (!decimali.has(n)) {
    decimali.set(n, new Intl.NumberFormat("it-IT", { minimumFractionDigits: n, maximumFractionDigits: n }));
  }
  return decimali.get(n);
}

export function valido(v) {
  return typeof v === "number" && Number.isFinite(v);
}

// 1234.5 -> "1.235", con dec=1 -> "1.234,5"; un valore mancante diventa una lineetta.
export function numero(v, dec = 0) {
  if (!valido(v)) return "—";
  return dec ? conDecimali(dec).format(v) : intero.format(Math.round(v));
}

// Con il segno davanti: +12, −3 (il meno tipografico si legge meglio del trattino).
export function segno(v, dec = 0) {
  if (!valido(v)) return "—";
  const arrotondato = dec ? Number(v.toFixed(dec)) : Math.round(v);
  const testo = numero(Math.abs(arrotondato), dec);
  if (arrotondato > 0) return "+" + testo;
  if (arrotondato < 0) return "−" + testo;
  return testo;
}

// 5430 secondi -> "1h31", 2400 -> "40 min".
export function durata(secondi) {
  if (!valido(secondi)) return "—";
  const minuti = Math.round(secondi / 60);
  const ore = Math.floor(minuti / 60);
  return ore ? `${ore}h${String(minuti % 60).padStart(2, "0")}` : `${minuti} min`;
}

// Le date arrivano da intervals.icu come "2026-10-31", nel fuso dell'atleta.
// Si costruiscono a mezzogiorno locale, così l'ora legale non sposta mai il giorno.
export function daIso(iso) {
  const [a, m, g] = iso.split("-").map(Number);
  return new Date(a, m - 1, g, 12);
}

const fmtGiornoMese = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });
const fmtMese = new Intl.DateTimeFormat("it-IT", { month: "short" });
const fmtLunga = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" });
const fmtBreve = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" });

export function giornoMese(iso) {
  return fmtGiornoMese.format(daIso(iso)).replace(".", "");
}

export function mese(iso) {
  return fmtMese.format(daIso(iso)).replace(".", "");
}

export function dataLunga(iso) {
  return fmtLunga.format(daIso(iso));
}

export function dataBreve(iso) {
  return fmtBreve.format(daIso(iso)).replace(/\./g, "");
}
