// L'account di Come sto e il salvataggio online, per chi entra con la sua email. Si entra con un codice
// che arriva per email, senza password. Quello che segue la persona su ogni telefono sono tre cose,
// IN_NUVOLA, e del profilo solo i campi di CAMPI_PROFILO. Tutto il resto, cioè numeri di salute, semaforo,
// sintomi, risposte, sforzo, palestra e la chiave di intervals.icu, da qui non passa mai. Il database lo
// rifiuta anche da solo (supabase/migrations).
//
// Niente DOM e niente window. Memoria, fetch e orologio arrivano da fuori con creaNuvola, così le prove
// usano quelli finti (test/nuvola.test.mjs).
//
// Le regole.
// - Il telefono viene prima. L'app funziona anche se il database non risponde, e riprova dopo.
// - Per ogni chiave si tiene l'ultimo stato su cui telefono e database erano d'accordo (visti). Se è
//   cambiato uno solo dei due, vale quello. Se sono cambiati tutti e due, vale il più recente.
// - I telefoni non si mescolano. Se entra un account diverso da quello legato al telefono non si legge
//   e non si scrive niente, finché la persona non sceglie.

import { CHIAVI } from "./memoria.js?v=202611022140";

export const SESSIONE = "comesto.sessione";
export const STATO = "comesto.nuvola";

export const IN_NUVOLA = Object.freeze([CHIAVI.obiettivo, CHIAVI.disponibilita, CHIAVI.profilo]);
export const CAMPI_PROFILO = Object.freeze(["bici", "borseKg", "borseTipo", "ebike", "oreEbike", "palestra", "altriSport", "esperienza"]);

const SCADENZA_ANTICIPO = 60000;   // si rinnova l'accesso un minuto prima che scada
const ATTESA_MASSIMA = 15000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODICE = /^\d{6,10}$/;
const NOME_BLOCCO = "comesto.nuvola";

const oggetto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// tipo è «rete», «servizio», «email», «posta», «limite», «codice» o «sessione».
export class ErroreNuvola extends Error {
  constructor(tipo, dettaglio = "") {
    super(dettaglio || tipo);
    this.name = "ErroreNuvola";
    this.tipo = tipo;
  }
}

