// L'account di Come sto e il salvataggio online, per chi entra con la sua email. Si entra con un codice
// che arriva per email, senza password. Quello che segue la persona su ogni telefono sono tre cose,
// IN_NUVOLA, e di ognuna solo i campi di CAMPI. Tutto il resto, cioè numeri di salute, semaforo, sintomi,
// risposte, sforzo, sedute di palestra e la chiave di intervals.icu, da qui non passa mai. Il database lo
// rifiuta anche da solo (supabase/migrations).
//
// Niente DOM e niente window. Memoria, fetch e orologio arrivano da fuori con creaNuvola, così le prove
// usano quelli finti (test/nuvola.test.mjs).
//
// Le regole.
// - Il telefono viene prima. L'app funziona anche se il database non risponde, e riprova dopo.
// - Una cosa che manca sul telefono non vuol dire che è stata cancellata. Può essere un guasto della
//   memoria, quindi si riprende da online e non si toglie mai niente online. L'unica eccezione è
//   l'avventura finita da 3 mesi, che si cancella come promette la Privacy.
// - Per ogni chiave si tiene l'ultimo stato su cui telefono e database erano d'accordo (visti). Se è
//   cambiato uno solo dei due, vale quello. Se sono cambiati tutti e due, vale la scelta più recente.
// - La prima volta che un account incontra un telefono che ha già delle scelte non si tocca niente, e si
//   chiede alla persona se sono sue e quali tenere (chiedi nell'esito).
// - I telefoni non si mescolano. Il telefono si lega all'account appena si entra. Se poi entra un'email
//   diversa non si legge e non si scrive niente, finché la persona non sceglie (fermo nell'esito).

import { CHIAVI, eventoFinito } from "./memoria.js?v=202611061254";

export const SESSIONE = "comesto.sessione";
export const STATO = "comesto.nuvola";

export const CAMPI_PROFILO = Object.freeze(["bici", "borseKg", "borseTipo", "ebike", "oreEbike", "palestra", "altriSport", "esperienza"]);
export const CAMPI = Object.freeze({
  [CHIAVI.obiettivo]: Object.freeze(["tipo", "percorso", "giorni", "partenza", "iscritto", "libero", "km", "metri", "fondo", "conBorse", "misura", "ore", "daSfida"]),
  [CHIAVI.disponibilita]: Object.freeze(["giorni", "stella", "ore", "tetti", "dueCose"]),
  [CHIAVI.profilo]: CAMPI_PROFILO,
});
export const IN_NUVOLA = Object.freeze(Object.keys(CAMPI));

const SCADENZA_ANTICIPO = 60000;   // si rinnova l'accesso un minuto prima che scada
const ATTESA_MASSIMA = 15000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODICE = /^\d{6,10}$/;
const NOME_BLOCCO = "comesto.nuvola";
const TESTO_VUOTO = "{}";

const oggetto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const vuoto = (testo) => testo === null || testo === TESTO_VUOTO;

// tipo è «rete», «servizio», «email», «posta», «limite», «codice», «sessione» o «uscito».
export class ErroreNuvola extends Error {
  constructor(tipo, dettaglio = "") {
    super(dettaglio || tipo);
    this.name = "ErroreNuvola";
    this.tipo = tipo;
  }
}

// Quello di una chiave che può uscire dal telefono, solo i campi di CAMPI. null se la chiave non è fra
// quelle che escono o se non c'è.
export function versoNuvola(chiave, valore) {
  if (!IN_NUVOLA.includes(chiave) || !oggetto(valore)) return null;
  const dati = {};
  for (const k of CAMPI[chiave]) if (valore[k] !== undefined && valore[k] !== null) dati[k] = valore[k];
  return dati;
}

// Lo stesso oggetto dà sempre lo stesso testo, anche con i campi in un altro ordine.
function ordinato(v) {
  if (Array.isArray(v)) return v.map(ordinato);
  if (!oggetto(v)) return v;
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordinato(v[k])]));
}
export function canonico(v) {
  return v === null || v === undefined ? null : JSON.stringify(ordinato(v));
}

