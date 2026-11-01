// Come si scrivono numeri, durate e date nella pagina, all'italiana.
// Nessun riferimento al DOM: lo usano anche i test con node.

import { STIMA } from "./parametri.js?v=202610312043";

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

// 5430 secondi -> "1h31", 2400 -> "40 min". La forma corta per tabelle e assi dei grafici. Nei testi
// della pagina le durate si scrivono in parole, con formatoDurata.
export function durata(secondi) {
  if (!valido(secondi)) return "—";
  const minuti = Math.round(secondi / 60);
  const ore = Math.floor(minuti / 60);
  return ore ? `${ore}h${String(minuti % 60).padStart(2, "0")}` : `${minuti} min`;
}

// Le regole di scrittura del capitolo 7.1, con i passi di STIMA.arrotondaMinuti.
const MINUTI = STIMA.arrotondaMinuti;

function oreInParole(ore) {
  return ore === 1 ? "1 ora" : `${ore} ore`;
}

// La durata in parole, dai minuti. Sotto l'ora «45 minuti», poi «1 ora e 20», «3 ore e mezza»,
// «4 ore e 10», arrotondate a 5 minuti sotto le 2 ore e a 10 minuti sopra. Anche la mezz'ora si
// scrive «30 minuti», come ogni durata sotto l'ora. È la sola funzione delle durate nei testi.
export function formatoDurata(minuti) {
  if (!valido(minuti) || minuti < 0) return "";
  const passo = minuti < MINUTI.lungheDa ? MINUTI.passo : MINUTI.passoLunghe;
  const tondi = Math.round(minuti / passo) * passo;
  if (tondi === 0) return minuti > 0 ? `meno di ${MINUTI.passo} minuti` : "0 minuti";
  if (tondi < 60) return `${tondi} minuti`;
  const ore = Math.floor(tondi / 60);
  const resto = tondi % 60;
  if (!resto) return oreInParole(ore);
  return resto === 30 ? `${oreInParole(ore)} e mezza` : `${oreInParole(ore)} e ${resto}`;
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
