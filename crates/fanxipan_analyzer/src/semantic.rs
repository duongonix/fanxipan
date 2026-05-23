use crate::analysis::ReactivityGraph;
use crate::expr::{IdentifierRef, extract_identifier_refs};
use crate::scope::ScopeStack;
use crate::symbols::{collect_script_symbols, find_mutation_of, is_js_global};
use fanxipan_ast::{ExpressionNode, TemplateNode};
use std::collections::{BTreeSet, HashSet};

#[derive(Debug, Clone)]
pub struct SemanticDiagnostic {
    pub message: String,
    pub line: usize,
    pub column: usize,
    pub span_start: Option<usize>,
    pub span_end: Option<usize>,
    pub suggestion: Option<String>,
}

pub fn analyze_semantics(
    source: &str,
    template_nodes: &[TemplateNode],
    graph: &ReactivityGraph,
) -> Vec<SemanticDiagnostic> {
    let mut out = Vec::new();
    let mut scope = ScopeStack::new();
    let snippet_names = collect_snippet_names(template_nodes);
    let symbols = collect_script_symbols(source);
    out.extend(check_mutate_derived(source, &graph.derived));
    out.extend(check_derived_cycles(source, graph));
    out.extend(check_template_nodes(
        source,
        template_nodes,
        graph,
        &symbols,
        &mut scope,
        &snippet_names,
    ));
    out
}

fn check_derived_cycles(source: &str, graph: &ReactivityGraph) -> Vec<SemanticDiagnostic> {
    let mut dep_map = std::collections::BTreeMap::<String, Vec<String>>::new();
    for (from, to) in &graph.edges {
        if let Some(target) = to.strip_prefix("derived:") {
            if graph.derived.iter().any(|d| d == from) {
                dep_map
                    .entry(target.to_string())
                    .or_default()
                    .push(from.clone());
            }
            if target == from {
                dep_map
                    .entry(target.to_string())
                    .or_default()
                    .push(from.clone());
            }
        }
    }
    let mut out = Vec::new();
    let mut visiting = std::collections::BTreeSet::<String>::new();
    let mut visited = std::collections::BTreeSet::<String>::new();
    for node in &graph.derived {
        if has_cycle(node, &dep_map, &mut visiting, &mut visited) {
            let idx = source.find(node).unwrap_or(0);
            let (line, column) = index_to_line_col(source, idx);
            out.push(SemanticDiagnostic {
                message: format!("Derived dependency cycle detected involving '{node}'"),
                line,
                column,
                span_start: Some(idx),
                span_end: Some(idx + node.len()),
                suggestion: Some(
                    "Break cyclic derived dependencies by using source $state".to_string(),
                ),
            });
            break;
        }
    }
    out
}

fn has_cycle(
    node: &str,
    dep_map: &std::collections::BTreeMap<String, Vec<String>>,
    visiting: &mut std::collections::BTreeSet<String>,
    visited: &mut std::collections::BTreeSet<String>,
) -> bool {
    if visited.contains(node) {
        return false;
    }
    if !visiting.insert(node.to_string()) {
        return true;
    }
    if let Some(deps) = dep_map.get(node) {
        for dep in deps {
            if has_cycle(dep, dep_map, visiting, visited) {
                return true;
            }
        }
    }
    visiting.remove(node);
    visited.insert(node.to_string());
    false
}

fn check_mutate_derived(source: &str, derived: &[String]) -> Vec<SemanticDiagnostic> {
    let mut out = Vec::new();
    for name in derived {
        if let Some(idx) = find_mutation_of(source, name) {
            let (line, column) = index_to_line_col(source, idx);
            out.push(SemanticDiagnostic {
                message: format!("Cannot mutate derived state '{name}'"),
                line,
                column,
                span_start: Some(idx),
                span_end: Some(idx + name.len()),
                suggestion: Some("Mutate source $state instead of $derived".to_string()),
            });
        }
    }
    out
}

