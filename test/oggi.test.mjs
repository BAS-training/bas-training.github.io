// Le regole della pagina Oggi che si provano senza il browser (7.4, 7.5, 7.9 e 6.4). Si lancia con
// node --test test/oggi.test.mjs
// La pagina si disegna nel browser, qui si provano le scelte che fa prima di disegnare. Solo persone
// e giri inventati.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  contoDellaCarta, occhielloCarta, sedutaDaMostrare, giroDiOggi, serveFatto, righeSpostate, righeDellaCarta,
  sforzoInTempo, campiCarta,
} from "../js/viste/oggi.js";
import { contoPartenza, titoloUscita, titoloStub, sedutaDiIeri, lHaiFatto, quando, saluto, CARTE } from "../js/testi-oggi.js";
import { OGGI, STO_MALE } from "../js/testi.js";
import { generaDemo } from "../js/demo.js";
import { calcola } from "../js/motore.js";

const OGGI_PROVA = "2027-03-14";   // una domenica

function ctxDi({ livello = "verde", giorniPartenza = 70, evento = null, obiettivo = null, seduta = null, esito = {}, attivita = [], piano = null, modello = null } = {}) {
  return {
    oggi: OGGI_PROVA,
    esito: { livello, stop: null, tetti: [], aggiunte: [], ...esito },
    giorno: { giorniPartenza, evento, malattia: null, cuore: null },
    obiettivo: obiettivo === null ? { tipo: "evento", percorso: { eventoId: "tt" } } : obiettivo,
    seduta,
    attivita,
    piano,
    modello: modello || { oggi: OGGI_PROVA, diario: {}, giorni: [{}] },
    palestra: { registro: [], oggi: null },
  };
}

const sedutaFacile = (minuti = 75) => ({
  titolo: "Giro facile, 1 ora e 15", come: "A ritmo da chiacchiera.", righe: [], tasti: ["fatto", "nonPosso"],
  seduta: { tipo: "facile", minuti }, palestra: null, sera: null,
});

test("il conto alla partenza, in settimane da due settimane in su, con il nome dell'evento", () => {
  assert.equal(contoPartenza(70, "al Tuscany Trail"), "Mancano 10 settimane al Tuscany Trail");
  assert.equal(contoPartenza(14, null), "Mancano 2 settimane alla partenza");
  assert.equal(contoPartenza(13, null), "Mancano 13 giorni alla partenza");
  assert.equal(contoPartenza(1, "al Tuscany Trail"), "Domani si parte");
  assert.equal(contoPartenza(0, null), "Oggi si parte");
  assert.equal(contoPartenza(-3, null), null);
  assert.equal(contoDellaCarta(ctxDi()), "Mancano 10 settimane al Tuscany Trail");
  assert.equal(contoDellaCarta(ctxDi({ obiettivo: { tipo: "libero", percorso: { eventoId: null } } })), "Mancano 10 settimane alla partenza");
  assert.equal(contoDellaCarta(ctxDi({ giorniPartenza: null })), null);
});

test("l'occhiello ha il colore e il conto, e il colore non si ripete nel titolo", () => {
  const s = sedutaFacile();
  assert.equal(occhielloCarta(ctxDi({ seduta: s }), s.titolo, true), "Via libera · Mancano 10 settimane al Tuscany Trail");
  assert.equal(occhielloCarta(ctxDi({ livello: "giallo" }), "Giornata tranquilla, giro facile di 45 minuti", true), "Mancano 10 settimane al Tuscany Trail");
  assert.equal(occhielloCarta(ctxDi({ livello: "rosso" }), "Oggi recupera", true), "Mancano 10 settimane al Tuscany Trail");
  assert.equal(occhielloCarta(ctxDi({ livello: "giallo-leggero" }), s.titolo, true), "Vai, ma senza esagerare · Mancano 10 settimane al Tuscany Trail");
  // senza la seduta il titolo è già il colore, come nel rilascio 1
  assert.equal(occhielloCarta(ctxDi(), "Via libera", false), "Mancano 10 settimane al Tuscany Trail");
  assert.equal(occhielloCarta(ctxDi({ giorniPartenza: null }), "Via libera", false), OGGI.occhiello);
  assert.equal(occhielloCarta(ctxDi({ giorniPartenza: null }), s.titolo, true), "Via libera");
  // in viaggio il giorno del viaggio
  assert.equal(occhielloCarta(ctxDi({ evento: { tipo: "viaggio", giorno: 2, giorni: 4 } }), s.titolo, true), "Giorno 2 di 4");
});

