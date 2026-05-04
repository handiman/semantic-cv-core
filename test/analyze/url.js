import assert from "node:assert";
import { it } from "node:test";
import analyze, { Success } from "#core/analyze.js";

export default function () {
  const fieldName = "url";

  it("is optional", () => {
    const results = analyze(JSON.stringify({}));
    assert.deepStrictEqual(results[fieldName], Success);
  });

  it("must be a valid URL if specified", () => {
    for (const attemptedValue of [" ", "https:/invalid.url"]) {
      const results = analyze(
        JSON.stringify({
          url: attemptedValue
        })
      );
      assert.notDeepStrictEqual(results[fieldName], Success);
    }
  });
}
