// Impostazioni (7.12). La mia avventura, giorni e tempo, borse e bici, palestra, età, notte con «Ho
// cambiato orologio» e «Ho un'aritmia nota», fascia cardio in bici, casella del ciclo, la settimana
// leggera da 50 anni, le scritture facoltative quando sono accese, dove stanno i dati, la copia di
// sicurezza, Esci ed «Esci e cancella tutto da questo dispositivo». Ogni voce dice dove sta il dato,
// e ogni scelta si salva subito, con un tocco. Giorni e tempo hanno un tasto, perché vanno insieme.

import { h } from "../dom.js?v=202611022140";
import { dataLunga, formatoH, numero } from "../formato.js?v=202611022140";
import { aggiungiGiorni, oggiLocale } from "../modello.js?v=202611022140";
import { leggiDisponibilita } from "../piano.js?v=202611022140";
import { DOMANDE_PALESTRA, TESTI_PALESTRA } from "../palestra.js?v=202611022140";
import { SEMAFORO, MEMORIA, PIANO, STIMA } from "../parametri.js?v=202611022140";
import { IMPOSTAZIONI } from "../testi-impostazioni.js?v=202611022140";
import { TESTI_DATI } from "../testi-dati.js?v=202611022140";
import { ACCOUNT } from "../testi-app.js?v=202611022140";
import { intestazione } from "./comuni.js?v=202611022140";
import { moduloAccount } from "./accesso.js?v=202611022140";

const I = IMPOSTAZIONI;
// Dove sta una scelta che segue la persona, quando è entrata con la sua email.
const conAccount = (ctx) => Boolean(ctx.account && ctx.account.utente);
const doveOnline = (ctx, testo = I.online) => dove(conAccount(ctx) ? testo : I.telefono);

function sezioneAccount(ctx) {
  if (ctx.demo || !ctx.account || !ctx.account.attivo) return null;
  return sezione("account", ACCOUNT.titolo, moduloAccount(ctx));
}
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const DA_50 = new Set(["50-54", "55-59", "60+"]);
// Le chiavi della copia fatte di voci, per giorno, uscita, seduta o settimana (js/memoria.js).
const VOCI_COPIA = new Set(["comesto.uscite.v1", "comesto.palestra.v1", "comesto.mattino.v1", "comesto.esiti.v1", "comesto.domenica.v1"]);

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

// --- La mia avventura ---

function descriviLibero(ob) {
  const l = ob.libero || {};
  if (l.tipo === "giro") return I.avventura.liberoGiro(numero(l.km), numero(l.metri || 0));
  if (l.tipo === "giorni" && l.misura === "km") return I.avventura.liberoGiorniKm(l.giorni, numero(l.km), numero(l.metri || 0));
  if (l.tipo === "giorni") return I.avventura.liberoGiorni(l.giorni, formatoH(l.ore));
  return I.avventura.liberoOre(formatoH(l.ore));
}

