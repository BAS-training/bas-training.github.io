// Come sto: la regia della pagina. Tiene lo stato, legge da intervals.icu e dal telefono, chiede i
// conti a js/motore.js, salva quello che il motore dice di salvare e decide quale pagina mostrare.
// Le pagine stanno in js/viste/ e ricevono sempre lo stesso ctx, descritto in cima a js/motore.js.

import { creaClient, ErroreApi, leggiNuovi } from "./api.js?v=202611021705";
import { OAUTH_ATTIVO, SCRITTURE } from "./config.js?v=202611021705";
import { preparaAccesso, completaAccesso, leggiRitorno } from "./oauth.js?v=202611021705";
import {
  CHIAVE, ACCESSO, leggi, scrivi, togli, leggiCredenziale, stessaCredenziale, salvaCredenziale,
  cancellaCredenziali, togliCredenziale, dopoUnCambio,
} from "./credenziali.js?v=202611021705";
import { normalizzaGiorno, oggiLocale, oggiNelFuso, aggiungiGiorni, p2 } from "./modello.js?v=202611021705";
import { creaMemoria, CHIAVI, nomeCopia } from "./memoria.js?v=202611021705";
import {
  calcola, giorniDelViaggioDi, giroDelTelefono, spostaGiorno, spostaWeekend, confrontaAtleta, codaPuoPartire,
} from "./motore.js?v=202611021705";
import { leggiInvito, palestraAbbinata } from "./dati.js?v=202611021705";
import {
  inCoda, inviaCoda, leggiCoda, scriviSforzo, scriviBorse, aggiungiEtichette, etichettaPalestra, codiceCasuale,
} from "./scritture.js?v=202611021705";
import { sedutaFatta } from "./palestra.js?v=202611021705";
import { CONSENSO, ESCI, AVVISI } from "./testi-app.js?v=202611021705";
import { generaDemo } from "./demo.js?v=202611021705";
import { vistaOggi } from "./viste/oggi.js?v=202611021705";
import { vistaSettimana } from "./viste/settimana.js?v=202611021705";
import { vistaPronto } from "./viste/pronto.js?v=202611021705";
import { vistaPalestra } from "./viste/palestra.js?v=202611021705";
import { vistaNumeri } from "./viste/numeri.js?v=202611021705";
import { vistaInizio } from "./viste/inizio.js?v=202611021705";
import { vistaImpostazioni } from "./viste/impostazioni.js?v=202611021705";
import { vistaAtletaDiverso } from "./viste/accesso.js?v=202611021705";
import {
  vistaBenvenuto, vistaCollega, vistaGuida, vistaPrivacy, vistaCaricamento, vistaErrore, vistaConsenso, dialogo,
} from "./viste/pagine.js?v=202611021705";

// Dentro un riquadro di un altro sito la pagina non si apre: nessuno deve poterla "travestire".
if (window.top !== window.self) {
  document.body.textContent = "Come sto si apre solo nella sua pagina, non dentro un altro sito.";
  throw new Error("Come sto non si apre dentro un altro sito");
}

// La chiave e l'accesso di «Entra con intervals.icu» li gestisce js/credenziali.js, i dati di Come sto
// sul telefono js/memoria.js. Queste tre voci della scheda restano qui.
const DEMO = "comesto.demo";
const PONTE = "comesto.ponte";
const GIRO_OAUTH = "comesto.oauth.giro"; // c'è solo mentre si completa l'accesso con intervals.icu

// --- memoria del browser: tutto protetto, perché in navigazione privata può mancare ---
function memoriaDelBrowser(tipo) {
  try { return window[tipo]; } catch { return null; }
}
const locale = memoriaDelBrowser("localStorage");
const sessione = memoriaDelBrowser("sessionStorage");
const memoria = creaMemoria(locale, { sessione });

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const oggetto = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : null);
const num = (v) => typeof v === "number" && Number.isFinite(v);

// Le chiavi del telefono che il motore legge, con i nomi che usa (js/motore.js, calcola).
const DEL_TELEFONO = {
  preferenze: CHIAVI.preferenze, profilo: CHIAVI.profilo, obiettivo: CHIAVI.obiettivo, disponibilita: CHIAVI.disponibilita,
  piano: CHIAVI.piano, uscite: CHIAVI.uscite, palestra: CHIAVI.palestra, mattino: CHIAVI.mattino, esiti: CHIAVI.esiti,
  domenica: CHIAVI.domenica, invito: CHIAVI.invito,
};
const MAPPE = new Set(["uscite", "palestra", "mattino", "esiti", "domenica"]);

function telefonoVuoto() {
  const t = {};
  for (const nome of Object.keys(DEL_TELEFONO)) t[nome] = MAPPE.has(nome) ? {} : null;
  t.preferenze = {};
  t.profilo = {};
  return t;
}

function uiIniziale() {
  return {
    modificaDomande: false,  // il modulo delle domande del mattino riaperto con «Cambia le risposte»
    modificaViaggio: false,  // lo stesso per le domande in viaggio
    stoMale: false,          // il pannello «Sto male» aperto
    toccataStoMale: null,    // l'ultima casella di «Sto male» toccata, per mostrare l'esito subito sotto
    cause: false,            // la riga «Ieri sera…» aperta
    rispondoDopo: false,     // la domanda di controllo rimandata, solo per questa apertura
    carta: null,             // la carta del semaforo di questa apertura, una sola (6.4)
    carteMostrate: null,     // le chiavi delle carte in più di questa apertura (6.4), fissate la prima volta
    salvato: null,           // dove mostrare «Salvato.» in Impostazioni
    viaggioLungo: false,     // la riga del medico prima di un viaggio lungo è già comparsa in questa apertura
    dispositivo: null,       // il dispositivo scelto nella pagina Collega, che cambia solo le istruzioni
    bozzaMattino: null,      // le risposte del mattino scelte e non ancora salvate, che un ridisegno non perde
    bozzaViaggio: null,      // lo stesso per le domande in viaggio
    perche: false,           // «Perché» aperto
    numeri: false,           // «Per chi ama i numeri» aperto
    inizioVisto: false,      // il primo avvio è già comparso in questa apertura
    sezione: null,           // la parte della pagina da portare in vista, per #andamento e #uscite
  };
}

const stato = {
  client: null,
  credenziale: null,         // la chiave o l'accesso che usa questa scheda (null col ponte o da fuori)
  letture: null,             // { atleta, benessere, attivita } dell'ultima lettura, o dell'esempio
  cache: null,               // comesto.cache.v1, per leggere solo i giorni nuovi (6.7)
  motore: null,              // quello che calcola js/motore.js, con modello, esito e giorno
  oggi: null,
  demo: false,
  demoDati: null,            // il telefono dell'esempio, solo in questa pagina
  errore: null,              // errore senza dati da mostrare
  avviso: null,              // errore di aggiornamento quando i dati di prima ci sono già
  messaggio: null,           // un avviso da mostrare una volta, per esempio dopo «Esci e cancella tutto»
  erroreAccesso: null,
  erroreConIntervals: false, // l'errore d'accesso riguarda «Entra con intervals.icu», non la chiave
  tipoErroreAccesso: null,   // il tipo dell'errore, per sapere se la pagina Collega deve portare alla chiave
  caricando: false,
  appenaSalvato: false,
  atletaPronto: null,        // l'atleta letto all'ingresso, per non chiederlo due volte
  serveConsenso: false,      // dentro con la chiave o l'accesso, ma senza il consenso di questa versione
  avvisatoMemoria: false,    // l'avviso della memoria che non tiene è già comparso in questa apertura
  daVerificare: false,       // con una credenziale nuova si controlla di chi sono i dati del telefono
  impronta: null,            // l'impronta dell'atleta della credenziale in uso, quando si sa
  atletaDiverso: false,      // i dati del telefono sono di un altro atleta, e si aspetta la scelta (R21)
  tel: telefonoVuoto(),      // le chiavi comesto.* del telefono
  ui: uiIniziale(),
};
let giro = 0;                // ogni caricamento ha il suo numero: vince solo l'ultimo

