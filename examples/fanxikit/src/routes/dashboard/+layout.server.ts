export async function load(event) {
  return {
    dashboardUser: event.locals.user ?? { id: "guest", name: "Guest" },
  };
}
