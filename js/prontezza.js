// Quando uno è pronto, il capitolo 2 della specifica della preparazione.
// Quattro pilastri, cioè ore a settimana, uscita lunga, prove con le borse e continuità, ognuno con
// un difetto da 0 a 2. Da lì il verdetto e la sua fiducia, prima della vigilia dove si arriva con il
// piano, e quando non basta cosa proporre, prima più giorni, poi il percorso corto, poi partire e
// adattare. La Fitness resta un confronto e non decide mai.
// Le settimane −k si contano all'indietro dalla partenza a blocchi di 7 giorni (2.2), e la −k va dal
// giorno −7k al −7k + 6. Le date sono AAAA-MM-GG, come in js/dati.js.
// Funzioni pure, senza DOM e senza window, provate con node (test/prontezza.test.mjs).
// I numeri stanno in js/parametri.js, nel gruppo PRONTEZZA. Passo della lunga e scarico finale sono
// quelli del piano, nel gruppo PIANO.

import { CARICO, PIANO, PRONTEZZA } from "./parametri.js?v=202611021803";
import { QUALITA, contoOre, giriUniti, inBici, inPalestra, mediana, puntiOra } from "./dati.js?v=202611021803";
import { stimaH } from "./stima.js?v=202611021803";
import { CATALOGO } from "./catalogo.js?v=202611021803";
import {
  testiVerdetto, testoVolume, testoLunga, testoProva, testoBorse, testoDaSistemare, testoContinuita,
  testoPalestra, rigaFiducia, fraseProiezione, testoManca, testoSottoPiano, cosaAllaVigilia,
  FIDUCIA, COSA_POCO, AVVISO_DOPPIO_USO, AVVISI_FITNESS, PROIEZIONE,
} from "./testi-prontezza.js?v=202611021803";

const ORA = 3600;
const GIORNO_MS = 86400000;
const EPS = 1e-9;
const GIORNI_RICERCA = PRONTEZZA.giorniConsigliati.giorniCerca;

export const ARRIVARE_E_ADATTARE = "arrivare e adattare";

const [UN_GIORNO, DUE_CINQUE, SEI_DIECI, UNDICI] = PRONTEZZA.classi;
const PIU_GIORNI = ["blocco", "T3"];   // le prove di più giorni, dalla più grande
const ORDINE_PILASTRI = ["volume", "lunga", "continuita", "borse"];
const CONTATTO = ["mani", "sedere", "collo", "ginocchia", "piedi"];

const num = (v) => typeof v === "number" && Number.isFinite(v);
const somma = (lista, f = (x) => x) => lista.reduce((s, x) => s + f(x), 0);
const perData = (x, y) => (x.giorno < y.giorno ? -1 : x.giorno > y.giorno ? 1 : 0);
const minore = (a, b) => (a < b ? a : b);
const maggiore = (a, b) => (a > b ? a : b);

function utc(iso) {
  const [a, m, g] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}

const piuGiorni = (iso, n) => new Date(utc(iso) + n * GIORNO_MS).toISOString().slice(0, 10);
const giorniFra = (da, a) => Math.round((utc(a) - utc(da)) / GIORNO_MS);

function oggiIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Il primo e l'ultimo giorno di una finestra di settimane, come { da: -10, a: -3 }.
function finestra(partenza, { da, a }) {
  return { dal: piuGiorni(partenza, 7 * da), al: piuGiorni(partenza, 7 * a + 6) };
}

const inizioFinestra = (partenza, prova) => piuGiorni(partenza, 7 * PRONTEZZA.finestre[prova].da);
const PRIMA_SETTIMANA = Math.min(...Object.values(PRONTEZZA.finestre).map((f) => f.da));
const SETTIMANE_VOLUME = PRONTEZZA.finestre.volume.a - PRONTEZZA.finestre.volume.da + 1;

// Confronta due liste di punti, la prima voce conta di più.
function confronta(x, y) {
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d;
  }
  return 0;
}

// --- Le attività per giorno ---

const giornoDi = (a) => (typeof a.giorno === "string" ? a.giorno : typeof a.inizio === "string" ? a.inizio.slice(0, 10) : null);

// Un'attività con il giorno e la qualità nella forma di js/dati.js, anche se arriva da altrove.
function pulita(a, d) {
  const q = a.qualita;
  if (a.giorno === d && q && typeof q === "object") return a;
  return { ...a, giorno: d, qualita: q && typeof q === "object" ? q : { secondi: typeof q === "string" ? q : QUALITA.vera } };
}

function perGiorno(attivita) {
  const mappa = new Map();
  for (const a of Array.isArray(attivita) ? attivita : []) {
    const d = a ? giornoDi(a) : null;
    if (!d) continue;
    if (!mappa.has(d)) mappa.set(d, []);
    mappa.get(d).push(pulita(a, d));
  }
  return mappa;
}

function primaData(uscite = [], benessere = []) {
  const date = [
    ...(Array.isArray(uscite) ? uscite : []).map((a) => (a ? giornoDi(a) : null)),
    ...(Array.isArray(benessere) ? benessere : []).filter((g) => g && (g.notte || g.carico > 0)).map((g) => g.d || g.giorno),
  ].filter((d) => typeof d === "string").sort();
  return date[0] || null;
}

// --- Le classi e gli obiettivi (2.1) ---

export function classeEvento(giorni) {
  const [uno, cinque, dieci] = PRONTEZZA.classiFinoA;
  const g = num(giorni) && giorni >= 1 ? giorni : 1;
  if (g <= uno) return UN_GIORNO;
  if (g <= cinque) return DUE_CINQUE;
  return g <= dieci ? SEI_DIECI : UNDICI;
}

const daSei = (classe) => classe === SEI_DIECI || classe === UNDICI;

// Un viaggio di più giorni con le borse già fatto (2.2). Vero, oppure i giorni del viaggio più
// lungo, come le risposte «Sì, di 2 giorni» e «Sì, di 3 giorni o più» del primo avvio.
export function haEsperienza(e) {
  if (e === true) return true;
  const n = typeof e === "string" && e.trim() ? Number(e) : e;
  return num(n) && n >= 2;
}

// Ore a settimana minime e comode, uscita lunga obiettivo e prove minime della classe (2.1).
// opzioni.borseKg sono le borse dell'obiettivo, che per un giorno decidono se serve la prova.
// Restituisce { h, classe, vMin, vComodo, lt, prove }, null senza H.
export function obiettivi(h, classe, esperienza = false, { borseKg = null } = {}) {
  const o = PRONTEZZA.obiettivi[classe];
  if (!o || !num(h) || h <= 0) return null;
  const conGradino = !num(o.daH) || h >= o.daH - EPS;
  let vMin = o.vMin * h;
  let vComodo = o.vComodo * h;
  if (num(o.vMinAlmeno) && conGradino) vMin = Math.max(vMin, o.vMinAlmeno);
  if (num(o.vComodoAlmeno) && conGradino) vComodo = Math.max(vComodo, o.vComodoAlmeno);
  vComodo = Math.max(vMin, Math.min(vComodo, PRONTEZZA.comodoMassimo));
  let lt = o.lt * h;
  if (num(o.ltMinimo)) lt = Math.max(lt, o.ltMinimo);
  if (num(o.ltMassimo)) lt = Math.min(lt, o.ltMassimo);
  const prove = [...PRONTEZZA.proveMinime[classe]];
  // L'esperienza toglie l'uscita lunga con le borse solo con H fino a 6 ore (2.4, regola 6.7).
  if (classe === DUE_CINQUE && (h > PRONTEZZA.t2OltreH + EPS || !haEsperienza(esperienza))) prove.splice(1, 0, "T2");
  if (classe === UN_GIORNO && num(borseKg) && borseKg > PRONTEZZA.unGiornoBorseOltreKg) prove.push("unGiorno");
  return { h, classe, vMin, vComodo, lt, prove };
}

// I blocchi di 7 giorni contati dalla partenza, dalla −16 alla −1 (2.2), ognuno { indice, da, a }.
export function settimanePilastri(partenza) {
  const lista = [];
  for (let k = PRIMA_SETTIMANA; k <= -1; k++) lista.push({ indice: k, da: piuGiorni(partenza, 7 * k), a: piuGiorni(partenza, 7 * k + 6) });
  return lista;
}

// --- Le ore di ogni giorno e l'uscita lunga (2.2) ---

// Le ore in bici giorno per giorno fra dal e al, con contoOre di js/dati.js. Ogni giorno ha
// { giorno, ore, vere, dette, stimate, senzaDurata, bici }, con bici vero se c'è stata un'uscita.
export function giorniDiBici(attivita, { dal = null, al = null, eBikeEvento = false } = {}) {
  const mappa = perGiorno(attivita);
  const date = [...mappa.keys()].sort();
  const da = dal || date[0];
  const fino = al || date[date.length - 1];
  if (!da || !fino || da > fino) return [];
  const giorni = [];
  for (let d = da; d <= fino; d = piuGiorni(d, 1)) {
    const conto = contoOre(mappa.get(d) || [], d, { eBikeEvento });
    giorni.push({ giorno: d, ...conto, bici: conto.ore > 0 || conto.senzaDurata > 0 });
  }
  return giorni;
}

