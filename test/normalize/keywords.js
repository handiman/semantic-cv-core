import assert from "node:assert";
import { describe, it } from "node:test";
import normalize from "#core/normalize.js";

const term = (name) => ({ "@type": "DefinedTerm", name });

/** A CV with one project, whose `keywords` are the given value. */
const projectWith = (keywords) =>
  normalize({
    name: "Yoda",
    worksFor: [{ roleName: "Master", worksFor: { "@type": "Project", name: "Temple", keywords } }]
  }).worksFor[0].worksFor;

export default () =>
  describe("keywords", () => {
    it("become DefinedTerms", () => {
      const project = projectWith(["Azure Service Bus", "TypeScript"]);
      assert.deepStrictEqual(project.keywords, [term("Azure Service Bus"), term("TypeScript")]);
    });

    it("can be a single string", () => {
      assert.deepStrictEqual(projectWith("TypeScript").keywords, [term("TypeScript")]);
    });

    it("can be an object without @type", () => {
      assert.deepStrictEqual(projectWith([{ name: "TypeScript" }]).keywords, [term("TypeScript")]);
    });

    it("keep the order the author gave them", () => {
      const names = projectWith(["Zig", "Ada", "C#"]).keywords.map((k) => k.name);
      assert.deepStrictEqual(names, ["Zig", "Ada", "C#"]);
    });

    it("keep the extra properties of a DefinedTerm", () => {
      const keyword = { "@type": "DefinedTerm", name: "C#", termCode: "csharp" };
      assert.deepStrictEqual(projectWith([keyword]).keywords, [
        { "@type": "DefinedTerm", name: "C#", termCode: "csharp" }
      ]);
    });

    it("get the @type DefinedTerm even if the author wrote something else", () => {
      assert.deepStrictEqual(projectWith([{ "@type": "Thing", name: "Rust" }]).keywords, [
        term("Rust")
      ]);
    });

    it("are trimmed", () => {
      assert.deepStrictEqual(projectWith(["  Rust\n"]).keywords, [term("Rust")]);
    });

    it("work on an employer too, not just a project", () => {
      const person = normalize({
        name: "Yoda",
        worksFor: [
          { worksFor: { "@type": "Organization", name: "Jedi Order", keywords: ["Teaching"] } }
        ]
      });
      assert.deepStrictEqual(person.worksFor[0].worksFor.keywords, [term("Teaching")]);
    });

    describe("that are not usable are dropped", () => {
      it("empty strings, null, numbers and nested lists", () => {
        const project = projectWith(["", "   ", null, 42, ["Rust"], "Go"]);
        assert.deepStrictEqual(project.keywords, [term("Go")]);
      });

      it("objects without a name", () => {
        const project = projectWith([{ "@type": "DefinedTerm" }, { name: "" }, { name: "Go" }]);
        assert.deepStrictEqual(project.keywords, [term("Go")]);
      });

      it("and so is `keywords` itself when nothing is left", () => {
        for (const keywords of [[], "", [""], null]) {
          assert.strictEqual("keywords" in projectWith(keywords), false, JSON.stringify(keywords));
        }
      });
    });

    it("are left alone when the project has none", () => {
      const project = projectWith(undefined);
      assert.deepStrictEqual(project, { "@type": "Project", name: "Temple" });
    });

    it("do not change the rest of the project", () => {
      const project = projectWith(["Rust"]);
      assert.strictEqual(project["@type"], "Project");
      assert.strictEqual(project.name, "Temple");
    });

    it("are normalized the same way twice", () => {
      const once = normalize({
        name: "Yoda",
        worksFor: [{ worksFor: { "@type": "Project", name: "Temple", keywords: ["Rust", "Go"] } }]
      });
      assert.deepStrictEqual(normalize(once), once);
    });

    it("do not change the object they were given", () => {
      const input = {
        name: "Yoda",
        worksFor: [{ worksFor: { "@type": "Project", name: "Temple", keywords: ["Rust"] } }]
      };
      const copy = structuredClone(input);
      normalize(input);
      assert.deepStrictEqual(input, copy);
    });
  });
