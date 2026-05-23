import { existsSync } from "node:fs";
import path from "node:path";
import { createCookies, type Cookies } from "./cookies.js";
import { collectHeadAndCss } from "./head.js";
import { loadServerHooks, runHandleHook } from "./hooks.js";
import { isActionFailure, isHttpErrorSignal, isRedirectSignal } from "./http.js";
import { matchManifestRoute, matchManifestRouteByKinds } from "./match.js";
import { importAppModule } from "./module-loader.js";
import { resolveRouteRenderMode } from "./modes.js";
import { renderHtmlShell } from "./render.js";
import { serializeForHtml } from "./serialization.js";
import type {
  ActionEvent,
  LoadEvent,
  RequestEvent,
  RouteFileRef,
  RouteManifest,
  RouteManifestEntry,
  ServerHooks,
  SsrApp,
  SsrPayload,
  SsrRenderer,
} from "./types.js";

export interface SsrAppOptions {
  defaults?: {
    ssr?: boolean;
    csr?: boolean;
    prerender?: boolean;
  };
  spaFallback?: boolean | { routeId?: string };
  hooks?: ServerHooks;
  platform?: unknown;
}

interface RequestContext {
  request: Request;
  url: URL;
  locals: Record<string, unknown>;
  cookies: Cookies;
  platform?: unknown;
  hooks: ServerHooks;
  fetch: typeof fetch;
}

export function createSsrApp(manifest: RouteManifest, render: SsrRenderer, options: SsrAppOptions = {}): SsrApp {
  return {
    async handleRequest(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const hooks = { ...(await loadServerHooks(manifest.root)), ...(options.hooks ?? {}) };
      const context: RequestContext = {
        request,
        url,
        locals: {},
        cookies: createCookies(request),
        platform: options.platform,
        hooks,
        fetch: globalThis.fetch.bind(globalThis),
      };
      const requestEvent = createRequestEvent(context, { id: null });
      return runHandleHook(hooks, requestEvent, (event) => {
        context.request = event.request;
        context.url = event.url;
        context.locals = event.locals;
        return resolveRequest(context);
      });
    },
  };

  async function resolveRequest(context: RequestContext): Promise<Response> {
    const { request, url } = context;
      try {
        const endpointMatch = matchManifestRouteByKinds(manifest, url.pathname, ["endpoint"]);
        if (endpointMatch) {
          const endpoint = findRouteFile(endpointMatch.entry, "endpoint");
          if (endpoint) {
            return withCookies(await handleEndpoint(manifest, endpoint.file, context, endpointMatch.params, url), context);
          }
        }

        const match = matchManifestRoute(manifest, url.pathname);
        if (!match) {
          if (options.spaFallback) {
            const html = renderHtmlShell({
              url,
              manifest,
              data: {},
              status: 200,
              error: undefined,
            });
            return withCookies(htmlResponse(html, 200), context);
          }
          return withCookies(new Response("Not Found", { status: 404 }), context);
        }

        const mode = resolveRouteRenderMode(manifest, match.entry, options.defaults);
        if (!mode.ssr && mode.csr) {
          const html = renderHtmlShell({
            url,
            manifest,
            data: {},
            status: 200,
          });
          return withCookies(htmlResponse(html, 200), context);
        }

        if (request.method.toUpperCase() === "POST") {
          const actionRes = await handleAction(manifest, match.entry, context, match.params, url);
          if (actionRes) return withCookies(actionRes, context);
        }

        const loaded = await resolveLoadData(manifest, match.entry, context, match.params, url);
        const collected = collectHeadAndCss(manifest, match.entry);
        const payload: SsrPayload = {
          routeId: match.entry.id,
          params: match.params,
          data: loaded.data,
          depends: loaded.depends,
          status: 200,
          head: { title: collected.title, tags: collected.tags },
          css: collected.css,
        };
        const rendered = await render({
          url,
          manifest,
          route: match.entry,
          params: match.params,
          data: loaded.data,
          status: 200,
          head: payload.head,
          css: payload.css,
          serialized: serializeForHtml(payload),
        });
        if (rendered instanceof Response) return withCookies(rendered, context);
        return withCookies(htmlResponse(rendered, 200), context);
      } catch (error) {
        const signalResponse = responseFromSignal(error);
        if (signalResponse) return withCookies(signalResponse, context);
        const match = matchManifestRoute(manifest, url.pathname);
        const status = readStatus(error, 500);
        const message = readMessage(error);
        await context.hooks.handleError?.({
          event: createRequestEvent(context, { id: match?.entry.id ?? null }),
          error,
          status,
          message,
        });
        const errorRoute = match ? findNearestErrorRoute(manifest, match.entry) : undefined;
        const html = renderHtmlShell({
          url,
          manifest,
          status,
          error: { message, routeId: errorRoute?.id ?? match?.entry.id ?? "unknown" },
        });
        return withCookies(htmlResponse(html, status), context);
      }
  }
}

