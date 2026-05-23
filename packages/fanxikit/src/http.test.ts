import { describe, expect, it } from "vitest";
import { error, fail, json, redirect, text } from "./http.js";

describe("fanxikit http helpers", () => {
  it("json returns response with json content type", async () => {
    const res = json({ ok: true }, { status: 201 });
    expect(res.status).toBe(201);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("redirect throws signal", () => {
    try {
      redirect(302, "/next");
      throw new Error("unreachable");
    } catch (e) {
      const signal = e as { __fanxikit_redirect?: boolean; status?: number; location?: string };
      expect(signal.__fanxikit_redirect).toBe(true);
      expect(signal.status).toBe(302);
      expect(signal.location).toBe("/next");
    }
  });

  it("error throws signal", () => {
    try {
      error(400, "bad");
      throw new Error("unreachable");
    } catch (e) {
      const signal = e as { __fanxikit_error?: boolean; status?: number; message?: string };
      expect(signal.__fanxikit_error).toBe(true);
      expect(signal.status).toBe(400);
      expect(signal.message).toBe("bad");
    }
  });

  it("text returns response with text content type", async () => {
    const res = text("ok");
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toBe("ok");
  });

  it("fail returns action failure result", () => {
    expect(fail(422, { email: "required" })).toEqual({
      __fanxikit_fail: true,
      status: 422,
      data: { email: "required" },
    });
  });
});