fn check_template_nodes(
    source: &str,
    nodes: &[TemplateNode],
    graph: &ReactivityGraph,
    symbols: &[String],
    scope: &mut ScopeStack,
    snippet_names: &BTreeSet<String>,
) -> Vec<SemanticDiagnostic> {
    let mut out = Vec::new();
    for node in nodes {
        match node {
            TemplateNode::Expression(expr) => {
                out.extend(check_expression_scope(expr, source, graph, symbols, scope));
            }
            TemplateNode::Element(el) => {
                for d in &el.directives {
                    if !is_supported_directive_kind(&d.kind) {
                        let (line, column) = d
                            .expression
                            .as_ref()
                            .map(|expr| find_expr_loc(source, expr))
                            .unwrap_or_else(|| (1, 1));
                        out.push(SemanticDiagnostic {
                            message: format!("Unknown directive '{}'", d.name),
                            line,
                            column,
                            span_start: d.expression.as_ref().and_then(|e| e.span.map(|s| s.start)),
                            span_end: d.expression.as_ref().and_then(|e| e.span.map(|s| s.end)),
                            suggestion: Some("Use built-in directives: on, bind, class, style, use, transition, in, out, animate or spread attributes".to_string()),
                        });
                    }
                    if let Some(expr) = &d.expression {
                        if d.kind == "event" && is_event_handler_identifier(&expr.source) {
                            continue;
                        }
                        if d.kind == "bind" && !is_assignable_target(&expr.source) {
                            out.push(diag_invalid_bind(source, expr));
                        }
                        if d.kind == "bind" && !is_supported_bind_name(&d.name) {
                            out.push(diag_unsupported_bind_name(source, expr, &d.name));
                        }
                        let enforce_purity = d.kind != "event" && d.kind != "bind";
                        out.extend(check_expression_scope_with_options(
                            expr,
                            source,
                            graph,
                            symbols,
                            scope,
                            enforce_purity,
                        ));
                    }
                }
                out.extend(check_template_nodes(
                    source,
                    &el.children,
                    graph,
                    symbols,
                    scope,
                    snippet_names,
                ));
            }
            TemplateNode::Component(component) => {
                for d in &component.directives {
                    if !is_supported_component_directive_kind(&d.kind) {
                        let (line, column) = d
                            .expression
                            .as_ref()
                            .map(|expr| find_expr_loc(source, expr))
                            .unwrap_or_else(|| (1, 1));
                        out.push(SemanticDiagnostic {
                            message: format!("Unknown directive '{}'", d.name),
                            line,
                            column,
                            span_start: d.expression.as_ref().and_then(|e| e.span.map(|s| s.start)),
                            span_end: d.expression.as_ref().and_then(|e| e.span.map(|s| s.end)),
                            suggestion: Some(
                                "Component directives support attrs, binds and events".to_string(),
                            ),
                        });
                    }
                    if let Some(expr) = &d.expression {
                        if d.kind == "event" && is_event_handler_identifier(&expr.source) {
                            continue;
                        }
                        let enforce_purity = d.kind != "event" && d.kind != "bind";
                        out.extend(check_expression_scope_with_options(
                            expr,
                            source,
                            graph,
                            symbols,
                            scope,
                            enforce_purity,
                        ));
                    }
                }
                out.extend(check_template_nodes(
                    source,
                    &component.children,
                    graph,
                    symbols,
                    scope,
                    snippet_names,
                ));
            }
            TemplateNode::IfBlock(block) => {
                out.extend(check_expression_scope(
                    &block.condition,
                    source,
                    graph,
                    symbols,
                    scope,
                ));
                out.extend(check_template_nodes(
                    source,
                    &block.consequent,
                    graph,
                    symbols,
                    scope,
                    snippet_names,
                ));
                for elif in &block.elif_blocks {
                    out.extend(check_expression_scope(
                        &elif.condition,
                        source,
                        graph,
                        symbols,
                        scope,
                    ));
                    out.extend(check_template_nodes(
                        source,
                        &elif.consequent,
                        graph,
                        symbols,
                        scope,
                        snippet_names,
                    ));
                }
                if let Some(else_block) = &block.else_block {
                    out.extend(check_template_nodes(
                        source,
                        &else_block.consequent,
                        graph,
                        symbols,
                        scope,
                        snippet_names,
                    ));
                }
            }
            TemplateNode::ForBlock(block) => {
                if let Some(idx) = &block.index {
                    if idx == &block.item {
                        let (line, column) = find_expr_loc(source, &block.iterable);
                        out.push(SemanticDiagnostic {
                            message: format!(
                                "Loop index '{}' must be different from loop item '{}'",
                                idx, block.item
                            ),
                            line,
                            column,
                            span_start: block.iterable.span.map(|s| s.start),
                            span_end: block.iterable.span.map(|s| s.end),
                            suggestion: Some(
                                "Use distinct names, for example: {#for item, index in items}"
                                    .to_string(),
                            ),
                        });
                    }
                }
                out.extend(check_expression_scope(
                    &block.iterable,
                    source,
                    graph,
                    symbols,
                    scope,
                ));
                scope.push_frame();
                scope.define(block.item.clone());
                if let Some(idx) = &block.index {
                    scope.define(idx.clone());
                }
                if let Some(key) = &block.key {
                    if !is_valid_key_expression(&key.source) {
                        out.push(diag_invalid_key(source, key));
                    }
                    if !key_references_loop_item(&key.source, &block.item) {
                        out.push(diag_invalid_key_scope(source, key, &block.item));
                    }
                    out.extend(check_expression_scope(key, source, graph, symbols, scope));
                }
                out.extend(check_template_nodes(
                    source,
                    &block.body,
                    graph,
                    symbols,
                    scope,
                    snippet_names,
                ));
                scope.pop_frame();
                if let Some(empty) = &block.empty {
                    out.extend(check_template_nodes(
                        source,
                        &empty.body,
                        graph,
                        symbols,
                        scope,
                        snippet_names,
                    ));
                }
            }
            TemplateNode::SnippetBlock(block) => {
                scope.push_frame();
                for p in &block.params {
                    scope.define(p.clone());
                }
                out.extend(check_template_nodes(
                    source,
                    &block.body,
                    graph,
                    symbols,
                    scope,
                    snippet_names,
                ));
                scope.pop_frame();
            }
            TemplateNode::RenderBlock(block) => {
                if is_plain_identifier(&block.target)
                    && !snippet_names.contains(&block.target)
                    && !scope.contains(&block.target)
                    && !symbols.iter().any(|s| s == &block.target)
                    && !is_js_global(&block.target)
                {
                    let (line, column) = index_to_line_col(source, 0);
                    out.push(SemanticDiagnostic {
                        message: format!("Unknown snippet/render target '{}'", block.target),
                        line,
                        column,
                        span_start: None,
                        span_end: None,
                        suggestion: Some(
                            "Define snippet via {#snippet name(...)} or pass function via props"
                                .to_string(),
                        ),
                    });
                }
                for arg in &block.args {
                    out.extend(check_expression_scope(arg, source, graph, symbols, scope));
                }
            }
            _ => {}
        }
    }
    out
}

