# Come sto

Ogni mattina un semaforo dice a chi va in bici come impostare la giornata, e un piano della settimana lo porta pronto alla sua avventura con la bici carica. Legge i dati dell'orologio e del ciclocomputer da [intervals.icu](https://intervals.icu), aggiunge tre risposte veloci su come ti senti e spiega tutto in parole semplici. È l'app della Bike Adventure Series per arrivare pronti ai viaggi in bici di più giorni.

L'app si apre da **https://bas-training.github.io/** e senza account si può guardare l'esempio, con i dati inventati di una ciclista, da **https://bas-training.github.io/?esempio**

## Cosa fa

La barra in basso ha cinque voci. Dal piede della pagina si aprono Impostazioni e Privacy.

- **Oggi.** Una carta sola con il semaforo del mattino e la seduta di oggi del piano, aggiustata dal semaforo. Subito sotto, la barra «Arrivi pronto?» con i quattro pilastri, che porta a Pronto?, e il collegamento alla tua avventura. Poi le tre domande del mattino, il tasto «Sto male», la riga «Ieri sera…» con le cause note, al massimo una carta in più (due quando una è sulle borse) e il «Perché» voce per voce con quanto fidarsi. Con «Sono in viaggio» la mattina cambia, con le domande dei giorni di fila e tre promemoria.
- **Settimana.** I sette giorni del piano, con bici e palestra, «Questo weekend non posso» e «Aggiungi un giro». La palestra si apre da qui e dalla carta di oggi, con la scheda completa, «Segna i pesi» e «Fatta».
- **Pronto?** In cima la barra «Arrivi pronto?», un segmento per pilastro, pieno, a metà o vuoto come i segni delle righe. Le ore in sella al giorno della tua avventura con la bici carica, il verdetto a quattro pilastri (ore a settimana, uscita lunga, prove con le borse, continuità) e cosa cambia se aggiungi un giorno o passi al percorso corto.
- **Numeri.** I sei numeri del giorno (HRV, battito a riposo, sonno, Freschezza, Fitness e carico recente) con le loro spiegazioni, le domande ancora aperte, la Fitness di Come sto accanto a quella di intervals.icu, i numeri che accompagnano il verdetto senza deciderlo, i grafici nel tempo e le uscite degli ultimi due mesi, ognuna con la sua scheda.
- **Guida.** Il semaforo a punti, come si stimano le ore in sella, come si decide se sei pronto, come nasce il piano, i test con le borse, la palestra, quando mancano i dati, cosa vuol dire ogni numero, quando non fidarsi dei numeri e le fonti scientifiche principali, per tema, con il collegamento a ogni studio.
- **Impostazioni.** La mia avventura, giorni e tempo, borse e bici, palestra, età, notte, fascia cardio in bici, casella del ciclo, la settimana leggera da 50 anni, dove stanno i dati, la copia di sicurezza, Esci ed «Esci e cancella tutto da questo dispositivo». Ogni voce dice dove sta il dato.
- **Il primo avvio.** Una domanda per schermata, con la risposta già scelta e «Salta». Dal link dell'iscrizione a un evento, evento, giorni e data arrivano già scelti. Chi arriva dalla versione di prima, con la sfida della vecchia pagina Obiettivo, rivede le domande finché non sceglie. «Un'avventura mia» è un giro lungo di qualche ora, un giro con i tuoi km e la tua salita, oppure da 2 a 14 giorni di fila, ogni giorno a ore o con km, salita e fondo, con le borse o senza.

## Come funziona, in breve

- È una pagina statica pubblicata con GitHub Pages. **Non ha server. I dati su salute e allenamento non passano da un database nostro.** Un database c'è solo per chi sceglie di entrare con la sua email, e tiene poche scelte, vedi «L'account».
- Chi la usa crea un account gratuito su intervals.icu, ci collega il proprio dispositivo (Garmin, Wahoo, Polar, Suunto, Coros, Oura, Whoop…) e incolla nella pagina la propria chiave API di intervals.icu. Quando sarà acceso «Entra con intervals.icu» (vedi sotto) basterà un pulsante, e la chiave resterà come alternativa.
- La pagina chiama le API pubbliche di intervals.icu direttamente dal browser (`/api/v1/athlete/0/...`, dove `0` vuol dire «il proprietario della chiave»). I dati non passano da nessun altro.
- Prima di entrare la persona conferma di avere almeno 18 anni e dà il consenso per i dati sulla salute, nel riquadro «Prima di entrare» della pagina Collega. Il consenso si salva sul telefono in `comesto.consenso`, con la versione del testo (`C0-1.0`) e la data. Senza il consenso non si entra con i propri dati e la pagina non legge niente da intervals.icu. Quando il testo cambia, chi è già dentro lo rivede una volta. L'esempio resta libero.
- La chiave resta solo nel browser di chi la usa (`localStorage` se sceglie «Ricordami», altrimenti `sessionStorage`), in `js/credenziali.js` e mai nelle chiavi `comesto.`.

