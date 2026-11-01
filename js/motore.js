// Il motore della pagina (capitoli 3, 4 e 6 della specifica). Da quello che arriva da intervals.icu e
// da quello che sta sul telefono calcola, in una chiamata sola, tutto quello che le pagine mostrano.
// È puro come gli altri moduli di regole. Niente DOM, niente memoria, niente rete e niente orologio,
// così si prova con node (test/motore.test.mjs). js/app.js legge e salva, il motore calcola, le pagine
// disegnano.
//
// ============================== IL CONTRATTO DELLE PAGINE ==============================
//
// Ogni pagina è disegna(ctx) e riceve sempre lo stesso ctx da js/app.js. Le pagine leggono ctx e
// chiamano ctx.azioni, mai la memoria, mai intervals.icu e mai questo modulo. Le date sono
// «AAAA-MM-GG», le ore locali «AAAA-MM-GGTHH:MM», le durate delle sedute in minuti.
//
// I campi di ctx, quelli del rilascio 1 prima.
//   modello        costruisciModello di js/modello.js. giorni (182, dal più vecchio, l'ultimo è oggi,
//                  con hrv, fc, sonno, ctl, atl, forma, fatica, dolori, infortunio), atleta { nome, fuso },
//                  diario (comesto.mattino.v1), storia (gli esiti fino a ieri), profilo, mattino
//                  { ctl, atl, rapporto, formaPct }, base { hrv, fc }, uscite (le attività nella forma corta
//                  di js/modello.js, per Andamento e Uscite), notteArrivata, notteMaiArrivata, oggi.
//   esito          valuta di js/semaforo.js. { livello «verde» «giallo-leggero» «giallo» «rosso» «nessuno»,
//                  colore, titolo, consiglio, perche, voci, tetti, stop, controllo, fiducia, medico,
//                  messaggi, viaggio, aggiunte, nota, domenica, registro }.
//   giorno         { contesto (quello passato a valuta), viaggio, evento { tipo, giorno, giorni } | null,
//                  giorniPartenza, malattia, cuore, arrivatoOggi, proposta { inizio } | null, carte, carta }.
//                  carte e carta sono le carte del semaforo di prima, «parti», «proposta», «dispositivo».
//                  Le pagine nuove usano carteInPiu, che le comprende.
//   demo, dentro, preferenze, profilo, ui, accesso, consensoPrima, datiSulDispositivo, erroreAccesso,
//   erroreConIntervals, tipoErroreAccesso, appenaSalvato, azioni.
//
// I campi nuovi, tutti calcolati qui (calcola).
//   oggi           il giorno di oggi nel fuso dell'atleta.
//   adesso         l'ora locale di adesso, «2026-11-01T08:30».
//   attivita       le attività pulite di js/dati.js (preparaAttivita), dalla più recente. Ogni attività ha
//                  id, inizio, giorno, tipo, secondi, metri, dislivello, carico, borse, sforzo, kg,
//                  notteFuori, allenato, stub, manuale, daComeSto, fuoriDalPasso, motivoFuoriPasso, qualita,
//                  nome (solo da mostrare) e in più stomaco e prova dalle risposte del telefono.
//                  Comprende i giri aggiunti a mano e le sedute di palestra segnate nell'app che intervals.icu
//                  non ha ancora (locale vero).
//   giorniPuliti   i giorni di benessere di js/dati.js (normalizzaGiorno), solo quelli che intervals.icu manda.
//   serie          le righe di serieCarico di js/carico.js, { d, carico, fitness, fatica, faticaLenta, ctl, atl },
//                  dalla più vecchia a oggi.
//   fitness        { comeSto, intervals, differenza }. differenza è { scarto, testo } oppure null (6.5).
//   k              i punti all'ora della persona, puntiOra di js/carico.js.
//   obiettivo      null al primo avvio, oppure
//                  { tipo «evento» | «libero» | «semaforo», percorso (la voce di js/catalogo.js o il percorso
//                  libero di js/stima.js, null con il solo semaforo), percorsoId, giorni, partenza (o null),
//                  iscritto (arrivato dal link), libero (le scelte dell'avventura propria), daSfida }.
//   stima          stimaH di js/stima.js, oppure null. Per lo schermo valgono stima.mezzore.
//   prontezza      valutaProntezza di js/prontezza.js, oppure null. fase «verdetto» «proiezione»
//                  «nonValutabile» «senzaData».
//   piano          il piano di js/piano.js (pianoLungo), salvato o rifatto oggi, oppure null. In più ha
//                  piano.motore { obiettivo, ingressi, rifatto } con le impronte usate per rifarlo.
//   settimana      la settimana di piano.settimane che contiene oggi, oppure null.
//   seduta         oggiCosaFaccio di js/piano.js per oggi, oppure null senza piano. { titolo, come, righe,
//                  tipo, azione, seduta, sedute, palestra, sposta, sera, tasti }.
//   palestra       { registro (le sedute fatte, dalla più recente), conto (contoSedute), oggi (la seduta di
//                  sedutaPalestra di oggi, oppure null), fase (quella della settimana, oppure null) }.
//   domenica       { controllo (controlloDomenica di questa domenica, del lunedì dopo o del controllo che
//                  parte prima, oppure null), voce (l'ultima voce salvata in comesto.domenica.v1, oppure null) }.
//   carteInPiu     le carte in più di questa apertura, in ordine e già con il tetto di 6.4, al massimo una,
//                  due quando una è sulle borse. Ogni carta è { tipo, chiave, giorno, borse, fine, attivita,
//                  seduta, inizio }, con tipo fra «parti», «proposta», «lunga», «prova», «stub», «sforzo»,
//                  «palestra», «seduta», «dispositivo». attivita è l'attività pulita (per lunga, prova, stub,
//                  sforzo e palestra), seduta quella del piano (per seduta), inizio il primo giorno della
//                  proposta di viaggio. Le risposte vanno con ctx.azioni.rispondiCarta e ctx.azioni.nonLoSo.
//   messaggi       { soloStrava, notteNonArriva, copia, iphone }, vero quando la pagina deve mostrare quel
//                  messaggio, una volta sola. L'app segna da sé che è stato mostrato.
//   invito         { percorso, giorni, partenza } arrivato dal link degli iscritti, oppure null.
//   primoAvvio     vero quando manca l'obiettivo. La rotta di Oggi porta allora a #inizio.
//   disponibilita  quella salvata (comesto.disponibilita.v1), oppure null. Per i valori già scelti si usa
//                  leggiDisponibilita di js/piano.js.
//   coda           { attiva, quante }. attiva è falso finché le scritture sulle attività sono spente.
//
// Le azioni (ctx.azioni), tutte di js/app.js. Ognuna salva e ridisegna la pagina da sola.
//   Dal rilascio 1. entra(chiave, ricorda), entraConIntervals(ricorda), accettaConsenso(), esci(dopo),
//   cancellaTutto(), demo(), esciDemo(), esciEsempio(), ricarica(), preferenza(nome, valore), ui(nome,
//   valore), diario(campi), profilo(campi, dove), inViaggio({ da, tipo, giorni }), arrivato(),
//   carta(id, risposta), async salvaDomande(risposte, diario).
//   Nuove.
//   vai(rotta)                       cambia pagina, per esempio vai("settimana").
//   salvaObiettivo(obiettivo)        { tipo: "evento", percorso, giorni, partenza, iscritto } oppure
//                                    { tipo: "libero", libero: "ore"|"giorni"|"giro", ore, giorni, km,
//                                    metri, fondo, conBorse, partenza } oppure { tipo: "semaforo" }, null
//                                    lo toglie. Il piano si rifà da solo.
//   salvaDisponibilita(d)            { giorni [0-6], stella, ore, tetti [7 minuti o null], dueCose }.
//   fineInizio({ obiettivo, disponibilita, profilo })   le risposte del primo avvio in una volta.
//   rispondiCarta(carta, campi)      la risposta a una carta in più. Per lunga, prova, stub, sforzo e
//                                    palestra campi va sulla voce dell'attività in comesto.uscite.v1
//                                    (sforzo, borse, kg, notteFuori, tipo, secondi, metri, dislivello,
//                                    allenato, stomaco, grammi, prova { esito, aree }). Per seduta campi è
//                                    { risposta: "si"|"diverso"|"no", minuti, sforzo }.
//   nonLoSo(carta)                   chiude la carta senza risposta.
//   rispostaUscita(id, campi)        come rispondiCarta, dalla scheda di un'uscita (Numeri).
//   aggiungiGiro(giro)               { tipo, giorno, ora, minuti, sforzo, borse, kg, km, metri }, true se
//                                    il giro c'è, false senza giorno o senza durata.
//   fatto()                          «Fatto» sulla carta di oggi, la seduta in bici di oggi come giro a mano.
//   palestraFatta(seduta, risposte)  seduta è ctx.palestra.oggi, risposte { fatta «tutta»|«leggera»,
//                                    sforzo, minuti, pesi { [id]: { kg, riserva, ripetizioni, serie, id } } }.
//                                    Restituisce l'id della seduta salvata.
//   oggiNonPosso()                   sposta la seduta di oggi (3.10), ridisegna e restituisce lo
//                                    spostamento { esito «sposta»|«salta», giorno, giorni, testo } o null.
//   weekendNonPosso()                lo stesso con la seduta del weekend.
//   rispostaDomenica(s6)             «si» o «no» alla domanda S6, sul giorno del controllo.
//   visto(nome)                      un messaggio di una volta sola è comparso, nome fra «soloStrava»,
//                                    «notteNonArriva», «copia», «iphone». Non ridisegna.
//   async salvaCopia()               scarica il file della copia, restituisce { ok, nome }.
//   async anteprimaCopia(file)       legge il file scelto, restituisce l'esito di riprendi con anteprima.
//   async riprendiCopia(file)        lo stesso, e scrive.
//   esciCancellaTutto()              come cancellaTutto, senza la seconda domanda (Impostazioni l'ha già).
//   atletaDiverso(scelta)            «cancella» o «esci», sulla schermata dell'altra persona.
//
// ========================================================================================

