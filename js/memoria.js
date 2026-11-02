// La memoria sul telefono, cioè le chiavi comesto. di localStorage (6.6 della specifica).
// Ogni lettura e scrittura dei dati di Come sto passa da qui, dentro un try e catch, perché in
// navigazione privata la memoria può mancare, essere vuota o rifiutare le scritture, e l'app va
// avanti lo stesso con i dati di intervals.icu. La chiave e l'accesso di intervals.icu non entrano
// mai in queste chiavi, restano dove li tiene js/credenziali.js.
//
// Niente DOM e niente window. La memoria del browser arriva da fuori con creaMemoria, così le prove
// usano una memoria finta (test/memoria.test.mjs).
//
// Le regole.
// - Una chiave per tipo di dato (CHIAVI), con la versione nel nome. Una chiave con una versione
//   sconosciuta, o con un contenuto che non si legge o non ha la forma giusta, si sposta nella stessa
//   chiave con .guasto in fondo, e si riparte vuoti.
// - Le mappe per giorno, settimana, seduta o uscita tengono 400 giorni. Obiettivo e piano restano
//   fino a 3 mesi dopo l'ultimo giorno dell'evento, l'invito anche finché non entra nell'obiettivo.
// - Con la memoria piena si svuota prima la cache, poi le chiavi guaste.
// - Ogni voce di una mappa, e ogni oggetto che va nella copia, porta agg, l'istante dell'ultimo
//   cambiamento in millisecondi. Lo mette scrivi e lo toglie leggi, così gli altri moduli non lo
//   vedono mai. Serve a riprendi, perché per ogni giorno e ogni uscita resti il dato più recente.

import { MEMORIA } from "./parametri.js?v=202611022140";
import { CHIAVE, ACCESSO } from "./credenziali.js?v=202611022140";

export const PREFISSO = "comesto.";
export const GUASTO = ".guasto";

// Le chiavi della tabella di 6.6. La forma "oggetto" è un oggetto intero, "mappa" un oggetto di voci
// per giorno, settimana, seduta o uscita, ognuna un oggetto, "lista" una lista di oggetti in ordine.
// copia dice se la chiave va nel file della copia di sicurezza.
const VOCI = {
  preferenze: { chiave: "comesto.preferenze", forma: "oggetto", copia: true },          // come oggi, più l'ultima pagina aperta
  profilo: { chiave: "comesto.profilo.v1", forma: "oggetto", copia: true },
  obiettivo: { chiave: "comesto.obiettivo.v1", forma: "oggetto", copia: true },         // fino a 3 mesi dopo l'evento
  disponibilita: { chiave: "comesto.disponibilita.v1", forma: "oggetto", copia: true },
  piano: { chiave: "comesto.piano.v1", forma: "oggetto", copia: true },                 // fino a 3 mesi dopo l'evento
  uscite: { chiave: "comesto.uscite.v1", forma: "mappa", copia: true },                // per id di intervals.icu
  palestra: { chiave: "comesto.palestra.v1", forma: "mappa", copia: true },            // per seduta, l'id comincia con la data
  mattino: { chiave: "comesto.mattino.v1", forma: "mappa", copia: true },              // per giorno
  esiti: { chiave: "comesto.esiti.v1", forma: "mappa", copia: true },                  // per giorno
  domenica: { chiave: "comesto.domenica.v1", forma: "mappa", copia: true },            // per settimana
  cache: { chiave: "comesto.cache.v1", forma: "oggetto", copia: false },               // si ricalcola
  coda: { chiave: "comesto.coda.v1", forma: "lista", copia: false },                   // finché le scritture non partono
  invito: { chiave: "comesto.invito.v1", forma: "oggetto", copia: true },              // finché non entra nell'obiettivo
  consenso: { chiave: "comesto.consenso", forma: "oggetto", copia: false },            // si cancella con Esci
  // L'impronta dell'atleta a cui appartengono i dati del telefono, un hash dell'id di intervals.icu e
  // mai l'id in chiaro. Resta con Esci, così chi entra dopo con un altro account se ne accorge, e non va
  // nella copia, perché lega i dati a questo telefono.
  atleta: { chiave: "comesto.atleta.v1", forma: "oggetto", copia: false },
};

