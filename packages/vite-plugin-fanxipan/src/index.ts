import type { Plugin } from "vite";
import { compile } from "compiler";
import { handleFanxiHotUpdate } from "./hmr.js";
import type { fanxipanPluginOptions } from "./types.js";

function formatDiagnostics(lines: string[]): string {
  return lines.join("\n");
}

export function fanxipanPlugin(options: fanxipanPluginOptions = {}): Plugin {
  const enableHmr = options.hmr ?? true;
  const treatWarningsAsErrors = options.treatWarningsAsErrors ?? false;
  return {
    name: "vite-plugin-fanxipan",
    enforce: "pre",
    load(id) {
      if (!id.endsWith(".fanxi")) return null;
      return null;
    },
    transform(code, id) {
      if (!id.endsWith(".fanxi")) return null;
      const result = compile(code, {
        filename: id,
        hmr: enableHmr,
      });

      if (result.diagnostics.length > 0) {
        const lines = result.diagnostics.map(
          (d) =>
            `${d.filename}:${d.line}:${d.column} [${d.severity}] ${d.code ? `[${d.code}] ` : ""}${d.message}${
              d.suggestion ? ` | ${d.suggestion}` : ""
            }${d.frame ? `\n${d.frame}` : ""}`
        );
        const pretty = formatDiagnostics(lines);
        options.onDiagnostic?.(pretty);
        const hasError = result.diagnostics.some((d) => d.severity === "error");
        const hasWarning = result.diagnostics.some((d) => d.severity === "warning");
        if (hasError) {
          this.error(pretty);
        } else if (treatWarningsAsErrors && hasWarning) {
          this.error(pretty);
        } else {
          this.warn(pretty);
        }
      }

      return {
        code: result.css ? `${result.code}\n${createStyleRuntime(result.css, result.scope ?? id)}` : result.code,
        map: result.map,
      };
    },
    handleHotUpdate(ctx) {
      return enableHmr ? handleFanxiHotUpdate(ctx) : [];
    },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.endsWith(".fanxi")) {
          server.config.logger.info(`[fanxipan] request: ${req.url}`);
        }
        next();
      });
    },
  };
}

export default fanxipanPlugin;

function createStyleRuntime(css: string, scope: string): string {
  const id = `fanxipan-style-${scope.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  return [
    `const __fanxipan_css = ${JSON.stringify(css)};`,
    `const __fanxipan_style_id = ${JSON.stringify(id)};`,
    "if (typeof document !== 'undefined') {",
    "  let __fanxipan_style = document.getElementById(__fanxipan_style_id);",
    "  if (!__fanxipan_style) {",
    "    __fanxipan_style = document.createElement('style');",
    "    __fanxipan_style.id = __fanxipan_style_id;",
    "    __fanxipan_style.setAttribute('data-fanxipan-style', '');",
    "    document.head.appendChild(__fanxipan_style);",
    "  }",
    "  __fanxipan_style.textContent = __fanxipan_css;",
    "  if (import.meta.hot) import.meta.hot.dispose(() => __fanxipan_style?.remove());",
    "}",
  ].join("\n");
}



