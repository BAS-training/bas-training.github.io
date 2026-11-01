// Il collegamento con intervals.icu. La pagina chiama direttamente le API pubbliche
// di intervals.icu dal browser di chi la usa: nessun server in mezzo.
// "0" al posto del numero dell'atleta vuol dire "il proprietario della chiave",
// e con l'accesso di «Entra con intervals.icu» vuol dire "chi ha dato il permesso".

import { CHIAMATE, MEMORIA } from "./parametri.js?v=202610312043";

const BASE = "https://intervals.icu";
const ATTESA_MASSIMA = 20000; // millisecondi, poi si rinuncia e si avvisa

// Si chiedono solo i campi che servono: ogni mattina sul telefono sono 17 volte meno dati.
// avgSleepingHR è la FC media del sonno, che il semaforo preferisce al battito a riposo (4.3).
// device_watts dice se la potenza arriva da un misuratore e icu_rpe è lo sforzo segnato, per quanto
// fidarsi del carico (4.7). Sono campi delle attività, non permessi in più (6.7).
export const CAMPI_BENESSERE = "id,ctl,atl,atlLoad,ctlLoad,restingHR,avgSleepingHR,hrv,hrvSDNN,sleepSecs,sleepScore,injury,fatigue,soreness";
export const CAMPI_USCITE = "id,start_date_local,type,name,source,moving_time,distance,total_elevation_gain,icu_training_load,average_heartrate,device_watts,icu_rpe";

export class ErroreApi extends Error {
  // stato è il codice della risposta di intervals.icu, quando c'è, per sapere se riprovare una scrittura.
  constructor(tipo, messaggio, stato = null) {
    super(messaggio);
    this.tipo = tipo;
    this.messaggio = messaggio;
    this.stato = stato;
  }
}

// I campi nuovi delle attività (6.7), letti insieme a CAMPI_USCITE, che ha già icu_rpe e device_watts.
// La descrizione serve solo per la riga [come-sto v1] delle attività di Come sto, e delle altre non
// si tiene (js/dati.js e la cache).
const CAMPI_USCITE_NUOVI = "has_heartrate,trainer,commute,elapsed_time,external_id,tags,description";
export const CAMPI_ATTIVITA = `${CAMPI_USCITE},${CAMPI_USCITE_NUOVI}`;

// Le chiavi di intervals.icu sono fatte di lettere e numeri, senza spazi.
export function chiaveValida(chiave) {
  return typeof chiave === "string" && /^[\x21-\x7e]{8,200}$/.test(chiave);
}

// L'accesso che dà intervals.icu dopo «Entra con intervals.icu». Finisce in un'intestazione,
// quindi niente spazi né caratteri di controllo.
export function tokenValido(token) {
  return typeof token === "string" && /^[\x21-\x7e]{8,512}$/.test(token);
}

export function scadenza() {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ATTESA_MASSIMA)
    : undefined;
}

