export function isOutsideClick(target: Node | null, container: Element): boolean {
  return !!target && !container.contains(target);
}
