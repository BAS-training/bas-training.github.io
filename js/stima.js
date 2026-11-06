// Le ore in sella con la bici carica, il capitolo 1 della specifica della preparazione.
// Dai km e dal dislivello ufficiali, dai giorni scelti, dalle masse e dal passo della persona nasce
// H, la giornata media in movimento, da cui partono obiettivi e piano. Mai la traccia.
// Funzioni pure, senza DOM e senza window, provate con node (test/stima.test.mjs).
// Tutti i numeri stanno in js/parametri.js, nei gruppi STIMA, PASSO e BORSE.

import { STIMA, PASSO, BORSE, DATI } from "./parametri.js?v=202611061254";

const ORA = 3600;                 // secondi in un'ora
const KMH = 3.6;                  // da m/s a km/h
const GIORNO_MS = 86400000;

const num = (v) => typeof v === "number" && Number.isFinite(v);
const limita = (x, minimo, massimo) => Math.min(massimo, Math.max(minimo, x));
const somma = (lista, f) => lista.reduce((s, x) => s + f(x), 0);

function mediana(valori) {
  const v = [...valori].sort((a, b) => a - b);
  const n = v.length;
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
}

function utc(iso) {
  const [a, m, g] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}

const giorniFra = (da, a) => Math.round((utc(a) - utc(da)) / GIORNO_MS);

function oggiIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Il giorno di un'attività, dal campo di js/dati.js o dall'inizio.
function giornoDi(u) {
  if (typeof u.giorno === "string") return u.giorno;
  if (typeof u.d === "string") return u.d;
  return typeof u.inizio === "string" ? u.inizio.slice(0, 10) : null;
}

// Dentro gli ultimi n giorni, oggi compreso.
function entro(giorno, oggi, n) {
  if (!giorno || !oggi) return true;
  const fa = giorniFra(giorno, oggi);
  return fa >= 0 && fa < n;
}

const tipoDi = (u) => u.tipoCorretto || u.tipo || null;

// --- Arrotondamenti ---

// La metà esatta va in su. Il piccolo margine tiene la metà anche quando il conto in virgola
// mobile la sfiora da sotto.
function arrotondaA(valore, passo) {
  return Math.floor(valore / passo + 0.5 + 1e-9) * passo;
}

export function arrotondaMezzora(ore) {
  return arrotondaA(ore, STIMA.arrotonda.ore);
}

// G_eff = G − 0,4 × parte intera di G / 6, da 11 giorni (1.1, regola 3.4).
export function giorniEffettivi(g) {
  const r = STIMA.giorniEffettivi;
  return g >= r.daGiorni ? g - r.riduzione * Math.floor(g / r.ogni) : g;
}

// --- La fisica, passi 3-6 di 1.5 ---

function classe(nome) {
  const c = Object.hasOwn(STIMA.classi, nome) ? STIMA.classi[nome] : null;
  if (!c) throw new Error(`Classe di fondo sconosciuta, ${nome}`);
  return c;
}

// Una classe per nome, oppure già risolta con fs e c, come un percorso con C e Fs propri.
const risolvi = (cl) => (typeof cl === "string" ? classe(cl) : cl);

function deltaCda(borseKg, laterali) {
  if (!(borseKg > 0)) return 0;
  const b = STIMA.cdaBorse;
  return laterali ? b.laterali : Math.min(b.perKg * borseKg, b.massimo);
}

// V0 in km/h, la velocità in piano su asfalto liscio. massa è la massa totale, borseKg serve
// solo all'aria delle borse. Bisezione su 0,5 ρ CdA v³ + M g Crr v = η P (passo 3).
export function v0(potenza, massa, borseKg = 0, laterali = false) {
  const aria = 0.5 * STIMA.densitaAria * (STIMA.cda + deltaCda(borseKg, laterali));
  const rotolamento = massa * STIMA.gravita * STIMA.crr;
  const spinta = STIMA.rendimento * potenza;
  let basso = STIMA.bisezioneV0.minimo;
  let alto = STIMA.bisezioneV0.massimo;
  for (let i = 0; i < STIMA.bisezioneV0.passi; i++) {
    const v = (basso + alto) / 2;
    if (aria * v ** 3 + rotolamento * v < spinta) basso = v;
    else alto = v;
  }
  return ((basso + alto) / 2) * KMH;
}

