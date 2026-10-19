import assert from "node:assert";
import { describe, it } from "node:test";
import normalize from "#core/normalize.js";

export default () =>
  describe("trims surrounding whitespace", () => {
    it("from top-level strings", () => {
      const person = normalize({ name: "  Yoda\n", jobTitle: "\tJedi Master " });
      assert.strictEqual(person.name, "Yoda");
      assert.strictEqual(person.jobTitle, "Jedi Master");
    });

    it("from strings in arrays", () => {
      const person = normalize({ name: "Yoda", skills: [" The Force ", "  Lightsaber"] });
      assert.deepStrictEqual(person.skills, ["The Force", "Lightsaber"]);
    });

    it("from nested objects", () => {
      const person = normalize({
        name: "Yoda",
        worksFor: [
          { roleName: " Master ", worksFor: { "@type": "Organization", name: "  Jedi Order " } }
        ]
      });
      const [role] = person.worksFor;
      assert.strictEqual(role.roleName, "Master");
      assert.strictEqual(role.worksFor.name, "Jedi Order");
    });

    it("but keeps whitespace inside a string", () => {
      const person = normalize({ name: "Yoda", description: "  Small,\n  green.  " });
      assert.strictEqual(person.description, "Small,\n  green.");
    });

    it("and drops a string that is only whitespace", () => {
      const person = normalize({ name: "Yoda", jobTitle: "   " });
      assert.strictEqual("jobTitle" in person, false);
    });

    it("without changing the object it was given", () => {
      const input = { name: " Yoda " };
      normalize(input);
      assert.strictEqual(input.name, " Yoda ");
    });
  });