async function handleEndpoint(
  manifest: RouteManifest,
  file: string,
  context: RequestContext,
  params: Record<string, string>,
  url: URL
): Promise<Response> {
  const mod = await importServerModule(manifest, file);
  const method = context.request.method.toUpperCase();
  const handler = mod[method];
  if (typeof handler !== "function") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const event = createServerEvent(context, params, url, { id: file }, async () => ({}));
  const result = await handler(event);
  return normalizeActionOrEndpointResult(result);
}

async function handleAction(
  manifest: RouteManifest,
  entry: RouteManifestEntry,
  context: RequestContext,
  params: Record<string, string>,
  url: URL
): Promise<Response | null> {
  const pageServer = findRouteFile(entry, "page-server");
  if (!pageServer) return null;
  const mod = await importServerModule(manifest, pageServer.file);
  const actions = mod.actions;
  if (!actions || typeof actions !== "object") return null;
  const actionName = url.searchParams.get("action") ?? "default";
  const action = (actions as Record<string, unknown>)[actionName];
  if (typeof action !== "function") return new Response("Action Not Found", { status: 404 });
  const event = createServerEvent(context, params, url, entry, async () => ({})) as ActionEvent;
  const result = await action(event);
  return normalizeActionOrEndpointResult(result);
}

async function resolveLoadData(
  manifest: RouteManifest,
  entry: RouteManifestEntry,
  context: RequestContext,
  params: Record<string, string>,
  url: URL
): Promise<{ data: Record<string, unknown>; depends: string[] }> {
  const chain = resolveLayoutChain(manifest, entry);
  const merged: Record<string, unknown> = {};
  const dependsKeys = new Set<string>();
  for (const current of chain) {
    const parent = async () => ({ ...merged });

    const layoutServer = findRouteFile(current, "layout-server");
    if (layoutServer) {
      const mod = await importServerModule(manifest, layoutServer.file);
      if (typeof mod.load === "function") {
        const event = createServerEvent(context, params, url, current, parent, dependsKeys);
        Object.assign(merged, await mod.load(event));
      }
    }

    const layoutLoad = findRouteFile(current, "layout-load");
    if (layoutLoad) {
      const mod = await importServerModule(manifest, layoutLoad.file);
      if (typeof mod.load === "function") {
        const event = createServerEvent(context, params, url, current, parent, dependsKeys);
        Object.assign(merged, await mod.load(event));
      }
    }
  }

  const pageServer = findRouteFile(entry, "page-server");
  if (pageServer) {
    const mod = await importServerModule(manifest, pageServer.file);
    if (typeof mod.load === "function") {
      const event = createServerEvent(context, params, url, entry, async () => ({ ...merged }), dependsKeys);
      Object.assign(merged, await mod.load(event));
    }
  }

  const pageLoad = findRouteFile(entry, "page-load");
  if (pageLoad) {
    const mod = await importServerModule(manifest, pageLoad.file);
    if (typeof mod.load === "function") {
      const event = createServerEvent(context, params, url, entry, async () => ({ ...merged }), dependsKeys);
      Object.assign(merged, await mod.load(event));
    }
  }

  return {
    data: merged,
    depends: Array.from(dependsKeys.values()),
  };
}

