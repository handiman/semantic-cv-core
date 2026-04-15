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
 * Normalize the `lifeEvent` array on a Person object.
 *
 * Each life event is transformed into a canonical schema.org/Event with:
 *   • \@type: "Event"
 *   • normalized scalar fields (name, description)
 *   • no @context, null, undefined, or empty values
 *   • deterministic key ordering
 *
 * The list is sorted by `startDate` descending so the most recent
 * events appear first.
 *
 * If the Person has no `lifeEvent` field, the object is returned
 * unchanged.
 */
export function normalizeLifeEvent(person: any) {
  const { lifeEvent } = person;
  return !lifeEvent
    ? person
    : {
        ...person,
        lifeEvent: sort.dateDescending("startDate")(
          (lifeEvent ?? []).map(
            pipe(
              setType("Event"),
              singleValues(["name", "description"]),
              removeContext,
              removeEmpty,
              removeNull,
              removeUndefined,
              sortFields
            )
          )
        )
      };
}

export default normalizeLifeEvent;
