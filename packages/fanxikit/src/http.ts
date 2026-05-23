export interface RedirectSignal {
  readonly __fanxikit_redirect: true;
  readonly status: number;
  readonly location: string;
}

export interface HttpErrorSignal {
  readonly __fanxikit_error: true;
  readonly status: number;
  readonly message: string;
}

export interface ActionFailure {
  readonly __fanxikit_fail: true;
  readonly status: number;
  readonly data: unknown;
}

class RedirectError extends Error implements RedirectSignal {
  readonly __fanxikit_redirect = true as const;
  readonly status: number;
  readonly location: string;

  constructor(status: number, location: string) {
    super(`Redirect ${status} ${location}`);
    this.name = "fanxikitRedirect";
    this.status = status;
    this.location = location;
  }
}

class HttpError extends Error implements HttpErrorSignal {
  readonly __fanxikit_error = true as const;
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "fanxikitHttpError";
    this.status = status;
  }
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function text(body: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/plain; charset=utf-8");
  }
  return new Response(body, {
    ...init,
    headers,
  });
}

export function fail(status: number, data: unknown): ActionFailure {
  return { __fanxikit_fail: true, status, data };
}

export function redirect(status: number, location: string): never {
  throw new RedirectError(status, location);
}

export function error(status: number, message = "Error"): never {
  throw new HttpError(status, message);
}

export function isRedirectSignal(value: unknown): value is RedirectSignal {
  return Boolean(
    value &&
      typeof value === "object" &&
      "__fanxikit_redirect" in value &&
      (value as { __fanxikit_redirect?: unknown }).__fanxikit_redirect === true &&
      typeof (value as { status?: unknown }).status === "number" &&
      typeof (value as { location?: unknown }).location === "string"
  );
}

export function isHttpErrorSignal(value: unknown): value is HttpErrorSignal {
  return Boolean(
    value &&
      typeof value === "object" &&
      "__fanxikit_error" in value &&
      (value as { __fanxikit_error?: unknown }).__fanxikit_error === true &&
      typeof (value as { status?: unknown }).status === "number"
  );
}

export function isActionFailure(value: unknown): value is ActionFailure {
  return Boolean(
    value &&
      typeof value === "object" &&
      "__fanxikit_fail" in value &&
      (value as { __fanxikit_fail?: unknown }).__fanxikit_fail === true &&
      typeof (value as { status?: unknown }).status === "number"
  );
}
