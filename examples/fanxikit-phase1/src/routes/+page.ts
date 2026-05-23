export async function load({ url }) {
  return {
    page: "home",
    path: url.pathname,
  };
}

export const prerender = true;
