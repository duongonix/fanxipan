use super::types::{TemplateParseError, TemplateParseOutput};
use super::utils::{consume, is_element_start, skip_spaces, split_once, starts_with_any};
use fanxipan_ast::{
    AwaitBlock, ComponentNode, DirectiveNode, ElementNode, ElifBlock, ElseBlock, EmptyBlock,
    ExpressionNode, ForBlock, IfBlock, KeyBlock, RenderBlock, SnippetBlock, Span, TemplateAst,
    TemplateNode, TextNode,
};

pub fn parse_template(source: &str) -> TemplateParseOutput {
    let mut cursor = 0usize;
    let nodes = parse_nodes(source, &mut cursor, &[], None);
    let errors = collect_template_errors(source);
    TemplateParseOutput {
        ast: TemplateAst { nodes },
        errors,
    }
}

fn parse_nodes(
    source: &str,
    cursor: &mut usize,
    stops: &[&str],
    closing_tag: Option<&str>,
) -> Vec<TemplateNode> {
    let mut nodes = Vec::new();
    while *cursor < source.len() {
        if starts_with_any(source, *cursor, stops) {
            break;
        }
        if let Some(tag) = closing_tag {
            let close = format!("</{tag}>");
            if source[*cursor..].starts_with(&close) {
                break;
            }
        }
        if source[*cursor..].starts_with("</") {
            break;
        }
        if source[*cursor..].starts_with("{#if ") {
            nodes.push(TemplateNode::IfBlock(parse_if_block(source, cursor)));
            continue;
        }
        if source[*cursor..].starts_with("{#for ") {
            nodes.push(TemplateNode::ForBlock(parse_for_block(source, cursor)));
            continue;
        }
        if source[*cursor..].starts_with("{#await ") {
            nodes.push(TemplateNode::AwaitBlock(parse_await_block(source, cursor)));
            continue;
        }
        if source[*cursor..].starts_with("{#key ") {
            nodes.push(TemplateNode::KeyBlock(parse_key_block(source, cursor)));
            continue;
        }
        if source[*cursor..].starts_with("{#snippet ") {
            nodes.push(TemplateNode::SnippetBlock(parse_snippet_block(
                source, cursor,
            )));
            continue;
        }
        if source[*cursor..].starts_with("{@render ") {
            nodes.push(TemplateNode::RenderBlock(parse_render_block(
                source, cursor,
            )));
            continue;
        }
        if source[*cursor..].starts_with('<')
            && !source[*cursor..].starts_with("</")
            && is_element_start(source, *cursor + 1)
        {
            nodes.push(parse_tag_node(source, cursor));
            continue;
        }
        if source[*cursor..].starts_with('{') {
            if let Some((expr, span)) = read_braced(source, cursor) {
                nodes.push(TemplateNode::Expression(expr_node(expr, Some(span))));
                continue;
            }
            *cursor += 1;
            continue;
        }
        let text = read_until_control(source, cursor, stops, closing_tag);
        if !text.trim().is_empty() {
            nodes.push(TemplateNode::Text(TextNode { value: text }));
        }
    }
    nodes
}

fn parse_tag_node(source: &str, cursor: &mut usize) -> TemplateNode {
    consume(source, cursor, "<");
    let tag = read_tag_name(source, cursor);
    let directives = parse_directives(source, cursor);
    let self_closing = consume_tag_end(source, cursor);
    if self_closing {
        return wrap_tag_node(tag, directives, vec![]);
    }
    let children = parse_nodes(source, cursor, &[], Some(&tag));
    consume(source, cursor, &format!("</{tag}>"));
    wrap_tag_node(tag, directives, children)
}

fn wrap_tag_node(
    tag: String,
    directives: Vec<DirectiveNode>,
    children: Vec<TemplateNode>,
) -> TemplateNode {
    let is_special = tag.contains(':');
    let is_component = tag == "component"
        || (!is_special
            && tag
                .chars()
                .next()
                .map(|c| c.is_ascii_uppercase())
                .unwrap_or(false));
    if is_component {
        TemplateNode::Component(ComponentNode {
            name: tag,
            directives,
            children,
        })
    } else {
        TemplateNode::Element(ElementNode {
            tag,
            directives,
            children,
        })
    }
}

