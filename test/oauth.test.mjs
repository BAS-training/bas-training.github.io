// Prove di «Entra con intervals.icu». Si lanciano con  node --test test/oauth.test.mjs
// Memoria e rete sono finte, quindi non parte niente verso intervals.icu.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  base64url, creaVerifier, creaState, verifierValido, challengeS256, stateTorna,
  indirizzoAutorizzazione, corpoScambio, leggiRitorno, permessiMancanti, richiestaScaduta,
  preparaAccesso, completaAccesso, RICHIESTA, VALIDITA_RICHIESTA,
} from "../js/oauth.js";
import { OAUTH, indirizzoRitorno } from "../js/config.js";
import { creaClient } from "../js/api.js";
import {
  CHIAVE, ACCESSO, leggiCredenziale, stessaCredenziale, salvaCredenziale, cancellaCredenziali,
  togliCredenziale, dopoUnCambio,
} from "../js/credenziali.js";

// Il vettore di prova della RFC 7636, appendice B (https://www.rfc-editor.org/rfc/rfc7636#appendix-B).
// I 32 byte casuali, il verifier che ne esce e la sua challenge S256, copiati dalla RFC.
// Attenzione, circola anche un verifier sbagliato che comincia allo stesso modo
// (dBjftJeZ4CVP-mA92Q9c...) e che con questa challenge non c'entra.
const RFC_BYTE = [116, 24, 223, 180, 151, 153, 224, 37, 79, 250, 96, 125, 216, 173, 187, 186,
  22, 212, 37, 77, 105, 214, 191, 240, 91, 88, 5, 88, 83, 132, 141, 121];
const RFC_VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const RFC_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

const CONFIG = { ...OAUTH, clientId: "123" };   // come sarà dopo l'approvazione
const RITORNO = "https://bas-training.github.io/";
const STATE_PROVA = "q9cX6l9DFIqXNHPg1Pdl9v";
const ADESSO = Date.UTC(2026, 9, 31, 7, 0);
const TOKEN = "d842c1fc25f241e5ae440d09756448a9";   // quello d'esempio della guida di intervals.icu
const CODICE = "3983ed415f66413c890ca48b7cce59e4";

function memoriaFinta(iniziale = {}) {
  const dati = new Map(Object.entries(iniziale));
  return {
    getItem: (k) => (dati.has(k) ? dati.get(k) : null),
    setItem: (k, v) => { dati.set(k, String(v)); },
    removeItem: (k) => { dati.delete(k); },
  };
}

function richiestaPronta(extra = {}) {
  return { verifier: RFC_VERIFIER, state: STATE_PROVA, istante: ADESSO - 60000, ricorda: true, ritorno: RITORNO, ...extra };
}

const memoriaCon = (richiesta) => memoriaFinta({ [RICHIESTA]: JSON.stringify(richiesta) });
const risposta = (stato, corpo) => ({
  ok: stato >= 200 && stato < 300,
  status: stato,
  text: async () => (typeof corpo === "string" ? corpo : JSON.stringify(corpo)),
});
const TOKEN_BUONO = { token_type: "Bearer", access_token: TOKEN, scope: "ACTIVITY:READ,WELLNESS:WRITE,SETTINGS:READ", athlete: { id: "2049151", name: "Prova" } };
const nonChiamare = async () => { throw new Error("non doveva chiamare intervals.icu"); };

async function ritornoCon(ritorno, { richiesta = richiestaPronta(), chiama = nonChiamare } = {}) {
  const memoria = richiesta ? memoriaCon(richiesta) : memoriaFinta();
  let errore = null;
  let esito = null;
  try {
    esito = await completaAccesso(ritorno, { memoria, config: CONFIG, adesso: ADESSO, chiama });
  } catch (e) {
    errore = e;
  }
  return { esito, errore, rimasta: memoria.getItem(RICHIESTA) };
}

test("RFC 7636: dal verifier dell'esempio esce la challenge dell'esempio", async () => {
  assert.equal(await challengeS256(RFC_VERIFIER), RFC_CHALLENGE);
});

test("RFC 7636: i 32 byte dell'esempio danno il verifier dell'esempio", () => {
  assert.equal(base64url(Uint8Array.from(RFC_BYTE)), RFC_VERIFIER);
  const casoFinto = { getRandomValues: (a) => { a.set(RFC_BYTE); return a; } };
  assert.equal(creaVerifier(casoFinto), RFC_VERIFIER);
});