// C(P) = C della classe × (1 + 0,002 × (122 − P)), con il fattore fra 0,9 e 1,1 (passo 5).
export function costanteSalita(cl, potenza) {
  const k = STIMA.costanteSalita;
  return risolvi(cl).c * limita(1 + k.perWatt * (k.potenza - potenza), k.minimo, k.massimo);
}

function partiFormula({ km, metri, potenza, massa, borseKg = 0, laterali = false, classe: cl }) {
  const c = risolvi(cl);
  const piano = (km * c.fs) / v0(potenza, massa, borseKg, laterali);
  const salita = ((metri / 100) * costanteSalita(c, potenza)) / (potenza / massa) / 60;
  return { piano, salita, ore: piano + salita };
}

// T_formula = K × Fs / V0 + (S / 100) × C(P) / (P / M) / 60, in ore (passo 6).
export function oreFormula(dati) {
  return partiFormula(dati).ore;
}

// --- Masse e percorso, 1.2 e 1.3 ---

// Il peso a fasce del profilo, mai quello di intervals.icu. pesoKg vale il numero, pesoFascia
// l'indice della fascia (0 sotto 60 ... 5 da 100 in su), senza risposta 75 kg.
export function massaCiclista(profilo = {}) {
  if (num(profilo.pesoKg) && profilo.pesoKg > 0) return profilo.pesoKg;
  const centri = STIMA.masse.pesoFasce.centri;
  if (Number.isInteger(profilo.pesoFascia) && num(centri[profilo.pesoFascia])) return centri[profilo.pesoFascia];
  return STIMA.masse.ciclista;
}

function massaBici(profilo, predefinita) {
  if (num(profilo.biciKg) && profilo.biciKg > 0) return profilo.biciKg;
  if (typeof profilo.bici === "string" && Object.hasOwn(STIMA.masse.bici, profilo.bici)) return STIMA.masse.bici[profilo.bici];
  return predefinita;
}

function masseDi(percorso, profilo = {}) {
  const m = percorso.modello;
  const ciclista = massaCiclista(profilo);
  const bici = massaBici(profilo, m.biciKg);
  const borse = num(profilo.borseKg) && profilo.borseKg >= 0 ? profilo.borseKg : m.borseKg;
  return {
    ciclista,
    cb: ciclista + bici,
    borse,
    acqua: m.acquaCiboKg,
    laterali: borse > 0 && profilo.borseTipo === "laterali",
  };
}

// K, S con il fattore del dislivello (passo 2) e la classe, con C e Fs propri se il catalogo li ha.
// Il dislivello di lavoro entra nel conto quando l'ufficiale manca, e non esce mai di qui.
function datiPercorso(percorso) {
  const m = percorso.modello;
  const ufficiale = num(percorso.dislivello) ? percorso.dislivello : null;
  const base = ufficiale ?? (num(m.dislivelloLavoro) ? m.dislivelloLavoro : null);
  if (!num(percorso.km) || percorso.km <= 0 || base === null) throw new Error(`Percorso senza km o dislivello, ${percorso.id}`);
  const c = classe(m.classe);
  return {
    km: percorso.km,
    metri: base * (num(m.fattoreDislivello) ? m.fattoreDislivello : 1),
    ufficiale,
    classe: { ...c, fs: num(m.fs) ? m.fs : c.fs, c: num(m.c) ? m.c : c.c },
  };
}

// β delle borse, 0,04 fino a 8 m per km e 0,075 da 15, in mezzo sui m per km, × 87 / M_cb (regole 6.2 e 6.3).
function beta(metriPerKm, mcb) {
  const b = STIMA.beta;
  const t = limita((metriPerKm - b.metriPerKmBasso) / (b.metriPerKmAlto - b.metriPerKmBasso), 0, 1);
  return ((b.basso + t * (b.alto - b.basso)) * b.massaRiferimento) / mcb;
}

