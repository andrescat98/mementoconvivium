import assert from "node:assert/strict";
import { test } from "node:test";
import { bookCta, bookHref, dateLabel, googleFontsHref, imgStyle, look, md, pageBg, tabLooks, slugify, today, upgradeTab, veil, videoEmbed } from "./format.ts";

test("dateLabel", () => {
  assert.equal(dateLabel("2026-06-19"), "Ven 19 Giu 2026");
  assert.equal(dateLabel("2027-01-10"), "Dom 10 Gen 2027");
});

test("md: paragrafi, enfasi, link, escape", () => {
  assert.equal(md("a **b** *c*\nd\n\ne"), "<p>a <strong>b</strong> <em>c</em><br>d</p><p>e</p>");
  assert.equal(md("[x](https://a.it?q=1&r=2)"), '<p><a href="https://a.it?q=1&#38;r=2">x</a></p>');
  assert.equal(md('<script>"'), "<p>&#60;script&#62;&#34;</p>");
  assert.equal(md("[x](javascript:alert(1))"), "<p>[x](javascript:alert(1))</p>");
  assert.equal(
    md("## Titolo\n\n### Sotto\n\n- uno\n- **due**\n\n1. a\n2. b\n\n> cit\n> ancora\n\n---\n\n__s__ ~~b~~"),
    "<h3>Titolo</h3><h4>Sotto</h4><ul><li>uno</li><li><strong>due</strong></li></ul><ol><li>a</li><li>b</li></ol><blockquote>cit<br>ancora</blockquote><hr><p><u>s</u> <s>b</s></p>",
  );
  assert.equal(md("{centro}## T\n\n{destra}a **b**\n\n{giustificato}- x\n- y\n\n{x}z"), '<h3 style="text-align:center">T</h3><p style="text-align:right">a <strong>b</strong></p><ul style="text-align:justify"><li>x</li><li>y</li></ul><p>{x}z</p>');
  assert.equal(md("a ![b](/img/12) c"), '<p>a <img src="/img/12" alt="b" loading="lazy"> c</p>');
  assert.equal(md("![x](https://evil.it/a.png)"), '<p>!<a href="https://evil.it/a.png">x</a></p>'); // immagini esterne: mai <img>
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
  assert.deepEqual(look(undefined), { "data-anim": undefined, "data-fx": undefined, "data-deco": undefined, "data-pad": undefined, "data-font": undefined, "data-size": undefined, "data-h": undefined, "data-vpos": undefined, "data-align": undefined, "data-w": undefined, "data-lh": undefined, "data-fs": undefined, "data-ps": undefined, "data-parallax": undefined, style: undefined });
  const l = look({ anim: "sali", font: "Rye, cursive", size: 1.2, text: "#ffffff", parallax: true });
  assert.equal(l["data-anim"], "sali");
  assert.equal(l["data-font"], "");
  assert.equal(l["data-parallax"], undefined); // parallasse solo con immagine
  assert.match(l.style!, /--cream:#ffffff;.*--sez-font:Rye, cursive;--sez-zoom:1.2$/);
  const h = look({ height: 60 });
  assert.equal(h["data-h"], "");
  assert.equal(h.style, "--sez-h:60svh");
  assert.equal(look({ lh: 2, fs: 1.2, align: "centro" }).style, "--sez-lh:2;--sez-fs:1.2");
  assert.equal(pageBg(undefined), undefined);
  assert.equal(pageBg({ color: "#000000", op: 60 }), "linear-gradient(rgb(245 242 236 / 40%),rgb(245 242 236 / 40%)),#000000");
  const tl = tabLooks({ heroStyle: { color: "#111111", height: 100, image: { src: "/img/1" } }, background: { text: "#ffffff" }, tabs: [{}, { background: { color: "#222222" } }] });
  assert.deepEqual(tl, [{ color: "#111111", text: "#ffffff" }, { color: "#222222", text: "#ffffff" }]);
  assert.equal(tabLooks({ tabs: [{}] })[0], undefined);
  assert.equal(pageBg({ color: "#000000" }), "#000000");
  assert.equal(pageBg({ image: { src: "/img/1", x: 20, y: 30 }, veil: 40, dark: true, color: "#111111" }), 'linear-gradient(rgb(20 17 14 / 40%),rgb(20 17 14 / 40%)),url("/img/1") 20% 30% / cover no-repeat,#111111');
  assert.equal(veil({ veil: 40, dark: true }), "rgb(20 17 14 / 40%)");
});

test("videoEmbed", () => {
  const id = "dQw4w9WgXcQ";
  for (const u of [`https://www.youtube.com/watch?v=${id}`, `https://youtu.be/${id}`, `https://youtube.com/watch?t=3&v=${id}`, `https://www.youtube.com/shorts/${id}`])
    assert.equal(videoEmbed(u), `https://www.youtube-nocookie.com/embed/${id}`);
  assert.equal(videoEmbed("https://vimeo.com/76979871"), "https://player.vimeo.com/video/76979871");
  assert.equal(videoEmbed("https://example.com/x"), undefined);
  assert.equal(videoEmbed(undefined), undefined);
});

test("upgradeTab", () => {
  const img = { src: "/img/1" };
  assert.deepEqual(upgradeTab({ title: "La storia", template: "testo", body: "x", image: img }), { title: "La storia", background: undefined, blocks: [{ type: "testo", body: "x", image: img }] });
  const nuova = { title: "T", blocks: [] };
  assert.equal(upgradeTab(nuova), nuova);
});