fn collect_snippet_names(nodes: &[TemplateNode]) -> BTreeSet<String> {
    let mut out = BTreeSet::new();
    fn walk(nodes: &[TemplateNode], out: &mut BTreeSet<String>) {
        for node in nodes {
            match node {
                TemplateNode::SnippetBlock(block) => {
                    out.insert(block.name.clone());
                    walk(&block.body, out);
                }
                TemplateNode::Element(el) => walk(&el.children, out),
                TemplateNode::Component(c) => walk(&c.children, out),
                TemplateNode::IfBlock(b) => {
                    walk(&b.consequent, out);
                    for e in &b.elif_blocks {
                        walk(&e.consequent, out);
                    }
                    if let Some(eb) = &b.else_block {
                        walk(&eb.consequent, out);
                    }
                }
                TemplateNode::ForBlock(b) => {
                    walk(&b.body, out);
                    if let Some(empty) = &b.empty {
                        walk(&empty.body, out);
                    }
                }
                TemplateNode::AwaitBlock(b) => {
                    walk(&b.pending, out);
                    walk(&b.then_body, out);
                    walk(&b.catch_body, out);
                }
                TemplateNode::KeyBlock(b) => walk(&b.body, out),
                _ => {}
            }
        }
    }
    walk(nodes, &mut out);
    out
}

