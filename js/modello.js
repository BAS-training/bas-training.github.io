// Trasforma i dati grezzi di intervals.icu in quello che serve alla pagina:
// un calendario di giorni, il "normale" di ogni persona e lo stato del mattino.
// Niente DOM qui dentro, così tutto si prova con node (cartella test/).

export const GIORNI_STORICO = 180;   // giorni di benessere letti da intervals.icu
export const GIORNI_USCITE = 120;    // giorni di attività letti da intervals.icu

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pos = (v) => (num(v) !== null && v > 0 ? v : null);

export function p2(n) {
  return String(n).padStart(2, "0");
}

// La data di oggi sul telefono di chi guarda, nel formato di intervals.icu.
export function oggiLocale(d = new Date()) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

function utc(iso) {
  const [a, m, g] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}

export function aggiungiGiorni(iso, n) {
  return new Date(utc(iso) + n * 86400000).toISOString().slice(0, 10);
}

export function giorniTra(da, a) {
  return Math.round((utc(a) - utc(da)) / 86400000);
}

// 0 = lunedì ... 6 = domenica
export function giornoSettimana(iso) {
  return (new Date(utc(iso)).getUTCDay() + 6) % 7;
}

export function media(valori) {
  return valori.reduce((s, x) => s + x, 0) / valori.length;
}

function devStd(valori) {
  if (valori.length < 2) return 0;
  const m = media(valori);
  return Math.sqrt(valori.reduce((s, x) => s + (x - m) ** 2, 0) / (valori.length - 1));
}

export function mediana(valori) {
  const v = [...valori].sort((a, b) => a - b);
  const n = v.length;
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
}

// Un giorno di intervals.icu, con i nomi che usa la pagina.
// Le domande del mattino usano le scale 1-4 di intervals.icu, dove 1 è sempre il meglio.
export function normalizzaGiorno(w) {
  return {
    d: w.id,
    ctl: num(w.ctl),
    atl: num(w.atl),
    carico: num(w.atlLoad ?? w.ctlLoad),
    fc: pos(w.restingHR),
    hrv: pos(w.hrv),
    sonno: pos(w.sleepSecs),
    punteggioSonno: pos(w.sleepScore),
    infortunio: pos(w.injury),
    fatica: pos(w.fatigue),
    dolori: pos(w.soreness),
    note: typeof w.comments === "string" && w.comments.trim() ? w.comments.trim() : null,
  };
}

function giornoVuoto(d) {
  return normalizzaGiorno({ id: d });
}

// Un giorno per riga, dal più vecchio a oggi, anche quando intervals.icu non ha niente.
export function calendario(benessere, oggi, giorni = GIORNI_STORICO) {
  const perData = new Map();
  for (const w of benessere || []) {
    if (w && typeof w.id === "string") perData.set(w.id, normalizzaGiorno(w));
  }
  const lista = [];
  for (let i = giorni - 1; i >= 0; i--) {
    const d = aggiungiGiorni(oggi, -i);
    lista.push(perData.get(d) || giornoVuoto(d));
  }
  for (const g of lista) {
    g.forma = g.ctl !== null && g.atl !== null ? g.ctl - g.atl : null;
    g.formaPct = g.forma !== null && g.ctl > 0 ? g.forma / g.ctl : null;
  }
  return lista;
}

// Il normale di HRV di una persona, dalle notti prima del giorno i (escluso).
// Si lavora sul logaritmo perché l'HRV ha una coda lunga verso l'alto: è il metodo
// usato negli studi sul monitoraggio degli atleti. Servono almeno 14 notti.
export function baseHrv(giorni, i, finestra = 60) {
  const valori = [];
  for (let j = Math.max(0, i - finestra); j < i; j++) {
    if (giorni[j].hrv) valori.push(Math.log(giorni[j].hrv));
  }
  if (valori.length < 14) return { ok: false, n: valori.length };
  const m = media(valori);
  const sd = Math.max(devStd(valori), 0.05); // mai una fascia più stretta del 5%
  return {
    ok: true,
    n: valori.length,
    tipico: Math.exp(m),
    basso: Math.exp(m - sd),
    alto: Math.exp(m + sd),
    soglia: Math.exp(m - 0.5 * sd),
    moltoBasso: Math.exp(m - 1.5 * sd),
  };
}