test("base64url: i vettori della RFC 4648, senza +, / e = in fondo", () => {
  const testo = (t) => base64url(new TextEncoder().encode(t));
  assert.equal(testo(""), "");
  assert.equal(testo("f"), "Zg");
  assert.equal(testo("fo"), "Zm8");
  assert.equal(testo("foo"), "Zm9v");
  assert.equal(testo("foob"), "Zm9vYg");
  assert.equal(testo("foobar"), "Zm9vYmFy");
  assert.equal(base64url(new Uint8Array([251, 255])), "-_8"); // in base64 normale sarebbe +/8=
  assert.equal(base64url(new Uint8Array([0xfb, 0xef, 0xff])), "--__");
});

test("verifier e state: casuali, della lunghezza giusta, con i soli caratteri ammessi", () => {
  const verifier = creaVerifier();
  assert.equal(verifier.length, 43);
  assert.ok(verifierValido(verifier));
  assert.notEqual(verifier, creaVerifier());
  const state = creaState();
  assert.match(state, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(state, creaState());
  assert.equal(verifierValido("troppo-corto"), false);
  assert.equal(verifierValido("a".repeat(129)), false);
  assert.equal(verifierValido("a".repeat(42) + "+"), false);
  assert.equal(verifierValido("a".repeat(128)), true);
});

test("lo state deve tornare identico, e vuoto non vale mai", () => {
  const state = creaState();
  assert.equal(stateTorna(state, state), true);
  assert.equal(stateTorna(state, state.slice(1)), false);
  assert.equal(stateTorna(state, state + "x"), false);
  assert.equal(stateTorna(state, null), false);
  assert.equal(stateTorna(state, ""), false);
  assert.equal(stateTorna("", ""), false);
  assert.equal(stateTorna(null, null), false);
  assert.equal(stateTorna(undefined, undefined), false);
});

test("indirizzo di ritorno: origine più percorso, senza query né hash", () => {
  const github = { origin: "https://bas-training.github.io", pathname: "/", search: "?code=x&state=y", hash: "#oggi" };
  assert.equal(indirizzoRitorno(github), RITORNO);
  assert.equal(indirizzoRitorno({ ...github, pathname: "/index.html" }), RITORNO);
  assert.equal(indirizzoRitorno({ origin: "http://localhost:8801", pathname: "/" }), "http://localhost:8801/");
});

test("indirizzo di autorizzazione: quello che chiede intervals.icu e niente di segreto", () => {
  const url = new URL(indirizzoAutorizzazione({
    base: OAUTH.autorizza, clientId: "123", ritorno: RITORNO, scope: OAUTH.scope, state: STATE_PROVA, challenge: RFC_CHALLENGE,
  }));
  assert.equal(url.origin + url.pathname, "https://intervals.icu/oauth/authorize");
  const p = url.searchParams;
  assert.equal(p.get("client_id"), "123");
  assert.equal(p.get("redirect_uri"), RITORNO);
  assert.equal(p.get("scope"), "ACTIVITY:READ,WELLNESS:WRITE,SETTINGS:READ");
  assert.equal(p.get("state"), STATE_PROVA);
  assert.equal(p.get("code_challenge"), RFC_CHALLENGE);
  assert.equal(p.get("code_challenge_method"), "S256");
  assert.equal(p.get("response_type"), "code");
  assert.equal(p.has("code_verifier"), false);
  assert.equal(p.has("client_secret"), false);
});

test("scambio del codice: i cinque campi del modulo, senza segreto", () => {
  const corpo = corpoScambio({ clientId: "123", code: CODICE, ritorno: RITORNO, verifier: RFC_VERIFIER });
  assert.deepEqual([...corpo.keys()].sort(), ["client_id", "code", "code_verifier", "grant_type", "redirect_uri"]);
  assert.equal(corpo.get("grant_type"), "authorization_code");
  assert.equal(corpo.get("code_verifier"), RFC_VERIFIER);
});

test("ritorno da intervals.icu: codice, rifiuto, oppure un indirizzo qualsiasi", () => {
  assert.deepEqual(leggiRitorno(new URLSearchParams(`code=${CODICE}&state=${STATE_PROVA}`)), { code: CODICE, state: STATE_PROVA, errore: null });
  assert.deepEqual(leggiRitorno(new URLSearchParams("error=access_denied")), { code: null, state: null, errore: "access_denied" });
  assert.equal(leggiRitorno(new URLSearchParams("esempio")), null);
  assert.equal(leggiRitorno(new URLSearchParams("")), null);
});

test("permessi: WRITE comprende READ, READ non basta per scrivere", () => {
  const chiesti = OAUTH.scope;
  assert.deepEqual(permessiMancanti("ACTIVITY:READ,WELLNESS:WRITE,SETTINGS:READ", chiesti), []);
  assert.deepEqual(permessiMancanti("ACTIVITY:WRITE,WELLNESS:WRITE,SETTINGS:WRITE,CALENDAR:READ", chiesti), []);
  assert.deepEqual(permessiMancanti("activity:read, wellness:write, settings:read", chiesti), []);
  assert.deepEqual(permessiMancanti("ACTIVITY:READ,WELLNESS:READ,SETTINGS:READ", chiesti), ["WELLNESS:WRITE"]);
  assert.deepEqual(permessiMancanti("ACTIVITY:READ,WELLNESS:WRITE", chiesti), ["SETTINGS:READ"]);
  assert.deepEqual(permessiMancanti("", chiesti), ["ACTIVITY:READ", "WELLNESS:WRITE", "SETTINGS:READ"]);
});

test("una richiesta vale mezz'ora", () => {
  assert.equal(richiestaScaduta(ADESSO - 60000, ADESSO), false);
  assert.equal(richiestaScaduta(ADESSO - VALIDITA_RICHIESTA - 1, ADESSO), true);
  assert.equal(richiestaScaduta(undefined, ADESSO), true);
});

test("partenza: salva verifier, state, istante e Ricordami, e a intervals.icu manda solo la challenge", async () => {
  const memoria = memoriaFinta();
  const indirizzo = await preparaAccesso({ ricorda: false, memoria, config: CONFIG, ritorno: RITORNO, adesso: ADESSO });
  const salvata = JSON.parse(memoria.getItem(RICHIESTA));
  assert.ok(verifierValido(salvata.verifier));
  assert.ok(stateTorna(salvata.state, salvata.state));
  assert.equal(salvata.istante, ADESSO);
  assert.equal(salvata.ricorda, false);
  assert.equal(salvata.ritorno, RITORNO);
  const p = new URL(indirizzo).searchParams;
  assert.equal(p.get("state"), salvata.state);
  assert.equal(p.get("code_challenge"), await challengeS256(salvata.verifier));
  assert.ok(!indirizzo.includes(salvata.verifier));
});

test("partenza: senza client_id o senza memoria non si parte", async () => {
  await assert.rejects(
    preparaAccesso({ ricorda: true, memoria: memoriaFinta(), config: { ...OAUTH, clientId: null }, ritorno: RITORNO }),
    (e) => e.tipo === "oauth");
  await assert.rejects(
    preparaAccesso({ ricorda: true, memoria: null, config: CONFIG, ritorno: RITORNO }),
    (e) => e.tipo === "oauth" && e.messaggio.includes("chiave API"));
});

test("ritorno buono: scambia il codice con un modulo semplice e cancella verifier e state", async () => {
  let chiamata = null;
  const { esito, errore, rimasta } = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, {
    chiama: async (url, opzioni) => { chiamata = { url, opzioni }; return risposta(200, TOKEN_BUONO); },
  });
  assert.equal(errore, null);
  assert.deepEqual(esito, { token: TOKEN, ricorda: true });
  assert.equal(rimasta, null);
  assert.equal(chiamata.url, "https://intervals.icu/api/oauth/token");
  assert.equal(chiamata.opzioni.method, "POST");
  // Solo intestazioni «semplici», perché l'indirizzo del token non risponde alla domanda preventiva del browser.
  assert.deepEqual(chiamata.opzioni.headers, { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" });
  assert.equal(chiamata.opzioni.credentials, "omit");
  const corpo = new URLSearchParams(chiamata.opzioni.body);
  assert.equal(corpo.get("grant_type"), "authorization_code");
  assert.equal(corpo.get("client_id"), "123");
  assert.equal(corpo.get("code"), CODICE);
  assert.equal(corpo.get("redirect_uri"), RITORNO);
  assert.equal(corpo.get("code_verifier"), RFC_VERIFIER);
  assert.equal(corpo.has("client_secret"), false);
});

test("ritorno buono senza Ricordami: lo dice all'app", async () => {
  const { esito } = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, {
    richiesta: richiestaPronta({ ricorda: false }),
    chiama: async () => risposta(200, TOKEN_BUONO),
  });
  assert.equal(esito.ricorda, false);
});

test("state che non torna: non si scambia niente e la richiesta si cancella", async () => {
  const { errore, rimasta } = await ritornoCon({ code: CODICE, state: "unAltroStateQualsiasi12", errore: null });
  assert.equal(errore.tipo, "state");
  assert.ok(errore.messaggio.includes("per sicurezza non entro"), errore.messaggio);
  assert.equal(rimasta, null);
});

test("state assente, o nessuna richiesta partita da qui (un link di altri): non si entra", async () => {
  assert.equal((await ritornoCon({ code: CODICE, state: null, errore: null })).errore.tipo, "state");
  assert.equal((await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, { richiesta: null })).errore.tipo, "state");
});

