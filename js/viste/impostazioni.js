// Impostazioni (7.12), con le voci del rilascio 1. Età, notte con «Ho cambiato orologio» e «Ho
// un'aritmia nota», fascia cardio in bici, casella del ciclo, dove stanno i dati, Esci ed «Esci e
// cancella tutto da questo dispositivo». Ogni voce dice dove sta il dato, e ogni scelta si salva
// subito, con un tocco.

import { h } from "../dom.js?v=202610312043";
import { dataLunga } from "../formato.js?v=202610312043";
import { aggiungiGiorni, oggiLocale } from "../modello.js?v=202610312043";
import { SEMAFORO, MEMORIA } from "../parametri.js?v=202610312043";
import { IMPOSTAZIONI } from "../testi.js?v=202610312043";
import { intestazione } from "./comuni.js?v=202610312043";

const I = IMPOSTAZIONI;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function dove(testo) {
  return h("p", { class: "dove" }, testo);
}

function salvato(ctx, chiave) {
  return ctx.ui.salvato === chiave ? h("p", { class: "salvato-piccolo", role: "status" }, I.salvato) : null;
}

function sezione(id, titolo, ...contenuto) {
  return h("section", { class: "carta impostazione", id: `impostazione-${id}`, "aria-labelledby": `titolo-${id}` },
    h("h2", { id: `titolo-${id}` }, titolo),
    contenuto);
}

// Un gruppo di scelte a un tocco. valore è quella già scelta, o null.
function gruppo(nome, domanda, scelte, valore, cambia) {
  return h("fieldset", { class: "domanda" },
    h("legend", {}, domanda),
    h("div", { class: "scelte" }, scelte.map((s) => {
      const id = `${nome}-${s.id}`;
      return h("span", { class: "scelta" },
        h("input", { type: "radio", id, name: nome, value: s.id, checked: valore === s.id,
          on: { change: () => cambia(s.id) } }),
        h("label", { for: id }, s.testo));
    })));
}

function casella(id, testo, acceso, cambia) {
  return h("span", { class: "spunta spunta-grande" },
    h("input", { type: "checkbox", id, checked: Boolean(acceso), on: { change: (e) => cambia(e.target.checked) } }),
    h("label", { for: id }, testo));
}

// Senza una fascia salvata nessuna scelta è spuntata, così anche chi ha 40-49 anni la può confermare
// con un tocco. Il semaforo intanto conta 40-49, e la riga sotto lo dice.
function sezioneEta(ctx) {
  const fascia = SEMAFORO.fasceEta.includes(ctx.profilo.fasciaEta) ? ctx.profilo.fasciaEta : null;
  return sezione("eta", I.eta.titolo,
    gruppo("fascia-eta", I.eta.domanda, I.eta.scelte, fascia,
      (v) => ctx.azioni.profilo({ fasciaEta: v }, "eta")),
    fascia ? null : h("p", { class: "piccolo" }, I.eta.senza),
    h("p", { class: "piccolo" }, I.eta.aiuto),
    dove(I.telefono),
    salvato(ctx, "eta"));
}

function sezioneNotte(ctx, oggi) {
  const p = ctx.profilo;
  const N = I.notte;
  const dispositivo = p.dispositivo || SEMAFORO.dispositivoPredefinito;
  const minimo = aggiungiGiorni(oggi, -SEMAFORO.hrv.notti);

  let cambio;
  if (typeof p.cambioDispositivo === "string" && DATA.test(p.cambioDispositivo)) {
    cambio = h("div", { class: "cambio" },
      h("p", {}, N.cambioSegnato(dataLunga(p.cambioDispositivo))),
      h("button", { class: "bottone bottone-secondario", type: "button", id: "togli-cambio",
        on: { click: () => ctx.azioni.profilo({ cambioDispositivo: null, dispositivoChiesto: null }, "cambio") } }, N.cambioTogli));
  } else {
    const data = h("input", { type: "date", id: "data-cambio", value: oggi, min: minimo, max: oggi });
    const avviso = h("p", { class: "piccolo", role: "status", "aria-live": "polite" });
    cambio = h("div", { class: "cambio" },
      h("p", {}, N.cambioTesto),
      h("div", { class: "campo" }, h("label", { for: "data-cambio" }, N.cambioQuando), data),
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone bottone-secondario", type: "button", id: "segna-cambio", on: { click: () => {
          const v = data.value;
          if (!DATA.test(v) || v > oggi || v < minimo) { avviso.textContent = N.cambioData; return; }
          ctx.azioni.profilo({ cambioDispositivo: v, dispositivoChiesto: oggi }, "cambio");
        } } }, N.cambioTasto)),
      avviso);
  }

  return sezione("notte", N.titolo,
    gruppo("dispositivo-notte", N.domanda, N.scelte, dispositivo,
      (v) => ctx.azioni.profilo({ dispositivo: v }, "notte")),
    h("p", { class: "piccolo" }, N.aiuto),
    salvato(ctx, "notte"),
    h("h3", {}, N.cambioTitolo),
    cambio,
    salvato(ctx, "cambio"),
    casella("aritmia", N.aritmia, p.aritmia, (acceso) => ctx.azioni.profilo({ aritmia: acceso || null }, "aritmia")),
    h("p", { class: "piccolo" }, N.aritmiaAiuto),
    salvato(ctx, "aritmia"),
    dove(I.telefono));
}

