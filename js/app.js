// Come sto: la regia della pagina. Tiene lo stato, decide quale pagina mostrare
// e parla con intervals.icu. Le pagine vere e proprie stanno in js/viste/.

import { creaClient, ErroreApi } from "./api.js?v=202610312043";
import { costruisciModello, normalizzaGiorno, oggiLocale, oggiNelFuso, aggiungiGiorni, GIORNI_STORICO, GIORNI_USCITE } from "./modello.js?v=202610312043";
import { generaDemo } from "./demo.js?v=202610312043";
import { vistaOggi } from "./viste/oggi.js?v=202610312043";
import { vistaAndamento } from "./viste/andamento.js?v=202610312043";
import { vistaUscite } from "./viste/uscite.js?v=202610312043";
import { vistaObiettivo } from "./viste/obiettivo.js?v=202610312043";
import { vistaBenvenuto, vistaCollega, vistaGuida, vistaPrivacy, vistaCaricamento, vistaErrore } from "./viste/pagine.js?v=202610312043";

// Dentro un riquadro di un altro sito la pagina non si apre: nessuno deve poterla "travestire".
if (window.top !== window.self) {
  document.body.textContent = "Come sto si apre solo nella sua pagina, non dentro un altro sito.";
  throw new Error("Come sto non si apre dentro un altro sito");
}

const CHIAVE = "comesto.chiave";
const PREFERENZE = "comesto.preferenze";
const DEMO = "comesto.demo";
const PONTE = "comesto.ponte";

// --- memoria del browser: tutto protetto, perché in navigazione privata può mancare ---
function memoria(tipo) {
  try { return window[tipo]; } catch { return null; }
}
const locale = memoria("localStorage");
const sessione = memoria("sessionStorage");
function leggi(m, nome) {
  try { return m ? m.getItem(nome) : null; } catch { return null; }
}
function scrivi(m, nome, valore) {
  try { if (m) m.setItem(nome, valore); } catch { /* memoria non disponibile: si va avanti senza */ }
}
function togli(m, nome) {
  try { if (m) m.removeItem(nome); } catch { /* niente da togliere */ }
}
function leggiPreferenze() {
  try { return JSON.parse(leggi(locale, PREFERENZE) || "{}") || {}; } catch { return {}; }
}

const stato = {
  client: null,
  modello: null,
  demo: false,
  errore: null,              // errore senza dati da mostrare
  avviso: null,              // errore di aggiornamento quando i dati di prima ci sono già
  erroreAccesso: null,
  caricando: false,
  appenaSalvato: false,
  atletaPronto: null,        // l'atleta letto all'ingresso, per non chiederlo due volte
  preferenze: { ...leggiPreferenze(), modificaDomande: false },
};
let giro = 0;                // ogni caricamento ha il suo numero: vince solo l'ultimo

const VISTE = {
  benvenuto: { titolo: "Benvenuto", libera: true, disegna: vistaBenvenuto },
  collega: { titolo: "Collega i tuoi dati", libera: true, disegna: vistaCollega },
  guida: { titolo: "Guida", libera: true, disegna: vistaGuida },
  privacy: { titolo: "Privacy", libera: true, disegna: vistaPrivacy },
  oggi: { titolo: "Oggi", disegna: vistaOggi },
  andamento: { titolo: "Andamento", disegna: vistaAndamento },
  uscite: { titolo: "Uscite", disegna: vistaUscite },
  obiettivo: { titolo: "Obiettivo", disegna: vistaObiettivo },
};

const dentro = () => Boolean(stato.client || stato.demo);
const oggiDiChiGuarda = () => (stato.modello && !stato.demo ? oggiNelFuso(stato.modello.atleta.fuso) : oggiLocale());

