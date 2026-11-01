// Come sto: la regia della pagina. Tiene lo stato, decide quale pagina mostrare
// e parla con intervals.icu. Le pagine vere e proprie stanno in js/viste/.

import { creaClient, ErroreApi } from "./api.js?v=202610312043";
import { OAUTH_ATTIVO } from "./config.js?v=202610312043";
import { preparaAccesso, completaAccesso, leggiRitorno } from "./oauth.js?v=202610312043";
import {
  CHIAVE, ACCESSO, leggi, scrivi, togli, leggiCredenziale, stessaCredenziale, salvaCredenziale,
  cancellaCredenziali, togliCredenziale, dopoUnCambio,
} from "./credenziali.js?v=202610312043";
import {
  costruisciModello, normalizzaGiorno, oggiLocale, oggiNelFuso, aggiungiGiorni, giorniTra, oreBiciDelGiorno,
  GIORNI_STORICO, GIORNI_USCITE,
} from "./modello.js?v=202610312043";
import { valuta, eventoDiOggi, propostaViaggio, giorniDiGuardia, statoMalattia } from "./semaforo.js?v=202610312043";
import { creaMemoria, CHIAVI } from "./memoria.js?v=202610312043";
import { SEMAFORO, PIANO, MEMORIA } from "./parametri.js?v=202610312043";
import { CONSENSO, ESCI } from "./testi.js?v=202610312043";
import { generaDemo } from "./demo.js?v=202610312043";
import { vistaOggi } from "./viste/oggi.js?v=202610312043";
import { vistaAndamento } from "./viste/andamento.js?v=202610312043";
import { vistaUscite } from "./viste/uscite.js?v=202610312043";
import { vistaObiettivo } from "./viste/obiettivo.js?v=202610312043";
import { vistaImpostazioni } from "./viste/impostazioni.js?v=202610312043";
import {
  vistaBenvenuto, vistaCollega, vistaGuida, vistaPrivacy, vistaCaricamento, vistaErrore, vistaConsenso, dialogo,
} from "./viste/pagine.js?v=202610312043";

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

// Le sfide della pagina Obiettivo di prima dicono «7-10 giorni» e «due settimane e oltre» (SFIDE in
// js/modello.js), ma l'obiettivo libero della migrazione tiene al massimo 3 giorni. Per la modalità
// evento e per la riga del medico vale il lato alto della sfida, la lettura prudente.
const GIORNI_SFIDA = { giornata: 1, weekend: 3, settimana: 10, grande: 14 };

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const oggetto = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : null);

function uiIniziale() {
  return {
    modificaDomande: false,  // il modulo delle domande del mattino riaperto con «Cambia le risposte»
    modificaViaggio: false,  // lo stesso per le domande in viaggio
    stoMale: false,          // il pannello «Sto male» aperto
    cause: false,            // la riga «Ieri sera…» aperta
    rispondoDopo: false,     // la domanda di controllo rimandata, solo per questa apertura
    carta: null,             // la carta in più di questa apertura, una sola (6.4)
    salvato: null,           // dove mostrare «Salvato.» in Impostazioni
    viaggioLungo: false,     // la riga del medico prima di un viaggio lungo è già comparsa in questa apertura
    dispositivo: null,       // il dispositivo scelto nella pagina Collega, che cambia solo le istruzioni
  };
}

const stato = {
  client: null,
  credenziale: null,         // la chiave o l'accesso che usa questa scheda (null col ponte o da fuori)
  modello: null,
  esito: null,               // il semaforo di oggi, da valuta
  giorno: null,              // lo stato del giorno che valuta riceve, più le carte in più
  grezzi: null,              // atleta, benessere e uscite dell'ultima lettura, o dell'esempio
  oggi: null,
  demo: false,
  demoDati: null,            // profilo, diario, storia e obiettivo dell'esempio, solo in questa pagina
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
  // Dal telefono (js/memoria.js).
  preferenze: {},
  profilo: {},
  diario: {},
  storia: {},
  obiettivo: null,
  ui: uiIniziale(),
};
let giro = 0;                // ogni caricamento ha il suo numero: vince solo l'ultimo

