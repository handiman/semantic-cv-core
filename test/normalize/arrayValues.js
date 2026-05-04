import assert from "node:assert";
import { describe, test } from "node:test";
import normalize from "#core/normalize.js";

function stringArrays(keys) {
  const invalid = (key) => ({ [key]: key });
  for (const key of keys) {
    test(key, () => {
      const initial = invalid(key);
      const normalized = normalize(invalid(key));
      assert.deepStrictEqual(normalized[key], [initial[key]], key);
    });
  }
}

export default function () {
  describe("ensures array values for", () => {
    stringArrays(["sameAs", "knowsLanguage", "knowsAbout", "skills"]);
    test("hasCertification", () => {
      const { hasCertification } = normalize({
        hasCertification: {}
      });
      for (const cert of hasCertification) {
        assert.deepStrictEqual(cert, {
          "@type": "Certification"
        });
      }
    });
    test("hasCredential", () => {
      const { hasCredential } = normalize({
        hasCredential: {}
      });
      for (const cred of hasCredential) {
        assert.deepStrictEqual(cred, {
          "@type": "EducationalOccupationalCredential"
        });
      }
    });
    test("lifeEvent", () => {
      const { lifeEvent } = normalize({
        lifeEvent: {}
      });
      for (const event of lifeEvent) {
        assert.deepStrictEqual(event, {
          "@type": "Event"
        });
      }
    });
    test("alumniOf", () => {
      const { alumniOf } = normalize({
        alumniOf: {}
      });
      for (const role of alumniOf) {
        assert.deepStrictEqual(role, {
          "@type": "Role",
          alumniOf: {
            "@type": "EducationalOrganization"
          }
        });
      }
    });
    test("worksFor", () => {
      const { worksFor } = normalize({
        worksFor: {}
      });
      for (const role of worksFor) {
        assert.deepStrictEqual(role, {
          "@type": "Role",
          worksFor: {
            "@type": "Organization"
          }
        });
      }
    });
  });
}
