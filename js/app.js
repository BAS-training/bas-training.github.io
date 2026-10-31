// Come sto: la regia della pagina. Tiene lo stato, decide quale pagina mostrare
// e parla con intervals.icu. Le pagine vere e proprie stanno in js/viste/.

import { creaClient, ErroreApi } from "./api.js?v=202610312043";
import { OAUTH_ATTIVO } from "./config.js?v=202610312043";
import { preparaAccesso, completaAccesso, leggiRitorno } from "./oauth.js?v=202610312043";
import {
  CHIAVE, ACCESSO, leggi, scrivi, togli, leggiCredenziale, stessaCredenziale, salvaCredenziale,
  cancellaCredenziali, togliCredenziale, dopoUnCambio,
} from "./credenziali.js?v=202610312043";
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

// La chiave e l'accesso di «Entra con intervals.icu» li gestisce js/credenziali.js.
const PREFERENZE = "comesto.preferenze";
const DEMO = "comesto.demo";
const PONTE = "comesto.ponte";
const GIRO_OAUTH = "comesto.oauth.giro"; // c'è solo mentre si completa l'accesso con intervals.icu

// --- memoria del browser: tutto protetto, perché in navigazione privata può mancare ---
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
  credenziale: null,         // la chiave o l'accesso che usa questa scheda (null col ponte o da fuori)
  modello: null,
  demo: false,
  errore: null,              // errore senza dati da mostrare
  avviso: null,              // errore di aggiornamento quando i dati di prima ci sono già
  erroreAccesso: null,
  erroreConIntervals: false, // l'errore d'accesso riguarda «Entra con intervals.icu», non la chiave
  tipoErroreAccesso: null,   // il tipo dell'errore, per sapere se la pagina Collega deve portare alla chiave
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
    erroreConIntervals: stato.erroreConIntervals,
    tipoErroreAccesso: stato.tipoErroreAccesso,
    accesso: stato.client ? stato.client.accesso : null,
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

function erroreDiAccesso(messaggio, { conIntervals = false, tipo = null } = {}) {
  stato.erroreAccesso = messaggio;
  stato.erroreConIntervals = conIntervals;
  stato.tipoErroreAccesso = tipo;
}

// Con «Entra con intervals.icu» spento resta solo la chiave. Chi aveva ancora l'accesso di prima
// deve sapere che per rientrare serve quella, perché il pulsante sulla pagina non c'è.
const ACCESSO_SENZA_PULSANTE = "L'accesso a intervals.icu non vale più. Per rientrare serve la chiave API.";

// La scheda lascia i dati e il modo di entrare che stava usando, senza toccare la memoria del
// browser. Le altre schede non se ne accorgono.
function lasciaQui() {
  giro += 1; // un caricamento in corso non deve rimettere i dati dopo l'uscita
  stato.client = null;
  stato.credenziale = null;
  stato.modello = null;
  stato.demo = false;
  stato.errore = null;
  stato.avviso = null;
  stato.caricando = false;
  stato.atletaPronto = null;
}

// La scheda comincia a usare una credenziale salvata. Se non è valida la si toglie dalla memoria
// e si restituisce l'errore.
function usaCredenziale(credenziale) {
  try {
    stato.client = creaClient({ [credenziale.tipo]: credenziale.valore });
  } catch (e) {
    togliCredenziale(locale, sessione, credenziale);
    return e instanceof ErroreApi ? e : new ErroreApi("chiave", "Il modo di entrare salvato non è valido. Entra di nuovo.");
  }
  stato.credenziale = credenziale;
  return null;
}

// Un'altra scheda è entrata in un altro modo, o con un'altra chiave: questa scheda passa a quella
// senza uscire. Se stavi guardando l'esempio, resti nell'esempio.
function passaA(credenziale) {
  const demo = stato.demo;
  const modello = stato.modello;
  lasciaQui();
  erroreDiAccesso(null);
  if (usaCredenziale(credenziale)) { vai("benvenuto", true); return; }
  if (demo) {
    stato.demo = true;
    stato.modello = modello;
    mostra();
    return;
  }
  carica();
}

