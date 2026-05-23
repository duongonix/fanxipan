export async function load(event) {
  event.depends(`blog:${event.params.id}`);
  return {
    page: "blog-detail",
    id: event.params.id,
    user: event.locals.user,
  };
}
