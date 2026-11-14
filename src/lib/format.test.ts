import assert from "node:assert/strict";
import { test } from "node:test";
import { dateLabel, md } from "./format.ts";

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