// T di tutto il percorso. Con il fattore carico personale il passo 8, altrimenti il passo 7,
// il più alto fra la formula con le borse e la formula scarica con la regola 6.3.
export function oreTotali({ percorso, profilo = {}, potenza, fattoreCarico = null }) {
  const d = datiPercorso(percorso);
  const m = masseDi(percorso, profilo);
  const base = { km: d.km, metri: d.metri, potenza, classe: d.classe };
  const senza = partiFormula({ ...base, massa: m.cb + m.acqua });
  const fattore = num(fattoreCarico) ? fattoreCarico : (fattoreCarico && num(fattoreCarico.fattore) ? fattoreCarico.fattore : null);
  if (fattore !== null) return senza.ore * fattore;
  if (!(m.borse > 0)) return senza.ore;
  const conBorse = oreFormula({ ...base, massa: m.cb + m.borse + m.acqua, borseKg: m.borse, laterali: m.laterali });
  let regola = senza.ore * (1 + (beta(d.metri / d.km, m.cb) * m.borse) / STIMA.beta.ogniKg);
  if (m.laterali) regola += STIMA.lateraliPiano * senza.piano;   // regola 6.4
  return Math.max(conBorse, regola);
}

// --- La potenza della giornata, 1.4, 1.6 e 1.7 ---

// La potenza per cui le ore previste tornano con quelle vere. Le ore previste calano quando la
// potenza cresce, quindi la bisezione converge sempre.
function bisezionePotenza(previste, oreVere) {
  const b = PASSO.bisezione;
  let basso = b.minimo;
  let alto = b.massimo;
  for (let i = 0; i < b.passi; i++) {
    const p = (basso + alto) / 2;
    if (previste(p) > oreVere) basso = p;
    else alto = p;
  }
  return (basso + alto) / 2;
}

// P_giro della media dichiarata, in km/h. La potenza che fa durare 2 ore e mezza un giro di
// media × 2,5 km con 8 m di salita per km, su asfalto collinare, 9 kg di bici e 1,5 di acqua.
export function potenzaDaMedia(media, profilo = {}) {
  if (!num(media) || media <= 0) return null;
  const md = STIMA.mediaDichiarata;
  const km = media * md.oreGiro;
  const massa = massaCiclista(profilo) + md.biciKg + md.acquaCiboKg;
  return bisezionePotenza((p) => oreFormula({ km, metri: md.metriPerKm * km, potenza: p, massa, classe: md.classe }), md.oreGiro);
}

function qualitaDurata(u) {
  if (typeof u.qualita === "string") return u.qualita;
  if (u.qualita && typeof u.qualita === "object") return u.qualita.secondi ?? u.qualita.durata ?? null;
  return null;
}

// La durata in movimento letta dal dispositivo. Le durate dette e le attività a mano non sono misurate.
function durataMisurata(u) {
  if (!(u.secondi > 0) || u.stub === true) return false;
  if (u.manuale === true || u.daComeSto === true || u.sorgente === "MANUAL") return false;
  if (typeof u.externalId === "string" && u.externalId.startsWith("comesto-")) return false;
  const q = qualitaDurata(u);
  return q === null || q === "vera";
}

// Un giro di casa che entra nel passo personale (1.6 e 6.3), oppure null.
function giroPerPasso(u) {
  if (!u) return null;
  const fondo = Object.hasOwn(PASSO.tipi, tipoDi(u) || "") ? PASSO.tipi[tipoDi(u)] : null;
  const giorno = giornoDi(u);
  if (!fondo || !giorno || u.rulli || u.eBike || u.commute || u.modoEvento || u.fuoriDalPasso) return null;
  if (!durataMisurata(u) || !(u.metri > 0)) return null;
  const ore = u.secondi / ORA;
  const km = u.metri / 1000;
  const metri = num(u.dislivello) ? u.dislivello : 0;
  if (u.borse === "evento" || u.borse === "parte") return null;
  if (u.borse !== "no" && ore > PASSO.borseSenzaRispostaOltreOre) return null;
  if (ore * 60 < PASSO.minutiMinimi || km < PASSO.kmMinimi) return null;
  const media = km / ore;
  if (media < PASSO.velocita.minima || media > PASSO.velocita.massima) return null;
  const perKm = metri / km;
  if (perKm < PASSO.metriPerKm.minimi || perKm > PASSO.metriPerKm.massimi) return null;
  if (metri === 0 && km > DATI.dislivelloZeroOltreKm) return null;
  return { id: u.id ?? null, giorno, ore, km, metri, fondo, rimesso: u.rimessaNelPasso === true };
}

