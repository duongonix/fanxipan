import { createServer } from "node:http";
import path from "node:path";
import { createRouteManifest, createSsrApp, renderHtmlShell, splitHtmlStream, streamResponse } from "fanxikit";

const root = path.resolve(process.cwd());

const server = createServer(async (req, res) => {
  const manifest = createRouteManifest(root);
  const host = req.headers.host ?? "localhost:4179";
  const url = new URL(req.url ?? "/", `http://${host}`);
  const app = createSsrApp(manifest, ({ url: renderUrl, manifest: currentManifest, data, serialized }) => {
    const html = renderHtmlShell({ url: renderUrl, manifest: currentManifest, data, serialized });
    if (url.searchParams.get("stream") === "1") {
      return streamResponse(splitHtmlStream(html, 256), {
        headers: { "x-fanxikit-stream": "1" },
      });
    }
    return html;
  });
  const response = await app.handleRequest(new Request(url));
  await writeNodeResponse(res, response);
});

server.listen(4179, () => {
  console.log("fanxikit phase1 SSR server listening at http://localhost:4179");
  console.log("Try streaming demo: http://localhost:4179/about?stream=1");
});

async function writeNodeResponse(res, response) {
  res.statusCode = response.status;
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }

  if (!response.body) {
    res.end();
    return;
  }

  const reader = response.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  } finally {
    reader.releaseLock();
  }
}

