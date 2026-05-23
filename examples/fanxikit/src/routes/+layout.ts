export const prerender = true;

export async function load(event) {
  event.depends("app:navigation");
  return {
    appName: "FanxiKit Production Readiness Example",
    user: event.locals.user,
  };
}