function oreGiro(g, p, ciclista) {
  return oreFormula({ km: g.km, metri: g.metri, potenza: p, massa: ciclista + g.fondo.biciKg + PASSO.acquaCiboKg, classe: g.fondo.classe });
}

function passoDa(giri, ciclista) {
  return bisezionePotenza((p) => somma(giri, (g) => oreGiro(g, p, ciclista)), somma(giri, (g) => g.ore));
}

const descrivi = (giri, p, ciclista) => giri.map((g) => ({ id: g.id, giorno: g.giorno, ore: g.ore, previste: oreGiro(g, p, ciclista) }));

// P_giri, la potenza che con la formula rifà la somma delle ore vere dei giri (1.6), con i giri
// tenuti e quelli tolti alla seconda passata. null con meno di 3 giri o meno di 6 ore.
export function potenzaDaGiri(uscite, profilo = {}, oggi = oggiIso()) {
  const ciclista = massaCiclista(profilo);
  const candidati = (Array.isArray(uscite) ? uscite : []).map(giroPerPasso).filter(Boolean);
  for (const giorni of [PASSO.giorni, PASSO.giorniRiserva]) {
    const giri = candidati.filter((g) => entro(g.giorno, oggi, giorni));
    if (giri.length < PASSO.giriMinimi || somma(giri, (g) => g.ore) < PASSO.oreMinime) continue;
    const prima = passoDa(giri, ciclista);
    // L'errore relativo si conta sulle ore vere, così un giro in gruppo esce prima di uno con le soste.
    const tolti = giri.filter((g) => !g.rimesso && Math.abs(oreGiro(g, prima, ciclista) - g.ore) / g.ore > PASSO.erroreMassimo);
    const tenuti = giri.filter((g) => !tolti.includes(g));
    if (tolti.length === 0 || tenuti.length < PASSO.giriMinimi) {
      return { p: prima, tenuti: descrivi(giri, prima, ciclista), tolti: [], giorni };
    }
    const p = passoDa(tenuti, ciclista);
    return { p, tenuti: descrivi(tenuti, p, ciclista), tolti: descrivi(tolti, p, ciclista), giorni };
  }
  return null;
}

// La risposta sulle borse di un'uscita. Un giro di un evento fatto con l'app, senza risposta, vale
// «come all'evento», perché l'evento vale come uscita carica di più giorni (1.7 e 2.4).
const borseDi = (u) => u.borse ?? (u.modoEvento === true ? "evento" : null);

// Le uscite cariche di almeno 3 ore degli ultimi 365 giorni, unite per giorno, con le ore vere e
// quelle previste senza borse alla potenza di oggi (1.7).
function giorniCarichi(usciteCariche, ciclista, p, oggi) {
  const perGiorno = new Map();
  for (const u of Array.isArray(usciteCariche) ? usciteCariche : []) {
    if (!u || (borseDi(u) !== "evento" && borseDi(u) !== "parte")) continue;   // «Sì, come all'evento» e «Sì, in parte»
    const giorno = giornoDi(u);
    const fondo = Object.hasOwn(PASSO.tipi, tipoDi(u) || "") ? PASSO.tipi[tipoDi(u)] : null;
    if (!giorno || !fondo || u.rulli || u.eBike || !(u.secondi > 0) || !(u.metri > 0)) continue;
    if (!entro(giorno, oggi, BORSE.giorni)) continue;
    const km = u.metri / 1000;
    if (!num(u.dislivello) && km > DATI.dislivelloZeroOltreKm) continue;   // senza dislivello il giro non si confronta
    const giro = { km, metri: num(u.dislivello) ? u.dislivello : 0, fondo };
    const g = perGiorno.get(giorno) || { giorno, ore: 0, previste: 0, evento: false };
    g.ore += u.secondi / ORA;
    g.previste += oreGiro(giro, p, ciclista);
    g.evento = g.evento || borseDi(u) === "evento";
    perGiorno.set(giorno, g);
  }
  return [...perGiorno.values()].filter((g) => g.ore >= BORSE.oreMinime).sort((a, b) => (a.giorno < b.giorno ? -1 : 1));
}