// Le ore in bici per data. giorni viene da giorniDiBici, oppure sono le attività pulite, che si
// contano qui.
function oreGiorni(giorni, { eBikeEvento = false } = {}) {
  const lista = (Array.isArray(giorni) ? giorni : []).filter(Boolean);
  const contati = lista.every((g) => typeof g.giorno === "string" && num(g.ore)) ? lista : giorniDiBici(lista, { eBikeEvento });
  return new Map(contati.map((g) => [g.giorno, g]));
}

const oreDi = (mappa, d) => (mappa.has(d) ? mappa.get(d).ore || 0 : 0);

function biciDi(mappa, d) {
  const g = mappa.get(d);
  return Boolean(g) && (g.bici === true || g.ore > 0 || g.senzaDurata > 0);
}

function oreFra(mappa, dal, al) {
  let ore = 0;
  for (let d = dal; d <= al; d = piuGiorni(d, 1)) ore += oreDi(mappa, d);
  return ore;
}

// La più lunga uscita in bici fra dal e al, in ore di movimento, con le attività dello stesso giorno
// separate da meno di 2 ore unite in una e senza i rulli. { ore, giorno }, con ore 0 senza uscite.
function lungaFra(uscite, dal, al, { eBikeEvento = false } = {}) {
  let piuLunga = { ore: 0, giorno: null };
  if (!dal || !al || dal > al) return piuLunga;
  for (const [d, attivita] of perGiorno(uscite)) {
    if (d < dal || d > al) continue;
    for (const g of giriUniti(attivita, d, { eBikeEvento })) {
      if (g.secondi / ORA > piuLunga.ore + EPS) piuLunga = { ore: g.secondi / ORA, giorno: d };
    }
  }
  return piuLunga;
}

// La più lunga di ogni giorno fino ad al compreso, per il passo della lunga.
function lunghePerGiorno(uscite, al, { eBikeEvento = false } = {}) {
  const lista = [];
  for (const [d, attivita] of perGiorno(uscite)) {
    if (al && d > al) continue;
    const ore = Math.max(0, ...giriUniti(attivita, d, { eBikeEvento }).map((g) => g.secondi / ORA));
    if (ore > 0) lista.push({ giorno: d, ore });
  }
  return lista.sort(perData);
}

// --- Le prove con le borse (2.4) ---

// Un giorno di un evento fatto con l'app vale carico «come all'evento», con la notte fuori.
function conEvento(a) {
  if (!a || a.modoEvento !== true) return a;
  return { ...a, borse: a.borse ?? "evento", notteFuori: a.notteFuori ?? true };
}

// I giorni carichi prima della partenza. Per ogni data la più lunga uscita unita con la risposta
// «Sì, come all'evento» e di almeno 3 ore, senza i rulli, perché conta come giorno carico solo
// un'uscita di almeno 3 ore (2.4). Vale per tutte le prove, per il blocco e per le uscite cariche di
// più giorni. Senza risposta un giro vale «No». La notte fuori vale se è segnata su uno dei due
// giorni che la chiudono.
function giorniCarichi(uscite, partenza, { eBikeEvento = false } = {}) {
  const lista = [];
  for (const [d, attivita] of perGiorno((Array.isArray(uscite) ? uscite : []).map(conEvento))) {
    if (partenza && d >= partenza) continue;
    const carichi = giriUniti(attivita, d, { eBikeEvento }).filter((g) => g.borse === "evento" && g.secondi + EPS >= PRONTEZZA.giornoCaricoOre * ORA);
    if (!carichi.length) continue;
    const g = carichi.reduce((m, x) => (x.secondi > m.secondi ? x : m));
    lista.push({
      giorno: d,
      ore: g.secondi / ORA,
      notteFuori: carichi.some((x) => x.notteFuori),
      inProgramma: g.parti.some((p) => p.inProgramma === true),
    });
  }
  return lista.sort(perData);
}

// Le uscite cariche di più giorni, cioè i giorni carichi di fila.
function usciteDiPiuGiorni(carichi) {
  const uscite = [];
  let corrente = [];
  for (const g of carichi) {
    const ultimo = corrente[corrente.length - 1];
    if (ultimo && giorniFra(ultimo.giorno, g.giorno) === 1) {
      corrente.push(g);
      continue;
    }
    if (corrente.length >= 2) uscite.push(corrente);
    corrente = [g];
  }
  if (corrente.length >= 2) uscite.push(corrente);
  return uscite;
}

// La prova generale, due giorni carichi di fila con una notte fuori, il primo di almeno 0,63 × H
// (0,54 × H da 6 giorni in su) e il secondo di almeno 0,45 × H, dalla settimana −10.
function candidatiT3(uscita, h, classe, partenza) {
  const s = PRONTEZZA.soglie.T3;
  const primo = (daSei(classe) ? s.giorno1DaSei : s.giorno1) * h;
  const inizio = inizioFinestra(partenza, "T3");
  const candidati = [];
  for (let i = 0; i + 1 < uscita.length; i++) {
    const [a, b] = [uscita[i], uscita[i + 1]];
    if (a.giorno < inizio || !(a.notteFuori || b.notteFuori)) continue;
    if (a.ore + EPS < primo || b.ore + EPS < s.giorno2 * h) continue;
    candidati.push([a, b]);
  }
  return candidati;
}

// Il blocco, tre giorni carichi di fila, ognuno di almeno 0,45 × H, dalla settimana −9.
function candidatiBlocco(uscita, h, partenza) {
  const n = PRONTEZZA.bloccoGiorni;
  const inizio = inizioFinestra(partenza, "blocco");
  const candidati = [];
  for (let i = 0; i + n <= uscita.length; i++) {
    const giorni = uscita.slice(i, i + n);
    if (giorni[0].giorno >= inizio && giorni.every((g) => g.ore + EPS >= PRONTEZZA.soglie.blocco * h)) candidati.push(giorni);
  }
  return candidati;
}

// Le ore minime di una prova di un giorno. Il test e l'uscita lunga con le borse sono test di viaggio,
// quindi almeno 3 ore. La prova di un giorno con le borse ha la soglia di 0,45 × H (2.1), e come ogni
// giorno carico vale solo da 3 ore in su, che giorniCarichi già chiede.
function sogliaUnGiorno(prova, h, classe) {
  const s = PRONTEZZA.soglie;
  if (prova === "T1") return PRONTEZZA.giornoCaricoOre;
  if (prova === "T2") return Math.max(PRONTEZZA.giornoCaricoOre, (daSei(classe) ? s.T2.daSei : s.T2[DUE_CINQUE]) * h);
  return s.unGiorno * h;
}

// Le prove di un giorno si soddisfano con qualsiasi giorno carico, anche dentro un'uscita di più giorni.
function candidatiUnGiorno(carichi, prova, h, classe, partenza) {
  const minimo = sogliaUnGiorno(prova, h, classe);
  const inizio = inizioFinestra(partenza, prova);
  return carichi.filter((g) => g.giorno >= inizio && g.ore + EPS >= minimo).map((g) => [g]);
}

// Com'è andata una prova. stato è «fatta», «inProgramma» o «manca», tardi vuol dire finita negli
// ultimi 21 giorni, che conta lo stesso con la nota «fatta tardi».
function esitoDi(giorni, partenza) {
  if (!giorni) return { stato: "manca", tardi: false, da: null, a: null, giorni: [], doppioUso: false };
  const fine = giorni[giorni.length - 1].giorno;
  return {
    stato: giorni.some((g) => g.inProgramma) ? "inProgramma" : "fatta",
    tardi: giorniFra(fine, partenza) < PRONTEZZA.giorniProvaFinita,
    da: giorni[0].giorno,
    a: fine,
    giorni: giorni.map((g) => g.giorno),
    doppioUso: false,
  };
}

// Fra i candidati di una prova, prima i fatti, poi quelli in tempo, poi il più recente.
function migliore(candidati, partenza) {
  let scelto = null;
  let punti = null;
  for (const c of candidati) {
    const e = esitoDi(c, partenza);
    const p = [e.stato === "fatta" ? 1 : 0, e.tardi ? 0 : 1, e.tardi ? -utc(e.a) : utc(e.a)];
    if (!punti || confronta(p, punti) > 0) {
      scelto = c;
      punti = p;
    }
  }
  return scelto;
}

// Un'uscita di almeno 3 giorni finita fra 21 e 42 giorni prima vale insieme come blocco e come
// prova generale.
function doppioUsoPossibile(uscita, partenza) {
  const d = PRONTEZZA.doppioUso;
  const fa = giorniFra(uscita[uscita.length - 1].giorno, partenza);
  return uscita.length >= d.giorni && fa >= d.daGiorni && fa <= d.aGiorni;
}

