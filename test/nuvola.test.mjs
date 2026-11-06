// Prove dell'account e del salvataggio online. Si lanciano con  node --test test/nuvola.test.mjs
// Il database è finto, in memoria, e fa come quello vero. Persone, email, date e codici sono inventati.
import { test } from "node:test";
import assert from "node:assert/strict";

import { creaMemoria, CHIAVI } from "../js/memoria.js";
import { CHIAVE } from "../js/credenziali.js";
import {
  creaNuvola, decidi, decidiPrimaVolta, canonico, versoNuvola, ErroreNuvola, IN_NUVOLA, CAMPI, CAMPI_PROFILO, SESSIONE, STATO,
} from "../js/nuvola.js";

const OGGI = "2027-03-15";
const ID_LUCIA = "aaaaaaaa-0000-4000-8000-000000000001";
const ID_MARCO = "bbbbbbbb-0000-4000-8000-000000000002";
const ID_LUCIA_NUOVA = "cccccccc-0000-4000-8000-000000000003";
const PUBBLICA = "sb_publishable_inventata";
const CHIAVE_LUCIA = "chiave-inventata-di-lucia-0123456789abcdef";

function memoriaFinta() {
  const dati = new Map();
  return {
    dati,
    get length() { return dati.size; },
    key(i) { return [...dati.keys()][i] ?? null; },
    getItem(k) { return dati.has(k) ? dati.get(k) : null; },
    setItem(k, v) { dati.set(k, String(v)); },
    removeItem(k) { dati.delete(k); },
  };
}

// Il database finto. Tiene le righe per utente e registra ogni chiamata, per vedere cosa esce dal telefono.
function databaseFinto() {
  const db = {
    righe: new Map(), chiamate: [], gia: new Set(), cancellati: new Set(),
    utenti: new Map([["lucia@example.invalid", ID_LUCIA], ["marco@example.invalid", ID_MARCO]]),
    rete: true, secondi: 3600, rinnovi: 0, rifiutaAccesso: null, errore: null, n: 0, cancelli: {}, rotta: null,
  };
  db.fetch = async (indirizzo, op = {}) => {
    const u = new URL(indirizzo);
    const corpo = op.body ? JSON.parse(op.body) : null;
    db.chiamate.push({ percorso: u.pathname, cerca: u.search, metodo: op.method, testa: op.headers, corpo, testo: op.body || "" });
    if (!db.rete) throw new TypeError("Failed to fetch");
    // Un cancello tiene ferma una chiamata già partita, per provare le uscite a metà.
    const cancello = db.cancelli[`${op.method} ${u.pathname}`];
    if (cancello) await cancello;
    const risposta = (status, dati) => ({ ok: status < 400, status, text: async () => (dati === undefined ? "" : JSON.stringify(dati)) });
    if (db.errore) return risposta(db.errore.status, db.errore.dati);
    const nuovaSessione = (id, email) => {
      db.n += 1;
      return { access_token: `accesso-${id}-${db.n}`, refresh_token: `rinnovo-${id}-${db.n}`, expires_in: db.secondi, user: { id, email } };
    };
    if (u.pathname === "/auth/v1/otp") return risposta(200, {});
    if (u.pathname === "/auth/v1/verify") {
      if (corpo.token !== "123456") return risposta(403, { error_code: "otp_expired", msg: "Token has expired or is invalid" });
      return risposta(200, nuovaSessione(db.utenti.get(corpo.email), corpo.email));
    }
    if (u.pathname === "/auth/v1/token") {
      db.rinnovi += 1;
      const id = corpo.refresh_token.split("-").slice(1, -1).join("-");
      if (db.gia.has(corpo.refresh_token) || db.cancellati.has(id)) return risposta(400, { error_code: "refresh_token_not_found" });
      db.gia.add(corpo.refresh_token);
      return risposta(200, nuovaSessione(id, "rinnovata@example.invalid"));
    }
    if (u.pathname === "/auth/v1/logout") return risposta(204);
    const bearer = (op.headers.Authorization || "").replace("Bearer ", "");
    if (db.rifiutaAccesso === bearer) return risposta(401, { code: "PGRST301", message: "JWT expired" });
    const id = bearer.split("-").slice(1, -1).join("-");
    if (!id) return risposta(401, { code: "PGRST301" });
    if (u.pathname === "/rest/v1/dati" && op.method === "GET" && db.rotta !== null) return risposta(200, db.rotta);
    const mie = db.righe.get(id) || new Map();
    if (!db.cancellati.has(id)) db.righe.set(id, mie);
    if (u.pathname === "/rest/v1/dati" && op.method === "GET") return risposta(200, [...mie.values()]);
    if (u.pathname === "/rest/v1/dati" && op.method === "POST") {
      if (corpo.utente !== id) return risposta(403, { code: "42501" });
      if (db.cancellati.has(id)) return risposta(409, { code: "23503", message: "violates foreign key constraint" });
      mie.set(corpo.chiave, { chiave: corpo.chiave, valore: corpo.valore, scelto: corpo.scelto, agg: new Date(db.adesso ? db.adesso() : 0).toISOString() });
      return risposta(201);
    }
    if (u.pathname === "/rest/v1/dati" && op.method === "DELETE") {
      mie.delete(u.searchParams.get("chiave").replace("eq.", ""));
      return risposta(204);
    }
    if (u.pathname === "/rest/v1/rpc/cancella_account") {
      db.righe.delete(id);
      db.cancellati.add(id);
      return risposta(204);
    }
    return risposta(404, { code: "PGRST205" });
  };
  return db;
}

