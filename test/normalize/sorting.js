import assert from "node:assert";
import { describe, test, it } from "node:test";
import normalize from "#core/normalize.js";
import { sortFields } from "#core/sort.js";
import worksFor from "./sorting.worksFor.js";

export default () =>
  describe("Sorting", () => {
    contextAndType();
    person();
    role();
    nestedObjects();
    worksFor();
    alumniOf();

    describe("sorts in descending chronological order", () => {
      test("worksFor", () => {
        const { worksFor } = normalize({
          worksFor: [
            {
              endDate: "2026-01-01"
            },
            {
              endDate: "present"
            },
            {
              endDate: "2026-02-01"
            }
          ]
        });

        assert.deepStrictEqual(worksFor, [
          {
            "@type": "Role",
            endDate: "present",
            worksFor: {
              "@type": "Organization"
            }
          },
          {
            "@type": "Role",
            endDate: "2026-02-01",
            worksFor: {
              "@type": "Organization"
            }
          },
          {
            "@type": "Role",
            endDate: "2026-01-01",
            worksFor: {
              "@type": "Organization"
            }
          }
        ]);
      });
      test("alumniOf", () => {
        const { alumniOf } = normalize({
          alumniOf: [
            {
              endDate: "2026-01-01"
            },
            {
              endDate: "2026-03-01"
            },
            {
              endDate: "present"
            }
          ]
        });

        assert.deepStrictEqual(alumniOf, [
          {
            "@type": "Role",
            endDate: "present",
            alumniOf: {
              "@type": "EducationalOrganization"
            }
          },
          {
            "@type": "Role",
            endDate: "2026-03-01",
            alumniOf: {
              "@type": "EducationalOrganization"
            }
          },
          {
            "@type": "Role",
            endDate: "2026-01-01",
            alumniOf: {
              "@type": "EducationalOrganization"
            }
          }
        ]);
      });

      test("lifeEvent", () => {
        const { lifeEvent } = normalize({
          lifeEvent: [
            {
              name: "Born",
              startDate: "1969-06-23"
            },
            {
              name: "Married",
              startDate: "2023-06-10"
            }
          ]
        });
        assert.strictEqual(lifeEvent[0].name, "Married");
        assert.strictEqual(lifeEvent[1].name, "Born");
      });
    });

    describe("does not sort", () => {
      test("knowsLanguage", () => {
        const { knowsLanguage } = normalize({
          knowsLanguage: ["Swedish", "English"]
        });
        assert.deepStrictEqual(["Swedish", "English"], knowsLanguage);
      });
      test("sameAs", () => {
        const { sameAs } = normalize({
          sameAs: ["https://B", "https://a"]
        });
        assert.deepStrictEqual(["https://B", "https://a"], sameAs);
      });
      test("skills", () => {
        const { skills } = normalize({
          skills: ["skills B", "skills a"]
        });
        assert.deepStrictEqual(["skills B", "skills a"], skills);
      });
      test("knowsAbout", () => {
        const { knowsAbout } = normalize({
          knowsAbout: ["thing B", "thing a"]
        });
        assert.deepStrictEqual(["thing B", "thing a"], knowsAbout);
      });
    });
  });

const contextAndType = () =>
  it("places @context and @type first for any object", () => {
    const input = {
      name: "Henrik",
      "@type": "Person",
      jobTitle: "Engineer",
      "@context": "https://schema.org"
    };

    const result = sortFields(input);

    assert.deepStrictEqual(Object.keys(result).slice(0, 2), ["@context", "@type"]);
  });

const person = () =>
  it("sorts top-level Person fields according to priority", () => {
    const input = {
      skills: [],
      name: "Henrik",
      worksFor: [],
      jobTitle: "Engineer",
      description: "Test",
      url: "https://example.com"
    };

    const result = sortFields(input);

    assert.deepStrictEqual(
      Object.keys(result),
      [
        "@context", // if present, always first
        "@type", // if present, always second
        "name",
        "jobTitle",
        "description",
        "image",
        "url",
        "sameAs",
        "knowsLanguage",
        "knowsAbout",
        "skills",
        "hasCertification",
        "alumniOf",
        "worksFor"
      ].filter((k) => k in result)
    );
  });

const role = () =>
  it("sorts Role fields according to Role priority", () => {
    const input = {
      "@type": "Role",
      description: "Desc",
      worksFor: { "@type": "Organization", name: "Org" },
      roleName: "Dev",
      startDate: "2020-01-01",
      endDate: "2021-01-01"
    };

    const result = sortFields(input);

    assert.deepStrictEqual(Object.keys(result), [
      "@type",
      "roleName",
      "description",
      "startDate",
      "endDate",
      "worksFor"
    ]);
  });

const nestedObjects = () =>
  describe("sorts nested objects deterministically", () => {
    test("worksFor", () => {
      const input = {
        worksFor: [
          {
            "@type": "Role",
            description: "Test",
            roleName: "Dev",
            worksFor: {
              name: "Semantic CV",
              "@type": "Project"
            }
          }
        ]
      };

      const result = sortFields(input);

      assert.deepStrictEqual(Object.keys(result.worksFor[0].worksFor), ["@type", "name"]);
    });
    test("alumniOf", () => {
      const input = {
        alumniOf: [
          {
            "@type": "Role",
            description: "Test",
            roleName: "Dev",
            alumniOf: {
              name: "Semantic CV",
              "@type": "EducationalOrganization"
            }
          }
        ]
      };

      const result = sortFields(input);

      assert.deepStrictEqual(Object.keys(result.alumniOf[0].alumniOf), ["@type", "name"]);
    });
  });

const alumniOf = () =>
  it("sorts alumniOf Role fields according to Alumni priority", () => {
    const input = {
      "@type": "Role",
      description: "Education",
      alumniOf: { "@type": "EducationalOrganization", name: "Komvux" },
      endDate: "1997-06-18",
      startDate: "1995-08-01"
    };

    const result = sortFields(input);

    assert.deepStrictEqual(Object.keys(result), [
      "@type",
      "alumniOf",
      "description",
      "startDate",
      "endDate"
    ]);
  });