// Le prove di più giorni sulle uscite di più giorni, una prova per uscita salvo il doppio uso, dalla
// prova più grande alla più piccola. Fra tutti gli abbinamenti vince quello con più prove, poi con
// più prove fatte, poi in tempo, poi con le prove più grandi, poi con la prova generale sull'uscita
// più recente, come sceglie migliore, perché è l'ultima prova del set-up, poi con più uscite diverse.
// Così l'uscita più recente di almeno 3 giorni finita fra 21 e 42 giorni prima vale blocco e prova
// generale, con l'avviso, anche quando un'uscita più vecchia farebbe la prova generale (2.4 e 8.3),
// e un blocco più vecchio resta separato da una prova generale più recente, senza avviso.
function assegna(prove, uscite, h, classe, partenza) {
  const scelte = prove.map((p) => uscite.map((u) => migliore(p === "blocco" ? candidatiBlocco(u, h, partenza) : candidatiT3(u, h, classe, partenza), partenza)));
  const generale = prove.indexOf("T3");
  let meglio = { punti: null, abbinate: prove.map(() => null) };
  const visita = (i, abbinate) => {
    if (i === prove.length) {
      const esiti = abbinate.filter(Boolean).map((a) => esitoDi(a.giorni, partenza));
      const g = generale >= 0 && abbinate[generale] ? esitoDi(abbinate[generale].giorni, partenza) : null;
      const punti = [
        esiti.length,
        esiti.filter((e) => e.stato === "fatta").length,
        esiti.filter((e) => !e.tardi).length,
        ...abbinate.map((a) => (a ? 1 : 0)),
        g ? (g.tardi ? -utc(g.a) : utc(g.a)) : 0,
        new Set(abbinate.filter(Boolean).map((a) => a.uscita)).size,
      ];
      if (!meglio.punti || confronta(punti, meglio.punti) > 0) meglio = { punti, abbinate: [...abbinate] };
      return;
    }
    visita(i + 1, [...abbinate, null]);
    for (let j = uscite.length - 1; j >= 0; j--) {   // le più recenti per prime
      const giorni = scelte[i][j];
      if (!giorni) continue;
      if (abbinate.some((a) => a && a.uscita === j) && !doppioUsoPossibile(uscite[j], partenza)) continue;
      visita(i + 1, [...abbinate, { uscita: j, giorni }]);
    }
  };
  visita(0, []);
  return meglio.abbinate;
}

// Le prove che si guardano per classe. Il pilastro sceglie poi quelle minime.
function proveDellaClasse(classe) {
  if (classe === UN_GIORNO) return ["unGiorno"];
  if (classe === UNDICI) return ["T1", "blocco", "T3"];
  return ["T1", "T2", "T3"];
}

// Le prove soddisfatte dalle uscite cariche, con le note (2.4). usciteCariche sono le attività
// pulite di js/dati.js, anche tutte, perché qui contano solo i giorni «come all'evento».
// Restituisce { prove, doppioUso, uscitePiuGiorni, giorniCarichi }, dove prove ha per ogni prova
// della classe { stato, tardi, da, a, giorni, doppioUso }.
export function abbinaProve(usciteCariche, partenza, h, classe, opzioni = {}) {
  const carichi = giorniCarichi(usciteCariche, partenza, opzioni);
  const uscite = usciteDiPiuGiorni(carichi);
  const tutte = proveDellaClasse(classe);
  const prove = {};
  for (const p of tutte.filter((x) => !PIU_GIORNI.includes(x))) {
    prove[p] = esitoDi(migliore(candidatiUnGiorno(carichi, p, h, classe, partenza), partenza), partenza);
  }
  const multi = PIU_GIORNI.filter((x) => tutte.includes(x));
  const abbinate = assegna(multi, uscite, h, classe, partenza);
  const doppioUso = abbinate.length === 2 && Boolean(abbinate[0] && abbinate[1]) && abbinate[0].uscita === abbinate[1].uscita;
  multi.forEach((p, i) => {
    prove[p] = { ...esitoDi(abbinate[i] ? abbinate[i].giorni : null, partenza), doppioUso };
  });
  return { prove, doppioUso, uscitePiuGiorni: uscite.length, giorniCarichi: carichi.length };
}

// «Da sistemare». Un punto di contatto segnato dopo una prova, senza un «Tutto bene» dopo.
// debriefing è la lista delle risposte dopo le prove, { giorno, esito «bene» o «sistemare», aree }.
function daSistemare(debriefing, partenza, oggi = null) {
  const lista = (Array.isArray(debriefing) ? debriefing : [])
    .filter((d) => d && typeof d.giorno === "string" && (!partenza || d.giorno < partenza) && (!oggi || d.giorno <= oggi))
    .sort(perData);
  const contattoDi = (d) => (Array.isArray(d.aree) ? d.aree : []).filter((a) => CONTATTO.includes(a));
  let aree = [];
  let ultimo = null;
  for (const d of lista) {
    if (d.esito === "bene") {
      aree = [];
      ultimo = null;
    } else if (contattoDi(d).length) {
      aree = [...new Set([...aree, ...contattoDi(d)])];
      ultimo = d;
    }
  }
  if (!ultimo) return null;
  const ultima = lista[lista.length - 1] === ultimo && aree.every((a) => contattoDi(ultimo).includes(a));
  return { giorno: ultimo.giorno, aree, ultima, testo: testoDaSistemare({ aree, ultima }) };
}

function statoDi(difetto, inProgramma = false) {
  if (difetto === 0) return inProgramma ? "inProgramma" : "fatto";
  return difetto === 1 ? "quasi" : "manca";
}

// --- I quattro pilastri (2.3) ---

function conVolume(valore, ob, extra = {}) {
  const p = PRONTEZZA.pilastri.volume;
  const difetto = valore + EPS >= p.difetto0Da * ob.vMin ? 0 : valore + EPS >= p.difetto1Da * ob.vMin ? 1 : 2;
  const proiezione = Boolean(extra.proiezione);
  return {
    pilastro: "volume",
    valore,
    stato: statoDi(difetto, proiezione),
    difetto,
    testo: testoVolume({ valore, vMin: ob.vMin, difetto, proiezione }),
    margine: valore + EPS >= ob.vComodo,
    vMin: ob.vMin,
    vComodo: ob.vComodo,
    ...extra,
  };
}

// Le ore a settimana. V è la media delle ore in bici dalla settimana −10 alla −3, otto settimane con
// gli scarichi dentro, e i giorni senza dati valgono zero. giorni sono quelli di giorniDiBici, oppure
// le attività. Restituisce { pilastro, valore, stato, difetto, testo, margine, settimane }, con
// margine vero da V_comodo in su.
export function pilastroVolume(giorni, partenza, obiettivi, opzioni = {}) {
  const mappa = oreGiorni(giorni, opzioni);
  const f = PRONTEZZA.finestre.volume;
  const settimane = [];
  for (let k = f.da; k <= f.a; k++) {
    const da = piuGiorni(partenza, 7 * k);
    settimane.push({ indice: k, da, ore: oreFra(mappa, da, piuGiorni(da, 6)) });
  }
  return conVolume(somma(settimane, (s) => s.ore) / settimane.length, obiettivi, { settimane });
}

function conLunga(fatta, ob, { valore = fatta.ore, dataPiano = null, proiezione = false, ...extra } = {}) {
  const p = PRONTEZZA.pilastri.lunga;
  const difetto = valore + EPS >= p.difetto0Da * ob.lt ? 0 : valore + EPS >= p.difetto1Da * ob.lt ? 1 : 2;
  const raggiunta = fatta.ore + EPS >= p.difetto0Da * ob.lt;
  return {
    pilastro: "lunga",
    valore,
    giorno: fatta.giorno,
    fatta: fatta.ore,
    stato: statoDi(difetto, proiezione && !raggiunta),
    difetto,
    testo: testoLunga({ valore: fatta.ore, giorno: fatta.giorno, lt: ob.lt, raggiunta, dataPiano }),
    margine: valore + EPS >= ob.lt,
    lt: ob.lt,
    dataPiano,
    ...extra,
  };
}

// L'uscita lunga. L è la più lunga uscita in bici, carica o scarica, dalla settimana −8 alla −3, dalla
// −10 alla −3 da 6 giorni in su, con i giri spezzati da una sosta uniti e senza rulli. uscite sono le
// attività pulite. Restituisce { pilastro, valore, giorno, stato, difetto, testo, margine }, con
// margine vero da LT in su.
export function pilastroLunga(uscite, partenza, classe, obiettivi, opzioni = {}) {
  const f = finestra(partenza, daSei(classe) ? PRONTEZZA.finestre.lungaDaSei : PRONTEZZA.finestre.lunga);
  const al = opzioni.oggi && opzioni.oggi < f.al ? opzioni.oggi : f.al;
  return conLunga(lungaFra(uscite, f.dal, al, opzioni), obiettivi);
}

// Le prove con le borse. h sono le ore della giornata, debriefing le risposte dopo le prove (vedi
// daSistemare). opzioni ha borseKg (per un giorno), oggi, eBikeEvento e proiezione. Restituisce
// { pilastro, valore, stato, difetto, testo } con valore le prove minime fatte o in programma, più
// richieste, righe (una per prova minima, con il suo testo), daSistemare, avvisi, uscitePiuGiorni e
// mancano. Per un giorno senza borse stato vale «nonServe» e testo null.
export function pilastroBorse(usciteCariche, partenza, h, classe, esperienza = false, debriefing = [], opzioni = {}) {
  const ob = obiettivi(h, classe, esperienza, opzioni);
  const richieste = ob ? ob.prove : [];
  const vuoto = { pilastro: "borse", valore: 0, richieste, righe: [], daSistemare: null, avvisi: [], uscitePiuGiorni: 0, mancano: 0 };
  if (!richieste.length) return { ...vuoto, stato: "nonServe", difetto: 0, testo: null };
  const abbinate = abbinaProve(usciteCariche, partenza, h, classe, opzioni);
  const righe = richieste.map((p) => ({ prova: p, ...abbinate.prove[p], testo: testoProva(p, abbinate.prove[p], opzioni) }));
  const sistemare = daSistemare(debriefing, partenza, opzioni.oggi);
  const mancano = righe.filter((r) => r.stato === "manca").length;
  // L'esperienza riduce le prove e da 6 giorni evita il difetto 2, ma non porta mai a 0 da sola.
  let difetto = mancano || sistemare ? 1 : 0;
  if (daSei(classe) && !abbinate.uscitePiuGiorni && !haEsperienza(esperienza)) difetto = 2;
  return {
    ...vuoto,
    valore: righe.length - mancano,
    stato: statoDi(difetto, righe.some((r) => r.stato === "inProgramma")),
    difetto,
    testo: testoBorse({ difetto, righe }),
    righe,
    daSistemare: sistemare,
    avvisi: righe.some((r) => r.doppioUso && r.stato !== "manca") ? [{ tipo: "doppioUso", testo: AVVISO_DOPPIO_USO }] : [],
    uscitePiuGiorni: abbinate.uscitePiuGiorni,
    mancano,
  };
}

