function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>(
    'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
  );
  return Array.from(nodes).filter((el) => !el.hasAttribute("disabled"));
}

export function createFocusTrap(container: HTMLElement) {
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const focusable = getFocusable(container);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };
  container.addEventListener("keydown", onKeydown);
  return () => container.removeEventListener("keydown", onKeydown);
}

