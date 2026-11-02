// Le frasi della stima delle ore (1.11 della specifica), costruite dal risultato di stimaH.
// Regole di scrittura del 7.1. Del tu, frasi brevi, nessun carattere dei due punti, durate in
// parole, H sempre alla mezz'ora, mai watt, punti o percentuali, e mai il dislivello di lavoro.
// Niente DOM, così le prove le compongono con node.

import { daIso, formatoDurata } from "./formato.js?v=202611022140";
import { PASSO, STIMA } from "./parametri.js?v=202611022140";
import { arrotondaMezzora } from "./stima.js?v=202611022140";

const MINUTI = STIMA.arrotondaMinuti;
const fmtGiorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long" });

export const DISLIVELLO_NON_PUBBLICATO = "dislivello non ancora pubblicato";
export const IN_CALENDARIO = "In calendario è un giorno in più.";

export const DA_DOVE_VENGONO = Object.freeze({
  titolo: "Da dove vengono questi numeri",
  testo: "Le ore vengono dalla fisica della bici, con i km e il dislivello ufficiali, il tuo peso, le borse e il tuo passo. Sono stime, per questo vedi una forbice. Contano anche testa, meteo e quanto dormi in viaggio, che nessun numero vede.",
});

// Chi va in e-bike (1.8). La scelta non compare dove l'e-bike è vietata.
export const EBIKE = Object.freeze({
  scelta: "Vado con la e-bike",
  domanda: "Quante ore pensi di stare in sella al giorno?",
  autonomia: "Controlla l'autonomia con la bici carica.",
});

// I giri del passo personale nella pagina dei numeri (1.6).
export const PASSO_GIRI = Object.freeze({
  tolto: "Non usato per il tuo passo, sembra diverso dagli altri.",
  escludi: "Non usare questo giro per il mio passo",
  rimetti: "Rimettilo",
});

