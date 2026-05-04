import assert from "node:assert";
import { describe, it, test } from "node:test";
import analyze, { Success } from "#core/analyze.js";

const invalid = [" ", "https://this.is.definitely.not.an.email.address", "john.doe.com"];
const valid = ["semantikitten@semantic.cv"];

export default function () {
  const fieldName = "email";

  it("is optional", () => {
    const results = analyze(JSON.stringify({}));
    assert.deepStrictEqual(results[fieldName], Success);
  });

  describe("must be a valid email address if specified", () => {
    for (const attemptedValue of invalid) {
      test(`invalid: "${attemptedValue}"`, () => {
        const results = analyze(
          JSON.stringify({
            email: attemptedValue
          })
        );
        assert.notDeepStrictEqual(results[fieldName], Success);
      });
    }
    for (const attemptedValue of valid) {
      test(`valid: "${attemptedValue}"`, () => {
        const results = analyze(
          JSON.stringify({
            email: attemptedValue
          })
        );
        assert.deepStrictEqual(results[fieldName], Success);
      });
    }
  });
}
