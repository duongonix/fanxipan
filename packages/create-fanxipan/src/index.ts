#!/usr/bin/env node

import path from "node:path";
import { scaffoldfanxipanApp } from "./scaffold.js";

export function runCreatefanxipan(argv: string[] = process.argv.slice(2)): void {
  const templateFlag = argv.find((arg) => arg.startsWith("--template="));
  const template = templateFlag?.split("=")[1] || "basic";
  const appName = argv.find((arg) => !arg.startsWith("--")) || "fanxipan-app";
  const targetDir = path.resolve(process.cwd(), appName);
  scaffoldfanxipanApp(targetDir, template);
  console.log(`fanxipan ${template} app scaffolded at ${targetDir}`);
}

runCreatefanxipan();