function leggiMemoria() {
  stato.preferenze = { ...(oggetto(memoria.leggi(CHIAVI.preferenze)) || {}) };
  stato.profilo = oggetto(memoria.leggi(CHIAVI.profilo)) || {};
  stato.diario = memoria.leggi(CHIAVI.mattino);
  stato.storia = memoria.leggi(CHIAVI.esiti);
  stato.obiettivo = oggetto(memoria.leggi(CHIAVI.obiettivo));
}

// I dati della persona, quelli del telefono oppure quelli dell'esempio, che restano nella pagina.
function persona() {
  if (stato.demo && stato.demoDati) return stato.demoDati;
  return { profilo: stato.profilo, diario: stato.diario, storia: stato.storia, obiettivo: stato.obiettivo };
}

function consensoValido() {
  const c = oggetto(memoria.leggi(CHIAVI.consenso));
  return Boolean(c && c.versione === CONSENSO.versione);
}

function salvaConsenso() {
  memoria.scrivi(CHIAVI.consenso, { versione: CONSENSO.versione, data: oggiLocale() });
  stato.serveConsenso = false;
}

// --- scritture sul telefono, sempre rilette dalla memoria prima di cambiarle ---

function pulito(voce) {
  const v = {};
  for (const [k, x] of Object.entries(voce)) {
    if (x === null || x === undefined || (Array.isArray(x) && !x.length)) continue;
    v[k] = x;
  }
  return v;
}

// Cambia la voce di un giorno del diario (comesto.mattino.v1). Un campo null o vuoto si toglie.
function aggiornaDiario(giorno, campi) {
  if (stato.demo && stato.demoDati) {
    const voce = pulito({ ...(stato.demoDati.diario[giorno] || {}), ...campi });
    if (Object.keys(voce).length) stato.demoDati.diario[giorno] = voce;
    else delete stato.demoDati.diario[giorno];
    return;
  }
  const diario = memoria.leggi(CHIAVI.mattino);
  const voce = pulito({ ...(oggetto(diario[giorno]) || {}), ...campi });
  if (Object.keys(voce).length) diario[giorno] = voce;
  else delete diario[giorno];
  memoria.scrivi(CHIAVI.mattino, diario);
  stato.diario = diario;
}

function aggiornaProfilo(campi) {
  if (stato.demo && stato.demoDati) {
    stato.demoDati.profilo = pulito({ ...stato.demoDati.profilo, ...campi });
    return;
  }
  const profilo = pulito({ ...(oggetto(memoria.leggi(CHIAVI.profilo)) || {}), ...campi });
  memoria.scrivi(CHIAVI.profilo, Object.keys(profilo).length ? profilo : null);
  stato.profilo = profilo;
}

// La storia degli esiti (comesto.esiti.v1). cambia riceve la mappa e la modifica.
function aggiornaStoria(cambia) {
  if (stato.demo && stato.demoDati) {
    cambia(stato.demoDati.storia);
    return;
  }
  const storia = memoria.leggi(CHIAVI.esiti);
  if (cambia(storia) === false) return;
  memoria.scrivi(CHIAVI.esiti, storia);
  stato.storia = storia;
}

function scriviObiettivo(obiettivo) {
  if (stato.demo && stato.demoDati) { stato.demoDati.obiettivo = obiettivo; return; }
  memoria.scrivi(CHIAVI.obiettivo, obiettivo);
  stato.obiettivo = obiettivo;
}

function salvaPreferenze() {
  memoria.scrivi(CHIAVI.preferenze, stato.preferenze);
}

// Le preferenze come le leggono le pagine. Sfida e data della pagina Obiettivo stanno in
// comesto.obiettivo.v1 dalla migrazione (6.6), e qui tornano con i nomi di prima.
function preferenzeDellePagine() {
  const ob = oggetto(persona().obiettivo);
  if (!ob) return { ...stato.preferenze };
  return { ...stato.preferenze, sfida: ob.daSfida || undefined, dataEvento: partenzaDi(ob) || undefined };
}

