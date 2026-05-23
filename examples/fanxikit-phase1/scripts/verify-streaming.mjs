import path from "node:path";
import { createRouteManifest, createSsrApp, renderHtmlShell, splitHtmlStream, streamResponse } from "fanxikit";

const root = path.resolve(process.cwd());
const manifest = createRouteManifest(root);

const app = createSsrApp(manifest, ({ url, manifest: currentManifest, data, serialized }) => {
  const html = renderHtmlShell({ url, manifest: currentManifest, data, serialized });
  if (url.searchParams.get("stream") === "1") {
    return streamResponse(splitHtmlStream(html, 128), {
      headers: { "x-fanxikit-stream": "1" },
    });
  }
  return html;
});

const response = await app.handleRequest(new Request("http://localhost/about?stream=1"));
const html = await response.text();

if (response.headers.get("x-fanxikit-stream") !== "1") {
  throw new Error("Missing streaming marker header x-fanxikit-stream=1");
}
if (!html.includes("fanxikit - /about")) {
  throw new Error("Unexpected streamed HTML content");
}

console.log("streaming verify: ok");