function conContinuita(mappa, partenza, oggi) {
  const dal = piuGiorni(partenza, -PRONTEZZA.continuitaGiorni);
  const ieri = piuGiorni(partenza, -1);
  const fino = oggi && oggi < ieri ? oggi : ieri;
  let valore = 0;
  let corrente = 0;
  let inizio = null;
  let da = null;
  let a = null;
  for (let d = dal; d <= fino; d = piuGiorni(d, 1)) {
    if (biciDi(mappa, d)) {
      corrente = 0;
      continue;
    }
    if (d === oggi) continue;   // la giornata di oggi non è finita
    if (corrente === 0) inizio = d;
    corrente += 1;
    if (corrente > valore) {
      valore = corrente;
      da = inizio;
      a = d;
    }
  }
  const p = PRONTEZZA.pilastri.continuita;
  const difetto = valore >= p.difetto2Da ? 2 : valore >= p.difetto1Da ? 1 : 0;
  return { pilastro: "continuita", valore, da, a, stato: statoDi(difetto), difetto, testo: testoContinuita({ valore, difetto }) };
}

// La continuità. Il periodo più lungo di giorni di fila senza bici fra il giorno −56 e il −1, sui
// soli giorni passati. Restituisce { pilastro, valore, da, a, stato, difetto, testo }.
export function pilastroContinuita(giorni, partenza, opzioni = {}) {
  return conContinuita(oreGiorni(giorni, opzioni), partenza, opzioni.oggi || null);
}

// --- Il verdetto (2.5 e 2.9) ---

// Il testo del quasi pronto cambia quando l'unica cosa che manca sono le prove con le borse.
function varianteQuasi(p, contesto) {
  const b = p.borse;
  if (b.difetto !== 1 || p.volume.difetto || p.lunga.difetto || p.continuita.difetto || !b.mancano) return null;
  if (contesto.classe === UN_GIORNO) return null;
  if (haEsperienza(contesto.esperienza)) return b.daSistemare ? null : "esperto";
  return b.uscitePiuGiorni ? null : "primoViaggio";
}

// A parità di difetto conta prima il volume, poi l'uscita lunga, poi la continuità, poi le prove.
function pilastroPiuLontano(p) {
  return ORDINE_PILASTRI.map((n) => p[n]).reduce((m, x) => (x.difetto > m.difetto ? x : m));
}

function cosaPocoPronto({ proposta = null, vigilia = false }) {
  if (proposta && proposta.tipo === "corto") return COSA_POCO.corto;
  if (proposta && proposta.tipo === "giorni") return COSA_POCO.giorni;
  if (vigilia) return cosaAllaVigilia(proposta ? proposta.giorni : null);
  return COSA_POCO.giorni;
}

function righeDelVerdetto(p, contesto) {
  const righe = [
    { pilastro: "volume", stato: p.volume.stato, testo: p.volume.testo },
    { pilastro: "lunga", stato: p.lunga.stato, testo: p.lunga.testo },
  ];
  if (p.borse.testo) righe.push({ pilastro: "borse", stato: p.borse.stato, testo: p.borse.testo });
  if (p.borse.daSistemare) righe.push({ pilastro: "daSistemare", stato: "quasi", testo: p.borse.daSistemare.testo });
  if (p.continuita.testo) righe.push({ pilastro: "continuita", stato: p.continuita.stato, testo: p.continuita.testo });
  if (num(contesto.palestra)) righe.push({ pilastro: "palestra", stato: contesto.palestra > 0 ? "fatto" : "consiglio", testo: testoPalestra(contesto.palestra) });
  return righe;
}

// Il verdetto dai quattro pilastri. contesto ha classe, esperienza, proposta (di 2.8), vigilia (vero
// quando la settimana −3 è finita), palestra (le sedute con le gambe, per la riga che non decide) e
// motivo, «settimane», «giornata» o «ebike», per il non valutabile. Restituisce { esito, titolo,
// perche, cosa, righe, difetti, somma }, con esito fra «conMargine», «pronto», «quasiPronto»,
// «pocoPronto» e «nonValutabile».
export function verdetto(pilastri, contesto = {}) {
  const p = pilastri || {};
  const completi = ORDINE_PILASTRI.every((n) => p[n] && num(p[n].difetto));
  if (contesto.motivo || !completi) {
    const motivo = contesto.motivo || "settimane";
    return { esito: "nonValutabile", ...testiVerdetto("nonValutabile", { motivo }), righe: [], difetti: null, somma: null, motivo };
  }
  const difetti = { volume: p.volume.difetto, lunga: p.lunga.difetto, borse: p.borse.difetto, continuita: p.continuita.difetto };
  const valori = Object.values(difetti);
  const tot = somma(valori);
  let esito = "quasiPronto";
  if (tot === 0) esito = p.volume.margine && p.lunga.margine ? "conMargine" : "pronto";
  else if (tot >= PRONTEZZA.verdetto.pocoPronto || valori.includes(2)) esito = "pocoPronto";
  const testi = testiVerdetto(esito, {
    senzaProve: p.borse.stato === "nonServe",
    variante: esito === "quasiPronto" ? varianteQuasi(p, contesto) : null,
    perche: esito === "pocoPronto" ? pilastroPiuLontano(p).testo : null,
    cosa: esito === "pocoPronto" ? cosaPocoPronto(contesto) : null,
  });
  return { esito, ...testi, righe: righeDelVerdetto(p, contesto), difetti, somma: tot };
}

// La fiducia del verdetto (2.5). giorni sono quelli di giorniDiBici (o le attività), uscite le
// attività pulite, livelloH il livello della stima di H (0-3, null per le ore dette dalla persona,
// con l'obiettivo libero a ore o la e-bike, che non abbassano la fiducia). opzioni ha
// partenza, oggi, primoGiorno (il primo giorno con dati) ed eBikeEvento. Le ore senza durata valgono
// zero nel verdetto, qui valgono la mediana degli altri giri. Restituisce { livello «alta», «media»
// o «bassa», quota delle ore note, settimane di dati, motivo, titolo, testo }.
export function fiduciaVerdetto(giorni, uscite, livelloH, opzioni = {}) {
  const { partenza, oggi = null, primoGiorno = null, eBikeEvento = false } = opzioni;
  const fd = PRONTEZZA.fiducia;
  const v = finestra(partenza, PRONTEZZA.finestre.volume);
  const ieri = piuGiorni(partenza, -1);
  const fino = oggi && oggi < v.al ? oggi : v.al;
  const mappa = oreGiorni(Array.isArray(giorni) && giorni.length ? giorni : uscite, { eBikeEvento });
  let note = 0;
  let stimate = 0;
  let senzaDurata = 0;
  for (let d = v.dal; d <= fino; d = piuGiorni(d, 1)) {
    const g = mappa.get(d);
    if (!g) continue;
    note += (g.vere || 0) + (g.dette || 0);
    stimate += g.stimate || 0;
    senzaDurata += g.senzaDurata || 0;
  }
  const lista = (Array.isArray(uscite) ? uscite : []).filter((a) => a && giornoDi(a)).map((a) => pulita(a, giornoDi(a))).filter((a) => inBici(a));
  const nota = (a) => a.secondi > 0 && [QUALITA.vera, QUALITA.detta].includes(a.qualita.secondi);
  const nellaFinestra = lista.filter((a) => a.giorno >= v.dal && a.giorno <= fino);
  const durate = nellaFinestra.filter(nota).map((a) => a.secondi / ORA);
  const totale = note + stimate + senzaDurata * (durate.length ? mediana(durate) : fd.oreSenzaDurata);
  const quota = totale > 0 ? note / totale : 1;
  const ignote = nellaFinestra.filter((a) => !nota(a));
  const sorgenti = [...new Set(ignote.map((a) => a.sorgente))];
  const motivoOre = { tipo: "ore", quanti: ignote.length, sorgente: sorgenti.length === 1 ? sorgenti[0] : null };
  const dalT1 = inizioFinestra(partenza, "T1");
  const alBorse = oggi && oggi < ieri ? oggi : ieri;
  const senzaBorse = lista.filter((a) => !a.rulli && a.modoEvento !== true && (a.borse === null || a.borse === undefined)
    && a.secondi + EPS >= fd.borseDaOre * ORA && a.giorno >= dalT1 && a.giorno <= alBorse);
  const primo = primoGiorno || primaData(uscite);
  const settimane = primo ? Math.max(0, Math.floor(giorniFra(primo, oggi && oggi < partenza ? oggi : partenza) / 7)) : 0;
  const stimaBassa = num(livelloH) && livelloH < 1;
  let livello = "alta";
  let motivo = null;
  if (quota <= fd.media + EPS || settimane < fd.settimaneMinime) {
    livello = "bassa";
    motivo = quota <= fd.media + EPS ? motivoOre : { tipo: "settimane", quanti: settimane };
  } else if (quota < fd.alta - EPS || senzaBorse.length || stimaBassa) {
    livello = "media";
    if (quota < fd.alta - EPS) motivo = motivoOre;
    else motivo = senzaBorse.length ? { tipo: "borse", quanti: senzaBorse.length } : { tipo: "stima" };
  }
  return { livello, quota, settimane, motivo, titolo: livello === "alta" ? null : FIDUCIA[livello], testo: rigaFiducia(motivo) };
}

