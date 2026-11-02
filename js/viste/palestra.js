// La palestra (7.8). In alto il nome della scheda e quanti esercizi, poi il riscaldamento e le regole
// della seduta, un blocco per esercizio con serie, ripetizioni, recupero, la frase sul peso, «Come si
// fa» e «Alternativa», e alla fine «Fatta» con, chiuso, «Segna i pesi» (5.6). La seduta di oggi arriva
// già adattata al semaforo (ctx.palestra.oggi). Dalla settimana si apre anche quella di un altro giorno,
// come la scrive il piano, e la si segna il giorno stesso. sceltaPalestra è pura, così le prove la
// guardano con node (test/settimana.test.mjs).

import { h } from "../dom.js?v=202611021803";
import { PIANO } from "../parametri.js?v=202611021803";
import { ESERCIZI, SCHEDE, TESTI_PALESTRA, DOMANDE_PALESTRA, sedutaPalestra } from "../palestra.js?v=202611021803";
import { fraseSettimana, testoPalestraSposta } from "../testi-piano.js?v=202611021803";
import {
  PALESTRA_PAGINA, REGISTRA, SETTIMANA, SFORZO_PAROLE, giornoScheda, giornoRiga, prossimaSeduta, alPostoDi, nomeScheda,
  settimanaFase, troncoAttacco, segnataAlle,
} from "../testi-settimana.js?v=202611021803";
import { intestazione, bannerDemo } from "./comuni.js?v=202611021803";

const lista = (v) => (Array.isArray(v) ? v : []);
const num = (v) => typeof v === "number" && Number.isFinite(v);
const T = TESTI_PALESTRA;
const ORDINE_BLOCCHI = ["salti", "forza", "tronco", "mobilita"];
const CON_PESO = new Set(["peso", "zaino"]);

// I giorni di questa settimana, da oggi in poi, con palestra o tronco e collo nel piano.
function giorniConPalestra(ctx) {
  const w = ctx.settimana;
  return lista(w && w.giorni).filter((g) => g && g.giorno >= ctx.oggi).map((g) => ({
    giorno: g.giorno,
    seduta: lista(g.sedute).find((x) => x && x.tipo === "palestra") || lista(g.sedute).find((x) => x && x.tipo === "tronco") || null,
  })).filter((x) => x.seduta);
}

// Il livello del semaforo di oggi, come lo legge js/palestra.js. Uno stop vale il rosso.
function livelloDiOggi(ctx) {
  const e = ctx.esito;
  if (!e) return "verde";
  return e.stop ? "rosso" : e.livello || "verde";
}

// La scheda di un giorno del piano, composta come la scrive il piano. Oggi con il colore del mattino,
// gli altri giorni con il verde, perché il semaforo di quel giorno non si sa ancora.
function schedaDi(ctx, x, oggi) {
  const s = x.seduta;
  const livello = oggi ? livelloDiOggi(ctx) : "verde";
  const registro = lista(ctx.palestra && ctx.palestra.registro);
  if (s.tipo === "tronco") return sedutaPalestra(7, 1, null, ctx.profilo || {}, registro, livello, { oggi: x.giorno });
  if (!Number.isInteger(s.scheda)) return null;
  return sedutaPalestra(s.scheda, s.settimana, s.seduta, ctx.profilo || {}, registro, livello, { oggi: x.giorno });
}

// Quale seduta mostra la pagina. Quella di un altro giorno se la settimana l'ha chiesta
// (ctx.ui.palestraGiorno), altrimenti quella di oggi. Senza seduta oggi, il perché e la prossima.
export function sceltaPalestra(ctx) {
  const oggi = ctx.oggi;
  const giorni = giorniConPalestra(ctx);
  const voluto = ctx.ui && typeof ctx.ui.palestraGiorno === "string" ? ctx.ui.palestraGiorno : null;
  const diOggi = giorni.find((x) => x.giorno === oggi) || null;
  const altri = giorni.filter((x) => x.giorno > oggi);
  if (voluto && voluto !== oggi) {
    const x = altri.find((y) => y.giorno === voluto);
    if (x) return { giorno: x.giorno, oggi: false, dalPiano: x.seduta, scheda: schedaDi(ctx, x, false), giorni };
  }
  const delMotore = ctx.palestra && ctx.palestra.oggi;
  if (delMotore) return { giorno: oggi, oggi: true, dalPiano: diOggi ? diOggi.seduta : null, scheda: delMotore, giorni };
  if (diOggi && diOggi.seduta.tipo === "tronco") return { giorno: oggi, oggi: true, dalPiano: diOggi.seduta, scheda: schedaDi(ctx, diOggi, true), giorni };
  const sposta = ctx.seduta && ctx.seduta.sposta && ctx.seduta.sposta.palestra ? ctx.seduta.sposta.palestra : null;
  return {
    giorno: oggi, oggi: true, dalPiano: null, scheda: null, giorni,
    prossima: altri[0] || null, spostata: sposta, ferma: Boolean(diOggi && ctx.esito && ctx.esito.stop),
  };
}

