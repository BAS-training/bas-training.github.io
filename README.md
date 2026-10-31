# Come sto

Ogni mattina un semaforo dice a chi va in bici se oggi può spingere o se è meglio andare piano. Legge i dati dell'orologio e del ciclocomputer da [intervals.icu](https://intervals.icu) e li spiega in parole semplici.

L'app si apre da **https://advlabbik.github.io/come-sto/**

## Cosa fa

- **Oggi.** Il semaforo del mattino (verde, giallo, rosso) con il perché, tre domande veloci su come ti senti, e sei numeri spiegati, cioè HRV, battito a riposo, sonno, Forma, Fitness e carico recente.
- **Andamento.** Fitness, Fatica e Forma nel tempo, il lavoro di ogni giorno, le notti (HRV con il tuo normale, battito a riposo, ore di sonno).
- **Uscite.** Ore per settimana e tutti gli allenamenti degli ultimi due mesi.
- **Obiettivo.** Scegli la prossima avventura e la data, e vedi quanta Fitness serve, dove arrivi continuando così e quanto allenarti.
- **Guida.** Come nasce il semaforo, cosa vuol dire ogni numero, quando non fidarsi dei numeri.

## Come funziona, in breve

- È una pagina statica pubblicata con GitHub Pages. **Non ha server e non ha database.**
- Chi la usa crea un account gratuito su intervals.icu, ci collega il proprio dispositivo (Garmin, Wahoo, Polar, Suunto, Coros, Oura, Whoop…) e incolla nella pagina la propria chiave API di intervals.icu.
- La pagina chiama le API pubbliche di intervals.icu direttamente dal browser (`/api/v1/athlete/0/...`, dove `0` vuol dire «il proprietario della chiave»). I dati non passano da nessun altro.
- La chiave resta solo nel browser di chi la usa (`localStorage` se sceglie «Ricordami», altrimenti `sessionStorage`). «Esci» la cancella.
- Le risposte alle domande del mattino vengono scritte nel giorno di oggi su intervals.icu, nei campi standard `fatigue`, `soreness` e `injury` (scala 1-4).

## Il semaforo

Ogni voce dà verde, giallo o rosso; le voci senza dati non votano.

| Voce | Giallo | Rosso |
|---|---|---|
| HRV della notte | sotto il normale personale (media dei logaritmi delle ultime 60 notti, meno una deviazione standard), oppure media delle ultime 7 notti bassa | molto sotto (meno 1,5 deviazioni), oppure sotto il normale da più notti |
| Battito a riposo | 3-4 battiti sopra la mediana delle ultime 30 notti | 5 o più |
| Sonno | meno di 6h30 o punteggio sotto 70 | meno di 5h30 o punteggio sotto 60 |
| Allenamento recente | Fatica/Fitness di ieri sera oltre 1,3 | oltre 1,5 |
| Acciacchi (oggi o ieri) | fastidio | dolore o infortunio |
| Come ti senti | un po' stanco | a pezzi |

L'esito. Un giallo dà «senza esagerare». Due gialli o un rosso danno «giornata tranquilla». Due rossi, o un rosso e un giallo, danno «oggi recupera». Le regole stanno in `js/semaforo.js` e sono spiegate anche nella Guida dell'app.

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
js/demo.js            sei mesi di dati inventati per la prova
js/viste/             le pagine
test/                 prove automatiche (node --test test/semaforo.test.mjs)
dev/server.py         server di sviluppo con ponte verso intervals.icu
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

poi aprire `http://localhost:8801/?dev=ponte`. Il file della chiave contiene `{"api_key": "..."}` e **non va mai nel repository** (vedi `.gitignore`).

Le modifiche si fanno su un branch e arrivano su `main` dopo la revisione, perché `main` è quello che vedono gli utenti.

## Prossimi passi

- **Entra con intervals.icu.** intervals.icu permette alle app di farsi autorizzare con OAuth anche senza server (PKCE). Quando l'app sarà registrata e approvata, al posto della chiave da copiare ci sarà un pulsante.
- **Dati Garmin.** intervals.icu ha annunciato che potrebbe limitare l'accesso via API ai dati che arrivano da Garmin. Se succede, per chi usa Garmin il semaforo si regge su allenamento, sonno e domande del mattino finché non c'è un'alternativa ufficiale.

## Avvertenza

Come sto dà consigli di allenamento basati su numeri. Non è un dispositivo medico e non fa diagnosi.