// L'ultima uscita carica di 2 o più giorni di fila «come all'evento», oppure null.
function ultimoViaggio(giorni) {
  let ultimo = null;
  let corrente = [];
  for (const g of giorni.filter((x) => x.evento)) {
    const prima = corrente[corrente.length - 1];
    corrente = prima && giorniFra(prima.giorno, g.giorno) === 1 ? [...corrente, g] : [g];
    if (corrente.length >= BORSE.giorniDiFila) ultimo = corrente;
  }
  return ultimo;
}

// Il fattore carico personale (1.7). Livello 3 dall'ultimo viaggio carico di più giorni, solo per
// gli eventi di più giorni, livello 2 dalla mediana delle uscite cariche. Sempre fra 1,00 e 1,40.
// opzioni.giorni sono i giorni dell'evento, opzioni.oggi la data di oggi.
export function fattoreCarico(usciteCariche, profilo = {}, p, opzioni = {}) {
  const { giorni = 2, oggi = oggiIso() } = opzioni;
  if (!num(p) || p <= 0) return null;
  const lista = giorniCarichi(usciteCariche, massaCiclista(profilo), p, oggi);
  if (lista.length === 0) return null;
  const tieni = (r) => limita(r, BORSE.minimo, BORSE.massimo);
  const viaggio = giorni >= 2 ? ultimoViaggio(lista) : null;
  if (viaggio) {
    return { fattore: tieni(somma(viaggio, (g) => g.ore) / somma(viaggio, (g) => g.previste)), livello: 3, data: viaggio[0].giorno, giorni: viaggio.length };
  }
  return { fattore: tieni(mediana(lista.map((g) => g.ore / g.previste))), livello: 2, data: lista[lista.length - 1].giorno, uscite: lista.length };
}

function ftpRide(atleta) {
  if (!atleta) return null;
  if (num(atleta.ftp) && atleta.ftp > 0) return atleta.ftp;
  const profili = Array.isArray(atleta.sportSettings) ? atleta.sportSettings : [];
  const ride = profili.find((s) => s && Array.isArray(s.types) && s.types.includes("Ride"));
  return ride && num(ride.ftp) && ride.ftp > 0 ? ride.ftp : null;
}

const haPotenza = (u) => u.potenza === true || u.device_watts === true || (num(u.potenza) && u.potenza > 0);

function usciteConPotenza(uscite, oggi) {
  const giorni = STIMA.potenza.ftpSettimane * 7;
  return uscite.filter((u) => u && STIMA.potenza.tipi.includes(tipoDi(u)) && !u.eBike && haPotenza(u) && entro(giornoDi(u), oggi, giorni)).length;
}