// La pagina Obiettivo sceglie ancora sfida e data. Si salvano come obiettivo libero, come fa la
// migrazione di js/memoria.js, così all'avvio dopo non si perdono.
function cambiaObiettivo(nome, valore) {
  const prima = oggetto(persona().obiettivo);
  const sfida = nome === "sfida" ? valore : (prima && prima.daSfida) || MEMORIA.sfidaSenzaScelta;
  const base = MEMORIA.sfide[sfida] || MEMORIA.sfide[MEMORIA.sfidaSenzaScelta];
  const nuovo = { tipo: "libero", libero: base.libero, giorni: base.giorni, ore: base.ore, daSfida: sfida };
  const partenza = nome === "dataEvento" ? valore : prima && prima.partenza;
  if (typeof partenza === "string" && DATA.test(partenza)) nuovo.partenza = partenza;
  scriviObiettivo(nuovo);
}

// --- lo stato del giorno, che valuta riceve (4.2, passo 1) ---

// Il viaggio in corso dal diario. «Sono in viaggio», «Sì, parto» e la proposta segnano il giorno
// d'inizio con inViaggio, «Sono arrivato» il giorno della fine con arrivato.
function viaggioDelDiario(diario, uscite, oggi) {
  const inizi = Object.keys(diario || {}).filter((d) => d <= oggi && oggetto(diario[d]) && oggetto(diario[d].inViaggio)).sort();
  if (!inizi.length) return null;
  const inizio = inizi[inizi.length - 1];
  const dati = diario[inizio].inViaggio;
  const arrivi = Object.keys(diario).filter((d) => d >= inizio && d <= oggi && oggetto(diario[d]) && diario[d].arrivato).sort();
  return {
    inizio,
    fine: arrivi.length ? arrivi[0] : fineDaSola(inizio, uscite, oggi),
    tipo: typeof dati.tipo === "string" ? dati.tipo : "viaggio",
    giorni: Number.isInteger(dati.giorni) && dati.giorni > 0 ? dati.giorni : null,
  };
}

// Un viaggio che nessuno chiude finisce da solo dopo 2 giorni di fila senza nessuna attività, così
// un «Sono arrivato» dimenticato non spegne le notti per settimane [stima nostra, prudente].
function fineDaSola(inizio, uscite, oggi) {
  const conAttivita = new Set((uscite || []).map((u) => u.d));
  let ultimo = null;
  let vuoti = 0;
  for (let d = inizio; d < oggi; d = aggiungiGiorni(d, 1)) {
    if (conAttivita.has(d)) { ultimo = d; vuoti = 0; continue; }
    vuoti += 1;
    if (vuoti >= SEMAFORO.viaggio.propostaGiorni) return ultimo || inizio;
  }
  return null;
}

// La data di partenza dell'obiettivo, oppure null. I giorni alla partenza contano solo se non è passata.
function partenzaDi(obiettivo) {
  const ob = oggetto(obiettivo);
  return ob && typeof ob.partenza === "string" && DATA.test(ob.partenza) ? ob.partenza : null;
}

function giorniEventoDi(obiettivo) {
  const ob = oggetto(obiettivo);
  if (!ob) return null;
  if (ob.daSfida && GIORNI_SFIDA[ob.daSfida]) return GIORNI_SFIDA[ob.daSfida];
  return Number.isInteger(ob.giorni) && ob.giorni > 0 ? ob.giorni : null;
}

function etaDi(profilo) {
  const k = SEMAFORO.fasceEta.indexOf(profilo.fasciaEta);
  return k >= 0 ? PIANO.limiteFacile.etaCentri[k] : SEMAFORO.etaPredefinita;
}