import { costruisciModello, aggiungiGiorni, giorniTra, giornoSettimana } from "./modello.js?v=202610312043";
import {
  valuta, eventoDiOggi, inizioProposta, giorniDiGuardia, statoMalattia, statoCuore, viaggiDelDiario,
} from "./semaforo.js?v=202610312043";
import {
  preparaAttivita, normalizzaGiorno, carteDelMattino, soloStrava, notteNonArrivaPiu, doloriCheTornano, leggiInvito,
  inBici, inPalestra, PREFISSI,
} from "./dati.js?v=202610312043";
import { serieCarico, puntiOra, differenzaFitness } from "./carico.js?v=202610312043";
import { stimaH, percorsoLibero } from "./stima.js?v=202610312043";
import { valutaProntezza } from "./prontezza.js?v=202610312043";
import {
  pianoLungo, oggiCosaFaccio, controlloDomenica, fatichePiano, modoEventoPiano, crescitaRapida, giorniPersi, sposta,
  leggiDisponibilita, PIU_GIORNI_DEL_PIANO,
} from "./piano.js?v=202610312043";
import { contoSedute, caricoPalestra } from "./palestra.js?v=202610312043";
import { testoSpostiamo, testoSalta } from "./testi-piano.js?v=202610312043";
import { trovaPercorso } from "./catalogo.js?v=202610312043";
import { SEMAFORO, PIANO, MEMORIA, CHIAMATE, DOMANDE, DATI, BORSE } from "./parametri.js?v=202610312043";

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const ORA = 3600;
const SERA = 18;   // dalle 18 la carta della prova del giorno, come la sera della pagina Oggi (7.5), stima nostra

const oggetto = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : null);
const mappa = (v) => oggetto(v) || {};
const lista = (v) => (Array.isArray(v) ? v : []);
const num = (v) => typeof v === "number" && Number.isFinite(v);
const dataValida = (v) => typeof v === "string" && DATA.test(v);
const lunediDi = (d) => aggiungiGiorni(d, -giornoSettimana(d));
const copiaProfonda = (v) => JSON.parse(JSON.stringify(v));

// --- L'età, l'obiettivo e il profilo ---

// L'età al centro della fascia del primo avvio, oppure quella della fascia 40-49 senza risposta (6.3).
export function etaDi(profilo = {}) {
  const p = mappa(profilo);
  if (num(p.eta)) return p.eta;
  const k = SEMAFORO.fasceEta.indexOf(p.fasciaEta);
  return k >= 0 ? PIANO.limiteFacile.etaCentri[k] : SEMAFORO.etaPredefinita;
}

// Le scelte dell'avventura propria (1.9), nella forma di percorsoLibero di js/stima.js.
function sceltaLibera(o) {
  const tipo = o.libero === "giro" || o.libero === "giorni" ? o.libero : "ore";
  if (tipo === "giro") return { tipo, km: num(o.km) ? o.km : null, metri: num(o.metri) ? o.metri : 0, fondo: o.fondo || "strada", conBorse: o.conBorse === true };
  if (tipo === "giorni") return { tipo, giorni: o.giorni === 2 ? 2 : 3, ore: num(o.ore) ? o.ore : null };
  return { tipo, ore: num(o.ore) ? o.ore : null };
}

// L'obiettivo salvato (comesto.obiettivo.v1) nella forma che usano le pagine, oppure null, cioè il
// primo avvio. Un percorso che il catalogo non conosce più vale come nessun obiettivo, così si sceglie
// di nuovo. Giorni fuori dal minimo e dal massimo del percorso tornano al primo dei giorni tipici.
export function leggiObiettivo(salvato) {
  const o = oggetto(salvato);
  if (!o) return null;
  const partenza = dataValida(o.partenza) ? o.partenza : null;
  if (o.tipo === "semaforo") {
    return { tipo: "semaforo", percorso: null, percorsoId: null, giorni: null, partenza: null, iscritto: false, libero: null, daSfida: null };
  }
  if (o.tipo === "evento") {
    const percorso = typeof o.percorso === "string" ? trovaPercorso(o.percorso) : null;
    if (!percorso) return null;
    const tipici = lista(percorso.giorniTipici);
    const giorni = Number.isInteger(o.giorni) && o.giorni >= percorso.giorniMin && o.giorni <= percorso.giorniMax
      ? o.giorni : tipici[0] ?? percorso.giorniMin;
    return { tipo: "evento", percorso, percorsoId: percorso.id, giorni, partenza, iscritto: o.iscritto === true, libero: null, daSfida: null };
  }
  if (o.tipo === "libero") {
    const libero = sceltaLibera(o);
    if (libero.tipo === "giro" ? !(libero.km > 0) : !(libero.ore > 0)) return null;
    const percorso = percorsoLibero(libero);
    return { tipo: "libero", percorso, percorsoId: percorso.id, giorni: percorso.giorniMin, partenza, iscritto: false, libero, daSfida: o.daSfida || null };
  }
  return null;
}