// Per ogni chiave .guasto il giorno del primo avvio che l'ha trovata, per toglierla dopo
// MEMORIA.guastoGiorni giorni. Non è una chiave dei dati, e la tocca solo pulisci.
const GUASTI = "comesto.guasti";

export const CHIAVI = Object.freeze(Object.fromEntries(Object.entries(VOCI).map(([nome, voce]) => [nome, voce.chiave])));
const PER_CHIAVE = new Map(Object.values(VOCI).map((voce) => [voce.chiave, voce]));
const NOME = /^comesto\.([a-z]+)(?:\.v\d+)?$/;   // comesto.nome oppure comesto.nome.vN
const CREDENZIALE_MINIMA = 8;                     // caratteri, come chiaveValida e tokenValido di js/api.js
const GIORNI_EVENTO_MASSIMI = 366;                // solo per non uscire dal calendario con un valore strano

// --- date, nel formato di intervals.icu ---

const GIORNO = 86400000;
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const ULTIMO_ISTANTE = Date.UTC(9999, 11, 31, 23, 59, 59, 999);

const p2 = (n) => String(n).padStart(2, "0");
const istanteValido = (t) => typeof t === "number" && t >= 0 && t <= ULTIMO_ISTANTE;
const giornoDi = (t) => new Date(t).toISOString().slice(0, 10);

function dataValida(v) {
  const m = typeof v === "string" ? DATA.exec(v) : null;
  if (!m) return false;
  const [a, mese, g] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(a, mese - 1, g));
  return a >= 1970 && d.getUTCFullYear() === a && d.getUTCMonth() === mese - 1 && d.getUTCDate() === g;
}

function aggiungiGiorni(iso, n) {
  const [a, m, g] = iso.split("-").map(Number);
  return giornoDi(Date.UTC(a, m - 1, g) + n * GIORNO);
}

// Mesi di calendario. Dal 30 novembre, tre mesi dopo è il 28 febbraio, l'ultimo giorno del mese.
function aggiungiMesi(iso, n) {
  const [a, m, g] = iso.split("-").map(Number);
  const indice = a * 12 + m - 1 + n;
  const anno = Math.floor(indice / 12);
  const mese = indice - anno * 12;
  const ultimo = new Date(Date.UTC(anno, mese + 1, 0)).getUTCDate();
  return `${String(anno).padStart(4, "0")}-${p2(mese + 1)}-${p2(Math.min(g, ultimo))}`;
}

// --- forme e confronti ---

const oggetto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const proprio = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function formaGiusta(forma, valore) {
  if (forma === "lista") return Array.isArray(valore) && valore.every(oggetto);
  if (!oggetto(valore)) return false;
  return forma !== "mappa" || Object.values(valore).every(oggetto);
}

// Il contenuto di una chiave, oppure undefined se non si legge o non ha la forma giusta.
function interpreta(forma, testo) {
  let valore;
  try { valore = JSON.parse(testo); } catch { return undefined; }
  return formaGiusta(forma, valore) ? valore : undefined;
}

function vuoto(forma) {
  if (forma === "mappa") return {};
  return forma === "lista" ? [] : null;
}

// Stessi dati, anche con i campi in un altro ordine.
function uguali(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  const campi = Object.keys(a);
  return campi.length === Object.keys(b).length && campi.every((k) => proprio(b, k) && uguali(a[k], b[k]));
}

function senzaAgg(voce) {
  const dati = { ...voce };
  delete dati.agg;
  return dati;
}

const tempo = (voce) => (typeof voce.agg === "number" && Number.isFinite(voce.agg) ? voce.agg : 0);

// Una voce nuova o cambiata prende l'istante di adesso, una uguale a com'era tiene il suo.
function timbraVoce(nuova, prima, ora) {
  const dati = senzaAgg(nuova);
  if (prima && uguali(dati, senzaAgg(prima))) return prima;
  return { ...dati, agg: ora };
}

function timbra(voce, nuovo, prima, ora) {
  if (voce.forma !== "mappa") return timbraVoce(nuovo, prima, ora);
  const risultato = {};
  for (const [id, valore] of Object.entries(nuovo)) {
    if (id !== "__proto__") risultato[id] = timbraVoce(valore, prima && proprio(prima, id) ? prima[id] : null, ora);
  }
  return risultato;
}

function togliTimbri(voce, valore) {
  if (!voce.copia) return valore;
  if (voce.forma !== "mappa") return senzaAgg(valore);
  return Object.fromEntries(Object.entries(valore).map(([id, v]) => [id, senzaAgg(v)]));
}

