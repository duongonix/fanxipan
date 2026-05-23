use fanxipan_analyzer::ReactivityGraph;
use fanxipan_ast::DirectiveNode;

use super::subscribe::emit_subscribe_expr;

pub fn emit_directive(
    el_var: &str,
    directive: &DirectiveNode,
    out: &mut String,
    graph: &ReactivityGraph,
    is_element_target: bool,
) {
    let expr = directive
        .expression
        .as_ref()
        .map(|e| e.source.as_str())
        .unwrap_or("true");
    match directive.kind.as_str() {
        "attr" => {
            if directive.name == "class" {
                if is_element_target {
                    out.push_str(&format!("  __fanxipanApplyClass({el_var}, {expr});\n"));
                    emit_subscribe_expr(
                        out,
                        &format!("__fanxipanApplyClass({el_var}, {expr});"),
                        expr,
                        graph,
                    );
                }
            } else if directive.name == "style" {
                if is_element_target {
                    out.push_str(&format!("  __fanxipanApplyStyle({el_var}, {expr});\n"));
                    emit_subscribe_expr(
                        out,
                        &format!("__fanxipanApplyStyle({el_var}, {expr});"),
                        expr,
                        graph,
                    );
                }
            } else {
                if is_element_target {
                    out.push_str(&format!(
                        "  {el_var}.setAttribute({:?}, String({expr}));\n",
                        directive.name
                    ));
                    emit_subscribe_expr(
                        out,
                        &format!(
                            "{el_var}.setAttribute({:?}, String({expr}));",
                            directive.name
                        ),
                        expr,
                        graph,
                    );
                } else {
                    out.push_str(&format!("  {el_var}[{:?}] = {expr};\n", directive.name));
                    emit_subscribe_expr(
                        out,
                        &format!("{el_var}[{:?}] = {expr};", directive.name),
                        expr,
                        graph,
                    );
                }
            }
        }
        "spread" => {
            if is_element_target {
                out.push_str(&format!(
                    "  for (const [__k, __v] of Object.entries({expr} || {{}})) {{ if (__v == null || __v === false) {el_var}.removeAttribute(__k); else if (__k === 'class') __fanxipanApplyClass({el_var}, __v); else if (__k === 'style') __fanxipanApplyStyle({el_var}, __v); else {el_var}.setAttribute(__k, String(__v)); }}\n"
                ));
                emit_subscribe_expr(
                    out,
                    &format!(
                        "for (const [__k, __v] of Object.entries({expr} || {{}})) {{ if (__v == null || __v === false) {el_var}.removeAttribute(__k); else if (__k === 'class') __fanxipanApplyClass({el_var}, __v); else if (__k === 'style') __fanxipanApplyStyle({el_var}, __v); else {el_var}.setAttribute(__k, String(__v)); }}"
                    ),
                    expr,
                    graph,
                );
            }
        }
        "class" => {
            if is_element_target {
                out.push_str(&format!(
                    "  {el_var}.classList.toggle({:?}, !!({expr}));\n",
                    directive.name
                ));
                emit_subscribe_expr(
                    out,
                    &format!(
                        "{el_var}.classList.toggle({:?}, !!({expr}));",
                        directive.name
                    ),
                    expr,
                    graph,
                );
            } else {
                out.push_str(&format!(
                    "  if ({el_var} && {el_var}.classList) {el_var}.classList.toggle({:?}, !!({expr}));\n",
                    directive.name
                ));
                emit_subscribe_expr(
                    out,
                    &format!(
                        "if ({el_var} && {el_var}.classList) {el_var}.classList.toggle({:?}, !!({expr}));",
                        directive.name
                    ),
                    expr,
                    graph,
                );
            }
        }
        "style" => {
            if is_element_target {
                out.push_str(&format!(
                    "  {el_var}.style.setProperty({:?}, String({expr}));\n",
                    directive.name
                ));
                emit_subscribe_expr(
                    out,
                    &format!(
                        "{el_var}.style.setProperty({:?}, String({expr}));",
                        directive.name
                    ),
                    expr,
                    graph,
                );
            } else {
                out.push_str(&format!(
                    "  if ({el_var} && {el_var}.style) {el_var}.style.setProperty({:?}, String({expr}));\n",
                    directive.name
                ));
                emit_subscribe_expr(
                    out,
                    &format!(
                        "if ({el_var} && {el_var}.style) {el_var}.style.setProperty({:?}, String({expr}));",
                        directive.name
                    ),
                    expr,
                    graph,
                );
            }
        }
        "event" => {
            let notify_deps = mutation_targets(expr, graph);
            let handler = emit_event_handler(expr, &directive.modifiers, &notify_deps);
            let once = directive.modifiers.iter().any(|m| m == "once");
            if should_delegate_event(&directive.name, &directive.modifiers) {
                let once_opts = if once { "{ once: true }" } else { "undefined" };
                out.push_str(&format!(
                    "  ctx.onCleanup(ctx.listenDelegated({el_var}, {:?}, {handler}, {once_opts}));\n",
                    directive.name,
                ));
            } else {
                let once_opts = if once { "{ once: true }" } else { "undefined" };
                out.push_str(&format!(
                    "  ctx.onCleanup(ctx.listen({el_var}, {:?}, {handler}, {once_opts}));\n",
                    directive.name,
                ));
            }
        }
        "bind" => {
            let patch_stmt = bind_patch_stmt(el_var, directive.name.as_str(), expr);
            if !patch_stmt.is_empty() {
                out.push_str("  ");
                out.push_str(&patch_stmt);
                out.push('\n');
                emit_subscribe_expr(out, &patch_stmt, expr, graph);
            }
            if is_assignable_target(expr) {
                let notify_stmt = first_identifier(expr)
                    .map(|id| format!(" ctx.notify({id:?});"))
                    .unwrap_or_default();
                if directive.name == "this" {
                    out.push_str(&format!("  {expr} = {el_var};{notify_stmt}\n"));
                    out.push_str(&format!(
                        "  ctx.onCleanup(() => {{ {expr} = null;{notify_stmt} }});\n"
                    ));
                } else if directive.name == "checked" {
                    out.push_str(&format!(
                        "  ctx.onCleanup(ctx.listen({el_var}, 'change', (event) => {{ {expr} = !!event.target.checked;{notify_stmt} }}));\n"
                    ));
                } else if directive.name == "group" {
                    out.push_str(&format!(
                        "  ctx.onCleanup(ctx.listen({el}, 'change', (event) => {{ const __val = event.target.value; if (Array.isArray({expr})) {{ const __next = {expr}.slice(); const __idx = __next.indexOf(__val); if (event.target.checked) {{ if (__idx === -1) __next.push(__val); }} else {{ if (__idx !== -1) __next.splice(__idx, 1); }} {expr} = __next; }} else {{ {expr} = event.target.checked ? __val : null; }}{notify} }}));\n",
                        el = el_var,
                        notify = notify_stmt
                    ));
                } else if directive.name == "files" {
                    out.push_str(&format!(
                        "  ctx.onCleanup(ctx.listen({el}, 'change', (event) => {{ {expr} = event.target.files;{notify} }}));\n",
                        el = el_var,
                        notify = notify_stmt
                    ));
                } else if directive.name == "scrollTop" || directive.name == "scrollLeft" {
                    out.push_str(&format!(
                        "  ctx.onCleanup(ctx.listen({el_var}, 'scroll', () => {{ {expr} = {el_var}.{name};{notify_stmt} }}));\n",
                        name = directive.name
                    ));
                } else if directive.name == "clientWidth" || directive.name == "clientHeight" {
                    out.push_str(&format!(
                        "  if (typeof ResizeObserver !== 'undefined') {{ const __fanxipan_ro = new ResizeObserver(() => {{ {expr} = {el_var}.{name};{notify_stmt} }}); __fanxipan_ro.observe({el_var}); ctx.onCleanup(() => __fanxipan_ro.disconnect()); }}\n",
                        name = directive.name
                    ));
                } else if directive.name == "currentTime" {
                    out.push_str(&format!(
                        "  ctx.onCleanup(ctx.listen({el_var}, 'timeupdate', () => {{ {expr} = {el_var}.currentTime;{notify_stmt} }}));\n"
                    ));
                } else if directive.name == "duration" {
                    out.push_str(&format!(
                        "  ctx.onCleanup(ctx.listen({el_var}, 'durationchange', () => {{ {expr} = {el_var}.duration;{notify_stmt} }}));\n"
                    ));
                } else if directive.name == "paused" {
                    out.push_str(&format!(
                        "  ctx.onCleanup(ctx.listen({el_var}, 'play', () => {{ {expr} = false;{notify_stmt} }}));\n"
                    ));
                    out.push_str(&format!(
                        "  ctx.onCleanup(ctx.listen({el_var}, 'pause', () => {{ {expr} = true;{notify_stmt} }}));\n"
                    ));
                } else {
                    out.push_str(&format!(
                        "  ctx.onCleanup(ctx.listen({el_var}, 'input', (event) => {{ let __next = event.target.{name}; if (event.target && (event.target.type === 'number' || event.target.type === 'range')) {{ __next = event.target.value === '' ? null : Number(event.target.value); }} if (event.target && event.target.tagName === 'SELECT' && event.target.multiple) {{ __next = Array.from(event.target.selectedOptions).map((o) => o.value); }} {expr} = __next;{notify_stmt} }}));\n",
                        name = directive.name
                    ));
                }
            }
        }
        "use" => {
            let action_expr = if let Some(action_arg) = directive.expression.as_ref() {
                format!("{}({el_var}, {})", directive.name, action_arg.source)
            } else {
                format!("{}({el_var})", directive.name)
            };
            out.push_str(&format!(
                "  if (typeof {name} === 'function') {{ const __fanxipan_action = {expr}; if (typeof __fanxipan_action === 'function') ctx.onCleanup(__fanxipan_action); else if (__fanxipan_action && typeof __fanxipan_action.destroy === 'function') ctx.onCleanup(() => __fanxipan_action.destroy()); }}\n",
                name = directive.name,
                expr = action_expr
            ));
        }
        "transition" | "in" | "out" | "animate" => {
            let payload = directive
                .expression
                .as_ref()
                .map(|e| e.source.as_str())
                .unwrap_or("undefined");
            out.push_str(&format!(
                "  if (typeof {name} === 'function') {{ const __fanxipan_fx = {name}({el_var}, {payload}); if (__fanxipan_fx && typeof __fanxipan_fx.in === 'function') __fanxipan_fx.in(); if (__fanxipan_fx && typeof __fanxipan_fx.destroy === 'function') ctx.onCleanup(() => __fanxipan_fx.destroy()); }}\n",
                name = directive.name
            ));
        }
        _ => {}
    }
}

