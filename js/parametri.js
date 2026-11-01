// Tutti i numeri delle regole di Come sto, in un posto solo (appendice A della specifica).
// Un oggetto per gruppo, congelato anche dentro, e accanto a ogni numero la regola del documento
// scientifico (BAS Training, 01_Scienza) o la stima nostra da cui viene. Cambiare un numero vuol
// dire cambiare anche la Guida e, se serve, le prove.
// Unità. Ore dove non è scritto altro, minuti per sedute e palestra, quote in frazioni (0.8 vuol
// dire l'80%), settimane −k contate all'indietro dalla partenza (2.2 e 3.2), giorni della settimana
// con 0 = lunedì come in js/modello.js, H le ore in movimento di una giornata con la bici carica.
// Niente DOM e niente window, così il file si prova con node.

function congela(oggetto) {
  for (const valore of Object.values(oggetto)) {
    if (valore !== null && typeof valore === "object") congela(valore);
  }
  return Object.freeze(oggetto);
}

// Le ore in sella con la bici carica, usato da js/stima.js (capitolo 1).
export const STIMA = congela({
  densitaAria: 1.20,              // kg per m³, capitolo 6, modello fisico
  gravita: 9.81,                  // m/s², modello fisico
  rendimento: 0.96,               // della trasmissione, capitolo 6, modello fisico
  cda: 0.40,                      // m², seduti dritti, capitolo 6, stima nostra
  cdaBorse: { perKg: 0.002, massimo: 0.03, laterali: 0.05 },   // ΔCdA da bikepacking per kg e laterali, capitolo 6, stima nostra
  crr: 0.006,                     // asfalto liscio, capitolo 6, parere
  bisezioneV0: { passi: 60, minimo: 0, massimo: 40 },          // m/s, 1.5 passo 3
  fattoriFondo: { asfalto: 1.00, asfaltoRovinato: 0.95, compatto: 0.91, smosso: 0.79, carrareccia: 0.63 },   // in piano, carrareccia rotta o erba, capitolo 7, modello fisico
  // Le sei classi di fondo (1.2). Quote di asfalto, sterrato compatto e smosso, Fs = somma delle quote
  // divise per il loro fattore in piano, c = costante di salita a 122 W.
  classi: {
    "misto": { quote: { asfalto: 0.40, compatto: 0.40, smosso: 0.20 }, fs: 1.093, c: 11.7 },             // capitolo 7, come il Tuscany Trail
    "sterrato-ripido": { quote: { asfalto: 0.30, compatto: 0.45, smosso: 0.25 }, fs: 1.111, c: 12.5 },   // capitolo 7, come il Trentino Gravel
    "asfalto-passi": { quote: { asfalto: 1.00, compatto: 0, smosso: 0 }, fs: 1.000, c: 11.3 },          // calcolo nostro, salite al 6-8%
    "asfalto-collinare": { quote: { asfalto: 1.00, compatto: 0, smosso: 0 }, fs: 1.000, c: 10.8 },      // calcolo nostro, saliscendi continui
    "asfalto-dolce": { quote: { asfalto: 1.00, compatto: 0, smosso: 0 }, fs: 1.000, c: 9.5 },           // capitolo 7, come la NorthCape4000
    "misto-dolce": { quote: { asfalto: 0.60, compatto: 0.25, smosso: 0.15 }, fs: 1.065, c: 10.0 },       // calcolo nostro, ripio e salite sparse
  },
  costanteSalita: { potenza: 122, perWatt: 0.002, minimo: 0.9, massimo: 1.1 },   // C × (1 + 0,002 × (122 − P)) fra 0,9 e 1,1, 1.5 passo 5, calcolo nostro
  beta: { basso: 0.04, metriPerKmBasso: 8, alto: 0.075, metriPerKmAlto: 15, massaRiferimento: 87, ogniKg: 10 },   // borse, interpolato sui m per km, × 87 / M_cb, regole 6.2 e 6.3
  lateraliPiano: 0.05,            // del tempo in piano senza borse, regola 6.4
  potenza: {
    quotaFtp: 0.625,              // la giornata al 60-65% della FTP, regola 7.2
    ftpUsciteMinime: 3,           // uscite con la potenza del dispositivo, 1.4 e regola 7.2
    ftpSettimane: 8,              // delle ultime 8 settimane, regola 1.10
    tipi: ["Ride", "GravelRide", "MountainBikeRide", "VirtualRide"],   // le uscite in bici che contano per la FTP, e-bike escluse, 1.4
    fattoreGiri: 0.9,             // per il passo dei giri e la media dichiarata, 0,625 / 0,70, stima nostra, prudente
    wattKgSenzaDati: 2.25,        // × 0,625 × massa, fra principiante e amatore, stima nostra, prudente
    wattKgTetto: 3.5,             // × 0,625 × massa, il tetto senza FTP misurata, stima nostra, prudente
  },
  mediaDichiarata: {
    centri: [16, 19.5, 22.5, 25.5, 28.5],   // km/h di «meno di 18», «18-21», «21-24», «24-27» e «più di 27», stima nostra
    oreGiro: 2.5,                 // il giro di prova dura 2 ore e mezza, 1.4
    metriPerKm: 8,                // di salita, 1.4
    classe: "asfalto-collinare",  // 1.4
    biciKg: 9,                    // 1.4
    acquaCiboKg: 1.5,             // 1.4
  },
  masse: {
    ciclista: 75,                 // kg senza risposta, regola 6.1, stima nostra
    pesoFasce: { limiti: [60, 70, 80, 90, 100], centri: [55, 65, 75, 85, 95, 105] },   // da sotto 60 a 100 e oltre, 1.3
    bici: { strada: 9, gravel: 11, mountainBike: 13 },   // kg, 1.3, stima nostra
    acquaCibo: 2,                 // kg, regola 6.1, stima nostra
    acquaCiboPatagonia: 3,        // regola 6.1, stima nostra
    acquaCiboUnGiorno: 1.5,       // regola 6.1, stima nostra
  },
  borseScelte: [5, 8, 12, 16],    // kg, «Leggere», «Normali», «Pesanti» e «Molto pesanti», stima nostra
  fattoreDislivello: { planner: 1.10, altrove: 1.00 },   // dislivello ufficiale da planner su colline e sterrato, stima nostra, prudente
  giorniEffettivi: { daGiorni: 11, ogni: 6, riduzione: 0.4 },   // G − 0,4 × parte intera di G / 6, regola 3.4, stima nostra, prudente
  forbice: [0.15, 0.10, 0.08, 0.06],   // ± su H ai livelli di dato 0, 1, 2 e 3, stima nostra
  giornataIntera: { minimo: 1.25, massimo: 1.4 },   // × H con le soste, regola 7.4
  lavoro: { kjPerWattOra: 3.6, qCollina: 0.85, qPiano: 0.95, collinaDaMetriPerKm: 10 },   // kJ = 3,6 × P × H × q, regola 7.5
  punti: { ifPerFtp: 0.96, moltiplicatori: { asfalto: 1.00, compatto: 1.075, smosso: 1.15 } },   // H × IF² × 100 × m, regola 7.5, m stima nostra
  arrotonda: { ore: 0.5, km: 5, metri: 50 },   // H alla mezz'ora con la mezza esatta in su, strada al giorno, 1.1 e 1.5 passo 10
  arrotondaMinuti: { passo: 5, passoLunghe: 10, lungheDa: 120 },   // le durate a parole del 7.1, a 5 minuti sotto le 2 ore e a 10 sopra, stima nostra
  giornoInPiuDaH: 9,              // per 2-5 giorni l'app dice come scende la giornata con un giorno in più, 1.11, regola 7.7
  giornoInPiuGiorni: { da: 2, a: 5 },   // la frase vale per 2-5 giorni e mai oltre i giorni massimi del percorso, 1.11
  oreEbike: [4, 5, 6, 7, 8, 9],   // le ore al giorno chieste a chi va in e-bike, 1.8, stima nostra
  tipiEbike: ["EBikeRide", "EMountainBikeRide"],   // l'ultimo giro lungo di questi tipi vale «Vado con la e-bike», 1.8
  obiettivoLibero: {
    oreGiro: [3, 4, 5, 6, 8],     // «Un giro lungo di … ore», 1.9
    giorniDiFila: [2, 3],         // «Più giorni di fila», 1.9
    borseKg: 8,                   // con le borse e nei giorni di fila, 1.9
    acquaCiboKg: 1.5,             // 1.9
    classi: { strada: "asfalto-collinare", gravel: "misto", misto: "misto", mountainBike: "sterrato-ripido" },   // 1.9
    bici: { strada: 9, gravel: 11, misto: 11, mountainBike: 13 },   // kg se il profilo non dice la bici, come 1.3, stima nostra
  },
});

