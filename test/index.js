import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Walk upward until we find semantic-cv-core/package.json
function resolveCoreRoot() {
  let dir = __dirname;

  while (true) {
    const pkg = resolve(dir, "package.json");

    if (existsSync(pkg)) {
      try {
        const json = JSON.parse(readFileSync(pkg, "utf8"));
        if (json.name === "semantic-cv-core") {
          return dir;
        }
      } catch {
        // ignore malformed JSON and continue upward
      }
    }

    const parent = resolve(dir, "..");
    if (parent === dir) {
      throw new Error("Could not locate semantic-cv-core root");
    }

    dir = parent;
  }
}

// Cache the result so we don’t walk the tree for every import
const CORE_ROOT = resolveCoreRoot();

/**
 * Import a module from semantic-cv-core/dist
 * @param {string} relativePath - e.g. "cli/add/knowsLanguage.js"
 */
export async function fromCore(relativePath) {
  const modulePath = resolve(CORE_ROOT, "dist", relativePath);
  return import(modulePath);
}
