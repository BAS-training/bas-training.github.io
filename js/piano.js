// Il piano della settimana, il capitolo 3 della specifica della preparazione.
// Un piano lungo, settimana per settimana fino alla partenza, che ogni lunedì diventa sette giorni
// concreti con bici e palestra. Ogni mattina il semaforo adatta la seduta di oggi, e la domenica il
// controllo settimanale può rendere facile la settimana dopo. Stessi ingressi, stesso piano.
// Le settimane −w si contano dal weekend (3.2), le date sono AAAA-MM-GG, le settimane in ore e le
// sedute in minuti, i giorni della settimana con 0 = lunedì.
// Funzioni pure, senza DOM e senza window, provate con node (test/piano.test.mjs).
// I numeri stanno in js/parametri.js, nei gruppi PIANO e DOMENICA, i testi in js/testi-piano.js.

import { CARICO, DOMANDE, DOMENICA, PIANO, PRONTEZZA, SEMAFORO, STIMA } from "./parametri.js?v=202611021803";
import { QUALITA, contoOre, doloriCheTornano, giriUniti, inBici, mediana } from "./dati.js?v=202611021803";
import { borseDellObiettivo, classeEvento, giorniDiBici, obiettivi, pilastroBorse, pilastroLunga, pilastroVolume } from "./prontezza.js?v=202611021803";
import { SCHEDE, contoSedute, fasePalestra, sedutaPalestra } from "./palestra.js?v=202611021803";
import { trovaPercorso } from "./catalogo.js?v=202611021803";
import * as T from "./testi-piano.js?v=202611021803";

const GIORNO_MS = 86400000;
const EPS = 1e-9;
const SENZA_LIMITI = PIANO.tettiGiorni.stella;
const [UN_GIORNO, DUE_CINQUE, SEI_DIECI, UNDICI] = PRONTEZZA.classi;
const VENERDI = 4;
const SABATO = 5;
const DOMENICA_G = 6;
const S = PIANO.sedute;
const PP = PIANO.palestra;
const GD = PIANO.giorniDopo;

const num = (v) => typeof v === "number" && Number.isFinite(v);
const lista = (v) => (Array.isArray(v) ? v : []);
const somma = (l, f = (x) => x) => l.reduce((s, x) => s + f(x), 0);
const fra = (x, a, b) => Math.min(b, Math.max(a, x));
const daSei = (classe) => classe === SEI_DIECI || classe === UNDICI;
const perGiorno = (x, y) => (x.giorno < y.giorno ? -1 : x.giorno > y.giorno ? 1 : 0);

function utc(iso) {
  const [a, m, g] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}

const piuGiorni = (iso, n) => new Date(utc(iso) + n * GIORNO_MS).toISOString().slice(0, 10);
const giorniFra = (da, a) => Math.round((utc(a) - utc(da)) / GIORNO_MS);
const giornoSettimana = (iso) => (new Date(utc(iso)).getUTCDay() + 6) % 7;
const dataDi = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

function oggiIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// I tipi di seduta, nell'ordine della pagina. Ognuno ha un titolo e un come in js/testi-piano.js.
export const TIPI_SEDUTA = Object.freeze([
  "riposo", "recupero", "facile", "media", "richiamo", "lunga", "scarico", "controllo", "weekend", "weekendCarico",
  "T1", "T2", "T3", "prova", "blocco", "carica", "unGiorno", "palestra", "tronco", "dopoEvento", "tappa",
]);
const PIU_GIORNI = new Set(["weekend", "weekendCarico", "T3", "prova", "blocco"]);
// Le sedute di più giorni, per chi le sposta tutte insieme (js/motore.js).
export const PIU_GIORNI_DEL_PIANO = Object.freeze([...PIU_GIORNI]);
const PROVE = new Set(["T1", "T2", "T3", "prova", "blocco", "weekendCarico", "carica", "unGiorno"]);
const CARICHE = PROVE;   // le prove sono le sedute con le borse come all'evento
const BICI = new Set([
  "recupero", "facile", "media", "richiamo", "lunga", "scarico", "controllo", "weekend", "weekendCarico",
  "T1", "T2", "T3", "prova", "blocco", "carica", "unGiorno", "tappa",
]);
const NON_FACILI = new Set(["media", "richiamo"]);
// Con una sola media a settimana servono almeno 3 uscite, così 2 su 3 sono facili (regola 2.1).
const CONUNAMEDIA = Math.ceil(1 / (1 - PIANO.settimana.quotaFacili) - 1e-9);
// Le settimane. Di carico base, N ed E, le altre no (regola 2.7 e prova 4 di 9.4).
const DI_CARICO = new Set(["base", "N", "E"]);
const NORMALI = new Set(["base", "N"]);
const CALO_VOLUTO = new Set(["S", "F", "F7", "tapering"]);   // contano come la settimana prima (regola 2.6)

// --- I giorni disponibili e i loro tetti (3.1) ---

// La disponibilità del primo avvio e di Impostazioni. giorni sono i giorni della settimana in cui si
// può uscire in bici (0 = lunedì), stella il giorno della lunga, ore le ore A, tetti i minuti scelti
// per ogni giorno (0 vuol dire niente, PIANO.tettiGiorni.stella senza limiti), dueCose vero se si
// accettano palestra e giro facile nello stesso giorno.
export function leggiDisponibilita(d = {}) {
  const dati = d && typeof d === "object" ? d : {};
  if (dati.chiaro === true && dati.giorni instanceof Set) return dati;
  const P = PIANO.disponibilita;
  const scelti = lista(dati.giorni).filter((x) => Number.isInteger(x) && x >= 0 && x <= 6);
  const giorni = new Set(scelti.length ? scelti : P.giorni);
  const tetti = Array.from({ length: 7 }, (_, i) => {
    const t = dati.tetti ? dati.tetti[i] : undefined;
    return num(t) && t >= 0 ? t : null;
  });
  for (let i = 0; i < 7; i++) if (tetti[i] === 0) giorni.delete(i);
  const preferita = Number.isInteger(dati.stella) ? dati.stella : P.stella;
  const stella = giorni.has(preferita) ? preferita : [SABATO, DOMENICA_G, VENERDI, 3, 2, 1, 0].find((x) => giorni.has(x)) ?? null;
  const ore = num(dati.ore) && dati.ore > 0 ? dati.ore : P.orePredefinite;
  return { chiaro: true, giorni, stella, ore, tetti, dueCose: dati.dueCose === true };
}

// Il tetto di un giorno in minuti. uso è «facile» per i giri facili e la media, «chiave» per una seduta
// chiave di un giorno, «piuGiorni» per weekend, prove e blocco. Il tetto scelto in Impostazioni vale
// sempre, per ogni seduta (3.1). Senza una scelta il giorno con la stella è senza limiti, l'altro
// giorno del weekend lo è per le sedute chiave e vale 1 ora e mezza per i giri facili, i feriali 1
// ora e mezza. Le sedute di più giorni usano ogni giorno disponibile senza limiti, come l'altro
// giorno del weekend, così il blocco può andare anche di venerdì o di lunedì.
function tettoDi(disp, dow, uso = "facile") {
  if (!disp.giorni.has(dow)) return 0;
  const proprio = disp.tetti[dow];
  if (proprio !== null) return proprio;
  if (uso === "piuGiorni") return SENZA_LIMITI;
  if (dow === disp.stella) return SENZA_LIMITI;
  if (dow === SABATO || dow === DOMENICA_G) return uso === "chiave" ? SENZA_LIMITI : PIANO.tettiGiorni.altroWeekendFacile;
  return PIANO.tettiGiorni.feriale;
}

// --- Il profilo e lo storico ---

const FASCE_ETA = ["sotto40", "40-49", "50-54", "55-59", "60+"];

function etaDi(p = {}) {
  if (num(p.eta)) return p.eta;
  const i = Number.isInteger(p.fasciaEta) ? p.fasciaEta : FASCE_ETA.indexOf(p.fasciaEta);
  const centri = PIANO.limiteFacile.etaCentri;
  return i >= 0 && i < centri.length ? centri[i] : PP.eta.predefinita;
}

// Il profilo che serve al piano. Da 50 anni il 2+1 è acceso salvo scaricoOgniTre falso (3.4), il
// blocco per 6-10 giorni è acceso salvo blocco falso.
function leggiProfiloPiano(p = {}) {
  const dati = p && typeof p === "object" ? p : {};
  if (dati.dati && num(dati.eta)) return dati;
  const eta = etaDi(dati);
  return {
    dati,
    eta,
    dueUno: eta >= PIANO.scarico.daAnni && dati.scaricoOgniTre !== false,
    blocco: dati.blocco !== false,
    esperienza: dati.esperienza ?? false,
  };
}

// Le attività per data, con la qualità nella forma di js/dati.js.
function perData(attivita) {
  const mappa = new Map();
  for (const a of lista(attivita)) {
    if (!a || typeof a.giorno !== "string") continue;
    const pulita = a.qualita && typeof a.qualita === "object" ? a : { ...a, qualita: { secondi: QUALITA.vera } };
    if (!mappa.has(a.giorno)) mappa.set(a.giorno, []);
    mappa.get(a.giorno).push(pulita);
  }
  return mappa;
}

// Lo storico (3.1). h4 è la media delle ore in bici delle ultime 4 settimane, L30 la più lunga degli
// ultimi 30 giorni. Senza giri leggibili h4 viene dalla risposta del primo avvio (oreDichiarate in ore,
// oppure fasciaOre da 0 a 4) e L30 vale 0,45 × h4 fra 1 e 3 ore. s ha uscite (le attività pulite),
// e se si sanno settimane, fitness, k, giorni (i giorni puliti del benessere, per i dolori che
// tornano) o doloriCheTornano, interruzione { giorni, orePrima }, crescitaRapida, domenica (la
// proposta dell'ultimo controllo), registro della palestra, stomaco (le risposte dopo le lunghe),
// rossi e formaMinima (per lo scarico finale pieno), eBikeEvento (vero con l'evento in e-bike, che
// allora conta per intero).
// Per rifare il piano il lunedì (3.12) s porta piano, quello salvato in comesto.piano.v1. Da lì
// vengono, se non arrivano a parte, inizioPiano (il lunedì in cui è nato), schema (lo schema
// scelto allora), portate (le sedute chiave delle settimane passate che cadono in quella di oggi,
// come il giorno 2 di un weekend cominciato la domenica), fatiche (quelle già fatte, con fatichePiano)
// e i tipi e le ore previste delle settimane passate. Le settimane passate si copiano poi così come
// sono nel piano nuovo.
export function leggiStorico(s = {}, oggi = oggiIso(), lunediInizio = null) {
  const dati = s && typeof s === "object" ? s : {};
  if (dati.normalizzato === true) return dati;
  const eBikeEvento = dati.eBikeEvento === true;
  const uscite = lista(dati.uscite).filter((a) => a && typeof a.giorno === "string" && a.giorno < oggi && inBici(a));
  const mappa = perData(uscite);
  const oreDi = (d) => (mappa.has(d) ? contoOre(mappa.get(d), d, { eBikeEvento }).ore : 0);
  const lungaDi = (d) => (mappa.has(d) ? Math.max(0, ...giriUniti(mappa.get(d), d, { eBikeEvento }).map((g) => g.secondi / 3600)) : 0);
  const conGiri = uscite.length > 0;
  const centri = PIANO.storicoDichiarato.centri;
  const settimaneStoria = PIANO.storicoSettimane;

  let h4 = num(dati.h4) ? dati.h4 : null;
  if (h4 === null && conGiri) {
    let ore = 0;
    for (let i = 1; i <= 7 * settimaneStoria; i++) ore += oreDi(piuGiorni(oggi, -i));
    h4 = ore / settimaneStoria;
  }
  if (h4 === null) {
    if (num(dati.oreDichiarate) && dati.oreDichiarate >= 0) h4 = dati.oreDichiarate;
    else if (Number.isInteger(dati.fasciaOre) && dati.fasciaOre >= 0 && dati.fasciaOre < centri.length) h4 = centri[dati.fasciaOre];
    else h4 = PIANO.storicoDichiarato.predefinito;
  }

  const L = PIANO.lungaDichiarata;
  const lungaFra = (n) => {
    let m = 0;
    for (let i = 1; i <= n; i++) m = Math.max(m, lungaDi(piuGiorni(oggi, -i)));
    return m;
  };
  const l30 = Math.max(L.minimo, num(dati.l30) ? dati.l30 : conGiri ? lungaFra(PIANO.passoLunga.giorni) : fra(L.quota * h4, L.minimo, L.massimo));
  const l42 = num(dati.l42) ? dati.l42 : conGiri ? lungaFra(7 * PIANO.scelta.baseB.settimane) : l30;

  // Le uscite più lunghe di ogni giorno degli ultimi 30 giorni, per il passo della lunga. La lunga
  // detta, senza giri, vale ieri.
  const lunghe = [];
  if (conGiri && !num(dati.l30)) {
    for (let i = 1; i <= PIANO.passoLunga.giorni; i++) {
      const d = piuGiorni(oggi, -i);
      const o = lungaDi(d);
      if (o > 0) lunghe.push({ giorno: d, ore: o });
    }
  } else {
    lunghe.push({ giorno: piuGiorni(oggi, -1), ore: l30 });
  }

  // Il piano salvato e le sue settimane già passate, per rifarlo il lunedì (3.12).
  const salvato = dati.piano && typeof dati.piano === "object" && Array.isArray(dati.piano.settimane) ? dati.piano : null;
  const lunediOggi = piuGiorni(oggi, -giornoSettimana(oggi));
  const passate = salvato ? salvato.settimane.filter((w) => w && dataDi(w.lunedi) && w.lunedi < lunediOggi) : [];
  const perLunedi = new Map(passate.map((w) => [w.lunedi, w]));

  // Le ore vere di una settimana, null se è finita prima del primo giro.
  const primoGiro = conGiri ? [...mappa.keys()].sort()[0] : null;
  const oreVere = (lunedi) => {
    if (!conGiri || piuGiorni(lunedi, 6) < primoGiro) return null;
    let ore = 0;
    for (let i = 0; i < 7; i++) {
      const d = piuGiorni(lunedi, i);
      if (d >= oggi) break;
      ore += oreDi(d);
    }
    return ore;
  };

  // Le settimane vere prima del piano, per le regole di crescita. Senza giri valgono h4 e L30. vera
  // dice se le ore sono fatte davvero, e il tipo è quello del piano salvato, così uno scarico fatto
  // conta come la settimana prima (regola 2.6).
  const inizio = lunediInizio || lunediOggi;
  let settimane;
  if (Array.isArray(dati.settimane) && dati.settimane.length) {
    settimane = dati.settimane.filter((x) => x && num(x.ore)).map((x) => ({
      lunedi: x.lunedi || null, ore: x.ore, tipo: x.tipo || "N", chiaveOre: num(x.chiaveOre) ? x.chiaveOre : num(x.lunga) ? x.lunga : Math.min(x.ore, l30), vera: true,
    }));
  } else {
    settimane = [];
    for (let j = settimaneStoria; j >= 1; j--) {
      const lunedi = piuGiorni(inizio, -7 * j);
      const ore = oreVere(lunedi);
      if (ore === null) {
        settimane.push({ lunedi, ore: h4, tipo: "N", chiaveOre: Math.min(h4, l30), vera: false });
        continue;
      }
      let lunga = 0;
      for (let i = 0; i < 7; i++) {
        const d = piuGiorni(lunedi, i);
        if (d >= oggi) break;
        lunga = Math.max(lunga, lungaDi(d));
      }
      settimane.push({ lunedi, ore, tipo: "N", chiaveOre: lunga, vera: true });
    }
  }
  for (const w of settimane) {
    const p = w.lunedi ? perLunedi.get(w.lunedi) : null;
    if (!p) continue;
    if (typeof p.tipo === "string") w.tipo = p.tipo;
    w.blocco = lista(p.sedute).some((x) => x && x.tipo === "blocco" && x.possibile !== false);
  }

  // Le sedute chiave delle settimane passate che cadono nella settimana di oggi.
  const portate = Array.isArray(dati.portate)
    ? dati.portate.filter((x) => x && dataDi(x.giorno) && num(x.ore))
    : passate.flatMap((w) => lista(w.sedute)).filter((x) => x && x.possibile !== false && dataDi(x.giorno) && num(x.ore)
      && x.giorno >= lunediOggi && x.giorno <= piuGiorni(lunediOggi, 6)).map((x) => ({ ...x }));
  const fatiche = Array.isArray(dati.fatiche)
    ? dati.fatiche.filter((f) => f && dataDi(f.fine))
    : salvato ? fatichePiano({ ...salvato, settimane: passate }, uscite, oggi, { eBikeEvento }) : [];
  const schema = typeof dati.schema === "string" ? dati.schema : dati.schema && typeof dati.schema.nome === "string" ? dati.schema.nome
    : salvato && salvato.schema && typeof salvato.schema.nome === "string" ? salvato.schema.nome : null;

  const interruzione = dati.interruzione && num(dati.interruzione.giorni) ? dati.interruzione : null;
  const giorni = lista(dati.giorni);
  return {
    normalizzato: true,
    oggi,
    conGiri,
    eBikeEvento,
    h4,
    l30,
    l42,
    lunghe,
    settimane,
    uscite,
    oreVere,
    fitness: num(dati.fitness) ? dati.fitness : null,
    k: num(dati.k) && dati.k > 0 ? dati.k : null,
    dolori: dati.doloriCheTornano === true || (giorni.length > 0 && doloriCheTornano(giorni, oggi)),
    interruzione,
    crescita: dati.crescitaRapida === true || Boolean(dati.crescitaRapida && dati.crescitaRapida.avviso),
    domenica: dati.domenica && typeof dati.domenica === "object" ? dati.domenica : null,
    inizioPiano: dataDi(dati.inizioPiano) || (salvato ? dataDi(salvato.inizio) : null),
    schema,
    pianoSalvato: salvato,
    passate,
    portate,
    fatiche,
    registro: lista(dati.registro),
    stomaco: lista(dati.stomaco),
    spostamenti: lista(dati.spostamenti),
    rossi: num(dati.rossi) ? dati.rossi : 0,
    formaMinima: num(dati.formaMinima) ? dati.formaMinima : null,
  };
}

// --- Le settimane del piano (3.2) ---

// Il weekend 1 è l'ultimo sabato e domenica che finiscono prima del giorno della partenza, la
// settimana −w il lunedì-domenica che contiene il weekend w. Restituisce le settimane dalla −N alla −1,
// dalla settimana di oggi, più la settimana 0 con i giorni fra la −1 e la partenza quando ci sono.
// Ogni settimana è { indice, lunedi, domenica, dal, al, giorni, quota }, con dal e al i giorni del
// piano (da oggi, prima della partenza) e quota la parte della settimana che resta.
export function settimanePiano(oggi, partenza) {
  const p = dataDi(partenza);
  const o = dataDi(oggi);
  if (!p || !o || o >= p) return [];
  const gp = giornoSettimana(p);
  const domenica1 = piuGiorni(p, -(gp === DOMENICA_G ? 7 : gp + 1));
  const lunedi1 = piuGiorni(domenica1, -6);
  const ultimo = piuGiorni(p, -1);
  const riga = (indice, lunedi, al) => {
    const dal = o > lunedi ? o : lunedi;
    const giorni = giorniFra(dal, al) + 1;
    return { indice, lunedi, domenica: piuGiorni(lunedi, 6), dal, al, giorni, quota: giorni / 7 };
  };
  const settimane = [];
  if (o <= domenica1) {
    const n = Math.floor(giorniFra(o, domenica1) / 7) + 1;
    for (let w = n; w >= 1; w--) {
      const lunedi = piuGiorni(lunedi1, -7 * (w - 1));
      settimane.push(riga(-w, lunedi, piuGiorni(lunedi, 6)));
    }
  }
  const lunedi0 = piuGiorni(domenica1, 1);
  if (lunedi0 <= ultimo) settimane.push(riga(0, lunedi0, ultimo));
  return settimane;
}

// --- Quale schema (3.3) ---