function resolveLayoutChain(manifest: RouteManifest, entry: RouteManifestEntry): RouteManifestEntry[] {
  const result: RouteManifestEntry[] = [];
  for (let i = 0; i <= entry.segments.length; i += 1) {
    const id = i === 0 ? "/" : `/${entry.segments.slice(0, i).join("/")}`;
    const found = manifest.entries.find((x) => x.id === id);
    if (found) result.push(found);
  }
  return result;
}

function createServerEvent(
  context: RequestContext,
  params: Record<string, string>,
  url: URL,
  route: { id: string },
  parent: () => Promise<Record<string, unknown>>,
  dependsKeys: Set<string> = new Set()
): LoadEvent {
  return {
    params,
    url,
    route,
    request: context.request,
    fetch: createFetch(context),
    locals: context.locals,
    platform: context.platform,
    depends: (...keys: string[]) => {
      for (const key of keys) dependsKeys.add(key);
    },
    parent,
    cookies: context.cookies,
  } as LoadEvent;
}

function createRequestEvent(context: RequestContext, route: { id: string | null }): RequestEvent {
  return {
    params: {},
    url: context.url,
    route,
    request: context.request,
    fetch: createFetch(context),
    locals: context.locals,
    platform: context.platform,
    depends: () => {},
    parent: async () => ({}),
    cookies: context.cookies,
  };
}

function createFetch(context: RequestContext): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    if (context.hooks.handleFetch) {
      return Promise.resolve(context.hooks.handleFetch({
        event: createRequestEvent(context, { id: null }),
        request,
        fetch: context.fetch,
      }));
    }
    return context.fetch(request);
  }) as typeof fetch;
}

function withCookies(response: Response, context: RequestContext): Response {
  const cookies = context.cookies.headers();
  if (cookies.length === 0) return response;
  const headers = new Headers(response.headers);
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function findRouteFile(entry: RouteManifestEntry, kind: RouteFileRef["kind"]): RouteFileRef | undefined {
  return entry.files.find((f) => f.kind === kind);
}

function findNearestErrorRoute(manifest: RouteManifest, entry: RouteManifestEntry): RouteManifestEntry | undefined {
  const chain = resolveLayoutChain(manifest, entry).reverse();
  return chain.find((x) => x.files.some((f) => f.kind === "error"));
}

async function importServerModule(manifest: RouteManifest, file: string): Promise<Record<string, unknown>> {
  const abs = path.resolve(manifest.root, manifest.routesDir, file);
  if (!existsSync(abs)) {
    throw new Error(`Missing route module: ${file}`);
  }
  return importAppModule(abs, manifest.root);
}

function normalizeActionOrEndpointResult(result: unknown): Response {
  if (result instanceof Response) return result;
  if (isRedirectSignal(result)) return redirectResponse(result.status, result.location);
  if (isHttpErrorSignal(result)) return new Response(result.message, { status: result.status });
  if (isActionFailure(result)) {
    return new Response(JSON.stringify({ type: "failure", status: result.status, data: result.data }), {
      status: result.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  if (typeof result === "string") {
    return new Response(result, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  if (result && typeof result === "object") {
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  return new Response("", { status: 204 });
}

function readStatus(error: unknown, fallback: number): number {
  if (error && typeof error === "object" && "status" in error && typeof (error as { status: unknown }).status === "number") {
    return (error as { status: number }).status;
  }
  return fallback;
}

function readMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Internal Server Error";
}

function htmlResponse(html: string, status: number): Response {
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function redirectResponse(status: number, location: string): Response {
  return new Response(null, {
    status,
    headers: { location },
  });
}

function responseFromSignal(error: unknown): Response | null {
  if (isRedirectSignal(error)) return redirectResponse(error.status, error.location);
  if (isHttpErrorSignal(error)) return new Response(error.message, { status: error.status });
  return null;
}