// Unisce la copia a quello che c'è sul telefono. Per ogni voce resta la più recente, e una voce con
// gli stessi dati non conta come sostituita.
function unisci(voce, qui, file) {
  if (voce.forma !== "mappa") {
    if (!qui) return { valore: file, nuove: 1, sostituite: 0 };
    const piuRecente = tempo(file) > tempo(qui) && !uguali(senzaAgg(file), senzaAgg(qui));
    return { valore: piuRecente ? file : qui, nuove: 0, sostituite: piuRecente ? 1 : 0 };
  }
  const valore = { ...(qui || {}) };
  let nuove = 0;
  let sostituite = 0;
  for (const [id, sua] of Object.entries(file)) {
    if (id === "__proto__") continue;
    const mia = qui && proprio(qui, id) ? qui[id] : null;
    if (!mia) {
      valore[id] = sua;
      nuove += 1;
    } else if (tempo(sua) > tempo(mia) && !uguali(senzaAgg(sua), senzaAgg(mia))) {
      valore[id] = sua;
      sostituite += 1;
    }
  }
  return { valore, nuove, sostituite };
}

// --- le regole sul tempo ---

// Il giorno di una voce, per la regola dei 400 giorni. Prima un campo con la data, poi l'id se
// comincia con una data (giorni, settimane, sedute), poi il giorno dell'ultimo cambiamento.
function giornoVoce(id, voce) {
  for (const campo of ["d", "giorno", "data"]) if (dataValida(voce[campo])) return voce[campo];
  if (dataValida(id.slice(0, 10))) return id.slice(0, 10);
  return istanteValido(voce.agg) ? giornoDi(voce.agg) : null;
}

// L'ultimo giorno dell'evento di un obiettivo, di un invito o di un piano, che ha il suo obiettivo
// dentro (3.13). null senza una data, come l'obiettivo libero senza data o il solo semaforo.
function fineEvento(valore) {
  const o = oggetto(valore.obiettivo) ? valore.obiettivo : valore;
  const partenza = [o.partenza, o.data].find(dataValida);
  if (!partenza) return null;
  const giorni = Number.isInteger(o.giorni) && o.giorni >= 1 && o.giorni <= GIORNI_EVENTO_MASSIMI ? o.giorni : 1;
  return aggiungiGiorni(partenza, giorni - 1);
}

function finito(valore, oggi) {
  const fine = fineEvento(valore);
  return fine !== null && oggi > aggiungiMesi(fine, MEMORIA.mesiDopoEvento);
}

// L'invito è entrato nell'obiettivo quando l'obiettivo ha lo stesso percorso e la stessa partenza,
// anche se poi la persona ha cambiato i giorni.
function entrato(invito, obiettivo) {
  return typeof invito.percorso === "string" && invito.percorso === obiettivo.percorso &&
    dataValida(invito.partenza) && invito.partenza === obiettivo.partenza;
}

// L'obiettivo libero che prende il posto della sfida della pagina Obiettivo di prima.
function obiettivoDaSfida(sfida, dataEvento) {
  const id = typeof sfida === "string" && proprio(MEMORIA.sfide, sfida) ? sfida : MEMORIA.sfidaSenzaScelta;
  const { libero, giorni, ore } = MEMORIA.sfide[id];
  const obiettivo = { tipo: "libero", libero, giorni, ore, daSfida: id };
  if (dataValida(dataEvento)) obiettivo.partenza = dataEvento;
  return obiettivo;
}

// Così il browser dice che la memoria è piena, Firefox con un nome suo.
function piena(e) {
  return Boolean(e) && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.code === 22 || e.code === 1014);
}

// Il nome del file della copia di sicurezza.
export function nomeCopia(oggi) {
  return dataValida(oggi) ? `come-sto-dati-${oggi}.json` : "come-sto-dati.json";
}

