import assert from "node:assert";
import { describe, it } from "node:test";
import { sortFields } from "#core/sort.js";

export default () =>
  describe("worksFor sorting", () => {
    it("places Project roles before Organization roles", () => {
      const input = {
        worksFor: [
          {
            roleName: "Consultant",
            worksFor: { "@type": "Organization", name: "Org B" }
          },
          {
            roleName: "Lead Developer",
            worksFor: { "@type": "Project", name: "Project A" }
          },
          {
            roleName: "Engineer",
            worksFor: { "@type": "Organization", name: "Org A" }
          }
        ]
      };

      const result = sortFields(input);
      const types = result.worksFor.map((x) => x.worksFor["@type"]);

      assert.deepStrictEqual(types, ["Project", "Organization", "Organization"]);
    });

    it("keeps deterministic ordering within the same @type", () => {
      const input = {
        worksFor: [
          {
            roleName: "B",
            worksFor: { "@type": "Organization", name: "Org B" }
          },
          {
            roleName: "A",
            worksFor: { "@type": "Organization", name: "Org A" }
          }
        ]
      };

      const result = sortFields(input);
      const names = result.worksFor.map((x) => x.worksFor.name);

      assert.deepStrictEqual(names, ["Org B", "Org A"]);
    });

    it("sorts missing @type last", () => {
      const input = {
        worksFor: [
          { worksFor: { name: "Unknown" } },
          { worksFor: { "@type": "Project", name: "Project A" } },
          { worksFor: { "@type": "Organization", name: "Org A" } }
        ]
      };

      const result = sortFields(input);
      const names = result.worksFor.map((x) => x.worksFor.name);

      assert.deepStrictEqual(names, ["Project A", "Org A", "Unknown"]);
    });
  });
