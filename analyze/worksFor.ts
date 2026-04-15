import { listOfObjects, notEmpty, optional } from "../analyze.js";

/**
 * Validate the `worksFor` field on a Person object.
 *
 * The field is optional, but when present it must:
 *   • contain at least one item  
 *   • be a list of objects  
 *
 * This ensures that each employment or project entry has a structured
 * shape before deeper validation and normalization are applied.
 */
export const analyzeWorksFor = (person: any) =>
  optional("worksFor")(notEmpty, listOfObjects)(person);

export default analyzeWorksFor;