// Lo schema per la classe e le settimane N. h4 sono le ore a settimana di adesso, l42 la lunga più
// lunga delle ultime 6 settimane, h le ore della giornata, vObiettivo le ore cercate. Restituisce
// { schema «A», «B», «C», «D», «libero», «7.13», «7.14» o «7.15», settimane, base (le settimane di base
// prima dello schema), ultime (le ultime N settimane dello schema, quando ne mancano), adattare (vero
// per «arrivare e adattare»), avvisi }.
export function scegliSchema(classe, n, h4, l42, h, vObiettivo, opzioni = {}) {
  const P = PIANO.scelta;
  const r = (schema, extra = {}) => ({ schema, settimane: n, base: 0, ultime: null, adattare: false, avvisi: [], ...extra });
  if (!num(n) || opzioni.libero) return r("libero");
  if (classe === UN_GIORNO) return n >= P.unGiorno ? r("D", { base: n - P.unGiorno }) : r("D", { ultime: n });
  if (classe === DUE_CINQUE || !daSei(classe)) {
    if (n >= P.dueCinque) return r("A", { base: n - P.dueCinque });
    if (n >= P.dueCinqueB) {
      const conBase = num(h4) && num(l42) && h4 + EPS >= P.baseB.ore * vObiettivo && l42 + EPS >= P.baseB.lunga * h;
      return conBase ? r("B", { base: n - P.dueCinqueB }) : r("A", { ultime: n });
    }
    if (n >= P.corto13) return r("7.13");
    if (n >= P.corto14) return r("7.14");
    return r("7.15");
  }
  const undici = classe === UNDICI;
  const lunghezza = PIANO.schemi.C.length;
  if (n >= (undici ? P.undici : P.seiDieci)) return r("C", { base: n - lunghezza, blocco: undici ? "obbligatorio" : "consigliato" });
  if (n >= P.cortoDaSei) {
    const extra = { base: Math.max(0, n - lunghezza), ultime: n >= lunghezza ? null : n, avvisi: undici ? ["ventiSettimane"] : [] };
    return r("C", { ...extra, blocco: undici ? "obbligatorio" : "consigliato" });
  }
  return r(n >= P.corto13 ? "7.13" : n >= P.corto14 ? "7.14" : "7.15", { adattare: true });
}

// --- Le righe del piano, dallo schema ---

// Le prove con le borse che il verdetto conta solo da 3 ore al giorno in su (2.4). Il test ha già il
// suo minimo di 3 ore, l'uscita carica della regola 7.15 non è un test pieno.
const PROVE_PIENE = new Set(["T2", "T3", "prova", "blocco", "weekendCarico", "unGiorno"]);

// Le ore di ogni giorno di una seduta chiave, da frazioni di H con i limiti in ore. I giorni delle
// prove con le borse stanno ad almeno 3 ore, così chi segue il piano supera le soglie di 2.4.
function oreChiaveDi(chiave, H) {
  if (!chiave) return null;
  const ore = Array.isArray(chiave.ore) ? [...chiave.ore] : lista(chiave.h).map((f) => f * H);
  const minimo = Math.max(num(chiave.minimo) ? chiave.minimo : 0, PROVE_PIENE.has(chiave.tipo) ? PRONTEZZA.giornoCaricoOre : 0);
  return ore.map((o) => fra(o, minimo, num(chiave.massimo) ? Math.max(chiave.massimo, minimo) : Infinity));
}

function conSostituzioni(righe, cambi) {
  const perW = new Map(lista(cambi).map((c) => [c.w, c]));
  return righe.map((r) => (perW.has(r.w) ? { ...r, ...perW.get(r.w) } : r));
}

// La serie di carico con cui comincia lo schema, poi all'indietro scarichi e serie di 3 (2 con il
// 2+1). Restituisce per le settimane di base, dalla più vicina allo schema, vero se è di carico.
function seriePrima(righe, quante, maxSerie) {
  let iniziale = 0;
  for (const r of righe) {
    if (r.tipo === "N" || r.tipo === "E") iniziale += 1;
    else break;
  }
  const tipi = [];
  let restano = Math.max(0, maxSerie - iniziale);
  for (let i = 0; i < quante; i++) {
    if (restano > 0) {
      tipi.push(true);
      restano -= 1;
    } else {
      tipi.push(false);
      restano = maxSerie;
    }
  }
  return tipi;
}

// Le righe dello schema per le settimane del piano, dalla −N. Ogni riga ha tipo, oreTarget (in ore,
// null per gli scarichi senza frazione e per lo scarico finale), scarico, chiave { tipo, ore, nota },
// palestra e, per i piani corti, oreMassime.
function righePiano(sch, n, ctx) {
  const { H, vOb, h4, classe, prof } = ctx;
  const maxSerie = prof.dueUno ? PIANO.scarico.ogniDaAnni50 : PIANO.scarico.ogni;
  const P = PIANO.schemi;
  let schema = null;
  let oreDi = (r) => (num(r.ore) ? r.ore * vOb : null);
  let massimo = Infinity;
  let righe;
  let prima = null;
  if (["A", "B", "C", "D"].includes(sch.schema)) {
    righe = [...P[sch.schema]];
    if (prof.dueUno) righe = conSostituzioni(righe, P[`${sch.schema}50`]);
    if (sch.schema === "C" && classe === SEI_DIECI && !prof.blocco) righe = conSostituzioni(righe, P.CsenzaBlocco);
    if (sch.schema === "D" && ctx.borse) righe = conSostituzioni(righe, P.Dborse);
    schema = sch.schema;
  } else if (sch.schema === "7.13" || sch.schema === "7.14") {
    const c = sch.schema === "7.13" ? PIANO.corti.sei : PIANO.corti.quattro;
    righe = c.righe.map((r) => (r.chiave && r.chiave.tipo === "T3" && daSei(classe) ? { ...r, chiave: { ...r.chiave, tipo: "prova" } } : r));
    oreDi = (r) => (num(r.oreH4) ? r.oreH4 * h4 : null);
    massimo = c.massimo * h4;
    prima = { tipo: "N", oreTarget: c.prima * h4 };
  } else {
    righe = PIANO.corti.tre.righe.filter((r) => r.w <= Math.max(n, 0));
    oreDi = (r) => r.oreH4 * h4;
  }
  const lunghezza = righe.length;
  const usate = righe.filter((r) => r.w <= n);
  const extra = Math.max(0, n - lunghezza);
  const converti = (r) => ({
    w: r.w,
    tipo: r.tipo,
    oreTarget: oreDi(r),
    scarico: num(r.scarico) ? r.scarico : null,
    chiave: r.chiave ? { tipo: r.chiave.tipo, ore: oreChiaveDi(r.chiave, H), nota: r.chiave.nota || null } : null,
    palestra: num(r.palestra) ? r.palestra : null,
    oreMassime: massimo,
  });
  const fuori = [];
  if (extra > 0) {
    const tipi = seriePrima(righe, extra, maxSerie);
    // La lunga della base cresce verso la lunga della prima settimana dello schema, le ore verso le sue ore.
    const primaRiga = righe[0];
    const lungaVerso = primaRiga.chiave ? oreChiaveDi(primaRiga.chiave, H)[0] : PIANO.lungaScarico.minimo;
    const oreVerso = prima ? prima.oreTarget : oreDi(righe.find((r) => num(oreDi(r))) || primaRiga) ?? h4;
    const L = PIANO.lungaScarico;
    for (let i = 0; i < extra; i++) {
      const w = lunghezza + i + 1;
      const carico = tipi[i];
      fuori.unshift({
        w,
        tipo: carico ? (prima ? "N" : "base") : "S",
        oreTarget: carico ? oreVerso : null,
        scarico: null,
        chiave: carico
          ? { tipo: "lunga", ore: [lungaVerso], nota: null }
          : { tipo: "scarico", ore: [fra(L.quota * H, L.minimo, L.massimo)], nota: null },
        palestra: null,
        oreMassime: massimo,
        base: true,
      });
    }
  }
  return { schema, righe: [...fuori, ...usate.map(converti)] };
}

// --- Le sedute chiave nei giorni (3.7, passo 1) ---

function nuovaChiave(r, tipo, giorno, ore, parte, di, classe) {
  return {
    giorno,
    tipo,
    ore,
    parte: di > 1 ? parte : null,
    di: di > 1 ? di : null,
    borse: CARICHE.has(tipo) ? "evento" : "no",
    notteFuori: tipo === "T3" || tipo === "prova" || (tipo === "weekendCarico" && classe === UNDICI),
    possibile: true,
    nota: r.chiave.nota || null,
    chiave: true,
  };
}

// La lunga, il T1, il T2 e il controllo nel giorno con la stella. Weekend, T3 e prova generale sabato
// e domenica, oppure il giorno con la stella e il giorno disponibile più vicino, venerdì o lunedì. Il
// blocco venerdì, sabato e domenica, oppure sabato, domenica e lunedì. Senza i giorni, la seduta di
// due giorni diventa una lunga singola con la domanda del giorno da liberare, il blocco un weekend.
// Ogni passo rispetta il tetto del giorno (3.1 e 3.7). Si sceglie il giorno che regge la seduta, e se
// nessuno la regge la seduta porta il tetto del suo giorno, in ore, e applicaCrescita la accorcia lì
// e scrive quanto manca.
function assegnaDate(r, disp, partenza, classe) {
  r.sedute = [];
  const c = r.chiave;
  if (!c || !lista(c.ore).length) return;
  const giornoI = (i) => piuGiorni(r.lunedi, i);
  const dentro = (i) => {
    const d = giornoI(i);
    return d >= r.dal && d < partenza;
  };
  const libero = (i, uso) => dentro(i) && tettoDi(disp, i % 7, uso) > 0;
  const regge = (i, uso, ore) => libero(i, uso) && tettoDi(disp, i % 7, uso) >= ore * 60 - EPS;
  const crea = (tipo, giorni, ore, uso) => giorni.map((i, k) => ({
    ...nuovaChiave(r, tipo, giornoI(i), ore[k], k + 1, giorni.length, classe),
    tetto: tettoDi(disp, i % 7, uso) / 60,
  }));
  // Fra i gruppi di giorni liberi il primo che regge tutte le sedute, altrimenti il primo.
  const scegli = (gruppi, ore, uso) => {
    const liberi = gruppi.filter((g) => g.every((i) => libero(i, uso)));
    return liberi.find((g) => g.every((i, k) => regge(i, uso, ore[Math.min(k, ore.length - 1)]))) || liberi[0] || null;
  };
  const ORDINE = [SABATO, DOMENICA_G, VENERDI, 3, 2, 1, 0];
  const singola = (tipo, ore) => {
    const stella = disp.stella;
    // Il giorno con la stella se regge la seduta, poi un altro giorno della settimana che la regge,
    // prima il weekend, e se non la regge nessuno il giorno libero con il tetto più alto.
    const giorni = [...new Set([stella, ...ORDINE].filter((i) => i !== null))];
    const scelto = giorni.find((i) => regge(i, "chiave", ore))
      ?? giorni.filter((i) => libero(i, "chiave")).sort((a, b) => tettoDi(disp, b, "chiave") - tettoDi(disp, a, "chiave"))[0];
    if (scelto !== undefined) return crea(tipo, [scelto], [ore], "chiave");
    return [{ ...nuovaChiave(r, tipo, giornoI(stella ?? SABATO), ore, 1, 1, classe), possibile: false }];
  };
  if (!PIU_GIORNI.has(c.tipo)) {
    r.sedute = singola(c.tipo, c.ore[0]);
    return;
  }
  const coppie = [[SABATO, DOMENICA_G]];
  if (disp.stella === SABATO) coppie.push([VENERDI, SABATO]);
  if (disp.stella === DOMENICA_G) coppie.push([DOMENICA_G, 7]);
  const trovaCoppia = (ore) => scegli(coppie, ore, "piuGiorni");
  if (c.tipo === "blocco") {
    const tre = scegli([[VENERDI, SABATO, DOMENICA_G], [SABATO, DOMENICA_G, 7]], c.ore, "piuGiorni");
    if (tre) {
      r.sedute = crea("blocco", tre, c.ore, "piuGiorni");
      return;
    }
    r.avvisi.push({ tipo: "bloccoWeekend", testo: T.AVVISI.bloccoWeekend });
    const coppia = trovaCoppia(c.ore.slice(0, 2));
    if (coppia) {
      r.sedute = crea("weekendCarico", coppia, c.ore.slice(0, 2), "piuGiorni");
      return;
    }
  } else {
    const coppia = trovaCoppia(c.ore);
    if (coppia) {
      r.sedute = crea(c.tipo, coppia, c.ore, "piuGiorni");
      return;
    }
  }
  // La lunga singola, e la domanda una volta per il giorno che manca.
  const tipo = c.tipo === "weekend" ? "lunga" : "T2";
  r.sedute = singola(tipo, c.ore[0]);
  const stella = disp.stella ?? SABATO;
  const altro = stella === DOMENICA_G ? SABATO : stella === SABATO ? DOMENICA_G : SABATO;
  if (dentro(altro)) {
    r.avvisi.push({ tipo: "liberaGiorno", giorno: giornoI(altro), seduta: c.tipo, testo: T.domandaGiorno(c.tipo, giornoI(altro)) });
  } else {
    r.avvisi.push({ tipo: "weekendLunga", testo: T.AVVISI.weekendLunga });
  }
}

// --- Le regole di crescita (3.5) ---

// Il passo della lunga (regola 2.4). La nuova più lunga non supera la più lunga degli ultimi 30
// giorni di più del 20% o di 45 minuti, il valore minore, del 10% con i dolori che tornano o dopo
// un'interruzione di più di 7 giorni. Restituisce le ore massime.
export function passoLunga(l30, dolori = false) {
  const p = PIANO.passoLunga;
  const base = Math.max(num(l30) ? l30 : 0, 0);
  return Math.min(base * (1 + (dolori ? p.quotaDolori : p.quota)), base + p.minuti / 60);
}

// Le ore di una settimana contate per la media, uno scarico come la settimana che lo precede.
function oreContate(storia, i) {
  let j = i;
  while (j > 0 && CALO_VOLUTO.has(storia[j].tipo)) j -= 1;
  return storia[j].ore;
}

function mediaTre(storia, fino = storia.length) {
  const valori = [];
  for (let i = fino - 1; i >= 0 && valori.length < PIANO.tettoSettimana.settimane; i--) valori.push(oreContate(storia, i));
  return valori.length ? somma(valori) / valori.length : null;
}

// Il tetto di una settimana normale (regola 2.6). Al massimo il 15% sopra la media delle tre
// settimane prima, con uno scarico contato come la settimana che lo precede, e sotto le 3 ore di base
// al massimo mezz'ora in più. precedenti sono le settimane prima, dalla più vecchia, { ore, tipo }.
export function tettoSettimana(precedenti) {
  const storia = lista(precedenti).filter((x) => x && num(x.ore));
  const media = mediaTre(storia);
  if (media === null) return Infinity;
  const P = PIANO.tettoSettimana;
  return media < P.sottoOre - EPS ? media + P.passoSotto : media * (1 + P.quota);
}

// Le ore di una settimana con weekend, prove o blocco (regola 3 di 3.5). Il minore fra le ore dello
// schema e le sedute chiave più le ore feriali dell'ultima settimana normale, ma almeno le sedute
// chiave più un'ora.
export function oreSettimanaChiave(oreSchema, oreChiave, ferialiNormale) {
  const conFeriali = oreChiave + Math.max(0, num(ferialiNormale) ? ferialiNormale : 0);
  return Math.max(Math.min(num(oreSchema) ? oreSchema : conFeriali, conFeriali), oreChiave + PIANO.tettoSettimana.chiavePiu);
}

// Il passo della lunga sulle sedute chiave di una settimana. Il blocco ha tutti i giorni nel passo
// della lunga di prima, il giorno 2 di weekend e prove non supera mai il giorno 1. Poi ogni seduta
// sta nel tetto del suo giorno, e quello che il tetto toglie si scrive in s.tagliTetto (3.7 passo 8).
function passoDellaSettimana(s, lunghe, dolori, classe) {
  const sedute = s.sedute.filter((x) => x.possibile !== false).sort(perGiorno);
  if (!sedute.length) return;
  const giorni = PIANO.passoLunga.giorni;
  const l30 = (d) => {
    const dal = piuGiorni(d, -giorni);
    let m = PIANO.lungaDichiarata.minimo;
    for (const x of lunghe) if (x.giorno >= dal && x.giorno < d && x.ore > m) m = x.ore;
    return m;
  };
  const alTetto = (x) => {
    if (!num(x.tetto) || x.ore <= x.tetto + EPS) return;
    s.tagliTetto = [...lista(s.tagliTetto), { giorno: x.giorno, minuti: (x.ore - x.tetto) * 60, tetto: x.tetto * 60 }];
    x.ore = x.tetto;
  };
  const primo = sedute[0];
  const tetto = Math.min(passoLunga(l30(primo.giorno), dolori), daSei(classe) ? PIANO.uscitaMassima : Infinity);
  if (primo.tipo === "blocco") {
    for (const x of sedute) {
      x.ore = Math.min(x.ore, tetto);
      alTetto(x);
    }
  } else {
    primo.ore = Math.min(primo.ore, tetto);
    alTetto(primo);
    for (const x of sedute.slice(1)) {
      x.ore = Math.min(x.ore, primo.ore);
      alTetto(x);
    }
  }
  if (primo.tipo === "T1" && primo.ore < PRONTEZZA.giornoCaricoOre - EPS) primo.nota = "corto";
}

// Le lunghe della settimana, con le ore finali, per il passo delle settimane dopo.
function ricordaLunghe(s, lunghe) {
  for (const x of s.sedute) if (x.possibile !== false) lunghe.push({ giorno: x.giorno, ore: x.ore });
}

const oreChiaveDella = (s) => somma(s.sedute.filter((x) => x.possibile !== false), (x) => x.ore);
const mediaOre = () => S.media.minimo / 60;

// Le sedute chiave di un giorno che non stanno nella settimana si accorciano, mai sotto un'ora.
// Restano la media e, se c'è posto, mezz'ora per un giro facile, così 2 uscite su 3 sono facili
// (regola 2.1).
function stringiChiave(s, ore, riserva = 0) {
  const singole = s.sedute.filter((x) => x.possibile !== false);
  const totale = somma(singole, (x) => x.ore);
  const spazio = ore - mediaOre() - riserva;
  if (totale <= spazio + EPS || !singole.length) return;
  const fattore = Math.max(0, spazio) / totale;
  for (const x of singole) x.ore = Math.max(PIANO.lungaDichiarata.minimo, x.ore * fattore);
}

// Le sedute chiave che non stanno sotto un tetto della settimana si accorciano fino a starci, con la
// media, anche sotto un'ora. Così i piani corti non superano mai h4 di oltre il 30% o il 20% e la
// settimana dopo un blocco resta al 70% (3.4, 3.5 punto 6 e 8.4). Il controllo di fattibilità dice
// poi se le prove bastano.
function stringiAlTetto(s, ore) {
  const singole = s.sedute.filter((x) => x.possibile !== false);
  const totale = somma(singole, (x) => x.ore);
  const spazio = Math.max(0, ore - mediaOre());
  if (totale <= spazio + EPS || !singole.length) return;
  for (const x of singole) x.ore *= spazio / totale;
}

// La settimana più piccola del piano, un'ora di lunga e la media (3.5 e 3.7). Vale anche come
// fondo del tetto dopo un blocco, perché il 70% di quasi niente non è una settimana, lettura nostra.
const settimanaMinima = () => PIANO.lungaDichiarata.minimo + mediaOre();