// La proposta automatica della modalità evento (4.5). Il viaggio comincia dal primo dei giorni lunghi
// di fila, e un «No» vale per tutta quella fila.
function propostaDiOggi(m, evento, obiettivo) {
  if (evento) return null;
  const ob = oggetto(obiettivo);
  const oreH = ob && typeof ob.ore === "number" && ob.ore > 0 ? ob.ore : null;
  if (!propostaViaggio(m.uscite, m.oggi, oreH)) return null;
  const V = SEMAFORO.viaggio;
  const soglia = oreH ? V.propostaQuotaH * oreH : V.propostaOre;
  let inizio = aggiungiGiorni(m.oggi, -V.propostaGiorni);
  for (let k = 0; k < GIORNI_USCITE && oreBiciDelGiorno(m.uscite, aggiungiGiorni(inizio, -1)) >= soglia; k++) {
    inizio = aggiungiGiorni(inizio, -1);
  }
  for (let d = inizio; d <= m.oggi; d = aggiungiGiorni(d, 1)) {
    if (oggetto(m.diario[d]) && m.diario[d].propostaNo) return null;
  }
  return { inizio };
}

// La domanda sul cambio di dispositivo si fa una volta. Dopo una risposta si riprova solo quando le
// notti di quel confronto sono passate tutte, cioè le 7 recenti più le 28 di prima (regola 10.4).
function dispositivoGiaChiesto(profilo, oggi) {
  const X = SEMAFORO.dispositivo;
  const quando = profilo.dispositivoChiesto || profilo.cambioDispositivo;
  return typeof quando === "string" && DATA.test(quando) && giorniTra(quando, oggi) < X.nottiRecenti + X.nottiPrima;
}

// Le carte in più di oggi, in ordine. Se ne mostra una sola per apertura (6.4).
function carteDiOggi(m, e, g, p) {
  const carte = [];
  const dia = oggetto(m.diario[m.oggi]) || {};
  if (g.giorniPartenza === 0 && !g.evento && !dia.parti && !dia.inViaggio) carte.push("parti");
  if (g.proposta) carte.push("proposta");
  if (e.domande && e.domande.dispositivo && !dispositivoGiaChiesto(p.profilo, m.oggi)) carte.push("dispositivo");
  return carte;
}

function ricalcola() {
  const g = stato.grezzi;
  if (!g || !stato.oggi) {
    stato.modello = null;
    stato.esito = null;
    stato.giorno = null;
    return;
  }
  const oggi = stato.oggi;
  const p = persona();
  // La storia arriva al semaforo senza il giorno di oggi, che valuta riscrive ogni volta.
  const storia = { ...(p.storia || {}) };
  delete storia[oggi];
  const m = costruisciModello({
    atleta: g.atleta, benessere: g.benessere, uscite: g.uscite,
    diario: p.diario, storia, profilo: p.profilo, piano: null,
  }, oggi);
  const viaggio = viaggioDelDiario(m.diario, m.uscite, oggi);
  const evento = eventoDiOggi(viaggio, oggi);
  const partenza = partenzaDi(p.obiettivo);
  const mancano = partenza ? giorniTra(oggi, partenza) : null;
  const giorniPartenza = mancano !== null && mancano >= 0 ? mancano : null;
  const profilo = p.profilo || {};
  const malattia = statoMalattia(m.diario, m.storia, oggi);
  const contesto = {
    evento,
    guardia: giorniDiGuardia(m.storia, m.piano, m.uscite, oggi, { eta: etaDi(profilo) }),
    rientro: malattia.rientro,
    giorniPartenza,
    giorniEvento: giorniEventoDi(p.obiettivo),
    fasciaEta: profilo.fasciaEta || null,
    aritmia: Boolean(profilo.aritmia),
  };
  const esito = valuta(m, contesto);

  // La riga del medico prima di un viaggio lungo compare una volta per evento (4.9).
  const visto = stato.demo ? null : stato.preferenze.vistoViaggioLungo;
  if (esito.medico.some((x) => x.chiave === "viaggioLungo")) {
    if (!stato.ui.viaggioLungo && visto === partenza) {
      esito.medico = esito.medico.filter((x) => x.chiave !== "viaggioLungo");
    } else if (!stato.ui.viaggioLungo) {
      stato.ui.viaggioLungo = true;
      if (!stato.demo) { stato.preferenze.vistoViaggioLungo = partenza; salvaPreferenze(); }
    }
  }

  const giorno = {
    contesto,
    viaggio,
    evento,
    giorniPartenza,
    malattia,
    arrivatoOggi: Boolean(oggetto(m.diario[oggi]) && m.diario[oggi].arrivato),
    proposta: null,
    carte: [],
  };
  giorno.proposta = propostaDiOggi(m, evento, p.obiettivo);
  giorno.carte = carteDiOggi(m, esito, giorno, p);
  if (stato.ui.carta === null && giorno.carte.length) stato.ui.carta = giorno.carte[0];
  giorno.carta = giorno.carte.includes(stato.ui.carta) ? stato.ui.carta : null;

  stato.modello = m;
  stato.esito = esito;
  stato.giorno = giorno;
  salvaEsito(oggi, esito.registro);
}

