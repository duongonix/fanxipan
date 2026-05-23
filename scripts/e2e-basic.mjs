import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function waitForServer(url, retries = 40) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`Server did not start at ${url}`);
}

const preview = spawn(
  "pnpm",
  ["exec", "vite", "preview", "--config", "examples/basic/vite.config.ts", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
  { stdio: "inherit", shell: process.platform === "win32" },
);

try {
  await waitForServer("http://127.0.0.1:4173");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  const button = page.locator("button");
  await button.first().click();
  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes("increase")) {
    throw new Error("Basic app did not render expected UI");
  }
  await browser.close();
} finally {
  preview.kill("SIGTERM");
}
