import { createServer } from 'node:http';
import { createRouteManifest, createSsrApp, renderHtmlShell } from 'fanxikit';

const root = "C:\\Users\\duong\\Workspace\\dev\\rust\\app\\renex\\examples\\fanxikit";
export function createHandler() {
  const manifest = createRouteManifest(root);
  const app = createSsrApp(manifest, ({ url, manifest, data, serialized, head, css }) =>
    renderHtmlShell({ url, manifest, data, serialized, head, css })
  );
  return async function handle(req, res) {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url || '/', `http://${host}`);
    const response = await app.handleRequest(new Request(url, { method: req.method, headers: req.headers }));
    res.statusCode = response.status;
    for (const [key, value] of response.headers.entries()) res.setHeader(key, value);
    if (!response.body) return res.end();
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  };
}

export async function start({ port = Number(process.env.PORT || 3000) } = {}) {
  const server = createServer(createHandler());
  await new Promise((resolve) => server.listen(port, resolve));
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().then((server) => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : process.env.PORT || 3000;
    console.log(`fanxikit node server listening at http://localhost:${port}`);
  });
}
