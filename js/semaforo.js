// Il semaforo del mattino. Ogni "voce" (HRV, battito a riposo, sonno, carico,
// acciacchi, sensazioni) dà verde, giallo o rosso; le voci senza dati non votano.
// Le regole sono scritte anche nella pagina Guida: se cambi qui, cambia anche là.

import { numero, durata, segno } from "./formato.js";

export const LIVELLI = {
  verde: {
    colore: "verde",
    titolo: "Via libera",
    consiglio: "Il corpo ha recuperato. Oggi puoi spingere o fare il giro lungo.",
  },
  "giallo-leggero": {
    colore: "giallo",
    titolo: "Vai, ma senza esagerare",
    consiglio: "Allenamento normale, senza sforzi al massimo. In salita tieni un ritmo in cui riesci ancora a parlare.",
  },
  giallo: {
    colore: "giallo",
    titolo: "Giornata tranquilla",
    consiglio: "Meglio un giro facile e corto, un'ora o un'ora e mezza a ritmo da chiacchiera. Vanno bene anche stretching o palestra leggera.",
  },
  rosso: {
    colore: "rosso",
    titolo: "Oggi recupera",
    consiglio: "Il corpo chiede riposo. Una passeggiata va benissimo. Se proprio esci in bici, al massimo un'ora, piano.",
  },
  nessuno: {
    colore: "neutro",
    titolo: "Ancora pochi dati",
    consiglio: "Appena arrivano un paio di settimane di notti e di giri, qui trovi il consiglio del giorno. Intanto rispondi alle domande del mattino.",
  },
};

export const ESITO_VOCE = {
  verde: "a posto",
  giallo: "attenzione",
  rosso: "frena",
  neutro: "non conta oggi",
};

function voce(chiave, nome, colore, testo, extra = {}) {
  return { chiave, nome, colore, testo, ...extra };
}

export function voceHrv(m) {
  const nome = "HRV della notte";
  const oggi = m.giorni[m.giorni.length - 1].hrv;
  const b = m.base.hrv;
  if (!m.hrvMisurato) {
    return voce("hrv", nome, "neutro", "Il tuo orologio non lo misura, oppure non lo manda a intervals.icu.");
  }
  if (!oggi) {
    return voce("hrv", nome, "neutro", "Stanotte non è ancora arrivato. Sincronizza l'orologio e aggiorna.");
  }
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
  const oggi = m.giorni[m.giorni.length - 1].fc;
  const b = m.base.fc;
  if (!oggi) {
    return voce("fc", nome, "neutro", m.giorni.some((g) => g.fc)
      ? "Stanotte non è ancora arrivato. Sincronizza l'orologio e aggiorna."
      : "Non arriva da nessun dispositivo. Serve un orologio o una fascia che lo misuri di notte.");
  }
  if (!b.ok) {
    return voce("fc", nome, "neutro",
      `Stanotte ${numero(oggi)} battiti. Sto ancora imparando il tuo solito, ho ${b.n} notti su 7.`);
  }
  const diff = Math.round(oggi - b.solito);
  const solito = `il tuo solito è ${numero(b.solito)}`;
  if (diff >= 5) return voce("fc", nome, "rosso", `${numero(oggi)} battiti, ${diff} sopra il solito (${solito}). È un campanello forte.`, { valore: oggi });
  if (diff >= 3) return voce("fc", nome, "giallo", `${numero(oggi)} battiti, ${diff} sopra il solito (${solito}).`, { valore: oggi });
  if (diff >= 1) return voce("fc", nome, "verde", `${numero(oggi)} battiti, appena sopra il solito (${solito}).`, { valore: oggi });
  return voce("fc", nome, "verde", `${numero(oggi)} battiti, come il solito o meno (${solito}).`, { valore: oggi });
}

export function voceSonno(m) {
  const nome = "Sonno";
  const g = m.giorni[m.giorni.length - 1];
  if (!g.sonno && !g.punteggioSonno) {
    return voce("sonno", nome, "neutro", m.giorni.some((x) => x.sonno)
      ? "Stanotte non è ancora arrivato. Sincronizza l'orologio e aggiorna."
      : "Non arriva da nessun dispositivo.");
  }
  const ore = g.sonno ? g.sonno / 3600 : null;
  const p = g.punteggioSonno;
  let colore = "verde";
  if ((ore !== null && ore < 5.5) || (p !== null && p < 60)) colore = "rosso";
  else if ((ore !== null && ore < 6.5) || (p !== null && p < 70)) colore = "giallo";
  const parti = [];
  if (ore !== null) parti.push(`Hai dormito ${durata(g.sonno)}`);
  if (p !== null) parti.push(`${ore !== null ? "punteggio" : "Punteggio della notte"} ${numero(p)}`);
  const coda = { rosso: " Troppo poco per recuperare.", giallo: " Un po' poco.", verde: "" }[colore];
  return voce("sonno", nome, colore, parti.join(", ") + "." + coda, { valore: ore });
}

