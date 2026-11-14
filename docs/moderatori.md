# Guida per i moderatori

Indirizzo: **/admin** (es. https://mementoconvivium.pages.dev/admin). La password è la stessa per tutti: chiedila a chi gestisce il sito. Resti collegato per 7 giorni.

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

- **Aggiungi scheda**: scegli un modello di partenza (La storia, Gli abiti dell'epoca, Personaggi, Galleria, Testo libero). Titolo e modello si possono cambiare dopo.
- Clicca il titolo di una scheda per aprirla o chiuderla; ↑ ↓ cambiano l'ordine dei pulsanti sul sito, ✕ rimuove la scheda.
- **Modelli**:
  - *Testo + immagine*: il testo e, se vuoi, una foto accanto.
  - *Galleria di foto*: un'introduzione facoltativa e le foto, ognuna con didascalia. **+ Aggiungi foto** accetta più foto insieme. Sul sito un clic apre la foto a schermo intero.
  - *Personaggi*: un'introduzione facoltativa e i personaggi (foto, nome, ruolo, indizio).
- Se cambi modello a una scheda, al salvataggio restano solo i contenuti del nuovo modello.
- Ogni scheda ha un indirizzo suo da condividere: `/eventi/farwest#personaggi`.

**Testo**: scrivi normalmente; una riga vuota crea un nuovo paragrafo. Seleziona del testo e usa **G** (grassetto), **C** (corsivo) o **Link**. **Anteprima** mostra il testo come apparirà sul sito.

## Foto e inquadratura

Trascina una foto su un riquadro, oppure clicca "sceglila". Viene ridotta e caricata in automatico; poi **salva**.

**Inquadra** apre la foto intera: clicca (o trascina) sul punto che deve restare sempre visibile, ad esempio il viso, e regola lo **zoom**. A destra vedi come apparirà nella sua forma: tondo per i ritratti, verticale per la foto accanto al testo. Per **copertina** e **immagine della timeline** sotto la foto compare l'anteprima vera: intestazione della pagina e card della timeline (computer e telefono), che si aggiornano mentre sposti il punto. Su schermi diversi il taglio cambia, ma quel punto resta sempre visibile. **Centra** annulla l'inquadratura.

## Aspetto

- **Copertina**: la foto nell'intestazione della pagina (sfumata a sinistra, dietro il titolo) e l'anteprima quando si condivide il link su WhatsApp e simili. Se non c'è un'immagine per la timeline, la usa anche la timeline.
- **Font**: **Scegli…** apre l'elenco dei font, divisi per atmosfera (romani, medievali, Far West…), con l'anteprima del titolo. Va bene anche un altro font di [Google Fonts](https://fonts.google.com): scrivine il nome esatto seguito da uno stile di riserva, es. `Rye, cursive`. Il font del titolo vale anche per i titoli e i pulsanti delle schede.
- **Sfondo**: colore (spunta "Colore"), immagine e **velo chiaro** sull'immagine per tenere leggibile il testo. Quello in *Aspetto* vale per tutte le schede; ogni scheda può averne uno suo, che prende il posto di quello predefinito.

## Impostazioni sito

**⚙ Impostazioni sito**, in fondo a sinistra, vale per tutto il sito:

- **Contatti**: email, telefono, WhatsApp, Instagram. Compaiono nella pagina Contatti, nella Privacy, nel footer e nei bottoni "Prenota".
- **Link di prenotazione**: se lo metti (es. un modulo Google), i bottoni "Prenota" portano lì; se è vuoto aprono una email con l'oggetto già scritto.
- **Bottone della home**: cosa fa (apre l'elenco delle prossime date, porta alla pagina del prossimo evento oppure a un link).
- **Menu in alto**: voci e link, in ordine; l'ultima è evidenziata come bottone.

Dopo il salvataggio il sito si aggiorna entro un minuto.

## Testi delle pagine

**✎ Testi delle pagine** mostra la pagina vera (Home, Lista eventi, pagina di un evento): i testi con il bordo tratteggiato si modificano cliccandoci sopra. Invio va a capo; un testo svuotato torna all'originale. Poi **Salva testi**. Qui si cambiano anche il testo del bottone della home e il motto nel footer.

## Anteprima dell'evento

In fondo all'evento, **Anteprima: intestazione e card** mostra intestazione, card della timeline e card della lista eventi coi dati non ancora salvati, con gli stessi stili del sito.

## Timeline in home

L'evento compare nella timeline "Il viaggio nel tempo" solo se ha un **anno storico** (negativo per gli a.C., es. `-1150`).

## Errori e ripensamenti

- **Cronologia**: il menu in alto elenca le versioni precedenti (le ultime 30), con data e nome. Scegline una: viene caricata nel modulo, poi **Salva** per ripristinarla.
- **Elimina** sposta l'evento in **Eliminati** (in fondo alla lista a sinistra): **Ripristina** e poi **Salva** per riaverlo.
- **Due moderatori sullo stesso evento**: se qualcuno ha salvato mentre lo modificavi, al salvataggio compare un avviso. Puoi **Sovrascrivere comunque** (la sua versione resta nella cronologia) oppure ricaricare la pagina.
- **Backup** scarica tutti gli eventi in un file: fallo ogni tanto, non costa niente.
