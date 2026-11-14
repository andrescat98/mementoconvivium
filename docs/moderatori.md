# Guida per i moderatori

Indirizzo: **/admin** (es. https://mementoconvivium.pages.dev/admin). La password è la stessa per tutti: chiedila a chi gestisce il sito. Resti collegato per 7 giorni.

**Prima cosa:** scrivi il tuo nome in alto ("Il tuo nome"). Finisce nella cronologia, così si sa chi ha cambiato cosa. Il browser lo ricorda.

## Modificare un evento

1. Clicca l'evento a sinistra (puoi cercarlo per nome). La lista è ordinata per prossima data.
2. Modifica i campi. Accanto al titolo compare **● Non salvato**.
3. **Salva** (oppure **Ctrl+S**). Il sito pubblico si aggiorna subito; in rari casi serve fino a 5 minuti.

Se chiudi la pagina o cambi evento con modifiche non salvate, il browser te lo chiede prima.

Le sezioni (Base, Racconto, Date…) si chiudono cliccando sul titolo, per lavorare su una alla volta.

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

**+ Aggiungi data** copia luogo e quota dall'ultima data. Il giorno della settimana ("Ven 19 Giu 2026") si scrive da solo sotto la data: controllalo. Le date si mettono in ordine da sole al salvataggio. Le date passate restano visibili ma sbiadite; se tutte le date sono passate, il bottone di prenotazione nel riquadro "Dettagli" sparisce.

Senza date la pagina mostra "Da annunciare" con **Luogo generico** e **Quota generica**.

## Racconto

Scrivi normalmente; una riga vuota crea un nuovo paragrafo. Seleziona del testo e usa **G** (grassetto), **C** (corsivo) o **Link**. **Anteprima** mostra il testo come apparirà sul sito.

## Personaggi e foto

Trascina una foto sul riquadro del personaggio, oppure clicca "sceglila". Viene ridotta e caricata in automatico; poi **salva**. ↑ ↓ cambiano l'ordine, ✕ rimuove.

**Font del nome nel ritratto**: un font di [Google Fonts](https://fonts.google.com) seguito da uno stile di riserva, es. `Rye, cursive`. Sotto vedi l'anteprima col nome del primo personaggio.

## Timeline in home

L'evento compare nella timeline "Il viaggio nel tempo" solo se ha un **anno storico** (negativo per gli a.C., es. `-1150`).

## Errori e ripensamenti

- **Cronologia**: il menu in alto elenca le versioni precedenti (le ultime 30), con data e nome. Scegline una: viene caricata nel modulo, poi **Salva** per ripristinarla.
- **Elimina** sposta l'evento in **Eliminati** (in fondo alla lista a sinistra): **Ripristina** e poi **Salva** per riaverlo.
- **Due moderatori sullo stesso evento**: se qualcuno ha salvato mentre lo modificavi, al salvataggio compare un avviso. Puoi **Sovrascrivere comunque** (la sua versione resta nella cronologia) oppure ricaricare la pagina.
- **Backup** scarica tutti gli eventi in un file: fallo ogni tanto, non costa niente.