test("rifiuto su intervals.icu: un messaggio chiaro, e la richiesta si cancella", async () => {
  const { errore, rimasta } = await ritornoCon({ code: null, state: null, errore: "access_denied" });
  assert.equal(errore.tipo, "rifiuto");
  assert.ok(errore.messaggio.includes("non dare il permesso"), errore.messaggio);
  assert.equal(rimasta, null);
  assert.equal((await ritornoCon({ code: null, state: null, errore: "server_error" })).errore.tipo, "oauth");
});

test("un rifiuto senza richiesta partita da qui (un link di altri) non parla di permessi", async () => {
  const { errore, rimasta } = await ritornoCon({ code: null, state: null, errore: "access_denied" }, { richiesta: null });
  assert.equal(errore.tipo, "state");
  assert.ok(!errore.messaggio.includes("non dare il permesso"), errore.messaggio);
  assert.ok(errore.messaggio.includes("chiave API"), errore.messaggio);
  assert.equal(rimasta, null);
  const vecchia = await ritornoCon({ code: null, state: null, errore: "access_denied" }, {
    richiesta: richiestaPronta({ istante: ADESSO - VALIDITA_RICHIESTA - 1 }),
  });
  assert.equal(vecchia.errore.tipo, "scaduto");
});

test("rifiuto: lo state assente va bene, uno state diverso no", async () => {
  assert.equal((await ritornoCon({ code: null, state: STATE_PROVA, errore: "access_denied" })).errore.tipo, "rifiuto");
  assert.equal((await ritornoCon({ code: null, state: "unAltroStateQualsiasi12", errore: "access_denied" })).errore.tipo, "state");
  assert.equal((await ritornoCon({ code: null, state: "", errore: "access_denied" })).errore.tipo, "state");
});

