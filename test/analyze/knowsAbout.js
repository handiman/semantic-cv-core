import assert from "node:assert";
import { it } from "node:test";
import analyze, { Success } from "#core/analyze.js";

export default function () {
  const fieldName = "knowsAbout";

  it("is optional", () => {
    const results = analyze(JSON.stringify({}));
    assert.deepStrictEqual(results[fieldName], Success);
  });

  it("is recommended that it contains at least one item", () => {
    const results = analyze(
      JSON.stringify({
        knowsAbout: []
      })
    );
    assert.notDeepStrictEqual(results[fieldName], Success);
  });

  it("must only contain strings", () => {
    for (const attemptedValue of [1, null, undefined]) {
      const results = analyze(
        JSON.stringify({
          knowsAbout: ["Valid", attemptedValue]
        })
      );
      assert.notDeepStrictEqual(results[fieldName], Success);
    }
  });
}
