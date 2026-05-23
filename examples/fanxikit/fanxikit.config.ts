import { defineConfig } from "fanxikit";

export default defineConfig({
  base: "/",
  trailingSlash: "ignore",
  ssr: true,
  csr: true,
  prerender: {
    entries: ["/", "/about"],
  },
  spa: {
    fallback: "200.html",
  },
});
