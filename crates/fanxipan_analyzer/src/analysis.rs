use crate::expr::extract_identifiers;
use std::collections::BTreeSet;

#[derive(Debug, Clone, Default)]
pub struct ReactivityGraph {
    pub states: Vec<String>,
    pub derived: Vec<String>,
    pub effects: Vec<String>,
    pub edges: Vec<(String, String)>,
    pub handler_mutations: Vec<(String, Vec<String>)>,
}

pub fn analyze_reactivity(source: &str) -> ReactivityGraph {
    let mut graph = ReactivityGraph::default();
    let state_bindings = capture_reactive_bindings(source, "$state(");
    let derived_bindings = capture_reactive_bindings(source, "$derived(");
    let effect_calls = capture_effect_calls(source);

    graph.states = state_bindings
        .iter()
        .map(|(name, _)| name.clone())
        .collect();
    graph.derived = derived_bindings
        .iter()
        .map(|(name, _)| name.clone())
        .collect();
    graph.effects = (1..=effect_calls.len())
        .map(|n| format!("effect_{n}"))
        .collect();

    let mut edges = BTreeSet::new();

    for (derived_name, derived_expr) in &derived_bindings {
        let deps = collect_graph_deps(derived_expr, &graph);
        for dep in deps {
            edges.insert((dep, format!("derived:{derived_name}")));
        }
    }

    for (idx, effect_expr) in effect_calls.iter().enumerate() {
        let effect_name = format!("effect_{}", idx + 1);
        let deps = collect_graph_deps(effect_expr, &graph);
        for dep in deps {
            let from = if graph.derived.iter().any(|d| d == &dep) {
                format!("derived:{dep}")
            } else {
                dep
            };
            edges.insert((from, format!("effect:{effect_name}")));
        }
    }

    graph.edges = edges.into_iter().collect();
    graph.handler_mutations = capture_handler_mutations(source, &graph.states);
    graph
}

pub fn dependencies_in_expression(expr: &str, graph: &ReactivityGraph) -> Vec<String> {
    let mut out = Vec::new();
    let symbols = extract_identifiers(expr);
    for s in symbols {
        if graph.states.iter().any(|n| n == &s) || graph.derived.iter().any(|n| n == &s) {
            out.push(s);
        }
    }
    out.sort();
    out.dedup();
    out
}

fn capture_reactive_bindings(source: &str, marker: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    let assignments = extract_handler_assignments(source);
    for (name, expr) in assignments {
        if let Some(arg) = extract_call_arg(&expr, marker) {
            out.push((name, arg));
        }
    }
    out
}

fn capture_effect_calls(source: &str) -> Vec<String> {
    let mut out = Vec::new();
    let marker = "$effect(";
    let mut pos = 0usize;
    while let Some(found) = source[pos..].find(marker) {
        let idx = pos + found;
        if let Some(arg) = extract_call_arg(&source[idx..], marker) {
            out.push(arg);
            pos = idx + marker.len();
        } else {
            pos = idx + 1;
        }
    }
    out
}

fn extract_call_arg(input: &str, marker: &str) -> Option<String> {
    let start = input.find(marker)? + marker.len();
    let bytes = input.as_bytes();
    let mut i = start;
    let mut depth = 1i32;
    while i < input.len() {
        match bytes[i] as char {
            '(' => depth += 1,
            ')' => {
                depth -= 1;
                if depth == 0 {
                    return Some(input[start..i].trim().to_string());
                }
            }
            _ => {}
        }
        i += 1;
    }
    None
}

fn collect_graph_deps(expr: &str, graph: &ReactivityGraph) -> Vec<String> {
    let mut out = Vec::new();
    for symbol in extract_identifiers(expr) {
        if graph.states.iter().any(|s| s == &symbol) || graph.derived.iter().any(|d| d == &symbol) {
            out.push(symbol);
        }
    }
    out.sort();
    out.dedup();
    out
}

fn capture_handler_mutations(source: &str, states: &[String]) -> Vec<(String, Vec<String>)> {
    let mut out = Vec::new();
    for (name, expr) in extract_handler_assignments(source) {
        let trimmed = expr.trim();
        if !(trimmed.contains("=>") || trimmed.starts_with("function")) {
            continue;
        }
        let mut deps = Vec::new();
        for state in states {
            if is_mutated_symbol(trimmed, state) {
                deps.push(state.clone());
            }
        }
        deps.sort();
        deps.dedup();
        if !deps.is_empty() {
            out.push((name, deps));
        }
    }
    out
}

