import { escapeHtml } from "./render/escape.js";

/**
 * The headings and labels a CV can set for its theme, in its theme object:
 *
 *   "theme": { "@type": "Theme", "name": "lena", "headings": { "worksFor": "Uppdrag" },
 *              "labels": { "present": "nu" } }
 *
 * The keys are those of ThemeOptions in semantic-cv-themes; keep the two in step.
 */
export const headingKeys = [
  "contact",
  "description",
  "knowsLanguage",
  "knowsAbout",
  "skills",
  "certifications",
  "worksFor",
  "alumniOf",
  "projects",
  "lifeEvent"
] as const;

export const labelKeys = ["present"] as const;

export type CustomThemeOptions = {
  headings?: Partial<Record<(typeof headingKeys)[number], string>>;
  labels?: Partial<Record<(typeof labelKeys)[number], string>>;
};

const pick = (values: unknown, keys: ReadonlyArray<string>): Record<string, string> | undefined => {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return undefined;
  }
  const picked = keys
    .map((key) => [key, (values as Record<string, unknown>)[key]] as const)
    .filter(([, value]) => typeof value === "string" && value.trim())
    .map(([key, value]) => [key, escapeHtml((value as string).trim())]);
  return picked.length ? Object.fromEntries(picked) : undefined;
};

/**
 * The headings and labels the CV sets in its theme object, HTML-escaped, or undefined when it
 * sets none. Themes insert them as HTML, like the rest of the Person, so they must be escaped here.
 * Unknown keys and values that aren't text are left out.
 */
export const themeOptionsOf = (person: unknown): CustomThemeOptions | undefined => {
  const theme = person && typeof person === "object" ? (person as any).theme : undefined;
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) {
    return undefined;
  }
  const headings = pick(theme.headings, headingKeys);
  const labels = pick(theme.labels, labelKeys);
  if (!headings && !labels) {
    return undefined;
  }
  return { ...(headings ? { headings } : {}), ...(labels ? { labels } : {}) };
};

export default themeOptionsOf;