function sezioneBici(ctx) {
  return sezione("bici", I.bici.titolo,
    gruppo("fascia-cardio", I.bici.domanda, I.bici.scelte, ctx.profilo.fasciaCardio || null,
      (v) => ctx.azioni.profilo({ fasciaCardio: v }, "bici")),
    h("p", { class: "piccolo" }, I.bici.aiuto),
    dove(I.telefono),
    salvato(ctx, "bici"));
}

function sezioneCiclo(ctx) {
  return sezione("ciclo", I.ciclo.titolo,
    casella("ciclo", I.ciclo.casella, ctx.profilo.ciclo, (acceso) => ctx.azioni.profilo({ ciclo: acceso || null }, "ciclo")),
    h("p", { class: "piccolo" }, I.ciclo.aiuto),
    salvato(ctx, "ciclo"));
}

function sezioneDati() {
  return sezione("dati", I.dati.titolo,
    h("ul", { class: "elenco" }, I.dati.righe(MEMORIA.giorni).map((t) => h("li", {}, t))),
    h("p", {}, h("a", { href: "#privacy" }, I.dati.privacy)));
}

function sezioneEsci(ctx) {
  const E = I.esci;
  if (ctx.demo) {
    return sezione("esci", E.titolo,
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone bottone-secondario", type: "button", on: { click: () => ctx.azioni.esciEsempio() } }, E.demo)),
      h("p", { class: "piccolo" }, E.demoAiuto));
  }
  return sezione("esci", E.titolo,
    h("div", { class: "uscita" },
      h("button", { class: "bottone bottone-secondario", type: "button", id: "impostazioni-esci",
        on: { click: () => ctx.azioni.esci() } }, E.esci),
      h("p", { class: "piccolo" }, E.esciAiuto)),
    h("div", { class: "uscita" },
      h("button", { class: "bottone bottone-secondario", type: "button", id: "impostazioni-cancella",
        on: { click: () => ctx.azioni.cancellaTutto() } }, E.cancella),
      h("p", { class: "piccolo" }, E.cancellaAiuto)));
}

// Fuori, o dentro senza il consenso, non si salva niente di nuovo. Resta il modo di cancellare quello
// che è rimasto su questo dispositivo.
function fuori(ctx) {
  return h("div", { class: "vista vista-testo" },
    intestazione(I.titolo, I.sottotitolo, I.fuori.testo),
    ctx.accesso ? null : h("p", {}, h("a", { class: "bottone", href: "#collega" }, I.fuori.entra)),
    sezioneDati(),
    ctx.datiSulDispositivo
      ? sezione("cancella", I.esci.cancella,
        h("p", {}, I.fuori.resti),
        h("div", { class: "riga-bottoni" },
          h("button", { class: "bottone bottone-secondario", type: "button", id: "impostazioni-cancella",
            on: { click: () => ctx.azioni.cancellaTutto() } }, I.esci.cancella)),
        h("p", { class: "piccolo" }, I.esci.cancellaAiuto))
      : h("p", { class: "piccolo" }, I.fuori.niente));
}

export function vistaImpostazioni(ctx) {
  if (!ctx.dentro) return fuori(ctx);
  const oggi = ctx.modello ? ctx.modello.oggi : oggiLocale();
  return h("div", { class: "vista vista-testo vista-impostazioni" },
    intestazione(I.titolo, I.sottotitolo, I.attacco),
    ctx.demo ? h("aside", { class: "banner banner-demo" }, h("p", {}, I.demo)) : null,
    sezioneEta(ctx),
    sezioneNotte(ctx, oggi),
    sezioneBici(ctx),
    sezioneCiclo(ctx),
    sezioneDati(),
    sezioneEsci(ctx));
}
