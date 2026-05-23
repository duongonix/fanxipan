export interface CompileOptions {
  filename: string;
  hmr?: boolean;
}

export interface CompilerDiagnostic {
  severity: "error" | "warning";
  message: string;
  code?: string;
  filename: string;
  line: number;
  column: number;
  spanStart?: number;
  spanEnd?: number;
  suggestion?: string;
  frame?: string;
}

export interface CompileResult {
  code: string;
  css?: string;
  scope?: string;
  map: {
    version: 3;
    file: string;
    sources: string[];
    names: string[];
    mappings: string;
    sourcesContent: string[];
  };
  diagnostics: CompilerDiagnostic[];
}

export interface CompilerNativeBridge {
  compileRx?: (source: string, filename: string) => string;
  compile_for_node_json?: (source: string, filename: string) => string;
}
