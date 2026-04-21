/**
 * Validation and analysis pipeline for Semantic‑CV Person documents.
 *
 * The analyzer checks:
 *   • required top‑level fields (@context, @type, name, jobTitle, description)
 *   • optional fields with format rules (email, telephone, url, image)
 *   • list‑based fields (skills, sameAs, knowsAbout, knowsLanguage)
 *   • nested structures (worksFor, alumniOf, lifeEvent, hasCredential, hasCertification)
 *
 * Each field produces an AnalysisResult with:
 *   • errors: violations that must be fixed
 *   • warnings: non‑fatal issues or recommendations
 *
 * The analyzer is idempotent and does not mutate the input object.
 * It is used by both `semantic-cv analyze` and `semantic-cv watch`.
 */

import fs from "node:fs";
import path from "node:path";
import regex from "./regex.js";
import pipe from "./pipe.js";
import analyzeWorksFor from "./analyze/worksFor.js";
import analyzeAlumniOf from "./analyze/alumniOf.js";
import analyzeLifeEvent from "./analyze/lifeEvent.js";
import analyzeHasCredential from "./analyze/hasCredential.js";
import analyzeHasCertification from "./analyze/hasCertification.js";

type AnalysisContext = {
  object: any;
  results: any;
};

export type AnalysisResult = {
  errors: Array<string>;
  warnings: Array<string>;
};

/**
 * A successful validation result with no errors or warnings.
 */
export const Success: AnalysisResult = {
  errors: [],
  warnings: []
};

/**
 * Construct an error result for a field.
 */
const error = (...messages: Array<string>) => ({
  errors: [...messages],
  warnings: []
});

/**
 * Construct a warning result for a field.
 */
const warning = (...messages: Array<string>) => ({
  errors: [],
  warnings: [...messages]
});

/**
 * Validate that a field is a list of URLs.
 */
export function listOfUrls(list: any) {
  return listOfSomething(list, url);
}

/**
 * Validate that a field is a list of non‑empty strings.
 */
export function listOfStrings(list: any) {
  return listOfSomething(list, (item: any) => {
    if (typeof item !== "string") {
      return {
        errors: ["Only string values are allowed"],
        warnings: []
      };
    }

    return item.length > 0
      ? Success
      : {
          errors: ["Empty item found"],
          warnings: []
        };
  });
}

/**
 * Validate that a field is a list of objects.
 */
export function listOfObjects(list: any) {
  return listOfSomething(list, (item: any) => {
    if (typeof item !== "object") {
      return {
        errors: ["Only objects are allowed"],
        warnings: []
      };
    }

    return Success;
  });
}

/**
 * Generic list validator: ensures the value is an array and applies a callback
 * to each item, aggregating all errors and warnings.
 */
export function listOfSomething(
  list: any,
  callback: (item: any, _: number) => AnalysisResult
): AnalysisResult {
  let errors = new Array<string>();
  let warnings = new Array<string>();
  if (!Array.isArray(list)) {
    errors.push(`Should be a list`);
  } else {
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const results = callback(item, i);
      errors = [...errors, ...results.errors];
      warnings = [...warnings, ...results.warnings];
    }
  }

  return { errors, warnings };
}

/**
 * Warn if a value is empty (string or array).
 */
export function notEmpty(value: any) {
  if (Array.isArray(value)) {
    return value.length > 0 ? Success : warning("At least one item is recommended");
  }
  return value !== "" ? Success : warning("Value should not be empty");
}

const emailAddress = (value: any) =>
  regex.emailAddress.test(`${value}`)
    ? Success
    : {
        errors: ["Invalid email address"],
        warnings: []
      };

const phoneNumber = (value: any) =>
  regex.phoneNumber.test(`${value}`)
    ? Success
    : {
        errors: ["Invalid phone number"],
        warnings: []
      };

const url = (value: any) =>
  regex.url.test(value)
    ? Success
    : {
        errors: [`Invalid url: ${value}`],
        warnings: []
      };

/**
 * Require a field to equal a specific value.
 */
export const mustBe =
  (field: string) =>
  (expected: any) =>
  (context: AnalysisContext): AnalysisContext => {
    const { object, results } = context;
    const value = object[field];
    const isValid = value === expected;
    return {
      object,
      results: {
        ...results,
        [field]: isValid ? Success : error(`Value must be ${expected}`)
      }
    };
  };

/**
 *
 * @param args Require a field to equal any of the provided values:
 */
export const canBe =
  (field: string) =>
  (...validValues: Array<any>) =>
  (context: AnalysisContext) => {
    const { object, results } = context;
    const value = object[field];
    const isValid = validValues.some((v) => equals(value, v));
    return {
      object,
      results: {
        ...results,
        [field]: isValid
          ? Success
          : error(`Value must be any of ${JSON.stringify(validValues, null, 2)}`)
      }
    };
  };

/**
 * Require a field to be present and non‑empty.
 */
export const mandatory =
  (field: string) =>
  (context: AnalysisContext): AnalysisContext => {
    const { object, results } = context;
    const value = object[field];
    const isValid = value && `${value}`.replace(regex.whiteSpace, "").length > 0;
    return {
      object,
      results: {
        ...results,
        [field]: isValid ? Success : error("Field is mandatory")
      }
    };
  };

/**
 * Validate an optional field using one or more analyzers.
 * If the field is missing, it is treated as valid.
 */
export const optional =
  (field: string) =>
  (...analyzers: Array<(value: any) => AnalysisResult>) =>
  (context: AnalysisContext): AnalysisContext => {
    const { object, results } = context;
    const value = object[field];
    if (undefined === value) {
      return {
        object,
        results: {
          ...results,
          [field]: Success
        }
      };
    }

    let errors = new Array<string>();
    let warnings = new Array<string>();
    for (const analyze of analyzers) {
      const r2 = analyze(value);
      errors = [...errors, ...r2.errors];
      warnings = [...warnings, ...r2.warnings];
    }
    return {
      object,
      results: {
        ...results,
        [field]: {
          errors,
          warnings
        }
      }
    };
  };

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

const schemaOrg = "https://schema.org";
const semanticCV = (version: any) => [schemaOrg, `https://semantic.cv/context/${version}.jsonld`];

/**
 * Analyze a raw JSON‑LD string and return a map of field → AnalysisResult.
 *
 * The pipeline validates:
 *   • top‑level schema correctness
 *   • required fields
 *   • optional fields with format rules
 *   • nested structures via specialized analyzers
 */
export function analyze(raw: string): Record<string, AnalysisResult> {
  const context = {
    object: JSON.parse(raw),
    results: {}
  };
  const { results } = pipe(
    canBe("@context")(schemaOrg, semanticCV("latest"), semanticCV("1.0")),
    mustBe("@type")("Person"),
    mandatory("name"),
    mandatory("jobTitle"),
    mandatory("description"),
    optional("email")(emailAddress),
    optional("telephone")(phoneNumber),
    optional("url")(url),
    optional("image")(url),
    optional("knowsLanguage")(listOfStrings),
    optional("knowsAbout")(notEmpty, listOfStrings),
    optional("sameAs")(notEmpty, listOfUrls),
    optional("skills")(notEmpty, listOfStrings),
    analyzeWorksFor,
    analyzeAlumniOf,
    analyzeLifeEvent,
    analyzeHasCredential,
    analyzeHasCertification
  )(context);
  return results;
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

export default analyze;

const equals = (a: any, b: any): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => equals(v, b[i]));
  }
  return a === b;
};
