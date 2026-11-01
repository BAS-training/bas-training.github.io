# Come sto

Ogni mattina un semaforo dice a chi va in bici come impostare la giornata. Legge i dati dell'orologio e del ciclocomputer da [intervals.icu](https://intervals.icu), aggiunge tre risposte veloci su come ti senti e spiega tutto in parole semplici. È l'app della Bike Adventure Series per arrivare pronti ai viaggi in bici di più giorni.

L'app si apre da **https://bas-training.github.io/** e senza account si può guardare l'esempio, con i dati inventati di una ciclista, da **https://bas-training.github.io/?esempio**

## Cosa fa

- **Oggi.** Una carta sola con il semaforo del mattino e il perché in una frase. Sotto, le tre domande del mattino, il tasto «Sto male», la riga «Ieri sera…» con le cause note, al massimo una carta in più, il «Perché» voce per voce con quanto fidarsi, e chiusi in fondo i sei numeri del giorno (HRV, battito a riposo, sonno, Freschezza, Fitness e carico recente). Con «Sono in viaggio» la mattina cambia, con le domande dei giorni di fila e tre promemoria.
- **Andamento.** Fitness, Fatica e Freschezza nel tempo, il lavoro di ogni giorno, le notti (HRV con il tuo normale, battito a riposo, ore di sonno).
- **Uscite.** Ore per settimana e tutti gli allenamenti degli ultimi due mesi.
- **Obiettivo.** Scegli la prossima avventura e la data, e vedi quanta Fitness serve, dove arrivi continuando così e di quanto salire ogni settimana. Con il rilascio 3 lascia il posto a «Pronto?».
- **Guida.** Il semaforo a punti, cosa vuol dire ogni numero, quando non fidarsi dei numeri.
- **Impostazioni**, dal piede della pagina. Età, dispositivo della notte, «Ho cambiato orologio», «Ho un'aritmia nota», la fascia cardio in bici, la casella dei giorni prima del ciclo, Esci ed «Esci e cancella tutto da questo dispositivo». Ogni voce dice dove sta il dato.

## Come funziona, in breve

- È una pagina statica pubblicata con GitHub Pages. **Non ha server e non ha database.**
- Chi la usa crea un account gratuito su intervals.icu, ci collega il proprio dispositivo (Garmin, Wahoo, Polar, Suunto, Coros, Oura, Whoop…) e incolla nella pagina la propria chiave API di intervals.icu. Quando sarà acceso «Entra con intervals.icu» (vedi sotto) basterà un pulsante, e la chiave resterà come alternativa.
- La pagina chiama le API pubbliche di intervals.icu direttamente dal browser (`/api/v1/athlete/0/...`, dove `0` vuol dire «il proprietario della chiave»). I dati non passano da nessun altro.
- Prima di entrare la persona conferma di avere almeno 18 anni e dà il consenso per i dati sulla salute, nel riquadro «Prima di entrare» della pagina Collega. Il consenso si salva sul telefono in `comesto.consenso`, con la versione del testo (`C0-1.0`) e la data. Senza il consenso non si entra con i propri dati e la pagina non legge niente da intervals.icu. Quando il testo cambia, chi è già dentro lo rivede una volta. L'esempio resta libero.
- La chiave resta solo nel browser di chi la usa (`localStorage` se sceglie «Ricordami», altrimenti `sessionStorage`). «Esci» la cancella insieme al consenso.
- Le risposte alle tre domande del mattino vengono scritte nel giorno di oggi su intervals.icu, nei campi standard `fatigue`, `soreness` e `injury` (scala 1-4, dove 1 è il meglio). È l'unica scrittura su intervals.icu, come prima. In viaggio la domanda sull'energia scrive lo stesso campo `fatigue`.
- Il resto resta sul telefono, nelle chiavi `comesto.` di `localStorage`, e ogni lettura e scrittura passa da `js/memoria.js`. Nel rilascio 1 le chiavi usate sono queste.

