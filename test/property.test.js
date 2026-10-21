import assert from "node:assert";
import { describe, it } from "node:test";
import fc from "fast-check";
import {
  escapeHtml,
  safeUrl,
  escapeForHtml,
  jsonForScript,
  commentSafe
} from "#core/render/escape.js";
import normalize from "#core/normalize.js";

// Property-based tests: fast-check generates hundreds of inputs per property, including the odd
// ones nobody writes by hand, and shrinks a failure to the smallest input that still fails.
const runs = { numRuns: 500 };

// A JSON round trip, not structuredClone: it keeps an own "__proto__" key, which a cv.json can have.
const clone = (value) => JSON.parse(JSON.stringify(value));

// Any string, including astral characters, control characters and lone surrogates.
const anyString = fc.string({ unit: "binary" });

// Strings that look like what a hostile cv.json would contain.
const hostileString = fc.oneof(
  anyString,
  fc
    .array(
      fc.constantFrom(
        "<",
        ">",
        '"',
        "'",
        "&",
        "<script>",
        "</script>",
        "-->",
        "javascript:",
        "`",
        "="
      ),
      { maxLength: 8 }
    )
    .chain((parts) =>
      fc.tuple(
        fc.constant(parts),
        fc.array(anyString, { minLength: parts.length, maxLength: parts.length })
      )
    )
    .map(([parts, fillers]) => parts.map((part, i) => fillers[i] + part).join(""))
);

const URL_KEYS = [
  "url",
  "sameAs",
  "image",
  "logo",
  "contentUrl",
  "thumbnailUrl",
  "mainEntityOfPage"
];

// A JSON value whose keys are sometimes ones that carry URLs.
const cvLike = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: "small" },
    hostileString,
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.array(tie("value"), { maxLength: 4 }),
    tie("object")
  ),
  object: fc.dictionary(
    fc.oneof(fc.constantFrom(...URL_KEYS, "name", "@type"), fc.string()),
    tie("value"),
    {
      maxKeys: 5
    }
  )
})).object;

const strings = (value) =>
  "string" === typeof value
    ? [value]
    : Array.isArray(value)
      ? value.flatMap(strings)
      : value && "object" === typeof value
        ? Object.values(value).flatMap(strings)
        : [];

const urlValues = (value, key) =>
  Array.isArray(value)
    ? value.flatMap((item) => urlValues(item, key))
    : value && "object" === typeof value
      ? Object.entries(value).flatMap(([k, v]) => urlValues(v, k))
      : "string" === typeof value && URL_KEYS.includes(key)
        ? [value]
        : [];

// The way a browser reads the scheme: control characters and whitespace are ignored.
const scheme = (url) =>
  /^([a-z][a-z0-9+.-]*):/i.exec(url.replace(/[\u0000- ]/g, ""))?.[1]?.toLowerCase();

