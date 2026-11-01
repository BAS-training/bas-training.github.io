// La prova della scrittura (9.8 della specifica). Si lancia con  node --test test/testi.test.mjs
// Legge tutte le stringhe esportate dai file js/testi*.js e da js/palestra.js, quando ci sono, anche
// dentro oggetti e liste. Compone ogni modello con valori di prova (date, orari, durate, nomi dei
// percorsi) fatti con le funzioni vere di js/formato.js, perché un segnaposto come l'ora porta i due
// punti solo a schermo. Legge anche le stringhe a schermo rimaste nei file js/viste/*.js, il testo di
// index.html e il README. Poi controlla le regole del capitolo 7.1.
// I file dei testi si trovano da soli, così js/testi-stima.js, js/testi-prontezza.js, js/testi-piano.js,
// js/testi-dati.js e js/palestra.js entrano nella prova appena arrivano.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import { formatoDurata, formatoH, formatoOra, dataLunga, numero } from "../js/formato.js";
import { DOMANDE } from "../js/parametri.js";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const JS = join(RADICE, "js");
const VISTE = join(JS, "viste");

const FILE_TESTI = readdirSync(JS).filter((f) => /^testi.*\.js$/.test(f)).sort();
const FILE_SCHEDE = existsSync(join(JS, "palestra.js")) ? ["palestra.js"] : [];
const FILE_VISTE = existsSync(VISTE) ? readdirSync(VISTE).filter((f) => f.endsWith(".js")).sort() : [];

const moduli = {};
for (const f of [...FILE_TESTI, ...FILE_SCHEDE]) moduli[f] = await import(pathToFileURL(join(JS, f)).href);

// --- i valori di prova per comporre i modelli ---

const NUMERI = [0, 1, 2, 3, 5, 7, 9, 12, 14, 45, 80, 210, 400];
const PAROLE = [
  dataLunga("2027-03-14"), formatoOra(8, 30), formatoDurata(80), formatoDurata(250), formatoH(7.5),
  "Tuscany Trail", "il weekend lungo", numero(1.3, 1), "Oggi riposo o 30-45 minuti di recupero.",
];

// Un oggetto qualsiasi, per i modelli che ricevono un oggetto. Ogni campo vale 3.
const QUALSIASI = new Proxy({}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => 3 : k === "toString" || k === "valueOf" ? () => "3" : 3),
});

// Tutti i risultati di un modello con i valori di prova, più gli ingressi di esempio che il file dei
// testi esporta in ESEMPI per quel modello. Le combinazioni che non valgono si saltano.
function componi(fn, esempi = []) {
  const n = Math.max(fn.length, 1);
  const prove = [Array(n).fill(null), Array(n).fill(QUALSIASI)];
  for (const x of NUMERI) prove.push(Array(n).fill(x));
  for (const p of PAROLE) prove.push(Array(n).fill(p));
  for (const x of [1, 2, 7]) {
    for (const p of PAROLE) {
      prove.push([x, ...Array(n - 1).fill(p)]);
      prove.push([...Array(n - 1).fill(x), p]);
    }
  }
  prove.push(...esempi);
  const risultati = [];
  for (const argomenti of prove) {
    try {
      const r = fn(...argomenti);
      if (r !== undefined && r !== null) risultati.push(r);
    } catch { /* una combinazione che il modello non accetta */ }
  }
  return risultati;
}

// Ogni testo con il suo posto, per i messaggi e per sapere a che schermata appartiene.
function raccogli(valore, dove, schermata, lista, modelli, esempi = []) {
  if (typeof valore === "string") lista.push({ dove, schermata, testo: valore });
  else if (typeof valore === "function") {
    if (!modelli) return;
    const risultati = componi(valore, esempi);
    modelli.push({ dove, risultati: risultati.length });
    risultati.forEach((r, k) => raccogli(r, `${dove}(prova ${k})`, schermata, lista, null));
  } else if (Array.isArray(valore)) valore.forEach((x, k) => raccogli(x, `${dove}[${k}]`, schermata, lista, modelli, esempi));
  else if (valore && typeof valore === "object") {
    for (const [k, x] of Object.entries(valore)) raccogli(x, `${dove}.${k}`, schermata, lista, modelli, esempi);
  }
}

