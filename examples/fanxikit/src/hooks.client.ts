export function beforeNavigate(event) {
  console.debug("before navigate", event.to.path);
}

export function afterNavigate(event) {
  console.debug("after navigate", event.to.path);
}

export function handleError(error) {
  console.error("client navigation error", error);
}
