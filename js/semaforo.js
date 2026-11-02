// Il semaforo del mattino, a punti (capitolo 4 della specifica). Ogni voce dà 0, 1 o 2 punti, e una
// voce da 2 punti è un segnale forte. Gli stop vengono prima di tutto e chiudono la decisione. Il Rosso
// arriva solo dagli stop, da segnali che concordano o dal carico molto alto per 3 mattine, e i tetti
// vincono sempre. Funzioni pure, senza DOM e senza window. Le soglie stanno in js/parametri.js e i testi
// in js/testi.js, dove c'è anche la tabella della Guida (GUIDA_SEMAFORO) da cambiare con le regole.

import { SEMAFORO, DATI, PRONTEZZA, PIANO, MEMORIA } from "./parametri.js?v=202611021705";
import {
  aggiungiGiorni, giorniTra, media, mediana, deviazioneMediana, notteValida, baseHrv, baseFc, dsMinimaHrv,
  oreBiciDelGiorno, mattinoDelGiorno, GIORNI_USCITE,
} from "./modello.js?v=202611021705";
import {
  LIVELLI, ESITO_VOCE, VOCI, PERCHE, NOTE, STOP, CARICO_TRE_MATTINE, STO_MALE, CONTROLLO, GUARDIA,
  MESSAGGI, MEDICO, FIDUCIA, VIAGGIO, ZONE_FRESCHEZZA,
} from "./testi.js?v=202611021705";

export { LIVELLI, ESITO_VOCE };

const S = SEMAFORO;
const ORA = 3600;
const GRAVITA = { verde: 0, nessuno: 1, "giallo-leggero": 1, giallo: 2, rosso: 3 };
const PER_GRAVITA = ["verde", "giallo-leggero", "giallo", "rosso"];
// L'ordine delle voci nel «Perché», che è anche quello della parità per la frase principale (4.8).
const ORDINE = ["energia", "gambe", "acciacchi", "sonno", "fc", "hrv", "carico"];
const DALLA_NOTTE = new Set(["sonno", "fc", "hrv"]);
const DALLE_RISPOSTE = new Set(["energia", "gambe", "acciacchi"]);
const TIPI_BICI = new Set(DATI.tipiBici);
const NOTTI_DOPO = Math.round(S.guardia.oreSenzaPunti / 24);   // le 72 ore sono le 3 mattine dopo

const lista = (v) => (Array.isArray(v) ? v : []);
const ultimo = (m) => m.giorni.length - 1;
const diarioDi = (m, d) => (m.diario && m.diario[d]) || {};
const storiaDi = (m, d) => (m.storia && m.storia[d]) || {};
const numero = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// Il gruppo di ogni casella di «Sto male», preso dai testi così gli id stanno in un posto solo.
const GRUPPO = new Map();
for (const gruppo of STO_MALE.gruppi) for (const casella of gruppo.caselle) GRUPPO.set(casella.id, gruppo.id);

function sintomiDi(voceDiario) {
  const s = { cuore: [], malattia: [], collo: [] };
  for (const id of lista(voceDiario && voceDiario.stoMale)) {
    const gruppo = GRUPPO.get(id);
    if (gruppo) s[gruppo].push(id);
  }
  return s;
}

