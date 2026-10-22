import assert from "node:assert";
import { describe, it } from "node:test";
import { languageOf } from "#core/language.js";
import normalize from "#core/normalize.js";
import analyze from "#core/analyze.js";
import renderHTML from "#core/render/html.js";

const semanticCV = ["https://schema.org", "https://semantic.cv/context/latest.jsonld"];

describe("languageOf", () => {
  it("reads the language from an { @language } entry in @context", () => {
    assert.strictEqual(
      languageOf({ "@context": ["https://schema.org", { "@language": "sv" }] }),
      "sv"
    );
    assert.strictEqual(languageOf({ "@context": { "@language": "en-GB" } }), "en-GB");
  });

  it("is undefined when the CV doesn't say", () => {
    assert.strictEqual(languageOf({ "@context": "https://schema.org" }), undefined);
    assert.strictEqual(languageOf({}), undefined);
    assert.strictEqual(languageOf(undefined), undefined);
  });

  it("ignores a value that isn't a language tag", () => {
    for (const value of ["", "s", "sv_SE", 'sv" onload="x', "<sv>", 42, null]) {
      assert.strictEqual(
        languageOf({ "@context": [{ "@language": value }] }),
        undefined,
        String(value)
      );
    }
  });

  it("ignores @language outside @context, which isn't valid JSON-LD on a node", () => {
    assert.strictEqual(languageOf({ "@language": "sv" }), undefined);
  });
});

describe("normalize", () => {
  it("keeps the language of the CV in @context", () => {
    const person = normalize({
      "@context": ["https://schema.org", { "@language": "sv" }],
      name: "Ada"
    });
    assert.deepStrictEqual(person["@context"], [...semanticCV, { "@language": "sv" }]);
  });

  it("leaves @context as before when the CV has no language", () => {
    assert.deepStrictEqual(normalize({ name: "Ada" })["@context"], semanticCV);
  });

  it("drops a language that isn't a language tag", () => {
    const person = normalize({ "@context": [{ "@language": "<script>" }], name: "Ada" });
    assert.deepStrictEqual(person["@context"], semanticCV);
  });

  it("gives the same result when run again", () => {
    const once = normalize({ "@context": { "@language": "sv" }, name: "Ada" });
    assert.deepStrictEqual(normalize(once), once);
  });
});

describe("analyze", () => {
  const contextResult = (context) =>
    analyze(JSON.stringify({ "@context": context, "@type": "Person", name: "Ada" }))["@context"];

  it("accepts the known contexts with a language", () => {
    for (const context of [
      ["https://schema.org", { "@language": "sv" }],
      [...semanticCV, { "@language": "en-GB" }],
      ["https://schema.org", "https://semantic.cv/context/1.0.jsonld", { "@language": "sv" }]
    ]) {
      assert.deepStrictEqual(contextResult(context).errors, [], JSON.stringify(context));
    }
  });

  it("still accepts the known contexts without a language", () => {
    assert.deepStrictEqual(contextResult("https://schema.org").errors, []);
    assert.deepStrictEqual(contextResult(semanticCV).errors, []);
  });

  it("reports a language that isn't a language tag", () => {
    assert.match(
      contextResult(["https://schema.org", { "@language": "Swedish" }]).errors[0],
      /language tag/
    );
  });

  it("reports an unknown context, with or without a language", () => {
    assert.ok(contextResult("https://example.com").errors.length);
    assert.ok(contextResult(["https://example.com", { "@language": "sv" }]).errors.length);
  });
});

describe("renderHTML", () => {
  // The JSON-LD between the opening and the closing tag of the script element renderHTML writes.
  const jsonIn = (script) =>
    JSON.parse(script.slice(script.indexOf(">") + 1, script.lastIndexOf("</")));
  // Records what renderHTML asks the transformer to do with each element.
  const render = async (person) => {
    const hooks = [];
    const transformer = {
      on(selector, handler) {
        hooks.push({ selector, handler });
        return transformer;
      },
      async transform() {
        return "";
      }
    };
    const theme = {
      id: "test",
      renderHTML: async () => "",
      renderCSS: async () => "",
      renderJS: async () => ""
    };
    await renderHTML({ person, theme, transformer });
    const run = (selector) => {
      const calls = [];
      const element = new Proxy(
        {},
        {
          get:
            (_, name) =>
            (...args) =>
              calls.push([name, ...args])
        }
      );
      hooks
        .filter((hook) => hook.selector === selector)
        .forEach((hook) => hook.handler.element(element));
      return calls;
    };
    return { run };
  };
  const swedish = normalize({
    "@context": { "@language": "sv" },
    name: "Ada",
    jobTitle: "Utvecklare"
  });
  const unknown = normalize({ name: "Ada", jobTitle: "Developer" });

  it("sets <html lang> to the language of the CV", async () => {
    const { run } = await render(swedish);
    assert.deepStrictEqual(run("html"), [["setAttribute", "lang", "sv"]]);
  });

  it("leaves <html lang> out when the CV has no language", async () => {
    const { run } = await render(unknown);
    assert.deepStrictEqual(run("html"), []);
  });

  it("keeps the language in the JSON-LD on the page", async () => {
    const { run } = await render(swedish);
    const [, json] = run('head script[type="application/ld+json"]').find(
      ([name]) => name === "replace"
    );
    const ld = jsonIn(json);
    assert.deepStrictEqual(ld["@context"], ["https://schema.org", { "@language": "sv" }]);
  });

  it("publishes plain schema.org as the context when the CV has no language", async () => {
    const { run } = await render(unknown);
    const [, json] = run('head script[type="application/ld+json"]').find(
      ([name]) => name === "replace"
    );
    const ld = jsonIn(json);
    assert.strictEqual(ld["@context"], "https://schema.org");
  });
});
