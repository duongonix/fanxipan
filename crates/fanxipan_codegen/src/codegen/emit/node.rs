use super::{
    blocks::{emit_await_block, emit_for_block, emit_if_block, emit_key_block},
    components::emit_component_node,
    directives::emit_directive,
    subscribe::{deps_for_expr, emit_subscribe_deps, emit_subscribe_expr},
};
use crate::codegen::context::CodegenCtx;
use fanxipan_analyzer::ReactivityGraph;
use fanxipan_ast::{DirectiveNode, TemplateNode};

pub fn emit_node(
    node: &TemplateNode,
    parent: &str,
    out: &mut String,
    ctx: &mut CodegenCtx,
    graph: &ReactivityGraph,
    scope_class: Option<&str>,
) {
    match node {
        TemplateNode::Element(el) => {
            if is_head_target_tag(&el.tag) {
                let head_frag = ctx.next("head_frag");
                let head_nodes = ctx.next("head_nodes");
                out.push_str(&format!(
                    "  const {head_frag} = document.createDocumentFragment();\n"
                ));
                for child in &el.children {
                    emit_node(child, &head_frag, out, ctx, graph, scope_class);
                }
                out.push_str(&format!(
                    "  const {head_nodes} = Array.from({head_frag}.childNodes);\n"
                ));
                out.push_str(&format!(
                    "  for (const __n of {head_nodes}) document.head.appendChild(__n);\n"
                ));
                out.push_str(&format!(
                    "  ctx.onCleanup(() => {{ for (const __n of {head_nodes}) if (__n.parentNode === document.head) document.head.removeChild(__n); }});\n"
                ));
                return;
            }
            if let Some(target_expr) = special_event_target_expr(&el.tag) {
                let target = ctx.next("special_target");
                out.push_str(&format!("  const {target} = {target_expr};\n"));
                for directive in &el.directives {
                    emit_directive(&target, directive, out, graph, false);
                }
                return;
            }
            if el.tag == "slot" {
                out.push_str("  if (typeof children === 'function') {\n");
                out.push_str("    const __slot = children();\n");
                out.push_str(
                    "    if (__slot && __slot.childNodes && __slot.childNodes.length > 0) {\n",
                );
                out.push_str(&format!("      {parent}.appendChild(__slot);\n"));
                out.push_str("    }\n");
                out.push_str("  }\n");
                return;
            }
            if let Some(html) = build_static_html_element(node, scope_class) {
                let tpl = ctx.register_static_template(&html);
                out.push_str(&format!(
                    "  {parent}.appendChild({tpl}.content.cloneNode(true));\n"
                ));
                return;
            }
            let el_var = ctx.next("el");
            out.push_str(&format!(
                "  const {el_var} = document.createElement({:?});\n",
                el.tag
            ));
            out.push_str(&format!("  {parent}.appendChild({el_var});\n"));
            if let Some(scope) = scope_class {
                out.push_str(&format!("  ctx.applyScopedClass({el_var}, {:?});\n", scope));
            }
            for directive in &el.directives {
                emit_directive(&el_var, directive, out, graph, true);
            }
            for child in &el.children {
                emit_node(child, &el_var, out, ctx, graph, scope_class);
            }
        }
        TemplateNode::Text(text) => {
            let t = ctx.next("text");
            out.push_str(&format!(
                "  const {t} = document.createTextNode({:?});\n",
                text.value
            ));
            out.push_str(&format!("  {parent}.appendChild({t});\n"));
        }
        TemplateNode::Expression(expr) => {
            let t = ctx.next("text");
            out.push_str(&format!(
                "  const {t} = document.createTextNode(String({}));\n",
                expr.source
            ));
            out.push_str(&format!("  {parent}.appendChild({t});\n"));
            emit_subscribe_expr(
                out,
                &format!("{t}.data = String({});", expr.source),
                &expr.source,
                graph,
            );
        }
        TemplateNode::IfBlock(block) => emit_if_block(block, parent, out, ctx, graph, scope_class),
        TemplateNode::ForBlock(block) => {
            emit_for_block(block, parent, out, ctx, graph, scope_class)
        }
        TemplateNode::AwaitBlock(block) => {
            emit_await_block(block, parent, out, ctx, graph, scope_class)
        }
        TemplateNode::KeyBlock(block) => {
            emit_key_block(block, parent, out, ctx, graph, scope_class)
        }
        TemplateNode::SnippetBlock(block) => {
            let snippet_fn = block.name.clone();
            let params = block.params.join(", ");
            out.push_str(&format!("  function {snippet_fn}({params}) {{\n"));
            out.push_str("    const frag = document.createDocumentFragment();\n");
            for child in &block.body {
                emit_node(child, "frag", out, ctx, graph, scope_class);
            }
            out.push_str("    return frag;\n");
            out.push_str("  }\n");
        }
        TemplateNode::RenderBlock(block) => {
            let start = ctx.next("render_start");
            let end = ctx.next("render_end");
            out.push_str(&format!(
                "  const {start} = document.createComment('render:start');\n"
            ));
            out.push_str(&format!(
                "  const {end} = document.createComment('render:end');\n"
            ));
            out.push_str(&format!("  {parent}.appendChild({start});\n"));
            out.push_str(&format!("  {parent}.appendChild({end});\n"));
            out.push_str("  const renderSnippet = () => {\n");
            out.push_str(&format!("    let n = {start}.nextSibling;\n"));
            out.push_str(&format!(
                "    while (n && n !== {end}) {{ const next = n.nextSibling; n.parentNode.removeChild(n); n = next; }}\n"
            ));
            out.push_str(&format!("    const __renderTarget = {};\n", block.target));
            out.push_str("    if (typeof __renderTarget !== 'function') return;\n");
            let args = block
                .args
                .iter()
                .map(|arg| arg.source.as_str())
                .collect::<Vec<_>>()
                .join(", ");
            out.push_str(&format!("    const __rendered = __renderTarget({args});\n"));
            out.push_str("    if (__rendered) {\n");
            out.push_str(&format!(
                "      {end}.parentNode.insertBefore(__rendered, {end});\n"
            ));
            out.push_str("    }\n");
            out.push_str("  };\n");
            out.push_str("  renderSnippet();\n");
            let mut deps = deps_for_expr(&block.target, graph);
            for arg in &block.args {
                deps.extend(deps_for_expr(&arg.source, graph));
            }
            deps.sort();
            deps.dedup();
            emit_subscribe_deps(out, "renderSnippet();", &deps);
        }
        TemplateNode::Component(component) => {
            emit_component_node(component, parent, out, ctx, graph, scope_class)
        }
    }
}

