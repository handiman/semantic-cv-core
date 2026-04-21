/**
 * Normalization pipeline for Semantic‑CV Person documents.
 *
 * The goal of normalization is to take arbitrary user input (possibly
 * inconsistent, partially structured, or using mixed casing) and
 * produce a clean, canonical schema.org/Person object with:
 *
 *   • stable casing for all known keys
 *   • predictable single‑value vs array semantics
 *   • no null/undefined/empty values
 *   • a guaranteed \@context and \@type
 *   • normalized nested structures (worksFor, alumniOf, credentials, etc.)
 *   • deterministic key ordering for stable output
 *
 * Normalization is idempotent: running it multiple times yields the
 * same result. It is intentionally strict about field shapes so that
 * renderers and themes can rely on consistent structure.
 */

import pipe from "./pipe.js";
import normalizeWorksFor from "./normalize/worksFor.js";
import normalizeAlumniOf from "./normalize/alumniOf.js";
import normalizeLifeEvent from "./normalize/lifeEvent.js";
import normalizeHasCredential from "./normalize/hasCredential.js";
import normalizeHasCertification from "./normalize/hasCertification.js";
import { sortFields } from "./sort.js";

/**
 * Fix casing of known schema.org keys (case‑insensitive match).
 * Unknown keys are left untouched.
 */
function fixCasing<T>(value: T): T {
  const validKeys = [
    "@context",
    "@type",
    "@theme",
    "name",
    "description",
    "jobTitle",
    "telephone",
    "workLocation",
    "email",
    "url",
    "image",
    "worksFor",
    "alumniOf",
    "sameAs",
    "address",
    "description",
    "lifeEvent",
    "nationality",
    "hasCertification",
    "hasCredential",
    "knowsAbout",
    "skills",
    "knowsLanguage",
    "location",
    "member",
    "roleName",
    "startDate",
    "endDate",
    "issuedBy",
    "validFrom",
    "expires",
    "certificationIdentification",
    "datePublished"
  ];
  if (Array.isArray(value)) {
    return value.map((v) => fixCasing(v)) as T;
  }

  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const [key, val] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      const correct = [...validKeys].find((k) => k.toLowerCase() === lower);
      if (correct && key !== correct) {
        obj[key] = undefined;
        obj[correct ?? key] = fixCasing(val);
      }
    }

    return obj as T;
  }

  return value;
}

/**
 * Convert a value into an array, removing empty/null items.
 */
export const toArray = (value: any) => {
  if (undefined === value || null === value) {
    return value;
  }

  return (Array.isArray(value) ? value : [value]).filter(
    (item: any) => item !== undefined && item !== null && item !== ""
  );
};

/**
 * Convert an array to a single value (first element).
 */
export const toSingle = (value: any) => {
  if (undefined === value) {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

/**
 * Normalize selected keys to single values.
 */
export const singleValues = (keys: Array<string>) => {
  return function (initial: any) {
    if (undefined === initial) {
      return initial;
    }

    let normalized = { ...initial };
    for (const key of keys) {
      if (undefined === initial[key]) {
        delete normalized[key];
        continue;
      }

      const single = toSingle(initial[key]);
      normalized = {
        ...normalized,
        [key]: single
      };
    }

    return normalized;
  };
};

/**
 * Normalize selected keys to arrays.
 */
export const arrayValues = (keys: Array<string>) => {
  return function (initial: any) {
    if (undefined === initial) {
      return initial;
    }

    let normalized = { ...initial };
    for (const key of keys) {
      if (initial[key]) {
        normalized = {
          ...normalized,
          [key]: toArray(initial[key])
        };
      }
    }

    return normalized;
  };
};

/**
 * Force \@type to a specific value.
 */
export const setType = (type: string) => (initial: any) => {
  if (undefined === initial) {
    return initial;
  }

  return {
    ...initial,
    "@type": type
  };
};

/**
 * Ensure @context is always present.
 */
const setContext = (person: any) => ({
  ...person,
  "@context": ["https://schema.org", "https://semantic.cv/context/latest.jsonld"]
});

/**
 * Remove @context from nested objects.
 */
export const removeContext = (value: any) => {
  if (undefined === value) {
    return value;
  }

  if (Object.keys(value).includes("@context")) {
    const { ["@context"]: _, ...normalized } = value;
    return normalized;
  }

  return value;
};

/**
 * Remove undefined values.
 */
export const removeUndefined = (obj: any) =>
  undefined === obj
    ? obj
    : Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== undefined));

/**
 * Remove null values.
 */
export const removeNull = (obj: any) =>
  undefined === obj
    ? obj
    : Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== null));

/**
 * Remove empty values.
 */
export const removeEmpty = (obj: string | Array<any>) =>
  undefined === obj
    ? obj
    : Object.fromEntries(Object.entries(obj).filter(([_, value]) => value && value.length > 0));

/**
 * Full normalization pipeline for Person objects.
 */
export const normalize = {
  casing: fixCasing,
  person: pipe(
    fixCasing,
    singleValues([
      "@theme",
      "name",
      "jobTitle",
      "description",
      "nationality",
      "workLocation",
      "telephone",
      "email",
      "url",
      "image"
    ]),
    arrayValues([
      "sameAs",
      "hasCertification",
      "hasCredential",
      "knowsLanguage",
      "knowsAbout",
      "skills",
      "worksFor",
      "alumniOf",
      "lifeEvent"
    ]),
    removeEmpty,
    removeNull,
    removeUndefined,
    removeContext,
    setContext,
    setType("Person"),
    normalizeWorksFor,
    normalizeAlumniOf,
    normalizeHasCredential,
    normalizeHasCertification,
    normalizeLifeEvent,
    sortFields
  )
};

export default normalize.person;