// Un telefono, con la sua memoria e la sua nuvola, sullo stesso database.
function telefono(db, orologio = { t: Date.UTC(2027, 2, 15, 7, 30) }) {
  const locale = memoriaFinta();
  const sessione = memoriaFinta();
  const adesso = () => orologio.t;
  db.adesso = adesso;
  const memoria = creaMemoria(locale, { sessione, adesso });
  const nuvola = creaNuvola({ url: "https://prova.example.invalid/", chiave: PUBBLICA, memoria, locale, richiesta: db.fetch, adesso });
  return { locale, sessione, memoria, nuvola, orologio };
}

async function entra(t, email = "lucia@example.invalid") {
  await t.nuvola.chiediCodice(email);
  return t.nuvola.verificaCodice(email, "123456");
}

// Il primo ingresso di chi ha già delle scelte sul telefono, e dice che sono sue.
async function entraConLeMie(t, email = "lucia@example.invalid") {
  await entra(t, email);
  return t.nuvola.sincronizza(OGGI, { scelta: "telefono" });
}

const AVVENTURA = { tipo: "evento", percorso: "tt-originale", giorni: 4, partenza: "2027-05-20", iscritto: false };
const ALTRA_AVVENTURA = { tipo: "evento", percorso: "nc4000", giorni: 20, partenza: "2027-07-20", iscritto: false };
const GIORNI = { giorni: [1, 3, 5], stella: 5, ore: 6, tetti: [null, null, null, null, null, null, null], dueCose: false };
const PROFILO_PIENO = {
  bici: "gravel", borseKg: 10, borseTipo: "bikepacking", palestra: "palestra", esperienza: "piuGiorni",
  fasciaEta: "50-54", aritmia: true, ciclo: true, pesoFascia: 2, palestraSicurezza: "si", primaDiCominciare: "2027-01-02", dispositivo: "orologio", mediaDichiarata: 20,
};
const DELICATI = {
  [CHIAVI.mattino]: { "2027-03-15": { stoMale: ["febbre"], cause: ["alcol"], medico: "si" } },
  [CHIAVI.esiti]: { "2027-03-15": { livello: "rosso", punti: { hrv: 2 } } },
  [CHIAVI.uscite]: { i123: { giorno: "2027-03-14", sforzo: 8, stomaco: "male", borse: true } },
  [CHIAVI.palestra]: { "2027-03-14-1": { pesi: { squat: 80 }, sforzo: 7 } },
  [CHIAVI.domenica]: { "2027-03-14": { s6: "si", fame: "poca" } },
};

const scritture = (db) => db.chiamate.filter((c) => c.percorso === "/rest/v1/dati" && c.metodo !== "GET");

test("la chiave pubblica va nell'intestazione apikey, e non fa mai da accesso", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  await entra(t);
  await t.nuvola.sincronizza(OGGI);
  for (const c of db.chiamate) {
    assert.equal(c.testa.apikey, PUBBLICA);
    assert.notEqual(c.testa.Authorization, `Bearer ${PUBBLICA}`);
  }
  assert.ok(db.chiamate.some((c) => (c.testa.Authorization || "").startsWith("Bearer accesso-")));
});