test("la carta mostra la seduta del piano, salvo stop, viaggio, attesa del medico e naso che cola", () => {
  const s = sedutaFacile();
  assert.equal(sedutaDaMostrare(ctxDi({ seduta: s })), s);
  assert.equal(sedutaDaMostrare(ctxDi({ seduta: null })), null);
  assert.equal(sedutaDaMostrare(ctxDi({ seduta: s, esito: { stop: "dolore" } })), null);
  assert.equal(sedutaDaMostrare(ctxDi({ seduta: s, evento: { tipo: "viaggio", giorno: 1, giorni: 3 } })), null);
  assert.equal(sedutaDaMostrare(ctxDi({ seduta: s, evento: { tipo: "evento", giorno: 2, giorni: 5 } })), null);
  // dal giorno 2 di un weekend del piano vale la seduta del piano
  assert.equal(sedutaDaMostrare(ctxDi({ seduta: s, evento: { tipo: "weekend", giorno: 2, giorni: 2 } })), s);
  const attesa = ctxDi({ seduta: s });
  attesa.giorno.malattia = { attesa: true };
  assert.equal(sedutaDaMostrare(attesa), null);
  const cuore = ctxDi({ seduta: s });
  cuore.giorno.cuore = { aperto: true, ultimo: "2027-03-12" };
  assert.equal(sedutaDaMostrare(cuore), null);
  // con i soli sintomi sopra il collo al massimo un'ora facile, quindi un giro più lungo lascia il semaforo
  const collo = { tetti: [{ chiave: "sopraIlCollo", livello: "giallo" }] };
  assert.equal(sedutaDaMostrare(ctxDi({ seduta: sedutaFacile(90), esito: collo })), null);
  const corta = sedutaFacile(45);
  assert.equal(sedutaDaMostrare(ctxDi({ seduta: corta, esito: collo })), corta);
});

test("«Fatto» compare solo se il giro di oggi non arriverà da solo", () => {
  const giro = (giorno, extra = {}) => ({ id: `g-${giorno}`, giorno, tipo: "Ride", secondi: 3600, manuale: false, stub: false, ...extra });
  // i giri arrivano da un dispositivo
  assert.equal(serveFatto(ctxDi({ attivita: [giro("2027-03-04")] })), false);
  // da Strava arrivano senza dettagli, ma arrivano
  assert.equal(serveFatto(ctxDi({ attivita: [giro("2027-03-04", { stub: true, tipo: null, secondi: null })] })), false);
  // solo giri a mano, o nessun giro
  assert.equal(serveFatto(ctxDi({ attivita: [giro("2027-03-04", { manuale: true })] })), true);
  assert.equal(serveFatto(ctxDi({ attivita: [] })), true);
  // un giro arrivato da un dispositivo più di sei settimane fa non conta
  assert.equal(serveFatto(ctxDi({ attivita: [giro("2027-01-10")] })), true);
  // il giro di oggi c'è già
  const oggi = ctxDi({ attivita: [giro(OGGI_PROVA, { manuale: true })] });
  assert.equal(giroDiOggi(oggi), true);
  assert.equal(serveFatto(oggi), false);
  // la palestra di oggi non è il giro di oggi
  assert.equal(giroDiOggi(ctxDi({ attivita: [giro(OGGI_PROVA, { tipo: "WeightTraining" })] })), false);
});

