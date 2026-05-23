export function currentUrl(): URL {
  if (typeof window === "undefined") return new URL("http://localhost/");
  return new URL(window.location.href);
}

export function pushUrl(path: string): void {
  if (typeof window === "undefined") return;
  window.history.pushState(null, "", path);
}

export function replaceUrl(path: string): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", path);
}