// --- Gli avvisi della fase (5.1) ---

function avvisiFase(ctx) {
  const fase = ctx.palestra && ctx.palestra.fase;
  const fuori = [];
  for (const m of lista(fase && fase.messaggi)) {
    if (!m || !m.testo) continue;
    if (m.chiave === "ossa") {
      if (ctx.preferenze && ctx.preferenze.palestraOssa) continue;
      fuori.push(h("div", { class: "palestra-avviso" },
        h("p", {}, m.testo),
        h("div", { class: "riga-bottoni" },
          h("button", { class: "bottone bottone-secondario", type: "button", id: "palestra-ossa", on: { click: () => ctx.azioni.preferenza("palestraOssa", ctx.oggi) } }, PALESTRA_PAGINA.hoCapito))));
      continue;
    }
    if (m.chiave === "sicurezza") {
      const parlato = DOMANDE_PALESTRA.sicurezza.parlato;
      fuori.push(h("div", { class: "palestra-avviso palestra-avviso-medico" },
        h("p", {}, m.testo),
        h("div", { class: "riga-bottoni" },
          h("button", { class: "bottone bottone-secondario", type: "button", id: "palestra-parlato", on: { click: () => ctx.azioni.profilo({ palestraSicurezza: parlato.valore }) } }, parlato.testo))));
      continue;
    }
    fuori.push(h("p", { class: "palestra-avviso" }, m.testo));
  }
  // Al primo «Sì» alla palestra la domanda di sicurezza (5.1), se il primo avvio non l'ha già fatta.
  if (fase && fase.chiedi === "sicurezza") {
    const d = DOMANDE_PALESTRA.sicurezza;
    fuori.push(h("div", { class: "palestra-avviso palestra-domanda" },
      h("p", {}, PALESTRA_PAGINA.sicurezza),
      h("p", { class: "palestra-domanda-testo" }, d.testo),
      h("div", { class: "riga-bottoni" }, d.scelte.map((s) => h("button", {
        class: "bottone bottone-secondario", type: "button", id: `palestra-sicurezza-${s.valore}`,
        on: { click: () => ctx.azioni.profilo({ palestraSicurezza: s.valore }) },
      }, s.testo)))));
  }
  return fuori;
}

// --- Un esercizio ---

// L'alternativa scelta vale per quel giorno e quell'esercizio.
const chiaveAlternativa = (giorno, id) => [giorno, id].join("/");