function sezioneAvventura(ctx) {
  const A = I.avventura;
  const ob = ctx.obiettivo;
  const vai = h("button", { class: "bottone bottone-secondario", type: "button", id: "avventura-cambia",
    on: { click: () => ctx.azioni.vai("inizio") } }, ob && ob.tipo !== "semaforo" ? A.cambia : ob ? A.prepara : A.scegli);
  const solo = ob && ob.tipo !== "semaforo"
    ? h("div", { class: "uscita" },
      h("button", { class: "bottone bottone-secondario", type: "button", id: "avventura-solo-semaforo",
        on: { click: () => { ctx.ui.salvato = "avventura"; ctx.azioni.salvaObiettivo({ tipo: "semaforo" }); } } }, A.soloSemaforo),
      h("p", { class: "piccolo" }, A.soloSemaforoAiuto))
    : null;

  if (!ob) return sezione("avventura", A.titolo, h("p", {}, A.nessuna), h("div", { class: "riga-bottoni" }, vai), doveOnline(ctx));
  if (ob.tipo === "semaforo") {
    return sezione("avventura", A.titolo, h("p", {}, A.semaforo), h("div", { class: "riga-bottoni" }, vai), doveOnline(ctx), salvato(ctx, "avventura"));
  }
  if (ob.tipo === "libero") {
    return sezione("avventura", A.titolo,
      h("p", {}, h("strong", {}, A.libero), " ", descriviLibero(ob), ob.partenza ? ` ${A.liberoData(dataLunga(ob.partenza))}` : null),
      h("div", { class: "riga-bottoni" }, vai),
      solo,
      doveOnline(ctx),
      salvato(ctx, "avventura"));
  }

  // Un evento del catalogo. Giorni e data si cambiano qui, il resto dal primo avvio.
  const p = ob.percorso;
  const salva = (campi) => {
    ctx.ui.salvato = "avventura";
    ctx.azioni.salvaObiettivo({ tipo: "evento", percorso: ob.percorsoId, giorni: ob.giorni, partenza: ob.partenza, iscritto: ob.iscritto, ...campi });
  };
  const giorni = [];
  for (let g = p.giorniMin; g <= p.giorniMax; g++) giorni.push({ id: String(g), testo: A.giorno(g) });
  const tipici = Array.isArray(p.giorniTipici) && p.giorniTipici.length ? p.giorniTipici : null;
  const partenze = [...new Set([...(Array.isArray(p.partenze) ? p.partenze : []), ...(ob.partenza ? [ob.partenza] : [])])].sort();
  return sezione("avventura", A.titolo,
    h("p", { class: "avventura-nome" }, h("strong", {}, A.evento(p.evento, p.nome))),
    ob.iscritto ? h("p", { class: "piccolo" }, A.iscritto) : null,
    gruppo("avventura-giorni", A.giorni, giorni, String(ob.giorni), (v) => salva({ giorni: Number(v) })),
    tipici ? h("p", { class: "piccolo" }, A.tipici(tipici[0], tipici[tipici.length - 1])) : null,
    partenze.length > 1 || (partenze.length === 1 && partenze[0] !== ob.partenza)
      ? gruppo("avventura-partenza", A.partenza, partenze.map((d) => ({ id: d, testo: dataLunga(d) })), ob.partenza, (v) => salva({ partenza: v }))
      : null,
    salvato(ctx, "avventura"),
    h("div", { class: "riga-bottoni" }, vai),
    solo,
    doveOnline(ctx));
}

// --- Giorni e tempo (3.1) ---

function sezioneGiorni(ctx) {
  const G = I.giorni;
  const d = leggiDisponibilita(ctx.disponibilita || {});
  const scelte = PIANO.disponibilita.ore;
  const avviso = h("p", { class: "stato-salvataggio", role: "status", "aria-live": "polite" });
  const righe = G.nomi.map((nome, i) => {
    const tetto = d.tetti[i];
    return h("div", { class: "giorno-riga" },
      h("span", { class: "spunta" },
        h("input", { type: "checkbox", id: `giorno-${i}`, name: "giorni", value: String(i), checked: d.giorni.has(i) }),
        h("label", { for: `giorno-${i}` }, nome)),
      h("span", { class: "scelta scelta-stella" },
        h("input", { type: "radio", id: `stella-${i}`, name: "stella", value: String(i), checked: d.stella === i }),
        h("label", { for: `stella-${i}` }, h("span", { "aria-hidden": "true" }, G.stella), h("span", { class: "nascosto" }, G.stellaNascosta(nome)))),
      h("span", { class: "giorno-tetto" },
        h("label", { class: "nascosto", for: `tetto-${i}` }, G.tetto(nome)),
        h("select", { id: `tetto-${i}`, name: `tetto-${i}` }, G.tettoScelte.map((s) => h("option", {
          value: s.valore, selected: tetto === null ? s.valore === "" : s.valore === String(tetto),
        }, s.testo)))));
  });
  const modulo = h("form", { class: "giorni-modulo", novalidate: true },
    h("fieldset", { class: "domanda" },
      h("legend", {}, G.quali),
      h("div", { class: "giorni-righe" }, righe)),
    h("p", { class: "piccolo" }, G.stellaAiuto),
    h("p", { class: "piccolo" }, G.tettiAiuto),
    h("fieldset", { class: "domanda" },
      h("legend", {}, G.ore),
      h("div", { class: "scelte" }, scelte.map((n, k) => h("span", { class: "scelta" },
        h("input", { type: "radio", id: `ore-${n}`, name: "ore", value: String(n), checked: d.ore === n }),
        h("label", { for: `ore-${n}` }, G.oreScelta(n, k === scelte.length - 1)))))),
    casella("due-cose", G.dueCose, d.dueCose, () => {}),
    h("p", { class: "piccolo" }, G.dueCoseAiuto),
    h("div", { class: "riga-bottoni" }, h("button", { class: "bottone", type: "submit", id: "salva-giorni" }, G.salva)),
    avviso);
  modulo.addEventListener("submit", (e) => {
    e.preventDefault();
    const giorni = [...modulo.querySelectorAll("input[name=giorni]:checked")].map((x) => Number(x.value));
    const stellaScelta = modulo.querySelector("input[name=stella]:checked");
    const stella = stellaScelta ? Number(stellaScelta.value) : d.stella;
    // il giorno della lunga è per forza un giorno in cui si esce
    if (stella !== null && giorni.length && !giorni.includes(stella)) giorni.push(stella);
    if (!giorni.length) { avviso.textContent = G.almenoUno; return; }
    const ore = Number((modulo.querySelector("input[name=ore]:checked") || {}).value) || d.ore;
    const tetti = G.nomi.map((_, i) => {
      const v = modulo.querySelector(`#tetto-${i}`).value;
      return v === "" ? null : Number(v);
    });
    ctx.ui.salvato = "giorni";
    ctx.azioni.salvaDisponibilita({ giorni: giorni.sort(), stella, ore, tetti, dueCose: modulo.querySelector("#due-cose").checked });
  });
  return sezione("giorni", G.titolo,
    h("p", { class: "sezione-testo" }, G.attacco),
    modulo,
    salvato(ctx, "giorni"),
    doveOnline(ctx));
}

