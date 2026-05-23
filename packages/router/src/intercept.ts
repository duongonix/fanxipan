export function installLinkInterceptor(navigate: (to: string) => void): () => void {
  if (typeof document === "undefined") return () => {};
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target as Element | null;
    const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = toInternalHref(anchor);
    if (!href) return;
    event.preventDefault();
    navigate(href);
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}

export function toInternalHref(anchor: HTMLAnchorElement): string | null {
  const href = anchor.getAttribute("href");
  if (!href) return null;
  if (anchor.target === "_blank") return null;
  if (anchor.hasAttribute("download")) return null;
  if (href.startsWith("#")) return null;
  if (/^(mailto:|tel:|javascript:)/i.test(href)) return null;

  if (href.startsWith("http://") || href.startsWith("https://")) {
    if (typeof window === "undefined") return null;
    const u = new URL(href);
    if (u.origin !== window.location.origin) return null;
    return `${u.pathname}${u.search}${u.hash}`;
  }

  return href;
}
