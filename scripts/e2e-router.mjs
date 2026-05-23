import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

function spawnCmd(command, args, cwd = process.cwd()) {
  return spawn(command, args, {
    stdio: "inherit",
    cwd,
    shell: process.platform === "win32",
  });
}

async function waitForServer(url, retries = 80) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`Server did not start at ${url}`);
}

const preview = spawnCmd("pnpm", [
  "--dir",
  "examples/router",
  "exec",
  "vite",
  "preview",
  "--host",
  "127.0.0.1",
  "--port",
  "4175",
  "--strictPort",
]);

try {
  await waitForServer("http://127.0.0.1:4175");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4175", { waitUntil: "networkidle" });

  await page.click('a[href="/dashboard"]');
  await page.waitForTimeout(50);
  let body = await page.locator("body").innerText();
  if (!body.includes("Dashboard home")) {
    throw new Error("Expected Dashboard home for /dashboard");
  }

  await page.click('a[href="/dashboard/settings"]');
  await page.waitForTimeout(50);
  body = await page.locator("body").innerText();
  if (!body.includes("Settings home")) {
    throw new Error("Expected Settings home for /dashboard/settings");
  }

  await page.click('a[href="/dashboard/settings/profile"]');
  await page.waitForTimeout(50);
  body = await page.locator("body").innerText();
  if (!body.includes("Profile settings page")) {
    throw new Error("Expected Profile settings page for /dashboard/settings/profile");
  }

  await page.click('a[href="/user/42"]');
  await page.waitForTimeout(50);
  body = await page.locator("body").innerText();
  if (!body.includes("params.id: 42")) {
    throw new Error("Expected params.id: 42 for /user/42");
  }

  await browser.close();
  console.log("Router E2E passed.");
} finally {
  preview.kill("SIGTERM");
}
