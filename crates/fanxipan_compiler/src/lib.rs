use fanxipan_analyzer::{analyze_reactivity, analyze_semantics};
use fanxipan_ast::{ComponentAst, DirectiveNode, TemplateNode};
use fanxipan_codegen::generate_dom_program;
use fanxipan_css::scope_css;
use fanxipan_diagnostics::fanxipanDiagnostic;
use fanxipan_parser::{ParseOptions, parse_component_with_diagnostics};
use std::collections::BTreeSet;

#[derive(Debug, Clone)]
pub struct CompileOptions {
    pub filename: String,
}

#[derive(Debug, Clone)]
pub struct CompileOutput {
    pub code: String,
    pub css: Option<String>,
    pub scope: Option<String>,
    pub diagnostics: Vec<CompileDiagnostic>,
}

#[derive(Debug, Clone)]
pub struct CompileDiagnostic {
    pub severity: DiagnosticSeverity,
    pub code: String,
    pub filename: String,
    pub message: String,
    pub line: usize,
    pub column: usize,
    pub span_start: Option<usize>,
    pub span_end: Option<usize>,
    pub suggestion: Option<String>,
    pub frame: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub enum DiagnosticSeverity {
    Error,
    Warning,
}

pub fn compile(source: &str, options: CompileOptions) -> CompileOutput {
    let filename = options.filename.clone();
    let parse_out = parse_component_with_diagnostics(source, ParseOptions { filename });
    let ast = parse_out.ast;
    let graph = analyze_reactivity(source);
    let semantic_diags = analyze_semantics(source, &ast.template.nodes, &graph);
    let scoped_css = ast
        .style
        .as_ref()
        .map(|style| scope_css(&style.source, &options.filename));
    let generated =
        generate_dom_program(&ast, &graph, scoped_css.as_ref().map(|s| s.scope.as_str()));
    let mut diagnostics = parse_out
        .diagnostics
        .into_iter()
        .map(|d| CompileDiagnostic {
            severity: DiagnosticSeverity::Error,
            code: d.code,
            filename: options.filename.clone(),
            message: d.message,
            line: d.line,
            column: d.column,
            span_start: d.span_start,
            span_end: d.span_end,
            suggestion: d.suggestion,
            frame: None,
        })
        .collect::<Vec<_>>();
    diagnostics.extend(semantic_diags.into_iter().map(|d| CompileDiagnostic {
        severity: DiagnosticSeverity::Error,
        code: semantic_code(&d.message),
        filename: options.filename.clone(),
        message: d.message,
        line: d.line,
        column: d.column,
        span_start: d.span_start,
        span_end: d.span_end,
        suggestion: d.suggestion,
        frame: None,
    }));
    diagnostics.extend(check_duplicate_routes(source, &options.filename));
    diagnostics.extend(check_unused_css_selectors(&ast, source, &options.filename));
    diagnostics = normalize_diagnostics(diagnostics);
    for d in diagnostics.iter_mut() {
        let diag = fanxipanDiagnostic {
            message: format!("[{}] {}", d.code, d.message),
            filename: d.filename.clone(),
            line: d.line,
            column: d.column,
            span_start: d.span_start,
            span_end: d.span_end,
            suggestion: d.suggestion.clone(),
        };
        d.frame = Some(diag.format_with_source(source));
    }
    CompileOutput {
        code: generated.code,
        css: scoped_css.as_ref().map(|s| s.css.clone()),
        scope: scoped_css.as_ref().map(|s| s.scope.clone()),
        diagnostics,
    }
}

fn check_duplicate_routes(source: &str, filename: &str) -> Vec<CompileDiagnostic> {
    let mut out = Vec::new();
    let mut seen = std::collections::BTreeMap::<String, usize>::new();
    for (path, idx) in extract_route_paths(source) {
        if let Some(first_idx) = seen.get(&path) {
            let (line, column) = index_to_line_col(source, idx);
            out.push(CompileDiagnostic {
                severity: DiagnosticSeverity::Warning,
                code: "fanxipan_ROUTE_DUPLICATE".to_string(),
                filename: filename.to_string(),
                message: format!("Duplicate route: {}", path),
                line,
                column,
                span_start: Some(idx),
                span_end: Some(idx + path.len()),
                suggestion: Some(format!(
                    "Remove duplicate or merge with route declared earlier at byte {}",
                    first_idx
                )),
                frame: None,
            });
        } else {
            seen.insert(path, idx);
        }
    }
    out
}

fn extract_route_paths(source: &str) -> Vec<(String, usize)> {
    let mut out = Vec::new();
    for token in ["path:", "path :"] {
        let mut pos = 0usize;
        while let Some(found) = source[pos..].find(token) {
            let idx = pos + found + token.len();
            let rest = &source[idx..];
            let trimmed_start = rest
                .char_indices()
                .find(|(_, c)| !c.is_whitespace())
                .map(|(i, _)| i)
                .unwrap_or(0);
            let start = idx + trimmed_start;
            let quote = source[start..].chars().next().unwrap_or('\0');
            if quote != '"' && quote != '\'' {
                pos = idx;
                continue;
            }
            let mut end = start + quote.len_utf8();
            while end < source.len() {
                let ch = source.as_bytes()[end] as char;
                if ch == '\\' {
                    end += 2;
                    continue;
                }
                if ch == quote {
                    break;
                }
                end += 1;
            }
            if end > start + 1 && end < source.len() {
                let value = source[start + 1..end].to_string();
                out.push((value, start + 1));
            }
            pos = end.saturating_add(1);
        }
    }
    out
}

fn check_unused_css_selectors(
    ast: &ComponentAst,
    source: &str,
    filename: &str,
) -> Vec<CompileDiagnostic> {
    let Some(style) = ast.style.as_ref() else {
        return Vec::new();
    };
    let mut out = Vec::new();
    let mut used_tags = BTreeSet::new();
    let mut used_classes = BTreeSet::new();
    let mut used_ids = BTreeSet::new();
    collect_template_selectors(
        &ast.template.nodes,
        &mut used_tags,
        &mut used_classes,
        &mut used_ids,
    );

    for (selector, rel_start) in extract_css_selectors(&style.source) {
        if selector_used(&selector, &used_tags, &used_classes, &used_ids) {
            continue;
        }
        let global_start = source
            .find(&style.source)
            .map(|s| s + rel_start)
            .unwrap_or(rel_start);
        let (line, column) = index_to_line_col(source, global_start);
        out.push(CompileDiagnostic {
            severity: DiagnosticSeverity::Warning,
            code: "fanxipan_CSS_UNUSED_SELECTOR".to_string(),
            filename: filename.to_string(),
            message: format!("Unused CSS selector '{}'", selector),
            line,
            column,
            span_start: Some(global_start),
            span_end: Some(global_start + selector.len()),
            suggestion: Some(
                "Remove selector or make sure matching template element/class/id exists"
                    .to_string(),
            ),
            frame: None,
        });
    }
    out
}

fn collect_template_selectors(
    nodes: &[TemplateNode],
    tags: &mut BTreeSet<String>,
    classes: &mut BTreeSet<String>,
    ids: &mut BTreeSet<String>,
) {
    for node in nodes {
        match node {
            TemplateNode::Element(el) => {
                tags.insert(el.tag.clone());
                for d in &el.directives {
                    collect_directive_selector(d, classes, ids);
                }
                collect_template_selectors(&el.children, tags, classes, ids);
            }
            TemplateNode::Component(c) => {
                for d in &c.directives {
                    collect_directive_selector(d, classes, ids);
                }
                collect_template_selectors(&c.children, tags, classes, ids);
            }
            TemplateNode::IfBlock(b) => {
                collect_template_selectors(&b.consequent, tags, classes, ids);
                for e in &b.elif_blocks {
                    collect_template_selectors(&e.consequent, tags, classes, ids);
                }
                if let Some(eb) = &b.else_block {
                    collect_template_selectors(&eb.consequent, tags, classes, ids);
                }
            }
            TemplateNode::ForBlock(b) => {
                collect_template_selectors(&b.body, tags, classes, ids);
                if let Some(empty) = &b.empty {
                    collect_template_selectors(&empty.body, tags, classes, ids);
                }
            }
            TemplateNode::AwaitBlock(b) => {
                collect_template_selectors(&b.pending, tags, classes, ids);
                collect_template_selectors(&b.then_body, tags, classes, ids);
                collect_template_selectors(&b.catch_body, tags, classes, ids);
            }
            TemplateNode::SnippetBlock(b) => {
                collect_template_selectors(&b.body, tags, classes, ids)
            }
            TemplateNode::KeyBlock(b) => collect_template_selectors(&b.body, tags, classes, ids),
            _ => {}
        }
    }
}

fn collect_directive_selector(
    d: &DirectiveNode,
    classes: &mut BTreeSet<String>,
    ids: &mut BTreeSet<String>,
) {
    if d.kind == "class" {
        classes.insert(d.name.clone());
    }
    if d.kind == "attr" && d.name == "class" {
        if let Some(expr) = &d.expression {
            let src = expr.source.trim().trim_matches('"').trim_matches('\'');
            for c in src.split_whitespace() {
                classes.insert(c.to_string());
            }
        }
    }
    if d.kind == "attr" && d.name == "id" {
        if let Some(expr) = &d.expression {
            ids.insert(
                expr.source
                    .trim()
                    .trim_matches('"')
                    .trim_matches('\'')
                    .to_string(),
            );
        }
    }
}

fn extract_css_selectors(css: &str) -> Vec<(String, usize)> {
    let mut out = Vec::new();
    let mut pos = 0usize;
    while let Some(open) = css[pos..].find('{') {
        let idx = pos + open;
        let raw = css[pos..idx].trim();
        if !raw.is_empty() {
            for part in raw.split(',') {
                let s = part.trim();
                if !s.is_empty() {
                    out.push((s.to_string(), pos + raw.find(s).unwrap_or(0)));
                }
            }
        }
        pos = idx + 1;
        if let Some(close) = css[pos..].find('}') {
            pos += close + 1;
        } else {
            break;
        }
    }
    out
}

fn selector_used(
    selector: &str,
    tags: &BTreeSet<String>,
    classes: &BTreeSet<String>,
    ids: &BTreeSet<String>,
) -> bool {
    let s = selector.trim();
    if s == "*"
        || s.contains(':')
        || s.contains('[')
        || s.contains('>')
        || s.contains('+')
        || s.contains('~')
        || s.contains(' ')
    {
        return true;
    }
    if let Some(dot) = s.find('.') {
        let tag = &s[..dot];
        let class = &s[dot + 1..];
        if !tag.is_empty() && tags.contains(tag) && classes.contains(class) {
            return true;
        }
    }
    if let Some(name) = s.strip_prefix('.') {
        return classes.contains(name);
    }
    if let Some(name) = s.strip_prefix('#') {
        return ids.contains(name);
    }
    let simple = s.split_whitespace().next().unwrap_or(s);
    tags.contains(simple)
}

fn index_to_line_col(source: &str, index: usize) -> (usize, usize) {
    let safe = index.min(source.len());
    let prefix = &source[..safe];
    let line = prefix.bytes().filter(|b| *b == b'\n').count() + 1;
    let col = prefix.rsplit('\n').next().map(|s| s.len()).unwrap_or(0) + 1;
    (line, col)
}

fn normalize_diagnostics(mut diags: Vec<CompileDiagnostic>) -> Vec<CompileDiagnostic> {
    diags.sort_by(|a, b| {
        (a.line, a.column, &a.code, &a.message).cmp(&(b.line, b.column, &b.code, &b.message))
    });
    diags.dedup_by(|a, b| {
        a.line == b.line && a.column == b.column && a.code == b.code && a.message == b.message
    });
    diags
}

fn semantic_code(message: &str) -> String {
    if message.contains("Invalid key expression") {
        "fanxipan_SEM_INVALID_KEY".to_string()
    } else if message.contains("Cannot mutate derived state") {
        "fanxipan_SEM_MUTATE_DERIVED".to_string()
    } else if message.contains("Unknown identifier") {
        "fanxipan_SEM_UNKNOWN_IDENTIFIER".to_string()
    } else if message.contains("Unknown directive") {
        "fanxipan_SEM_UNKNOWN_DIRECTIVE".to_string()
    } else if message.contains("Invalid bind target") {
        "fanxipan_SEM_INVALID_BIND_TARGET".to_string()
    } else if message.contains("Unsupported bind directive") {
        "fanxipan_SEM_UNSUPPORTED_BIND".to_string()
    } else if message.contains("Derived dependency cycle") {
        "fanxipan_SEM_DERIVED_CYCLE".to_string()
    } else if message.contains("must be pure") {
        "fanxipan_SEM_IMPURE_TEMPLATE_EXPR".to_string()
    } else {
        "fanxipan_SEMANTIC".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::{CompileOptions, DiagnosticSeverity, compile};

    #[test]
    fn compiles_if_block_with_range_anchors() {
        let src = r#"
function App() {
  let visible = $state(true)
  return (
    <div>
      {#if visible}
        <span>yes</span>
      {:else}
        <span>no</span>
      {/if}
    </div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "App.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("if:start"));
        assert!(out.code.contains("if:end"));
        assert!(out.code.contains("render_if_"));
    }

    #[test]
    fn compiles_for_block_with_empty_branch() {
        let src = r#"
function App() {
  let items = $state([])
  return (
    <ul>
      {#for item in items}
        <li>{item}</li>
      {:empty}
        <li>empty</li>
      {/for}
    </ul>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "App.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("for:start"));
        assert!(out.code.contains("for:end"));
        assert!(out.code.contains("render_for_"));
    }

    #[test]
    fn compiles_keyed_for_block_with_row_map() {
        let src = r#"
function App() {
  let todos = $state([])
  return (
    <ul>
      {#for todo in todos key todo.id}
        <li>{todo.text}</li>
      {/for}
    </ul>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "App.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("nextRows = new Map"));
        assert!(out.code.contains("moveRangeBefore"));
        assert!(out.code.contains("for:item:start"));
    }

    #[test]
    fn compiles_component_props_and_children_mount() {
        let src = r#"
function App() {
  let user = $state({ name: "A" })
  return (
    <div>
      <UserCard user={user}>
        <span>profile</span>
      </UserCard>
    </div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "App.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("mountComponent"));
        assert!(out.code.contains("\"user\""));
        assert!(out.code.contains("component:UserCard"));
    }

    #[test]
    fn compiles_event_modifiers() {
        let src = r#"
function App() {
  let submit = $state(() => {})
  return (
    <form onsubmit|preventDefault={submit}></form>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "App.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("preventDefault"));
        assert!(out.code.contains("ctx.listen"));
    }

    #[test]
    fn compiles_scoped_css_and_scope_class_patch() {
        let src = r#"
function App() {
  return (
    <div class="root">
      <span>hello</span>
    </div>
  )
}

export const styles = `
div, span { color: red; }
`
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "Scoped.fanxi".to_string(),
            },
        );
        assert!(out.scope.is_some());
        assert!(
            out.css
                .as_ref()
                .is_some_and(|css| css.contains(".fanxi-s-"))
        );
        assert!(out.code.contains("fanxi-s-"));
    }

    #[test]
    fn reports_template_and_semantic_diagnostics() {
        let src = r#"
function App() {
  let total = $derived(1)
  return (
    <ul>
      {#for item in items key item.id = 1}
        <li>{unknownVar}</li>
      {/for}
      <button onclick={() => total++}></button>
    </ul>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "Diag.fanxi".to_string(),
            },
        );
        assert!(
            out.diagnostics
                .iter()
                .any(|d| d.message.contains("Invalid key expression"))
        );
        assert!(
            out.diagnostics
                .iter()
                .any(|d| d.message.contains("Cannot mutate derived state"))
        );
        assert!(
            out.diagnostics
                .iter()
                .any(|d| d.message.contains("Unknown identifier"))
        );
    }

    #[test]
    fn reports_invalid_bind_target() {
        let src = r#"
function App() {
  let value = $state(1)
  return (
    <input bind:value={value + 1} />
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "Bind.fanxi".to_string(),
            },
        );
        assert!(
            out.diagnostics
                .iter()
                .any(|d| d.message.contains("Invalid bind target"))
        );
    }

    #[test]
    fn compiles_if_block_with_branch_guard() {
        let src = r#"
function App() {
  let ok = $state(true)
  return (
    <div>
      {#if ok}
        <span>yes</span>
      {:else}
        <span>no</span>
      {/if}
    </div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "IfGuard.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("if_current"));
        assert!(out.code.contains("__next"));
    }

    #[test]
    fn if_and_for_blocks_emit_dependency_subscriptions() {
        let src = r#"
function App() {
  let visible = $state(true)
  let items = $state([1,2,3])
  return (
    <div>
      {#if visible}
        <span>yes</span>
      {:else}
        <span>no</span>
      {/if}
      <ul>
        {#for item in items}
          <li>{item}</li>
        {/for}
      </ul>
    </div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "Blocks.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("render_if_"));
        assert!(out.code.contains("render_for_"));
        assert!(out.code.contains("ctx.subscribeExpr([\"visible\"]"));
        assert!(out.code.contains("ctx.subscribeExpr([\"items\"]"));
    }

    #[test]
    fn for_expression_subscribes_to_all_state_dependencies() {
        let src = r#"
function App() {
  let todos = $state([])
  let status = $state("all")
  return (
    <ul>
      {#for todo in (status === "all" ? todos : todos.filter((todo) => status === "done" ? todo.done : !todo.done)) key todo.id}
        <li>{todo.name}</li>
      {/for}
    </ul>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "ForExprDeps.fanxi".to_string(),
            },
        );
        assert!(out.diagnostics.is_empty());
        assert!(out.code.contains("ctx.subscribeExpr([\"status\", \"todos\"]"));
    }

    #[test]
    fn block_renderer_names_are_unique() {
        let src = r#"
function App() {
  let a = $state(true)
  let b = $state(false)
  let items = $state([1])
  return (
    <div>
      {#if a}<p>a</p>{/if}
      {#if b}<p>b</p>{/if}
      {#for item in items}<span>{item}</span>{/for}
      {#for item in items}<em>{item}</em>{/for}
    </div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "UniqueBlockNames.fanxi".to_string(),
            },
        );
        assert!(!out.code.contains("const renderIf ="));
        assert!(!out.code.contains("const renderFor ="));
        assert!(!out.code.contains("const clearBetween ="));
    }

    #[test]
    fn compiles_slot_to_children_projection() {
        let src = r#"
function Card() {
  return (
    <section>
      <slot />
    </section>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "Card.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("typeof children === 'function'"));
        assert!(out.code.contains("const __slot = children()"));
    }

    #[test]
    fn compiles_bind_checked_with_change_listener() {
        let src = r#"
function App() {
  let ok = $state(false)
  return (
    <input bind:checked={ok} />
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "BindChecked.fanxi".to_string(),
            },
        );
        assert!(out.code.contains(".checked = !!(ok);"));
        assert!(out.code.contains("listen(el_1, 'change'"));
    }

    #[test]
    fn compiles_class_and_style_attr_object_forms() {
        let src = r#"
function App() {
  let active = $state(true)
  let styles = $state({ color: "red", "font-weight": "700" })
  return (
    <div class={{ active }} style={styles}></div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "ClassStyle.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("__fanxipanApplyClass"));
        assert!(out.code.contains("__fanxipanApplyStyle"));
    }

    #[test]
    fn compiles_bind_group_and_files() {
        let src = r#"
function App() {
  let tags = $state([])
  let files = $state(null)
  return (
    <div>
      <input type="checkbox" value="a" bind:group={tags} />
      <input type="file" bind:files={files} />
    </div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "BindGroupFiles.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("Array.isArray(tags) ? tags.includes"));
        assert!(out.code.contains("listen(el_2, 'change'"));
        assert!(out.code.contains("files = event.target.files"));
    }

    #[test]
    fn compiles_extended_bind_targets() {
        let src = r#"
function App() {
  let el = $state(null)
  let top = $state(0)
  let left = $state(0)
  let width = $state(0)
  let height = $state(0)
  let time = $state(0)
  let duration = $state(0)
  let paused = $state(true)
  return (
    <div>
      <div bind:this={el} bind:scrollTop={top} bind:scrollLeft={left}></div>
      <div bind:clientWidth={width} bind:clientHeight={height}></div>
      <video bind:currentTime={time} bind:duration={duration} bind:paused={paused}></video>
    </div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "BindExtended.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("el = el_2;"));
        assert!(out.code.contains("listen(el_2, 'scroll'"));
        assert!(out.code.contains("ResizeObserver"));
        assert!(out.code.contains("listen(el_4, 'timeupdate'"));
        assert!(out.code.contains("listen(el_4, 'durationchange'"));
        assert!(out.code.contains(".pause();"));
    }

    #[test]
    fn compiles_use_transition_animate_directives() {
        let src = r#"
function App() {
  return (
    <div use:tooltip transition:fade in:fly out:fade animate:flip></div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "DirectiveFx.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("typeof tooltip === 'function'"));
        assert!(out.code.contains("typeof fade === 'function'"));
        assert!(out.code.contains("typeof fly === 'function'"));
        assert!(out.code.contains("typeof flip === 'function'"));
    }

    #[test]
    fn compiles_snippet_render_even_when_declared_later() {
        let src = r#"
function App() {
  let user = $state({ name: "Ada" })
  return (
    <div>
      {@render row(user)}
      {#snippet row(item)}
        <p>{item.name}</p>
      {/snippet}
    </div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "SnippetRender.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("function row("));
        assert!(out.code.contains("renderSnippet();"));
        assert!(
            out.code
                .contains("const __rendered = __renderTarget(user);")
        );
    }

    #[test]
    fn reports_unknown_render_target() {
        let src = r#"
function App() {
  let user = $state({ name: "Ada" })
  return (
    <div>
      {@render missing(user)}
    </div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "SnippetDiag.fanxi".to_string(),
            },
        );
        assert!(
            out.diagnostics
                .iter()
                .any(|d| d.message.contains("Unknown snippet/render target"))
        );
    }

    #[test]
    fn eliminates_dead_if_block_when_condition_constant() {
        let src = r#"
function App() {
  return (
    <div>
      {#if true}
        <span>live</span>
      {:else}
        <span>dead</span>
      {/if}
    </div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "DeadIf.fanxi".to_string(),
            },
        );
        assert!(!out.code.contains("if:start"));
        assert!(!out.code.contains("renderIf"));
        assert!(out.code.contains("live"));
    }

    #[test]
    fn tree_shakes_class_style_helpers_when_unused() {
        let src = r#"
function App() {
  return (
    <section>
      <p>plain</p>
    </section>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "NoStyleHelpers.fanxi".to_string(),
            },
        );
        assert!(!out.code.contains("__fanxipanApplyClass"));
        assert!(!out.code.contains("__fanxipanApplyStyle"));
    }

    #[test]
    fn reports_duplicate_route_and_unused_css_selector() {
        let src = r#"
function App() {
  return (
    <div class="used"></div>
  )
}

const routes = [
  { path: "/about", component: App },
  { path: "/about", component: App }
]

export const styles = `
.used { color: red; }
.unused { color: blue; }
`
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "Routes.fanxi".to_string(),
            },
        );
        assert!(
            out.diagnostics
                .iter()
                .any(|d| d.message.contains("Duplicate route: /about"))
        );
        assert!(
            out.diagnostics
                .iter()
                .any(|d| d.message.contains("Unused CSS selector '.unused'"))
        );
        assert!(
            out.diagnostics
                .iter()
                .any(|d| matches!(d.severity, DiagnosticSeverity::Warning))
        );
    }

    #[test]
    fn reports_unknown_directive() {
        let src = r#"
function App() {
  let value = $state(1)
  return (
    <input foo:bar={value} />
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "UnknownDirective.fanxi".to_string(),
            },
        );
        assert!(
            out.diagnostics
                .iter()
                .any(|d| d.message.contains("Unknown directive"))
        );
    }

    #[test]
    fn hoists_static_subtree_template() {
        let src = r#"
function App() {
  return (
    <div>
      <section class="card">
        <h2>Title</h2>
        <p>Body</p>
      </section>
    </div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "Hoist.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("document.createElement('template')"));
        assert!(out.code.contains(".content.cloneNode(true)"));
    }

    #[test]
    fn delegates_common_dom_events() {
        let src = r#"
function App() {
  let count = $state(0)
  return (
    <button onclick={() => count++}>inc</button>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "Delegate.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("listenDelegated"));
    }

    #[test]
    fn hoists_static_subtree_with_literal_expressions() {
        let src = r#"
function App() {
  return (
    <div>
      <p>{"hello"} {123} {true}</p>
    </div>
  )
}
"#;
        let out = compile(
            src,
            CompileOptions {
                filename: "HoistLiteral.fanxi".to_string(),
            },
        );
        assert!(out.code.contains("document.createElement('template')"));
        assert!(out.code.contains("hello"));
    }
}