### Le letture

- A ogni apertura al massimo due letture, benessere e attività, e solo dei giorni nuovi più 3 giorni di sovrapposizione. Il resto sta in una copia sul telefono, `comesto.cache.v1`. La prima volta si leggono 182 giorni.
- Nessuna lettura se l'ultima ha meno di 10 minuti, salvo «Aggiorna». Il profilo dell'atleta si legge al primo ingresso e poi ogni 7 giorni, e se ne tengono solo nome, fuso orario e soglie dei profili sportivi.
- Delle uscite il nome si mostra ma non si salva. La descrizione si legge solo nelle attività create da Come sto.

### Le scritture

- Le risposte alle tre domande del mattino vanno nel giorno di oggi su intervals.icu, nei campi standard `fatigue`, `soreness` e `injury` (scala 1-4, dove 1 è il meglio). In viaggio la domanda sull'energia scrive lo stesso campo `fatigue`.
- Le scritture sulle attività (sforzo, borse, palestra, giri aggiunti a mano) sono pronte in `js/scritture.js` ma **spente** in `js/config.js` (`SCRITTURE.attivita`). Si accendono solo dopo le prove dal vivo e con la versione nuova del consenso, insieme al permesso `ACTIVITY:WRITE`. Spente, le risposte restano sul telefono e nella copia di sicurezza, e la coda `comesto.coda.v1` non parte mai.
- L'app non cancella mai un'attività.

### Cosa resta sul telefono

Ogni lettura e scrittura passa da `js/memoria.js`, dentro un try e catch.

| Chiave | Cosa tiene | Quanto resta |
|---|---|---|
| `comesto.preferenze` | il periodo dei grafici, i messaggi già visti, la data dell'ultima copia | finché la persona esce e cancella tutto |
| `comesto.profilo.v1` | fascia d'età, dispositivo della notte, cambio di dispositivo, aritmia nota, fascia cardio, casella del ciclo, bici e borse, fascia di peso facoltativa, esperienza di viaggio, palestra | finché la persona esce e cancella tutto |
| `comesto.obiettivo.v1` | evento, giorni e data, oppure l'avventura propria, oppure solo il semaforo | fino a 3 mesi dopo l'evento |
| `comesto.disponibilita.v1` | giorni, giorno della lunga, ore a settimana, tetto di ogni giorno, due cose nello stesso giorno | finché la persona esce e cancella tutto |
| `comesto.piano.v1` | il piano della settimana | fino a 3 mesi dopo l'evento |
| `comesto.uscite.v1` | per ogni uscita sforzo, borse, chili, notte fuori, tipo, durata detta, esito di una prova, stomaco | 400 giorni |
| `comesto.palestra.v1` | le sedute di palestra, con pesi e riserve | 400 giorni |
| `comesto.mattino.v1` | per ogni giorno «Sto male», la risposta sul medico, le cause di «Ieri sera…», le domande di controllo, il sonno e «Qualcosa non va?» in viaggio, l'inizio e la fine di un viaggio | 400 giorni |
| `comesto.esiti.v1` | per ogni giorno il livello del semaforo, i punti delle voci, i tetti, lo stop e la modalità evento | 400 giorni |
| `comesto.domenica.v1` | per ogni settimana il controllo della domenica | 400 giorni |
| `comesto.invito.v1` | percorso, giorni e data arrivati dal link dell'iscrizione | finché non entrano nell'avventura |
| `comesto.cache.v1` | benessere e attività già letti, senza i nomi delle uscite | si cancella con Esci |
| `comesto.coda.v1` | le scritture ancora da mandare, oggi sempre vuota | si cancella con Esci |
| `comesto.atleta.v1` | l'impronta SHA-256 del numero dell'atleta, per riconoscere un account diverso sullo stesso telefono | si cancella con Esci e cancella tutto |
| `comesto.consenso` | versione e data del testo del consenso | si cancella con Esci |