// Quando la memoria del telefono non tiene, cioè dopo una scrittura non riuscita, valgono le risposte
// che sono in pagina, e rileggere la memoria le cancellerebbe (6.6).
function leggiMemoria() {
  if (!memoria.tiene()) return;
  const t = {};
  for (const [nome, chiave] of Object.entries(DEL_TELEFONO)) {
    const v = memoria.leggi(chiave);
    t[nome] = MAPPE.has(nome) ? oggetto(v) || {} : oggetto(v);
  }
  t.preferenze = t.preferenze || {};
  t.profilo = t.profilo || {};
  stato.tel = t;
}

// Il telefono che vede il motore, quello vero oppure quello dell'esempio, che resta nella pagina.
function telefono() {
  return stato.demo && stato.demoDati ? stato.demoDati : stato.tel;
}

function consensoValido() {
  const c = oggetto(memoria.leggi(CHIAVI.consenso));
  return Boolean(c && c.versione === CONSENSO.versione);
}

function salvaConsenso() {
  memoria.scrivi(CHIAVI.consenso, { versione: CONSENSO.versione, data: oggiLocale() });
  stato.serveConsenso = false;
}

// --- scritture sul telefono, rilette dalla memoria prima di cambiarle ---

function pulito(voce) {
  const v = {};
  for (const [k, x] of Object.entries(voce)) {
    if (x === null || x === undefined || (Array.isArray(x) && !x.length)) continue;
    v[k] = x;
  }
  return v;
}

// Ogni scrittura passa da memoria.cambia, che parte dalla memoria e, se la memoria non tiene, da
// quello che c'è in pagina. Una scrittura non riuscita si dice una volta per apertura (6.6).
function salvaSulTelefono(chiave, fn, inPagina) {
  const esito = memoria.cambia(chiave, fn, inPagina);
  if (!esito.salvato && !stato.avvisatoMemoria) {
    stato.avvisatoMemoria = true;
    stato.messaggio = AVVISI.soloPagina;
  }
  return esito.valore;
}

// Cambia una chiave del telefono, o quella dell'esempio, che resta nella pagina. fn riceve una copia
// del valore e lo cambia sul posto, oppure ne restituisce uno nuovo, anche null per toglierlo.
function cambiaTelefono(nome, fn) {
  const t = telefono();
  const vuoto = MAPPE.has(nome) ? {} : null;
  if (stato.demo && stato.demoDati) {
    const prima = t[nome] === null || t[nome] === undefined ? vuoto : JSON.parse(JSON.stringify(t[nome]));
    const r = fn(prima);
    if (r === false) return;
    t[nome] = r === undefined || r === true ? prima : r;
    return;
  }
  const valore = salvaSulTelefono(DEL_TELEFONO[nome], fn, t[nome]);
  t[nome] = MAPPE.has(nome) ? oggetto(valore) || {} : oggetto(valore);
  if (nome === "preferenze" || nome === "profilo") t[nome] = t[nome] || {};
}

// Cambia la voce di un giorno del diario (comesto.mattino.v1). Un campo null o vuoto si toglie.
function aggiornaDiario(giorno, campi) {
  cambiaTelefono("mattino", (diario) => {
    const voce = pulito({ ...(oggetto(diario[giorno]) || {}), ...campi });
    if (Object.keys(voce).length) diario[giorno] = voce;
    else delete diario[giorno];
    return diario;
  });
}

function aggiornaProfilo(campi) {
  cambiaTelefono("profilo", (prima) => {
    const nuovo = pulito({ ...(oggetto(prima) || {}), ...campi });
    return Object.keys(nuovo).length ? nuovo : null;
  });
}

// La storia degli esiti (comesto.esiti.v1). cambia riceve la mappa e la modifica, e con false non
// cambia niente.
function aggiornaStoria(cambia) {
  cambiaTelefono("esiti", cambia);
}

function salvaPreferenze(campi) {
  cambiaTelefono("preferenze", (prima) => ({ ...(oggetto(prima) || {}), ...campi }));
}

// Una voce di comesto.uscite.v1, con le risposte sull'attività. carte e prova si uniscono, il resto
// si sostituisce, e un campo null si toglie.
function aggiornaUscita(id, campi) {
  cambiaTelefono("uscite", (uscite) => {
    const prima = oggetto(uscite[id]) || {};
    const voce = { ...prima, ...campi };
    if (campi.carte) voce.carte = { ...(oggetto(prima.carte) || {}), ...campi.carte };
    uscite[id] = pulito(voce);
    return uscite;
  });
}

// --- lo stato del giorno, che calcola il motore ---

