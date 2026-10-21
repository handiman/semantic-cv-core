import assert from "node:assert";
import { describe, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import context from "./analyze/context.js";
import typ from "./analyze/type.js";
import name from "./analyze/name.js";
import description from "./analyze/description.js";
import jobTitle from "./analyze/jobTitle.js";
import sameAs from "./analyze/sameAs.js";
import knowsAbout from "./analyze/knowsAbout.js";
import skills from "./analyze/skills.js";
import keywords from "./analyze/keywords.js";
import url from "./analyze/url.js";
import image from "./analyze/image.js";
import email from "./analyze/email.js";
import { analyzeFile, analyzeDirectory } from "#core/analyzeFiles.js";

const readAll = async (reader) => {
  let result = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    result += value;
  }
  return result;
};

const createValidFile = (file) => {
  fs.writeFileSync(
    file,
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Yoda",
      jobTitle: "Jedi Master",
      description: "Judge me by my size?"
    })
  );
};

describe("Analyze", () => {
  describe("Mandatory fields", () => {
    describe("@context", context);
    describe("@type", typ);
    describe("name", name);
    describe("description", description);
    describe("jobTitle", jobTitle);
  });

  describe("Optional fields", () => {
    describe("sameAs", sameAs);
    describe("knowsAbout", knowsAbout);
    describe("skills", skills);
    describe("keywords", keywords);
    describe("url", url);
    describe("image", image);
    describe("email", email);
  });

  const withTempDir = async (run) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "myapp-"));
    try {
      await run(dir);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };

  const analyzeSilently = async (analyze, target) => {
    const { writable } = new TransformStream();
    const writer = writable.getWriter();
    const count = await analyze(target, writer);
    writer.close();
    return count;
  };

  describe("Analyze Directory", async () => {
    test("with valid file", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "myapp-"));
      const file = path.join(dir, `${crypto.randomUUID()}.cv.json`);
      try {
        createValidFile(file);
        const { writable, readable } = new TransformStream();

        const writer = writable.getWriter();
        await analyzeDirectory(dir, writer);
        writer.close();

        const result = await readAll(readable.getReader());
        assert.strictEqual(result.includes("✔"), true);
      } finally {
        if (fs.existsSync(file)) {
          fs.rmSync(file);
        }
        if (fs.existsSync(dir)) {
          fs.rmdirSync(dir);
        }
      }
    });
  });

  describe("Error count", () => {
    test("is 0 for a valid file", async () => {
      await withTempDir(async (dir) => {
        const file = path.join(dir, "valid.cv.json");
        createValidFile(file);

        assert.strictEqual(await analyzeSilently(analyzeFile, file), 0);
      });
    });

    test("counts the errors in an invalid file", async () => {
      await withTempDir(async (dir) => {
        const file = path.join(dir, "invalid.cv.json");
        fs.writeFileSync(file, JSON.stringify({ "@context": "https://schema.org" }));

        assert.ok((await analyzeSilently(analyzeFile, file)) > 0);
      });
    });

    test("is 0 when a file only has warnings", async () => {
      await withTempDir(async (dir) => {
        const file = path.join(dir, "warning.cv.json");
        fs.writeFileSync(
          file,
          JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Yoda",
            jobTitle: "Jedi Master",
            description: "Judge me by my size?",
            sameAs: []
          })
        );
        const { writable, readable } = new TransformStream();
        const writer = writable.getWriter();

        const count = await analyzeFile(file, writer);
        writer.close();

        const output = await readAll(readable.getReader());
        assert.ok(!output.includes("✔"), "expected the file to report a warning");
        assert.strictEqual(count, 0);
      });
    });

    test("is 0 for a file that was deleted", async () => {
      await withTempDir(async (dir) => {
        assert.strictEqual(await analyzeSilently(analyzeFile, path.join(dir, "gone.cv.json")), 0);
      });
    });

    test("adds up the errors of every file in a directory", async () => {
      await withTempDir(async (dir) => {
        createValidFile(path.join(dir, "valid.cv.json"));
        fs.writeFileSync(path.join(dir, "a.cv.json"), JSON.stringify({}));
        fs.writeFileSync(path.join(dir, "b.cv.json"), JSON.stringify({}));
        const single = await analyzeSilently(analyzeFile, path.join(dir, "a.cv.json"));

        assert.ok(single > 0);
        assert.strictEqual(await analyzeSilently(analyzeDirectory, dir), single * 2);
      });
    });
  });

  describe("Analyze File", () => {
    test("with valid file", async () => {
      const file = path.join(os.tmpdir(), `${crypto.randomUUID()}.cv.json`);
      try {
        createValidFile(file);
        const { writable, readable } = new TransformStream();

        const writer = writable.getWriter();
        await analyzeFile(file, writer);
        writer.close();

        const result = await readAll(readable.getReader());
        assert.strictEqual(result.includes("✔"), true);
      } finally {
        if (fs.existsSync(file)) {
          fs.rmSync(file);
        }
      }
    });
  });
});
