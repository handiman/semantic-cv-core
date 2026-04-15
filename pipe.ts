/**
 * Build a deterministic transformation pipeline.
 *
 * The pipeline executes each step in order, passing the output of one
 * step into the next. Steps may be synchronous or asynchronous:
 * the first Promise returned by any step switches the entire pipeline
 * into async mode, and all subsequent steps are awaited.
 *
 * This makes `pipe()` ideal for Semantic‑CV’s rendering and analysis
 * flows, where most transformations are pure functions but some
 * (asset loading, I/O, HTML rewriting) require async behavior.
 *
 * Each step receives:
 *   - `value`: the current accumulated value
 *   - `context`: a shared object for passing configuration or state
 *
 * Steps must be deterministic and side‑effect‑free unless they are
 * explicitly intended as terminal actions (e.g. writing a file).
 *
 * @param steps Ordered list of transformation functions of the form
 *              `(value, context) => any | Promise<any>`.
 *
 * @returns A function `(initial, context)` that runs the pipeline.
 *          The return value is synchronous unless any step returns
 *          a Promise, in which case the result is a Promise resolving
 *          to the final value.
 *
 * @example
 * const process = pipe(
 *   loadFromFile(fileName),
 *   setProperty(name, value),
 *   normalize,
 *   saveToFile(fileName))();
 *
 * await process(person);
 */
export default function pipe(...steps: Array<(value: any, context: any) => any>) {
  return function (initial: any = {}, context: any = {}) {
    let current = initial;
    let isAsync = false;

    for (const step of steps) {
      if (isAsync) {
        current = Promise.resolve(current).then(() => step(current, context));
      } else {
        current = step(current, context);
        if (current instanceof Promise) {
          isAsync = true;
        }
      }
    }

    return current;
  };
}