// --- le stringhe a schermo rimaste nel codice delle pagine ---

// Le stringhe di un sorgente, senza commenti. Dei modelli `...${}...` restano i pezzi fissi, con X al
// posto di ogni valore, e le stringhe dentro i valori si leggono a parte.
function stringheDelCodice(sorgente) {
  const trovate = [];
  // Una barra apre un'espressione regolare dopo un operatore, una parentesi aperta o una parola come
  // return. Dopo un nome, un numero o una parentesi chiusa è una divisione.
  const apreRegex = (prima) => prima === "" || /[(,=:[!&|?{};+\-*%<>~^]$/.test(prima) || /\b(return|typeof|case|in|of)$/.test(prima);
  let i = 0;
  let ultimo = "";
  while (i < sorgente.length) {
    const c = sorgente[i];
    const d = sorgente[i + 1];
    if (c === "/" && d === "/") { const fine = sorgente.indexOf("\n", i); i = fine < 0 ? sorgente.length : fine; continue; }
    if (c === "/" && d === "*") { const fine = sorgente.indexOf("*/", i + 2); i = fine < 0 ? sorgente.length : fine + 2; continue; }
    if (c === "/" && apreRegex(ultimo.trimEnd())) {
      let j = i + 1;
      let classe = false;
      while (j < sorgente.length && (sorgente[j] !== "/" || classe)) {
        if (sorgente[j] === "\\") j += 1;
        else if (sorgente[j] === "[") classe = true;
        else if (sorgente[j] === "]") classe = false;
        j += 1;
      }
      i = j + 1;
      ultimo = "x";
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let s = "";
      while (j < sorgente.length && sorgente[j] !== c) {
        if (sorgente[j] === "\\") { s += sorgente[j + 1]; j += 2; } else s += sorgente[j++];
      }
      trovate.push(s);
      i = j + 1;
      ultimo = "x";
      continue;
    }
    if (c === "`") {
      let j = i + 1;
      let s = "";
      while (j < sorgente.length && sorgente[j] !== "`") {
        if (sorgente[j] === "\\") { s += sorgente[j + 1]; j += 2; continue; }
        if (sorgente[j] === "$" && sorgente[j + 1] === "{") {
          let profondita = 1;
          let k = j + 2;
          let dentro = "";
          while (k < sorgente.length && profondita > 0) {
            const x = sorgente[k];
            if (x === "{") profondita += 1;
            else if (x === "}") profondita -= 1;
            if (profondita > 0) dentro += x;
            k += 1;
          }
          trovate.push(...stringheDelCodice(dentro));
          s += "X";
          j = k;
          continue;
        }
        s += sorgente[j++];
      }
      trovate.push(s);
      i = j + 1;
      ultimo = "x";
      continue;
    }
    if (!/\s/.test(c)) ultimo += c;
    else if (ultimo && !/\s$/.test(ultimo)) ultimo += " ";
    if (ultimo.length > 40) ultimo = ultimo.slice(-20);
    i += 1;
  }
  return trovate;
}

const CODICE = /^[a-z0-9_][a-z0-9_-]*( [a-z0-9_][a-z0-9_-]*)*$/;   // classi, id, attributi, nomi
function aSchermo(s) {
  const t = s.trim();
  if (!/\p{L}/u.test(t)) return false;
  if (/^(https?:|mailto:|data:|\.{0,2}\/|#)/.test(t)) return false;
  if (/[[\]{}<>=]/.test(t)) return false;
  if (CODICE.test(t)) return false;
  if (!/\s/.test(t) && /[/.]/.test(t) && !/[.!?…»]$/.test(t)) return false;
  return /\s/.test(t) || /^[\p{Lu}«]/u.test(t) || /[.!?…»]$/.test(t);
}

// --- tutti i testi ---

const TESTI = [];
const MODELLI = [];
for (const [file, modulo] of Object.entries(moduli)) {
  const conModelli = FILE_TESTI.includes(file);
  const esempi = modulo.ESEMPI && typeof modulo.ESEMPI === "object" ? modulo.ESEMPI : {};
  for (const [nome, valore] of Object.entries(modulo)) {
    if (nome === "ESEMPI") continue;   // gli ingressi di prova dei modelli, non sono testi
    raccogli(valore, `${file} ${nome}`, `${file} ${nome}`, TESTI, conModelli ? MODELLI : null, Array.isArray(esempi[nome]) ? esempi[nome] : []);
  }
}
const DALLE_VISTE = [];
for (const f of FILE_VISTE) {
  for (const s of stringheDelCodice(readFileSync(join(VISTE, f), "utf8"))) {
    if (aSchermo(s)) DALLE_VISTE.push({ dove: `viste/${f}`, schermata: `viste/${f}`, testo: s });
  }
}
const TUTTI = [...TESTI, ...DALLE_VISTE];

// Le pagine dei numeri e la Guida, dove possono stare kJ, «specchio», «ritmo-soglia» e «tapering».
const PAGINE_NUMERI = new Set(["viste/andamento.js", "viste/uscite.js", "viste/numeri.js"]);
const numeriOGuida = (t) => PAGINE_NUMERI.has(t.schermata) || /\b\w*(GUIDA|NUMERI)\w*\b/.test(t.schermata);

function elenco(lista) {
  return lista.slice(0, 15).map((t) => `${t.dove} «${t.testo}»`).join("\n");
}

// --- le prove ---

test("ci sono i testi da leggere, e ogni modello si compone con i valori di prova", () => {
  assert.ok(FILE_TESTI.includes("testi.js"), "manca js/testi.js");
  assert.ok(TESTI.length > 300, `pochi testi, ${TESTI.length}`);
  assert.ok(DALLE_VISTE.length > 20, `poche stringhe dalle pagine, ${DALLE_VISTE.length}`);
  const muti = MODELLI.filter((x) => x.risultati === 0).map((x) => x.dove);
  assert.deepEqual(muti, [], "modelli che non danno nessun testo con i valori di prova");
});

test("nessun testo contiene il carattere dei due punti", () => {
  const sbagliati = TUTTI.filter((t) => t.testo.includes(":"));
  assert.equal(sbagliati.length, 0, elenco(sbagliati));
});

test("nessun testo contiene le parole vietate, senza guardare maiuscole e minuscole", () => {
  // L'espressione è scritta a pezzi, così nemmeno questo file contiene le parole intere (9.8).
  const VIETATE = new RegExp("\\b(ga" + "r[ae]" + "|presta" + "zion[ei]" + "|ra" + "c(e|es|ing)" + "|perfor" + "mance)\\b", "i");
  assert.equal(VIETATE.test("Una " + "ga" + "ra di fondo"), true, "l'espressione funziona");
  assert.equal(VIETATE.test("Una gara" + "nzia"), false, "solo parole intere");
  const sbagliati = TUTTI.filter((t) => VIETATE.test(t.testo));
  assert.equal(sbagliati.length, 0, elenco(sbagliati));
});

test("niente sigle e niente gergo, e «specchio», «tapering» e kJ solo fra i numeri e nella Guida", () => {
  const sempre = TUTTI.filter((t) => /\b(T[123]|RIR)\b/.test(t.testo));
  assert.equal(sempre.length, 0, elenco(sempre));
  const fuori = TUTTI.filter((t) => !numeriOGuida(t) && /\bkJ\b|ritmo-soglia|\btapering\b|\bspecchio\b/i.test(t.testo));
  assert.equal(fuori.length, 0, elenco(fuori));
});

test("la sigla RPE solo con la parola «sforzo» nella stessa schermata", () => {
  const schermate = new Map();
  for (const t of TUTTI) {
    if (!schermate.has(t.schermata)) schermate.set(t.schermata, []);
    schermate.get(t.schermata).push(t.testo);
  }
  const sbagliate = [...schermate].filter(([, testi]) => testi.some((x) => /\bRPE\b/.test(x)) && !testi.some((x) => /sforzo/i.test(x)));
  assert.deepEqual(sbagliate.map(([s]) => s), []);
});

test("niente pagelle, mai «indietro»", () => {
  const sbagliati = TUTTI.filter((t) => /\bindietro\b/i.test(t.testo));
  assert.equal(sbagliati.length, 0, elenco(sbagliati));
});

test("niente etichette sulla persona accanto alle ore", () => {
  const ETICHETTA = /\b(principiant[ei]|amator[ei]|allenat[oaie])\b/i;
  const ORE = /\b\d+([.,]\d+)?\s*(or[ae]|h|minuti)\b|\bmezz'ora\b|\bun'ora\b/i;
  const sbagliati = TUTTI.filter((t) => t.testo.split(/[.!?]\s/).some((frase) => ETICHETTA.test(frase) && ORE.test(frase)));
  assert.equal(sbagliati.length, 0, elenco(sbagliati));
});

test("niente etichette sulla persona, nemmeno senza le ore accanto", () => {
  // «chi è molto allenato» o «sei allenato» sono etichette, «quanto ti sei allenato» no.
  const PERSONA = "(molto |poco |ben )?(allenat[oaie]|principiant[ei]|amator[ei])\\b";
  const ETICHETTA = new RegExp(`\\bchi è ${PERSONA}|(?<!\\bti )\\bsei ${PERSONA}|\\bsei in forma\\b`, "i");
  assert.equal(ETICHETTA.test("succede a chi è molto allenato"), true, "l'espressione funziona");
  assert.equal(ETICHETTA.test("quanto ti sei allenato"), false);
  const sbagliati = TUTTI.filter((t) => ETICHETTA.test(t.testo));
  assert.equal(sbagliati.length, 0, elenco(sbagliati));
});

test("Guida, domande frequenti, Privacy e Impostazioni dicono quello che l'app fa", () => {
  const T = moduli["testi.js"];
  const guida = T.GUIDA.semaforo.paragrafi.join(" ");
  // il carico molto alto per tre mattine dà Rosso da solo (4.2, passo 8)
  assert.match(guida, /Il carico da solo arriva al massimo al giallo, salvo tre mattine di fila molto sopra il solito\./);
  const rosso = T.DOMANDE_FREQUENTI.find((f) => /rosso/.test(f.d)).r;
  assert.match(rosso, /tre mattine/);
  assert.match(rosso, /Con un dolore, un infortunio, «Sono a pezzi», la febbre o un sintomo di cuore niente bici\./);
  // i tetti sono tetti, il rosso resta possibile
  const giallo = T.GUIDA_LIVELLI.find((l) => l.livello === "giallo").testo;
  assert.match(giallo, /non va oltre il giallo/);
  assert.ok(!/E sempre nei giorni dopo/.test(giallo), giallo);
  const fatiche = T.GUIDA.sezioni.find((s) => /fatiche volute/.test(s.titolo)).paragrafi.join(" ");
  assert.match(fatiche, /per una settimana il semaforo non va oltre il giallo/);
  // l'energia in viaggio va su intervals.icu, il resto del viaggio resta sul telefono
  const righe = T.IMPOSTAZIONI.dati.righe(400);
  assert.ok(righe.some((r) => /energia/.test(r) && /intervals\.icu/.test(r)), righe.join(" "));
  assert.ok(righe.some((r) => /quanto ha pesato ogni voce/.test(r) && /stop/.test(r)), righe.join(" "));
  assert.ok(!righe.some((r) => /le domande in viaggio/.test(r)), righe.join(" "));
  const privacy = T.PRIVACY.sezioni.flatMap((s) => s.punti).map((p) => (typeof p === "string" ? p : `${p.chiave} ${p.intervals}`));
  const scrive = privacy.filter((p) => /Non scrive mai/.test(p));
  assert.equal(scrive.length, 1);
  assert.ok(!/le domande in viaggio/.test(scrive[0]), scrive[0]);
  assert.ok(privacy.some((p) => /In viaggio/.test(p) && /energia/.test(p)));
  assert.ok(privacy.some((p) => /quanto ha pesato ogni voce/.test(p)));
  // la pagina Collega parla delle quattro settimane della carta «Ancora pochi dati»
  assert.match(T.COLLEGA.attacco, /quattro settimane/);
  assert.match(T.LIVELLI.nessuno.consiglio, /quattro settimane/);
  assert.ok(!readFileSync(join(VISTE, "pagine.js"), "utf8").includes("diventa completo in due settimane"));
  const readme = readFileSync(join(RADICE, "README.md"), "utf8");
  assert.ok(!/le domande in viaggio, l'aritmia e la casella del ciclo non vanno nemmeno su intervals\.icu/.test(readme));
  assert.ok(readme.includes(`**Giallo, giornata tranquilla.** ${giallo}`), "il README riporta i livelli della Guida");
});

test("niente decimali nelle durate", () => {
  const sbagliati = TUTTI.filter((t) => /\b\d+[.,]\d+\s*(ore|ora|minuti|min|h)\b/i.test(t.testo));
  assert.equal(sbagliati.length, 0, elenco(sbagliati));
});

test("durate, ore in sella e orari scritti come in 7.1", () => {
  assert.equal(formatoDurata(45), "45 minuti");
  assert.equal(formatoDurata(80), "1 ora e 20");
  assert.equal(formatoDurata(210), "3 ore e mezza");
  assert.equal(formatoDurata(250), "4 ore e 10");
  assert.equal(formatoDurata(60), "1 ora");
  assert.equal(formatoDurata(118), "2 ore");
  assert.equal(formatoH(7.5), "7 ore e mezza");
  assert.equal(formatoH(8), "8 ore");
  assert.equal(formatoH(7.25), "7 ore e mezza", "la mezza esatta va in su");
  assert.equal(formatoH(1), "1 ora");
  assert.equal(formatoOra(8, 30), "8.30");
  assert.equal(formatoOra(18, 5), "18.05");
  assert.equal(formatoOra("2027-03-14T08:30:00"), "8.30");
  assert.equal(formatoOra(new Date(2027, 2, 14, 8, 30)), "8.30");
  for (const x of [formatoDurata(1234), formatoH(11.5), formatoOra(23, 59), dataLunga("2027-03-14")]) {
    assert.ok(!x.includes(":"), x);
    assert.ok(!/\d[.,]\d+\s*(ore|ora|minuti)/.test(x), x);
  }
});

test("ogni livello, e ogni tipo di seduta quando arriva, ha un titolo e un come", () => {
  let livelli = 0;
  for (const [file, modulo] of Object.entries(moduli)) {
    if (modulo.LIVELLI) {
      for (const [k, v] of Object.entries(modulo.LIVELLI)) {
        livelli += 1;
        assert.ok(typeof v.titolo === "string" && v.titolo.length > 0, `${file} LIVELLI.${k} senza titolo`);
        assert.ok(typeof v.consiglio === "string" && v.consiglio.length > 0, `${file} LIVELLI.${k} senza come`);
      }
    }
    if (modulo.SEDUTE) {
      for (const [k, v] of Object.entries(modulo.SEDUTE)) {
        const testo = (x) => (typeof x === "string" && x.length > 0) || typeof x === "function";
        assert.ok(testo(v.titolo), `${file} SEDUTE.${k} senza titolo`);
        assert.ok(testo(v.come), `${file} SEDUTE.${k} senza come`);
      }
    }
  }
  assert.ok(livelli >= 5, "i cinque livelli di 4.1");
});

test("i numeri di risposte scritti nei testi sono quelli veri", () => {
  // Il primo avvio arriva con il rilascio 3. Qui si controlla ogni «N risposte» scritto nei testi
  // contro i numeri di DOMANDE in js/parametri.js. Con il primo avvio va contato anche lo schema.
  const PAROLE_NUMERO = { due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12 };
  const veri = new Set([DOMANDE.mattino, DOMANDE.viaggio, DOMANDE.primoAvvio, DOMANDE.primoAvvioSenzaGiri, DOMANDE.soloSemaforo]);
  const sbagliati = [];
  for (const t of TUTTI) {
    for (const m of t.testo.matchAll(/\b(\d+|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici)\s+risposte\b/gi)) {
      const n = /\d/.test(m[1]) ? Number(m[1]) : PAROLE_NUMERO[m[1].toLowerCase()];
      if (!veri.has(n)) sbagliati.push({ ...t, testo: `${m[0]} in ${t.testo}` });
    }
  }
  assert.equal(sbagliati.length, 0, elenco(sbagliati));
  assert.equal(DOMANDE.mattino, 3);
});

test("la tabella del semaforo nel README è quella della Guida, e il README non ha i due punti", async () => {
  const { GUIDA_SEMAFORO, GUIDA_COLONNE } = moduli["testi.js"];
  const readme = readFileSync(join(RADICE, "README.md"), "utf8");
  assert.ok(readme.includes(`| ${GUIDA_COLONNE.voce} | ${GUIDA_COLONNE.verde} | ${GUIDA_COLONNE.giallo} | ${GUIDA_COLONNE.rosso} |`), "intestazione della tabella");
  for (const r of GUIDA_SEMAFORO) {
    assert.ok(readme.includes(`| ${r.voce} | ${r.verde} | ${r.giallo} | ${r.rosso} |`), `riga «${r.voce}»`);
  }
  // Fuori dai blocchi di codice, senza il codice in linea e senza gli indirizzi.
  let codice = false;
  const sbagliate = [];
  for (const riga of readme.split("\n")) {
    if (riga.trim().startsWith("```")) { codice = !codice; continue; }
    if (codice) continue;
    const prosa = riga.replace(/`[^`]*`/g, "").replace(/https?:\/\/\S+/g, "");
    if (prosa.includes(":")) sbagliate.push(riga);
  }
  assert.deepEqual(sbagliate, []);
});

test("il testo di index.html non ha i due punti", () => {
  const html = readFileSync(join(RADICE, "index.html"), "utf8")
    .replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
  const testo = html.replace(/<[^>]+>/g, "\n").split("\n").map((x) => x.trim()).filter(Boolean);
  assert.deepEqual(testo.filter((x) => x.includes(":")), []);
});

test("la lettura delle pagine trova le stringhe e lascia fuori il codice", () => {
  const prova = `
    // un commento con l'apostrofo e due punti: non conta
    const a = h("p", { class: "bottone bottone-secondario", id: "salva" }, "Salva le risposte");
    const b = \`\${nome}, buongiorno\`;
    const c = /["']/.test(x) ? "Sì" : "No";
    const d = f.querySelector(\`input[name="\${n}"]:checked\`);
    const e = secondi / 60 > 2 ? "Lunga" : 'Corta, "breve"';
    const g = (a / b) / 2; const k = "Fine";
  `;
  const trovate = stringheDelCodice(prova).filter(aSchermo);
  assert.deepEqual(trovate, ["Salva le risposte", "X, buongiorno", "Sì", "No", "Lunga", "Corta, \"breve\"", "Fine"]);
});
