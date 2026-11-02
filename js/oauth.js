// «Entra con intervals.icu». OAuth con PKCE (RFC 7636), senza segreto nel browser.
//
// Il giro. Prima di partire la pagina crea un codice casuale, il verifier, e manda a intervals.icu
// solo la sua impronta SHA-256, la challenge. Chi entra dà il permesso su intervals.icu, che lo
// riporta qui con un codice usa e getta valido due minuti. Il codice diventa un accesso solo
// insieme al verifier, che non è mai uscito da questa scheda. Lo state, un altro numero casuale,
// garantisce che il ritorno sia la risposta alla richiesta partita da qui e non un link di altri.
//
// In cima le funzioni pure, provate in test/oauth.test.mjs. Sotto il giro vero e proprio, con
// memoria e fetch passati da fuori così si provano anche senza browser.
// Le regole di intervals.icu stanno in https://forum.intervals.icu/t/intervals-icu-oauth-support/2759

import { OAUTH, indirizzoRitorno } from "./config.js?v=202611022140";
import { ErroreApi, tokenValido, scadenza } from "./api.js?v=202611022140";

export const RICHIESTA = "comesto.oauth";          // in sessionStorage, solo per il tempo del giro
export const VALIDITA_RICHIESTA = 30 * 60 * 1000;  // mezz'ora per entrare su intervals.icu e dare il permesso

const VERIFIER = /^[A-Za-z0-9\-._~]{43,128}$/;      // RFC 7636, da 43 a 128 caratteri «non riservati»
const STATE = /^[A-Za-z0-9_-]{16,128}$/;
const CODICE = /^[\x21-\x7e]{1,512}$/;

// --- funzioni pure ---

// Base64 per indirizzi (RFC 4648, §5), senza = in fondo, come vuole la RFC 7636.
export function base64url(byte) {
  let binario = "";
  for (const b of byte) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function casuali(quanti, sorgente = globalThis.crypto) {
  const byte = new Uint8Array(quanti);
  sorgente.getRandomValues(byte);
  return byte;
}

// 32 byte casuali danno 43 caratteri, 256 bit di casualità come consiglia la RFC 7636.
export function creaVerifier(sorgente) {
  return base64url(casuali(32, sorgente));
}

export function creaState(sorgente) {
  return base64url(casuali(16, sorgente));
}

export function verifierValido(verifier) {
  return typeof verifier === "string" && VERIFIER.test(verifier);
}

// La challenge S256, cioè BASE64URL(SHA256(verifier)). intervals.icu accetta solo questa.
export async function challengeS256(verifier, sottile = globalThis.crypto && globalThis.crypto.subtle) {
  if (!verifierValido(verifier)) throw new TypeError("verifier non valido");
  const impronta = await sottile.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(impronta));
}

// Lo state che torna da intervals.icu deve essere proprio quello partito da qui.
export function stateTorna(atteso, ricevuto) {
  return typeof atteso === "string" && STATE.test(atteso) && atteso === ricevuto;
}