test("richiesta troppo vecchia: si riparte", async () => {
  const { errore } = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, {
    richiesta: richiestaPronta({ istante: ADESSO - VALIDITA_RICHIESTA - 1 }),
  });
  assert.equal(errore.tipo, "scaduto");
});

test("codice scaduto o già usato: intervals.icu dice di no", async () => {
  const { errore } = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, {
    chiama: async () => risposta(400, { status: 400, error: "Invalid code" }),
  });
  assert.equal(errore.tipo, "scaduto");
  assert.ok(errore.messaggio.includes("scaduto"), errore.messaggio);
});

test("app non riconosciuta da intervals.icu: si dice di usare la chiave", async () => {
  // Sono le risposte vere di intervals.icu a un client_id che non conosce e a uno che non è un numero.
  const { errore } = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, {
    chiama: async () => risposta(404, { status: 404, error: "Client and/or secret not found" }),
  });
  assert.equal(errore.tipo, "configurazione");
  assert.ok(errore.messaggio.includes("chiave API"), errore.messaggio);
  const nonNumero = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, {
    chiama: async () => risposta(422, { status: 422, error: "Failed to convert value of type 'java.lang.String' to required type 'int'" }),
  });
  assert.equal(nonNumero.errore.tipo, "configurazione");
});

test("rete assente o intervals.icu lento", async () => {
  const senzaRete = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, {
    chiama: async () => { throw new TypeError("Failed to fetch"); },
  });
  assert.equal(senzaRete.errore.tipo, "rete");
  assert.ok(senzaRete.errore.messaggio.includes("connessione"), senzaRete.errore.messaggio);
  assert.equal(senzaRete.rimasta, null);
  const lento = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, {
    chiama: async () => { throw new DOMException("troppo tempo", "TimeoutError"); },
  });
  assert.equal(lento.errore.tipo, "lento");
});