| Chiave | Cosa tiene | Quanto resta |
|---|---|---|
| `comesto.preferenze` | il periodo dei grafici e una riga del medico già mostrata | finché la persona esce e cancella tutto |
| `comesto.profilo.v1` | fascia d'età, dispositivo della notte, giorno del cambio di dispositivo, aritmia nota, fascia cardio, casella del ciclo | finché la persona esce e cancella tutto |
| `comesto.obiettivo.v1` | la sfida e la data della pagina Obiettivo, portate qui dalla migrazione | fino a 3 mesi dopo l'evento |
| `comesto.mattino.v1` | per ogni giorno «Sto male», la risposta «Il medico mi ha detto che posso riprendere», le cause di «Ieri sera…», la domanda di controllo e quella sulla pedalata, il sonno e «Qualcosa non va?» in viaggio, l'inizio e la fine di un viaggio | 400 giorni |
| `comesto.esiti.v1` | per ogni giorno il livello del semaforo, i punti delle voci, i tetti, lo stop e la modalità evento | 400 giorni |
| `comesto.consenso` | versione e data del testo del consenso | si cancella con Esci |

- All'avvio la memoria sposta in una chiave con `.guasto` in fondo quello che non si legge, porta sfida e data della pagina Obiettivo in `comesto.obiettivo.v1` e toglie le voci oltre i 400 giorni.
- «Esci e cancella tutto da questo dispositivo» toglie tutte le chiavi `comesto.`, credenziali comprese, da `localStorage` e da `sessionStorage`. Con «Entra con intervals.icu» toglie anche il permesso su intervals.icu, come Esci.
- Se la memoria del browser manca o è piena, le risposte restano nella pagina finché è aperta, e la pagina lo dice una volta.
- Nessun dato arriva ad AdventureLab. I sintomi di «Sto male», le cause, il sonno e «Qualcosa non va?» in viaggio, l'aritmia e la casella del ciclo non vanno nemmeno su intervals.icu.

## Il semaforo

È il semaforo a punti del capitolo 4 della specifica della preparazione. Ogni voce dà 0, 1 o 2 punti, e una voce da 2 punti è un segnale forte, che fa partire una domanda prima di decidere. Le regole stanno in `js/semaforo.js` e `js/modello.js`, i numeri in `js/parametri.js` (gruppo `SEMAFORO`), i testi in `js/testi.js`. A schermo i punti non si scrivono mai, ogni voce ha un pallino verde, giallo o grigio.

| Voce | Va bene | Pesa | Porta al rosso |
|---|---|---|---|
| HRV, la variabilità del battito | Nel tuo normale. Sopra il solito non è un premio, a volte arriva con la stanchezza. | Sotto il tuo normale stanotte, o nella media della settimana. Molto sotto, conta il doppio e il semaforo ti fa una domanda prima di decidere. | Mai da sola. Solo insieme ad altri segnali che vanno d'accordo, per esempio da tre mattine e con poca energia. |
| Battito a riposo | Fino a 2 battiti sopra il tuo normale. | 3 battiti sopra il tuo normale. Con 5, o con 3 per due notti, conta il doppio. | Con 7 battiti sopra e un sintomo del pannello «Sto male», oppure insieme ad altri segnali che vanno d'accordo. |
| Sonno | Almeno 6 ore, e non molto meno del tuo solito. | Meno di 6 ore, un'ora e mezza meno del tuo solito, o una settimana in media sotto le 6 ore e mezza. Meno di 5 ore, o due notti sotto le 6, conta il doppio. | Mai da solo. Solo insieme ad altri segnali che vanno d'accordo. |
| Carico recente | In linea con il tuo solito. | Oltre 1,3 volte il solito, con almeno 15 punti di differenza. Oltre 1,5 volte e 25 punti conta il doppio. | Molto alto per tre mattine di fila, fuori dai viaggi e dai giorni dopo le fatiche volute. |
| Energia | Tanta o normale. | Poca. | Sono a pezzi. Il semaforo diventa rosso comunque. |
| Gambe | Fresche o normali. | Un po' indolenzite. Molto doloranti conta il doppio, e il semaforo chiede se ti cambiano la pedalata. | Molto doloranti, con la pedalata che cambia o peggiora pedalando. |
| Acciacchi, oggi o ieri | Niente. | Un fastidio. Un dolore che non cambia la pedalata conta il doppio. | Un infortunio, o un dolore che cambia la pedalata. Senza risposta un dolore vale come rosso. |
| Sto male | Niente segnato. | Solo naso che cola o gola appena irritata. Il semaforo non va oltre il giallo. | Febbre, brividi, dolori in tutto il corpo, tosse con il petto chiuso, mal di pancia. Ogni sintomo di cuore, con l'invito dal medico, e il rosso resta finché il medico non ti dice che puoi riprendere. |

