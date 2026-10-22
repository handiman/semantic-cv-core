/**
 * The language of a CV's texts. JSON-LD gives a document's default language in its context:
 *
 *   "@context": ["https://schema.org", { "@language": "sv" }]
 *
 * Only a well-formed BCP 47 tag is accepted (letters, digits and hyphens), so the value can go
 * into an attribute such as <html lang> without anything else in it.
 */
const languageTag = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/;

/** The language tag in an { "@language": "…" } entry of a @context, or undefined. */
export const languageOfContext = (context: unknown): string | undefined => {
  const entries = Array.isArray(context) ? context : [context];
  for (const entry of entries) {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const language = (entry as Record<string, unknown>)["@language"];
      if (typeof language === "string" && languageTag.test(language.trim())) {
        return language.trim();
      }
    }
  }
  return undefined;
};

/** The language of a Person's texts, from its @context, or undefined when it doesn't say. */
export const languageOf = (person: unknown): string | undefined =>
  person && typeof person === "object"
    ? languageOfContext((person as Record<string, unknown>)["@context"])
    : undefined;

export default languageOf;
