// Trasforma i dati grezzi di intervals.icu in quello che serve alla pagina:
// un calendario di giorni, il "normale" di ogni persona e lo stato del mattino.
// Niente DOM qui dentro, così tutto si prova con node (cartella test/).

import { SEMAFORO, CARICO, CHIAMATE, DATI } from "./parametri.js?v=202611021803";

export const GIORNI_STORICO = CHIAMATE.primaLetturaGiorni;   // giorni di benessere letti da intervals.icu, 6.7
export const GIORNI_USCITE = CHIAMATE.primaLetturaGiorni;    // giorni di attività letti da intervals.icu, 6.7

const ORA = 3600;
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pos = (v) => (num(v) !== null && v > 0 ? v : null);

export function p2(n) {
  return String(n).padStart(2, "0");
}

// La data di oggi sul telefono di chi guarda, nel formato di intervals.icu.
export function oggiLocale(d = new Date()) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

// La data di oggi nel fuso dell'atleta su intervals.icu (per chi viaggia o ha il telefono in un altro fuso).
export function oggiNelFuso(fuso, adesso = new Date()) {
  if (!fuso) return oggiLocale(adesso);
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(adesso);
  } catch {
    return oggiLocale(adesso);
  }
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

export function mediana(valori) {
  const v = [...valori].sort((a, b) => a - b);
  const n = v.length;
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
}

// La deviazione mediana assoluta, la DS che le notti strane non spostano (regola 5.2).
export function deviazioneMediana(valori, centro = mediana(valori)) {
  return mediana(valori.map((x) => Math.abs(x - centro)));
}

// Un giorno di intervals.icu, con i nomi che usa la pagina.
// Le domande del mattino usano le scale 1-4 di intervals.icu, dove 1 è sempre il meglio.
export function normalizzaGiorno(w) {
  return {
    d: w.id,
    ctl: num(w.ctl),
    atl: num(w.atl),
    carico: num(w.atlLoad ?? w.ctlLoad),
    // Il battito della notte. La FC media del sonno è il dato migliore, il battito a riposo di Garmin
    // è la mezz'ora più bassa delle 24 ore. Quale dei due vale lo sceglie il calendario (fonteBattito).
    fcSonno: pos(w.avgSleepingHR),
    fcRiposo: pos(w.restingHR),
    fc: pos(w.restingHR),
    // Apple misura l'HRV in un altro modo (SDNN) e intervals.icu lo mette in un campo a parte.
    // Per il confronto con il proprio normale va bene lo stesso.
    hrv: pos(w.hrv) ?? pos(w.hrvSDNN),
    sonno: pos(w.sleepSecs),
    punteggioSonno: pos(w.sleepScore),
    infortunio: pos(w.injury),
    fatica: pos(w.fatigue),
    dolori: pos(w.soreness),
  };
}

// Quanto resta di Fitness e Fatica da un giorno all'altro, con la forma scelta in js/parametri.js (6.5).
export function decadimento(giorni) {
  return CARICO.serie.forma === "passi" ? 1 - 1 / giorni : Math.exp(-1 / giorni);
}

// La FC media del sonno se c'è in almeno metà delle ultime 30 notti, altrimenti il battito a riposo (4.3).
export function fonteBattito(giorni, i = giorni.length - 1) {
  const B = SEMAFORO.battito;
  let con = 0;
  let notti = 0;
  for (let j = Math.max(0, i - B.notti + 1); j <= i; j++) {
    notti += 1;
    if (giorni[j].fcSonno) con += 1;
  }
  return notti && con >= B.quotaSonno * notti ? "sonno" : "riposo";
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
    lista.push(perData.get(d) || normalizzaGiorno({ id: d }));
  }
  const fonte = lista.length ? fonteBattito(lista) : "riposo";
  // La Fatica lenta, a 10 giorni, per il semaforo da 50 anni (regola 1.7). Parte dalla Fatica di
  // intervals.icu del primo giorno, se c'è, altrimenti da zero (6.5).
  const lenta = decadimento(CARICO.serie.faticaLenta);
  let faticaLenta = null;
  for (const g of lista) {
    g.fc = fonte === "sonno" ? g.fcSonno : g.fcRiposo;
    g.forma = g.ctl !== null && g.atl !== null ? g.ctl - g.atl : null;
    g.formaPct = g.forma !== null && g.ctl > 0 ? g.forma / g.ctl : null;
    faticaLenta = faticaLenta === null
      ? g.atl ?? (g.carico || 0) * (1 - lenta)
      : faticaLenta * lenta + (g.carico || 0) * (1 - lenta);
    g.faticaLenta = faticaLenta;
  }
  return lista;
}

