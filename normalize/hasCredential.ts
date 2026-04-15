import {
  removeContext,
  removeEmpty,
  removeNull,
  removeUndefined,
  setType,
  singleValues,
} from "../normalize.js";
import pipe from "../pipe.js";
import sort, { sortFields } from "../sort.js";

/**
 * Normalize the `hasCredential` array on a Person object.
 *
 * Each credential entry is transformed into a canonical
 * EducationalOccupationalCredential with:
 *   • \@type: "EducationalOccupationalCredential"
 *   • normalized scalar fields (name, description, datePublished, expires, image)
 *   • no @context, null, undefined, or empty values
 *   • deterministic key ordering
 *
 * The list is sorted by `datePublished` descending so the most recent
 * credentials appear first.
 *
 * If the Person has no `hasCredential` field, the object is returned
 * unchanged.
 */
export function normalizeHasCredential(person: any) {
  const { hasCredential } = person;
  return !hasCredential
    ? person
    : {
        ...person,
        hasCredential: sort
          .dateDescending("datePublished")(hasCredential ?? [])
          .map(
            pipe(
              setType("EducationalOccupationalCredential"),
              singleValues(["name", "description", "datePublished", "expires", "image"]),
              removeContext,
              removeUndefined,
              removeNull,
              removeEmpty,
              sortFields
            )
          )
      };
}

export default normalizeHasCredential;