fn is_plain_identifier(value: &str) -> bool {
    let v = value.trim();
    if v.is_empty() {
        return false;
    }
    v.chars().enumerate().all(|(idx, ch)| {
        if idx == 0 {
            ch == '_' || ch == '$' || ch.is_ascii_alphabetic()
        } else {
            ch == '_' || ch == '$' || ch.is_ascii_alphanumeric()
        }
    })
}

fn check_expression_scope(
    expr: &ExpressionNode,
    source: &str,
    graph: &ReactivityGraph,
    symbols: &[String],
    scope: &ScopeStack,
) -> Vec<SemanticDiagnostic> {
    check_expression_scope_with_options(expr, source, graph, symbols, scope, true)
}

fn check_expression_scope_with_options(
    expr: &ExpressionNode,
    source: &str,
    graph: &ReactivityGraph,
    symbols: &[String],
    scope: &ScopeStack,
    enforce_purity: bool,
) -> Vec<SemanticDiagnostic> {
    let mut out = Vec::new();
    let local_bindings = collect_local_bindings(&expr.source);
    if enforce_purity && has_side_effect_expression(&expr.source) {
        let (line, column) = find_expr_loc(source, expr);
        out.push(SemanticDiagnostic {
            message: "Template expression must be pure (side effects are not allowed)".to_string(),
            line,
            column,
            span_start: expr.span.map(|s| s.start),
            span_end: expr.span.map(|s| s.end),
            suggestion: Some("Move mutations/calls into event handlers or $effect".to_string()),
        });
        return out;
    }
    let refs = extract_identifier_refs(&expr.source);
    for ident in refs {
        if is_inside_string_literal(&expr.source, ident.offset) {
            continue;
        }
        if can_resolve_identifier(&ident, graph, symbols, scope, &local_bindings) {
            continue;
        }
        let (line, column) = find_expr_loc(source, expr);
        out.push(SemanticDiagnostic {
            message: format!("Unknown identifier '{}' in template scope", ident.name),
            line,
            column,
            span_start: expr.span.map(|s| s.start + ident.offset),
            span_end: expr.span.map(|s| s.start + ident.offset + ident.name.len()),
            suggestion: Some("Declare variable in script or pass via props/loop scope".to_string()),
        });
        break;
    }
    out
}

fn is_inside_string_literal(expr: &str, offset: usize) -> bool {
    let bytes = expr.as_bytes();
    let mut i = 0usize;
    let mut quote: Option<u8> = None;
    while i < bytes.len() && i < offset {
        let ch = bytes[i];
        if let Some(q) = quote {
            if ch == b'\\' {
                i += 2;
                continue;
            }
            if ch == q {
                quote = None;
            }
        } else if ch == b'"' || ch == b'\'' || ch == b'`' {
            quote = Some(ch);
        }
        i += 1;
    }
    quote.is_some()
}

fn can_resolve_identifier(
    ident: &IdentifierRef,
    graph: &ReactivityGraph,
    symbols: &[String],
    scope: &ScopeStack,
    local_bindings: &HashSet<String>,
) -> bool {
    ident.is_property
        || local_bindings.contains(&ident.name)
        || scope.contains(&ident.name)
        || graph.states.iter().any(|s| s == &ident.name)
        || graph.derived.iter().any(|s| s == &ident.name)
        || symbols.iter().any(|s| s == &ident.name)
        || is_js_global(&ident.name)
}

fn collect_local_bindings(expr: &str) -> HashSet<String> {
    let mut out = HashSet::new();
    collect_arrow_params(expr, &mut out);
    collect_function_params(expr, &mut out);
    collect_var_declarations(expr, &mut out);
    out
}

