import assert from "node:assert";
import { it } from "node:test";
import normalize from "#core/normalize.js";

export default () =>
  it("changes @theme to theme", () => {
    const themeId = "lena";
    const person = normalize({
      "@theme": themeId
    });
    assert.strictEqual(person["@theme"], undefined);
    assert.strictEqual(person.theme, themeId);
  });
