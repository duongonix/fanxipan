export function applyScopedClass(el: Element, scopeId: string): void {
  if (!scopeId) return;
  el.classList.add(scopeId);
}