// --- Le notti e le basi personali (4.3) ---

// Una notte vale per l'HRV se c'è l'HRV e il sonno è di almeno 4 ore, oppure se il sonno non arriva.
export function notteValida(giorno) {
  if (!giorno || !giorno.hrv) return false;
  return !giorno.sonno || giorno.sonno >= SEMAFORO.notteValidaOre * ORA;
}

// Per il battito vale la stessa regola del sonno, senza chiedere l'HRV.
export function notteValidaBattito(giorno) {
  if (!giorno || !giorno.fc) return false;
  return !giorno.sonno || giorno.sonno >= SEMAFORO.notteValidaOre * ORA;
}

// La DS minima dell'HRV in unità ln, secondo il dispositivo della notte (regola 5.3).
export function dsMinimaHrv(dispositivo) {
  const classe = SEMAFORO.dispositivi[dispositivo] || SEMAFORO.dispositivi[SEMAFORO.dispositivoPredefinito];
  return SEMAFORO.hrv.dsMinima[classe];
}

// Le esclusioni si passano come insieme o lista di date, oppure come funzione sul giorno.
function predicato(esclusioni) {
  if (!esclusioni) return () => false;
  if (typeof esclusioni === "function") return esclusioni;
  const date = esclusioni instanceof Set ? esclusioni : new Set(esclusioni);
  return (g) => date.has(g.d);
}

function stato(n, punti, piene) {
  return n < punti ? "taratura" : n < piene ? "provvisoria" : "piena";
}

// Il normale di HRV del giorno i, dalle notti valide fra 60 notti fa e ieri, tolte le escluse.
// Si lavora sul logaritmo, con mediana e 1,4826 volte la deviazione mediana assoluta (regole 5.2 e 5.3).
// Sotto 14 notti è in taratura e non dà punti, da 14 a 27 è provvisoria, da 28 piena.
export function baseHrv(giorni, i, dispositivo = SEMAFORO.dispositivoPredefinito, esclusioni = null) {
  const H = SEMAFORO.hrv;
  const escluso = predicato(esclusioni);
  const valori = [];
  for (let j = Math.max(0, i - H.notti); j < i; j++) {
    const g = giorni[j];
    if (notteValida(g) && !escluso(g)) valori.push(Math.log(g.hrv));
  }
  const n = valori.length;
  const s = stato(n, H.nottiPunti, H.nottiPiene);
  if (!n) return { ok: false, n, stato: s, centro: null, ds: null };
  const centro = mediana(valori);
  const ds = Math.max(H.madInDs * deviazioneMediana(valori, centro), dsMinimaHrv(dispositivo));
  return {
    ok: s !== "taratura",
    n,
    stato: s,
    centro,
    ds,
    tipico: Math.exp(centro),
    basso: Math.exp(centro - ds),
    alto: Math.exp(centro + ds),
  };
}

// Il battito normale del giorno i, dalle ultime 30 notti valide fino a ieri, tolte le escluse.
// Mediana e DS robusta, mai sotto 1 battito. Da 7 notti provvisorio, da 14 pieno (regola 5.7).
export function baseFc(giorni, i, esclusioni = null) {
  const B = SEMAFORO.battito;
  const escluso = predicato(esclusioni);
  const valori = [];
  for (let j = i - 1; j >= 0 && valori.length < B.notti; j--) {
    const g = giorni[j];
    if (notteValidaBattito(g) && !escluso(g)) valori.push(g.fc);
  }
  const n = valori.length;
  const s = stato(n, B.nottiProvvisorie, B.nottiPiene);
  if (!n) return { ok: false, n, stato: s, centro: null, ds: null };
  const centro = mediana(valori);
  const ds = Math.max(SEMAFORO.hrv.madInDs * deviazioneMediana(valori, centro), B.dsMinima);
  return { ok: s !== "taratura", n, stato: s, centro, ds, solito: centro, basso: centro - ds, alto: centro + ds };
}

