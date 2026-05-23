export async function handle({ event, resolve }) {
  const session = event.cookies.get("session") ?? "guest";
  event.locals.user = session === "guest" ? null : { id: session, name: "Ada" };
  event.locals.startedAt = new Date(0).toISOString();
  return resolve(event);
}

export async function handleFetch({ request, fetch }) {
  return fetch(request);
}

export function handleError({ error, message }) {
  console.error("[fanxikit-example]", message, error);
}
