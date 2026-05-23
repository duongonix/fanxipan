#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IdentifierRef {
    pub name: String,
    pub offset: usize,
    pub is_property: bool,
}

pub fn extract_identifier_refs(expr: &str) -> Vec<IdentifierRef> {
    let bytes = expr.as_bytes();
    let mut out = Vec::new();
    let mut i = 0usize;
    while i < bytes.len() {
        let b = bytes[i];
        if is_ident_start(b) {
            let start = i;
            i += 1;
            while i < bytes.len() && is_ident_continue(bytes[i]) {
                i += 1;
            }
            let name = &expr[start..i];
            if !is_reserved_word(name) {
                // Ignore object literal property keys like `{ id: value }`.
                // Shorthand keys `{ id }` still represent identifier usage and must be kept.
                if next_non_whitespace_is_colon(bytes, i) {
                    continue;
                }
                out.push(IdentifierRef {
                    name: name.to_string(),
                    offset: start,
                    is_property: previous_non_whitespace_is_dot(bytes, start),
                });
            }
            continue;
        }
        i += 1;
    }
    out
}

pub fn extract_identifiers(expr: &str) -> Vec<String> {
    extract_identifier_refs(expr)
        .into_iter()
        .map(|id| id.name)
        .collect()
}

fn is_ident_start(b: u8) -> bool {
    b.is_ascii_alphabetic() || b == b'_' || b == b'$'
}

fn is_ident_continue(b: u8) -> bool {
    is_ident_start(b) || b.is_ascii_digit()
}

fn previous_non_whitespace_is_dot(bytes: &[u8], start: usize) -> bool {
    let mut j = start;
    while j > 0 {
        j -= 1;
        if bytes[j].is_ascii_whitespace() {
            continue;
        }
        return bytes[j] == b'.';
    }
    false
}

fn next_non_whitespace_is_colon(bytes: &[u8], end: usize) -> bool {
    let mut j = end;
    while j < bytes.len() {
        if bytes[j].is_ascii_whitespace() {
            j += 1;
            continue;
        }
        return bytes[j] == b':';
    }
    false
}

fn is_reserved_word(name: &str) -> bool {
    matches!(
        name,
        "let"
            | "const"
            | "var"
            | "function"
            | "return"
            | "if"
            | "else"
            | "for"
            | "while"
            | "switch"
            | "case"
            | "break"
            | "continue"
            | "new"
            | "class"
            | "extends"
            | "import"
            | "from"
            | "export"
            | "default"
            | "as"
            | "try"
            | "catch"
            | "finally"
            | "throw"
            | "await"
            | "async"
            | "typeof"
            | "instanceof"
            | "in"
            | "of"
    )
}

#[cfg(test)]
mod tests {
    use super::extract_identifier_refs;

    #[test]
    fn marks_property_identifiers() {
        let ids = extract_identifier_refs("item.id + user . name + count");
        assert!(ids.iter().any(|x| x.name == "item" && !x.is_property));
        assert!(ids.iter().any(|x| x.name == "id" && x.is_property));
        assert!(ids.iter().any(|x| x.name == "name" && x.is_property));
        assert!(ids.iter().any(|x| x.name == "count" && !x.is_property));
    }

    #[test]
    fn ignores_object_literal_property_keys() {
        let ids = extract_identifier_refs("{ id: nextId, text: title, done: false, shorthand }");
        assert!(!ids.iter().any(|x| x.name == "id"));
        assert!(!ids.iter().any(|x| x.name == "text"));
        assert!(!ids.iter().any(|x| x.name == "done"));
        assert!(ids.iter().any(|x| x.name == "nextId"));
        assert!(ids.iter().any(|x| x.name == "title"));
        assert!(ids.iter().any(|x| x.name == "shorthand"));
    }
}
