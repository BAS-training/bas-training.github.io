// Come sto: la regia della pagina. Tiene lo stato, decide quale pagina mostrare
// e parla con intervals.icu. Le pagine vere e proprie stanno in js/viste/.

import { creaClient, ErroreApi } from "./api.js";
import { costruisciModello, oggiLocale, aggiungiGiorni, GIORNI_STORICO, GIORNI_USCITE } from "./modello.js";
import { generaDemo } from "./demo.js";
import { vistaOggi } from "./viste/oggi.js";
import { vistaAndamento } from "./viste/andamento.js";
import { vistaUscite } from "./viste/uscite.js";
import { vistaObiettivo } from "./viste/obiettivo.js";
import { vistaBenvenuto, vistaCollega, vistaGuida, vistaPrivacy, vistaCaricamento, vistaErrore } from "./viste/pagine.js";

const CHIAVE = "comesto.chiave";
const PREFERENZE = "comesto.preferenze";
const DEMO = "comesto.demo";
const PONTE = "comesto.ponte";

// --- memoria del browser: tutto protetto, perché in navigazione privata può mancare ---
function leggi(memoria, nome) {
  try { return memoria.getItem(nome); } catch { return null; }
}
function scrivi(memoria, nome, valore) {
  try { memoria.setItem(nome, valore); } catch { /* memoria non disponibile: si va avanti senza */ }
}
function togli(memoria, nome) {
  try { memoria.removeItem(nome); } catch { /* niente da togliere */ }
}
function memoria(tipo) {
  try { return window[tipo]; } catch { return null; }
}
const locale = memoria("localStorage");
const sessione = memoria("sessionStorage");

function leggiPreferenze() {
  try { return JSON.parse(leggi(locale, PREFERENZE) || "{}") || {}; } catch { return {}; }
}

const stato = {
  client: null,
  modello: null,
  demo: false,
  errore: null,
  erroreAccesso: null,
  caricando: false,
  preferenze: { ...leggiPreferenze(), modificaDomande: false },
};

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
  document.getElementById("aggiorna").hidden = !visibile;
  const esci = document.getElementById("esci");
  esci.hidden = !visibile;
  esci.textContent = stato.demo ? "Esci dall'esempio" : "Esci";
}

function mostra({ fuoco = false } = {}) {
  const r = rotta();
  if (location.hash !== `#${r}`) {
    history.replaceState(null, "", `#${r}`);
  }
  const def = VISTE[r];
  if (!def.libera && !dentro()) { vai("benvenuto", true); return; }
  if (r === "benvenuto" && dentro()) { vai("oggi", true); return; }

  aggiornaNavigazione(r);
  const ctx = {
    modello: stato.modello,
    demo: stato.demo,
    preferenze: stato.preferenze,
    erroreAccesso: stato.erroreAccesso,
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

async function carica() {
  if (!stato.client) return;
  stato.caricando = true;
  stato.errore = null;
  mostra();
  const oggi = oggiLocale();
  try {
    const [atleta, benessere, uscite] = await Promise.all([
      stato.client.atleta(),
      stato.client.benessere(aggiungiGiorni(oggi, -(GIORNI_STORICO - 1)), oggi),
      stato.client.uscite(aggiungiGiorni(oggi, -(GIORNI_USCITE - 1)), oggi),
    ]);
    stato.modello = costruisciModello({ atleta, benessere, uscite }, oggi);
  } catch (e) {
    const errore = e instanceof ErroreApi ? e : new ErroreApi("server", "Qualcosa è andato storto leggendo i dati. Riprova fra poco.");
    if (errore.tipo === "chiave") {
      dimentica();
      stato.erroreAccesso = errore.messaggio + " Incollane una nuova.";
      stato.caricando = false;
      vai("collega", true);
      return;
    }
    stato.errore = errore;
  }
  stato.caricando = false;
  mostra();
}

function dimentica() {
  togli(locale, CHIAVE);
  togli(sessione, CHIAVE);
  togli(sessione, PONTE);
  togli(sessione, DEMO);
  stato.client = null;
  stato.modello = null;
  stato.demo = false;
  stato.errore = null;
}

function avviaDemo() {
  const oggi = oggiLocale();
  stato.demo = true;
  stato.modello = costruisciModello(generaDemo(oggi), oggi);
}

const azioni = {
  async entra(chiave, ricorda) {
    const client = creaClient({ chiave });
    try {
      await client.atleta();
    } catch (e) {
      return e instanceof ErroreApi ? e.messaggio : "Non sono riuscito a controllare la chiave. Riprova.";
    }
    togli(sessione, DEMO);
    stato.demo = false;
    stato.modello = null;
    stato.erroreAccesso = null;
    if (ricorda) { scrivi(locale, CHIAVE, chiave); togli(sessione, CHIAVE); }
    else { scrivi(sessione, CHIAVE, chiave); togli(locale, CHIAVE); }
    stato.client = client;
    vai("oggi", true);
    carica();
    return null;
  },

  esci() {
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
  },

  ricarica() {
    if (stato.demo) { avviaDemo(); mostra(); return; }
    carica();
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
    const oggi = m.giorni[m.giorni.length - 1];
    const campi = {};
    if (risposte.fatica) campi.fatigue = risposte.fatica;
    if (risposte.dolori) campi.soreness = risposte.dolori;
    if (risposte.infortunio) campi.injury = risposte.infortunio;
    if (!stato.demo) await stato.client.salvaBenessere(m.oggi, campi);
    Object.assign(oggi, risposte);
    stato.preferenze.modificaDomande = false;
    mostra();
  },
};

// --- collegamenti fissi della pagina ---
document.getElementById("aggiorna").addEventListener("click", () => azioni.ricarica());
document.getElementById("esci").addEventListener("click", () => {
  if (stato.demo) { azioni.esciDemo(); vai("benvenuto", true); }
  else azioni.esci();
});
document.querySelector(".salta").addEventListener("click", (e) => {
  e.preventDefault();
  principale.focus();
});
window.addEventListener("hashchange", () => {
  // advlabbik.github.io/come-sto/#esempio apre direttamente i dati di esempio: comodo da mandare agli amici
  if (location.hash === "#esempio") { azioni.demo(); return; }
  mostra({ fuoco: true });
});

// Se la pagina resta aperta e cambia il giorno, si rilegge tutto quando torni a guardarla.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && stato.modello && stato.modello.oggi !== oggiLocale()) {
    azioni.ricarica();
  }
});

// --- avvio ---
const sulMioComputer = ["localhost", "127.0.0.1"].includes(location.hostname);
if (sulMioComputer && new URLSearchParams(location.search).get("dev") === "ponte") scrivi(sessione, PONTE, "1");
const chiaveSalvata = leggi(locale, CHIAVE) || leggi(sessione, CHIAVE);

if (sulMioComputer && leggi(sessione, PONTE) === "1") {
  stato.client = creaClient({ ponte: true });
  carica();
} else if (chiaveSalvata) {
  stato.client = creaClient({ chiave: chiaveSalvata });
  carica();
} else if (location.hash === "#esempio" || new URLSearchParams(location.search).has("esempio") || leggi(sessione, DEMO) === "1") {
  scrivi(sessione, DEMO, "1");
  avviaDemo();
  if (location.hash === "#esempio") history.replaceState(null, "", "#oggi");
}
mostra();