// La febbre con i sintomi al petto, che prima di riprendere chiede il medico (regola 5.17).
function febbreAlPetto(s) {
  return s.malattia.includes("febbre") && (s.malattia.includes("tosse") || s.cuore.includes("petto") || s.cuore.includes("fiato"));
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// Una voce del «Perché». Il pallino è verde, giallo o grigio, mai un quinto colore (4.8).
function voce(chiave, campi = {}) {
  const v = {
    chiave, nome: VOCI[chiave].nome, punti: 0, forte: false, piuNotti: false, attiva: false,
    testo: "", pallino: null, lettura: null, ...campi,
  };
  v.forte = v.punti >= S.punti.forte;
  if (!v.pallino) v.pallino = v.punti > 0 ? "giallo" : v.attiva ? "verde" : "grigio";
  return v;
}

function etaDi(contesto, profilo) {
  for (const v of [contesto.eta, profilo.eta]) if (numero(v) !== null) return v;
  const k = S.fasceEta.indexOf(contesto.fasciaEta ?? profilo.fasciaEta);
  return k >= 0 ? PIANO.limiteFacile.etaCentri[k] : S.etaPredefinita;
}

// --- Lo stato del giorno ---

// Il contesto di valuta, con i valori che mancano calcolati dal modello. Vedi valuta per la forma.
function risolvi(m, contesto = {}) {
  const profilo = { ...(m.profilo || {}), ...(contesto.profilo || {}) };
  const eta = etaDi(contesto, profilo);
  const c = {
    profilo,
    eta,
    aritmia: Boolean(contesto.aritmia ?? profilo.aritmia),
    dispositivo: contesto.dispositivo || profilo.dispositivo || S.dispositivoPredefinito,
    cambioDispositivo: contesto.cambioDispositivo || profilo.cambioDispositivo || null,
    evento: contesto.evento || null,
    giorniPartenza: numero(contesto.giorniPartenza),
    giorniEvento: numero(contesto.giorniEvento),
    crescita: Boolean(contesto.crescita),
    malattia: statoMalattia(m.diario, m.storia, m.oggi),
    cuore: statoCuore(m.diario, m.storia, m.oggi),
  };
  c.rientro = contesto.rientro !== undefined ? contesto.rientro : c.malattia.rientro;
  // I viaggi del diario ricostruiscono anche i giorni in cui l'app è rimasta chiusa (4.6).
  c.viaggi = viaggiDelDiario(m.diario, m.uscite, m.oggi);
  c.giorniInEvento = giorniInEvento(c.viaggi, m.storia, m.oggi);
  c.guardia = contesto.guardia !== undefined
    ? contesto.guardia
    : giorniDiGuardia(m.storia, m.piano, m.uscite, m.oggi, { eta, viaggi: c.viaggi });
  const esc = (c.guardia && c.guardia.esclusioni) || {};
  c.guardiaNotti = new Set(lista(esc.notti));
  c.guardiaCarico = new Set(lista(esc.carico));
  c.escluso = esclusioni(m, c);
  c.fiducia = contesto.fiducia || fiducia(m, profilo, c);
  c.caricoBasso = c.fiducia.carico === "bassa";
  return c;
}

// Le notti fuori dalle basi di HRV, battito e sonno. Caselle delle cause, «Sto male» e malattia,
// modalità evento, le 72 ore dopo le fatiche volute e le notti prima di un cambio di dispositivo.
function esclusioni(m, c) {
  const notti = new Set(c.malattia.giorni);
  for (const [d, v] of Object.entries(m.diario || {})) {
    if (v && (lista(v.cause).length || lista(v.stoMale).length || v.controllo === "si")) notti.add(d);
  }
  for (const d of c.giorniInEvento) notti.add(d);
  if (c.evento) notti.add(m.oggi);
  for (const d of c.guardiaNotti) notti.add(d);
  const dal = c.cambioDispositivo;
  return (g) => notti.has(g.d) || Boolean(dal && g.d < dal);
}

function situazione(m, c, k) {
  const d = m.giorni[k].d;
  const oggi = k === ultimo(m);
  const dia = diarioDi(m, d);
  const guardia = c.guardia || {};
  return {
    k,
    d,
    oggi,
    cause: lista(dia.cause),
    pedalata: dia.pedalata === "si" || dia.pedalata === "no" ? dia.pedalata : null,
    evento: oggi ? Boolean(c.evento) : c.giorniInEvento.has(d),
    senzaPuntiNotte: oggi ? Boolean(guardia.senzaPuntiNotte) : c.guardiaNotti.has(d),
    senzaPuntiCarico: oggi ? Boolean(guardia.senzaPuntiCarico) : c.guardiaCarico.has(d),
  };
}

function testoMancante(m, chiave) {
  const arrivava = m.giorni.some((g) => (chiave === "sonno" ? g.sonno || g.punteggioSonno : g[chiave]));
  return arrivava ? VOCI.nonArrivata : VOCI[chiave].mai;
}

// --- Le voci, una per una (4.3) ---

// Le tre domande, sulla scala 1-4 di intervals.icu. Per gli acciacchi vale quella di ieri se oggi manca.
function vociDomande(m, k, s) {
  const D = S.domande;
  const g = m.giorni[k];
  const T = VOCI;
  const r = {};

  // Una domanda senza risposta ha il pallino grigio e la sua scritta, perché le domande contano sempre
  // per intero (4.3) e «non conta oggi» direbbe il contrario.
  const senza = (chiave, testo) => voce(chiave, { testo, esito: "daRispondere" });
  const e = g.fatica;
  if (!e) r.energia = senza("energia", T.energia.senza);
  else if (D.energia[e] === "stop") r.energia = voce("energia", { attiva: true, valore: e, stop: "pezzi", pallino: "giallo", testo: T.energia.pezzi });
  else {
    const p = D.energia[e] || 0;
    r.energia = voce("energia", { attiva: true, valore: e, punti: p, testo: p ? T.energia.uno : e === 1 ? T.energia.tanta : T.energia.normale });
  }

  const gb = g.dolori;
  if (!gb) r.gambe = senza("gambe", T.gambe.senza);
  else {
    const p = D.gambe[gb] || 0;
    if (p >= S.punti.forte && s.pedalata === "si") {
      r.gambe = voce("gambe", { attiva: true, valore: gb, stop: "dolore", pallino: "giallo", testo: T.gambe.pedalata });
    } else {
      r.gambe = voce("gambe", {
        attiva: true, valore: gb, punti: p,
        testo: p >= S.punti.forte ? T.gambe.due : p ? T.gambe.uno : gb === 1 ? T.gambe.fresche : T.gambe.normali,
        domanda: p >= S.punti.forte && !s.pedalata ? "pedalata" : null,
      });
    }
  }

  let a = g.infortunio;
  let daIeri = false;
  let pedalata = s.pedalata;
  const prima = m.giorni[k - D.acciacchiGiorniPrima];
  if (!a && prima && prima.infortunio) {
    a = prima.infortunio;
    daIeri = true;
    const p = diarioDi(m, prima.d).pedalata;
    pedalata = pedalata || (p === "si" || p === "no" ? p : null);
  }
  const ieri = (testo) => (daIeri ? `${testo} ${T.acciacchi.ieri}` : testo);
  if (!a) r.acciacchi = senza("acciacchi", T.acciacchi.senza);
  else {
    const p = D.acciacchi[a];
    const campi = { attiva: true, valore: a, daIeri };
    if (a >= 4) r.acciacchi = voce("acciacchi", { ...campi, stop: "infortunio", pallino: "giallo", testo: ieri(T.acciacchi.infortunio) });
    else if (p === "stop" && pedalata === "no") r.acciacchi = voce("acciacchi", { ...campi, punti: D.doloreSenzaCambio, testo: ieri(T.acciacchi.due) });
    else if (p === "stop") {
      r.acciacchi = voce("acciacchi", { ...campi, stop: "dolore", pallino: "giallo", testo: ieri(T.acciacchi.dolore), domanda: pedalata ? null : "pedalata" });
    } else r.acciacchi = voce("acciacchi", { ...campi, punti: p || 0, testo: p ? ieri(T.acciacchi.uno) : T.acciacchi.niente });
  }
  return r;
}

// Fitness e Fatica di ieri sera, mai quelle di oggi che contengono già il giro di stamattina. Se ieri
// manca, valgono quelle dell'ultimo giorno prima che le ha (mattinoDelGiorno di js/modello.js).
function mattinoDi(m, k) {
  const g = mattinoDelGiorno(m.giorni, k);
  return { ctl: g.ctl, atl: g.atl, faticaLenta: numero(g.faticaLenta) };
}

function voceCarico(m, k, s, c) {
  const C = S.carico;
  const mat = mattinoDi(m, k);
  const lenta = c.eta >= C.faticaLentaDaAnni;
  const F = mat.ctl;
  const A = lenta ? mat.faticaLenta : mat.atl;
  if (F === null || A === null) return voce("carico", { testo: VOCI.carico.nessuno });
  if (F < C.fitnessMinima) return voce("carico", { testo: VOCI.carico.pochi, lettura: { F, A, lenta } });
  const R = A / F;
  const D = A - F;
  let punti = 0;
  if (R >= C.moltoAlto.rapporto && D >= C.moltoAlto.differenza) punti = 2;
  else if (R >= C.alto.rapporto && D >= C.alto.differenza) punti = 1;
  const lettura = { F, A, R, D, lenta, misurati: punti };
  if (s.evento) return voce("carico", { attiva: true, lettura, pallino: "grigio", testo: VOCI.viaggio });
  if (s.senzaPuntiCarico) return voce("carico", { attiva: true, lettura, pallino: "grigio", testo: VOCI.guardiaCarico });
  if (c.caricoBasso) punti = Math.min(punti, C.fiduciaBassaMassimo);
  const testo = punti >= 2 ? VOCI.carico.due : punti ? VOCI.carico.uno : R < C.riposato ? VOCI.carico.meno : VOCI.carico.linea;
  return voce("carico", { attiva: true, punti, lettura, testo });
}

function medianaSonno(m, k, escluso) {
  const Z = S.sonno;
  const valori = [];
  for (let j = Math.max(0, k - Z.nottiMediana); j < k; j++) {
    const g = m.giorni[j];
    if (g.sonno && !escluso(g)) valori.push(g.sonno / ORA);
  }
  return valori.length >= Z.nottiMedianaMinime ? mediana(valori) : null;
}

// La media delle ore delle ultime 7 notti, oggi compreso, se sono almeno 4. Con senzaOggi la stessa
// settimana senza la notte di oggi, per dire se la regola regge anche togliendo stanotte (regola 5.15).
function mediaSonno(m, k, senzaOggi = false) {
  const Z = S.sonno;
  const valori = [];
  const fino = senzaOggi ? k - 1 : k;
  for (let j = Math.max(0, k - Z.nottiMedia + 1); j <= fino; j++) if (m.giorni[j].sonno) valori.push(m.giorni[j].sonno / ORA);
  return valori.length >= Z.nottiMediaMinime ? media(valori) : null;
}

// Il sonno, con le ore del dispositivo e senza correzioni fuori dalla modalità evento (regola 5.8).
function voceSonno(m, k, s, c) {
  const Z = S.sonno;
  const g = m.giorni[k];
  const ore = g.sonno ? g.sonno / ORA : null;
  const punteggio = g.punteggioSonno;
  if (ore === null && !punteggio) return voce("sonno", { testo: testoMancante(m, "sonno") });
  let punti = 0;
  let motivo = null;
  let piuNotti = false;
  if (ore !== null) {
    const prima = m.giorni[k - 1];
    const dueNotti = ore < Z.ore1 && Boolean(prima && prima.sonno) && prima.sonno / ORA < Z.ore1;
    const media7 = mediaSonno(m, k);
    const settimana = media7 !== null && media7 < Z.mediaOre;
    const solito = medianaSonno(m, k, c.escluso);
    const sottoSolito = solito !== null && (solito - ore) * 60 > Z.minutiSottoMediana;
    if (ore < Z.ore2) { punti = 2; motivo = dueNotti ? "dueNotti" : "moltoPoco"; }
    else if (dueNotti) { punti = 2; motivo = "dueNotti"; }
    else if (ore < Z.ore1) { punti = 1; motivo = "poco"; }
    else if (sottoSolito) { punti = 1; motivo = "sottoSolito"; }
    else if (settimana) { punti = 1; motivo = "settimana"; }
    // La media della settimana guarda più notti solo se resta bassa anche senza stanotte, altrimenti
    // una notte storta da sola farebbe la concordanza (regola 5.15).
    const mediaPrima = mediaSonno(m, k, true);
    const settimanaPrima = mediaPrima !== null && mediaPrima < Z.mediaOre;
    piuNotti = punti > 0 && (dueNotti || (settimana && settimanaPrima));
  }
  const daOre = punti > 0;
  if (!punti && punteggio && punteggio < Z.punteggio) { punti = 1; motivo = "punteggio"; }
  if (s.cause.length) punti = Math.min(punti, 1);
  let testo;
  if (motivo) testo = VOCI.sonno[motivo];
  else testo = ore !== null ? VOCI.sonno.bene(Math.round(ore * 60)) : VOCI.sonno.soloPunteggio;
  return voce("sonno", { attiva: true, punti, piuNotti, testo, lettura: { ore, punteggio, motivo, daOre } });
}

// Il battito alto di una notte, con la base di quel giorno: almeno 3 sopra la mediana e 2 DS.
function battitoAlto(m, k, c) {
  if (k < 0) return false;
  const g = m.giorni[k];
  if (!g || !g.fc) return false;
  const b = baseFc(m.giorni, k, c.escluso);
  if (!b.ok) return false;
  const d = g.fc - b.centro;
  return d >= S.battito.sopra && d / b.ds >= S.battito.z;
}

function voceFc(m, k, s, c) {
  const B = S.battito;
  const g = m.giorni[k];
  if (!g.fc) return voce("fc", { testo: testoMancante(m, "fc") });
  const base = baseFc(m.giorni, k, c.escluso);
  if (!base.ok) return voce("fc", { testo: VOCI.fc.impara(base.n), lettura: { fc: g.fc, base } });
  const d = g.fc - base.centro;
  const z = d / base.ds;
  const alto = d >= B.sopra && z >= B.z;
  const altoIeri = battitoAlto(m, k - 1, c);
  let punti = alto ? 1 : 0;
  if ((d >= B.sopraForte && z >= B.z) || (alto && altoIeri)) punti = 2;
  const piuNotti = alto && altoIeri;
  if (base.stato === "provvisoria") punti = Math.min(punti, 1);
  if (s.cause.length) punti = Math.min(punti, 1);
  const lettura = { fc: g.fc, d, z, base, alto, altoIeri };
  if (s.evento) return voce("fc", { attiva: true, lettura, pallino: "grigio", testo: VOCI.viaggio });
  if (s.senzaPuntiNotte) return voce("fc", { attiva: true, lettura, pallino: "grigio", testo: VOCI.guardiaNotte });
  let testo = VOCI.fc.normale(Math.round(g.fc), Math.round(base.centro));
  if (punti >= 2) testo = piuNotti ? VOCI.fc.due : VOCI.fc.moltoAlto;
  else if (punti) testo = VOCI.fc.uno;
  return voce("fc", { attiva: true, punti, piuNotti, lettura, testo });
}

// La media dei ln delle notti valide degli ultimi 7 giorni, oggi compreso, se sono almeno 3, in DS.
// Con senzaOggi la stessa media senza la notte di oggi, per la concordanza (regola 5.15).
function zMedia(m, k, base, senzaOggi = false) {
  const H = S.hrv;
  const valori = [];
  const fino = senzaOggi ? k - 1 : k;
  for (let j = Math.max(0, k - H.nottiMedia + 1); j <= fino; j++) {
    if (notteValida(m.giorni[j])) valori.push(Math.log(m.giorni[j].hrv));
  }
  return valori.length >= H.nottiMediaMinime ? (media(valori) - base.centro) / base.ds : null;
}

function zMediaIl(m, k, c) {
  if (k < 0) return null;
  const base = baseHrv(m.giorni, k, c.dispositivo, c.escluso);
  return base.ok ? zMedia(m, k, base) : null;
}

// Il calo atteso. Ieri un carico nel 20% più alto dei giorni con carico degli ultimi 90, con almeno
// 5 giorni, oppure un'uscita di oltre 4 ore (regola 5.6).
function caloAtteso(m, k) {
  const A = S.caloAtteso;
  const ieri = m.giorni[k - 1];
  if (!ieri) return false;
  const carichi = [];
  for (let j = Math.max(0, k - A.giorni); j <= k - 1; j++) {
    const x = m.giorni[j].carico;
    if (x > 0) carichi.push(x);
  }
  // Ieri compreso, e a pari carico conta contro, così con i giorni tutti uguali il calo non è atteso.
  if (carichi.length >= A.giorniMinimi && ieri.carico > 0) {
    const almeno = carichi.filter((x) => x >= ieri.carico).length;
    if (almeno <= A.quotaAlta * carichi.length) return true;
  }
  return (m.uscite || []).some((u) => u.d === ieri.d && TIPI_BICI.has(u.tipo) && u.secondi > A.uscitaOltreOre * ORA);
}

function voceHrv(m, k, s, c, altre) {
  const H = S.hrv;
  const g = m.giorni[k];
  if (!g.hrv) return voce("hrv", { testo: testoMancante(m, "hrv") });
  if (!notteValida(g)) return voce("hrv", { testo: VOCI.hrv.corta });
  const base = baseHrv(m.giorni, k, c.dispositivo, c.escluso);
  if (!base.ok) return voce("hrv", { testo: VOCI.hrv.impara(base.n), lettura: { base } });
  const zNotte = (Math.log(g.hrv) - base.centro) / base.ds;
  const z7 = zMedia(m, k, base);
  const z7Prima = zMedia(m, k, base, true);
  const mediaBassa = z7 !== null && z7 < H.mediaBassa;
  // La media bassa da 3 mattine di fila, cioè oggi e le mattineDiFila − 1 mattine prima.
  const mattinePrima = Array.from({ length: Math.max(0, H.mattineDiFila - 1) }, (_, j) => j + 1);
  const treMattine = mediaBassa && mattinePrima.every((j) => {
    const z = zMediaIl(m, k - j, c);
    return z !== null && z < H.mediaBassa;
  });
  const calo = caloAtteso(m, k);
  const fc = altre.fc.lettura && typeof altre.fc.lettura.d === "number" ? altre.fc.lettura : null;
  const saturazione = Boolean(fc && fc.base.centro < S.saturazione.battitoSotto
    && zNotte < -S.saturazione.ds && fc.z < -S.saturazione.ds);
  const sospesaCalo = calo && zNotte >= S.caloAtteso.notteDa && zNotte < S.caloAtteso.notteA;

  let punti = 0;
  let motivo = null;
  let nonMigliorabile = false;
  // La media di 7 notti conta anche con il calo atteso, la saturazione toglie solo il calo della notte.
  if (mediaBassa || (zNotte < H.notteBassa && !sospesaCalo && !saturazione)) { punti = 1; motivo = "uno"; }
  const combinata = treMattine && zNotte < H.notteBassa && !saturazione;
  if (combinata || (zNotte < H.notteMoltoBassa && !saturazione)) { punti = 2; motivo = combinata ? "due" : "moltoBassa"; }

  // La coda alta (regola 5.5). Mai il verde come premio.
  const mediaAlta = z7 !== null && z7 > H.mediaAlta;
  if (!punti && mediaAlta) {
    const fatica = altre.energia.valore === S.domande.energiaPoca
      || altre.gambe.valore >= S.domande.gambeIndolenzite || altre.carico.punti >= 1;
    const battitoBasso = Boolean(fc && fc.d <= -H.altaBattitoSotto && fc.z <= -H.altaBattitoZ);
    if (fatica && battitoBasso) { punti = 1; motivo = "altaFatica"; }
  }
  const insolita = zNotte > H.notteInsolita && (!fc || fc.d >= 0);
  if (!punti && (c.eta >= H.altaDaAnni || c.aritmia) && zNotte > H.notteAltaEtaOAritmia) {
    punti = 1;
    motivo = "altaEta";
    nonMigliorabile = true;
  }
  // I punti che vengono dalla media di 7 notti guardano più notti, e valgono per la concordanza, solo se
  // la media resta oltre la soglia anche senza stanotte. Una notte storta da sola sposta la media e non
  // deve bastare (regola 5.15, 9.5 «Senza concordanza»). La media bassa da 3 mattine guarda già le
  // mattine di prima, che stanotte non la contengono.
  const mediaBassaPrima = z7Prima !== null && z7Prima < H.mediaBassa;
  const mediaAltaPrima = z7Prima !== null && z7Prima > H.mediaAlta;
  const piuNotti = punti > 0 && ((mediaBassa && mediaBassaPrima) || combinata || (motivo === "altaFatica" && mediaAltaPrima));
  if (base.stato === "provvisoria") punti = Math.min(punti, 1);
  if (s.cause.length) punti = Math.min(punti, 1);
  const lettura = { base, zNotte, z7, z7Prima, treMattine, calo, sospesaCalo, saturazione, mediaAlta, insolita };
  if (s.evento) return voce("hrv", { attiva: true, lettura, pallino: "grigio", testo: VOCI.viaggio });
  if (s.senzaPuntiNotte) return voce("hrv", { attiva: true, lettura, pallino: "grigio", testo: VOCI.guardiaNotte });

  let testo = VOCI.hrv.normale;
  let pallino = null;
  if (punti >= 2) testo = motivo === "due" ? VOCI.hrv.due : VOCI.hrv.moltoBassa;
  else if (punti) testo = motivo === "altaFatica" ? VOCI.hrv.altaFatica : motivo === "altaEta" ? VOCI.hrv.altaEta : VOCI.hrv.uno;
  else if (sospesaCalo) testo = VOCI.hrv.calo;
  else if (saturazione && zNotte < H.notteBassa) testo = VOCI.hrv.saturazione;
  else if (insolita) { testo = VOCI.hrv.insolita; pallino = "grigio"; }
  else if (mediaAlta) { testo = VOCI.hrv.sopra; pallino = "grigio"; }
  return voce("hrv", { attiva: true, punti, piuNotti, nonMigliorabile, lettura, testo, pallino });
}

// Tutte le voci di un giorno, nell'ordine che serve ai calcoli. Per ieri servono a dire se una voce
// aveva punti anche ieri mattina (la concordanza).
function vociDelGiorno(m, k, c) {
  const s = situazione(m, c, k);
  const domande = vociDomande(m, k, s);
  const carico = voceCarico(m, k, s, c);
  const sonno = voceSonno(m, k, s, c);
  const fc = voceFc(m, k, s, c);
  const hrv = voceHrv(m, k, s, c, { ...domande, carico, fc });
  return { ...domande, sonno, fc, hrv, carico, s };
}

function vociDiOggi(m, contesto) {
  return vociDelGiorno(m, ultimo(m), risolvi(m, contesto));
}

// Le funzioni dei punti restituiscono { chiave, punti, forte, piuNotti, testo, pallino } e in più
// nome, attiva e lettura (i numeri da cui vengono). puntiDomande dà le tre voci, energia, gambe e acciacchi.
export function puntiHrv(m, contesto = {}) { return vociDiOggi(m, contesto).hrv; }
export function puntiFc(m, contesto = {}) { return vociDiOggi(m, contesto).fc; }
export function puntiSonno(m, contesto = {}) { return vociDiOggi(m, contesto).sonno; }
export function puntiCarico(m, contesto = {}) { return vociDiOggi(m, contesto).carico; }
export function puntiDomande(m, contesto = {}) {
  const v = vociDiOggi(m, contesto);
  return [v.energia, v.gambe, v.acciacchi];
}

// --- Stop, malattia e rientro (4.4) ---

// Il primo stop di oggi, con la sua origine. Un sintomo di cuore dei giorni prima ferma ancora, finché
// la persona non dice di aver sentito il medico (statoCuore). Con senzaDoloreSospeso il dolore che
// aspetta la risposta sulla pedalata non conta, così si vede se resta uno stop comunque.
function trovaStop(v, sintomi, c, dia, { senzaDoloreSospeso = false } = {}) {
  const tutti = sintomi.cuore.length + sintomi.malattia.length + sintomi.collo.length;
  const fc = v.fc.lettura;
  const battito = tutti > 0 && Boolean(fc) && typeof fc.d === "number" && fc.d >= S.battito.stopMalattia;
  const doloreSospeso = v.acciacchi.stop === "dolore" && v.acciacchi.domanda === "pedalata";
  if (sintomi.cuore.length) return { tipo: "cuore", origine: "cuore" };
  if (c.cuore && c.cuore.aperto) return { tipo: "cuore", origine: "cuoreRiportato" };
  if (sintomi.malattia.length || dia.controllo === "si") return { tipo: "malattia", origine: "malattia" };
  if (battito) return { tipo: "malattia", origine: "battito" };
  if (c.malattia.inCorso) return { tipo: "malattia", origine: "malattiaRiportata" };
  if (v.acciacchi.stop === "infortunio") return { tipo: "infortunio", origine: "infortunio" };
  if ((v.acciacchi.stop === "dolore" && !(senzaDoloreSospeso && doloreSospeso)) || v.gambe.stop === "dolore") {
    return { tipo: "dolore", origine: "dolore" };
  }
  if (v.energia.stop === "pezzi") return { tipo: "pezzi", origine: "pezzi" };
  return { tipo: null, origine: null };
}

// Il tipo di stop di oggi («cuore», «malattia», «infortunio», «dolore», «pezzi») oppure null.
export function stop(m, contesto = {}) {
  const c = risolvi(m, contesto);
  const v = vociDelGiorno(m, ultimo(m), c);
  const dia = diarioDi(m, m.oggi);
  return trovaStop(v, sintomiDi(dia), c, dia).tipo;
}

// I giorni da guardare per malattia e cuore, uno per uno, dal primo segnato nel diario o nella storia
// fino a oggi, al massimo quanto la memoria li tiene (MEMORIA.giorni).
function giorniDaGuardare(diario, storia, oggi) {
  const limite = aggiungiGiorni(oggi, -MEMORIA.giorni);
  let primo = oggi;
  for (const d of [...Object.keys(diario || {}), ...Object.keys(storia || {})]) {
    if (DATA.test(d) && d >= limite && d < primo) primo = d;
  }
  const giorni = [];
  for (let d = primo; d <= oggi; d = aggiungiGiorni(d, 1)) giorni.push(d);
  return giorni;
}

// Il primo giorno, da da a oggi, in cui la persona ha segnato «Il medico mi ha detto che posso
// riprendere» (medicoSentito nel diario), oppure null.
function medicoSentitoDal(diario, da, oggi) {
  let primo = null;
  for (const [d, v] of Object.entries(diario || {})) {
    if (d >= da && d <= oggi && v && v.medicoSentito && (!primo || d < primo)) primo = d;
  }
  return primo;
}

// La malattia dal diario. Un episodio comincia con un sintomo di malattia, un sì alla domanda di
// controllo o uno stop dal battito, e finisce con «Non ho più febbre da 24 ore». Senza quella risposta
// lo stop resta fino a 14 giorni dall'ultimo sintomo, poi l'episodio si chiude il giorno dopo, e
// siccome la durata non si conosce vale come una malattia lunga (la lettura prudente).
// Dalla fine parte il rientro, al massimo Giallo per 4 giorni, 7 se la malattia è durata più di 7
// (regola 5.18). Una malattia lunga, o con la febbre e i sintomi al petto, prima di riprendere chiede
// il medico (regola 5.17). Allora il rientro aspetta (attesa) finché la persona non segna
// «Il medico mi ha detto che posso riprendere», e i suoi giorni contano da quella risposta.
export function statoMalattia(diario, storia, oggi) {
  const R = S.rientro;
  const chiusi = [];
  let aperto = null;
  for (const d of giorniDaGuardare(diario, storia, oggi)) {
    const v = (diario && diario[d]) || {};
    const r = (storia && storia[d]) || {};
    const sintomi = sintomiDi(v);
    const malato = sintomi.malattia.length > 0 || v.controllo === "si" || (r.stop === "malattia" && !r.riportato);
    if (aperto && !malato && giorniTra(aperto.ultimo, d) > R.malattiaRiportataGiorni) {
      chiusi.push({ ...aperto, fine: d, scaduto: true });
      aperto = null;
    }
    if (malato) {
      if (!aperto) aperto = { dal: d, ultimo: d, alPetto: false };
      aperto.ultimo = d;
      if (febbreAlPetto(sintomi)) aperto.alPetto = true;
    } else if (v.senzaFebbre) {
      chiusi.push(aperto ? { ...aperto, fine: d } : { dal: d, ultimo: d, fine: d, senzaInizio: true, alPetto: false });
      aperto = null;
    }
  }
  const giorni = new Set();
  for (const e of chiusi.concat(aperto ? [{ ...aperto, fine: oggi }] : [])) {
    if (e.senzaInizio) continue;
    for (let d = e.dal; d <= e.fine; d = aggiungiGiorni(d, 1)) giorni.add(d);
  }
  const durataDi = (e) => (e.scaduto ? null : e.senzaInizio ? 0 : giorniTra(e.dal, e.fine));
  const lunga = (e) => e.scaduto || durataDi(e) > R.malattiaLungaOltre;
  const conMedico = (e) => e.scaduto || durataDi(e) > S.medico.malattiaGiorni || e.alPetto;

  // Il medico che manca, dall'ultima malattia finita che lo chiedeva.
  const daVedere = chiusi.filter(conMedico);
  const ultimaConMedico = daVedere.length ? daVedere[daVedere.length - 1] : null;
  const sentito = ultimaConMedico ? medicoSentitoDal(diario, ultimaConMedico.fine, oggi) : null;
  const attesa = Boolean(ultimaConMedico && !sentito);

  const ultimoFinito = chiusi.length ? chiusi[chiusi.length - 1] : null;
  let rientro = null;
  let durata = null;
  let medico = attesa;
  if (aperto) {
    durata = giorniTra(aperto.dal, oggi);
    medico = medico || durata > S.medico.malattiaGiorni || aperto.alPetto;
  } else if (attesa) {
    durata = durataDi(ultimaConMedico);
    rientro = {
      giorno: giorniTra(ultimaConMedico.fine, oggi) + 1, giorni: R.giorniDopoMalattiaLunga,
      durata, dal: ultimaConMedico.fine, attesa: true,
    };
  } else if (ultimoFinito) {
    durata = durataDi(ultimoFinito);
    const quanti = lunga(ultimoFinito) ? R.giorniDopoMalattiaLunga : R.giorni;
    const dal = conMedico(ultimoFinito) ? medicoSentitoDal(diario, ultimoFinito.fine, oggi) : ultimoFinito.fine;
    const giorno = giorniTra(dal, oggi) + 1;
    if (giorno <= quanti) rientro = { giorno, giorni: quanti, durata, dal, attesa: false };
  }
  return {
    inCorso: Boolean(aperto),
    dal: aperto ? aperto.dal : null,
    durata,
    rientro,
    medico,
    attesa,
    ultimaFine: ultimoFinito ? ultimoFinito.fine : null,
    giorni: [...giorni].sort(),
  };
}

// Il cuore dal diario (regole 5.10 e 5.17). Un sintomo di cuore, compreso l'avviso di ritmo irregolare
// dell'orologio, apre un episodio che resta aperto, e Rosso, finché la persona non segna «Il medico mi
// ha detto che posso riprendere» in un giorno dopo l'ultimo sintomo. La specifica non dà una durata,
// e senza la risposta l'episodio non scade, la lettura prudente. Restituisce { aperto, dal, ultimo }.
export function statoCuore(diario, storia, oggi) {
  let dal = null;
  let ultimo = null;
  for (const d of giorniDaGuardare(diario, storia, oggi)) {
    const v = (diario && diario[d]) || {};
    const r = (storia && storia[d]) || {};
    if (sintomiDi(v).cuore.length || (r.stop === "cuore" && !r.riportato)) {
      if (!dal) dal = d;
      ultimo = d;
    } else if (dal && v.medicoSentito) {
      dal = null;
      ultimo = null;
    }
  }
  return { aperto: Boolean(dal), dal, ultimo };
}

// --- I giorni di guardia (4.6) ---

function classeGiorni(n) {
  const [uno, cinque, dieci] = PRONTEZZA.classiFinoA;
  const [a, b, c, d] = PRONTEZZA.classi;
  return n <= uno ? a : n <= cinque ? b : n <= dieci ? c : d;
}

function durataGuardia(f) {
  const G = S.guardia;
  if (f.tipo === "weekend") return G.weekendGiorni;
  if (f.tipo === "prova") return G.provaGiorni;
  if (f.tipo === "uscitaGrande") return G.uscitaGrandeGiorni;
  if (f.tipo === "blocco") return G.bloccoGiorni;
  return G.evento[classeGiorni(f.previsti || f.contati)];
}

// Le uscite grandi, almeno 5 ore oppure 1,5 volte la più lunga delle 4 settimane prima e almeno
// 3 ore, con le ore in bici di tutto il giorno (regola 8.8).
export function usciteGrandi(uscite, oggi) {
  const U = S.uscitaGrande;
  const ore = new Map();
  for (const u of uscite || []) {
    if (!u || !TIPI_BICI.has(u.tipo) || !u.secondi || !(u.d < oggi)) continue;
    ore.set(u.d, (ore.get(u.d) || 0) + u.secondi / ORA);
  }
  const grandi = [];
  for (const [d, h] of ore) {
    if (h < U.oreMinime) continue;
    let prima = 0;
    for (let k = 1; k <= U.settimane * 7; k++) prima = Math.max(prima, ore.get(aggiungiGiorni(d, -k)) || 0);
    if (h >= U.ore || h >= U.volte * prima) grandi.push(d);
  }
  return grandi.sort();
}

// --- I viaggi del diario (4.5) ---

// Un viaggio che nessuno chiude finisce da solo dopo 2 giorni di fila senza nessuna attività, così un
// «Sono arrivato» dimenticato non spegne le notti per settimane [stima nostra, prudente]. Restituisce
// il secondo giorno vuoto, che è l'ultimo della modalità evento, oppure null finché i 2 giorni vuoti
// non ci sono.
function fineDaSola(inizio, uscite, oggi) {
  const conAttivita = new Set((uscite || []).map((u) => u.d));
  let vuoti = 0;
  for (let d = inizio; d < oggi; d = aggiungiGiorni(d, 1)) {
    if (conAttivita.has(d)) { vuoti = 0; continue; }
    vuoti += 1;
    if (vuoti >= S.viaggio.giorniVuotiFine) return d;
  }
  return null;
}

// I viaggi segnati nel diario, dal più vecchio. «Sono in viaggio», «Sì, parto» e la proposta segnano
// il giorno d'inizio con inViaggio, «Sono arrivato» il giorno della fine con arrivato. Un viaggio
// finisce con «Sono arrivato», da solo dopo 2 giorni senza attività, dopo i giorni previsti più uno
// (eventoDiOggi), oppure il giorno prima del viaggio dopo. Così il viaggio si ritrova intero anche se
// l'app è rimasta chiusa qualche giorno, e la storia, che si scrive solo aprendo l'app, non serve.
// Per ognuno { inizio, fine, ultimoGiorno, tipo, giorni }. fine è il giorno dell'arrivo o l'ultimo con
// un'attività, ultimoGiorno l'ultimo in modalità evento, tutti e due null finché il viaggio è in corso.
export function viaggiDelDiario(diario, uscite, oggi) {
  const voce = (d) => {
    const v = diario && diario[d];
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  };
  const giorni = Object.keys(diario || {}).filter((d) => DATA.test(d) && d <= oggi && voce(d)).sort();
  const inizi = giorni.filter((d) => {
    const x = voce(d).inViaggio;
    return Boolean(x && typeof x === "object" && !Array.isArray(x));
  });
  return inizi.map((inizio, k) => {
    const prossimo = inizi[k + 1] || null;
    const dati = voce(inizio).inViaggio;
    const previsti = Number.isInteger(dati.giorni) && dati.giorni > 0 ? dati.giorni : null;
    const arrivo = giorni.find((d) => d >= inizio && (!prossimo || d < prossimo) && voce(d).arrivato) || null;
    let ultimoGiorno = arrivo || fineDaSola(inizio, uscite, prossimo && prossimo < oggi ? prossimo : oggi);
    const accorcia = (giorno) => { if (!ultimoGiorno || giorno < ultimoGiorno) ultimoGiorno = giorno; };
    if (previsti) {
      const tetto = aggiungiGiorni(inizio, previsti + S.viaggio.giorniInPiu - 1);
      if (tetto < oggi) accorcia(tetto);
    }
    if (prossimo && (!ultimoGiorno || ultimoGiorno >= prossimo)) accorcia(aggiungiGiorni(prossimo, -1));
    // La fine vera è l'arrivo, oppure l'ultimo giorno con un'attività prima che la modalità si spenga.
    let fine = null;
    if (ultimoGiorno) fine = arrivo && arrivo <= ultimoGiorno ? arrivo : ultimaAttivita(uscite, inizio, ultimoGiorno) || inizio;
    return { inizio, fine, ultimoGiorno, tipo: typeof dati.tipo === "string" ? dati.tipo : "viaggio", giorni: previsti };
  });
}

function ultimaAttivita(uscite, da, a) {
  let ultima = null;
  for (const u of uscite || []) if (u.d >= da && u.d <= a && (!ultima || u.d > ultima)) ultima = u.d;
  return ultima;
}

// I giorni passati in modalità evento, dai viaggi del diario e dalla storia. Le loro notti escono dalle
// basi (4.3) e le loro mattine non contano per il carico di 3 mattine. Oggi lo dice il contesto.
function giorniInEvento(viaggi, storia, oggi) {
  const giorni = new Set();
  const ieri = aggiungiGiorni(oggi, -1);
  for (const v of viaggi) {
    const fine = v.ultimoGiorno && v.ultimoGiorno < oggi ? v.ultimoGiorno : ieri;
    for (let d = v.inizio; d <= fine; d = aggiungiGiorni(d, 1)) giorni.add(d);
  }
  for (const [d, r] of Object.entries(storia || {})) if (r && r.evento) giorni.add(d);
  return giorni;
}

// Le fatiche volute già finite. I viaggi del diario, i giorni in modalità evento della storia, i
// weekend, le prove e i blocchi del piano e le uscite grandi. Nella storia ogni giorno in modalità
// evento dice il suo numero, così i giorni dello stesso viaggio si ritrovano anche con i buchi, e il
// viaggio conta i giorni dal primo all'ultimo.
function fatiche(storia, piano, uscite, oggi, viaggi = []) {
  const elenco = [];
  const dalDiario = [];
  for (const v of viaggi) {
    if (!v.fine || !v.ultimoGiorno || !(v.ultimoGiorno < oggi)) continue;
    dalDiario.push({ tipo: v.tipo, inizio: v.inizio, fine: v.fine, contati: giorniTra(v.inizio, v.fine) + 1, previsti: v.giorni, inEvento: true });
  }
  // I giorni dei viaggi del diario, anche di quello in corso, li conosce già il diario.
  const delDiario = (d) => viaggi.some((v) => d >= v.inizio && d <= (v.ultimoGiorno || oggi));
  const pezzi = new Map();
  for (const d of Object.keys(storia || {}).filter((x) => x < oggi && storia[x] && storia[x].evento).sort()) {
    if (delDiario(d)) continue;
    const e = storia[d].evento;
    const tipo = typeof e.tipo === "string" ? e.tipo : "viaggio";
    const n = Number.isInteger(e.giorno) && e.giorno > 0 ? e.giorno : 1;
    const inizio = aggiungiGiorni(d, 1 - n);
    const chiave = `${tipo} ${inizio}`;
    const p = pezzi.get(chiave) || { tipo, inizio, fine: d, previsti: null };
    if (d > p.fine) p.fine = d;
    if (numero(e.giorni)) p.previsti = e.giorni;
    pezzi.set(chiave, p);
  }
  // Due pezzi della storia che si toccano sono lo stesso viaggio.
  const uniti = [];
  for (const p of [...pezzi.values()].sort((a, b) => (a.inizio < b.inizio ? -1 : 1))) {
    const prima = uniti[uniti.length - 1];
    if (prima && prima.tipo === p.tipo && p.inizio <= aggiungiGiorni(prima.fine, 1)) {
      if (p.fine > prima.fine) prima.fine = p.fine;
      prima.previsti = prima.previsti || p.previsti;
    } else uniti.push({ ...p });
  }
  for (const v of dalDiario) elenco.push(v);
  for (const p of uniti) elenco.push({ ...p, contati: giorniTra(p.inizio, p.fine) + 1, inEvento: true });
  for (const f of lista(piano && piano.fatiche)) {
    if (!f || typeof f.inizio !== "string" || typeof f.fine !== "string" || !(f.fine < oggi)) continue;
    elenco.push({ tipo: f.tipo || "weekend", inizio: f.inizio, fine: f.fine, contati: giorniTra(f.inizio, f.fine) + 1, previsti: null, inEvento: false });
  }
  for (const d of usciteGrandi(uscite, oggi)) {
    elenco.push({ tipo: "uscitaGrande", inizio: d, fine: d, contati: 1, previsti: null, inEvento: false });
  }
  return elenco;
}

// opzioni { eta, sensazioniBasse, sopraIlCollo }. Con i soli sintomi sopra il collo il giro facile è
// quello di 4.4, al massimo un'ora, così nella carta c'è una durata sola (regola 5.10).
function testiDellaGuardia(g, opzioni = {}) {
  const nome = GUARDIA.nomi[g.tipo] || GUARDIA.nomi.viaggio;
  const G = PIANO.sedute.giroGiallo;
  const facile = opzioni.sopraIlCollo ? STO_MALE.sopraIlCollo : GUARDIA.fare.facile(G.minimo, G.massimo);
  let fare;
  if (g.tipo === "evento" || g.tipo === "viaggio") fare = GUARDIA.fare.evento;
  else if (g.tipo === "blocco") fare = facile;
  else if (g.giorno === 1) fare = GUARDIA.fare.primo;
  else fare = opzioni.eta >= S.guardia.riposoDaAnni || opzioni.sensazioniBasse ? GUARDIA.fare.riposo : facile;
  return {
    testo: GUARDIA.testo(g.giorno, nome, fare),
    perche: g.giorno <= NOTTI_DOPO ? GUARDIA.perche(nome) : GUARDIA.percheDopo(nome),
  };
}

// Il tetto e le esclusioni di oggi dopo le fatiche volute. Il tetto Giallo dura 2 giorni dopo un
// weekend, una prova o un'uscita grande, 3 dopo un blocco, 7, 10 o 14 dopo un evento o un viaggio.
// HRV e battito non danno punti per 72 ore, il carico per tutti i giorni del tetto.
// opzioni { eta, sensazioniBasse } cambiano solo il testo del secondo giorno. opzioni.diario, oppure
// opzioni.viaggi già pronti da viaggiDelDiario, danno i viaggi con inizio e fine veri.
export function giorniDiGuardia(storia, piano, uscite, oggi, opzioni = {}) {
  const viaggi = opzioni.viaggi || (opzioni.diario ? viaggiDelDiario(opzioni.diario, uscite, oggi) : []);
  const elenco = fatiche(storia, piano, uscite, oggi, viaggi);
  const notti = new Set();
  const carico = new Set();
  let principale = null;
  for (const f of elenco) {
    const giorni = durataGuardia(f);
    if (f.inEvento) {
      for (let d = f.inizio; d <= f.fine; d = aggiungiGiorni(d, 1)) { notti.add(d); carico.add(d); }
    }
    for (let k = 1; k <= Math.max(giorni, NOTTI_DOPO); k++) {
      const d = aggiungiGiorni(f.fine, k);
      if (k <= NOTTI_DOPO) notti.add(d);
      if (k <= giorni) carico.add(d);
    }
    const giorno = giorniTra(f.fine, oggi);
    if (giorno >= 1 && giorno <= giorni && (!principale || giorno < principale.giorno)) {
      principale = { tipo: f.tipo, inizio: f.inizio, fine: f.fine, giorno, giorni };
    }
  }
  const testi = principale ? testiDellaGuardia(principale, opzioni) : { testo: null, perche: null };
  const finoAOggi = (insieme) => [...insieme].filter((d) => d <= oggi).sort();
  return {
    attiva: Boolean(principale),
    tipo: principale ? principale.tipo : null,
    inizio: principale ? principale.inizio : null,
    fine: principale ? principale.fine : null,
    giorno: principale ? principale.giorno : null,
    giorni: principale ? principale.giorni : null,
    tetto: principale ? "giallo" : null,
    senzaPuntiNotte: notti.has(oggi),
    senzaPuntiCarico: carico.has(oggi),
    testo: testi.testo,
    perche: testi.perche,
    esclusioni: { notti: finoAOggi(notti), carico: finoAOggi(carico) },
    fatiche: elenco,
  };
}

// --- Quanto fidarsi (4.7) ---

// L'indice è il più basso fra carico e notte. Una parte che non vota non conta (null).
// profilo { fasciaCardio «si», «no» o «nonso», ftp } e, dentro valuta, il contesto con le esclusioni.
export function fiducia(m, profilo = m.profilo || {}, opzioni = {}) {
  const F = S.fiducia;
  const dispositivo = opzioni.dispositivo || profilo.dispositivo || S.dispositivoPredefinito;
  const cambio = opzioni.cambioDispositivo || profilo.cambioDispositivo || null;
  const escluso = opzioni.escluso || (() => false);
  const i = ultimo(m);

  let carico = null;
  let motivoCarico = null;
  const fitness = mattinoDi(m, i).ctl;
  if (fitness !== null && fitness >= S.carico.fitnessMinima) {
    const da = aggiungiGiorni(m.oggi, -F.giorni);
    const uscite = m.uscite || [];
    const recenti = uscite.filter((u) => u.d >= da && u.d < m.oggi && u.secondi > 0);
    const primo = uscite.reduce((min, u) => (min === null || u.d < min ? u.d : min), null);
    const ore = recenti.reduce((s, u) => s + u.secondi, 0);
    const senza = recenti.filter((u) => !(u.carico > 0) && !u.fcMedia && u.potenza !== true && !u.sforzo)
      .reduce((s, u) => s + u.secondi, 0);
    const conSensori = recenti.filter((u) => u.potenza === true || u.fcMedia || u.carico > 0).length;
    const conSforzo = recenti.filter((u) => u.sforzo).length;
    const conPotenza = recenti.some((u) => u.potenza === true);
    if (profilo.fasciaCardio === "no") { carico = "bassa"; motivoCarico = "polso"; }
    else if (primo === null || giorniTra(primo, m.oggi) < F.settimane * 7) { carico = "bassa"; motivoCarico = "storia"; }
    else if (ore > 0 && senza / ore > F.quotaSenzaDati) { carico = "bassa"; motivoCarico = "dati"; }
    else if (profilo.ftp && conPotenza && recenti.length && conSensori / recenti.length >= F.quotaAlta) {
      carico = "alta";
      motivoCarico = "alta";
    } else {
      // Il motivo dice la fonte solo quando la conosce. Con la potenza ma senza la soglia letta resta
      // media, e la riga non parla di battito.
      carico = "media";
      if (conPotenza) motivoCarico = "potenza";
      else if (recenti.length && conSforzo / recenti.length >= F.quotaAlta) motivoCarico = "sforzo";
      else if (recenti.some((u) => u.fcMedia)) motivoCarico = "battito";
      else motivoCarico = "sensori";
    }
  }

  let notte = null;
  let motivoNotte = null;
  if (!m.notteMaiArrivata) {
    const g = m.giorni[i];
    const conHrv = m.giorni.some((x) => x.hrv);
    const conFc = m.giorni.some((x) => x.fc);
    const bh = baseHrv(m.giorni, i, dispositivo, escluso);
    const bf = baseFc(m.giorni, i, escluso);
    const nonNotturno = conFc && m.fonteFc !== "sonno" && dispositivo === S.battitoNonNotturno;
    const imposta = (livello, motivo) => { notte = livello; motivoNotte = motivo; };
    if (cambio && giorniTra(cambio, m.oggi) < S.dispositivo.nottiTaratura) imposta("bassa", "dispositivo");
    else if (conHrv) {
      if (!notteValida(g)) imposta("bassa", "notte");
      else if (bh.stato === "taratura" || (conFc && bf.stato === "taratura")) imposta("bassa", "taratura");
      else if (bh.stato === "provvisoria" || (conFc && bf.stato === "provvisoria")) imposta("media", "provvisoria");
      else if (nonNotturno) imposta("media", "nonNotturno");
      else imposta("alta", "alta");
    } else if (conFc) {
      if (!g.fc) imposta("bassa", "notte");
      else if (bf.stato === "taratura") imposta("bassa", "taratura");
      else if (bf.stato === "provvisoria") imposta("media", "provvisoria");
      else if (nonNotturno) imposta("media", "nonNotturno");
      else imposta("alta", "alta");
    }
  }

  const parti = [carico, notte].filter(Boolean);
  const indice = !parti.length ? null : parti.includes("bassa") ? "bassa" : parti.includes("media") ? "media" : "alta";
  const righe = [];
  if (carico) righe.push(FIDUCIA.carico[motivoCarico]);
  if (notte) righe.push(FIDUCIA.notte[motivoNotte]);
  const basse = [];
  if (carico === "bassa") basse.push(FIDUCIA.carico[motivoCarico]);
  if (notte === "bassa") basse.push(FIDUCIA.notte[motivoNotte]);
  return {
    carico,
    notte,
    indice,
    motivi: { carico: motivoCarico, notte: motivoNotte },
    righe,
    accanto: indice === "bassa",
    testo: basse.length ? `${basse.join(" ")} ${FIDUCIA.risposte}` : null,
  };
}

// --- La modalità evento (4.5) ---

// La modalità evento di oggi da quello che la pagina salva con «Sono in viaggio» o con «Sì, parto».
// viaggio { inizio, fine, tipo, giorni }. Resta accesa per G giorni più uno, o fino a «Sono arrivato».
export function eventoDiOggi(viaggio, oggi) {
  if (!viaggio || typeof viaggio.inizio !== "string" || viaggio.inizio > oggi) return null;
  if (typeof viaggio.fine === "string" && viaggio.fine < oggi) return null;
  const giorno = giorniTra(viaggio.inizio, oggi) + 1;
  const giorni = numero(viaggio.giorni);
  if (giorni && giorno > giorni + S.viaggio.giorniInPiu) return null;
  return { tipo: typeof viaggio.tipo === "string" ? viaggio.tipo : "viaggio", giorno, giorni };
}

// Un giorno dentro un viaggio del diario, da inViaggio all'ultimo giorno in modalità evento, oppure
// fino a oggi se il viaggio è in corso.
function dentroUnViaggio(viaggi, d, oggi) {
  return lista(viaggi).some((v) => d >= v.inizio && d <= (v.ultimoGiorno || oggi));
}

// La proposta automatica. Ieri e l'altro ieri almeno 0,5 × H di bici, o almeno 4 ore senza un
// obiettivo, e nessuno dei due giorni dentro un viaggio già segnato nel diario (viaggiDelDiario),
// così il mattino dopo «Sono arrivato» non si propone lo stesso viaggio. Fuori dal piano, e questo lo
// guarda la pagina.
export function propostaViaggio(uscite, oggi, oreH = null, viaggi = []) {
  const V = S.viaggio;
  const soglia = numero(oreH) ? V.propostaQuotaH * oreH : V.propostaOre;
  for (let j = 1; j <= V.propostaGiorni; j++) {
    const d = aggiungiGiorni(oggi, -j);
    if (dentroUnViaggio(viaggi, d, oggi) || oreBiciDelGiorno(uscite, d) < soglia) return false;
  }
  return true;
}

// Il giorno da cui comincia il viaggio con il «Sì» alla proposta, il primo dei giorni lunghi di fila
// fuori dai viaggi del diario, oppure null senza proposta.
export function inizioProposta(uscite, oggi, oreH = null, viaggi = []) {
  if (!propostaViaggio(uscite, oggi, oreH, viaggi)) return null;
  const V = S.viaggio;
  const soglia = numero(oreH) ? V.propostaQuotaH * oreH : V.propostaOre;
  let inizio = aggiungiGiorni(oggi, -V.propostaGiorni);
  for (let k = 0; k < GIORNI_USCITE; k++) {
    const prima = aggiungiGiorni(inizio, -1);
    if (dentroUnViaggio(viaggi, prima, oggi) || oreBiciDelGiorno(uscite, prima) < soglia) break;
    inizio = prima;
  }
  return inizio;
}

// La mattina del giorno 1 di un weekend, di una prova o di un blocco. Si parte con Verde o Giallo
// leggero, il blocco solo con il Verde. Altrimenti si sposta o salta (regola 9.3).
export function partenza(livello, tipo) {
  const parte = tipo === "blocco" ? livello === "verde" : GRAVITA[livello] !== undefined && GRAVITA[livello] <= 1;
  return { parte, sposta: !parte };
}

// Il sonno vero in minuti. Le ore del dispositivo meno 45 minuti con orologi e «non so», uguali con
// anelli e fasce. Senza dispositivo la risposta a «Quanto hai dormito davvero?» (regola 3.10).
function sonnoVero(m, c, k, risposte) {
  const V = S.viaggio;
  const g = m.giorni[k];
  if (g && g.sonno) {
    const classe = S.dispositivi[c.dispositivo] || S.dispositivi[S.dispositivoPredefinito];
    return Math.round(g.sonno / 60) - (classe === "polso" ? V.sonnoOrologioMinuti : 0);
  }
  const ore = risposte && typeof risposte.sonno === "string" ? V.sonnoRisposte[risposte.sonno] : undefined;
  return typeof ore === "number" ? ore * 60 : null;
}

function rispostePrima(m, k) {
  const v = diarioDi(m, m.giorni[k].d).viaggio;
  return v && typeof v === "object" ? { ...v, problemi: problemiDi(v) } : {};
}

const PRIORITA_VIAGGIO = ["gonfiore", "collo", "sonno", "stomaco", "mani", "sedere", "ginocchia", "energia"];

// La risposta a una casella di «Qualcosa non va?», come riga del «Perché».
function rigaProblema(id, scelta) {
  const casella = VIAGGIO.domande.problemi.caselle.find((x) => x.id === id);
  const opzione = casella && (casella.scelte || []).find((x) => x.id === scelta);
  return `${opzione ? opzione.testo : casella ? casella.testo : id}.`;
}

// Le caselle di «Qualcosa non va?». Una casella spuntata senza la scelta sotto (true) vale come la
// scelta più grave, l'ultima della lista, la lettura prudente.
function problemiDi(risposte) {
  const grezzi = risposte && risposte.problemi && typeof risposte.problemi === "object" ? risposte.problemi : {};
  const p = {};
  for (const casella of VIAGGIO.domande.problemi.caselle) {
    const x = grezzi[casella.id];
    if (!x) continue;
    p[casella.id] = x === true && casella.scelte ? casella.scelte[casella.scelte.length - 1].id : x;
  }
  return p;
}

function viaggioInterno(m, risposte, c, vOggi) {
  const V = S.viaggio;
  const i = ultimo(m);
  const r = risposte && typeof risposte === "object" ? risposte : {};
  const p = problemiDi(r);
  const segnali = [];
  const consigli = [];
  const segnala = (chiave, livello, testo, perche, extra = {}) => segnali.push({ chiave, livello, testo, perche, ...extra });

  const energia = numero(r.energia) ?? m.giorni[i].fatica ?? null;
  if (energia === 4) segnala("energia", "rosso", STOP.pezzi, VOCI.energia.pezzi, { stop: "pezzi" });
  else if (energia === S.domande.energiaPoca) segnala("energia", "giallo", VIAGGIO.esiti.giallo, VOCI.energia.uno);

  const sonno = sonnoVero(m, c, i, r);
  let corte = 0;
  for (let k = i; k >= 0 && corte < V.nottiRosso; k--) {
    const minuti = sonnoVero(m, c, k, k === i ? r : rispostePrima(m, k));
    if (minuti !== null && minuti < V.sonnoCortoOre * 60) corte += 1;
    else break;
  }
  if (p.addormentato) segnala("sonno", "rosso", VIAGGIO.esiti.sonno, rigaProblema("addormentato"));
  else if (corte >= V.nottiRosso) segnala("sonno", "rosso", VIAGGIO.esiti.sonno, VIAGGIO.sonnoCorto(corte));
  else if (corte >= V.nottiGiallo) segnala("sonno", "giallo", VIAGGIO.esiti.giallo, VIAGGIO.sonnoCorto(corte));

  if (p.mani === "deboli") segnala("mani", "rosso", VIAGGIO.esiti.mani, rigaProblema("mani", p.mani), { medico: true });
  else if (p.mani === "formicolano") {
    segnala("mani", "giallo", VIAGGIO.esiti.giallo, rigaProblema("mani", p.mani));
    consigli.push(VIAGGIO.consigli.mani);
  }
  if (p.sedere === "genitali") segnala("sedere", "rosso", VIAGGIO.esiti.sedere, rigaProblema("sedere", p.sedere), { medico: true });
  else if (p.sedere === "fastidio") consigli.push(VIAGGIO.consigli.sedere);
  if (p.collo === "testa") segnala("collo", "rosso", VIAGGIO.esiti.collo, rigaProblema("collo", p.collo), { fermaBici: true });
  else if (p.collo === "male") consigli.push(VIAGGIO.consigli.collo);
  if (p.ginocchia === "dolore") segnala("ginocchia", "rosso", STOP.dolore, rigaProblema("ginocchia", p.ginocchia), { stop: "dolore" });
  else if (p.ginocchia === "fastidio") consigli.push(VIAGGIO.consigli.ginocchia);
  if (p.stomaco === "vomito") segnala("stomaco", "rosso", VIAGGIO.esiti.stomaco, rigaProblema("stomaco", p.stomaco));
  else if (p.stomaco === "nausea") {
    segnala("stomaco", "giallo", VIAGGIO.esiti.giallo, rigaProblema("stomaco", p.stomaco));
    consigli.push(VIAGGIO.consigli.stomaco);
  }
  if (p.gonfiore === "sintomi") segnala("gonfiore", "rosso", VIAGGIO.esiti.gonfiore, rigaProblema("gonfiore", p.gonfiore), { medico: true });
  else if (p.gonfiore === "piuDiIeri") {
    consigli.push(VIAGGIO.consigli.gonfiore);
    let mattine = 1;
    for (let k = i - 1; k >= 0 && mattine < V.gonfioreMattine; k--) {
      const prima = rispostePrima(m, k).problemi;
      if (prima && prima.gonfiore) mattine += 1;
      else break;
    }
    if (mattine >= V.gonfioreMattine) segnala("gonfiore", "giallo", VIAGGIO.esiti.giallo, rigaProblema("gonfiore", p.gonfiore));
  }

  const rossi = segnali.filter((x) => x.livello === "rosso")
    .sort((a, b) => PRIORITA_VIAGGIO.indexOf(a.chiave) - PRIORITA_VIAGGIO.indexOf(b.chiave));
  const gialli = segnali.filter((x) => x.livello === "giallo")
    .sort((a, b) => PRIORITA_VIAGGIO.indexOf(a.chiave) - PRIORITA_VIAGGIO.indexOf(b.chiave));
  const livello = rossi.length ? "rosso" : gialli.length ? "giallo" : "verde";
  const principale = rossi[0] || gialli[0] || null;
  const consiglio = rossi.length ? rossi[0].testo : livello === "giallo" ? VIAGGIO.esiti.giallo : VIAGGIO.esiti.verde;

  // Le righe del «Perché». HRV, battito e carico restano visibili e non contano.
  const pesa = (chiave) => segnali.some((x) => x.chiave === chiave);
  const voci = [];
  const testoEnergia = !energia ? VOCI.energia.senza : energia === 4 ? VOCI.energia.pezzi
    : energia === S.domande.energiaPoca ? VOCI.energia.uno : energia === 1 ? VOCI.energia.tanta : VOCI.energia.normale;
  voci.push(voce("energia", {
    attiva: Boolean(energia), valore: energia, testo: testoEnergia, esito: energia ? null : "daRispondere",
    pallino: !energia ? "grigio" : pesa("energia") ? "giallo" : "verde",
  }));
  voci.push(voce("sonno", {
    attiva: sonno !== null,
    testo: sonno === null ? VIAGGIO.sonnoSenza : corte ? VIAGGIO.sonnoCorto(corte) : VIAGGIO.sonno(sonno),
    pallino: sonno === null && !p.addormentato ? "grigio" : pesa("sonno") ? "giallo" : "verde",
    esito: sonno === null && !p.addormentato ? "daRispondere" : null,
    lettura: { minuti: sonno, nottiCorte: corte },
  }));
  for (const casella of VIAGGIO.domande.problemi.caselle) {
    const scelta = p[casella.id];
    if (!scelta || casella.id === "niente" || casella.id === "addormentato") continue;
    voci.push({
      chiave: casella.id, nome: casella.testo, punti: 0, forte: false, piuNotti: false, attiva: true,
      testo: rigaProblema(casella.id, scelta), pallino: pesa(casella.id) ? "giallo" : "grigio", lettura: null,
    });
  }
  if (vOggi) voci.push(vOggi.fc, vOggi.hrv, vOggi.carico);

  return {
    livello,
    colore: LIVELLI[livello].colore,
    titolo: LIVELLI[livello].titolo,
    consiglio,
    stop: principale && principale.stop ? principale.stop : null,
    segnali,
    consigli,
    promemoria: VIAGGIO.promemoria,
    medico: segnali.some((x) => x.medico),
    fermaBici: segnali.some((x) => x.fermaBici),
    taglio: livello === "giallo" ? V.taglioGiallo : null,
    sonnoVero: sonno,
    nottiCorte: corte,
    domandaSonno: !m.giorni[i].sonno && !r.sonno,
    perche: principale ? principale.perche : PERCHE.nessuno,
    nota: VIAGGIO.notte,
    voci,
  };
}

// L'esito del mattino in viaggio (4.5). risposteViaggio { energia 1-4, sonno «bene», «poco» o
// «pochissimo», problemi { mani, sedere, collo, ginocchia, stomaco, gonfiore, addormentato } }, con
// le scelte di VIAGGIO.domande in js/testi.js. Le mattine prima si leggono dal diario.
export function valutaInViaggio(m, risposteViaggio = {}, contesto = {}) {
  const c = risolvi(m, { ...contesto, evento: contesto.evento || { tipo: "viaggio", giorno: 1, giorni: null } });
  return viaggioInterno(m, risposteViaggio, c, vociDelGiorno(m, ultimo(m), c));
}

// --- I controlli che guardano più giorni ---

// Rosso con il carico molto alto da 3 mattine di fila, fuori dalla modalità evento e dai giorni di
// guardia, che azzerano il conto. Mai con la fiducia del carico bassa (regole 1.8 e 5.12).
function caricoTreMattine(m, c, caricoOggi) {
  for (let j = 0; j < S.carico.mattineMoltoAlto; j++) {
    const k = ultimo(m) - j;
    if (k < 1) return false;
    const v = j === 0 ? caricoOggi : voceCarico(m, k, situazione(m, c, k), c);
    if (v.punti < 2) return false;
  }
  return true;
}

function datiSufficienti(v) {
  return v.hrv.attiva || v.fc.attiva || v.carico.attiva;
}

// Il cambio di dispositivo. La mediana delle ultime 7 notti lontana più di 2,5 DS dalle 28 prima,
// per 3 mattine di fila, senza caselle (regola 10.4). Vale per l'HRV e per il battito.
function saltoDispositivo(m, c) {
  const X = S.dispositivo;
  if (c.cambioDispositivo && giorniTra(c.cambioDispositivo, m.oggi) < X.nottiRecenti + X.nottiPrima) return false;
  const i = ultimo(m);
  const serie = [
    { valore: (g) => (notteValida(g) ? Math.log(g.hrv) : null), minima: dsMinimaHrv(c.dispositivo) },
    { valore: (g) => g.fc || null, minima: S.battito.dsMinima },
  ];
  const raccogli = (valore, da, a) => {
    const valori = [];
    for (let t = Math.max(0, da); t <= a; t++) {
      const g = m.giorni[t];
      if (!c.escluso(g)) {
        const x = valore(g);
        if (x !== null) valori.push(x);
      }
    }
    return valori;
  };
  return serie.some(({ valore, minima }) => {
    for (let j = 0; j < X.mattine; j++) {
      const k = i - j;
      const recenti = raccogli(valore, k - X.nottiRecenti + 1, k);
      const prima = raccogli(valore, k - X.nottiRecenti - X.nottiPrima + 1, k - X.nottiRecenti);
      if (recenti.length < X.nottiRecentiMinime || prima.length < X.nottiPrimaMinime) return false;
      const centro = mediana(prima);
      const ds = Math.max(S.hrv.madInDs * deviazioneMediana(prima, centro), minima);
      if (Math.abs(mediana(recenti) - centro) <= X.salto * ds) return false;
    }
    return true;
  });
}

// Il battito almeno 5 sopra la mediana da 3 notti, con stanchezza e senza spiegazione (regola 5.17).
// Spiegano il battito alto le caselle delle cause, la modalità evento e le 72 ore dopo le fatiche
// volute, come in situazione, e allora l'invito non parte.
function battitoAltoTreNotti(m, c, v) {
  const M = S.medico;
  if (!(v.energia.valore >= S.domande.energiaPoca)) return false;
  for (let j = 0; j < M.battitoNotti; j++) {
    const k = ultimo(m) - j;
    if (k < 0) return false;
    const g = m.giorni[k];
    const s = situazione(m, c, k);
    if (!g.fc || s.cause.length || s.evento || s.senzaPuntiNotte) return false;
    const b = baseFc(m.giorni, k, c.escluso);
    if (!b.ok || g.fc - b.centro < M.battitoSopra) return false;
  }
  return true;
}

// Quando mandare dal medico (4.9). Ogni invito ha la sua chiave e il suo quando. «Prima di riprendere»
// vale per tutto l'episodio di cuore (statoCuore), che comprende l'avviso di ritmo irregolare, le
// palpitazioni ripetute e i sintomi al petto dopo un virus, per la febbre con i sintomi al petto e per
// la malattia lunga, finché la persona non dice di aver sentito il medico.
function medicoDelGiorno(m, c, v, sintomi) {
  const M = S.medico;
  const elenco = [];
  const aggiungi = (chiave, quando, testo) => {
    if (!elenco.some((x) => x.chiave === chiave)) elenco.push({ chiave, quando, testo });
  };
  if (sintomi.cuore.length) aggiungi("cuore", "subito", MEDICO.subito);
  const attesa = Boolean(c.rientro && c.rientro.attesa);
  if (sintomi.cuore.length || (c.cuore && c.cuore.aperto) || febbreAlPetto(sintomi) || c.malattia.medico || attesa) {
    aggiungi("riprendere", "primaDiRiprendere", MEDICO.primaDiRiprendere);
  }
  if (battitoAltoTreNotti(m, c, v)) aggiungi("battito", "presto", MEDICO.presto);
  if (c.eta >= M.daAnni && c.giorniEvento >= M.viaggioDaGiorni && c.giorniPartenza > 0 && c.giorniPartenza <= M.settimanePrima * 7) {
    aggiungi("viaggioLungo", "primaDiPartire", MEDICO.viaggioLungo);
  }
  return elenco;
}

// 3 giorni di fila in Giallo o Rosso non spiegati da caselle, evento o infortunio (regola 5.16).
function gialliDiFila(m, livello, spiegato) {
  const frena = (l) => l === "giallo" || l === "rosso";
  if (!frena(livello) || spiegato) return false;
  for (let j = 1; j < S.gialliDiFila; j++) {
    const r = storiaDi(m, aggiungiGiorni(m.oggi, -j));
    if (!frena(r.livello) || r.spiegato) return false;
  }
  return true;
}

function vociPerIlPerche(m, v) {
  if (m.notteMaiArrivata) {
    return [v.energia, v.gambe, v.acciacchi, voce("notte", { testo: VOCI.notte.mai }), v.carico];
  }
  return ORDINE.map((k) => v[k]);
}

// La frase principale. Se un tetto ha alzato il livello, il perché è il tetto. Altrimenti la voce con
// più punti, e a parità le risposte della persona prima dei numeri (4.8).
function frasePerche(contano, tetti, livello) {
  const priorita = ["guardia", "rientro", "sopraIlCollo", "ultimiGiorni", "crescita"];
  const alzano = tetti.filter((t) => t.alza).sort((a, b) => priorita.indexOf(a.chiave) - priorita.indexOf(b.chiave));
  if (alzano.length) return alzano[0].perche;
  let migliore = null;
  for (const x of contano) if (x.punti > 0 && (!migliore || x.punti > migliore.punti)) migliore = x;
  if (migliore) return migliore.testo;
  return livello === "nessuno" ? PERCHE.pochiDati : PERCHE.nessuno;
}

function notaDelGiorno(m, v, c, P) {
  // La nota del malanno dice «non hai fatto niente di duro», quindi non vale dopo un giorno duro.
  const notte = v.hrv.punti + v.fc.punti;
  const ieriDuro = Boolean(v.hrv.lettura && v.hrv.lettura.calo);
  if (notte >= S.malanno && v.carico.punti === 0 && !v.s.cause.length && !ieriDuro) return NOTE.malanno;
  const daRisposte = v.energia.punti + v.gambe.punti + v.acciacchi.punti;
  if (P > 0 && daRisposte === P && [v.sonno, v.fc, v.hrv].some((x) => x.attiva && x.punti === 0)) return NOTE.ascolta;
  if (v.hrv.lettura && v.hrv.lettura.sospesaCalo && !v.s.senzaPuntiNotte) return NOTE.caloAtteso;
  if (v.hrv.lettura && v.hrv.lettura.mediaAlta) return NOTE.hrvAlta;
  if (m.notteMaiArrivata) return NOTE.senzaNotte;
  return null;
}

// --- La decisione del mattino (4.2) ---

// valuta(m, contesto) con m da costruisciModello e il contesto del giorno, tutto facoltativo.
// contesto {
//   evento: { tipo, giorno, giorni } | null    modalità evento accesa oggi (eventoDiOggi)
//   guardia: risultato di giorniDiGuardia       se manca lo calcolo da m.storia, m.piano e m.uscite
//   rientro: { giorno, giorni, attesa } | null  se manca lo calcolo dal diario (statoMalattia)
//   giorniPartenza, giorniEvento                giorni alla partenza e giorni dell'evento, se c'è
//   eta (anni) o fasciaEta, aritmia, crescita   età, aritmia nota, avviso di crescita negli ultimi 7 giorni
//   dispositivo, cambioDispositivo, profilo     dispositivo della notte e la data del cambio
// }
// Restituisce { livello, colore, titolo, consiglio, perche, voci, P, forti, concordanza, stop,
// controllo, tetti, fiducia, nota, aggiunte, medico, messaggi, domande, domenica, viaggio, basi,
// dispositivo, escluso, registro }.
export function valuta(m, contesto = {}) {
  const c = risolvi(m, contesto);
  const i = ultimo(m);
  const dia = diarioDi(m, m.oggi);
  const sintomi = sintomiDi(dia);
  const v = vociDelGiorno(m, i, c);
  const vIeri = i > 0 ? vociDelGiorno(m, i - 1, c) : null;
  const contano = ORDINE.map((k) => v[k]);
  const soloCollo = sintomi.collo.length > 0 && !sintomi.cuore.length && !sintomi.malattia.length;
  const sensazioniBasse = v.energia.valore >= S.domande.energiaPoca || v.gambe.valore >= S.domande.gambeIndolenzite;
  const guardia = c.guardia && c.guardia.attiva ? c.guardia : null;
  const testiGuardia = guardia
    ? (guardia.tipo
      ? testiDellaGuardia(guardia, { eta: c.eta, sensazioniBasse, sopraIlCollo: soloCollo })
      : { testo: guardia.testo, perche: guardia.perche })
    : null;
  // Dopo una malattia che chiede il medico, finché la persona non dice di averlo sentito (4.9).
  const attesa = Boolean(c.rientro && c.rientro.attesa);
  const fraseRientro = c.rientro ? (attesa ? PERCHE.attesa : PERCHE.rientro(c.rientro.giorno, c.rientro.giorni)) : null;

  let { tipo: tipoStop, origine } = trovaStop(v, sintomi, c, dia);
  const controllo = [];
  const medico = medicoDelGiorno(m, c, v, sintomi);
  const messaggi = [];
  const aggiunte = [];
  const tetti = [];
  const P = contano.reduce((s, x) => s + x.punti, 0);
  const forti = contano.filter((x) => x.forte).length;
  let concordanza = false;
  let livello;
  let consiglio;
  let perche;
  let nota = null;
  let voci = vociPerIlPerche(m, v);

  // Modalità evento. Gli stop restano, poi decidono le voci dei giorni di fila (4.5). Le voci del
  // «Perché» e la riga della notte sono quelle di 7.10 anche con uno stop.
  const viaggio = c.evento ? viaggioInterno(m, dia.viaggio || {}, c, v) : null;
  if (viaggio) {
    voci = viaggio.voci;
    nota = viaggio.nota;
    if (!tipoStop && viaggio.stop) {
      tipoStop = viaggio.stop;
      origine = viaggio.stop;
    }
  }

  // La domanda sulla pedalata solo se la risposta può cambiare la giornata. Con uno stop che resta
  // comunque, cuore, malattia, infortunio, «Sono a pezzi» o uno stop del viaggio, la carta è quella
  // dello stop (4.2, passo 2).
  const stopComunque = trovaStop(v, sintomi, c, dia, { senzaDoloreSospeso: true }).tipo || (viaggio && viaggio.stop);
  if (contano.some((x) => x.domanda === "pedalata") && !stopComunque) controllo.push({ chiave: "pedalata", ...CONTROLLO.pedalata });

  if (tipoStop) {
    livello = "rosso";
    consiglio = STOP[origine] || STOP[tipoStop];
    perche = PERCHE.stop[origine] || PERCHE.stop[tipoStop];
  } else if (viaggio) {
    livello = viaggio.livello;
    consiglio = viaggio.consiglio;
    perche = viaggio.perche;
    // In viaggio restano il minimo dei sintomi sopra il collo e il tetto del rientro dopo una
    // malattia, che vince sempre (passo 11). Gli altri tetti non servono, si è dentro la fatica.
    const minimo = (chiave, testo, frase) => {
      const alza = GRAVITA[livello] < 2;
      tetti.push({ chiave, livello: "giallo", testo, perche: frase, alza });
      if (alza) { livello = "giallo"; consiglio = VIAGGIO.esiti.giallo; perche = frase; }
    };
    if (soloCollo) {
      minimo("sopraIlCollo", STO_MALE.sopraIlCollo, PERCHE.collo);
      aggiunte.push(STO_MALE.sopraIlCollo);
    }
    if (c.rientro) minimo("rientro", fraseRientro, fraseRientro);
    if (attesa) consiglio = MEDICO.attesa;
    const fc = v.fc.lettura;
    if (fc && fc.alto && fc.altoIeri && !dia.controllo) controllo.push({ chiave: "malattia", ...CONTROLLO.malattia });
  } else {
    // passi 6-9, i punti, la concordanza e il Rosso dai numeri
    concordanza = contano.some((x) => x.punti > 0 && (DALLE_RISPOSTE.has(x.chiave) || x.chiave === "carico"
      || x.piuNotti || Boolean(vIeri && vIeri[x.chiave].punti > 0)));
    const poca = v.energia.valore === S.domande.energiaPoca;
    const treMattine = caricoTreMattine(m, c, v.carico);
    let base;
    if (concordanza && (P >= S.punti.rosso || forti >= S.punti.fortiPerRosso || (forti >= 1 && poca))) base = "rosso";
    else if (treMattine) base = "rosso";
    else if (P === 0) base = datiSufficienti(v) ? "verde" : "nessuno";
    else base = P >= S.punti.giallo ? "giallo" : "giallo-leggero";

    // passo 10, le sensazioni ottime, solo con i punti dalla notte e mai con un segnale forte
    const O = S.domande.ottime;
    const ottime = v.energia.valore === O.energia && v.gambe.valore >= 1 && v.gambe.valore <= O.gambeFino
      && v.acciacchi.valore === O.acciacchi;
    const soloNotte = P > 0 && contano.every((x) => x.punti === 0 || DALLA_NOTTE.has(x.chiave));
    const bloccata = forti > 0 || contano.some((x) => x.punti > 0 && x.nonMigliorabile);
    if (ottime && soloNotte && !bloccata && (base === "giallo" || base === "giallo-leggero")) {
      base = base === "giallo" ? "giallo-leggero" : "verde";
    }

    // passo 11, minimi e tetti, che vincono sempre. Un tetto Giallo vuol dire non meglio del Giallo.
    let g = GRAVITA[base];
    const alza = (chiave, livelloTetto, testo, frase) => {
      const minimo = GRAVITA[livelloTetto];
      tetti.push({ chiave, livello: livelloTetto, testo, perche: frase, alza: g < minimo });
      g = Math.max(g, minimo);
    };
    if (soloCollo) alza("sopraIlCollo", "giallo", STO_MALE.sopraIlCollo, PERCHE.collo);
    if (guardia) alza("guardia", "giallo", testiGuardia.testo, testiGuardia.perche);
    if (c.rientro) alza("rientro", "giallo", fraseRientro, fraseRientro);
    if (c.crescita) alza("crescita", "giallo-leggero", PERCHE.crescita, PERCHE.crescita);
    const ultimi = c.giorniPartenza !== null && c.giorniPartenza >= 1 && c.giorniPartenza <= S.ultimiGiorni;
    if (ultimi) {
      tetti.push({ chiave: "ultimiGiorni", livello: "giallo", testo: MESSAGGI.ultimiGiorni, perche: PERCHE.ultimi(c.giorniPartenza), alza: g === 1 });
      if (g === 1) g = 2;
      aggiunte.push(MESSAGGI.ultimiGiorni);
    }
    livello = base === "nessuno" && g === 1 ? "nessuno" : PER_GRAVITA[g];
    consiglio = LIVELLI[livello].consiglio;
    if (livello === "rosso" && treMattine) consiglio = CARICO_TRE_MATTINE;
    else if (livello === "giallo" && guardia) consiglio = testiGuardia.testo;
    else if (livello === "giallo" && soloCollo) consiglio = STO_MALE.consiglio;
    // Con i soli sintomi sopra il collo la carta ha una durata sola, al massimo un'ora (regola 5.10).
    // La frase di 4.4 si aggiunge solo dove il consiglio non ne dice già una, cioè dopo un viaggio.
    if (soloCollo && livello === "giallo" && guardia && (guardia.tipo === "evento" || guardia.tipo === "viaggio")) {
      aggiunte.push(STO_MALE.sopraIlCollo);
    }
    // Finché si aspetta il medico il consiglio non propone mai un giro (4.9).
    if (attesa) consiglio = MEDICO.attesa;
    perche = frasePerche(contano, tetti, livello);
    nota = notaDelGiorno(m, v, c, P);

    // la domanda di controllo, con un segnale forte o con battito alto e HRV bassa da 2 notti
    const hrv = v.hrv.lettura;
    const hrvIeri = vIeri && vIeri.hrv.lettura;
    const fc = v.fc.lettura;
    const spiegata = v.s.cause.length || (vIeri && vIeri.s.cause.length) || v.s.senzaPuntiNotte || (hrv && hrv.calo);
    const dueNotti = Boolean(fc && fc.alto && fc.altoIeri && hrv && hrv.zNotte < S.hrv.notteBassa
      && hrvIeri && hrvIeri.zNotte < S.hrv.notteBassa && !spiegata);
    if ((forti > 0 || dueNotti) && !dia.controllo) controllo.push({ chiave: "malattia", ...CONTROLLO.malattia });
  }

  // passo 12, messaggi e contatori
  if (!tipoStop) {
    if (v.sonno.lettura && v.sonno.lettura.daOre && !c.evento) aggiunte.push(MESSAGGI.sonno);
    const hrv = v.hrv.lettura;
    if (hrv && hrv.insolita && !c.evento) messaggi.push({ chiave: "insolita", testo: MESSAGGI.insolita });
    if (hrv && hrv.mediaAlta && nota !== NOTE.hrvAlta && !c.evento) messaggi.push({ chiave: "sopraSolito", testo: MESSAGGI.sopraSolito });
  }
  if (!m.notteArrivata && !m.notteMaiArrivata) messaggi.push({ chiave: "notte", testo: MESSAGGI.notteNonArrivata });
  const domande = { dispositivo: saltoDispositivo(m, c) };
  if (domande.dispositivo) messaggi.push({ chiave: "dispositivo", testo: MESSAGGI.dispositivo });
  const spiegato = Boolean(v.s.cause.length || c.evento || guardia || v.acciacchi.punti > 0
    || tipoStop === "dolore" || tipoStop === "infortunio");
  const domenica = gialliDiFila(m, livello, spiegato);
  if (domenica) messaggi.push({ chiave: "gialliDiFila", testo: MESSAGGI.gialliDiFila });

  const registro = {
    livello,
    P,
    forti,
    punti: Object.fromEntries(ORDINE.map((k) => [k, v[k].punti])),
    tetti: tetti.map((t) => t.chiave),
    stop: tipoStop,
    riportato: origine === "malattiaRiportata" || origine === "cuoreRiportato",
    spiegato,
    evento: c.evento ? { tipo: c.evento.tipo || "viaggio", giorno: numero(c.evento.giorno), giorni: numero(c.evento.giorni) } : null,
    guardia: guardia ? guardia.tipo || "guardia" : null,
    notteEsclusa: c.escluso(m.giorni[i]),
  };

  return {
    livello,
    colore: LIVELLI[livello].colore,
    titolo: LIVELLI[livello].titolo,
    consiglio,
    perche,
    voci,
    P,
    forti,
    concordanza,
    stop: tipoStop,
    controllo,
    tetti,
    fiducia: c.fiducia,
    nota,
    aggiunte,
    medico,
    messaggi,
    domande,
    domenica,
    viaggio,
    basi: { hrv: baseHrv(m.giorni, i, c.dispositivo, c.escluso), fc: baseFc(m.giorni, i, c.escluso) },
    // Il dispositivo e le notti escluse dalle basi, così Andamento disegna lo stesso normale (4.3).
    dispositivo: c.dispositivo,
    escluso: c.escluso,
    registro,
  };
}

// La fascia del battito normale, per Andamento. Sopra il bordo alto il battito comincia a dare punti,
// almeno 3 battiti e 2 DS sopra la mediana (regola 5.7). Il bordo basso è alla stessa distanza.
export function fasciaBattito(base) {
  if (!base || !base.ok) return { basso: null, alto: null };
  const scarto = Math.max(S.battito.sopra, S.battito.z * base.ds);
  return { basso: base.centro - scarto, alto: base.centro + scarto };
}

// La Freschezza (su intervals.icu si chiama Form) in parole semplici, con le fasce di js/testi.js.
export function zonaFreschezza(pct) {
  if (pct === null || pct === undefined) return null;
  const p = pct * 100;
  const zona = ZONE_FRESCHEZZA.find((z) => z.da === null || p > z.da);
  return { nome: zona.nome, testo: zona.testo };
}
