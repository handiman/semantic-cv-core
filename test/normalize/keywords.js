import assert from "node:assert";
import { describe, it } from "node:test";
import normalize from "#core/normalize.js";

const term = (name) => ({ "@type": "DefinedTerm", name });

const temple = { "@type": "Project", name: "Temple" };

/** A CV with one role, whose `keywords` are the given value. */
const roleWith = (keywords, worksFor = temple) =>
  normalize({ name: "Yoda", worksFor: [{ roleName: "Master", worksFor, keywords }] }).worksFor[0];

export default () =>
  describe("keywords", () => {
    it("become DefinedTerms", () => {
      const role = roleWith(["Azure Service Bus", "TypeScript"]);
      assert.deepStrictEqual(role.keywords, [term("Azure Service Bus"), term("TypeScript")]);
    });

    it("can be a single string", () => {
      assert.deepStrictEqual(roleWith("TypeScript").keywords, [term("TypeScript")]);
    });

    it("can be an object without @type", () => {
      assert.deepStrictEqual(roleWith([{ name: "TypeScript" }]).keywords, [term("TypeScript")]);
    });

    it("keep the order the author gave them", () => {
      const names = roleWith(["Zig", "Ada", "C#"]).keywords.map((k) => k.name);
      assert.deepStrictEqual(names, ["Zig", "Ada", "C#"]);
    });

    it("keep the extra properties of a DefinedTerm", () => {
      const keyword = { "@type": "DefinedTerm", name: "C#", termCode: "csharp" };
      assert.deepStrictEqual(roleWith([keyword]).keywords, [
        { "@type": "DefinedTerm", name: "C#", termCode: "csharp" }
      ]);
    });

    it("get the @type DefinedTerm even if the author wrote something else", () => {
      assert.deepStrictEqual(roleWith([{ "@type": "Thing", name: "Rust" }]).keywords, [
        term("Rust")
      ]);
    });

    it("are trimmed", () => {
      assert.deepStrictEqual(roleWith(["  Rust\n"]).keywords, [term("Rust")]);
    });

    it("belong to the role, whether it is a project or an employer", () => {
      const jediOrder = { "@type": "Organization", name: "Jedi Order" };
      assert.deepStrictEqual(roleWith(["Teaching"], temple).keywords, [term("Teaching")]);
      assert.deepStrictEqual(roleWith(["Teaching"], jediOrder).keywords, [term("Teaching")]);
    });

    it("come after the project or employer in the role", () => {
      const keys = Object.keys(roleWith(["Rust"]));
      assert.deepStrictEqual(keys, ["@type", "roleName", "worksFor", "keywords"]);
    });

    describe("that are not usable are dropped", () => {
      it("empty strings, null, numbers and nested lists", () => {
        const role = roleWith(["", "   ", null, 42, ["Rust"], "Go"]);
        assert.deepStrictEqual(role.keywords, [term("Go")]);
      });

      it("objects without a name", () => {
        const role = roleWith([{ "@type": "DefinedTerm" }, { name: "" }, { name: "Go" }]);
        assert.deepStrictEqual(role.keywords, [term("Go")]);
      });

      it("and so is `keywords` itself when nothing is left", () => {
        for (const keywords of [[], "", [""], null]) {
          assert.strictEqual("keywords" in roleWith(keywords), false, JSON.stringify(keywords));
        }
      });
    });

    it("are left alone when the role has none", () => {
      assert.deepStrictEqual(roleWith(undefined), {
        "@type": "Role",
        roleName: "Master",
        worksFor: temple
      });
    });

    it("do not change the rest of the role", () => {
      const { keywords, ...rest } = roleWith(["Rust"]);
      assert.deepStrictEqual(rest, { "@type": "Role", roleName: "Master", worksFor: temple });
    });

    it("are normalized the same way twice", () => {
      const once = normalize({
        name: "Yoda",
        worksFor: [{ worksFor: temple, keywords: ["Rust", "Go"] }]
      });
      assert.deepStrictEqual(normalize(once), once);
    });

    it("do not change the object they were given", () => {
      const input = {
        name: "Yoda",
        worksFor: [{ worksFor: temple, keywords: ["Rust"] }]
      };
      const copy = structuredClone(input);
      normalize(input);
      assert.deepStrictEqual(input, copy);
    });
  });