// intervals.icu ha risposto 401, cioè la chiave o l'accesso usati non valgono più.
function chiaveNonValida(messaggio, usata = stato.credenziale) {
  // Se intanto la scheda è già passata a un'altra credenziale, il no riguardava quella vecchia.
  if (!stessaCredenziale(usata, stato.credenziale)) return;
  const conPonte = Boolean(stato.client && stato.client.accesso === "ponte");
  // Si toglie solo la credenziale che ha avuto il no, e solo dove c'è ancora lei: un'altra
  // scheda nel frattempo può averne salvata una nuova, che va lasciata stare.
  if (usata) togliCredenziale(locale, sessione, usata);
  if (conPonte) togli(sessione, PONTE);
  lasciaQui();
  const nuova = leggiCredenziale(locale, sessione);
  if (nuova) { passaA(nuova); return; }
  const conIntervals = Boolean(usata && usata.tipo === "token");
  erroreDiAccesso(conIntervals && !OAUTH_ATTIVO ? ACCESSO_SENZA_PULSANTE : messaggio,
    { conIntervals: conIntervals && OAUTH_ATTIVO, tipo: "chiave" });
  vai("collega", true);
}

async function carica() {
  if (!stato.client) return;
  const questo = ++giro;
  const client = stato.client;
  const usata = stato.credenziale;
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
    if (errore.tipo === "chiave") { chiaveNonValida(errore.messaggio, usata); return; }
    if (stato.modello) stato.avviso = errore.messaggio;
    else stato.errore = errore;
  }
  stato.caricando = false;
  mostra();
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
    erroreDiAccesso(null);
    const credenziale = { tipo: "chiave", valore: chiave };
    salvaCredenziale(locale, sessione, credenziale, ricorda);
    stato.client = client;
    stato.credenziale = credenziale;
    stato.atletaPronto = atleta;
    vai("oggi", true);
    carica();
    return null;
  },

  // «Entra con intervals.icu». Si va su intervals.icu e si torna qui con il codice (vedi l'avvio).
  // Se non si parte restituisce { tipo, messaggio }, così la pagina sa se portare alla chiave.
  async entraConIntervals(ricorda) {
    if (navigator.onLine === false) {
      return { tipo: "rete", messaggio: "Non c'è connessione. Collegati a internet e premi di nuovo «Entra con intervals.icu»." };
    }
    let indirizzo;
    try {
      indirizzo = await preparaAccesso({ ricorda, memoria: sessione });
    } catch (e) {
      return e instanceof ErroreApi
        ? { tipo: e.tipo, messaggio: e.messaggio }
        : { tipo: null, messaggio: "Non sono riuscito a preparare l'accesso. Riprova." };
    }
    location.assign(indirizzo);
    return null;
  },

  // Esci vale per tutte le schede, perché cancella la credenziale dalla memoria del browser.
  async esci(dopo = "benvenuto") {
    const client = stato.client;
    const conIntervals = Boolean(client && client.revoca);
    const senzaRete = navigator.onLine === false;
    let domanda;
    if (conIntervals && senzaRete) {
      domanda = "Vuoi uscire? Senza connessione esci solo da questo dispositivo, e Come sto tiene il permesso su intervals.icu. Lo puoi togliere tu dalle impostazioni di intervals.icu.";
    } else if (conIntervals) {
      domanda = "Vuoi uscire? Come sto perde il permesso su intervals.icu, e uscirai anche dagli altri telefoni e computer dove sei entrato con intervals.icu. Per rientrare premi di nuovo «Entra con intervals.icu».";
    } else if (OAUTH_ATTIVO) {
      domanda = "Vuoi uscire? Per rientrare premi «Entra con intervals.icu», oppure incolla di nuovo la chiave.";
    } else {
      domanda = "Vuoi uscire? Per rientrare dovrai incollare di nuovo la chiave.";
    }
    if (!window.confirm(domanda)) return;
    cancellaCredenziali(locale, sessione);
    togli(sessione, PONTE);
    togli(sessione, DEMO);
    lasciaQui();
    vai(dopo, true);
    if (!conIntervals || senzaRete) return;
    // Il permesso si toglie anche su intervals.icu. Se non riesce lo si dice, perché la domanda qui
    // sopra, la Guida e la Privacy promettono che Esci lo toglie. Un 401 vuol dire che era già tolto.
    try {
      await client.revoca();
    } catch (e) {
      if (!(e instanceof ErroreApi && e.tipo === "chiave")) {
        window.alert("Sei uscito, ma non sono riuscito a togliere il permesso a Come sto su intervals.icu. Lo puoi togliere tu dalle impostazioni di intervals.icu.");
      }
    }
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
      const usata = stato.credenziale;
      let risposta;
      try {
        risposta = await stato.client.salvaBenessere(m.oggi, campi);
      } catch (e) {
        if (e instanceof ErroreApi && e.tipo === "chiave") { chiaveNonValida(e.messaggio, usata); return; }
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
// Tornando indietro il browser può rimettere la pagina com'era quando l'hai lasciata, anche da prima
// di entrare o di uscire. Se nel frattempo il modo di entrare è cambiato la si ricarica. Se no si
// riattiva solo il pulsante rimasto fermo su «Ti porto su intervals.icu», e la spunta Ricordami
// resta com'era.
window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  const conPonte = Boolean(stato.client && stato.client.accesso === "ponte");
  if (!conPonte && (locale || sessione) && !stessaCredenziale(leggiCredenziale(locale, sessione), stato.credenziale)) {
    location.reload();
    return;
  }
  const bottone = document.getElementById("entra-intervals");
  if (bottone) bottone.disabled = false;
  const testo = document.getElementById("stato-intervals");
  if (testo) testo.textContent = "";
});
// Le schede aperte seguono la credenziale salvata. Se un'altra scheda esce si esce anche qui, se entra
// in un altro modo o con un'altra chiave si passa a quella. Qui non si scrive mai nella memoria.
window.addEventListener("storage", (e) => {
  if (e.key !== null && e.key !== CHIAVE && e.key !== ACCESSO) return;
  const { azione, credenziale } = dopoUnCambio(stato.credenziale, locale, sessione);
  if (azione === "passa") passaA(credenziale);
  else if (azione === "esci") { lasciaQui(); vai("benvenuto", true); }
});

