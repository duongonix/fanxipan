export function composeEventHandlers<E>(
  user?: ((event: E) => void) | undefined,
  internal?: ((event: E) => void) | undefined
) {
  return (event: E) => {
    user?.(event);
    internal?.(event);
  };
}