// La potenza della giornata, dalla prima fonte che c'è (1.4). Con le fonti 2, 3 e 4 mai oltre
// il tetto di 0,625 × 3,5 W/kg. fonte vale «ftp», «giri», «media» o «nessuna».
export function potenzaGiornata({ profilo = {}, atleta = null, uscite = [], oggi = oggiIso() } = {}) {
  const pot = STIMA.potenza;
  const massa = massaCiclista(profilo);
  const lista = Array.isArray(uscite) ? uscite : [];
  const ftp = ftpRide(atleta);
  if (ftp && usciteConPotenza(lista, oggi) >= pot.ftpUsciteMinime) {
    return { p: pot.quotaFtp * ftp, fonte: "ftp", ftp, limitata: false };
  }
  const tetto = pot.quotaFtp * pot.wattKgTetto * massa;
  const sotto = (p) => ({ p: Math.min(p, tetto), limitata: p > tetto });
  const passo = potenzaDaGiri(lista, profilo, oggi);
  if (passo) return { ...sotto(pot.fattoreGiri * passo.p), fonte: "giri", ftp, giri: passo.tenuti.length, passo };
  const pGiro = potenzaDaMedia(profilo.mediaDichiarata, profilo);
  if (pGiro) return { ...sotto(pot.fattoreGiri * pGiro), fonte: "media", ftp };
  return { p: pot.quotaFtp * pot.wattKgSenzaDati * massa, fonte: "nessuna", ftp, limitata: false };
}

// --- L'obiettivo libero, 1.9 ---

// Un'avventura propria come percorso. tipo «ore» (un giro lungo di ore scelte), «giro» (km, metri
// e fondo fra strada, gravel, misto e mountainBike, con conBorse) o «giorni», da 2 a 14 giorni di
// fila. I giorni vanno a ore (le ore scelte, senza fisica) oppure, con misura «km», con km, metri e
// fondo di ogni giorno, e allora H viene dalla formula di 1.5 come per il giro, con le stesse classi, su
// km e metri moltiplicati per i giorni. I giorni di fila hanno le borse, 8 kg, salvo conBorse falso, e
// acqua e cibo 1,5 kg come il giro.
export function percorsoLibero(obiettivo = {}) {
  const ol = STIMA.obiettivoLibero;
  const piuGiorni = obiettivo.tipo === "giorni";
  const giorni = piuGiorni && ol.giorniDiFila.includes(obiettivo.giorni) ? obiettivo.giorni : 1;
  if (obiettivo.tipo === "giro" || (piuGiorni && obiettivo.misura === "km")) {
    const fondo = Object.hasOwn(ol.classi, obiettivo.fondo) ? obiettivo.fondo : "strada";
    const borse = piuGiorni ? obiettivo.conBorse !== false : Boolean(obiettivo.conBorse);
    return {
      id: "libero",
      libero: true,
      km: num(obiettivo.km) ? obiettivo.km * giorni : obiettivo.km,
      dislivello: num(obiettivo.metri) ? obiettivo.metri * giorni : 0,
      ...(piuGiorni ? { giorni } : {}),
      giorniMin: giorni,
      giorniMax: giorni,
      modello: {
        classe: ol.classi[fondo], fattoreDislivello: 1, dislivelloLavoro: null, biciKg: ol.bici[fondo],
        borseKg: borse ? ol.borseKg : 0, acquaCiboKg: ol.acquaCiboKg, giorniDalVia: false, ebikeAmmessa: true,
      },
    };
  }
  return {
    id: "libero", libero: true, ore: obiettivo.ore, giorni, giorniMin: giorni, giorniMax: giorni,
    borseKg: piuGiorni && obiettivo.conBorse !== false ? ol.borseKg : 0,
  };
}

// --- La stima, 1.1 e 1.5 passi 9-11 ---

// L'ultimo giro lungo in bici, per riconoscere chi va in e-bike (1.8).
function ultimoGiroLungoInEbike(uscite) {
  const lunghi = uscite.filter((u) => u && !u.rulli && u.secondi >= PASSO.minutiMinimi * 60 && u.metri >= PASSO.kmMinimi * 1000
    && (Object.hasOwn(PASSO.tipi, tipoDi(u) || "") || DATI.tipiEbike.includes(tipoDi(u))));
  if (lunghi.length === 0) return false;
  const quando = (u) => u.inizio || giornoDi(u) || "";
  const ultimo = lunghi.reduce((a, b) => (quando(b) > quando(a) ? b : a));
  return DATI.tipiEbike.includes(tipoDi(ultimo)) || ultimo.eBike === true;
}

