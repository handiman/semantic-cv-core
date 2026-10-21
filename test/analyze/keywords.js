import assert from "node:assert";
import { it } from "node:test";
import analyze, { Success } from "#core/analyze.js";

export default function () {
  const fieldName = "keywords";
  const roleWith = (keywords) => ({
    worksFor: [{ "@type": "Role", roleName: "Developer", keywords }]
  });

  it("is optional", () => {
    const results = analyze(JSON.stringify({}));
    assert.deepStrictEqual(results[fieldName], Success);
  });

  it("is optional on a role too", () => {
    const results = analyze(JSON.stringify(roleWith(undefined)));
    assert.deepStrictEqual(results[fieldName], Success);
  });

  it("is valid as a list of objects", () => {
    const results = analyze(
      JSON.stringify(roleWith([{ "@type": "DefinedTerm", name: "Azure Service Bus" }]))
    );
    assert.deepStrictEqual(results[fieldName], Success);
  });

  it("must be a list", () => {
    for (const attemptedValue of ["TypeScript", { name: "TypeScript" }, 1]) {
      const results = analyze(JSON.stringify(roleWith(attemptedValue)));
      assert.notDeepStrictEqual(results[fieldName], Success);
    }
  });

  it("must only contain objects", () => {
    for (const attemptedValue of ["TypeScript", 1]) {
      const results = analyze(JSON.stringify(roleWith([{ name: "Valid" }, attemptedValue])));
      assert.notDeepStrictEqual(results[fieldName], Success);
    }
  });

  it("says which role the error is in", () => {
    const results = analyze(
      JSON.stringify({ worksFor: [{ keywords: [{ name: "Valid" }] }, { keywords: "TypeScript" }] })
    );
    assert.deepStrictEqual(results[fieldName].errors, ["worksFor[1]: Should be a list"]);
  });
}