fn parse_if_block(source: &str, cursor: &mut usize) -> IfBlock {
    let (open, open_span) = read_block_header(source, cursor, "{#if ", "}");
    let condition = expr_node(open, Some(open_span));
    let consequent = parse_nodes(source, cursor, &["{:elif ", "{:else}", "{/if}"], None);
    let mut elif_blocks = Vec::new();
    while source[*cursor..].starts_with("{:elif ") {
        let (elif_condition, elif_span) = read_block_header(source, cursor, "{:elif ", "}");
        let elif_body = parse_nodes(source, cursor, &["{:elif ", "{:else}", "{/if}"], None);
        elif_blocks.push(ElifBlock {
            condition: expr_node(elif_condition, Some(elif_span)),
            consequent: elif_body,
        });
    }
    let else_block = if source[*cursor..].starts_with("{:else}") {
        *cursor += "{:else}".len();
        Some(ElseBlock {
            consequent: parse_nodes(source, cursor, &["{/if}"], None),
        })
    } else {
        None
    };
    consume(source, cursor, "{/if}");
    IfBlock {
        condition,
        consequent,
        elif_blocks,
        else_block,
    }
}

fn parse_for_block(source: &str, cursor: &mut usize) -> ForBlock {
    let (open, open_span) = read_block_header(source, cursor, "{#for ", "}");
    let (lhs, rhs) = split_once(&open, " in ").unwrap_or((&open, ""));
    let (item, index) = if let Some((a, b)) = split_once(lhs, ",") {
        (a.trim().to_string(), Some(b.trim().to_string()))
    } else {
        (lhs.trim().to_string(), None)
    };
    let open_base = open_span.start;
    let rhs_offset = open.find(rhs).unwrap_or(0);
    let rhs_span = Span {
        start: open_base + rhs_offset,
        end: open_base + rhs_offset + rhs.len(),
    };
    let (iterable, key) = if let Some((iterable, key_src)) = split_once(rhs, " key ") {
        let iter_offset = rhs.find(iterable).unwrap_or(0);
        let key_offset = rhs.find(key_src).unwrap_or(0);
        (
            expr_node(
                iterable.trim().to_string(),
                Some(Span {
                    start: rhs_span.start + iter_offset,
                    end: rhs_span.start + iter_offset + iterable.len(),
                }),
            ),
            Some(expr_node(
                key_src.trim().to_string(),
                Some(Span {
                    start: rhs_span.start + key_offset,
                    end: rhs_span.start + key_offset + key_src.len(),
                }),
            )),
        )
    } else {
        (expr_node(rhs.trim().to_string(), Some(rhs_span)), None)
    };
    let body = parse_nodes(source, cursor, &["{:empty}", "{/for}"], None);
    let empty = if source[*cursor..].starts_with("{:empty}") {
        *cursor += "{:empty}".len();
        Some(EmptyBlock {
            body: parse_nodes(source, cursor, &["{/for}"], None),
        })
    } else {
        None
    };
    consume(source, cursor, "{/for}");
    ForBlock {
        item,
        index,
        iterable,
        key,
        body,
        empty,
    }
}

fn parse_await_block(source: &str, cursor: &mut usize) -> AwaitBlock {
    let (promise_src, promise_span) = read_block_header(source, cursor, "{#await ", "}");
    let pending = parse_nodes(
        source,
        cursor,
        &["{:then}", "{:then ", "{:catch}", "{:catch ", "{/await}"],
        None,
    );

    let mut then_name = None;
    let mut then_body = Vec::new();
    if source[*cursor..].starts_with("{:then}") {
        *cursor += "{:then}".len();
        then_body = parse_nodes(source, cursor, &["{:catch}", "{:catch ", "{/await}"], None);
    } else if source[*cursor..].starts_with("{:then ") {
        let (name, _) = read_block_header(source, cursor, "{:then ", "}");
        if !name.is_empty() {
            then_name = Some(name);
        }
        then_body = parse_nodes(source, cursor, &["{:catch}", "{:catch ", "{/await}"], None);
    }

    let mut catch_name = None;
    let mut catch_body = Vec::new();
    if source[*cursor..].starts_with("{:catch}") {
        *cursor += "{:catch}".len();
        catch_body = parse_nodes(source, cursor, &["{/await}"], None);
    } else if source[*cursor..].starts_with("{:catch ") {
        let (name, _) = read_block_header(source, cursor, "{:catch ", "}");
        if !name.is_empty() {
            catch_name = Some(name);
        }
        catch_body = parse_nodes(source, cursor, &["{/await}"], None);
    }

    consume(source, cursor, "{/await}");
    AwaitBlock {
        promise: expr_node(promise_src, Some(promise_span)),
        pending,
        then_name,
        then_body,
        catch_name,
        catch_body,
    }
}

