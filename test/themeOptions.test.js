import assert from "node:assert";
import { describe, it } from "node:test";
import { themeOptionsOf } from "#core/themeOptions.js";
import normalize from "#core/normalize.js";
import analyze from "#core/analyze.js";

const withTheme = (theme) => ({ name: "Ada", theme });

describe("themeOptionsOf", () => {
  it("gives the headings and labels the CV sets in its theme", () => {
    const options = themeOptionsOf(
      withTheme({
        "@type": "Theme",
        name: "lena",
        headings: { worksFor: "Uppdrag", skills: "Verktyg" },
        labels: { present: "nu" }
      })
    );
    assert.deepStrictEqual(options, {
      headings: { worksFor: "Uppdrag", skills: "Verktyg" },
      labels: { present: "nu" }
    });
  });

  it("escapes them, since themes insert them as HTML", () => {
    const options = themeOptionsOf(
      withTheme({
        headings: { worksFor: `<img src=x onerror="alert(1)">`, skills: "R&D" },
        labels: { present: "'now'" }
      })
    );
    assert.strictEqual(options.headings.worksFor, "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    assert.strictEqual(options.headings.skills, "R&amp;D");
    assert.strictEqual(options.labels.present, "&#39;now&#39;");
  });

  it("leaves out unknown keys, values that aren't text, and blank values", () => {
    const options = themeOptionsOf(
      withTheme({
        headings: { worksFor: "Uppdrag", hobbies: "Fritid", skills: 42, projects: "  " },
        labels: { present: ["nu"] }
      })
    );
    assert.deepStrictEqual(options, { headings: { worksFor: "Uppdrag" } });
  });

  it("trims the values", () => {
    assert.deepStrictEqual(themeOptionsOf(withTheme({ headings: { worksFor: "  Uppdrag " } })), {
      headings: { worksFor: "Uppdrag" }
    });
  });

  it("is undefined when the theme sets nothing", () => {
    for (const person of [
      { name: "Ada" },
      withTheme("lena"),
      withTheme({ name: "lena" }),
      withTheme({ headings: "Uppdrag" }),
      withTheme({ headings: {}, labels: { unknown: "x" } }),
      undefined
    ]) {
      assert.strictEqual(themeOptionsOf(person), undefined, JSON.stringify(person));
    }
  });
});

describe("normalize", () => {
  it("keeps the headings and labels of a theme object", () => {
    const theme = {
      "@type": "Theme",
      name: "lena",
      headings: { worksFor: "Uppdrag" },
      labels: { present: "nu" }
    };
    assert.deepStrictEqual(normalize(withTheme(theme)).theme, theme);
  });
});

describe("analyze", () => {
  const themeResult = (theme) =>
    analyze(
      JSON.stringify({ "@context": "https://schema.org", "@type": "Person", name: "Ada", theme })
    ).theme;

  it("accepts known headings and labels with text", () => {
    assert.deepStrictEqual(
      themeResult({ name: "lena", headings: { worksFor: "Uppdrag" }, labels: { present: "nu" } })
        .warnings,
      []
    );
  });

  it("warns about an unknown heading or label", () => {
    const { warnings } = themeResult({
      headings: { hobbies: "Fritid" },
      labels: { future: "snart" }
    });
    assert.strictEqual(warnings.length, 2);
    assert.match(warnings[0], /theme\.headings\.hobbies is unknown/);
    assert.match(warnings[1], /theme\.labels\.future is unknown/);
  });

  it("warns about a value that isn't text, and about headings that aren't an object", () => {
    assert.match(themeResult({ headings: { worksFor: 42 } }).warnings[0], /must be text/);
    assert.match(themeResult({ headings: "Uppdrag" }).warnings[0], /must be an object/);
  });

  it("says nothing about a theme given as a name", () => {
    assert.strictEqual(themeResult("lena"), undefined);
  });
});
