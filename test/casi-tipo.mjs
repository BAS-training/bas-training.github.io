// I quattro casi tipo del capitolo 8, nella sola forma anonima che sta nel repository (8.8). Sono
// quattro persone inventate, con nomi, date e numeri inventati, che somigliano ai quattro tipi di
// viaggio della taratura privata. Un viaggio lungo ben preparato, uno lungo senza prove con le
// borse, uno corto con tanta Fitness e uno corto poco preparato. I dati veri restano nella cartella
// privata e li rifà strumenti/taratura.mjs.
// Le uscite sono nella forma delle risposte di intervals.icu (6.2), con le ore alla mezz'ora, e le
// risposte date sul telefono stanno a parte, per id, come in comesto.uscite.v1. Nessuna notte, solo il
// carico di un giorno per lo stub da Strava. Le usa test/catena.test.mjs, che le fa passare da dati,
// stima, prontezza, piano e carico. Si lanciano le prove, non questo file.

const GIORNO_MS = 86400000;
const ORA = 3600;

const piu = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * GIORNO_MS).toISOString().slice(0, 10);

// Velocità e salita tipiche per tipo, per avere km e metri plausibili. Con le borse si va più piano.
const PASSO_TIPO = {
  Ride: { kmh: 24, salita: 10 },
  GravelRide: { kmh: 19, salita: 14 },
  VirtualRide: { kmh: 30, salita: 0 },
};

// Il registro delle uscite di una persona. uscita(d, ore, opzioni) mette un'uscita a d giorni dalla
// partenza (d negativo). Il carico è quello di intervals.icu dalla potenza, ore × IF² × 100. Le uscite
// di almeno 3 ore hanno la risposta «No» alle borse, salvo opzioni diverse, e borse null vuol dire
// senza risposta.
function registro(prefisso, partenza) {
  let n = 0;
  const attivita = [];
  const detti = {};
  const uscita = (d, ore, o = {}) => {
    n += 1;
    const id = o.id || `${prefisso}${1000 + n}`;
    const tipo = o.tipo || "Ride";
    const passo = PASSO_TIPO[tipo];
    const km = o.km ?? Math.round(ore * (o.kmh ?? passo.kmh));
    const metri = o.metri ?? Math.round(km * (o.salita ?? passo.salita));
    const intensita = o.intensita ?? (ore >= 4 ? 0.64 : 0.7);
    const secondi = Math.round(ore * ORA);
    attivita.push({
      id,
      start_date_local: `${piu(partenza, d)}T${o.ora || "08:00"}:00`,
      type: tipo,
      name: o.nome || null,
      source: o.fonte || "WAHOO",
      moving_time: secondi,
      elapsed_time: Math.round(secondi * 1.15),
      distance: km * 1000,
      total_elevation_gain: metri,
      icu_training_load: Math.round(ore * 100 * intensita ** 2),
      device_watts: o.potenza !== false,
      has_heartrate: true,
      average_heartrate: o.battito ?? 126,
      trainer: tipo === "VirtualRide",
      commute: false,
    });
    const risposta = {};
    if (o.borse !== undefined) risposta.borse = o.borse;
    else if (ore >= 3) risposta.borse = "no";
    if (o.notteFuori !== undefined) risposta.notteFuori = o.notteFuori;
    if (o.kg !== undefined) risposta.kg = o.kg;
    if (Object.keys(risposta).length) detti[id] = risposta;
    return id;
  };
  // Le uscite della settimana −k, ai giorni del suo blocco di 7 (0 è il giorno −7k).
  const settimana = (k, giri) => {
    for (const [g, ore, o] of giri) uscita(-7 * k + g, ore, o);
  };
  // Un viaggio con le borse dal giorno d, un giorno per ogni voce di ore, con la notte fuori dal
  // secondo giorno.
  const viaggio = (d, ore, o = {}) => ore.map((h, i) => uscita(d + i, h, { borse: "evento", kg: 10, notteFuori: i > 0, ...o }));
  return { attivita, detti, uscita, settimana, viaggio };
}