fn parse_key_block(source: &str, cursor: &mut usize) -> KeyBlock {
    let (expr, expr_span) = read_block_header(source, cursor, "{#key ", "}");
    let body = parse_nodes(source, cursor, &["{/key}"], None);
    consume(source, cursor, "{/key}");
    KeyBlock {
        expression: expr_node(expr, Some(expr_span)),
        body,
    }
}

fn parse_snippet_block(source: &str, cursor: &mut usize) -> SnippetBlock {
    let (header, _) = read_block_header(source, cursor, "{#snippet ", "}");
    let (name, params) = if let Some(open_idx) = header.find('(') {
        let close_idx = header.rfind(')').unwrap_or(header.len());
        let snippet_name = header[..open_idx].trim().to_string();
        let args_src = &header[open_idx + 1..close_idx];
        let args = args_src
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect::<Vec<_>>();
        (snippet_name, args)
    } else {
        (header.trim().to_string(), Vec::new())
    };
    let body = parse_nodes(source, cursor, &["{/snippet}"], None);
    consume(source, cursor, "{/snippet}");
    SnippetBlock { name, params, body }
}

fn parse_render_block(source: &str, cursor: &mut usize) -> RenderBlock {
    let (render_src, _) = read_block_header(source, cursor, "{@render ", "}");
    if let Some(open_idx) = render_src.find('(') {
        let close_idx = render_src.rfind(')').unwrap_or(render_src.len());
        let target = render_src[..open_idx].trim().to_string();
        let args_src = &render_src[open_idx + 1..close_idx];
        let args = split_comma_expressions(args_src)
            .into_iter()
            .map(|arg| expr_node(arg, None))
            .collect::<Vec<_>>();
        RenderBlock { target, args }
    } else {
        RenderBlock {
            target: render_src.trim().to_string(),
            args: Vec::new(),
        }
    }
}

fn parse_directives(source: &str, cursor: &mut usize) -> Vec<DirectiveNode> {
    let mut directives = Vec::new();
    loop {
        skip_spaces(source, cursor);
        if *cursor >= source.len()
            || source[*cursor..].starts_with('>')
            || source[*cursor..].starts_with("/>")
        {
            break;
        }
        if source[*cursor..].starts_with("{...") {
            if let Some((expr, span)) = read_braced(source, cursor) {
                let spread_source = expr
                    .trim()
                    .strip_prefix("...")
                    .unwrap_or(&expr)
                    .trim()
                    .to_string();
                directives.push(DirectiveNode {
                    kind: "spread".to_string(),
                    name: "spread".to_string(),
                    expression: Some(expr_node(spread_source, Some(span))),
                    modifiers: vec![],
                });
                continue;
            }
        }
        if source[*cursor..].starts_with('{') {
            if let Some((expr, span)) = read_braced(source, cursor) {
                let shorthand = expr.trim();
                if is_identifier(shorthand) {
                    directives.push(DirectiveNode {
                        kind: "attr".to_string(),
                        name: shorthand.to_string(),
                        expression: Some(expr_node(shorthand.to_string(), Some(span))),
                        modifiers: vec![],
                    });
                    continue;
                }
            }
        }
        let name = read_attr_name(source, cursor);
        if name.is_empty() {
            break;
        }
        skip_spaces(source, cursor);
        let expression = if source[*cursor..].starts_with('=') {
            *cursor += 1;
            skip_spaces(source, cursor);
            read_attr_value(source, cursor)
        } else {
            None
        };
        directives.push(parse_directive_shape(name, expression));
    }
    directives
}

