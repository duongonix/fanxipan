export async function load({ params }) {
  console.log("blog detail page load", params);
  return {
    page: "blog-detail",
    id: params.id,
  };
}
