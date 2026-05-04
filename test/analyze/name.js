import assert from "node:assert";
import { it } from "node:test";
import analyze, { Success } from "#core/analyze.js";

export default function () {
  const fieldName = "name";

  it("is mandatory", () => {
    for (const attemptedValue of [null, undefined, ""]) {
      const results = analyze(
        JSON.stringify({
          name: attemptedValue
        })
      );
      assert.notDeepStrictEqual(results[fieldName], Success);
    }
  });
}
