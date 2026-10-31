// Il semaforo del mattino. Ogni "voce" (HRV, battito a riposo, sonno, carico recente,
// acciacchi, sensazioni) dà verde, giallo o rosso; le voci senza dati non votano.
// Le regole sono scritte anche nella Guida (js/testi.js, GUIDA_SEMAFORO): se cambi qui, cambia anche là.
// Le soglie sono state riviste il 31/10/2026 contro la letteratura e una simulazione su un ciclista
// sano: le prime regole davano verde solo in metà dei giorni normali.

import { numero, durata } from "./formato.js?v=202610312043";

export const LIVELLI = {
  verde: {
    colore: "verde",
    titolo: "Via libera",
    consiglio: "Nessun segnale di stanchezza nei numeri. Se ti senti bene, oggi puoi spingere o fare il giro lungo.",
  },
  "giallo-leggero": {
    colore: "giallo",
    titolo: "Vai, ma senza esagerare",
    consiglio: "Allenamento normale, ma niente sforzi al massimo. Se in salita le gambe non rispondono, rallenta.",
  },
  giallo: {
    colore: "giallo",
    titolo: "Giornata tranquilla",
    consiglio: "Meglio un giro facile e corto, un'ora o un'ora e mezza a ritmo da chiacchiera. Vanno bene anche stretching o palestra leggera.",
  },
  rosso: {
    colore: "rosso",
    titolo: "Oggi recupera",
    consiglio: "Più segnali dicono che sei sotto sforzo. Una passeggiata va benissimo. Se proprio esci in bici, al massimo un'ora, piano.",
  },
  nessuno: {
    colore: "neutro",
    titolo: "Ancora pochi dati",
    consiglio: "Il semaforo parte dalla prima notte e dal primo giro registrati, e diventa completo in due settimane. Intanto rispondi alle domande del mattino.",
  },
};

const VERDE_SENZA_NOTTE = "In allenamento sei in linea. Se ti senti bene, oggi puoi spingere.";

export const ESITO_VOCE = {
  verde: "a posto",
  giallo: "attenzione",
  rosso: "frena",
  neutro: "non conta oggi",
};

function voce(chiave, nome, colore, testo, extra = {}) {
  return { chiave, nome, colore, testo, ...extra };
}

const ultimo = (m) => m.giorni[m.giorni.length - 1];
const SINCRONIZZA = "Stanotte non è ancora arrivato. Sincronizza l'orologio e premi Aggiorna.";

export function voceHrv(m) {
  const nome = "HRV della notte";
  const oggi = ultimo(m).hrv;
  const b = m.base.hrv;
  if (!m.hrvMisurato) {
    return voce("hrv", nome, "neutro", "Il tuo orologio non lo misura, oppure non lo manda a intervals.icu.");
  }
  if (!oggi) return voce("hrv", nome, "neutro", SINCRONIZZA);
  if (!b.ok) {
    return voce("hrv", nome, "neutro",
      `Stanotte ${numero(oggi)} ms. Sto ancora imparando il tuo normale, ho ${b.n} notti su 14.`);
  }
  const fascia = `il tuo normale è ${numero(b.basso)}–${numero(b.alto)}`;
  const settimanaBassa = m.hrvSettimana !== null && m.hrvSettimana < b.soglia;
  if (oggi < b.moltoBasso || (settimanaBassa && oggi < b.basso)) {
    return voce("hrv", nome, "rosso", settimanaBassa
      ? `Stanotte ${numero(oggi)} ms, sotto il normale da più notti (${fascia}). Il corpo sta ancora recuperando.`
      : `Stanotte ${numero(oggi)} ms, molto sotto il normale (${fascia}).`, { valore: oggi });
  }
  if (oggi < b.basso) {
    return voce("hrv", nome, "giallo", `Stanotte ${numero(oggi)} ms, un po' sotto il normale (${fascia}).`, { valore: oggi });
  }
  if (settimanaBassa) {
    return voce("hrv", nome, "giallo",
      `Stanotte ${numero(oggi)} ms, nel normale, ma la media della settimana è bassa (${numero(m.hrvSettimana)}). Il recupero non è finito.`,
      { valore: oggi });
  }
  if (oggi > b.alto) {
    return voce("hrv", nome, "verde", `Stanotte ${numero(oggi)} ms, sopra il tuo normale (${fascia}).`, { valore: oggi });
  }
  return voce("hrv", nome, "verde", `Stanotte ${numero(oggi)} ms, nel tuo normale (${fascia}).`, { valore: oggi });
}