// L'ora locale di adesso, «2026-11-01T08:30», per la finestra dello sforzo e le carte della sera.
function oraLocale(d = new Date()) {
  return `${oggiLocale(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

function ricalcola() {
  if (!stato.letture || !stato.oggi) {
    stato.motore = null;
    return;
  }
  const t = telefono();
  const r = calcola({
    oggi: stato.oggi,
    adesso: oraLocale(),
    letture: stato.letture,
    telefono: t,
    ui: { carteMostrate: stato.ui.carteMostrate },
  });

  // La riga del medico prima di un viaggio lungo compare una volta per evento (4.9).
  const partenza = r.obiettivo ? r.obiettivo.partenza : null;
  const visto = stato.demo ? null : t.preferenze.vistoViaggioLungo;
  if (r.esito.medico.some((x) => x.chiave === "viaggioLungo")) {
    if (!stato.ui.viaggioLungo && visto === partenza) {
      r.esito.medico = r.esito.medico.filter((x) => x.chiave !== "viaggioLungo");
    } else if (!stato.ui.viaggioLungo) {
      stato.ui.viaggioLungo = true;
      if (!stato.demo) salvaPreferenze({ vistoViaggioLungo: partenza });
    }
  }

  // Le carte di questa apertura restano quelle della prima volta, una risposta le toglie (6.4).
  if (stato.ui.carteMostrate === null) stato.ui.carteMostrate = r.carteInPiu.map((c) => c.chiave);
  if (stato.ui.carta === null && r.giorno.carte.length) stato.ui.carta = r.giorno.carte[0];
  r.giorno.carta = r.giorno.carte.includes(stato.ui.carta) ? stato.ui.carta : null;

  // Su iPhone in Safari, e non dall'icona, una volta (6.6).
  r.messaggi.iphone = suIphoneInSafari() && !t.preferenze.vistoIphone && !stato.demo;
  stato.motore = r;
  salvaDalMotore(r.daSalvare);
}

function suIphoneInSafari() {
  try {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const dallIcona = navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    return ios && !dallIcona;
  } catch {
    return false;
  }
}

// Quello che il motore dice di salvare. Il piano nuovo, la voce della domenica e l'esito del giorno,
// per i giorni di guardia, la malattia e i gialli di fila dei giorni dopo (4.2, passo 12). Con
// l'esempio resta nella pagina.
function salvaDalMotore({ piano, esito, domenica }) {
  const t = telefono();
  if (stato.demo) {
    if (piano) t.piano = piano;
    if (domenica) t.domenica = { ...t.domenica, [domenica.chiave]: domenica.voce };
    return;
  }
  if (!stato.client || stato.serveConsenso || stato.atletaDiverso || stato.oggi !== oggiDiChiGuarda()) return;
  if (piano) cambiaTelefono("piano", () => piano);
  if (domenica) {
    cambiaTelefono("domenica", (mappa) => {
      if (JSON.stringify(mappa[domenica.chiave]) === JSON.stringify(domenica.voce)) return false;
      mappa[domenica.chiave] = domenica.voce;
      return mappa;
    });
  }
  if (esito) {
    const oggi = stato.oggi;
    aggiornaStoria((storia) => {
      if (JSON.stringify(storia[oggi]) === JSON.stringify(esito)) return false;
      storia[oggi] = esito;
      return true;
    });
  }
}

const VISTE = {
  benvenuto: { titolo: "Benvenuto", libera: true, disegna: vistaBenvenuto },
  collega: { titolo: "Collega i tuoi dati", libera: true, disegna: vistaCollega },
  guida: { titolo: "Guida", libera: true, disegna: vistaGuida },
  privacy: { titolo: "Privacy", libera: true, disegna: vistaPrivacy },
  impostazioni: { titolo: "Impostazioni", libera: true, disegna: vistaImpostazioni },
  oggi: { titolo: "Oggi", disegna: vistaOggi },
  settimana: { titolo: "Settimana", disegna: vistaSettimana },
  pronto: { titolo: "Pronto?", disegna: vistaPronto },
  numeri: { titolo: "Numeri", disegna: vistaNumeri },
  palestra: { titolo: "Palestra", disegna: vistaPalestra },
  inizio: { titolo: "La tua avventura", disegna: vistaInizio },
};

// Le rotte di prima. Obiettivo è diventata Pronto?, Andamento e Uscite stanno dentro Numeri (7.2).
const ALIAS = {
  obiettivo: { rotta: "pronto", sezione: null },
  andamento: { rotta: "numeri", sezione: "numeri-andamento" },
  uscite: { rotta: "numeri", sezione: "numeri-uscite" },
};

const dentro = () => Boolean(stato.client || stato.demo);
// Dentro con i propri dati e con il consenso, oppure nell'esempio.
const conIDati = () => Boolean(stato.demo || (stato.client && !stato.serveConsenso && !stato.atletaDiverso));
const oggiDiChiGuarda = () => (stato.motore && !stato.demo ? oggiNelFuso(stato.motore.modello.atleta.fuso) : oggiLocale());

function rotta() {
  const r = location.hash.replace(/^#/, "");
  if (VISTE[r]) return r;
  if (ALIAS[r]) {
    stato.ui.sezione = ALIAS[r].sezione;
    return ALIAS[r].rotta;
  }
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
  const visibile = conIDati();
  for (const id of ["nav", "barra"]) {
    const el = document.getElementById(id);
    el.hidden = !visibile;
    for (const a of el.querySelectorAll("a[data-rotta]")) {
      if (a.dataset.rotta === r || (r === "palestra" && a.dataset.rotta === "settimana")) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
  }
  document.body.classList.toggle("con-barra", visibile);
  bottoneAggiorna.hidden = !visibile;
  bottoneAggiorna.disabled = stato.caricando;
  bottoneAggiorna.setAttribute("aria-busy", stato.caricando ? "true" : "false");
  const esci = document.getElementById("esci");
  esci.hidden = !dentro();
  esci.textContent = stato.demo ? "Esci dall'esempio" : "Esci";

  // Un aggiornamento non riuscito non cancella i dati di prima: lo si dice e si offre di riprovare.
  riquadroAvviso.replaceChildren();
  if (stato.messaggio) {
    riquadroAvviso.hidden = false;
    riquadroAvviso.append(stato.messaggio);
    stato.messaggio = null;
    return;
  }
  riquadroAvviso.hidden = !(stato.avviso && stato.motore && !VISTE[r].libera);
  if (!riquadroAvviso.hidden) {
    const riprova = document.createElement("button");
    riprova.type = "button";
    riprova.className = "collegamento";
    riprova.textContent = "Riprova";
    riprova.addEventListener("click", () => azioni.ricarica());
    riquadroAvviso.append(`Non sono riuscito ad aggiornare. ${stato.avviso} Vedi i dati dell'ultima lettura. `, riprova);
  }
}

// Ci sono ancora dati di Come sto su questo dispositivo, per esempio dopo Esci.
function datiSulDispositivo() {
  for (const m of [locale, sessione]) {
    try {
      for (let i = 0; m && i < m.length; i++) {
        const k = m.key(i);
        if (typeof k === "string" && k.startsWith("comesto.")) return true;
      }
    } catch { /* memoria non disponibile */ }
  }
  return false;
}

// Il contesto di tutte le pagine (il contratto sta in cima a js/motore.js).
function contesto() {
  const r = stato.motore;
  const t = telefono();
  return {
    modello: r ? r.modello : null,
    esito: r ? r.esito : null,
    giorno: r ? r.giorno : null,
    demo: stato.demo,
    dentro: conIDati(),
    preferenze: { ...(t.preferenze || {}) },
    profilo: t.profilo || {},
    ui: stato.ui,
    erroreAccesso: stato.erroreAccesso,
    erroreConIntervals: stato.erroreConIntervals,
    tipoErroreAccesso: stato.tipoErroreAccesso,
    accesso: stato.client ? stato.client.accesso : null,
    appenaSalvato: stato.appenaSalvato,
    consensoPrima: stato.serveConsenso ? oggetto(memoria.leggi(CHIAVI.consenso)) : null,
    datiSulDispositivo: datiSulDispositivo(),
    oggi: r ? r.oggi : stato.oggi || oggiLocale(),
    adesso: r ? r.adesso : oraLocale(),
    attivita: r ? r.attivita : [],
    giorniPuliti: r ? r.giorniPuliti : [],
    serie: r ? r.serie : [],
    fitness: r ? r.fitness : { comeSto: null, intervals: null, differenza: null },
    k: r ? r.k : null,
    obiettivo: r ? r.obiettivo : null,
    stima: r ? r.stima : null,
    prontezza: r ? r.prontezza : null,
    piano: r ? r.piano : null,
    settimana: r ? r.settimana : null,
    seduta: r ? r.seduta : null,
    palestra: r ? r.palestra : { registro: [], conto: null, oggi: null, fase: null },
    domenica: r ? r.domenica : { controllo: null, voce: null },
    carteInPiu: r ? r.carteInPiu.filter((c) => !rispostaInPagina(c)) : [],
    carteAperte: r ? r.carteAperte.filter((c) => !rispostaInPagina(c)) : [],
    messaggi: r ? r.messaggi : { soloStrava: false, notteNonArriva: false, copia: false, iphone: false },
    invito: r ? r.invito : null,
    primoAvvio: r ? r.primoAvvio : false,
    disponibilita: r ? r.disponibilita : null,
    coda: { attiva: SCRITTURE.attivita === true, quante: leggiCoda(memoria).length },
    azioni,
  };
}

// Una carta di questa apertura a cui la persona ha appena risposto non si mostra più (6.4).
function rispostaInPagina(carta) {
  const t = telefono();
  if (carta.tipo === "seduta") return Boolean(oggetto(t.mattino[carta.giorno]) && t.mattino[carta.giorno].sedutaPiano);
  if (!carta.attivita) return false;
  const v = oggetto(t.uscite[carta.attivita.id]);
  return Boolean(v && oggetto(v.carte) && v.carte[carta.tipo]);
}