// Il passo personale dai propri giri, usato da js/stima.js con potenzaDaGiri (1.6).
export const PASSO = congela({
  minutiMinimi: 90,               // in movimento, stima nostra
  kmMinimi: 20,                   // stima nostra
  velocita: { minima: 8, massima: 40 },     // km/h di media, stima nostra
  metriPerKm: { minimi: 0, massimi: 40 },   // dislivello del dispositivo senza fattore, stima nostra
  zeroOltreKm: 30,                // un giro all'aperto di oltre 30 km senza dislivello resta fuori, 6.3
  borseSenzaRispostaOltreOre: 3,  // oltre 3 ore senza la risposta sulle borse il giro resta fuori, 6.3
  giorni: 84,                     // prima gli ultimi 84 giorni, stima nostra
  giorniRiserva: 182,             // se non bastano, gli ultimi 182, stima nostra
  giriMinimi: 3,                  // stima nostra, dalla proposta semplice
  oreMinime: 6,                   // in tutto, stima nostra
  bisezione: { minimo: 40, massimo: 450, passi: 60 },   // W, 1.6
  erroreMassimo: 0.30,            // seconda passata, fuori i giri con un errore relativo oltre il 30%, stima nostra
  // Il fondo dei giri di casa per tipo di intervals.icu. Gli altri tipi non entrano nel passo.
  tipi: {
    Ride: { classe: "asfalto-collinare", biciKg: 9 },        // stima nostra
    GravelRide: { classe: "misto", biciKg: 11 },             // stima nostra
    MountainBikeRide: { classe: "sterrato-ripido", biciKg: 13 },   // stima nostra
  },
  acquaCiboKg: 1.5,               // stima nostra
});

// Il fattore carico personale delle uscite con le borse, usato da js/stima.js con fattoreCarico (1.7).
export const BORSE = congela({
  oreMinime: 3,                   // uscite cariche di almeno 3 ore, regola 6.11
  giorni: 365,                    // degli ultimi 365 giorni, 1.7
  minimo: 1.00,                   // mediana tenuta fra 1,00 e 1,40, stima nostra
  massimo: 1.40,                  // stima nostra
  giorniDiFila: 2,                // livello 3 dall'ultimo viaggio carico di almeno 2 giorni «come all'evento», stima nostra
});

// Pronto o no, usato da js/prontezza.js (capitolo 2).
export const PRONTEZZA = congela({
  classi: ["1", "2-5", "6-10", "11+"],   // per giorni, regola 7.6
  classiFinoA: [1, 5, 10],        // l'ultimo giorno delle prime tre classi, regola 7.6
  // Ore a settimana e uscita lunga in frazioni di H (2.1). Per 11 giorni e più i minimi valgono con H da 9.
  obiettivi: {
    "1": { vMin: 0.8, vMinAlmeno: 3, vComodo: 1.1, lt: 0.75 },   // minimo stima nostra dalla tabella 7.7, comodo e lunga regola 7.7
    "2-5": { vMin: 0.9, vComodo: 1.15, lt: 0.7, ltMinimo: 3, ltMassimo: 7 },   // regola 7.7
    "6-10": { vMin: 0.95, vComodo: 1.2, lt: 0.65, ltMassimo: 7 },   // rifà la tabella 7.7 a H 8, stima nostra, lunga regola 6.6
    "11+": { vMin: 0.9, vComodo: 1.1, lt: 0.6, ltMassimo: 8, daH: 9, vMinAlmeno: 9.5, vComodoAlmeno: 11.5 },   // tabella 7.7, il valore più alto
  },
  comodoMassimo: 12,              // ore a settimana, oltre non ci sono dati (Valenti e coll. 2022), 2.1
  proveMinime: { "1": [], "2-5": ["T1", "T3"], "6-10": ["T1", "T2", "T3"], "11+": ["T1", "blocco", "T3"] },   // T3 è la prova generale, regole 3.7, 3.8, 6.7 e 6.8
  t2OltreH: 6,                    // per 2-5 giorni il T2 serve con H oltre 6 o al primo viaggio, regola 6.7
  unGiornoBorseOltreKg: 4,        // per un giorno la prova serve solo con un obiettivo con le borse, 2.1
  giornoCaricoOre: 3,             // un giorno carico, «Sì, come all'evento», regola 6.5
  // Le soglie in frazioni di H, il 90% delle sedute più piccole che regole e piano mettono (2.4).
  soglie: {
    T2: { "2-5": 0.63, daSei: 0.45 },   // 90% di 0,7 e 0,5, regole 6.6 e 3.7
    T3: { giorno1: 0.63, giorno1DaSei: 0.54, giorno2: 0.45 },   // 90% di 0,7, 0,6 e 0,5, regole 3.7 e 3.8
    blocco: 0.45,                 // ognuno dei 3 giorni, 90% di 0,5, regola 3.8
    unGiorno: 0.45,               // obiettivo di un giorno con le borse, stima nostra
  },
  bloccoGiorni: 3,                // regola 3.8
  giorniProvaFinita: 21,          // l'ultimo test pieno finisce almeno 21 giorni prima, dopo conta con la nota «fatta tardi», regola 6.7
  doppioUso: { giorni: 3, daGiorni: 21, aGiorni: 42 },   // 3 giorni carichi finiti fra 21 e 42 giorni prima valgono blocco e prova generale, 2.4, stima nostra
  // Le settimane −k. Una prova vale se comincia dalla sua finestra in poi, fino alla partenza, e finita
  // negli ultimi 21 giorni conta con la nota «fatta tardi» (2.4). La fine dice dove la mette il piano.
  finestre: {
    volume: { da: -10, a: -3 },   // otto settimane con gli scarichi, regola 7.7
    lunga: { da: -8, a: -3 },     // 1 giorno e 2-5 giorni, regola 7.8
    lungaDaSei: { da: -10, a: -3 },   // 6 giorni e più, regola 7.8
    T1: { da: -16, a: -3 },       // regole 6.7 e 6.8
    T2: { da: -10, a: -3 },       // regole 6.7 e 6.8
    T3: { da: -10, a: -1 },       // fino alla partenza, entro 21 giorni con la nota «fatta tardi», 2.4
    blocco: { da: -9, a: -4 },    // regola 6.8
    unGiorno: { da: -10, a: -3 }, // la prova di un giorno con le borse, come l'uscita lunga carica, stima nostra, prudente
  },
  // I percorsi corti dello stesso evento, dal più lungo (2.8). Un percorso che non c'è prende quelli
  // dello stesso evento con meno km.
  percorsiCorti: {
    "tt-originale": ["tt-newbie"],
    "tt-originale-detour": ["tt-originale", "tt-newbie-detour", "tt-newbie"],
    "tt-newbie-detour": ["tt-newbie"],
    "tg-lungo": ["tg-corto"],
    "tg-medio": ["tg-corto"],
    "tge-is-classic": ["tge-is-express"],
    "ur-pa-lungo": ["ur-pa-corto"],
    "ur-vds-lungo": ["ur-vds-corto"],
    "ur-fc-lungo": ["ur-fc-corto"],
    "nc4k-rovereto": ["nc4k-berlino"],
    "ffp-completo": ["ffp-puma", "ffp-guanaco", "ffp-huemul"],
    "ffp-puma": ["ffp-guanaco", "ffp-huemul"],
    "ffp-guanaco": ["ffp-huemul"],
  },
  continuitaGiorni: 56,           // il buco più lungo fra il giorno −56 e il −1, regola 2.9
  pilastri: {
    volume: { difetto0Da: 1, difetto1Da: 0.8 },       // × V_min, stima nostra
    lunga: { difetto0Da: 0.9, difetto1Da: 0.75 },     // × LT, stima nostra
    continuita: { difetto1Da: 21, difetto2Da: 28 },   // giorni di fila senza bici, regola 2.9
  },
  verdetto: { settimaneMinime: 4, quasiPronto: 1, pocoPronto: 2 },   // settimane con dati su 8, somme dei difetti, 2.5, stima nostra
  // Quote delle ore note, settimane di dati, 2.5, stima nostra. Con il 70% esatto la fiducia è bassa,
  // come vuole la prova dei 6 giri da Strava di 9.3. Un giro senza durata vale la mediana degli altri,
  // e un'ora senza nessun giro con la durata, solo per la quota.
  fiducia: { alta: 0.9, media: 0.7, settimaneMinime: 6, borseDaOre: 3, oreSenzaDurata: 1 },
  giorniConsigliati: {
    tettoH: 10,                   // ore al giorno di buon senso, stima nostra
    tettoHDaUndici: 12,           // per 11 giorni e più, stima nostra
    fattoreLunga: 1.5,            // giorni = T / (1,5 × L_rif) per eccesso, regola 7.11
    settimaneLunga: 6,            // L_rif è la più lunga delle ultime 6 settimane, regola 7.11
    settimaneLRif: 8,             // quando mancano 8 settimane o meno, altrimenti il picco del piano, 2.8
    giorniCerca: 60,              // fin dove si cercano i giorni consigliati senza un percorso, stima nostra
  },
  // Gli specchi, che non decidono (2.6). Il k senza dati è CARICO.puntiOraSenzaDati.
  specchi: {
    minutiMinimi: 45,             // uscite per il k personale, regola 7.9
    settimane: 6,                 // regola 7.9
    usciteMinime: 3,              // sotto, il k senza dati, regola 7.9
    divisoreTapering: 0.9,        // dopo l'inizio del tapering la Fitness si divide per 0,9, regola 2.8
    sottoSpecchio: 0.7,           // V a posto e Fitness sotto 0,7 × specchio minimo, si chiede lo sforzo, stima nostra
    durabilita: { ore: 4, giorni: 28 },   // uscite di almeno 4 ore negli ultimi 28 giorni, regola 1.11
    palestraSettimane: 8,         // sedute di gambe delle ultime 8 settimane, 2.6
    stomacoDa: -10,               // lunghe con i carboidrati dalla settimana −10, regola 8.11
    formaPartenza: { breve: [0, 15], lunga: [5, 20], nonAllarmeDa: -10 },   // fino a 5 giorni e viaggi di 2-3 settimane, regola 1.12
  },
  proiezione: {
    baseOltre: 12,                // settimane alla partenza oltre cui «Siamo nella base», 2.7
    baseOltreDaUndici: 16,        // per 11 giorni e più, 2.7
    storiaMinima: 3,              // settimane di uscite per dire dove arrivi, 2.7
    sottoPiano: 0.85,             // ore fatte sotto l'85% del piano, 2.7
    settimaneControllo: 3,        // nelle ultime 3 settimane, 2.7
    domenicheDiFila: 2,           // due domeniche di fila e il piano si rifà, 3.12
    settimaneConfronto: 4,        // prima della −10 le ultime 4 settimane, 2.7
    giorniLunga: 30,              // la lunga vera degli ultimi 30 giorni, 2.7
    // I giorni delle sedute chiave che il piano dà senza data, 0 = lunedì. Lunga e prove di un giorno
    // sul giorno con la stella, weekend e prova generale sabato e domenica, il blocco da venerdì, 3.7.
    giorniChiave: { unGiorno: [5], dueGiorni: [5, 6], blocco: [4, 5, 6] },
  },
});

