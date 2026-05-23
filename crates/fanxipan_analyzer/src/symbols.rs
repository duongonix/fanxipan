use crate::expr::extract_identifier_refs;

pub fn collect_script_symbols(source: &str) -> Vec<String> {
    let mut out = Vec::new();
    for line in source.lines() {
        let trimmed = line.trim();
        for prefix in ["let ", "const ", "var "] {
            if let Some(rest) = trimmed.strip_prefix(prefix) {
                push_declared_names(rest, &mut out);
            }
        }
        if let Some(rest) = trimmed.strip_prefix("function ") {
            if let Some(name) = rest
                .split(|c: char| c == '(' || c.is_whitespace())
                .find(|part| !part.is_empty())
            {
                out.push(name.to_string());
            }
            if let Some(open) = rest.find('(') {
                if let Some(close) = rest[open + 1..].find(')') {
                    let params = &rest[open + 1..open + 1 + close];
                    let params_trim = params.trim();
                    if params_trim.starts_with('{') && params_trim.ends_with('}') {
                        let inner = &params_trim[1..params_trim.len() - 1];
                        push_destructured_names(inner, &mut out);
                        continue;
                    }
                    for param in params.split(',') {
                        let part = param.trim();
                        if is_plain_identifier(part) {
                            out.push(part.to_string());
                            continue;
                        }
                        // Basic object destructuring support: function A({ x, y })
                        if part.starts_with('{') && part.ends_with('}') {
                            let inner = &part[1..part.len() - 1];
                            push_destructured_names(inner, &mut out);
                        }
                    }
                }
            }
        }
    }
    out.sort();
    out.dedup();
    out
}

pub fn is_js_global(name: &str) -> bool {
    matches!(
        name,
        "true"
            | "false"
            | "null"
            | "undefined"
            | "Math"
            | "Date"
            | "Number"
            | "String"
            | "Boolean"
            | "Array"
            | "Object"
            | "console"
            | "event"
            | "window"
            | "document"
            | "JSON"
            | "Promise"
            | "Set"
            | "Map"
            | "props"
    )
}

pub fn find_mutation_of(source: &str, symbol: &str) -> Option<usize> {
    let ids = extract_identifier_refs(source);
    for id in ids {
        if id.name != symbol {
            continue;
        }
        let bytes = source.as_bytes();
        let ident_end = id.offset + id.name.len();
        if bytes.get(ident_end) == Some(&b'+') && bytes.get(ident_end + 1) == Some(&b'+') {
            return Some(id.offset);
        }
        if bytes.get(ident_end) == Some(&b'-') && bytes.get(ident_end + 1) == Some(&b'-') {
            return Some(id.offset);
        }
        if id.offset >= 2 && bytes[id.offset - 1] == b'+' && bytes[id.offset - 2] == b'+' {
            return Some(id.offset - 2);
        }
        if id.offset >= 2 && bytes[id.offset - 1] == b'-' && bytes[id.offset - 2] == b'-' {
            return Some(id.offset - 2);
        }
        let after_idx = id.offset + id.name.len();
        let after = next_non_ws_byte(source.as_bytes(), after_idx);
        if let Some((idx, op)) = after {
            if op == b'=' {
                if matches!(source.as_bytes().get(idx + 1), Some(b'=') | Some(b'>')) {
                    continue;
                }
                if is_declaration_binding(source, id.offset) {
                    continue;
                }
                return Some(idx);
            }
            if matches!(op, b'+' | b'-' | b'*' | b'/' | b'%')
                && source.as_bytes().get(idx + 1) == Some(&b'=')
            {
                if is_declaration_binding(source, id.offset) {
                    continue;
                }
                return Some(idx);
            }
        }
    }
    None
}

fn push_declared_names(segment: &str, out: &mut Vec<String>) {
    let lhs = segment.split('=').next().unwrap_or("").trim();
    for part in lhs.split(',') {
        let name = part.trim();
        if is_plain_identifier(name) {
            out.push(name.to_string());
        }
    }
}

fn push_destructured_names(segment: &str, out: &mut Vec<String>) {
    for key in segment.split(',') {
        let no_default = key.trim().split('=').next().unwrap_or("").trim();
        if no_default.is_empty() || no_default.starts_with("...") {
            continue;
        }
        let local = no_default.split(':').nth(1).unwrap_or(no_default).trim();
        if is_plain_identifier(local) {
            out.push(local.to_string());
        }
    }
}

fn is_plain_identifier(value: &str) -> bool {
    let mut chars = value.chars();
    match chars.next() {
        Some(ch) if ch == '_' || ch == '$' || ch.is_ascii_alphabetic() => {}
        _ => return false,
    }
    chars.all(|ch| ch == '_' || ch == '$' || ch.is_ascii_alphanumeric())
}

fn next_non_ws_byte(bytes: &[u8], idx: usize) -> Option<(usize, u8)> {
    let mut i = idx;
    while i < bytes.len() {
        if !bytes[i].is_ascii_whitespace() {
            return Some((i, bytes[i]));
        }
        i += 1;
    }
    None
}

fn is_declaration_binding(source: &str, ident_offset: usize) -> bool {
    let start = source[..ident_offset]
        .rfind('\n')
        .map(|i| i + 1)
        .unwrap_or(0);
    let prefix = source[start..ident_offset].trim_end();
    prefix.ends_with("let") || prefix.ends_with("const") || prefix.ends_with("var")
}
