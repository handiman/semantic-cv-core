const dateDescending = (a: any, b: any) => {
  const now = new Date().getTime();
  const dateA = a ? Date.parse(a) : now;
  const dateB = b ? Date.parse(b) : now;
  return (isNaN(dateB) ? now : dateB) - (isNaN(dateA) ? now : dateA);
};
// Global priority (always first)
const GLOBAL_PRIORITY = ["@context", "@type"];

// Bottom priority (always last)
const BOTTOM_PRIORITY = ["theme"];

// Person-level priority
const PERSON_PRIORITY = [
  "name",
  "jobTitle",
  "description",
  "image",
  "url",
  "sameAs",
  "knowsLanguage",
  "knowsAbout",
  "skills",
  "hasCertification",
  "alumniOf",
  "worksFor"
];

// Work Role priority
const ROLE_PRIORITY = ["@type", "roleName", "description", "startDate", "endDate", "worksFor"];

// Education Role priority (alumniOf)
const ALUMNI_PRIORITY = ["@type", "alumniOf", "description", "startDate", "endDate"];

// Special ordering for worksFor entries
const WORKSFOR_TYPE_ORDER = ["Project", "Organization"];

/**
 * Deterministic field sorting with priority:
 */
export function sortFields(value: any, parentKey?: string): any {
  // Handle arrays
  if (Array.isArray(value)) {
    const sortedArray = value.map((v) => sortFields(v));

    if (parentKey === "worksFor") {
      return sortedArray.sort((a, b) => {
        const atype = a?.worksFor?.["@type"] ?? "";
        const btype = b?.worksFor?.["@type"] ?? "";

        const ai = WORKSFOR_TYPE_ORDER.indexOf(atype);
        const bi = WORKSFOR_TYPE_ORDER.indexOf(btype);

        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;

        return atype.localeCompare(btype);
      });
    }

    return sortedArray;
  }

  // Handle objects
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;

    // Determine priority based on object type
    let priority: string[];

    if (obj["@type"] === "Role" && obj.alumniOf) {
      priority = [...GLOBAL_PRIORITY, ...ALUMNI_PRIORITY];
    } else if (obj["@type"] === "Role") {
      priority = [...GLOBAL_PRIORITY, ...ROLE_PRIORITY];
    } else {
      priority = [...GLOBAL_PRIORITY, ...PERSON_PRIORITY];
    }

    const entries = Object.entries(obj).map(([key, val]) => {
      return [key, sortFields(val, key)] as [string, unknown];
    });

    entries.sort(([a], [b]) => {
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);

      // 1. Top-priority fields
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;

      // 2. Bottom-priority fields (always last)
      const aBottom = BOTTOM_PRIORITY.includes(a);
      const bBottom = BOTTOM_PRIORITY.includes(b);

      if (aBottom && bBottom) return 0;
      if (aBottom) return 1;
      if (bBottom) return -1;

      // 3. Alphabetical fallback
      return a.localeCompare(b);
    });

    return Object.fromEntries(entries);
  }

  return value;
}

export default {
  dateDescending: (fieldName: string) => (arr: Array<any>) =>
    arr.sort((a: any, b: any) => dateDescending(a[fieldName], b[fieldName]))
};