// Il piano della settimana, usato da js/piano.js (capitolo 3). Gli schemi di 3.4 sono qui come dati,
// con le ore in frazioni di V_obiettivo e le sedute chiave in frazioni di H. Il tipo della settimana
// è N normale, E eccezione prevista, S scarico. L'ultimo test pieno resta ad almeno
// PRONTEZZA.giorniProvaFinita giorni dalla partenza (regola 6.7).
export const PIANO = congela({
  versione: 1,                    // il numero delle regole del generatore, per rifare il piano quando cambiano, 3.13
  // Quale schema, con quante settimane N (3.3).
  scelta: {
    unGiorno: 10,                 // schema D intero, prima le settimane di base
    dueCinque: 12,                // schema A intero
    dueCinqueB: 8,                // da 8 a 11 settimane lo schema B, se c'è la base
    corto13: 6,                   // 6 o 7 settimane, piano corto della regola 7.13
    corto14: 4,                   // 4 o 5 settimane, regola 7.14, sotto la 7.15
    seiDieci: 16,                 // schema C intero con il blocco consigliato e acceso
    undici: 20,                   // schema C con il blocco obbligatorio, regola 7.18
    cortoDaSei: 10,               // da 6 giorni in su, sotto piano corto e «arrivare e adattare», 3.3
    baseB: { ore: 0.7, lunga: 0.4, settimane: 6 },   // la base dello schema B, × V_obiettivo a settimana e una lunga di × H nelle ultime 6 settimane, 3.3
  },
  // Gli schemi della regola 7.12 riscritti in frazioni (3.4). w è la settimana −w, ore la frazione di
  // V_obiettivo (senza ore uno scarico vale PIANO.scarico.ore della settimana prima), chiave la seduta
  // chiave con le frazioni di H di ogni giorno, minimo e massimo in ore, palestra le sedute massime.
  schemi: {
    A: [
      { w: 12, tipo: "N", ore: 0.75, chiave: { tipo: "lunga", h: [0.45], nota: "posizione" }, palestra: 2 },
      { w: 11, tipo: "N", ore: 0.87, chiave: { tipo: "lunga", h: [0.5] }, palestra: 2 },
      { w: 10, tipo: "E", ore: 0.93, chiave: { tipo: "T1", h: [0.5], minimo: 3, massimo: 4, nota: "fondo" }, palestra: 2 },
      { w: 9, tipo: "S", chiave: { tipo: "scarico", h: [0.3], minimo: 2, nota: "correzioni" }, palestra: 2 },
      { w: 8, tipo: "E", ore: 1.2, chiave: { tipo: "weekend", h: [0.65, 0.45] }, palestra: 2 },
      { w: 7, tipo: "E", ore: 1.07, chiave: { tipo: "T2", h: [0.7] }, palestra: 2 },
      { w: 6, tipo: "S", chiave: { tipo: "scarico", h: [0.35], nota: "sella" }, palestra: 2 },
      { w: 5, tipo: "E", ore: 1.27, chiave: { tipo: "weekend", h: [0.7, 0.45] }, palestra: 2 },
      { w: 4, tipo: "E", ore: 1.33, chiave: { tipo: "T3", h: [0.8, 0.55], nota: "ultimo" }, palestra: 1 },
      { w: 3, tipo: "N", ore: 0.93, chiave: { tipo: "lunga", h: [0.5], nota: "setup" }, palestra: 1 },
      { w: 2, tipo: "tapering", chiave: { tipo: "controllo", h: [0.3], minimo: 2, massimo: 2.5 }, palestra: 1 },
      { w: 1, tipo: "tapering", palestra: 0 },
    ],
    B: [
      { w: 8, tipo: "E", ore: 0.83, chiave: { tipo: "T1", h: [0.5], minimo: 3, massimo: 4 }, palestra: 1 },
      { w: 7, tipo: "E", ore: 1.1, chiave: { tipo: "weekend", h: [0.6, 0.4] }, palestra: 1 },
      { w: 6, tipo: "S", chiave: { tipo: "scarico", h: [0.3], minimo: 2, nota: "correzioni" }, palestra: 1 },
      { w: 5, tipo: "E", ore: 1.1, chiave: { tipo: "T2", h: [0.7] }, palestra: 1 },
      { w: 4, tipo: "E", ore: 1.3, chiave: { tipo: "T3", h: [0.75, 0.5], nota: "ultimo" }, palestra: 1 },
      { w: 3, tipo: "N", ore: 0.97, chiave: { tipo: "lunga", h: [0.5], nota: "setup" }, palestra: 1 },
      { w: 2, tipo: "tapering", chiave: { tipo: "controllo", h: [0.3], minimo: 2, massimo: 2.5 }, palestra: 1 },
      { w: 1, tipo: "tapering", palestra: 0 },
    ],
    // Il giorno 2 della prova generale a 0,5 × H e la −4 a 1,2 (tabella delle contraddizioni). Il T1
    // «fra 3 e 4 ore» usa 0,5 × H come lo schema A. Il weekend carico della −9 ha la notte fuori da 11
    // giorni in su (weekendCarico).
    C: [
      { w: 16, tipo: "N", ore: 0.67, chiave: { tipo: "lunga", h: [0.27] }, palestra: 2 },
      { w: 15, tipo: "N", ore: 0.77, chiave: { tipo: "lunga", h: [0.32] }, palestra: 2 },
      { w: 14, tipo: "E", ore: 0.82, chiave: { tipo: "T1", h: [0.5], minimo: 3, massimo: 4 }, palestra: 2 },
      { w: 13, tipo: "S", ore: 0.52, chiave: { tipo: "scarico", h: [0.23], minimo: 2 }, palestra: 2 },
      { w: 12, tipo: "E", ore: 0.93, chiave: { tipo: "weekend", h: [0.43, 0.27] }, palestra: 2 },
      { w: 11, tipo: "E", ore: 0.98, chiave: { tipo: "T2", h: [0.5] }, palestra: 2 },
      { w: 10, tipo: "S", ore: 0.62, chiave: { tipo: "scarico", h: [0.27], nota: "correzioni" }, palestra: 2 },
      { w: 9, tipo: "E", ore: 1.13, chiave: { tipo: "weekendCarico", h: [0.55, 0.36] }, palestra: 2 },
      { w: 8, tipo: "E", ore: 1.08, chiave: { tipo: "weekend", h: [0.45, 0.32] }, palestra: 1 },
      { w: 7, tipo: "S", ore: 0.62, chiave: { tipo: "scarico", h: [0.27] }, palestra: 1 },
      { w: 6, tipo: "E", ore: 2.0, chiave: { tipo: "blocco", h: [0.6, 0.6, 0.55] }, palestra: 1 },
      { w: 5, tipo: "S", ore: 0.52, chiave: { tipo: "scarico", h: [0.25] }, palestra: 1 },
      { w: 4, tipo: "E", ore: 1.2, chiave: { tipo: "prova", h: [0.6, 0.5], nota: "ultimo" }, palestra: 1 },
      { w: 3, tipo: "N", ore: 0.88, chiave: { tipo: "lunga", h: [0.36], nota: "setup" }, palestra: 1 },
      { w: 2, tipo: "tapering", chiave: { tipo: "lunga", h: [0.27] }, palestra: 1 },
      { w: 1, tipo: "tapering", palestra: 0 },
    ],
    // Un giorno, dalla proposta semplice con le regole 2.4 e 7.7. Le palestre seguono la fase.
    D: [
      { w: 10, tipo: "N", ore: 0.89, chiave: { tipo: "lunga", h: [0.5] }, palestra: 2 },
      { w: 9, tipo: "N", ore: 0.95, chiave: { tipo: "lunga", h: [0.55] }, palestra: 2 },
      { w: 8, tipo: "N", ore: 1.05, chiave: { tipo: "lunga", h: [0.6] }, palestra: 2 },
      { w: 7, tipo: "S", chiave: { tipo: "scarico", h: [0.4] }, palestra: 2 },
      { w: 6, tipo: "N", ore: 1.05, chiave: { tipo: "lunga", h: [0.65] }, palestra: 2 },
      { w: 5, tipo: "N", ore: 1.11, chiave: { tipo: "lunga", h: [0.7] }, palestra: 2 },
      { w: 4, tipo: "N", ore: 1.16, chiave: { tipo: "lunga", h: [0.75] }, palestra: 1 },
      { w: 3, tipo: "S", chiave: { tipo: "scarico", h: [0.45] }, palestra: 1 },
      { w: 2, tipo: "N", ore: 1.0, chiave: { tipo: "lunga", h: [0.6], nota: "ritmo" }, palestra: 1 },
      { w: 1, tipo: "tapering", palestra: 0 },
    ],
    // Da 50 anni con il 2+1 (3.4), le righe che cambiano. Nello schema A lo scarico della −12 tiene la
    // lunga dello schema. Nello schema D la −4 diventa scarico con la lunga dello scarico della −3, e la
    // −3 normale con le ore della −4, stima nostra.
    A50: [
      { w: 12, tipo: "S", chiave: { tipo: "lunga", h: [0.45], nota: "posizione" } },
      { w: 3, tipo: "S", chiave: { tipo: "lunga", h: [0.4], nota: "setup" } },
    ],
    B50: [{ w: 3, tipo: "S", chiave: { tipo: "lunga", h: [0.5], nota: "setup" } }],
    C50: [{ w: 16, tipo: "S", chiave: { tipo: "lunga", h: [0.27] } }],
    D50: [
      { w: 10, tipo: "S", chiave: { tipo: "lunga", h: [0.5] } },
      { w: 5, tipo: "N", ore: 1.11, chiave: { tipo: "lunga", h: [0.75] } },
      { w: 4, tipo: "S", chiave: { tipo: "scarico", h: [0.45] } },
      { w: 3, tipo: "N", ore: 1.16, chiave: { tipo: "lunga", h: [0.6] } },
    ],
    // Per 6-10 giorni senza il blocco, due weekend carichi alla −7 e alla −6 e la −5 scarico (regola
    // 7.12). La −8 diventa scarico, così non ci sono mai più di 3 settimane di carico di fila, stima nostra.
    CsenzaBlocco: [
      { w: 8, tipo: "S", ore: 0.62, chiave: { tipo: "scarico", h: [0.27] } },
      { w: 7, tipo: "E", ore: 1.13, chiave: { tipo: "weekendCarico", h: [0.55, 0.4] } },
      { w: 6, tipo: "E", ore: 1.13, chiave: { tipo: "weekendCarico", h: [0.55, 0.4] } },
    ],
    // Un giorno con un obiettivo con le borse, un giorno carico di 0,5 × H alla −6 (3.4).
    Dborse: [{ w: 6, tipo: "N", ore: 1.05, chiave: { tipo: "unGiorno", h: [0.5] } }],
  },
  uscitaMassima: 8,               // da 6 giorni in su l'uscita singola non supera 8 ore, regola 6.6
  // I piani corti (3.4), con le ore in frazioni di h4.
  corti: {
    sei: {                        // regola 7.13, 6 o 7 settimane
      prima: 1.1,                 // con 7 una settimana a h4 × 1,1
      massimo: 1.3,               // le ore non superano mai h4 di oltre il 30%
      righe: [
        { w: 6, tipo: "E", oreH4: 1.175, chiave: { tipo: "T1", h: [0.5], minimo: 3, massimo: 4 } },
        { w: 5, tipo: "E", oreH4: 1.275, chiave: { tipo: "T3", h: [0.8, 0.6], nota: "ultimo" } },
        { w: 4, tipo: "S", scarico: 0.65, chiave: { tipo: "scarico", h: [0.3], minimo: 2, massimo: 3 } },
        { w: 3, tipo: "N", oreH4: 1.2, chiave: { tipo: "lunga", h: [0.65], nota: "setup" } },
        { w: 2, tipo: "tapering", oreH4: 0.6 },
        { w: 1, tipo: "tapering", oreH4: 0.45 },
      ],
    },
    quattro: {                    // regola 7.14, 4 o 5 settimane
      prima: 1.1,
      massimo: 1.2,               // ore mai oltre h4 + 20%
      tapering: 10,               // poi 10 giorni di scarico finale
      righe: [
        { w: 4, tipo: "E", oreH4: 1.2, chiave: { tipo: "T1", h: [0.5], minimo: 3, massimo: 4, nota: "setup" } },
        { w: 3, tipo: "N", oreH4: 1.2, chiave: { tipo: "lunga", h: [0.55], nota: "setup" } },
        { w: 2, tipo: "tapering" },
        { w: 1, tipo: "tapering" },
      ],
    },
    tre: {                        // regola 7.15, meno di 4 settimane, tutto facile
      righe: [{ w: 3, tipo: "corto", oreH4: 0.8 }, { w: 2, tipo: "corto", oreH4: 0.8 }, { w: 1, tipo: "corto", oreH4: 0.5 }],
      carica: { h: 0.3, minimo: 2, massimo: 3, giorniPrima: 10 },   // un'uscita carica di 2-3 ore almeno 7-10 giorni prima, stima nostra, prudente
    },
  },
  // La modalità libera, senza data (3.4, regola 9.10). La riga più vicina alle ore A, con le chiavi a
  // settimane alterne. La lunga di 2 ore-2 ore e mezza vale 2 ore, stima nostra, prudente.
  libero: {
    settimane: 8,                 // senza data si preparano 8 settimane, poi il piano si rifà ogni lunedì, stima nostra
    righe: [
      { ore: 4, chiavi: [{ tipo: "lunga", ore: [2] }] },
      { ore: 6, chiavi: [{ tipo: "lunga", ore: [3] }] },
      { ore: 8, chiavi: [{ tipo: "lunga", ore: [4] }, { tipo: "weekend", ore: [3.5, 2] }] },
      { ore: 10, chiavi: [{ tipo: "lunga", ore: [5] }, { tipo: "weekend", ore: [4.5, 2.5] }] },
    ],
    lungaObiettivo: 0.75,         // con un obiettivo libero di H ore la lunga cresce verso 0,75 × H, 3.4
  },
  // Lo sforzo massimo di ogni seduta da 0 a 10 (3.13), recupero, facile e media da 3.8, i giorni carichi
  // fino a 4 dal giorno 2 come in viaggio (regola 9.2), il resto stima nostra.
  sforzoMassimo: { riposo: 0, recupero: 2, facile: 3, media: 7, richiamo: 7, lunga: 4, scarico: 3, controllo: 4, piuGiorni: 4, prova: 4, palestra: 8, tronco: 5, gialloLeggero: 5, giroGiallo: 3, rossoBici: 2 },
  facileBreve: 30,                // nello scarico e nello scarico finale un giro facile dura da 30 minuti, così restano l'80% delle uscite, stima nostra
  disponibilita: { giorni: [1, 3, 5, 6], stella: 5, ore: [4, 6, 8, 10, 12], orePredefinite: 6 },   // martedì, giovedì, sabato e domenica, stella sul sabato, 3.1
  storicoDichiarato: { centri: [1.5, 3, 5, 7, 9], predefinito: 3 },   // h4 senza giri, da «meno di 2» a «più di 8», 3.1, stima nostra
  storicoSettimane: 4,            // h4 è la media delle ultime 4 settimane, e le 4 settimane vere prima del piano, 3.1
  lungaDichiarata: { quota: 0.45, minimo: 1, massimo: 3 },   // L30 = 0,45 × h4 fra 1 e 3 ore, 3.1, stima nostra, prudente
  doloriCheTornano: { mattine: 3, giorni: 14, acciacchiDa: 2 },   // un fastidio o un dolore (injury da 2, con l'infortunio) in 3 mattine delle ultime 2 settimane, 3.1
  base: { crescita: 0.075, oreMinime: 1.5 },   // settimane di base, regola 2.6 che dice 5-10%, stima nostra
  passoLunga: { quota: 0.20, minuti: 45, quotaDolori: 0.10, giorniFermi: 7, giorni: 30 },   // il minore fra +20% e +45 minuti sulla più lunga di 30 giorni, regola 2.4
  tettoSettimana: { quota: 0.15, settimane: 3, sottoOre: 3, passoSotto: 0.5, chiavePiu: 1 },   // regola 2.6, stima nostra, prudente, e regola 2.2
  fitness: { quota: 0.08, settimane: 3, punti: 5, sotto: 60 },   // salita massima della Fitness, regola 2.6
  scarico: { ore: 0.6, uscite: 0.8, ogni: 3, ogniDaAnni50: 2, daAnni: 50 },   // 3+1, 2+1 da 50 anni già acceso, regola 2.7, 60% stima nostra
  lungaScarico: { quota: 0.3, minimo: 2, massimo: 3 },   // × H fra 2 e 3 ore, fuori dagli schemi, 3.4 e 3.5, stima nostra
  dopoBlocco: { massimo: 0.7, settimanaOltre: 1.5 },   // dopo un blocco o una settimana oltre il 150% del solito, regola 2.7
  tapering: {
    normale: { giorni: 14, fasi: [{ da: 14, a: 8, fattore: 0.70 }, { da: 7, a: 4, fattore: 0.55 }, { da: 3, a: 1, fattore: 0.30 }] },   // regola 2.8
    corto: { giorni: 10, sottoOre: 5, fasi: [{ da: 10, a: 4, fattore: 0.60 }, { da: 3, a: 1, fattore: 0.30 }] },   // V_rif sotto 5 ore, regola 2.8
    lungo: { giorni: 16, daAnni: 55, fasi: [{ da: 16, a: 8, fattore: 0.70 }, { da: 7, a: 4, fattore: 0.55 }, { da: 3, a: 1, fattore: 0.30 }] },   // regola 2.10
    unGiorno: { giorni: 7, fasi: [{ da: 7, a: 4, fattore: 0.60 }, { da: 3, a: 1, fattore: 0.35 }] },   // evento di un giorno, stima nostra
    uscite: 0.8,                  // restano almeno l'80% delle uscite, regola 2.8
    giorniSenzaBici: 3,           // mai più di 2-3 giorni di fila senza bici, salvo il viaggio, regola 2.8
    settimanaDaGiorni: 4,         // una settimana con almeno 4 giorni nello scarico finale è dello scarico finale, stima nostra
    pieno: { forma: -30, settimane: 3, rossi: 2 },   // con la Forma sotto −30 o più giorni Rosso nelle 2-3 settimane prima, regola 2.8
  },
  interruzioni: { sottoPrevisto: 0.3, giorni: 7, giorniRidotta: 21, ridotta: 0.75, giorniCerca: 60 },   // oltre 21 giorni il piano si rifà, regola 2.9, i giorni persi si cercano negli ultimi 60, stima nostra
  avvisoMancanoMinuti: 30,        // le ore che non ci stanno si scrivono da mezz'ora in su, 3.7 passo 8, stima nostra
  settimanaZeroSotto: 4,          // con meno di 4 giorni fra la −1 e la partenza solo giri facili, senza il richiamo, stima nostra
  crescitaRapida: { in7Giorni: 7, perSettimana: 5, settimane: 3, in7GiorniDa50: 5, perSettimanaDa50: 4, daAnni: 50 },   // punti di Fitness, regola 1.9
  settimana: { giorniRiposo: 1, riposoDaGiorni: 3, quotaFacili: 2 / 3 },   // un giorno senza bici e palestra nelle settimane da 3 giorni di piano, regola 8.16, 2 uscite su 3 facili, regola 2.1
  // Regole 2.5 e 8.8. Dopo un blocco 3-5 facili, i primi 3 sempre, il quarto e il quinto salvo la media
  // della settimana, che la regola 2.2 vuole anche lì. Dopo un'uscita grande 2 giorni (3 da 50 anni) di
  // riposo o di giro molto facile fino a 60 minuti, la regola 8.8 dice 1-2 e 2-3, stima nostra, prudente.
  giorniDopo: {
    riposo: 1, riposoDa50: 2, daAnni: 50, facili: 1, facileDopoBlocco: 5, facileDopoBloccoSempre: 3, uscitaOltreOre: 4,
    dopoGrande: { giorni: 2, giorniDa50: 3, minuti: 60 },
  },
  media: { giorniDopoFatiche: 3, ordineGiorni: [1, 2, 3, 0, 4] },   // mai nei 3 giorni dopo weekend, prove e blocchi, martedì per primo, 3.7, stima nostra
  // Le sedute, in minuti (3.8).
  sedute: {
    facile: { minimo: 45, massimo: 90 },   // 3.8, menu delle sedute del capitolo 2
    media: { minimo: 60, massimo: 90, sostenutiMinimo: 15, sostenutiMassimo: 30, quotaOre: 0.4, scarico: 60 },   // regola 2.2, 0,4 delle ore dopo la chiave stima nostra, 3.7
    recupero: { minimo: 30, massimo: 45 },   // il giorno dopo weekend, prove e blocchi, regola 2.5
    richiamo: { minimo: 45, massimo: 60 },   // nello scarico finale, 3.8
    lungaMinimo: 120,             // dalle 2 ore al picco della regola 2.4, 3.8
    controlloCarico: { minimo: 120, massimo: 150 },   // solo nel tapering, regola 6.7
    palestra: { minimo: 40, massimo: 60 },   // 5.2
    giroGiallo: { massimo: 90, segnaleForte: 45, minimo: 30 },   // regola 2.11, durate dalla proposta semplice
    rossoBici: 45,                // con il Rosso, se proprio bici, regola 9.4
    mobilitaRosso: 10,            // la palestra con il Rosso, regole 4.5 e 9.4
  },
  tettiGiorni: { stella: 1440, feriale: 90, altroWeekendFacile: 90, scelte: [0, 60, 90, 120, 180, 1440] },   // minuti, 1440 vuol dire senza limiti, 3.1, stima nostra
  // La palestra (capitolo 5). Le finestre nella settimana servono a js/piano.js (3.7), il resto a
  // js/palestra.js. Le nove schede, con serie, ripetizioni, recuperi e riserve, sono dati di js/palestra.js.
  palestra: {
    oreGambePrimaLunga: 24,       // niente gambe nelle 24 ore prima di un'uscita di oltre 3 ore, regola 4.4
    oreGambePrimaLungaInizio: 48, // nelle prime 4 settimane di ogni blocco nuovo, regola 4.4
    settimaneInizio: 4,           // regola 4.4
    lungaOltreOre: 3,             // regola 4.4
    oreDopoFatiche: 72,           // niente gambe dopo weekend, prove e blocchi, regole 2.5 e 4.4
    giorniFraSedute: 2,           // nella stessa settimana, 3.7
    giorniFraSeduteFamiliarizzazione: 3,   // 72 ore nella familiarizzazione, 3.7
    primeSedute: 2,               // dopo le prime due sedute in assoluto, regola 4.2
    oreDopoPrimeSedute: 48,       // niente uscite di oltre 3 ore, regola 4.2
    oreStessoGiorno: 3,           // con un giro facile, solo se accettato, regola 4.4
    oreStessoGiornoMeglio: 6,     // regola 4.4
    giorniSenzaGambe: 7,          // niente gambe negli ultimi 7 giorni prima della partenza, regola 4.6
    ultimaPesante: { da: 10, a: 8 },   // giorni prima, la regola dice 7-10 e il 7 sta già negli ultimi 7, regole 4.6 e 7.12, stima nostra, prudente
    ultimaPesanteFamiliarizzazione: { da: 14, a: 14 },   // ferma 14 giorni prima, la regola 4.2 dice 10-14, 5.1
    troncoFinoA: 3,               // negli ultimi 7 giorni tronco, collo e mobilità facoltativi fino a 3 giorni prima, scheda 5
    // Chi riceve quale scheda, e quando (5.1).
    costruzioneSettimane: 12,     // al massimo, dall'inizio del piano e comunque fino alla −5, regola 4.2
    ultimeSettimane: 4,           // la scheda 5 dalla −4 alla partenza, regola 4.6
    familiarizzazione: 3,         // settimane della scheda 1, regola 4.2
    familiarizzazioneLunga: 4,    // da 60 anni o senza altri sport oltre alla bici, regola 4.9
    familiarizzazioneLungaDaAnni: 60,   // regola 4.9
    soloFamiliarizzazioneSotto: 8,   // settimane davanti, sotto vale solo la scheda 1, la regola 4.2 dice 6-8, stima nostra, prudente
    soloFamiliarizzazioneSchemi: ["B"],   // con lo schema B chi non ha mai fatto palestra fa solo la scheda 1, 3.4 e regola 4.2
    rimandaFinoA: 3,              // con 3 settimane o meno la palestra si rimanda a dopo l'evento, 5.1
    pausaPrincipianteGiorni: 182, // chi torna da più di 6 mesi di pausa rifà il percorso dei principianti, regola 4.1
    sedute: { costruzione: 2, mantenimento: 1, mantenimentoDa50: 2, ultime: 1 },   // a settimana, regole 4.2, 4.6 e 4.9
    viaggioDaGiorni: 11,          // la scheda 6 facoltativa negli eventi di 11 giorni e più, regola 4.7
    troncoVolte: [2, 3],          // la scheda 7 a settimana, regola 4.10
    troncoSenzaPalestra: 10,      // minuti dopo i giri facili per chi non fa palestra, 5.1
    // Il peso e il semaforo (regole 4.3 e 4.5).
    aumento: { gambe: 0.05, altri: 0.025 },   // la regola dice 5-10% sugli esercizi grandi per le gambe e 2-5% sugli altri, la prova di 9.9 vuole 5 e 2,5
    arrotondaKg: 1,               // la proposta al chilo, 5.2
    gialloSerie: 2 / 3,           // con il Giallo un terzo delle serie in meno, la regola dice da un terzo alla metà, per difetto, stima nostra, prudente
    riservaInPiu: 1,              // con il Giallo leggero e il Giallo, regola 4.5
    // L'età e le ossa, la scheda 9 (regola 4.9).
    eta: { predefinita: 45, riservaDa: 40, mantenimentoDa: 50, ossaDa: 50, saltiDa: 40 },   // 40-49 senza risposta (6.3), i salti da 40 come la parte sulle ossa del capitolo 4, stima nostra, prudente
    salti: { serieDa: 2, serieA: 5, ripetizioni: 10, recupero: 60, giorni: [3, 5], settimane: 4 },   // salti bassi per le ossa, regola 4.9, recupero stima nostra
    // Le sedute saltate (regola 4.8) e il ritorno dopo l'evento (regola 4.7), in giorni senza pesi. Le soglie
    // di 7 e 10 giorni sono stima nostra, i 28 giorni e le 2 sedute dopo l'evento stima nostra, prudente.
    rientro: { soglia: 7, sogliaMantenimento: 10, breveFino: 21, mediaFino: 42, mediaGiorni: 7, lungaGiorni: 14, lungaRiserva: [3, 4], dopoEventoOltre: 28, seduteDopoEvento: 2 },
    // Quanto dura una seduta, per «circa 50 minuti» (7.8), stima nostra.
    durata: { riscaldamento: 10, secondiRipetizione: 3, cambio: 1, arrotonda: 5 },
  },
  limiteFacile: {
    quotaSoglia: 0.80,            // della FC di soglia del profilo Ride, regola 2.3
    quotaMassima: 0.70,           // della FC massima, il più basso fra le fonti, regola 2.3, stima nostra, prudente
    formula: { base: 208, perAnno: 0.7 },   // FC massima = 208 − 0,7 × età, mai 220 − età, regola 2.3
    etaLimiti: [40, 50, 55, 60],  // fasce sotto 40, 40-49, 50-54, 55-59 e 60 e più, 7.3
    etaCentri: [35, 45, 52.5, 57.5, 65],   // le fasce aperte contate come decenni, stima nostra, prudente
    lungaDaOre: 5,                // nelle uscite di 5 ore e più anche il battito medio, regola 3.1
  },
  carboidrati: {
    liberoSottoMinuti: 75,        // uscite facili sotto 75 minuti, nessun obbligo, regola 8.10
    medio: { daMinuti: 60, grammi: [30, 60] },   // g all'ora da 1 a 2 ore e mezza, regola 8.10
    lungo: { oltreMinuti: 150, grammi: [40, 60] },   // oltre 2 ore e mezza a ritmo da viaggio, regola 8.10
    massimo: 90,                  // mai oltre 90 g all'ora, regola 8.10
    cibo: { barretta: 25, banana: 25, gel: 22, borraccia: 30, panino: 40 },   // g di carboidrati, stima nostra
    stomaco: { da: -10, a: -2, partenza: 35, passo: 10, massimo: 60, minimo: 30 },   // allenare lo stomaco, regola 8.11, stima nostra, prudente
    seraDopoOre: 4,               // la carta della sera dopo il giorno 1 di un weekend, regola 8.9
  },
});

