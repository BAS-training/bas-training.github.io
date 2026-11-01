// La prova del semaforo sulle mattine vere della taratura privata, il caso T7 di 9.10 (8.6 e 8.8).
// Rifà i giorni uno per uno come farebbe l'app, con js/modello.js e js/semaforo.js. Ogni mattina
// costruisce il modello con il benessere fino a quel giorno, le uscite fatte prima, la storia degli
// esiti dei giorni prima e la modalità evento nei giorni dei viaggi, poi chiama valuta e salva il
// registro nella storia, come fa la pagina in comesto.esiti.v1. Stampa una riga per mattina e alla
// fine controlla gli attesi scritti in notti.json.
//
// Parte solo se COMESTO_TARATURA punta alla cartella privata (8.1), che non sta mai nel repository.
// Qui non c'è nessun dato di nessuno. Date, notti, giri, viaggi e attesi arrivano da quella cartella.
//
//   COMESTO_TARATURA=PERCORSO/DELLA/TARATURA node strumenti/taratura-mattine.mjs [opzioni]
//
//   --dispositivo=ID   il dispositivo della notte di Impostazioni (garmin, orologio, braccialetto, anello, fascia, nonso)
//   --fascia=ID        la fascia d'età del primo avvio (sotto40, 40-49, 50-54, 55-59, 60+), oppure --eta=ANNI
//   --dettagli         accanto a ogni mattina i numeri da cui vengono i punti
//   --varianti         rifà le mattine con ogni fascia d'età e dice cosa cambia
//   --md               scrive in Markdown
//   --scrivi           scrive il Markdown in esito_mattine.md nella cartella privata, mai altrove
//
// Senza risposte valgono quelle dell'app, cioè «non so» e 40-49 anni. Esce con 0 se gli attesi
// tornano e con 1 se uno non torna. Senza la cartella stampa «taratura privata assente» ed esce con 0.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { costruisciModello, aggiungiGiorni, giorniTra, oggiLocale, GIORNI_USCITE } from "../js/modello.js";
import { valuta, eventoDiOggi, propostaViaggio } from "../js/semaforo.js";
import { SEMAFORO } from "../js/parametri.js";

const RADICE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE_ESITO = "esito_mattine.md";
const ORDINE = ["energia", "gambe", "acciacchi", "sonno", "fc", "hrv", "carico"];
const NOMI = { energia: "energia", gambe: "gambe", acciacchi: "acciacchi", sonno: "sonno", fc: "battito", hrv: "hrv", carico: "carico" };
const LIVELLI = ["verde", "giallo-leggero", "giallo", "rosso", "nessuno"];
const NOMI_LIVELLO = { verde: "verde", "giallo-leggero": "giallo leggero", giallo: "giallo", rosso: "rosso", nessuno: "ancora pochi dati" };
const PLURALI = { verde: "verdi", "giallo-leggero": "gialli leggeri", giallo: "gialli", rosso: "rossi", nessuno: "ancora pochi dati" };
// La stessa scala di js/semaforo.js, dove «ancora pochi dati» vale come il giallo leggero.
const GRAVITA = { verde: 0, nessuno: 1, "giallo-leggero": 1, giallo: 2, rosso: 3 };
// Le chiavi del semaforo dette a parole, per le righe.
const PAROLE = {
  uscitaGrande: "uscita grande", sopraIlCollo: "sopra il collo", ultimiGiorni: "ultimi giorni", pezzi: "a pezzi",
  primaDiRiprendere: "prima di riprendere", primaDiPartire: "prima di partire", poco: "sotto 6 ore",
  moltoPoco: "sotto 5 ore", dueNotti: "due notti corte", sottoSolito: "sotto il solito",
  settimana: "media della settimana", punteggio: "punteggio basso",
};
const aParole = (chiave) => PAROLE[chiave] || chiave;

const decimale = (x, cifre = 2) => (typeof x === "number" && Number.isFinite(x) ? x.toFixed(cifre).replace(".", ",") : "-");
const conSegno = (x, cifre = 1) => (typeof x === "number" && x > 0 ? `+${decimale(x, cifre)}` : decimale(x, cifre));
const elenco = (voci, vuoto = "nessuno") => (voci.length ? voci.join(", ") : vuoto);

// --- La cartella privata ---