// Applica le regole di 3.5 alle settimane, in ordine. settimane sono le righe con le date e le sedute
// chiave, storico quello di leggiStorico, k i punti per ora della persona. contesto ha H, vOb, A,
// partenza, classe, oggi e schema. Restituisce { settimane, fattibilita } con le ore di ogni
// settimana (orePiene per la settimana intera, ore per i giorni del piano). La fattibilità qui conta
// le ore a settimane spalmate, pianoLungo la rifà sui giorni veri.
export function applicaCrescita(settimane, storico = {}, profilo = {}, k = null, contesto = {}) {
  const prime = lista(settimane);
  const oggi = contesto.oggi || (prime[0] && prime[0].dal) || oggiIso();
  const st = leggiStorico(storico, oggi, prime[0] ? prime[0].lunedi : null);
  const prof = leggiProfiloPiano(profilo);
  const kk = num(k) && k > 0 ? k : st.k || CARICO.puntiOraSenzaDati;
  const A = num(contesto.A) ? contesto.A : Infinity;
  const classe = contesto.classe || DUE_CINQUE;
  const P = PIANO;
  const storia = st.settimane.map((x) => ({ ...x }));
  const lunghe = [...st.lunghe];
  const interrotto = st.interruzione && st.interruzione.giorni > P.passoLunga.giorniFermi;
  const dolori = st.dolori || Boolean(interrotto);
  const r7 = Math.exp(-7 / CARICO.serie.fitness);
  let F = num(st.fitness) ? st.fitness : (kk * st.h4) / 7;
  const salite = [];
  const avvisi = [];

  prime.forEach((s, idx) => {
    s.avvisi = s.avvisi || [];
    const prev = storia[storia.length - 1] || { ore: st.h4, tipo: "N", chiaveOre: st.l30 };
    passoDellaSettimana(s, lunghe, dolori, classe);
    for (const t of lista(s.tagliTetto)) {
      s.avvisi.push({ tipo: "tettoGiorno", giorno: t.giorno, minuti: Math.round(t.minuti), testo: T.fraseTettoGiorno(t.minuti, t.giorno, t.tetto) });
    }
    let oreChiave = oreChiaveDella(s);
    let ore = null;
    if (s.tipo === "base") {
      let carico = null;
      for (let i = storia.length - 1; i >= 0 && !carico; i--) if (DI_CARICO.has(storia[i].tipo)) carico = storia[i];
      const da = Math.max(idx === 0 || !carico ? st.h4 : carico.ore, P.base.oreMinime);
      ore = Math.min(da * (1 + P.base.crescita), num(s.oreTarget) ? s.oreTarget : Infinity, tettoSettimana(storia), A);
    } else if (s.tipo === "N") {
      ore = Math.min(num(s.oreTarget) ? s.oreTarget : prev.ore, tettoSettimana(storia), A);
    } else if (s.tipo === "E") {
      let normale = null;
      for (let i = storia.length - 1; i >= 0 && !normale; i--) if (NORMALI.has(storia[i].tipo)) normale = storia[i];
      const fer = normale ? normale.ore - (normale.chiaveOre || 0) : st.h4 - Math.min(st.h4, st.l30);
      ore = oreSettimanaChiave(s.oreTarget, oreChiave, fer);
    } else if (s.tipo === "S") {
      ore = Math.min(num(s.oreTarget) ? s.oreTarget : Infinity, (num(s.scarico) ? s.scarico : P.scarico.ore) * prev.ore);
    } else if (s.tipo === "F" || s.tipo === "F7") {
      const carichi = storia.filter((x) => DI_CARICO.has(x.tipo)).slice(-DOMENICA.settimanaFacile.settimane);
      const media = carichi.length ? somma(carichi, (x) => x.ore) / carichi.length : st.h4;
      ore = DOMENICA.settimanaFacile.ore * media;
    } else if (s.tipo === "corto") {
      ore = num(s.oreTarget) ? s.oreTarget : st.h4;
    }
    // Da qui le regole possono solo abbassare (3.4). Le settimane con weekend e prove hanno già le
    // sedute chiave più un'ora, e i tetti che seguono valgono anche per loro, che allora accorciano
    // le sedute chiave (stringiAlTetto).
    if (ore !== null && num(s.oreMassime)) ore = Math.min(ore, s.oreMassime);

    // Dopo un blocco, o dopo una settimana oltre il 150% del solito, al massimo il 70% (regola 2.7).
    // Il 70% del solito, non della settimana grande, lettura prudente, e mai sotto la settimana minima.
    if (ore !== null && storia.length) {
      const solito = mediaTre(storia, storia.length - 1);
      const grande = solito !== null && prev.ore > P.dopoBlocco.settimanaOltre * solito + EPS;
      if (prev.blocco || grande) {
        ore = Math.min(ore, Math.max(P.dopoBlocco.massimo * (solito ?? prev.ore), settimanaMinima()));
        s.dopoBlocco = true;
      }
    }

    // Le interruzioni (regola 2.9) e l'avviso di crescita rapida (regola 1.9), sulla prima settimana.
    if (idx === 0 && ore !== null && st.interruzione) {
      const g = st.interruzione.giorni;
      const I = P.interruzioni;
      if (g > I.giorni && g <= I.giorniRidotta) {
        ore = Math.min(ore, I.ridotta * (num(st.interruzione.orePrima) ? st.interruzione.orePrima : st.h4));
        s.ridotta = "interruzione";
        avvisi.push({ tipo: "interruzione", testo: T.AVVISI.interruzione });
      } else if (g > I.giorniRidotta) {
        avvisi.push({ tipo: "interruzioneLunga", testo: T.AVVISI.interruzioneLunga, rivedi: true });
      }
    }
    if (idx === 0 && ore !== null && st.crescita) {
      ore = Math.min(ore, prev.ore);
      s.ridotta = s.ridotta || "crescita";
      avvisi.push({ tipo: "crescita", testo: T.AVVISI.crescita });
    }

    // La Fitness (regola 2.6). Una settimana normale non la fa salire più dell'8% come media su tre
    // settimane, né più di 5 punti sotto Fitness 60. Si tolgono ore facili, mai la seduta chiave. Vale
    // solo per una settimana che la fa salire, e toglie, non aggiunge.
    if (ore !== null && NORMALI.has(s.tipo) && F > 0) {
      let consentita = (P.fitness.quota * P.fitness.settimane - somma(salite.slice(-(P.fitness.settimane - 1)))) * F;
      if (F < P.fitness.sotto) consentita = Math.min(consentita, P.fitness.punti);
      const salita = F * r7 + ((kk * ore) / 7) * (1 - r7) - F;
      if (salita > EPS && salita > consentita + EPS) {
        const oreMassime = ((F + Math.max(0, consentita) - F * r7) / (1 - r7)) * (7 / kk);
        ore = Math.min(ore, Math.max(oreMassime, oreChiave + mediaOre()));
      }
    }

    // La seduta chiave deve lasciare posto alla media, e il piano corto tutto facile della regola 7.15
    // la tiene nelle sue ore. Nelle settimane con weekend e prove le sedute chiave stanno nei tetti
    // anche sotto un'ora. Nelle altre non scendono sotto un'ora, e la settimana minima di due ore può
    // passare il tetto della crescita, mai quello dei piani corti.
    if (ore !== null && s.tipo === "corto" && oreChiave > ore + EPS) {
      stringiChiave(s, ore + mediaOre());
      oreChiave = oreChiaveDella(s);
    } else if (ore !== null && s.tipo === "E") {
      if (oreChiave + mediaOre() > ore + EPS) {
        stringiAlTetto(s, ore);
        oreChiave = oreChiaveDella(s);
      }
    } else if (ore !== null && s.tipo !== "tapering" && s.tipo !== "corto") {
      const riserva = PIANO.facileBreve / 60;
      if (oreChiave + mediaOre() + riserva > ore + EPS) {
        stringiChiave(s, ore, Math.min(riserva, Math.max(0, ore - mediaOre() - PIANO.lungaDichiarata.minimo)));
        oreChiave = oreChiaveDella(s);
        if (oreChiave + mediaOre() > ore) ore = Math.min(oreChiave + mediaOre(), num(s.oreMassime) ? s.oreMassime : Infinity);
        if (oreChiave + mediaOre() > ore + EPS) {
          stringiAlTetto(s, ore);
          oreChiave = oreChiaveDella(s);
        }
      }
    }
    ricordaLunghe(s, lunghe);

    s.oreChiave = oreChiave;
    s.orePiene = ore;
    if (ore !== null) {
      const nuovo = F * r7 + ((kk * ore) / 7) * (1 - r7);
      salite.push(F > 0 ? (nuovo - F) / F : 0);
      F = nuovo;
      s.fitness = F;
    }
    storia.push({
      lunedi: s.lunedi,
      ore: ore ?? prev.ore,
      tipo: s.tipo,
      chiaveOre: Math.max(0, ...s.sedute.filter((x) => x.possibile !== false).map((x) => x.ore)),
      blocco: s.sedute.some((x) => x.tipo === "blocco" && x.possibile !== false),
    });
  });

  // Lo scarico finale (regola 7 di 3.5, capitolo 3.6).
  const tapering = contesto.partenza ? applicaTapering(prime, st, prof, contesto) : null;
  for (const s of prime) {
    if (s.toccaTapering) continue;
    s.ore = num(s.orePiene) ? s.orePiene * (num(s.quota) ? s.quota : 1) : 0;
  }
  const fattibilita = contesto.ob && contesto.partenza ? fattibilitaSpalmata(prime, st, contesto) : null;
  return { settimane: prime, fattibilita, tapering, avvisi };
}

// --- Lo scarico finale (3.6) ---

// Quanti giorni dura. 7 per un giorno, 16 da 55 anni, 10 con V_rif sotto 5 ore, altrimenti 14. Con
// più giorni Rosso o con la Forma sotto −30 vale sempre quello pieno, cioè almeno 14.
export function durataTapering(classe, eta, vRif, { pieno = false, giorni = null } = {}) {
  const t = PIANO.tapering;
  if (num(giorni)) return giorni;
  if (classe === UN_GIORNO) return pieno ? Math.max(t.unGiorno.giorni, t.normale.giorni) : t.unGiorno.giorni;
  if (num(eta) && eta >= t.lungo.daAnni) return t.lungo.giorni;
  if (num(vRif) && vRif < t.corto.sottoOre - EPS && !pieno) return t.corto.giorni;
  return t.normale.giorni;
}

function fasiTapering(durata) {
  const t = PIANO.tapering;
  const tipo = [t.normale, t.corto, t.lungo, t.unGiorno].find((x) => x.giorni === durata);
  if (tipo) return tipo.fasi;
  return t.normale.fasi.map((f, i) => (i === 0 ? { ...f, da: Math.max(durata, f.da) } : f));
}

// Il volume di ogni giorno dello scarico finale, V_rif / 7 × f, dal giorno durata al giorno 1 prima
// della partenza. durata è in giorni (14, 10, 16 o 7). Restituisce [{ giorno, giorniPrima, fattore, ore }].
export function giorniTapering(partenza, durata, vRif) {
  const fasi = fasiTapering(durata);
  const giorni = [];
  for (let d = durata; d >= 1; d--) {
    const f = fasi.find((x) => d <= x.da && d >= x.a);
    const fattore = f ? f.fattore : 1;
    giorni.push({ giorno: piuGiorni(partenza, -d), giorniPrima: d, fattore, ore: ((num(vRif) ? vRif : 0) / 7) * fattore });
  }
  return giorni;
}

// Le ore di riferimento V_rif (3.6), la media delle settimane −10 a −3. Per le settimane del piano le
// ore previste. Per quelle passate le ore fatte se sono meno di quelle previste dal piano salvato,
// e dove la settimana vera manca quelle previste, poi h4 [stima nostra, prudente].
function oreDiRiferimento(prime, st) {
  const perIndice = new Map(prime.filter((s) => s.indice < 0).map((s) => [s.indice, s]));
  const primo = prime.find((s) => s.indice < 0);
  const previste = new Map(lista(st.passate).map((w) => [w.lunedi, num(w.orePiene) ? w.orePiene : num(w.ore) ? w.ore : null]));
  const valori = [];
  for (let w = PRONTEZZA.finestre.volume.da; w <= PRONTEZZA.finestre.volume.a; w++) {
    const s = perIndice.get(w);
    if (s && num(s.orePiene)) {
      valori.push(s.orePiene);
      continue;
    }
    if (!primo || w >= primo.indice) continue;
    const quante = primo.indice - w;
    const lunedi = piuGiorni(primo.lunedi, -7 * quante);
    const vera = st.settimane.length >= quante ? st.settimane[st.settimane.length - quante] : null;
    let fatte = vera && vera.vera !== false ? vera.ore : null;
    if (fatte === null && typeof st.oreVere === "function") fatte = st.oreVere(lunedi);
    const prevista = previste.has(lunedi) ? previste.get(lunedi) : null;
    if (num(fatte) && num(prevista)) valori.push(Math.min(fatte, prevista));
    else if (num(fatte)) valori.push(fatte);
    else valori.push(num(prevista) ? prevista : st.h4);
  }
  return valori.length ? somma(valori) / valori.length : st.h4;
}

function applicaTapering(prime, st, prof, contesto) {
  const { partenza, classe } = contesto;
  const vRif = oreDiRiferimento(prime, st);
  const pieno = st.rossi >= PIANO.tapering.pieno.rossi || (num(st.formaMinima) && st.formaMinima < PIANO.tapering.pieno.forma);
  const durata = durataTapering(classe, prof.eta, vRif, { pieno, giorni: contesto.schema === "7.14" ? PIANO.corti.quattro.tapering : null });
  const giorni = giorniTapering(partenza, durata, vRif);
  const volume = new Map(giorni.map((g) => [g.giorno, g.ore]));
  const inizio = giorni[0].giorno;
  let primaDelTapering = null;
  for (const s of prime) {
    if (s.tipo === "tapering" || piuGiorni(s.lunedi, 6) >= inizio) break;
    primaDelTapering = s;
  }
  const orePrima = primaDelTapering && num(primaDelTapering.orePiene) ? primaDelTapering.orePiene : st.h4;
  for (const s of prime) {
    if (s.al < inizio && s.tipo !== "tapering") continue;
    const fuori = s.tipo === "tapering" ? Math.min(vRif, orePrima) / 7 : (num(s.orePiene) ? s.orePiene : 0) / 7;
    let ore = 0;
    let dentro = 0;
    for (let d = s.dal; d <= s.al; d = piuGiorni(d, 1)) {
      ore += volume.has(d) ? volume.get(d) : fuori;
      if (volume.has(d)) dentro += 1;
    }
    const proprie = num(s.oreTarget) && (s.tipo === "tapering" || s.tipo === "corto") ? s.oreTarget * s.quota : null;
    s.ore = proprie !== null ? Math.min(proprie, ore) : ore;
    s.giorniTapering = dentro;
    s.inizioTapering = inizio;
    // Una settimana che tocca lo scarico finale per pochi giorni resta la sua, con le ore ridotte.
    s.inTapering = s.tipo === "tapering" || s.tipo === "corto" || dentro >= PIANO.tapering.settimanaDaGiorni;
    s.toccaTapering = true;
    // La seduta chiave lascia posto al richiamo, e non va mai oltre le ore dello scarico finale.
    const richiamo = s.tipo === "corto" ? 0 : S.richiamo.minimo / 60;
    const chiave = s.sedute.filter((x) => x.possibile !== false);
    const oreChiave = somma(chiave, (x) => x.ore);
    if (chiave.length && oreChiave + richiamo > s.ore + EPS) {
      const fattore = Math.max(0, s.ore - richiamo) / oreChiave;
      for (const x of chiave) x.ore = Math.max(Math.min(PIANO.lungaDichiarata.minimo, x.ore), x.ore * fattore);
      if (somma(chiave, (x) => x.ore) > s.ore + EPS) s.ore = somma(chiave, (x) => x.ore);
    }
    if (s.tipo === "tapering" && !num(s.orePiene)) s.orePiene = s.ore / Math.max(s.quota, 1 / 7);
  }
  return { durata, vRif, inizio, giorni };
}

// --- Il controllo di fattibilità (regola 10 di 3.5) ---

// Le ore del piano di ogni giorno, con le sedute chiave nei loro giorni e il resto spalmato.
function orePerGiornoSpalmate(prime) {
  const ore = new Map();
  for (const s of prime) {
    const chiave = s.sedute.filter((x) => x.possibile !== false);
    const giorniChiave = new Set(chiave.map((x) => x.giorno));
    const liberi = [];
    for (let d = s.dal; d <= s.al; d = piuGiorni(d, 1)) if (!giorniChiave.has(d)) liberi.push(d);
    const resto = liberi.length ? Math.max(0, s.ore - somma(chiave, (x) => x.ore)) / liberi.length : 0;
    for (const d of liberi) ore.set(d, (ore.get(d) || 0) + resto);
    for (const x of chiave) ore.set(x.giorno, (ore.get(x.giorno) || 0) + x.ore);
  }
  return ore;
}

function fattibilitaSpalmata(prime, st, contesto) {
  const ore = orePerGiornoSpalmate(prime);
  const attivita = [];
  for (const [d, o] of ore) if (o > 0) attivita.push(attivitaPiano(d, o * 60, "facile"));
  for (const s of prime) {
    for (const x of s.sedute.filter((y) => y.possibile !== false)) {
      const a = attivita.find((y) => y.giorno === x.giorno);
      if (a) Object.assign(a, { borse: x.borse, notteFuori: x.notteFuori });
    }
  }
  return controlloFattibilita([...st.uscite, ...attivita], contesto);
}

// Un giorno del piano come attività, nella forma di js/dati.js.
function attivitaPiano(giorno, minuti, tipo, extra = {}) {
  return {
    id: `piano-${giorno}-${tipo}`,
    giorno,
    inizio: `${giorno}T08:00:00`,
    tipo: "Ride",
    sorgente: "PIANO",
    secondi: Math.round(minuti * 60),
    borse: "no",
    notteFuori: false,
    kg: null,
    rulli: false,
    eBike: false,
    stub: false,
    commute: false,
    qualita: { secondi: QUALITA.vera },
    inProgramma: true,
    ...extra,
  };
}

// Il piano è corto se la media dalla −10 alla −3, contata a blocchi di 7 giorni come in 2.2, sta sotto
// V_min, se la lunga più lunga non arriva a 0,9 × LT o se una prova minima non c'è. Usa i pilastri di
// js/prontezza.js, così piano e verdetto parlano la stessa lingua.
function controlloFattibilita(attivita, contesto) {
  const { partenza, classe, H, ob, esperienza, borseKg, eBikeEvento = false } = contesto;
  const dal = piuGiorni(partenza, 7 * PRONTEZZA.finestre.T1.da);
  const giorni = giorniDiBici(attivita, { dal, al: piuGiorni(partenza, -1), eBikeEvento });
  const volume = pilastroVolume(giorni, partenza, ob);
  const lunga = pilastroLunga(attivita, partenza, classe, ob, { eBikeEvento });
  const borse = pilastroBorse(attivita, partenza, H, classe, esperienza, [], { borseKg, eBikeEvento });
  const motivi = [];
  if (volume.difetto > 0) motivi.push("volume");
  if (lunga.difetto > 0) motivi.push("lunga");
  if (borse.difetto > 0) motivi.push("prove");
  return { corto: motivi.length > 0, motivi, volume: volume.valore, lunga: lunga.valore, prove: borse.righe.map((r) => ({ prova: r.prova, stato: r.stato })) };
}

// --- La settimana, giorno per giorno (3.7) ---

const sforzoDi = (tipo) => {
  const M = PIANO.sforzoMassimo;
  if (num(M[tipo])) return M[tipo];
  return PIU_GIORNI.has(tipo) ? M.piuGiorni : PROVE.has(tipo) ? M.prova : M.facile;
};

// I carboidrati all'ora di un'uscita (3.9). Sotto 75 minuti facili nessun obbligo, fino a 2 ore e
// mezza 30-60 g, oltre 40-60 g con cibo vero, mai oltre 90.
export function carboidratiPer(minuti, tipo = "facile") {
  const C = PIANO.carboidrati;
  if (!(minuti > 0) || !BICI.has(tipo)) return null;
  const facile = !NON_FACILI.has(tipo);
  if (facile && minuti < C.liberoSottoMinuti) return null;
  if (minuti > C.lungo.oltreMinuti) return { grammi: [...C.lungo.grammi], testo: T.CIBO.lungo };
  if (minuti >= C.medio.daMinuti) return { grammi: [...C.medio.grammi], testo: T.CIBO.medio };
  return null;
}

function nuovaSeduta(tipo, minuti, extra = {}) {
  return {
    tipo,
    minuti: Math.round(minuti),
    sforzoMassimo: sforzoDi(tipo),
    borse: CARICHE.has(tipo) ? "evento" : "no",
    notteFuori: false,
    parte: null,
    di: null,
    chiave: false,
    nota: null,
    carboidrati: carboidratiPer(minuti, tipo),
    ...extra,
  };
}

function sedutaDaChiave(x) {
  return nuovaSeduta(x.tipo, x.ore * 60, {
    borse: x.borse,
    notteFuori: x.notteFuori,
    parte: x.parte,
    di: x.di,
    chiave: true,
    nota: x.nota || null,
    portata: x.portata === true,
  });
}

// Le fatiche volute di una settimana, per i giorni dopo e per il semaforo. Weekend, prove, blocchi
// e uscite grandi, cioè almeno 5 ore (regola 8.8). I test di un giorno contano come prove, lettura
// prudente della regola 2.5.
export function faticheDi(sedute) {
  const fatiche = [];
  const vere = lista(sedute).filter((x) => x && x.possibile !== false).sort(perGiorno);
  const multi = new Map();
  for (const x of vere) {
    if (PIU_GIORNI.has(x.tipo) && x.di > 1) {
      const chiave = `${x.tipo}-${x.di}-${giorniFra(x.giorno, "2000-01-03") + (x.parte || 1)}`;
      if (!multi.has(chiave)) multi.set(chiave, []);
      multi.get(chiave).push(x);
      continue;
    }
    const ore = num(x.ore) ? x.ore : x.minuti / 60;
    if (PROVE.has(x.tipo)) fatiche.push({ tipo: "prova", inizio: x.giorno, fine: x.giorno, ore, seduta: x.tipo });
    else if (ore + EPS >= SEMAFORO.uscitaGrande.ore) fatiche.push({ tipo: "uscitaGrande", inizio: x.giorno, fine: x.giorno, ore, seduta: x.tipo });
  }
  for (const giorni of multi.values()) {
    const tipo = giorni[0].tipo === "blocco" ? "blocco" : giorni[0].tipo === "weekend" ? "weekend" : "prova";
    fatiche.push({ tipo, inizio: giorni[0].giorno, fine: giorni[giorni.length - 1].giorno, ore: Math.max(...giorni.map((g) => (num(g.ore) ? g.ore : g.minuti / 60))), seduta: giorni[0].tipo });
  }
  return fatiche.sort((a, b) => (a.fine < b.fine ? -1 : 1));
}

// I giorni del piano di una settimana. I giorni prima della partenza nella settimana 0, se sono meno
// di PIANO.settimanaZeroSotto, hanno solo giri facili, senza il richiamo.
const pianoGiorniDi = (giorni) => giorni.filter((g) => !g.fuori).length;