fn extract_handler_assignments(source: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    let bytes = source.as_bytes();
    let mut i = 0usize;
    while i < bytes.len() {
        let Some((kw, kw_len)) = match_keyword(bytes, i) else {
            i += 1;
            continue;
        };
        if i > 0 && is_ident_continue(bytes[i - 1]) {
            i += 1;
            continue;
        }
        let mut j = i + kw_len;
        while j < bytes.len() && bytes[j].is_ascii_whitespace() {
            j += 1;
        }
        let name_start = j;
        if j >= bytes.len() || !is_ident_start(bytes[j]) {
            i += kw_len;
            continue;
        }
        j += 1;
        while j < bytes.len() && is_ident_continue(bytes[j]) {
            j += 1;
        }
        let name = source[name_start..j].to_string();
        while j < bytes.len() && bytes[j].is_ascii_whitespace() {
            j += 1;
        }
        if j >= bytes.len() || bytes[j] != b'=' {
            i += kw_len;
            continue;
        }
        j += 1;
        while j < bytes.len() && bytes[j].is_ascii_whitespace() {
            j += 1;
        }
        let expr_start = j;
        let mut depth_paren = 0i32;
        let mut depth_brace = 0i32;
        let mut depth_bracket = 0i32;
        let mut quote: Option<u8> = None;
        while j < bytes.len() {
            let ch = bytes[j];
            if let Some(q) = quote {
                if ch == b'\\' {
                    j += 2;
                    continue;
                }
                if ch == q {
                    quote = None;
                }
                j += 1;
                continue;
            }
            if ch == b'"' || ch == b'\'' || ch == b'`' {
                quote = Some(ch);
                j += 1;
                continue;
            }
            match ch {
                b'(' => depth_paren += 1,
                b')' => depth_paren -= 1,
                b'{' => depth_brace += 1,
                b'}' => depth_brace -= 1,
                b'[' => depth_bracket += 1,
                b']' => depth_bracket -= 1,
                b';' if depth_paren <= 0 && depth_brace <= 0 && depth_bracket <= 0 => {
                    break;
                }
                b'\n' if depth_paren <= 0 && depth_brace <= 0 && depth_bracket <= 0 => {
                    break;
                }
                _ => {}
            }
            j += 1;
        }
        let expr_end = j.min(bytes.len());
        let expr = source[expr_start..expr_end].trim().to_string();
        if !name.is_empty() && !expr.is_empty() {
            out.push((name, expr));
        }
        i = if j < bytes.len() { j + 1 } else { j };
        let _ = kw;
    }
    out
}

fn match_keyword(bytes: &[u8], i: usize) -> Option<(&'static str, usize)> {
    if bytes.len() >= i + 6 && &bytes[i..i + 6] == b"const " {
        return Some(("const", 6));
    }
    if bytes.len() >= i + 4 && &bytes[i..i + 4] == b"let " {
        return Some(("let", 4));
    }
    if bytes.len() >= i + 4 && &bytes[i..i + 4] == b"var " {
        return Some(("var", 4));
    }
    None
}

fn is_ident_start(b: u8) -> bool {
    b == b'_' || b == b'$' || b.is_ascii_alphabetic()
}

fn is_ident_continue(b: u8) -> bool {
    is_ident_start(b) || b.is_ascii_digit()
}

fn is_mutated_symbol(expr: &str, symbol: &str) -> bool {
    let e = expr.replace(char::is_whitespace, "");
    e.contains(&format!("{symbol}++"))
        || e.contains(&format!("++{symbol}"))
        || e.contains(&format!("{symbol}--"))
        || e.contains(&format!("--{symbol}"))
        || e.contains(&format!("{symbol}="))
        || e.contains(&format!("{symbol}+="))
        || e.contains(&format!("{symbol}-="))
        || e.contains(&format!("{symbol}*="))
        || e.contains(&format!("{symbol}/="))
}

#[cfg(test)]
mod tests {
    use super::{analyze_reactivity, dependencies_in_expression};

    #[test]
    fn captures_state_derived_effect() {
        let src = r#"
let count = $state(0)
let double = $derived(count * 2)
$effect(() => console.log(double))
"#;
        let graph = analyze_reactivity(src);
        assert_eq!(graph.states, vec!["count"]);
        assert_eq!(graph.derived, vec!["double"]);
        assert_eq!(graph.effects, vec!["effect_1"]);
        assert!(
            graph
                .edges
                .contains(&(String::from("count"), String::from("derived:double")))
        );
        assert!(graph.edges.contains(&(
            String::from("derived:double"),
            String::from("effect:effect_1")
        )));
    }

    #[test]
    fn extracts_expression_dependencies() {
        let src = "let count = $state(0)\nlet double = $derived(count * 2)";
        let graph = analyze_reactivity(src);
        let deps = dependencies_in_expression("double + count + other", &graph);
        assert_eq!(deps, vec!["count", "double"]);
    }

    #[test]
    fn captures_handler_mutations() {
        let src = r#"
let count = $state(0)
const onclick = () => count++
const noop = () => {}
"#;
        let graph = analyze_reactivity(src);
        assert!(
            graph
                .handler_mutations
                .iter()
                .any(|(name, deps)| name == "onclick" && deps == &vec!["count".to_string()])
        );
    }

    #[test]
    fn captures_multiline_handler_mutations() {
        let src = r#"
let items = $state([])
const addItem = () => {
  items = items.concat([1])
}
"#;
        let graph = analyze_reactivity(src);
        assert!(
            graph
                .handler_mutations
                .iter()
                .any(|(name, deps)| name == "addItem" && deps == &vec!["items".to_string()])
        );
    }

    #[test]
    fn captures_multiline_state_and_derived_bindings() {
        let src = r#"
let todos = $state([
  { id: 1, done: false }
])
let status = $state("all")
let filtered = $derived(
  status === "all" ? todos : todos.filter((todo) => todo.done)
)
"#;
        let graph = analyze_reactivity(src);
        assert!(graph.states.contains(&"todos".to_string()));
        assert!(graph.states.contains(&"status".to_string()));
        assert!(graph.derived.contains(&"filtered".to_string()));
        assert!(
            graph
                .edges
                .iter()
                .any(|(from, to)| from == "todos" && to == "derived:filtered")
        );
        assert!(
            graph
                .edges
                .iter()
                .any(|(from, to)| from == "status" && to == "derived:filtered")
        );
    }
}
