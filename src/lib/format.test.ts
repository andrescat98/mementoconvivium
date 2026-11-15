import assert from "node:assert/strict";
import { test } from "node:test";
import { bookCta, bookHref, dateLabel, googleFontsHref, imgStyle, look, md, slugify, today, veil } from "./format.ts";

test("dateLabel", () => {
  assert.equal(dateLabel("2026-06-19"), "Ven 19 Giu 2026");
  assert.equal(dateLabel("2027-01-10"), "Dom 10 Gen 2027");
});

test("md: paragrafi, enfasi, link, escape", () => {
  assert.equal(md("a **b** *c*\nd\n\ne"), "<p>a <strong>b</strong> <em>c</em><br>d</p><p>e</p>");
  assert.equal(md("[x](https://a.it?q=1&r=2)"), '<p><a href="https://a.it?q=1&#38;r=2">x</a></p>');
  assert.equal(md('<script>"'), "<p>&#60;script&#62;&#34;</p>");
  assert.equal(md("[x](javascript:alert(1))"), "<p>[x](javascript:alert(1))</p>");
});

test("imgStyle: punto focale, zoom solo se > 1", () => {
  assert.equal(imgStyle(undefined), "");
  assert.equal(imgStyle({ src: "/a" }, 0), "object-position:50% 0%;transform-origin:50% 0%");
  assert.equal(imgStyle({ src: "/a", x: 20, y: 80, zoom: 1.5 }), "object-position:20% 80%;transform-origin:20% 80%;transform:scale(1.5)");
});

test("googleFontsHref: un solo URL, senza i font del sito", () => {
  assert.equal(googleFontsHref("Cinzel, serif", undefined), undefined);
  assert.equal(googleFontsHref("Rye, cursive", "'IM Fell English', serif", "Rye"), "https://fonts.googleapis.com/css2?family=Rye&family=IM+Fell+English&display=swap");
});

test("slugify e bookHref", () => {
  assert.equal(slugify("Gli abiti dell'epoca"), "gli-abiti-dell-epoca");
  assert.equal(slugify("Città è"), "citta-e");
  assert.equal(bookHref({ email: "a@b.it" }, "Roma"), "mailto:a@b.it?subject=Prenotazione%3A%20Roma");
  assert.equal(bookHref({ email: "a@b.it", bookingUrl: "https://x.it" }, "Roma"), "https://x.it");
});

test("bookCta: niente bottone se chiuso o con sole date passate", () => {
  const s = { email: "a@b.it" };
  const futura = "2999-01-01";
  assert.equal(bookCta({ title: "X", status: "chiuso" }, s), undefined);
  assert.equal(bookCta({ title: "X", status: "aperto", dates: [{ dateISO: "2000-01-01" }] }, s), undefined);
  assert.deepEqual(bookCta({ title: "X", status: "aperto", dates: [{ dateISO: futura }] }, s)?.cls, "btn-primary");
  assert.equal(bookCta({ title: "X", status: "lista-attesa" }, s)?.label, "Lista d'attesa");
  assert.ok(today() < futura);
});

test("look e veil", () => {
  assert.deepEqual(look(undefined), { "data-anim": undefined, "data-fx": undefined, "data-pad": undefined, "data-font": undefined, "data-size": undefined, "data-parallax": undefined, style: undefined });
  const l = look({ anim: "sali", font: "Rye, cursive", size: 1.2, text: "#ffffff", parallax: true });
  assert.equal(l["data-anim"], "sali");
  assert.equal(l["data-font"], "");
  assert.equal(l["data-parallax"], undefined); // parallasse solo con immagine
  assert.match(l.style!, /--cream:#ffffff;.*--sez-font:Rye, cursive;--sez-zoom:1.2$/);
  assert.equal(veil({ veil: 40, dark: true }), "rgb(20 17 14 / 40%)");
});