fn bind_patch_stmt(el_var: &str, name: &str, expr: &str) -> String {
    match name {
        "checked" => format!("{el_var}.checked = !!({expr});"),
        "group" => format!(
            "{el}.checked = Array.isArray({expr}) ? {expr}.includes({el}.value) : ({expr}) === {el}.value;",
            el = el_var
        ),
        "files" => String::new(),
        "this" => String::new(),
        "paused" => format!(
            "if ({expr}) {{ {el_var}.pause(); }} else {{ const __p = {el_var}.play(); if (__p && typeof __p.catch === 'function') __p.catch(() => {{}}); }}"
        ),
        "clientWidth" | "clientHeight" | "duration" => format!("{expr} = {el_var}.{name};"),
        _ => format!("{el_var}.{name} = {expr};"),
    }
}

pub fn emit_component_props_object(
    directives: &[DirectiveNode],
    graph: &ReactivityGraph,
) -> String {
    let mut pairs = Vec::new();
    let mut spreads = Vec::new();
    for d in directives {
        if d.kind == "attr" || d.kind == "bind" {
            let value = d
                .expression
                .as_ref()
                .map(|e| e.source.clone())
                .unwrap_or_else(|| "true".to_string());
            let wrapped = wrap_component_prop_value(&value, graph);
            pairs.push(format!("{:?}: {wrapped}", d.name));
        } else if d.kind == "event" {
            let value = d
                .expression
                .as_ref()
                .map(|e| e.source.clone())
                .unwrap_or_else(|| "(() => {})".to_string());
            let wrapped = wrap_component_prop_value(&value, graph);
            let key = format!("on{}", capitalize_first(&d.name));
            pairs.push(format!("{key:?}: {wrapped}"));
        } else if d.kind == "spread" {
            let value = d
                .expression
                .as_ref()
                .map(|e| e.source.clone())
                .unwrap_or_else(|| "{}".to_string());
            spreads.push(format!("({value} || {{}})"));
        }
    }
    if spreads.is_empty() {
        format!("{{ {} }}", pairs.join(", "))
    } else if pairs.is_empty() {
        format!("Object.assign({{}}, {})", spreads.join(", "))
    } else {
        format!(
            "Object.assign({{}}, {}, {{ {} }})",
            spreads.join(", "),
            pairs.join(", ")
        )
    }
}