export function indirizzoAutorizzazione({ base, clientId, ritorno, scope, state, challenge }) {
  const parametri = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: ritorno,
    scope,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${base}?${parametri}`;
}

// Il modulo da mandare per avere l'accesso. Niente client_secret, perché Come sto è un client pubblico.
export function corpoScambio({ clientId, code, ritorno, verifier }) {
  return new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: ritorno,
    code_verifier: verifier,
  });
}

// Cosa porta l'indirizzo al ritorno da intervals.icu. null se non si torna da lì.
export function leggiRitorno(parametri) {
  const code = parametri.get("code");
  const errore = parametri.get("error");
  if (code === null && errore === null) return null;
  return { code, state: parametri.get("state"), errore };
}

// I permessi chiesti che intervals.icu non ha dato. Su intervals.icu chi entra può spegnerne
// qualcuno, e WRITE comprende READ.
export function permessiMancanti(concessi, richiesti) {
  const dati = new Map();
  for (const voce of String(concessi || "").toUpperCase().split(/[\s,]+/)) {
    const [nome, livello] = voce.split(":");
    if (nome && dati.get(nome) !== "WRITE") dati.set(nome, livello);
  }
  return String(richiesti || "").split(",").map((v) => v.trim()).filter(Boolean).filter((voce) => {
    const [nome, livello] = voce.toUpperCase().split(":");
    const dato = dati.get(nome);
    return !(dato === "WRITE" || dato === livello);
  });
}

export function richiestaScaduta(istante, adesso) {
  return !Number.isFinite(istante) || adesso - istante > VALIDITA_RICHIESTA;
}

// Quando lo scambio del codice non va. Provato dal vivo, intervals.icu risponde 404 con
// {"status":404,"error":"Client and/or secret not found"} a un client_id che non conosce
// (o se l'app non è segnata come client pubblico), e 422 a un client_id che non è un numero.
// Sono errori di configurazione, non di chi entra.
export function erroreScambio(stato, dati) {
  const testo = String((dati && (dati.error_description || dati.error)) || "");
  if (stato === 429) return new ErroreApi("troppe", "intervals.icu chiede di rallentare. Aspetta un minuto e premi di nuovo «Entra con intervals.icu».");
  if (stato >= 500) return new ErroreApi("server", `intervals.icu ha avuto un problema (${stato}). Riprova fra poco.`);
  if (stato === 422 || /client|secret/i.test(testo)) {
    return new ErroreApi("configurazione", "intervals.icu non riconosce ancora Come sto, quindi per ora si entra solo con la chiave API, qui sotto.");
  }
  return new ErroreApi("scaduto", "Il permesso di intervals.icu è scaduto prima che riuscissi a usarlo. Premi di nuovo «Entra con intervals.icu».");
}

// --- il giro ---

function leggiRichiesta(memoria) {
  try {
    const richiesta = JSON.parse(memoria.getItem(RICHIESTA));
    return richiesta && typeof richiesta === "object" ? richiesta : null;
  } catch {
    return null;
  }
}

function dimenticaRichiesta(memoria) {
  try { memoria.removeItem(RICHIESTA); } catch { /* niente da togliere */ }
}

// Prepara la partenza e restituisce l'indirizzo di intervals.icu a cui mandare chi entra.
// memoria è il sessionStorage della scheda. verifier e state restano lì, mai nell'indirizzo.
export async function preparaAccesso({ ricorda, memoria, config = OAUTH, ritorno = indirizzoRitorno(), adesso = Date.now(), sorgente = globalThis.crypto } = {}) {
  if (!config.clientId) {
    throw new ErroreApi("oauth", "L'accesso con intervals.icu non è ancora acceso. Per ora usa la chiave API.");
  }
  const sottile = sorgente && sorgente.subtle;
  if (!memoria || !sottile) {
    throw new ErroreApi("oauth", "Questo browser non permette di entrare con intervals.icu. Usa la chiave API, qui sotto.");
  }
  const verifier = creaVerifier(sorgente);
  const state = creaState(sorgente);
  const challenge = await challengeS256(verifier, sottile);
  try {
    memoria.setItem(RICHIESTA, JSON.stringify({ verifier, state, istante: adesso, ricorda: Boolean(ricorda), ritorno }));
  } catch {
    throw new ErroreApi("oauth", "Questo browser non lascia salvare niente per questa pagina, e senza non posso farti entrare con intervals.icu. Usa la chiave API, qui sotto.");
  }
  return indirizzoAutorizzazione({ base: config.autorizza, clientId: config.clientId, ritorno, scope: config.scope, state, challenge });
}

// Al ritorno da intervals.icu. Restituisce { token, ricorda } oppure lancia un ErroreApi con
// un messaggio da mostrare così com'è. verifier e state si cancellano subito, comunque vada,
// perché valgono per un giro solo.
export async function completaAccesso(ritorno, { memoria, config = OAUTH, adesso = Date.now(), chiama = (...a) => globalThis.fetch(...a) } = {}) {
  const richiesta = memoria ? leggiRichiesta(memoria) : null;
  if (memoria) dimenticaRichiesta(memoria);
  const nonRitrovo = () => new ErroreApi("state", "Non ritrovo la richiesta di accesso partita da questa pagina, e per sicurezza non entro. Premi di nuovo «Entra con intervals.icu». Se succede di nuovo, incolla la chiave API qui sotto.");

  // Prima di credere a quello che porta l'indirizzo, rifiuto compreso, ci deve essere la richiesta
  // partita da questa scheda. Senza, è un link di altri o una pagina vecchia, e non vuol dire niente.
  const completa = richiesta && verifierValido(richiesta.verifier) && typeof richiesta.ritorno === "string" &&
    typeof richiesta.state === "string" && STATE.test(richiesta.state);
  if (!completa) throw nonRitrovo();
  if (richiestaScaduta(richiesta.istante, adesso)) {
    throw new ErroreApi("scaduto", "È passato troppo tempo dalla richiesta di accesso. Premi di nuovo «Entra con intervals.icu».");
  }
  if (ritorno.errore) {
    // La guida di intervals.icu mostra il rifiuto senza state. Se però lo state c'è, deve essere quello giusto.
    if (ritorno.state !== null && ritorno.state !== undefined && !stateTorna(richiesta.state, ritorno.state)) throw nonRitrovo();
    if (ritorno.errore === "access_denied") {
      throw new ErroreApi("rifiuto", "Su intervals.icu hai scelto di non dare il permesso a Come sto. Se cambi idea, premi di nuovo «Entra con intervals.icu».");
    }
    throw new ErroreApi("oauth", "intervals.icu non ha completato l'accesso. Riprova fra poco, oppure usa la chiave API.");
  }
  if (!stateTorna(richiesta.state, ritorno.state)) throw nonRitrovo();
  if (typeof ritorno.code !== "string" || !CODICE.test(ritorno.code)) {
    throw new ErroreApi("server", "intervals.icu ha risposto in modo strano. Premi di nuovo «Entra con intervals.icu».");
  }

  let risposta;
  try {
    risposta = await chiama(config.token, {
      method: "POST",
      // Solo intestazioni «semplici». L'indirizzo del token risponde al browser per un modulo
      // inviato così, ma non alla domanda preventiva (OPTIONS) che partirebbe con intestazioni in più.
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: corpoScambio({ clientId: config.clientId, code: ritorno.code, ritorno: richiesta.ritorno, verifier: richiesta.verifier }).toString(),
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: scadenza(),
    });
  } catch (e) {
    if (e && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new ErroreApi("lento", "intervals.icu non risponde. Aspetta un momento e premi di nuovo «Entra con intervals.icu».");
    }
    throw new ErroreApi("rete", "Non riesco a raggiungere intervals.icu. Controlla la connessione e premi di nuovo «Entra con intervals.icu».");
  }

  let dati = null;
  try { dati = JSON.parse(await risposta.text()); } catch { dati = null; }
  if (!risposta.ok) throw erroreScambio(risposta.status, dati);

  const token = dati && dati.access_token;
  const tipo = dati && dati.token_type;
  if (!tokenValido(token) || (tipo && String(tipo).toLowerCase() !== "bearer")) {
    throw new ErroreApi("server", "intervals.icu ha risposto in modo strano. Premi di nuovo «Entra con intervals.icu».");
  }
  if (dati.scope !== undefined && dati.scope !== null && permessiMancanti(dati.scope, config.scope).length) {
    throw new ErroreApi("permessi", "Su intervals.icu hai tolto qualche permesso che serve a Come sto. Premi di nuovo «Entra con intervals.icu» e lascia accese tutte le voci.");
  }
  return { token, ricorda: richiesta.ricorda === true };
}