// L'esito del giorno nella storia (4.2, passo 12), per i giorni di guardia, la malattia e i gialli di
// fila dei giorni dopo. Con l'esempio resta nella pagina.
function salvaEsito(oggi, registro) {
  if (stato.demo || !registro) return;
  if (!stato.client || stato.serveConsenso || oggi !== oggiDiChiGuarda()) return;
  aggiornaStoria((storia) => {
    if (JSON.stringify(storia[oggi]) === JSON.stringify(registro)) return false;
    storia[oggi] = registro;
    return true;
  });
}

const VISTE = {
  benvenuto: { titolo: "Benvenuto", libera: true, disegna: vistaBenvenuto },
  collega: { titolo: "Collega i tuoi dati", libera: true, disegna: vistaCollega },
  guida: { titolo: "Guida", libera: true, disegna: vistaGuida },
  privacy: { titolo: "Privacy", libera: true, disegna: vistaPrivacy },
  impostazioni: { titolo: "Impostazioni", libera: true, disegna: vistaImpostazioni },
  oggi: { titolo: "Oggi", disegna: vistaOggi },
  andamento: { titolo: "Andamento", disegna: vistaAndamento },
  uscite: { titolo: "Uscite", disegna: vistaUscite },
  obiettivo: { titolo: "Obiettivo", disegna: vistaObiettivo },
};

const dentro = () => Boolean(stato.client || stato.demo);
// Dentro con i propri dati e con il consenso, oppure nell'esempio.
const conIDati = () => Boolean(stato.demo || (stato.client && !stato.serveConsenso));
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
  const visibile = conIDati();
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

function mostra({ fuoco = false } = {}) {
  const r = rotta();
  if (location.hash !== `#${r}`) history.replaceState(null, "", `#${r}`);
  const def = VISTE[r];
  if (!def.libera && !dentro()) { vai("benvenuto", true); return; }
  if (r === "benvenuto" && dentro()) { vai("oggi", true); return; }

  aggiornaNavigazione(r);
  const ctx = {
    modello: stato.modello,
    esito: stato.esito,
    giorno: stato.giorno,
    demo: stato.demo,
    dentro: conIDati(),
    preferenze: preferenzeDellePagine(),
    profilo: persona().profilo || {},
    ui: stato.ui,
    erroreAccesso: stato.erroreAccesso,
    erroreConIntervals: stato.erroreConIntervals,
    tipoErroreAccesso: stato.tipoErroreAccesso,
    accesso: stato.client ? stato.client.accesso : null,
    appenaSalvato: stato.appenaSalvato,
    consensoPrima: stato.serveConsenso ? oggetto(memoria.leggi(CHIAVI.consenso)) : null,
    datiSulDispositivo: datiSulDispositivo(),
    azioni,
  };

  let vista;
  if (def.libera) vista = def.disegna(ctx);
  else if (stato.client && !stato.demo && stato.serveConsenso) vista = vistaConsenso(ctx);
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
  stato.esito = null;
  stato.giorno = null;
  stato.grezzi = null;
  stato.oggi = null;
  stato.demo = false;
  stato.demoDati = null;
  stato.errore = null;
  stato.avviso = null;
  stato.caricando = false;
  stato.atletaPronto = null;
  stato.serveConsenso = false;
  stato.ui = uiIniziale();
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
  stato.serveConsenso = !consensoValido();
  return null;
}

