pub fn rewrite_selectors(source: &str, scope: &str) -> String {
    rewrite_block(source, scope)
}

fn rewrite_block(css: &str, scope: &str) -> String {
    let mut out = String::new();
    let bytes = css.as_bytes();
    let mut i = 0usize;

    while i < bytes.len() {
        skip_ws(bytes, &mut i);
        if i >= bytes.len() {
            break;
        }
        let sel_start = i;
        while i < bytes.len() && bytes[i] != b'{' {
            i += 1;
        }
        if i >= bytes.len() {
            break;
        }
        let selector = css[sel_start..i].trim();
        i += 1;
        let body_start = i;
        let mut depth = 1usize;
        while i < bytes.len() && depth > 0 {
            match bytes[i] {
                b'{' => depth += 1,
                b'}' => depth -= 1,
                _ => {}
            }
            i += 1;
        }
        if body_start > i.saturating_sub(1) {
            continue;
        }
        let body = &css[body_start..i - 1];
        if selector.starts_with('@') {
            if is_block_at_rule(selector) {
                let nested = rewrite_block(body, scope);
                out.push_str(selector);
                out.push_str(" {\n");
                out.push_str(nested.trim());
                out.push_str("\n}\n");
            } else {
                out.push_str(selector);
                out.push_str(" { ");
                out.push_str(body.trim());
                out.push_str(" }\n");
            }
            continue;
        }
        let scoped = scope_selector_list(selector, scope);
        out.push_str(&scoped);
        out.push_str(" { ");
        out.push_str(body.trim());
        out.push_str(" }\n");
    }
    out
}

fn scope_selector_list(selector: &str, scope: &str) -> String {
    split_top_level(selector, ',')
        .into_iter()
        .map(|part| scope_single_selector(part.trim(), scope))
        .collect::<Vec<_>>()
        .join(", ")
}

fn scope_single_selector(selector: &str, scope: &str) -> String {
    if selector.is_empty() {
        return selector.to_string();
    }
    if let Some(inner) = unwrap_full_global(selector) {
        return inner.to_string();
    }
    let replaced = replace_global_markers(selector);
    if replaced.starts_with(scope)
        || replaced.contains(&format!(".{scope}"))
        || replaced.contains(&format!("#{scope}"))
    {
        return replaced;
    }
    if replaced == ":root" {
        return format!(":root .{scope}");
    }
    scope_rightmost_compound(&replaced, scope)
}

fn unwrap_full_global(selector: &str) -> Option<&str> {
    let s = selector.trim();
    if !s.starts_with(":global(") || !s.ends_with(')') {
        return None;
    }
    if s.len() <= 9 {
        return None;
    }
    let inner = &s[8..s.len() - 1];
    if inner.contains(":global(") {
        return None;
    }
    Some(inner)
}

fn replace_global_markers(selector: &str) -> String {
    let s = selector.as_bytes();
    let mut i = 0usize;
    let mut out = String::new();
    while i < s.len() {
        if selector[i..].starts_with(":global(") {
            i += 8;
            let start = i;
            let mut depth = 1usize;
            while i < s.len() && depth > 0 {
                match s[i] {
                    b'(' => depth += 1,
                    b')' => depth -= 1,
                    _ => {}
                }
                i += 1;
            }
            let end = i.saturating_sub(1);
            if start <= end && end <= selector.len() {
                out.push_str(selector[start..end].trim());
            }
            continue;
        }
        out.push(s[i] as char);
        i += 1;
    }
    out
}

fn scope_rightmost_compound(selector: &str, scope: &str) -> String {
    if selector.trim().is_empty() {
        return selector.to_string();
    }
    let parts = tokenize_selector(selector);
    for part in parts.iter().rev() {
        if !part.is_combinator && !part.value.trim().is_empty() {
            let scoped = scope_compound(&part.value, scope);
            return rebuild_selector(&parts, &part.value, &scoped);
        }
    }
    selector.to_string()
}

#[derive(Clone)]
struct SelectorPart {
    value: String,
    is_combinator: bool,
}

