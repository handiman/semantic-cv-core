import { listOfObjects, optional } from "../analyze.js";

/**
 * Validate the `hasCertification` field on a Person object.
 *
 * The field is optional, but when present it must be a list of objects.
 */
export const analyzeHasCertification = (person: any) =>
  optional("hasCertification")(listOfObjects)(person);

export default analyzeHasCertification;
