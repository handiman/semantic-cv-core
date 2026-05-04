import assert from "node:assert";
import { it } from "node:test";
import analyze, { Success } from "#core/analyze.js";

export default function () {
  const fieldName = "@type";

  it("must be present", () => {
    const results = analyze(JSON.stringify({}));
    assert.notDeepStrictEqual(results[fieldName], Success);
  });

  it('must be "Person"', () => {
    const results = analyze(
      JSON.stringify({
        "@type": "Person"
      })
    );
    assert.deepStrictEqual(results[fieldName], Success);
  });

  it('must not be anything but "Person"', () => {
    for (const attemptedValue of [
      "",
      "  ",
      null,
      undefined,
      "s",
      " Person ",
      "PERSON",
      "Organization",
      "WebSite"
    ]) {
      const results = analyze(
        JSON.stringify({
          "@type": attemptedValue
        })
      );
      assert.notDeepStrictEqual(results[fieldName], Success);
    }
  });
}