function mostra({ fuoco = false } = {}) {
  const r = rotta();
  if (location.hash !== `#${r}`) history.replaceState(null, "", `#${r}`);
  const def = VISTE[r];
  if (!def.libera && !dentro()) { vai("benvenuto", true); return; }
  if (r === "benvenuto" && dentro()) { vai("oggi", true); return; }
  // Al primo avvio, finché manca l'obiettivo, Oggi porta una volta per apertura alla scelta (7.3).
  if (r === "oggi" && conIDati() && stato.motore && stato.motore.primoAvvio && !stato.ui.inizioVisto && !stato.demo) {
    stato.ui.inizioVisto = true;
    vai("inizio", true);
    return;
  }

  aggiornaNavigazione(r);
  const ctx = contesto();

  let vista;
  if (def.libera) vista = def.disegna(ctx);
  else if (stato.client && !stato.demo && stato.serveConsenso) vista = vistaConsenso(ctx);
  else if (stato.client && !stato.demo && stato.atletaDiverso) vista = vistaAtletaDiverso(ctx);
  else if (stato.errore && !stato.motore) vista = vistaErrore(ctx, stato.errore);
  else if (!stato.motore) vista = vistaCaricamento();
  else vista = def.disegna(ctx);

  // Si ridisegna la pagina intera: si tiene il punto in cui eri e l'elemento col fuoco, alla stessa
  // altezza sullo schermo anche se sopra la carta è cambiata.
  const scorrimento = window.scrollY;
  const prima = document.activeElement;
  const eraDentro = Boolean(prima && prima !== principale && principale.contains(prima));
  const attivo = eraDentro ? prima.id : "";
  const altezzaPrima = eraDentro ? prima.getBoundingClientRect().top : null;
  const sezionePrima = eraDentro && prima.closest("section[id]") ? prima.closest("section[id]").id : "";
  principale.replaceChildren(vista);
  document.title = r === "benvenuto" ? "Come sto" : `${def.titolo} · Come sto`;
  principale.classList.toggle("in-aggiornamento", stato.caricando && Boolean(stato.motore));

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
  // #andamento e #uscite portano alla loro parte di Numeri.
  if (stato.ui.sezione) {
    const parte = document.getElementById(stato.ui.sezione);
    stato.ui.sezione = null;
    if (parte) {
      parte.setAttribute("tabindex", "-1");
      parte.scrollIntoView({ block: "start" });
      parte.focus({ preventScroll: true });
      return;
    }
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
    if (!eraDentro) return;
    const di = attivo ? document.getElementById(attivo) : null;
    if (di && principale.contains(di)) {
      di.focus({ preventScroll: true });
      const spostato = di.getBoundingClientRect().top - altezzaPrima;
      if (Math.abs(spostato) > 1) window.scrollBy(0, spostato);
      return;
    }
    // Il tasto premuto non c'è più. Il fuoco va al titolo della stessa sezione, in Impostazioni, o al
    // titolo della carta di oggi, così chi usa la tastiera non riparte dall'inizio della pagina (7.4).
    const sezione = sezionePrima ? document.getElementById(sezionePrima) : null;
    const ripiego = (sezione && principale.contains(sezione) && sezione.querySelector("h2"))
      || document.getElementById("semaforo-titolo") || principale.querySelector("h1");
    if (ripiego) {
      ripiego.setAttribute("tabindex", "-1");
      ripiego.focus({ preventScroll: true });
      const riquadro = ripiego.getBoundingClientRect();
      if (riquadro.top < 0 || riquadro.bottom > window.innerHeight) ripiego.scrollIntoView({ block: "center" });
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
  stato.letture = null;
  stato.cache = null;
  stato.motore = null;
  stato.oggi = null;
  stato.demo = false;
  stato.demoDati = null;
  stato.errore = null;
  stato.avviso = null;
  stato.caricando = false;
  stato.atletaPronto = null;
  stato.serveConsenso = false;
  stato.daVerificare = false;
  stato.impronta = null;
  stato.atletaDiverso = false;
  stato.ui = uiIniziale();
  // Con la memoria che non tiene le risposte stanno solo nella pagina, e se ne vanno con chi esce.
  if (!memoria.tiene()) stato.tel = telefonoVuoto();
}

// La scheda comincia a usare una credenziale salvata. Se non è valida la si toglie dalla memoria
// e si restituisce l'errore. Con una credenziale nuova si controlla di chi sono i dati del telefono.
function usaCredenziale(credenziale, { nuova = false } = {}) {
  try {
    stato.client = creaClient({ [credenziale.tipo]: credenziale.valore });
  } catch (e) {
    togliCredenziale(locale, sessione, credenziale);
    return e instanceof ErroreApi ? e : new ErroreApi("chiave", "Il modo di entrare salvato non è valido. Entra di nuovo.");
  }
  stato.credenziale = credenziale;
  stato.serveConsenso = !consensoValido();
  if (nuova) stato.daVerificare = true;
  return null;
}

// Un'altra scheda è entrata in un altro modo, o con un'altra chiave: questa scheda passa a quella
// senza uscire. Se stavi guardando l'esempio, resti nell'esempio.
function passaA(credenziale) {
  const demo = stato.demo;
  const letture = stato.letture;
  const demoDati = stato.demoDati;
  const oggi = stato.oggi;
  lasciaQui();
  erroreDiAccesso(null);
  leggiMemoria();
  if (usaCredenziale(credenziale, { nuova: true })) { vai("benvenuto", true); return; }
  if (demo) {
    stato.demo = true;
    stato.letture = letture;
    stato.demoDati = demoDati;
    stato.oggi = oggi;
    ricalcola();
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

// --- l'impronta dell'atleta (R21) ---

// L'impronta di un atleta, un hash SHA-256 dell'id di intervals.icu, così sul telefono non resta l'id
// in chiaro. Senza crypto.subtle, cioè fuori da una pagina sicura, un hash semplice.
async function improntaDi(id) {
  const testo = `come-sto:${id}`;
  try {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(testo));
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let x = 0x811c9dc5;
    for (let i = 0; i < testo.length; i++) x = Math.imul(x ^ testo.charCodeAt(i), 0x01000193) >>> 0;
    return `f${x.toString(16)}`;
  }
}

// Di chi sono i dati del telefono, con il profilo appena letto. Al primo ingresso il telefono si lega a
// chi entra. Con un atleta diverso la pagina ferma tutto e chiede (vistaAtletaDiverso). conIlDubbio
// falso vuol dire che il profilo arriva dalla lettura di ogni 7 giorni, con la stessa credenziale, e
// allora si lega solo un telefono che non lo era ancora.
async function verificaAtleta(intero, { conIlDubbio = true } = {}) {
  const id = intero && (intero.id ?? null);
  if (id === null || id === undefined || stato.demo) return "ignoto";
  const impronta = await improntaDi(String(id));
  stato.impronta = impronta;
  const salvata = oggetto(memoria.leggi(CHIAVI.atleta));
  const esito = confrontaAtleta(salvata, impronta);
  if (esito === "nuovo") memoria.scrivi(CHIAVI.atleta, { impronta, dal: oggiLocale() });
  if (esito === "diverso" && conIlDubbio) stato.atletaDiverso = true;
  stato.daVerificare = false;
  return esito;
}

// --- le scritture verso intervals.icu, spente finché non sono provate (9.12) ---

function codaAccesa() {
  return codaPuoPartire({
    attive: SCRITTURE.attivita === true, demo: stato.demo, impronta: stato.impronta,
    salvata: oggetto(memoria.leggi(CHIAVI.atleta)), atletaDiverso: stato.atletaDiverso,
  }) && Boolean(stato.client) && !stato.serveConsenso;
}

// Manda la coda in sottofondo. Non lancia mai errori, e quello che non parte riparte all'apertura dopo.
async function inviaLaCoda(lette = null) {
  if (!codaAccesa()) return;
  try {
    await inviaCoda(stato.client, memoria, { lette: lette || (stato.letture ? stato.letture.attivita : []) });
  } catch { /* la coda riparte all'apertura dopo */ }
  leggiMemoria();
}

// Le scritture di una risposta su un'attività (6.6), in coda e poi mandate, solo con la coda accesa.
function accodaRisposta(id, campi) {
  if (!codaAccesa() || !stato.motore) return;
  const a = stato.motore.attivita.find((x) => x.id === id);
  if (!a) return;
  const lista = [];
  if (num(campi.sforzo)) lista.push(scriviSforzo(a, campi.sforzo));
  if (campi.borse !== undefined) lista.push(scriviBorse(a, { borse: campi.borse, kg: campi.kg ?? null, notteFuori: campi.notteFuori === true }));
  if (campi.allenato) lista.push(aggiungiEtichette(a, [etichettaPalestra(campi.allenato)].filter(Boolean)));
  for (const s of lista.filter(Boolean)) inCoda(s, memoria);
  inviaLaCoda();
}

// --- la lettura dei dati ---

async function carica({ aggiorna = false } = {}) {
  if (!stato.client) return;
  // Senza il consenso di questa versione non si legge niente (6.8). Si chiede prima.
  if (stato.serveConsenso || stato.atletaDiverso) { mostra(); return; }
  const questo = ++giro;
  const client = stato.client;
  const usata = stato.credenziale;
  stato.caricando = true;
  stato.errore = null;
  mostra();
  try {
    // Con una credenziale nuova prima si guarda di chi sono i dati del telefono (R21), e la cache di
    // un'altra persona non si legge nemmeno.
    if (stato.daVerificare) {
      const intero = stato.atletaPronto || await client.atleta();
      if (questo !== giro || client !== stato.client) return;
      stato.atletaPronto = intero;
      if (await verificaAtleta(intero) === "diverso") {
        stato.caricando = false;
        mostra();
        return;
      }
      if (questo !== giro || client !== stato.client) return;
    }
    if (stato.cache === null) stato.cache = oggetto(memoria.leggi(CHIAVI.cache));
    const r = await leggiNuovi(client, stato.cache, oggiLocale(), { aggiorna, atleta: stato.atletaPronto });
    if (questo !== giro || client !== stato.client) return; // è arrivato un caricamento più nuovo, o sei uscito
    if (r.atletaIntero && !stato.impronta) await verificaAtleta(r.atletaIntero, { conIlDubbio: false });
    stato.atletaPronto = null;
    stato.cache = r.cache;
    memoria.scrivi(CHIAVI.cache, r.cache);
    stato.letture = { atleta: r.atleta, benessere: r.benessere, attivita: r.uscite };
    stato.oggi = oggiNelFuso(r.atleta && r.atleta.timezone);
    leggiMemoria();
    ricalcola();
    stato.avviso = null;
    if (r.letto) inviaLaCoda(r.uscite);
  } catch (e) {
    if (questo !== giro || client !== stato.client) return;
    const errore = e instanceof ErroreApi ? e : new ErroreApi("server", "Qualcosa è andato storto leggendo i dati. Riprova fra poco.");
    stato.caricando = false;
    if (errore.tipo === "chiave") { chiaveNonValida(errore.messaggio, usata); return; }
    if (stato.motore) stato.avviso = errore.messaggio;
    else stato.errore = errore;
  }
  stato.caricando = false;
  mostra();
}

function avviaDemo() {
  const oggi = oggiLocale();
  const d = generaDemo(oggi);
  stato.demo = true;
  stato.avviso = null;
  stato.letture = { atleta: d.atleta, benessere: d.benessere, attivita: d.uscite };
  stato.demoDati = {
    ...telefonoVuoto(),
    profilo: { ...d.profilo },
    obiettivo: d.obiettivo,
    disponibilita: d.disponibilita,
    uscite: { ...d.detti },
    palestra: { ...d.palestra },
    mattino: { ...d.diario },
    esiti: { ...d.storia },
    domenica: { ...d.domenica },
  };
  stato.oggi = oggi;
  stato.ui = uiIniziale();
  ricalcola();
}

// Se il giorno è cambiato mentre la pagina era aperta, si rilegge tutto.
function controllaGiorno() {
  if (document.visibilityState === "visible" && stato.motore && stato.motore.oggi !== oggiDiChiGuarda() && !stato.caricando) {
    stato.ui = uiIniziale();
    azioni.ricarica();
  }
}

// --- le finestre di conferma, con un <dialog> e i tasti dello stesso peso ---

function apri(def) {
  const finestra = dialogo(def);
  if (typeof finestra.showModal !== "function") return false;
  document.body.append(finestra);
  finestra.addEventListener("close", () => finestra.remove());
  finestra.showModal();
  return true;
}

// Toglie la chiave o l'accesso, il consenso, la copia dei dati di intervals.icu e le scritture ancora
// da mandare. Con «Entra con intervals.icu» toglie anche il permesso. Restano le risposte e le
// scelte, e l'impronta dell'atleta, così chi entra dopo con un altro account se ne accorge (6.6).
async function esciSolo(dopo, client, conIntervals, senzaRete) {
  cancellaCredenziali(locale, sessione);
  memoria.esci();
  togli(sessione, PONTE);
  togli(sessione, DEMO);
  lasciaQui();
  vai(dopo, true);
  await revoca(client, conIntervals && !senzaRete);
}

// «Esci e cancella tutto da questo dispositivo». Tutte le chiavi comesto., credenziali comprese (6.6).
async function esciCancellaTutto(client, conIntervals, senzaRete) {
  memoria.esciCancellaTutto();
  cancellaCredenziali(locale, sessione);
  lasciaQui();
  stato.tel = telefonoVuoto();
  leggiMemoria();
  stato.messaggio = ESCI.cancellato;
  vai("benvenuto", true);
  await revoca(client, conIntervals && !senzaRete);
}

// Il permesso si toglie anche su intervals.icu. Se non riesce lo si dice, perché la domanda di Esci,
// la Guida e la Privacy promettono che Esci lo toglie. Un 401 vuol dire che era già tolto.
async function revoca(client, conIntervals) {
  if (!conIntervals || !client || !client.revoca) return;
  try {
    await client.revoca();
  } catch (e) {
    if (!(e instanceof ErroreApi && e.tipo === "chiave")) window.alert(ESCI.revocaFallita);
  }
}

// Ricostruisce le schede dopo una scrittura, ma solo se ci sono i dati del giorno.
function aggiorna() {
  if (stato.letture) ricalcola();
  mostra();
}

// Il file della copia di sicurezza, scaricato dal browser senza server (6.6).
function scarica(nome, testo) {
  const blob = new Blob([testo], { type: "application/json" });
  const indirizzo = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = indirizzo;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(indirizzo), 1000);
}

async function testoDelFile(file) {
  if (typeof file === "string") return file;
  if (file && typeof file.text === "function") return file.text();
  return "";
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
    stato.demoDati = null;
    stato.motore = null;
    stato.letture = null;
    stato.cache = null;
    erroreDiAccesso(null);
    // Le due spunte di «Prima di entrare» ci sono, la pagina non fa premere Entra senza.
    salvaConsenso();
    const credenziale = { tipo: "chiave", valore: chiave };
    salvaCredenziale(locale, sessione, credenziale, ricorda);
    stato.client = client;
    stato.credenziale = credenziale;
    stato.atletaPronto = atleta;
    stato.daVerificare = true;
    stato.ui = uiIniziale();
    leggiMemoria();
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
    // Le spunte si perdono andando su intervals.icu, il consenso si salva prima.
    salvaConsenso();
    location.assign(indirizzo);
    return null;
  },

  // Chi era già dentro e rivede il riquadro «Prima di entrare» (6.8).
  accettaConsenso() {
    salvaConsenso();
    leggiMemoria();
    carica();
  },

  // Esci vale per tutte le schede, perché cancella la credenziale dalla memoria del browser.
  esci(dopo = "benvenuto") {
    const client = stato.client;
    const conIntervals = Boolean(client && client.revoca);
    const senzaRete = navigator.onLine === false;
    let testo;
    if (conIntervals && senzaRete) testo = ESCI.accessoSenzaRete;
    else if (conIntervals) testo = ESCI.accesso;
    else if (OAUTH_ATTIVO) testo = ESCI.chiaveOppure;
    else testo = ESCI.chiave;
    const aperta = apri({
      titolo: ESCI.titolo,
      testi: [testo, ESCI.restano],
      piccolo: ESCI.intervals,
      scelte: [
        { testo: ESCI.esci, azione: () => esciSolo(dopo, client, conIntervals, senzaRete) },
        { testo: ESCI.cancella, azione: () => esciCancellaTutto(client, conIntervals, senzaRete) },
        { testo: ESCI.resta, secondario: true },
      ],
    });
    if (!aperta && window.confirm(`${ESCI.titolo} ${testo}`)) esciSolo(dopo, client, conIntervals, senzaRete);
  },

  // «Esci e cancella tutto da questo dispositivo» da Impostazioni, con la sua conferma.
  cancellaTutto() {
    const client = stato.client;
    const conIntervals = Boolean(client && client.revoca);
    const senzaRete = navigator.onLine === false;
    const aperta = apri({
      titolo: ESCI.cancellaTitolo,
      testi: [ESCI.cancellaDomanda],
      piccolo: ESCI.intervals,
      scelte: [
        { testo: ESCI.cancellaSi, azione: () => esciCancellaTutto(client, conIntervals, senzaRete) },
        { testo: ESCI.cancellaNo, secondario: true },
      ],
    });
    if (!aperta && window.confirm(`${ESCI.cancellaTitolo} ${ESCI.cancellaDomanda}`)) esciCancellaTutto(client, conIntervals, senzaRete);
  },

  // Lo stesso, senza la seconda domanda, per una pagina che l'ha già fatta.
  esciCancellaTutto() {
    const client = stato.client;
    esciCancellaTutto(client, Boolean(client && client.revoca), navigator.onLine === false);
  },

  // La schermata dell'altra persona (R21). «cancella» toglie i dati di prima, tiene il modo di entrare
  // e il consenso appena dato e lega il telefono a chi è entrato. «esci» toglie chi è entrato e lascia
  // i dati di prima come erano.
  atletaDiverso(scelta) {
    if (!stato.atletaDiverso) return;
    if (scelta === "cancella") {
      memoria.cancellaDati();
      if (stato.impronta) memoria.scrivi(CHIAVI.atleta, { impronta: stato.impronta, dal: oggiLocale() });
      stato.atletaDiverso = false;
      stato.daVerificare = false;
      stato.cache = null;
      stato.tel = telefonoVuoto();
      leggiMemoria();
      vai("oggi", true);
      carica();
      return;
    }
    cancellaCredenziali(locale, sessione);
    memoria.togli(CHIAVI.consenso);
    lasciaQui();
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
    stato.demoDati = null;
    stato.motore = null;
    stato.letture = null;
    stato.ui = uiIniziale();
    if (stato.client) carica(); // eri già collegato: si torna ai tuoi dati
  },

  // «Esci dall'esempio», dal piede e dalle Impostazioni.
  esciEsempio() {
    azioni.esciDemo();
    vai(stato.client ? "oggi" : "benvenuto", true);
  },

  ricarica() {
    if (stato.demo) { avviaDemo(); mostra(); return; }
    if (!stato.caricando) carica({ aggiorna: true });
  },

  vai(r) {
    vai(r);
  },

  preferenza(nome, valore) {
    salvaPreferenze({ [nome]: valore });
    mostra();
  },

  // Un messaggio di una volta sola è stato mostrato, senza ridisegnare la pagina.
  visto(nome) {
    const quale = { soloStrava: "vistoSoloStrava", notteNonArriva: "vistoNotteNonArriva", copia: "promemoriaCopia", iphone: "vistoIphone" }[nome];
    if (!quale || stato.demo) return;
    salvaPreferenze({ [quale]: stato.oggi || oggiLocale() });
  },

  // Lo stato della pagina che non si salva, per esempio un pannello aperto.
  ui(nome, valore) {
    stato.ui[nome] = valore;
    mostra();
  },

  // Le risposte di oggi che restano sul telefono: «Sto male», cause, domande di controllo, viaggio.
  diario(campi) {
    if (!stato.motore) return;
    aggiornaDiario(stato.motore.oggi, campi);
    aggiorna();
  },

  profilo(campi, dove = null) {
    aggiornaProfilo(campi);
    stato.ui.salvato = dove;
    aggiorna();
  },

  // L'avventura (comesto.obiettivo.v1). Il piano si rifà da solo, perché cambia la sua impronta.
  salvaObiettivo(obiettivo) {
    cambiaTelefono("obiettivo", () => (oggetto(obiettivo) ? { ...obiettivo } : null));
    stato.ui.inizioVisto = true;
    aggiorna();
  },

  salvaDisponibilita(d) {
    cambiaTelefono("disponibilita", () => (oggetto(d) ? { ...d } : null));
    aggiorna();
  },

  // Le risposte del primo avvio in una volta sola (7.3).
  fineInizio({ obiettivo = null, disponibilita = null, profilo = null } = {}) {
    if (oggetto(profilo)) aggiornaProfilo(profilo);
    if (oggetto(disponibilita)) cambiaTelefono("disponibilita", () => ({ ...disponibilita }));
    if (oggetto(obiettivo)) cambiaTelefono("obiettivo", () => ({ ...obiettivo }));
    stato.ui.inizioVisto = true;
    aggiorna();
  },

  // «Sono in viaggio», «Sì, parto» e la proposta. Il viaggio comincia oggi, o dal primo dei giorni
  // lunghi di fila, che entrano anche nella storia, così i giorni di guardia li contano tutti.
  inViaggio({ da = null, tipo = "viaggio", giorni = null } = {}) {
    const r = stato.motore;
    if (!r) return;
    const oggi = r.oggi;
    const inizio = typeof da === "string" && DATA.test(da) && da <= oggi ? da : oggi;
    aggiornaDiario(inizio, { inViaggio: { tipo, giorni }, arrivato: null });
    if (inizio < oggi) {
      aggiornaStoria((storia) => {
        let k = 1;
        for (let d = inizio; d < oggi; d = aggiungiGiorni(d, 1), k++) {
          storia[d] = { ...(oggetto(storia[d]) || {}), evento: { tipo, giorno: k, giorni }, spiegato: true };
        }
        return true;
      });
    }
    stato.ui.modificaViaggio = false;
    aggiorna();
  },

  // «Sono arrivato». Il giorno stesso in cui è cominciato, il viaggio si toglie, perché vuol dire che
  // «Sono in viaggio» era premuto per sbaglio.
  arrivato() {
    const r = stato.motore;
    if (!r) return;
    const v = r.giorno && r.giorno.viaggio;
    if (v && v.inizio === r.oggi) aggiornaDiario(r.oggi, { inViaggio: null, arrivato: null });
    else aggiornaDiario(r.oggi, { arrivato: true });
    aggiorna();
  },

  // La risposta a una carta del semaforo (6.4), «parti», «proposta» o «dispositivo». Una risposta data non torna.
  carta(id, risposta) {
    const r = stato.motore;
    if (!r) return;
    const g = r.giorno;
    if (id === "parti") {
      if (risposta === "si") {
        azioni.inViaggio({ tipo: "evento", giorni: giorniDelViaggioDi(r.obiettivo) });
        return;
      }
      aggiornaDiario(r.oggi, { parti: "no" });
    } else if (id === "proposta") {
      if (risposta === "si" && g.proposta) {
        azioni.inViaggio({ da: g.proposta.inizio, tipo: "viaggio" });
        return;
      }
      aggiornaDiario(r.oggi, { propostaNo: true });
    } else if (id === "dispositivo") {
      aggiornaProfilo(risposta === "si"
        ? { cambioDispositivo: r.oggi, dispositivoChiesto: r.oggi }
        : { dispositivoChiesto: r.oggi });
    }
    aggiorna();
  },

  // La risposta a una carta in più di 6.4. Per le carte di un'attività campi va sulla sua voce di
  // comesto.uscite.v1. Per la seduta del piano senza niente registrato, con «Sì, così» o «Sì, ma
  // diverso» il giro entra come «Aggiungi un giro».
  rispondiCarta(carta, campi = {}) {
    if (!carta) return;
    if (["parti", "proposta", "dispositivo"].includes(carta.tipo)) { azioni.carta(carta.tipo, campi.risposta); return; }
    if (carta.tipo === "seduta") {
      const risposta = ["si", "diverso", "no"].includes(campi.risposta) ? campi.risposta : "no";
      aggiornaDiario(carta.giorno, { sedutaPiano: risposta });
      if (risposta !== "no") {
        const minuti = num(campi.minuti) ? campi.minuti : carta.seduta ? carta.seduta.minuti : null;
        const giro = giroDelTelefono({ tipo: "Ride", giorno: carta.giorno, minuti, sforzo: campi.sforzo ?? null }, codiceCasuale());
        if (giro) aggiornaUscita(giro.id, giro.voce);
      }
      aggiorna();
      return;
    }
    if (!carta.attivita) return;
    azioni.rispostaUscita(carta.attivita.id, { ...campi, giorno: carta.giorno, carte: { [carta.tipo]: "fatta" } });
  },

  // «Non lo so», che chiude la carta (6.4).
  nonLoSo(carta) {
    if (!carta) return;
    if (["parti", "proposta", "dispositivo"].includes(carta.tipo)) { azioni.carta(carta.tipo, "nonso"); return; }
    if (carta.tipo === "seduta") { aggiornaDiario(carta.giorno, { sedutaPiano: "nonSo" }); aggiorna(); return; }
    if (!carta.attivita) return;
    aggiornaUscita(carta.attivita.id, { giorno: carta.giorno, carte: { [carta.tipo]: "nonSo" } });
    aggiorna();
  },

  // Le risposte su un'uscita, dalla carta o dalla sua scheda. Restano sul telefono, e su intervals.icu
  // solo con le scritture accese.
  rispostaUscita(id, campi = {}) {
    if (typeof id !== "string" || !id) return;
    const giorno = DATA.test(campi.giorno || "") ? campi.giorno : (stato.motore && (stato.motore.attivita.find((a) => a.id === id) || {}).giorno) || null;
    aggiornaUscita(id, { ...campi, giorno });
    accodaRisposta(id, campi);
    aggiorna();
  },

  // «Aggiungi un giro» (6.3), un giro senza dispositivo, che resta sul telefono come attività a mano.
  aggiungiGiro(giro) {
    const nuovo = giroDelTelefono(giro, codiceCasuale());
    if (!nuovo) return false;
    aggiornaUscita(nuovo.id, nuovo.voce);
    aggiorna();
    return true;
  },

  // «Fatto» sulla carta di oggi, quando all'app non arriverà il dato da un dispositivo (7.4).
  fatto() {
    const r = stato.motore;
    const s = r && r.seduta ? r.seduta.seduta : null;
    if (!s || !num(s.minuti)) return false;
    return azioni.aggiungiGiro({ tipo: "Ride", giorno: r.oggi, minuti: s.minuti });
  },

  // «Fatta» sulla scheda di palestra (5.6). seduta è ctx.palestra.oggi, risposte { fatta, sforzo,
  // minuti, pesi }. Se l'orologio ha già la seduta, nello stesso giorno ed entro 2 ore, si lega a quella.
  palestraFatta(seduta, risposte = {}) {
    const r = stato.motore;
    if (!r || !seduta) return null;
    const ora = new Date();
    const registrazione = sedutaFatta(seduta, { ...risposte, data: r.oggi });
    if (!registrazione) return null;
    const abbinata = palestraAbbinata(r.attivita, oraLocale(ora));
    let id = null;
    cambiaTelefono("palestra", (registro) => {
      let n = 1;
      while (registro[`${r.oggi}-${n}`]) n += 1;
      id = `${r.oggi}-${n}`;
      registro[id] = { ...registrazione, ora: `${p2(ora.getHours())}:${p2(ora.getMinutes())}`, idAttivita: abbinata ? abbinata.id : null };
      return registro;
    });
    if (abbinata && registrazione.allenato) accodaRisposta(abbinata.id, { sforzo: registrazione.sforzo, allenato: registrazione.allenato });
    aggiorna();
    return id;
  },

  // «Oggi non posso» (3.10). Restituisce lo spostamento, con il testo da dire, oppure null.
  oggiNonPosso() {
    const r = stato.motore;
    if (!r || !r.piano) return null;
    const fatto = spostaGiorno(r.piano, r.oggi, { oggi: r.oggi, livello: r.esito ? r.esito.livello : null });
    if (!fatto) return null;
    cambiaTelefono("piano", () => fatto.piano);
    aggiorna();
    return fatto.spostamento;
  },

  // «Questo weekend non posso», in Settimana (3.10).
  weekendNonPosso() {
    const r = stato.motore;
    if (!r || !r.piano) return null;
    const fatto = spostaWeekend(r.piano, r.oggi);
    if (!fatto) return null;
    cambiaTelefono("piano", () => fatto.piano);
    aggiorna();
    return fatto.spostamento;
  },

  // La risposta alla domanda S6 della domenica (3.11), «si» o «no». Va sul giorno del controllo, anche
  // quando la domanda compare il lunedì.
  rispostaDomenica(s6) {
    const r = stato.motore;
    if (!r || !["si", "no"].includes(s6)) return;
    const voce = r.domenica && r.domenica.voce;
    aggiornaDiario(voce && DATA.test(voce.giorno || "") ? voce.giorno : r.oggi, { s6 });
    aggiorna();
  },

  // «Salva una copia» (6.6). Il file come-sto-dati-AAAA-MM-GG.json, senza consenso, cache, coda e credenziali.
  async salvaCopia() {
    const oggi = oggiLocale();
    const nome = nomeCopia(oggi);
    try {
      scarica(nome, JSON.stringify(memoria.copia(oggi), null, 1));
    } catch {
      return { ok: false, nome };
    }
    salvaPreferenze({ ultimaCopia: oggi });
    return { ok: true, nome };
  },

  // «Riprendi da una copia», prima con l'anteprima di cosa cambia, poi per davvero (6.6).
  async anteprimaCopia(file) {
    return memoria.riprendi(await testoDelFile(file), { anteprima: true });
  },

  async riprendiCopia(file) {
    const esito = memoria.riprendi(await testoDelFile(file));
    leggiMemoria();
    aggiorna();
    return esito;
  },

  // Le risposte del mattino vanno su intervals.icu con i nomi e le scale 1-4 di intervals.icu. Quello
  // che non è una delle tre risposte, cioè la domanda sulla pedalata e le domande in viaggio, resta
  // sul telefono nel diario.
  async salvaDomande(risposte, diario = null) {
    const r = stato.motore;
    if (r.oggi !== oggiDiChiGuarda()) {
      azioni.ricarica();
      throw new ErroreApi("giorno", "Nel frattempo è cambiato il giorno. Ho ricaricato la pagina, rispondi di nuovo.");
    }
    const campi = {};
    if (risposte.fatica) campi.fatigue = risposte.fatica;
    if (risposte.dolori) campi.soreness = risposte.dolori;
    if (risposte.infortunio) campi.injury = risposte.infortunio;
    let salvato = null;
    if (!stato.demo && Object.keys(campi).length) {
      const usata = stato.credenziale;
      let risposta;
      try {
        risposta = await stato.client.salvaBenessere(r.oggi, campi);
      } catch (e) {
        if (e instanceof ErroreApi && e.tipo === "chiave") { chiaveNonValida(e.messaggio, usata); return; }
        throw e;
      }
      // intervals.icu restituisce il giorno com'è dopo il salvataggio: fa fede quello.
      if (risposta && risposta.id === r.oggi) {
        const giorno = normalizzaGiorno(risposta);
        const tornano = Object.entries(risposte).every(([k, v]) => giorno[k] === v);
        if (!tornano) throw new ErroreApi("server", "intervals.icu non ha accettato le risposte. Forse quel giorno è bloccato nel tuo intervals.icu.");
        salvato = risposta;
      }
    }
    if (Object.keys(campi).length) aggiornaBenessere(r.oggi, salvato || campi);
    if (diario) aggiornaDiario(r.oggi, diario);
    stato.ui.modificaDomande = false;
    stato.ui.modificaViaggio = false;
    stato.ui.bozzaMattino = null;
    stato.ui.bozzaViaggio = null;
    stato.appenaSalvato = true;
    aggiorna();
  },
};

// Il giorno di oggi nei dati letti, con le risposte appena salvate, così il motore rifà i conti da lì.
// Anche la copia dei dati lo tiene, così un'apertura entro 10 minuti le ritrova.
function aggiornaBenessere(giorno, campi) {
  const lista = stato.letture.benessere;
  const w = lista.find((x) => x && x.id === giorno);
  if (w) Object.assign(w, campi);
  else lista.push({ ...campi, id: giorno });
  if (stato.demo || !stato.cache || !Array.isArray(stato.cache.benessere)) return;
  const c = stato.cache.benessere.find((x) => x && x.id === giorno);
  const solo = {};
  for (const k of ["fatigue", "soreness", "injury"]) if (campi[k] !== undefined) solo[k] = campi[k];
  if (c) Object.assign(c, solo);
  else stato.cache.benessere.push({ id: giorno, ...solo });
  memoria.scrivi(CHIAVI.cache, stato.cache);
}

// --- collegamenti fissi della pagina ---
bottoneAggiorna.addEventListener("click", () => azioni.ricarica());
document.getElementById("esci").addEventListener("click", () => {
  if (stato.demo) azioni.esciEsempio();
  else azioni.esci();
});
document.querySelector(".salta").addEventListener("click", (e) => {
  e.preventDefault();
  principale.focus();
});
window.addEventListener("hashchange", () => {
  // .../#esempio apre direttamente i dati di esempio: comodo da mandare agli amici
  if (location.hash === "#esempio") { azioni.demo(); return; }
  if (leggiInvitoDallIndirizzo()) { aggiorna(); return; }
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
  // Il pulsante si riaccende solo se le due spunte di «Prima di entrare» ci sono ancora.
  const bottone = document.getElementById("entra-intervals");
  const spunte = ["consenso-18", "consenso-c0"].map((id) => document.getElementById(id));
  if (bottone) {
    delete bottone.dataset.inCorso;
    bottone.disabled = !spunte.every((x) => x && x.checked);
  }
  const testo = document.getElementById("stato-intervals");
  if (testo) testo.textContent = "";
});
// Le schede aperte seguono la credenziale salvata. Se un'altra scheda esce si esce anche qui, se entra
// in un altro modo o con un'altra chiave si passa a quella. Qui non si scrive mai nella memoria.
// Se un'altra scheda cambia le risposte o le scelte sul telefono, questa le rilegge.
window.addEventListener("storage", (e) => {
  if (e.key !== null && e.key !== CHIAVE && e.key !== ACCESSO) {
    if (!e.key.startsWith("comesto.") || e.key === DEMO || e.key === PONTE || e.key === GIRO_OAUTH) return;
    if (e.key === CHIAVI.cache) { stato.cache = null; return; }
    leggiMemoria();
    if (stato.client && !stato.demo && stato.serveConsenso && consensoValido()) { azioni.accettaConsenso(); return; }
    if (stato.client && !stato.demo && !stato.serveConsenso && !consensoValido() && e.key === CHIAVI.consenso) {
      stato.serveConsenso = true;
      mostra();
      return;
    }
    if (!stato.demo) aggiorna();
    return;
  }
  const { azione, credenziale } = dopoUnCambio(stato.credenziale, locale, sessione);
  if (azione === "passa") passaA(credenziale);
  else if (azione === "esci") { lasciaQui(); leggiMemoria(); vai("benvenuto", true); }
});

// --- avvio ---

// Il link degli iscritti (6.9). I valori stanno dopo il cancelletto, #percorso=tt-originale&giorni=4&partenza=2027-05-20,
// così non finiscono nei registri del server. Vale anche la forma di prima, con il punto di domanda. Si
// salvano subito in comesto.invito.v1, prima di «Entra con intervals.icu», e si tolgono dall'indirizzo.
// Restituisce true se l'indirizzo aveva un invito.
function leggiInvitoDallIndirizzo() {
  const hash = location.hash.replace(/^#/, "");
  const query = new URLSearchParams(location.search);
  const daHash = /(^|&)percorso=/.test(hash) ? hash : null;
  const sorgente = daHash || (query.has("percorso") ? location.search : null);
  if (!sorgente) return false;
  const invito = leggiInvito(sorgente);
  if (invito.valido) {
    memoria.scrivi(CHIAVI.invito, { percorso: invito.percorso, giorni: invito.giorni, partenza: invito.partenza });
    leggiMemoria();
  }
  history.replaceState(null, "", `${location.pathname}#inizio`);
  return true;
}

const parametri = new URLSearchParams(location.search);
// Di ritorno da «Entra con intervals.icu» l'indirizzo porta il codice usa e getta, oppure il rifiuto.
const ritorno = OAUTH_ATTIVO ? leggiRitorno(parametri) : null;
const sulMioComputer = ["localhost", "127.0.0.1"].includes(location.hostname);
if (sulMioComputer && parametri.get("dev") === "ponte") scrivi(sessione, PONTE, "1");
const esempio = location.hash === "#esempio" || parametri.has("esempio");
const invitoAllAvvio = leggiInvitoDallIndirizzo();
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
  // All'avvio la memoria sposta in .guasto quello che non si legge, porta sfida e data di prima
  // nell'obiettivo e toglie quello che è scaduto (6.6).
  memoria.migra();
  memoria.pulisci(oggiLocale());
  leggiMemoria();
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
    stato.serveConsenso = !consensoValido();
    if (!stato.demo) carica();
  } else if (credenziale) {
    const errore = usaCredenziale(credenziale, { nuova: Boolean(nuovoAccesso) });
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
  // Chi arriva dal link degli iscritti e non è ancora entrato comincia da Collega.
  if (invitoAllAvvio && !dentro()) history.replaceState(null, "", `${location.pathname}#collega`);
  mostra();
  // Di ritorno da intervals.icu con un errore il fuoco va sul riquadro rosso, così chi usa la
  // tastiera o un lettore di schermo lo trova subito, e il pulsante dopo è «Vai al punto 3».
  if (stato.erroreAccesso && (ritorno || interrotto)) {
    const riquadro = document.getElementById("errore-accesso");
    if (riquadro) riquadro.focus();
  }
}
avvia();
