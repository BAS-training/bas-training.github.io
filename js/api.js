// Il collegamento con intervals.icu. La pagina chiama direttamente le API pubbliche
// di intervals.icu dal browser di chi la usa: nessun server in mezzo.
// "0" al posto del numero dell'atleta vuol dire "il proprietario della chiave".

const BASE = "https://intervals.icu";

export class ErroreApi extends Error {
  constructor(tipo, messaggio, stato) {
    super(messaggio);
    this.tipo = tipo;
    this.messaggio = messaggio;
    this.stato = stato;
  }
}

export function creaClient({ chiave = null, ponte = false } = {}) {
  // In sviluppo (solo su localhost) la chiave la aggiunge il server locale: vedi dev/server.py.
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
      });
    } catch {
      throw new ErroreApi("rete", "Non riesco a raggiungere intervals.icu. Controlla la connessione e riprova.");
    }
    if (risposta.status === 401 || risposta.status === 403) {
      throw new ErroreApi("chiave", "La chiave non funziona. Forse è stata cambiata su intervals.icu, oppure non è stata copiata tutta.", risposta.status);
    }
    if (risposta.status === 429) {
      throw new ErroreApi("troppe", "intervals.icu chiede di rallentare. Riprova fra un minuto.", 429);
    }
    if (!risposta.ok) {
      throw new ErroreApi("server", `intervals.icu ha risposto con un errore (${risposta.status}). Riprova fra poco.`, risposta.status);
    }
    if (risposta.status === 204) return null;
    const testo = await risposta.text();
    if (!testo) return null;
    try {
      return JSON.parse(testo);
    } catch {
      throw new ErroreApi("server", "intervals.icu ha risposto in modo strano. Riprova fra poco.", risposta.status);
    }
  }

  const q = (data) => encodeURIComponent(data);
  return {
    atleta: () => chiama("/api/v1/athlete/0"),
    benessere: (dal, al) => chiama(`/api/v1/athlete/0/wellness?oldest=${q(dal)}&newest=${q(al)}`),
    uscite: (dal, al) => chiama(`/api/v1/athlete/0/activities?oldest=${q(dal)}&newest=${q(al)}`),
    salvaBenessere: (giorno, campi) => chiama(`/api/v1/athlete/0/wellness/${q(giorno)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campi),
    }),
  };
}
