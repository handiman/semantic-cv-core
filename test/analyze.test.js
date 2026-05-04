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
import url from "./analyze/url.js";
import image from "./analyze/image.js";
import email from "./analyze/email.js";
import { analyzeFile, analyzeDirectory } from "#core/analyze.js";

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
    describe("url", url);
    describe("image", image);
    describe("email", email);
  });

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
