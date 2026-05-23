export interface CookieOptions {
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  maxAge?: number;
  expires?: Date;
}

export interface Cookies {
  get(name: string): string | undefined;
  set(name: string, value: string, options?: CookieOptions): void;
  delete(name: string, options?: CookieOptions): void;
  serialize(name: string, value: string, options?: CookieOptions): string;
  headers(): string[];
}

export function createCookies(request: Request): Cookies {
  const initial = parseCookieHeader(request.headers.get("cookie") ?? "");
  const pending: string[] = [];

  const serialize = (name: string, value: string, options: CookieOptions = {}) => {
    const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
    const path = options.path ?? "/";
    parts.push(`Path=${path}`);
    if (options.httpOnly ?? true) parts.push("HttpOnly");
    if (options.secure ?? request.url.startsWith("https://")) parts.push("Secure");
    parts.push(`SameSite=${options.sameSite ?? "lax"}`);
    if (typeof options.maxAge === "number") parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
    if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
    return parts.join("; ");
  };

  return {
    get(name) {
      return initial.get(name);
    },
    set(name, value, options) {
      initial.set(name, value);
      pending.push(serialize(name, value, options));
    },
    delete(name, options) {
      initial.delete(name);
      pending.push(
        serialize(name, "", {
          ...options,
          maxAge: 0,
          expires: new Date(0),
        })
      );
    },
    serialize,
    headers() {
      return [...pending];
    },
  };
}

function parseCookieHeader(header: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of header.split(";")) {
    const pair = raw.trim();
    if (!pair) continue;
    const index = pair.indexOf("=");
    if (index < 0) continue;
    const key = decodeURIComponent(pair.slice(0, index).trim());
    const value = decodeURIComponent(pair.slice(index + 1).trim());
    out.set(key, value);
  }
  return out;
}