test("dal telefono escono solo avventura, giorni e pochi campi del profilo, mai il resto", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, { ...AVVENTURA, qualcosaDiNuovo: "non previsto" });
  t.memoria.scrivi(CHIAVI.disponibilita, { ...GIORNI, altroCampo: 1 });
  t.memoria.scrivi(CHIAVI.profilo, PROFILO_PIENO);
  t.memoria.scrivi(CHIAVI.piano, { settimane: [{ lunedi: "2027-03-15" }], profilo: { eta: 52, sicurezza: "si" } });
  t.memoria.scrivi(CHIAVI.preferenze, { periodo: 30 });
  for (const [k, v] of Object.entries(DELICATI)) t.memoria.scrivi(k, v);
  t.locale.setItem(CHIAVE, CHIAVE_LUCIA);
  const esito = await entraConLeMie(t);
  assert.deepEqual(esito.inviati.sort(), [...IN_NUVOLA].sort());

  const mandate = scritture(db);
  assert.deepEqual(mandate.map((c) => c.corpo.chiave).sort(), [...IN_NUVOLA].sort());
  const profilo = mandate.find((c) => c.corpo.chiave === CHIAVI.profilo).corpo.valore;
  assert.deepEqual(profilo, { bici: "gravel", borseKg: 10, borseTipo: "bikepacking", palestra: "palestra", esperienza: "piuGiorni" });
  for (const c of mandate) {
    for (const campo of Object.keys(c.corpo.valore)) assert.ok(CAMPI[c.corpo.chiave].includes(campo), `è uscito il campo ${campo}`);
  }

  const tutto = db.chiamate.map((c) => c.testo + c.cerca).join("\n");
  for (const parola of ["aritmia", "ciclo", "pesoFascia", "fasciaEta", "palestraSicurezza", "stoMale", "febbre", "alcol", "medico", "rosso", "sforzo", "stomaco", "squat", "fame", "sicurezza", "settimane", "mediaDichiarata", "qualcosaDiNuovo", "altroCampo", CHIAVE_LUCIA]) {
    assert.equal(tutto.includes(parola), false, `è uscito «${parola}»`);
  }
});

test("un telefono nuovo ritrova tutto senza domande, e il primo giro lo dice", async () => {
  const db = databaseFinto();
  const vecchio = telefono(db);
  vecchio.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  vecchio.memoria.scrivi(CHIAVI.disponibilita, GIORNI);
  vecchio.memoria.scrivi(CHIAVI.profilo, PROFILO_PIENO);
  await entraConLeMie(vecchio);

  const nuovo = telefono(db);
  await entra(nuovo);
  const esito = await nuovo.nuvola.sincronizza(OGGI);
  assert.equal(esito.chiedi, null);
  assert.equal(esito.prima, true);
  assert.deepEqual(esito.ripreso.sort(), [...IN_NUVOLA].sort());
  assert.deepEqual(nuovo.memoria.leggi(CHIAVI.obiettivo), AVVENTURA);
  assert.deepEqual(nuovo.memoria.leggi(CHIAVI.disponibilita), GIORNI);
  assert.equal(nuovo.memoria.leggi(CHIAVI.profilo).bici, "gravel");
  assert.equal(nuovo.memoria.leggi(CHIAVI.profilo).aritmia, undefined);

  const secondo = await nuovo.nuvola.sincronizza(OGGI);
  assert.deepEqual([secondo.prima, secondo.ripreso, secondo.inviati], [false, [], []]);
});

test("al primo ingresso con scelte sul telefono e niente online si chiede, e prima non esce niente", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entra(t);
  const esito = await t.nuvola.sincronizza(OGGI);
  assert.deepEqual(esito.chiedi, { online: false });
  assert.deepEqual(esito.inviati, []);
  assert.equal(scritture(db).length, 0);
  // Chiude la pagina senza rispondere e riapre, e si chiede di nuovo.
  assert.deepEqual((await t.nuvola.sincronizza(OGGI)).chiedi, { online: false });
  const dopo = await t.nuvola.sincronizza(OGGI, { scelta: "telefono" });
  assert.deepEqual(dopo.inviati, [CHIAVI.obiettivo]);
  assert.equal((await t.nuvola.sincronizza(OGGI)).chiedi, null);
});

test("al primo ingresso con scelte diverse online e sul telefono si chiede, e non vince nessuno da solo", async () => {
  const db = databaseFinto();
  const a = telefono(db);
  a.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entraConLeMie(a);

  const b = telefono(db);
  b.orologio.t += 86400000;     // la scelta del telefono nuovo è più recente, ma non basta
  b.memoria.scrivi(CHIAVI.obiettivo, { tipo: "semaforo" });
  await entra(b);
  const esito = await b.nuvola.sincronizza(OGGI);
  assert.deepEqual(esito.chiedi, { online: true });
  assert.deepEqual(db.righe.get(ID_LUCIA).get(CHIAVI.obiettivo).valore, AVVENTURA, "online non cambia");

  const dopo = await b.nuvola.sincronizza(OGGI, { scelta: "online" });
  assert.deepEqual(dopo.ripreso, [CHIAVI.obiettivo]);
  assert.deepEqual(b.memoria.leggi(CHIAVI.obiettivo), AVVENTURA);
  assert.deepEqual(db.righe.get(ID_LUCIA).get(CHIAVI.obiettivo).valore, AVVENTURA);
  assert.deepEqual(a.memoria.leggi(CHIAVI.obiettivo), AVVENTURA);
});