- All'avvio la memoria sposta in una chiave con `.guasto` in fondo quello che non si legge, e la toglie dopo 30 giorni. Porta sfida e data della vecchia pagina Obiettivo in `comesto.obiettivo.v1`, toglie le voci oltre i 400 giorni e avventura e piano finiti da 3 mesi.
- **Esci** toglie la chiave o l'accesso, il consenso, la cache e la coda, e dice cosa resta sul telefono. **Esci e cancella tutto da questo dispositivo** toglie tutte le chiavi `comesto.`, credenziali comprese, da `localStorage` e da `sessionStorage`. Con «Entra con intervals.icu» tutti e due tolgono anche il permesso su intervals.icu.
- **Un altro atleta sullo stesso telefono.** Se entra un account diverso da quello dell'impronta, la pagina non mostra e non usa i dati che ci sono, la loro coda non parte mai, e chiede se cancellarli o uscire.
- **La copia di sicurezza.** «Salva una copia», in Impostazioni, scarica `come-sto-dati-AAAA-MM-GG.json` con tutte le chiavi tranne consenso, cache, coda, impronta e credenziali. «Riprendi da una copia» mostra cosa cambia e chiede conferma, e per ogni giorno e ogni uscita tiene il dato più recente.
- **Il link dell'iscrizione** porta solo percorso, giorni e data, dopo il cancelletto (`#percorso=…&giorni=…&partenza=…`), così non arriva a nessun server. Vale ancora il vecchio `?percorso=`. La pagina li salva in `comesto.invito.v1` e li toglie dall'indirizzo.
- Se la memoria del browser manca o è piena, le risposte restano nella pagina finché è aperta, e la pagina lo dice una volta.
- Nessun dato sulla salute arriva ad AdventureLab. I sintomi di «Sto male», le cause, il sonno e «Qualcosa non va?» in viaggio, l'aritmia e la casella del ciclo non vanno nemmeno su intervals.icu.

## L'account

Chi vuole entra con la sua email e un codice, senza password, e ritrova le sue scelte su ogni telefono. È facoltativo, e l'app funziona anche senza. Il codice sta in `js/nuvola.js`, il database in `supabase/migrations`, e con `url` vuoto in `js/config.js` è tutto spento.

- **Dove.** Supabase, progetto `come-sto-prova`, a Francoforte, separato dal Marketing Hub. È un progetto di prova, sul piano gratis, che non ha backup automatici e si ferma dopo una settimana di poca attività. Per i dati veri serve il piano a pagamento e un progetto di produzione a parte.
- **Cosa c'è online.** L'email, `comesto.obiettivo.v1`, `comesto.disponibilita.v1` e di `comesto.profilo.v1` solo i campi di `CAMPI_PROFILO` (bici, borse, e-bike, scelta sulla palestra, altri sport, viaggi già fatti). Il piano non si salva, su un telefono nuovo si rifà da solo.
- **Cosa non c'è mai.** Numeri di salute, semaforo, risposte, sintomi, sforzo, sedute di palestra, età, peso, aritmia, ciclo, la risposta sulla sicurezza in palestra e la chiave di intervals.icu.
- **Chi protegge i dati.** Il database, non la pagina. Ogni persona vede solo le sue righe (row level security), chi non è entrato non ha nessun permesso, le chiavi ammesse sono tre, ognuna accetta solo i suoi campi e solo valori semplici, e nessuna riga può contenere i nomi dei campi sulla salute. L'indirizzo e la chiave pubblicabile in `js/config.js` possono essere pubblici. **La chiave segreta di Supabase non va mai nella pagina né nel repository.**
- **Se si cambia la lista dei dati.** Vanno cambiati insieme `CAMPI` in `js/nuvola.js`, il database con una migrazione nuova, i testi di `ACCOUNT` e la Privacy, e prima va deciso se serve un consenso nuovo.
- **Il salvataggio.** Il telefono viene prima. Per ogni chiave si tiene l'ultimo stato su cui telefono e database erano d'accordo. Se è cambiato uno solo dei due vale quello, se sono cambiati tutti e due vale la scelta fatta dopo. Senza rete non si perde niente e si riprova dopo.
- **Niente cancellazioni da sole.** Una cosa che manca sul telefono può essere un guasto della memoria, quindi si riprende da online e non si toglie mai niente online. L'unica eccezione è l'avventura finita da 3 mesi.
- **La prima volta su un telefono.** Se il telefono ha già delle scelte non si manda e non si sostituisce niente, e si chiede se sono della persona e, se ce ne sono di diverse online, quali tenere.
- **Due persone sullo stesso telefono.** Il telefono si lega all'account appena si entra, e resta legato anche dopo l'uscita. Se entra un'altra email non si legge e non si scrive niente online finché la persona non sceglie se cancellare i dati di prima o uscire. La stessa email con un account rifatto non conta come un'altra persona.
- **Le email del codice.** Partono da Brevo via SMTP, con il mittente della Bike Adventure Series. Il servizio di base di Supabase scrive solo ai membri del team e non lascia cambiare il testo.
- **Su un telefono nuovo** serve anche collegare di nuovo intervals.icu, perché la chiave non si salva mai online.