fn collect_arrow_params(expr: &str, out: &mut HashSet<String>) {
    let bytes = expr.as_bytes();
    let mut i = 0usize;
    while i + 1 < bytes.len() {
        if bytes[i] == b'=' && bytes[i + 1] == b'>' {
            if let Some((start, end)) = find_arrow_param_span(expr, i) {
                let raw = expr[start..end].trim();
                if raw.starts_with('(') && raw.ends_with(')') {
                    let inner = &raw[1..raw.len() - 1];
                    for p in inner.split(',') {
                        let name = p.trim();
                        if is_plain_identifier(name) {
                            out.insert(name.to_string());
                        }
                    }
                } else if is_plain_identifier(raw) {
                    out.insert(raw.to_string());
                }
            }
            i += 2;
            continue;
        }
        i += 1;
    }
}

fn find_arrow_param_span(expr: &str, arrow_eq_idx: usize) -> Option<(usize, usize)> {
    let bytes = expr.as_bytes();
    if arrow_eq_idx == 0 {
        return None;
    }
    let mut end = arrow_eq_idx;
    while end > 0 && bytes[end - 1].is_ascii_whitespace() {
        end -= 1;
    }
    if end == 0 {
        return None;
    }
    if bytes[end - 1] == b')' {
        let mut depth = 0i32;
        let mut j = end;
        while j > 0 {
            j -= 1;
            match bytes[j] {
                b')' => depth += 1,
                b'(' => {
                    depth -= 1;
                    if depth == 0 {
                        return Some((j, end));
                    }
                }
                _ => {}
            }
        }
        return None;
    }
    let mut start = end - 1;
    while start > 0 && is_ident_continue(bytes[start - 1]) {
        start -= 1;
    }
    Some((start, end))
}

fn collect_function_params(expr: &str, out: &mut HashSet<String>) {
    let needle = "function";
    let bytes = expr.as_bytes();
    let mut i = 0usize;
    while let Some(found) = expr[i..].find(needle) {
        let idx = i + found + needle.len();
        let mut j = idx;
        while j < bytes.len() && bytes[j].is_ascii_whitespace() {
            j += 1;
        }
        if j < bytes.len() && is_ident_start(bytes[j]) {
            j += 1;
            while j < bytes.len() && is_ident_continue(bytes[j]) {
                j += 1;
            }
            while j < bytes.len() && bytes[j].is_ascii_whitespace() {
                j += 1;
            }
        }
        if j >= bytes.len() || bytes[j] != b'(' {
            i = idx;
            continue;
        }
        let params_start = j + 1;
        let mut k = params_start;
        let mut depth = 1i32;
        while k < bytes.len() {
            match bytes[k] {
                b'(' => depth += 1,
                b')' => {
                    depth -= 1;
                    if depth == 0 {
                        break;
                    }
                }
                _ => {}
            }
            k += 1;
        }
        if k <= bytes.len() {
            let inner = &expr[params_start..k];
            for p in inner.split(',') {
                let name = p.trim();
                if is_plain_identifier(name) {
                    out.insert(name.to_string());
                }
            }
        }
        i = k.saturating_add(1);
    }
}

fn collect_var_declarations(expr: &str, out: &mut HashSet<String>) {
    let bytes = expr.as_bytes();
    let mut i = 0usize;
    while i < bytes.len() {
        let kw_len = if bytes[i..].starts_with(b"const ") {
            6
        } else if bytes[i..].starts_with(b"let ") || bytes[i..].starts_with(b"var ") {
            4
        } else {
            i += 1;
            continue;
        };
        let mut j = i + kw_len;
        while j < bytes.len() && bytes[j].is_ascii_whitespace() {
            j += 1;
        }
        let start = j;
        if j < bytes.len() && is_ident_start(bytes[j]) {
            j += 1;
            while j < bytes.len() && is_ident_continue(bytes[j]) {
                j += 1;
            }
            out.insert(expr[start..j].to_string());
        }
        i = j;
    }
}

fn is_ident_start(b: u8) -> bool {
    b == b'_' || b == b'$' || b.is_ascii_alphabetic()
}

fn is_ident_continue(b: u8) -> bool {
    is_ident_start(b) || b.is_ascii_digit()
}

fn is_valid_key_expression(expr: &str) -> bool {
    let trimmed = expr.trim();
    !trimmed.is_empty()
        && !trimmed.contains(';')
        && !trimmed.contains("=>")
        && !trimmed.contains("++")
        && !trimmed.contains("--")
        && !trimmed.contains('=')
}

