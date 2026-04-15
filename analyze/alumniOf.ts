import { listOfObjects, notEmpty, optional } from "../analyze.js";

/**
 * Validate the `alumniOf` field on a Person object.
 *
 * The field is optional, but when present it must:
 *   • contain at least one item
 *   • be a list of objects
 *
 * Delegates to the shared optional‑field analyzers.
 */
export const analyzeAlumniOf = (person: any) =>
  optional("alumniOf")(notEmpty, listOfObjects)(person);

export default analyzeAlumniOf;
