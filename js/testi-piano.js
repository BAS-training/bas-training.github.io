// I testi del piano della settimana (capitolo 3, 7.4, 7.6 e 7.9 della specifica), costruiti dai
// risultati di js/piano.js. Regole di scrittura del 7.1. Del tu, frasi brevi, nessun carattere dei
// due punti, durate in parole, date come «sabato 14 marzo», le prove con il loro nome e mai con le
// sigle, lo scarico finale al posto della parola inglese, nessuna pagella e nessuna promessa medica.
// I grammi dei carboidrati non compaiono, il cibo si dice con il cibo (3.9).
// Niente DOM, così le prove li compongono con node.

import { dataLunga, formatoDurata } from "./formato.js?v=202611021803";
import { DOMENICA, PIANO, STIMA } from "./parametri.js?v=202611021803";

function congela(oggetto) {
  for (const valore of Object.values(oggetto)) {
    if (valore !== null && typeof valore === "object") congela(valore);
  }
  return Object.freeze(oggetto);
}

const NOMI_GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
const IN_LETTERE = ["zero", "una", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci"];
const lettere = (n) => (Number.isInteger(n) && n >= 0 && n < IN_LETTERE.length ? IN_LETTERE[n] : String(n));
const maiuscola = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const S = PIANO.sedute;

function utc(iso) {
  const [a, m, g] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}

// Il nome del giorno della settimana, «sabato». Un aiuto dei testi, non un testo.
function nomeGiorno(iso) {
  return NOMI_GIORNI[(new Date(utc(iso)).getUTCDay() + 6) % 7];
}

// Le durate a parole (7.1), con formatoDurata di js/formato.js, mai sotto il passo più piccolo.
// null senza durata.
export function durata(minuti) {
  if (!(minuti > 0)) return null;
  return formatoDurata(Math.max(STIMA.arrotondaMinuti.passo, minuti));
}

const oreInParole = (ore) => durata(ore * 60);

// --- Le sedute, con il verde (7.4) ---

// Il nome di ogni seduta chiave con l'articolo, per le frasi che la spostano o la fanno saltare.
const NOMI = congela({
  lunga: { nome: "Uscita lunga", conArticolo: "la lunga", f: true },
  scarico: { nome: "Uscita tranquilla", conArticolo: "l'uscita tranquilla", f: true },
  controllo: { nome: "Giro con la bici pronta", conArticolo: "il giro con la bici pronta", f: false },
  weekend: { nome: "Weekend lungo", conArticolo: "il weekend lungo", f: false },
  weekendCarico: { nome: "Weekend con le borse", conArticolo: "il weekend con le borse", f: false },
  T1: { nome: "Test con le borse", conArticolo: "il test con le borse", f: false },
  T2: { nome: "Uscita lunga con le borse", conArticolo: "l'uscita lunga con le borse", f: true },
  T3: { nome: "Prova generale", conArticolo: "la prova generale", f: true },
  prova: { nome: "Prova generale", conArticolo: "la prova generale", f: true },
  blocco: { nome: "Blocco di tre giorni", conArticolo: "il blocco di tre giorni", f: false },
  carica: { nome: "Uscita con le borse", conArticolo: "l'uscita con le borse", f: true },
  unGiorno: { nome: "Uscita con le borse", conArticolo: "l'uscita con le borse", f: true },
  media: { nome: "Giro con qualche salita", conArticolo: "il giro con le salite", f: false },
  richiamo: { nome: "Giro con le accelerazioni", conArticolo: "il giro con le accelerazioni", f: false },
  facile: { nome: "Giro facile", conArticolo: "il giro facile", f: false },
  recupero: { nome: "Giro di recupero", conArticolo: "il giro di recupero", f: false },
  palestra: { nome: "Palestra", conArticolo: "la palestra", f: true },
  tronco: { nome: "Tronco e collo", conArticolo: "tronco e collo", f: false },
});

const ORDINALI = ["primo", "secondo", "terzo"];
const DI_PIU_GIORNI = new Set(["weekend", "weekendCarico", "T3", "prova"]);

export const COME = congela({
  riposo: "Niente bici. Una passeggiata va benissimo.",
  recupero: "Così piano che potresti parlare al telefono. Rapporti agili.",
  facile: "A ritmo da chiacchiera, frasi intere senza fiatone. In salita metti il rapporto agile.",
  media: "Facile in pianura. In 3-5 salite da 4-6 minuti sali a frasi brevi, quando parlare costa un po'. Mai a tutta.",
  richiamo: "Facile, con 4 tratti da un minuto un po' più svelti e 3 minuti facili in mezzo. Tiene sveglie le gambe.",
  lunga: "Facile dall'inizio alla fine, in salita al massimo frasi brevi. Mangia qualcosa ogni 30-40 minuti e bevi a sete.",
  scarico: "Settimana leggera. Se c'è da sistemare la bici, è il momento.",
  controllo: "Facile, con 2-3 tratti da 10 minuti al passo che terrai in viaggio. Controlla che tutto sia a posto.",
  weekend: [
    "Facile e regolare, come un giorno di viaggio. Domani si riparte, quindi oggi non svuotarti.",
    "Tutto facile. Conta come rispondono le gambe il giorno dopo.",
  ],
  weekendCarico: [
    "Bici carica come all'evento, facile e regolare. Domani si riparte, quindi oggi non svuotarti.",
    "Si riparte con la bici carica, tutto facile. Conta come rispondono le gambe il giorno dopo.",
  ],
  T1: "Bici carica come all'evento, su strade simili. Guarda se le borse ballano, come si guida in discesa, come stanno mani e sedere.",
  T2: "La prova del passo e del cibo. Mangia ogni ora come farai in viaggio.",
  T3: [
    "Bici pronta come all'evento. Stasera dormi fuori e prova cena e colazione del viaggio.",
    "Si riparte con la bici carica. Annota cosa cambiare, dopo oggi la posizione non si tocca più.",
  ],
  blocco: "Con le borse, tutto facile. La sera mangia tanto e dormi più che puoi.",
  carica: "Bici carica come all'evento, tutto facile. Ti dice se bici e borse vanno bene insieme.",
  tronco: "Dopo il giro, se ti va.",
  dopoEvento: "Niente piano. Se hai voglia di pedalare, giri facili e corti.",
  tappa: "Oggi la tappa come previsto. I primi 30 minuti piano, poi il tuo passo. Mangia qualcosa ogni ora.",
});

// Le note delle sedute chiave degli schemi (3.4), una riga in più sotto il come.
export const NOTE = congela({
  posizione: "Controlla anche la posizione in sella.",
  fondo: "Scegli strade simili a quelle del viaggio.",
  correzioni: "Sistema quello che hai notato nel test con le borse.",
  sella: "Se vuoi cambiare sella o scarpe, è l'ultima settimana per farlo.",
  setup: "Usa la bici come la porterai al viaggio, borse comprese.",
  ultimo: "È l'ultimo test pieno prima della partenza.",
  ritmo: "Fai qualche tratto al passo che terrai il giorno dell'evento.",
  notteFuori: "Stasera dormi fuori.",
  corto: "Oggi resta più corto, perché la lunga cresce un passo alla volta.",
  daLiberare: "Per farlo ti serve un giorno in più. Te lo chiedo qui sotto.",
});

// Il titolo della seduta come è scritta nel piano, «Uscita lunga, 4 ore».
export function titoloSeduta(s) {
  const d = durata(s.minuti);
  const parte = Number.isInteger(s.parte) && s.parte >= 1 ? s.parte : 1;
  switch (s.tipo) {
    case "riposo": return "Oggi riposo";
    case "recupero": return `Giro di recupero, ${d}`;
    case "facile": return `Giro facile, ${d}`;
    case "media": return `Giro di ${d} con qualche salita`;
    case "richiamo": return `Giro corto con 4 accelerazioni, ${d}`;
    case "lunga": return `Uscita lunga, ${d}`;
    case "scarico": return `Uscita tranquilla, ${d}`;
    case "controllo": return `Giro di ${d} con la bici pronta`;
    case "blocco": return `Blocco di tre giorni, giorno ${parte}, ${d}`;
    case "palestra": return s.titolo || `Palestra, ${s.nome || "la tua scheda"}, circa ${d}`;
    case "tronco": return `${d} di tronco e collo`;
    case "dopoEvento": return "Settimana di recupero";
    case "tappa": return s.di ? `Giorno ${parte} di ${s.di}` : "Giorno di viaggio";
    default:
      if (DI_PIU_GIORNI.has(s.tipo)) return `${NOMI[s.tipo].nome}, ${ORDINALI[parte - 1] || ORDINALI[0]} giorno, ${d}`;
      return NOMI[s.tipo] ? `${NOMI[s.tipo].nome}, ${d}` : `Giro facile, ${d}`;
  }
}

// Il come della seduta, con il verde.
export function comeSeduta(s) {
  const parte = Number.isInteger(s.parte) && s.parte >= 2 ? 1 : 0;
  switch (s.tipo) {
    case "prova": return COME.T3[parte];
    case "T3": return COME.T3[parte];
    case "weekend": return COME.weekend[parte];
    case "weekendCarico": return COME.weekendCarico[parte];
    case "unGiorno": return COME.carica;
    case "palestra": {
      const n = Number.isInteger(s.quanti) && s.quanti > 0 ? s.quanti : null;
      if (!n) return "Apri la scheda per serie e ripetizioni.";
      return `${n === 1 ? "1 esercizio" : `${n} esercizi`}. Apri la scheda per serie e ripetizioni.`;
    }
    default: return COME[s.tipo] || COME.facile;
  }
}

// La seduta in breve, per le sette righe della pagina Settimana (7.6). «Lunga, 3 ore e mezza».
export function inBreve(s) {
  if (!s) return "Riposo";
  const d = durata(s.minuti);
  const conDurata = (testo) => (d ? `${testo}, ${d}` : testo);
  switch (s.tipo) {
    case "riposo": return "Riposo";
    case "recupero": return conDurata("Recupero");
    case "facile": return conDurata("Facile");
    case "media": return conDurata("Con qualche salita");
    case "richiamo": return conDurata("Con 4 accelerazioni");
    case "lunga": return conDurata("Lunga");
    case "scarico": return conDurata("Tranquilla");
    case "controllo": return conDurata("Con la bici pronta");
    case "palestra": return "Palestra";
    case "tronco": return "Tronco e collo";
    case "dopoEvento": return "Recupero";
    case "tappa": return "Viaggio";
    case "blocco": return conDurata(`Blocco, giorno ${s.parte || 1}`);
    default:
      if (DI_PIU_GIORNI.has(s.tipo)) return conDurata(`${NOMI[s.tipo].nome}, giorno ${s.parte || 1}`);
      return conDurata(NOMI[s.tipo] ? NOMI[s.tipo].nome : "Facile");
  }
}

// --- Gli altri livelli (7.4) ---

export const LIVELLO = congela({
  gialloLeggero: "Oggi niente sforzi al massimo.",
  gialloLeggeroMedia: "Salite a frasi brevi, mai di più.",
  gialloLeggeroPalestra: "Una ripetizione in meno in ogni serie, niente salti.",
  gialloComeGiro: "A ritmo da chiacchiera, anche meno. Se preferisci, palestra leggera.",
  gialloPalestra: "Oggi scheda leggera, stesso peso e meno serie.",
  gialloTronco: "Oggi tutto a sforzo moderato, senza fretta.",
  rossoTitolo: "Oggi recupera",
  rossoBici: `Riposo o una camminata. Se proprio vuoi la bici, ${durata(S.rossoBici)} pianissimo.`,
  rossoSenzaBici: "Riposo o una camminata.",
  rossoPalestra: `Oggi solo ${durata(S.mobilitaRosso)} di mobilità dolce.`,
  pochiDati: "Il semaforo impara il tuo normale in quattro settimane. Intanto niente sforzi al massimo.",
  bloccoNonParte: "Il blocco parte solo con il verde. Oggi un giro facile, il blocco lo spostiamo.",
  ritmoSalta: "Le salite di questa settimana saltano, e non si recuperano.",
  facileDopoGrande: "Dopo l'uscita grande di questi giorni oggi resta facile, anche se ti senti bene.",
  settimanaFacile: "È la settimana facile. Oggi solo un giro facile, senza salite a frasi brevi.",
  sonno: "Se hai sonno, oggi evita il traffico e i percorsi tecnici.",
  guardia: "Dopo la fatica di questi giorni oggi il piano è leggero.",
});

// «Giornata tranquilla, giro facile di 1 ora».
export function titoloGiallo(minuti) {
  return `Giornata tranquilla, giro facile di ${durata(minuti)}`;
}

// Oggi in viaggio, con il colore del mattino (4.5 e 9.2).
export const VIAGGIO = congela({
  verde: COME.tappa,
  giallo: "Oggi una tappa più corta e più facile. Se puoi, fermati prima. Domani si rivede.",
  rosso: "Oggi prima di tutto si riposa. Accorcia la tappa, e se qualcosa non va fermati.",
  provaGiallo: "Oggi più corto e più facile. Se puoi, torna prima.",
  provaRosso: "Oggi ci si ferma. Riposo o una camminata, la prova finisce qui.",
});

// --- Spostare, non recuperare (3.10) ---

// Il giorno di uno spostamento, «domenica» nella stessa settimana, altrimenti «sabato 18 aprile».
function quando(giorno, stessaSettimana) {
  return stessaSettimana ? nomeGiorno(giorno) : dataLunga(giorno);
}

function nomeConArticolo(tipo) {
  return (NOMI[tipo] || NOMI.facile).conArticolo;
}

// «La lunga va a domenica.»
export function testoSposta(tipo, giorno, stessaSettimana = true) {
  return `${maiuscola(nomeConArticolo(tipo))} va a ${quando(giorno, stessaSettimana)}.`;
}

// «La lunga la spostiamo a domenica, se stai meglio.»
export function testoSpostiamo(tipo, giorno, stessaSettimana = true) {
  const p = (NOMI[tipo] || NOMI.facile).f ? "la" : "lo";
  return `${maiuscola(nomeConArticolo(tipo))} ${p} spostiamo a ${quando(giorno, stessaSettimana)}, se stai meglio.`;
}

// Una seduta che non si sposta.
export function testoSalta(tipo) {
  if (tipo === "media") return LIVELLO.ritmoSalta;
  if (["lunga", "scarico", "controllo"].includes(tipo)) return `${maiuscola(nomeConArticolo(tipo))} salta questa settimana, e non si recupera.`;
  if (NOMI[tipo] && !["facile", "recupero", "richiamo", "palestra", "tronco"].includes(tipo)) {
    return `${maiuscola(nomeConArticolo(tipo))} salta, e non si recupera. In Pronto vedi cosa cambia.`;
  }
  return "Oggi salta, e non si recupera. Va bene così.";
}

// «La palestra di lunedì passa a martedì.»
export function testoPalestraSposta(da, a) {
  return `La palestra di ${nomeGiorno(da)} passa a ${nomeGiorno(a)}.`;
}

export const PALESTRA_SALTA_OGGI = "Oggi la palestra non ci sta senza stancare la bici. Questa volta salta.";

export const TASTI = congela({
  nonPosso: "Oggi non posso",
  weekendNonPosso: "Questo weekend non posso",
  fatto: "Fatto",
  scheda: "Apri la scheda",
  aggiungi: "Aggiungi un giro",
  cambiaGiorni: "Cambia i giorni in cui puoi pedalare",
  si: "Sì",
  no: "No",
});

// --- La settimana (7.6) ---

// «Per il weekend lungo ti serve anche la domenica 12 aprile. Riesci a liberarla?»
export function domandaGiorno(tipo, giorno) {
  const domenica = nomeGiorno(giorno) === "domenica";
  const nome = tipo === "blocco" ? "il blocco di tre giorni" : nomeConArticolo(DI_PIU_GIORNI.has(tipo) ? tipo : "weekend");
  return `Per ${nome} ti serve anche ${domenica ? "la" : "il"} ${dataLunga(giorno)}. Riesci a ${domenica ? "liberarla" : "liberarlo"}?`;
}

export const AVVISI = congela({
  bloccoWeekend: "Per il blocco servono tre giorni di fila, e questa settimana non ci sono. Diventa un weekend lungo.",
  weekendLunga: "Per il weekend lungo servono due giorni di fila, e questa settimana non ci sono. Diventa un'uscita lunga.",
  palestraSalta: "Questa settimana la palestra non ci sta senza stancare la lunga. La saltiamo.",
  ventiSettimane: "Per un viaggio così servono di solito 20-24 settimane. Il piano fa quello che si può con quelle che ci sono.",
  arrivareRiposato: "Adesso conta arrivare riposato, non fare di più.",
  adattare: "Mancano poche settimane per un viaggio così lungo. L'obiettivo è arrivare e adattare, e in viaggio decide il semaforo del mattino.",
  nonBasta: "Con le ore che hai il piano da solo non basta per questa avventura. In Pronto ti propongo cosa cambiare.",
  corto: "Con queste settimane il piano non arriva a tutto quello che serve. In Pronto ti propongo cosa cambiare.",
  interruzione: "Dopo qualche giorno fermo si riparte con una settimana più leggera, poi il piano riprende.",
  interruzioneLunga: "Sei stato fermo più di tre settimane. Rifaccio il piano da quello che fai adesso, e in Pronto rivediamo l'avventura.",
  crescita: "La Fitness è salita in fretta. Questa settimana le ore restano uguali, e per sette giorni niente sforzi al massimo.",
  senzaGiornata: "Prima dimmi quante ore pensi di stare in sella al giorno.",
  mediaSalta: "Questa settimana il giro con le salite non trova un giorno adatto in settimana. Lo saltiamo, va bene così.",
  richiamoSalta: "Questa settimana il giro con le accelerazioni non trova un giorno adatto in settimana. Lo saltiamo, va bene così.",
});

const NOMI_PROVE_SETTIMANA = congela({
  weekend: "un weekend lungo",
  weekendCarico: "un weekend con le borse",
  T1: "il test con le borse",
  T2: "l'uscita lunga con le borse",
  T3: "la prova generale",
  prova: "la prova generale",
  blocco: "il blocco di tre giorni",
  carica: "un'uscita con le borse",
  unGiorno: "un'uscita con le borse",
});

function elencoGiorni(giorni) {
  const nomi = giorni.map(nomeGiorno);
  if (nomi.length <= 1) return nomi.join("");
  return `${nomi.slice(0, -1).join(", ")} e ${nomi[nomi.length - 1]}`;
}

// La frase in alto della pagina Settimana. s ha tipo, ore, palestre, chiave { tipo, giorno } e, se ci
// sono, mancano (minuti) e giorniNo (i giorni in cui non si pedala).
export function fraseSettimana(s) {
  if (!s) return null;
  if (s.tipo === "dopoEvento") return "Recupero. Niente piano, solo se hai voglia.";
  if (s.tipo === "F") return "Settimana facile. Giri corti e almeno due giorni senza bici.";
  if (s.tipo === "F7") return "Sette giorni facili. Poi un giro di prova di un'ora, per vedere come stai.";
  if (s.tipo === "tapering") return "Si scarica. Meno ore, ma le uscite restano, così le gambe non si addormentano. Se la Fitness scende, è perché ti stai riposando.";
  if (s.tipo === "S") return "Settimana leggera. Il corpo assorbe il lavoro delle ultime settimane. Non è tempo perso, è quando migliori.";
  if (s.tipo === "corto") return AVVISI.arrivareRiposato;
  const ore = oreInParole(s.ore) || "poche ore";
  const chiave = s.chiave && NOMI_PROVE_SETTIMANA[s.chiave.tipo];
  if (chiave) {
    const piuGiorni = DI_PIU_GIORNI.has(s.chiave.tipo) || s.chiave.tipo === "blocco";
    const dove = piuGiorni ? "quasi tutte nel weekend" : `e la seduta che conta è ${nomeGiorno(s.chiave.giorno)}`;
    return `Questa settimana c'è ${chiave}. Servono circa ${ore}, ${dove}.`;
  }
  const n = Number.isInteger(s.palestre) ? s.palestre : 0;
  const palestre = n ? ` e ${n === 1 ? "una palestra" : `${n} palestre`}` : "";
  const lunga = s.chiave && s.chiave.giorno ? ` La seduta che conta è la lunga di ${nomeGiorno(s.chiave.giorno)}.` : "";
  return `Questa settimana ${ore} di bici${palestre}.${lunga}`;
}

// «Questa settimana mancano 1 ora e mezza rispetto al piano, perché giovedì e venerdì non puoi.
// Va bene così, non si recuperano.»
export function fraseMancano(minuti, giorniNo = []) {
  const d = durata(minuti);
  if (!d) return null;
  const lista = Array.isArray(giorniNo) ? giorniNo.filter(dataValida) : [];
  const perche = lista.length ? `, perché ${elencoGiorni(lista)} non puoi` : "";
  return `Questa settimana mancano ${d} rispetto al piano${perche}. Va bene così, non si recuperano.`;
}

const dataValida = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Una seduta chiave accorciata dal tetto del giorno scelto in Impostazioni (3.1 e 3.7 passo 8).
// «Questa settimana mancano 45 minuti rispetto al piano, perché sabato puoi pedalare fino a 3 ore.
// Va bene così, non si recuperano.»
export function fraseTettoGiorno(minuti, giorno, tetto) {
  const d = durata(minuti);
  const fino = durata(tetto);
  if (!d || !fino || !dataValida(giorno)) return null;
  return `Questa settimana mancano ${d} rispetto al piano, perché ${nomeGiorno(giorno)} puoi pedalare fino a ${fino}. Va bene così, non si recuperano.`;
}

// Il conto alla partenza dell'occhiello (7.4), «Mancano 9 settimane alla partenza».
export function contoAllaPartenza(oggi, partenza) {
  if (!oggi || !partenza) return null;
  const giorni = Math.round((utc(partenza) - utc(oggi)) / 86400000);
  if (giorni <= 0) return giorni === 0 ? "Oggi si parte" : null;
  if (giorni < 14) return giorni === 1 ? "Domani si parte" : `Mancano ${giorni} giorni alla partenza`;
  const settimane = Math.floor(giorni / 7);
  return `Mancano ${settimane} settimane alla partenza`;
}

// --- Mangiare e bere (3.9) ---

const C = PIANO.carboidrati.cibo;
const CIBI = congela({
  barretta: { testo: "una barretta", g: C.barretta },
  banana: { testo: "una banana", g: C.banana },
  gel: { testo: "un gel", g: C.gel },
  borraccia: { testo: "una borraccia di bevanda zuccherata", g: C.borraccia },
  mezzaBorraccia: { testo: "mezza borraccia di bevanda zuccherata", g: C.borraccia / 2 },
  panino: { testo: "un panino con la marmellata", g: C.panino },
});

// Le combinazioni di cibo per un'ora, dalla più semplice. Si sceglie la più vicina ai grammi.
const COMBINAZIONI = [
  ["borraccia"], ["gel", "mezzaBorraccia"], ["barretta", "mezzaBorraccia"], ["panino"], ["barretta", "gel"],
  ["barretta", "banana"], ["barretta", "borraccia"], ["panino", "mezzaBorraccia"], ["barretta", "gel", "mezzaBorraccia"],
  ["panino", "gel"], ["barretta", "banana", "mezzaBorraccia"],
];

function elencoCibi(chiavi) {
  const t = chiavi.map((k) => CIBI[k].testo);
  if (t.length === 1) return t[0];
  return `${t.slice(0, -1).join(", ")} e ${t[t.length - 1]}`;
}

// Il cibo di un'ora per un obiettivo in grammi, detto con il cibo. «una barretta e mezza borraccia
// di bevanda zuccherata».
export function ciboPerOra(grammi) {
  let migliore = null;
  for (const c of COMBINAZIONI) {
    const g = c.reduce((s, k) => s + CIBI[k].g, 0);
    const scarto = Math.abs(g - grammi);
    if (!migliore || scarto < migliore.scarto - 1e-9) migliore = { c, scarto };
  }
  return elencoCibi(migliore.c);
}

export const CIBO = congela({
  medio: "Ogni ora una barretta o una borraccia di bevanda zuccherata.",
  lungo: "Mangia ogni 30-40 minuti, per esempio una barretta e mezza borraccia di bevanda zuccherata ogni ora.",
  bere: "Bevi a sete, e non finire mai più pesante di come sei partito.",
  antinfiammatori: "Niente antinfiammatori nelle uscite lunghe e in viaggio.",
  sera: "Stasera mangia bene, pasta, riso o pane e qualcosa di proteico, per esempio uno yogurt greco prima di dormire. Bevi con un po' di sale. Almeno 8 ore a letto e niente caffè dopo il pomeriggio. Prova la cena e la colazione che farai in viaggio.",
});

// La riga del cibo della lunga che allena lo stomaco (regola 8.11).
export function testoStomaco(grammi) {
  return `Oggi allena anche lo stomaco. Ogni ora ${ciboPerOra(grammi)}, come farai in viaggio.`;
}

// La riga facoltativa nella carta dopo la lunga con l'obiettivo di cibo (7.5).
export const STOMACO = congela({
  domanda: "Lo stomaco?",
  scelte: [{ valore: "bene", testo: "Bene" }, { valore: "cosi", testo: "Così così" }, { valore: "male", testo: "Male" }],
});

// --- Il limite del facile (3.8) ---

// «Tieni il battito sotto 124.» e, nelle uscite di 5 ore e più, la riga del battito medio.
export function righeLimite(limite, minuti = 0) {
  if (!limite || !(limite.battito > 0)) return [];
  const righe = [`Tieni il battito sotto ${limite.battito}.`];
  if (minuti >= PIANO.limiteFacile.lungaDaOre * 60 && limite.medioLunghe > 0) {
    righe.push(`Quasi tutto il tempo facile, e il battito medio non oltre ${limite.medioLunghe}.`);
  }
  return righe;
}

// --- La domenica (3.11 e 7.9) ---

const D = DOMENICA;

// Una frase per segnale, per dire cosa ha chiesto riposo.
const FRASI_SEGNALI = congela({
  S1: "I giri facili ti sono sembrati duri.",
  S2: "Ti sei sentito più stanco del solito.",
  S3: "Hai dormito meno del solito.",
  S4: "Le notti dicono che il corpo recupera meno.",
  S5: "Hai segnato febbre o raffreddore.",
  S6: "Mangi meno o hai meno voglia del solito.",
  S7: "Il semaforo ha frenato più giorni.",
});

export const TESTI_DOMENICA = congela({
  nessuno: "Settimana a posto. Si continua con il piano.",
  dueApertura: "Questa settimana il corpo ha chiesto riposo più del solito.",
  dueChiusura: `La prossima la facciamo facile, con giri corti e ${lettere(D.settimanaFacile.giorniSenzaBici)} giorni senza bici.`,
  tre: `Da qualche giorno i segnali di stanchezza sono tanti. Ti propongo una settimana facile, poi un giro di prova di ${durata(D.giorniFacili.riferimentoOre * 60)} per vedere come stai.`,
  febbre: `Con la febbre si riparte ${D.giorniFacili.oreSenzaFebbre} ore dopo l'ultima febbre, senza farmaci per la febbre. Poi giorni facili e un giro di prova di ${durata(D.giorniFacili.riferimentoOre * 60)}.`,
  ancora: "Non va ancora meglio. Altri sette giorni facili, poi rifacciamo il giro di prova.",
  gialliDiFila: "Sono tre giorni che il semaforo frena. Ho guardato la settimana.",
  cibo: "Prima di togliere allenamento, guarda il piatto. Nei giorni lunghi mangia di più. Mangiare poco dà la stessa stanchezza del troppo allenamento.",
  domandaS6: "Questa settimana hai meno fame o meno voglia del solito, o stai perdendo peso senza volerlo?",
  scarico: "La settimana facile prende il posto della settimana leggera che era in programma.",
  scaricoFinale: "Siamo già nello scarico finale, che basta così. Non lo allungo.",
  medico: "Sono più di due settimane che fai poco e la stanchezza non passa. Vale la pena sentire il medico, per escludere cose semplici come la mancanza di ferro.",
  medicoScarico: "Dopo settimane leggere i segnali non tornano normali. Senti il medico prima di riprendere il piano.",
  spento: "In viaggio il controllo della domenica è spento.",
});

// La frase dei due segnali, con quello che li ha fatti scattare. Senza l'elenco restano l'apertura e
// la chiusura.
export function testoDueSegnali(segnali = []) {
  const frasi = (Array.isArray(segnali) ? segnali : []).map((s) => FRASI_SEGNALI[s]).filter(Boolean);
  return [TESTI_DOMENICA.dueApertura, ...frasi, TESTI_DOMENICA.dueChiusura].join(" ");
}

export { FRASI_SEGNALI };

// Gli ingressi di esempio dei modelli che vogliono un tipo di seduta o una data, che la prova della
// scrittura (9.8) non sa costruire da sola. Ogni voce è una lista di argomenti.
export const ESEMPI = congela({
  domandaGiorno: [["weekend", "2027-04-11"], ["blocco", "2027-04-12"], ["prova", "2027-04-11"]],
  fraseTettoGiorno: [[45, "2027-04-10", 180], [80, "2027-04-11", 120]],
});