// Cosa fare per una chiave di un telefono già legato all'account. qui e la sono i testi del telefono e del
// database, o null, visto l'ultimo stato su cui erano d'accordo, o undefined. Mai una cancellazione.
export function decidi({ qui, la, visto, tempoQui = 0, tempoLa = 0 }) {
  if (qui === la) return qui === null ? "niente" : "uguali";
  if (vuoto(qui) && vuoto(la)) return "niente";
  if (qui === null) return "prendi";
  if (la === null) return "invia";
  if (visto !== undefined) {
    if (la === visto) return "invia";
    if (qui === visto) return "prendi";
  } else {
    if (vuoto(qui)) return "prendi";
    if (vuoto(la)) return "invia";
  }
  return tempoQui > tempoLa ? "invia" : "prendi";
}

// Lo stesso alla prima volta di un account su un telefono, quando la persona ha già risposto. scelta è
// «telefono» oppure «online», e conta solo se tutti e due hanno qualcosa e sono diversi.
export function decidiPrimaVolta({ qui, la, scelta }) {
  if (qui === la) return qui === null ? "niente" : "uguali";
  if (vuoto(qui) && vuoto(la)) return "niente";
  if (vuoto(qui)) return "prendi";
  if (vuoto(la)) return "invia";
  return scelta === "telefono" ? "invia" : "prendi";
}

function classifica(status, dati, contesto) {
  const codice = String((dati && (dati.error_code || dati.code || dati.error)) || "").toLowerCase();
  const testo = String((dati && (dati.msg || dati.message || dati.error_description)) || "").toLowerCase();
  if (status === 429 || /rate_limit/.test(codice)) return "limite";
  if (contesto === "otp" && (/not_authorized|not authorized/.test(`${codice} ${testo}`) || /error sending/.test(testo) || status >= 500)) return "posta";
  if (contesto === "otp" && /email/.test(`${codice} ${testo}`) && status < 500) return "email";
  if (contesto === "verifica" && status >= 400 && status < 500) return "codice";
  if (contesto === "rinnovo" && status >= 400 && status < 500) return "sessione";
  if (status === 401) return "sessione";
  return "servizio";
}

const pulisciEmail = (email) => String(email || "").trim().toLowerCase();