// --- Il piano, come lo legge la proiezione ---

const TIPI_CARICHI = new Set(["T1", "T2", "T3", "prova", "blocco", "carica", "unGiorno"]);
const TIPI_NOTTE_FUORI = new Set(["T3", "prova"]);

// Le sedute chiave di una settimana del piano, una per giorno, con data, ore, borse e notte fuori.
// Una seduta senza data va sui giorni di PRONTEZZA.proiezione.giorniChiave.
function seduteDellaSettimana(s) {
  const lista = [];
  const aggiungi = (x, giorno, ore) => {
    const tipo = typeof x.tipo === "string" ? x.tipo : "lunga";
    lista.push({
      giorno,
      ore,
      tipo,
      borse: x.borse ?? (TIPI_CARICHI.has(tipo) ? "evento" : "no"),
      notteFuori: x.notteFuori ?? TIPI_NOTTE_FUORI.has(tipo),
      possibile: x.possibile !== false,
    });
  };
  if (Array.isArray(s.sedute)) {
    for (const x of s.sedute) {
      const giorno = x && (x.giorno || x.data);
      const ore = x && (num(x.ore) ? x.ore : num(x.minuti) ? x.minuti / 60 : null);
      if (typeof giorno === "string" && ore > 0) aggiungi(x, giorno, ore);
    }
  } else if (s.chiave && typeof s.chiave === "object") {
    const c = s.chiave;
    const ore = Array.isArray(c.ore) ? c.ore : num(c.ore) ? [c.ore] : [];
    const gc = PRONTEZZA.proiezione.giorniChiave;
    const date = Array.isArray(c.giorni) && c.giorni.length === ore.length
      ? c.giorni
      : (ore.length >= 3 ? gc.blocco : ore.length === 2 ? gc.dueGiorni : gc.unGiorno).map((i) => piuGiorni(s.lunedi, i));
    ore.forEach((h, i) => {
      if (num(h) && h > 0 && typeof date[i] === "string") aggiungi(c, date[i], h);
    });
  }
  return lista;
}

// piano è { settimane } oppure la lista delle settimane, ognuna { lunedi, indice, tipo, ore } con
// sedute (le sedute chiave con la data, una per giorno) oppure chiave ({ tipo, ore } senza date), e
// facoltativo giorni (le ore di ogni giorno, per la settimana in corso). Le ore che restano dopo le
// sedute chiave si spalmano sugli altri giorni. Restituisce { settimane, ore (per data), sedute }.
function leggiPiano(piano) {
  const settimane = (Array.isArray(piano) ? piano : piano && Array.isArray(piano.settimane) ? piano.settimane : [])
    .filter((s) => s && typeof s.lunedi === "string")
    .sort((x, y) => (x.lunedi < y.lunedi ? -1 : 1));
  const ore = new Map();
  const sedute = [];
  const aggiungi = (d, h) => ore.set(d, (ore.get(d) || 0) + h);
  for (const s of settimane) {
    const chiave = seduteDellaSettimana(s);
    sedute.push(...chiave);
    if (Array.isArray(s.giorni) && s.giorni.length) {
      for (const g of s.giorni) {
        const d = g && (g.giorno || g.data);
        if (typeof d === "string") aggiungi(d, num(g.ore) ? g.ore : num(g.minuti) ? g.minuti / 60 : 0);
      }
      continue;
    }
    const date = Array.from({ length: 7 }, (_, i) => piuGiorni(s.lunedi, i));
    const conChiave = new Set(chiave.map((x) => x.giorno));
    const liberi = date.filter((d) => !conChiave.has(d));
    const resto = liberi.length ? Math.max(0, (num(s.ore) ? s.ore : 0) - somma(chiave, (x) => x.ore)) / liberi.length : 0;
    for (const d of liberi) aggiungi(d, resto);
    for (const x of chiave) aggiungi(x.giorno, x.ore);
  }
  return { settimane, ore, sedute: sedute.sort(perData) };
}

// Il passo della lunga (regola 2.4). La nuova più lunga non supera la più lunga degli ultimi 30
// giorni di più del 20% o di 45 minuti, il valore minore, del 10% con i dolori che tornano.
function passoLunga(piuLunga, dolori = false) {
  const p = PIANO.passoLunga;
  return Math.min(piuLunga * (1 + (dolori ? p.quotaDolori : p.quota)), piuLunga + p.minuti / 60);
}

// Le sedute chiave del piano tagliate dal passo della lunga, partendo dalle uscite vere. Senza uscite
// negli ultimi 30 giorni si parte dalla lunga minima di PIANO.lungaDichiarata.
function lungheDelPiano(vere, sedute, dolori = false) {
  const storia = [...vere];
  const tagliate = [];
  for (const s of [...sedute].sort(perData)) {
    const dal = piuGiorni(s.giorno, -PIANO.passoLunga.giorni);
    const prima = storia.filter((x) => x.giorno >= dal && x.giorno < s.giorno).map((x) => x.ore);
    const ore = Math.min(s.ore, passoLunga(Math.max(PIANO.lungaDichiarata.minimo, ...prima), dolori));
    tagliate.push({ ...s, ore, orePiano: s.ore });
    storia.push({ giorno: s.giorno, ore });
  }
  return tagliate;
}

// Un giorno del piano come attività, per abbinare le prove in programma.
function attivitaDelPiano(s, i) {
  return {
    id: `piano-${i}`, giorno: s.giorno, inizio: `${s.giorno}T08:00:00`, tipo: "Ride", secondi: Math.round(s.ore * ORA),
    borse: s.borse, notteFuori: s.notteFuori, kg: null, rulli: false, eBike: false, stub: false,
    qualita: { secondi: QUALITA.stimata }, inProgramma: true,
  };
}

// Nelle ultime 3 settimane finite del piano meno dell'85% delle sue ore (2.7). rifare è vero se
// succede da due domeniche di fila, e allora il piano si rifà (3.12).
function sottoIlPiano(p, mappa, oggi) {
  const pr = PRONTEZZA.proiezione;
  const n = pr.settimaneControllo;
  const finite = p.settimane.filter((s) => num(s.ore) && piuGiorni(s.lunedi, 6) < oggi);
  const conta = (lista) => {
    const fatte = somma(lista, (s) => oreFra(mappa, s.lunedi, piuGiorni(s.lunedi, 6)));
    const piano = somma(lista, (s) => s.ore);
    return { fatte, piano, sotto: piano > 0 && fatte < pr.sottoPiano * piano - EPS };
  };
  if (finite.length < n) return null;
  const ora = conta(finite.slice(-n));
  if (!ora.sotto) return null;
  let rifare = finite.length >= n + pr.domenicheDiFila - 1;
  for (let i = 1; rifare && i < pr.domenicheDiFila; i++) rifare = conta(finite.slice(-n - i, -i)).sotto;
  return { fatte: ora.fatte, piano: ora.piano, rifare, testo: testoSottoPiano(ora.fatte, ora.piano) };
}

// Cosa manca al quasi pronto, in una frase.
function cosaManca(p) {
  const n = ORDINE_PILASTRI.find((x) => p[x].difetto > 0);
  if (n === "borse") return testoManca("borse", { righe: p.borse.righe });
  if (n === "continuita") return testoManca("continuita", { giorni: p.continuita.valore });
  return testoManca(n);
}

// --- Prima della vigilia, dove arrivi (2.7) ---

