import { removeContext, removeEmpty, removeNull, removeUndefined, setType } from "../normalize.js";
import pipe from "../pipe.js";
import { sortFields } from "../sort.js";

/**
 * Turn one keyword into a schema.org/DefinedTerm.
 *
 * A string becomes `{ "@type": "DefinedTerm", name }`. An object keeps its
 * properties (e.g. `termCode`) and gets \@type "DefinedTerm". Anything that
 * ends up without a `name` is not a usable term and is dropped (`undefined`).
 */
const toDefinedTerm = (keyword: any) => {
  const term =
    "string" === typeof keyword
      ? { name: keyword }
      : keyword && "object" === typeof keyword && !Array.isArray(keyword)
        ? keyword
        : undefined;

  if (undefined === term) {
    return undefined;
  }

  const normalized = pipe(
    setType("DefinedTerm"),
    removeContext,
    removeUndefined,
    removeNull,
    removeEmpty,
    sortFields
  )(term);

  return "string" === typeof normalized.name && normalized.name.length > 0 ? normalized : undefined;
};

/**
 * Normalize the `keywords` property on an object (a Project or an Organization).
 *
 * `keywords` becomes an array of schema.org/DefinedTerm objects:
 *   • a string, or a list of strings, is converted to DefinedTerms
 *   • existing DefinedTerm objects are kept and cleaned
 *   • entries without a name are dropped
 *   • the author's order is kept
 *
 * If nothing usable is left, `keywords` is removed. If the object has no
 * `keywords`, it is returned unchanged.
 */
export function normalizeKeywords(item: any) {
  if (!item || undefined === item.keywords) {
    return item;
  }

  const { keywords, ...rest } = item;
  const terms = (Array.isArray(keywords) ? keywords : [keywords])
    .map(toDefinedTerm)
    .filter((term: any) => undefined !== term);

  return terms.length > 0 ? { ...rest, keywords: terms } : rest;
}

export default normalizeKeywords;