// Il controllo della domenica, usato da js/piano.js con controlloDomenica (3.11).
export const DOMENICA = congela({
  settimaneNorma: 4,              // senza settimane facili, di scarico o di tapering, regola 8.1
  segnali: 7,                     // sette e non sei, tabella delle contraddizioni
  S1: { uscite: 2, punti: 2, usciteNorma: 2, oreFacili: 2 },   // sforzo almeno 2 sopra la mediana in almeno 2 uscite, regola 8.1. La mediana vuole 2 uscite della norma, e senza il piano un giro sotto le 2 ore conta come facile, stima nostra
  S2: { mattine: 4 },             // su 7, regola 8.1
  S3: { notti: 3, oreInMeno: 1 }, // su 7, regola 8.1
  S4: { battito: 5, hrvDs: 0.5 }, // solo con S1 o S2, regole 8.1 e 8.5, la DS minima è quella del semaforo
  S5: { caselle: ["febbre", "tosse", "naso", "gola"], febbre: "febbre" },   // febbre e sintomi respiratori segnati in «Sto male», regola 8.1
  S7: { rossi: 2, gialliORossi: 4 },   // senza il Giallo leggero, regola 8.1
  settimaneCerca: 8,              // per le 4 settimane della norma si guarda fino a 8 settimane prima, saltando quelle leggere, stima nostra
  oreDopoFatiche: 72,             // weekend, prove, blocchi e uscite grandi restano fuori, regola 8.2
  usciteGrandiGiorni: 14,         // le uscite grandi si cercano nelle ultime 2 settimane, che bastano per la settimana e le 72 ore prima, stima nostra
  settimanaFacile: {
    segnali: 2,                   // regola 8.3
    ore: 0.55,                    // della media delle ultime 3 settimane di carico, regola 8.3 che dice 40-50% in meno
    settimane: 3,                 // regola 8.3
    giroMassimoOre: 2,            // regola 8.3
    giorniSenzaBici: 2,           // regola 8.3
    chiaveOre: 2,                 // la seduta chiave diventa una facile di 2 ore, 3.11
    settimaneDaScarico: 2,        // entro 2 settimane da uno scarico lo sostituisce, regola 2.7
    settimaneFinali: 2,           // nelle ultime 2 coincide con il tapering, regola 2.7
  },
  giorniFacili: { segnali: 3, giorni: 7, riferimentoOre: 1, domenicheDiFila: 2, oreSenzaFebbre: 24 },   // con 3 segnali o due domeniche di fila con 2, regola 8.3, con la febbre si riparte dopo 24 ore senza, 4.4
  medico: { giorni: 14, settimaneScarico: 3, pesoCalo: 0.05, pesoGiorni: 30 },   // regola 8.7, che dice 3-4 settimane, stima nostra, prudente
});