const atleta = (ftp) => ({ firstname: "Prova", timezone: "Europe/Rome", sportSettings: [{ types: ["Ride", "GravelRide", "VirtualRide"], ftp, lthr: 158, max_hr: 182 }] });

// --- Marco, un viaggio lungo ben preparato ---

// Marco va alla NorthCape4000 da Berlino in 14 giorni. Un test con le borse alla −11, un viaggio di
// tre giorni alla −8 che fa la prova generale ma non il blocco, e un viaggio di quattro giorni finito
// 34 giorni prima che vale insieme blocco e prova generale, con l'avviso (2.4). Le ore a settimana
// stanno fra il minimo e il comodo, quindi pronto senza margine. Con senzaBorse il viaggio di quattro
// giorni è senza le borse dell'evento, e manca il blocco.
export function marco({ senzaBorse = false } = {}) {
  const partenza = "2027-07-29";
  const r = registro("m", partenza);
  const f = { intensita: 0.64 };
  const prima = [[1, 1.5, f], [3, 2, { ...f, tipo: "VirtualRide" }], [5, 4.5], [6, 1.5, f]];
  const base = [[1, 1.5, f], [3, 1.5, { ...f, tipo: "VirtualRide" }], [5, 4], [6, 1.5, f]];
  const dopo = [[2, 1.5, f], [4, 1.5, f], [6, 3, f]];
  for (let k = 26; k >= 12; k--) r.settimana(k, prima);
  r.settimana(11, [[1, 1.5, f], [4, 4, { borse: "evento", kg: 10, kmh: 18 }], [6, 2, f]]);
  r.settimana(10, base);
  r.settimana(9, base);
  r.settimana(8, [[0, 1.5, f], [6, 1, f]]);
  r.viaggio(-53, [6, 5.5, 4], { kmh: 18 });
  r.settimana(7, dopo);
  r.settimana(6, [[0, 1, f]]);
  r.viaggio(-37, [7, 6.5, 6, 5.5], { kmh: 18, ...(senzaBorse ? { borse: "no", kg: undefined, notteFuori: undefined } : {}) });
  r.settimana(5, dopo);
  r.settimana(4, base);
  r.settimana(3, base);
  r.settimana(2, [[1, 1.5, f], [3, 1, f], [5, 2.5, f], [6, 1, f]]);
  r.settimana(1, [[1, 1, f], [3, 1, f], [5, 1.5, f]]);
  // Lo stesso giro della −4 arriva anche da un secondo dispositivo, 3 minuti dopo e senza potenza.
  const doppio = r.attivita.find((a) => a.start_date_local.startsWith(piu(partenza, -23)));
  r.attivita.push({ ...doppio, id: "m9001", source: "GARMIN_CONNECT", start_date_local: doppio.start_date_local.replace("08:00", "08:03"), moving_time: Math.round(doppio.moving_time * 0.97), device_watts: false, icu_training_load: Math.round(doppio.icu_training_load * 0.9) });
  return {
    nome: "Marco",
    tipo: "un viaggio lungo ben preparato",
    percorso: "nc4k-berlino",
    giorni: 14,
    partenza,
    vigilia: piu(partenza, -1),
    profilo: { pesoFascia: 3, bici: "strada" },
    atleta: atleta(220),
    esperienza: "3",
    disponibilita: { giorni: [1, 3, 4, 5, 6], ore: 12 },
    attivita: r.attivita,
    detti: r.detti,
    benessere: [],
    doppio: { tenuta: doppio.id, tolta: "m9001" },
    atteso: senzaBorse
      ? { classe: "11+", fonte: "viaggioCarico", esito: "quasiPronto", difetti: [0, 0, 1, 0], prove: { T1: "fatta", blocco: "manca", T3: "fatta" }, avvisi: ["intensita"], variante: "esperto", specchio: "inLinea", fiducia: "alta" }
      : { classe: "11+", fonte: "viaggioCarico", esito: "pronto", difetti: [0, 0, 0, 0], prove: { T1: "fatta", blocco: "fatta", T3: "fatta" }, doppioUso: true, avvisi: ["doppioUso"], specchio: "inLinea", fiducia: "alta" },
    piani: [{ settimanePrima: 12, schema: "C", avvisi: ["ventiSettimane"], esito: "pronto", frase: "Se segui il piano, ci arrivi pronto." }],
  };
}