const GRAVITA_LIMITE = { facile: 1, breve: 2, riposo: 3 };
function limita(g, limite) {
  if (!g.limite || GRAVITA_LIMITE[limite] > GRAVITA_LIMITE[g.limite]) g.limite = limite;
}

const conGambe = (sch, seduta) => [1, 2, 3, 4, 8].includes(sch) || (sch === 5 && seduta !== "leggera");

// Le sedute di palestra di una fase per una settimana, con la seduta A, B, breve o della scheda 5.
function seduteDiPalestra(fase, n) {
  const elenco = [];
  for (let i = 0; i < n; i++) {
    let seduta = fase.variante || null;
    if (fase.scheda === 2 || fase.scheda === 3) seduta = n >= 2 ? (i === 0 ? "A" : "B") : (fase.settimana % 2 === 1 ? "A" : "B");
    if (fase.scheda === 4 && fase.sedutaBreve && i === 1) seduta = "breve";
    const minuti = SCHEDE[fase.scheda] && SCHEDE[fase.scheda].minuti ? SCHEDE[fase.scheda].minuti.a : CARICO.palestra.minutiPredefiniti;
    elenco.push({
      tipo: "palestra",
      minuti,
      scheda: fase.scheda,
      seduta,
      settimana: fase.settimana,
      nome: SCHEDE[fase.scheda] ? SCHEDE[fase.scheda].nome : null,
      gambe: conGambe(fase.scheda, seduta),
      sforzoMassimo: PIANO.sforzoMassimo.palestra,
      chiave: false,
    });
  }
  return elenco;
}

// I sette giorni di una settimana con i passi di 3.7. settimana è una settimana del piano lungo, con
// lunedi, indice, tipo, ore (quelle dei giorni del piano), sedute (le chiavi con la data), dal, al,
// partenza, usciteMinime e, nello scarico finale, inizioTapering. palestra è la fase di fasePalestra
// di questa settimana, oppure { fase, giaFatte } con le sedute fatte e messe prima. storico ha
// fatiche (quelle delle settimane prima), portate (le sedute chiave della settimana prima che cadono
// in questa, che contano anche fra le fatiche), stomaco (i grammi della lunga che allena lo stomaco),
// limite (il limite del facile, se c'è) e senzaBiciPrima (i giorni dello scarico finale senza bici
// alla fine della settimana prima).
// Restituisce { lunedi, indice, tipo, giorni, ore, oreMesse, mancano, uscite, facili, palestre,
// chiave, avvisi, frase, senzaBici }, con ogni giorno { giorno, giornoSettimana, fuori, disponibile,
// tetto, tettoChiave, tettoPiuGiorni, sedute, ore }.
export function settimanaConcreta(settimana, disponibilita = {}, profilo = {}, palestra = null, storico = {}) {
  const s = settimana || {};
  const disp = leggiDisponibilita(disponibilita);
  const prof = leggiProfiloPiano(profilo);
  const st = storico || {};
  const partenza = dataDi(s.partenza) || dataDi(st.partenza);
  const lunedi = s.lunedi;
  const dal = s.dal || lunedi;
  const fineSettimana = piuGiorni(lunedi, 6);
  const al = s.al || (partenza && piuGiorni(partenza, -1) < fineSettimana ? piuGiorni(partenza, -1) : fineSettimana);
  const giorni = [];
  for (let i = 0; i < 7; i++) {
    const d = piuGiorni(lunedi, i);
    giorni.push({
      giorno: d,
      giornoSettimana: i,
      fuori: d < dal || d > al,
      disponibile: tettoDi(disp, i) > 0,
      tetto: tettoDi(disp, i, "facile"),
      tettoChiave: tettoDi(disp, i, "chiave"),
      tettoPiuGiorni: tettoDi(disp, i, "piuGiorni"),
      sedute: [],
      ore: 0,
      limite: null,
      noMedia: false,
      noGambe: false,
      facileSePuoi: false,
      riservato: false,
    });
  }
  const pos = new Map(giorni.map((g, i) => [g.giorno, i]));
  const avvisi = [...lista(s.avvisi)];
  const metti = (g, x) => g.sedute.push(x);
  const bici = (g) => g.sedute.some((x) => BICI.has(x.tipo));
  const tipoSett = s.tipo || "N";
  const leggera = ["S", "tapering", "corto", "F", "F7"].includes(tipoSett) || s.inTapering === true;
  const facileDomenica = tipoSett === "F" || tipoSett === "F7";

  // 1. Le sedute chiave, anche quelle portate dalla settimana prima.
  const proprie = lista(s.sedute).filter((x) => x && x.possibile !== false);
  const portate = lista(st.portate).filter((x) => x && x.possibile !== false && pos.has(x.giorno)).map((y) => ({ ...y, portata: true }));
  const giorniChiave = new Set();
  for (const x of [...portate, ...proprie]) {
    const i = pos.get(x.giorno);
    if (i === undefined || giorni[i].fuori) continue;
    let seduta = sedutaDaChiave(x);
    if (facileDomenica) seduta = nuovaSeduta("facile", Math.min(seduta.minuti, DOMENICA.settimanaFacile.chiaveOre * 60));
    metti(giorni[i], seduta);
    giorniChiave.add(x.giorno);
  }
  const oreChiave = somma(proprie, (x) => x.ore);

  // 2. I giorni dopo weekend, prove, blocchi e uscite grandi (regole 2.5 e 8.8), anche quelli
  // cominciati la settimana prima.
  const riposoN = prof.eta >= GD.daAnni ? GD.riposoDa50 : GD.riposo;
  const fatiche = [...lista(st.fatiche), ...faticheDi([...portate, ...proprie])];
  const segna = (fine, k, cosa) => {
    const i = pos.get(piuGiorni(fine, k));
    if (i === undefined || giorniChiave.has(giorni[i].giorno)) return;
    cosa(giorni[i]);
  };
  const oreDopo = PP.oreDopoFatiche / 24;
  for (const f of fatiche) {
    if (f.tipo === "uscitaGrande") {
      const n = prof.eta >= GD.daAnni ? GD.dopoGrande.giorniDa50 : GD.dopoGrande.giorni;
      for (let k = 1; k <= n; k++) segna(f.fine, k, (g) => limita(g, "breve"));
    } else {
      for (let k = 1; k <= riposoN; k++) segna(f.fine, k, (g) => limita(g, "riposo"));
      const facili = f.tipo === "blocco" ? Math.max(GD.facileDopoBloccoSempre, riposoN + GD.facili) : riposoN + GD.facili;
      for (let k = riposoN + 1; k <= facili; k++) segna(f.fine, k, (g) => limita(g, "facile"));
      if (f.tipo === "blocco") for (let k = facili + 1; k <= GD.facileDopoBlocco; k++) segna(f.fine, k, (g) => { g.facileSePuoi = true; });
    }
    for (let k = 1; k <= PIANO.media.giorniDopoFatiche; k++) segna(f.fine, k, (g) => { g.noMedia = true; });
    for (let k = 1; k < oreDopo; k++) segna(f.fine, k, (g) => { g.noGambe = true; });
  }
  for (const x of proprie) {
    if (!PIU_GIORNI.has(x.tipo) && x.ore > GD.uscitaOltreOre + EPS) segna(x.giorno, 1, (g) => limita(g, "facile"));
  }

  // 3. L'uscita media con salite, una a settimana (regola 2.2). Nello scarico finale è il richiamo.
  // Il piano corto della regola 7.15 è tutto facile, e non la mette. Va solo in un giorno feriale e
  // mai il giorno prima della seduta chiave. Se non c'è un giorno buono salta, e la pagina lo dice.
  let media = null;
  const settimanaCorta = s.indice === 0 && pianoGiorniDi(giorni) < PIANO.settimanaZeroSotto;
  if (!facileDomenica && tipoSett !== "corto" && !settimanaCorta) {
    const tipoMedia = s.inTapering || tipoSett === "tapering" || tipoSett === "corto" ? "richiamo" : "media";
    const resto = (num(s.ore) ? s.ore : 0) * 60 - oreChiave * 60;
    let minuti;
    if (tipoMedia === "richiamo") minuti = Math.min(S.richiamo.massimo, resto);
    else if (tipoSett === "S") minuti = S.media.scarico;
    else minuti = fra(S.media.quotaOre * resto, S.media.minimo, S.media.massimo);
    const minimo = tipoMedia === "richiamo" ? S.richiamo.minimo : S.media.minimo;
    const primaDellaChiave = (g) => giorniChiave.has(piuGiorni(g.giorno, 1));
    const ultimoGiorno = (g) => partenza && giorniFra(g.giorno, partenza) <= 1;
    // Al primo giro i giorni 4 e 5 dopo un blocco restano facili, al secondo vale anche lì (regola 2.2).
    const adatto = (g, livello) => !g.fuori && g.disponibile && g.tetto >= minimo && !g.sedute.length && !g.noMedia
      && g.limite === null && !ultimoGiorno(g) && !primaDellaChiave(g) && (livello >= 1 || !g.facileSePuoi);
    const feriali = PIANO.media.ordineGiorni.map((i) => giorni[i]);
    let scelto = null;
    if (minuti >= minimo - EPS) {
      for (let livello = 0; livello <= 1 && !scelto; livello++) scelto = feriali.find((g) => adatto(g, livello)) || null;
      if (!scelto) avvisi.push({ tipo: tipoMedia === "richiamo" ? "richiamoSalta" : "mediaSalta", testo: tipoMedia === "richiamo" ? T.AVVISI.richiamoSalta : T.AVVISI.mediaSalta });
    }
    if (scelto) {
      media = nuovaSeduta(tipoMedia, Math.min(minuti, scelto.tetto));
      metti(scelto, media);
    }
  }

  // 4. La palestra (regole 4.4 e 7.12), quante sedute dice la fase, nei giorni che rispettano tutto.
  const fase = palestra && palestra.fase ? palestra.fase : palestra;
  const giaFatte = palestra && num(palestra.giaFatte) ? palestra.giaFatte : 0;
  const palestre = [];
  let palestraNonCi = false;
  const previste = fase && fase.scheda && num(fase.sedute) ? seduteDiPalestra(fase, fase.sedute) : [];
  const giorniAPartenza = (g) => (partenza ? giorniFra(g.giorno, partenza) : Infinity);
  // Le uscite di oltre 3 ore nei giorni dopo, anche nella settimana dopo.
  const dopoSettimana = [...lista(st.prossime), ...proprie].filter((x) => x && x.possibile !== false && !pos.has(x.giorno));
  const lungaDopo = (g, k) => {
    const d = piuGiorni(g.giorno, k);
    const i = pos.get(d);
    if (i === undefined) return dopoSettimana.some((x) => x.giorno === d && x.ore * 60 > PP.lungaOltreOre * 60 + EPS);
    return giorni[i].sedute.some((x) => BICI.has(x.tipo) && x.minuti > PP.lungaOltreOre * 60 + EPS);
  };
  const finestra = PP.ultimaPesante;
  const finestraFam = PP.ultimaPesanteFamiliarizzazione;
  const nellaFinestra = (g, f) => giorniAPartenza(g) <= f.da && giorniAPartenza(g) >= f.a;
  const famSola = fase && fase.familiarizzazione && fase.gambeFinoA === finestraFam.a;
  // L'ultima seduta pesante sta nella prima settimana che ha giorni della sua finestra. Se lì non ci
  // sta, la cerca la settimana dopo, e se c'è già non ce ne sono altre.
  const ultimaFatta = Boolean(palestra && palestra.ultimaFatta);
  const conFinestra = (f) => giorni.some((g) => !g.fuori && nellaFinestra(g, f)) && !ultimaFatta;
  const ultimaFinestra = famSola ? finestraFam : finestra;
  // Un giorno resta sempre senza bici e senza palestra (regola 8.16). Con sette giorni disponibili
  // è il giorno prima della seduta chiave.
  const pianoGiorni = giorni.filter((g) => !g.fuori);
  const riserva = () => {
    if (pianoGiorni.length < PIANO.settimana.riposoDaGiorni) return;
    const vuoti = pianoGiorni.filter((g) => !g.sedute.length && !g.riservato);
    if (vuoti.some((g) => !g.disponibile) || pianoGiorni.some((g) => g.riservato)) return;
    const primaChiave = pianoGiorni.find((g) => giorniChiave.has(piuGiorni(g.giorno, 1)) && !g.sedute.length);
    const scelto = primaChiave || [...vuoti].sort((a, b) => a.tetto - b.tetto || b.giornoSettimana - a.giornoSettimana)[0];
    if (scelto) scelto.riservato = true;
  };
  riserva();
  let ultimaInFinestra = false;
  for (const x of previste) {
    if (x.gambe && ultimaFatta) continue;
    const distanza = fase.familiarizzazione ? PP.giorniFraSeduteFamiliarizzazione : PP.giorniFraSedute;
    const prima = giaFatte + palestre.length < PP.primeSedute;
    const inizio = num(fase.settimanaBlocco) && fase.settimanaBlocco <= PP.settimaneInizio;
    const ultima = x.gambe && x.scheda !== 1 && conFinestra(ultimaFinestra) && x === previste[previste.length - 1];
    const ultimaFam = x.gambe && famSola && conFinestra(finestraFam) && x === previste[previste.length - 1];
    const va = (g, passo, soloFinestra) => {
      if (g.fuori || g.riservato || g.sedute.some((y) => y.chiave || NON_FACILI.has(y.tipo) || y.tipo === "palestra")) return false;
      if (passo === 0 && g.disponibile) return false;
      if (palestre.some((p) => Math.abs(giorni.indexOf(p) - giorni.indexOf(g)) < distanza)) return false;
      if (prima && (lungaDopo(g, 1) || lungaDopo(g, 2))) return false;
      if (x.gambe) {
        if (g.noGambe) return false;
        if (lungaDopo(g, 1) || (inizio && lungaDopo(g, 2))) return false;
        if (num(fase.gambeFinoA) && giorniAPartenza(g) < fase.gambeFinoA) return false;
        if (soloFinestra && !nellaFinestra(g, ultimaFinestra)) return false;
      }
      return true;
    };
    // Prima i giorni senza bici e fuori dalla disponibilità, poi gli altri. L'ultima seduta pesante
    // cerca prima nella sua finestra, e se lì non ci sta va nei giorni prima.
    const cerca = (soloFinestra) => {
      for (let passo = 0; passo <= 1; passo++) {
        const g = pianoGiorni.find((y) => va(y, passo, soloFinestra));
        if (g) return g;
      }
      return null;
    };
    const scelto = ((ultima || ultimaFam) && cerca(true)) || cerca(false);
    if (!scelto) {
      palestraNonCi = true;
      continue;
    }
    const seduta = { ...x };
    if (fase.scheda === 5 && seduta.seduta !== "leggera" && ultima) seduta.seduta = "ultima";
    if ((ultima || ultimaFam) && nellaFinestra(scelto, ultimaFinestra)) ultimaInFinestra = true;
    metti(scelto, seduta);
    palestre.push(scelto);
    riserva();
  }
  if (palestraNonCi && !palestre.length && previste.length) avvisi.push({ tipo: "palestraSalta", testo: T.AVVISI.palestraSalta });

  // 5. Le uscite facili riempiono le ore che restano.
  let resto = (num(s.ore) ? s.ore : 0) * 60 - oreChiave * 60 - (media ? media.minuti : 0);
  const chiaveSingola = proprie.length === 1 && ["lunga", "scarico", "controllo"].includes(proprie[0].tipo) ? proprie[0] : null;
  const conWeekend = proprie.some((x) => PIU_GIORNI.has(x.tipo));
  const libero = (g) => !g.fuori && g.disponibile && !g.riservato && g.limite !== "riposo"
    && !g.sedute.some((y) => BICI.has(y.tipo)) && (disp.dueCose || !g.sedute.some((y) => y.tipo === "palestra"));
  const ordina = () => {
    const dopo = chiaveSingola && !conWeekend ? giorni[pos.get(piuGiorni(chiaveSingola.giorno, 1))] : null;
    const altri = giorni.filter((g) => libero(g) && g !== dopo).sort((a, b) => b.tetto - a.tetto || a.giornoSettimana - b.giornoSettimana);
    return dopo && libero(dopo) ? [dopo, ...altri] : altri;
  };
  const massimoDi = (g) => Math.min(g.tetto, g.limite === "breve" ? GD.dopoGrande.minuti : facileDomenica ? DOMENICA.settimanaFacile.giroMassimoOre * 60 : S.facile.massimo);
  const facili = [];
  if (!leggera) {
    for (const g of ordina()) {
      if (resto < S.facile.minimo - EPS) break;
      const m = Math.min(massimoDi(g), resto);
      if (m < S.facile.minimo - EPS) continue;
      const x = nuovaSeduta("facile", m);
      metti(g, x);
      facili.push([g, x]);
      resto -= x.minuti;
    }
    // Quello che resta va alla media fino a 90 minuti, poi alle facili fino a 90, il resto si lascia.
    if (resto > EPS && media && media.tipo === "media") {
      const g = giorni.find((y) => y.sedute.includes(media));
      const extra = Math.min(resto, Math.min(S.media.massimo, g.tetto) - media.minuti);
      if (extra > 0) {
        media.minuti = Math.round(media.minuti + extra);
        media.carboidrati = carboidratiPer(media.minuti, "media");
        resto -= extra;
      }
    }
    for (const [g, x] of facili) {
      if (resto <= EPS) break;
      const extra = Math.min(resto, massimoDi(g) - x.minuti);
      if (extra > 0) {
        x.minuti = Math.round(x.minuti + extra);
        x.carboidrati = carboidratiPer(x.minuti, "facile");
        resto -= extra;
      }
    }
    // 7. L'intensità (regola 2.1). Con una sola media servono almeno 3 uscite, così 2 su 3 sono
    // facili. Se mancano, un giro facile corto prende il resto e la media scende verso un'ora.
    // Il giorno dopo weekend e prove vale anche un recupero di 30-45 minuti (regola 2.5).
    const corse = giorni.reduce((n, g) => n + g.sedute.filter((y) => BICI.has(y.tipo)).length, 0);
    if (media && corse < CONUNAMEDIA) {
      const recupero = giorni.find((y) => !y.fuori && y.disponibile && !y.riservato && y.limite === "riposo" && !bici(y)
        && (disp.dueCose || !y.sedute.some((z) => z.tipo === "palestra")));
      const g = ordina()[0] || recupero || null;
      const tolti = Math.max(0, media.minuti - S.media.minimo);
      if (g && resto + tolti >= PIANO.facileBreve - EPS) {
        const tipo = g.limite === "riposo" ? "recupero" : "facile";
        const m = Math.min(tipo === "recupero" ? Math.min(S.recupero.massimo, g.tetto) : massimoDi(g), resto + tolti);
        const daMedia = Math.max(0, m - resto);
        media.minuti = Math.round(media.minuti - daMedia);
        media.carboidrati = carboidratiPer(media.minuti, media.tipo);
        const x = nuovaSeduta(tipo, m);
        metti(g, x);
        facili.push([g, x]);
        resto = Math.max(0, resto - (m - daMedia));
      }
    }
  } else {
    // Nelle settimane leggere le ore si dividono su più giri, così restano l'80% delle uscite.
    let corse = giorni.reduce((n, g) => n + g.sedute.filter((y) => BICI.has(y.tipo)).length, 0);
    const minime = Math.max(num(s.usciteMinime) ? s.usciteMinime : 0, media ? CONUNAMEDIA : 0);
    let candidati = ordina();
    if (facileDomenica) {
      const senzaBici = pianoGiorni.filter((g) => !bici(g)).length;
      candidati = candidati.slice(0, Math.max(0, senzaBici - DOMENICA.settimanaFacile.giorniSenzaBici));
    }
    let recuperi = [];
    if (minime > corse + candidati.length) {
      recuperi = giorni.filter((g) => !g.fuori && g.disponibile && !g.riservato && g.limite === "riposo" && !bici(g)
        && (disp.dueCose || !g.sedute.some((y) => y.tipo === "palestra")));
    }
    // Per tenere l'80% delle uscite l'uscita tranquilla si accorcia, mai sotto un'ora, e le ore
    // della settimana restano quelle (regola 2.7, lettura prudente).
    const servono = Math.min(Math.max(0, minime - corse), candidati.length + recuperi.length);
    const corta = chiaveSingola && !conWeekend ? giorni.flatMap((g) => g.sedute).find((y) => y.chiave && !y.portata && y.tipo === chiaveSingola.tipo) : null;
    if (servono > 0 && corta && resto < servono * PIANO.facileBreve - EPS) {
      const togli = Math.min(servono * PIANO.facileBreve - resto, corta.minuti - PIANO.lungaDichiarata.minimo * 60);
      if (togli > 0) {
        corta.minuti = Math.round(corta.minuti - togli);
        corta.carboidrati = carboidratiPer(corta.minuti, corta.tipo);
        chiaveSingola.ore = corta.minuti / 60;
        resto += togli;
      }
    }
    // Se non basta, la media scende fino a 45 minuti, sempre con le sue salite (regola 2.2).
    if (servono > 0 && media && resto < servono * PIANO.facileBreve - EPS) {
      const togli = Math.min(servono * PIANO.facileBreve - resto, media.minuti - S.richiamo.minimo);
      if (togli > 0) {
        media.minuti = Math.round(media.minuti - togli);
        media.carboidrati = carboidratiPer(media.minuti, media.tipo);
        resto += togli;
      }
    }
    const massimo = facileDomenica ? DOMENICA.settimanaFacile.giroMassimoOre * 60 : S.facile.massimo;
    let n = Math.max(Math.ceil(resto / massimo - EPS), minime - corse);
    n = Math.min(Math.max(n, 0), candidati.length + recuperi.length);
    while (n > 0 && resto / n < PIANO.facileBreve - EPS) n -= 1;
    const scelti = [...candidati, ...recuperi].slice(0, n);
    // I giorni con il tetto più basso prendono per primi quello che reggono.
    const ordinati = [...scelti].sort((a, b) => massimoDi(a) - massimoDi(b));
    ordinati.forEach((g, i) => {
      const restanti = ordinati.length - i;
      const tipo = g.limite === "riposo" ? "recupero" : "facile";
      const tetto = tipo === "recupero" ? Math.min(S.recupero.massimo, g.tetto) : massimoDi(g);
      const m = Math.min(tetto, resto / restanti);
      if (m < PIANO.facileBreve - EPS) return;
      const x = nuovaSeduta(tipo, m);
      metti(g, x);
      facili.push([g, x]);
      resto -= x.minuti;
      corse += 1;
    });
  }

  // Nello scarico finale mai più di PIANO.tapering.giorniSenzaBici giorni di fila senza bici, salvo
  // il viaggio (3.6). Una serie più lunga, anche cominciata la settimana prima, si spezza con un giro
  // facile breve nel giorno libero più vicino alla sua fine. I minuti vengono da quelli che la
  // settimana non ha usato, poi dagli altri giri, mai sotto la loro durata minima, e per ultima
  // dalla seduta chiave, mai sotto un'ora, così le ore della settimana restano quelle.
  const inScarico = (g) => !g.fuori && Boolean(s.inizioTapering) && g.giorno >= s.inizioTapering && (!partenza || g.giorno < partenza);
  const passo = STIMA.arrotondaMinuti.passo;
  const regge = (h) => h.disponibile && !h.riservato && h.limite !== "riposo" && h.tetto >= passo
    && (disp.dueCose || !h.sedute.some((y) => y.tipo === "palestra"));
  const minimoDi = (y) => (y.chiave ? PIANO.lungaDichiarata.minimo * 60 : y.tipo === "media" ? S.media.minimo : y.tipo === "richiamo" ? S.richiamo.minimo : PIANO.facileBreve);
  const daCuiPrendere = () => {
    const tutte = giorni.flatMap((h) => h.sedute).filter((y) => BICI.has(y.tipo) && !y.portata);
    const facilissime = tutte.filter((y) => !y.chiave && !NON_FACILI.has(y.tipo)).sort((a, b) => b.minuti - a.minuti);
    return [...facilissime, ...tutte.filter((y) => NON_FACILI.has(y.tipo)), ...tutte.filter((y) => y.chiave).sort((a, b) => b.minuti - a.minuti)];
  };
  const disponibili = () => Math.max(0, resto) + somma(daCuiPrendere(), (y) => Math.max(0, y.minuti - minimoDi(y)));
  const prendi = (minuti) => {
    let restano = minuti - Math.min(minuti, Math.max(0, resto));
    resto = Math.max(0, resto - minuti);
    for (const y of daCuiPrendere()) {
      if (restano <= EPS) break;
      const via = Math.min(restano, y.minuti - minimoDi(y));
      if (via <= 0) continue;
      y.minuti = Math.round(y.minuti - via);
      y.carboidrati = carboidratiPer(y.minuti, y.tipo);
      if (y.chiave) for (const z of proprie) if (z.giorno === giorni.find((h) => h.sedute.includes(y)).giorno && z.tipo === y.tipo) z.ore = y.minuti / 60;
      restano -= via;
    }
  };
  let senzaBici = num(st.senzaBiciPrima) ? st.senzaBiciPrima : 0;
  let inizioSerie = 0;
  for (let i = 0; i < 7; i++) {
    const g = giorni[i];
    if (!inScarico(g) || bici(g)) {
      senzaBici = 0;
      inizioSerie = i + 1;
      continue;
    }
    senzaBici += 1;
    if (senzaBici <= PIANO.tapering.giorniSenzaBici) continue;
    for (let j = i; j >= inizioSerie; j--) {
      const h = giorni[j];
      if (!regge(h)) continue;
      const minuti = Math.min(PIANO.facileBreve, h.tetto, Math.floor(disponibili() / passo + EPS) * passo);
      if (minuti < passo) break;
      prendi(minuti);
      const x = nuovaSeduta("facile", minuti);
      metti(h, x);
      facili.push([h, x]);
      senzaBici = i - j;
      inizioSerie = j + 1;
      break;
    }
  }

  // 6. Il riposo, e tronco e collo dopo i giri facili per chi non fa palestra o ne fa poca (5.1).
  for (const g of giorni) {
    if (!g.fuori && !g.sedute.length) metti(g, nuovaSeduta("riposo", 0));
  }
  const tronco = fase && fase.tronco && fase.tronco.scheda === 7 ? fase.tronco : null;
  if (tronco) {
    const volte = Math.max(0, (lista(tronco.aSettimana)[0] || PP.troncoVolte[0]) - (num(tronco.nelleSedute) ? tronco.nelleSedute : 0));
    const minuti = num(tronco.minuti) ? tronco.minuti : PP.troncoSenzaPalestra;
    facili.filter(([, x]) => x.tipo === "facile").slice(0, volte).forEach(([g]) => metti(g, nuovaSeduta("tronco", minuti, { facoltativa: true, sforzoMassimo: PIANO.sforzoMassimo.tronco })));
  }

  // Il cibo della lunga che allena lo stomaco (regola 8.11) e il limite del facile (3.8).
  if (num(st.stomaco)) {
    const lunga = giorni.flatMap((g) => g.sedute).filter((x) => x.chiave && BICI.has(x.tipo) && (x.parte || 1) === 1 && x.minuti >= PIANO.carboidrati.liberoSottoMinuti)
      .sort((a, b) => b.minuti - a.minuti)[0];
    if (lunga) lunga.cibo = { grammi: st.stomaco, testo: T.testoStomaco(st.stomaco) };
  }
  if (st.limite && st.limite.battito > 0) {
    for (const g of giorni) for (const x of g.sedute) if (BICI.has(x.tipo) && !NON_FACILI.has(x.tipo)) x.limiteFacile = T.righeLimite(st.limite, x.minuti);
  }

  for (const g of giorni) g.ore = somma(g.sedute.filter((x) => BICI.has(x.tipo)), (x) => x.minuti) / 60;
  const oreProprie = somma(giorni.flatMap((g) => g.sedute).filter((x) => BICI.has(x.tipo) && !x.portata), (x) => x.minuti) / 60
    + somma(proprie.filter((x) => !pos.has(x.giorno)), (x) => x.ore);
  const mancano = Math.max(0, (num(s.ore) ? s.ore : 0) - oreProprie) * 60;
  const giorniNo = pianoGiorni.filter((g) => g.giornoSettimana <= VENERDI && !g.disponibile).map((g) => g.giorno);
  if (mancano >= PIANO.avvisoMancanoMinuti - EPS) avvisi.push({ tipo: "mancano", minuti: Math.round(mancano), testo: T.fraseMancano(mancano, giorniNo) });
  const uscite = giorni.reduce((n, g) => n + g.sedute.filter((x) => BICI.has(x.tipo)).length, 0);
  const quanteFacili = giorni.reduce((n, g) => n + g.sedute.filter((x) => BICI.has(x.tipo) && !NON_FACILI.has(x.tipo)).length, 0);
  const prima = proprie[0] || null;
  // I giorni dello scarico finale senza bici alla fine della settimana, per la settimana dopo.
  let senzaBiciAllaFine = 0;
  let k = 6;
  for (; k >= 0 && inScarico(giorni[k]) && !bici(giorni[k]); k--) senzaBiciAllaFine += 1;
  if (k < 0 && num(st.senzaBiciPrima)) senzaBiciAllaFine += st.senzaBiciPrima;
  const riassunto = {
    lunedi,
    indice: s.indice ?? null,
    tipo: tipoSett,
    giorni,
    ore: num(s.ore) ? s.ore : 0,
    oreMesse: oreProprie,
    mancano,
    uscite,
    facili: quanteFacili,
    palestre: giorni.reduce((n, g) => n + g.sedute.filter((x) => x.tipo === "palestra").length, 0),
    ultimaInFinestra,
    chiave: prima ? { tipo: prima.tipo, giorno: prima.giorno } : null,
    avvisi,
    senzaBici: senzaBiciAllaFine,
  };
  riassunto.frase = T.fraseSettimana({ tipo: s.inTapering && tipoSett !== "corto" ? "tapering" : tipoSett, ore: riassunto.ore, palestre: riassunto.palestre, chiave: riassunto.chiave });
  return riassunto;
}