// Il semaforo del mattino, usato da js/semaforo.js e da js/modello.js (capitolo 4).
export const SEMAFORO = congela({
  notteValidaOre: 4,              // ore di sonno minime con l'HRV, senza sonno vale lo stesso, regola 5.1
  hrv: {
    notti: 60,                    // la base va da 60 notti fa a ieri, regola 5.2, stima nostra
    nottiPunti: 14,               // sotto, nessun punto, regola 5.2
    nottiPiene: 28,               // base piena, prima al massimo 1 punto, regola 5.2
    madInDs: 1.4826,              // DS robusta dalla deviazione mediana assoluta, regola 5.2
    dsMinima: { polso: 0.08, anelloFascia: 0.06 },   // in unità ln, il polso vale anche per «non so», regola 5.3
    nottiMedia: 7,                // z7, oggi compreso, regola 5.4
    nottiMediaMinime: 3,          // regola 5.4
    mediaBassa: -0.5,             // z7, 1 punto, regola 5.4
    notteBassa: -1,               // z della notte, 1 punto, regola 5.4
    notteMoltoBassa: -2,          // 2 punti, regola 5.4
    mattineDiFila: 3,             // z7 basso da 3 mattine e notte sotto −1, 2 punti, regola 5.4
    mediaAlta: 0.5,               // «sopra il tuo solito», 0 punti, regola 5.5
    notteInsolita: 2,             // «lettura insolita» con il battito non più basso, regola 5.5
    altaBattitoSotto: 3,          // battiti sotto la mediana, con fatica 1 punto, regola 5.5
    altaBattitoZ: 2,              // regola 5.5
    altaDaAnni: 55,               // da qui l'HRV alta non è mai verde, la regola dice 55-60, stima nostra, prudente
    notteAltaEtaOAritmia: 1,      // z della notte sopra +1 da 55 anni o con un'aritmia nota, 1 punto, stima nostra, prudente
  },
  caloAtteso: { quotaAlta: 0.2, giorni: 90, giorniMinimi: 5, uscitaOltreOre: 4, notteDa: -2, notteA: -1 },   // regola 5.6
  saturazione: { battitoSotto: 55, ds: 1 },   // regola 5.6
  battito: {
    notti: 30,                    // regola 5.7
    nottiProvvisorie: 7,          // al massimo 1 punto, regola 5.7
    nottiPiene: 14,               // regola 5.7
    dsMinima: 1,                  // battiti, regola 5.7
    quotaSonno: 0.5,              // si usa avgSleepingHR se c'è in almeno metà delle 30 notti, 4.3
    sopra: 3,                     // battiti sopra la mediana con z almeno 2, 1 punto, regola 5.7
    z: 2,                         // regola 5.7
    sopraForte: 5,                // 2 punti, regola 5.7
    nottiDiFila: 2,               // +3 per 2 notti, 2 punti, regola 5.7
    stopMalattia: 7,              // con un sintomo di «Sto male», regola 5.7
  },
  sonno: {
    ore1: 6,                      // 1 punto sotto 6 ore, regola 5.8
    minutiSottoMediana: 90,       // 1 punto, regola 5.8
    nottiMediana: 28,             // regola 5.8
    mediaOre: 6.5,                // media di 7 notti, 1 punto, regola 5.8
    nottiMedia: 7,                // regola 5.8
    nottiMediaMinime: 4,          // regola 5.8
    ore2: 5,                      // 2 punti sotto 5 ore, regola 5.8
    nottiDiFila: 2,               // 2 notti di fila sotto 6 ore, 2 punti, regola 5.8
    punteggio: 50,                // al massimo 1 punto sotto 50 se le ore non ne danno, regola 5.8
  },
  // Le risposte sulla scala 1-4 di intervals.icu, 1 il meglio, e i loro punti (4.3).
  domande: {
    energia: { 1: 0, 2: 0, 3: 1, 4: "stop" },   // fatigue, regola 5.9
    gambe: { 1: 0, 2: 0, 3: 1, 4: 2 },          // soreness, con 4 la domanda sulla pedalata, tabella delle contraddizioni
    acciacchi: { 1: 0, 2: 1, 3: "stop", 4: "stop" },   // injury, con 3 la domanda sulla pedalata, regola 5.9
    doloreSenzaCambio: 2,         // «Un dolore» con il no alla pedalata, stima nostra, prudente
    energiaPoca: 3,               // «Poca», con un segnale forte dà Rosso, regola 5.15
    ottime: { energia: 1, gambeFino: 2, acciacchi: 1 },   // migliorano di un gradino, regola 5.15
    acciacchiGiorniPrima: 1,      // senza risposta oggi vale quella di ieri, 4.2
  },
  carico: {
    alto: { rapporto: 1.3, differenza: 15 },        // 1 punto, regola 1.8
    moltoAlto: { rapporto: 1.5, differenza: 25 },   // 2 punti, regola 1.8
    fitnessMinima: 5,             // sotto, il carico non vota, 4.3
    faticaLentaDaAnni: 50,        // Fatica lenta, la costante sta in CARICO.serie, regola 1.7
    mattineMoltoAlto: 3,          // Rosso da 3 mattine di fila, regole 1.8 e 5.12
  },
  punti: { forte: 2, gialloLeggero: 1, giallo: 2, rosso: 4, fortiPerRosso: 2 },   // voce forte da 2, P 1 e da 2, Rosso con la concordanza e P da 4 o 2 forti, regola 5.15
  guardia: {
    weekendGiorni: 2,             // tetto Giallo dopo un weekend, una prova o un'uscita grande, regole 5.13 e 8.8
    bloccoGiorni: 3,              // regola 5.13
    evento: { "2-5": 7, "6-10": 10, "11+": 14 },   // giorni dopo un evento, regola 8.8, 10 stima nostra, prudente
    oreSenzaPunti: 72,            // HRV e battito senza punti, regola 5.13
  },
  uscitaGrande: { ore: 5, volte: 1.5, settimane: 4, oreMinime: 3 },   // 5 ore o 1,5 volte la più lunga di 4 settimane, regola 8.8, stima nostra, prudente
  rientro: { giorni: 4, giorniDopoMalattiaLunga: 7, malattiaLungaOltre: 7, oreSenzaFebbre: 24 },   // tetto Giallo, regola 5.18, stima nostra, prudente
  ultimiGiorni: 7,                // il Giallo leggero vale Giallo, regola 5.19, stima nostra, prudente
  crescitaRapidaGiorni: 7,        // al massimo Giallo leggero, regola 1.9
  gialliDiFila: 3,                // giorni in Giallo o Rosso che fanno partire il controllo della domenica, regola 5.16
  sopraIlColloMinuti: 60,         // al massimo un'ora facile con i soli sintomi sopra il collo, regola 5.10
  medico: { daAnni: 40, viaggioDaGiorni: 11, settimanePrima: 4, battitoSopra: 5, battitoNotti: 3, malattiaGiorni: 7 },   // regole 5.17 e 3.13, 7 giorni stima nostra, prudente
  viaggio: {
    sonnoOrologioMinuti: 45,      // sonno vero = orologio meno 45 minuti, uguale con anelli e fasce, regola 3.10
    sonnoCortoOre: 5,             // meno di 5 ore ogni 24, regola 3.10
    nottiGiallo: 2,               // regola 3.10
    nottiRosso: 3,                // regola 3.10
    sonnoRitornoOre: 6,           // non pedalare di notte finché non torni a 6 ore, regola 3.10
    gonfioreMattine: 2,           // regola 3.11
    maniGiorni: 2,                // intorpidimento da più di 2 giorni, Rosso, regola 3.12
    stomacoGialloOre: 2,          // regola 3.14
    stomacoRossoOre: 4,           // la regola dice 4-6 ore, l'app usa 4, regola 3.14
    giorniInPiu: 1,               // la modalità evento resta accesa G giorni più uno, 4.5
    propostaGiorni: 2,            // giorni di fila con almeno 0,5 × H, 4.5, dalla proposta dati
    propostaQuotaH: 0.5,          // 4.5
    propostaOre: 4,               // senza un obiettivo, 4.5
    taglioGiallo: { minimo: 0.2, massimo: 0.3 },   // con il Giallo la giornata più corta, regola 9.2
  },
  dispositivo: { salto: 2.5, nottiRecenti: 7, nottiPrima: 28, mattine: 3, nottiTaratura: 14 },   // DS di salto della mediana, regola 10.4, stima nostra
  fiducia: { quotaAlta: 0.9, giorni: 42, quotaSenzaDati: 0.3, settimane: 6 },   // regole 1.10 e 10.2
});

