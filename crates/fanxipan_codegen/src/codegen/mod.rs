mod context;
mod emit;

use context::CodegenCtx;
use emit::emit_node;
use fanxipan_analyzer::ReactivityGraph;
use fanxipan_ast::{ComponentAst, TemplateNode};

#[derive(Debug, Clone)]
pub struct GenerateResult {
    pub code: String,
}

pub fn generate_dom_program(
    ast: &ComponentAst,
    graph: &ReactivityGraph,
    scope_class: Option<&str>,
) -> GenerateResult {
    let mut ctx = CodegenCtx::default();
    let mut body = String::new();
    let (needs_class, needs_style) = detect_style_helpers(ast);
    body.push_str("export function create(target, ctx) {\n");
    if needs_class {
        body.push_str("  const __fanxipanNormalizeClass = (value) => {\n");
        body.push_str("    if (value == null || value === false) return '';\n");
        body.push_str("    if (typeof value === 'string') return value.trim();\n");
        body.push_str("    if (Array.isArray(value)) return value.map(__fanxipanNormalizeClass).filter(Boolean).join(' ').trim();\n");
        body.push_str("    if (typeof value === 'object') return Object.keys(value).filter((k) => !!value[k]).join(' ').trim();\n");
        body.push_str("    return String(value);\n");
        body.push_str("  };\n");
        body.push_str("  const __fanxipanApplyClass = (el, value) => {\n");
        body.push_str("    const next = __fanxipanNormalizeClass(value);\n");
        body.push_str("    if (!next) el.removeAttribute('class');\n");
        body.push_str("    else el.setAttribute('class', next);\n");
        body.push_str("  };\n");
    }
    if needs_style {
        body.push_str("  const __fanxipanApplyStyle = (el, value) => {\n");
        body.push_str("    if (value == null || value === false) {\n");
        body.push_str("      el.removeAttribute('style');\n");
        body.push_str("      el.__fanxipanPrevStyleKeys = [];\n");
        body.push_str("      return;\n");
        body.push_str("    }\n");
        body.push_str("    if (typeof value === 'string') {\n");
        body.push_str("      el.setAttribute('style', value);\n");
        body.push_str("      el.__fanxipanPrevStyleKeys = [];\n");
        body.push_str("      return;\n");
        body.push_str("    }\n");
        body.push_str("    if (typeof value === 'object') {\n");
        body.push_str("      const prev = Array.isArray(el.__fanxipanPrevStyleKeys) ? el.__fanxipanPrevStyleKeys : [];\n");
        body.push_str("      const keys = Object.keys(value);\n");
        body.push_str("      for (const k of prev) {\n");
        body.push_str("        if (!Object.prototype.hasOwnProperty.call(value, k)) el.style.removeProperty(k);\n");
        body.push_str("      }\n");
        body.push_str("      for (const k of keys) {\n");
        body.push_str("        const v = value[k];\n");
        body.push_str("        if (v == null || v === false) el.style.removeProperty(k);\n");
        body.push_str("        else el.style.setProperty(k, String(v));\n");
        body.push_str("      }\n");
        body.push_str("      el.__fanxipanPrevStyleKeys = keys;\n");
        body.push_str("      return;\n");
        body.push_str("    }\n");
        body.push_str("    el.setAttribute('style', String(value));\n");
        body.push_str("    el.__fanxipanPrevStyleKeys = [];\n");
        body.push_str("  };\n");
    }
    body.push_str("  const root = document.createDocumentFragment();\n");
    for node in &ast.template.nodes {
        emit_node(node, "root", &mut body, &mut ctx, graph, scope_class);
    }
    body.push_str("  target.appendChild(root);\n");
    body.push_str("  return () => {\n");
    body.push_str("    if (ctx.cleanupAll) ctx.cleanupAll();\n");
    body.push_str("    while (target.firstChild) target.removeChild(target.firstChild);\n");
    body.push_str("  };\n");
    body.push_str("}\n\n");
    body.push_str("export const __fanxipanGraph = ");
    body.push_str(&serialize_edges_js(&graph.edges));
    body.push_str(";\n");

    let mut out = String::new();
    out.push_str("export const __fanxipan_RUNTIME_CONTRACT__ = \"1.0.0\";\n");
    for h in ctx.hoists() {
        out.push_str(h);
    }
    out.push_str(&body);
    GenerateResult { code: out }
}

fn serialize_edges_js(edges: &[(String, String)]) -> String {
    let mut out = String::from("[");
    for (idx, (a, b)) in edges.iter().enumerate() {
        if idx > 0 {
            out.push_str(", ");
        }
        out.push_str(&format!("[{:?}, {:?}]", a, b));
    }
    out.push(']');
    out
}

fn detect_style_helpers(ast: &ComponentAst) -> (bool, bool) {
    fn walk(nodes: &[TemplateNode], class_used: &mut bool, style_used: &mut bool) {
        for node in nodes {
            match node {
                TemplateNode::Element(el) => {
                    for d in &el.directives {
                        if d.kind == "class"
                            || d.kind == "spread"
                            || (d.kind == "attr" && d.name == "class")
                        {
                            *class_used = true;
                        }
                        if d.kind == "style"
                            || d.kind == "spread"
                            || (d.kind == "attr" && d.name == "style")
                        {
                            *style_used = true;
                        }
                    }
                    walk(&el.children, class_used, style_used);
                }
                TemplateNode::Component(c) => walk(&c.children, class_used, style_used),
                TemplateNode::IfBlock(b) => {
                    walk(&b.consequent, class_used, style_used);
                    for e in &b.elif_blocks {
                        walk(&e.consequent, class_used, style_used);
                    }
                    if let Some(e) = &b.else_block {
                        walk(&e.consequent, class_used, style_used);
                    }
                }
                TemplateNode::ForBlock(b) => {
                    walk(&b.body, class_used, style_used);
                    if let Some(e) = &b.empty {
                        walk(&e.body, class_used, style_used);
                    }
                }
                TemplateNode::AwaitBlock(b) => {
                    walk(&b.pending, class_used, style_used);
                    walk(&b.then_body, class_used, style_used);
                    walk(&b.catch_body, class_used, style_used);
                }
                TemplateNode::KeyBlock(b) => walk(&b.body, class_used, style_used),
                TemplateNode::SnippetBlock(b) => walk(&b.body, class_used, style_used),
                _ => {}
            }
        }
    }
    let mut class_used = false;
    let mut style_used = false;
    walk(&ast.template.nodes, &mut class_used, &mut style_used);
    (class_used, style_used)
}
