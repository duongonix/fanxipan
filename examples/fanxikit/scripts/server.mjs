import { createServer } from "node:http";
import { createRouteManifest, createSsrApp, renderHtmlShell, splitHtmlStream, streamResponse } from "fanxikit";

const manifest = createRouteManifest(process.cwd());
const app = createSsrApp(manifest, ({ url, manifest, data, serialized, head, css }) => {
  const html = renderHtmlShell({ url, manifest, data, serialized, head, css });
  if (url.searchParams.get("stream") === "1") {
    return streamResponse(splitHtmlStream(html, 256), {
      headers: { "x-fanxikit-stream": "1" },
    });
  }
  return html;
});

const server = createServer(async (req, res) => {
  const host = req.headers.host ?? "localhost:4180";
  const url = new URL(req.url ?? "/", `http://${host}`);
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
});

server.listen(4180, () => {
  console.log("fanxikit example listening at http://localhost:4180");
});