// La media delle ultime 7 notti valide (oggi compreso), se ce ne sono almeno 3.
export function hrvSettimana(giorni, i) {
  const H = SEMAFORO.hrv;
  const valori = [];
  for (let j = Math.max(0, i - H.nottiMedia + 1); j <= i; j++) {
    if (notteValida(giorni[j])) valori.push(Math.log(giorni[j].hrv));
  }
  return valori.length >= H.nottiMediaMinime ? Math.exp(media(valori)) : null;
}

export function sonnoSettimana(giorni, i) {
  const Z = SEMAFORO.sonno;
  const valori = [];
  for (let j = Math.max(0, i - Z.nottiMedia + 1); j <= i; j++) if (giorni[j].sonno) valori.push(giorni[j].sonno);
  return valori.length >= Z.nottiMediaMinime ? media(valori) : null;
}

// Lo stato dell'allenamento «del mattino» del giorno i, cioè Fitness e Fatica di ieri sera (4.3). Se
// oggi c'è già un giro, intervals.icu lo conta nel giorno, e il consiglio va dato com'era prima di
// uscire. Se ieri manca vale l'ultimo giorno prima che le ha, mai il giorno i, e senza nessuno un
// giorno vuoto, così il carico non vota.
export function mattinoDelGiorno(giorni, i) {
  for (let j = i - 1; j >= 0; j--) if (giorni[j] && giorni[j].ctl !== null) return giorni[j];
  return { ctl: null, atl: null, faticaLenta: null, forma: null, formaPct: null };
}

export function sommaCarico(giorni, i, n = 7) {
  let somma = 0;
  for (let j = Math.max(0, i - n + 1); j <= i; j++) somma += giorni[j].carico || 0;
  return somma;
}

// Le notti che il diario toglie dalle basi, cioè quelle con una casella delle cause o con un sintomo
// di «Sto male», e quelle prima di un cambio di dispositivo (regole 5.2 e 5.11). Il semaforo aggiunge
// modalità evento, giorni di guardia e malattia.
export function esclusioniDelDiario(diario, profilo = {}) {
  const date = new Set();
  for (const [d, voce] of Object.entries(diario || {})) {
    if (!voce || typeof voce !== "object") continue;
    const cause = Array.isArray(voce.cause) ? voce.cause : [];
    const sintomi = Array.isArray(voce.stoMale) ? voce.stoMale : [];
    if (cause.length || sintomi.length || voce.controllo === "si") date.add(d);
  }
  const dal = profilo && typeof profilo.cambioDispositivo === "string" ? profilo.cambioDispositivo : null;
  return (g) => date.has(g.d) || Boolean(dal && g.d < dal);
}

const NOMI_TIPO = {
  Ride: "Bici", GravelRide: "Gravel", MountainBikeRide: "MTB", VirtualRide: "Rulli",
  EBikeRide: "E-bike", EMountainBikeRide: "E-MTB", Velomobile: "Velomobile",
  Run: "Corsa", TrailRun: "Trail", VirtualRun: "Tapis roulant", Walk: "Camminata",
  Hike: "Escursione", WeightTraining: "Palestra", Workout: "Allenamento", Yoga: "Yoga",
  Swim: "Nuoto", OpenWaterSwim: "Nuoto", Rowing: "Canottaggio", NordicSki: "Sci di fondo",
  AlpineSki: "Sci", BackcountrySki: "Scialpinismo", Elliptical: "Ellittica",
};

const TIPI_ORE_BICI = new Set(DATI.tipiBici);

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
      // Arrivano solo quando la lettura li chiede (6.7). Senza, la fiducia del carico usa il carico.
      potenza: typeof a.device_watts === "boolean" ? a.device_watts : null,
      sforzo: pos(a.icu_rpe),
    }))
    .sort((a, b) => (a.inizio < b.inizio ? 1 : -1));
}

