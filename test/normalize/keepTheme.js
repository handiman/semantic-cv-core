import assert from "node:assert";
import { it } from "node:test";
import normalize from "#core/normalize.js";

export default () =>
  it("keeps a theme given as an object", () => {
    const theme = { "@type": "Theme", name: "lena" };
    const person = normalize({ name: "Yoda", theme });
    assert.deepStrictEqual(person.theme, theme);
  });
