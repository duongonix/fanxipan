use clap::{Parser, Subcommand};
use fanxipan_compiler::{CompileOptions, DiagnosticSeverity, compile};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command as ProcessCommand,
};

#[derive(Debug, Parser)]
#[command(name = "fanxipan", version, about = "fanxipan CLI")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    Dev {
        #[arg(default_value = ".")]
        cwd: PathBuf,
    },
    Build {
        #[arg(default_value = ".")]
        cwd: PathBuf,
    },
    Preview {
        #[arg(default_value = ".")]
        cwd: PathBuf,
    },
    Check {
        #[arg(default_value = ".")]
        cwd: PathBuf,
    },
    Create {
        #[arg(default_value = "fanxipan-app")]
        name: String,
    },
}

fn main() {
    let cli = Cli::parse();
    match cli.command {
        Command::Dev { cwd } => run_package_script(&cwd, "dev"),
        Command::Build { cwd } => run_package_script(&cwd, "build"),
        Command::Preview { cwd } => run_package_script(&cwd, "preview"),
        Command::Check { cwd } => check_project(&cwd),
        Command::Create { name } => {
            println!(
                "Run `npm create fanxipan@latest {name}` to scaffold with the TypeScript create package."
            )
        }
    }
}

fn run_package_script(cwd: &Path, script: &str) {
    let status = ProcessCommand::new(package_runner())
        .arg("run")
        .arg(script)
        .current_dir(cwd)
        .status();
    match status {
        Ok(status) if status.success() => {}
        Ok(status) => std::process::exit(status.code().unwrap_or(1)),
        Err(err) => {
            eprintln!("failed to run package script `{script}`: {err}");
            std::process::exit(1);
        }
    }
}

fn package_runner() -> &'static str {
    if cfg!(windows) { "pnpm.cmd" } else { "pnpm" }
}

fn check_project(cwd: &Path) {
    let files = collect_fanxi_files(cwd);
    let mut had_error = false;
    for file in files {
        let Ok(source) = fs::read_to_string(&file) else {
            eprintln!("{}: failed to read file", file.display());
            had_error = true;
            continue;
        };
        let out = compile(
            &source,
            CompileOptions {
                filename: file.display().to_string(),
            },
        );
        for diag in out.diagnostics {
            let sev = match diag.severity {
                DiagnosticSeverity::Error => {
                    had_error = true;
                    "error"
                }
                DiagnosticSeverity::Warning => "warning",
            };
            eprintln!(
                "{}:{}:{} [{sev}] {}",
                diag.filename, diag.line, diag.column, diag.message
            );
            if let Some(frame) = diag.frame {
                eprintln!("{frame}");
            }
        }
    }
    if had_error {
        std::process::exit(1);
    }
}

fn collect_fanxi_files(root: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    collect_fanxi_files_inner(root, &mut out);
    out
}

fn collect_fanxi_files_inner(path: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(path) else {
        return;
    };
    for entry in entries.flatten() {
        let p = entry.path();
        let name = p.file_name().and_then(|s| s.to_str()).unwrap_or_default();
        if name == "node_modules" || name == "dist" || name == "target" {
            continue;
        }
        if p.is_dir() {
            collect_fanxi_files_inner(&p, out);
        } else if p.extension().and_then(|s| s.to_str()) == Some("fanxi") {
            out.push(p);
        }
    }
}
