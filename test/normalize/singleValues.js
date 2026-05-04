import assert from "node:assert";
import { describe, test } from "node:test";
import normalize from "#core/normalize.js";

export default function () {
  describe("ensures single values for", () => {
    describe("person", () => {
      for (const key of [
        "name",
        "jobTitle",
        "description",
        "nationality",
        "workLocation",
        "telephone",
        "email",
        "url",
        "image"
      ]) {
        test(key, () => {
          const person = normalize({
            [key]: [key]
          });
          assert.strictEqual(person[key], key, key);
        });
      }
    });
    describe("hasCredential", () => {
      for (const key of ["name", "description", "datePublished", "expires", "image"]) {
        test(key, () => {
          const { hasCredential } = normalize({
            hasCredential: [{ [key]: [key] }]
          });
          for (const cred of hasCredential) {
            assert.strictEqual(cred[key], key);
          }
        });
      }
    });
    describe("hasCertification", () => {
      for (const key of [
        "name",
        "description",
        "validFrom",
        "expires",
        "logo",
        "issuedBy",
        "certificationIdentification"
      ]) {
        test(key, () => {
          const { hasCertification } = normalize({
            hasCertification: [{ [key]: [key] }]
          });
          for (const cert of hasCertification) {
            assert.strictEqual(cert[key], key);
          }
        });
      }
    });

    describe("worksFor", () => {
      for (const key of ["roleName", "description", "startDate", "endDate"]) {
        test(key, () => {
          const { worksFor } = normalize({
            worksFor: [{ [key]: [key] }]
          });
          for (const role of worksFor) {
            assert.deepStrictEqual(role[key], key);
          }
        });
      }
      test("worksFor", () => {
        const { worksFor } = normalize({
          worksFor: [
            {
              worksFor: [
                {
                  "@type": "Organization",
                  name: "Jedi Order"
                }
              ]
            }
          ]
        });
        assert.deepStrictEqual(worksFor[0].worksFor, {
          "@type": "Organization",
          name: "Jedi Order"
        });
        for (const key of ["name", "description", "location"]) {
          test(key, () => {
            const { worksFor } = normalize({
              worksFor: [
                {
                  worksFor: { [key]: [key] }
                }
              ]
            });
            assert.deepStrictEqual(worksFor[0].worksFor[key], key);
          });
        }
      });
    });

    describe("alumniOf", () => {
      for (const key of ["roleName", "description", "startDate", "endDate"]) {
        test(key, () => {
          const { alumniOf } = normalize({
            alumniOf: [{ [key]: [key] }]
          });
          for (const role of alumniOf) {
            assert.deepStrictEqual(role[key], key);
          }
        });
      }
      test("alumniOf", () => {
        const { alumniOf } = normalize({
          alumniOf: [
            {
              alumniOf: [
                {
                  "@type": "EducationalOrganization",
                  name: "Jedi Order"
                }
              ]
            }
          ]
        });
        assert.deepStrictEqual(alumniOf[0].alumniOf, {
          "@type": "EducationalOrganization",
          name: "Jedi Order"
        });
        for (const key of ["name", "description", "location"]) {
          test(key, () => {
            const { alumniOf } = normalize({
              alumniOf: [
                {
                  alumniOf: { [key]: [key] }
                }
              ]
            });
            assert.deepStrictEqual(alumniOf[0].alumniOf[key], key);
          });
        }
      });
    });

    describe("lifeEvent", () => {
      for (const key of ["name", "description"]) {
        test(key, () => {
          const { lifeEvent } = normalize({
            lifeEvent: [{ [key]: [key] }]
          });
          for (const event of lifeEvent) {
            assert.strictEqual(event[key], key);
          }
        });
      }
    });
  });
}
