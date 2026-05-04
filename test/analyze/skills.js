import assert from "node:assert";
import { it } from "node:test";
import analyze, { Success } from "#core/analyze.js";

export default function () {
  const fieldName = "skills";

  it("is optional", () => {
    const results = analyze(JSON.stringify({}));
    assert.deepStrictEqual(results[fieldName], Success);
  });

  it("must only contain strings", () => {
    for (const attemptedValue of [1, null, undefined]) {
      const results = analyze(
        JSON.stringify({
          skills: ["Valid", attemptedValue]
        })
      );
      assert.notDeepStrictEqual(results[fieldName], Success);
    }
  });
}