// Riconoscere e unire le attività, usato da js/dati.js (6.2 e 6.3).
export const DATI = congela({
  doppioneMinuti: 10,             // stessa uscita da due dispositivi, partenze a meno di 10 minuti, stima nostra
  doppioneDurata: 0.15,           // e durate entro il 15%, stima nostra
  unioneOre: 2,                   // per l'uscita lunga si uniscono le attività separate da meno di 2 ore, 2.2, stima nostra
  tipiBici: ["Ride", "GravelRide", "MountainBikeRide", "VirtualRide", "Velomobile"],   // le ore in bici, 2.2
  tipiEbike: ["EBikeRide", "EMountainBikeRide"],   // 2.2
  fattoreEbike: 0.5,              // l'e-bike vale la metà, salvo un evento in e-bike, 2.2, stima nostra
  stubDaOre: 2,                   // la carta di uno stub con una seduta chiave o una durata stimata di almeno 2 ore, 6.3
  notteMancaGiorni: 14,           // senza notte dopo che c'era, 6.3, stima nostra
  dislivelloZeroOltreKm: 30,      // un giro all'aperto senza dislivello vale per le ore e non per il passo, 6.3
  palestraAbbinamentoOre: 2,      // la stessa seduta dall'app e dall'orologio, 5.6 e 6.3
  soloStrava: { quota: 0.5, giorni: 60 },   // più di metà delle attività di 60 giorni sono stub, 6.4
  tipiEvento: ["evento", "viaggio"],   // la modalità evento di un evento o di un viaggio fatto con l'app, che vale come uscita carica di più giorni, 2.4 e 4.5
});