// La scelta dell'alternativa resta in ctx.ui.palestraAlternative, per giorno ed esercizio, e cambia solo
// il blocco dell'esercizio, così il fuoco resta dove era.
function esercizio(ctx, v, giorno) {
  const chiave = chiaveAlternativa(giorno, v.id);
  const li = h("li", { class: "esercizio", id: `esercizio-${v.id}` });
  const scegli = (altId, selettore) => {
    ctx.ui.palestraAlternative = { ...(ctx.ui.palestraAlternative || {}), [chiave]: altId };
    li.replaceChildren(...contenuto(altId));
    // Anche «Segna i pesi» dice l'esercizio scelto.
    const voce = document.getElementById(`pesi-${v.id}-nome`);
    if (voce) voce.textContent = altId && ESERCIZI[altId] ? ESERCIZI[altId].nome : v.nome;
    const dove = li.querySelector(selettore) || li.querySelector("h3");
    if (dove) {
      if (dove.tagName === "H3") dove.setAttribute("tabindex", "-1");
      dove.focus();
    }
  };
  const contenuto = (altId) => {
    const alt = altId && ESERCIZI[altId] ? ESERCIZI[altId] : null;
    const nome = alt ? alt.nome : v.nome;
    const pezzi = [
      h("div", { class: "esercizio-testa" },
        h("h3", {}, nome),
        v.facoltativo ? h("span", { class: "etichetta" }, T.pagina.facoltativo) : null),
      alt ? h("p", { class: "piccolo" }, alPostoDi(v.nome)) : null,
      h("p", { class: "esercizio-serie" }, v.testi.serie),
      v.testi.recupero ? h("p", {}, `${v.testi.recupero}.`) : null,
      v.testi.peso ? h("p", {}, v.testi.peso) : null,
      !alt && v.testi.proposta ? h("p", { class: "esercizio-proposta" }, v.testi.proposta) : null,
      v.testi.nota ? h("p", { class: "piccolo" }, v.testi.nota) : null,
      h("details", { class: "spiega" },
        h("summary", {}, T.pagina.comeSiFa),
        h("p", {}, alt ? alt.come : v.testi.come),
        !alt && v.testi.dettaglio ? h("p", {}, v.testi.dettaglio) : null,
        (alt ? alt.serve : v.testi.serve) ? h("p", {}, alt ? alt.serve : v.testi.serve) : null,
        v.testi.quandoAumentare ? h("p", {}, v.testi.quandoAumentare) : null),
    ];
    const ids = lista(v.alternative).filter((id) => ESERCIZI[id]);
    if (alt) {
      pezzi.push(h("div", { class: "riga-bottoni" },
        h("button", { class: "collegamento", type: "button", id: `alt-${v.id}`, on: { click: () => scegli(null, `#alt-${v.id}-menu > summary`) } }, PALESTRA_PAGINA.tornaAllaScheda)));
    } else if (ids.length || v.testi.alternativa) {
      pezzi.push(h("details", { class: "spiega", id: `alt-${v.id}-menu` },
        h("summary", {}, T.pagina.alternativa),
        v.testi.alternativa ? h("p", {}, v.testi.alternativa) : null,
        ids.length ? h("div", { class: "riga-bottoni" }, ids.map((id) => h("button", {
          class: "bottone bottone-secondario esercizio-alternativa", type: "button", id: `alt-${v.id}-${id}`,
          on: { click: () => scegli(id, `#alt-${v.id}`) },
        }, ESERCIZI[id].nome))) : null));
    }
    // append e replaceChildren scriverebbero «null» per i pezzi che mancano.
    return pezzi.filter(Boolean);
  };
  li.append(...contenuto((ctx.ui.palestraAlternative || {})[chiave] || null));
  return li;
}

function gruppi(ctx, s, giorno) {
  return ORDINE_BLOCCHI.map((blocco) => {
    const voci = s.esercizi.filter((v) => v.blocco === blocco);
    if (!voci.length) return null;
    const id = `palestra-${blocco}`;
    return h("section", { class: "sezione palestra-gruppo", id, "aria-labelledby": `${id}-titolo` },
      h("h2", { id: `${id}-titolo` }, PALESTRA_PAGINA.gruppi[blocco]),
      h("ol", { class: "esercizi" }, voci.map((v) => esercizio(ctx, v, giorno))));
  });
}

// --- «Fatta» e «Segna i pesi» (5.6) ---

function scelteRadio(nome, opzioni, scelta) {
  return h("div", { class: "scelte" }, opzioni.map((o) => {
    const id = `${nome}-${o.valore}`;
    return h("span", { class: "scelta" },
      h("input", { type: "radio", id, name: nome, value: String(o.valore), checked: String(scelta) === String(o.valore) }),
      h("label", { for: id }, o.testo));
  }));
}

function numero(id, etichetta, valore, attributi = {}) {
  return h("span", { class: "campo pesi-campo" },
    h("label", { for: id }, etichetta),
    h("input", { type: "number", id, name: id, min: "0", inputmode: "decimal", value: valore ?? "", ...attributi }));
}

// Gli esercizi con un peso da segnare, quelli di forza con il bilanciere, i manubri o lo zaino.
const daPesare = (s) => s.esercizi.filter((v) => v.blocco === "forza" && v.riserva && CON_PESO.has(v.carico));