test("chi sceglie il telefono manda le sue, e l'altro telefono le riprende", async () => {
  const db = databaseFinto();
  const a = telefono(db);
  a.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entraConLeMie(a);
  const b = telefono(db);
  b.memoria.scrivi(CHIAVI.obiettivo, ALTRA_AVVENTURA);
  await entra(b);
  assert.deepEqual((await b.nuvola.sincronizza(OGGI, { scelta: "telefono" })).inviati, [CHIAVI.obiettivo]);
  assert.deepEqual((await a.nuvola.sincronizza(OGGI)).ripreso, [CHIAVI.obiettivo]);
  assert.deepEqual(a.memoria.leggi(CHIAVI.obiettivo), ALTRA_AVVENTURA);
});

test("il profilo ripreso non cancella i campi che stanno solo sul telefono", async () => {
  const db = databaseFinto();
  const uno = telefono(db);
  const due = telefono(db);
  uno.memoria.scrivi(CHIAVI.profilo, PROFILO_PIENO);
  await entraConLeMie(uno);
  await entra(due);
  await due.nuvola.sincronizza(OGGI);
  due.memoria.scrivi(CHIAVI.profilo, { ...due.memoria.leggi(CHIAVI.profilo), borseKg: 15 });
  await due.nuvola.sincronizza(OGGI);

  const esito = await uno.nuvola.sincronizza(OGGI);
  assert.deepEqual(esito.ripreso, [CHIAVI.profilo]);
  const p = uno.memoria.leggi(CHIAVI.profilo);
  assert.equal(p.borseKg, 15);
  assert.equal(p.aritmia, true);
  assert.equal(p.fasciaEta, "50-54");
  assert.equal(p.palestraSicurezza, "si");
  const dopo = await uno.nuvola.sincronizza(OGGI);
  assert.deepEqual([dopo.ripreso, dopo.inviati], [[], []]);
});

test("cambiare solo un campo che resta sul telefono non manda niente", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.profilo, PROFILO_PIENO);
  await entraConLeMie(t);
  t.memoria.scrivi(CHIAVI.profilo, { ...t.memoria.leggi(CHIAVI.profilo), aritmia: null, fasciaEta: "55-59" });
  const esito = await t.nuvola.sincronizza(OGGI);
  assert.deepEqual([esito.inviati, esito.ripreso], [[], []]);
});

test("togliere l'ultimo campo che va online lo toglie anche online, senza toccare il resto", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.profilo, { borseKg: 10, fasciaEta: "50-54" });
  await entraConLeMie(t);
  t.memoria.scrivi(CHIAVI.profilo, { fasciaEta: "50-54" });
  const esito = await t.nuvola.sincronizza(OGGI);
  assert.deepEqual(esito.inviati, [CHIAVI.profilo]);
  assert.deepEqual(db.righe.get(ID_LUCIA).get(CHIAVI.profilo).valore, {});
  assert.deepEqual(t.memoria.leggi(CHIAVI.profilo), { fasciaEta: "50-54" });
});

test("una chiave rotta sul telefono non cancella niente online, e si riprende da lì", async () => {
  const db = databaseFinto();
  const a = telefono(db);
  const b = telefono(db);
  a.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entraConLeMie(a);
  await entra(b);
  await b.nuvola.sincronizza(OGGI);

  a.locale.setItem(CHIAVI.obiettivo, "{testo rotto");
  db.chiamate.length = 0;
  const esito = await a.nuvola.sincronizza(OGGI);
  assert.deepEqual([esito.tolti, esito.ripreso], [[], [CHIAVI.obiettivo]]);
  assert.equal(db.chiamate.filter((c) => c.metodo === "DELETE").length, 0);
  assert.deepEqual(a.memoria.leggi(CHIAVI.obiettivo), AVVENTURA);
  assert.deepEqual(db.righe.get(ID_LUCIA).get(CHIAVI.obiettivo).valore, AVVENTURA);
  await b.nuvola.sincronizza(OGGI);
  assert.deepEqual(b.memoria.leggi(CHIAVI.obiettivo), AVVENTURA);
});