// I giorni dell'evento, per la riga del medico (4.9) e la modalità evento. Le sfide della pagina
// Obiettivo di prima valgono il loro lato alto (MEMORIA.sfide), la lettura prudente.
export function giorniEventoDi(obiettivo) {
  const ob = oggetto(obiettivo);
  if (!ob) return null;
  const sfida = ob.daSfida && MEMORIA.sfide[ob.daSfida];
  if (sfida) return sfida.giorniEvento;
  return Number.isInteger(ob.giorni) && ob.giorni > 0 ? ob.giorni : null;
}

// I giorni per la modalità evento con «Sì, parto» (4.5). Una sfida senza lato alto non ne fissa nessuno,
// così la modalità resta accesa fino a «Sono arrivato».
export function giorniDelViaggioDi(obiettivo) {
  const ob = oggetto(obiettivo);
  if (ob && MEMORIA.sfideSenzaFine.includes(ob.daSfida)) return null;
  return giorniEventoDi(obiettivo);
}

// Chi ha il battito nei giri vede il limite del facile (3.8). Lo dice la fascia cardio, altrimenti
// almeno metà dei giri all'aperto delle ultime 6 settimane con il battito.
function battitoNeiGiri(profilo, attivita, oggi) {
  if (profilo.fasciaCardio === "si") return true;
  const dal = aggiungiGiorni(oggi, -7 * SEMAFORO.fiducia.settimane);
  const giri = attivita.filter((a) => inBici(a) && !a.stub && !a.rulli && a.giorno >= dal && a.giorno <= oggi);
  return giri.length > 0 && giri.filter((a) => a.battito).length * 2 >= giri.length;
}

// Il profilo che ricevono i moduli. L'età diventa un numero, perché la palestra la vuole così, e il
// battito nei giri si ricava dalle uscite se la persona non l'ha detto.
function profiloDeiModuli(profilo, attivita, oggi) {
  const p = { ...mappa(profilo) };
  if (!num(p.eta) && SEMAFORO.fasceEta.includes(p.fasciaEta)) p.eta = etaDi(p);
  if (typeof p.battitoNeiGiri !== "boolean") p.battitoNeiGiri = battitoNeiGiri(p, attivita, oggi);
  return p;
}

// --- Le attività che stanno solo sul telefono ---

// I giri aggiunti a mano e le sedute di palestra segnate nell'app che intervals.icu non ha ancora
// diventano attività come le altre, nella forma delle risposte di intervals.icu, così contano nelle ore,
// nel carico e nel piano. Quando intervals.icu ne ha una con lo stesso external_id, vale quella.
function attivitaDelTelefono(detti, palestra, lette) {
  const gia = new Set(lette.map((a) => a && a.external_id).filter(Boolean));
  const fuori = [];
  for (const [id, v] of Object.entries(detti)) {
    const g = oggetto(v) && v.manuale === true ? oggetto(v.grezza) : null;
    if (!g || gia.has(g.external_id || id) || typeof g.start_date_local !== "string") continue;
    fuori.push({ ...g, id: g.id || id, source: "MANUAL", external_id: g.external_id || id });
  }
  for (const [id, s] of Object.entries(palestra)) {
    if (!oggetto(s) || s.idAttivita || !dataValida(s.data)) continue;
    const externalId = `${PREFISSI.palestra}${id}`;
    if (gia.has(externalId)) continue;
    const minuti = num(s.minuti) && s.minuti > 0 ? s.minuti : null;
    fuori.push({
      id: externalId,
      start_date_local: `${s.data}T${typeof s.ora === "string" && /^\d{2}:\d{2}$/.test(s.ora) ? s.ora : "18:00"}:00`,
      type: "WeightTraining",
      source: "MANUAL",
      moving_time: minuti ? minuti * 60 : null,
      icu_rpe: num(s.sforzo) && s.sforzo > 0 ? s.sforzo : null,
      icu_training_load: minuti ? Math.round(caricoPalestra(minuti, s.sforzo, s.allenato)) : null,
      external_id: externalId,
      tags: s.allenato ? [`comesto-palestra-${s.allenato}`] : [],
    });
  }
  return fuori;
}

// Il registro della palestra per il piano. Le sedute segnate nell'app, più quelle arrivate dal
// dispositivo che nessuna seduta dell'app ha già preso, che valgono come corpo intero (6.3).
function registroPalestra(palestra, attivita) {
  const sedute = Object.entries(palestra).filter(([, s]) => oggetto(s) && dataValida(s.data)).map(([id, s]) => ({ ...s, id }));
  const prese = new Set(sedute.map((s) => s.idAttivita).filter(Boolean));
  for (const a of attivita) {
    if (!inPalestra(a) || a.daComeSto || a.stub || prese.has(a.id)) continue;
    sedute.push({ id: a.id, data: a.giorno, minuti: a.secondi ? Math.round(a.secondi / 60) : null, sforzo: a.sforzo, allenato: a.allenato, idAttivita: a.id, daDispositivo: true });
  }
  return sedute.sort((x, y) => (x.data < y.data ? 1 : x.data > y.data ? -1 : 0));
}

// Le risposte dopo le prove con le borse, per il pilastro delle prove (2.4).
function debriefingDi(detti) {
  return Object.entries(detti).map(([, v]) => v).filter((v) => oggetto(v) && oggetto(v.prova))
    .map((v) => ({ giorno: v.prova.giorno || v.giorno, esito: v.prova.esito, aree: lista(v.prova.aree) }))
    .filter((x) => dataValida(x.giorno) && (x.esito === "bene" || x.esito === "sistemare"));
}

// Le risposte «Lo stomaco?» dopo le lunghe con l'obiettivo di cibo (3.9).
function stomacoDi(detti) {
  return Object.values(detti).filter((v) => oggetto(v) && typeof v.stomaco === "string" && dataValida(v.giorno))
    .map((v) => ({ giorno: v.giorno, grammi: num(v.grammi) ? v.grammi : null, stomaco: v.stomaco }));
}

// --- Il piano ---

const idDi = (p) => (p && typeof p === "object" ? p.id || null : typeof p === "string" ? p : null);