function moduloFatta(ctx, sc) {
  const s = sc.scheda;
  const bozza = ctx.ui.palestraBozza && ctx.ui.palestraBozza.giorno === sc.giorno ? ctx.ui.palestraBozza : { giorno: sc.giorno, pesi: {} };
  const scelteAlt = ctx.ui.palestraAlternative || {};
  const pesabili = daPesare(s);
  const stato = h("p", { class: "stato-salvataggio", role: "status", "aria-live": "polite" });
  const scelteFatta = T.registra.scelte.filter((x) => x.valore !== "no");
  const pesi = pesabili.length ? h("details", { class: "pesi", open: ctx.ui.palestraPesi || null },
    h("summary", { id: "segna-pesi" }, REGISTRA.pesi),
    h("p", { class: "piccolo" }, REGISTRA.pesiAiuto),
    pesabili.map((v) => {
      const b = (bozza.pesi || {})[v.id] || {};
      const altId = scelteAlt[chiaveAlternativa(sc.giorno, v.id)];
      const nome = altId && ESERCIZI[altId] ? ESERCIZI[altId].nome : v.nome;
      return h("fieldset", { class: "domanda pesi-esercizio" },
        h("legend", { id: `pesi-${v.id}-nome` }, nome),
        h("div", { class: "pesi-numeri" },
          numero(`pesi-${v.id}-kg`, REGISTRA.kg, b.kg ?? (altId ? null : v.kg), { step: "0.5" }),
          numero(`pesi-${v.id}-ripetizioni`, REGISTRA.ripetizioni, b.ripetizioni ?? (v.ripetizioni ? v.ripetizioni.a : null), { step: "1", inputmode: "numeric" }),
          numero(`pesi-${v.id}-riserva`, REGISTRA.riserva, b.riserva ?? (v.riserva ? v.riserva.da : null), { step: "1", max: "10", inputmode: "numeric" })));
    })) : null;
  if (pesi) pesi.addEventListener("toggle", () => { ctx.ui.palestraPesi = pesi.open; });

  const form = h("form", { class: "carta palestra-modulo", novalidate: true },
    h("fieldset", { class: "domanda" }, h("legend", {}, REGISTRA.fatta), scelteRadio("palestra-fatta", scelteFatta, bozza.fatta || scelteFatta[0].valore)),
    h("fieldset", { class: "domanda" }, h("legend", {}, REGISTRA.sforzo), scelteRadio("palestra-sforzo", SFORZO_PAROLE, bozza.sforzo ?? null)),
    pesi,
    h("div", { class: "riga-bottoni" },
      h("button", { class: "bottone", type: "submit", id: "palestra-fatta" }, REGISTRA.salva),
      ctx.demo ? h("span", { class: "piccolo" }, REGISTRA.demo) : null),
    stato);

  const valore = (nome) => {
    const x = form.querySelector(`input[name="${nome}"]:checked`);
    return x ? x.value : null;
  };
  const letto = (id) => {
    const el = form.querySelector(`#${id}`);
    const v = el ? el.value.trim().replace(",", ".") : "";
    const n = v === "" ? null : Number(v);
    return num(n) && n >= 0 ? n : null;
  };
  const leggi = () => {
    const pesiLetti = {};
    for (const v of pesabili) {
      pesiLetti[v.id] = { kg: letto(`pesi-${v.id}-kg`), ripetizioni: letto(`pesi-${v.id}-ripetizioni`), riserva: letto(`pesi-${v.id}-riserva`) };
    }
    return { giorno: sc.giorno, fatta: valore("palestra-fatta"), sforzo: valore("palestra-sforzo"), pesi: pesiLetti };
  };
  form.addEventListener("change", () => { ctx.ui.palestraBozza = leggi(); });
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const ora = leggi();
    const risposte = { fatta: ora.fatta || "tutta", sforzo: ora.sforzo ? Number(ora.sforzo) : null, pesi: {} };
    // I pesi contano solo se la persona ha aperto «Segna i pesi». L'alternativa scelta conta sempre.
    const scelteOra = ctx.ui.palestraAlternative || {};
    for (const v of s.esercizi) {
      const altId = scelteOra[chiaveAlternativa(sc.giorno, v.id)];
      const voce = {};
      if (altId && ESERCIZI[altId]) voce.id = altId;
      if (pesi && pesi.open && ora.pesi[v.id]) {
        for (const [k, x] of Object.entries(ora.pesi[v.id])) if (x !== null) voce[k] = x;
      }
      if (Object.keys(voce).length) risposte.pesi[v.id] = voce;
    }
    // L'azione ridisegna la pagina, quindi il messaggio va detto prima.
    ctx.ui.palestraMessaggio = REGISTRA.segnata;
    const bozzaPrima = ctx.ui.palestraBozza;
    ctx.ui.palestraBozza = null;
    if (!ctx.azioni.palestraFatta(s, risposte)) {
      ctx.ui.palestraMessaggio = null;
      ctx.ui.palestraBozza = bozzaPrima;
      stato.textContent = REGISTRA.errore;
    }
  });
  return form;
}