fn tokenize_selector(selector: &str) -> Vec<SelectorPart> {
    let mut out = Vec::new();
    let mut cur = String::new();
    let mut bracket = 0usize;
    let mut paren = 0usize;
    for ch in selector.chars() {
        match ch {
            '[' => bracket += 1,
            ']' => bracket = bracket.saturating_sub(1),
            '(' => paren += 1,
            ')' => paren = paren.saturating_sub(1),
            _ => {}
        }
        let is_comb =
            (ch == ' ' || ch == '>' || ch == '+' || ch == '~') && bracket == 0 && paren == 0;
        if is_comb {
            if !cur.is_empty() {
                out.push(SelectorPart {
                    value: cur.clone(),
                    is_combinator: false,
                });
                cur.clear();
            }
            out.push(SelectorPart {
                value: ch.to_string(),
                is_combinator: true,
            });
        } else {
            cur.push(ch);
        }
    }
    if !cur.is_empty() {
        out.push(SelectorPart {
            value: cur,
            is_combinator: false,
        });
    }
    out
}

fn rebuild_selector(parts: &[SelectorPart], needle: &str, replacement: &str) -> String {
    let mut out = String::new();
    let mut replaced = false;
    for part in parts {
        if !replaced && !part.is_combinator && part.value == needle {
            out.push_str(replacement);
            replaced = true;
        } else {
            out.push_str(&part.value);
        }
    }
    out
}

fn scope_compound(selector: &str, scope: &str) -> String {
    if let Some((head, pseudo)) = split_first_pseudo(selector) {
        return format!("{head}.{scope}{pseudo}");
    }
    format!("{selector}.{scope}")
}

fn split_first_pseudo(selector: &str) -> Option<(&str, &str)> {
    let bytes = selector.as_bytes();
    let mut bracket = 0usize;
    let mut paren = 0usize;
    for i in 0..bytes.len() {
        match bytes[i] {
            b'[' => bracket += 1,
            b']' => bracket = bracket.saturating_sub(1),
            b'(' => paren += 1,
            b')' => paren = paren.saturating_sub(1),
            b':' if bracket == 0 && paren == 0 => return Some((&selector[..i], &selector[i..])),
            _ => {}
        }
    }
    None
}

fn split_top_level(input: &str, separator: char) -> Vec<&str> {
    let mut out = Vec::new();
    let mut start = 0usize;
    let mut paren = 0usize;
    let mut bracket = 0usize;
    for (idx, ch) in input.char_indices() {
        match ch {
            '(' => paren += 1,
            ')' => paren = paren.saturating_sub(1),
            '[' => bracket += 1,
            ']' => bracket = bracket.saturating_sub(1),
            _ => {}
        }
        if ch == separator && paren == 0 && bracket == 0 {
            out.push(&input[start..idx]);
            start = idx + ch.len_utf8();
        }
    }
    out.push(&input[start..]);
    out
}

fn is_block_at_rule(selector: &str) -> bool {
    selector.starts_with("@media")
        || selector.starts_with("@supports")
        || selector.starts_with("@layer")
        || selector.starts_with("@container")
}

fn skip_ws(bytes: &[u8], i: &mut usize) {
    while *i < bytes.len() && bytes[*i].is_ascii_whitespace() {
        *i += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::rewrite_selectors;

    #[test]
    fn rewrites_basic_and_pseudo_selectors() {
        let css = "div, button:hover { color: red; }";
        let out = rewrite_selectors(css, "fanxi-s-aaaa1111");
        assert!(out.contains("div.fanxi-s-aaaa1111"));
        assert!(out.contains("button.fanxi-s-aaaa1111:hover"));
    }

    #[test]
    fn keeps_global_selector_unscoped() {
        let css = ":global(.external) { color: red; }";
        let out = rewrite_selectors(css, "fanxi-s-aaaa1111");
        assert!(out.contains(".external { color: red; }"));
        assert!(!out.contains("fanxi-s-aaaa1111"));
    }

    #[test]
    fn scopes_local_part_when_global_is_mixed() {
        let css = ":global(.dark) button:hover { color: white; }";
        let out = rewrite_selectors(css, "fanxi-s-aaaa1111");
        assert!(out.contains(".dark button.fanxi-s-aaaa1111:hover"));
    }

    #[test]
    fn rewrites_nested_media_rules() {
        let css = "@media (min-width: 600px) { .card { padding: 1rem; } }";
        let out = rewrite_selectors(css, "fanxi-s-aaaa1111");
        assert!(out.contains("@media"));
        assert!(out.contains(".card.fanxi-s-aaaa1111"));
    }
}
