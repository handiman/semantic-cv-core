export interface HTMLTransformer {
  transform(html: string): Promise<string>;
  on(
    selector: string,
    hooks: {
      element: (el: any) => void;
    }
  ): HTMLTransformer;
}