function inEbike(percorso, profilo, uscite) {
  if (percorso.modello && percorso.modello.ebikeAmmessa === false) return false;
  if (profilo.ebike === true || profilo.ebike === false) return profilo.ebike;
  return ultimoGiroLungoInEbike(uscite);
}

// Le borse dell'ultimo test di viaggio con i chili detti, se la persona non li ha scritti (1.3).
// js/dati.js mette i chili detti in kg.
const chiliDi = (u) => u.borseKg ?? u.chili ?? u.kg;

function borseDelTest(cariche) {
  const test = (Array.isArray(cariche) ? cariche : [])
    .filter((u) => u && u.borse === "evento" && u.secondi >= BORSE.oreMinime * ORA && num(chiliDi(u)))
    .sort((a, b) => ((giornoDi(a) || "") < (giornoDi(b) || "") ? -1 : 1));
  const ultimo = test[test.length - 1];
  return ultimo ? chiliDi(ultimo) : null;
}

function strada(percorso, G) {
  const km = num(percorso.km) ? arrotondaA(percorso.km / G, STIMA.arrotonda.km) : null;
  const metri = num(percorso.dislivello) && percorso.dislivello > 0 ? arrotondaA(percorso.dislivello / G, STIMA.arrotonda.metri) : null;
  return { kmGiorno: km, metriGiorno: metri };
}

function mezzore(r) {
  const z = (x) => (num(x) ? arrotondaMezzora(x) : null);
  return { H: z(r.H), basso: z(r.basso), alto: z(r.alto), giornataMin: z(r.giornataMin), giornataMax: z(r.giornataMax), Hn: z(r.Hn) };
}

function giornataIntera(H) {
  const g = STIMA.giornataIntera;
  return num(H) ? { giornataMin: H * g.minimo, giornataMax: H * g.massimo } : { giornataMin: null, giornataMax: null };
}

// Le ore dette dalla persona, senza fisica, per l'obiettivo libero con le ore scelte e per l'e-bike.
function oreDette(ore, G, percorso, fonte, avvisi) {
  const H = num(ore) && ore > 0 ? ore : null;
  const r = {
    T: H === null ? null : H * G, H, Hn: H !== null && G >= STIMA.giorniEffettivi.daGiorni ? (H * G) / giorniEffettivi(G) : null,
    basso: H, alto: H, ...giornataIntera(H), ...strada(percorso, G),
    kj: null, punti: null, livello: null, fonte, avvisi, giorni: G, potenza: null, fattore: null, oreSenzaBorse: null, passo: null,
  };
  return { ...r, mezzore: mezzore(r) };
}

const MOLTIPLICATORE = STIMA.punti.moltiplicatori;

