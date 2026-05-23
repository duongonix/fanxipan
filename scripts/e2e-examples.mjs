import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

function spawnCmd(command, args, cwd = process.cwd()) {
  return spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

async function waitForServer(url, retries = 60) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`Server did not start at ${url}`);
}

async function runExample(configPath, expectedText, port) {
  const normalized = configPath.replaceAll("\\", "/");
  const slash = normalized.lastIndexOf("/");
  const configDir = slash >= 0 ? normalized.slice(0, slash) : ".";
  const configFile = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const preview = spawnCmd("pnpm", [
    "exec",
    "vite",
    "preview",
    "--configLoader",
    "runner",
    "--config",
    configFile,
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ], configDir);

  try {
    await waitForServer(`http://127.0.0.1:${port}`);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });
    const bodyText = await page.locator("body").innerText();
    if (!bodyText.includes(expectedText)) {
      throw new Error(`Expected "${expectedText}" in ${configPath}. Actual: ${bodyText}`);
    }
    await browser.close();
  } finally {
    preview.kill("SIGTERM");
  }
}

async function runFullExampleSpa(port) {
  const preview = spawnCmd(
    "pnpm",
    [
      "exec",
      "vite",
      "preview",
      "--configLoader",
      "runner",
      "--config",
      "vite.config.ts",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    "example",
  );

  try {
    await waitForServer(`http://127.0.0.1:${port}`);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });

    const input = page.locator("input[placeholder='Add a task']");
    await input.fill("Ship SPA release");
    await page.locator("form button:has-text('Add')").click();

    const list = page.locator("ul");
    await list.waitFor();
    const afterAdd = await list.innerText();
    if (!afterAdd.includes("Ship SPA release")) {
      throw new Error(`Add todo did not update UI. List: ${afterAdd}`);
    }

    await page.locator("nav button:has-text('Done')").click();
    const doneText = await list.innerText();
    if (doneText.includes("Ship SPA release")) {
      throw new Error(`Done tab still shows open todo. List: ${doneText}`);
    }

    await page.locator("nav button:has-text('Open')").click();
    const openText = await list.innerText();
    if (!openText.includes("Ship SPA release")) {
      throw new Error(`Open tab did not show new todo. List: ${openText}`);
    }

    await browser.close();
  } finally {
    preview.kill("SIGTERM");
  }
}

await runExample("examples/basic/vite.config.ts", "fanxipan Basic Feature Showcase", 4173);
await runExample("examples/todo/vite.config.ts", "No todos", 4174);
await runExample("examples/router/vite.config.mjs", "fanxipan Router Demo", 4175);
await runFullExampleSpa(4176);
