import type { Cookies } from "./cookies.js";

export type RouteFileKind =
  | "page"
  | "layout"
  | "error"
  | "page-load"
  | "page-server"
  | "layout-load"
  | "layout-server"
  | "endpoint";

export interface RouteFileRef {
  kind: RouteFileKind;
  file: string;
}

export interface RouteManifestEntry {
  id: string;
  path: string;
  segments: string[];
  files: RouteFileRef[];
}

export interface RouteManifest {
  root: string;
  routesDir: string;
  generatedAt: string;
  entries: RouteManifestEntry[];
}

export type SsrRenderer = (input: {
  url: URL;
  manifest: RouteManifest;
  route: RouteManifestEntry;
  params: Record<string, string>;
  data: Record<string, unknown>;
  status: number;
  head?: {
    title?: string;
    tags: string[];
  };
  css?: string[];
  serialized?: string;
}) => Promise<string | Response> | string | Response;

export interface SsrApp {
  handleRequest(request: Request): Promise<Response>;
}

export interface LoadEvent {
  params: Record<string, string>;
  url: URL;
  route: { id: string };
  request: Request;
  fetch: typeof fetch;
  locals: Record<string, unknown>;
  platform?: unknown;
  depends: (...keys: string[]) => void;
  parent: () => Promise<Record<string, unknown>>;
  cookies?: Cookies;
}

export interface ActionEvent extends LoadEvent {
  cookies: Cookies;
}

export interface RequestEvent extends Omit<ActionEvent, "route"> {
  route: { id: string | null };
}

export interface ServerHooks {
  handle?: (input: {
    event: RequestEvent;
    resolve: (event: RequestEvent) => Promise<Response>;
  }) => Promise<Response> | Response;
  handleFetch?: (input: {
    event: RequestEvent | LoadEvent;
    request: Request;
    fetch: typeof fetch;
  }) => Promise<Response> | Response;
  handleError?: (input: {
    event: RequestEvent;
    error: unknown;
    status: number;
    message: string;
  }) => Promise<unknown> | unknown;
}

export interface SsrPayload {
  routeId: string;
  params: Record<string, string>;
  data: Record<string, unknown>;
  depends?: string[];
  status: number;
  head: {
    title?: string;
    tags: string[];
  };
  css: string[];
}
