import {
  removeContext,
  removeEmpty,
  removeNull,
  removeUndefined,
  setType,
  singleValues,
  sortFields,
  toSingle
} from "../normalize.js";
import pipe from "../pipe.js";
import sort from "../sort.js";

/**
 * Normalize the `worksFor` array on a Person object.
 *
 * Each entry is transformed into a Role wrapper with:
 *   • \@type: "Role"
 *   • normalized scalar fields (roleName, description, startDate, endDate, worksFor)
 *   • no @context, null, undefined, or empty values
 *   • deterministic key ordering
 *
 * The nested `worksFor` value is normalized into either:
 *   • a Project (if \@type === "Project"), or
 *   • an Organization (default case)
 *
 * The inner object has:
 *   • no \@context
 *   • normalized scalar fields (name, description, location)
 *   • \@type set to "Organization" unless already a Project
 *
 * The final list is sorted by `endDate` descending so the most recent
 * work experiences appear first.
 *
 * If the Person has no `worksFor` field, the object is returned unchanged.
 */
const wrapperPipe = (initial: any) => {
  const normalized = pipe(
    setType("Role"),
    singleValues(["roleName", "description", "startDate", "endDate", "worksFor"]),
    removeContext,
    removeUndefined,
    removeNull,
    removeEmpty,
    sortFields
  )(initial);

  const innerPipe = pipe(
    removeContext,
    removeUndefined,
    (item: any): any => ("Project" === item["@type"] ? item : setType("Organization")(item)),
    removeNull,
    removeEmpty,
    singleValues(["name", "description", "location"])
  );
  return {
    ...normalized,
    worksFor: innerPipe(toSingle(initial.worksFor ?? {}))
  };
};

/**
 * Apply Role/Organization normalization to all `worksFor` entries.
 */
export function normalizeWorksFor(person: any) {
  const { worksFor } = person;
  return !worksFor
    ? person
    : {
        ...person,
        worksFor: sort.dateDescending("endDate")((worksFor ?? []).map(wrapperPipe))
      };
}

export default normalizeWorksFor;