fn parse_directive_shape(name: String, expression: Option<ExpressionNode>) -> DirectiveNode {
    if let Some(rest) = name.strip_prefix("class:") {
        return DirectiveNode {
            kind: "class".to_string(),
            name: rest.to_string(),
            expression,
            modifiers: vec![],
        };
    }
    if let Some(rest) = name.strip_prefix("style:") {
        return DirectiveNode {
            kind: "style".to_string(),
            name: rest.to_string(),
            expression,
            modifiers: vec![],
        };
    }
    if let Some(rest) = name.strip_prefix("bind:") {
        return DirectiveNode {
            kind: "bind".to_string(),
            name: rest.to_string(),
            expression,
            modifiers: vec![],
        };
    }
    if let Some(rest) = name.strip_prefix("use:") {
        return DirectiveNode {
            kind: "use".to_string(),
            name: rest.to_string(),
            expression,
            modifiers: vec![],
        };
    }
    if let Some(rest) = name.strip_prefix("transition:") {
        return DirectiveNode {
            kind: "transition".to_string(),
            name: rest.to_string(),
            expression,
            modifiers: vec![],
        };
    }
    if let Some(rest) = name.strip_prefix("in:") {
        return DirectiveNode {
            kind: "in".to_string(),
            name: rest.to_string(),
            expression,
            modifiers: vec![],
        };
    }
    if let Some(rest) = name.strip_prefix("out:") {
        return DirectiveNode {
            kind: "out".to_string(),
            name: rest.to_string(),
            expression,
            modifiers: vec![],
        };
    }
    if let Some(rest) = name.strip_prefix("animate:") {
        return DirectiveNode {
            kind: "animate".to_string(),
            name: rest.to_string(),
            expression,
            modifiers: vec![],
        };
    }
    if name.contains(':') {
        return DirectiveNode {
            kind: "unknown".to_string(),
            name,
            expression,
            modifiers: vec![],
        };
    }
    if let Some(rest) = name.strip_prefix("on") {
        let mut parts = rest.split('|');
        let event_name = parts.next().unwrap_or_default().to_string();
        let modifiers = parts.map(|p| p.to_string()).collect::<Vec<_>>();
        return DirectiveNode {
            kind: "event".to_string(),
            name: event_name,
            expression,
            modifiers,
        };
    }
    DirectiveNode {
        kind: "attr".to_string(),
        name,
        expression,
        modifiers: vec![],
    }
}

fn consume_tag_end(source: &str, cursor: &mut usize) -> bool {
    skip_spaces(source, cursor);
    if source[*cursor..].starts_with("/>") {
        *cursor += 2;
        return true;
    }
    consume(source, cursor, ">");
    false
}

fn read_attr_name(source: &str, cursor: &mut usize) -> String {
    let start = *cursor;
    while *cursor < source.len() {
        let ch = source.as_bytes()[*cursor] as char;
        if ch.is_ascii_alphanumeric() || ch == ':' || ch == '|' || ch == '-' {
            *cursor += 1;
        } else {
            break;
        }
    }
    source[start..*cursor].to_string()
}

fn is_identifier(source: &str) -> bool {
    let mut chars = source.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    if !(first == '_' || first == '$' || first.is_ascii_alphabetic()) {
        return false;
    }
    chars.all(|ch| ch == '_' || ch == '$' || ch.is_ascii_alphanumeric())
}

fn read_attr_value(source: &str, cursor: &mut usize) -> Option<ExpressionNode> {
    if *cursor >= source.len() {
        return None;
    }
    if source[*cursor..].starts_with('{') {
        return read_braced(source, cursor).map(|(s, span)| expr_node(s, Some(span)));
    }
    if source[*cursor..].starts_with('"') {
        let span_start = *cursor;
        *cursor += 1;
        let start = *cursor;
        while *cursor < source.len() && !source[*cursor..].starts_with('"') {
            *cursor += 1;
        }
        let value = source[start..*cursor].to_string();
        consume(source, cursor, "\"");
        return Some(expr_node(
            format!("{value:?}"),
            Some(Span {
                start: span_start,
                end: *cursor,
            }),
        ));
    }
    let start = *cursor;
    while *cursor < source.len() {
        let ch = source.as_bytes()[*cursor] as char;
        if ch.is_ascii_whitespace() || ch == '>' {
            break;
        }
        *cursor += 1;
    }
    Some(expr_node(
        source[start..*cursor].to_string(),
        Some(Span {
            start,
            end: *cursor,
        }),
    ))
}

