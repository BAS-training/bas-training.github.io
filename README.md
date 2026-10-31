# Come sto

Ogni mattina un semaforo dice a chi va in bici se oggi può spingere o se è meglio andare piano. Legge i dati dell'orologio e del ciclocomputer da [intervals.icu](https://intervals.icu) e li spiega in parole semplici.

L'app si apre da **https://bas-training.github.io/** e senza account si può guardare l'esempio, con i dati inventati di una ciclista, da **https://bas-training.github.io/?esempio**

## Cosa fa

- **Oggi.** Il semaforo del mattino (verde, giallo, rosso) con il perché, tre domande veloci su come ti senti, e sei numeri spiegati, cioè HRV, battito a riposo, sonno, Freschezza, Fitness e carico recente.
- **Andamento.** Fitness, Fatica e Freschezza nel tempo, il lavoro di ogni giorno, le notti (HRV con il tuo normale, battito a riposo, ore di sonno).
- **Uscite.** Ore per settimana e tutti gli allenamenti degli ultimi due mesi.
- **Obiettivo.** Scegli la prossima avventura e la data, e vedi quanta Fitness serve, dove arrivi continuando così e di quanto salire ogni settimana.
- **Guida.** Come nasce il semaforo, cosa vuol dire ogni numero, quando non fidarsi dei numeri.

## Come funziona, in breve

- È una pagina statica pubblicata con GitHub Pages. **Non ha server e non ha database.**
- Chi la usa crea un account gratuito su intervals.icu, ci collega il proprio dispositivo (Garmin, Wahoo, Polar, Suunto, Coros, Oura, Whoop…) e incolla nella pagina la propria chiave API di intervals.icu. Quando sarà acceso «Entra con intervals.icu» (vedi sotto) basterà un pulsante, e la chiave resterà come alternativa.
- La pagina chiama le API pubbliche di intervals.icu direttamente dal browser (`/api/v1/athlete/0/...`, dove `0` vuol dire «il proprietario della chiave»). I dati non passano da nessun altro.
- La chiave resta solo nel browser di chi la usa (`localStorage` se sceglie «Ricordami», altrimenti `sessionStorage`). «Esci» la cancella.
- Le risposte alle domande del mattino vengono scritte nel giorno di oggi su intervals.icu, nei campi standard `fatigue`, `soreness` e `injury` (scala 1-4, dove 1 è il meglio).

## Il semaforo

Ogni voce dà verde, giallo o rosso. Le voci senza dati non votano. Il carico si guarda com'era ieri sera, così un giro fatto stamattina non cambia il consiglio del mattino.

| Voce | Giallo | Rosso |
|---|---|---|
| HRV della notte | sotto il normale personale (media dei logaritmi delle ultime 60 notti, meno una deviazione standard), oppure media delle ultime 7 notti sotto metà deviazione | molto sotto (meno 1,5 deviazioni), oppure sotto il normale con la media della settimana bassa |
| Battito a riposo | 3-4 battiti sopra la mediana delle ultime 30 notti | 5 o più |
| Sonno | meno di 6 ore, punteggio sotto 60, oppure media della settimana sotto 6h30 | meno di 5 ore o punteggio sotto 50 |
| Carico recente | Fatica/Fitness di ieri sera oltre 1,3 e almeno 15 punti di differenza | oltre 1,5 e almeno 25 punti di differenza |
| Acciacchi (oggi o ieri) | un fastidio | un dolore o un infortunio |
| Come ti senti | poca energia o gambe un po' indolenzite | a pezzi o gambe molto doloranti |

L'esito. Un giallo dà «senza esagerare». Due gialli o un rosso danno «giornata tranquilla». Due rossi, o un rosso e un giallo, danno «oggi recupera». Un dolore, un infortunio, «a pezzi» e gambe molto doloranti danno sempre «oggi recupera», qualunque cosa dicano gli altri numeri. Con la Fitness sotto 5 il carico non vota, e senza dati della notte decidono allenamento e risposte del mattino.

La Freschezza (su intervals.icu si chiama Form) è la Fitness meno la Fatica, in percentuale della Fitness, con le fasce di intervals.icu più due fasce per il carico alto (da −30% a −50% e oltre −50%).

Le regole stanno in `js/semaforo.js` e sono spiegate anche nella Guida dell'app. Se cambia una soglia, va cambiata anche in `js/testi.js` e in questa tabella.

## Entra con intervals.icu