Per rifare il database su un progetto nuovo si lancia il file di `supabase/migrations` nel SQL Editor. Prima di ogni cambiamento alle regole vanno rifatte le prove con due utenti inventati, e fra quelle c'è che uno non legga, non cambi e non cancelli le righe dell'altro.

## Il semaforo

È il semaforo a punti del capitolo 4 della specifica della preparazione. Ogni voce dà 0, 1 o 2 punti, e una voce da 2 punti è un segnale forte, che fa partire una domanda prima di decidere. Le regole stanno in `js/semaforo.js` e `js/modello.js`, i numeri in `js/parametri.js` (gruppo `SEMAFORO`), i testi in `js/testi.js` e la Guida in `js/testi-pagine.js`. A schermo i punti non si scrivono mai, ogni voce ha un pallino verde, giallo o grigio.

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

Altre regole.

- **Il normale.** L'HRV si confronta sul logaritmo, con la mediana e 1,4826 volte la deviazione mediana assoluta delle notti valide fra 60 notti fa e ieri, mai sotto 0,08 (0,06 con anelli e fasce). Vota da 14 notti, al massimo con 1 punto, ed è piena da 28. Il battito usa la FC media del sonno (`avgSleepingHR`) se c'è in almeno metà delle ultime 30 notti, altrimenti il battito a riposo, ed è provvisorio da 7 notti e pieno da 14. Una notte vale con almeno 4 ore di sonno, o con l'HRV senza il sonno.
- **Le esclusioni.** Le notti con una casella delle cause, con «Sto male», della malattia, dei viaggi, delle 72 ore dopo una fatica voluta e di prima di un cambio di dispositivo non entrano nel normale.
- **Il carico** guarda Fitness e Fatica di ieri sera, così un giro fatto stamattina non cambia il consiglio del mattino. Con la Fitness sotto 5 non vota, da 50 anni usa una Fatica lenta a 10 giorni. Il semaforo usa la Fitness di intervals.icu finché la serie di Come sto non passa la prova di coincidenza sui dati veri.
- **La domanda di controllo.** Con un segnale forte, e con battito alto e HRV bassa da due notti, prima del livello compare «Prima di decidere, una domanda», con «No, niente», «Sì» e «C'è un motivo». Con «Molto doloranti» o «Un dolore» compare subito «Ti cambia la pedalata o peggiora pedalando?».
- **La malattia.** Dopo uno stop per malattia lo stop resta finché la persona non segna «Non ho più febbre da 24 ore, senza farmaci per la febbre», al massimo 14 giorni dall'ultimo sintomo. Da lì parte il rientro. Se la risposta non arriva, dopo i 14 giorni la malattia si chiude come lunga, perché la sua durata non si conosce.
- **Il medico prima di riprendere.** Dopo una malattia di più di 7 giorni, o con la febbre e il petto chiuso, il consiglio è riposo o una camminata, mai un giro, finché la persona non segna «Il medico mi ha detto che posso riprendere», e i 7 giorni del rientro contano da lì.
- **Il cuore.** Un sintomo di cuore, compreso l'avviso di ritmo irregolare dell'orologio, dà Rosso quel giorno e anche nei giorni dopo, con l'invito dal medico, finché la persona non segna «Il medico mi ha detto che posso riprendere». Il testo dello stop compare anche nel pannello, sotto la casella spuntata.
- **La modalità evento** si accende con «Sono in viaggio», con «Sì, parto» il giorno della partenza dell'avventura, dal secondo giorno di un weekend, di una prova o di un blocco del piano, oppure con la proposta che compare da sola dopo 2 giorni di fila con almeno 4 ore di bici, fuori dai viaggi già segnati. Finisce con «Sono arrivato», dopo i giorni previsti più uno, oppure dopo 2 giorni di fila senza nessuna attività.
- **I giorni di guardia dopo un viaggio** si contano dal viaggio del diario, dal primo all'ultimo giorno, anche se l'app è rimasta chiusa qualche giorno.
- **Quanto fidarsi.** Alto, medio o basso, il più basso fra carico e notte. Si legge sotto «Perché», e accanto al colore solo quando è basso.

