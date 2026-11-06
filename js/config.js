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

// Le scritture sulle attività di intervals.icu (6.6), cioè sforzo, borse, palestra e giri a mano. Restano
// spente finché non sono fatte a mano le prove dal vivo di 9.12 e finché il consenso non è il C0-2.0, che
// le comprende. Spente, le risposte restano sul telefono e nella copia, e la coda non parte mai. Le
// risposte del mattino su intervals.icu non c'entrano, vanno come nel rilascio 1.
export const SCRITTURE = Object.freeze({
  attivita: false,
});

// L'account di Come sto e il salvataggio online (js/nuvola.js, database in supabase/migrations). Con url
// null è tutto spento e la pagina è quella di prima. Indirizzo e chiave pubblicabile si possono leggere
// da tutti, come il resto della pagina, e non aprono niente da soli. A proteggere i dati sono le regole
// del database. La chiave segreta di Supabase non va MAI qui né altrove nella pagina o nel repository.
export const NUVOLA = Object.freeze({
  url: "https://phtnugayropnspnrzdwk.supabase.co",
  chiave: "sb_publishable_XrA3D809QS-Xg2c5H4CcBg_0YSJEknO",
});

export const NUVOLA_ATTIVA = Boolean(NUVOLA.url && NUVOLA.chiave);

// L'indirizzo a cui intervals.icu riporta chi ha dato il permesso. È l'origine più il percorso
// della pagina, senza query né hash, e deve essere identico a uno di quelli registrati
// nella pagina Manage App (intervals.icu non accetta asterischi).
export function indirizzoRitorno(luogo = globalThis.location) {
  return luogo.origin + luogo.pathname.replace(/\/index\.html$/, "/");
}
