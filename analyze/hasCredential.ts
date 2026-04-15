import { listOfObjects, optional } from "../analyze.js";

/**
 * Validate the `hasCredential` field on a Person object.
 *
 * The field is optional, but when present it must be a list of objects.
 * This ensures each credential entry has the expected structured shape
 * before deeper validation is applied by the normalization pipeline.
 */
export const analyzeHasCredential = (person: any) =>
  optional("hasCredential")(listOfObjects)(person);

export default analyzeHasCredential;