// Le ore in bici di un giorno, tutte le attività in bici sommate, e-bike esclusa (2.2).
export function oreBiciDelGiorno(uscite, d) {
  let secondi = 0;
  for (const u of uscite || []) if (u.d === d && TIPI_ORE_BICI.has(u.tipo)) secondi += u.secondi || 0;
  return secondi / ORA;
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
  if (!a || typeof a !== "object") return { nome: "", fuso: null };
  const nome = (typeof a.firstname === "string" && a.firstname.trim())
    || (typeof a.name === "string" && a.name.trim().split(/\s+/)[0])
    || "";
  return { nome, fuso: typeof a.timezone === "string" ? a.timezone : null };
}

const oggetto = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

// Fitness e Fatica del semaforo vengono da intervals.icu, finché la serie di Come sto non passa la
// prova di coincidenza sui dati privati (6.5). Con CARICO.serie.fonteSemaforo «comesto» le prende
// dalla serie di js/carico.js, giorno per giorno.
function conLaSerie(giorni, serie) {
  if (CARICO.serie.fonteSemaforo !== "comesto" || !Array.isArray(serie) || !serie.length) return giorni;
  const perData = new Map(serie.filter((r) => r && typeof r.d === "string").map((r) => [r.d, r]));
  for (const g of giorni) {
    const r = perData.get(g.d);
    if (!r || num(r.fitness) === null || num(r.fatica) === null) continue;
    g.ctl = r.fitness;
    g.atl = r.fatica;
    if (num(r.faticaLenta) !== null) g.faticaLenta = r.faticaLenta;
    g.forma = g.ctl - g.atl;
    g.formaPct = g.ctl > 0 ? g.forma / g.ctl : null;
  }
  return giorni;
}

// Tutto quello che serve alle viste, calcolato una volta sola. Diario, storia, profilo e piano
// arrivano dal telefono (js/memoria.js) e sono facoltativi.
// diario   { [data]: { stoMale, senzaFebbre, cause, controllo, pedalata, viaggio } }, le risposte del mattino
// storia   { [data]: il registro che valuta restituisce ogni giorno }, gli esiti dei giorni passati
// profilo  { eta o fasciaEta, dispositivo, cambioDispositivo, aritmia, fasciaCardio, ftp }
// piano    { fatiche: [{ tipo, inizio, fine }] }, i weekend, le prove e i blocchi già fatti
// serie    le righe di serieCarico di js/carico.js, che valgono solo con fonteSemaforo «comesto»
export function costruisciModello({ atleta, benessere, uscite, diario, storia, profilo, piano, serie } = {}, oggi = oggiLocale()) {
  const giorni = conLaSerie(calendario(benessere, oggi), serie);
  const i = giorni.length - 1;
  const oggiG = giorni[i];
  const prof = oggetto(profilo);
  const dia = oggetto(diario);
  const mattino = mattinoDelGiorno(giorni, i);
  const escluse = esclusioniDelDiario(dia, prof);
  return {
    oggi,
    giorni,
    atleta: normalizzaAtleta(atleta),
    diario: dia,
    storia: oggetto(storia),
    profilo: prof,
    piano: piano && typeof piano === "object" ? piano : null,
    fonteFc: fonteBattito(giorni),
    notteArrivata: Boolean(oggiG.hrv || oggiG.fc || oggiG.sonno),
    notteMaiArrivata: !giorni.some((g) => g.hrv || g.fc || g.sonno),
    hrvMisurato: giorni.some((g) => g.hrv),
    base: { hrv: baseHrv(giorni, i, prof.dispositivo, escluse), fc: baseFc(giorni, i, escluse) },
    hrvSettimana: hrvSettimana(giorni, i),
    sonnoSettimana: sonnoSettimana(giorni, i),
    mattino: {
      ctl: mattino.ctl,
      atl: mattino.atl,
      faticaLenta: mattino.faticaLenta,
      forma: mattino.forma,
      formaPct: mattino.formaPct,
      rapporto: mattino.ctl > 0 && mattino.atl !== null ? mattino.atl / mattino.ctl : null,
    },
    fitness28: giorni[i - 28] ? giorni[i - 28].ctl : null,
    caricoMese: sommaCarico(giorni, i - 1, 28),
    uscite: normalizzaUscite(uscite),
  };
}