fn key_references_loop_item(expr: &str, item: &str) -> bool {
    extract_identifier_refs(expr)
        .iter()
        .any(|id| id.name == item || id.name.starts_with(&format!("{item}.")))
}

fn has_side_effect_expression(expr: &str) -> bool {
    let trimmed = expr.trim();
    if trimmed.is_empty() {
        return false;
    }
    if trimmed.contains("++")
        || trimmed.contains("--")
        || trimmed.contains("+=")
        || trimmed.contains("-=")
        || trimmed.contains("*=")
        || trimmed.contains("/=")
        || trimmed.contains("%=")
    {
        return true;
    }
    let bytes = trimmed.as_bytes();
    let mut i = 0usize;
    while i < bytes.len() {
        if bytes[i] != b'=' {
            i += 1;
            continue;
        }
        let prev = if i > 0 { Some(bytes[i - 1]) } else { None };
        let next = if i + 1 < bytes.len() {
            Some(bytes[i + 1])
        } else {
            None
        };
        let prev_is_comp = matches!(prev, Some(b'=') | Some(b'!') | Some(b'<') | Some(b'>'));
        let next_is_comp = matches!(next, Some(b'=') | Some(b'>'));
        if !prev_is_comp && !next_is_comp {
            return true;
        }
        i += 1;
    }
    false
}

fn is_assignable_target(expr: &str) -> bool {
    let trimmed = expr.trim();
    if trimmed.is_empty() {
        return false;
    }
    if trimmed.contains("=>")
        || trimmed.contains('?')
        || trimmed.contains(':')
        || trimmed.contains("||")
        || trimmed.contains("&&")
        || trimmed.contains(';')
        || trimmed.contains('(')
        || trimmed.contains(')')
    {
        return false;
    }
    for ch in trimmed.chars() {
        if ch.is_ascii_alphanumeric()
            || ch == '_'
            || ch == '$'
            || ch == '.'
            || ch == '['
            || ch == ']'
        {
            continue;
        }
        return false;
    }
    true
}

fn is_event_handler_identifier(expr: &str) -> bool {
    let trimmed = expr.trim();
    if trimmed.is_empty() {
        return false;
    }
    trimmed.chars().enumerate().all(|(idx, ch)| {
        if idx == 0 {
            ch == '_' || ch == '$' || ch.is_ascii_alphabetic()
        } else {
            ch == '_' || ch == '$' || ch.is_ascii_alphanumeric()
        }
    })
}

fn is_supported_bind_name(name: &str) -> bool {
    matches!(
        name,
        "value"
            | "checked"
            | "group"
            | "files"
            | "this"
            | "scrollTop"
            | "scrollLeft"
            | "clientWidth"
            | "clientHeight"
            | "currentTime"
            | "duration"
            | "paused"
    )
}

fn is_supported_directive_kind(kind: &str) -> bool {
    matches!(
        kind,
        "attr"
            | "event"
            | "bind"
            | "class"
            | "style"
            | "use"
            | "transition"
            | "in"
            | "out"
            | "animate"
            | "spread"
    )
}

fn is_supported_component_directive_kind(kind: &str) -> bool {
    matches!(kind, "attr" | "event" | "bind" | "spread")
}

fn diag_invalid_bind(source: &str, expr: &ExpressionNode) -> SemanticDiagnostic {
    let (line, column) = find_expr_loc(source, expr);
    SemanticDiagnostic {
        message: format!("Invalid bind target '{}' (must be assignable)", expr.source),
        line,
        column,
        span_start: expr.span.map(|s| s.start),
        span_end: expr.span.map(|s| s.end),
        suggestion: Some("Use identifier/member expression like form.name or value".to_string()),
    }
}

