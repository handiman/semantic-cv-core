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
 * It has no I/O, so it runs anywhere (Node, Workers). Reading and reporting
 * on files lives in analyzeFiles.ts.
 */

import { languageOfContext } from "./language.js";
import { headingKeys, labelKeys } from "./themeOptions.js";
import regex from "./regex.js";
import pipe from "./pipe.js";
import analyzeWorksFor from "./analyze/worksFor.js";
import analyzeAlumniOf from "./analyze/alumniOf.js";
import analyzeLifeEvent from "./analyze/lifeEvent.js";
import analyzeKeywords from "./analyze/keywords.js";
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

const schemaOrg = "https://schema.org";
const semanticCV = (version: any) => [schemaOrg, `https://semantic.cv/context/${version}.jsonld`];

/**
 * A theme object may set headings and labels. Each must be an object whose keys are known
 * headings or labels and whose values are text; anything else is ignored when rendering, so it is
 * reported as a warning.
 */
const validTheme = (context: AnalysisContext): AnalysisContext => {
  const { object, results } = context;
  const theme = object.theme;
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) {
    return context;
  }
  const problems: Array<string> = [];
  for (const [field, keys] of [
    ["headings", headingKeys],
    ["labels", labelKeys]
  ] as const) {
    const values = theme[field];
    if (values === undefined) {
      continue;
    }
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      problems.push(`theme.${field} must be an object`);
      continue;
    }
    for (const [key, value] of Object.entries(values)) {
      if (!(keys as ReadonlyArray<string>).includes(key)) {
        problems.push(`theme.${field}.${key} is unknown; known are ${keys.join(", ")}`);
      } else if (typeof value !== "string" || !value.trim()) {
        problems.push(`theme.${field}.${key} must be text`);
      }
    }
  }
  return problems.length
    ? { object, results: { ...results, theme: warning(...problems) } }
    : { object, results: { ...results, theme: Success } };
};

/**
 * @context must be schema.org or one of the Semantic-CV contexts, optionally followed by
 * { "@language": "…" } with a valid language tag, the language of the CV.
 */
const validContext = (context: AnalysisContext): AnalysisContext => {
  const { object, results } = context;
  const value = object["@context"];
  const known = [schemaOrg, semanticCV("latest"), semanticCV("1.0")];
  const entries = Array.isArray(value) ? value : [value];
  const last = entries[entries.length - 1];
  const hasLanguage = last && typeof last === "object" && !Array.isArray(last);
  const base = hasLanguage ? entries.slice(0, -1) : value;
  const baseIsKnown = known.some(
    (k) => equals(base, k) || (Array.isArray(base) && base.length === 1 && equals(base[0], k))
  );
  const languageIsValid =
    !hasLanguage || (Object.keys(last).length === 1 && languageOfContext([last]) !== undefined);
  const isValid = baseIsKnown && languageIsValid;
  return {
    object,
    results: {
      ...results,
      ["@context"]: isValid
        ? Success
        : error(
            languageIsValid
              ? `Value must be any of ${JSON.stringify(known, null, 2)}, optionally followed by { "@language": "<language tag>" }`
              : `{ "@language": … } must hold a language tag, such as "sv" or "en-GB"`
          )
    }
  };
};

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
    validContext,
    validTheme,
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
    analyzeKeywords,
    analyzeAlumniOf,
    analyzeLifeEvent,
    analyzeHasCredential,
    analyzeHasCertification
  )(context);
  return results;
}

export default analyze;

const equals = (a: any, b: any): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => equals(v, b[i]));
  }
  return a === b;
};