// --- Anna, un viaggio lungo senza prove con le borse ---

// Anna va alla Final Frontier Patagonia completa in 21 giorni e ha già fatto viaggi. Ha le ore e le
// uscite lunghe, ma nessuna risposta «Sì, come all'evento». Tre giorni lunghi di fila senza risposta
// sulle borse finiscono 15 giorni prima. Quasi pronto con il testo di chi ha esperienza. Con
// bloccoCarico i tre giorni sono dichiarati con le borse, valgono test e blocco fatti tardi, e la prova
// generale manca lo stesso, perché ogni uscita vale una prova sola.
export function anna({ bloccoCarico = false } = {}) {
  const partenza = "2027-03-06";
  const r = registro("a", partenza);
  const base = [[1, 1], [3, 1, { tipo: "VirtualRide" }], [5, 3.5], [6, 1]];
  for (let k = 26; k >= 4; k--) r.settimana(k, base);
  r.settimana(3, [[1, 1.5], [3, 1.5]]);
  r.viaggio(-17, [7, 6.5, 6.5], { kmh: 21, borse: bloccoCarico ? "evento" : null, kg: bloccoCarico ? 12 : undefined, notteFuori: undefined });
  r.settimana(2, [[3, 1.5], [5, 2.5], [6, 1]]);
  r.settimana(1, [[1, 1], [3, 1], [5, 1.5]]);
  return {
    nome: "Anna",
    tipo: "un viaggio lungo senza prove con le borse",
    percorso: "ffp-completo",
    giorni: 21,
    partenza,
    vigilia: piu(partenza, -1),
    profilo: { pesoFascia: 2 },
    atleta: atleta(200),
    esperienza: "3",
    disponibilita: { giorni: [1, 3, 4, 5, 6], ore: 10 },
    attivita: r.attivita,
    detti: r.detti,
    benessere: [],
    atteso: bloccoCarico
      ? { classe: "11+", fonte: "viaggioCarico", esito: "quasiPronto", difetti: [0, 0, 1, 0], prove: { T1: "fatta", blocco: "fatta", T3: "manca" }, tardi: ["T1", "blocco"], avvisi: ["intensita"], variante: "esperto", fiducia: "alta" }
      : { classe: "11+", fonte: "ftp", esito: "quasiPronto", difetti: [0, 0, 1, 0], prove: { T1: "manca", blocco: "manca", T3: "manca" }, avvisi: ["intensita"], variante: "esperto", specchio: "inLinea", fiducia: "media" },
    piani: [{ settimanePrima: 16, schema: "C", avvisi: ["ventiSettimane"], esito: "pronto", frase: "Se segui il piano, ci arrivi pronto." }],
  };
}

// --- Luca, un viaggio corto con tanta Fitness ---

// Luca va al Tuscany Trail Originale in 4 giorni, tornato da un viaggio di 14 giorni con le borse finito
// 22 giorni prima. Le ore a settimana e l'uscita lunga sono molto sopra gli obiettivi, le prove le fa
// il viaggio, e la Fitness è sopra il confronto. Pronto, con margine.
export function luca() {
  const partenza = "2027-05-21";
  const r = registro("l", partenza);
  const base = [[1, 1.5], [3, 1.5], [5, 3], [6, 1]];
  for (let k = 26; k >= 6; k--) r.settimana(k, base);
  r.viaggio(-35, [8, 8.5, 8, 7.5, 8, 8.5, 8, 7.5, 8, 8, 7.5, 8, 8.5, 8], { tipo: "GravelRide", kmh: 15.5, intensita: 0.62 });
  r.settimana(3, [[2, 1], [4, 1.5], [6, 3]]);
  r.settimana(2, [[1, 1.5], [3, 1.5], [5, 2.5]]);
  r.settimana(1, [[1, 1], [3, 1], [5, 1.5]]);
  return {
    nome: "Luca",
    tipo: "un viaggio corto con tanta Fitness",
    percorso: "tt-originale",
    giorni: 4,
    partenza,
    vigilia: piu(partenza, -1),
    profilo: { pesoFascia: 3, bici: "gravel" },
    atleta: atleta(210),
    esperienza: "3",
    disponibilita: { ore: 10 },
    attivita: r.attivita,
    detti: r.detti,
    benessere: [],
    atteso: { classe: "2-5", fonte: "viaggioCarico", esito: "conMargine", difetti: [0, 0, 0, 0], prove: { T1: "fatta", T2: "fatta", T3: "fatta" }, avvisi: [], specchio: "sopra", fiducia: "alta" },
    // Dieci settimane prima il viaggio lungo non c'era ancora, e il piano ci arriva lo stesso.
    piani: [{ settimanePrima: 10, schema: "A", avvisi: [], esito: "pronto", frase: "Se segui il piano, ci arrivi pronto." }],
  };
}