test("«Oggi non posso» dice dove va la seduta, e le righe della carta non si ripetono", () => {
  const piano = {
    spostamenti: [
      { data: OGGI_PROVA, da: OGGI_PROVA, a: "2027-03-20", tipo: "lunga", motivo: "nonPosso" },
      { data: OGGI_PROVA, da: OGGI_PROVA, a: null, tipo: "media", motivo: "nonPosso" },
      { data: OGGI_PROVA, da: OGGI_PROVA, a: "2027-03-15", tipo: "palestra", motivo: "nonPosso" },
      // quelli del semaforo li ridice già la seduta, e quelli di ieri non contano
      { data: OGGI_PROVA, da: OGGI_PROVA, a: "2027-03-16", tipo: "lunga", motivo: "semaforo" },
      { data: "2027-03-13", da: "2027-03-13", a: "2027-03-16", tipo: "lunga", motivo: "nonPosso" },
    ],
  };
  const righe = righeSpostate(ctxDi({ piano }));
  assert.equal(righe.length, 3);
  assert.match(righe[0], /^La lunga va a sabato 20 marzo\.$/);
  assert.match(righe[1], /saltano/);
  assert.equal(righe[2], "La palestra di domenica passa a lunedì.");
  assert.deepEqual(righeSpostate(ctxDi({ piano: null })), []);

  const s = { ...sedutaFacile(), righe: ["Tieni il battito sotto 126.", "Se hai sonno, oggi evita il traffico e i percorsi tecnici."], sera: "Stasera mangia bene." };
  const tutte = righeDellaCarta(ctxDi({ esito: { aggiunte: ["Se hai sonno, oggi evita il traffico e i percorsi tecnici.", STO_MALE.sopraIlCollo] } }), s);
  assert.deepEqual(tutte, ["Tieni il battito sotto 126.", "Se hai sonno, oggi evita il traffico e i percorsi tecnici.", STO_MALE.sopraIlCollo, "Stasera mangia bene."]);
  const conPalestra = righeDellaCarta(ctxDi(), { ...sedutaFacile(), tasti: ["scheda", "fatto", "nonPosso"], palestra: { titolo: "Palestra" } });
  assert.ok(conPalestra.some((r) => /anche la palestra/.test(r)));
});

test("lo sforzo si chiede da 30 minuti dopo la fine fino a mezzogiorno del giorno dopo", () => {
  const carta = { giorno: "2027-03-13", fine: "2027-03-13T12:46:00" };
  assert.equal(sforzoInTempo(carta, "2027-03-13T13:00"), false);
  assert.equal(sforzoInTempo(carta, "2027-03-13T13:20"), true);
  assert.equal(sforzoInTempo(carta, "2027-03-14T08:30"), true);
  assert.equal(sforzoInTempo(carta, "2027-03-14T11:59"), true);
  assert.equal(sforzoInTempo(carta, "2027-03-14T12:00"), false);
  assert.equal(sforzoInTempo(carta, null), true);
});

test("le risposte delle carte hanno la forma di rispondiCarta", () => {
  assert.deepEqual(campiCarta("lunga", { sforzo: "5", borse: "evento", kg: "10", notte: "si", stomaco: "bene" }, { grammi: 35 }),
    { sforzo: 5, borse: "evento", kg: 10, notteFuori: true, stomaco: "bene", grammi: 35 });
  assert.deepEqual(campiCarta("lunga", { borse: "no", kg: "10", notte: "si" }), { borse: "no" });
  assert.deepEqual(campiCarta("lunga", { borse: "parte", kg: "8", kgAltro: "7,5" }), { borse: "parte", kg: 7.5 });
  assert.equal(campiCarta("lunga", {}), null);
  assert.equal(campiCarta("lunga", { sforzo: "4" }), null, "solo i cinque valori della scala");
  assert.deepEqual(campiCarta("stub", { tipo: "bici", durata: "180", sforzo: "7", borse: "parte", kg: "8", km: "62,5", dislivello: "900" }),
    { tipo: "bici", secondi: 10800, sforzo: 7, borse: "parte", kg: 8, metri: 62500, dislivello: 900 });
  assert.deepEqual(campiCarta("stub", { tipo: "palestra", durata: "altro", ore: "1", minuti: "15" }), { tipo: "palestra", secondi: 4500 });
  // km e dislivello lasciati vuoti non diventano zero
  assert.deepEqual(campiCarta("stub", { tipo: "bici", durata: "150", borse: "evento", kg: "10" }), { tipo: "bici", secondi: 9000, borse: "evento", kg: 10 });
  assert.deepEqual(campiCarta("stub", { tipo: "bici", durata: "150", borse: "evento", dislivello: "0" }), { tipo: "bici", secondi: 9000, borse: "evento", dislivello: 0 });
  assert.deepEqual(campiCarta("stub", { tipo: "bici", durata: "altro" }), { errore: CARTE.stub.durata.manca, campo: "ore" });
  assert.deepEqual(campiCarta("palestra", { allenato: "gambe", sforzo: "3" }), { allenato: "gambe", sforzo: 3 });
  assert.deepEqual(campiCarta("palestra", { allenato: "braccia", sforzo: "9" }), { sforzo: 9 });
  assert.deepEqual(campiCarta("seduta", {}), { risposta: "diverso" });
  assert.deepEqual(campiCarta("seduta", { durata: "90", sforzo: "5" }), { risposta: "diverso", minuti: 90, sforzo: 5 });
  assert.deepEqual(campiCarta("prova", { aree: [] }, { giorno: "2027-03-13" }), { errore: CARTE.prova.nessuna, campo: "aree" });
  assert.deepEqual(campiCarta("prova", { aree: ["mani", "orecchie", "borse"] }, { giorno: "2027-03-13" }),
    { prova: { esito: "sistemare", aree: ["mani", "borse"], giorno: "2027-03-13" } });
});

