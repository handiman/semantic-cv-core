import assert from "node:assert";
import { it } from "node:test";
import analyze, { Success } from "#core/analyze.js";

export default function () {
  const fieldName = "sameAs";

  it("is optional", () => {
    const results = analyze(JSON.stringify({}));
    assert.deepStrictEqual(results[fieldName], Success);
  });

  it("is recommended that it contains at least one url", () => {
    const results = analyze(
      JSON.stringify({
        sameAs: []
      })
    );
    assert.notDeepStrictEqual(results[fieldName], Success);
  });

  it("must only contain urls", () => {
    for (const attemptedValue of [null, undefined, "", " ", "https:/invalid.url"]) {
      const results = analyze(
        JSON.stringify({
          sameAs: [attemptedValue]
        })
      );
      assert.notDeepStrictEqual(results[fieldName], Success);
    }
  });
}