fn read_until_control(
    source: &str,
    cursor: &mut usize,
    stops: &[&str],
    closing_tag: Option<&str>,
) -> String {
    let start = *cursor;
    while *cursor < source.len() {
        if source[*cursor..].starts_with("{#if ")
            || source[*cursor..].starts_with("{#for ")
            || source[*cursor..].starts_with("{#await ")
            || source[*cursor..].starts_with("{#key ")
            || source[*cursor..].starts_with("{#snippet ")
            || source[*cursor..].starts_with("{@render ")
            || source[*cursor..].starts_with('{')
            || source[*cursor..].starts_with('<')
            || starts_with_any(source, *cursor, stops)
        {
            break;
        }
        if let Some(tag) = closing_tag {
            let close = format!("</{tag}>");
            if source[*cursor..].starts_with(&close) {
                break;
            }
        }
        *cursor += 1;
    }
    source[start..*cursor].to_string()
}

fn read_braced(source: &str, cursor: &mut usize) -> Option<(String, Span)> {
    if !source[*cursor..].starts_with('{') {
        return None;
    }
    let span_start = *cursor;
    let start = span_start + 1;
    let mut i = start;
    let mut depth = 1i32;
    let bytes = source.as_bytes();
    while i < source.len() {
        let ch = bytes[i] as char;
        match ch {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    let out = source[start..i].trim().to_string();
                    *cursor = i + 1;
                    return Some((
                        out,
                        Span {
                            start: span_start,
                            end: i + 1,
                        },
                    ));
                }
            }
            '"' | '\'' | '`' => {
                i = skip_quoted(source, i, ch);
            }
            _ => {}
        }
        i += 1;
    }
    None
}

fn skip_quoted(source: &str, start: usize, quote: char) -> usize {
    let bytes = source.as_bytes();
    let mut i = start + 1;
    while i < source.len() {
        let ch = bytes[i] as char;
        if ch == '\\' {
            i += 2;
            continue;
        }
        if ch == quote {
            return i;
        }
        i += 1;
    }
    source.len().saturating_sub(1)
}

fn read_block_header(
    source: &str,
    cursor: &mut usize,
    prefix: &str,
    suffix: &str,
) -> (String, Span) {
    consume(source, cursor, prefix);
    let start = *cursor;
    while *cursor < source.len() && !source[*cursor..].starts_with(suffix) {
        *cursor += 1;
    }
    let header = source[start..*cursor].trim().to_string();
    let end = *cursor;
    consume(source, cursor, suffix);
    (header, Span { start, end })
}

fn read_tag_name(source: &str, cursor: &mut usize) -> String {
    let start = *cursor;
    while *cursor < source.len() {
        let ch = source.as_bytes()[*cursor] as char;
        if ch.is_ascii_alphanumeric() || ch == '-' || ch == ':' {
            *cursor += 1;
            continue;
        }
        break;
    }
    source[start..*cursor].to_string()
}

fn collect_template_errors(source: &str) -> Vec<TemplateParseError> {
    let mut out = Vec::new();
    let pairs = [
        ("{#if", "{/if}"),
        ("{#for", "{/for}"),
        ("{#await", "{/await}"),
        ("{#key", "{/key}"),
        ("{#snippet", "{/snippet}"),
    ];
    for (open, close) in pairs {
        let opens = find_all(source, open);
        let closes = find_all(source, close);
        if opens.len() > closes.len() {
            let idx = opens[closes.len()];
            let (line, column) = index_to_line_col(source, idx);
            out.push(TemplateParseError {
                message: format!("Missing {close}"),
                line,
                column,
                span: Some(Span {
                    start: idx,
                    end: idx + open.len(),
                }),
                suggestion: Some(format!("Add closing block {close}")),
            });
        }
    }

    out.extend(validate_control_flow_context(source));

    out.extend(validate_tag_pairs(source));
    out.extend(validate_unclosed_braces(source));

    out
}