test("intervals.icu in difficoltà o che chiede di rallentare", async () => {
  const guasto = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, { chiama: async () => risposta(503, "") });
  assert.equal(guasto.errore.tipo, "server");
  const troppe = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, { chiama: async () => risposta(429, "") });
  assert.equal(troppe.errore.tipo, "troppe");
});

test("permessi spenti su intervals.icu: non si entra a metà", async () => {
  const { errore } = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, {
    chiama: async () => risposta(200, { ...TOKEN_BUONO, scope: "ACTIVITY:READ,WELLNESS:WRITE" }),
  });
  assert.equal(errore.tipo, "permessi");
  assert.ok(errore.messaggio.includes("tutte le voci"), errore.messaggio);
});

test("risposta senza accesso, o con un tipo diverso da Bearer: non si entra", async () => {
  const vuota = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, { chiama: async () => risposta(200, {}) });
  assert.equal(vuota.errore.tipo, "server");
  const strana = await ritornoCon({ code: CODICE, state: STATE_PROVA, errore: null }, {
    chiama: async () => risposta(200, { ...TOKEN_BUONO, token_type: "mac" }),
  });
  assert.equal(strana.errore.tipo, "server");
  const codiceStrano = await ritornoCon({ code: "con spazio", state: STATE_PROVA, errore: null });
  assert.equal(codiceStrano.errore.tipo, "server");
});

// --- il client delle API con il token ---

async function conFetchFinto(rispondi, prova) {
  const originale = globalThis.fetch;
  const viste = [];
  globalThis.fetch = async (url, opzioni) => { viste.push({ url, opzioni }); return rispondi(url, opzioni); };
  try {
    await prova();
  } finally {
    globalThis.fetch = originale;
  }
  return viste;
}