// Due impronte decidono quando rifare il piano (3.12). Quella dell'obiettivo cambia con evento, giorni
// o data, e allora il piano riparte da oggi. Quella degli ingressi cambia con disponibilità, profilo o
// la giornata, e allora si rifà tenendo lo schema e le settimane passate. La giornata conta alla
// mezz'ora, così i giri nuovi che la spostano di pochi minuti non cambiano la settimana.
function impronte(ob, stima, profilo, disponibilita) {
  const d = leggiDisponibilita(disponibilita || {});
  const p = mappa(profilo);
  const H = stima && stima.mezzore && num(stima.mezzore.H) ? stima.mezzore.H : null;
  return {
    obiettivo: JSON.stringify({ percorso: idDi(ob.percorso), giorni: ob.giorni, partenza: ob.partenza, libero: ob.libero || null }),
    ingressi: JSON.stringify({
      versione: PIANO.versione, H,
      disponibilita: { giorni: [...d.giorni].sort(), stella: d.stella, ore: d.ore, tetti: d.tetti, dueCose: d.dueCose },
      profilo: {
        eta: etaDi(p), palestra: p.palestra || null, sicurezza: p.palestraSicurezza || null, altriSport: p.altriSport ?? null,
        esperienza: p.esperienza ?? false, scaricoOgniTre: p.scaricoOgniTre !== false, blocco: p.blocco !== false,
        ebike: p.ebike ?? null, borseKg: num(p.borseKg) ? p.borseKg : null, bici: p.bici || null,
      },
    }),
  };
}

// Il piano di oggi. Si tiene quello salvato finché vale, e si rifà il lunedì, quando cambiano obiettivo
// o ingressi, quando cambiano le regole del generatore e dopo un'interruzione di più di 7 giorni
// (3.12). Restituisce { piano, nuovo }, con nuovo vero quando va salvato.
function pianoDiOggi({ ob, stima, profilo, disponibilita, storico, salvato, oggi, atleta, attivita }) {
  const firma = impronte(ob, stima, profilo, disponibilita);
  const s = oggetto(salvato) && Array.isArray(salvato.settimane) ? salvato : null;
  const stessoObiettivo = Boolean(s && s.motore && s.motore.obiettivo === firma.obiettivo);
  const persi = s ? giorniPersi(s, attivita, oggi) : 0;
  const I = PIANO.interruzioni;
  const interrotto = persi > I.giorni && s && typeof s.creato === "string" && s.creato < aggiungiGiorni(oggi, -(persi - I.giorni));
  const vale = stessoObiettivo && s.versione === PIANO.versione && s.motore.ingressi === firma.ingressi
    && typeof s.creato === "string" && s.creato >= lunediDi(oggi) && !interrotto;
  if (vale) return { piano: s, nuovo: false };
  const piano = pianoLungo({
    obiettivo: { percorso: ob.percorso, giorni: ob.giorni, partenza: ob.partenza, libero: ob.tipo === "libero" },
    stima,
    profilo,
    storico: { ...storico, piano: stessoObiettivo ? s : null, interruzione: persi > 0 ? { giorni: persi } : null },
    disponibilita: disponibilita || {},
    oggi,
    atleta,
  });
  piano.motore = { ...firma, rifatto: oggi };
  return { piano, nuovo: true };
}

const settimanaDi = (piano, giorno) => lista(piano && piano.settimane)
  .find((w) => w && dataValida(w.lunedi) && w.lunedi <= giorno && aggiungiGiorni(w.lunedi, 6) >= giorno) || null;

// Tutti i giorni del piano con quella data, quelli della settimana in corso e quelli delle settimane.
function giorniConData(piano, d) {
  return [...lista(piano.giorni), ...lista(piano.settimane).flatMap((w) => lista(w && w.giorni))].filter((g) => g && g.giorno === d);
}

const minutiDelGiorno = (g) => lista(g.sedute).reduce((t, x) => t + (num(x.minuti) ? x.minuti : 0), 0);

function togliSeduta(piano, d, stessa) {
  let tolta = null;
  for (const g of giorniConData(piano, d)) {
    const i = lista(g.sedute).findIndex(stessa);
    if (i < 0) continue;
    tolta = tolta || g.sedute[i];
    g.sedute.splice(i, 1);
    if (!g.sedute.length) g.sedute.push({ tipo: "riposo", minuti: 0 });
    g.ore = minutiDelGiorno(g) / 60;
  }
  return tolta;
}

function mettiSeduta(piano, d, seduta) {
  for (const g of giorniConData(piano, d)) {
    g.sedute = lista(g.sedute).filter((x) => x.tipo !== "riposo");
    g.sedute.push({ ...seduta });
    g.ore = minutiDelGiorno(g) / 60;
  }
}

// Una seduta spostata o saltata nel piano (3.10, spostare e non recuperare). spostamento è quello di
// sposta di js/piano.js, { esito «sposta» o «salta», giorno, giorni, palestra [{ da, a }] }. seduta è
// quella che oggi non si fa, { tipo, giorno, minuti, parte, di }. Le sedute di più giorni si spostano
// tutte insieme. Restituisce un piano nuovo, con le sedute chiave delle settimane aggiornate e la riga
// in spostamenti { data, tipo, da, a, motivo, colore }. Il piano di prima non cambia.
export function applicaSpostamento(piano, spostamento, seduta, { oggi, motivo = "semaforo", colore = null } = {}) {
  if (!oggetto(piano) || !oggetto(spostamento) || !oggetto(seduta) || !dataValida(seduta.giorno)) return piano;
  const nuovo = copiaProfonda(piano);
  const parti = PIU_GIORNI_DEL_PIANO.includes(seduta.tipo) && (seduta.parte || 1) === 1 && seduta.di > 1 ? seduta.di : 1;
  const destinazioni = spostamento.esito === "sposta" ? lista(spostamento.giorni).filter(dataValida) : [];
  for (let k = 0; k < parti; k++) {
    const d = aggiungiGiorni(seduta.giorno, k);
    const parte = parti > 1 ? k + 1 : seduta.parte || null;
    const stessa = (x) => x && x.tipo === seduta.tipo && (x.parte || null) === parte;
    const tolta = togliSeduta(nuovo, d, (x) => stessa(x) || (parti === 1 && x && x.tipo === seduta.tipo));
    const verso = destinazioni[k] || (k === 0 && dataValida(spostamento.giorno) ? spostamento.giorno : null);
    if (tolta && verso) mettiSeduta(nuovo, verso, tolta);
    for (const w of lista(nuovo.settimane)) {
      for (const x of lista(w && w.sedute)) {
        if (!x || x.giorno !== d || x.tipo !== seduta.tipo || (parti > 1 && (x.parte || 1) !== parte)) continue;
        if (verso) x.giorno = verso;
        else x.possibile = false;
      }
    }
  }
  for (const p of lista(spostamento.palestra)) {
    if (!p || !dataValida(p.da)) continue;
    const tolta = togliSeduta(nuovo, p.da, (x) => x && x.tipo === "palestra");
    if (tolta && dataValida(p.a)) mettiSeduta(nuovo, p.a, tolta);
  }
  nuovo.spostamenti = [...lista(nuovo.spostamenti), {
    data: oggi || seduta.giorno, tipo: seduta.tipo, da: seduta.giorno, a: destinazioni[0] || (spostamento.esito === "sposta" ? spostamento.giorno || null : null), motivo, colore,
  }];
  return nuovo;
}

// La seduta da spostare quando oggi non si può (3.10). Prima quella in bici, poi la palestra.
function sedutaDelGiorno(piano, d) {
  const g = giorniConData(piano, d)[0];
  const sedute = lista(g && g.sedute).filter((x) => x && x.tipo !== "riposo");
  const bici = sedute.find((x) => x.tipo !== "palestra" && x.tipo !== "tronco");
  return bici || sedute.find((x) => x.tipo === "palestra") || null;
}