// Tre modi di entrare. { chiave } è la chiave API incollata, { token } è l'accesso avuto con
// «Entra con intervals.icu» (OAuth), { ponte } è il server di sviluppo su localhost.
export function creaClient({ chiave = null, token = null, ponte = false } = {}) {
  const conToken = !ponte && token !== null && token !== undefined;
  if (conToken && !tokenValido(token)) {
    throw new ErroreApi("chiave", "L'accesso salvato non è valido. Entra di nuovo con intervals.icu.");
  }
  // In sviluppo (solo su localhost) la chiave la aggiunge il server locale: vedi dev/server.py.
  if (!ponte && !conToken && !chiaveValida(chiave)) {
    throw new ErroreApi("chiave", "Questa non sembra una chiave di intervals.icu. È una fila lunga di lettere e numeri, senza spazi. Copiala di nuovo.");
  }
  const base = ponte ? "/intervals-ponte" : BASE;
  let intestazioni = {};
  if (conToken) intestazioni = { Authorization: "Bearer " + token };
  else if (!ponte) intestazioni = { Authorization: "Basic " + btoa("API_KEY:" + chiave) };

  async function chiama(percorso, opzioni = {}) {
    let risposta;
    try {
      risposta = await fetch(base + percorso, {
        ...opzioni,
        headers: { Accept: "application/json", ...intestazioni, ...(opzioni.headers || {}) },
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        signal: scadenza(),
      });
    } catch (e) {
      if (e && (e.name === "TimeoutError" || e.name === "AbortError")) {
        throw new ErroreApi("lento", "intervals.icu non risponde. Riprova fra poco.");
      }
      throw new ErroreApi("rete", "Non riesco a raggiungere intervals.icu. Controlla la connessione e riprova.");
    }
    // Il tipo "chiave" vuol dire che il modo di entrare non vale più, chiave o accesso che sia.
    if (risposta.status === 401) {
      throw new ErroreApi("chiave", conToken
        ? "L'accesso a intervals.icu è scaduto o è stato tolto. Entra di nuovo con intervals.icu."
        : "La chiave salvata non funziona più. Forse ne hai creata una nuova su intervals.icu.");
    }
    if (risposta.status === 403) {
      throw new ErroreApi("permesso", conToken
        ? "intervals.icu non lascia a Come sto vedere questi dati. Se su intervals.icu hai tolto qualche permesso, premi Esci in fondo alla pagina ed entra di nuovo con intervals.icu, lasciando accese tutte le voci."
        : "intervals.icu non lascia leggere questi dati in questo momento. Riprova più tardi.");
    }
    if (risposta.status === 429) {
      throw new ErroreApi("troppe", "intervals.icu chiede di rallentare. Riprova fra un minuto.");
    }
    if (!risposta.ok) {
      throw new ErroreApi("server", `intervals.icu ha risposto con un errore (${risposta.status}). Riprova fra poco.`, risposta.status);
    }
    const testo = await risposta.text();
    if (!testo) return null;
    try {
      return JSON.parse(testo);
    } catch {
      throw new ErroreApi("server", "intervals.icu ha risposto in modo strano. Riprova fra poco.");
    }
  }

  const q = encodeURIComponent;
  return {
    accesso: conToken ? "token" : ponte ? "ponte" : "chiave",
    // Toglie il permesso dato a Come sto anche su intervals.icu. Esiste solo per l'accesso con OAuth.
    revoca: conToken ? () => chiama("/api/v1/disconnect-app", { method: "DELETE" }) : null,
    atleta: () => chiama("/api/v1/athlete/0"),
    benessere: (dal, al) => chiama(`/api/v1/athlete/0/wellness?oldest=${q(dal)}&newest=${q(al)}&fields=${CAMPI_BENESSERE}`),
    uscite: (dal, al) => chiama(`/api/v1/athlete/0/activities?oldest=${q(dal)}&newest=${q(al)}&fields=${CAMPI_ATTIVITA}`),
    // Il PUT cambia solo i campi inviati (verificato sulla documentazione di intervals.icu).
    salvaBenessere: (giorno, campi) => chiama(`/api/v1/athlete/0/wellness/${q(giorno)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campi),
    }),
    // Le scritture sulle attività (6.6), che fa solo js/scritture.js. Il PUT cambia i campi inviati,
    // e le attività arrivate da Strava non si possono aggiornare.
    salvaAttivita: (id, campi) => chiama(`/api/v1/activity/${q(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campi),
    }),
    // Un'attività sola, per aggiungere una riga alla descrizione senza perdere quella che c'è.
    leggiAttivita: (id) => chiama(`/api/v1/activity/${q(id)}`),
    // Le attività a mano, sempre in una lista. L'aggiornamento per external_id vale solo per quelle
    // create dalla stessa applicazione OAuth, e per questo js/scritture.js cerca prima fra le lette.
    creaManuali: (lista) => chiama("/api/v1/athlete/0/activities/manual/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lista),
    }),
  };
}

// --- Le letture dei soli giorni nuovi (6.7) ---
// La cache (comesto.cache.v1, salvata da js/memoria.js) tiene benessere e attività già letti, con la
// data dell'ultima lettura. Le attività ci entrano senza nome e senza descrizione, salvo la
// descrizione delle attività di Come sto, e il profilo dell'atleta solo con nome, fuso e profili
// sportivi. Queste funzioni non toccano la memoria, ricevono la cache e ne restituiscono una nuova.

