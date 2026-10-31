// Dati di esempio: sei mesi di una ciclista inventata, Giulia.
// Servono a chi vuole vedere l'app prima di collegare il proprio account.
// Sono generati sempre uguali (seme fisso) e non c'entrano con nessuna persona vera.

import { aggiungiGiorni, giornoSettimana, calendario, baseHrv, baseFc, GIORNI_STORICO } from "./modello.js?v=202610311949";

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
};

export function generaDemo(oggi) {
  const rnd = generatore(20261101);
  const benessere = [];
  const uscite = [];
  let ctl = 26;
  let atl = 24;
  const N = GIORNI_STORICO;
  const inizioWeekend = N - 36; // un weekend lungo circa cinque settimane fa

  for (let k = 0; k < N; k++) {
    const d = aggiungiGiorni(oggi, k - (N - 1));
    const dow = giornoSettimana(d); // 0 lunedì
    const settimana = Math.floor(k / 7);
    const crescita = 0.75 + 0.45 * (k / N);
    const scarico = settimana % 4 === 3 ? 0.6 : 1;
    const f = crescita * scarico;

    // La notte riflette il carico fino a ieri.
    const forma = ctl - atl;
    const hrv = (50 + 0.25 * (ctl - 26)) * Math.exp(0.006 * Math.min(0, forma)) * Math.exp(0.07 * gaussiana(rnd));
    const fc = 54 - 0.06 * (ctl - 26) + 0.09 * Math.max(0, -forma) + gaussiana(rnd);
    const oreSonno = Math.min(9.3, Math.max(5.2, 7.2 + 0.5 * gaussiana(rnd) - (dow === 4 ? 0.4 : 0)));
    const punteggio = Math.min(97, Math.max(45, 62 + (oreSonno - 6) * 11 + 4 * gaussiana(rnd)));

    const giri = [];
    const giornoWeekend = k - inizioWeekend;
    if (k === N - 1) {
      // oggi: è mattina, niente giri
    } else if (giornoWeekend >= 0 && giornoWeekend < 3) {
      giri.push({ tipo: "GravelRide", nome: NOMI.weekend[giornoWeekend], minuti: [390, 450, 360][giornoWeekend], carico: [215, 255, 195][giornoWeekend], fc: 128, vel: 17 });
    } else if (rnd() > 0.1) {
      if (dow === 1) giri.push({ tipo: "Ride", nome: NOMI.martedi, minuti: 60, carico: 45 * f, fc: 132, vel: 26 });
      if (dow === 3) {
        const salita = settimana % 2 === 0;
        giri.push({ tipo: "Ride", nome: NOMI.giovedi[salita ? 0 : 1], minuti: 75, carico: 82 * f, fc: 145, vel: salita ? 22 : 29 });
      }
      if (dow === 2 && settimana % 2 === 0) giri.push({ tipo: "WeightTraining", nome: NOMI.palestra, minuti: 50, carico: 35, fc: 105, vel: 0 });
      if (dow === 5) {
        const gravel = settimana % 3 === 1;
        giri.push({ tipo: gravel ? "GravelRide" : "Ride", nome: NOMI.sabato[gravel ? 1 : 0], minuti: Math.round(170 * f + 30), carico: 150 * f, fc: 134, vel: gravel ? 19 : 25 });
      }
      if (dow === 6) giri.push({ tipo: "Ride", nome: NOMI.domenica, minuti: Math.round(110 * f + 10), carico: 95 * f, fc: 130, vel: 27 });
    }

    let caricoGiorno = 0;
    for (const g of giri) {
      const variazione = 1 + 0.12 * gaussiana(rnd);
      const carico = Math.max(10, Math.round(g.carico * variazione));
      const secondi = Math.round(g.minuti * 60 * (1 + 0.08 * gaussiana(rnd)));
      const metri = g.vel ? Math.round((g.vel * secondi) / 3.6) : 0;
      caricoGiorno += carico;
      uscite.push({
        id: `demo-${d}-${g.tipo}`,
        start_date_local: `${d}T${g.tipo === "WeightTraining" ? "18:30" : "08:15"}:00`,
        type: g.tipo,
        name: g.nome,
        source: "GARMIN_CONNECT",
        moving_time: secondi,
        distance: metri || null,
        total_elevation_gain: metri ? Math.round((metri / 1000) * (g.tipo === "GravelRide" ? 14 : 11) * (0.7 + 0.6 * rnd())) : null,
        icu_training_load: carico,
        average_heartrate: Math.round(g.fc + 4 * gaussiana(rnd)),
        icu_intensity: g.tipo === "WeightTraining" ? null : Math.round(100 * Math.sqrt(carico / (100 * (secondi / 3600)))),
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

  return { atleta: { firstname: "Giulia", name: "Giulia (esempio)" }, benessere, uscite };
}