fn diag_unsupported_bind_name(
    source: &str,
    expr: &ExpressionNode,
    name: &str,
) -> SemanticDiagnostic {
    let (line, column) = find_expr_loc(source, expr);
    SemanticDiagnostic {
        message: format!("Unsupported bind directive '{}'", name),
        line,
        column,
        span_start: expr.span.map(|s| s.start),
        span_end: expr.span.map(|s| s.end),
        suggestion: Some("Supported bind targets are value, checked, group, files, this, scrollTop, scrollLeft, clientWidth, clientHeight, currentTime, duration, paused".to_string()),
    }
}

fn diag_invalid_key(source: &str, expr: &ExpressionNode) -> SemanticDiagnostic {
    let (line, column) = find_expr_loc(source, expr);
    SemanticDiagnostic {
        message: "Invalid key expression".to_string(),
        line,
        column,
        span_start: expr.span.map(|s| s.start),
        span_end: expr.span.map(|s| s.end),
        suggestion: Some("Use a stable read-only key like item.id".to_string()),
    }
}

fn diag_invalid_key_scope(source: &str, expr: &ExpressionNode, item: &str) -> SemanticDiagnostic {
    let (line, column) = find_expr_loc(source, expr);
    SemanticDiagnostic {
        message: format!("Key expression must reference loop item '{item}'"),
        line,
        column,
        span_start: expr.span.map(|s| s.start),
        span_end: expr.span.map(|s| s.end),
        suggestion: Some("Use key like item.id for stable per-item identity".to_string()),
    }
}

fn find_expr_loc(source: &str, expr: &ExpressionNode) -> (usize, usize) {
    if let Some(span) = expr.span {
        return index_to_line_col(source, span.start);
    }
    if let Some(idx) = source.find(&expr.source) {
        return index_to_line_col(source, idx);
    }
    (1, 1)
}

fn index_to_line_col(source: &str, index: usize) -> (usize, usize) {
    let safe = index.min(source.len());
    let prefix = &source[..safe];
    let line = prefix.bytes().filter(|b| *b == b'\n').count() + 1;
    let col = prefix.rsplit('\n').next().map(|s| s.len()).unwrap_or(0) + 1;
    (line, col)
}

#[cfg(test)]
mod tests {
    use super::analyze_semantics;
    use crate::analyze_reactivity;
    use fanxipan_ast::{DirectiveNode, ElementNode, ExpressionNode, ForBlock, TemplateNode};

    #[test]
    fn detects_invalid_key_expression() {
        let graph = analyze_reactivity("let items = $state([])");
        let node = TemplateNode::ForBlock(ForBlock {
            item: "item".to_string(),
            index: None,
            iterable: ExpressionNode {
                source: "items".to_string(),
                span: None,
            },
            key: Some(ExpressionNode {
                source: "item.id = 1".to_string(),
                span: None,
            }),
            body: vec![],
            empty: None,
        });
        let diags = analyze_semantics(
            "{#for item in items key item.id = 1}{/for}",
            &[node],
            &graph,
        );
        assert!(
            diags
                .iter()
                .any(|d| d.message.contains("Invalid key expression"))
        );
    }

    #[test]
    fn detects_unknown_identifier_in_template() {
        let graph = analyze_reactivity("let count = $state(0)");
        let node = TemplateNode::Expression(ExpressionNode {
            source: "missing + count".to_string(),
            span: None,
        });
        let diags = analyze_semantics("{missing + count}", &[node], &graph);
        assert!(
            diags
                .iter()
                .any(|d| d.message.contains("Unknown identifier 'missing'"))
        );
    }

    #[test]
    fn resolves_destructured_props_with_defaults() {
        let source = r#"
function Panel({ label = "Dynamic panel" }) {
  return (
    <p>{label}</p>
  )
}
"#;
        let graph = analyze_reactivity(source);
        let node = TemplateNode::Expression(ExpressionNode {
            source: "label".to_string(),
            span: None,
        });
        let diags = analyze_semantics(source, &[node], &graph);
        assert!(
            !diags
                .iter()
                .any(|d| d.message.contains("Unknown identifier 'label'"))
        );
    }

