import { createRouteManifest, createSsrApp, renderHtmlShell } from "fanxikit";

const manifest = createRouteManifest(process.cwd());
const app = createSsrApp(manifest, ({ url, manifest, data, serialized, head, css }) =>
  renderHtmlShell({ url, manifest, data, serialized, head, css })
);

const blog = await app.handleRequest(new Request("http://localhost/blog/42", {
  headers: { cookie: "session=ada" },
}));
const blogHtml = await blog.text();
if (!blogHtml.includes("Blog detail")) throw new Error("Blog UI did not render");
if (!blogHtml.includes("\"id\":\"42\"")) throw new Error("Blog load data was not serialized");

const api = await app.handleRequest(new Request("http://localhost/api/users", {
  headers: { cookie: "session=ada" },
}));
const payload = await api.json();
if (payload.current?.name !== "Ada") throw new Error("hooks.server locals did not reach API routes");

const action = await app.handleRequest(new Request("http://localhost/", {
  method: "POST",
  body: new URLSearchParams({ name: "Grace" }),
  headers: { "content-type": "application/x-www-form-urlencoded" },
}));
if (action.status !== 303) throw new Error(`expected action redirect, got ${action.status}`);
if (!action.headers.get("set-cookie")?.includes("session=grace")) throw new Error("action did not set cookie");

console.log("fanxikit example verify: ok");