// --- Borse e bici (1.3) ---

function sezioneBorse(ctx) {
  const B = I.borse;
  const p = ctx.profilo;
  const kg = typeof p.borseKg === "number" ? String(p.borseKg) : "evento";
  const chili = [
    { id: "evento", testo: B.chiliEvento },
    ...STIMA.borseScelte.map((n, k) => ({ id: String(n), testo: B.chiliScelta(B.nomiChili[k] || "", n) })),
  ];
  // un peso detto altrove, per esempio al primo avvio o in Pronto?, resta fra le scelte
  if (kg !== "evento" && !chili.some((c) => c.id === kg)) chili.push({ id: kg, testo: B.chiliTuoi(numero(p.borseKg, p.borseKg % 1 ? 1 : 0)) });
  const pesi = [...B.pesoScelte.map((t, k) => ({ id: String(k), testo: t })), { id: "no", testo: B.pesoNo }];
  const ebike = p.ebike === true || (p.ebike !== false && Boolean(ctx.stima && ctx.stima.fonte && ctx.stima.fonte.tipo === "ebike"));
  return sezione("borse", B.titolo,
    h("p", { class: "sezione-testo" }, B.attacco),
    gruppo("bici", B.bici, B.biciScelte, p.bici || null, (v) => ctx.azioni.profilo({ bici: v }, "borse")),
    gruppo("borse-kg", B.chili, chili, kg, (v) => ctx.azioni.profilo({ borseKg: v === "evento" ? null : Number(v) }, "borse")),
    gruppo("borse-tipo", B.tipo, B.tipoScelte, p.borseTipo || null, (v) => ctx.azioni.profilo({ borseTipo: v }, "borse")),
    gruppo("peso", B.peso, pesi, Number.isInteger(p.pesoFascia) ? String(p.pesoFascia) : null,
      (v) => ctx.azioni.profilo({ pesoFascia: v === "no" ? null : Number(v) }, "borse")),
    h("p", { class: "piccolo" }, B.pesoAiuto),
    casella("ebike", B.ebike, ebike, (acceso) => ctx.azioni.profilo({ ebike: acceso }, "borse")),
    h("p", { class: "piccolo" }, B.ebikeAiuto),
    salvato(ctx, "borse"),
    doveOnline(ctx, I.borse.online));
}

// --- Palestra (5.1) ---