fn capitalize_first(name: &str) -> String {
    let mut chars = name.chars();
    let Some(first) = chars.next() else {
        return String::new();
    };
    format!("{}{}", first.to_ascii_uppercase(), chars.as_str())
}

fn wrap_component_prop_value(value: &str, graph: &ReactivityGraph) -> String {
    let deps = mutation_targets(value, graph);
    if deps.is_empty() {
        return value.to_string();
    }
    let deps_src = deps
        .iter()
        .map(|d| format!("{d:?}"))
        .collect::<Vec<_>>()
        .join(", ");
    let call = if looks_like_function_expression(value) {
        format!("({value})(event);")
    } else {
        format!("{value}(event);")
    };
    format!("(event) => {{ {call} if (ctx.notifyMany) ctx.notifyMany([{deps_src}]); }}")
}

fn emit_event_handler(expr: &str, modifiers: &[String], notify_deps: &[String]) -> String {
    let expr = expr.trim();
    let mut body = String::new();
    if modifiers.iter().any(|m| m == "preventDefault") {
        body.push_str("event.preventDefault(); ");
    }
    if modifiers.iter().any(|m| m == "stopPropagation") {
        body.push_str("event.stopPropagation(); ");
    }
    if looks_like_function_expression(expr) {
        body.push_str(&format!("({expr})(event);"));
    } else {
        body.push_str(&format!("{expr}(event);"));
    }
    if !notify_deps.is_empty() {
        let deps = notify_deps
            .iter()
            .map(|d| format!("{d:?}"))
            .collect::<Vec<_>>()
            .join(", ");
        body.push_str(&format!(" if (ctx.notifyMany) ctx.notifyMany([{deps}]);"));
    } else if looks_like_function_expression(expr) {
        body.push_str(" if (ctx.flushAll) ctx.flushAll();");
    }
    format!("(event) => {{ {body} }}")
}