test("una cosa che sparisce dal telefono torna da online, non si cancella", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.disponibilita, GIORNI);
  await entraConLeMie(t);
  t.memoria.togli(CHIAVI.disponibilita);
  const esito = await t.nuvola.sincronizza(OGGI);
  assert.deepEqual(esito.ripreso, [CHIAVI.disponibilita]);
  assert.ok(db.righe.get(ID_LUCIA).has(CHIAVI.disponibilita));
});

test("l'avventura finita da 3 mesi si toglie anche online e non torna, ed è l'unica cancellazione", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  t.memoria.scrivi(CHIAVI.disponibilita, GIORNI);
  await entraConLeMie(t);
  const dopo = "2027-09-15";
  t.memoria.pulisci(dopo);
  assert.equal(t.memoria.leggi(CHIAVI.obiettivo), null);
  const esito = await t.nuvola.sincronizza(dopo);
  assert.deepEqual([esito.tolti, esito.ripreso], [[CHIAVI.obiettivo], []]);
  assert.equal(t.memoria.leggi(CHIAVI.obiettivo), null);
  assert.equal(db.righe.get(ID_LUCIA).has(CHIAVI.obiettivo), false);
  assert.equal(db.righe.get(ID_LUCIA).has(CHIAVI.disponibilita), true);
  const canc = db.chiamate.filter((c) => c.metodo === "DELETE");
  assert.equal(canc.length, 1);
  assert.ok(canc[0].cerca.includes(`utente=eq.${ID_LUCIA}`));
});

test("decidi, tutti i casi", () => {
  const d = (qui, la, visto, tempi = {}) => decidi({ qui, la, visto, ...tempi });
  assert.equal(d(null, null, undefined), "niente");
  assert.equal(d("a", "a", undefined), "uguali");
  assert.equal(d("{}", null, undefined), "niente");
  assert.equal(d(null, "{}", "a"), "niente");
  assert.equal(d("a", null, undefined), "invia");
  assert.equal(d(null, "a", undefined), "prendi");
  assert.equal(d("b", "a", "a"), "invia");
  assert.equal(d("a", "b", "a"), "prendi");
  assert.equal(d(null, "a", "a"), "prendi", "mancare sul telefono non è cancellare");
  assert.equal(d("a", null, "a"), "invia", "mancare online non è cancellare");
  assert.equal(d("b", "c", "a", { tempoQui: 5, tempoLa: 3 }), "invia");
  assert.equal(d("b", "c", "a", { tempoQui: 3, tempoLa: 5 }), "prendi");
  assert.equal(d("b", "c", undefined, { tempoQui: 5, tempoLa: 3 }), "invia");
  assert.equal(d("{}", "c", undefined, { tempoQui: 5, tempoLa: 3 }), "prendi");
  assert.equal(d("b", "{}", undefined, { tempoQui: 3, tempoLa: 5 }), "invia");
  assert.equal(d("{}", "a", "a"), "invia", "ha tolto l'ultimo campo");

  const p = (qui, la, scelta) => decidiPrimaVolta({ qui, la, scelta });
  assert.equal(p(null, null, "telefono"), "niente");
  assert.equal(p("a", "a", "online"), "uguali");
  assert.equal(p("a", "b", "telefono"), "invia");
  assert.equal(p("a", "b", "online"), "prendi");
  assert.equal(p(null, "b", "telefono"), "prendi");
  assert.equal(p("a", null, "online"), "invia");
});

test("lo stesso oggetto con i campi in un altro ordine conta come uguale", () => {
  assert.equal(canonico({ a: 1, b: { d: [1, { y: 1, x: 2 }], c: 2 } }), canonico({ b: { c: 2, d: [1, { x: 2, y: 1 }] }, a: 1 }));
  assert.equal(canonico(null), null);
  assert.equal(versoNuvola(CHIAVI.mattino, { stoMale: ["febbre"] }), null);
  assert.deepEqual(versoNuvola(CHIAVI.profilo, { aritmia: true }), {});
  assert.deepEqual(versoNuvola(CHIAVI.obiettivo, { tipo: "semaforo", agg: 5 }), { tipo: "semaforo" });
  assert.equal(CAMPI[CHIAVI.profilo], CAMPI_PROFILO);
});