Al posto della chiave da copiare, chi usa l'app preme «Entra con intervals.icu», dà il permesso su intervals.icu e torna qui già dentro. È OAuth con PKCE, il modo pensato per le pagine senza server. Il segreto dell'app (client secret) non serve e **non deve mai stare nella pagina né nel repository**.

Il codice c'è ma è **spento** finché in `js/config.js` il `clientId` vale `null`. Spento, tutte le pagine sono identiche a prima.

Per accenderlo, dopo che intervals.icu ha approvato la domanda.

1. Su https://intervals.icu/settings/apps premere **Manage App** accanto all'app.
2. Segnare l'app come **client pubblico** (public client), altrimenti intervals.icu chiede il segreto e lo scambio fallisce. Quando tutto funziona, spuntare anche **Require PKCE**.
3. Come indirizzo di ritorno registrare solo `https://bas-training.github.io/`, scritto esatto perché intervals.icu non accetta asterischi.
4. Copiare il client_id, che è un numero, in `js/config.js` al posto di `null`, su un branch.
5. Provare sul proprio computer. Per questo serve anche l'indirizzo di ritorno `http://localhost/`, da aggiungere **solo per il tempo delle prove**. Per localhost intervals.icu non guarda la porta (vale anche per `http://localhost:8801/`), quindi se restasse registrato qualsiasi programma sul computer di chi usa l'app, in ascolto su una porta qualsiasi, potrebbe farsi dare un accesso a nome di Come sto, senza nessun segreto.
6. Fare le prove dal vivo che senza l'app approvata non si possono fare, e correggere i testi se va diversamente.
   - Il giro completo su un iPhone vero partendo dall'icona della schermata Home, e su Android dall'app installata. Se su iPhone il ritorno da intervals.icu finisce in Safari, la pagina dice di incollare la chiave, ma nell'icona (`navigator.standalone` vero) conviene mostrare la chiave come via principale.
   - Esci con due dispositivi entrati tutti e due con il pulsante. La domanda di Esci, la Guida e la Privacy dicono che si esce anche dall'altro, perché `DELETE /api/v1/disconnect-app` «scollega l'atleta dall'app». Se l'altro resta dentro, vanno cambiate.
   - Le risposte vere di `/api/oauth/token` per un codice già usato e per uno vecchio di più di due minuti, da mettere in `test/oauth.test.mjs` come quelle per 404 e 422. Oggi un errore che nomina «client» o «secret» viene preso per un errore di configurazione.
7. Togliere `http://localhost/` dagli indirizzi di ritorno.
8. Lanciare le prove, poi `python strumenti/versione.py`, e pubblicare come sempre.

L'app chiede solo i permessi che le servono, `ACTIVITY:READ,WELLNESS:WRITE,SETTINGS:READ`.

- `ACTIVITY:READ` per le uscite.
- `WELLNESS:WRITE` per le notti e per scrivere le risposte del mattino (WRITE comprende READ).
- `SETTINGS:READ` per nome e fuso orario, perché senza `/api/v1/athlete/0` risponde 403.

Sulla pagina del permesso si possono spegnere delle voci. Se ne manca una, l'app non entra e chiede di riprovare lasciandole accese.

Come funziona.

- Prima di partire la pagina salva in `sessionStorage` un codice casuale (verifier), lo state, l'ora e la scelta «Ricordami», e a intervals.icu manda solo l'impronta SHA-256 del verifier.
- Al ritorno toglie subito il codice dall'indirizzo, controlla lo state, scambia il codice con l'accesso (POST a `https://intervals.icu/api/oauth/token`, il codice vale due minuti) e cancella verifier e state.
- Un ritorno vale solo se in quella scheda c'è la richiesta partita da lì. Senza, l'indirizzo è un link di altri o una pagina vecchia ritrovata col tasto indietro. Chi è già dentro resta dentro, chi non lo è legge che la richiesta non si ritrova. Il rifiuto arriva senza state, quindi si accetta uno state assente ma non uno diverso.
- L'accesso si salva come la chiave, in `localStorage` con «Ricordami», altrimenti in `sessionStorage`. Le API si chiamano con `Authorization: Bearer` e l'atleta `0` vale anche così.
- Si tiene un solo modo di entrare alla volta, e le schede aperte seguono quello salvato (`js/credenziali.js`). Se una scheda entra in un altro modo, le altre passano a quello senza uscire. Se una esce, escono tutte.
- intervals.icu non usa refresh token e non dà una scadenza. Se risponde 401 l'app dice che l'accesso è scaduto o è stato tolto e chiede di entrare di nuovo. «Esci» lo cancella e lo toglie anche su intervals.icu con `DELETE /api/v1/disconnect-app`. Se la revoca non riesce, per esempio senza rete, la pagina lo dice e spiega che il permesso si toglie dalle impostazioni di intervals.icu.
- Lo scambio del codice deve restare una richiesta «semplice», con le sole intestazioni `Accept` e `Content-Type` da modulo. L'indirizzo del token risponde al browser, ma non alla domanda preventiva (OPTIONS) che partirebbe con intestazioni in più.