test("i testi delle carte, senza due punti e con le durate in parole", () => {
  assert.equal(titoloUscita("2027-03-13", OGGI_PROVA, 190, 62000), "L'uscita di ieri, 3 ore e 10, 62 km");
  assert.equal(titoloUscita(OGGI_PROVA, OGGI_PROVA, 70, 8500), "L'uscita di oggi, 1 ora e 10, 8,5 km");
  assert.equal(quando("2027-03-07", OGGI_PROVA), "di domenica 7 marzo");
  assert.equal(titoloStub("2027-03-06", OGGI_PROVA, "8.30"), "L'uscita di sabato 6 marzo alle 8.30");
  assert.equal(sedutaDiIeri({ tipo: "facile", minuti: 60 }), "Ieri nel piano c'era un giro facile, 1 ora");
  assert.equal(sedutaDiIeri({ tipo: "lunga", minuti: 240 }), "Ieri nel piano c'era un'uscita lunga, 4 ore");
  assert.equal(lHaiFatto({ tipo: "lunga" }), "L'hai fatta?");
  assert.equal(lHaiFatto({ tipo: "facile" }), "L'hai fatto?");
  assert.equal(saluto(8, "Lucia"), "Buongiorno, Lucia");
  assert.equal(saluto(19, null), "Buonasera");
  for (const t of [titoloUscita("2027-03-13", OGGI_PROVA, 190, 62000), titoloStub("2027-03-06", OGGI_PROVA, "8.30"), sedutaDiIeri({ tipo: "T3", minuti: 380 })]) {
    assert.ok(!t.includes(":"), t);
  }
});

test("con l'esempio la carta di oggi ha una seduta, il conto con l'evento e al massimo due carte in più", () => {
  // L'esempio di Giulia, inventato, in una domenica e in un mercoledì.
  for (const [oggi, adesso] of [["2026-11-01", "2026-11-01T08:30"], ["2026-11-04", "2026-11-04T19:00"]]) {
    const d = generaDemo(oggi);
    const telefono = {
      preferenze: {}, profilo: { ...d.profilo }, obiettivo: d.obiettivo, disponibilita: d.disponibilita, piano: null,
      uscite: { ...d.detti }, palestra: { ...d.palestra }, mattino: { ...d.diario }, esiti: { ...d.storia }, domenica: { ...d.domenica }, invito: null,
    };
    const r = calcola({ oggi, adesso, letture: { atleta: d.atleta, benessere: d.benessere, attivita: d.uscite }, telefono, ui: {} });
    const ctx = { ...r, profilo: telefono.profilo, ui: {}, demo: true };
    const s = sedutaDaMostrare(ctx);
    assert.ok(s && typeof s.titolo === "string" && s.titolo.length > 0, oggi);
    assert.match(occhielloCarta(ctx, s.titolo, true), /al Tuscany Trail/);
    assert.ok(r.carteInPiu.length <= 2, oggi);
    for (const riga of righeDellaCarta(ctx, s)) assert.ok(!riga.includes(":"), riga);
  }
});