// Quello di una chiave che può uscire dal telefono, oppure null se non c'è niente da mandare.
export function versoNuvola(chiave, valore) {
  if (!IN_NUVOLA.includes(chiave) || !oggetto(valore)) return null;
  const dati = {};
  const campi = chiave === CHIAVI.profilo ? CAMPI_PROFILO : Object.keys(valore).filter((k) => k !== "agg");
  for (const k of campi) if (valore[k] !== undefined && valore[k] !== null) dati[k] = valore[k];
  return Object.keys(dati).length ? dati : null;
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

// Cosa fare per una chiave. qui e la sono i testi del telefono e del database, o null, visto l'ultimo
// stato su cui erano d'accordo, o undefined se non lo erano mai stati.
export function decidi({ qui, la, visto, tempoQui = 0, tempoLa = 0 }) {
  if (qui === la) return qui === null ? "niente" : "uguali";
  if (visto !== undefined) {
    if (la === visto) return qui === null ? "togliLa" : "invia";
    if (qui === visto) return la === null ? "togliQui" : "prendi";
  }
  if (qui === null) return "prendi";
  if (la === null) return "invia";
  return tempoQui > tempoLa ? "invia" : "prendi";
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

export function creaNuvola({ url, chiave, memoria, locale, richiesta = null, adesso = () => Date.now(), blocchi = null }) {
  const base = String(url).replace(/\/+$/, "");
  let inCorso = null;
  let ancora = false;

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
    const s = { accesso: d.access_token, rinnovo: d.refresh_token, scade, utente: { id: d.user.id, email: d.user.email || "" } };
    scriviJson(SESSIONE, s);
    return s;
  }

  function leggiStato() {
    const s = leggiJson(STATO);
    return { utente: s && typeof s.utente === "string" ? s.utente : null, visti: s && oggetto(s.visti) ? s.visti : {} };
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
      if (!s) throw new ErroreNuvola("sessione");
      if (s.accesso !== usato && s.scade - SCADENZA_ANTICIPO > adesso()) return s.accesso;   // l'ha già fatto un'altra scheda
      try {
        const d = await chiama("/auth/v1/token?grant_type=refresh_token", { metodo: "POST", corpo: { refresh_token: s.rinnovo }, contesto: "rinnovo" });
        return salvaSessione(d).accesso;
      } catch (e) {
        if (e.tipo === "sessione") togli(SESSIONE);
        throw e;
      }
    });
  }

  async function accessoValido() {
    const s = leggiSessione();
    if (!s) throw new ErroreNuvola("sessione");
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

  // Il profilo del telefono resta con i suoi campi che online non vanno.
  function sulTelefono(k, valore) {
    if (k !== CHIAVI.profilo) return valore;
    const prima = memoria.leggi(k);
    const resto = {};
    if (oggetto(prima)) for (const [c, v] of Object.entries(prima)) if (!CAMPI_PROFILO.includes(c)) resto[c] = v;
    const nuovo = { ...resto, ...(valore || {}) };
    return Object.keys(nuovo).length ? nuovo : null;
  }

  async function unGiro(oggi) {
    const esito = { fermo: false, prima: false, ripreso: [], inviati: [], tolti: [] };
    const sessione = leggiSessione();
    if (!sessione) return esito;
    const stato = leggiStato();
    const id = sessione.utente.id;
    if (stato.utente && stato.utente !== id) return { ...esito, fermo: true };
    esito.prima = !stato.utente;
    const righe = await conAccesso((token) => chiama("/rest/v1/dati?select=chiave,valore,agg", { token }));
    const remote = new Map((Array.isArray(righe) ? righe : []).filter((r) => oggetto(r) && IN_NUVOLA.includes(r.chiave)).map((r) => [r.chiave, r]));
    const qui = memoria.copia(oggi).chiavi;
    const visti = { ...stato.visti };
    for (const k of IN_NUVOLA) {
      const grezzo = qui[k] || null;
      const nostro = versoNuvola(k, grezzo);
      const riga = remote.get(k);
      const suo = riga ? versoNuvola(k, riga.valore) : null;
      const [testoQui, testoLa] = [canonico(nostro), canonico(suo)];
      const azione = decidi({ qui: testoQui, la: testoLa, visto: visti[k], tempoQui: tempoDi(grezzo), tempoLa: riga ? Date.parse(riga.agg) || 0 : 0 });
      if (azione === "invia") {
        await conAccesso((token) => chiama("/rest/v1/dati?on_conflict=utente,chiave", {
          metodo: "POST", token, corpo: { utente: id, chiave: k, valore: nostro }, prefer: "resolution=merge-duplicates,return=minimal",
        }));
        visti[k] = testoQui;
        esito.inviati.push(k);
      } else if (azione === "togliLa") {
        await conAccesso((token) => chiama(`/rest/v1/dati?utente=eq.${encodeURIComponent(id)}&chiave=eq.${encodeURIComponent(k)}`, { metodo: "DELETE", token, prefer: "return=minimal" }));
        delete visti[k];
        esito.tolti.push(k);
      } else if (azione === "prendi" || azione === "togliQui") {
        if (!memoria.scrivi(k, sulTelefono(k, suo))) continue;
        if (testoLa === null) delete visti[k];
        else visti[k] = testoLa;
        esito.ripreso.push(k);
      } else if (azione === "uguali") {
        visti[k] = testoQui;
      } else {
        delete visti[k];
      }
    }
    scriviJson(STATO, { utente: id, visti });
    return esito;
  }

  // Salva e riprende. Un giro alla volta, e se nel frattempo è cambiato qualcosa si riparte. Restituisce
  // { fermo, prima, ripreso, inviati, tolti }. Con fermo vero il telefono è legato a un altro account, e
  // prima vuol dire che su questo telefono è il primo giro con questo account.
  function sincronizza(oggi) {
    if (inCorso) {
      ancora = true;
      return inCorso;
    }
    inCorso = (async () => {
      try {
        const esito = await unGiro(oggi);
        while (ancora) {
          ancora = false;
          const dopo = await unGiro(oggi);
          esito.fermo = dopo.fermo;
          for (const k of ["ripreso", "inviati", "tolti"]) esito[k].push(...dopo[k]);
        }
        return esito;
      } finally {
        inCorso = null;
        ancora = false;
      }
    })();
    return inCorso;
  }

  // --- l'ingresso e l'uscita ---

  const pulisciEmail = (email) => String(email || "").trim().toLowerCase();

  async function chiediCodice(email) {
    const pulita = pulisciEmail(email);
    if (!EMAIL.test(pulita)) throw new ErroreNuvola("email");
    await chiama("/auth/v1/otp", { metodo: "POST", corpo: { email: pulita, create_user: true }, contesto: "otp" });
    return pulita;
  }

  // Restituisce { utente, altroAccount }. Con altroAccount vero sul telefono ci sono i dati di un altro
  // account, e finché la persona non sceglie (accettaTelefono o esci) non si salva niente.
  async function verificaCodice(email, codice) {
    const pulito = String(codice || "").replace(/\s+/g, "");
    if (!CODICE.test(pulito)) throw new ErroreNuvola("codice");
    const d = await chiama("/auth/v1/verify", { metodo: "POST", corpo: { type: "email", email: pulisciEmail(email), token: pulito }, contesto: "verifica" });
    const s = salvaSessione(d);
    const legato = leggiStato().utente;
    return { utente: s.utente, altroAccount: Boolean(legato && legato !== s.utente.id) };
  }

  // Il telefono passa all'account entrato adesso, dopo che i dati dell'altro sono stati tolti.
  function accettaTelefono() {
    const s = leggiSessione();
    if (s) scriviJson(STATO, { utente: s.utente.id, visti: {} });
    else togli(STATO);
  }

  // Esce da questo telefono. Quello che è salvato online resta, e il telefono resta legato all'account,
  // così chi entra dopo con un altro account se ne accorge.
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

  // «Cancella il mio account». Il database toglie l'utente e tutte le sue righe.
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
