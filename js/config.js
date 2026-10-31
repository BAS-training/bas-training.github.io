// La configurazione di «Entra con intervals.icu» (OAuth con PKCE, senza segreto nel browser).
// Finché clientId è null l'accesso con intervals.icu resta spento e la pagina Collega mostra
// solo la chiave da incollare, come prima. Si accende quando intervals.icu approva l'app,
// scrivendo qui il client_id che si legge nella pagina Manage App (vedi il README).
// Per intervals.icu il client_id è un numero, per esempio  clientId: "1234"  oppure  clientId: 1234
// Il client_id non è un segreto, lo vede chiunque guardi l'indirizzo di intervals.icu.
// Il client secret invece non va MAI qui né altrove nella pagina o nel repository.

export const OAUTH = Object.freeze({
  clientId: null,

  // Gli indirizzi sono quelli della guida ufficiale di intervals.icu
  // https://forum.intervals.icu/t/intervals-icu-oauth-support/2759
  autorizza: "https://intervals.icu/oauth/authorize",
  token: "https://intervals.icu/api/oauth/token",
  revoca: "https://intervals.icu/api/v1/disconnect-app",

  // I permessi minimi, separati da virgole come vuole intervals.icu. WRITE comprende READ.
  //   ACTIVITY:READ   le uscite
  //   WELLNESS:WRITE  le notti, e le risposte del mattino scritte nel giorno di oggi
  //   SETTINGS:READ   nome e fuso orario da /api/v1/athlete/0, che senza risponde 403
  scope: "ACTIVITY:READ,WELLNESS:WRITE,SETTINGS:READ",
});

export const OAUTH_ATTIVO = OAUTH.clientId !== null && OAUTH.clientId !== undefined && String(OAUTH.clientId).trim() !== "";

// L'indirizzo a cui intervals.icu riporta chi ha dato il permesso. È l'origine più il percorso
// della pagina, senza query né hash, e deve essere identico a uno di quelli registrati
// nella pagina Manage App (intervals.icu non accetta asterischi).
export function indirizzoRitorno(luogo = globalThis.location) {
  return luogo.origin + luogo.pathname.replace(/\/index\.html$/, "/");
}