export function dentroIlRepository(cartella) {
  const r = relative(RADICE, resolve(cartella));
  return r === "" || (!r.startsWith("..") && !isAbsolute(r));
}

// La cartella di COMESTO_TARATURA, se c'è e ha notti.json, altrimenti null.
export function cartellaPrivata(valore = process.env.COMESTO_TARATURA) {
  if (!valore) return null;
  const cartella = resolve(valore);
  return existsSync(join(cartella, "notti.json")) ? cartella : null;
}

function leggiFile(cartella, nome, obbligatorio) {
  const percorso = join(cartella, nome);
  if (!existsSync(percorso)) {
    if (obbligatorio) throw new Error(`manca ${nome}`);
    return null;
  }
  const dati = JSON.parse(readFileSync(percorso, "utf8"));
  if (!dati || dati.formato !== 1) throw new Error(`${nome} ha un formato che non conosco`);
  return dati;
}

// Le uscite come le legge l'app da intervals.icu, con i campi che chiede js/api.js. Le righe
// dell'esportazione di Strava non stanno in intervals.icu, e i campi doppioni e poi, che descrivono
// attività arrivate dopo quelle mattine, restano fuori.
function attivitaDaGiri(giri) {
  return (giri || [])
    .filter((r) => r && typeof r.data === "string" && r.fonte !== "strava-export")
    .map((r) => ({
      data: r.data,
      api: {
        id: String(r.id),
        start_date_local: typeof r.inizio === "string" ? r.inizio : `${r.data}T00:00:00`,
        type: typeof r.tipo === "string" ? r.tipo : null,
        source: r.fonte === "strava-stub" ? "STRAVA" : null,
        moving_time: r.secondi ?? null,
        distance: typeof r.km === "number" ? Math.round(r.km * 1000) : null,
        total_elevation_gain: r.dislivello ?? null,
        icu_training_load: r.carico ?? null,
        average_heartrate: r.fcMedia ?? null,
      },
    }));
}

