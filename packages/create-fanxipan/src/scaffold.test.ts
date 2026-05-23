import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scaffoldfanxipanApp } from "./scaffold";

describe("create-fanxipan scaffold", () => {
  it("writes selected template files", () => {
    const dir = mkdtempSync(join(tmpdir(), "fanxi-create-"));
    try {
      scaffoldfanxipanApp(dir, "typescript");
      const app = readFileSync(join(dir, "src", "App.fanxi"), "utf8");
      expect(app).toContain("function App()");
      expect(app).toContain("export default App");
      expect(app).toContain("$state");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
