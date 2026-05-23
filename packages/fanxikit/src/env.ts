export interface EnvSnapshot {
  privateStatic: Record<string, string>;
  publicStatic: Record<string, string>;
  privateDynamic: Record<string, string | undefined>;
  publicDynamic: Record<string, string | undefined>;
}

export interface EnvOptions {
  publicPrefix?: string;
  staticKeys?: string[];
  source?: Record<string, string | undefined>;
}

export function createEnvSnapshot(options: EnvOptions = {}): EnvSnapshot {
  const publicPrefix = options.publicPrefix ?? "PUBLIC_";
  const source = options.source ?? readProcessEnv();
  const staticKeys = new Set(options.staticKeys ?? Object.keys(source));
  const out: EnvSnapshot = {
    privateStatic: {},
    publicStatic: {},
    privateDynamic: {},
    publicDynamic: {},
  };

  for (const [key, value] of Object.entries(source)) {
    if (staticKeys.has(key) && typeof value === "string") {
      if (key.startsWith(publicPrefix)) out.publicStatic[key] = value;
      else out.privateStatic[key] = value;
    }
    if (key.startsWith(publicPrefix)) out.publicDynamic[key] = value;
    else out.privateDynamic[key] = value;
  }

  return out;
}

export function assertPublicEnv(input: Record<string, string | undefined>, publicPrefix = "PUBLIC_"): void {
  for (const key of Object.keys(input)) {
    if (!key.startsWith(publicPrefix)) {
      throw new Error(
        `Private env "${key}" cannot be exposed to the client. Rename it to ${publicPrefix}${key} or read it server-side.`
      );
    }
  }
}

function readProcessEnv(): Record<string, string | undefined> {
  if (typeof process === "undefined") return {};
  return process.env;
}