// Il primo giorno libero della settimana per la palestra, dopo d, senza sedute chiave e non fuori.
function giornoLiberoDopo(piano, d) {
  const w = settimanaDi(piano, d);
  for (const g of lista(w && w.giorni)) {
    if (!g || g.giorno <= d || g.fuori || g.disponibile === false) continue;
    if (lista(g.sedute).some((x) => x && x.tipo !== "riposo" && x.tipo !== "facile" && x.tipo !== "tronco")) continue;
    return g.giorno;
  }
  return null;
}

// «Oggi non posso» (3.10), con le stesse regole dello spostamento del semaforo. livello è il colore di
// oggi. Restituisce { piano, spostamento, seduta } oppure null se oggi non c'è niente da spostare.
export function spostaGiorno(piano, giorno, { oggi = giorno, livello = null, motivo = "nonPosso" } = {}) {
  if (!oggetto(piano)) return null;
  const x = sedutaDelGiorno(piano, giorno);
  if (!x) return null;
  const seduta = { ...x, giorno };
  let spostamento;
  if (x.tipo === "palestra") {
    const a = giornoLiberoDopo(piano, giorno);
    spostamento = { esito: a ? "sposta" : "salta", giorno: a, giorni: a ? [a] : [], palestra: [] };
  } else {
    spostamento = sposta(seduta, settimanaDi(piano, giorno), {}, piano.obiettivo ? piano.obiettivo.data : null, piano, { oggi });
  }
  return { piano: applicaSpostamento(piano, spostamento, seduta, { oggi, motivo, colore: livello }), spostamento, seduta };
}

// «Questo weekend non posso», in Settimana. La seduta del sabato, o della domenica, di questa settimana.
export function spostaWeekend(piano, oggi) {
  const sabato = aggiungiGiorni(lunediDi(oggi), 5);
  for (const d of [sabato, aggiungiGiorni(sabato, 1)]) {
    if (d < oggi) continue;
    const r = spostaGiorno(piano, d, { oggi, motivo: "weekend" });
    if (r) return r;
  }
  return null;
}

// --- Le carte in più del mattino (6.4 e 7.5) ---

const ORDINE_IN_PIU = ["parti", "proposta", "lunga", "prova", "stub", "sforzo", "palestra", "seduta", "dispositivo"];

const chiaveCarta = (tipo, id) => `${tipo}-${id}`;

// La risposta data a una carta, dalla voce dell'uscita o dal diario del mattino. Anche «Non lo so»
// chiude la carta (6.4).
function rispostaDi(detti, mattino, carta) {
  if (carta.tipo === "seduta") {
    const v = mappa(mappa(mattino)[carta.giorno]).sedutaPiano;
    return v === undefined ? null : v;
  }
  const v = mappa(detti[carta.attivita.id]);
  const data = mappa(v.carte)[carta.tipo];
  return data === undefined ? null : data;
}

// Le carte possibili dalle attività e dal piano. lunga con le borse e lo sforzo dei giri all'aperto di
// almeno 2 ore, stub che conta, sforzo dei giri senza sensori, palestra dal dispositivo, seduta del
// piano di ieri senza niente registrato, e prova la sera o il mattino dopo un giro con le borse.
function cartePossibili({ attivita, detti, piano, oggi, adesso }) {
  const dal = aggiungiGiorni(oggi, -DOMANDE.scadenzaGiorni);
  const carte = [];
  const chiaviDelPiano = new Set(lista(piano && piano.settimane).flatMap((w) => lista(w && w.sedute)).filter((x) => x && x.possibile !== false).map((x) => x.giorno));
  for (const a of attivita) {
    if (!a || a.giorno < dal || a.giorno > oggi) continue;
    const v = mappa(detti[a.id]);
    const base = { chiave: null, giorno: a.giorno, borse: false, fine: a.fine || null, attivita: a, seduta: null };
    const fuori = inBici(a) && !a.rulli;
    if (a.stub) {
      if ((a.secondi >= DATI.stubDaOre * ORA || chiaviDelPiano.has(a.giorno)) && !v.tipo) carte.push({ ...base, tipo: "stub", chiave: chiaveCarta("stub", a.id), borse: a.secondi >= DOMANDE.borseDaOre * ORA });
      continue;
    }
    if (fuori && !a.eBike && a.secondi >= DOMANDE.borseDaOre * ORA && a.borse === null && !a.modoEvento) {
      carte.push({ ...base, tipo: "lunga", chiave: chiaveCarta("lunga", a.id), borse: true });
    } else if (fuori && !a.potenza && !a.battito && a.sforzo === null && !a.daComeSto) {
      carte.push({ ...base, tipo: "sforzo", chiave: chiaveCarta("sforzo", a.id) });
    }
    if (inPalestra(a) && !a.daComeSto && a.allenato === null) carte.push({ ...base, tipo: "palestra", chiave: chiaveCarta("palestra", a.id) });
    const carica = a.borse === "evento" || a.borse === "parte";
    const sera = a.giorno < oggi || (typeof adesso === "string" && Number(adesso.slice(11, 13)) >= SERA);
    if (inBici(a) && carica && a.secondi >= BORSE.oreMinime * ORA && giorniTra(a.giorno, oggi) <= 1 && sera && !oggetto(v.prova)) {
      carte.push({ ...base, tipo: "prova", chiave: chiaveCarta("prova", a.id) });
    }
  }
  // La seduta del piano di ieri, in bici, senza niente registrato (6.3).
  const ieri = aggiungiGiorni(oggi, -1);
  const giornoIeri = piano ? giorniConData(piano, ieri)[0] : null;
  const prevista = lista(giornoIeri && giornoIeri.sedute).find((x) => x && x.tipo !== "riposo" && x.tipo !== "palestra" && x.tipo !== "tronco");
  if (prevista && !attivita.some((a) => a.giorno === ieri && inBici(a))) {
    carte.push({ tipo: "seduta", chiave: chiaveCarta("seduta", ieri), giorno: ieri, borse: false, fine: null, attivita: null, seduta: prevista });
  }
  return carte;
}

// Le carte di 6.4 nell'ordine di js/dati.js (carteDelMattino), tutte, con le regole sulla scadenza e
// sulla finestra dello sforzo. La prova, che carteDelMattino non conosce, va dopo la lunga.
function carteInOrdine(possibili, risposte, oggi, adesso) {
  const prove = possibili.filter((c) => c.tipo === "prova" && risposte[c.chiave] == null && giorniTra(c.giorno, oggi) <= DOMANDE.scadenzaGiorni);
  const altre = possibili.filter((c) => c.tipo !== "prova");
  const ordinate = [];
  const date = { ...risposte };
  for (let giro = 0; giro < altre.length; giro++) {
    const prese = carteDelMattino(altre, date, oggi, adesso);
    if (!prese.length) break;
    for (const c of prese) {
      ordinate.push(c);
      date[c.chiave] = "presa";
    }
  }
  const dopoLunghe = ordinate.findIndex((c) => c.tipo !== "lunga");
  const i = dopoLunghe < 0 ? ordinate.length : dopoLunghe;
  return [...ordinate.slice(0, i), ...prove, ...ordinate.slice(i)];
}