I livelli sono quattro, più «Ancora pochi dati» nelle prime settimane.

- **Verde, via libera.** Nessun segnale di stanchezza.
- **Giallo, senza esagerare.** Un segnale piccolo.
- **Giallo, giornata tranquilla.** Due segnali piccoli o uno che conta il doppio. Nei giorni dopo un weekend lungo, una prova, un'uscita grande o un viaggio, e quando riparti dopo la febbre, il semaforo non va oltre il giallo.
- **Rosso, oggi recupera.** Più segnali che vanno d'accordo, da più notti o con le tue risposte, o il carico molto più alto del solito per tre mattine di fila. E sempre con un dolore, un infortunio, la febbre, un sintomo di cuore o quando dici di essere a pezzi. Una notte storta da sola non dà mai rosso.

La decisione segue l'ordine di 4.2.

1. **Gli stop** vengono prima di tutto e danno Rosso. Un sintomo di cuore o un avviso di ritmo irregolare, con l'invito a sentire il medico oggi, un sintomo di malattia, il battito a riposo almeno 7 sopra la mediana con un sintomo qualsiasi, «Sono a pezzi», un infortunio, un dolore senza il no alla domanda sulla pedalata.
2. **I soli sintomi sopra il collo** portano almeno al Giallo, con al massimo un'ora facile.
3. **In modalità evento** HRV, battito e carico non danno punti. Decidono il sonno vero (l'orologio meno 45 minuti), il gonfiore, mani, sedere e collo, lo stomaco e l'energia, e sotto la carta ci sono sempre tre promemoria.
4. **Le caselle di «Ieri sera…»** danno al massimo 1 punto a HRV, battito e sonno, e la notte esce dal normale.
5. **I punti** si sommano. Il Rosso arriva solo con la concordanza (un punto dalle risposte o dal carico, una voce che aveva punti anche ieri, o una regola che guarda già più notti e resta vera anche senza la notte di oggi) e almeno 4 punti, due segnali forti o un segnale forte con poca energia, oppure con il carico molto alto da 3 mattine fuori dai viaggi e dai giorni di guardia. Altrimenti 0 punti Verde, 1 Giallo leggero, da 2 Giallo.
6. **Le sensazioni ottime** migliorano di un gradino solo se tutti i punti vengono dalla notte, e mai con un segnale forte.
7. **I tetti** vincono sempre. Giallo nei giorni di guardia, cioè 2 giorni dopo un weekend lungo, una prova o un'uscita grande, 3 dopo un blocco, 7, 10 o 14 dopo un viaggio di 2-5, 6-10 o più giorni. Giallo nei 4 giorni di rientro dopo una malattia, 7 se è durata più di una settimana. Negli ultimi 7 giorni prima della partenza il Giallo leggero vale come Giallo.

Altre regole del rilascio 1.

- **Il normale.** L'HRV si confronta sul logaritmo, con la mediana e 1,4826 volte la deviazione mediana assoluta delle notti valide fra 60 notti fa e ieri, mai sotto 0,08 (0,06 con anelli e fasce). Vota da 14 notti, al massimo con 1 punto, ed è piena da 28. Il battito usa la FC media del sonno (`avgSleepingHR`) se c'è in almeno metà delle ultime 30 notti, altrimenti il battito a riposo, ed è provvisorio da 7 notti e pieno da 14. Una notte vale con almeno 4 ore di sonno, o con l'HRV senza il sonno.
- **Le esclusioni.** Le notti con una casella delle cause, con «Sto male», della malattia, dei viaggi, delle 72 ore dopo una fatica voluta e di prima di un cambio di dispositivo non entrano nel normale.
- **Il carico** guarda Fitness e Fatica di ieri sera, così un giro fatto stamattina non cambia il consiglio del mattino. Con la Fitness sotto 5 non vota, da 50 anni usa una Fatica lenta a 10 giorni.
- **La domanda di controllo.** Con un segnale forte, e con battito alto e HRV bassa da due notti, prima del livello compare «Prima di decidere, una domanda», con «No, niente», «Sì» e «C'è un motivo». Con «Molto doloranti» o «Un dolore» compare subito «Ti cambia la pedalata o peggiora pedalando?».
- **La malattia.** Dopo uno stop per malattia lo stop resta finché la persona non segna «Non ho più febbre da 24 ore, senza farmaci per la febbre», al massimo 14 giorni dall'ultimo sintomo. Da lì parte il rientro. Se la risposta non arriva, dopo i 14 giorni la malattia si chiude come lunga, perché la sua durata non si conosce.
- **Il medico prima di riprendere.** Dopo una malattia di più di 7 giorni, o con la febbre e il petto chiuso, il consiglio è riposo o una camminata, mai un giro, finché la persona non segna «Il medico mi ha detto che posso riprendere», e i 7 giorni del rientro contano da lì.
- **Il cuore.** Un sintomo di cuore, compreso l'avviso di ritmo irregolare dell'orologio, dà Rosso quel giorno e anche nei giorni dopo, con l'invito dal medico, finché la persona non segna «Il medico mi ha detto che posso riprendere». Il testo dello stop compare anche nel pannello, sotto la casella spuntata.
- **La modalità evento** si accende con «Sono in viaggio», con «Sì, parto» il giorno della data dell'Obiettivo, oppure con la proposta che compare da sola dopo 2 giorni di fila con almeno 4 ore di bici, o metà delle ore al giorno dell'Obiettivo, fuori dai viaggi già segnati. Finisce con «Sono arrivato», dopo i giorni previsti più uno, oppure dopo 2 giorni di fila senza nessuna attività. Con la sfida «Due settimane e oltre» i giorni previsti non ci sono, e la modalità resta accesa fino all'arrivo.
- **I giorni di guardia dopo un viaggio** si contano dal viaggio del diario, dal primo all'ultimo giorno, anche se l'app è rimasta chiusa qualche giorno.
- **Quanto fidarsi.** Alto, medio o basso, il più basso fra carico e notte. Si legge sotto «Perché», e accanto al colore solo quando è basso.
- **Al massimo una carta in più** per apertura. Nel rilascio 1 sono «Oggi parti?», la proposta del viaggio e «Hai cambiato orologio o anello?».

La Freschezza (su intervals.icu si chiama Form) è la Fitness meno la Fatica, in percentuale della Fitness, con le fasce di intervals.icu più due fasce per il carico alto (da −30% a −50% e oltre −50%).

Se cambia una soglia va cambiata in `js/parametri.js`, nella Guida (`GUIDA_SEMAFORO` in `js/testi.js`) e in questa tabella, che la prova `test/testi.test.mjs` confronta con la Guida.

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

- Prima di partire la pagina salva in `sessionStorage` un codice casuale (verifier), lo state, l'ora e la scelta «Ricordami», e a intervals.icu manda solo l'impronta SHA-256 del verifier. Il consenso del riquadro «Prima di entrare» si salva prima di partire, perché le spunte non sopravvivono al giro su intervals.icu.
- Al ritorno toglie subito il codice dall'indirizzo, controlla lo state, scambia il codice con l'accesso (POST a `https://intervals.icu/api/oauth/token`, il codice vale due minuti) e cancella verifier e state.
- Un ritorno vale solo se in quella scheda c'è la richiesta partita da lì. Senza, l'indirizzo è un link di altri o una pagina vecchia ritrovata col tasto del browser. Chi è già dentro resta dentro, chi non lo è legge che la richiesta non si ritrova. Il rifiuto arriva senza state, quindi si accetta uno state assente ma non uno diverso.
- L'accesso si salva come la chiave, in `localStorage` con «Ricordami», altrimenti in `sessionStorage`. Le API si chiamano con `Authorization: Bearer` e l'atleta `0` vale anche così.
- Si tiene un solo modo di entrare alla volta, e le schede aperte seguono quello salvato (`js/credenziali.js`). Se una scheda entra in un altro modo, le altre passano a quello senza uscire. Se una esce, escono tutte.
- intervals.icu non usa refresh token e non dà una scadenza. Se risponde 401 l'app dice che l'accesso è scaduto o è stato tolto e chiede di entrare di nuovo. «Esci» lo cancella e lo toglie anche su intervals.icu con `DELETE /api/v1/disconnect-app`. Se la revoca non riesce, per esempio senza rete, la pagina lo dice e spiega che il permesso si toglie dalle impostazioni di intervals.icu.
- Lo scambio del codice deve restare una richiesta «semplice», con le sole intestazioni `Accept` e `Content-Type` da modulo. L'indirizzo del token risponde al browser, ma non alla domanda preventiva (OPTIONS) che partirebbe con intestazioni in più.

Le regole di intervals.icu stanno nella guida ufficiale, https://forum.intervals.icu/t/intervals-icu-oauth-support/2759

## Obiettivo

La Fitness segue la formula di intervals.icu (media esponenziale del carico su 42 giorni). Il calcolo tiene conto delle ultime due settimane di scarico al 55% del carico, dice di quanti punti a settimana deve salire la Fitness e quanto carico fare la settimana dopo. Le ore si stimano dai punti per ora dei giri della persona (la mediana), oppure 40 punti l'ora se i giri sono pochi. Le soglie di ogni avventura sono stime dall'esperienza, non dati di studi, e la pagina lo dice.

Dal rilascio 1 sfida e data non stanno più in `comesto.preferenze` ma in `comesto.obiettivo.v1`, come obiettivo libero. La pagina le legge ancora con i nomi di prima, e la data dà al semaforo i giorni alla partenza.

## Struttura

```
index.html                 la pagina, con la Content Security Policy
css/app.css                tutto lo stile, tema chiaro e scuro
js/app.js                  regia (stato, pagine, memoria, consenso, collegamento a intervals.icu)
js/api.js                  chiamate a intervals.icu, con la chiave o con l'accesso OAuth
js/config.js               configurazione di «Entra con intervals.icu», spento finché clientId è null
js/oauth.js                «Entra con intervals.icu», OAuth con PKCE senza segreto (funzioni pure, testate)
js/credenziali.js          chiave e accesso salvati, e come le schede aperte li seguono (puro, testato)
js/memoria.js              le chiavi comesto. sul telefono, migrazione, pulizia e copia (puro, testato)
js/parametri.js            tutti i numeri delle regole, con la loro fonte (testato)
js/modello.js              dai dati grezzi ai numeri, basi a mediana e notte valida (puro, testato)
js/semaforo.js             il semaforo a punti (puro, testato)
js/formato.js              numeri, durate in parole, ore in sella, orari con il punto e date
js/grafici.js              grafici SVG fatti a mano, con tooltip e tabella dei numeri
js/testi.js                tutti i testi in parole semplici, Guida e Privacy comprese
js/demo.js                 sei mesi di dati inventati per l'esempio
js/viste/                  le pagine, e Impostazioni in js/viste/impostazioni.js
test/                      prove automatiche
dev/server.py              server di sviluppo con ponte verso intervals.icu
strumenti/versione.py      numero di versione su tutti i file, prima di pubblicare
```

Nessuna libreria esterna e nessuna risorsa da altri siti. La pagina carica solo file suoi e parla solo con intervals.icu. È una scelta di sicurezza, perché nel browser c'è la chiave di chi la usa.

## Sviluppo

Per lanciare le prove automatiche, un file alla volta, perché con la cartella come argomento Node 22.12 non le lancia

```
node --test test/semaforo.test.mjs
node --test test/memoria.test.mjs
node --test test/parametri.test.mjs
node --test test/testi.test.mjs
node --test test/oauth.test.mjs
```

`test/testi.test.mjs` controlla la scrittura di tutti i testi (capitolo 7.1 e prova 9.8). Niente due punti, niente parole vietate, niente sigle, durate in parole, orari con il punto. Trova da sola i file `js/testi*.js` e `js/palestra.js` quando arrivano.

Per provare la pagina con i propri dati, senza incollare la chiave nel browser

```
python dev/server.py 8801 PERCORSO/AL/FILE_CHIAVE.json
```

poi aprire `http://localhost:8801/?dev=ponte`. Il file della chiave contiene `{"api_key": "..."}`, sta fuori dalla cartella del progetto e **non va mai nel repository** (vedi `.gitignore`). Il ponte risponde solo alla pagina stessa su localhost. Anche con il ponte la pagina chiede il riquadro «Prima di entrare».

Prima di pubblicare una modifica

```
python strumenti/versione.py
```

mette lo stesso numero di versione su tutti i file, così un telefono non mescola file vecchi e nuovi mentre GitHub Pages aggiorna.

Le modifiche si fanno su un branch e arrivano su `main` dopo la revisione, perché `main` è quello che vedono gli utenti.

## Prossimi passi

La specifica della preparazione arriva in sei rilasci, uno per branch, con revisione prima di `main`.

1. **Il semaforo a punti**, questo. Nessun permesso nuovo e nessuna scrittura nuova su intervals.icu.
2. **Dati, carico e scritture.** La serie di carico di Come sto, le carte di sforzo, borse e uscite da Strava, «Aggiungi un giro», la copia di sicurezza, il permesso delle attività in scrittura e la versione nuova del consenso.
3. **Evento e verdetto.** Il catalogo dei percorsi, le ore stimate, «Pronto?» al posto di Obiettivo, il primo avvio e il link per gli iscritti.
4. **Piano e Oggi.** Il piano della settimana con bici e palestra, la seduta di oggi sulla carta e la domenica.
5. **Palestra.** Le nove schede.
6. **Guida, esempio e collaudo.**

Restano anche questi.

- **Entra con intervals.icu.** Il codice è pronto e spento, aspetta che intervals.icu approvi l'app. Come accenderlo è spiegato nella sezione «Entra con intervals.icu».
- **Un indirizzo tutto suo, sempre.** Il browser tiene una memoria sola per ogni indirizzo, e tutte le pagine pubblicate con GitHub Pages da una stessa organizzazione hanno lo stesso indirizzo. Per questo l'app sta da sola nell'organizzazione `BAS-training`, così la chiave salvata la può leggere solo lei. In questa organizzazione non va pubblicato nessun altro sito con GitHub Pages. Se un giorno l'app avrà un dominio suo, si collega a questo stesso repository e il vecchio indirizzo porta da solo al nuovo.
- **Dati Garmin.** intervals.icu ha annunciato che potrebbe limitare l'accesso via API ai dati che arrivano da Garmin. Se succede, per chi usa Garmin il semaforo si regge su allenamento, sonno e domande del mattino finché non c'è un'alternativa ufficiale.

## Avvertenza

Come sto dà consigli di allenamento basati su numeri. Non è un dispositivo medico e non fa diagnosi.
