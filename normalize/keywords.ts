import { removeContext, removeEmpty, removeNull, removeUndefined, setType } from "../normalize.js";
import pipe from "../pipe.js";
import { sortFields } from "../sort.js";

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