const GIORNO_MS = 86400000;
const CAMPI_ATTIVITA_CACHE = CAMPI_ATTIVITA.split(",").filter((c) => c !== "name" && c !== "description");
const CAMPI_BENESSERE_CACHE = CAMPI_BENESSERE.split(",");

function utc(iso) {
  const [a, m, g] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, g);
}

const piuGiorni = (iso, n) => new Date(utc(iso) + n * GIORNO_MS).toISOString().slice(0, 10);
const giornoValido = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const istante = (v) => typeof v === "number" && Number.isFinite(v);

function prendi(oggetto, campi) {
  const fuori = {};
  for (const c of campi) if (oggetto[c] !== null && oggetto[c] !== undefined) fuori[c] = oggetto[c];
  return fuori;
}

// Un'attività come resta nella cache. Il nome è testo libero e non si salva (6.7), e la descrizione
// resta solo per le attività di Come sto.
export function attivitaPerLaCache(a) {
  const fuori = prendi(a, CAMPI_ATTIVITA_CACHE);
  if (typeof a.external_id === "string" && a.external_id.startsWith("comesto-") && typeof a.description === "string") {
    fuori.description = a.description;
  }
  return fuori;
}

export function benesserePerLaCache(w) {
  return prendi(w, CAMPI_BENESSERE_CACHE);
}

// Il profilo dell'atleta ridotto a quello che usa l'app (6.1 e 6.7). Peso, data di nascita, sesso e
// gli altri campi del profilo non si tengono.
export function atletaPerLaCache(a) {
  if (!a || typeof a !== "object") return null;
  const nome = (typeof a.firstname === "string" && a.firstname.trim())
    || (typeof a.name === "string" && a.name.trim().split(/\s+/)[0])
    || "";
  const profili = Array.isArray(a.sportSettings) ? a.sportSettings : [];
  return {
    firstname: nome,
    timezone: typeof a.timezone === "string" ? a.timezone : null,
    sportSettings: profili.filter((s) => s && typeof s === "object").map((s) => ({
      types: Array.isArray(s.types) ? s.types.filter((t) => typeof t === "string") : [],
      ftp: typeof s.ftp === "number" ? s.ftp : null,
      lthr: typeof s.lthr === "number" ? s.lthr : null,
      max_hr: typeof s.max_hr === "number" ? s.max_hr : null,
    })),
  };
}

function cacheValida(c) {
  return Boolean(c && typeof c === "object" && Array.isArray(c.benessere) && Array.isArray(c.uscite) && istante(c.letto) && giornoValido(c.al));
}

// Quali letture servono a questa apertura (6.7). La prima volta 182 giorni di benessere e di
// attività, poi solo i giorni nuovi più 3 giorni di sovrapposizione. Nessuna lettura se l'ultima ha
// meno di 10 minuti, salvo «Aggiorna». Il profilo dell'atleta al primo ingresso e poi ogni 7 giorni.
// Restituisce { dal, al, atleta, prima }, con dal e al null quando benessere e attività non si leggono.
export function lettureDaFare(cache, oggi, { adesso = Date.now(), aggiorna = false } = {}) {
  const c = cacheValida(cache) ? cache : null;
  const al = piuGiorni(oggi, 1);   // fino a domani, come oggi in js/app.js, per chi ha il fuso avanti
  const atleta = !c || !c.atleta || !istante(c.atletaLetto) || !(adesso - c.atletaLetto < CHIAMATE.giorniAtleta * GIORNO_MS) || adesso < c.atletaLetto;
  if (c && !aggiorna && adesso >= c.letto && adesso - c.letto < CHIAMATE.minutiFraLetture * 60000) {
    return { dal: null, al: null, atleta: atleta && !c.atleta, prima: false };
  }
  const primo = piuGiorni(al, -CHIAMATE.primaLetturaGiorni);
  let dal = primo;
  if (c) {
    const daCache = piuGiorni(c.al < al ? c.al : al, -MEMORIA.cacheGiorniInPiu);
    if (daCache > primo) dal = daCache;
  }
  return { dal, al, atleta, prima: dal === primo };
}

