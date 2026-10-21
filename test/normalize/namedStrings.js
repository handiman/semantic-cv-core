import assert from "node:assert";
import { describe, test } from "node:test";
import normalize from "#core/normalize.js";

export default function () {
  describe("takes a string where an object is expected as its name", () => {
    test("in alumniOf", () => {
      assert.deepStrictEqual(normalize({ alumniOf: "KTH" }).alumniOf, [
        { "@type": "Role", alumniOf: { "@type": "EducationalOrganization", name: "KTH" } }
      ]);
    });
    test("in worksFor", () => {
      assert.deepStrictEqual(normalize({ worksFor: ["Acme"] }).worksFor, [
        { "@type": "Role", worksFor: { "@type": "Organization", name: "Acme" } }
      ]);
    });
    test("in the organization of a worksFor role", () => {
      assert.deepStrictEqual(
        normalize({ worksFor: [{ roleName: "Dev", worksFor: "Acme" }] }).worksFor,
        [{ "@type": "Role", roleName: "Dev", worksFor: { "@type": "Organization", name: "Acme" } }]
      );
    });
    test("in hasCredential", () => {
      assert.deepStrictEqual(normalize({ hasCredential: "PhD" }).hasCredential, [
        { "@type": "EducationalOccupationalCredential", name: "PhD" }
      ]);
    });
    test("in hasCertification", () => {
      assert.deepStrictEqual(normalize({ hasCertification: ["AZ-204"] }).hasCertification, [
        { "@type": "Certification", name: "AZ-204" }
      ]);
    });
    test("in lifeEvent", () => {
      assert.deepStrictEqual(normalize({ lifeEvent: "Born" }).lifeEvent, [
        { "@type": "Event", name: "Born" }
      ]);
    });
  });

  describe("unwraps a single value given as a nested array in one pass", () => {
    test("to its first value", () => {
      assert.strictEqual(normalize({ jobTitle: [["Dev", "Ops"]] }).jobTitle, "Dev");
    });
    test("and removes it when that value is empty", () => {
      assert.strictEqual(normalize({ jobTitle: [[""]] }).jobTitle, undefined);
    });
  });
}
