import { listOfObjects, optional } from "../analyze.js";

/**
 * Validate the `lifeEvent` field on a Person object.
 *
 * The field is optional, but when present it must be a list of objects.
 * This ensures each life event has a structured shape before deeper
 * normalization is applied.
 */
export const analyzeLifeEvent = (person: any) => optional("lifeEvent")(listOfObjects)(person);

export default analyzeLifeEvent;
