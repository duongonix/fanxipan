import { describe, expect, it } from "vitest";
import { splitHtmlStream, streamResponse } from "./stream.js";

describe("fanxikit stream", () => {
  it("builds stream response from async chunks", async () => {
    const response = streamResponse(splitHtmlStream("<html><body>ok</body></html>", 5));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("<body>ok</body>");
  });
});