export function voceFc(m) {
  const nome = "Battito a riposo";
  const oggi = ultimo(m).fc;
  const b = m.base.fc;
  if (!oggi) {
    return voce("fc", nome, "neutro", m.giorni.some((g) => g.fc)
      ? SINCRONIZZA
      : "Non arriva da nessun dispositivo. Serve un orologio o un anello che lo misuri di notte.");
  }
  if (!b.ok) {
    return voce("fc", nome, "neutro",
      `Stanotte ${numero(oggi)} battiti. Sto ancora imparando il tuo normale, ho ${b.n} notti su 7.`);
  }
  const diff = Math.round(oggi - b.solito);
  const normale = `il tuo normale è ${numero(b.solito)}`;
  if (diff >= 5) return voce("fc", nome, "rosso", `${numero(oggi)} battiti, ${diff} sopra il normale (${normale}). È un campanello forte.`, { valore: oggi });
  if (diff >= 3) return voce("fc", nome, "giallo", `${numero(oggi)} battiti, ${diff} sopra il normale (${normale}).`, { valore: oggi });
  if (diff >= 1) return voce("fc", nome, "verde", `${numero(oggi)} battiti, appena sopra il normale (${normale}).`, { valore: oggi });
  return voce("fc", nome, "verde", `${numero(oggi)} battiti, nel tuo normale o sotto (${normale}).`, { valore: oggi });
}

// Sonno: conta soprattutto la notte molto corta, e il debito che si accumula in una settimana.
export function voceSonno(m) {
  const nome = "Sonno";
  const g = ultimo(m);
  if (!g.sonno && !g.punteggioSonno) {
    return voce("sonno", nome, "neutro", m.giorni.some((x) => x.sonno) ? SINCRONIZZA : "Non arriva da nessun dispositivo.");
  }
  const ore = g.sonno ? g.sonno / 3600 : null;
  const p = g.punteggioSonno;
  const settimana = m.sonnoSettimana;
  let colore = "verde";
  if ((ore !== null && ore < 5) || (p !== null && p < 50)) colore = "rosso";
  else if ((ore !== null && ore < 6) || (p !== null && p < 60) || (settimana !== null && settimana < 6.5 * 3600)) colore = "giallo";
  const parti = [];
  if (ore !== null) parti.push(`Hai dormito ${durata(g.sonno)}`);
  if (p !== null) parti.push(`${ore !== null ? "punteggio" : "Punteggio della notte"} ${numero(p)}`);
  let coda = "";
  if (colore === "rosso") coda = " Notte corta, oggi la fatica si sentirà di più.";
  else if (colore === "giallo") {
    coda = (ore !== null && ore < 6) || (p !== null && p < 60)
      ? " Un po' poco."
      : ` Questa settimana dormi poco, in media ${durata(settimana)}.`;
  }
  return voce("sonno", nome, colore, parti.join(", ") + "." + coda, { valore: ore });
}

