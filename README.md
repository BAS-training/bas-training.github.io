# Come sto

Ogni mattina un semaforo dice a chi va in bici se oggi può spingere o se è meglio andare piano. Legge i dati dell'orologio e del ciclocomputer da [intervals.icu](https://intervals.icu) e li spiega in parole semplici.

L'app si apre da **https://advlabbik.github.io/come-sto/** e senza account si può guardare l'esempio, con i dati inventati di una ciclista, da **https://advlabbik.github.io/come-sto/?esempio**

## Cosa fa

- **Oggi.** Il semaforo del mattino (verde, giallo, rosso) con il perché, tre domande veloci su come ti senti, e sei numeri spiegati, cioè HRV, battito a riposo, sonno, Freschezza, Fitness e carico recente.
- **Andamento.** Fitness, Fatica e Freschezza nel tempo, il lavoro di ogni giorno, le notti (HRV con il tuo normale, battito a riposo, ore di sonno).
- **Uscite.** Ore per settimana e tutti gli allenamenti degli ultimi due mesi.
- **Obiettivo.** Scegli la prossima avventura e la data, e vedi quanta Fitness serve, dove arrivi continuando così e di quanto salire ogni settimana.
- **Guida.** Come nasce il semaforo, cosa vuol dire ogni numero, quando non fidarsi dei numeri.

## Come funziona, in breve

- È una pagina statica pubblicata con GitHub Pages. **Non ha server e non ha database.**
- Chi la usa crea un account gratuito su intervals.icu, ci collega il proprio dispositivo (Garmin, Wahoo, Polar, Suunto, Coros, Oura, Whoop…) e incolla nella pagina la propria chiave API di intervals.icu.
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

## Obiettivo

La Fitness segue la formula di intervals.icu (media esponenziale del carico su 42 giorni). Il calcolo tiene conto delle ultime due settimane di scarico al 55% del carico, dice di quanti punti a settimana deve salire la Fitness e quanto carico fare la settimana dopo. Le ore si stimano dai punti per ora dei giri della persona (la mediana), oppure 40 punti l'ora se i giri sono pochi. Le soglie di ogni avventura sono stime dall'esperienza, non dati di studi, e la pagina lo dice.

## Struttura

```
index.html            la pagina, con la Content Security Policy
css/app.css           tutto lo stile, tema chiaro e scuro
js/app.js             regia (stato, pagine, collegamento a intervals.icu)
js/api.js             chiamate a intervals.icu
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

- **Entra con intervals.icu.** intervals.icu permette alle app di farsi autorizzare con OAuth anche senza server (PKCE). Quando l'app sarà registrata e approvata, al posto della chiave da copiare ci sarà un pulsante.
- **Un indirizzo tutto suo.** Su `advlabbik.github.io` tutte le pagine dell'organizzazione condividono la stessa memoria del browser. Prima di farla usare a molte persone l'app va spostata su un sottodominio dedicato (un CNAME verso GitHub Pages), così la chiave salvata la può leggere solo lei.
- **Dati Garmin.** intervals.icu ha annunciato che potrebbe limitare l'accesso via API ai dati che arrivano da Garmin. Se succede, per chi usa Garmin il semaforo si regge su allenamento, sonno e domande del mattino finché non c'è un'alternativa ufficiale.

## Avvertenza

Come sto dà consigli di allenamento basati su numeri. Non è un dispositivo medico e non fa diagnosi.