// La serie di carico di Come sto, usato da js/carico.js e da js/modello.js (6.5).
export const CARICO = congela({
  sforzo: { divisore: 5, usciteDivisore: 10, oreSoglia: 3 },   // sforzo × minuti / 5, divisore personale dopo 10 uscite, sotto e sopra le 3 ore, regola 1.3
  stimaGrezza: {
    base: { Ride: 0.62, GravelRide: 0.66, MountainBikeRide: 0.68, rulli: 0.70 },   // IF di partenza, regola 1.4
    salitaMetriPerKm: 20,         // + m per km, al massimo 20, / 20 × 0,10, regola 1.4
    salitaPeso: 0.10,             // regola 1.4
    velocitaRiferimento: { Ride: 26, GravelRide: 19, MountainBikeRide: 15, rulli: 30 },   // km/h, regola 1.4
    velocitaPeso: 0.3,            // (v − riferimento) / riferimento × 0,3, regola 1.4
    velocitaMinimo: -0.05,        // regola 1.4
    velocitaMassimo: 0.08,        // regola 1.4
    borse: 0.06,                  // regola 1.4
    tetto: { base: 0.85, perOra: 0.02, minimo: 0.60 },   // IF al massimo 0,85 − 0,02 × ore, mai sotto 0,60, regola 1.4
  },
  puntiOraSenzaDati: 40,          // senza nessun dato, ed è anche il k senza dati, regole 1.4 e 7.9
  palestra: { gambe: 1.0, corpo: 0.7, alto: 0.4, sforzoPredefinito: 5, fattorePredefinito: 0.7, minutiPredefiniti: 50 },   // regola 1.6, valori senza risposta 5.6 e 6.3
  palestraNellaFitness: 0,        // la palestra conta solo nella Fatica, regola 1.6
  palestraNellaFatica: 1,         // regola 1.6
  tipiPalestra: ["WeightTraining", "Workout"],   // la palestra dal dispositivo, mai il carico dal polso, 6.3
  serie: {
    fitness: 42,                  // giorni, e^(−1/42), regola 1.7
    fatica: 7,                    // e^(−1/7), regola 1.7
    faticaLenta: 10,              // e^(−1/10), per il semaforo da 50 anni, regola 1.7
    forma: "esponenziale",        // «passi» se la prova contro intervals.icu non torna, 6.5
    giorni: 182,                  // la partenza 182 giorni prima, 6.5
    coincidenza: 0.1,             // con ctl e atl di intervals.icu, 6.5
    fonteSemaforo: "intervals",   // «comesto» solo dopo la prova di coincidenza sui dati privati, 6.5
  },
  differenzaSchermo: { quota: 0.10, punti: 3 },   // la riga sotto la Fitness oltre il 10% e 3 punti, 6.5
  controlloIncrociato: { differenza: 0.40, puntiOra: 70, sforzoFino: 5 },   // regola 1.5, «Media» vale 5
});