// Un'altra scheda è entrata in un altro modo, o con un'altra chiave: questa scheda passa a quella
// senza uscire. Se stavi guardando l'esempio, resti nell'esempio.
function passaA(credenziale) {
  const demo = stato.demo;
  const grezzi = stato.grezzi;
  const demoDati = stato.demoDati;
  const oggi = stato.oggi;
  lasciaQui();
  erroreDiAccesso(null);
  leggiMemoria();
  if (usaCredenziale(credenziale)) { vai("benvenuto", true); return; }
  if (demo) {
    stato.demo = true;
    stato.grezzi = grezzi;
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

async function carica() {
  if (!stato.client) return;
  // Senza il consenso di questa versione non si legge niente (6.8). Si chiede prima.
  if (stato.serveConsenso) { mostra(); return; }
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
    stato.grezzi = { atleta, benessere: Array.isArray(benessere) ? benessere : [], uscite: Array.isArray(uscite) ? uscite : [] };
    stato.oggi = oggiNelFuso(atleta && atleta.timezone);
    leggiMemoria();
    ricalcola();
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
  const dati = generaDemo(oggi);
  stato.demo = true;
  stato.avviso = null;
  stato.grezzi = { atleta: dati.atleta, benessere: dati.benessere, uscite: dati.uscite };
  stato.demoDati = {
    profilo: { ...(dati.profilo || {}) },
    diario: { ...(dati.diario || {}) },
    storia: { ...(dati.storia || {}) },
    obiettivo: dati.obiettivo || null,
  };
  stato.oggi = oggi;
  stato.ui = uiIniziale();
  ricalcola();
}

// Se il giorno è cambiato mentre la pagina era aperta, si rilegge tutto.
function controllaGiorno() {
  if (document.visibilityState === "visible" && stato.modello && stato.modello.oggi !== oggiDiChiGuarda() && !stato.caricando) {
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

// Toglie la chiave o l'accesso e il consenso. Con «Entra con intervals.icu» toglie anche il permesso.
async function esciSolo(dopo, client, conIntervals, senzaRete) {
  cancellaCredenziali(locale, sessione);
  memoria.togli(CHIAVI.consenso);
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
  if (stato.grezzi) ricalcola();
  mostra();
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
    stato.modello = null;
    stato.grezzi = null;
    erroreDiAccesso(null);
    // Le due spunte di «Prima di entrare» ci sono, la pagina non fa premere Entra senza.
    salvaConsenso();
    const credenziale = { tipo: "chiave", valore: chiave };
    salvaCredenziale(locale, sessione, credenziale, ricorda);
    stato.client = client;
    stato.credenziale = credenziale;
    stato.atletaPronto = atleta;
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

  demo() {
    scrivi(sessione, DEMO, "1");
    avviaDemo();
    vai("oggi", location.hash === "#esempio");
  },

  esciDemo() {
    togli(sessione, DEMO);
    stato.demo = false;
    stato.demoDati = null;
    stato.modello = null;
    stato.esito = null;
    stato.giorno = null;
    stato.grezzi = null;
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
    if (!stato.caricando) carica();
  },

  preferenza(nome, valore) {
    if (nome === "sfida" || nome === "dataEvento") {
      cambiaObiettivo(nome, valore);
      aggiorna();
      return;
    }
    stato.preferenze[nome] = valore;
    salvaPreferenze();
    mostra();
  },

  // Lo stato della pagina che non si salva, per esempio un pannello aperto.
  ui(nome, valore) {
    stato.ui[nome] = valore;
    mostra();
  },

  // Le risposte di oggi che restano sul telefono: «Sto male», cause, domande di controllo, viaggio.
  diario(campi) {
    if (!stato.modello) return;
    aggiornaDiario(stato.modello.oggi, campi);
    aggiorna();
  },

  profilo(campi, dove = null) {
    aggiornaProfilo(campi);
    stato.ui.salvato = dove;
    aggiorna();
  },

  // «Sono in viaggio», «Sì, parto» e la proposta. Il viaggio comincia oggi, o dal primo dei giorni
  // lunghi di fila, che entrano anche nella storia, così i giorni di guardia li contano tutti.
  inViaggio({ da = null, tipo = "viaggio", giorni = null } = {}) {
    const m = stato.modello;
    if (!m) return;
    const inizio = typeof da === "string" && DATA.test(da) && da <= m.oggi ? da : m.oggi;
    aggiornaDiario(inizio, { inViaggio: { tipo, giorni }, arrivato: null });
    if (inizio < m.oggi) {
      aggiornaStoria((storia) => {
        let k = 1;
        for (let d = inizio; d < m.oggi; d = aggiungiGiorni(d, 1), k++) {
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
    const m = stato.modello;
    if (!m) return;
    const v = stato.giorno && stato.giorno.viaggio;
    if (v && v.inizio === m.oggi) aggiornaDiario(m.oggi, { inViaggio: null, arrivato: null });
    else aggiornaDiario(m.oggi, { arrivato: true });
    aggiorna();
  },

  // La risposta a una carta in più (6.4). Una risposta data non torna.
  carta(id, risposta) {
    const m = stato.modello;
    const g = stato.giorno;
    if (!m || !g) return;
    if (id === "parti") {
      if (risposta === "si") {
        azioni.inViaggio({ tipo: "evento", giorni: giorniEventoDi(persona().obiettivo) });
        return;
      }
      aggiornaDiario(m.oggi, { parti: "no" });
    } else if (id === "proposta") {
      if (risposta === "si" && g.proposta) {
        azioni.inViaggio({ da: g.proposta.inizio, tipo: "viaggio" });
        return;
      }
      aggiornaDiario(m.oggi, { propostaNo: true });
    } else if (id === "dispositivo") {
      aggiornaProfilo(risposta === "si"
        ? { cambioDispositivo: m.oggi, dispositivoChiesto: m.oggi }
        : { dispositivoChiesto: m.oggi });
    }
    aggiorna();
  },

  // Le risposte del mattino vanno su intervals.icu con i nomi e le scale 1-4 di intervals.icu. Quello
  // che non è una delle tre risposte, cioè la domanda sulla pedalata e le domande in viaggio, resta
  // sul telefono nel diario.
  async salvaDomande(risposte, diario = null) {
    const m = stato.modello;
    if (m.oggi !== oggiDiChiGuarda()) {
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
        risposta = await stato.client.salvaBenessere(m.oggi, campi);
      } catch (e) {
        if (e instanceof ErroreApi && e.tipo === "chiave") { chiaveNonValida(e.messaggio, usata); return; }
        throw e;
      }
      // intervals.icu restituisce il giorno com'è dopo il salvataggio: fa fede quello.
      if (risposta && risposta.id === m.oggi) {
        const giorno = normalizzaGiorno(risposta);
        const tornano = Object.entries(risposte).every(([k, v]) => giorno[k] === v);
        if (!tornano) throw new ErroreApi("server", "intervals.icu non ha accettato le risposte. Forse quel giorno è bloccato nel tuo intervals.icu.");
        salvato = risposta;
      }
    }
    if (Object.keys(campi).length) aggiornaBenessere(m.oggi, salvato || campi);
    if (diario) aggiornaDiario(m.oggi, diario);
    stato.ui.modificaDomande = false;
    stato.ui.modificaViaggio = false;
    stato.appenaSalvato = true;
    aggiorna();
  },
};

// Il giorno di oggi nei dati letti, con le risposte appena salvate, così il modello si rifà da lì.
function aggiornaBenessere(giorno, campi) {
  const lista = stato.grezzi.benessere;
  const w = lista.find((x) => x && x.id === giorno);
  if (w) Object.assign(w, campi);
  else lista.push({ ...campi, id: giorno });
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
