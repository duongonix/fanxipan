import fs from "node:fs";
import path from "node:path";
import { appFanxi, appTs, globalCss, indexHtml, packageJson, routeFanxi, tsconfig, viteConfig } from "./template";

export function scaffoldfanxipanApp(targetDir: string, template = "basic"): void {
  const srcDir = path.join(targetDir, "src");
  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "package.json"), packageJson(path.basename(targetDir)), "utf8");
  fs.writeFileSync(path.join(targetDir, "tsconfig.json"), tsconfig(), "utf8");
  fs.writeFileSync(path.join(targetDir, "vite.config.ts"), viteConfig(), "utf8");
  fs.writeFileSync(path.join(targetDir, "index.html"), indexHtml(), "utf8");
  fs.writeFileSync(path.join(srcDir, "main.ts"), appTs(), "utf8");
  fs.writeFileSync(path.join(srcDir, "global.css"), globalCss(), "utf8");
  fs.writeFileSync(path.join(srcDir, "App.fanxi"), appFanxi(template), "utf8");
  if (template === "router") {
    const routesDir = path.join(srcDir, "routes");
    fs.mkdirSync(routesDir, { recursive: true });
    fs.writeFileSync(path.join(routesDir, "Home.fanxi"), routeFanxi("Home"), "utf8");
    fs.writeFileSync(path.join(routesDir, "About.fanxi"), routeFanxi("About"), "utf8");
  }
}