// --- avvio ---
const parametri = new URLSearchParams(location.search);
// Di ritorno da «Entra con intervals.icu» l'indirizzo porta il codice usa e getta, oppure il rifiuto.
const ritorno = OAUTH_ATTIVO ? leggiRitorno(parametri) : null;
const sulMioComputer = ["localhost", "127.0.0.1"].includes(location.hostname);
if (sulMioComputer && parametri.get("dev") === "ponte") scrivi(sessione, PONTE, "1");
const esempio = location.hash === "#esempio" || parametri.has("esempio");
// I parametri si tolgono subito dall'indirizzo. Una ricarica non deve rientrare nell'esempio,
// e il codice di intervals.icu non deve restare nella barra né nella cronologia.
if (location.search || location.hash === "#esempio") {
  history.replaceState(null, "", location.pathname + (location.hash === "#esempio" ? "#oggi" : location.hash));
}

// Quando la pagina si ricarica o si chiude, il browser fa fallire le richieste in corso appena dopo
// pagehide e poco prima di toglierla (provato). Il segno del giro allora deve restare, così la
// pagina dopo sa che l'accesso si è interrotto.
let inUscita = false;
window.addEventListener("pagehide", () => { inUscita = true; });
window.addEventListener("pageshow", () => { inUscita = false; });

