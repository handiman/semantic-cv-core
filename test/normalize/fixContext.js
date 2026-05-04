import assert from "node:assert";
import { it, test } from "node:test";
import normalize from "#core/normalize.js";

const rootContext = ["https://schema.org", "https://semantic.cv/context/latest.jsonld"];

export function fixesInvalidContext() {
  it("automatically fixes invalid @context", () => {
    const person = normalize({
      "@context": "Wrong"
    });
    assert.deepStrictEqual(person["@context"], rootContext);
  });
}

export function addsMissingContext() {
  it("automatically adds missing @context", () => {
    const person = normalize({
      name: "Henrik Becker",
      worksFor: [
        {
          name: "Henrik Becker Consulting AB"
        }
      ],
      alumniOf: [
        {
          name: "KomVux"
        }
      ],
      lifeEvent: [
        {
          name: "Was born"
        }
      ]
    });
    assert.deepStrictEqual(person["@context"], rootContext);
    // Having @context on the root object is enough.
    assert.strictEqual(Object.keys(person.worksFor[0]).includes("@context"), false);
    assert.strictEqual(Object.keys(person.alumniOf[0]).includes("@context"), false);
    assert.strictEqual(Object.keys(person.lifeEvent[0]).includes("@context"), false);
  });
}

export function removesRedundantContexts() {
  it("does not remove @context from root object (Person)", () => {
    const person = normalize({
      "@context": rootContext
    });
    assert.deepStrictEqual(person["@context"], rootContext);
  });
  it("automatically removes redundant @context from", () => {
    test("worksFor", () => {
      const { worksFor } = normalize({
        worksFor: [
          {
            "@context": rootContext,
            worksFor: {
              "@context": rootContext
            }
          }
        ]
      });
      assert.strictEqual(Object.keys(worksFor[0]).includes("@context"), false);
      assert.strictEqual(Object.keys(worksFor[0].worksFor).includes("@context"), false);
    });

    test("alumniOf", () => {
      const { alumniOf } = normalize({
        alumniOf: [
          {
            "@context": rootContext,
            alumniOf: {
              "@context": rootContext
            }
          }
        ]
      });
      assert.strictEqual(Object.keys(alumniOf[0]).includes("@context"), false);
      assert.strictEqual(Object.keys(alumniOf[0].alumniOf).includes("@context"), false);
    });

    test("hasCertification", () => {
      const { hasCertification } = normalize({
        hasCertification: [
          {
            "@context": rootContext
          }
        ]
      });
      assert.strictEqual(Object.keys(hasCertification).includes("@context"), false);
    });

    test("hasCredential", () => {
      const { hasCredential } = normalize({
        hasCredential: [
          {
            "@context": rootContext
          }
        ]
      });
      assert.strictEqual(Object.keys(hasCredential).includes("@context"), false);
    });

    test("lifeEvent", () => {
      const { lifeEvent } = normalize({
        lifeEvent: [
          {
            "@context": rootContext
          }
        ]
      });
      assert.strictEqual(Object.keys(lifeEvent).includes("@context"), false);
    });
  });
}