// Dove si arriva con il piano. giorni sono i giorni con le ore (o le attività), piano quello di
// js/piano.js (vedi leggiPiano), h le ore della giornata. opzioni ha uscite (le attività pulite, per
// lunga e prove), esperienza, debriefing, borseKg, primoGiorno, eBikeEvento, doloriCheTornano e
// proposta, per la frase del poco pronto. Le ore si contano fatte fino a oggi e del piano da domani.
// Restituisce { fase, base, storiaCorta, pilastri, esito, difetti, frase, frasi, righe, sottoPiano,
// picco }. Con meno di 3 settimane di storia pilastri ed esito sono null.
export function proiezione(giorni, piano, oggi, partenza, h, classe, opzioni = {}) {
  const {
    uscite = [], esperienza = false, debriefing = [], borseKg = null, eBikeEvento = false,
    doloriCheTornano = false, proposta = null, primoGiorno = null,
  } = opzioni;
  const ob = obiettivi(h, classe, esperienza, { borseKg });
  if (!ob || !partenza || !oggi) return null;
  const pr = PRONTEZZA.proiezione;
  const base = giorniFra(oggi, partenza) / 7 > (classe === UNDICI ? pr.baseOltreDaUndici : pr.baseOltre) + EPS;
  const primo = primoGiorno || primaData(uscite);
  const vuota = { fase: "proiezione", base, obiettivi: ob, pilastri: null, esito: null, difetti: null, righe: [], sottoPiano: null, picco: null };
  if (!primo || giorniFra(primo, oggi) < 7 * pr.storiaMinima) {
    return { ...vuota, storiaCorta: true, frase: PROIEZIONE.storiaCorta, frasi: [PROIEZIONE.storiaCorta] };
  }
  const mappa = oreGiorni(Array.isArray(giorni) && giorni.length ? giorni : uscite, { eBikeEvento });
  const p = leggiPiano(piano);
  const previste = (dal, al) => {
    let ore = 0;
    for (let d = dal; d <= al; d = piuGiorni(d, 1)) ore += p.ore.get(d) || 0;
    return ore;
  };
  const domani = piuGiorni(oggi, 1);

  // Le ore a settimana. Nella base si dà per fatto tutto il piano. Prima della −10 le ore del piano
  // pesano per quanto delle ultime 4 settimane si è fatto. Dopo, le fatte più quelle del piano.
  const v = finestra(partenza, PRONTEZZA.finestre.volume);
  let ore;
  if (base) {
    ore = previste(v.dal, v.al);
  } else if (oggi < v.dal) {
    const dal = piuGiorni(oggi, -7 * pr.settimaneConfronto);
    const ieri = piuGiorni(oggi, -1);
    const delPiano = previste(dal, ieri);
    ore = (delPiano > 0 ? Math.min(1, oreFra(mappa, dal, ieri) / delPiano) : 1) * previste(v.dal, v.al);
  } else {
    ore = oreFra(mappa, v.dal, minore(oggi, v.al)) + (domani <= v.al ? previste(maggiore(domani, v.dal), v.al) : 0);
  }
  const volume = conVolume(ore / SETTIMANE_VOLUME, ob, { proiezione: true });

  // L'uscita lunga, la più lunga fatta o il picco del piano entro la −3, con il passo della lunga
  // dalle uscite vere.
  const fl = finestra(partenza, daSei(classe) ? PRONTEZZA.finestre.lungaDaSei : PRONTEZZA.finestre.lunga);
  const fatta = lungaFra(uscite, fl.dal, minore(oggi, fl.al), { eBikeEvento });
  const future = p.sedute.filter((s) => s.giorno > oggi && s.giorno < partenza && s.possibile);
  const tagliate = lungheDelPiano(lunghePerGiorno(uscite, oggi, { eBikeEvento }), future, doloriCheTornano);
  const nellaFinestra = tagliate.filter((s) => s.giorno >= fl.dal && s.giorno <= fl.al);
  const picco = Math.max(0, ...nellaFinestra.map((s) => s.ore));
  const soglia = PRONTEZZA.pilastri.lunga.difetto0Da * ob.lt;
  const arrivo = fatta.ore + EPS >= soglia ? null : nellaFinestra.find((s) => s.ore + EPS >= soglia) || null;
  const lunga = conLunga(fatta, ob, { valore: Math.max(fatta.ore, picco), dataPiano: arrivo ? arrivo.giorno : null, proiezione: true, picco });

  // Le prove fatte e quelle che il piano mette in un giorno in cui si può uscire.
  const passate = (Array.isArray(uscite) ? uscite : []).filter((a) => a && giornoDi(a) && giornoDi(a) <= oggi);
  const inProgramma = tagliate.filter((s) => s.borse === "evento").map(attivitaDelPiano);
  const borse = pilastroBorse([...passate, ...inProgramma], partenza, h, classe, esperienza, debriefing, { borseKg, eBikeEvento, oggi, proiezione: true });

  const continuita = conContinuita(mappa, partenza, oggi);
  const pilastri = { volume, lunga, borse, continuita };
  const giudizio = verdetto(pilastri, { classe, esperienza });
  const frase = fraseProiezione(giudizio.esito, { manca: giudizio.esito === "quasiPronto" ? cosaManca(pilastri) : null, proposta });
  return {
    ...vuota,
    storiaCorta: false,
    pilastri,
    esito: giudizio.esito,
    difetti: giudizio.difetti,
    frase,
    frasi: [base ? PROIEZIONE.base : null, frase].filter(Boolean),
    righe: giudizio.righe,
    sottoPiano: sottoIlPiano(p, mappa, oggi),
    picco,
  };
}

// --- Più giorni, il percorso corto, partire e adattare (2.8) ---

const tettoPer = (giorni) => (giorni > PRONTEZZA.classiFinoA[2] ? PRONTEZZA.giorniConsigliati.tettoHDaUndici : PRONTEZZA.giorniConsigliati.tettoH);

// I limiti che restano con un certo numero di giorni, fra «tetto», «tempo» e «lunga».
function limitiCon(n, { T, vMinPer, oreDisponibili, lRif }) {
  const restano = [];
  if (T / n > tettoPer(n) + EPS) restano.push("tetto");
  if (num(oreDisponibili) && vMinPer(n) > oreDisponibili + EPS) restano.push("tempo");
  if (num(lRif) && T / n > PRONTEZZA.giorniConsigliati.fattoreLunga * lRif + EPS) restano.push("lunga");
  return restano;
}

// I giorni consigliati G*, il più grande fra i giorni scelti, il minimo con H entro il tetto di buon
// senso, il minimo con V_min entro le ore disponibili e T / (1,5 × L_rif) per eccesso, mai oltre i
// giorni massimi del percorso. vMinPerGiorni dà V_min per un numero di giorni (di default con la
// classe di quei giorni), lRif sono le ore dell'uscita di riferimento, null se non si conosce.
// Restituisce { giorni, motivo, H, restano }, con motivo fra «tetto», «tempo», «lunga» e null, e
// restano i limiti che valgono ancora ai giorni consigliati.
export function giorniConsigliati({ percorso = null, giorni, T, vMinPerGiorni = null, oreDisponibili = null, lRif = null } = {}) {
  const scelti = num(giorni) && giorni >= 1 ? giorni : 1;
  if (!num(T) || T <= 0) return { giorni: scelti, motivo: null, H: null, restano: [] };
  const massimo = percorso && num(percorso.giorniMax) ? Math.max(percorso.giorniMax, scelti) : Math.max(GIORNI_RICERCA, scelti);
  const vMinPer = typeof vMinPerGiorni === "function"
    ? vMinPerGiorni
    : (n) => obiettivi(T / n, classeEvento(n)).vMin;
  const ctx = { T, vMinPer, oreDisponibili, lRif };
  const primo = (motivo) => {
    for (let n = 1; n <= massimo; n++) if (!limitiCon(n, ctx).includes(motivo)) return n;
    return massimo;
  };
  const candidati = [{ motivo: null, n: scelti }, { motivo: "tetto", n: primo("tetto") }];
  if (num(oreDisponibili)) candidati.push({ motivo: "tempo", n: primo("tempo") });
  if (num(lRif)) {
    const n = lRif > 0 ? Math.ceil(T / (PRONTEZZA.giorniConsigliati.fattoreLunga * lRif) - EPS) : Infinity;
    candidati.push({ motivo: "lunga", n: Math.min(n, massimo) });
  }
  const scelta = candidati.reduce((m, c) => (c.n > m.n ? c : m));
  const n = Math.min(scelta.n, massimo);
  return { giorni: n, motivo: n > scelti ? scelta.motivo : null, H: T / n, restano: limitiCon(n, ctx) };
}

// L'uscita di riferimento L_rif. Con 8 settimane o meno alla partenza la più lunga delle ultime 6
// settimane. Prima il picco che il piano può raggiungere entro la −3 con il passo della lunga, dalle
// sedute del piano se c'è, altrimenti una lunga a settimana con uno scarico ogni 4 (ogni 3 da 50
// anni). Restituisce { ore, giorno, dalPiano }.
export function lungaRiferimento({ uscite = [], oggi, partenza, piano = null, eta = null, eBikeEvento = false, doloriCheTornano = false } = {}) {
  const gc = PRONTEZZA.giorniConsigliati;
  if (giorniFra(oggi, partenza) <= 7 * gc.settimaneLRif) {
    const l = lungaFra(uscite, piuGiorni(oggi, -7 * gc.settimaneLunga + 1), oggi, { eBikeEvento });
    return { ore: l.ore, giorno: l.giorno, dalPiano: false };
  }
  const fine = finestra(partenza, PRONTEZZA.finestre.volume).al;
  const l30 = lungaFra(uscite, piuGiorni(oggi, -PIANO.passoLunga.giorni + 1), oggi, { eBikeEvento }).ore;
  const sedute = leggiPiano(piano).sedute.filter((s) => s.giorno > oggi && s.giorno <= fine && s.possibile);
  if (sedute.length) {
    const tagliate = lungheDelPiano(lunghePerGiorno(uscite, oggi, { eBikeEvento }), sedute, doloriCheTornano);
    return { ore: Math.max(l30, ...tagliate.map((s) => s.ore)), giorno: null, dalPiano: true };
  }
  const ogni = (num(eta) && eta >= PIANO.scarico.daAnni ? PIANO.scarico.ogniDaAnni50 : PIANO.scarico.ogni) + 1;
  let ore = Math.max(l30, PIANO.lungaDichiarata.minimo);
  for (let i = 1; i <= Math.floor(giorniFra(oggi, fine) / 7); i++) if (i % ogni) ore = passoLunga(ore, doloriCheTornano);
  return { ore, giorno: null, dalPiano: true };
}

