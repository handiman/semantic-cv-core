import {
  removeContext,
  removeEmpty,
  removeNull,
  removeUndefined,
  setType,
  singleValues,
  toSingle
} from "../normalize.js";
import pipe from "../pipe.js";
import sort, { sortFields } from "../sort.js";

/**
 * Normalization for `alumniOf` entries.
 *
 * Each item is converted into a Role wrapper with:
 *   - \@type: "Role"
 *   - normalized scalar fields (roleName, description, startDate, endDate, alumniOf)
 *   - no @context, null, undefined, or empty values
 *
 * The nested `alumniOf` value is normalized into an EducationalOrganization with:
 *   - \@type: "EducationalOrganization"
 *   - normalized scalar fields (name, description, location)
 *   - cleaned and context‑free structure
 *
 * The final list is sorted by `endDate` descending to produce a stable,
 * chronological education history.
 */
const wrapperPipe = (initial: any) => {
  const normalized = pipe(
    setType("Role"),
    singleValues(["roleName", "description", "startDate", "endDate", "alumniOf"]),
    removeContext,
    removeUndefined,
    removeNull,
    removeEmpty,
    sortFields
  )(initial);

  const innerPipe = pipe(
    removeContext,
    removeUndefined,
    removeNull,
    removeEmpty,
    setType("EducationalOrganization"),
    singleValues(["name", "description", "location"])
  );
  return {
    ...normalized,
    alumniOf: innerPipe(toSingle(initial.alumniOf ?? {}))
  };
};

/**
 * Normalize the `alumniOf` array on a Person object.
 *
 * - leaves the Person untouched if no alumniOf is present
 * - applies wrapperPipe to each entry
 * - sorts the result by endDate descending
 */
export function normalizeAlumniOf(person: any) {
  const { alumniOf } = person;
  return !alumniOf
    ? person
    : {
        ...person,
        alumniOf: sort.dateDescending("endDate")((alumniOf ?? []).map(wrapperPipe))
      };
}

export default normalizeAlumniOf;
