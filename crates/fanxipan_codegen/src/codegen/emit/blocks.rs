use crate::codegen::context::CodegenCtx;
use fanxipan_analyzer::ReactivityGraph;
use fanxipan_ast::{AwaitBlock, ForBlock, IfBlock, KeyBlock};

use super::{node::emit_node, subscribe::emit_subscribe_expr};

pub fn emit_if_block(
    block: &IfBlock,
    parent: &str,
    out: &mut String,
    ctx: &mut CodegenCtx,
    graph: &ReactivityGraph,
    scope_class: Option<&str>,
) {
    if let Some(v) = const_bool_expr(&block.condition.source) {
        if v {
            for child in &block.consequent {
                emit_node(child, parent, out, ctx, graph, scope_class);
            }
            return;
        }
        for elif in &block.elif_blocks {
            if let Some(ev) = const_bool_expr(&elif.condition.source) {
                if ev {
                    for child in &elif.consequent {
                        emit_node(child, parent, out, ctx, graph, scope_class);
                    }
                    return;
                }
                continue;
            }
            break;
        }
        if let Some(else_block) = &block.else_block {
            for child in &else_block.consequent {
                emit_node(child, parent, out, ctx, graph, scope_class);
            }
            return;
        }
    }
    let start = ctx.next("if_start");
    let end = ctx.next("if_end");
    let current = ctx.next("if_current");
    let render_if = ctx.next("render_if");
    out.push_str(&format!(
        "  const {start} = document.createComment('if:start');\n"
    ));
    out.push_str(&format!(
        "  const {end} = document.createComment('if:end');\n"
    ));
    out.push_str(&format!("  {parent}.appendChild({start});\n"));
    out.push_str(&format!("  {parent}.appendChild({end});\n"));
    out.push_str(&format!("  let {current} = -999;\n"));
    out.push_str(&format!("  const {render_if} = () => {{\n"));
    out.push_str("    let __next = -1;\n");
    out.push_str(&format!(
        "    if ({}) __next = 0;\n",
        block.condition.source
    ));
    for (idx, elif) in block.elif_blocks.iter().enumerate() {
        out.push_str(&format!(
            "    else if ({}) __next = {};\n",
            elif.condition.source,
            idx + 1
        ));
    }
    if block.else_block.is_some() {
        out.push_str(&format!(
            "    else __next = {};\n",
            block.elif_blocks.len() + 1
        ));
    }
    out.push_str(&format!("    if (__next === {current}) return;\n"));
    out.push_str(&format!("    {current} = __next;\n"));
    out.push_str(&format!("    let n = {start}.nextSibling;\n"));
    out.push_str(&format!(
        "    while (n && n !== {end}) {{ const next = n.nextSibling; n.parentNode.removeChild(n); n = next; }}\n"
    ));
    out.push_str("    const frag = document.createDocumentFragment();\n");
    out.push_str("    if (__next === 0) {\n");
    for child in &block.consequent {
        emit_node(child, "frag", out, ctx, graph, scope_class);
    }
    out.push_str("    }\n");
    for (idx, elif) in block.elif_blocks.iter().enumerate() {
        out.push_str(&format!("    else if (__next === {}) {{\n", idx + 1));
        for child in &elif.consequent {
            emit_node(child, "frag", out, ctx, graph, scope_class);
        }
        out.push_str("    }\n");
    }
    if let Some(else_block) = &block.else_block {
        out.push_str("    else {\n");
        for child in &else_block.consequent {
            emit_node(child, "frag", out, ctx, graph, scope_class);
        }
        out.push_str("    }\n");
    }
    out.push_str(&format!(
        "    {end}.parentNode.insertBefore(frag, {end});\n"
    ));
    out.push_str("  };\n");
    out.push_str(&format!("  {render_if}();\n"));
    emit_subscribe_expr(out, &format!("{render_if}();"), &block.condition.source, graph);
}

