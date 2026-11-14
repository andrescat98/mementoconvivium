# Guida per i moderatori

Indirizzo: **/admin** (es. https://mementoconvivium.andrescat98.workers.dev/admin). La password è la stessa per tutti: chiedila a chi gestisce il sito. Resti collegato per 7 giorni.

## Modificare un evento

1. Clicca l'evento nella colonna a sinistra.
2. Modifica i campi.
3. **Salva** (in alto a destra). Il sito pubblico si aggiorna subito; in rari casi serve fino a 5 minuti.

Se chiudi la pagina o cambi evento con modifiche non salvate, il browser te lo chiede prima.

## Nuovo evento

**+ Nuovo evento**, compila e salva. Obbligatori: titolo, slug, tema, durata, estratto.

- **Slug**: la parte finale dell'indirizzo (`/eventi/pirati`). Solo lettere minuscole, numeri e trattini. Se lo cambi, il vecchio link smette di funzionare.
- **Stato**:
  - `aperto`: bottone "Prenota ora"
  - `lista-attesa`: bottone "Lista d'attesa"
  - `chiuso`: "Prenotazioni chiuse"
  - `coming-soon`: compare in home e in lista, ma **senza pagina dedicata**

## Date

Aggiungi una riga per ogni serata. Il giorno della settimana ("Ven 19 Giu 2026") viene scritto in automatico. Le date passate restano visibili ma sbiadite; se tutte le date sono passate, il bottone di prenotazione nel riquadro "Dettagli" sparisce.

Se non ci sono date, la pagina mostra "Da annunciare" e usa **Luogo generico** e **Quota generica**.

## Racconto

Scrivi normalmente. Una riga vuota crea un nuovo paragrafo.

| Scrivi | Ottieni |
|---|---|
| `**testo**` | **grassetto** |
| `*testo*` | *corsivo* |
| `[Instagram](https://instagram.com/…)` | un link |

## Personaggi e immagini

Ogni personaggio ha nome, ruolo, indizio e (facoltativa) una foto. Scegli una foto dal telefono o dal computer: viene ridotta e caricata in automatico. Poi **ricorda di salvare l'evento**.

Con ↑ sposti un personaggio (o una data) più in alto, con ✕ lo rimuovi.

**Font nome nel ritratto**: il nome di un font di [Google Fonts](https://fonts.google.com) seguito da uno stile di riserva, es. `Rye, cursive`. Lascia vuoto per il font standard.

## Timeline in home

Gli eventi compaiono nella timeline "Il viaggio nel tempo" solo se hanno un **anno storico** (numero; negativo per gli anni a.C., es. `-1150`). L'etichetta è il testo mostrato (es. `1150 a.C.`).

## Eliminare

**Elimina** cancella l'evento definitivamente (viene chiesta conferma). Non si può annullare.