    #[test]
    fn validates_bind_target() {
        let graph = analyze_reactivity("let count = $state(0)");
        let node = TemplateNode::Element(ElementNode {
            tag: "input".to_string(),
            directives: vec![DirectiveNode {
                kind: "bind".to_string(),
                name: "value".to_string(),
                expression: Some(ExpressionNode {
                    source: "count + 1".to_string(),
                    span: None,
                }),
                modifiers: vec![],
            }],
            children: vec![],
        });
        let diags = analyze_semantics("<input bind:value={count + 1} />", &[node], &graph);
        assert!(
            diags
                .iter()
                .any(|d| d.message.contains("Invalid bind target"))
        );
    }

    #[test]
    fn detects_unsupported_bind_name() {
        let graph = analyze_reactivity("let count = $state(0)");
        let node = TemplateNode::Element(ElementNode {
            tag: "input".to_string(),
            directives: vec![DirectiveNode {
                kind: "bind".to_string(),
                name: "dataset".to_string(),
                expression: Some(ExpressionNode {
                    source: "count".to_string(),
                    span: None,
                }),
                modifiers: vec![],
            }],
            children: vec![],
        });
        let diags = analyze_semantics("<input bind:dataset={count} />", &[node], &graph);
        assert!(
            diags
                .iter()
                .any(|d| d.message.contains("Unsupported bind directive"))
        );
    }

    #[test]
    fn detects_derived_dependency_cycle() {
        let src = r#"
let a = $derived(b + 1)
let b = $derived(a + 1)
"#;
        let graph = analyze_reactivity(src);
        let diags = analyze_semantics(src, &[], &graph);
        assert!(
            diags
                .iter()
                .any(|d| d.message.contains("Derived dependency cycle detected"))
        );
    }

    #[test]
    fn detects_non_item_key_expression() {
        let graph = analyze_reactivity("let items = $state([]); let id = $state(1)");
        let node = TemplateNode::ForBlock(ForBlock {
            item: "item".to_string(),
            index: None,
            iterable: ExpressionNode {
                source: "items".to_string(),
                span: None,
            },
            key: Some(ExpressionNode {
                source: "id".to_string(),
                span: None,
            }),
            body: vec![],
            empty: None,
        });
        let diags = analyze_semantics("{#for item in items key id}{/for}", &[node], &graph);
        assert!(
            diags
                .iter()
                .any(|d| d.message.contains("must reference loop item"))
        );
    }

    #[test]
    fn detects_side_effect_expression() {
        let graph = analyze_reactivity("let count = $state(0)");
        let node = TemplateNode::Expression(ExpressionNode {
            source: "count++".to_string(),
            span: None,
        });
        let diags = analyze_semantics("{count++}", &[node], &graph);
        assert!(diags.iter().any(|d| d.message.contains("must be pure")));
    }

    #[test]
    fn allows_side_effect_in_event_handler_expression() {
        let graph = analyze_reactivity("let count = $state(0)");
        let node = TemplateNode::Element(ElementNode {
            tag: "button".to_string(),
            directives: vec![DirectiveNode {
                kind: "event".to_string(),
                name: "click".to_string(),
                expression: Some(ExpressionNode {
                    source: "() => count++".to_string(),
                    span: None,
                }),
                modifiers: vec![],
            }],
            children: vec![],
        });
        let diags = analyze_semantics("<button onclick={() => count++} />", &[node], &graph);
        assert!(!diags.iter().any(|d| d.message.contains("must be pure")));
    }

    #[test]
    fn allows_callback_params_inside_for_iterable_expression() {
        let source = "let todos = $state([])\nlet status = $state(\"all\")";
        let graph = analyze_reactivity(source);
        let node = TemplateNode::ForBlock(ForBlock {
            item: "todo".to_string(),
            index: None,
            iterable: ExpressionNode {
                source:
                    "status === \"all\" ? todos : todos.filter((todo) => status === \"done\" ? todo.done : !todo.done)"
                        .to_string(),
                span: None,
            },
            key: Some(ExpressionNode {
                source: "todo.id".to_string(),
                span: None,
            }),
            body: vec![],
            empty: None,
        });
        let diags = analyze_semantics("", &[node], &graph);
        assert!(
            !diags
                .iter()
                .any(|d| d.message.contains("Unknown identifier 'todo'"))
        );
    }
}