pub fn emit_for_block(
    block: &ForBlock,
    parent: &str,
    out: &mut String,
    ctx: &mut CodegenCtx,
    graph: &ReactivityGraph,
    scope_class: Option<&str>,
) {
    let start = ctx.next("for_start");
    let end = ctx.next("for_end");
    let rows = ctx.next("for_rows");
    let clear_between = ctx.next("for_clear_between");
    let render_for = ctx.next("render_for");
    out.push_str(&format!(
        "  const {start} = document.createComment('for:start');\n"
    ));
    out.push_str(&format!(
        "  const {end} = document.createComment('for:end');\n"
    ));
    out.push_str(&format!("  {parent}.appendChild({start});\n"));
    out.push_str(&format!("  {parent}.appendChild({end});\n"));
    out.push_str(&format!("  let {rows} = new Map();\n"));
    out.push_str(&format!("  const {clear_between} = (start, end) => {{\n"));
    out.push_str("    let n = start.nextSibling;\n");
    out.push_str("    while (n && n !== end) { const next = n.nextSibling; n.parentNode.removeChild(n); n = next; }\n");
    out.push_str("  };\n");
    out.push_str("  const moveRangeBefore = (startNode, endNode, beforeNode) => {\n");
    out.push_str("    const frag = document.createDocumentFragment();\n");
    out.push_str("    let n = startNode;\n");
    out.push_str("    while (n) {\n");
    out.push_str("      const next = n.nextSibling;\n");
    out.push_str("      frag.appendChild(n);\n");
    out.push_str("      if (n === endNode) break;\n");
    out.push_str("      n = next;\n");
    out.push_str("    }\n");
    out.push_str("    beforeNode.parentNode.insertBefore(frag, beforeNode);\n");
    out.push_str("  };\n");
    out.push_str(&format!("  const {render_for} = () => {{\n"));
    out.push_str(&format!(
        "    const list = {} ?? [];\n",
        block.iterable.source
    ));
    if block.key.is_none() {
        out.push_str(&format!("    {clear_between}({start}, {end});\n"));
        out.push_str("    if (list.length === 0) {\n");
        if let Some(empty) = &block.empty {
            out.push_str("      const emptyFrag = document.createDocumentFragment();\n");
            for child in &empty.body {
                emit_node(child, "emptyFrag", out, ctx, graph, scope_class);
            }
            out.push_str(&format!(
                "      {end}.parentNode.insertBefore(emptyFrag, {end});\n"
            ));
        }
        out.push_str("      return;\n");
        out.push_str("    }\n");
        out.push_str("    const listFrag = document.createDocumentFragment();\n");
        out.push_str(&format!(
            "    for (let __i = 0; __i < list.length; __i++) {{ const {} = list[__i];\n",
            block.item
        ));
        if let Some(index) = &block.index {
            out.push_str(&format!("      const {index} = __i;\n"));
        }
        for child in &block.body {
            emit_node(child, "listFrag", out, ctx, graph, scope_class);
        }
        out.push_str("    }\n");
        out.push_str(&format!(
            "    {end}.parentNode.insertBefore(listFrag, {end});\n"
        ));
        out.push_str("  };\n");
        out.push_str(&format!("  {render_for}();\n"));
        emit_subscribe_expr(out, &format!("{render_for}();"), &block.iterable.source, graph);
        return;
    }

    let key_expr = block
        .key
        .as_ref()
        .map(|k| k.source.as_str())
        .unwrap_or("__i");
    out.push_str("    if (list.length === 0) {\n");
    out.push_str(&format!("      {clear_between}({start}, {end});\n"));
    out.push_str(&format!("      {rows} = new Map();\n"));
    if let Some(empty) = &block.empty {
        out.push_str("      const emptyFrag = document.createDocumentFragment();\n");
        for child in &empty.body {
            emit_node(child, "emptyFrag", out, ctx, graph, scope_class);
        }
        out.push_str(&format!(
            "      {end}.parentNode.insertBefore(emptyFrag, {end});\n"
        ));
    }
    out.push_str("      return;\n");
    out.push_str("    }\n");
    out.push_str("    const nextRows = new Map();\n");
    out.push_str(&format!(
        "    for (let __i = 0; __i < list.length; __i++) {{ const {} = list[__i];\n",
        block.item
    ));
    if let Some(index) = &block.index {
        out.push_str(&format!("      const {index} = __i;\n"));
    }
    out.push_str(&format!("      const __key = {key_expr};\n"));
    out.push_str("      if (nextRows.has(__key)) continue;\n");
    out.push_str(&format!("      const __prev = {rows}.get(__key);\n"));
    out.push_str("      if (__prev) {\n");
    out.push_str("        let n = __prev.start;\n");
    out.push_str("        while (n) { const next = n.nextSibling; n.parentNode.removeChild(n); if (n === __prev.end) break; n = next; }\n");
    out.push_str("      }\n");
    out.push_str("      const __rowStart = document.createComment('for:item:start');\n");
    out.push_str("      const __rowEnd = document.createComment('for:item:end');\n");
    out.push_str("      const __rowFrag = document.createDocumentFragment();\n");
    out.push_str("      __rowFrag.appendChild(__rowStart);\n");
    for child in &block.body {
        emit_node(child, "__rowFrag", out, ctx, graph, scope_class);
    }
    out.push_str("      __rowFrag.appendChild(__rowEnd);\n");
    out.push_str(&format!(
        "      {end}.parentNode.insertBefore(__rowFrag, {end});\n"
    ));
    out.push_str("      const __row = { start: __rowStart, end: __rowEnd };\n");
    out.push_str("      nextRows.set(__key, __row);\n");
    out.push_str("    }\n");
    out.push_str(&format!(
        "    for (const [__oldKey, __oldRow] of {rows}.entries()) {{ if (!nextRows.has(__oldKey)) {{ let n = __oldRow.start; while (n) {{ const next = n.nextSibling; n.parentNode.removeChild(n); if (n === __oldRow.end) break; n = next; }} }} }}\n"
    ));
    out.push_str(&format!("    {rows} = nextRows;\n"));
    out.push_str("  };\n");
    out.push_str(&format!("  {render_for}();\n"));
    emit_subscribe_expr(out, &format!("{render_for}();"), &block.iterable.source, graph);
}