function rotta() {
  const r = location.hash.replace(/^#/, "");
  if (VISTE[r]) return r;
  return dentro() ? "oggi" : "benvenuto";
}

function vai(r, sostituisci = false) {
  if (sostituisci) {
    history.replaceState(null, "", `#${r}`);
    mostra({ fuoco: true });
  } else if (location.hash === `#${r}`) {
    mostra({ fuoco: true });
  } else {
    location.hash = r;
  }
}

const principale = document.getElementById("contenuto");
const bottoneAggiorna = document.getElementById("aggiorna");
const riquadroAvviso = document.getElementById("avviso");

function aggiornaNavigazione(r) {
  const visibile = dentro();
  for (const id of ["nav", "barra"]) {
    const el = document.getElementById(id);
    el.hidden = !visibile;
    for (const a of el.querySelectorAll("a[data-rotta]")) {
      if (a.dataset.rotta === r) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
  }
  document.body.classList.toggle("con-barra", visibile);
  bottoneAggiorna.hidden = !visibile;
  bottoneAggiorna.disabled = stato.caricando;
  bottoneAggiorna.setAttribute("aria-busy", stato.caricando ? "true" : "false");
  const esci = document.getElementById("esci");
  esci.hidden = !visibile;
  esci.textContent = stato.demo ? "Esci dall'esempio" : "Esci";

  // Un aggiornamento non riuscito non cancella i dati di prima: lo si dice e si offre di riprovare.
  riquadroAvviso.replaceChildren();
  riquadroAvviso.hidden = !(stato.avviso && stato.modello && !VISTE[r].libera);
  if (!riquadroAvviso.hidden) {
    const riprova = document.createElement("button");
    riprova.type = "button";
    riprova.className = "collegamento";
    riprova.textContent = "Riprova";
    riprova.addEventListener("click", () => azioni.ricarica());
    riquadroAvviso.append(`Non sono riuscito ad aggiornare. ${stato.avviso} Vedi i dati dell'ultima lettura. `, riprova);
  }
}

function mostra({ fuoco = false } = {}) {
  const r = rotta();
  if (location.hash !== `#${r}`) history.replaceState(null, "", `#${r}`);
  const def = VISTE[r];
  if (!def.libera && !dentro()) { vai("benvenuto", true); return; }
  if (r === "benvenuto" && dentro()) { vai("oggi", true); return; }

  aggiornaNavigazione(r);
  const ctx = {
    modello: stato.modello,
    demo: stato.demo,
    preferenze: stato.preferenze,
    erroreAccesso: stato.erroreAccesso,
    appenaSalvato: stato.appenaSalvato,
    azioni,
  };

  let vista;
  if (def.libera) vista = def.disegna(ctx);
  else if (stato.errore && !stato.modello) vista = vistaErrore(ctx, stato.errore);
  else if (!stato.modello) vista = vistaCaricamento();
  else vista = def.disegna(ctx);

  // Si ridisegna la pagina intera: si tiene il punto in cui eri e l'elemento col fuoco.
  const scorrimento = window.scrollY;
  const attivo = document.activeElement && document.activeElement.id;
  principale.replaceChildren(vista);
  document.title = r === "benvenuto" ? "Come sto" : `${def.titolo} · Come sto`;
  principale.classList.toggle("in-aggiornamento", stato.caricando && Boolean(stato.modello));

  if (stato.appenaSalvato && r === "oggi") {
    // Dopo le risposte del mattino il semaforo può cambiare: lo si porta in vista.
    stato.appenaSalvato = false;
    const titolo = document.getElementById("semaforo-titolo");
    if (titolo) {
      titolo.setAttribute("tabindex", "-1");
      titolo.scrollIntoView({ block: "center" });
      titolo.focus({ preventScroll: true });
    }
    return;
  }
  if (fuoco) {
    window.scrollTo(0, 0);
    const titolo = principale.querySelector("h1");
    if (titolo) {
      titolo.setAttribute("tabindex", "-1");
      titolo.focus({ preventScroll: true });
    }
  } else {
    window.scrollTo(0, scorrimento);
    if (attivo) {
      const di = document.getElementById(attivo);
      if (di && principale.contains(di)) di.focus({ preventScroll: true });
    }
  }
}

function chiaveNonValida(messaggio) {
  dimentica();
  stato.erroreAccesso = messaggio;
  vai("collega", true);
}

async function carica() {
  if (!stato.client) return;
  const questo = ++giro;
  const client = stato.client;
  stato.caricando = true;
  stato.errore = null;
  mostra();
  // Si chiede fino a domani: se il fuso dell'atleta è avanti rispetto al telefono, oggi c'è lo stesso.
  const domani = aggiungiGiorni(oggiLocale(), 1);
  try {
    const [atleta, benessere, uscite] = await Promise.all([
      stato.atletaPronto ? Promise.resolve(stato.atletaPronto) : client.atleta(),
      client.benessere(aggiungiGiorni(domani, -GIORNI_STORICO), domani),
      client.uscite(aggiungiGiorni(domani, -GIORNI_USCITE), domani),
    ]);
    if (questo !== giro || client !== stato.client) return; // è arrivato un caricamento più nuovo, o sei uscito
    stato.atletaPronto = null;
    const oggi = oggiNelFuso(atleta && atleta.timezone);
    stato.modello = costruisciModello({ atleta, benessere, uscite }, oggi);
    stato.avviso = null;
  } catch (e) {
    if (questo !== giro || client !== stato.client) return;
    const errore = e instanceof ErroreApi ? e : new ErroreApi("server", "Qualcosa è andato storto leggendo i dati. Riprova fra poco.");
    stato.caricando = false;
    if (errore.tipo === "chiave") { chiaveNonValida(errore.messaggio); return; }
    if (stato.modello) stato.avviso = errore.messaggio;
    else stato.errore = errore;
  }
  stato.caricando = false;
  mostra();
}

function dimentica() {
  togli(locale, CHIAVE);
  togli(sessione, CHIAVE);
  togli(sessione, PONTE);
  togli(sessione, DEMO);
  giro += 1; // un caricamento in corso non deve rimettere i dati dopo l'uscita
  stato.client = null;
  stato.modello = null;
  stato.demo = false;
  stato.errore = null;
  stato.avviso = null;
  stato.caricando = false;
  stato.atletaPronto = null;
}

function avviaDemo() {
  const oggi = oggiLocale();
  stato.demo = true;
  stato.avviso = null;
  stato.modello = costruisciModello(generaDemo(oggi), oggi);
}

// Se il giorno è cambiato mentre la pagina era aperta, si rilegge tutto.
function controllaGiorno() {
  if (document.visibilityState === "visible" && stato.modello && stato.modello.oggi !== oggiDiChiGuarda() && !stato.caricando) {
    azioni.ricarica();
  }
}

const azioni = {
  async entra(chiave, ricorda) {
    let client;
    let atleta;
    try {
      client = creaClient({ chiave });
      atleta = await client.atleta();
    } catch (e) {
      if (!(e instanceof ErroreApi)) return "Non sono riuscito a controllare la chiave. Riprova.";
      return e.tipo === "chiave" && e.messaggio.startsWith("La chiave salvata")
        ? "Questa chiave non funziona. Controlla di averla copiata tutta, oppure creane una nuova su intervals.icu."
        : e.messaggio;
    }
    togli(sessione, DEMO);
    stato.demo = false;
    stato.modello = null;
    stato.erroreAccesso = null;
    if (ricorda) { scrivi(locale, CHIAVE, chiave); togli(sessione, CHIAVE); }
    else { scrivi(sessione, CHIAVE, chiave); togli(locale, CHIAVE); }
    stato.client = client;
    stato.atletaPronto = atleta;
    vai("oggi", true);
    carica();
    return null;
  },

  esci() {
    if (!window.confirm("Vuoi uscire? Per rientrare dovrai incollare di nuovo la chiave.")) return;
    dimentica();
    vai("benvenuto", true);
  },

  demo() {
    scrivi(sessione, DEMO, "1");
    avviaDemo();
    vai("oggi", location.hash === "#esempio");
  },

  esciDemo() {
    togli(sessione, DEMO);
    stato.demo = false;
    stato.modello = null;
    if (stato.client) carica(); // eri già collegato: si torna ai tuoi dati
  },

  ricarica() {
    if (stato.demo) { avviaDemo(); mostra(); return; }
    if (!stato.caricando) carica();
  },

  preferenza(nome, valore) {
    stato.preferenze[nome] = valore;
    const { modificaDomande, ...daSalvare } = stato.preferenze;
    scrivi(locale, PREFERENZE, JSON.stringify(daSalvare));
    mostra();
  },

  // Le risposte del mattino vanno su intervals.icu con i nomi e le scale 1-4 di intervals.icu.
  async salvaDomande(risposte) {
    const m = stato.modello;
    if (m.oggi !== oggiDiChiGuarda()) {
      azioni.ricarica();
      throw new ErroreApi("giorno", "Nel frattempo è cambiato il giorno. Ho ricaricato la pagina, rispondi di nuovo.");
    }
    const ultimo = m.giorni[m.giorni.length - 1];
    const campi = {};
    if (risposte.fatica) campi.fatigue = risposte.fatica;
    if (risposte.dolori) campi.soreness = risposte.dolori;
    if (risposte.infortunio) campi.injury = risposte.infortunio;
    if (!stato.demo) {
      let risposta;
      try {
        risposta = await stato.client.salvaBenessere(m.oggi, campi);
      } catch (e) {
        if (e instanceof ErroreApi && e.tipo === "chiave") { chiaveNonValida(e.messaggio); return; }
        throw e;
      }
      // intervals.icu restituisce il giorno com'è dopo il salvataggio: fa fede quello.
      if (risposta && risposta.id === m.oggi) {
        const salvato = normalizzaGiorno(risposta);
        const tornano = Object.entries(risposte).every(([k, v]) => salvato[k] === v);
        if (!tornano) throw new ErroreApi("server", "intervals.icu non ha accettato le risposte. Forse quel giorno è bloccato nel tuo intervals.icu.");
      }
    }
    Object.assign(ultimo, risposte);
    stato.preferenze.modificaDomande = false;
    stato.appenaSalvato = true;
    mostra();
  },
};

// --- collegamenti fissi della pagina ---
bottoneAggiorna.addEventListener("click", () => azioni.ricarica());
document.getElementById("esci").addEventListener("click", () => {
  if (stato.demo) { azioni.esciDemo(); vai(stato.client ? "oggi" : "benvenuto", true); }
  else azioni.esci();
});
document.querySelector(".salta").addEventListener("click", (e) => {
  e.preventDefault();
  principale.focus();
});
window.addEventListener("hashchange", () => {
  // .../come-sto/#esempio apre direttamente i dati di esempio: comodo da mandare agli amici
  if (location.hash === "#esempio") { azioni.demo(); return; }
  mostra({ fuoco: true });
});
document.addEventListener("visibilitychange", controllaGiorno);
window.addEventListener("pageshow", controllaGiorno);
window.addEventListener("focus", controllaGiorno);
setInterval(controllaGiorno, 60000);
// Esci in un'altra scheda vale anche qui.
window.addEventListener("storage", (e) => {
  if (e.key === CHIAVE && !e.newValue && stato.client && !leggi(sessione, CHIAVE)) {
    dimentica();
    vai("benvenuto", true);
  }
});

// --- avvio ---
const parametri = new URLSearchParams(location.search);
const sulMioComputer = ["localhost", "127.0.0.1"].includes(location.hostname);
if (sulMioComputer && parametri.get("dev") === "ponte") scrivi(sessione, PONTE, "1");
const esempio = location.hash === "#esempio" || parametri.has("esempio");
// I parametri si tolgono dall'indirizzo: una ricarica non deve rientrare nell'esempio.
if (location.search || location.hash === "#esempio") {
  history.replaceState(null, "", location.pathname + (location.hash === "#esempio" ? "#oggi" : location.hash));
}
const chiaveSalvata = leggi(locale, CHIAVE) || leggi(sessione, CHIAVE);

if (esempio) {
  scrivi(sessione, DEMO, "1");
  avviaDemo();
}
if (sulMioComputer && leggi(sessione, PONTE) === "1") {
  stato.client = creaClient({ ponte: true });
  if (!stato.demo) carica();
} else if (chiaveSalvata) {
  try {
    stato.client = creaClient({ chiave: chiaveSalvata });
    if (!stato.demo) carica();
  } catch (e) {
    dimentica();
    stato.erroreAccesso = e.messaggio;
  }
} else if (!esempio && leggi(sessione, DEMO) === "1") {
  avviaDemo();
}
mostra();