function sezionePalestra(ctx) {
  const P = I.palestra;
  const D = DOMANDE_PALESTRA;
  const p = ctx.profilo;
  const scelta = D.palestra.scelte.some((s) => s.valore === p.palestra) ? p.palestra : D.palestra.predefinita;
  const sicurezza = scelta !== "no"
    ? gruppo("palestra-sicurezza", D.sicurezza.testo, D.sicurezza.scelte.map((s) => ({ id: s.valore, testo: s.testo })),
      p.palestraSicurezza === "parlato" ? "si" : p.palestraSicurezza || null,
      (v) => ctx.azioni.profilo({ palestraSicurezza: v }, "palestra"))
    : null;
  const messaggio = TESTI_PALESTRA && TESTI_PALESTRA.messaggi ? TESTI_PALESTRA.messaggi.sicurezza : null;
  const parlato = scelta !== "no" && p.palestraSicurezza === "si"
    ? h("div", { class: "avviso-piccolo" },
      messaggio ? h("p", {}, messaggio) : null,
      h("div", { class: "riga-bottoni" }, h("button", { class: "bottone bottone-secondario", type: "button", id: "palestra-parlato",
        on: { click: () => ctx.azioni.profilo({ palestraSicurezza: D.sicurezza.parlato.valore }, "palestra") } }, D.sicurezza.parlato.testo)))
    : null;
  return sezione("palestra", P.titolo,
    h("p", { class: "sezione-testo" }, P.attacco),
    gruppo("palestra", D.palestra.testo, D.palestra.scelte.map((s) => ({ id: s.valore, testo: s.testo })), scelta,
      (v) => ctx.azioni.profilo({ palestra: v }, "palestra")),
    sicurezza,
    parlato,
    scelta !== "no"
      ? gruppo("altri-sport", P.altri, P.altriScelte, typeof p.altriSport === "boolean" ? (p.altriSport ? "si" : "no") : null,
        (v) => ctx.azioni.profilo({ altriSport: v === "si" }, "palestra"))
      : null,
    scelta !== "no" ? h("p", { class: "piccolo" }, P.altriAiuto) : null,
    salvato(ctx, "palestra"),
    doveOnline(ctx, I.palestra.online));
}

// --- Età, notte, in bici, ciclo (rilascio 1) ---

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

// La settimana leggera ogni tre si mostra da 50 anni, accesa se la persona non l'ha spenta (3.4).
function sezioneScarico(ctx) {
  if (!DA_50.has(ctx.profilo.fasciaEta)) return null;
  return sezione("scarico", I.scarico.titolo,
    casella("scarico-tre", I.scarico.casella, ctx.profilo.scaricoOgniTre !== false,
      (acceso) => ctx.azioni.profilo({ scaricoOgniTre: acceso }, "scarico")),
    h("p", { class: "piccolo" }, I.scarico.aiuto),
    salvato(ctx, "scarico"),
    dove(I.telefono));
}

// Le due scelte facoltative di 6.3, solo quando le scritture sulle attività sono accese.
function sezioneScritture(ctx) {
  if (!ctx.coda || !ctx.coda.attiva) return null;
  const p = ctx.profilo;
  return sezione("scritture", I.scritture.titolo,
    h("p", { class: "sezione-testo" }, I.scritture.attacco),
    casella("scrivi-strava", TESTI_DATI.sceltaStrava, p.stravaSuIntervals === true,
      (acceso) => ctx.azioni.profilo({ stravaSuIntervals: acceso }, "scritture")),
    h("p", { class: "piccolo" }, TESTI_DATI.aiutoSceltaStrava),
    casella("scrivi-carico", TESTI_DATI.sceltaCarico, p.caricoSenzaSensori === true,
      (acceso) => ctx.azioni.profilo({ caricoSenzaSensori: acceso }, "scritture")),
    h("p", { class: "piccolo" }, TESTI_DATI.aiutoSceltaCarico),
    salvato(ctx, "scritture"),
    dove(I.telefono));
}

// --- Dati, copia di sicurezza ed Esci (6.6) ---

function sezioneDati(ctx = null) {
  return sezione("dati", I.dati.titolo,
    h("ul", { class: "elenco" }, I.dati.righe(MEMORIA.giorni, { scritture: Boolean(ctx && ctx.coda && ctx.coda.attiva) }).map((t) => h("li", {}, t))),
    h("p", {}, h("a", { href: "#privacy" }, I.dati.privacy)));
}

