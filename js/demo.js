// Dati di esempio: sei mesi di una ciclista inventata, Giulia.
// Servono a chi vuole vedere l'app prima di collegare il proprio account.
// Sono generati sempre uguali (seme fisso) e non c'entrano con nessuna persona vera. Le date si contano
// da oggi, così l'esempio non invecchia mai.
// Oltre ai dati di intervals.icu c'è quello che l'app tiene sul telefono, così ogni pagina ha qualcosa
// da mostrare. Un'avventura della Bike Adventure Series fra dieci settimane, con i giorni in cui può
// pedalare, una febbre di due mesi fa ormai passata, un raffreddore tre settimane fa, un weekend in
// bikepacking cinque settimane fa, due prove con le borse, qualche giro arrivato da Strava senza
// dettagli, la palestra segnata nell'app e dall'orologio, e il controllo dell'ultima domenica.

import { aggiungiGiorni, giornoSettimana, calendario, baseHrv, baseFc, GIORNI_STORICO } from "./modello.js?v=202610312043";

function generatore(seme) {
  let a = seme >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussiana(rnd) {
  const u = Math.max(rnd(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

const NOMI = {
  martedi: "Uscita dopo il lavoro",
  giovedi: ["Ripetute in salita", "Ritmo in pianura"],
  sabato: ["Giro lungo in collina", "Gravel sulle strade bianche"],
  domenica: "Giro col gruppo",
  palestra: "Palestra",
  weekend: ["Weekend in bikepacking, giorno 1", "Weekend in bikepacking, giorno 2", "Weekend in bikepacking, giorno 3"],
  borse: "Prova con le borse",
  dueGiorni: ["Due giorni con le borse, primo", "Due giorni con le borse, secondo"],
};

// L'avventura di Giulia, il Tuscany Trail in cinque giorni (solo i totali pubblici del catalogo).
const PERCORSO = "tt-originale";
const GIORNI_EVENTO = 5;
const GIORNI_ALLA_PARTENZA = 70;

export function generaDemo(oggi) {
  const rnd = generatore(20261101);
  const benessere = [];
  const uscite = [];
  let ctl = 26;
  let atl = 24;
  const N = GIORNI_STORICO;
  const giorno = (k) => aggiungiGiorni(oggi, k - (N - 1));
  const febbre = [N - 62, N - 61, N - 60];       // una febbre di due mesi fa, poi passata
  const inizioWeekend = N - 36;                   // il weekend in bikepacking, cinque settimane fa
  const raffreddore = [N - 23, N - 22];           // due giorni di naso che cola, tre settimane fa
  const cenaTardi = N - 9;                        // una cena tardi e pesante la settimana scorsa
  // Il sabato di quattro settimane fa e quello di due settimane fa, le prove con le borse.
  const sabatoDa = (k) => { let j = k; while (giornoSettimana(giorno(j)) !== 5) j -= 1; return j; };
  const provaBorse = sabatoDa(N - 28);
  const dueGiorni = sabatoDa(N - 14);

  for (let k = 0; k < N; k++) {
    const d = giorno(k);
    const dow = giornoSettimana(d); // 0 lunedì
    const settimana = Math.floor(k / 7);
    const crescita = 0.75 + 0.45 * (k / N);
    const scarico = settimana % 4 === 3 ? 0.6 : 1;
    const f = crescita * scarico;
    const malata = febbre.includes(k) || febbre.includes(k - 1);

    // La notte riflette il carico fino a ieri, la febbre, il raffreddore e la cena tardi.
    const forma = ctl - atl;
    const storta = febbre.includes(k) ? 0.78 : raffreddore.includes(k) ? 0.84 : k === cenaTardi ? 0.9 : 1;
    const hrv = (50 + 0.25 * (ctl - 26)) * Math.exp(0.006 * Math.min(0, forma)) * Math.exp(0.07 * gaussiana(rnd)) * storta;
    const fc = 54 - 0.06 * (ctl - 26) + 0.09 * Math.max(0, -forma) + gaussiana(rnd)
      + (raffreddore.includes(k) ? 3 : 0) + (febbre.includes(k) ? 6 : 0);
    const oreSonno = Math.min(9.3, Math.max(5.2, 7.2 + 0.5 * gaussiana(rnd) - (dow === 4 ? 0.4 : 0)));
    const punteggio = Math.min(97, Math.max(45, 62 + (oreSonno - 6) * 11 + 4 * gaussiana(rnd)));

    const giri = [];
    const giornoWeekend = k - inizioWeekend;
    if (k === N - 1 || malata) {
      // oggi è mattina, e con la febbre niente giri
    } else if (giornoWeekend >= 0 && giornoWeekend < 3) {
      giri.push({ tipo: "GravelRide", nome: NOMI.weekend[giornoWeekend], minuti: [390, 450, 360][giornoWeekend], carico: [215, 255, 195][giornoWeekend], fc: 128, vel: 17 });
    } else if (k === provaBorse) {
      giri.push({ tipo: "GravelRide", nome: NOMI.borse, minuti: 240, carico: 190, fc: 127, vel: 17, id: "prova" });
    } else if (k === dueGiorni || k === dueGiorni + 1) {
      const j = k - dueGiorni;
      giri.push({ tipo: "GravelRide", nome: NOMI.dueGiorni[j], minuti: [330, 270][j], carico: [235, 185][j], fc: 126, vel: 16.5, id: `due${j}` });
    } else if (rnd() > 0.1) {
      if (dow === 1) giri.push({ tipo: "Ride", nome: NOMI.martedi, minuti: 60, carico: 45 * f, fc: 132, vel: 26 });
      if (dow === 3) {
        const salita = settimana % 2 === 0;
        giri.push({ tipo: "Ride", nome: NOMI.giovedi[salita ? 0 : 1], minuti: 75, carico: 82 * f, fc: 145, vel: salita ? 22 : 29 });
      }
      if (dow === 2 && settimana % 2 === 0) giri.push({ tipo: "WeightTraining", nome: NOMI.palestra, minuti: 50, carico: 12, fc: 105, vel: 0 });
      if (dow === 5) {
        const gravel = settimana % 3 === 1;
        giri.push({ tipo: gravel ? "GravelRide" : "Ride", nome: NOMI.sabato[gravel ? 1 : 0], minuti: Math.round(170 * f + 30), carico: 150 * f, fc: 134, vel: gravel ? 19 : 25 });
      }
      // La domenica col gruppo a volte arriva da Strava, e intervals.icu non ne passa i dettagli.
      if (dow === 6) giri.push({ tipo: "Ride", nome: NOMI.domenica, minuti: Math.round(110 * f + 10), carico: 95 * f, fc: 130, vel: 27, strava: settimana % 3 === 2 });
    }

    let caricoGiorno = 0;
    for (const g of giri) {
      const variazione = 1 + 0.12 * gaussiana(rnd);
      const carico = Math.max(10, Math.round(g.carico * variazione));
      const secondi = Math.round(g.minuti * 60 * (1 + 0.08 * gaussiana(rnd)));
      const metri = g.vel ? Math.round((g.vel * secondi) / 3.6) : 0;
      caricoGiorno += carico;
      const id = `demo-${d}-${g.id || g.tipo}`;
      if (g.strava) {
        uscite.push({
          id: `9${d.replace(/-/g, "")}`, start_date_local: `${d}T09:00:00`, source: "STRAVA",
          _note: "STRAVA activities are not available via the API",
        });
        continue;
      }
      uscite.push({
        id,
        start_date_local: `${d}T${g.tipo === "WeightTraining" ? "18:30" : "08:15"}:00`,
        type: g.tipo,
        name: g.nome,
        source: "GARMIN_CONNECT",
        moving_time: secondi,
        elapsed_time: Math.round(secondi * 1.12),
        distance: metri || null,
        total_elevation_gain: metri ? Math.round((metri / 1000) * (g.tipo === "GravelRide" ? 14 : 11) * (0.7 + 0.6 * rnd())) : null,
        icu_training_load: carico,
        average_heartrate: Math.round(g.fc + 4 * gaussiana(rnd)),
        has_heartrate: true,
        device_watts: false,
        trainer: false,
        commute: false,
      });
    }

    ctl += (caricoGiorno - ctl) / 42;
    atl += (caricoGiorno - atl) / 7;

    const notteMancante = rnd() < 0.04 && k < N - 1;
    benessere.push({
      id: d,
      ctl: Number(ctl.toFixed(2)),
      atl: Number(atl.toFixed(2)),
      atlLoad: caricoGiorno,
      hrv: notteMancante ? null : Math.round(hrv),
      restingHR: notteMancante ? null : Math.round(fc),
      sleepSecs: notteMancante ? null : Math.round(oreSonno * 3600),
      sleepScore: notteMancante ? null : Math.round(punteggio),
      injury: giornoWeekend >= 9 && giornoWeekend <= 11 ? 2 : null,
    });
  }

  // La notte di oggi: HRV appena sotto il normale, il resto in ordine.
  // È il caso più istruttivo da mostrare a chi prova l'app.
  const cal = calendario(benessere, oggi);
  const ultimo = cal.length - 1;
  const bh = baseHrv(cal, ultimo);
  const bf = baseFc(cal, ultimo);
  const oggiW = benessere[benessere.length - 1];
  if (bh.ok) oggiW.hrv = Math.round(bh.basso * 0.96);
  if (bf.ok) oggiW.restingHR = Math.round(bf.solito + 1);
  oggiW.sleepSecs = 7 * 3600 + 10 * 60;
  oggiW.sleepScore = 78;

  // Quello che Giulia ha segnato sul telefono nei mesi scorsi (comesto.mattino.v1 e comesto.esiti.v1).
  const diario = {
    [giorno(febbre[0])]: { stoMale: ["febbre", "dolori"] },
    [giorno(febbre[1])]: { stoMale: ["febbre"] },
    [giorno(febbre[2] + 2)]: { senzaFebbre: true },
    [giorno(raffreddore[0])]: { stoMale: ["naso"] },
    [giorno(raffreddore[1])]: { stoMale: ["naso", "gola"] },
    [giorno(cenaTardi)]: { cause: ["cena"] },
    [giorno(inizioWeekend)]: { inViaggio: { tipo: "viaggio", giorni: 3 } },
    [giorno(inizioWeekend + 2)]: { arrivato: true },
  };
  const storia = {};
  for (let j = 0; j < 3; j++) {
    storia[giorno(inizioWeekend + j)] = { livello: "verde", evento: { tipo: "viaggio", giorno: j + 1, giorni: 3 }, spiegato: true };
  }
  for (const k of febbre) storia[giorno(k)] = { livello: "rosso", stop: "malattia" };

  // Le risposte dopo i giri (comesto.uscite.v1). Le prove con le borse, il weekend, e qualche giro da
  // Strava descritto. Il sabato più recente resta senza la risposta sulle borse, così Oggi la chiede.
  const detti = {};
  const prova = uscite.find((u) => u.id === `demo-${giorno(provaBorse)}-prova`);
  if (prova) {
    detti[prova.id] = { giorno: giorno(provaBorse), borse: "evento", kg: 9, sforzo: 5, carte: { lunga: "fatta", prova: "fatta" },
      prova: { giorno: giorno(provaBorse), esito: "sistemare", aree: ["sedere", "borse"] } };
  }
  for (const j of [0, 1]) {
    const u = uscite.find((x) => x.id === `demo-${giorno(dueGiorni + j)}-due${j}`);
    if (!u) continue;
    detti[u.id] = { giorno: giorno(dueGiorni + j), borse: "evento", kg: 10, notteFuori: j === 0, sforzo: j === 0 ? 5 : 4, carte: { lunga: "fatta", prova: "fatta" } };
  }
  const due = uscite.find((x) => x.id === `demo-${giorno(dueGiorni + 1)}-due1`);
  if (due) detti[due.id].prova = { giorno: giorno(dueGiorni + 1), esito: "bene", aree: [] };
  for (let j = 0; j < 3; j++) {
    const w = uscite.find((x) => x.id === `demo-${giorno(inizioWeekend + j)}-GravelRide`);
    if (w) detti[w.id] = { giorno: giorno(inizioWeekend + j), borse: "evento", kg: 11, notteFuori: j < 2, carte: { lunga: "fatta" } };
  }
  const stub = uscite.filter((u) => u.source === "STRAVA");
  for (const s of stub.slice(0, -1)) {
    detti[s.id] = { giorno: s.start_date_local.slice(0, 10), tipo: "bici", secondi: 7200, sforzo: 5, borse: "no", carte: { stub: "fatta" } };
  }
  for (const u of uscite) {
    if (detti[u.id] || u.source === "STRAVA" || !(u.moving_time >= 2 * 3600)) continue;
    if (u.start_date_local.slice(0, 10) >= aggiungiGiorni(oggi, -6)) continue;
    detti[u.id] = { giorno: u.start_date_local.slice(0, 10), borse: "no", carte: { lunga: "fatta" } };
  }

  // La palestra segnata nell'app (comesto.palestra.v1), due sedute delle ultime settimane.
  const palestra = {};
  for (const [j, k] of [[1, N - 12], [2, N - 5]]) {
    const d = giorno(k);
    palestra[`${d}-1`] = {
      data: d, scheda: 3, seduta: j === 1 ? "A" : "B", settimana: j, minuti: 50, sforzo: 6, allenato: "gambe", fatta: "tutta",
      livello: "verde", esercizi: [],
    };
  }

  // Il controllo dell'ultima domenica (comesto.domenica.v1).
  let domenica = aggiungiGiorni(oggi, -1);
  while (giornoSettimana(domenica) !== 6) domenica = aggiungiGiorni(domenica, -1);
  const domeniche = {
    [domenica]: {
      giorno: domenica, conta: 0, segnali: { S1: false, S2: false, S3: false, S4: false, S5: false, S6: false, S7: false },
      proposta: { tipo: "continua" }, chiedi: null, medico: false, spento: false, crescita: null,
    },
  };

  const profilo = {
    fasciaEta: "40-49", dispositivo: "garmin", fasciaCardio: "si", esperienza: 3, palestra: "conosco", palestraSicurezza: "no",
    bici: "gravel", borseKg: 10,
  };
  const disponibilita = { giorni: [1, 3, 5, 6], stella: 5, ore: 8, tetti: [null, null, null, null, null, null, null], dueCose: false };
  const obiettivo = { tipo: "evento", percorso: PERCORSO, giorni: GIORNI_EVENTO, partenza: aggiungiGiorni(oggi, GIORNI_ALLA_PARTENZA) };

  return {
    atleta: { firstname: "Giulia", name: "Giulia (esempio)", timezone: "Europe/Rome", sportSettings: [{ types: ["Ride", "GravelRide"], lthr: 158, max_hr: 182 }] },
    benessere,
    uscite,
    diario,
    storia,
    profilo,
    obiettivo,
    disponibilita,
    detti,
    palestra,
    domenica: domeniche,
  };
}