// I percorsi corti dello stesso evento, dal più lungo.
function percorsiCorti(percorso, catalogo) {
  const lista = Array.isArray(catalogo) ? catalogo : [];
  const ids = Object.hasOwn(PRONTEZZA.percorsiCorti, percorso.id) ? PRONTEZZA.percorsiCorti[percorso.id] : null;
  const corti = ids
    ? ids.map((id) => lista.find((p) => p.id === id)).filter(Boolean)
    : lista.filter((p) => p.id !== percorso.id && p.evento === percorso.evento && p.km < percorso.km);
  return [...corti].sort((a, b) => b.km - a.km);
}

// Il percorso corto dello stesso evento, il più lungo per cui ai suoi giorni massimi H non supera
// 1,5 × L_rif né il tetto, V_min sta nelle ore disponibili e il verdetto non resta poco pronto.
// opzioni ha oreDisponibili, esperienza, valuta(h, classe, percorso, giorni), che restituisce l'esito
// con quella giornata, e per le ore stimaPer(percorso, giorni), che dà T o una stima, oppure atleta,
// uscite, prove e oggi per stimaH. Restituisce { esito «corto», percorso, giorni, T, H } oppure
// { esito «arrivare e adattare» }.
export function percorsoCorto(percorso, catalogo = CATALOGO, profilo = {}, lRif = null, opzioni = {}) {
  const adattare = { esito: ARRIVARE_E_ADATTARE };
  if (!percorso) return adattare;
  const { oreDisponibili = null, esperienza = false, valuta = null, stimaPer = null } = opzioni;
  for (const corto of percorsiCorti(percorso, catalogo)) {
    const giorni = corto.giorniMax;
    const stima = typeof stimaPer === "function"
      ? stimaPer(corto, giorni)
      : stimaH({ percorso: corto, giorni, profilo, atleta: opzioni.atleta || null, uscite: opzioni.uscite || [], prove: opzioni.prove || null, oggi: opzioni.oggi });
    const T = num(stima) ? stima : stima && num(stima.T) ? stima.T : null;
    if (!num(T) || !(giorni >= 1)) continue;
    const H = T / giorni;
    const classe = classeEvento(giorni);
    if (num(lRif) && H > PRONTEZZA.giorniConsigliati.fattoreLunga * lRif + EPS) continue;
    if (H > tettoPer(giorni) + EPS) continue;
    if (num(oreDisponibili) && obiettivi(H, classe, esperienza).vMin > oreDisponibili + EPS) continue;
    if (typeof valuta === "function" && valuta(H, classe, corto, giorni) === "pocoPronto") continue;
    return { esito: "corto", percorso: corto, giorni, T, H };
  }
  return adattare;
}

// La proposta, quando il verdetto o la proiezione dicono poco pronto, quando le ore disponibili
// stanno sotto V_min o quando il piano non porta la lunga dove serve. Prima più giorni, fino a
// quanti tolgono il poco pronto, poi il percorso corto, poi partire e adattare. Restituisce { tipo
// «giorni», «corto» o «adattare», giorni (i consigliati, solo se più degli scelti), motivo, H, lRif,
// lRifDalPiano, corto } oppure null.
function proponi(c) {
  const vMinPer = (n) => {
    const o = obiettivi(c.T / n, classeEvento(n), c.esperienza, { borseKg: c.borseKg });
    return o ? o.vMin : Infinity;
  };
  const consiglio = giorniConsigliati({ percorso: c.percorso, giorni: c.giorni, T: c.T, vMinPerGiorni: vMinPer, oreDisponibili: c.oreDisponibili, lRif: c.lRif.ore });
  const massimo = c.percorso && num(c.percorso.giorniMax) ? Math.max(c.percorso.giorniMax, c.giorni) : consiglio.giorni;
  const esitoCon = (n) => c.valuta(c.T / n, classeEvento(n), c.percorso, n);
  let giorni = consiglio.giorni > c.giorni ? consiglio.giorni : null;
  let motivo = giorni ? consiglio.motivo : null;
  const comune = { lRif: c.lRif.ore, lRifDalPiano: c.lRif.dalPiano };
  const limiti = limitiCon(massimo, { T: c.T, vMinPer, oreDisponibili: c.oreDisponibili, lRif: c.lRif.ore });
  if (!limiti.length && esitoCon(massimo) !== "pocoPronto") {
    const adesso = giorni ? esitoCon(giorni) : c.esito;
    if (adesso === "pocoPronto") {
      for (let n = (giorni || c.giorni) + 1; n <= massimo; n++) {
        if (esitoCon(n) !== "pocoPronto") {
          giorni = n;
          motivo = "uscite";
          break;
        }
      }
    }
    return giorni ? { tipo: "giorni", giorni, motivo, H: c.T / giorni, ...comune } : null;
  }
  const extra = { giorni, motivo, H: giorni ? c.T / giorni : null, ...comune };
  const corto = percorsoCorto(c.percorso, c.catalogo, c.profilo, c.lRif.ore, {
    oreDisponibili: c.oreDisponibili, esperienza: c.esperienza, valuta: c.valuta, stimaPer: c.stimaPer,
    atleta: c.atleta, uscite: c.uscite, prove: c.prove, oggi: c.oggi,
  });
  if (corto.esito === "corto") return { tipo: "corto", ...extra, corto, percorso: corto.percorso };
  return { tipo: "adattare", ...extra };
}

// --- Gli altri numeri, che non decidono (2.6) ---

// Il confronto con la Fitness. Minimo = k × V_min / 7, comodo = k × V_comodo / 7, con k i punti per
// ora della persona (40 senza dati). Nello scarico finale si confronta la Fitness divisa per 0,9.
// Restituisce { minimo, comodo, k, fitness, confronto, inTapering, esito }, con esito «sotto»,
// «inLinea» o «sopra», null senza Fitness.
export function specchio(k, vMin, vComodo, fitness, inTapering = false) {
  const kk = num(k) && k > 0 ? k : CARICO.puntiOraSenzaDati;
  const fuori = { minimo: (kk * vMin) / 7, comodo: (kk * vComodo) / 7, k: kk, fitness: num(fitness) ? fitness : null, inTapering: Boolean(inTapering) };
  if (!num(fitness)) return { ...fuori, confronto: null, esito: null };
  const confronto = inTapering ? fitness / PRONTEZZA.specchi.divisoreTapering : fitness;
  const esito = confronto < fuori.minimo - EPS ? "sotto" : confronto > fuori.comodo + EPS ? "sopra" : "inLinea";
  return { ...fuori, confronto, esito };
}

// I due avvisi sul confronto. Fitness alta con uscita lunga o prove che mancano, oppure le ore che ci
// sono con la Fitness sotto 0,7 × il minimo, che chiede lo sforzo dei giri.
export function avvisiFitness(confronto, pilastri) {
  const avvisi = [];
  if (!confronto || !num(confronto.confronto) || !pilastri) return avvisi;
  const { volume, lunga, borse } = pilastri;
  if (confronto.confronto + EPS >= confronto.minimo && ((lunga && lunga.difetto) || (borse && borse.difetto))) {
    avvisi.push({ tipo: "intensita", testo: AVVISI_FITNESS.intensita });
  }
  if (volume && volume.difetto === 0 && confronto.confronto < PRONTEZZA.specchi.sottoSpecchio * confronto.minimo - EPS) {
    avvisi.push({ tipo: "sforzo", testo: AVVISI_FITNESS.sforzo });
  }
  return avvisi;
}

// Le sedute di palestra con le gambe delle ultime 8 settimane. Senza risposta su cosa si è allenato
// vale corpo intero (6.3).
export function contaPalestra(attivita, oggi) {
  const dal = piuGiorni(oggi, -7 * PRONTEZZA.specchi.palestraSettimane + 1);
  return (Array.isArray(attivita) ? attivita : [])
    .filter((a) => a && inPalestra(a) && a.allenato !== "alto" && giornoDi(a) >= dal && giornoDi(a) <= oggi).length;
}

// Le uscite di almeno 4 ore negli ultimi 28 giorni (regola 1.11).
export function contaDurabilita(uscite, oggi, { eBikeEvento = false } = {}) {
  const d = PRONTEZZA.specchi.durabilita;
  const dal = piuGiorni(oggi, -d.giorni + 1);
  let n = 0;
  for (const [giorno, attivita] of perGiorno(uscite)) {
    if (giorno >= dal && giorno <= oggi) n += giriUniti(attivita, giorno, { eBikeEvento }).filter((g) => g.secondi + EPS >= d.ore * ORA).length;
  }
  return n;
}

// Le uscite dalla settimana −10 con la risposta «Bene» a «Lo stomaco?» (regola 8.11). Il campo
// stomaco sta sull'attività, con «bene», «cosi» o «male».
export function contaStomaco(uscite, partenza, oggi) {
  const dal = piuGiorni(partenza, 7 * PRONTEZZA.specchi.stomacoDa);
  return (Array.isArray(uscite) ? uscite : [])
    .filter((a) => a && a.stomaco === "bene" && giornoDi(a) >= dal && giornoDi(a) <= oggi && giornoDi(a) < partenza).length;
}

// I giorni dello scarico finale (3.6). 7 per un giorno, 16 da 55 anni, 10 sotto le 5 ore a settimana.
function giorniDelloScarico(classe, vRif, eta) {
  const t = PIANO.tapering;
  if (classe === UN_GIORNO) return t.unGiorno.giorni;
  if (num(eta) && eta >= t.lungo.daAnni) return t.lungo.giorni;
  if (num(vRif) && vRif < t.corto.sottoOre) return t.corto.giorni;
  return t.normale.giorni;
}

// --- Tutto insieme ---

