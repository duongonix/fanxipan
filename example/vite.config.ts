import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import fanxipan from "vite-plugin-fanxipan";

export default defineConfig({
  plugins: [tailwindcss(), fanxipan()],
});