// Carico recente: la Fatica di ieri sera confrontata con la Fitness, il "solito" degli ultimi 42 giorni.
// Serve sia il rapporto sia una differenza vera in punti, altrimenti con una base piccola basta un giro.
export function voceCarico(m) {
  const nome = "Carico recente";
  const { ctl, atl, rapporto } = m.mattino;
  if (ctl === null || atl === null || rapporto === null) {
    return voce("carico", nome, "neutro", "Non c'è ancora nessun giro registrato.");
  }
  if (ctl < 5) {
    return voce("carico", nome, "neutro", "Hai ancora pochi giri registrati. Qui conto poco, quindi non voto.");
  }
  const volte = numero(rapporto, 1);
  const diff = atl - ctl;
  if (rapporto > 1.5 && diff >= 25) {
    return voce("carico", nome, "rosso",
      `Negli ultimi giorni hai fatto ${volte} volte il tuo solito, molto più di quello a cui il corpo è abituato. Uno o due giorni facili lo aiutano ad assorbirlo.`, { valore: rapporto });
  }
  if (rapporto > 1.3 && diff >= 15) {
    return voce("carico", nome, "giallo", `Negli ultimi giorni hai fatto ${volte} volte il tuo solito. Stai caricando parecchio.`, { valore: rapporto });
  }
  if (rapporto < 0.8) {
    return voce("carico", nome, "verde", "Negli ultimi giorni hai fatto meno del solito. Sei riposato.", { valore: rapporto });
  }
  return voce("carico", nome, "verde", "Negli ultimi giorni sei in linea con il tuo solito.", { valore: rapporto });
}

// Acciacchi: la risposta di oggi, o quella di ieri se oggi non hai risposto.
export function voceAcciacchi(m) {
  const i = m.giorni.length - 1;
  const oggi = m.giorni[i].infortunio;
  const ieri = i > 0 ? m.giorni[i - 1].infortunio : null;
  const v = oggi ?? ieri;
  if (!v) return null;
  const quando = oggi ? "" : " (lo hai segnato ieri)";
  const nome = "Acciacchi";
  if (v >= 4) return voce("acciacchi", nome, "rosso", `Hai segnato un infortunio${quando}.`, { valore: v, ferma: true });
  if (v >= 3) return voce("acciacchi", nome, "rosso", `Hai segnato un dolore${quando}.`, { valore: v, ferma: true });
  if (v >= 2) return voce("acciacchi", nome, "giallo", `Hai segnato un fastidio${quando}. Oggi niente sforzi che lo peggiorano.`, { valore: v });
  return voce("acciacchi", nome, "verde", "Nessun acciacco segnato.", { valore: v });
}

// Come ti senti: energia (fatigue) e gambe (soreness), con le parole delle tue risposte.
export function voceSensazioni(m) {
  const g = ultimo(m);
  const energia = g.fatica;
  const gambe = g.dolori;
  if (!energia && !gambe) return null;
  const nome = "Come ti senti";
  const peggio = Math.max(energia || 0, gambe || 0);
  const pezzi = [];
  if (energia >= 4) pezzi.push("sei a pezzi");
  else if (energia === 3) pezzi.push("hai poca energia");
  if (gambe >= 4) pezzi.push("le gambe sono molto doloranti");
  else if (gambe === 3) pezzi.push("le gambe sono un po' indolenzite");
  if (peggio >= 3) {
    return voce("sensazioni", nome, peggio >= 4 ? "rosso" : "giallo", `Hai detto che ${pezzi.join(" e che ")}.`,
      { valore: peggio, ferma: peggio >= 4 });
  }
  const benissimo = (energia || 2) === 1 && (gambe || 2) <= 2;
  return voce("sensazioni", nome, "verde", benissimo ? "Hai detto che hai tanta energia." : "Hai detto che ti senti normale.",
    { valore: benissimo ? 1 : 2 });
}

// Il corpo manda qualche dato della notte? Se no, le tre voci della notte diventano una sola.
function vociNotte(m) {
  const qualcosa = m.giorni.some((g) => g.hrv || g.fc || g.sonno);
  if (!qualcosa) {
    return [voce("notte", "La notte", "neutro",
      "HRV, battito a riposo e sonno non arrivano da nessun dispositivo. Il semaforo guarda allenamento e risposte del mattino.")];
  }
  return [voceHrv(m), voceFc(m), voceSonno(m)];
}

