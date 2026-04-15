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
 * Normalize the `hasCertification` array on a Person object.
 *
 * Each certification entry is transformed into a clean, canonical
 * schema.org/Certification object with:
 *   • \@type: "Certification"
 *   • normalized scalar fields (name, description, validFrom, expires, logo,
 *     issuedBy, certificationIdentification)
 *   • no @context, null, undefined, or empty values
 *   • deterministic key ordering
 *
 * The list is sorted by `validFrom` descending so the most recent
 * certifications appear first.
 *
 * If the Person has no `hasCertification` field, the object is returned
 * unchanged.
 */
export function normalizeHasCertification(person: any) {
  const { hasCertification } = person;
  return !hasCertification
    ? person
    : {
        ...person,
        hasCertification: sort
          .dateDescending("validFrom")(hasCertification ?? [])
          .map(
            pipe(
              setType("Certification"),
              singleValues([
                "name",
                "description",
                "validFrom",
                "expires",
                "logo",
                "issuedBy",
                "certificationIdentification"
              ]),
              removeContext,
              removeUndefined,
              removeNull,
              removeEmpty,
              sortFields
            )
          )
      };
}

export default normalizeHasCertification;
