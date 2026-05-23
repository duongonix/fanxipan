import { describe, expect, it } from "vitest";
import { createCookies } from "./cookies.js";

describe("fanxikit cookies", () => {
  it("reads request cookies and serializes secure defaults", () => {
    const cookies = createCookies(new Request("https://example.com", {
      headers: { cookie: "sid=abc" },
    }));
    expect(cookies.get("sid")).toBe("abc");
    cookies.set("sid", "next");
    expect(cookies.headers()[0]).toContain("HttpOnly");
    expect(cookies.headers()[0]).toContain("SameSite=lax");
    expect(cookies.headers()[0]).toContain("Secure");
  });
});
