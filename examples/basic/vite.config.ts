import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import fanxipanPlugin from "vite-plugin-fanxipan";

export default defineConfig({
  plugins: [tailwindcss(), fanxipanPlugin()],
});