test("un'altra email sullo stesso telefono non legge e non scrive finché non si sceglie", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entraConLeMie(t);
  await t.nuvola.esci();
  assert.equal(t.nuvola.utente(), null);

  const { altroAccount } = await entra(t, "marco@example.invalid");
  assert.equal(altroAccount, true);
  db.chiamate.length = 0;
  const esito = await t.nuvola.sincronizza(OGGI);
  assert.equal(esito.fermo, true);
  assert.equal(db.chiamate.length, 0);
  assert.equal(db.righe.get(ID_MARCO), undefined);

  // Sceglie di togliere i dati di prima e di continuare.
  t.memoria.cancellaDati();
  t.nuvola.accettaTelefono();
  const dopo = await t.nuvola.sincronizza(OGGI);
  assert.equal(dopo.fermo, false);
  assert.equal(db.righe.get(ID_LUCIA).has(CHIAVI.obiettivo), true, "i dati di Lucia restano online");
  assert.equal(db.righe.get(ID_MARCO).size, 0);
});

test("chi non ha mai usato l'email esce, e chi entra dopo con la sua non si prende le sue scelte", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  // Marco entra su un telefono con le scelte di Lucia, che non ha mai avuto un account.
  const { altroAccount } = await entra(t, "marco@example.invalid");
  assert.equal(altroAccount, false);
  assert.deepEqual((await t.nuvola.sincronizza(OGGI)).chiedi, { online: false });
  assert.equal(scritture(db).length, 0);
  // Dice che non sono sue ed esce. Il telefono torna libero, e Lucia entra senza trovare un altro account.
  await t.nuvola.dimentica();
  assert.equal(t.locale.getItem(STATO), null);
  assert.deepEqual(t.memoria.leggi(CHIAVI.obiettivo), AVVENTURA);
  assert.equal((await entra(t)).altroAccount, false);
  assert.deepEqual((await t.nuvola.sincronizza(OGGI, { scelta: "telefono" })).inviati, [CHIAVI.obiettivo]);
  assert.equal(db.righe.get(ID_MARCO).size, 0);
  assert.ok(db.righe.get(ID_LUCIA).has(CHIAVI.obiettivo));
});

test("il telefono si lega all'account appena si entra, anche se il primo giro non riesce", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entra(t);
  db.rete = false;
  await assert.rejects(t.nuvola.sincronizza(OGGI), (e) => e.tipo === "rete");
  await t.nuvola.esci();
  db.rete = true;
  const { altroAccount } = await entra(t, "marco@example.invalid");
  assert.equal(altroAccount, true);
  assert.equal((await t.nuvola.sincronizza(OGGI)).fermo, true);
  assert.equal(scritture(db).length, 0);
});

test("dopo aver cancellato l'account, chi entra sullo stesso telefono si sente chiedere", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entraConLeMie(t);
  await t.nuvola.cancellaAccount();
  await entra(t, "marco@example.invalid");
  assert.deepEqual((await t.nuvola.sincronizza(OGGI)).chiedi, { online: false });
  assert.equal(db.righe.get(ID_MARCO).size, 0);
});

test("lo stesso account che rientra non deve scegliere, e ritrova quello che aveva", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entraConLeMie(t);
  await t.nuvola.esci();
  const { altroAccount } = await entra(t);
  assert.equal(altroAccount, false);
  const esito = await t.nuvola.sincronizza(OGGI);
  assert.deepEqual([esito.fermo, esito.chiedi], [false, null]);
});

test("l'account cancellato da un altro telefono non svuota questo, e rifarlo non chiede di cancellare", async () => {
  const db = databaseFinto();
  const a = telefono(db);
  const b = telefono(db);
  a.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  a.memoria.scrivi(CHIAVI.mattino, DELICATI[CHIAVI.mattino]);
  await entraConLeMie(a);
  await entra(b);
  await b.nuvola.sincronizza(OGGI);
  b.memoria.scrivi(CHIAVI.mattino, DELICATI[CHIAVI.mattino]);

  await a.nuvola.cancellaAccount();

  // Su b l'accesso vale ancora un po'. Il database è vuoto, ma il telefono non perde niente.
  await assert.rejects(b.nuvola.sincronizza(OGGI), (e) => e.tipo === "servizio");
  assert.deepEqual(b.memoria.leggi(CHIAVI.obiettivo), AVVENTURA);
  // Quando l'accesso scade si esce da soli.
  b.orologio.t += 3600 * 1000;
  await assert.rejects(b.nuvola.sincronizza(OGGI), (e) => e.tipo === "sessione");
  assert.equal(b.nuvola.utente(), null);

  // La stessa email rifà l'account con un numero nuovo. Non è un'altra persona.
  db.utenti.set("lucia@example.invalid", ID_LUCIA_NUOVA);
  const { altroAccount } = await entra(b);
  assert.equal(altroAccount, false);
  const esito = await b.nuvola.sincronizza(OGGI);
  assert.deepEqual([esito.chiedi, esito.inviati], [null, [CHIAVI.obiettivo]]);
  assert.deepEqual(b.memoria.leggi(CHIAVI.mattino), DELICATI[CHIAVI.mattino]);
});