La Freschezza (su intervals.icu si chiama Form) è la Fitness meno la Fatica, in percentuale della Fitness, con le fasce di intervals.icu più due fasce per il carico alto (da −30% a −50% e oltre −50%).

Se cambia una soglia va cambiata in `js/parametri.js`, nella Guida (`GUIDA_SEMAFORO` in `js/testi-pagine.js`) e in questa tabella, che la prova `test/testi.test.mjs` confronta con la Guida.

## La preparazione

Segue la specifica della preparazione, capitoli 1-6. Tutte le regole sono moduli puri, senza DOM e senza `window`, provati con node, e tutti i numeri stanno in `js/parametri.js`, ognuno con la regola da cui viene.

- **Le ore in sella** (`js/stima.js`). Dai km e dal dislivello ufficiali del catalogo (`js/catalogo.js`, generato da `strumenti/catalogo.py`, mai il tracciato), dalle masse con le borse e dal passo della persona, le ore in movimento con la bici carica, divise per i giorni scelti, alla mezz'ora e con una forbice. Il passo viene dalla soglia di potenza con il misuratore, dai giri lunghi, dalla media detta o da una stima prudente, e dopo la prima uscita con le borse dai tempi veri con la bici carica.
- **Pronto?** (`js/prontezza.js`). Quattro pilastri, ore a settimana dalla −10 alla −3, uscita più lunga, prove con le borse e continuità. Il verdetto è «Pronto, con margine», «Pronto», «Quasi pronto» o «Poco pronto». Se non basta propone più giorni, poi il percorso corto, poi di partire e adattare. La Fitness è uno specchio e non decide.
- **Il piano** (`js/piano.js`). La settimana con bici e palestra, dalla disponibilità e dalle ore della persona. La lunga cresce di un passo alla volta, una settimana leggera ogni quattro (ogni tre da 50 anni), tre prove con le borse prima di un evento di 3-5 giorni, lo scarico finale. Ogni mattina il semaforo adatta la seduta di oggi, e la domenica il controllo della settimana può renderla facile.
- **La palestra** (`js/palestra.js`). Nove schede complete come dati, con esercizi, serie, ripetizioni e il peso spiegato con le ripetizioni che restano.
- **I dati che mancano** (`js/dati.js`, `js/carico.js`). Il solo modulo che conosce la forma delle risposte di intervals.icu. Riconosce le uscite da Strava senza dettagli, i doppioni, i giri senza sensori e la palestra al polso, sceglie la fonte del carico e calcola una serie di Fitness e Fatica di Come sto.
- **Il motore** (`js/motore.js`). Da quello che arriva da intervals.icu e da quello che sta sul telefono calcola in una chiamata tutto quello che le pagine mostrano. In cima al file c'è il contratto con le pagine, cioè ogni campo di `ctx` e ogni azione.

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

- `ACTIVITY:READ` per le uscite. Diventa `ACTIVITY:WRITE` solo quando si accendono le scritture sulle attività.
- `WELLNESS:WRITE` per le notti e per scrivere le risposte del mattino (WRITE comprende READ).
- `SETTINGS:READ` per nome, fuso orario e soglie, perché senza `/api/v1/athlete/0` risponde 403.

Sulla pagina del permesso si possono spegnere delle voci. Se ne manca una, l'app non entra e chiede di riprovare lasciandole accese.

Come funziona.

