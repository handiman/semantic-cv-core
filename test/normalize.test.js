import assert from "node:assert";
import { describe, test } from "node:test";
import {
  toSingle,
  toArray,
  removeUndefined,
  removeNull,
  removeEmpty
} from "#core/normalize.js";
import arrayValues from "./normalize/arrayValues.js";
import singleValues from "./normalize/singleValues.js";
import fixesType from "./normalize/fixType.js";
import fixesCasing from "./normalize/fixCasing.js";
import fixesTheme from "./normalize/fixTheme.js";
import trimsStrings from "./normalize/trim.js";
import keepsTheme from "./normalize/keepTheme.js";
import sorting from "./normalize/sorting.js";
import { fixesInvalidContext, removesRedundantContexts, addsMissingContext } from "./normalize/fixContext.js";

describe("Normalize", () => {
  fixesCasing();
  fixesType();
  fixesInvalidContext();
  fixesTheme();
  trimsStrings();
  keepsTheme();
  removesRedundantContexts();
  addsMissingContext();
  arrayValues();
  singleValues();
  sorting();
  describe("internals", () => {
    test("removeUndefined", () => {
      assert.deepStrictEqual(
        removeUndefined({
          name: "Henrik",
          jobTitle: undefined
        }),
        {
          name: "Henrik"
        }
      );
    });
    test("removeNull", () => {
      assert.deepStrictEqual(
        removeNull({
          name: "Henrik",
          jobTitle: null
        }),
        {
          name: "Henrik"
        }
      );
    });
    test("removeEmpty", () => {
      assert.deepStrictEqual(
        removeEmpty({
          name: "Henrik",
          jobTitle: ""
        }),
        {
          name: "Henrik"
        }
      );
    });
    test("removeEmpty keeps objects that have content", () => {
      const theme = { "@type": "Theme", name: "lena" };
      assert.deepStrictEqual(removeEmpty({ name: "Henrik", theme }), { name: "Henrik", theme });
    });
    test("removeEmpty removes empty objects and arrays", () => {
      assert.deepStrictEqual(removeEmpty({ name: "Henrik", theme: {}, skills: [] }), {
        name: "Henrik"
      });
    });
    describe("toSingle", () => {
      test("string", () => {
        const single = toSingle(["Hello", "World!"]);
        assert.strictEqual(single, "Hello");
      });
      test("object", () => {
        const single = toSingle([
          { "@type": "Person", name: "Henrik" },
          { "@type": "Person", name: "Becker" }
        ]);
        assert.deepStrictEqual(single, { "@type": "Person", name: "Henrik" });
      });
    });
    describe("toArray", () => {
      test("string", () => {
        assert.deepStrictEqual(toArray("Henrik"), ["Henrik"]);
      });
      test("object", () => {
        assert.deepStrictEqual(toArray({ name: "Henrik " }), [{ name: "Henrik " }]);
      });
    });
  });
});