test("una risposta strana del database non svuota il telefono", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entraConLeMie(t);
  db.rotta = { messaggio: "non è una lista" };
  await assert.rejects(t.nuvola.sincronizza(OGGI), (e) => e.tipo === "servizio");
  assert.deepEqual(t.memoria.leggi(CHIAVI.obiettivo), AVVENTURA);
  db.rotta = [];
  assert.deepEqual((await t.nuvola.sincronizza(OGGI)).inviati, [CHIAVI.obiettivo], "una lista vuota rimanda, non cancella");
  assert.deepEqual(t.memoria.leggi(CHIAVI.obiettivo), AVVENTURA);
});

test("chi esce mentre l'accesso si sta rinnovando resta fuori", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  await entra(t);
  await t.nuvola.sincronizza(OGGI);
  t.orologio.t += 3600 * 1000;
  let apri;
  db.cancelli["POST /auth/v1/token"] = new Promise((r) => { apri = r; });
  const giro = t.nuvola.sincronizza(OGGI);
  await new Promise((r) => setImmediate(r));
  await t.nuvola.esci();
  apri();
  await assert.rejects(giro, (e) => e.tipo === "uscito");
  assert.equal(t.nuvola.utente(), null);
  assert.equal(t.locale.getItem(SESSIONE), null);
});

test("chi cancella tutto durante il primo giro non si ritrova niente sul telefono", async () => {
  const db = databaseFinto();
  const a = telefono(db);
  a.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entraConLeMie(a);

  const t = telefono(db);
  await entra(t);
  let apri;
  db.cancelli["GET /rest/v1/dati"] = new Promise((r) => { apri = r; });
  const giro = t.nuvola.sincronizza(OGGI);
  await new Promise((r) => setImmediate(r));
  t.memoria.esciCancellaTutto();
  t.nuvola.esci();
  apri();
  const esito = await giro;
  assert.deepEqual(esito.ripreso, []);
  assert.equal(t.memoria.leggi(CHIAVI.obiettivo), null);
  assert.equal(t.locale.getItem(STATO), null);
  assert.equal(t.locale.getItem(SESSIONE), null);
});

test("fra due telefoni senza rete vale la scelta fatta dopo, non quella arrivata dopo", async () => {
  const db = databaseFinto();
  const orologioA = { t: Date.UTC(2027, 2, 15, 7, 0) };
  const orologioB = { t: Date.UTC(2027, 2, 15, 7, 0) };
  const a = telefono(db, orologioA);
  const b = telefono(db, orologioB);
  a.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entraConLeMie(a);
  await entra(b);
  await b.nuvola.sincronizza(OGGI);

  // B sceglie alle 8.30 e A alle 9.30, tutti e due senza rete.
  orologioB.t = Date.UTC(2027, 2, 15, 7, 30);
  b.memoria.scrivi(CHIAVI.obiettivo, ALTRA_AVVENTURA);
  orologioA.t = Date.UTC(2027, 2, 15, 8, 30);
  const scelta = { ...AVVENTURA, giorni: 5 };
  a.memoria.scrivi(CHIAVI.obiettivo, scelta);
  // B si collega alle 10.30 e A alle 11.30.
  orologioB.t = Date.UTC(2027, 2, 15, 9, 30);
  db.adesso = () => orologioB.t;
  await b.nuvola.sincronizza(OGGI);
  orologioA.t = Date.UTC(2027, 2, 15, 10, 30);
  db.adesso = () => orologioA.t;
  const esito = await a.nuvola.sincronizza(OGGI);
  assert.deepEqual(esito.inviati, [CHIAVI.obiettivo]);
  assert.deepEqual(a.memoria.leggi(CHIAVI.obiettivo), scelta);
  await b.nuvola.sincronizza(OGGI);
  assert.deepEqual(b.memoria.leggi(CHIAVI.obiettivo), scelta);
});

test("l'accesso si rinnova da solo prima di scadere, e una volta se il database lo rifiuta", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  await entra(t);
  t.orologio.t += 3600 * 1000;
  await t.nuvola.sincronizza(OGGI);
  assert.equal(db.rinnovi, 1);

  const s = JSON.parse(t.locale.getItem(SESSIONE));
  db.rifiutaAccesso = s.accesso;
  await t.nuvola.sincronizza(OGGI);
  assert.equal(db.rinnovi, 2);
  assert.notEqual(t.nuvola.utente(), null);
});

