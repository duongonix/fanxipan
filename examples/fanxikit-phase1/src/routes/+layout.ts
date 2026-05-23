export async function load() {
  return {
    appName: "fanxikit phase4 demo",
    nav: ["/", "/about", "/blog/42"],
  };
}

export const ssr = true;
export const csr = true;