fn validate_control_flow_context(source: &str) -> Vec<TemplateParseError> {
    let mut out = Vec::new();
    let mut i = 0usize;
    let mut stack: Vec<&str> = Vec::new();
    while i < source.len() {
        let rest = &source[i..];
        if rest.starts_with("{#if ") {
            stack.push("if");
            i += 4;
            continue;
        }
        if rest.starts_with("{#for ") {
            stack.push("for");
            i += 5;
            continue;
        }
        if rest.starts_with("{#await ") {
            stack.push("await");
            i += 7;
            continue;
        }
        if rest.starts_with("{/if}") {
            if matches!(stack.last(), Some(&"if")) {
                stack.pop();
            }
            i += 5;
            continue;
        }
        if rest.starts_with("{/for}") {
            if matches!(stack.last(), Some(&"for")) {
                stack.pop();
            }
            i += 6;
            continue;
        }
        if rest.starts_with("{/await}") {
            if matches!(stack.last(), Some(&"await")) {
                stack.pop();
            }
            i += 8;
            continue;
        }
        if rest.starts_with("{:elif ") && !matches!(stack.last(), Some(&"if")) {
            let (line, column) = index_to_line_col(source, i);
            out.push(TemplateParseError {
                message: "Unexpected {:elif}".to_string(),
                line,
                column,
                span: Some(Span {
                    start: i,
                    end: i + "{:elif".len(),
                }),
                suggestion: Some("Use {:elif ...} only inside {#if} ... {/if}".to_string()),
            });
        }
        if rest.starts_with("{:empty}") && !matches!(stack.last(), Some(&"for")) {
            let (line, column) = index_to_line_col(source, i);
            out.push(TemplateParseError {
                message: "Unexpected {:empty}".to_string(),
                line,
                column,
                span: Some(Span {
                    start: i,
                    end: i + "{:empty}".len(),
                }),
                suggestion: Some("Use {:empty} only inside {#for} ... {/for}".to_string()),
            });
        }
        i += 1;
    }
    out
}

fn split_comma_expressions(source: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut start = 0usize;
    let mut depth_paren = 0i32;
    let mut depth_brace = 0i32;
    let mut depth_bracket = 0i32;
    let bytes = source.as_bytes();
    let mut i = 0usize;
    while i < source.len() {
        let ch = bytes[i] as char;
        match ch {
            '(' => depth_paren += 1,
            ')' => depth_paren -= 1,
            '{' => depth_brace += 1,
            '}' => depth_brace -= 1,
            '[' => depth_bracket += 1,
            ']' => depth_bracket -= 1,
            '"' | '\'' | '`' => {
                i = skip_quoted(source, i, ch);
            }
            ',' if depth_paren == 0 && depth_brace == 0 && depth_bracket == 0 => {
                let part = source[start..i].trim();
                if !part.is_empty() {
                    out.push(part.to_string());
                }
                start = i + 1;
            }
            _ => {}
        }
        i += 1;
    }
    let tail = source[start..].trim();
    if !tail.is_empty() {
        out.push(tail.to_string());
    }
    out
}

fn validate_tag_pairs(source: &str) -> Vec<TemplateParseError> {
    let mut out = Vec::new();
    let mut stack: Vec<(String, usize)> = Vec::new();
    let bytes = source.as_bytes();
    let mut i = 0usize;

    while i < source.len() {
        if bytes[i] as char != '<' {
            i += 1;
            continue;
        }
        if i + 1 < source.len() && bytes[i + 1] as char == '/' {
            let (tag, end) = read_tag_token(source, i + 2);
            if !tag.is_empty() {
                if let Some((open_tag, open_idx)) = stack.pop() {
                    if open_tag != tag {
                        let (line, column) = index_to_line_col(source, i);
                        let (open_line, open_col) = index_to_line_col(source, open_idx);
                        out.push(TemplateParseError {
                            message: format!(
                                "Mismatched closing tag </{}> for <{}>",
                                tag, open_tag
                            ),
                            line,
                            column,
                            span: Some(Span {
                                start: i,
                                end: (i + tag.len() + 3).min(source.len()),
                            }),
                            suggestion: Some(format!(
                                "Expected </{}> to close tag opened at {}:{}",
                                open_tag, open_line, open_col
                            )),
                        });
                    }
                } else {
                    let (line, column) = index_to_line_col(source, i);
                    out.push(TemplateParseError {
                        message: format!("Unexpected closing tag </{}>", tag),
                        line,
                        column,
                        span: Some(Span {
                            start: i,
                            end: (end + 1).min(source.len()),
                        }),
                        suggestion: Some("Remove tag or add a matching opening tag".to_string()),
                    });
                }
            }
            i = end.saturating_add(1);
            continue;
        }
        let (tag, end) = read_tag_token(source, i + 1);
        if !tag.is_empty() {
            let raw = &source[i..=end.min(source.len().saturating_sub(1))];
            let self_closing = raw.trim_end().ends_with("/>");
            if !self_closing && !is_void_tag(&tag) {
                stack.push((tag, i));
            }
        }
        i = end.saturating_add(1);
    }

    for (tag, idx) in stack {
        let (line, column) = index_to_line_col(source, idx);
        out.push(TemplateParseError {
            message: format!("Unclosed tag <{}>", tag),
            line,
            column,
            span: Some(Span {
                start: idx,
                end: (idx + tag.len() + 1).min(source.len()),
            }),
            suggestion: Some(format!("Add closing tag </{}>", tag)),
        });
    }
    out
}