export function valuta(m) {
  const voci = [...vociNotte(m), voceCarico(m), voceAcciacchi(m), voceSensazioni(m)].filter(Boolean);
  const attive = voci.filter((v) => v.colore !== "neutro");
  const rossi = attive.filter((v) => v.colore === "rosso").length;
  const gialli = attive.filter((v) => v.colore === "giallo").length;
  const ferma = voci.find((v) => v.ferma);

  let livello;
  if (!attive.length) livello = "nessuno";
  else if (ferma || rossi >= 2 || (rossi >= 1 && gialli >= 1)) livello = "rosso";
  else if (rossi === 1 || gialli >= 2) livello = "giallo";
  else if (gialli === 1) livello = "giallo-leggero";
  else livello = "verde";

  const esito = { livello, ...LIVELLI[livello], voci, nota: null, rossi, gialli };
  const corpo = voci.filter((v) => ["hrv", "fc", "sonno"].includes(v.chiave) && v.colore !== "neutro");

  // Un dolore, un infortunio o "a pezzi" fermano sempre, qualunque cosa dicano i numeri.
  if (ferma && ferma.chiave === "acciacchi") {
    esito.consiglio = ferma.valore >= 4
      ? "Hai segnato un infortunio. Oggi niente bici. Se il dolore è forte o non passa in pochi giorni, fatti vedere da un medico o da un fisioterapista."
      : "Hai segnato un dolore. Oggi lascialo riposare. Se non passa in pochi giorni, fatti vedere da un medico o da un fisioterapista.";
  } else if (ferma) {
    esito.consiglio = "Hai detto che sei a pezzi o che le gambe sono molto doloranti. Oggi riposo, o al massimo una passeggiata.";
  } else if (livello === "verde" && corpo.length === 0) {
    esito.consiglio = VERDE_SENZA_NOTTE;
  }

  const sensazioni = voci.find((v) => v.chiave === "sensazioni");
  const carico = voci.find((v) => v.chiave === "carico");
  const notteRossa = corpo.some((v) => (v.chiave === "hrv" && v.colore === "rosso") || (v.chiave === "fc" && v.colore !== "verde"));
  if (!ferma && livello === "rosso" && carico && carico.colore === "verde" && notteRossa) {
    esito.nota = "Non hai fatto niente di duro, eppure i numeri della notte sono bassi. Può essere un malanno in arrivo. Oggi resta fermo, e se hai febbre o dolori in tutto il corpo non allenarti.";
  } else if (!ferma && sensazioni && sensazioni.valore === 1 && (livello === "giallo" || livello === "rosso")) {
    esito.nota = "Tu ti senti bene, ma i numeri dicono che il corpo non ha finito di recuperare. Succede spesso dopo un giro lungo. Se esci, accorcia il giro e tieni il ritmo facile. In salita le gambe ti diranno com'è davvero.";
  } else if (sensazioni && sensazioni.colore !== "verde" && corpo.length && corpo.every((v) => v.colore === "verde")) {
    esito.nota = "I numeri della notte sono buoni, ma tu non ti senti al meglio. Ascolta anche te stesso.";
  }
  return esito;
}

// La Freschezza (su intervals.icu si chiama Form) in parole semplici, sulle fasce di intervals.icu
// in percentuale della Fitness, più due fasce per il carico alto.
export function zonaFreschezza(pct) {
  if (pct === null || pct === undefined) return null;
  const p = pct * 100;
  if (p > 20) return { nome: "Molto riposato", testo: "Riposato da tanto. Va bene prima di un evento, ma se dura settimane la Fitness cala." };
  if (p > 5) return { nome: "Fresco", testo: "Riposato e pronto. È la freschezza giusta per una giornata importante." };
  if (p > -10) return { nome: "In equilibrio", testo: "Né fresco né stanco. Ti stai mantenendo." };
  if (p > -30) return { nome: "Ti stai allenando", testo: "Un po' stanco, nel modo giusto. È la zona in cui si migliora." };
  if (p > -50) return { nome: "Molto carico", testo: "Stai caricando più del solito. Va bene per pochi giorni, poi serve recuperare." };
  return { nome: "Troppo carico", testo: "Molto più stanco di quanto il corpo sia abituato. Qualche giorno facile ti fa bene." };
}