// 1500 diventa «1.500». Intl in italiano mette il punto solo da 10.000, i testi lo vogliono sempre.
export function migliaia(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Ore già alla mezz'ora, in parole. 1 «1 ora», 7,5 «7 ore e mezza», 0,5 «mezz'ora».
export function oreInParole(ore) {
  const intere = Math.floor(ore + 1e-9);
  const mezza = ore - intere >= 0.25;
  if (intere === 0) return mezza ? "mezz'ora" : "0 ore";
  const base = intere === 1 ? "1 ora" : `${intere} ore`;
  return mezza ? `${base} e mezza` : base;
}

// Un estremo della forbice. La parola ore arriva con la frase, salvo la mezza.
function estremo(ore) {
  return Number.isInteger(ore) ? String(ore) : oreInParole(ore);
}

// Minuti in parole come vuole il 7.1, con formatoDurata di js/formato.js. «25 minuti», «30 minuti»,
// «1 ora e 20», «3 ore e mezza». null sotto la metà del passo, perché zero minuti non si dicono.
export function durataInParole(minuti) {
  return typeof minuti === "number" && minuti >= MINUTI.passo / 2 ? formatoDurata(minuti) : null;
}

const chili = (kg) => (Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace(".", ","));

// «del 12 aprile», «dell'8 maggio».
function delGiorno(iso) {
  const giorno = Number(iso.slice(8, 10));
  return ([1, 8, 11].includes(giorno) ? "dell'" : "del ") + fmtGiorno.format(daIso(iso));
}

const avviso = (stima, tipo) => (stima && Array.isArray(stima.avvisi) ? stima.avvisi.find((a) => a.tipo === tipo) || null : null);
const oreDette = (stima) => stima.fonte.tipo === "scelta" || stima.fonte.tipo === "ebike";

function fraseStrada(stima) {
  const { kmGiorno: km, metriGiorno: metri } = stima;
  if (km === null) return null;
  const alGiorno = stima.giorni > 1 ? " al giorno" : "";
  if (metri !== null) return `Sono circa ${migliaia(km)} km e ${migliaia(metri)} m di salita${alGiorno}.`;
  if (avviso(stima, "dislivelloNonPubblicato")) return `Sono circa ${migliaia(km)} km${alGiorno}, ${DISLIVELLO_NON_PUBBLICATO}.`;
  return `Sono circa ${migliaia(km)} km${alGiorno}.`;
}

// «Ogni giorno starai in sella circa 8 ore e mezza, fra 7 e 10. Con le soste sei fuori da 10 ore
// e mezza a 12. Sono circa 115 km e 1.500 m di salita al giorno.»
export function fraseGiornata(stima) {
  if (!stima || stima.mezzore.H === null) return null;
  const z = stima.mezzore;
  const detta = oreDette(stima);
  const ore = `${detta ? "" : "circa "}${oreInParole(z.H)}`;
  const forbice = !detta && z.basso !== z.alto ? `, fra ${estremo(z.basso)} e ${estremo(z.alto)}` : "";
  let prima = `Starai in sella ${ore}${forbice}.`;
  if (stima.giorni >= STIMA.giorniEffettivi.daGiorni) prima = `In media starai in sella ${ore} al giorno${forbice}.`;
  else if (stima.giorni > 1) prima = `Ogni giorno starai in sella ${ore}${forbice}.`;
  const soste = z.giornataMin === z.giornataMax
    ? `Con le soste sei fuori circa ${oreInParole(z.giornataMin)}.`
    : `Con le soste sei fuori da ${estremo(z.giornataMin)} a ${estremo(z.giornataMax)}.`;
  return [prima, soste, fraseStrada(stima)].filter(Boolean).join(" ");
}

// Per 11 giorni e più, la giornata normale accanto alla media (1.1).
export function fraseGiornataNormale(stima) {
  if (!stima || stima.mezzore.Hn === null) return null;
  return `Una giornata normale dura circa ${oreInParole(stima.mezzore.Hn)}, e ogni 5-7 giorni ne conviene una più corta.`;
}

// Per 2-5 giorni con H da 9 ore in su, sempre (regola 7.7).
export function fraseGiornoInPiu(stima) {
  const a = avviso(stima, "giornoInPiu");
  return a ? `Con un giorno in più la giornata scende a circa ${oreInParole(arrotondaMezzora(a.H))}.` : null;
}

// La frase delle borse di 1.11, l'unica che dice la mezz'ora a parole, «circa mezz'ora in più».
export function fraseBorse(stima) {
  const a = avviso(stima, "borse");
  const durata = a ? durataInParole(a.ore * 60) : null;
  const quanto = durata === formatoDurata(30) ? "mezz'ora" : durata;
  if (!quanto) return null;
  return `Con ${chili(a.kg)} kg di borse la giornata dura circa ${quanto} in più. In salita i chili pesano, in discesa non restituiscono niente.`;
}

// La riga sulla fonte della stima (1.11 e 1.6).
export function fraseFonte(stima) {
  if (!stima || !stima.fonte) return null;
  const f = stima.fonte;
  const minimi = PASSO.giriMinimi;
  switch (f.tipo) {
    case "giri": return `Lo calcolo dai tuoi ultimi ${f.giri} giri lunghi.`;
    case "ftp": return "Lo calcolo dalla tua potenza.";
    case "media": return `Lo calcolo dalla media che mi hai detto. Con ${minimi} giri lunghi registrati la stima diventa tua.`;
    case "nessuna": return `È una stima prudente, perché non conosco ancora il tuo passo. Con ${minimi} giri lunghi registrati diventa tua.`;
    case "uscitaCarica": return f.uscite > 1 ? `Lo calcolo dalle tue ${f.uscite} uscite con le borse.` : `Lo calcolo dalla tua uscita con le borse ${delGiorno(f.data)}.`;
    case "viaggioCarico": return `Lo calcolo dal tuo viaggio con le borse ${delGiorno(f.data)}.`;
    case "ebike": return stima.H === null ? null : "Sono le ore che mi hai detto, perché con la e-bike spinge anche il motore.";
    default: return null;
  }
}

// Le ore da proporre a chi va in e-bike, «4 ore» ... «9 ore».
export function scelteOreEbike() {
  return STIMA.oreEbike.map(oreInParole);
}

// Gli ingressi di esempio dei modelli che vogliono una stima, che la prova della scrittura (9.8) non
// sa costruire da sola. Ogni voce è una lista di argomenti.
export const ESEMPI = Object.freeze({
  fraseBorse: [[{ avvisi: [{ tipo: "borse", kg: 8, ore: 0.5 }] }], [{ avvisi: [{ tipo: "borse", kg: 12.5, ore: 1.2 }] }]],
  fraseGiornoInPiu: [[{ avvisi: [{ tipo: "giornoInPiu", giorni: 5, H: 7.6 }] }]],
  fraseFonte: [
    [{ H: 7.5, fonte: { tipo: "giri", giri: 9 } }], [{ H: 7.5, fonte: { tipo: "ftp" } }], [{ H: 7.5, fonte: { tipo: "media" } }],
    [{ H: 7.5, fonte: { tipo: "nessuna" } }], [{ H: 7.5, fonte: { tipo: "uscitaCarica", uscite: 2 } }],
    [{ H: 7.5, fonte: { tipo: "uscitaCarica", uscite: 1, data: "2027-04-12" } }], [{ H: 7.5, fonte: { tipo: "viaggioCarico", data: "2027-04-08" } }],
    [{ H: 7.5, fonte: { tipo: "ebike" } }],
  ],
});

// Tutte le righe della stima, nell'ordine della pagina. Con la e-bike senza risposta, la domanda.
export function righeStima(stima) {
  if (!stima) return [];
  if (stima.H === null) return avviso(stima, "ebike") ? [EBIKE.domanda] : [];
  return [
    fraseGiornata(stima),
    fraseGiornataNormale(stima),
    avviso(stima, "giorniDalVia") ? IN_CALENDARIO : null,
    fraseGiornoInPiu(stima),
    fraseBorse(stima),
    fraseFonte(stima),
    avviso(stima, "autonomia") ? EBIKE.autonomia : null,
  ].filter(Boolean);
}
