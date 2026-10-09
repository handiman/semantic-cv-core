import assert from "node:assert";
import { describe, it } from "node:test";
import {
  escapeHtml,
  safeUrl,
  escapeForHtml,
  jsonForScript,
  commentSafe
} from "#core/render/escape.js";

describe("escapeHtml", () => {
  it("escapes the five HTML special characters", () => {
    assert.strictEqual(escapeHtml(`<a href="x" title='y'>&</a>`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  });
  it("turns null and undefined into an empty string", () => {
    assert.strictEqual(escapeHtml(undefined), "");
    assert.strictEqual(escapeHtml(null), "");
  });
});

describe("safeUrl", () => {
  for (const url of [
    "https://semantic.cv",
    "http://example.com/a?b=1&c=2",
    "mailto:someone@example.com",
    "tel:+46123456789",
    "me.jpg",
    "/images/me.jpg",
    "www.example.com"
  ]) {
    it(`allows ${url}`, () => assert.strictEqual(safeUrl(url), url));
  }
  for (const url of [
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "  javascript:alert(1)",
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    "\u0001javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)"
  ]) {
    it(`rejects ${JSON.stringify(url)}`, () => assert.strictEqual(safeUrl(url), undefined));
  }
});

describe("escapeForHtml", () => {
  const person = {
    "@type": "Person",
    name: `</title><script>alert(1)</script>`,
    description: `" onmouseover="alert(1)`,
    url: "javascript:alert(1)",
    sameAs: ["https://github.com/handiman", "javascript:alert(2)"],
    image: { "@type": "ImageObject", url: "data:image/svg+xml,<svg onload=alert(1)>" },
    worksFor: [{ "@type": "EmployeeRole", startDate: "2020-01", worksFor: { name: "A & B" } }],
    knowsAbout: ["JavaScript: The Good Parts"],
    numberOfEmployees: 3,
    isAccessibleForFree: true
  };
  const safe = escapeForHtml(person);

  it("does not modify the input", () => {
    assert.strictEqual(person.name, `</title><script>alert(1)</script>`);
  });
  it("escapes strings at every depth", () => {
    assert.strictEqual(safe.name, "&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
    assert.strictEqual(safe.description, "&quot; onmouseover=&quot;alert(1)");
    assert.strictEqual(safe.worksFor[0].worksFor.name, "A &amp; B");
  });
  it("removes unsafe URLs from URL keys", () => {
    assert.strictEqual("url" in safe, false);
    assert.deepStrictEqual(safe.sameAs, ["https://github.com/handiman"]);
    assert.deepStrictEqual(safe.image, { "@type": "ImageObject" });
  });
  it("leaves other keys that merely look like URLs alone", () => {
    assert.deepStrictEqual(safe.knowsAbout, ["JavaScript: The Good Parts"]);
  });
  it("keeps non-string values", () => {
    assert.strictEqual(safe.numberOfEmployees, 3);
    assert.strictEqual(safe.isAccessibleForFree, true);
    assert.strictEqual(safe.worksFor[0].startDate, "2020-01");
  });
});

describe("jsonForScript", () => {
  it("cannot close the script element", () => {
    const json = jsonForScript({ description: "</script><script>alert(1)</script><!--" });
    assert.strictEqual(json.includes("<"), false);
    assert.strictEqual(json.includes(">"), false);
  });
  it("round-trips through JSON.parse", () => {
    const data = { description: "</script> & <!-- \u2028" };
    assert.deepStrictEqual(JSON.parse(jsonForScript(data)), data);
  });
});

describe("commentSafe", () => {
  it("cannot close the comment", () => {
    const text = commentSafe("x --> <script>alert(1)</script> --!>");
    assert.strictEqual(text.includes("--"), false);
    assert.strictEqual(text.includes(">"), false);
  });
});
