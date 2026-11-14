const fmt = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-06-19" → "Ven 19 Giu 2026" */
export const dateLabel = (iso: string) =>
  fmt.format(new Date(iso)).replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());

export const today = () => new Date().toISOString().slice(0, 10);

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Markdown minimo per il racconto degli eventi: paragrafi, **grassetto**, *corsivo*,
 * [link](https://…). L'HTML in input viene sempre escapato.
 * ponytail: niente liste/titoli; se servono, usare `marked`.
 */
export const md = (src: string) =>
  src
    .trim()
    .split(/\n\s*\n/)
    .map(
      (p) =>
        `<p>${esc(p.trim())
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
          .replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