// I file della taratura, già pronti per il replay.
export function leggiTaratura(cartella) {
  const notti = leggiFile(cartella, "notti.json", true);
  const giri = leggiFile(cartella, "giri.json", false);
  const eventi = leggiFile(cartella, "eventi.json", false);
  const perData = new Map();
  for (const w of (notti.prima || []).concat(notti.giorni || [])) if (w && typeof w.id === "string") perData.set(w.id, w);
  const benessere = [...perData.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  const mattine = (notti.giorni || []).map((w) => w.id).sort();
  if (!mattine.length) throw new Error("notti.json non ha mattine");
  const viaggi = ((eventi && eventi.eventi) || [])
    .filter((e) => e && typeof e.partenza === "string" && typeof e.fine === "string")
    .map((e) => ({ id: e.id, partenza: e.partenza, fine: e.fine, giorni: typeof e.giorni === "number" ? e.giorni : null }))
    .sort((a, b) => (a.partenza < b.partenza ? -1 : 1));
  return {
    benessere,
    mattine,
    attivita: attivitaDaGiri(giri && giri.giri),
    viaggi,
    atteso: notti.atteso || {},
  };
}

// --- Il replay ---

// Lo stato del giorno che la pagina passa a valuta. La modalità evento è accesa dalla partenza fino
// all'arrivo, come con «Sì, parto» e «Sono arrivato», e prima di un viaggio contano i giorni alla partenza.
function contestoDelGiorno(viaggi, d) {
  let evento = null;
  for (const v of viaggi) {
    evento = eventoDiOggi({ inizio: v.partenza, fine: v.fine, tipo: "evento", giorni: v.giorni }, d);
    if (evento) break;
  }
  const prossimo = viaggi.find((v) => v.partenza > d) || null;
  return {
    evento,
    giorniPartenza: prossimo ? giorniTra(d, prossimo.partenza) : null,
    giorniEvento: prossimo ? prossimo.giorni : null,
  };
}

// Le uscite che l'app vede quella mattina, cioè quelle della finestra di lettura fatte prima di oggi.
function usciteDi(attivita, d) {
  const da = aggiungiGiorni(d, 1 - GIORNI_USCITE);
  return attivita.filter((a) => a.data >= da && a.data < d).map((a) => a.api);
}

// Rifà tutti i giorni dal primo del benessere all'ultima mattina, con la storia che cresce giorno per
// giorno. I giorni prima della prima mattina servono solo alla storia (viaggi, guardia, gialli di fila).
export function rifaiMattine(dati, profilo = {}) {
  const { benessere, mattine, attivita, viaggi } = dati;
  const daMostrare = new Set(mattine);
  const fine = mattine[mattine.length - 1];
  const storia = {};
  const righe = [];
  let prima = 0;
  let inEvento = 0;
  for (let d = benessere[0].id; d <= fine; d = aggiungiGiorni(d, 1)) {
    const uscite = usciteDi(attivita, d);
    const m = costruisciModello({
      atleta: {},
      benessere: benessere.filter((w) => w.id <= d),
      uscite,
      diario: {},
      storia: { ...storia },
      profilo,
      piano: null,
    }, d);
    const contesto = contestoDelGiorno(viaggi, d);
    const e = valuta(m, contesto);
    storia[d] = e.registro;
    if (contesto.evento) inEvento += 1;
    if (daMostrare.has(d)) righe.push(riga(d, m, e, contesto));
    else if (d < mattine[0]) prima += 1;
  }
  return { righe, prima, inEvento };
}

function riga(d, m, e, contesto) {
  const voci = Object.fromEntries(e.voci.map((v) => [v.chiave, v]));
  const acciacchi = voci.acciacchi;
  const punti = ORDINE.filter((k) => e.registro.punti[k] > 0)
    .map((k) => `${NOMI[k]} ${e.registro.punti[k]}${k === "acciacchi" && acciacchi && acciacchi.daIeri ? " di ieri" : ""}`);
  const forti = ORDINE.filter((k) => voci[k] && voci[k].forte).map((k) => NOMI[k]);
  const fermano = ORDINE.filter((k) => voci[k] && voci[k].stop).map((k) => `${NOMI[k]}${voci[k].daIeri ? " di ieri" : ""}`);
  const lettura = (k) => (voci[k] && voci[k].lettura) || {};
  const hrv = lettura("hrv");
  const fc = lettura("fc");
  const sonno = lettura("sonno");
  const carico = lettura("carico");
  const note = [];
  if (e.concordanza) note.push("concordanza");
  if (e.registro.guardia) note.push(`guardia dopo ${aParole(e.registro.guardia)}`);
  if (contesto.evento) note.push(`modalità evento, giorno ${contesto.evento.giorno}`);
  if (e.domenica) note.push("gialli di fila");
  for (const x of e.messaggi) if (x.chiave === "dispositivo") note.push("domanda sul dispositivo");
  for (const x of e.medico) note.push(`medico ${aParole(x.quando)}`);
  if (e.nota) note.push("nota");
  if (!contesto.evento && propostaViaggio(m.uscite, d)) note.push("la pagina proporrebbe la modalità evento");
  return {
    d,
    livello: e.livello,
    P: e.P,
    punti,
    forti,
    tetti: e.tetti.map((t) => `${aParole(t.chiave)}${t.alza ? " che alza" : ""}`),
    stop: e.stop,
    fermano,
    controllo: e.controllo.map((x) => x.chiave),
    basi: { hrv: { n: e.basi.hrv.n, stato: e.basi.hrv.stato }, fc: { n: e.basi.fc.n, stato: e.basi.fc.stato } },
    fiducia: e.fiducia.indice,
    note,
    dettagli: {
      hrv: `notte ${decimale(hrv.zNotte)}, sette notti ${decimale(hrv.z7)}${hrv.calo ? ", calo atteso" : ""}${hrv.treMattine ? ", tre mattine" : ""}`,
      fc: typeof fc.d === "number" ? `${fc.fc} battiti, ${conSegno(fc.d)} sulla mediana, z ${decimale(fc.z)}` : "-",
      sonno: typeof sonno.ore === "number" ? `${decimale(sonno.ore)} ore${sonno.motivo ? `, ${aParole(sonno.motivo)}` : ""}` : "-",
      carico: typeof carico.R === "number" ? `R ${decimale(carico.R)}, D ${decimale(carico.D, 1)}${carico.lenta ? ", Fatica lenta" : ""}` : "-",
    },
  };
}

// --- Gli attesi ---

// Gli attesi dei giorni sono scritti a parole in notti.json, per esempio «giallo», «al massimo giallo»
// o «giallo con la domanda di controllo».
export function leggiAtteso(testo) {
  if (typeof testo !== "string") return null;
  let resto = testo.trim().toLowerCase();
  const alMassimo = resto.startsWith("al massimo ");
  if (alMassimo) resto = resto.slice("al massimo ".length);
  const controllo = resto.endsWith(" con la domanda di controllo");
  if (controllo) resto = resto.slice(0, -" con la domanda di controllo".length);
  const livello = LIVELLI.find((l) => resto === l || resto === NOMI_LIVELLO[l]);
  return livello ? { livello, alMassimo, controllo } : null;
}

export function controllaAttesi(righe, atteso) {
  const perData = new Map(righe.map((r) => [r.d, r]));
  const prove = [];
  if (Array.isArray(atteso.rossi)) {
    const rossi = righe.filter((r) => r.livello === "rosso").map((r) => r.d);
    const voluti = [...atteso.rossi].sort();
    prove.push({
      cosa: `rossi esattamente il ${elenco(voluti)}`,
      esce: `rossi il ${elenco(rossi)}`,
      torna: rossi.length === voluti.length && rossi.every((d, k) => d === voluti[k]),
    });
  }
  if (atteso.nessunRossoDaiNumeri) {
    const daiNumeri = righe.filter((r) => r.livello === "rosso" && !r.stop).map((r) => r.d);
    prove.push({
      cosa: "nessun rosso dai soli numeri",
      esce: daiNumeri.length ? `rossi senza uno stop il ${elenco(daiNumeri)}` : "ogni rosso viene da uno stop",
      torna: daiNumeri.length === 0,
    });
  }
  for (const [d, testo] of Object.entries(atteso.giorni || {}).sort()) {
    const regola = leggiAtteso(testo);
    const r = perData.get(d);
    if (!regola || !r) {
      prove.push({ cosa: `${d} ${testo}`, esce: !r ? "la mattina non c'è" : "l'atteso non si legge", torna: false });
      continue;
    }
    const livello = regola.alMassimo ? GRAVITA[r.livello] <= GRAVITA[regola.livello] : r.livello === regola.livello;
    const controllo = !regola.controllo || r.controllo.includes("malattia");
    const domanda = r.controllo.includes("malattia") ? " con la domanda di controllo" : "";
    prove.push({ cosa: `${d} ${testo}`, esce: `${NOMI_LIVELLO[r.livello]}${domanda}`, torna: livello && controllo });
  }
  return prove;
}

function conteggi(righe) {
  const n = Object.fromEntries(LIVELLI.map((l) => [l, 0]));
  for (const r of righe) n[r.livello] += 1;
  return n;
}

const frase = (n) => LIVELLI.filter((l) => l !== "nessuno" || n[l]).map((l) => `${n[l]} ${PLURALI[l]}`).join(", ");

function profiloDa(opzioni) {
  const p = {};
  if (opzioni.dispositivo) p.dispositivo = opzioni.dispositivo;
  if (opzioni.fascia) p.fasciaEta = opzioni.fascia;
  if (opzioni.eta !== null) p.eta = opzioni.eta;
  return p;
}

function descriviProfilo(p) {
  const parti = [];
  parti.push(p.dispositivo ? `dispositivo ${p.dispositivo}` : "dispositivo senza risposta");
  if (p.eta !== undefined) parti.push(`${p.eta} anni`);
  else parti.push(p.fasciaEta ? `fascia ${p.fasciaEta}` : "età senza risposta, cioè 40-49");
  return parti.join(", ");
}

// --- L'uscita, a righe o in Markdown ---

// Le colonne di una mattina, ognuna con l'etichetta che serve nelle righe e che in Markdown dà la testata.
function colonne(r, dettagli) {
  const c = [
    ["", r.d],
    ["", NOMI_LIVELLO[r.livello]],
    ["P", String(r.P)],
    ["", elenco(r.punti, "nessun punto")],
    ["forti", elenco(r.forti, "nessuna")],
    ["tetti", elenco(r.tetti)],
    ["", r.stop ? `stop ${aParole(r.stop)}${r.fermano.length ? ` da ${r.fermano.join(", ")}` : ""}` : "nessuno stop"],
    ["domande", elenco(r.controllo, "nessuna")],
    ["base", `hrv ${r.basi.hrv.n} ${r.basi.hrv.stato}, battito ${r.basi.fc.n} ${r.basi.fc.stato}`],
    ["fiducia", r.fiducia || "-"],
    ["", elenco(r.note, "-")],
  ];
  if (dettagli) c.push(["hrv", r.dettagli.hrv], ["battito", r.dettagli.fc], ["sonno", r.dettagli.sonno], ["carico", r.dettagli.carico]);
  return c;
}

function testo(risultato, opzioni) {
  const { righe, prove, n, atteso, profilo, prima, inEvento, varianti } = risultato;
  const out = [];
  const md = opzioni.md;
  const intestazione = ["Mattina", "Livello", "Punti in tutto", "Punti per voce", "Voci forti", "Tetti", "Stop", "Domande", "Basi", "Fiducia", "Note"];
  if (opzioni.dettagli) intestazione.push("HRV", "Battito", "Sonno", "Carico");
  const giro = `Profilo usato, ${descriviProfilo(profilo)}. Giorni rifatti prima della prima mattina ${prima}, solo per la storia degli esiti, e in tutto ${inEvento} giorni in modalità evento.`;
  if (md) {
    out.push("# Le mattine vere con il semaforo nuovo", "");
    out.push("*Cartella privata, mai nel repository, mai su Notion, mai condivisa. Esito di `strumenti/taratura-mattine.mjs` (caso T7 di 9.10 e 8.6 della specifica), rifatto il " + oggiLocale() + ".*", "");
    out.push(`${giro} Le uscite di ogni mattina sono quelle fatte prima di quel giorno, nella finestra di ${GIORNI_USCITE} giorni che legge l'app. Diario vuoto, cioè nessuna risposta a «Sto male», alle caselle e alle domande di controllo, e nessun piano.`, "");
    out.push(`Opzioni ${elenco(opzioni.argomenti || [], "nessuna")}.`, "");
    out.push("Come si legge la tabella.", "");
    out.push("- **Punti per voce** elenca solo le voci con punti, «di ieri» vuol dire la risposta di ieri sugli acciacchi.");
    out.push("- **Voci forti** sono quelle da 2 punti. **Tetti** dice quali minimi e tetti valgono, «che alza» quando hanno cambiato il livello.");
    out.push("- **Domande** sono le carte da mostrare prima del livello, malattia per la domanda di controllo e pedalata per quella sul dolore.");
    out.push("- **Basi** dice quante notti hanno le basi di HRV e battito e se sono in taratura, provvisorie o piene.");
    if (opzioni.dettagli) out.push("- **HRV** dà la notte e la media di 7 notti in DS dalla base, **Battito** i battiti sopra la mediana, **Carico** R e D di ieri sera.");
    out.push("");
    out.push("## Mattina per mattina", "");
    out.push(`| ${intestazione.join(" | ")} |`, `|${intestazione.map(() => "---").join("|")}|`);
    for (const r of righe) {
      const c = colonne(r, opzioni.dettagli).map(([, valore]) => valore);
      if (r.livello === "rosso") c[1] = `**${c[1]}**`;
      out.push(`| ${c.join(" | ")} |`);
    }
    out.push("");
  } else {
    out.push(giro);
    for (const r of righe) out.push(colonne(r, opzioni.dettagli).map(([e, v]) => (e ? `${e} ${v}` : v)).join("  "));
    out.push("");
  }

  const tornano = prove.filter((p) => p.torna).length;
  out.push(md ? "## Il caso T7" : "Il caso T7", ...(md ? [""] : []));
  for (const p of prove) out.push(`${md ? "- " : "  "}${p.cosa}, esce ${p.esce}, ${p.torna ? "torna" : "NON TORNA"}`);
  out.push(...(md ? [""] : []), `In tutto ${tornano} attesi su ${prove.length} tornano.`, "");

  out.push(md ? "## Come informazione" : "Come informazione", ...(md ? [""] : []));
  const info = atteso.informazione || {};
  const proto = info.prototipoDati;
  let conti = `${md ? "- " : "  "}Conteggi ${frase(n)}.`;
  if (proto) conti += ` Il prototipo della proposta dati ne dava ${proto.verdi} verdi, ${proto.gialliLeggeri} gialli leggeri, ${proto.gialli} gialli e ${proto.rossi} rossi.`;
  out.push(conti);
  const vecchi = Array.isArray(info.semaforoDiOggiRossiDaUnaNotte) ? info.semaforoDiOggiRossiDaUnaNotte : [];
  if (vecchi.length) {
    const ora = vecchi.map((d) => {
      const r = righe.find((x) => x.d === d);
      return `${d} ${r ? NOMI_LIVELLO[r.livello] : "senza mattina"}`;
    });
    out.push(`${md ? "- " : "  "}I rossi del semaforo di prima da una notte sola, oggi ${elenco(ora)}.`);
  }
  const conControllo = righe.filter((r) => r.controllo.includes("malattia")).map((r) => r.d);
  out.push(`${md ? "- " : "  "}Mattine con la domanda di controllo ${conControllo.length}, ${elenco(conControllo, "nessuna")}.`);
  const conTetto = righe.filter((r) => r.tetti.length).map((r) => `${r.d} ${r.tetti.join(" e ")}`);
  out.push(`${md ? "- " : "  "}Mattine con un tetto ${conTetto.length}, ${elenco(conTetto, "nessuna")}.`);
  out.push("");

  if (varianti) {
    out.push(md ? "## Le fasce d'età" : "Le fasce d'età", ...(md ? [""] : []));
    for (const v of varianti) {
      const diverse = v.diverse.length ? `mattine diverse ${v.diverse.join(", ")}` : "nessuna mattina diversa";
      out.push(`${md ? "- " : "  "}${v.fascia}, ${frase(v.n)}, attesi ${v.tornano} su ${v.prove}, ${diverse}.`);
    }
    out.push("");
  }
  return out.join("\n");
}

// --- Da riga di comando ---

function leggiOpzioni(argv) {
  const o = { dettagli: false, varianti: false, md: false, scrivi: false, dispositivo: null, fascia: null, eta: null, argomenti: [...argv] };
  for (const a of argv) {
    const [chiave, valore] = a.replace(/^--/, "").split("=");
    if (["dettagli", "varianti", "md", "scrivi"].includes(chiave) && valore === undefined) o[chiave] = true;
    else if (chiave === "dispositivo" && Object.hasOwn(SEMAFORO.dispositivi, valore)) o.dispositivo = valore;
    else if (chiave === "fascia" && SEMAFORO.fasceEta.includes(valore)) o.fascia = valore;
    else if (chiave === "eta" && valore && Number.isFinite(Number(valore))) o.eta = Number(valore);
    else throw new Error(`opzione che non conosco, ${a}`);
  }
  if (o.scrivi) o.md = true;
  return o;
}

export function prova(cartella, opzioni) {
  const dati = leggiTaratura(cartella);
  const profilo = profiloDa(opzioni);
  const { righe, prima, inEvento } = rifaiMattine(dati, profilo);
  const prove = controllaAttesi(righe, dati.atteso);
  const risultato = { righe, prove, n: conteggi(righe), atteso: dati.atteso, profilo, prima, inEvento, varianti: null };
  if (opzioni.varianti) {
    risultato.varianti = SEMAFORO.fasceEta.map((fascia) => {
      const p = { ...profilo, fasciaEta: fascia };
      delete p.eta;
      const v = rifaiMattine(dati, p).righe;
      const pv = controllaAttesi(v, dati.atteso);
      const diverse = v.filter((r, k) => r.livello !== righe[k].livello).map((r) => `${r.d} ${NOMI_LIVELLO[r.livello]}`);
      return { fascia, n: conteggi(v), tornano: pv.filter((x) => x.torna).length, prove: pv.length, diverse };
    });
  }
  return risultato;
}

function principale() {
  let opzioni;
  try {
    opzioni = leggiOpzioni(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    return 2;
  }
  const cartella = cartellaPrivata();
  if (!cartella) {
    console.log("taratura privata assente");
    return 0;
  }
  if (dentroIlRepository(cartella)) {
    console.error("la cartella della taratura sta dentro il repository, e lì non ci deve stare");
    return 2;
  }
  const risultato = prova(cartella, opzioni);
  const uscita = testo(risultato, opzioni);
  const tornano = risultato.prove.every((p) => p.torna);
  if (opzioni.scrivi) {
    writeFileSync(join(cartella, FILE_ESITO), `${uscita}\n`, "utf8");
    const quanti = risultato.prove.filter((p) => p.torna).length;
    console.log(`scritto ${FILE_ESITO} nella cartella privata, ${quanti} attesi su ${risultato.prove.length} tornano`);
  } else console.log(uscita);
  return tornano ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = principale();
}
