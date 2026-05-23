import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createRouteManifest } from "./manifest.js";
import { renderHtmlShell } from "./render.js";
import { createSsrApp } from "./ssr.js";

const cleanup: string[] = [];

afterEach(() => {
  while (cleanup.length > 0) {
    const dir = cleanup.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("fanxikit phase2 ssr", () => {
  const pageComponent = "function Page(){ return (<h1>home</h1>); } export default Page;";

  it("merges layout and page load data", async () => {
    const root = setupApp({
      "src/routes/+layout.ts": "export async function load(){ return { app: 'fanxikit' }; }",
      "src/routes/+page.ts": "export async function load(){ return { page: 'home' }; }",
      "src/routes/+page.fanxi": pageComponent,
    });
    const manifest = createRouteManifest(root);
    const app = createSsrApp(manifest, ({ url, manifest: m, data }) => renderHtmlShell({ url, manifest: m, data }));
    const res = await app.handleRequest(new Request("http://localhost/"));
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("<h1>home</h1>");
    expect(html).toContain("window.__fanxikit_DATA__={\"app\":\"fanxikit\",\"page\":\"home\"}");
  });

  it("handles +server endpoint", async () => {
    const root = setupApp({
      "src/routes/api/+server.js": "export function GET(){ return new Response('ok-api'); }",
    });
    const manifest = createRouteManifest(root);
    const app = createSsrApp(manifest, ({ url, manifest: m, data }) => renderHtmlShell({ url, manifest: m, data }));
    const res = await app.handleRequest(new Request("http://localhost/api"));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok-api");
  });

  it("maps redirect signal from endpoint", async () => {
    const root = setupApp({
      "src/routes/r/+server.js":
        "export function GET(){ throw { __fanxikit_redirect: true, status: 302, location: '/to' }; }",
    });
    const manifest = createRouteManifest(root);
    const app = createSsrApp(manifest, ({ url, manifest: m, data }) => renderHtmlShell({ url, manifest: m, data }));
    const res = await app.handleRequest(new Request("http://localhost/r"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/to");
  });

  it("handles page actions via +page.server.ts", async () => {
    const root = setupApp({
      "src/routes/+page.server.ts": "export const actions = { default: async () => ({ ok: true }) };",
      "src/routes/+page.fanxi": pageComponent,
    });
    const manifest = createRouteManifest(root);
    const app = createSsrApp(manifest, ({ url, manifest: m, data }) => renderHtmlShell({ url, manifest: m, data }));
    const res = await app.handleRequest(new Request("http://localhost/", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("\"ok\":true");
  });

  it("renders error page shell when load throws", async () => {
    const root = setupApp({
      "src/routes/+error.fanxi": "function Err(){ return (<h1>error</h1>); } export default Err;",
      "src/routes/+page.ts": "export async function load(){ throw Object.assign(new Error('boom'), { status: 500 }); }",
      "src/routes/+page.fanxi": pageComponent,
    });
    const manifest = createRouteManifest(root);
    const app = createSsrApp(manifest, ({ url, manifest: m, data }) => renderHtmlShell({ url, manifest: m, data }));
    const res = await app.handleRequest(new Request("http://localhost/"));
    const html = await res.text();
    expect(res.status).toBe(500);
    expect(html).toContain("data-fanxikit-error");
    expect(html).toContain("boom");
  });

  it("returns csr shell when route disables ssr", async () => {
    const root = setupApp({
      "src/routes/blog/[id]/+page.fanxi": "function Blog(){ return (<h1>blog</h1>); } export default Blog;",
      "src/routes/blog/[id]/+page.ts": "export const ssr = false; export const csr = true;",
    });
    const manifest = createRouteManifest(root);
    const app = createSsrApp(manifest, ({ url, manifest: m, data }) => renderHtmlShell({ url, manifest: m, data }));
    const res = await app.handleRequest(new Request("http://localhost/blog/2"));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("fanxikit - /blog/2");
  });

  it("supports spa fallback for unmatched route", async () => {
    const root = setupApp({
      "src/routes/+page.fanxi": pageComponent,
    });
    const manifest = createRouteManifest(root);
    const app = createSsrApp(
      manifest,
      ({ url, manifest: m, data }) => renderHtmlShell({ url, manifest: m, data }),
      { spaFallback: true }
    );
    const res = await app.handleRequest(new Request("http://localhost/nope"));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("window.__fanxikit_ROUTE__=null");
    expect(html).toContain("<main data-route-id=\"\"></main>");
  });

  it("serializes depends keys from load", async () => {
    const root = setupApp({
      "src/routes/+page.ts": "export async function load(event){ event.depends('app:user'); return { ok: true }; }",
      "src/routes/+page.fanxi": pageComponent,
    });
    const manifest = createRouteManifest(root);
    const app = createSsrApp(manifest, ({ url, manifest: m, data, serialized }) =>
      renderHtmlShell({ url, manifest: m, data, serialized })
    );
    const res = await app.handleRequest(new Request("http://localhost/"));
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("app:user");
  });

  it("runs server hooks and applies response cookies", async () => {
    const root = setupApp({
      "src/hooks.server.ts":
        "export async function handle({ event, resolve }) { event.locals.user = 'ada'; event.cookies.set('seen', '1'); return resolve(event); }",
      "src/routes/+page.server.ts": "export async function load(event){ return { user: event.locals.user }; }",
      "src/routes/+page.fanxi": pageComponent,
    });
    const manifest = createRouteManifest(root);
    const app = createSsrApp(manifest, ({ url, manifest: m, data }) => renderHtmlShell({ url, manifest: m, data }));
    const res = await app.handleRequest(new Request("http://localhost/"));
    expect(res.headers.get("set-cookie")).toContain("seen=1");
    expect(await res.text()).toContain("\"user\":\"ada\"");
  });

  it("preserves fanxi template syntax in shell output", async () => {
    const root = setupApp({
      "src/routes/+page.fanxi":
        "function Page(){ return (<main><Card title={name}><p>{count}</p></Card></main>); } export default Page;",
    });
    const manifest = createRouteManifest(root);
    const app = createSsrApp(manifest, ({ url, manifest: m, data }) => renderHtmlShell({ url, manifest: m, data }));
    const res = await app.handleRequest(new Request("http://localhost/"));
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("<Card title={name}>");
    expect(html).toContain("<p>{count}</p>");
  });

  it("injects hydration bootstrap config for page components", async () => {
    const root = setupApp({
      "src/routes/+page.fanxi": "function Page(){ return (<main><h1>home</h1></main>); } export default Page;",
    });
    const manifest = createRouteManifest(root);
    const app = createSsrApp(manifest, ({ url, manifest: m, data }) => renderHtmlShell({ url, manifest: m, data }));
    const res = await app.handleRequest(new Request("http://localhost/"));
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("window.__fanxikit_HYDRATE__={\"component\":\"/src/routes/+page.fanxi\",\"strategy\":\"load\"}");
    expect(html).toContain("import(\"fanxipan\")");
  });

  it("supports deferred hydration strategies via data-hydrate marker", async () => {
    const root = setupApp({
      "src/routes/+page.fanxi":
        "function Page(){ return (<main data-hydrate=\"visible\"><h1>home</h1></main>); } export default Page;",
    });
    const manifest = createRouteManifest(root);
    const app = createSsrApp(manifest, ({ url, manifest: m, data }) => renderHtmlShell({ url, manifest: m, data }));
    const res = await app.handleRequest(new Request("http://localhost/"));
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("\"strategy\":\"visible\"");
    expect(html).toContain("IntersectionObserver");
  });
});

function setupApp(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "fanxikit-phase2-"));
  cleanup.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }
  return root;
}
