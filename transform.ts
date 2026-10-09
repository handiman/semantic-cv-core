/**
 * Runtime-neutral HTML rewriting contract used by renderHTML: the Worker
 * implements it with the native HTMLRewriter and the CLI with
 * html-rewriter-wasm. semantic-cv-themes declares the same shape in
 * htmlTransformer.ts; TypeScript matches them structurally.
 */
export interface HTMLTransformer {
  transform(html: string): Promise<string>;
  on(
    selector: string,
    hooks: {
      element: (el: any) => void;
    }
  ): HTMLTransformer;
}