// La media delle ultime 7 notti (oggi compreso), se ce ne sono almeno 4.
export function hrvSettimana(giorni, i) {
  const valori = [];
  for (let j = Math.max(0, i - 6); j <= i; j++) {
    if (giorni[j].hrv) valori.push(Math.log(giorni[j].hrv));
  }
  return valori.length >= 4 ? Math.exp(media(valori)) : null;
}

// Il battito a riposo solito: la mediana delle ultime 30 notti (oggi escluso), almeno 7.
export function baseFc(giorni, i, finestra = 30) {
  const valori = [];
  for (let j = Math.max(0, i - finestra); j < i; j++) {
    if (giorni[j].fc) valori.push(giorni[j].fc);
  }
  if (valori.length < 7) return { ok: false, n: valori.length };
  return { ok: true, n: valori.length, solito: mediana(valori) };
}

export function sommaCarico(giorni, i, n = 7) {
  let somma = 0;
  for (let j = Math.max(0, i - n + 1); j <= i; j++) somma += giorni[j].carico || 0;
  return somma;
}

const NOMI_TIPO = {
  Ride: "Bici", GravelRide: "Gravel", MountainBikeRide: "MTB", VirtualRide: "Rulli",
  EBikeRide: "E-bike", EMountainBikeRide: "E-MTB", Velomobile: "Velomobile",
  Run: "Corsa", TrailRun: "Trail", VirtualRun: "Tapis roulant", Walk: "Camminata",
  Hike: "Escursione", WeightTraining: "Palestra", Workout: "Allenamento", Yoga: "Yoga",
  Swim: "Nuoto", OpenWaterSwim: "Nuoto", Rowing: "Canottaggio", NordicSki: "Sci di fondo",
  AlpineSki: "Sci", BackcountrySki: "Scialpinismo", Elliptical: "Ellittica",
};

export const TIPI_BICI = new Set(["Ride", "GravelRide", "MountainBikeRide", "VirtualRide", "EBikeRide", "EMountainBikeRide"]);

export function nomeTipo(tipo, sorgente) {
  if (!tipo) return sorgente === "STRAVA" ? "Da Strava" : "Attività";
  return NOMI_TIPO[tipo] || tipo;
}

export function normalizzaUscite(lista) {
  return (lista || [])
    .filter((a) => a && typeof a.start_date_local === "string")
    .map((a) => ({
      id: String(a.id),
      inizio: a.start_date_local,
      d: a.start_date_local.slice(0, 10),
      tipo: typeof a.type === "string" ? a.type : null,
      nome: typeof a.name === "string" && a.name.trim() ? a.name.trim() : null,
      sorgente: typeof a.source === "string" ? a.source : null,
      secondi: pos(a.moving_time),
      metri: pos(a.distance),
      dislivello: pos(a.total_elevation_gain),
      carico: num(a.icu_training_load),
      fcMedia: pos(a.average_heartrate),
      intensita: pos(a.icu_intensity),
    }))
    .sort((a, b) => (a.inizio < b.inizio ? 1 : -1));
}

// Ore e carico per settimana (da lunedì), le ultime n settimane fino a oggi.
export function settimane(uscite, oggi, n = 12) {
  const lunedi = aggiungiGiorni(oggi, -giornoSettimana(oggi));
  const lista = [];
  for (let k = n - 1; k >= 0; k--) {
    const inizio = aggiungiGiorni(lunedi, -7 * k);
    lista.push({ inizio, fine: aggiungiGiorni(inizio, 6), secondi: 0, carico: 0, uscite: 0 });
  }
  for (const u of uscite) {
    const k = Math.floor(giorniTra(lista[0].inizio, u.d) / 7);
    if (k < 0 || k >= lista.length) continue;
    lista[k].secondi += u.secondi || 0;
    lista[k].carico += u.carico || 0;
    lista[k].uscite += 1;
  }
  return lista;
}