- Prima di partire la pagina salva in `sessionStorage` un codice casuale (verifier), lo state, l'ora e la scelta «Ricordami», e a intervals.icu manda solo l'impronta SHA-256 del verifier. Il consenso del riquadro «Prima di entrare» si salva prima di partire, perché le spunte non sopravvivono al giro su intervals.icu. Anche il link dell'iscrizione si salva prima di partire, perché l'indirizzo di ritorno è esatto e senza parametri.
- Al ritorno toglie subito il codice dall'indirizzo, controlla lo state, scambia il codice con l'accesso (POST a `https://intervals.icu/api/oauth/token`, il codice vale due minuti) e cancella verifier e state.
- Un ritorno vale solo se in quella scheda c'è la richiesta partita da lì. Senza, l'indirizzo è un link di altri o una pagina vecchia ritrovata col tasto del browser. Chi è già dentro resta dentro, chi non lo è legge che la richiesta non si ritrova. Il rifiuto arriva senza state, quindi si accetta uno state assente ma non uno diverso.
- L'accesso si salva come la chiave, in `localStorage` con «Ricordami», altrimenti in `sessionStorage`. Le API si chiamano con `Authorization: Bearer` e l'atleta `0` vale anche così.
- Si tiene un solo modo di entrare alla volta, e le schede aperte seguono quello salvato (`js/credenziali.js`). Se una scheda entra in un altro modo, le altre passano a quello senza uscire. Se una esce, escono tutte.
- intervals.icu non usa refresh token e non dà una scadenza. Se risponde 401 l'app dice che l'accesso è scaduto o è stato tolto e chiede di entrare di nuovo. «Esci» lo cancella e lo toglie anche su intervals.icu con `DELETE /api/v1/disconnect-app`. Se la revoca non riesce, per esempio senza rete, la pagina lo dice e spiega che il permesso si toglie dalle impostazioni di intervals.icu.
- Lo scambio del codice deve restare una richiesta «semplice», con le sole intestazioni `Accept` e `Content-Type` da modulo. L'indirizzo del token risponde al browser, ma non alla domanda preventiva (OPTIONS) che partirebbe con intestazioni in più.

Le regole di intervals.icu stanno nella guida ufficiale, https://forum.intervals.icu/t/intervals-icu-oauth-support/2759

## Struttura

```
index.html                 la pagina, con la Content Security Policy
css/app.css                lo stile comune, tema chiaro e scuro
css/<pagina>.css           le regole di ogni pagina (inizio, oggi, settimana, palestra, pronto, numeri)
css/barra.css              la barra «Arrivi pronto?» di Oggi e di Pronto? (js/viste/barra-pronto.js)
js/app.js                  regia (stato, pagine, memoria, consenso, letture, collegamento a intervals.icu)
js/motore.js               da letture e telefono a tutto quello che le pagine mostrano, con il contratto (puro, testato)
js/api.js                  chiamate a intervals.icu e letture dei soli giorni nuovi, con la chiave o con l'accesso OAuth
js/config.js               «Entra con intervals.icu» e le scritture sulle attività, tutti e due spenti
js/oauth.js                «Entra con intervals.icu», OAuth con PKCE senza segreto (funzioni pure, testate)
js/nuvola.js               l'account con l'email e il salvataggio online di poche scelte (puro, testato)
js/credenziali.js          chiave e accesso salvati, e come le schede aperte li seguono (puro, testato)
js/memoria.js              le chiavi comesto. sul telefono, migrazione, pulizia, Esci e copia (puro, testato)
js/parametri.js            tutti i numeri delle regole, con la loro fonte (testato)
js/dati.js                 lo strato dei dati, l'unico che conosce le risposte di intervals.icu (puro, testato)
js/carico.js               la fonte del carico e la serie di Come sto (puro, testato)
js/scritture.js            le scritture verso intervals.icu e la loro coda, spente (puro, testato)
js/modello.js              dai dati grezzi ai numeri, basi a mediana e notte valida (puro, testato)
js/semaforo.js             il semaforo a punti (puro, testato)
js/stima.js                le ore in sella con la bici carica (puro, testato)
js/catalogo.js             i percorsi della Bike Adventure Series, generato da strumenti/catalogo.py
js/prontezza.js            il verdetto a quattro pilastri (puro, testato)
js/piano.js                il piano della settimana (puro, testato)
js/palestra.js             le nove schede di palestra come dati (puro, testato)
js/formato.js              numeri, durate in parole, ore in sella, orari con il punto e date
js/grafici.js              grafici SVG fatti a mano, con tooltip e tabella dei numeri
js/testi*.js               tutti i testi in parole semplici, un file per pagina o per modulo
js/demo.js                 sei mesi di dati inventati per l'esempio
js/viste/                  le pagine
strumenti/                 versione dei file, catalogo, taratura sui dati privati
test/                      prove automatiche
dev/server.py              server di sviluppo con ponte verso intervals.icu
supabase/migrations/       il database dell'account, con le sue regole
```