fn const_bool_expr(expr: &str) -> Option<bool> {
    match expr.trim() {
        "true" => Some(true),
        "false" => Some(false),
        _ => None,
    }
}

pub fn emit_key_block(
    block: &KeyBlock,
    parent: &str,
    out: &mut String,
    ctx: &mut CodegenCtx,
    graph: &ReactivityGraph,
    scope_class: Option<&str>,
) {
    let start = ctx.next("key_start");
    let end = ctx.next("key_end");
    let current_key = ctx.next("key_current");
    out.push_str(&format!(
        "  const {start} = document.createComment('key:start');\n"
    ));
    out.push_str(&format!(
        "  const {end} = document.createComment('key:end');\n"
    ));
    out.push_str(&format!("  {parent}.appendChild({start});\n"));
    out.push_str(&format!("  {parent}.appendChild({end});\n"));
    out.push_str(&format!("  let {current_key} = Symbol('key:init');\n"));
    out.push_str("  const renderKey = () => {\n");
    out.push_str(&format!(
        "    const __nextKey = ({});\n",
        block.expression.source
    ));
    out.push_str(&format!("    if (__nextKey === {current_key}) return;\n"));
    out.push_str(&format!("    {current_key} = __nextKey;\n"));
    out.push_str(&format!("    let n = {start}.nextSibling;\n"));
    out.push_str(&format!(
        "    while (n && n !== {end}) {{ const next = n.nextSibling; n.parentNode.removeChild(n); n = next; }}\n"
    ));
    out.push_str("    const frag = document.createDocumentFragment();\n");
    for child in &block.body {
        emit_node(child, "frag", out, ctx, graph, scope_class);
    }
    out.push_str(&format!(
        "    {end}.parentNode.insertBefore(frag, {end});\n"
    ));
    out.push_str("  };\n");
    out.push_str("  renderKey();\n");
    emit_subscribe_expr(out, "renderKey();", &block.expression.source, graph);
}

