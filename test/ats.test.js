import assert from "node:assert";
import { describe, it } from "node:test";
import renderATS, { formatATS } from "#core/render/ats.js";

const person = (fields) => ({
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Test",
  ...fields
});

const role = (type, fields) => ({
  "@type": "Role",
  roleName: "Developer",
  startDate: "2020-01-15",
  ...fields,
  worksFor: { "@type": type, name: fields?.name ?? "Acme" }
});

describe("ATS", () => {
  it("does not crash when knowsAbout is set but skills is not", () => {
    const text = formatATS(person({ knowsAbout: ["TypeScript"] }));
    assert.match(text, /^Skills\nTypeScript$/m);
  });

  it("merges skills and knowsAbout into one sorted, de-duplicated line", () => {
    const text = formatATS(person({ skills: ["node", "C#"], knowsAbout: ["Azure", "C#"] }));
    assert.match(text, /^Skills\nAzure, C#, node$/m);
  });

  it("puts each line of a role description on its own bullet", () => {
    const text = formatATS(
      person({
        worksFor: [role("Organization", { description: "Line one\n- Line two\n\nLine three" })]
      })
    );
    assert.match(text, /^- Line one\n- Line two\n- Line three$/m);
  });

  it("starts every section on its own line", () => {
    const text = formatATS(
      person({
        knowsLanguage: ["Swedish", "English"],
        hasCertification: [{ "@type": "Certification", name: "AZ-204" }]
      })
    );
    assert.match(text, /^Languages\n- Swedish\n- English\n\nCertifications\n- AZ-204\n$/m);
  });

  it("separates organizations from projects", () => {
    const text = formatATS(
      person({
        worksFor: [
          role("Organization", { name: "Acme" }),
          role("Project", { name: "Side project" })
        ]
      })
    );
    assert.match(text, /Professional Experience\nAcme\n/);
    assert.match(text, /Projects\nSide project\n/);
    assert.doesNotMatch(text, /Professional Experience\n[\s\S]*Side project[\s\S]*Projects/);
  });

  it("skips roles without a nested organization instead of throwing", () => {
    assert.doesNotThrow(() =>
      formatATS(person({ worksFor: [{ "@type": "Role", roleName: "Dev" }] }))
    );
  });

  it("puts the role name and dates on separate lines", () => {
    const text = formatATS(
      person({
        worksFor: [role("Organization", { roleName: "IT-Consultant", endDate: "2021-10-10" })]
      })
    );
    assert.match(text, /^Acme\nIT-Consultant\n2020-01-15 – 2021-10-10$/m);
  });

  it("marks a role without an end date as ongoing", () => {
    const text = formatATS(person({ worksFor: [role("Organization", {})] }));
    assert.match(text, /^2020-01-15 – Present$/m);
  });

  it("trims the summary so no blank lines follow it", () => {
    const text = formatATS(person({ description: "Hello\n", skills: ["C#"] }));
    assert.match(text, /^Summary\nHello\n\nSkills$/m);
  });

  it("replaces non-breaking hyphens and spaces with ASCII", () => {
    const text = formatATS(person({ description: "full\u2011time\u00a0role" }));
    assert.match(text, /^full-time role$/m);
  });

  it("uses brand spellings for known profile sites", () => {
    const text = formatATS(
      person({
        sameAs: [
          "https://github.com/a",
          "https://www.linkedin.com/in/b",
          "https://mastodon.social/@c"
        ]
      })
    );
    assert.match(text, /^GitHub: https:\/\/github.com\/a$/m);
    assert.match(text, /^LinkedIn: https:\/\/www.linkedin.com\/in\/b$/m);
    assert.match(text, /^Mastodon: https:\/\/mastodon.social\/@c$/m);
  });

  it("includes issuer and year with certifications", () => {
    const text = formatATS(
      person({
        hasCertification: [
          {
            "@type": "Certification",
            name: "AZ-204",
            issuedBy: "Microsoft",
            validFrom: "2021-06-24"
          },
          { "@type": "Certification", name: "Plain" }
        ]
      })
    );
    assert.match(text, /^- AZ-204 \(Microsoft, 2021\)$/m);
    assert.match(text, /^- Plain$/m);
  });

  it("omits empty sections", () => {
    assert.strictEqual(formatATS(person({})), "Test\n");
  });

  it("writes the text to the stream and closes it", async () => {
    const { readable, writable } = new TransformStream();
    const text = new Response(readable.pipeThrough(new TextEncoderStream())).text();
    await renderATS(person({ jobTitle: "Architect" }), writable, true);
    assert.strictEqual(await text, "Test\nArchitect\n");
  });
});