Nessuna libreria esterna e nessuna risorsa da altri siti. La pagina carica solo file suoi e parla solo con intervals.icu e con il suo database. È una scelta di sicurezza, perché nel browser c'è la chiave di chi la usa.

## Sviluppo

Per lanciare le prove automatiche, un file alla volta, perché con la cartella come argomento Node 22.12 non le lancia

```
node --test test/carico.test.mjs
node --test test/catalogo.test.mjs
node --test test/catena.test.mjs
node --test test/dati.test.mjs
node --test test/inizio.test.mjs
node --test test/memoria.test.mjs
node --test test/motore.test.mjs
node --test test/nuvola.test.mjs
node --test test/oauth.test.mjs
node --test test/oggi.test.mjs
node --test test/palestra.test.mjs
node --test test/parametri.test.mjs
node --test test/piano.test.mjs
node --test test/prontezza.test.mjs
node --test test/pronto.test.mjs
node --test test/scritture.test.mjs
node --test test/semaforo.test.mjs
node --test test/settimana.test.mjs
node --test test/stima.test.mjs
node --test test/testi.test.mjs
```

`test/testi.test.mjs` controlla la scrittura di tutti i testi (capitolo 7.1 e prova 9.8). Niente due punti, niente parole vietate, niente sigle, durate in parole, orari con il punto. Trova da sola i file `js/testi*.js` e `js/palestra.js`, compone ogni modello anche con gli ingressi di `ESEMPI`, e legge le stringhe rimaste nelle pagine.

`strumenti/taratura.mjs` e `strumenti/taratura-mattine.mjs` rifanno la taratura sui dati veri di una persona, che stanno fuori dal repository e **non ci entrano mai**.

Per provare la pagina con i propri dati, senza incollare la chiave nel browser

```
python dev/server.py 8801 PERCORSO/AL/FILE_CHIAVE.json
```

poi aprire `http://localhost:8801/?dev=ponte`. Il file della chiave contiene `{"api_key": "..."}`, sta fuori dalla cartella del progetto e **non va mai nel repository** (vedi `.gitignore`). Il ponte risponde solo alla pagina stessa su localhost. Anche con il ponte la pagina chiede il riquadro «Prima di entrare».

## Pubblicare

1. Le modifiche si fanno su un branch e arrivano su `main` dopo la revisione, perché `main` è quello che vedono gli utenti.
2. Tutte le prove verdi, un file alla volta.
3. Un controllo a schermo a 375 px, chiaro e scuro, con `?esempio`, su tutte le pagine.
4. Poi `python strumenti/versione.py`, che mette lo stesso numero di versione su tutti i link css e js di `index.html` e su tutti gli import, così un telefono non mescola file vecchi e nuovi mentre GitHub Pages aggiorna.

Prima di accendere le scritture sulle attività servono le prove dal vivo su un account vero e la versione nuova del consenso, che le comprende.

## Restano anche questi

- **Entra con intervals.icu.** Il codice è pronto e spento, aspetta che intervals.icu approvi l'app. Come accenderlo è spiegato nella sezione «Entra con intervals.icu».
- **Un indirizzo tutto suo, sempre.** Il browser tiene una memoria sola per ogni indirizzo, e tutte le pagine pubblicate con GitHub Pages da una stessa organizzazione hanno lo stesso indirizzo. Per questo l'app sta da sola nell'organizzazione `BAS-training`, così la chiave salvata la può leggere solo lei. In questa organizzazione non va pubblicato nessun altro sito con GitHub Pages. Se un giorno l'app avrà un dominio suo, si collega a questo stesso repository e il vecchio indirizzo porta da solo al nuovo.
- **Dati Garmin.** intervals.icu ha annunciato che potrebbe limitare l'accesso via API ai dati che arrivano da Garmin. Se succede, per chi usa Garmin il semaforo si regge su allenamento, sonno e domande del mattino, e le uscite arrivano come quelle da Strava, con le carte che chiedono quello che manca.

## Avvertenza

Come sto dà consigli di allenamento basati su numeri. Non è un dispositivo medico e non fa diagnosi.