fn looks_like_function_expression(expr: &str) -> bool {
    expr.contains("=>")
        || expr.starts_with("function")
        || (expr.starts_with('(') && expr.ends_with(')'))
}

fn should_delegate_event(name: &str, modifiers: &[String]) -> bool {
    if modifiers.iter().any(|m| m == "capture") {
        return false;
    }
    matches!(
        name,
        "click" | "input" | "change" | "submit" | "keydown" | "keyup" | "focusin" | "focusout"
    )
}

fn is_assignable_target(expr: &str) -> bool {
    let expr = expr.trim();
    if expr.is_empty() {
        return false;
    }
    if expr.contains('(')
        || expr.contains(')')
        || expr.contains('+')
        || expr.contains('-')
        || expr.contains('*')
        || expr.contains('/')
        || expr.contains('=')
        || expr.contains(';')
        || expr.contains('?')
        || expr.contains(':')
    {
        return false;
    }
    true
}

fn mutation_targets(expr: &str, graph: &ReactivityGraph) -> Vec<String> {
    let mut out = Vec::new();

    if let Some(handler) = first_identifier(expr) {
        if let Some((_, deps)) = graph
            .handler_mutations
            .iter()
            .find(|(name, _)| name == &handler)
        {
            out.extend(deps.clone());
        }
    }

    for handler in called_identifiers(expr) {
        if let Some((_, deps)) = graph
            .handler_mutations
            .iter()
            .find(|(name, _)| name == &handler)
        {
            out.extend(deps.clone());
        }
    }

    for state in &graph.states {
        if is_mutated_symbol(expr, state) {
            out.push(state.clone());
        }
    }

    let derived = derived_from_states(&out, graph);
    out.extend(derived);
    out.sort();
    out.dedup();
    out
}

fn called_identifiers(expr: &str) -> Vec<String> {
    let mut out = Vec::new();
    let bytes = expr.as_bytes();
    let mut i = 0usize;
    while i < bytes.len() {
        let ch = bytes[i] as char;
        if ch == '_' || ch == '$' || ch.is_ascii_alphabetic() {
            let start = i;
            i += 1;
            while i < bytes.len() {
                let c = bytes[i] as char;
                if c == '_' || c == '$' || c.is_ascii_alphanumeric() {
                    i += 1;
                } else {
                    break;
                }
            }
            let ident = &expr[start..i];
            let mut j = i;
            while j < bytes.len() && (bytes[j] as char).is_ascii_whitespace() {
                j += 1;
            }
            if j < bytes.len() && bytes[j] as char == '(' {
                out.push(ident.to_string());
            }
            i = j;
            continue;
        }
        i += 1;
    }
    out.sort();
    out.dedup();
    out
}

fn derived_from_states(states: &[String], graph: &ReactivityGraph) -> Vec<String> {
    let mut out = Vec::new();
    for (from, to) in &graph.edges {
        if states.iter().any(|s| s == from) && to.starts_with("derived:") {
            out.push(to.trim_start_matches("derived:").to_string());
        }
    }
    out
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

fn first_identifier(expr: &str) -> Option<String> {
    let trimmed = expr.trim();
    let mut out = String::new();
    for ch in trimmed.chars() {
        if out.is_empty() {
            if ch == '_' || ch == '$' || ch.is_ascii_alphabetic() {
                out.push(ch);
            } else {
                return None;
            }
        } else if ch == '_' || ch == '$' || ch.is_ascii_alphanumeric() {
            out.push(ch);
        } else {
            break;
        }
    }
    if out.is_empty() { None } else { Some(out) }
}
