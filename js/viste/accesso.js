// Le schermate della regia della pagina, quando l'ingresso non è ancora finito. Per ora una, quella di
// un account diverso da quello dei dati che stanno sul telefono (R21). Finché la persona non sceglie,
// i dati dell'altra non si mostrano, non si usano e le sue scritture non partono.

import { h } from "../dom.js?v=202611061254";
import { ATLETA_DIVERSO, ACCOUNT } from "../testi-app.js?v=202611061254";
import { intestazione } from "./comuni.js?v=202611061254";

// L'account di Come sto, in Impostazioni e nella pagina Collega. Senza account si chiede l'email, poi il
// codice che arriva per email. Con compatto, nella pagina Collega, chi è già entrato vede solo una riga.
export function moduloAccount(ctx, { compatto = false } = {}) {
  const A = ACCOUNT;
  const c = ctx.account;

  if (c.utente) {
    const righe = [
      h("p", {}, h("strong", {}, A.dentro(c.utente.email))),
      h("p", { class: "piccolo", id: "account-salvataggio", role: "status" }, A.salvataggio[c.salvataggio] || A.salvataggio.ok),
    ];
    if (compatto) return righe;
    return [
      ...righe,
      h("p", { class: "piccolo" }, A.cosa, " ", h("a", { href: "#privacy" }, A.privacy)),
      h("div", { class: "uscita" },
        h("button", { class: "bottone bottone-secondario", type: "button", id: "account-esci", on: { click: () => ctx.azioni.accountEsci() } }, A.esci),
        h("p", { class: "piccolo" }, A.esciAiuto)),
      h("div", { class: "uscita" },
        h("button", { class: "bottone bottone-secondario", type: "button", id: "account-cancella", on: { click: () => ctx.azioni.cancellaAccount() } }, A.cancella),
        h("p", { class: "piccolo" }, A.cancellaAiuto)),
    ];
  }

  const stato = h("p", { class: "stato-salvataggio", role: "status", "aria-live": "polite" }, c.nota || "");

  if (c.passo === "codice") {
    const campo = h("input", {
      type: "text", id: "account-codice", name: "codice", inputmode: "numeric", autocomplete: "one-time-code",
      maxlength: "10", required: true, "aria-describedby": "account-arrivato",
    });
    const entra = h("button", { class: "bottone", type: "submit", id: "account-entra" }, A.entra);
    const modulo = h("form", { class: "account-modulo", novalidate: true },
      h("p", { id: "account-arrivato" }, A.arrivato(c.email)),
      h("div", { class: "campo" }, h("label", { for: "account-codice" }, A.codice), campo),
      h("div", { class: "riga-bottoni" },
        entra,
        h("button", { class: "bottone bottone-secondario", type: "button", id: "account-altro-codice", on: { click: async () => {
          stato.textContent = A.mando;
          const errore = await ctx.azioni.accountEmail(c.email);
          if (errore) stato.textContent = errore;
        } } }, A.altroCodice),
        h("button", { class: "collegamento", type: "button", id: "account-cambia-email", on: { click: () => ctx.azioni.accountCambiaEmail() } }, A.cambiaEmail)),
      stato);
    modulo.addEventListener("submit", async (e) => {
      e.preventDefault();
      entra.disabled = true;
      stato.textContent = A.controllo;
      const errore = await ctx.azioni.accountCodice(campo.value);
      if (errore) {
        entra.disabled = false;
        stato.textContent = errore;
      }
    });
    return [modulo];
  }

  const campo = h("input", {
    type: "email", id: "account-email", name: "email", autocomplete: "email", inputmode: "email", autocapitalize: "off",
    spellcheck: "false", required: true, placeholder: A.emailSegnaposto, value: c.email || null,
  });
  const manda = h("button", { class: "bottone", type: "submit", id: "account-manda" }, A.manda);
  const modulo = h("form", { class: "account-modulo", novalidate: true },
    h("p", {}, A.attacco),
    h("p", { class: "piccolo" }, A.cosa, " ", h("a", { href: "#privacy" }, A.privacy)),
    h("div", { class: "campo" }, h("label", { for: "account-email" }, A.email), campo),
    h("div", { class: "riga-bottoni" }, manda),
    stato);
  modulo.addEventListener("submit", async (e) => {
    e.preventDefault();
    manda.disabled = true;
    stato.textContent = A.mando;
    const errore = await ctx.azioni.accountEmail(campo.value);
    if (errore) {
      manda.disabled = false;
      stato.textContent = errore;
    }
  });
  return [modulo];
}

export function vistaAtletaDiverso(ctx) {
  const A = ATLETA_DIVERSO;
  return h("div", { class: "vista vista-testo" },
    intestazione(A.occhiello, A.titolo, A.testo),
    h("section", { class: "carta passo" },
      h("p", {}, A.cancellaTesto),
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone", type: "button", id: "atleta-cancella", on: { click: () => ctx.azioni.atletaDiverso("cancella") } }, A.cancella))),
    h("section", { class: "carta passo" },
      h("p", {}, A.esciTesto),
      h("div", { class: "riga-bottoni" },
        h("button", { class: "bottone bottone-secondario", type: "button", id: "atleta-esci", on: { click: () => ctx.azioni.atletaDiverso("esci") } }, A.esci))));
}
