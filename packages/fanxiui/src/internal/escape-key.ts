export function onEscape(event: KeyboardEvent, handler: () => void) {
  if (event.key === "Escape") handler();
}