// Al massimo una carta per apertura, due quando una è sulle borse (6.4).
function conIlTetto(carte) {
  const conBorse = carte.slice(0, DOMANDE.carteInPiuConBorse).some((c) => c.borse === true);
  return carte.slice(0, conBorse ? DOMANDE.carteInPiuConBorse : DOMANDE.carteInPiu);
}

// --- Il semaforo e lo stato del giorno ---

// La domanda sul cambio di dispositivo si fa una volta. Dopo una risposta si riprova solo quando le
// notti di quel confronto sono passate tutte, le 7 recenti più le 28 di prima (regola 10.4).
function dispositivoGiaChiesto(profilo, oggi) {
  const X = SEMAFORO.dispositivo;
  const quando = profilo.dispositivoChiesto || profilo.cambioDispositivo;
  return dataValida(quando) && giorniTra(quando, oggi) < X.nottiRecenti + X.nottiPrima;
}

// La proposta automatica della modalità evento (4.5), dal primo dei giorni lunghi di fila fuori dai
// viaggi già segnati. Un «No» vale per tutta quella fila.
function propostaDiOggi(m, evento, oreH, viaggi) {
  if (evento) return null;
  const inizio = inizioProposta(m.uscite, m.oggi, oreH, viaggi);
  if (!inizio) return null;
  for (let d = inizio; d <= m.oggi; d = aggiungiGiorni(d, 1)) {
    if (oggetto(m.diario[d]) && m.diario[d].propostaNo) return null;
  }
  return { inizio };
}

// L'avviso di crescita rapida ancora valido, dall'ultima domenica che l'ha acceso (regola 1.9).
function crescitaAttiva(domeniche, oggi) {
  const attive = Object.entries(domeniche)
    .filter(([d, v]) => d <= oggi && oggetto(v) && oggetto(v.crescita) && v.crescita.avviso && dataValida(v.crescita.fino) && v.crescita.fino >= oggi)
    .sort(([a], [b]) => (a < b ? 1 : -1));
  return attive.length ? attive[0][1].crescita : null;
}

// --- La domenica (3.11) ---

// Il controllo della domenica di questa settimana. Si fa la domenica e il lunedì, per la domenica appena
// passata, così chi non apre la domenica lo trova il lunedì, e prima quando il semaforo lo chiede (tre
// gialli di fila). Rifatto con gli stessi giorni dà lo stesso esito. Restituisce { controllo, voce,
// chiave }, con voce da salvare in comesto.domenica.v1 sotto chiave, oppure null.
function domenicaDiOggi({ oggi, giorniPuliti, attivita, mattino, esiti, domeniche, piano, esito, eta, serie, evento }) {
  const dow = giornoSettimana(oggi);
  let giorno = null;
  if (dow === 6) giorno = oggi;
  else if (dow === 0) giorno = aggiungiGiorni(oggi, -1);
  else if (esito && esito.domenica === true) giorno = oggi;
  if (!giorno) return null;
  const diario = {};
  for (let d = aggiungiGiorni(giorno, -6); d <= giorno; d = aggiungiGiorni(d, 1)) {
    const m = mappa(mattino[d]);
    const e = mappa(esiti[d]);
    diario[d] = { stoMale: lista(m.stoMale), livello: e.livello || null, s6: m.s6 || null, evento: Boolean(e.evento) };
  }
  if (giorno === oggi && esito) diario[oggi].livello = esito.livello;
  const precedenti = Object.entries(domeniche).filter(([d, v]) => d < giorno && oggetto(v)).sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, v]) => ({ conta: v.conta, proposta: v.proposta }));
  const controllo = controlloDomenica(giorniPuliti, attivita, diario, piano, {
    oggi: giorno, precedenti, s6: mappa(mattino[giorno]).s6 || null, evento: Boolean(evento),
    gialliDiFila: Boolean(esito && lista(esito.messaggi).some((x) => x.chiave === "gialliDiFila")),
  });
  const crescita = dow === 6 || dow === 0 ? crescitaRapida(serie, giorno, eta) : null;
  const voce = {
    giorno, conta: controllo.conta, segnali: controllo.segnali, proposta: controllo.proposta, chiedi: controllo.chiedi || null,
    medico: Boolean(controllo.medico), spento: controllo.spento === true,
    crescita: crescita && crescita.avviso ? { avviso: true, fino: crescita.fino, tetto: crescita.tetto } : null,
  };
  return { controllo: { ...controllo, crescita }, voce, chiave: giorno };
}

// --- Tutto insieme ---