// La stima della giornata (1.1). percorso è una voce di js/catalogo.js oppure un percorsoLibero.
// prove sono le uscite cariche già scelte (con borse «evento» o «parte», anche i giorni di un
// evento fatto con l'app), altrimenti si prendono da uscite. H, forbice e giornata intera sono in
// ore senza arrotondare, e in mezzore arrotondati per lo schermo. Mai watt a schermo.
export function stimaH({ percorso, giorni, profilo = {}, atleta = null, uscite = [], prove = null, oggi = oggiIso() } = {}) {
  if (!percorso) return null;
  // Senza i giorni scelti valgono quelli dell'obiettivo libero, poi i primi giorni tipici del
  // catalogo, poi i giorni minimi, mai tutto il percorso in un giorno (1.1 e 1.12).
  const tipici = Array.isArray(percorso.giorniTipici) ? percorso.giorniTipici.find((g) => num(g) && g >= 1) : null;
  const G = [giorni, percorso.giorni, tipici, percorso.giorniMin].find((g) => num(g) && g >= 1) ?? 1;
  const lista = Array.isArray(uscite) ? uscite : [];
  const m = percorso.modello || {};
  const avvisi = [];
  if (!percorso.libero && !num(percorso.dislivello)) avvisi.push({ tipo: "dislivelloNonPubblicato" });
  if (m.giorniDalVia) avvisi.push({ tipo: "giorniDalVia" });

  if (inEbike(percorso, profilo, lista)) {
    const ore = num(profilo.oreEbike) && profilo.oreEbike > 0 ? profilo.oreEbike : null;
    avvisi.push(ore === null ? { tipo: "ebike", scelte: STIMA.oreEbike } : { tipo: "autonomia" });
    return oreDette(ore, G, percorso, { tipo: "ebike" }, avvisi);
  }
  if (percorso.libero && !percorso.modello) return oreDette(percorso.ore, G, percorso, { tipo: "scelta" }, avvisi);

  const potenza = potenzaGiornata({ profilo, atleta, uscite: lista, oggi });
  const cariche = Array.isArray(prove) ? prove : lista.filter((u) => u && (borseDi(u) === "evento" || borseDi(u) === "parte"));
  // Le borse dell'avventura. Un obiettivo libero senza borse non ne ha mai, e il test di viaggio
  // cambia le borse solo dove l'evento le porta (1.3).
  const kgTest = num(profilo.borseKg) || !(m.borseKg > 0) ? null : borseDelTest(cariche);
  let prof = profilo;
  if (percorso.libero && !(m.borseKg > 0)) prof = { ...profilo, borseKg: 0 };
  else if (kgTest !== null) prof = { ...profilo, borseKg: kgTest };
  const kg = masseDi(percorso, prof).borse;
  // Il fattore carico prende il posto del modello delle borse, quindi vale solo con le borse (1.7).
  const fattore = kg > 0 ? fattoreCarico(cariche, profilo, potenza.p, { giorni: G, oggi }) : null;
  const P = potenza.p;
  const T = oreTotali({ percorso, profilo: prof, potenza: P, fattoreCarico: fattore });
  const Tsenza = oreTotali({ percorso, profilo: { ...prof, borseKg: 0 }, potenza: P });
  const H = T / G;

  const livello = fattore ? fattore.livello : (potenza.fonte === "ftp" || potenza.fonte === "giri" ? 1 : 0);
  const f = STIMA.forbice[livello];
  const d = datiPercorso(percorso);
  const q = d.metri / d.km >= STIMA.lavoro.collinaDaMetriPerKm ? STIMA.lavoro.qCollina : STIMA.lavoro.qPiano;
  const IF = (STIMA.punti.ifPerFtp * P) / (potenza.ftp || P / STIMA.potenza.quotaFtp);
  const quote = d.classe.quote;
  const mFondo = quote.asfalto * MOLTIPLICATORE.asfalto + quote.compatto * MOLTIPLICATORE.compatto + quote.smosso * MOLTIPLICATORE.smosso;

  const gp = STIMA.giornoInPiuGiorni;
  if (G >= gp.da && G <= gp.a && H >= STIMA.giornoInPiuDaH && !(num(percorso.giorniMax) && G + 1 > percorso.giorniMax)) {
    avvisi.push({ tipo: "giornoInPiu", giorni: G + 1, H: T / (G + 1) });
  }
  if (kg > 0 && T > Tsenza) avvisi.push({ tipo: "borse", kg, ore: (T - Tsenza) / G });

  const fonte = fattore
    ? (fattore.livello === 3 ? { tipo: "viaggioCarico", data: fattore.data, giorni: fattore.giorni } : { tipo: "uscitaCarica", data: fattore.data, uscite: fattore.uscite })
    : (potenza.fonte === "giri" ? { tipo: "giri", giri: potenza.giri } : { tipo: potenza.fonte });

  const r = {
    T, H, Hn: G >= STIMA.giorniEffettivi.daGiorni ? T / giorniEffettivi(G) : null,
    basso: H * (1 - f), alto: H * (1 + f), ...giornataIntera(H), ...strada(percorso, G),
    kj: STIMA.lavoro.kjPerWattOra * P * H * q,
    punti: H * IF ** 2 * 100 * mFondo,
    livello, fonte, avvisi, giorni: G, potenza: P, fattore: fattore ? fattore.fattore : null,
    oreSenzaBorse: Tsenza / G, passo: potenza.passo || null,
  };
  return { ...r, mezzore: mezzore(r) };
}
