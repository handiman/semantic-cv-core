import assert from "node:assert";
import { describe, it } from "node:test";
import normalize from "#core/normalize.js";

const role = (fields) => ({
  roleName: "Master",
  worksFor: { "@type": "Organization", name: "Jedi Order" },
  ...fields
});

export default () => {
  describe("drops a property value that is a number or a boolean", () => {
    for (const value of [46123, 0, 1.5, true, false]) {
      it(`${value} on the person`, () => {
        const person = normalize({ name: "Yoda", telephone: value });
        assert.strictEqual("telephone" in person, false);
      });
    }

    it("and keeps the properties next to it", () => {
      const person = normalize({ name: "Yoda", jobTitle: "Jedi Master", telephone: 46123 });
      assert.strictEqual(person.name, "Yoda");
      assert.strictEqual(person.jobTitle, "Jedi Master");
    });

    it("on a role", () => {
      const [{ startDate, endDate, roleName }] = normalize({
        name: "Yoda",
        worksFor: [role({ startDate: 2020, endDate: false })]
      }).worksFor;
      assert.strictEqual(startDate, undefined);
      assert.strictEqual(endDate, undefined);
      assert.strictEqual(roleName, "Master");
    });

    it("on the organization of a role", () => {
      const [{ worksFor }] = normalize({
        name: "Yoda",
        worksFor: [
          role({ worksFor: { "@type": "Organization", name: "Jedi Order", description: 5 } })
        ]
      }).worksFor;
      assert.strictEqual("description" in worksFor, false);
      assert.strictEqual(worksFor.name, "Jedi Order");
    });

    describe("such as the certificationIdentification of a certification", () => {
      const identification = (certificationIdentification) =>
        normalize({
          name: "Yoda",
          hasCertification: [{ name: "AZ-204", certificationIdentification }]
        }).hasCertification[0].certificationIdentification;

      it("is dropped as a number", () => assert.strictEqual(identification(12345), undefined));
      it("is dropped as a boolean", () => assert.strictEqual(identification(true), undefined));
      it("is kept as text", () => assert.strictEqual(identification("AZ-204"), "AZ-204"));
      it("is kept as a DefinedTerm", () => {
        const term = { "@type": "DefinedTerm", name: "AZ-204" };
        assert.deepStrictEqual(identification(term), term);
      });
    });
  });

  describe("keeps a number or a boolean inside a list", () => {
    it("in a list of text, for analyze to report", () => {
      const person = normalize({ name: "Yoda", skills: ["Rust", 1, true, 0, false] });
      assert.deepStrictEqual(person.skills, ["Rust", 1, true, 0, false]);
    });

    it("in knowsAbout and knowsLanguage too", () => {
      const person = normalize({ name: "Yoda", knowsAbout: ["Force", 7], knowsLanguage: [true] });
      assert.deepStrictEqual(person.knowsAbout, ["Force", 7]);
      assert.deepStrictEqual(person.knowsLanguage, [true]);
    });
  });
};
