import { describe, expect, it } from "vitest";
import { assertPublicEnv, createEnvSnapshot } from "./env.js";

describe("fanxikit env", () => {
  it("splits public and private environment values", () => {
    const env = createEnvSnapshot({
      source: {
        SECRET: "server-only",
        PUBLIC_NAME: "client-safe",
      },
    });
    expect(env.privateStatic.SECRET).toBe("server-only");
    expect(env.publicStatic.PUBLIC_NAME).toBe("client-safe");
  });

  it("guards private values from client exposure", () => {
    expect(() => assertPublicEnv({ SECRET: "nope" })).toThrow("Private env");
  });
});