function sezioneCopia(ctx) {
  const C = I.copia;
  if (ctx.demo) return sezione("copia", C.titolo, h("p", {}, C.testo), h("p", { class: "piccolo" }, C.demo));
  const stato = h("p", { class: "stato-salvataggio", role: "status", "aria-live": "polite" });
  const ultima = DATA.test(ctx.preferenze.ultimaCopia || "") ? C.ultima(dataLunga(ctx.preferenze.ultimaCopia)) : C.mai;
  const riga = h("p", { class: "piccolo", id: "copia-ultima" }, ultima);
  const anteprima = h("div", { class: "copia-anteprima", hidden: true });
  const file = h("input", { type: "file", id: "copia-file", accept: "application/json,.json", hidden: true, "aria-label": C.file });

  const salva = h("button", { class: "bottone bottone-secondario", type: "button", id: "copia-salva", on: { click: async () => {
    const esito = await ctx.azioni.salvaCopia();
    stato.textContent = esito && esito.ok ? C.salvata(esito.nome) : C.nonSalvata;
    if (esito && esito.ok) riga.textContent = C.ultima(dataLunga(oggiLocale()));
  } } }, C.salva);
  const riprendi = h("button", { class: "bottone bottone-secondario", type: "button", id: "copia-riprendi",
    on: { click: () => { file.value = ""; file.click(); } } }, C.riprendi);

  file.addEventListener("change", async () => {
    const scelto = file.files && file.files[0];
    if (!scelto) return;
    const prova = await ctx.azioni.anteprimaCopia(scelto);
    anteprima.replaceChildren();
    if (!prova || prova.motivo && prova.motivo !== "memoria") {
      anteprima.hidden = true;
      stato.textContent = (prova && C.motivi[prova.motivo]) || C.motivi.illeggibile;
      return;
    }
    stato.textContent = "";
    if (!prova.voci.length) {
      anteprima.hidden = true;
      stato.textContent = C.niente;
      return;
    }
    // riprendiCopia ridisegna la pagina prima di restituire l'esito. L'esito buono si scrive prima, e
    // quello cattivo, che può arrivare solo dalla memoria piena, ridisegna di nuovo.
    const conferma = h("button", { class: "bottone", type: "button", id: "copia-conferma", on: { click: async () => {
      ctx.ui.copia = "ripresa";
      const esito = await ctx.azioni.riprendiCopia(scelto);
      if (!esito || !esito.ok) ctx.azioni.ui("copia", (esito && esito.motivo) || "illeggibile");
    } } }, C.conferma);
    const annulla = h("button", { class: "bottone bottone-secondario", type: "button", on: { click: () => {
      anteprima.hidden = true;
      anteprima.replaceChildren();
      salva.focus();
    } } }, C.annulla);
    anteprima.append(
      h("p", {}, C.anteprima),
      h("ul", { class: "elenco" }, prova.voci.map((v) => {
        const nome = C.nomi[v.chiave] || C.altro;
        return h("li", {}, VOCI_COPIA.has(v.chiave) ? C.voce(nome, v.nuove, v.sostituite) : C.voceIntera(nome));
      })),
      h("div", { class: "riga-bottoni" }, conferma, annulla));
    anteprima.hidden = false;
    conferma.focus();
  });

  // L'esito di «Riprendi da una copia», dopo che la pagina si è ridisegnata.
  const esito = ctx.ui.copia;
  if (esito) {
    stato.textContent = esito === "ripresa" ? C.ripresa : C.motivi[esito] || C.motivi.illeggibile;
    ctx.ui.copia = null;
  }

  return sezione("copia", C.titolo,
    h("p", {}, C.testo),
    h("p", { class: "piccolo" }, C.dentro),
    riga,
    h("div", { class: "riga-bottoni" }, salva, riprendi),
    file,
    anteprima,
    stato,
    dove(I.telefono));
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
    sezioneAccount(ctx),
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
    sezioneAccount(ctx),
    sezioneAvventura(ctx),
    sezioneGiorni(ctx),
    sezioneBorse(ctx),
    sezionePalestra(ctx),
    sezioneEta(ctx),
    sezioneNotte(ctx, oggi),
    sezioneBici(ctx),
    sezioneCiclo(ctx),
    sezioneScarico(ctx),
    sezioneScritture(ctx),
    sezioneDati(ctx),
    sezioneCopia(ctx),
    sezioneEsci(ctx));
}