// --- Paolo, un viaggio corto poco preparato ---

// Paolo va al Trentino Gravel Medio in 4 giorni. Poche ore, un buco di 29 giorni senza bici e
// un'uscita più lunga di 2 ore e mezza nelle ultime sei settimane. Poco pronto con tutti e quattro i
// difetti, 5 giorni consigliati, poi arrivare e adattare. Un giro da Strava arriva come stub, con il
// carico nascosto del giorno.
export function paolo() {
  const partenza = "2027-09-24";
  const r = registro("p", partenza);
  const poche = [[2, 1], [5, 1.5, { tipo: "GravelRide" }]];
  for (let k = 26; k >= 9; k--) r.settimana(k, poche);
  r.uscita(-62, 4, { tipo: "GravelRide" });
  r.uscita(-53, 1);
  // Il buco, dal giorno −52 al −24.
  r.uscita(-23, 1.5, { tipo: "GravelRide" });
  r.uscita(-17, 2, { tipo: "GravelRide" });
  r.uscita(-13, 1);
  r.uscita(-8, 2.5, { tipo: "GravelRide" });
  r.uscita(-5, 1);
  r.uscita(-3, 1.5, { tipo: "GravelRide" });
  const stub = { id: "16000000001", start_date_local: `${piu(partenza, -75)}T09:30:00`, source: "STRAVA", icu_athlete_id: "i0" };
  r.attivita.push(stub);
  return {
    nome: "Paolo",
    tipo: "un viaggio corto poco preparato",
    percorso: "tg-medio",
    giorni: 4,
    partenza,
    vigilia: piu(partenza, -1),
    profilo: { pesoFascia: 3, bici: "gravel" },
    atleta: atleta(220),
    esperienza: "3",
    disponibilita: { ore: 6 },
    attivita: r.attivita,
    detti: r.detti,
    // Il carico del giorno dello stub, che intervals.icu ha contato senza mostrarlo.
    benessere: [{ id: piu(partenza, -75), atlLoad: 60, ctlLoad: 60 }],
    stub: stub.id,
    atteso: {
      classe: "2-5", fonte: "ftp", esito: "pocoPronto", difetti: [2, 2, 1, 2], prove: { T1: "manca", T2: "manca", T3: "manca" }, avvisi: [],
      specchio: "sotto", fiducia: "alta", buco: 29, proposta: { tipo: "adattare", giorni: 5, motivo: "lunga" },
    },
    // Come 8.4, a 6 e a 4 settimane, con i piani corti 7.13 e 7.14.
    piani: [
      { settimanePrima: 6, schema: "7.13", avvisi: ["corto"], esito: "pocoPronto", frase: "Se continui così, arrivi poco pronto. Ti propongo 5 giorni.", giorni: 5 },
      { settimanePrima: 4, schema: "7.14", avvisi: ["corto"], esito: "pocoPronto", frase: "Se continui così, arrivi poco pronto. Ti propongo 5 giorni.", giorni: 5 },
    ],
  };
}

export const CASI_TIPO = Object.freeze({ marco, anna, luca, paolo });