function registrazione(ctx, sc, messaggio) {
  const fatta = lista(ctx.palestra && ctx.palestra.registro).find((r) => r && r.data === ctx.oggi && !r.daDispositivo) || null;
  const id = "palestra-registra";
  // Appena segnata, la riga con l'ora è anche il messaggio, così si legge una volta sola.
  return h("section", { class: "sezione", id, "aria-labelledby": `${id}-titolo` },
    h("h2", { id: `${id}-titolo` }, REGISTRA.titolo),
    fatta
      ? h("p", messaggio ? { class: "salvato", role: "status" } : {}, segnataAlle(fatta.ora))
      : [messaggio ? h("p", { class: "salvato", role: "status" }, messaggio) : null, moduloFatta(ctx, sc)]);
}

// --- La pagina ---

// Le sedute della settimana, per passare da un giorno all'altro.
function altriGiorni(ctx, sc) {
  if (sc.giorni.length < 2 && sc.oggi) return null;
  return h("nav", { class: "filtro palestra-giorni", "aria-label": PALESTRA_PAGINA.settimana }, sc.giorni.map((x) => {
    const scelto = x.giorno === sc.giorno;
    return h("button", {
      class: ["filtro-voce", scelto && "attivo"], type: "button", id: `palestra-giorno-${x.giorno}`, "aria-current": scelto ? "true" : null,
      on: { click: () => ctx.azioni.ui("palestraGiorno", x.giorno === ctx.oggi ? null : x.giorno) },
    }, x.giorno === ctx.oggi ? PALESTRA_PAGINA.oggi : giornoRiga(x.giorno));
  }));
}

// Il nome della scheda e la settimana della fase, sotto il titolo.
function descrizione(ctx, sc) {
  const s = sc.scheda;
  const scheda = sc.dalPiano && sc.dalPiano.tipo === "tronco" ? SCHEDE[7] : SCHEDE[s.scheda];
  const fase = ctx.palestra && ctx.palestra.fase;
  const settimana = fase && [1, 2, 3, 4, 5, 8].includes(s.scheda) && s.livello !== "rosso" ? settimanaFase(fase.fase, s.settimana) : null;
  const testo = [scheda && s.livello !== "rosso" ? scheda.descrizione : null, settimana].filter(Boolean).join(" ");
  return testo ? h("p", { class: "piccolo" }, testo) : null;
}

function primaDiCominciare(s) {
  if (!s.riscaldamento.length && !s.avvertenze.length) return null;
  return h("section", { class: "sezione", id: "palestra-prima", "aria-labelledby": "palestra-prima-titolo" },
    h("h2", { id: "palestra-prima-titolo" }, PALESTRA_PAGINA.prima),
    s.riscaldamento.map((t) => h("p", {}, t)),
    s.avvertenze.length ? h("ul", { class: "palestra-regole" }, s.avvertenze.map((t) => h("li", {}, t))) : null);
}

function conScheda(ctx, sc) {
  const s = sc.scheda;
  const tronco = sc.dalPiano && sc.dalPiano.tipo === "tronco";
  // Il messaggio di «Fatta» si mostra una volta sola.
  const messaggio = ctx.ui.palestraMessaggio || null;
  ctx.ui.palestraMessaggio = null;
  return h("div", { class: "vista vista-palestra" },
    intestazione(sc.oggi ? PALESTRA_PAGINA.oggi : giornoScheda(sc.giorno),
      tronco ? PALESTRA_PAGINA.troncoTitolo : nomeScheda(s.nome, s.seduta),
      tronco ? troncoAttacco(sc.dalPiano.minuti) : s.sottotitolo),
    descrizione(ctx, sc),
    ctx.demo ? bannerDemo(ctx) : null,
    altriGiorni(ctx, sc),
    s.righe.length || !sc.oggi ? h("div", { class: "palestra-note", "aria-live": "polite" },
      !sc.oggi ? h("p", { class: "palestra-avviso" }, PALESTRA_PAGINA.anteprima) : null,
      s.righe.map((t) => h("p", { class: "palestra-avviso" }, t))) : null,
    avvisiFase(ctx),
    primaDiCominciare(s),
    gruppi(ctx, s, sc.giorno),
    sc.oggi ? registrazione(ctx, sc, messaggio) : h("p", { class: "piccolo" }, PALESTRA_PAGINA.segnaIlGiorno));
}

