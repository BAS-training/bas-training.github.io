// I testi di «Pronto?» (2.9 della specifica), costruiti dai risultati di js/prontezza.js.
// Regole di scrittura del 7.1. Del tu, frasi brevi, nessun carattere dei due punti, durate in
// parole, date come «sabato 14 marzo», le prove con il loro nome e mai con le sigle, lo scarico
// finale al posto della parola inglese, nessuna pagella e nessuna promessa.
// Niente DOM, così le prove le compongono con node.

import { dataLunga } from "./formato.js?v=202611021705";
import { PASSO, PRONTEZZA, STIMA } from "./parametri.js?v=202611021705";
import { arrotondaMezzora } from "./stima.js?v=202611021705";
import { oreInParole, durataInParole, migliaia, PASSO_GIRI } from "./testi-stima.js?v=202611021705";

const MINUTI = STIMA.arrotondaMinuti;
const IN_LETTERE = ["zero", "una", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci"];
const lettere = (n) => (Number.isInteger(n) && n >= 0 && n < IN_LETTERE.length ? IN_LETTERE[n] : String(n));
const giorniInParole = (n) => (n === 1 ? "1 giorno" : `${n} giorni`);
const num = (v) => typeof v === "number" && Number.isFinite(v);
const maiuscola = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function congela(oggetto) {
  for (const valore of Object.values(oggetto)) {
    if (valore !== null && typeof valore === "object") congela(valore);
  }
  return Object.freeze(oggetto);
}

// --- Numeri in parole ---

// Una durata in ore, come vuole il 7.1, a 5 minuti sotto le 2 ore e a 10 sopra. Con perDifetto va
// in giù, così una media appena sotto l'obiettivo non sembra uguale. null sotto i 3 minuti.
export function durata(ore, perDifetto = false) {
  if (!(ore > 0)) return null;
  const minuti = ore * 60;
  if (!perDifetto) return durataInParole(minuti);
  const passo = minuti < MINUTI.lungheDa ? MINUTI.passo : MINUTI.passoLunghe;
  return durataInParole(Math.floor(minuti / passo + 1e-9) * passo);
}

// Ore alla mezz'ora senza la parola ore, «7» o «7 e mezza». Con inSu un minimo non scende mai.
function oreBrevi(ore, inSu = false) {
  const mezze = (inSu ? Math.ceil(ore * 2 - 1e-6) : Math.floor(ore * 2 + 0.5 + 1e-9)) / 2;
  const intere = Math.floor(mezze);
  if (mezze === intere) return String(intere);
  return intere ? `${intere} e mezza` : "mezz'ora";
}

const oreAlGiorno = (h) => oreInParole(arrotondaMezzora(h));

// «le mani», «le mani e il sedere», «le mani, il sedere e il collo».
function elenco(parti) {
  if (parti.length <= 1) return parti.join("");
  return `${parti.slice(0, -1).join(", ")} e ${parti[parti.length - 1]}`;
}

// --- Il verdetto ---

const SETTIMANE_MINIME = PRONTEZZA.verdetto.settimaneMinime;

// Le tre parti di ogni esito (2.9). Il perché di «Poco pronto» è la riga del pilastro più lontano.
export const VERDETTI = congela({
  conMargine: {
    titolo: "Pronto, con margine",
    perche: "Hai le ore, l'uscita lunga e le prove con le borse.",
    cosa: "Adesso conta arrivare riposato. Segui lo scarico finale.",
  },
  pronto: {
    titolo: "Pronto",
    perche: "Ore, uscita lunga, prove con le borse e continuità ci sono.",
    cosa: "Nelle ultime settimane non aggiungere niente di nuovo.",
  },
  quasiPronto: {
    titolo: "Quasi pronto",
    perche: "Manca una cosa sola, la trovi qui sotto.",
    cosa: "Si può sistemare, oppure si parte sapendolo.",
  },
  pocoPronto: {
    titolo: "Poco pronto",
    perche: null,
    cosa: "Prova con più giorni, ti faccio vedere come cambia.",
  },
  nonValutabile: {
    titolo: "Non posso ancora dirlo",
    perche: `Mi servono almeno ${SETTIMANE_MINIME} settimane di uscite.`,
    cosa: null,
  },
});

// Per un giorno senza borse le prove non servono, e il perché non le nomina.
export const SENZA_PROVE = congela({
  conMargine: "Hai le ore e l'uscita lunga.",
  pronto: "Ore, uscita lunga e continuità ci sono.",
});

// I testi che cambiano il quasi pronto (2.9), divisi fra perché e cosa fare.
export const VARIANTI = congela({
  primoViaggio: {
    perche: "Hai le ore, ma non hai mai pedalato con le borse per più giorni.",
    cosa: "Per un primo viaggio è la cosa che conta di più, perché sella, mani e borse si scoprono solo così.",
  },
  esperto: {
    perche: "Ti manca solo la prova con le borse.",
    cosa: "Con i viaggi che hai già fatto puoi anche partire sapendolo, ma tre ore con la bici carica ti dicono se sella, mani e borse vanno.",
  },
});

export const NON_VALUTABILE = congela({
  settimane: VERDETTI.nonValutabile.perche,
  giornata: "Prima scegli la tua avventura e in quanti giorni farla.",
  ebike: "Prima dimmi quante ore pensi di stare in sella al giorno.",
});

export const COSA_POCO = congela({
  giorni: VERDETTI.pocoPronto.cosa,
  corto: "Prova un percorso più corto, ti faccio vedere come cambia.",
});

// Poco pronto alla vigilia, quando né i giorni né il percorso corto bastano (2.9).
export function cosaAllaVigilia(giorni = null) {
  if (giorni) return `Se parti lo stesso, fallo in ${giorni} giorni, tieni corto il primo e scegli posti per dormire che puoi cambiare.`;
  return "Se parti lo stesso, tieni corto il primo giorno e scegli posti per dormire che puoi cambiare.";
}

// Titolo, perché e cosa fare di un esito. contesto.variante è «primoViaggio» o «esperto»,
// contesto.perche la riga del pilastro più lontano per il poco pronto, contesto.cosa una di
// COSA_POCO oppure il testo della vigilia, contesto.motivo il motivo del non valutabile.
export function testiVerdetto(esito, contesto = {}) {
  const base = VERDETTI[esito] || VERDETTI.nonValutabile;
  const testi = { titolo: base.titolo, perche: base.perche, cosa: base.cosa };
  if ((esito === "conMargine" || esito === "pronto") && contesto.senzaProve) testi.perche = SENZA_PROVE[esito];
  if (esito === "quasiPronto" && VARIANTI[contesto.variante]) Object.assign(testi, VARIANTI[contesto.variante]);
  if (esito === "pocoPronto") {
    testi.perche = contesto.perche || null;
    if (contesto.cosa) testi.cosa = contesto.cosa;
  }
  if (esito === "nonValutabile" && NON_VALUTABILE[contesto.motivo]) testi.perche = NON_VALUTABILE[contesto.motivo];
  return testi;
}

// La riga della Guida (2.9).
export const GUIDA_PRONTO = "Pronto vuol dire che hai fatto quello che serve per goderti il viaggio. Non è una promessa, e non è una pagella.";

// --- Le righe dei pilastri (2.9) ---

// «Ore in bici, in media 7 ore e mezza a settimana. Bene.» Sotto il minimo la media va per difetto
// e il minimo per eccesso, alla mezz'ora. Nella proiezione la riga dice che conta il piano.
export function testoVolume({ valore, vMin, difetto, proiezione = false }) {
  const media = durata(valore, difetto > 0);
  const prima = media
    ? `Ore in bici, ${proiezione ? "con il piano " : ""}in media ${media} a settimana.`
    : "Ore in bici, quasi nessuna nelle settimane che contano.";
  if (difetto === 0) return `${prima} Bene.`;
  return `${prima} Ne servono almeno ${oreBrevi(vMin, true)}${media ? "" : " a settimana"}.`;
}

// «Uscita più lunga, 5 ore e mezza, sabato 18 aprile.» quando basta, altrimenti la fatta, l'obiettivo
// alla mezz'ora e, se c'è, il giorno in cui il piano ci arriva.
export function testoLunga({ valore, giorno = null, lt, raggiunta, dataPiano = null }) {
  if (raggiunta && valore > 0 && giorno) return `Uscita più lunga, ${durata(valore)}, ${dataLunga(giorno)}.`;
  const fatta = durata(valore, true);
  const prima = fatta ? `Uscita più lunga, ${fatta}.` : "Uscita più lunga, nessuna nelle settimane che contano.";
  const piano = dataPiano ? `, il piano ci arriva ${dataLunga(dataPiano)}` : "";
  return `${prima} L'obiettivo è ${oreAlGiorno(lt)}${piano}.`;
}

// Le prove con il loro nome a schermo (7.1), il genere e a cosa servono.
const PROVE = congela({
  T1: { nome: "Test con le borse", conArticolo: "il test con le borse", f: false, perche: "Ti dice se bici, borse e guida vanno insieme." },
  T2: { nome: "Uscita lunga con le borse", conArticolo: "l'uscita lunga con le borse", f: true, perche: "Ti dice come vanno corpo, cibo e passo con la bici carica." },
  T3: { nome: "Prova generale con le borse", conArticolo: "la prova generale con le borse", f: true, perche: "È la prova che conta di più per bici, borse e sedere." },
  blocco: { nome: `Blocco di ${lettere(PRONTEZZA.bloccoGiorni)} giorni con le borse`, conArticolo: `il blocco di ${lettere(PRONTEZZA.bloccoGiorni)} giorni con le borse`, f: false, perche: "Ti fa sentire la fatica che si somma giorno dopo giorno." },
  unGiorno: { nome: "Uscita con le borse", conArticolo: "l'uscita con le borse", f: true, perche: "Ti dice se bici e borse vanno bene insieme." },
});

export const NOMI_PROVE = congela(Object.fromEntries(Object.entries(PROVE).map(([chiave, p]) => [chiave, p.nome])));

// La riga di una prova, fatta, fatta tardi, in programma o mancante (2.4 e 2.9).
export function testoProva(prova, esito, { proiezione = false } = {}) {
  const p = PROVE[prova];
  if (!p || !esito) return null;
  const fatta = p.f ? "fatta" : "fatto";
  if (esito.stato === "fatta") {
    if (esito.tardi) return `${p.nome}, ${dataLunga(esito.da)}, ${fatta} tardi. Arrivi meno fresco.`;
    return `${p.nome}, ${fatta} ${dataLunga(esito.da)}.`;
  }
  if (esito.stato === "inProgramma") return `${p.nome}, in programma ${dataLunga(esito.da)}. ${p.perche}`;
  return `${p.nome}, ${proiezione ? "non ancora in programma" : `non ${fatta}`}. ${p.perche}`;
}

const ORDINE_PROVE = ["T3", "blocco", "T2", "T1", "unGiorno"];

export const BORSE_DIFETTO_DUE = "Non hai ancora pedalato con le borse per più giorni di fila. Per un viaggio così lungo è la prova che conta di più.";
export const AVVISO_DOPPIO_USO = "Se dopo il blocco hai cambiato qualcosa, provalo in un'uscita carica di 2-3 ore prima dello scarico finale.";

// La riga del pilastro delle prove. Tutte fatte, oppure la prova che manca e che conta di più,
// oppure la prossima in programma.
export function testoBorse({ difetto, righe = [] }) {
  if (!righe.length) return null;
  if (difetto === 2) return BORSE_DIFETTO_DUE;
  const ordinate = [...righe].sort((x, y) => ORDINE_PROVE.indexOf(x.prova) - ORDINE_PROVE.indexOf(y.prova));
  const mancante = ordinate.find((r) => r.stato === "manca");
  if (mancante) return mancante.testo;
  const prossima = ordinate.filter((r) => r.stato === "inProgramma").sort((x, y) => (x.da < y.da ? -1 : x.da > y.da ? 1 : 0))[0];
  if (prossima) return prossima.testo;
  return righe.length === 1 ? "Prova con le borse, fatta." : `Prove con le borse, fatte tutte e ${lettere(righe.length)}.`;
}

// I punti di contatto del pilastro «da sistemare» (7.5).
const AREE = congela({
  mani: { nome: "le mani", consiglio: "Cambia presa più spesso, controlla guanti e manubrio" },
  sedere: { nome: "il sedere", consiglio: "Controlla altezza e inclinazione della sella, e usa la crema" },
  collo: { nome: "il collo", consiglio: "Alza un po' il manubrio e fai gli esercizi per il collo" },
  ginocchia: { nome: "le ginocchia", consiglio: "Controlla l'altezza della sella e le tacchette" },
  piedi: { nome: "i piedi", consiglio: "Prova a stringere meno le scarpe nelle ore calde" },
});

// «Nell'ultima prova hai segnato le mani. Cambia presa più spesso, controlla guanti e manubrio,
// poi rifai tre ore con la bici carica.»
export function testoDaSistemare({ aree = [], ultima = true }) {
  const lista = aree.filter((a) => Object.hasOwn(AREE, a));
  if (!lista.length) return null;
  const tre = `${lettere(PRONTEZZA.giornoCaricoOre)} ore`;
  const prima = `${ultima ? "Nell'ultima prova" : "Nelle ultime prove"} hai segnato ${elenco(lista.map((a) => AREE[a].nome))}.`;
  if (lista.length === 1) return `${prima} ${AREE[lista[0]].consiglio}, poi rifai ${tre} con la bici carica.`;
  return `${prima} ${lista.map((a) => `${AREE[a].consiglio}.`).join(" ")} Poi rifai ${tre} con la bici carica.`;
}

// La continuità si mostra solo quando manca (2.9).
export function testoContinuita({ valore, difetto }) {
  return difetto ? `Ti sei fermato ${valore} giorni di fila. Si riparte piano, il piano lo sa.` : null;
}

// La palestra, che non decide (2.6 e 2.9).
export function testoPalestra(sedute) {
  if (sedute > 0) return `Palestra, ${sedute} ${sedute === 1 ? "seduta" : "sedute"} nelle ultime ${PRONTEZZA.specchi.palestraSettimane} settimane.`;
  return "La palestra aiuta a stare meglio nelle ultime ore della giornata. Se ti va, comincia con la scheda Si comincia.";
}

// --- La fiducia del verdetto (2.5) ---

export const FIDUCIA = congela({
  media: "Verdetto con qualche dato in meno.",
  bassa: "Verdetto incerto, mi mancano dei dati.",
});

const DA_DOVE = { STRAVA: " da Strava", GARMIN_CONNECT: " da Garmin" };

// La riga che dice cosa manca, per esempio «Mi mancano le ore di 6 giri arrivati da Strava.
// Toccali per dirmele.»
export function rigaFiducia(motivo) {
  if (!motivo) return null;
  const n = motivo.quanti;
  switch (motivo.tipo) {
    case "ore": {
      const da = DA_DOVE[motivo.sorgente] || "";
      if (n === 1) return `Mi mancano le ore di un giro arrivato${da}. Toccalo per dirmele.`;
      if (n > 1) return `Mi mancano le ore di ${n} giri arrivati${da}. Toccali per dirmele.`;
      return "Di alcuni giri conosco le ore solo a stima.";
    }
    case "borse":
      if (n === 1) return "Mi manca la risposta sulle borse di un'uscita lunga. Toccala per dirmela.";
      return `Mi mancano le risposte sulle borse di ${n} uscite lunghe. Toccale per dirmele.`;
    case "stima":
      return `La tua giornata è ancora una stima prudente. Con ${PASSO.giriMinimi} giri lunghi registrati diventa tua.`;
    case "settimane":
      if (!(n > 0)) return `Ho le tue uscite da meno di una settimana. Da ${PRONTEZZA.fiducia.settimaneMinime} settimane il verdetto è più sicuro.`;
      return `Ho le tue uscite da ${n} ${n === 1 ? "settimana" : "settimane"}. Da ${PRONTEZZA.fiducia.settimaneMinime} il verdetto è più sicuro.`;
    default:
      return null;
  }
}

// --- Prima della vigilia, dove arrivi (2.7) ---

export const PROIEZIONE = congela({
  pronto: "Se segui il piano, ci arrivi pronto.",
  base: "Siamo nella base.",
  storiaCorta: `Per dirti dove arrivi mi servono almeno ${PRONTEZZA.proiezione.storiaMinima} settimane di uscite. Intanto segui il piano.`,
});

// Cosa manca al quasi pronto, in una frase. pilastro è quello con il difetto, dettaglio le righe
// delle prove, per dire quella che manca e conta di più, oppure i giorni della pausa.
export function testoManca(pilastro, dettaglio = {}) {
  switch (pilastro) {
    case "borse": {
      const righe = Array.isArray(dettaglio.righe) ? [...dettaglio.righe] : [];
      const prima = righe.sort((x, y) => ORDINE_PROVE.indexOf(x.prova) - ORDINE_PROVE.indexOf(y.prova)).find((r) => r.stato === "manca");
      if (prima && PROVE[prima.prova]) return `Manca ${PROVE[prima.prova].conArticolo}.`;
      return "Resta da sistemare quello che hai segnato nell'ultima prova.";
    }
    case "volume": return "Manca qualche ora in bici a settimana.";
    case "lunga": return "Manca un'uscita più lunga.";
    case "continuita": return `Pesa la pausa di ${dettaglio.giorni} giorni di fila.`;
    default: return null;
  }
}

// La proposta in breve, per la frase della proiezione. Prima i giorni in più, se ci sono, come
// in 8.4, poi il percorso corto, poi partire e adattare. «Ti propongo 5 giorni.»
export function propostaBreve(proposta) {
  if (!proposta) return null;
  if (proposta.giorni) return `Ti propongo ${proposta.giorni} giorni.`;
  if (proposta.tipo === "corto") return `Ti propongo ${ilPercorso(proposta.percorso)}.`;
  if (proposta.tipo === "adattare") return "Ti propongo di partire e adattare.";
  return null;
}

// Una delle tre frasi di 2.7.
export function fraseProiezione(esito, { manca = null, proposta = null } = {}) {
  if (esito === "conMargine" || esito === "pronto") return PROIEZIONE.pronto;
  if (esito === "quasiPronto") return ["Se segui il piano, ci arrivi quasi pronto.", manca].filter(Boolean).join(" ");
  if (esito === "pocoPronto") return ["Se continui così, arrivi poco pronto.", propostaBreve(proposta)].filter(Boolean).join(" ");
  return null;
}

// Lo stato delle ultime settimane, mai come colpa (2.7).
export function testoSottoPiano(fatte, piano) {
  const settimane = lettere(PRONTEZZA.proiezione.settimaneControllo);
  const coda = "Se succede ancora, rifaccio il piano con i tuoi tempi.";
  const ore = durata(fatte, true);
  if (!ore) return `Nelle ultime ${settimane} settimane il piano diceva ${durata(piano)}, e non ho visto giri. ${coda}`;
  return `Nelle ultime ${settimane} settimane hai fatto ${ore} contro le ${oreBrevi(piano)} del piano. ${coda}`;
}

// --- Più giorni, il percorso corto, partire e adattare (2.8) ---

// «Corto», «Newbie», «Da Berlino», senza quello che sta fra parentesi o dopo la virgola.
function nomeBreve(percorso) {
  return String((percorso && percorso.nome) || "").split(/ \(|, /)[0].trim();
}

const minuscola = (s) => s.charAt(0).toLowerCase() + s.slice(1);

// «il Corto», «l'Express», «la partenza da Berlino».
export function ilPercorso(percorso) {
  const nome = nomeBreve(percorso);
  if (/^da /i.test(nome)) return `la partenza ${minuscola(nome)}`;
  return /^[aeiou]/i.test(nome) ? `l'${nome}` : `il ${nome}`;
}

// Il tasto del percorso corto, «Passa al Corto», «Passa all'Express», «Parti da Berlino».
export function passaA(percorso) {
  const nome = nomeBreve(percorso);
  if (/^da /i.test(nome)) return `Parti ${minuscola(nome)}`;
  return /^[aeiou]/i.test(nome) ? `Passa all'${nome}` : `Passa al ${nome}`;
}

export const TASTI = congela({
  conferma: "Sì, cambia",
});

// «Fallo in 5 giorni»
export function tastoGiorni(giorni) {
  return `Fallo in ${giorni} giorni`;
}

// «In 3 giorni ogni giornata dura circa 9 ore. Con la tua uscita più lunga delle ultime sei
// settimane, 3 ore, ti consiglio 5 giorni, con circa 5 ore e mezza al giorno.»
export function fraseGiorniConsigliati({ giorni, H, nuovi, nuovaH, motivo, lRif = null, lRifDalPiano = false, vMin = null, oreDisponibili = null }) {
  const consiglio = `consiglio ${giorniInParole(nuovi)}, con circa ${oreAlGiorno(nuovaH)} al giorno.`;
  const ora = `In ${giorniInParole(giorni)} ogni giornata dura circa ${oreAlGiorno(H)}.`;
  const settimane = lettere(PRONTEZZA.giorniConsigliati.settimaneLunga);
  if (motivo === "lunga") {
    if (!(lRif > 0)) return `${ora} Nelle ultime ${settimane} settimane non vedo uscite lunghe, quindi ti ${consiglio}`;
    const da = lRifDalPiano ? "Con l'uscita più lunga a cui il piano arriva in tempo" : `Con la tua uscita più lunga delle ultime ${settimane} settimane`;
    return `${ora} ${da}, ${durata(lRif)}, ti ${consiglio}`;
  }
  if (motivo === "tempo") {
    return `In ${giorniInParole(giorni)} servono almeno ${durata(Math.ceil(vMin * 2 - 1e-6) / 2)} di bici a settimana, e ne hai ${oreDisponibili}. Ti ${consiglio}`;
  }
  if (motivo === "uscite") return `${ora} Con le uscite che hai fatto ti ${consiglio}`;
  return `${ora} Sono troppe ore per dormire e mangiare bene. Ti ${consiglio}`;
}

// «Ti propongo il Corto in 4 giorni, con circa 3 ore e mezza al giorno.»
export function fraseCorto({ percorso, giorni, H }) {
  const quanto = giorni === 1 ? `con circa ${oreAlGiorno(H)} in sella` : `con circa ${oreAlGiorno(H)} al giorno`;
  return `Ti propongo ${ilPercorso(percorso)} in ${giorniInParole(giorni)}, ${quanto}. È lo stesso viaggio, con meno strada.`;
}

export const TESTO_ADATTARE = "Ti propongo di partire e adattare. Tieni corto il primo giorno, scegli posti per dormire che puoi cambiare e tieni una via d'uscita per ogni tappa. In viaggio decide il semaforo del mattino.";

// Le righe di «Cosa cambia se…», nell'ordine della pagina. proposta è quella di valutaProntezza,
// ora ha giorni, H, vMin e oreDisponibili della scelta di adesso.
export function righeProposta(proposta, ora = {}) {
  if (!proposta) return [];
  const righe = [];
  if (proposta.giorni && proposta.motivo && proposta.giorni > ora.giorni) {
    righe.push(fraseGiorniConsigliati({ ...ora, nuovi: proposta.giorni, nuovaH: proposta.H, motivo: proposta.motivo, lRif: proposta.lRif, lRifDalPiano: proposta.lRifDalPiano }));
  }
  if (proposta.tipo === "corto") righe.push(fraseCorto(proposta.corto));
  if (proposta.tipo === "adattare") righe.push(TESTO_ADATTARE);
  return righe;
}

// --- Per chi ama i numeri (2.6) ---

export const AVVISI_FITNESS = congela({
  intensita: "La Fitness è alta, ma le ore lunghe mancano. Succede quando ci si allena forte e corto.",
  sforzo: "Molti tuoi giri non hanno sensori, e la Fitness li conta poco. Dimmi com'è stato qualche giro, così i numeri tornano.",
});

const DOVE_FITNESS = { sotto: "sotto", inLinea: "in linea", sopra: "sopra" };

// Il confronto con la Fitness, solo nella pagina dei numeri, e non decide mai. s è il risultato
// di specchio in js/prontezza.js.
export function testoFitness(s) {
  if (!s || !s.esito) return null;
  const prima = `Per la tua avventura la Fitness arriva di solito fra ${Math.round(s.minimo)} e ${Math.round(s.comodo)} prima dello scarico finale.`;
  const dove = DOVE_FITNESS[s.esito];
  const tua = s.inTapering
    ? `La tua è ${Math.round(s.fitness)}, e nello scarico finale scende perché ti stai riposando. Prima dello scarico valeva circa ${Math.round(s.confronto)}, ${dove}.`
    : `La tua è ${Math.round(s.fitness)}, ${dove}.`;
  return `${prima} ${tua} È solo un confronto, il verdetto viene dalle ore.`;
}

export function testoDurabilita(uscite) {
  const d = PRONTEZZA.specchi.durabilita;
  return `Uscite di almeno ${d.ore} ore negli ultimi ${d.giorni} giorni, ${uscite}.`;
}

export function testoStomaco(uscite) {
  return `Uscite lunghe con il cibo del viaggio e lo stomaco a posto, ${uscite}.`;
}

// Gli ingressi di esempio dei modelli che vogliono il nome di una prova, un esito o un oggetto, che
// la prova della scrittura (9.8) non sa costruire da sola. Ogni voce è una lista di argomenti.
export const ESEMPI = congela({
  testoProva: [
    ["blocco", { stato: "fatta", tardi: false, da: "2027-04-03" }], ["blocco", { stato: "fatta", tardi: true, da: "2027-05-01" }],
    ["unGiorno", { stato: "inProgramma", da: "2027-04-24" }], ["blocco", { stato: "manca" }, { proiezione: true }],
  ],
  testoBorse: [[{ difetto: 0, righe: [{ prova: "blocco", stato: "fatta" }, { prova: "unGiorno", stato: "fatta" }] }], [{ difetto: 2, righe: [{ prova: "blocco", stato: "manca" }] }]],
  testoDaSistemare: [[{ aree: ["mani"], ultima: true }], [{ aree: ["sedere", "collo"], ultima: false }]],
  rigaFiducia: [[{ tipo: "ore", quanti: 6, sorgente: "STRAVA" }], [{ tipo: "borse", quanti: 3 }], [{ tipo: "stima" }], [{ tipo: "settimane", quanti: 2 }]],
  testoManca: [["volume"], ["lunga"], ["borse", { righe: [{ prova: "blocco", stato: "manca" }] }], ["continuita", { giorni: 24 }]],
  fraseProiezione: [["pronto"], ["quasiPronto", { manca: null }], ["pocoPronto", { proposta: { tipo: "giorni", giorni: 5 } }]],
  nomeAvventura: [
    [{ percorso: { evento: "Tuscany Trail", nome: "Originale" }, giorni: 5 }], [{ libero: { tipo: "ore", ore: 5 } }],
    [{ libero: { tipo: "giro", km: 140 } }], [{ libero: { tipo: "giorni", giorni: 2 } }],
  ],
  rigaPercorso: [
    [{ evento: "Tuscany Trail", nome: "Originale", km: 460, dislivello: 5900 }],
    [{ evento: "NorthCape4000", nome: "Da Berlino (partenza intermedia)", km: 2960, dislivello: null }],
    [null, { tipo: "giro", km: 140, metri: 2200, fondo: "gravel", conBorse: true }], [null, { tipo: "giorni", giorni: 3 }],
    [null, { tipo: "ore", ore: 5 }],
  ],
  rigaGiorni: [
    [{ giorni: 5, partenza: "2027-05-19", mancano: 70 }], [{ giorni: 1, partenza: "2027-05-19", mancano: 0 }],
    [{ giorni: 4, partenza: "2027-05-19", mancano: 9 }], [{ giorni: 4 }], [{ partenza: "2027-05-19", mancano: -2 }],
  ],
  settimanaTipo: [[{ ore: 5.3, lunga: 4, palestra: 2 }], [{ ore: 3, palestra: 1 }]],
  provaDaFare: [["blocco"], ["unGiorno"]],
  anteprimaCorto: [[{ nome: "Newbie" }, 3, 3.2]],
  anteprimaEsito: [["pronto", "verdetto"], ["quasiPronto", "proiezione"], ["pocoPronto", "proiezione"], ["conMargine"]],
  partoIl: [["2027-05-19"]],
  giroTolto: [["2026-10-17", 3.2]],
});

// --- La pagina Pronto? (7.7) ---

// Da due settimane in su il conto alla partenza si dice in settimane, come in Oggi (7.4), stima nostra.
const SETTIMANE_DA_GIORNI = 14;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export const PRONTO_PAGINA = congela({
  titolo: "Pronto?",
  senzaObiettivo: "Pronto per cosa? Scegli un evento o un'avventura tua, e qui vedi se ci arrivi pronto.",
  soloSemaforo: "Per ora segui solo il semaforo del mattino. Se vuoi prepararti a un evento o a un'avventura tua, sceglila e qui vedi se ci arrivi pronto.",
  scegli: "Scegli",
  preparazione: "La preparazione",
  preparazioneConPiano: "La preparazione, con il piano",
  avventura: "La tua avventura",
  prove: "Le prove con le borse",
  proveDaFare: "Le prove che ti serviranno",
  cosaCambia: "Cosa cambia se…",
  storiaCorta: "Ancora presto per dirlo",
  senzaData: "Manca la data",
  senzaDataTesto: "Quando sai quando parti, qui vedi se ci arrivi pronto. Intanto ecco la tua giornata e una settimana tipo.",
  rispondi: "Rispondi adesso",
});

// Le scritte nascoste davanti a ogni riga, per chi usa un lettore di schermo. A schermo lo stato lo
// dice il segno, una spunta, un cerchio o una croce (2.9).
export const STATI_RIGA = congela({
  fatto: "Fatto.",
  fatta: "Fatta.",
  inProgramma: "In programma.",
  quasi: "Quasi.",
  manca: "Manca.",
  consiglio: "Facoltativo.",
  daFare: "Da fare.",
});

// Il nome dell'avventura sopra il titolo. «Tuscany Trail, Originale, in 5 giorni», «Il tuo giro di 5 ore».
export function nomeAvventura({ percorso = null, libero = null, giorni = null } = {}) {
  if (libero && typeof libero === "object") {
    if (libero.tipo === "giro" && num(libero.km)) return `Il tuo giro di ${migliaia(libero.km)} km`;
    if (libero.tipo === "giorni" && num(libero.giorni)) return `I tuoi ${lettere(libero.giorni)} giorni con le borse`;
    if (num(libero.ore)) return `Il tuo giro di ${oreAlGiorno(libero.ore)}`;
    return PRONTO_PAGINA.avventura;
  }
  if (!percorso || typeof percorso.evento !== "string") return PRONTO_PAGINA.avventura;
  const nome = nomeBreve(percorso);
  const quanti = num(giorni) && giorni > 1 ? `, in ${giorniInParole(giorni)}` : "";
  return `${percorso.evento}${nome ? `, ${nome}` : ""}${quanti}`;
}

const FONDI = congela({ strada: "su strada", gravel: "su gravel", misto: "su fondo misto", mountainBike: "in mountain bike" });

// La strada dell'avventura, solo i totali pubblici e mai la traccia (7.7). «Tuscany Trail, Originale,
// 460 km e 5.900 m di salita.» Per l'avventura propria le scelte di 1.9.
export function rigaPercorso(percorso, libero = null) {
  if (libero && typeof libero === "object") {
    if (libero.tipo === "giro" && num(libero.km)) {
      const salita = num(libero.metri) && libero.metri > 0 ? ` e ${migliaia(libero.metri)} m di salita` : "";
      const fondo = Object.hasOwn(FONDI, libero.fondo) ? `, ${FONDI[libero.fondo]}` : "";
      return `Un giro di ${migliaia(libero.km)} km${salita}${fondo}${libero.conBorse ? ", con le borse" : ""}.`;
    }
    if (libero.tipo === "giorni" && num(libero.giorni)) return `${maiuscola(lettere(libero.giorni))} giorni di fila con le borse.`;
    return num(libero.ore) ? `Un giro di ${oreAlGiorno(libero.ore)}.` : null;
  }
  if (!percorso || typeof percorso.evento !== "string") return null;
  const nome = typeof percorso.nome === "string" && percorso.nome ? `, ${percorso.nome.replace(/^Da /, "da ")}` : "";
  const km = num(percorso.km) ? `${migliaia(percorso.km)} km` : null;
  const salita = num(percorso.dislivello) && percorso.dislivello > 0 ? `${migliaia(percorso.dislivello)} m di salita` : null;
  const strada = [km, salita].filter(Boolean).join(" e ");
  return `${percorso.evento}${nome}${strada ? `, ${strada}` : ""}.`;
}

// In quanti giorni e quando si parte. «In 5 giorni. Si parte mercoledì 13 gennaio, fra 10 settimane.»
// mancano sono i giorni alla partenza, 0 oggi.
export function rigaGiorni({ giorni = null, partenza = null, mancano = null } = {}) {
  const quanti = num(giorni) && giorni > 1 ? `In ${giorniInParole(giorni)}.` : null;
  let parti = null;
  if (typeof partenza === "string" && DATA.test(partenza)) {
    const data = dataLunga(partenza);
    if (mancano === 0) parti = `Si parte oggi, ${data}.`;
    else if (mancano === 1) parti = `Si parte domani, ${data}.`;
    else if (Number.isInteger(mancano) && mancano > 1) {
      const fra = mancano >= SETTIMANE_DA_GIORNI ? `${Math.floor(mancano / 7)} settimane` : `${mancano} giorni`;
      parti = `Si parte ${data}, fra ${fra}.`;
    } else if (Number.isInteger(mancano) && mancano < 0) parti = `La partenza era ${data}.`;
    else parti = `Si parte ${data}.`;
  }
  return [quanti, parti].filter(Boolean).join(" ") || null;
}

// La settimana tipo di un obiettivo senza data (7.7). «Una settimana tipo, circa 5 ore e 20 in bici,
// con un'uscita lunga di 5 ore e mezza e 2 sedute di palestra.»
export function settimanaTipo({ ore = null, lunga = null, palestra = 0 } = {}) {
  const totale = durata(ore);
  if (!totale) return null;
  const pezzi = [];
  const l = durata(lunga);
  if (l) pezzi.push(`un'uscita lunga di ${l}`);
  if (Number.isInteger(palestra) && palestra > 0) pezzi.push(palestra === 1 ? "una seduta di palestra" : `${palestra} sedute di palestra`);
  return `Una settimana tipo, circa ${totale} in bici${pezzi.length ? `, con ${elenco(pezzi)}` : ""}.`;
}

// Una prova che servirà, con il suo nome e a cosa serve, per chi non ha ancora la data o le settimane.
export function provaDaFare(prova) {
  const p = Object.hasOwn(PROVE, prova) ? PROVE[prova] : null;
  return p ? `${p.nome}. ${p.perche}` : null;
}

const NOMI_BORSE = ["Leggere", "Normali", "Pesanti", "Molto pesanti"];
const chili = (kg) => (Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace(".", ","));

// Le borse dell'avventura con «Cambia» (1.3 e 7.7), quattro scelte a un tocco dai chili di STIMA.borseScelte.
export const BORSE_PRONTO = congela({
  cambia: "Cambia",
  domanda: "Quanto pesano le borse piene, senza acqua e cibo?",
  lascia: "Lascia così",
  scelte: STIMA.borseScelte.map((kg, i) => ({ kg, testo: `${NOMI_BORSE[i] || "Borse"}, ${kg} kg` })),
});

// «Borse, circa 10 kg.» origine dice da dove vengono i chili, «tue» quelli scritti dalla persona,
// «prova» quelli del test con le borse, «catalogo» quelli della maggior parte (1.3).
export function rigaBorseKg(kg, origine = "tue") {
  if (!num(kg) || kg <= 0) return null;
  if (origine === "prova") return `Borse, circa ${chili(kg)} kg, come nella tua prova con le borse.`;
  if (origine === "catalogo") return `Borse, circa ${chili(kg)} kg, come la maggior parte.`;
  return `Borse, circa ${chili(kg)} kg.`;
}

// Le borse più leggere, in «Cosa cambia se…». ore sono quelle che le borse aggiungono a ogni giornata.
export function rigaBorseLeggere(kg, ore) {
  const quanto = num(ore) ? durataInParole(ore * 60) : null;
  if (!num(kg) || kg <= 0 || !quanto) return null;
  return `Con le borse più leggere la giornata si accorcia. Oggi i tuoi ${chili(kg)} kg pesano circa ${quanto} al giorno.`;
}

export const CAMBIA_PRONTO = congela({
  borse: "Cambia le borse",
  anteprima: "Ecco come cambia",
  conferma: TASTI.conferma,
  lascia: "Lascia com'è",
});

// La giornata nuova, prima di «Sì, cambia» (2.8). «In 5 giorni ogni giornata dura circa 5 ore e mezza.»
export function anteprimaGiorni(giorni, H) {
  if (!num(giorni) || giorni < 1 || !num(H) || H <= 0) return null;
  if (giorni === 1) return `In un giorno starai in sella circa ${oreAlGiorno(H)}.`;
  return `In ${giorniInParole(giorni)} ogni giornata dura circa ${oreAlGiorno(H)}.`;
}

// «Con il Newbie in 3 giorni ogni giornata dura circa 3 ore.»
export function anteprimaCorto(percorso, giorni, H) {
  if (!percorso || typeof percorso !== "object" || !num(giorni) || giorni < 1 || !num(H) || H <= 0) return null;
  const quanto = giorni === 1 ? `starai in sella circa ${oreAlGiorno(H)}` : `ogni giornata dura circa ${oreAlGiorno(H)}`;
  return `Con ${ilPercorso(percorso)} in ${giorniInParole(giorni)} ${quanto}.`;
}

// Il verdetto nuovo, prima di «Sì, cambia» (2.8). Prima della vigilia è dove si arriva con il piano.
export function anteprimaEsito(esito, fase = "verdetto") {
  if (fase === "proiezione") {
    const f = fraseProiezione(esito);
    return f ? `Con questa scelta, ${minuscola(f)}` : null;
  }
  const v = esito !== "nonValutabile" && Object.hasOwn(VERDETTI, esito) ? VERDETTI[esito] : null;
  return v ? `Con questa scelta il verdetto diventa ${minuscola(v.titolo)}.` : null;
}

// Dopo una scelta fatta in questa pagina, una riga sola in alto.
export const FATTO_PRONTO = congela({
  giorni: "Fatto, ho cambiato i giorni. Qui sotto vedi come cambia la preparazione.",
  corto: "Fatto, ho cambiato percorso. Qui sotto vedi come cambia la preparazione.",
  borse: "Fatto, ho cambiato le borse. Le ore sono già rifatte.",
  borseDalViaggio: "Fatto, ho cambiato le borse. Le tue ore vengono dalle uscite che hai fatto con le borse, quindi cambiano poco.",
  data: "Fatto, ho segnato la partenza.",
  ebike: "Fatto, ho segnato le tue ore in sella.",
});

// La data per un obiettivo che non ce l'ha (7.7).
export const QUANDO_PARTI = congela({
  domanda: "Quando parti?",
  scegli: "Scegli una delle partenze, oppure un altro giorno.",
  etichetta: "Il giorno della partenza",
  salva: "Salva la data",
  errore: "Scegli un giorno da domani in poi.",
});

// «Parto mercoledì 19 maggio»
export function partoIl(giorno) {
  return typeof giorno === "string" && DATA.test(giorno) ? `Parto ${dataLunga(giorno)}` : null;
}

// «Per chi ama i numeri», chiuso (7.7). Qui possono stare kJ, punti e il confronto con la Fitness (7.1),
// e niente decide il verdetto.
export const NUMERI_PRONTO = congela({
  titolo: "Per chi ama i numeri",
  fitness: "La Fitness",
  fitnessCosa: "È la Fitness di Come sto, che conta anche i giri senza sensori e la palestra. Dice quanto lavoro hai messo da parte nelle ultime settimane, non se sei pronto.",
  puntiOra: (k) => (num(k) ? `Il confronto usa i tuoi ${Math.round(k)} punti all'ora, dalle uscite con i sensori delle ultime sei settimane.` : null),
  puntiOraSenzaDati: (k) => (num(k) ? `Il confronto usa ${Math.round(k)} punti all'ora, il valore di chi ha ancora poche uscite con i sensori.` : null),
  giornata: "La giornata",
  lavoro: (kj, punti) => (num(kj) && num(punti)
    ? `Ogni giornata vale circa ${migliaia(Math.round(kj / 100) * 100)} kJ di lavoro sui pedali e ${migliaia(Math.round(punti / 10) * 10)} punti di carico.`
    : null),
  lunghe: "Le uscite lunghe",
  passo: "Il tuo passo",
  passoGiri: (n, giorni) => {
    if (!num(n) || n < 1) return null;
    const quanti = n === 1 ? "1 giro lungo" : `${n} giri lunghi`;
    const quando = num(giorni) && giorni > 0 && giorni % 7 === 0 ? `delle ultime ${giorni / 7} settimane` : num(giorni) ? `degli ultimi ${giorni} giorni` : "recenti";
    return `Per le tue ore in sella uso ${quanti} ${quando}.`;
  },
  forma: "Fitness meno Fatica, alla partenza",
  formaTesto: (forma, da, a, fino) => `Ieri sera Fitness meno Fatica faceva ${forma}. Nei giorni prima di un viaggio come il tuo di solito sale, fino a stare fra ${da} e ${a}. Fino a ${fino} non è un allarme, se hai fatto lo scarico finale.`,
});

// Un giro lasciato fuori dal passo, con «Rimettilo» accanto (1.6). «Sabato 17 ottobre, 3 ore e 10. Non
// usato per il tuo passo, sembra diverso dagli altri.»
export function giroTolto(giorno, ore) {
  if (typeof giorno !== "string" || !DATA.test(giorno)) return null;
  const quanto = durata(ore);
  return `${maiuscola(dataLunga(giorno))}${quanto ? `, ${quanto}` : ""}. ${PASSO_GIRI.tolto}`;
}