// stato = {
//   oggi, adesso,
//   letture: { atleta, benessere, attivita }   quello che arriva da intervals.icu (o dall'esempio)
//   telefono: { preferenze, profilo, obiettivo, disponibilita, piano, uscite, palestra, mattino, esiti,
//               domenica, invito }               le chiavi di comesto.*, già lette
//   ui: { carteMostrate }                       le chiavi delle carte di questa apertura, se ci sono già
// }
// Restituisce i campi nuovi di ctx (vedi il contratto in cima) più modello, esito e giorno, e
// daSalvare { piano, esito, domenica: { chiave, voce } | null }.
export function calcola(stato = {}) {
  const oggi = stato.oggi;
  const adesso = typeof stato.adesso === "string" ? stato.adesso : `${oggi}T08:00`;
  const lette = mappa(stato.letture);
  const tel = mappa(stato.telefono);
  const detti = mappa(tel.uscite);
  const mattino = mappa(tel.mattino);
  const esiti = mappa(tel.esiti);
  const domeniche = mappa(tel.domenica);
  const preferenze = mappa(tel.preferenze);
  const palestraSalvata = mappa(tel.palestra);
  const atleta = oggetto(lette.atleta) || null;
  const benessere = lista(lette.benessere);
  const grezze = [...lista(lette.attivita)];
  grezze.push(...attivitaDelTelefono(detti, palestraSalvata, grezze));

  // Lo strato dei dati, il carico e il profilo (6.2 e 6.5).
  const giorniPuliti = benessere.map(normalizzaGiorno).filter(Boolean).sort((a, b) => (a.d < b.d ? -1 : 1));
  const profiloBase = mappa(tel.profilo);
  const prime = preparaAttivita(grezze, giorniPuliti, { detti, profilo: profiloBase, oggi, esiti });
  const attivita = prime.filter((a) => a.giorno <= oggi).map((a) => {
    const v = mappa(detti[a.id]);
    return { ...a, stomaco: typeof v.stomaco === "string" ? v.stomaco : null, prova: oggetto(v.prova) };
  });
  const profilo = profiloDeiModuli(profiloBase, attivita, oggi);
  const primoGiorno = aggiungiGiorni(oggi, -(CHIAMATE.primaLetturaGiorni - 1));
  const serie = serieCarico(giorniPuliti, attivita, primoGiorno, { fino: oggi });
  const ultimaSerie = serie.length ? serie[serie.length - 1] : null;
  const giornoOggi = giorniPuliti.find((g) => g.d === oggi) || null;
  const ultimoConFitness = [...giorniPuliti].reverse().find((g) => num(g.ctl)) || null;
  const comeSto = ultimaSerie && num(ultimaSerie.fitness) ? ultimaSerie.fitness : null;
  const suIntervals = ultimoConFitness ? ultimoConFitness.ctl : null;
  const fitness = { comeSto, intervals: suIntervals, differenza: num(comeSto) && num(suIntervals) ? differenzaFitness(comeSto, suIntervals) : null };
  const k = puntiOra(attivita, oggi);
  const registro = registroPalestra(palestraSalvata, attivita);
  const eta = etaDi(profilo);

  // L'obiettivo e la giornata (capitolo 1).
  const ob = leggiObiettivo(tel.obiettivo);
  const conPercorso = Boolean(ob && ob.percorso);
  const stima = conPercorso ? stimaH({ percorso: ob.percorso, giorni: ob.giorni, profilo, atleta, uscite: attivita, oggi }) : null;

  // Il semaforo (capitolo 4), con le fatiche e la modalità evento del piano salvato.
  const salvato = oggetto(tel.piano);
  const storia = { ...esiti };
  delete storia[oggi];
  const m = costruisciModello({
    atleta, benessere, uscite: grezze, diario: mattino, storia, profilo,
    piano: { fatiche: salvato ? fatichePiano(salvato, attivita, oggi) : [] }, serie,
  }, oggi);
  const viaggi = viaggiDelDiario(m.diario, m.uscite, oggi);
  const viaggio = viaggi.length ? viaggi[viaggi.length - 1] : null;
  const eventoDiario = eventoDiOggi(viaggio, oggi);
  const evento = eventoDiario || (salvato ? modoEventoPiano(salvato, attivita, oggi) : null);
  const partenza = ob ? ob.partenza : null;
  const mancano = partenza ? giorniTra(oggi, partenza) : null;
  const giorniPartenza = mancano !== null && mancano >= 0 ? mancano : null;
  const malattia = statoMalattia(m.diario, m.storia, oggi);
  const contesto = {
    evento,
    guardia: giorniDiGuardia(m.storia, m.piano, m.uscite, oggi, { eta, viaggi }),
    rientro: malattia.rientro,
    giorniPartenza,
    giorniEvento: giorniEventoDi(ob),
    fasciaEta: profilo.fasciaEta || null,
    aritmia: Boolean(profilo.aritmia),
    crescita: crescitaAttiva(domeniche, oggi),
  };
  const esito = valuta(m, contesto);
  const oreH = stima && num(stima.H) ? stima.H : null;
  const giorno = {
    contesto,
    viaggio,
    evento,
    giorniPartenza,
    malattia,
    cuore: statoCuore(m.diario, m.storia, oggi),
    arrivatoOggi: Boolean(oggetto(m.diario[oggi]) && m.diario[oggi].arrivato),
    proposta: propostaDiOggi(m, evento, oreH, viaggi),
    carte: [],
    carta: null,
  };
  const dia = mappa(m.diario[oggi]);
  if (giorniPartenza === 0 && !evento && !dia.parti && !dia.inViaggio) giorno.carte.push("parti");
  if (giorno.proposta) giorno.carte.push("proposta");
  if (esito.domande && esito.domande.dispositivo && !dispositivoGiaChiesto(profilo, oggi)) giorno.carte.push("dispositivo");

  // La domenica, prima del piano, perché la sua proposta cambia la settimana che comincia (3.11).
  const domenica = domenicaDiOggi({ oggi, giorniPuliti, attivita, mattino, esiti, domeniche, piano: salvato, esito, eta, serie, evento });
  const voceDomenica = domenica ? domenica.voce : Object.entries(domeniche).filter(([, v]) => oggetto(v)).sort(([a], [b]) => (a < b ? 1 : -1)).map(([, v]) => v)[0] || null;

  // Il piano (capitolo 3), solo con un percorso, cioè un evento o un'avventura propria.
  let piano = null;
  let pianoDaSalvare = null;
  if (conPercorso) {
    const lunedi = lunediDi(oggi);
    const proposta = voceDomenica && voceDomenica.proposta && voceDomenica.proposta.tipo !== "continua" && voceDomenica.proposta.lunedi === lunedi
      ? voceDomenica.proposta : null;
    const storico = {
      uscite: attivita, fitness: comeSto, k, giorni: giorniPuliti, domenica: proposta, registro,
      stomaco: stomacoDi(detti), crescitaRapida: Boolean(contesto.crescita),
    };
    const r = pianoDiOggi({ ob, stima, profilo, disponibilita: tel.disponibilita, storico, salvato, oggi, atleta, attivita });
    piano = r.piano;
    if (r.nuovo) pianoDaSalvare = piano;
  }

  // «Pronto?» (capitolo 2), con il piano per la proiezione.
  const debriefing = debriefingDi(detti);
  const prontezza = conPercorso ? valutaProntezza({
    percorso: ob.percorso, giorni: ob.giorni, partenza, oggi, uscite: attivita, benessere: giorniPuliti, piano, profilo, atleta, stima,
    esperienza: profilo.esperienza ?? false, debriefing, oreDisponibili: leggiDisponibilita(tel.disponibilita || {}).ore,
    fitness: comeSto, k, eta, primoGiorno: attivita.length ? attivita[attivita.length - 1].giorno : null,
    doloriCheTornano: doloriCheTornano(giorniPuliti, oggi),
  }) : null;

  // La seduta di oggi (3.10). Una seduta che il semaforo sposta si sposta nel piano una volta sola, quando
  // le risposte del mattino ci sono, così il colore che la sposta è quello vero.
  let seduta = null;
  if (piano && piano.fase && piano.fase !== "senzaGiornata") {
    const guardia = contesto.guardia && contesto.guardia.attiva ? contesto.guardia : null;
    seduta = oggiCosaFaccio(piano, esito, {
      evento, guardia, registro, profilo, atleta, oreTappa: oreH,
      giorniFacili: Boolean(guardia && guardia.tipo === "uscitaGrande"),
      sonnoCorto: Boolean(giornoOggi && num(giornoOggi.sonno) && giornoOggi.sonno < SEMAFORO.viaggio.sonnoCortoOre * ORA),
    }, oggi);
    const risposte = Boolean(esito.stop) || Boolean(giornoOggi && giornoOggi.fatica && giornoOggi.dolori && giornoOggi.infortunio);
    const giaFatto = lista(piano.spostamenti).some((x) => x && x.data === oggi && x.motivo === "semaforo");
    const mossa = seduta && seduta.sposta;
    if (mossa && risposte && !giaFatto) {
      const bici = lista(seduta.prevista).find((x) => x && x.tipo !== "palestra" && x.tipo !== "tronco") || null;
      const regola = { oggi, motivo: "semaforo", colore: esito.livello };
      let nuovo = piano;
      if (mossa.seduta && bici) {
        nuovo = applicaSpostamento(nuovo, mossa.seduta, { ...bici, giorno: oggi }, regola);
        // Al suo posto resta la seduta di oggi già adattata, per esempio il giro del giallo, così la
        // carta non cambia ridisegnando la pagina.
        if (seduta.seduta && seduta.seduta.tipo !== bici.tipo) mettiSeduta(nuovo, oggi, seduta.seduta);
      }
      const p = mossa.palestra;
      if (p && dataValida(p.da)) {
        const verso = dataValida(p.a) ? p.a : null;
        nuovo = applicaSpostamento(nuovo, { esito: verso ? "sposta" : "salta", giorno: verso, giorni: verso ? [verso] : [], palestra: [] },
          { tipo: "palestra", giorno: p.da }, regola);
      }
      if (nuovo !== piano) {
        piano = nuovo;
        pianoDaSalvare = piano;
      }
    } else if (giaFatto && seduta) {
      // Il piano è già spostato, e la carta lo ridice, come la prima volta (3.10).
      for (const x of lista(piano.spostamenti).filter((y) => y && y.data === oggi && y.motivo === "semaforo" && y.da === oggi && y.tipo !== "palestra")) {
        const riga = x.a ? testoSpostiamo(x.tipo, x.a, lunediDi(x.a) === lunediDi(oggi)) : testoSalta(x.tipo);
        if (!seduta.righe.includes(riga)) seduta.righe.push(riga);
      }
    }
  }
  const settimana = piano ? settimanaDi(piano, oggi) : null;

  // Le carte in più (6.4). Le carte di questa apertura restano quelle della prima volta.
  const possibili = cartePossibili({ attivita, detti, piano, oggi, adesso });
  const risposte = {};
  for (const c of possibili) risposte[c.chiave] = rispostaDi(detti, mattino, c);
  const delSemaforo = giorno.carte.map((tipo) => ({ tipo, chiave: tipo, giorno: oggi, borse: false, fine: null, attivita: null, seduta: null, inizio: tipo === "proposta" ? giorno.proposta.inizio : null }));
  const tutte = [...delSemaforo.filter((c) => c.tipo !== "dispositivo"), ...carteInOrdine(possibili, risposte, oggi, adesso), ...delSemaforo.filter((c) => c.tipo === "dispositivo")]
    .sort((a, b) => ORDINE_IN_PIU.indexOf(a.tipo) - ORDINE_IN_PIU.indexOf(b.tipo));
  const mostrate = Array.isArray(mappa(stato.ui).carteMostrate) ? stato.ui.carteMostrate : null;
  const carteInPiu = mostrate ? tutte.filter((c) => mostrate.includes(c.chiave)) : conIlTetto(tutte);

  // I messaggi di una volta sola.
  const ultimaCopia = dataValida(preferenze.ultimaCopia) ? preferenze.ultimaCopia : null;
  const promemoria = dataValida(preferenze.promemoriaCopia) ? preferenze.promemoriaCopia : null;
  const messaggi = {
    soloStrava: soloStrava(attivita, oggi) && !preferenze.vistoSoloStrava,
    notteNonArriva: notteNonArrivaPiu(giorniPuliti) && !preferenze.vistoNotteNonArriva,
    copia: Boolean(piano) && (!ultimaCopia || giorniTra(ultimaCopia, oggi) >= MEMORIA.copiaOgniGiorni)
      && (!promemoria || giorniTra(promemoria, oggi) >= MEMORIA.copiaOgniGiorni),
    iphone: false,
  };

  // L'invito degli iscritti (6.9), ricontrollato sul catalogo.
  const invitoSalvato = oggetto(tel.invito);
  const letto = invitoSalvato ? leggiInvito(invitoSalvato) : null;
  const invito = letto && letto.valido ? { percorso: letto.percorso, giorni: letto.giorni, partenza: letto.partenza } : null;

  const palestra = {
    registro,
    conto: contoSedute(registro, oggi),
    oggi: seduta && seduta.palestra ? seduta.palestra : null,
    fase: settimana && settimana.fase ? settimana.fase : null,
  };

  return {
    oggi,
    adesso,
    modello: m,
    esito,
    giorno,
    attivita,
    giorniPuliti,
    serie,
    fitness,
    k,
    profiloModuli: profilo,
    obiettivo: ob,
    stima,
    prontezza,
    piano,
    settimana,
    seduta,
    palestra,
    domenica: { controllo: domenica ? domenica.controllo : null, voce: voceDomenica },
    carteInPiu,
    messaggi,
    invito,
    primoAvvio: ob === null,
    disponibilita: oggetto(tel.disponibilita),
    daSalvare: {
      piano: pianoDaSalvare,
      esito: esito.registro || null,
      domenica: domenica ? { chiave: domenica.chiave, voce: domenica.voce } : null,
    },
  };
}