// locale è localStorage, oppure una memoria finta con getItem, setItem, removeItem, key e length,
// oppure null quando il browser non la dà. sessione, facoltativa, è il sessionStorage della scheda,
// che serve a esciCancellaTutto e al controllo delle credenziali. adesso dà l'istante in millisecondi.
export function creaMemoria(locale, { sessione = null, adesso = () => Date.now() } = {}) {
  const ora = () => {
    const t = Number(adesso());
    return istanteValido(t) ? t : 0;
  };
  // Diventa falso dopo una scrittura non riuscita, con la memoria assente, bloccata o piena, e torna
  // vero alla prima che riesce. Finché è falso vale quello che l'app tiene nella pagina (cambia).
  let tieneLaMemoria = true;

  // --- la memoria del browser, sempre dentro try e catch ---

  function testo(m, chiave) {
    try { return m ? m.getItem(chiave) : null; } catch { return null; }
  }

  function togliDa(m, chiave) {
    try {
      if (m) m.removeItem(chiave);
      return true;
    } catch {
      return false;
    }
  }

  function chiaviDi(m) {
    const lista = [];
    try {
      for (let i = 0; m && i < m.length; i++) {
        const k = m.key(i);
        if (typeof k === "string") lista.push(k);
      }
    } catch { /* memoria non disponibile, nessuna chiave */ }
    return lista;
  }

  // Con la memoria piena si fa spazio in quest'ordine, e dopo si rinuncia.
  const perFareSpazio = [
    () => togliDa(locale, CHIAVI.cache),
    () => chiaviDi(locale).filter((k) => k.startsWith(PREFISSO) && k.endsWith(GUASTO)).forEach((k) => togliDa(locale, k)),
  ];

  function scriviTesto(chiave, contenuto) {
    for (let passo = 0; locale; passo++) {
      try {
        locale.setItem(chiave, contenuto);
        return true;
      } catch (e) {
        if (!piena(e) || passo >= perFareSpazio.length) return false;
        perFareSpazio[passo]();
      }
    }
    return false;
  }

  // Il contenuto resta com'era nella chiave .guasto. Se non c'è posto nemmeno per quella, la chiave
  // resta dov'è e la prossima scrittura la rimpiazza.
  function spostaInGuasto(chiave, contenuto) {
    return scriviTesto(chiave + GUASTO, contenuto) && togliDa(locale, chiave);
  }

  // Il valore salvato, con i suoi agg, oppure null. Un contenuto rotto va in .guasto, salvo con
  // sposta falso, che serve all'anteprima della ripresa.
  function salvato(voce, sposta = true) {
    const contenuto = testo(locale, voce.chiave);
    if (contenuto === null) return null;
    const valore = interpreta(voce.forma, contenuto);
    if (valore !== undefined) return valore;
    if (sposta) spostaInGuasto(voce.chiave, contenuto);
    return null;
  }

  // La chiave e l'accesso salvati, scritti come comparirebbero dentro un testo JSON, per controllare
  // che non entrino mai nelle chiavi di questa memoria né nella copia.
  function credenziali() {
    const valori = [];
    for (const m of [locale, sessione]) {
      for (const nome of [CHIAVE, ACCESSO]) {
        const v = testo(m, nome);
        if (typeof v === "string" && v.length >= CREDENZIALE_MINIMA) valori.push(JSON.stringify(v).slice(1, -1));
      }
    }
    return valori;
  }
  const conCredenziali = (contenuto, valori) => valori.some((v) => contenuto.includes(v));

  // --- le funzioni di 6.10 ---

  // Il valore di una chiave della tabella, senza agg. Senza niente di salvato, o con un contenuto
  // rotto, le mappe danno {}, la coda [] e le altre chiavi null.
  function leggi(chiave) {
    const voce = PER_CHIAVE.get(chiave);
    if (!voce) return null;
    const valore = salvato(voce);
    return valore === null ? vuoto(voce.forma) : togliTimbri(voce, valore);
  }

  // Salva il valore intero di una chiave della tabella e restituisce true se la memoria lo tiene.
  // false se la chiave non è della tabella, se il valore non ha la forma giusta o contiene la chiave
  // o l'accesso di intervals.icu, o se la memoria non c'è. null o undefined tolgono la chiave.
  function scrivi(chiave, valore) {
    const voce = PER_CHIAVE.get(chiave);
    if (!voce) return false;
    if (valore === null || valore === undefined) return togli(chiave);
    let pulito;
    try { pulito = JSON.parse(JSON.stringify(valore)); } catch { return false; }
    if (!formaGiusta(voce.forma, pulito)) return false;
    const contenuto = JSON.stringify(voce.copia ? timbra(voce, pulito, salvato(voce), ora()) : pulito);
    if (conCredenziali(contenuto, credenziali())) return false;
    return scriviTesto(chiave, contenuto);
  }

  function togli(chiave) {
    return PER_CHIAVE.has(chiave) && togliDa(locale, chiave);
  }

  // Cambia il valore di una chiave della tabella e lo salva. fn riceve una copia del valore e lo
  // modifica (e restituisce niente o true), oppure ne restituisce uno nuovo, anche null per toglierlo,
  // e con false non cambia niente. Si parte da quello che
  // c'è sulla memoria, salvo quando la memoria non tiene: allora si parte da inPagina, quello che l'app
  // ha già in pagina, così con la memoria piena o assente le risposte della stessa apertura non si
  // perdono una dopo l'altra (6.6). Restituisce { valore, salvato }.
  function cambia(chiave, fn, inPagina = undefined) {
    const voce = PER_CHIAVE.get(chiave);
    if (!voce) return { valore: inPagina === undefined ? null : inPagina, salvato: false };
    let partenza;
    if (!tieneLaMemoria && inPagina !== undefined) {
      try { partenza = inPagina === null ? vuoto(voce.forma) : JSON.parse(JSON.stringify(inPagina)); } catch { partenza = leggi(chiave); }
    } else partenza = leggi(chiave);
    const risultato = fn(partenza);
    if (risultato === false) return { valore: partenza, salvato: tieneLaMemoria };
    const valore = risultato === undefined || risultato === true ? partenza : risultato;
    const salvato = scrivi(chiave, valore);
    tieneLaMemoria = salvato;
    return { valore, salvato };
  }

  // Se la memoria tiene, cioè se l'ultima scrittura con cambia è riuscita.
  function tiene() {
    return tieneLaMemoria;
  }

  // All'avvio. Sposta in .guasto le chiavi con una versione sconosciuta e quelle rotte, poi porta
  // sfida e data della pagina Obiettivo di prima in un obiettivo libero. Restituisce
  // { guaste, obiettivo }, le chiavi spostate e true se ha creato l'obiettivo.
  function migra() {
    const guaste = [];
    for (const k of chiaviDi(locale)) {
      const nome = NOME.exec(k);
      if (!nome || !proprio(VOCI, nome[1]) || VOCI[nome[1]].chiave === k) continue;
      const contenuto = testo(locale, k);
      if (contenuto !== null && spostaInGuasto(k, contenuto)) guaste.push(k);
    }
    for (const voce of PER_CHIAVE.values()) {
      const contenuto = testo(locale, voce.chiave);
      if (contenuto !== null && interpreta(voce.forma, contenuto) === undefined && spostaInGuasto(voce.chiave, contenuto)) {
        guaste.push(voce.chiave);
      }
    }
    return { guaste, obiettivo: migraPreferenze() };
  }

  // Le preferenze di oggi con sfida e dataEvento diventano un obiettivo libero con la stessa data.
  // Un obiettivo già scelto resta com'è. Le preferenze perdono sfida e dataEvento solo quando
  // l'obiettivo c'è davvero, così con la memoria piena non si perde la scelta.
  function migraPreferenze() {
    const preferenze = salvato(VOCI.preferenze);
    if (!preferenze || (!proprio(preferenze, "sfida") && !proprio(preferenze, "dataEvento"))) return false;
    let creato = false;
    if (salvato(VOCI.obiettivo) === null) {
      creato = scrivi(CHIAVI.obiettivo, obiettivoDaSfida(preferenze.sfida, preferenze.dataEvento));
      if (!creato) return false;
    }
    const resto = senzaAgg(preferenze);
    delete resto.sfida;
    delete resto.dataEvento;
    scrivi(CHIAVI.preferenze, resto);
    return creato;
  }

  // All'avvio, con la data di oggi. Toglie le voci delle mappe oltre i 400 giorni, obiettivo, piano e
  // invito 3 mesi dopo l'ultimo giorno del loro evento, il piano anche insieme al suo obiettivo, e
  // l'invito già entrato nell'obiettivo. Restituisce { voci, chiavi }, quante voci e quali chiavi
  // intere ha tolto.
  function pulisci(oggi) {
    const esito = { voci: 0, chiavi: [] };
    if (!dataValida(oggi)) return esito;
    const limite = aggiungiGiorni(oggi, -MEMORIA.giorni);
    for (const voce of PER_CHIAVE.values()) {
      if (voce.forma !== "mappa") continue;
      const mappa = salvato(voce);
      if (!mappa) continue;
      const tenute = {};
      let tolte = 0;
      for (const [id, v] of Object.entries(mappa)) {
        const giorno = giornoVoce(id, v);
        if (giorno !== null && giorno < limite) tolte += 1;
        else if (id !== "__proto__") tenute[id] = v;
      }
      if (tolte > 0 && scriviTesto(voce.chiave, JSON.stringify(tenute))) esito.voci += tolte;
    }
    const obiettivo = salvato(VOCI.obiettivo);
    const obiettivoFinito = obiettivo !== null && finito(obiettivo, oggi);
    for (const voce of [VOCI.obiettivo, VOCI.piano, VOCI.invito]) {
      const valore = voce === VOCI.obiettivo ? obiettivo : salvato(voce);
      if (!valore) continue;
      const via = finito(valore, oggi) ||
        (voce === VOCI.piano && obiettivoFinito) ||   // il piano nasce dall'obiettivo (3.12), anche senza una data sua
        (voce === VOCI.invito && obiettivo !== null && entrato(valore, obiettivo));
      if (via && togliDa(locale, voce.chiave)) esito.chiavi.push(voce.chiave);
    }
    pulisciGuasti(oggi, esito);
    return esito;
  }

  // Le chiavi .guasto servono a chi vuole capire cosa è successo, non all'app. Restano
  // MEMORIA.guastoGiorni giorni dal primo avvio che le trova, poi si tolgono. Il giorno sta in
  // comesto.guasti, così il contenuto della chiave guasta resta com'era.
  function pulisciGuasti(oggi, esito) {
    let giorni = {};
    try {
      const letto = JSON.parse(testo(locale, GUASTI) || "{}");
      if (oggetto(letto)) giorni = letto;
    } catch { /* un elenco rotto si rifà */ }
    const guaste = chiaviDi(locale).filter((k) => k.startsWith(PREFISSO) && k.endsWith(GUASTO));
    const tenuti = {};
    const limite = aggiungiGiorni(oggi, -MEMORIA.guastoGiorni);
    for (const k of guaste) {
      const dal = dataValida(giorni[k]) && giorni[k] <= oggi ? giorni[k] : oggi;
      if (dal <= limite) {
        if (togliDa(locale, k)) esito.chiavi.push(k);
        else tenuti[k] = dal;
      } else {
        tenuti[k] = dal;
      }
    }
    if (Object.keys(tenuti).length) scriviTesto(GUASTI, JSON.stringify(tenuti));
    else if (testo(locale, GUASTI) !== null) togliDa(locale, GUASTI);
  }

  // L'oggetto del file come-sto-dati-AAAA-MM-GG.json (nomeCopia), con il numero di formato e tutte
  // le chiavi della tabella tranne consenso, cache e coda, con i loro agg. Le credenziali non ci
  // sono mai, e una chiave che per errore contenesse la chiave o l'accesso resta fuori.
  function copia(oggi) {
    const valori = credenziali();
    const chiavi = {};
    for (const voce of PER_CHIAVE.values()) {
      if (!voce.copia) continue;
      const valore = salvato(voce);
      if (valore !== null && !conCredenziali(JSON.stringify(valore), valori)) chiavi[voce.chiave] = valore;
    }
    const t = ora();
    return {
      formato: MEMORIA.formatoCopia,
      app: "come-sto",
      giorno: dataValida(oggi) ? oggi : giornoDi(t),
      creato: new Date(t).toISOString(),
      chiavi,
    };
  }

  // Riprende da una copia. file è il testo del file, oppure l'oggetto già letto. Controlla il
  // formato, dice cosa aggiunge e cosa sostituisce e unisce le voci, lasciando la più recente.
  // Con { anteprima: true } non scrive niente, così l'app può chiedere conferma prima.
  // Restituisce { ok, motivo, giorno, voci, ignorate, nonScritte }. voci elenca le chiavi che
  // cambiano con { chiave, nuove, sostituite }. ignorate sono le chiavi del file che non si prendono
  // mai (credenziali, consenso, cache, coda, nomi o versioni sconosciuti, forme sbagliate).
  // motivo è null, oppure "grande", "illeggibile", "estranea", "nuova" (fatta da una versione più
  // nuova di Come sto) o "memoria" (il telefono non ha tenuto tutto, e nonScritte dice cosa).
  function riprendi(file, { anteprima = false } = {}) {
    const esito = { ok: false, motivo: null, giorno: null, voci: [], ignorate: [], nonScritte: [] };
    let dati = file;
    if (typeof file === "string") {
      if (file.length > MEMORIA.copiaMassima) return { ...esito, motivo: "grande" };
      try { dati = JSON.parse(file); } catch { return { ...esito, motivo: "illeggibile" }; }
    }
    if (!oggetto(dati) || dati.app !== "come-sto" || !oggetto(dati.chiavi)) return { ...esito, motivo: "estranea" };
    if (dati.formato !== MEMORIA.formatoCopia) {
      return { ...esito, motivo: Number.isInteger(dati.formato) && dati.formato > MEMORIA.formatoCopia ? "nuova" : "estranea" };
    }
    esito.giorno = dataValida(dati.giorno) ? dati.giorno : null;
    const valori = credenziali();
    const daScrivere = [];
    for (const [chiave, valore] of Object.entries(dati.chiavi)) {
      const voce = PER_CHIAVE.get(chiave);
      if (!voce || !voce.copia || !formaGiusta(voce.forma, valore) || conCredenziali(JSON.stringify(valore), valori)) {
        esito.ignorate.push(chiave);
        continue;
      }
      const { valore: unito, nuove, sostituite } = unisci(voce, salvato(voce, !anteprima), valore);
      if (nuove + sostituite === 0) continue;
      esito.voci.push({ chiave, nuove, sostituite });
      daScrivere.push([chiave, unito]);
    }
    if (!anteprima) {
      for (const [chiave, unito] of daScrivere) {
        if (!scriviTesto(chiave, JSON.stringify(unito))) esito.nonScritte.push(chiave);
      }
    }
    esito.ok = esito.nonScritte.length === 0;
    if (!esito.ok) esito.motivo = "memoria";
    return esito;
  }

  // «Esci e cancella tutto da questo dispositivo». Toglie tutte le chiavi comesto., credenziali
  // comprese, da localStorage e da sessionStorage, e restituisce quelle che ha tolto. Il permesso
  // su intervals.icu lo toglie l'app, come fa con Esci.
  function esciCancellaTutto() {
    const tolte = [];
    for (const m of [locale, sessione]) {
      for (const k of chiaviDi(m)) {
        if (!k.startsWith(PREFISSO)) continue;
        if (togliDa(m, k) && testo(m, k) === null && !tolte.includes(k)) tolte.push(k);
      }
    }
    // Dopo il «cancella tutto» non c'è più niente da tenere in pagina.
    tieneLaMemoria = true;
    return tolte;
  }

  // «Esci» (6.6). Toglie il consenso, la copia dei dati presi da intervals.icu e le scritture ancora da
  // mandare. Restano le risposte, le scelte e l'impronta dell'atleta, così chi entra dopo con un altro
  // account se ne accorge. Il modo di entrare lo toglie js/credenziali.js. Restituisce le chiavi tolte.
  function esci() {
    const tolte = [];
    for (const voce of [VOCI.consenso, VOCI.cache, VOCI.coda]) {
      if (testo(locale, voce.chiave) !== null && togliDa(locale, voce.chiave)) tolte.push(voce.chiave);
    }
    return tolte;
  }

  // Toglie i dati di Come sto da questo telefono, ma non il modo di entrare e il consenso appena dato.
  // Serve quando entra un account diverso da quello dei dati e la persona sceglie di cancellare quelli
  // dell'altro (R21). Restituisce le chiavi tolte.
  function cancellaDati() {
    const tolte = [];
    for (const voce of PER_CHIAVE.values()) {
      if (voce === VOCI.consenso) continue;
      if (testo(locale, voce.chiave) !== null && togliDa(locale, voce.chiave)) tolte.push(voce.chiave);
    }
    for (const k of chiaviDi(locale)) {
      if (k.startsWith(PREFISSO) && (k.endsWith(GUASTO) || k === GUASTI) && togliDa(locale, k)) tolte.push(k);
    }
    tieneLaMemoria = true;
    return tolte;
  }

  return Object.freeze({ leggi, scrivi, togli, migra, pulisci, copia, riprendi, esci, esciCancellaTutto, cancellaDati, cambia, tiene });
}