test("creaClient col token usa Bearer e l'atleta 0, con la chiave resta Basic", async () => {
  const viste = await conFetchFinto(() => risposta(200, "{}"), async () => {
    await creaClient({ token: TOKEN }).atleta();
    await creaClient({ chiave: "chiave-di-prova-123" }).atleta();
  });
  assert.equal(viste[0].url, "https://intervals.icu/api/v1/athlete/0");
  assert.equal(viste[0].opzioni.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(viste[1].opzioni.headers.Authorization, "Basic " + btoa("API_KEY:chiave-di-prova-123"));
  assert.equal(creaClient({ token: TOKEN }).accesso, "token");
  assert.equal(creaClient({ chiave: "chiave-di-prova-123" }).accesso, "chiave");
});

test("col token un 401 dice che l'accesso è scaduto o tolto, con la chiave resta il messaggio di prima", async () => {
  await conFetchFinto(() => risposta(401, ""), async () => {
    await assert.rejects(creaClient({ token: TOKEN }).atleta(),
      (e) => e.tipo === "chiave" && e.messaggio.includes("scaduto o è stato tolto"));
    await assert.rejects(creaClient({ chiave: "chiave-di-prova-123" }).atleta(),
      (e) => e.tipo === "chiave" && e.messaggio.startsWith("La chiave salvata non funziona più"));
  });
});

test("revoca: col token DELETE su disconnect-app, con la chiave non c'è", async () => {
  const viste = await conFetchFinto(() => risposta(200, ""), async () => {
    await creaClient({ token: TOKEN }).revoca();
  });
  assert.equal(viste[0].url, "https://intervals.icu/api/v1/disconnect-app");
  assert.equal(viste[0].opzioni.method, "DELETE");
  assert.equal(viste[0].opzioni.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(creaClient({ chiave: "chiave-di-prova-123" }).revoca, null);
});

test("un token con spazi o caratteri strani non arriva mai in un'intestazione", () => {
  assert.throws(() => creaClient({ token: "con spazi dentro" }), (e) => e.tipo === "chiave");
  assert.throws(() => creaClient({ token: "riga\r\nX-Altro: 1" }), (e) => e.tipo === "chiave");
});

// --- chiave e accesso salvati, con più schede aperte (js/credenziali.js) ---

const CON_CHIAVE = { tipo: "chiave", valore: "chiave-di-prova-123" };
const CON_TOKEN = { tipo: "token", valore: TOKEN };

// Un browser finto. Il localStorage è uno solo per tutte le schede, il sessionStorage è di ognuna.
// Come nel browser vero, ogni cambio del localStorage manda l'evento storage alle altre schede,
// non a quella che scrive, e non lo manda se il valore non cambia. Le schede reagiscono come il
// listener di js/app.js, con dopoUnCambio e senza scrivere nella memoria.
function browserFinto() {
  const dati = new Map();
  const schede = [];
  const coda = [];
  const avvisa = (da, key) => { for (const s of schede) if (s !== da) coda.push({ scheda: s, key }); };
  return {
    dati,
    apri() {
      const scheda = { sessione: memoriaFinta(), inUso: null };
      scheda.locale = {
        getItem: (k) => (dati.has(k) ? dati.get(k) : null),
        setItem: (k, v) => { if (dati.get(k) === String(v)) return; dati.set(k, String(v)); avvisa(scheda, k); },
        removeItem: (k) => { if (!dati.has(k)) return; dati.delete(k); avvisa(scheda, k); },
      };
      // All'avvio una scheda usa la credenziale salvata, come avvia() in js/app.js.
      scheda.inUso = leggiCredenziale(scheda.locale, scheda.sessione);
      schede.push(scheda);
      return scheda;
    },
    // Consegna gli eventi in attesa, come fa il browser quando la scheda che scrive ha finito.
    consegna() {
      let consegnati = 0;
      while (coda.length) {
        const { scheda, key } = coda.shift();
        consegnati += 1;
        if (key !== CHIAVE && key !== ACCESSO) continue;
        const { azione, credenziale } = dopoUnCambio(scheda.inUso, scheda.locale, scheda.sessione);
        if (azione === "passa") scheda.inUso = credenziale;
        if (azione === "esci") scheda.inUso = null;
      }
      return consegnati;
    },
  };
}

test("credenziali: all'avvio vince l'accesso di intervals.icu, poi la chiave, e una memoria che non va è vuota", () => {
  const locale = memoriaFinta({ [CHIAVE]: CON_CHIAVE.valore });
  assert.deepEqual(leggiCredenziale(locale, memoriaFinta({ [ACCESSO]: TOKEN })), CON_TOKEN);
  assert.deepEqual(leggiCredenziale(locale, memoriaFinta()), CON_CHIAVE);
  assert.equal(leggiCredenziale(memoriaFinta(), memoriaFinta()), null);
  assert.equal(leggiCredenziale(null, null), null);
  const rotta = { getItem() { throw new Error("memoria non disponibile"); } };
  assert.equal(leggiCredenziale(rotta, rotta), null);
  assert.equal(stessaCredenziale(null, null), true);
  assert.equal(stessaCredenziale(CON_CHIAVE, null), false);
  assert.equal(stessaCredenziale(CON_CHIAVE, { ...CON_CHIAVE }), true);
  assert.equal(stessaCredenziale(CON_CHIAVE, { ...CON_CHIAVE, valore: "un-altra-chiave-456" }), false);
});

test("credenziali: salvarne una toglie l'altra da tutte e due le memorie, e Ricordami decide dove sta", () => {
  const locale = memoriaFinta({ [CHIAVE]: CON_CHIAVE.valore });
  const sessione = memoriaFinta({ [CHIAVE]: "un-altra-chiave-456" });
  salvaCredenziale(locale, sessione, CON_TOKEN, true);
  assert.equal(locale.getItem(ACCESSO), TOKEN);
  assert.equal(locale.getItem(CHIAVE), null);
  assert.equal(sessione.getItem(CHIAVE), null);
  salvaCredenziale(locale, sessione, CON_CHIAVE, false);
  assert.equal(sessione.getItem(CHIAVE), CON_CHIAVE.valore);
  assert.equal(locale.getItem(CHIAVE), null);
  assert.equal(locale.getItem(ACCESSO), null);
  cancellaCredenziali(locale, sessione);
  assert.equal(leggiCredenziale(locale, sessione), null);
});

test("due schede: A è dentro con la chiave, B entra con intervals.icu, e restano dentro tutte e due col token", () => {
  const browser = browserFinto();
  const a = browser.apri();
  salvaCredenziale(a.locale, a.sessione, CON_CHIAVE, true);
  a.inUso = CON_CHIAVE;
  const b = browser.apri();
  assert.deepEqual(b.inUso, CON_CHIAVE);
  browser.consegna();
  // B completa «Entra con intervals.icu» con Ricordami.
  salvaCredenziale(b.locale, b.sessione, CON_TOKEN, true);
  b.inUso = CON_TOKEN;
  assert.ok(browser.consegna() > 0);
  assert.deepEqual(a.inUso, CON_TOKEN);
  assert.deepEqual(b.inUso, CON_TOKEN);
  assert.deepEqual([...browser.dati.entries()], [[ACCESSO, TOKEN]]);
  // Le schede che seguono non scrivono, quindi non partono altri eventi a catena.
  assert.equal(browser.consegna(), 0);
});

test("due schede: A è dentro col token, B incolla la chiave, e la chiave appena incollata resta", () => {
  const browser = browserFinto();
  const a = browser.apri();
  salvaCredenziale(a.locale, a.sessione, CON_TOKEN, true);
  a.inUso = CON_TOKEN;
  const b = browser.apri();
  browser.consegna();
  salvaCredenziale(b.locale, b.sessione, CON_CHIAVE, true);
  b.inUso = CON_CHIAVE;
  browser.consegna();
  assert.deepEqual(a.inUso, CON_CHIAVE);
  assert.deepEqual(b.inUso, CON_CHIAVE);
  assert.deepEqual([...browser.dati.entries()], [[CHIAVE, CON_CHIAVE.valore]]);
});

test("tre schede: Esci in una fa uscire le altre, tranne chi ha una chiave salvata solo nella sua scheda", () => {
  const browser = browserFinto();
  const soloDiC = { tipo: "chiave", valore: "chiave-solo-di-c-789" };
  // C entra per prima con una chiave senza Ricordami, che resta nel suo sessionStorage.
  const c = browser.apri();
  salvaCredenziale(c.locale, c.sessione, soloDiC, false);
  c.inUso = soloDiC;
  // A entra con intervals.icu e Ricordami. C passa al token, che ripartendo sceglierebbe anche lei.
  const a = browser.apri();
  salvaCredenziale(a.locale, a.sessione, CON_TOKEN, true);
  a.inUso = CON_TOKEN;
  browser.consegna();
  assert.deepEqual(c.inUso, CON_TOKEN);
  const b = browser.apri();
  assert.deepEqual(b.inUso, CON_TOKEN);
  // B esce. A esce con lei, C torna alla chiave che ha solo lei.
  cancellaCredenziali(b.locale, b.sessione);
  b.inUso = null;
  browser.consegna();
  assert.equal(a.inUso, null);
  assert.deepEqual(c.inUso, soloDiC);
  assert.equal(browser.dati.size, 0);
});

test("una scheda rimasta indietro che riceve 401 non cancella la chiave salvata nel frattempo da un'altra", () => {
  const locale = memoriaFinta({ [CHIAVE]: "chiave-nuova-di-b-456" });
  const sessione = memoriaFinta();
  togliCredenziale(locale, sessione, CON_CHIAVE); // A aveva ancora la chiave vecchia
  assert.equal(locale.getItem(CHIAVE), "chiave-nuova-di-b-456");
  assert.deepEqual(leggiCredenziale(locale, sessione), { tipo: "chiave", valore: "chiave-nuova-di-b-456" });
  togliCredenziale(locale, sessione, { tipo: "chiave", valore: "chiave-nuova-di-b-456" });
  assert.equal(leggiCredenziale(locale, sessione), null);
});

test("una scheda che non è entrata non segue gli ingressi delle altre", () => {
  const locale = memoriaFinta({ [ACCESSO]: TOKEN });
  assert.deepEqual(dopoUnCambio(null, locale, memoriaFinta()), { azione: "resta" });
  assert.deepEqual(dopoUnCambio(CON_TOKEN, locale, memoriaFinta()), { azione: "resta" });
  assert.deepEqual(dopoUnCambio(CON_CHIAVE, locale, memoriaFinta()), { azione: "passa", credenziale: CON_TOKEN });
  assert.deepEqual(dopoUnCambio(CON_TOKEN, memoriaFinta(), memoriaFinta()), { azione: "esci" });
});
