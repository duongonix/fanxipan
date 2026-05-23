use fanxipan_analyzer::{ReactivityGraph, dependencies_in_expression};

pub fn emit_subscribe_expr(
    out: &mut String,
    patch_stmt: &str,
    expr: &str,
    graph: &ReactivityGraph,
) {
    let deps = deps_for_expr(expr, graph);
    emit_subscribe_deps(out, patch_stmt, &deps);
}

pub fn emit_subscribe_deps(out: &mut String, patch_stmt: &str, deps: &[String]) {
    if deps.is_empty() {
        return;
    }
    let deps_src = deps
        .iter()
        .map(|d| format!("{d:?}"))
        .collect::<Vec<_>>()
        .join(", ");
    out.push_str(&format!(
        "  ctx.subscribeExpr([{deps_src}], () => {{ {patch_stmt} }});\n"
    ));
}

pub fn deps_for_expr(expr: &str, graph: &ReactivityGraph) -> Vec<String> {
    expand_deps(dependencies_in_expression(expr, graph), graph)
}

fn expand_deps(deps: Vec<String>, graph: &ReactivityGraph) -> Vec<String> {
    let mut out = Vec::new();
    for dep in deps {
        if graph.derived.iter().any(|d| d == &dep) {
            let target = format!("derived:{dep}");
            for (from, to) in &graph.edges {
                if to == &target {
                    out.push(from.clone());
                }
            }
        } else {
            out.push(dep);
        }
    }
    out.sort();
    out.dedup();
    out
}