describe("Escaping, for any input", () => {
  it("escapeHtml leaves no character that can open a tag or close an attribute", () => {
    fc.assert(
      fc.property(hostileString, (value) => {
        assert.doesNotMatch(escapeHtml(value), /[<>"']/);
      }),
      runs
    );
  });

  it("escapeHtml leaves every ampersand as the start of one of its own entities", () => {
    fc.assert(
      fc.property(hostileString, (value) => {
        assert.doesNotMatch(escapeHtml(value), /&(?!(?:amp|lt|gt|quot|#39);)/);
      }),
      runs
    );
  });

  it("escapeHtml can be undone, so no text is lost", () => {
    fc.assert(
      fc.property(hostileString, (value) => {
        const unescaped = escapeHtml(value)
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&");
        assert.strictEqual(unescaped, value);
      }),
      runs
    );
  });

  it("safeUrl never lets through a dangerous scheme, however it is disguised", () => {
    const disguised = fc
      .tuple(
        fc.constantFrom("javascript", "data", "vbscript", "file", "blob"),
        fc.array(fc.boolean()),
        fc.array(fc.constantFrom("", "\t", "\n", "\r", " ", "\u0000", "\u001f"), { maxLength: 12 }),
        fc.constantFrom("", " ", "\t\n"),
        anyString
      )
      .map(
        ([name, upper, junk, lead, rest]) =>
          lead +
          [...name].map((c, i) => (upper[i] ? c.toUpperCase() : c) + (junk[i] ?? "")).join("") +
          ":" +
          rest
      );
    fc.assert(
      fc.property(disguised, (url) => {
        assert.strictEqual(safeUrl(url), undefined);
      }),
      runs
    );
  });

  it("safeUrl only returns URLs that are relative or http, https, mailto or tel", () => {
    fc.assert(
      fc.property(fc.oneof(anyString, fc.webUrl()), (url) => {
        const safe = safeUrl(url);
        if (safe !== undefined) {
          assert.ok([undefined, "http", "https", "mailto", "tel"].includes(scheme(safe)), safe);
        }
      }),
      runs
    );
  });

  it("escapeForHtml leaves no raw special character in any string, at any depth", () => {
    fc.assert(
      fc.property(cvLike, (person) => {
        for (const value of strings(escapeForHtml(person))) {
          assert.doesNotMatch(value, /[<>"']/);
        }
      }),
      runs
    );
  });

  it("escapeForHtml keeps no URL with a dangerous scheme", () => {
    fc.assert(
      fc.property(cvLike, (person) => {
        for (const url of urlValues(escapeForHtml(person))) {
          assert.ok([undefined, "http", "https", "mailto", "tel"].includes(scheme(url)), url);
        }
      }),
      runs
    );
  });

  it("escapeForHtml does not change its input", () => {
    fc.assert(
      fc.property(cvLike, (person) => {
        const before = JSON.stringify(person);
        escapeForHtml(person);
        assert.strictEqual(JSON.stringify(person), before);
      }),
      runs
    );
  });

  it("jsonForScript can't close the script element and parses back to the same data", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (data) => {
        const json = jsonForScript(data);
        assert.doesNotMatch(json, /[<>&]/);
        assert.deepStrictEqual(JSON.parse(json), JSON.parse(JSON.stringify(data)));
      }),
      runs
    );
  });

  it("commentSafe can't close the comment", () => {
    fc.assert(
      fc.property(hostileString, (text) => {
        assert.doesNotMatch(commentSafe(text), /[<>]/);
      }),
      runs
    );
  });
});

const KNOWN_KEYS = [
  "@context",
  "@type",
  "@theme",
  "theme",
  "name",
  "description",
  "jobTitle",
  "email",
  "url",
  "image",
  "sameAs",
  "worksFor",
  "alumniOf",
  "knowsAbout",
  "skills",
  "keywords",
  "knowsLanguage",
  "hasCertification",
  "hasCredential",
  "lifeEvent",
  "startDate",
  "endDate",
  "roleName"
];

// A Person as an author might write it: known keys in any casing, with any JSON as values.
const person = fc.dictionary(
  fc.oneof(
    fc.constantFrom(...KNOWN_KEYS),
    fc.constantFrom(...KNOWN_KEYS).map((key) => key.toUpperCase()),
    fc.string()
  ),
  fc.jsonValue({ maxDepth: 3 }),
  { maxKeys: 10 }
);

describe("Normalizing, for any Person", () => {
  it("does not throw", () => {
    fc.assert(
      fc.property(person, (input) => {
        normalize(input);
      }),
      runs
    );
  });

  it("is idempotent", () => {
    fc.assert(
      fc.property(person, (input) => {
        const once = JSON.stringify(normalize(clone(input)));
        assert.strictEqual(JSON.stringify(normalize(JSON.parse(once))), once);
      }),
      runs
    );
  });

  it("gives byte-identical output for the same input", () => {
    fc.assert(
      fc.property(person, (input) => {
        assert.strictEqual(
          JSON.stringify(normalize(clone(input))),
          JSON.stringify(normalize(clone(input)))
        );
      }),
      runs
    );
  });

  it("does not change its input", () => {
    fc.assert(
      fc.property(person, (input) => {
        const before = JSON.stringify(input);
        normalize(input);
        assert.strictEqual(JSON.stringify(input), before);
      }),
      runs
    );
  });
});
