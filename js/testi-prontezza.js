// I testi di «Pronto?» (2.9 della specifica), costruiti dai risultati di js/prontezza.js.
// Regole di scrittura del 7.1. Del tu, frasi brevi, nessun carattere dei due punti, durate in
// parole, date come «sabato 14 marzo», le prove con il loro nome e mai con le sigle, lo scarico
// finale al posto della parola inglese, nessuna pagella e nessuna promessa.
// Niente DOM, così le prove le compongono con node.

import { dataLunga } from "./formato.js?v=202610312043";
import { PASSO, PRONTEZZA, STIMA } from "./parametri.js?v=202610312043";
import { arrotondaMezzora } from "./stima.js?v=202610312043";
import { oreInParole, durataInParole } from "./testi-stima.js?v=202610312043";

const MINUTI = STIMA.arrotondaMinuti;
const IN_LETTERE = ["zero", "una", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci"];
const lettere = (n) => (Number.isInteger(n) && n >= 0 && n < IN_LETTERE.length ? IN_LETTERE[n] : String(n));
const giorniInParole = (n) => (n === 1 ? "1 giorno" : `${n} giorni`);

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
});

// La pagina Pronto? segnaposto, finché 7.7 non c'è.
export const PRONTO_PAGINA = congela({
  titolo: "Pronto?",
  senzaObiettivo: "Pronto per cosa? Scegli un evento o un'avventura tua, e qui vedi se ci arrivi pronto.",
  scegli: "Scegli",
  avventura: "La tua avventura",
});