Le regole di intervals.icu stanno nella guida ufficiale, https://forum.intervals.icu/t/intervals-icu-oauth-support/2759

## Obiettivo

La Fitness segue la formula di intervals.icu (media esponenziale del carico su 42 giorni). Il calcolo tiene conto delle ultime due settimane di scarico al 55% del carico, dice di quanti punti a settimana deve salire la Fitness e quanto carico fare la settimana dopo. Le ore si stimano dai punti per ora dei giri della persona (la mediana), oppure 40 punti l'ora se i giri sono pochi. Le soglie di ogni avventura sono stime dall'esperienza, non dati di studi, e la pagina lo dice.

## Struttura

```
index.html            la pagina, con la Content Security Policy
css/app.css           tutto lo stile, tema chiaro e scuro
js/app.js             regia (stato, pagine, collegamento a intervals.icu)
js/api.js             chiamate a intervals.icu, con la chiave o con l'accesso OAuth
js/config.js          configurazione di «Entra con intervals.icu», spento finché clientId è null
js/oauth.js           «Entra con intervals.icu», OAuth con PKCE senza segreto (funzioni pure, testate)
js/credenziali.js     chiave e accesso salvati, e come le schede aperte li seguono (puro, testato)
js/modello.js         dai dati grezzi ai numeri (calcoli puri, testati)
js/semaforo.js        le regole del semaforo (pure, testate)
js/grafici.js         grafici SVG fatti a mano, con tooltip e tabella dei numeri
js/testi.js           tutte le spiegazioni in parole semplici
js/demo.js            sei mesi di dati inventati per l'esempio
js/viste/             le pagine
test/                 prove automatiche
dev/server.py         server di sviluppo con ponte verso intervals.icu
strumenti/versione.py numero di versione su tutti i file, prima di pubblicare
```

Nessuna libreria esterna e nessuna risorsa da altri siti. La pagina carica solo file suoi e parla solo con intervals.icu. È una scelta di sicurezza, perché nel browser c'è la chiave di chi la usa.

## Sviluppo

Per lanciare le prove automatiche

```
node --test test/semaforo.test.mjs
node --test test/oauth.test.mjs
```

Per provare la pagina con i propri dati, senza incollare la chiave nel browser

```
python dev/server.py 8801 PERCORSO/AL/FILE_CHIAVE.json
```

poi aprire `http://localhost:8801/?dev=ponte`. Il file della chiave contiene `{"api_key": "..."}`, sta fuori dalla cartella del progetto e **non va mai nel repository** (vedi `.gitignore`). Il ponte risponde solo alla pagina stessa su localhost.

Prima di pubblicare una modifica

```
python strumenti/versione.py
```

mette lo stesso numero di versione su tutti i file, così un telefono non mescola file vecchi e nuovi mentre GitHub Pages aggiorna.

Le modifiche si fanno su un branch e arrivano su `main` dopo la revisione, perché `main` è quello che vedono gli utenti.

## Prossimi passi

- **Entra con intervals.icu.** Il codice è pronto e spento, aspetta che intervals.icu approvi l'app. Come accenderlo è spiegato nella sezione «Entra con intervals.icu».
- **Un indirizzo tutto suo, sempre.** Il browser tiene una memoria sola per ogni indirizzo, e tutte le pagine pubblicate con GitHub Pages da una stessa organizzazione hanno lo stesso indirizzo. Per questo l'app sta da sola nell'organizzazione `BAS-training`, così la chiave salvata la può leggere solo lei. In questa organizzazione non va pubblicato nessun altro sito con GitHub Pages. Se un giorno l'app avrà un dominio suo, si collega a questo stesso repository e il vecchio indirizzo porta da solo al nuovo.
- **Dati Garmin.** intervals.icu ha annunciato che potrebbe limitare l'accesso via API ai dati che arrivano da Garmin. Se succede, per chi usa Garmin il semaforo si regge su allenamento, sonno e domande del mattino finché non c'è un'alternativa ufficiale.

## Avvertenza

Come sto dà consigli di allenamento basati su numeri. Non è un dispositivo medico e non fa diagnosi.
