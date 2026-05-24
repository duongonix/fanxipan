export function createPortalHost(target?: string | Element | null) {
  if (typeof document === "undefined") return null;
  if (target instanceof Element) return target;
  if (typeof target === "string") return document.querySelector(target);
  return document.body;
}
