// Il modo di entrare salvato nel browser, cioè la chiave API incollata oppure l'accesso avuto con
// «Entra con intervals.icu». Funzioni pure, con le memorie passate da fuori, così si provano anche
// con più schede finte (test/oauth.test.mjs).
//
// Le regole.
// - Si tiene un solo modo di entrare alla volta. Salvarne uno toglie l'altro.
// - Con «Ricordami» sta in localStorage, che vedono tutte le schede. Senza, in sessionStorage,
//   che vede solo la scheda dove si è entrati.
// - All'avvio vince l'accesso di intervals.icu, poi la chiave, e localStorage prima di sessionStorage.
// - Una scheda usa sempre la credenziale che sceglierebbe ripartendo da capo. Quando un'altra scheda
//   cambia la memoria, la rilegge e si adegua, ma non ci scrive mai. Così nessuna scheda può far
//   uscire le altre a catena.
//
// Una credenziale è { tipo: "token", valore } oppure { tipo: "chiave", valore }, come creaClient.

export const CHIAVE = "comesto.chiave";
export const ACCESSO = "comesto.accesso";
const NOMI = { token: ACCESSO, chiave: CHIAVE };

// La memoria del browser può mancare o dare errore, per esempio in navigazione privata.
export function leggi(m, nome) {
  try { return m ? m.getItem(nome) : null; } catch { return null; }
}
export function scrivi(m, nome, valore) {
  try { if (m) m.setItem(nome, valore); } catch { /* memoria non disponibile, si va avanti senza */ }
}
export function togli(m, nome) {
  try { if (m) m.removeItem(nome); } catch { /* niente da togliere */ }
}

export function leggiCredenziale(locale, sessione) {
  for (const tipo of ["token", "chiave"]) {
    const valore = leggi(locale, NOMI[tipo]) || leggi(sessione, NOMI[tipo]);
    if (valore) return { tipo, valore };
  }
  return null;
}

export function stessaCredenziale(a, b) {
  if (!a || !b) return !a && !b;
  return a.tipo === b.tipo && a.valore === b.valore;
}

// Prima si scrive il nuovo e poi si toglie il resto, così le altre schede non trovano mai
// la memoria vuota a metà strada.
export function salvaCredenziale(locale, sessione, { tipo, valore }, ricorda) {
  const nome = NOMI[tipo];
  scrivi(ricorda ? locale : sessione, nome, valore);
  togli(ricorda ? sessione : locale, nome);
  const altro = tipo === "token" ? CHIAVE : ACCESSO;
  togli(locale, altro);
  togli(sessione, altro);
}

export function cancellaCredenziali(locale, sessione) {
  for (const nome of [ACCESSO, CHIAVE]) {
    togli(locale, nome);
    togli(sessione, nome);
  }
}

// Toglie una credenziale che non vale più, ma solo dove c'è ancora lei. Se nel frattempo un'altra
// scheda ne ha salvata una nuova, quella resta dov'è.
export function togliCredenziale(locale, sessione, { tipo, valore }) {
  const nome = NOMI[tipo];
  for (const m of [locale, sessione]) {
    if (leggi(m, nome) === valore) togli(m, nome);
  }
}

// Cosa fa una scheda che sta usando inUso quando un'altra scheda cambia la memoria.
//   { azione: "resta" }                 la credenziale salvata è ancora quella
//   { azione: "passa", credenziale }    un'altra scheda è entrata in un altro modo o con un'altra chiave
//   { azione: "esci" }                  non è rimasto niente, un'altra scheda è uscita
// Una scheda che non è entrata (inUso vuoto) non segue gli ingressi delle altre.
export function dopoUnCambio(inUso, locale, sessione) {
  if (!inUso) return { azione: "resta" };
  const salvata = leggiCredenziale(locale, sessione);
  if (stessaCredenziale(salvata, inUso)) return { azione: "resta" };
  return salvata ? { azione: "passa", credenziale: salvata } : { azione: "esci" };
}