// Quante domande e quando, usato dalle carte di Oggi e dal primo avvio (6.4 e 7.3).
export const DOMANDE = congela({
  primoAvvio: 8,                  // risposte, stima nostra
  primoAvvioSenzaGiri: 10,        // stima nostra
  soloSemaforo: 2,                // con «Solo il semaforo del mattino», 7.3
  mattino: 3,                     // le tre domande di sempre, 6.4
  carteInPiu: 1,                  // per apertura, stima nostra
  carteInPiuConBorse: 2,          // quando una è sulle borse, stima nostra
  scadenzaGiorni: 14,             // le carte senza risposta, stima nostra
  S6AltriSegnali: 1,              // la domanda di S6 solo con almeno un altro segnale, stima nostra
  sforzoDaMinuti: 30,             // dopo la fine dell'uscita, regola 1.1
  sforzoFinoAlleOre: 12,          // del giorno dopo, regola 1.1 che dice fino al mattino dopo
  sforzo: { facilissima: 2, facile: 3, media: 5, dura: 7, durissima: 9 },   // scala da 0 a 10, regola 1.1, la traduzione è stima nostra
  borse: ["no", "parte", "evento"],   // «No», «Sì, in parte», «Sì, come all'evento», regola 6.5
  borseDaOre: 2,                  // «Avevi le borse?» dopo le uscite all'aperto di almeno 2 ore, regola 6.5
  durateMinuti: [30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 420],   // «Quanto è durata?», 6.4, stima nostra
});

// Cosa resta sul telefono e per quanto, usato da js/memoria.js (6.6).
export const MEMORIA = congela({
  giorni: 400,                    // uscite, palestra, mattine, esiti e domeniche, stima nostra
  mesiDopoEvento: 3,              // obiettivo e piano, 6.6, stima nostra
  copiaOgniGiorni: 30,            // il promemoria della copia di sicurezza, stima nostra
  formatoCopia: 1,                // il numero di formato del file della copia, 6.6
  cacheGiorniInPiu: 3,            // si rileggono i giorni nuovi più 3, stima nostra
});

// Le chiamate a intervals.icu, usato da js/api.js, js/app.js e js/modello.js (6.7).
export const CHIAMATE = congela({
  lettureApertura: 2,             // benessere e attività, stima nostra, prudente
  minutiFraLetture: 10,           // niente letture prima, salvo «Aggiorna», stima nostra
  giorniAtleta: 7,                // il profilo dell'atleta si rilegge ogni 7 giorni, stima nostra
  primaLetturaGiorni: 182,        // benessere e attività alla prima apertura, 6.7
  serverPrimaDiPersone: 1500,     // con OAuth, Verifica C1 e stima nostra, prudente
  sforzoScritto: { minimo: 1, massimo: 10 },   // icu_rpe da 1 a 10, lo 0 non si scrive, 6.6
  scartaCodici: [400, 404, 409, 410, 422],   // risposte che riprovando non cambiano, la scrittura esce dalla coda, stima nostra
  inInvioMinuti: 2,               // una scrittura segnata «in invio» da meno di 2 minuti non riparte, più di due chiamate da 20 secondi, stima nostra
});