function senzaScheda(ctx, sc) {
  let testo = PALESTRA_PAGINA.niente;
  if (sc.spostata && sc.spostata.a) testo = testoPalestraSposta(sc.spostata.da, sc.spostata.a);
  else if (sc.ferma) testo = PALESTRA_PAGINA.ferma;
  const fase = ctx.palestra && ctx.palestra.fase;
  const senzaPalestra = ctx.profilo && ctx.profilo.palestra === "no";
  return h("div", { class: "vista vista-palestra" },
    intestazione(PALESTRA_PAGINA.oggi, PALESTRA_PAGINA.titolo, testo),
    ctx.demo ? bannerDemo(ctx) : null,
    senzaPalestra && !(fase && lista(fase.messaggi).some((m) => m && m.chiave === "invito")) ? h("p", { class: "palestra-avviso" }, PALESTRA_PAGINA.noPalestra) : null,
    avvisiFase(ctx),
    sc.prossima ? h("section", { class: "carta palestra-prossima", id: "palestra-prossima" },
      h("p", {}, prossimaSeduta(sc.prossima.giorno)),
      h("div", { class: "riga-bottoni" },
        h("button", {
          class: "bottone bottone-secondario", type: "button", id: "palestra-guarda",
          on: { click: () => ctx.azioni.ui("palestraGiorno", sc.prossima.giorno) },
        }, PALESTRA_PAGINA.guarda))) : null);
}

// In viaggio niente palestra. Per i viaggi di 11 giorni e più la scheda 6, facoltativa, la sera dopo
// la tappa (5.4 e regola 4.7).
function inViaggio(ctx) {
  const lungo = ctx.obiettivo && Number.isInteger(ctx.obiettivo.giorni) && ctx.obiettivo.giorni >= PIANO.palestra.viaggioDaGiorni;
  if (!lungo) {
    return h("div", { class: "vista vista-palestra" },
      intestazione(null, PALESTRA_PAGINA.titolo, T.messaggi.nessunaRoutine),
      ctx.demo ? bannerDemo(ctx) : null);
  }
  const s = sedutaPalestra(6, 1, null, ctx.profilo || {}, lista(ctx.palestra && ctx.palestra.registro), livelloDiOggi(ctx), { oggi: ctx.oggi });
  return h("div", { class: "vista vista-palestra" },
    intestazione(PALESTRA_PAGINA.oggi, s.nome, T.messaggi.viaggio),
    ctx.demo ? bannerDemo(ctx) : null,
    s.righe.length ? h("div", { class: "palestra-note" }, s.righe.map((t) => h("p", { class: "palestra-avviso" }, t))) : null,
    gruppi(ctx, s, ctx.oggi));
}

// Fuori dalla pagina la scelta di un altro giorno non vale più. Quando si torna dalla carta di oggi
// si vede la seduta di oggi.
function dimenticaIlGiornoUscendo(ctx) {
  window.addEventListener("hashchange", () => {
    if (location.hash !== "#palestra") ctx.ui.palestraGiorno = null;
  }, { once: true });
}

export function vistaPalestra(ctx) {
  const p = ctx.piano;
  if (p && p.fase === "evento") return inViaggio(ctx);
  if (!p || !ctx.settimana) {
    const testo = p && (p.fase === "dopo" || p.fase === "finito") ? fraseSettimana({ tipo: "dopoEvento" }) : PALESTRA_PAGINA.senzaPiano;
    return h("div", { class: "vista vista-palestra" },
      intestazione(null, PALESTRA_PAGINA.titolo, testo),
      ctx.demo ? bannerDemo(ctx) : null,
      p ? null : h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone", type: "button", id: "palestra-scegli", on: { click: () => ctx.azioni.vai("inizio") } }, SETTIMANA.scegli)));
  }
  const sc = sceltaPalestra(ctx);
  if (!sc.oggi) dimenticaIlGiornoUscendo(ctx);
  return sc.scheda ? conScheda(ctx, sc) : senzaScheda(ctx, sc);
}