fn is_head_target_tag(tag: &str) -> bool {
    tag == "head"
}

fn special_event_target_expr(tag: &str) -> Option<&'static str> {
    match tag {
        "window" => Some("window"),
        "document" => Some("document"),
        "body" => Some("document.body"),
        _ => None,
    }
}

fn build_static_html_element(node: &TemplateNode, scope_class: Option<&str>) -> Option<String> {
    let TemplateNode::Element(el) = node else {
        return None;
    };
    if el.tag == "slot"
        || is_head_target_tag(&el.tag)
        || special_event_target_expr(&el.tag).is_some()
    {
        return None;
    }
    let mut attrs: Vec<(String, String)> = Vec::new();
    for d in &el.directives {
        if d.kind != "attr" {
            return None;
        }
        let value = static_attr_value(d)?;
        attrs.push((d.name.clone(), value));
    }
    if let Some(scope) = scope_class {
        let mut has_class = false;
        for (k, v) in &mut attrs {
            if k == "class" {
                has_class = true;
                if v.is_empty() {
                    *v = scope.to_string();
                } else {
                    *v = format!("{v} {scope}");
                }
            }
        }
        if !has_class {
            attrs.push(("class".to_string(), scope.to_string()));
        }
    }
    let mut html = String::new();
    html.push('<');
    html.push_str(&el.tag);
    for (k, v) in attrs {
        html.push(' ');
        html.push_str(&k);
        html.push_str("=\"");
        html.push_str(&escape_html(&v));
        html.push('"');
    }
    html.push('>');
    for child in &el.children {
        match child {
            TemplateNode::Text(t) => html.push_str(&escape_html(&t.value)),
            TemplateNode::Expression(expr) => {
                let lit = static_text_expr_value(&expr.source)?;
                html.push_str(&escape_html(&lit));
            }
            TemplateNode::Element(_) => html.push_str(&build_static_html_element(child, None)?),
            _ => return None,
        }
    }
    html.push_str("</");
    html.push_str(&el.tag);
    html.push('>');
    Some(html)
}

fn static_attr_value(d: &DirectiveNode) -> Option<String> {
    let Some(expr) = d.expression.as_ref() else {
        return Some("true".to_string());
    };
    let src = expr.source.trim();
    if (src.starts_with('"') && src.ends_with('"'))
        || (src.starts_with('\'') && src.ends_with('\''))
    {
        return Some(src[1..src.len().saturating_sub(1)].to_string());
    }
    if src == "true" || src == "false" || src.parse::<f64>().is_ok() {
        return Some(src.to_string());
    }
    None
}

fn static_text_expr_value(expr: &str) -> Option<String> {
    let src = expr.trim();
    if (src.starts_with('"') && src.ends_with('"'))
        || (src.starts_with('\'') && src.ends_with('\''))
    {
        return Some(src[1..src.len().saturating_sub(1)].to_string());
    }
    if src == "true" || src == "false" || src.parse::<f64>().is_ok() {
        return Some(src.to_string());
    }
    None
}

fn escape_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}