// --- Il piano lungo ---

// Un'impronta degli ingressi (3.13), FNV-1a su un testo con le chiavi in ordine.
function impronta(valore) {
  const testo = JSON.stringify(valore, (chiave, v) => {
    if (v instanceof Set) return [...v].sort();
    if (v && typeof v === "object" && !Array.isArray(v)) return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]));
    return v;
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < testo.length; i++) {
    h ^= testo.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function firmaPiano({ percorso, giorni, partenza, disp, prof, H, libero }) {
  const p = prof.dati;
  return impronta({
    percorso, giorni, partenza, libero: Boolean(libero), H: num(H) ? Math.round(H * 100) / 100 : null,
    disponibilita: { giorni: [...disp.giorni].sort(), stella: disp.stella, ore: disp.ore, tetti: disp.tetti, dueCose: disp.dueCose },
    profilo: { eta: prof.eta, dueUno: prof.dueUno, blocco: prof.blocco, esperienza: prof.esperienza, palestra: p.palestra || null, sicurezza: p.palestraSicurezza || null, altriSport: p.altriSport ?? null },
    versione: PIANO.versione,
  });
}

const idPercorso = (p) => (p && typeof p === "object" ? p.id || null : typeof p === "string" ? p : null);

// Le sedute di un giorno di modalità libera o di schema, per la fase della palestra.
function faseDiPalestra(s, ctx) {
  if (!ctx.profiloPalestra) return null;
  if (!ctx.partenza) {
    return fasePalestra({ settimanaPiano: s.settimanaPiano, palestraMassima: s.palestra ?? undefined }, ctx.profiloPalestra, s.dal, ctx.registro);
  }
  const w = s.indice < 0 ? -s.indice : 0;
  const d = giorniFra(s.dal, ctx.partenza);
  let massimo = num(s.palestra) ? s.palestra : null;
  // L'ultima seduta pesante cade fra 10 e 8 giorni prima anche quando quei giorni stanno nella −1.
  const f = PP.ultimaPesante;
  const contieneFinestra = giorniFra(s.al, ctx.partenza) <= f.da && giorniFra(s.dal, ctx.partenza) >= f.a;
  if (contieneFinestra && massimo !== null) massimo = Math.max(massimo, 1);
  const info = { settimane: ctx.settimaneTotali, settimaneAllaPartenza: w, giorniAllaPartenza: d, giorniEvento: ctx.G, schema: ctx.schema || null };
  if (massimo !== null) info.palestraMassima = massimo;
  return fasePalestra(info, ctx.profiloPalestra, s.dal, ctx.registro);
}

// Le uscite in bici di una settimana del piano salvato, e i giorni dello scarico finale senza bici
// alla sua fine, per continuare il piano rifatto il lunedì.
const usciteDi = (w) => lista(w && w.giorni).reduce((n, g) => n + lista(g && g.sedute).filter((x) => x && BICI.has(x.tipo)).length, 0);
function senzaBiciAllaFineDi(w, inizioTapering) {
  const giorni = lista(w && w.giorni);
  let n = 0;
  for (let i = giorni.length - 1; i >= 0; i--) {
    const g = giorni[i];
    if (!g || g.fuori || !inizioTapering || g.giorno < inizioTapering || lista(g.sedute).some((x) => x && BICI.has(x.tipo))) break;
    n += 1;
  }
  return n;
}

function concretizza(prime, ctx) {
  let fatiche = [...ctx.st.fatiche];
  let giaFatte = ctx.conto;
  // Il piano rifatto il lunedì continua dalle settimane passate di quello salvato.
  const passate = lista(ctx.st.passate);
  const ultimaPassata = passate[passate.length - 1] || null;
  const primaPassata = [...passate].reverse().find((w) => w.tipo !== "tapering") || null;
  let precedenti = ultimaPassata ? usciteDi(ultimaPassata) : null;
  let primaDelTapering = primaPassata ? usciteDi(primaPassata) : null;
  let senzaBiciPrima = ultimaPassata ? senzaBiciAllaFineDi(ultimaPassata, prime[0] && prime[0].inizioTapering) : 0;
  let ultimaFatta = false;
  const portate = new Map();
  if (prime[0] && lista(ctx.st.portate).length) portate.set(prime[0].lunedi, ctx.st.portate.map((x) => ({ ...x })));
  for (const [i, s] of prime.entries()) {
    const fase = faseDiPalestra(s, ctx);
    const prossime = prime[i + 1] ? prime[i + 1].sedute : [];
    let minime = 0;
    if (s.tipo === "S" && num(precedenti)) minime = Math.ceil(PIANO.scarico.uscite * precedenti - EPS);
    if (s.inTapering && num(primaDelTapering ?? precedenti)) minime = Math.ceil(PIANO.tapering.uscite * (primaDelTapering ?? precedenti) * s.quota - EPS);
    const stomaco = ctx.partenza ? obiettivoCarboidrati(s, ctx.stomaco) : null;
    const c = settimanaConcreta({ ...s, partenza: ctx.partenza, usciteMinime: minime }, ctx.disp, ctx.prof, { fase, giaFatte, ultimaFatta }, {
      fatiche, portate: portate.get(s.lunedi) || [], prossime, stomaco, limite: ctx.limite, senzaBiciPrima,
    });
    senzaBiciPrima = c.senzaBici;
    s.giorni = c.giorni;
    s.concreta = c;
    s.fase = fase
      ? {
        fase: fase.fase, scheda: fase.scheda, sedute: fase.sedute, settimana: fase.settimana, settimanaBlocco: fase.settimanaBlocco,
        familiarizzazione: fase.familiarizzazione, gambeFinoA: fase.gambeFinoA, messaggi: fase.messaggi, chiedi: fase.chiedi,
      }
      : null;
    if (stomaco !== null) s.carboidrati = stomaco;
    precedenti = c.uscite;
    if (!s.inTapering) primaDelTapering = c.uscite;
    giaFatte += c.palestre;
    ultimaFatta = ultimaFatta || c.ultimaInFinestra;
    fatiche = [...fatiche, ...faticheDi(s.sedute)];
    const prossimo = piuGiorni(s.lunedi, 7);
    const fuori = s.sedute.filter((x) => x.possibile !== false && x.giorno >= prossimo);
    if (fuori.length) portate.set(prossimo, fuori);
  }
  return fatiche;
}

// Il passo della lunga sui giorni veri, dopo la settimana giorno per giorno, così nessuna seduta
// chiave supera la più lunga dei 30 giorni prima, giri facili compresi, di più del passo.
function rispettaPasso(prime, st, classe) {
  const lunghe = new Map();
  for (const x of st.lunghe) lunghe.set(x.giorno, Math.max(lunghe.get(x.giorno) || 0, x.ore));
  const chiavi = new Map();
  for (const s of prime) for (const x of s.sedute) if (x.possibile !== false) chiavi.set(`${x.giorno}|${x.tipo}`, x);
  const dolori = st.dolori || Boolean(st.interruzione && st.interruzione.giorni > PIANO.passoLunga.giorniFermi);
  const massimo = daSei(classe) ? PIANO.uscitaMassima : Infinity;
  const l30 = (d) => {
    let m = PIANO.lungaDichiarata.minimo;
    for (let k = 1; k <= PIANO.passoLunga.giorni; k++) m = Math.max(m, lunghe.get(piuGiorni(d, -k)) || 0);
    return m;
  };
  let ieri = null;
  let tettoBlocco = Infinity;
  for (const s of prime) {
    for (const g of lista(s.giorni)) {
      if (g.fuori) continue;
      let oggiChiave = null;
      for (const x of g.sedute) {
        if (!BICI.has(x.tipo) || !x.chiave) continue;
        const parte = x.parte || 1;
        let tetto;
        if (x.tipo === "blocco") {
          if (parte === 1) tettoBlocco = Math.min(passoLunga(l30(g.giorno), dolori), massimo);
          tetto = tettoBlocco;
        } else if (PIU_GIORNI.has(x.tipo) && parte > 1) {
          tetto = ieri && ieri.tipo === x.tipo ? ieri.minuti / 60 : Infinity;
        } else {
          tetto = Math.min(passoLunga(l30(g.giorno), dolori), massimo);
        }
        if (x.minuti > tetto * 60 + EPS) {
          x.minuti = Math.floor(tetto * 60);
          x.carboidrati = carboidratiPer(x.minuti, x.tipo);
          const k = chiavi.get(`${g.giorno}|${x.tipo}`);
          if (k) k.ore = x.minuti / 60;
        }
        oggiChiave = oggiChiave || x;
      }
      ieri = oggiChiave;
      g.ore = somma(g.sedute.filter((x) => BICI.has(x.tipo)), (x) => x.minuti) / 60;
      const lunga = Math.max(0, ...g.sedute.filter((x) => BICI.has(x.tipo)).map((x) => x.minuti / 60));
      if (lunga > 0) lunghe.set(g.giorno, lunga);
    }
  }
}

// Il controllo di fattibilità sui giorni veri del piano.
function fattibilitaDeiGiorni(prime, st, contesto) {
  const attivita = [];
  for (const s of prime) {
    for (const g of lista(s.giorni)) {
      if (g.fuori) continue;
      for (const x of g.sedute) {
        if (!BICI.has(x.tipo) || !(x.minuti > 0)) continue;
        attivita.push(attivitaPiano(g.giorno, x.minuti, x.tipo, { id: `piano-${g.giorno}-${attivita.length}`, borse: x.borse, notteFuori: x.notteFuori === true }));
      }
    }
  }
  return controlloFattibilita([...st.uscite, ...attivita], contesto);
}

// Le settimane come le legge js/prontezza.js e come si salvano (3.13).
function settimanaPerFuori(s) {
  const sedute = s.sedute.filter((x) => x.possibile !== false).map((x) => ({
    giorno: x.giorno, tipo: x.tipo, ore: x.ore, borse: x.borse, notteFuori: x.notteFuori, parte: x.parte, di: x.di, nota: x.nota, possibile: true,
  }));
  const prima = sedute[0] || null;
  return {
    lunedi: s.lunedi,
    indice: s.indice,
    tipo: s.inTapering && s.tipo !== "corto" ? "tapering" : s.tipo,
    ore: s.ore,
    orePiene: s.orePiene,
    oreSchema: num(s.oreTarget) ? s.oreTarget : null,
    dal: s.dal,
    al: s.al,
    chiave: prima ? { tipo: prima.tipo, giorno: prima.giorno, ore: sedute.map((x) => x.ore) } : null,
    sedute,
    palestra: s.fase ? s.fase.sedute : 0,
    fase: s.fase,
    carboidrati: s.carboidrati ?? null,
    giorni: lista(s.giorni).map((g) => ({
      giorno: g.giorno, ore: g.ore, sedute: g.sedute, fuori: g.fuori, disponibile: g.disponibile, tetto: g.tetto, tettoChiave: g.tettoChiave,
      tettoPiuGiorni: g.tettoPiuGiorni, riservato: g.riservato === true, limite: g.limite || null,
    })),
    avvisi: s.concreta ? s.concreta.avvisi : lista(s.avvisi),
    frase: s.concreta ? s.concreta.frase : null,
    uscite: s.concreta ? s.concreta.uscite : null,
    mancano: s.concreta ? s.concreta.mancano : 0,
  };
}

// Le settimane del piano salvato già passate, copiate così come sono, come storia (3.12).
const settimanePassate = (st) => lista(st.passate).map((w) => ({ ...JSON.parse(JSON.stringify(w)), passata: true }));

// La settimana in corso nata a metà, con i giorni già passati presi dal piano salvato.
function conGiorniPassati(settimana, st, oggi) {
  if (!settimana || !st.pianoSalvato) return;
  const salvata = lista(st.pianoSalvato.settimane).find((w) => w && w.lunedi === settimana.lunedi);
  if (!salvata) return;
  for (const g of lista(settimana.giorni)) {
    if (!g.fuori || g.giorno >= oggi) continue;
    const prima = lista(salvata.giorni).find((x) => x && x.giorno === g.giorno);
    if (prima) Object.assign(g, { ore: prima.ore, sedute: JSON.parse(JSON.stringify(lista(prima.sedute))), passato: true });
  }
}

// Il percorso dell'obiettivo come voce del catalogo o percorso libero, per le borse.
function percorsoDi(p) {
  if (p && typeof p === "object") return p;
  return typeof p === "string" ? trovaPercorso(p) || null : null;
}

// Il piano lungo. obiettivo ha percorso (la voce del catalogo, il percorso libero o l'id), giorni,
// partenza (o data), borseKg se le dice la persona, libero se è un'avventura propria. Senza borseKg
// le borse vengono da borseDellObiettivo di js/prontezza.js, cioè dal percorso libero «anche con le
// borse», dalla stima, dal profilo o dal catalogo, come per il verdetto. stima è quella di stimaH
// (servono H, basso, alto, e la fonte per l'e-bike), profilo quello del primo avvio con eta o
// fasciaEta, palestra, palestraSicurezza, esperienza, scaricoOgniTre, blocco ed ebike. storico è
// quello di leggiStorico, con piano, quello salvato, per rifarlo il lunedì (3.12). Lo schema resta
// quello scelto alla nascita del piano, con le settimane contate da inizioPiano, e le settimane
// passate si copiano così come sono. disponibilita è quella di leggiDisponibilita. Restituisce
// { versione, creato, firma, fase, obiettivo, schema, vObiettivo, obiettivi, inizio, settimane (con
// le passate in testa, segnate passata), giorni (la settimana in corso), tapering, fattibilita,
// avvisi, fatiche, spostamenti }.
export function pianoLungo({ obiettivo = {}, stima = null, classe = null, profilo = {}, storico = {}, disponibilita = {}, oggi = oggiIso(), atleta = null } = {}) {
  const ob0 = obiettivo && typeof obiettivo === "object" ? obiettivo : {};
  const disp = leggiDisponibilita(disponibilita);
  const prof = leggiProfiloPiano(profilo);
  const partenza = dataDi(ob0.partenza ?? ob0.data);
  const G = num(ob0.giorni) ? ob0.giorni : num(stima && stima.giorni) ? stima.giorni : 1;
  const H = num(stima && stima.H) && stima.H > 0 ? stima.H : num(ob0.H) && ob0.H > 0 ? ob0.H : null;
  const cl = classe || classeEvento(G);
  const borseKg = num(ob0.borseKg) ? ob0.borseKg : borseDellObiettivo(stima, prof.dati, percorsoDi(ob0.percorso));
  // Con l'evento in e-bike l'e-bike conta per intero, come nel verdetto (2.2).
  const eBikeEvento = prof.dati.ebike === true || Boolean(stima && stima.fonte && stima.fonte.tipo === "ebike");
  const percorso = idPercorso(ob0.percorso);
  const testa = {
    versione: PIANO.versione,
    creato: oggi,
    firma: firmaPiano({ percorso, giorni: G, partenza, disp, prof, H, libero: !partenza }),
    obiettivo: {
      percorso, giorni: G, data: partenza, H, basso: stima && num(stima.basso) ? stima.basso : null, alto: stima && num(stima.alto) ? stima.alto : null,
      classe: cl, libero: Boolean(ob0.libero) || !partenza, eBike: eBikeEvento,
    },
    avvisi: [],
    settimane: [],
    giorni: [],
    fatiche: [],
    spostamenti: lista(storico && storico.spostamenti),
    tapering: null,
    fattibilita: null,
  };
  const lunediOggi = piuGiorni(oggi, -giornoSettimana(oggi));
  const st = leggiStorico({ ...(storico && typeof storico === "object" ? storico : {}), eBikeEvento }, oggi, lunediOggi);
  const limite = atleta || prof.dati.battitoNeiGiri !== undefined ? limiteFacile(atleta, prof.dati) : null;
  if (!partenza) return pianoLibero({ testa, disp, prof, st, H, oggi, lunediOggi, limite });
  if (oggi >= partenza) {
    const guardia = cl === UN_GIORNO ? SEMAFORO.guardia.weekendGiorni : SEMAFORO.guardia.evento[cl] ?? SEMAFORO.guardia.evento["2-5"];
    const fine = piuGiorni(partenza, Math.max(G, 1));
    const fase = oggi < fine ? "evento" : oggi < piuGiorni(fine, guardia) ? "dopo" : "finito";
    return { ...testa, fase, fineEvento: fine };
  }
  if (!H) return { ...testa, fase: "senzaGiornata", avvisi: [{ tipo: "senzaGiornata", testo: T.AVVISI.senzaGiornata }] };

  const esperienza = prof.esperienza;
  const ob = obiettivi(H, cl, esperienza, { borseKg });
  const A = disp.ore;
  const vOb = Math.min((ob.vMin + ob.vComodo) / 2, A);
  const settimane = settimanePiano(oggi, partenza);
  const N = settimane.filter((s) => s.indice < 0).length;
  // Lo schema si sceglie una volta, con le settimane contate dalla nascita del piano. Rifatto il
  // lunedì il piano tiene lo schema, le prove nelle loro settimane e i piani corti solo se è nato
  // con poche settimane (3.3 e 3.12). Lo schema B, che dipende dalla base di allora, resta quello
  // salvato.
  const gp = giornoSettimana(partenza);
  const lunediMeno1 = piuGiorni(partenza, -(gp === DOMENICA_G ? 7 : gp + 1) - 6);
  const N0 = st.inizioPiano && st.inizioPiano <= lunediOggi
    ? Math.max(N, Math.round(giorniFra(st.inizioPiano, lunediMeno1) / 7) + 1)
    : N;
  let sch = scegliSchema(cl, N0, st.h4, st.l42, H, vOb, {});
  const P3 = PIANO.scelta;
  if (cl === DUE_CINQUE && N0 >= P3.dueCinqueB && N0 < P3.dueCinque && (st.schema === "A" || st.schema === "B") && st.schema !== sch.schema) {
    sch = st.schema === "B" ? { ...sch, schema: "B", base: N0 - P3.dueCinqueB, ultime: null } : { ...sch, schema: "A", base: 0, ultime: N0 };
  }
  // Le ore dei piani corti sono quote di h4, quello di adesso o, se è meno, quello della nascita del
  // piano, così rifacendolo il tetto di h4 + 30% o + 20% non sale con le settimane del piano stesso.
  const h4Nascita = st.pianoSalvato && st.pianoSalvato.schema && num(st.pianoSalvato.schema.h4) ? st.pianoSalvato.schema.h4 : Infinity;
  const h4Righe = Math.max(Math.min(st.h4, h4Nascita), PIANO.base.oreMinime);
  const ctxRighe = { H, vOb, h4: h4Righe, classe: cl, prof, borse: cl === UN_GIORNO && num(borseKg) && borseKg > PRONTEZZA.unGiornoBorseOltreKg };
  const { righe } = righePiano(sch, N, ctxRighe);
  const perW = new Map(righe.map((r) => [r.w, r]));
  const prime = settimane.map((w) => {
    const r = w.indice < 0 ? perW.get(-w.indice) : null;
    const base = r ? { ...r } : { tipo: sch.schema === "7.15" ? "corto" : "tapering", oreTarget: sch.schema === "7.15" ? PIANO.corti.tre.righe[2].oreH4 * ctxRighe.h4 : null, chiave: null, palestra: 0 };
    return { ...w, ...base, avvisi: [] };
  });
  // L'uscita carica della regola 7.15, nel giorno con la stella almeno 10 giorni prima.
  if (sch.schema === "7.15") {
    const c = PIANO.corti.tre.carica;
    const adatta = [...prime].reverse().find((s) => disp.stella !== null && giorniFra(piuGiorni(s.lunedi, disp.stella), partenza) >= c.giorniPrima && piuGiorni(s.lunedi, disp.stella) >= s.dal);
    if (adatta) adatta.chiave = { tipo: "carica", ore: [fra(c.h * H, c.minimo, c.massimo)], nota: null };
  }
  for (const s of prime) assegnaDate(s, disp, partenza, cl);

  // La settimana facile del controllo della domenica, al posto della settimana che comincia.
  if (st.domenica && (st.domenica.tipo === "settimanaFacile" || st.domenica.tipo === "giorniFacili")) {
    const s = prime.find((x) => x.lunedi === (st.domenica.lunedi || lunediOggi));
    if (s && s.tipo !== "tapering" && s.indice !== 0 && !(num(s.indice) && s.indice >= -2)) {
      s.tipo = st.domenica.tipo === "giorniFacili" ? "F7" : "F";
      s.oreTarget = null;
      s.sedute = s.sedute.filter((x) => !PIU_GIORNI.has(x.tipo)).map((x) => ({ ...x, tipo: "facile", ore: Math.min(x.ore, DOMENICA.settimanaFacile.chiaveOre), borse: "no", notteFuori: false }));
      if (st.domenica.giorniFacili || s.tipo === "F7") s.sedute = [];
      const sostituito = st.domenica.sostituisceScarico ? prime.find((x) => x.lunedi === st.domenica.sostituisceScarico && x !== s) : null;
      if (sostituito && sostituito.tipo === "S") {
        sostituito.tipo = "N";
        sostituito.oreTarget = null;
      }
    }
  }

  const contesto = { H, vOb, A, partenza, classe: cl, oggi, schema: sch.schema, ob, esperienza, borseKg, eBikeEvento };
  const k = st.k;
  const crescita = applicaCrescita(prime, st, prof, k, contesto);
  const ctx = {
    st, disp, prof, partenza, G, settimaneTotali: N0, registro: st.registro, conto: contoSedute(st.registro, oggi).totali,
    profiloPalestra: prof.dati, stomaco: st.stomaco, limite, schema: sch.schema,
  };
  const fatiche = concretizza(prime, ctx);
  rispettaPasso(prime, st, cl);
  const fattibilita = fattibilitaDeiGiorni(prime, st, contesto);

  const avvisi = [...crescita.avvisi];
  if (A + EPS < ob.vMin) avvisi.push({ tipo: "nonBasta", testo: T.AVVISI.nonBasta });
  if (sch.adattare) avvisi.push({ tipo: "adattare", testo: T.AVVISI.adattare });
  if (sch.avvisi.includes("ventiSettimane")) avvisi.push({ tipo: "ventiSettimane", testo: T.AVVISI.ventiSettimane });
  if (sch.schema === "7.15") avvisi.push({ tipo: "arrivareRiposato", testo: T.AVVISI.arrivareRiposato });
  if (fattibilita.corto && !sch.adattare) avvisi.push({ tipo: "corto", testo: T.AVVISI.corto, motivi: fattibilita.motivi });

  const fuori = prime.map(settimanaPerFuori);
  conGiorniPassati(fuori[0], st, oggi);
  return {
    ...testa,
    fase: "piano",
    schema: { nome: sch.schema, base: sch.base, ultime: sch.ultime, adattare: sch.adattare, blocco: sch.blocco || null, h4: h4Righe },
    vObiettivo: vOb,
    obiettivi: { vMin: ob.vMin, vComodo: ob.vComodo, lt: ob.lt, prove: ob.prove },
    inizio: st.inizioPiano || lunediOggi,
    settimane: [...settimanePassate(st), ...fuori],
    giorni: fuori.length ? fuori[0].giorni : [],
    tapering: crescita.tapering,
    fattibilita,
    avvisi,
    fatiche: fatiche.filter((f) => f.inizio >= oggi || f.fine >= oggi).map((f) => ({ tipo: f.tipo, inizio: f.inizio, fine: f.fine })),
  };
}

// La modalità libera, senza data (3.4, regola 9.10). La riga della settimana tipo più vicina alle ore
// A, con crescita, scarico, palestra di mantenimento e controllo della domenica, senza prove e senza
// scarico finale. Le settimane si contano dalla nascita del piano (inizioPiano), e lo scarico cade
// ogni 4 (ogni 3 con il 2+1), così il piano rifatto ogni lunedì lo tiene al suo posto (3.5 punto 5).
function pianoLibero({ testa, disp, prof, st, H, oggi, lunediOggi, limite }) {
  const L = PIANO.libero;
  const riga = L.righe.reduce((m, r) => (Math.abs(r.ore - disp.ore) < Math.abs(m.ore - disp.ore) ? r : m));
  const inizio = st.inizioPiano && st.inizioPiano <= lunediOggi ? st.inizioPiano : lunediOggi;
  const primaSettimana = Math.round(giorniFra(inizio, lunediOggi) / 7) + 1;
  const ciclo = (prof.dueUno ? PIANO.scarico.ogniDaAnni50 : PIANO.scarico.ogni) + 1;
  const prime = [];
  for (let i = 0; i < L.settimane; i++) {
    const lunedi = piuGiorni(lunediOggi, 7 * i);
    const dal = i === 0 && oggi > lunedi ? oggi : lunedi;
    const giorni = giorniFra(dal, piuGiorni(lunedi, 6)) + 1;
    const k = primaSettimana + i;
    const scarico = k % ciclo === 0;
    const chiaveRiga = riga.chiavi[(k - 1) % riga.chiavi.length];
    let ore = chiaveRiga.ore;
    // Con un obiettivo libero di H ore la lunga cresce verso 0,75 × H.
    if (num(H) && chiaveRiga.tipo === "lunga") ore = [Math.max(ore[0], L.lungaObiettivo * H)];
    const Ls = PIANO.lungaScarico;
    prime.push({
      indice: k, settimanaPiano: k, lunedi, domenica: piuGiorni(lunedi, 6), dal, al: piuGiorni(lunedi, 6), giorni, quota: giorni / 7,
      tipo: scarico ? "S" : "base",
      oreTarget: scarico ? null : Math.min(riga.ore, disp.ore),
      chiave: scarico
        ? { tipo: "scarico", ore: [fra(Ls.quota * (num(H) ? H : chiaveRiga.ore[0] / L.lungaObiettivo), Ls.minimo, Ls.massimo)], nota: null }
        : { tipo: chiaveRiga.tipo, ore, nota: null },
      palestra: null,
      avvisi: [],
    });
  }
  const finta = piuGiorni(lunediOggi, 7 * L.settimane + 365);
  for (const s of prime) assegnaDate(s, disp, finta, DUE_CINQUE);
  const crescita = applicaCrescita(prime, st, prof, st.k, { A: disp.ore, oggi, classe: DUE_CINQUE });
  const ctx = {
    st, disp, prof, partenza: null, G: 1, settimaneTotali: null, registro: st.registro, conto: contoSedute(st.registro, oggi).totali,
    profiloPalestra: prof.dati, stomaco: [], limite,
  };
  const fatiche = concretizza(prime, ctx);
  rispettaPasso(prime, st, DUE_CINQUE);
  const fuori = prime.map(settimanaPerFuori);
  conGiorniPassati(fuori[0], st, oggi);
  return {
    ...testa,
    fase: "libero",
    schema: { nome: "libero", riga: riga.ore },
    vObiettivo: Math.min(riga.ore, disp.ore),
    inizio,
    settimane: [...settimanePassate(st), ...fuori],
    giorni: fuori.length ? fuori[0].giorni : [],
    avvisi: crescita.avvisi,
    fatiche: fatiche.filter((f) => f.fine >= oggi).map((f) => ({ tipo: f.tipo, inizio: f.inizio, fine: f.fine })),
  };
}

// --- Ogni mattina, la seduta di oggi (3.10) ---

const LIVELLI_NOTI = { verde: "verde", "giallo-leggero": "giallo-leggero", gialloLeggero: "giallo-leggero", giallo: "giallo", rosso: "rosso", nessuno: "nessuno" };

// L'esito del semaforo, nella forma nuova di js/semaforo.js ({ livello, stop, forti, voci, viaggio,
// tetti, consiglio, titolo }) o in quella di 4.11. Senza esito vale «nessuno».
function leggiEsito(esito) {
  const e = esito && typeof esito === "object" ? esito : { livello: esito };
  const livello = e.stop ? "rosso" : LIVELLI_NOTI[e.livello] || "nessuno";
  const voci = lista(e.voci);
  const gambe = voci.find((v) => v && v.chiave === "gambe");
  const forti = num(e.forti) ? e.forti : voci.filter((v) => v && v.forte).length;
  return {
    livello,
    stop: e.stop || null,
    forte: forti > 0,
    gambeIndolenzite: e.gambeIndolenzite === true || Boolean(gambe && num(gambe.valore) && gambe.valore >= 3),
    viaggio: e.viaggio || null,
    consiglio: e.consiglio || null,
    titolo: e.titolo || null,
    aggiunte: lista(e.aggiunte),
    tetti: lista(e.tetti),
  };
}

// Il giro del giallo (regola 2.11), la minore fra la seduta prevista e 1 ora e mezza, 45 minuti con
// un segnale forte, mai sotto 30.
export function giroDelGiallo(minuti, forte = false) {
  const G = S.giroGiallo;
  const previsti = num(minuti) && minuti > 0 ? minuti : G.massimo;
  return Math.max(G.minimo, Math.min(previsti, forte ? G.segnaleForte : G.massimo));
}

// La riga della tabella di 3.10 per una seduta.
function rigaDi(x) {
  if (!x) return "riposo";
  if (x.tipo === "riposo") return "riposo";
  if (x.tipo === "facile" || x.tipo === "recupero") return "facile";
  if (NON_FACILI.has(x.tipo)) return "media";
  if (["lunga", "scarico", "controllo"].includes(x.tipo)) return "lunga";
  if (x.tipo === "weekend") return (x.parte || 1) > 1 ? "lunga" : "weekend";
  if (x.tipo === "blocco") return (x.parte || 1) > 1 ? "lunga" : "blocco";
  if (PROVE.has(x.tipo)) return (x.parte || 1) > 1 ? "lunga" : "prova";
  if (x.tipo === "palestra") return x.gambe === false ? "palestraTronco" : "palestraGambe";
  if (x.tipo === "tronco") return "palestraTronco";
  if (x.tipo === "dopoEvento") return "dopoEvento";
  return "facile";
}

// Adatta una seduta al colore con la tabella di 3.10. Il colore toglie e non aggiunge. Restituisce
// { seduta (quella da fare, null per il riposo), azione, sposta, righe, titolo, come }.
export function adattaSeduta(x, livello, { forte = false, gambeIndolenzite = false } = {}) {
  const riga = rigaDi(x);
  const L = T.LIVELLO;
  const prevista = x ? { ...x } : null;
  const fatto = (azione, seduta, extra = {}) => ({ azione, seduta, sposta: false, righe: [], ...extra });
  const conTesti = (r) => {
    const s = r.seduta;
    if (r.azione === "giroGiallo") return { ...r, titolo: T.titoloGiallo(s.minuti), come: L.gialloComeGiro };
    if (r.azione === "riposo") {
      if (livello === "rosso") return { ...r, titolo: L.rossoTitolo, come: L.rossoSenzaBici };
      return { ...r, titolo: T.titoloSeduta({ tipo: "riposo" }), come: T.comeSeduta({ tipo: "riposo" }) };
    }
    if (r.azione === "rossoBici") return { ...r, titolo: L.rossoTitolo, come: L.rossoBici };
    if (r.azione === "mobilita") return { ...r, titolo: L.rossoTitolo, come: L.rossoPalestra };
    if (r.azione === "dopoEvento") return { ...r, titolo: T.titoloSeduta({ tipo: "dopoEvento" }), come: T.comeSeduta({ tipo: "dopoEvento" }) };
    const titolo = T.titoloSeduta(s);
    let come = T.comeSeduta(s);
    const righe = [...r.righe];
    if (r.azione === "leggera") {
      if (riga === "media") righe.unshift(L.gialloLeggeroMedia);
      else if (riga === "palestraGambe") righe.unshift(L.gialloLeggeroPalestra);
      else righe.unshift(L.gialloLeggero);
      if (livello === "nessuno") righe.push(L.pochiDati);
    }
    if (r.azione === "palestraLeggera") righe.unshift(riga === "palestraTronco" ? L.gialloTronco : L.gialloPalestra);
    if (r.azione === "nonParte") {
      come = L.bloccoNonParte;
      return { ...r, titolo: T.titoloSeduta({ tipo: "facile", minuti: s.minuti }), come, righe };
    }
    if (s.nota && T.NOTE[s.nota]) righe.push(T.NOTE[s.nota]);
    if (s.notteFuori && s.tipo === "weekendCarico" && (s.parte || 1) === 1) righe.push(T.NOTE.notteFuori);
    return { ...r, titolo, come, righe };
  };
  if (riga === "dopoEvento") return conTesti(fatto("dopoEvento", prevista));
  if (riga === "riposo") return conTesti(fatto("riposo", null));
  if (riga === "palestraGambe" || riga === "palestraTronco") {
    if (livello === "rosso") return conTesti(fatto("mobilita", { ...prevista, minuti: S.mobilitaRosso, mobilita: true }));
    if (livello === "giallo") return conTesti(fatto("palestraLeggera", { ...prevista, leggera: true, soloAlto: riga === "palestraGambe" && gambeIndolenzite }));
    if (livello === "giallo-leggero" || livello === "nessuno") return conTesti(fatto("leggera", { ...prevista }));
    return conTesti(fatto("prevista", prevista));
  }
  const minuti = prevista.minuti;
  const giallo = () => ({ ...nuovaSeduta("facile", giroDelGiallo(minuti, forte)), sforzoMassimo: PIANO.sforzoMassimo.giroGiallo, giroGiallo: true });
  const rossoBici = () => ({ ...nuovaSeduta("facile", Math.min(minuti, S.rossoBici)), sforzoMassimo: PIANO.sforzoMassimo.rossoBici, facoltativa: true });
  const leggera = () => ({ ...prevista, sforzoMassimo: Math.min(prevista.sforzoMassimo ?? 10, PIANO.sforzoMassimo.gialloLeggero) });
  const chiave = ["lunga", "weekend", "prova", "blocco"].includes(riga) && prevista.chiave !== false;
  if (livello === "rosso") {
    if (riga === "facile" || riga === "media") return conTesti(fatto("rossoBici", rossoBici()));
    return conTesti(fatto("riposo", null, { sposta: chiave }));
  }
  if (livello === "giallo") {
    const r = fatto("giroGiallo", giallo(), { sposta: chiave });
    if (riga === "media") r.righe.push(T.LIVELLO.ritmoSalta);
    return conTesti(r);
  }
  if (riga === "blocco" && livello !== "verde") {
    return conTesti(fatto("nonParte", { ...nuovaSeduta("facile", Math.min(minuti, S.facile.massimo)), sforzoMassimo: PIANO.sforzoMassimo.facile }, { sposta: true }));
  }
  if (livello === "giallo-leggero" || livello === "nessuno") return conTesti(fatto("leggera", leggera()));
  return conTesti(fatto("prevista", prevista));
}

// La settimana del piano che contiene un giorno.
function settimanaDi(piano, giorno) {
  const settimane = lista(piano && piano.settimane);
  return settimane.find((s) => s.lunedi <= giorno && piuGiorni(s.lunedi, 6) >= giorno) || null;
}

function giornoDi(piano, giorno) {
  const giorni = [...lista(piano && piano.giorni), ...lista(piano && piano.settimane).flatMap((s) => lista(s.giorni))];
  return giorni.find((g) => g && g.giorno === giorno) || null;
}

// Quanto manca a un'uscita di oltre 3 ore, per la palestra di oggi (regola 4.4).
function lungaVicinaDi(piano, oggi) {
  for (let k = 1; k <= PP.oreGambePrimaLungaInizio / 24; k++) {
    const g = giornoDi(piano, piuGiorni(oggi, k));
    const x = g ? g.sedute.find((y) => BICI.has(y.tipo) && y.minuti > PP.lungaOltreOre * 60) : null;
    if (x) return { data: g.giorno, minuti: x.minuti, giorni: k };
  }
  return null;
}

// La seduta di oggi (3.10), con i passi in ordine, e ogni passo toglie. piano è quello di
// pianoLungo, esito quello di valuta del semaforo. storia ha evento (la modalità evento di oggi,
// { tipo, giorno, giorni }), guardia (giorniDiGuardia del semaforo), registro e profilo per la
// palestra, giorniFacili (vero nei giorni facili dopo un'uscita grande), sonnoCorto, oreTappa (H) e
// atleta per il limite del facile. Restituisce { giorno, livello, tipo, titolo, come, righe, seduta,
// sedute, prevista, sposta, palestra, tasti }.
export function oggiCosaFaccio(piano, esito = {}, storia = {}, oggi = oggiIso()) {
  const e = leggiEsito(esito);
  const st = storia && typeof storia === "object" ? storia : {};
  const giorno = giornoDi(piano, oggi);
  const previste = giorno ? lista(giorno.sedute).filter((x) => x.tipo !== "riposo") : [];
  const risultato = { giorno: oggi, livello: e.livello, prevista: previste, sedute: [], righe: [], sposta: null, palestra: null, tasti: [] };

  // 1. Stop. Il rosso dello stop e basta.
  if (e.stop) {
    return { ...risultato, livello: "rosso", tipo: "stop", titolo: e.titolo || T.LIVELLO.rossoTitolo, come: e.consiglio || T.LIVELLO.rossoSenzaBici, seduta: null };
  }

  // 2. Modalità evento e giorni di guardia.
  if (st.evento && (st.evento.tipo === "evento" || st.evento.tipo === "viaggio")) {
    const lv = e.livello === "rosso" ? "rosso" : e.livello === "giallo" || e.livello === "giallo-leggero" ? "giallo" : "verde";
    const taglio = lv === "giallo" ? 1 - SEMAFORO.viaggio.taglioGiallo.massimo : 1;
    const minuti = num(st.oreTappa) ? st.oreTappa * 60 * taglio : null;
    const seduta = { tipo: "tappa", parte: st.evento.giorno || 1, di: st.evento.giorni || null, minuti };
    return { ...risultato, tipo: "tappa", seduta, sedute: [seduta], titolo: T.titoloSeduta(seduta), come: e.viaggio && e.consiglio ? e.consiglio : T.VIAGGIO[lv] };
  }
  if (st.evento && ["weekend", "prova", "blocco"].includes(st.evento.tipo)) {
    const x = previste.find((y) => PIU_GIORNI.has(y.tipo) && (y.parte || 1) > 1) || previste.find((y) => BICI.has(y.tipo));
    if (x) {
      if (e.livello === "rosso") return { ...risultato, tipo: "riposo", seduta: null, titolo: T.LIVELLO.rossoTitolo, come: T.VIAGGIO.provaRosso };
      const ridotta = e.livello === "giallo" || e.livello === "giallo-leggero";
      const seduta = { ...x, minuti: Math.round(x.minuti * (ridotta ? 1 - SEMAFORO.viaggio.taglioGiallo.massimo : 1)) };
      const righe = ridotta ? [T.VIAGGIO.provaGiallo] : [];
      return { ...risultato, tipo: seduta.tipo, seduta, sedute: [seduta], titolo: T.titoloSeduta(seduta), come: T.comeSeduta(seduta), righe };
    }
  }
  const guardia = st.guardia && st.guardia.attiva ? st.guardia : null;
  if (guardia && (guardia.tipo === "evento" || guardia.tipo === "viaggio")) {
    const r = adattaSeduta({ tipo: "dopoEvento" }, e.livello);
    return { ...risultato, tipo: "dopoEvento", seduta: null, titolo: r.titolo, come: r.come };
  }

  // 3. La seduta prevista. Nei giorni di guardia la seduta di recupero del piano, e nei giorni facili
  // dopo un'uscita grande niente media e niente lunga.
  let sedute = previste.map((x) => ({ ...x }));
  if (guardia || st.giorniFacili) {
    const primo = guardia && guardia.giorno === 1;
    sedute = sedute.map((x) => {
      if (!BICI.has(x.tipo) || x.tipo === "recupero") return x;
      if (primo) return nuovaSeduta("recupero", Math.min(x.minuti, S.recupero.massimo));
      if (x.tipo === "facile" && x.minuti <= S.facile.massimo) return x;
      const massimo = st.giorniFacili ? GD.dopoGrande.minuti : S.facile.massimo;
      return nuovaSeduta("facile", Math.min(x.minuti, massimo));
    });
    if (st.giorniFacili) risultato.righe.push(T.LIVELLO.facileDopoGrande);
    else if (guardia.perche) risultato.righe.push(T.LIVELLO.guardia);
  }
  const biciOggi = sedute.find((x) => BICI.has(x.tipo)) || null;
  const palestraOggi = sedute.find((x) => x.tipo === "palestra") || null;
  const troncoOggi = sedute.find((x) => x.tipo === "tronco") || null;

  // 4. Il colore adatta ogni seduta con la tabella, e la carta mostra la bici se c'è.
  const opzioni = { forte: e.forte, gambeIndolenzite: e.gambeIndolenzite };
  const bici = biciOggi ? adattaSeduta(biciOggi, e.livello, opzioni) : null;
  const pal = palestraOggi ? adattaSeduta(palestraOggi, e.livello, opzioni) : null;
  const tro = troncoOggi ? adattaSeduta(troncoOggi, e.livello, opzioni) : null;
  const principale = bici || pal || tro || adattaSeduta(null, e.livello);
  const righe = [...risultato.righe, ...principale.righe];
  const fatte = [bici, pal, tro].filter((r) => r && r.seduta).map((r) => r.seduta);

  // Una seduta chiave che non parte si sposta (3.10, spostare e non recuperare).
  let spostamento = null;
  if (bici && bici.sposta && piano) {
    const settimana = settimanaDi(piano, oggi);
    const esiti = { ...(st.esitiPrevisti || {}), [oggi]: e.livello };
    spostamento = sposta({ ...biciOggi, giorno: oggi }, settimana, esiti, piano.obiettivo ? piano.obiettivo.data : null, piano, { oggi });
    if (spostamento.esito === "sposta") {
      const stessa = Boolean(settimana) && spostamento.giorno <= piuGiorni(settimana.lunedi, 6);
      righe.push(T.testoSpostiamo(biciOggi.tipo, spostamento.giorno, stessa));
    } else {
      righe.push(spostamento.testo);
    }
  }

  // 5. La palestra. Se cade in una finestra di 3.7 si sposta al primo giorno libero, mai al posto
  // della bici. La scheda di oggi la dà js/palestra.js, già adattata al colore.
  let palestra = null;
  let spostaPalestra = null;
  if (pal && palestraOggi.scheda) {
    const vicina = lungaVicinaDi(piano, oggi);
    if (palestraOggi.gambe !== false && vicina && vicina.giorni <= 1 && e.livello !== "rosso") {
      const settimana = settimanaDi(piano, oggi);
      const altro = settimana ? giornoLiberoPerPalestra(settimana, oggi, piano) : null;
      if (altro) {
        spostaPalestra = { da: oggi, a: altro };
        righe.push(T.testoPalestraSposta(oggi, altro));
      }
    }
    const livello = { livello: e.livello, gambeIndolenzite: e.gambeIndolenzite, lungaVicina: vicina && palestraOggi.gambe !== false ? { data: vicina.data, minuti: vicina.minuti } : null };
    if (!spostaPalestra) palestra = sedutaPalestra(palestraOggi.scheda, palestraOggi.settimana, palestraOggi.seduta, st.profilo || {}, st.registro || [], livello, { oggi });
  }

  // 6. I casi speciali, il cibo e il limite del facile.
  if (st.sonnoCorto) righe.push(T.LIVELLO.sonno);
  const seduta = principale.seduta;
  if (seduta && BICI.has(seduta.tipo)) {
    if (seduta.cibo && principale.azione !== "giroGiallo") righe.push(seduta.cibo.testo);
    else if (seduta.carboidrati && seduta.minuti >= PIANO.carboidrati.liberoSottoMinuti) righe.push(seduta.carboidrati.testo);
    const limite = st.atleta || (st.profilo && st.profilo.battitoNeiGiri) ? limiteFacile(st.atleta, st.profilo || {}) : null;
    if (limite && !NON_FACILI.has(seduta.tipo)) righe.push(...T.righeLimite(limite, seduta.minuti));
  }
  if (e.livello === "nessuno" && seduta) righe.push(T.LIVELLO.pochiDati);
  // La sera del giorno 1 di un weekend di oltre 4 ore, la carta breve del recupero (regola 8.9).
  const sera = seduta && PIU_GIORNI.has(seduta.tipo) && (seduta.parte || 1) === 1 && seduta.minuti > PIANO.carboidrati.seraDopoOre * 60 ? T.CIBO.sera : null;

  let titolo = principale.titolo;
  let come = principale.come;
  if (principale === pal && palestra && pal.azione !== "mobilita") {
    titolo = palestra.titolo;
    come = T.comeSeduta({ tipo: "palestra", quanti: palestra.quanti });
  }
  const tasti = [];
  if (fatte.some((x) => x.tipo === "palestra") && palestra) tasti.push("scheda");
  if (seduta && BICI.has(seduta.tipo)) tasti.push("fatto");
  if (fatte.length) tasti.push("nonPosso");
  const spostamenti = {};
  if (spostamento) spostamenti.seduta = spostamento;
  if (spostaPalestra) spostamenti.palestra = spostaPalestra;
  return {
    ...risultato,
    tipo: seduta ? seduta.tipo : "riposo",
    azione: principale.azione,
    titolo,
    come,
    righe: [...new Set(righe.filter(Boolean))],
    seduta,
    sedute: fatte,
    sposta: Object.keys(spostamenti).length ? spostamenti : null,
    palestra,
    sera,
    tasti,
  };
}

// Il primo giorno libero della settimana per una palestra da spostare, dopo oggi.
function giornoLiberoPerPalestra(settimana, oggi, piano) {
  for (const g of lista(settimana.giorni)) {
    if (g.giorno <= oggi || g.fuori) continue;
    const occupato = g.sedute.some((x) => x.tipo !== "riposo" && x.tipo !== "facile" && x.tipo !== "tronco");
    if (occupato) continue;
    const vicina = lungaVicinaDi(piano, g.giorno);
    if (vicina && vicina.giorni <= 1) continue;
    if (g.sedute.some((x) => x.tipo === "facile")) continue;
    return g.giorno;
  }
  return null;
}

// --- Spostare, non recuperare (3.10, regola 9.5) ---

const LIVELLI_FERMI = new Set(["giallo", "rosso", "stop"]);

// Dove va una seduta che oggi non si fa. seduta { tipo, giorno, minuti, parte, di }, settimana quella
// del piano con i giorni, esitiPrevisti i colori già noti per data, partenza la data, piano quello
// intero per weekend, prove e blocco. Una lunga va al primo giorno della stessa settimana con verde o
// giallo leggero e tetto sufficiente, e la palestra di quella finestra si sposta. Un weekend, una
// prova o un blocco va al primo weekend ad almeno 21 giorni dalla partenza e fuori dallo scarico
// finale, se lì c'era una lunga semplice. Il resto salta. Restituisce { esito «sposta» o «salta»,
// giorno, giorni, palestra (gli spostamenti della palestra), testo }.
export function sposta(seduta, settimana, esitiPrevisti = {}, partenza = null, piano = null, opzioni = {}) {
  const x = seduta || {};
  const esiti = esitiPrevisti || {};
  const salta = { esito: "salta", giorno: null, giorni: [], palestra: [], testo: T.testoSalta(x.tipo) };
  const minuti = num(x.minuti) ? x.minuti : num(x.ore) ? x.ore * 60 : 0;
  const giorni = lista(settimana && settimana.giorni);
  if (["lunga", "scarico", "controllo"].includes(x.tipo) || (PIU_GIORNI.has(x.tipo) && (x.parte || 1) > 1)) {
    if (!giorni.length) return salta;
    for (const g of giorni) {
      if (g.giorno <= x.giorno || g.fuori || !g.disponibile) continue;
      if (opzioni.oggi && g.giorno < opzioni.oggi) continue;
      if (LIVELLI_FERMI.has(esiti[g.giorno])) continue;
      const tetto = num(g.tettoChiave) ? g.tettoChiave : g.tetto;
      if (!(tetto >= minuti - EPS)) continue;
      if (g.sedute.some((y) => y.chiave || PIU_GIORNI.has(y.tipo))) continue;
      // Una palestra di gambe già fatta il giorno prima non lascia spazio a un'uscita di oltre 3 ore.
      const ieri = giorni.find((y) => y.giorno === piuGiorni(g.giorno, -1));
      const gambeIeri = ieri && ieri.sedute.some((y) => y.tipo === "palestra" && y.gambe !== false);
      if (gambeIeri && minuti > PP.lungaOltreOre * 60 && opzioni.oggi && ieri.giorno < opzioni.oggi) continue;
      const palestra = [];
      const daSpostare = [ieri, g].filter((y) => y && y.giorno >= (opzioni.oggi || x.giorno) && y.sedute.some((z) => z.tipo === "palestra" && z.gambe !== false));
      for (const p of daSpostare) {
        const nuovo = giorni.find((y) => y.giorno > g.giorno && !y.fuori && !y.sedute.some((z) => z.tipo !== "riposo" && z.tipo !== "tronco"));
        palestra.push({ da: p.giorno, a: nuovo ? nuovo.giorno : null });
      }
      const righe = [T.testoSposta(x.tipo, g.giorno, true), ...palestra.map((p) => (p.a ? T.testoPalestraSposta(p.da, p.a) : T.PALESTRA_SALTA_OGGI))];
      return { esito: "sposta", giorno: g.giorno, giorni: [g.giorno], palestra, testo: righe.join(" ") };
    }
    return salta;
  }
  if (PROVE.has(x.tipo) || PIU_GIORNI.has(x.tipo)) {
    const p = dataDi(partenza) || (piano && piano.obiettivo ? piano.obiettivo.data : null);
    if (!p || !piano) return salta;
    const inizioTapering = piano.tapering && piano.tapering.inizio ? piano.tapering.inizio : piuGiorni(p, -PIANO.tapering.normale.giorni);
    const dopo = lista(piano.settimane).filter((s) => s.lunedi > x.giorno).sort((a, b) => (a.lunedi < b.lunedi ? -1 : 1));
    const n = PIU_GIORNI.has(x.tipo) ? Math.max(2, x.di || 2) : 1;
    for (const s of dopo) {
      const chiave = lista(s.sedute);
      const inizio = chiave.length ? chiave[0].giorno : piuGiorni(s.lunedi, SABATO);
      const date = Array.from({ length: n }, (_, i) => piuGiorni(inizio, i));
      const fine = date[date.length - 1];
      if (giorniFra(fine, p) < PRONTEZZA.giorniProvaFinita || fine >= inizioTapering) return salta;
      const semplice = s.tipo !== "S" && s.tipo !== "tapering" && chiave.length === 1 && chiave[0].tipo === "lunga";
      if (!semplice) return salta;
      return { esito: "sposta", giorno: date[0], giorni: date, palestra: [], testo: T.testoSposta(x.tipo, date[0], false) };
    }
    return salta;
  }
  return salta;
}

// --- La domenica (3.11) ---

const tipoFacileOMedia = (x) => (x === "media" || x === "richiamo" ? "media" : x === "facile" || x === "recupero" ? "facile" : null);

// Il controllo della domenica (regole 8.1-8.3). giorni sono i giorni puliti di js/dati.js con fatica
// (energia), dolori (gambe), sonno, fcSonno o fcRiposo e hrv. uscite le attività pulite, con lo
// sforzo. diario ha per data stoMale (gli id del pannello), livello (l'esito del semaforo), s6 («si» o
// «no») ed evento (vero in modalità evento). piano quello di pianoLungo. opzioni ha oggi (la domenica,
// di default l'ultimo giorno), precedenti (i controlli delle domeniche prima, dal più vecchio, con conta
// e proposta), eta e dispositivo. Restituisce { spento, segnali, conta, chiedi, proposta, testi, medico }.
export function controlloDomenica(giorni, uscite = [], diario = {}, piano = null, opzioni = {}) {
  const D = DOMENICA;
  const lg = lista(giorni).filter((g) => g && (typeof g.d === "string" || typeof g.giorno === "string")).map((g) => ({ ...g, d: g.d || g.giorno }));
  const oggi = dataDi(opzioni.oggi) || (lg.length ? lg.map((g) => g.d).sort().pop() : oggiIso());
  const dia = diario && typeof diario === "object" ? diario : {};
  const voce = (d) => dia[d] || {};
  const dal = piuGiorni(oggi, -6);
  const settimana = [];
  for (let d = dal; d <= oggi; d = piuGiorni(d, 1)) settimana.push(d);
  const segnali = { S1: false, S2: false, S3: false, S4: false, S5: false, S6: false, S7: false };
  const vuoto = { spento: false, segnali, conta: 0, chiedi: null, proposta: { tipo: "continua" }, testi: [], medico: null };
  if (voce(oggi).evento || (opzioni.evento === true)) return { ...vuoto, spento: true, testi: [T.TESTI_DOMENICA.spento] };

  // Le fatiche volute restano fuori, con le 72 ore dopo (regola 8.2).
  const fuori = new Set();
  const fatiche = [
    ...lista(piano && piano.settimane).flatMap((s) => faticheDi(lista(s.sedute))),
    ...lista(piano && piano.fatiche),
    ...usciteGrandiDi(uscite, oggi),
  ];
  for (const f of fatiche) {
    if (!dataDi(f.inizio) || !dataDi(f.fine)) continue;
    for (let d = f.inizio; d <= piuGiorni(f.fine, D.oreDopoFatiche / 24); d = piuGiorni(d, 1)) fuori.add(d);
  }
  for (const d of settimana) if (voce(d).evento) fuori.add(d);

  // La norma, le 4 settimane prima senza le settimane leggere del piano.
  const leggere = new Set(lista(piano && piano.settimane).filter((s) => ["S", "tapering", "F", "F7", "corto"].includes(s.tipo)).map((s) => s.lunedi));
  const norma = [];
  for (let w = 1; w <= D.settimaneCerca && norma.length < 7 * D.settimaneNorma; w++) {
    const fine = piuGiorni(dal, -1 - 7 * (w - 1));
    const inizio = piuGiorni(fine, -6);
    const lunedi = piuGiorni(inizio, -giornoSettimana(inizio));
    if (leggere.has(lunedi) || leggere.has(piuGiorni(lunedi, 7))) continue;
    for (let d = inizio; d <= fine; d = piuGiorni(d, 1)) if (!fuori.has(d) && !voce(d).evento) norma.push(d);
  }
  const perD = new Map(lg.map((g) => [g.d, g]));
  const valori = (date, f) => date.map((d) => perD.get(d)).filter(Boolean).map(f).filter(num);
  const contano = settimana.filter((d) => !fuori.has(d));

  // S1, lo sforzo delle uscite facili o medie.
  const tipoUscita = (a) => {
    const g = giornoDi(piano, a.giorno);
    const x = g ? g.sedute.find((y) => BICI.has(y.tipo)) : null;
    if (x) return tipoFacileOMedia(x.tipo);
    return a.secondi > 0 && a.secondi < D.S1.oreFacili * 3600 ? "facile" : null;
  };
  const conSforzo = lista(uscite).filter((a) => a && inBici(a) && num(a.sforzo) && typeof a.giorno === "string");
  const normaSet = new Set(norma);
  let dure = 0;
  for (const tipo of ["facile", "media"]) {
    const dellaNorma = conSforzo.filter((a) => normaSet.has(a.giorno) && tipoUscita(a) === tipo).map((a) => a.sforzo);
    if (dellaNorma.length < D.S1.usciteNorma) continue;
    const m = mediana(dellaNorma);
    dure += conSforzo.filter((a) => contano.includes(a.giorno) && tipoUscita(a) === tipo && a.sforzo >= m + D.S1.punti - EPS).length;
  }
  segnali.S1 = dure >= D.S1.uscite;

  // S2, energia o gambe peggio della propria mediana in almeno 4 mattine su 7.
  const mEnergia = valori(norma, (g) => g.fatica);
  const mGambe = valori(norma, (g) => g.dolori);
  const medE = mEnergia.length ? mediana(mEnergia) : null;
  const medG = mGambe.length ? mediana(mGambe) : null;
  const peggio = (d) => {
    const g = perD.get(d);
    if (!g) return false;
    return (medE !== null && num(g.fatica) && g.fatica > medE + EPS) || (medG !== null && num(g.dolori) && g.dolori > medG + EPS);
  };
  const peggiFuori = settimana.filter((d) => fuori.has(d) && peggio(d)).length;
  const peggiDentro = contano.filter(peggio).length;
  const nonTornate = contano.some((d) => peggio(d) && fatiche.some((f) => d > piuGiorni(f.fine, D.oreDopoFatiche / 24) && f.fine >= piuGiorni(dal, -3)));
  segnali.S2 = peggiDentro >= D.S2.mattine || (nonTornate && peggiDentro + peggiFuori >= D.S2.mattine);

  // S3, il sonno.
  const sonniNorma = valori(norma, (g) => g.sonno);
  if (sonniNorma.length) {
    const med = mediana(sonniNorma);
    const corte = contano.filter((d) => {
      const g = perD.get(d);
      return g && num(g.sonno) && g.sonno <= med - D.S3.oreInMeno * 3600 + EPS;
    }).length;
    segnali.S3 = corte >= D.S3.notti;
  }

  // S4, il mattino, solo insieme a S1 o S2.
  if (segnali.S1 || segnali.S2) {
    const fc = (g) => (num(g.fcSonno) ? g.fcSonno : num(g.fcRiposo) ? g.fcRiposo : num(g.fc) ? g.fc : null);
    const fcNorma = valori(norma, fc);
    const fcSett = valori(contano, fc);
    let mattino = fcNorma.length && fcSett.length && somma(fcSett) / fcSett.length >= mediana(fcNorma) + D.S4.battito - EPS;
    const ln = (g) => (num(g.hrv) && g.hrv > 0 ? Math.log(g.hrv) : null);
    const hNorma = valori(norma, ln);
    const hSett = valori(contano, ln);
    if (!mattino && hNorma.length >= 7 && hSett.length) {
      const centro = mediana(hNorma);
      const mad = mediana(hNorma.map((v) => Math.abs(v - centro)));
      const ds = Math.max(SEMAFORO.hrv.madInDs * mad, opzioni.dispositivo === "anelloFascia" ? SEMAFORO.hrv.dsMinima.anelloFascia : SEMAFORO.hrv.dsMinima.polso);
      mattino = Math.abs(somma(hSett) / hSett.length - centro) > D.S4.hrvDs * ds + EPS;
    }
    segnali.S4 = Boolean(mattino);
  }

  // S5, febbre o sintomi respiratori segnati in «Sto male», sempre.
  const malattia = settimana.flatMap((d) => lista(voce(d).stoMale));
  segnali.S5 = malattia.some((id) => D.S5.caselle.includes(id));
  const febbre = malattia.includes(D.S5.febbre);

  // S7, il semaforo, senza il Giallo leggero e fuori dalle fatiche volute.
  const livelli = contano.map((d) => voce(d).livello);
  const rossi = livelli.filter((l) => l === "rosso").length;
  const gialli = livelli.filter((l) => l === "giallo" || l === "rosso").length;
  segnali.S7 = rossi >= D.S7.rossi || gialli >= D.S7.gialliORossi;

  // S6, chiesta solo se c'è già almeno un altro segnale.
  const altri = Object.entries(segnali).filter(([k, v]) => k !== "S6" && v).length;
  const risposta = settimana.map((d) => voce(d).s6).find((v) => v === "si" || v === "no") ?? opzioni.s6 ?? null;
  let chiedi = null;
  if (altri >= DOMANDE.S6AltriSegnali) {
    if (risposta === "si") segnali.S6 = true;
    else if (risposta === null) chiedi = "S6";
  }
  const conta = Object.values(segnali).filter(Boolean).length;
  const elenco = Object.keys(segnali).filter((k) => segnali[k]);

  // Cosa propone (regola 8.3).
  const precedenti = lista(opzioni.precedenti);
  const ultimo = precedenti[precedenti.length - 1] || null;
  const diFila = ultimo && num(ultimo.conta) && ultimo.conta >= D.settimanaFacile.segnali && conta >= D.settimanaFacile.segnali;
  const lunediDopo = piuGiorni(oggi, 1);
  const partenza = piano && piano.obiettivo ? piano.obiettivo.data : null;
  const testi = [];
  if (segnali.S6) testi.push(T.TESTI_DOMENICA.cibo);
  let proposta = { tipo: "continua" };
  if (conta >= D.giorniFacili.segnali || diFila || febbre) {
    proposta = { tipo: "giorniFacili", lunedi: lunediDopo, giorni: D.giorniFacili.giorni, riferimento: D.giorniFacili.riferimentoOre * 60, riparteDopoOre: febbre ? D.giorniFacili.oreSenzaFebbre : null };
    testi.push(febbre ? T.TESTI_DOMENICA.febbre : ultimo && ultimo.proposta && ultimo.proposta.tipo === "giorniFacili" ? T.TESTI_DOMENICA.ancora : T.TESTI_DOMENICA.tre);
  } else if (conta >= D.settimanaFacile.segnali) {
    const settimane = lista(piano && piano.settimane);
    const carichi = settimane.filter((s) => DI_CARICO.has(s.tipo) && s.lunedi < dal).slice(-D.settimanaFacile.settimane);
    const media = carichi.length ? somma(carichi, (s) => s.orePiene ?? s.ore) / carichi.length : null;
    proposta = {
      tipo: "settimanaFacile",
      lunedi: lunediDopo,
      ore: media !== null ? D.settimanaFacile.ore * media : null,
      giroMassimo: D.settimanaFacile.giroMassimoOre * 60,
      giorniSenzaBici: D.settimanaFacile.giorniSenzaBici,
      chiave: D.settimanaFacile.chiaveOre * 60,
      sostituisceScarico: null,
      coincideConTapering: false,
    };
    const prossime = settimane.filter((s) => s.lunedi >= lunediDopo && s.lunedi <= piuGiorni(lunediDopo, 7 * (D.settimanaFacile.settimaneDaScarico - 1)));
    const finale = settimane.find((s) => s.lunedi === lunediDopo && s.tipo === "tapering")
      || (partenza && giorniFra(lunediDopo, partenza) <= 7 * D.settimanaFacile.settimaneFinali);
    if (finale) {
      proposta.coincideConTapering = true;
      testi.push(T.testoDueSegnali(elenco), T.TESTI_DOMENICA.scaricoFinale);
    } else {
      const scarico = prossime.find((s) => s.tipo === "S");
      if (scarico) proposta.sostituisceScarico = scarico.lunedi;
      testi.push(T.testoDueSegnali(elenco));
      if (scarico) testi.push(T.TESTI_DOMENICA.scarico);
    }
  } else {
    testi.push(T.TESTI_DOMENICA.nessuno);
  }

  // Il medico (regola 8.7). La stanchezza che non migliora dopo 14 giorni di carico ridotto.
  let medico = null;
  const ridotti = [];
  for (let i = precedenti.length - 1; i >= 0; i--) {
    const p = precedenti[i] && precedenti[i].proposta;
    if (!p || p.tipo === "continua") break;
    ridotti.push(p);
  }
  if (conta >= D.settimanaFacile.segnali && ridotti.length * 7 >= D.medico.giorni) medico = T.TESTI_DOMENICA.medico;
  if (medico) testi.push(medico);
  if (opzioni.gialliDiFila) testi.unshift(T.TESTI_DOMENICA.gialliDiFila);
  return { spento: false, segnali, conta, chiedi, proposta, testi, medico, domandaS6: chiedi ? T.TESTI_DOMENICA.domandaS6 : null };
}

// Le uscite grandi delle ultime settimane, almeno 5 ore oppure 1,5 volte la più lunga delle 4
// settimane prima e almeno 3 ore (regola 8.8).
function usciteGrandiDi(uscite, oggi) {
  const U = SEMAFORO.uscitaGrande;
  const mappa = perData(lista(uscite).filter((a) => a && inBici(a) && typeof a.giorno === "string" && a.giorno <= oggi));
  const ore = new Map();
  for (const [d, att] of mappa) ore.set(d, Math.max(0, ...giriUniti(att, d).map((g) => g.secondi / 3600)));
  const grandi = [];
  for (const [d, h] of ore) {
    if (d < piuGiorni(oggi, -DOMENICA.usciteGrandiGiorni) || h < U.oreMinime - EPS) continue;
    let prima = 0;
    for (let k = 1; k <= 7 * U.settimane; k++) prima = Math.max(prima, ore.get(piuGiorni(d, -k)) || 0);
    if (h + EPS >= U.ore || h + EPS >= U.volte * prima) grandi.push({ tipo: "uscitaGrande", inizio: d, fine: d });
  }
  return grandi;
}

// L'avviso di crescita rapida (regola 1.9). La domenica, se la Fitness è salita di oltre 7 punti in
// 7 giorni o di oltre 5 a settimana per 3 settimane (5 e 4 da 50 anni). serie sono le righe di
// serieCarico di js/carico.js ({ d, fitness }) o i giorni con ctl. Restituisce { avviso, fino, tetto, testo }.
export function crescitaRapida(serie, oggi, eta = null) {
  const C = PIANO.crescitaRapida;
  const da50 = num(eta) && eta >= C.daAnni;
  const righe = lista(serie).filter((r) => r && typeof r.d === "string").map((r) => ({ d: r.d, f: num(r.fitness) ? r.fitness : r.ctl })).filter((r) => num(r.f)).sort((a, b) => (a.d < b.d ? -1 : 1));
  const valore = (d) => {
    let v = null;
    for (const r of righe) if (r.d <= d) v = r.f;
    return v;
  };
  // La Fitness di oggi e di 1, 2 e 3 settimane prima, e le salite di ogni settimana.
  const f = Array.from({ length: C.settimane + 1 }, (_, k) => valore(piuGiorni(oggi, -7 * k)));
  const salita = (i) => (num(f[i]) && num(f[i + 1]) ? f[i] - f[i + 1] : null);
  const in7 = salita(0);
  const avviso = (num(in7) && in7 > (da50 ? C.in7GiorniDa50 : C.in7Giorni) + EPS)
    || Array.from({ length: C.settimane }, (_, i) => i).every((i) => num(salita(i)) && salita(i) > (da50 ? C.perSettimanaDa50 : C.perSettimana) + EPS);
  return {
    avviso,
    fino: avviso ? piuGiorni(oggi, SEMAFORO.crescitaRapidaGiorni) : null,
    tetto: avviso ? "giallo-leggero" : null,
    testo: avviso ? T.AVVISI.crescita : null,
  };
}

// --- Il limite del facile e il cibo ---

// Il battito limite dei giri facili (3.8, regola 2.3). Prima l'80% della FC di soglia del profilo
// «Ride» di intervals.icu, poi il 70% della FC massima del profilo, oppure di 208 − 0,7 × età con
// l'età al centro della fascia. Con tutte e due vale la più bassa. Solo per chi ha il battito nei
// giri, quindi null con profilo.battitoNeiGiri falso. Restituisce { battito, fonte «soglia», «massima»
// o «eta», medioLunghe (il 70% della FC massima, per le uscite di 5 ore e più), righe } oppure null.
export function limiteFacile(atleta, profilo = {}) {
  const p = profilo && typeof profilo === "object" ? profilo : {};
  if (p.battitoNeiGiri === false) return null;
  const L = PIANO.limiteFacile;
  const profili = lista(atleta && atleta.sportSettings);
  const ride = profili.find((x) => lista(x && x.types).includes("Ride")) || profili[0] || atleta || null;
  const lthr = ride && num(ride.lthr) && ride.lthr > 0 ? ride.lthr : null;
  const maxHr = ride && num(ride.max_hr) && ride.max_hr > 0 ? ride.max_hr : num(p.fcMassima) ? p.fcMassima : null;
  const massima = maxHr ?? L.formula.base - L.formula.perAnno * etaDi(p);
  const candidati = [{ battito: L.quotaMassima * massima, fonte: maxHr ? "massima" : "eta" }];
  if (lthr) candidati.push({ battito: L.quotaSoglia * lthr, fonte: "soglia" });
  const scelto = candidati.reduce((m, c) => (c.battito < m.battito ? c : m));
  const limite = { battito: Math.round(scelto.battito), fonte: scelto.fonte, medioLunghe: Math.round(L.quotaMassima * massima) };
  return { ...limite, righe: T.righeLimite(limite, 0) };
}

// I grammi di carboidrati all'ora della lunga che allena lo stomaco (regola 8.11). Dalla settimana −10
// alla −2. Si parte da 35 g, con «Bene» la settimana dopo sale di 10 fino a 60, con «Così così» o senza
// risposta resta, con «Male» scende di 10. diario sono le risposte, [{ giorno, grammi, stomaco }].
// Restituisce i grammi, oppure null fuori da quelle settimane.
export function obiettivoCarboidrati(settimana, diario = []) {
  const C = PIANO.carboidrati.stomaco;
  const w = settimana && num(settimana.indice) ? settimana.indice : null;
  if (w === null || w < C.da || w > C.a) return null;
  const lunedi = settimana.lunedi || null;
  const prima = lista(diario).filter((x) => x && num(x.grammi) && typeof (x.giorno || x.lunedi) === "string" && (!lunedi || (x.giorno || x.lunedi) < lunedi))
    .sort((a, b) => ((a.giorno || a.lunedi) < (b.giorno || b.lunedi) ? -1 : 1));
  const ultima = prima[prima.length - 1];
  if (!ultima) return C.partenza;
  let g = ultima.grammi;
  if (ultima.stomaco === "bene") g += C.passo;
  else if (ultima.stomaco === "male") g -= C.passo;
  return fra(g, C.minimo, C.massimo);
}

// --- Per il semaforo ---

// Queste funzioni guardano anche i giorni passati. Il piano rifatto il lunedì li ha, perché
// pianoLungo copia le settimane passate del piano salvato (3.12). opzioni.eBikeEvento vale di
// default quello dell'obiettivo del piano, e con l'evento in e-bike l'e-bike conta per intero.
const eBikeDel = (piano, opzioni) => (typeof opzioni.eBikeEvento === "boolean" ? opzioni.eBikeEvento : Boolean(piano && piano.obiettivo && piano.obiettivo.eBike));

// Le sedute chiave del piano con la data, dalle settimane e dai giorni, ognuna una volta sola, anche
// quelle portate nella settimana dopo.
function seduteChiaveDel(piano) {
  const viste = new Map();
  const aggiungi = (x) => {
    if (!x || !dataDi(x.giorno) || x.possibile === false || typeof x.tipo !== "string") return;
    const ore = num(x.ore) ? x.ore : num(x.minuti) ? x.minuti / 60 : 0;
    const chiave = `${x.giorno}|${x.tipo}|${x.parte || 1}`;
    if (!viste.has(chiave)) viste.set(chiave, { giorno: x.giorno, tipo: x.tipo, ore, parte: x.parte || null, di: x.di || null });
  };
  for (const s of lista(piano && piano.settimane)) {
    lista(s.sedute).forEach(aggiungi);
    for (const g of lista(s.giorni)) for (const x of lista(g && g.sedute)) if (x && x.chiave) aggiungi({ ...x, giorno: g.giorno });
  }
  return [...viste.values()].sort(perGiorno);
}

// Le fatiche volute del piano già fatte, per giorniDiGuardia del semaforo ({ tipo, inizio, fine }).
// Conta solo un giorno 1 fatto, cioè almeno metà della seduta in bici.
export function fatichePiano(piano, uscite = [], oggi = oggiIso(), opzioni = {}) {
  const eBikeEvento = eBikeDel(piano, opzioni);
  const mappa = perData(lista(uscite).filter((a) => a && inBici(a)));
  const fatte = (d, minuti) => mappa.has(d) && contoOre(mappa.get(d), d, { eBikeEvento }).ore * 60 + EPS >= minuti / 2;
  const sedute = seduteChiaveDel(piano);
  const fatiche = [];
  for (const f of faticheDi(sedute)) {
    if (f.inizio >= oggi) continue;
    const primo = sedute.find((x) => x.giorno === f.inizio && x.tipo === f.seduta) || sedute.find((x) => x.giorno === f.inizio);
    const minuti = primo ? primo.ore * 60 : 0;
    // Le uscite grandi il semaforo le vede da solo nelle uscite.
    if (f.tipo !== "uscitaGrande" && fatte(f.inizio, minuti)) fatiche.push({ tipo: f.tipo, inizio: f.inizio, fine: f.fine });
  }
  return fatiche;
}

// La modalità evento dal giorno 2 di un weekend, di una prova o di un blocco del piano, se il giorno 1
// è stato fatto (4.5). Restituisce { tipo, giorno, giorni } per il semaforo, oppure null.
export function modoEventoPiano(piano, uscite = [], oggi = oggiIso(), opzioni = {}) {
  const eBikeEvento = eBikeDel(piano, opzioni);
  const mappa = perData(lista(uscite).filter((a) => a && inBici(a)));
  const sedute = seduteChiaveDel(piano);
  for (const x of sedute) {
    if (!PIU_GIORNI.has(x.tipo) || !(x.parte > 1) || x.giorno !== oggi) continue;
    const inizio = piuGiorni(x.giorno, -(x.parte - 1));
    const primo = sedute.find((y) => y.giorno === inizio && y.tipo === x.tipo) || sedute.find((y) => y.giorno === inizio);
    const minuti = primo ? primo.ore * 60 : S.media.minimo;
    if (mappa.has(inizio) && contoOre(mappa.get(inizio), inizio, { eBikeEvento }).ore * 60 + EPS >= minuti / 2) {
      return { tipo: x.tipo === "blocco" ? "blocco" : x.tipo === "weekend" ? "weekend" : "prova", giorno: x.parte, giorni: x.di };
    }
  }
  return null;
}

// I giorni persi di fila fino a ieri, con meno del 30% delle ore previste (regola 2.9), per
// storico.interruzione.
export function giorniPersi(piano, uscite = [], oggi = oggiIso(), opzioni = {}) {
  const eBikeEvento = eBikeDel(piano, opzioni);
  const mappa = perData(lista(uscite).filter((a) => a && inBici(a)));
  let previste = 0;
  let fatte = 0;
  let persi = 0;
  for (let k = 1; k <= PIANO.interruzioni.giorniCerca; k++) {
    const d = piuGiorni(oggi, -k);
    const g = giornoDi(piano, d);
    const s = settimanaDi(piano, d);
    if (!g && !s) break;
    const ore = g ? g.ore : s && num(s.ore) ? s.ore / 7 : 0;
    previste += ore;
    fatte += mappa.has(d) ? contoOre(mappa.get(d), d, { eBikeEvento }).ore : 0;
    if (previste > 0 && fatte >= PIANO.interruzioni.sottoPrevisto * previste - EPS) break;
    persi = k;
  }
  return persi;
}
