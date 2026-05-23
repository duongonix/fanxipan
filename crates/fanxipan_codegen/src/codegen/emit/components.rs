use crate::codegen::context::CodegenCtx;
use fanxipan_analyzer::ReactivityGraph;
use fanxipan_ast::ComponentNode;

use super::{directives::emit_component_props_object, node::emit_node};

pub fn emit_component_node(
    component: &ComponentNode,
    parent: &str,
    out: &mut String,
    ctx: &mut CodegenCtx,
    graph: &ReactivityGraph,
    scope_class: Option<&str>,
) {
    let host = ctx.next("cmp_host");
    let props = ctx.next("cmp_props");
    let children_factory = ctx.next("cmp_children");
    out.push_str(&format!(
        "  const {host} = document.createComment('component:{}');\n",
        component.name
    ));
    out.push_str(&format!("  {parent}.appendChild({host});\n"));
    out.push_str(&format!(
        "  const {props} = {};\n",
        emit_component_props_object(&component.directives, graph)
    ));
    out.push_str(&format!(
        "  const {children_factory} = () => {{ const frag = document.createDocumentFragment();"
    ));
    for child in &component.children {
        emit_node(child, "frag", out, ctx, graph, scope_class);
    }
    out.push_str(" return frag; };\n");
    let component_expr = if component.name == "component" {
        component
            .directives
            .iter()
            .find(|d| d.kind == "attr" && d.name == "this")
            .and_then(|d| d.expression.as_ref())
            .map(|e| e.source.clone())
            .unwrap_or_else(|| "undefined".to_string())
    } else {
        component.name.clone()
    };
    out.push_str(&format!(
        "  ctx.mountComponent({component_expr}, {host}, {props}, {children_factory});\n"
    ));
}