function normalizzaAtleta(a) {
  if (!a || typeof a !== "object") return { nome: "" };
  const nome = (typeof a.firstname === "string" && a.firstname.trim())
    || (typeof a.name === "string" && a.name.trim().split(/\s+/)[0])
    || "";
  return { nome };
}

// Tutto quello che serve alle viste, calcolato una volta sola.
export function costruisciModello({ atleta, benessere, uscite }, oggi = oggiLocale()) {
  const giorni = calendario(benessere, oggi);
  const i = giorni.length - 1;
  const oggiG = giorni[i];
  const ieri = giorni[i - 1];
  // Lo stato dell'allenamento "del mattino" è quello di fine ieri: se oggi c'è già un giro,
  // intervals.icu lo conta nel giorno, e il consiglio va dato com'era prima di uscire.
  const mattino = ieri && ieri.ctl !== null ? ieri : oggiG;
  const listaUscite = normalizzaUscite(uscite);
  return {
    oggi,
    giorni,
    atleta: normalizzaAtleta(atleta),
    notteArrivata: Boolean(oggiG.hrv || oggiG.fc || oggiG.sonno),
    hrvMisurato: giorni.some((g) => g.hrv),
    base: { hrv: baseHrv(giorni, i), fc: baseFc(giorni, i) },
    hrvSettimana: hrvSettimana(giorni, i),
    mattino: {
      ctl: mattino.ctl,
      atl: mattino.atl,
      forma: mattino.forma,
      formaPct: mattino.formaPct,
      rapporto: mattino.ctl > 0 && mattino.atl !== null ? mattino.atl / mattino.ctl : null,
    },
    settimana: { carico: sommaCarico(giorni, i), solito: mattino.ctl !== null ? mattino.ctl * 7 : null },
    fitness28: giorni[i - 28] ? giorni[i - 28].ctl : null,
    caricoMese: sommaCarico(giorni, i - 1, 28),
    uscite: listaUscite,
  };
}

// Le sfide per la pagina Obiettivo. Le soglie di Fitness sono ordini di grandezza
// presi da ciclisti che queste cose le hanno fatte: dicono "ci arrivi", non "vinci".
export const SFIDE = [
  { id: "giornata", nome: "Una giornata lunga", descrizione: "100 km o 4-5 ore in sella, con qualche salita.", minimo: 35, comodo: 50 },
  { id: "weekend", nome: "Due o tre giorni di fila", descrizione: "Un weekend in bikepacking o un evento di 2-3 giorni, 100-150 km al giorno.", minimo: 45, comodo: 60 },
  { id: "settimana", nome: "Una settimana di viaggio", descrizione: "7-10 giorni di fila, 120-180 km al giorno.", minimo: 60, comodo: 75 },
  { id: "grande", nome: "Due settimane e oltre", descrizione: "Un grande viaggio, 200 km al giorno per due settimane.", minimo: 65, comodo: 85 },
];

// Dove arriva la Fitness con un carico settimanale costante (stessa formula di intervals.icu).
export function proiettaFitness(fitness, caricoSettimanale, giorni) {
  const quotidiano = caricoSettimanale / 7;
  let f = fitness;
  for (let k = 0; k < giorni; k++) f += (quotidiano - f) / 42;
  return f;
}

// Il carico settimanale costante che porta la Fitness all'obiettivo in quei giorni.
export function caricoNecessario(fitness, obiettivo, giorni) {
  if (giorni <= 0) return null;
  const k = Math.pow(41 / 42, giorni);
  return Math.max(0, ((obiettivo - fitness * k) / (1 - k)) * 7);
}

export const PUNTI_ORA_TRANQUILLA = 50;
