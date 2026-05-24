export type SnippetInstance = {
  update?: (nextArgs: unknown[]) => void;
  destroy: () => void;
};

export type RawSnippetRenderer<Args extends any[] = any[]> = (
  anchor: Comment,
  args: Args
) => SnippetInstance;

export type SnippetResult = DocumentFragment | Node | null | undefined;

export type Snippet<Args extends any[] = []> = {
  (...args: Args): SnippetResult;
  __fanxipan_snippet?: true;
};

export function isSnippet(value: unknown): value is Snippet<any[]> {
  return typeof value === "function";
}

export function createRawSnippet<Args extends any[] = []>(
  render: RawSnippetRenderer<Args>
): Snippet<Args> {
  const snippet = ((...args: Args) => {
    const frag = document.createDocumentFragment();
    const anchor = document.createComment("fanxipan:raw-snippet");
    frag.appendChild(anchor);
    const instance = render(anchor, args);
    if (instance?.destroy) {
      const originalDestroy = instance.destroy.bind(instance);
      instance.destroy = () => {
        originalDestroy();
        anchor.remove();
      };
    }
    return frag;
  }) as Snippet<Args>;
  snippet.__fanxipan_snippet = true;
  return snippet;
}
