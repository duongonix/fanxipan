import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const server = await createServer({
  configFile: fileURLToPath(new URL("./vite.config.ts", import.meta.url)),
  configLoader: "runner",
  server: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,
  },
});

await server.listen();
server.printUrls();

const close = async () => {
  await server.close();
  process.exit(0);
};

process.on("SIGINT", close);
process.on("SIGTERM", close);

setInterval(() => {}, 2147483647);