fn validate_unclosed_braces(source: &str) -> Vec<TemplateParseError> {
    let mut out = Vec::new();
    let mut stack: Vec<usize> = Vec::new();
    let bytes = source.as_bytes();
    let mut i = 0usize;
    while i < source.len() {
        let ch = bytes[i] as char;
        match ch {
            '{' => stack.push(i),
            '}' => {
                if stack.is_empty() {
                    let (line, column) = index_to_line_col(source, i);
                    out.push(TemplateParseError {
                        message: "Unexpected '}'".to_string(),
                        line,
                        column,
                        span: Some(Span {
                            start: i,
                            end: (i + 1).min(source.len()),
                        }),
                        suggestion: Some("Remove this brace or add matching '{'".to_string()),
                    });
                } else {
                    stack.pop();
                }
            }
            '"' | '\'' | '`' => {
                i = skip_quoted(source, i, ch);
            }
            _ => {}
        }
        i += 1;
    }
    for idx in stack {
        let (line, column) = index_to_line_col(source, idx);
        out.push(TemplateParseError {
            message: "Unclosed '{' in template expression".to_string(),
            line,
            column,
            span: Some(Span {
                start: idx,
                end: (idx + 1).min(source.len()),
            }),
            suggestion: Some("Add matching '}'".to_string()),
        });
    }
    out
}

fn read_tag_token(source: &str, start: usize) -> (String, usize) {
    let mut i = start;
    while i < source.len() {
        let ch = source.as_bytes()[i] as char;
        if ch.is_ascii_alphanumeric() || ch == '-' {
            i += 1;
        } else {
            break;
        }
    }
    let tag = source[start..i].to_string();
    while i < source.len() && source.as_bytes()[i] as char != '>' {
        i += 1;
    }
    (tag, i.min(source.len().saturating_sub(1)))
}

fn is_void_tag(tag: &str) -> bool {
    matches!(tag, "input" | "img" | "br" | "hr" | "meta" | "link")
}

fn expr_node(source: String, span: Option<Span>) -> ExpressionNode {
    ExpressionNode { source, span }
}

