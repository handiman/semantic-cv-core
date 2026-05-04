import assert from "node:assert";
import { describe, test } from "node:test";
import normalize from "#core/normalize.js";

export default function () {
  describe("automatically assigns correct @type", () => {
    test("person", () => {
      const person = normalize({});
      assert.strictEqual(person["@type"], "Person", "person");
    });

    test("worksFor", () => {
      const { worksFor } = normalize({
        worksFor: [{ worksFor: {} }]
      });
      for (const item of worksFor) {
        assert.strictEqual(item["@type"], "Role", "worksFor");
        assert.strictEqual(item.worksFor["@type"], "Organization", "worksFor");
      }
    });

    test("worksFor (Project) is not touched", () => {
      const { worksFor } = normalize({
        worksFor: [
          {
            worksFor: {
              "@type": "Project"
            }
          }
        ]
      });
      for (const item of worksFor) {
        assert.strictEqual(item["@type"], "Role", "project");
        assert.strictEqual(item.worksFor["@type"], "Project", "project");
      }
    });

    test("alumniOf", () => {
      const { alumniOf } = normalize({
        alumniOf: [{ alumniOf: {} }]
      });
      for (const item of alumniOf) {
        assert.strictEqual(item["@type"], "Role", "alumniOf");
        assert.strictEqual(item.alumniOf["@type"], "EducationalOrganization");
      }
    });

    test("lifeEvent", () => {
      const { lifeEvent } = normalize({
        lifeEvent: [{}]
      });
      for (const event of lifeEvent) {
        assert.strictEqual(event["@type"], "Event", "lifeEvent");
      }
    });

    test("hasCredential", () => {
      const { hasCredential } = normalize({
        hasCredential: [{}]
      });
      for (const cred of hasCredential) {
        assert.strictEqual(cred["@type"], "EducationalOccupationalCredential", "hasCredential");
      }
    });

    test("hasCertification", () => {
      const { hasCertification } = normalize({
        hasCertification: [{}]
      });
      for (const cert of hasCertification) {
        assert.strictEqual(cert["@type"], "Certification", "hasCertification");
      }
    });
  });
}