// Mette insieme la cache e le letture nuove. Nel tratto riletto vince la lettura nuova, anche quando
// un'attività non c'è più. Fuori dai 182 giorni si toglie. lette è { dal, al, benessere, uscite, atleta }
// con le risposte di intervals.icu, chiamate quante chiamate sono state fatte. Restituisce
// { cache, benessere, uscite, atleta }, dove uscite tiene il nome delle attività appena lette, per
// mostrarlo, e la cache no.
export function unisciLetture(cache, lette, oggi, { adesso = Date.now(), chiamate = 0 } = {}) {
  const c = cacheValida(cache) ? cache : null;
  const limite = piuGiorni(piuGiorni(oggi, 1), -CHIAMATE.primaLetturaGiorni);
  const dal = lette && giornoValido(lette.dal) ? lette.dal : null;
  const al = lette && giornoValido(lette.al) ? lette.al : null;
  const riletto = (giorno) => dal !== null && al !== null && giorno >= dal && giorno <= al;
  const giornoAttivita = (a) => (a && typeof a.start_date_local === "string" ? a.start_date_local.slice(0, 10) : null);

  const benessereNuovo = (dal ? (Array.isArray(lette.benessere) ? lette.benessere : []) : [])
    .filter((w) => w && giornoValido(w.id)).map(benesserePerLaCache);
  const benessere = [...(c ? c.benessere.filter((w) => w && giornoValido(w.id) && !riletto(w.id)) : []), ...benessereNuovo]
    .filter((w) => w.id >= limite)
    .sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));

  const usciteNuove = (dal ? (Array.isArray(lette.uscite) ? lette.uscite : []) : []).filter((a) => a && giornoAttivita(a));
  const vecchie = c ? c.uscite.filter((a) => giornoAttivita(a) && !riletto(giornoAttivita(a))) : [];
  const perData = (x, y) => (x.start_date_local < y.start_date_local ? 1 : x.start_date_local > y.start_date_local ? -1 : 0);
  const uscite = [...vecchie, ...usciteNuove].filter((a) => giornoAttivita(a) >= limite).sort(perData);

  const atletaNuovo = lette && lette.atleta ? atletaPerLaCache(lette.atleta) : null;
  const conto = c && c.chiamate && c.chiamate.giorno === oggi && istante(c.chiamate.n) ? c.chiamate.n : 0;
  const nuova = {
    letto: dal ? adesso : c ? c.letto : adesso,
    al: al || (c ? c.al : piuGiorni(oggi, 1)),
    atleta: atletaNuovo || (c ? c.atleta || null : null),
    atletaLetto: atletaNuovo ? adesso : c && istante(c.atletaLetto) ? c.atletaLetto : null,
    benessere,
    uscite: uscite.map(attivitaPerLaCache),
    chiamate: { giorno: oggi, n: conto + chiamate },
  };
  return { cache: nuova, benessere, uscite, atleta: nuova.atleta };
}

// Una lettura dell'apertura, con al massimo due chiamate per benessere e attività, più il profilo
// dell'atleta quando tocca. atleta è quello già letto entrando, per non chiederlo due volte. Gli
// errori di intervals.icu arrivano come ErroreApi, come per le altre chiamate. Restituisce quello di
// unisciLetture, con letto vero se c'è stata una lettura e atletaIntero, il profilo così come è
// arrivato quando è stato letto (altrimenti null), che serve solo all'impronta dell'atleta e non si
// salva mai.
export async function leggiNuovi(client, cache, oggi, { adesso = Date.now(), aggiorna = false, atleta = null } = {}) {
  const piano = lettureDaFare(cache, oggi, { adesso, aggiorna });
  let chiamate = 0;
  const conta = (promessa) => { chiamate += 1; return promessa; };
  const [profilo, benessere, uscite] = await Promise.all([
    piano.atleta ? (atleta ? Promise.resolve(atleta) : conta(client.atleta())) : Promise.resolve(null),
    piano.dal ? conta(client.benessere(piano.dal, piano.al)) : Promise.resolve(null),
    piano.dal ? conta(client.uscite(piano.dal, piano.al)) : Promise.resolve(null),
  ]);
  const unite = unisciLetture(cache, { dal: piano.dal, al: piano.al, benessere, uscite, atleta: profilo }, oggi, { adesso, chiamate });
  return { ...unite, letto: Boolean(piano.dal), chiamate, atletaIntero: profilo && typeof profilo === "object" ? profilo : null };
}