export function voceCarico(m) {
  const nome = "Allenamento recente";
  const { ctl, rapporto } = m.mattino;
  if (ctl === null || rapporto === null) {
    return voce("carico", nome, "neutro", "Non c'è ancora nessun giro registrato.");
  }
  if (ctl < 15) {
    return voce("carico", nome, "neutro",
      `La tua base è ancora piccola (Fitness ${numero(ctl)}). Con poca base anche un giro sembra tanto, quindi qui non voto.`);
  }
  const volte = numero(rapporto, 1);
  if (rapporto > 1.5) {
    return voce("carico", nome, "rosso",
      `Negli ultimi giorni stai facendo ${volte} volte il tuo solito. È il punto oltre il quale ci si fa male più facilmente.`, { valore: rapporto });
  }
  if (rapporto > 1.3) {
    return voce("carico", nome, "giallo", `Negli ultimi giorni stai facendo ${volte} volte il tuo solito. Stai caricando parecchio.`, { valore: rapporto });
  }
  if (rapporto < 0.8) {
    return voce("carico", nome, "verde", "Negli ultimi giorni hai fatto meno del solito. Sei riposato.", { valore: rapporto });
  }
  return voce("carico", nome, "verde", "Negli ultimi giorni sei in linea con il tuo solito.", { valore: rapporto });
}

export function voceAcciacchi(m) {
  const i = m.giorni.length - 1;
  const oggi = m.giorni[i].infortunio;
  const ieri = i > 0 ? m.giorni[i - 1].infortunio : null;
  const v = oggi ?? ieri;
  if (!v) return null;
  const quando = oggi ? "" : " (lo hai segnato ieri)";
  const nome = "Acciacchi";
  if (v >= 4) return voce("acciacchi", nome, "rosso", `Hai segnato un infortunio${quando}. Oggi fermo.`, { valore: v });
  if (v >= 3) return voce("acciacchi", nome, "rosso", `Hai segnato un dolore${quando}. Oggi lascialo riposare.`, { valore: v });
  if (v >= 2) return voce("acciacchi", nome, "giallo", `Hai segnato un fastidio${quando}. Oggi niente sforzi che lo peggiorano.`, { valore: v });
  return voce("acciacchi", nome, "verde", "Nessun fastidio segnato.", { valore: v });
}

export function voceSensazioni(m) {
  const g = m.giorni[m.giorni.length - 1];
  if (!g.fatica && !g.dolori) return null;
  const peggio = Math.max(g.fatica || 0, g.dolori || 0);
  const nome = "Come ti senti";
  if (peggio >= 4) return voce("sensazioni", nome, "rosso", "Hai detto che ti senti a pezzi.", { valore: peggio });
  if (peggio >= 3) return voce("sensazioni", nome, "giallo", "Hai detto che ti senti un po' stanco.", { valore: peggio });
  if (peggio <= 1) return voce("sensazioni", nome, "verde", "Hai detto che ti senti benissimo.", { valore: peggio });
  return voce("sensazioni", nome, "verde", "Hai detto che ti senti normale.", { valore: peggio });
}

export function valuta(m) {
  const voci = [voceHrv(m), voceFc(m), voceSonno(m), voceCarico(m), voceAcciacchi(m), voceSensazioni(m)].filter(Boolean);
  const attive = voci.filter((v) => v.colore !== "neutro");
  const rossi = attive.filter((v) => v.colore === "rosso").length;
  const gialli = attive.filter((v) => v.colore === "giallo").length;

  let livello;
  if (!attive.length) livello = "nessuno";
  else if (rossi >= 2 || (rossi >= 1 && gialli >= 1)) livello = "rosso";
  else if (rossi === 1 || gialli >= 2) livello = "giallo";
  else if (gialli === 1) livello = "giallo-leggero";
  else livello = "verde";

  const corpo = voci.filter((v) => ["hrv", "fc", "sonno"].includes(v.chiave) && v.colore !== "neutro");
  const sensazioni = voci.find((v) => v.chiave === "sensazioni");
  let nota = null;
  if (sensazioni && sensazioni.valore === 1 && (livello === "giallo" || livello === "rosso")) {
    nota = "Tu ti senti bene, ma i numeri dicono che il corpo non ha finito di recuperare. Succede spesso dopo un giro lungo. Se esci, accorcia il giro e tieni il ritmo facile. In salita le gambe ti diranno com'è davvero.";
  } else if (sensazioni && sensazioni.colore !== "verde" && corpo.length && corpo.every((v) => v.colore === "verde")) {
    nota = "I numeri della notte sono buoni, ma tu ti senti stanco. Ascolta te stesso, oggi vai piano.";
  }

  const notaDati = livello !== "nessuno" && corpo.length === 0
    ? "Questo consiglio guarda solo allenamento e sensazioni. Con un orologio che misura la notte diventa più preciso."
    : null;

  return { livello, ...LIVELLI[livello], voci, nota, notaDati, rossi, gialli };
}

// Le etichette della Forma in parole semplici, sulle stesse fasce di intervals.icu
// (Forma in percentuale della Fitness).
export function zonaForma(formaPct) {
  if (formaPct === null || formaPct === undefined) return null;
  const p = formaPct * 100;
  if (p > 20) return { nome: "Molto riposato", testo: "Riposato da tanto. Va bene prima di un evento, ma se dura settimane la Fitness cala." };
  if (p > 5) return { nome: "Fresco", testo: "Riposato e pronto. È la Forma giusta per una giornata importante." };
  if (p > -10) return { nome: "In equilibrio", testo: "Né fresco né stanco. Ti stai mantenendo." };
  if (p > -30) return { nome: "Ti stai allenando", testo: "Un po' stanco, nel modo giusto. È la zona in cui si migliora." };
  if (p > -50) return { nome: "Molto carico", testo: "Stai caricando più del solito. Va bene per pochi giorni, poi serve recuperare." };
  return { nome: "Troppo carico", testo: "Molto più stanco di quanto il corpo sia abituato. Qualche giorno facile ti fa bene." };
}

export function descriviForma(m) {
  const z = zonaForma(m.mattino.formaPct);
  if (!z) return null;
  return { ...z, valore: segno(m.mattino.forma) };
}
