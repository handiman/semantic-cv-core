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
