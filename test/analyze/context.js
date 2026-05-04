import assert from "node:assert";
import { it } from "node:test";
import analyze, { Success } from "#core/analyze.js";

export default function () {
  const fieldName = "@context";

  it("must be present", () => {
    const results = analyze(JSON.stringify({}));
    assert.notDeepStrictEqual(results[fieldName], Success);
  });

  for (const version of ["latest", "1.0"]) {
    it(`can be  ["https://schema.org", "https://semantic.cv/context/${version}.jsonld" ]`, () => {
      const results = analyze(
        JSON.stringify({
          "@context": [`https://schema.org`, `https://semantic.cv/context/${version}.jsonld`]
        })
      );
      assert.deepStrictEqual(results[fieldName], Success);
    });
  }

  /**
   * Semantic-cv 0.1.* version that didn't have its own vocab.
   */
  it('can be "https://schema.org" for backwards compatibility', () => {
    const results = analyze(
      JSON.stringify({
        "@context": "https://schema.org"
      })
    );
    assert.deepStrictEqual(results[fieldName], Success);
  });
}
