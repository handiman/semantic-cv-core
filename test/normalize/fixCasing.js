import assert from "node:assert";
import { describe, it } from "node:test";
import { normalize } from "#core/normalize.js";

export default function () {
  describe("automatically corrects invalid property name casing", () => {
    for (const validKey of [
      "@context",
      "@type",
      "theme",
      "name",
      "description",
      "jobTitle",
      "telephone",
      "workLocation",
      "email",
      "url",
      "image",
      "worksFor",
      "alumniOf",
      "sameAs",
      "address",
      "description",
      "lifeEvent",
      "nationality",
      "hasCertification",
      "hasCredential",
      "knowsAbout",
      "skills",
      "knowsLanguage",
      "location",
      "member",
      "roleName",
      "startDate",
      "endDate",
      "issuedBy",
      "validFrom",
      "expires",
      "certificationIdentification",
      "datePublished"
    ]) {
      const invalidKey = validKey.toUpperCase();
      it(`changes ${invalidKey} to ${validKey}`, () => {
        const something = normalize.casing({
          [invalidKey]: "Something"
        });
        assert.strictEqual(something[invalidKey], undefined);
        assert.strictEqual(something[validKey], "Something");
      });
    }
  });
}
