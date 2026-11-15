# Guida per i moderatori

Indirizzo: **/admin** (es. https://mementoconvivium.pages.dev/admin). La password è la stessa per tutti: chiedila a chi gestisce il sito. Resti collegato per 30 giorni dall'ultima volta che apri /admin.

**Prima cosa:** scrivi il tuo nome in alto ("Il tuo nome"). Finisce nella cronologia, così si sa chi ha cambiato cosa. Il browser lo ricorda.

## Modificare un evento

1. Clicca l'evento a sinistra (puoi cercarlo per nome). La lista è ordinata per prossima data.
2. Modifica i campi. Accanto al titolo compare **● Non salvato**.
3. **Salva** (oppure **Ctrl+S**). Il sito pubblico si aggiorna subito; in rari casi serve fino a 5 minuti.

Se chiudi la pagina o cambi evento con modifiche non salvate, il browser te lo chiede prima.

Le sezioni (Base, Aspetto, Date…) si chiudono cliccando sul titolo, per lavorare su una alla volta.

## Stati

| Stato | Cosa vede il pubblico |
|---|---|
| Aperto | pagina dell'evento con "Prenota ora" |
| Lista d'attesa | pagina con "Lista d'attesa" |
| Chiuso | pagina con "Prenotazioni chiuse" |
| Coming soon | l'evento è in lista e in timeline, ma senza pagina |
| **Bozza** | niente: l'evento è invisibile |

Bozze e coming soon si possono comunque vedere con **Anteprima ↗**: solo tu (da collegato) vedi la pagina, con una striscia rossa in basso.

## Nuovo evento, duplicare

- **+ Nuovo evento** parte come bozza. Lo **slug** (l'indirizzo, es. `/eventi/pirati`) si scrive da solo mentre scrivi il titolo; puoi cambiarlo a mano. Se lo cambi su un evento già pubblicato, il vecchio link smette di funzionare.
- **Duplica** crea una copia dell'evento aperto (bozza, senza date): comodo per una nuova edizione dello stesso spettacolo.

## Date

**+ Aggiungi data** copia luogo e quota dall'ultima data. Il giorno della settimana ("Ven 19 Giu 2026") si scrive da solo sotto la data: controllalo. Le date si mettono in ordine da sole al salvataggio. Le date passate restano visibili ma sbiadite; se tutte le date sono passate, il bottone di prenotazione sparisce.

Senza date la pagina mostra "Da annunciare" con **Luogo generico** e **Quota generica**.

## Schede della pagina

La pagina dell'evento non è più una pagina lunga: sotto l'intestazione ci sono dei **pulsanti-scheda** (es. *La storia · Gli abiti dell'epoca · Personaggi*) e si vede una scheda alla volta. Un nuovo evento parte con queste tre.

- **Aggiungi scheda**: scegli un punto di partenza (La storia, Gli abiti dell'epoca, Personaggi, Galleria, Testo libero). Il titolo si cambia dopo.
- Clicca il titolo di una scheda per aprirla o chiuderla; ↑ ↓ cambiano l'ordine dei pulsanti sul sito, ✕ rimuove la scheda.
- Ogni scheda è fatta di **blocchi** (vedi sotto): una scheda può avere, per esempio, un testo, poi un video, poi le domande frequenti.
- Ogni scheda ha un indirizzo suo da condividere: `/eventi/farwest#personaggi`.

## Blocchi

Schede degli eventi, Home e pagine nuove si compongono allo stesso modo: una lista di blocchi. **Aggiungi blocco** in fondo alla lista:

- **Testo**: il testo e, se vuoi, una foto accanto (a destra o a sinistra).
- **Galleria**: foto con didascalia. **+ Aggiungi foto** accetta più foto insieme. Sul sito un clic apre la foto a schermo intero.
- **Personaggi**: foto, nome, ruolo e indizio.
- **Domande frequenti**: domanda e risposta; sul sito la risposta si apre al clic.
- **Bottone**: un testo facoltativo e un bottone verso un link (`/lista-eventi`, la pagina di un locale…).
- **Video**: incolla il link di YouTube o Vimeo.
- **Elenco eventi**: le card degli eventi prossimi, già fatti o tutti, anche solo i primi N.
- **Foto delle serate**: in una scheda di un evento mostra le foto delle sue serate passate; in una pagina del sito (es. una pagina *Galleria*) quelle di tutti gli eventi, con i bottoni per filtrare per evento.
- **Sezione del sito** (solo Home e pagine nuove): intestazione della home, Come funziona, Timeline, box Prenota. I loro testi e il loro stile si cambiano in *Testi e stili delle pagine*.

Tutti hanno un **titolo facoltativo**. Nella riga del blocco: 👁 lo nasconde dal sito senza cancellarlo, ⧉ lo duplica, ↑ ↓ lo spostano, ✕ lo rimuove. **🎨 Stile del blocco** apre le opzioni di stile (vedi *Stile*).

**Testo**: scrivi normalmente; una riga vuota crea un nuovo paragrafo. Seleziona del testo e usa **G** (grassetto), **C** (corsivo) o **Link**. **Anteprima** mostra il testo come apparirà sul sito.

## Foto delle serate passate

Nell'evento, **Foto delle serate passate** → **+ Aggiungi serata**: parte dall'ultima data già passata, col suo luogo. Poi **+ Aggiungi foto** (anche molte insieme) e, se vuoi, una didascalia per foto. Sul sito si vedono dove metti il blocco **❖ Foto delle serate**.

## Foto e inquadratura

Trascina una foto su un riquadro, oppure clicca "sceglila". Viene ridotta e compressa in webp in automatico, anche da iPhone (il messaggio dice quanto pesava e quanto pesa ora: una foto da 5 MB diventa di solito 150–300 KB); poi **salva**. Non serve comprimerla prima.

**Inquadra** apre la foto intera: clicca (o trascina) sul punto che deve restare sempre visibile, ad esempio il viso, e regola lo **zoom**. A destra vedi come apparirà nella sua forma: tondo per i ritratti, verticale per la foto accanto al testo. Per **copertina** e **immagine della timeline** sotto la foto compare l'anteprima vera: intestazione della pagina e card della timeline (computer e telefono), che si aggiornano mentre sposti il punto. Su schermi diversi il taglio cambia, ma quel punto resta sempre visibile. **Centra** annulla l'inquadratura.

## Aspetto

- **Copertina**: la foto nell'intestazione della pagina (sfumata a sinistra, dietro il titolo) e l'anteprima quando si condivide il link su WhatsApp e simili. Se non c'è un'immagine per la timeline, la usa anche la timeline.
- **Font**: **Scegli…** apre l'elenco dei font, divisi per atmosfera (romani, medievali, Far West…), con l'anteprima del titolo. Va bene anche un altro font di [Google Fonts](https://fonts.google.com): scrivine il nome esatto seguito da uno stile di riserva, es. `Rye, cursive`. Il font del titolo vale anche per i titoli e i pulsanti delle schede.
- **🎨 Stile dell'intestazione** e **🎨 Stile predefinito delle schede**: vedi *Stile*. Ogni scheda può cambiare solo una parte dello stile predefinito (per esempio solo l'animazione): il resto lo prende da quello predefinito.

## Stile

Lo stesso riquadro vale per schede, blocchi e sezioni del sito:

- **Sfondo**: colore, immagine, **velo** sull'immagine (chiaro, o scuro con la spunta *Velo scuro*) per tenere leggibile il testo, **parallasse** (l'immagine scorre più lenta della pagina).
- **Colore del testo**: necessario se lo sfondo è scuro.
- **Font dei titoli**, **grandezza dei titoli**, **spaziatura** (compatta, ariosa, a tutto schermo).
- **Animazione d'entrata**: il contenuto appare quando arriva sullo schermo. Chi ha attivato "riduci movimento" sul telefono non la vede.
- **Effetto sui titoli**: ombra, bagliore dorato, oro, inciso, solo contorno.
- **Stili salvati**: **Salva come stile…** dà un nome alla combinazione (es. "Notte veneziana"); dal menu **Stile salvato** la riapplichi ovunque con un clic. **Elimina stile** toglie quello scelto. Gli stili si salvano subito.

## Home e pagine nuove

A sinistra, in **Pagine del sito**:

- **🏠 Home**: i blocchi della home, nell'ordine in cui appaiono. Si possono spostare, nascondere o aggiungerne altri (un video, le domande frequenti…).
- **+ Nuova pagina**: titolo, indirizzo (si scrive dal titolo: *Chi siamo* → `/chi-siamo`), descrizione per Google e per le anteprime su WhatsApp, e i blocchi. **Nel menu in alto** aggiunge la pagina al menu, prima del bottone finale. Una pagina nuova parte **nascosta**: la vedete solo voi moderatori, con una striscia rossa; togli la spunta quando è pronta.

Sotto c'è l'**Anteprima** della pagina coi dati non ancora salvati.



## Impostazioni sito

**⚙ Impostazioni sito**, in fondo a sinistra, vale per tutto il sito:

- **Contatti**: email, telefono, WhatsApp, Instagram. Compaiono nella pagina Contatti, nella Privacy, nel footer e nei bottoni "Prenota".
- **Link di prenotazione**: se lo metti (es. un modulo Google), i bottoni "Prenota" portano lì; se è vuoto aprono una email con l'oggetto già scritto.
- **Bottone della home**: cosa fa (apre l'elenco delle prossime date, porta alla pagina del prossimo evento oppure a un link).
- **Menu in alto**: voci e link, in ordine; l'ultima è evidenziata come bottone.
- **Avviso su tutte le pagine**: una frase (es. *Ultimi posti per sabato!*) con un link facoltativo, in basso su ogni pagina. Chi lo chiude non lo rivede finché non cambi il testo. Vuoto = nessun avviso.
- **Google e anteprime social**: titolo, descrizione e immagine che Google e WhatsApp mostrano per Home, Lista eventi, Contatti e Privacy.
- **Statistiche visite**: incolla il token di Cloudflare Web Analytics (le istruzioni sono sotto il campo). Visite e pagine più viste si guardano poi su Cloudflare.

Dopo il salvataggio il sito si aggiorna entro un minuto.

## Testi e stili delle pagine

**✎ Testi e stili delle pagine** mostra la pagina vera (Home, Lista eventi, Contatti, pagine nuove, pagina di un evento): i testi con il bordo tratteggiato si modificano cliccandoci sopra. Invio va a capo; un testo svuotato torna all'originale. Qui si cambiano anche il testo del bottone della home e il motto nel footer.

Ogni sezione ha in alto a destra **🎨 Stile**: lo stile cambia subito nella pagina, l'animazione riparte. Il box Prenota ha un solo stile, uguale su tutte le pagine. **📱 Telefono** mostra la pagina larga come uno smartphone. Poi **Salva**.

## Anteprima dell'evento

In fondo all'evento, **Anteprima: intestazione, schede e card** mostra intestazione, tutte le schede una sotto l'altra, card della timeline e card della lista eventi coi dati non ancora salvati, con gli stessi stili del sito.

## Timeline in home

L'evento compare nella timeline "Il viaggio nel tempo" solo se ha un **anno storico** (negativo per gli a.C., es. `-1150`).

## Errori e ripensamenti

- **Modifiche non salvate**: restano nel browser. Se chiudi la pagina, ti sposti su un'altra vista o il computer si spegne, riaprendo compare *"Hai modifiche non salvate del…"* con **Ripristinale** o **Scartale**. Valgono solo su quel computer e quel browser: per pubblicarle bisogna sempre premere **Salva**.
- **Cronologia**: il menu in alto elenca le versioni precedenti, con data e nome di chi ha salvato. C'è per gli eventi (ultime 30), per la Home e ogni pagina nuova, per i Testi e stili e per le Impostazioni (le ultime 50 modifiche del sito). Scegline una: viene caricata nel modulo, poi **Salva** per ripristinarla.
- **Pagina eliminata per sbaglio**: subito dopo compare **Annulla**.
- **Elimina** sposta l'evento in **Eliminati** (in fondo alla lista a sinistra): **Ripristina** e poi **Salva** per riaverlo.
- **Due moderatori sullo stesso evento**: se qualcuno ha salvato mentre lo modificavi, al salvataggio compare un avviso. Puoi **Sovrascrivere comunque** (la sua versione resta nella cronologia) oppure ricaricare la pagina.
- **Backup** scarica tutti gli eventi in un file: fallo ogni tanto, non costa niente.