pub fn emit_await_block(
    block: &AwaitBlock,
    parent: &str,
    out: &mut String,
    ctx: &mut CodegenCtx,
    graph: &ReactivityGraph,
    scope_class: Option<&str>,
) {
    let start = ctx.next("await_start");
    let end = ctx.next("await_end");
    let token = ctx.next("await_token");
    out.push_str(&format!(
        "  const {start} = document.createComment('await:start');\n"
    ));
    out.push_str(&format!(
        "  const {end} = document.createComment('await:end');\n"
    ));
    out.push_str(&format!("  {parent}.appendChild({start});\n"));
    out.push_str(&format!("  {parent}.appendChild({end});\n"));
    out.push_str(&format!("  let {token} = 0;\n"));
    out.push_str("  const renderAwaitPending = () => {\n");
    out.push_str(&format!("    let n = {start}.nextSibling;\n"));
    out.push_str(&format!(
        "    while (n && n !== {end}) {{ const next = n.nextSibling; n.parentNode.removeChild(n); n = next; }}\n"
    ));
    out.push_str("    const frag = document.createDocumentFragment();\n");
    for child in &block.pending {
        emit_node(child, "frag", out, ctx, graph, scope_class);
    }
    out.push_str(&format!(
        "    {end}.parentNode.insertBefore(frag, {end});\n"
    ));
    out.push_str("  };\n");
    out.push_str("  const runAwait = () => {\n");
    out.push_str(&format!("    const __v = ++{token};\n"));
    out.push_str("    renderAwaitPending();\n");
    out.push_str("    Promise.resolve(");
    out.push_str(&block.promise.source);
    out.push_str(").then((__data) => {\n");
    out.push_str(&format!("      if (__v !== {token}) return;\n"));
    out.push_str(&format!("      let n = {start}.nextSibling;\n"));
    out.push_str(&format!(
        "      while (n && n !== {end}) {{ const next = n.nextSibling; n.parentNode.removeChild(n); n = next; }}\n"
    ));
    out.push_str("      const frag = document.createDocumentFragment();\n");
    if let Some(then_name) = &block.then_name {
        out.push_str(&format!("      const {then_name} = __data;\n"));
    }
    for child in &block.then_body {
        emit_node(child, "frag", out, ctx, graph, scope_class);
    }
    out.push_str(&format!(
        "      {end}.parentNode.insertBefore(frag, {end});\n"
    ));
    out.push_str("    }).catch((__err) => {\n");
    out.push_str(&format!("      if (__v !== {token}) return;\n"));
    out.push_str(&format!("      let n = {start}.nextSibling;\n"));
    out.push_str(&format!(
        "      while (n && n !== {end}) {{ const next = n.nextSibling; n.parentNode.removeChild(n); n = next; }}\n"
    ));
    out.push_str("      const frag = document.createDocumentFragment();\n");
    if let Some(catch_name) = &block.catch_name {
        out.push_str(&format!("      const {catch_name} = __err;\n"));
    }
    for child in &block.catch_body {
        emit_node(child, "frag", out, ctx, graph, scope_class);
    }
    out.push_str(&format!(
        "      {end}.parentNode.insertBefore(frag, {end});\n"
    ));
    out.push_str("    });\n");
    out.push_str("  };\n");
    out.push_str("  runAwait();\n");
    emit_subscribe_expr(out, "runAwait();", &block.promise.source, graph);
}