export function creaNuvola({ url, chiave, memoria, locale, richiesta = null, adesso = () => Date.now(), blocchi = null }) {
  const base = String(url).replace(/\/+$/, "");
  let inCorso = null;
  let ancora = false;
  let sceltaDopo = null;

  // --- la memoria del browser, sempre dentro try e catch ---

  function leggiJson(nome) {
    try {
      const testo = locale ? locale.getItem(nome) : null;
      const v = testo ? JSON.parse(testo) : null;
      return oggetto(v) ? v : null;
    } catch {
      return null;
    }
  }
  function scriviJson(nome, valore) {
    try { if (locale) locale.setItem(nome, JSON.stringify(valore)); } catch { /* memoria non disponibile */ }
  }
  function togli(nome) {
    try { if (locale) locale.removeItem(nome); } catch { /* niente da togliere */ }
  }

  function leggiSessione() {
    const s = leggiJson(SESSIONE);
    if (!s || typeof s.accesso !== "string" || typeof s.rinnovo !== "string" || !oggetto(s.utente) || typeof s.utente.id !== "string") return null;
    return s;
  }

  function salvaSessione(d) {
    if (!oggetto(d) || !d.access_token || !d.refresh_token || !oggetto(d.user) || !d.user.id) throw new ErroreNuvola("servizio", "risposta senza sessione");
    const scade = Number.isFinite(d.expires_at) ? d.expires_at * 1000 : adesso() + (Number.isFinite(d.expires_in) ? d.expires_in : 3600) * 1000;
    const s = { accesso: d.access_token, rinnovo: d.refresh_token, scade, utente: { id: d.user.id, email: pulisciEmail(d.user.email) } };
    scriviJson(SESSIONE, s);
    return s;
  }

  // A quale account è legato il telefono. daScegliere vuol dire che la persona non ha ancora detto se le
  // scelte che stanno qui sono sue.
  function leggiStato() {
    const s = leggiJson(STATO);
    return {
      utente: s && typeof s.utente === "string" ? s.utente : null,
      email: s && typeof s.email === "string" ? s.email : "",
      visti: s && oggetto(s.visti) ? s.visti : {},
      daScegliere: Boolean(s && s.daScegliere),
    };
  }

  // --- le chiamate ---

  async function chiama(percorso, { metodo = "GET", corpo, token = null, prefer = null, contesto = "dati" } = {}) {
    const headers = { apikey: chiave, Accept: "application/json" };
    if (corpo !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    if (prefer) headers.Prefer = prefer;
    const opzioni = { method: metodo, headers, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" };
    if (corpo !== undefined) opzioni.body = JSON.stringify(corpo);
    if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) opzioni.signal = AbortSignal.timeout(ATTESA_MASSIMA);
    let r;
    let testo = "";
    try {
      r = await (richiesta || globalThis.fetch)(`${base}${percorso}`, opzioni);
      testo = await r.text();
    } catch {
      throw new ErroreNuvola("rete");
    }
    let dati = null;
    try { dati = testo ? JSON.parse(testo) : null; } catch { /* una risposta senza JSON */ }
    if (!r.ok) throw new ErroreNuvola(classifica(r.status, dati, contesto), `${r.status}`);
    return dati;
  }

  // Una scheda alla volta, se il browser lo sa fare. Il rinnovo dell'accesso vale una volta sola, e due
  // schede che lo chiedono insieme farebbero uscire la persona.
  function inFila(fn) {
    return blocchi && blocchi.request ? blocchi.request(NOME_BLOCCO, fn) : fn();
  }

  async function rinnova(usato) {
    return inFila(async () => {
      const s = leggiSessione();
      if (!s) throw new ErroreNuvola("uscito");
      if (s.accesso !== usato && s.scade - SCADENZA_ANTICIPO > adesso()) return s.accesso;   // l'ha già fatto un'altra scheda
      let d;
      try {
        d = await chiama("/auth/v1/token?grant_type=refresh_token", { metodo: "POST", corpo: { refresh_token: s.rinnovo }, contesto: "rinnovo" });
      } catch (e) {
        const ora = leggiSessione();
        if (e.tipo === "sessione" && ora && ora.rinnovo === s.rinnovo) togli(SESSIONE);
        throw e;
      }
      // Se mentre si rinnovava la persona è uscita, l'accesso nuovo non si salva. Non deve tornare dentro.
      const ora = leggiSessione();
      if (!ora) throw new ErroreNuvola("uscito");
      if (ora.rinnovo !== s.rinnovo) return ora.accesso;
      return salvaSessione(d).accesso;
    });
  }

  async function accessoValido() {
    const s = leggiSessione();
    if (!s) throw new ErroreNuvola("uscito");
    return s.scade - SCADENZA_ANTICIPO > adesso() ? s.accesso : rinnova(s.accesso);
  }

  // Una chiamata con l'accesso. Se il database dice che non vale, per esempio con l'orologio del telefono
  // indietro, si rinnova e si riprova una volta.
  async function conAccesso(fn) {
    const token = await accessoValido();
    try {
      return await fn(token);
    } catch (e) {
      if (!(e instanceof ErroreNuvola) || e.tipo !== "sessione") throw e;
      return fn(await rinnova(token));
    }
  }

  // --- il salvataggio ---

  const tempoDi = (grezzo) => (oggetto(grezzo) && Number.isFinite(grezzo.agg) ? grezzo.agg : 0);
  // L'ora della scelta sul telefono che l'ha fatta, non quella in cui è arrivata al database.
  const tempoDellaRiga = (riga) => (riga && Number.isFinite(riga.scelto) ? riga.scelto : riga ? Date.parse(riga.agg) || 0 : 0);

  // Un campo che non esce dal telefono resta com'è quando si riprende da online.
  function sulTelefono(k, valore) {
    const prima = memoria.leggi(k);
    const resto = {};
    if (oggetto(prima)) for (const [c, v] of Object.entries(prima)) if (!CAMPI[k].includes(c)) resto[c] = v;
    const nuovo = { ...resto, ...(valore || {}) };
    return Object.keys(nuovo).length ? nuovo : null;
  }

  async function unGiro(oggi, scelta) {
    const esito = { fermo: false, chiedi: null, prima: false, ripreso: [], inviati: [], tolti: [] };
    const sessione = leggiSessione();
    if (!sessione) return esito;
    const { id, email } = sessione.utente;
    let stato = leggiStato();
    if (!stato.utente) {
      stato = { utente: id, email, visti: {}, daScegliere: true };
      scriviJson(STATO, stato);
    }
    if (stato.utente !== id) return { ...esito, fermo: true };
    // Dopo ogni attesa si guarda se la persona è ancora dentro. Se è uscita non si scrive più niente.
    const dentro = () => {
      const s = leggiSessione();
      return Boolean(s && s.utente.id === id);
    };

    const righe = await conAccesso((token) => chiama("/rest/v1/dati?select=chiave,valore,agg,scelto", { token }));
    if (!Array.isArray(righe)) throw new ErroreNuvola("servizio", "risposta senza righe");
    if (!dentro()) return esito;
    const remote = new Map(righe.filter((r) => oggetto(r) && IN_NUVOLA.includes(r.chiave)).map((r) => [r.chiave, r]));
    const copia = memoria.copia(oggi).chiavi;
    const voci = IN_NUVOLA.map((k) => {
      const grezzo = copia[k] || null;
      const nostro = versoNuvola(k, grezzo);
      const riga = remote.get(k) || null;
      const suo = riga ? versoNuvola(k, riga.valore) : null;
      return { k, grezzo, nostro, riga, suo, qui: canonico(nostro), la: canonico(suo) };
    });

    const primaVolta = stato.daScegliere;
    if (primaVolta && !scelta && voci.some((v) => !vuoto(v.qui) && v.qui !== v.la)) {
      return { ...esito, chiedi: { online: voci.some((v) => !vuoto(v.qui) && !vuoto(v.la) && v.qui !== v.la) } };
    }
    esito.prima = primaVolta;

    const visti = { ...stato.visti };
    for (const v of voci) {
      if (!dentro()) return esito;
      const { k, grezzo, nostro, riga, suo, qui, la } = v;
      let azione = primaVolta
        ? decidiPrimaVolta({ qui, la, scelta })
        : decidi({ qui, la, visto: visti[k], tempoQui: tempoDi(grezzo), tempoLa: tempoDellaRiga(riga) });
      // L'avventura finita da 3 mesi non torna sul telefono e si toglie anche online (Privacy).
      if (k === CHIAVI.obiettivo && suo && qui === null && eventoFinito(suo, oggi)) azione = "togliLa";
      if (azione === "invia") {
        await conAccesso((token) => chiama("/rest/v1/dati?on_conflict=utente,chiave", {
          metodo: "POST", token, corpo: { utente: id, chiave: k, valore: nostro, scelto: tempoDi(grezzo) || adesso() }, prefer: "resolution=merge-duplicates,return=minimal",
        }));
        visti[k] = qui;
        esito.inviati.push(k);
      } else if (azione === "togliLa") {
        await conAccesso((token) => chiama(`/rest/v1/dati?utente=eq.${encodeURIComponent(id)}&chiave=eq.${encodeURIComponent(k)}`, { metodo: "DELETE", token, prefer: "return=minimal" }));
        delete visti[k];
        esito.tolti.push(k);
      } else if (azione === "prendi") {
        if (!memoria.scrivi(k, sulTelefono(k, suo))) continue;
        visti[k] = la;
        esito.ripreso.push(k);
      } else if (azione === "uguali") {
        visti[k] = qui;
      }
    }
    if (!dentro()) return esito;
    scriviJson(STATO, { utente: id, email, visti, daScegliere: false });
    return esito;
  }

  // Salva e riprende. Un giro alla volta, e se nel frattempo è cambiato qualcosa si riparte. Restituisce
  // { fermo, chiedi, prima, ripreso, inviati, tolti }. Con fermo vero il telefono è legato a un altro
  // account. Con chiedi { online } è la prima volta di questo account su un telefono che ha già delle
  // scelte, e si riparte con { scelta: "telefono" } oppure { scelta: "online" } quando la persona risponde.
  // online dice se anche nel database ci sono scelte diverse da queste. prima vuol dire che su questo
  // telefono è il primo giro con questo account.
  function sincronizza(oggi, { scelta = null } = {}) {
    if (inCorso) {
      ancora = true;
      if (scelta) sceltaDopo = scelta;
      return inCorso;
    }
    inCorso = (async () => {
      try {
        const esito = await unGiro(oggi, scelta);
        while (ancora) {
          ancora = false;
          const dopo = await unGiro(oggi, sceltaDopo);
          sceltaDopo = null;
          esito.fermo = dopo.fermo;
          esito.chiedi = dopo.chiedi;
          for (const k of ["ripreso", "inviati", "tolti"]) esito[k].push(...dopo[k]);
        }
        return esito;
      } finally {
        inCorso = null;
        ancora = false;
        sceltaDopo = null;
      }
    })();
    return inCorso;
  }

  // --- l'ingresso e l'uscita ---

  async function chiediCodice(email) {
    const pulita = pulisciEmail(email);
    if (!EMAIL.test(pulita)) throw new ErroreNuvola("email");
    await chiama("/auth/v1/otp", { metodo: "POST", corpo: { email: pulita, create_user: true }, contesto: "otp" });
    return pulita;
  }

  // Restituisce { utente, altroAccount }. Il telefono si lega all'account subito, non alla fine del primo
  // giro, così chi entra dopo con un'altra email se ne accorge anche se la rete è mancata. Con altroAccount
  // vero il telefono è di un'altra email, e finché la persona non sceglie (accettaTelefono o esci) non si
  // salva niente. La stessa email con un numero nuovo è l'account rifatto dopo una cancellazione.
  async function verificaCodice(email, codice) {
    const pulito = String(codice || "").replace(/\s+/g, "");
    if (!CODICE.test(pulito)) throw new ErroreNuvola("codice");
    const d = await chiama("/auth/v1/verify", { metodo: "POST", corpo: { type: "email", email: pulisciEmail(email), token: pulito }, contesto: "verifica" });
    const s = salvaSessione(d);
    const legato = leggiStato();
    if (legato.utente && legato.utente !== s.utente.id && legato.email !== s.utente.email) return { utente: s.utente, altroAccount: true };
    if (legato.utente !== s.utente.id) {
      scriviJson(STATO, { utente: s.utente.id, email: s.utente.email, visti: {}, daScegliere: !legato.utente });
    }
    return { utente: s.utente, altroAccount: false };
  }

  // Il telefono passa all'account entrato adesso, dopo che i dati di prima sono stati tolti.
  function accettaTelefono() {
    const s = leggiSessione();
    if (s) scriviJson(STATO, { utente: s.utente.id, email: s.utente.email, visti: {}, daScegliere: false });
    else togli(STATO);
  }

  // Esce da questo telefono. Quello che è salvato online resta, e il telefono resta legato all'account,
  // così chi entra dopo con un'altra email se ne accorge.
  async function esci() {
    const s = leggiSessione();
    togli(SESSIONE);
    if (!s) return;
    try {
      await chiama("/auth/v1/logout?scope=local", { metodo: "POST", token: s.accesso });
    } catch { /* l'accesso scade comunque da solo */ }
  }

  // Esce e slega il telefono dall'account.
  async function dimentica() {
    const fine = esci();
    togli(STATO);
    await fine;
  }

  // «Cancella il mio account». Il database toglie l'utente e tutte le sue righe. I dati del telefono
  // restano, e il telefono non è più legato a nessuno.
  async function cancellaAccount() {
    await conAccesso((token) => chiama("/rest/v1/rpc/cancella_account", { metodo: "POST", token, corpo: {}, prefer: "return=minimal" }));
    togli(SESSIONE);
    togli(STATO);
  }

  const utente = () => {
    const s = leggiSessione();
    return s ? s.utente : null;
  };

  return Object.freeze({ utente, chiediCodice, verificaCodice, sincronizza, accettaTelefono, esci, dimentica, cancellaAccount });
}