// Restituisce l'accesso nuovo, oppure null con l'errore pronto per la pagina Collega.
async function completaIngresso() {
  principale.replaceChildren(vistaCaricamento("Completo l'accesso con intervals.icu…"));
  // Se la pagina si ricarica a metà, questo segno dice al giro dopo che l'accesso si è interrotto.
  scrivi(sessione, GIRO_OAUTH, "1");
  try {
    const { token, ricorda } = await completaAccesso(ritorno, { memoria: sessione });
    salvaCredenziale(locale, sessione, { tipo: "token", valore: token }, ricorda);
    togli(sessione, DEMO);
    // Se in questa scheda c'era il ponte di sviluppo, da qui in avanti vale l'accesso appena avuto.
    togli(sessione, PONTE);
    history.replaceState(null, "", location.pathname + "#oggi");
    return token;
  } catch (e) {
    // Chi è già dentro e torna con un ritorno che non risponde a una richiesta di questa scheda
    // (un link di altri, o la pagina del permesso ritrovata col tasto indietro) resta dentro
    // senza nessun messaggio. Il codice estraneo non si usa.
    if (e instanceof ErroreApi && e.tipo === "state" && leggiCredenziale(locale, sessione)) return null;
    if (e instanceof ErroreApi) erroreDiAccesso(e.messaggio, { conIntervals: true, tipo: e.tipo });
    else erroreDiAccesso("Non sono riuscito a completare l'accesso con intervals.icu. Premi di nuovo «Entra con intervals.icu».", { conIntervals: true });
    history.replaceState(null, "", location.pathname + "#collega");
    return null;
  } finally {
    if (!inUscita) togli(sessione, GIRO_OAUTH);
  }
}

async function avvia() {
  // Il segno rimasto da un caricamento di prima vuol dire che l'accesso con intervals.icu
  // si è interrotto a metà, per esempio con una ricarica mentre lo completavo.
  const interrotto = !ritorno && leggi(sessione, GIRO_OAUTH) !== null;
  if (interrotto) togli(sessione, GIRO_OAUTH);
  // Prima di disegnare la pagina si completa l'accesso, se si torna da intervals.icu.
  const nuovoAccesso = ritorno ? await completaIngresso() : null;
  // L'accesso appena avuto vale anche se il browser non è riuscito a salvarlo.
  const credenziale = nuovoAccesso ? { tipo: "token", valore: nuovoAccesso } : leggiCredenziale(locale, sessione);
  if (interrotto && !credenziale) {
    erroreDiAccesso("L'accesso con intervals.icu si è interrotto prima della fine. Premi di nuovo «Entra con intervals.icu».",
      { conIntervals: true, tipo: "interrotto" });
    history.replaceState(null, "", location.pathname + "#collega");
  }

  if (esempio) {
    scrivi(sessione, DEMO, "1");
    avviaDemo();
  }
  if (sulMioComputer && leggi(sessione, PONTE) === "1") {
    stato.client = creaClient({ ponte: true });
    if (!stato.demo) carica();
  } else if (credenziale) {
    const errore = usaCredenziale(credenziale);
    if (!errore) {
      if (!stato.demo) carica();
    } else {
      lasciaQui();
      const conIntervals = credenziale.tipo === "token";
      erroreDiAccesso(conIntervals && !OAUTH_ATTIVO ? ACCESSO_SENZA_PULSANTE : errore.messaggio,
        { conIntervals: conIntervals && OAUTH_ATTIVO, tipo: "chiave" });
    }
  } else if (!esempio && leggi(sessione, DEMO) === "1") {
    avviaDemo();
  }
  mostra();
  // Di ritorno da intervals.icu con un errore il fuoco va sul riquadro rosso, così chi usa la
  // tastiera o un lettore di schermo lo trova subito, e il pulsante dopo è «Vai al punto 3».
  if (stato.erroreAccesso && (ritorno || interrotto)) {
    const riquadro = document.getElementById("errore-accesso");
    if (riquadro) riquadro.focus();
  }
}
avvia();
