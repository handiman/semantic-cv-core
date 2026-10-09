/**
 * File and directory analysis for the CLI (`semantic-cv analyze` and
 * `semantic-cv watch`).
 *
 * Kept apart from analyze.ts so the pure validator can be bundled for
 * Workers without pulling in node:fs.
 */

import fs from "node:fs";
import path from "node:path";
import { analyze } from "./analyze.js";

/**
 * Recursively find all *.cv.json files in a directory tree.
 */
function findJsonLdFiles(dir: string): string[] {
  const result: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...findJsonLdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".cv.json")) {
      result.push(full);
    }
  }

  return result;
}

/**
 * Analyze a single *.cv.json file and print results to the provided log stream.
 */
export async function analyzeFile(filename: string, log: any = process.stdout) {
  log["writeLine"] = (s: string) => log.write(`${s}\n`);
  const prettyFileName = filename.replace(process.cwd(), "").replace("\\", "/");
  if (!fs.existsSync(filename)) {
    log.writeLine(`${prettyFileName}\n  File was deleted or moved`);
    return;
  }
  log.writeLine(prettyFileName);
  const raw = await fs.promises.readFile(filename, "utf8");
  const analysisResult = analyze(raw);

  let hasErrors: boolean = false;
  let hasWarnings: boolean = false;
  for (const [key, value] of Object.entries(analysisResult)) {
    if (value.errors.length > 0 || value.warnings.length > 0) {
      log.writeLine(`  "${key}":`);
      if (value.errors.length > 0) {
        hasErrors = true;
        for (const error of value.errors) {
          log.writeLine(`    - ${error}`);
        }
      }
      if (value.warnings.length > 0) {
        hasWarnings = true;
        for (const warning of value.warnings) {
          log.writeLine(`    - ${warning}`);
        }
      }
    }
  }

  if (!hasErrors && !hasWarnings) {
    log.writeLine("  ✔");
  }
}

/**
 * Analyze all *.cv.json files in a directory tree.
 */
export async function analyzeDirectory(dir: string, log: any = process.stdout) {
  for (const file of findJsonLdFiles(dir)) {
    await analyzeFile(file, log);
  }
}
