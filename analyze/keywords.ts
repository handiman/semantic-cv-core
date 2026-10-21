import { AnalysisResult, listOfObjects, optional, Success } from "../analyze.js";

export const analyzeKeywords = (context: { object: any; results: any }) => {
  const { object, results } = context;
  const roles = Array.isArray(object.worksFor) ? object.worksFor : [object.worksFor];

  const found = roles.map((role: any, index: number) => {
    const isObject = role && "object" === typeof role;
    const result: AnalysisResult = isObject
      ? optional("keywords")(listOfObjects)({ object: role, results: {} }).results.keywords
      : Success;
    return {
      errors: result.errors.map((message) => `worksFor[${index}]: ${message}`),
      warnings: result.warnings.map((message) => `worksFor[${index}]: ${message}`)
    };
  });

  return {
    object,
    results: {
      ...results,
      keywords: {
        errors: found.flatMap((result: AnalysisResult) => result.errors),
        warnings: found.flatMap((result: AnalysisResult) => result.warnings)
      }
    }
  };
};

export default analyzeKeywords;
