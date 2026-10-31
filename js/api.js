// Il collegamento con intervals.icu. La pagina chiama direttamente le API pubbliche
// di intervals.icu dal browser di chi la usa: nessun server in mezzo.
// "0" al posto del numero dell'atleta vuol dire "il proprietario della chiave".

const BASE = "https://intervals.icu";
const ATTESA_MASSIMA = 20000; // millisecondi, poi si rinuncia e si avvisa

// Si chiedono solo i campi che servono: ogni mattina sul telefono sono 17 volte meno dati.
const CAMPI_BENESSERE = "id,ctl,atl,atlLoad,ctlLoad,restingHR,hrv,hrvSDNN,sleepSecs,sleepScore,injury,fatigue,soreness";
const CAMPI_USCITE = "id,start_date_local,type,name,source,moving_time,distance,total_elevation_gain,icu_training_load,average_heartrate";

export class ErroreApi extends Error {
  constructor(tipo, messaggio) {
    super(messaggio);
    this.tipo = tipo;
    this.messaggio = messaggio;
  }
}

// Le chiavi di intervals.icu sono fatte di lettere e numeri, senza spazi.
export function chiaveValida(chiave) {
  return typeof chiave === "string" && /^[\x21-\x7e]{8,200}$/.test(chiave);
}

function scadenza() {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ATTESA_MASSIMA)
    : undefined;
}

export function creaClient({ chiave = null, ponte = false } = {}) {
  // In sviluppo (solo su localhost) la chiave la aggiunge il server locale: vedi dev/server.py.
  if (!ponte && !chiaveValida(chiave)) {
    throw new ErroreApi("chiave", "Questa non sembra una chiave di intervals.icu. È una fila lunga di lettere e numeri, senza spazi. Copiala di nuovo.");
  }
  const base = ponte ? "/intervals-ponte" : BASE;
  const intestazioni = ponte ? {} : { Authorization: "Basic " + btoa("API_KEY:" + chiave) };

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
    if (risposta.status === 401) {
      throw new ErroreApi("chiave", "La chiave salvata non funziona più. Forse ne hai creata una nuova su intervals.icu.");
    }
    if (risposta.status === 403) {
      throw new ErroreApi("permesso", "intervals.icu non lascia leggere questi dati in questo momento. Riprova più tardi.");
    }
    if (risposta.status === 429) {
      throw new ErroreApi("troppe", "intervals.icu chiede di rallentare. Riprova fra un minuto.");
    }
    if (!risposta.ok) {
      throw new ErroreApi("server", `intervals.icu ha risposto con un errore (${risposta.status}). Riprova fra poco.`);
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
    atleta: () => chiama("/api/v1/athlete/0"),
    benessere: (dal, al) => chiama(`/api/v1/athlete/0/wellness?oldest=${q(dal)}&newest=${q(al)}&fields=${CAMPI_BENESSERE}`),
    uscite: (dal, al) => chiama(`/api/v1/athlete/0/activities?oldest=${q(dal)}&newest=${q(al)}&fields=${CAMPI_USCITE}`),
    // Il PUT cambia solo i campi inviati (verificato sulla documentazione di intervals.icu).
    salvaBenessere: (giorno, campi) => chiama(`/api/v1/athlete/0/wellness/${q(giorno)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campi),
    }),
  };
}