// Un evento già fatto con l'app, cioè almeno due giorni di fila in modalità evento prima di oggi.
function eventoFatto(uscite, oggi) {
  const giorni = [...new Set((Array.isArray(uscite) ? uscite : [])
    .filter((a) => a && a.modoEvento === true && giornoDi(a) && (!oggi || giornoDi(a) < oggi))
    .map(giornoDi))].sort();
  return giorni.some((d, i) => i > 0 && giorniFra(giorni[i - 1], d) === 1);
}

// Le borse dell'obiettivo in kg. Per un obiettivo libero quelle del percorso libero (il giro «anche
// con le borse» o i giorni di fila), altrimenti quelle della stima, poi del profilo, poi del catalogo.
// Le usa anche js/piano.js, così piano e verdetto chiedono le stesse prove.
export function borseDellObiettivo(stima, profilo = {}, percorso = null) {
  if (percorso && percorso.libero) {
    const kg = percorso.modello ? percorso.modello.borseKg : percorso.borseKg;
    return num(kg) ? kg : 0;
  }
  const avviso = stima && Array.isArray(stima.avvisi) ? stima.avvisi.find((a) => a.tipo === "borse") : null;
  if (avviso && num(avviso.kg)) return avviso.kg;
  if (num(profilo.borseKg)) return profilo.borseKg;
  return percorso && percorso.modello && num(percorso.modello.borseKg) ? percorso.modello.borseKg : 0;
}

// Le settimane dalla −10 alla −3 che cominciano dal primo giorno con dati in poi.
function settimaneConDati(primo, partenza) {
  if (!primo) return 0;
  const f = PRONTEZZA.finestre.volume;
  let n = 0;
  for (let k = f.da; k <= f.a; k++) if (piuGiorni(partenza, 7 * k) >= primo) n += 1;
  return n;
}

// Tutto «Pronto?» in una chiamata, per la pagina e per le prove. dati ha percorso, giorni, partenza,
// oggi, uscite (le attività pulite di js/dati.js), benessere (i giorni puliti, per il primo giorno
// con dati), piano, profilo, atleta, prove, stima (se manca la calcola stimaH), esperienza (la
// risposta del primo avvio, altrimenti profilo.esperienza), debriefing, oreDisponibili (le ore A),
// fitness (quella di Come sto), k, eta, catalogo, primoGiorno, stimaPer e doloriCheTornano.
// Il verdetto c'è quando la settimana −3 è finita, prima c'è la proiezione. Restituisce { fase
// «verdetto», «proiezione», «nonValutabile» o «senzaData», esito, classe, giorni, H, T, obiettivi,
// esperienza, pilastri, righe (le righe dei pilastri con la palestra, anche nella proiezione),
// verdetto, fiducia, proiezione, proposta, confronto, avvisi, palestra, durabilita, stomaco }.
export function valutaProntezza(dati = {}) {
  const {
    percorso = null, giorni: scelti = null, partenza = null, oggi = oggiIso(), uscite = [], benessere = [], piano = null,
    profilo = {}, atleta = null, prove = null, esperienza = null, debriefing = [], oreDisponibili = null,
    fitness = null, k = null, eta = null, catalogo = CATALOGO, primoGiorno = null, stimaPer = null,
    doloriCheTornano = false,
  } = dati;
  const stima = dati.stima || (percorso ? stimaH({ percorso, giorni: scelti, profilo, atleta, uscite, prove, oggi }) : null);
  const G = num(scelti) ? scelti : stima && num(stima.giorni) ? stima.giorni : null;
  const classe = classeEvento(G);
  const H = stima && num(stima.H) && stima.H > 0 ? stima.H : null;
  const T = stima && num(stima.T) ? stima.T : H !== null && G ? H * G : null;
  const esperto = haEsperienza(esperienza ?? profilo.esperienza) || eventoFatto(uscite, oggi);
  const eBikeEvento = profilo.ebike === true || Boolean(stima && stima.fonte && stima.fonte.tipo === "ebike");
  const borseKg = borseDellObiettivo(stima, profilo, percorso);
  const ob = H !== null ? obiettivi(H, classe, esperto, { borseKg }) : null;
  const primo = primoGiorno || primaData(uscite, benessere);
  const fino = partenza ? minore(oggi, piuGiorni(partenza, -1)) : oggi;
  const risultato = {
    classe, giorni: G, H, T, obiettivi: ob, esperienza: esperto,
    pilastri: null, righe: [], verdetto: null, fiducia: null, proiezione: null, proposta: null, confronto: null, avvisi: [],
    palestra: contaPalestra(uscite, fino), durabilita: contaDurabilita(uscite, fino, { eBikeEvento }),
    stomaco: partenza ? contaStomaco(uscite, partenza, oggi) : 0,
  };
  if (!partenza) return { ...risultato, fase: "senzaData", esito: null };
  if (H === null) {
    const motivo = stima && stima.fonte && stima.fonte.tipo === "ebike" ? "ebike" : "giornata";
    return { ...risultato, fase: "nonValutabile", esito: "nonValutabile", verdetto: verdetto(null, { motivo }) };
  }

  const opz = { oggi, eBikeEvento, borseKg };
  // I giorni con le ore, dal primo dato (o dalla settimana −16) a ieri, per i pilastri, la fiducia
  // e le settimane passate del piano.
  const dal = minore(piuGiorni(partenza, 7 * PRIMA_SETTIMANA), minore(primo || oggi, piuGiorni(oggi, -7 * PRONTEZZA.proiezione.settimaneConfronto)));
  const giorniB = giorniDiBici(uscite, { dal, al: piuGiorni(partenza, -1), eBikeEvento });
  // Le ore scelte dalla persona, con l'obiettivo libero a ore o la e-bike, non sono una stima.
  const oreDette = Boolean(stima.fonte && ["scelta", "ebike"].includes(stima.fonte.tipo));
  const fiducia = fiduciaVerdetto(giorniB, uscite, oreDette ? null : num(stima.livello) ? stima.livello : 0, { partenza, oggi, primoGiorno: primo, eBikeEvento });
  const vigilia = oggi > finestra(partenza, PRONTEZZA.finestre.volume).al;
  const contesto = { classe, esperienza: esperto, vigilia, palestra: risultato.palestra };
  const proietta = (h, cl, proposta = null) => proiezione(giorniB, piano, oggi, partenza, h, cl, {
    uscite, esperienza: esperto, debriefing, borseKg, eBikeEvento, doloriCheTornano, primoGiorno: primo, proposta,
  });
  let fase;
  let pilastri;
  let giudizio;
  let proiettata = null;
  let valuta;
  if (vigilia) {
    if (settimaneConDati(primo, partenza) < PRONTEZZA.verdetto.settimaneMinime) {
      return { ...risultato, fase: "nonValutabile", esito: "nonValutabile", fiducia, verdetto: verdetto(null, { motivo: "settimane" }) };
    }
    const calcola = (h, cl) => {
      const o = obiettivi(h, cl, esperto, { borseKg });
      return {
        volume: pilastroVolume(giorniB, partenza, o, opz),
        lunga: pilastroLunga(uscite, partenza, cl, o, opz),
        borse: pilastroBorse(uscite, partenza, h, cl, esperto, debriefing, opz),
        continuita: pilastroContinuita(giorniB, partenza, opz),
      };
    };
    pilastri = calcola(H, classe);
    valuta = (h, cl) => verdetto(calcola(h, cl), { classe: cl, esperienza: esperto }).esito;
    giudizio = verdetto(pilastri, contesto);
    fase = "verdetto";
  } else {
    proiettata = proietta(H, classe);
    if (proiettata.storiaCorta) return { ...risultato, fase: "proiezione", esito: null, fiducia, proiezione: proiettata };
    pilastri = proiettata.pilastri;
    valuta = (h, cl) => proietta(h, cl).esito;
    giudizio = verdetto(pilastri, contesto);
    fase = "proiezione";
  }

  const soglia = PRONTEZZA.pilastri.lunga.difetto0Da * ob.lt;
  const serve = giudizio.esito === "pocoPronto"
    || (num(oreDisponibili) && oreDisponibili + EPS < ob.vMin)
    || (fase === "proiezione" && pilastri.lunga.valore + EPS < soglia);
  const proposta = serve
    ? proponi({
      percorso, giorni: G, T, esperienza: esperto, borseKg, oreDisponibili, catalogo, valuta, stimaPer, profilo, atleta, uscite, prove, oggi,
      esito: giudizio.esito,
      lRif: lungaRiferimento({ uscite, oggi, partenza, piano, eta, eBikeEvento, doloriCheTornano }),
    })
    : null;
  if (proposta && fase === "verdetto") giudizio = verdetto(pilastri, { ...contesto, proposta });
  if (proposta && fase === "proiezione") proiettata = proietta(H, classe, proposta);

  const inTapering = oggi < partenza && giorniFra(oggi, partenza) <= giorniDelloScarico(classe, pilastri.volume.valore, eta);
  const confronto = specchio(num(k) ? k : puntiOra(uscite, oggi), ob.vMin, ob.vComodo, fitness, inTapering);
  return {
    ...risultato,
    fase,
    pilastri,
    righe: giudizio.righe,
    verdetto: fase === "verdetto" ? giudizio : null,
    esito: giudizio.esito,
    fiducia,
    proiezione: proiettata,
    proposta,
    confronto,
    avvisi: [...pilastri.borse.avvisi, ...avvisiFitness(confronto, pilastri)],
  };
}
