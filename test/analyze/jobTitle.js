import assert from "node:assert";
import { it } from "node:test";
import analyze, { Success } from "#core/analyze.js";

export default function () {
  const fieldName = "jobTitle";

  it("is mandatory", () => {
    for (const attemptedValue of [null, undefined, ""]) {
      const results = analyze(
        JSON.stringify({
          jobTitle: attemptedValue
        })
      );
      assert.notDeepStrictEqual(results[fieldName], Success);
    }
  });
}