// --- Chi è entrato, e la coda delle scritture (6.6 e R21) ---

// L'atleta che è appena entrato rispetto a quello dei dati del telefono. salvata è comesto.atleta.v1,
// impronta quella di chi è entrato. «nuovo» vuol dire che il telefono non è ancora legato a nessuno e lo
// si lega a lui, «uguale» che si va avanti, «diverso» che si ferma tutto finché la persona non sceglie.
// Senza impronta, cioè senza l'id dell'atleta, vale «ignoto» e non si decide niente.
export function confrontaAtleta(salvata, impronta) {
  if (typeof impronta !== "string" || !impronta) return "ignoto";
  const s = oggetto(salvata);
  if (!s || typeof s.impronta !== "string" || !s.impronta) return "nuovo";
  return s.impronta === impronta ? "uguale" : "diverso";
}

// La coda delle scritture verso intervals.icu parte solo con le scritture accese (js/config.js), fuori
// dall'esempio, con chi è entrato uguale ai dati del telefono e mai mentre è aperta la schermata
// dell'altra persona. Così le risposte di una persona non finiscono mai nell'account di un'altra.
export function codaPuoPartire({ attive = false, demo = false, impronta = null, salvata = null, atletaDiverso = false } = {}) {
  return attive === true && !demo && !atletaDiverso && confrontaAtleta(salvata, impronta) === "uguale";
}

// --- Le voci del telefono che le azioni scrivono ---

// Un giro aggiunto a mano (6.3, «Aggiungi un giro»), come voce di comesto.uscite.v1, con l'attività
// nella forma di intervals.icu e l'external_id comesto-u- più un codice. giro è { tipo, giorno, ora,
// minuti, sforzo, borse, kg, km, metri }. Restituisce { id, voce } oppure null con un giro senza giorno
// o senza durata.
export function giroDelTelefono(giro, codice) {
  const g = mappa(giro);
  if (!dataValida(g.giorno) || !(num(g.minuti) && g.minuti > 0) || typeof codice !== "string" || !codice) return null;
  const id = `${PREFISSI.giro}${codice}`;
  const ora = typeof g.ora === "string" && /^\d{2}[.:]\d{2}$/.test(g.ora) ? g.ora.replace(".", ":") : "09:00";
  const tipo = typeof g.tipo === "string" && g.tipo ? g.tipo : "Ride";
  const grezza = {
    id,
    start_date_local: `${g.giorno}T${ora}:00`,
    type: tipo,
    moving_time: Math.round(g.minuti * 60),
    distance: num(g.km) && g.km > 0 ? Math.round(g.km * 1000) : null,
    total_elevation_gain: num(g.metri) && g.metri >= 0 ? Math.round(g.metri) : null,
    icu_rpe: num(g.sforzo) && g.sforzo > 0 ? g.sforzo : null,
    source: "MANUAL",
    external_id: id,
  };
  const voce = { giorno: g.giorno, manuale: true, grezza };
  if (DOMANDE.borse.includes(g.borse)) voce.borse = g.borse;
  if (num(g.kg) && g.kg > 0) voce.kg = g.kg;
  if (num(g.sforzo) && g.sforzo > 0) voce.sforzo = g.sforzo;
  return { id, voce };
}
