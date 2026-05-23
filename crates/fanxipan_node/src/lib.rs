use fanxipan_compiler::{CompileOptions, DiagnosticSeverity, compile};
#[cfg(feature = "napi")]
use napi_derive::napi;

#[cfg_attr(feature = "napi", napi(js_name = "compileForNode"))]
pub fn compile_for_node(source: String, filename: String) -> String {
    let output = compile(&source, CompileOptions { filename });
    output.code
}

#[cfg_attr(feature = "napi", napi(js_name = "compileForNodeJson"))]
pub fn compile_for_node_json(source: String, filename: String) -> String {
    let output = compile(&source, CompileOptions { filename });
    let diagnostics = output
        .diagnostics
        .into_iter()
        .map(|d| {
            serde_json::json!({
                "code": d.code,
                "severity": match d.severity {
                    DiagnosticSeverity::Error => "error",
                    DiagnosticSeverity::Warning => "warning",
                },
                "filename": d.filename,
                "message": d.message,
                "line": d.line,
                "column": d.column,
                "spanStart": d.span_start,
                "spanEnd": d.span_end,
                "suggestion": d.suggestion,
                "frame": d.frame,
            })
        })
        .collect::<Vec<_>>();
    serde_json::json!({
        "code": output.code,
        "css": output.css,
        "scope": output.scope,
        "diagnostics": diagnostics
    })
    .to_string()
}

#[cfg_attr(feature = "napi", napi(js_name = "compileRx"))]
pub fn compile_rx(source: String, filename: String) -> String {
    compile_for_node_json(source, filename)
}
