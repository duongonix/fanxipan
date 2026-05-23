use std::{fs, path::PathBuf};

use fanxipan_compiler::{CompileOptions, compile};

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("tests")
        .join("fixtures")
        .join("compiler")
}

fn snapshot_summary(file: &str, source: &str) -> String {
    let out = compile(
        source,
        CompileOptions {
            filename: file.to_string(),
        },
    );
    let mut messages = out
        .diagnostics
        .iter()
        .map(|d| d.message.clone())
        .collect::<Vec<_>>();
    messages.sort();
    messages.dedup();

    let diagnostics = if messages.is_empty() {
        "none".to_string()
    } else {
        messages.join("|")
    };

    format!(
        "file:{file}\nhas_if_anchor:{}\nhas_for_anchor:{}\nhas_keyed_rows:{}\nhas_scope:{}\ncss:{}\ndiagnostics:{}\n",
        out.code.contains("if:start"),
        out.code.contains("for:start"),
        out.code.contains("nextRows = new Map"),
        out.scope.is_some(),
        out.css
            .as_ref()
            .map(|_| "some".to_string())
            .unwrap_or_else(|| "none".to_string()),
        diagnostics,
    )
}

#[test]
fn fixture_snapshots_match() {
    let dir = fixtures_dir();
    for entry in fs::read_dir(&dir).expect("read fixture dir") {
        let entry = entry.expect("fixture entry");
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("rx") {
            continue;
        }
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .expect("fixture file name");
        let source = fs::read_to_string(&path).expect("read fixture source");
        let actual = snapshot_summary(file_name, &source);

        let expected_path = path.with_extension("snap");
        let expected = fs::read_to_string(&expected_path)
            .unwrap_or_else(|_| panic!("missing snapshot: {}", expected_path.display()));
        assert_eq!(
            expected.replace("\r\n", "\n").trim_end(),
            actual.replace("\r\n", "\n").trim_end(),
            "snapshot mismatch for {}",
            expected_path.display()
        );
    }
}