fn find_all(source: &str, token: &str) -> Vec<usize> {
    let mut out = Vec::new();
    let mut pos = 0;
    while let Some(found) = source[pos..].find(token) {
        let idx = pos + found;
        out.push(idx);
        pos = idx + token.len();
    }
    out
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
    use super::parse_template;
    use fanxipan_ast::TemplateNode;

    #[test]
    fn parses_if_and_for_blocks() {
        let source = "{#if visible}yes{:else}no{/if}{#for item in items key item.id}{item}{:empty}none{/for}";
        let out = parse_template(source);
        assert_eq!(out.ast.nodes.len(), 2);
        match &out.ast.nodes[0] {
            TemplateNode::IfBlock(block) => assert_eq!(block.elif_blocks.len(), 0),
            _ => panic!("expected if block"),
        }
        match &out.ast.nodes[1] {
            TemplateNode::ForBlock(block) => {
                assert_eq!(block.item, "item");
                assert!(block.key.is_some());
                assert!(block.empty.is_some());
            }
            _ => panic!("expected for block"),
        }
    }

    #[test]
    fn parses_element_tree() {
        let source = "<div class:active={active}><span>{count}</span></div>";
        let out = parse_template(source);
        match &out.ast.nodes[0] {
            TemplateNode::Element(el) => {
                assert_eq!(el.tag, "div");
                assert_eq!(el.directives.len(), 1);
                assert_eq!(el.children.len(), 1);
            }
            _ => panic!("expected element"),
        }
    }

    #[test]
    fn parses_component_node() {
        let source = "<UserCard user={user}><span>child</span></UserCard>";
        let out = parse_template(source);
        match &out.ast.nodes[0] {
            TemplateNode::Component(component) => {
                assert_eq!(component.name, "UserCard");
                assert_eq!(component.directives.len(), 1);
                assert_eq!(component.children.len(), 1);
            }
            _ => panic!("expected component"),
        }
    }

    #[test]
    fn parses_fanxi_attribute_shorthand() {
        let source = "<Child {...props} {name} count={count} />";
        let out = parse_template(source);
        match &out.ast.nodes[0] {
            TemplateNode::Component(component) => {
                assert_eq!(component.directives.len(), 3);
                assert_eq!(component.directives[1].kind, "attr");
                assert_eq!(component.directives[1].name, "name");
                assert_eq!(
                    component.directives[1]
                        .expression
                        .as_ref()
                        .map(|e| e.source.as_str()),
                    Some("name")
                );
            }
            _ => panic!("expected component"),
        }
    }

    #[test]
    fn parses_nested_braced_expression() {
        let source = "<div>{foo({ a: { b: 1 } })}</div>";
        let out = parse_template(source);
        assert!(out.errors.is_empty());
        match &out.ast.nodes[0] {
            TemplateNode::Element(el) => assert_eq!(el.children.len(), 1),
            _ => panic!("expected element"),
        }
    }

    #[test]
    fn reports_unclosed_tag_and_brace() {
        let source = "<div><span>{count</div>";
        let out = parse_template(source);
        assert!(
            out.errors
                .iter()
                .any(|e| e.message.contains("Unclosed tag"))
        );
        assert!(
            out.errors
                .iter()
                .any(|e| e.message.contains("Unclosed '{'"))
        );
    }

    #[test]
    fn parses_await_key_snippet_render_blocks() {
        let source = "{#snippet row(item)}<p>{item.name}</p>{/snippet}{#key user.id}{@render row(user)}{/key}{#await promise}<p>loading</p>{:then data}<p>{data.name}</p>{:catch err}<p>{err.message}</p>{/await}";
        let out = parse_template(source);
        assert!(out.errors.is_empty());
        assert_eq!(out.ast.nodes.len(), 3);
        match &out.ast.nodes[0] {
            TemplateNode::SnippetBlock(block) => {
                assert_eq!(block.name, "row");
                assert_eq!(block.params, vec!["item"]);
            }
            _ => panic!("expected snippet block"),
        }
        match &out.ast.nodes[1] {
            TemplateNode::KeyBlock(block) => assert_eq!(block.body.len(), 1),
            _ => panic!("expected key block"),
        }
        match &out.ast.nodes[2] {
            TemplateNode::AwaitBlock(block) => {
                assert_eq!(block.then_name.as_deref(), Some("data"));
                assert_eq!(block.catch_name.as_deref(), Some("err"));
            }
            _ => panic!("expected await block"),
        }
    }

    #[test]
    fn parses_special_elements() {
        let source = "<head><title>{name}</title></head><window onresize={onResize} />";
        let out = parse_template(source);
        assert!(out.errors.is_empty());
        assert_eq!(out.ast.nodes.len(), 2);
        match &out.ast.nodes[0] {
            TemplateNode::Element(el) => assert_eq!(el.tag, "head"),
            _ => panic!("expected head element"),
        }
        match &out.ast.nodes[1] {
            TemplateNode::Element(el) => assert_eq!(el.tag, "window"),
            _ => panic!("expected window element"),
        }
    }

    #[test]
    fn reports_unexpected_elif_and_empty_context() {
        let source = "{:elif ok}{:empty}";
        let out = parse_template(source);
        assert!(
            out.errors
                .iter()
                .any(|e| e.message.contains("Unexpected {:elif}"))
        );
        assert!(
            out.errors
                .iter()
                .any(|e| e.message.contains("Unexpected {:empty}"))
        );
    }
}