test("un rinnovo rifiutato chiude l'account ma lascia i dati sul telefono", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entra(t);
  const s = JSON.parse(t.locale.getItem(SESSIONE));
  db.gia.add(s.rinnovo);
  t.orologio.t += 3600 * 1000;
  await assert.rejects(t.nuvola.sincronizza(OGGI), (e) => e instanceof ErroreNuvola && e.tipo === "sessione");
  assert.equal(t.nuvola.utente(), null);
  assert.deepEqual(t.memoria.leggi(CHIAVI.obiettivo), AVVENTURA);
});

test("senza rete non si perde niente e al giro dopo si manda", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  await entra(t);
  await t.nuvola.sincronizza(OGGI);
  db.rete = false;
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await assert.rejects(t.nuvola.sincronizza(OGGI), (e) => e.tipo === "rete");
  assert.notEqual(t.nuvola.utente(), null);
  assert.deepEqual(t.memoria.leggi(CHIAVI.obiettivo), AVVENTURA);
  db.rete = true;
  assert.deepEqual((await t.nuvola.sincronizza(OGGI)).inviati, [CHIAVI.obiettivo]);
});

test("gli errori del codice e dell'email hanno il loro tipo", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  await assert.rejects(t.nuvola.chiediCodice("non-una-email"), (e) => e.tipo === "email");
  await assert.rejects(t.nuvola.verificaCodice("lucia@example.invalid", "12"), (e) => e.tipo === "codice");
  await assert.rejects(t.nuvola.verificaCodice("lucia@example.invalid", "999999"), (e) => e.tipo === "codice");
  assert.equal(t.nuvola.utente(), null);
  db.errore = { status: 429, dati: { error_code: "over_email_send_rate_limit" } };
  await assert.rejects(t.nuvola.chiediCodice("lucia@example.invalid"), (e) => e.tipo === "limite");
  db.errore = { status: 400, dati: { error_code: "email_address_not_authorized", msg: "Email address not authorized" } };
  await assert.rejects(t.nuvola.chiediCodice("lucia@example.invalid"), (e) => e.tipo === "posta");
  db.errore = { status: 500, dati: { msg: "Error sending magic link email" } };
  await assert.rejects(t.nuvola.chiediCodice("lucia@example.invalid"), (e) => e.tipo === "posta");
  db.errore = null;
  assert.equal(await t.nuvola.chiediCodice("  Lucia@Example.Invalid "), "lucia@example.invalid");
});

test("cancellare l'account toglie le righe online e il legame del telefono, i dati del telefono restano", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entraConLeMie(t);
  await t.nuvola.cancellaAccount();
  assert.equal(db.righe.get(ID_LUCIA), undefined);
  assert.equal(t.nuvola.utente(), null);
  assert.equal(t.locale.getItem(STATO), null);
  assert.deepEqual(t.memoria.leggi(CHIAVI.obiettivo), AVVENTURA);
});

test("la sessione non finisce mai nella copia di sicurezza, ed esce con «cancella tutto»", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entraConLeMie(t);
  const copia = JSON.stringify(t.memoria.copia(OGGI));
  assert.equal(copia.includes("accesso-"), false);
  assert.equal(copia.includes("rinnovo-"), false);
  t.memoria.esciCancellaTutto();
  assert.equal(t.locale.getItem(SESSIONE), null);
  assert.equal(t.locale.getItem(STATO), null);
  assert.equal(t.nuvola.utente(), null);
});

test("una sessione rotta nella memoria vale come nessuna sessione", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.locale.setItem(SESSIONE, "{non è json");
  assert.equal(t.nuvola.utente(), null);
  t.locale.setItem(SESSIONE, JSON.stringify({ accesso: 5 }));
  assert.equal(t.nuvola.utente(), null);
  const esito = await t.nuvola.sincronizza(OGGI);
  assert.deepEqual(esito.inviati, []);
  assert.equal(db.chiamate.length, 0);
});

test("due salvataggi insieme ne fanno partire uno e poi un altro, mai due in parallelo", async () => {
  const db = databaseFinto();
  const t = telefono(db);
  t.memoria.scrivi(CHIAVI.obiettivo, AVVENTURA);
  await entra(t);
  const [a, b] = await Promise.all([t.nuvola.sincronizza(OGGI, { scelta: "telefono" }), t.nuvola.sincronizza(OGGI)]);
  assert.equal(a, b);
  assert.deepEqual(a.inviati, [CHIAVI.obiettivo]);
  assert.equal(scritture(db).length, 1);
});
